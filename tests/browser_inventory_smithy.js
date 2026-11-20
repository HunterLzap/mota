async (page) => {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  for (const [width, height, classId] of [[1280, 900, 'warrior'], [1440, 1000, 'mage']]) {
    const context = await page.context().browser().newContext({ viewport: { width, height } });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const dismiss = async () => {
      for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const reachable = async locator => {
      check(await locator.evaluate(element => {
        const r = element.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return r.top >= main.top && r.bottom <= main.bottom && r.left >= main.left && r.right <= main.right && element.contains(hit);
      }), `Clipped or covered control: ${locator}`);
    };
    const showSmithy = async view => {
      await game.locator('#nav-tab-town').click();
      await game.evaluate(view => { window.appInstance.views.town.currentView = view; window.appInstance.views.town.render(); }, view);
    };
    const inspectPreview = async uid => {
      const before = JSON.stringify(await data());
      const preview = await game.evaluate(async uid => {
        const quote = window.gameState.getEquipmentPreview(uid);
        const { getPlayerActionInterval } = await import('/js/core/combat.js');
        return { ...quote, interval: getPlayerActionInterval(quote.after, window.gameState.data).toFixed(2) };
      }, uid);
      // 新 UI：悬停格子显示全局属性卡（#mota-global-tooltip），无旧 data-preview-value/对比 DOM。
      const cell = game.locator(`[data-bag-uid="${uid}"]`);
      await cell.hover();
      const tip = game.locator('#mota-global-tooltip');
      await tip.waitFor({ state: 'visible' });
      const tipText = await tip.innerText();
      check(/装备类型|耐久/.test(tipText), 'Hover tooltip did not show equipment fields');
      check(JSON.stringify(await data()) === before, 'Preview or selection changed the save');
      return preview;
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator(`[data-class-id="${classId}"]`).click();
      await game.locator('#btn-confirm-character').click();
      await game.locator('#game-modal-btn-cancel').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      await game.locator('#nav-tab-bag').click();
      check((await game.locator('.bag-empty-detail').innerText()).includes('行囊暂无物品'), 'Missing empty-save guidance');
      await game.locator('#btn-next-journey').click();
      await game.locator('#game-modal-btn-confirm').click(); await dismiss();
      // Real opening rewards, without resource or gear fixtures.
      for (const id of ['novice_weapon', 'novice_armor']) {
        const uid = await game.evaluate(id => window.gameState.data.bag.find(item => item.id === id).uid, id);
        await game.locator('#nav-tab-bag').click();
        const preview = await inspectPreview(uid);
        await game.locator(`[data-bag-uid="${uid}"]`).click();
        await game.locator('#bag-action-menu').waitFor();
        await game.locator('#bag-action-menu button').filter({ hasText: '穿戴' }).first().click();
        await dismiss();
        check(JSON.stringify(await game.evaluate(() => window.gameState.getEffectiveStats())) === JSON.stringify(preview.after), 'Actual opening equip differs from preview');
      }
      while (await game.evaluate(async () => (await import('/js/core/journey.js')).getJourneyGuidance(window.gameState.data)?.action === 'allocate_stats')) {
        await game.locator('#btn-next-journey').click();
        await game.locator('#btn-recommended-stats').click();
      }
      await game.locator('#btn-next-journey').click(); await dismiss();
      await game.locator('.btn-fight-mob').first().click();
      await game.locator('#btn-skip-battle').click();
      check(await game.evaluate(() => window.appInstance.battleView.currentCombat.victory), 'Opening investigation fight lost');
      await game.locator('#btn-confirm-battle').click(); await dismiss();
      await game.locator('#btn-claim-quest-reward').click(); await dismiss();
      check((await data()).currentQuestId === 'quest_3', 'First investigation did not earn the forge lesson');
      await game.locator('#nav-tab-town').click();
      await game.locator('[data-goto="smithy"]').click();
      check(await game.locator('.smithy-workshop-tabs > button').count() === 7, 'Missing keyboard-accessible forge tabs');
      await game.screenshot({ path: `output/playwright/material5-${width}-smithy.png`, animations: 'disabled' });
      await game.locator('[data-goto="smithy_socket"]').focus(); await game.keyboard.press('Enter');
      check(await game.evaluate(() => window.gameModal.isOpen), 'Locked smithy entry bypassed progression');
      await dismiss();
      await game.locator('[data-goto="smithy_enhance"]').focus(); await game.keyboard.press('Enter');
      await game.locator('[data-smithy-slot="weapon"]').click();
      check(await game.locator('[data-enhance-success-rate]').innerText() === '100%', 'Tutorial success rate is wrong');
      const beforeEnhance = await data(), starCount = beforeEnhance.bag.find(item => item.id === 'star_crystal').count;
      await reachable(game.locator('#btn-do-enhance'));
      await game.screenshot({ path: `output/playwright/material5-${width}-enhance.png`, animations: 'disabled' });
      await game.locator('#btn-do-enhance').click(); await dismiss();
      const enhanced = await data();
      check(enhanced.equipped.weapon.stars === 1 && enhanced.bag.find(item => item.id === 'star_crystal').count === starCount - 1, 'Tutorial enhancement charged or upgraded incorrectly');

      // Isolated earned-looking inventory and funds test overflow, sale and preview.
      // These resources are not evidence of natural acquisition.
      await game.evaluate(async () => {
        const state = window.gameState;
        const { generateEquipment, specializeEquipment, ITEM_SLOTS, SPECIAL_ITEMS } = await import('/js/config/items.js');
        state.data.gold = 20000;
        state.data.bag = Array.from({ length: 38 }, (_, index) => {
          const item = specializeEquipment(generateEquipment(ITEM_SLOTS[index % 10].id, 1, ['gold', 'blue', 'darkgold', 'purplegold'][index % 4]), state.data.classId);
          return { ...item, uid: `inventory_${index}`, price: 1000, reqLevel: 1, stars: 0, gems: [], sockets: 0 };
        });
        Object.assign(state.data.bag[0], { name: '北境远征军的迅捷武装', stats: { atk: 35, speed: 120 }, stars: 2 });
        state.data.bag[1].gems = [{ id: 'gem_atk', name: '金刚石', stat: 'atk', val: 25 }];
        state.data.bag[1].sockets = 1;
        state.data.bag.push(
          { ...SPECIAL_ITEMS.pet_food, id: 'pet_food', name: '神兽鲜肉', count: 7, uid: 'inventory_food' },
          { id: 'bait_normal', name: '普通鱼饵', count: 5, uid: 'inventory_bait' },
          { ...SPECIAL_ITEMS.star_crystal, count: 30, uid: 'inventory_crystals' }
        );
        state.notify();
      });
      await game.locator('#nav-tab-bag').click();
      const fixtureState = JSON.stringify(await data());
      const seen = [];
      for (let i = 0; i < 6; i++) {
        const slots = game.locator('.bag-slot-cell');
        for (let j = 0; j < await slots.count(); j++) await reachable(slots.nth(j));
        seen.push(...await slots.evaluateAll(elements => elements.map(element => element.dataset.bagUid)));
        if (await game.locator('#btn-bag-page-next').isDisabled()) break;
        await game.locator('#btn-bag-page-next').click();
      }
      check(seen.length === 41 && new Set(seen).size === 41, 'Pagination lost or repeated inventory items');
      check(JSON.stringify(await data()) === fixtureState, 'Paging modified resources');
      for (const [filter, expected] of [['consumable', 2], ['material', 1]]) {
        await game.locator(`[data-filter="${filter}"]`).click();
        check(await game.locator('.bag-slot-cell').count() === expected, 'Supply/material filters overlap or hide supplies');
      }
      await game.locator('[data-filter="all"]').click();
      const preview = await inspectPreview('inventory_0');
      check(preview.after.speed > preview.before.speed, 'Fixture does not exercise a speed increase');
      const inventoryFrame = await game.locator('.bag-slot-cell').first().evaluate(element => {
        const r = element.getBoundingClientRect();
        return { ok: Math.abs(r.width - r.height) < 2 && r.width >= 36, square: Math.abs(r.width - r.height), width: r.width, height: r.height };
      });
      check(inventoryFrame.ok, `Inventory frame is stretched or too small: ${JSON.stringify(inventoryFrame)}`);
      // 新 UI：详情常驻区隐藏，改悬停卡；穿戴用左键菜单。
      check(await game.locator('.bag-detail').first().evaluate(e => getComputedStyle(e).display === 'none'), 'Legacy bag detail panel should be hidden');
      await game.screenshot({ path: `output/playwright/material5-${width}-bag.png`, animations: 'disabled' });
      await game.locator('[data-bag-uid="inventory_0"]').click();
      await game.locator('#bag-action-menu').waitFor();
      await game.locator('#bag-action-menu button').filter({ hasText: '穿戴' }).first().click();
      await dismiss();
      check(JSON.stringify(await game.evaluate(() => window.gameState.getEffectiveStats())) === JSON.stringify(preview.after), 'Fixture equip differs from preview');
      await game.locator('#nav-tab-bag').click();
      const socketed = JSON.stringify(await data());
      await game.locator('[data-bag-uid="inventory_1"]').click();
      await game.locator('#bag-action-menu').waitFor();
      check(await game.locator('#bag-action-menu button').filter({ hasText: '卖出' }).first().isDisabled(), 'Sale of socketed equipment should be blocked in menu');
      await game.evaluate(() => document.getElementById('bag-action-menu')?.remove());
      check(JSON.stringify(await data()) === socketed, 'Refused sale modified resources');
      const beforeSale = await data();
      await game.locator('[data-bag-uid="inventory_2"]').click();
      await game.locator('#bag-action-menu').waitFor();
      await game.locator('#bag-action-menu button').filter({ hasText: '卖出' }).first().click();
      await game.locator('#game-modal-btn-cancel').focus(); await game.keyboard.press('Enter');
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      check(JSON.stringify(await data()) === JSON.stringify(beforeSale), 'Cancelled sale modified resources');
      await game.locator('[data-bag-uid="inventory_2"]').click();
      await game.locator('#bag-action-menu').waitFor();
      await game.locator('#bag-action-menu button').filter({ hasText: '卖出' }).first().click();
      await game.locator('#game-modal-btn-confirm').click(); await dismiss();
      const sold = await data();
      check(sold.gold === beforeSale.gold + 500 && !sold.bag.some(item => item.uid === 'inventory_2') && sold.bag.length === beforeSale.bag.length - 1, 'Sale paid or removed the wrong item');

      // Controlled rolls exercise protection consumption and failure/success rules.
      await game.evaluate(() => {
        window.gameState.data.equipped.weapon.stars = 7;
        window.gameState.data.bag.push({ id: 'protect_crystal', uid: 'forge_protection', name: '保护水晶', count: 2 });
        window.gameState.notify();
      });
      await showSmithy('smithy_enhance');
      await game.locator('[data-smithy-slot="weapon"]').click();
      const amount = (state, id) => state.bag.find(item => item.id === id)?.count || 0;
      for (const [protectedRoll, roll, expectedStars, crystalCost, protectionCost] of [[true, .99, 7, 8, 1], [false, .99, 6, 8, 0], [true, 0, 7, 7, 0]]) {
        await game.locator('#chk-use-protect').setChecked(protectedRoll);
        const before = await data();
        await game.evaluate(roll => { window.forgeRandomBeforeTest = Math.random; Math.random = () => roll; }, roll);
        try { await game.locator('#btn-do-enhance').click(); }
        finally { await game.evaluate(() => { Math.random = window.forgeRandomBeforeTest; delete window.forgeRandomBeforeTest; }); }
        await dismiss();
        const after = await data();
        check(after.equipped.weapon.stars === expectedStars, 'Enhancement failure/success changed wrong stars');
        check(amount(before, 'star_crystal') - amount(after, 'star_crystal') === crystalCost, 'Enhancement charged wrong crystal count');
        check(amount(before, 'protect_crystal') - amount(after, 'protect_crystal') === protectionCost, 'Protection was consumed on the wrong branch');
      }

      // Damage and maximum stars are isolated presentation/payment boundary fixtures.
      const repair = await game.evaluate(() => {
        const state = window.gameState;
        state.data.equipped.weapon.durability = 0;
        state.data.equipped.armor.durability = 47;
        state.data.equipped.weapon.stars = 8;
        state.notify();
        return { ...state.getRepairQuote(), gold: state.data.gold };
      });
      await showSmithy('smithy_enhance');
      await game.locator('[data-smithy-slot="weapon"]').click();
      check(await game.locator('#btn-do-enhance').isDisabled(), 'Maximum stars still offer enhancement');
      check(await game.locator('[data-enhance-success-rate],[data-enhance-crystal-cost],#chk-use-protect').count() === 0, 'Maximum stars show an invalid price or probability');
      await game.screenshot({ path: `output/playwright/material5-${width}-max-stars.png`, animations: 'disabled' });
      await game.locator('[data-goto="smithy_repair"]').click();
      check(await game.locator('[data-repair-slot]').count() === 12, 'Missing repair slots');
      for (let i = 0; i < 10; i++) {
        await game.locator('[data-repair-slot]').nth(i).scrollIntoViewIfNeeded();
        await reachable(game.locator('[data-repair-slot]').nth(i));
      }
      check((await game.locator('[data-repair-slot="weapon"]').innerText()).includes('已损坏'), 'Broken equipment state missing');
      check(Number(await game.locator('[data-repair-total]').getAttribute('data-repair-total')) === repair.cost, 'Repair quote is wrong');
      await reachable(game.locator('#btn-repair-all'));
      await game.screenshot({ path: `output/playwright/material5-${width}-repair.png`, animations: 'disabled' });
      await game.locator('#btn-repair-all').click(); await dismiss();
      const repaired = await data();
      check(repaired.gold === repair.gold - repair.cost && repaired.equipped.weapon.durability === 100 && repaired.equipped.armor.durability === 100, 'Repair changed wrong funds or durability');
      check(await game.locator('#btn-repair-all').isDisabled(), 'Fully repaired equipment still offers payment');
      await game.evaluate(() => {
        window.gameState.data.equipped.armor.durability = 0;
        window.gameState.data.gold = 0;
        window.gameState.notify();
      });
      const poor = JSON.stringify(await data());
      check(await game.locator('#btn-repair-all').isDisabled(), 'Unaffordable repair is enabled');
      check((await game.locator('.smithy-action-bar').innerText()).includes('还缺'), 'Missing repair shortage explanation');
      check(JSON.stringify(await data()) === poor, 'Unaffordable repair view changed resources');
      await game.reload();
      check((await data()).equipped.weapon.uid === 'inventory_0' && !(await data()).bag.some(item => item.uid === 'inventory_2'), 'Equipping or sale was lost on reload');
      check((await data()).equipped.weapon.stars === 8 && (await data()).equipped.weapon.durability === 100, 'Enhancement/repair state was lost on reload');
      check(await game.evaluate(() => document.body.scrollWidth <= innerWidth), 'Horizontal overflow');
      check(errors.length === 0, errors.join('; '));
      results.push({ width, classId, realOpeningEquipAndUpgrade: true, previewEqualsActualEquip: true, pagedItems: seen.length, filtersExclusive: true, saleGold: 500, enhancementBranches: 3, repairCost: repair.cost, maxStarAndPoorStates: true, refreshPreserved: true, errors });
    } finally { await context.close(); }
  }
  return { results, fixtureNote: 'First equipment and first enhancement are earned through the real opening; later inventory, damage, maximum stars and funds are explicit isolated fixtures, not natural growth evidence.' };
}
 
