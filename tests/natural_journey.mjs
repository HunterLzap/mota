// Production route: empty saves, earned possessions only. Clock advances are
// reported as waiting; battle turns are counted separately from real UI time.
import { GameState } from '../js/core/state.js';
import { CLASSES, getClassSkills, getSkillTraining } from '../js/config/classes.js';
import { MAPS } from '../js/config/maps.js';
import { QUEST_LIST } from '../js/config/quests.js';
import { ROYAL_TRIALS } from '../js/config/trials.js';
import { runCombat } from '../js/core/combat.js';
import { getTowerFloorData } from '../js/config/towerLevels.js';
import { DUNGEON_GATES, getDungeonFloorGuard } from '../js/config/dungeons.js';
import { DRAGON_TRIALS } from '../js/config/dragonSlaying.js';
import { ARENA_OPPONENTS } from '../js/config/arena.js';
import { STRONGHOLDS } from '../js/config/factionWar.js';
import { TAVERN_BOUNTIES } from '../js/config/tavern.js';
import { SPECIAL_ITEMS } from '../js/config/items.js';
import { getRegionalStory } from '../js/config/story.js';
import { getPetParty } from '../js/core/petParty.js';
import { PET_CONFIGS } from '../js/config/pets.js';
import { getJourneyGuidance, canRetryFinale } from '../js/core/journey.js';
import { COMMISSIONS } from '../js/config/commissions.js';

export function naturalJourney(classId, initialSeed = 406, onCheckpoint = () => {}, strategy = 'ordinary', startingState = null, adventureVersion = 2, routeOptions = {}) {
  const check = (ok, message) => { if (!ok) throw new Error(`${classId}/${state.data.currentQuestId}/Lv${state.data.level}: ${message}`); };
  let seed = initialSeed;
  const random = Math.random, RealDate = Date;
  let now = new RealDate('2026-10-05T08:00:00+08:00').getTime();
  Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  globalThis.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  const state = startingState || new GameState();
  // Character choice is the only initial state choice. No earned values set.
  if (!startingState) { state.data.classId = classId; state.data.hasChosenClass = true; state.data.onboardingVersion = adventureVersion; }
  const originalNotify = state.notify;
  state.notify = () => {};
  const report = { classId, seed: initialSeed, strategy, battles: 0, losses: 0, turns: 0, combatSeconds: 0, playerActions: 0, enemyActions: 0, waitingHours: 0, repairs: 0, repairGold: 0, salesGold: 0, inheritedItems: 0, inheritanceGold: 0, inheritanceCrystal: 0, foodUsed: 0, bossHunts: 0, chapters: [], bossSamples: [], economySamples: [] };
  report.options = { skillBuild: 'balanced', partyBuild: 'solo', sideTasks: 'none', ...routeOptions };
  report.resourceFlow = {};
  report.contracts = [];
  report.optionalActivities = [];
  report.commissions = [];
  const accountingMethods = new Map();
  let accountingDepth = 0;
  const experienceAtLevel = [0, 0];
  for (let level = 2; level <= 100; level++) experienceAtLevel[level] = experienceAtLevel[level - 1] + state.getNextLevelExp(level - 1);
  const cash = () => ({ ...Object.fromEntries(['gold', 'crystal', 'prestige'].map(key => [key, state.data[key]])),
    experience: experienceAtLevel[state.data.level] + state.data.exp, food: state.data.bag.find(item => item.id === 'pet_food')?.count || 0 });
  const openingResources = cash();
  for (const [method, source] of Object.entries({
    gainCurrency: 'other', claimQuestReward: 'mainline', claimRegionalStory: 'investigation',
    meetCityGuard: 'guard', settleWildVictory: 'wild', settleWildBossVictory: 'wildBoss',
    completeRoyalTrial: 'promotion', settleDragonChallenge: 'dragon',
    finishCastleExpedition: 'towerBank', settleCastleVictory: 'towerImmediate',
    settleDungeonVictory: 'dungeon', completeBountyBattle: 'bountyBattle', claimBountyReward: 'bounty',
    repairAllEquipment: 'repair', enhanceEquipment: 'enhance', hatchPetEgg: 'contract',
    reforgeEquipment: 'reforge', punchSocket: 'socket', inlayGem: 'inlay', hireMercenary: 'mercenary',
    sellEquipment: 'sale', inheritEquipmentUpgrade: 'inheritance', buyPrestigeItem: 'prestigeShop',
    completeStrongholdVictory: 'stronghold', settleArenaChallenge: 'arena', brewPotion: 'alchemy', feedPet: 'feeding',
    claimCommission: 'commissions'
  })) {
    if (typeof state[method] !== 'function') continue;
    const originalMethod = state[method]; accountingMethods.set(method, originalMethod);
    state[method] = function (...args) {
      if (accountingDepth) return originalMethod.apply(this, args);
      const before = cash(); accountingDepth++;
      try { return originalMethod.apply(this, args); }
      finally {
        accountingDepth--;
        const flow = report.resourceFlow[source] ||= { gold: 0, crystal: 0, prestige: 0, experience: 0, food: 0, calls: 0 };
        const after = cash();
        for (const key of Object.keys(before)) flow[key] += after[key] - before[key];
        flow.calls++;
      }
    };
  }
  const primary = CLASSES[classId].primaryStat;
  const ok = result => { check(result?.success, result?.msg || 'Operation refused'); return result; };
  const score = item => Object.entries(item?.stats || {}).reduce((sum, [key, value]) => sum + value * ({ atk: 3, def: 2, hp: .1, maxHp: .1, speed: 1, crit: 3, [primary]: 5 }[key] || 0), 0);
  function prepare() {
    if (state.data.freeStatPoints > 0) ok(state.allocateRecommendedStats());
    if (routeOptions.skillBuild !== 'none') {
      while (getSkillTraining(state.data).available > 0) {
        const skills = getClassSkills(classId, 0, state.data).filter(skill => skill.rank < 10);
        const preference = skill => report.options.skillBuild === 'assault' ? Number(skill.category === 'attack') * 2 + Number(skill.category === 'passive')
          : report.options.skillBuild === 'ward' ? Number(skill.category === 'passive') * 2 + Number(skill.category === 'aura') : 0;
        const ordered = skills.sort((a, b) => preference(b) - preference(a) || a.rank - b.rank || Number(b.category === 'passive') - Number(a.category === 'passive'));
        if (!ordered.length) break;
        ok(state.trainClassSkill(ordered[0].id, ordered[0].rank));
      }
    }
    if (report.options.partyBuild !== 'solo') {
      const parties = {
        assault: ['golden_dragon', 'mermaid', 'faerie_dragon'],
        ward: ['silver_dragon', 'djinn', 'white_angel'],
        survival: ['phoenix', 'pixie']
      };
      const desired = (parties[report.options.partyBuild] || parties.ward).filter(id => id !== state.data.activePetId);
      const selected = [];
      for (const id of desired) {
        if (selected.length === 2) break;
        if (!state.data.pets.some(pet => pet.id === id)) {
          if (state.data.questProgress.quest_13?.claimed && state.data.level >= PET_CONFIGS[id].minLevel && !state.data.bag.some(egg => state.getEligibleContractPets(egg).includes(id)) && state.data.prestige >= 400 && state.data.gold > 50000 && state.data.crystal > 400) ok(state.buyPrestigeItem('pet_egg'));
          const choice = state.getContractChoices().find(choice => choice.id === id);
          // Leave a reserve for repairs and the story's next mandatory purchases.
          if (choice && state.data.gold >= choice.gold + 10000 && state.data.crystal >= choice.crystal + 100) {
            ok(state.hatchPetEgg(id)); report.contracts.push({ id, heroLevel: state.data.level, gold: choice.gold, crystal: choice.crystal });
          }
        }
        if (state.data.pets.some(pet => pet.id === id)) selected.push(id);
      }
      for (const [index, id] of selected.entries()) if (state.data.supportPetIds[index] !== id) ok(state.setPetPartySlot(index + 1, id));
    }
    for (const item of [...state.data.bag]) if (item.slot && (item.reqLevel || 1) <= state.data.level && score(item) > score(state.data.equipped[item.slot])) {
      const quote = strategy === 'inherit' && state.data.questProgress.quest_3?.claimed ? state.getUpgradeInheritanceQuote(item.uid) : null;
      if (quote?.success && state.data.gold >= quote.gold && state.data.crystal >= quote.crystal) {
        ok(state.inheritEquipmentUpgrade(quote));report.inheritedItems++;report.inheritanceGold+=quote.gold;report.inheritanceCrystal+=quote.crystal;
      } else ok(state.equipItem(item.uid));
    }
    if (Object.values(state.data.equipped).some(item => item && item.durability < 20)) { const before=state.data.gold;ok(state.repairAllEquipment()); report.repairs++;report.repairGold+=before-state.data.gold; }
    for (const { pet } of getPetParty(state.data)) {
      if (pet && pet.stamina < 65 && state.feedPet(pet.id).success) report.foodUsed++;
    }
    // Sell inferior spare equipment through the actual quote/confirmation API.
    for (const item of [...state.data.bag]) if (item.slot && !item.gems?.some(Boolean) && score(item) <= score(state.data.equipped[item.slot])) {
      const quote = state.getEquipmentSaleQuote(item.uid); if (quote.success) {ok(state.sellEquipment(item.uid, quote.gold));report.salesGold+=quote.gold;}
    }
  }
  function fight(enemy, settle, castle = false, pvp = false) {
    prepare(); state.data.isCastleExplore = castle;
    const result = runCombat(state.getEffectiveStats(), enemy, state.data, { ...enemy, isPvp: pvp });
    report.battles++; report.turns += result.logs.at(-1).turn;
    report.combatSeconds += result.duration;
    report.playerActions += result.actionCounts.player;
    report.enemyActions += result.actionCounts.enemy;
    if (!result.victory) {
      report.losses++;
      (report.lossDetails ||= []).push({ enemy: enemy.name, level: state.data.level, duration: result.duration, timedOut: result.timedOut, enemyHp: result.logs.at(-1).enemyHp, remainingMp: result.remainingMp, actionCounts: result.actionCounts });
    }
    if (settle) settle(result.victory);
    state.completeBattle(); state.data.isCastleExplore = false;
    check(report.battles < 20000, 'Route exceeded battle budget');
    return result.victory;
  }
  function sampleBoss(enemy, castle = false) {
    prepare();
    const resumeSeed=seed, stats=state.getEffectiveStats(), data=JSON.parse(JSON.stringify(state.data));
    let wins=0,turns=0,casts=0,remainingMp=0,seconds=0,enemyActions=0,playerActions=0;
    let remainingHpPct=0,minRemainingHpPct=100,revivals=0;
    for(let attempt=0;attempt<100;attempt++) {
      seed=1000+attempt;
      const result=runCombat(stats,enemy,{...data,isCastleExplore:castle},enemy);
      wins+=Number(result.victory);turns+=result.logs.at(-1).turn;remainingMp+=result.remainingMp;
      seconds+=result.duration;enemyActions+=result.actionCounts.enemy;playerActions+=result.actionCounts.player;
      const hpPct = Math.max(0, result.remainingHp) / stats.maxHp * 100;
      remainingHpPct += hpPct; minRemainingHpPct = Math.min(minRemainingHpPct, hpPct);
      revivals += Number(result.logs.some(log => log.message.includes('全满复活') || log.message.includes('凤凰·涅槃') || log.message.includes('仙子结界')));
      casts+=result.logs.filter(log=>(enemy.abilities||[]).some(ability=>log.message.includes('施展【'+ability.name+'】'))).length;
    }
    seed=resumeSeed;
    report.bossSamples.push({enemy:enemy.name,level:data.level,pet:data.activePetId,winPct:wins,meanTurns:turns/100,meanSeconds:seconds/100,meanEnemyActions:enemyActions/100,meanPlayerActions:playerActions/100,meanEnemyCasts:casts/100,meanRemainingMp:remainingMp/100,meanRemainingHpPct:remainingHpPct/100,minRemainingHpPct,revivalPct:revivals,castleRevival:castle,samples:100,rewardsGranted:false});
  }
  function hunt() {
    const map = MAPS.filter(map => map.reqLevel <= state.data.level).at(-1);
    check(fight({ ...map.monsters.at(-1), speed: 18 }, victory => { if (victory) ok(state.settleWildVictory(map.id, map.monsters.length - 1)); }), 'Cannot defeat current-region ordinary monster');
    if (strategy !== 'ordinary') {
      for (const bounty of TAVERN_BOUNTIES) {
        if (state.data.level < bounty.reqLevel || state.getTavernBounties().find(b => b.id === bounty.id).status !== 'available') continue;
        ok(state.acceptBounty(bounty.id));
        check(fight({ ...bounty.stats, name: bounty.targetName }, victory => { if (victory) ok(state.completeBountyBattle(bounty.id)); }), 'Bounty defeat');
        ok(state.claimBountyReward(bounty.id));
      }
      if (state.data.wildVictories % 10 === 0) {
        const bossMap = MAPS.filter(map => map.boss.level <= state.data.level).at(-1);
        if (bossMap) {
          check(fight(bossMap.boss, victory => { if (victory) ok(state.settleWildBossVictory(bossMap.id)); }), 'Preparation boss defeat');
          report.bossHunts++;
        }
      }
    }
    const stage = state.data.royalTrials.completedStage, trial = ROYAL_TRIALS[stage];
    if (trial && state.data.level >= trial.level && state.data.prestige >= trial.fameReq) fight({ ...trial.bossStats, name: trial.bossName, speed: 18 }, victory => { if (victory) ok(state.completeRoyalTrial(stage)); });
  }
  function investigate() {
    let event;
    while ((event = getRegionalStory(state.data))) {
      if (event.action === 'dungeon') check(dungeon(event.target, false), 'Investigation dungeon defeat');
      else {
        const map = MAPS.find(map => map.id === event.target);
        while (!state.data.questProgress[event.id]?.completed) {
          const enemy = event.action === 'boss' ? map.boss : { ...map.monsters.at(-1), speed: 18 };
          check(fight(enemy, victory => { if (victory) ok(event.action === 'boss' ? state.settleWildBossVictory(map.id) : state.settleWildVictory(map.id, map.monsters.length - 1)); }), 'Investigation defeat');
        }
      }
      ok(state.claimRegionalStory(event.id)); prepare();
    }
  }
  function grow(level) {
    investigate(); while (state.data.level < level) hunt(); prepare();
    let trial;
    while ((trial = ROYAL_TRIALS[state.data.royalTrials.completedStage]) && state.data.level >= trial.level && state.data.prestige >= trial.fameReq) {
      const stage = state.data.royalTrials.completedStage;
      check(fight({ ...trial.bossStats, name: trial.bossName, speed: 18 }, victory => { if (victory) ok(state.completeRoyalTrial(stage)); }), 'Promotion defeat');
    }
  }
  function waitDay() {
    const next = new Date(now); next.setHours(24, 0, 0, 0);
    const elapsed = next.getTime() - now; now += elapsed;
    report.waitingHours += elapsed / 3600000;
    state.resetDailyActivities(next.toDateString());
  }
  function tower(target, keyId) {
    if (!state.data.castle.isExploring) {
      if (target === 100 && canRetryFinale(state.data)) ok(state.startFinaleRetry());
      else {
      if (!state.data.castle.entriesLeft && !state.data.bag.some(item => item.id === 'royal_castle_permit' && item.count > 0)) waitDay();
      ok(state.startCastleExpedition(keyId));
      }
    }
    while (state.data.castle.floor <= target && !state.data.castle.finished) {
      const floor = state.data.castle.floor;
      prepare();
      if (getJourneyGuidance(state.data)?.action === 'brew_potion') ok(state.brewPotion('pot_titan'));
      if (getTowerFloorData(floor, state.data.onboardingVersion).isBoss) sampleBoss(getTowerFloorData(floor, state.data.onboardingVersion),true);
      const won = fight(getTowerFloorData(floor, state.data.onboardingVersion), victory => { if (victory) ok(state.settleCastleVictory(floor, state.data.castle.expeditionId)); }, true);
      if (!won) { ok(state.finishCastleExpedition(state.data.castle.expeditionId, floor)); return false; }
    }
    ok(state.finishCastleExpedition(state.data.castle.expeditionId)); return true;
  }
  function dungeon(id, followInvestigation = true) {
    const gate = DUNGEON_GATES.find(gate => gate.id === id);
    if (followInvestigation) grow(gate.minLevel); else while (state.data.level < gate.minLevel) hunt();
    if (!state.data.dungeon.entriesLeft && !state.data.bag.some(item => item.id === 'royal_dungeon_permit' && item.count > 0)) waitDay();
    const entry = ok(state.startDungeonExpedition(id));
    for (let floor = 1; floor <= gate.totalFloors; floor++) {
      if (floor===gate.totalFloors) sampleBoss(getDungeonFloorGuard(id,floor));
      if (!fight(getDungeonFloorGuard(id, floor), victory => { if (victory) ok(state.settleDungeonVictory(id, floor, entry.expeditionId)); })) {
        ok(state.retreatDungeonExpedition(entry.expeditionId)); return false;
      }
    }
    return true;
  }
  function dragon(id) {
    const cfg = DRAGON_TRIALS.find(dragon => dragon.id === id); grow(cfg.minLevel);
    if (!state.data.dragon.trialsLeft) waitDay();
    const entry = ok(state.startDragonChallenge(id));
    sampleBoss({ ...cfg, speed:20 });
    return fight({ ...cfg, speed: 20 }, victory => ok(state.settleDragonChallenge(id, entry.challengeId, victory)));
  }
  function claim() {
    const id = state.data.currentQuestId; state.reconcileQuestMilestones();
    check(state.claimQuestReward(id), 'Chapter objective not actually completed');
    check(!state.claimQuestReward(id), 'Duplicate chapter reward'); prepare();
    const row = { chapter: Number(id.split('_')[1]), level: state.data.level, petLevel: state.data.pets[0]?.level, petTier: state.data.pets[0]?.tier, battles: report.battles, waitingHours: +report.waitingHours.toFixed(3), gold: state.data.gold, crystal: state.data.crystal };
    report.chapters.push(row); onCheckpoint(row, state);
    if (report.options.commissionBuild && [11, 19, 22].includes(row.chapter)) {
      const id = { 11: 'patrol_letter', 19: 'starmap_page', 22: 'rift_lantern' }[row.chapter];
      const config = COMMISSIONS.find(entry => entry.id === id);
      ok(state.acceptCommission(id));
      const map = MAPS.find(map => map.id === config.requirement.target);
      for (let count = 0; count < config.requirement.count; count++) {
        check(fight({ ...map.monsters.at(-1), speed: 18 }, victory => {
          if (victory) ok(state.settleWildVictory(map.id, map.monsters.length - 1));
        }), 'Optional journey commission defeat');
      }
      const choice = config.rewards.equipmentChoices.find(item => item.id.endsWith('_' + report.options.commissionBuild));
      ok(state.claimCommission(id, choice.id));
      const equipment = state.data.bag.find(item => item.id === choice.id);
      check(Boolean(equipment), 'Chosen journey equipment missing');
      ok(state.equipItem(equipment.uid));
      report.commissions.push({ id, choiceId: choice.id, chapter: row.chapter, level: state.data.level });
      prepare();
    }
    if (report.options.sideTasks === 'moderate' && [13, 18, 21, 24].includes(row.chapter)) {
      const bounty = state.getTavernBounties().find(entry => entry.status === 'available' && state.data.level >= entry.reqLevel);
      if (bounty) {
        ok(state.acceptBounty(bounty.id));
        check(fight({ ...bounty.stats, name: bounty.targetName }, victory => { if (victory) ok(state.completeBountyBattle(bounty.id)); }), 'Optional bounty defeat');
        ok(state.claimBountyReward(bounty.id));
        report.optionalActivities.push({ id: bounty.id, chapter: row.chapter, level: state.data.level });
      }
    }
  }
  try {
    if (!startingState) {
    check(!state.data.bag.length && !state.data.pets.length && !state.data.gold && !state.data.crystal && !Object.values(state.data.equipped).some(Boolean), 'Nonempty starting save');
    if (state.data.onboardingVersion === 2) {
      ok(state.meetCityGuard()); claim();
      check(fight({ ...MAPS[0].monsters[0], speed: 18 }, victory => { if (victory) ok(state.settleWildVictory('forest', 0)); }), 'First patrol defeat'); claim();
      ok(state.enhanceEquipment('weapon', false)); claim();
      ok(state.setActivePet(ok(state.hatchPetEgg()).petId)); claim();
    } else {
      ok(state.claimSalary()); claim(); ok(state.enhanceEquipment('weapon', false)); claim();
      ok(state.setActivePet(ok(state.hatchPetEgg()).petId)); claim();
      ok(state.washPetAptitude(state.data.activePetId)); claim();
    }
    ok(state.learnPetSkill(state.data.activePetId, 'book_crit')); claim();
    check(tower(1, 'key_redwood'), 'First tower defeat'); claim();
    ok(state.brewPotion('pot_titan')); claim();
    } else check(state.data.currentQuestId === 'quest_8' && state.data.classId === classId, 'Unexpected browser continuation');
    ok(state.hireMercenary(classId === 'mage' ? 'merc_paladin' : classId === 'hunter' ? 'merc_bard' : 'merc_cleric')); claim();
    check(tower(10, 'key_redwood'), 'Tower 10 defeat'); claim();
    const gem = state.data.bag.find(item => item.id === 'gem_atk');
    if (!state.data.equipped.weapon.sockets) ok(state.punchSocket('weapon'));
    ok(state.inlayGem('weapon', 0, gem.uid)); claim();
    check(dragon('slay_red_dragon'), 'Red dragon defeat'); claim();
    state.reconcileQuestMilestones(); claim();
    check(dungeon('trial_gate'), 'First dungeon defeat'); claim();
    const pet = state.data.pets[0];
    while (pet.level < 30) hunt(); ok(state.evolvePet(pet.id));
    const opponent = ARENA_OPPONENTS[0], entry = ok(state.startArenaChallenge(opponent.id));
    check(fight(opponent, victory => ok(state.settleArenaChallenge(opponent.id, entry.challengeId, victory)), false, true), 'First arena defeat'); claim();
    check(tower(20, 'key_redwood'), 'Tower 20 defeat'); claim();
    while (!state.data.bag.some(item => ['crystal_gold', 'crystal_darkgold'].includes(item.id))) {
      grow(15); check(fight(MAPS[0].boss, victory => { if (victory) ok(state.settleWildBossVictory('forest')); }), 'Material boss defeat');
    }
    const material = state.data.bag.find(item => ['crystal_gold', 'crystal_darkgold'].includes(item.id));
    ok(state.reforgeEquipment('weapon', material.id)); claim();
    check(fight(MAPS[0].boss, victory => { if (victory) ok(state.settleWildBossVictory('forest')); }), 'Wolf boss defeat'); claim();
    check(state.data.maskedThief.appeared, 'Thief never appeared');
    check(fight({ name: '黑羽蒙面女盗', hp: state.data.maskedThief.hp || 8000, atk: 380, def: 180, speed: 30 }, victory => {
      if (victory) { state.gainCurrency(4500,80,50); state.grantBattleLoot({ ...SPECIAL_ITEMS.crystal_gold, count: 5 }); state.grantBattleLoot({ ...SPECIAL_ITEMS.protect_crystal, count: 2 }); state.data.maskedThief.appeared = false; state.triggerQuestAction('catch_thief'); }
    }), 'Thief defeat'); claim();
    check(dragon('slay_silver_dragon'), 'Silver dragon defeat'); claim();
    while (pet.level < 40) hunt(); ok(state.evolvePet(pet.id)); claim();
    const stronghold = STRONGHOLDS[0]; grow(stronghold.reqLevel); ok(state.challengeStronghold(stronghold.id));
    check(fight(stronghold.defender, victory => { if (victory) ok(state.completeStrongholdVictory(stronghold.id)); }), 'Stronghold defeat'); claim();
    check(dungeon('dragon_gate'), 'Dragon gate defeat'); claim();
    check(tower(70, 'key_titan'), 'Tower 70 defeat'); claim();
    grow(80); while (state.data.royalTrials.completedStage < 7) hunt(); claim();
    check(dungeon('spacetime_gate'), 'Spacetime gate defeat'); claim();
    ok(state.learnPetSkill(pet.id, 'book_purify'));
    if (state.data.onboardingVersion === 2) {
      prepare();
      for (const slot of ['weapon','armor']) {
        for (let attempt=0; attempt<8 && state.data.equipped[slot].stars<2; attempt++) {
          if (!state.data.bag.some(item => item.id==='star_crystal' && item.count >= state.data.equipped[slot].stars+1)) break;
          state.enhanceEquipment(slot, false);
        }
      }
    }
    let finalVictory=false;
    for(let attempt=0;attempt<3 && !finalVictory;attempt++) finalVictory=tower(100,'key_platinum');
    check(finalVictory, 'Final tower defeat after earned preparation and retries: ' + JSON.stringify(report.lossDetails)); claim();
    check(state.data.currentQuestId === 'completed' && state.data.castle.claimedBossRewards.includes(100), 'No final victory');
    report.final = { level: state.data.level, gold: state.data.gold, crystal: state.data.crystal, prestige: state.data.prestige, pet: { id: pet.id, level: pet.level, tier: pet.tier }, tower: state.data.castle.maxReachedFloor, quest: state.data.currentQuestId };
    report.final.party = getPetParty(state.data).map(member => member.pet ? { id: member.pet.id, level: member.pet.level, stamina: member.pet.stamina } : null);
    report.final.skillTraining = structuredClone(state.data.skillTraining);
    report.final.skillPoints = getSkillTraining(state.data);
    report.final.food = state.data.bag.find(item => item.id === 'pet_food')?.count || 0;
    report.resourceAccounting = { opening: openingResources, closing: cash() };
    report.mainlineCost = { battles: report.battles, turns: report.turns, combatSeconds: report.combatSeconds, playerActions: report.playerActions, enemyActions: report.enemyActions, waitingHours: report.waitingHours, realActiveSeconds: null };
    const stats=state.getEffectiveStats(),data=JSON.parse(JSON.stringify(state.data)),resumeSeed=seed;
    for(const map of MAPS.filter(map=>map.reqLevel<=data.level)) {
      for(const [kind,enemy] of [['ordinary',map.monsters.at(-1)],['boss',map.boss]]) {
        if(kind==='boss'&&enemy.level>data.level)continue;
        let wins=0,turns=0;
        for(let attempt=0;attempt<100;attempt++) {seed=1000+attempt;const result=runCombat(stats,{...enemy,speed:enemy.speed??18},{...data,isCastleExplore:false},enemy);wins+=Number(result.victory);turns+=result.logs.at(-1).turn;}
        const reward=state.getExplorationReward(enemy.gold,kind==='boss'?enemy.crystal:2);
        report.economySamples.push({map:map.id,kind,characterLevel:data.level,samples:100,winPct:wins,meanTurns:turns/100,expPerTurn:enemy.exp*wins/turns,goldPerTurn:reward.gold*wins/turns,crystalPerTurn:reward.crystal*wins/turns,rewardsGranted:false});
      }
    }
    seed=resumeSeed;
    if(strategy==='longterm') {
      const startBattles=report.battles,startWait=report.waitingHours;
      report.longterm=[];
      ok(state.setPatrolMap(MAPS.filter(map=>map.reqLevel<=state.data.level).at(-1).id,now));
      for(let day=1;day<=30;day++) {
        waitDay();ok(state.claimIdleRewards(now));ok(state.harvestEstate(now));ok(state.claimSalary());ok(state.claimFactionSalary());
        // Earn daily bounties, meat and replacement gear through actual fights.
        for(let i=0;i<10;i++)hunt();
        const gate=DUNGEON_GATES[(day-1)%DUNGEON_GATES.length];check(dungeon(gate.id),'Post-story dungeon defeat');
        const cfg=DRAGON_TRIALS[(day-1)%DRAGON_TRIALS.length];check(dragon(cfg.id),'Post-story dragon defeat');
        const opponent=ARENA_OPPONENTS.at(-1),entry=ok(state.startArenaChallenge(opponent.id));
        check(fight(opponent,victory=>ok(state.settleArenaChallenge(opponent.id,entry.challengeId,victory)),false,true),'Post-story arena defeat');
        const stronghold=STRONGHOLDS.at(-1);ok(state.challengeStronghold(stronghold.id));
        check(fight(stronghold.defender,victory=>{if(victory)ok(state.completeStrongholdVictory(stronghold.id));}),'Post-story fortress defeat');
        for(const luxury of [false,true]) if(state.data.bag.some(item=>item.id===(luxury?'bait_luxury':'bait_normal')&&item.count>0))ok(state.fish(luxury));
        const potion=state.brewPotion('pot_dragonblood');if(!potion.success)check(state.data.estate.permanentPotionPoints===100,'Unreachable daily herb route');
        prepare();
        if(day%5===0)report.longterm.push({day,level:state.data.level,gold:state.data.gold,crystal:state.data.crystal,potionPoints:state.data.estate.permanentPotionPoints,food:state.data.bag.find(item=>item.id==='pet_food')?.count||0,petLevel:pet.level,petStamina:pet.stamina});
      }
      report.longtermCost={battles:report.battles-startBattles,waitingHours:report.waitingHours-startWait,allSevenGates:Object.keys(state.data.dungeon.clearedGates).length};
    }
    return report;
  } finally {
    Math.random = random; globalThis.Date = RealDate; state.notify = originalNotify;
    for (const [method, originalMethod] of accountingMethods) state[method] = originalMethod;
  }
}
