import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GameState } = await import('../js/core/state.js');
const journey = await import('../js/core/journey.js');
const { COMMISSIONS } = await import('../js/config/commissions.js');
const { runCombat, getPlayerActionInterval } = await import('../js/core/combat.js');
const fixtures = JSON.parse(readFileSync('output/playwright/midgame-commission-fixtures.json', 'utf8'));
const chain = COMMISSIONS.filter(config => config.rewards.equipmentChoices);
for (const classId of ['warrior', 'mage', 'hunter']) for (const config of chain) for (const choice of config.rewards.equipmentChoices) {
  const state = new GameState(); state.data = structuredClone(fixtures[classId]); state.data.commissions = {};
  for (const prior of chain.slice(0, chain.indexOf(config))) {
    state.data.commissions[prior.id] = { status: 'claimed', current: prior.requirement.count };
  }
  const before = structuredClone(state.data), random = Math.random;
  let calls = 0, notifications = 0;
  const unsubscribe = state.subscribe(() => notifications++);
  Math.random = () => { calls++; return .5; };
  let preview;
  try {
    assert.equal(journey.getOptionalEquipmentGoal(state.data).id, config.id);
    preview = state.getCommissionEquipmentPreview(config.id, choice.id);
    assert.ok(preview.success);
    assert.deepEqual(state.data, before);
    assert.equal(calls, 0); assert.equal(notifications, 0);
    assert.ok(!state.getCommissionEquipmentPreview(config.id, 'missing').success);
    assert.ok(state.acceptCommission(config.id).success);
    const lines = [];
    for (let index = 0; index < config.requirement.count; index++) {
      assert.ok(state.settleWildVictory(config.requirement.target, 0).success);
      const entry = state.getCommissions().find(entry => entry.id === config.id);
      assert.equal(entry.progressText, config.storyBeats[index]);
      lines.push(entry.progressText);
    }
    assert.equal(new Set(lines).size, 3);
    assert.equal(journey.getOptionalEquipmentGoal(state.data).status, 'ready');
    assert.ok(state.claimCommission(config.id, choice.id).success);
    assert.ok(state.equipItem(state.data.bag.find(item => item.id === choice.id).uid).success);
    assert.deepEqual(state.getEffectiveStats(), preview.after, 'Goal preview differs from the actually granted equipment');
  } finally { Math.random = random; unsubscribe(); }
}
const state = new GameState(); state.data.hasChosenClass = true; state.data.level = 24;
assert.equal(journey.getOptionalEquipmentGoal(state.data), null);
state.data.level = 25;
assert.equal(journey.getOptionalEquipmentGoal(state.data).id, 'patrol_letter');
const mainline = journey.getJourneyGuidance(state.data);
journey.getOptionalEquipmentGoal(state.data);
assert.deepEqual(journey.getJourneyGuidance(state.data), mainline, 'Optional goal replaced the mainline');
state.data.commissions = Object.fromEntries(chain.map(config => [config.id, { status: 'claimed', current: config.requirement.count }]));
assert.equal(journey.getOptionalEquipmentGoal(state.data), null);
for (const classId of ['warrior', 'mage', 'hunter']) {
  const fighter = new GameState(); fighter.data = structuredClone(fixtures[classId]);
  fighter.data.estate.hiredMercId = 'merc_bard';
  const stats = fighter.getEffectiveStats(), original = Math.random;
  try {
    Math.random = () => .5;
    const enemy = { hp: 1e9, atk: 1, def: 1, speed: 10 };
    const result = runCombat(stats, enemy, fighter.data, enemy);
    assert.equal(getPlayerActionInterval(stats, fighter.data), result.initialIntervals.player,
      'Bard speed is absent from the same helper used by sidebar and reward preview');
  } finally { Math.random = original; }
}
console.log('PASS three classes and six rewards: read-only goal/preview, three narrative beats, real rewards/equipment equivalence and optional mainline independence');
