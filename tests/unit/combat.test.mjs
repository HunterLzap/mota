import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MERCENARIES } from '../../js/config/estate.js';
import { PET_CONFIGS } from '../../js/config/pets.js';
import {
  getActionInterval, getPlayerActionInterval, getPlayerActionSpeed, runCombat
} from '../../js/core/combat.js';

const stats = {
  hp: 40000, maxHp: 40000, mp: 10000, maxMp: 10000, atk: 130, def: 10,
  speed: 160, crit: 5, dodge: 0, hit: 100, counter: 0, lifesteal: 0
};
const opponent = { ...stats, mp: 0, maxMp: 0, speed: 30 };
const player = { classId: 'warrior', level: 80, pets: [], estate: {}, equipped: {} };

function fight(data = player, enemy = opponent, encounter = {}, seed = 20261121) {
  const original = Math.random;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try {
    return runCombat(stats, enemy, data, { name: '守卫', ...encounter });
  } finally {
    Math.random = original;
  }
}

test('constant speeds reuse the two intervals throughout the fight', t => {
  const expected = {
    player: getActionInterval(stats.speed, player.classId),
    enemy: getActionInterval(opponent.speed)
  };
  const sqrt = t.mock.method(Math, 'sqrt');
  const result = fight();
  assert.ok(result.logs.length > 25);
  assert.equal(sqrt.mock.callCount(), 2);
  assert.deepEqual(result.initialIntervals, expected);
  assert.ok(result.logs.every(log =>
    log.playerInterval === expected.player && log.enemyInterval === expected.enemy));
});

test('a slow status refreshes the cached interval and expiry restores it', () => {
  const result = fight(player, { ...opponent, mp: 20, maxMp: 20 }, { abilities: [{
    name: '霜息', interval: 2, mpCost: 10, multiplier: 1,
    statuses: [{ type: 'slow', ratio: 0.5, duration: 2 }]
  }] });
  const slow = result.logs.find(log => log.message.includes('勇者陷入减速'));
  const expires = result.logs.find(log => log.message.includes('减速结束'));
  assert.equal(slow.playerInterval, getActionInterval(stats.speed * 0.5, player.classId));
  assert.equal(expires.playerInterval, result.initialIntervals.player);
});

test('bard speed and combat intervals follow the mercenary configuration', () => {
  const bard = MERCENARIES.find(merc => merc.id === 'merc_bard');
  const data = { ...player, estate: { hiredMercId: bard.id } };
  assert.equal(bard.combatSpeedBonus, 25);
  assert.equal(getPlayerActionSpeed(stats, data) - getPlayerActionSpeed(stats, player), 25);
  const original = bard.combatSpeedBonus;
  try {
    bard.combatSpeedBonus = 37;
    const result = fight(data);
    assert.equal(getPlayerActionSpeed(stats, data) - getPlayerActionSpeed(stats, player), 37);
    assert.equal(result.initialIntervals.player, getPlayerActionInterval(stats, data));
    assert.ok(result.logs.some(log => log.message.includes('行动速度提升 37 点')));
  } finally {
    bard.combatSpeedBonus = original;
  }
});

test('all three classes cast skills and all companion configurations settle', () => {
  for (const classId of ['warrior', 'mage', 'hunter']) {
    const result = fight({ ...player, classId });
    assert.ok(result.logs.some(log => log.actor === 'player' && log.message.includes('施展【')), classId);
  }
  for (const [id, config] of Object.entries(PET_CONFIGS)) {
    const pet = { id, level: 60, stamina: 100, apt: config.defaultApt, skills: [] };
    const result = fight({ ...player, activePetId: id, pets: [pet] });
    assert.ok(result.logs.some(log => log.turn === 0 && log.message.includes(config.traitName)), id);
    assert.equal(result.logs.at(-1).type, 'end', id);
    assert.ok(Number.isFinite(result.remainingHp) && result.actionCounts.player > 0, id);
  }
});

test('Naga disables enemy revival only while its trait is active', () => {
  const id = 'naga';
  const pet = { id, level: 60, stamina: 100, apt: PET_CONFIGS[id].defaultApt, skills: [] };
  const enemy = { ...opponent, hp: 100, maxHp: 100 };
  const encounter = { rebirth: { name: '守卫重生', hpRatio: 0.5 } };
  const active = fight({ ...player, activePetId: id, pets: [pet] }, enemy, encounter);
  assert.ok(active.victory);
  assert.ok(active.logs.some(log => log.message.includes('无法复活')));
  const tired = fight({ ...player, activePetId: id, pets: [{ ...pet, stamina: 79 }] }, enemy, encounter);
  assert.ok(tired.logs.some(log => log.message.includes('【首领重生】')));
});
