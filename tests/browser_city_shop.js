async (page) => {
  const results = [];
  for (const [width, height] of [[1280, 900], [1440, 1000]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height } });
    const game = await context.newPage(); const errors = [];
    game.on('pageerror', e => errors.push(e.message));
    const check = (c, m) => { if (!c) throw new Error(`${width}x${height}: ${m}`); };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.waitForFunction(() => Boolean(window.appInstance?.views?.town && window.gameState));
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click();
      for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal?.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.waitForTimeout(150);
      // 让货品可解锁、可负担（隔离存档）
      await game.evaluate(() => { const d = window.gameState.data; d.gold = 999999; d.crystal = 9999; d.prestige = 99999; d.level = 60; window.gameState.notify(); });
      await game.locator('#nav-tab-town').click();
      await game.locator('.classic-town-location[data-goto="royal_shop"]').click();
      await game.waitForTimeout(300);
      const snap = () => game.evaluate(() => ({
        ap: window.gameState.getActionPoints(),
        day: window.gameState.getActionDay(),
        total: window.gameState.data.actionClock?.totalActions ?? 0,
        gold: window.gameState.data.gold,
        bag: window.gameState.data.bag.length
      }));
      const before = await snap();
      const btn = game.locator('[data-buy-shop-goods]:not([disabled])').first();
      check(await btn.count() > 0, 'no purchasable good available');
      const goodsId = await btn.getAttribute('data-buy-shop-goods');
      await btn.click();
      await game.waitForTimeout(200);
      if (await game.evaluate(() => window.gameModal?.isOpen)) { await game.locator('#game-modal-btn-confirm').click(); await game.waitForTimeout(300); }
      const after = await snap();
      check(after.gold < before.gold, '购买未真扣款 (gold unchanged)');
      check(after.bag > before.bag, '购买未入包 (bag unchanged)');
      check(after.ap === before.ap, '购买消耗了行动点（不应）: ap ' + before.ap + ' -> ' + after.ap);
      check(after.day === before.day, '购买推进了行动日: day ' + before.day + ' -> ' + after.day);
      check(after.total === before.total, '购买计入行动次数 totalActions: ' + before.total + ' -> ' + after.total);
      check(errors.length === 0, 'pageerror: ' + errors.join(';'));
      results.push({ width, height, goodsId, goldBefore: before.gold, goldAfter: after.gold, apBefore: before.ap, apAfter: after.ap, dayBefore: before.day, dayAfter: after.day, pass: true });
    } finally { await context.close(); }
  }
  return results;
}
