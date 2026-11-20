async (page) => {
  const results = [], check = (ok, message) => { if (!ok) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }, { width: 1366, height: 768 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], failures = [];
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => failures.push(request.url()));
    game.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    const dismiss = async () => {
      for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
    };
    const visibleHit = async selector => {
      const control = game.locator(selector);
      await control.scrollIntoViewIfNeeded();
      check(await control.evaluate(element => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return box.width > 0 && box.height > 0 && element.contains(hit);
      }), `Unreachable: ${selector} at ${viewport.width}`);
    };
    const capture = async surface => {
      await game.evaluate(async () => {
        await Promise.all(Array.from(document.images).filter(image => image.offsetWidth).map(image => image.decode()));
        const sources = new Set();
        for (const element of document.querySelectorAll('.estate-facility-art,.pet-portrait-art,.classic-command-dock')) {
          if (!element.getBoundingClientRect().height) continue;
          for (const match of getComputedStyle(element).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)) sources.add(match[1]);
        }
        await Promise.all([...sources].map(async source => { const image = new Image(); image.src = source; await image.decode(); }));
      });
      check(await game.evaluate(() => document.body.scrollWidth <= innerWidth && document.documentElement.scrollWidth <= innerWidth), `${surface}: horizontal overflow`);
      await game.screenshot({ path: `output/playwright/ui-refinements-${surface}-${viewport.width}.png`, animations: 'disabled' });
    };
    try {
      await context.addInitScript(() => {
        if (localStorage.getItem('ui-refinements-fixture')) return;
        for (const slot of [1, 2, 4, 5]) localStorage.setItem('MOTA_WORLD_SAVE_SLOT_' + slot, 'protected-' + slot);
        localStorage.setItem('MOTA_WORLD_ACTIVE_SLOT_ID', '3');
        localStorage.setItem('ui-refinements-fixture', '1');
      });
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="hunter"]').click();
      await game.locator('#btn-confirm-character').click(); await dismiss();
      // Explicit mid-game UI fixture: no claim of natural resource acquisition.
      await game.evaluate(async () => {
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const { generateEquipment, SPECIAL_ITEMS } = await import('/js/config/items.js');
        const { storage } = await import('/js/core/storage.js');
        const data = window.gameState.data;
        data.level = 60; data.gold = 50000; data.crystal = 1000; data.currentQuestId = 'quest_20';
        for (let i = 1; i < 20; i++) data.questProgress['quest_' + i] = { current: 1, claimed: true, completed: true };
        data.pets = Object.values(PET_CONFIGS).map(conf => ({ id: conf.id, tier: conf.defaultTier || 'gold', level: 35, exp: 0, stamina: 100, apt: { ...conf.defaultApt }, skills: [] }));
        data.activePetId = 'golden_dragon'; data.supportPetIds = [null, null]; data.estate.hiredMercId = 'merc_paladin';
        data.bag = [
          { ...SPECIAL_ITEMS.star_crystal, count: 3 }, { ...SPECIAL_ITEMS.pet_food, count: 5 },
          { ...SPECIAL_ITEMS.pet_egg, type: 'egg', count: 2 },
          ...Array.from({ length: 28 }, (_, i) => generateEquipment(['weapon', 'armor', 'helmet', 'ring'][i % 4], 30, i % 2 ? 'blue' : 'gold', null, 'hunter'))
        ];
        data.equipped.weapon = data.bag.splice(3, 1)[0];
        window.gameState.notify(); storage.save(data);
      });
      await game.reload(); await game.waitForFunction(() => window.appInstance?.views?.bag); await dismiss();
      const unchanged = await game.evaluate(() => JSON.stringify(window.gameState.data));
      await game.locator('#nav-tab-estate').click();
      check(await game.locator('.estate-facility-art').count() === 4, 'Four facilities need individual scenery');
      check(await game.locator('.estate-facility-art').evaluateAll(elements =>
        new Set(elements.map(element => getComputedStyle(element).backgroundPosition)).size === 4), 'Facilities reused the same atlas cell');
      for (const key of ['alchemy', 'resources', 'mercenaries', 'slaves']) await visibleHit(`[data-goto="${key}"] button`);
      await capture('estate');
      for (const key of ['alchemy', 'resources', 'mercenaries', 'slaves']) {
        await game.locator(`[data-goto="${key}"] button`).click();
        check(await game.evaluate(key => window.appInstance.views.estate.currentView === key, key), 'Facility route failed');
        await game.evaluate(() => { window.appInstance.views.estate.currentView = 'hub'; window.appInstance.views.estate.render(); });
      }
      await game.locator('#nav-tab-pets').click();
      check(!await game.locator('.pet-synergy-summary').evaluate(element => element.open), 'Guide should start collapsed');
      check(await game.locator('.pet-party-next').innerText().then(text => text.includes('副位')), 'Missing contextual next step');
      await game.locator('#pet-subtab-compendium').click();
      const portraits = await game.locator('.pet-slot-icon .pet-portrait-art').count();
      check(portraits === 22, 'All 22 thumbnails must use the corresponding portrait atlas');
      await game.locator('[data-pet-id="unicorn"]').click();
      await capture('pets');
      await game.locator('#current-synergy').click();
      check(await game.locator('.pet-formation-option').count() === 4, 'Missing tactical choices');
      await game.locator('[data-guide-pet="faerie_dragon"]').click();
      check(await game.locator('.pet-select-card.is-selected').getAttribute('data-pet-id') === 'faerie_dragon', 'Formation link selected the wrong partner');
      await visibleHit('#btn-toggle-active-pet');
      await game.locator('#current-synergy').click();
      check(await game.evaluate(() => JSON.stringify(window.gameState.data)) === unchanged, 'Read-only guidance changed gameplay');
      await game.locator('#nav-tab-bag').click();
      const seen = [];
      do {
        seen.push(...await game.locator('.bag-slot-cell').evaluateAll(elements => elements.map(element => element.dataset.bagUid)));
        await game.locator('.bag-slot-cell').evaluateAll(elements => {
          for (const element of elements) {
            const rect = element.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            const caption = element.querySelector('.bag-slot-name').getBoundingClientRect();
            if (!element.contains(hit) || rect.height < 50 || caption.bottom > rect.bottom - 2 || caption.top < rect.top) throw new Error('Unreadable or clipped inventory item: ' + JSON.stringify({
              rect: rect.toJSON(), hit: hit?.className, view: document.querySelector('#tab-content-bag').getBoundingClientRect().toJSON(),
              items: document.querySelector('.bag-items').getBoundingClientRect().toJSON()
            }));
          }
        });
        if (await game.locator('#btn-bag-page-next').isDisabled()) break;
        await game.locator('#btn-bag-page-next').click();
      } while (true);
      const owned = await game.evaluate(() => window.gameState.data.bag.map(item => item.uid || item.id));
      check(JSON.stringify(seen.sort()) === JSON.stringify(owned.sort()), 'Pagination loses or repeats items: ' + JSON.stringify({ seen, owned }));
      await game.locator('[data-filter="material"]').click();
      check(await game.locator('.bag-slot-name').innerText() === '升星水晶', 'Item name missing');
      await visibleHit('#btn-bag-item-destination'); await capture('items');
      await game.locator('[data-filter="equip"]').click();
      await game.locator('#bag-slot-filter').selectOption('helmet');
      const uid = await game.locator('.bag-slot-cell').first().getAttribute('data-bag-uid');
      await game.locator('.bag-slot-cell').first().click();
      await game.locator('.bag-slot-cell').first().hover(); await capture('comparison');
      await game.evaluate(() => document.getElementById('btn-bag-equip-item')?.click()); await dismiss();
      check(await game.locator('#tab-content-bag').isVisible(), 'Equipping unexpectedly left the inventory');
      check(await game.evaluate(uid => window.gameState.data.equipped.helmet?.uid === uid, uid), 'Real equipment action failed');
      await game.locator('#btn-bag-view-equipment').click();
      await visibleHit('[data-browse-slot="helmet"]'); await capture('equipment');
      await game.locator('[data-browse-slot="helmet"]').click();
      check(await game.locator('#bag-slot-filter').inputValue() === 'helmet', 'Equipment slot did not route to the right filter');
      const retained = await game.evaluate(() => JSON.stringify(window.gameState.data));
      await game.reload(); await game.waitForFunction(() => window.appInstance?.views?.bag);
      check(await game.evaluate(() => JSON.stringify(window.gameState.data)) === retained, 'Refresh changed equipment or resources');
      check(await game.evaluate(() => [1, 2, 4, 5].every(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot) === 'protected-' + slot)), 'Another save slot changed');
      check(!errors.length && !failures.length, JSON.stringify({ errors, failures }));
      results.push({ ...viewport, facilityRoutes: 4, portraits, inventoryItems: owned.length, equipmentAndRefresh: true, protectedSlots: 4, errors, failures });
    } finally { await context.close(); }
  }
  return results;
}
