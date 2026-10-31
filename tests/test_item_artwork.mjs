import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ITEM_ARTWORK } from '../js/ui/itemArtworkCatalog.js';
import { getItemArtwork } from '../js/ui/itemArtwork.js';
import { renderGameIcon, ICON_REGISTRY } from '../js/ui/iconHelper.js';
import { ITEM_SLOTS, OFFICIAL_SETS, SPECIAL_ITEMS, GEMS_CONFIG, generateEquipment } from '../js/config/items.js';
import { RUNES, RUNIC_WORDS } from '../js/config/runes.js';
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
const atlases = new Map();
for (const art of Object.values(ITEM_ARTWORK)) {
  assert.ok(art.col >= 0 && art.col < art.columns && art.row >= 0 && art.row < art.rows, 'Cell outside atlas: ' + art.key);
  if (atlases.has(art.atlas)) continue;
  const bytes = fs.readFileSync(new URL('../' + art.atlas, import.meta.url));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', 'Artwork is not PNG: ' + art.atlas);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.ok(width / art.columns >= 256 && height / art.rows >= 256, 'Painting resolution too low');
  atlases.set(art.atlas, { width, height });
}
console.log(JSON.stringify({ checkedProductionAndLegacyInputs: entries.length, atlases: [...atlases], passed: true }, null, 2));
