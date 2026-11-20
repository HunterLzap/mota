async (page) => {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const count = (state, id) => state.bag.filter(item => item.id === id).reduce((sum, item) => sum + (item.count || 0), 0);
  for (const classId of ['warrior', 'mage', 'hunter']) {
    for (const [width, height] of [[1280, 900], [1440, 1000]]) {
      const context = await page.context().browser().newContext({ viewport: { width, height } });
      const game = await context.newPage(), errors = [];
      game.on('pageerror', error => errors.push(error.message));
      const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
      const dismiss = async () => {
        for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      };
      const go = async () => {
        await game.waitForFunction(() => Boolean(window.appInstance));
        await game.evaluate(() => { window.appInstance.views.town.currentView = 'smithy_reforge'; window.switchMainTab('town'); });
      };
      const reachable = async locator => {
        await locator.scrollIntoViewIfNeeded();
        check(await locator.evaluate(element => {
          const rect = element.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return rect.width > 0 && rect.height > 0 && rect.left >= main.left && rect.right <= main.right &&
            rect.top >= main.top && rect.bottom <= main.bottom && (element === hit || element.contains(hit));
        }), 'Reforge control is clipped or covered');
      };
      const chooseCrystal = async id => {
        const button = game.locator(`button[data-use-crystal="${id}"]`);
        await reachable(button);
        await button.focus(); await game.keyboard.press('Enter');
        check(await button.getAttribute('aria-pressed') === 'true', 'Keyboard did not select the requested crystal');
      };
      const chooseAvailableCrystal = async state => {
        const id = ['crystal_darkgold', 'crystal_gold'].find(id => count(state, id) > 0);
        check(Boolean(id), 'Earned chapter 15 checkpoint lacks a reforge material');
        await chooseCrystal(id);
        return id;
      };
      const checkPaid = (before, after, quote, crystalId) => {
        const otherId = crystalId === 'crystal_darkgold' ? 'crystal_gold' : 'crystal_darkgold';
        check(after.gold === before.gold - quote.gold && after.crystal === before.crystal - quote.crystal, 'Preview currency payment differs from the quote');
        check(count(after, crystalId) === count(before, crystalId) - 1 && count(after, otherId) === count(before, otherId), 'Preview consumed the wrong crystal or quantity');
        check(JSON.stringify(after.equipped.weapon.reforge) === JSON.stringify(before.equipped.weapon.reforge), 'Paid preview changed the active affix before adoption');
        check(Boolean(after.equipped.weapon.pendingReforge), 'Paid preview did not create a pending result');
      };
      const checkPending = async () => {
        check(await game.locator('#btn-do-reforge').isDisabled(), 'Pending result leaves reforge natively enabled');
        check(await game.locator('.smithy-reforge-pending').isVisible(), 'Pending result is not displayed');
        await reachable(game.locator('.btn-resolve-reforge[data-accept="true"]'));
        await reachable(game.locator('.btn-resolve-reforge[data-accept="false"]'));
      };
      const checkUnavailable = async resource => {
        check(await game.locator('#btn-do-reforge').isDisabled(), `Missing ${resource} leaves reforge natively enabled`);
        const text = (await game.locator('.smithy-page-reforge').innerText()).replace(/\s+/g, '');
        check(text.includes(resource) && /(不足|缺少|耗尽|用尽|用完|暂无|没有)/.test(text), `Missing ${resource} has no Chinese explanation`);
      };
      try {
        await game.goto('http://127.0.0.1:8088');
        await game.evaluate(async classId => {
          const { naturalJourney } = await import('/tests/natural_journey.mjs');
          let earned;
          naturalJourney(classId, 406, (row, state) => { if (row.chapter === 15) earned = JSON.parse(JSON.stringify(state.data)); }, 'ordinary');
          if (!earned) throw new Error('Natural chapter 15 checkpoint missing');
          const { storage } = await import('/js/core/storage.js');
          storage.save(earned);
        }, classId);
        await game.reload(); await go();
        // Check the initial layout before any helper scrolls a control into view.
        const initialLayout = await game.evaluate(() => {
          const main = document.querySelector('main').getBoundingClientRect();
          const inside = (rect, boundary) => rect.left >= boundary.left - 1 && rect.right <= boundary.right + 1 &&
            rect.top >= boundary.top - 1 && rect.bottom <= boundary.bottom + 1;
          const crystals = [...document.querySelectorAll('.smithy-page-reforge button[data-use-crystal]')].map(button => {
            const rect = button.getBoundingClientRect(), scroll = button.closest('.smithy-scroll');
            const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return {
              id: button.dataset.useCrystal,
              visible: rect.width > 0 && rect.height > 0 && inside(rect, main) && Boolean(scroll) &&
                scroll.scrollTop <= 1 && inside(rect, scroll.getBoundingClientRect()) && (hit === button || button.contains(hit))
            };
          });
          const slots = [...document.querySelectorAll('.smithy-page-reforge .smithy-slot-button')].map(button => {
            const rect = button.getBoundingClientRect();
            const labels = [...button.querySelectorAll('.smithy-slot-name,.smithy-slot-item,.smithy-slot-stars')];
            const textFits = labels.every(label => [...label.getClientRects()].every(bounds => inside(bounds, rect)));
            const stars = button.querySelector('.smithy-slot-stars');
            let starsFit = true;
            if (stars) {
              const range = document.createRange();
              range.selectNodeContents(stars);
              starsFit = [...range.getClientRects()].every(bounds => inside(bounds, rect));
            }
            return { slot: button.dataset.reforgeSlot || button.dataset.smithySlot, hasStars: Boolean(stars), visible: rect.width > 0 && rect.height > 0 && inside(rect, main), textFits, starsFit };
          });
          return { crystals, slots };
        });
        check(initialLayout.crystals.length === 2 && initialLayout.crystals.every(button => button.visible), `Crystal choices are not fully reachable on the initial screen: ${JSON.stringify(initialLayout.crystals)}`);
        check(initialLayout.slots.length === 12 && initialLayout.slots.some(slot => slot.hasStars) && initialLayout.slots.every(slot => slot.visible && slot.textFits && slot.starsFit), `Equipment slot text is clipped: ${JSON.stringify(initialLayout.slots.filter(slot => !slot.visible || !slot.textFits || !slot.starsFit))}`);
        const beforeSelection = await data();
        for (const slot of ['armor', 'weapon']) {
          const button = game.locator(`button[data-reforge-slot="${slot}"], button[data-smithy-slot="${slot}"]`).first();
          await reachable(button);
          await button.focus(); await game.keyboard.press('Space');
          check(await button.getAttribute('aria-pressed') === 'true', 'Keyboard did not select the requested equipment slot');
        }
        check(JSON.stringify(await data()) === JSON.stringify(beforeSelection), 'Selecting equipment mutated the save');
        const before = await data();
        const quote = await game.evaluate(() => window.gameState.getReforgeQuote(window.gameState.data.equipped.weapon));
        const quoteText = (await game.locator('.smithy-quote').innerText()).replace(/[,\s]/g, '');
        check(quoteText.includes('金币') && quoteText.includes(String(quote.gold)) && quoteText.includes('魔晶') && quoteText.includes(String(quote.crystal)), 'Actual currency quote is missing');
        const firstCrystal = await chooseAvailableCrystal(before);
        await reachable(game.locator('#btn-do-reforge'));
        await game.locator('#btn-do-reforge').click(); await dismiss();
        const paid = await data(), pending = paid.equipped.weapon.pendingReforge;
        checkPaid(before, paid, quote, firstCrystal);
        await checkPending();
        await game.screenshot({ path: `output/playwright/material6-reforge-${width}-${classId}-pending.png`, animations: 'disabled' });
        await game.reload(); await go();
        check(JSON.stringify((await data()).equipped.weapon.pendingReforge) === JSON.stringify(pending), 'Reload lost the paid pending result');
        await checkPending();
        await game.evaluate(() => {
          window.oldChoice = document.querySelector('.btn-resolve-reforge[data-accept="true"]').onclick;
          if (typeof window.oldChoice !== 'function') throw new Error('Stale-choice callback is unavailable');
        });
        await game.locator('.btn-resolve-reforge[data-accept="true"]').focus(); await game.keyboard.press('Enter'); await dismiss();
        const accepted = await data();
        check(JSON.stringify(accepted.equipped.weapon.reforge) === JSON.stringify(pending.affix) && !accepted.equipped.weapon.pendingReforge, 'Adoption did not apply the pending affix');
        check(accepted.gold === paid.gold && accepted.crystal === paid.crystal && count(accepted, firstCrystal) === count(paid, firstCrystal), 'Adoption charged the paid result again');
        const secondCrystal = await chooseAvailableCrystal(accepted);
        await game.locator('#btn-do-reforge').click(); await dismiss();
        const second = await data();
        checkPaid(accepted, second, quote, secondCrystal);
        await checkPending();
        await game.evaluate(() => window.oldChoice()); await dismiss();
        check(JSON.stringify(await data()) === JSON.stringify(second), 'Old choice consumed a newer roll');
        await game.locator('.btn-resolve-reforge[data-accept="false"]').click(); await dismiss();
        const kept = await data();
        check(JSON.stringify(kept.equipped.weapon.reforge) === JSON.stringify(pending.affix) && !kept.equipped.weapon.pendingReforge, 'Keeping old result changed the active affix');
        check(kept.gold === second.gold && kept.crystal === second.crystal && count(kept, secondCrystal) === count(second, secondCrystal), 'Keeping old result refunded or charged materials');
        await game.reload(); await go();
        check(JSON.stringify((await data()).equipped.weapon.reforge) === JSON.stringify(pending.affix), 'Saved choice lost');

        // Explicit resource fixture isolates depleted selection and affordability states.
        await game.evaluate(async () => {
          const { SPECIAL_ITEMS } = await import('/js/config/items.js');
          const state = window.gameState, quote = state.getReforgeQuote(state.data.equipped.weapon);
          state.data.bag = state.data.bag.filter(item => !['crystal_gold', 'crystal_darkgold'].includes(item.id));
          state.data.bag.push({ ...SPECIAL_ITEMS.crystal_gold, uid: 'reforge_gold_fixture', count: 2 });
          state.data.bag.push({ ...SPECIAL_ITEMS.crystal_darkgold, uid: 'reforge_darkgold_fixture', count: 1 });
          state.data.gold = quote.gold * 3;
          state.data.crystal = quote.crystal * 3;
          state.notify();
        });
        await chooseCrystal('crystal_darkgold');
        const lastDarkBefore = await data();
        await game.locator('#btn-do-reforge').click(); await dismiss();
        const lastDarkPaid = await data();
        checkPaid(lastDarkBefore, lastDarkPaid, quote, 'crystal_darkgold');
        check(count(lastDarkPaid, 'crystal_darkgold') === 0 && count(lastDarkPaid, 'crystal_gold') === 2, 'Depletion fixture did not retain the alternate material');
        await checkPending();
        await game.locator('.btn-resolve-reforge[data-accept="false"]').click(); await dismiss();
        check(await game.locator('[data-use-crystal="crystal_darkgold"]').getAttribute('aria-pressed') === 'true', 'Depletion silently changed the chosen crystal');
        await checkUnavailable('暗金晶石');
        await game.screenshot({ path: `output/playwright/material6-reforge-${width}-${classId}-depleted.png`, animations: 'disabled' });
        const emptySelection = await data();
        await chooseCrystal('crystal_gold');
        check(await game.locator('#btn-do-reforge').isEnabled(), 'Available alternate crystal did not enable reforge');
        await chooseCrystal('crystal_darkgold');
        await checkUnavailable('暗金晶石');
        check(JSON.stringify(await data()) === JSON.stringify(emptySelection), 'Switching to an empty material spent resources');
        await chooseCrystal('crystal_gold');
        await game.evaluate(quote => {
          window.gameState.data.gold = quote.gold - 1;
          window.gameState.data.crystal = quote.crystal * 2;
          window.gameState.notify();
        }, quote);
        await checkUnavailable('金币');
        check(quote.crystal > 0, 'Natural checkpoint did not use the magic-crystal reforge price');
        await game.evaluate(quote => {
          window.gameState.data.gold = quote.gold * 2;
          window.gameState.data.crystal = quote.crystal - 1;
          window.gameState.notify();
        }, quote);
        await checkUnavailable('魔晶');
        await game.evaluate(quote => {
          window.gameState.data.gold = quote.gold * 2;
          window.gameState.data.crystal = quote.crystal * 2;
          window.gameState.notify();
        }, quote);
        check(await game.locator('#btn-do-reforge').isEnabled(), 'Restored payment balance left reforge disabled');
        await game.screenshot({ path: `output/playwright/material6-reforge-${width}-${classId}-costs.png`, animations: 'disabled' });
        const goldBefore = await data();
        await game.locator('#btn-do-reforge').click(); await dismiss();
        const goldPaid = await data();
        checkPaid(goldBefore, goldPaid, quote, 'crystal_gold');
        await checkPending();
        await game.locator('.btn-resolve-reforge[data-accept="false"]').click(); await dismiss();
        const finalState = await data();
        check(JSON.stringify(finalState.equipped.weapon.reforge) === JSON.stringify(pending.affix), 'Fixture preview overwrote the kept natural affix');
        check(finalState.gold === goldPaid.gold && finalState.crystal === goldPaid.crystal && count(finalState, 'crystal_gold') === count(goldPaid, 'crystal_gold'), 'Final keep changed the paid ledger');
        await game.reload(); await go();
        const loaded = await data();
        check(JSON.stringify(loaded.equipped.weapon.reforge) === JSON.stringify(pending.affix) && !loaded.equipped.weapon.pendingReforge && loaded.gold === finalState.gold && loaded.crystal === finalState.crystal && count(loaded, 'crystal_gold') === 1 && count(loaded, 'crystal_darkgold') === 0, 'Reload lost the final affix or payment ledger');
        check(errors.length === 0, errors.join(';'));
        results.push({ classId, width, height, earnedCheckpoint: true, quote, naturalRolls: 2, fixtureRolls: 2, refreshPending: true, accepted: true, keptOld: true, staleChoiceRejected: true, nativeDisabledStates: ['pending', 'selected crystal exhausted', 'gold shortfall', 'magic crystal shortfall'], initialCrystalChoicesVisible: true, slotTextUnclipped: true, keyboardSelection: true, exactMaterialPayment: true, errors });
      } finally { await context.close(); }
    }
  }
  return { results, fixtureNote: 'Each class starts from its naturally simulated chapter 15 checkpoint. Later injected materials and balances only test UI/payment rejection states, not natural acquisition or growth balance.' };
}
