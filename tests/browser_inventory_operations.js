async (page) => {
  const baseline = new URL(page.url()).searchParams.has('inventory-baseline');
  const reports = [], check = (ok, message) => { if (!ok) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], failures = [], pending = new Set();
    game.setDefaultTimeout(8000);
    game.on('pageerror', error => errors.push(error.message));
    game.on('request', request => pending.add(request.url()));
    game.on('requestfinished', request => pending.delete(request.url()));
    game.on('requestfailed', request => { pending.delete(request.url()); failures.push({ url: request.url(), error: request.failure()?.errorText }); });
    game.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
    const dismiss = async () => {
      for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal?.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const click = async selector => { await game.locator(selector).first().click(); await dismiss(); };
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const overflow = async () => check(await game.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth), 'Horizontal overflow');
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.waitForFunction(() => Boolean(window.appInstance && window.gameState && window.appInstance.views && window.appInstance.views.bag), null, { timeout: 30000 });
      await game.evaluate(async () => {
        const { GameState, gameState } = await import('/js/core/state.js');
        const { storage } = await import('/js/core/storage.js');
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const { SPECIAL_ITEMS, specializeEquipment } = await import('/js/config/items.js');
        const state = new GameState().data;
        Object.assign(state, { name: 'Inventory fixture', classId: 'warrior', level: 30, hasChosenClass: true, onboardingVersion: 2, currentQuestId: 'quest_14', gold: 50000, crystal: 500 });
        for (let i = 1; i <= 13; i++) state.questProgress['quest_' + i] = { claimed: true, completed: true, current: 1 };
        state.pets = ['mermaid', 'naga'].map(id => ({ id, tier: PET_CONFIGS[id].defaultTier, level: 20, exp: 0, stamina: 70, apt: { ...PET_CONFIGS[id].defaultApt }, skills: [] }));
        state.activePetId = 'mermaid';
        state.bag = [
          { ...SPECIAL_ITEMS.pet_food, count: 5, uid: 'food' },
          { ...SPECIAL_ITEMS.star_crystal, count: 3, uid: 'stars' },
          ...Array.from({ length: 28 }, (_, i) => ({
            id: 'fixture_' + i, uid: 'fixture_' + i, name: 'Forged ' + i, slot: ['weapon', 'boots', 'helmet'][i % 3],
            quality: ['blue', 'gold', 'darkgold'][i % 3], reqLevel: i % 4 === 0 ? 50 : i + 1,
            reqClass: i % 7 === 0 ? 'mage' : 'warrior', stats: { atk: 20 + i, def: i }, durability: 100, maxDurability: 100, stars: 0, sockets: 0, gems: []
          }))
        ];
        state.bag.push(specializeEquipment({ id: 'fixture_chest', uid: 'fixture_chest', name: 'Guard plate', slot: 'armor', quality: 'gold', reqLevel: 20, stats: { def: 80, hp: 200 }, durability: 100, maxDurability: 100, sockets: 0, stars: 0, gems: [] }, 'warrior'));
        storage.setActiveSlotId(3);
        for (const slot of [1, 2, 4, 5]) localStorage.setItem('MOTA_WORLD_SAVE_SLOT_' + slot, JSON.stringify({ data: { name: 'Sentinel ' + slot, gold: slot * 91 } }));
        gameState.data = state; gameState.notify();
        window.gameModal.close();
        document.getElementById('char-select-overlay').classList.add('hidden');
        window.appInstance.switchTab('bag');
      });
      await dismiss();
      const sentinels = await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)));
      const before = await data();
      const hasTools = await game.locator('#bag-sort').count() > 0;
      let companionTraining = null;
      if (!baseline) {
        await game.locator('#bag-sort').selectOption('level');
        await game.locator('#bag-slot-filter').selectOption('weapon');
        await game.locator('#bag-wearable').check();
        const uids = await game.locator('[data-bag-uid]').evaluateAll(nodes => nodes.map(node => node.dataset.bagUid));
        const items = uids.map(uid => before.bag.find(item => item.uid === uid));
        check(items.length > 1 && items.every(item => item.slot === 'weapon' && item.reqLevel <= 30 && item.reqClass === 'warrior'), 'Wearable or slot filtering is wrong');
        check(items.every((item, index) => !index || items[index - 1].reqLevel >= item.reqLevel), 'Level sorting is wrong');
        check(JSON.stringify(before) === JSON.stringify(await data()), 'Filtering or sorting changed inventory assets');
        await click(`[data-bag-uid="${uids[0]}"]`);
        await game.locator('#bag-action-menu').waitFor();
        await game.locator('#bag-action-menu button').filter({ hasText: '穿戴' }).first().click();
        check((await data()).equipped.weapon?.uid === uids[0], 'Filtered equipment did not actually equip');
        await game.screenshot({ path: `output/playwright/playability-bag-after-${viewport.width}.png` });
        await game.locator('#bag-slot-filter').selectOption('all');
        await game.locator('#bag-wearable').uncheck();
        await game.locator('#bag-sort').selectOption('quality');
        await click('[data-filter="material"]');
        await click('[data-bag-uid="stars"]');
        const beforeNavigation = await data();
        await game.locator('#btn-bag-item-destination').focus(); await game.keyboard.press('Enter'); await dismiss();
        check(await game.evaluate(() => window.appInstance.views.town.currentView === 'smithy_enhance'), 'Material destination did not open actual forge');
        check(JSON.stringify(beforeNavigation) === JSON.stringify(await data()), 'Material navigation consumed assets');
      }
      await click('#nav-tab-pets');
      await click('[data-pet-id="mermaid"]');
      const measurements = await game.evaluate(() => ({
        sidebar: document.querySelector('.classic-sidebar').getBoundingClientRect().width,
        empty: document.querySelectorAll('.pet-empty-slot').length,
        detail: document.querySelector('.pet-classic-detail').getBoundingClientRect().width
      }));
      if (!baseline) {
        check(measurements.sidebar <= 300 && measurements.empty <= 1 && measurements.detail > 400, 'Pet layout wastes working space');
        await game.locator('#btn-feed-pet').focus(); await game.keyboard.press('Enter');
        await game.keyboard.press('Escape'); await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
        check((await data()).pets[0].stamina === 100 && (await data()).bag.find(item => item.id === 'pet_food').count === 4, 'Feeding did not consume exactly one food');
        check(await game.locator('#btn-feed-pet').isDisabled(), 'Full companion can waste food');
        check(await game.evaluate(() => document.activeElement?.matches('.pet-select-card')), 'Feeding lost keyboard focus');
        await game.locator('[data-assign-party="1"]').focus(); await game.keyboard.press('Enter');
        check((await data()).supportPetIds[0] === 'mermaid' && !(await data()).activePetId, 'Actual slot swap failed');
        await click('[data-pet-id="naga"]');
        await click('#btn-toggle-active-pet');
        check((await data()).activePetId === 'naga', 'Main companion selection failed');
        await click('[data-pet-id="mermaid"]');
        const beforeTraining = await data();
        const quote = await game.evaluate(() => window.gameState.getCompanionTrainingQuote('mermaid'));
        check(quote.success && quote.level === 20 && quote.targetLevel === 25, 'Training quote did not use actual companion progress');
        await game.evaluate(()=>{window.appInstance.views.pets.detailSub='more';window.appInstance.views.pets.render();});
        await game.locator('#btn-train-companion').focus(); await game.keyboard.press('Enter');
        check(await game.locator('#game-modal-message').innerText().then(text => text.includes('25级')), 'Training success feedback missing');
        await game.keyboard.press('Escape'); await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
        const trained = await data(), trainedPet = trained.pets.find(pet => pet.id === 'mermaid');
        check(trained.gold === beforeTraining.gold - quote.gold && trained.crystal === beforeTraining.crystal - quote.crystal,
          'Training did not charge the displayed gold and crystals');
        check(trained.bag.find(item => item.id === 'pet_food').count === beforeTraining.bag.find(item => item.id === 'pet_food').count - 1,
          'Training did not consume exactly one food');
        check(trainedPet.level === 25 && trainedPet.exp === 0, 'Training did not apply actual companion experience');
        const preservedPet = { ...trainedPet, level: 20, exp: 0 };
        check(JSON.stringify(preservedPet) === JSON.stringify(beforeTraining.pets.find(pet => pet.id === 'mermaid')), 'Training changed companion identity, stamina or aptitude');
        check(JSON.stringify(trained.pets.find(pet => pet.id === 'naga')) === JSON.stringify(beforeTraining.pets.find(pet => pet.id === 'naga')),
          'Training changed a different companion');
        check(trained.level === beforeTraining.level && trained.exp === beforeTraining.exp &&
          trained.activePetId === beforeTraining.activePetId && JSON.stringify(trained.supportPetIds) === JSON.stringify(beforeTraining.supportPetIds),
          'Training changed hero experience or formation');
        check(await game.evaluate(() => document.activeElement?.matches('.pet-select-card.is-selected')), 'Training lost keyboard focus');
        companionTraining = { levelBefore: quote.level, levelAfter: trainedPet.level, gold: quote.gold, crystal: quote.crystal, food: 1 };
      }
      await overflow();
      await game.screenshot({ path: `output/playwright/playability-inventory-${baseline ? 'before' : 'after'}-${viewport.width}.png` });
      const saved = await data();
      await game.reload(); await dismiss();
      await game.waitForFunction(() => window.appInstance && window.gameState?.data?.hasChosenClass);
      const loaded = await data();
      for (const key of ['bag', 'pets', 'activePetId', 'supportPetIds', 'gold', 'crystal', 'classId']) check(JSON.stringify(saved[key]) === JSON.stringify(loaded[key]), 'Refresh changed ' + key);
      check(JSON.stringify(sentinels) === JSON.stringify(await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)))), 'Protected slots changed');
      check(!errors.length, 'Page errors: ' + errors);
      reports.push({ baseline, width: viewport.width, hasTools, measurements, companionTraining, pageErrors: errors, refreshes: 1, kind: 'explicit level/inventory/owned-companion fixture; real view controls, feeding, party assignment and paid training' });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/playability-inventory-failure-${viewport.width}.png` });
      throw new Error(error.message + ' | ' + JSON.stringify({ errors, failures, pending: [...pending], ready: await game.evaluate(() => ({ app: !!window.appInstance, state: !!window.gameState, status: document.readyState })) }));
    } finally { await context.close(); }
  }
  return reports;
}
