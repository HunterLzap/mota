// 幻境试炼转职与称号配置：100% 还原《魔塔世界》百度百科原著西方魔幻转职系统
// 20~80级共 7 个正统转职阶位：魔、幻、影、皇家、圣、神、绝地
export const ROYAL_TRIALS = [
  {
    level: 20,
    fameReq: 50,
    title: '魔',
    badge: '【魔】之封号',
    icon: 'trial_magic',
    bossName: '深渊魔影领主',
    bossStats: { hp: 4500, atk: 160, def: 90 },
    statsBonus: { atk: 30, maxHp: 300, def: 20 },
    rewardDesc: '获得封号【魔】，攻击+30，生命+300，防御+20',
    classPromotions: {
      warrior: {
        title: '魔·战士',
        desc: '引古亚诺魔力附魔战刃，强化重装战意与物理穿透。'
      },
      mage: {
        title: '魔·法师',
        desc: '觉醒古亚诺纯净魔力之核，法术穿透与元素护盾大幅增强。'
      },
      hunter: {
        title: '魔·猎人',
        desc: '将古代魔力注入附魔箭羽，大幅提升远程箭矢的穿透与射程。'
      }
    }
  },
  {
    level: 30,
    fameReq: 100,
    title: '幻',
    badge: '【幻】之封号',
    icon: 'trial_illusion',
    bossName: '幻虚千面魔君',
    bossStats: { hp: 9800, atk: 280, def: 150 },
    statsBonus: { atk: 60, maxHp: 600, speed: 10 },
    rewardDesc: '获得封号【幻】，攻击+60，生命+600，速度+10',
    classPromotions: {
      warrior: {
        title: '幻·战士',
        desc: '掌握幻影虚实步法，破阵突袭，令敌军难以预测剑锋所向。'
      },
      mage: {
        title: '幻·法师',
        desc: '操控虚空幻象与镜像秘术，以奥术智慧扰乱战场与敌阵。'
      },
      hunter: {
        title: '幻·猎人',
        desc: '射出幻影连环重矢，虚实莫测，精准封锁敌方行动路线。'
      }
    }
  },
  {
    level: 40,
    fameReq: 350,
    title: '影',
    badge: '【影】之封号',
    icon: 'trial_shadow',
    bossName: '幽夜残影潜行者',
    bossStats: { hp: 22000, atk: 450, def: 260 },
    statsBonus: { atk: 100, dodge: 8, crit: 8 },
    rewardDesc: '获得封号【影】，攻击+100，闪避+8%，暴击+8%',
    classPromotions: {
      warrior: {
        title: '影·战士',
        desc: '隐匿于黑夜阴影之中，以极速的影杀反击与暴击裁决战场。'
      },
      mage: {
        title: '影·法师',
        desc: '掌握暗影与霜火双生法术，在幽夜潜行中倾泻毁灭法能。'
      },
      hunter: {
        title: '影·猎人',
        desc: '幽夜荒野中的无声潜伏者，暗影致命狙击无声毙敌。'
      }
    }
  },
  {
    level: 50,
    fameReq: 1000,
    title: '皇家',
    badge: '【皇家】之封号',
    icon: 'trial_royal',
    bossName: '皇家堕落大主教',
    bossStats: { hp: 48000, atk: 720, def: 420 },
    statsBonus: { atk: 160, def: 120, maxHp: 1500 },
    rewardDesc: '获得封号【皇家】，攻击+160，防御+120，生命+1500',
    classPromotions: {
      warrior: {
        title: '皇家战士',
        desc: '获圣光王室御前受封，身披重铠与战马纹章，坚如铁壁要塞。'
      },
      mage: {
        title: '皇家法师',
        desc: '登临王国御前皇家法师之位，掌星辰极光与高等法术结界。'
      },
      hunter: {
        title: '皇家猎人',
        desc: '王室禁卫首席神射官，贯云破军，百步裂空守护王国。'
      }
    }
  },
  {
    level: 60,
    fameReq: 2200,
    title: '圣',
    badge: '【圣】之封号',
    icon: 'trial_holy',
    bossName: '远古圣殿裁决官',
    bossStats: { hp: 95000, atk: 1100, def: 650 },
    statsBonus: { atk: 240, def: 180, counter: 12 },
    rewardDesc: '获得封号【圣】，攻击+240，防御+180，反击+12%',
    classPromotions: {
      warrior: {
        title: '圣战士',
        desc: '沐浴光明圣殿祝福，神圣重剑荡涤魔物，反击与庇护之力大涨。'
      },
      mage: {
        title: '圣法师',
        desc: '受圣殿大教堂圣光洗礼，掌握神圣治愈与圣堂大禁咒之术。'
      },
      hunter: {
        title: '圣猎人',
        desc: '承奉神圣破晓之箭，驱散深渊暗夜，净化所至一切邪灵。'
      }
    }
  },
  {
    level: 70,
    fameReq: 4000,
    title: '神',
    badge: '【神】之封号',
    icon: 'trial_divine',
    bossName: '真神使徒·雷霆化身',
    bossStats: { hp: 180000, atk: 1600, def: 950 },
    statsBonus: { atk: 350, def: 260, maxHp: 3000, crit: 12 },
    rewardDesc: '获得封号【神】，攻击+350，防御+260，生命+3000，暴击+12%',
    classPromotions: {
      warrior: {
        title: '神战士',
        desc: '领悟战神神殿真意，获得古代诸神之力加持，战阵所向披靡。'
      },
      mage: {
        title: '神法师',
        desc: '沟通远古魔法真神，奥术真言吟咏，元素风暴降临凡世。'
      },
      hunter: {
        title: '神猎人',
        desc: '引群星天幕之力化为神风裂矢，贯穿长空，无可规避。'
      }
    }
  },
  {
    level: 80,
    fameReq: 7000,
    title: '绝地',
    badge: '【绝地】之封号',
    icon: 'trial_jedi',
    bossName: '绝地炼狱破坏神',
    bossStats: { hp: 320000, atk: 2300, def: 1350 },
    statsBonus: { atk: 800, def: 600, maxHp: 10000, dmgBonus: 20, counter: 15 },
    rewardDesc: '获得传世【绝地】封号，攻击+800，防御+600，生命+10000，主动攻击伤害+20%，反击+15%',
    classPromotions: {
      warrior: {
        title: '绝地战士',
        desc: '征战荒原与绝地深渊的终极先锋，百战不灭的近战统帅。'
      },
      mage: {
        title: '绝地法师',
        desc: '突破时空绝境魔力桎梏，执掌终极禁咒的至高大魔导师。'
      },
      hunter: {
        title: '绝地猎人',
        desc: '跨越死亡绝地的无羁巡林客，登临荒野射术巅峰的神射领主。'
      }
    }
  }
];
