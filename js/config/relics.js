// 《魔塔世界》远古神圣圣遗物体系 (Ancient Holy Relics System)
// 纯正西方高魔设定，恪守零 Emoji 铁律，各圣遗物绑定魔塔 50~100 层终焉破界成就

export const HOLY_RELICS = [
  {
    id: 'relic_longinus',
    name: '朗基努斯命运圣枪',
    title: '神圣裁决',
    icon: 'relic_spear',
    unlockFloor: 50,
    quality: 'purplegold',
    lore: '自远古神魔大战遗落的弑神之枪，枪尖闪耀着洞穿一切幽冥黑暗的神圣金光。',
    stats: {
      atk: 150,
      crit: 8,
      critDmg: 20
    },
    passiveName: '神圣破晓',
    passiveDesc: '暴击时有 30% 几率降下神圣裁决，附加目标当前生命值 5% 的真实神圣伤害（上限 1500 点）。'
  },
  {
    id: 'relic_avalon',
    name: '阿瓦隆湖中仙子圣鞘',
    title: '永恒庇护',
    icon: 'relic_scabbard',
    unlockFloor: 60,
    quality: 'purplegold',
    lore: '阿瓦隆圣湖仙子以世界初生晨露与星辰秘银编织的圣鞘，佩戴者不流血、不衰亡。',
    stats: {
      hp: 2000,
      def: 140,
      dmgResist: 10
    },
    passiveName: '永恒守护',
    passiveDesc: '受到最终伤害减免 10%。生命值跌破 25% 时唤醒仙子结界，免疫致死并立即自愈恢复 35% 最大生命（每场限 1 次）。'
  },
  {
    id: 'relic_prometheus',
    name: '普罗米修斯不灭火种',
    title: '原初烈焰',
    icon: 'relic_flame',
    unlockFloor: 70,
    quality: 'purplegold',
    lore: '远古泰坦神明自奥林匹斯圣坛窃取的原初天火，永不熄灭，燃尽一切深渊污秽。',
    stats: {
      str: 30,
      dex: 30,
      int: 30,
      con: 30,
      allSkillLv: 2
    },
    passiveName: '不灭原初',
    passiveDesc: '造成的全部伤害永久提升 15%，每次普通攻击使目标陷入红莲灼烧，每回合受到 250 点火焰真伤。'
  },
  {
    id: 'relic_solomon',
    name: '所罗门统御封魔印戒',
    title: '魔神号令',
    icon: 'relic_ring',
    unlockFloor: 80,
    quality: 'purplegold',
    lore: '镌刻七十二柱深渊魔神真名符印的统御金戒，释放神威即可震慑一切深渊主宰。',
    stats: {
      mp: 1000,
      speed: 40,
      crit: 10
    },
    passiveName: '统御万象',
    passiveDesc: '战斗开局压制敌方首领，使其先手速度降低 20%、攻击力降低 15%（持续 3 回合），且出战神兽伤害提升 30%。'
  },
  {
    id: 'relic_mjolnir',
    name: '雷神之锤·米约尔尼尔遗片',
    title: '风暴神罚',
    icon: 'relic_hammer',
    unlockFloor: 90,
    quality: 'purplegold',
    lore: '矮人神匠采撷垂死恒星核心锻造的风暴战锤残片，挥动之间引动九天雷霆灭世。',
    stats: {
      atk: 260,
      crit: 12,
      critDmg: 40
    },
    passiveName: '风暴雷霆',
    passiveDesc: '暴击伤害提升 40%，攻击命中时有 25% 几率触发雷霆风暴，使目标陷入麻痹无法行动一回合。'
  },
  {
    id: 'relic_yggdrasil',
    name: '世界树·尤克特拉希尔终焉之果',
    title: '创世神格',
    icon: 'relic_tree',
    unlockFloor: 100,
    quality: 'purplegold',
    lore: '承载九大世界与宇宙洪荒的世界之树终极神果，蕴含创生与寂灭的至高神性。',
    stats: {
      str: 60,
      dex: 60,
      int: 60,
      con: 60,
      hp: 5000,
      dmgResist: 15
    },
    passiveName: '创世神格',
    passiveDesc: '获得创世神格光环：受到的全部伤害降低 15%，每回合开始自愈恢复 8% 最大生命值，并免疫一切减益控制。'
  }
];

/**
 * 根据达到的魔塔最高层数，获取已解锁的圣遗物
 */
export function getUnlockedRelics(maxFloor = 1) {
  return HOLY_RELICS.filter(r => maxFloor >= r.unlockFloor);
}

/**
 * 依据圣遗物 ID 列表计算属性累加值
 */
export function getRelicsTotalStats(relicIds = []) {
  const total = {
    hp: 0,
    mp: 0,
    atk: 0,
    def: 0,
    speed: 0,
    crit: 0,
    critDmg: 0,
    dmgResist: 0,
    allSkillLv: 0,
    str: 0,
    dex: 0,
    int: 0,
    con: 0
  };

  const idSet = new Set(relicIds);
  for (const relic of HOLY_RELICS) {
    if (idSet.has(relic.id)) {
      for (const [k, v] of Object.entries(relic.stats)) {
        if (total[k] !== undefined) {
          total[k] += v;
        } else {
          total[k] = v;
        }
      }
    }
  }

  return total;
}

/**
 * 根据 ID 获取遗物配置
 */
export function getRelicById(relicId) {
  return HOLY_RELICS.find(r => r.id === relicId) || null;
}
