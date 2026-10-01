// 王都使命与重制续章；续章21~26为当前重制剧情，不作为原版考据结论。
import { SPECIAL_ITEMS } from './items.js';
import { RUNES } from './runes.js';
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
    title: '【主线2】锻造之约 · 装备升星',
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
        { id: 'courage_gloves', name: '勇气精钢护手', slot: 'gloves', level: 25, quality: 'purple', set: 'courage', stats: { def: 95, hp: 450, counter: 8 }, price: 2000, icon: 'images/items/eq_gloves.svg' }
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
    desc: '边陲村落被龙焰吞没，幸存商队在魔塔脚下失去王室秘宝。先前往【远古屠龙圣殿】讨伐赤焰红龙，救出被困的巡林斥候，查明是谁唤醒了巨龙。',
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
    desc: '斥候带回通往地下城的线索，王宫只允许受封勇者深入调查。前往【圣王大殿】幻境试炼长廊完成一次晋升；若已获得封号，王宫会认可此前的试炼战绩。',
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
    desc: '失窃秘宝的运送路线穿过魔塔地下城。攻破【地下城七大副本门】中的任意一门，搜集守卫留下的运输记录。佣兵与侍从能够助战，但不是进入地下城的必要条件。',
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
    desc: '地下城的运输记录带着角斗场徽记，却无人愿意为陌生勇者作证。前往圣王大殿的【王国角斗场】赢下一场天梯对决，取得看守的信任，追查把秘宝带往魔塔高层的人。',
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
    desc: '角斗场看守指认秘宝被藏入第20层毒风飞龙的巢穴。攻克【无尽魔塔】第20层双头飞龙，搜查巢穴中的王室封蜡与密林地图。已有第20层通关战绩也会获得王宫认可。',
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
    desc: '密林地图带着掩盖盗贼踪迹的暗影咒印，王室工匠建议为武器铭刻新的魔力。前往皇家铁匠铺【神兵重铸专室】，消耗黄金或暗金晶石，为任意一件穿戴装备洗炼词条，为追踪行动做好准备。',
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
    desc: '运输记录指向微光森林。黑羽女盗借【暗夜狼王·芬里尔】袭击商队掩盖行踪；返回森林击败狼王，找到失窃秘宝的王室印记，让她无处藏身。',
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
    desc: '狼王巢穴中的王室印记暴露了黑羽女盗。她已在野外据点现身，截击并战胜她，夺回被盗秘宝与极地圣殿的星图。追踪将持续到你击败她为止。',
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
    desc: '夺回的星图指向极地圣殿。守护【天命石】的耀光秘银巨龙已受深渊侵蚀；前往远古屠龙圣殿击败银龙，取回能唤醒神兽真正力量的圣物。',
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
    title: '【主线20】紫金圣约 · 神兽觉醒',
    chapter: '第六章：终焉神话',
    targetTab: 'pets',
    targetAction: 'evolve_purplegold',
    desc: '王室秘宝重归王都，魔塔深处的威胁却仍未消散。使用天命石，让达到40级的暗金神兽觉醒为紫金伙伴；已有紫金神兽同样得到认可。完成这段王都使命后，你与伙伴将继续挑战魔塔高层。',
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
  },
  {
    id: 'quest_21', title: '【主线21】边境烽火 · 收复要塞', chapter: '第七章：黑翼阴谋',
    targetTab: 'town', targetAction: 'capture_stronghold', milestone: { type: 'stronghold' },
    desc: '紫金圣约稳定了王都秘宝，封蜡却显露出黑翼龙皇的徽记。边境军团发现龙裔正借要塞运输祭品。前往三国边境，攻克任一敌方要塞并截获军令；已有收复战绩同样得到认可。',
    goalText: '攻克任意一座边境要塞', requiredCount: 1,
    rewards: { exp: 60000, gold: 80000, crystal: 300, items: [{ ...SPECIAL_ITEMS.key_obsidian, count: 1 }] }
  },
  {
    id: 'quest_22', title: '【主线22】黑焰军令 · 巨龙之门', chapter: '第七章：黑翼阴谋',
    targetTab: 'tower', targetAction: 'clear_dragon_gate', milestone: { type: 'dungeon', gateId: 'dragon_gate' },
    desc: '截获的军令指向地下城【巨龙之门】。黑焰红龙以边境祭品供养魔塔裂隙。达到70级，肃清十层龙翼守卫，击败末层黑焰红龙，夺取裂隙坐标。历史通关记录可直接交付。',
    goalText: '达到70级并完整通关巨龙之门十层', requiredCount: 1,
    rewards: { exp: 80000, gold: 100000, crystal: 400, items: [{ ...SPECIAL_ITEMS.key_titan, count: 1 }] }
  },
  {
    id: 'quest_23', title: '【主线23】堕落圣翼 · 七十层裁决', chapter: '第八章：裂隙远征',
    targetTab: 'tower', targetAction: 'clear_tower_70', milestone: { type: 'tower', floor: 70 },
    desc: '裂隙坐标揭露了堕落炽天使的契约。用泰坦钥匙抵达魔塔70层，击败路西尔，切断他对黑翼龙皇的供能。钥匙抵达不等于胜利，必须留下本层首领的实际通关记录。',
    goalText: '击败无尽魔塔70层堕落炽天使', requiredCount: 1,
    rewards: { exp: 100000, gold: 120000, crystal: 500, items: [{ id: 'book_purify', bookId: 'book_purify', name: '远古魔导书·【神圣净化】', type: 'skill_book', quality: 'darkgold', count: 1, icon: 'images/items/skill_book.svg', desc: '在神兽研习魔典中学习，体力充足时免疫战斗异常状态。' }] }
  },
  {
    id: 'quest_24', title: '【主线24】远征敕令 · 七阶圣誓', chapter: '第八章：裂隙远征',
    targetTab: 'town', targetAction: 'complete_royal_trials', milestone: { type: 'promotion', stage: 7 },
    desc: '路西尔临终警告：龙皇正将整座魔塔化为时空祭坛。完成七阶皇家试炼，取得远征敕令，让自己的职业力量足以守住裂隙。已完成七阶晋升的勇者无需重复试炼。',
    goalText: '达到80级并完成全部七阶职业晋升', requiredCount: 1,
    rewards: { exp: 100000, gold: 120000, crystal: 500, items: [{ ...SPECIAL_ITEMS.protect_crystal, count: 3 }] }
  },
  {
    id: 'quest_25', title: '【主线25】时空锚点 · 终门远征', chapter: '第九章：黑翼终战',
    targetTab: 'tower', targetAction: 'clear_spacetime_gate', milestone: { type: 'dungeon', gateId: 'spacetime_gate' },
    desc: '远征敕令允许你深入【时空之门】。达到80级，肃清十五层守卫并战胜末层领主，摧毁龙皇在地下城的时空锚点。王室将交付白金钥匙，开启魔塔最终长廊。已有全境通关记录同样有效。',
    goalText: '完整通关时空之门十五层', requiredCount: 1,
    rewards: { exp: 120000, gold: 150000, crystal: 600, items: [{ ...SPECIAL_ITEMS.key_platinum, count: 2 }] }
  },
  {
    id: 'quest_26', title: '【主线26】黑翼终战 · 龙皇陨落', chapter: '第九章：黑翼终战',
    targetTab: 'tower', targetAction: 'clear_tower_100', milestone: { type: 'tower', floor: 100 },
    desc: '时空锚点已经破碎。沿白金钥匙开启的最终长廊推进至100层，与伙伴共同击败黑翼龙皇·奥斯汀。提防蓄势后的时空禁锢，净化魔典与控制打断可为你争取反击时机。胜利后王都与边境重获和平，古门与魔塔仍可继续探索。',
    goalText: '击败无尽魔塔100层黑翼龙皇', requiredCount: 1,
    rewards: { exp: 150000, gold: 200000, crystal: 800, items: [{ ...RUNES.rune_ber, type: 'rune', count: 1 }] }
  }
];
