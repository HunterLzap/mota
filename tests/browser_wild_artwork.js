async (page) => {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  for (const [width, height] of [[1280, 900], [1440, 1000]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height } });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const dismiss = async () => {
      for (let i = 0; i < 4 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
    };
    const snapshot = () => game.evaluate(() => {
      const d = window.gameState.data;
      return { gold: d.gold, exp: d.exp, crystal: d.crystal, prestige: d.prestige, victories: d.wildVictories || 0, camp: d.currentMapId };
    });
    const reachable = async locator => {
      await locator.scrollIntoViewIfNeeded();
      check(await locator.evaluate(element => {
        const r = element.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return r.top >= main.top && r.bottom <= main.bottom + 1 && r.left >= main.left && r.right <= main.right + 1 && (element === hit || element.contains(hit));
      }), 'Covered or clipped control');
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click(); await dismiss();
      const maps = await game.evaluate(async () => {
        for (const file of ['scenes/wild-regions-8.png', 'portraits/forest-enemies.png', 'portraits/canyon-wasteland-enemies.png', 'portraits/swamp-volcano-enemies.png']) {
          const image = new Image(); image.src = '/images/' + file; await image.decode();
          if (!image.naturalWidth) throw new Error('Missing asset: ' + file);
        }
        const MAPS = (await import('/js/config/maps.js')).MAPS;
        const NEW = ['ice_north', 'desert', 'dark_cave'];
        for (const map of MAPS.filter(m => NEW.includes(m.id))) {
          for (const m of [...map.monsters, map.boss]) {
            const key = map.boss === m ? m.id : m.icon;
            const src = '/images/portraits/individual/' + key + '.png';
            const image = new Image(); image.src = src; await image.decode();
            if (!image.naturalWidth) throw new Error('Missing individual portrait: ' + src);
          }
        }
        return MAPS;
      });
      await game.locator('#nav-tab-wild').click();
      const opening = await snapshot();
      for (const map of maps) {
        const entry = game.locator(`.map-node-card[data-map-id="${map.id}"]`);
        await reachable(entry); await entry.focus(); await game.keyboard.press('Enter');
        check(await entry.getAttribute('aria-pressed') === 'true', 'Keyboard map selection failed');
        check(await game.locator(`[data-region-art="${map.id}"]`).isVisible(), 'Wrong region panorama');
        check((await snapshot()).camp === opening.camp, 'Preview changed patrol camp');
        for (const control of ['#btn-fight-wild-boss', '.btn-fight-mob[data-mob-idx="2"]']) await reachable(game.locator(control));
        check(await game.evaluate(() => {
          const panel = document.querySelector('.wild-map-detail');
          return document.body.scrollWidth <= innerWidth && panel.scrollWidth <= panel.clientWidth + 1;
        }), 'Region detail overflow');
        await game.locator('.wild-map-detail').evaluate(element => { element.scrollTop = 0; });
        // 新布局（大立绘卡 + 详情区内滚动）：不再要求所有讨伐按钮首屏同列可见，
        // 改为逐个滚动到可见区，断言按钮完整落在 .wild-map-detail 可视范围内且可命中。
        const mobButtons = game.locator('.btn-fight-mob');
        const mobCount = await mobButtons.count();
        for (let i = 0; i < mobCount; i++) {
          const button = mobButtons.nth(i);
          await button.scrollIntoViewIfNeeded();
          check(await button.evaluate(element => {
            const panel = document.querySelector('.wild-map-detail').getBoundingClientRect();
            const r = element.getBoundingClientRect();
            const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return r.bottom <= panel.bottom + 1 && r.top >= panel.top - 1 && (element === hit || element.contains(hit));
          }), 'Ordinary battle action not visible after scrolling within detail');
        }
        await game.locator('.wild-map-detail').evaluate(element => { element.scrollTop = 0; });
        await game.screenshot({ path: `output/playwright/material3-${width}-${map.id}.png`, animations: 'disabled' });
      }
      await game.locator('#btn-set-patrol').click();
      check((await game.locator('#game-modal-message').innerText()).includes('未解锁'), 'Locked camp missing explanation');
      await dismiss();
      await game.locator('.btn-fight-mob').first().click();
      check(await game.locator('#battle-overlay').isHidden(), 'Locked ordinary monster started combat');
      check((await game.locator('#game-modal-message').innerText()).includes('等级'), 'Locked encounter missing level explanation');
      await dismiss();
      check(JSON.stringify(await snapshot()) === JSON.stringify(opening), 'Locked preview or attempt mutated rewards/camp');

      // Explicit isolated UI fixture: unlock regions and guarantee wins. It does
      // not claim naturally earned progression or measure encounter difficulty.
      await game.evaluate(async () => {
        const state = window.gameState, quests = (await import('/js/config/quests.js')).getQuestList(state.data);
        state.data.level = 100; state.data.exp = 0;
        state.data.currentQuestId = 'quest_17';
        state.data.questProgress = Object.fromEntries(quests.slice(0, 16).map(q => [q.id, { current: q.requiredCount || q.targetCount || 1, completed: true, claimed: true }]));
        state.data.questProgress.quest_17 = { current: 0, completed: false, claimed: false };
        state.data.maskedThief.appeared = false;
        state.data.lastIdleClaimTime = Date.now();
        const original = state.getEffectiveStats.bind(state);
        state.getEffectiveStats = () => ({ ...original(), hp: 1000000, maxHp: 1000000, atk: 1000000, def: 1000000 });
        state.notify();
      });
      let battles = 0;
      for (const map of maps) {
        await game.locator(`.map-node-card[data-map-id="${map.id}"]`).click();
        if ((await snapshot()).camp !== map.id) {
          await game.locator('#btn-set-patrol').click(); await dismiss();
          check((await snapshot()).camp === map.id, 'Camp deployment did not persist');
        }
        const NEW_MAPS = ['ice_north', 'desert', 'dark_cave'];
        for (const [index, mob] of [...map.monsters, map.boss].entries()) {
          const boss = index === 3, key = boss ? mob.id : mob.icon;
          const expectedFile = NEW_MAPS.includes(map.id) ? 'individual/' + key + '.png' : (map.id === 'forest' ? 'forest-enemies.png' : ['canyon', 'wasteland'].includes(map.id) ? 'canyon-wasteland-enemies.png' : 'swamp-volcano-enemies.png');
          const before = await snapshot();
          await game.locator(boss ? '#btn-fight-wild-boss' : `.btn-fight-mob[data-mob-idx="${index}"]`).click();
          const portrait = game.locator('.battle-enemy [data-enemy-portrait]');
          check(await portrait.getAttribute('data-enemy-portrait') === key, 'Wrong enemy identity: ' + key);
          check((await portrait.getAttribute('aria-label')).includes(mob.name), 'Wrong portrait accessible name');
          check(await portrait.evaluate((element, file) => getComputedStyle(element).backgroundImage.includes(file), expectedFile), 'Wrong portrait atlas');
          const timing = await game.evaluate(() => window.appInstance.battleView.currentCombat.initialIntervals.enemy);
          const expected = 10 / Math.sqrt(1 + (boss ? mob.speed : 18) / 100);
          check(Math.abs(timing - expected) < .00001, 'Boss configured speed was not used: ' + key);
          await game.locator('#btn-skip-battle').click();
          check(await game.evaluate(() => window.appInstance.battleView.currentCombat.victory), 'Guaranteed-win UI fixture failed');
          check(JSON.stringify(await snapshot()) === JSON.stringify(before), 'Rewards applied before settlement');
          if (boss) await game.screenshot({ path: `output/playwright/material3-${width}-${map.id}-boss.png`, animations: 'disabled' });
          await game.locator('#btn-confirm-battle').click(); await dismiss();
          const after = await snapshot();
          check(after.gold - before.gold === mob.gold && after.exp - before.exp === mob.exp, 'Reward mismatch: ' + key);
          check(after.crystal - before.crystal === (boss ? mob.crystal : 2) && after.prestige - before.prestige === (boss ? 20 : 5), 'Currency mismatch: ' + key);
          check(after.victories - before.victories === (boss ? 0 : 1), 'Victory count mismatch: ' + key);
          check(await game.locator('#battle-overlay').isHidden() && await game.locator('#tab-content-wild').isVisible(), 'Combat return failed');
          battles++;
        }
      }
      // An unpainted encounter must still render a usable vector portrait.
      await game.evaluate(() => window.appInstance.battleView.start({
        enemyData: { name: 'Vector fallback fixture', portraitKey: '', icon: 'monster_wolf' },
        enemyStats: { hp: 1, atk: 1, def: 0, speed: 18 }
      }));
      check(await game.locator('.battle-enemy [data-enemy-portrait]').count() === 0, 'Unknown enemy used unrelated artwork');
      check(await game.locator('.battle-enemy .battle-portrait').evaluate(async element => {
        const image = element.querySelector('img');
        if (image) { await image.decode(); return image.naturalWidth > 0; }
        return Boolean(element.querySelector('svg path,svg rect,svg circle,svg use'));
      }), 'Vector fallback is blank');
      await game.locator('#btn-skip-battle').click(); await game.locator('#btn-confirm-battle').click();
      const saved = await snapshot(); await game.reload();
      await game.waitForFunction(() => Boolean(window.gameState?.data.hasChosenClass));
      check(JSON.stringify(await snapshot()) === JSON.stringify(saved), 'Reload lost rewards or patrol camp');
      check(errors.length === 0, errors.join('; '));
      results.push({ width, height, previews: maps.length, battles, lockedEntryRejected: true, vectorFallback: true, saved: true, errors });
    } finally { await context.close(); }
  }
  return { results, fixture: 'High-level unlock and temporary guaranteed-win stats; tests UI/settlement, not natural balance' };
}
