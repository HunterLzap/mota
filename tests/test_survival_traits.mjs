import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
};
const { runCombat } = await import('../js/core/combat.js');
const { PET_CONFIGS } = await import('../js/config/pets.js');
const { GameState } = await import('../js/core/state.js');
const { storage } = await import('../js/core/storage.js');
const { STORY_QUEST_LIST } = await import('../js/config/quests.js');
const pet = (id, stamina = 100) => ({
  id, stamina, level: 45, exp: 17, tier: PET_CONFIGS[id].defaultTier,
  apt: { ...PET_CONFIGS[id].defaultApt }, skills: []
});
function fight({ ids = ['phoenix'], roll = 0.1, player = {}, enemy = {}, data = {}, encounter = {} } = {}) {
  const random = Math.random;
  Math.random = typeof roll === 'function' ? roll : () => roll;
  try {
    const stats = { hp: 1, maxHp: 100, mp: 0, maxMp: 0, atk: 15, def: 0,
      speed: 0, crit: 0, dodge: 0, hit: 100, counter: 0, lifesteal: 0 };
    return runCombat({ ...stats, ...player }, { ...stats, hp: 1000000, maxHp: 1000000, atk: 1000, speed: 300, ...enemy },
      { name: 'Hero', classId: 'warrior', onboardingVersion: 2, level: 1, pets: ids.map(id => pet(id)),
        activePetId: null, supportPetIds: [ids[0] ?? null, ids[1] ?? null], equipped: {}, estate: {}, ...data },
      { name: 'Guard', ...encounter });
  } finally { Math.random = random; }
}
const revivals = result => result.logs.filter(log => log.message.includes('凤凰·涅槃'));
const feigns = result => result.logs.filter(log => log.message.includes('小妖精·假死'));
let failures = 0;
function test(name, run) {
  try { run(); console.log('PASS ' + name); }
  catch (error) { failures++; console.error('FAIL ' + name + '\n' + error.stack); }
}

test('phoenix uses the documented 30 percent roll and restores 20 percent health exactly once', () => {
  const success = fight({ roll: 0.29999 });
  assert.equal(revivals(success).length, 1);
  assert.equal(revivals(success)[0].playerHp, 20);
  assert.equal(revivals(fight({ roll: 0.3 })).length, 0);
  assert.equal(revivals(fight({ roll: 0.49 })).length, 0);
  assert.equal(revivals(fight()).length, 1);
});
test('fractional phoenix recovery always restores at least one living health point', () => {
  const result = fight({ player: { hp: 1, maxHp: 1 } });
  assert.equal(revivals(result)[0].playerHp, 1);
});
test('pixie rolls below 50 percent on every lethal direct attack and still obeys the combat timeout', () => {
  const result = fight({ ids: ['pixie'], roll: 0.49999 });
  assert.ok(feigns(result).length > 2);
  assert.ok(feigns(result).every(log => log.playerHp === 1));
  assert.equal(result.duration, 300);
  assert.equal(result.timedOut, true);
  assert.equal(result.victory, false);
  assert.equal(feigns(fight({ ids: ['pixie'], roll: 0.5 })).length, 0);
});
test('pixie also protects against a lethal enemy counterattack without consuming a personal action', () => {
  const result = fight({ ids: ['pixie'], roll: 0.4, player: { speed: 40000 }, enemy: { speed: 0, counter: 100 } });
  const savedCounter = result.logs.find(log => log.type === 'counter' && log.playerHp === 1);
  assert.ok(savedCounter);
  assert.ok(feigns(result).some(log => log.actor === 'player'));
  assert.ok(result.actionCounts.player > result.actionCounts.enemy);
});
test('nonlethal attacks do not invoke pixie and direct spell hits use the same lethal guard', () => {
  const safe = fight({ ids: ['pixie'], roll: 0.4, player: { hp: 100000, maxHp: 100000 }, enemy: { atk: 15 } });
  assert.equal(feigns(safe).length, 0);
  const spell = fight({ ids: ['pixie'], roll: 0.4, player: { hp: 100, maxHp: 100 }, enemy: { atk: 15, mp: 10, maxMp: 10 },
    encounter: { abilities: [{ name: 'Lethal spell', interval: 2, mpCost: 10, multiplier: 100 }] } });
  assert.ok(feigns(spell).some(log => log.action === 2 && log.actor === 'enemy'));
});
test('poison bypasses pixie; phoenix may revive once from poison and then remains spent', () => {
  const options = { player: { hp: 100, maxHp: 100 }, enemy: { atk: 15, mp: 10, maxMp: 10 },
    encounter: { abilities: [{ name: 'Venom', interval: 2, mpCost: 10, multiplier: 1, statuses: [{ type: 'poison', rate: 100, duration: 2 }] }] } };
  const poison = fight({ ...options, ids: ['pixie'], roll: 0.4 });
  assert.equal(feigns(poison).length, 0);
  assert.ok(poison.logs.some(log => log.type === 'poison' && log.playerHp === 0));
  const restored = fight({ ...options, ids: ['phoenix', 'pixie'], roll: 0.1 });
  assert.equal(revivals(restored).length, 1);
  assert.equal(revivals(restored)[0].playerHp, 20);
  assert.equal(restored.remainingHp, 0);
});
test('fatigue, ownership and repeated slot references cannot grant survival traits', () => {
  for (const id of ['phoenix', 'pixie']) {
    const tired = fight({ ids: [id], data: { pets: [pet(id, 59)] } });
    const unowned = fight({ ids: [id], data: { pets: [] } });
    for (const result of [tired, unowned]) {
      assert.equal(revivals(result).length + feigns(result).length, 0);
      assert.equal(result.remainingHp, 0);
    }
  }
  const duplicate = fight({ ids: ['phoenix'], data: { activePetId: 'phoenix', supportPetIds: ['phoenix', 'phoenix'] } });
  assert.equal(revivals(duplicate).length, 1);
});
test('phoenix fails once before the separate castle revival and cannot rearm after it', () => {
  const result = fight({ roll: 0.4, data: { isCastleExplore: true } });
  assert.equal(revivals(result).length, 0);
  assert.equal(result.logs.filter(log => log.message.includes('古堡庇佑')).length, 1);
  assert.equal(result.remainingHp, 0);
});
test('a failed pixie roll can fall through to phoenix on the same lethal hit without rearming either action', () => {
  const rolls = [0.6, 0.6, 0.6, 0.6, 0.1];
  const result = fight({ ids: ['pixie', 'phoenix'], roll: () => rolls.shift() ?? 0.6 });
  assert.equal(feigns(result).length, 0);
  assert.equal(revivals(result).length, 1);
  assert.equal(revivals(result)[0].playerHp, 20);
  assert.equal(result.remainingHp, 0);
});
test('five legacy slots and backup reloads retain all owned survival companions and assets without a schema rewrite', () => {
  for (let slot = 1; slot <= 5; slot++) {
    const state = new GameState();
    Object.assign(state.data, { hasChosenClass: true, level: 50, gold: 10000 + slot, crystal: 500 + slot,
      pets: [pet('phoenix'), pet('pixie'), pet('silver_dragon')], activePetId: 'silver_dragon', supportPetIds: ['phoenix', 'pixie'] });
    storage.saveToSlot(slot, state.data);
  }
  const originals = Array.from({ length: 5 }, (_, i) => JSON.stringify(storage.getSlotInfo(i + 1).data));
  for (let slot = 1; slot <= 5; slot++) {
    storage.setActiveSlotId(slot);
    const state = new GameState(); state.loadOrInit();
    const original = JSON.parse(originals[slot - 1]);
    assert.deepEqual(state.data.pets, original.pets);
    assert.deepEqual(state.data.supportPetIds, original.supportPetIds);
    assert.equal(state.data.gold, original.gold);
    assert.equal(state.data.crystal, original.crystal);
    const parse = storage.parseBackupText(JSON.stringify({ saveData: state.data }));
    assert.deepEqual(parse.pets, original.pets);
    const first = JSON.stringify(state.data);
    state.loadOrInit();
    assert.equal(JSON.stringify(state.data), first);
    for (let other = 1; other <= 5; other++) {
      if (other !== slot) assert.equal(JSON.stringify(storage.getSlotInfo(other).data), originals[other - 1]);
    }
    originals[slot - 1] = JSON.stringify(storage.getSlotInfo(slot).data);
  }
});
test('opening preserves the single-player guard mission while acknowledging the ancient survivor and returning tower', () => {
  const opening = STORY_QUEST_LIST[0];
  assert.match(opening.desc, /苏醒/);
  assert.match(opening.desc, /亚诺/);
  assert.match(opening.desc, /魔塔.*重现/);
  assert.match(opening.desc, /巡逻队/);
  assert.equal(opening.targetAction, 'meet_guard');
});
if (failures) process.exitCode = 1;
