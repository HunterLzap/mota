import assert from 'node:assert/strict';
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
const { GameState } = await import('../js/core/state.js');
const { storage } = await import('../js/core/storage.js');
const { HOLY_RELICS } = await import('../js/config/relics.js');
for (const classId of ['warrior', 'mage', 'hunter']) for (const relic of HOLY_RELICS) {
  const state = new GameState();
  Object.assign(state.data, { classId, hasChosenClass: true, onboardingVersion: 2, dailyResetDate: new Date().toDateString() });
  Object.assign(state.data.castle, { isExploring: true, expeditionId: 'relic-settlement', floor: relic.unlockFloor,
    maxReachedFloor: relic.unlockFloor - 1, finished: false });
  state.data.relics.unlocked = HOLY_RELICS.filter(entry => entry.unlockFloor < relic.unlockFloor).map(entry => entry.id);
  const result = state.settleCastleVictory(relic.unlockFloor, 'relic-settlement');
  assert.ok(result.success);
  assert.ok(state.data.relics.unlocked.includes(relic.id), 'Relic is missing until UI or refresh: ' + relic.id);
  assert.deepEqual(result.newRelics.map(entry => entry.id), [relic.id]);
  const stats = state.getEffectiveStats(), before = structuredClone(state.data);
  assert.ok(!state.settleCastleVictory(relic.unlockFloor, 'relic-settlement').success);
  assert.deepEqual(state.data, before);
  for (const slot of [1, 2, 4, 5]) storage.saveToSlot(slot, { ...before, name: 'Protected ' + slot });
  const others = [1, 2, 4, 5].map(slot => values.get('MOTA_WORLD_SAVE_SLOT_' + slot));
  storage.setActiveSlotId(3); storage.save(state.data); state.loadOrInit();
  assert.deepEqual(state.getEffectiveStats(), stats, 'Refreshing granted hidden combat power');
  assert.deepEqual(state.data.relics.unlocked, before.relics.unlocked);
  assert.deepEqual([1, 2, 4, 5].map(slot => values.get('MOTA_WORLD_SAVE_SLOT_' + slot)), others);
}
console.log('PASS three classes at all six relic thresholds: production settlement, reload stats, duplicate rejection and four protected slots');
