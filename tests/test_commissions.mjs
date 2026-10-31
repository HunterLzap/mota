import assert from 'node:assert/strict';
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
const { GameState } = await import('../js/core/state.js');
const { storage } = await import('../js/core/storage.js');
const { COMMISSIONS } = await import('../js/config/commissions.js');
const { PET_CONFIGS } = await import('../js/config/pets.js');
const parse = data => storage.parseBackupText(JSON.stringify({ saveData: data }));
const stateAt = (level = 19, nation = 'aden') => {
  const state = new GameState();
  Object.assign(state.data, { level, nation, hasChosenClass: true, onboardingVersion: 0 });
  return state;
};
const xp = state => {
  let total = state.data.exp;
  for (let level = 1; level < state.data.level; level++) total += state.getNextLevelExp(level);
  return total;
};
let failures = 0, passed = 0;
const test = (name, run) => {
  try { run(); passed++; console.log('PASS ' + name); }
  catch (error) { failures++; console.error('FAIL ' + name + '\n' + error.stack); }
};
test('level and character gates reject without mutation; duplicate accept and early claim reject', () => {
  const state = stateAt(11);
  for (const config of COMMISSIONS) assert.equal(state.acceptCommission(config.id).success, false);
  assert.deepEqual(state.data.commissions, {});
  state.data.level = 19; state.data.hasChosenClass = false;
  assert.equal(state.acceptCommission('oath_token').success, false);
  state.data.hasChosenClass = true;
  assert.equal(state.acceptCommission('missing').success, false);
  assert.equal(state.claimCommission('oath_token').success, false);
  assert.equal(state.acceptCommission('oath_token').success, true);
  const before = structuredClone(state.data);
  assert.equal(state.acceptCommission('oath_token').success, false);
  assert.equal(state.claimCommission('oath_token').success, false);
  assert.deepEqual(state.data, before);
});
test('each entry opens at its exact level threshold', () => {
  for (const config of COMMISSIONS) {
    const state = stateAt(config.minLevel - 1);
    if (config.prerequisite) {
      const prerequisite = COMMISSIONS.find(entry => entry.id === config.prerequisite);
      state.data.commissions[prerequisite.id] = { status: 'claimed', current: prerequisite.requirement.count,
        choiceId: prerequisite.rewards.equipmentChoices[0].id };
    }
    assert.equal(state.acceptCommission(config.id).success, false);
    assert.equal(state.data.commissions[config.id], undefined);
    state.data.level++;
    assert.equal(state.acceptCommission(config.id).success, true);
  }
});
test('oath only counts the forest boss after acceptance and awards exactly once including usable egg', () => {
  const state = stateAt(30);
  state.settleWildBossVictory('forest');
  assert.deepEqual(state.data.commissions, {});
  state.acceptCommission('oath_token');
  state.settleWildVictory('forest', 0);
  state.settleWildBossVictory('canyon');
  assert.equal(state.data.commissions.oath_token.current, 0);
  assert.equal(state.settleWildBossVictory('missing').success, false);
  state.settleWildBossVictory('forest');
  assert.deepEqual(state.data.commissions.oath_token, { status: 'ready', current: 1 });
  const before = structuredClone(state.data), experience = xp(state);
  assert.equal(state.claimCommission('oath_token').success, true);
  const reward = COMMISSIONS[0].rewards;
  assert.equal(xp(state) - experience, reward.exp);
  for (const key of ['gold', 'crystal', 'prestige']) assert.equal(state.data[key] - before[key], reward[key]);
  const egg = state.data.bag.find(item => item.id === 'pet_egg_darkgold');
  assert.equal(egg.count, 1); assert.equal(egg.type, 'egg'); assert.equal(egg.quality, 'darkgold');
  const after = structuredClone(state.data);
  assert.equal(state.claimCommission('oath_token').success, false);
  assert.deepEqual(state.data, after);
  assert.equal(state.hatchPetEgg().success, false);
  assert.equal(egg.count, 1, 'Level gate must preserve egg');
  state.data.level = 45;
  const hatch = state.hatchPetEgg();
  assert.equal(hatch.success, true);
  assert.equal(PET_CONFIGS[hatch.petId].defaultTier, 'darkgold');
  assert.equal(state.data.bag.some(item => item.id === egg.id), false);
});
test('three nation descriptions share one earned nonrepeatable guide', () => {
  for (const nation of ['aden', 'kester', 'sagael']) {
    const state = stateAt(12, nation);
    assert.match(state.getCommissions(['nation_guide'])[0].title, /国家指引/);
    assert.equal(state.acceptCommission('nation_guide').success, true);
    state.settleWildVictory('forest', 0);
    assert.deepEqual(state.data.commissions.nation_guide, { status: 'active', current: 1 });
    state.settleWildVictory('forest', 1);
    assert.equal(state.claimCommission('nation_guide').success, true);
    assert.equal(state.data.bag.find(item => item.id === 'pet_egg_darkgold').count, 1);
    state.data.nation = 'aden';
    assert.equal(state.acceptCommission('nation_guide').success, false);
  }
});
test('tavern counts real objectives separately; completed tower callback cannot advance twice', () => {
  const state = stateAt(19);
  state.acceptCommission('tavern_road'); state.acceptCommission('tavern_tower');
  for (let i = 0; i < 3; i++) state.settleWildVictory('forest', i);
  assert.equal(state.data.commissions.tavern_road.status, 'ready');
  assert.equal(state.data.commissions.tavern_tower.current, 0);
  Object.assign(state.data.castle, { isExploring: true, expeditionId: 'commission-test', floor: 1 });
  assert.equal(state.settleCastleVictory(1, 'wrong').success, false);
  assert.equal(state.data.commissions.tavern_tower.current, 0);
  assert.equal(state.settleCastleVictory(1, 'commission-test').success, true);
  assert.equal(state.settleCastleVictory(1, 'commission-test').success, false);
  assert.equal(state.data.commissions.tavern_tower.status, 'ready');
  const bountyBefore = structuredClone(state.data.tavern.bounties);
  const before = structuredClone(state.data), experience = xp(state);
  for (const id of ['tavern_road', 'tavern_tower']) assert.equal(state.claimCommission(id).success, true);
  assert.equal(state.data.gold - before.gold, 1800);
  assert.equal(xp(state) - experience, 1000);
  assert.equal(state.data.bag.find(item => item.id === 'pet_food').count, 3);
  assert.deepEqual(state.data.tavern.bounties, bountyBefore);
});
test('full bag rewards stack and overflow without sale or loss; one publication contains entire reward', () => {
  const state = stateAt();
  state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: 'kept_' + i, count: 1 }));
  state.acceptCommission('oath_token'); state.settleWildBossVictory('forest');
  state.data.exp = state.getNextLevelExp(state.data.level) - 1;
  const before = structuredClone(state.data.bag), observations = [];
  state.subscribe(data => observations.push(structuredClone(data)));
  state.claimCommission('oath_token');
  assert.equal(observations.length, 1);
  assert.equal(observations[0].bag.find(item => item.id === 'pet_egg_darkgold').count, 1);
  assert.equal(observations[0].commissions.oath_token.status, 'claimed');
  assert.equal(observations[0].level, 20, 'Level-up must publish with the complete reward');
  assert.deepEqual(state.data.bag.slice(0, before.length), before);
  state.acceptCommission('nation_guide');
  state.settleWildVictory('forest', 0); state.settleWildVictory('forest', 0);
  state.claimCommission('nation_guide');
  assert.equal(state.data.bag.find(item => item.id === 'pet_egg_darkgold').count, 2);
});
test('damaged direct-load progress cannot resurrect claimed rewards', () => {
  const state = stateAt();
  state.data.commissions = { oath_token: { status: 'claimed', current: -1 }, tavern_road: { status: 'ready', current: 0 }, unknown: { status: 'ready', current: 1 } };
  storage.save(state.data);
  state.loadOrInit();
  assert.deepEqual(state.data.commissions, { oath_token: { status: 'claimed', current: 1 } });
  assert.equal(state.claimCommission('oath_token').success, false);
  assert.equal(state.acceptCommission('oath_token').success, false);
  parse(state.data);
});
test('cross-day reset preserves partial, ready and claimed progress', () => {
  const state = stateAt();
  for (const config of COMMISSIONS) state.acceptCommission(config.id);
  state.settleWildVictory('forest', 0);
  state.settleWildBossVictory('forest'); state.claimCommission('oath_token');
  const before = structuredClone(state.data.commissions);
  state.resetDailyActivities('commission-test-next-day');
  assert.deepEqual(state.data.commissions, before);
});
test('backup validation rejects unknown and impossible progress without changing saved slots', () => {
  const state = stateAt(), before = [...values.entries()];
  for (const commissions of [
    [], null, { missing: { status: 'active', current: 0 } },
    ...[ { status: 'active', current: 1 }, { status: 'ready', current: 0 },
      { status: 'claimed', current: 0 }, { status: 'ready', current: 2 },
      { status: 'active', current: -1 }, { status: 'unknown', current: 0 },
      { status: 'active', current: 0.5 }, { status: 'active', current: '0' } ].map(progress => ({ oath_token: progress }))
  ]) assert.throws(() => parse({ ...state.data, commissions }), /委托/);
  for (const status of ['ready', 'claimed']) assert.deepEqual(parse({ ...state.data, commissions: { oath_token: { status, current: 1 } } }).commissions, { oath_token: { status, current: 1 } });
  assert.deepEqual([...values.entries()], before);
});
test('five legacy slots retain all assets; migration and repeat load are idempotent, later accept stays possible', () => {
  const assets = state => Object.fromEntries(['name', 'classId', 'nation', 'level', 'exp', 'gold', 'crystal', 'prestige', 'bag', 'pets', 'equipped', 'questProgress'].map(key => [key, structuredClone(state.data[key])]));
  const snapshots = new Map();
  for (let slot = 1; slot <= 5; slot++) {
    const state = stateAt(45 + slot, ['aden', 'sagael', 'kester'][slot % 3]);
    state.data.name = 'Legacy ' + slot; state.data.gold = slot * 1234;
    state.data.bag = [{ id: 'pet_egg_darkgold', type: 'egg', count: slot }];
    delete state.data.commissions;
    storage.saveToSlot(slot, state.data);
    snapshots.set(slot, assets(state));
  }
  for (let slot = 1; slot <= 5; slot++) {
    const others = [...values.entries()].filter(([key]) => key.startsWith('MOTA_WORLD_SAVE_SLOT_') && key !== 'MOTA_WORLD_SAVE_SLOT_' + slot);
    storage.setActiveSlotId(slot);
    const state = new GameState(); state.loadOrInit();
    assert.deepEqual(assets(state), snapshots.get(slot));
    assert.deepEqual(state.data.commissions, {});
    state.loadOrInit(); assert.deepEqual(assets(state), snapshots.get(slot));
    assert.deepEqual([...values.entries()].filter(([key]) => others.some(([other]) => other === key)), others);
    assert.equal(state.acceptCommission('oath_token').success, true);
    state.settleWildBossVictory('forest'); state.claimCommission('oath_token');
    const after = structuredClone(state.data);
    state.loadOrInit(); assert.deepEqual(state.data, after);
    assert.equal(state.claimCommission('oath_token').success, false);
    parse(state.data);
  }
});
console.log(`${passed} passed; ${failures} failed`);
if (failures) process.exitCode = 1;
