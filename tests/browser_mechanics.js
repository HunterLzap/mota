async (page) => {
  const context = await page.context().browser().newContext();
  const game = await context.newPage();
  const errors = [];
  game.on('pageerror', error => errors.push(error.message));
  const dismiss = async () => {
    while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click();
    await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
  };
  const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  const battle = async () => {
    await game.locator('#btn-skip-battle').click();
    if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Battle lost');
    await game.locator('#btn-confirm-battle').click();
  };
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="warrior"]').click();
    await game.locator('#btn-confirm-character').click();
    await game.locator('#nav-tab-wild').click();
    const before = await data();
    for (let i = 0; i < 20; i++) {
      await game.locator('.btn-fight-mob').first().click();
      await battle(); await dismiss();
    }
    const hunted = await data();
    if (hunted.wildVictories !== 20 || hunted.gold - before.gold !== 20 * 87) throw new Error('Displayed/configured wild rewards disagree with settlement');
    if (hunted.bag.find(item => item.id === 'pet_food').count !== 17) throw new Error('Guaranteed ration did not arrive');
    await game.reload();
    if ((await data()).wildVictories !== 20) throw new Error('Ration counter was not saved');
    // Isolated story fixture: actual battle and generic quest claim must unlock the encounter.
    await game.evaluate(() => {
      const state = window.gameState;
      state.data.level = 20;
      state.data.currentQuestId = 'quest_17';
      state.data.equipped.weapon ??= { id:'fixture_weapon',uid:'fixture_weapon',name:'Fixture weapon',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:1,sockets:1,gems:[],stats:{atk:35} };
      state.data.equipped.weapon.stats = { atk: 10000, hp: 100000 };
      state.notify();
    });
    await game.locator('#nav-tab-wild').click();
    const beforeBoss = new Set((await data()).bag.map(item => item.uid));
    await game.locator('#btn-fight-wild-boss').click(); await battle();
    const bossGear = (await data()).bag.find(item => item.slot && !beforeBoss.has(item.uid));
    if (!bossGear || bossGear.quality !== 'gold') throw new Error('Forest boss ignored configured gold equipment quality');
    await game.locator('#game-modal-btn-cancel').click();
    await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    await game.locator('#btn-claim-quest-reward').click(); await dismiss();
    if ((await data()).currentQuestId !== 'quest_18' || !(await data()).maskedThief.appeared) throw new Error('Generic quest claim lost the thief encounter');
    await game.reload();
    await game.locator('#nav-tab-wild').click();
    if (!await game.locator('#btn-challenge-thief').isVisible()) throw new Error('Thief encounter missing after refresh');
    await game.locator('#nav-tab-estate').click();
    await game.locator('.btn-estate-goto[data-goto="mercenaries"]').click();
    const beforeHire = await data();
    await game.locator('.btn-hire-merc[data-merc-id="merc_bard"]').click(); await dismiss();
    const hired = await data();
    if (hired.estate.hiredMercId !== 'merc_bard' || beforeHire.gold - hired.gold !== 6000) throw new Error('Bard contract was not paid');
    await game.locator('#nav-tab-tower').click();
    await game.locator('#btn-start-redwood').click(); await dismiss();
    const beforeTower = await data();
    await game.locator('#btn-challenge-castle-floor').click(); await battle(); await dismiss();
    const tower = await data();
    if (tower.castle.accumulatedGold !== 98 || tower.crystal - beforeTower.crystal !== 3) throw new Error('Tower omitted base crystals or bard bonus');
    await game.locator('#btn-claim-castle-exit').click(); await dismiss();
    if ((await data()).gold - beforeTower.gold !== 98) throw new Error('Tower bank withdrawal differs from earned gold');
    // Isolated floor fixture tests real boss battle, reward adapter and persisted replay behavior.
    await game.evaluate(() => {
      const state = window.gameState;
      state.data.castle.isExploring = true; state.data.castle.expeditionId = "tower-fixture"; state.data.castle.floor = 10; state.data.castle.finished = false;
      state.notify(); window.appInstance.views.tower.render();
    });
    const beforeFirst = await data();
    await game.locator('#btn-challenge-castle-floor').click(); await battle(); await dismiss();
    const first = await data();
    if (!first.castle.claimedBossRewards.includes(10) || first.crystal - beforeFirst.crystal !== 51 || !first.bag.some(item => item.id === 'courage_sword')) throw new Error('Tower boss first-clear reward missing');
    await game.reload(); await game.locator('#nav-tab-tower').click();
    await game.evaluate(() => { window.gameState.data.castle.floor = 10; window.gameState.notify(); window.appInstance.views.tower.render(); });
    const beforeReplay = await data();
    await game.locator('#btn-challenge-castle-floor').click(); await battle(); await dismiss();
    const replay = await data();
    if (replay.bag.filter(item => item.id === 'courage_sword').length !== beforeReplay.bag.filter(item => item.id === 'courage_sword').length || replay.crystal - beforeReplay.crystal !== 11) throw new Error('Reload allowed duplicate first-clear reward');
    await game.locator('#btn-claim-castle-exit').click(); await dismiss();
    await game.locator('#btn-subtab-dungeons').click();
    await game.locator('#btn-enter-dungeon').click(); await dismiss();
    const beforeDungeon = await data();
    for (let floor = 1; floor <= 5; floor++) {
      await game.locator('#btn-dungeon-fight').click(); await battle(); await dismiss();
    }
    if ((await data()).crystal - beforeDungeon.crystal !== 45) throw new Error('Dungeon bard reward must be one per victory plus 40 base boss crystals');
    if (errors.length) throw new Error(errors.join('; '));
    return { naturalHuntWins: 20, rationGain: 2, goldGain: 1740, persistedThief: true, paidBard: true, towerBankGold: 98, firstClearCrystal: 51, replayCrystal: 11, dungeonCrystal: 45, errors };
  } catch (error) {
    await game.screenshot({ path: 'output/playwright/mechanics-failure.png', fullPage: true });
    throw error;
  } finally { await context.close(); }
}
