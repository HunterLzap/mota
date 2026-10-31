async (page) => {
  const results = [];
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="hunter"]').click();
      await game.locator('#btn-confirm-character').click();
      for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal.isOpen); i++) {
        await game.locator('#game-modal-btn-confirm').click();
      }
      await game.locator('#nav-tab-pets').click();
      await game.locator('#pet-subtab-compendium').click();
      for (const id of ['gorgon', 'nightmare', 'imp']) {
        const card = game.locator(`[data-pet-id="${id}"]`);
        await card.scrollIntoViewIfNeeded();
        const before = await game.locator('.pet-classic-slots').evaluate(element => element.scrollTop);
        if (before <= 0) throw new Error('Fixture did not scroll the roster');
        await card.click();
        const after = await game.locator('.pet-classic-slots').evaluate(element => element.scrollTop);
        if (Math.abs(after - before) > 1) throw new Error(`Roster jumps on ${id}: ${before} -> ${after}`);
        if (!await game.locator(`[data-pet-id="${id}"]`).evaluate(element => element === document.activeElement)) {
          throw new Error('Pet selection lost keyboard focus');
        }
      }
      const before = await game.locator('.pet-classic-slots').evaluate(element => element.scrollTop);
      await game.locator('#current-synergy').click();
      await game.evaluate(() => window.appInstance.views.pets.render());
      if (!await game.locator('.pet-synergy-summary').evaluate(element => element.open)) throw new Error('Guide collapsed on render');
      if (Math.abs(await game.locator('.pet-classic-slots').evaluate(element => element.scrollTop) - before) > 1) {
        throw new Error('Guide render reset the roster');
      }
      if (errors.length) throw new Error(errors.join('; '));
      results.push({ ...viewport, selections: 3, scrollPreserved: true, focusPreserved: true, errors });
    } finally {
      await context.close();
    }
  }
  return results;
}
