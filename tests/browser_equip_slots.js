async (page) => {
  const results = [];
  const LEFT = ['helmet', 'necklace', 'cloak', 'armor', 'belt', 'pants'];
  const RIGHT = ['weapon', 'gloves', 'boots', 'ring', 'mirror', 'bracelet'];
  for (const [width, height] of [[1280, 900], [1440, 1000]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height } });
    const game = await context.newPage(); const errors = [];
    game.on('pageerror', e => errors.push(e.message));
    const check = (c, m) => { if (!c) throw new Error(`${width}x${height}: ${m}`); };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.waitForFunction(() => Boolean(window.appInstance?.views?.bag && window.gameState));
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click();
      for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal?.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.waitForTimeout(150);
      await game.locator('#nav-tab-equip').click();
      await game.waitForTimeout(200);
      const m = await game.evaluate(() => {
        const lists = [...document.querySelectorAll('#tab-content-equip .equip-slot-list')];
        const cols = lists.map(list => ({
          heading: list.closest('.mota-parchment-panel')?.querySelector('.equip-column-heading span')?.textContent?.trim() || null,
          keys: [...list.querySelectorAll('[data-equip-slot]')].map(e => e.getAttribute('data-equip-slot'))
        }));
        const all = [...document.querySelectorAll('#tab-content-equip [data-equip-slot]')].map(e => e.getAttribute('data-equip-slot'));
        const header = document.querySelector('#tab-content-equip .mota-breadcrumb')?.textContent || '';
        return { listCount: lists.length, cols, all, headerHas12: /\/\s*12/.test(header) };
      });
      check(m.listCount === 2, 'expected 2 slot columns, got ' + m.listCount);
      const left = m.cols[0] || { heading: null, keys: [] };
      const right = m.cols[1] || { heading: null, keys: [] };
      check(left.heading && left.heading.includes('防具'), 'left column heading is not 防具与饰品: ' + left.heading);
      check(right.heading && right.heading.includes('武器'), 'right column heading is not 武器与饰物: ' + right.heading);
      check(JSON.stringify(left.keys) === JSON.stringify(LEFT), 'left slot keys wrong/misordered: ' + JSON.stringify(left.keys));
      check(JSON.stringify(right.keys) === JSON.stringify(RIGHT), 'right slot keys wrong/misordered: ' + JSON.stringify(right.keys));
      check(m.all.length === 12, 'expected 12 slots total, got ' + m.all.length);
      check(new Set(m.all).size === 12, 'duplicate slot keys present: ' + JSON.stringify(m.all));
      check(m.headerHas12, 'equip header missing "/ 12"');
      check(!left.keys.includes('boots') && !left.keys.includes('gloves'), 'boots/gloves leaked into LEFT column');
      check(!right.keys.includes('armor') && !right.keys.includes('pants') && !right.keys.includes('helmet'), 'armor/pants/helmet leaked into RIGHT column');
      check(errors.length === 0, 'pageerror: ' + errors.join(';'));
      await game.screenshot({ path: `output/ui-revamp-2026-11-03/c2-regress/equip-slots-${width}.png`, animations: 'disabled' });
      results.push({ width, height, left: left.keys, right: right.keys, total: m.all.length, pass: true });
    } finally { await context.close(); }
  }
  return results;
}
