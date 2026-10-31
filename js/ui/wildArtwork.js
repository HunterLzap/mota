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

// Boss IDs deliberately stay separate from ordinary enemies sharing an SVG icon.
export function getWildPortraitStyle(key) {
  const portrait = portraits.get(key);
  if (!portrait) return null;
  return `--enemy-portrait-image:url('/images/portraits/${portrait.file}');--enemy-portrait-size:${portrait.columns * 100}% 200%;--enemy-portrait-x:${portrait.x * 100 / (portrait.columns - 1)}%;--enemy-portrait-y:${portrait.y * 100}%`;
}

export function getWildRegionStyle(mapId) {
  const index = ['forest', 'canyon', 'wasteland', 'swamp', 'volcano'].indexOf(mapId);
  return `--region-y:${Math.max(0, index) * 25}%`;
}
