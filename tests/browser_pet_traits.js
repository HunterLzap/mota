async (page) => {
  const context = await page.context().browser().newContext();
  const game = await context.newPage();
  const errors = [];
  game.on('pageerror', error => errors.push(error.message));
  const dismiss = async () => {
    while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click();
  };
  const fight = async () => {
    await game.locator('#btn-fight-wild-boss').click(); await game.locator('#btn-skip-battle').click();
    const result = await game.evaluate(() => window.appInstance.battleView.currentCombat);
    if (!result.victory) throw new Error('Fixture battle lost');
    await game.locator('#btn-confirm-battle').click(); await dismiss();
    return result;
  };
  try {
    await game.goto('http://127.0.0.1:8088', { timeout: 60000 });
    await game.locator('[data-class-id="mage"]').click(); await game.locator('#btn-confirm-character').click();
    // Isolated level/gear/pet fixture: currencies below are earned in actual browser battles.
    await game.evaluate(async () => {
      const { PET_CONFIGS } = await import('/js/config/pets.js');
      const state = window.gameState;
      state.data.level = 60; state.data.prestige = 0;
      state.data.equipped.weapon ??= { id:'fixture_weapon',uid:'fixture_weapon',name:'Fixture weapon',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:1,sockets:1,gems:[],stats:{atk:35} };
      if (!state.data.pets.length) { state.data.pets = [{id:'golden_dragon',level:1,exp:0,tier:'gold',stamina:100,apt:{str:1500,int:1000,dex:1200,con:1400},skills:[]}]; state.data.activePetId='golden_dragon'; }
      state.data.equipped.weapon.stats = { atk: 10000, hp: 20000, def: 1000 };
      state.data.bag = [{ id: 'pet_food', type: 'material', name: '兽肉', count: 15, uid: 'fixture_food' }];
      state.data.pets = [{ id: 'nightmare', level: 1, exp: 0, tier: 'darkgold', apt: { ...PET_CONFIGS.nightmare.defaultApt }, stamina: 100, skills: [] }];
      state.data.activePetId = 'nightmare'; state.notify();
    });
    await game.locator('#nav-tab-wild').click();
    for (let battle = 0; battle < 15; battle++) await fight();
    if (await game.evaluate(() => window.gameState.data.prestige) !== 300) throw new Error('Boss prestige did not fund the book');
    await game.evaluate(() => { window.appInstance.views.town.currentView = 'palace_arena'; window.switchMainTab('town'); });
    await game.locator('#btn-arena-subtab-shop').click();
    await game.locator('.btn-buy-prestige-item[data-shop-id="book_poison"]').click(); await dismiss();
    if (await game.evaluate(() => window.gameState.data.prestige) !== 0) throw new Error('Book did not charge 300');
    await game.locator('#nav-tab-pets').click();
    await game.locator('#btn-feed-pet').click(); await dismiss();
    await game.locator('#pet-subtab-skills').click();
    await game.locator('.btn-learn-skill[data-book-id="book_poison"]').click(); await dismiss();
    await game.evaluate(() => { window.gameState.data.equipped.weapon.stats.atk = 600; window.gameState.notify(); });
    await game.locator('#nav-tab-wild').click();
    const poisoned = await fight();
    if (!poisoned.logs.some(log => log.type === 'poison')) throw new Error('Learned poison did not enter real combat');
    await game.reload();
    if (!await game.evaluate(() => window.gameState.data.pets[0].skills.includes('book_poison') && !window.gameState.data.bag.some(item => item.id === 'book_poison'))) throw new Error('Reload lost learned/consumed book');
    await game.evaluate(() => { window.gameState.data.pets[0].stamina = 59; window.gameState.notify(); });
    await game.locator('#nav-tab-wild').click();
    const tired = await fight();
    if (tired.logs.some(log => log.type === 'poison')) throw new Error('Exhausted pet still applies poison');
    if (errors.length) throw new Error(errors.join('; '));
    return { actualBossWinsToFundBook: 15, prestigeSpent: 300, learnedBookPersisted: true, actualPoison: true, fatigueDisabled: true, errors };
  } finally { await context.close(); }
}
