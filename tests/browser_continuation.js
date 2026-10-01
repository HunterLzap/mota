async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } });
  const game = await context.newPage(); const errors = [];
  game.on('pageerror', error => errors.push(error.message));
  const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  const dismiss = async () => {
    for (let i = 0; i < 8; i++) {
      if (!await game.evaluate(() => window.gameModal.isOpen)) { await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' }); return; }
      await game.locator('#game-modal-btn-confirm').click();
    }
    throw new Error('Modal did not settle');
  };
  const battle = async () => {
    await game.locator('#btn-skip-battle').click();
    if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Fixture lost');
    await game.locator('#btn-confirm-battle').click(); await dismiss();
  };
  const nav = async () => { await game.locator('#btn-auto-nav-quest').click(); };
  const claim = async (id, rewardGold) => {
    const before = await data();
    if (before.currentQuestId !== id || !before.questProgress[id]?.completed) throw new Error(id + ' lacks real completion');
    await game.locator('#btn-claim-quest-reward').click(); await dismiss(); const after = await data();
    if (!after.questProgress[id]?.claimed || after.gold - before.gold !== rewardGold) throw new Error(id + ' incorrect reward');
    const accepted = await game.evaluate(id => window.gameState.claimQuestReward(id), id);
    if (accepted || (await data()).gold !== after.gold) throw new Error(id + ' duplicate paid');
  };
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
    // Prepared old 20-chapter graduation, level and gear; no sequel action/record is injected.
    await game.evaluate(() => {
      const state = window.gameState; const d = state.data;
      d.level = 100; d.gold = 1000000; d.prestige = 100000; d.crystal = 10000;
      d.currentQuestId = 'completed'; d.questProgress.quest_20 = { current: 1, completed: true, claimed: true };
      d.royalTrials.completedStage = 6;
      d.equipped.weapon.stats = { atk: 1000000, hp: 10000000, def: 100000 };
      state.notify();
    });
    await game.reload();
    if ((await data()).currentQuestId !== 'quest_21' || (await data()).gold !== 1000000) throw new Error('Old graduate failed to resume or old reward repeated');
    await nav(); await game.locator('.btn-challenge-stronghold').first().click(); await battle(); await claim('quest_21', 80000);
    await nav(); await game.locator('#btn-enter-dungeon').click(); await dismiss();
    for (let i = 0; i < 10; i++) { await game.locator('#btn-dungeon-fight').click(); await battle(); }
    await claim('quest_22', 100000);
    await nav(); await game.locator('#btn-start-titan').click(); await dismiss();
    if ((await data()).questProgress.quest_23?.completed) throw new Error('Titan key falsely counted as a boss victory');
    await game.locator('#btn-challenge-castle-floor').click(); await battle(); await claim('quest_23', 120000);
    await nav(); await game.locator('#btn-challenge-trial').click(); await battle(); await claim('quest_24', 120000);
    await nav(); await game.locator('#btn-enter-dungeon').click(); await dismiss();
    for (let i = 0; i < 15; i++) { await game.locator('#btn-dungeon-fight').click(); await battle(); }
    await claim('quest_25', 150000);
    await nav();
    // The prior tower run must be collected before spending its next key.
    if (await game.locator('#btn-claim-castle-exit').count()) { await game.locator('#btn-claim-castle-exit').click(); await dismiss(); }
    await game.locator('#btn-start-platinum').click(); await dismiss();
    for (let floor = 90; floor <= 100; floor++) { await game.locator('#btn-challenge-castle-floor').click(); await battle(); }
    await claim('quest_26', 200000);
    const finished = await data();
    if (finished.currentQuestId !== 'completed' || !(await game.locator('#quest-tracker-mount').innerText()).includes('主线任务已全部达成')) throw new Error('Actual finale did not finish');
    await game.reload(); const loaded = await data();
    if (loaded.currentQuestId !== 'completed' || loaded.gold !== finished.gold || !loaded.castle.claimedBossRewards.includes(100)) throw new Error('Finale reopened or reward lost');
    if (errors.length) throw new Error(errors.join('; '));
    return { legacyGraduateResumed: true, sequelQuestsClaimed: [21,22,23,24,25,26], realBattles: 39, gateClears: loaded.dungeon.clearedGates,
      promotion: loaded.royalTrials.completedStage, towerBosses: loaded.castle.claimedBossRewards, questGold: 770000, duplicateRefused: true, reloadPreserved: true, errors,
      fixture: 'Level/equipment/old graduation prepared; all sequel victories, claims and routing use actual browser paths' };
  } catch (error) { await game.screenshot({ path: 'output/playwright/continuation-failure.png', fullPage: true }); throw error; }
  finally { await context.close(); }
}
