async (page) => {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const sets = ['starter', 'courage', 'destiny_goddess', 'sagael_set', 'judge', 'guardian_knight', 'wargod_set'];
  const supplies = [
    ['star_crystal', 'star_crystal'], ['socket_crystal', 'socket_crystal'],
    ['protect_crystal', 'protect_crystal'], ['pet_egg', 'pet_egg_darkgold'],
    ['destiny_stone', 'destiny_stone'], ['evolution_stone', 'evolution_stone'],
    ['key_redwood', 'key_redwood'], ['key_bronze', 'key_bronze'], ['key_platinum', 'key_platinum']
  ];
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], failures = [], screens = [];
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => failures.push(request.url()));
    game.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    const dismiss = async () => {
      for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal.isOpen); i++) {
        await game.locator('#game-modal-btn-confirm').click();
      }
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const capture = async label => {
      await game.evaluate(async () => {
        const urls = new Set();
        for (const element of document.querySelectorAll('[data-item-art]')) {
          for (const match of getComputedStyle(element).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(match[1]);
        }
        await Promise.all([...urls].map(async url => { const image = new Image(); image.src = url; await image.decode(); }));
      });
      const metric = await game.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth,
        broken: [...document.images].filter(image => !image.complete || !image.naturalWidth).length
      }));
      check(!metric.overflow && metric.broken === 0, `${label}: ${JSON.stringify(metric)}`);
      await game.screenshot({ path: `output/official-item-reference-2026-11-01/${viewport.width}-${label}.png`, animations: 'disabled' });
      screens.push({ label, ...metric });
    };
    try {
      await context.addInitScript(() => {
        if (localStorage.getItem('official-art-fixture')) return;
        for (const slot of [1, 2, 4, 5]) localStorage.setItem('MOTA_WORLD_SAVE_SLOT_' + slot, 'official-art-protected-' + slot);
        localStorage.setItem('MOTA_WORLD_ACTIVE_SLOT_ID', '3');
        localStorage.setItem('official-art-fixture', '1');
      });
      await game.goto('http://127.0.0.1:8088/');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click(); await dismiss();
      await game.evaluate(async ({ sets, supplies }) => {
        const { generateEquipment, ITEM_SLOTS, SPECIAL_ITEMS } = await import('/js/config/items.js');
        const { QUEST_LIST } = await import('/js/config/quests.js');
        const { storage } = await import('/js/core/storage.js');
        const data = window.gameState.data;
        data.level = 90;
        const novice = QUEST_LIST[0].rewards.items.filter(item => item.slot);
        data.bag = novice.map((item, index) => ({ ...item, uid: 'official-novice-' + index }));
        for (const setId of sets) {
          for (const slot of ITEM_SLOTS) data.bag.push(generateEquipment(slot.id, 80, 'darkgold', setId, 'warrior'));
        }
        for (const [id] of supplies) data.bag.push({ ...SPECIAL_ITEMS[id], uid: 'official-supply-' + id, count: 1 });
        data.equipped = Object.fromEntries(ITEM_SLOTS.map(slot => [
          slot.id, data.bag.find(item => item.setId === 'courage' && item.slot === slot.id)
        ]));
        window.gameState.notify();
        storage.save(data);
      }, { sets, supplies });
      await game.locator('#nav-tab-equip').click();
      for (const setId of sets) {
        await game.evaluate(setId => {
          const data = window.gameState.data;
          data.equipped = Object.fromEntries(Object.keys(data.equipped).map(slot => [
            slot, data.bag.find(item => item.setId === setId && item.slot === slot)
          ]));
          window.gameState.notify();
          window.appInstance.views.equip.render();
        }, setId);
        const actual = await game.locator('[data-equip-slot] [data-item-art]').evaluateAll(elements => elements.map(element => element.dataset.itemArt));
        // 12 槽；前 10 旧部位须为本套装官方图，后 2 新部位 mirror/bracelet 允许 starter 占位。
        check(actual.length === 12, `${setId}: expected 12 equipment slots, got ${actual.length}`);
        check(actual.slice(0, 10).every(key => key.startsWith('official_' + setId + '_')), `${setId}: old-slot artwork wrong ${actual.join(',')}`);
        await capture('equip-' + setId);
      }
      await game.locator('#nav-tab-equip').click();
      await game.locator('#btn-view-sets-compendium').click();
      const compendium = await game.locator('#modal-sets-compendium [data-item-art]').evaluateAll(elements => elements.map(element => element.dataset.itemArt));
      check(compendium.length === 17, 'Set compendium count changed'); // 17 套（含 3 新套徽记）
      for (const setId of sets.slice(1)) check(compendium.includes('official_' + setId + '_armor'), `${setId}: compendium chest painting missing`);
      await capture('set-compendium');
      await game.locator('#btn-close-sets-compendium').click();
      await game.locator('#nav-tab-bag').click();
      await game.evaluate(() => window.appInstance.views.bag.render());
      const noviceArt = await game.locator('.bag-slot-art [data-item-art]').evaluateAll(elements => elements.map(element => element.dataset.itemArt));
      check(noviceArt.includes('official_starter_weapon') && noviceArt.includes('official_starter_armor'), 'Real novice quest equipment still uses fallback art');
      await capture('novice-quest-equipment');
      await game.evaluate(() => {
        const data = window.gameState.data;
        data.bag = data.bag.filter(item => !item.slot);
        window.gameState.notify();
      });
      await game.locator('#nav-tab-bag').click();
      await game.evaluate(() => window.appInstance.views.bag.render());
      await capture('official-supplies');
      const bagArt = await game.locator('.bag-slot-art [data-item-art]').evaluateAll(elements => elements.map(element => element.dataset.itemArt));
      for (const [id, artId] of supplies) check(bagArt.includes('official_' + artId), `${id}: official supply sprite is not rendered`);
      check(await game.evaluate(() => {
        const squares = [...document.querySelectorAll('.bag-slot-art')].map(element => element.getBoundingClientRect());
        return squares.every(rect => rect.width > 12 && Math.abs(rect.width - rect.height) <= 1);
      }), 'Inventory sprites are stretched or collapsed');
      await game.reload();
      await game.waitForFunction(() => window.appInstance?.views?.bag && window.gameState?.data.hasChosenClass);
      check(await game.locator('#char-select-overlay').isHidden(), 'Refresh reopened character selection');
      check(await game.evaluate(() => [1, 2, 4, 5].every(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot) === 'official-art-protected-' + slot)), 'Other save slots changed');
      check(!errors.length && !failures.length, JSON.stringify({ errors, failures }));
      results.push({ viewport, screens, errors, failures });
    } finally {
      await context.close();
    }
  }
  return results;
}
