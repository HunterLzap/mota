async (page) => {
  const results=[];
  for(const classId of ['warrior','mage','hunter']) {
    const context=await page.context().browser().newContext();const game=await context.newPage();const errors=[];
    game.on('pageerror',error=>errors.push(error.message));
    const dismiss=async()=>{for(let i=0;i<4&&await game.evaluate(()=>window.gameModal.isOpen);i++)await game.locator('#game-modal-btn-confirm').click();};
    const data=()=>game.evaluate(()=>JSON.parse(JSON.stringify(window.gameState.data)));
    const next=async()=>{
      while(true) {
        const action=await game.evaluate(async()=> (await import('/js/core/journey.js')).getJourneyGuidance(window.gameState.data)?.action);
        if(!['allocate_stats','feed_pet'].includes(action)) break;
        await game.locator('#btn-next-journey').click();
        await game.locator(action==='allocate_stats'?'#btn-recommended-stats':'#btn-feed-pet').click();await dismiss();
      }
      await game.locator('#btn-next-journey').click();await dismiss();
    };
    const fight=async()=>{await game.locator('#btn-skip-battle').click();if(!await game.evaluate(()=>window.appInstance.battleView.currentCombat.victory))throw new Error('Earned investigation defeat');await game.locator('#btn-confirm-battle').click();await dismiss();};
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.screenshot({path:`output/playwright/story-creation-${classId}.png`});
      // Restore an exact earned checkpoint, with no added stats or possessions.
      await game.evaluate(async classId=>{
        const {naturalJourney}=await import('/tests/natural_journey.mjs');let earned;
        naturalJourney(classId,406,(row,state)=>{if(row.chapter===10)earned=JSON.parse(JSON.stringify(state.data));},'ordinary');
        const {storage}=await import('/js/core/storage.js');storage.parseBackupText(JSON.stringify({saveData:earned}));storage.save(earned);
      },classId);
      await game.reload();
      for(const [eventId,action,count] of [['patrol_tracks','wild',4],['patrol_wolf','boss',1],['patrol_gate','dungeon',5],['patrol_convoy','wild',6]]) {
        await next();
        if(action==='dungeon') {await game.locator('#btn-enter-dungeon').click();await dismiss();}
        for(let i=0;i<count;i++) {
          if(action==='wild') await game.locator('.btn-fight-mob').last().click();
          else await game.locator(action==='boss'?'#btn-fight-wild-boss':'#btn-dungeon-fight').click();
          await fight();
        }
        const completed=await data();if(!completed.questProgress[eventId]?.completed)throw new Error('Investigation not completed: '+eventId);
        await game.evaluate(()=>{window.oldStoryClaim=document.getElementById('btn-next-journey').onclick;});
        await game.locator('#btn-next-journey').click();await dismiss();
        const claimed=await data();if(!claimed.questProgress[eventId]?.claimed||claimed.level<=completed.level)throw new Error('Story supply did not grow character');
        await game.evaluate(()=>window.oldStoryClaim());if(JSON.stringify(await data())!==JSON.stringify(claimed))throw new Error('Repeated story claim paid again');
        await game.reload();if(!(await data()).questProgress[eventId]?.claimed)throw new Error('Refresh lost investigation');
      }
      if(errors.length)throw new Error(errors.join(';'));
      results.push({classId,battles:16,level:(await data()).level,exactEarnedCheckpoint:true,allFourEpisodes:true,repeatedClaimRejected:true,reload:true,errors});
    } finally {await context.close();}
  }
  return {results};
}
