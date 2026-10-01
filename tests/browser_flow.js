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
    const nav = async () => { await dismiss(); await game.locator('#btn-auto-nav-quest').click(); };
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
      await game.reload();
      if ((await data()).classId !== classId || await game.locator('#btn-confirm-character').isVisible()) throw new Error('Class persistence failed');
      await nav();
      await game.locator('#btn-claim-salary').click();
      await dismiss();
      if ((await data()).currentQuestId !== 'quest_2') throw new Error('Salary quest failed');
      await nav();
      for (let attempt = 0; attempt < 8 && (await data()).currentQuestId === 'quest_2'; attempt++) {
        await game.locator('#btn-do-enhance').click();
        await dismiss();
      }
      if ((await data()).currentQuestId !== 'quest_3') throw new Error('Enhancement quest failed');
      await nav();
      await game.locator('#btn-toggle-active-pet').click();
      await dismiss();
      await nav();
      await game.locator('#btn-do-wash-apt').click();
      await dismiss();
      await nav();
      await game.locator('.btn-learn-skill[data-book-id="book_crit"]').click();
      await dismiss();
      if ((await data()).currentQuestId !== 'quest_6') throw new Error('Pet quest chain failed');
      await nav();
      await game.locator('#btn-start-redwood').click();
      await dismiss();
      await game.locator('#btn-challenge-castle-floor').click();
      if (!await settleBattle()) throw new Error('First floor lost');
      if ((await data()).currentQuestId !== 'quest_7') throw new Error('Tower reward did not progress quest');
      await nav();
      await game.locator('.btn-brew-potion').first().click();
      await dismiss();
      await nav();
      await game.locator('.btn-hire-merc[data-merc-id="merc_cleric"]').click();
      await dismiss();
      if ((await data()).currentQuestId !== 'quest_9') throw new Error('Estate quest chain failed');
      await nav();
      let floors = 1;
      for (; floors < 10; floors++) {
        await game.locator('#btn-challenge-castle-floor').click();
        if (!await settleBattle()) throw new Error(`Tower lost at ${floors + 1}`);
      }
      const before = await data();
      if (before.castle.maxReachedFloor !== 10 || before.currentQuestId !== 'quest_10') throw new Error('Floor 10 progress wrong');
      await game.locator('#btn-claim-castle-exit').click();
      await dismiss();
      await nav();
      await game.locator('.btn-select-bag-gem').first().click();
      await game.locator('.btn-inlay-gem').first().click();
      await dismiss();
      if ((await data()).currentQuestId !== 'quest_11') throw new Error('Gem quest failed');
      // Normal reward progression: repeatedly defeat the accessible forest boss.
      await game.locator('#nav-tab-wild').click();
      let bossWins = 0;
      let mobWins = 0;
      while ((await data()).level < 20 && bossWins + mobWins < 400) {
        const isBoss = (await data()).level >= 15;
        if (isBoss) await game.locator('#btn-fight-wild-boss').click();
        else await game.locator('.btn-fight-mob').last().click();
        if (!await settleBattle()) throw new Error(`Forest fight lost after ${bossWins} boss / ${mobWins} mob wins`);
        if (isBoss) bossWins++; else mobWins++;
        const current = await data();
        if (current.pets.find(pet => pet.id === current.activePetId).stamina < 65) {
          await game.locator('#nav-tab-pets').click();
          await game.locator('#pet-subtab-overview').click();
          await game.locator('#btn-feed-pet').click();
          await dismiss();
          await game.locator('#nav-tab-wild').click();
        }
      }
      if ((await data()).level < 20) throw new Error('Normal rewards did not reach level 20');
      await game.locator('#nav-tab-town').click();
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
