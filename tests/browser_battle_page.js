async (page) => {
  const rows = [];
  const assertPlayerCopy = async game => {
    const text = await game.locator('body').innerText();
    if (/原著|原版|重制规则|未配置|生产验证|验收|\[JS Error\]|\[Promise Error\]/.test(text)) throw new Error('Developer copy exposed to player');
  };
  for (const viewport of [{width:1280,height:900},{width:1440,height:1000}]) {
    const context = await page.context().browser().newContext({viewport}); const game = await context.newPage(); const errors = [];
    game.on('pageerror', e => errors.push(e.message));
    try {
      await game.goto('http://127.0.0.1:8088'); await assertPlayerCopy(game); await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
      if (!await game.locator('#journey-guide').getByText('下一步：', {exact:false}).isVisible()) throw new Error('Missing next action');
      if(!await game.locator('#game-modal-btn-confirm').isVisible()) throw new Error('Opening guard conversation missing');
      await game.locator('#game-modal-btn-confirm').click();
      const dismiss=async()=>{for(let i=0;i<4&&await game.evaluate(()=>window.gameModal.isOpen);i++)await game.locator('#game-modal-btn-confirm').click();};
      for(const id of ['novice_weapon','novice_armor']) {
        const gear=await game.evaluate(id=>window.gameState.data.bag.find(i=>i.id===id),id);
        await game.locator('#nav-tab-bag').click();await game.locator(`[data-bag-uid="${gear.uid}"]`).click();await game.locator('#bag-action-menu').waitFor();await game.locator('#bag-action-menu button').filter({hasText:'穿戴'}).first().click();await dismiss();
      }
      await assertPlayerCopy(game);
      await game.locator('#nav-tab-pets').click(); if(await game.locator('#pet-subtab-compendium').count()) await game.locator('#pet-subtab-compendium').click(); await assertPlayerCopy(game);
      await game.locator('#nav-tab-equip').click(); await game.locator('#btn-view-sets-compendium').click(); await assertPlayerCopy(game); await game.locator('#btn-close-sets-compendium').click();
      await game.locator('#nav-tab-town').click();
      await game.screenshot({path:`output/playwright/journey-${viewport.width}.png`});
      await game.locator('#nav-tab-wild').click();
      await game.locator('.btn-fight-mob').first().click();
      if (!await game.locator('#battle-overlay').isVisible()) throw new Error('Battle page missing');
      const layout = await game.evaluate(() => ({position:getComputedStyle(document.getElementById('battle-overlay')).position,parent:document.getElementById('battle-overlay').parentElement.tagName,footer:getComputedStyle(document.querySelector('footer')).display,bodyWidth:document.body.scrollWidth,viewport:innerWidth}));
      if (layout.position === 'fixed' || layout.parent !== 'MAIN' || layout.footer !== 'none') throw new Error('Battle remained a modal');
      if (layout.bodyWidth > layout.viewport) throw new Error('Battle page overflowed horizontally');
      for (const label of ['我方阵容','对手阵容','穿戴装备 · 十二个部位','当前职业技能','对手技能与机制']) if (!await game.getByText(label,{exact:true}).isVisible()) throw new Error('Missing lineup detail: '+label);
      await game.locator('#btn-spd-3').click(); await game.locator('#btn-skip-battle').click();
      await game.screenshot({path:`output/playwright/battle-page-${viewport.width}.png`});
      await assertPlayerCopy(game);
      const logRows = await game.locator('#combat-log-stream > div').count();
      if (logRows < 2) throw new Error('Battle logs missing');
      await game.locator('#btn-confirm-battle').click();
      if (await game.locator('#battle-overlay').isVisible() || !await game.locator('#tab-content-wild').isVisible()) throw new Error('Did not return to originating scene');
      if (await game.evaluate(() => document.body.classList.contains('in-battle'))) throw new Error('Battle layout remained after settlement');
      if (errors.length) throw new Error(errors.join('; '));
      await game.evaluate(() => {
        window.dispatchEvent(new ErrorEvent('error', {message:'INTERNAL_PRIVATE_PATH',filename:'internal/source.js',lineno:999}));
        window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {promise:Promise.resolve(),reason:new Error('INTERNAL_PRIVATE_PATH')}));
      });
      const notice = await game.locator('#runtime-error-display').innerText();
      if (!notice.includes('请刷新页面后重试') || /INTERNAL_PRIVATE_PATH|internal\/source|JS Error|Promise Error/.test(notice)) throw new Error('Technical error details exposed');
      rows.push({playerCopyChecked:true,errorDetailsHidden:true,viewport,nextTaskVisible:true,firstTaskRouted:true,lineupsVisible:true,logRows,returned:true,layout,errors});
    } finally {await context.close();}
  }
  return {rows};
}
