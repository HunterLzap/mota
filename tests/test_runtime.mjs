import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
};
const { storage } = await import('../js/core/storage.js');
const { GameState } = await import('../js/core/state.js');
const { QUEST_LIST } = await import('../js/config/quests.js');
const { gameState } = await import('../js/core/state.js');
const { BattleView } = await import('../js/ui/battleView.js');
const { CLASSES } = await import('../js/config/classes.js');
const { runCombat } = await import('../js/core/combat.js');
const { TownView } = await import('../js/ui/townView.js');
const { getSynergyStrike, DUNGEON_GATES, getDungeonFloorGuard } = await import('../js/config/dungeons.js');
const { RUNES, RUNIC_WORDS } = await import('../js/config/runes.js');
const { generateDungeonDrop } = await import('../js/config/dungeons.js');
const { ITEM_SLOTS, OFFICIAL_SETS } = await import('../js/config/items.js');
const { getClassSkills } = await import('../js/config/classes.js');
const { STRONGHOLDS } = await import('../js/config/factionWar.js');
const { ROYAL_TRIALS } = await import('../js/config/trials.js');
const { MAPS } = await import('../js/config/maps.js');
const { PET_CONFIGS } = await import('../js/config/pets.js');
const { LANDMARK_BOSSES } = await import('../js/config/towerLevels.js');

function test(name, run) {
  run();
  console.log(`PASS ${name}`);
}

test('constructing state must not overwrite a saved character', () => {
  storage.save({ name: 'Saved mage', classId: 'mage', level: 12, hasChosenClass: true });
  const state = new GameState();
  assert.equal(storage.load().name, 'Saved mage');
  state.loadOrInit();
  assert.equal(state.data.classId, 'mage');
  assert.equal(state.data.level, 12);
});

test('new and unfinished saves require character creation', () => {
  values.clear();
  const state = new GameState();
  state.loadOrInit();
  assert.equal(state.data.hasChosenClass, false);
  state.loadOrInit();
  assert.equal(state.data.hasChosenClass, false);
});

test('loading an empty inventory is idempotent and gives no consumables', () => {
  values.clear();
  const state = new GameState();
  state.data.bag = [];
  state.data.hasChosenClass = true;
  storage.save(state.data);
  state.loadOrInit();
  assert.deepEqual(state.data.bag, []);
  state.loadOrInit();
  assert.deepEqual(state.data.bag, []);
});

test('legacy saves keep their class and tolerate a missing inventory', () => {
  storage.save({ classId: 'hunter', name: 'Legacy hunter', level: 8, bag: null });
  const state = new GameState();
  state.loadOrInit();
  assert.equal(state.data.classId, 'hunter');
  assert.equal(state.data.hasChosenClass, true);
  assert.ok(Array.isArray(state.data.bag));
});

test('five slots retain separate character progress', () => {
  for (let slot = 1; slot <= 5; slot++) {
    storage.setActiveSlotId(slot);
    storage.save({ name: `Hero ${slot}`, level: slot, hasChosenClass: true });
  }
  for (let slot = 1; slot <= 5; slot++) {
    storage.setActiveSlotId(slot);
    const state = new GameState();
    state.loadOrInit();
    assert.equal(state.data.name, `Hero ${slot}`);
    assert.equal(state.data.level, slot);
  }
});

test('quest rewards cannot be claimed again or out of order', () => {
  const state = new GameState();
  state.triggerQuestAction('claim_salary');
  assert.equal(state.claimQuestReward('quest_1'), true);
  const after = JSON.stringify(state.data);
  assert.equal(state.claimQuestReward('quest_1'), false);
  assert.equal(JSON.stringify(state.data), after);
  const last = QUEST_LIST.at(-1);
  state.data.currentQuestId = last.id;
  state.data.questProgress[last.id] = { completed: true, current: last.requiredCount };
  assert.equal(state.claimQuestReward(last.id), true);
  const final = JSON.stringify(state.data);
  assert.equal(state.claimQuestReward(last.id), false);
  assert.equal(JSON.stringify(state.data), final);
});

test('battle view plays production logs and settles a victory exactly once', () => {
  const elements = new Map();
  globalThis.document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, {
        style: {}, innerHTML: '', innerText: '', scrollHeight: 0,
        classList: { add() {}, remove() {} },
        handlers: {}, addEventListener(event, fn) { this.handlers[event] = fn; },
        appendChild() {}
      });
      return elements.get(id);
    },
    createElement() { return { style: {}, classList: { add() {}, remove() {} } }; }
  };
  gameState.data = gameState.createDefaultData();
  gameState.data.hasChosenClass = true;
  const view = new BattleView('battle-overlay');
  let settlements = 0;
  view.start({ enemyData: { name: 'Test guard' },
    enemyStats: { hp: 1, atk: 1, def: 0, speed: 1, dodge: -100 },
    onFinish(victory) { assert.equal(victory, true); settlements++; }
  });
  const confirm = document.getElementById('btn-confirm-battle').handlers.click;
  confirm();
  assert.equal(settlements, 0, 'cannot settle before playback finishes');
  view.skipAll();
  assert.equal(view.currentCombat.victory, true);
  assert.match(document.getElementById('btn-confirm-battle').innerText, /领取奖励/);
  confirm();
  confirm();
  assert.equal(settlements, 1);
  assert.equal(view.currentCombat, null);
});

test('class passives affect real attributes and hunter agility affects damage', () => {
  const state = new GameState();
  state.data.equipped = {};
  state.data.activePetId = null;
  state.data.nation = 'kester';
  state.data.estate.hiredMercId = null;
  state.data.factionWar.militaryRank = null;
  state.data.classId = 'warrior';
  assert.equal(state.getEffectiveStats().maxHp, 640);
  assert.equal(state.getEffectiveStats().def, 55);
  assert.equal(state.getEffectiveStats().critDmg, 35);
  state.data.classId = 'mage';
  assert.equal(state.getEffectiveStats().maxMp, 410);
  state.data.classId = 'hunter';
  const before = state.getEffectiveStats();
  state.data.allocatedStats.dex = 10;
  const after = state.getEffectiveStats();
  assert.ok(after.atk > before.atk);
  assert.ok(after.speed > before.speed);
});

function combatFixture(classId, enemyData = {}, overrides = {}) {
  const state = new GameState();
  state.data.classId = classId;
  state.data.activePetId = null;
  state.data.equipped = {};
  state.data.estate.hiredMercId = null;
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    return runCombat({ hp: 5000, maxHp: 5000, mp: 150, maxMp: 500, atk: 100, def: 0,
      speed: 50, hit: 100, crit: 0, counter: 0, dodge: 0, lifesteal: 0, ...overrides },
    { hp: 4000, maxHp: 4000, atk: 200, def: 0, speed: 40, hit: 100, crit: 0, dodge: 0 },
    state.data, { name: 'Training guard', ...enemyData });
  } finally { Math.random = originalRandom; }
}

test('mage shields and PVE regeneration execute, while PVP disables auras', () => {
  const pve = combatFixture('mage');
  assert.ok(pve.logs.some(log => log.message.includes('寒冰护盾')));
  assert.ok(pve.logs.some(log => log.message.includes('烈焰护盾')));
  assert.ok(pve.logs.some(log => log.message.includes('职业光环')));
  const pvp = combatFixture('mage', { isPvp: true });
  assert.ok(!pvp.logs.some(log => log.message.includes('职业光环')));
  assert.ok(pvp.logs.some(log => log.message.includes('寒冰护盾')));
});

test('cold arrow slows a target once and does not compound every hit', () => {
  const original = CLASSES.mage.skills;
  CLASSES.mage.skills = original.filter(skill => skill.id !== 'm_sk_9');
  try {
    const result = combatFixture('mage', {}, { mp: 1000, maxMp: 1000 });
    assert.equal(result.logs.filter(log => log.message.includes('寒冰减速')).length, 1);
  } finally { CLASSES.mage.skills = original; }
});

test('hatching consumes one egg and cannot create duplicate pet identities', () => {
  const state = new GameState();
  state.data.bag = [{ id: 'pet_egg_random', type: 'egg', count: 1 }];
  const before = state.data.pets.length;
  assert.equal(state.hatchPetEgg().success, true);
  assert.equal(state.data.pets.length, before + 1);
  assert.equal(state.data.bag.length, 0);
  assert.equal(state.hatchPetEgg().success, false);
  assert.equal(new Set(state.data.pets.map(pet => pet.id)).size, state.data.pets.length);
});

test('learning requires a book, consumes it, and rejects duplicates', () => {
  const state = new GameState();
  state.data.bag = [];
  const id = state.data.activePetId;
  assert.equal(state.learnPetSkill(id, 'book_swift').success, false);
  state.data.bag = [{ id: 'book_swift', count: 2 }];
  const before = state.getEffectiveStats();
  assert.equal(state.learnPetSkill(id, 'book_swift').success, true);
  assert.equal(state.data.bag[0].count, 1);
  assert.equal(state.getEffectiveStats().speed, before.speed + 30);
  assert.equal(state.learnPetSkill(id, 'book_swift').success, false);
  assert.equal(state.data.bag[0].count, 1);
  state.data.pets[0].stamina = 59;
  assert.ok(state.getEffectiveStats().speed < before.speed + 30);
});

test('idle rewards persist time and cannot be clicked repeatedly for free resources', () => {
  const state = new GameState();
  state.data.lastIdleClaimTime = 1_000_000;
  assert.equal(state.claimIdleRewards(1_000_001).success, false);
  assert.equal(state.claimIdleRewards(1_090_000).success, true);
  assert.equal(state.data.lastIdleClaimTime, 1_060_000);
  const after = JSON.stringify(state.data);
  assert.equal(state.claimIdleRewards(1_090_000).success, false);
  assert.equal(JSON.stringify(state.data), after);
  storage.save(state.data);
  state.loadOrInit();
  assert.equal(state.data.lastIdleClaimTime, 1_060_000);
  assert.equal(state.getIdleRewards(1_000_000).minutes, 0);
  assert.equal(state.getIdleRewards(100_000_000).minutes, 600);
});

test('milestone quests require their exact floor or actual gem inlay', () => {
  const state = new GameState();
  state.data.currentQuestId = 'quest_9';
  state.triggerQuestAction('clear_tower');
  state.triggerQuestAction('clear_tower_1');
  assert.ok(!state.data.questProgress.quest_9?.completed);
  assert.equal(state.triggerQuestAction('clear_tower_10').completed, true);
  state.data.currentQuestId = 'quest_10';
  state.triggerQuestAction('punch_socket');
  assert.ok(!state.data.questProgress.quest_10?.completed);
  assert.equal(state.triggerQuestAction('socket_gem').completed, true);
});

test('active pets gain actual experience while exhausted pets do not', () => {
  const state = new GameState();
  const pet = state.data.pets[0];
  state.addExp(180);
  assert.equal(pet.level, 2);
  assert.equal(pet.exp, 0);
  pet.stamina = 0;
  state.addExp(180);
  assert.equal(pet.exp, 0);
  assert.equal(state.feedPet(pet.id).success, true);
  assert.equal(pet.stamina, 35);
});

test('potions consume materials, obey three-fight expiry, and grant permanent points correctly', () => {
  const state = new GameState();
  const before = state.getEffectiveStats().maxHp;
  assert.equal(state.brewPotion('pot_titan').success, true);
  assert.ok(state.getEffectiveStats().maxHp > before);
  state.completeBattle();
  state.completeBattle();
  assert.equal(state.data.estate.activePotions.length, 1);
  state.completeBattle();
  assert.equal(state.data.estate.activePotions.length, 0);
  state.data.estate.herbs = { herb_dragonblood: 6, herb_starlight: 6, herb_spiritflower: 6 };
  state.data.crystal = 60;
  const points = state.data.freeStatPoints;
  assert.equal(state.brewPotion('pot_dragonblood').success, true);
  assert.equal(state.data.freeStatPoints, points + 5);
  assert.equal(state.data.crystal, 0);
  assert.equal(state.data.estate.activePotions.length, 0);
  assert.equal(state.brewPotion('pot_dragonblood').success, false);
});

test('daily activity entries reset once across days and survive same-day reload', () => {
  const state = new GameState();
  state.data.castle.entriesLeft = 0;
  state.data.dungeon.entriesLeft = 0;
  state.data.dragon.trialsLeft = 0;
  state.data.dailyResetDate = 'yesterday';
  assert.equal(state.resetDailyActivities(), true);
  assert.equal(state.data.castle.entriesLeft, 3);
  assert.equal(state.data.dungeon.entriesLeft, 5);
  assert.equal(state.data.dragon.trialsLeft, 3);
  state.data.castle.entriesLeft--;
  assert.equal(state.resetDailyActivities(), false);
  storage.save(state.data);
  state.loadOrInit();
  assert.equal(state.data.castle.entriesLeft, 2);
});

test('mercenary hiring charges the configured cost and rejects invalid or repeat purchases', () => {
  const state = new GameState();
  state.data.gold = 5000;
  assert.equal(state.hireMercenary('unknown').success, false);
  assert.equal(state.hireMercenary('merc_cleric').success, true);
  assert.equal(state.data.gold, 0);
  assert.equal(state.hireMercenary('merc_cleric').success, false);
  assert.equal(state.hireMercenary('merc_bard').success, false);
  assert.equal(state.data.estate.hiredMercId, 'merc_cleric');
});

test('estate harvest requires elapsed time, preserves partial growth and cannot be repeated', () => {
  const state = new GameState();
  const start = state.data.estate.lastHarvestTime;
  const before = state.data.crystal;
  assert.equal(state.harvestEstate(start).success, false);
  assert.equal(state.harvestEstate(start + 31 * 60000).success, true);
  assert.equal(state.data.crystal, before + 25);
  assert.equal(state.data.estate.lastHarvestTime, start + 30 * 60000);
  assert.equal(state.harvestEstate(start + 31 * 60000).success, false);
  assert.equal(state.harvestEstate(start + 600 * 60000).success, true);
  assert.equal(state.data.crystal, before + 500);
});

test('switching patrol maps settles the old rate and cannot upgrade prior elapsed time', () => {
  const state = new GameState();
  const now = state.data.lastIdleClaimTime + 5 * 60000;
  assert.equal(state.setPatrolMap('canyon', now).success, false);
  state.data.level = 20;
  const before = state.data.gold;
  assert.equal(state.setPatrolMap('canyon', now).success, true);
  assert.equal(state.data.gold, before + 5 * 80);
  assert.equal(state.getIdleRewards(now).minutes, 0);
  assert.equal(state.getIdleRewards(now + 60000).gold, 220);
});

test('all dragon cards render configured stats and rewards without undefined fields', () => {
  gameState.data = gameState.createDefaultData();
  const html = TownView.prototype.renderDragons.call({});
  assert.match(html, /28,000/);
  assert.match(html, /黄金宠物蛋/);
  assert.ok(!html.includes('undefined'));
});

test('class-specific synergy is not overridden by the common starting pet or mercenary', () => {
  assert.equal(getSynergyStrike('mage', 'merc_paladin', 'golden_dragon').id, 'crimson_cataclysm');
  assert.equal(getSynergyStrike('hunter', 'merc_paladin', 'golden_dragon').id, 'gale_phantom');
  assert.equal(getSynergyStrike('warrior', 'merc_cleric', 'phoenix').id, 'divine_verdict');
});

test('equipment attributes and rune crit damage and reduction affect production stats', () => {
  const state = new GameState();
  state.data.equipped = {};
  const before = state.getEffectiveStats();
  state.data.equipped.weapon = { stats: { str: 20, critDmg: 15, dmgResist: 4 },
    durability: 100, gems: [{ id: 'rune_jah' }, { id: 'rune_cham' }] };
  const after = state.getEffectiveStats();
  assert.ok(after.atk >= before.atk + 52);
  assert.equal(after.critDmg, before.critDmg + 30);
  assert.equal(after.dmgResist, before.dmgResist + 8);
  state.data.equipped.weapon.durability = 0;
  assert.deepEqual(state.getEffectiveStats(), before);
});

test('repair refuses insufficient gold without changing durability', () => {
  const state = new GameState();
  state.data.equipped = { weapon: { durability: 20, maxDurability: 100 } };
  state.data.gold = 399;
  assert.equal(state.repairAllEquipment().success, false);
  assert.equal(state.data.equipped.weapon.durability, 20);
  assert.equal(state.data.gold, 399);
  state.data.gold = 400;
  assert.equal(state.repairAllEquipment().success, true);
  assert.equal(state.data.gold, 0);
  assert.equal(state.data.equipped.weapon.durability, 100);
});

test('backup parsing accepts valid legacy data and rejects corrupt structures before mutation', () => {
  const data = { classId: 'mage', level: 20, bag: [], pets: [], gold: 100 };
  assert.deepEqual(storage.parseBackupText(JSON.stringify({ saveData: data })), data);
  assert.deepEqual(storage.parseBackupText(JSON.stringify({ data })), data);
  for (const invalid of [{ ...data, bag: {} }, { ...data, gold: -1 }, { ...data, classId: 'unknown' },
    { ...data, level: 0 }, { ...data, equipped: [] }, { ...data, pets: [null] },
    { ...data, bag: [null] }, { ...data, bag: [{ id: 'bad', stats: { atk: 'wrong' } }] },
    { ...data, allocatedStats: { str: 10 } }]) {
    assert.throws(() => storage.parseBackupText(JSON.stringify({ saveData: invalid })));
  }
  const full = new GameState().createDefaultData();
  assert.deepEqual(storage.parseBackupText(JSON.stringify({ saveData: full })), full);
});

test('quest gear normalizes level and set identity and unsupported slots cannot become invisible equipment', () => {
  const state = new GameState();
  state.data.currentQuestId = 'quest_9';
  state.triggerQuestAction('clear_tower_10');
  assert.equal(state.claimQuestReward('quest_9'), true);
  const item = state.data.bag.find(item => item.id === 'courage_sword');
  assert.equal(item.setId, 'courage');
  assert.equal(item.reqLevel, 25);
  assert.equal(state.equipItem(item.uid).success, false);
  state.data.level = 25;
  assert.equal(state.equipItem(item.uid).success, true);
  state.data.bag.push({ uid: 'unsupported', slot: 'shield', stats: { atk: 10000 } });
  assert.equal(state.equipItem('unsupported').success, false);
  assert.ok(state.data.bag.some(item => item.uid === 'unsupported'));
});

test('boss phases trigger once at actual health thresholds and counters respect the shield', () => {
  const state = new GameState();
  state.data.classId = 'warrior'; state.data.activePetId = null; state.data.estate.hiredMercId = null;
  const original = Math.random;
  Math.random = () => 0.5;
  try {
    const result = runCombat({ hp: 5000, maxHp: 5000, mp: 0, maxMp: 0, atk: 100, def: 0,
      speed: 50, hit: 100, crit: 0, counter: 100, dodge: 0, lifesteal: 0 },
    { hp: 1000, maxHp: 1000, atk: 1, def: 0, speed: 10, hit: 100, crit: 0, dodge: 0 },
    state.data, { name: 'Phased guard', hasPhases: true, phase1Shield: 1000,
      phase2EnrageHp: 500, phase3Minion: 'Minion' });
    const firstCounter = result.logs.find(log => log.type === 'counter');
    assert.equal(firstCounter.enemyHp, 1000, 'counter must not bypass an intact shield');
    assert.equal(result.logs.filter(log => log.message.includes('绝境嗜血狂暴')).length, 1);
    assert.equal(result.logs.filter(log => log.message.includes('冥府死契召唤')).length, 1);
    assert.equal(result.victory, true);
  } finally { Math.random = original; }
});

test('bounties enforce eligibility and cannot reset completed rewards', () => {
  const state = new GameState();
  const id = 'bounty_shadow_wolf';
  assert.equal(state.acceptBounty('unknown').success, false);
  assert.equal(state.acceptBounty(id).success, false);
  assert.equal(state.completeBountyBattle(id).success, false);
  state.data.level = 5;
  assert.equal(state.acceptBounty(id).success, true);
  assert.equal(state.completeBountyBattle(id).success, true);
  assert.equal(state.acceptBounty(id).success, false);
  assert.equal(state.claimBountyReward(id).success, true);
  assert.equal(state.completeBountyBattle(id).success, false);
  assert.equal(state.claimBountyReward(id).success, false);
});

test('servant production cannot be repeated instantly and cooldown survives reload', () => {
  const state = new GameState();
  state.data.slaves.list = [{ id: 'worker', name: 'Worker', level: 10 }];
  const now = Date.now();
  assert.equal(state.assignSlaveMine('worker', now).success, true);
  assert.equal(state.disciplineSlave('worker', now).success, true);
  const gold = state.data.gold;
  assert.equal(state.assignSlaveMine('worker', now + 1).success, false);
  assert.equal(state.disciplineSlave('worker', now + 1).success, false);
  assert.equal(state.data.gold, gold);
  state.loadOrInit();
  assert.equal(state.assignSlaveMine('worker', now + 1).success, false);
  assert.equal(state.assignSlaveMine('worker', now + 30 * 60000).success, true);
});

test('pet evolution consumes one stone and resets both level and experience', () => {
  const state = new GameState();
  const pet = state.data.pets[0];
  pet.level = 30; pet.exp = 500;
  state.data.bag.push({ id: 'evolution_stone', count: 1 });
  assert.equal(state.evolvePet(pet.id).success, true);
  assert.equal(pet.tier, 'darkgold');
  assert.equal(pet.level, 1);
  assert.equal(pet.exp, 0);
  assert.equal(state.evolvePet(pet.id).success, false);
  pet.level = 40; pet.exp = 900;
  state.data.bag.push({ id: 'destiny_stone', count: 1 });
  assert.equal(state.evolvePet(pet.id).success, true);
  assert.equal(pet.exp, 0);
  assert.equal(pet.tier, 'purplegold');
});

test('ordered armor runes consume inventory, activate a word and return safely on removal', () => {
  const state = new GameState();
  state.data.equipped.armor.sockets = 2;
  state.data.equipped.armor.gems = [];
  state.data.gold = 10000;
  state.data.bag.push({ ...RUNES.rune_cham, count: 1, uid: 'cham' }, { ...RUNES.rune_lo, count: 1, uid: 'lo' });
  assert.equal(state.inlayGem('armor', 0, 'cham').success, true);
  assert.equal(state.inlayGem('armor', 1, 'lo').success, true);
  assert.equal(state.data.equipped.armor.runicWord, 'lionheart');
  assert.ok(!state.data.bag.some(item => item.uid === 'cham'));
  assert.equal(state.removeGem('armor', 0).success, true);
  assert.equal(state.data.equipped.armor.runicWord, null);
  assert.ok(state.data.bag.some(item => item.id === 'rune_cham'));
});

test('faction victory, salary and exchange settle configured resources without repeat salary', () => {
  const state = new GameState();
  const fort = STRONGHOLDS[0];
  assert.equal(state.challengeStronghold(fort.id).success, false);
  state.data.level = fort.reqLevel;
  assert.equal(state.challengeStronghold(fort.id).success, true);
  const before = state.data.factionWar.merit;
  assert.equal(state.completeStrongholdVictory(fort.id).success, true);
  assert.equal(state.data.factionWar.merit, before + fort.meritReward);
  assert.equal(state.claimFactionSalary().success, true);
  assert.equal(state.claimFactionSalary().success, false);
  state.data.bag = [];
  state.data.factionWar.merit = 100;
  assert.equal(state.exchangeFactionReward('key_mithril').success, true);
  assert.equal(state.data.factionWar.merit, 0);
  assert.ok(state.data.bag.some(item => item.id === 'key_mithril'));
  assert.equal(state.exchangeFactionReward('key_mithril').success, false);
});

test('the royal mission hands off to the continuation without repeating its rewards', () => {
  const state = new GameState();
  state.data.currentQuestId = 'quest_20';
  state.triggerQuestAction('evolve_purplegold');
  assert.equal(state.claimQuestReward('quest_20'), true);
  assert.equal(state.data.currentQuestId, 'quest_21');
  assert.deepEqual(state.triggerQuestAction('enhance_gear'), { matched: false, completed: false });
  assert.equal(state.claimQuestReward('quest_20'), false);
  state.loadOrInit();
  assert.equal(state.data.currentQuestId, 'quest_21');
});

test('Hermes rune word grants the declared critical bonus only on the first turn', () => {
  const state = new GameState();
  state.data.classId = 'warrior'; state.data.activePetId = null; state.data.estate.hiredMercId = null;
  state.data.equipped = { boots: { name: 'Boots', runicWord: 'hermes' } };
  const original = Math.random;
  Math.random = () => 0.15;
  try {
    const result = runCombat({ hp: 5000, maxHp: 5000, mp: 0, maxMp: 0, atk: 100, def: 0,
      speed: 50, hit: 100, crit: 0, counter: 0, dodge: 0, lifesteal: 0 },
    { hp: 1000, maxHp: 1000, atk: 1, def: 0, speed: 10, hit: 100, crit: 0, dodge: 0 }, state.data, { name: 'Guard' });
    assert.ok(result.logs.some(log => log.turn === 1 && log.type === 'crit'));
    assert.ok(!result.logs.some(log => log.turn > 1 && log.type === 'crit'));
    state.data.equipped.boots.durability = 0;
    const broken = runCombat({ hp: 5000, maxHp: 5000, mp: 0, maxMp: 0, atk: 100, def: 0,
      speed: 50, hit: 100, crit: 0, counter: 0, dodge: 0, lifesteal: 0 },
      { hp: 1000, maxHp: 1000, atk: 1, def: 0, speed: 10, hit: 100, crit: 0, dodge: 0 }, state.data, { name: 'Guard' });
    assert.ok(!broken.logs.some(log => log.type === 'crit' || log.message.includes('远古神铸')));
  } finally { Math.random = original; }
});

test('full inventory preserves owned equipment moves and allows existing material stacks', () => {
  const state = new GameState();
  state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: `material_${i}`, count: 1 }));
  assert.equal(state.addItemToBag({ id: 'material_0', count: 3 }), true);
  assert.equal(state.data.bag[0].count, 4);
  assert.equal(state.addItemToBag({ id: 'new_material', count: 1 }), false);
  const weapon = state.data.equipped.weapon;
  assert.equal(state.unequipItem('weapon').success, true);
  assert.equal(state.data.bag.length, 41);
  assert.ok(state.data.bag.includes(weapon));
  assert.equal(state.equipItem(weapon.uid).success, true);
  assert.equal(state.data.bag.length, 40);
  assert.equal(state.data.equipped.weapon, weapon);
});

test('legacy quest and dungeon gear migrate requirements, set identity and sockets without item duplication', () => {
  const state = new GameState();
  state.data.bag = [{ uid: 'legacy_gear', slot: 'weapon', level: 25, set: 'courage', holes: 2, stats: { atk: 95 } }];
  storage.save(state.data);
  state.loadOrInit(); state.loadOrInit();
  assert.equal(state.data.bag.length, 1);
  assert.equal(state.data.bag[0].reqLevel, 25);
  assert.equal(state.data.bag[0].setId, 'courage');
  assert.equal(state.data.bag[0].sockets, 2);
  assert.equal(state.data.bag[0].durability, 100);
  assert.equal(state.equipItem('legacy_gear').success, false);
});

test('approved shield replacement produces wearable ten-slot quest and dungeon gloves', () => {
  const state = new GameState();
  state.data.currentQuestId = 'quest_6';
  state.triggerQuestAction('clear_tower_1');
  assert.equal(state.claimQuestReward('quest_6'), true);
  const gloves = state.data.bag.find(item => item.id === 'courage_gloves');
  assert.equal(gloves.slot, 'gloves');
  assert.equal(gloves.stats.def, 95);
  state.data.level = 25;
  assert.equal(state.equipItem(gloves.uid).success, true);
  const original = Math.random;
  Math.random = () => 0.99;
  try {
    const drop = generateDungeonDrop('trial_gate');
    assert.equal(drop.id, 'courage_gloves');
    assert.equal(drop.slot, 'gloves');
    assert.equal(drop.stats.def, 75);
    assert.equal(drop.sockets, 2);
  } finally { Math.random = original; }
  for (const word of RUNIC_WORDS) {
    assert.ok(word.validSlots.every(id => ITEM_SLOTS.some(slot => slot.id === id)));
  }
});

test('legacy shields migrate once while preserving owned gloves and every item identity', () => {
  const state = new GameState();
  state.data.bag = [{ id: 'courage_shield', uid: 'bag_shield', slot: 'offhand', level: 25,
    quality: 'purple', set: 'courage', stats: { def: 95, hp: 450 } }];
  state.data.equipped.gloves = { id: 'old_gloves', uid: 'owned_gloves', slot: 'gloves', stats: { def: 10 } };
  state.data.equipped.shield = { id: 'courage_shield', uid: 'equipped_shield', slot: 'shield', stats: { def: 75 } };
  storage.save(state.data);
  state.loadOrInit(); state.loadOrInit();
  assert.equal(state.data.equipped.gloves.uid, 'owned_gloves');
  assert.equal(state.data.equipped.shield, undefined);
  assert.equal(state.data.bag.length, 2);
  assert.deepEqual(state.data.bag.map(item => item.uid).sort(), ['bag_shield', 'equipped_shield']);
  assert.ok(state.data.bag.every(item => item.id === 'courage_gloves' && item.slot === 'gloves'));
  assert.equal(state.data.bag.find(item => item.uid === 'bag_shield').stats.def, 95);
});

test('promotion retains every previously earned stage bonus', () => {
  const state = new GameState();
  const base = state.getEffectiveStats();
  state.data.royalTrials.completedStage = 2;
  const promoted = state.getEffectiveStats();
  assert.equal(promoted.atk - base.atk, ROYAL_TRIALS[0].statsBonus.atk + ROYAL_TRIALS[1].statsBonus.atk);
  assert.equal(promoted.maxHp - base.maxHp, 900);
  assert.equal(promoted.def - base.def, 20);
});

test('equipment maxHp and maxMp aliases affect actual combat stats while broken gear does not', () => {
  const state = new GameState();
  const base = state.getEffectiveStats();
  state.data.equipped.ring = { slot: 'ring', durability: 100, stats: { maxHp: 180, maxMp: 60 } };
  const equipped = state.getEffectiveStats();
  assert.equal(equipped.maxHp - base.maxHp, 180);
  assert.equal(equipped.maxMp - base.maxMp, 60);
  state.data.equipped.ring.durability = 0;
  assert.equal(state.getEffectiveStats().maxHp, base.maxHp);
});

test('claiming wolf quest through any caller spawns the thief and persists story progression', () => {
  const state = new GameState();
  state.data.currentQuestId = 'quest_17';
  state.triggerQuestAction('slay_wild_boss');
  assert.equal(state.claimQuestReward('quest_17'), true);
  assert.equal(state.data.currentQuestId, 'quest_18');
  assert.equal(state.data.maskedThief.appeared, true);
  storage.save(state.data);
  state.loadOrInit();
  assert.equal(state.data.maskedThief.appeared, true);
  assert.equal(state.claimQuestReward('quest_17'), false);
});

test('ordinary wild rewards use map configuration and sustained victories replenish pet food across reloads', () => {
  values.clear();
  const state = new GameState();
  state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: `filled_${i}`, count: 1 }));
  const startGold = state.data.gold;
  const original = Math.random;
  Math.random = () => 0.99; // No random loot; only the guaranteed ration.
  try {
    for (let i = 0; i < 9; i++) assert.equal(state.settleWildVictory('forest', 0).success, true);
    assert.equal(state.data.bag.some(item => item.id === 'pet_food'), false);
    storage.save(state.data); state.loadOrInit();
    const reward = state.settleWildVictory('forest', 0);
    assert.equal(reward.exp, MAPS[0].monsters[0].exp);
    assert.equal(state.data.gold - startGold, 10 * MAPS[0].monsters[0].gold);
    assert.equal(state.data.bag.find(item => item.id === 'pet_food').count, 1);
    assert.equal(state.data.bag.length, 41);
    for (let i = 0; i < 10; i++) state.settleWildVictory('forest', 0);
    assert.equal(state.data.bag.find(item => item.id === 'pet_food').count, 2);
    const before = JSON.stringify(state.data);
    assert.equal(state.settleWildVictory('volcano', 0).success, false);
    assert.equal(state.settleWildVictory('forest', -1).success, false);
    assert.equal(JSON.stringify(state.data), before);
  } finally { Math.random = original; }
});

test('milestone reconciliation recognizes earned titles and evolved pets without granting duplicate rewards', () => {
  const state = new GameState();
  state.data.currentQuestId = 'quest_11';
  state.data.royalTrials.completedStage = 1;
  state.triggerQuestAction('slay_dragon');
  assert.equal(state.claimQuestReward('quest_11'), true);
  assert.equal(state.data.questProgress.quest_12.completed, true);
  assert.equal(state.claimQuestReward('quest_12'), true);
  const earnedGold = state.data.gold;
  assert.equal(state.claimQuestReward('quest_12'), false);
  assert.equal(state.data.gold, earnedGold);
  state.data.currentQuestId = 'quest_19';
  state.data.pets[0].tier = 'purplegold';
  state.triggerQuestAction('slay_silver_dragon');
  state.claimQuestReward('quest_19');
  assert.equal(state.data.questProgress.quest_20.completed, true);
});

test('new-save first-floor default is not a victory and legacy unfinished thief quests recover', () => {
  const state = new GameState();
  state.data.currentQuestId = 'quest_6';
  state.reconcileQuestMilestones();
  assert.equal(state.data.questProgress.quest_6.completed, false);
  state.data.currentQuestId = 'quest_18';
  state.data.maskedThief.appeared = false;
  storage.save(state.data); state.loadOrInit();
  assert.equal(state.data.maskedThief.appeared, true);
  state.triggerQuestAction('catch_thief');
  state.data.maskedThief.appeared = false;
  storage.save(state.data); state.loadOrInit();
  assert.equal(state.data.maskedThief.appeared, false);
});

test('royal trial settlement enforces current stage, eligibility and one reward per victory callback', () => {
  const state = new GameState();
  assert.equal(state.completeRoyalTrial(0).success, false);
  state.data.level = 20;
  state.data.prestige = 49;
  assert.equal(state.completeRoyalTrial(0).success, false);
  state.data.prestige = 50;
  const gold = state.data.gold;
  assert.equal(state.completeRoyalTrial(0).success, true);
  assert.equal(state.data.royalTrials.completedStage, 1);
  assert.equal(state.data.gold, gold + 2000);
  const completed = JSON.stringify(state.data);
  assert.equal(state.completeRoyalTrial(0).success, false);
  assert.equal(state.completeRoyalTrial(2).success, false);
  assert.equal(JSON.stringify(state.data), completed);
});

test('final promotion damage bonus reaches the combat engine and increases direct attacks once', () => {
  const state = new GameState();
  state.data.royalTrials.completedStage = 7;
  assert.equal(state.getEffectiveStats().dmgBonus, 20);
  state.data.pets = []; state.data.activePetId = null; state.data.estate.hiredMercId = null;
  state.data.slaves.list = [];
  const original = Math.random;
  Math.random = () => 0.99;
  try {
    const stats = { hp: 10000, maxHp: 10000, mp: 0, maxMp: 0, atk: 100, def: 100,
      speed: 100, crit: 0, dodge: 0, hit: 200, counter: 0, lifesteal: 0 };
    const enemy = { hp: 100000, atk: 1, def: 0, speed: 1, crit: 0, dodge: 0, counter: 0 };
    const firstDamage = bonus => {
      const result = runCombat({ ...stats, dmgBonus: bonus }, enemy, state.data, { name: 'Target' });
      return 100000 - result.logs.find(log => log.enemyHp < 100000).enemyHp;
    };
    assert.equal(firstDamage(20), Math.floor(firstDamage(0) * 1.2));
  } finally { Math.random = original; }
});

test('rune attributes preserve intellect mana, hunter dexterity damage and constitution defense', () => {
  const state = new GameState();
  state.data.classId = 'hunter';
  const base = state.getEffectiveStats();
  state.data.equipped.weapon.gems = [
    { id: 'rune_el', stats: { int: 15 } },
    { id: 'rune_dol', stats: { agi: 15 } },
    { id: 'rune_lo', stats: { con: 20 } }
  ];
  const buffed = state.getEffectiveStats();
  assert.equal(buffed.maxMp - base.maxMp, 120);
  assert.equal(buffed.atk - base.atk, 69);
  assert.equal(buffed.def - base.def, 30);
  assert.equal(buffed.maxHp - base.maxHp, 320);
  assert.equal(buffed.int - base.int, 15);
  assert.equal(buffed.dex - base.dex, 15);
  assert.equal(buffed.con - base.con, 20);
});

test('all-stat reforging grants all four attribute effects rather than only strength and health', () => {
  const state = new GameState();
  state.data.classId = 'hunter';
  const base = state.getEffectiveStats();
  state.data.equipped.weapon.reforge = { stat: 'allStats', val: 10 };
  const reforged = state.getEffectiveStats();
  assert.equal(reforged.atk - base.atk, 72);
  assert.equal(reforged.maxHp - base.maxHp, 160);
  assert.equal(reforged.maxMp - base.maxMp, 80);
  assert.equal(reforged.def - base.def, 15);
  assert.equal(reforged.speed - base.speed, 13);
});

test('mage intellect remains a viable primary attack stat across allocation, gear and runes', () => {
  const state = new GameState();
  state.data.classId = 'mage';
  const base = state.getEffectiveStats();
  state.data.allocatedStats.int = 10;
  const allocated = state.getEffectiveStats();
  assert.equal(allocated.atk - base.atk, 26);
  assert.equal(allocated.maxMp - base.maxMp, 80);
  state.data.allocatedStats.int = 0;
  state.data.equipped.ring = { slot: 'ring', stats: { int: 10 }, durability: 100 };
  assert.equal(state.getEffectiveStats().atk, allocated.atk);
  state.data.equipped.ring = null;
  state.data.equipped.weapon.gems = [{ id: 'rune_el', stats: { int: 10 } }];
  assert.equal(state.getEffectiveStats().atk, allocated.atk);
  assert.equal(state.getEffectiveStats().maxMp, allocated.maxMp);
  state.data.equipped.weapon.gems = [];
  state.data.allocatedStats.str = 10;
  assert.equal(state.getEffectiveStats().atk, allocated.atk);
  assert.ok(state.getEffectiveStats().maxMp < allocated.maxMp);
});

test('explicit zero enemy critical chance is not replaced with the default chance', () => {
  const state = new GameState();
  state.data.pets = []; state.data.activePetId = null; state.data.estate.hiredMercId = null;
  const original = Math.random;
  Math.random = () => 0.05;
  try {
    const stats = { hp: 10000, maxHp: 10000, mp: 0, maxMp: 0, atk: 1, def: 0,
      speed: 1, hit: 100, crit: 0, dodge: 0, counter: 0, lifesteal: 0 };
    const result = runCombat(stats, { hp: 100000, atk: 100, def: 0, speed: 100, crit: 0, dodge: 0 }, state.data, { name: 'No-crit guard' });
    const firstHit = result.logs.find(log => log.playerHp < 10000);
    assert.equal(10000 - firstHit.playerHp, 91);
  } finally { Math.random = original; }
});

test('wild supply counters accept valid backups, reject corrupt imports and migrate local legacy data safely', () => {
  const state = new GameState();
  state.data.wildVictories = 9;
  assert.equal(storage.parseBackupText(JSON.stringify({ saveData: state.data })).wildVictories, 9);
  for (const invalid of ['9', -1, 1.5]) {
    state.data.wildVictories = invalid;
    assert.throws(() => storage.parseBackupText(JSON.stringify({ saveData: state.data })), /讨伐计数/);
  }
  storage.save(state.data); state.loadOrInit();
  assert.equal(state.data.wildVictories, 0);
  delete state.data.wildVictories;
  storage.save(state.data); state.loadOrInit();
  assert.equal(state.data.wildVictories, 0);
});

test('new characters hire their first companion with earned gold while existing contracts survive reload', () => {
  values.clear();
  const state = new GameState();
  assert.equal(state.data.estate.hiredMercId, null);
  storage.save(state.data); state.loadOrInit();
  assert.equal(state.data.estate.hiredMercId, null);
  assert.equal(state.hireMercenary('merc_paladin').success, false);
  state.gainCurrency(8000);
  const gold = state.data.gold;
  assert.equal(state.hireMercenary('merc_paladin').success, true);
  assert.equal(state.data.gold, gold - 8000);
  storage.save(state.data); state.loadOrInit();
  assert.equal(state.data.estate.hiredMercId, 'merc_paladin');
});

test('wild boss settlement follows configured currencies and quality and only the forest advances the wolf quest', () => {
  for (const map of MAPS) {
    const state = new GameState();
    const locked = JSON.stringify(state.data);
    assert.equal(state.settleWildBossVictory(map.id).success, false);
    assert.equal(JSON.stringify(state.data), locked);
    state.data.level = map.boss.level;
    state.data.currentQuestId = 'quest_17';
    const gold = state.data.gold;
    const crystal = state.data.crystal;
    const reward = state.settleWildBossVictory(map.id);
    assert.equal(reward.success, true);
    assert.equal(state.data.gold - gold, map.boss.gold);
    assert.equal(state.data.crystal - crystal, map.boss.crystal);
    assert.equal(reward.gear.quality, map.boss.dropQuality);
    assert.equal(reward.drop.count, map.boss.guaranteedDrop.count);
    assert.equal(Boolean(state.data.questProgress.quest_17?.completed), map.id === 'forest');
  }
});

test('bard exploration rewards apply once to wild hunts and boss fights but leave salary and other currencies alone', () => {
  const state = new GameState();
  state.data.estate.hiredMercId = 'merc_bard';
  assert.deepEqual(state.getExplorationReward(100, 20), { gold: 140, crystal: 21 });
  const gold = state.data.gold;
  const crystal = state.data.crystal;
  const hunt = state.settleWildVictory('forest', 0);
  assert.equal(hunt.gold, Math.floor(MAPS[0].monsters[0].gold * 1.4));
  assert.equal(hunt.crystal, 3);
  assert.equal(state.data.gold - gold, hunt.gold);
  assert.equal(state.data.crystal - crystal, 3);
  state.data.level = 15;
  const boss = state.settleWildBossVictory('forest');
  assert.equal(boss.gold, 7000);
  assert.equal(boss.crystal, 31);
  const beforeSalary = state.data.gold;
  state.claimSalary();
  assert.equal(state.data.gold - beforeSalary, 1500);
  const beforeQuest = state.data.gold;
  state.claimQuestReward('quest_1');
  assert.equal(state.data.gold - beforeQuest, QUEST_LIST[0].rewards.gold);
});

test('tower first clears grant every configured item and crystal once, replay rewards survive reload', () => {
  values.clear();
  const state = new GameState();
  state.data.castle.isExploring = true;
  state.data.bag = Array.from({ length: 60 }, (_, i) => ({ id: `existing_${i}`, count: 1 }));
  for (const [key, boss] of Object.entries(LANDMARK_BOSSES)) {
    const floor = Number(key);
    state.data.castle.floor = floor;
    const crystal = state.data.crystal;
    const gold = state.data.castle.accumulatedGold;
    const reward = state.settleCastleVictory(floor);
    assert.equal(reward.firstClear, true);
    assert.equal(reward.item.id, boss.firstClearReward.item);
    assert.equal(state.data.crystal - crystal, boss.firstClearReward.crystal);
    assert.equal(state.data.castle.accumulatedGold - gold, boss.firstClearReward.gold);
    if (reward.item.slot) {
      assert.ok(ITEM_SLOTS.some(slot => slot.id === reward.item.slot));
      assert.ok(Object.keys(reward.item.stats).length > 0);
      assert.ok(reward.item.reqLevel >= 1 && reward.item.durability === 100);
    }
    assert.equal(state.settleCastleVictory(floor).success, false);
  }
  assert.equal(state.data.bag.length, 72);
  assert.equal(state.data.castle.finished, true);
  storage.save(state.data); state.loadOrInit();
  assert.equal(state.data.castle.claimedBossRewards.length, 12);
  state.data.castle.floor = 10; state.data.castle.finished = false;
  const bagSize = state.data.bag.length;
  const replay = state.settleCastleVictory(10);
  assert.equal(replay.firstClear, false);
  assert.equal(replay.item, null);
  assert.equal(replay.gold, Math.floor(45 * Math.pow(10, 1.2) + 25));
  assert.equal(replay.crystal, 10);
  assert.equal(state.data.bag.length, bagSize);
});

test('tower normal floor and bard reward settle once and out-of-order callbacks cannot pay', () => {
  const state = new GameState();
  assert.equal(state.settleCastleVictory(1).success, false);
  state.data.castle.isExploring = true;
  state.data.estate.hiredMercId = 'merc_bard';
  assert.equal(state.settleCastleVictory(2).success, false);
  const gold = state.data.gold, crystal = state.data.crystal;
  const reward = state.settleCastleVictory(1);
  assert.equal(reward.gold, 98);
  assert.equal(reward.crystal, 3);
  assert.equal(state.data.gold, gold);
  assert.equal(state.data.crystal - crystal, 3);
  assert.equal(state.data.castle.accumulatedGold, 98);
  assert.equal(state.settleCastleVictory(1).success, false);
});

test('legacy tower saves initialize a reward ledger without inventing prior clears and corrupt imports fail', () => {
  const state = new GameState();
  state.data.classId = 'warrior';
  delete state.data.castle.claimedBossRewards;
  state.data.castle.maxReachedFloor = 100;
  storage.save(state.data); state.loadOrInit();
  assert.deepEqual(state.data.castle.claimedBossRewards, []);
  state.data.castle.claimedBossRewards = [10, 10, '20', -1];
  assert.throws(() => storage.parseBackupText(JSON.stringify({ saveData: state.data })), /魔塔首通/);
  storage.save(state.data); state.loadOrInit();
  assert.deepEqual(state.data.castle.claimedBossRewards, [10]);
});

test('reforging requires actual equipment and the explicitly selected valid crystal without fallback consumption', () => {
  const state = new GameState();
  state.data.gold = 10000;
  state.data.bag = state.data.bag.filter(item => !['crystal_gold', 'crystal_darkgold'].includes(item.id));
  state.data.bag.push({ id: 'crystal_darkgold', count: 2, uid: 'dark' });
  const before = JSON.stringify(state.data);
  assert.equal(state.reforgeEquipment('weapon', 'pet_food').success, false);
  assert.equal(state.reforgeEquipment('weapon', 'crystal_gold').success, false);
  assert.equal(state.reforgeEquipment('dark').success, false);
  assert.equal(JSON.stringify(state.data), before);
  assert.equal(state.reforgeEquipment('weapon', 'crystal_darkgold').success, true);
  assert.equal(state.data.gold, 8000);
  assert.equal(state.data.bag.find(item => item.id === 'crystal_darkgold').count, 1);
});

test('all thirteen set bonuses reach stats and four-piece effects cease when one piece breaks', () => {
  const fields = { hp: 'maxHp', mp: 'maxMp', allSkillLv: 'skillLevelBonus' };
  for (const set of Object.values(OFFICIAL_SETS)) {
    const state = new GameState(); state.data.classId = 'warrior';
    state.data.equipped = {}; state.data.activePetId = null;
    const base = state.getEffectiveStats();
    for (const slot of ['weapon', 'armor', 'gloves', 'boots']) state.data.equipped[slot] = { id: slot, slot, stats: {}, setId: set.id, durability: 100 };
    const full = state.getEffectiveStats();
    for (const bonus of [set.bonus2, set.bonus4]) for (const [key, value] of Object.entries(bonus)) {
      if (key === 'desc') continue;
      const field = fields[key] || key;
      assert.ok(full[field] >= (base[field] || 0) + value, `${set.id}.${key} is not applied`);
    }
    state.data.equipped.boots.durability = 0;
    assert.equal(state.getEffectiveStats().skillLevelBonus, 0);
    assert.equal(state.getEffectiveStats().doubleStrike, 0);
  }
});

test('skill levels scale attacks, passives and auras consistently without mutating base config or mana costs', () => {
  for (const classId of Object.keys(CLASSES)) {
    const before = JSON.stringify(CLASSES[classId]);
    const skills = getClassSkills(classId, 4);
    for (const skill of skills) {
      const base = CLASSES[classId].skills.find(candidate => candidate.id === skill.id);
      if (skill.category === 'attack') {
        assert.equal(skill.multiplier, base.multiplier * 1.2);
        assert.equal(skill.mpCost, base.mpCost);
      } else for (const key of Object.keys(base.effect)) assert.equal(skill.effect[key], base.effect[key] * 1.2);
    }
    assert.equal(JSON.stringify(CLASSES[classId]), before);
  }
});

function setCombat(overrides = {}, enemy = {}, classId = 'warrior') {
  const random = Math.random;
  Math.random = () => 0.1;
  try {
    return runCombat({ hp: 10000, maxHp: 10000, mp: 0, maxMp: 100, atk: 100, def: 0, speed: 100, crit: 0, dodge: 0, hit: 99, counter: 0, lifesteal: 0, ...overrides },
      { hp: 100000, maxHp: 100000, atk: 50, def: 0, speed: 1, crit: 0, dodge: 0, counter: 0, ...enemy },
      { classId, pets: [], equipped: {}, estate: {}, relics: { unlocked: [] } }, { name: 'Test boss', isPvp: true });
  } finally { Math.random = random; }
}
function firstDirectDamage(result) {
  return Number(result.logs.find(log => log.message.includes('造成了')).message.match(/造成了 (\d+)/)[1]);
}

test('set damage, armor penetration and low-health finish bonuses affect actual direct attacks at their boundaries', () => {
  const base = firstDirectDamage(setCombat());
  assert.equal(firstDirectDamage(setCombat({ dmgBonus: 25 })), Math.floor(base * 1.25));
  assert.ok(firstDirectDamage(setCombat({ armorBreak: 100 }, { def: 100 })) > firstDirectDamage(setCombat({}, { def: 100 })));
  assert.equal(firstDirectDamage(setCombat({ finishDmg: 40 }, { hp: 30000 })), Math.floor(base * 1.4));
  assert.equal(firstDirectDamage(setCombat({ finishDmg: 40 }, { hp: 30001 })), base);
});

test('magic damage and skill level bonuses boost mage spells while magic bonus leaves ordinary attacks unchanged', () => {
  const base = firstDirectDamage(setCombat({ mp: 1000, maxMp: 1000 }, {}, 'mage'));
  assert.equal(firstDirectDamage(setCombat({ mp: 1000, maxMp: 1000, magicDmg: 30 }, {}, 'mage')), Math.floor(base * 1.3));
  assert.ok(firstDirectDamage(setCombat({ mp: 1000, maxMp: 1000, skillLevelBonus: 4 }, {}, 'mage')) > base);
  assert.equal(firstDirectDamage(setCombat({ magicDmg: 30 })), firstDirectDamage(setCombat()));
});

test('set normal attack combo is separate from skills, respects boss shields and mana absorption uses actual health damage', () => {
  assert.equal(setCombat().logs.some(log => log.message.includes('套装连击')), false);
  const combo = setCombat({ doubleStrike: 20 });
  assert.ok(combo.logs.some(log => log.message.includes('套装连击')));
  assert.equal(setCombat({ doubleStrike: 20, mp: 10000, maxMp: 10000 }).logs.some(log => log.message.includes('套装连击')), false);
  const shielded = setCombat({ doubleStrike: 20 }, { hasPhases: true, phase1Shield: 100000 });
  assert.equal(shielded.logs.find(log => log.message.includes('套装连击')).enemyHp, 100000);
  const absorb = setCombat({ magicAbsorb: 30 });
  assert.ok(absorb.logs.some(log => log.message.includes('法力吸收')));
  assert.ok(absorb.remainingMp <= 100);
  assert.equal(setCombat({ magicAbsorb: 30, mp: 0, maxMp: 0 }).logs.some(log => log.message.includes('法力吸收')), false);
});

test('enemy hit is finite and player dodge actually avoids enemy attacks while explicit zero hit stays zero', () => {
  const random = Math.random;
  Math.random = () => 0.8;
  try {
    const stats = { hp: 10000, maxHp: 10000, mp: 0, maxMp: 0, atk: 100, def: 0, speed: 100, crit: 0, dodge: 0, hit: 99, counter: 0, lifesteal: 0 };
    const enemy = { hp: 100000, maxHp: 100000, atk: 100, def: 0, speed: 1, crit: 0, dodge: 0, counter: 0 };
    const data = { classId: 'warrior', pets: [], equipped: {}, estate: {}, relics: { unlocked: [] } };
    const result = dodge => runCombat({ ...stats, dodge }, enemy, data, { name: 'Enemy', isPvp: true });
    assert.ok(result(60).remainingHp > result(0).remainingHp);
    const zeroHit = runCombat(stats, { ...enemy, hit: 0 }, data, { name: 'Enemy', isPvp: true });
    assert.equal(zeroHit.remainingHp, 10000);
  } finally { Math.random = random; }
});

test('castle revival restores promised health and mana once before the next action', () => {
  const random = Math.random; Math.random = () => 0.1;
  try {
    const result = runCombat({ hp: 1, maxHp: 100, mp: 0, maxMp: 100, atk: 100, def: 0, speed: 1, crit: 0, dodge: 0, hit: 99, counter: 0, lifesteal: 0 },
      { hp: 10, maxHp: 10, atk: 100, def: 0, speed: 100, crit: 0, dodge: 0 },
      { classId: 'warrior', isCastleExplore: true, pets: [], equipped: {}, estate: {} }, { name: 'Enemy' });
    assert.equal(result.victory, true);
    assert.equal(result.remainingMp, 55);
    assert.equal(result.logs.filter(log => log.message.includes('古堡庇佑')).length, 1);
  } finally { Math.random = random; }
});

test('lifesteal and mage life drain heal from actual health damage rather than overkill or absorbed shield damage', () => {
  const random = Math.random; Math.random = () => 0.1;
  try {
    const stats = { hp: 100, maxHp: 1000, mp: 1000, maxMp: 1000, atk: 1000, def: 0, speed: 100, crit: 0, dodge: 0, hit: 99, counter: 0, lifesteal: 25 };
    const data = { classId: 'mage', pets: [], equipped: {}, estate: {} };
    const enemy = { hp: 10, maxHp: 10, atk: 0, def: 0, speed: 1, crit: 0, dodge: 0 };
    const result = runCombat(stats, enemy, data, { name: 'Weak enemy', isPvp: true });
    assert.equal(result.remainingHp, 105);
    const shield = runCombat(stats, { ...enemy, hp: 100000, maxHp: 100000, hasPhases: true, phase1Shield: 1000000 }, data, { name: 'Shield', isPvp: true });
    assert.equal(shield.logs.some(log => log.type === 'heal' && (log.message.includes('生命汲取') || log.message.includes('【吸血】'))), false);
  } finally { Math.random = random; }
});

function traitCombat(id, options = {}) {
  const random = Math.random; Math.random = options.random || (() => options.roll ?? 0.1);
  try {
    return runCombat({ hp: 10000, maxHp: 10000, mp: 0, maxMp: 0, atk: 100, def: 0, speed: 30, crit: 0, dodge: 0, hit: 99, counter: 0, lifesteal: 0, ...options.stats },
      { hp: 100000, maxHp: 100000, atk: 100, def: 0, speed: 32, crit: 0, dodge: 0, counter: 0, ...options.enemy },
      { name: 'Hero', classId: options.classId || 'warrior', activePetId: id, pets: [{ id, stamina: options.stamina ?? 100, skills: options.skills || [] }], equipped: {}, estate: {}, ...options.data },
      { name: 'TestBoss', isPvp: true });
  } finally { Math.random = random; }
}

test('pet wind speed changes initiative and exhausted pets cannot apply it', () => {
  assert.ok(traitCombat('faerie_dragon').logs.find(log => log.type === 'damage').message.includes('Hero 挥舞'));
  assert.ok(traitCombat('faerie_dragon', { stamina: 59 }).logs.find(log => log.type === 'damage').message.includes('TestBoss 挥舞'));
});

test('harpy weakness reduces attack without repeated stacking and manticore wounds amplify later hits', () => {
  const harpy = traitCombat('harpy');
  assert.ok(harpy.logs.some(log => log.message.includes('虚弱')));
  const enemyHits = harpy.logs.filter(log => log.message.includes('TestBoss 挥舞')).map(log => Number(log.message.match(/造成了 (\d+)/)[1]));
  assert.ok(enemyHits[1] < enemyHits[0]);
  assert.ok(enemyHits.slice(1).every(damage => damage === enemyHits[1]));
  let calls = 0;
  const once = traitCombat('harpy', { classId: 'mage', random: () => ++calls === 8 ? 0.1 : 0.9 });
  const onceHits = once.logs.filter(log => log.message.includes('TestBoss 挥舞')).map(log => Number(log.message.match(/造成了 (\d+)/)[1]));
  assert.ok(onceHits[1] < onceHits[0]);
  assert.deepEqual(onceHits.slice(1, 4), [onceHits[1], onceHits[1], onceHits[1]]);
  assert.equal(onceHits[4], onceHits[0]);
  const woundId = Object.values(PET_CONFIGS).find(pet => pet.traitName === '重创').id;
  const wound = traitCombat(woundId).logs.filter(log => log.message.includes('Hero 挥舞')).map(log => Number(log.message.match(/造成了 (\d+)/)[1]));
  assert.ok(wound[1] > wound[0]);
  assert.ok(wound.slice(1).every(damage => damage === wound[1]));
});

test('phoenix revival follows configured probability and cannot revive repeatedly', () => {
  const options = { stats: { hp: 1, maxHp: 100 }, enemy: { hp: 100000, atk: 1000 } };
  assert.equal(traitCombat('phoenix', { ...options, roll: 0.6 }).logs.some(log => log.message.includes('凤凰·涅槃')), false);
  assert.equal(traitCombat('phoenix', { ...options, roll: 0.1 }).logs.filter(log => log.message.includes('凤凰·涅槃')).length, 1);
  assert.equal(traitCombat('phoenix', { ...options, roll: 0.6, data: { isCastleExplore: true } }).logs.filter(log => log.message.includes('古堡庇佑')).length, 1);
});

test('configured gold dragon combo, learned combo and silver regeneration use distinct declared values', () => {
  assert.equal(traitCombat('golden_dragon', { roll: 0.32 }).logs.some(log => log.message.includes('金龙·连击')), false);
  assert.ok(traitCombat('golden_dragon', { roll: 0.32, skills: ['book_multihit'] }).logs.some(log => log.message.includes('金龙·连击')));
  assert.equal(traitCombat('golden_dragon', { roll: 0.1, stamina: 59 }).logs.some(log => log.message.includes('金龙·连击')), false);
  const regen = traitCombat('silver_dragon', { stats: { hp: 5000 } });
  assert.ok(regen.logs.some(log => log.message.includes('银龙·再生') && log.message.includes('250 点')));
});

test('calm control and enduring stun have real effects and expire instead of stacking endlessly', () => {
  assert.ok(traitCombat('sphinx').logs.some(log => log.type === 'confusion'));
  assert.equal(traitCombat('sphinx', { stamina: 59 }).logs.some(log => log.type === 'confusion'), false);
  let calls = 0;
  const enduring = traitCombat('gorgon', { classId: 'mage', data: { relics: { unlocked: ['relic_mjolnir'] } }, random: () => ++calls === 8 ? 0.1 : 0.9 });
  assert.equal(enduring.logs.filter(log => log.message.includes('雷神之锤】')).length, 1);
  assert.equal(enduring.logs.filter(log => log.message.includes('眩晕倒地')).length, 2);
  assert.ok(enduring.logs.some(log => log.turn > 3 && log.message.includes('TestBoss 挥舞')));
  calls = 0;
  const oncePoison = traitCombat('gorgon', { classId: 'mage', skills: ['book_poison'], random: () => ++calls <= 8 ? 0.1 : 0.999 });
  assert.equal(oncePoison.logs.filter(log => log.type === 'poison').length, 3);
});

test('nightmare infection doubles actual skill lifesteal but cannot heal more than missing health', () => {
  const options = { classId: 'mage', stats: { hp: 100, maxHp: 1000, mp: 1000, maxMp: 1000, atk: 1000 }, enemy: { hp: 10, maxHp: 10, speed: 1 } };
  assert.equal(traitCombat('nightmare', options).remainingHp, 107);
  assert.equal(traitCombat('nightmare', { ...options, stamina: 59 }).remainingHp, 103);
  const plain = traitCombat('mermaid', { skills: ['book_poison'] }).logs.find(log => log.type === 'poison');
  const infected = traitCombat('nightmare', { skills: ['book_poison'] }).logs.find(log => log.type === 'poison');
  const plainDamage = Number(plain.message.match(/损失了 (\d+)/)[1]);
  const infectedDamage = Number(infected.message.match(/损失了 (\d+)/)[1]);
  // Mermaid fixes damage at max roll, so use a neutral pet for an exact same-hit comparison.
  const neutral = traitCombat('djinn', { skills: ['book_poison'] }).logs.find(log => log.type === 'poison');
  assert.ok(plainDamage > 0);
  assert.equal(infectedDamage, Number(neutral.message.match(/损失了 (\d+)/)[1]) * 4);
  assert.equal(traitCombat('nightmare', { skills: ['book_poison'], stamina: 59 }).logs.some(log => log.type === 'poison'), false);
});

test('earned prestige buys corrosion book, learning consumes it once and poison respects boss shields', () => {
  const state = new GameState(); state.data.prestige = 0;
  const before = JSON.stringify(state.data);
  assert.equal(state.buyPrestigeItem('book_poison').success, false);
  assert.equal(JSON.stringify(state.data), before);
  const random = Math.random; Math.random = () => 0.99;
  try { for (let hunt = 0; hunt < 60; hunt++) assert.equal(state.settleWildVictory('forest', 0).success, true); }
  finally { Math.random = random; }
  assert.equal(state.data.prestige, 300);
  assert.equal(state.buyPrestigeItem('book_poison').success, true);
  assert.equal(state.data.prestige, 0);
  assert.equal(state.learnPetSkill(state.data.activePetId, 'book_poison').success, true);
  assert.equal(state.learnPetSkill(state.data.activePetId, 'book_poison').success, false);
  assert.ok(!state.data.bag.some(item => item.id === 'book_poison'));
  const shield = traitCombat('nightmare', { skills: ['book_poison'], enemy: { hasPhases: true, phase1Shield: 1000000 } });
  assert.equal(shield.logs.some(log => log.type === 'poison'), false);
});

test('hatching respects displayed level gates and never consumes eggs when eligible species are already owned', () => {
  const state = new GameState();
  state.data.bag = [{ id: 'pet_egg_random', type: 'egg', count: 10 }];
  for (let hatch = 0; hatch < 3; hatch++) {
    const result = state.hatchPetEgg();
    assert.equal(result.success, true);
    assert.equal(PET_CONFIGS[result.petId].minLevel, 0);
  }
  const count = state.data.bag[0].count;
  assert.equal(state.hatchPetEgg().success, false);
  assert.equal(state.data.bag[0].count, count);
  state.data.level = 35;
  assert.equal(state.hatchPetEgg().success, true);
  assert.ok(state.data.pets.every(pet => PET_CONFIGS[pet.id].minLevel <= 35));
});

test('prestige protection crystals reach the enhancement consumer and only failed protected attempts consume protection', () => {
  const state = new GameState();
  state.data.bag = state.data.bag.filter(item => !['protect_crystal', 'crystal_protect'].includes(item.id));
  state.data.prestige = 300;
  assert.equal(state.buyPrestigeItem('crystal_protect').success, true);
  assert.ok(state.data.bag.some(item => item.id === 'protect_crystal'));
  const random = Math.random;
  try {
    Math.random = () => 0;
    const stars = state.data.equipped.weapon.stars;
    assert.equal(state.enhanceEquipment('weapon', true).success, true);
    assert.equal(state.data.equipped.weapon.stars, stars + 1);
    assert.equal(state.data.bag.find(item => item.id === 'protect_crystal').count, 1);
    Math.random = () => 0.99;
    const protectedStars = state.data.equipped.weapon.stars;
    const result = state.enhanceEquipment('weapon', true);
    assert.equal(result.success, false);
    assert.match(result.msg, /保护水晶.*生效/);
    assert.equal(state.data.equipped.weapon.stars, protectedStars);
    assert.ok(!state.data.bag.some(item => item.id === 'protect_crystal'));
  } finally { Math.random = random; }
});

test('legacy protection material keeps quantity and identity across repeated loads and can be consumed', () => {
  values.clear();
  const state = new GameState();
  state.data.bag = [{ id: 'crystal_protect', count: 2, uid: 'old_protection' }, { id: 'star_crystal', count: 20, uid: 'stars' }];
  storage.save(state.data); state.loadOrInit(); state.loadOrInit();
  assert.equal(state.data.bag.find(item => item.uid === 'old_protection').id, 'protect_crystal');
  assert.equal(state.data.bag.find(item => item.uid === 'old_protection').count, 2);
  const random = Math.random; Math.random = () => 0.99;
  try { assert.match(state.enhanceEquipment('weapon', true).msg, /保护水晶.*生效/); }
  finally { Math.random = random; }
  assert.equal(state.data.bag.find(item => item.uid === 'old_protection').count, 1);
});

test('a full bag allows prestige purchases into owned stacks while a new-item failure preserves prestige and inventory', () => {
  const state = new GameState();
  state.data.prestige = 500;
  state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: `stack_${i}`, count: 1 }));
  state.data.bag[0] = { id: 'gem_atk', count: 1 };
  assert.equal(state.buyPrestigeItem('gem_atk').success, true);
  assert.equal(state.data.bag[0].count, 2);
  assert.equal(state.data.bag.length, 40);
  assert.equal(state.data.prestige, 380);
  const before = JSON.stringify(state.data);
  assert.equal(state.buyPrestigeItem('gem_def').success, false);
  assert.equal(JSON.stringify(state.data), before);
});

test('gem removal into a full existing stack succeeds but cannot lose a socketed item when no bag slot exists', () => {
  const state = new GameState();
  state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: `stack_${i}`, count: 1 }));
  state.data.bag[0] = { id: 'gem_atk', count: 1 };
  state.data.equipped.weapon.gems = [{ id: 'gem_atk', name: 'Diamond', stat: 'atk', val: 25 }, { id: 'gem_def', name: 'Agate', stat: 'def', val: 18 }];
  assert.equal(state.removeGem('weapon', 0).success, true);
  assert.equal(state.data.bag[0].count, 2);
  assert.equal(state.data.equipped.weapon.gems[0], null);
  assert.equal(state.data.bag.length, 40);
  const before = JSON.stringify(state.data);
  assert.equal(state.removeGem('weapon', 1).success, false);
  assert.equal(JSON.stringify(state.data), before);
});

test('inlay rejects malformed socket indices before charging gold or consuming a gem', () => {
  const state = new GameState();
  state.data.gold = 10000;
  const gem = state.data.bag.find(item => item.id === 'gem_atk');
  const before = JSON.stringify(state.data);
  for (const index of [NaN, 0.5, null, '0', undefined]) {
    assert.equal(state.inlayGem('weapon', index, gem.uid).success, false);
    assert.equal(JSON.stringify(state.data), before);
  }
});

const poisonAbility = { name: 'PoisonStorm', interval: 3, mpCost: 10, multiplier: 1, damageType: 'magic', statuses: [{ type: 'poison', rate: 0.2, duration: 2 }] };
test('boss spells warn before casting, cost mana and cannot cast after mana exhaustion', () => {
  const result = traitCombat('unknown', { enemy: { mp: 10, maxMp: 10, abilities: [poisonAbility] } });
  const warned = result.logs.find(log => log.message.includes('蓄势') && log.message.includes('PoisonStorm'));
  const cast = result.logs.filter(log => log.message.includes('施展【PoisonStorm】'));
  assert.ok(warned);
  assert.equal(cast.length, 1);
  assert.ok(cast[0].turn > warned.turn);
  assert.ok(result.logs.some(log => log.type === 'poison'));
});

test('purification blocks incoming poison and protection reduces it while exhausted pets lose the counterplay', () => {
  const enemy = { abilities: [poisonAbility], mp: 1000, maxMp: 1000 };
  const immune = traitCombat('djinn', { skills: ['book_purify'], enemy });
  assert.ok(immune.logs.some(log => log.message.includes('免疫') && log.message.includes('剧毒')));
  assert.equal(immune.logs.some(log => log.type === 'poison'), false);
  const plain = traitCombat('unknown', { enemy }).logs.find(log => log.type === 'poison');
  const sheltered = traitCombat('pegasus', { enemy }).logs.find(log => log.type === 'poison');
  assert.equal(Number(sheltered.message.match(/损失了 (\d+)/)[1]), Math.floor(Number(plain.message.match(/损失了 (\d+)/)[1]) * 0.2));
  assert.ok(traitCombat('djinn', { skills: ['book_purify'], enemy, stamina: 59 }).logs.some(log => log.type === 'poison'));
});

test('bone dragon debuffs expire without stacking and holy pets counter them while magic resistance affects spell damage', () => {
  const curse = { name: 'BoneCurse', interval: 3, mpCost: 30, multiplier: 1, damageType: 'magic', statuses: [{ type: 'weaken', ratio: 0.2, duration: 3 }, { type: 'slow', ratio: 0.2, duration: 3 }] };
  const enemy = { abilities: [curse], mp: 30, maxMp: 30 };
  const plain = traitCombat('unknown', { enemy });
  assert.equal(plain.logs.filter(log => log.message.includes('减速结束')).length, 1);
  const hits = plain.logs.filter(log => log.message.includes('Hero 挥舞')).map(log => Number(log.message.match(/造成了 (\d+)/)[1]));
  assert.deepEqual(hits.slice(2, 5), [hits[2], hits[2], hits[2]]);
  assert.ok(hits[2] < hits[1]);
  assert.equal(hits[5], hits[1]);
  const holy = traitCombat('unicorn', { enemy });
  assert.ok(holy.logs.some(log => log.message.includes('免疫虚弱')));
  assert.ok(holy.logs.some(log => log.message.includes('免疫减速')));
  assert.equal(holy.logs.some(log => log.message.includes('减速结束')), false);
  const castDamage = result => Number(result.logs.find(log => log.message.includes('施展【BoneCurse】')).message.match(/造成了 (\d+)/)[1]);
  assert.equal(castDamage(traitCombat('unknown', { enemy, stats: { magicResist: 20 } })), Math.floor(castDamage(plain) * 0.8));
});

test('control immunity counters dragon imprisonment and crowd control interrupts a prepared boss spell', () => {
  const stun = { name: 'Imprisonment', interval: 3, mpCost: 10, multiplier: 1, statuses: [{ type: 'stun', duration: 1 }] };
  const enemy = { abilities: [stun], mp: 10, maxMp: 10 };
  assert.ok(traitCombat('unknown', { enemy }).logs.some(log => log.message.includes('眩晕倒地')));
  assert.ok(traitCombat('djinn', { enemy, skills: ['book_purify'] }).logs.some(log => log.message.includes('免疫眩晕')));
  // Mind attacks land after the boss has warned, then force its next action to cancel the cast.
  let calls = 0;
  const controlled = traitCombat('sphinx', { enemy: { ...enemy, speed: 40 }, random: () => ++calls === 19 ? 0.1 : 0.9 });
  assert.ok(controlled.logs.some(log => log.message.includes('施法中断')));
});

test('damage reduction, mage mana shielding and mana absorption apply to actual incoming poison damage', () => {
  const enemy = { abilities: [poisonAbility], mp: 10, maxMp: 10 };
  const reduced = traitCombat('unknown', { enemy, stats: { dmgResist: 20 } });
  const hit = Number(reduced.logs.find(log => log.message.includes('施展【PoisonStorm】')).message.match(/造成了 (\d+)/)[1]);
  const poison = Number(reduced.logs.find(log => log.type === 'poison').message.match(/损失了 (\d+)/)[1]);
  assert.equal(poison, Math.floor(Math.floor(hit * 0.2) * 0.8));
  const shield = traitCombat('unknown', { enemy, classId: 'mage', stats: { mp: 1000, maxMp: 1000 } });
  assert.ok(shield.logs.some(log => log.message.includes('寒冰护盾') && log.message.includes('毒伤')));
  const absorb = traitCombat('unknown', { enemy, stats: { magicAbsorb: 30, maxMp: 1000 } });
  assert.ok(absorb.logs.some(log => log.message.includes('法力吸收') && log.message.includes('毒伤')));
});

test('selling idle gear removes exactly its identity, pays once and persists with no effect on worn gear', () => {
  values.clear();
  const state = new GameState();
  const gear = state.data.bag.find(item => item.slot);
  const quote = state.getEquipmentSaleQuote(gear.uid);
  assert.equal(quote.success, true);
  assert.ok(quote.gold > 0);
  const gold = state.data.gold;
  const worn = JSON.stringify(state.data.equipped);
  assert.equal(state.sellEquipment(gear.uid, quote.gold).success, true);
  assert.equal(state.data.gold - gold, quote.gold);
  assert.ok(!state.data.bag.some(item => item.uid === gear.uid));
  assert.equal(JSON.stringify(state.data.equipped), worn);
  assert.equal(state.sellEquipment(gear.uid, quote.gold).success, false);
  assert.equal(state.data.gold - gold, quote.gold);
  state.loadOrInit();
  assert.equal(state.data.gold, gold + quote.gold);
  assert.ok(!state.data.bag.some(item => item.uid === gear.uid));
});

test('sale refuses socketed equipment, materials, worn gear and stale prices without mutating inventory', () => {
  const state = new GameState();
  const gear = state.data.bag.find(item => item.slot);
  const quote = state.getEquipmentSaleQuote(gear.uid);
  const before = JSON.stringify(state.data);
  assert.equal(state.sellEquipment(gear.uid, quote.gold + 1).success, false);
  assert.equal(state.sellEquipment(state.data.equipped.weapon.uid).success, false);
  assert.equal(state.sellEquipment(state.data.bag.find(item => item.id === 'pet_food').uid).success, false);
  assert.equal(JSON.stringify(state.data), before);
  gear.gems = [{ id: 'rune_sol', isRune: true }];
  const socketed = JSON.stringify(state.data);
  assert.equal(state.sellEquipment(gear.uid).success, false);
  assert.equal(JSON.stringify(state.data), socketed);
});

test('clearing overflow with an equipment sale restores shop capacity and old unidentified gear receives stable identities', () => {
  values.clear();
  const state = new GameState(); state.data.prestige = 300;
  state.data.bag = Array.from({ length: 41 }, (_, i) => ({ id: `drop_${i}`, name: 'Loot', slot: 'weapon', reqLevel: 15, quality: 'gold', stats: { atk: 10 } }));
  storage.save(state.data); state.loadOrInit();
  const ids = state.data.bag.map(item => item.uid);
  assert.equal(new Set(ids).size, 41);
  state.loadOrInit(); assert.deepEqual(state.data.bag.map(item => item.uid), ids);
  assert.equal(state.buyPrestigeItem('book_purify').success, false);
  assert.equal(state.sellEquipment(ids[0]).success, true);
  assert.equal(state.buyPrestigeItem('book_purify').success, false);
  assert.equal(state.sellEquipment(ids[1]).success, true);
  assert.equal(state.buyPrestigeItem('book_purify').success, true);
  assert.equal(state.data.bag.length, 40);
  assert.equal(state.data.prestige, 0);
});

test('bag expansion charges the quoted game resources once and respects insufficient funds and maximum capacity', () => {
  const state = new GameState();
  assert.equal(state.getBagCapacity(), 40);
  const poor = JSON.stringify(state.data);
  assert.equal(state.expandBag(40).success, false);
  assert.equal(JSON.stringify(state.data), poor);
  state.data.gold = 100000; state.data.crystal = 500;
  for (const capacity of [40, 60, 80, 100]) {
    const quote = state.getBagExpansionQuote();
    const gold = state.data.gold, crystal = state.data.crystal;
    assert.equal(state.expandBag(capacity).success, true);
    assert.equal(state.getBagCapacity(), capacity + 20);
    assert.equal(state.data.gold, gold - quote.gold);
    assert.equal(state.data.crystal, crystal - quote.crystal);
    const before = JSON.stringify(state.data);
    assert.equal(state.expandBag(capacity).success, false);
    assert.equal(JSON.stringify(state.data), before);
  }
  assert.equal(state.data.gold, 0); assert.equal(state.data.crystal, 0);
  assert.equal(state.getBagExpansionQuote().success, false);
});

test('expanded capacity persists per slot, legacy saves default safely and malformed imports are rejected', () => {
  values.clear(); const state = new GameState();
  state.data.gold = 10000; state.data.crystal = 50;
  state.expandBag(40); state.loadOrInit(); assert.equal(state.getBagCapacity(), 60);
  storage.setActiveSlotId(2); state.loadOrInit(); assert.equal(state.getBagCapacity(), 40);
  storage.setActiveSlotId(1); state.loadOrInit(); assert.equal(state.getBagCapacity(), 60);
  for (const invalid of [0, 41, 121, '60', null]) {
    const data = { ...state.data, bagCapacity: invalid };
    assert.throws(() => storage.parseBackupText(JSON.stringify({ saveData: data })));
    storage.save(data); state.loadOrInit(); assert.equal(state.getBagCapacity(), 40);
  }
  const legacy = { ...state.data }; delete legacy.bagCapacity;
  assert.equal(storage.parseBackupText(JSON.stringify({ saveData: legacy })).bagCapacity, undefined);
  storage.save(legacy); state.loadOrInit(); assert.equal(state.getBagCapacity(), 40);
});

test('faction and prestige trades use expanded capacity and full existing stacks without charging failed new items', () => {
  const state = new GameState(); state.data.bagCapacity = 60;
  state.data.bag = Array.from({ length: 60 }, (_, i) => ({ id: `material_${i}`, count: 1 }));
  state.data.bag[0] = { id: 'key_mithril', count: 1 };
  state.data.factionWar.merit = 1000; state.data.prestige = 1000;
  assert.equal(state.exchangeFactionReward('key_mithril').success, true);
  assert.equal(state.data.bag[0].count, 2); assert.equal(state.data.factionWar.merit, 900);
  const before = JSON.stringify(state.data);
  assert.equal(state.exchangeFactionReward('key_obsidian').success, false);
  assert.equal(state.buyPrestigeItem('book_purify').success, false);
  assert.equal(JSON.stringify(state.data), before);
  state.data.bag.pop(); assert.equal(state.buyPrestigeItem('book_purify').success, true);
  assert.equal(state.data.bag.length, 60);
  state.data.bag[1] = { ...RUNES.rune_sol, count: 2 };
  const random = Math.random; Math.random = () => 0;
  try { assert.equal(state.exchangeFactionReward('rw_box').success, true); }
  finally { Math.random = random; }
  assert.equal(state.data.bag[1].count, 3); assert.equal(state.data.factionWar.merit, 750);
});

test('disassembly recovers matching materials once, merges full bags and preserves currency and other equipment', () => {
  for (const [quality, materialId] of [['blue', 'crystal_gold'], ['gold', 'crystal_gold'], ['darkgold', 'crystal_darkgold'], ['purplegold', 'crystal_darkgold']]) {
    values.clear(); const state = new GameState();
    state.data.equipped.weapon.quality = quality;
    state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: 'material_' + i, count: 1 }));
    state.data.bag[0] = { id: materialId, uid: 'owned_crystal', name: 'Crystal' };
    const armor = JSON.stringify(state.data.equipped.armor); const gold = state.data.gold;
    const quote = state.getEquipmentDisassemblyQuote('weapon');
    assert.equal(quote.materialId, materialId); assert.equal(quote.count, 3);
    assert.equal(state.disassembleEquipment('weapon', quote.uid).success, true);
    assert.equal(state.data.equipped.weapon, null);
    assert.equal(state.data.bag[0].count, 4); assert.equal(state.data.bag[0].uid, 'owned_crystal');
    assert.equal(state.data.bag.length, 40); assert.equal(state.data.gold, gold);
    assert.equal(JSON.stringify(state.data.equipped.armor), armor);
    const before = JSON.stringify(state.data);
    assert.equal(state.disassembleEquipment('weapon', quote.uid).success, false);
    assert.equal(JSON.stringify(state.data), before);
    state.loadOrInit(); assert.equal(state.data.equipped.weapon, null); assert.equal(state.data.bag[0].count, 4);
  }
});

test('disassembly refuses gems, malformed gear and stale equipment identity without losing resources', () => {
  const state = new GameState(); const weapon = state.data.equipped.weapon;
  for (const gems of [[{ id: 'rune_sol' }], {}]) {
    weapon.gems = gems;
    const before = JSON.stringify(state.data);
    assert.equal(state.disassembleEquipment('weapon', weapon.uid).success, false);
    assert.equal(JSON.stringify(state.data), before);
  }
  weapon.gems = []; const oldUid = weapon.uid;
  state.data.equipped.weapon = { ...weapon, uid: 'replacement' };
  const before = JSON.stringify(state.data);
  assert.equal(state.disassembleEquipment('weapon', oldUid).success, false);
  assert.equal(state.disassembleEquipment('weapon').success, false);
  assert.equal(JSON.stringify(state.data), before);
  state.data.equipped.weapon.quality = 'unknown';
  assert.equal(state.getEquipmentDisassemblyQuote('weapon').success, false);
});

test('disassembly preserves generated materials even when a full bag has no matching stack', () => {
  const state = new GameState(); state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: 'supply_' + i, count: 1 }));
  const uid = state.data.equipped.weapon.uid;
  assert.equal(state.disassembleEquipment('weapon', uid).success, true);
  assert.equal(state.data.bag.length, 41);
  assert.equal(state.data.bag.find(item => item.id === 'crystal_gold').count, 3);
});

test('old royal mission completion resumes the first unclaimed continuation without regranting old rewards', () => {
  values.clear(); const state = new GameState();
  state.data.currentQuestId = 'completed'; state.data.questProgress.quest_20 = { completed: true, claimed: true, current: 1 };
  storage.save(state.data); const gold = state.data.gold;
  state.loadOrInit(); assert.equal(state.data.currentQuestId, 'quest_21');
  assert.equal(state.data.gold, gold); assert.equal(state.claimQuestReward('quest_20'), false);
  state.loadOrInit(); assert.equal(state.data.currentQuestId, 'quest_21'); assert.equal(state.data.gold, gold);
});

test('continuation recognizes actual existing milestones in order and all six rewards pay only once across reload', () => {
  values.clear(); const state = new GameState(); state.data.currentQuestId = 'quest_21';
  state.data.factionWar.strongholds[STRONGHOLDS[0].id].captured = true;
  state.data.dungeon.clearedGates = { dragon_gate: 1, spacetime_gate: 1 };
  state.data.castle.claimedBossRewards = [70, 100]; state.data.royalTrials.completedStage = 7;
  const gold = state.data.gold;
  for (let n = 21; n <= 26; n++) {
    state.reconcileQuestMilestones(); const id = `quest_${n}`;
    assert.equal(state.data.questProgress[id].completed, true);
    assert.equal(state.claimQuestReward(id), true);
    const paid = JSON.stringify(state.data);
    assert.equal(state.claimQuestReward(id), false); assert.equal(JSON.stringify(state.data), paid);
    state.loadOrInit();
  }
  assert.equal(state.data.currentQuestId, 'completed');
  assert.equal(state.data.gold - gold, 770000);
  const book = state.data.bag.find(item => item.id === 'book_purify');
  assert.equal(book.type, 'skill_book'); assert.equal(book.bookId, 'book_purify');
  const after = JSON.stringify(state.data); state.loadOrInit(); assert.equal(state.data.currentQuestId, 'completed');
  assert.equal(state.data.gold, JSON.parse(after).gold);
});

test('continuation rejects generic events, unrelated dungeons and skipped tower heights without actual boss proof', () => {
  const state = new GameState(); state.data.currentQuestId = 'quest_22';
  state.data.dungeon.clearedGates = { trial_gate: 9 };
  state.reconcileQuestMilestones(); assert.equal(state.data.questProgress.quest_22.completed, false);
  assert.equal(state.triggerQuestAction('clear_dungeon').completed, false);
  assert.equal(state.triggerQuestAction('clear_dragon_gate').completed, false);
  state.data.currentQuestId = 'quest_23'; state.data.castle.maxReachedFloor = 100;
  state.reconcileQuestMilestones(); assert.equal(state.data.questProgress.quest_23.completed, false);
  assert.equal(state.triggerQuestAction('clear_tower_70').completed, false);
  state.data.level = 100; state.data.castle.isExploring = true; state.data.castle.floor = 70;
  assert.equal(state.settleCastleVictory(70).success, true);
  assert.equal(state.data.questProgress.quest_23.completed, true);
  assert.equal(state.claimQuestReward('quest_23'), true); assert.equal(state.data.currentQuestId, 'quest_24');
  state.data.royalTrials.completedStage = 6; state.reconcileQuestMilestones();
  assert.equal(state.data.questProgress.quest_24.completed, false);
  state.data.prestige = 100000; assert.equal(state.completeRoyalTrial(6).success, true);
  assert.equal(state.data.questProgress.quest_24.completed, true);
});

test('dungeon entry enforces configured level, active expedition and five paid daily attempts', () => {
  const state = new GameState();
  assert.equal(state.startDungeonExpedition('trial_gate').success, false);
  assert.equal(state.data.dungeon.entriesLeft, 5);
  state.data.level = 20;
  for (let n = 0; n < 5; n++) {
    const entered = state.startDungeonExpedition('trial_gate'); assert.equal(entered.success, true);
    assert.equal(state.data.dungeon.entriesLeft, 4 - n);
    const before = JSON.stringify(state.data);
    assert.equal(state.startDungeonExpedition('trial_gate').success, false);
    assert.equal(JSON.stringify(state.data), before);
    assert.equal(state.retreatDungeonExpedition(entered.expeditionId).success, true);
  }
  assert.equal(state.startDungeonExpedition('trial_gate').success, false);
});

test('production five-floor dungeon settles exact rewards once, preserves full-bag drops and records one clear', () => {
  values.clear(); const state = new GameState(); state.data.level = 20;
  state.data.currentQuestId = 'quest_13';
  state.data.bag = Array.from({ length: 40 }, (_, i) => ({ id: 'supply_' + i, count: 1 }));
  const entered = state.startDungeonExpedition('trial_gate');
  let gold = 0, exp = 0;
  const beforeGold = state.data.gold;
  for (let floor = 1; floor <= 5; floor++) {
    const guard = getDungeonFloorGuard('trial_gate', floor);
    gold += floor < 5 ? Math.floor(guard.atk * 1.5) + 60 : Math.floor(guard.atk * 4);
    exp += floor < 5 ? Math.floor(guard.hp * 0.12) + 120 : Math.floor(guard.hp * 0.25);
    const result = state.settleDungeonVictory('trial_gate', floor, entered.expeditionId);
    assert.equal(result.success, true); assert.equal(result.final, floor === 5);
    const paid = JSON.stringify(state.data);
    assert.equal(state.settleDungeonVictory('trial_gate', floor, entered.expeditionId).success, false);
    assert.equal(JSON.stringify(state.data), paid);
    if (floor === 2) { state.loadOrInit(); assert.equal(state.data.dungeon.expeditionId, entered.expeditionId); assert.equal(state.data.dungeon.activeGateFloor, 3); }
  }
  assert.equal(state.data.gold - beforeGold, gold); assert.ok(exp > 0);
  assert.equal(state.data.dungeon.clearedGates.trial_gate, 1); assert.equal(state.data.dungeon.activeGateId, null);
  assert.equal(state.data.bag.length, 42); assert.equal(state.data.bag.find(item => item.id === 'crystal_darkgold').count, 2);
  assert.equal(state.data.questProgress.quest_13.completed, true);
  const drop = state.data.bag.find(item => item.slot); assert.equal(drop.reqLevel, 20);
});

test('old callbacks cannot settle an out-of-order floor, other gate or new expedition on the same gate', () => {
  const state = new GameState(); state.data.level = 100;
  const old = state.startDungeonExpedition('trial_gate');
  for (const [gate, floor] of [['trial_gate', 2], ['dragon_gate', 1], ['trial_gate', NaN]]) {
    const before = JSON.stringify(state.data);
    assert.equal(state.settleDungeonVictory(gate, floor, old.expeditionId).success, false);
    assert.equal(JSON.stringify(state.data), before);
  }
  state.retreatDungeonExpedition(old.expeditionId);
  const next = state.startDungeonExpedition('trial_gate'); assert.notEqual(next.expeditionId, old.expeditionId);
  const before = JSON.stringify(state.data);
  assert.equal(state.settleDungeonVictory('trial_gate', 1, old.expeditionId).success, false);
  assert.equal(state.retreatDungeonExpedition(old.expeditionId).success, false);
  assert.equal(JSON.stringify(state.data), before);
});

test('legacy in-progress dungeon gains a persistent expedition identity and malformed imported identity is rejected', () => {
  values.clear(); const state = new GameState(); state.data.level = 20;
  state.data.dungeon.activeGateId = 'trial_gate'; state.data.dungeon.activeGateFloor = 2;
  delete state.data.dungeon.expeditionId; storage.save(state.data); state.loadOrInit();
  const id = state.data.dungeon.expeditionId; assert.equal(typeof id, 'string');
  state.loadOrInit(); assert.equal(state.data.dungeon.expeditionId, id);
  assert.equal(state.settleDungeonVictory('trial_gate', 2, id).success, true);
  const backup = { ...state.data, dungeon: { ...state.data.dungeon, expeditionId: 5 } };
  assert.throws(() => storage.parseBackupText(JSON.stringify({ saveData: backup })));
});

test('military promotions use lifetime merit while spending leaves earned rank and salary intact', () => {
  values.clear(); const state = new GameState(); state.data.level = 20;
  for (let n = 0; n < 4; n++) state.completeStrongholdVictory('silverwing');
  assert.equal(state.data.factionWar.merit, 480); assert.equal(state.data.factionWar.totalMerit, 480);
  assert.equal(state.data.factionWar.militaryRank, 'scout');
  const stats = state.getEffectiveStats();
  for (let n = 0; n < 4; n++) assert.equal(state.exchangeFactionReward('key_mithril').success, true);
  assert.equal(state.data.factionWar.merit, 80); assert.equal(state.data.factionWar.totalMerit, 480);
  assert.equal(state.getEffectiveStats().atk, stats.atk); assert.equal(state.getEffectiveStats().speed, stats.speed);
  state.completeStrongholdVictory('silverwing');
  assert.equal(state.data.factionWar.merit, 200); assert.equal(state.data.factionWar.totalMerit, 600);
  assert.equal(state.data.factionWar.militaryRank, 'centurion');
  const gold = state.data.gold; assert.equal(state.claimFactionSalary().salary, 3500);
  assert.equal(state.data.gold - gold, 3500); assert.equal(state.claimFactionSalary().success, false);
  state.loadOrInit(); assert.equal(state.data.factionWar.totalMerit, 600); assert.equal(state.data.factionWar.militaryRank, 'centurion');
});

test('legacy spent military ranks retain a conservative lifetime merit floor without refunding currency', () => {
  values.clear(); const state = new GameState(); state.data.level = 80;
  state.data.factionWar.merit = 0; state.data.factionWar.militaryRank = 'marshal';
  delete state.data.factionWar.totalMerit; storage.save(state.data); state.loadOrInit();
  assert.equal(state.data.factionWar.totalMerit, 3000); assert.equal(state.data.factionWar.merit, 0);
  state.completeStrongholdVictory('silverwing');
  assert.equal(state.data.factionWar.totalMerit, 3120); assert.equal(state.data.factionWar.merit, 120);
  assert.equal(state.data.factionWar.militaryRank, 'marshal');
  state.exchangeFactionReward('key_mithril'); state.loadOrInit();
  assert.equal(state.data.factionWar.totalMerit, 3120); assert.equal(state.data.factionWar.merit, 20);
  for (const totalMerit of [-1, NaN, '500', 1.5, null]) {
    const backup = { ...state.data, factionWar: { ...state.data.factionWar, totalMerit } };
    assert.throws(() => storage.parseBackupText(JSON.stringify({ saveData: backup })));
  }
});

test('Hydra rebirth happens once after lethal attacks and active naga blocks it while exhausted naga cannot', () => {
  const enemy = { hp: 1000, maxHp: 1000, rebirth: LANDMARK_BOSSES[50].rebirth };
  const stats = { atk: 100000, hp: 100000, maxHp: 100000 };
  const normal = traitCombat('unknown', { enemy, stats });
  assert.equal(normal.logs.filter(log => log.message.includes('首领重生')).length, 1);
  assert.equal(normal.victory, true);
  const blocked = traitCombat('naga', { enemy, stats });
  assert.equal(blocked.logs.filter(log => log.type === 'special' && log.message.includes('封断重生契约')).length, 1);
  assert.equal(blocked.logs.some(log => log.message.includes('首领重生')), false);
  assert.equal(blocked.victory, true);
  assert.equal(traitCombat('naga', { enemy, stats, stamina: 59 }).logs.filter(log => log.message.includes('首领重生')).length, 1);
});

test('lethal counterattacks and poison damage share the single enemy rebirth guard', () => {
  const rebirth = { name: 'Rebirth', hpRatio: 0.25 };
  const counter = traitCombat('unknown', { enemy: { hp: 60, maxHp: 60, speed: 40, rebirth }, stats: { counter: 100, atk: 1000 } });
  assert.ok(counter.logs.some(log => log.type === 'counter'));
  assert.equal(counter.logs.filter(log => log.message.includes('首领重生')).length, 1);
  const probe = traitCombat('imp', { enemy: { speed: 20 }, stats: { atk: 100 }, roll: 0.9 });
  const direct = Number(probe.logs.find(log => log.message.includes('Hero 挥舞')).message.match(/造成了 (\d+)/)[1]);
  const poisonHp = direct + Math.floor(direct * 0.15);
  const poison = traitCombat('imp', { enemy: { hp: poisonHp, maxHp: poisonHp, speed: 20, rebirth }, stats: { atk: 100 }, roll: 0.9 });
  assert.ok(poison.logs.some(log => log.type === 'poison' && log.enemyHp === 0), JSON.stringify(poison.logs));
  assert.equal(poison.logs.filter(log => log.message.includes('首领重生')).length, 1);
});

test('enemy siphon excludes mana shield absorption and caps actual health loss and missing enemy health', () => {
  const ability = { name: 'Siphon', interval: 2, mpCost: 10, multiplier: 1, damageType: 'magic', enemyLifesteal: 0.5 };
  const shielded = traitCombat('unknown', { classId: 'mage', enemy: { abilities: [ability], mp: 10 }, stats: { mp: 1000, maxMp: 1000 } });
  const cast = shielded.logs.find(log => log.message.includes('施展【Siphon】'));
  assert.ok(shielded.logs.some(log => log.message.includes('寒冰护盾')));
  const bodyDamage = Number(cast.message.match(/造成了 (\d+)/)[1]);
  const heal = shielded.logs.find(log => log.message.includes('首领汲取'));
  assert.equal(Number(heal.message.match(/汲取 (\d+)/)[1]), Math.floor(bodyDamage * 0.5));
  const lethal = traitCombat('unknown', { enemy: { abilities: [{ ...ability, multiplier: 100 }], mp: 10 }, stats: { hp: 150, maxHp: 150 } });
  const lethalCast = lethal.logs.find(log => log.message.includes('施展【Siphon】'));
  assert.ok(Number(lethalCast.message.match(/造成了 (\d+)/)[1]) <= 150);
  const lethalHeal = lethal.logs.find(log => log.message.includes('首领汲取'));
  assert.equal(Number(lethalHeal.message.match(/汲取 (\d+)/)[1]), Math.floor(Number(lethalCast.message.match(/造成了 (\d+)/)[1]) * 0.5));
  const full = traitCombat('unknown', { enemy: { dodge: 100, abilities: [ability], mp: 10 }, roll: 0.9 });
  assert.ok(full.logs.some(log => log.message.includes('施展【Siphon】')));
  assert.equal(full.logs.some(log => log.message.includes('首领汲取')), false);
  const almostFull = traitCombat('unknown', { enemy: { atk: 1000, abilities: [ability], mp: 10 }, stats: { atk: 1 } });
  const beforeHeal = almostFull.logs.find(log => log.message.includes('施展【Siphon】'));
  const capped = almostFull.logs.find(log => log.message.includes('首领汲取'));
  assert.equal(Number(capped.message.match(/汲取 (\d+)/)[1]), 100000 - beforeHeal.enemyHp);
  assert.equal(capped.enemyHp, 100000);
});

test('enemy rebirth does not recreate the phase shield or repeat enrage and sacrifice', () => {
  const result = traitCombat('unknown', { stats: { atk: 100000 }, enemy: { hp: 1000, maxHp: 1000, hasPhases: true, phase1Shield: 100, phase2EnrageHp: 500, rebirth: { name: 'Rebirth', hpRatio: 0.25 } } });
  assert.equal(result.victory, true);
  for (const name of ['首领重生', '绝境嗜血狂暴', '冥府死契召唤']) assert.equal(result.logs.filter(log => log.message.includes(name)).length, 1);
  const shieldedHits = result.logs.filter(log => log.message.includes('护盾粉碎吸收'));
  assert.equal(shieldedHits.length, 1);
});

test('void siphon warns then heals from actual damage and pegasus halves enemy recovery with fatigue restoring it', () => {
  const ability = LANDMARK_BOSSES[60].abilities[0];
  const enemy = { abilities: [ability], mp: 60, maxMp: 60 };
  const normal = traitCombat('unknown', { enemy });
  const heal = result => Number(result.logs.find(log => log.message.includes('首领汲取')).message.match(/汲取 (\d+)/)[1]);
  const damage = Number(normal.logs.find(log => log.message.includes('施展【虚空噬魂】')).message.match(/造成了 (\d+)/)[1]);
  assert.equal(heal(normal), Math.floor(damage * 0.5));
  assert.equal(heal(traitCombat('pegasus', { enemy })), Math.floor(damage * 0.25));
  assert.equal(heal(traitCombat('pegasus', { enemy, stamina: 59 })), heal(normal));
  assert.ok(normal.logs.find(log => log.message.includes('蓄势')).turn < normal.logs.find(log => log.message.includes('施展【虚空噬魂】')).turn);
});
