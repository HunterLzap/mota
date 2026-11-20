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
  const fight = async callbackKey => {
    await game.locator('#btn-dungeon-fight').click();
    if (callbackKey) await game.evaluate(key => { window[key] = window.appInstance.battleView.onFinishCallback; }, callbackKey);
    await game.locator('#btn-skip-battle').click();
    if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Fixture lost');
    await game.locator('#btn-confirm-battle').click(); await dismiss();
  };
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
    await dismiss();
    // Isolated level/equipment prerequisite only; all entries, retreat and six battles are actual UI paths.
    await game.evaluate(() => {
      const state = window.gameState; state.data.level = 20; state.data.currentQuestId = 'quest_13';
      state.grantBattleLoot({ id:'crystal_darkgold', name:'暗金晶石', count:3, uid:'owned_crystal_fixture' });
      state.data.equipped.weapon ??= { id:'fixture_weapon',uid:'fixture_weapon',name:'Fixture weapon',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:1,sockets:1,gems:[],stats:{atk:35} };
      state.data.equipped.weapon.stats = { atk: 100000, hp: 1000000, def: 10000 }; state.notify();
      window.appInstance.views.tower.subTab = 'dungeons'; window.appInstance.views.tower.selectedGateId = 'trial_gate'; window.switchMainTab('tower');
    });
    const initial = await data();
    await game.locator('#btn-enter-dungeon').click(); await dismiss();
    const oldId = (await data()).dungeon.expeditionId;
    await fight('oldDungeonCallback');
    await game.locator('#btn-dungeon-retreat').click(); await dismiss();
    await game.locator('#btn-enter-dungeon').click(); await dismiss();
    const reentered = await data();
    if (reentered.dungeon.expeditionId === oldId || reentered.dungeon.entriesLeft !== 3) throw new Error('Reentry identity/quota incorrect');
    await game.evaluate(() => window.oldDungeonCallback(true)); await dismiss();
    if (JSON.stringify(await data()) !== JSON.stringify(reentered)) throw new Error('Old callback rewarded new run');
    await fight(); const progressed = await data();
    await game.reload();
    if ((await data()).dungeon.activeGateFloor !== 2 || (await data()).dungeon.expeditionId !== progressed.dungeon.expeditionId) throw new Error('Reload lost expedition');
    await game.locator('#nav-tab-tower').click(); await game.locator('#btn-subtab-dungeons').click();
    for (let floor = 2; floor <= 5; floor++) await fight(floor === 5 ? 'finalDungeonCallback' : null);
    const finished = await data();
    if (finished.dungeon.activeGateId !== null || finished.dungeon.expeditionId !== null || finished.dungeon.clearedGates.trial_gate !== 1 || !finished.questProgress.quest_13.completed) throw new Error('Final clear/story did not settle');
    if (finished.bag.filter(item => item.id === 'crystal_darkgold').length !== 1 || finished.bag.find(item => item.id === 'crystal_darkgold').count !== initial.bag.find(item => item.id === 'crystal_darkgold').count + 2) throw new Error('Dungeon crystals not merged exactly');
    await game.evaluate(() => window.finalDungeonCallback(true)); await dismiss();
    if (JSON.stringify(await data()) !== JSON.stringify(finished)) throw new Error('Final callback duplicated rewards');
    await game.reload();
    const loaded = await data();
    if (loaded.dungeon.clearedGates.trial_gate !== 1 || loaded.dungeon.entriesLeft !== 3 || loaded.gold !== finished.gold) throw new Error('Reload lost settlement');
    if (errors.length) throw new Error(errors.join('; '));
    return { realBattles: 6, attemptsSpent: 2, retreatReentry: true, sameGateOldCallbackRefused: true, midrunReloadPreserved: true, clears: 1, crystalGain: 2, finalDuplicateRefused: true, questCompleted: true, reloadPreserved: true, errors };
  } finally { await context.close(); }
}
