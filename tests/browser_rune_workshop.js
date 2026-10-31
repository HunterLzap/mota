async (page) => {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const count = (data, id) => data.bag.filter(item => item.id === id).reduce((sum, item) => sum + (item.count ?? 1), 0);
  for (const [width, height] of [[1280, 900], [1440, 1000]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height } });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const root = game.locator('.smithy-page-runes');
    const state = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const stats = () => game.evaluate(() => window.gameState.getEffectiveStats());
    const dismiss = async () => {
      for (let i = 0; i < 5 && await game.evaluate(() => window.gameModal.isOpen); i++) {
        await game.locator('#game-modal-btn-confirm').click();
      }
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const layout = async () => {
      check(await game.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth + 1),
        `${width}: page has horizontal overflow`);
      check(await root.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${width}: workshop has horizontal overflow`);
      check(!/undefined|NaN/.test(await root.innerText()), `${width}: workshop contains invalid values`);
      check(await root.locator('#btn-inscribe-next-rune').evaluate(button => {
        const range = document.createRange(); range.selectNodeContents(button);
        const text = range.getBoundingClientRect(), box = button.getBoundingClientRect();
        return text.left >= box.left + 12 && text.right <= box.right - 12 &&
          text.top >= box.top && text.bottom <= box.bottom;
      }), `${width}: action label overlaps the metal frame or overflows`);
    };
    const reachable = async (locator, allowScroll = true) => {
      if (allowScroll) await locator.scrollIntoViewIfNeeded();
      check(await locator.evaluate(element => {
        const rect = element.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return rect.width > 0 && rect.height > 0 && rect.left >= main.left - 1 && rect.right <= main.right + 1 &&
          rect.top >= main.top - 1 && rect.bottom <= main.bottom + 1 && (hit === element || element.contains(hit));
      }), `${width}: control is clipped or covered`);
    };
    const chooseSlot = async slot => {
      const button = root.locator(`button[data-socket-slot="${slot}"]`);
      const before = JSON.stringify(await state());
      await reachable(button); await button.focus(); await game.keyboard.press('Enter');
      check(await button.getAttribute('aria-pressed') === 'true', `${width}: keyboard did not select ${slot}`);
      check(await button.evaluate(element => element === document.activeElement), `${width}: slot selection lost keyboard focus`);
      check(JSON.stringify(await state()) === before, `${width}: slot selection changed game data`);
    };
    const chooseRecipe = async id => {
      const button = root.locator(`button[data-runic-word="${id}"]`);
      check(await button.count() === 1, `${width}: missing recipe ${id}`);
      const before = JSON.stringify(await state());
      await reachable(button); await button.focus(); await game.keyboard.press('Enter');
      check(await button.getAttribute('aria-pressed') === 'true', `${width}: keyboard did not select recipe ${id}`);
      check(await root.locator('button[data-runic-word][aria-pressed="true"]').count() === 1, `${width}: recipe selection is ambiguous`);
      check(await button.evaluate(element => element === document.activeElement), `${width}: recipe selection lost keyboard focus`);
      check(JSON.stringify(await state()) === before, `${width}: recipe selection changed game data`);
      // Check the fixed action without scrolling it back into view.
      await reachable(root.locator('#btn-inscribe-next-rune'), false);
      await reachable(root.locator('.runic-recipe-detail h4'));
      await reachable(root.locator('#btn-inscribe-next-rune'), false);
    };
    const openFromSmithy = async () => {
      await game.locator('#tab-content-town [data-goto="smithy_runes"]').click();
      check(await root.isVisible(), `${width}: smithy entrance did not open the rune workshop`);
    };
    const remove = async index => {
      const before = await state(), gem = before.equipped.armor.gems[index];
      const button = root.locator(`.btn-remove-rune[data-remove-socket-slot="armor"][data-remove-socket-idx="${index}"]`);
      await reachable(button); await button.click(); await dismiss();
      const after = await state();
      check(after.gold === before.gold, `${width}: rune extraction charged gold`);
      check(!after.equipped.armor.gems[index] && count(after, gem.id) === count(before, gem.id) + 1,
        `${width}: extraction lost or duplicated a rune`);
      return after;
    };
    const inscribeNext = async (id, index, broken = false) => {
      const before = await state(), button = root.locator('#btn-inscribe-next-rune');
      const bagRune = before.bag.find(item => item.id === id);
      check(Boolean(bagRune), `${width}: missing expected rune ${id}`);
      const disabled = await button.isDisabled();
      check(!disabled, `${width}: affordable next rune is disabled: ${JSON.stringify({
        text: await button.innerText(), status: await root.locator('.runic-status').innerText(),
        target: await root.locator('.smithy-rune-target').innerText(),
        recipe: await root.locator('button[data-runic-word][aria-pressed="true"]').getAttribute('data-runic-word'),
        gemIds: before.equipped[await button.getAttribute('data-inscribe-slot')]?.gems?.map(gem => gem?.id || null)
      })}`);
      check(await button.getAttribute('data-inscribe-slot') === 'armor' &&
        Number(await button.getAttribute('data-inscribe-socket')) === index &&
        await button.getAttribute('data-inscribe-rune-id') === (bagRune.uid || bagRune.id) &&
        await button.getAttribute('data-equipment-uid') === before.equipped.armor.uid,
      `${width}: next-rune action targets stale equipment, material, or socket`);
      await reachable(button, false); await button.click();
      if (broken) {
        const message = await game.locator('#game-modal-message').innerText();
        check(/损坏|破损/.test(message) && /未生效|不生效/.test(message), `${width}: broken-item success modal claims an effective rune word`);
      }
      await dismiss();
      const after = await state();
      check(after.gold === before.gold - 500 && count(after, id) === count(before, id) - 1,
        `${width}: next-rune payment is not exactly 500 gold and one ${id}`);
      check(after.equipped.armor.gems[index]?.id === id && after.equipped.armor.gems[index]?.isRune,
        `${width}: next rune reached the wrong hole`);
      check((await root.locator(`.runic-socket-cell[data-runic-socket="${index}"]`).innerText()).includes(bagRune.name),
        `${width}: actual socket does not show its inserted rune`);
      await layout();
      return after;
    };
    const refillBag = async omit => game.evaluate(id => {
      const data = window.gameState.data;
      if (id) data.bag = data.bag.filter(item => item.id !== id);
      let serial = 0;
      while (data.bag.length < window.gameState.getBagCapacity()) {
        const filler = 'runic_filler_' + serial++;
        if (data.bag.some(item => item.id === filler)) continue;
        data.bag.push({ id: filler, uid: filler, name: '封存的矿砂', type: 'material', count: 1 });
      }
      window.gameState.notify(); window.appInstance.views.town.render();
    }, omit);
    const ledger = () => game.evaluate(() => {
      const data = window.gameState.data;
      return { gold: data.gold, crystal: data.crystal, bag: data.bag, equipped: data.equipped, bagCapacity: window.gameState.getBagCapacity() };
    });
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click();
      await game.locator('#game-modal-btn-cancel').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      // Explicit equipment, resources and legacy-access fixtures. Transactions
      // below use real controls; these fixtures do not prove natural acquisition.
      const recipes = await game.evaluate(async () => {
        const { RUNES, RUNIC_WORDS } = await import('/js/config/runes.js');
        const { ITEM_SLOTS, generateEquipment } = await import('/js/config/items.js');
        const data = window.gameState.data;
        data.level = 40; data.onboardingVersion = 0; data.gold = 20000; data.bagCapacity = 40;
        data.equipped = Object.fromEntries(ITEM_SLOTS.map(slot => [slot.id, null]));
        for (const slot of ['weapon', 'armor', 'boots']) {
          data.equipped[slot] = {
            ...generateEquipment(slot, 15, 'gold', null, 'warrior'), uid: 'runic_equipment_' + slot,
            stars: 0, sockets: slot === 'armor' ? 4 : slot === 'weapon' ? 3 : 0,
            gems: [], durability: 100, maxDurability: 100
          };
        }
        data.bag = Object.values(RUNES).map(rune => ({ ...rune, uid: 'runic_' + rune.id, count: 4 }));
        window.appInstance.views.town.selectedEquipSlot = 'armor';
        window.gameState.notify();
        return RUNIC_WORDS.map(word => ({ id: word.id, name: word.name, runes: word.runes.map(id => RUNES[id].name) }));
      });
      await game.locator('#nav-tab-town').click();
      // The source must offer all eight configured rune identities. Explicit
      // merit and deterministic random-bin fixtures exercise eight real trades.
      await game.evaluate(() => {
        window.gameState.data.factionWar.merit = 1200;
        window.gameState.data.factionWar.totalMerit = 1200;
        window.gameState.notify();
      });
      await game.locator('.classic-town-location[data-goto="faction_war"]').click();
      const runeIds = await game.evaluate(async () => Object.keys((await import('/js/config/runes.js')).RUNES));
      const sourceResults = [], sourceProblems = [];
      for (let index = 0; index < runeIds.length; index++) {
        const before = await state();
        await game.evaluate(sample => {
          window.__runicOriginalRandom = Math.random;
          Math.random = () => sample;
        }, (index + 0.5) / runeIds.length);
        try {
          const exchange = game.locator('.btn-exchange-faction-reward[data-reward-id="rw_box"]');
          await reachable(exchange); await exchange.click();
        } finally {
          await game.evaluate(() => {
            Math.random = window.__runicOriginalRandom;
            delete window.__runicOriginalRandom;
          });
        }
        const after = await state(), message = await game.locator('#game-modal-message').innerText();
        const gained = runeIds.filter(id => count(after, id) === count(before, id) + 1);
        check(before.factionWar.merit - after.factionWar.merit === 150 && gained.length === 1,
          `${width}: rune chest did not charge 150 merit and grant exactly one configured rune`);
        check(after.factionWar.totalMerit === before.factionWar.totalMerit && after.gold === before.gold,
          `${width}: rune chest altered cumulative merit or gold`);
        const rune = after.bag.find(item => item.id === gained[0]);
        const directRuneMessage = message.includes(rune.name) && /获得|得到|获取|收入行囊/.test(message);
        if (!directRuneMessage) sourceProblems.push(`Trade ${index + 1} granted ${gained[0]} but message said: ${message}`);
        check(!after.bag.some(item => item.id === 'rw_box'), `${width}: rune source incorrectly left an unopened chest`);
        sourceResults.push({ sample: (index + 0.5) / runeIds.length, rune: gained[0], directRuneMessage });
        await dismiss();
      }
      const missing = runeIds.filter(id => !sourceResults.some(result => result.rune === id));
      if (missing.length) sourceProblems.push('Unavailable configured runes: ' + missing.join(', '));
      await game.screenshot({ path: `output/playwright/material7-runes-${width}-source.png`, animations: 'disabled' });
      console.log(JSON.stringify({ width, sourceResults, sourceProblems }));
      check(sourceProblems.length === 0, `${width}: rune source failed: ${sourceProblems.join('; ')}`);
      await game.locator('#tab-content-town button[data-goto="hub"]').click();
      const initialFixture = await state();
      await game.locator('[data-goto="smithy"]').click();
      await openFromSmithy();
      check(await root.locator('button[data-runic-word]').count() === 7, `${width}: missing rune-word recipes`);
      check(await root.locator('button[data-socket-slot]').count() === 10, `${width}: missing equipment slots`);
      await chooseSlot('armor');
      for (const recipe of recipes) {
        await chooseRecipe(recipe.id);
        const text = await root.locator('.runic-recipe-detail').innerText();
        check(text.includes(recipe.name), `${width}: selected recipe name is missing`);
        for (const [index, name] of recipe.runes.entries()) {
          check(new RegExp(`第\\s*${index + 1}\\s*孔`).test(text) && text.includes(name),
            `${width}: ${recipe.id} does not explain ordered hole ${index + 1} and its rune`);
        }
        check(/库存|持有|拥有|行囊/.test(text), `${width}: recipe does not expose available materials`);
        await layout();
      }
      await chooseRecipe('lionheart');
      check(await root.locator('.runic-socket-cell[data-runic-socket]').count() === 4, `${width}: actual equipment holes are missing`);
      await game.screenshot({ path: `output/playwright/material7-runes-${width}-recipe.png`, animations: 'disabled' });
      await inscribeNext('rune_cham', 0);
      check(!(await state()).equipped.armor.runicWord, `${width}: incomplete rune sequence activated`);
      const oneRuneStats = await stats();
      await inscribeNext('rune_lo', 1);
      const activeStats = await stats();
      check((await state()).equipped.armor.runicWord === 'lionheart', `${width}: ordered armor recipe did not resonate`);
      check(activeStats.dmgResist === oneRuneStats.dmgResist + 12, `${width}: completed recipe did not add its real damage reduction`);
      check((await root.locator('.runic-status').innerText()).includes('狮心守护'), `${width}: active word is absent from status`);
      check(await root.locator('#btn-inscribe-next-rune').isDisabled(), `${width}: completed recipe allows an extra automatic rune`);
      await game.screenshot({ path: `output/playwright/material7-runes-${width}-active.png`, animations: 'disabled' });

      // Manual engraving remains explicit and fills the first empty hole.
      const manual = root.locator('details.runic-materials');
      if (!await manual.evaluate(element => element.open)) await manual.locator('summary').click();
      const beforeManual = await state(), el = beforeManual.bag.find(item => item.id === 'rune_el');
      const manualButton = manual.locator(`.btn-inscribe-rune[data-inscribe-rune-id="${el.uid}"]`);
      await reachable(manualButton); await manualButton.click(); await dismiss();
      const afterManual = await state();
      check(afterManual.gold === beforeManual.gold - 500 && count(afterManual, 'rune_el') === count(beforeManual, 'rune_el') - 1 &&
        afterManual.equipped.armor.gems[2]?.id === 'rune_el', `${width}: manual engraving did not pay once and fill the first empty hole`);
      check(!afterManual.equipped.armor.runicWord && (await stats()).dmgResist === activeStats.dmgResist - 12,
        `${width}: extra manual rune left the old recipe effective`);
      const extraDisabled = await root.locator('#btn-inscribe-next-rune').isDisabled();
      const extraStatus = await root.locator('.runic-status').innerText();
      check(extraDisabled && /额外|多余|摘除/.test(extraStatus),
        `${width}: extra material is not explained or blocked: ${JSON.stringify({ extraDisabled, extraStatus, target: await root.locator('.smithy-rune-target').innerText() })}`);
      await remove(2);
      check((await state()).equipped.armor.runicWord === 'lionheart' && (await stats()).dmgResist === activeStats.dmgResist,
        `${width}: removing the extra rune failed to restore resonance`);
      await remove(0);
      check(!(await state()).equipped.armor.runicWord && (await state()).equipped.armor.gems[1]?.id === 'rune_lo',
        `${width}: extracting the first rune shifted the second hole or left stale resonance`);
      await inscribeNext('rune_cham', 0);
      check((await state()).equipped.armor.runicWord === 'lionheart', `${width}: guided refill did not repair the first-hole gap`);

      // Broken gear may still hold a matching recipe, but neither its UI nor
      // the successful engraving dialog may claim its bonuses currently work.
      await game.evaluate(() => {
        window.gameState.data.equipped.armor.durability = 0;
        window.gameState.notify(); window.appInstance.views.town.render();
      });
      await remove(1);
      const brokenBefore = await stats();
      await inscribeNext('rune_lo', 1, true);
      const brokenAfter = await stats(), brokenText = await root.locator('.runic-status').innerText();
      check((await state()).equipped.armor.runicWord === 'lionheart' && /损坏|破损/.test(brokenText) && /未生效|不生效/.test(brokenText),
        `${width}: damaged matching recipe is presented as active`);
      check(brokenBefore.def === brokenAfter.def && brokenBefore.dmgResist === brokenAfter.dmgResist,
        `${width}: engraving into broken gear changed effective defenses`);
      await game.screenshot({ path: `output/playwright/material7-runes-${width}-broken.png`, animations: 'disabled' });
      const repairQuote = await game.evaluate(() => window.gameState.getRepairQuote().cost);
      const beforeRepair = await state();
      await root.locator('.runic-actions [data-goto="smithy_repair"]').click();
      const repairPageArmor = await game.evaluate(() => window.gameState.data.equipped.armor?.name || null);
      check(repairPageArmor, `${width}: navigation to repair removed the worn armor: ${repairPageArmor}`);
      await game.locator('#btn-repair-all').click(); await dismiss();
      const afterRepair = await state();
      check(afterRepair.gold === beforeRepair.gold - repairQuote && afterRepair.equipped.armor?.durability === 100,
        `${width}: real repair failed to pay the quoted cost or restore durability: ${JSON.stringify({
          goldBefore: beforeRepair.gold, goldAfter: afterRepair.gold, quote: repairQuote,
          armorBefore: beforeRepair.equipped.armor?.name, armorAfter: afterRepair.equipped.armor?.name,
          durability: afterRepair.equipped.armor?.durability
        })}`);
      check(await game.locator('.smithy-page-repair').isVisible(), `${width}: ordinary repair unexpectedly navigated away`);
      await game.locator('#tab-content-town [data-goto="smithy"]').click();
      await openFromSmithy(); await chooseSlot('armor'); await chooseRecipe('lionheart');
      check((await stats()).dmgResist === activeStats.dmgResist && !/未生效|不生效/.test(await root.locator('.runic-status').innerText()),
        `${width}: repair did not restore effective resonance`);

      // Filled-bag fixtures: an existing stack accepts a returned rune; a rune
      // without a stack must be refused without taking it out of the equipment.
      await refillBag(null);
      const full = await state();
      check(full.bag.length === 40 && count(full, 'rune_cham') > 0, `${width}: invalid full-stack fixture`);
      await remove(0);
      check((await state()).bag.length === 40, `${width}: returning into an existing stack used another bag slot`);
      await inscribeNext('rune_cham', 0);
      await refillBag('rune_lo');
      const refusedBefore = JSON.stringify(await state());
      const blocked = root.locator('.btn-remove-rune[data-remove-socket-slot="armor"][data-remove-socket-idx="1"]');
      await reachable(blocked); await blocked.click();
      check((await game.locator('#game-modal-message').innerText()).includes('行囊已满'), `${width}: full-bag refusal is not explained`);
      check(JSON.stringify(await state()) === refusedBefore, `${width}: rejected extraction changed equipment or resources`);
      await game.screenshot({ path: `output/playwright/material7-runes-${width}-full.png`, animations: 'disabled' });
      await dismiss();
      check((await state()).gold === 20000 - 3000 - repairQuote, `${width}: six inscriptions and repair did not total correctly`);
      const saved = await ledger(), completedData = await state();
      await game.reload();
      await game.waitForFunction(() => Boolean(window.appInstance?.views?.town && window.gameState?.data.hasChosenClass));
      check(JSON.stringify(await ledger()) === JSON.stringify(saved), `${width}: reload changed runes, resonance, funds or inventory`);
      await game.locator('#nav-tab-town').click();
      await game.locator('[data-goto="smithy"]').click(); await openFromSmithy();
      await chooseSlot('armor'); await chooseRecipe('lionheart');
      check((await root.locator('.runic-status').innerText()).includes('狮心守护'), `${width}: reload lost the displayed resonance`);

      const cases = [
        ['reverse', /顺序|第\s*1\s*孔/], ['wrong-slot', /部位|适用/], ['extra-gem', /额外|多余|摘除/],
        ['zero-holes', /孔/], ['full-holes', /满|额外|多余|摘除/], ['no-equipment', /未穿戴|先穿戴|无装备/],
        ['short-gold', /金币/], ['missing-rune', /缺少|缺乏|不足|没有|暂无|缺料/],
        ['wrong-after-gap', /第\s*2\s*孔|顺序/], ['extra-after-gap', /额外|摘除/], ['one-hole', /孔/]
      ];
      for (const [name, explanation] of cases) {
        // Separate invalid-state fixtures begin from the same empty armor and
        // supplies, so a previous failure cannot hide the current requirement.
        await game.evaluate(async ({ base, name }) => {
          const { RUNES } = await import('/js/config/runes.js');
          Object.assign(window.gameState.data, JSON.parse(JSON.stringify(base)));
          const data = window.gameState.data, rune = id => ({ ...RUNES[id], isRune: true });
          if (name === 'wrong-after-gap') data.equipped.armor.gems = [null, rune('rune_el')];
          if (name === 'extra-after-gap') data.equipped.armor.gems = [null, rune('rune_lo'), rune('rune_el')];
          if (name === 'one-hole') data.equipped.armor.sockets = 1;
          if (name === 'reverse') data.equipped.armor.gems = [rune('rune_lo'), rune('rune_cham')];
          if (name === 'wrong-slot') data.equipped.weapon.gems = [rune('rune_cham'), rune('rune_lo')];
          if (name === 'extra-gem') data.equipped.armor.gems = [
            rune('rune_cham'), rune('rune_lo'),
            { id: 'gem_atk', name: '金刚石', isRune: false, stat: 'atk', val: 25 }
          ];
          if (name === 'zero-holes') data.equipped.armor.sockets = 0;
          if (name === 'full-holes') data.equipped.armor.gems = [
            rune('rune_cham'), rune('rune_lo'), rune('rune_el'), rune('rune_ith')
          ];
          if (name === 'no-equipment') data.equipped.armor = null;
          if (name === 'short-gold') data.gold = 499;
          if (name === 'missing-rune') data.bag = data.bag.filter(item => item.id !== 'rune_cham');
          window.gameState.updateRunicWord('armor');
          window.gameState.updateRunicWord('weapon');
          window.gameState.notify(); window.appInstance.views.town.render();
        }, { base: initialFixture, name });
        await chooseSlot(name === 'wrong-slot' ? 'weapon' : 'armor');
        await chooseRecipe('lionheart');
        if (name === 'reverse') {
          check(!(await state()).equipped.armor.runicWord, `${width}: reversed sequence formed a rune word`);
        }
        if (name === 'wrong-slot') {
          const effects = await game.evaluate(() => {
            const state = window.gameState, item = state.data.equipped.weapon, gems = item.gems;
            const withRunes = state.getEffectiveStats();
            try {
              item.gems = [];
              const withoutRunes = state.getEffectiveStats();
              return {
                word: item.runicWord,
                damageReduction: withRunes.dmgResist - withoutRunes.dmgResist,
                defense: withRunes.def - withoutRunes.def
              };
            } finally { item.gems = gems; }
          });
          check(!effects.word && effects.damageReduction === 4 && effects.defense === 65,
            `${width}: unsuitable slot did not retain only the two individual rune bonuses: ${JSON.stringify(effects)}`);
        }
        const button = root.locator('#btn-inscribe-next-rune');
        check(await button.evaluate(element => element instanceof HTMLButtonElement && element.disabled),
          `${width}: ${name} does not natively disable automatic engraving`);
        check(explanation.test((await root.locator('.runic-status').innerText()) + ' ' + (await root.locator('.smithy-rune-target').innerText()) + ' ' + (await button.innerText())),
          `${width}: ${name} has no actionable explanation`);
        const before = JSON.stringify(await state());
        await reachable(button, false);
        const rect = await button.boundingBox();
        await game.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
        check(JSON.stringify(await state()) === before && !await game.evaluate(() => window.gameModal.isOpen),
          `${width}: disabled ${name} action consumed resources or opened a transaction`);
        if (['full-holes', 'no-equipment', 'short-gold'].includes(name)) {
          const materials = root.locator('details.runic-materials');
          if (!await materials.evaluate(element => element.open)) await materials.locator('summary').click();
          check(await materials.locator('.btn-inscribe-rune').evaluateAll(buttons =>
            buttons.length > 0 && buttons.every(button => button instanceof HTMLButtonElement && button.disabled)),
          `${width}: ${name} permits manual engraving despite unavailable capacity or funds`);
        }
        if (name === 'zero-holes') {
          await root.locator('.runic-detail-scroll [data-goto="smithy_socket"]').click();
          check(await game.locator('.smithy-page-socket').isVisible(), `${width}: no-hole guidance did not reach the socket workshop`);
          await game.locator('#tab-content-town [data-goto="smithy"]').click(); await openFromSmithy();
        }
        await layout();
      }
      // Revalidate a previously rendered action if equipment or a socket changes
      // before its click is handled. No transaction may affect the replacement.
      for (const change of ['equipment', 'socket', 'recipe']) {
        await game.evaluate(base => {
          Object.assign(window.gameState.data, JSON.parse(JSON.stringify(base)));
          const town = window.appInstance.views.town;
          town.selectedEquipSlot = 'armor'; town.selectedRunicWord = 'lionheart'; town.render();
        }, initialFixture);
        const stale = await root.locator('#btn-inscribe-next-rune').elementHandle();
        await game.evaluate(async change => {
          const data = window.gameState.data;
          if (change === 'equipment') data.equipped.armor = { ...data.equipped.armor, uid: 'replacement_armor' };
          if (change === 'socket') {
            const { RUNES } = await import('/js/config/runes.js');
            data.equipped.armor.gems = [{ ...RUNES.rune_cham, isRune: true }];
          }
          if (change === 'recipe') window.appInstance.views.town.selectedRunicWord = 'oath';
        }, change);
        const before = JSON.stringify(await state());
        await stale.evaluate(button => button.click());
        check(JSON.stringify(await state()) === before, `${width}: stale ${change} action consumed resources`);
        check(/变化|重新选择/.test(await game.locator('#game-modal-message').innerText()),
          `${width}: stale ${change} action was not explained`);
        await dismiss(); await stale.dispose();
      }
      // A normal gem that interrupts a recipe must be removable here too.
      await game.evaluate(base => {
        Object.assign(window.gameState.data, JSON.parse(JSON.stringify(base)));
        window.gameState.data.equipped.armor.gems = [
          { id: 'gem_atk', name: '金刚石', isRune: false, stat: 'atk', val: 25 }
        ];
        window.gameState.notify(); window.appInstance.views.town.render();
      }, initialFixture);
      await remove(0);
      check(count(await state(), 'gem_atk') === 1, `${width}: gem recovery failed in the rune workshop`);
      // The material source is a real navigation route, not a decorative label.
      await root.locator('[data-goto="faction_war"]').click();
      check(await game.evaluate(() => window.appInstance.views.town.currentView) === 'faction_war',
        `${width}: material-source link did not reach the border stronghold`);
      await game.locator('#tab-content-town button[data-goto="hub"]').click();
      await game.locator('[data-goto="smithy"]').click(); await openFromSmithy();
      await game.evaluate(data => {
        Object.assign(window.gameState.data, data);
        window.gameState.notify(); window.appInstance.views.town.render();
      }, completedData);
      await chooseSlot('armor'); await chooseRecipe('lionheart'); await layout();
      check(errors.length === 0, `${width}: ${errors.join('; ')}`);
      results.push({
        width, height, recipesKeyboardReadOnly: recipes.length, paidInscriptions: 6, inscriptionGold: 3000, repairQuote,
        orderedResonance: true, extraRuneDeactivates: true, extractionAndFirstHoleRefillRestore: true,
        damagedSuccessExplained: true, realRepairRestores: true, fullStackExtractionSafe: true, fullBagRefusalSafe: true,
        disabledCases: cases.map(([name]) => name), sourceResults, saved: true, errors
      });
    } finally { await context.close(); }
  }
  return {
    results,
    fixture: 'Isolated equipment, resources, access, damage and bag occupancy; actual engraving/extraction/repair controls verify settlement and UI, not natural acquisition or balance.'
  };
}
