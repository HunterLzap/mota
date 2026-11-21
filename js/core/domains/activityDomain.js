import { ITEM_SLOTS, QUALITIES, SPECIAL_ITEMS, generateEquipment, specializeEquipment } from '../../config/items.js';
import { DRAGON_TRIALS } from '../../config/dragonSlaying.js';
import { ROYAL_TRIALS } from '../../config/trials.js';
import { ARENA_RANKS, ARENA_OPPONENTS, PRESTIGE_SHOP_ITEMS } from '../../config/arena.js';
import { TAVERN_BOUNTIES, TAVERN_DRINKS } from '../../config/tavern.js';
import { COMMISSIONS, getCommission, getCommissionEquipment } from '../../config/commissions.js';
import { RUNES } from '../../config/runes.js';
import { MILITARY_RANKS, STRONGHOLDS, FACTION_REWARDS } from '../../config/factionWar.js';
import { MAPS } from '../../config/maps.js';
import { ACTION_POINTS } from '../actionClock.js';

export function canClaimSalary(state) {
  return state.data.lastSalaryDay !== state.getActionDay();
}

export function claimSalary(state) {
  const day = state.getActionDay();
  if (state.data.lastSalaryDay === day) {
    return { success: false, msg: '本行动日俸禄已全额领受！完成更多行动进入下一行动日后可再度面圣领赏！' };
  }
  state.data.lastSalaryDay = day;
  state.gainCurrency(1500, 20, 0);
  state.triggerQuestAction('claim_salary');
  state.addSystemLog('【王宫】恭敬晋谒圣王，成功领受今日骑士俸禄：1,500 金币、20 魔晶！', 'estate');
  state.notify();
  return { success: true, msg: '恭敬晋谒圣王！成功领受今日王国俸禄：金币 +1500，魔晶 +20！' };
}

export function completeRoyalTrial(state, stage) {
  const current = state.data.royalTrials.completedStage || 0;
  const trial = ROYAL_TRIALS[stage];
  if (!Number.isInteger(stage) || stage !== current || !trial) return { success: false, msg: '试炼阶位已变化或已完成。' };
  if (state.data.level < trial.level || state.data.prestige < trial.fameReq) return { success: false, msg: '等级或声望尚未达到册封要求。' };
  state.data.royalTrials.completedStage = stage + 1;
  state.data.royalTrials.currentTitle = trial.title;
  state.data.title = trial.title;
  state.addExp(trial.level * 200);
  state.gainCurrency(trial.level * 100, 50, 0);
  state.reconcileQuestMilestones();
  state.triggerQuestAction('royal_trials', 1);
  state.addActionPoints(ACTION_POINTS.trial);
  state.notify();
  return { success: true, title: state.getPromotedClassName() };
}

export function startDragonChallenge(state, dragonId) {
  const dragon = DRAGON_TRIALS.find(item => item.id === dragonId);
  if (!dragon) return { success: false, msg: '未知的巨龙。' };
  if (state.data.level < dragon.minLevel) return { success: false, msg: `等级不足！需达到 Lv.${dragon.minLevel}` };
  if (state.data.dragon.activeChallenge) return { success: false, msg: '当前屠龙讨伐尚未结束。' };
  state.resetDailyActivities();
  if (!Number.isInteger(state.data.dragon.trialsLeft) || state.data.dragon.trialsLeft <= 0) return { success: false, msg: '本行动日屠龙讨伐次数已耗尽！进入下一行动日后再来。' };
  const challengeId = state.createDungeonExpeditionId();
  state.data.dragon.trialsLeft--;
  state.data.dragon.activeChallenge = { dragonId, challengeId };
  state.notify();
  return { success: true, dragon, challengeId };
}

export function settleDragonChallenge(state, dragonId, challengeId, victory) {
  const dragon = DRAGON_TRIALS.find(item => item.id === dragonId);
  const active = state.data.dragon.activeChallenge;
  if (!dragon || !challengeId || active?.challengeId !== challengeId || active.dragonId !== dragonId || typeof victory !== 'boolean') return { success: false, msg: '本次屠龙讨伐已结束或已变化。' };
  state.data.dragon.activeChallenge = null;
  if (!victory) { state.notify(); return { success: true, victory: false, drops: [] }; }
  const reward = dragon.rewards;
  // 每次胜利保底一件装备；三套金龙装备等概率，装备需求不高于准入等级。
  const setId = reward.equipmentSets[Math.floor(Math.random() * reward.equipmentSets.length)];
  const slot = ITEM_SLOTS[Math.floor(Math.random() * ITEM_SLOTS.length)].id;
  const gear = generateEquipment(slot, dragon.minLevel, reward.equipmentQuality, setId, state.data.classId);
  if (!Object.keys(gear.stats).length) gear.stats.hp = Math.floor((60 + dragon.minLevel * 18) * QUALITIES[reward.equipmentQuality].multiplier);
  const drops = [gear, { ...SPECIAL_ITEMS[reward.material], count: reward.materialCount }];
  if (reward.egg && Math.random() < reward.eggChance) drops.push({ ...SPECIAL_ITEMS.pet_egg, id: reward.egg, name: reward.egg === 'pet_egg_gold' ? '黄金宠物蛋' : '暗金宠物蛋', quality: reward.egg === 'pet_egg_gold' ? 'gold' : 'darkgold', type: 'egg', count: 1 });
  if (reward.extraMaterial && Math.random() < reward.extraChance) drops.push({ ...SPECIAL_ITEMS[reward.extraMaterial], count: 1 });
  drops.forEach(item => state.grantBattleLoot(item));
  const previousClears = Number.isSafeInteger(state.data.dragon.cleared[dragonId]) && state.data.dragon.cleared[dragonId] > 0 ? state.data.dragon.cleared[dragonId] : 0;
  const firstClear = previousClears === 0;
  state.data.dragon.cleared[dragonId] = previousClears + 1;
  const story = firstClear ? dragon.firstVictoryStory : dragon.repeatVictoryText;
  if (firstClear) state.addSystemLog(`【巨龙线索】${story}`, 'quest', false);
  state.addExp(dragon.minLevel * 250, false);
  state.gainCurrency(reward.gold, reward.crystal, reward.prestige, false);
  if (dragonId === 'slay_red_dragon') state.triggerQuestAction('slay_dragon', 1);
  if (dragonId === 'slay_silver_dragon') state.triggerQuestAction('slay_silver_dragon', 1);
  state.addActionPoints(ACTION_POINTS.dragon);
  state.notify();
  return { success: true, victory: true, firstClear, story, drops, exp: dragon.minLevel * 250, ...reward };
}

export function getFactionWarState(data) {
  return data.factionWar;
}

export function challengeStronghold(data, strongholdId) {
  const stronghold = STRONGHOLDS.find(s => s.id === strongholdId);
  if (!stronghold) return { success: false, msg: '未知的要塞据点！' };
  if (data.level < stronghold.reqLevel) {
    return { success: false, msg: `勇者等级未达 Lv.${stronghold.reqLevel}，无法进军该要塞！` };
  }
  return {
    success: true,
    stronghold,
    defender: stronghold.defender
  };
}

export function getTotalFactionMerit(data) {
  const faction = data.factionWar;
  const rankFloor = (MILITARY_RANKS.find(rank => rank.id === faction.militaryRank) || MILITARY_RANKS[0]).reqMerit;
  const valid = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  return Math.max(valid(faction.totalMerit), valid(faction.merit), rankFloor);
}

export function completeStrongholdVictory(state, strongholdId) {
  const stronghold = STRONGHOLDS.find(s => s.id === strongholdId);
  if (!stronghold) return { success: false, msg: '未知的要塞据点！' };

  const fw = state.data.factionWar;
  if (!fw.strongholds[strongholdId]) {
    fw.strongholds[strongholdId] = { captured: false, progress: 0 };
  }
  const strongholdRecord = fw.strongholds[strongholdId];
  if (strongholdRecord.captured) {
    const day = state.getActionDay();
    if (strongholdRecord.lastRepeatDay === day) {
      return { success: false, msg: '本行动日该要塞已再度破关，进入下一行动日后再来。' };
    }
    strongholdRecord.lastRepeatDay = day;
    const repeatGold = Math.floor(stronghold.goldReward * 0.2);
    state.data.gold += repeatGold;
    state.addSystemLog(`【边境巡防】再度攻破【${stronghold.name}】，本次为重复挑战：金币 +${repeatGold}，军勋不重复发放。`, 'battle');
    state.addActionPoints(ACTION_POINTS.stronghold);
    state.notify();
    return { success: true, merit: 0, gold: repeatGold, repeat: true, promoted: null };
  }
  strongholdRecord.captured = true;
  strongholdRecord.progress = 100;
  state.reconcileQuestMilestones();
  fw.totalMerit = state.getTotalFactionMerit() + stronghold.meritReward;
  fw.merit = (fw.merit || 0) + stronghold.meritReward;
  state.data.gold += stronghold.goldReward;

  let promoted = null;
  for (let i = MILITARY_RANKS.length - 1; i >= 0; i--) {
    const rank = MILITARY_RANKS[i];
    if (fw.totalMerit >= rank.reqMerit) {
      if (fw.militaryRank !== rank.id) {
        fw.militaryRank = rank.id;
        promoted = rank;
      }
      break;
    }
  }

  state.addSystemLog(`【边境大捷】成功攻克【${stronghold.name}】！缴获军饷 ${stronghold.goldReward} 金币，斩获帝国军勋 +${stronghold.meritReward}！`, 'battle');
  if (promoted) {
    state.addSystemLog(`【帝国嘉奖】军功赫赫！勇者阵营军衔荣升为【${promoted.name}】！`, 'quest');
  }
  state.addActionPoints(ACTION_POINTS.stronghold);
  state.notify();
  return { success: true, merit: stronghold.meritReward, gold: stronghold.goldReward, promoted };
}

export function claimFactionSalary(state) {
  const fw = state.data.factionWar;
  const today = new Date().toDateString();
  if (fw.lastResetDate !== today) {
    fw.dailyClaimed = false;
    fw.lastResetDate = today;
  }
  if (fw.dailyClaimed) {
    return { success: false, msg: '本行动日军饷已领受，进入下一行动日后请再临军需处！' };
  }
  const rankCfg = MILITARY_RANKS.find(r => r.id === fw.militaryRank) || MILITARY_RANKS[0];
  fw.dailyClaimed = true;
  state.data.gold += rankCfg.dailySalary;
  state.addSystemLog(`【军需处】领受【${rankCfg.name}】每日军饷：${rankCfg.dailySalary} 金币！`, 'obtain');
  state.notify();
  return { success: true, salary: rankCfg.dailySalary, rankName: rankCfg.name };
}

export function exchangeFactionReward(state, rewardId) {
  const reward = FACTION_REWARDS.find(r => r.id === rewardId);
  if (!reward) return { success: false, msg: '未知的军勋兑换品！' };
  const fw = state.data.factionWar;
  if ((fw.merit || 0) < reward.costMerit) {
    return { success: false, msg: `军勋不足！兑换需要 ${reward.costMerit} 军勋，当前拥有 ${fw.merit || 0} 军勋！` };
  }
  let item;
  if (reward.id === 'rw_box') {
    const runeKeys = ['rune_sol', 'rune_cham', 'rune_el', 'rune_lo', 'rune_jah', 'rune_ber', 'rune_dol', 'rune_ith'];
    const randomRuneId = runeKeys[Math.floor(Math.random() * runeKeys.length)];
    const runeCfg = RUNES[randomRuneId];
    item = {
      id: runeCfg.id,
      name: runeCfg.name,
      type: 'rune',
      quality: runeCfg.quality,
      icon: runeCfg.icon,
      desc: runeCfg.desc,
      stats: runeCfg.stats,
      count: 1
    };
  } else {
    const itemCfg = SPECIAL_ITEMS[reward.id] || { id: reward.id, name: reward.name, quality: reward.quality, icon: reward.icon, desc: reward.desc };
    item = {
      ...itemCfg,
      count: 1
    };
  }
  if (!state.addItemToBag(item)) return { success: false, msg: `行囊已满 (${state.data.bag.length}/${state.getBagCapacity()})，请先整理或扩容！` };
  fw.merit -= reward.costMerit;
  state.addSystemLog(`【军勋兑换】消耗 ${reward.costMerit} 军勋，获得【${item.name}】！`, 'obtain');
  state.notify();
  return { success: true, itemId: item.id, itemName: item.name, msg: `兑换成功！【${item.name}】已收入行囊！` };
}

export function getArenaRank(points) {
  let matched = ARENA_RANKS[0];
  for (const r of ARENA_RANKS) {
    if (points >= r.minPoints) {
      matched = r;
    }
  }
  return matched;
}

export function startArenaChallenge(state, opponentId) {
  const opponent = ARENA_OPPONENTS.find(item => item.id === opponentId);
  if (!opponent || !Number.isInteger(state.data.level) || state.data.level < 1 || state.data.level > 100) return { success: false, msg: '无效的对手或角色等级。' };
  state.resetDailyActivities();
  if (state.data.arena.activeChallenge) return { success: false, msg: '当前角斗挑战尚未结束。' };
  if (!Number.isInteger(state.data.arena.challengesLeft) || state.data.arena.challengesLeft <= 0) return { success: false, msg: '本行动日5次角斗挑战次数已耗尽。' };
  const challengeId = state.createDungeonExpeditionId();
  state.data.arena.challengesLeft--;
  state.data.arena.activeChallenge = { opponentId, challengeId };
  state.notify();
  return { success: true, opponent, challengeId };
}

export function settleArenaChallenge(state, opponentId, challengeId, victory) {
  state.resetDailyActivities();
  const opponent = ARENA_OPPONENTS.find(item => item.id === opponentId);
  const active = state.data.arena.activeChallenge;
  if (!opponent || !challengeId || active?.challengeId !== challengeId || active.opponentId !== opponentId || typeof victory !== 'boolean') return { success: false, msg: '本次角斗挑战已结束或已变化。' };
  const previousPoints = state.data.arena.points;
  if (!Number.isSafeInteger(previousPoints) || previousPoints < 1000) return { success: false, msg: '角斗积分记录异常。' };
  state.data.arena.activeChallenge = null;
  state.data.arena.points = victory ? previousPoints + 25 : Math.max(1000, previousPoints - 10);
  const rank = state.getArenaRank(state.data.arena.points);
  state.data.arena.rankTitle = rank.title;
  const goldReward = victory ? opponent.goldReward ?? 1000 : 200;
  const prestigeReward = victory ? opponent.prestigeReward ?? 50 : 10;
  const expReward = victory ? (opponent.level || 15) * 120 : 0;
  state.gainCurrency(goldReward, 0, prestigeReward, false);
  state.addExp(expReward, false);
  const pointsDelta = state.data.arena.points - previousPoints;
  if (victory) state.triggerQuestAction('arena_duel');
  state.addSystemLog(`【王国角斗场】${victory ? '战胜' : '惜败于'}【${opponent.name}】，积分 ${pointsDelta >= 0 ? '+' : ''}${pointsDelta}（当前 ${state.data.arena.points}），声望 +${prestigeReward}、金币 +${goldReward}。`, 'battle', false);
  if (victory) state.addActionPoints(ACTION_POINTS.arena);
  state.notify();
  return { success: true, victory, points: state.data.arena.points, pointsDelta, rank: rank.title, prestigeReward, goldReward, expReward };
}

export function buyPrestigeItem(state, shopItemId) {
  const shopItem = PRESTIGE_SHOP_ITEMS.find(i => i.id === shopItemId);
  if (!shopItem) return { success: false, msg: '商行中未找到该军需物资！' };

  if (state.data.prestige < shopItem.costPrestige) {
    return { success: false, msg: `声望不足！兑换【${shopItem.name}】需要 ${shopItem.costPrestige} 点声望（当前拥有 ${state.data.prestige} 点）！` };
  }

  if (!state.addItemToBag(shopItem.itemData)) return { success: false, msg: `行囊已满 (${state.data.bag.length}/${state.getBagCapacity()})，请先整理或扩容！` };
  state.data.prestige -= shopItem.costPrestige;

  state.addSystemLog(`【军需商行】支取 ${shopItem.costPrestige} 点声望，成功调配军需【${shopItem.name}】！`, 'obtain');
  state.notify();
  return { success: true, msg: `成功兑换【${shopItem.name}】！已收入行囊！` };
}

export function getCommissions(data, groups) {
  return COMMISSIONS.filter(config => !groups || groups.includes(config.group)).map(config => ({
    ...getCommission(config.id, data.nation),
    status: data.commissions?.[config.id]?.status || 'available',
    current: data.commissions?.[config.id]?.current || 0,
    choiceId: data.commissions?.[config.id]?.choiceId,
    progressText: config.storyBeats?.[(data.commissions?.[config.id]?.current || 0) - 1] || '',
    choices: (config.rewards.equipmentChoices || []).map(item => specializeEquipment(item, data.classId)),
    destination: config.requirement.event === 'tower' ? '魔塔' : MAPS.find(map => map.id === config.requirement.target)?.name,
    lockedReason: data.level < config.minLevel ? `需达到 ${config.minLevel} 级`
      : config.prerequisite && data.commissions?.[config.prerequisite]?.status !== 'claimed'
        ? `先交付「${getCommission(config.prerequisite, data.nation).title}」` : ''
  }));
}

export function getCommissionEquipmentPreview(state, id, choiceId) {
  const config = getCommission(id, state.data.nation);
  const item = getCommissionEquipment(config, choiceId, state.data.classId);
  if (!item || !state.data.hasChosenClass) return { success: false, msg: '没有可比较的委托装备。' };
  return { success: true, before: state.getEffectiveStats(),
    after: state.getEffectiveStats({ ...state.data.equipped, [item.slot]: item }),
    currentName: state.data.equipped[item.slot]?.name || '未穿戴', targetName: item.name,
    reqLevel: item.reqLevel, canEquip: state.data.level >= item.reqLevel };
}

export function acceptCommission(state, id) {
  const config = getCommission(id, state.data.nation);
  if (!config || !state.data.hasChosenClass || state.data.level < config.minLevel) return { success: false, msg: '委托不存在、尚未缔约或等级不足。' };
  if (config.prerequisite && state.data.commissions?.[config.prerequisite]?.status !== 'claimed') return { success: false, msg: `先交付「${getCommission(config.prerequisite, state.data.nation).title}」，再接续这段旅程。` };
  if (state.data.commissions?.[id]) return { success: false, msg: '这份委托已经接取或交付。' };
  state.data.commissions ??= {};
  state.data.commissions[id] = { status: 'active', current: 0 };
  state.addSystemLog(`【委托接取】${config.title}：${config.requirement.label}。`, 'quest', false);
  state.notify();
  return { success: true, msg: '委托已记入任务簿。接取后的胜利才计入进度。' };
}

export function recordCommissionEvent(state, event, target) {
  for (const config of COMMISSIONS) {
    const progress = state.data.commissions?.[config.id];
    const requirement = config.requirement;
    if (progress?.status !== 'active' || requirement.event !== event ||
      (requirement.target !== '*' && requirement.target !== target)) continue;
    progress.current = Math.min(requirement.count, progress.current + 1);
    if (config.storyBeats?.[progress.current - 1]) {
      state.addSystemLog(`【${config.title}】${config.storyBeats[progress.current - 1]}`, 'quest', false);
    }
    if (progress.current === requirement.count) {
      progress.status = 'ready';
      state.addSystemLog(`【委托完成】${config.title}，可返回${config.group === 'nation_guide' ? '圣王大殿' : '皇家酒馆'}交付。`, 'quest', false);
    }
  }
}

export function claimCommission(state, id, choiceId) {
  const config = getCommission(id, state.data.nation);
  const progress = state.data.commissions?.[id];
  if (!config || progress?.status !== 'ready' || progress.current !== config.requirement.count) return { success: false, msg: '委托尚未完成或已经领取。' };
  const choices = config.rewards.equipmentChoices || [];
  const chosen = choices.find(item => item.id === choiceId);
  if ((choices.length && !chosen) || (!choices.length && choiceId !== undefined)) return { success: false, msg: '请从这份委托的装备中选择一件报酬。' };
  // Mark first; grant the complete reward before publishing/persisting.
  progress.status = 'claimed';
  if (chosen) progress.choiceId = chosen.id;
  const reward = config.rewards;
  state.addExp(reward.exp, false);
  state.gainCurrency(reward.gold, reward.crystal, reward.prestige, false);
  reward.items.forEach(item => state.grantBattleLoot(item));
  const equipment = getCommissionEquipment(config, choiceId, state.data.classId);
  if (equipment) state.grantBattleLoot(equipment);
  state.addSystemLog(`【委托交付】${config.title}，报酬已全额存入行囊。`, 'quest', false);
  state.notify();
  return { success: true, msg: `${config.ending}\n\n经验 +${reward.exp}，金币 +${reward.gold}，魔晶 +${reward.crystal}，声望 +${reward.prestige}；${reward.items.map(item => `${item.name} ×${item.count}`).join('、')}${equipment ? `；已选择【${equipment.name}】` : ''}。` };
}

export function getTavernBounties(state) {
  if (!state.data.tavern) {
    state.data.tavern = {
      bounties: TAVERN_BOUNTIES.map(b => ({ id: b.id, status: 'available' })),
      drinkBuff: null,
      lastResetDate: state.getResetDayKey()
    };
  }
  const list = state.data.tavern.bounties || [];
  return TAVERN_BOUNTIES.map(cfg => {
    const found = list.find(b => b.id === cfg.id);
    return {
      ...cfg,
      status: found ? found.status : 'available'
    };
  });
}

export function acceptBounty(state, bountyId) {
  const config = TAVERN_BOUNTIES.find(b => b.id === bountyId);
  if (!config || state.data.level < config.reqLevel) return { success: false, msg: '悬赏不存在或等级不足。' };
  if (!state.data.tavern) state.getTavernBounties();
  const bounties = state.data.tavern.bounties || [];
  let item = bounties.find(b => b.id === bountyId);
  if (item) {
    if (item.status !== 'available') return { success: false, msg: '该悬赏已接取或已完成，请按当前进度交令。' };
    item.status = 'in_progress';
  } else {
    item = { id: bountyId, status: 'in_progress' };
    bounties.push(item);
  }
  state.data.tavern.bounties = bounties;
  state.addSystemLog(`【酒馆悬赏】成功揭下悬赏令，受命缉拿妖邪首领！`, 'quest');
  state.notify();
  return { success: true, msg: '成功揭榜接取悬赏令！速速前往深渊讨伐目标！' };
}

export function completeBountyBattle(state, bountyId) {
  if (!state.data.tavern) state.getTavernBounties();
  const bounties = state.data.tavern.bounties || [];
  let item = bounties.find(b => b.id === bountyId);
  if (!item || item.status !== 'in_progress') return { success: false, msg: '悬赏未接取或已结算。' };
  item.status = 'ready_to_claim';
  state.data.tavern.bounties = bounties;
  state.addSystemLog(`【悬赏大捷】悬赏凶物已被彻底斩杀！速回王都酒馆悬赏榜交令领赏！`, 'quest');
  state.addActionPoints(ACTION_POINTS.bounty);
  state.notify();
  return { success: true };
}

export function claimBountyReward(state, bountyId) {
  const cfg = TAVERN_BOUNTIES.find(b => b.id === bountyId);
  if (!cfg) return { success: false, msg: '未知的悬赏令！' };
  const item = (state.data.tavern?.bounties || []).find(b => b.id === bountyId);
  if (!item || item.status !== 'ready_to_claim') {
    return { success: false, msg: '该悬赏尚未斩杀目标，无法领取赏金！' };
  }
  item.status = 'completed';
  state.addExp(cfg.rewards.exp);
  state.gainCurrency(cfg.rewards.gold, cfg.rewards.crystal, cfg.rewards.prestige);
  if (cfg.rewards.items && cfg.rewards.items.length > 0) {
    cfg.rewards.items.forEach(it => {
      const existing = state.data.bag.find(b => b.id === it.id && !b.slot);
      if (existing) {
        existing.count = (existing.count || 1) + (it.count || 1);
      } else {
        state.data.bag.push({ ...it, uid: 'bounty_it_' + Date.now() + Math.random().toString(36).slice(2, 6) });
      }
    });
  }
  state.addSystemLog(`【赏金交令】恭贺骑士达成【${cfg.title}】！获赐赏金 ${cfg.rewards.gold} 金币、${cfg.rewards.prestige} 声望！`, 'quest');
  state.notify();
  return { success: true, msg: `悬赏赏金全额结清！金币 +${cfg.rewards.gold}，经验 +${cfg.rewards.exp}，声望 +${cfg.rewards.prestige}，魔晶 +${cfg.rewards.crystal}！` };
}

export function orderTavernDrink(state, drinkId) {
  if (!state.data.tavern) state.getTavernBounties();
  const drink = TAVERN_DRINKS.find(d => d.id === drinkId);
  if (!drink) return { success: false, msg: '吧台无此特调美酒！' };
  if (state.data.gold < drink.costGold) {
    return { success: false, msg: `金币不足！品尝【${drink.name}】需支付 ${drink.costGold} 金币！` };
  }
  state.data.gold -= drink.costGold;
  state.data.tavern.drinkBuff = {
    id: drink.id,
    name: drink.name,
    buff: drink.buff,
    boughtAt: Date.now()
  };
  state.addSystemLog(`【皇家酒馆】骑士豪饮一杯【${drink.name}】！激活特调酒力：${drink.buff.desc}！`, 'obtain');
  state.notify();
  return { success: true, msg: `痛饮【${drink.name}】！全身热血沸腾，${drink.buff.desc}！效果持续整日！` };
}
