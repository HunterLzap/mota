import { SLAVE_CANDIDATES } from '../../config/slaves.js';
import { ALCHEMY_RECIPES, MERCENARIES } from '../../config/estate.js';

export function brewPotion(state, recipeId) {
  const recipe = ALCHEMY_RECIPES.find(recipe => recipe.id === recipeId);
  if (!recipe) return { success: false, msg: '未知魔药配方！' };
  const learnedPoints = state.data.estate.permanentPotionPoints || 0;
  if (recipe.effect.permanentStatsCap && learnedPoints + recipe.effect.permanentStats > recipe.effect.permanentStatsCap) return { success: false, msg: '龙血潜能秘药已累计提供100点潜能，继续炼制不会再提升；请保留草药用于战斗魔药。' };
  const herbs = state.data.estate.herbs;
  if (Object.entries(recipe.materials).some(([id, count]) => (herbs[id] || 0) < count)) return { success: false, msg: '草药材料不足！' };
  if (state.data.crystal < (recipe.costCrystal || 0)) return { success: false, msg: '魔晶不足！' };
  for (const [id, count] of Object.entries(recipe.materials)) herbs[id] -= count;
  state.data.crystal -= recipe.costCrystal || 0;
  if (recipe.effect.permanentStats) {
    state.data.freeStatPoints += recipe.effect.permanentStats;
    state.data.estate.permanentPotionPoints = learnedPoints + recipe.effect.permanentStats;
  } else {
    state.data.estate.activePotions = state.data.estate.activePotions.filter(potion => potion.id !== recipe.id);
    state.data.estate.activePotions.push({ ...recipe, remainingFights: recipe.effect.fights });
  }
  state.triggerQuestAction('brew_potion');
  state.notify();
  return { success: true, msg: `成功配制【${recipe.name}】！` };
}

export function hireMercenary(state, id) {
  const merc = MERCENARIES.find(m => m.id === id);
  if (!merc) return { success: false, msg: '未知佣兵。' };
  if (state.data.estate.hiredMercId === id) return { success: false, msg: '该佣兵已随行。' };
  if (state.data.gold < merc.hireCostGold) return { success: false, msg: '金币不足，无法订立誓约。' };
  state.data.gold -= merc.hireCostGold;
  state.data.estate.hiredMercId = id;
  state.triggerQuestAction('hire_merc');
  state.notify();
  return { success: true, msg: '佣兵誓约已订立。' };
}

export function harvestEstate(state, now) {
  const estate = state.data.estate;
  const harvestedToday = Number.isSafeInteger(estate.harvestedToday) ? estate.harvestedToday : 0;
  const matureBatches = Math.min(2, Math.floor(state.getActionPoints() / 10));
  const remainingToday = Math.max(0, matureBatches - harvestedToday);
  const batches = remainingToday;
  if (!Number.isFinite(batches) || batches < 1) {
    return { success: false, msg: remainingToday <= 0 ? '本行动日药园与矿脉已采收完（每日最多 2 批），进入下一行动日后再来。' : '药园与矿脉尚未成熟：每累计 10 行动点成熟 1 批，完成更多行动后再来。' };
  }
  for (const id of ['herb_dragonblood', 'herb_starlight', 'herb_spiritflower']) {
    estate.herbs[id] = (estate.herbs[id] || 0) + batches * 5;
  }
  state.data.crystal += batches * 25;
  estate.harvestedToday = (Number.isSafeInteger(estate.harvestedToday) ? estate.harvestedToday : 0) + batches;
  state.notify();
  return { success: true, msg: `采收 ${batches} 批：三种草药各 +${batches * 5}，魔晶 +${batches * 25}。本行动日还可采收 ${Math.max(0, 2 - estate.harvestedToday)} 批。` };
}

export function getExplorationReward(data, gold, crystal) {
  const bonus = MERCENARIES.find(merc => merc.id === data.estate.hiredMercId)?.rewardBonus;
  return { gold: Math.floor(gold * (bonus?.goldMultiplier ?? 1)), crystal: crystal + (bonus?.crystalBonus ?? 0) };
}

export function advanceBattlePotions(data) {
  data.estate.activePotions = (data.estate.activePotions || []).filter(potion => {
    potion.remainingFights = (potion.remainingFights ?? potion.effect?.fights ?? 0) - 1;
    return potion.remainingFights > 0;
  });
}

export function captureSlaveWithSigil(state, slaveId) {
  const config = SLAVE_CANDIDATES.find(item => item.id === slaveId);
  if (!config) return { success: false, msg: '未知的侍从契印。' };
  const list = state.data.slaves?.list || (state.data.slaves.list = []);
  if (list.length >= 5) return { success: false, msg: '牢房最多容纳 5 名侍从。' };
  if (list.some(slave => slave.id === slaveId)) return { success: false, msg: '该战俘已经收押，不能重复缔约。' };
  const sigil = state.data.bag.find(item => item.id === 'slave_sigil' && Number.isInteger(item.count) && item.count > 0);
  if (!sigil) return { success: false, msg: '缺少【侍从契印】，无法收押。' };
  sigil.count--;
  if (sigil.count <= 0) state.data.bag = state.data.bag.filter(item => item !== sigil);
  list.push({
    ...config,
    uid: `slave_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    isComforted: false,
    comfortUntil: 0,
    preparedDay: 0,
    workedTimes: 0
  });
  state.addSystemLog(`【庄园牢房】使用侍从契印，收押【${config.name}】。`, 'estate');
  state.notify();
  return { success: true, msg: `成功收押【${config.name}】为侍从。` };
}

export function comfortSlave(state, slaveId) {
  const slave = state.data.slaves.list.find(s => s.uid === slaveId || s.id === slaveId);
  if (!slave) return { success: false, msg: '侍从不存在' };
  slave.isComforted = true;
  slave.preparedDay = state.getActionDay();
  // UI 兼容字段：显示为已整备；实际产出加成按 preparedDay 判定。
  slave.comfortUntil = Date.now() + 24 * 3600000;
  state.notify();
  return { success: true, msg: `已为侍从【${slave.name}】整备，当前行动日采矿产出提升 10%。` };
}

export function disciplineSlave(state, slaveId, now) {
  const slave = state.data.slaves.list.find(s => s.uid === slaveId || s.id === slaveId);
  if (!slave) return { success: false, msg: '侍从不存在' };
  const day = state.getActionDay();
  if (slave.lastDisciplineDay === day) return { success: false, msg: '本行动日该侍从已受过惩戒，进入下一行动日后再来。' };
  slave.lastDisciplineDay = day;
  const expGain = slave.level * 45;
  const goldGain = slave.level * 30;
  state.addExp(expGain);
  state.gainCurrency(goldGain, 0, 0);
  state.notify();
  return { success: true, msg: `鞭挞惩戒侍从【${slave.name}】！榨取获得经验 +${expGain}，金币 +${goldGain}！` };
}

export function assignSlaveMine(state, slaveId, now) {
  const slave = state.data.slaves.list.find(s => s.uid === slaveId || s.id === slaveId);
  if (!slave) return { success: false, msg: '侍从不存在' };
  const day = state.getActionDay();
  if (slave.lastMineDay === day) return { success: false, msg: '本行动日该侍从已采矿，进入下一行动日后再来。' };
  slave.lastMineDay = day;
  const prepared = slave.preparedDay === day ? 1.1 : 1;
  const yieldCrystal = Math.floor((Math.floor(slave.level * 0.8) + 10) * prepared);
  const yieldGold = Math.floor(slave.level * 50 * prepared);
  state.gainCurrency(yieldGold, yieldCrystal, 0);
  slave.workedTimes = (slave.workedTimes || 0) + 1;
  state.notify();
  return { success: true, msg: `役使侍从【${slave.name}】进入晶矿深处采掘！收获魔晶 +${yieldCrystal}，金币 +${yieldGold}！${prepared > 1 ? '（整备加成）' : ''}` };
}
