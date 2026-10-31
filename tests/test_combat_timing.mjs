import assert from 'node:assert/strict';
import { getActionInterval, getPlayerActionInterval, runCombat } from '../js/core/combat.js';

const stats = { hp: 1000000, maxHp: 1000000, mp: 0, maxMp: 0, atk: 10, def: 0,
  speed: 100, crit: 0, dodge: 0, hit: 100, counter: 0, lifesteal: 0 };
function combat({ player = {}, enemy = {}, data = {}, encounter = {} } = {}) {
  const random = Math.random;
  Math.random = () => 0.8;
  try {
    return runCombat({ ...stats, ...player }, { ...stats, speed: 10, ...enemy },
      { name: 'Hero', classId: 'hunter', onboardingVersion: 2, level: 1,
        pets: [], equipped: {}, estate: {}, ...data }, { name: 'Guard', ...encounter });
  } finally { Math.random = random; }
}
const attacks = (result, actor) => result.logs.filter(log => log.actor === actor && log.message.includes('造成了'));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.001, `${actual} != ${expected}`);
function test(name, run) { run(); console.log(`PASS ${name}`); }

test('class base cadence and agility agree with production logs including NPC class and monster defaults', () => {
  for (const [classId, base] of [['warrior', 14], ['mage', 12], ['hunter', 10]]) {
    assert.equal(getActionInterval(0, classId), base);
    near(getActionInterval(100, classId), base / Math.sqrt(2));
    const result = combat({ data: { classId }, encounter: { classId: 'mage' } });
    near(result.initialIntervals.player, getPlayerActionInterval(stats, { classId, onboardingVersion: 2, level: 1, pets: [] }));
    near(result.initialIntervals.enemy, getActionInterval(10, 'mage'));
    near(attacks(result, 'player')[0].time, result.initialIntervals.player);
    assert.equal(result.actionCounts.player, Math.floor(300 / result.initialIntervals.player));
    assert.equal(getActionInterval(Infinity, classId), base);
  }
  assert.equal(getActionInterval(0, 'unknown'), 10);
});
test('speed increases actual attack frequency against the same opponent', () => {
  const slow = combat({ player: { speed: 20 } });
  const fast = combat({ player: { speed: 200 } });
  assert.equal(attacks(slow, 'player').length, 32);
  assert.equal(attacks(fast, 'player').length, 51);
  assert.equal(attacks(slow, 'enemy').length, 31);
  assert.equal(attacks(fast, 'enemy').length, 31);
  near(attacks(slow, 'player')[0].time, 9.1287);
  near(attacks(fast, 'player')[0].time, 5.7735);
  for (const result of [slow, fast]) {
    assert.equal(result.duration, 300);
    assert.equal(result.timedOut, true);
    assert.equal(result.victory, false);
    assert.ok(result.logs.every((log, index) => !index || log.time >= result.logs[index - 1].time));
  }
});

test('ties are deterministic and a lethal first action cancels the other queued action', () => {
  const result = combat({ enemy: { speed: 100, hp: 1, maxHp: 1 } });
  assert.equal(result.victory, true);
  near(result.duration, 7.0711);
  assert.deepEqual(result.actionCounts, { player: 1, enemy: 0 });
  assert.equal(result.timedOut, false);
});

test('slow preserves accumulated progress, lasts 20 seconds and restores the original cadence', () => {
  const player = { speed: 200 };
  const normal = combat({ player });
  const result = combat({ player, enemy: { mp: 10, maxMp: 10 }, encounter: { abilities: [
    { name: '霜息', interval: 2, mpCost: 10, multiplier: 1, statuses: [{ type: 'slow', ratio: 0.5, duration: 2 }] }
  ] } });
  const applied = result.logs.find(log => log.message.includes('勇者陷入减速'));
  const expired = result.logs.find(log => log.message.includes('减速结束'));
  assert.ok(applied && expired);
  near(expired.time - applied.time, 20);
  near(applied.playerInterval, 7.0711);
  near(expired.playerInterval, 5.7735);
  const hits = attacks(result, 'player');
  const previous = hits.filter(log => log.time < applied.time).at(-1);
  const next = hits.find(log => log.time > applied.time);
  near(next.time, applied.time + (1 - (applied.time - previous.time) / getActionInterval(200)) * getActionInterval(100));
  assert.ok(hits.filter(log => log.time <= 36).length < attacks(normal, 'player').filter(log => log.time <= 36).length);
  const recovered = hits.filter(log => log.time > expired.time);
  near(recovered[1].time - recovered[0].time, 5.7735);
});

test('stun consumes exactly one personal action instead of blocking the other combatant', () => {
  const enemy = { speed: 1500, mp: 10, maxMp: 10 };
  const player = { speed: 300 };
  const normal = combat({ player, enemy });
  const result = combat({ player, enemy, encounter: { abilities: [
    { name: '震慑', interval: 2, mpCost: 10, multiplier: 1, statuses: [{ type: 'stun', duration: 1 }] }
  ] } });
  const skipped = result.logs.filter(log => log.message.includes('眩晕倒地'));
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].time, 10);
  assert.equal(attacks(result, 'player').length, attacks(normal, 'player').length - 1);
  assert.equal(result.actionCounts.enemy, normal.actionCounts.enemy);
  assert.ok(attacks(result, 'player').some(log => log.time === 15));
});

test('reapplying slow refreshes its expiry without compounding the speed penalty', () => {
  const result = combat({ player: { speed: 200 }, enemy: { speed: 300, mp: 20, maxMp: 20 }, encounter: { abilities: [
    { name: '连续霜息', interval: 2, mpCost: 10, multiplier: 1, statuses: [{ type: 'slow', ratio: 0.5, duration: 2 }] }
  ] } });
  const applied = result.logs.filter(log => log.message.includes('勇者陷入减速'));
  const expired = result.logs.filter(log => log.message.includes('减速结束'));
  assert.equal(applied.length, 2);
  assert.equal(expired.length, 1);
  applied.forEach(log => near(log.playerInterval, 7.0711));
  near(expired[0].time, applied[1].time + 20);
  near(expired[0].playerInterval, 5.7735);
});

test('wound without a crit modifier preserves enemy critical hits throughout its lifetime', () => {
  const result = combat({ enemy: { crit: 100, mp: 10, maxMp: 10 }, encounter: { abilities: [
    { name: '红莲烈焰', interval: 2, mpCost: 10, multiplier: 1, statuses: [{ type: 'wound', damageBonus: 0.15, duration: 2 }] }
  ] } });
  const applied = result.logs.find(log => log.message.includes('勇者陷入重创'));
  const expired = result.logs.find(log => log.message.includes('重创已消退'));
  const affected = attacks(result, 'enemy').filter(log => log.time > applied.time && log.time < expired.time);
  assert.ok(affected.length > 0);
  assert.ok(affected.every(log => log.type === 'crit'));
});

test('a fast boss still telegraphs one personal action before casting and spends finite mana', () => {
  const result = combat({ enemy: { speed: 40000, mp: 30, maxMp: 30 }, encounter: { abilities: [
    { name: '试炼法术', interval: 2, mpCost: 10, multiplier: 1 }
  ] } });
  const warnings = result.logs.filter(log => log.message.includes('首领蓄势'));
  const casts = result.logs.filter(log => log.message.includes('施展【试炼法术】'));
  assert.equal(warnings.length, 3);
  assert.equal(casts.length, 3);
  casts.forEach((cast, index) => {
    assert.equal(cast.action, warnings[index].action + 1);
    near(cast.time - warnings[index].time, 0.5);
  });
});

test('regeneration follows ten-second ticks independent of attack speed', () => {
  const data = { estate: { activePotions: [{ remainingFights: 1, effect: { regenPercent: 0.001 } }] } };
  for (const speed of [20, 200]) {
    const result = combat({ player: { hp: 500000, speed }, data });
    const heals = result.logs.filter(log => log.message.includes('圣水祝福'));
    assert.equal(heals.length, 30);
    heals.forEach((heal, index) => assert.equal(heal.time, (index + 1) * 10));
  }
});

test('hunter aura and active pet speed bonuses change frequency; NPC arena excludes auras', () => {
  const data = { classId: 'hunter', level: 10 };
  const pve = combat({ data });
  const arena = combat({ data, encounter: { isPvp: true } });
  assert.ok(pve.actionCounts.player > arena.actionCounts.player);
  const pet = stamina => combat({ data: { activePetId: 'faerie_dragon', pets: [{ id: 'faerie_dragon', stamina }] } });
  assert.ok(pet(100).actionCounts.player > pet(59).actionCounts.player);
});

test('the first-strike rune only increases critical chance for the first personal action', () => {
  const result = combat({ player: { speed: 2000, crit: 75 }, data: { equipped: { boots: { runicWord: 'hermes' } } } });
  const critical = attacks(result, 'player').filter(log => log.type === 'crit');
  assert.equal(critical.length, 1);
  assert.equal(critical[0].action, 1);
});

test('invalid and extreme speeds remain bounded and never produce an endless simulation', () => {
  for (const speed of [NaN, Infinity, -Infinity, -10, undefined]) assert.equal(getActionInterval(speed), 10);
  assert.equal(getActionInterval(1e12), 0.5);
  const result = combat({ player: { speed: 1e12 }, enemy: { speed: NaN } });
  assert.equal(result.actionCounts.player, 600);
  assert.equal(result.actionCounts.enemy, 30);
  assert.equal(result.duration, 300);
});
