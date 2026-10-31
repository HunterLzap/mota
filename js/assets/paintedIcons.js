// Painted interface emblems and character heads. Legacy aliases remain display-only.
const emblems = [
  'ui_quest','ui_journal','ui_system','ui_combat',
  'ui_loot','ui_skill','ui_pet','ui_town',
  'ui_wild','ui_estate','ui_bag','ui_equip',
  'ui_rank','ui_archive','ui_settings','ui_compass'
];
const portraits = ['warrior','mage','hunter','merc_cleric','merc_paladin','merc_bard'];
export const PAINTED_ICONS = {};
emblems.forEach((key,index) => { PAINTED_ICONS[key] = { key, atlas:'images/ui/interface-emblems-v1.png', row:Math.floor(index/4), col:index%4, columns:4, rows:4 }; });
portraits.forEach((key,index) => { PAINTED_ICONS[key] = { key, atlas:'images/portraits/character-heads-v1.png', row:Math.floor(index/3), col:index%3, columns:3, rows:2 }; });
const aliases = {
  avatar_warrior:'warrior',hero_warrior:'warrior',avatar_mage:'mage',hero_mage:'mage',avatar_hunter:'hunter',hero_hunter:'hunter',
  bld_palace:'ui_town',bld_tower:'ui_town',bld_tavern:'ui_journal',bld_smithy:'ui_equip',
  bld_estate:'ui_estate',bld_arena:'ui_combat',bld_dragons:'ui_pet',
  quest:'ui_quest',journal:'ui_journal',system:'ui_system',settings:'ui_settings',compass:'ui_compass'
};
for (const [alias,key] of Object.entries(aliases)) PAINTED_ICONS[alias] = PAINTED_ICONS[key];

export function getPaintedIcon(itemOrKey) {
  if (!itemOrKey) return null;
  const lookup = value => typeof value === 'string' ? PAINTED_ICONS[value.replace(/^\/?images\/(heroes|ui)\//,'').replace(/\.svg$/,'')] : null;
  if (typeof itemOrKey === 'object') return lookup(itemOrKey.id || itemOrKey.key) || lookup(itemOrKey.icon) || null;
  return lookup(itemOrKey) || null;
}

export function renderPaintedIcon(itemOrKey, options = {}) {
  const art = getPaintedIcon(itemOrKey);
  if (!art) return '';
  return `<span class="painted-icon ${options.size || 'w-7 h-7'} ${options.className || ''} inline-block pointer-events-none select-none" aria-hidden="true" data-painted-icon="${art.key}" style="background-image:url('${art.atlas}');background-size:${art.columns*100}% ${art.rows*100}%;background-position:${art.col*100/(art.columns-1)}% ${art.row*100/(art.rows-1)}%;background-repeat:no-repeat"></span>`;
}
