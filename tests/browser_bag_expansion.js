async (page) => {
  const context = await page.context().browser().newContext();
  const game = await context.newPage(); const errors = [];
  game.on('pageerror', error => errors.push(error.message));
  const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  const dismiss = async () => { while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click(); };
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
    // Isolated resources/material inventory fixture; expansion really deducts both game currencies.
    await game.evaluate(() => {
      const state = window.gameState;
      state.data.level = 15; state.data.gold = 10000; state.data.crystal = 50; state.data.prestige = 600;
      state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: 'supply_' + i, uid: 'supply_' + i, name: 'Supply ' + i, count: 1, quality: 'blue', icon: 'images/items/pet_food.svg' }));
      state.notify();
    });
    await game.locator('#nav-tab-bag').click();
    const before = await data();
    await game.locator('#btn-bag-expand').click(); await game.locator('#game-modal-btn-cancel').click();
    if (JSON.stringify(await data()) !== JSON.stringify(before)) throw new Error('Cancelled expansion mutated state');
    await game.locator('#btn-bag-expand').click(); await game.locator('#game-modal-btn-confirm').click(); await dismiss();
    const expanded = await data();
    if (expanded.bagCapacity !== 60 || expanded.gold !== 0 || expanded.crystal !== 0 || JSON.stringify(expanded.bag) !== JSON.stringify(before.bag)) throw new Error('Expansion did not charge or preserve correctly');
    if (!(await game.locator('#tab-content-bag').innerText()).includes('40 / 60')) throw new Error('Capacity display still hardcoded');
    await game.locator('#btn-bag-expand').click(); await game.locator('#game-modal-btn-confirm').click(); await dismiss();
    if (JSON.stringify(await data()) !== JSON.stringify(expanded)) throw new Error('Unaffordable expansion changed state');
    await game.evaluate(() => { window.appInstance.views.town.currentView = 'palace_arena'; window.switchMainTab('town'); });
    await game.locator('#btn-arena-subtab-shop').click();
    await game.locator('.btn-buy-prestige-item[data-shop-id="book_purify"]').click(); await dismiss();
    const bought = await data();
    if (bought.bag.length !== 41 || bought.prestige !== 300 || !bought.bag.some(item => item.id === 'book_purify')) throw new Error('Expanded shop capacity unusable');
    await game.reload(); const loaded = await data();
    if (loaded.bagCapacity !== 60 || loaded.gold !== 0 || loaded.crystal !== 0 || loaded.bag.length !== 41 || loaded.prestige !== 300) throw new Error('Expansion lost on reload');
    if (errors.length) throw new Error(errors.join('; '));
    return { capacity: '40 -> 60', goldSpent: 10000, crystalSpent: 50, cancelledPreserved: true, insufficientPreserved: true, purchaseBeyond40: true, reloadPreserved: true, errors };
  } finally { await context.close(); }
}
