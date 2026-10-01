async (page) => {
  // Isolated late-game fixture verifies UI/settlement; it is not evidence of natural progression or balance.
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } });
  const game = await context.newPage();
  const errors = [];
  game.on('pageerror', e => errors.push(e.message));
  game.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const dismiss = async () => {
    for (let i = 0; i < 8; i++) {
      if (!await game.evaluate(() => window.gameModal.isOpen)) {
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
        return;
      }
      await game.locator('#game-modal-btn-confirm').click();
    }
    throw new Error('Modal did not settle');
  };
  const state = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  const battle = async () => {
    await game.locator('#btn-skip-battle').click();
    if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Fixture battle lost');
    await game.locator('#btn-confirm-battle').click();
    await dismiss();
  };
  try {
    await game.goto('http://127.0.0.1:8088', { timeout: 60000 });
    await game.locator('[data-class-id="mage"]').click();
    await game.locator('#btn-confirm-character').click();
    await game.evaluate(() => {
      const data = window.gameState.data;
      data.level = 80; data.gold = 1000000; data.crystal = 100000; data.prestige = 100000;
      data.equipped.weapon.stats = { atk: 100000, hp: 1000000, def: 10000 };
      window.gameState.notify();
    });
    const townViews = ['hub', 'smithy', 'smithy_enhance', 'smithy_socket', 'smithy_repair',
      'smithy_smelt', 'smithy_reforge', 'smithy_runes', 'palace', 'palace_salary', 'palace_trials',
      'palace_arena', 'dragons', 'fishing', 'tavern', 'tavern_bounty', 'tavern_mercenary', 'tavern_drinks', 'faction_war'];
    const routes = [];
    for (const view of townViews) {
      await game.evaluate(view => { window.appInstance.views.town.currentView = view; window.switchMainTab('town'); }, view);
      const text = await game.locator('#tab-content-town').innerText();
      if (!text.trim() || text.includes('undefined') || text.includes('NaN')) throw new Error(`Invalid town view ${view}`);
      routes.push(`town/${view}`);
    }
    for (const view of ['hub', 'alchemy', 'resources', 'mercenaries', 'slaves']) {
      await game.evaluate(view => { window.appInstance.views.estate.currentView = view; window.switchMainTab('estate'); }, view);
      const text = await game.locator('#tab-content-estate').innerText();
      if (text.includes('加载异常') || text.includes('undefined')) throw new Error(`Invalid estate view ${view}`);
      routes.push(`estate/${view}`);
    }
    for (const tab of ['hero', 'equip', 'bag', 'pets', 'wild', 'tower']) {
      await game.locator(`#nav-tab-${tab}`).click();
      routes.push(tab);
    }
    await game.evaluate(() => { window.appInstance.views.town.currentView = 'dragons'; window.switchMainTab('town'); });
    for (const id of ['slay_red_dragon', 'slay_silver_dragon', 'slay_golden_dragon']) {
      await game.locator(`.btn-fight-dragon[data-dragon-id="${id}"]`).click();
      await battle();
    }
    let data = await state();
    if (data.dragon.trialsLeft !== 0 || !data.bag.some(item => item.id === 'crystal_purplegold') ||
      !data.bag.some(item => item.id === 'destiny_stone')) throw new Error('Dragon rewards or daily quota wrong');
    await game.locator('#nav-tab-tower').click();
    await game.locator('#btn-subtab-dungeons').click();
    const gates = [['trial_gate', 5], ['courage_gate', 5], ['mirage_gate', 10], ['death_gate', 10],
      ['storm_gate', 10], ['dragon_gate', 10], ['spacetime_gate', 15]];
    for (let index = 0; index < gates.length; index++) {
      const [id, floors] = gates[index];
      await game.locator(`.dungeon-gate-card[data-gate-id="${id}"]`).click();
      if (index === 5) {
        if (await game.locator('#btn-enter-dungeon').count()) throw new Error('Exhausted quota still displayed dungeon entry');
        if ((await state()).dungeon.activeGateId) throw new Error('Exhausted quota allowed dungeon entry');
        // Clock fixture only: emulate next day to verify the existing reset mechanism.
        await game.evaluate(() => { window.gameState.data.dailyResetDate = 'previous fixture day'; });
        await game.locator('#nav-tab-tower').click();
      }
      await game.locator('#btn-enter-dungeon').click();
      await dismiss();
      for (let floor = 1; floor <= floors; floor++) {
        await game.locator('#btn-dungeon-fight').click();
        await battle();
      }
      if ((await state()).dungeon.clearedGates[id] !== 1) throw new Error(`Dungeon ${id} did not settle once`);
    }
    data = await state();
    if (!data.dungeon.clearedGates.trial_gate || data.dungeon.activeGateId) throw new Error('Dungeon did not settle');
    const repair = async () => {
      await game.evaluate(() => { window.appInstance.views.town.currentView = 'smithy_repair'; window.switchMainTab('town'); });
      await game.locator('#btn-repair-all').click();
      await dismiss();
      await game.locator('#nav-tab-tower').click();
    };
    await repair();
    await game.locator('#btn-subtab-castle').click();
    await game.locator('#btn-start-bronze').click();
    await dismiss();
    for (let floor = 50; floor <= 100; floor++) {
      if (floor === 70 || floor === 90) await repair();
      await game.locator('#btn-challenge-castle-floor').click();
      await battle();
    }
    data = await state();
    if (data.castle.maxReachedFloor !== 100 || data.relics.unlocked.length !== 6) throw new Error('Tower/relic progression failed');
    await game.locator('#btn-subtab-relics').click();
    if ((await game.locator('#tab-content-tower').innerText()).includes('undefined')) throw new Error('Invalid relic display');
    const result = { routes, dragonTrialsLeft: data.dragon.trialsLeft, dungeon: data.dungeon.clearedGates,
      maxFloor: data.castle.maxReachedFloor, relics: data.relics.unlocked,
      errors, fixture: 'Level 80 / boosted gear: integration only' };
    await game.reload();
    if ((await state()).dungeon.entriesLeft !== data.dungeon.entriesLeft) throw new Error('Reload reset quota');
    if (errors.length) throw new Error(errors.join('; '));
    return result;
  } catch (error) {
    await game.screenshot({ path: 'output/playwright/subsystems-failure.png', fullPage: true });
    throw error;
  } finally { await context.close(); }
}
