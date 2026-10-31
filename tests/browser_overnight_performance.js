async (page, { phase, output }) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const baseline = phase.includes('before'), reports = [];
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], consoleErrors = [];
    game.on('pageerror', error => errors.push(error.message));
    game.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    const dismiss = async () => {
      for (let n = 0; n < 8 && await game.evaluate(() => window.gameModal?.isOpen); n++)
        await game.locator('#game-modal-btn-confirm').click();
    };
    const shot = name => game.screenshot({ path: `${output}/${phase}-${viewport.width}-${name}.png`, animations: 'disabled' });
    const report = { viewport };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('#btn-confirm-character').click();
      await dismiss();
      await game.evaluate(async () => {
        const { atmosphere } = await import('/js/effects/atmosphere.js');
        window.measuredAtmosphere = atmosphere;
        window.canvasCounts = { update: 0, draw: 0 };
        for (const name of ['update', 'draw']) {
          const original = atmosphere[name];
          atmosphere[name] = function(...args) { canvasCounts[name]++; return original.apply(this, args); };
        }
      });
      await game.waitForTimeout(1100);
      report.hiddenCanvas = await game.evaluate(() => ({
        ...canvasCounts, display: getComputedStyle(measuredAtmosphere.canvas).display,
        running: measuredAtmosphere.isRunning, particles: measuredAtmosphere.particles.length,
        pendingFrame: measuredAtmosphere.animId !== null
      }));
      if (!baseline) {
        check(!report.hiddenCanvas.update && !report.hiddenCanvas.draw && !report.hiddenCanvas.running && !report.hiddenCanvas.particles && !report.hiddenCanvas.pendingFrame,
          'Invisible Canvas still updates, draws or allocates particles');
        await game.evaluate(() => measuredAtmosphere.canvas.style.setProperty('display', 'block', 'important'));
        await game.waitForTimeout(400);
        report.visibleCanvas = await game.evaluate(() => ({ ...canvasCounts, running: measuredAtmosphere.isRunning, particles: measuredAtmosphere.particles.length }));
        check(report.visibleCanvas.running && report.visibleCanvas.draw > 0 && report.visibleCanvas.particles > 0, 'Visible Canvas did not resume animation');
        await game.evaluate(() => { measuredAtmosphere.setPreset('none'); window.noneDraws = canvasCounts.draw; });
        await game.waitForTimeout(300);
        check(await game.evaluate(() => !measuredAtmosphere.isRunning && canvasCounts.draw === noneDraws && measuredAtmosphere.animId === null), 'None preset still schedules frames');
        await game.evaluate(() => measuredAtmosphere.setPreset('forest'));
        await game.waitForTimeout(250);
        check(await game.evaluate(() => measuredAtmosphere.isRunning && canvasCounts.draw > noneDraws), 'Preset resume failed');
        await game.evaluate(() => {
          measuredAtmosphere.canvas.style.removeProperty('display');
          window.finalDraws = canvasCounts.draw;
        });
        await game.waitForTimeout(300);
        check(await game.evaluate(() => !measuredAtmosphere.isRunning && canvasCounts.draw <= finalDraws + 1), 'Rehidden Canvas kept drawing');
      }
      await game.locator('#nav-tab-bag').click();
      await game.locator('[data-bag-uid]').first().click();
      await game.waitForTimeout(300);
      await game.evaluate(async () => {
        const { storage } = await import('/js/core/storage.js');
        window.equipCounts = { notify: 0, save: 0, bagRender: 0, equipRender: 0 };
        for (const [object, key, counter] of [
          [gameState, 'notify', 'notify'], [storage, 'save', 'save'],
          [appInstance.views.bag, 'render', 'bagRender'], [appInstance.views.equip, 'render', 'equipRender']
        ]) {
          const original = object[key];
          object[key] = function(...args) { equipCounts[counter]++; return original.apply(this, args); };
        }
        window.beforeEquip = {
          logs: gameState.systemLogs.filter(log => log.text.includes('【换装】')).length,
          uid: document.getElementById('btn-bag-equip-item').dataset.itemUid
        };
      });
      await game.locator('#btn-bag-equip-item').click();
      await game.waitForTimeout(250);
      report.equip = await game.evaluate(() => ({
        ...equipCounts, equipped: gameState.data.equipped.weapon?.uid === beforeEquip.uid,
        logDelta: gameState.systemLogs.filter(log => log.text.includes('【换装】')).length - beforeEquip.logs,
        focus: document.activeElement.dataset.bagUid || document.activeElement.id,
        stored: JSON.parse(localStorage.getItem('MOTA_WORLD_SAVE_SLOT_1')).data.equipped.weapon?.uid === beforeEquip.uid
      }));
      if (!baseline) {
        check(report.equip.notify === 1 && report.equip.save === 1 && report.equip.bagRender === 1, 'Equip duplicated publication/save/render');
        check(report.equip.equipped && report.equip.stored && report.equip.logDelta === 1 && report.equip.focus, 'Equipment/log/save/focus lost');
      }
      await shot('equip');
      await game.locator('#nav-tab-equip').click();
      await game.waitForTimeout(200);
      await game.evaluate(() => { Object.keys(equipCounts).forEach(key => equipCounts[key] = 0); });
      await game.locator('[data-unequip-slot="weapon"]').click();
      report.unequip = await game.evaluate(() => ({
        ...equipCounts, empty: !gameState.data.equipped.weapon,
        inBag: gameState.data.bag.some(item => item.uid === beforeEquip.uid)
      }));
      if (!baseline) check(report.unequip.notify === 1 && report.unequip.save === 1 && report.unequip.equipRender === 1 &&
        report.unequip.empty && report.unequip.inBag, 'Unequip duplicated rendering or lost item/save');
      await game.reload();
      await game.waitForFunction(() => window.gameState?.data?.hasChosenClass);
      check(await game.evaluate(() => !gameState.data.equipped.weapon && gameState.data.bag.some(item => item.id === 'novice_weapon')), 'Reload lost unequipped weapon');
      check(!errors.length && !consoleErrors.length, 'Browser runtime/console errors');
      report.errors = errors; report.consoleErrors = consoleErrors;
      reports.push(report);
    } catch (error) {
      console.error(JSON.stringify({ report, errors, consoleErrors }));
      await shot('failure').catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  return { baseline, reports };
}
