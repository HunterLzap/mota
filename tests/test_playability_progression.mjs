import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
const { GameState } = await import('../js/core/state.js');
const { storage } = await import('../js/core/storage.js');
const { REGIONAL_STORIES } = await import('../js/config/story.js');
const { PET_CONFIGS } = await import('../js/config/pets.js');
const { getPlayerSynergyStrike, runCombat } = await import('../js/core/combat.js');
const { getSynergyStrike } = await import('../js/config/dungeons.js');
const test = (name, run) => { run(); console.log('PASS ' + name); };
const totalExp = state => {
  let total = state.data.exp;
  for (let level = 1; level < state.data.level; level++) total += state.getNextLevelExp(level);
  return total;
};
function investigating() {
  const state = new GameState();
  state.notify = () => {};
  Object.assign(state.data, { hasChosenClass: true, onboardingVersion: 2, currentQuestId: 'quest_11', level: 20 });
  for (const id of ['patrol_tracks', 'patrol_wolf']) {
    const event = REGIONAL_STORIES.quest_11.find(event => event.id === id);
    state.data.questProgress[id] = { current: event.count, completed: true, claimed: true, expGranted: event.exp };
  }
  return state;
}

test('five real dungeon settlements distribute the same finite investigation budget, survive reload and reject stale replay', () => {
  const state = investigating();
  const event = REGIONAL_STORIES.quest_11[2], opening = totalExp(state);
  const expedition = state.startDungeonExpedition('trial_gate').expeditionId;
  let battleExp = 0;
  for (let floor = 1; floor <= 5; floor++) {
    const beforeLevel = state.data.level;
    const result = state.settleDungeonVictory('trial_gate', floor, expedition);
    assert.equal(result.success, true);
    battleExp += result.exp;
    const progress = state.data.questProgress.patrol_gate;
    assert.equal(progress.floorProgress, floor);
    assert.equal(progress.expGranted, Math.floor(event.exp * floor / 5));
    assert.ok(state.data.level - beforeLevel <= 2, 'One floor skipped a large equipment/skill interval');
    assert.equal(progress.completed, floor === 5);
    storage.parseBackupText(JSON.stringify({ saveData: state.data }));
    const after = JSON.stringify(state.data);
    assert.equal(state.settleDungeonVictory('trial_gate', floor, expedition).success, false);
    assert.equal(JSON.stringify(state.data), after);
    if (floor === 2) {
      storage.setActiveSlotId(3); storage.save(state.data);
      const loaded = new GameState(); loaded.notify = () => {}; loaded.loadOrInit();
      assert.deepEqual(loaded.data.questProgress.patrol_gate, progress);
      state.data = loaded.data;
    }
  }
  assert.equal(totalExp(state) - opening, event.exp + battleExp);
  assert.equal(state.claimRegionalStory(event.id).exp, 0);
  const claimed = totalExp(state);
  assert.equal(state.claimRegionalStory(event.id).success, false);
  assert.equal(totalExp(state), claimed);
});

test('retreating and repeating earlier floors cannot farm the finite investigation allowance', () => {
  const state = investigating();
  let expedition = state.startDungeonExpedition('trial_gate').expeditionId;
  state.settleDungeonVictory('trial_gate', 1, expedition);
  state.settleDungeonVictory('trial_gate', 2, expedition);
  const earned = state.data.questProgress.patrol_gate.expGranted;
  state.retreatDungeonExpedition(expedition);
  expedition = state.startDungeonExpedition('trial_gate').expeditionId;
  state.settleDungeonVictory('trial_gate', 1, expedition);
  state.settleDungeonVictory('trial_gate', 2, expedition);
  assert.equal(state.data.questProgress.patrol_gate.expGranted, earned);
  state.settleDungeonVictory('trial_gate', 3, expedition);
  assert.ok(state.data.questProgress.patrol_gate.expGranted > earned);
});

test('old completed and unpaid investigations retain all rewards while forged partial records fail backup validation', () => {
  const state = investigating(), event = REGIONAL_STORIES.quest_11[2];
  state.data.questProgress[event.id] = { current: 1, completed: true, claimed: false };
  storage.parseBackupText(JSON.stringify({ saveData: state.data }));
  const opening = totalExp(state);
  assert.equal(state.claimRegionalStory(event.id).exp, event.exp);
  assert.equal(totalExp(state) - opening, event.exp);
  for (const progress of [
    { current: 0, completed: false, claimed: false, floorProgress: 6, expGranted: 0 },
    { current: 0, completed: false, claimed: false, floorProgress: 5, expGranted: 0 },
    { current: 0, completed: false, claimed: false, floorProgress: 2, expGranted: event.exp }
  ]) {
    state.data.questProgress[event.id] = progress;
    assert.throws(() => storage.parseBackupText(JSON.stringify({ saveData: state.data })), /调查/);
  }
});

test('advanced formations change actual synergy for every class while starters keep their class and fatigue removes the match', () => {
  const random = Math.random;
  Math.random = () => .51;
  try {
    for (const classId of ['warrior', 'mage', 'hunter']) {
      for (const [mercId, petId, expected] of [
        ['merc_paladin', 'faerie_dragon', 'crimson_cataclysm'],
        ['merc_bard', 'silver_dragon', 'gale_phantom'],
        ['merc_cleric', 'white_angel', 'divine_verdict'],
        ['merc_cleric', 'djinn', 'alliance_fury']
      ]) {
        const state = new GameState(); state.notify = () => {};
        Object.assign(state.data, { hasChosenClass: true, classId, level: 50, activePetId: petId });
        state.data.estate.hiredMercId = mercId;
        state.data.pets = [{ id: petId, tier: 'gold', level: 1, exp: 0, stamina: 100, apt: { ...PET_CONFIGS[petId].defaultApt }, skills: [] }];
        const strike = getPlayerSynergyStrike(state.data);
        assert.equal(strike.id, expected);
        const stats = { hp: 20000, maxHp: 20000, mp: 0, maxMp: 0, atk: 100, def: 0, speed: 50, hit: 100, crit: 0, dodge: 0, counter: 0, lifesteal: 0 };
        const result = runCombat(stats, { hp: 100000, maxHp: 100000, atk: 70, def: 100, speed: 40 }, state.data,
          { name: 'Formation target', hasPhases: true, phase1Shield: 5000, phase2EnrageHp: 0 });
        const synergyLogs = result.logs.filter(log => log.message.includes('全屏合击奥义'));
        assert.equal(synergyLogs.length, 1);
        assert.ok(synergyLogs[0].message.includes(strike.name));
        if (strike.shatterShield) {
          const index = result.logs.findIndex(log => log.message.includes('烈火破界'));
          assert.ok(index > 0);
          const remaining = Number(result.logs.slice(0, index).reverse().find(log => /余盾 \d+/.test(log.message)).message.match(/余盾 (\d+)/)[1]);
          assert.ok(remaining > 0 && remaining < 5000, 'First real attack must already have consumed part of the shield');
          assert.ok(result.logs[index].message.includes(`剩余的 ${remaining} 点`), 'Shatter must remove the actual remaining shield');
          assert.ok(synergyLogs[0].enemyHp < 100000, 'Shatter strike did not reach actual enemy health');
        }
        state.data.pets[0].stamina = 59;
        assert.equal(getPlayerSynergyStrike(state.data).id, getSynergyStrike(classId).id);
        state.data.pets[0].stamina = 100;
        state.data.activePetId = null;
        state.data.supportPetIds = [petId, null];
        assert.equal(getPlayerSynergyStrike(state.data).id, getSynergyStrike(classId).id, 'A support cannot impersonate an active main');
      }
    }
  } finally { Math.random = random; }
});
