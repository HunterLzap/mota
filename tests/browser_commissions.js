async (page) => {
  const reports = [], check = (ok, message) => { if (!ok) throw new Error(message); };
  const canonical = value => JSON.stringify(value, function (key, entry) {
    return entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left.localeCompare(right))) : entry;
  });
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    for (const classId of ['warrior', 'mage', 'hunter']) {
      const context = await page.context().browser().newContext({ viewport });
      const game = await context.newPage(), errors = [];
      game.setDefaultTimeout(8000);
      game.on('pageerror', error => errors.push(error.message));
      const report = { classId, width: viewport.width, kind: 'earned Lv19 checkpoint loaded as fixture; actual UI objectives/claims; explicit Lv45 hatch fixture', battles: 0, refreshes: 0 };
      const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
      const overflow = async () => check(await game.evaluate(() =>
        Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth), 'Horizontal overflow');
      const dismiss = async () => {
        for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      };
      const keyboard = async selector => { await game.locator(selector).focus(); await game.keyboard.press('Enter'); };
      const click = async selector => { await game.locator(selector).first().click(); await dismiss(); };
      const town = async room => {
        await click('#nav-tab-town');
        for (let attempt = 0; attempt < 8; attempt++) {
          if (await game.evaluate(room => window.appInstance.views.town.currentView === room, room)) return;
          if (await game.locator(`[data-goto="${room}"]`).count()) { await click(`[data-goto="${room}"]`); continue; }
          const parent = room.startsWith('palace') ? 'palace' : 'tavern';
          let moved = false;
          for (const target of [parent, 'hub', 'palace', 'tavern']) {
            if (await game.locator(`[data-goto="${target}"]`).count()) { await click(`[data-goto="${target}"]`); moved = true; break; }
          }
          check(moved, 'No route to commission board');
        }
        throw new Error('Town navigation did not converge');
      };
      const button = id => `[data-commission-id="${id}"]`;
      const accept = async id => {
        await keyboard(button(id));
        check(await game.locator('#game-modal-message').innerText().then(text => text.includes('目标')), 'Missing objective dialogue');
        await keyboard('#game-modal-btn-confirm'); await dismiss();
        check((await data()).commissions[id].status === 'active', 'Acceptance did not persist');
        check(await game.locator(`[data-commission-go="${id}"]`).evaluate(element => document.activeElement === element), 'Acceptance lost focus');
      };
      const refresh = async () => {
        const before = await data();
        await game.reload(); await dismiss(); report.refreshes++;
        const loaded = await data();
        for (const key of ['classId', 'hasChosenClass', 'gold', 'crystal', 'prestige', 'level', 'exp', 'bag', 'pets', 'commissions', 'castle']) {
          check(canonical(before[key]) === canonical(loaded[key]), 'Refresh changed ' + key + ': ' + JSON.stringify([before[key], loaded[key]]));
        }
        check(!await game.locator('#char-select-overlay').isVisible(), 'Class selector reopened');
        await overflow();
      };
      const fight = async selector => {
        await game.locator(selector).first().click();
        await game.locator('#btn-skip-battle').click();
        const result = await game.evaluate(() => ({ victory: window.appInstance.battleView.currentCombat.victory,
          actions: window.appInstance.battleView.currentCombat.actionCounts }));
        check(result.victory && result.actions.player + result.actions.enemy > 0, 'Real earned-character battle failed');
        await overflow();
        await keyboard('#btn-confirm-battle'); await dismiss(); report.battles++;
      };
      const claim = async id => {
        const before = await data();
        const xpBefore = await game.evaluate(() => {
          let total = window.gameState.data.exp;
          for (let i = 1; i < window.gameState.data.level; i++) total += window.gameState.getNextLevelExp(i);
          return total;
        });
        const config = await game.evaluate(async id => (await import('/js/config/commissions.js')).COMMISSIONS.find(entry => entry.id === id), id);
        await keyboard(button(id));
        check((await game.locator('#game-modal-message').innerText()).includes(config.ending), 'Missing delivery dialogue');
        await game.keyboard.press('Escape');
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
        check(await game.locator('#commission-heading').evaluate(element => document.activeElement === element), 'Claim lost focus');
        const after = await data();
        check(after.commissions[id].status === 'claimed', 'Claim not recorded');
        for (const key of ['gold', 'crystal', 'prestige']) check(after[key] - before[key] === config.rewards[key], 'Wrong reward ' + key);
        const xpAfter = await game.evaluate(() => {
          let total = window.gameState.data.exp;
          for (let i = 1; i < window.gameState.data.level; i++) total += window.gameState.getNextLevelExp(i);
          return total;
        });
        check(xpAfter - xpBefore === config.rewards.exp, 'Wrong earned experience');
        for (const item of config.rewards.items) {
          const count = d => d.bag.filter(entry => entry.id === item.id).reduce((sum, entry) => sum + (entry.count || 1), 0);
          check(count(after) - count(before) === item.count, 'Reward item missing: ' + item.id);
        }
        check(await game.locator(button(id)).isDisabled(), 'Claimed quest remains actionable');
        if (id === 'oath_token') {
          const card = await game.locator('[data-commission-card="oath_token"]').innerText();
          check(card.includes('银质徽记已交还巡逻队') && !card.includes('待交还'), 'Delivered oath still requests token return');
        }
      };
      try {
        await game.goto('http://127.0.0.1:8088');
        await game.locator(`[data-class-id="${classId}"]`).click();
        await click('#btn-confirm-character');
        await town('tavern_commissions');
        for (const id of ['oath_token', 'tavern_road', 'tavern_tower']) check(await game.locator(button(id)).isDisabled(), 'Low-level commission unlocked');
        await town('palace_commissions');
        check(await game.locator(button('nation_guide')).isDisabled(), 'Low-level nation guide unlocked');
        // Seed only this fresh isolated context. Its other four slots are sentinels.
        const sentinels = await game.evaluate(async classId => {
          const { storage } = await import('/js/core/storage.js');
          const fixture = (await fetch('/output/playwright/commissions-fixtures.json').then(response => response.json()))[classId];
          delete fixture.commissions; // Exercise legacy migration in the browser.
          for (let slot = 1; slot <= 5; slot++) storage.saveToSlot(slot, { ...fixture, name: slot === 3 ? fixture.name : 'Protected ' + slot });
          storage.setActiveSlotId(3);
          return [1, 2, 4, 5].map(slot => [slot, localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)]);
        }, classId);
        await game.reload(); await dismiss();
        check((await data()).level === 19, 'Wrong checkpoint level');
        check(Object.keys((await data()).commissions).length === 0, 'Legacy save received retroactive progress');
        await town('tavern_commissions');
        const beforeCancel = await data();
        await keyboard(button('oath_token'));
        for (let i = 0; i < 5; i++) {
          await game.keyboard.press('Tab');
          check(await game.evaluate(() => document.querySelector('#game-modal-box').contains(document.activeElement)), 'Modal focus escaped');
        }
        await game.keyboard.press('Escape');
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
        check(JSON.stringify(await data()) === JSON.stringify(beforeCancel), 'Cancelled acceptance mutated save');
        check(await game.locator(button('oath_token')).evaluate(element => document.activeElement === element), 'Cancel lost focus');
        await accept('oath_token'); await accept('tavern_road'); await accept('tavern_tower');
        await overflow();
        await game.screenshot({ path: `output/playwright/commissions-${classId}-${viewport.width}-accepted.png` });
        await town('palace_commissions'); await accept('nation_guide');
        await keyboard('[data-commission-go="nation_guide"]');
        check(await game.locator('.btn-fight-mob').first().evaluate(element => document.activeElement === element), 'Forest objective navigation lost focus');
        await fight('.btn-fight-mob');
        check((await data()).commissions.nation_guide.current === 1, 'Partial nation progress missing');
        await refresh();
        await click('#nav-tab-wild'); await fight('.btn-fight-mob'); await fight('.btn-fight-mob');
        check((await data()).commissions.tavern_road.status === 'ready', 'Road objective not complete');
        check((await data()).commissions.oath_token.current === 0, 'Ordinary fights awarded oath token');
        await town('tavern_commissions'); await keyboard('[data-commission-go="oath_token"]');
        check(await game.locator('#btn-fight-wild-boss').evaluate(element => document.activeElement === element), 'Boss navigation lost focus');
        await fight('#btn-fight-wild-boss');
        check((await data()).commissions.oath_token.status === 'ready', 'Boss did not recover oath token');
        await refresh();
        await town('tavern_commissions'); await claim('oath_token'); await claim('tavern_road');
        await town('palace_commissions'); await claim('nation_guide');
        await refresh();
        await town('tavern_commissions'); await keyboard('[data-commission-go="tavern_tower"]');
        await click('#btn-start-redwood');
        await fight('#btn-challenge-castle-floor');
        check((await data()).commissions.tavern_tower.status === 'ready', 'Tower settlement did not update commission');
        await click('#nav-tab-tower'); await click('#btn-claim-castle-exit');
        await town('tavern_commissions'); await claim('tavern_tower');
        await overflow();
        await game.screenshot({ path: `output/playwright/commissions-${classId}-${viewport.width}-claimed.png` });
        await refresh();
        const completed = await data();
        check(Object.values(completed.commissions).every(entry => entry.status === 'claimed'), 'Not all four tasks delivered');
        check(completed.bag.find(item => item.id === 'pet_egg_darkgold').count === 2, 'Darkgold eggs not stored');
        await click('#nav-tab-pets');
        const petsBefore = await data();
        await click('#btn-hatch-egg');
        check(JSON.stringify((await data()).bag) === JSON.stringify(petsBefore.bag), 'Low-level hatch consumed egg');
        check((await data()).pets.length === petsBefore.pets.length, 'Low-level hatch bypassed level gate');
        // Explicit hatch fixture, separate from earned Lv19 objective validation.
        await game.evaluate(() => { window.gameState.data.level = 45; window.gameState.notify(); });
        await click('#btn-hatch-egg');
        const hatched = await data();
        check(hatched.pets.length === petsBefore.pets.length + 1 && hatched.pets.at(-1).tier === 'darkgold', 'Award egg cannot hatch a darkgold companion');
        check(hatched.bag.find(item => item.id === 'pet_egg_darkgold').count === 1, 'Hatch did not consume exactly one earned egg');
        await refresh();
        const slotsAfter = await game.evaluate(() => [1, 2, 4, 5].map(slot => [slot, localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)]));
        check(JSON.stringify(slotsAfter) === JSON.stringify(sentinels), 'Another save slot was overwritten');
        check(errors.length === 0, 'pageerror: ' + errors.join('; '));
        report.errors = errors; report.otherSlotsUnchanged = true; reports.push(report);
        console.log('PASS ' + JSON.stringify(report));
      } catch (error) {
        await game.screenshot({ path: `output/playwright/commissions-${classId}-${viewport.width}-failure.png` });
        throw new Error(JSON.stringify({ report, errors, commissions: (await data()).commissions, error: error.stack }));
      } finally { await context.close(); }
    }
  }
  return { reports };
}
