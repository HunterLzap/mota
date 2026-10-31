// 三大阵营边境要塞争夺战配置 (Three Nations Frontier Wars)
// 纯正西方高魔题材、零 Emoji、100% 矢量 SVG 图标

export const MILITARY_RANKS = [
  {
    id: "recruit",
    name: "远征新兵",
    reqMerit: 0,
    dailySalary: 800,
    buffDesc: "生命值 +150",
    stats: { hp: 150 }
  },
  {
    id: "scout",
    name: "边境游侠斥候",
    reqMerit: 150,
    dailySalary: 1800,
    buffDesc: "攻击力 +30，身法速度 +15",
    stats: { atk: 30, speed: 15 }
  },
  {
    id: "centurion",
    name: "圣堂百夫长",
    reqMerit: 500,
    dailySalary: 3500,
    buffDesc: "攻击力 +65，防御力 +40，生命 +500",
    stats: { atk: 65, def: 40, hp: 500 }
  },
  {
    id: "commander",
    name: "要塞十字军统领",
    reqMerit: 1200,
    dailySalary: 7500,
    buffDesc: "攻击力 +120，防御力 +80，暴击率 +8%",
    stats: { atk: 120, def: 80, crit: 8 }
  },
  {
    id: "marshal",
    name: "帝国护国大元帅",
    reqMerit: 3000,
    dailySalary: 18000,
    buffDesc: "全四维潜能 +35，攻击力 +180，最终免伤 +12%",
    stats: { allStats: 35, atk: 180, dmgReduce: 12 }
  }
];

export const STRONGHOLDS = [
  {
    id: "silverwing",
    name: "银翼狮鹫要塞",
    title: "圣朝平原要冲",
    icon: "images/ui/nation_aden.svg",
    reqLevel: 20,
    defender: {
      name: "【敌对阵营统帅】银翼守护圣骑士",
      title: "白金近卫长",
      hp: 8500,
      atk: 280,
      def: 190,
      speed: 32,
      crit: 16,
      dodge: 10
    },
    meritReward: 120,
    goldReward: 6000,
    desc: "扼守大陆富庶平原的要冲堡垒，城楼雕刻着展翅战鹰与狮鹫图腾，兵家必争之地。"
  },
  {
    id: "blackiron",
    name: "黑铁熔炉要塞",
    title: "火山矿脉咽喉",
    icon: "images/ui/nation_kester.svg",
    reqLevel: 35,
    defender: {
      name: "【敌对阵营统帅】黑铁重装狂战领主",
      title: "熔岩锻造者",
      hp: 19500,
      atk: 520,
      def: 350,
      speed: 30,
      crit: 20,
      dodge: 8
    },
    meritReward: 260,
    goldReward: 15000,
    desc: "建立在黑铁火山口之上的坚固雄关，地热熔炉日夜锻打出全大陆最为坚韧的神钢战甲。"
  },
  {
    id: "moonshadow",
    name: "月影暗夜哨塔",
    title: "极北深渊前线",
    icon: "images/ui/nation_sagael.svg",
    reqLevel: 45,
    defender: {
      name: "【敌对阵营统帅】月影幽暗大法皇",
      title: "群星观测者",
      hp: 36000,
      atk: 860,
      def: 450,
      speed: 46,
      crit: 26,
      dodge: 18
    },
    meritReward: 500,
    goldReward: 30000,
    desc: "极北冻土与幽冥裂隙接壤处的宏伟法师哨塔，常年被冷冽极光与奥术护盾环绕。"
  }
];

export const FACTION_REWARDS = [
  {
    id: "rw_box",
    name: "远古神铸符文宝匣",
    costMerit: 150,
    type: "box",
    quality: "darkgold",
    icon: "images/items/star_crystal.svg",
    desc: "兑换时直接从全部8种远古符文中随机获得1枚，立即收入行囊。"
  },
  {
    id: "key_mithril",
    name: "深渊秘银钥匙",
    costMerit: 100,
    type: "key",
    quality: "darkgold",
    icon: "images/items/key_mithril.svg",
    desc: "直达魔塔 20 层开启深渊探险！"
  },
  {
    id: "key_obsidian",
    name: "深渊黑曜石钥匙",
    costMerit: 260,
    type: "key",
    quality: "purplegold",
    icon: "images/items/key_obsidian.svg",
    desc: "直达魔塔 35 层突破极限决战！"
  },
  {
    id: "destiny_stone",
    name: "天命觉醒神石",
    costMerit: 450,
    type: "material",
    quality: "purplegold",
    icon: "images/items/destiny_stone.svg",
    desc: "神兽觉醒为紫金传奇圣兽不可或缺的传世圣物！"
  }
];
