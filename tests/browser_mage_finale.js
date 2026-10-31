async (page) => {
  const reports = [], check = (ok, message) => { if (!ok) throw new Error(message); };
  const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) for (const mode of ['ordinary', 'manaCounter']) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], requests = [];
    game.setDefaultTimeout(10000);
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => requests.push(request.url()));
    game.on('response', response => { if (response.status() >= 400) requests.push(response.url()); });
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const dismiss = async () => {
      await game.waitForFunction(() => window.gameState?.data && window.appInstance?.views?.pets && window.gameModal);
      for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const click = async selector => { await game.locator(selector).first().click(); await dismiss(); };
    const enter = async selector => { await game.locator(selector).first().focus(); await game.keyboard.press('Enter'); await dismiss(); };
    const refresh = async () => {
      const before = await data(); await game.reload(); await dismiss();
      check(canonical(await data()) === canonical(before), 'Refresh changed paid assets, progression or task markers');
      check(!await game.locator('#char-select-overlay').isVisible(), 'Refresh reopened class selection');
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await click('[data-class-id="mage"]'); await click('#btn-confirm-character');
      const sentinels = await game.evaluate(async () => {
        const { storage } = await import('/js/core/storage.js');
        const fixture = (await fetch('/output/playwright/mage-pressure-earned-fixtures.json').then(response => response.json()))['mage:balanced'];
        for (let slot = 1; slot <= 5; slot++) storage.saveToSlot(slot, { ...fixture, name: slot === 3 ? fixture.name : 'Protected ' + slot });
        storage.setActiveSlotId(3); window.gameState.loadOrInit(); window.gameState.notify();
        return [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot));
      });
      await dismiss();
      if (mode === 'manaCounter') {
        const before = await data();
        const quote = await game.evaluate(() => window.gameState.getContractChoices().find(choice => choice.id === 'light_spirit'));
        check(quote, 'Earned checkpoint lacks a real counter contract');
        await click('#nav-tab-pets');
        await game.locator('#select-companion-contract').selectOption('light_spirit');
        await enter('#btn-chosen-contract'); await enter('[data-assign-party="1"]');
        const after = await data();
        check(after.gold === before.gold - quote.gold && after.crystal === before.crystal - quote.crystal,
          'Contract bypassed earned currency');
        const eggs = value => value.bag.filter(item => item.type === 'egg').reduce((sum, item) => sum + item.count, 0);
        check(eggs(after) === eggs(before) - 1 && after.supportPetIds[0] === 'light_spirit', 'Missing paid egg or unique support');
        check(after.pets.filter(pet => pet.id === 'light_spirit').length === 1, 'Counter ownership duplicated');
      }
      await refresh(); await click('#nav-tab-tower');
      await enter('.boss-tactics summary');
      const preflight = await game.locator('.boss-tactics').innerText();
      check(preflight.includes('生命回复降低90%') && preflight.includes('持续20秒') &&
        preflight.includes('不压制复活') && preflight.includes('净化不能移除首领引导'), 'Preflight did not describe the real channel');
      await game.locator('.boss-tactics p').last().scrollIntoViewIfNeeded();
      check(await game.locator('#btn-challenge-castle-floor').evaluate(button => {
        const bounds = button.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
        return bounds.top >= main.top && bounds.bottom <= main.bottom;
      }), 'Channel details displaced the fixed challenge control');
      await game.screenshot({ path: `output/playwright/mage-channel-${mode}-${viewport.width}-preflight.png`, animations: 'disabled' });
      const before = await data();
      await game.evaluate(() => {
        let seed = 1000;
        Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
      });
      await game.locator('#btn-challenge-castle-floor').click(); await game.locator('#btn-skip-battle').click();
      const combat = await game.evaluate(() => JSON.parse(JSON.stringify(window.appInstance.battleView.currentCombat)));
      const panel = await game.locator('.battle-skills').last().innerText();
      check(panel.includes('生命回复降低90%') && panel.includes('20秒') && panel.includes('不压制复活'),
        'Actual battle panel lost the new configuration');
      check(combat.victory, 'Earned mage became blocked');
      check(combat.logs.every(log => Number.isInteger(log.playerHp)) && Number.isInteger(combat.remainingMp),
        'Fractional mana recovery leaked into the health display');
      check(Number((await game.locator('#b-player-mp-num').innerText()).replace(/,/g, '')) === combat.remainingMp &&
        Number((await game.locator('#b-enemy-mp-num').innerText()).replace(/,/g, '')) === combat.logs.at(-1).enemyMp,
      'Visible mana does not follow the actual spell, shield and mana-drain resource path');
      const prevented = combat.logs.reduce((sum, log) => sum + (log.healingPrevented || 0), 0);
      if (mode === 'ordinary') {
        check(combat.logs.some(log => log.recoverySealStarted) && prevented > 5000, 'Channel never suppressed actual recovery: ' +
          JSON.stringify({ prevented, duration: combat.duration, starts: combat.logs.filter(log => log.recoverySealStarted),
            spells: combat.logs.filter(log => log.phaseThreshold || log.maxHpDamage > 0),
            blocked: combat.logs.filter(log => log.healingPrevented), ends: combat.logs.filter(log => log.recoverySealEnded) }));
        check(combat.logs.some(log => log.healingPrevented && log.healingSource === '职业光环') &&
          combat.logs.some(log => log.healingPrevented && log.healingSource === '吸血'),
          'Real mage recovery bypassed the shared path: ' + JSON.stringify(combat.logs.filter(log => log.healingPrevented)));
        check(combat.logs.filter(log => log.manaDrained).length === 2 &&
          combat.logs.filter(log => log.manaDrained).every(log => log.manaDrained > 0), 'Mana drain did not hit twice');
      } else {
        check(combat.logs.some(log => log.message.includes('光灵·破魔')), 'Purchased counter did not burn real mana');
        check(prevented === 0, 'Mana exhaustion failed to prevent channeling');
      }
      await game.screenshot({ path: `output/playwright/mage-channel-${mode}-${viewport.width}-battle.png`, animations: 'disabled' });
      await enter('#btn-confirm-battle');
      const after = await data();
      check(after.castle.finished && after.castle.claimedBossRewards.filter(floor => floor === 100).length === 1,
        'Finale did not settle a unique first clear');
      for (const petId of [after.activePetId, ...after.supportPetIds].filter(Boolean)) {
        const spent = petId === after.activePetId ? 3 : 1;
        check(after.pets.find(pet => pet.id === petId).stamina === before.pets.find(pet => pet.id === petId).stamina - spent,
          'Battle bypassed independent stamina consumption');
      }
      await click('#btn-claim-castle-exit'); await refresh();
      check(canonical(await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)))) === canonical(sentinels),
        'Other four slots changed');
      check(!errors.length && !requests.length, 'Browser errors: ' + JSON.stringify({ errors, requests }));
      check(await game.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth), 'Horizontal overflow');
      reports.push({ viewport, mode, victory: combat.victory, duration: combat.duration, prevented,
        seals: combat.logs.filter(log => log.recoverySealStarted).length, errors, requests, protectedSlots: 4 });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/mage-channel-failure-${mode}-${viewport.width}.png` });
      throw new Error(error.message + ' | ' + JSON.stringify({ viewport, mode, errors, requests }));
    } finally { await context.close(); }
  }
  return { kind: 'earned checkpoint fixture; paid UI counter and seeded finale; not a new-save full UI run', reports };
}
