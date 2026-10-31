import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GameState } = await import('../js/core/state.js');
const { runCombat } = await import('../js/core/combat.js');
const { getTowerFloorData } = await import('../js/config/towerLevels.js');
const { PET_CONFIGS } = await import('../js/config/pets.js');
const { getBossTactics } = await import('../js/config/bossTactics.js');
const { MERCENARIES } = await import('../js/config/estate.js');
const { naturalJourney } = await import('./natural_journey.mjs');
const boss = getTowerFloorData(100, 2), failures = [], samples = [];
let recovery = null;
function test(name, callback) {
  try { callback(); console.log('PASS ' + name); }
  catch (error) { failures.push({ name, error: error.stack }); console.error('FAIL ' + name + ': ' + error.stack); }
}
function fixture({ support = null, stamina = 100, classId = 'warrior' } = {}) {
  const state = new GameState();
  Object.assign(state.data, { level: 85, classId, hasChosenClass: true, activePetId: 'golden_dragon',
    supportPetIds: [support, null], isCastleExplore: true });
  if (classId === 'hunter') state.data.skillTraining.preferredAttackId = 'h_sk_6';
  state.data.pets = ['golden_dragon', support].filter(Boolean).map(id => ({
    id, tier: PET_CONFIGS[id].defaultTier, level: 30, exp: 0, stamina,
    apt: { ...PET_CONFIGS[id].defaultApt }, skills: []
  }));
  return state.data;
}
const stats = { hp: 300000, maxHp: 300000, mp: 6000, maxMp: 6000, atk: 9500, def: 1500,
  speed: 160, hit: 100, crit: 0, dodge: 0, counter: 0, lifesteal: 0 };
function fight({ enemy = boss, data = fixture(), changes = {}, random = .5 } = {}) {
  const original = Math.random, before = structuredClone(data);
  try {
    Math.random = typeof random === 'function' ? random : () => random;
    const result = runCombat({ ...stats, ...changes }, enemy, data, enemy);
    assert.deepEqual(data, before, 'Combat mutated saved assets');
    return result;
  } finally { Math.random = original; }
}
const echoes = result => result.logs.filter(log => log.phaseEcho);
test('range breath has an explicit accuracy floor while dodging, legacy and ordinary attacks remain valid', () => {
  const result = fight({ enemy: { ...boss, dodge: 0 }, changes: { dodge: 100 }, random: .75 });
  for (const ability of boss.abilities.filter(ability => ability.hpThreshold)) {
    assert.ok(result.logs.some(log => log.abilityName === ability.name && log.maxHpDamage > 0));
  }
  assert.ok(result.logs.some(log => log.actor === 'enemy' && log.type === 'dodge'));
  const dodged = fight({ enemy: { ...boss, dodge: 0 }, changes: { dodge: 100 }, random: .9 });
  assert.ok(!dodged.logs.some(log => log.maxHpDamage > 0));
  const legacy = fight({ enemy: { ...getTowerFloorData(100, 1), dodge: 0 }, changes: { dodge: 100 }, random: .75 });
  assert.equal(echoes(legacy).length, 0);
  assert.ok(legacy.logs.some(log => log.actor === 'enemy' && log.type === 'dodge'));
});
test('each cast arms at most two later action echoes, spends real finite mana and never adds an enemy action', () => {
  const result = fight();
  for (const ability of boss.abilities.filter(ability => ability.hpThreshold)) {
    const cast = result.logs.find(log => log.abilityName === ability.name && log.maxHpDamage > 0);
    const pulses = echoes(result).filter(log => log.sourceAbilityName === ability.name);
    assert.equal(pulses.length, 2);
    assert.ok(pulses.every(log => log.time > cast.time && log.actor === 'player'));
    assert.deepEqual(pulses.map(log => log.echoesLeft), [1, 0]);
    assert.ok(pulses.every(log => log.echoMaxHpDamage === 6000 && log.manaSpent === 100));
    assert.equal(new Set(pulses.map(log => log.action)).size, 2);
  }
  assert.ok(result.victory);
  assert.equal(result.actionCounts.enemy, fight({ enemy: { ...boss,
    abilities: boss.abilities.map(ability => ({ ...ability, echoes: null })) } }).actionCounts.enemy);
  const lowMana = fight({ enemy: { ...boss, mp: 550, maxMp: 550,
    abilities: boss.abilities.filter(ability => ability.hpThreshold) } });
  assert.ok(echoes(lowMana).length > 0 && echoes(lowMana).length < 4);
  assert.ok(echoes(lowMana).every(log => log.enemyMp >= 0));
});
test('resistance and guardian mitigate real echoes; purification only counters the attached statuses', () => {
  const data = fixture(); data.isCastleExplore = false;
  const plain = fight({ data }), resisted = fight({ data, changes: { magicResist: 60, dmgResist: 20 } });
  assert.ok(echoes(plain).length > 0);
  for (let i = 0; i < echoes(plain).length; i++) assert.ok(echoes(resisted)[i].damage < echoes(plain)[i].damage);
  const purified = fixture(); purified.pets[0].skills = ['book_purify'];
  assert.equal(echoes(fight({ data: purified }))[0].damage, echoes(plain)[0].damage);
  const guarded = fixture(); guarded.estate.hiredMercId = 'merc_paladin';
  assert.ok(echoes(fight({ data: guarded }))[0].damage < echoes(plain)[0].damage);
  assert.ok(resisted.remainingHp > plain.remainingHp);
});
test('control and mana burn extinguish remaining echoes; tired and unowned supports cannot counter', () => {
  const fireOnly = { ...boss, abilities: boss.abilities.filter(ability => ability.hpThreshold) };
  const controlled = fight({ enemy: fireOnly, data: fixture({ classId: 'hunter' }), random: 0 });
  assert.ok(controlled.logs.some(log => log.phaseThreshold));
  assert.ok(echoes(controlled).length < echoes(fight({ enemy: fireOnly })).length);
  const burned = fight({ enemy: fireOnly, data: fixture({ support: 'light_spirit' }) });
  assert.ok(burned.logs.some(log => log.message.includes('破魔')));
  assert.ok(echoes(burned).length < echoes(fight({ enemy: fireOnly })).length);
  const unowned = fixture(); unowned.supportPetIds = ['light_spirit', null];
  assert.equal(echoes(fight({ enemy: fireOnly, data: unowned })).length, echoes(fight({ enemy: fireOnly })).length);
  const tired = fixture({ support: 'light_spirit' }); tired.pets[1].stamina = 59;
  assert.equal(echoes(fight({ enemy: fireOnly, data: tired })).length, echoes(fight({ enemy: fireOnly })).length);
  let draws = 0;
  const lateControl = fight({ enemy: fireOnly, data: fixture({ classId: 'hunter' }),
    random: () => draws++ < 85 ? .5 : 0 });
  const armed = lateControl.logs.findIndex(log => log.message.includes('余烬预警'));
  const extinguished = lateControl.logs.findIndex(log => log.message.includes('控制打断龙皇引导'));
  assert.ok(armed >= 0 && extinguished > armed, 'Control never extinguished an already armed echo');
  assert.equal(echoes(lateControl).length, 0);
});
test('mana absorption uses actual echo damage after mitigation and never restores more than missing mana', () => {
  const result = fight({ changes: { mp: 0, maxMp: 1000000, magicAbsorb: 30, magicResist: 60 } });
  const pulses = echoes(result);
  assert.ok(pulses.length > 0);
  for (const pulse of pulses) {
    const restored = result.logs[result.logs.indexOf(pulse) + 1];
    assert.equal(restored.manaRestored, Math.floor(pulse.damage * .3));
    assert.match(restored.message, /余烬伤害转化/);
  }
  const capped = fight({ changes: { mp: 1, maxMp: 1, magicAbsorb: 300 } });
  assert.ok(capped.remainingMp <= 1);
  assert.ok(capped.logs.filter(log => log.manaRestored).every(log => log.manaRestored <= 1));
});
test('lethal echoes honor one castle revival; death, victory and timeout cannot generate lingering damage', () => {
  const data = fixture(); data.pets = []; data.activePetId = null;
  const enemy = { ...boss, hp: 200000, maxHp: 200000, openingShield: 0, atk: 15, def: 0, speed: 100, crit: 0, dodge: 0,
    abilities: [{ name: 'Echo survival fixture', interval: 2, hpThreshold: .99, mpCost: 250, multiplier: .001,
      damageType: 'magic', echoes: { charges: 2, maxHpDamageRatio: .6, mpCost: 100 } }] };
  const result = fight({ enemy, data, changes: { hp: 10000, maxHp: 10000, atk: 5000, def: 10000 } });
  const lethal = result.logs.findIndex(log => log.phaseEcho && log.playerHp === 0);
  assert.ok(lethal >= 0, 'Fixture never took a lethal echo');
  assert.match(result.logs[lethal + 1].message, /全满复活/);
  assert.equal(result.logs[lethal + 1].playerHp, 10000);
  assert.equal(result.logs.filter(log => log.message.includes('全满复活')).length, 1);
  const withoutRevival = fight({ enemy, data: { ...data, isCastleExplore: false },
    changes: { hp: 10000, maxHp: 10000, atk: 5000, def: 10000 } });
  assert.equal(withoutRevival.victory, false);
  assert.equal(withoutRevival.logs.at(-2).playerHp, 0);
  assert.equal(result.logs.at(-1).type, 'end');
  assert.ok(!result.logs.some(log => log.phaseEcho && log.enemyHp <= 0));
  const timeout = fight({ changes: { hp: 1e9, maxHp: 1e9, atk: 15, def: 1e9 } });
  assert.ok(timeout.timedOut && timeout.duration === 300 && !echoes(timeout).length);
  assert.match(getBossTactics(boss).join('\n'), /命中至少85%/);
  assert.match(getBossTactics(boss).join('\n'), /余烬/);
});
test('earned three-class alternate builds compare 100 paired seeds without rewards or save mutation', () => {
  const earned = {};
  for (const classId of ['warrior', 'mage', 'hunter']) for (const build of ['balanced', 'assault', 'ward']) {
    const route = naturalJourney(classId, 406, (chapter, state) => {
      if (chapter.chapter !== 25) return;
      const effective = state.getEffectiveStats.bind(state);
      state.getEffectiveStats = function () {
        const current = effective();
        if (!earned[classId + ':' + build] && this.data.castle.isExploring && this.data.castle.floor === 100) {
          earned[classId + ':' + build] = structuredClone(this.data);
        }
        return current;
      };
    }, 'ordinary', null, 2, { skillBuild: build, partyBuild: build === 'balanced' ? 'solo' : build });
    assert.equal(route.final.quest, 'completed');
  }
  const beforeBoss = { ...boss, abilities: boss.abilities.map(ability => ({
    ...ability, minHitChance: 0, echoes: null
  })) };
  for (const [key, data] of Object.entries(earned)) {
    const [classId, build] = key.split(':');
    const state = new GameState(); state.data = structuredClone(data);
    const effective = state.getEffectiveStats();
    const row = { classId, build, before: { wins: 0, hp: 0, minHp: 0, revivals: 0 },
      after: { wins: 0, hp: 0, minHp: 0, revivals: 0, echoes: 0 } };
    const original = Math.random;
    try {
      for (let seed = 1000; seed < 1100; seed++) for (const [key, enemy] of [['before', beforeBoss], ['after', boss]]) {
        let value = seed;
        Math.random = () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
        const result = runCombat(effective, enemy, { ...data, isCastleExplore: true }, enemy);
        row[key].wins += Number(result.victory);
        row[key].hp += result.remainingHp / effective.maxHp;
        row[key].minHp += Math.min(...result.logs.map(log => log.playerHp)) / effective.maxHp;
        row[key].revivals += Number(result.logs.some(log => log.message.includes('全满复活')));
        if (key === 'after') row.after.echoes += echoes(result).length;
      }
    } finally { Math.random = original; }
    assert.ok(row.after.wins >= 80, 'An ordinary earned class lost its reliable route');
    samples.push(row);
  }
  assert.ok(samples.filter(row => row.classId !== 'warrior' && row.build === 'balanced')
    .every(row => row.after.minHp < row.before.minHp),
    'Pressure failed to reach the previously easy classes');
});
test('an earned assault route can purchase a real spell counter without changing gear, points or waiting', () => {
  let checkpoint;
  const route = naturalJourney('warrior', 406, (chapter, state) => {
    if (chapter.chapter !== 25) return;
    const effective = state.getEffectiveStats.bind(state);
    state.getEffectiveStats = function () {
      const current = effective();
      if (this.data.castle.isExploring && this.data.castle.floor === 100) checkpoint = structuredClone(this.data);
      return current;
    };
  }, 'ordinary', null, 2, { commissionBuild: 'assault' });
  assert.equal(route.final.quest, 'completed');
  const state = new GameState(); state.data = structuredClone(checkpoint);
  const quote = state.getContractChoices().find(choice => choice.id === 'light_spirit');
  assert.ok(quote, 'No earned egg or affordable counter was available');
  const eggs = data => data.bag.filter(item => item.type === 'egg').reduce((sum, item) => sum + item.count, 0);
  assert.ok(state.hatchPetEgg('light_spirit').success);
  assert.ok(state.setPetPartySlot(1, 'light_spirit').success);
  assert.equal(state.data.gold, checkpoint.gold - quote.gold);
  assert.equal(state.data.crystal, checkpoint.crystal - quote.crystal);
  assert.equal(eggs(state.data), eggs(checkpoint) - 1);
  const guard = MERCENARIES.find(mercenary => mercenary.id === 'merc_paladin');
  assert.ok(state.hireMercenary(guard.id).success);
  assert.equal(state.data.gold, checkpoint.gold - quote.gold - guard.hireCostGold);
  assert.equal(route.waitingHours, 0);
  for (const key of ['level', 'exp', 'classId', 'allocatedStats', 'skillTraining', 'equipped']) {
    assert.deepEqual(state.data[key], checkpoint[key], 'Recovery reset ' + key);
  }
  const measure = data => {
    const original = Math.random, fighter = new GameState(); fighter.data = structuredClone(data);
    const effective = fighter.getEffectiveStats();
    const sample = { wins: 0, casts: 0, echoes: 0 };
    try {
      for (let seed = 1000; seed < 1100; seed++) {
        let value = seed;
        Math.random = () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
        const result = runCombat(effective, boss, { ...data, isCastleExplore: true }, boss);
        sample.wins += Number(result.victory);
        sample.casts += result.logs.filter(log => log.maxHpDamage > 0).length;
        sample.echoes += echoes(result).length;
      }
    } finally { Math.random = original; }
    return sample;
  };
  const tired = structuredClone(state.data);
  tired.pets.find(pet => pet.id === 'light_spirit').stamina = 59;
  const withoutBurn = structuredClone(state.data);
  withoutBurn.supportPetIds = [null, null];
  const comparison = { before: measure(checkpoint), after: measure(state.data), tired: measure(tired), guardOnly: measure(withoutBurn) };
  recovery = { before: comparison.before.wins, after: comparison.after.wins, tired: comparison.tired.wins,
    guardOnly: comparison.guardOnly.wins, comparison, gold: quote.gold + guard.hireCostGold, crystal: quote.crystal,
    egg: 1, lossesInOriginalRoute: route.losses };
  assert.ok(recovery.after >= 80 && recovery.after >= recovery.before);
  assert.deepEqual(comparison.tired, comparison.guardOnly, 'A tired counter bypassed stamina requirements');
  // All relics now arrive through production settlement, so wins can saturate.
  // The paid counter must still prevent actual spells and their echoes.
  assert.ok(comparison.after.casts < comparison.guardOnly.casts, 'The purchased active counter did not prevent spells');
  assert.ok(comparison.after.echoes < comparison.guardOnly.echoes, 'The purchased active counter did not prevent echoes');
  mkdirSync('output/playwright', { recursive: true });
  writeFileSync('output/playwright/finale-pressure-recovery-fixture.json', JSON.stringify(checkpoint, null, 2));
});
mkdirSync('output/playwright', { recursive: true });
writeFileSync('output/playwright/finale-pressure-samples.json', JSON.stringify({ samples, recovery, failures }, null, 2));
assert.deepEqual(failures, []);
