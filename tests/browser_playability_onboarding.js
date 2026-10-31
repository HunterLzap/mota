async (page) => {
  const baseline = new URL(page.url()).searchParams.has('baseline');
  const reports = [], check = (ok, message) => { if (!ok) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [];
    game.setDefaultTimeout(8000);
    game.on('pageerror', error => errors.push(error.message));
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const dismiss = async () => {
      for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal?.isOpen); i++) {
        await game.locator('#game-modal-btn-confirm').click();
      }
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const click = async selector => { await game.locator(selector).first().click(); await dismiss(); };
    const allocate = async () => {
      const guide = await game.evaluate(async () => (await import('/js/core/journey.js')).getJourneyGuidance(window.gameState.data));
      if (guide.action === 'allocate_stats') { await click('#btn-next-journey'); await click('#btn-recommended-stats'); }
    };
    try {
      await context.addInitScript(() => {
        if (!localStorage.getItem('playability-sentinels')) {
          for (const slot of [1, 2, 4, 5]) localStorage.setItem('MOTA_WORLD_SAVE_SLOT_' + slot, JSON.stringify({ data: { name: 'Protected ' + slot, gold: slot * 71 } }));
          localStorage.setItem('MOTA_WORLD_ACTIVE_SLOT_ID', '3');
          localStorage.setItem('playability-sentinels', '1');
        }
      });
      await game.goto('http://127.0.0.1:8088');
      const sentinels = await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)));
      await click('[data-class-id="warrior"]');
      await game.locator('#input-hero-name').fill('Onboarding audit');
      await click('#btn-confirm-character');
      await allocate();
      await click('#btn-next-journey');
      let state = await data();
      await click(`[data-bag-uid="${state.bag.find(item => item.slot === 'weapon').uid}"]`);
      await game.locator('#btn-bag-equip-item').focus();
      await game.keyboard.press('Enter');
      const stayedInBag = await game.locator('#tab-content-bag').isVisible();
      const equipFocus = await game.evaluate(() => document.activeElement?.dataset.bagUid || document.activeElement?.id);
      if (!baseline) check(stayedInBag && equipFocus, 'Equipping weapon interrupted bag or lost focus');
      await click('#nav-tab-bag');
      await click('#btn-auto-nav-quest');
      const lowerNav = await game.evaluate(() => window.appInstance.currentTab);
      const lowerInBag = await game.locator('#tab-content-bag').isVisible();
      if (!baseline) check(lowerInBag, 'Bottom navigation bypassed missing chest armor');
      await click('#nav-tab-bag');
      state = await data();
      await click(`[data-bag-uid="${state.bag.find(item => item.slot === 'armor').uid}"]`);
      await click('#btn-bag-equip-item');
      if (!baseline) {
        await click('#btn-bag-view-equipment');
        check(await game.locator('#tab-content-equip').isVisible(), 'Explicit equipment inspection missing');
      }
      await allocate();
      await click('#btn-next-journey');
      await click('.btn-fight-mob');
      await click('#btn-skip-battle');
      check(await game.evaluate(() => window.appInstance.battleView.currentCombat.victory), 'First earned battle lost');
      await click('#btn-confirm-battle');
      await click('#btn-claim-quest-reward');
      await allocate();
      const guide3 = await game.locator('#journey-guide').innerText();
      if (!baseline) check(guide3.includes('升星') && !guide3.includes('孵化'), 'Chapter three shows unavailable hatching instead of forging');
      await click('#btn-auto-nav-quest');
      await click('#btn-do-enhance');
      await click('#btn-claim-quest-reward');
      await allocate();
      await click('#btn-next-journey');
      await click('#btn-hatch-egg');
      await click('#btn-toggle-active-pet');
      const before = await data();
      await game.reload(); await dismiss();
      await game.waitForFunction(() => window.appInstance && window.gameState?.data?.hasChosenClass);
      const after = await data();
      for (const key of ['classId', 'gold', 'crystal', 'level', 'currentQuestId', 'equipped', 'pets', 'activePetId']) {
        check(JSON.stringify(before[key]) === JSON.stringify(after[key]), 'Refresh changed ' + key);
      }
      check(!await game.locator('#char-select-overlay').isVisible(), 'Refresh reopened class selection');
      check(JSON.stringify(sentinels) === JSON.stringify(await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)))), 'Other slots changed');
      check(await game.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth), 'Horizontal overflow');
      check(!errors.length, 'Page errors: ' + errors);
      await game.screenshot({ path: `output/playwright/playability-onboarding-${baseline ? 'before' : 'after'}-${viewport.width}.png` });
      reports.push({ width: viewport.width, baseline, stayedInBag, equipFocus, lowerNav, lowerInBag, guide3, battles: 1, refreshes: 1, pageErrors: errors, protectedSlots: 4 });
    } catch (error) {
      console.log(JSON.stringify({ error: error.message, state: await data(), guide: await game.locator('#journey-guide').innerText() }));
      await game.screenshot({ path: `output/playwright/playability-onboarding-failure-${viewport.width}.png` });
      throw error;
    } finally { await context.close(); }
  }
  return reports;
}
