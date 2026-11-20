// 亚诺皇家酒馆：每日赏金悬赏令、游吟诗人与麦酒见闻配置
// 严格遵守纯正西方高魔题材、零 Emoji、SVG 矢量渲染铁律

export const TAVERN_BOUNTIES = [
  {
    id: 'bounty_shadow_wolf',
    stars: 1,
    title: '【一星悬赏令】啸月幽影狼王',
    targetName: '幽影狼王',
    avatar: 'pet_winter_wolf',
    icon: 'images/pets/pet_winter_wolf.svg',
    reqLevel: 5,
    stats: { hp: 1600, atk: 98, def: 58, speed: 18, crit: 8, dodge: 6 },
    rewards: {
      gold: 2000,
      exp: 1000,
      prestige: 30,
      crystal: 15,
      items: [
        { id: 'bait_normal', name: '普通鱼饵', count: 2, type: 'material', quality: 'blue', icon: 'images/items/bait_normal.svg', desc: '带到王都垂钓水域使用；一星悬赏每天提供。' },
        { id: 'key_redwood', name: '红木钥匙', count: 2, type: 'key', quality: 'green', icon: 'images/items/key_redwood.svg', desc: '开启魔塔1~10层' },
        { id: 'pet_food', name: '魔能兽肉排', count: 5, type: 'material', quality: 'blue', icon: 'images/items/pet_food.svg', desc: '补充神兽体力' },
        { id: 'pet_food_basic', name: '普通宠物口粮', count: 3, type: 'material', quality: 'white', icon: 'images/items/pet_food.svg', desc: '补充神兽体力' }
      ]
    },
    desc: '王国治安官布告：密林深处的恶狼在月夜变异狂暴，袭击多支采药小队。速将其斩杀，取回狼王獠牙！'
  },
  {
    id: 'bounty_masked_thief',
    stars: 2,
    title: '【二星悬赏令】夜行暗影女盗',
    targetName: '暗影女盗',
    avatar: 'boss_thief',
    icon: 'images/bosses/boss_thief.svg',
    reqLevel: 15,
    stats: { hp: 3500, atk: 185, def: 115, speed: 26, crit: 14, dodge: 12 },
    rewards: {
      gold: 3500,
      exp: 2200,
      prestige: 60,
      crystal: 30,
      items: [
        { id: 'pill_reborn', name: '远古重铸灵药', count: 3, type: 'material', quality: 'darkgold', icon: 'images/items/pill_reborn.svg', desc: '重塑神兽资质' },
        { id: 'star_crystal', name: '升星水晶', count: 4, type: 'material', quality: 'purple', icon: 'images/items/star_crystal.svg', desc: '装备锻造升星' }
      ]
    },
    desc: '赏金猎人公会密令：洗劫帝国商队的惯偷女盗潜伏在裂谷暗处，身手极为矫健。截获其赃物者重赏！'
  },
  {
    id: 'bounty_swamp_toad',
    stars: 3,
    title: '【三星悬赏令】腐毒沼泽恶蟾领主',
    targetName: '恶蟾领主',
    avatar: 'pet_medusa',
    icon: 'images/pets/pet_medusa.svg',
    reqLevel: 28,
    stats: { hp: 7200, atk: 330, def: 205, speed: 20, crit: 16, dodge: 8 },
    rewards: {
      gold: 6500,
      exp: 4800,
      prestige: 110,
      crystal: 50,
      items: [
        { id: 'protect_crystal', name: '保护水晶', count: 2, type: 'material', quality: 'purple', icon: 'images/items/crystal_protect.svg', desc: '升星失败绝不掉星' },
        { id: 'bait_luxury', name: '秘制高级鱼饵', count: 3, type: 'material', quality: 'gold', icon: 'images/items/bait_luxury.svg', desc: '垂钓金龙鱼必备' },
        { id: 'pet_food_luxury', name: '豪华宠物饼干', count: 1, type: 'material', quality: 'gold', icon: 'images/items/pet_food.svg', desc: '补充神兽体力' }
      ]
    },
    desc: '圣堂骑士团急件：毒沼恶蟾喷吐剧毒瘴气，侵蚀了边境要塞护城河，急需高阶勇者深入泥沼将其铲除！'
  },
  {
    id: 'bounty_canyon_wyvern',
    stars: 4,
    title: '【四星极险令】狂暴裂谷飞龙',
    targetName: '狂暴飞龙',
    avatar: 'boss_dragon_red',
    icon: 'images/bosses/boss_dragon_red.svg',
    reqLevel: 42,
    stats: { hp: 14500, atk: 550, def: 325, speed: 32, crit: 20, dodge: 14 },
    rewards: {
      gold: 13000,
      exp: 9500,
      prestige: 220,
      crystal: 100,
      items: [
        { id: 'crystal_gold', name: '黄金晶石', count: 3, type: 'material', quality: 'gold', icon: 'images/items/crystal_gold.svg', desc: '神兽突破与重铸' },
        { id: 'bait_luxury', name: '高级鱼饵', count: 2, type: 'material', quality: 'gold', icon: 'images/items/bait_luxury.svg', desc: '带到王都垂钓水域使用；四星悬赏每天提供。' },
        { id: 'diamond_1', name: '碎裂金刚钻', count: 1, type: 'material', quality: 'darkgold', icon: 'images/items/crystal_socket.svg', desc: '开启装备宝石孔' },
        { id: 'pet_food_luxury', name: '豪华宠物饼干', count: 2, type: 'material', quality: 'gold', icon: 'images/items/pet_food.svg', desc: '补充神兽体力' }
      ]
    },
    desc: '王国元老院最高通缉：荒漠峡谷的古老飞龙苏醒，喷薄烈焰封锁了通往魔塔深渊的天空之道。屠灭恶龙者赐予公爵赏赐！'
  }
];

export const TAVERN_DRINKS = [
  {
    id: 'drink_dwarf_stout',
    name: '矮人黑铁黑啤',
    icon: 'images/items/potion_hp.svg',
    costGold: 500,
    buff: {
      type: 'atk',
      atkPct: 0.08,
      desc: '攻击力提升 +8%'
    },
    quote: '“在黑铁深处，矮人们用熔炉之火与大麦酿酒。喝下它，你的臂膀将如锻锤般刚猛！”——黑铁工匠·布洛克'
  },
  {
    id: 'drink_elven_nectar',
    name: '月光精灵甘露',
    icon: 'images/items/potion_mp.svg',
    costGold: 800,
    buff: {
      type: 'speed_dodge',
      dodge: 8,
      speed: 16,
      desc: '闪避率提升 +8%，先手速度 +16 点'
    },
    quote: '“从世界树初绽的新芽收集的晨露，让游侠的脚步轻盈如微风，令敌人的箭矢尽数落空！”——游吟诗人·莉莉丝'
  },
  {
    id: 'drink_dragon_rum',
    name: '炼狱炎龙烈性朗姆',
    icon: 'images/items/crystal_darkgold.svg',
    costGold: 1500,
    buff: {
      type: 'crit',
      crit: 12,
      desc: '致命暴击率提升 +12%'
    },
    quote: '“饮下沸腾的赤红烈酒，胸腔如同巨龙吐息！每一剑都将精准撕裂敌人的坚硬骨甲！”——退役佣兵长·巴顿'
  }
];
