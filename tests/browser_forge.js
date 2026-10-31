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
    // Isolated level/gear fixture, with prestige earned through actual victory adapters.
    await game.evaluate(() => {
      const state = window.gameState;
      state.data.level = 20; state.data.prestige = 0;
      state.data.bag = state.data.bag.filter(item => !['protect_crystal', 'crystal_protect'].includes(item.id));
      state.data.equipped.weapon ??= { id:'fixture_weapon',uid:'fixture_weapon',name:'Fixture weapon',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:1,sockets:1,gems:[],stats:{atk:35} };
      state.data.equipped.weapon.stars = 7;
      state.data.equipped.weapon.stats = { atk: 10000, hp: 100000 };
      state.notify();
    });
    await game.locator('#nav-tab-wild').click();
    for (let fight = 0; fight < 8; fight++) {
      await game.locator('#btn-fight-wild-boss').click(); await game.locator('#btn-skip-battle').click();
      if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Fixture fight lost');
      await game.locator('#btn-confirm-battle').click(); await dismiss();
    }
    await game.evaluate(() => { window.appInstance.views.town.currentView = 'palace_arena'; window.switchMainTab('town'); });
    await game.locator('#btn-arena-subtab-shop').click();
    await game.locator('.btn-buy-prestige-item[data-shop-id="crystal_protect"]').click(); await dismiss();
    const bought = (await data()).bag.find(item => item.id === 'protect_crystal');
    if (!bought || bought.count !== 1 || (await data()).prestige !== 10) throw new Error('Purchased protection has wrong identity or price');
    // Simulate legacy archive identity while preserving the actually purchased material.
    await game.evaluate(() => { const state = window.gameState; state.data.bag.find(item => item.id === 'protect_crystal').id = 'crystal_protect'; state.notify(); });
    await game.reload();
    const migrated = (await data()).bag.find(item => item.uid === bought.uid);
    if (migrated.id !== 'protect_crystal' || migrated.count !== 1) throw new Error('Legacy protection migration changed quantity/identity');
    await game.evaluate(() => { window.appInstance.views.town.currentView = 'smithy_enhance'; window.switchMainTab('town'); });
    await game.locator('#chk-use-protect').check();
    const before = await data();
    // A controlled failed roll verifies the failure branch; no rewards or currency are injected.
    await game.evaluate(() => { window.forgeTestRandom = Math.random; Math.random = () => 0.99; });
    await game.locator('#btn-do-enhance').click();
    await game.evaluate(() => { Math.random = window.forgeTestRandom; });
    if (!(await game.locator('#game-modal-overlay').innerText()).includes('保护水晶')) throw new Error('UI did not report protection');
    await dismiss();
    const after = await data();
    if (after.equipped.weapon.stars !== 7 || after.bag.some(item => item.id === 'protect_crystal')) throw new Error('Protected failure lost stars or failed to consume material');
    if (before.bag.find(item => item.id === 'star_crystal').count - after.bag.find(item => item.id === 'star_crystal').count !== 8) throw new Error('Wrong enhancement cost');
    await game.reload();
    if ((await data()).equipped.weapon.stars !== 7 || (await data()).bag.some(item => item.id === 'protect_crystal')) throw new Error('Reload lost protected result');
    if (errors.length) throw new Error(errors.join('; '));
    return { actualBossWins: 8, prestigeSpent: 150, legacyUidPreserved: true, failedRollKeptStars: 7, upgradeCrystalsSpent: 8, protectionConsumed: 1, reloadPreserved: true, errors };
  } finally { await context.close(); }
}
