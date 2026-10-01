// 远古神铸与符文之语体系配置 (Runic Words & Divine Smithing)
// 纯正西方高魔题材、零 Emoji、100% 矢量 SVG 图标

export const RUNES = {
  rune_el: {
    id: "rune_el",
    name: "奥术符文·艾尔",
    title: "奥术启迪",
    type: "rune",
    quality: "blue",
    icon: "images/items/star_crystal.svg",
    stats: { int: 15, atk: 20 },
    desc: "散发幽蓝秘法光辉的古老符文石，铭刻可增加 15 点智力与 20 点攻击力。"
  },
  rune_sol: {
    id: "rune_sol",
    name: "炽炎符文·索尔",
    title: "烈焰战意",
    type: "rune",
    quality: "blue",
    icon: "images/items/star_crystal.svg",
    stats: { str: 15, atk: 25 },
    desc: "燃烧着不熄熔岩之力的符文石，铭刻可增加 15 点力量与 25 点物理攻击。"
  },
  rune_dol: {
    id: "rune_dol",
    name: "霜魄符文·多尔",
    title: "极地寒冰",
    type: "rune",
    quality: "gold",
    icon: "images/items/star_crystal.svg",
    stats: { agi: 15, dodge: 4 },
    desc: "凝结极地寒霜的轻盈符文石，铭刻可增加 15 点敏捷身法与 4% 闪避几率。"
  },
  rune_lo: {
    id: "rune_lo",
    name: "圣光符文·罗",
    title: "光辉誓约",
    type: "rune",
    quality: "gold",
    icon: "images/items/star_crystal.svg",
    stats: { con: 20, hp: 300 },
    desc: "沐浴圣堂圣光洗礼的生命石，铭刻可增加 20 点体魄耐力与 300 点生命上限。"
  },
  rune_jah: {
    id: "rune_jah",
    name: "暗影符文·乔",
    title: "深渊幽暗",
    type: "rune",
    quality: "darkgold",
    icon: "images/items/star_crystal.svg",
    stats: { crit: 6, critDmg: 15 },
    desc: "流淌幽冥深渊暗影的禁忌符文，铭刻可增加 6% 暴击率与 15% 暴击伤害。"
  },
  rune_cham: {
    id: "rune_cham",
    name: "泰坦符文·查姆",
    title: "山岳铁壁",
    type: "rune",
    quality: "darkgold",
    icon: "images/items/star_crystal.svg",
    stats: { def: 35, dmgReduce: 4 },
    desc: "蕴藏远古泰坦巨人之力的坚实重石，铭刻可增加 35 点防御力与 4% 伤害免伤。"
  },
  rune_ith: {
    id: "rune_ith",
    name: "逐风符文·伊司",
    title: "狂风迅影",
    type: "rune",
    quality: "gold",
    icon: "images/items/star_crystal.svg",
    stats: { speed: 20, agi: 12 },
    desc: "受风暴精灵赐福的飞羽符文，铭刻可暴增 20 点行动速度与 12 点敏捷身法。"
  },
  rune_ber: {
    id: "rune_ber",
    name: "神圣符文·贝",
    title: "创世冠冕",
    type: "rune",
    quality: "purplegold",
    icon: "images/items/star_crystal.svg",
    stats: { allStats: 15, dmgBoost: 8 },
    desc: "传世紫金创世符文石，铭刻可增加全四维属性各 15 点，并提升 8% 最终造成伤害。"
  }
};

export const RUNIC_WORDS = [
  {
    id: "oath",
    name: "【符文之语】誓约 (Oath)",
    runes: ["rune_sol", "rune_cham"],
    validSlots: ["weapon", "armor"],
    minSockets: 2,
    bonus: { atk: 50, armorPierce: 18 },
    desc: "以炽炎与泰坦神力铸成坚不可摧的古老誓约。攻击力提升 50 点，无视目标 18% 护甲抗性。"
  },
  {
    id: "redemption",
    name: "【符文之语】救赎 (Redemption)",
    runes: ["rune_lo", "rune_el"],
    validSlots: ["gloves", "armor", "ring"],
    minSockets: 2,
    bonus: { hp: 800, healChance: 25, healAmount: 300 },
    desc: "圣光与奥术交融的恩泽庇护。生命值暴涨 800 点，受击时有 25% 几率自愈 300 点生命。"
  },
  {
    id: "doom",
    name: "【符文之语】末日浩劫 (Doom)",
    runes: ["rune_jah", "rune_sol", "rune_cham"],
    validSlots: ["weapon"],
    minSockets: 3,
    bonus: { atk: 100, crit: 15, critDmg: 35 },
    desc: "暗影、烈焰与泰坦巨力的终极毁灭形态。攻击力提升 100 点，暴击率提升 15%，暴击伤害提升 35%！"
  },
  {
    id: "lionheart",
    name: "【符文之语】狮心守护 (Lionheart)",
    runes: ["rune_cham", "rune_lo"],
    validSlots: ["armor", "gloves", "helmet"],
    minSockets: 2,
    bonus: { def: 80, dmgReduce: 12 },
    desc: "泰坦金汤与圣光壁垒铸造。防御力暴增 80 点，常驻最终伤害减免 12%。"
  },
  {
    id: "aurora",
    name: "【符文之语】极光之语 (Aurora)",
    runes: ["rune_dol", "rune_el"],
    validSlots: ["weapon", "armor"],
    minSockets: 2,
    bonus: { atk: 65, dodge: 10 },
    desc: "霜魄寒霜与远古奥术交织的光辉。魔法伤害增加 65 点，闪避率提升 10%。"
  },
  {
    id: "hermes",
    name: "【符文之语】信使之捷 (Hermes)",
    runes: ["rune_ith", "rune_lo"],
    validSlots: ["boots", "cloak"],
    minSockets: 2,
    bonus: { speed: 35, firstStrikeCrit: 20 },
    desc: "风之信使的疾风祝福。速度身法暴增 35 点，首回合暴击率提升 20%。"
  },
  {
    id: "divine_wrath",
    name: "【符文之语】天罚审判 (Divine Wrath)",
    runes: ["rune_ber", "rune_jah", "rune_sol"],
    validSlots: ["weapon", "gloves"],
    minSockets: 3,
    bonus: { atk: 80, allStats: 30, smiteChance: 20 },
    desc: "远古诸神的终极天谴神罚。全四维潜能 +30，攻击时有 20% 概率降下神圣天罚造成巨额伤害。"
  }
];

export function checkRunicWord(slotKey, runeIds) {
  if (!Array.isArray(runeIds) || runeIds.length < 2) return null;
  for (const rw of RUNIC_WORDS) {
    if (rw.validSlots && !rw.validSlots.includes(slotKey)) continue;
    if (rw.runes.length !== runeIds.length) continue;
    let match = true;
    for (let i = 0; i < rw.runes.length; i++) {
      if (rw.runes[i] !== runeIds[i]) {
        match = false;
        break;
      }
    }
    if (match) return rw;
  }
  return null;
}
