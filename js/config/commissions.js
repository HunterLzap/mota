import { NATIONS } from './classes.js';
import { SPECIAL_ITEMS, specializeEquipment } from './items.js';

// The first four entries have period name/level leads. Objectives, dialogue,
// amounts and the later journey are single-player adaptations; see the audit.
const darkgoldEgg = { ...SPECIAL_ITEMS.pet_egg, id: 'pet_egg_darkgold', name: '暗金神兽契约蛋', type: 'egg', quality: 'darkgold', count: 1 };
export const COMMISSIONS = [
  {
    id: 'oath_token', group: 'story_side', title: '誓言的信物', minLevel: 19,
    speaker: '圣光主教艾莲娜',
    offer: '一支护送契约蛋的巡逻队在微光森林失散。狼王拖走了队长的银质徽记，那是他守护同行者的誓言。请击败暗夜狼王，将信物带回酒馆。',
    ending: '这枚徽记终于回到了幸存者手中。巡逻队将护送的暗金契约蛋托付给你，愿你善待未来的同行者。',
    requirement: { event: 'wild_boss', target: 'forest', count: 1, label: '击败微光森林的暗夜狼王，找回银质徽记' },
    rewards: { exp: 800, gold: 1200, crystal: 10, prestige: 20, items: [darkgoldEgg] }
  },
  {
    id: 'nation_guide', group: 'nation_guide', title: '国家指引', minLevel: 12,
    speaker: '城邦使者',
    offer: '苏醒者，城邦需要熟悉古道的盟友。到微光森林完成两次普通讨伐，确认通往王都的道路安全，再回大殿报告。',
    ending: '古道上的旅人可以安心启程了。这枚暗金契约蛋代表城邦对你的信任。',
    requirement: { event: 'wild', target: 'forest', count: 2, label: '完成微光森林普通讨伐' },
    rewards: { exp: 400, gold: 600, crystal: 5, prestige: 15, items: [darkgoldEgg] }
  },
  {
    id: 'tavern_road', group: 'tavern', title: '酒馆委托 · 古道护送', minLevel: 15,
    speaker: '酒馆掌柜',
    offer: '运送口粮的车队不敢穿过森林。先清理古道上的三群野兽，我们就能把补给送到营地。',
    ending: '车队已经抵达营地。这是护送报酬，还有给同行神兽准备的口粮。',
    requirement: { event: 'wild', target: 'forest', count: 3, label: '完成微光森林普通讨伐' },
    rewards: { exp: 500, gold: 900, crystal: 5, prestige: 10, items: [{ ...SPECIAL_ITEMS.pet_food, count: 3 }] }
  },
  {
    id: 'tavern_tower', group: 'tavern', title: '酒馆委托 · 塔中路标', minLevel: 15,
    speaker: '退役斥候',
    offer: '重现的魔塔改变了旧通道。进入魔塔并战胜任意一层守卫，记下新的路标，再回来把消息交给我。已有的旧记录不能代替这次侦察。',
    ending: '你的记录能让后来的探险者少走弯路。拿上这些钥匙与锻造材料，下次出发时用得上。',
    requirement: { event: 'tower', target: '*', count: 1, label: '在接取后战胜任意一层魔塔守卫' },
    rewards: { exp: 500, gold: 900, crystal: 5, prestige: 10, items: [{ ...SPECIAL_ITEMS.key_redwood, count: 2 }, { ...SPECIAL_ITEMS.star_crystal, count: 2 }] }
  },
  {
    id: 'patrol_letter', group: 'story_side', title: '未寄出的家书', minLevel: 25,
    speaker: '斥候米拉',
    offer: '获救的巡逻队员一直在找一封未寄出的家书。迷雾峡谷的商队见过那只邮袋。击退三批峡谷魔物，护送信使把邮袋带回酒馆；不用改变你的主线行程。',
    ending: '信中没有宝藏，只有“我会回来”。米拉将家书交给队员的家人，铁匠布兰愿为你缝制一件远行披风。锋行偏向输出，守望更适合抵御龙焰。',
    storyBeats: [
      '峡谷的第一处路障已经清除。信使在车辙旁认出邮袋上的蓝色封蜡，请继续护送他寻找散落的信件。',
      '信使找到了邮袋，家书却还少了一页。米拉认出纸上的观测站徽记：有人借商队运送星图拓片。',
      '最后一页家书已经找回。信使带着邮袋返回王都，米拉请你回酒馆交还家书，并选择远行披风。'
    ],
    requirement: { event: 'wild', target: 'canyon', count: 3, label: '完成迷雾低语峡谷普通讨伐，护送信使找回邮袋' },
    rewards: { exp: 1800, gold: 1800, crystal: 15, prestige: 20, items: [{ ...SPECIAL_ITEMS.pet_food, count: 2 }],
      equipmentChoices: [
        { id: 'letter_assault', name: '锋行·远行披风', slot: 'cloak', level: 25, quality: 'gold',
          stats: { atk: 45, str: 18, speed: 10, hp: 100 }, price: 900, desc: '远行锋线：攻击与职业主属性，适合尽快击破护盾。' },
        { id: 'letter_ward', name: '守望·远行披风', slot: 'cloak', level: 25, quality: 'gold',
          stats: { hp: 650, def: 55, magicResist: 8 }, price: 900, desc: '远行守望：生命、防御与8%魔抗；换装预览可比较实际取舍。' }
      ] }
  },
  {
    id: 'starmap_page', group: 'story_side', title: '星图的缺页', minLevel: 40, prerequisite: 'patrol_letter',
    speaker: '学者艾琳',
    offer: '家书邮袋里藏着一张旧观测站的拓片，恰好能补全女盗星图上的空白。前往龙眠荒原，击退三批魔物，护送勘测员辨认旧路。星图会指向极地，也会揭示黑焰祭坛的来历。',
    ending: '缺页重归星图：龙皇并非在守护王座，而是在利用裂隙吞噬归乡的道路。艾琳将一枚观测戒指交给你，选择追猎的锋芒，或铭记守望的符印。',
    storyBeats: [
      '勘测员在第一座废弃路标上找到与拓片一致的刻痕。旧观测站并未消失，只是被龙裔改作了哨所。',
      '第二处刻痕指向北方，黑焰车队却向南折返。艾琳怀疑星图记录的是裂隙的供能路线。',
      '第三处坐标补齐了缺页，北方道路与南方祭坛终于连成一线。带回酒馆交给艾琳，领取观测戒指。'
    ],
    requirement: { event: 'wild', target: 'wasteland', count: 3, label: '完成龙眠远古荒原普通讨伐，护送勘测员辨认旧路' },
    rewards: { exp: 4500, gold: 3500, crystal: 25, prestige: 40, items: [{ ...SPECIAL_ITEMS.star_crystal, count: 3 }],
      equipmentChoices: [
        { id: 'starmap_assault', name: '追猎星图戒指', slot: 'ring', level: 40, quality: 'gold',
          icon: 'images/items/eq_ring.svg', stats: { atk: 70, crit: 5 }, price: 1500, desc: '追猎星图：提高攻击与暴击，争取在首领蓄势前抢占优势。' },
        { id: 'starmap_ward', name: '守望星图戒指', slot: 'ring', level: 40, quality: 'gold',
          icon: 'images/items/eq_ring.svg', stats: { hp: 1200, def: 80, magicResist: 12 }, price: 1500, desc: '守望星图：12%魔抗与生存属性；不依赖随机掉落取得。' }
      ] }
  },
  {
    id: 'rift_lantern', group: 'story_side', title: '裂隙前的灯火', minLevel: 60, prerequisite: 'starmap_page',
    speaker: '守备官罗兰',
    offer: '星图让我们找到了黑焰运输线，但沼泽里的伤员仍在等待接应。击退三批沼泽魔物，替撤离队点亮三座路灯。活着回来的人，才是这次远征真正的报酬。',
    ending: '路灯依次亮起，米拉带着最后一队伤员走出毒雾。救回的记录揭示龙皇会在七成和三成半生命时蓄势龙息。控制和破魔能阻断施法，魔抗减轻龙息；命中后的黑焰引导压制回复20秒，还会抽取魔力、使魔力护盾过载。净化只免异常，不能解除首领引导。带上守夜装备、铁卫或法力吸收装备，也可支撑这段危险窗口；无需指定伙伴。',
    storyBeats: [
      '第一盏路灯亮起。伤员沿着灯火离开运输线，一名军医提醒你：黑焰会干扰生命回复，别只依赖治疗。',
      '第二盏路灯照出了烧毁的护符。艾琳辨认出魔力护盾过载的痕迹，建议准备魔抗与减伤，或打断引导。',
      '第三盏路灯已点亮，最后一队伤员安全撤离。回酒馆向罗兰报告，选择破晓或守夜项链，再决定自己的终战整备。'
    ],
    requirement: { event: 'wild', target: 'swamp', count: 3, label: '完成悲伤毒瘴沼泽普通讨伐，为撤离队点亮路灯' },
    rewards: { exp: 9000, gold: 6000, crystal: 40, prestige: 60, items: [{ ...SPECIAL_ITEMS.pet_food, count: 3 }],
      equipmentChoices: [
        { id: 'lantern_assault', name: '破晓行军项链', slot: 'necklace', level: 60, quality: 'darkgold',
          icon: 'images/items/eq_necklace.svg', stats: { atk: 100, speed: 20, crit: 8 }, price: 2200, desc: '破晓行军：攻击、速度和暴击，适合破盾与主动压制。' },
        { id: 'lantern_ward', name: '守夜行军项链', slot: 'necklace', level: 60, quality: 'darkgold',
          icon: 'images/items/eq_necklace.svg', stats: { hp: 1800, magicResist: 15, dmgResist: 4 }, price: 2200, desc: '守夜行军：15%魔抗与4%减伤，减轻龙息和普通受击。' }
      ] }
  }
];

export function getCommissionEquipment(config, choiceId, classId) {
  const chosen = config?.rewards.equipmentChoices?.find(item => item.id === choiceId);
  if (!chosen) return null;
  const item = specializeEquipment(chosen, classId);
  return { ...item, stats: { ...item.stats },
    stars: 0, reqLevel: chosen.reqLevel || chosen.level || 1, sockets: 0, gems: [], durability: 100, maxDurability: 100 };
}

export function getCommission(id, nation) {
  const config = COMMISSIONS.find(entry => entry.id === id);
  if (!config) return null;
  if (config.group !== 'nation_guide') return config;
  const country = NATIONS[nation] || NATIONS.aden;
  return { ...config, title: `${country.name.split(' ')[0]} · 国家指引`, offer: `${country.description}\n\n${config.offer}` };
}

export function validCommissionProgress(config, progress) {
  return Boolean(progress && typeof progress === 'object' && !Array.isArray(progress) &&
    ['active', 'ready', 'claimed'].includes(progress.status) &&
    Number.isSafeInteger(progress.current) && progress.current >= 0 && progress.current <= config.requirement.count &&
    (progress.status === 'active' ? progress.current < config.requirement.count : progress.current === config.requirement.count) &&
    (progress.choiceId === undefined || (progress.status === 'claimed' &&
      config.rewards.equipmentChoices?.some(item => item.id === progress.choiceId))));
}

export function normalizeCommissions(value) {
  return Object.fromEntries(COMMISSIONS.flatMap(config => {
    const progress = value?.[config.id];
    if (validCommissionProgress(config, progress)) return [[config.id, { status: progress.status, current: progress.current,
      ...(progress.choiceId === undefined ? {} : { choiceId: progress.choiceId }) }]];
    // A damaged claimed marker must never become a fresh source of rewards.
    return progress?.status === 'claimed' ? [[config.id, { status: 'claimed', current: config.requirement.count }]] : [];
  }));
}
