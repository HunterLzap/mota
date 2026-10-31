async (page) => {
  const reports = [], check = (ok, message) => { if (!ok) throw new Error(message); };
  const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], requests = [];
    game.setDefaultTimeout(10000);
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => requests.push({ url: request.url(), error: request.failure()?.errorText }));
    game.on('response', response => { if (response.status() >= 400) requests.push({ url: response.url(), status: response.status() }); });
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const dismiss = async () => {
      await game.waitForFunction(() => window.appInstance?.views?.pets && window.gameState?.data && window.gameModal);
      for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const click = async selector => { await game.locator(selector).first().click(); await dismiss(); };
    const keyboard = async selector => { await game.locator(selector).focus(); await game.keyboard.press('Enter'); await dismiss(); };
    const refresh = async () => {
      const before = await data(); await game.reload(); await dismiss();
      check(canonical(await data()) === canonical(before), 'Paid counter or battle result changed on refresh');
      check(!await game.locator('#char-select-overlay').isVisible(), 'Refresh reopened class choice');
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await click('[data-class-id="warrior"]'); await click('#btn-confirm-character');
      const sentinels = await game.evaluate(async () => {
        const { storage } = await import('/js/core/storage.js');
        const fixture = await fetch('/output/playwright/finale-pressure-recovery-fixture.json').then(response => response.json());
        storage.saveToSlot(3, fixture); storage.setActiveSlotId(3);
        window.gameState.loadOrInit(); window.gameState.notify();
        for (const slot of [1, 2, 4, 5]) storage.saveToSlot(slot, { ...fixture, name: 'Protected ' + slot });
        return [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot));
      });
      await dismiss();
      const before = await data(), eggCount = value => value.bag.filter(item => item.type === 'egg').reduce((sum, item) => sum + item.count, 0);
      const quote = await game.evaluate(() => window.gameState.getContractChoices().find(choice => choice.id === 'light_spirit'));
      check(quote && !before.supportPetIds[0], 'Earned assault fixture lacks a real counter choice or free slot');
      await click('#nav-tab-pets');
      await game.locator('#select-companion-contract').selectOption('light_spirit');
      await keyboard('#btn-chosen-contract');
      const purchased = await data();
      check(purchased.gold === before.gold - quote.gold && purchased.crystal === before.crystal - quote.crystal,
        'Actual contract did not spend the earned quoted currencies');
      check(eggCount(purchased) === eggCount(before) - 1 && purchased.pets.filter(pet => pet.id === 'light_spirit').length === 1,
        'Actual contract did not consume one earned egg for one owned counter');
      await keyboard('[data-assign-party="1"]');
      const assigned = await data();
      check(assigned.activePetId === before.activePetId && assigned.supportPetIds[0] === 'light_spirit',
        'Counter did not occupy exactly one support slot');
      check(new Set([assigned.activePetId, ...assigned.supportPetIds].filter(Boolean)).size === 2, 'Duplicate party slot');
      for (const key of ['level', 'classId', 'allocatedStats', 'skillTraining', 'equipped']) {
        check(canonical(assigned[key]) === canonical(before[key]), 'Counter required resetting ' + key);
      }
      check(await game.locator('[data-pet-id="light_spirit"]').evaluate(element => element === document.activeElement),
        'Support assignment lost keyboard focus');
      await click('#nav-tab-estate'); await click('[data-goto="mercenaries"]');
      const guard = await game.evaluate(async () => (await import('/js/config/estate.js')).MERCENARIES.find(mercenary => mercenary.id === 'merc_paladin'));
      await keyboard('.btn-hire-merc[data-merc-id="merc_paladin"]');
      const guarded = await data();
      check(guarded.estate.hiredMercId === guard.id && guarded.gold === before.gold - quote.gold - guard.hireCostGold &&
        guarded.crystal === before.crystal - quote.crystal, 'Actual guardian hire did not spend the earned fee');
      await refresh(); await click('#nav-tab-tower');
      await game.locator('.boss-tactics summary').focus(); await game.keyboard.press('Enter');
      const tips = await game.locator('.boss-tactics').innerText();
      check(tips.includes('余烬') && tips.includes('破魔') && tips.includes('命中至少85%'), 'Actual preflight omitted the new pressure or counters');
      await game.screenshot({ path: `output/playwright/finale-pressure-counter-${viewport.width}.png`, animations: 'disabled' });
      await game.evaluate(() => {
        let seed = 1000;
        Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
      });
      await game.locator('#btn-challenge-castle-floor').click(); await game.locator('#btn-skip-battle').click();
      const combat = await game.evaluate(() => JSON.parse(JSON.stringify(window.appInstance.battleView.currentCombat)));
      check(combat.victory && combat.logs.some(log => log.message.includes('光灵·破魔')), 'Paid-for counter did not win and burn real mana');
      check(combat.logs.some(log => log.message.includes('佣兵援护') && log.message.includes('18%')), 'Paid guardian protection never reached combat');
      check(combat.logs.some(log => log.message.includes('神圣护盾') && log.message.includes('60000')), 'Actual final shield was lost');
      check(combat.logs.filter(log => log.phaseEcho).length <= 4, 'Echo pressure exceeded its finite budget');
      await keyboard('#btn-confirm-battle');
      const settled = await data();
      for (const [id, cost] of [[before.activePetId, 3], ['light_spirit', 1]]) {
        check(settled.pets.find(pet => pet.id === id).stamina === assigned.pets.find(pet => pet.id === id).stamina - cost,
          'Actual counter battle bypassed stamina cost for ' + id);
      }
      check(settled.castle.finished && settled.castle.claimedBossRewards.filter(floor => floor === 100).length === 1,
        'Counter victory failed to settle the unique final reward');
      await click('#btn-claim-castle-exit'); await refresh();
      check(await game.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth),
        'Counter flow overflowed horizontally');
      check(canonical(await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)))) === canonical(sentinels),
        'Counter purchase or combat changed protected slots');
      check(!errors.length && !requests.length, 'Browser failures: ' + JSON.stringify({ errors, requests }));
      reports.push({ viewport, gold: quote.gold + guard.hireCostGold, crystal: quote.crystal, eggs: 1, stamina: [3, 1],
        victory: true, seconds: combat.duration, echoes: combat.logs.filter(log => log.phaseEcho).length,
        refreshes: 2, protectedSlots: 4, errors, requests });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/finale-pressure-counter-failure-${viewport.width}.png` });
      throw new Error(error.message + ' | ' + JSON.stringify({ viewport, errors, requests }));
    } finally { await context.close(); }
  }
  return { kind: 'earned assault checkpoint loaded as isolated fixture; paid UI contract and counter battle; seeded combat, not a full UI journey', reports };
}
