async (page) => {
  const results = [];
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const VIEWPORTS = [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }, { width: 1024, height: 768 }];

  const measureSquare = (game) => game.evaluate(() => {
    const cells = [...document.querySelectorAll('#tab-content-bag .bag-slot-cell')];
    const empties = [...document.querySelectorAll('#tab-content-bag .bag-slot-empty')];
    const all = [...cells, ...empties];
    const items = all.map(el => { const r = el.getBoundingClientRect(); return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), ratio: +(r.height / r.width).toFixed(3) }; });
    const widths = items.map(i => i.w);
    return { count: items.length, cellCount: cells.length, emptyCount: empties.length, items, minW: widths.length ? Math.min(...widths) : 0, maxW: widths.length ? Math.max(...widths) : 0 };
  });

  const assertSquare = (label, m) => {
    check(m.count > 0, `${label}: no bag slots rendered`);
    check(m.maxW - m.minW <= 1, `${label}: slot widths not uniform (min=${m.minW}, max=${m.maxW})`);
    for (const it of m.items) {
      check(Math.abs(it.w - it.h) <= 1, `${label}: slot not square (w=${it.w}, h=${it.h})`);
      check(it.ratio <= 1.15, `${label}: tall/stretched slot (h/w=${it.ratio}) — 1fr stretch regression`);
      check(it.ratio >= 0.87, `${label}: wide/flat slot (h/w=${it.ratio})`);
    }
  };

  const seedBag = (game, n) => game.evaluate(count => {
    const s = window.gameState;
    s.data.bag = Array.from({ length: count }, (_, i) => ({ id: 'bagfx_' + i, uid: 'bagfx_' + i, name: '测试物品 ' + i, count: 1, quality: 'blue', icon: 'images/items/pet_food.svg' }));
    const bv = window.appInstance.views.bag; if (bv) { bv.page = 0; }
    s.notify(); if (bv) bv.render();
  }, n);

  const collectPages = async (game) => {
    const seen = []; const clipped = []; const pages = [];
    for (let guard = 0; guard < 20; guard++) {
      const snap = await game.evaluate(() => {
        const box = document.querySelector('#tab-content-bag .bag-items');
        const ir = box.getBoundingClientRect();
        const cells = [...document.querySelectorAll('#tab-content-bag .bag-slot-cell')];
        return {
          uids: cells.map(c => c.getAttribute('data-bag-uid')),
          clipped: cells.filter(c => { const r = c.getBoundingClientRect(); return r.right > ir.right + 1 || r.bottom > ir.bottom + 1 || r.left < ir.left - 1 || r.top < ir.top - 1; }).map(c => c.getAttribute('data-bag-uid')),
          pageText: (document.querySelector('#tab-content-bag .bag-pagination')?.textContent || '').trim()
        };
      });
      seen.push(...snap.uids); clipped.push(...snap.clipped); pages.push(snap.pageText);
      const nextDisabled = await game.locator('#btn-bag-page-next').isDisabled().catch(() => true);
      if (nextDisabled) break;
      await game.locator('#btn-bag-page-next').click(); await game.waitForTimeout(120);
    }
    return { seen, clipped, pages };
  };

  for (const vp of VIEWPORTS) {
    const context = await page.context().browser().newContext({ viewport: vp });
    const game = await context.newPage(); const errors = [];
    game.on('pageerror', e => errors.push(e.message));
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.waitForFunction(() => Boolean(window.appInstance?.views?.bag && window.gameState), null, { timeout: 30000 });
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click();
      for (let i = 0; i < 12 && await game.evaluate(() => window.gameModal?.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.waitForTimeout(300);
      await game.locator('#nav-tab-bag').click();
      await game.locator('#tab-content-bag .bag-items').waitFor({ state: 'visible', timeout: 8000 });
      await game.waitForTimeout(200);

      // A) default few items -> items + many empty placeholders
      const mFew = await measureSquare(game);
      assertSquare(`${vp.width}x${vp.height} 默认`, mFew);

      // B) 40 items -> all real cells, uniform square
      await seedBag(game, 40);
      await game.waitForTimeout(250);
      const mFull = await measureSquare(game);
      assertSquare(`${vp.width}x${vp.height} 40件`, mFull);
      check(mFull.cellCount >= 1, `${vp.width}x${vp.height}: no item cells after seeding 40`);

      // C) clipping / pagination content preservation (emphasized on narrow 1024x768)
      const { seen, clipped, pages } = await collectPages(game);
      const owned = await game.evaluate(() => window.gameState.data.bag.map(i => i.uid || i.id));
      check(clipped.length === 0, `${vp.width}x${vp.height}: ${clipped.length} cells clipped by .bag-items (overflow:hidden) e.g. ${JSON.stringify(clipped.slice(0, 5))}`);
      check(JSON.stringify([...new Set(seen)].sort()) === JSON.stringify([...owned].sort()), `${vp.width}x${vp.height}: pagination loses/repeats items (pages=${pages.length}, seen=${seen.length}, owned=${owned.length})`);
      check(errors.length === 0, `${vp.width}x${vp.height}: pageerror ${errors.join(';')}`);

      await game.screenshot({ path: `output/ui-revamp-2026-11-03/batch4G/baggrid-${vp.width}.png`, animations: 'disabled' });
      results.push({ ...vp, defaultSlots: mFew.count, defaultCells: mFew.cellCount, defaultEmpties: mFew.emptyCount, fullCells: mFull.cellCount, pages: pages.length, owned: owned.length, pass: true });
    } catch (e) {
      results.push({ ...vp, pass: false, error: e.message });
    } finally { await context.close(); }
  }
  const failed = results.filter(r => !r.pass);
  if (failed.length) throw new Error('bag-grid failed: ' + JSON.stringify(failed));
  return results;
}
