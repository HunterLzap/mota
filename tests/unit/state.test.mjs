import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { GameState } from '../../js/core/state.js';
import { storage } from '../../js/core/storage.js';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
};
beforeEach(() => values.clear());

const dragon = () => ({
  id: 'golden_dragon', level: 1, exp: 0, stamina: 100, tier: 'gold',
  apt: { str: 1500, int: 1000, dex: 1200, con: 1400 }, skills: []
});

test('GameState initializes and reloads through the same public facade', () => {
  const state = new GameState();
  assert.equal(storage.load(), null);
  state.loadOrInit();
  assert.equal(state.data.level, 1);
  assert.equal(state.data.hasChosenClass, false);
  assert.deepEqual(state.data.bag, []);
  assert.equal(state.getResetDayKey(), 'action-day-1');
  assert.ok(state.getEffectiveStats().maxHp > 0);
  assert.deepEqual(new GameState().data.equipped, state.data.equipped);
});

test('equipment preview and real wear include equipment and gem attack', () => {
  const state = new GameState();
  const weapon = {
    id: 'test_sword', uid: 'test-sword', name: '铁剑', slot: 'weapon', quality: 'white',
    durability: 100, maxDurability: 100, stars: 0, stats: { atk: 35 },
    sockets: 1, gems: [{ id: 'gem_atk', stat: 'atk', val: 25 }]
  };
  state.data.bag.push(weapon);
  const stats = state.getEffectiveStats();
  const preview = state.getEquipmentPreview(weapon.uid);
  assert.ok(preview.success);
  assert.deepEqual(preview.before, stats);
  assert.equal(preview.after.atk, stats.atk + 60);
  assert.equal(state.data.equipped.weapon, null);
  assert.ok(state.equipItem(weapon.uid).success);
  assert.deepEqual(state.getEffectiveStats(), preview.after);
});

test('pet party and estate operations delegate and survive a reload', () => {
  const state = new GameState();
  state.data.hasChosenClass = true;
  state.data.pets = [dragon()];
  state.data.estate.herbs = { herb_dragonblood: 3, herb_starlight: 2 };
  assert.ok(state.setPetPartySlot(1, 'golden_dragon').success);
  assert.ok(state.setActivePet('golden_dragon').success);
  assert.deepEqual(state.data.supportPetIds, [null, null]);
  assert.ok(state.brewPotion('pot_titan').success);
  assert.equal(state.data.estate.herbs.herb_dragonblood, 0);
  state.completeBattle(true);
  const loaded = new GameState();
  loaded.loadOrInit();
  assert.equal(loaded.data.activePetId, 'golden_dragon');
  assert.equal(loaded.data.estate.activePotions[0].remainingFights, 2);
  assert.equal(loaded.data.estate.activePotions[0].id, 'pot_titan');
});

test('legacy wall-date strings migrate without resetting the current action day', () => {
  const state = new GameState();
  const saved = state.createDefaultData();
  const oldDate = new Date(2026, 0, 3).toDateString();
  saved.hasChosenClass = true;
  saved.actionClock.day = 8;
  saved.dailyResetDay = 8;
  saved.dailyResetDate = oldDate;
  saved.arena.lastResetDate = oldDate;
  saved.arena.challengesLeft = 2;
  saved.tavern.lastResetDate = oldDate;
  saved.tavern.bounties[0].status = 'in_progress';
  saved.pets = [dragon()];
  assert.ok(storage.save(saved));

  state.loadOrInit();
  const key = state.getResetDayKey();
  assert.equal(key, 'action-day-8');
  assert.equal(state.data.dailyResetDate, key);
  assert.equal(state.data.arena.lastResetDate, key);
  assert.equal(state.data.tavern.lastResetDate, key);
  assert.equal(state.data.arena.challengesLeft, 2);
  assert.equal(state.data.tavern.bounties[0].status, 'in_progress');
  assert.equal(state.data.pets[0].stamina, 100);
  assert.equal(state.resetDailyActivities(), false);
  assert.ok(state.addActionPoints(30).advanced);
  assert.equal(state.getResetDayKey(), 'action-day-9');
  assert.equal(state.data.arena.lastResetDate, state.getResetDayKey());
  assert.equal(state.data.tavern.lastResetDate, state.getResetDayKey());
  assert.equal(state.data.arena.challengesLeft, 5);
  assert.equal(state.data.tavern.bounties[0].status, 'in_progress');
  assert.equal(state.data.pets[0].stamina, 90);
});

test('saves predating the action clock keep their character and enter day one', () => {
  const state = new GameState();
  assert.ok(storage.save({
    classId: 'mage', level: 11, hasChosenClass: true, gold: 547,
    dailyResetDate: new Date(2020, 0, 1).toDateString()
  }));
  state.loadOrInit();
  assert.equal(state.data.classId, 'mage');
  assert.equal(state.data.level, 11);
  assert.equal(state.data.gold, 547);
  assert.equal(state.getResetDayKey(), 'action-day-1');
  assert.equal(state.data.arena.lastResetDate, state.getResetDayKey());
  assert.equal(state.data.tavern.lastResetDate, state.getResetDayKey());
});
