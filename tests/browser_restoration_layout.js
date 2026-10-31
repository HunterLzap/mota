async (page) => {
  const results = [];
  const check = (value, message) => { if (!value) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport }), game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
      for (let i = 0; i < 5 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      // Layout only: prerequisites and one companion are explicit fixtures.
      await game.evaluate(async () => {
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const d = window.gameState.data;
        d.level = 50; d.currentQuestId = 'quest_21';
        for (let i = 1; i <= 20; i++) d.questProgress['quest_' + i] = { current: 1, completed: true, claimed: true };
        d.pets = ['golden_dragon', 'naga', 'white_angel'].map(id => ({ id, level: 30, exp: 0, stamina: 100, tier: 'gold', apt: { ...PET_CONFIGS[id].defaultApt }, skills: [] }));
        window.gameState.setActivePet('golden_dragon'); window.gameState.setPetPartySlot(1, 'naga'); window.gameState.setPetPartySlot(2, 'white_angel');
      });
      const pages = [];
      for (const tab of ['hero', 'equip', 'bag', 'pets', 'tower', 'town', 'wild', 'estate']) {
        await game.locator('#nav-tab-' + tab).focus(); await game.keyboard.press('Enter');
        check(await game.locator('#tab-content-' + tab).isVisible(), 'Keyboard tab failed: ' + tab);
        const layout = await game.evaluate(tab => {
          const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
          const side = box('.classic-sidebar'), main = box('main'), footer = box('.classic-footer');
          const root = document.querySelector('#tab-content-' + tab);
          return { side, main, footer, overflow: document.body.scrollWidth > innerWidth || root.scrollWidth > root.clientWidth + 1,
            statFields: document.querySelectorAll('.classic-character-stats dd').length,
            sidebarScroll: document.querySelector('.classic-sidebar').scrollHeight > document.querySelector('.classic-sidebar').clientHeight };
        }, tab);
        check(!layout.overflow, 'Horizontal overflow: ' + tab);
        check(layout.side.width >= 264 && layout.side.width <= (tab === 'pets' ? 450 : 289) && layout.footer.height === 205 && layout.statFields === 10, 'Classic composition lost: ' + JSON.stringify(layout));
        check(layout.side.right < layout.main.x && layout.main.bottom <= layout.footer.y + 1, 'Overlapping panels: ' + tab);
        const footerButton = game.locator('.classic-dock-links [data-classic-tab="bag"]');
        await footerButton.focus();
        check(await footerButton.evaluate(element => {
          const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return hit === element || element.contains(hit);
        }), 'Covered command dock: ' + tab);
        await game.screenshot({ path: `output/playwright/restoration-${viewport.width}-${tab}.png`, animations: 'disabled' });
        pages.push({ tab, ...layout });
      }
      await game.locator('#nav-tab-pets').click();
      await game.locator('[data-pet-id="naga"]').click();
      await game.locator('#pet-panel-body').evaluate(element => { element.scrollTop = element.scrollHeight; });
      check(await game.locator('[data-clear-party="1"]').isVisible(), 'Formation actions scroll away');
      await game.locator('[data-clear-party="1"]').click();
      check(await game.evaluate(() => window.gameState.data.supportPetIds[0] === null), 'Fixed remove action failed');
      await game.reload();
      check(await game.evaluate(() => window.gameState.data.supportPetIds[0] === null && window.gameState.data.activePetId === 'golden_dragon'), 'Layout operations lost on refresh');
      check(errors.length === 0, errors.join('; '));
      results.push({ viewport, fixture: true, pages, fixedFormationAction: true, errors });
    } finally { await context.close(); }
  }
  return results;
}
