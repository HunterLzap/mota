import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
const { GameState } = await import('../js/core/state.js');
const { storage } = await import('../js/core/storage.js');
const { COMMISSIONS } = await import('../js/config/commissions.js');
const { MAPS } = await import('../js/config/maps.js');
const { runCombat } = await import('../js/core/combat.js');
const { getTowerFloorData } = await import('../js/config/towerLevels.js');
const { naturalJourney } = await import('./natural_journey.mjs');
const chain = COMMISSIONS.filter(entry => entry.rewards.equipmentChoices);
const fixtures = {}, routes = [], failures = [];
const test = (name, run) => {
  try { run(); console.log('PASS ' + name); }
  catch (error) { failures.push({ name, error: error.stack }); console.error('FAIL ' + name + ': ' + error.stack); }
};
const totalExp = state => {
  let value = state.data.exp;
  for (let level = 1; level < state.data.level; level++) value += state.getNextLevelExp(level);
  return value;
};
const backup = data => storage.parseBackupText(JSON.stringify({ saveData: data }));
for (const classId of ['warrior', 'mage', 'hunter']) {
  naturalJourney(classId, 406, (chapter, state) => {
    if (chapter.chapter === 22) fixtures[classId] = structuredClone(state.data);
  });
  const normalized = new GameState();
  normalized.data = fixtures[classId];
  storage.save(normalized.data); normalized.loadOrInit();
  fixtures[classId] = structuredClone(normalized.data);
}
function ready(state, config) {
  assert.ok(state.acceptCommission(config.id).success);
  for (let index = 0; index < config.requirement.count; index++) {
    assert.ok(state.settleWildVictory(config.requirement.target, 0).success);
  }
  assert.equal(state.data.commissions[config.id].status, 'ready');
}
test('ordered story gates reject without mutation, including a finished but unclaimed prerequisite', () => {
  const state = new GameState(); state.data = structuredClone(fixtures.warrior);
  for (const config of chain.slice(1)) {
    const before = structuredClone(state.data);
    assert.equal(state.acceptCommission(config.id).success, false);
    assert.deepEqual(state.data, before);
    assert.match(state.getCommissions().find(entry => entry.id === config.id).lockedReason, /先交付/);
  }
  ready(state, chain[0]);
  assert.equal(state.acceptCommission(chain[1].id).success, false);
  assert.ok(state.claimCommission(chain[0].id, chain[0].rewards.equipmentChoices[0].id).success);
  assert.ok(state.acceptCommission(chain[1].id).success);
});
test('every class can choose either full equipment line with exact rewards, one publication and no duplicates', () => {
  for (const [classId, fixture] of Object.entries(fixtures)) for (const build of ['assault', 'ward']) {
    const state = new GameState(); state.data = structuredClone(fixture);
    for (const config of chain) {
      ready(state, config);
      const before = structuredClone(state.data);
      for (const choice of [undefined, 'missing', chain.find(entry => entry !== config).rewards.equipmentChoices[0].id]) {
        assert.equal(state.claimCommission(config.id, choice).success, false);
        assert.deepEqual(state.data, before);
      }
      const chosen = config.rewards.equipmentChoices.find(item => item.id.endsWith('_' + build));
      const observations = [], xp = totalExp(state);
      const unsubscribe = state.subscribe(data => observations.push(structuredClone(data)));
      assert.ok(state.claimCommission(config.id, chosen.id).success);
      unsubscribe();
      assert.equal(observations.length, 1);
      assert.equal(observations[0].commissions[config.id].choiceId, chosen.id);
      assert.equal(totalExp(state) - xp, config.rewards.exp);
      for (const key of ['gold', 'crystal', 'prestige']) assert.equal(state.data[key] - before[key], config.rewards[key]);
      const gear = state.data.bag.find(item => item.id === chosen.id);
      assert.ok(gear?.uid);
      assert.equal(gear.durability, 100); assert.equal(gear.reqLevel, chosen.level);
      assert.equal(state.data.bag.filter(item => config.rewards.equipmentChoices.some(choice => choice.id === item.id)).length, 1);
      if (gear.slot === 'cloak') {
        assert.equal(gear.reqClass, classId);
        if (build === 'assault') assert.equal(gear.stats[{ warrior: 'str', mage: 'int', hunter: 'dex' }[classId]], 18);
      }
      assert.ok(state.equipItem(gear.uid).success);
      const claimed = structuredClone(state.data);
      assert.equal(state.claimCommission(config.id, chosen.id).success, false);
      assert.deepEqual(state.data, claimed);
      backup(state.data);
      storage.save(state.data); state.loadOrInit();
      assert.deepEqual(state.data, claimed);
    }
  }
});
test('full inventory keeps existing possessions and delivers exactly one nonstacking equipment reward', () => {
  const state = new GameState(); state.data = structuredClone(fixtures.warrior);
  state.data.bag = Array.from({ length: 40 }, (_, index) => ({ id: 'kept_' + index, count: 1 }));
  ready(state, chain[0]);
  const kept = structuredClone(state.data.bag);
  assert.ok(state.claimCommission(chain[0].id, 'letter_ward').success);
  assert.deepEqual(state.data.bag.slice(0, kept.length), kept);
  assert.equal(state.data.bag.filter(item => item.id === 'letter_ward').length, 1);
  assert.equal(state.data.bag.find(item => item.id === 'pet_food').count, 2);
});
test('invalid choices are rejected by backup validation; claimed damage is conservatively nonrepeatable', () => {
  const state = new GameState(); state.data = structuredClone(fixtures.warrior);
  for (const progress of [
    { status: 'active', current: 0, choiceId: 'letter_ward' },
    { status: 'ready', current: 3, choiceId: 'letter_ward' },
    { status: 'claimed', current: 3, choiceId: 'lantern_ward' }
  ]) assert.throws(() => backup({ ...state.data, commissions: { patrol_letter: progress } }), /委托/);
  state.data.commissions = { patrol_letter: { status: 'claimed', current: -1, choiceId: 'missing' } };
  storage.save(state.data); state.loadOrInit();
  assert.deepEqual(state.data.commissions.patrol_letter, { status: 'claimed', current: 3 });
  assert.equal(state.acceptCommission('patrol_letter').success, false);
  assert.equal(state.claimCommission('patrol_letter', 'letter_ward').success, false);
});
test('five old slots retain all possessions and existing task markers with repeat-load compatibility', () => {
  const saved = new Map();
  for (let slot = 1; slot <= 5; slot++) {
    const data = structuredClone(fixtures[['warrior', 'mage', 'hunter'][slot % 3]]);
    data.name = 'Old journey ' + slot;
    data.commissions = { oath_token: { status: 'claimed', current: 1 } };
    storage.saveToSlot(slot, data); saved.set(slot, data);
  }
  for (let slot = 1; slot <= 5; slot++) {
    const others = [...values].filter(([key]) => key.startsWith('MOTA_WORLD_SAVE_SLOT_') && key !== 'MOTA_WORLD_SAVE_SLOT_' + slot);
    storage.setActiveSlotId(slot);
    const state = new GameState(); state.loadOrInit(); state.loadOrInit();
    assert.deepEqual(state.data, saved.get(slot));
    assert.equal(state.acceptCommission('patrol_letter').success, true);
    assert.deepEqual([...values].filter(([key]) => others.some(([other]) => key === other)), others);
  }
});
test('optional story routes use nine paid-for battles, conserve resources and reach the real ending', () => {
  for (const classId of ['warrior', 'mage', 'hunter']) for (const build of ['assault', 'ward']) {
    const route = naturalJourney(classId, 406, (_, state) => backup(state.data),
      'ordinary', null, 2, { commissionBuild: build });
    assert.equal(route.final.quest, 'completed');
    assert.equal(route.final.tower, 100);
    assert.equal(route.waitingHours, 0);
    assert.equal(route.commissions.length, 3);
    assert.ok(route.battles < 300);
    for (const [key, closing] of Object.entries(route.resourceAccounting.closing)) {
      const net = Object.values(route.resourceFlow).reduce((sum, flow) => sum + flow[key], 0);
      assert.equal(route.resourceAccounting.opening[key] + net, closing);
    }
    assert.equal(route.resourceFlow.commissions.experience, 15300);
    routes.push({ classId, build, battles: route.battles, losses: route.losses, minutes: route.combatSeconds / 60,
      commissions: route.commissions, income: route.resourceFlow.commissions, finalBoss: route.bossSamples.at(-1) });
  }
});
test('the ward line increases effective magic resistance while assault gear keeps a real damage tradeoff', () => {
  const builds = {};
  for (const build of ['assault', 'ward']) {
    const state = new GameState(); state.data = structuredClone(fixtures.warrior);
    for (const config of chain) {
      ready(state, config);
      const choice = config.rewards.equipmentChoices.find(item => item.id.endsWith('_' + build));
      assert.ok(state.claimCommission(config.id, choice.id).success);
      assert.ok(state.equipItem(state.data.bag.find(item => item.id === choice.id).uid).success);
    }
    builds[build] = { stats: state.getEffectiveStats(), data: structuredClone(state.data) };
  }
  assert.ok(builds.ward.stats.magicResist > builds.assault.stats.magicResist);
  assert.ok(builds.assault.stats.atk > builds.ward.stats.atk);
  // Isolate the two threshold spells from the periodic imprisonment and ward.
  const finalBoss = getTowerFloorData(100, 2);
  const enemy = { ...finalBoss, openingShield: 0, hp: 200000, maxHp: 200000,
    abilities: finalBoss.abilities.filter(ability => ability.hpThreshold) };
  const random = Math.random;
  const damage = {};
  try {
    for (const [build, fixture] of Object.entries(builds)) {
      Math.random = () => .5;
      const result = runCombat(fixture.stats, enemy, { ...fixture.data, isCastleExplore: true }, enemy);
      const spell = result.logs.find(log => log.maxHpDamage > 0);
      assert.ok(spell, 'Equipment counter sample never encountered dragon breath');
      damage[build] = spell.damage / fixture.stats.maxHp;
    }
  } finally { Math.random = random; }
  assert.ok(damage.ward < damage.assault, 'Ward line did not reduce proportional breath damage');
});
mkdirSync('output/playwright', { recursive: true });
writeFileSync('output/playwright/midgame-commission-fixtures.json', JSON.stringify(fixtures, null, 2));
writeFileSync('output/playwright/midgame-commission-routes.json', JSON.stringify({ routes, failures }, null, 2));
assert.deepEqual(failures, []);
