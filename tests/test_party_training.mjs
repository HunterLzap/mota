import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
const { GameState } = await import('../js/core/state.js');
const { storage } = await import('../js/core/storage.js');
const { getPetParty, getPartyTraits } = await import('../js/core/petParty.js');
const { getClassSkills, getSkillTraining } = await import('../js/config/classes.js');
const { PET_CONFIGS } = await import('../js/config/pets.js');
const { runCombat } = await import('../js/core/combat.js');
const pet = id => ({ id, level: 1, exp: 0, stamina: 100, tier: 'gold', apt: { ...PET_CONFIGS[id].defaultApt }, skills: [] });
function fresh(classId = 'warrior') {
  const state = new GameState();
  state.notify = () => {};
  state.data.classId = classId; state.data.level = 50; state.data.onboardingVersion = 2; state.data.hasChosenClass = true;
  state.data.pets = ['golden_dragon', 'naga', 'white_angel', 'silver_dragon', 'djinn', 'imp', 'nightmare'].map(pet);
  state.setActivePet('golden_dragon');
  return state;
}
function test(name, run) { run(); console.log('PASS ' + name); }
function battle(state, extra = {}) {
  const random = Math.random;
  Math.random = () => .1;
  try {
    const stats = { hp: 5000, maxHp: 5000, mp: 100, maxMp: 100, atk: 100, def: 0, speed: 100, crit: 0, dodge: 0, hit: 100, counter: 0, lifesteal: 0 };
    return runCombat(stats, { ...stats, hp: 3000, maxHp: 3000, atk: 20, speed: 50 }, state.data, { name: 'Guard', ...extra });
  } finally { Math.random = random; }
}
test('party swaps conserve ownership, reject invalid slots and deduplicate malformed local data without mutation', () => {
  const state = fresh();
  state.setPetPartySlot(1, 'naga'); state.setPetPartySlot(2, 'white_angel');
  state.setActivePet('naga');
  assert.deepEqual(getPetParty(state.data).map(member => member.pet?.id), ['naga', 'golden_dragon', 'white_angel']);
  const before = JSON.stringify(state.data);
  for (const [slot, id] of [[-1, null], [3, 'naga'], [1.5, 'naga'], [1, 'unowned'], [1, 'phoenix']]) assert.equal(state.setPetPartySlot(slot, id).success, false);
  assert.equal(JSON.stringify(state.data), before);
  state.data.supportPetIds = ['naga', 'naga'];
  const malformed = JSON.stringify(state.data);
  assert.equal(getPetParty(state.data).filter(member => member.pet).length, 1);
  assert.equal(JSON.stringify(state.data), malformed);
});
test('supports add innate counter and control protection but neither main stats nor learned books', () => {
  const state = fresh(), before = state.getEffectiveStats();
  state.setPetPartySlot(1, 'naga'); state.setPetPartySlot(2, 'white_angel');
  state.data.pets.find(p => p.id === 'naga').skills = ['book_crit'];
  assert.deepEqual(state.getEffectiveStats(), before);
  assert.equal(getPartyTraits(state.data).antiRevive, true);
  const result = battle(state);
  assert.equal(result.logs.filter(log => log.message.includes('【副宠')).length, 2);
  assert.equal(result.logs.find(log => log.message.includes('纳迦')).type, 'passive');
  state.data.pets.find(p => p.id === 'naga').stamina = 59;
  assert.equal(getPartyTraits(state.data).antiRevive, undefined);
  assert.equal(getPartyTraits(state.data).immuneControl, true);
  state.data.pets.push(pet('gryphon'));
  state.setPetPartySlot(2, 'gryphon');
  state.data.pets.find(p => p.id === 'naga').stamina = 100;
  assert.equal(getPartyTraits(state.data).counterBoost, 30, 'Documented gryphon 10% plus naga 20% must total 30%');
  assert.ok(battle(state).logs.some(log => log.type === 'counter'));
  state.data.pets.find(p => p.id === 'naga').stamina = 59;
  assert.equal(getPartyTraits(state.data).counterBoost, 10);
  assert.equal(battle(state).logs.some(log => log.type === 'counter'), false, 'A 10% roll must not pass the remaining 10% counter chance');
});
test('support poison and nightmare infection combine in real damage and stop independently with fatigue', () => {
  const state = fresh();
  state.setPetPartySlot(1, 'imp'); state.setPetPartySlot(2, 'nightmare');
  const infected = battle(state).logs.filter(log => log.type === 'poison');
  state.data.pets.find(p => p.id === 'nightmare').stamina = 59;
  const ordinary = battle(state).logs.filter(log => log.type === 'poison');
  assert.ok(infected.length && ordinary.length);
  assert.ok(infected[0].message !== ordinary[0].message);
  state.data.pets.find(p => p.id === 'imp').stamina = 59;
  assert.equal(battle(state).logs.filter(log => log.type === 'poison').length, 0);
});
test('party experience and upkeep affect exactly the three distinct assigned pets with independent fatigue', () => {
  const state = fresh();
  state.setPetPartySlot(1, 'naga'); state.setPetPartySlot(2, 'white_angel');
  state.data.pets.find(p => p.id === 'white_angel').stamina = 59;
  state.addExp(100);
  assert.deepEqual(state.data.pets.slice(0, 4).map(p => p.exp), [100, 50, 50, 0]);
  state.completeBattle();
  assert.deepEqual(state.data.pets.slice(0, 4).map(p => p.stamina), [100, 100, 59, 100]);
  state.setPetPartySlot(1, null);
  assert.equal(getPetParty(state.data)[1].pet, null);
});
test('cultivation spends earned points once and affects attack passive and aura ranks for all three classes', () => {
  for (const classId of ['warrior', 'hunter', 'mage']) {
    const state = fresh(classId);
    const initial = getSkillTraining(state.data).available;
    for (const index of [0, 1, 2]) {
      const before = getClassSkills(classId, 0, state.data)[index];
      assert.equal(state.trainClassSkill(before.id, 1).success, true);
      assert.equal(state.trainClassSkill(before.id, 1).success, false);
      const after = getClassSkills(classId, 0, state.data)[index];
      assert.equal(after.rank, 2);
      if (index === 0) { assert.equal(after.multiplier, before.multiplier * 1.02); assert.equal(after.mpCost, before.mpCost); }
      else for (const key of Object.keys(before.effect)) assert.equal(after.effect[key], before.effect[key] * 1.02);
    }
    assert.equal(getSkillTraining(state.data).available, initial - 3);
    const id = getClassSkills(classId)[0].id;
    for (let rank = 2; rank < 10; rank++) assert.equal(state.trainClassSkill(id, rank).success, true);
    assert.equal(state.trainClassSkill(id, 10).success, false);
    assert.equal(state.trainClassSkill('foreign_skill', 1).success, false);
    assert.equal(state.setPreferredClassSkill(id).success, true);
    assert.equal(state.setPreferredClassSkill(getClassSkills(classId)[1].id).success, false);
  }
  const state = fresh(); state.data.level = 1;
  assert.equal(state.trainClassSkill('w_sk_1', 1).success, true);
  assert.equal(state.trainClassSkill('w_sk_2', 1).success, false);
  assert.equal(state.trainClassSkill('w_sk_9', 1).success, false);
  state.data.level = 10; assert.equal(getSkillTraining(state.data).available, 0);
  state.data.level = 11; assert.equal(getSkillTraining(state.data).available, 1);
});
test('priority selection changes the actual cast while keeping alternatives for insufficient mana', () => {
  const state = fresh('mage');
  const automatic = battle(state);
  state.setPreferredClassSkill('m_sk_1');
  const preferred = battle(state);
  const cast = result => result.logs.find(log => log.actor === 'player' && log.message.includes('施展'));
  assert.ok(cast(automatic).message.includes('生命偷取'));
  assert.ok(cast(preferred).message.includes('火球术'));
});
test('five-slot migration and backup round trips retain main pets ranks and assets without repeated grants', () => {
  for (let slot = 1; slot <= 5; slot++) {
    storage.setActiveSlotId(slot);
    const state = fresh(); delete state.data.supportPetIds; delete state.data.skillTraining;
    state.data.gold = slot * 123; storage.save(state.data);
    const loaded = new GameState(); loaded.loadOrInit();
    assert.equal(loaded.data.activePetId, 'golden_dragon');
    assert.deepEqual(loaded.data.supportPetIds, [null, null]);
    loaded.trainClassSkill('w_sk_1', 1); loaded.setPetPartySlot(1, 'naga');
    const saved = JSON.stringify(loaded.data); loaded.loadOrInit();
    assert.equal(JSON.stringify(loaded.data), saved);
    assert.deepEqual(storage.parseBackupText(JSON.stringify({ saveData: loaded.data })), loaded.data);
    assert.equal(loaded.data.gold, slot * 123);
  }
  const state = fresh();
  const parse = data => storage.parseBackupText(JSON.stringify({ saveData: data }));
  const storedBefore = [...values.entries()];
  for (const supports of [['naga', 'naga'], ['golden_dragon', null], ['phoenix', null], ['naga'], 'naga']) assert.throws(() => parse({ ...state.data, supportPetIds: supports }));
  for (const training of [{ ranks: { w_sk_1: 11 }, preferredAttackId: null }, { ranks: { m_sk_1: 2 }, preferredAttackId: null }, { ranks: { w_sk_1: 2 }, preferredAttackId: 'w_sk_2' }]) assert.throws(() => parse({ ...state.data, skillTraining: training }));
  assert.throws(() => parse({ ...state.data, level: 1, skillTraining: { ranks: { w_sk_1: 3 }, preferredAttackId: null } }));
  for (const invalid of [{ exp: -1 }, { exp: null }, { stamina: -1 }, { stamina: 101 }, { stamina: '60' }, { level: 0 }]) {
    assert.throws(() => parse({ ...state.data, pets: [{ ...state.data.pets[0], ...invalid }, ...state.data.pets.slice(1)] }));
  }
  assert.deepEqual([...values.entries()], storedBefore, 'Rejected imports must leave all five saved slots untouched');
});
