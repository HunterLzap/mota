async (page) => {
  const results = [];
  for (const [width,height,classId] of [[1440,1000,'warrior'],[1280,900,'hunter']]) {
    const context = await page.context().browser().newContext({viewport:{width,height}});
    const game = await context.newPage(); const errors=[];
    game.on('pageerror', error => errors.push(error.message));
    const check = (condition,message) => {if(!condition) throw new Error(message);};
    const dismiss = async () => {for(let i=0;i<4 && await game.evaluate(()=>window.gameModal.isOpen);i++) await game.locator('#game-modal-btn-confirm').click();};
    const capture = async name => {
      await game.screenshot({path:`output/playwright/classic-${width}-${name}.png`,animations:'disabled'});
      check(await game.evaluate(()=>document.body.scrollWidth <= innerWidth),'Horizontal overflow: '+name);
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.evaluate(async () => {
        for (const path of ['scenes/royal-capital.png','scenes/wild-regions.png','portraits/class-portraits.png','portraits/pets-01.png','portraits/pets-02.png','portraits/forest-enemies.png','portraits/canyon-wasteland-enemies.png','portraits/swamp-volcano-enemies.png','ui/classic-frame.png','ui/classic-parchment.png','ui/orb-rim.png','ui/portrait-rim.png','ui/navigation-states.png','ui/button-states.png','ui/item-slot-frame.png','ui/panel-heading.png']) {
          const image = new Image(); image.src = '/images/' + path; await image.decode();
          if (!image.naturalWidth) throw new Error('Missing artwork: ' + path);
        }
      });
      await game.locator(`[data-class-id="${classId}"]`).click();
      await game.locator('#btn-confirm-character').click(); await dismiss();
      for (const id of ['novice_weapon','novice_armor']) {
        const uid = await game.evaluate(id=>window.gameState.data.bag.find(item=>item.id===id).uid,id);
        await game.locator('#nav-tab-bag').click();
        await game.locator(`[data-bag-uid="${uid}"]`).click();
        await game.evaluate(() => document.getElementById('btn-bag-equip-item')?.click()); await dismiss();
      }
      await game.locator('#nav-tab-town').click();
      await game.locator('.classic-town-art').evaluate(image=>image.decode());
      check(await game.locator('.classic-town-location').count()===8,'Missing city entrances');
      const nav=await game.locator('.classic-navigation').boundingBox(), main=await game.locator('main').boundingBox(), side=await game.locator('.classic-sidebar').boundingBox();
      check(nav.y+nav.height<=main.y && side.x+side.width<=main.x,'Classic top/left composition missing');
      await capture('town');
      await game.locator('[data-goto="dragons"]').focus();
      await game.keyboard.press('Enter');
      check((await game.locator('#game-modal-message').innerText()).includes('领取'),'Locked city entrance lost prerequisite explanation'); await dismiss();
      await game.locator('[data-goto="smithy"]').click();
      check(await game.locator('[data-goto="smithy_repair"]').isVisible(),'City hotspot did not navigate');
      await game.locator('#nav-tab-equip').click(); await capture('equip');
      check(await game.locator('.equip-body-portrait').isVisible(),'Equipment portrait missing');
      check(await game.locator('#btn-goto-bag-from-equip').isVisible(),'Equipment actions inaccessible');
      const equipAction = await game.locator('#btn-goto-bag-from-equip').boundingBox();
      const equipMain = await game.locator('main').boundingBox();
      check(equipAction.y + equipAction.height <= equipMain.y + equipMain.height,'Equipment action clipped below main');
      await game.locator('#btn-goto-bag-from-equip').click();
      check(await game.locator('#tab-content-bag').isVisible(),'Equipment action did not open inventory');
      await game.locator('#nav-tab-pets').click(); await game.locator('#pet-subtab-compendium').click();
      check(await game.locator('.pet-select-card').count()===22,'Compendium incomplete');
      await game.locator('[data-pet-id="silver_dragon"]').click();
      check(await game.locator('[data-pet-id="silver_dragon"]').getAttribute('aria-pressed')==='true','Compendium selection failed');
      // 宠物页现行版式：classic 侧栏 + `.pet-classic-workspace` 两栏网格（花名册 roster / 详情 detail）。
      // 旧「三栏近似等宽(比值<1.2)」断言已过期——现行 roster/detail 为响应式 2 栏网格（宽屏 roster 主栏、
      // 窄屏 detail 主栏，比值≈2.1）。改为断言真实网格结构：2 栏、各栏有实宽、无重叠、不溢出。
      const petLayout = await game.evaluate(() => {
        const ws = document.querySelector('#tab-content-pets .pet-classic-workspace');
        const roster = document.querySelector('#tab-content-pets .pet-classic-roster');
        const detail = document.querySelector('#tab-content-pets .pet-classic-detail');
        const sidebar = document.querySelector('.classic-sidebar');
        const rect = el => el ? el.getBoundingClientRect() : { width: 0, height: 0, x: 0, right: 0 };
        const rr = rect(roster), rd = rect(detail), rs = rect(sidebar), rw = rect(ws);
        const cs = ws ? getComputedStyle(ws) : null;
        const tracks = cs ? cs.gridTemplateColumns.split(' ').filter(Boolean).length : 0;
        return {
          hasAll: !!(roster && detail && sidebar),
          wsDisplay: cs ? cs.display : null,
          tracks,
          rosterW: Math.round(rr.width), detailW: Math.round(rd.width), sidebarW: Math.round(rs.width),
          rosterH: Math.round(rr.height), detailH: Math.round(rd.height),
          sumFits: rr.width + rd.width <= rw.width + 1,
          overlap: (Math.min(rr.right, rd.right) - Math.max(rr.x, rd.x)) > 1,
          overflow: document.body.scrollWidth > innerWidth
        };
      });
      check(petLayout.hasAll && petLayout.wsDisplay === 'grid' && petLayout.tracks === 2 &&
        petLayout.rosterW >= 240 && petLayout.rosterH > 0 && petLayout.detailW >= 240 && petLayout.detailH > 0 &&
        petLayout.sidebarW >= 200 && petLayout.sumFits && !petLayout.overlap && !petLayout.overflow,
        'Pet workspace lost two-pane grid proportions: ' + JSON.stringify(petLayout));
      await capture('pets');
      await game.locator('#nav-tab-wild').click();
      await game.locator('.btn-fight-mob').first().click();
      // 战斗页 P0–P2 改版后 skip 按钮为主题按钮 `mota-btn-gold`（渐变底+悬停变色），
      // 不再用旧 `button-states.png` 雪碧图。断言改为：确为主题按钮 + 悬停确有视觉反馈变化。
      const skipBtn = game.locator('#btn-skip-battle');
      const skipNormal = await skipBtn.evaluate(b => { const c = getComputedStyle(b); return c.backgroundImage + '|' + c.borderColor; });
      await skipBtn.hover();
      await game.waitForTimeout(120);
      const skipHover = await skipBtn.evaluate(b => { const c = getComputedStyle(b); return c.backgroundImage + '|' + c.borderColor; });
      check(await skipBtn.evaluate(b => b.className.includes('mota-btn')) && skipHover !== skipNormal, 'Hovered battle action lost generated material');
      await game.locator('#btn-skip-battle').click();
      check(await game.locator('[data-enemy-portrait="monster_wolf"]').isVisible(),'Forest wolf artwork missing from actual combat');
      check(await game.locator('#b-player-interval').isVisible(),'Combat timing missing');
      check(await game.locator('.classic-sidebar').isHidden(),'Combat cannot use full arena');
      await capture('battle');
      await game.locator('#btn-confirm-battle').click(); await dismiss();
      check(await game.locator('.classic-sidebar').isVisible(),'Character ledger not restored after battle');
      await game.reload();
      check(await game.evaluate(()=>window.gameState.data.equipped.weapon.reqClass)===classId,'Reload lost equipped class');
      // Isolated display fixture: prove the artwork does not replace live liquid levels or labels.
      const meters = await game.evaluate(() => {
        const state = window.gameState, original = state.getEffectiveStats;
        const originalStats = original.call(state);
        const samples = [];
        try {
          for (const percent of [0,50,100]) {
            state.getEffectiveStats = () => ({...originalStats, hp: percent * 10, maxHp: 1000, mp: percent * 2, maxMp: 200});
            state.notify();
            samples.push(...['health','mana'].map(kind => {
              const orb = document.querySelector(`.classic-${kind}-orb`), liquid = orb.querySelector('.classic-orb-liquid');
              return {kind, percent, aria: Number(orb.getAttribute('aria-valuenow')), ratio: parseFloat(getComputedStyle(liquid,'::before').height) / liquid.clientHeight,
                text: orb.querySelector('b').textContent, expectedText: (percent * (kind === 'health' ? 10 : 2)).toLocaleString()};
            }));
          }
        } finally {state.getEffectiveStats = original; state.notify();}
        return samples;
      });
      check(meters.every(meter=>meter.aria===meter.percent && Math.abs(meter.ratio-meter.percent/100)<.01 && meter.text===meter.expectedText),'Artwork broke live orb rendering: '+JSON.stringify(meters));
      check(errors.length===0, errors.join(';'));
      results.push({width,height,classId,cityEntrances:8,petEntries:22,combatReturn:true,saved:true,meterSamples:meters.length,errors});
    } finally {await context.close();}
  }
  return {results};
}
