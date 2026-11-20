async (page) => {
  const rows = [];
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  for (const viewport of [{width:1280,height:900}, {width:1440,height:1000}]) {
    for (const classId of ['warrior','hunter','mage']) {
      const context = await page.context().browser().newContext({viewport});
      const game = await context.newPage(), errors = [], requests = [];
      game.on('pageerror', e => errors.push(e.message));
      game.on('requestfailed', r => requests.push(r.url()));
      game.on('response', r => { if(r.status() >= 400) requests.push(r.url()); });
      try {
        await game.goto('http://127.0.0.1:8088');
        await game.locator(`[data-class-id="${classId}"]`).click();
        await game.locator('#btn-confirm-character').click();
        for(let i=0;i<6 && await game.evaluate(()=>window.gameModal.isOpen);i++) await game.locator('#game-modal-btn-confirm').click();
        // Isolated display fixture: no player browser or real save is used.
        await game.evaluate(async () => {
          const { MAPS } = await import('/js/config/maps.js');
          const portraitKey = MAPS[0].monsters[0].icon;
          const state=window.gameState;
          state.data.level=45;
          state.data.estate.hiredMercId='merc_bard';
          state.notify();
          window.appInstance.battleView.start({enemyData:{name:'丛林灰狼',portraitKey},enemyStats:{hp:18000,maxHp:18000,atk:180,def:90,speed:70,mp:0,maxMp:0}});
          const view=window.appInstance.battleView;
          clearTimeout(view.stepTimer);
          window.dashboardInitial=view.currentCombat.initialStats;
        });
        const initial=await game.evaluate(() => {
          const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
          const players=[...document.querySelectorAll('.battle-ally .battle-stats dd')].map(e=>e.textContent);
          const enemies=[...document.querySelectorAll('.battle-enemy .battle-stats dd')].map(e=>e.textContent);
          const expected=s=>[Math.floor(s.atk).toLocaleString(),Math.floor(s.def).toLocaleString(),Math.floor(s.hit).toLocaleString(),Math.round(s.dodge)+'%',Math.round(s.crit)+'%',Math.floor(s.speed).toLocaleString(),Math.round(s.dmgResist)+'%'];
          return {players,enemies,expectedPlayer:expected(dashboardInitial.player),expectedEnemy:expected(dashboardInitial.enemy),stage:rect('.battle-stage'),log:rect('.battle-log'),portraits:[rect('.battle-ally .battle-portrait'),rect('.battle-enemy .battle-portrait')],health:[rect('.battle-ally .battle-health'),rect('.battle-enemy .battle-health')],enemyManaPresent:!!document.querySelector('#b-enemy-mp-bar'),overflow:document.body.scrollWidth>innerWidth};
        });
        check(JSON.stringify(initial.players)===JSON.stringify(initial.expectedPlayer),'Player opening modifiers not displayed');
        check(JSON.stringify(initial.enemies)===JSON.stringify(initial.expectedEnemy),'Enemy defaults/modifiers not displayed');
        check(initial.enemyManaPresent===false,'Non-caster enemy must hide mana bar entirely');
        check(!initial.overflow,'Horizontal overflow');
        check(initial.log.height > initial.stage.height*2.5,'Journal did not regain main space');
        check(Math.abs(initial.portraits[0].height-initial.portraits[1].height)<1 && Math.abs(initial.portraits[0].width-initial.portraits[1].width)<1,'Portrait frames asymmetric');
        check(Math.abs(initial.health[0].y-initial.health[1].y)<2,'Vital panels misaligned');
        const sample=await game.evaluate(() => {
          const view=window.appInstance.battleView;
          const index=view.currentCombat.logs.findIndex(row=>row.playerMp<view.playerMaxMp);
          if(index<0) throw new Error('Fixture did not spend MP');
          while(view.currentTurnIdx<=index) {view.renderStep(view.currentCombat.logs[view.currentTurnIdx++]);}
          const step=view.currentCombat.logs[index];
          return {actual:parseFloat(document.querySelector('#b-player-mp-bar').style.width),expected:step.playerMp/view.playerMaxMp*100};
        });
        check(Math.abs(sample.actual-sample.expected)<0.01,'MP bar not synchronized with combat snapshot');
        await game.screenshot({path:`output/battle-revamp-2026-11-01/${classId}-${viewport.width}-playing.png`,animations:'disabled'});
        await game.locator('#btn-spd-3').click();
        await game.locator('#btn-skip-battle').click();
        const final=await game.evaluate(()=> {
          const view=window.appInstance.battleView;
          return {logs:view.currentCombat.logs.length,displayed:document.querySelectorAll('#combat-log-stream .combat-log-line').length,actual:parseFloat(document.querySelector('#b-player-mp-bar').style.width),expected:view.playerMaxMp>0?view.currentCombat.remainingMp/view.playerMaxMp*100:0,enemyManaPresent:!!document.querySelector('#b-enemy-mp-bar')};
        });
        check(final.displayed >= final.logs,'Long journal lost events');
        check(Math.abs(final.actual-final.expected)<0.01,'Final MP does not match production result');
        check(final.enemyManaPresent===false,'Non-caster enemy mana bar reappeared');
        check(await game.locator('#btn-confirm-battle').isVisible(),'Settlement button inaccessible');
        await game.screenshot({path:`output/battle-revamp-2026-11-01/${classId}-${viewport.width}-ended.png`,animations:'disabled'});
        await game.locator('#btn-confirm-battle').click();
        check(!await game.locator('#battle-overlay').isVisible(),'Settlement did not close battle');
        check(errors.length===0 && requests.length===0,'Browser error or failed request');
        rows.push({classId,viewport,initial,sample,final,errors,requests});
      } finally {await context.close();}
    }
  }
  return {fixture:true, rows};
}
