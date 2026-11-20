// Source crops, redraw prompts and provenance: output/official-item-reference-2026-11-01/.
const SET_IDS = ['starter', 'courage', 'destiny_goddess', 'sagael_set', 'judge', 'guardian_knight', 'wargod_set'];
const PARTS = ['helmet', 'armor', 'pants', 'cloak', 'gloves', 'boots', 'belt', 'necklace', 'ring', 'weapon', 'staff', 'bow'];
const ITEM_IDS = [
  'star_crystal', 'socket_crystal', 'refine_crystal', 'protect_crystal', 'goddess_blessing',
  'pet_egg_gold', 'pet_egg_darkgold', 'clear_crystal', 'destiny_stone', 'evolution_stone',
  'key_redwood', 'key_bronze', 'key_platinum', 'chest_wood', 'chest_iron', 'chest_gold',
  'coin_scroll_small', 'coin_scroll_medium', 'coin_scroll_large', 'pet_queue_normal', 'pet_queue_advanced'
];

const cell = (key, atlas, index, columns, rows) => ({
  key, atlas: `images/items/artwork/official/${atlas}.png`,
  col: index % columns, row: Math.floor(index / columns), columns, rows
});

export const OFFICIAL_SET_ARTWORK = Object.fromEntries(SET_IDS.map(setId => [
  setId, Object.fromEntries(PARTS.map((part, index) => [
    part, cell(`official_${setId}_${part}`, setId, index, 4, 3)
  ]))
]));

export const OFFICIAL_ITEM_ARTWORK = Object.fromEntries(ITEM_IDS.map((id, index) => [
  id, cell(`official_${id}`, 'supplies', index, 5, 5)
]));
OFFICIAL_ITEM_ARTWORK.crystal_socket = OFFICIAL_ITEM_ARTWORK.socket_crystal;
OFFICIAL_ITEM_ARTWORK.diamond_1 = OFFICIAL_ITEM_ARTWORK.socket_crystal;
OFFICIAL_ITEM_ARTWORK.crystal_protect = OFFICIAL_ITEM_ARTWORK.protect_crystal;
OFFICIAL_ITEM_ARTWORK.novice_weapon = OFFICIAL_SET_ARTWORK.starter.weapon;
OFFICIAL_ITEM_ARTWORK.novice_armor = OFFICIAL_SET_ARTWORK.starter.armor;
OFFICIAL_ITEM_ARTWORK.pet_egg = OFFICIAL_ITEM_ARTWORK.pet_egg_darkgold;
OFFICIAL_ITEM_ARTWORK.pet_egg_random = OFFICIAL_ITEM_ARTWORK.pet_egg_gold;
OFFICIAL_ITEM_ARTWORK.pet_egg_blue = OFFICIAL_ITEM_ARTWORK.pet_egg_gold;
OFFICIAL_ITEM_ARTWORK.pet_egg_purplegold = OFFICIAL_ITEM_ARTWORK.pet_egg_darkgold;

// Ordinary gear also follows the selected starter artwork instead of the older atlas.
const STARTER_ALIASES = {
  weapon: ['weapon', 'wpn_sword'],
  staff: ['wpn_staff'],
  bow: ['wpn_bow'],
  armor: ['armor', 'arm_chest', 'arm_robe'],
  pants: ['pants', 'eq_pants'],
  cloak: ['cloak', 'eq_cloak'],
  helmet: ['helmet', 'eq_helmet'],
  gloves: ['gloves', 'eq_gloves'],
  boots: ['boots', 'eq_boots'],
  belt: ['belt', 'eq_belt'],
  necklace: ['necklace', 'eq_necklace'],
  ring: ['ring', 'eq_ring']
};
for (const [part, aliases] of Object.entries(STARTER_ALIASES)) {
  for (const alias of aliases) OFFICIAL_ITEM_ARTWORK[alias] = OFFICIAL_SET_ARTWORK.starter[part];
}

// A set's chest piece also represents it in the existing set compendium.
const SET_ALIASES = {
  courage: 'set_courage', destiny_goddess: 'set_destiny_goddess',
  sagael_set: 'set_sagael', judge: 'set_judge',
  guardian_knight: 'set_guardian', wargod_set: 'set_wargod'
};
for (const [setId, legacyKey] of Object.entries(SET_ALIASES)) {
  OFFICIAL_ITEM_ARTWORK[setId] = OFFICIAL_SET_ARTWORK[setId].armor;
  OFFICIAL_ITEM_ARTWORK[legacyKey] = OFFICIAL_SET_ARTWORK[setId].armor;
}
