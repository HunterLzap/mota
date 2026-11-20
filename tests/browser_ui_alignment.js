async (page) => {
  const results = [], check = (ok, message) => { if (!ok) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], failures = [], checks = [];
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
    game.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
    const state = () => game.evaluate(() => JSON.stringify(window.gameState.data));
    const settle = async () => {
      await game.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(image => image.decode()));
        const sources = new Set();
        for (const element of document.querySelectorAll('.pet-portrait-art,.class-portrait,.classic-command-dock')) {
          if (!element.getBoundingClientRect().height) continue;
          for (const match of getComputedStyle(element).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)) sources.add(match[1]);
        }
        await Promise.all([...sources].map(async source => { const image = new Image(); image.src = source; await image.decode(); }));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
    };
    const health = async label => {
      await settle();
      const metric = await game.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth,
        brokenImages: [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src),
        regionOverflow: [...document.querySelectorAll('#pet-panel-body,.smithy-workshop,.smithy-workshop-body,.smithy-detail,.smithy-bag-scroll,.smithy-scroll,.npc-dialogue #game-modal-message,.castle-guard')]
          .filter(element => element.getBoundingClientRect().height && element.scrollWidth > element.clientWidth + 1)
          .map(element => ({ className: element.className, width: element.clientWidth, scroll: element.scrollWidth }))
      }));
      checks.push({ label, ...metric });
      check(!metric.overflow && !metric.brokenImages.length && !metric.regionOverflow.length, label + ': ' + JSON.stringify(metric));
    };
    const capture = async label => {
      await health(label);
      await game.screenshot({ path: `output/ui-alignment-2026-10-26/after-${viewport.width}-${label}.png`, animations: 'disabled' });
    };
    const geometry = async locator => locator.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const r = parent.getBoundingClientRect(), style = getComputedStyle(parent);
        if (/hidden|clip|auto|scroll/.test(style.overflowX)) {
          clip.left = Math.max(clip.left, r.left + parent.clientLeft);
          clip.right = Math.min(clip.right, r.left + parent.clientLeft + parent.clientWidth);
        }
        if (/hidden|clip|auto|scroll/.test(style.overflowY)) {
          clip.top = Math.max(clip.top, r.top + parent.clientTop);
          clip.bottom = Math.min(clip.bottom, r.top + parent.clientTop + parent.clientHeight);
        }
      }
      const visibleHeight = Math.max(0, Math.min(rect.bottom, clip.bottom) - Math.max(rect.top, clip.top));
      const visibleWidth = Math.max(0, Math.min(rect.right, clip.right) - Math.max(rect.left, clip.left));
      const points = [.2, .5, .8].map(fraction => {
        const hit = document.elementFromPoint(rect.x + rect.width * fraction, rect.y + rect.height / 2);
        return !!hit && (hit === element || element.contains(hit));
      });
      return { rect: rect.toJSON(), clip, visibleHeight, visibleWidth, full: visibleHeight >= rect.height - 1 && visibleWidth >= rect.width - 1, points };
    });
    const reachable = async (selector, scroll = true) => {
      const locator = game.locator(selector);
      if (scroll) await locator.scrollIntoViewIfNeeded();
      const metric = await geometry(locator);
      check(metric.full && metric.points.every(Boolean), `${selector}: ${JSON.stringify(metric)}`);
      return metric;
    };
    const dismiss = async () => {
      for (let i = 0; i < 6 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const refresh = async () => {
      await settle();
      await game.waitForLoadState('networkidle');
      await game.reload();
      await game.waitForFunction(() => window.appInstance?.views?.town && window.gameState?.data.hasChosenClass);
      await settle();
      check(await game.locator('#char-select-overlay').isHidden(), 'Refresh reopened character creation');
      check(await game.evaluate(() => [1, 2, 4, 5].every(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot) === 'protected-alignment-' + slot)), 'Another fixture slot changed');
    };
    try {
      // Only this new in-memory context contains these five fixture slots.
      await context.addInitScript(() => {
        if (localStorage.getItem('alignment-fixture')) return;
        for (const slot of [1, 2, 4, 5]) localStorage.setItem('MOTA_WORLD_SAVE_SLOT_' + slot, 'protected-alignment-' + slot);
        localStorage.setItem('MOTA_WORLD_ACTIVE_SLOT_ID', '3');
        localStorage.setItem('alignment-fixture', '1');
      });
      await game.goto('http://127.0.0.1:8088/');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click();
      await capture('npc');
      check(await game.locator('.npc-dialogue-portrait').count() === 1, 'Opening NPC has no independent portrait');
      check(await game.locator('.npc-dialogue-portrait').evaluate(element => element.getBoundingClientRect().right < document.querySelector('#game-modal-message').getBoundingClientRect().left), 'Portrait is not left of dialogue');
      const beforeMeeting = await state();
      const closeAndCheck = async method => {
        if (method === 'Escape') await game.keyboard.press('Escape');
        else if (method === 'cancel') { await game.locator('#game-modal-btn-cancel').focus(); await game.keyboard.press('Enter'); }
        else await game.locator('#game-modal-close').click();
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
        check(await state() === beforeMeeting, method + ' changed quest or resources');
        check(await game.locator('#btn-next-journey').evaluate(element => element === document.activeElement), method + ' lost opener focus');
      };
      for (const method of ['cancel', 'Escape', 'close']) {
        await closeAndCheck(method);
        await game.locator('#btn-next-journey').click();
      }
      await closeAndCheck('cancel');
      await refresh();
      check(await state() === beforeMeeting, 'Cancelled NPC quest changed after refresh');
      await game.locator('#btn-next-journey').click();
      await game.locator('#game-modal-btn-confirm').focus();
      await game.keyboard.press('Tab');
      check(await game.locator('#game-modal-close').evaluate(element => element === document.activeElement), 'Tab escaped NPC dialog');
      await game.keyboard.press('Shift+Tab');
      check(await game.locator('#game-modal-btn-confirm').evaluate(element => element === document.activeElement), 'Reverse Tab escaped NPC dialog');
      await game.keyboard.press('Enter'); await dismiss();
      const accepted = await state();
      check(JSON.parse(accepted).currentQuestId === 'quest_2', 'NPC acceptance did not advance the real quest');
      await refresh();
      check(await state() === accepted, 'NPC acceptance or reward changed after refresh');

      // Short/long template fixtures keep exact text and exercise callbacks without quest changes.
      await game.evaluate(() => { window.alignmentDialogueCalls = { accept: 0, cancel: 0 }; });
      for (const kind of ['short', 'long']) {
        await game.locator('#nav-tab-town').focus();
        const text = kind === 'short' ? 'The watch has returned. Meet us at the gate.' :
          Array.from({ length: 60 }, (_, i) => `Chronicle ${i + 1}: the northern watch records every survivor, supply cart and sealed passage.`).join('\n\n');
        await game.evaluate(text => window.gameModal.dialogue(text,
          () => window.alignmentDialogueCalls.accept++, () => window.alignmentDialogueCalls.cancel++,
          { name: '守备官罗兰', portrait: 'warrior' }, { confirmLabel: '接受委托', cancelLabel: '稍后' }), text);
        check(await game.locator('.npc-dialogue-text').textContent() === text, 'Dialogue text was truncated');
        await reachable('#game-modal-btn-confirm', false);
        if (kind === 'long') {
          check(await game.locator('#game-modal-message').evaluate(element => element.scrollHeight > element.clientHeight), 'Long dialogue has no content scrolling');
          await game.locator('#game-modal-message').evaluate(element => { element.scrollTop = element.scrollHeight; });
          check(await game.locator('.npc-dialogue-text').innerText().then(value => value.endsWith(text.split('\n\n').at(-1))), 'Last story paragraph missing');
        }
        await capture('npc-' + kind);
        if (kind === 'short') { await game.locator('#game-modal-btn-confirm').focus(); await game.keyboard.press('Enter'); }
        else await game.keyboard.press('Escape');
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
        check(await game.locator('#nav-tab-town').evaluate(element => element === document.activeElement), 'Template focus did not return');
      }
      check(await game.evaluate(() => window.alignmentDialogueCalls.accept === 1 && window.alignmentDialogueCalls.cancel === 1), 'NPC callbacks executed zero or multiple times');
      check(await state() === accepted, 'Presentation fixtures changed game state');
      await refresh();
      check(await state() === accepted, 'Refresh after short/long dialogue changed the quest');

      // Explicit presentation fixture, matching the audit's pet, equipment and resource state.
      await game.evaluate(async () => {
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const { generateEquipment, ITEM_SLOTS, SPECIAL_ITEMS } = await import('/js/config/items.js');
        const data = window.gameState.data;
        data.level = 60; data.gold = 50000; data.crystal = 1000; data.currentQuestId = 'quest_21';
        for (let i = 1; i <= 20; i++) data.questProgress['quest_' + i] = { current: 1, completed: true, claimed: true };
        data.questProgress.quest_21 = { current: 0, completed: false };
        data.pets = ['golden_dragon', 'naga', 'white_angel'].map(id => ({
          id, level: 40, exp: 0, stamina: 100, tier: 'darkgold', apt: { ...PET_CONFIGS[id].defaultApt }, skills: []
        }));
        data.activePetId = 'golden_dragon'; data.supportPetIds = ['naga', 'white_angel'];
        for (const slot of ITEM_SLOTS) data.equipped[slot.id] = { ...generateEquipment(slot.id, 50, 'gold', null, 'warrior'), uid: 'alignment-worn-' + slot.id };
        data.bag = ITEM_SLOTS.slice(0, 7).map(slot => ({ ...generateEquipment(slot.id, 55, 'darkgold', null, 'warrior'), uid: 'alignment-bag-' + slot.id }));
        for (const id of ['pet_food', 'star_crystal', 'protect_crystal', 'socket_crystal', 'crystal_gold', 'crystal_darkgold']) {
          if (SPECIAL_ITEMS[id]) data.bag.push({ ...SPECIAL_ITEMS[id], uid: 'alignment-' + id, count: 8 });
        }
        window.gameState.notify();
      });
      await game.locator('#nav-tab-pets').click();
      await capture('pets');
      const pet = {
        panel: await game.locator('#pet-panel-body').boundingBox(),
        scrollTop: await game.locator('#pet-panel-body').evaluate(element => element.scrollTop),
        portrait: await reachable('.pet-detail-portrait', false),
        stamina: await reachable('[aria-label="宠物体力"]', false),
        aptitudes: []
      };
      for (let i = 0; i < 4; i++) {
        const row = game.locator('.pet-aptitude-table > div').nth(i), metric = await geometry(row);
        check(metric.full && metric.points.every(Boolean), 'Aptitude is not visible on first screen: ' + JSON.stringify(metric));
        pet.aptitudes.push({ text: await row.innerText(), ...metric });
      }
      check(pet.scrollTop === 0, 'Pet measurement silently scrolled details');
      await reachable('[data-assign-party="2"]');
      await game.locator('#pet-panel-body').evaluate(element => { element.scrollTop = element.scrollHeight; });
      await capture('pets-bottom');
      await game.evaluate(()=>{window.appInstance.views.pets.detailSub='more';window.appInstance.views.pets.render();});
      const training = await game.locator('#btn-train-companion').count();
      check(training === 1, 'Training entry was lost');
      await reachable('#btn-train-companion');
      await game.locator('#pet-subtab-skills').click();
      await capture('pets-skills');
      check(await game.locator('#pet-subtab-skills').getAttribute('aria-pressed') === 'true', 'Skills route failed');

      await game.locator('#nav-tab-town').click();
      await game.locator('[data-goto="smithy"]').click();
      await capture('smithy');
      const beforeTabs = await state(), smithy = { tabs: [], operation: null };
      for (const [view, action] of [
        ['enhance', '#btn-do-enhance'], ['socket', '#btn-punch-socket'], ['reforge', '#btn-do-reforge'],
        ['repair', '#btn-repair-all'], ['smelt', '#btn-disassemble-gear'], ['runes', '#btn-inscribe-next-rune']
      ]) {
        await game.locator(`.smithy-workshop-tabs [data-goto="smithy_${view}"]`).focus();
        await game.keyboard.press('Enter');
        if (view !== 'runes') check(await game.locator(`.smithy-workshop-tabs [data-goto="smithy_${view}"]`).evaluate(element => element === document.activeElement), 'Work tab lost keyboard focus');
        const pinned = await reachable(action, false);
        // 符文页为独立左右两栏壳（无 workshop 页签/行囊，业务逻辑不变），单独校验；
        // 其余铁匠页仍为工坊壳，校验行囊分页不滚。
        let bagScroll = null;
        if (view === 'runes') {
          check(await game.locator('.runic-detail-scroll').count() === 1, 'Runes standalone detail missing');
          check(await game.locator('[data-goto="smithy"],[data-goto="hub"]').count() >= 1, 'Runes page lost back navigation');
        } else {
          check(await game.locator('.smithy-bag-item').count() === JSON.parse(beforeTabs).bag.length, 'Workshop lost bag items');
          await game.locator('.smithy-bag-item > summary').first().focus(); await game.keyboard.press('Enter');
          check(await game.locator('.smithy-bag-item').first().evaluate(element => element.open), 'Bag inspection did not open');
          await game.locator('.smithy-bag-item > summary').first().press('Enter');
          bagScroll = await game.locator('.smithy-bag-scroll').evaluate(element => ({ sh: element.scrollHeight, ch: element.clientHeight }));
          check(bagScroll.sh <= bagScroll.ch + 1, 'Workshop bag must be paginated without internal scroll');
          check(await game.locator('.smithy-bag-item').count() === JSON.parse(beforeTabs).bag.length, 'Paginated bag must still render all items');
        }
        await reachable(action, false);
        await capture('smithy-' + view);
        check(await state() === beforeTabs, 'Work tabs or bag preview changed the save');
        smithy.tabs.push({ view, action: pinned, bagScroll });
        if (view === 'runes') { await game.locator('[data-goto="smithy"]').first().click(); await game.waitForTimeout(120); }
      }
      await game.locator('[data-goto="smithy_enhance"]').click();
      for (const slot of ['weapon', 'armor', 'pants', 'cloak', 'helmet', 'gloves', 'boots', 'belt', 'necklace', 'ring']) {
        await reachable(`[data-smithy-slot="${slot}"]`);
        await game.locator(`[data-smithy-slot="${slot}"]`).focus();
        await game.keyboard.press('Enter');
        check(await game.locator(`[data-smithy-slot="${slot}"]`).getAttribute('aria-pressed') === 'true', 'Worn equipment cannot be selected');
      }
      check(await state() === beforeTabs, 'Selecting worn equipment changed the save');
      await game.locator('[data-goto="smithy_repair"]').click();
      const quote = await game.evaluate(() => {
        const state = window.gameState;
        state.data.equipped.weapon.durability = 0; state.data.equipped.armor.durability = 47;
        state.notify();
        return { ...state.getRepairQuote(), gold: state.data.gold };
      });
      await reachable('#btn-repair-all', false);
      await game.locator('#btn-repair-all').focus(); await game.keyboard.press('Enter'); await dismiss();
      check(await game.evaluate(({ gold, cost }) => window.gameState.data.gold === gold - cost && window.gameState.data.equipped.weapon.durability === 100 && window.gameState.data.equipped.armor.durability === 100, quote), 'Repair charged the wrong funds or failed');
      const repaired = await state(); await refresh();
      const reloadedRepair = await state();
      check(reloadedRepair === repaired, 'Real repair did not persist: ' + JSON.stringify(Object.keys(JSON.parse(repaired)).filter(key => JSON.stringify(JSON.parse(repaired)[key]) !== JSON.stringify(JSON.parse(reloadedRepair)[key])).map(key => ({ key, before: JSON.parse(repaired)[key], after: JSON.parse(reloadedRepair)[key] }))));
      smithy.operation = { name: 'repairAllEquipment', cost: quote.cost, refreshPreserved: true };

      await game.locator('#nav-tab-tower').click();
      await capture('tower');
      const tower = await reachable('#btn-challenge-castle-floor', false);
      check(await game.locator('#tab-content-tower').evaluate(element => element.scrollTop === 0), 'Tower measurement scrolled outer content');
      const footer = await game.locator('.classic-footer').boundingBox();
      await game.locator('#btn-subtab-castle').focus();
      for (let i = 0; i < 25; i++) {
        await game.keyboard.press('Tab');
        if (await game.locator('#btn-challenge-castle-floor').evaluate(element => element === document.activeElement)) break;
      }
      check(await game.locator('#btn-challenge-castle-floor').evaluate(element => element === document.activeElement), 'Tab did not reach tower challenge');
      await reachable('#btn-challenge-castle-floor', false);
      for (const subTab of ['dungeons', 'relics', 'castle']) {
        await game.locator('#btn-subtab-' + subTab).click();
        check(await game.evaluate(tab => window.appInstance.views.tower.subTab === tab, subTab), 'Tower tab failed');
        await health('tower-' + subTab);
      }
      check(JSON.stringify(await game.locator('.classic-footer').boundingBox()) === JSON.stringify(footer), 'Tower moved the permanent footer');
      // Empty equipment must still render the socket and rune pages.
      await game.evaluate(() => { for (const slot of Object.keys(window.gameState.data.equipped)) window.gameState.data.equipped[slot] = null; window.gameState.notify(); });
      await game.locator('#nav-tab-town').click();
      for (const tab of ['socket', 'runes']) {
        await game.evaluate(tab => { window.appInstance.views.town.currentView = 'smithy_' + tab; window.appInstance.views.town.render(); }, tab);
        await health('empty-workshop-' + tab);
        const rendered = tab === 'runes'
          ? await game.locator('.runic-detail-scroll').count() >= 1
          : await game.locator('.smithy-workshop').count() === 1;
        check(rendered, 'Empty workshop failed to render: ' + tab);
      }
      check(!errors.length && !failures.length, JSON.stringify({ errors, failures }));
      results.push({ viewport, fixture: true, naturalProgression: false, pet, smithy, tower, npc: { acceptAndRefresh: true, cancelEscapeCloseAndFocus: true, shortAndLong: true, exactText: true }, protectedSlots: 4, checks, errors, failures });
    } catch (error) {
      await game.screenshot({ path: `output/ui-alignment-2026-10-26/failure-${viewport.width}.png`, animations: 'disabled' });
      throw new Error(error.message + ' | ' + JSON.stringify({ viewport, errors, failures }));
    } finally { await context.close(); }
  }
  return results;
}
