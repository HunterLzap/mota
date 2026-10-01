async (page) => {
  const context = await page.context().browser().newContext(); const game = await context.newPage(); const errors = [];
  game.on('pageerror', error => errors.push(error.message));
  const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  const dismiss = async () => {
    for (let i = 0; i < 8; i++) {
      if (!await game.evaluate(() => window.gameModal.isOpen)) { await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' }); return; }
      await game.locator('#game-modal-btn-confirm').click();
    }
    throw new Error('Modal did not settle');
  };
  const fight = async () => {
    await game.locator('.btn-challenge-stronghold[data-stronghold-id="silverwing"]').click();
    await game.locator('#btn-skip-battle').click();
    if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Fixture lost');
    await game.locator('#btn-confirm-battle').click(); await dismiss();
  };
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
    // Only level/equipment prerequisite is prepared; all military merit is earned in five actual battles.
    await game.evaluate(() => {
      const state = window.gameState; state.data.level = 20;
      state.data.equipped.weapon.stats = { atk: 100000, hp: 1000000, def: 10000 }; state.notify();
      window.appInstance.views.town.currentView = 'faction_war'; window.switchMainTab('town');
    });
    for (let n = 0; n < 4; n++) await fight();
    const earned = (await data()).factionWar;
    if (earned.merit !== 480 || earned.totalMerit !== 480 || earned.militaryRank !== 'scout') throw new Error('Earned rank incorrect');
    for (let n = 0; n < 4; n++) { await game.locator('.btn-exchange-faction-reward[data-reward-id="key_mithril"]').click(); await dismiss(); }
    const spent = (await data()).factionWar;
    if (spent.merit !== 80 || spent.totalMerit !== 480 || spent.militaryRank !== 'scout') throw new Error('Spending reduced earned merit/rank');
    await fight(); const promoted = await data();
    if (promoted.factionWar.merit !== 200 || promoted.factionWar.totalMerit !== 600 || promoted.factionWar.militaryRank !== 'centurion') throw new Error('Post-spend victory did not use lifetime merit');
    await game.locator('#btn-claim-faction-salary').click(); await dismiss(); const paid = await data();
    if (paid.gold - promoted.gold !== 3500) throw new Error('Earned salary incorrect');
    await game.locator('#btn-claim-faction-salary').click(); await dismiss();
    if ((await data()).gold !== paid.gold) throw new Error('Salary repeated');
    await game.reload(); const loaded = await data();
    if (loaded.factionWar.totalMerit !== 600 || loaded.factionWar.merit !== 200 || loaded.factionWar.militaryRank !== 'centurion' || loaded.gold !== paid.gold) throw new Error('Reload lost military growth');
    if (errors.length) throw new Error(errors.join('; '));
    return { realBattles: 5, earnedMerit: 600, spentMerit: 400, spendableMerit: 200, rank: 'centurion', salary: 3500, salaryOnce: true, reloadPreserved: true, errors };
  } finally { await context.close(); }
}
