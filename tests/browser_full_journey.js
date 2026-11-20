async (page) => {
  const results = [];
  for (const [classId,width] of [['warrior',1440],['mage',1440],['hunter',1280]]) {
    const context = await page.context().browser().newContext({viewport:{width,height:900}});
    const game = await context.newPage(); const errors=[]; game.on('pageerror', e=>errors.push(e.message));
    let timingChecks = 0;
    const assertTimingDisplay = async () => {
      const timing = await game.evaluate(() => {
        const combat = window.appInstance.battleView.currentCombat;
        return { duration: combat.duration, actions: combat.actionCounts,
          displayed: Object.fromEntries(['player','enemy'].map(side => [side, Number(document.getElementById(`b-${side}-actions`).textContent)])),
          intervals: ['player','enemy'].map(side => Number(document.getElementById(`b-${side}-interval`).textContent)),
          status: document.getElementById('battle-live-status').textContent };
      });
      if (!timing.status.includes(timing.duration.toFixed(1)) || timing.duration > 300 || !timing.intervals.every(value => value >= 0.5 && value <= 14)) throw new Error('Battle timing display incorrect');
      for (const side of ['player','enemy']) if(timing.actions[side] !== timing.displayed[side]) throw new Error('Action count disagrees with resolved battle');
      timingChecks++;
    };
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
        await assertTimingDisplay();
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
      const route = await game.evaluate(async (classId) => {
        const { naturalJourney } = await import('/tests/natural_journey.mjs');
        const { storage } = await import('/js/core/storage.js');
        const { gameState, GameState } = await import('/js/core/state.js');
        const { getJourneyGuidance } = await import('/js/core/journey.js');
        const report = naturalJourney(classId, 406, (row, state) => {
          storage.parseBackupText(JSON.stringify({ saveData: state.data }));
          storage.save(state.data);
          const loaded = new GameState(); loaded.loadOrInit();
          for (const key of ['level','gold','crystal','prestige','currentQuestId','classId']) {
            if (loaded.data[key] !== state.data[key]) throw new Error('Chapter reload lost ' + key);
          }
          if (JSON.stringify(loaded.data.pets) !== JSON.stringify(state.data.pets)) throw new Error('Chapter reload changed companions');
          if (state.data.currentQuestId !== 'completed' && !getJourneyGuidance(state.data)) throw new Error('Missing chapter instruction');
        }, 'mixed', gameState);
        storage.save(gameState.data); gameState.notify();
        return report;
      }, classId);
      if(route.final.quest !== 'completed' || route.final.tower !== 100) throw new Error('Incomplete natural continuation');
      await game.clock.install({time:new Date('2026-10-06T00:01:00+08:00')});
      // Re-enter with an actually earned spare key and fight the final corridor
      // through real page controls. No stats or possessions are injected.
      await game.evaluate(() => { window.appInstance.views.tower.subTab = 'castle'; window.switchMainTab('tower'); });
      await game.locator('#btn-start-platinum').click(); await dismiss();
      for (let floor = 90; floor <= 100; floor++) {
        await game.locator('#btn-challenge-castle-floor').click();
        await game.locator('#btn-skip-battle').click();
        await assertTimingDisplay();
        if(!await game.evaluate(()=>window.appInstance.battleView.currentCombat.victory)) throw new Error('Earned final corridor defeated at '+floor);
        await game.locator('#btn-confirm-battle').click(); await dismiss();
      }
      await game.locator('#btn-claim-castle-exit').click(); await dismiss();
      if((await data()).castle.isExploring) throw new Error('Final earned bank not withdrawn');
      await game.evaluate(()=>{window.appInstance.views.pets.currentSubTab='skills';window.switchMainTab('pets');});
      const beforeBooks=await data();
      await game.locator('.btn-return-pet-book[data-learned-id="book_crit"]').click(); await dismiss();
      const returned=await data();
      if(returned.pets.find(p=>p.id===returned.activePetId).skills.includes('book_crit')||returned.bag.find(i=>i.id==='book_crit')?.count!==1)throw new Error('Real book return failed');
      await game.locator('.btn-learn-skill[data-book-id="book_crit"]').click();await dismiss();
      const relearned=await data();
      if(!relearned.pets.find(p=>p.id===relearned.activePetId).skills.includes('book_crit')||relearned.bag.some(i=>i.id==='book_crit'))throw new Error('Real book relearning duplicated inventory');
      const quote=await game.evaluate(()=>window.gameState.getRepairQuote());
      const repairGold=(await data()).gold;
      await game.evaluate(()=>{window.appInstance.views.town.currentView='smithy_repair';window.switchMainTab('town');});
      if(!await game.locator('#tab-content-town').getByText(String(quote.cost),{exact:true}).count())throw new Error('Displayed repair quote disagrees');
      await game.locator('#btn-repair-all').click();await dismiss();
      if(repairGold-(await data()).gold!==quote.cost)throw new Error('Repair spending disagrees with displayed quote');
      const finalBefore=await data();await game.reload();const finalLoaded=await data();
      if(finalLoaded.currentQuestId!=='completed'||finalLoaded.gold!==finalBefore.gold||finalLoaded.pets.length!==finalBefore.pets.length||finalLoaded.castle.maxReachedFloor!==100)throw new Error('Final refresh lost earned result');
      if(errors.length) throw new Error(errors.join(';'));
      results.push({classId,width,route,actualFinalCorridorBattles:11,timingChecks,bookReturnAndRelearn:true,repairQuoteAndSpending:quote.cost,finalRefresh:true,errors});
    } finally {await context.close();}
  }
  return {results};
}


