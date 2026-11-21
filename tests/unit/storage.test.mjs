import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { storage, TOTAL_SLOTS } from '../../js/core/storage.js';

const values = new Map();
const saveKey = slot => `MOTA_WORLD_SAVE_SLOT_${slot}`;
const lockKey = slot => `MOTA_WORLD_SLOT_LOCK_${slot}`;
const readLease = slot => JSON.parse(localStorage.getItem(lockKey(slot)));

globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
};
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
globalThis.window = new EventTarget();
beforeEach(() => values.clear());

test('all five slots keep independent data and a selectable active slot', () => {
  assert.equal(TOTAL_SLOTS, 5);
  for (let slot = 1; slot <= TOTAL_SLOTS; slot++) {
    assert.equal(storage.saveToSlot(slot, { classId: 'warrior', level: slot, gold: 37 * slot }), true);
  }
  assert.equal(storage.setActiveSlotId(3), 3);
  assert.equal(storage.getActiveSlotId(), 3);
  assert.deepEqual(storage.load(), { classId: 'warrior', level: 3, gold: 111 });
  assert.deepEqual(storage.getAllSlots().map(info => [info.slotId, info.data.gold, info.isActive]), [
    [1, 37, false], [2, 74, false], [3, 111, true], [4, 148, false], [5, 185, false]
  ]);
});

test('exported JSON imports through the file API with identical save data', async t => {
  const data = { classId: 'mage', level: 17, gold: 192, bag: [] };
  let downloaded;
  let clicked = false;
  const link = { click() { clicked = true; } };
  globalThis.document = { createElement: () => link };
  globalThis.FileReader = class {
    async readAsText(file) {
      this.onload({ target: { result: await file.text() } });
    }
  };
  t.mock.method(URL, 'createObjectURL', file => {
    downloaded = file;
    return 'blob:save';
  });
  const revoke = t.mock.method(URL, 'revokeObjectURL', () => {});

  storage.exportJSON(data, 4);
  assert.ok(clicked);
  assert.match(link.download, /^mota_world_slot4_\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(downloaded.type, 'application/json');
  assert.equal(revoke.mock.calls[0].arguments[0], link.href);
  const envelope = JSON.parse(await downloaded.text());
  assert.equal(envelope.slotId, 4);
  assert.deepEqual(envelope.saveData, data);
  const imported = await new Promise((resolve, reject) => {
    storage.importJSON(downloaded, (error, save) => error ? reject(error) : resolve(save));
  });
  assert.deepEqual(imported, data);
});

test('corrupt slot JSON is isolated and invalid backups are rejected', t => {
  t.mock.method(console, 'error', () => {});
  localStorage.setItem(saveKey(2), '{bad json');
  assert.equal(storage.saveToSlot(4, { classId: 'hunter', level: 3 }), true);
  assert.equal(storage.loadFromSlot(2), null);
  assert.equal(storage.getSlotInfo(2).dateString, '读取失败');
  assert.equal(storage.loadFromSlot(4).classId, 'hunter');
  assert.equal(localStorage.getItem(saveKey(2)), '{bad json');
  assert.throws(() => storage.parseBackupText('{bad json'), SyntaxError);
  assert.throws(() => storage.parseBackupText('{"saveData":{"classId":"unknown","level":1}}'), /无效/);
});

test('localStorage lease renews, rejects a rival, and releases only its own claims', async t => {
  let now = 1000;
  let nextTimer = 0;
  const heartbeat = new Map();
  t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'setInterval', (tick, delay) => {
    assert.equal(delay, 5000);
    heartbeat.set(++nextTimer, tick);
    return nextTimer;
  });
  t.mock.method(globalThis, 'clearInterval', timer => heartbeat.delete(timer));
  const first = (await import('../../js/core/storage.js?lease-first')).storage;
  const second = (await import('../../js/core/storage.js?lease-second')).storage;

  assert.equal(await first.activateSlot(1), true);
  const owner = readLease(1).ownerId;
  assert.ok(owner);
  assert.equal(readLease(1).expiresAt, now + 15000);
  assert.equal(await second.activateSlot(1), false);
  now += 5000;
  heartbeat.get(1)();
  assert.deepEqual(readLease(1), { ownerId: owner, expiresAt: now + 15000 });
  assert.equal(await first.activateSlot(2), true);
  assert.equal(readLease(1), null);
  assert.equal(heartbeat.size, 1);
  const expired = readLease(2);
  now = expired.expiresAt + 1;
  assert.equal(await second.activateSlot(2), true);
  const rival = readLease(2);
  assert.notEqual(rival.ownerId, expired.ownerId);
  assert.equal(first.saveToSlot(2, { level: 9 }), false);
  heartbeat.get(2)();
  assert.deepEqual(readLease(2), rival);
  window.dispatchEvent(new Event('beforeunload'));
  assert.equal(readLease(2), null);
  assert.equal(heartbeat.size, 0);
});

test('watchSlot replaces its previous listener and unwatch cleans up', async () => {
  const watched = (await import('../../js/core/storage.js?watcher')).storage;
  assert.equal(await watched.activateSlot(1), true);
  try {
    let conflicts = 0;
    watched.onConflict = () => conflicts++;
    const staleUnwatch = watched.watchSlot();
    const unwatch = watched.watchSlot();
    staleUnwatch();
    const dispatch = slot => window.dispatchEvent(Object.assign(new Event('storage'), {
      key: saveKey(slot), newValue: '{"external":true}'
    }));
    dispatch(2);
    assert.equal(conflicts, 0);
    dispatch(1);
    assert.equal(conflicts, 1);
    unwatch();
    dispatch(1);
    assert.equal(conflicts, 1);
  } finally {
    window.dispatchEvent(new Event('beforeunload'));
  }
});
