async (page) => {
  const results=[];
  for(const width of [1440,390]) {
    const context=await page.context().browser().newContext({viewport:{width,height:900}}),game=await context.newPage(),errors=[];
    game.on('pageerror',error=>errors.push(error.message));
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.evaluate(async()=>{
        const {naturalJourney}=await import('/tests/natural_journey.mjs');let earned;
        naturalJourney('hunter',407,(row,state)=>{if(row.chapter===25)earned=JSON.parse(JSON.stringify(state.data));},'inherit');
        const {storage}=await import('/js/core/storage.js');storage.save(earned);
      });
      await game.reload();await game.waitForFunction(()=>Boolean(window.appInstance?.views?.pets));
      await game.evaluate(()=>{window.appInstance.views.pets.selectedPetId=window.gameState.data.pets[0].id;window.switchMainTab('pets');});
      await game.evaluate(()=>{window.appInstance.views.pets.detailSub='more';window.appInstance.views.pets.render();});
      for(const selector of ['#select-companion-contract','#btn-chosen-contract','#btn-train-companion']) {
        await game.locator(selector).scrollIntoViewIfNeeded();
        const box=await game.locator(selector).boundingBox();
        if(!box||box.x<0||box.x+box.width>width+1)throw new Error(selector+' overflows '+width+' viewport');
      }
      await game.screenshot({path:'output/playwright/companion-layout-'+width+'.png',fullPage:true});
      if(errors.length)throw new Error(errors.join(';'));
      results.push({width,contractAndTrainingReachable:true,errors});
    }finally{await context.close();}
  }
  return results;
}
