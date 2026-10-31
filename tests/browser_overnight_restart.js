async (page, { phase, output }) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const reports = [];
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], consoleErrors = [], failures = [];
    game.setDefaultTimeout(10000);
    game.on('pageerror', error => errors.push(error.message));
    game.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    game.on('requestfailed', request => failures.push(request.url()));
    const dismiss = async () => {
      for (let n = 0; n < 8 && await game.evaluate(() => window.gameModal?.isOpen); n++)
        await game.locator('#game-modal-btn-confirm').click();
    };
    const create = async (classId, name) => {
      await game.locator('[data-class-id="' + classId + '"]').click();
      await game.locator('#input-hero-name').fill(name);
      await game.locator('#btn-confirm-character').click();
      await dismiss();
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      // Validation dialogue is nested above creation; closing it restores the input.
      await game.locator('#input-hero-name').fill('');
      await game.locator('#btn-confirm-character').click();
      check(await game.evaluate(() => gameModal.isOpen && !gameState.data.hasChosenClass), 'Empty name accepted');
      await dismiss();
      check(await game.evaluate(() => document.getElementById('char-select-overlay').contains(document.activeElement)), 'Nested validation dialogue escaped creation');
      await create('warrior', 'Night Keeper');
      const first = await game.evaluate(() => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_1'));
      await game.locator('#btn-new-game-entry').click();
      await game.locator('#game-modal-btn-cancel').click();
      check(await game.evaluate(() => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_1')) === first, 'Canceled restart modified save');
      await game.locator('#btn-new-game-entry').click();
      await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#btn-confirm-character').waitFor();
      check(await game.evaluate(() => document.activeElement.id === 'input-hero-name'), 'Restart creation missing initial focus');
      await create('mage', 'Night Second');
      check(await game.evaluate(() => JSON.parse(localStorage.getItem('MOTA_WORLD_SAVE_SLOT_1')).data.name === 'Night Keeper' &&
        JSON.parse(localStorage.getItem('MOTA_WORLD_SAVE_SLOT_2')).data.classId === 'mage'), 'Restart overwrote original hero');
      await game.locator('#btn-open-archive').click();
      await game.locator('[data-action="load-from"][data-slot="1"]').click();
      await game.locator('#game-modal-btn-confirm').click();
      await game.waitForFunction(() => window.gameState?.data?.name === 'Night Keeper');
      await dismiss();
      check(!await game.locator('#btn-confirm-character').isVisible(), 'Loading an existing save reopened class choice');
      await game.reload();
      await game.waitForFunction(() => window.gameState?.data?.name === 'Night Keeper');
      check(await game.evaluate(() => gameState.data.classId === 'warrior'), 'Reload changed chosen class');
      await game.screenshot({ path: `${output}/${phase}-${viewport.width}-loaded.png`, animations: 'disabled' });
      check(!errors.length && !consoleErrors.length && !failures.length, 'Restart/load produced browser errors');
      reports.push({ viewport, canceledRestartPreserved: true, newSlotCreated: true, oldHeroRetained: true, loadedAndRefreshed: true, errors, consoleErrors, failures });
    } finally { await context.close(); }
  }
  return { reports };
}
