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
  const fight = async (victory, capture = false) => {
    await game.locator('#btn-challenge-castle-floor').click();
    if (capture) await game.evaluate(() => { window.oldCastleCallback = window.appInstance.battleView.onFinishCallback; });
    await game.locator('#btn-skip-battle').click();
    if (await game.evaluate(() => window.appInstance.battleView.currentCombat.victory) !== victory) throw new Error('Unexpected fixture battle result');
    await game.locator('#btn-confirm-battle').click(); await dismiss();
  };
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
    await dismiss();
    // Isolated earned-resource/strong-equipment prerequisites; entries, battles, bank and exits use actual UI.
    await game.evaluate(() => {
      const state = window.gameState; state.data.level = 100; state.data.currentQuestId = 'completed';
      for (let chapter = 1; chapter <= 26; chapter++) state.data.questProgress['quest_' + chapter] = { current: 1, completed: true, claimed: true };
      state.data.bag = [{ id: 'key_redwood', name: '红木钥匙', count: 2 }, { id: 'key_platinum', name: '白金钥匙', count: 1 }];
      state.data.equipped.weapon ??= { id:'fixture_weapon',uid:'fixture_weapon',name:'Fixture weapon',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:1,sockets:1,gems:[],stats:{atk:35} };
      state.data.equipped.weapon.stats = { atk: 100000, hp: 1000000, def: 10000 }; state.notify();
    });
    await game.locator('#nav-tab-tower').click();
    await game.locator('#btn-start-redwood').click(); await dismiss(); const first = await data();
    await fight(true, true); const banked = await data();
    if (banked.gold !== first.gold || banked.exp !== first.exp || banked.castle.accumulatedGold <= 0 || banked.castle.accumulatedExp <= 0) throw new Error('Victory bypassed bank');
    const refused = await game.evaluate(() => window.gameState.startCastleExpedition('key_redwood'));
    if (refused.success || JSON.stringify(await data()) !== JSON.stringify(banked)) throw new Error('Repeat entry changed bank/key/quota');
    await game.evaluate(() => { window.oldCastleWithdrawal = document.getElementById('btn-claim-castle-exit'); });
    await game.locator('#btn-claim-castle-exit').click(); await dismiss(); const paid = await data();
    if (paid.gold - first.gold !== banked.castle.accumulatedGold || paid.exp - first.exp !== banked.castle.accumulatedExp) throw new Error('Full withdrawal wrong');
    await game.locator('#btn-start-redwood').click(); await dismiss(); const reentered = await data();
    if (reentered.castle.expeditionId === first.castle.expeditionId || reentered.castle.entriesLeft !== 1) throw new Error('Identity/quota not renewed');
    await game.evaluate(() => { window.oldCastleCallback(true); window.oldCastleCallback(false); }); await dismiss();
    if (JSON.stringify(await data()) !== JSON.stringify(reentered)) throw new Error('Old same-floor callback changed new run');
    await fight(true); const secondBank = await data();
    await game.evaluate(() => window.oldCastleWithdrawal.click()); await dismiss();
    if (JSON.stringify(await data()) !== JSON.stringify(secondBank)) throw new Error('Old withdrawal button paid the new bank');
    await game.reload();
    const loadedBank = await data();
    if (loadedBank.castle.expeditionId !== secondBank.castle.expeditionId || loadedBank.castle.accumulatedGold !== secondBank.castle.accumulatedGold || loadedBank.castle.floor !== 2) throw new Error('Reload lost bank/identity/floor');
    await game.locator('#nav-tab-tower').click(); await game.locator('#btn-claim-castle-exit').click(); await dismiss();
    const secondPaid = await data();
    const duplicate = await game.evaluate(id => window.gameState.finishCastleExpedition(id), secondBank.castle.expeditionId);
    if (duplicate.success || JSON.stringify(await data()) !== JSON.stringify(secondPaid)) throw new Error('Duplicate withdrawal paid');
    await game.locator('#btn-start-platinum').click(); await dismiss(); await fight(true); const thirdBank = await data();
    // Unequipped character fixture drives a real loss at the actual next floor, including castle revival.
    await game.evaluate(() => {
      const state = window.gameState;
      state.data.equipped = {}; state.notify();
    });
    const beforeLoss = await data(); await fight(false); const lost = await data();
    if (lost.gold !== beforeLoss.gold || lost.castle.isExploring || lost.castle.expeditionId !== null || lost.castle.accumulatedGold !== 0 || lost.castle.accumulatedExp !== 0) throw new Error('Defeat retained gold/bank/exploration');
    if (lost.exp - beforeLoss.exp !== Math.floor(thirdBank.castle.accumulatedExp / 2)) throw new Error('Defeat did not pay half experience');
    if (!lost.castle.claimedBossRewards.includes(90) || lost.crystal !== beforeLoss.crystal || lost.bag.length !== beforeLoss.bag.length) throw new Error('Defeat erased immediate first-clear rewards');
    await game.reload(); const loaded = await data();
    if (loaded.gold !== lost.gold || loaded.exp !== lost.exp || loaded.castle.entriesLeft !== 0 || loaded.castle.isExploring) throw new Error('Reload lost exit');
    if (errors.length) throw new Error(errors.join('; '));
    return { realBattles: 4, attemptsSpent: 3, activeEntryRefused: true, oldSameFloorVictoryAndDefeatRefused: true, bankReloadPreserved: true, duplicateWithdrawalRefused: true, fullGold: banked.castle.accumulatedGold, halfExp: Math.floor(thirdBank.castle.accumulatedExp / 2), defeatReloadPreserved: true, errors };
  } finally { await context.close(); }
}
