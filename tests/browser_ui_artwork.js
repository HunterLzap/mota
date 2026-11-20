async (page) => {
  const phase = process.env.UI_POLISH_PHASE || 'after', results = [];
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], failures = [], screens = [];
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => failures.push(request.url()));
    game.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    const dismiss = async () => {
      for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const capture = async label => {
      await game.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(image => image.decode()));
        const urls = new Set();
        for (const element of document.querySelectorAll('[data-item-art]')) {
          for (const match of getComputedStyle(element).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(match[1]);
        }
        await Promise.all([...urls].map(async url => { const image = new Image(); image.src = url; await image.decode(); }));
      });
      const metric = await game.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth,
        broken: [...document.images].filter(image => !image.complete || !image.naturalWidth).length,
        art: [...document.querySelectorAll('[data-item-art]')].filter(element => element.getBoundingClientRect().height > 0).map(element => element.dataset.itemArt)
      }));
      check(!metric.overflow && metric.broken === 0, label + ': ' + JSON.stringify(metric));
      await game.screenshot({ path: `output/ui-polish-2026-10-29/${phase}-${viewport.width}-${label}.png`, animations: 'disabled' });
      screens.push({ label, ...metric });
    };
    try {
      if (phase === 'before') {
        const originals = new Set(['/', '/index.html', '/css/classic-materials.css', '/css/scene-layout.css',
          ...['iconHelper', 'towerView', 'heroView', 'estateView', 'townView'].map(name => '/js/ui/' + name + '.js')]);
        await context.route('http://127.0.0.1:8088/**', async route => {
          const pathname = new URL(route.request().url()).pathname;
          if (!originals.has(pathname)) return route.continue();
          const response = await route.fetch({ url: 'http://127.0.0.1:8088/output/ui-polish-2026-10-29/original' + (pathname === '/' ? '/index.html' : pathname) });
          await route.fulfill({ response });
        });
      }
      // All storage touched here belongs to this fresh, isolated browser context.
      await context.addInitScript(() => {
        if (localStorage.getItem('artwork-fixture')) return;
        for (const slot of [1, 2, 4, 5]) localStorage.setItem('MOTA_WORLD_SAVE_SLOT_' + slot, 'artwork-protected-' + slot);
        localStorage.setItem('MOTA_WORLD_ACTIVE_SLOT_ID', '3');
        localStorage.setItem('artwork-fixture', '1');
      });
      await game.goto('http://127.0.0.1:8088/');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click(); await dismiss();
      const tabMetrics = [];
      for (const tab of ['pets', 'tower']) {
        await game.locator('#nav-tab-' + tab).focus(); await game.keyboard.press('Enter');
        await capture(tab + '-locked');
        const selector = tab === 'pets' ? '.pet-classic-tabs button' : '[id^="btn-subtab-"]';
        tabMetrics.push(await game.locator(selector).evaluateAll(buttons => buttons.map(button => {
          const r = button.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return { id: button.id, height: r.height, top: r.top, hit: button.contains(hit), fits: button.scrollWidth <= button.clientWidth + 1 };
        })));
        if (phase === 'after') {
          const locked = game.locator(selector).filter({ has: game.locator('.feature-lock-hint') }).first();
          await locked.focus(); await game.keyboard.press('Enter');
          check(await game.evaluate(() => window.gameModal.isOpen), 'Locked tab lost its explanation');
          await game.keyboard.press('Escape');
          await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
          check(await locked.evaluate(button => button === document.activeElement), 'Locked tab lost focus after Escape');
          for (const metric of tabMetrics.at(-1)) check(metric.height <= 42 && metric.hit && metric.fits, 'Tab geometry: ' + JSON.stringify(metric));
          check(new Set(tabMetrics.at(-1).map(metric => metric.height)).size === 1, 'Locked and unlocked tabs have different heights');
        }
      }
      await game.evaluate(async () => {
        const { generateEquipment, SPECIAL_ITEMS, ITEM_SLOTS } = await import('/js/config/items.js');
        const { storage } = await import('/js/core/storage.js');
        const d = window.gameState.data;
        d.level = 60; d.gold = 50000; d.currentQuestId = 'quest_20';
        for (let i = 1; i < 20; i++) d.questProgress['quest_' + i] = { current: 1, completed: true, claimed: true };
        const random = Math.random; let seed = 291026;
        Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
        try {
          d.bag = ITEM_SLOTS.map(slot => generateEquipment(slot.id, 30, 'gold', null, 'warrior'));
          d.bag.push(...['mage', 'hunter'].map(classId => generateEquipment('weapon', 30, 'gold', null, classId)));
          for (const slot of ITEM_SLOTS) d.equipped[slot.id] = generateEquipment(slot.id, 20, 'blue', null, 'warrior');
          d.bag.push(...Object.values(SPECIAL_ITEMS).map((item, i) => ({ ...item, count: 5, uid: 'art-supply-' + i })));
        } finally { Math.random = random; }
        window.gameState.notify(); storage.save(d);
      });
      for (const tab of ['equip', 'bag', 'town']) {
        await game.locator('#nav-tab-' + tab).click();
        if (tab === 'town') await game.locator('[data-goto="smithy"]').click();
        await capture(tab === 'town' ? 'smithy' : tab);
        if (phase === 'after') check(screens.at(-1).art.length > 0, tab + ' has no painted item artwork');
        if (tab === 'bag') {
          if (phase === 'after') check(await game.locator('.bag-slot-art').evaluateAll(elements => elements.every(element => {
            const r = element.getBoundingClientRect(); return r.width > 12 && Math.abs(r.width - r.height) <= 1;
          })), 'Inventory paintings are stretched or collapsed');
          const ids = new Set();
          for (let n = 0; n < 12; n++) {
            for (const uid of await game.locator('.bag-slot-cell').evaluateAll(elements => elements.map(element => element.dataset.bagUid))) ids.add(uid);
            if (phase === 'after') check(await game.locator('.bag-slot-cell').evaluateAll(elements => elements.every(element => element.querySelector('[data-item-art]'))), 'An inventory item still uses placeholder/vector art');
            if (await game.locator('#btn-bag-page-next').isDisabled()) break;
            await game.locator('#btn-bag-page-next').click();
          }
          check(ids.size === await game.evaluate(() => window.gameState.data.bag.length), 'Art integration lost inventory items');
          await capture('bag-supplies');
        }
      }
      await game.locator('#nav-tab-equip').click();
      await game.locator('#btn-view-sets-compendium').click();
      await capture('sets');
      if (phase === 'after') check(await game.locator('#modal-sets-compendium [data-item-art]').count() === 17, 'Set catalog missing paintings');
      await game.locator('#btn-close-sets-compendium').click();
      await game.locator('#nav-tab-estate').click();
      for (const route of ['alchemy', 'resources']) {
        await game.locator(`#tab-content-estate [data-goto="${route}"]`).click();
        await capture(route);
        if (phase === 'after') check(await game.locator('#tab-content-estate [data-item-art]').count() >= (route === 'alchemy' ? 4 : 3), route + ' missing paintings');
        if (phase === 'after' && route === 'alchemy') {
          check(await game.locator('.btn-brew-potion').evaluateAll(buttons => buttons.every(button => {
            const r = button.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
            return r.top >= main.top && r.bottom <= main.bottom && button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
          })), 'A potion action is clipped by the new art');
        }
        await game.locator('#tab-content-estate [data-goto="hub"]').click();
      }
      let brewed;
      if (phase === 'after') {
        await game.evaluate(() => {
          window.gameState.data.estate.herbs = { herb_dragonblood: 20, herb_starlight: 20, herb_spiritflower: 20 };
          window.gameState.notify();
        });
        await game.locator('#tab-content-estate [data-goto="alchemy"]').click();
        await game.locator('[data-recipe-id="pot_titan"]').focus(); await game.keyboard.press('Enter'); await dismiss();
        brewed = await game.evaluate(async () => {
          const { ALCHEMY_RECIPES } = await import('/js/config/estate.js');
          const recipe = ALCHEMY_RECIPES.find(item => item.id === 'pot_titan'), estate = window.gameState.data.estate;
          return { estate: JSON.stringify(estate), charged: Object.entries(recipe.materials).every(([key, count]) => estate.herbs[key] === 20 - count), active: estate.activePotions.some(potion => potion.id === recipe.id) };
        });
        check(brewed.charged && brewed.active, 'Real potion production failed or charged incorrectly');
      }
      await game.reload();
      await game.waitForFunction(() => window.appInstance?.views?.bag && window.gameState?.data.hasChosenClass);
      check(await game.locator('#char-select-overlay').isHidden(), 'Refresh reopened character selection');
      if (brewed) check(await game.evaluate(() => JSON.stringify(window.gameState.data.estate)) === brewed.estate, 'Brewed potion or herb charges lost on refresh');
      check(await game.evaluate(() => [1, 2, 4, 5].every(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot) === 'artwork-protected-' + slot)), 'Other fixture slots changed');
      await game.locator('#nav-tab-equip').click(); await capture('equip-refresh');
      check(!errors.length && !failures.length, JSON.stringify({ errors, failures }));
      results.push({ viewport, phase, tabMetrics, screens, errors, failures });
    } finally { await context.close(); }
  }
  return results;
}
