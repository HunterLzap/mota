async (page) => {
  const rows = [];
  for (const [dragonId, previousQuest, targetQuest] of [['slay_red_dragon', 'quest_10', 'quest_11'], ['slay_silver_dragon', 'quest_18', 'quest_19'], ['slay_golden_dragon', null, null]]) {
    const context = await page.context().browser().newContext(); const game = await context.newPage(); const errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const dismiss = async () => { while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click(); };
    const go = async () => game.evaluate(() => { window.appInstance.views.town.currentView = 'dragons'; window.switchMainTab('town'); });
    const fight = async () => {
      await go(); await game.locator(`.btn-fight-dragon[data-dragon-id="${dragonId}"]`).click();
      await game.locator('#btn-skip-battle').click();
      if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Story fixture lost');
      await game.locator('#btn-confirm-battle').click();
    };
    try {
      await game.goto('http://127.0.0.1:8088'); await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
      // Isolated level/gear and preceding quest prerequisites; dragon victory and both quest claims use UI.
      const texts = await game.evaluate(async dragonId => {
        const { DRAGON_TRIALS } = await import('/js/config/dragonSlaying.js'); const dragon = DRAGON_TRIALS.find(d => d.id === dragonId);
        const state = window.gameState; state.data.level = 100; state.data.currentQuestId = 'quest_1';
        state.data.equipped.weapon ??= { id:'fixture_weapon',uid:'fixture_weapon',name:'Fixture weapon',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:1,sockets:1,gems:[],stats:{atk:35} };
      state.data.equipped.weapon.stats = { atk: 1000000, hp: 1000000 }; state.notify();
        return { first: dragon.firstVictoryStory, repeat: dragon.repeatVictoryText };
      }, dragonId);
      await fight();
      if (!(await game.locator('#game-modal-overlay').innerText()).includes(texts.first)) throw new Error('First victory story missing from modal');
      await dismiss(); const first = await data();
      if (first.dragon.cleared[dragonId] !== 1) throw new Error('Victory ledger missing');
      if (targetQuest) {
        await game.evaluate(questId => { const state = window.gameState; state.data.currentQuestId = questId; state.data.questProgress[questId] = { current: 1, completed: true, claimed: false }; state.notify(); }, previousQuest);
        await game.locator('#btn-claim-quest-reward').click(); await dismiss();
        const reached = await data();
        if (reached.currentQuestId !== targetQuest || !reached.questProgress[targetQuest].completed || reached.questProgress[targetQuest].claimed || reached.dragon.trialsLeft !== first.dragon.trialsLeft) throw new Error('Later quest did not recognize earlier dragon');
        await game.reload(); const loaded = await data();
        if (!loaded.questProgress[targetQuest].completed || loaded.gold !== reached.gold || loaded.dragon.trialsLeft !== reached.dragon.trialsLeft) throw new Error('Reload changed quest reward/quota');
        await game.locator('#btn-claim-quest-reward').click(); await dismiss(); const paid = await data();
        const questGold = await game.evaluate(async id => (await import('/js/config/quests.js')).QUEST_LIST.find(q => q.id === id).rewards.gold, targetQuest);
        if (paid.gold - loaded.gold !== questGold || paid.dragon.trialsLeft !== loaded.dragon.trialsLeft || !paid.questProgress[targetQuest].claimed) throw new Error('Later quest payout wrong');
        const duplicate = await game.evaluate(id => window.gameState.claimQuestReward(id), targetQuest);
        if (duplicate || (await data()).gold !== paid.gold) throw new Error('Quest paid twice');
      }
      await game.reload(); await fight();
      const repeatedText = await game.locator('#game-modal-overlay').innerText();
      if (!repeatedText.includes(texts.repeat) || repeatedText.includes(texts.first)) throw new Error('Repeat modal repeated first-story exposition');
      await dismiss(); const repeated = await data();
      if (repeated.dragon.cleared[dragonId] !== 2 || repeated.dragon.trialsLeft !== 1) throw new Error('Repeat battle ledger/quota incorrect');
      await game.reload(); const final = await data();
      if (final.dragon.cleared[dragonId] !== 2 || (targetQuest && !final.questProgress[targetQuest].claimed)) throw new Error('Final reload lost story/claim');
      if (errors.length) throw new Error(errors.join('; '));
      rows.push({dragonId,targetQuest,realWins:2,firstStoryShown:true,repeatStoryConcise:true,historicalQuestRecognized:Boolean(targetQuest),questPaidOnce:Boolean(targetQuest),attemptsSpent:2,reloadPreserved:true,errors});
    } finally { await context.close(); }
  }
  return {rows,fixture:'Prepared level/gear and preceding quest prerequisites; actual dragon wins, story modals and quest UI claims'};
}
