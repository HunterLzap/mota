import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GameState } = await import('../js/core/state.js');
const { runCombat } = await import('../js/core/combat.js');
const { getTowerFloorData } = await import('../js/config/towerLevels.js');
const { getBossTactics } = await import('../js/config/bossTactics.js');
const { PET_CONFIGS } = await import('../js/config/pets.js');
const { storage } = await import('../js/core/storage.js');
const boss = getTowerFloorData(100, 2);
const fixtures = JSON.parse(readFileSync('output/playwright/mage-pressure-earned-fixtures.json', 'utf8'));
const beforeBoss = { ...boss, abilities: boss.abilities.map(ability => ({ ...ability, healingSuppression: null, manaDrainRatio: 0 })) };
const failures = [], samples = [];
function test(name, run) {
  try { run(); console.log('PASS ' + name); }
  catch (error) { failures.push({ name, error: error.stack }); console.error('FAIL ' + name + ': ' + error.stack); }
}
function fight(data, enemy = boss, seed = 1000, changes = {}) {
  const state = new GameState(); state.data = structuredClone(data);
  const before = structuredClone(state.data), random = Math.random;
  let value = seed;
  try {
    Math.random = typeof seed === 'function' ? seed : () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
    const result = runCombat({ ...state.getEffectiveStats(), ...changes }, enemy,
      { ...state.data, isCastleExplore: true }, enemy);
    assert.deepEqual(state.data, before, 'Combat rewrote saved assets');
    return result;
  } finally { Math.random = random; }
}
test('only the two campaign breaths carry a finite, readable recovery counter', () => {
  assert.equal(boss.hp, 400000); assert.equal(boss.atk, 6200);
  assert.equal(boss.def, 2600); assert.equal(boss.speed, 110);
  const breaths = boss.abilities.filter(ability => ability.hpThreshold);
  assert.equal(breaths.length, 2);
  for (const ability of breaths) {
    assert.deepEqual(ability.healingSuppression, { ratio: .9, duration: 20 });
    assert.equal(ability.manaDrainRatio, .6);
  }
  assert.ok(getTowerFloorData(100, 1).abilities.every(ability => !ability.healingSuppression));
  assert.match(getBossTactics(boss).join('\n'), /回复.*90%.*20秒/);
});
test('earned nine-build paired samples retain the frozen reliable route and expose actual recovery pressure', () => {
  for (const [key, data] of Object.entries(fixtures)) {
    const state = new GameState(); state.data = structuredClone(data);
    const maximum = state.getEffectiveStats().maxHp;
    const row = { key, before: { wins: 0, minHp: 0, hp: 0, revivals: 0 }, after: { wins: 0, minHp: 0, hp: 0, revivals: 0, blocked: 0 } };
    for (let seed = 1000; seed < 1100; seed++) for (const [label, enemy] of [['before', beforeBoss], ['after', boss]]) {
      const result = fight(data, enemy, seed);
      row[label].wins += Number(result.victory);
      row[label].minHp += Math.min(...result.logs.map(log => log.playerHp)) / maximum / 100;
      row[label].hp += result.remainingHp / maximum / 100;
      row[label].revivals += Number(result.logs.some(log => log.message.includes('全满复活')));
      if (label === 'after') row.after.blocked += result.logs.reduce((sum, log) => sum + (log.healingPrevented || 0), 0) / 100;
    }
    samples.push(row);
  }
  for (const row of samples) {
    assert.ok(row.after.wins >= 80, row.key + ' lost its reliable route: ' + row.after.wins);
    if (row.key === 'mage:balanced') {
      assert.ok(row.after.blocked > 5000, 'The counter did not reach real healing');
      assert.ok(row.after.minHp < row.before.minHp - .1, 'Mage pressure has no material effect');
    }
  }
});
const sealOnly = { ...boss, hp: 5000000, maxHp: 5000000, atk: 3500, def: 0, speed: 150,
  openingShield: 0, crit: 0, dodge: 0,
  abilities: [{ ...boss.abilities.find(ability => ability.hpThreshold), hpThreshold: .9999, echoes: null, statuses: [],
    manaDrainRatio: 0 }] };
function healingFixture(support = 'silver_dragon') {
  const data = structuredClone(fixtures['mage:balanced']);
  data.supportPetIds = [support, null];
  data.pets.push({ id: support, tier: PET_CONFIGS[support].defaultTier, level: 1, exp: 0, stamina: 100,
    apt: { ...PET_CONFIGS[support].defaultApt }, skills: [] });
  data.relics.unlocked = ['relic_yggdrasil'];
  data.estate.activePotions = [{ id: 'seal_fixture', remainingFights: 2, effect: { regenPercent: .05 } }];
  return data;
}
const healingStats = { hp: 80000, maxHp: 100000, mp: 100000, maxMp: 100000, atk: 800,
  def: 0, speed: 200, hit: 100, dodge: 0, crit: 0, counter: 0, lifesteal: 12, magicResist: 0 };
test('all sustained recovery uses actual reduced healing; expiry is timed and purification cannot remove a boss channel', () => {
  const result = fight(healingFixture(), sealOnly, () => .5, healingStats);
  const start = result.logs.find(log => log.recoverySealStarted);
  const end = result.logs.find(log => log.recoverySealEnded === '20秒引导到期');
  assert.ok(start && end);
  assert.ok(Math.abs(end.time - start.time - 20) < .0001);
  const suppressed = result.logs.filter(log => log.healingPrevented);
  for (const source of ['吸血', '生命汲取', '职业光环', '银龙再生', '世界树', '圣水祝福']) {
    assert.ok(suppressed.some(log => log.healingSource === source), 'Recovery bypass: ' + source);
  }
  for (const log of suppressed) {
    assert.ok(log.time >= start.time && log.time < end.time);
    assert.ok(Math.abs(log.sealExpiresAt - start.time - 20) < .0001);
    assert.ok(log.healingPrevented > 0 && log.healingRestored >= 0);
  }
  assert.equal(result.duration, 300);
  assert.ok(result.timedOut);
  const noPurify = healingFixture(); noPurify.pets[0].skills = [];
  assert.deepEqual(result.logs.filter(log => log.healingPrevented).map(log => log.healingPrevented),
    fight(noPurify, sealOnly, () => .5, healingStats).logs.filter(log => log.healingPrevented).map(log => log.healingPrevented));
});
test('control interrupts an already active channel before healing; mana exhaustion also ends it without lingering recovery loss', () => {
  const controlled = healingFixture('succubus');
  let draw = 0;
  const result = fight(controlled, sealOnly, () => draw++ < 25 ? .5 : 0, healingStats);
  assert.ok(result.logs.some(log => log.recoverySealStarted), 'Control fixture prevented rather than interrupted the channel');
  const end = result.logs.find(log => log.recoverySealEnded === '控制打断引导');
  assert.ok(end, 'An armed channel survived control');
  assert.ok(!result.logs.slice(result.logs.indexOf(end) + 1).some(log => log.healingPrevented));
  const depleted = fight(healingFixture(), { ...sealOnly, mp: 250, maxMp: 250 }, () => .5, healingStats);
  assert.ok(!depleted.logs.some(log => log.healingPrevented || log.recoverySealStarted));
});
test('a purchased mana counter respects ownership and independent fatigue; saved checkpoints and backups remain unchanged', () => {
  const state = new GameState(); state.data = structuredClone(fixtures['mage:balanced']);
  const before = structuredClone(state.data), quote = state.getContractChoices().find(choice => choice.id === 'light_spirit');
  assert.ok(quote && state.hatchPetEgg('light_spirit').success);
  assert.ok(state.setPetPartySlot(1, 'light_spirit').success);
  assert.equal(state.data.gold, before.gold - quote.gold);
  assert.equal(state.data.crystal, before.crystal - quote.crystal);
  const tired = structuredClone(state.data);
  tired.pets.find(pet => pet.id === 'light_spirit').stamina = 59;
  const unowned = structuredClone(before); unowned.supportPetIds = ['light_spirit', null];
  const active = fight(state.data, boss, 1000), baseline = fight(before, boss, 1000);
  const blocked = combat => combat.logs.reduce((sum, log) => sum + (log.healingPrevented || 0), 0);
  assert.ok(active.victory && blocked(active) < blocked(baseline));
  assert.equal(blocked(fight(tired, boss, 1000)), blocked(baseline));
  assert.equal(blocked(fight(unowned, boss, 1000)), blocked(baseline));
  for (const data of [before, state.data]) {
    const copy = structuredClone(data);
    assert.ok(storage.parseBackupText(JSON.stringify({ saveData: data })));
    fight(data);
    assert.deepEqual(data, copy);
    assert.ok(!Object.hasOwn(data, 'recoverySeal'));
  }
});
test('backlash consumes actual current mana once per finite spell, cannot crit and shares real mitigation and absorption', () => {
  const enemy = { ...sealOnly, speed: 0, abilities: [{ ...boss.abilities.find(ability => ability.hpThreshold),
    hpThreshold: .9999, echoes: null, statuses: [], healingSuppression: null }] };
  const changes = { ...healingStats, hp: 1000000, maxHp: 1000000, mp: 10000, maxMp: 10000, magicAbsorb: 30 };
  const plain = fight(fixtures['mage:balanced'], enemy, () => .5, changes);
  const resistant = fight(fixtures['mage:balanced'], enemy, () => .5, { ...changes, magicResist: 60 });
  const critical = fight(fixtures['mage:balanced'], { ...enemy, crit: 100 }, () => .5, changes);
  const casts = combat => combat.logs.filter(log => log.manaDrained);
  assert.equal(casts(plain).length, 1);
  for (const result of [plain, resistant, critical]) {
    const cast = casts(result)[0];
    assert.equal(cast.manaDrained, Math.floor(cast.manaBeforeDrain * .6));
    assert.equal(cast.manaBacklashDamage, cast.manaDrained * 3);
    assert.ok(result.remainingMp >= 0 && result.remainingMp <= changes.maxMp);
    assert.ok(result.logs.some(log => log.message.includes('法力吸收')));
  }
  assert.equal(casts(plain)[0].manaBacklashDamage, casts(critical)[0].manaBacklashDamage);
  assert.ok(casts(resistant)[0].damage < casts(plain)[0].damage);
  const empty = fight(fixtures['mage:balanced'], enemy, () => .5, { ...changes, mp: 0, maxMp: 0 });
  assert.ok(!empty.logs.some(log => log.manaDrained));
  const physical = fight(fixtures['warrior:balanced'], enemy, () => .5, changes);
  assert.ok(physical.logs.some(log => log.manaDrained));
  assert.ok(physical.logs.filter(log => log.manaDrained).every(log => log.manaBacklashDamage === 0),
    'A target without a mana shield suffered shield overload');
});
test('trained mana aura and a depleted mana shield keep health and mana integral in the actual battle log', () => {
  const result = fight(fixtures['mage:balanced'], boss, 1000);
  assert.ok(result.logs.every(log => Number.isInteger(log.playerHp)), 'Fractional aura mana leaked through damage absorption into health');
  assert.ok(Number.isInteger(result.remainingMp));
  assert.ok(result.logs.every(log => Number.isInteger(log.playerMp) && Number.isInteger(log.enemyMp)),
    'Battle playback is missing actual current mana snapshots');
  assert.ok(result.logs.filter(log => log.message.includes('职业光环')).every(log => !/\d+\.\d{4}/.test(log.message)),
    'Long floating-point recovery values leaked into the battle UI');
});
writeFileSync('output/playwright/mage-finale-samples.json', JSON.stringify({ samples, failures }, null, 2));
assert.deepEqual(failures, []);
