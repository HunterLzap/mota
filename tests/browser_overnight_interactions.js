async (page, { phase, output }) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const baseline = phase.includes('before');
  const reports = [];
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    for (const classId of baseline ? ['warrior'] : ['warrior', 'mage', 'hunter']) {
      const context = await page.context().browser().newContext({ viewport });
      const game = await context.newPage(), errors = [], failures = [], consoleErrors = [];
      game.setDefaultTimeout(10000);
      game.on('pageerror', error => errors.push(error.message));
      game.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      game.on('requestfailed', request => failures.push(request.url()));
      game.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
      const shot = name => game.screenshot({ path: `${output}/${phase}-${viewport.width}-${classId}-${name}.png`, animations: 'disabled' });
      const dismiss = async () => {
        for (let n = 0; n < 8 && await game.evaluate(() => window.gameModal?.isOpen); n++)
          await game.locator('#game-modal-btn-confirm').click();
      };
      const report = { viewport, classId };
      try {
        await game.goto('http://127.0.0.1:8088');
        await game.locator('#btn-confirm-character').waitFor();
        report.initialFocus = await game.evaluate(() => document.activeElement.id);
        if (!baseline) check(report.initialFocus === 'input-hero-name', 'Name input did not receive initial focus');
        await game.locator('#input-hero-name').fill('Night ' + classId);
        await game.locator(`[data-class-id="${classId}"]`).focus();
        await game.keyboard.press('Enter');
        report.classFocus = await game.evaluate(() => document.activeElement.getAttribute('data-class-id'));
        if (!baseline) check(report.classFocus === classId, 'Class redraw lost keyboard focus');
        await game.locator('[data-nation-id]').last().click();
        if (!baseline) check(await game.evaluate(() => document.activeElement.hasAttribute('data-nation-id')), 'Nation redraw lost mouse focus');
        report.focusEscaped = false;
        for (let n = 0; n < 18; n++) {
          await game.keyboard.press(n < 9 ? 'Tab' : 'Shift+Tab');
          if (!await game.evaluate(() => document.getElementById('char-select-overlay').contains(document.activeElement)))
            report.focusEscaped = true;
        }
        if (!baseline) check(!report.focusEscaped, 'Creation focus escaped to background');
        await shot('creation-focus');
        await game.locator('#btn-confirm-character').click();
        if (!baseline) check(await game.evaluate(() => (
          gameModal.isOpen ? document.getElementById('game-modal-box').contains(document.activeElement)
            : !document.querySelector('.classic-client').inert && document.activeElement.getClientRects().length > 0
        )), 'Creation close did not restore appropriate modal/background focus');
        await dismiss();
        if (!baseline) check(await game.evaluate(() => !document.querySelector('.classic-client').inert), 'Background stayed inert after onboarding dialogue');
        check(await game.evaluate(id => gameState.data.classId === id && gameState.data.hasChosenClass, classId), 'Wrong created class');
        await game.locator('#nav-tab-bag').click();
        const equipment = await game.evaluate(() => gameState.data.bag.filter(item => item.slot).map(item => item.uid));
        for (const uid of equipment) {
          await game.locator(`[data-bag-uid="${uid}"]`).click();
          await game.locator('#btn-bag-equip-item').click();
        }
        await game.locator('#nav-tab-hero').click();
        await game.locator('#btn-open-class-skills').click();
        await game.locator('#btn-next-journey').click();
        report.panelAfterGuidance = await game.evaluate(() => appInstance.views.hero.currentPanel);
        report.recommendedVisible = await game.locator('#btn-recommended-stats').isVisible();
        if (!baseline) {
          check(report.recommendedVisible, 'Guidance stayed on skills');
          check(await game.evaluate(() => document.activeElement.id === 'btn-recommended-stats'), 'Guidance did not focus recommendation');
          for (let n = 0; n < 3; n++) await game.locator('#btn-next-journey').click();
          await game.locator('#btn-recommended-stats').click();
          check(await game.evaluate(() => gameState.data.freeStatPoints === 0), 'Recommendation failed');
          // A stale task callback can arrive after all points have been spent.
          await game.evaluate(() => appInstance.handleQuestNavigation('hero', 'allocate_stats'));
          check(await game.evaluate(() => document.activeElement.classList.contains('hero-potential-ledger')), 'Zero-point guidance has no meaningful focus target');
          check((await game.locator('.hero-potential-ledger').innerText()).includes('已分配'), 'No zero-point explanation');
        }
        await shot('potential-navigation');
        await game.reload();
        await game.waitForFunction(() => window.gameState?.data?.hasChosenClass);
        check(!await game.locator('#btn-confirm-character').isVisible(), 'Reload reopened class choice');
        await dismiss();
        await game.locator('#nav-tab-wild').click();
        await game.locator('.btn-fight-mob').first().click();
        report.ordinaryPortrait = await game.locator('[data-enemy-portrait]').getAttribute('data-enemy-portrait');
        check(report.ordinaryPortrait === 'monster_wolf', 'Ordinary enemy portrait changed');
        await game.locator('#btn-skip-battle').click();
        await game.locator('#btn-confirm-battle').click();
        await dismiss();
        // Explicit navigation fixture, only for reaching the final boss visual.
        await game.evaluate(() => {
          Object.assign(gameState.data, { level: 90, currentQuestId: 'quest_26' });
          Object.assign(gameState.data.castle, { isExploring: true, expeditionId: 'night-visual', floor: 100, finished: false });
          appInstance.views.tower.subTab = 'castle';
          appInstance.switchTab('tower');
        });
        await game.locator('#btn-challenge-castle-floor').click();
        report.dragonPortrait = await game.locator('[data-enemy-portrait]').count()
          ? await game.locator('[data-enemy-portrait]').getAttribute('data-enemy-portrait') : null;
        if (!baseline) {
          check(report.dragonPortrait === 'boss_dragonking', 'Final boss lacks explicit painted dragon portrait');
          check(await game.locator('.battle-stage-opponent.enemy-portrait-art').count() === 1, 'Stage actor is not painted dragon');
        }
        await shot('dragon-battle');
        report.layout = await game.evaluate(() => ({
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
          brokenImages: [...document.images].filter(image => image.getClientRects().length && (!image.complete || !image.naturalWidth)).map(image => image.src)
        }));
        check(!report.layout.horizontalOverflow && !report.layout.brokenImages.length, 'Broken images / horizontal overflow');
        check(!errors.length && !failures.length && !consoleErrors.length, 'Runtime/network/console error');
        report.errors = errors; report.failures = failures; report.consoleErrors = consoleErrors;
        reports.push(report);
      } catch (error) {
        console.error(JSON.stringify({ report, errors, failures, consoleErrors }));
        await shot('failure').catch(() => {});
        throw error;
      } finally {
        await context.close();
      }
    }
  }
  return { baseline, reports };
}
