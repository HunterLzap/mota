// 职业与国家阵营配置文件 (100% 贴合《魔塔世界》百度百科原著)

export const NATIONS = {
  sagael: {
    id: 'sagael',
    name: '萨格尔 (Sagael)',
    title: '东部荒芜 · 尚武游牧之邦',
    description: '坐落于荒芜的东部大陆，萨格尔人是勇敢尚武的游牧民族，在恶劣环境中与凶残兽人浴血抗争。',
    icon: 'images/ui/nation_sagael.svg',
    bannerColor: '#9e2a2b',
    buffDesc: '【战意狂澜】物理攻击力提升 5%，反击几率增加 5%',
    buffs: { atkPct: 0.05, counter: 5 }
  },
  kester: {
    id: 'kester',
    name: '克斯特 (Kester)',
    title: '西部密林 · 精灵自由之森',
    description: '在大灾难中保留了古木与森林的葱郁之地，人类与精灵、半精灵和睦共处，世代抵御低地蜥蜴人。',
    icon: 'images/ui/nation_kester.svg',
    bannerColor: '#2d6a4f',
    buffDesc: '【林籁灵动】敏捷闪避率提升 5%，暴击几率增加 5%',
    buffs: { dodge: 5, crit: 5 }
  },
  aden: {
    id: 'aden',
    name: '亚丁 (Aden)',
    title: '北地明珠 · 亚诺纯正遗脉',
    description: '雪域冰封中唯一幸存的古代亚诺名城，亚丁人自矜为正统亚诺后裔，与北方矮人盟誓抗击食人魔。',
    icon: 'images/ui/nation_aden.svg',
    bannerColor: '#1d3557',
    buffDesc: '【远古遗胄】基础防御力提升 5%，生命上限提升 8%',
    buffs: { defPct: 0.05, hpPct: 0.08 }
  }
};

export const CLASSES = {
  warrior: {
    id: 'warrior',
    name: '战士',
    title: '近身战的王者',
    description: '拥有强劲的力量和体格，擅长近战武器，是队伍的中坚力量。以力量为主属性，精通反击与强袭！',
    primaryStat: 'str',
    icon: 'images/heroes/avatar_warrior.svg',
    baseStats: {
      hp: 380,
      maxHp: 380,
      mp: 90,
      maxMp: 90,
      atk: 45,
      def: 30,
      speed: 16,
      crit: 8,
      dodge: 5,
      hit: 95,
      counter: 25,   // 原著战士核心反击
      lifesteal: 0,
      magicResist: 10
    },
    growth: {
      hp: 38,
      mp: 8,
      atk: 7.0,
      def: 5.0,
      speed: 1.2
    },
    // 原著 9 大正宗技能
    skills: [
      {
        id: 'w_sk_1',
        name: '英勇打击',
        category: 'attack',
        target: 'single_enemy',
        mpCost: 15,
        multiplier: 1.4,
        extraHit: 10,
        description: '提升攻击发起猛攻，同时提升 10% 命中率。'
      },
      {
        id: 'w_sk_2',
        name: '力量训练',
        category: 'passive',
        effect: { strBonus: 15, atkBonus: 20 },
        description: '被动：千锤百炼的身躯，永久提升角色力量与基础攻击。'
      },
      {
        id: 'w_sk_3',
        name: '战斗指挥',
        category: 'aura',
        effect: { teamAtkBoost: 0.12 },
        description: '光环：鼓舞战志，提升全队（含神兽、佣兵）12% 攻击力。'
      },
      {
        id: 'w_sk_4',
        name: '耐力训练',
        category: 'passive',
        effect: { defBonus: 25 },
        description: '被动：适应各种沉重伤痛，永久提升 25 点防御值。'
      },
      {
        id: 'w_sk_5',
        name: '战争艺术',
        category: 'aura',
        effect: { teamHitBoost: 10 },
        description: '光环：指挥若定，提升全队 10% 绝对命中率。'
      },
      {
        id: 'w_sk_6',
        name: '疾风连击',
        category: 'attack',
        target: 'single_enemy',
        mpCost: 30,
        multiHit: 2,
        multiplier: 0.95,
        description: '对敌人发起两次迅捷攻击，造成 2x95% 巨额物理伤害！'
      },
      {
        id: 'w_sk_7',
        name: '体质训练',
        category: 'passive',
        effect: { maxHpBonus: 260 },
        description: '被动：古代战士的强韧体质，永久增加 260 点生命上限。'
      },
      {
        id: 'w_sk_8',
        name: '致命训练',
        category: 'passive',
        effect: { critDmgBonus: 0.35 },
        description: '被动：掌握致命弱点，暴击伤害加成额外提高 35%。'
      },
      {
        id: 'w_sk_9',
        name: '毁灭打击',
        category: 'attack',
        target: 'single_enemy',
        mpCost: 45,
        multiplier: 2.2,
        extraCrit: 10,
        description: '毁灭性的终结一斩，造成 220% 伤害，同时暴击率额外提升 10%！'
      }
    ]
  },

  hunter: {
    id: 'hunter',
    name: '猎人',
    title: '敏捷灵动的丛林王者',
    description: '穿梭于茂密的森林，手持弓箭，身手矫健，与动物为伴。以敏捷为主属性，精通箭弩与控制！',
    primaryStat: 'dex',
    icon: 'images/heroes/avatar_hunter.svg',
    baseStats: {
      hp: 300,
      maxHp: 300,
      mp: 120,
      maxMp: 120,
      atk: 50,
      def: 20,
      speed: 26,
      crit: 20,
      dodge: 16,
      hit: 98,
      counter: 10,
      lifesteal: 0,
      magicResist: 15
    },
    growth: {
      hp: 28,
      mp: 12,
      atk: 7.5,
      def: 3.0,
      speed: 2.5
    },
    skills: [
      {
        id: 'h_sk_1',
        name: '瞄准射击',
        category: 'attack',
        target: 'single_enemy',
        mpCost: 15,
        multiplier: 1.45,
        extraHit: 10,
        description: '凝神屏息瞄准要害，造成 145% 远程伤害，同时提升 10% 命中率。'
      },
      {
        id: 'h_sk_2',
        name: '猫之优雅',
        category: 'passive',
        effect: { dexBonus: 15, speedBonus: 5 },
        description: '被动：如灵猫般迅捷无声，永久提升敏捷与攻击速度。'
      },
      {
        id: 'h_sk_3',
        name: '猎豹守护',
        category: 'aura',
        effect: { teamSpeedBoost: 0.15 },
        description: '光环：如猎豹疾驰，提升全队 15% 攻击出手速度。'
      },
      {
        id: 'h_sk_4',
        name: '熊之坚韧',
        category: 'passive',
        effect: { defBonus: 20, maxHpBonus: 150 },
        description: '被动：吸纳巨熊的顽强生机，永久提升防御值与生命上限。'
      },
      {
        id: 'h_sk_5',
        name: '灵狐守护',
        category: 'aura',
        effect: { teamCritResist: 0.15 },
        description: '光环：狡黠灵狐护佑，降低全队受到敌方暴击和破击伤害的几率 15%。'
      },
      {
        id: 'h_sk_6',
        name: '震荡射击',
        category: 'attack',
        target: 'single_enemy',
        mpCost: 35,
        multiplier: 1.7,
        stunChance: 25,
        description: '震荡破空重箭，造成 170% 伤害，并有 25% 几率击晕目标使其丧失行动！'
      },
      {
        id: 'h_sk_7',
        name: '鹰之威仪',
        category: 'passive',
        effect: { dodgeBonus: 8 },
        description: '被动：锐如鹰隼俯瞰全局，闪避率额外增加 8%。'
      },
      {
        id: 'h_sk_8',
        name: '虎之凶猛',
        category: 'passive',
        effect: { critBonus: 6, critDmgBonus: 0.3 },
        description: '被动：猛兽潜能，大幅提升破击与暴击伤害加成。'
      },
      {
        id: 'h_sk_9',
        name: '致命射击',
        category: 'attack',
        target: 'single_enemy',
        mpCost: 50,
        multiplier: 2.35,
        extraCrit: 15,
        description: '倾注全力的致命贯穿箭，造成 235% 伤害，同时暴击破击几率提升 15%！'
      }
    ]
  },

  mage: {
    id: 'mage',
    name: '法师',
    title: '超自然力的掌控者',
    description: '运用古亚诺魔法武装自己，精通法术来弥补体格不足。以智力为主属性，兼具吸血与元素护盾！',
    primaryStat: 'int',
    icon: 'images/heroes/avatar_mage.svg',
    baseStats: {
      hp: 260,
      maxHp: 260,
      mp: 190,
      maxMp: 190,
      atk: 55,
      def: 18,
      speed: 18,
      crit: 12,
      dodge: 8,
      hit: 96,
      counter: 5,
      lifesteal: 12,
      magicResist: 25
    },
    growth: {
      hp: 24,
      mp: 22,
      atk: 8.8,
      def: 2.5,
      speed: 1.5
    },
    skills: [
      {
        id: 'm_sk_1',
        name: '火球术',
        category: 'attack',
        target: 'single_enemy',
        mpCost: 20,
        multiplier: 1.5,
        extraHit: 10,
        description: '凝聚炽烈火焰轰击，造成 150% 魔法伤害，同时提升 10% 命中率。'
      },
      {
        id: 'm_sk_2',
        name: '心智掌握',
        category: 'passive',
        effect: { intBonus: 18, maxMpBonus: 100 },
        description: '被动：深层奥术冥想，永久提升智力与魔法值上限。'
      },
      {
        id: 'm_sk_3',
        name: '治疗之环',
        category: 'aura',
        effect: { teamRegenHp: 0.04 },
        description: '光环：沐浴自然圣辉，每回合自动回复全队 4% 最大生命值。'
      },
      {
        id: 'm_sk_4',
        name: '法师护甲',
        category: 'passive',
        effect: { defBonus: 22, magicResistBonus: 15 },
        description: '被动：法术微粒凝结为外甲，提升物理防御与魔法抗性。'
      },
      {
        id: 'm_sk_5',
        name: '魔能之环',
        category: 'aura',
        effect: { teamRegenMp: 12 },
        description: '光环：汲取虚空魔能，每回合自动恢复全队 12 点魔法值。'
      },
      {
        id: 'm_sk_6',
        name: '寒冰箭',
        category: 'attack',
        target: 'single_enemy',
        mpCost: 35,
        multiplier: 1.75,
        slowRate: 0.2,
        description: '射出凛冬寒冰凝矢，造成 175% 魔法伤害，同时降低敌人 20% 速度。'
      },
      {
        id: 'm_sk_7',
        name: '寒冰护盾',
        category: 'passive',
        effect: { mpShieldRate: 0.25, maxMpBonus: 120 },
        description: '被动：极地寒冰法力护盾，受到的伤害的 25% 优先由魔法值抵消！'
      },
      {
        id: 'm_sk_8',
        name: '烈焰护盾',
        category: 'passive',
        effect: { reflectDmg: 0.2 },
        description: '被动：烈焰环绕周身，受到近战攻击时将 20% 伤害反弹给敌人！'
      },
      {
        id: 'm_sk_9',
        name: '生命偷取',
        category: 'attack',
        target: 'single_enemy',
        mpCost: 45,
        multiplier: 2.1,
        lifestealRate: 0.35,
        description: '施展禁忌暗影法术，造成 210% 魔法伤害，并将该次伤害的 35% 转化为自身生命！'
      }
    ]
  }
};
