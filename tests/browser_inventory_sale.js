async (page) => {
  const context = await page.context().browser().newContext();
  const game = await context.newPage();
  const errors = [];
  game.on('pageerror', error => errors.push(error.message));
  const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  const dismiss = async () => { while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click(); };
  try {
    await game.goto('http://127.0.0.1:8088', { timeout: 60000 });
    await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
    // Isolated overflow inventory fixture; no actual user inventory is changed.
    await game.evaluate(() => {
      const state = window.gameState;
      state.data.level = 15;
      state.data.prestige = 300;
      state.data.bag = Array.from({ length: 41 }, (_, i) => ({ id: 'gear_' + i, uid: 'sale_' + i, name: 'Unused sword ' + i,
        slot: 'weapon', reqLevel: 15, quality: 'gold', price: 1000, stats: { atk: 100 }, durability: 100, maxDurability: 100, gems: [] }));
      state.data.bag[0].gems = [{ id: 'gem_atk', name: 'Diamond', stat: 'atk', val: 25 }];
      state.notify();
    });
    const before = await data();
    await game.locator('#nav-tab-bag').click();
    await game.locator('.bag-slot-cell[data-bag-uid="sale_0"]').click();
    await game.evaluate(() => document.getElementById('btn-bag-sell-equipment')?.click());
    if (!(await game.locator('#game-modal-overlay').innerText()).includes('无损摘除')) throw new Error('Socketed gear was not protected');
    await dismiss();
    if (JSON.stringify(await data()) !== JSON.stringify(before)) throw new Error('Rejected sale changed inventory');
    await game.locator('.bag-slot-cell[data-bag-uid="sale_1"]').click();
    await game.evaluate(() => document.getElementById('btn-bag-sell-equipment')?.click());
    await game.locator('#game-modal-btn-cancel').click();
    if (JSON.stringify(await data()) !== JSON.stringify(before)) throw new Error('Cancelled sale changed inventory');
    for (const uid of ['sale_1', 'sale_2']) {
      await game.locator(`.bag-slot-cell[data-bag-uid="${uid}"]`).click();
      await game.evaluate(() => document.getElementById('btn-bag-sell-equipment')?.click());
      await game.locator('#game-modal-btn-confirm').click(); await dismiss();
    }
    const sold = await data();
    if (sold.bag.length !== 39 || sold.gold - before.gold !== 1000 || !sold.bag.some(item => item.uid === 'sale_0')) throw new Error('Sale removed wrong item or paid wrong amount');
    if (JSON.stringify(sold.equipped) !== JSON.stringify(before.equipped)) throw new Error('Sale touched worn equipment');
    await game.evaluate(() => { window.appInstance.views.town.currentView = 'palace_arena'; window.switchMainTab('town'); });
    await game.locator('#btn-arena-subtab-shop').click();
    await game.locator('.btn-buy-prestige-item[data-shop-id="book_purify"]').click(); await dismiss();
    const bought = await data();
    if (bought.bag.length !== 40 || bought.prestige !== 0 || !bought.bag.some(item => item.id === 'book_purify')) throw new Error('Cleared capacity did not restore purchasing');
    await game.reload();
    const loaded = await data();
    if (loaded.gold !== bought.gold || loaded.bag.some(item => ['sale_1', 'sale_2'].includes(item.uid)) || !loaded.bag.some(item => item.id === 'book_purify')) throw new Error('Reload lost sale/purchase state');
    await game.locator('#nav-tab-bag').click();
    await game.evaluate(() => document.getElementById('btn-bag-equip-item')?.click());
    if ((await data()).equipped.weapon.uid !== 'sale_0') throw new Error('Default item preview could not equip without a second selection');
    if (errors.length) throw new Error(errors.join('; '));
    return { overflowBefore: 41, afterSales: 39, afterPurchase: 40, goldEarned: 1000, cancellationPreserved: true, socketedGearPreserved: true, wornGearPreserved: true, reloadPreserved: true, defaultPreviewEquipped: true, errors };
  } finally { await context.close(); }
}
