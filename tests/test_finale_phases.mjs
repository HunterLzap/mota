import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GameState } = await import('../js/core/state.js');
const { runCombat } = await import('../js/core/combat.js');
const { getTowerFloorData } = await import('../js/config/towerLevels.js');
const { PET_CONFIGS } = await import('../js/config/pets.js');
const { getBossTactics } = await import('../js/config/bossTactics.js');
const { naturalJourney } = await import('./natural_journey.mjs');
const { canRetryFinale, getJourneyGuidance } = await import('../js/core/journey.js');
const results = [], failures = [];
const earnedFixtures = {};
const boss = getTowerFloorData(100, 2);
function sample({ enemy = boss, resistance = 0, support = null, purify = true, stamina = 100,
  random = .5, stats: changes = {}, classId = 'warrior', castle = true } = {}) {
  const state = new GameState();
  Object.assign(state.data, { level: 85, classId, hasChosenClass: true, activePetId: 'golden_dragon',
    supportPetIds: [support, null], isCastleExplore: castle });
  if (classId === 'hunter') state.data.skillTraining.preferredAttackId = 'h_sk_6';
  state.data.pets = ['golden_dragon', support].filter(Boolean).map(id => ({
    id, tier: PET_CONFIGS[id].defaultTier, level: 30, exp: 0, stamina,
    apt: { ...PET_CONFIGS[id].defaultApt }, skills: purify && id === 'golden_dragon' ? ['book_purify'] : []
  }));
  const stats = { hp: 300000, maxHp: 300000, mp: 6000, maxMp: 6000, atk: 9500, def: 1500,
    speed: 160, hit: 100, crit: 0, dodge: 0, counter: 0, lifesteal: 0, magicResist: resistance, ...changes };
  const original = structuredClone(state.data), savedRandom = Math.random;
  try {
    Math.random = () => random;
    const combat = runCombat(stats, enemy, state.data, enemy);
    assert.deepEqual(state.data, original, 'Sampling mutated saved assets');
    return combat;
  } finally { Math.random = savedRandom; }
}
function test(name, callback) {
  try { callback(); console.log('PASS ' + name); }
  catch (error) { failures.push({ name, error: error.stack }); console.error('FAIL ' + name + ': ' + error.stack); }
}
const casts = (combat, name) => combat.logs.filter(log => log.abilityName === name && log.type !== 'warning');
test('two finite threshold spells warn at the real health boundary before a later enemy action', () => {
  const result = sample();
  for (const ability of boss.abilities.filter(ability => ability.hpThreshold)) {
    const warnings = result.logs.filter(log => log.phaseThreshold === ability.hpThreshold);
    assert.equal(warnings.length, 1);
    assert.ok(warnings[0].enemyHp > 0 && warnings[0].enemyHp <= boss.hp * ability.hpThreshold);
    const cast = casts(result, ability.name);
    assert.equal(cast.length, 1);
    assert.equal(cast[0].actor, 'enemy');
    assert.ok(cast[0].action >= warnings[0].dueEnemyAction && cast[0].time > warnings[0].time);
    assert.equal(cast[0].maxHpDamage, Math.floor(300000 * ability.maxHpDamageRatio));
  }
  assert.ok(result.victory);
});
test('percent component is not a critical multiplier; magic resistance reduces actual damage', () => {
  const plain = sample({ castle: false }), resisted = sample({ resistance: 60, castle: false });
  for (const ability of boss.abilities.filter(ability => ability.hpThreshold)) {
    const a = casts(plain, ability.name)[0], b = casts(resisted, ability.name)[0];
    assert.ok(a && b);
    assert.ok(b.damage < a.damage);
    assert.equal(a.maxHpDamage, b.maxHpDamage);
  }
  assert.ok(resisted.remainingHp > plain.remainingHp);
  const critical = sample({ enemy: { ...boss, crit: 100 } });
  for (const ability of boss.abilities.filter(ability => ability.hpThreshold)) {
    assert.equal(casts(critical, ability.name)[0].maxHpDamage, Math.floor(300000 * ability.maxHpDamageRatio));
  }
});
test('unicorn and purification provide alternate status counters; fatigue removes their protection', () => {
  const ordinary = sample({ purify: false });
  const unicorn = sample({ purify: false, support: 'unicorn' });
  const purified = sample();
  const tired = sample({ purify: true, support: 'unicorn', stamina: 59 });
  const afflicted = combat => combat.logs.some(log => /勇者陷入(重创|减速)/.test(log.message));
  assert.ok(afflicted(ordinary) && afflicted(tired));
  assert.ok(!afflicted(unicorn) && !afflicted(purified));
  assert.ok(unicorn.logs.some(log => log.message.includes('免疫重创')));
  assert.ok(purified.logs.some(log => log.message.includes('免疫减速')));
});
test('control consumes a threshold attempt and mana burn can prevent further spell preparation', () => {
  const controlled = sample({ classId: 'hunter', random: 0,
    stats: { atk: 3000, speed: 600 } });
  const phaseWarnings = controlled.logs.filter(log => log.phaseThreshold);
  assert.ok(phaseWarnings.length > 0);
  for (const warning of phaseWarnings) {
    assert.equal(controlled.logs.filter(log => log.phaseThreshold === warning.phaseThreshold).length, 1);
    assert.ok(controlled.logs.some(log => log.message.includes('施法中断') && log.message.includes(warning.abilityName)));
    assert.equal(casts(controlled, warning.abilityName).length, 0);
  }
  const burned = sample({ support: 'light_spirit' });
  assert.ok(burned.logs.some(log => log.message.includes('破魔')));
  assert.ok(burned.logs.filter(log => log.abilityName && log.actor === 'enemy').length <
    sample().logs.filter(log => log.abilityName && log.actor === 'enemy').length);
});
test('phase attempts stay bounded at timeout and no legacy encounter or stored field is changed', () => {
  const timeout = sample({ stats: { atk: 15, hp: 1e9, maxHp: 1e9, def: 1e9 } });
  assert.ok(timeout.timedOut && timeout.duration === 300);
  assert.ok(!timeout.logs.some(log => log.phaseThreshold));
  assert.equal(getTowerFloorData(100, 1).abilities.length, 1);
  assert.equal(getTowerFloorData(99, 2).abilities?.length || 0, 0);
  assert.match(getBossTactics(boss).join('\n'), /只尝试一次/);
});
test('three earned routes retain an ordinary way through and paired samples measure the added pressure', () => {
  for (const classId of ['warrior', 'mage', 'hunter']) {
    let earned, stats;
    const route = naturalJourney(classId, 406, (chapter, state) => {
      if (chapter.chapter !== 25) return;
      const effectiveStats = state.getEffectiveStats.bind(state);
      state.getEffectiveStats = function () {
        const current = effectiveStats();
        if (!earned && this.data.castle.isExploring && this.data.castle.floor === 100) {
          earned = structuredClone(this.data); stats = structuredClone(current);
        }
        return current;
      };
    });
    assert.equal(route.final.quest, 'completed');
    assert.ok(earned && stats, 'Actual earned final-encounter input was not captured');
    earnedFixtures[classId] = structuredClone(earned);
    const data = structuredClone(earned);
    const baseline = { ...boss, abilities: boss.abilities.filter(ability => !ability.hpThreshold) };
    const row = { classId, level: data.level, kind: 'actual earned final-encounter assets; paired sampling, no rewards',
      before: { wins: 0, hp: 0, revivals: 0 }, after: { wins: 0, hp: 0, revivals: 0 } };
    const original = Math.random;
    try {
      for (let seed = 1000; seed < 1100; seed++) {
        for (const [key, enemy] of [['before', baseline], ['after', boss]]) {
          let value = seed;
          Math.random = () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
          const combat = runCombat(stats, enemy, { ...data, isCastleExplore: true }, enemy);
          row[key].wins += Number(combat.victory);
          row[key].hp += combat.remainingHp / stats.maxHp;
          row[key].revivals += Number(combat.logs.some(log => log.message.includes('全满复活')));
        }
      }
    } finally { Math.random = original; }
    assert.ok(row.after.wins >= 80, 'Ordinary earned configuration lost a reliable route');
    results.push(row);
  }
});
test('an earned throne checkpoint permits bounded-scope retries without keys, daily resets or duplicate rewards', () => {
  const state = new GameState(); state.data = structuredClone(earnedFixtures.warrior);
  const oldExpedition = state.data.castle.expeditionId;
  assert.equal(state.startFinaleRetry().success, false);
  assert.ok(state.finishCastleExpedition(oldExpedition, 100).success);
  if (state.data.freeStatPoints > 0) assert.ok(state.allocateRecommendedStats().success);
  state.data.castle.entriesLeft = 0;
  state.data.bag = state.data.bag.filter(item => !item.id.startsWith('key_') && item.id !== 'royal_castle_permit');
  const before = structuredClone(state.data);
  assert.ok(canRetryFinale(state.data));
  assert.equal(getJourneyGuidance(state.data).action, 'retry_finale');
  const retry = state.startFinaleRetry();
  assert.ok(retry.success && retry.expeditionId !== oldExpedition);
  assert.equal(state.data.castle.floor, 100);
  assert.equal(state.data.castle.entriesLeft, 0);
  assert.equal(state.data.castle.accumulatedExp, 0);
  assert.equal(state.data.castle.accumulatedGold, 0);
  for (const key of ['gold', 'exp', 'level', 'crystal', 'bag', 'pets', 'equipped']) assert.deepEqual(state.data[key], before[key]);
  assert.equal(state.startFinaleRetry().success, false);
  assert.equal(state.settleCastleVictory(100, oldExpedition).success, false);
  const won = state.settleCastleVictory(100, retry.expeditionId);
  assert.ok(won.success);
  assert.equal(state.settleCastleVictory(100, retry.expeditionId).success, false);
  assert.ok(state.finishCastleExpedition(retry.expeditionId).success);
  assert.ok(!canRetryFinale(state.data));
  const after = structuredClone(state.data);
  assert.equal(state.startFinaleRetry().success, false);
  assert.deepEqual(state.data, after);
});
test('throne retry refuses premature, legacy, unclaimed and unsettled campaigns without asset changes', () => {
  for (const change of [
    data => { data.onboardingVersion = 1; },
    data => { data.castle.maxReachedFloor = 98; data.castle.floor = 99; },
    data => { data.level = 79; },
    data => { delete data.questProgress.quest_25; },
    data => { data.castle.accumulatedExp = 10; },
    data => { data.castle.accumulatedGold = 10; }
  ]) {
    const state = new GameState(); state.data = structuredClone(earnedFixtures.warrior);
    state.data.castle.isExploring = false;
    state.data.castle.accumulatedExp = state.data.castle.accumulatedGold = 0;
    change(state.data);
    const before = structuredClone(state.data);
    assert.equal(state.startFinaleRetry().success, false);
    assert.deepEqual(state.data, before);
  }
});
mkdirSync('output/playwright', { recursive: true });
writeFileSync('output/playwright/finale-phase-samples.json', JSON.stringify({ results, failures }, null, 2));
writeFileSync('output/playwright/finale-earned-fixtures.json', JSON.stringify(earnedFixtures, null, 2));
assert.deepEqual(failures, []);
