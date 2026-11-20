// 装备与物品配置：参考《魔塔世界》百度百科的简体单机改编版
// 10大经典槽位：武器、护胸、护腿、披风、头盔、护手、护靴、腰带、项链、戒指

// 12 部位总开关（默认开；关闭即回退为原作精简版 10 部位，用于回滚）
export const ENABLE_12_SLOTS = true;

const BASE_ITEM_SLOTS = [
  { id: 'weapon', name: '武器', icon: 'images/items/wpn_sword.svg' },
  { id: 'armor', name: '护胸', icon: 'images/items/arm_chest.svg' },
  { id: 'pants', name: '护腿', icon: 'images/items/eq_pants.svg' },
  { id: 'cloak', name: '披风', icon: 'images/items/eq_cloak.svg' },
  { id: 'helmet', name: '头盔', icon: 'images/items/eq_helmet.svg' },
  { id: 'gloves', name: '护手', icon: 'images/items/eq_gloves.svg' },
  { id: 'boots', name: '护靴', icon: 'images/items/eq_boots.svg' },
  { id: 'belt', name: '腰带', icon: 'images/items/eq_belt.svg' },
  { id: 'necklace', name: '项链', icon: 'images/items/eq_necklace.svg' },
  { id: 'ring', name: '戒指', icon: 'images/items/eq_ring.svg' }
];

// 原作 12 部位新增：护心镜（防具）/ 手镯（首饰）。图标为占位，后续补正式绘画。
const EXTRA_ITEM_SLOTS = [
  { id: 'mirror', name: '护心镜', icon: 'images/items/arm_chest.svg' },
  { id: 'bracelet', name: '手镯', icon: 'images/items/eq_ring.svg' }
];

export const ITEM_SLOTS = ENABLE_12_SLOTS ? [...BASE_ITEM_SLOTS, ...EXTRA_ITEM_SLOTS] : BASE_ITEM_SLOTS;

export const SLOT_MAP = ITEM_SLOTS.reduce((acc, slot) => {
  acc[slot.id] = slot;
  return acc;
}, {});

// 原作孔位上限：武器 3、防具 2（含护心镜）、首饰 1（项链/戒指/手镯）。
export function getSocketCap(slot) {
  if (slot === 'weapon') return 3;
  if (slot === 'necklace' || slot === 'ring' || slot === 'bracelet') return 1;
  return 2;
}

// 首饰类无耐久（项链/戒指/手镯）；护心镜归防具，有耐久。
export function hasDurability(slot) {
  return slot !== 'necklace' && slot !== 'ring' && slot !== 'bracelet';
}

export const QUALITIES = {
  white: { id: 'white', name: '白装', color: '#9ca3af', border: 'border-slate-400', bg: 'bg-slate-700/50', multiplier: 1.0 },
  blue: { id: 'blue', name: '蓝装', color: '#3b82f6', border: 'border-blue-500', bg: 'bg-blue-950/60', multiplier: 1.5 },
  gold: { id: 'gold', name: '黄金装', color: '#f59e0b', border: 'border-amber-400', bg: 'bg-amber-950/70', multiplier: 2.2 },
  darkgold: { id: 'darkgold', name: '暗金装', color: '#ea580c', border: 'border-orange-500', bg: 'bg-orange-950/80', multiplier: 3.2 },
  purplegold: { id: 'purplegold', name: '紫金装', color: '#a855f7', border: 'border-purple-500', bg: 'bg-purple-950/90', multiplier: 4.5 }
};

// Canonical display names retain legacy IDs and inventory stack boundaries.
export const CANONICAL_ITEM_NAMES = {
  socket_crystal: '打孔水晶',
  pet_egg_gold: '黄金宠物蛋',
  pet_egg_darkgold: '暗金宠物蛋'
};

export function applyCanonicalItemName(item) {
  const name = CANONICAL_ITEM_NAMES[item?.id];
  return name && item.name !== name ? { ...item, name } : item;
}

// 官方套装大全（参考百度百科，简体单机改编）
export const OFFICIAL_SETS = {
  courage: {
    id: 'courage',
    name: '【勇气套装】',
    quality: 'gold',
    reqLevel: 30,
    source: '剧情任务/魔塔前段',
    slots: ['weapon', 'armor', 'pants', 'helmet', 'gloves', 'boots', 'cloak'],
    bonus2: { atk: 60, hp: 500, desc: '2件套：攻击+60，生命值上限+500' },
    bonus4: { allSkillLv: 2, hit: 10, desc: '4件套：职业技能等级+2，命中率+10%' },
    bonus7: { allSkillLv: 3, hit: 15, desc: '7件套：职业技能等级+3，命中率+15%' }
  },
  guardian_knight: {
    id: 'guardian_knight',
    name: '【守护骑士套装】',
    quality: 'gold',
    reqLevel: 50,
    source: '竞技场/战场',
    slots: ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'belt', 'mirror'],
    bonus2: { def: 120, hit: 10, desc: '2件套：物理防御+120，命中率+10%' },
    bonus4: { hp: 1200, allSkillLv: 3, desc: '4件套：生命上限+1200，职业技能等级+3' },
    bonus7: { def: 600, hp: 1500, dmgResist: 10, desc: '7件套：防御值+600，生命上限+1500，减伤+10%' }
  },
  sagael_set: {
    id: 'sagael_set',
    name: '【萨格尔套装】',
    quality: 'darkgold',
    reqLevel: 50,
    source: '古堡探险/死亡之门',
    slots: ['weapon', 'armor', 'pants', 'cloak', 'helmet', 'belt', 'bracelet'],
    bonus2: { mp: 500, atk: 120, desc: '2件套：魔法值上限+500，攻击力+120' },
    bonus4: { counter: 20, allSkillLv: 4, desc: '4件套：反击率+20%，职业技能等级+4' },
    bonus7: { atk: 300, counter: 15, allSkillLv: 3, desc: '7件套：攻击力+300，反击率+15%，职业技能等级+3' }
  },
  judge: {
    id: 'judge',
    name: '【审判者套装】',
    quality: 'darkgold',
    reqLevel: 50,
    source: '变幻之门/死亡之门',
    slots: ['weapon', 'armor', 'pants', 'gloves', 'boots', 'necklace', 'ring'],
    bonus2: { hp: 600, speed: 20, desc: '2件套：生命上限+600，攻击速度+20' },
    bonus4: { lifesteal: 15, allSkillLv: 3, desc: '4件套：生命偷取+15%，职业技能等级+3' },
    bonus7: { critDmg: 40, lifesteal: 10, allSkillLv: 3, desc: '7件套：暴击伤害+40%，生命偷取+10%，职业技能等级+3' }
  },
  kester_set: {
    id: 'kester_set',
    name: '【克斯特套装】',
    quality: 'darkgold',
    reqLevel: 70,
    source: '古堡探险/巨龙之门',
    slots: ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'cloak', 'bracelet'],
    bonus2: { crit: 10, atk: 100, desc: '2件套：暴击率+10%，基础攻击力+100' },
    bonus4: { dodge: 15, allSkillLv: 5, desc: '4件套：闪避率+15%，职业技能等级+5' },
    bonus7: { dodge: 15, speed: 30, allSkillLv: 4, desc: '7件套：闪避率+15%，攻击速度+30，职业技能等级+4' }
  },
  punisher: {
    id: 'punisher',
    name: '【制裁者套装】',
    quality: 'darkgold',
    reqLevel: 70,
    source: '风暴之门/巨龙之门',
    slots: ['weapon', 'armor', 'pants', 'helmet', 'belt', 'mirror', 'cloak'],
    bonus2: { armorBreak: 100, atk: 120, desc: '2件套：破击值+100，攻击力+120' },
    bonus4: { critDmg: 45, allSkillLv: 5, desc: '4件套：暴击伤害+45%，职业技能等级+5' },
    bonus7: { atk: 350, armorBreak: 150, allSkillLv: 4, desc: '7件套：攻击力+350，破击值+150，职业技能等级+4' }
  },
  aden_set: {
    id: 'aden_set',
    name: '【亚丁套装】',
    quality: 'darkgold',
    reqLevel: 80,
    source: '古堡探险/时空之门',
    slots: ['weapon', 'armor', 'pants', 'helmet', 'gloves', 'boots', 'belt'],
    bonus2: { hp: 800, def: 250, desc: '2件套：生命上限+800，防御值+250' },
    bonus4: { counter: 25, allSkillLv: 6, desc: '4件套：反击几率+25%，全技能等级+6级' },
    bonus7: { def: 700, hp: 2000, counter: 10, desc: '7件套：防御值+700，生命上限+2000，反击率+10%' }
  },
  conqueror: {
    id: 'conqueror',
    name: '【征服者套装】',
    quality: 'darkgold',
    reqLevel: 80,
    source: '时空之门/古堡深层',
    slots: ['weapon', 'armor', 'pants', 'cloak', 'helmet', 'gloves', 'mirror'],
    bonus2: { atk: 180, hp: 1000, desc: '2件套：攻击力+180，生命上限+1000' },
    bonus4: { dmgBonus: 25, allSkillLv: 6, desc: '4件套：主动攻击伤害+25%，职业技能等级+6' },
    bonus7: { atk: 400, dmgBonus: 20, allSkillLv: 4, desc: '7件套：攻击力+400，主动攻击伤害+20%，职业技能等级+4' }
  },
  destiny_goddess: {
    id: 'destiny_goddess',
    name: '【命运女神套装】',
    quality: 'purplegold',
    reqLevel: 40,
    source: '屠银龙产出',
    slots: ['weapon', 'armor', 'pants', 'helmet', 'necklace', 'ring', 'bracelet'],
    bonus2: { dodge: 15, speed: 25, desc: '2件套：闪避率+15%，先手速度+25' },
    bonus4: { allSkillLv: 1, doubleStrike: 20, desc: '4件套：全部职业技能等级+1，普攻连击率+20%' },
    bonus7: { dodge: 15, speed: 30, doubleStrike: 15, desc: '7件套：闪避率+15%，先手速度+30，普攻连击率+15%' }
  },
  wisdom_goddess: {
    id: 'wisdom_goddess',
    name: '【智慧女神套装】',
    quality: 'purplegold',
    reqLevel: 60,
    source: '屠金龙产出',
    slots: ['weapon', 'armor', 'helmet', 'gloves', 'necklace', 'ring', 'bracelet'],
    bonus2: { hp: 800, mp: 600, desc: '2件套：生命上限+800，魔法值+600' },
    bonus4: { allSkillLv: 2, magicDmg: 30, desc: '4件套：全部技能+2级，魔法与破击伤害+30%' },
    bonus7: { mp: 1500, magicDmg: 25, allSkillLv: 3, desc: '7件套：魔法值上限+1500，魔法伤害+25%，职业技能等级+3' }
  },
  wargod_set: {
    id: 'wargod_set',
    name: '【战神套装】',
    quality: 'purplegold',
    reqLevel: 70,
    source: '屠金龙产出',
    slots: ['weapon', 'armor', 'pants', 'helmet', 'gloves', 'boots', 'belt'],
    bonus2: { def: 800, hp: 1500, desc: '2件套：附加防御+800，生命上限+1500' },
    bonus4: { allSkillLv: 2, dmgResist: 25, desc: '4件套：所有技能提升2级，受伤害免伤+25%' },
    bonus7: { def: 800, hp: 2500, dmgResist: 15, desc: '7件套：防御值+800，生命上限+2500，减伤+15%' }
  },
  victory_goddess: {
    id: 'victory_goddess',
    name: '【胜利女神套装】',
    quality: 'purplegold',
    reqLevel: 80,
    source: '屠金龙巅峰产出',
    slots: ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'cloak', 'mirror'],
    bonus2: { atk: 300, crit: 25, desc: '2件套：物理与魔法攻击力+300，暴击率+25%' },
    bonus4: { allSkillLv: 3, finishDmg: 40, desc: '4件套：职业技能等级+3，对生命不高于30%的目标攻击伤害+40%' },
    bonus7: { atk: 450, crit: 15, finishDmg: 30, desc: '7件套：攻击力+450，暴击率+15%，对残血目标伤害+30%' }
  },
  karlis_set: {
    id: 'karlis_set',
    name: '【卡尔里斯传奇套装】',
    quality: 'purplegold',
    reqLevel: 70,
    source: '古堡探险100层 / 终极时空之门',
    slots: ['weapon', 'armor', 'pants', 'cloak', 'helmet', 'belt', 'mirror'],
    bonus2: { def: 600, hp: 2000, desc: '2件套：防御值+600，生命上限+2000' },
    bonus4: { allSkillLv: 2, magicAbsorb: 30, desc: '4件套：全部技能+2级，受到伤害的30%转化为自身法力' },
    bonus7: { def: 1000, hp: 3000, magicAbsorb: 20, allSkillLv: 3, desc: '7件套：防御值+1000，生命上限+3000，法力吸收+20%，职业技能等级+3' }
  },
  light_emissary: {
    id: 'light_emissary',
    name: '【光明圣使套装】',
    quality: 'purplegold',
    reqLevel: 90,
    source: '屠夜煞龙产出',
    slots: ['weapon', 'armor', 'pants', 'helmet', 'gloves', 'necklace', 'bracelet'],
    bonus2: { atk: 260, hp: 2200, dmgResist: 8, desc: '2件套：攻击+260，生命上限+2200，减伤+8%' },
    bonus4: { allSkillLv: 3, magicDmg: 25, crit: 12, desc: '4件套：职业技能等级+3，魔法伤害+25%，暴击+12%' },
    bonus7: { atk: 500, hp: 3000, dmgResist: 15, allSkillLv: 4, desc: '7件套：攻击力+500，生命上限+3000，减伤+15%，职业技能等级+4' }
  },
  // —— C1 补齐的 3 套（非红框，原作可获取） ——
  tower_hero: {
    id: 'tower_hero',
    name: '【魔塔英雄套装】',
    quality: 'darkgold',
    reqLevel: 60,
    source: '古堡50/70/90层首通 / 古堡深层掉落',
    slots: ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'belt', 'mirror'],
    bonus2: { atk: 180, hp: 800, desc: '2件套：攻击力+180，生命上限+800' },
    bonus4: { def: 400, dmgResist: 10, desc: '4件套：防御值+400，减伤+10%' },
    bonus7: { allSkillLv: 3, critDmg: 25, hp: 1500, desc: '7件套：职业技能等级+3，暴击伤害+25%，生命上限+1500' }
  },
  aden_heir: {
    id: 'aden_heir',
    name: '【亚诺后裔套装】',
    quality: 'gold',
    reqLevel: 40,
    source: '王都主线 / 王室任务 / 俸禄试炼',
    slots: ['weapon', 'armor', 'pants', 'helmet', 'necklace', 'ring', 'bracelet'],
    bonus2: { atk: 120, hp: 600, desc: '2件套：攻击力+120，生命上限+600' },
    bonus4: { dmgResist: 8, speed: 15, desc: '4件套：减伤+8%，攻击速度+15' },
    bonus7: { allSkillLv: 2, crit: 10, hp: 1200, desc: '7件套：职业技能等级+2，暴击率+10%，生命上限+1200' }
  },
  dark_demon: {
    id: 'dark_demon',
    name: '【黑暗魔神套装】',
    quality: 'purplegold',
    reqLevel: 90,
    source: '古堡100层终焉 / 夜煞龙 / 深渊时空门',
    slots: ['weapon', 'armor', 'pants', 'cloak', 'helmet', 'mirror', 'bracelet'],
    bonus2: { atk: 300, crit: 20, desc: '2件套：攻击力+300，暴击率+20%' },
    bonus4: { magicDmg: 25, dmgResist: 12, desc: '4件套：魔法伤害+25%，减伤+12%' },
    bonus7: { allSkillLv: 4, critDmg: 40, magicAbsorb: 20, desc: '7件套：职业技能等级+4，暴击伤害+40%，法力吸收+20%' }
  }
};

// 官方核心道具定义 (钥匙、保护水晶、进阶石、晶石等)
export const SPECIAL_ITEMS = {
  key_redwood: {
    id: 'key_redwood',
    name: '红木钥匙',
    icon: 'images/items/key_redwood.svg',
    quality: 'blue',
    desc: '古堡探险初级钥匙，可在古堡内使用，从第 1 层开始开启古堡探险。'
  },
  key_bronze: {
    id: 'key_bronze',
    name: '青铜钥匙',
    icon: 'images/items/key_bronze.svg',
    quality: 'gold',
    desc: '古堡探险中级钥匙，可在古堡内使用，直接从第 1 层或第 50 层破界开启古堡探险！'
  },
  key_mithril: {
    id: 'key_mithril',
    name: '秘银钥匙',
    icon: 'images/items/key_mithril.svg',
    quality: 'darkgold',
    desc: '深渊魔塔破界钥匙，直达第 20 层直面深渊长廊与守关死灵领主！'
  },
  key_obsidian: {
    id: 'key_obsidian',
    name: '黑曜石钥匙',
    icon: 'images/items/key_obsidian.svg',
    quality: 'purplegold',
    desc: '深渊熔岩破界钥匙，直达第 35 层直面暴怒巨魔与炼狱炎魔！'
  },
  key_titan: {
    id: 'key_titan',
    name: '泰坦神圣钥匙',
    icon: 'images/items/key_titan.svg',
    quality: 'purplegold',
    desc: '远古泰坦神殿秘钥，可在魔塔中使用，破界直达第 70 层迎战堕落炽天使与泰坦遗影！'
  },
  key_platinum: {
    id: 'key_platinum',
    name: '白金钥匙',
    icon: 'images/items/key_platinum.svg',
    quality: 'purplegold',
    desc: '魔塔探险终极钥匙，可在魔塔内使用，直达第 90 层直捣红莲魔龙与黑翼龙皇王座！'
  },
  relic_longinus: {
    id: 'relic_longinus',
    name: '【远古圣遗物】朗基努斯命运圣枪',
    icon: 'images/items/relic_spear.svg',
    quality: 'purplegold',
    desc: '突破魔塔 50 层觉醒的命运圣器。攻击力+150，暴击率+8%，暴击时 30% 几率触发神裁真伤。'
  },
  relic_avalon: {
    id: 'relic_avalon',
    name: '【远古圣遗物】阿瓦隆湖中仙子圣鞘',
    icon: 'images/items/relic_scabbard.svg',
    quality: 'purplegold',
    desc: '突破魔塔 60 层觉醒的永恒圣鞘。生命上限+2000，双防+140，濒死时触发仙子结界免死并回血 35%。'
  },
  relic_prometheus: {
    id: 'relic_prometheus',
    name: '【远古圣遗物】普罗米修斯不灭火种',
    icon: 'images/items/relic_flame.svg',
    quality: 'purplegold',
    desc: '突破魔塔 70 层觉醒的永昼火种。全潜能+30，全技能+2，造成伤害提升 15% 且附带红莲灼烧真伤。'
  },
  relic_solomon: {
    id: 'relic_solomon',
    name: '【远古圣遗物】所罗门统御封魔印戒',
    icon: 'images/items/relic_ring.svg',
    quality: 'purplegold',
    desc: '突破魔塔 80 层觉醒的魔神金戒。法力+1000，身法速度+40，战斗开局压制敌方领主速度与攻击。'
  },
  relic_mjolnir: {
    id: 'relic_mjolnir',
    name: '【远古圣遗物】雷神之锤·米约尔尼尔遗片',
    icon: 'images/items/relic_hammer.svg',
    quality: 'purplegold',
    desc: '突破魔塔 90 层觉醒的风暴神锤。物理攻击+260，暴伤+40%，攻击命中时 25% 几率雷霆眩晕敌人。'
  },
  relic_yggdrasil: {
    id: 'relic_yggdrasil',
    name: '【远古圣遗物】世界树·尤克特拉希尔终焉之果',
    icon: 'images/items/relic_tree.svg',
    quality: 'purplegold',
    desc: '突破魔塔 100 层觉醒的宇宙神果。全属性+60，生命+5000，每回合自愈 8% 生命并免控。'
  },
  rune_el: {
    id: 'rune_el',
    name: '奥术符文·艾尔',
    icon: 'images/items/rune_stone.svg',
    quality: 'blue',
    desc: '散发幽蓝秘法光辉的古老符文石，铭刻可增加 15 点智力与 20 点攻击力。'
  },
  rune_sol: {
    id: 'rune_sol',
    name: '炽炎符文·索尔',
    icon: 'images/items/rune_stone.svg',
    quality: 'blue',
    desc: '燃烧着不熄熔岩之力的符文石，铭刻可增加 15 点力量与 25 点物理攻击。'
  },
  rune_dol: {
    id: 'rune_dol',
    name: '霜魄符文·多尔',
    icon: 'images/items/rune_stone.svg',
    quality: 'gold',
    desc: '凝结万年玄霜的轻盈符文石，铭刻可增加 15 点敏捷身法与 4% 闪避几率。'
  },
  rune_lo: {
    id: 'rune_lo',
    name: '圣光符文·罗',
    icon: 'images/items/rune_stone.svg',
    quality: 'gold',
    desc: '沐浴圣堂圣光洗礼的生命石，铭刻可增加 20 点体魄耐力与 300 点生命上限。'
  },
  rune_jah: {
    id: 'rune_jah',
    name: '暗影符文·乔',
    icon: 'images/items/rune_stone.svg',
    quality: 'darkgold',
    desc: '流淌幽冥深渊暗影的禁忌符文，铭刻可增加 6% 暴击率与 15% 暴击伤害。'
  },
  rune_cham: {
    id: 'rune_cham',
    name: '泰坦符文·查姆',
    icon: 'images/items/rune_stone.svg',
    quality: 'darkgold',
    desc: '蕴藏远古泰坦巨人之力的坚实重石，铭刻可增加 35 点防御力与 4% 伤害免伤。'
  },
  rune_ith: {
    id: 'rune_ith',
    name: '逐风符文·伊司',
    icon: 'images/items/rune_stone.svg',
    quality: 'gold',
    desc: '受风暴精灵赐福的飞羽符文，铭刻可暴增 20 点行动速度与 12 点敏捷身法。'
  },
  rune_ber: {
    id: 'rune_ber',
    name: '神圣符文·贝',
    icon: 'images/items/rune_stone.svg',
    quality: 'purplegold',
    desc: '传世紫金创世符文石，铭刻可增加全四维属性各 15 点，并提升 8% 最终造成伤害。'
  },
  star_crystal: {
    id: 'star_crystal',
    name: '升星水晶',
    icon: 'images/items/star_crystal.svg',
    quality: 'gold',
    desc: '铁匠铺装备升星必备神石，可将装备强化至最高 8 星！'
  },
  protect_crystal: {
    id: 'protect_crystal',
    name: '保护水晶',
    icon: 'images/items/protect_crystal.svg',
    quality: 'darkgold',
    desc: '在装备升星时加入，即使升星失败也绝对不会降级！'
  },
  socket_crystal: {
    id: 'socket_crystal',
    name: '打孔水晶',
    icon: 'images/items/socket_crystal.svg',
    quality: 'blue',
    desc: '为装备开凿宝石孔洞，每件装备最多开启 4 孔。'
  },
  diamond_1: {
    id: 'diamond_1',
    name: '碎裂金刚钻',
    icon: 'images/items/crystal_socket.svg',
    quality: 'darkgold',
    desc: '开启装备宝石孔洞的锋利金刚钻，可为装备打凿宝石镶嵌孔。'
  },
  evolution_stone: {
    id: 'evolution_stone',
    name: '进化石',
    icon: 'images/items/evolution_stone.svg',
    quality: 'darkgold',
    desc: '在神兽工坊使用，将达到 30 级的黄金宠物进化为暗金宠物，资质上限飞跃至 4500！'
  },
  destiny_stone: {
    id: 'destiny_stone',
    name: '天命石',
    icon: 'images/items/destiny_stone.svg',
    quality: 'purplegold',
    desc: '屠银龙/金龙获得的传世圣物，可将达到 40 级的暗金宠物终极觉醒为紫金神兽！'
  },
  pet_food: {
    id: 'pet_food',
    name: '魔能兽肉排',
    icon: 'images/items/pet_food.svg',
    quality: 'blue',
    desc: '喂食神兽恢复 35 点体力值。体力低于80时天赋失效，低于60时属性减半，低于40时属性无效。'
  },
  pet_food_basic: {
    id: 'pet_food_basic',
    name: '普通宠物口粮',
    icon: 'images/items/pet_food.svg',
    quality: 'white',
    desc: '喂食神兽恢复 15 点体力值。日常巡逻与低阶悬赏可得。'
  },
  pet_food_luxury: {
    id: 'pet_food_luxury',
    name: '豪华宠物饼干',
    icon: 'images/items/pet_food.svg',
    quality: 'gold',
    desc: '喂食神兽恢复 60 点体力值。屠龙与高阶悬赏可得。'
  },
  slave_sigil: {
    id: 'slave_sigil',
    name: '侍从契印',
    icon: 'images/items/pet_egg.svg',
    quality: 'purple',
    desc: '在庄园牢房使用，可收押一名对应战俘侍从；每名战俘只能缔约一次。'
  },
  pill_reborn: {
    id: 'pill_reborn',
    name: '远古重铸灵药',
    icon: 'images/items/pill_reborn.svg',
    quality: 'darkgold',
    desc: '古代传承的重铸灵药，可在神兽圣境洗炼重铸神兽资质！'
  },
  pet_egg: {
    id: 'pet_egg',
    name: '远古神兽契约蛋',
    icon: 'images/items/pet_egg.svg',
    quality: 'purplegold',
    desc: '古老神兽所化的契约神蛋，可在神兽工坊唤醒全新神兽伙伴！'
  },
  bait_normal: {
    id: 'bait_normal',
    name: '普通鱼饵',
    icon: 'images/items/bait_normal.svg',
    quality: 'white',
    desc: '酒馆悬赏提供的普通鱼饵，能在水域钓到【七鳃鳗】，可在鱼市兑换魔晶石。'
  },
  bait_luxury: {
    id: 'bait_luxury',
    name: '高级鱼饵',
    icon: 'images/items/bait_luxury.svg',
    quality: 'darkgold',
    desc: '特制的秘制高级鱼饵，有极高概率钓上【金龙鱼】，可在鱼市兑换魔晶与宠物口粮。'
  },
  crystal_gold: {
    id: 'crystal_gold',
    name: '黄金晶石',
    icon: 'images/items/crystal_gold.svg',
    quality: 'gold',
    desc: '分解黄金套装获得，可在铁匠铺熔炼指定黄金套装部件。'
  },
  crystal_darkgold: {
    id: 'crystal_darkgold',
    name: '暗金晶石',
    icon: 'images/items/crystal_darkgold.svg',
    quality: 'darkgold',
    desc: '分解暗金套装获得，可在铁匠铺熔炼指定暗金套装部件。'
  },
  crystal_purplegold: {
    id: 'crystal_purplegold',
    name: '紫金晶石',
    icon: 'images/items/crystal_purplegold.svg',
    quality: 'purplegold',
    desc: '分解紫金套装获得，可在铁匠铺熔炼指定紫金传世套装部件。'
  }
};

// 装备洗炼附加词条池
export const REFORGE_AFFIXES = [
  { id: 'crit_dmg', name: '绝命暴伤', stat: 'critDmg', min: 25, max: 55, unit: '%', desc: '暴击伤害加成' },
  { id: 'counter_rate', name: '盾御反击', stat: 'counter', min: 8, max: 20, unit: '%', desc: '反击概率提升' },
  { id: 'lifesteal_rate', name: '鲜血渴望', stat: 'lifesteal', min: 8, max: 18, unit: '%', desc: '攻击吸血百分比' },
  { id: 'all_stats', name: '神之启迪', stat: 'allStats', min: 15, max: 40, unit: '点', desc: '全四维属性增加' },
  { id: 'dmg_resist', name: '坚毅庇护', stat: 'dmgResist', min: 6, max: 15, unit: '%', desc: '受到伤害直接减免' }
];

// 宝石系统 (攻击、防御、生命、敏捷)
export const GEMS_CONFIG = {
  atk: { id: 'atk', name: '金刚石', icon: 'images/items/gem_atk.svg', stat: 'atk', baseVal: 25, step: 30, desc: '增加攻击力 (限武器)' },
  def: { id: 'def', name: '玛瑙石', icon: 'images/items/gem_def.svg', stat: 'def', baseVal: 18, step: 20, desc: '增加防御值 (限防具)' },
  hp: { id: 'hp', name: '红宝石', icon: 'images/items/gem_hp.svg', stat: 'maxHp', baseVal: 180, step: 220, desc: '增加生命上限' },
  dex: { id: 'dex', name: '翡翠石', icon: 'images/items/gem_dex.svg', stat: 'speed', baseVal: 8, step: 10, desc: '增加先手速度与闪避' }
};

// 装备名称前缀与词根表 (用于随机生成高保真魔幻装备)
const EQUIP_NAMES = {
  weapon: ['圣剑', '龙鳞刃', '符文法杖', '精钢短弓', '破阵战锤', '断魂匕首'],
  armor: ['重钢护甲', '龙翼软甲', '魔纹长袍', '圣骑士胸铠', '暗影行者皮甲'],
  pants: ['坚韧护腿', '秘银腿铠', '织法轻裤', '野蛮绑腿', '龙鳞战裙'],
  cloak: ['晨曦披风', '暗夜斗篷', '灵风大氅', '铁血战袍', '霜火羽氅'],
  helmet: ['圣耀重盔', '远古战盔', '智慧王冠', '影行兜帽', '天界战面'],
  gloves: ['铁拳护手', '迅捷手套', '魔导指套', '狂怒之握', '游侠手套'],
  boots: ['疾风战靴', '泰坦重靴', '凌波长靴', '秘银战履', '追踪者短靴'],
  belt: ['力量腰带', '龙筋革带', '秘法束带', '坚定重带', '荆棘束腰'],
  necklace: ['星辰项链', '巨龙心核', '翡翠吊坠', '守护者徽章', '圣灵护符'],
  ring: ['誓约之戒', '龙眼宝石戒', '符文秘银戒', '荣耀指环', '破晓金戒'],
  mirror: ['精钢护心镜', '龙鳞护心镜', '秘银护心镜', '守护者胸镜', '战痕护心镜'],
  bracelet: ['秘银手镯', '龙晶腕轮', '符文护腕', '荣耀手镯', '破晓臂环']
};

// 职业装备模板；首饰共用，其他部位按职业塑形并标明专精。
export const CLASS_EQUIPMENT = {
  warrior: { stat: 'str', weapon: '精钢长剑', armor: '骑士胸甲', pants: '精钢护腿', cloak: '卫士披风', helmet: '骑士战盔', gloves: '精钢护手', boots: '行军战靴', belt: '力量腰带', mirror: '精钢护心镜', icon: 'wpn_sword' },
  mage: { stat: 'int', weapon: '星辉法杖', armor: '织法长袍', pants: '织法长裤', cloak: '星纹斗篷', helmet: '秘法兜帽', gloves: '魔导手套', boots: '织法软靴', belt: '秘法束带', mirror: '秘银护心镜', icon: 'wpn_staff' },
  hunter: { stat: 'dex', weapon: '巡林长弓', armor: '游侠皮甲', pants: '游侠护腿', cloak: '巡林披风', helmet: '游侠兜帽', gloves: '弓手护手', boots: '追踪短靴', belt: '游侠革带', mirror: '轻皮护心镜', icon: 'wpn_bow' }
};

export function specializeEquipment(item, classId) {
  const template = CLASS_EQUIPMENT[classId];
  if (!item?.slot || !template?.[item.slot]) return item;
  const prefix = item.name?.includes('·') ? item.name.slice(0, item.name.lastIndexOf('·')) : (OFFICIAL_SETS[item.setId || item.set]?.name || item.name?.replace(/(?:重剑|圣剑|长剑|铁剑|之刃|法杖|长弓|短弓|重铠|法袍|皮甲|胸甲|战盔|护手|护腿|战胫|战靴|腰带|长袍)$/, '') || '冒险者');
  const stats = { ...item.stats };
  const attributes = (stats.str || 0) + (stats.int || 0) + (stats.dex || 0);
  delete stats.str; delete stats.int; delete stats.dex;
  if (attributes) stats[template.stat] = attributes;
  return { ...item, quality: item.quality === 'purple' ? 'darkgold' : item.quality, name: `${prefix}·${template[item.slot]}`, reqClass: classId, stats,
    icon: item.slot === 'weapon' ? `images/items/${template.icon}.svg` : item.slot === 'armor' && classId === 'mage' ? 'images/items/arm_robe.svg' : (SLOT_MAP[item.slot]?.icon || item.icon) };
}

export function generateEquipment(slot, level = 1, quality = 'blue', setId = null, classId = null) {
  const slotObj = SLOT_MAP[slot] || ITEM_SLOTS[0];
  const qObj = QUALITIES[quality] || QUALITIES.blue;
  const mult = qObj.multiplier || 1.0;
  
  const namePool = EQUIP_NAMES[slot] || ['精炼装备'];
  const baseName = namePool[Math.floor(Math.random() * namePool.length)];
  const name = setId && OFFICIAL_SETS[setId] ? `${OFFICIAL_SETS[setId].name.replace(/[【】]/g, '')}·${baseName}` : `${qObj.name}·${baseName}`;

  const stats = {};
  if (slot === 'weapon') {
    stats.atk = Math.floor((20 + level * 6) * mult);
    if (Math.random() > 0.5) stats.hit = Math.floor(4 + level * 0.8);
    if (Math.random() > 0.6) stats.crit = Math.floor(3 + level * 0.5);
  } else if (slot === 'armor' || slot === 'pants') {
    stats.def = Math.floor((12 + level * 4) * mult);
    stats.hp = Math.floor((80 + level * 25) * mult);
  } else if (slot === 'helmet' || slot === 'gloves' || slot === 'boots' || slot === 'belt') {
    stats.def = Math.floor((8 + level * 2.5) * mult);
    if (slot === 'boots') stats.speed = Math.floor((6 + level * 1.5) * mult);
    if (slot === 'gloves') stats.atk = Math.floor((6 + level * 2) * mult);
    if (slot === 'helmet') stats.hp = Math.floor((50 + level * 15) * mult);
  } else if (slot === 'cloak') {
    stats.def = Math.floor((6 + level * 2) * mult);
    stats.maxMp = Math.floor((20 + level * 3) * mult);
  } else if (slot === 'mirror') {
    stats.def = Math.floor((10 + level * 3) * mult);
    stats.hp = Math.floor((60 + level * 12) * mult);
    if (Math.random() > 0.6) stats.magicResist = Math.floor(3 + level * 0.3);
  } else if (slot === 'bracelet') {
    if (Math.random() > 0.4) stats.atk = Math.floor((8 + level * 2) * mult);
    if (Math.random() > 0.4) stats.crit = Math.floor((2 + level * 0.3) * mult);
    if (Math.random() > 0.5) stats.maxHp = Math.floor((50 + level * 15) * mult);
    if (!Object.keys(stats).length) stats.maxHp = Math.floor((50 + level * 15) * mult);
  } else if (slot === 'necklace' || slot === 'ring') {
    if (Math.random() > 0.4) stats.atk = Math.floor((10 + level * 3) * mult);
    if (Math.random() > 0.4) stats.crit = Math.floor((3 + level * 0.4) * mult);
    if (Math.random() > 0.5) stats.maxHp = Math.floor((60 + level * 18) * mult);
    if (!Object.keys(stats).length) stats.maxHp = Math.floor((60 + level * 18) * mult);
  }

  if (CLASS_EQUIPMENT[classId] && ['weapon', 'armor', 'gloves'].includes(slot)) {
    stats[CLASS_EQUIPMENT[classId].stat] = Math.floor((2 + level * 0.4) * mult);
    if (slot === 'armor' && classId === 'mage') stats.maxMp = Math.floor((25 + level * 4) * mult);
    if (slot === 'armor' && classId === 'warrior') stats.hp = Math.floor(stats.hp * 1.15);
    if (slot === 'gloves' && classId === 'warrior') stats.counter = 4;
    if (slot === 'gloves' && classId === 'hunter') stats.speed = Math.floor((3 + level * .3) * mult);
  }

  // 宝石孔：品质决定初始孔数，部位上限按原作（武器3 / 防具2 / 首饰1）
  let qualitySockets = 0;
  if (quality === 'blue') qualitySockets = 1;
  else if (quality === 'gold') qualitySockets = slot === 'weapon' ? 2 : 1;
  else if (quality === 'darkgold') qualitySockets = slot === 'weapon' ? 3 : 2;
  else if (quality === 'purplegold') qualitySockets = 3;
  const maxSockets = Math.min(qualitySockets, getSocketCap(slot));

  return specializeEquipment({
    id: `eq_${slot}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name,
    slot,
    quality,
    reqLevel: Math.max(1, Math.floor(level / 5) * 5),
    ...(hasDurability(slot) ? { durability: 100, maxDurability: 100 } : {}),
    stars: 0,
    sockets: maxSockets,
    gems: [],
    stats,
    icon: slotObj.icon,
    setId: setId || null,
    uid: 'eq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
  }, classId);
}

