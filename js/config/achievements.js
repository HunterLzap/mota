// 称号 / 成就墙配置（P0）：聚合转职封号 / 军衔荣耀 / 图鉴收集 / 远征探索。
// 口径：纯展示 + 一次性小额金币/声望奖励，不加永久战斗属性；按用户要求不含「竞技段位」。
export const ACHIEVEMENT_CATEGORIES = [
  { id: 'career', label: '转职封号' },
  { id: 'rank', label: '军衔荣耀' },
  { id: 'codex', label: '图鉴收集' },
  { id: 'explore', label: '远征探索' }
];

// condition.kind:
//  promotion(转职阶位 completedStage) | militaryRank(军衔下标) | setCodex(已收集套装数)
//  petCodex(已拥有神兽数) | towerFloor(古堡最高层) | wildWins(野外胜场) | dungeonClears(已通关古门数) | dragonClears(已讨伐龙种数)
export const ACHIEVEMENTS = [
  // —— 转职封号（7 阶；title 为称号奖励）——
  { id: 'career_1', category: 'career', name: '初入试炼', desc: '完成第 1 阶皇家试炼，踏上英雄之路。', condition: { kind: 'promotion', value: 1 }, reward: { gold: 600, prestige: 20 } },
  { id: 'career_2', category: 'career', name: '锋芒初露', desc: '完成第 2 阶皇家试炼。', condition: { kind: 'promotion', value: 2 }, reward: { gold: 900, prestige: 30 } },
  { id: 'career_3', category: 'career', name: '威名远播', desc: '完成第 3 阶皇家试炼。', condition: { kind: 'promotion', value: 3 }, reward: { gold: 1300, prestige: 45 } },
  { id: 'career_4', category: 'career', name: '皇家之刃', desc: '完成第 4 阶皇家试炼。', condition: { kind: 'promotion', value: 4 }, reward: { gold: 1800, prestige: 60 } },
  { id: 'career_5', category: 'career', name: '圣辉加身', desc: '完成第 5 阶皇家试炼。', condition: { kind: 'promotion', value: 5 }, reward: { gold: 2400, prestige: 80 } },
  { id: 'career_6', category: 'career', name: '神域征途', desc: '完成第 6 阶皇家试炼。', condition: { kind: 'promotion', value: 6 }, reward: { gold: 3000, prestige: 100 } },
  { id: 'career_7', category: 'career', name: '绝地传奇', desc: '完成全部 7 阶皇家试炼，登临绝地。', condition: { kind: 'promotion', value: 7 }, reward: { gold: 4000, prestige: 150 }, title: '绝地传奇' },

  // —— 军衔荣耀（对应 MILITARY_RANKS 下标 1..4）——
  { id: 'rank_scout', category: 'rank', name: '边境斥候', desc: '军衔晋升至边境游侠斥候。', condition: { kind: 'militaryRank', value: 1 }, reward: { gold: 800, prestige: 30 } },
  { id: 'rank_centurion', category: 'rank', name: '圣堂百夫长', desc: '军衔晋升至圣堂百夫长。', condition: { kind: 'militaryRank', value: 2 }, reward: { gold: 1500, prestige: 50 } },
  { id: 'rank_commander', category: 'rank', name: '要塞统领', desc: '军衔晋升至要塞十字军统领。', condition: { kind: 'militaryRank', value: 3 }, reward: { gold: 2500, prestige: 80 } },
  { id: 'rank_marshal', category: 'rank', name: '护国大元帅', desc: '军衔晋升至帝国护国大元帅。', condition: { kind: 'militaryRank', value: 4 }, reward: { gold: 4000, prestige: 120 }, title: '帝国元帅' },

  // —— 图鉴收集 ——
  { id: 'codex_sets_1', category: 'codex', name: '神装初藏', desc: '收集到 1 套远古套装（任一部件）。', condition: { kind: 'setCodex', value: 1 }, reward: { gold: 500, prestige: 15 } },
  { id: 'codex_sets_5', category: 'codex', name: '套装收藏家', desc: '收集到 5 套远古套装。', condition: { kind: 'setCodex', value: 5 }, reward: { gold: 1500, prestige: 40 } },
  { id: 'codex_sets_10', category: 'codex', name: '神装博览', desc: '收集到 10 套远古套装。', condition: { kind: 'setCodex', value: 10 }, reward: { gold: 2800, prestige: 80 } },
  { id: 'codex_sets_17', category: 'codex', name: '万套归宗', desc: '收集到全部 17 套远古套装。', condition: { kind: 'setCodex', value: 17 }, reward: { gold: 6000, prestige: 180 }, title: '万套归宗' },
  { id: 'codex_pets_5', category: 'codex', name: '伙伴成群', desc: '契约 5 位神兽伙伴。', condition: { kind: 'petCodex', value: 5 }, reward: { gold: 1200, prestige: 30 } },
  { id: 'codex_pets_10', category: 'codex', name: '万兽之主', desc: '契约 10 位神兽伙伴。', condition: { kind: 'petCodex', value: 10 }, reward: { gold: 2600, prestige: 70 } },
  { id: 'codex_pets_22', category: 'codex', name: '神兽全录', desc: '契约全部 22 位神兽伙伴。', condition: { kind: 'petCodex', value: 22 }, reward: { gold: 6000, prestige: 180 }, title: '万兽之主' },

  // —— 远征探索 ——
  { id: 'explore_tower_50', category: 'explore', name: '古堡探秘', desc: '古堡探险抵达第 50 层。', condition: { kind: 'towerFloor', value: 50 }, reward: { gold: 1500, prestige: 40 } },
  { id: 'explore_tower_100', category: 'explore', name: '登临高塔', desc: '古堡探险抵达第 100 层。', condition: { kind: 'towerFloor', value: 100 }, reward: { gold: 4000, prestige: 120 }, title: '登临高塔' },
  { id: 'explore_wild_50', category: 'explore', name: '荒野猎人', desc: '野外讨伐胜利 50 场。', condition: { kind: 'wildWins', value: 50 }, reward: { gold: 800, prestige: 25 } },
  { id: 'explore_wild_200', category: 'explore', name: '百战不殆', desc: '野外讨伐胜利 200 场。', condition: { kind: 'wildWins', value: 200 }, reward: { gold: 2200, prestige: 60 } },
  { id: 'explore_dungeon_3', category: 'explore', name: '古门行者', desc: '通关 3 座古门。', condition: { kind: 'dungeonClears', value: 3 }, reward: { gold: 1800, prestige: 50 } },
  { id: 'explore_dungeon_7', category: 'explore', name: '七门尽破', desc: '通关全部 7 座古门。', condition: { kind: 'dungeonClears', value: 7 }, reward: { gold: 3800, prestige: 110 }, title: '七门尽破' },
  { id: 'explore_dragon_1', category: 'explore', name: '屠龙勇士', desc: '讨伐 1 种远古巨龙。', condition: { kind: 'dragonClears', value: 1 }, reward: { gold: 1500, prestige: 40 } },
  { id: 'explore_dragon_3', category: 'explore', name: '群龙俯首', desc: '讨伐 3 种远古巨龙。', condition: { kind: 'dragonClears', value: 3 }, reward: { gold: 4000, prestige: 120 }, title: '群龙俯首' }
];
