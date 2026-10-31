import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
};
const { GameState, gameState } = await import('../js/core/state.js');
const { getJourneyGuidance } = await import('../js/core/journey.js');
const { getQuestList } = await import('../js/config/quests.js');
const { QuestTracker } = await import('../js/ui/questTracker.js');
const { selectBagItems, getBagItemDestination } = await import('../js/ui/bagView.js');
const { storage } = await import('../js/core/storage.js');
const test = (name, run) => { run(); console.log('PASS ' + name); };

test('new chapter three guides forging while legacy chapter three retains hatching', () => {
  const state = new GameState();
  state.data.onboardingVersion = 2;
  state.data.currentQuestId = 'quest_3';
  state.data.freeStatPoints = 0;
  state.data.equipped.weapon = { slot: 'weapon' };
  state.data.equipped.armor = { slot: 'armor' };
  assert.equal(getJourneyGuidance(state.data).action, 'enhance');
  assert.match(getJourneyGuidance(state.data).title, /升星/);
  assert.doesNotMatch(getJourneyGuidance(state.data).title, /孵化/);
  state.data.onboardingVersion = 1;
  assert.match(getJourneyGuidance(state.data).title, /孵化/);
});

test('bottom navigation follows live preparation before the quest destination without changing assets', () => {
  const previous = gameState.data, previousDocument = globalThis.document;
  const state = new GameState();
  state.data.onboardingVersion = 2;
  state.data.currentQuestId = 'quest_2';
  state.data.equipped.weapon = { slot: 'weapon' };
  let handler, routed;
  globalThis.document = { getElementById: id => id === 'btn-auto-nav-quest' ? { addEventListener: (_event, action) => { handler = action; } } : null };
  gameState.data = state.data;
  try {
    const tracker = new QuestTracker('unused', (tab, action) => { routed = { tab, action }; });
    tracker.bindEvents(getQuestList(state.data)[1], false);
    const before = JSON.stringify(gameState.data);
    handler();
    assert.deepEqual(routed, { tab: 'bag', action: 'equip_gear' });
    assert.equal(JSON.stringify(gameState.data), before);
    state.data.equipped.armor = { slot: 'armor' };
    state.data.freeStatPoints = 6;
    handler();
    assert.deepEqual(routed, { tab: 'hero', action: 'allocate_stats' });
  } finally { gameState.data = previous; globalThis.document = previousDocument; }
});

test('inventory sorting filters real class and level requirements without mutating owned items', () => {
  const state = new GameState();
  state.data.level = 20;
  state.data.bag = [
    { uid: 'a', slot: 'weapon', reqLevel: 10, quality: 'blue' },
    { uid: 'b', slot: 'weapon', reqLevel: 15, quality: 'gold' },
    { uid: 'c', slot: 'weapon', reqLevel: 30, quality: 'darkgold' },
    { uid: 'd', slot: 'weapon', reqLevel: 1, reqClass: 'mage', quality: 'purplegold' },
    { uid: 'e', slot: 'boots', reqLevel: 7, quality: 'blue' },
    { uid: 'f', id: 'pet_food', count: 2 }
  ];
  const before = JSON.stringify(state.data);
  assert.deepEqual(selectBagItems(state.data, { wearable: true, slot: 'weapon', sort: 'level' }).map(item => item.uid), ['b', 'a']);
  assert.deepEqual(selectBagItems(state.data, { filter: 'consumable' }).map(item => item.uid), ['f']);
  assert.deepEqual(selectBagItems(state.data, { sort: 'quality' }).slice(0, 2).map(item => item.uid), ['d', 'c']);
  assert.equal(getBagItemDestination({ id: 'star_crystal' }).action, 'enhance');
  assert.equal(getBagItemDestination({ type: 'gem' }).action, 'socket_gem');
  assert.equal(getBagItemDestination({ id: 'unknown' }), null);
  assert.equal(JSON.stringify(state.data), before);
});

test('feeding rejects full or unavailable companions and preserves five legacy slots across repeated loads', () => {
  for (let slot = 1; slot <= 5; slot++) {
    const state = new GameState();
    state.notify = () => {};
    state.data.name = 'Legacy ' + slot;
    state.data.hasChosenClass = true;
    state.data.bag = [{ id: 'pet_food', uid: 'food_' + slot, count: 2 }];
    state.data.pets = [{ id: 'mermaid', tier: 'gold', level: 1, exp: 0, stamina: 100, apt: { str: 1000, int: 1000, dex: 1000, con: 1000 }, skills: [] }];
    const before = JSON.stringify(state.data);
    assert.equal(state.feedPet('mermaid').success, false);
    assert.equal(state.feedPet('unowned').success, false);
    assert.equal(JSON.stringify(state.data), before);
    state.data.pets[0].stamina = 70;
    assert.equal(state.feedPet('mermaid').success, true);
    assert.equal(state.data.pets[0].stamina, 100);
    assert.equal(state.data.bag[0].count, 1);
    storage.saveToSlot(slot, state.data);
  }
  const protectedValues = new Map(values);
  for (let slot = 1; slot <= 5; slot++) {
    storage.setActiveSlotId(slot);
    const otherSlots = new Map([...values].filter(([key]) => key.startsWith('MOTA_WORLD_SAVE_SLOT_') && key !== 'MOTA_WORLD_SAVE_SLOT_' + slot));
    const state = new GameState();
    state.loadOrInit();
    const loaded = JSON.stringify([state.data.bag, state.data.pets, state.data.gold, state.data.classId]);
    state.loadOrInit();
    assert.equal(JSON.stringify([state.data.bag, state.data.pets, state.data.gold, state.data.classId]), loaded);
    assert.equal(state.data.name, 'Legacy ' + slot);
    for (const [key, value] of otherSlots) assert.equal(values.get(key), value);
  }
  assert.equal([...protectedValues.keys()].filter(key => key.startsWith('MOTA_WORLD_SAVE_SLOT_')).length, 5);
});
