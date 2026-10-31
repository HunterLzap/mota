async (page) => {
  const results = [];
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 900 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage();
    const errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const dismiss = async () => {
      for (let i = 0; i < 4 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click();
      await game.locator('#game-modal-btn-cancel').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      await game.locator('#btn-next-journey').click();
      await game.locator('#game-modal-btn-confirm').click();
      await dismiss();
      for (const itemId of ['novice_weapon', 'novice_armor']) {
        const uid = await game.evaluate(id => window.gameState.data.bag.find(item => item.id === id).uid, itemId);
        await game.locator('#nav-tab-bag').click();
        await game.locator(`[data-bag-uid="${uid}"]`).click();
        await game.locator('#btn-bag-equip-item').click();
        await dismiss();
      }
      const checkStats = async () => {
        const actual = await game.evaluate(async () => {
          const stats = window.gameState.getEffectiveStats();
          const { getPlayerActionInterval } = await import('/js/core/combat.js');
          return { atk: stats.atk.toLocaleString(), def: stats.def.toLocaleString(), maxHp: stats.maxHp.toLocaleString(), interval: `${getPlayerActionInterval(stats, window.gameState.data).toFixed(2)} 秒` };
        });
        for (const [key, value] of Object.entries(actual)) require(await game.locator(`[data-effective-stat="${key}"]`).innerText() === value, `Displayed ${key} differs from effective stats`);
        return actual;
      };
      const healthy = await checkStats();
      await game.screenshot({ path: `output/playwright/ui-readiness-${viewport.width}-equipment.png`, animations: 'disabled' });
      // Isolated damaged-set fixture exercises presentation against actual production calculations.
      const damaged = await game.evaluate(async () => {
        const { OFFICIAL_SETS } = await import('/js/config/items.js');
        const setId = Object.keys(OFFICIAL_SETS)[0];
        window.gameState.data.equipped.weapon.setId = setId;
        window.gameState.data.equipped.armor.setId = setId;
        window.gameState.data.equipped.weapon.durability = 0;
        window.appInstance.views.equip.render();
        return { cost: window.gameState.getRepairQuote().cost, gold: window.gameState.data.gold };
      });
      require((await game.locator('[data-equip-slot="weapon"]').innerText()).includes('耐久:0/100 · 已损坏'), 'Zero durability shown as full');
      require((await game.locator('.equip-set-summary').innerText()).includes('1件有效'), 'Broken set item counted toward active bonus');
      const broken = await checkStats();
      require(Number(broken.atk.replaceAll(',', '')) < Number(healthy.atk.replaceAll(',', '')), 'Broken weapon still contributes attack');
      await game.locator('#nav-tab-town').click();
      require((await game.locator('.town-readiness').innerText()).includes('1 件已损坏，属性失效'), 'Town preparation missed broken equipment');
      require(await game.locator('.classic-town-location').count() === 6, 'Missing city facilities');
      // Illustrated city entries replaced the gradient directory. Verify the real
      // status/lock text fits its live controls; raster contrast is reviewed visually.
      const layout = await game.evaluate(() => {
        const main = document.querySelector('main').getBoundingClientRect();
        const entries = [...document.querySelectorAll('.classic-town-location')];
        const textFits = entries.every(entry => {
          const rect = entry.getBoundingClientRect();
          return rect.left >= main.left && rect.right <= main.right && rect.top >= main.top && rect.bottom <= main.bottom &&
            [...entry.querySelectorAll('.town-place-status,.feature-lock-hint')].every(label => {
              const text = label.getBoundingClientRect();
              return label.scrollWidth <= label.clientWidth + 1 && text.top >= rect.top && text.bottom <= rect.bottom;
            });
        });
        return { overflow: document.body.scrollWidth > innerWidth, textFits, locks: document.querySelectorAll('.classic-town-location .feature-lock-hint').length };
      });
      require(!layout.overflow && layout.textFits && layout.locks > 0, 'City status or locked-entry condition clipped');
      await game.screenshot({ path: `output/playwright/ui-readiness-${viewport.width}-town.png`, animations: 'disabled' });
      await game.locator('.town-readiness [data-goto="smithy_repair"]').click();
      await game.locator('#btn-repair-all').click(); await dismiss();
      require(await game.evaluate(() => window.gameState.data.gold) === damaged.gold - damaged.cost, 'Repair displayed quote differs from settlement');
      await game.locator('#nav-tab-equip').click();
      require((await game.locator('.equip-set-summary').innerText()).includes('2件有效'), 'Repair did not restore set bonus display');
      await checkStats();
      await game.locator('[data-unequip-slot="weapon"]').click();
      await checkStats();
      require((await game.locator('.equip-set-summary').innerText()).includes('1件有效'), 'Unequip left stale set display');
      require(errors.length === 0, errors.join('; '));
      results.push({ viewport, realOpeningEquipment: true, damageRepairAndUnequipStats: true, lockedEntryVisible: true, errors });
    } finally { await context.close(); }
  }
  return { results, fixtureNote: 'Only set identity and weapon damage are injected; first equipment and repair money are earned through the opening flow.' };
}
