const atlasGroups = [
  ['forest-enemies.png', 2, [
    'monster_wolf', 'monster_goblin', 'monster_bear', 'boss_forest'
  ]],
  ['canyon-wasteland-enemies.png', 4, [
    'monster_lizard', 'monster_mage', 'monster_ogre', 'boss_canyon',
    'monster_bird', 'monster_centaur', 'monster_rex', 'boss_wasteland'
  ]],
  ['swamp-volcano-enemies.png', 4, [
    'monster_slime', 'monster_siren', 'monster_hydra', 'boss_swamp',
    'monster_golem', 'monster_dragon_guard', 'monster_boss_guard', 'boss_volcano'
  ]]
];

const portraits = new Map(atlasGroups.flatMap(([file, columns, keys]) =>
  keys.map((key, index) => [key, { file, columns, x: index % columns, y: Math.floor(index / columns) }])
));

// Reuse the existing painted black dragon without changing either enemy's data.
portraits.set('boss_dragonking', portraits.get('boss_volcano'));
// The bounty/thief presentation reuses the painted rogue portrait.
portraits.set('boss_thief', portraits.get('monster_siren'));

// Boss IDs deliberately stay separate from ordinary enemies sharing an SVG icon.
export function getWildPortraitStyle(key) {
  const portrait = portraits.get(key);
  if (!portrait) {
    // 图集未收录的新怪：回退到落盘的 individual/<key>.png（美术按 B 版规则落盘）
    if (!key) return null;
    return `--enemy-portrait-image:url('/images/portraits/individual/${key}.png');--enemy-portrait-size:100% 100%;--enemy-portrait-x:50%;--enemy-portrait-y:50%`;
  }
  return `--enemy-portrait-image:url('/images/portraits/${portrait.file}');--enemy-portrait-size:${portrait.columns * 100}% 200%;--enemy-portrait-x:${portrait.x * 100 / (portrait.columns - 1)}%;--enemy-portrait-y:${portrait.y * 100}%`;
}

const WILD_REGION_ORDER = ['forest', 'canyon', 'ice_north', 'wasteland', 'desert', 'swamp', 'dark_cave', 'volcano'];

export function getWildRegionStyle(mapId) {
  const index = WILD_REGION_ORDER.indexOf(mapId);
  const y = Math.max(0, index) * 100 / (WILD_REGION_ORDER.length - 1);
  return `--region-y:${y}%`;
}
