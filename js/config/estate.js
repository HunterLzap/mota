// 领地庄园、炼金工坊与佣兵伙伴配置 (单人模式核心养成)
export const ALCHEMY_RECIPES = [
  {
    id: 'pot_titan',
    name: '泰坦巨人魔药',
    icon: 'pot_titan',
    quality: 'purple',
    desc: '饮下后体魄如古神泰坦！战斗中提升 35% 最大生命值与 25% 护甲，生效 3 场战斗！',
    materials: { herb_dragonblood: 3, herb_starlight: 2 },
    effect: { hpMultiplier: 1.35, defMultiplier: 1.25, fights: 3 }
  },
  {
    id: 'pot_rage',
    name: '战神狂暴合剂',
    icon: 'pot_rage',
    quality: 'purple',
    desc: '体内涌动烈焰之怒！战斗中攻击力提升 35%，暴击率提升 18%，生效 3 场战斗！',
    materials: { herb_dragonblood: 3, herb_spiritflower: 2 },
    effect: { atkMultiplier: 1.35, critBonus: 18, fights: 3 }
  },
  {
    id: 'pot_blessing',
    name: '圣水祝福灵药',
    icon: 'pot_blessing',
    quality: 'darkgold',
    desc: '神圣光辉环绕！战斗中每10秒自动回复12%最大生命值，生效3场战斗！',
    materials: { herb_starlight: 3, herb_spiritflower: 3 },
    effect: { regenPercent: 0.12, fights: 3 }
  },
  {
    id: 'pot_dragonblood',
    name: '古代龙血潜能秘药',
    icon: 'pot_dragonblood',
    quality: 'darkgold',
    desc: '永久获得5点自由潜能；此药累计最多提供100点额外潜能。已获得的潜能不会减少。',
    materials: { herb_dragonblood: 6, herb_spiritflower: 6, herb_starlight: 6 },
    costCrystal: 60,
    effect: { permanentStats: 5, permanentStatsCap: 100 }
  }
];

export const MERCENARIES = [
  {
    id: 'merc_cleric',
    name: '圣光主教·艾莲娜',
    role: '救赎神官',
    icon: 'merc_cleric',
    avatar: 'merc_cleric',
    hireCostGold: 5000,
    desc: '温柔而坚定的白袍神官，誓死守卫与她同行的骑士。',
    aura: '圣光救赎',
    auraDesc: '当主角生命值降至 40% 以下时，神官立即施放【圣光大治愈】，瞬间回复主角 35% 最大生命值！（每场限1次）'
  },
  {
    id: 'merc_paladin',
    name: '誓约神圣铁卫·高文',
    role: '重装护卫',
    icon: 'merc_paladin',
    avatar: 'merc_paladin',
    hireCostGold: 8000,
    desc: '王室退役近卫队长，身躯如山岳般不可撼动。',
    aura: '钢铁庇护',
    auraDesc: '战斗开始时激活【庇护神环】，主角与出战宠物受到的所有伤害永久减免 18%！'
  },
  {
    id: 'merc_bard',
    name: '逐风游侠诗人·罗杰',
    role: '战场乐师',
    icon: 'merc_bard',
    avatar: 'merc_bard',
    hireCostGold: 6000,
    combatSpeedBonus: 25,
    rewardBonus: { goldMultiplier: 1.4, crystalBonus: 1 },
    desc: '周游列国的传奇乐手，他的琴音能点燃战士的潜能。',
    aura: '疾风战歌',
    auraDesc: '行动速度提升25点，缩短出手间隔；野外探索与魔塔征伐获得的金币提升40%，魔晶掉落+1。'
  }
];
