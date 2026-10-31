async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const game = await context.newPage();
  const errors = [], results = [];
  game.on('pageerror', error => errors.push(error.message));
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const dismiss = async () => {
    for (let i = 0; i < 4 && await game.evaluate(() => window.gameModal.isOpen); i++) {
      await game.locator('#game-modal-btn-confirm').click();
    }
  };
  const snapshot = () => game.evaluate(() => {
    const state = window.gameState;
    return {
      gold: state.data.gold, crystal: state.data.crystal, prestige: state.data.prestige,
      exp: state.data.exp, level: state.data.level, victories: state.data.wildVictories,
      bossQuest: { ...state.data.questProgress.quest_17 },
      goldCrystals: state.data.bag.filter(item => item.id === 'crystal_gold').reduce((sum, item) => sum + (item.count || 1), 0),
      gearCount: state.data.bag.filter(item => item.slot).length,
      victoryLogs: state.systemLogs.filter(log => log.type === 'battle' && log.text.includes('成功击溃')).length
    };
  });
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="warrior"]').click();
    await game.locator('#btn-confirm-character').click();
    await dismiss();
    const maps = await game.evaluate(async () => {
      const { MAPS } = await import('/js/config/maps.js');
      const { getQuestList } = await import('/js/config/quests.js');
      const state = window.gameState;
      // Isolated UI fixture, not earned progression: Lv.100 with 594 allocated
      // points and chapters 1-16 claimed. Real battle and settlement code runs.
      state.data.level = 100;
      state.data.exp = 0;
      state.data.freeStatPoints = 0;
      state.data.allocatedStats = { str: 400, int: 0, dex: 0, con: 194 };
      state.data.currentQuestId = 'quest_17';
      state.data.questProgress = Object.fromEntries(getQuestList(state.data).slice(0, 16).map(quest => [
        quest.id, { current: quest.requiredCount || quest.targetCount || 1, completed: true, claimed: true }
      ]));
      state.data.questProgress.quest_17 = { current: 0, completed: false, claimed: false };
      state.data.currentMapId = 'forest';
      state.data.maskedThief.appeared = false;
      state.notify();
      const atlas = new Image();
      atlas.src = '/images/portraits/forest-enemies.png';
      await atlas.decode();
      if (atlas.naturalWidth !== atlas.naturalHeight || !atlas.naturalWidth) throw new Error('Forest portrait atlas is not a decoded square');
      return { forest: MAPS.find(map => map.id === 'forest'), canyon: MAPS.find(map => map.id === 'canyon') };
    });
    await game.locator('#nav-tab-wild').click();
    await game.locator('.map-node-card[data-map-id="forest"]').click();

    const fight = async ({ mob, index, key, position, boss = false, atlas = 'forest-enemies.png', size = '200% 200%' }) => {
      const before = await snapshot();
      await game.locator(boss ? '#btn-fight-wild-boss' : `.btn-fight-mob[data-mob-idx="${index}"]`).click();
      const enemy = game.locator('.battle-enemy');
      const displayedName = boss ? `【驻地领主】${mob.name}` : mob.name;
      check(await enemy.locator('h3').innerText() === displayedName, 'Wrong battle opponent: ' + mob.name);
      if (key) {
        const portrait = enemy.locator('[data-enemy-portrait]');
        check(await portrait.count() === 1, 'Missing painted enemy portrait: ' + mob.name);
        check(await portrait.getAttribute('data-enemy-portrait') === key, 'Wrong atlas identity: ' + mob.name);
        check(await portrait.getAttribute('role') === 'img' && await portrait.getAttribute('aria-label') === displayedName + '肖像', 'Portrait accessible name mismatch: ' + mob.name);
        const style = await portrait.evaluate(element => {
          const css = getComputedStyle(element);
          return { image: css.backgroundImage, size: css.backgroundSize,
            x: css.getPropertyValue('--enemy-portrait-x').trim(), y: css.getPropertyValue('--enemy-portrait-y').trim() };
        });
        check(style.image.includes('/images/portraits/' + atlas) && style.size === size, 'Atlas image or sizing missing: ' + mob.name);
        check(style.x === position[0] && style.y === position[1], 'Atlas selected wrong cell: ' + mob.name);
        check(await portrait.isVisible(), 'Enemy portrait is hidden: ' + mob.name);
      } else {
        check(await enemy.locator('[data-enemy-portrait]').count() === 0, 'Unknown enemy incorrectly received forest artwork');
        const fallback = await enemy.locator('.battle-portrait').evaluate(async element => {
          const image = element.querySelector('img');
          if (image) { await image.decode(); return image.naturalWidth > 0 && /\.svg(?:$|[?#])/.test(image.src); }
          const svg = element.querySelector('svg');
          return Boolean(svg && svg.querySelector('path,rect,circle,ellipse,polygon,use'));
        });
        check(fallback, 'Unmapped enemy SVG fallback is blank');
      }
      check(await game.evaluate(() => window.appInstance.battleView.currentCombat.victory), 'High-level UI fixture lost to ' + mob.name);
      await game.locator('#btn-skip-battle').click();
      check(await game.locator('#btn-confirm-battle').isVisible(), 'Settlement control is inaccessible');
      if (boss) await game.screenshot({ path: 'output/playwright/material2-1280-wolfboss.png', animations: 'disabled' });
      check(await game.evaluate(() => document.body.scrollWidth <= innerWidth), 'Combat page overflows horizontally');
      const pending = await snapshot();
      check(pending.gold === before.gold && pending.exp === before.exp && pending.victories === before.victories, 'Reward was applied before settlement');
      await game.locator('#btn-confirm-battle').click();
      check((await game.locator('#game-modal-message').innerText()).includes(mob.name), 'Settlement message lost the opponent name');
      await dismiss();
      const after = await snapshot();
      check(after.gold - before.gold === mob.gold && after.exp - before.exp === mob.exp, 'Wrong gold or experience settlement: ' + mob.name);
      check(after.crystal - before.crystal === (boss ? mob.crystal : 2), 'Wrong crystal settlement: ' + mob.name);
      check(after.prestige - before.prestige === (boss ? 20 : 5), 'Wrong prestige settlement: ' + mob.name);
      check(after.victories - before.victories === (boss ? 0 : 1), 'Wild victory record mismatch: ' + mob.name);
      check(after.victoryLogs === before.victoryLogs + 1, 'Battle victory journal was not recorded: ' + mob.name);
      if (boss) {
        check(after.bossQuest.completed && after.bossQuest.current === 1 && !after.bossQuest.claimed, 'Wolf king quest was not completed by the battle');
        check(after.goldCrystals - before.goldCrystals === mob.guaranteedDrop.count && after.gearCount === before.gearCount + 1, 'Wolf king guaranteed drops missing');
      }
      check(await game.locator('#battle-overlay').isHidden() && await game.locator('#tab-content-wild').isVisible(), 'Battle did not return to the wilderness');
      check(await game.locator('.classic-sidebar').isVisible(), 'Character sidebar was not restored');
      results.push({ name: mob.name, portrait: key || 'svg-fallback', gold: after.gold - before.gold, exp: after.exp - before.exp, returned: true });
    };

    for (const [index, position] of [[0, ['0%', '0%']], [1, ['100%', '0%']], [2, ['0%', '100%']]]) {
      const mob = maps.forest.monsters[index];
      await fight({ mob, index, key: mob.icon, position });
    }
    await fight({ mob: maps.forest.boss, key: 'boss_forest', position: ['100%', '100%'], boss: true });
    await game.locator('.map-node-card[data-map-id="canyon"]').click();
    await fight({ mob: maps.canyon.monsters[0], index: 0, key: 'monster_lizard', position: ['0%', '0%'], atlas: 'canyon-wasteland-enemies.png', size: '400% 200%' });
    const settled = await snapshot();
    await game.reload();
    await game.waitForFunction(() => Boolean(window.gameState?.data.hasChosenClass));
    const loaded = await snapshot();
    check(['gold', 'crystal', 'prestige', 'exp', 'victories', 'goldCrystals', 'gearCount'].every(key => loaded[key] === settled[key]), 'Reload lost battle rewards or victory records');
    check(loaded.bossQuest.completed && loaded.bossQuest.current === 1, 'Reload lost wolf king quest completion');
    check(errors.length === 0, errors.join('; '));
    return { viewport: '1280x900', fixture: 'Isolated Lv.100 warrior, 594 allocated points, chapters 1-16 claimed; verifies UI and settlement, not natural progression', results, saved: true, errors };
  } finally {
    await context.close();
  }
}
