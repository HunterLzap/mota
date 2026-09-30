// 装备与物品配置：100% 还原《魔塔世界》百度百科原著
// 10大经典槽位：武器、护胸、护腿、披风、头盔、护手、护靴、腰带、项链、戒指

export const ITEM_SLOTS = [
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

export const SLOT_MAP = ITEM_SLOTS.reduce((acc, slot) => {
  acc[slot.id] = slot;
  return acc;
}, {});

export const QUALITIES = {
  white: { id: 'white', name: '白装', color: '#9ca3af', border: 'border-slate-400', bg: 'bg-slate-700/50', multiplier: 1.0 },
  blue: { id: 'blue', name: '蓝装', color: '#3b82f6', border: 'border-blue-500', bg: 'bg-blue-950/60', multiplier: 1.5 },
  gold: { id: 'gold', name: '黄金装', color: '#f59e0b', border: 'border-amber-400', bg: 'bg-amber-950/70', multiplier: 2.2 },
  darkgold: { id: 'darkgold', name: '暗金装', color: '#ea580c', border: 'border-orange-500', bg: 'bg-orange-950/80', multiplier: 3.2 },
  purplegold: { id: 'purplegold', name: '紫金装', color: '#a855f7', border: 'border-purple-500', bg: 'bg-purple-950/90', multiplier: 4.5 }
};

// 官方原著套装大全 (百度百科 100% 还原)
export const OFFICIAL_SETS = {
  courage: {
    id: 'courage',
    name: '【勇气套装】',
    quality: 'gold',
    reqLevel: 30,
    source: '剧情任务/魔塔前段',
    bonus2: { atk: 60, hp: 500, desc: '2件套：攻击+60，生命值上限+500' },
    bonus4: { allSkillLv: 2, desc: '4件套：全职业初阶技能等级+2，命中率+10%' }
  },
  guardian_knight: {
    id: 'guardian_knight',
    name: '【守护骑士套装】',
    quality: 'gold',
    reqLevel: 50,
    source: '竞技场/战场',
    bonus2: { def: 120, hit: 100, desc: '2件套：物理防御+120，命中值+100' },
    bonus4: { hp: 1200, allSkillLv: 3, desc: '4件套：生命上限+1200，二阶技能等级+3' }
  },
  sagael_set: {
    id: 'sagael_set',
    name: '【萨格尔套装】',
    quality: 'darkgold',
    reqLevel: 50,
    source: '古堡探险/死亡之门',
    bonus2: { mp: 500, atk: 120, desc: '2件套：魔法值上限+500，攻击力+120' },
    bonus4: { counter: 20, allSkillLv: 4, desc: '4件套：反击率+20%，全职业核心技能+4级' }
  },
  judge: {
    id: 'judge',
    name: '【审判者套装】',
    quality: 'darkgold',
    reqLevel: 50,
    source: '变幻之门/死亡之门',
    bonus2: { hp: 600, speed: 20, desc: '2件套：生命上限+600，攻击速度+20' },
    bonus4: { lifesteal: 15, allSkillLv: 3, desc: '4件套：生命偷取+15%，队伍光环技能+3级' }
  },
  kester_set: {
    id: 'kester_set',
    name: '【克斯特套装】',
    quality: 'darkgold',
    reqLevel: 70,
    source: '古堡探险/巨龙之门',
    bonus2: { crit: 100, atk: 100, desc: '2件套：暴击值+100，基础攻击力+100' },
    bonus4: { dodge: 15, allSkillLv: 5, desc: '4件套：闪避率+15%，三阶绝技等级+5' }
  },
  punisher: {
    id: 'punisher',
    name: '【制裁者套装】',
    quality: 'darkgold',
    reqLevel: 70,
    source: '风暴之门/巨龙之门',
    bonus2: { armorBreak: 100, atk: 120, desc: '2件套：破击值+100，攻击力+120' },
    bonus4: { critDmg: 45, allSkillLv: 5, desc: '4件套：暴击伤害+45%，战争艺术+5级' }
  },
  aden_set: {
    id: 'aden_set',
    name: '【亚丁套装】',
    quality: 'darkgold',
    reqLevel: 80,
    source: '古堡探险/时空之门',
    bonus2: { hp: 800, def: 250, desc: '2件套：生命上限+800，防御值+250' },
    bonus4: { counter: 25, allSkillLv: 6, desc: '4件套：反击几率+25%，全技能等级+6级' }
  },
  conqueror: {
    id: 'conqueror',
    name: '【征服者套装】',
    quality: 'darkgold',
    reqLevel: 80,
    source: '时空之门/古堡深层',
    bonus2: { atk: 180, hp: 1000, desc: '2件套：攻击力+180，生命上限+1000' },
    bonus4: { dmgBonus: 25, allSkillLv: 6, desc: '4件套：造成的全部伤害提升 25%，全绝技+6' }
  },
  destiny_goddess: {
    id: 'destiny_goddess',
    name: '【命运女神套装】',
    quality: 'purplegold',
    reqLevel: 40,
    source: '屠银龙产出',
    bonus2: { dodge: 150, speed: 25, desc: '2件套：闪避值+150，先手速度+25' },
    bonus4: { allSkillLv: 1, doubleStrike: 20, desc: '4件套：全部职业技能等级+1，普攻连击率+20%' }
  },
  wisdom_goddess: {
    id: 'wisdom_goddess',
    name: '【智慧女神套装】',
    quality: 'purplegold',
    reqLevel: 60,
    source: '屠金龙产出',
    bonus2: { hp: 800, mp: 600, desc: '2件套：生命上限+800，魔法值+600' },
    bonus4: { allSkillLv: 2, magicDmg: 30, desc: '4件套：全部技能+2级，魔法与破击伤害+30%' }
  },
  wargod_set: {
    id: 'wargod_set',
    name: '【战神套装】',
    quality: 'purplegold',
    reqLevel: 70,
    source: '屠金龙产出',
    bonus2: { def: 800, hp: 1500, desc: '2件套：附加防御+800，生命上限+1500' },
    bonus4: { allSkillLv: 2, dmgResist: 25, desc: '4件套：所有技能提升2级，受伤害免伤+25%' }
  },
  victory_goddess: {
    id: 'victory_goddess',
    name: '【胜利女神套装】',
    quality: 'purplegold',
    reqLevel: 80,
    source: '屠金龙巅峰产出',
    bonus2: { atk: 300, crit: 25, desc: '2件套：物理与魔法攻击力+300，暴击率+25%' },
    bonus4: { allSkillLv: 3, finishDmg: 40, desc: '4件套：全部技能提升3级，对残血目标伤害+40%' }
  },
  karlis_set: {
    id: 'karlis_set',
    name: '【卡尔里斯传奇套装】',
    quality: 'purplegold',
    reqLevel: 70,
    source: '古堡探险100层 / 终极时空之门',
    bonus2: { def: 600, hp: 2000, desc: '2件套：防御值+600，生命上限+2000' },
    bonus4: { allSkillLv: 2, magicAbsorb: 30, desc: '4件套：全部技能+2级，受到伤害的30%转化为自身法力' }
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
    name: '开孔水晶',
    icon: 'images/items/socket_crystal.svg',
    quality: 'blue',
    desc: '为装备开凿宝石孔洞，武器最多开 3 孔，防具最多开 2 孔。'
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
    desc: '喂食神兽恢复 35 点体力值。神兽体力低于 60 时特性将失效，请保持充盈！'
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
    desc: '杂货店购买的普通鱼饵，能在水域钓到【七鳃鳗】，可兑换大量魔晶石。'
  },
  bait_luxury: {
    id: 'bait_luxury',
    name: '高级鱼饵',
    icon: 'images/items/bait_luxury.svg',
    quality: 'darkgold',
    desc: '特制的秘制高级鱼饵，有极高概率钓上【金龙鱼】，可兑换稀有天命道具与高阶宝石！'
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
  ring: ['誓约之戒', '龙眼宝石戒', '符文秘银戒', '荣耀指环', '破晓金戒']
};

export function generateEquipment(slot, level = 1, quality = 'blue', setId = null) {
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
  } else if (slot === 'necklace' || slot === 'ring') {
    if (Math.random() > 0.4) stats.atk = Math.floor((10 + level * 3) * mult);
    if (Math.random() > 0.4) stats.crit = Math.floor((3 + level * 0.4) * mult);
    if (Math.random() > 0.5) stats.maxHp = Math.floor((60 + level * 18) * mult);
  }

  // 宝石孔 (白装0，蓝装1，黄金1~2，暗金2~3，紫金3)
  let maxSockets = 0;
  if (quality === 'blue') maxSockets = 1;
  else if (quality === 'gold') maxSockets = slot === 'weapon' ? 2 : 1;
  else if (quality === 'darkgold') maxSockets = slot === 'weapon' ? 3 : 2;
  else if (quality === 'purplegold') maxSockets = 3;

  return {
    id: `eq_${slot}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name,
    slot,
    quality,
    reqLevel: Math.max(1, Math.floor(level / 5) * 5),
    durability: 100,
    maxDurability: 100,
    stars: 0,
    sockets: maxSockets,
    gems: [],
    stats,
    icon: slotObj.icon,
    setId: setId || null,
    uid: 'eq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
  };
}

