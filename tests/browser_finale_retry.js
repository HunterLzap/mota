async (page) => {
  const reports = [], check = (ok, message) => { if (!ok) throw new Error(message); };
  const canonical = value => JSON.stringify(value, (_key, item) => item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], requests = [];
    game.setDefaultTimeout(10000);
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => requests.push(request.url()));
    game.on('response', response => { if (response.status() >= 400) requests.push(response.url()); });
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const dismiss = async () => {
      await game.waitForFunction(() => window.appInstance?.views?.tower && window.gameState?.data && window.gameModal);
      for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal?.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const click = async selector => { await game.locator(selector).first().click(); await dismiss(); };
    const keyboard = async selector => { await game.locator(selector).focus(); await game.keyboard.press('Enter'); await dismiss(); };
    const refresh = async () => {
      const before = await data(); await game.reload(); await dismiss();
      check(canonical(await data()) === canonical(before), 'Checkpoint changed on refresh');
      check(!await game.locator('#char-select-overlay').isVisible(), 'Class choice reopened');
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await click('[data-class-id="mage"]'); await click('#btn-confirm-character');
      const sentinels = await game.evaluate(async () => {
        const { storage } = await import('/js/core/storage.js');
        const fixture = (await fetch('/output/playwright/finale-earned-fixtures.json').then(response => response.json())).mage;
        storage.saveToSlot(3, fixture); storage.setActiveSlotId(3);
        window.gameState.loadOrInit();
        const data = window.gameState.data;
        data.castle.entriesLeft = 0;
        data.bag = data.bag.filter(item => !item.id.startsWith('key_') && item.id !== 'royal_castle_permit');
        for (const slot of [1, 2, 4, 5]) storage.saveToSlot(slot, { ...data, name: 'Protected ' + slot });
        window.gameState.notify();
        Math.random = () => .98;
        return [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot));
      });
      await click('#nav-tab-tower');
      await game.locator('#btn-challenge-castle-floor').click(); await game.locator('#btn-skip-battle').click();
      const lost = await game.evaluate(() => window.appInstance.battleView.currentCombat);
      check(!lost.victory && lost.timedOut, 'Deliberate miss fixture did not actually time out');
      await keyboard('#btn-confirm-battle');
      const afterLoss = await data();
      check(!afterLoss.castle.isExploring && afterLoss.castle.entriesLeft === 0, 'Failed battle reset daily quota or retained the expedition');
      check(await game.locator('#btn-retry-finale').isVisible(), 'No real retry control after defeat at exhausted quota');
      await refresh(); await click('#nav-tab-tower');
      await game.screenshot({ path: `output/playwright/finale-retry-ready-${viewport.width}.png`, animations: 'disabled' });
      const beforeRetry = await data();
      await keyboard('#btn-retry-finale');
      check(await game.locator('#btn-challenge-castle-floor').evaluate(element => element === document.activeElement),
        'Retry acknowledgement did not restore challenge focus');
      const retried = await data();
      check(retried.castle.isExploring && retried.castle.floor === 100 && retried.castle.entriesLeft === 0,
        'Retry did not start directly at 100 with unchanged quota');
      for (const key of ['gold', 'exp', 'level', 'crystal', 'bag', 'pets', 'equipped']) {
        check(canonical(retried[key]) === canonical(beforeRetry[key]), 'Retry changed ' + key);
      }
      check(retried.castle.accumulatedExp === 0 && retried.castle.accumulatedGold === 0, 'Retry recreated old rewards');
      await refresh(); await click('#nav-tab-tower');
      await game.evaluate(() => { Math.random = () => .5; });
      await game.locator('#btn-challenge-castle-floor').click(); await game.locator('#btn-skip-battle').click();
      const won = await game.evaluate(() => window.appInstance.battleView.currentCombat);
      check(won.victory && won.logs.some(log => log.maxHpDamage > 0), 'Prepared retry did not win through actual threshold spells');
      await keyboard('#btn-confirm-battle');
      check((await data()).castle.claimedBossRewards.filter(floor => floor === 100).length === 1, 'First clear was not awarded exactly once');
      await click('#btn-claim-castle-exit');
      check(await game.locator('#btn-retry-finale').count() === 0, 'Free retry remained after first clear');
      await refresh();
      check(JSON.stringify(await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)))) === JSON.stringify(sentinels),
        'Protected slots changed');
      check(!errors.length && !requests.length, 'Unexpected browser error: ' + JSON.stringify({ errors, requests }));
      check(await game.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth),
        'Horizontal overflow');
      reports.push({ viewport, timeout: lost.duration, retryWon: won.duration, entriesUnchanged: true,
        refreshes: 3, protectedSlots: 4, errors, requests });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/finale-retry-failure-${viewport.width}.png` });
      throw new Error(error.message + ' | ' + JSON.stringify({ viewport, errors, requests }));
    } finally { await context.close(); }
  }
  return { kind: 'earned final-encounter save; explicit zero-quota/no-key and miss/random fixtures; real loss, retry, win and withdrawal UI', reports };
}
