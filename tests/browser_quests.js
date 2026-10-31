async (page) => {
  // Midgame fixture: supplies prerequisites, never marks an action completed or grants a quest reward directly.
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } });
  const game = await context.newPage();
  const errors = [];
  game.on('pageerror', e => errors.push(e.message));
  const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  const dismiss = async () => {
    for (let i = 0; i < 8; i++) {
      if (!await game.evaluate(() => window.gameModal.isOpen)) {
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' }); return;
      }
      await game.locator('#game-modal-btn-confirm').click();
    }
    throw new Error('Modal did not settle');
  };
  const battle = async () => {
    await game.locator('#btn-skip-battle').click();
    if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Fixture lost');
    await game.locator('#btn-confirm-battle').click();
    await dismiss();
  };
  const claim = async id => {
    if ((await data()).currentQuestId === id && !(await data()).questProgress[id]?.claimed) {
      await game.locator('#btn-claim-quest-reward').click(); await dismiss();
    }
    if (!(await data()).questProgress[id]?.claimed) throw new Error(`${id} did not complete through its UI action`);
  };
  const nav = async () => { await game.locator('#btn-auto-nav-quest').click(); };
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="mage"]').click();
    await game.locator('#btn-confirm-character').click();
    await game.evaluate(() => {
      const d = window.gameState.data;
      d.level = 80; d.gold = 1000000; d.crystal = 100000; d.prestige = 100000;
      d.currentQuestId = 'quest_11';
      d.equipped.weapon ??= { id:'fixture_weapon',uid:'fixture_weapon',name:'Fixture weapon',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:1,sockets:1,gems:[],stats:{atk:35} };
      if (!d.pets.length) { d.pets = [{id:'golden_dragon',level:1,exp:0,tier:'gold',stamina:100,apt:{str:1500,int:1000,dex:1200,con:1400},skills:[]}]; d.activePetId='golden_dragon'; }
      d.equipped.weapon.stats = { atk: 100000, hp: 1000000, def: 10000 };
      d.pets[0].tier = 'darkgold'; d.pets[0].level = 40;
      window.gameState.notify();
    });
    await nav();
    await game.locator('.btn-fight-dragon[data-dragon-id="slay_red_dragon"]').click(); await battle(); await claim('quest_11');
    await nav();
    await game.locator('#btn-challenge-trial').click(); await battle(); await claim('quest_12');
    await nav();
    await game.locator('#btn-enter-dungeon').click(); await dismiss();
    for (let i = 0; i < 5; i++) { await game.locator('#btn-dungeon-fight').click(); await battle(); }
    await claim('quest_13');
    await nav();
    await game.locator('.btn-challenge-arena-opp').first().click(); await battle(); await claim('quest_14');
    await nav();
    await game.locator('#btn-start-mithril').click(); await dismiss();
    await game.locator('#btn-challenge-castle-floor').click(); await battle(); await claim('quest_15');
    await nav();
    await game.locator('#btn-do-reforge').click(); await dismiss(); await claim('quest_16');
    await nav();
    await game.locator('#btn-fight-wild-boss').click(); await battle(); await claim('quest_17');
    await nav();
    await game.locator('#btn-challenge-thief').click(); await battle(); await claim('quest_18');
    await nav();
    await game.locator('.btn-fight-dragon[data-dragon-id="slay_silver_dragon"]').click(); await battle(); await claim('quest_19');
    await nav();
    await game.locator('#btn-do-evolve-pet').click(); await dismiss(); await claim('quest_20');
    const after = await data();
    if (after.pets[0].tier !== 'purplegold' || after.arena.challengesLeft !== 4) throw new Error('Final quest/arena settlement wrong');
    if (after.currentQuestId !== 'quest_21' || !(await game.locator('#quest-tracker-mount').innerText()).includes('边境烽火')) throw new Error('Royal mission did not hand off to continuation');
    await game.reload();
    if ((await data()).currentQuestId !== 'quest_21' || !(await data()).questProgress.quest_20.claimed) throw new Error('Reload lost continuation or royal reward claim');
    if (errors.length) throw new Error(errors.join('; '));
    return { claimed: Object.entries(after.questProgress).filter(([, value]) => value.claimed).map(([id]) => id),
      petTier: after.pets[0].tier, errors, fixture: 'Prepared midgame prerequisites; UI actions and rewards are production paths' };
  } catch (error) {
    await game.screenshot({ path: 'output/playwright/quests-failure.png', fullPage: true }); throw error;
  } finally { await context.close(); }
}
