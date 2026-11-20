import { ITEM_ARTWORK } from './itemArtworkCatalog.js';
import { OFFICIAL_ITEM_ARTWORK, OFFICIAL_SET_ARTWORK } from './officialItemArtwork.js';

// Old saves keep their icon strings. Only the presentation resolves them to painted atlases.
const token = value => typeof value === 'string'
  ? value.replace(/^\/?images\/items\//, '').replace(/\.(svg|png|webp)$/, '') : '';

export function getItemArtwork(itemOrKey, registry = {}) {
  if (!itemOrKey) return null;
  const item = typeof itemOrKey === 'object' ? itemOrKey : null;
  const key = item ? item.id || item.key || '' : itemOrKey;
  const byToken = value => OFFICIAL_ITEM_ARTWORK[token(value)] || ITEM_ARTWORK[token(value)];
  const lookup = value => byToken(value) || byToken(registry[value]);
  const setId = item && (item.setId || item.set || (['novice_weapon', 'novice_armor'].includes(key) ? 'starter' : ''));
  const set = OFFICIAL_SET_ARTWORK[setId];
  if (set && item.slot) {
    const part = item.slot === 'weapon'
      ? ({ mage: 'staff', hunter: 'bow' }[item.reqClass] || 'weapon') : item.slot;
    if (set[part]) return set[part];
  }
  // Specific IDs distinguish rune stones and egg tiers which historically shared one SVG.
  let art = lookup(key);
  if (!art && item?.slot === 'weapon' && item.reqClass) {
    art = lookup({ warrior: 'wpn_sword', mage: 'wpn_staff', hunter: 'wpn_bow' }[item.reqClass]);
  }
  if (!art && item?.slot === 'armor' && item.reqClass === 'mage') art = lookup('arm_robe');
  if (!art && item?.icon) art = lookup(item.icon);
  if (!art && item?.slot) art = lookup(item.slot);
  if (!art && item?.setId) art = lookup(item.setId);
  if (!art && /^book_/.test(key)) art = lookup('skill_book');
  if (!art && /^pet_egg_/.test(key)) art = lookup('pet_egg');
  if (!art && item?.runes?.length) art = lookup('rune_stone');
  return art || null;
}

export function renderItemArtwork(itemOrKey, options = {}, registry = {}) {
  const art = getItemArtwork(itemOrKey, registry);
  if (!art) return '';
  const x = art.columns > 1 ? art.col * 100 / (art.columns - 1) : 0;
  const y = art.rows > 1 ? art.row * 100 / (art.rows - 1) : 0;
  // The full-resolution painting is cropped by CSS, never replaced by traced vectors.
  return `<span class="item-artwork ${options.size || 'w-7 h-7'} ${options.className || ''} inline-block pointer-events-none select-none" aria-hidden="true" data-item-art="${art.key}" data-art-atlas="${art.atlas}" style="background-image:url('${art.atlas}');background-size:${art.columns * 100}% ${art.rows * 100}%;background-position:${x}% ${y}%;background-repeat:no-repeat"></span>`;
}
