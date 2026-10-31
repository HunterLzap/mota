async (page) => {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  for (const [width, height] of [[1280, 900], [1440, 1000]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height } });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const root = game.locator('.smithy-page-socket');
    const dismiss = async () => {
      for (let attempt = 0; attempt < 5 && await game.evaluate(() => window.gameModal.isOpen); attempt++) {
        await game.locator('#game-modal-btn-confirm').click();
      }
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const state = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const count = (data, id) => data.bag.filter(item => item.id === id).reduce((sum, item) => sum + (item.count ?? 1), 0);
    const cell = index => root.locator(`.smithy-socket-cell[data-socket-index="${index}"]`);
    const reachable = async locator => {
      await locator.scrollIntoViewIfNeeded();
      check(await locator.evaluate(element => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return box.width > 0 && box.height > 0 && box.left >= 0 && box.right <= innerWidth &&
          box.top >= 0 && box.bottom <= innerHeight && (hit === element || element.contains(hit));
      }), `${width}: control is clipped or covered`);
    };
    const layout = async () => {
      check(await game.evaluate(() => document.body.scrollWidth <= innerWidth + 1), `${width}: horizontal page overflow`);
      check(await root.locator('.smithy-detail,.smithy-scroll,.smithy-socket-grid,.smithy-gem-grid').evaluateAll(elements =>
        elements.every(element => element.scrollWidth <= element.clientWidth + 1)), `${width}: horizontal workshop overflow`);
    };
    const workspaceGeometry = async () => {
      const geometry = await root.locator('.smithy-action-bar').evaluate(action => {
        const page = action.closest('.smithy-page-socket');
        const main = action.closest('main').getBoundingClientRect();
        const inventory = page.querySelector('.smithy-workshop-inventory').getBoundingClientRect();
        const box = action.getBoundingClientRect();
        const insideMain = rect => rect.left >= main.left - 1 && rect.right <= main.right + 1 &&
          rect.top >= main.top - 1 && rect.bottom <= main.bottom + 1;
        const buttons = [...action.querySelectorAll('button')];
        return {
          left: box.left, top: box.top, bagScroll: page.querySelector('.smithy-bag-scroll').scrollTop,
          valid: box.right <= inventory.left + 1 && insideMain(box) && buttons.length > 0 && buttons.every(button => {
            const rect = button.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return rect.width > 0 && rect.height > 0 && insideMain(rect) && (hit === button || button.contains(hit));
          })
        };
      });
      check(geometry.valid, `${width}: material selection hides the fixed workbench action or overlaps the bag`);
      return geometry;
    };
    const chooseSlot = async slot => {
      const button = root.locator(`[data-socket-slot="${slot}"]`);
      await reachable(button);
      await button.focus(); await game.keyboard.press('Enter');
      check(await button.getAttribute('aria-pressed') === 'true', `${width}: keyboard did not select ${slot}`);
      check(await button.evaluate(element => document.activeElement === element), `${width}: equipment selection lost focus`);
    };
    const chooseGem = async uid => {
      const button = root.locator(`[data-gem-uid="${uid}"]`);
      const before = JSON.stringify(await state());
      const gridBefore = await workspaceGeometry();
      await reachable(button);
      await button.focus(); await game.keyboard.press('Enter');
      // Content may scroll; the action strip and independent bag must stay put.
      const gridAfter = await workspaceGeometry();
      check(Math.abs(gridAfter.left - gridBefore.left) <= 1 && Math.abs(gridAfter.top - gridBefore.top) <= 1 &&
        gridAfter.bagScroll === gridBefore.bagScroll, `${width}: scrolling/selecting a material moved the fixed action or bag`);
      check(await button.getAttribute('aria-pressed') === 'true', `${width}: keyboard did not select material ${uid}`);
      check(await button.evaluate(element => document.activeElement === element), `${width}: material selection lost focus`);
      check(JSON.stringify(await state()) === before, `${width}: selecting a material consumed resources`);
    };
    const inlay = async (slot, index, uid) => {
      await chooseGem(uid);
      const before = await state(), gem = before.bag.find(item => item.uid === uid);
      check(Boolean(gem), `${width}: missing test material ${uid}`);
      const button = cell(index).locator('.btn-inlay-gem');
      check(!await button.isDisabled(), `${width}: affordable inlay is disabled`);
      await reachable(button); await button.click(); await dismiss();
      const after = await state();
      check(after.gold === before.gold - 500 && count(after, gem.id) === count(before, gem.id) - 1, `${width}: incorrect inlay payment`);
      check(after.equipped[slot].gems[index]?.id === gem.id, `${width}: inlay reached the wrong equipment or socket`);
      check(await root.locator('.smithy-gem-button[aria-pressed="true"]').count() === 0, `${width}: successful inlay kept a stale material selection`);
      check(await game.evaluate(() => window.appInstance.views.town.selectedGemUid === null), `${width}: material selection was not cleared`);
      await layout();
    };
    const remove = async (slot, index) => {
      const before = await state(), gem = before.equipped[slot].gems[index];
      const button = cell(index).locator('.btn-remove-gem');
      await reachable(button); await button.click(); await dismiss();
      const after = await state();
      check(after.gold === before.gold, `${width}: extraction charged gold`);
      check(!after.equipped[slot].gems[index] && count(after, gem.id) === count(before, gem.id) + 1, `${width}: extraction lost or duplicated a material`);
      return after;
    };
    const refillBag = async omitId => game.evaluate(id => {
      const data = window.gameState.data;
      if (id) data.bag = data.bag.filter(item => item.id !== id);
      let serial = 0;
      while (data.bag.length < window.gameState.getBagCapacity()) {
        const fillerId = 'socket_filler_' + serial++;
        if (data.bag.some(item => item.id === fillerId)) continue;
        data.bag.push({ id: fillerId, uid: fillerId, name: '封存的矿砂', type: 'material', count: 1 });
      }
      window.gameState.notify();
      window.appInstance.views.town.render();
    }, omitId);
    const ledger = async () => game.evaluate(() => {
      const data = window.gameState.data;
      return {
        gold: data.gold,
        capacity: window.gameState.getBagCapacity(),
        bag: data.bag.map(item => ({ id: item.id, uid: item.uid, count: item.count, stat: item.stat, val: item.val, stats: item.stats })),
        equipment: Object.entries(data.equipped).filter(([, item]) => item).map(([slot, item]) => ({
          slot, uid: item.uid, sockets: item.sockets, durability: item.durability,
          gems: item.gems, runicWord: item.runicWord, runicWordName: item.runicWordName
        }))
      };
    });
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click(); await dismiss();
      // Explicit isolated equipment/resources/access fixtures; all workshop transactions use real buttons.
      await game.evaluate(async () => {
        const { RUNES } = await import('/js/config/runes.js');
        const { ITEM_SLOTS, SPECIAL_ITEMS, generateEquipment } = await import('/js/config/items.js');
        const data = window.gameState.data;
        data.level = 40; data.onboardingVersion = 0; data.gold = 999; data.bagCapacity = 40;
        data.equipped = Object.fromEntries(ITEM_SLOTS.map(slot => [slot.id, null]));
        for (const slot of ['weapon', 'armor', 'boots']) {
          data.equipped[slot] = {
            ...generateEquipment(slot, 15, 'gold', null, 'warrior'), uid: 'socket_equipment_' + slot,
            stars: 0, sockets: slot === 'armor' ? 4 : 0, gems: [], durability: 100, maxDurability: 100
          };
        }
        data.bag = [
          { ...SPECIAL_ITEMS.socket_crystal, uid: 'socket_drill', count: 4 },
          { id: 'gem_atk', uid: 'socket_gem_atk', name: '金刚石', type: 'gem', stat: 'atk', val: 25, count: 2, quality: 'gold', icon: 'images/items/gem_atk.svg' },
          { id: 'gem_hp', uid: 'socket_gem_hp', name: '红宝石', type: 'gem', stat: 'maxHp', val: 180, count: 1, quality: 'gold', icon: 'images/items/gem_hp.svg' },
          ...['rune_el', 'rune_cham', 'rune_lo', 'rune_ber', 'rune_ith'].map(id => ({ ...RUNES[id], uid: 'socket_' + id, count: 2 }))
        ];
        window.appInstance.views.town.selectedEquipSlot = 'weapon';
        window.appInstance.views.town.selectedGemUid = null;
        window.gameState.notify();
      });
      await game.locator('#nav-tab-town').click();
      await game.locator('[data-goto="smithy"]').click();
      await game.locator('[data-goto="smithy_socket"]').click();
      check(await root.locator('.smithy-socket-cell[data-socket-state="locked"]').count() === 4, `${width}: new weapon has incorrect socket display`);
      check(await root.locator('#btn-punch-socket').evaluate(button => button instanceof HTMLButtonElement && button.disabled), `${width}: insufficient gold does not use native disabled`);
      check((await root.locator('#btn-punch-socket').innerText()).includes('金币不足'), `${width}: opening shortage is not explained`);
      check(await root.locator('.smithy-gem-button[aria-pressed="true"]').count() === 0, `${width}: materials should start unselected`);
      const expectedBonuses = {
        socket_gem_atk: ['攻击 +25'],
        socket_gem_hp: ['生命 +180'],
        socket_rune_el: ['智力 +15', '攻击 +20'],
        socket_rune_cham: ['防御 +35', '伤害减免 +4%'],
        socket_rune_lo: ['体魄 +20', '生命 +300'],
        socket_rune_ber: ['全四维 +15', '伤害加成 +8%'],
        socket_rune_ith: ['速度 +20', '敏捷 +12']
      };
      for (const [uid, texts] of Object.entries(expectedBonuses)) {
        const button = root.locator(`[data-gem-uid="${uid}"]`);
        await reachable(button);
        const bonus = await button.locator('.smithy-gem-bonus').innerText();
        check(texts.every(text => bonus.includes(text)) && !/[A-Za-z]/.test(bonus), `${width}: missing/localization error in ${uid}: ${bonus}`);
        check((bonus.match(/%/g) || []).length === texts.filter(text => text.includes('%')).length, `${width}: incorrect percent units in ${uid}`);
        check(bonus.startsWith(uid.includes('rune') ? '符文' : '宝石'), `${width}: wrong material type label`);
      }
      check(!/undefined|NaN/.test(await root.innerText()), `${width}: invalid values in workshop`);
      await game.evaluate(() => {
        window.gameState.data.gold = 50000;
        window.gameState.notify(); window.appInstance.views.town.render();
      });
      for (let sockets = 0; sockets < 4; sockets++) {
        const before = await state(), button = root.locator('#btn-punch-socket');
        check((await root.locator('.smithy-quote').innerText()).includes(((sockets + 1) * 1000).toLocaleString('en-US')), `${width}: wrong next-hole quote`);
        await reachable(button); await button.click(); await dismiss();
        const after = await state();
        check(after.gold === before.gold - (sockets + 1) * 1000, `${width}: hole ${sockets + 1} charged incorrectly`);
        check(count(after, 'socket_crystal') === count(before, 'socket_crystal') - 1, `${width}: opening did not consume exactly one drill`);
        check(after.equipped.weapon.sockets === sockets + 1, `${width}: opening changed the wrong socket count`);
      }
      check(await root.locator('#btn-punch-socket').isDisabled(), `${width}: fifth socket is allowed`);
      check((await root.locator('#btn-punch-socket').innerText()).includes('上限'), `${width}: four-hole cap is not explained`);
      await chooseSlot('boots');
      check(await root.locator('#btn-punch-socket').isDisabled() && (await root.locator('#btn-punch-socket').innerText()).includes('缺少'), `${width}: missing drills did not disable opening`);
      await chooseSlot('ring');
      check(await root.locator('#btn-punch-socket').isDisabled(), `${width}: empty equipment slot allows opening`);
      await chooseSlot('weapon');
      check(await cell(0).locator('.btn-inlay-gem').isDisabled(), `${width}: inlay allowed without selecting a material`);
      const numberContrast = await root.locator('.smithy-socket-number').evaluateAll(numbers => {
        const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number)
          .map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
          .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        return {
          count: numbers.length,
          minimum: Math.min(...numbers.map(number => {
            const foreground = luminance(getComputedStyle(number).color);
            const background = luminance(getComputedStyle(number.closest('.smithy-item-icon')).backgroundColor);
            return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
          }))
        };
      });
      check(numberContrast.count === 4 && numberContrast.minimum >= 4.5, `${width}: empty-socket numbers lack contrast against their dark backing`);
      const materialScroll = root.locator('.smithy-material-panel .smithy-scroll');
      check(await materialScroll.evaluate(element => element.scrollHeight > element.clientHeight), `${width}: material scroll fixture does not overflow`);
      await materialScroll.evaluate(element => { element.scrollTop = 0; });
      const gridBeforeScroll = await workspaceGeometry();
      await materialScroll.hover(); await game.mouse.wheel(0, 2000);
      await game.waitForFunction(() => document.querySelector('.smithy-material-panel .smithy-scroll').scrollTop > 0);
      await chooseGem('socket_rune_ith');
      const gridAfterScroll = await workspaceGeometry();
      check(Math.abs(gridAfterScroll.top - gridBeforeScroll.top) <= 1 && gridAfterScroll.bagScroll === gridBeforeScroll.bagScroll,
        `${width}: real material-list scrolling moved the fixed action or independent bag`);
      await chooseGem('socket_gem_atk');
      const goldBeforeShortage = (await state()).gold;
      await game.evaluate(() => {
        window.gameState.data.gold = 499;
        window.gameState.notify(); window.appInstance.views.town.render();
      });
      check(await cell(0).locator('.btn-inlay-gem').evaluate(button => button instanceof HTMLButtonElement && button.disabled), `${width}: inlay shortage does not use native disabled`);
      await game.evaluate(gold => {
        window.gameState.data.gold = gold;
        window.gameState.notify(); window.appInstance.views.town.render();
      }, goldBeforeShortage);
      await inlay('weapon', 0, 'socket_gem_atk');
      check((await cell(0).locator('.smithy-socket-bonus').innerText()).includes('宝石 · 攻击 +25'), `${width}: ordinary socket bonus is wrong`);
      await remove('weapon', 0);
      await inlay('weapon', 0, 'socket_rune_el');
      const elText = await cell(0).locator('.smithy-socket-bonus').innerText();
      check(elText.includes('符文') && elText.includes('智力 +15') && elText.includes('攻击 +20') && !elText.includes('%'), `${width}: rune attributes were treated as a single gem percentage`);
      await cell(0).scrollIntoViewIfNeeded();
      await game.screenshot({ path: `output/playwright/material6-socket-rune-${width}.png`, animations: 'disabled' });
      await remove('weapon', 0);

      await chooseSlot('armor');
      await inlay('armor', 0, 'socket_rune_cham');
      check(!(await state()).equipped.armor.runicWord, `${width}: incomplete recipe activated`);
      await inlay('armor', 1, 'socket_rune_lo');
      check((await state()).equipped.armor.runicWord === 'lionheart', `${width}: ordered runes did not activate with unused trailing sockets`);
      check((await root.locator('.smithy-runic-note').innerText()).includes('狮心守护'), `${width}: active rune word is not displayed`);
      await cell(0).scrollIntoViewIfNeeded(); await layout();
      await game.screenshot({ path: `output/playwright/material6-socket-${width}.png`, animations: 'disabled' });
      await inlay('armor', 2, 'socket_gem_atk');
      check(!(await state()).equipped.armor.runicWord && await root.locator('.smithy-runic-note').count() === 0, `${width}: mixed gem failed to deactivate the rune word`);
      await remove('armor', 2);
      check((await state()).equipped.armor.runicWord === 'lionheart', `${width}: removing the extra gem did not restore the recipe`);
      await game.evaluate(() => {
        window.gameState.data.equipped.armor.durability = 0;
        window.gameState.notify(); window.appInstance.views.town.render();
      });
      check((await root.locator('.smithy-runic-note').innerText()).includes('装备损坏，未生效'), `${width}: broken equipment displays an active bonus without warning`);
      await root.locator('.smithy-runic-note').scrollIntoViewIfNeeded();
      await game.screenshot({ path: `output/playwright/material6-socket-state-${width}.png`, animations: 'disabled' });
      await game.evaluate(() => {
        window.gameState.data.equipped.armor.durability = 100;
        window.gameState.notify(); window.appInstance.views.town.render();
      });

      // Capacity fixtures alter only bag occupancy; extraction itself uses actual workshop controls.
      await refillBag(null);
      const fullStacked = await state();
      check(fullStacked.bag.length === 40 && count(fullStacked, 'rune_cham') > 0, `${width}: full-stack fixture is invalid`);
      const extracted = await remove('armor', 0);
      check(extracted.bag.length === 40 && !extracted.equipped.armor.runicWord, `${width}: full-stack extraction changed bag capacity or left stale resonance`);
      await inlay('armor', 0, 'socket_rune_cham');
      check((await state()).equipped.armor.runicWord === 'lionheart', `${width}: reinserting the first rune did not restore the word`);
      await refillBag('rune_lo');
      const blockedBefore = JSON.stringify(await state());
      const removeBlocked = cell(1).locator('.btn-remove-gem');
      await reachable(removeBlocked); await removeBlocked.click();
      check((await game.locator('#game-modal-message').innerText()).includes('行囊已满'), `${width}: full bag did not explain refusal`);
      check(JSON.stringify(await state()) === blockedBefore, `${width}: rejected extraction lost a rune or changed currency`);
      await game.screenshot({ path: `output/playwright/material6-socket-full-${width}.png`, animations: 'disabled' });
      await dismiss(); await layout();
      check((await state()).gold === 37000, `${width}: transaction totals differ from 10000 opening + 3000 inlay fees`);
      const saved = await ledger();
      await game.reload();
      await game.waitForFunction(() => Boolean(window.appInstance?.views?.town && window.gameState?.data.hasChosenClass));
      check(JSON.stringify(await ledger()) === JSON.stringify(saved), `${width}: reload lost sockets, resources or resonance`);
      await game.locator('#nav-tab-town').click();
      await game.locator('[data-goto="smithy"]').click();
      await game.locator('[data-goto="smithy_socket"]').click();
      await chooseSlot('armor');
      check((await root.locator('.smithy-runic-note').innerText()).includes('狮心守护'), `${width}: saved resonance is missing from UI`);
      check(await cell(0).getAttribute('data-socket-state') === 'filled' && await cell(2).getAttribute('data-socket-state') === 'empty', `${width}: saved socket layout is incorrect`);
      check(await root.locator('.smithy-gem-button[aria-pressed="true"]').count() === 0, `${width}: reload retained a stale material selection`);
      await layout();
      check(errors.length === 0, `${width}: ${errors.join('; ')}`);
      results.push({
        width, height, openingGold: 10000, drillsConsumed: 4, inlayGold: 3000, paidInlays: 6,
        nativeDisabled: true, keyboardSelectionFocus: true, localizedBonusUnits: true,
        independentMaterialScroll: true, fixedActionReachability: true, emptySocketContrast: numberContrast.minimum,
        runeWordActivatedDeactivatedRestored: true, fullBagStackSafe: true, fullBagRefusalSafe: true,
        saved: true, errors
      });
    } finally { await context.close(); }
  }
  return { results, fixture: 'Isolated equipment, funds, access and bag occupancy; real workshop buttons verify transactions, not natural acquisition or balance.' };
}
