async (page) => {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  for (const [width, height] of [[1280, 900], [1440, 1000]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height } });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const dismiss = async () => {
      for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click(); await dismiss();
      // Explicit isolated equipment/material fixture; new saves no longer equip a weapon.
      await game.evaluate(() => {
        const state = window.gameState;
        state.data.onboardingVersion = 0;
        state.data.equipped.weapon = null;
        state.data.equipped.armor = {
          id: 'fixture_armor', uid: 'original_armor', name: '熔炉护胸夹具', slot: 'armor', quality: 'darkgold',
          reqLevel: 1, reqClass: 'warrior', durability: 100, maxDurability: 100, stars: 3, sockets: 1, gems: [], stats: { def: 25 }
        };
        state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: 'supply_' + i, uid: 'supply_' + i, count: 1 }));
        state.data.bag[0] = { id: 'crystal_darkgold', uid: 'owned_crystal', name: '暗金晶石', count: 2, quality: 'darkgold' };
        state.data.bag[1] = { ...state.data.equipped.armor, id: 'replacement_armor', uid: 'replacement', name: '替换护胸夹具', gems: [] };
        state.notify();
        window.appInstance.views.town.currentView = 'smithy_smelt';
        window.switchMainTab('town');
      });
      check(await game.locator('.smithy-slot-button').count() === 12, 'Disassembly does not expose all equipment slots');
      check(await game.locator('#btn-disassemble-gear').isDisabled(), 'Empty weapon slot should not offer disassembly');
      const armorChoice = game.locator('button[data-smithy-slot="armor"]');
      await armorChoice.focus(); await game.keyboard.press('Enter');
      check(await armorChoice.getAttribute('aria-pressed') === 'true', 'Keyboard did not directly select chest armor');
      check(await armorChoice.evaluate(element => document.activeElement === element), 'Slot selection lost keyboard focus');
      check(await game.locator('#btn-disassemble-gear').evaluate(element => {
        const rect = element.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return rect.top >= main.top && rect.bottom <= main.bottom && rect.left >= main.left && rect.right <= main.right && (element === hit || element.contains(hit));
      }), 'Disassembly action is clipped or covered');
      const before = await data();
      await game.locator('#btn-disassemble-gear').click();
      const confirmation = await game.locator('#game-modal-overlay').innerText();
      check(confirmation.includes('暗金晶石') && confirmation.includes('熔炉护胸夹具'), 'Wrong target or material in confirmation');
      await game.locator('#game-modal-btn-cancel').focus(); await game.keyboard.press('Enter');
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      check(JSON.stringify(await data()) === JSON.stringify(before), 'Cancelled disassembly changed state');
      await game.locator('#btn-disassemble-gear').click();
      await game.evaluate(() => {
        const result = window.gameState.equipItem('replacement');
        if (!result.success) throw new Error(result.msg);
      });
      const changed = await data();
      await game.locator('#game-modal-btn-confirm').click(); await dismiss();
      check(JSON.stringify(await data()) === JSON.stringify(changed), 'Stale confirmation disassembled replacement');
      await game.evaluate(() => {
        const state = window.gameState;
        state.data.equipped.armor.gems = [{ id: 'gem_atk', name: 'Diamond', stat: 'atk', val: 25 }];
        state.notify();
      });
      const socketed = await data();
      await game.locator('#btn-disassemble-gear').click();
      check((await game.locator('#game-modal-overlay').innerText()).includes('摘除'), 'Socketed disassembly not protected');
      await dismiss();
      check(JSON.stringify(await data()) === JSON.stringify(socketed), 'Refused disassembly lost gem');
      await game.evaluate(() => {
        const state = window.gameState;
        state.data.bagCapacity = 60;
        const result = state.removeGem('armor', 0);
        if (!result.success) throw new Error(result.msg);
      });
      const ready = await data();
      await game.screenshot({ path: `output/playwright/material5-${width}-disassembly.png`, animations: 'disabled' });
      await game.locator('#btn-disassemble-gear').click();
      await game.locator('#game-modal-btn-confirm').focus(); await game.keyboard.press('Enter'); await dismiss();
      const smelted = await data();
      check(smelted.equipped.armor === null && smelted.equipped.weapon === null && smelted.bag.find(item => item.id === 'crystal_darkgold').count === 5 && smelted.gold === ready.gold, 'Disassembly did not award exactly three materials');
      check(smelted.bag.some(item => item.id === 'gem_atk') && smelted.bag.some(item => item.uid === before.equipped.armor.uid), 'Disassembly lost gem or original equipment');
      await game.reload(); const loaded = await data();
      check(loaded.equipped.armor === null && loaded.bag.find(item => item.id === 'crystal_darkgold').count === 5 && loaded.bag.some(item => item.id === 'gem_atk'), 'Disassembly lost on reload');
      check(errors.length === 0, errors.join('; '));
      results.push({ width, keyboardChestSelection: true, cancellationPreserved: true, staleConfirmationPreserved: true, socketedRefused: true, gemRecovered: true, darkgoldCrystals: '2 -> 5', originalArmorPreserved: true, reloadPreserved: true, errors });
    } finally { await context.close(); }
  }
  return { results, fixtureNote: 'Explicit chest armor and materials test disassembly behavior; this does not establish natural acquisition or growth balance.' };
}
