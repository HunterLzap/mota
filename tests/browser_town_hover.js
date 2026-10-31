async (page) => {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const destinations = {
    smithy: '.smithy-page-hub',
    palace: '[data-goto="palace_salary"]',
    tavern: '[data-goto="tavern_bounty"]',
    fishing: '#btn-fish-normal',
    dragons: '.btn-fight-dragon',
    faction_war: '.btn-challenge-stronghold'
  };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], samples = [], visits = [];
    game.on('pageerror', error => errors.push(error.message));
    const noOverflow = async label => check(await game.evaluate(() =>
      Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth + 1
    ), `Horizontal overflow: ${label}`);
    const dismiss = async () => {
      await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const measure = async (locator, baseline, label) => {
      // Allow hover/press transitions to finish so an animated jump cannot pass
      // solely because the initial animation frame still matches the baseline.
      await game.waitForTimeout(220);
      const box = await locator.boundingBox();
      check(box && baseline, `Missing hotspot geometry: ${label}`);
      const delta = Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, box[key] - baseline[key]]));
      check(Object.values(delta).every(value => Math.abs(value) < 0.5),
        `Hotspot moved ${label}: ${JSON.stringify(delta)}`);
      check(await locator.evaluate(element => {
        const rect = element.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return rect.left >= main.left && rect.right <= main.right && rect.top >= main.top &&
          rect.bottom <= main.bottom && (element === hit || element.contains(hit));
      }), `Hotspot clipped or covered: ${label}`);
      samples.push({ label, delta });
    };
    const focusWithTab = async locator => {
      // Start at the preceding navigation; the hotspot itself must be reached by
      // actual Tab traversal rather than assigning focus directly to the target.
      await game.locator('#nav-tab-town').focus();
      for (let i = 0; i < 80; i++) {
        await game.keyboard.press('Tab');
        if (await locator.evaluate(element => element === document.activeElement)) {
          check(await locator.evaluate(element => element.matches(':focus-visible')), 'Keyboard focus is not visible');
          return;
        }
      }
      throw new Error(`Hotspot missing from native Tab order: ${await locator.getAttribute('data-goto')}`);
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click();
      await game.locator('#game-modal-btn-cancel').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      await game.locator('#nav-tab-town').click();
      await game.locator('.classic-town-art').evaluate(image => image.decode());

      for (const phase of ['new-save', 'unlocked-fixture']) {
        if (phase === 'unlocked-fixture') {
          // Isolated prerequisite fixture only: this tests the same six entrance
          // controls after unlock, not natural completion of chapters 10 and 20.
          await game.evaluate(() => {
            for (const chapter of [10, 20]) {
              const id = `quest_${chapter}`;
              window.gameState.data.questProgress[id] = {
                ...window.gameState.data.questProgress[id], completed: true, claimed: true
              };
            }
            window.gameState.notify();
          });
        }
        check(await game.locator('.classic-town-location').count() === 6, 'Missing city entrances');
        const locked = await game.locator('.classic-town-location[aria-disabled="true"]')
          .evaluateAll(elements => elements.map(element => element.getAttribute('data-goto')));
        check(JSON.stringify(locked.sort()) === JSON.stringify(phase === 'new-save' ? ['dragons', 'faction_war'] : []),
          `Unexpected city unlock state: ${phase} ${JSON.stringify(locked)}`);

        for (const id of Object.keys(destinations)) {
          const hotspot = game.locator(`.classic-town-location[data-goto="${id}"]`);
          await game.mouse.move(0, 0);
          await game.evaluate(() => document.activeElement?.blur());
          await game.waitForTimeout(220);
          const baseline = await hotspot.boundingBox();

          await hotspot.hover();
          check(await hotspot.evaluate(element => element.matches(':hover')), `No real hover: ${id}`);
          await measure(hotspot, baseline, `${phase}/${id}/hover`);

          await game.mouse.move(0, 0);
          await focusWithTab(hotspot);
          await measure(hotspot, baseline, `${phase}/${id}/focus`);

          await hotspot.hover();
          await game.mouse.down();
          try {
            check(await hotspot.evaluate(element => element.matches(':active')), `No real press: ${id}`);
            await measure(hotspot, baseline, `${phase}/${id}/active`);
          } finally {
            // Release outside the button so measuring :active does not navigate.
            await game.mouse.move(0, 0);
            await game.mouse.up();
          }
          check(await game.evaluate(() => window.appInstance.views.town.currentView === 'hub' && !window.gameModal.isOpen),
            `Cancelled press activated ${id}`);
        }
        await noOverflow(phase);
        await game.locator('.classic-town-location[data-goto="faction_war"]').hover();
        await game.screenshot({
          path: `output/playwright/material6-town-hover-${phase === 'new-save' ? 'locked-' : ''}${viewport.width}.png`,
          animations: 'disabled'
        });

        for (const [id, destination] of Object.entries(destinations)) {
          const hotspot = game.locator(`.classic-town-location[data-goto="${id}"]`);
          if (locked.includes(id)) {
            const prerequisite = await hotspot.getAttribute('title');
            // aria-disabled entries intentionally remain operable to explain
            // their prerequisite. Use an actual mouse click, without asking
            // Playwright to treat aria-disabled as a native disabled button.
            await hotspot.hover();
            const box = await hotspot.boundingBox();
            await game.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            check(await game.evaluate(() => window.gameModal.isOpen), `Locked ${id} did not explain access`);
            check((await game.locator('#game-modal-message').innerText()).includes(prerequisite),
              `Locked ${id} explanation differs from its prerequisite`);
            check(await game.evaluate(() => window.appInstance.views.town.currentView) === 'hub',
              `Locked ${id} navigated despite its prerequisite`);
            await dismiss();
            check(await hotspot.evaluate(element => element === document.activeElement), `Locked ${id} lost opener focus`);
            // Locked entrances must also explain access when activated by keyboard.
            await focusWithTab(hotspot);
            await game.keyboard.press('Enter');
            check(await game.evaluate(() => window.gameModal.isOpen), `Keyboard bypassed locked ${id}`);
            await dismiss();
            check(await game.locator('.classic-town-location').count() === 6, 'Locked entry did not retain city');
            visits.push({ phase, id, lockedExplanation: true, keyboardExplanation: true });
          } else {
            await hotspot.click();
            check(await game.evaluate(() => window.appInstance.views.town.currentView) === id,
              `Hotspot ${id} navigated to the wrong page`);
            check(await game.locator(`#tab-content-town ${destination}`).first().isVisible(),
              `Destination content missing: ${id}`);
            await noOverflow(`${phase}/${id}`);
            await game.locator('#tab-content-town button[data-goto="hub"]').click();
            check(await game.evaluate(() => window.appInstance.views.town.currentView) === 'hub' &&
              await game.locator('.classic-town-location').count() === 6, `Return from ${id} did not restore city`);
            visits.push({ phase, id, openedAndReturned: true });
          }
        }
      }
      await noOverflow('final city');
      check(errors.length === 0, errors.join('; '));
      results.push({
        viewport, geometrySamples: samples.length,
        maxDisplacement: Math.max(...samples.flatMap(sample => Object.values(sample.delta).map(Math.abs))),
        samples, visits, errors
      });
    } finally { await context.close(); }
  }
  return {
    results,
    fixtureNote: 'Fresh isolated saves verify real locked entrances. Only chapter 10/20 claimed flags are injected for unlocked geometry and navigation; this is not a natural progression test.'
  };
}
