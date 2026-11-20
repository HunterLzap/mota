async (page) => {
 const rows=[]; const check=(ok,msg)=>{if(!ok)throw new Error(msg);};
 for(const viewport of [{width:1280,height:900},{width:1440,height:1000}]){
  const context=await page.context().browser().newContext({viewport}); const game=await context.newPage(); const errors=[],requests=[];
  game.on('pageerror',e=>errors.push(e.message));game.on('requestfailed',r=>requests.push(r.url()));game.on('response',r=>{if(r.status()>=400)requests.push(r.url());});
  try{
   await game.goto('http://127.0.0.1:8088');await game.locator('[data-class-id="hunter"]').click();await game.locator('#btn-confirm-character').click();
   for(let i=0;i<6&&await game.evaluate(()=>window.gameModal.isOpen);i++)await game.locator('#game-modal-btn-confirm').click();
   for(const mode of ['full','empty']){
    await game.evaluate(async mode=>{
     const {PET_CONFIGS}=await import('/js/config/pets.js');const {MAPS}=await import('/js/config/maps.js');const s=window.gameState;
     s.data.level=45;
     s.data.pets=mode==='full'?['golden_dragon','naga','white_angel'].map((id,i)=>({id,level:35+i,stamina:[100,79,80][i],tier:'gold',apt:{...PET_CONFIGS[id].defaultApt},skills:[]})):[];
     s.data.activePetId=mode==='full'?'golden_dragon':null;s.data.supportPetIds=mode==='full'?['naga','white_angel']:[];s.data.estate.hiredMercId=mode==='full'?'merc_paladin':null;s.notify();
     window.appInstance.battleView.start({enemyData:{name:'丛林灰狼',portraitKey:MAPS[0].monsters[0].icon},enemyStats:{hp:10000,maxHp:10000,atk:50,def:70,speed:35}});
     clearTimeout(window.appInstance.battleView.stepTimer);
    },mode);
    const state=await game.evaluate(()=>{
     const stage=document.querySelector('.battle-stage').getBoundingClientRect();
     return {slots:[...document.querySelectorAll('.battle-companion')].map(e=>{const r=e.getBoundingClientRect();const a=e.querySelector('.pet-portrait-art');return {text:e.innerText,slot:e.dataset.companionSlot,tired:e.classList.contains('is-tired'),empty:e.classList.contains('is-empty'),art:a?getComputedStyle(a).backgroundImage:null,contained:r.x>=stage.x&&r.right<=stage.right&&r.y>=stage.y&&r.bottom<=stage.bottom,overflow:e.scrollWidth>e.clientWidth,meter:e.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')};}),stage:stage.height,journal:document.querySelector('.battle-log').getBoundingClientRect().height,overflow:document.body.scrollWidth>innerWidth};
    });
    check(state.slots.length===4,'Missing companion slots');check(state.slots.every(s=>s.contained&&!s.overflow),'Companion clipped');check(!state.overflow,'Horizontal overflow');check(state.journal>state.stage*2.5,'Journal squeezed');
    if(mode==='full') {check(state.slots.slice(0,3).every(s=>s.art?.includes('pets-')),'Missing painted pet portraits');check(state.slots[1].tired&&state.slots[1].meter==='79'&&state.slots[1].text.includes('属性减半'),'79 stamina must be half attributes and trait off');check(!state.slots[2].tired&&state.slots[2].meter==='80'&&state.slots[2].text.includes('生效'),'80 stamina must be active');check(state.slots[3].text.includes('高文'),'Mercenary missing');}
    else check(state.slots.every(s=>s.empty),'Empty slots not explicit');
    await game.screenshot({path:`output/battle-revamp-2026-11-01/companions-${mode}-${viewport.width}.png`,animations:'disabled'});
    await game.locator('#btn-skip-battle').click();await game.locator('#btn-confirm-battle').click();
    rows.push({viewport,mode,state});
   }
   check(!errors.length&&!requests.length,'Browser errors');
  }finally{await context.close();}
 }
 return {fixture:true,rows};
}
