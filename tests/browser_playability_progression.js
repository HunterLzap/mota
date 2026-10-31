async (page) => {
  const reports = [], check = (ok, message) => { if (!ok) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], failures = [];
    game.setDefaultTimeout(8000);
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
    game.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
    const dismiss = async () => {
      for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal?.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const click = async selector => { await game.locator(selector).first().click(); await dismiss(); };
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const fight = async selector => {
      await click(selector); await click('#btn-skip-battle');
      check(await game.evaluate(() => window.appInstance.battleView.currentCombat.victory), 'Earned fixture lost a gate battle');
      const result = await game.evaluate(() => {
        const combat = window.appInstance.battleView.currentCombat;
        return { synergy: combat.logs.find(log => log.message.includes('全屏合击奥义'))?.message,
          shatter: combat.logs.find(log => log.message.includes('烈火破界'))?.message };
      });
      await click('#btn-confirm-battle');
      return result;
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await click('[data-class-id="warrior"]');
      await game.locator('#input-hero-name').fill('Progression audit');
      await click('#btn-confirm-character');
      await game.evaluate(async () => {
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const { REGIONAL_STORIES } = await import('/js/config/story.js');
        const data = window.gameState.data;
        // Explicit level/asset fixture: this stage tests progression and formation UI, not acquisition.
        Object.assign(data, { name: 'Progression audit', classId: 'warrior', level: 50, gold: 200000, crystal: 2000, prestige: 2000, freeStatPoints: 0 });
        data.allocatedStats = { str: 100, con: 50, dex: 0, int: 0 };
        for (let i = 1; i <= 18; i++) data.questProgress['quest_' + i] = { current: 1, completed: true, claimed: true };
        data.currentQuestId = 'quest_19';
        const route = REGIONAL_STORIES.quest_19[0];
        data.questProgress[route.id] = { current: route.count, completed: true, claimed: true, expGranted: route.exp };
        data.bag = [{ ...(await import('/js/config/items.js')).SPECIAL_ITEMS.pet_food, count: 10, uid: 'progression_food' }];
        data.pets = ['faerie_dragon'].map(id => ({ id, tier: PET_CONFIGS[id].defaultTier, level: 35, exp: 0, stamina: 100, apt: { ...PET_CONFIGS[id].defaultApt }, skills: [] }));
        data.activePetId = 'faerie_dragon'; data.supportPetIds = [null, null]; data.estate.hiredMercId = null;
        window.gameState.notify();
      });
      await dismiss();
      await click('#nav-tab-estate');
      await click('[data-goto="mercenaries"]');
      await click('[data-merc-id="merc_paladin"]');
      check((await data()).estate.hiredMercId === 'merc_paladin', 'Mercenary hire control did not hire');
      await click('#nav-tab-pets');
      await click('[data-pet-id="faerie_dragon"]');
      const summary = await game.locator('#current-synergy').innerText();
      check(summary.includes('红莲烈焰焚城阵'), 'Formation UI did not show actual paladin + faerie dragon strike');
      await game.locator('#current-synergy').click();
      check(await game.locator('.pet-synergy-summary').evaluate(element => element.open), 'Formation guide cannot expand');
      await click('#current-synergy');
      await click('#nav-tab-tower'); await click('#btn-subtab-dungeons');
      await game.locator('[data-gate-id="mirage_gate"]').click();
      await click('#btn-enter-dungeon');
      const floorRows = [];
      for (let floor = 1; floor <= 10; floor++) {
        const before = await data();
        const combat = await fight('#btn-dungeon-fight');
        const after = await data();
        const progress = after.questProgress.starmap_mirage;
        if (floor === 10) {
          check(combat.synergy?.includes('红莲烈焰焚城阵'), 'UI battle did not execute the selected formation strike');
          check(combat.shatter?.includes('神圣护盾'), 'Shield-shatter formation did not act on the real final boss shield');
        }
        floorRows.push({ floor, levelBefore: before.level, levelAfter: after.level, expGranted: progress?.expGranted || null, floorProgress: progress?.floorProgress || null });
      }
      const progress = (await data()).questProgress.starmap_mirage;
      check(progress.floorProgress === 10 && progress.completed, 'Ten-floor UI gate did not complete investigation');
      check(floorRows.every(row => row.levelAfter - row.levelBefore <= 1), 'One floor still grants clustered multi-level jumps');
      check(JSON.stringify(floorRows.map(row => row.expGranted)) === JSON.stringify([...new Set(floorRows.map(row => row.expGranted))]), 'Investigation experience did not increase each floor');
      const rewardBefore = await data();
      await click('#btn-next-journey');
      const rewardModal = await game.locator('#game-modal-message').innerText();
      check(rewardModal.includes('调查记录已经收好') && rewardModal.includes('声望 +200') && rewardModal.includes('伙伴口粮 x3'), 'Investigation delivery did not settle its complete reward');
      const rewarded = await data();
      check(rewarded.questProgress.starmap_mirage.claimed, 'Investigation delivery did not persist the claimed state');
      check(rewarded.gold === rewardBefore.gold + 1000 && rewarded.crystal === rewardBefore.crystal + 20 && rewarded.prestige === rewardBefore.prestige + 200, 'Investigation delivery paid the wrong currency');
      const foodBefore = rewardBefore.bag.find(item => item.id === 'pet_food')?.count || 0;
      const foodAfter = rewarded.bag.find(item => item.id === 'pet_food')?.count || 0;
      check(foodAfter === foodBefore + 3, 'Investigation delivery did not grant three pet food');
      const saved = await data();
      await game.reload(); await dismiss();
      await game.waitForFunction(() => window.appInstance && window.gameState?.data?.hasChosenClass);
      const loaded = await data();
      check(loaded.questProgress.starmap_mirage.floorProgress === 10 && loaded.questProgress.starmap_mirage.claimed && loaded.estate.hiredMercId === 'merc_paladin', 'Reload lost investigation, delivery, or formation');
      check(JSON.stringify(loaded.bag) === JSON.stringify(saved.bag), 'Reload changed inventory');
      check(await game.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth), 'Horizontal overflow');
      check(!errors.length && !failures.length, JSON.stringify({ errors, failures }));
      await game.screenshot({ path: `output/playwright/playability-progression-${viewport.width}.png` });
      reports.push({ width: viewport.width, battles: 10, refreshes: 1, kind: 'explicit Lv50/asset fixture; real mercenary/pet/gate UI and settlement; not natural acquisition', summary, floorRows, pageErrors: errors, failures });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/playability-progression-failure-${viewport.width}.png` });
      throw error;
    } finally { await context.close(); }
  }
  return reports;
}
