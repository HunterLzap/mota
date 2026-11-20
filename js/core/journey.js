import { getQuestList } from '../config/quests.js';
import { ROYAL_TRIALS } from '../config/trials.js';
import { MAPS } from '../config/maps.js';
import { getRegionalStory, getInvestigationSteps } from '../config/story.js';
import { getPetParty } from './petParty.js';
import { ALCHEMY_RECIPES } from '../config/estate.js';
import { COMMISSIONS } from '../config/commissions.js';

export function getOptionalEquipmentGoal(data) {
  if (!data.hasChosenClass) return null;
  const eligible = COMMISSIONS.filter(config => config.rewards.equipmentChoices && data.level >= config.minLevel &&
    (!config.prerequisite || data.commissions?.[config.prerequisite]?.status === 'claimed') &&
    data.commissions?.[config.id]?.status !== 'claimed');
  const config = eligible.find(config => data.commissions?.[config.id]?.status === 'ready') ||
    eligible.find(config => data.commissions?.[config.id]?.status === 'active') || eligible[0];
  return config ? { id: config.id, title: config.title,
    slotName: { cloak: '披风', ring: '戒指', necklace: '项链' }[config.rewards.equipmentChoices[0].slot],
    status: data.commissions?.[config.id]?.status || 'available' } : null;
}

export function canRetryFinale(data) {
  const castle = data.castle;
  return Boolean(data.hasChosenClass && data.onboardingVersion === 2 && data.level >= 80 &&
    data.questProgress?.quest_25?.claimed && castle && !castle.isExploring &&
    castle.accumulatedExp === 0 && castle.accumulatedGold === 0 &&
    (castle.maxReachedFloor >= 99 || castle.floor >= 100) && !castle.claimedBossRewards?.includes(100));
}

export function getFeatureAccess(data, feature) {
  if (![1, 2].includes(data.onboardingVersion)) return { available: true };
  if (data.onboardingVersion === 2 && feature === 'dungeons' && data.level >= 20) return { available: true };
  const chapter = (data.onboardingVersion === 2 ? { enhance: 2, pets: 3, wash: 10, skills: 4, castle: 5, alchemy: 6, mercenaries: 7, socket: 9, trials: 9, dragons: 10, dungeons: 12, arena: 13, reforge: 15, faction: 20 } : { enhance: 1, pets: 2, wash: 3, skills: 4, castle: 5, alchemy: 6, mercenaries: 7, socket: 8, trials: 9, dragons: 10, dungeons: 12, arena: 13, reforge: 15, faction: 20 })[feature];
  if (!chapter || data.questProgress?.[`quest_${chapter}`]?.claimed) return { available: true };
  // Retain capabilities already earned through exploration or imported progress.
  const earned = { pets: data.pets?.length, wash: data.pets?.length && data.bag?.some(i => i.id === 'pill_reborn'), skills: data.pets?.some(p => p.skills?.length), castle: data.castle?.isExploring || (data.castle?.maxReachedFloor || 1) > 1, trials: data.royalTrials?.completedStage, dragons: Object.values(data.dragon?.cleared || {}).some(Boolean), dungeons: data.dungeon?.activeGateId || Object.values(data.dungeon?.clearedGates || {}).some(Boolean), arena: (data.arena?.points || 1000) > 1000, mercenaries: data.estate?.hiredMercId, faction: Object.values(data.factionWar?.strongholds || {}).some(record => record.captured) }[feature];
  const prerequisite = getQuestList(data).find(quest => quest.id === `quest_${chapter}`)?.title;
  return { available: Boolean(earned), chapter, label: data.onboardingVersion === 2 ? `完成「${prerequisite}」并领奖后开启` : `完成第${chapter}章并领奖后开启`, message: data.onboardingVersion === 2 ? `完成【${prerequisite}】并领取犒赏后开启。先跟随上方指引准备物品。` : `完成主线第${chapter}章并领取犒赏后开启。先跟随上方的下一步行动准备所需物品。` };
}

// A single actionable prerequisite takes priority over the chapter destination.
export function getJourneyGuidance(data) {
  const quest = getQuestList(data).find(quest => quest.id === data.currentQuestId);
  if (!quest) return data.currentQuestId === 'completed' ? { title: '王都的归途', text: '黑翼龙皇已经陨落。回到王都，与一路同行的人告别；之后可继续调查未探索的古门、培养其他伙伴或挑战角斗场。', tab: 'town', action: 'epilogue' } : null;
  const step = (title, text, tab = quest.targetTab, action = quest.targetAction) => ({ title, text, tab, action });
  if (data.questProgress[quest.id]?.completed) return { ...step('目标已完成，先领取主线奖励', '领奖后会接上下一段冒险。'), ready: true };
  if (data.onboardingVersion === 2) {
    const event = getRegionalStory(data);
    if (event && data.questProgress[event.id]?.completed) return { ...step(event.title, `${event.speaker}：调查已完成，带回记录，领取下一段行程的补给。`, event.action === 'dungeon' ? 'tower' : 'wild', 'regional_story'), event, regionalReady: true };
    if (['quest_2','quest_3'].includes(quest.id) && (!data.equipped.weapon || !data.equipped.armor)) return step('穿好罗兰交给你的装备', '在行囊依次选择武器和护胸，点击立即穿戴，再出城调查。', 'bag', 'equip_gear');
    if (quest.id !== 'quest_1' && data.freeStatPoints >= 6) return step('把成长转化为战斗能力', '升级获得的潜能尚未分配。人物页可按职业建议分配，也可以自行选择；主属性增强职业能力，体魄增加生命。', 'hero', 'allocate_stats');
    if (quest.id === 'quest_4' && !data.pets.length) return step('孵化巡逻队留下的契约蛋', '赛拉会帮助你建立契约。孵化后让伙伴随行，先认识它的特性。', 'pets', 'set_active_pet');
    const tiredMember = getPetParty(data).find(member => member.pet && (member.pet.stamina ?? 100) < 65);
    if (tiredMember && data.bag.some(item => item.id === 'pet_food' && item.count > 0)) return { ...step('让同行伙伴恢复体力', '体力影响属性与天赋：80 以上全额；60–79 与 40–59 属性减半、天赋失效；低于 40 属性无效。体力每日衰减 10 点、战败 -5，选择体力偏低的伙伴喂养后再继续。', 'pets', 'feed_pet'), petId: tiredMember.pet.id };
    if (data.castle.isExploring && !quest.targetAction.includes('tower')) return step('先带着调查结果撤离魔塔', '本次经验与金币仍存在探索收益池。回到塔门主动结束探险，全额结算后再交付新的委托。', 'tower', 'withdraw_castle');
    if (quest.id === 'quest_10' && data.bag.some(item => item.id === 'courage_sword') && data.equipped.weapon?.id !== 'courage_sword') return step('换上刚领取的勇气武器', '在行囊选择勇气武器。旧武器已有强化时，可付费继承星级并换装；也可直接穿戴。再镶入金刚石，宝石以后能免费摘除。', 'bag', 'equip_gear');
    const expeditionItem = quest.id === 'quest_25' ? 'expedition_armor' : quest.id === 'quest_26' ? 'expedition_weapon' : null;
    if (expeditionItem && data.bag.some(item => item.id === expeditionItem)) return step('检查新获得的远征装备', '上一份委托已交付远征装备。打开行囊比较；可付费继承同部位旧装备的强化，也可直接穿戴。旧装备上的宝石能在行囊免费摘除。', 'bag', 'equip_gear');
    if (quest.id === 'quest_26' && (data.equipped.weapon?.stars || 0) < 2 && data.bag.some(item => item.id === 'star_crystal' && item.count >= (data.equipped.weapon?.stars || 0) + 1)) return step('为终战加固远征武器', '铁匠建议将武器强化至2星后再出发。升星会消耗水晶，也可能失败；无需追求高星，修好装备、分配潜能和喂饱伙伴更重要。', 'town', 'enhance');
    if (quest.id === 'quest_26' && data.castle.isExploring && data.castle.floor >= 98 && data.castle.floor <= 100 && !data.castle.finished) {
      const recipe = ALCHEMY_RECIPES.find(recipe => recipe.id === 'pot_titan');
      const protectedToBoss = data.estate.activePotions.some(potion => potion.id === recipe.id &&
        (potion.remainingFights ?? potion.effect?.fights ?? 0) >= 101 - data.castle.floor);
      if (!protectedToBoss && data.crystal >= (recipe.costCrystal || 0) &&
        Object.entries(recipe.materials).every(([id, count]) => (data.estate.herbs[id] || 0) >= count)) {
        return step('用储备草药准备终战', '泰坦巨人魔药使最大生命提高35%、护甲提高25%，持续3场战斗。现在配制，可覆盖最后三层；魔药不会消耗魔塔探索收益。', 'estate', 'brew_potion');
      }
    }
    if (event) {
      const progress = data.questProgress[event.id] || { current: 0 };
      const count = event.action === 'dungeon' ? progress.floorProgress || 0 : progress.current;
      return { ...step(event.title, `${event.speaker}：${event.text}（${count}/${getInvestigationSteps(event)}${event.action === 'dungeon' ? '层；调查经验逐层获得' : ''}）`, event.action === 'dungeon' ? 'tower' : 'wild', 'regional_story'), event, regionalReady: Boolean(progress.completed) };
    }
  }
  if (quest.id === 'quest_2' && !data.equipped.weapon) return step('穿戴刚获得的职业武器', '打开行囊，选择武器并点击立即穿戴；升星会提高这件装备的属性。', 'bag', 'equip_gear');
  if (data.onboardingVersion !== 2 && quest.id === 'quest_3' && !data.pets.length) return step('孵化契约蛋，获得第一位伙伴', '孵化后设为出战主宠。伙伴获得战斗经验；每场消耗3体力，低于60会停用特性与经验成长。');
  const requiredLevel = { quest_11: 30, quest_13: 20, quest_19: 50, quest_22: 70, quest_24: 80, quest_25: 80 }[quest.id];
  if (requiredLevel && data.level < requiredLevel) {
    const map = MAPS.filter(map => map.reqLevel <= data.level).at(-1);
    return step(`在${map.name}成长至${requiredLevel}级`, `当前${data.level}级。普通讨伐提供经验和每10胜一份兽肉；达到驻地首领等级后可挑战首领获取装备与重铸晶石。巡逻按真实时间积累收益。`, 'wild', 'grow_in_wild');
  }
  if (quest.id === 'quest_24' || quest.id === 'quest_12') {
    const trial = ROYAL_TRIALS[data.royalTrials.completedStage || 0];
    if (trial && data.prestige < trial.fameReq) return step(`积累册封声望：${data.prestige}/${trial.fameReq}`, '野外驻地首领每胜提供20声望；酒馆悬赏和角斗也提供声望。尚未达到册封条件时，先完成能挑战的目标。', 'town', 'earn_prestige');
  }
  if (quest.id === 'quest_20') {
    const pet = data.pets.find(pet => pet.id === data.activePetId) || data.pets[0];
    if (pet?.tier === 'gold') {
      if (pet.level < 30) return step(`培养黄金伙伴至30级（当前${pet.level}级）`, '伙伴可随战斗成长，也可在神兽页用金币、魔晶和兽肉进行营地训练，最多追上你的等级。保持体力不少于60；野外每10胜或酒馆一星悬赏提供兽肉。', 'wild', 'grow_in_wild');
      if (!data.bag.some(item => item.id === 'evolution_stone' && item.count > 0)) return step('为黄金伙伴准备进化石', '第12章赠予一枚进化石；若已用于其他伙伴，可在角斗场声望商行花300声望兑换。', 'town', 'arena_shop');
      return step('使用进化石，将黄金伙伴进阶暗金', '进阶消耗1枚进化石，资质提升，但等级和经验归零。继续带它战斗至40级，再使用银龙和第19章提供的天命石。', 'pets', 'evolve_purplegold');
    }
    if (pet?.tier === 'darkgold' && pet.level < 40) return step(`培养暗金伙伴至40级（当前${pet.level}级）`, '保持伙伴出战与体力不少于60，再进行野外讨伐；也可回神兽页进行营地训练。进阶后资质与魔典保留，不必重新孵化伙伴。', 'wild', 'grow_in_wild');
  }
  if (quest.id === 'quest_16' && !data.bag.some(item => ['crystal_gold','crystal_darkgold'].includes(item.id) && item.count > 0)) return step('取得重铸晶石', '微光森林狼王保底提供黄金晶石；也可分解无宝石的闲置黄金装备。拿到材料后返回铁匠铺重铸。', 'wild', 'slay_wild_boss');
  const activity = quest.targetAction.includes('tower') ? data.castle : quest.targetAction.includes('dungeon') || ['clear_dragon_gate','clear_spacetime_gate'].includes(quest.targetAction) ? data.dungeon : ['slay_dragon','slay_silver_dragon'].includes(quest.targetAction) ? data.dragon : quest.targetAction === 'arena_duel' ? data.arena : null;
  const remaining = activity?.entriesLeft ?? activity?.trialsLeft ?? activity?.challengesLeft;
  if (quest.id === 'quest_26' && canRetryFinale(data)) return step('整备后重返龙皇王座', '你已抵达王座。可直接重试100层，不消耗钥匙或每日入场次数；前层收益不会重新发放。检查修理、伙伴体力、魔抗与净化后再挑战。', 'tower', 'retry_finale');
  const permitId = activity === data.castle ? 'royal_castle_permit' : activity === data.dungeon ? 'royal_dungeon_permit' : null;
  const hasPermit = permitId && data.bag.some(item => item.id === permitId && item.count > 0);
  if (remaining === 0 && !hasPermit && !activity.isExploring && !activity.activeGateId && !activity.activeChallenge) return step('今日挑战次数用尽，午夜恢复', '已有探险可以继续；新入场次数在本地午夜恢复。等待期间可进行野外讨伐、准备装备、喂养伙伴，主线进度会保留。');
  if (quest.targetAction.includes('tower') && !data.castle.isExploring) {
    const floor = {clear_tower_1:1,clear_tower_10:10,clear_tower_20:20,clear_tower_70:70,clear_tower_100:100}[quest.targetAction];
    const starts = {key_redwood:1,key_mithril:20,key_obsidian:35,key_bronze:50,key_titan:70,key_platinum:90};
    if (!data.bag.some(item => starts[item.id] <= floor && item.count > 0)) return step('准备魔塔入场钥匙', '酒馆一星悬赏保底提供2把红木钥匙，野外普通讨伐也可能掉落。红木钥匙从第1层入场，可一路继续向上探索；高阶钥匙只改变起点。', 'town', 'earn_prestige');
  }
  return step(quest.goalText, `${quest.speaker ? quest.speaker + '：' : ''}${quest.desc}`);
}

export function getDefeatAdvice(data, combat) {
  if (Object.values(data.equipped).some(item => item && item.durability === 0)) return '有装备已经破损，属性不再生效；先到铁匠铺修理。';
  if (!data.equipped.weapon || !data.equipped.armor) return '武器或护胸为空；先打开行囊穿戴已获得的职业装备。';
  const pet = data.pets.find(pet => pet.id === data.activePetId);
  if (pet && pet.stamina < 60) return '伙伴体力低于60，特性与魔典已停用；喂食兽肉后再战。野外每10胜和酒馆一星悬赏提供兽肉。';
  if (combat.timedOut) return '300秒内输出不足；先培养攻击技能、提高职业主属性并检查装备，有护盾的首领也可考虑破盾合击。';
  if (data.classId === 'mage' && combat.remainingMp <= 0) return '魔力已经耗尽；优先选择增加智力或魔力上限的装备，也可带上拥有节约特性的巨灵。';
  if (combat.logs.some(log => ['poison','stun','warning'].includes(log.type)) && !pet?.skills?.some(skill => ['book_purify','high_purify'].includes(skill))) return '留意战报中的蓄势与异常状态；声望商行可兑换神圣净化魔典。魔典槽满时可先退还一本，再让体力充足的伙伴学习净化。';
  if (data.freeStatPoints > 0) return '还有未分配潜能点；到英雄页为职业主属性与体魄分配潜能，再检查装备等级。';
  return '先挑战当前野外区域成长、换上等级合适的装备；遇到强敌可用庄园草药炼制泰坦魔药增强生命与防御。';
}
