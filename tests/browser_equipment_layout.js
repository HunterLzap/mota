async (page) => {
  const results=[];
  for(const [width,height] of [[1437,713],[1398,436],[1024,600],[390,844]]) {
    const context=await page.context().browser().newContext({viewport:{width,height}}),game=await context.newPage(),errors=[];
    game.on('pageerror',error=>errors.push(error.message));
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="mage"]').click();await game.locator('#btn-confirm-character').click();
      for(let i=0;i<4&&await game.evaluate(()=>window.gameModal.isOpen);i++)await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#btn-next-journey').click();
      const earned=await game.evaluate(()=>({bag:JSON.parse(JSON.stringify(window.gameState.data.bag)),gold:window.gameState.data.gold}));
      const scrollToControl=async(selector,tab)=>{
        const scrollBefore=await game.locator('#tab-content-'+tab).evaluate(element=>element.scrollTop);
        const area=await game.locator('#tab-content-'+tab).boundingBox();
        await game.mouse.move(area.x+area.width/2,area.y+Math.min(40,area.height/2));await game.mouse.wheel(0,3000);
        await game.waitForTimeout(150);
        if(await game.locator('#tab-content-'+tab).evaluate(element=>element.scrollTop)!==scrollBefore)throw new Error('Workbench must not scroll');
        const reachable=await game.locator(selector).evaluate(element=>{
          const box=element.getBoundingClientRect(),main=document.querySelector('main').getBoundingClientRect();
          const hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
          return box.top>=main.top&&box.bottom<=main.bottom&&element.contains(hit);
        });
        if(!reachable){await game.screenshot({path:`output/playwright/fixed-layout-failure-${width}.png`});throw new Error(`${width}x${height}: ${selector} clipped: `+JSON.stringify(await game.locator(selector).evaluate(element=>({button:element.getBoundingClientRect().toJSON(),main:document.querySelector('main').getBoundingClientRect().toJSON(),tab:document.querySelector('#tab-content-bag').getBoundingClientRect().toJSON()}))));}
      };
      for(const item of earned.bag) {
        await game.locator('#nav-tab-bag').click();
        await game.locator(`[data-bag-uid="${item.uid}"]`).click();
        await game.evaluate(() => document.getElementById('btn-bag-equip-item')?.click());
        if(!await game.evaluate(uid=>Object.values(window.gameState.data.equipped).some(item=>item?.uid===uid),item.uid))throw new Error('Equipment was not worn');
      }
      await scrollToControl('#btn-goto-bag-from-equip','equip');
      await game.screenshot({path:`output/playwright/equipment-layout-${width}-${height}.png`});
      await game.reload();await game.waitForFunction(()=>Boolean(window.gameState?.data.hasChosenClass));
      const persisted=await game.evaluate(()=>({worn:Object.values(window.gameState.data.equipped).filter(Boolean).length,gold:window.gameState.data.gold}));
      if(persisted.worn!==2||persisted.gold!==earned.gold||errors.length)throw new Error('Save or browser error: '+errors.join(';'));
      results.push({width,height,worn:persisted.worn,fixedWorkbench:true,refresh:true,errors});
    }finally{await context.close();}
  }
  return results;
}
