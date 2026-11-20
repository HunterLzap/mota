import { REGIONAL_STORIES, getInvestigationSteps, getInvestigationEarnedExperience } from '../config/story.js';
import { REFORGE_AFFIXES } from '../config/items.js';
import { CLASSES, getSkillPointBudget } from '../config/classes.js';
import { PET_CONFIGS } from '../config/pets.js';
import { COMMISSIONS, validCommissionProgress } from '../config/commissions.js';
// 存档管理与持久化系统 (5大独立槽位 + 当前游玩槽位 + JSON 备份导入导出)
const LEGACY_SAVE_KEY = 'MOTA_WORLD_REBIRTH_SAVE';
const ACTIVE_SLOT_KEY = 'MOTA_WORLD_ACTIVE_SLOT_ID';
const SLOT_KEY_PREFIX = 'MOTA_WORLD_SAVE_SLOT_';
export const TOTAL_SLOTS = 5;
const slotLocks = new Map();
const slotSnapshots = new Map();
let protectedSession = false;
let pageSlotId = null;

function acquireSlotLock(slotId) {
  if (slotLocks.has(slotId)) return Promise.resolve(true);
  return new Promise((resolve, reject) => {
    navigator.locks.request(`MOTA_WORLD_SLOT_${slotId}`, { ifAvailable: true }, lock => {
      if (!lock) { resolve(false); return; }
      return new Promise(release => {
        slotLocks.set(slotId, release);
        resolve(true);
      });
    }).catch(reject);
  });
}

function releaseSlotLock(slotId) {
  slotLocks.get(slotId)?.();
  slotLocks.delete(slotId);
  slotSnapshots.delete(slotId);
}

export const storage = {
  lastError: '',
  onConflict: null,

  watchSlot() {
    if (!protectedSession) return;
    window.addEventListener('storage', event => {
      const key = `${SLOT_KEY_PREFIX}${pageSlotId}`;
      if (event.key === key && event.newValue !== slotSnapshots.get(pageSlotId)) this.onConflict?.();
    });
  },

  getSlotSnapshot(slotId) {
    return localStorage.getItem(`${SLOT_KEY_PREFIX}${slotId}`);
  },

  hasActiveSlot() {
    return !protectedSession || (pageSlotId !== null && slotLocks.has(pageSlotId));
  },

  // Keep one writer per slot without changing synchronous game-state mutations.
  async activateSlot(slotId, expectedSnapshot) {
    const id = Math.max(1, Math.min(TOTAL_SLOTS, parseInt(slotId, 10) || 1));
    protectedSession = true;
    if (!globalThis.navigator?.locks?.request) {
      this.lastError = '当前浏览器不支持安全的多页面存档，请使用支持 Web Locks 的浏览器打开游戏。';
      return false;
    }
    if (pageSlotId === id && slotLocks.has(id)) return this.canWriteSlot(id);
    try {
      if (!await acquireSlotLock(id)) {
        this.lastError = `存档 ${id} 正在其他页面中使用。请关闭对应页面后重新载入，或选择其他存档。`;
        return false;
      }
      const snapshot = this.getSlotSnapshot(id);
      if (expectedSnapshot !== undefined && snapshot !== expectedSnapshot) {
        releaseSlotLock(id);
        this.lastError = '该存档已在其他页面发生变化，请重新打开档案馆后再操作。';
        return false;
      }
      const previous = pageSlotId;
      slotSnapshots.set(id, snapshot);
      localStorage.setItem(ACTIVE_SLOT_KEY, String(id));
      pageSlotId = id;
      if (previous !== null && previous !== id) releaseSlotLock(previous);
      this.lastError = '';
      return true;
    } catch (error) {
      releaseSlotLock(id);
      this.lastError = '无法打开存档，请检查浏览器的本地存储权限后重新载入。';
      return false;
    }
  },

  canWriteSlot(slotId) {
    if (!protectedSession) return true;
    if (slotLocks.has(slotId) && slotSnapshots.get(slotId) === this.getSlotSnapshot(slotId)) return true;
    this.lastError = '存档已发生变化，本页已停止保存。请重新载入最新进度，或选择其他存档。';
    this.onConflict?.();
    return false;
  },

  async deleteInactiveSlot(slotId) {
    if (this.hasActiveSlot() && slotId === this.getActiveSlotId()) {
      this.lastError = '当前游玩中的存档不能删除，请先切换到其他存档。';
      return false;
    }
    try {
      if (!await acquireSlotLock(slotId)) {
        this.lastError = `存档 ${slotId} 正在其他页面中使用。请先关闭对应页面后再删除。`;
        return false;
      }
      slotSnapshots.set(slotId, this.getSlotSnapshot(slotId));
      return this.deleteSlot(slotId);
    } catch (error) {
      this.lastError = '删除存档失败，请检查浏览器的本地存储权限。';
      return false;
    } finally {
      releaseSlotLock(slotId);
    }
  },

  // 获取当前正在游玩的槽位 ID (1 ~ 5，默认 1)
  getActiveSlotId() {
    if (protectedSession && pageSlotId !== null) return pageSlotId;
    try {
      const id = localStorage.getItem(ACTIVE_SLOT_KEY);
      const num = parseInt(id, 10);
      return (num >= 1 && num <= TOTAL_SLOTS) ? num : 1;
    } catch (e) {
      return 1;
    }
  },

  // 设置当前活跃槽位
  setActiveSlotId(slotId) {
    try {
      const num = Math.max(1, Math.min(TOTAL_SLOTS, parseInt(slotId, 10) || 1));
      if (protectedSession && !slotLocks.has(num)) return false;
      localStorage.setItem(ACTIVE_SLOT_KEY, String(num));
      if (protectedSession) pageSlotId = num;
      return num;
    } catch (e) {
      this.lastError = '切换存档失败，请检查浏览器的本地存储权限。';
      return false;
    }
  },

  // 获取特定槽位的存档概要信息
  getSlotInfo(slotId) {
    try {
      const key = `${SLOT_KEY_PREFIX}${slotId}`;
      let raw = localStorage.getItem(key);

      // 兼容迁移：如果是槽位1且为空，但存在旧存档，则自动迁移
      if (!raw && slotId === 1) {
        const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY);
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          const data = parsed.data || parsed;
          raw = legacyRaw;
          if (!protectedSession || slotLocks.has(1)) {
            this.saveToSlot(1, data);
            raw = localStorage.getItem(key) || legacyRaw;
          }
        }
      }

      if (!raw) {
        return {
          slotId,
          isEmpty: true,
          timestamp: null,
          dateString: '无存档记录',
          meta: null,
          data: null
        };
      }

      const envelope = JSON.parse(raw);
      const data = envelope.data || envelope;
      return {
        slotId,
        isEmpty: false,
        timestamp: envelope.timestamp || Date.now(),
        dateString: envelope.dateString || new Date(envelope.timestamp || Date.now()).toLocaleString(),
        meta: envelope.meta || {
          name: data.name || '勇者',
          classId: data.classId || 'warrior',
          nation: data.nation || 'aden',
          level: data.level || 1,
          title: data.royalTrials?.currentTitle || data.title || '见习勇者',
          gold: data.gold || 0,
          crystal: data.crystal || 0,
          towerFloor: data.castle?.floor || 1
        },
        data
      };
    } catch (e) {
      console.error(`Failed to get slot ${slotId} info:`, e);
      return {
        slotId,
        isEmpty: true,
        timestamp: null,
        dateString: '读取失败',
        meta: null,
        data: null
      };
    }
  },

  // 获取全部 5 个槽位的信息列表
  getAllSlots() {
    const slots = [];
    const activeId = this.getActiveSlotId();
    for (let i = 1; i <= TOTAL_SLOTS; i++) {
      const info = this.getSlotInfo(i);
      info.isActive = this.hasActiveSlot() && (i === activeId);
      slots.push(info);
    }
    return slots;
  },

  // 保存数据到指定槽位
  saveToSlot(slotId, data) {
    try {
      if (!this.canWriteSlot(slotId)) return false;
      const now = new Date();
      const envelope = {
        version: '2.0.0',
        slotId,
        timestamp: now.getTime(),
        dateString: now.toLocaleString(),
        meta: {
          name: data.name || '亚诺勇士',
          classId: data.classId || 'warrior',
          nation: data.nation || 'aden',
          level: data.level || 1,
          title: data.royalTrials?.currentTitle || data.title || '见习勇者',
          gold: data.gold || 0,
          crystal: data.crystal || 0,
          towerFloor: data.castle?.floor || 1
        },
        data
      };
      const snapshot = JSON.stringify(envelope);
      localStorage.setItem(`${SLOT_KEY_PREFIX}${slotId}`, snapshot);
      if (protectedSession) slotSnapshots.set(slotId, snapshot);
      return true;
    } catch (e) {
      console.error(`Save to slot ${slotId} failed:`, e);
      return false;
    }
  },

  // 从指定槽位读取数据
  loadFromSlot(slotId) {
    const info = this.getSlotInfo(slotId);
    return info.isEmpty ? null : info.data;
  },

  // 清空/删除指定槽位
  deleteSlot(slotId) {
    try {
      if (protectedSession && slotId === this.getActiveSlotId()) return false;
      if (!this.canWriteSlot(slotId)) return false;
      localStorage.removeItem(`${SLOT_KEY_PREFIX}${slotId}`);
      if (slotId === 1) {
        localStorage.removeItem(LEGACY_SAVE_KEY);
      }
      if (protectedSession) slotSnapshots.set(slotId, null);
      return true;
    } catch (e) {
      console.error(`Delete slot ${slotId} failed:`, e);
      return false;
    }
  },

  // 默认保存：保存至当前活跃槽位
  save(data) {
    const activeId = this.getActiveSlotId();
    return this.saveToSlot(activeId, data);
  },

  // 默认读取：从当前活跃槽位读取
  load() {
    const activeId = this.getActiveSlotId();
    return this.loadFromSlot(activeId);
  },

  // 清空当前活跃槽位
  clear() {
    const activeId = this.getActiveSlotId();
    this.deleteSlot(activeId);
  },

  // 导出 JSON 备份文件
  exportJSON(data, slotId = null) {
    const id = slotId || this.getActiveSlotId();
    const jsonStr = JSON.stringify({
      game: 'Mota World: Rebirth',
      version: '2.0.0',
      slotId: id,
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      saveData: data
    }, null, 2);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mota_world_slot${id}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  parseBackupText(text) {
    const parsed = JSON.parse(text);
    const data = parsed?.saveData || parsed?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
      !['warrior', 'hunter', 'mage'].includes(data.classId) ||
      !Number.isInteger(data.level) || data.level < 1 || data.level > 100 ||
      (data.bag !== undefined && !Array.isArray(data.bag)) ||
      (data.pets !== undefined && !Array.isArray(data.pets)) ||
      (data.equipped !== undefined && (!data.equipped || typeof data.equipped !== 'object' || Array.isArray(data.equipped)))) {
      throw new Error('无效的《魔塔世界》存档数据：请检查职业、等级与物品格式');
    }
    for (const key of ['gold', 'crystal', 'prestige', 'exp']) {
      if (data[key] !== undefined && (!Number.isFinite(data[key]) || data[key] < 0)) {
        throw new Error('无效的存档资源数值');
      }
    }
    const validRecord = value => value && typeof value === 'object' && !Array.isArray(value);
    if (data.commissions !== undefined && (!validRecord(data.commissions) ||
      Object.entries(data.commissions).some(([id, progress]) => {
        const config = COMMISSIONS.find(entry => entry.id === id);
        return !config || !validCommissionProgress(config, progress);
      }))) throw new Error('无效的支线委托记录');
    if (data.supportPetIds !== undefined) {
      const ids = [data.activePetId, ...(Array.isArray(data.supportPetIds) ? data.supportPetIds : [])].filter(id => id !== null && id !== undefined);
      if (!Array.isArray(data.supportPetIds) || data.supportPetIds.length !== 2 ||
        data.supportPetIds.some(id => id !== null && typeof id !== 'string') ||
        new Set(ids).size !== ids.length || ids.some(id => !Object.hasOwn(PET_CONFIGS, id) || !data.pets?.some(pet => pet.id === id))) throw new Error('无效的神兽阵容');
    }
    if (data.skillTraining !== undefined) {
      const training = data.skillTraining;
      const skills = CLASSES[data.classId].skills;
      if (!validRecord(training) || !validRecord(training.ranks) ||
        Object.entries(training.ranks).some(([id, rank]) => !skills.some(skill => skill.id === id) || !Number.isInteger(rank) || rank < 1 || rank > 10) ||
        Object.values(training.ranks).reduce((sum, rank) => sum + rank - 1, 0) > getSkillPointBudget(data.level) ||
        (training.preferredAttackId !== null && !skills.some(skill => skill.id === training.preferredAttackId && skill.category === 'attack'))) throw new Error('无效的职业培养记录');
    }
    if (data.onboardingVersion !== undefined && ![0, 1, 2].includes(data.onboardingVersion)) throw new Error('无效的冒险旅程记录');
    for (const event of Object.values(REGIONAL_STORIES).flat()) {
      const progress = data.questProgress?.[event.id];
      if (progress !== undefined && (!validRecord(progress) || !Number.isSafeInteger(progress.current) || progress.current < 0 || progress.current > event.count || typeof progress.completed !== 'boolean' || typeof progress.claimed !== 'boolean' || progress.completed !== (progress.current === event.count) || (progress.claimed && !progress.completed))) throw new Error('无效的区域调查记录');
      if (progress?.floorProgress !== undefined && (event.action !== 'dungeon' || !Number.isInteger(progress.floorProgress) ||
        progress.floorProgress < 0 || progress.floorProgress > getInvestigationSteps(event) ||
        progress.completed !== (progress.floorProgress === getInvestigationSteps(event)))) throw new Error('无效的区域调查层数记录');
      if (progress?.expGranted !== undefined && (!Number.isSafeInteger(progress.expGranted) || progress.expGranted < 0 || progress.expGranted > getInvestigationEarnedExperience(event, progress))) throw new Error('无效的区域调查经验记录');
    }

    if (data.estate?.permanentPotionPoints !== undefined && (!Number.isInteger(data.estate.permanentPotionPoints) || data.estate.permanentPotionPoints < 0 || data.estate.permanentPotionPoints > 100 || data.estate.permanentPotionPoints % 5 !== 0)) throw new Error('无效的龙血秘药潜能记录');
    if (data.arena !== undefined && (!validRecord(data.arena) ||
      (data.arena.points !== undefined && (!Number.isSafeInteger(data.arena.points) || data.arena.points < 1000)) ||
      (data.arena.challengesLeft !== undefined && (!Number.isInteger(data.arena.challengesLeft) || data.arena.challengesLeft < 0 || data.arena.challengesLeft > 5)) ||
      (data.arena.lastResetDate !== undefined && typeof data.arena.lastResetDate !== 'string') ||
      (data.arena.activeChallenge !== undefined && data.arena.activeChallenge !== null && (!validRecord(data.arena.activeChallenge) || !['opp_1', 'opp_2', 'opp_3', 'opp_4'].includes(data.arena.activeChallenge.opponentId) || typeof data.arena.activeChallenge.challengeId !== 'string' || !data.arena.activeChallenge.challengeId)))) {
      throw new Error('无效的角斗挑战记录');
    }
    if (data.dragon !== undefined && (!validRecord(data.dragon) ||
      (data.dragon.trialsLeft !== undefined && (!Number.isInteger(data.dragon.trialsLeft) || data.dragon.trialsLeft < 0 || data.dragon.trialsLeft > 4)) ||
      (data.dragon.cleared !== undefined && (!validRecord(data.dragon.cleared) || Object.entries(data.dragon.cleared).some(([id, count]) => !['slay_red_dragon', 'slay_silver_dragon', 'slay_golden_dragon', 'slay_night_dragon'].includes(id) || !Number.isSafeInteger(count) || count < 0))) ||
      (data.dragon.activeChallenge !== undefined && data.dragon.activeChallenge !== null && (!validRecord(data.dragon.activeChallenge) || !['slay_red_dragon', 'slay_silver_dragon', 'slay_golden_dragon', 'slay_night_dragon'].includes(data.dragon.activeChallenge.dragonId) || typeof data.dragon.activeChallenge.challengeId !== 'string' || !data.dragon.activeChallenge.challengeId)))) {
      throw new Error('无效的屠龙讨伐记录');
    }
    if (data.factionWar !== undefined && (!validRecord(data.factionWar) ||
      (data.factionWar.totalMerit !== undefined && (!Number.isSafeInteger(data.factionWar.totalMerit) || data.factionWar.totalMerit < 0)))) {
      throw new Error('无效的累计战功');
    }
    if (data.dungeon !== undefined && (!validRecord(data.dungeon) ||
      (data.dungeon.expeditionId !== undefined && data.dungeon.expeditionId !== null && (typeof data.dungeon.expeditionId !== 'string' || !data.dungeon.expeditionId)))) {
      throw new Error('无效的地下城探索身份');
    }
    if (data.bagCapacity !== undefined && (!Number.isInteger(data.bagCapacity) || data.bagCapacity < 40 || data.bagCapacity > 120 || (data.bagCapacity - 40) % 20 !== 0)) {
      throw new Error('无效的行囊扩容记录');
    }
    if (data.castle !== undefined && (!validRecord(data.castle) ||
      (data.castle.expeditionId !== undefined && data.castle.expeditionId !== null && (typeof data.castle.expeditionId !== 'string' || !data.castle.expeditionId)) ||
      ['accumulatedExp', 'accumulatedGold'].some(key => data.castle[key] !== undefined && (!Number.isSafeInteger(data.castle[key]) || data.castle[key] < 0)) ||
      (data.castle.claimedBossRewards !== undefined && (!Array.isArray(data.castle.claimedBossRewards) ||
        !data.castle.claimedBossRewards.every(floor => [10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100].includes(floor)))))) {
      throw new Error('无效的魔塔首通领取记录');
    }
    if (data.wildVictories !== undefined && (!Number.isSafeInteger(data.wildVictories) || data.wildVictories < 0)) {
      throw new Error('无效的野外讨伐计数');
    }
    const validNumbers = value => validRecord(value) && Object.values(value).every(n => Number.isFinite(n));
    const validPendingReforge = value => {
      const affix = value?.affix;
      const cfg = REFORGE_AFFIXES.find(entry => entry.id === affix?.id);
      return validRecord(value) && typeof value.rollId === 'string' && value.rollId.length > 0 && validRecord(affix) && cfg && affix.stat === cfg.stat && affix.name === cfg.name && affix.unit === (cfg.unit || '') && Number.isInteger(affix.val) && affix.val >= cfg.min && affix.val <= cfg.max && typeof affix.crystalUsed === 'string';
    };
    const validItem = item => validRecord(item) && typeof item.id === 'string' &&
      (item.count === undefined || (Number.isInteger(item.count) && item.count > 0)) &&
      (item.stats === undefined || validNumbers(item.stats)) &&
      (item.pendingReforge === undefined || (typeof item.uid === 'string' && validPendingReforge(item.pendingReforge)));
    if ((data.bag && !data.bag.every(validItem)) ||
      (data.pets && !data.pets.every(pet => validRecord(pet) && typeof pet.id === 'string' &&
        Number.isInteger(pet.level) && pet.level >= 1 && pet.level <= 100 &&
        (pet.exp === undefined || (Number.isFinite(pet.exp) && pet.exp >= 0)) &&
        (pet.stamina === undefined || (Number.isFinite(pet.stamina) && pet.stamina >= 0 && pet.stamina <= 100)) &&
        validNumbers(pet.apt) && ['str', 'int', 'dex', 'con'].every(key => Number.isFinite(pet.apt[key])) &&
        (pet.skills === undefined || (Array.isArray(pet.skills) && pet.skills.every(id => typeof id === 'string'))))) ||
      (data.equipped && !Object.values(data.equipped).every(item => item === null || validItem(item))) ||
      (data.allocatedStats !== undefined && (!validNumbers(data.allocatedStats) ||
        !['str', 'int', 'dex', 'con'].every(key => Number.isFinite(data.allocatedStats[key]))))) {
      throw new Error('无效的存档物品、神兽或潜能数据');
    }
    return data;
  },

  // 导入外部 JSON 恢复数据
  importJSON(file, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = this.parseBackupText(event.target.result);
        callback(null, data);
      } catch (err) {
        callback(err);
      }
    };
    reader.readAsText(file);
  }
};

