// 副本系统配置：100% 还原《魔塔世界》百度百科副本七大门与多阶段首领、佣兵神兽合击奥义体系

export const SYNERGY_STRIKES = {
  divine_verdict: {
    id: 'divine_verdict',
    name: '神圣断罪破晓斩',
    icon: 'relic_spear',
    desc: '战士圣剑与神圣侍从共鸣，金芒破晓，造成 320% 神圣真伤，驱散全队负面异常并自愈恢复 30% 生命！',
    mult: 3.2,
    healPct: 0.30
  },
  crimson_cataclysm: {
    id: 'crimson_cataclysm',
    name: '红莲烈焰焚城阵',
    icon: 'relic_flame',
    desc: '法师元素禁咒与重甲铁卫震天咆哮，烈火焚城，造成 380% 烈焰巨创并彻底粉碎首领神圣护盾！',
    mult: 3.8,
    shatterShield: true
  },
  gale_phantom: {
    id: 'gale_phantom',
    name: '万箭逐风追魂击',
    icon: 'wpn_bow',
    desc: '游侠疾风箭道与随行诗人琴律合拍，4 段连环风暴穿刺，造成 340% 穿甲暴伤并使首领陷入迟滞 1 回合！',
    mult: 3.4,
    stun: true
  },
  alliance_fury: {
    id: 'alliance_fury',
    name: '远古同盟狂怒合击',
    icon: 'relic_holy',
    desc: '勇者、契约随从与出战神兽三位一体合力出击，造成 260% 破甲巨创，削减首领 25% 防御力！',
    mult: 2.6,
    defReduce: 0.25
  }
};

/**
 * 根据职业、佣兵和神兽匹配最佳合击奥义
 */
export function getSynergyStrike(classId = 'warrior', mercId = '', petId = '') {
  const classStrikes = { warrior: 'divine_verdict', mage: 'crimson_cataclysm', hunter: 'gale_phantom' };
  if (classStrikes[classId]) return SYNERGY_STRIKES[classStrikes[classId]];
  if (classId === 'warrior' || mercId === 'merc_paladin' || ['golden_dragon', 'white_angel', 'unicorn', 'light_wisp'].includes(petId)) {
    return SYNERGY_STRIKES.divine_verdict;
  }
  if (classId === 'mage' || mercId === 'merc_guardian' || ['phoenix', 'black_angel', 'succubus', 'imp'].includes(petId)) {
    return SYNERGY_STRIKES.crimson_cataclysm;
  }
  if (classId === 'hunter' || mercId === 'merc_bard' || ['silver_dragon', 'pegasus', 'thunderbird', 'winter_wolf'].includes(petId)) {
    return SYNERGY_STRIKES.gale_phantom;
  }
  return SYNERGY_STRIKES.alliance_fury;
}

export const DUNGEON_GATES = [
  {
    id: 'trial_gate',
    name: '试炼之门',
    minLevel: 20,
    totalFloors: 5,
    icon: 'gate_trial',
    description: '亚诺初阶勇者的实战试炼场，探寻古代初级遗物。',
    dropsDesc: '各职业 20 级蓝装/黄金装、红木钥匙、升星水晶',
    setDrops: ['courage'],
    boss: {
      name: '试炼铁甲统领',
      hp: 3500,
      atk: 140,
      def: 85,
      speed: 20,
      icon: 'boss_iron',
      hasPhases: true,
      phase1Shield: 1000,
      phase2EnrageHp: 1750,
      phase3Minion: '试炼近卫骷髅',
      dialogue: '只有斩断试炼之锁链，才有资格踏入真正的亚诺深渊！'
    },
    guardTemplate: { name: '试炼石魔卫兵', hpBase: 1200, atkBase: 85, defBase: 50, icon: 'monster_skeleton' }
  },
  {
    id: 'courage_gate',
    name: '勇气之门',
    minLevel: 30,
    totalFloors: 5,
    icon: 'gate_courage',
    description: '只有无所畏惧的战士才能踏过，守护着勇气套装的精髓。',
    dropsDesc: '【勇气套装】散件、青铜钥匙、远古重铸灵药',
    setDrops: ['courage'],
    boss: {
      name: '狂暴怒火巨蜥',
      hp: 7500,
      atk: 240,
      def: 130,
      speed: 24,
      icon: 'boss_lizard',
      hasPhases: true,
      phase1Shield: 2200,
      phase2EnrageHp: 3750,
      phase3Minion: '地底火毒蜥蜴',
      dialogue: '凡人的勇气，在熔岩与剧毒面前脆弱不堪！'
    },
    guardTemplate: { name: '熔岩穴居魔', hpBase: 2400, atkBase: 150, defBase: 80, icon: 'monster_goblin' }
  },
  {
    id: 'mirage_gate',
    name: '变幻之门',
    minLevel: 40,
    totalFloors: 10,
    icon: 'gate_mirage',
    description: '空间扭曲的变幻结界，击败镇守者可缴获审判者套装。',
    dropsDesc: '【审判者】腿部、披风；【萨格尔】手套',
    setDrops: ['judge', 'sagael_set'],
    boss: {
      name: '幻象织梦魔',
      hp: 16000,
      atk: 380,
      def: 210,
      speed: 30,
      icon: 'boss_dream',
      hasPhases: true,
      phase1Shield: 4500,
      phase2EnrageHp: 8000,
      phase3Minion: '迷梦影魔',
      dialogue: '真实与虚幻由我主宰，你的心智已被噩梦撕裂！'
    },
    guardTemplate: { name: '幻象迷蝶魔', hpBase: 4800, atkBase: 230, defBase: 120, icon: 'monster_mage' }
  },
  {
    id: 'death_gate',
    name: '死亡之门',
    minLevel: 50,
    totalFloors: 10,
    icon: 'gate_death',
    description: '弥漫幽冥死气的魔窟，出产高阶审判者重甲与萨格尔古冠。',
    dropsDesc: '【审判者】胸部、腰带、鞋；【萨格尔】头部；暗金宠物蛋',
    setDrops: ['judge', 'sagael_set'],
    boss: {
      name: '冥府死神侍者',
      hp: 32000,
      atk: 560,
      def: 320,
      speed: 34,
      icon: 'boss_reaper',
      hasPhases: true,
      phase1Shield: 9000,
      phase2EnrageHp: 16000,
      phase3Minion: '冥河怨灵',
      dialogue: '敲响丧钟吧，死亡国度的深渊终将吞没一切生灵！'
    },
    guardTemplate: { name: '幽冥死骨卫', hpBase: 8500, atkBase: 340, defBase: 180, icon: 'monster_skeleton' }
  },
  {
    id: 'storm_gate',
    name: '风暴之门',
    minLevel: 60,
    totalFloors: 10,
    icon: 'gate_storm',
    description: '狂暴雷霆怒吼之门，制裁者套装与克斯特密林神兵现世。',
    dropsDesc: '【制裁者】腿部、披风；【克斯特】手套；进化石',
    setDrops: ['punisher', 'kester_set'],
    boss: {
      name: '风暴雷霆巨人',
      hp: 65000,
      atk: 820,
      def: 480,
      speed: 40,
      icon: 'boss_storm',
      hasPhases: true,
      phase1Shield: 18000,
      phase2EnrageHp: 32500,
      phase3Minion: '雷霆怒风元素',
      dialogue: '感受远古雷霆的战栗！让神罚之暴风将你碾碎！'
    },
    guardTemplate: { name: '狂雷石像鬼', hpBase: 16000, atkBase: 480, defBase: 260, icon: 'monster_gargoyle' }
  },
  {
    id: 'dragon_gate',
    name: '巨龙之门',
    minLevel: 70,
    totalFloors: 10,
    icon: 'gate_dragon',
    description: '远古龙裔的栖息巢穴，镇守着制裁者胸甲与克斯特之冠。',
    dropsDesc: '【制裁者】胸部、腰带、鞋；【克斯特】头部；天命石',
    setDrops: ['punisher', 'kester_set'],
    boss: {
      name: '灭世黑焰红龙',
      hp: 125000,
      atk: 1200,
      def: 680,
      speed: 48,
      icon: 'boss_dragon',
      hasPhases: true,
      phase1Shield: 35000,
      phase2EnrageHp: 62500,
      phase3Minion: '黑焰幼龙',
      dialogue: '蝼蚁也妄图踏足龙王之巢穴？黑焰会将你的灵魂化为灰烬！'
    },
    guardTemplate: { name: '龙翼巡界卫', hpBase: 30000, atkBase: 720, defBase: 380, icon: 'monster_hound' }
  },
  {
    id: 'spacetime_gate',
    name: '时空之门',
    minLevel: 80,
    totalFloors: 15,
    icon: 'gate_spacetime',
    description: '触碰魔塔时空中枢的终极神门，爆出至强征服者与亚诺遗物！',
    dropsDesc: '【征服者】全套防具；【亚丁】头部、手套；白金钥匙、紫金晶石',
    setDrops: ['conqueror', 'aden_set', 'karlis_set'],
    boss: {
      name: '时空掌控者·卡尔里斯虚影',
      hp: 280000,
      atk: 1850,
      def: 980,
      speed: 58,
      icon: 'boss_karlis',
      hasPhases: true,
      phase1Shield: 80000,
      phase2EnrageHp: 140000,
      phase3Minion: '时空撕裂裂痕幽灵',
      dialogue: '时间回溯，空间重构！在宇宙的法则面前，一切抵抗皆为虚妄！'
    },
    guardTemplate: { name: '时空守序者', hpBase: 65000, atkBase: 1100, defBase: 550, icon: 'monster_spider' }
  }
];

/**
 * 获取地下城中间层守卫数据
 */
export function getDungeonFloorGuard(gateId, floor) {
  const gate = DUNGEON_GATES.find(g => g.id === gateId) || DUNGEON_GATES[0];
  if (floor >= gate.totalFloors) {
    return {
      isBoss: true,
      floor,
      totalFloors: gate.totalFloors,
      name: '【' + gate.name + '关底领主】' + gate.boss.name,
      hp: gate.boss.hp,
      maxHp: gate.boss.hp,
      atk: gate.boss.atk,
      def: gate.boss.def,
      speed: gate.boss.speed || 25,
      icon: gate.boss.icon,
      hasPhases: true,
      phase1Shield: gate.boss.phase1Shield,
      phase2EnrageHp: gate.boss.phase2EnrageHp,
      phase3Minion: gate.boss.phase3Minion,
      dialogue: gate.boss.dialogue
    };
  }

  const tmpl = gate.guardTemplate || { name: '地宫守护者', hpBase: 2000, atkBase: 100, defBase: 60, icon: 'monster_skeleton' };
  const mult = 1 + (floor - 1) * 0.22;
  const hp = Math.floor(tmpl.hpBase * mult);
  const atk = Math.floor(tmpl.atkBase * mult);
  const def = Math.floor(tmpl.defBase * mult);

  return {
    isBoss: false,
    floor,
    totalFloors: gate.totalFloors,
    name: gate.name + '第' + floor + '层守卫：' + tmpl.name,
    hp,
    maxHp: hp,
    atk,
    def,
    speed: Math.min(50, 15 + floor * 2),
    icon: tmpl.icon,
    hasPhases: false
  };
}

/**
 * 击败地下城关底领主时生成专属远古神装奖励
 */
export function generateDungeonDrop(gateId) {
  const pool = {
    trial_gate: [
      { id: 'courage_sword', name: '勇气先驱重剑', slot: 'weapon', quality: 'gold', setId: 'courage', setName: '【勇气套装】', stats: { atk: 95, str: 18, crit: 5 }, holes: 2, desc: '试炼之门缴获的远古利刃，铭刻勇气誓约。' },
      { id: 'courage_gloves', name: '勇气精钢护手', slot: 'gloves', quality: 'gold', setId: 'courage', setName: '【勇气套装】', stats: { def: 75, hp: 350, counter: 6 }, holes: 2, desc: '试炼之门的精钢护手。', icon: 'images/items/eq_gloves.svg' }
    ],
    courage_gate: [
      { id: 'courage_armor', name: '勇气先驱重铠', slot: 'armor', quality: 'gold', setId: 'courage', setName: '【勇气套装】', stats: { def: 110, hp: 600, dmgResist: 4 }, holes: 2, desc: '勇气之门镇守重铠。' },
      { id: 'courage_pants', name: '勇气先驱战胫', slot: 'pants', quality: 'gold', setId: 'courage', setName: '【勇气套装】', stats: { def: 85, hp: 450, speed: 12 }, holes: 2, desc: '勇气之门精钢护胫。' }
    ],
    mirage_gate: [
      { id: 'judge_pants', name: '审判者秘法战胫', slot: 'pants', quality: 'darkgold', setId: 'judge', setName: '【审判者套装】', stats: { def: 140, hp: 800, speed: 18 }, holes: 2, desc: '变幻之门破除结界缴获的审判者神装。' },
      { id: 'sagael_gloves', name: '萨格尔幽冥护手', slot: 'gloves', quality: 'darkgold', setId: 'sagael_set', setName: '【萨格尔套装】', stats: { def: 120, mp: 400, crit: 8 }, holes: 2, desc: '变幻之门缴获的帝国护手。' }
    ],
    death_gate: [
      { id: 'judge_armor', name: '审判者神圣法袍', slot: 'armor', quality: 'darkgold', setId: 'judge', setName: '【审判者套装】', stats: { def: 200, hp: 1200, lifesteal: 10 }, holes: 2, desc: '死亡之门冥府死神守卫的圣袍。' },
      { id: 'sagael_helmet', name: '萨格尔帝国战盔', slot: 'helmet', quality: 'darkgold', setId: 'sagael_set', setName: '【萨格尔套装】', stats: { def: 160, hp: 900, counter: 12 }, holes: 2, desc: '死亡之门远古战盔。' }
    ],
    storm_gate: [
      { id: 'punisher_cloak', name: '制裁者狂雷披风', slot: 'cloak', quality: 'darkgold', setId: 'punisher', setName: '【制裁者套装】', stats: { def: 180, atk: 110, critDmg: 25 }, holes: 2, desc: '风暴之门雷霆织就的战神披风。' },
      { id: 'kester_bow', name: '克斯特幻影长弓', slot: 'weapon', quality: 'darkgold', setId: 'kester_set', setName: '【克斯特套装】', stats: { atk: 280, speed: 28, crit: 15 }, holes: 2, desc: '风暴之门缴获的精灵古弓。' }
    ],
    dragon_gate: [
      { id: 'punisher_armor', name: '制裁者天罚重甲', slot: 'armor', quality: 'darkgold', setId: 'punisher', setName: '【制裁者套装】', stats: { def: 280, hp: 1800, dmgResist: 8 }, holes: 2, desc: '巨龙之门黑焰熔铸的天罚重装。' },
      { id: 'kester_helmet', name: '克斯特密林神冠', slot: 'helmet', quality: 'darkgold', setId: 'kester_set', setName: '【克斯特套装】', stats: { def: 210, speed: 20, dodge: 10 }, holes: 2, desc: '巨龙之门神圣古冠。' }
    ],
    spacetime_gate: [
      { id: 'conqueror_sword', name: '征服者诸神圣剑', slot: 'weapon', quality: 'purplegold', setId: 'conqueror', setName: '【征服者套装】', stats: { atk: 480, str: 75, crit: 18, critDmg: 35 }, holes: 3, desc: '时空之门掌控者配剑，至高荣耀。' },
      { id: 'karlis_robe', name: '卡尔里斯时空法袍', slot: 'armor', quality: 'purplegold', setId: 'karlis_set', setName: '【卡尔里斯传奇套装】', stats: { def: 380, hp: 2800, mp: 1200, dmgResist: 12 }, holes: 3, desc: '时空之门无上神装法袍。' }
    ]
  };

  const list = pool[gateId] || pool.trial_gate;
  const picked = list[Math.floor(Math.random() * list.length)];
  return {
    ...picked,
    stars: 0,
    durability: 100,
    maxDurability: 100,
    gems: [],
    sockets: picked.holes || 0,
    icon: picked.icon || (picked.slot === 'weapon' ? 'images/items/wpn_sword.svg' : 'images/items/arm_chest.svg'),
    uid: 'dungeon_drop_' + Date.now() + Math.random().toString(36).substr(2, 5)
  };
}
