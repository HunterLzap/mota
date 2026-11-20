async (page) => {
  const results=[];
  for(const classId of ['warrior','mage','hunter']) {
    const context=await page.context().browser().newContext({viewport:{width:classId==='hunter'?390:1440,height:900}}),game=await context.newPage(),errors=[];
    game.on('pageerror',error=>errors.push(error.message));
    const data=()=>game.evaluate(()=>JSON.parse(JSON.stringify(window.gameState.data)));
    const dismiss=async()=>{for(let i=0;i<4&&await game.evaluate(()=>window.gameModal.isOpen);i++)await game.locator('#game-modal-btn-confirm').click();};
    const ready=async()=>{try{await game.waitForFunction(()=>Boolean(window.appInstance?.views?.bag));}catch(error){throw new Error(classId+' initialization: '+errors.join(';')+' '+error.message);}};
    const restore=async chapter=>{
      await game.evaluate(async({classId,chapter})=>{
        const {naturalJourney}=await import('/tests/natural_journey.mjs');let earned;
        naturalJourney(classId,407,(row,state)=>{if(row.chapter===chapter)earned=JSON.parse(JSON.stringify(state.data));},'inherit');
        const {storage}=await import('/js/core/storage.js');storage.parseBackupText(JSON.stringify({saveData:earned}));storage.save(earned);
      },{classId,chapter});await game.reload();await ready();
    };
    try {
      await game.goto('http://127.0.0.1:8088');await restore(8);
      await game.evaluate(()=>{window.appInstance.views.tower.subTab='castle';window.switchMainTab('tower');});
      await game.locator('#btn-start-redwood').click();await dismiss();
      for(let floor=1;floor<=10;floor++) {
        await game.locator('#btn-challenge-castle-floor').click();await game.locator('#btn-skip-battle').click();
        if(!await game.evaluate(()=>window.appInstance.battleView.currentCombat.victory))throw new Error('Natural tower defeat');
        await game.locator('#btn-confirm-battle').click();await dismiss();
      }
      await game.locator('#btn-claim-castle-exit').click();await dismiss();await game.locator('#btn-claim-quest-reward').click();await dismiss();
      await game.evaluate(()=>{window.appInstance.views.town.currentView='smithy_socket';window.switchMainTab('town');});
      if(await game.locator('#btn-punch-socket').count()) {
        const sockets=await game.evaluate(()=>window.gameState.data.equipped.weapon.sockets||0);
        if(!sockets){await game.locator('#btn-punch-socket').click();await dismiss();}
      }
      const gem= (await data()).bag.find(item=>item.id==='gem_atk');await game.locator(`[data-gem-uid="${gem.uid}"]`).click();await game.locator('.btn-inlay-gem').first().click();await dismiss();
      const before=await data(),source=before.equipped.weapon,target=before.bag.find(item=>item.id==='courage_sword');
      const quote=await game.evaluate(uid=>window.gameState.getUpgradeInheritanceQuote(uid),target.uid);if(!quote.success)throw new Error(quote.msg);
      await game.locator('#nav-tab-bag').click();await game.locator(`[data-bag-uid="${target.uid}"]`).click();await game.locator('[data-detail-tab="actions"]').click();await game.locator('#btn-bag-inherit-upgrade').click();await dismiss();
      const inherited=await data();if(inherited.equipped.weapon.uid!==target.uid||inherited.equipped.weapon.stars!==source.stars||inherited.gold!==before.gold-quote.gold)throw new Error('Inheritance ledger differs');
      await game.locator(`[data-bag-uid="${source.uid}"]`).click();await game.locator('.btn-bag-remove-gem').first().click();await dismiss();
      const extracted=await data();if(extracted.bag.find(item=>item.id==='gem_atk').count!==(before.bag.find(item=>item.id==='gem_atk')?.count||0)+1)throw new Error('Gem not recovered');
      await game.reload();await ready();if((await data()).equipped.weapon.stars!==source.stars)throw new Error('Refresh lost inherited upgrade');
      await restore(25);const trainingBefore=await data(),pet=trainingBefore.pets[0];
      await game.evaluate(petId=>{window.appInstance.views.pets.currentSubTab='overview';window.appInstance.views.pets.selectedPetId=petId;window.switchMainTab('pets');},pet.id);
      const trainingQuote=await game.evaluate(petId=>window.gameState.getCompanionTrainingQuote(petId),pet.id);if(!trainingQuote.success)throw new Error(trainingQuote.msg);
      await game.evaluate(()=>{window.appInstance.views.pets.detailSub='more';window.appInstance.views.pets.render();});
      await game.locator('#btn-train-companion').click();await dismiss();const trained=await data();
      if(trained.pets[0].level!==trainingQuote.targetLevel||trained.level!==trainingBefore.level||trained.gold!==trainingBefore.gold-trainingQuote.gold||JSON.stringify(trained.pets[0].skills)!==JSON.stringify(pet.skills))throw new Error('Training changed wrong progression');
      await game.reload();await ready();if((await data()).pets[0].level!==trainingQuote.targetLevel)throw new Error('Refresh lost trained level');
      await game.evaluate(()=>{window.appInstance.views.pets.currentSubTab='overview';window.switchMainTab('pets');});
      const contractBefore=await data(),choices=await game.evaluate(()=>window.gameState.getContractChoices()),choice=choices.find(choice=>choice.id==='light_spirit');if(!choice)throw new Error('Earned gold egg missing for a mana counter');
      await game.locator('#select-companion-contract').selectOption('light_spirit');await game.locator('#btn-chosen-contract').click();await dismiss();
      const contracted=await data();if(!contracted.pets.some(pet=>pet.id==='light_spirit'&&pet.level===1&&pet.tier==='gold')||contracted.gold!==contractBefore.gold-choice.gold||contracted.crystal!==contractBefore.crystal-choice.crystal)throw new Error('Chosen contract bypassed costs or tier');
      await game.evaluate(()=>{window.appInstance.views.pets.detailSub='more';window.appInstance.views.pets.render();});
      while(await game.evaluate(()=>window.gameState.getCompanionTrainingQuote('light_spirit').success)) {
        await game.locator('#btn-train-companion').click();await dismiss();
      }
      const counterTrained=await data();
      const counterTrainingCost={gold:contracted.gold-counterTrained.gold,crystal:contracted.crystal-counterTrained.crystal,food:contracted.bag.find(item=>item.id==='pet_food').count-counterTrained.bag.find(item=>item.id==='pet_food').count};
      await game.evaluate(petId=>{window.appInstance.views.pets.selectedPetId=petId;window.appInstance.views.pets.render();},pet.id);
      await game.evaluate(()=>{window.appInstance.views.pets.detailSub='more';window.appInstance.views.pets.render();});
      while(await game.evaluate(petId=>window.gameState.getCompanionTrainingQuote(petId).success,pet.id)) {
        await game.locator('#btn-train-companion').click();await dismiss();
      }
      await game.evaluate(()=>{window.appInstance.views.pets.selectedPetId='light_spirit';window.appInstance.views.pets.render();});
      await game.evaluate(()=>{window.appInstance.views.pets.detailSub='main';window.appInstance.views.pets.render();});
      await game.locator('#btn-toggle-active-pet').click();await dismiss();
      const comparison=await game.evaluate(async originalId=>{
        const {runCombat}=await import('/js/core/combat.js'),{getTowerFloorData}=await import('/js/config/towerLevels.js');const state=window.gameState,originalRandom=Math.random,active=state.data.activePetId;
        const results=[];
        try {
          for(const petId of [originalId,active]) {
            state.data.activePetId=petId;const stats=state.getEffectiveStats(),earned=JSON.parse(JSON.stringify(state.data));let casts=0,wins=0;
            for(let attempt=0;attempt<30;attempt++) {
              let seed=800+attempt;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
              const enemy=getTowerFloorData(100,2),result=runCombat(stats,enemy,JSON.parse(JSON.stringify(earned)),enemy);
              wins+=Number(result.victory);casts+=result.logs.filter(log=>enemy.abilities.some(ability=>log.message.includes('施展【'+ability.name+'】'))).length;
            }
            results.push({petId,level:earned.pets.find(pet=>pet.id===petId).level,samples:30,wins,enemyCasts:casts,rewardsGranted:false});
          }
        } finally {Math.random=originalRandom;state.data.activePetId=active;}
        return results;
      },pet.id);
      if(comparison[1].enemyCasts>=comparison[0].enemyCasts)throw new Error('Mana-burning companion did not counter actual final boss spells');
      await game.reload();await ready();if(!(await data()).pets.some(pet=>pet.id==='light_spirit'&&pet.level===trained.level))throw new Error('Refresh lost chosen trained companion');
      if(errors.length)throw new Error(errors.join(';'));
      results.push({classId,earnedCheckpoints:true,towerBattles:10,inheritanceQuote:quote,gemRecovered:true,trainingQuote,chosenContract:choice,counterTrainingCost,comparison,refresh:true,errors});
    }finally{await context.close();}
  }
  return {results};
}
