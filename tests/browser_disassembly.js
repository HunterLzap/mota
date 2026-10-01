async (page) => {
  const context = await page.context().browser().newContext(); const game = await context.newPage();
  const errors = []; game.on('pageerror', error => errors.push(error.message));
  const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  const dismiss = async () => { while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click(); };
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
    await game.evaluate(() => {
      const state = window.gameState;
      state.data.equipped.weapon.quality = 'darkgold';
      state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: 'supply_' + i, uid: 'supply_' + i, count: 1 }));
      state.data.bag[0] = { id: 'crystal_darkgold', uid: 'owned_crystal', name: '暗金晶石', count: 2, quality: 'darkgold' };
      state.data.bag[1] = { ...state.data.equipped.weapon, id: 'replacement_sword', uid: 'replacement', name: 'Replacement sword', gems: [] };
      state.notify(); window.appInstance.views.town.currentView = 'smithy_smelt'; window.switchMainTab('town');
    });
    const before = await data();
    await game.locator('#btn-disassemble-gear').click();
    if (!(await game.locator('#game-modal-overlay').innerText()).includes('暗金晶石')) throw new Error('Wrong material shown');
    await game.locator('#game-modal-btn-cancel').click();
    if (JSON.stringify(await data()) !== JSON.stringify(before)) throw new Error('Cancelled disassembly changed state');
    await game.locator('#btn-disassemble-gear').click();
    await game.evaluate(() => { if (!window.gameState.equipItem('replacement').success) throw new Error('Replacement equip failed'); });
    const changed = await data();
    await game.locator('#game-modal-btn-confirm').click(); await dismiss();
    if (JSON.stringify(await data()) !== JSON.stringify(changed)) throw new Error('Stale confirmation disassembled replacement');
    await game.evaluate(() => { const state = window.gameState; state.data.equipped.weapon.gems = [{ id: 'gem_atk', name: 'Diamond', stat: 'atk', val: 25 }]; state.notify(); });
    const socketed = await data();
    await game.locator('#btn-disassemble-gear').click();
    if (!(await game.locator('#game-modal-overlay').innerText()).includes('摘除')) throw new Error('Socketed disassembly not protected');
    await dismiss();
    if (JSON.stringify(await data()) !== JSON.stringify(socketed)) throw new Error('Refused disassembly lost gem');
    // Production gem removal uses the newly freed slot; retain the old sword and every material.
    await game.evaluate(() => {
      const state = window.gameState; state.data.bagCapacity = 60;
      const result = state.removeGem('weapon', 0); if (!result.success) throw new Error(result.msg);
    });
    const ready = await data();
    await game.locator('#btn-disassemble-gear').click(); await game.locator('#game-modal-btn-confirm').click(); await dismiss();
    const smelted = await data();
    if (smelted.equipped.weapon !== null || smelted.bag.find(item => item.id === 'crystal_darkgold').count !== 5 || smelted.gold !== ready.gold) throw new Error('Disassembly did not award exactly three materials');
    if (!smelted.bag.some(item => item.id === 'gem_atk') || !smelted.bag.some(item => item.uid === before.equipped.weapon.uid)) throw new Error('Disassembly lost gem or original equipment');
    await game.reload(); const loaded = await data();
    if (loaded.equipped.weapon !== null || loaded.bag.find(item => item.id === 'crystal_darkgold').count !== 5 || !loaded.bag.some(item => item.id === 'gem_atk')) throw new Error('Disassembly lost on reload');
    if (errors.length) throw new Error(errors.join('; '));
    return { cancellationPreserved: true, staleConfirmationPreserved: true, socketedRefused: true, gemRecovered: true, darkgoldCrystals: '2 -> 5', originalSwordPreserved: true, reloadPreserved: true, errors };
  } finally { await context.close(); }
}
