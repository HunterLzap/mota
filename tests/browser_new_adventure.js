async (page) => {
  const results = [];
  for (const [classId,width] of [['warrior',1440],['mage',1440],['hunter',390]]) {
    const context = await page.context().browser().newContext({viewport:{width,height:900}});
    const game = await context.newPage(); const errors=[]; game.on('pageerror', e=>errors.push(e.message));
    const data = () => game.evaluate(async()=>JSON.parse(JSON.stringify((await import('/js/core/state.js')).gameState.data)));
    const dismiss = async () => { for(let i=0;i<4 && await game.evaluate(() => window.gameModal.isOpen);i++) await game.locator('#game-modal-btn-confirm').click(); };
    const next = async () => {
      while(await game.evaluate(async()=> (await import('/js/core/journey.js')).getJourneyGuidance(window.gameState.data)?.action==='allocate_stats')) {
        await game.locator('#btn-next-journey').click();await game.locator('#btn-recommended-stats').click();
      }
      await game.locator('#btn-next-journey').click();await dismiss();
    };
    try {
      await game.goto('http://127.0.0.1:8088'); await game.locator(`[data-class-id="${classId}"]`).click(); await game.locator('#btn-confirm-character').click();
      const initial=await data();
      if(initial.bag.length || initial.pets.length || Object.values(initial.equipped).some(Boolean) || initial.gold || initial.crystal || initial.prestige || initial.slaves.list.length || Object.values(initial.estate.herbs).some(Boolean)) throw new Error('New save preloaded possessions');
      await dismiss();
      let state=await data(); const weapon=state.bag.find(i=>i.id==='novice_weapon');
      if(state.currentQuestId!=='quest_2' || weapon.reqClass!==classId || initial.onboardingVersion!==2) throw new Error('Incorrect opening commission');
      for(const id of ['novice_weapon','novice_armor']) {
        state=await data(); const gear=state.bag.find(i=>i.id===id);
        await game.locator('#nav-tab-bag').click(); await game.locator(`[data-bag-uid="${gear.uid}"]`).click(); await game.evaluate(() => document.getElementById('btn-bag-equip-item')?.click()); await dismiss();
      }
      const fight = async () => {
        await game.locator('#btn-skip-battle').click();
        if(!await game.evaluate(()=>window.appInstance.battleView.currentCombat.victory)) throw new Error('Natural early defeat');
        await game.locator('#btn-confirm-battle').click();await dismiss();
      };
      const claim = async () => {await game.locator('#btn-claim-quest-reward').click();await dismiss();};
      await next();await game.locator('.btn-fight-mob').first().click();await fight();await claim();
      if((await data()).currentQuestId!=='quest_3') throw new Error('First investigation did not advance');
      // The guide asks for real earned potential before the first forge lesson.
      await next(); await game.locator('#btn-do-enhance').click(); await dismiss();await claim();
      state=await data(); if(state.currentQuestId!=='quest_4' || state.pets.length || !state.bag.some(i=>i.type==='egg')) throw new Error('Pet acquisition order failed');
      await next(); await game.locator('#btn-hatch-egg').click(); await dismiss();
      await game.locator('#btn-toggle-active-pet').click(); await dismiss();await claim();
      await next(); await game.locator('.btn-learn-skill[data-book-id="book_crit"]').click(); await dismiss();await claim();
      state=await data(); if(state.currentQuestId!=='quest_6' || !state.bag.some(i=>i.id==='key_redwood') || state.estate.herbs.herb_dragonblood!==8) throw new Error('Tower or alchemy prerequisite missing');
      await next(); await game.locator('#btn-start-redwood').click(); await dismiss(); await game.locator('#btn-challenge-castle-floor').click();await fight();await claim();
      state=await data(); if(state.currentQuestId!=='quest_7') throw new Error('Natural first tower fight failed');
      await next();await game.locator('#btn-claim-castle-exit').click();await dismiss();
      await next(); await game.locator('.btn-brew-potion').first().click(); await dismiss();await claim();
      state=await data(); if(state.currentQuestId!=='quest_8' || !state.estate.activePotions.length) throw new Error('Earned herbs unusable');
      const before=JSON.stringify(state); await game.reload(); const loaded=await data();
      if(loaded.currentQuestId!=='quest_8' || loaded.equipped.weapon.reqClass!==classId || loaded.bag.length!==state.bag.length || loaded.gold!==state.gold) throw new Error('Reload lost earned progress');
      if(errors.length) throw new Error(errors.join(';'));
      results.push({classId,width,initialInventory:initial.bag.length,weapon:weapon.name,level:state.level,quest:state.currentQuestId,earnedPet:state.activePetId,naturalTowerWin:true,earnedHerbsUsed:true,reload:true,errors});
    } finally {await context.close();}
  }
  return {results};
}
