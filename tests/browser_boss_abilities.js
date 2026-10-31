async (page) => {
  const rows = [];
  for (const [floor, petId, purify] of [[20, 'golden_dragon', false], [20, 'golden_dragon', true], [30, 'unicorn', false], [100, 'golden_dragon', true]]) {
    const context = await page.context().browser().newContext();
    const game = await context.newPage();
    const errors = [];
    game.on('pageerror', error => errors.push(error.message));
    try {
      await game.goto('http://127.0.0.1:8088', { timeout: 60000 });
      await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
      while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click();
      // Isolated boss/gear/pet fixture: integration and counterplay, not natural progression.
      await game.evaluate(async ({ floor, petId, purify }) => {
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const { SPECIAL_ITEMS } = await import('/js/config/items.js');
        const state = window.gameState;
        state.data.level = floor; state.data.currentQuestId = 'completed';
        for (let chapter = 1; chapter <= 26; chapter++) state.data.questProgress['quest_' + chapter] = { current: 1, completed: true, claimed: true };
        state.data.equipped = { weapon: { id: 'boss_fixture', name: 'Test sword', slot: 'weapon', durability: 100, maxDurability: 100, stats: { atk: floor === 100 ? 10000 : 0, hp: 1000000 }, sockets: 0, gems: [] } };
        state.data.pets = [{ id: petId, level: 1, exp: 0, tier: PET_CONFIGS[petId].defaultTier, apt: { ...PET_CONFIGS[petId].defaultApt }, stamina: 100, skills: [] }];
        state.data.activePetId = petId;
        state.data.bag = [{ ...SPECIAL_ITEMS.pet_food, uid: 'boss_food_fixture', count: 1 }];
        Object.assign(state.data.castle, { floor, isExploring: true, expeditionId: "tower-fixture", finished: false });
        state.notify();
      }, { floor, petId, purify });
      if (purify) {
        await game.evaluate(() => { window.gameState.data.prestige = 0; window.gameState.data.equipped.weapon.stats.atk = 10000; window.gameState.notify(); });
        await game.locator('#nav-tab-wild').click();
        for (let fight = 0; fight < 15; fight++) {
          await game.locator('#btn-fight-wild-boss').click(); await game.locator('#btn-skip-battle').click();
          if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Book funding battle lost');
          await game.locator('#btn-confirm-battle').click();
          while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click();
        }
        await game.evaluate(() => { window.appInstance.views.town.currentView = 'palace_arena'; window.switchMainTab('town'); });
        await game.locator('#btn-arena-subtab-shop').click();
        await game.locator('.btn-buy-prestige-item[data-shop-id="book_purify"]').click();
        while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click();
        await game.locator('#nav-tab-pets').click(); await game.locator('#btn-feed-pet').click();
        while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click();
        await game.locator('#pet-subtab-skills').click(); await game.locator('.btn-learn-skill[data-book-id="book_purify"]').click();
        while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click();
        if (!await game.evaluate(() => window.gameState.data.prestige === 0 && window.gameState.data.pets[0].skills.includes('book_purify'))) throw new Error('Purification book was not actually bought/learned');
        await game.evaluate(floor => { window.gameState.data.level = floor; window.gameState.data.equipped.weapon.stats.atk = floor === 100 ? 10000 : 0; window.gameState.notify(); }, floor);
      }
      // Stable roll avoids random early critical kills hiding the spell adapter.
      await game.evaluate(() => { Math.random = () => 0.5; });
      await game.locator('#nav-tab-tower').click();
      await game.locator('#btn-challenge-castle-floor').click(); await game.locator('#btn-skip-battle').click();
      const battle = await game.evaluate(() => window.appInstance.battleView.currentCombat);
      if (!battle.victory) throw new Error(`Boss ${floor} fixture lost`);
      if (!battle.logs.some(log => log.message.includes('首领蓄势'))) throw new Error(`Boss ${floor} never warned`);
      if (floor === 20 && !purify && !battle.logs.some(log => log.type === 'poison')) throw new Error('Poison storm did not reach actual browser');
      if (floor === 20 && purify && (battle.logs.some(log => log.type === 'poison') || !battle.logs.some(log => log.message.includes('免疫剧毒')))) throw new Error('Purification did not counter actual storm');
      if (floor === 30 && !battle.logs.some(log => log.message.includes('免疫虚弱'))) throw new Error('Holy pet did not counter bone breath');
      if (floor === 100 && !battle.logs.some(log => log.message.includes('免疫眩晕'))) throw new Error('Purification did not counter imprisonment');
      await game.locator('#btn-confirm-battle').click();
      while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click();
      await game.reload();
      if (!await game.evaluate(floor => window.gameState.data.castle.claimedBossRewards.includes(floor), floor)) throw new Error('Boss skill victory lost persisted first-clear record');
      if (errors.length) throw new Error(errors.join('; '));
      rows.push({ floor, petId, purify, warned: true, won: true, firstClearSaved: true, errors });
    } finally { await context.close(); }
  }
  return rows;
}
