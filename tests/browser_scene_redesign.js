async (page) => {
  const phase = process.env.UI_CAPTURE_PHASE || 'after';
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], failedRequests = [];
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => failedRequests.push(request.url()));
    game.on('response', response => { if (response.status() >= 400) failedRequests.push(response.url()); });
    const dismiss = async () => {
      for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal.isOpen); i++) {
        await game.locator('#game-modal-btn-confirm').click();
      }
    };
    try {
      if (phase === 'before') {
        // Replay the pre-edit source snapshots without replacing the working tree.
        const originals = new Set(['/', '/index.html', ...['heroView', 'bagView', 'townView', 'wildView', 'estateView', 'battleView'].map(name => '/js/ui/' + name + '.js')]);
        await context.route('http://127.0.0.1:8088/**', async route => {
          const pathname = new URL(route.request().url()).pathname;
          if (!originals.has(pathname)) return route.continue();
          const response = await route.fetch({ url: 'http://127.0.0.1:8088/output/ui-redesign-2026-10-28/original' + (pathname === '/' ? '/index.html' : pathname) });
          await route.fulfill({ response });
        });
      }
      await context.addInitScript(() => {
        if (localStorage.getItem('scene-redesign-fixture')) return;
        for (const slot of [1, 2, 4, 5]) localStorage.setItem('MOTA_WORLD_SAVE_SLOT_' + slot, 'protected-' + slot);
        localStorage.setItem('MOTA_WORLD_ACTIVE_SLOT_ID', '3');
        localStorage.setItem('scene-redesign-fixture', '1');
      });
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click(); await dismiss();
      // This is an isolated presentation fixture, not a natural progression run.
      await game.evaluate(async () => {
        const { generateEquipment, SPECIAL_ITEMS } = await import('/js/config/items.js');
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const { storage } = await import('/js/core/storage.js');
        const d = window.gameState.data;
        d.level = 60; d.gold = 50000; d.crystal = 1000; d.freeStatPoints = 12; d.currentQuestId = 'quest_20';
        for (let i = 1; i < 20; i++) d.questProgress['quest_' + i] = { current: 1, completed: true, claimed: true };
        d.pets = ['golden_dragon', 'naga', 'white_angel'].map(id => ({
          id, tier: 'gold', level: 35, exp: 0, stamina: 100, apt: { ...PET_CONFIGS[id].defaultApt }, skills: []
        }));
        d.activePetId = 'golden_dragon'; d.supportPetIds = ['naga', 'white_angel'];
        const random = Math.random;
        let seed = 281026;
        Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
        try {
          d.bag = [
            { ...SPECIAL_ITEMS.star_crystal, count: 3 }, { ...SPECIAL_ITEMS.pet_food, count: 5 },
            ...Array.from({ length: 32 }, (_, i) => generateEquipment(['weapon', 'armor', 'helmet', 'ring'][i % 4], 30, i % 2 ? 'blue' : 'gold', null, 'warrior'))
          ];
        } finally { Math.random = random; }
        for (const slot of ['weapon', 'armor', 'helmet', 'ring']) {
          const index = d.bag.findIndex(item => item.slot === slot);
          d.equipped[slot] = d.bag.splice(index, 1)[0];
        }
        window.gameState.notify(); storage.save(d);
      });
      await game.reload();
      await game.waitForFunction(() => window.appInstance?.views?.bag);
      await dismiss();
      const initialState = await game.evaluate(() => JSON.stringify(window.gameState.data));
      const pages = [];
      for (const tab of ['hero', 'equip', 'bag', 'town', 'wild', 'estate']) {
        await game.locator('#nav-tab-' + tab).focus(); await game.keyboard.press('Enter');
        await game.evaluate(() => document.fonts.ready);
        await game.locator('#tab-content-' + tab).evaluate(async root => {
          await Promise.all([...root.querySelectorAll('img')].map(image => image.decode()));
        });
        const metrics = await game.evaluate(tab => {
          const root = document.getElementById('tab-content-' + tab);
          const main = document.querySelector('main').getBoundingClientRect();
          const potentialButtons = [...root.querySelectorAll('.btn-add-stat')].map(button => {
            const box = button.getBoundingClientRect();
            return { stat: button.dataset.stat, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
          });
          return {
            overflow: document.body.scrollWidth > innerWidth || root.scrollWidth > root.clientWidth + 1,
            brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).length,
            mainBottom: main.bottom,
            mainTop: main.top,
            potentialButtons,
            controls: [...root.querySelectorAll('button')].filter(button => {
              const r = button.getBoundingClientRect();
              return r.width > 0 && r.top >= main.top && r.bottom <= main.bottom;
            }).length
          };
        }, tab);
        check(!metrics.overflow && metrics.brokenImages === 0, tab + ': overflow or broken image');
        if (phase === 'after' && tab === 'hero') {
          check(await game.locator('.hero-body-portrait').isVisible(), 'Character portrait missing');
          for (const stat of ['str', 'dex', 'int', 'con']) {
            check(await game.locator(`[data-stat="${stat}"]`).evaluate(element => {
              const r = element.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
              return r.top >= main.top && r.bottom <= main.bottom && element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
            }), 'Potential action clipped: ' + stat);
          }
        }
        if (phase === 'after' && tab === 'town') {
          const hotspotCount = await game.locator('.classic-town-location').count();
          const hasRoyalShop = await game.locator('.classic-town-location[data-goto="royal_shop"]').count();
          const hasStable = await game.locator('.classic-town-location[data-goto="stable"]').count();
          check(hotspotCount === 8 && hasRoyalShop === 1 && hasStable === 1, 'Town scene hotspots missing (count=' + hotspotCount + ', royal_shop=' + hasRoyalShop + ', stable=' + hasStable + ')');
        }
        if (phase === 'after' && tab === 'equip') {
          check(await game.locator('.equip-body-portrait').isVisible(), 'Equipment portrait missing');
          await game.locator('.equip-character-sheet').evaluate(element => { element.scrollTop = element.scrollHeight; });
          check(await game.locator('[data-effective-stat="atk"]').isVisible(), 'Equipment ledger lost');
          await game.locator('.equip-character-sheet').evaluate(element => { element.scrollTop = 0; });
        }
        await game.screenshot({ path: `output/ui-redesign-2026-10-28/${phase}-${viewport.width}-${tab}.png`, animations: 'disabled' });
        pages.push({ tab, ...metrics });
      }
      check(await game.evaluate(() => JSON.stringify(window.gameState.data)) === initialState, 'Browsing changed gameplay state');
      const cityRoutes = [];
      if (phase === 'after') {
        await game.locator('#nav-tab-town').click();
        for (const route of ['smithy', 'palace', 'tavern', 'fishing', 'dragons', 'faction_war']) {
          const button = game.locator(`.classic-town-location[data-goto="${route}"]`);
          await button.scrollIntoViewIfNeeded();
          await game.waitForFunction(() => !window.gameModal?.isOpen).catch(() => {});
          await game.waitForTimeout(80);
          check(await button.evaluate(element => {
            const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return r.width > 0 && element.contains(hit);
          }), 'Town hotspot covered: ' + route);
          const locked = await button.getAttribute('aria-disabled') === 'true';
          await button.focus(); await game.keyboard.press('Enter');
          if (locked) {
            check(await game.evaluate(() => window.gameModal.isOpen), 'Locked hotspot did not explain access');
            await game.keyboard.press('Escape');
            await game.waitForFunction(() => !window.gameModal?.isOpen).catch(() => {});
            check(await button.evaluate(element => element === document.activeElement), 'Locked hotspot lost focus');
          } else {
            check(await game.evaluate(route => window.appInstance.views.town.currentView === route, route), 'Town hotspot route failed: ' + route);
            await game.locator('#tab-content-town .btn-goto-subview[data-goto="hub"]').first().click();
          }
          cityRoutes.push({ route, locked, keyboardPassed: true });
        }
      }
      await game.locator('#nav-tab-wild').click();
      await game.locator('.btn-fight-mob').first().click();
      await game.screenshot({ path: `output/ui-redesign-2026-10-28/${phase}-${viewport.width}-battle.png`, animations: 'disabled' });
      const battle = await game.locator('#battle-overlay').evaluate(root => ({
        overflow: root.scrollWidth > root.clientWidth + 1,
        stageHeight: root.querySelector('.battle-stage')?.getBoundingClientRect().height || 0,
        allyPortrait: !!root.querySelector('.battle-ally .battle-portrait, .battle-ally .battle-stage-opponent'),
        enemyPortrait: !!root.querySelector('.battle-enemy .battle-portrait, .battle-enemy .battle-stage-opponent, [data-enemy-portrait]')
      }));
      check(!battle.overflow, 'Battle overflow');
      // 战斗页 P0–P2 已定稿为 13vh 横幅（≈135/150px），旧 160px 阈值过期；
      // 语义改为「战斗舞台存在 + 敌我立绘都在」（现在真正的 scenery 是左右立绘）。
      if (phase === 'after') check(battle.stageHeight > 0 && battle.allyPortrait && battle.enemyPortrait, 'Battle scenery missing');
      await game.locator('#btn-skip-battle').click();
      await game.locator('#btn-confirm-battle').click(); await dismiss();
      if (phase === 'after') {
        await game.locator('#nav-tab-hero').click();
        const str = await game.evaluate(() => window.gameState.data.allocatedStats.str);
        await game.locator('[data-stat="str"]').focus(); await game.keyboard.press('Enter');
        check(await game.evaluate(() => window.gameState.data.allocatedStats.str) === str + 1, 'Stat action failed');
        check(await game.evaluate(() => document.activeElement?.dataset.stat === 'str'), 'Potential focus not restored');
        await game.reload(); await game.waitForFunction(() => window.appInstance?.views?.hero); await dismiss();
        check(await game.evaluate(() => window.gameState.data.allocatedStats.str) === str + 1, 'Stat action lost on refresh');
        await game.locator('#nav-tab-hero').click();
        await game.locator('#btn-open-class-skills').click();
        check(await game.locator('.class-training').isVisible(), 'Skill route failed');
        await game.locator('#btn-close-class-skills').click();
      }
      check(await game.evaluate(() => [1, 2, 4, 5].every(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot) === 'protected-' + slot)), 'Sentinel slots changed');
      check(errors.length === 0 && failedRequests.length === 0, JSON.stringify({ errors, failedRequests }));
      results.push({ phase, viewport, fixture: true, pages, cityRoutes, battle, errors, failedRequests, sentinelSlotsPreserved: true });
    } finally { await context.close(); }
  }
  return results;
}
