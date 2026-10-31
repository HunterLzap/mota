async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844}});
  const game=await context.newPage(),errors=[];game.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const dismiss=async()=>{for(let i=0;i<4&&await game.evaluate(()=>window.gameModal.isOpen);i++)await game.locator('#game-modal-btn-confirm').click();};
  try {
    await game.clock.install({time:new Date('2026-10-05T10:00:00+08:00')});
    await game.goto('http://127.0.0.1:8088');
    if(await game.locator('[data-class-id]').count()!==3||await game.locator('[data-nation-id]').count()!==3)throw new Error('Choice counts differ');
    await game.locator('#input-hero-name').fill('亚瑟·晨曦');await game.locator('[data-class-id="mage"]').click();
    const layout=await game.evaluate(()=>({width:innerWidth,bodyWidth:document.body.scrollWidth,display:getComputedStyle(document.querySelector('.char-class-card')).display}));
    if(layout.bodyWidth>layout.width||layout.display!=='flex')throw new Error('Offline styles failed');
    await game.screenshot({path:'output/playwright/story-creation-mobile.png'});
    await game.locator('#btn-confirm-character').click();await dismiss();
    await game.locator('#nav-tab-wild').click();
    const setup=await game.evaluate(()=>({since:window.gameState.data.lastIdleClaimTime,rates:window.gameState.getPatrolRates()}));
    const text=await game.locator('#tab-content-wild').innerText();if(!text.includes(setup.rates.crystalPerMin+' 魔晶/分'))throw new Error('Patrol rate preview differs');
    await game.clock.setFixedTime(new Date(setup.since+3600000));
    const before=await game.evaluate(()=>({gold:window.gameState.data.gold,crystal:window.gameState.data.crystal,reward:window.gameState.getIdleRewards()}));
    await game.locator('#btn-claim-idle').click();await dismiss();
    const earned=await game.evaluate(()=>({gold:window.gameState.data.gold,crystal:window.gameState.data.crystal}));
    if(earned.gold-before.gold!==before.reward.gold||earned.crystal-before.crystal!==before.reward.crystal)throw new Error('Patrol spending ledger differs');
    await game.locator('#btn-claim-idle').click();await dismiss();
    const repeated=await game.evaluate(()=>({gold:window.gameState.data.gold,crystal:window.gameState.data.crystal}));
    if(JSON.stringify(earned)!==JSON.stringify(repeated))throw new Error('Repeated idle reward');
    if(errors.length)throw new Error(errors.join(';'));
    return {externalNetworkBlocked:true,mobileCreation:true,patrolQuoteMatches:true,repeatedClaimRejected:true,virtualWaitingMinutes:60,layout,errors};
  } finally {await context.close();}
}
