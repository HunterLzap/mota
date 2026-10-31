async (page) => {
  const browser = page.context().browser();
  const results = [];
  for (const classId of ['warrior', 'hunter', 'mage']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const game = await context.newPage();
    const errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const dismiss = async () => {
      for (let i = 0; i < 5; i++) {
        if (!await game.evaluate(() => window.gameModal.isOpen)) {
          await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
          return;
        }
        await game.locator('#game-modal-btn-confirm').click();
      }
      throw new Error('Modal did not settle');
    };
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const nav = async () => {
      await dismiss();
      while (true) {
        const action = await game.evaluate(async () => (await import('/js/core/journey.js')).getJourneyGuidance(window.gameState.data)?.action);
        if (!['allocate_stats', 'feed_pet'].includes(action)) break;
        await game.locator('#btn-next-journey').click();
        await game.locator(action === 'allocate_stats' ? '#btn-recommended-stats' : '#btn-feed-pet').click();
        await dismiss();
      }
      await game.locator('#btn-next-journey').click(); await dismiss();
    };
    const claim = async () => { await game.locator('#btn-claim-quest-reward').click(); await dismiss(); };
    const settleBattle = async () => {
      await game.locator('#btn-skip-battle').click();
      const won = await game.evaluate(() => window.appInstance.battleView.currentCombat.victory);
      await game.locator('#btn-confirm-battle').click();
      await dismiss();
      return won;
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator(`[data-class-id="${classId}"]`).click();
      await game.locator('#input-hero-name').fill(`Test ${classId}`);
      await game.locator('#btn-confirm-character').click();
      const empty = await data();
      if (empty.bag.length || empty.pets.length || Object.values(empty.equipped).some(Boolean) || empty.gold || empty.crystal || empty.prestige) throw new Error('New save preloaded possessions');
      await dismiss();
      await game.reload();
      if ((await data()).classId !== classId || await game.locator('#btn-confirm-character').isVisible()) throw new Error('Class persistence failed');
      if ((await data()).currentQuestId !== 'quest_2') throw new Error('Guard commission failed');
      for (const id of ['novice_weapon', 'novice_armor']) {
        const gear = (await data()).bag.find(item => item.id === id);
        await game.locator('#nav-tab-bag').click();
        await game.locator(`[data-bag-uid="${gear.uid}"]`).click();
        await game.locator('#btn-bag-equip-item').click(); await dismiss();
      }
      await nav();
      await game.locator('.btn-fight-mob').first().click();
      if (!await settleBattle()) throw new Error('First investigation lost');
      await claim();
      if ((await data()).currentQuestId !== 'quest_3') throw new Error('Investigation quest failed');
      await nav();
      await game.locator('#btn-do-enhance').click(); await dismiss(); await claim();
      if ((await data()).currentQuestId !== 'quest_4') throw new Error('Enhancement quest failed');
      await nav();
      await game.locator('#btn-hatch-egg').click(); await dismiss();
      await game.locator('#btn-toggle-active-pet').click();
      await dismiss(); await claim();
      await nav();
      await game.locator('.btn-learn-skill[data-book-id="book_crit"]').click();
      await dismiss(); await claim();
      if ((await data()).currentQuestId !== 'quest_6') throw new Error('Pet quest chain failed');
      await nav();
      await game.locator('#btn-start-redwood').click();
      await dismiss();
      await game.locator('#btn-challenge-castle-floor').click();
      if (!await settleBattle()) throw new Error('First floor lost');
      await claim();
      if ((await data()).currentQuestId !== 'quest_7') throw new Error('Tower reward did not progress quest');
      await nav();
      await game.locator('#btn-claim-castle-exit').click(); await dismiss();
      await nav();
      await game.locator('.btn-brew-potion').first().click();
      await dismiss(); await claim();
      await nav();
      const mercId = { warrior: 'merc_cleric', hunter: 'merc_bard', mage: 'merc_paladin' }[classId];
      await game.locator(`.btn-hire-merc[data-merc-id="${mercId}"]`).click();
      await dismiss(); await claim();
      if ((await data()).currentQuestId !== 'quest_9') throw new Error('Estate quest chain failed');
      await nav();
      await game.locator('#btn-start-redwood').click(); await dismiss();
      for (let floor = 1; floor <= 10; floor++) {
        await game.locator('#btn-challenge-castle-floor').click();
        if (!await settleBattle()) throw new Error(`Tower lost at ${floor}`);
      }
      await claim();
      const before = await data();
      if (before.castle.maxReachedFloor !== 10 || before.currentQuestId !== 'quest_10') throw new Error('Floor 10 progress wrong');
      await game.locator('#btn-claim-castle-exit').click();
      await dismiss();
      const courage = (await data()).bag.find(item => item.id === 'courage_sword');
      await game.locator('#nav-tab-bag').click();
      await game.locator(`[data-bag-uid="${courage.uid}"]`).click();
      await game.locator('#btn-bag-equip-item').click(); await dismiss();
      await nav();
      await game.locator('#btn-punch-socket').click(); await dismiss();
      await game.locator('.btn-select-bag-gem').first().click();
      await game.locator('.btn-inlay-gem').first().click();
      await dismiss(); await claim();
      if ((await data()).currentQuestId !== 'quest_11') throw new Error('Gem quest failed');
      // Earn levels through the finite investigations offered to a new character.
      let bossWins = 0;
      let mobWins = 0;
      for (const [eventId, count, isBoss] of [['patrol_tracks', 4, false], ['patrol_wolf', 1, true]]) {
        await nav();
        for (let i = 0; i < count; i++) {
          await game.locator(isBoss ? '#btn-fight-wild-boss' : '.btn-fight-mob').last().click();
          if (!await settleBattle()) throw new Error('Earned investigation lost: ' + eventId);
          if (isBoss) bossWins++; else mobWins++;
          // Allocate newly earned potential between successive investigation fights.
          if (i < count - 1) await nav();
        }
        if (!(await data()).questProgress[eventId]?.completed) throw new Error('Investigation not completed: ' + eventId);
        await game.locator('#btn-next-journey').click(); await dismiss();
        if (!(await data()).questProgress[eventId]?.claimed) throw new Error('Investigation not delivered: ' + eventId);
      }
      if ((await data()).level < 20) throw new Error('Normal rewards did not reach level 20');
      await game.locator('#nav-tab-hero').click();
      if (await game.locator('#btn-recommended-stats').isEnabled()) await game.locator('#btn-recommended-stats').click();
      await game.locator('#nav-tab-town').click();
      if (await game.locator('[data-goto="smithy"]').first().isVisible()) {
        await game.locator('[data-goto="smithy"]').first().click();
      }
      if (await game.locator('[data-goto="hub"]').first().isVisible()) {
        await game.locator('[data-goto="hub"]').first().click();
      }
      await game.locator('[data-goto="palace"]').first().click();
      await game.locator('[data-goto="palace_trials"]').first().click();
      await game.locator('#btn-challenge-trial').click();
      if (!await settleBattle()) throw new Error('First promotion lost');
      if ((await data()).royalTrials.completedStage !== 1) throw new Error('First promotion not recorded');
      const after = await data();
      await game.reload();
      if ((await data()).level !== after.level) throw new Error('Reload lost experience');
      if (errors.length) throw new Error(errors.join('; '));
      results.push({ classId, level: after.level, quest: after.currentQuestId, maxFloor: after.castle.maxReachedFloor,
        bossWins, mobWins, promotion: after.royalTrials.completedStage, errors });
      await game.screenshot({ path: `output/playwright/${classId}-early.png`, fullPage: true });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/${classId}-failure.png`, fullPage: true });
      throw error;
    } finally { await context.close(); }
  }
  return results;
}
