async (page) => {
  const context = await page.context().browser().newContext(); const game = await context.newPage(); const errors = [];
  game.on('pageerror', error => errors.push(error.message));
  const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  const dismiss = async () => { while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click(); await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' }); };
  const go = async () => game.evaluate(() => { window.appInstance.views.town.currentView = 'dragons'; window.switchMainTab('town'); });
  const fight = async (id, victory, capture) => {
    await game.locator(`.btn-fight-dragon[data-dragon-id="${id}"]`).click();
    if (capture) await game.evaluate(() => { window.oldDragonCallback = window.appInstance.battleView.onFinishCallback; });
    await game.locator('#btn-skip-battle').click();
    if (await game.evaluate(() => window.appInstance.battleView.currentCombat.victory) !== victory) throw new Error('Unexpected battle result');
    await game.locator('#btn-confirm-battle').click(); await dismiss();
  };
  try {
    await game.goto('http://127.0.0.1:8088'); await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
    // Isolated 100-level/strong equipment/full bag; real entries, battles and production reward adapters.
    await game.evaluate(() => {
      const state = window.gameState; state.data.level = 100; state.data.currentQuestId = 'completed';
      state.data.equipped.weapon ??= { id:'fixture_weapon',uid:'fixture_weapon',name:'Fixture weapon',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:1,sockets:1,gems:[],stats:{atk:35} };
      state.data.equipped.weapon.stats = { atk: 1000000, hp: 1000000, def: 10000 };
      state.data.bag = Array.from({ length: 60 }, (_, i) => ({ id: 'full_' + i, name: 'Material ' + i, count: 1 }));
      state.notify(); Math.random = () => 0.1;
    });
    await go(); const initial = await data(); const rows = [];
    for (const id of ['slay_red_dragon', 'slay_silver_dragon', 'slay_golden_dragon']) {
      const before = await data(); await fight(id, true, true); const won = await data();
      if (won.gold - before.gold !== 5000 || won.crystal - before.crystal !== 100 || won.prestige - before.prestige !== 100 || won.dragon.cleared[id] !== 1 || won.dragon.activeChallenge !== null) throw new Error('Currency/ledger reward incorrect');
      const drops = won.bag.filter(item => !before.bag.some(old => old.uid === item.uid && item.uid));
      const gear = drops.find(item => item.slot);
      const quality = id === 'slay_red_dragon' ? 'gold' : 'purplegold';
      if (!gear || gear.quality !== quality || !Object.keys(gear.stats).length) throw new Error('Promised equipment missing');
      if (id === 'slay_silver_dragon' && (gear.setId !== 'destiny_goddess' || !won.bag.some(item => item.id === 'pet_egg_darkgold') || !won.bag.some(item => item.id === 'protect_crystal'))) throw new Error('Silver dragon promised drops missing');
      if (id === 'slay_red_dragon' && !won.bag.some(item => item.id === 'pet_egg_gold')) throw new Error('Gold egg missing');
      if (id === 'slay_golden_dragon' && gear.setId !== 'wisdom_goddess') throw new Error('Gold dragon set missing');
      await game.evaluate(() => { window.oldDragonCallback(true); window.oldDragonCallback(false); }); await dismiss();
      if (JSON.stringify(await data()) !== JSON.stringify(won)) throw new Error('Duplicate callback rewarded');
      rows.push({ id, quality, setId: gear.setId, bagSize: won.bag.length });
    }
    const paid = await data(); await game.reload(); const loaded = await data();
    if (loaded.dragon.trialsLeft !== 0 || loaded.gold !== paid.gold || loaded.bag.length !== paid.bag.length) throw new Error('Refresh lost rewards/quota');
    // Simulated next-day reset only; no currency grants. Abandon an actual in-progress battle by refreshing.
    await game.evaluate(() => { const state = window.gameState; state.data.dailyResetDate = 'previous day'; state.resetDailyActivities(); });
    await go(); await game.locator('.btn-fight-dragon[data-dragon-id="slay_red_dragon"]').click(); const pending = await data();
    if (pending.dragon.trialsLeft !== 2 || !pending.dragon.activeChallenge) throw new Error('Pending entry not persisted');
    await game.reload(); const abandoned = await data();
    if (abandoned.dragon.trialsLeft !== 2 || abandoned.dragon.activeChallenge !== null || abandoned.gold !== pending.gold) throw new Error('Refresh refunded/locked/rewarded abandoned battle');
    await game.evaluate(() => { window.gameState.data.equipped = {}; window.gameState.notify(); });
    await go(); const beforeLoss = await data(); await fight('slay_golden_dragon', false); const lost = await data();
    if (lost.gold !== beforeLoss.gold || lost.exp !== beforeLoss.exp || lost.bag.length !== beforeLoss.bag.length || lost.dragon.trialsLeft !== 1 || lost.dragon.activeChallenge !== null) throw new Error('Loss reward/quota wrong');
    await game.reload(); if ((await data()).dragon.trialsLeft !== 1) throw new Error('Loss quota not saved');
    // Both typed eggs from actual rewards hatch to their promised tiers through the existing action.
    await game.locator('#nav-tab-pets').click(); const eggTiers = [];
    for (const tier of ['gold', 'darkgold']) {
      const owned = (await data()).pets.map(pet => pet.id);
      await game.locator('#btn-hatch-egg').click(); await dismiss();
      const born = (await data()).pets.find(pet => !owned.includes(pet.id));
      if (born?.tier !== tier) throw new Error('Typed eggs did not hatch correctly');
      eggTiers.push(born.tier);
    }
    if (errors.length) throw new Error(errors.join('; '));
    return { rows, realWins: 3, realLosses: 1, fullBagRewardsKept: true, goldEarned: paid.gold - initial.gold, duplicateRefused: true, pendingReloadNoRefund: true, lossSaved: true, eggTiers, errors };
  } finally { await context.close(); }
}
