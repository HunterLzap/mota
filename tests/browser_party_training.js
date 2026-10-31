async (page) => {
  const results = [];
  const check = (value, message) => { if (!value) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    for (const classId of ['warrior', 'mage', 'hunter']) {
      const context = await page.context().browser().newContext({ viewport });
      const game = await context.newPage(), errors = [];
      game.on('pageerror', error => errors.push(error.message));
      const dismiss = async () => {
        for (let i = 0; i < 5 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      };
      const hit = async selector => {
        const locator = game.locator(selector);
        await locator.scrollIntoViewIfNeeded();
        check(await locator.evaluate(element => {
          const r = element.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return (top === element || element.contains(top)) && r.right <= innerWidth && r.bottom <= innerHeight;
        }), 'Covered or clipped: ' + selector);
      };
      try {
        await game.goto('http://127.0.0.1:8088');
        await game.locator(`[data-class-id="${classId}"]`).click();
        await game.locator('#btn-confirm-character').click(); await dismiss();
        await game.locator('#nav-tab-hero').click();
        await game.locator('#btn-open-class-skills').click();
        const firstId = { warrior: 'w', mage: 'm', hunter: 'h' }[classId] + '_sk_1';
        await hit(`[data-train-class="${firstId}"]`);
        await game.locator(`[data-train-class="${firstId}"]`).focus(); await game.keyboard.press('Enter');
        check(await game.evaluate(id => window.gameState.data.skillTraining.ranks[id] === 2, firstId), 'Initial earned point did not train');
        check(await game.locator('[data-train-class]:enabled').count() === 0, 'Insufficient points not disabled');
        await game.reload(); await dismiss();
        check(await game.locator('#character-select-overlay').count() === 0 || !await game.locator('#character-select-overlay').isVisible(), 'Class selection reopened');
        // Explicit party/integration fixture; initial skill point above used an untouched new save.
        await game.evaluate(async () => {
          const { PET_CONFIGS } = await import('/js/config/pets.js');
          const data = window.gameState.data;
          data.level = 50; data.currentQuestId = 'quest_15';
          for (let i = 1; i <= 14; i++) data.questProgress['quest_' + i] = { current: 1, completed: true, claimed: true };
          data.pets = ['golden_dragon', 'naga', 'white_angel', 'gryphon'].map(id => ({ id, level: 1, exp: 0, tier: 'gold', stamina: 100, apt: { ...PET_CONFIGS[id].defaultApt }, skills: [] }));
          data.activePetId = 'golden_dragon'; data.supportPetIds = [null, null];
          window.gameState.notify();
        });
        await game.locator('#nav-tab-pets').click();
        await game.locator('[data-pet-id="naga"]').focus(); await game.keyboard.press('Enter');
        check(await game.locator('[data-pet-id="naga"]').evaluate(element => element === document.activeElement), 'Keyboard pet selection lost focus after redraw');
        await hit('[data-assign-party="1"]'); await game.locator('[data-assign-party="1"]').click();
        check(await game.locator('[data-pet-id="naga"]').evaluate(element => element === document.activeElement), 'Party assignment must restore focus to its companion card');
        await game.locator('[data-pet-id="white_angel"]').click();
        await game.locator('[data-assign-party="2"]').click();
        await game.locator('[data-pet-id="naga"]').click();
        await game.locator('#btn-toggle-active-pet').click(); await dismiss();
        check(await game.evaluate(() => JSON.stringify([window.gameState.data.activePetId, ...window.gameState.data.supportPetIds]) === JSON.stringify(['naga', 'golden_dragon', 'white_angel'])), 'Swap duplicated or lost companion');
        await game.screenshot({ path: `output/playwright/party-${viewport.width}-${classId}.png`, animations: 'disabled' });
        await game.locator('[data-clear-party="1"]').focus(); await game.keyboard.press('Enter');
        check(await game.evaluate(() => window.gameState.data.supportPetIds[0] === null), 'Keyboard remove failed');
        check(await game.locator('.pet-select-card.is-selected').evaluate(element => element === document.activeElement), 'Party removal lost keyboard focus');
        await game.locator('[data-pet-id="golden_dragon"]').click(); await game.locator('[data-assign-party="1"]').click();
        await game.locator('#nav-tab-hero').click(); await game.locator('#btn-open-class-skills').click();
        const before = await game.evaluate(() => window.gameState.getEffectiveStats().atk);
        await game.locator(`[data-train-class="${firstId}"]`).click();
        await game.locator('#class-skill-priority').selectOption(firstId);
        check(await game.evaluate(id => window.gameState.data.skillTraining.ranks[id] === 3 && window.gameState.data.skillTraining.preferredAttackId === id, firstId), 'Cultivation/priority failed');
        check(await game.evaluate(() => window.gameState.getEffectiveStats().atk) === before, 'Active cultivation changed passive attack');
        await game.screenshot({ path: `output/playwright/training-${viewport.width}-${classId}.png`, animations: 'disabled' });
        check(await game.evaluate(() => document.body.scrollWidth <= innerWidth && document.querySelector('.class-training-grid').scrollWidth <= document.querySelector('.class-training-grid').clientWidth + 1), 'Training horizontal overflow');
        await game.locator('#nav-tab-wild').click();
        const expectedInterval = await game.evaluate(async () => {
          const { getPlayerActionInterval } = await import('/js/core/combat.js');
          return getPlayerActionInterval(window.gameState.getEffectiveStats(), window.gameState.data).toFixed(2);
        });
        check(await game.locator('#classic-stat-interval').innerText() === expectedInterval, 'Sidebar cadence differs from production');
        const combatButton = game.locator('[data-mob-idx="0"]');
        await combatButton.click();
        check(await game.locator('#b-player-interval').innerText() === expectedInterval, 'Battle cadence differs from sidebar');
        check(await game.locator('#battle-overlay').innerText().then(text => text.includes('副宠1') && text.includes('副宠2')), 'Battle snapshot missing supports');
        await game.locator('#btn-skip-battle').click();
        await game.locator('#btn-confirm-battle').click(); await dismiss();
        check(await game.evaluate(() => window.gameState.data.pets.find(p => p.id === 'naga').stamina === 97 && window.gameState.data.pets.find(p => p.id === 'golden_dragon').stamina === 99), 'Party upkeep did not settle');
        await game.reload(); await dismiss();
        check(await game.evaluate(id => window.gameState.data.skillTraining.ranks[id] === 3 && window.gameState.data.supportPetIds[1] === 'white_angel', firstId), 'Party/training refresh lost data');
        await game.locator('#nav-tab-pets').click();
        await game.locator('[data-pet-id="gryphon"]').click();
        check((await game.locator('#pet-panel-body').innerText()).includes('反击几率增加 10%'), 'Gryphon description differs from the documented 10%');
        await game.locator('[data-assign-party="1"]').click();
        check(await game.evaluate(async () => {
          const { getPartyTraits } = await import('/js/core/petParty.js');
          return getPartyTraits(window.gameState.data).counterBoost === 30;
        }), 'Naga and gryphon must contribute 30% innate counter in the selected UI party');
        check(errors.length === 0, errors.join('; '));
        results.push({ ...viewport, classId, naturalInitialSkillPoint: true, partyFixture: true, battleAndRefresh: true, documentedCounterParty: true, errors });
      } finally { await context.close(); }
    }
  }
  return results;
}
