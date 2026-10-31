async (page) => {
  const results = [];
  const check = (value, message) => { if (!value) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport, acceptDownloads: true });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const dismiss = async () => {
      for (let i = 0; i < 5 && await game.evaluate(() => window.gameModal.isOpen); i++) {
        await game.locator('#game-modal-btn-confirm').click();
      }
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click(); await dismiss();
      // Explicit admission/currency fixture; every purchase and contract below uses UI.
      await game.evaluate(async () => {
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const d = window.gameState.data;
        d.level = 50; d.currentQuestId = 'quest_14';
        for (let i = 1; i <= 13; i++) d.questProgress['quest_' + i] = { current: 1, completed: true, claimed: true };
        d.gold = 100000; d.crystal = 2000; d.prestige = 100; d.bag = [];
        d.pets = [{ id: 'golden_dragon', level: 1, exp: 0, tier: 'gold', stamina: 100, apt: { ...PET_CONFIGS.golden_dragon.defaultApt }, skills: [] }];
        d.activePetId = 'golden_dragon'; d.supportPetIds = [null, null];
        window.gameState.notify();
      });
      await game.locator('#nav-tab-hero').click();
      await game.locator('#btn-recommended-stats').click();
      await game.locator('#nav-tab-town').click();
      await game.locator('[data-goto="palace"]').click();
      await game.locator('[data-goto="palace_arena"]').click();
      await game.locator('#btn-arena-subtab-shop').click();
      const buy = game.locator('[data-shop-id="pet_egg"]');
      await buy.click(); await dismiss();
      check(await game.evaluate(() => window.gameState.data.prestige === 0 &&
        window.gameState.data.bag.filter(item => item.type === 'egg').reduce((n, item) => n + item.count, 0) === 1),
      'Purchase must charge exactly 100 prestige and deliver one egg');
      check(await buy.isDisabled(), 'Insufficient prestige must disable another purchase');
      await game.locator('#btn-next-journey').focus(); await game.keyboard.press('Enter');
      check(await game.locator('.btn-challenge-arena-opp').first().isVisible(),
        'Duel guidance stayed on the previously selected prestige shop: ' + JSON.stringify(await game.evaluate(async () => ({
          guide: (await import('/js/core/journey.js')).getJourneyGuidance(window.gameState.data),
          tab: window.appInstance.currentTab, view: window.appInstance.views.town.currentView,
          arenaSubTab: window.appInstance.views.town.arenaSubTab
        }))));
      await game.locator('#nav-tab-pets').click();
      const quote = await game.evaluate(() => window.gameState.getContractChoices().find(choice => choice.id === 'naga'));
      check(quote, 'Purchased egg cannot reach the chosen-contract consumer');
      await game.locator('#select-companion-contract').selectOption('naga');
      await game.locator('#btn-chosen-contract').focus(); await game.keyboard.press('Enter'); await dismiss();
      check(await game.evaluate(quote => {
        const d = window.gameState.data;
        return d.gold === 100000 - quote.gold && d.crystal === 2000 - quote.crystal &&
          d.prestige === 0 && d.pets.filter(pet => pet.id === 'naga').length === 1 && !d.bag.some(item => item.type === 'egg');
      }, quote), 'Contract must consume the quoted currencies and one egg exactly once');
      await game.locator('[data-assign-party="2"]').click();
      await game.screenshot({ path: `output/playwright/party-contract-${viewport.width}.png`, animations: 'disabled' });
      await game.locator('#nav-tab-hero').click();
      await game.locator('#btn-open-class-skills').click();
      await game.locator('[data-train-class="w_sk_1"]').click();
      await game.locator('#class-skill-priority').selectOption('w_sk_1');
      await game.locator('#btn-open-archive').click();
      const downloading = game.waitForEvent('download');
      await game.locator('#btn-archive-export-json').click();
      const download = await downloading, stream = await download.createReadStream();
      let backup = '';
      for await (const chunk of stream) backup += chunk.toString();
      const exported = JSON.parse(backup);
      check(exported.saveData.supportPetIds[1] === 'naga' && exported.saveData.skillTraining.ranks.w_sk_1 === 2,
        'Downloaded backup omitted party or cultivation');
      await game.locator('#btn-close-archive-modal').click();
      await game.locator('#nav-tab-pets').click();
      await game.locator('[data-clear-party="2"]').click();
      await game.locator('#btn-open-archive').click();
      const beforeImport = await game.evaluate(() => JSON.stringify(window.gameState.data));
      const malformed = JSON.parse(backup);
      malformed.saveData.supportPetIds = ['naga', 'naga'];
      await game.locator('#file-archive-import').setInputFiles({ name: 'duplicate-party.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(malformed)) });
      await game.locator('#game-modal-overlay').waitFor({ state: 'visible' });
      await dismiss();
      check(await game.evaluate(() => JSON.stringify(window.gameState.data)) === beforeImport, 'Invalid imported party changed the current save');
      await game.locator('#file-archive-import').setInputFiles({ name: 'party-backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
      await game.locator('#game-modal-overlay').waitFor({ state: 'visible' });
      await dismiss();
      await game.locator('#btn-close-archive-modal').click();
      await game.reload(); await dismiss();
      check(await game.evaluate(quote => {
        const d = window.gameState.data;
        return d.activePetId === 'golden_dragon' && d.supportPetIds[1] === 'naga' &&
          d.gold === 100000 - quote.gold && d.crystal === 2000 - quote.crystal && d.prestige === 0 &&
          d.skillTraining.ranks.w_sk_1 === 2 && d.skillTraining.preferredAttackId === 'w_sk_1';
      }, quote), 'Import/refresh lost party or cultivation, or repeated the charge');
      const legacy = JSON.parse(backup);
      legacy.saveData.gold = 77777;
      legacy.saveData.crystal = 1701;
      legacy.saveData.pets = legacy.saveData.pets.filter(pet => pet.id === 'golden_dragon');
      legacy.saveData.estate.activePotions = [{
        id: 'pot_titan', effect: { hpMultiplier: 1.35, defMultiplier: 1.25, fights: 3 }, remainingFights: 2
      }];
      delete legacy.saveData.supportPetIds;
      delete legacy.saveData.skillTraining;
      await game.locator('#btn-open-archive').click();
      await game.locator('#file-archive-import').setInputFiles({ name: 'legacy-single-pet.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
      await game.locator('#game-modal-overlay').waitFor({ state: 'visible' });
      await dismiss();
      await game.locator('#btn-close-archive-modal').click();
      await game.reload(); await dismiss();
      check(await game.evaluate(async () => {
        const { getSkillTraining } = await import('/js/config/classes.js');
        const d = window.gameState.data;
        return d.activePetId === 'golden_dragon' && JSON.stringify(d.supportPetIds) === JSON.stringify([null, null]) &&
          !d.pets.some(pet => pet.id === 'naga') && d.gold === 77777 && d.crystal === 1701 &&
          JSON.stringify(d.skillTraining) === JSON.stringify({ ranks: {}, preferredAttackId: null }) &&
          getSkillTraining(d).available === 41;
      }), 'Legacy single-pet save did not migrate once to empty supports and unspent skill budget');
      check(!await game.locator('#character-select-overlay').isVisible(), 'Legacy import reopened class choice');
      const potion = await game.evaluate(() => {
        const d = window.gameState.data, boosted = window.gameState.getEffectiveStats();
        const plain = structuredClone(d);
        plain.estate.activePotions = [];
        return import('/js/core/state.js').then(({ GameState }) => {
          const reference = new GameState(); reference.data = plain;
          return { boosted, base: reference.getEffectiveStats(), potions: d.estate.activePotions };
        });
      });
      check(potion.potions.length === 1 && potion.potions[0].remainingFights === 2 &&
        Math.abs(potion.boosted.maxHp - potion.base.maxHp * 1.35) < 2 &&
        Math.abs(potion.boosted.def - potion.base.def * 1.25) < 2, 'Imported legacy potion lost its expiry or complete-loadout bonus');
      await game.locator('#nav-tab-pets').click();
      const ownedCard = game.locator('[data-pet-id="golden_dragon"]');
      await ownedCard.focus(); await game.keyboard.press('Enter');
      check(await ownedCard.evaluate(element => element === document.activeElement), 'Migrated companion selection lost keyboard focus');
      check(await game.evaluate(() => document.body.scrollWidth <= innerWidth &&
        document.documentElement.scrollWidth <= innerWidth), 'Legacy party UI has horizontal overflow');
      check(errors.length === 0, errors.join('; '));
      results.push({ ...viewport, currencyFixture: true, prestigeSpent: 100, goldSpent: quote.gold, crystalSpent: quote.crystal, eggsConsumed: 1, assignedSupport: 2, downloadedAndImported: true, corruptPartyRejected: true, cultivationRestored: true, legacySinglePetMigrated: true, keyboardFocusRetained: true, horizontalOverflow: false, refresh: true, errors });
    } finally { await context.close(); }
  }
  return results;
}
