// Production-rule measurement. Clock advances represent elapsed patrol time;
// no levels, experience, resources or equipment are injected after creation.
import assert from 'node:assert/strict';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GameState } = await import('../js/core/state.js');
const { MAPS } = await import('../js/config/maps.js');
const { CLASSES } = await import('../js/config/classes.js');
const { ROYAL_TRIALS } = await import('../js/config/trials.js');
const { runCombat } = await import('../js/core/combat.js');
const { getTowerFloorData } = await import('../js/config/towerLevels.js');
const { DRAGON_TRIALS } = await import('../js/config/dragonSlaying.js');
let seed = 406;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const rows = [];
for (const classId of Object.keys(CLASSES)) {
  const state = new GameState();
  state.data.classId = classId;
  state.data.hasChosenClass = true;
  state.notify = () => {}; // Skip persistence/rendering only.
  let now = state.data.lastIdleClaimTime;
  let minutes = 0;
  for (const target of [20, 40, 60, 80, 100]) {
    while (state.data.level < target) {
      const map = MAPS.filter(m => m.reqLevel <= state.data.level).at(-1);
      if (state.data.currentMapId !== map.id) state.setPatrolMap(map.id, now);
      now += 60000;
      assert.equal(state.claimIdleRewards(now).success, true);
      minutes++;
      if (minutes > 100000) throw new Error('Growth cannot reach target');
    }
    const map = MAPS.filter(m => m.reqLevel <= state.data.level).at(-1);
    const rates = [];
    for (const enemy of [map.monsters[0], map.monsters.at(-1), map.boss]) {
      let wins = 0;
      let turns = 0;
      for (let attempt = 0; attempt < 40; attempt++) {
        const result = runCombat(state.getEffectiveStats(), { ...enemy, speed: enemy.speed ?? 18 }, state.data, enemy);
        wins += Number(result.victory);
        turns += result.logs.at(-1).turn;
      }
      rates.push({ enemy: enemy.name, winPct: wins * 2.5, meanTurns: +(turns / 40).toFixed(1) });
    }
    rows.push({ classId, level: state.data.level, elapsedHours: +(minutes / 60).toFixed(2),
      gold: state.data.gold, crystal: state.data.crystal, petLevel: state.data.pets[0]?.level ?? null, rates });
  }
}

const hunts = [];
for (const classId of Object.keys(CLASSES)) {
  const state = new GameState();
  state.data.classId = classId;
  state.data.hasChosenClass = true;
  state.notify = () => {};
  const primary = CLASSES[classId].primaryStat;
  let battles = 0;
  let losses = 0;
  let repairs = 0;
  let turns = 0;
  let foodUsed = 0;
  const promotionFailures = [];
  const bossSamples = [];
  let lastTrialLevel = 0;
  const checkpoints = [];
  const counterplaySamples = [];
  const dragonSamples = [];
  const score = item => Object.entries(item?.stats || {}).reduce((sum, [key, value]) =>
    sum + value * ({ atk: 3, def: 2, hp: 0.1, maxHp: 0.1, speed: 1, crit: 3, [primary]: 5 }[key] || 0), 0);
  while (state.data.level < 100 && battles < 25000) {
    const points = state.data.freeStatPoints;
    const health = Math.floor(points * 0.3);
    state.data.allocatedStats[primary] += points - health;
    state.data.allocatedStats.con += health;
    state.data.freeStatPoints = 0;
    for (const item of [...state.data.bag]) {
      if (item.slot && (item.reqLevel || 1) <= state.data.level && score(item) > score(state.data.equipped[item.slot])) state.equipItem(item.uid);
    }
    if (Object.values(state.data.equipped).some(item => item && item.durability < 20)) {
      if (state.repairAllEquipment().success) repairs++;
    }
    if (state.data.pets[0] && state.data.pets[0].stamina < 65 && state.feedPet(state.data.pets[0].id).success) foodUsed++;
    let won = false;
    const maps = MAPS.filter(map => map.reqLevel <= state.data.level).reverse();
    for (const map of maps) {
      for (let i = map.monsters.length - 1; i >= 0; i--) {
        const mob = map.monsters[i];
        const result = runCombat(state.getEffectiveStats(), { ...mob, speed: 18 }, state.data, mob);
        battles++;
        turns += result.logs.at(-1).turn;
        if (result.victory) {
          state.settleWildVictory(map.id, i);
          won = true;
        } else losses++;
        state.completeBattle();
        if (won) break;
      }
      if (won) break;
    }
    if (!won) throw new Error(`${classId} cannot defeat any unlocked monster at level ${state.data.level}`);
    for (const map of MAPS) {
      if (state.data.level < map.boss.level || bossSamples.some(sample => sample.map === map.id)) continue;
      let wins = 0;
      let bossTurns = 0;
      for (let attempt = 0; attempt < 40; attempt++) {
        const result = runCombat(state.getEffectiveStats(), map.boss, state.data, map.boss);
        wins += Number(result.victory);
        bossTurns += result.logs.at(-1).turn;
      }
      bossSamples.push({ map: map.id, level: state.data.level, promotionStage: state.data.royalTrials.completedStage,
        winPct: wins * 2.5, meanTurns: +(bossTurns / 40).toFixed(1) });
    }
    // Attempt each eligible trial once per level. Defeats grant no rewards.
    let stage = state.data.royalTrials.completedStage;
    let trial = ROYAL_TRIALS[stage];
    if (trial && trial.level <= state.data.level && trial.fameReq <= state.data.prestige && lastTrialLevel !== state.data.level) {
      lastTrialLevel = state.data.level;
      const result = runCombat(state.getEffectiveStats(), { ...trial.bossStats, speed: 18 }, state.data, { name: trial.bossName });
      battles++; turns += result.logs.at(-1).turn;
      if (result.victory) assert.equal(state.completeRoyalTrial(stage).success, true);
      else { losses++; promotionFailures.push({ stage: stage + 1, level: state.data.level }); }
      state.completeBattle();
    }
    for (const dragon of DRAGON_TRIALS) {
      if (state.data.level < dragon.minLevel || dragonSamples.some(sample => sample.dragonId === dragon.id)) continue;
      const earnedStats = state.getEffectiveStats(); const earnedData = JSON.parse(JSON.stringify(state.data)); const resumeSeed = seed;
      const variants = [];
      for (const enabled of [false, true]) {
        let wins = 0, totalTurns = 0, casts = 0;
        const enemy = enabled ? dragon : { ...dragon, abilities: [] };
        for (let sample = 0; sample < 200; sample++) {
          seed = 406 + sample;
          const result = runCombat(earnedStats, { ...enemy, speed: 20 }, { ...earnedData, isCastleExplore: false }, enemy);
          wins += Number(result.victory); totalTurns += result.logs.at(-1).turn;
          casts += result.logs.filter(log => log.message.includes('施展【' + dragon.abilities[0].name + '】')).length;
        }
        variants.push({ enabled, winPct: wins / 2, meanTurns: totalTurns / 200, meanCasts: casts / 200 });
      }
      seed = resumeSeed;
      dragonSamples.push({ dragonId: dragon.id, characterLevel: state.data.level, promotionStage: state.data.royalTrials.completedStage,
        variants, scenario: 'Frozen naturally earned character; 200 paired seeds without castle revival, sampled fights grant no rewards' });
    }
    for (const floor of [50, 60]) {
      if (state.data.level < floor || counterplaySamples.some(sample => sample.floor === floor)) continue;
      const tower = getTowerFloorData(floor);
      const earnedStats = state.getEffectiveStats();
      const earnedData = JSON.parse(JSON.stringify(state.data));
      const resumeSeed = seed;
      const variants = [];
      for (const enabled of [false, true]) {
        let wins = 0, totalTurns = 0, rebirths = 0, siphons = 0;
        const enemy = enabled ? tower : { ...tower, rebirth: null, abilities: [] };
        for (let sample = 0; sample < 200; sample++) {
          seed = 406 + sample;
          const result = runCombat(earnedStats, enemy, { ...earnedData, isCastleExplore: true }, enemy);
          wins += Number(result.victory); totalTurns += result.logs.at(-1).turn;
          rebirths += result.logs.filter(log => log.message.includes('首领重生')).length;
          siphons += result.logs.filter(log => log.message.includes('首领汲取')).length;
        }
        variants.push({ enabled, winPct: wins / 2, meanTurns: totalTurns / 200, meanRebirths: rebirths / 200, meanSiphons: siphons / 200 });
      }
      seed = resumeSeed;
      counterplaySamples.push({ floor, characterLevel: state.data.level, promotionStage: state.data.royalTrials.completedStage, pet: state.data.activePetId,
        scenario: 'Same naturally earned character, 200 paired seeds; sampled fights grant no rewards and use existing castle revival', variants });
    }
    for (const milestone of [20, 40, 60, 80, 100]) {
      if (state.data.level >= milestone && !checkpoints.some(row => row.level === milestone)) {
        const tower = getTowerFloorData(milestone);
        let towerWins = 0;
        for (let sample = 0; sample < 40; sample++) towerWins += Number(runCombat(state.getEffectiveStats(), tower, { ...state.data, isCastleExplore: true }, tower).victory);
        checkpoints.push({ level: milestone, battles, losses, turns, gold: state.data.gold, foodUsed, sameLevelTowerBossWinPct: towerWins * 2.5,
          foodLeft: state.data.bag.find(item => item.id === 'pet_food')?.count || 0, petLevel: state.data.pets[0]?.level ?? null, repairs });
      }
    }
  }
  assert.equal(state.data.level, 100, `${classId} did not reach the endpoint`);
  const economicSamples = [];
  const endgameDiagnostics = [];
  const samplingSeed = seed;
  const finalBoss = getTowerFloorData(100);
  const naturalStats = state.getEffectiveStats();
  const naturalData = JSON.parse(JSON.stringify(state.data));
  for (const [variant, overrides] of [['natural', {}], ['noCounter', { counter: 0 }], ['noDodge', { dodge: 0 }], ['noStartingMana', { mp: 0 }]]) {
    let wins = 0, turns = 0, dodges = 0, counters = 0, spells = 0, remainingMp = 0;
    for (let sample = 0; sample < 100; sample++) {
      seed = 406 + sample;
      const result = runCombat({ ...naturalStats, ...overrides }, finalBoss, { ...state.data, isCastleExplore: true }, finalBoss);
      wins += Number(result.victory); turns += result.logs.at(-1).turn; remainingMp += result.remainingMp;
      dodges += result.logs.filter(log => log.type === 'dodge' && log.message.includes(state.data.name)).length;
      counters += result.logs.filter(log => log.type === 'counter').length;
      spells += result.logs.filter(log => log.message.includes('施展【')).length;
    }
    endgameDiagnostics.push({ variant, winPct: wins, meanTurns: turns / 100, meanDodgeLogs: dodges / 100, meanCounterLogs: counters / 100, meanSkillLogs: spells / 100, meanRemainingMp: remainingMp / 100 });
  }
  seed = samplingSeed;
  for (const map of MAPS) {
    for (const [kind, enemy] of [['monster', map.monsters.at(-1)], ['boss', map.boss]]) {
      let wins = 0;
      let fightTurns = 0;
      for (let attempt = 0; attempt < 40; attempt++) {
        const result = runCombat(state.getEffectiveStats(), { ...enemy, speed: enemy.speed ?? 18 }, state.data, enemy);
        wins += Number(result.victory);
        fightTurns += result.logs.at(-1).turn;
      }
      const meanTurns = fightTurns / 40;
      economicSamples.push({ map: map.id, kind, level: state.data.level, winPct: wins * 2.5,
        meanTurns: +meanTurns.toFixed(2), goldPerTurn: +(enemy.gold * wins / fightTurns).toFixed(1),
        expPerTurn: +(enemy.exp * wins / fightTurns).toFixed(1) });
    }
  }
  const resourceRoute = [];
  for (const map of MAPS) {
    const result = runCombat(state.getEffectiveStats(), { ...map.boss, speed: map.boss.speed ?? 18 }, state.data, map.boss);
    assert.equal(result.victory, true, `${classId} cannot earn ${map.id} boss materials`);
    const reward = state.settleWildBossVictory(map.id);
    assert.equal(reward.success, true);
    state.completeBattle();
    resourceRoute.push({ map: map.id, material: reward.drop.id, count: reward.drop.count, gold: reward.gold, crystal: reward.crystal });
  }
  const beforeForgeGold = state.data.gold;
  assert.equal(state.reforgeEquipment('weapon', 'crystal_darkgold').success, true);
  assert.equal(beforeForgeGold - state.data.gold, 2000);
  const starCount = state.data.bag.find(item => item.id === 'star_crystal').count;
  state.enhanceEquipment('weapon', false);
  assert.equal(starCount - state.data.bag.find(item => item.id === 'star_crystal').count, 1);
  // Two genuine half-hour production batches; only elapsed clock is simulated.
  assert.equal(state.harvestEstate(state.data.estate.lastHarvestTime + 60 * 60000).success, true);
  assert.equal(state.brewPotion('pot_rage').success, true);
  const points = state.data.freeStatPoints;
  assert.equal(state.brewPotion('pot_dragonblood').success, true);
  assert.equal(state.data.freeStatPoints - points, 5);
  hunts.push({ classId, checkpoints, counterplaySamples, dragonSamples, promotionStage: state.data.royalTrials.completedStage, promotionFailures, bossSamples, economicSamples,
    resourceRoute, endgameDiagnostics, naturalStats, naturalData, earnedResourceActions: ['reforge', 'enhance', 'ragePotion', 'permanentPotentialPotion'] });
}
console.log(JSON.stringify({ passive: {
  scenario: 'Passive-only new saves; starting gear, no stat allocation, no promotion or quests. Combat samples do not grant rewards.', rows
}, active: {
  scenario: 'Active-only fresh saves: allocate earned points (70% primary/30% constitution), equip earned loot, repair with earned gold, feed owned food and attempt eligible promotions. No quests or injected resources; all rewards use production settlement.', hunts
} }, null, 2));
