import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
};
const { GameState } = await import('../js/core/state.js');
const { CLASSES } = await import('../js/config/classes.js');
const { runCombat, getPlayerActionInterval } = await import('../js/core/combat.js');
const { getTowerFloorData } = await import('../js/config/towerLevels.js');
const { storage } = await import('../js/core/storage.js');
const { naturalJourney } = await import('./natural_journey.mjs');
const { ALCHEMY_RECIPES } = await import('../js/config/estate.js');
const scaling = CLASSES.hunter.dexterityScaling;
assert.deepEqual(scaling, { atk: 1.3, speed: 0.65, crit: 0.055, dodge: 0.04 });
assert.equal(CLASSES.hunter.baseActionInterval, 10);

const passiveState = new GameState();
passiveState.data.classId = 'hunter';
passiveState.data.hasChosenClass = true;
passiveState.data.onboardingVersion = 2;
passiveState.data.allocatedStats.dex = 10;
const passiveStats = passiveState.getEffectiveStats();
const passiveDex = CLASSES.hunter.skills.find(skill => skill.id === 'h_sk_2').effect.dexBonus;
assert.equal(passiveStats.crit, Math.floor(CLASSES.hunter.baseStats.crit + (10 + passiveDex) * scaling.crit),
  'Passive dexterity must provide the same critical chance as allocated dexterity');
assert.equal(passiveStats.dodge, Math.floor(CLASSES.hunter.baseStats.dodge + (10 + passiveDex) * scaling.dodge),
  'Passive dexterity must provide the same dodge chance as allocated dexterity');
console.log('PASS passive dexterity includes critical and dodge benefits at rounding boundaries');

const state = new GameState();
state.data.classId = 'hunter';
state.data.hasChosenClass = true;
state.data.onboardingVersion = 2;
const base = state.getEffectiveStats();
const expectDex = (actual, amount, enhanced = amount) => {
  for (const [key, quantity] of Object.entries({ atk: enhanced, speed: enhanced, crit: amount, dodge: amount })) {
    const delta = actual[key] - base[key];
    assert.ok(Math.abs(delta - quantity * scaling[key]) < 1.00001, `${key}: ${delta} from ${quantity} dexterity`);
  }
};
state.data.allocatedStats.dex = 100;
expectDex(state.getEffectiveStats(), 100);
state.data.allocatedStats.dex = 0;
state.data.equipped.weapon = { uid: 'scaled_gear', id: 'scaled_gear', slot: 'weapon', reqClass: 'hunter',
  reqLevel: 1, durability: 100, maxDurability: 100, stats: { dex: 100 }, stars: 2, gems: [] };
expectDex(state.getEffectiveStats(), 100, 124);
state.data.equipped.weapon.stars = 0;
state.data.equipped.weapon.stats = {};
state.data.equipped.weapon.gems = [{ id: 'dex_rune', stats: { agi: 100 } }];
expectDex(state.getEffectiveStats(), 100);
state.data.equipped.weapon.gems = [];
state.data.equipped.weapon.reforge = { stat: 'allStats', val: 100 };
const all = state.getEffectiveStats();
assert.ok(Math.abs(all.atk - base.atk - 590) < 1);
assert.ok(Math.abs(all.speed - base.speed - 65) < 1);
assert.equal(all.maxHp - base.maxHp, 1600);
assert.equal(all.maxMp - base.maxMp, 800);
state.data.equipped.weapon.reforge = null;
state.data.skillTraining = { ranks: { h_sk_2: 10 }, preferredAttackId: null };
const trained = state.getEffectiveStats();
assert.ok(Math.abs(trained.atk - base.atk - 15 * 0.18 * scaling.atk) < 1);
assert.ok(Math.abs(trained.speed - base.speed - (5 + 15 * scaling.speed) * 0.18) < 1);
const beforeRead = JSON.stringify(state.data);
state.getEffectiveStats(); state.getEquipmentPreview('missing');
assert.equal(JSON.stringify(state.data), beforeRead);
console.log('PASS allocation, enhanced gear, agi rune, all-stat reforge and passive use shared hunter scaling; preview is read-only');

const frozen = [];
naturalJourney('hunter', 406, (row, route) => {
  if ([10, 13, 20, 25].includes(row.chapter)) frozen.push({ chapter: row.chapter, data: structuredClone(route.data) });
});
const rows = [];
for (const checkpoint of frozen) {
  const state = new GameState();
  state.data = structuredClone(checkpoint.data);
  const enemy = getTowerFloorData(checkpoint.chapter === 25 ? 100 : checkpoint.chapter === 20 ? 50 : checkpoint.chapter === 13 ? 30 : 10, 2);
  const legacy = { atk: 2.6, speed: 1.3, crit: 0.22, dodge: 0.16 };
  for (const [name, coefficients] of [
    ['legacy_coefficients', legacy],
    ['attack_only', { ...legacy, atk: scaling.atk }],
    ['speed_only', { ...legacy, speed: scaling.speed }],
    ['crit_dodge_only', { ...legacy, crit: scaling.crit, dodge: scaling.dodge }],
    ['current', scaling]
  ]) {
    CLASSES.hunter.dexterityScaling = coefficients;
    const stats = state.getEffectiveStats();
    const originalRandom = Math.random;
    let wins = 0, seconds = 0, actions = 0;
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        let seed = 1000 + attempt;
        Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
        const result = runCombat(stats, enemy, { ...state.data, isCastleExplore: true }, enemy);
        wins += Number(result.victory); seconds += result.duration; actions += result.actionCounts.enemy;
      }
    } finally { Math.random = originalRandom; CLASSES.hunter.dexterityScaling = scaling; }
    rows.push({ chapter: checkpoint.chapter, variant: name, wins, meanSeconds: +(seconds / 100).toFixed(2),
      meanEnemyActions: actions / 100, interval: +getPlayerActionInterval(stats, state.data).toFixed(2), stats });
  }
  const old = rows.find(row => row.chapter === checkpoint.chapter && row.variant === 'legacy_coefficients');
  const current = rows.at(-1);
  assert.ok(current.meanSeconds > old.meanSeconds, 'Same frozen build must no longer erase the encounter as quickly');
  assert.ok(current.wins >= 80, 'Existing earned build must remain viable');
  if (checkpoint.chapter === 25) assert.ok(current.meanEnemyActions >= 3);
}
mkdirSync('output/playwright', { recursive: true });
const allocations = [];
for (const target of ['dex', 'str', 'int']) {
  const candidate = new GameState();
  candidate.data = structuredClone(frozen.at(-1).data);
  if (target !== 'dex') {
    candidate.data.allocatedStats[target] += candidate.data.allocatedStats.dex;
    candidate.data.allocatedStats.dex = 0;
  }
  const stats = candidate.getEffectiveStats(), enemy = getTowerFloorData(100, 2);
  let wins = 0, seconds = 0;
  const originalRandom = Math.random;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      let seed = 1000 + attempt;
      Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
      const result = runCombat(stats, enemy, { ...candidate.data, isCastleExplore: true }, enemy);
      wins += Number(result.victory); seconds += result.duration;
    }
  } finally { Math.random = originalRandom; }
  allocations.push({ allocation: target, wins, meanSeconds: +(seconds / 100).toFixed(2) });
  assert.ok(wins >= 80, 'Reasonable alternate allocation must remain viable');
}
assert.ok(allocations[0].meanSeconds < allocations[1].meanSeconds && allocations[0].meanSeconds < allocations[2].meanSeconds,
  'Hunter dexterity must remain worthwhile against the frozen final encounter');
writeFileSync('output/playwright/hunter-growth-frozen.json', JSON.stringify({
  kind: 'paired frozen character, equipment, enemy and 100 RNG seeds; coefficients are counterfactuals; no rewards',
  coefficients: scaling, rows, allocations
}, null, 2));
console.log('PASS four frozen progression checkpoints x five coefficient variants x 100 matched battle seeds');
console.log('PASS dexterity remains faster than transferring the same earned potential into strength or intellect in the frozen final encounter');

// Only the in-memory storage above is used. Existing character assets are retained.
const oldSave = JSON.parse(JSON.stringify(frozen.at(-1).data));
delete oldSave.skillTraining; delete oldSave.supportPetIds;
oldSave.estate.activePotions = [{ ...structuredClone(ALCHEMY_RECIPES.find(recipe => recipe.id === 'pot_titan')), remainingFights: 2 }];
storage.parseBackupText(JSON.stringify({ saveData: oldSave }));
for (let slot = 1; slot <= 5; slot++) storage.saveToSlot(slot, { ...oldSave, name: `Legacy ${slot}` });
storage.setActiveSlotId(3);
const otherSlots = [1, 2, 4, 5].map(slot => values.get('MOTA_WORLD_SAVE_SLOT_' + slot));
const migrated = new GameState(); migrated.loadOrInit();
for (const key of ['gold', 'crystal', 'prestige', 'bag', 'pets', 'equipped', 'allocatedStats', 'classId', 'level', 'estate']) {
  assert.deepEqual(migrated.data[key], oldSave[key], 'Migration changed asset ' + key);
}
assert.deepEqual(migrated.data.supportPetIds, [null, null]);
const once = structuredClone(migrated.data);
const again = new GameState(); again.loadOrInit();
assert.deepEqual(again.data, once);
assert.deepEqual([1, 2, 4, 5].map(slot => values.get('MOTA_WORLD_SAVE_SLOT_' + slot)), otherSlots);
console.log('PASS legacy hunter assets, allocation and all five slots retained; only effective stats change; reload is idempotent');
