import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GameState } = await import('../js/core/state.js');
const { runCombat } = await import('../js/core/combat.js');
const { getTowerFloorData } = await import('../js/config/towerLevels.js');
const { DUNGEON_GATES, getDungeonFloorGuard } = await import('../js/config/dungeons.js');
const { PET_CONFIGS } = await import('../js/config/pets.js');
const { getBossTactics } = await import('../js/config/bossTactics.js');
const rows = [], failures = [];
function test(name, callback) {
  try { callback(); console.log('PASS ' + name); } catch (error) { failures.push({ name, error: error.message }); console.error('FAIL ' + name + ': ' + error.message); }
}
function fight(enemy, { main = 'golden_dragon', supports = [], merc = 'merc_cleric', book = false, stamina = 100, castle = false } = {}) {
  const state = new GameState();
  Object.assign(state.data, { hasChosenClass: true, onboardingVersion: 2, level: 85, activePetId: main, supportPetIds: [supports[0] || null, supports[1] || null] });
  state.data.estate.hiredMercId = merc;
  state.data.isCastleExplore = castle;
  state.data.pets = [main, ...supports].filter(Boolean).map(id => ({
    id, tier: PET_CONFIGS[id].defaultTier, level: 30, exp: 0, stamina,
    apt: { ...PET_CONFIGS[id].defaultApt }, skills: book && id === main ? ['book_purify'] : []
  }));
  const stats = { hp: 100000, maxHp: 100000, mp: 6000, maxMp: 6000, atk: 5000, def: 2000,
    speed: 160, hit: 100, crit: 80, dodge: 0, counter: 0, lifesteal: 0, magicResist: 0 };
  const before = structuredClone(state.data), random = Math.random;
  Math.random = () => .5;
  let result;
  try { result = runCombat(stats, enemy, state.data, enemy); } finally { Math.random = random; }
  assert.deepEqual(state.data, before, 'Combat sampling changed owned assets');
  rows.push({ enemy: enemy.name, main, supports, merc, book, stamina, victory: result.victory,
    seconds: result.duration, remainingHp: result.remainingHp, actions: result.actionCounts,
    casts: result.logs.filter(log => log.message.includes('施展【')).length,
    immunities: result.logs.filter(log => log.message.includes('免疫')).length,
    logs: result.logs });
  return result;
}
test('final boss opens a breakable ward while all base stats and legacy encounters remain unchanged', () => {
  const boss = getTowerFloorData(100, 2);
  assert.equal(boss.openingShield, 60000);
  assert.deepEqual(['hp', 'atk', 'def', 'speed'].map(key => boss[key]), [400000, 6200, 2600, 110]);
  assert.equal(boss.abilities[0].interval, 3);
  assert.ok(!getTowerFloorData(100, 1).openingShield);
  assert.equal(getTowerFloorData(100, 1).abilities[0].interval, 5);
  for (const floor of [11, 45, 99]) assert.ok(!getTowerFloorData(floor, 2).openingShield);
});
test('matching formation actually shatters the ward and ordinary damage still permits a win', () => {
  const enemy = getTowerFloorData(100, 2);
  // Both parties counter imprisonment; this comparison isolates breaking the ward.
  const ordinary = fight(enemy, { book: true, castle: true });
  const counter = fight(enemy, { main: 'faerie_dragon', merc: 'merc_paladin', book: true, castle: true });
  assert.ok(ordinary.logs.some(log => log.message.includes('余盾')));
  assert.ok(counter.logs.some(log => log.message.includes('烈火破界')));
  assert.equal(ordinary.victory, true);
  assert.equal(counter.victory, true);
  assert.ok(ordinary.logs.filter(log => log.message.includes('全满复活')).length <= 1);
  assert.ok(counter.duration < ordinary.duration, 'Breaking the shield has no actual action-time value');
});
test('endgame dungeon spells pass through the real guard producer and are preceded by a warning', () => {
  for (const gate of ['dragon_gate', 'spacetime_gate']) {
    const enemy = getDungeonFloorGuard(gate, DUNGEON_GATES.find(entry => entry.id === gate).totalFloors);
    assert.ok(enemy.mp >= 100 && enemy.abilities.length, 'Boss spell data was dropped');
    const result = fight(enemy);
    const warning = result.logs.findIndex(log => log.message.includes('首领蓄势'));
    const cast = result.logs.findIndex(log => log.message.includes(`施展【${enemy.abilities[0].name}】`));
    assert.ok(warning >= 0 && cast > warning);
    assert.ok(result.logs[cast].action > result.logs[warning].action);
  }
});
test('unicorn talent and a learned purification book are alternate counters, and fatigue removes both', () => {
  const enemy = getDungeonFloorGuard('spacetime_gate', 15);
  const plain = fight(enemy);
  const support = fight(enemy, { supports: ['unicorn'] });
  const book = fight(enemy, { book: true });
  const tired = fight(enemy, { supports: ['unicorn'], book: true, stamina: 59 });
  const slowed = result => result.logs.some(log => log.message.includes('勇者陷入减速'));
  assert.ok(slowed(plain) && slowed(tired));
  assert.ok(!slowed(support) && !slowed(book));
  assert.ok(plain.duration > support.duration && plain.duration > book.duration,
    'Debuff counter has no actual action-time value');
});
test('new ward does not fabricate dungeon enrage or sacrifice phases', () => {
  const result = fight(getTowerFloorData(100, 2), { book: true });
  assert.ok(result.logs.some(log => log.message.includes('神圣护盾')));
  assert.ok(!result.logs.some(log => log.message.includes('绝境嗜血狂暴') || log.message.includes('冥府死契召唤')));
});
test('preflight advice follows actual shield, spell timing and alternate counters without changing the encounter', () => {
  for (const enemy of [getTowerFloorData(100, 2), getDungeonFloorGuard('dragon_gate', 10), getDungeonFloorGuard('spacetime_gate', 15)]) {
    const before = structuredClone(enemy), tips = getBossTactics(enemy).join('\n');
    for (const ability of enemy.abilities) assert.ok(tips.includes(ability.hpThreshold
      ? `${ability.name}：生命降至${Math.round(ability.hpThreshold * 100)}%`
      : `${ability.name}：每${ability.interval}次`));
    if (enemy.openingShield) assert.ok(tips.includes('60,000') && tips.includes('普通攻击'));
    if (enemy.abilities.some(ability => ability.statuses?.some(status => status.type === 'slow'))) {
      assert.ok(tips.includes('独角兽') && tips.includes('神圣净化'));
    }
    assert.deepEqual(enemy, before);
  }
  assert.deepEqual(getBossTactics(getTowerFloorData(99, 2)), []);
});
mkdirSync('output/playwright', { recursive: true });
writeFileSync('output/playwright/boss-tactics-fixture-results.json', JSON.stringify({ kind: 'explicit combat fixture; not earned progression', rows, failures }, null, 2));
assert.deepEqual(failures, []);
