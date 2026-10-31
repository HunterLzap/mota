async (page) => {
  const results = [];
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const click = selector => game.locator(selector).click();
    try {
      await game.goto('http://127.0.0.1:8088');
      await click('[data-class-id="warrior"]'); await click('#btn-confirm-character');
      for (let i = 0; i < 5 && await game.evaluate(() => window.gameModal.isOpen); i++) await click('#game-modal-btn-confirm');
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      // Explicit late-game fixture; preparation, consumption and refresh use the real UI.
      await game.evaluate(() => {
        const d = window.gameState.data;
        Object.assign(d, { level: 85, freeStatPoints: 0, currentQuestId: 'quest_26', gold: 10000, crystal: 0 });
        for (let i = 1; i <= 25; i++) d.questProgress['quest_' + i] = { current: 1, completed: true, claimed: true };
        d.royalTrials.completedStage = 7;
        d.equipped.weapon = { uid: 'prepared_weapon', id: 'prepared_weapon', slot: 'weapon', reqClass: 'warrior',
          reqLevel: 80, quality: 'darkgold', stars: 2, durability: 100, maxDurability: 100, stats: { atk: 1400 }, gems: [] };
        d.equipped.armor = { uid: 'prepared_armor', id: 'prepared_armor', slot: 'armor', reqClass: 'warrior',
          reqLevel: 80, quality: 'darkgold', stars: 0, durability: 100, maxDurability: 100, stats: { hp: 6000, def: 800 }, gems: [] };
        Object.assign(d.castle, { isExploring: true, floor: 98, maxReachedFloor: 97, finished: false,
          expeditionId: 'preparation_fixture', accumulatedExp: 1234, accumulatedGold: 5678 });
        d.estate.herbs = { herb_dragonblood: 3, herb_starlight: 2, herb_spiritflower: 0 };
        d.estate.activePotions = [];
        window.gameState.notify();
      });
      const before = await game.evaluate(() => ({ stats: window.gameState.getEffectiveStats(),
        castle: structuredClone(window.gameState.data.castle) }));
      await game.locator('#btn-next-journey').focus(); await game.keyboard.press('Enter');
      const titan = game.locator('[data-recipe-id="pot_titan"]');
      check(await titan.isEnabled(), 'Available final preparation is disabled');
      check(await game.locator('.btn-brew-potion:disabled').count() === 3, 'Missing herbs must natively disable other recipes');
      await titan.focus(); await game.keyboard.press('Enter');
      await game.locator('#game-modal-overlay').waitFor({ state: 'visible' });
      await game.keyboard.press('Escape');
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      check(await game.evaluate(() => document.activeElement?.matches('button[data-goto="hub"]')),
        'Using the last herbs must return focus to an enabled control even after Escape');
      const prepared = await game.evaluate(() => ({ stats: window.gameState.getEffectiveStats(),
        data: JSON.parse(JSON.stringify(window.gameState.data)) }));
      check(Math.abs(prepared.stats.maxHp - before.stats.maxHp * 1.35) < 2 &&
        Math.abs(prepared.stats.def - before.stats.def * 1.25) < 2, 'Potion missed equipped or title attributes');
      check(prepared.data.estate.herbs.herb_dragonblood === 0 && prepared.data.estate.herbs.herb_starlight === 0 &&
        prepared.data.estate.activePotions[0].remainingFights === 3, 'Preparation did not spend actual herbs');
      check(JSON.stringify(prepared.data.castle) === JSON.stringify(before.castle), 'Alchemy changed the live expedition or bank');
      await game.reload();
      await game.waitForFunction(() => window.gameState?.data?.hasChosenClass);
      check(await game.evaluate(expected => {
        const d = window.gameState.data;
        return JSON.stringify(d.estate) === JSON.stringify(expected.estate) &&
          JSON.stringify(d.castle) === JSON.stringify(expected.castle) &&
          d.gold === expected.gold && d.crystal === expected.crystal;
      }, prepared.data), 'Refresh changed the potion, resources or expedition');
      await click('#nav-tab-estate'); await click('.btn-estate-goto[data-goto="alchemy"]');
      await game.evaluate(() => {
        window.gameState.data.estate.herbs = { herb_dragonblood: 6, herb_starlight: 6, herb_spiritflower: 6 };
        window.gameState.notify();
      });
      check(await game.locator('[data-recipe-id="pot_dragonblood"]').isDisabled(), 'Missing magic crystals must disable the permanent potion');
      check(await game.getByText('魔晶 x60 (存:0)', { exact: true }).isVisible(), 'The disabled recipe must show its actual magic crystal cost and balance');
      await game.evaluate(() => {
        window.gameState.data.crystal = 60;
        window.gameState.data.estate.permanentPotionPoints = 100;
        window.gameState.notify();
      });
      check(await game.locator('[data-recipe-id="pot_dragonblood"]').isDisabled(), 'The permanent potential cap must disable more purchases');
      await game.locator('[data-recipe-id="pot_dragonblood"]').scrollIntoViewIfNeeded();
      check(await game.evaluate(() => document.querySelector('[data-recipe-id="pot_dragonblood"]').getBoundingClientRect().bottom <=
        document.querySelector('.classic-footer').getBoundingClientRect().top), 'Alchemy actions cannot scroll above the fixed footer');
      check(await game.evaluate(() => document.body.scrollWidth <= innerWidth), 'Alchemy horizontal overflow');
      check(!errors.length, errors.join('; '));
      await game.screenshot({ path: `output/playwright/growth-preparation-${viewport.width}.png` });
      results.push({ ...viewport, explicitLateGameFixture: true, herbsSpent: [3, 2], potionFights: 3,
        wholeLoadoutBonus: true, keyboardEnterAndEscape: true, disabledFocusFallback: true,
        expeditionRetained: true, refresh: true, currencyAndCapDisabled: true, horizontalOverflow: false, errors });
    } finally { await context.close(); }
  }
  return results;
}
