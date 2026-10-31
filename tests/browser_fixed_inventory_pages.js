async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:1398,height:436}}),game=await context.newPage(),errors=[];
  game.on('pageerror',error=>errors.push(error.message));
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.evaluate(async()=>{
      const {naturalJourney}=await import('/tests/natural_journey.mjs');let earned;
      naturalJourney('mage',407,(row,state)=>{if(row.chapter===25)earned=JSON.parse(JSON.stringify(state.data));},'inherit');
      const {storage}=await import('/js/core/storage.js');storage.save(earned);
    });
    await game.reload();await game.waitForFunction(()=>Boolean(window.appInstance?.views?.bag));
    await game.locator('#nav-tab-bag').click();
    const before=await game.evaluate(()=>JSON.stringify(window.gameState.data)),seen=[];
    let pages=0;
    while(true) {
      const cells=await game.locator('.bag-slot-cell').evaluateAll(elements=>elements.map(element=>{
        const box=element.getBoundingClientRect(),hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
        if(!element.contains(hit))throw new Error('Inventory cell is clipped');return element.dataset.bagUid;
      }));
      seen.push(...cells);pages++;
      if(await game.locator('#btn-bag-page-next').isDisabled())break;
      await game.locator('#btn-bag-page-next').click();
    }
    const owned=await game.evaluate(()=>window.gameState.data.bag.map(item=>item.uid||item.id));
    if(pages<2||JSON.stringify([...seen].sort())!==JSON.stringify([...owned].sort())||new Set(seen).size!==seen.length)throw new Error('Pagination loses or repeats actual earned items');
    await game.setViewportSize({width:1437,height:713});await game.waitForTimeout(200);
    await game.locator('[data-filter="equip"]').click();
    if(await game.locator('.bag-slot-cell').count()===0)throw new Error('Filtering retained an inaccessible page');
    const root=game.locator('#tab-content-bag');await root.hover();await game.mouse.wheel(0,3000);await game.waitForTimeout(100);
    if(await root.evaluate(element=>element.scrollTop)!==0)throw new Error('Inventory still scrolls');
    if(await game.evaluate(()=>JSON.stringify(window.gameState.data))!==before||errors.length)throw new Error('UI pagination changed resources or generated errors');
    await game.screenshot({path:'output/playwright/fixed-bag-desktop.png'});
    return {earnedCheckpoint:25,pages,items:seen.length,allItemsReachable:true,noScroll:true,resourcesUnchanged:true,errors};
  }finally{await context.close();}
}
