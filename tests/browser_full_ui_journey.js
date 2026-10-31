async (page) => {
  // Every mutation goes through a visible control in a fresh browser context.
  // evaluate is restricted to state/config reads, measurements and assertions.
  const classId = new URL(page.url()).searchParams.get('full-ui-class') || 'warrior';
  const requestedBuild = new URL(page.url()).searchParams.get('midgame-build');
  const commissionBuild = requestedBuild === 'none' ? null : requestedBuild || (classId === 'mage' ? 'ward' : 'assault');
  if (commissionBuild && !['assault', 'ward'].includes(commissionBuild)) throw new Error('Unknown midgame equipment route');
  const width = classId === 'hunter' ? 1280 : 1440;
  const context = await page.context().browser().newContext({ viewport: { width, height: width === 1280 ? 900 : 1000 } });
  const game = await context.newPage();
  game.setDefaultTimeout(8000);
  const errors = [], networkFailures = [], pendingRequests = new Set();
  game.on('pageerror', error => errors.push(error.message));
  game.on('request', request => pendingRequests.add(request.url()));
  game.on('requestfinished', request => pendingRequests.delete(request.url()));
  game.on('requestfailed', request => {
    pendingRequests.delete(request.url());
    networkFailures.push({ url: request.url(), error: request.failure()?.errorText });
  });
  game.on('response', response => {
    if (response.status() >= 400) networkFailures.push({ url: response.url(), status: response.status() });
  });
  const started = Date.now();
  const report = { classId, width, kind: 'empty save; all mutations through UI; unseeded browser randomness',
    battles: [], chapters: [], refreshes: [], contracts: [], potions: [], commissions: [], commissionBuild,
    repairs: 0, training: 0, equipment: 0, feeding: 0, overflowChecks: 0 };
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  let lastState = null;
  const data = async () => {
    const value = await game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
    lastState = value;
    return value;
  };
  const dismiss = async () => {
    for (let i = 0; i < 8; i++) {
      if (!await game.evaluate(() => window.gameModal.isOpen)) {
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' }); return;
      }
      await game.locator('#game-modal-btn-confirm').click();
    }
    throw new Error('Unsettled modal');
  };
  const click = async selector => { await game.locator(selector).first().click(); await dismiss(); };
  const guidance = () => game.evaluate(async () =>
    JSON.parse(JSON.stringify((await import('/js/core/journey.js')).getJourneyGuidance(window.gameState.data))));
  const town = async room => {
    await click('#nav-tab-town');
    for (let i = 0; i < 8; i++) {
      if (await game.evaluate(room => window.appInstance.views.town.currentView === room, room)) return;
      const destination = `.btn-goto-subview[data-goto="${room}"]`;
      if (await game.locator(destination).count()) return click(destination);
      const parent = room.startsWith('smithy_') ? 'smithy' : room.startsWith('palace_') ? 'palace' : 'tavern';
      let moved = false;
      for (const candidate of [parent, 'hub', 'smithy', 'palace', 'tavern']) {
        const selector = `.btn-goto-subview[data-goto="${candidate}"]`;
        if (!await game.locator(selector).count()) continue;
        await click(selector); moved = true; break;
      }
      check(moved, 'Missing town return control: ' + room);
    }
    throw new Error('Town navigation did not reach ' + room);
  };
  const selectBag = async uid => {
    await click('#nav-tab-bag');
    await click('[data-filter="all"]');
    while (await game.locator('#btn-bag-page-prev').isEnabled()) await click('#btn-bag-page-prev');
    for (let i = 0; i < 30; i++) {
      if (await game.locator(`[data-bag-uid="${uid}"]`).count()) return click(`[data-bag-uid="${uid}"]`);
      check(await game.locator('#btn-bag-page-next').isEnabled(), 'Earned item absent from bag: ' + uid);
      await click('#btn-bag-page-next');
    }
    throw new Error('Bag pagination did not terminate');
  };
  const primary = { warrior: 'str', mage: 'int', hunter: 'dex' }[classId];
  const score = item => Object.entries(item?.stats || {}).reduce((sum, [key, value]) =>
    sum + value * ({ atk: 3, def: 2, hp: .1, maxHp: .1, speed: 1, crit: 3, [primary]: 5 }[key] || 0), 0);
  let preparedSignature = '';
  const prepare = async () => {
    let state = await data();
    const signature = JSON.stringify([state.level, state.freeStatPoints, state.skillTraining,
      state.bag.filter(i => i.slot).map(i => i.uid), Object.values(state.equipped).map(i => i?.uid)]);
    if (signature !== preparedSignature) {
      if (state.freeStatPoints > 0) {
        await click('#nav-tab-hero');
        if (await game.locator('#btn-close-class-skills').count()) await click('#btn-close-class-skills');
        await click('#btn-recommended-stats');
      }
      const points = await game.evaluate(async () => (await import('/js/config/classes.js')).getSkillTraining(window.gameState.data).available);
      if (points > 0) {
        await click('#nav-tab-hero');
        if (await game.locator('#btn-open-class-skills').count()) await click('#btn-open-class-skills');
        for (let i = 0; i < 100; i++) {
          const id = await game.evaluate(async () => {
            const { getClassSkills, getSkillTraining } = await import('/js/config/classes.js');
            const d = window.gameState.data;
            if (!getSkillTraining(d).available) return null;
            return getClassSkills(d.classId, 0, d).filter(s => s.rank < 10)
              .sort((a, b) => a.rank - b.rank || Number(b.category === 'passive') - Number(a.category === 'passive'))[0]?.id;
          });
          if (!id) break;
          await game.locator(`[data-train-class="${id}"]`).focus();
          await game.keyboard.press('Enter');
          check(await game.evaluate(id => {
            const button = document.querySelector(`[data-train-class="${id}"]`);
            return button.disabled ? document.activeElement?.id === 'class-skill-priority' ||
              document.activeElement?.matches('[data-train-class]:enabled') : button === document.activeElement;
          }, id), 'Skill training lost keyboard focus');
          report.training++;
        }
      }
      state = await data();
      for (const item of [...state.bag]) {
        const current = await data();
        if (!item.slot || (item.reqLevel || 1) > current.level || score(item) <= score(current.equipped[item.slot])) continue;
        await selectBag(item.uid);
        const preview = await game.evaluate(uid => window.gameState.getEquipmentPreview(uid), item.uid);
        await click('#btn-bag-equip-item');
        const actual = await game.evaluate(() => window.gameState.getEffectiveStats());
        check(actual.atk === preview.after.atk && actual.speed === preview.after.speed, 'Preview differs from real equipped stats');
        report.equipment++;
      }
      // Inferior surplus is sold via the same confirmation shown to the player.
      for (const item of (await data()).bag.filter(i => i.slot && !i.gems?.some(Boolean))) {
        const current = await data();
        if (score(item) > score(current.equipped[item.slot])) continue;
        await selectBag(item.uid);
        await click('[data-detail-tab="actions"]');
        await click('#btn-bag-sell-equipment');
      }
      preparedSignature = JSON.stringify([(await data()).level, (await data()).freeStatPoints, (await data()).skillTraining,
        (await data()).bag.filter(i => i.slot).map(i => i.uid), Object.values((await data()).equipped).map(i => i?.uid)]);
    }
    state = await data();
    if (Object.values(state.equipped).some(item => item && item.durability < 20)) {
      await town('smithy_repair');
      const quote = await game.evaluate(() => window.gameState.getRepairQuote());
      const gold = (await data()).gold;
      await click('#btn-repair-all');
      check(gold - (await data()).gold === quote.cost, 'Repair did not pay actual quote');
      report.repairs++;
    }
    for (const id of [state.activePetId, ...state.supportPetIds].filter(Boolean)) {
      const current = await data(), pet = current.pets.find(p => p.id === id);
      if (pet.stamina >= 65) continue;
      check(current.bag.some(i => i.id === 'pet_food' && i.count > 0), 'No earned food for fatigue');
      await click('#nav-tab-pets'); await click('#pet-subtab-overview');
      await click(`[data-pet-id="${id}"]`); await click('#btn-feed-pet');
      check((await data()).pets.find(p => p.id === id).stamina > pet.stamina, 'Feeding did not restore stamina');
      report.feeding++;
    }
    const trial = await game.evaluate(async () => {
      const { ROYAL_TRIALS } = await import('/js/config/trials.js');
      const d = window.gameState.data, next = ROYAL_TRIALS[d.royalTrials.completedStage];
      return Boolean(d.questProgress.quest_9?.claimed && next && d.level >= next.level && d.prestige >= next.fameReq);
    });
    if (trial) {
      await town('palace_trials');
      check(await fight('#btn-challenge-trial'), 'Earned preparation promotion defeated');
    }
    state = await data();
    if (classId === 'hunter' && state.questProgress.quest_13?.claimed) {
      const supports = ['mermaid', 'faerie_dragon', 'golden_dragon'].filter(id => id !== state.activePetId).slice(0, 2);
      for (const [index, id] of supports.entries()) {
        let current = await data();
        const eligible = await game.evaluate(async id => {
          const { PET_CONFIGS } = await import('/js/config/pets.js');
          return window.gameState.data.level >= PET_CONFIGS[id].minLevel;
        }, id);
        if (!eligible) continue;
        if (!current.pets.some(p => p.id === id) && current.gold > 50000 && current.crystal > 400 && current.prestige >= 400) {
          const hasEgg = await game.evaluate(id => window.gameState.data.bag.some(egg => window.gameState.getEligibleContractPets(egg).includes(id)), id);
          if (!hasEgg) {
            await town('palace_arena'); await click('#btn-arena-subtab-shop');
            await click('[data-shop-id="pet_egg"]');
          }
          await click('#nav-tab-pets');
          const quote = await game.evaluate(id => window.gameState.getContractChoices().find(c => c.id === id), id);
          check(quote, 'Earned egg cannot reach chosen companion');
          const before = await data();
          await game.locator('#select-companion-contract').selectOption(id);
          await click('#btn-chosen-contract');
          current = await data();
          check(before.gold - current.gold === quote.gold && before.crystal - current.crystal === quote.crystal,
            'Natural contract did not consume quote');
          report.contracts.push({ id, level: current.level, gold: quote.gold, crystal: quote.crystal });
        }
        current = await data();
        if (current.pets.some(p => p.id === id) && current.supportPetIds[index] !== id) {
          await click('#nav-tab-pets'); await click('#pet-subtab-overview');
          await click(`[data-pet-id="${id}"]`); await click(`[data-assign-party="${index + 1}"]`);
        }
      }
    }
    state = await data();
    if (state.questProgress.quest_25?.claimed && state.bag.some(i => i.id === 'book_purify')) {
      await click('#nav-tab-pets'); await click(`[data-pet-id="${state.activePetId}"]`);
      await click('#pet-subtab-skills'); await click('.btn-learn-skill[data-book-id="book_purify"]');
    }
  };
  const battle = async () => {
    await click('#btn-skip-battle');
    const result = await game.evaluate(() => {
      const r = window.appInstance.battleView.currentCombat;
      return { victory: r.victory, seconds: r.duration, actions: r.actionCounts, enemy: r.logs[0].message,
        ward: r.logs.find(log => log.message.includes('神圣护盾'))?.message || null,
        warnings: r.logs.filter(log => log.message.includes('首领蓄势')).length,
        casts: r.logs.filter(log => log.message.includes('施展【')).length,
        enemyCasts: r.logs.filter(log => log.actor === 'enemy' && log.abilityName && !log.phaseEcho && log.type !== 'warning').length,
        echoes: r.logs.filter(log => log.phaseEcho).length,
        recoverySeals: r.logs.filter(log => log.recoverySealStarted).length,
        healingPrevented: r.logs.reduce((sum, log) => sum + (log.healingPrevented || 0), 0),
        manaDrained: r.logs.reduce((sum, log) => sum + (log.manaDrained || 0), 0),
        manaBacklash: r.logs.reduce((sum, log) => sum + (log.manaBacklashDamage || 0), 0),
        minimumHp: Math.min(...r.logs.map(log => log.playerHp)),
        remainingHp: r.remainingHp,
        integralHealth: r.logs.every(log => Number.isInteger(log.playerHp)),
        extinguished: r.logs.filter(log => log.message.includes('余烬熄灭')).map(log => log.message),
        immunities: r.logs.filter(log => log.message.includes('免疫')).map(log => log.message),
        timedOut: r.timedOut, level: window.gameState.data.level, quest: window.gameState.data.currentQuestId,
        displayed: Object.fromEntries(['player', 'enemy'].map(s => [s, Number(document.getElementById(`b-${s}-actions`).textContent)])),
        overflow: document.body.scrollWidth > innerWidth };
    });
    check(!result.overflow, 'Battle horizontal overflow');
    check(result.actions.player === result.displayed.player && result.actions.enemy === result.displayed.enemy, 'Battle action count mismatch');
    if (result.enemy.includes('黑翼龙皇')) {
      check(result.ward?.includes('60000'), 'Final ward did not reach the full UI route');
      check(result.integralHealth, 'Fractional mana leaked into final battle health');
    }
    report.battles.push(result);
    const before = await data();
    await click('#btn-confirm-battle');
    const after = await data();
    for (const potion of before.estate.activePotions) {
      const remaining = after.estate.activePotions.find(p => p.id === potion.id)?.remainingFights || 0;
      check(remaining === Math.max(0, potion.remainingFights - 1), 'Battle bypassed potion expiry');
    }
    for (const [index, id] of [before.activePetId, ...before.supportPetIds].entries()) {
      if (!id) continue;
      check(after.pets.find(p => p.id === id).stamina === Math.max(0, before.pets.find(p => p.id === id).stamina - (index === 0 ? 3 : 1)),
        'Battle bypassed party stamina cost');
    }
    check(new Set([after.activePetId, ...after.supportPetIds].filter(Boolean)).size ===
      [after.activePetId, ...after.supportPetIds].filter(Boolean).length, 'Duplicate party slot');
    return result.victory;
  };
  const fight = async selector => { await click(selector); return battle(); };
  const withdraw = async () => {
    if (!(await data()).castle.isExploring) return;
    await click('#nav-tab-tower'); await click('#btn-subtab-castle'); await click('#btn-claim-castle-exit');
  };
  const refresh = async label => {
    const before = await data();
    await game.reload();
    await game.waitForFunction(() => window.appInstance && window.gameState?.data?.hasChosenClass);
    const after = await data();
    for (const key of ['gold', 'crystal', 'prestige', 'classId', 'currentQuestId', 'level']) check(before[key] === after[key], 'Refresh changed ' + key);
    for (const key of ['bag', 'equipped', 'allocatedStats', 'supportPetIds', 'commissions']) {
      check(JSON.stringify(before[key]) === JSON.stringify(after[key]), 'Refresh changed ' + key);
    }
    check(JSON.stringify(before.pets) === JSON.stringify(after.pets), 'Refresh changed companions');
    check(JSON.stringify(before.estate.activePotions) === JSON.stringify(after.estate.activePotions), 'Refresh changed active potions');
    check(before.skillTraining.preferredAttackId === after.skillTraining.preferredAttackId &&
      JSON.stringify(Object.entries(before.skillTraining.ranks).sort()) ===
      JSON.stringify(Object.entries(after.skillTraining.ranks).sort()), 'Refresh changed training');
    check(!await game.locator('#btn-confirm-character').isVisible(), 'Refresh reopened class choice');
    report.refreshes.push(label);
  };
  const completeMidgameCommission = async chapter => {
    const id = { 11: 'patrol_letter', 19: 'starmap_page', 22: 'rift_lantern' }[chapter];
    if (!commissionBuild || !id) return;
    const config = await game.evaluate(async id =>
      (await import('/js/config/commissions.js')).COMMISSIONS.find(entry => entry.id === id), id);
    await game.locator('#btn-optional-equipment-goal').focus(); await game.keyboard.press('Enter'); await dismiss();
    check(await game.locator(`[data-commission-card="${id}"]`).evaluate(card => card.contains(document.activeElement)),
      'Natural UI optional goal did not focus the available side story');
    await click(`[data-commission-id="${id}"]`);
    check((await data()).commissions[id].status === 'active', 'Natural UI side story was not accepted');
    for (let count = 0; count < config.requirement.count; count++) {
      await prepare();
      await town('tavern_commissions');
      if (count > 0) check((await game.locator(`[data-commission-story="${id}"]`).innerText()) === config.storyBeats[count - 1],
        'Natural UI paid battle did not advance the story');
      await click(`[data-commission-go="${id}"]`);
      check(await fight('.btn-fight-mob >> nth=-1'), 'Natural UI side story battle defeated');
      check((await data()).commissions[id].current === count + 1, 'Natural UI objective missed a paid victory');
    }
    await town('tavern_commissions');
    check((await game.locator(`[data-commission-story="${id}"]`).innerText()) === config.storyBeats.at(-1),
      'Natural UI final story beat is missing');
    const choice = config.rewards.equipmentChoices.find(item => item.id.endsWith('_' + commissionBuild));
    const radio = `[data-commission-choice="${id}"][value="${choice.id}"]`;
    await game.locator(radio).focus();
    await game.keyboard.press('Space');
    await game.screenshot({ path: `output/playwright/full-ui-${classId}-${id}-choice.png`, animations: 'disabled' });
    const before = await data();
    await click(`[data-commission-id="${id}"]`);
    const after = await data();
    check(after.commissions[id].status === 'claimed' && after.commissions[id].choiceId === choice.id,
      'Natural UI side story did not keep the selected reward');
    for (const key of ['gold', 'crystal', 'prestige']) {
      check(after[key] - before[key] === config.rewards[key], 'Natural UI side story reward mismatch: ' + key);
    }
    const gear = after.bag.find(item => item.id === choice.id);
    check(gear, 'Natural UI side story equipment missing');
    await selectBag(gear.uid);
    await click('#btn-bag-equip-item');
    check((await data()).equipped[gear.slot]?.id === choice.id, 'Natural UI side story reward could not be equipped');
    report.commissions.push({ id, choiceId: choice.id, level: after.level, battles: report.battles.length });
    await refresh(id);
  };
  try {
    await game.goto('http://127.0.0.1:8088');
    await click(`[data-class-id="${classId}"]`);
    await game.locator('#input-hero-name').fill(`UI ${classId}`);
    await game.locator('#btn-confirm-character').click();
    const initial = await data();
    check(!initial.bag.length && !initial.pets.length && !initial.gold && !initial.crystal &&
      !Object.values(initial.equipped).some(Boolean), 'New save contains unearned assets');
    await dismiss();
    report.chapters.push({ chapter: 1, level: (await data()).level, battles: 0 });
    for (let iteration = 0; iteration < 650 && (await data()).currentQuestId !== 'completed'; iteration++) {
      await prepare();
      let state = await data(), guide = await guidance();
      if (guide.ready) {
        const chapter = Number(state.currentQuestId.split('_')[1]);
        await click('#btn-claim-quest-reward');
        check((await data()).questProgress[state.currentQuestId]?.claimed, 'Chapter reward missing');
        report.chapters.push({ chapter, level: (await data()).level, battles: report.battles.length,
          realSeconds: +((Date.now() - started) / 1000).toFixed(1) });
        await completeMidgameCommission(chapter);
        check(await game.evaluate(() => document.body.scrollWidth <= innerWidth), 'Chapter horizontal overflow');
        report.overflowChecks++;
        if ([7, 10, 20, 25].includes(chapter)) {
          await game.screenshot({ path: `output/playwright/full-ui-${classId}-chapter-${chapter}.png` });
          await refresh('chapter_' + chapter);
        }
        continue;
      }
      await click('#btn-next-journey');
      state = await data();
      if (guide.regionalReady) continue;
      const action = guide.action;
      if (action === 'allocate_stats') { await click('#btn-recommended-stats'); continue; }
      if (action === 'feed_pet') { await click('#btn-feed-pet'); continue; }
      if (action === 'withdraw_castle') { await click('#btn-claim-castle-exit'); continue; }
      if (action === 'equip_gear') { preparedSignature = ''; continue; }
      if (action === 'regional_story') {
        if (guide.event.action === 'dungeon') {
          if (!state.dungeon.activeGateId) await click('#btn-enter-dungeon');
          check(await fight('#btn-dungeon-fight'), 'Investigation dungeon defeated');
        } else check(await fight(guide.event.action === 'boss' ? '#btn-fight-wild-boss' : '.btn-fight-mob >> nth=-1'), 'Investigation defeated');
        continue;
      }
      if (action === 'grow_in_wild') { check(await fight('.btn-fight-mob >> nth=-1'), 'Natural growth defeated'); continue; }
      if (action === 'investigate_patrol') { check(await fight('.btn-fight-mob'), 'First patrol defeated'); continue; }
      if (action === 'enhance') { await click('#btn-do-enhance'); continue; }
      if (action === 'set_active_pet') {
        if (!state.pets.length) await click('#btn-hatch-egg');
        await click('#btn-toggle-active-pet'); continue;
      }
      if (action === 'learn_skill') { await click('.btn-learn-skill[data-book-id="book_crit"]'); continue; }
      if (action === 'brew_potion') {
        const before = await data();
        const stats = await game.evaluate(() => window.gameState.getEffectiveStats());
        await game.locator('.btn-brew-potion[data-recipe-id="pot_titan"]').focus();
        await game.keyboard.press('Enter'); await dismiss();
        const after = await data(), boosted = await game.evaluate(() => window.gameState.getEffectiveStats());
        check(before.estate.herbs.herb_dragonblood - after.estate.herbs.herb_dragonblood === 3 &&
          before.estate.herbs.herb_starlight - after.estate.herbs.herb_starlight === 2, 'Potion bypassed actual herb costs');
        check(Math.abs(boosted.maxHp - stats.maxHp * 1.35) < 2 && Math.abs(boosted.def - stats.def * 1.25) < 2,
          'Potion did not scale the complete effective loadout');
        check(await game.evaluate(() => document.activeElement?.tagName === 'BUTTON'),
          'Potion confirmation lost keyboard focus');
        report.potions.push({ chapter: before.currentQuestId, floor: before.castle.floor,
          before: { hp: stats.maxHp, def: stats.def }, after: { hp: boosted.maxHp, def: boosted.def } });
        if (before.currentQuestId === 'quest_26') await refresh('final_preparation');
        continue;
      }
      if (action === 'hire_merc') {
        const id = { warrior: 'merc_cleric', mage: 'merc_paladin', hunter: 'merc_bard' }[classId];
        await click(`.btn-hire-merc[data-merc-id="${id}"]`); continue;
      }
      if (action === 'retry_finale') {
        await click('#btn-retry-finale');
        continue;
      }
      if (action.startsWith('clear_tower_')) {
        if (!state.castle.isExploring) {
          if (action === 'clear_tower_100' && await game.locator('#btn-retry-finale').count()) {
            await click('#btn-retry-finale');
          } else {
            const key = Number(action.split('_').at(-1)) >= 90 ? 'platinum' : action === 'clear_tower_70' ? 'titan' : 'redwood';
            await click('#btn-start-' + key);
          }
        }
        const won = await fight('#btn-challenge-castle-floor');
        if (!won) check(report.battles.filter(b => !b.victory).length <= 3, 'Repeated earned tower defeat');
        continue;
      }
      if (action === 'socket_gem') {
        if (!state.equipped.weapon.sockets) await click('#btn-punch-socket');
        await click('.btn-select-bag-gem'); await click('.btn-inlay-gem'); continue;
      }
      if (['slay_dragon', 'slay_silver_dragon'].includes(action)) {
        check(await fight(`.btn-fight-dragon[data-dragon-id="${action === 'slay_dragon' ? 'slay_red_dragon' : 'slay_silver_dragon'}"]`), 'Dragon defeated');
        continue;
      }
      if (['royal_trials', 'complete_royal_trials'].includes(action)) {
        check(await fight('#btn-challenge-trial'), 'Promotion defeated'); continue;
      }
      if (['clear_dungeon', 'clear_dragon_gate', 'clear_spacetime_gate'].includes(action)) {
        if (!state.dungeon.activeGateId) await click('#btn-enter-dungeon');
        check(await fight('#btn-dungeon-fight'), 'Story dungeon defeated'); continue;
      }
      if (action === 'arena_duel') {
        // Advance the original partner with earned experience before its reset.
        const pet = state.pets.find(p => p.id === state.activePetId);
        if (pet.tier === 'gold' && pet.level >= 30) {
          await click('#nav-tab-pets'); await click(`[data-pet-id="${state.activePetId}"]`);
          await click('#pet-subtab-wash'); await click('#btn-do-evolve-pet');
        } else check(await fight('.btn-challenge-arena-opp'), 'NPC arena defeated');
        continue;
      }
      if (action === 'reforge_gear') {
        await click('#btn-do-reforge'); await click('.btn-resolve-reforge[data-accept="true"]'); continue;
      }
      if (action === 'slay_wild_boss') { check(await fight('#btn-fight-wild-boss'), 'Forest boss defeated'); continue; }
      if (action === 'catch_thief') { check(await fight('#btn-challenge-thief'), 'Thief defeated'); continue; }
      if (action === 'evolve_purplegold') {
        await click(`[data-pet-id="${state.activePetId}"]`); await click('#btn-do-evolve-pet'); continue;
      }
      if (action === 'capture_stronghold') { check(await fight('.btn-challenge-stronghold'), 'NPC stronghold defeated'); continue; }
      throw new Error('Unhandled guidance: ' + JSON.stringify(guide));
    }
    check((await data()).currentQuestId === 'completed', 'Campaign exceeded iteration budget');
    if (commissionBuild) check(report.commissions.length === 3, 'Natural UI midgame chain incomplete');
    await withdraw();
    await refresh('final');
    const final = await data();
    check(final.castle.maxReachedFloor === 100 && final.castle.claimedBossRewards.includes(100), 'Final boss not actually defeated');
    check(report.chapters.length === 26, 'Not all chapters claimed through UI');
    if (classId === 'hunter') {
      check(final.supportPetIds.every(Boolean) && report.contracts.length === 2, 'Hunter did not earn both distinct supports through UI');
    }
    check(errors.length === 0, errors.join('; '));
    check(networkFailures.length === 0, JSON.stringify(networkFailures));
    report.final = { level: final.level, quest: final.currentQuestId, floor: final.castle.maxReachedFloor,
      gold: final.gold, crystal: final.crystal, prestige: final.prestige, pet: final.pets.find(p => p.id === final.activePetId),
      supports: final.supportPetIds.map(id => final.pets.find(p => p.id === id) || null),
      promotion: final.royalTrials.completedStage, gates: final.dungeon.clearedGates };
    report.realSeconds = +((Date.now() - started) / 1000).toFixed(1);
    report.combatSeconds = +report.battles.reduce((n, b) => n + b.seconds, 0).toFixed(1);
    report.losses = report.battles.filter(b => !b.victory).length;
    report.errors = errors;
    await game.screenshot({ path: `output/playwright/full-ui-${classId}-final.png` });
    return report;
  } catch (error) {
    await game.screenshot({ path: `output/playwright/full-ui-${classId}-failure.png` });
    const state = await data().catch(() => lastState);
    throw new Error(error.stack + '; checkpoint=' + JSON.stringify({ quest: state?.currentQuestId, level: state?.level,
      guidance: await guidance().catch(() => null), refreshes: report.refreshes, potions: report.potions,
      battles: report.battles.length, recent: report.battles.slice(-2), errors, networkFailures,
      pendingRequests: [...pendingRequests],
      savedSlot: await game.evaluate(() => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_1')).catch(() => null) }));
  } finally { await context.close(); }
}
