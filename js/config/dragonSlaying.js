// 屠龙系统配置：100% 还原《魔塔世界》百度百科屠龙玩法
// 屠红龙（黄金装备/黄金蛋）、屠银龙（命运女神紫金/天命石/暗金蛋）、屠金龙（智慧/战神/胜利女神紫金）
export const DRAGON_TRIALS = [
  {
    id: 'slay_red_dragon',
    name: '远古赤焰狂龙',
    dragonType: 'red',
    icon: 'dragon_red',
    minLevel: 30,
    hp: 28000,
    atk: 420,
    def: 220,
    title: '烈焰领主',
    desc: '栖息在熔岩火山深处的赤焰巨龙。',
    rewardDesc: '高概率掉落黄金品质装备、黄金宠物蛋、升星水晶、大量金币',
    dropPool: ['gold_equip', 'pet_egg_gold', 'star_crystal']
  },
  {
    id: 'slay_silver_dragon',
    name: '耀光秘银巨龙',
    dragonType: 'silver',
    icon: 'dragon_silver',
    minLevel: 50,
    hp: 95000,
    atk: 880,
    def: 520,
    title: '圣银破晓',
    desc: '拥有圣光与时空庇佑的耀银古龙。',
    rewardDesc: '掉落【命运女神】紫金套装部件、天命石、暗金宠物蛋、保护水晶',
    dropPool: ['destiny_goddess', 'destiny_stone', 'pet_egg_darkgold', 'protect_crystal']
  },
  {
    id: 'slay_golden_dragon',
    name: '远古灭世金龙',
    dragonType: 'golden',
    icon: 'dragon_golden',
    minLevel: 70,
    hp: 350000,
    atk: 1950,
    def: 1100,
    title: '黄金龙王',
    desc: '亚诺文明古魔力凝聚而成的金色巨擘，巅峰荣耀挑战！',
    rewardDesc: '高爆【智慧女神】、【战神】、【胜利女神】极品紫金套装、紫金晶石、极品天命秘宝！',
    dropPool: ['wisdom_goddess', 'wargod_set', 'victory_goddess', 'crystal_purplegold']
  }
];
