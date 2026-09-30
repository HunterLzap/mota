// 2010魔塔经典新手主线任务引导链
export const QUEST_LIST = [
  {
    id: 'quest_1',
    title: '【主线1】初临王都 · 晋谒圣王',
    chapter: '序章：破晓之誓',
    targetTab: 'town',
    targetAction: 'claim_salary',
    desc: '你手持国王的征召令来到亚诺圣光王都。前往王宫拜谒亨利七世，领取王国为新晋骑士颁发的每日俸禄！',
    goalText: '前往【圣光王都】王宫领取今日俸禄',
    requiredCount: 1,
    rewards: {
      exp: 500,
      gold: 1500,
      crystal: 20,
      items: [
        { id: 'pill_reborn', name: '远古重铸灵药', count: 3, type: 'material', quality: 'darkgold', icon: 'pill_reborn', desc: '用于神兽四维天资重铸' }
      ]
    }
  },
  {
    id: 'quest_2',
    title: '【主线2】工欲善其事 · 装备升星',
    chapter: '序章：破晓之誓',
    targetTab: 'town',
    targetAction: 'enhance',
    desc: '魔塔内妖魔鳞甲坚厚，凡铁兵刃难以匹敌。前往皇家铁匠铺，使用魔晶为你的武器或防具完成一次强化升星（+1）！',
    goalText: '前往【圣光王都】铁匠铺成功强化装备1次',
    requiredCount: 1,
    rewards: {
      exp: 800,
      gold: 2000,
      crystal: 30,
      items: [
        { id: 'w_knight_blade', name: '银白骑士重剑', slot: 'weapon', level: 10, quality: 'green', stats: { atk: 45, str: 8 }, price: 300 }
      ]
    }
  },
  {
    id: 'quest_3',
    title: '【主线3】远古契约 · 神兽随行',
    chapter: '第一章：神兽与羁绊',
    targetTab: 'pets',
    targetAction: 'set_active_pet',
    desc: '亚诺大陆的骑士必须拥有本命守护神兽。前往神兽圣境，将你的神兽伙伴设为【出战主宠】，建立100%属性共鸣！',
    goalText: '前往【神兽圣境】设置主宠出战',
    requiredCount: 1,
    rewards: {
      exp: 1100,
      gold: 2500,
      crystal: 40,
      items: [
        { id: 'pet_egg_random', name: '远古神兽契约蛋', count: 1, type: 'egg', quality: 'purple', icon: 'pet_egg', desc: '可孵化全新神兽伙伴！' }
      ]
    }
  },
  {
    id: 'quest_4',
    title: '【主线4】星界洗礼 · 重铸天资',
    chapter: '第一章：神兽与羁绊',
    targetTab: 'pets',
    targetAction: 'wash_aptitude',
    desc: '神兽天生资质决定其每级成长上限。使用国王赐予的【远古重铸灵药】，在神兽圣境中为宠物洗炼重铸一次四维资质！',
    goalText: '在【神兽圣境】完成1次资质重铸',
    requiredCount: 1,
    rewards: {
      exp: 1500,
      gold: 3000,
      crystal: 50,
      items: [
        { id: 'book_crit', name: '远古魔导书·【高级必杀】', bookId: 'book_crit', count: 1, type: 'skill_book', quality: 'purple', icon: 'skill_book', desc: '暴伤大幅暴增！' }
      ]
    }
  },
  {
    id: 'quest_5',
    title: '【主线5】研读魔典 · 神宠打书',
    chapter: '第一章：神兽与羁绊',
    targetTab: 'pets',
    targetAction: 'learn_skill',
    desc: '真正的神兽拥有多门魔典被动。打开神兽圣境的【4槽打书】面板，为神兽打入一本远古魔导书开启战斗神威！',
    goalText: '在【神兽圣境】为神兽打入1本魔导书',
    requiredCount: 1,
    rewards: {
      exp: 2000,
      gold: 3500,
      crystal: 60,
      items: [
        { id: 'herb_dragonblood', name: '龙血草', count: 8, type: 'herb', quality: 'purple', icon: 'herb_dragonblood', desc: '炼制狂暴合剂的主料' },
        { id: 'herb_starlight', name: '星光苔藓', count: 8, type: 'herb', quality: 'purple', icon: 'herb_starlight', desc: '炼金神水原料' }
      ]
    }
  },
  {
    id: 'quest_6',
    title: '【主线6】初试锋芒 · 踏入魔塔',
    chapter: '第二章：通天之塔',
    targetTab: 'tower',
    targetAction: 'clear_tower_1',
    desc: '整装待发！远古魔塔第1层的邪恶哨兵正在叫嚣。前往【无尽魔塔】，拔剑斩杀第1层守卫，夺下首胜！',
    goalText: '击破【无尽魔塔】第 1 层守卫',
    requiredCount: 1,
    rewards: {
      exp: 2800,
      gold: 5000,
      crystal: 80,
      items: [
        { id: 'courage_shield', name: '勇气精钢塔盾', slot: 'offhand', level: 25, quality: 'purple', set: 'courage', stats: { def: 95, hp: 450, counter: 8 }, price: 2000 }
      ]
    }
  },
  {
    id: 'quest_7',
    title: '【主线7】领地开拓 · 炼金魔药',
    chapter: '第三章：领地与工坊',
    targetTab: 'estate',
    targetAction: 'brew_potion',
    desc: '国王将城郊庄园赐封给你。前往【领地庄园】皇家炼金工坊，使用草药调配并饮下一剂强效战斗魔药！',
    goalText: '在【领地庄园】成功调配1剂炼金魔药',
    requiredCount: 1,
    rewards: {
      exp: 3600,
      gold: 6000,
      crystal: 100,
      items: [
        { id: 'pill_reborn', name: '远古重铸灵药', count: 5, type: 'material', quality: 'darkgold', icon: 'pill_reborn', desc: '用于神兽资质重铸' }
      ]
    }
  },
  {
    id: 'quest_8',
    title: '【主线8】传奇同行 · 佣兵立誓',
    chapter: '第三章：领地与工坊',
    targetTab: 'estate',
    targetAction: 'hire_merc',
    desc: '独自深入魔塔危机四伏。前往领地庄园的佣兵营地，与一名传奇战友（圣光主教或守护铁卫）订立同行契约！',
    goalText: '在【佣兵营地】成功雇佣1名随行战友',
    requiredCount: 1,
    rewards: {
      exp: 5000,
      gold: 8000,
      crystal: 150,
      items: [
        { id: 'diamond_1', name: '碎裂金刚钻', count: 2, type: 'material', quality: 'darkgold', icon: 'images/items/crystal_socket.svg', desc: '开启装备宝石孔' }
      ]
    }
  },
  {
    id: 'quest_9',
    title: '【主线9】终焉试炼 · 斩落石魔',
    chapter: '第四章：巨龙觉醒',
    targetTab: 'tower',
    targetAction: 'clear_tower_10',
    desc: '魔塔前10层的终极领主【远古巨石魔像】苏醒！带上你的神兽与佣兵，击破第10层关底首领，斩获属于你的第一套暗金套装！',
    goalText: '攻克【无尽魔塔】第 10 层领主巨像',
    requiredCount: 1,
    rewards: {
      exp: 12000,
      gold: 25000,
      crystal: 300,
      items: [
        { id: 'courage_sword', name: '勇气先驱重剑', slot: 'weapon', level: 25, quality: 'purple', set: 'courage', stats: { atk: 140, str: 24, crit: 6 }, price: 2200 }
      ]
    }
  },
  {
    id: 'quest_10',
    title: '【主线10】天外奇珍 · 宝石镶嵌',
    chapter: '第四章：巨龙觉醒',
    targetTab: 'town',
    targetAction: 'socket_gem',
    desc: '装备镶嵌宝石方能发挥真正的传奇威能。前往皇家铁匠铺【宝石工坊】，为一件已打孔装备成功镶入 1 颗宝石！',
    goalText: '在铁匠铺宝石工坊成功镶嵌1颗宝石',
    requiredCount: 1,
    rewards: {
      exp: 15000,
      gold: 30000,
      crystal: 100,
      items: [
        { id: 'diamond_1', name: '碎裂金刚钻', count: 2, type: 'material', quality: 'darkgold', icon: 'images/items/crystal_socket.svg', desc: '开启装备宝石孔' }
      ]
    }
  },
  {
    id: 'quest_11',
    title: '【主线11】巨龙之威 · 首猎焰龙',
    chapter: '第四章：巨龙觉醒',
    targetTab: 'town',
    targetAction: 'slay_dragon',
    desc: '熔岩深处的赤红恶龙苏醒，正在焚烧边陲村落。前往【远古屠龙圣殿】，拔出利刃讨伐赤焰红龙！',
    goalText: '在远古屠龙圣殿击溃1次赤焰红龙',
    requiredCount: 1,
    rewards: {
      exp: 20000,
      gold: 40000,
      crystal: 200,
      items: [
        { id: 'protect_crystal', name: '保护水晶', count: 2, type: 'material', quality: 'darkgold', icon: 'images/items/protect_crystal.svg', desc: '升星防降级保护' }
      ]
    }
  },
  {
    id: 'quest_12',
    title: '【主线12】幻境飞跃 · 荣膺战号',
    chapter: '第五章：天梯之巅',
    targetTab: 'town',
    targetAction: 'royal_trials',
    desc: '唯有战胜幻境梦魇与古代试炼领主，才能获得皇家骑士封号。前往【圣王大殿】幻境试炼长廊，击破领主晋升更高封号！',
    goalText: '在幻境试炼长廊成功晋升1次封号',
    requiredCount: 1,
    rewards: {
      exp: 25000,
      gold: 50000,
      crystal: 300,
      items: [
        { id: 'gem_atk', name: '金刚石', count: 1, stat: 'atk', val: 25, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_atk.svg', desc: '攻击力+25' }
      ]
    }
  },
  {
    id: 'quest_13',
    title: '【主线13】七门破界 · 征服深渊',
    chapter: '第五章：天梯之巅',
    targetTab: 'tower',
    targetAction: 'clear_dungeon',
    desc: '魔塔地下城埋藏着远古神祇的遗物。进入【地下城七大副本门】，派遣你的佣兵与侍从，攻破任意一座副本门！',
    goalText: '攻破无尽魔塔地下城任意副本门1次',
    requiredCount: 1,
    rewards: {
      exp: 30000,
      gold: 60000,
      crystal: 350,
      items: [
        { id: 'key_bronze', name: '青铜钥匙', count: 2, type: 'key', quality: 'blue', icon: 'images/items/key_bronze.svg', desc: '魔塔50层破界钥匙' }
      ]
    }
  },
  {
    id: 'quest_14',
    title: '【主线14】天梯角逐 · 威震竞技',
    chapter: '第五章：天梯之巅',
    targetTab: 'town',
    targetAction: 'arena_duel',
    desc: '王国角斗场战鼓雷动！前往圣王大殿的【王国角斗场】，战胜一位天梯榜单中的强力勇士，夺取无上荣耀声望！',
    goalText: '在王国角斗场赢下1场天梯对决',
    requiredCount: 1,
    rewards: {
      exp: 35000,
      gold: 70000,
      crystal: 400,
      items: [
        { id: 'pet_egg_random', name: '远古神兽契约蛋', count: 1, type: 'egg', quality: 'purple', icon: 'images/items/pet_egg.svg', desc: '可孵化神兽伙伴' }
      ]
    }
  },
  {
    id: 'quest_15',
    title: '【主线15】魔塔破界 · 决战飞龙',
    chapter: '第五章：天梯之巅',
    targetTab: 'tower',
    targetAction: 'clear_tower_20',
    desc: '魔塔第20层的关底领主【双头毒风飞龙】遮天蔽日！全力以赴直登第20层，将其彻底斩落，威震亚诺古陆！',
    goalText: '攻克【无尽魔塔】第 20 层双头飞龙',
    requiredCount: 1,
    rewards: {
      exp: 50000,
      gold: 100000,
      crystal: 600,
      items: [
        { id: 'courage_armor', name: '勇气先驱重铠', slot: 'armor', level: 25, quality: 'purple', set: 'courage', stats: { def: 110, hp: 600 }, price: 2500 }
      ]
    }
  },
  {
    id: 'quest_16',
    title: '【主线16】传奇附魔 · 神兵重铸',
    chapter: '第六章：终焉神话',
    targetTab: 'town',
    targetAction: 'reforge_gear',
    desc: '工欲善其事，必先利其器！前往皇家铁匠铺【神兵重铸专室】，消耗黄金或暗金晶石，为一件穿戴装备洗炼出一条传奇附魔词条！',
    goalText: '在铁匠铺神兵重铸专室洗炼1次装备词条',
    requiredCount: 1,
    rewards: {
      exp: 40000,
      gold: 80000,
      crystal: 500,
      items: [
        { id: 'crystal_darkgold', name: '暗金晶石', count: 3, type: 'material', quality: 'darkgold', icon: 'images/items/crystal_darkgold.svg', desc: '用于重铸暗金装备' }
      ]
    }
  },
  {
    id: 'quest_17',
    title: '【主线17】密林梦魇 · 斩杀狼王',
    chapter: '第六章：终焉神话',
    targetTab: 'wild',
    targetAction: 'slay_wild_boss',
    desc: '微光森林深处传出狂暴狼嚎，【暗夜狼王·芬里尔】正在袭击巡逻商队。进入野外征战微光森林，直捣狼王巢穴并将其诛杀！',
    goalText: '在野外征战微光森林斩杀暗夜狼王',
    requiredCount: 1,
    rewards: {
      exp: 50000,
      gold: 100000,
      crystal: 600,
      items: [
        { id: 'protect_crystal', name: '保护水晶', count: 2, type: 'material', quality: 'darkgold', icon: 'images/items/protect_crystal.svg', desc: '升星防降级保护' }
      ]
    }
  },
  {
    id: 'quest_18',
    title: '【主线18】暗影潜行 · 截获重宝',
    chapter: '第六章：终焉神话',
    targetTab: 'wild',
    targetAction: 'catch_thief',
    desc: '全境通缉的黑羽蒙面女盗现身据点！追寻她的踪迹，在野外据点发起截击并战胜女盗，夺回被盗的王室秘宝！',
    goalText: '在野外据点截击并战胜黑羽蒙面女盗',
    requiredCount: 1,
    rewards: {
      exp: 60000,
      gold: 120000,
      crystal: 800,
      items: [
        { id: 'diamond_1', name: '碎裂金刚钻', count: 3, type: 'material', quality: 'darkgold', icon: 'images/items/crystal_socket.svg', desc: '装备开孔必备' }
      ]
    }
  },
  {
    id: 'quest_19',
    title: '【主线19】极地裁决 · 屠戮银龙',
    chapter: '第六章：终焉神话',
    targetTab: 'town',
    targetAction: 'slay_silver_dragon',
    desc: '极地暴风雪中的【耀光秘银巨龙】张开了遮天龙翼！前往远古屠龙圣殿向秘银巨龙发起史诗讨伐，夺取终极觉醒神物【天命石】！',
    goalText: '在远古屠龙圣殿成功击溃耀光秘银巨龙',
    requiredCount: 1,
    rewards: {
      exp: 80000,
      gold: 150000,
      crystal: 1000,
      items: [
        { id: 'destiny_stone', name: '天命石', count: 1, type: 'material', quality: 'purplegold', icon: 'images/items/destiny_stone.svg', desc: '神兽紫金觉醒至宝' }
      ]
    }
  },
  {
    id: 'quest_20',
    title: '【主线20】紫金圣约 · 泰坦觉醒',
    chapter: '第六章：终焉神话',
    targetTab: 'pets',
    targetAction: 'evolve_purplegold',
    desc: '亚诺大陆的史诗传说！使用天命石，将达到 40 级的暗金神兽终极觉醒为【紫金传奇圣兽】，资质上限突破至 6000！',
    goalText: '将任意一只神兽终极觉醒为紫金神兽',
    requiredCount: 1,
    rewards: {
      exp: 150000,
      gold: 300000,
      crystal: 2000,
      items: [
        { id: 'wargod_sword', name: '战神守护圣剑', slot: 'weapon', level: 70, quality: 'purplegold', set: 'wargod_set', stats: { atk: 450, str: 80, crit: 15 }, price: 20000, icon: 'images/items/wpn_sword.svg' }
      ]
    }
  }
];
