async (page) => {
  const rows = [];
  for (const [classId, setId] of [['warrior', 'conqueror'], ['hunter', 'destiny_goddess'], ['mage', 'wisdom_goddess']]) {
    const context = await page.context().browser().newContext();
    const game = await context.newPage();
    const errors = [];
    game.on('pageerror', error => errors.push(error.message));
    try {
      await game.goto('http://127.0.0.1:8088', { timeout: 60000 });
      await game.locator(`[data-class-id="${classId}"]`).click();
      await game.locator('#btn-confirm-character').click();
      // Isolated gear fixture tests the real adapter and persistence, not natural balance.
      const before = await game.evaluate(async setId => {
        const { generateEquipment } = await import('/js/config/items.js');
        const state = window.gameState;
        state.data.level = 60; state.data.activePetId = null;
        state.data.equipped = {};
        for (const slot of ['weapon', 'armor', 'gloves', 'boots']) state.data.equipped[slot] = generateEquipment(slot, 60, 'purplegold', setId);
        state.notify();
        return state.getEffectiveStats();
      }, setId);
      if ((classId === 'warrior' && before.dmgBonus !== 25) ||
          (classId === 'hunter' && before.doubleStrike !== 20) ||
          (classId === 'mage' && before.magicDmg !== 30)) throw new Error('Four-piece effect missing');
      await game.locator('#nav-tab-wild').click();
      await game.locator('#btn-fight-wild-boss').click();
      await game.locator('#btn-skip-battle').click();
      if (!await game.evaluate(() => window.appInstance.battleView.currentCombat.victory)) throw new Error('Set fixture battle lost');
      await game.locator('#btn-confirm-battle').click();
      while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click();
      await game.reload();
      const loaded = await game.evaluate(() => window.gameState.getEffectiveStats());
      if (loaded.skillLevelBonus !== before.skillLevelBonus) throw new Error('Reload lost set skills');
      const broken = await game.evaluate(() => {
        window.gameState.data.equipped.boots.durability = 0;
        window.gameState.notify();
        return window.gameState.getEffectiveStats();
      });
      if (broken.skillLevelBonus || broken.dmgBonus || broken.doubleStrike || broken.magicDmg) throw new Error('Broken fourth piece still grants effects');
      if (errors.length) throw new Error(errors.join('; '));
      rows.push({ classId, setId, bonusLevels: before.skillLevelBonus, battleWon: true, reloadPreserved: true, brokenPieceDisabled: true, errors });
    } finally { await context.close(); }
  }
  return rows;
}
