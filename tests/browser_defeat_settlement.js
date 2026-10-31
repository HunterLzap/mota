async (page) => {
  const results = [];
  const check = (value, message) => { if (!value) throw new Error(message); };
  const canonical = value => JSON.stringify(value, (_key, current) => current && !Array.isArray(current) && typeof current === 'object'
    ? Object.fromEntries(Object.keys(current).sort().map(key => [key, current[key]])) : current);
  const cases = [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]
    .flatMap(viewport => [{ viewport, mode: 'lethal', classId: 'mage' }, { viewport, mode: 'timeout', classId: 'warrior' }]);
  for (const { viewport, mode, classId } of cases) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], failures = [];
    game.setDefaultTimeout(10000);
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
    game.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const dismiss = async () => {
      for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator(`[data-class-id="${classId}"]`).click();
      await game.locator('#btn-confirm-character').click();
      await dismiss();
      await game.evaluate(async ({ mode, classId }) => {
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const { SPECIAL_ITEMS } = await import('/js/config/items.js');
        const { ALCHEMY_RECIPES } = await import('/js/config/estate.js');
        const state = window.gameState, data = state.data;
        data.level = 20; data.currentQuestId = 'completed';
        for (let chapter = 1; chapter <= 26; chapter++) {
          data.questProgress['quest_' + chapter] = { current: 1, completed: true, claimed: true };
        }
        data.equipped = {
          ...data.equipped,
          weapon: { id: 'defeat_weapon', uid: 'defeat_weapon', name: 'Worn weapon', slot: 'weapon', reqClass: classId,
            reqLevel: 1, quality: 'blue', stars: 0, sockets: 0, gems: [], durability: 100, maxDurability: 100, stats: { atk: 1 } },
          armor: { id: 'defeat_armor', uid: 'defeat_armor', name: 'Worn armor', slot: 'armor', reqClass: classId,
            reqLevel: 1, quality: 'blue', stars: 0, sockets: 0, gems: [], durability: 100, maxDurability: 100,
            stats: mode === 'timeout' ? { hp: 1000000, def: 1000000 } : { hp: 1 } }
        };
        data.pets = [{ id: 'golden_dragon', tier: 'gold', level: 1, exp: 0, stamina: 100,
          apt: { ...PET_CONFIGS.golden_dragon.defaultApt }, skills: [] }];
        data.activePetId = 'golden_dragon';
        data.bag = [{ ...SPECIAL_ITEMS.star_crystal, uid: 'defeat_crystal', count: 1 }];
        data.estate.activePotions = [{ ...ALCHEMY_RECIPES.find(recipe => recipe.id === 'pot_rage'), remainingFights: 1 }];
        Object.assign(data.castle, { isExploring: true, expeditionId: 'defeat-fixture', floor: 100,
          finished: false, accumulatedExp: 1000, accumulatedGold: 500, claimedBossRewards: [] });
        localStorage.setItem('MOTA_WORLD_ACTIVE_SLOT_ID', '3');
        for (const slot of [1, 2, 4, 5]) {
          localStorage.setItem('MOTA_WORLD_SAVE_SLOT_' + slot, JSON.stringify({ sentinel: slot, value: 991 }));
        }
        state.notify();
        Math.random = () => 0.5;
      }, { mode, classId });
      const sentinels = await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)));
      await game.locator('#nav-tab-tower').click();
      await game.locator('#btn-challenge-castle-floor').click();
      await game.locator('#btn-skip-battle').click();
      const combat = await game.evaluate(() => JSON.parse(JSON.stringify(window.appInstance.battleView.currentCombat)));
      check(!combat.victory, 'Defeat fixture unexpectedly won');
      check(combat.timedOut === (mode === 'timeout'), 'Defeat did not exercise the intended loss condition');
      check(await game.locator('#btn-confirm-battle').isVisible(), 'Defeat settlement action missing');
      if (mode === 'timeout') check((await game.locator('#battle-live-status').innerText()).includes('300秒'),
        'Timeout explanation missing from the battle result');
      check(await game.locator('#btn-confirm-battle').evaluate(element => {
        const rect = element.getBoundingClientRect();
        const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return rect.bottom <= innerHeight && rect.right <= innerWidth && (top === element || element.contains(top));
      }), 'Defeat return action is clipped or covered');
      await game.screenshot({ path: `output/playwright/defeat-result-${mode}-${viewport.width}.png`, animations: 'disabled' });
      const before = await data();
      await game.locator('#btn-confirm-battle').focus(); await game.keyboard.press('Enter');
      await dismiss();
      const after = await data();
      check(!errors.length, 'Defeat settlement threw: ' + errors.join('; '));
      check(!after.castle.isExploring && after.castle.claimedBossRewards.length === 0,
        'Defeat did not end the expedition without a first-clear reward');
      check(after.level === before.level && after.exp === before.exp + 500,
        'Defeat did not apply exactly the earned half experience');
      check(after.gold === before.gold, 'Defeat paid treasure');
      check(after.pets.find(pet => pet.id === 'golden_dragon').stamina === before.pets.find(pet => pet.id === 'golden_dragon').stamina - 3,
        'Defeat bypassed main-pet stamina consumption');
      check(after.estate.activePotions.length === 0, 'Defeat bypassed potion consumption');
      check(Object.values(after.equipped).filter(Boolean).every(item => item.durability === 99),
        'Defeat bypassed equipment wear');
      check(await game.evaluate(() => document.activeElement?.id === 'nav-tab-tower'),
        'Defeat modal did not restore focus to the originating navigation');
      const log = (await game.evaluate(() => window.gameState.systemLogs.map(entry => entry.text))).join('\n');
      check(log.includes('对决受挫') && /装备|体力|魔力|净化|潜能|成长|输出/.test(log), 'Defeat did not record actionable advice');
      if (mode === 'timeout') check(log.includes('300秒'), 'Timeout advice disappeared after leaving battle');
      await game.reload(); await dismiss();
      const reloaded = await data();
      check(canonical(reloaded) === canonical(after), 'Defeat settlement changed on reload: ' +
        JSON.stringify(Object.keys(after).filter(key => canonical(after[key]) !== canonical(reloaded[key]))
          .map(key => ({ key, before: after[key], after: reloaded[key] }))));
      check(JSON.stringify(await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)))) === JSON.stringify(sentinels),
        'Defeat settlement changed protected slots');
      check(!failures.length, 'Defeat settlement failed requests: ' + JSON.stringify(failures));
      check(await game.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth),
        'Defeat settlement overflowed horizontally');
      await game.screenshot({ path: `output/playwright/defeat-settlement-${mode}-${viewport.width}.png`, animations: 'disabled' });
      results.push({ viewport, mode, classId, combatSeconds: combat.duration, actions: combat.actionCounts,
        halfExp: after.exp - before.exp, staminaConsumed: 3, potionExpired: true, reloadPreserved: true,
        errors, failures });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/defeat-settlement-failure-${mode}-${viewport.width}.png` });
      throw new Error(error.message + ' | ' + JSON.stringify({ viewport, mode, errors, failures, state: await game.evaluate(() => ({
        app: !!window.appInstance, state: !!window.gameState, exploring: window.gameState?.data?.castle?.isExploring,
        modal: window.gameModal?.isOpen, notice: document.getElementById('runtime-error-display')?.textContent
      })) }));
    } finally { await context.close(); }
  }
  return { kind: 'isolated level/gear/pet fixtures; real boss combat and defeat settlement; not natural progression', results };
}
