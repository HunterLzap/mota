async (page) => {
  const phase = process.env.SHELL_CAPTURE_PHASE || 'after', results = [];
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  for (const viewport of [{width:1280,height:900},{width:1440,height:1000}]) {
    for (const classId of ['warrior','mage','hunter']) {
      const context = await page.context().browser().newContext({viewport});
      const game = await context.newPage(), errors = [], failures = [];
      game.on('pageerror', error => errors.push(error.message));
      game.on('requestfailed', request => failures.push(request.url()));
      game.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
      const capture = async label => {
        await game.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(image => image.decode()));
          const urls = new Set();
          for (const element of document.querySelectorAll('[data-painted-icon],.class-portrait')) {
            for (const match of getComputedStyle(element).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(match[1]);
          }
          await Promise.all([...urls].map(async url => { const image = new Image(); image.src = url; await image.decode(); }));
        });
        await game.screenshot({path:`output/ui-legibility-2026-10-29/${phase}-${viewport.width}-${classId}-${label}.png`,animations:'disabled'});
      };
      const contrast = async () => game.evaluate(() => {
        const lum = c => { const rgb = c.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v /= 255; return v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4; }); return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722; };
        return [...document.querySelectorAll('.quest-state-badge,.system-log-badge,.btn-log-filter')].map(element => {
          const s = getComputedStyle(element), a = lum(s.color), b = lum(s.backgroundColor);
          return {text:element.textContent.trim(),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),font:parseFloat(s.fontSize),background:s.backgroundColor,color:s.color};
        });
      });
      try {
        await context.addInitScript(() => {
          if (localStorage.getItem('shell-art-fixture')) return;
          for (const slot of [1,2,4,5]) localStorage.setItem('MOTA_WORLD_SAVE_SLOT_'+slot,'shell-protected-'+slot);
          localStorage.setItem('MOTA_WORLD_ACTIVE_SLOT_ID','3'); localStorage.setItem('shell-art-fixture','1');
        });
        await game.goto('http://127.0.0.1:8088/');
        await game.locator(`[data-class-id="${classId}"]`).click();
        await game.locator('#btn-confirm-character').click();
        for (let i=0;i<6 && await game.evaluate(()=>window.gameModal.isOpen);i++) await game.locator('#game-modal-btn-confirm').click();
        await game.locator('#game-modal-overlay').waitFor({state:'hidden'});
        await game.locator('#nav-tab-estate').click();
        await game.evaluate(() => {
          window.gameState.systemLogs = ['system','obtain','battle','quest','forge','pet','estate','unknown'].map((type,i) => ({type,time:'22:34:28',text: i===6 ? '长文检查：药园收获已记入账簿，北方守卫送来了新的探索委托。'.repeat(8) : '辨识检查：任务、奖励和物品说明完整显示。'}));
          window.appInstance.systemLogView.render();
          document.querySelector('#system-log-scroll-pane').scrollTop=0;
        });
        await capture('estate');
        const ongoing = await contrast();
        const before = await game.evaluate(()=>JSON.stringify(window.gameState.data));
        const filters=[];
        for (const filter of ['obtain','battle','quest','forge','all']) {
          const button=game.locator(`[data-log-filter="${filter}"]`);
          await button.focus(); await game.keyboard.press('Enter');
          if (phase==='after') {
            check(await button.evaluate(e=>e===document.activeElement),'Filter lost keyboard focus');
            check(await button.getAttribute('aria-pressed')==='true','Filter has no selected state');
            const types=await game.locator('.system-log-row').evaluateAll(elements=>elements.map(e=>e.dataset.logType));
            check(filter==='all' ? types.length===5 : types.length===1 && types[0]===filter,'Wrong log filtering');
            const metrics=await contrast();
            check(metrics.every(m=>m.ratio>=4.5 && m.font>=12),'Low filter/badge contrast: '+JSON.stringify(metrics));
            filters.push({filter,metrics});
          }
        }
        check(await game.evaluate(()=>JSON.stringify(window.gameState.data))===before,'Log filter mutated game data');
        if (phase==='after') {
          // 新口径：常驻面板固定高、仅最近 5 条、无内部滚动；长文完整内容改由「查看全部」分页弹窗承载。
          check(await game.locator('#system-log-scroll-pane .system-log-row').count()===5,'Main log panel must show only latest 5 rows');
          check(await game.locator('#system-log-scroll-pane').evaluate(element=>element.scrollHeight <= element.clientHeight + 1),'Main log panel must not scroll internally');
          await game.locator('#btn-log-view-all').click();
          const archive = game.locator('#system-log-archive-modal');
          check(await archive.isVisible(),'View-all archive modal did not open');
          const longText = '长文检查：药园收获已记入账簿，北方守卫送来了新的探索委托。'.repeat(8);
          check((await archive.innerText()).includes(longText),'Archive lost full long log text');
          check((await archive.innerText()).includes('第 1 / 2 页'),'Archive pagination page indicator wrong');
          check(await game.locator('#system-log-archive-modal .flex.items-start').count()===6,'Archive first page must show 6 rows');
          await game.locator('#btn-log-next').click();
          check((await game.locator('#system-log-archive-modal').innerText()).includes('第 2 / 2 页'),'Archive next page did not advance');
          await game.locator('#btn-log-archive-close').click();
          check(await game.locator('#system-log-archive-modal').count()===0,'Archive did not close');
        }
        await game.locator('#header-char-box').focus(); await game.keyboard.press('Enter');
        check(await game.locator('#tab-content-hero').isVisible(),'Portrait no longer opens character page');
        if (phase==='after') {
          check(await game.locator('#header-class-icon [data-painted-icon]').getAttribute('data-painted-icon')===classId,'Wrong painted class portrait');
          check(await game.locator('.classic-navigation [data-painted-icon]').count()===8,'Navigation art missing');
          check(ongoing.every(m=>m.ratio>=4.5 && m.font>=12),'Unreadable ongoing badge: '+JSON.stringify(ongoing));
        }
        await game.evaluate(async () => {
          const {getQuestList}=await import('/js/config/quests.js');
          const d=window.gameState.data,q=getQuestList(d).find(q=>q.id===d.currentQuestId);
          d.questProgress[q.id]={current:q.requiredCount,completed:true,claimed:false};
          window.appInstance.questTracker.render();
        });
        const ready=await contrast();
        await game.locator('#nav-tab-estate').click();
        await capture('ready');
        if (phase==='after') check(ready.every(m=>m.ratio>=4.5),'Unreadable ready status');
        if (classId==='mage') {
          await game.evaluate(() => {
            const view=window.appInstance.views.estate;
            view.currentView='mercenaries'; view.render();
          });
          await capture('mercenaries');
          if (phase==='after') {
            for (const key of ['merc_cleric','merc_paladin','merc_bard']) {
              check(await game.locator(`#tab-content-estate [data-painted-icon="${key}"]`).count()>0,'Missing companion portrait: '+key);
            }
          }
        }
        const health=await game.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length,footer:document.querySelector('.classic-footer').getBoundingClientRect().height}));
        check(!health.overflow && !health.broken && health.footer===205,JSON.stringify(health));
        await game.reload(); await game.waitForFunction(()=>window.appInstance?.views?.estate && window.gameState?.data.hasChosenClass);
        check(await game.evaluate(()=>[1,2,4,5].every(slot=>localStorage.getItem('MOTA_WORLD_SAVE_SLOT_'+slot)==='shell-protected-'+slot)),'Other fixture slots changed');
        check(await game.locator('#char-select-overlay').isHidden(),'Refresh reopened creation');
        if (phase==='after') check(await game.locator('#header-class-icon [data-painted-icon]').getAttribute('data-painted-icon')===classId,'Portrait changed on refresh');
        check(!errors.length&&!failures.length,JSON.stringify({errors,failures}));
        results.push({viewport,classId,phase,ongoing,ready,filters,health,errors,failures});
      } finally {await context.close();}
    }
  }
  return results;
}
