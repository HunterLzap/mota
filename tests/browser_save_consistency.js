async (page, { phase = 'after', output = 'output/save-consistency-2026-10-31' } = {}) => {
  const results = [];
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport, acceptDownloads: true });
    const errors = [], requests = [];
    const watch = game => {
      game.setDefaultTimeout(10000);
      game.on('pageerror', error => errors.push(error.message));
      game.on('requestfailed', request => requests.push({ url: request.url(), error: request.failure() }));
      game.on('response', response => { if (response.status() >= 400) requests.push({ url: response.url(), status: response.status() }); });
    };
    const first = await context.newPage(); watch(first);
    const data = game => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const raw = (game, slot) => game.evaluate(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot), slot);
    const dismiss = async game => {
      for (let n = 0; n < 8 && await game.evaluate(() => window.gameModal?.isOpen); n++)
        await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const create = async (game, classId, name) => {
      await game.locator(`[data-class-id="${classId}"]`).click();
      await game.locator('#input-hero-name').fill(name);
      await game.locator('#btn-confirm-character').click();
      await dismiss(game);
    };
    const equip = async game => {
      await game.locator('#nav-tab-bag').click();
      for (const item of (await data(game)).bag.filter(item => item.slot)) {
        await game.locator(`[data-bag-uid="${item.uid}"]`).click();
        await game.locator('#btn-bag-equip-item').click();
      }
    };
    const fight = async game => {
      await game.locator('#nav-tab-wild').click();
      await game.locator('.btn-fight-mob').first().dblclick();
      await game.locator('#btn-skip-battle').click();
      check(await game.evaluate(() => appInstance.battleView.currentCombat.victory), 'Earned starter equipment lost the forest battle');
      await game.locator('#btn-confirm-battle').click();
      await dismiss(game);
    };
    const summary = state => ({
      name: state.name, classId: state.classId, level: state.level, gold: state.gold,
      equipped: Object.values(state.equipped).filter(Boolean).length, quest2: state.questProgress.quest_2
    });
    const shot = (game, name) => game.screenshot({ path: `${output}/${phase}-${viewport.width}-${name}.png`, animations: 'disabled' });
    const result = { phase, viewport };
    try {
      await first.goto('http://127.0.0.1:8088');
      await create(first, 'warrior', 'Save Warrior');
      const second = await context.newPage(); watch(second);
      await second.goto('http://127.0.0.1:8088');
      if (phase === 'before') {
        await second.waitForFunction(() => window.gameState?.data?.hasChosenClass);
        await equip(first);
        await fight(first);
        result.earned = summary(await data(first));
        await second.locator('#nav-tab-hero').click();
        await second.locator('#btn-recommended-stats').click();
        await first.reload();
        await first.waitForFunction(() => window.gameState?.data?.hasChosenClass);
        result.afterStalePage = summary(await data(first));
        check(result.afterStalePage.level < result.earned.level && result.afterStalePage.equipped === 0,
          'Baseline no longer reproduces stale-page rollback');
        await shot(first, 'rollback');
        await first.locator('#btn-open-archive').click();
        await first.locator('[data-action="delete-slot"][data-slot="1"]').click();
        await first.locator('#game-modal-btn-confirm').click();
        result.deleted = await raw(first, 1) === null;
        await first.locator('#btn-close-archive-modal').click();
        await equip(first);
        result.resurrected = await raw(first, 1) !== null;
        check(result.deleted && result.resurrected, 'Baseline no longer reproduces deleted-slot resurrection');
        await first.locator('#btn-open-archive').click();
        await shot(first, 'resurrected');
      } else if (phase === 'stale') {
        await second.locator('#game-modal-overlay').waitFor({ state: 'visible' });
        check((await second.locator('#game-modal-message').innerText()).includes('其他页面'),
          'Second page did not block the same slot');
        check(!await second.evaluate(() => Boolean(window.gameState)), 'Blocked second page initialized writable state');
        await second.locator('#game-modal-btn-cancel').click();
        await second.locator('[data-action="new-in"][data-slot="2"]').click();
        await create(second, 'mage', 'Temporary Mage');
        await equip(first);
        await fight(first);
        result.earned = summary(await data(first));
        await second.evaluate(() => {
          const slot = JSON.parse(localStorage.getItem('MOTA_WORLD_SAVE_SLOT_1'));
          slot.data = { ...slot.data, name: 'External Hunter', classId: 'hunter', level: 9, gold: 9000 };
          localStorage.setItem('MOTA_WORLD_SAVE_SLOT_1', JSON.stringify(slot));
        });
        const external = await raw(second, 1);
        check(JSON.parse(external).data.name === 'External Hunter', 'External slot write was not established');
        await second.locator('[data-bag-uid]').first().click();
        await second.waitForTimeout(400);
        await second.locator('#btn-bag-equip-item').click();
        await second.locator('#game-modal-overlay').waitFor({ state: 'visible' });
        result.conflictNotice = await second.locator('#game-modal-message').innerText();
        check(result.conflictNotice.includes('存档已发生变化'), 'Stale old tab was not stopped and explained');
        check((await raw(second, 1)) === external, 'Triggering the stale write changed the latest save');
        await shot(second, 'stale-write-blocked');
      } else {
        await second.locator('#game-modal-overlay').waitFor({ state: 'visible' });
        result.sameSlotNotice = await second.locator('#game-modal-message').innerText();
        check(result.sameSlotNotice.includes('其他页面'), 'Duplicate page did not explain the occupied save');
        check(!await second.evaluate(() => Boolean(window.gameState)), 'Duplicate page initialized a writable game');
        await shot(second, 'same-slot-blocked');
        await second.locator('#game-modal-btn-cancel').click();
        await second.locator('[data-action="new-in"][data-slot="2"]').click();
        await create(second, 'mage', 'Save Mage');
        const mageSave = await raw(second, 2);
        await equip(first);
        await fight(first);
        result.earned = summary(await data(first));
        check(result.earned.level === 3 && result.earned.gold === 1587 && result.earned.equipped === 2,
          'Starter victory was not persisted as earned');
        check(await raw(second, 2) === mageSave, 'Other page changed slots and redirected the warrior save into the mage slot');
        const slotOne = JSON.parse(await raw(first, 1)).data;
        check(slotOne.classId === 'warrior' && slotOne.level === 3, 'Warrior progress was lost');
        check((await first.locator('#header-active-slot-text').innerText()).includes('1'), 'First page followed another page active slot');
        await shot(first, 'earned-progress');
        await second.locator('#btn-open-archive').click();
        const activeDelete = second.locator('[data-action="delete-slot"][data-slot="2"]');
        result.activeDeleteDisabled = await activeDelete.isDisabled();
        check(result.activeDeleteDisabled, 'Current save can still be deleted through the archive');
        check((await activeDelete.getAttribute('title')).includes('切换'), 'Disabled delete has no explanation');
        await shot(second, 'active-delete-protected');
        await second.locator('[data-action="delete-slot"][data-slot="1"]').click();
        await second.locator('#game-modal-btn-confirm').click();
        await second.locator('#game-modal-overlay').waitFor({ state: 'visible' });
        result.busyDeleteNotice = await second.locator('#game-modal-message').innerText();
        check(result.busyDeleteNotice.includes('其他页面'), 'Deleting another page save did not explain the lock');
        check((await raw(second, 1)) !== null && await raw(second, 2) === mageSave, 'Busy-slot deletion changed a save');
        await dismiss(second);
        if (await second.locator('#btn-close-archive-modal').isVisible()) await second.locator('#btn-close-archive-modal').click();
        await first.close();
        if (!await second.locator('#btn-close-archive-modal').isVisible()) await second.locator('#btn-open-archive').click();
        await second.locator('[data-action="delete-slot"][data-slot="1"]').click();
        await second.locator('#game-modal-btn-confirm').click();
        await second.waitForFunction(() => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_1') === null);
        if (await second.locator('#btn-close-archive-modal').isVisible()) await second.locator('#btn-close-archive-modal').click();
        await equip(second);
        check(await raw(second, 1) === null, 'Deleted inactive save reappeared after a real action');
        await second.reload();
        await second.waitForFunction(() => window.gameState?.data?.hasChosenClass);
        check((await data(second)).classId === 'mage' && !await second.locator('#btn-confirm-character').isVisible(),
          'Refresh lost the mage or reopened class choice');
        result.reload = summary(await data(second));
        await second.locator('#btn-open-archive').click();
        const downloading = second.waitForEvent('download');
        await second.locator('#btn-archive-export-json').click();
        const download = await downloading;
        const stream = await download.createReadStream();
        let backup = '';
        for await (const chunk of stream) backup += chunk.toString();
        check(JSON.parse(backup).saveData.classId === 'mage', 'Exported another page character');
        await second.locator('#file-archive-import').setInputFiles({
          name: 'earned-save.json', mimeType: 'application/json', buffer: Buffer.from(backup)
        });
        await second.locator('#game-modal-overlay').waitFor({ state: 'visible' });
        await dismiss(second);
        if (await second.locator('#btn-close-archive-modal').isVisible()) await second.locator('#btn-close-archive-modal').click();
        result.imported = summary(await data(second));
        check(JSON.stringify(result.imported) === JSON.stringify(result.reload), 'Import changed the earned backup');
        check(await second.evaluate(() => [3, 4, 5].every(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot) === null)),
          'Unused slots were changed');
        const third = await context.newPage(); watch(third);
        await third.goto('http://127.0.0.1:8088');
        await third.locator('#game-modal-overlay').waitFor({ state: 'visible' });
        await second.close();
        await third.locator('#game-modal-btn-confirm').click();
        await third.waitForFunction(() => window.gameState?.data?.hasChosenClass);
        result.afterOwnerClosed = summary(await data(third));
        check(JSON.stringify(result.afterOwnerClosed) === JSON.stringify(result.imported), 'Closing owner did not release the save for reload');
        await shot(third, 'owner-closed-recovered');
      }
      check(errors.length === 0, 'Page errors: ' + JSON.stringify(errors));
      check(requests.length === 0, 'Request failures: ' + JSON.stringify(requests));
      result.errors = errors; result.requests = requests;
      results.push(result);
    } catch (error) {
      console.error('FAILED STAGE ' + JSON.stringify(result));
      await shot(first.isClosed() ? context.pages().at(-1) : first, 'failure').catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
  return { results };
}
