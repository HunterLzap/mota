// 100层魔塔探险与守护Boss配置
export const LANDMARK_BOSSES = {
  10: {
    name: '【关底领主】远古巨石魔像',
    title: '试炼守关者',
    avatar: 'boss_golem',
    icon: 'boss_golem',
    hp: 2200,
    mp: 100,
    atk: 130,
    def: 95,
    speed: 12,
    crit: 5,
    dodge: 0,
    skills: ['岩石重砸', '坚如磐石'],
    dialogue: '卑微的凡人骑士，你的利刃无法撼动万年岩石！',
    firstClearReward: { exp: 1200, gold: 3000, crystal: 50, item: 'courage_sword' }
  },
  20: {
    name: '【关底领主】双头毒风飞龙',
    title: '空域噩梦',
    avatar: 'boss_wyvern',
    icon: 'boss_wyvern',
    hp: 4800,
    mp: 200,
    atk: 220,
    def: 140,
    speed: 28,
    crit: 16,
    dodge: 12,
    skills: ['剧毒风暴', '龙翼强袭'],
    dialogue: '在空中，你的铠甲不过是沉重的铁棺材！',
    firstClearReward: { exp: 3500, gold: 8000, crystal: 120, item: 'courage_armor' }
  },
  25: {
    name: '【守关领主】深渊死灵巫妖·卡萨斯',
    title: '死灵大法尊',
    avatar: 'boss_darkangel',
    icon: 'boss_darkangel',
    hp: 6800,
    mp: 300,
    atk: 290,
    def: 175,
    speed: 32,
    crit: 16,
    dodge: 12,
    skills: ['死亡凋零', '骨牢禁锢'],
    dialogue: '深渊的死寂，将成为你永远的归宿！',
    firstClearReward: { exp: 5500, gold: 12000, crystal: 180, item: 'rune_sol' }
  },
  30: {
    name: '【关底领主】深渊骨龙·萨拉克斯',
    title: '亡灵龙君',
    avatar: 'boss_bonedragon',
    icon: 'boss_bonedragon',
    hp: 9500,
    mp: 350,
    atk: 360,
    def: 210,
    speed: 24,
    crit: 18,
    dodge: 10,
    skills: ['死灵龙息', '白骨牢笼'],
    dialogue: '生命终将熄灭，唯有骨骸与幽冥永存……臣服吧！',
    firstClearReward: { exp: 8000, gold: 18000, crystal: 250, item: 'courage_shield' }
  },
  35: {
    name: '【守关领主】炼狱狂暴巨魔·古尔丹',
    title: '狂怒碎骨者',
    avatar: 'boss_golem',
    icon: 'boss_golem',
    hp: 13500,
    mp: 400,
    atk: 460,
    def: 260,
    speed: 26,
    crit: 20,
    dodge: 8,
    skills: ['碎地重砸', '狂暴嗜血'],
    dialogue: '俺要用你的骨头熬汤，凡人！',
    firstClearReward: { exp: 12000, gold: 26000, crystal: 360, item: 'rune_cham' }
  },
  40: {
    name: '【关底领主】炼狱炎魔·拉格纳',
    title: '熔火暴君',
    avatar: 'boss_balrog',
    icon: 'boss_balrog',
    hp: 18000,
    mp: 500,
    atk: 580,
    def: 320,
    speed: 30,
    crit: 22,
    dodge: 8,
    skills: ['地狱烈焰', '熔岩裂地斩'],
    dialogue: '你的意志将在千万度的熔岩中融化为灰烬！',
    firstClearReward: { exp: 16000, gold: 35000, crystal: 500, item: 'n_heart_ruby' }
  },
  50: {
    name: '【关底领主】远古九头蛇海德拉',
    title: '万毒之祖',
    avatar: 'boss_hydra',
    icon: 'boss_hydra',
    hp: 32000,
    mp: 800,
    atk: 880,
    def: 450,
    speed: 38,
    crit: 25,
    dodge: 15,
    skills: ['万蛇毒窟', '断首重生'],
    dialogue: '砍掉一个头，长出两个头！凡人，你拿什么胜我？',
    firstClearReward: { exp: 32000, gold: 70000, crystal: 1000, item: 'destiny_staff' }
  },
  60: {
    name: '【关底领主】虚空噬魂魔君',
    title: '虚空主宰',
    avatar: 'boss_void',
    icon: 'boss_void',
    hp: 55000,
    mp: 1200,
    atk: 1350,
    def: 620,
    speed: 45,
    crit: 28,
    dodge: 20,
    skills: ['虚空湮灭', '心智剥夺'],
    dialogue: '现实只是一场脆弱的梦境，而我，是终结一切的虚无！',
    firstClearReward: { exp: 60000, gold: 120000, crystal: 1800, item: 'destiny_robe' }
  },
  70: {
    name: '【关底领主】堕落炽天使·路西尔',
    title: '漆黑圣剑',
    avatar: 'boss_darkangel',
    icon: 'boss_darkangel',
    hp: 92000,
    mp: 1800,
    atk: 1950,
    def: 880,
    speed: 52,
    crit: 32,
    dodge: 22,
    skills: ['堕落圣裁', '暗夜悲歌'],
    dialogue: '圣光背叛了我，现在轮到我来审判整个大陆！',
    firstClearReward: { exp: 110000, gold: 200000, crystal: 3000, item: 'destiny_ring' }
  },
  80: {
    name: '【关底领主】泰坦巨神之影',
    title: '远古泰坦遗影',
    avatar: 'boss_titan',
    icon: 'boss_titan',
    hp: 145000,
    mp: 2500,
    atk: 2800,
    def: 1250,
    speed: 48,
    crit: 35,
    dodge: 15,
    skills: ['泰坦神雷', '天崩地裂'],
    dialogue: '蝼蚁在神明的脚下，唯有被碾碎一途！',
    firstClearReward: { exp: 180000, gold: 350000, crystal: 5000, item: 'dragon_slayer_blade' }
  },
  90: {
    name: '【关底领主】灭世红莲魔龙·伊格尼斯',
    title: '灭世之火',
    avatar: 'boss_reddragon',
    icon: 'boss_reddragon',
    hp: 230000,
    mp: 3500,
    atk: 4100,
    def: 1750,
    speed: 62,
    crit: 40,
    dodge: 25,
    skills: ['巨龙怒啸', '红莲烈焰'],
    dialogue: '吼！！！在巨龙的烈焰面前，整个王国都将被焚为焦土！',
    firstClearReward: { exp: 280000, gold: 600000, crystal: 8000, item: 'dragon_slayer_plate' }
  },
  100: {
    name: '【魔塔最终主宰】黑翼龙皇·奥斯汀',
    title: '永恒龙神',
    avatar: 'boss_dragonking',
    icon: 'boss_dragonking',
    hp: 400000,
    mp: 6000,
    atk: 6200,
    def: 2600,
    speed: 75,
    crit: 45,
    dodge: 30,
    skills: ['永恒龙威', '灭世终焉', '时空禁锢'],
    dialogue: '一万年了……终于有凡人走到了我的王座之前！拔剑吧，最后的救世主！',
    firstClearReward: { exp: 800000, gold: 2000000, crystal: 30000, item: 'dragon_slayer_shield' }
  }
};

const MONSTER_PREFIXES = ['游荡的', '凶残的', '嗜血的', '远古的', '深渊的', '被诅咒的', '魔化'];
const MONSTER_TYPES = [
  { name: '哥布林斥候', icon: 'monster_goblin', role: 'dex' },
  { name: '骷髅剑士', icon: 'monster_skeleton', role: 'str' },
  { name: '石像鬼守卫', icon: 'monster_gargoyle', role: 'con' },
  { name: '暗影巫师', icon: 'monster_mage', role: 'int' },
  { name: '狂暴巨魔', icon: 'monster_troll', role: 'str' },
  { name: '吸血巨蝠', icon: 'monster_bat', role: 'dex' },
  { name: '炼狱恶犬', icon: 'monster_hound', role: 'str' },
  { name: '深渊魔蛛', icon: 'monster_spider', role: 'dex' }
];

// 获取指定层数魔塔的怪物数据
export function getTowerFloorData(floor) {
  if (LANDMARK_BOSSES[floor]) {
    const boss = LANDMARK_BOSSES[floor];
    return {
      floor,
      isBoss: true,
      name: boss.name,
      title: boss.title,
      icon: boss.icon,
      hp: boss.hp,
      maxHp: boss.hp,
      mp: boss.mp,
      maxMp: boss.mp,
      atk: boss.atk,
      def: boss.def,
      speed: boss.speed,
      crit: boss.crit,
      dodge: boss.dodge,
      dialogue: boss.dialogue,
      expReward: boss.firstClearReward.exp,
      goldReward: boss.firstClearReward.gold,
      crystalReward: boss.firstClearReward.crystal,
      firstClearReward: boss.firstClearReward
    };
  }

  // 普通层数算法生成
  const prefix = MONSTER_PREFIXES[(floor * 3) % MONSTER_PREFIXES.length];
  const typeObj = MONSTER_TYPES[(floor * 7) % MONSTER_TYPES.length];
  const name = `${prefix}${typeObj.name}`;

  // 随层数平滑提升数值
  const hp = Math.floor(180 * Math.pow(floor, 1.45) + 120);
  const atk = Math.floor(25 * Math.pow(floor, 1.15) + 20);
  const def = Math.floor(15 * Math.pow(floor, 1.12) + 12);
  const speed = Math.min(80, Math.floor(12 + floor * 0.55));
  const expReward = Math.floor(60 * Math.pow(floor, 1.25) + 30);
  const goldReward = Math.floor(45 * Math.pow(floor, 1.2) + 25);
  const crystalReward = Math.floor(floor * 0.8 + 2);

  return {
    floor,
    isBoss: false,
    name: `第${floor}层守卫：${name}`,
    title: `魔塔哨兵`,
    icon: typeObj.icon,
    hp,
    maxHp: hp,
    mp: 50 + floor * 5,
    maxMp: 50 + floor * 5,
    atk,
    def,
    speed,
    crit: Math.min(30, 5 + Math.floor(floor * 0.25)),
    dodge: Math.min(25, 4 + Math.floor(floor * 0.2)),
    expReward,
    goldReward,
    crystalReward
  };
}
