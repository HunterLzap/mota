async (page) => {
  const reports = [];
  const check = (value, message) => { if (!value) throw new Error(message); };
  const protectedSlots = values => values.filter((_value, index) => index !== 2);
  const canonical = value => JSON.stringify(value, (_key, current) => current && !Array.isArray(current) && typeof current === 'object'
    ? Object.fromEntries(Object.keys(current).sort().map(key => [key, current[key]])) : current);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    for (const mode of ['abort', 'stall']) {
      const context = await page.context().browser().newContext({ viewport });
      const game = await context.newPage(), errors = [], failures = [];
      game.on('pageerror', error => errors.push(error.message));
      game.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
      let remainingFaults = 1, release;
      await game.addInitScript(() => {
        if (sessionStorage.getItem('startup-test-seeded')) return;
        sessionStorage.setItem('startup-test-seeded', '1');
        localStorage.setItem('MOTA_WORLD_ACTIVE_SLOT_ID', '3');
        for (const slot of [1, 2, 4, 5]) {
          localStorage.setItem('MOTA_WORLD_SAVE_SLOT_' + slot, JSON.stringify({ sentinel: slot, gold: slot * 97 }));
        }
      });
      const slots = () => game.evaluate(() => [1, 2, 3, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)));
      await game.route('**/js/config/classes.js', async route => {
        if (!remainingFaults) return route.continue();
        remainingFaults--;
        if (mode === 'abort') return route.abort('connectionreset');
        await new Promise(resolve => { release = resolve; });
        await route.continue();
      });
      try {
        await game.goto('http://127.0.0.1:8088', { waitUntil: 'commit' });
        const untouched = await slots();
        await game.locator('#btn-retry-startup').waitFor({ state: 'visible', timeout: 12000 });
        check(await game.evaluate(() => !window.gameState), 'Fault did not stop the actual module graph');
        check(JSON.stringify(await slots()) === JSON.stringify(untouched), 'Failed startup wrote a save');
        check(await game.evaluate(() => document.body.scrollWidth <= innerWidth), 'Startup notice overflows');
        await game.screenshot({ path: `output/playwright/startup-${mode}-${viewport.width}.png` });
        if (mode === 'stall') {
          release(); release = null;
          await game.locator('[data-class-id="warrior"]').waitFor({ state: 'visible' });
          check(!await game.locator('#btn-retry-startup').isVisible(), 'Late successful startup left a stale recovery action');
        } else {
          await game.locator('#btn-retry-startup').focus(); await game.keyboard.press('Enter');
          await game.locator('[data-class-id="warrior"]').waitFor({ state: 'visible' });
        }
        check(JSON.stringify(protectedSlots(await slots())) === JSON.stringify(protectedSlots(untouched)), 'Recovery changed a protected slot');
        check(await game.evaluate(() => !window.gameState.data.hasChosenClass && !window.gameState.data.gold && !window.gameState.data.bag.length),
          'Fresh startup did not preserve the empty character state');
        await game.locator('[data-class-id="mage"]').click();
        await game.locator('#btn-confirm-character').click();
        for (let i = 0; i < 4 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.keyboard.press('Escape');
        const chosen = await slots();
        if (mode === 'abort') remainingFaults = 1;
        await game.reload();
        if (mode === 'abort') {
          await game.locator('#btn-retry-startup').waitFor({ state: 'visible' });
          check(JSON.stringify(await slots()) === JSON.stringify(chosen), 'Failed old-save startup changed assets');
          await game.locator('#btn-retry-startup').focus(); await game.keyboard.press('Enter');
        }
        await game.waitForFunction(() => window.appInstance && window.gameState?.data?.hasChosenClass);
        check(!await game.locator('#char-select-overlay').isVisible(), 'Recovery reopened class choice for an existing save');
        check(await game.evaluate(() => window.gameState.data.classId === 'mage'), 'Recovery changed class');
        const reloaded = await slots();
        check(JSON.stringify(protectedSlots(reloaded)) === JSON.stringify(protectedSlots(chosen)), 'Old-save reload changed a protected slot');
        check(canonical(JSON.parse(reloaded[2]).data) === canonical(JSON.parse(chosen[2]).data), 'Old-save reload changed saved data');
        check(!errors.length, 'Unexpected pageerrors: ' + errors.join('; '));
        reports.push({ viewport, mode, errors, failures, allFiveSlotsPreserved: true, keyboardRetry: mode === 'abort', lateSuccess: mode === 'stall' });
      } catch (error) {
        throw new Error(error.message + ' | ' + JSON.stringify({
          viewport, mode, errors, failures, status: await game.evaluate(() => ({
            ready: document.readyState, app: !!window.appInstance, state: !!window.gameState,
            notice: document.getElementById('runtime-error-display')?.textContent
          }))
        }));
      } finally { if (release) release(); await context.close(); }
    }
  }
  return { kind: 'isolated storage; explicit module network fault; real recovery, creation and reload controls', reports };
}
