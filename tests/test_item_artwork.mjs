import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ITEM_ARTWORK } from '../js/ui/itemArtworkCatalog.js';
import { getItemArtwork } from '../js/ui/itemArtwork.js';
import { renderGameIcon, ICON_REGISTRY } from '../js/ui/iconHelper.js';
import { ITEM_SLOTS, OFFICIAL_SETS, SPECIAL_ITEMS, GEMS_CONFIG, generateEquipment, specializeEquipment, applyCanonicalItemName } from '../js/config/items.js';
import { RUNES, RUNIC_WORDS } from '../js/config/runes.js';
import { OFFICIAL_SET_ARTWORK, OFFICIAL_ITEM_ARTWORK } from '../js/ui/officialItemArtwork.js';
import { PET_SKILL_BOOKS } from '../js/config/petSkills.js';
import { ALCHEMY_RECIPES } from '../js/config/estate.js';
import { HOLY_RELICS } from '../js/config/relics.js';
import { FACTION_REWARDS } from '../js/config/factionWar.js';
import { QUEST_LIST } from '../js/config/quests.js';

const entries = [
  ...Object.values(SPECIAL_ITEMS), ...Object.values(GEMS_CONFIG), ...Object.values(RUNES),
  ...Object.values(PET_SKILL_BOOKS), ...ALCHEMY_RECIPES, ...HOLY_RELICS, ...RUNIC_WORDS, ...FACTION_REWARDS,
  ...QUEST_LIST.flatMap(quest => quest.rewards?.items || []),
  ...Object.keys(OFFICIAL_SETS), ...ITEM_SLOTS.map(slot => slot.id),
  ...['warrior', 'mage', 'hunter'].flatMap(classId => ITEM_SLOTS.map(slot => generateEquipment(slot.id, 20, 'gold', 'courage', classId))),
  ...fs.readdirSync(new URL('../images/items/', import.meta.url)).filter(name => name.endsWith('.svg')).map(name => 'images/items/' + name)
];
const before = JSON.stringify(entries);
for (const item of entries) {
  const label = typeof item === 'string' ? item : item.id;
  assert.ok(getItemArtwork(item, ICON_REGISTRY), 'Missing painting: ' + label);
  const html = renderGameIcon(item, { size: 'w-12 h-12' });
  assert.ok(html.includes('data-item-art='), 'Renderer bypassed painting: ' + label);
  assert.ok(!html.includes('.svg') && !html.includes('<svg'), 'Item still renders SVG: ' + label);
}
assert.equal(JSON.stringify(entries), before, 'Rendering mutated production data');
assert.equal(getItemArtwork('unknown-non-item', ICON_REGISTRY), null);
assert.equal(getItemArtwork('golden_dragon', ICON_REGISTRY), null, 'Pet portrait must not become a generic item');
assert.notEqual(getItemArtwork('rune_el').key, getItemArtwork('rune_sol').key, 'Runes still share one generic icon');
assert.notEqual(getItemArtwork('pet_egg_gold').key, getItemArtwork('pet_egg_darkgold').key, 'Egg tiers still share one icon');
for (const classId of ['warrior', 'mage', 'hunter']) {
  const item = generateEquipment('weapon', 20, 'gold', null, classId);
  const expected = { warrior: 'wpn_sword', mage: 'wpn_staff', hunter: 'wpn_bow' }[classId];
  assert.equal(getItemArtwork(item, ICON_REGISTRY).key, getItemArtwork(expected).key, 'Wrong class weapon painting');
}
for (const setId of ['courage', 'destiny_goddess', 'sagael_set', 'judge', 'guardian_knight', 'wargod_set']) {
  for (const slot of ITEM_SLOTS) {
    const item = generateEquipment(slot.id, 20, 'gold', setId, slot.id === 'weapon' ? 'mage' : 'warrior');
    const part = slot.id === 'weapon' ? 'staff' : slot.id;
    assert.equal(getItemArtwork(item, ICON_REGISTRY).key, `official_${setId}_${part}`, `Wrong official set art: ${setId}/${slot.id}`);
  }
  assert.equal(getItemArtwork(setId, ICON_REGISTRY).key, `official_${setId}_armor`, `Set compendium lost its source chest painting: ${setId}`);
}
for (const [key, artId] of [
  ['star_crystal', 'star_crystal'], ['socket_crystal', 'socket_crystal'], ['crystal_socket', 'socket_crystal'],
  ['diamond_1', 'socket_crystal'],
  ['protect_crystal', 'protect_crystal'], ['crystal_protect', 'protect_crystal'],
  ['pet_egg', 'pet_egg_darkgold'], ['pet_egg_random', 'pet_egg_gold'],
  ['destiny_stone', 'destiny_stone'], ['evolution_stone', 'evolution_stone'],
  ['key_redwood', 'key_redwood'], ['key_bronze', 'key_bronze'], ['key_platinum', 'key_platinum']
]) {
  assert.equal(getItemArtwork(key, ICON_REGISTRY).key, `official_${artId}`, `Wrong official supply art: ${key}`);
}
assert.equal(getItemArtwork('novice_weapon', ICON_REGISTRY).key, 'official_starter_weapon');
assert.equal(getItemArtwork('novice_armor', ICON_REGISTRY).key, 'official_starter_armor');
for (const [classId, part] of [['warrior', 'weapon'], ['mage', 'staff'], ['hunter', 'bow']]) {
  const item = specializeEquipment(QUEST_LIST[0].rewards.items[0], classId);
  assert.equal(getItemArtwork(item).key, `official_starter_${part}`, `Novice ${classId} weapon mismatch`);
}
for (const [id, oldName, newName] of [
  ['socket_crystal', '开孔水晶', '打孔水晶'],
  ['pet_egg_gold', '黄金神兽契约蛋', '黄金宠物蛋'],
  ['pet_egg_darkgold', '暗金神兽契约蛋', '暗金宠物蛋']
]) {
  const legacy = { id, name: oldName, count: 3, quality: 'gold', uid: 'legacy-' + id };
  const normalized = applyCanonicalItemName(legacy);
  assert.deepEqual(normalized, { ...legacy, name: newName });
  assert.equal(legacy.name, oldName, 'Name normalization mutated its input');
  assert.equal(applyCanonicalItemName(normalized), normalized, 'Name normalization is not idempotent');
}
const atlases = new Map();
for (const art of [
  ...Object.values(ITEM_ARTWORK), ...Object.values(OFFICIAL_ITEM_ARTWORK),
  ...Object.values(OFFICIAL_SET_ARTWORK).flatMap(set => Object.values(set))
]) {
  assert.ok(art.col >= 0 && art.col < art.columns && art.row >= 0 && art.row < art.rows, 'Cell outside atlas: ' + art.key);
  if (atlases.has(art.atlas)) continue;
  const bytes = fs.readFileSync(new URL('../' + art.atlas, import.meta.url));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', 'Artwork is not PNG: ' + art.atlas);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.ok(width / art.columns >= 256 && height / art.rows >= 256, 'Painting resolution too low');
  atlases.set(art.atlas, { width, height });
}
console.log(JSON.stringify({ checkedProductionAndLegacyInputs: entries.length, atlases: [...atlases], passed: true }, null, 2));
