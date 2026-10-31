// 野外冒险地图与挂机巡航配置
export const MAPS = [
  {
    id: 'forest',
    name: '亚诺微光森林',
    reqLevel: 1,
    icon: 'map_forest',
    bg: 'from-emerald-950/80 to-slate-900',
    description: '王城郊外的古老密林，栖息着野生哥布林与恶狼，是初阶冒险者的试炼地。',
    idleRate: { expPerMin: 120, goldPerMin: 80, crystalPerMin: 1 },
    boss: {
      id: 'boss_forest',
      name: '暗夜狼王·芬里尔',
      title: '密林梦魇凶兽',
      icon: 'monster_wolf',
      level: 15,
      hp: 3500,
      atk: 180,
      def: 90,
      speed: 22,
      exp: 1000,
      gold: 5000,
      crystal: 30,
      guaranteedDrop: { id: 'crystal_gold', name: '黄金晶石', count: 2, icon: 'images/items/crystal_gold.svg' },
      dropQuality: 'gold'
    },
    monsters: [
      { name: '丛林灰狼', icon: 'monster_wolf', hp: 280, atk: 35, def: 18, exp: 420, gold: 87, dropRate: 0.15 },
      { name: '哥布林强盗', icon: 'monster_goblin', hp: 350, atk: 42, def: 22, exp: 600, gold: 105, dropRate: 0.18 },
      { name: '林地狂暴棕熊', icon: 'monster_bear', hp: 600, atk: 65, def: 35, exp: 900, gold: 162, dropRate: 0.25 }
    ]
  },
  {
    id: 'canyon',
    name: '迷雾低语峡谷',
    reqLevel: 20,
    icon: 'map_canyon',
    bg: 'from-amber-950/80 to-slate-900',
    description: '常年被毒雾与狂风笼罩的乱石峡谷，游荡着古代王国遗留的魔像与石化毒蜥。',
    idleRate: { expPerMin: 350, goldPerMin: 220, crystalPerMin: 3 },
    boss: {
      id: 'boss_canyon',
      name: '峡谷守护魔像·石心',
      title: '古代遗迹傀儡',
      icon: 'monster_ogre',
      level: 30,
      hp: 9800,
      atk: 380,
      def: 220,
      speed: 24,
      exp: 2500,
      gold: 12000,
      crystal: 60,
      guaranteedDrop: { id: 'crystal_gold', name: '黄金晶石', count: 3, icon: 'images/items/crystal_gold.svg' },
      dropQuality: 'gold'
    },
    monsters: [
      { name: '石化毒蜥', icon: 'monster_lizard', hp: 1200, atk: 110, def: 65, exp: 1350, gold: 275, dropRate: 0.2 },
      { name: '流浪黑巫师', icon: 'monster_mage', hp: 980, atk: 145, def: 45, exp: 1500, gold: 362, dropRate: 0.25 },
      { name: '峡谷巨锤食人魔', icon: 'monster_ogre', hp: 2500, atk: 180, def: 100, exp: 2700, gold: 450, dropRate: 0.3 }
    ]
  },
  {
    id: 'wasteland',
    name: '龙眠远古荒原',
    reqLevel: 40,
    icon: 'map_wasteland',
    bg: 'from-stone-900 to-slate-950',
    description: '传说中远古群龙埋骨的荒凉戈壁，散落着龙骨与强大的远古凶兽。',
    idleRate: { expPerMin: 950, goldPerMin: 680, crystalPerMin: 7 },
    boss: {
      id: 'boss_wasteland',
      name: '暴君龙皇·戈尔贡',
      title: '荒原远古霸主',
      icon: 'monster_rex',
      level: 50,
      hp: 28000,
      atk: 780,
      def: 450,
      speed: 28,
      exp: 6250,
      gold: 30000,
      crystal: 120,
      guaranteedDrop: { id: 'crystal_darkgold', name: '暗金晶石', count: 2, icon: 'images/items/crystal_darkgold.svg' },
      dropQuality: 'darkgold'
    },
    monsters: [
      { name: '骨刺雷鸟', icon: 'monster_bird', hp: 4500, atk: 340, def: 190, exp: 4500, gold: 850, dropRate: 0.28 },
      { name: '荒原骨铠半人马', icon: 'monster_centaur', hp: 5800, atk: 420, def: 230, exp: 6300, gold: 1050, dropRate: 0.3 },
      { name: '龙血暴龙', icon: 'monster_rex', hp: 11000, atk: 650, def: 380, exp: 11250, gold: 1625, dropRate: 0.35 }
    ]
  },
  {
    id: 'swamp',
    name: '悲伤毒瘴沼泽',
    reqLevel: 60,
    icon: 'map_swamp',
    bg: 'from-teal-950/90 to-slate-950',
    description: '充满腐蚀黑水与亡魂的禁忌湿地，隐藏着通往魔塔深处的秘密通道。',
    idleRate: { expPerMin: 2400, goldPerMin: 1800, crystalPerMin: 15 },
    boss: {
      id: 'boss_swamp',
      name: '深渊巨蛇·利维坦',
      title: '剧毒沼泽深渊主宰',
      icon: 'monster_hydra',
      level: 70,
      hp: 65000,
      atk: 1600,
      def: 850,
      speed: 34,
      exp: 15000,
      gold: 70000,
      crystal: 240,
      guaranteedDrop: { id: 'crystal_darkgold', name: '暗金晶石', count: 4, icon: 'images/items/crystal_darkgold.svg' },
      dropQuality: 'darkgold'
    },
    monsters: [
      { name: '深渊腐臭泥沼怪', icon: 'monster_slime', hp: 16000, atk: 880, def: 550, exp: 14250, gold: 2200, dropRate: 0.32 },
      { name: '暗影水妖射手', icon: 'monster_siren', hp: 14000, atk: 1150, def: 420, exp: 18000, gold: 2875, dropRate: 0.35 },
      { name: '沼泽九头巨蟒', icon: 'monster_hydra', hp: 28000, atk: 1550, def: 750, exp: 30000, gold: 3875, dropRate: 0.4 }
    ]
  },
  {
    id: 'volcano',
    name: '黑曜熔岩龙巢',
    reqLevel: 80,
    icon: 'map_volcano',
    bg: 'from-red-950/90 to-amber-950/90',
    description: '整座大陆核心的活火山腹地，黑翼龙皇在此俯瞰亚诺众生，遍地皆是史诗暗金宝藏！',
    idleRate: { expPerMin: 6500, goldPerMin: 4800, crystalPerMin: 35 },
    boss: {
      id: 'boss_volcano',
      name: '灭世龙皇·黑翼奥杜因',
      title: '亚诺大陆终焉主宰',
      icon: 'monster_boss_guard',
      level: 85,
      hp: 150000,
      atk: 3600,
      def: 1900,
      speed: 40,
      exp: 37500,
      gold: 150000,
      crystal: 500,
      guaranteedDrop: { id: 'crystal_purplegold', name: '紫金晶石', count: 2, icon: 'images/items/crystal_purplegold.svg' },
      dropQuality: 'purplegold'
    },
    monsters: [
      { name: '熔火黑曜石巨人', icon: 'monster_golem', hp: 45000, atk: 2400, def: 1400, exp: 37500, gold: 6000, dropRate: 0.38 },
      { name: '烈焰黑龙侍从', icon: 'monster_dragon_guard', hp: 58000, atk: 3100, def: 1600, exp: 48000, gold: 7750, dropRate: 0.42 },
      { name: '黑翼龙誓守卫长', icon: 'monster_boss_guard', hp: 95000, atk: 4500, def: 2100, exp: 82500, gold: 11250, dropRate: 0.5 }
    ]
  }
];
