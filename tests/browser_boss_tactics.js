async (page) => {
  const reports = [];
  const absorbSet = new URL(page.url()).searchParams.get('absorb-set') === '1';
  const check = (value, message) => { if (!value) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], failures = [], pending = new Set();
    game.setDefaultTimeout(10000);
    game.on('pageerror', error => errors.push(error.message));
    game.on('request', request => pending.add(request.url()));
    game.on('requestfinished', request => pending.delete(request.url()));
    game.on('requestfailed', request => {
      pending.delete(request.url());
      failures.push({ url: request.url(), error: request.failure()?.errorText });
    });
    game.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
    const dismiss = async () => {
      for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal?.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const click = async selector => { await game.locator(selector).first().click(); await dismiss(); };
    const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    const fight = async () => {
      await game.locator('#btn-challenge-castle-floor').click();
      await game.locator('#btn-skip-battle').click();
      const skills = game.locator('.battle-skills').last();
      check((await skills.innerText()).includes('生命降至70%') &&
        (await skills.innerText()).includes('生命降至35%') &&
        (await skills.innerText()).includes('本场只尝试一次') &&
        (await skills.innerText()).includes('范围法术命中至少85%') &&
        (await skills.innerText()).includes('2次行动余烬') &&
        (await skills.innerText()).includes('2%魔法伤害'),
      'Battle skill panel presents finite threshold spells as periodic actions');
      const combat = await game.evaluate(() => JSON.parse(JSON.stringify(window.appInstance.battleView.currentCombat)));
      check(combat.victory, 'Final boss fixture lost: ' + JSON.stringify({ duration: combat.duration, actions: combat.actionCounts }));
      check(combat.logs.some(log => log.message.includes('神圣护盾') && log.message.includes('60000')),
        'Final boss opening ward never reached actual browser combat');
      check(combat.logs.some(log => log.message.includes('余盾') || log.message.includes('烈火破界')),
        'Final boss ward did not absorb damage or get shattered');
      for (const name of ['黑焰龙息', '终焉回响']) {
        const warnings = combat.logs.filter(log => log.phaseThreshold && log.abilityName === name);
        const casts = combat.logs.filter(log => log.abilityName === name && log.maxHpDamage > 0);
        check(warnings.length === 1 && casts.length === 1, 'Threshold spell did not really warn and cast once: ' + name);
        check(casts[0].time > warnings[0].time && casts[0].action >= warnings[0].dueEnemyAction,
          'Threshold spell skipped its warning: ' + name);
        const echoes = combat.logs.filter(log => log.phaseEcho && log.sourceAbilityName === name);
        check(echoes.length > 0 && echoes.length <= 2, 'Finite echoes never reached actual browser combat: ' + name);
        check(echoes.every(log => log.time > casts[0].time && log.manaSpent === 100 && log.enemyMp >= 0),
          'Echo ignored warning time or actual mana cost');
        check(new Set(echoes.map(log => log.action)).size === echoes.length, 'Multi-hit repeated an echo within one action');
      }
      check(combat.logs.some(log => log.message.includes('免疫重创')) && combat.logs.some(log => log.message.includes('免疫减速')),
        'Purification did not counter the actual threshold effects');
      if (absorbSet) {
        check(await game.evaluate(() => window.gameState.getEffectiveStats().magicAbsorb === 30),
          'Four actual set pieces never reached the effective-stat producer');
        check(combat.logs.some(log => log.manaRestored > 0 && log.message.includes('余烬伤害转化')),
          'Actual set failed to absorb mana from echo damage');
      }
      await game.screenshot({ path: `output/playwright/finale-phase-battle-${viewport.width}.png`, animations: 'disabled' });
      await game.locator('#btn-confirm-battle').click(); await dismiss();
      return combat;
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await click('[data-class-id="warrior"]');
      await click('#btn-confirm-character');
      await game.evaluate(async absorbSet => {
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const { SPECIAL_ITEMS } = await import('/js/config/items.js');
        const data = window.gameState.data;
        Object.assign(data, { name: 'Boss tactics audit', classId: 'warrior', level: 85, hasChosenClass: true,
          onboardingVersion: 2, currentQuestId: 'completed', gold: 50000, crystal: 500, prestige: 500 });
        for (let i = 1; i <= 26; i++) data.questProgress['quest_' + i] = { current: 1, completed: true, claimed: true };
        data.allocatedStats = { str: 300, con: 200, dex: 100, int: 100 };
        data.freeStatPoints = 0;
        data.skillTraining = { ranks: { w_sk_1: 10, w_sk_6: 10, w_sk_9: 10, w_sk_2: 10, w_sk_7: 10 }, preferredAttackId: null };
        data.equipped = { weapon: { id: 'tactics_weapon', uid: 'tactics_weapon', name: 'Tactics blade', slot: 'weapon',
          reqClass: 'warrior', reqLevel: 1, quality: 'gold', stars: 0, sockets: 0, gems: [], durability: 100,
          maxDurability: 100, stats: { atk: 5000, hp: 100000, def: 1800, str: 100 } } };
        if (absorbSet) for (const slot of ['helmet', 'gloves', 'boots', 'belt']) {
          data.equipped[slot] = { id: 'absorb_' + slot, uid: 'absorb_' + slot, name: '卡尔里斯·' + slot,
            slot, setId: 'karlis_set', reqClass: 'warrior', reqLevel: 70, quality: 'purplegold',
            stars: 0, sockets: 0, gems: [], durability: 100, maxDurability: 100, stats: {} };
        }
        data.pets = [{ id: 'golden_dragon', tier: 'gold', level: 30, exp: 0, stamina: 100,
          apt: { ...PET_CONFIGS.golden_dragon.defaultApt }, skills: ['book_purify'] }];
        data.activePetId = 'golden_dragon'; data.supportPetIds = ['faerie_dragon', null];
        data.pets.push({ id: 'faerie_dragon', tier: 'gold', level: 30, exp: 0, stamina: 100,
          apt: { ...PET_CONFIGS.faerie_dragon.defaultApt }, skills: [] });
        data.estate.hiredMercId = 'merc_paladin';
        data.bag.push({ ...SPECIAL_ITEMS.key_platinum, uid: 'tactics_platinum', count: 1 },
          { ...SPECIAL_ITEMS.key_titan, uid: 'tactics_titan', count: 1 },
          { ...SPECIAL_ITEMS.pet_food, uid: 'tactics_food', count: 1 });
        localStorage.setItem('MOTA_WORLD_ACTIVE_SLOT_ID', '3');
        for (const slot of [1, 2, 4, 5]) localStorage.setItem('MOTA_WORLD_SAVE_SLOT_' + slot, JSON.stringify({ sentinel: slot, value: 777 }));
        Object.assign(data.castle, { isExploring: true, expeditionId: 'tactics-fixture', floor: 100, finished: false, claimedBossRewards: [] });
        window.gameState.notify();
        Math.random = () => 0.5;
      }, absorbSet);
      await dismiss();
      const sentinels = await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)));
      await click('#nav-tab-tower');
      const details = game.locator('.boss-tactics');
      check(await details.count() === 1, 'Boss tactics are not on the challenge page');
      check(!await details.locator('p').first().isVisible(), 'Tactics should start collapsed');
      await details.locator('summary').focus(); await game.keyboard.press('Enter');
      check(await details.evaluate(element => element.open), 'Keyboard could not expand tactics');
      const tacticsText = await details.innerText();
      for (const text of ['60,000', '普通攻击', '时空禁锢：每3次个人行动', '神圣净化', '白翼天使']) check(tacticsText.includes(text), 'Missing actual tactic: ' + text);
      for (const text of ['黑焰龙息：生命降至70%', '终焉回响：生命降至35%', '光灵', '不能免除伤害',
        '命中至少85%', '2次余烬', '生命上限2%', '控制', '不按连击段数重复触发']) {
        check(tacticsText.includes(text), 'Missing new counter advice: ' + text);
      }
      await details.locator('p').last().scrollIntoViewIfNeeded();
      const geometry = await game.evaluate(() => {
        const button = document.querySelector('#btn-challenge-castle-floor').getBoundingClientRect();
        const details = document.querySelector('.boss-tactics').getBoundingClientRect();
        const main = document.querySelector('main').getBoundingClientRect();
        return { button: { x: button.x, y: button.y, width: button.width, height: button.height },
          panel: { x: details.x, y: details.y, width: details.width, height: details.height },
          buttonVisible: button.top >= main.top && button.bottom <= main.bottom && button.width > 0,
          overflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth };
      });
      check(geometry.buttonVisible && !geometry.overflow, 'Tactics displaced the fixed challenge action or overflowed: ' + JSON.stringify(geometry));
      await game.screenshot({ path: `output/playwright/boss-tactics-preflight-${viewport.width}.png`, animations: 'disabled' });
      const finalCombat = await fight();
      check((await data()).castle.finished, 'Final boss victory did not finish the expedition');
      await click('#btn-claim-castle-exit');
      check(!(await data()).castle.isExploring, 'Expedition rewards did not settle through the exit action');
      await click('#btn-subtab-dungeons');
      await click('[data-gate-id="spacetime_gate"]');
      await game.locator('.boss-tactics summary').click();
      const dungeonDetails = await game.locator('.boss-tactics').innerText();
      check(dungeonDetails.includes('时空迟滞：每3次个人行动') && dungeonDetails.includes('独角兽'),
        'Dungeon spell and alternate counter are missing from preflight');
      await click('#btn-enter-dungeon');
      let dungeonCombat;
      for (let floor = 1; floor <= 15; floor++) {
        if (floor === 15) {
          const beforeFeed = await data();
          const stamina = beforeFeed.pets.find(pet => pet.id === 'golden_dragon').stamina;
          const food = beforeFeed.bag.filter(item => item.id === 'pet_food').reduce((sum, item) => sum + item.count, 0);
          await click('#nav-tab-pets'); await click('[data-pet-id="golden_dragon"]'); await click('#btn-feed-pet');
          const afterFeed = await data();
          check(afterFeed.pets.find(pet => pet.id === 'golden_dragon').stamina === Math.min(100, stamina + 35),
            'Actual feeding did not restore stamina');
          check(afterFeed.bag.filter(item => item.id === 'pet_food').reduce((sum, item) => sum + item.count, 0) === food - 1,
            'Actual feeding did not consume food');
          await click('#nav-tab-tower');
        }
        await game.locator('#btn-dungeon-fight').click(); await game.locator('#btn-skip-battle').click();
        dungeonCombat = await game.evaluate(() => JSON.parse(JSON.stringify(window.appInstance.battleView.currentCombat)));
        check(dungeonCombat.victory, 'Dungeon floor lost after mechanics change: ' + floor);
        if (floor === 15) {
          const warning = dungeonCombat.logs.findIndex(log => log.message.includes('首领蓄势'));
          const cast = dungeonCombat.logs.findIndex(log => log.message.includes('施展【时空迟滞】'));
          check(warning >= 0 && cast > warning, 'Dungeon spell never warned and cast in actual browser combat');
          check(dungeonCombat.logs[cast].action > dungeonCombat.logs[warning].action, 'Dungeon warning did not precede the cast action');
          check(dungeonCombat.logs.some(log => log.message.includes('免疫减速')), 'Learned purification did not counter actual dungeon slowing');
        }
        await game.locator('#btn-confirm-battle').click(); await dismiss();
      }
      const settled = await data();
      const rows = await game.evaluate(async () => {
        const { getTowerFloorData } = await import('/js/config/towerLevels.js');
        const { getDungeonFloorGuard } = await import('/js/config/dungeons.js');
        return { final: getTowerFloorData(100, 2), spacetime: getDungeonFloorGuard('spacetime_gate', 15) };
      });
      check(rows.final.openingShield === 60000 && rows.final.abilities[0].interval === 3, 'Final boss producer mismatch');
      check(rows.spacetime.abilities[0].name === '时空迟滞' && rows.spacetime.mp === 300, 'Dungeon producer dropped spell data');
      check(settled.dungeon.clearedGates.spacetime_gate === 1, 'Actual dungeon UI did not settle');
      check(JSON.stringify(await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)))) === JSON.stringify(sentinels),
        'Protected slots changed');
      await game.reload(); await dismiss();
      const reloaded = await data();
      check(reloaded.dungeon.clearedGates.spacetime_gate === 1 && reloaded.castle.claimedBossRewards.includes(100), 'Boss settlements lost on refresh');
      check(!await game.locator('#char-select-overlay').isVisible(), 'Reload reopened class choice');
      check(await game.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth),
        'Reloaded boss page overflows horizontally');
      check(JSON.stringify(await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)))) === JSON.stringify(sentinels),
        'Reload changed protected slots');
      await game.screenshot({ path: `output/playwright/boss-tactics-${viewport.width}.png`, animations: 'disabled' });
      check(!errors.length, 'Page errors: ' + errors.join('; '));
      check(!failures.length, 'Failed requests: ' + JSON.stringify(failures));
      reports.push({ viewport, tactics: true, finalBoss: true, dungeonFloors: 15, refresh: 1, geometry,
        finalActions: finalCombat.actionCounts, dungeonActions: dungeonCombat.actionCounts,
        wardInCombat: true, finiteEchoes: finalCombat.logs.filter(log => log.phaseEcho).length,
        absorbSet, echoManaRestored: finalCombat.logs.filter(log => log.manaRestored).reduce((sum, log) => sum + log.manaRestored, 0),
        dungeonCastAndImmunity: true, protectedSlots: 4, errors, failures });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/boss-tactics-failure-${viewport.width}.png` });
      throw new Error(error.message + ' | ' + JSON.stringify({ viewport, errors, failures, pending: [...pending],
        state: await game.evaluate(() => ({ app: !!window.appInstance, state: !!window.gameState,
          floor: window.gameState?.data?.castle?.floor, errors: document.getElementById('runtime-error-display')?.textContent })) }));
    } finally { await context.close(); }
  }
  return { kind: 'isolated fixture with actual boss producers, UI battles, settlement and reload; not natural progression', reports };
}
