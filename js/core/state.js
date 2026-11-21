// 全局状态管理器与深度单机属性计算 (100% 贴合《魔塔世界》百度百科原著)
import { CLASSES, getClassSkills, getSkillTraining } from '../config/classes.js';
import { getPetParty } from './petParty.js';
import { ITEM_SLOTS, QUALITIES, OFFICIAL_SETS, SPECIAL_ITEMS, REFORGE_AFFIXES, generateEquipment, specializeEquipment, applyCanonicalItemName, getSocketCap, hasDurability } from '../config/items.js';
import { DUNGEON_GATES, DUNGEON_CLEAR_SUPPLIES, DUNGEON_FIRST_CLEAR_STORIES, getDungeonFloorGuard, generateDungeonDrop } from '../config/dungeons.js';
import { DRAGON_TRIALS } from '../config/dragonSlaying.js';
import { ROYAL_TRIALS } from '../config/trials.js';
import { ARENA_RANKS, ARENA_OPPONENTS, PRESTIGE_SHOP_ITEMS } from '../config/arena.js';
import { QUEST_LIST, getQuestList } from '../config/quests.js';
import { levelExperience, getRegionalStory, getInvestigationSteps, getInvestigationEarnedExperience } from '../config/story.js';
import { TAVERN_BOUNTIES, TAVERN_DRINKS } from '../config/tavern.js';
import { COMMISSIONS, getCommission, normalizeCommissions, getCommissionEquipment } from '../config/commissions.js';
import { RUNES } from '../config/runes.js';
import { MILITARY_RANKS, STRONGHOLDS, FACTION_REWARDS } from '../config/factionWar.js';
import { getUnlockedRelics } from '../config/relics.js';
import { CITY_SHOPS, SHOP_PRESTIGE_TIERS, SHOP_CATEGORIES, ENABLE_CITY_SHOPS, prestigeTierOf } from '../config/shops.js';
import { CITIES, CITY_ORDER, CITY_SPECIAL_REWARDS, ENABLE_CITIES } from '../config/cities.js';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../config/achievements.js';
import { storage } from './storage.js';
import { MAPS } from '../config/maps.js';
import { getTowerFloorData, LANDMARK_BOSSES } from '../config/towerLevels.js';
import { canRetryFinale } from './journey.js';
import { createActionClock, actionDayKey, ACTION_POINTS } from './actionClock.js';
import * as heroStatsDomain from './domains/heroStatsDomain.js';
import * as petDomain from './domains/petDomain.js';
import * as estateDomain from './domains/estateDomain.js';

export class GameState {
  constructor() {
    this.listeners = [];
    this.systemLogs = [];
    this.data = this.createDefaultData();
    this.initDefaultLogs();
  }

  initDefaultLogs() {
    this.addSystemLog('欢迎降临亚诺大陆！重温《魔塔世界》的魔幻冒险！', 'system', false);
    this.addSystemLog('主线指引已启动，可随时查阅底部【任务追踪】获取丰厚冒险赏赐。', 'quest', false);
  }

  addSystemLog(text, type = 'system', publish = true) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const logItem = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      time: timeStr,
      type, // 'obtain' | 'battle' | 'quest' | 'forge' | 'pet' | 'estate' | 'system'
      text
    };
    if (!this.systemLogs) this.systemLogs = [];
    this.systemLogs.push(logItem);
    if (this.systemLogs.length > 80) {
      this.systemLogs.shift();
    }
    if (publish) this.notify();
    return logItem;
  }

  createDefaultData() {
    return {
      name: '兰斯洛特',
      nation: 'aden', // 亚丁 (Aden)、克斯特 (Kester)、萨格尔 (Sagael)
      classId: 'warrior',
      title: '见习勇者',
      hasChosenClass: false,
      onboardingVersion: 1,
      level: 1,
      exp: 0,
      gold: 0,
      crystal: 0,
      prestige: 0,
      freeStatPoints: 0,
      wildVictories: 0,
      bagCapacity: 40,
      allocatedStats: { str: 0, int: 0, dex: 0, con: 0 },

      // 新角色从空行囊开始，装备和伙伴由冒险获得。
      equipped: Object.fromEntries(ITEM_SLOTS.map(slot => [slot.id, null])),
      bag: [],
      pets: [],
      activePetId: null,
      supportPetIds: [null, null],
      skillTraining: { ranks: {}, preferredAttackId: null },

      // 古堡探险 (原著魔塔钥匙进阶机制)
      castle: {
        expeditionId: null,
        claimedBossRewards: [],
        finished: false,
        floor: 1,
        maxReachedFloor: 1,
        accumulatedExp: 0,
        accumulatedGold: 0,
        accumulatedDrops: [],
        petExpPool: {},
        isExploring: false,
        entriesLeft: 3
      },

      // 副本七大门
      dungeon: {
        entriesLeft: 5,
        activeGateId: null,
        activeGateFloor: 1,
        expeditionId: null,
        clearedGates: {}
      },

      // 屠龙系统
      dragon: {
        activeChallenge: null,
        trialsLeft: 4,
        cleared: {}
      },

      // 侍从/家奴系统 (俘获、安抚防抢、折磨榨取、劳作采矿、副本助战)
      slaves: { list: [], assistingSlaveId: null },

      // 王宫幻境试炼与八大封号
      royalTrials: {
        currentTitle: '见习勇者',
        completedStage: 0
      },

      // 钓鱼收获
      fishing: {
        lamprey: 0,  // 七鳃鳗
        arowana: 0,  // 金龙鱼
        exchangeDay: 0,
        exchangeCount: 0
      },

      // 暗影女盗奇遇
      maskedThief: {
        appeared: true,
        location: '幽魂沼泽',
        hp: 8000,
        maxHp: 8000
      },

      // 庄园炼金与佣兵
      estate: {
        herbs: {
          herb_dragonblood: 0,
          herb_starlight: 0,
          herb_spiritflower: 0
        },
        activePotions: [],
        hiredMercId: null,
        lastHarvestTime: Date.now(),
        harvestedToday: 0
      },

      // 野外巡航与当前探索点
      currentMapId: 'forest',
      lastIdleClaimTime: Date.now(),
      lastIdleClaimDay: 0,
      idleMinutesClaimed: 0,

      // 主线任务指引系统
      currentQuestId: 'quest_1',
      questProgress: {
        quest_1: { current: 0, completed: false }
      },
      commissions: {},

      // 行动日时钟：天数由有效行动点推进，不依赖现实时间
      actionClock: createActionClock(),
      dailyResetDay: 1,
      lastSalaryDay: 0,

      // 每日活动记录（旧字段保留兼容，不再作为判定依据）
      lastSalaryDate: null,
      dailyResetDate: this.getResetDayKey(1),

      // 王国角斗场与天梯对决
      arena: {
        activeChallenge: null,
        points: 1000,
        rankTitle: '青铜角斗士',
        challengesLeft: 5,
        lastResetDate: this.getResetDayKey(1)
      },

      // 皇家酒馆与赏金悬赏榜
      tavern: {
        bounties: [
          { id: 'bounty_shadow_wolf', status: 'available' },
          { id: 'bounty_masked_thief', status: 'available' },
          { id: 'bounty_swamp_toad', status: 'available' },
          { id: 'bounty_canyon_wyvern', status: 'available' }
        ],
        drinkBuff: null,
        lastResetDate: this.getResetDayKey(1)
      },

      // 三大阵营边境要塞争夺战
      factionWar: {
        merit: 0,
        totalMerit: 0,
        militaryRank: 'recruit',
        strongholds: {
          silverwing: { captured: false, progress: 0 },
          blackiron: { captured: false, progress: 0 },
          moonshadow: { captured: false, progress: 0 }
        },
        dailyClaimed: false,
        lastResetDate: new Date().toDateString()
      },

      // 城市商店（每行动日限购刷新；声望只作解锁门槛）
      shops: {
        day: 1,
        purchase: {}
      },

      // 主城与城际传送（C3）：当前城市 + 各城特色资源点领取记录
      currentCity: 'capital',
      cities: { keste: { specialClaimedDay: 0 }, aden: { specialClaimedDay: 0 } },

      // 称号 / 成就墙（C4-P0）：已领取成就 + 当前展示称号（纯展示）
      achievements: { claimed: [], activeTitle: null },

      // 远古神圣圣遗物系统 (魔塔 50~100 层终焉成就觉醒)
      relics: {
        unlocked: [],
        activeRelics: []
      },

      lastSaved: Date.now()
    };
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      const idx = this.listeners.indexOf(fn);
      if (idx !== -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.data));
    storage.save(this.data);
  }

  // 重置为新游戏初始状态
  resetToNewGame() {
    this.data = this.createDefaultData();
    this.notify();
  }

  // 检查本行动日是否已领俸禄
  canClaimSalary() {
    return this.data.lastSalaryDay !== this.getActionDay();
  }

  // 领取本行动日俸禄
  claimSalary() {
    const day = this.getActionDay();
    if (this.data.lastSalaryDay === day) {
      return { success: false, msg: '本行动日俸禄已全额领受！完成更多行动进入下一行动日后可再度面圣领赏！' };
    }
    this.data.lastSalaryDay = day;
    this.gainCurrency(1500, 20, 0);
    this.triggerQuestAction('claim_salary');
    this.addSystemLog('【王宫】恭敬晋谒圣王，成功领受今日骑士俸禄：1,500 金币、20 魔晶！', 'estate');
    this.notify();
    return { success: true, msg: '恭敬晋谒圣王！成功领受今日王国俸禄：金币 +1500，魔晶 +20！' };
  }

  loadOrInit() {
    const saved = storage.load();
    const defaults = this.createDefaultData();
    if (saved) {
      this.data = { ...defaults, ...saved };
      // Existing saves keep access; staged discovery applies only to new journeys.
      this.data.onboardingVersion = saved.onboardingVersion ?? 0;
      // 核心保障：每一个存档只需选择一次职业，已存在的存档永久锁定已选职业，绝不重复弹出创角界面
      this.data.hasChosenClass = saved.hasChosenClass !== false;
      if (!Number.isSafeInteger(this.data.wildVictories) || this.data.wildVictories < 0) this.data.wildVictories = 0;
      this.data.bagCapacity = this.getBagCapacity();
      // 确保新加入模块及深层字段深度健全
      this.data.nation = this.data.nation || defaults.nation;
      this.data.classId = this.data.classId || defaults.classId;
      this.data.castle = { ...defaults.castle, ...(saved.castle || {}) };
      if (this.data.castle.isExploring && (typeof this.data.castle.expeditionId !== 'string' || !this.data.castle.expeditionId)) {
        this.data.castle.expeditionId = this.createDungeonExpeditionId();
      }
      this.data.castle.claimedBossRewards = [...new Set((Array.isArray(this.data.castle.claimedBossRewards) ? this.data.castle.claimedBossRewards : []).filter(floor => Number.isInteger(floor) && LANDMARK_BOSSES[floor]))];
      this.data.castle.petExpPool = this.data.castle.petExpPool && typeof this.data.castle.petExpPool === 'object' ? this.data.castle.petExpPool : {};
      this.data.dungeon = { ...defaults.dungeon, ...(saved.dungeon || {}) };
      this.data.dungeon.clearedGates = { ...(saved.dungeon?.clearedGates || {}) };
      if (this.data.dungeon.activeGateId && (typeof this.data.dungeon.expeditionId !== 'string' || !this.data.dungeon.expeditionId)) {
        this.data.dungeon.expeditionId = this.createDungeonExpeditionId();
      }
      this.data.dragon = { ...defaults.dragon, ...(saved.dragon || {}) };
      // 战斗动画不跨刷新恢复，已消耗次数保留；旧挑战身份失效，避免锁死/补发。
      this.data.dragon.activeChallenge = null;
      this.data.dragon.cleared = { ...(saved.dragon?.cleared || {}) };
      this.data.slaves = { ...defaults.slaves, ...(saved.slaves || {}) };
      if (!Array.isArray(this.data.slaves.list)) this.data.slaves.list = defaults.slaves.list;
      this.data.royalTrials = { ...defaults.royalTrials, ...(saved.royalTrials || {}) };
      this.data.fishing = { ...defaults.fishing, ...(saved.fishing || {}) };
      this.data.maskedThief = { ...defaults.maskedThief, ...(saved.maskedThief || {}) };
      this.data.estate = { ...defaults.estate, ...(saved.estate || {}) };
      this.data.estate.herbs = { ...defaults.estate.herbs, ...(saved.estate?.herbs || {}) };
      this.data.estate.activePotions = Array.isArray(this.data.estate.activePotions) ? this.data.estate.activePotions : [];
      if (this.data.estate.hiredMercId === undefined) this.data.estate.hiredMercId = defaults.estate.hiredMercId;
      if (!this.data.currentMapId) this.data.currentMapId = 'forest';
      if (!this.data.currentQuestId) this.data.currentQuestId = 'quest_1';
      this.data.questProgress = { ...defaults.questProgress, ...(saved.questProgress || {}) };
      this.data.commissions = normalizeCommissions(saved.commissions);
      this.data.equipped = { ...defaults.equipped, ...(saved.equipped || {}) };
      for (const slot of ITEM_SLOTS) {
        const item = this.data.equipped[slot.id];
        if (item && !item.reqClass) this.data.equipped[slot.id] = specializeEquipment(item, this.data.classId);
      }
      // 首饰无耐久（原作规则）：旧档残留的耐久字段读取时忽略。
      for (const slotId of ['necklace', 'ring', 'bracelet']) {
        const item = this.data.equipped[slotId];
        if (item) { delete item.durability; delete item.maxDurability; }
      }
      if (Array.isArray(this.data.bag)) this.data.bag = this.data.bag.map(item => {
        const normalized = applyCanonicalItemName(item?.slot && !item.reqClass ? specializeEquipment(item, this.data.classId) : item);
        if (normalized && (normalized.slot === 'necklace' || normalized.slot === 'ring' || normalized.slot === 'bracelet')) {
          delete normalized.durability; delete normalized.maxDurability;
        }
        return normalized;
      });
      // 旧王都结业存档接入重制续章，不重新发放已经领取的20章奖励。
      if (this.data.currentQuestId === 'completed' && this.data.questProgress.quest_20?.claimed && !this.data.questProgress.quest_26?.claimed) {
        const next = QUEST_LIST.find(quest => quest.milestone && !this.data.questProgress[quest.id]?.claimed);
        if (next) this.data.currentQuestId = next.id;
      }
      this.data.lastSalaryDate = saved.lastSalaryDate || null;
      this.data.arena = { ...defaults.arena, ...(saved.arena || {}) };
      this.data.arena.activeChallenge = null;
      this.data.actionClock = { ...createActionClock(), ...(saved.actionClock || {}) };
      this.data.dailyResetDay = Number.isSafeInteger(saved.dailyResetDay) ? saved.dailyResetDay : 1;
      const hasLegacyResetDate = saved.actionClock && /^\w{3} \w{3} \d{2} \d{4}$/.test(saved.dailyResetDate);
      if (hasLegacyResetDate) {
        if (!Number.isSafeInteger(saved.dailyResetDay)) this.data.dailyResetDay = this.getActionDay();
        this.data.dailyResetDate = this.getResetDayKey(this.data.dailyResetDay);
      }
      const savedResetKey = this.getResetDayKey(this.data.dailyResetDay);
      this.data.lastSalaryDay = Number.isSafeInteger(saved.lastSalaryDay) ? saved.lastSalaryDay : 0;
      this.data.lastIdleClaimDay = Number.isSafeInteger(saved.lastIdleClaimDay) ? saved.lastIdleClaimDay : 0;
      this.data.idleMinutesClaimed = Number.isSafeInteger(saved.idleMinutesClaimed) ? saved.idleMinutesClaimed : 0;
      this.data.estate.harvestedToday = Number.isSafeInteger(this.data.estate.harvestedToday) ? this.data.estate.harvestedToday : 0;
      // 旧档首次迁移：建立第 1 行动日并刷新每日配额；不追溯宠物体力，也不发放额外资源。
      if (!saved.actionClock) {
        this.data.dailyResetDay = 1;
        this.data.dailyResetDate = this.getResetDayKey(1);
        this.data.castle.entriesLeft = 3;
        this.data.dungeon.entriesLeft = 5;
        this.data.dragon.trialsLeft = 4;
        this.data.arena.challengesLeft = 5;
        this.data.arena.activeChallenge = null;
      }

      // 皇家酒馆数据迁移
      this.data.tavern = { ...defaults.tavern, ...(saved.tavern || {}) };
      for (const activity of ['arena', 'tavern']) {
        const savedKey = saved[activity]?.lastResetDate;
        this.data[activity].lastResetDate = saved.actionClock && /^action-day-\d+$/.test(savedKey)
          ? savedKey : savedResetKey;
      }
      if (!Array.isArray(this.data.tavern.bounties) || this.data.tavern.bounties.length === 0) {
        this.data.tavern.bounties = defaults.tavern.bounties;
      }

      // 三大阵营边境要塞数据健全
      this.data.factionWar = { ...defaults.factionWar, ...(saved.factionWar || {}) };
      this.data.factionWar.totalMerit = this.getTotalFactionMerit();
      if (!this.data.factionWar.strongholds) this.data.factionWar.strongholds = defaults.factionWar.strongholds;
      if (!saved.actionClock) {
        this.data.tavern.bounties = TAVERN_BOUNTIES.map(bounty => ({ id: bounty.id, status: 'available' }));
        this.data.tavern.drinkBuff = null;
        this.data.factionWar.dailyClaimed = false;
      }

      // 城市商店数据健全：旧档自动补默认（无迁移、不丢档）；跨行动日购买记录按当前行动日初始化
      this.data.shops = {
        day: Number.isSafeInteger(saved.shops?.day) ? saved.shops.day : this.getActionDay(),
        purchase: (saved.shops && saved.shops.purchase && typeof saved.shops.purchase === 'object') ? { ...saved.shops.purchase } : {}
      };
      if (this.data.shops.day !== this.getActionDay()) { this.data.shops.day = this.getActionDay(); this.data.shops.purchase = {}; }

      // 主城数据健全：旧档默认王都、特色资源点领取记录自动补（无迁移、不丢档）
      this.data.currentCity = CITIES[saved.currentCity] ? saved.currentCity : 'capital';
      if (!ENABLE_CITIES) this.data.currentCity = 'capital';
      this.data.cities = {
        keste: { specialClaimedDay: Number.isSafeInteger(saved.cities?.keste?.specialClaimedDay) ? saved.cities.keste.specialClaimedDay : 0 },
        aden: { specialClaimedDay: Number.isSafeInteger(saved.cities?.aden?.specialClaimedDay) ? saved.cities.aden.specialClaimedDay : 0 }
      };
      // 称号/成就墙数据健全：旧档补默认（无迁移、不丢档）
      this.data.achievements = {
        claimed: Array.isArray(saved.achievements?.claimed) ? [...new Set(saved.achievements.claimed.filter(x => typeof x === 'string'))] : [],
        activeTitle: typeof saved.achievements?.activeTitle === 'string' ? saved.achievements.activeTitle : null
      };

      // 远古神圣圣遗物数据健全与自动觉醒
      this.data.relics = { ...defaults.relics, ...(saved.relics || {}) };
      if (!Array.isArray(this.data.relics.unlocked)) this.data.relics.unlocked = [];
      const maxReached = this.data.castle?.maxReachedFloor || 1;
      const shouldUnlock = getUnlockedRelics(maxReached).map(r => r.id);
      for (const rid of shouldUnlock) {
        if (!this.data.relics.unlocked.includes(rid)) {
          this.data.relics.unlocked.push(rid);
        }
      }

      if (!this.data.equipped) this.data.equipped = defaults.equipped;
      if (!Array.isArray(this.data.bag)) this.data.bag = defaults.bag;
      for (const slot of ITEM_SLOTS) {
        const item = this.data.equipped[slot.id];
        if (item?.reqClass && item.reqClass !== this.data.classId) {
          this.data.bag.push(item);
          this.data.equipped[slot.id] = null;
        }
      }
      if (!Array.isArray(this.data.pets)) this.data.pets = defaults.pets;
      const party = getPetParty(this.data);
      this.data.activePetId = party[0].pet?.id || null;
      this.data.supportPetIds = party.slice(1).map(member => member.pet?.id || null);
      const savedTraining = saved.skillTraining;
      const ranks = Object.fromEntries(CLASSES[this.data.classId].skills.flatMap(skill => {
        const rank = savedTraining?.ranks?.[skill.id];
        return Number.isInteger(rank) && rank >= 1 && rank <= 10 ? [[skill.id, rank]] : [];
      }));
      this.data.skillTraining = { ranks, preferredAttackId: CLASSES[this.data.classId].skills.some(skill => skill.id === savedTraining?.preferredAttackId && skill.category === 'attack') ? savedTraining.preferredAttackId : null };
      for (const item of [...this.data.bag, ...Object.values(this.data.equipped)]) {
        if (item?.id === 'crystal_protect') item.id = 'protect_crystal';
        if (!item?.slot) continue;
        if (item.id === 'courage_shield') {
          item.id = 'courage_gloves';
          item.name = '勇气精钢护手';
          item.slot = 'gloves';
          item.icon = 'images/items/eq_gloves.svg';
          if (item.desc) item.desc = '勇气套装的精钢护手。';
        }
        if (item.reqLevel === undefined && Number.isFinite(item.level)) item.reqLevel = item.level;
        if (!item.setId && item.set) item.setId = item.set;
        if (item.sockets === undefined && Number.isFinite(item.holes)) item.sockets = item.holes;
        if (hasDurability(item.slot) && item.durability === undefined) item.durability = 100;
        if (hasDurability(item.slot) && item.maxDurability === undefined) item.maxDurability = 100;
        if (!item.uid) item.uid = globalThis.crypto?.randomUUID?.() || 'eq_' + Date.now() + '_' + (this.equipmentUidCounter = (this.equipmentUidCounter || 0) + 1);
      }
      for (const slot of ['offhand', 'shield']) {
        const item = this.data.equipped[slot];
        if (item?.id !== 'courage_gloves') continue;
        if (!this.data.equipped.gloves) this.data.equipped.gloves = item;
        else this.data.bag.push(item);
        delete this.data.equipped[slot];
      }

      // 仅为缺失字段迁移默认值，不按消耗后的库存补发物品。
      this.reconcileQuestMilestones();

      // 固化更新至当前存档
      storage.save(this.data);
    } else {
      // 空槽位保存未完成创角的状态，确认国家与职业后才锁定。
      this.data = defaults;
      storage.save(this.data);
    }
    this.resetDailyActivities();
  }

  // 当前行动日（第几天）
  getActionDay() {
    const day = this.data.actionClock?.day;
    return Number.isSafeInteger(day) && day > 0 ? day : 1;
  }

  getResetDayKey(day = this.getActionDay()) {
    return actionDayKey(day);
  }

  // 当前行动日进度（0 ~ pointsPerDay-1）
  getActionPoints() {
    const points = this.data.actionClock?.points;
    return Number.isFinite(points) && points >= 0 ? Math.floor(points) : 0;
  }

  // 统一行动点入口：达到阈值推进“行动日”，并集中重置所有每日内容。
  addActionPoints(points) {
    const amount = Math.max(0, Math.floor(Number(points) || 0));
    if (!amount) return { advanced: false, day: this.getActionDay(), points: this.getActionPoints() };
    if (!this.data.actionClock) this.data.actionClock = createActionClock();
    const clock = this.data.actionClock;
    clock.pointsPerDay = Number.isSafeInteger(clock.pointsPerDay) && clock.pointsPerDay > 0 ? clock.pointsPerDay : 30;
    clock.points = Math.max(0, Math.floor(Number(clock.points) || 0)) + amount;
    clock.totalActions = (Number.isSafeInteger(clock.totalActions) ? clock.totalActions : 0) + 1;
    let advanced = false;
    while (clock.points >= clock.pointsPerDay) {
      clock.points -= clock.pointsPerDay;
      clock.day = this.getActionDay() + 1;
      this.resetDailyActivities(clock.day);
      this.addSystemLog(`【行动日】第 ${clock.day} 天开始：每日次数、俸禄、悬赏、饮品与巡逻已刷新。`, 'system');
      advanced = true;
    }
    this.notify();
    return { advanced, day: clock.day, points: clock.points };
  }

  // 兼容旧测试/旧调用：传入旧日期字符串视为强制刷新；不传则按行动日防重入。
  resetDailyActivities(target = null) {
    const currentDay = this.getActionDay();
    const forcedByLegacy = typeof target === 'string' && !/^action-day-\d+$/.test(target);
    const targetDay = Number.isSafeInteger(target) && target > 0 ? target : currentDay;
    const legacyDateMismatch = typeof this.data.dailyResetDate === 'string' && this.data.dailyResetDate !== this.getResetDayKey();
    if (!forcedByLegacy && !legacyDateMismatch && this.data.dailyResetDay === targetDay) return false;
    this.data.dailyResetDay = targetDay;
    const resetKey = this.getResetDayKey(targetDay);
    this.data.dailyResetDate = resetKey;
    this.data.castle.entriesLeft = 3;
    this.data.dungeon.entriesLeft = 5;
    this.data.dragon.trialsLeft = 4;
    this.data.arena.challengesLeft = 5;
    this.data.arena.activeChallenge = null;
    this.data.arena.lastResetDate = resetKey;
    const previousBounties = Array.isArray(this.data.tavern.bounties) ? this.data.tavern.bounties : [];
    this.data.tavern.bounties = TAVERN_BOUNTIES.map(bounty => {
      const previous = previousBounties.find(entry => entry.id === bounty.id);
      // 已接取/已就绪的悬赏跨日保留，避免玩家打完却因跨日刷新丢掉领奖资格。
      if (previous && (previous.status === 'in_progress' || previous.status === 'ready_to_claim')) return previous;
      return { id: bounty.id, status: 'available' };
    });
    this.data.tavern.drinkBuff = null;
    this.data.tavern.lastResetDate = resetKey;
    this.data.factionWar.dailyClaimed = false;
    this.data.factionWar.lastResetDate = resetKey;
    this.data.estate.harvestedToday = 0;
    this.data.lastIdleClaimDay = 0;
    this.data.idleMinutesClaimed = 0;
    // 城市商店：每行动日重置限购记录
    if (!this.data.shops) this.data.shops = { day: targetDay, purchase: {} };
    this.data.shops.day = targetDay;
    this.data.shops.purchase = {};
    // 各城特色资源点：每行动日重置领取记录
    if (!this.data.cities) this.data.cities = {};
    for (const cid of ['keste', 'aden']) {
      if (!this.data.cities[cid]) this.data.cities[cid] = { specialClaimedDay: 0 };
      this.data.cities[cid].specialClaimedDay = 0;
    }
    // 宠物体力按行动日衰减（与 §4.1 三阈值配套）。
    for (const pet of this.data.pets || []) pet.stamina = Math.max(0, (pet.stamina ?? 100) - 10);
    storage.save(this.data);
    return true;
  }


  // 经验升级计算
  getNextLevelExp(level) {
    return levelExperience(level);
  }

  addPetExperience(pet, amount) {
    return petDomain.addPetExperience(this, pet, amount);
  }

  addExp(amount, publish = true, grantPets = true) {
    const previousSkills = new Set(getClassSkills(this.data.classId, 0, this.data).map(skill => skill.id || skill.name));
    if (!Number.isFinite(amount) || amount <= 0) return false;
    this.data.exp += amount;
    if (grantPets) {
      for (const { pet, slot } of getPetParty(this.data)) {
        if (!pet) continue;
        // 宠物经验不再受体力影响；主宠全额、副宠一半。
        this.addPetExperience(pet, slot === 0 ? amount : Math.floor(amount / 2));
      }
    }
    let leveledUp = false;
    let nextExp = this.getNextLevelExp(this.data.level);

    while (this.data.exp >= nextExp && this.data.level < 100) {
      this.data.exp -= nextExp;
      this.data.level += 1;
      this.data.freeStatPoints += 6;
      leveledUp = true;
      this.addSystemLog(`恭喜勇者晋升至 Lv.${this.data.level}！获得 6 点自由分配潜能点！`, 'system', publish);
      nextExp = this.getNextLevelExp(this.data.level);
    }
    if (this.data.onboardingVersion === 2 && leveledUp) {
      const learned = getClassSkills(this.data.classId, 0, this.data).filter(skill => !previousSkills.has(skill.id || skill.name));
      if (learned.length) this.addSystemLog(`【职业成长】掌握了${learned.map(skill => '【' + skill.name + '】').join('、')}，会在后续战斗中生效。`, 'quest', false);
    }
    if (publish) this.notify();
    return leveledUp;
  }

  gainCurrency(gold = 0, crystal = 0, prestige = 0, publish = true) {
    this.data.gold += gold;
    this.data.crystal += crystal;
    this.data.prestige += prestige;
    const parts = [];
    if (gold > 0) parts.push(`金币 +${gold.toLocaleString()}`);
    if (crystal > 0) parts.push(`魔晶 +${crystal.toLocaleString()}`);
    if (prestige > 0) parts.push(`声望 +${prestige.toLocaleString()}`);
    if (parts.length > 0) {
      this.addSystemLog(`获得财富奖励：${parts.join('，')}`, 'obtain', publish);
    }
    if (publish) this.notify();
  }

  // 获取当前职业与转职进阶全称 (见习 -> 魔 -> 幻 -> 影 -> 皇家 -> 圣 -> 神 -> 绝地)
  getPromotedClassName(targetClassId = null, stageIndex = null) {
    const classId = targetClassId || this.data.classId || 'warrior';
    const completedStage = stageIndex !== null && stageIndex !== undefined ? stageIndex : (this.data.royalTrials?.completedStage || 0);

    const initialNames = {
      warrior: '见习战士',
      mage: '见习法师',
      hunter: '见习猎人'
    };

    if (completedStage <= 0) {
      return initialNames[classId] || '见习勇者';
    }

    const trialIdx = Math.min(completedStage - 1, ROYAL_TRIALS.length - 1);
    const trial = ROYAL_TRIALS[trialIdx];
    if (trial && trial.classPromotions && trial.classPromotions[classId]) {
      return trial.classPromotions[classId].title;
    }

    return `${trial ? trial.title : ''}·${initialNames[classId] || '勇者'}`;
  }

  completeRoyalTrial(stage) {
    const current = this.data.royalTrials.completedStage || 0;
    const trial = ROYAL_TRIALS[stage];
    if (!Number.isInteger(stage) || stage !== current || !trial) return { success: false, msg: '试炼阶位已变化或已完成。' };
    if (this.data.level < trial.level || this.data.prestige < trial.fameReq) return { success: false, msg: '等级或声望尚未达到册封要求。' };
    this.data.royalTrials.completedStage = stage + 1;
    this.data.royalTrials.currentTitle = trial.title;
    this.data.title = trial.title;
    this.addExp(trial.level * 200);
    this.gainCurrency(trial.level * 100, 50, 0);
    this.reconcileQuestMilestones();
    this.triggerQuestAction('royal_trials', 1);
    this.addActionPoints(ACTION_POINTS.trial);
    this.notify();
    return { success: true, title: this.getPromotedClassName() };
  }

  // 获取转职阶位详细描述与晋升境界
  getPromotedClassInfo(targetClassId = null, stageIndex = null) {
    const classId = targetClassId || this.data.classId || 'warrior';
    const completedStage = stageIndex !== null && stageIndex !== undefined ? stageIndex : (this.data.royalTrials?.completedStage || 0);

    if (completedStage <= 0) {
      return {
        stage: 0,
        title: this.getPromotedClassName(classId, 0),
        desc: '亚诺大陆初入试炼之地的见习勇士。'
      };
    }

    const trialIdx = Math.min(completedStage - 1, ROYAL_TRIALS.length - 1);
    const trial = ROYAL_TRIALS[trialIdx];
    const promo = trial?.classPromotions?.[classId];
    return {
      stage: completedStage,
      title: promo ? promo.title : `${trial.title}阶`,
      desc: promo ? promo.desc : trial.rewardDesc
    };
  }

  // 综合有效战斗属性计算
  getEffectiveStats(equipped = this.data.equipped) {
    return heroStatsDomain.getEffectiveStats(this.data, equipped);
  }

  // 喂养神兽 (恢复体力)
  brewPotion(recipeId) {
    return estateDomain.brewPotion(this, recipeId);
  }

  hireMercenary(id) {
    return estateDomain.hireMercenary(this, id);
  }

  harvestEstate(now = Date.now()) {
    return estateDomain.harvestEstate(this, now);
  }

  getExplorationReward(gold, crystal = 0) {
    return estateDomain.getExplorationReward(this.data, gold, crystal);
  }

  createTowerFirstClearItem(floor) {
    if (this.data.onboardingVersion === 2 && floor === 10) return { ...SPECIAL_ITEMS.star_crystal, count: 3 };
    const id = LANDMARK_BOSSES[floor]?.firstClearReward.item;
    if (!id) return null;
    if (RUNES[id]) return { ...RUNES[id], stats: { ...RUNES[id].stats }, count: 1 };
    const questItem = getQuestList(this.data).flatMap(quest => quest.rewards.items || []).find(item => item.id === id);
    if (questItem) {
      const gear = generateEquipment(questItem.slot, questItem.level || floor, 'darkgold', questItem.set || 'courage');
      return specializeEquipment({ ...gear, ...questItem, quality: questItem.quality === 'purple' ? 'darkgold' : questItem.quality, stats: { ...questItem.stats } }, this.data.classId);
    }
    const templates = {
      n_heart_ruby: ['necklace', '红宝石之心', 'darkgold', null],
      destiny_staff: ['weapon', '命运女神·星辉法杖', 'purplegold', 'destiny_goddess'],
      destiny_robe: ['armor', '命运女神·星辰法袍', 'purplegold', 'destiny_goddess'],
      destiny_ring: ['ring', '命运女神·星轨指环', 'purplegold', 'destiny_goddess'],
      dragon_slayer_blade: ['weapon', '战神·屠龙之刃', 'purplegold', 'wargod_set'],
      dragon_slayer_plate: ['armor', '战神·屠龙胸甲', 'purplegold', 'wargod_set'],
      dragon_slayer_gloves: ['gloves', '战神·屠龙护手', 'purplegold', 'wargod_set']
    };
    const template = templates[id];
    if (!template) throw new Error(`未定义的魔塔首通奖励：${id}`);
    const [slot, name, quality, setId] = template;
    const gear = generateEquipment(slot, floor, quality, setId);
    if (!Object.keys(gear.stats).length) gear.stats.hp = Math.floor((60 + floor * 18) * QUALITIES[quality].multiplier);
    return specializeEquipment({ ...gear, id, name }, this.data.classId);
  }

  startCastleExpedition(keyId) {
    const startFloor = { key_redwood: 1, key_mithril: 20, key_obsidian: 35, key_bronze: 50, key_titan: 70, key_platinum: 90 }[keyId];
    if (!Number.isInteger(startFloor)) return { success: false, msg: '未知的魔塔钥匙。' };
    const castle = this.data.castle;
    if (castle.isExploring || castle.accumulatedExp !== 0 || castle.accumulatedGold !== 0) return { success: false, msg: '请先结算已有探险，累计收益不会被覆盖。' };
    this.resetDailyActivities();
    const permit = this.data.bag.find(item => item.id === 'royal_castle_permit' && Number.isSafeInteger(item.count) && item.count > 0);
    if (!Number.isInteger(castle.entriesLeft) || castle.entriesLeft < 0 || (castle.entriesLeft === 0 && !permit)) return { success: false, msg: '本行动日3次古堡探险次数已耗尽，需要远征通行令或进入下一行动日。' };
    const key = this.data.bag.find(item => item.id === keyId && Number.isInteger(item.count) && item.count > 0);
    if (!key) return { success: false, msg: '缺少对应钥匙，无法破界！' };
    key.count--;
    if (!key.count) this.data.bag = this.data.bag.filter(item => item !== key);
    if (castle.entriesLeft === 0) { permit.count--; if (!permit.count) this.data.bag = this.data.bag.filter(item => item !== permit); }
    else castle.entriesLeft--;
    castle.expeditionId = this.createDungeonExpeditionId();
    castle.isExploring = true;
    castle.finished = false;
    castle.floor = startFloor;
    this.notify();
    return { success: true, startFloor, expeditionId: castle.expeditionId };
  }

  startFinaleRetry() {
    if (!canRetryFinale(this.data)) return { success: false, msg: '需先抵达100层、交付远征敕令并结算已有探险；龙皇首胜后不再开放此入口。' };
    const castle = this.data.castle;
    castle.expeditionId = this.createDungeonExpeditionId();
    castle.isExploring = true;
    castle.finished = false;
    castle.floor = 100;
    this.notify();
    return { success: true, startFloor: 100, expeditionId: castle.expeditionId };
  }

  finishCastleExpedition(expeditionId, defeatedFloor = null) {
    const castle = this.data.castle;
    if (!castle.isExploring || !expeditionId || castle.expeditionId !== expeditionId ||
      (defeatedFloor !== null && (!Number.isInteger(defeatedFloor) || castle.finished || castle.floor !== defeatedFloor)) ||
      !Number.isSafeInteger(castle.accumulatedExp) || castle.accumulatedExp < 0 ||
      !Number.isSafeInteger(castle.accumulatedGold) || castle.accumulatedGold < 0) {
      return { success: false, msg: '本次探索已结束、已变化或收益异常。' };
    }
    const exp = defeatedFloor === null ? castle.accumulatedExp : Math.floor(castle.accumulatedExp * 0.5);
    const gold = defeatedFloor === null ? castle.accumulatedGold : 0;
    const petExpPool = castle.petExpPool && typeof castle.petExpPool === 'object' ? castle.petExpPool : null;
    // 发奖前使本次身份失效，重复/重入回调无法再次领取。
    castle.isExploring = false;
    castle.expeditionId = null;
    castle.accumulatedExp = 0;
    castle.accumulatedGold = 0;
    this.data.isCastleExplore = false;
    if (petExpPool) {
      // 宠物经验按逐层战前阵容快照发放；失败退出时同样只发一半。
      this.addExp(exp, false, false);
      const factor = defeatedFloor === null ? 1 : 0.5;
      for (const [petId, amount] of Object.entries(petExpPool)) {
        const pet = this.data.pets.find(entry => entry.id === petId);
        if (pet) this.addPetExperience(pet, Math.floor(amount * factor));
      }
    } else {
      // 旧档没有逐层快照：退回旧规则，由 addExp 统一分配。
      this.addExp(exp, false, true);
    }
    castle.petExpPool = {};
    this.gainCurrency(gold, 0, 0, false);
    this.notify();
    return { success: true, exp, gold };
  }

  settleCastleVictory(floor, expeditionId) {
    const castle = this.data.castle;
    if (!Number.isInteger(floor) || floor < 1 || floor > 100 || !castle.isExploring || castle.finished || castle.floor !== floor || !expeditionId || castle.expeditionId !== expeditionId) {
      return { success: false, msg: '当前探险层数已变化或探险已经结束。' };
    }
    const info = getTowerFloorData(floor, this.data.onboardingVersion);
    const firstClear = info.isBoss && !castle.claimedBossRewards.includes(floor);
    const item = firstClear ? this.createTowerFirstClearItem(floor) : null;
    const exp = info.isBoss && !firstClear ? Math.floor(60 * Math.pow(floor, 1.25) + 30) : info.expReward;
    const gold = info.isBoss && !firstClear ? Math.floor(45 * Math.pow(floor, 1.2) + 25) : info.goldReward;
    const crystal = info.isBoss && !firstClear ? Math.floor(floor * 0.8 + 2) : info.crystalReward;
    const reward = this.getExplorationReward(gold, crystal);
    if (firstClear) castle.claimedBossRewards.push(floor);
    castle.petExpPool ||= {};
    for (const { pet, slot } of getPetParty(this.data)) {
      if (pet) castle.petExpPool[pet.id] = (castle.petExpPool[pet.id] || 0) + (slot === 0 ? exp : Math.floor(exp / 2));
    }
    castle.accumulatedExp += exp;
    castle.accumulatedGold += reward.gold;
    castle.floor = Math.min(100, floor + 1);
    castle.finished = floor === 100;
    castle.maxReachedFloor = Math.max(castle.maxReachedFloor || 1, floor);
    const newRelics = this.checkUnlockRelics(floor, false);
    this.reconcileQuestMilestones();
    this.data.crystal += reward.crystal;
    if (item) this.grantBattleLoot(item);
    this.triggerQuestAction('clear_tower', 1);
    if ([1, 10, 20].includes(floor)) this.triggerQuestAction(`clear_tower_${floor}`, 1);
    this.recordCommissionEvent('tower', String(floor));
    this.addActionPoints(ACTION_POINTS.castleFloor);
    this.notify();
    return { success: true, firstClear: Boolean(firstClear), exp, ...reward, item, newRelics };
  }

  startDragonChallenge(dragonId) {
    const dragon = DRAGON_TRIALS.find(item => item.id === dragonId);
    if (!dragon) return { success: false, msg: '未知的巨龙。' };
    if (this.data.level < dragon.minLevel) return { success: false, msg: `等级不足！需达到 Lv.${dragon.minLevel}` };
    if (this.data.dragon.activeChallenge) return { success: false, msg: '当前屠龙讨伐尚未结束。' };
    this.resetDailyActivities();
    if (!Number.isInteger(this.data.dragon.trialsLeft) || this.data.dragon.trialsLeft <= 0) return { success: false, msg: '本行动日屠龙讨伐次数已耗尽！进入下一行动日后再来。' };
    const challengeId = this.createDungeonExpeditionId();
    this.data.dragon.trialsLeft--;
    this.data.dragon.activeChallenge = { dragonId, challengeId };
    this.notify();
    return { success: true, dragon, challengeId };
  }

  settleDragonChallenge(dragonId, challengeId, victory) {
    const dragon = DRAGON_TRIALS.find(item => item.id === dragonId);
    const active = this.data.dragon.activeChallenge;
    if (!dragon || !challengeId || active?.challengeId !== challengeId || active.dragonId !== dragonId || typeof victory !== 'boolean') return { success: false, msg: '本次屠龙讨伐已结束或已变化。' };
    this.data.dragon.activeChallenge = null;
    if (!victory) { this.notify(); return { success: true, victory: false, drops: [] }; }
    const reward = dragon.rewards;
    // 每次胜利保底一件装备；三套金龙装备等概率，装备需求不高于准入等级。
    const setId = reward.equipmentSets[Math.floor(Math.random() * reward.equipmentSets.length)];
    const slot = ITEM_SLOTS[Math.floor(Math.random() * ITEM_SLOTS.length)].id;
    const gear = generateEquipment(slot, dragon.minLevel, reward.equipmentQuality, setId, this.data.classId);
    if (!Object.keys(gear.stats).length) gear.stats.hp = Math.floor((60 + dragon.minLevel * 18) * QUALITIES[reward.equipmentQuality].multiplier);
    const drops = [gear, { ...SPECIAL_ITEMS[reward.material], count: reward.materialCount }];
    if (reward.egg && Math.random() < reward.eggChance) drops.push({ ...SPECIAL_ITEMS.pet_egg, id: reward.egg, name: reward.egg === 'pet_egg_gold' ? '黄金宠物蛋' : '暗金宠物蛋', quality: reward.egg === 'pet_egg_gold' ? 'gold' : 'darkgold', type: 'egg', count: 1 });
    if (reward.extraMaterial && Math.random() < reward.extraChance) drops.push({ ...SPECIAL_ITEMS[reward.extraMaterial], count: 1 });
    drops.forEach(item => this.grantBattleLoot(item));
    const previousClears = Number.isSafeInteger(this.data.dragon.cleared[dragonId]) && this.data.dragon.cleared[dragonId] > 0 ? this.data.dragon.cleared[dragonId] : 0;
    const firstClear = previousClears === 0;
    this.data.dragon.cleared[dragonId] = previousClears + 1;
    const story = firstClear ? dragon.firstVictoryStory : dragon.repeatVictoryText;
    if (firstClear) this.addSystemLog(`【巨龙线索】${story}`, 'quest', false);
    this.addExp(dragon.minLevel * 250, false);
    this.gainCurrency(reward.gold, reward.crystal, reward.prestige, false);
    if (dragonId === 'slay_red_dragon') this.triggerQuestAction('slay_dragon', 1);
    if (dragonId === 'slay_silver_dragon') this.triggerQuestAction('slay_silver_dragon', 1);
    this.addActionPoints(ACTION_POINTS.dragon);
    this.notify();
    return { success: true, victory: true, firstClear, story, drops, exp: dragon.minLevel * 250, ...reward };
  }

  createDungeonExpeditionId() {
    return globalThis.crypto?.randomUUID?.() || 'expedition_' + Date.now() + '_' + (this.dungeonExpeditionCounter = (this.dungeonExpeditionCounter || 0) + 1) + '_' + Math.random().toString(36).slice(2, 8);
  }

  startDungeonExpedition(gateId) {
    const gate = DUNGEON_GATES.find(gate => gate.id === gateId);
    if (!gate) return { success: false, msg: '未知的古门。' };
    if (this.data.level < gate.minLevel) return { success: false, msg: `等级不足！需达到 Lv.${gate.minLevel}` };
    this.resetDailyActivities();
    const dungeon = this.data.dungeon;
    if (dungeon.activeGateId) return { success: false, msg: '已有正在探索的古门，请先完成或撤离。' };
    const permit = this.data.bag.find(item => item.id === 'royal_dungeon_permit' && Number.isSafeInteger(item.count) && item.count > 0);
    if (!Number.isInteger(dungeon.entriesLeft) || dungeon.entriesLeft < 0 || (dungeon.entriesLeft === 0 && !permit)) return { success: false, msg: '本行动日5次副本挑战次数已耗尽，需要调查通行令或进入下一行动日。' };
    if (dungeon.entriesLeft === 0) { permit.count--; if (!permit.count) this.data.bag = this.data.bag.filter(item => item !== permit); }
    else dungeon.entriesLeft--;
    dungeon.activeGateId = gate.id;
    dungeon.activeGateFloor = 1;
    dungeon.expeditionId = this.createDungeonExpeditionId();
    this.notify();
    return { success: true, gate, expeditionId: dungeon.expeditionId };
  }

  retreatDungeonExpedition(expeditionId) {
    const dungeon = this.data.dungeon;
    if (!dungeon.activeGateId || !expeditionId || dungeon.expeditionId !== expeditionId) return { success: false, msg: '本次探索已结束或已变化。' };
    dungeon.activeGateId = null;
    dungeon.activeGateFloor = 1;
    dungeon.expeditionId = null;
    this.notify();
    return { success: true, msg: '已安全退出副本结界，当前探索进度已重置；已用入场次数不返还。' };
  }

  settleDungeonVictory(gateId, floor, expeditionId) {
    const gate = DUNGEON_GATES.find(gate => gate.id === gateId);
    const dungeon = this.data.dungeon;
    if (!gate || !Number.isInteger(floor) || floor < 1 || floor > gate.totalFloors || this.data.level < gate.minLevel ||
      dungeon.activeGateId !== gateId || dungeon.activeGateFloor !== floor || !expeditionId || dungeon.expeditionId !== expeditionId) {
      return { success: false, msg: '探索门、楼层或本次探索已变化，旧战斗不再结算。' };
    }
    const guard = getDungeonFloorGuard(gateId, floor);
    const final = floor === gate.totalFloors;
    const exp = final ? Math.floor(guard.hp * 0.25) : Math.floor(guard.hp * 0.12) + 120;
    const reward = this.getExplorationReward(final ? Math.floor(guard.atk * 4) : Math.floor(guard.atk * 1.5) + 60, final ? 40 : 0);
    const drop = final ? { ...specializeEquipment(generateDungeonDrop(gateId), this.data.classId), reqLevel: gate.minLevel } : null;
    const supplies = final ? (DUNGEON_CLEAR_SUPPLIES[gateId] || []).map(item => ({ ...item })) : [];
    const firstClear = final && !(dungeon.clearedGates[gateId] > 0);
    const story = firstClear ? DUNGEON_FIRST_CLEAR_STORIES[gateId] : '';
    // 先推进/结束此次探索，使相同回调不可重复结算。
    dungeon.activeGateFloor = final ? 1 : floor + 1;
    this.recordRegionalStory('dungeon', gateId, floor);
    if (final) {
      dungeon.activeGateId = null;
      dungeon.expeditionId = null;
      dungeon.clearedGates[gateId] = (dungeon.clearedGates[gateId] || 0) + 1;
      this.grantBattleLoot(drop);
      this.grantBattleLoot({ ...SPECIAL_ITEMS.crystal_darkgold, count: 2 });
      supplies.forEach(item => this.grantBattleLoot(item));
    }
    this.addExp(exp);
    this.gainCurrency(reward.gold, reward.crystal, final ? 120 : 0);
    if (final) {
      this.reconcileQuestMilestones();
      this.triggerQuestAction('clear_dungeon', 1);
      this.addSystemLog(`【古门大捷】通关【${gate.name}】，获得【${drop.name}】和暗金晶石x2。`, 'battle');
      if (story) this.addSystemLog(`【远征线索】${story}`, 'quest');
    }
    this.addActionPoints(ACTION_POINTS.dungeonFloor);
    this.notify();
    return { success: true, final, firstClear, story, exp, ...reward, prestige: final ? 120 : 0, drop, supplies };
  }

  grantBattleLoot(item) {
    const stack = !item.slot && this.data.bag.find(existing => existing.id === item.id && !existing.slot);
    if (stack) stack.count = (stack.count || 1) + (item.count || 1);
    else this.data.bag.push({ ...item, uid: item.uid || 'wild_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
  }

  settleWildBossVictory(mapId) {
    const map = MAPS.find(map => map.id === mapId);
    if (!map || this.data.level < map.boss.level) return { success: false, msg: '首领不存在或挑战等级不足。' };
    const boss = map.boss;
    this.addExp(boss.exp);
    const reward = this.getExplorationReward(boss.gold, boss.crystal);
    this.gainCurrency(reward.gold, reward.crystal, 20);
    const drop = { ...(SPECIAL_ITEMS[boss.guaranteedDrop.id] || boss.guaranteedDrop), count: boss.guaranteedDrop.count };
    // 领主可定向掉落对应套装件（C2 新图）：从该套 slots 随机取部位；否则沿用通用随机部位。
    const setDrop = Array.isArray(boss.setDrop) ? boss.setDrop[Math.floor(Math.random() * boss.setDrop.length)] : boss.setDrop;
    let slot;
    let setId = null;
    if (setDrop && OFFICIAL_SETS[setDrop]) {
      setId = setDrop;
      const setSlots = (OFFICIAL_SETS[setDrop].slots && OFFICIAL_SETS[setDrop].slots.length) ? OFFICIAL_SETS[setDrop].slots : ITEM_SLOTS.map(s => s.id);
      slot = setSlots[Math.floor(Math.random() * setSlots.length)];
    } else {
      slot = ITEM_SLOTS[Math.floor(Math.random() * ITEM_SLOTS.length)].id;
    }
    const gear = generateEquipment(slot, boss.level, boss.dropQuality, setId, this.data.classId);
    this.grantBattleLoot(drop);
    this.grantBattleLoot(gear);
    this.grantBattleLoot({ ...SPECIAL_ITEMS.slave_sigil, count: 1 });
    this.recordRegionalStory('boss', mapId);
    if (boss.id === 'boss_forest') this.triggerQuestAction('slay_wild_boss', 1);
    this.recordCommissionEvent('wild_boss', mapId);
    this.addActionPoints(ACTION_POINTS.wildBoss);
    this.notify();
    return { success: true, exp: boss.exp, ...reward, drop, gear };
  }

  settleWildVictory(mapId, monsterIndex) {
    const map = MAPS.find(map => map.id === mapId);
    const mob = Number.isInteger(monsterIndex) && map?.monsters[monsterIndex];
    if (!mob || this.data.level < map.reqLevel) return { success: false, msg: '野外目标不存在或区域尚未解锁。' };
    const drops = [];
    const grantLoot = item => {
      this.grantBattleLoot(item);
      drops.push(item);
    };
    this.addExp(mob.exp);
    const reward = this.getExplorationReward(mob.gold, 2);
    this.gainCurrency(reward.gold, reward.crystal, 5);
    const roll = Math.random();
    const dropRate = mob.dropRate ?? 0.2;
    if (roll < dropRate) {
      const slot = ITEM_SLOTS[Math.floor(Math.random() * ITEM_SLOTS.length)].id;
      const quality = Math.random() > 0.85 ? 'gold' : 'blue';
      grantLoot(generateEquipment(slot, map.reqLevel, quality, null, this.data.classId));
    } else if (roll < dropRate + 0.15) {
      grantLoot({ ...(Math.random() > 0.5 ? SPECIAL_ITEMS.key_redwood : SPECIAL_ITEMS.star_crystal), count: 1 });
    }
    this.data.wildVictories = (this.data.wildVictories || 0) + 1;
    if (this.data.wildVictories % 10 === 0) grantLoot({ ...SPECIAL_ITEMS.pet_food, count: 1 });
    if (mapId === 'forest') this.triggerQuestAction('investigate_patrol');
    this.recordRegionalStory('wild', mapId);
    this.recordCommissionEvent('wild', mapId);
    this.addActionPoints(ACTION_POINTS.wild);
    this.notify();
    return { success: true, exp: mob.exp, ...reward, drops };
  }

  completeBattle(victory = null) {
    for (const item of Object.values(this.data.equipped)) {
      if (item && Number.isFinite(item.durability)) item.durability = Math.max(0, item.durability - 1);
    }
    // 体力的日常消耗由“行动日 -10”承担；战斗只在失败时留下死亡惩罚 -5。
    if (victory === false) {
      for (const { pet } of getPetParty(this.data)) {
        if (pet) pet.stamina = Math.max(0, (pet.stamina ?? 100) - 5);
      }
    }
    estateDomain.advanceBattlePotions(this.data);
    this.notify();
  }

  getEligibleContractPets(egg) {
    return petDomain.getEligibleContractPets(this.data, egg);
  }

  getContractChoices() {
    return petDomain.getContractChoices(this);
  }

  hatchPetEgg(preferredId = null) {
    return petDomain.hatchPetEgg(this, preferredId);
  }

  setActivePet(petId) {
    return petDomain.setActivePet(this, petId);
  }

  setPetPartySlot(slot, petId) {
    return petDomain.setPetPartySlot(this, slot, petId);
  }

  trainClassSkill(skillId, expectedRank) {
    const skill = getClassSkills(this.data.classId, 0, this.data).find(skill => skill.id === skillId);
    if (!skill || skill.rank !== expectedRank || skill.rank >= 10 || getSkillTraining(this.data).available < 1) return { success: false, msg: '技能尚未解锁、点数不足或等级已变化，请重新选择。' };
    this.data.skillTraining ||= { ranks: {}, preferredAttackId: null };
    this.data.skillTraining.ranks[skillId] = skill.rank + 1;
    this.addSystemLog(`【职业培养】${skill.name}提升至${skill.rank + 1}级。`, 'quest', false);
    this.notify();
    return { success: true, msg: `${skill.name}已提升至${skill.rank + 1}级，消耗1技能点。` };
  }

  setPreferredClassSkill(skillId) {
    if (skillId !== null && !getClassSkills(this.data.classId, 0, this.data).some(skill => skill.id === skillId && skill.category === 'attack')) return { success: false, msg: '请选择已掌握的主动技能。' };
    this.data.skillTraining ||= { ranks: {}, preferredAttackId: null };
    this.data.skillTraining.preferredAttackId = skillId;
    this.notify();
    return { success: true };
  }

  washPetAptitude(petId) {
    return petDomain.washPetAptitude(this, petId);
  }

  learnPetSkill(petId, bookId) {
    return petDomain.learnPetSkill(this, petId, bookId);
  }

  forgetPetSkill(petId, learnedId) {
    return petDomain.forgetPetSkill(this, petId, learnedId);
  }

  setPatrolMap(id, now = Date.now()) {
    const map = MAPS.find(m => m.id === id);
    if (!map || this.data.level < map.reqLevel) return { success: false, msg: '地图未解锁，无法部署巡逻。' };
    if (this.data.currentMapId === id) return { success: false, msg: '当前已在此地巡逻。' };
    // 先按旧营地结算当日额度，防止把此前时间兑换成高等级地图收益。
    this.claimIdleRewards(now);
    this.data.currentMapId = id;
    this.data.lastIdleClaimTime = now;
    this.notify();
    return { success: true, msg: `巡逻营地已转移至【${map.name}】，本行动日剩余巡逻收益按新营地计算。` };
  }

  getPatrolRates(mapId = this.data.currentMapId) {
    const map = MAPS.find(map => map.id === mapId) || MAPS[0];
    const rates = map.idleRate;
    return this.data.onboardingVersion === 2 ? { ...rates, goldPerMin: rates.goldPerMin * 0.1, crystalPerMin: rates.crystalPerMin * 0.05 } : { ...rates };
  }

  // 巡逻收益不再按现实时间无限累积：每个行动日最多 10 分钟基准产出。
  getIdleRewards(now = Date.now()) {
    const map = MAPS.find(map => map.id === this.data.currentMapId) || MAPS[0];
    const rates = this.getPatrolRates(map.id);
    const day = this.getActionDay();
    const claimed = this.data.lastIdleClaimDay === day ? Math.max(0, Number(this.data.idleMinutesClaimed) || 0) : 0;
    const remaining = Math.max(0, 10 - claimed);
    const since = Number.isFinite(this.data.lastIdleClaimTime) ? this.data.lastIdleClaimTime : now;
    const elapsed = Math.max(0, Math.floor((now - since) / 60000));
    const minutes = Math.min(remaining, elapsed);
    return { minutes, exp: Math.floor(minutes * rates.expPerMin),
      gold: Math.floor(minutes * rates.goldPerMin), crystal: Math.floor(minutes * rates.crystalPerMin) };
  }

  claimIdleRewards(now = Date.now()) {
    const reward = this.getIdleRewards(now);
    if (reward.minutes <= 0) {
      const day = this.getActionDay();
      const claimed = this.data.lastIdleClaimDay === day ? Math.max(0, Number(this.data.idleMinutesClaimed) || 0) : 0;
      return { success: false, msg: claimed >= 10 ? '本行动日巡逻收益已领满，进入下一行动日后可再领取。' : '巡逻尚未满一分钟，请稍后领取。' };
    }
    const day = this.getActionDay();
    const priorClaimed = this.data.lastIdleClaimDay === day ? Math.max(0, Number(this.data.idleMinutesClaimed) || 0) : 0;
    const elapsed = now - (Number.isFinite(this.data.lastIdleClaimTime) ? this.data.lastIdleClaimTime : now);
    this.data.lastIdleClaimTime = now - (elapsed % 60000);
    this.data.lastIdleClaimDay = day;
    this.data.idleMinutesClaimed = priorClaimed + reward.minutes;
    this.addExp(reward.exp);
    this.gainCurrency(reward.gold, reward.crystal);
    return { success: true, ...reward, msg: `巡逻收获：经验 +${reward.exp}，金币 +${reward.gold}，魔晶 +${reward.crystal}！` };
  }

  feedPet(petId, itemId = 'pet_food') {
    return petDomain.feedPet(this, petId, itemId);
  }

  // 兽栏金币喂养：单机兜底，最多恢复到 60（行动日/断粮时可继续战斗）。
  feedPetWithGold(petId, targetStamina = 60) {
    return petDomain.feedPetWithGold(this, petId, targetStamina);
  }

  getCompanionTrainingQuote(petId) {
    return petDomain.getCompanionTrainingQuote(this, petId);
  }

  trainCompanion(expected) {
    return petDomain.trainCompanion(this, expected);
  }

  // 进化神兽 (黄金->暗金->紫金)
  evolvePet(petId) {
    return petDomain.evolvePet(this, petId);
  }

  getEquipmentRepairCost(item) {
    if (!item || !Number.isFinite(item.durability)) return 0;
    const loss = Math.max(0, (item.maxDurability ?? 100) - item.durability);
    const level = item.reqLevel ?? item.level ?? 1;
    const quality = QUALITIES[item.quality]?.multiplier || 1;
    const rate = 5 + Math.ceil(Math.floor(level / 5) * quality * 2);
    return Math.floor(loss * rate);
  }

  getRepairQuote() {
    const items = Object.values(this.data.equipped).filter(item => this.getEquipmentRepairCost(item) > 0);
    return { cost: items.reduce((sum, item) => sum + this.getEquipmentRepairCost(item), 0), repaired: items.length };
  }

  // 装备修理
  repairAllEquipment() {
    const { repaired, cost } = this.getRepairQuote();
    if (repaired === 0) return { success: false, msg: '当前所有穿戴装备耐久度完好，无需修理！' };
    if (this.data.gold < cost) return { success: false, msg: `金币不足！需要 ${cost} 金币进行修缮！` };
    this.data.gold -= cost;
    Object.values(this.data.equipped).forEach(item => {
      if (this.getEquipmentRepairCost(item) > 0) {
        item.durability = item.maxDurability ?? 100;
      }
    });
    this.notify();
    return { success: true, msg: `成功修理了 ${repaired} 件装备，花费 ${cost} 金币！所有装备耐久已回满！` };
  }

  // 装备升星 (最高 8 星，可勾选保护水晶)
  getEnhancementSuccessRate(item) {
    const stars = item?.stars || 0;
    const firstLesson = this.data.onboardingVersion === 2 && this.data.currentQuestId === 'quest_3' && !this.data.questProgress.quest_3?.completed;
    const noviceLesson = this.data.currentQuestId === 'quest_2' && ['novice_weapon', 'novice_armor'].includes(item?.id);
    return stars === 0 && (firstLesson || noviceLesson) ? 100 : ([95,85,75,60,50,40,30,20][stars] || 25);
  }

  enhanceEquipment(slotId, useProtectCrystal) {
    const item = this.data.equipped[slotId];
    if (!item) return { success: false, msg: '该槽位未佩戴装备！' };
    const curStars = item.stars || 0;
    if (curStars >= 8) return { success: false, msg: '该装备已达到最高 8 星绝顶品阶！' };

    const costCrystal = Math.max(1, curStars + 1);
    const starItem = this.data.bag.find(i => i.id === 'star_crystal' && i.count >= costCrystal);
    if (!starItem) return { success: false, msg: `缺少升星水晶！本次升星需要 ${costCrystal} 颗升星水晶！` };

    let protectItem = null;
    if (useProtectCrystal) {
      protectItem = this.data.bag.find(i => i.id === 'protect_crystal' && i.count > 0);
      if (!protectItem) return { success: false, msg: '勾选了保护水晶，但背包中保护水晶不足！' };
    }

    starItem.count -= costCrystal;
    if (starItem.count <= 0) this.data.bag = this.data.bag.filter(i => i !== starItem);

    // 成功率根据星级递减 (1星95%, 2星85%, 3星75%, 4星60%, 5星50%, 6星40%, 7星30%, 8星20%)
    const rates = [95, 85, 75, 60, 50, 40, 30, 20];
    const successRate = this.getEnhancementSuccessRate(item);
    const roll = Math.random() * 100;

    if (roll <= successRate) {
      item.stars = curStars + 1;
      this.triggerQuestAction('enhance_gear');
      this.addSystemLog(`【精铸】升星大吉！【${item.name}】成功铸造成 +${item.stars} 星！`, 'forge');
      this.notify();
      return { success: true, msg: `升星大吉！【${item.name}】成功铸造成 +${item.stars} 星！` };
    } else {
      if (useProtectCrystal && protectItem) {
        protectItem.count--;
        if (protectItem.count <= 0) this.data.bag = this.data.bag.filter(i => i !== protectItem);
        this.addSystemLog(`【精铸】升星失败！但【保护水晶】生效，装备星级完好！`, 'forge');
        this.notify();
        return { success: false, msg: `升星失败！但【保护水晶】生效，装备星级完好未受降级！` };
      } else {
        item.stars = Math.max(0, curStars - 1);
        this.addSystemLog(`【精铸】升星失手！【${item.name}】不幸降至 +${item.stars} 星...`, 'forge');
        this.notify();
        return { success: false, msg: `升星失手！装备不幸降至 +${item.stars} 星...建议使用保护水晶！` };
      }
    }
  }

  // 传奇词条 · 神兵重铸 (消耗黄金/暗金晶石与金币洗炼传奇词条)
  getReforgeQuote(item) {
    const level = item?.reqLevel ?? item?.level ?? 1;
    if (!Number.isSafeInteger(level) || level < 1 || level > 100) return { success: false, gold: 0, crystal: 0, msg: '装备等级异常，无法报价。' };
    return this.data.onboardingVersion === 2 ? { gold: 2000 + Math.floor(level * level * (QUALITIES[item?.quality]?.multiplier || 1)), crystal: level * 2 } : { gold: 2000, crystal: 0 };
  }

  resolveEquipmentReforge(uid, rollId, accept) {
    const item = [...Object.values(this.data.equipped), ...this.data.bag].find(item => item?.uid === uid);
    const pending = item?.pendingReforge;
    if (!pending || pending.rollId !== rollId || typeof accept !== 'boolean') return { success: false, msg: '这份重铸结果已处理，或装备已经变化。' };
    delete item.pendingReforge;
    if (accept) { item.reforge = pending.affix; this.triggerQuestAction('reforge_gear'); }
    this.addSystemLog(`【重铸选择】${accept ? '采用新词条' : '保留原词条'}：${item.name}。本次已消耗的材料不退还。`, 'forge');
    this.notify();
    return { success: true, msg: accept ? '新词条已铭刻，装备属性已经更新。' : '保留原词条，本次材料已经消耗。' };
  }

  reforgeEquipment(slotKeyOrUid, useCrystalId = null, preview = false) {
    let item = this.data.equipped[slotKeyOrUid];
    if (!item) {
      item = this.data.bag.find(i => (i.uid && i.uid === slotKeyOrUid) || (!i.uid && i.id === slotKeyOrUid));
    }
    if (!item || !ITEM_SLOTS.some(slot => slot.id === item.slot)) return { success: false, msg: '未选定有效装备进行重铸！' };
    if (item.pendingReforge) return { success: false, msg: '请先采用或放弃这件装备已有的重铸结果。' };
    if (preview && !item.uid) return { success: false, msg: '装备缺少身份，请重新载入后再重铸。' };
    if (useCrystalId && !['crystal_gold', 'crystal_darkgold'].includes(useCrystalId)) return { success: false, msg: '重铸只能使用黄金晶石或暗金晶石！' };

    const quote = this.getReforgeQuote(item);
    if (quote.success === false) return quote;
    const goldCost = quote.gold;
    if (this.data.gold < goldCost) {
      return { success: false, msg: `金币不足！神兵重铸需要 ${goldCost} 金币！` };
    }
    if (this.data.crystal < quote.crystal) return { success: false, msg: `魔晶不足！重铸需要 ${quote.crystal} 魔晶。` };

    let crystal = null;
    if (useCrystalId) {
      crystal = this.data.bag.find(i => i.id === useCrystalId && i.count > 0);
    }
    if (!crystal && !useCrystalId) {
      // 默认优先暗金晶石，其次黄金晶石
      crystal = this.data.bag.find(i => (i.id === 'crystal_darkgold' || i.id === 'crystal_gold') && i.count > 0);
    }

    if (!crystal) {
      return { success: false, msg: '缺少重铸晶石！需消耗 1 颗【黄金晶石】或【暗金晶石】！' };
    }

    // 扣除材料与金币
    this.data.gold -= goldCost;
    this.data.crystal -= quote.crystal;
    crystal.count--;
    if (crystal.count <= 0) {
      this.data.bag = this.data.bag.filter(i => i !== crystal);
    }

    // 随机传奇词条与数值
    const isDarkgold = crystal.id === 'crystal_darkgold';
    const chosenAffix = REFORGE_AFFIXES[Math.floor(Math.random() * REFORGE_AFFIXES.length)];
    const rangeSpan = chosenAffix.max - chosenAffix.min;
    let rollRatio = Math.random();
    if (isDarkgold) {
      // 暗金晶石保底高阶区间 (50%~100%)
      rollRatio = 0.5 + Math.random() * 0.5;
    }
    const val = Math.round(chosenAffix.min + rangeSpan * rollRatio);

    const affix = {
      id: chosenAffix.id,
      name: chosenAffix.name,
      stat: chosenAffix.stat,
      val: val,
      unit: chosenAffix.unit || '',
      crystalUsed: crystal.name || (isDarkgold ? '暗金晶石' : '黄金晶石')
    };

    if (preview) {
      item.pendingReforge = { rollId: this.createDungeonExpeditionId(), affix };
      this.notify();
      return { success: true, preview: true, reforge: affix, msg: '新词条已生成；选择采用或保留原词条。材料已经消耗，刷新后仍可继续选择。' };
    }
    item.reforge = affix;

    this.triggerQuestAction('reforge_gear');
    this.addSystemLog(`【神兵重铸】消耗【${crystal.name || '晶石'}】！为【${item.name}】洗炼出传奇词条：【${chosenAffix.name}】+${val}${chosenAffix.unit}！`, 'forge');
    this.notify();
    return {
      success: true,
      msg: `重铸大吉！成功洗炼出【${chosenAffix.name}】+${val}${chosenAffix.unit}！`,
      reforge: item.reforge
    };
  }

  // 熔炼：4 件同套装同品质部件 + 1 颗对应品质晶石 → 1 件指定部位套装部件。
  smeltSetPieces(uidList, targetSlot) {
    if (!Array.isArray(uidList) || uidList.length !== 4) return { success: false, msg: '熔炼需要正好 4 件套装部件。' };
    if (new Set(uidList).size !== 4) return { success: false, msg: '熔炼材料不能重复。' };
    const target = ITEM_SLOTS.find(slot => slot.id === targetSlot);
    if (!target) return { success: false, msg: '请选择有效的目标部位。' };
    const items = uidList.map(uid => this.data.bag.find(item => item.uid === uid));
    if (items.some(item => !item || !item.slot || !item.setId)) return { success: false, msg: '材料必须是背包中的套装部件。' };
    const first = items[0];
    if (!items.every(item => item.setId === first.setId && item.quality === first.quality)) return { success: false, msg: '4 件材料必须同套装、同品质。' };
    if (!['gold', 'darkgold', 'purplegold'].includes(first.quality)) return { success: false, msg: '只有黄金、暗金、紫金套装可以熔炼。' };
    if (items.some(item => item.slot === targetSlot)) return { success: false, msg: '目标部位不能是已消耗材料之一。' };
    const crystalId = first.quality === 'gold' ? 'crystal_gold' : first.quality === 'darkgold' ? 'crystal_darkgold' : 'crystal_purplegold';
    const crystal = this.data.bag.find(item => item.id === crystalId && Number.isSafeInteger(item.count) && item.count > 0);
    if (!crystal) return { success: false, msg: `熔炼需要 1 颗【${first.quality === 'gold' ? '黄金晶石' : first.quality === 'darkgold' ? '暗金晶石' : '紫金晶石'}】。` };
    const set = OFFICIAL_SETS[first.setId];
    if (!set) return { success: false, msg: '该套装配置不存在。' };
    // 先移除材料与晶石，再放入产物；材料腾出的空间足以容纳 1 件装备。
    const keep = this.data.bag.filter(item => !uidList.includes(item.uid));
    crystal.count--;
    if (crystal.count <= 0) this.data.bag = keep.filter(item => item !== crystal);
    else {
      this.data.bag = keep;
      const remainingCrystal = this.data.bag.find(item => item.id === crystalId);
      if (remainingCrystal) remainingCrystal.count = crystal.count;
    }
    const gear = generateEquipment(targetSlot, set.reqLevel || first.reqLevel || 1, first.quality, first.setId, this.data.classId);
    gear.name = `${set.name.replace(/[【】]/g, '')}·${target.name}`;
    this.data.bag.push(gear);
    this.addSystemLog(`【套装熔炼】消耗 4 件【${set.name}】部件，熔炼出【${gear.name}】！`, 'forge');
    this.notify();
    return { success: true, msg: `熔炼成功！获得【${gear.name}】。`, item: gear };
  }

  // 装备穿戴入身
  getUpgradeInheritanceQuote(uid) {
    if (!this.data.hasChosenClass) return { success: false, msg: '请先完成角色创建。' };
    if (typeof uid !== 'string' || !uid) return { success: false, msg: '请选择背包中的装备。' };
    const matches = this.data.bag.filter(item => item.uid === uid);
    const target = matches.length === 1 ? matches[0] : null;
    const source = target && this.data.equipped[target.slot];
    if (!target || !source || !source.uid || source.uid === uid || !ITEM_SLOTS.some(slot => slot.id === target.slot)) return { success: false, msg: '选择与当前穿戴装备同部位的新装备。' };
    if ([source, target].some(item => item.reqClass && item.reqClass !== this.data.classId)) return { success: false, msg: '强化继承仍需符合当前职业专精。' };
    const level = target.reqLevel ?? target.level ?? 1, sourceLevel = source.reqLevel ?? source.level ?? 1;
    const sourceStars = source.stars ?? 0, targetStars = target.stars ?? 0;
    if (![level, sourceLevel, sourceStars, targetStars].every(Number.isSafeInteger) || sourceLevel < 1 || sourceLevel > 100 || level < sourceLevel || level > this.data.level || level < 1 || level > 100 || sourceStars > 8 || targetStars < 0 || sourceStars <= targetStars) return { success: false, msg: '新装备需可穿戴且等级不低于旧装备，旧装备强化星级也需更高。' };
    if (source.pendingReforge || target.pendingReforge) return { success: false, msg: '请先处理这两件装备的待选重铸词条。' };
    const difference = sourceStars - targetStars;
    return { success: true, sourceUid: source.uid, targetUid: uid, sourceStars, targetStars, gold: difference * level * 50, crystal: difference * 10, sourceName: source.name, targetName: target.name };
  }

  inheritEquipmentUpgrade(expected) {
    const quote = this.getUpgradeInheritanceQuote(expected?.targetUid);
    if (!quote.success) return quote;
    if (['sourceUid','targetUid','sourceStars','targetStars','gold','crystal'].some(key => expected[key] !== quote[key])) return { success: false, msg: '装备或报价已变化，请重新选择。' };
    if (![this.data.gold, this.data.crystal].every(Number.isFinite) || this.data.gold < quote.gold || this.data.crystal < quote.crystal) return { success: false, msg: `继承需要${quote.gold}金币和${quote.crystal}魔晶。` };
    const index = this.data.bag.findIndex(item => item.uid === quote.targetUid), target = this.data.bag[index], source = this.data.equipped[target.slot];
    this.data.gold -= quote.gold; this.data.crystal -= quote.crystal;
    target.stars = quote.sourceStars; source.stars = quote.targetStars;
    this.data.bag.splice(index, 1); this.data.bag.push(source); this.data.equipped[target.slot] = target;
    this.triggerQuestAction('equip_gear');
    this.addSystemLog(`【强化继承】${target.name}继承为+${target.stars}星；${source.name}保留+${source.stars}星并回到行囊。宝石与词条各自保留。`, 'forge');
    this.notify();
    return { success: true, msg: '强化已继承并完成换装。旧装备保留在行囊，可直接免费摘除其宝石。' };
  }

  getEquippableItem(itemUid) {
    const bagIdx = this.data.bag.findIndex(i => (i.uid && i.uid === itemUid) || (!i.uid && i.id === itemUid));
    if (bagIdx === -1) return { success: false, msg: '在行囊中未找到该装备！' };

    const item = this.data.bag[bagIdx];
    if (!item.slot) return { success: false, msg: '该物品不可作为装备穿戴！' };
    if (!ITEM_SLOTS.some(slot => slot.id === item.slot)) {
      return { success: false, msg: '该装备部位尚未开放，物品已保留在行囊。' };
    }

    if (item.reqLevel && this.data.level < item.reqLevel) {
      return { success: false, msg: `勇者等级不足！需达到 Lv.${item.reqLevel} 方可佩戴此装备！` };
    }

    if (item.reqClass && item.reqClass !== this.data.classId) {
      return { success: false, msg: '该装备与你的当前职业专精不符！' };
    }

    return { success: true, item, bagIdx };
  }

  getEquipmentPreview(itemUid) {
    return heroStatsDomain.getEquipmentPreview(this, itemUid);
  }

  equipItem(itemUid) {
    const candidate = this.getEquippableItem(itemUid);
    if (!candidate.success) return candidate;
    const { item, bagIdx } = candidate;
    const slotKey = item.slot;
    const oldEquipped = this.data.equipped[slotKey];

    // 从背包中取出
    this.data.bag.splice(bagIdx, 1);

    // 如果原来槽位有穿戴装备，放回背包
    if (oldEquipped) {
      this.data.bag.push(oldEquipped);
    }

    // 装备到身上
    this.data.equipped[slotKey] = item;

    this.triggerQuestAction('equip_gear');
    this.addSystemLog(`【换装】勇者披挂上阵，成功穿戴【${item.name}】！`, 'forge', false);
    this.notify();
    return { success: true, msg: `换装成功！已成功穿戴【${item.name}】！` };
  }

  // 卸下身上装备至背包
  unequipItem(slotKey) {
    const item = this.data.equipped[slotKey];
    if (!item) return { success: false, msg: '该槽位未穿戴任何装备！' };

    this.data.equipped[slotKey] = null;
    this.data.bag.push(item);

    this.notify();
    return { success: true, msg: `已将【${item.name}】卸下并妥善放入行囊！` };
  }

  getEquipmentSaleQuote(uid) {
    const matches = this.data.bag.filter(item => (item.uid || item.id) === uid);
    const item = matches.length === 1 ? matches[0] : null;
    if (!item || !ITEM_SLOTS.some(slot => slot.id === item.slot) || (item.count ?? 1) !== 1) return { success: false, msg: '请选择行囊中的一件闲置装备。' };
    if ((item.gems != null && !Array.isArray(item.gems)) || (item.gems || []).some(Boolean)) return { success: false, msg: '装备仍嵌有宝石或符文，或镶嵌记录异常；请先前往铁匠铺检查并无损摘除，再出售。' };
    const level = Math.max(1, item.reqLevel || item.level || 1);
    const baseValue = item.price ?? level * 30 * (QUALITIES[item.quality]?.multiplier || 1);
    if (!Number.isFinite(baseValue) || baseValue < 0) return { success: false, msg: '该装备尚无有效回收价格，已保留。' };
    return { success: true, uid: item.uid || item.id, name: item.name, stars: item.stars || 0, gold: Math.max(1, Math.floor(baseValue * 0.5)) };
  }

  sellEquipment(uid, expectedGold) {
    const quote = this.getEquipmentSaleQuote(uid);
    if (!quote.success) return quote;
    if (expectedGold !== undefined && expectedGold !== quote.gold) return { success: false, msg: '装备报价已变化，请重新选择并确认。' };
    const index = this.data.bag.findIndex(item => (item.uid || item.id) === uid);
    this.data.bag.splice(index, 1);
    this.data.gold += quote.gold;
    this.addSystemLog(`【装备回收】出售【${quote.name}】，金币 +${quote.gold}。`, 'obtain');
    this.notify();
    return { success: true, gold: quote.gold, msg: `已出售【${quote.name}】，获得 ${quote.gold} 金币。` };
  }

  getEquipmentDisassemblyQuote(slotKey) {
    const item = this.data.equipped[slotKey];
    if (!ITEM_SLOTS.some(slot => slot.id === slotKey) || !item || item.slot !== slotKey || !QUALITIES[item.quality] || (item.count ?? 1) !== 1) {
      return { success: false, msg: '该部位没有可分解的有效装备。' };
    }
    if ((item.gems != null && !Array.isArray(item.gems)) || (item.gems || []).some(Boolean)) return { success: false, msg: '装备嵌有宝石或符文，或镶嵌记录异常；请先无损摘除并检查，再进行分解。' };
    const uid = item.uid;
    if (!uid || [...this.data.bag, ...Object.values(this.data.equipped)].filter(entry => entry?.uid === uid).length !== 1) {
      return { success: false, msg: '装备身份记录异常，请先保存并重新载入检查。' };
    }
    const materialId = ['darkgold', 'purplegold'].includes(item.quality) ? 'crystal_darkgold' : 'crystal_gold';
    return { success: true, uid, name: item.name, stars: item.stars || 0, materialId, materialName: SPECIAL_ITEMS[materialId].name, count: 3 };
  }

  disassembleEquipment(slotKey, expectedUid) {
    const quote = this.getEquipmentDisassemblyQuote(slotKey);
    if (!quote.success) return quote;
    if (!expectedUid || quote.uid !== expectedUid) return { success: false, msg: '穿戴装备已变化，请重新选择并确认分解。' };
    // 材料为销毁已有装备产生的奖励，满袋仍保留；没有宝石时才允许销毁。
    this.data.equipped[slotKey] = null;
    this.grantBattleLoot({ ...SPECIAL_ITEMS[quote.materialId], count: quote.count });
    this.addSystemLog(`【熔炉分解】分解【${quote.name}】，获得【${quote.materialName}】x${quote.count}。`, 'forge');
    this.notify();
    return { success: true, msg: `已分解【${quote.name}】，获得【${quote.materialName}】x${quote.count}。` };
  }

  getBagCapacity() {
    const capacity = this.data.bagCapacity;
    return Number.isInteger(capacity) && capacity >= 40 && capacity <= 120 && (capacity - 40) % 20 === 0 ? capacity : 40;
  }

  getBagExpansionQuote() {
    const capacity = this.getBagCapacity();
    if (capacity >= 120) return { success: false, msg: '行囊已扩至120格，达到容量上限。' };
    const tier = (capacity - 40) / 20 + 1;
    return { success: true, capacity, nextCapacity: capacity + 20, gold: tier * 10000, crystal: tier * 50 };
  }

  expandBag(expectedCapacity) {
    const quote = this.getBagExpansionQuote();
    if (!quote.success) return quote;
    if (expectedCapacity !== undefined && expectedCapacity !== quote.capacity) return { success: false, msg: '行囊容量已变化，请重新确认扩容。' };
    if (!Number.isFinite(this.data.gold) || !Number.isFinite(this.data.crystal) || this.data.gold < quote.gold || this.data.crystal < quote.crystal) {
      return { success: false, msg: `资源不足！本次扩容需要 ${quote.gold} 金币和 ${quote.crystal} 魔晶。` };
    }
    this.data.gold -= quote.gold;
    this.data.crystal -= quote.crystal;
    this.data.bagCapacity = quote.nextCapacity;
    this.addSystemLog(`【行囊扩容】消耗 ${quote.gold} 金币、${quote.crystal} 魔晶，购买容量扩至 ${quote.nextCapacity} 格。`, 'system');
    this.notify();
    return { success: true, msg: `行囊已扩至 ${quote.nextCapacity} 格！既有物品全部保留。` };
  }

  // 通用添加道具至背包：材料堆叠不占新格，主动购买遵守扩容上限
  addItemToBag(item) {
    if (!item) return false;
    if (!item.slot) {
      const existing = this.data.bag.find(i => i.id === item.id);
      if (existing) {
        existing.count = (existing.count || 1) + (item.count || 1);
        return true;
      }
    }
    if (this.data.bag.length >= this.getBagCapacity()) return false;
    this.data.bag.push({
      ...item,
      count: item.count || 1,
      uid: item.uid || ('it_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6))
    });
    return true;
  }

  // 宝石孔开凿 (消耗打孔水晶/金刚钻与金币，最多开 4 孔)
  punchSocket(slotKey) {
    const item = this.data.equipped[slotKey];
    if (!item) return { success: false, msg: '该槽位未穿戴任何装备！' };

    const curSockets = item.sockets || 0;
    const socketCap = getSocketCap(item.slot);
    if (curSockets >= socketCap) return { success: false, msg: `该装备已开启 ${socketCap} 个宝石孔，已达当前部位上限！` };

    const drillItem = this.data.bag.find(i => (i.id === 'diamond_1' || i.id === 'socket_crystal') && i.count > 0);
    if (!drillItem) return { success: false, msg: '缺少打孔道具！需要【打孔水晶】或【金刚钻】！可在声望商行兑换。' };

    const goldCost = (curSockets + 1) * 1000;
    if (this.data.gold < goldCost) return { success: false, msg: `金币不足！本次开孔需花费 ${goldCost} 金币！` };

    drillItem.count--;
    if (drillItem.count <= 0) {
      this.data.bag = this.data.bag.filter(i => i !== drillItem);
    }
    this.data.gold -= goldCost;

    item.sockets = curSockets + 1;
    if (!Array.isArray(item.gems)) item.gems = [];

    this.triggerQuestAction('punch_socket');
    this.addSystemLog(`【宝石工坊】匠人挥锤淬火！成功为【${item.name}】开凿出第 ${item.sockets} 个宝石孔！`, 'forge');
    this.notify();
    return { success: true, msg: `开孔大吉！成功为【${item.name}】开启第 ${item.sockets} 个宝石孔！` };
  }

  // 宝石镶嵌 (消耗宝石与少量手工金币)
  inlayGem(slotKey, socketIdx, gemUid) {
    const item = this.data.equipped[slotKey];
    if (!item) return { success: false, msg: '该槽位未穿戴任何装备！' };

    const curSockets = item.sockets || 0;
    if (!Number.isInteger(socketIdx) || socketIdx < 0 || socketIdx >= curSockets) {
      return { success: false, msg: '无效的宝石孔位置！' };
    }

    if (!Array.isArray(item.gems)) item.gems = [];
    if (item.gems[socketIdx]) {
      return { success: false, msg: '该孔已有宝石，请先摘除原宝石后再行镶嵌！' };
    }

    const bagGemIdx = this.data.bag.findIndex(i => (i.uid === gemUid || i.id === gemUid) && (i.type === 'gem' || i.type === 'rune' || i.stat || RUNES[i.id]));
    if (bagGemIdx === -1) return { success: false, msg: '行囊中未找到选定宝石或符文！' };

    const gemItem = this.data.bag[bagGemIdx];
    const goldCost = 500;
    if (this.data.gold < goldCost) return { success: false, msg: `金币不足！镶嵌手工费需 ${goldCost} 金币！` };

    this.data.gold -= goldCost;
    if (gemItem.count > 1) {
      gemItem.count--;
    } else {
      this.data.bag.splice(bagGemIdx, 1);
    }

    const isRune = !!(gemItem.type === 'rune' || RUNES[gemItem.id]);
    const socketedGem = {
      id: gemItem.id,
      name: gemItem.name,
      stat: gemItem.stat,
      val: gemItem.val,
      stats: gemItem.stats || (RUNES[gemItem.id] ? RUNES[gemItem.id].stats : null),
      isRune,
      icon: gemItem.icon,
      quality: gemItem.quality || 'darkgold',
      desc: gemItem.desc || ''
    };

    item.gems[socketIdx] = socketedGem;

    // 检查符文之语激活
    const rw = this.updateRunicWord(slotKey);
    this.triggerQuestAction('socket_gem');
    const message = rw
      ? item.durability === 0
        ? `【${rw.name}】配方已匹配；装备损坏，共鸣未生效，修理后恢复。`
        : `神圣共鸣！成功激活符文之语【${rw.name}】！`
      : `成功将【${gemItem.name}】镶入【${item.name}】第 ${socketIdx + 1} 孔！${item.durability === 0 ? '装备损坏，符文与宝石属性未生效，修理后恢复。' : ''}`;
    this.addSystemLog(`【${rw ? '远古神铸' : '宝石工坊'}】${message}`, 'forge');
    this.notify();
    return { success: true, msg: message };
  }

  // 宝石与符文无损摘除 (取回背包，不损耗材料)
  removeGem(slotKey, socketIdx) {
    const item = this.data.equipped[slotKey];
    return this.extractEquipmentGem(item, socketIdx);
  }

  removeBagGem(uid, socketIdx, expectedGem) {
    const matches = this.data.bag.filter(item => item.uid === uid);
    const item = matches.length === 1 ? matches[0] : null;
    if (!expectedGem || item?.gems?.[socketIdx] !== expectedGem) return { success: false, msg: '装备或宝石已变化，请重新选择。' };
    return this.extractEquipmentGem(item, socketIdx);
  }

  extractEquipmentGem(item, socketIdx) {
    if (!Number.isSafeInteger(socketIdx) || socketIdx < 0 || ![...Object.values(this.data.equipped), ...this.data.bag].includes(item)) return { success: false, msg: '请选择自己持有的装备与宝石。' };
    if (!item || !Array.isArray(item.gems) || !item.gems[socketIdx]) {
      return { success: false, msg: '该孔内并无镶嵌宝石或符文！' };
    }

    const removedGem = item.gems[socketIdx];
    if (!this.addItemToBag({
      id: removedGem.id,
      name: removedGem.name,
      stat: removedGem.stat,
      val: removedGem.val,
      stats: removedGem.stats,
      type: removedGem.isRune ? 'rune' : 'gem',
      quality: removedGem.quality || 'darkgold',
      icon: removedGem.icon,
      desc: removedGem.desc,
      count: 1
    })) return { success: false, msg: `行囊已满 (${this.data.bag.length}/${this.getBagCapacity()})，请先出售闲置装备或扩容，以容纳摘下的宝石！` };
    item.gems[socketIdx] = null;
    while (item.gems.length > 0 && item.gems[item.gems.length - 1] === null) item.gems.pop();
    this.updateRunicWord(item.slot, item);

    this.addSystemLog(`【宝石工坊】完好取下【${removedGem.name}】，已妥善收入行囊！`, 'forge');
    this.notify();
    return { success: true, msg: `已无损摘除【${removedGem.name}】，已安然放回行囊！` };
  }

  // 检测并更新装备激活的符文之语
  updateRunicWord(slotKey, ownedItem = null) {
    return heroStatsDomain.updateRunicWord(this.data, slotKey, ownedItem);
  }

  // 阵营边境要塞争夺战相关方法
  getFactionWarState() {
    return this.data.factionWar;
  }

  challengeStronghold(strongholdId) {
    const stronghold = STRONGHOLDS.find(s => s.id === strongholdId);
    if (!stronghold) return { success: false, msg: '未知的要塞据点！' };
    if (this.data.level < stronghold.reqLevel) {
      return { success: false, msg: `勇者等级未达 Lv.${stronghold.reqLevel}，无法进军该要塞！` };
    }
    return {
      success: true,
      stronghold,
      defender: stronghold.defender
    };
  }

  getTotalFactionMerit() {
    const faction = this.data.factionWar;
    const rankFloor = (MILITARY_RANKS.find(rank => rank.id === faction.militaryRank) || MILITARY_RANKS[0]).reqMerit;
    const valid = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
    return Math.max(valid(faction.totalMerit), valid(faction.merit), rankFloor);
  }

  completeStrongholdVictory(strongholdId) {
    const stronghold = STRONGHOLDS.find(s => s.id === strongholdId);
    if (!stronghold) return { success: false, msg: '未知的要塞据点！' };

    const fw = this.data.factionWar;
    if (!fw.strongholds[strongholdId]) {
      fw.strongholds[strongholdId] = { captured: false, progress: 0 };
    }
    const strongholdRecord = fw.strongholds[strongholdId];
    if (strongholdRecord.captured) {
      const day = this.getActionDay();
      if (strongholdRecord.lastRepeatDay === day) {
        return { success: false, msg: '本行动日该要塞已再度破关，进入下一行动日后再来。' };
      }
      strongholdRecord.lastRepeatDay = day;
      const repeatGold = Math.floor(stronghold.goldReward * 0.2);
      this.data.gold += repeatGold;
      this.addSystemLog(`【边境巡防】再度攻破【${stronghold.name}】，本次为重复挑战：金币 +${repeatGold}，军勋不重复发放。`, 'battle');
      this.addActionPoints(ACTION_POINTS.stronghold);
      this.notify();
      return { success: true, merit: 0, gold: repeatGold, repeat: true, promoted: null };
    }
    strongholdRecord.captured = true;
    strongholdRecord.progress = 100;
    this.reconcileQuestMilestones();
    fw.totalMerit = this.getTotalFactionMerit() + stronghold.meritReward;
    fw.merit = (fw.merit || 0) + stronghold.meritReward;
    this.data.gold += stronghold.goldReward;

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

    this.addSystemLog(`【边境大捷】成功攻克【${stronghold.name}】！缴获军饷 ${stronghold.goldReward} 金币，斩获帝国军勋 +${stronghold.meritReward}！`, 'battle');
    if (promoted) {
      this.addSystemLog(`【帝国嘉奖】军功赫赫！勇者阵营军衔荣升为【${promoted.name}】！`, 'quest');
    }
    this.addActionPoints(ACTION_POINTS.stronghold);
    this.notify();
    return { success: true, merit: stronghold.meritReward, gold: stronghold.goldReward, promoted };
  }

  claimFactionSalary() {
    const fw = this.data.factionWar;
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
    this.data.gold += rankCfg.dailySalary;
    this.addSystemLog(`【军需处】领受【${rankCfg.name}】每日军饷：${rankCfg.dailySalary} 金币！`, 'obtain');
    this.notify();
    return { success: true, salary: rankCfg.dailySalary, rankName: rankCfg.name };
  }

  exchangeFactionReward(rewardId) {
    const reward = FACTION_REWARDS.find(r => r.id === rewardId);
    if (!reward) return { success: false, msg: '未知的军勋兑换品！' };
    const fw = this.data.factionWar;
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
    if (!this.addItemToBag(item)) return { success: false, msg: `行囊已满 (${this.data.bag.length}/${this.getBagCapacity()})，请先整理或扩容！` };
    fw.merit -= reward.costMerit;
    this.addSystemLog(`【军勋兑换】消耗 ${reward.costMerit} 军勋，获得【${item.name}】！`, 'obtain');
    this.notify();
    return { success: true, itemId: item.id, itemName: item.name, msg: `兑换成功！【${item.name}】已收入行囊！` };
  }

  // 获取当前角斗士段位
  getArenaRank(points) {
    let matched = ARENA_RANKS[0];
    for (const r of ARENA_RANKS) {
      if (points >= r.minPoints) {
        matched = r;
      }
    }
    return matched;
  }

  startArenaChallenge(opponentId) {
    const opponent = ARENA_OPPONENTS.find(item => item.id === opponentId);
    if (!opponent || !Number.isInteger(this.data.level) || this.data.level < 1 || this.data.level > 100) return { success: false, msg: '无效的对手或角色等级。' };
    this.resetDailyActivities();
    if (this.data.arena.activeChallenge) return { success: false, msg: '当前角斗挑战尚未结束。' };
    if (!Number.isInteger(this.data.arena.challengesLeft) || this.data.arena.challengesLeft <= 0) return { success: false, msg: '本行动日5次角斗挑战次数已耗尽。' };
    const challengeId = this.createDungeonExpeditionId();
    this.data.arena.challengesLeft--;
    this.data.arena.activeChallenge = { opponentId, challengeId };
    this.notify();
    return { success: true, opponent, challengeId };
  }

  settleArenaChallenge(opponentId, challengeId, victory) {
    this.resetDailyActivities();
    const opponent = ARENA_OPPONENTS.find(item => item.id === opponentId);
    const active = this.data.arena.activeChallenge;
    if (!opponent || !challengeId || active?.challengeId !== challengeId || active.opponentId !== opponentId || typeof victory !== 'boolean') return { success: false, msg: '本次角斗挑战已结束或已变化。' };
    const previousPoints = this.data.arena.points;
    if (!Number.isSafeInteger(previousPoints) || previousPoints < 1000) return { success: false, msg: '角斗积分记录异常。' };
    this.data.arena.activeChallenge = null;
    this.data.arena.points = victory ? previousPoints + 25 : Math.max(1000, previousPoints - 10);
    const rank = this.getArenaRank(this.data.arena.points);
    this.data.arena.rankTitle = rank.title;
    const goldReward = victory ? opponent.goldReward ?? 1000 : 200;
    const prestigeReward = victory ? opponent.prestigeReward ?? 50 : 10;
    const expReward = victory ? (opponent.level || 15) * 120 : 0;
    this.gainCurrency(goldReward, 0, prestigeReward, false);
    this.addExp(expReward, false);
    const pointsDelta = this.data.arena.points - previousPoints;
    if (victory) this.triggerQuestAction('arena_duel');
    this.addSystemLog(`【王国角斗场】${victory ? '战胜' : '惜败于'}【${opponent.name}】，积分 ${pointsDelta >= 0 ? '+' : ''}${pointsDelta}（当前 ${this.data.arena.points}），声望 +${prestigeReward}、金币 +${goldReward}。`, 'battle', false);
    if (victory) this.addActionPoints(ACTION_POINTS.arena);
    this.notify();
    return { success: true, victory, points: this.data.arena.points, pointsDelta, rank: rank.title, prestigeReward, goldReward, expReward };
  }

  // 声望军需商行兑换
  buyPrestigeItem(shopItemId) {
    const shopItem = PRESTIGE_SHOP_ITEMS.find(i => i.id === shopItemId);
    if (!shopItem) return { success: false, msg: '商行中未找到该军需物资！' };

    if (this.data.prestige < shopItem.costPrestige) {
      return { success: false, msg: `声望不足！兑换【${shopItem.name}】需要 ${shopItem.costPrestige} 点声望（当前拥有 ${this.data.prestige} 点）！` };
    }

    if (!this.addItemToBag(shopItem.itemData)) return { success: false, msg: `行囊已满 (${this.data.bag.length}/${this.getBagCapacity()})，请先整理或扩容！` };
    this.data.prestige -= shopItem.costPrestige;

    this.addSystemLog(`【军需商行】支取 ${shopItem.costPrestige} 点声望，成功调配军需【${shopItem.name}】！`, 'obtain');
    this.notify();
    return { success: true, msg: `成功兑换【${shopItem.name}】！已收入行囊！` };
  }

  // 城市商店：读取货架（含等级/声望锁定、本日限购、可负担状态）
  getCityShop(cityId) {
    if (!ENABLE_CITY_SHOPS) return { success: false, msg: '城市商店暂未开放。' };
    const shop = CITY_SHOPS[cityId];
    if (!shop) return { success: false, msg: '未找到该城商店。' };
    const prestige = Number.isFinite(this.data.prestige) ? this.data.prestige : 0;
    const tier = prestigeTierOf(prestige);
    const purchase = (this.data.shops && this.data.shops.purchase && this.data.shops.purchase[cityId]) || {};
    const goods = shop.goods.map(g => {
      const soldToday = Number.isInteger(purchase[g.id]) ? purchase[g.id] : 0;
      const leftToday = Math.max(0, (g.limit?.perDay ?? 0) - soldToday);
      const levelOk = (this.data.level || 1) >= (g.unlock?.level || 0);
      const prestigeOk = tier >= (g.unlock?.tier || 0);
      const reqPrestige = SHOP_PRESTIGE_TIERS[g.unlock?.tier || 0]?.minPrestige || 0;
      const affordable = (this.data.gold || 0) >= (g.price?.gold || 0) && (this.data.crystal || 0) >= (g.price?.crystal || 0);
      let lockReason = '';
      if (!levelOk) lockReason = `需等级 Lv.${g.unlock.level}`;
      else if (!prestigeOk) lockReason = `需声望 ${reqPrestige} 解锁`;
      else if (leftToday <= 0) lockReason = '本行动日已售罄';
      return { ...g, soldToday, leftToday, reqPrestige, levelOk, prestigeOk, affordable, locked: !!lockReason, lockReason };
    });
    const nextTier = SHOP_PRESTIGE_TIERS.find(t => t.minPrestige > prestige) || null;
    return {
      success: true,
      shop: { id: shop.id, cityName: shop.cityName, shopName: shop.shopName, icon: shop.icon, categories: shop.categories },
      categories: SHOP_CATEGORIES.filter(c => shop.categories.includes(c.id)),
      prestige, tier, nextTier,
      goods
    };
  }

  // 城市商店：购买（金币/魔晶消费，声望只作门槛不消耗）
  buyCityShopGoods(cityId, goodsId, qty = 1) {
    if (!ENABLE_CITY_SHOPS) return { success: false, msg: '城市商店暂未开放。' };
    const shop = CITY_SHOPS[cityId];
    if (!shop) return { success: false, msg: '未找到该城商店。' };
    const good = shop.goods.find(g => g.id === goodsId);
    if (!good) return { success: false, msg: '商店中未找到该商品。' };
    const count = Math.max(1, Math.floor(Number(qty) || 1));
    if (!this.data.shops) this.data.shops = { day: this.getActionDay(), purchase: {} };
    if (!this.data.shops.purchase) this.data.shops.purchase = {};
    if (!this.data.shops.purchase[cityId]) this.data.shops.purchase[cityId] = {};

    if ((this.data.level || 1) < (good.unlock?.level || 0)) {
      return { success: false, msg: `等级不足！需达到 Lv.${good.unlock.level} 才能购买【${good.name}】。` };
    }
    const tier = prestigeTierOf(this.data.prestige || 0);
    if (tier < (good.unlock?.tier || 0)) {
      const reqPrestige = SHOP_PRESTIGE_TIERS[good.unlock.tier]?.minPrestige || 0;
      return { success: false, msg: `声望不足！需 ${reqPrestige} 声望解锁【${good.name}】（当前 ${this.data.prestige || 0} 点）。` };
    }
    const soldToday = Number.isInteger(this.data.shops.purchase[cityId][good.id]) ? this.data.shops.purchase[cityId][good.id] : 0;
    const perDay = good.limit?.perDay ?? 0;
    if (soldToday + count > perDay) {
      return { success: false, msg: `超出本行动日限购！【${good.name}】今日剩余 ${Math.max(0, perDay - soldToday)} 件。` };
    }
    const goldCost = (good.price?.gold || 0) * count;
    const crystalCost = (good.price?.crystal || 0) * count;
    if ((this.data.gold || 0) < goldCost || (this.data.crystal || 0) < crystalCost) {
      return { success: false, msg: `资源不足！购买需 ${goldCost} 金币${crystalCost ? `、${crystalCost} 魔晶` : ''}。` };
    }
    const unit = good.itemData || {};
    const totalItem = { ...unit, count: (unit.count || 1) * count };
    if (!this.addItemToBag(totalItem)) {
      return { success: false, msg: `行囊已满 (${this.data.bag.length}/${this.getBagCapacity()})，请先整理或扩容！` };
    }
    this.data.gold -= goldCost;
    this.data.crystal -= crystalCost;
    this.data.shops.purchase[cityId][good.id] = soldToday + count;
    this.addSystemLog(`【${shop.shopName}】花费 ${goldCost} 金币${crystalCost ? `、${crystalCost} 魔晶` : ''}，购入【${good.name}】×${count}。`, 'obtain');
    this.notify();
    return { success: true, msg: `成功购买【${good.name}】×${count}！已收入行囊。`, gold: goldCost, crystal: crystalCost };
  }

  // —— C3 主城 / 城际传送 / 特色资源点 ——
  getCities() {
    const current = this.data.currentCity || 'capital';
    const list = CITY_ORDER.filter(id => CITIES[id]).map(id => {
      const c = CITIES[id];
      return {
        id, name: c.name, short: c.short, scene: c.scene, unlockLevel: c.unlockLevel,
        unlocked: (this.data.level || 1) >= (c.unlockLevel || 0), current: id === current
      };
    });
    return { success: true, current, enabled: ENABLE_CITIES, cities: ENABLE_CITIES ? list : list.filter(c => c.id === 'capital') };
  }

  travelToCity(cityId) {
    if (!ENABLE_CITIES) return { success: false, msg: '城际传送暂未开放。' };
    const city = CITIES[cityId];
    if (!city) return { success: false, msg: '未找到该主城。' };
    if ((this.data.currentCity || 'capital') === cityId) return { success: true, msg: `已在【${city.short}】。`, cityId };
    if ((this.data.level || 1) < (city.unlockLevel || 0)) {
      return { success: false, msg: `等级不足！前往【${city.short}】需达到 Lv.${city.unlockLevel}。` };
    }
    this.data.currentCity = cityId;
    this.addSystemLog(`【城际传送】已抵达【${city.name}】。`, 'system');
    this.notify();
    return { success: true, msg: `已抵达【${city.name}】。`, cityId };
  }

  claimCitySpecial(cityId) {
    if (!ENABLE_CITIES) return { success: false, msg: '特色设施暂未开放。' };
    const city = CITIES[cityId];
    if (!city || !city.special) return { success: false, msg: '该主城没有特色资源点。' };
    if (!this.data.cities) this.data.cities = {};
    if (!this.data.cities[cityId]) this.data.cities[cityId] = { specialClaimedDay: 0 };
    const today = this.getActionDay();
    if (this.data.cities[cityId].specialClaimedDay === today) {
      return { success: false, msg: `【${city.special.name}】本行动日已领取，进入下一行动日后再来。` };
    }
    const reward = CITY_SPECIAL_REWARDS[cityId];
    if (!reward) return { success: false, msg: '该特色资源点暂无配置。' };
    const parts = [];
    if (reward.herbs) {
      this.data.estate = this.data.estate || {};
      this.data.estate.herbs = this.data.estate.herbs || {};
      for (const [id, n] of Object.entries(reward.herbs)) this.data.estate.herbs[id] = (this.data.estate.herbs[id] || 0) + n;
      parts.push('草药：' + Object.entries(reward.herbs).map(([id, n]) => `${id}+${n}`).join('、'));
    }
    if (Array.isArray(reward.items)) {
      for (const it of reward.items) {
        const base = SPECIAL_ITEMS[it.id] || { id: it.id, name: it.id, type: 'material' };
        if (!this.addItemToBag({ ...base, count: it.count })) return { success: false, msg: `行囊已满 (${this.data.bag.length}/${this.getBagCapacity()})，请先整理或扩容！` };
        parts.push(`${base.name || it.id}×${it.count}`);
      }
    }
    this.data.cities[cityId].specialClaimedDay = today;
    this.addSystemLog(`【${city.special.name}】领取：${parts.join('；')}。`, 'obtain');
    this.notify();
    return { success: true, msg: `已领取【${city.special.name}】奖励：${parts.join('；')}。`, cityId };
  }

  // —— C4-P0 称号 / 成就墙（纯展示 + 一次性小额奖励，不含竞技段位） ——
  // 单个成就的当前进度值（只读现有存档派生）
  achievementProgress(achievement) {
    const kind = achievement?.condition?.kind;
    switch (kind) {
      case 'promotion':
        return this.data.royalTrials?.completedStage || 0;
      case 'militaryRank': {
        const idx = MILITARY_RANKS.findIndex(r => r.id === (this.data.factionWar?.militaryRank || 'recruit'));
        return idx < 0 ? 0 : idx;
      }
      case 'setCodex': {
        const ids = new Set();
        for (const it of [...Object.values(this.data.equipped || {}), ...(this.data.bag || [])]) {
          if (it && it.setId && OFFICIAL_SETS[it.setId]) ids.add(it.setId);
        }
        return ids.size;
      }
      case 'petCodex':
        return Array.isArray(this.data.pets) ? this.data.pets.length : 0;
      case 'towerFloor':
        return this.data.castle?.maxReachedFloor || 1;
      case 'wildWins':
        return this.data.wildVictories || 0;
      case 'dungeonClears':
        return Object.values(this.data.dungeon?.clearedGates || {}).filter(n => n > 0).length;
      case 'dragonClears':
        return Object.values(this.data.dragon?.cleared || {}).filter(n => n > 0).length;
      default:
        return 0;
    }
  }

  getAchievements() {
    const claimed = this.data.achievements?.claimed || [];
    const items = ACHIEVEMENTS.map(a => {
      const target = a.condition?.value || 0;
      const raw = this.achievementProgress(a);
      const achieved = raw >= target;
      const isClaimed = claimed.includes(a.id);
      return { ...a, progress: { current: Math.min(raw, target), target, raw }, achieved, claimed: isClaimed, claimable: achieved && !isClaimed };
    });
    return {
      success: true,
      categories: ACHIEVEMENT_CATEGORIES.map(c => ({ ...c })),
      items,
      activeTitle: this.data.achievements?.activeTitle || null,
      titles: this.getTitles()
    };
  }

  claimAchievement(id) {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a) return { success: false, msg: '未找到该成就。' };
    if (!this.data.achievements) this.data.achievements = { claimed: [], activeTitle: null };
    if (this.data.achievements.claimed.includes(id)) return { success: false, msg: '该成就奖励已领取。' };
    const raw = this.achievementProgress(a);
    const target = a.condition?.value || 0;
    if (raw < target) return { success: false, msg: `尚未达成【${a.name}】（${raw}/${target}）。` };
    const gold = a.reward?.gold || 0;
    const prestige = a.reward?.prestige || 0;
    if (gold) this.data.gold += gold;
    if (prestige) this.data.prestige += prestige;
    this.data.achievements.claimed.push(id);
    const parts = [];
    if (gold) parts.push(`金币+${gold}`);
    if (prestige) parts.push(`声望+${prestige}`);
    if (a.title) parts.push(`称号【${a.title}】`);
    this.addSystemLog(`【荣耀成就】达成【${a.name}】：${parts.join('、')}。`, 'obtain');
    this.notify();
    return { success: true, msg: `已领取【${a.name}】：${parts.join('、')}。`, title: a.title || null };
  }

  // 已拥有的称号（转职封号 + 军衔 + 成就称号；不含竞技段位）
  getTitles() {
    const owned = [];
    const stage = this.data.royalTrials?.completedStage || 0;
    for (let s = 1; s <= Math.min(stage, ROYAL_TRIALS.length); s++) {
      owned.push({ id: 'career_' + s, name: this.getPromotedClassName(null, s), category: 'career' });
    }
    const idx = MILITARY_RANKS.findIndex(r => r.id === (this.data.factionWar?.militaryRank || 'recruit'));
    for (let i = 1; i <= idx && i < MILITARY_RANKS.length; i++) {
      owned.push({ id: 'rank_' + MILITARY_RANKS[i].id, name: MILITARY_RANKS[i].name, category: 'rank' });
    }
    const claimed = this.data.achievements?.claimed || [];
    for (const a of ACHIEVEMENTS) {
      if (a.title && claimed.includes(a.id)) owned.push({ id: 'title_' + a.id, name: a.title, category: 'achievement' });
    }
    const seen = new Set();
    return owned.filter(t => (seen.has(t.name) ? false : (seen.add(t.name), true)));
  }

  setActiveTitle(title) {
    const owned = this.getTitles();
    if (title && !owned.some(t => t.name === title)) return { success: false, msg: '尚未拥有该称号。' };
    if (!this.data.achievements) this.data.achievements = { claimed: [], activeTitle: null };
    this.data.achievements.activeTitle = title || null;
    this.addSystemLog(`【称号】当前展示称号：${title || '（无）'}。`, 'system');
    this.notify();
    return { success: true, msg: title ? `已佩戴称号【${title}】。` : '已取消称号展示。' };
  }

  // 鱼市兑换：鱼获是实际计数，必须能消费；按行动日限制兑换次数，只换基础资源。
  exchangeFish(kind = 'lamprey', quantity = 1) {
    const qty = Math.max(1, Math.min(10, Math.floor(Number(quantity) || 1)));
    const day = this.getActionDay();
    const fishing = this.data.fishing || (this.data.fishing = { lamprey: 0, arowana: 0 });
    if (fishing.exchangeDay !== day) {
      fishing.exchangeDay = day;
      fishing.exchangeCount = 0;
    }
    if ((fishing.exchangeCount || 0) + qty > 3) return { success: false, msg: '本行动日鱼市兑换次数已满（最多 3 次）。' };
    const need = kind === 'arowana' ? 5 : 10;
    if ((fishing[kind] || 0) < need * qty) return { success: false, msg: `鱼获不足：需要 ${need * qty} 条${kind === 'arowana' ? '金龙鱼' : '七鳃鳗'}。` };
    fishing[kind] -= need * qty;
    fishing.exchangeDay = day;
    fishing.exchangeCount = (fishing.exchangeCount || 0) + qty;
    if (kind === 'arowana') {
      this.gainCurrency(0, 30 * qty, 0, false);
      this.grantBattleLoot({ ...SPECIAL_ITEMS.pet_food_basic, count: 2 * qty });
      this.notify();
      return { success: true, msg: `鱼市兑换：金龙鱼 ×${need * qty} → 魔晶 +${30 * qty}、普通宠物口粮 ×${2 * qty}。` };
    }
    this.gainCurrency(0, 50 * qty, 0, false);
    this.notify();
    return { success: true, msg: `鱼市兑换：七鳃鳗 ×${need * qty} → 魔晶 +${50 * qty}。` };
  }

  // 钓鱼系统
  fish(isLuxury) {
    const baitId = isLuxury ? 'bait_luxury' : 'bait_normal';
    const baitItem = this.data.bag.find(i => i.id === baitId && i.count > 0);
    if (!baitItem) return { success: false, msg: `背包中缺少【${isLuxury ? '高级鱼饵' : '普通鱼饵'}】！` };

    baitItem.count--;
    if (baitItem.count <= 0) this.data.bag = this.data.bag.filter(i => i !== baitItem);

    const roll = Math.random() * 100;
    if (isLuxury) {
      if (roll < 65) {
        this.data.fishing.arowana = (this.data.fishing.arowana || 0) + 1;
        this.data.crystal += 50;
        this.notify();
        return { success: true, msg: '浮标巨震！成功钓获极品【金龙鱼】x1！获得魔晶石 +50！' };
      } else {
        this.data.crystal += 80;
        this.notify();
        return { success: true, msg: '鱼钩挂住水底秘宝！直接收获【魔晶宝袋】，魔晶 +80！' };
      }
    } else {
      if (roll < 75) {
        this.data.fishing.lamprey = (this.data.fishing.lamprey || 0) + 1;
        this.data.crystal += 15;
        this.notify();
        return { success: true, msg: '鱼竿轻颤，成功钓上生猛【七鳃鳗】x1！获得魔晶石 +15！' };
      } else {
        this.data.gold += 300;
        this.notify();
        return { success: true, msg: '钓起落水钱袋，收获金币 +300！' };
      }
    }
  }

  // 侍从管理：契印收押、整备、折磨、采矿
  captureSlaveWithSigil(slaveId) {
    return estateDomain.captureSlaveWithSigil(this, slaveId);
  }

  comfortSlave(slaveId) {
    return estateDomain.comfortSlave(this, slaveId);
  }

  disciplineSlave(slaveId, now = Date.now()) {
    return estateDomain.disciplineSlave(this, slaveId, now);
  }

  assignSlaveMine(slaveId, now = Date.now()) {
    return estateDomain.assignSlaveMine(this, slaveId, now);
  }

  // 任务触发器
  isQuestMilestoneAchieved(milestone) {
    if (!milestone) return false;
    if (milestone.type === 'stronghold') return Object.values(this.data.factionWar?.strongholds || {}).some(record => record?.captured === true);
    if (milestone.type === 'dungeon') return (this.data.dungeon?.clearedGates?.[milestone.gateId] || 0) > 0;
    if (milestone.type === 'promotion') return (this.data.royalTrials?.completedStage || 0) >= milestone.stage;
    if (milestone.type === 'tower') return (this.data.castle?.claimedBossRewards || []).includes(milestone.floor);
    return false;
  }

  meetCityGuard() {
    if (!this.data.hasChosenClass || this.data.onboardingVersion !== 2 || this.data.currentQuestId !== 'quest_1') return { success: false, msg: '先继续手头的委托。' };
    this.triggerQuestAction('meet_guard');
    return { success: true };
  }

  allocateRecommendedStats() {
    const points = this.data.freeStatPoints;
    if (!Number.isSafeInteger(points) || points <= 0 || !this.data.hasChosenClass) return { success: false, msg: '没有待分配的潜能。' };
    const primary = (CLASSES[this.data.classId] || CLASSES.warrior).primaryStat;
    const health = Math.floor(points * 0.3);
    this.data.freeStatPoints = 0;
    this.data.allocatedStats[primary] += points - health;
    this.data.allocatedStats.con += health;
    this.notify();
    return { success: true, primary, points, health };
  }

  recordRegionalStory(action, target, floor = null) {
    const event = getRegionalStory(this.data);
    if (!event || event.action !== action || event.target !== target) return;
    const progress = this.data.questProgress[event.id] ||= { current: 0, completed: false, claimed: false };
    if (progress.completed || progress.claimed) return;
    if (action === 'dungeon' && floor !== null) {
      const steps = getInvestigationSteps(event);
      if (!Number.isInteger(floor) || floor < 1 || floor > steps) return;
      progress.floorProgress = Math.max(progress.floorProgress || 0, floor);
      if (floor === steps) progress.current = event.count;
    } else progress.current = Math.min(event.count, progress.current + 1);
    progress.completed = progress.current === event.count;
    // Earn finite investigation experience with each objective, so a short
    // sequence grows steadily instead of granting up to eight levels at once.
    const earned = getInvestigationEarnedExperience(event, progress);
    const exp = earned - (progress.expGranted || 0);
    progress.expGranted = earned;
    this.addExp(exp, false);
  }

  claimRegionalStory(eventId) {
    const event = getRegionalStory(this.data);
    const progress = this.data.questProgress[eventId];
    if (!event || event.id !== eventId || !progress?.completed || progress.claimed || !Number.isSafeInteger(progress.current) || progress.current !== event.count) return { success: false, msg: '调查尚未完成，或这份补给已经领取。' };
    progress.claimed = true;
    // Older saves have no expGranted field: preserve their unpaid reward.
    const exp = event.exp - (progress.expGranted || 0);
    progress.expGranted = event.exp;
    this.addExp(exp, false);
    this.gainCurrency(1000, 20, event.prestige, false);
    this.grantBattleLoot({ ...SPECIAL_ITEMS.pet_food, count: 3 });
    this.addSystemLog(`【${event.speaker}】${event.title}已经完成。${exp > 0 ? `经验 +${exp}，` : '调查经验已随战斗获得，'}声望 +${event.prestige}，获得3份伙伴口粮。`, 'quest', false);
    this.notify();
    return { success: true, event, exp };
  }

  triggerQuestAction(actionType, value = 1) {
    const q = getQuestList(this.data).find(it => it.id === this.data.currentQuestId);
    if (!q) return { matched: false, completed: false };
    // 续章靠生产通关记录认可，泛化动作/钥匙跳层不作为胜利凭据。
    if (q.milestone) {
      if (actionType !== q.targetAction || !this.isQuestMilestoneAchieved(q.milestone)) return { matched: false, completed: false };
      this.reconcileQuestMilestones();
      this.notify();
      return { matched: true, completed: Boolean(this.data.questProgress[q.id]?.completed), quest: q };
    }

    const ALIAS_MAP = {
      'claim_salary': ['claim_salary', 'salary'],
      'enhance': ['enhance', 'enhance_gear'],
      'enhance_gear': ['enhance', 'enhance_gear'],
      'set_active_pet': ['set_active_pet'],
      'wash_aptitude': ['wash_aptitude', 'wash_pet'],
      'wash_pet': ['wash_aptitude', 'wash_pet'],
      'learn_skill': ['learn_skill', 'study_skill'],
      'clear_tower': ['clear_tower', 'clear_tower_1', 'clear_tower_10', 'clear_tower_20'],
      'clear_tower_1': ['clear_tower_1'],
      'clear_tower_10': ['clear_tower_10'],
      'clear_tower_20': ['clear_tower_20'],
      'brew_potion': ['brew_potion'],
      'hire_merc': ['hire_merc'],
      'socket_gem': ['socket_gem'],
      'slay_dragon': ['slay_dragon'],
      'royal_trials': ['royal_trials'],
      'clear_dungeon': ['clear_dungeon'],
      'arena_duel': ['arena_duel'],
      'reforge_gear': ['reforge_gear', 'reforge', 'smithy_reforge'],
      'slay_wild_boss': ['slay_wild_boss', 'wild_boss'],
      'catch_thief': ['catch_thief'],
      'slay_silver_dragon': ['slay_silver_dragon'],
      'evolve_purplegold': ['evolve_purplegold']
    };

    const targetList = ALIAS_MAP[q.targetAction] || [q.targetAction, q.targetType];
    const isMatched = targetList.includes(actionType) || q.targetAction === actionType || q.targetType === actionType;

    if (isMatched) {
      const targetCount = q.requiredCount || q.targetCount || 1;
      const curProg = this.data.questProgress[q.id] || { current: 0, completed: false };
      const wasCompleted = curProg.completed;
      curProg.current = Math.min(targetCount, curProg.current + value);
      if (curProg.current >= targetCount) curProg.completed = true;
      this.data.questProgress[q.id] = curProg;
      if (!wasCompleted && curProg.completed) {
        this.addSystemLog(`主线任务【${q.title}】目标已达成！请在底部任务栏领受犒赏。`, 'quest');
      }
      this.notify();
      return { matched: true, completed: curProg.completed, quest: q };
    }
    return { matched: false, completed: false };
  }


  reconcileQuestMilestones() {
    const quest = getQuestList(this.data).find(quest => quest.id === this.data.currentQuestId);
    if (!quest) return;
    const progress = this.data.questProgress[quest.id] || { current: 0, completed: false };
    // Legacy saves start with maxReachedFloor=1 before any victory; only higher
    // milestones provide historical proof. Floor 1 still requires its battle event.
    const floor = { clear_tower_10: 10, clear_tower_20: 20 }[quest.targetAction];
    const achieved = this.isQuestMilestoneAchieved(quest.milestone) || (floor && (this.data.castle.maxReachedFloor || 0) >= floor)
      || (quest.targetAction === 'slay_dragon' && Number.isSafeInteger(this.data.dragon.cleared.slay_red_dragon) && this.data.dragon.cleared.slay_red_dragon > 0)
      || (quest.targetAction === 'slay_silver_dragon' && Number.isSafeInteger(this.data.dragon.cleared.slay_silver_dragon) && this.data.dragon.cleared.slay_silver_dragon > 0)
      || (quest.targetAction === 'royal_trials' && (this.data.royalTrials.completedStage || 0) > 0)
      || (quest.targetAction === 'evolve_purplegold' && this.data.pets.some(pet => pet.tier === 'purplegold'));
    if (achieved && !progress.claimed) {
      progress.current = quest.requiredCount || 1;
      progress.completed = true;
    }
    this.data.questProgress[quest.id] = progress;
    if (quest.targetAction === 'catch_thief' && !progress.completed && !progress.claimed) {
      this.data.maskedThief.appeared = true;
      this.data.maskedThief.location ||= (MAPS.find(map => map.id === this.data.currentMapId) || MAPS[0]).name;
    }
  }

  claimQuestReward(questId) {
    const quests = getQuestList(this.data);
    const q = quests.find(it => it.id === questId);
    if (!q) return false;
    const curProg = this.data.questProgress[q.id];
    if (questId !== this.data.currentQuestId || !curProg || !curProg.completed || curProg.claimed) return false;
    // 先锁定领取，防止事件重入与刷新后重复发奖。
    curProg.claimed = true;

    const baseRewards = q.rewards || q.reward || {};
    const r = { ...baseRewards, items: (baseRewards.items || []).map(item => specializeEquipment(item, this.data.classId)) };
    if (r.exp) this.addExp(r.exp);
    if (r.gold || r.crystal) {
      this.gainCurrency(r.gold || 0, r.crystal || 0, 0);
    }

    if (r.items && r.items.length) {
      r.items.forEach(rItem => {
        if (rItem.type === 'herb') {
          this.data.estate.herbs[rItem.id] = (this.data.estate.herbs[rItem.id] || 0) + (rItem.count || 1);
          return;
        }
        const exist = this.data.bag.find(b => b.id === rItem.id);
        if (exist && !rItem.slot) {
          exist.count = (exist.count || 1) + (rItem.count || 1);
        } else {
          this.data.bag.push({ ...rItem, ...(rItem.slot ? {
            reqLevel: rItem.reqLevel ?? rItem.level,
            setId: rItem.setId ?? rItem.set,
            stars: 0, durability: 100, maxDurability: 100, sockets: rItem.sockets ?? rItem.holes ?? 0, gems: []
          } : {}), uid: 'quest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) });
        }
      });
    }

    const rewardNames = [];
    if (r.exp) rewardNames.push(`经验 +${r.exp}`);
    if (r.gold) rewardNames.push(`金币 +${r.gold}`);
    if (r.crystal) rewardNames.push(`魔晶 +${r.crystal}`);
    if (r.items && r.items.length) {
      r.items.forEach(i => rewardNames.push(`【${i.name}】x${i.count || 1}`));
    }
    this.addSystemLog(`成功交付主线【${q.title}】！获赐：${rewardNames.join('、')}`, 'quest');

    const curIdx = quests.findIndex(it => it.id === questId);
    if (curIdx < quests.length - 1) {
      this.data.currentQuestId = quests[curIdx + 1].id;
      this.data.questProgress[this.data.currentQuestId] = { current: 0, completed: false };
      const nextQ = quests[curIdx + 1];
      this.reconcileQuestMilestones();
      if (nextQ.targetAction === 'catch_thief') {
        this.data.maskedThief.appeared = true;
        this.data.maskedThief.location = (MAPS.find(map => map.id === this.data.currentMapId) || MAPS[0]).name;
        this.addSystemLog('狼王巢穴中发现被劫商队的王室印记。黑羽女盗已在野外现身，追踪她夺回秘宝。', 'quest');
      }
      this.addSystemLog(`开启新任务篇章：【${nextQ.title}】`, 'quest');
    } else {
      this.data.currentQuestId = 'completed';
    }
    this.notify();
    return true;
  }

  // ==========================================
  // 皇家酒馆与赏金悬赏令核心逻辑
  // ==========================================
  getCommissions(groups) {
    return COMMISSIONS.filter(config => !groups || groups.includes(config.group)).map(config => ({
      ...getCommission(config.id, this.data.nation),
      status: this.data.commissions?.[config.id]?.status || 'available',
      current: this.data.commissions?.[config.id]?.current || 0,
      choiceId: this.data.commissions?.[config.id]?.choiceId,
      progressText: config.storyBeats?.[(this.data.commissions?.[config.id]?.current || 0) - 1] || '',
      choices: (config.rewards.equipmentChoices || []).map(item => specializeEquipment(item, this.data.classId)),
      destination: config.requirement.event === 'tower' ? '魔塔' : MAPS.find(map => map.id === config.requirement.target)?.name,
      lockedReason: this.data.level < config.minLevel ? `需达到 ${config.minLevel} 级`
        : config.prerequisite && this.data.commissions?.[config.prerequisite]?.status !== 'claimed'
          ? `先交付「${getCommission(config.prerequisite, this.data.nation).title}」` : ''
    }));
  }

  getCommissionEquipmentPreview(id, choiceId) {
    const config = getCommission(id, this.data.nation);
    const item = getCommissionEquipment(config, choiceId, this.data.classId);
    if (!item || !this.data.hasChosenClass) return { success: false, msg: '没有可比较的委托装备。' };
    return { success: true, before: this.getEffectiveStats(),
      after: this.getEffectiveStats({ ...this.data.equipped, [item.slot]: item }),
      currentName: this.data.equipped[item.slot]?.name || '未穿戴', targetName: item.name,
      reqLevel: item.reqLevel, canEquip: this.data.level >= item.reqLevel };
  }

  acceptCommission(id) {
    const config = getCommission(id, this.data.nation);
    if (!config || !this.data.hasChosenClass || this.data.level < config.minLevel) return { success: false, msg: '委托不存在、尚未缔约或等级不足。' };
    if (config.prerequisite && this.data.commissions?.[config.prerequisite]?.status !== 'claimed') return { success: false, msg: `先交付「${getCommission(config.prerequisite, this.data.nation).title}」，再接续这段旅程。` };
    if (this.data.commissions?.[id]) return { success: false, msg: '这份委托已经接取或交付。' };
    this.data.commissions ??= {};
    this.data.commissions[id] = { status: 'active', current: 0 };
    this.addSystemLog(`【委托接取】${config.title}：${config.requirement.label}。`, 'quest', false);
    this.notify();
    return { success: true, msg: '委托已记入任务簿。接取后的胜利才计入进度。' };
  }

  // Called only by successful production settlements; never by UI navigation.
  recordCommissionEvent(event, target) {
    for (const config of COMMISSIONS) {
      const progress = this.data.commissions?.[config.id];
      const requirement = config.requirement;
      if (progress?.status !== 'active' || requirement.event !== event ||
        (requirement.target !== '*' && requirement.target !== target)) continue;
      progress.current = Math.min(requirement.count, progress.current + 1);
      if (config.storyBeats?.[progress.current - 1]) {
        this.addSystemLog(`【${config.title}】${config.storyBeats[progress.current - 1]}`, 'quest', false);
      }
      if (progress.current === requirement.count) {
        progress.status = 'ready';
        this.addSystemLog(`【委托完成】${config.title}，可返回${config.group === 'nation_guide' ? '圣王大殿' : '皇家酒馆'}交付。`, 'quest', false);
      }
    }
  }

  claimCommission(id, choiceId) {
    const config = getCommission(id, this.data.nation);
    const progress = this.data.commissions?.[id];
    if (!config || progress?.status !== 'ready' || progress.current !== config.requirement.count) return { success: false, msg: '委托尚未完成或已经领取。' };
    const choices = config.rewards.equipmentChoices || [];
    const chosen = choices.find(item => item.id === choiceId);
    if ((choices.length && !chosen) || (!choices.length && choiceId !== undefined)) return { success: false, msg: '请从这份委托的装备中选择一件报酬。' };
    // Mark first; grant the complete reward before publishing/persisting.
    progress.status = 'claimed';
    if (chosen) progress.choiceId = chosen.id;
    const reward = config.rewards;
    this.addExp(reward.exp, false);
    this.gainCurrency(reward.gold, reward.crystal, reward.prestige, false);
    reward.items.forEach(item => this.grantBattleLoot(item));
    const equipment = getCommissionEquipment(config, choiceId, this.data.classId);
    if (equipment) this.grantBattleLoot(equipment);
    this.addSystemLog(`【委托交付】${config.title}，报酬已全额存入行囊。`, 'quest', false);
    this.notify();
    return { success: true, msg: `${config.ending}\n\n经验 +${reward.exp}，金币 +${reward.gold}，魔晶 +${reward.crystal}，声望 +${reward.prestige}；${reward.items.map(item => `${item.name} ×${item.count}`).join('、')}${equipment ? `；已选择【${equipment.name}】` : ''}。` };
  }

  getTavernBounties() {
    if (!this.data.tavern) {
      this.data.tavern = {
        bounties: TAVERN_BOUNTIES.map(b => ({ id: b.id, status: 'available' })),
        drinkBuff: null,
        lastResetDate: this.getResetDayKey()
      };
    }
    const list = this.data.tavern.bounties || [];
    return TAVERN_BOUNTIES.map(cfg => {
      const found = list.find(b => b.id === cfg.id);
      return {
        ...cfg,
        status: found ? found.status : 'available'
      };
    });
  }

  acceptBounty(bountyId) {
    const config = TAVERN_BOUNTIES.find(b => b.id === bountyId);
    if (!config || this.data.level < config.reqLevel) return { success: false, msg: '悬赏不存在或等级不足。' };
    if (!this.data.tavern) this.getTavernBounties();
    const bounties = this.data.tavern.bounties || [];
    let item = bounties.find(b => b.id === bountyId);
    if (item) {
      if (item.status !== 'available') return { success: false, msg: '该悬赏已接取或已完成，请按当前进度交令。' };
      item.status = 'in_progress';
    } else {
      item = { id: bountyId, status: 'in_progress' };
      bounties.push(item);
    }
    this.data.tavern.bounties = bounties;
    this.addSystemLog(`【酒馆悬赏】成功揭下悬赏令，受命缉拿妖邪首领！`, 'quest');
    this.notify();
    return { success: true, msg: '成功揭榜接取悬赏令！速速前往深渊讨伐目标！' };
  }

  completeBountyBattle(bountyId) {
    if (!this.data.tavern) this.getTavernBounties();
    const bounties = this.data.tavern.bounties || [];
    let item = bounties.find(b => b.id === bountyId);
    if (!item || item.status !== 'in_progress') return { success: false, msg: '悬赏未接取或已结算。' };
    item.status = 'ready_to_claim';
    this.data.tavern.bounties = bounties;
    this.addSystemLog(`【悬赏大捷】悬赏凶物已被彻底斩杀！速回王都酒馆悬赏榜交令领赏！`, 'quest');
    this.addActionPoints(ACTION_POINTS.bounty);
    this.notify();
    return { success: true };
  }

  claimBountyReward(bountyId) {
    const cfg = TAVERN_BOUNTIES.find(b => b.id === bountyId);
    if (!cfg) return { success: false, msg: '未知的悬赏令！' };
    const item = (this.data.tavern?.bounties || []).find(b => b.id === bountyId);
    if (!item || item.status !== 'ready_to_claim') {
      return { success: false, msg: '该悬赏尚未斩杀目标，无法领取赏金！' };
    }
    item.status = 'completed';
    this.addExp(cfg.rewards.exp);
    this.gainCurrency(cfg.rewards.gold, cfg.rewards.crystal, cfg.rewards.prestige);
    if (cfg.rewards.items && cfg.rewards.items.length > 0) {
      cfg.rewards.items.forEach(it => {
        const existing = this.data.bag.find(b => b.id === it.id && !b.slot);
        if (existing) {
          existing.count = (existing.count || 1) + (it.count || 1);
        } else {
          this.data.bag.push({ ...it, uid: 'bounty_it_' + Date.now() + Math.random().toString(36).slice(2, 6) });
        }
      });
    }
    this.addSystemLog(`【赏金交令】恭贺骑士达成【${cfg.title}】！获赐赏金 ${cfg.rewards.gold} 金币、${cfg.rewards.prestige} 声望！`, 'quest');
    this.notify();
    return { success: true, msg: `悬赏赏金全额结清！金币 +${cfg.rewards.gold}，经验 +${cfg.rewards.exp}，声望 +${cfg.rewards.prestige}，魔晶 +${cfg.rewards.crystal}！` };
  }

  orderTavernDrink(drinkId) {
    if (!this.data.tavern) this.getTavernBounties();
    const drink = TAVERN_DRINKS.find(d => d.id === drinkId);
    if (!drink) return { success: false, msg: '吧台无此特调美酒！' };
    if (this.data.gold < drink.costGold) {
      return { success: false, msg: `金币不足！品尝【${drink.name}】需支付 ${drink.costGold} 金币！` };
    }
    this.data.gold -= drink.costGold;
    this.data.tavern.drinkBuff = {
      id: drink.id,
      name: drink.name,
      buff: drink.buff,
      boughtAt: Date.now()
    };
    this.addSystemLog(`【皇家酒馆】骑士豪饮一杯【${drink.name}】！激活特调酒力：${drink.buff.desc}！`, 'obtain');
    this.notify();
    return { success: true, msg: `痛饮【${drink.name}】！全身热血沸腾，${drink.buff.desc}！效果持续整日！` };
  }

  // ================= 远古神圣圣遗物系统 =================
  checkUnlockRelics(floor, publish = true) {
    return heroStatsDomain.checkUnlockRelics(this, floor, publish);
  }

  getRelics() {
    return heroStatsDomain.getRelics(this.data);
  }
}

export const gameState = new GameState();
