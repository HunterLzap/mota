async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } });
  const game = await context.newPage();
  const errors = [];
  game.on('pageerror', e => errors.push(e.message));
  const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  const dismiss = async () => {
    for (let i = 0; i < 6; i++) {
      if (!await game.evaluate(() => window.gameModal.isOpen)) { await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' }); return; }
      await game.locator('#game-modal-btn-confirm').click();
    }
    throw new Error('Modal did not settle');
  };
  const battle = async () => {
    await game.locator('#btn-skip-battle').click();
    if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Fixture lost');
    await game.locator('#btn-confirm-battle').click(); await dismiss();
  };
  const town = async view => game.evaluate(view => { window.appInstance.views.town.currentView = view; window.switchMainTab('town'); }, view);
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
    for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal && window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
    await game.evaluate(() => {
      const d = window.gameState.data;
      d.level = 80; d.gold = 1000000;
      d.bag = d.bag.filter(i => !i.slot);
      d.equipped.weapon ??= { id:'fixture_weapon',uid:'fixture_weapon',name:'Fixture weapon',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:1,sockets:1,gems:[],stats:{atk:35} };
      d.equipped.weapon.stats = { atk: 100000, hp: 1000000, def: 10000 };
      window.gameState.notify();
    });
    await town('faction_war');
    for (let i = 0; i < 3; i++) { await game.locator('.btn-challenge-stronghold').nth(i).click(); await battle(); }
    const merit = (await data()).factionWar.merit;
    await game.locator('.btn-exchange-faction-reward[data-reward-id="key_mithril"]').click(); await dismiss();
    if ((await data()).factionWar.merit !== merit - 100) throw new Error('Merit exchange did not charge');
    await game.locator('#btn-claim-faction-salary').click(); await dismiss();
    const gold = (await data()).gold;
    await game.locator('#btn-claim-faction-salary').click(); await dismiss();
    if ((await data()).gold !== gold) throw new Error('Salary repeated');
    await town('tavern_bounty');
    const id = 'bounty_shadow_wolf';
    await game.locator(`.btn-accept-bounty[data-bounty-id="${id}"]`).click();
    await game.locator(`.btn-fight-bounty[data-bounty-id="${id}"]`).click(); await battle();
    await game.locator(`.btn-claim-bounty[data-bounty-id="${id}"]`).click(); await dismiss();
    if ((await data()).tavern.bounties.find(b => b.id === id).status !== 'completed') throw new Error('Bounty did not settle');
    await town('fishing');
    const bait = (await data()).bag.find(i => i.id === 'bait_normal').count;
    await game.locator('#btn-fish-normal').click(); await dismiss();
    if ((await data()).bag.find(i => i.id === 'bait_normal').count !== bait - 1) throw new Error('Fishing did not consume bait');
    await game.evaluate(() => { window.appInstance.views.estate.currentView = 'resources'; window.switchMainTab('estate'); });
    const crystal = (await data()).crystal;
    await game.locator('#btn-harvest-all').click(); await dismiss();
    if ((await data()).crystal !== crystal) throw new Error('Fresh estate harvested free resources');
    await game.evaluate(() => { window.gameState.data.estate.lastHarvestTime -= 30 * 60000; });
    await game.locator('#btn-harvest-all').click(); await dismiss();
    if ((await data()).crystal !== crystal + 25) throw new Error('Mature estate did not harvest');
    await game.locator('#btn-harvest-all').click(); await dismiss();
    if ((await data()).crystal !== crystal + 25) throw new Error('Harvest repeated');
    if (errors.length) throw new Error(errors.join('; '));
    return { captured: Object.keys((await data()).factionWar.strongholds), exchanged: 'key_mithril',
      salaryOnce: true, bounty: 'completed', baitConsumed: 1, harvestCrystal: 25, errors,
      fixture: 'Isolated level 80; elapsed harvest time supplied only for cooldown boundary' };
  } catch (error) {
    await game.screenshot({ path: 'output/playwright/activities-failure.png', fullPage: true }); throw error;
  } finally { await context.close(); }
}
