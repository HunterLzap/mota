async (page) => {
  const results = [];
  const check = (value, message) => { if (!value) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [];
    game.setDefaultTimeout(8000);
    game.on('pageerror', error => errors.push(error.message));
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const overflow = async () => check(await game.evaluate(() => document.body.scrollWidth <= innerWidth), 'Horizontal overflow');
    const dismiss = async () => {
      for (let i = 0; i < 5 && await game.evaluate(() => window.gameModal.isOpen); i++) {
        await game.locator('#game-modal-btn-confirm').click();
      }
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const keyboard = async selector => {
      await game.locator(selector).focus();
      await game.keyboard.press('Enter');
    };
    const fight = async roll => {
      await game.locator('#nav-tab-wild').click();
      const before = await data();
      await game.evaluate(roll => { window.survivalOriginalRandom = Math.random; Math.random = () => roll; }, roll);
      await game.locator('#btn-fight-wild-boss').click();
      await game.evaluate(() => { Math.random = window.survivalOriginalRandom; });
      await game.locator('#btn-skip-battle').click();
      const combat = await game.evaluate(() => JSON.parse(JSON.stringify(window.appInstance.battleView.currentCombat)));
      await overflow();
      check(await game.locator('#combat-log-stream').innerText().then(text => text.includes('战斗')), 'Combat report not rendered');
      await game.screenshot({ path: `output/playwright/survival-${viewport.width}-${roll}-${before.pets.find(p => p.id === 'pixie').stamina}.png` });
      await keyboard('#btn-confirm-battle'); await dismiss();
      const after = await data();
      for (const id of before.supportPetIds.filter(Boolean)) {
        check(after.pets.find(p => p.id === id).stamina === Math.max(0, before.pets.find(p => p.id === id).stamina - 1),
          'Support maintenance did not settle once: ' + id);
      }
      await game.reload(); await dismiss();
      const loaded = await data();
      for (const key of ['level', 'exp', 'gold', 'crystal', 'prestige', 'pets', 'supportPetIds', 'bag']) {
        check(JSON.stringify(loaded[key]) === JSON.stringify(after[key]), 'Refresh changed ' + key);
      }
      check(!await game.locator('#char-select-overlay').isVisible(), 'Refresh reopened class choice');
      await overflow();
      return combat;
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click();
      const text = await game.locator('#game-modal-message').innerText();
      for (const phrase of ['苏醒', '古代亚诺人', '千年前', '魔塔再次重现', '萨格尔', '克斯特', '亚丁', '巡逻队']) {
        check(text.includes(phrase), 'Opening omitted ' + phrase);
      }
      await game.screenshot({ path: `output/playwright/survival-prologue-${viewport.width}.png` });
      await overflow();
      const beforeAccept = await data();
      await game.keyboard.press('Escape');
      check(JSON.stringify(await data()) === JSON.stringify(beforeAccept), 'Cancelling the guard conversation paid rewards');
      check(await game.locator('#btn-next-journey').evaluate(element => document.activeElement === element), 'Guard cancel lost focus');
      await keyboard('#btn-next-journey');
      await keyboard('#game-modal-btn-confirm'); await dismiss();
      check((await data()).currentQuestId === 'quest_2' && (await data()).bag.filter(item => item.slot).length === 2,
        'Canonical opening broke the actual guard reward');

      // Explicit low-power level/pet fixture; production boss and settlement stay intact.
      // Rolls isolate trait boundaries, not natural acquisition or campaign balance.
      await game.evaluate(async () => {
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const d = window.gameState.data;
        d.level = 15; d.exp = 0; d.currentQuestId = 'quest_15';
        for (let i = 1; i <= 14; i++) d.questProgress['quest_' + i] = { current: 1, completed: true, claimed: true };
        d.pets = ['pixie', 'phoenix'].map(id => ({
          id, level: 1, exp: 0, stamina: id === 'pixie' ? 61 : 100, tier: PET_CONFIGS[id].defaultTier,
          apt: { ...PET_CONFIGS[id].defaultApt }, skills: []
        }));
        d.activePetId = null; d.supportPetIds = [null, null];
        window.gameState.notify();
      });
      await game.locator('#nav-tab-pets').click();
      await keyboard('[data-pet-id="pixie"]');
      check((await game.locator('#pet-panel-body').innerText()).includes('50%'), 'Pixie description is stale');
      check((await game.locator('#pet-panel-body').innerText()).includes('持续伤害'), 'Missing poison limitation');
      await keyboard('[data-assign-party="1"]');
      check(await game.locator('[data-pet-id="pixie"]').evaluate(element => document.activeElement === element), 'Assigning support lost focus');
      await game.locator('[data-pet-id="phoenix"]').click();
      check((await game.locator('#pet-panel-body').innerText()).includes('30%') &&
        (await game.locator('#pet-panel-body').innerText()).includes('20%'), 'Phoenix description is stale');
      await game.locator('[data-assign-party="2"]').click();
      await game.screenshot({ path: `output/playwright/survival-party-${viewport.width}.png` });
      const first = await fight(0.4);
      const second = await fight(0.4);
      for (const result of [first, second]) {
        check(result.victory && result.logs.filter(log => log.message.includes('小妖精·假死')).length >= 2,
          'Repeated lethal protection did not reach the real browser battle');
        check(!result.logs.some(log => log.message.includes('凤凰·涅槃')), 'A 40 percent roll revived the phoenix');
      }
      check((await data()).pets.find(p => p.id === 'pixie').stamina === 59, 'Two real fights did not cross the fatigue boundary');
      const tired = await fight(0.4);
      check(!tired.victory && !tired.logs.some(log => log.message.includes('小妖精·假死')), 'Exhausted support still prevented death');
      await game.locator('#nav-tab-pets').click();
      await keyboard('[data-clear-party="1"]');
      await game.locator('[data-pet-id="phoenix"]').click();
      await game.locator('[data-assign-party="1"]').click();
      check(JSON.stringify((await data()).supportPetIds) === JSON.stringify(['phoenix', null]), 'Phoenix swap duplicated a slot');
      const maxHp = await game.evaluate(() => window.gameState.getEffectiveStats().maxHp);
      const revived = await fight(0.29999);
      const heals = revived.logs.filter(log => log.message.includes('凤凰·涅槃'));
      check(heals.length === 1 && heals[0].playerHp === Math.max(1, Math.floor(maxHp * 0.2)), 'Phoenix did not restore exactly 20 percent once');
      const boundary = await fight(0.3);
      check(!boundary.logs.some(log => log.message.includes('凤凰·涅槃')), 'Phoenix roll included the 30 percent boundary');
      check(errors.length === 0, errors.join('; '));
      results.push({ ...viewport, battles: 5, newOpeningAcceptedOnce: true, repeatedFeign: true,
        earnedFatigueDisabledTrait: true, phoenixProbabilityAndRecovery: true, refreshes: 5,
        keyboardAndFocus: true, horizontalOverflow: false, errors,
        fixture: 'Level 15 and owned pets supplied; all assignment, fights and settlement through UI; fixed combat rolls only' });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/survival-failure-${viewport.width}.png` });
      throw error;
    } finally { await context.close(); }
  }
  return results;
}
