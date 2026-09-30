// 王国角斗场与天梯天榜配置 (2010魔塔世界经典角斗竞技)
export const ARENA_RANKS = [
  { id: 'bronze', minPoints: 1000, title: '青铜角斗士', dailyPrestige: 50 },
  { id: 'silver', minPoints: 1200, title: '白银裁决者', dailyPrestige: 100 },
  { id: 'gold', minPoints: 1500, title: '黄金角斗圣', dailyPrestige: 180 },
  { id: 'paladin', minPoints: 2000, title: '圣殿大战神', dailyPrestige: 300 },
  { id: 'supreme', minPoints: 3000, title: '亚诺神圣角斗之王', dailyPrestige: 500 }
];

export const ARENA_OPPONENTS = [
  {
    id: 'opp_1',
    name: '近卫斥候·加文',
    title: '王城守备队新晋勇士',
    avatar: 'hero_warrior',
    level: 15,
    points: 1020,
    hp: 1200,
    atk: 140,
    def: 80,
    speed: 15,
    crit: 8,
    prestigeReward: 60,
    goldReward: 800
  },
  {
    id: 'opp_2',
    name: '断罪重剑·艾登',
    title: '竞技场常胜宿将',
    avatar: 'hero_warrior',
    level: 25,
    points: 1150,
    hp: 2800,
    atk: 240,
    def: 150,
    speed: 22,
    crit: 12,
    prestigeReward: 90,
    goldReward: 1500
  },
  {
    id: 'opp_3',
    name: '星痕魔导·塞西莉亚',
    title: '高阶奥术魔导名宿',
    avatar: 'hero_mage',
    level: 38,
    points: 1350,
    hp: 6500,
    atk: 480,
    def: 260,
    speed: 30,
    crit: 16,
    prestigeReward: 130,
    goldReward: 2600
  },
  {
    id: 'opp_4',
    name: '弑龙铁卫·莱因哈特',
    title: '王国皇家第一勇士',
    avatar: 'hero_warrior',
    level: 55,
    points: 1680,
    hp: 16000,
    atk: 880,
    def: 520,
    speed: 38,
    crit: 22,
    prestigeReward: 200,
    goldReward: 5000
  }
];

// 声望军需商行兑换池
export const PRESTIGE_SHOP_ITEMS = [
  {
    id: 'diamond_1',
    name: '金刚钻',
    icon: 'images/items/crystal_socket.svg',
    quality: 'darkgold',
    costPrestige: 100,
    desc: '用于铁匠铺宝石工坊为装备开启新的宝石孔（最高4孔）。',
    itemData: { id: 'diamond_1', name: '碎裂金刚钻', type: 'material', quality: 'darkgold', icon: 'images/items/crystal_socket.svg', desc: '开启装备宝石孔' }
  },
  {
    id: 'crystal_protect',
    name: '升星保护水晶',
    icon: 'images/items/crystal_protect.svg',
    quality: 'purple',
    costPrestige: 150,
    desc: '装备强化升星时使用，升星失败时确保绝不掉星。',
    itemData: { id: 'crystal_protect', name: '保护水晶', type: 'material', quality: 'purple', icon: 'images/items/crystal_protect.svg', desc: '强化保护' }
  },
  {
    id: 'gem_atk',
    name: '金刚石 (攻击)',
    icon: 'images/items/gem_atk.svg',
    quality: 'darkgold',
    costPrestige: 120,
    desc: '用于装备镶嵌，固定永久增加 25 点物理与魔法攻击力。',
    itemData: { id: 'gem_atk', name: '金刚石', stat: 'atk', val: 25, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_atk.svg', desc: '攻击力+25' }
  },
  {
    id: 'gem_def',
    name: '玛瑙石 (防御)',
    icon: 'images/items/gem_def.svg',
    quality: 'darkgold',
    costPrestige: 120,
    desc: '用于装备镶嵌，固定永久增加 18 点全身双抗防御值。',
    itemData: { id: 'gem_def', name: '玛瑙石', stat: 'def', val: 18, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_def.svg', desc: '防御值+18' }
  },
  {
    id: 'gem_hp',
    name: '红宝石 (生命)',
    icon: 'images/items/gem_hp.svg',
    quality: 'darkgold',
    costPrestige: 120,
    desc: '用于装备镶嵌，固定永久增加 180 点角色生命值上限。',
    itemData: { id: 'gem_hp', name: '红宝石', stat: 'maxHp', val: 180, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_hp.svg', desc: '生命上限+180' }
  },
  {
    id: 'gem_dex',
    name: '翡翠石 (速度)',
    icon: 'images/items/gem_dex.svg',
    quality: 'darkgold',
    costPrestige: 120,
    desc: '用于装备镶嵌，固定永久增加 8 点先手敏捷速度与闪避率。',
    itemData: { id: 'gem_dex', name: '翡翠石', stat: 'speed', val: 8, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_dex.svg', desc: '速度+8' }
  },
  {
    id: 'book_rebirth',
    name: '远古魔导书·【高级神佑】',
    icon: 'images/items/skill_book.svg',
    quality: 'purplegold',
    costPrestige: 300,
    desc: '神兽研习后获得【高级神佑】，阵亡时有几率神圣复活并恢复 50% 生命值！',
    itemData: { id: 'book_rebirth', name: '远古魔导书·【高级神佑】', bookId: 'book_rebirth', count: 1, type: 'skill_book', quality: 'purplegold', icon: 'images/items/skill_book.svg', desc: '神圣复生神技' }
  },
  {
    id: 'book_multihit',
    name: '远古魔导书·【高级连击】',
    icon: 'images/items/skill_book.svg',
    quality: 'purplegold',
    costPrestige: 300,
    desc: '神兽研习后获得【高级连击】，普攻时有 35% 几率触发双连击！',
    itemData: { id: 'book_multihit', name: '远古魔导书·【高级连击】', bookId: 'book_multihit', count: 1, type: 'skill_book', quality: 'purplegold', icon: 'images/items/skill_book.svg', desc: '双连击神技' }
  }
];
