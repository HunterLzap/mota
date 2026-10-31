import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
};
const { GameState } = await import('../js/core/state.js');
const { storage } = await import('../js/core/storage.js');
const { getRegionalStory, levelExperience } = await import('../js/config/story.js');
const { MAPS } = await import('../js/config/maps.js');
const { naturalJourney } = await import('./natural_journey.mjs');

function investigationState() {
  const state = new GameState();
  state.notify = () => {};
  state.data.onboardingVersion = 2;
  state.data.hasChosenClass = true;
  state.data.currentQuestId = 'quest_11';
  return state;
}
const experience = state => state.data.exp + Array.from({ length: state.data.level - 1 }, (_, i) => levelExperience(i + 1)).reduce((sum, n) => sum + n, 0);
const state = investigationState(), event = getRegionalStory(state.data);
const mobExp = MAPS[0].monsters[0].exp;
const initialExperience = experience(state);
state.recordRegionalStory('wild', 'canyon');
assert.equal(experience(state), initialExperience, 'Wrong region must not award investigation experience');
assert.equal(state.settleWildVictory('forest', 0).success, true);
assert.equal(experience(state) - initialExperience, mobExp + Math.floor(event.exp / event.count));
assert.equal(state.claimRegionalStory(event.id).success, false, 'Partial progress must not release supplies');
storage.save(state.data);
const loaded = new GameState();
loaded.loadOrInit();
loaded.notify = () => {};
assert.equal(loaded.data.questProgress[event.id].expGranted, Math.floor(event.exp / event.count));
for (let i = 1; i < event.count; i++) assert.equal(loaded.settleWildVictory('forest', 0).success, true);
assert.equal(experience(loaded) - initialExperience, event.exp + mobExp * event.count, 'All installments must sum to the original finite budget');
const completedExperience = experience(loaded);
loaded.recordRegionalStory('wild', 'forest');
assert.equal(experience(loaded), completedExperience, 'Completed objectives cannot pay again');
assert.equal(loaded.claimRegionalStory(event.id).exp, 0);
assert.equal(experience(loaded), completedExperience, 'Delivery must not repay experience earned in battle');
assert.equal(loaded.claimRegionalStory(event.id).success, false);
console.log('PASS investigation experience advances per earned target and survives reload without double payment');

const legacy = investigationState();
legacy.data.questProgress[event.id] = { current: event.count, completed: true, claimed: false };
storage.parseBackupText(JSON.stringify({ saveData: legacy.data }));
const legacyBefore = experience(legacy);
assert.equal(legacy.claimRegionalStory(event.id).exp, event.exp);
assert.equal(experience(legacy) - legacyBefore, event.exp);
assert.equal(legacy.claimRegionalStory(event.id).success, false);
const partialLegacy = investigationState();
partialLegacy.data.questProgress[event.id] = { current: event.count - 1, completed: false, claimed: false };
const partialBefore = experience(partialLegacy);
assert.equal(partialLegacy.settleWildVictory('forest', 0).success, true);
assert.equal(experience(partialLegacy) - partialBefore, event.exp + mobExp, 'Old partial progress must retain its unpaid portion when the last objective is won');
assert.equal(partialLegacy.claimRegionalStory(event.id).exp, 0);
for (const invalid of [-1, 0.5, event.exp + 1, '100']) {
  const copy = structuredClone(legacy.data);
  copy.questProgress[event.id].expGranted = invalid;
  assert.throws(() => storage.parseBackupText(JSON.stringify({ saveData: copy })), /调查经验/);
}
console.log('PASS old unclaimed investigations retain full rewards and invalid installment records are rejected');

if (!process.argv.includes('--unit-only')) {
  for (const seed of [406, 123, 2026]) for (const classId of ['warrior', 'mage', 'hunter']) {
    values.clear();
    const report = naturalJourney(classId, seed);
    assert.equal(report.chapters.length, 26);
    assert.equal(report.final.quest, 'completed');
    assert.equal(report.final.tower, 100);
    assert.equal(report.waitingHours, 0, 'The solo campaign must not require waiting for real calendar resets');
    assert.ok(report.battles < 250, 'Progress must not turn into repeated grinding');
    assert.ok(report.repairs > 0 && report.foodUsed > 0, 'Natural preparation must include earned equipment and companion upkeep');
    const finalBoss = report.bossSamples.at(-1);
    assert.ok(finalBoss.winPct >= 80, 'Earned preparation must make the final boss reliably beatable across battle seeds');
    assert.ok(finalBoss.meanEnemyActions >= 3 && finalBoss.meanSeconds < 200, 'The final boss should act without approaching the timeout');
    console.log(`PASS ${classId}/${seed}: ${report.battles} battles, ${report.losses} losses, 0 waiting hours, 26 chapters / floor 100; final boss ${finalBoss.winPct}% over 100 frozen samples`);
  }
}
