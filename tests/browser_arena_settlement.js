async (page) => {
  const context = await page.context().browser().newContext();
  const game = await context.newPage(), errors=[];
  game.on('pageerror',error=>errors.push(error.message));
  const data=()=>game.evaluate(()=>JSON.parse(JSON.stringify(window.gameState.data)));
  const dismiss=async()=>{for(let i=0;i<4&&await game.evaluate(()=>window.gameModal.isOpen);i++)await game.locator('#game-modal-btn-confirm').click();};
  const go=()=>game.evaluate(()=>{window.appInstance.views.town.currentView='palace_arena';window.switchMainTab('town');});
  const enter=async()=>{await game.locator('.btn-challenge-arena-opp[data-opp-id="opp_1"]').click();await game.evaluate(()=>{window.oldArenaCallback=window.appInstance.battleView.onFinishCallback;window.oldArenaIdentity=window.gameState.data.arena.activeChallenge;});};
  const finish=async(victory)=>{await game.locator('#btn-skip-battle').click();if(await game.evaluate(()=>window.appInstance.battleView.currentCombat.victory)!==victory)throw new Error('Unexpected arena result');await game.locator('#btn-confirm-battle').click();await dismiss();};
  try {
    await game.clock.install({time:new Date('2026-10-05T23:50:00+08:00')});
    await game.goto('http://127.0.0.1:8088');await game.locator('[data-class-id="warrior"]').click();await game.locator('#btn-confirm-character').click();
    await game.locator('#game-modal-btn-cancel').click();
    // Explicit empty combat fixture for defeat; no balance conclusion.
    await game.evaluate(()=>{window.gameState.data.onboardingVersion=0;window.gameState.data.currentQuestId='completed';window.gameState.notify();});
    await go();let before=await data();await enter();await finish(false);let lost=await data();
    if(lost.gold-before.gold!==200||lost.prestige-before.prestige!==10||lost.arena.points!==1000||lost.arena.challengesLeft!==4)throw new Error('Defeat ledger incorrect');
    await game.evaluate(()=>{window.oldArenaCallback(true);window.oldArenaCallback(false);});
    if(JSON.stringify(await data())!==JSON.stringify(lost))throw new Error('Duplicate loss callback rewarded');
    // Explicit strong fixture exercises actual victory and settlement controls.
    await game.evaluate(()=>{window.gameState.data.equipped.weapon={id:'arena_fixture',uid:'arena_fixture',name:'Arena fixture',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:0,gems:[],stats:{atk:100000,maxHp:100000}};window.gameState.notify();});
    await go();before=await data();await enter();
    await game.evaluate(()=>{const id=window.oldArenaIdentity;const state=window.gameState;const before=JSON.stringify(state.data);if(state.settleArenaChallenge('opp_2',id.challengeId,true).success||JSON.stringify(state.data)!==before)throw new Error('Cross opponent accepted');if(state.startArenaChallenge('opp_1').success)throw new Error('Duplicate entry accepted');});
    await finish(true);const won=await data();
    if(won.gold-before.gold!==800||won.prestige-before.prestige!==60||won.arena.points!==1025||won.arena.challengesLeft!==3)throw new Error('Victory ledger incorrect');
    await game.evaluate(()=>{window.oldArenaCallback(true);window.oldArenaCallback(false);});
    if(JSON.stringify(await data())!==JSON.stringify(won))throw new Error('Duplicate victory callback rewarded');
    await game.evaluate(async()=>{const{storage}=await import('/js/core/storage.js');const state=window.gameState;const parsed=storage.parseBackupText(JSON.stringify({saveData:state.data}));if(parsed.arena.points!==1025)throw new Error('Valid arena backup refused');for(const arena of [{...state.data.arena,points:999},{...state.data.arena,challengesLeft:6},{...state.data.arena,activeChallenge:{opponentId:'opp_1',challengeId:''}}]){let rejected=false;try{storage.parseBackupText(JSON.stringify({saveData:{...state.data,arena}}));}catch{rejected=true;}if(!rejected)throw new Error('Malformed arena backup accepted');}});
    await go();await enter();const pending=await data();await game.reload();let loaded=await data();
    if(loaded.arena.activeChallenge!==null||loaded.arena.challengesLeft!==2||loaded.gold!==pending.gold)throw new Error('Refresh refunded or rewarded pending challenge');
    await go();await enter();
    await game.evaluate(()=>{const id=window.oldArenaIdentity;window.staleIdentity=id;window.gameState.settleArenaChallenge('opp_1',id.challengeId,true);});
    await finish(true); // stale callback from the UI must add no second reward
    await go();await enter();await finish(true);
    if((await data()).arena.challengesLeft!==0)throw new Error('Five attempts not consumed');
    await game.reload();await go();
    if(await game.evaluate(()=>window.gameState.startArenaChallenge('opp_1').success))throw new Error('Exhausted quota bypassed');
    await game.clock.setFixedTime(new Date('2026-10-06T00:01:00+08:00'));
    await game.reload();loaded=await data();
    if(loaded.arena.challengesLeft!==5)throw new Error('Next day quota not restored');
    await go();await enter();const midnight=await data();
    await game.clock.setFixedTime(new Date('2026-10-07T00:01:00+08:00'));
    await game.evaluate(()=>{const state=window.gameState,beforeGold=state.data.gold,id=window.oldArenaIdentity;if(state.settleArenaChallenge('opp_1',id.challengeId,true).success||state.data.gold!==beforeGold||state.data.arena.challengesLeft!==5)throw new Error('Expired cross-day callback settled');});
    await finish(true);await game.reload();loaded=await data();
    if(loaded.gold!==midnight.gold||loaded.arena.challengesLeft!==5)throw new Error('Expired reward persisted');
    if(errors.length)throw new Error(errors.join(';'));
    return{actualBattles:6,win:true,loss:true,repeatRejected:true,refreshPaid:true,quota:true,crossDayExpired:true,backups:true,errors};
  }finally{await context.close();}
}
