// 全局状态管理器与深度单机属性计算 (100% 贴合《魔塔世界》百度百科原著)
import { CLASSES, NATIONS } from '../config/classes.js';
import { PET_CONFIGS, PET_TIERS } from '../config/pets.js';
import { PET_SKILL_BOOKS } from '../config/petSkills.js';
import { ITEM_SLOTS, QUALITIES, OFFICIAL_SETS, SPECIAL_ITEMS, REFORGE_AFFIXES, GEMS_CONFIG } from '../config/items.js';
import { DUNGEON_GATES } from '../config/dungeons.js';
import { DRAGON_TRIALS } from '../config/dragonSlaying.js';
import { ROYAL_TRIALS } from '../config/trials.js';
import { SLAVE_CANDIDATES } from '../config/slaves.js';
import { ALCHEMY_RECIPES, MERCENARIES } from '../config/estate.js';
import { ARENA_RANKS, ARENA_OPPONENTS, PRESTIGE_SHOP_ITEMS } from '../config/arena.js';
import { QUEST_LIST } from '../config/quests.js';
import { TAVERN_BOUNTIES, TAVERN_DRINKS } from '../config/tavern.js';
import { RUNES, RUNIC_WORDS, checkRunicWord } from '../config/runes.js';
import { MILITARY_RANKS, STRONGHOLDS, FACTION_REWARDS } from '../config/factionWar.js';
import { HOLY_RELICS, getUnlockedRelics, getRelicsTotalStats, getRelicById } from '../config/relics.js';
import { storage } from './storage.js';

export class GameState {
  constructor() {
    this.listeners = [];
    this.systemLogs = [];
    this.data = this.createDefaultData();
    this.initDefaultLogs();
  }

  initDefaultLogs() {
    this.addSystemLog('欢迎降临亚诺大陆！重温2011魔幻神作《魔塔世界》经典原著篇章！', 'system');
    this.addSystemLog('主线指引已启动，可随时查阅底部【任务追踪】获取丰厚冒险赏赐。', 'quest');
  }

  addSystemLog(text, type = 'system') {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const logItem = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      time: timeStr,
      type, // 'obtain' | 'battle' | 'quest' | 'forge' | 'pet' | 'estate' | 'system'
      text
    };
    if (!this.systemLogs) this.systemLogs = [];
    this.systemLogs.push(logItem);
    if (this.systemLogs.length > 80) {
      this.systemLogs.shift();
    }
    this.notify();
    return logItem;
  }

  createDefaultData() {
    return {
      name: '亚诺救世主',
      nation: 'aden', // 亚丁 (Aden)、克斯特 (Kester)、萨格尔 (Sagael)
      classId: 'warrior',
      title: '见习勇者',
      hasChosenClass: true,
      level: 1,
      exp: 0,
      gold: 2500,
      crystal: 150,
      prestige: 200,
      freeStatPoints: 8,
      allocatedStats: { str: 0, int: 0, dex: 0, con: 0 },

      // 10大装备部位 (含耐久度、星级、开孔与宝石)
      equipped: {
        weapon: {
          id: 'novice_sword', name: '新兵铁剑', slot: 'weapon', quality: 'blue',
          durability: 100, maxDurability: 100, stars: 1, sockets: 1, gems: [],
          stats: { atk: 35, hit: 5 }, icon: 'images/items/wpn_sword.svg', uid: 'eq_wpn_1'
        },
        armor: {
          id: 'novice_armor', name: '新兵皮甲', slot: 'armor', quality: 'blue',
          durability: 100, maxDurability: 100, stars: 0, sockets: 0, gems: [],
          stats: { def: 18, hp: 120 }, icon: 'images/items/arm_chest.svg', uid: 'eq_arm_1'
        },
        pants: null,
        cloak: null,
        helmet: null,
        gloves: null,
        boots: null,
        belt: null,
        necklace: null,
        ring: null
      },

      // 背包道具 (钥匙、升星水晶、保护水晶、进阶石、肉块、鱼饵、晶石、装备散件等)
      bag: [
        // 经典原著装备散件 (体验换装与套装效果)
        {
          id: 'courage_helmet',
          name: '勇气轻盔',
          slot: 'helmet',
          quality: 'gold',
          reqLevel: 1,
          durability: 100,
          maxDurability: 100,
          stars: 1,
          sockets: 1,
          gems: [],
          stats: { def: 15, hp: 160 },
          icon: 'images/items/eq_helmet.svg',
          setId: 'courage',
          desc: '【勇气套装】部件之一，散发着坚毅的光泽。',
          uid: 'bag_init_eq_1'
        },
        {
          id: 'courage_pants',
          name: '勇气皮裤',
          slot: 'pants',
          quality: 'gold',
          reqLevel: 1,
          durability: 100,
          maxDurability: 100,
          stars: 0,
          sockets: 1,
          gems: [],
          stats: { def: 20, hp: 200 },
          icon: 'images/items/eq_pants.svg',
          setId: 'courage',
          desc: '【勇气套装】部件之一，集齐2件可激活巨额攻击与生命加成！',
          uid: 'bag_init_eq_2'
        },
        {
          id: 'novice_boots',
          name: '新兵行军靴',
          slot: 'boots',
          quality: 'blue',
          reqLevel: 1,
          durability: 100,
          maxDurability: 100,
          stars: 0,
          sockets: 0,
          gems: [],
          stats: { def: 10, speed: 12 },
          icon: 'images/items/eq_boots.svg',
          desc: '皮质军靴，提升跑动巡航与出招速度。',
          uid: 'bag_init_eq_3'
        },
        {
          id: 'silver_ring',
          name: '守护银戒',
          slot: 'ring',
          quality: 'blue',
          reqLevel: 1,
          durability: 100,
          maxDurability: 100,
          stars: 0,
          sockets: 0,
          gems: [],
          stats: { atk: 18, crit: 5 },
          icon: 'images/items/eq_ring.svg',
          desc: '王国银矿提炼打造成的戒指，增加暴击与伤害。',
          uid: 'bag_init_eq_4'
        },
        { ...SPECIAL_ITEMS.key_redwood, count: 5, uid: 'it_key_1' },
        { ...SPECIAL_ITEMS.key_bronze, count: 2, uid: 'it_key_2' },
        { ...SPECIAL_ITEMS.key_mithril, count: 2, uid: 'it_key_mithril_1' },
        { ...SPECIAL_ITEMS.key_obsidian, count: 1, uid: 'it_key_obsidian_1' },
        { ...SPECIAL_ITEMS.key_titan, count: 2, uid: 'it_key_titan_1' },
        { ...SPECIAL_ITEMS.key_platinum, count: 1, uid: 'it_key_3' },
        { ...SPECIAL_ITEMS.rune_sol, count: 2, type: 'rune', uid: 'it_rune_sol_1' },
        { ...SPECIAL_ITEMS.rune_cham, count: 2, type: 'rune', uid: 'it_rune_cham_1' },
        { ...SPECIAL_ITEMS.rune_el, count: 2, type: 'rune', uid: 'it_rune_el_1' },
        { ...SPECIAL_ITEMS.rune_lo, count: 2, type: 'rune', uid: 'it_rune_lo_1' },
        { ...SPECIAL_ITEMS.star_crystal, count: 12, uid: 'it_star_1' },
        { ...SPECIAL_ITEMS.protect_crystal, count: 4, uid: 'it_prot_1' },
        { ...SPECIAL_ITEMS.socket_crystal, count: 6, uid: 'it_sock_1' },
        { ...SPECIAL_ITEMS.evolution_stone, count: 2, uid: 'it_evo_1' },
        { ...SPECIAL_ITEMS.destiny_stone, count: 1, uid: 'it_dest_1' },
        { ...SPECIAL_ITEMS.pet_food, count: 15, uid: 'it_food_1' },
        { ...SPECIAL_ITEMS.bait_normal, count: 10, uid: 'it_bait_1' },
        { ...SPECIAL_ITEMS.bait_luxury, count: 3, uid: 'it_bait_2' },
        { ...SPECIAL_ITEMS.crystal_gold, count: 8, uid: 'it_cg_1' },
        { ...SPECIAL_ITEMS.crystal_darkgold, count: 5, uid: 'it_cdg_1' },
        { ...SPECIAL_ITEMS.pill_reborn, count: 10, uid: 'it_pill_1' },
        { id: 'book_counter', name: '远古魔导书·【高级反击】', count: 1, icon: 'book_counter', quality: 'darkgold', desc: '宠物研习技能！' },
        { id: 'gem_atk', name: '金刚石', stat: 'atk', val: 25, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_atk.svg', count: 2, desc: '增加攻击力+25', uid: 'bag_init_gem_1' },
        { id: 'gem_def', name: '玛瑙石', stat: 'def', val: 18, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_def.svg', count: 2, desc: '增加防御值+18', uid: 'bag_init_gem_2' },
        { id: 'gem_hp', name: '红宝石', stat: 'maxHp', val: 180, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_hp.svg', count: 2, desc: '增加生命上限+180', uid: 'bag_init_gem_3' },
        { id: 'gem_dex', name: '翡翠石', stat: 'speed', val: 8, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_dex.svg', count: 2, desc: '增加先手速度+8', uid: 'bag_init_gem_4' }
      ],

      // 经典宠物列表 (包含体力机制与阶级)
      pets: [
        {
          id: 'golden_dragon',
          level: 1,
          exp: 0,
          tier: 'gold', // gold / darkgold / purplegold
          stamina: 100, // 0~100，低于60特性失效
          apt: { str: 1500, int: 1000, dex: 1200, con: 1400 },
          skills: []
        }
      ],
      activePetId: 'golden_dragon',

      // 古堡探险 (原著魔塔钥匙进阶机制)
      castle: {
        floor: 1,
        maxReachedFloor: 1,
        accumulatedExp: 0,
        accumulatedGold: 0,
        accumulatedDrops: [],
        isExploring: false,
        entriesLeft: 3
      },

      // 副本七大门
      dungeon: {
        entriesLeft: 5,
        activeGateId: null,
        activeGateFloor: 1,
        clearedGates: {}
      },

      // 屠龙系统
      dragon: {
        trialsLeft: 3,
        cleared: {}
      },

      // 侍从/家奴系统 (俘获、安抚防抢、折磨榨取、劳作采矿、副本助战)
      slaves: {
        list: [
          {
            id: 'slave_1',
            name: '背叛的近卫队长·马库斯',
            title: '原皇家骑士',
            level: 25,
            avatar: 'avatar_warrior',
            isComforted: true,
            comfortUntil: Date.now() + 3600000 * 2,
            workedTimes: 0
          }
        ],
        assistingSlaveId: 'slave_1'
      },

      // 王宫幻境试炼与八大封号
      royalTrials: {
        currentTitle: '见习勇者',
        completedStage: 0
      },

      // 钓鱼收获
      fishing: {
        lamprey: 0,  // 七鳃鳗
        arowana: 0   // 金龙鱼
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
          herb_dragonblood: 8,
          herb_starlight: 8,
          herb_spiritflower: 8
        },
        activePotions: [],
        hiredMercId: 'merc_paladin',
        lastHarvestTime: Date.now()
      },

      // 野外巡航与当前探索点
      currentMapId: 'forest',

      // 主线任务指引系统
      currentQuestId: 'quest_1',
      questProgress: {
        quest_1: { current: 0, completed: false }
      },

      // 每日活动记录
      lastSalaryDate: null,

      // 王国角斗场与天梯对决
      arena: {
        points: 1000,
        rankTitle: '青铜角斗士',
        challengesLeft: 5,
        lastResetDate: new Date().toDateString()
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
        lastResetDate: new Date().toDateString()
      },

      // 三大阵营边境要塞争夺战
      factionWar: {
        merit: 0,
        militaryRank: 'recruit',
        strongholds: {
          silverwing: { captured: false, progress: 0 },
          blackiron: { captured: false, progress: 0 },
          moonshadow: { captured: false, progress: 0 }
        },
        dailyClaimed: false,
        lastResetDate: new Date().toDateString()
      },

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

  // 检查今日是否已领俸禄
  canClaimSalary() {
    const today = new Date().toDateString();
    return this.data.lastSalaryDate !== today;
  }

  // 领取每日俸禄
  claimSalary() {
    const today = new Date().toDateString();
    if (this.data.lastSalaryDate === today) {
      return { success: false, msg: '今日俸禄已全额领受！圣王谕旨：每日拂晓（次日）方可再度面圣领赏！' };
    }
    this.data.lastSalaryDate = today;
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
      // 核心保障：每一个存档只需选择一次职业，已存在的存档永久锁定已选职业，绝不重复弹出创角界面
      this.data.hasChosenClass = true;
      // 确保新加入模块及深层字段深度健全
      this.data.nation = this.data.nation || defaults.nation;
      this.data.classId = this.data.classId || defaults.classId;
      this.data.castle = { ...defaults.castle, ...(saved.castle || {}) };
      this.data.dungeon = { ...defaults.dungeon, ...(saved.dungeon || {}) };
      this.data.dragon = { ...defaults.dragon, ...(saved.dragon || {}) };
      this.data.slaves = { ...defaults.slaves, ...(saved.slaves || {}) };
      if (!Array.isArray(this.data.slaves.list)) this.data.slaves.list = defaults.slaves.list;
      this.data.royalTrials = { ...defaults.royalTrials, ...(saved.royalTrials || {}) };
      this.data.fishing = { ...defaults.fishing, ...(saved.fishing || {}) };
      this.data.maskedThief = { ...defaults.maskedThief, ...(saved.maskedThief || {}) };
      this.data.estate = { ...defaults.estate, ...(saved.estate || {}) };
      this.data.estate.herbs = { ...defaults.estate.herbs, ...(saved.estate?.herbs || {}) };
      this.data.estate.activePotions = Array.isArray(this.data.estate.activePotions) ? this.data.estate.activePotions : [];
      if (!this.data.estate.hiredMercId) this.data.estate.hiredMercId = defaults.estate.hiredMercId;
      if (!this.data.currentMapId) this.data.currentMapId = 'forest';
      if (!this.data.currentQuestId) this.data.currentQuestId = 'quest_1';
      this.data.questProgress = { ...defaults.questProgress, ...(saved.questProgress || {}) };
      this.data.lastSalaryDate = saved.lastSalaryDate || null;
      this.data.arena = { ...defaults.arena, ...(saved.arena || {}) };
      const today = new Date().toDateString();
      if (this.data.arena.lastResetDate !== today) {
        this.data.arena.challengesLeft = 5;
        this.data.arena.lastResetDate = today;
      }

      // 皇家酒馆数据迁移与跨日重置
      this.data.tavern = { ...defaults.tavern, ...(saved.tavern || {}) };
      if (!Array.isArray(this.data.tavern.bounties) || this.data.tavern.bounties.length === 0) {
        this.data.tavern.bounties = defaults.tavern.bounties;
      }
      if (this.data.tavern.lastResetDate !== today) {
        this.data.tavern.bounties = defaults.tavern.bounties.map(b => ({ id: b.id, status: 'available' }));
        this.data.tavern.drinkBuff = null;
        this.data.tavern.lastResetDate = today;
      }

      // 三大阵营边境要塞数据健全与跨日重置
      this.data.factionWar = { ...defaults.factionWar, ...(saved.factionWar || {}) };
      if (!this.data.factionWar.strongholds) this.data.factionWar.strongholds = defaults.factionWar.strongholds;
      if (this.data.factionWar.lastResetDate !== today) {
        this.data.factionWar.dailyClaimed = false;
        this.data.factionWar.lastResetDate = today;
      }

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

      const hasTitanKey = this.data.bag.some(i => i && i.id === 'key_titan');
      if (!hasTitanKey) {
        this.data.bag.push({ ...SPECIAL_ITEMS.key_titan, count: 2, uid: 'it_key_titan_' + Date.now() });
      }

      if (!this.data.equipped) this.data.equipped = defaults.equipped;
      if (!Array.isArray(this.data.bag)) this.data.bag = defaults.bag;
      if (!Array.isArray(this.data.pets)) this.data.pets = defaults.pets;
      
      // 检查背包是否有可穿戴装备，若无则补充体验装备
      const hasEquip = this.data.bag.some(i => i && i.slot);
      if (!hasEquip) {
        const defaultGears = defaults.bag.filter(i => i && i.slot);
        this.data.bag.unshift(...defaultGears);
      }

      // 检查背包是否有宝石与开孔道具，若无则补充
      const hasGems = this.data.bag.some(i => i && (i.type === 'gem' || i.stat));
      if (!hasGems) {
        this.data.bag.push(
          { id: 'gem_atk', name: '金刚石', stat: 'atk', val: 25, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_atk.svg', count: 2, desc: '增加攻击力+25', uid: 'bag_init_gem_1' },
          { id: 'gem_def', name: '玛瑙石', stat: 'def', val: 18, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_def.svg', count: 2, desc: '增加防御值+18', uid: 'bag_init_gem_2' },
          { id: 'gem_hp', name: '红宝石', stat: 'maxHp', val: 180, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_hp.svg', count: 2, desc: '增加生命上限+180', uid: 'bag_init_gem_3' },
          { id: 'gem_dex', name: '翡翠石', stat: 'speed', val: 8, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_dex.svg', count: 2, desc: '增加先手速度+8', uid: 'bag_init_gem_4' }
        );
      }
      const hasDrill = this.data.bag.some(i => i && (i.id === 'socket_crystal' || i.id === 'diamond_1'));
      if (!hasDrill) {
        this.data.bag.push({ ...SPECIAL_ITEMS.socket_crystal, count: 6, uid: 'bag_init_sock_drill' });
      }
      const hasCdg = this.data.bag.some(i => i && i.id === 'crystal_darkgold');
      if (!hasCdg) {
        this.data.bag.push({ ...SPECIAL_ITEMS.crystal_darkgold, count: 5, uid: 'bag_init_cdg' });
      }
      const hasCg = this.data.bag.some(i => i && i.id === 'crystal_gold');
      if (!hasCg) {
        this.data.bag.push({ ...SPECIAL_ITEMS.crystal_gold, count: 8, uid: 'bag_init_cg' });
      }

      // 固化更新至当前存档
      storage.save(this.data);
    } else {
      // 首次进入单机游戏：使用初始配置并立即固化槽位1，锁定职业，绝不弹出创角
      this.data = defaults;
      this.data.hasChosenClass = true;
      storage.save(this.data);
    }
  }


  // 经验升级计算
  getNextLevelExp(level) {
    return Math.floor(100 * Math.pow(level, 1.8) + level * 80);
  }

  addExp(amount) {
    this.data.exp += amount;
    let leveledUp = false;
    let nextExp = this.getNextLevelExp(this.data.level);

    while (this.data.exp >= nextExp && this.data.level < 100) {
      this.data.exp -= nextExp;
      this.data.level += 1;
      this.data.freeStatPoints += 6;
      leveledUp = true;
      this.addSystemLog(`恭喜勇者晋升至 Lv.${this.data.level}！获得 6 点自由分配潜能点！`, 'system');
      nextExp = this.getNextLevelExp(this.data.level);
    }
    this.notify();
    return leveledUp;
  }

  gainCurrency(gold = 0, crystal = 0, prestige = 0) {
    this.data.gold += gold;
    this.data.crystal += crystal;
    this.data.prestige += prestige;
    const parts = [];
    if (gold > 0) parts.push(`金币 +${gold.toLocaleString()}`);
    if (crystal > 0) parts.push(`魔晶 +${crystal.toLocaleString()}`);
    if (prestige > 0) parts.push(`声望 +${prestige.toLocaleString()}`);
    if (parts.length > 0) {
      this.addSystemLog(`获得财富奖励：${parts.join('，')}`, 'obtain');
    }
    this.notify();
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
  getEffectiveStats() {
    const cls = CLASSES[this.data.classId] || CLASSES.warrior;
    const lvl = this.data.level;
    const alloc = this.data.allocatedStats;
    const nation = NATIONS[this.data.nation] || NATIONS.aden;

    let hp = cls.baseStats.hp + (lvl - 1) * cls.growth.hp + alloc.con * 16;
    let mp = cls.baseStats.mp + (lvl - 1) * cls.growth.mp + alloc.int * 8;
    let atk = cls.baseStats.atk + (lvl - 1) * cls.growth.atk + alloc.str * 2.6 + alloc.int * 2.0;
    let def = cls.baseStats.def + (lvl - 1) * cls.growth.def + alloc.con * 1.5;
    let speed = cls.baseStats.speed + (lvl - 1) * cls.growth.speed + alloc.dex * 1.3;

    let crit = cls.baseStats.crit + alloc.dex * 0.22;
    let dodge = cls.baseStats.dodge + alloc.dex * 0.16;
    let hit = cls.baseStats.hit;
    let counter = cls.baseStats.counter;
    let lifesteal = cls.baseStats.lifesteal;
    let magicResist = cls.baseStats.magicResist;
    let critDmg = 0;
    let dmgResist = 0;

    // 国家特质加成
    if (nation.buffs) {
      if (nation.buffs.atkPct) atk *= (1 + nation.buffs.atkPct);
      if (nation.buffs.defPct) def *= (1 + nation.buffs.defPct);
      if (nation.buffs.hpPct) hp *= (1 + nation.buffs.hpPct);
      if (nation.buffs.counter) counter += nation.buffs.counter;
      if (nation.buffs.dodge) dodge += nation.buffs.dodge;
      if (nation.buffs.crit) crit += nation.buffs.crit;
    }

    // 封号属性加成
    if (this.data.royalTrials && this.data.royalTrials.completedStage > 0) {
      const trialIdx = this.data.royalTrials.completedStage - 1;
      if (ROYAL_TRIALS[trialIdx]) {
        const tBonus = ROYAL_TRIALS[trialIdx].statsBonus;
        if (tBonus.atk) atk += tBonus.atk;
        if (tBonus.def) def += tBonus.def;
        if (tBonus.maxHp) hp += tBonus.maxHp;
        if (tBonus.speed) speed += tBonus.speed;
        if (tBonus.crit) crit += tBonus.crit;
        if (tBonus.dodge) dodge += tBonus.dodge;
        if (tBonus.counter) counter += tBonus.counter;
      }
    }

    // 装备加成 (考虑耐久度，耐久为0则不提供加成)
    const activeSetCounts = {};

    Object.values(this.data.equipped).forEach(item => {
      if (!item) return;
      if (item.durability !== undefined && item.durability <= 0) return; // 耐久为0失效

      const enhanceMult = 1 + (item.stars || 0) * 0.12;

      if (item.stats) {
        if (item.stats.hp) hp += item.stats.hp * enhanceMult;
        if (item.stats.mp) mp += item.stats.mp * enhanceMult;
        if (item.stats.atk) atk += item.stats.atk * enhanceMult;
        if (item.stats.def) def += item.stats.def * enhanceMult;
        if (item.stats.speed) speed += item.stats.speed * enhanceMult;
        if (item.stats.crit) crit += item.stats.crit;
        if (item.stats.dodge) dodge += item.stats.dodge;
        if (item.stats.counter) counter += item.stats.counter;
        if (item.stats.lifesteal) lifesteal += item.stats.lifesteal;
      }

      if (item.gems && item.gems.length) {
        item.gems.forEach(g => {
          if (!g) return;
          if (g.stat === 'atk') atk += g.val;
          if (g.stat === 'def') def += g.val;
          if (g.stat === 'maxHp') hp += g.val;
          if (g.stat === 'speed') speed += g.val;
          const rStats = g.stats || (RUNES[g.id]?.stats);
          if (rStats) {
            if (rStats.atk) atk += rStats.atk;
            if (rStats.def) def += rStats.def;
            if (rStats.hp) hp += rStats.hp;
            if (rStats.speed) speed += rStats.speed;
            if (rStats.crit) crit += rStats.crit;
            if (rStats.dodge) dodge += rStats.dodge;
            if (rStats.str) atk += rStats.str * 2.6;
            if (rStats.int) atk += rStats.int * 2.0;
            if (rStats.con) hp += rStats.con * 16;
            if (rStats.agi) { dodge += rStats.agi * 0.16; speed += rStats.agi * 1.3; }
            if (rStats.allStats) {
              atk += rStats.allStats * 2.6;
              def += rStats.allStats * 1.5;
              hp += rStats.allStats * 16;
              speed += rStats.allStats * 1.3;
            }
          }
        });
      }

      // 远古符文之语共鸣加成
      if (item.runicWord) {
        const rw = RUNIC_WORDS.find(r => r.id === item.runicWord);
        if (rw && rw.bonus) {
          if (rw.bonus.atk) atk += rw.bonus.atk;
          if (rw.bonus.def) def += rw.bonus.def;
          if (rw.bonus.hp) hp += rw.bonus.hp;
          if (rw.bonus.speed) speed += rw.bonus.speed;
          if (rw.bonus.crit) crit += rw.bonus.crit;
          if (rw.bonus.dodge) dodge += rw.bonus.dodge;
          if (rw.bonus.critDmg) critDmg += rw.bonus.critDmg;
          if (rw.bonus.dmgReduce) dmgResist += rw.bonus.dmgReduce;
          if (rw.bonus.allStats) {
            atk += rw.bonus.allStats * 2.6;
            def += rw.bonus.allStats * 1.5;
            hp += rw.bonus.allStats * 16;
            speed += rw.bonus.allStats * 1.3;
          }
        }
      }

      if (item.reforge) {
        if (item.reforge.stat === 'counter') counter += item.reforge.val;
        if (item.reforge.stat === 'lifesteal') lifesteal += item.reforge.val;
        if (item.reforge.stat === 'critDmg') {
          crit += item.reforge.val * 0.2;
          critDmg += item.reforge.val;
        }
        if (item.reforge.stat === 'allStats') {
          atk += item.reforge.val * 2.6;
          hp += item.reforge.val * 15;
          speed += item.reforge.val * 1.2;
          def += item.reforge.val * 1.2;
        }
        if (item.reforge.stat === 'dmgResist') {
          dmgResist += item.reforge.val;
          def += item.reforge.val * 2;
        }
      }

      if (item.setId) {
        activeSetCounts[item.setId] = (activeSetCounts[item.setId] || 0) + 1;
      }
    });

    // 原著官方套装属性加成
    Object.keys(activeSetCounts).forEach(setId => {
      const set = OFFICIAL_SETS[setId];
      const count = activeSetCounts[setId];
      if (set && count >= 2) {
        if (set.bonus2.atk) atk += set.bonus2.atk;
        if (set.bonus2.def) def += set.bonus2.def;
        if (set.bonus2.hp) hp += set.bonus2.hp;
        if (set.bonus2.speed) speed += set.bonus2.speed;
        if (set.bonus2.dodge) dodge += set.bonus2.dodge;
        if (set.bonus2.crit) crit += set.bonus2.crit;
      }
      if (set && count >= 4) {
        if (set.bonus4.hp) hp += set.bonus4.hp;
        if (set.bonus4.counter) counter += set.bonus4.counter;
        if (set.bonus4.lifesteal) lifesteal += set.bonus4.lifesteal;
        if (set.bonus4.dodge) dodge += set.bonus4.dodge;
        if (set.bonus4.dmgResist) dmgResist += set.bonus4.dmgResist;
        if (set.bonus4.critDmg) critDmg += set.bonus4.critDmg;
      }
    });

    // 出战宠物属性 (体力 >= 60 才提供附加属性)
    const activePetObj = this.data.pets.find(p => p.id === this.data.activePetId);
    if (activePetObj && (activePetObj.stamina === undefined || activePetObj.stamina >= 60)) {
      const pCfg = PET_CONFIGS[activePetObj.id];
      if (pCfg) {
        const aptRatio = (activePetObj.apt.str + activePetObj.apt.con) / 3000;
        atk += Math.floor((pCfg.baseBonus.atk || 0) * aptRatio + activePetObj.level * (pCfg.growth.atk || 3));
        hp += Math.floor((pCfg.baseBonus.maxHp || 0) * aptRatio + activePetObj.level * 20);
        def += Math.floor((pCfg.baseBonus.def || 0) * aptRatio);
        speed += Math.floor((pCfg.baseBonus.speed || 0));
        if (pCfg.baseBonus.counter) counter += pCfg.baseBonus.counter;
        if (pCfg.baseBonus.dodge) dodge += pCfg.baseBonus.dodge;
        if (pCfg.baseBonus.crit) crit += pCfg.baseBonus.crit;
        if (pCfg.baseBonus.lifesteal) lifesteal += pCfg.baseBonus.lifesteal;
      }
    }

    // 皇家酒馆特调麦酒 Buff
    const drinkBuff = this.data.tavern?.drinkBuff;
    if (drinkBuff && drinkBuff.buff) {
      if (drinkBuff.buff.atkPct) atk *= (1 + drinkBuff.buff.atkPct);
      if (drinkBuff.buff.dodge) dodge += drinkBuff.buff.dodge;
      if (drinkBuff.buff.speed) speed += drinkBuff.buff.speed;
      if (drinkBuff.buff.crit) crit += drinkBuff.buff.crit;
    }

    // 阵营要塞军衔加成
    if (this.data.factionWar && this.data.factionWar.militaryRank) {
      const rankCfg = MILITARY_RANKS.find(r => r.id === this.data.factionWar.militaryRank);
      if (rankCfg && rankCfg.stats) {
        if (rankCfg.stats.hp) hp += rankCfg.stats.hp;
        if (rankCfg.stats.atk) atk += rankCfg.stats.atk;
        if (rankCfg.stats.def) def += rankCfg.stats.def;
        if (rankCfg.stats.speed) speed += rankCfg.stats.speed;
        if (rankCfg.stats.crit) crit += rankCfg.stats.crit;
        if (rankCfg.stats.dmgReduce) dmgResist += rankCfg.stats.dmgReduce;
        if (rankCfg.stats.allStats) {
          atk += rankCfg.stats.allStats * 2.6;
          def += rankCfg.stats.allStats * 1.5;
          hp += rankCfg.stats.allStats * 16;
          speed += rankCfg.stats.allStats * 1.3;
        }
      }
    }

    // 远古神圣圣遗物加成 (魔塔 50~100 层终焉成就觉醒)
    if (this.data.relics && Array.isArray(this.data.relics.unlocked) && this.data.relics.unlocked.length > 0) {
      const rStats = getRelicsTotalStats(this.data.relics.unlocked);
      if (rStats.hp) hp += rStats.hp;
      if (rStats.mp) mp += rStats.mp;
      if (rStats.atk) atk += rStats.atk;
      if (rStats.def) def += rStats.def;
      if (rStats.speed) speed += rStats.speed;
      if (rStats.crit) crit += rStats.crit;
      if (rStats.critDmg) critDmg += rStats.critDmg;
      if (rStats.dmgResist) dmgResist += rStats.dmgResist;
      if (rStats.str) atk += rStats.str * 2.6;
      if (rStats.int) atk += rStats.int * 2.0;
      if (rStats.con) { hp += rStats.con * 16; def += rStats.con * 1.5; }
      if (rStats.dex) { speed += rStats.dex * 1.3; crit += rStats.dex * 0.22; dodge += rStats.dex * 0.16; }
    }

    const baseStr = (cls.id === 'warrior' ? 25 : cls.id === 'hunter' ? 18 : 10) + (lvl - 1) * (cls.id === 'warrior' ? 3 : 1);
    const baseDex = (cls.id === 'hunter' ? 26 : cls.id === 'warrior' ? 15 : 16) + (lvl - 1) * (cls.id === 'hunter' ? 3 : 1);
    const baseInt = (cls.id === 'mage' ? 28 : cls.id === 'hunter' ? 12 : 10) + (lvl - 1) * (cls.id === 'mage' ? 3 : 1);
    const baseCon = (cls.id === 'warrior' ? 22 : cls.id === 'hunter' ? 18 : 16) + (lvl - 1) * 2;

    return {
      hp: Math.floor(hp),
      maxHp: Math.floor(hp),
      mp: Math.floor(mp),
      maxMp: Math.floor(mp),
      atk: Math.floor(atk),
      def: Math.floor(def),
      speed: Math.floor(speed),
      crit: Math.min(80, Math.floor(crit)),
      dodge: Math.min(60, Math.floor(dodge)),
      hit: Math.floor(hit),
      counter: Math.min(75, Math.floor(counter)),
      lifesteal: Math.floor(lifesteal),
      magicResist: Math.floor(magicResist),
      critDmg: Math.floor(critDmg),
      dmgResist: Math.min(50, Math.floor(dmgResist)),
      str: Math.floor(baseStr + alloc.str),
      dex: Math.floor(baseDex + alloc.dex),
      int: Math.floor(baseInt + alloc.int),
      con: Math.floor(baseCon + alloc.con),
      baseStr,
      baseDex,
      baseInt,
      baseCon
    };
  }

  // 喂养神兽 (恢复体力)
  feedPet(petId) {
    const pet = this.data.pets.find(p => p.id === petId);
    if (!pet) return { success: false, msg: '未找到该神兽' };
    const food = this.data.bag.find(i => i.id === 'pet_food' && i.count > 0);
    if (!food) return { success: false, msg: '背包中没有【魔能兽肉排】' };

    pet.stamina = Math.min(100, (pet.stamina || 100) + 35);
    food.count--;
    if (food.count <= 0) this.data.bag = this.data.bag.filter(i => i !== food);
    this.notify();
    return { success: true, msg: `喂养成功！${pet.name || '神兽'} 当前体力已恢复至 ${pet.stamina}/100！` };
  }

  // 进化神兽 (黄金->暗金->紫金)
  evolvePet(petId) {
    const pet = this.data.pets.find(p => p.id === petId);
    if (!pet) return { success: false, msg: '未找到神兽' };

    if (pet.tier === 'gold') {
      if (pet.level < 30) return { success: false, msg: '黄金宠物需达到 30 级方可使用进化石！' };
      const stone = this.data.bag.find(i => i.id === 'evolution_stone' && i.count > 0);
      if (!stone) return { success: false, msg: '缺少【进化石】！' };
      stone.count--;
      if (stone.count <= 0) this.data.bag = this.data.bag.filter(i => i !== stone);

      pet.tier = 'darkgold';
      pet.level = 1;
      pet.apt.str = Math.min(4500, Math.floor(pet.apt.str * 1.35));
      pet.apt.int = Math.min(4500, Math.floor(pet.apt.int * 1.35));
      pet.apt.dex = Math.min(4500, Math.floor(pet.apt.dex * 1.35));
      pet.apt.con = Math.min(4500, Math.floor(pet.apt.con * 1.35));
      this.notify();
      return { success: true, msg: '进化成功！神兽觉醒为【暗金神圣阶】，资质上限跃升至 4500！' };
    } else if (pet.tier === 'darkgold') {
      if (pet.level < 40) return { success: false, msg: '暗金宠物需达到 40 级方可使用天命石！' };
      const stone = this.data.bag.find(i => i.id === 'destiny_stone' && i.count > 0);
      if (!stone) return { success: false, msg: '缺少【天命石】（可通过屠银龙/金龙获得）！' };
      stone.count--;
      if (stone.count <= 0) this.data.bag = this.data.bag.filter(i => i !== stone);

      pet.tier = 'purplegold';
      pet.level = 1;
      pet.apt.str = Math.min(6000, Math.floor(pet.apt.str * 1.45));
      pet.apt.int = Math.min(6000, Math.floor(pet.apt.int * 1.45));
      pet.apt.dex = Math.min(6000, Math.floor(pet.apt.dex * 1.45));
      pet.apt.con = Math.min(6000, Math.floor(pet.apt.con * 1.45));
      this.triggerQuestAction('evolve_purplegold');
      this.addSystemLog(`【神兽觉醒】神兽突破为【紫金传奇圣兽】，资质全面暴涨！`, 'pet');
      this.notify();
      return { success: true, msg: '终极进化达成！神兽突破为【紫金传奇圣兽】，获得传世神圣属性！' };
    }
    return { success: false, msg: '该宠物已达最高紫金阶品！' };
  }

  // 装备修理
  repairAllEquipment() {
    let repaired = 0;
    let cost = 0;
    Object.values(this.data.equipped).forEach(item => {
      if (item && item.durability !== undefined && item.durability < item.maxDurability) {
        cost += (item.maxDurability - item.durability) * 5;
        item.durability = item.maxDurability;
        repaired++;
      }
    });
    if (repaired === 0) return { success: false, msg: '当前所有穿戴装备耐久度完好，无需修理！' };
    if (this.data.gold < cost) return { success: false, msg: `金币不足！需要 ${cost} 金币进行修缮！` };
    this.data.gold -= cost;
    this.notify();
    return { success: true, msg: `成功修理了 ${repaired} 件装备，花费 ${cost} 金币！所有装备耐久已回满！` };
  }

  // 装备升星 (最高 8 星，可勾选保护水晶)
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
    const successRate = rates[curStars] || 25;
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
  reforgeEquipment(slotKeyOrUid, useCrystalId = null) {
    let item = this.data.equipped[slotKeyOrUid];
    if (!item) {
      item = this.data.bag.find(i => (i.uid && i.uid === slotKeyOrUid) || (!i.uid && i.id === slotKeyOrUid));
    }
    if (!item) return { success: false, msg: '未选定有效装备进行重铸！' };

    const goldCost = 2000;
    if (this.data.gold < goldCost) {
      return { success: false, msg: `金币不足！神兵重铸需要 ${goldCost} 金币！` };
    }

    let crystal = null;
    if (useCrystalId) {
      crystal = this.data.bag.find(i => i.id === useCrystalId && i.count > 0);
    }
    if (!crystal) {
      // 默认优先暗金晶石，其次黄金晶石
      crystal = this.data.bag.find(i => (i.id === 'crystal_darkgold' || i.id === 'crystal_gold') && i.count > 0);
    }

    if (!crystal) {
      return { success: false, msg: '缺少重铸晶石！需消耗 1 颗【黄金晶石】或【暗金晶石】！' };
    }

    // 扣除材料与金币
    this.data.gold -= goldCost;
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

    item.reforge = {
      id: chosenAffix.id,
      name: chosenAffix.name,
      stat: chosenAffix.stat,
      val: val,
      unit: chosenAffix.unit || '',
      crystalUsed: crystal.name || (isDarkgold ? '暗金晶石' : '黄金晶石')
    };

    this.triggerQuestAction('reforge_gear');
    this.addSystemLog(`【神兵重铸】消耗【${crystal.name || '晶石'}】！为【${item.name}】洗炼出传奇词条：【${chosenAffix.name}】+${val}${chosenAffix.unit}！`, 'forge');
    this.notify();
    return {
      success: true,
      msg: `重铸大吉！成功洗炼出【${chosenAffix.name}】+${val}${chosenAffix.unit}！`,
      reforge: item.reforge
    };
  }

  // 装备穿戴入身
  equipItem(itemUid) {
    const bagIdx = this.data.bag.findIndex(i => (i.uid && i.uid === itemUid) || (!i.uid && i.id === itemUid));
    if (bagIdx === -1) return { success: false, msg: '在行囊中未找到该装备！' };

    const item = this.data.bag[bagIdx];
    if (!item.slot) return { success: false, msg: '该物品不可作为装备穿戴！' };

    if (item.reqLevel && this.data.level < item.reqLevel) {
      return { success: false, msg: `勇者等级不足！需达到 Lv.${item.reqLevel} 方可佩戴此装备！` };
    }

    if (item.reqClass && item.reqClass !== this.data.classId) {
      return { success: false, msg: '该装备与你的当前职业专精不符！' };
    }

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
    this.addSystemLog(`【换装】勇者披挂上阵，成功穿戴【${item.name}】！`, 'forge');
    this.notify();
    return { success: true, msg: `换装成功！已成功穿戴【${item.name}】！` };
  }

  // 卸下身上装备至背包
  unequipItem(slotKey) {
    const item = this.data.equipped[slotKey];
    if (!item) return { success: false, msg: '该槽位未穿戴任何装备！' };

    if (this.data.bag.length >= 40) {
      return { success: false, msg: '行囊已满 (40/40)，请先清理行囊再卸下装备！' };
    }

    this.data.equipped[slotKey] = null;
    this.data.bag.push(item);

    this.notify();
    return { success: true, msg: `已将【${item.name}】卸下并妥善放入行囊！` };
  }

  // 通用添加道具至背包
  addItemToBag(item) {
    if (!item) return false;
    if (this.data.bag.length >= 40) return false;
    if (!item.slot) {
      const existing = this.data.bag.find(i => i.id === item.id);
      if (existing) {
        existing.count = (existing.count || 1) + (item.count || 1);
        return true;
      }
    }
    this.data.bag.push({
      ...item,
      count: item.count || 1,
      uid: item.uid || ('it_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4))
    });
    return true;
  }

  // 宝石孔开凿 (消耗开孔水晶/金刚钻与金币，最多开 4 孔)
  punchSocket(slotKey) {
    const item = this.data.equipped[slotKey];
    if (!item) return { success: false, msg: '该槽位未穿戴任何装备！' };

    const curSockets = item.sockets || 0;
    if (curSockets >= 4) return { success: false, msg: '该装备已开启 4 个宝石孔，已达孔洞上限！' };

    const drillItem = this.data.bag.find(i => (i.id === 'diamond_1' || i.id === 'socket_crystal') && i.count > 0);
    if (!drillItem) return { success: false, msg: '缺少开孔道具！需要【开孔水晶】或【金刚钻】！可在声望商行兑换。' };

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
    if (socketIdx < 0 || socketIdx >= curSockets) {
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
    if (rw) {
      this.addSystemLog(`【远古神铸】神迹降临！【${item.name}】成功激活远古符文之语【${rw.name}】！`, 'forge');
    } else {
      this.addSystemLog(`【宝石工坊】成功将【${gemItem.name}】镶入【${item.name}】第 ${socketIdx + 1} 孔！`, 'forge');
    }
    this.notify();
    return { success: true, msg: rw ? `神圣共鸣！成功激活符文之语【${rw.name}】！` : `镶嵌成功！【${gemItem.name}】璀璨光华融入【${item.name}】！` };
  }

  // 宝石与符文无损摘除 (取回背包，不损耗材料)
  removeGem(slotKey, socketIdx) {
    const item = this.data.equipped[slotKey];
    if (!item || !Array.isArray(item.gems) || !item.gems[socketIdx]) {
      return { success: false, msg: '该孔内并无镶嵌宝石或符文！' };
    }

    if (this.data.bag.length >= 40) {
      return { success: false, msg: '行囊已满 (40/40)，请先清理行囊以容纳摘下的宝石！' };
    }

    const removedGem = item.gems[socketIdx];
    item.gems[socketIdx] = null;
    while (item.gems.length > 0 && item.gems[item.gems.length - 1] === null) {
      item.gems.pop();
    }
    this.updateRunicWord(slotKey);

    this.addItemToBag({
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
    });

    this.addSystemLog(`【宝石工坊】完好取下【${removedGem.name}】，已妥善收入行囊！`, 'forge');
    this.notify();
    return { success: true, msg: `已无损摘除【${removedGem.name}】，已安然放回行囊！` };
  }

  // 检测并更新装备激活的符文之语
  updateRunicWord(slotKey) {
    const item = this.data.equipped[slotKey];
    if (!item) return null;
    if (!Array.isArray(item.gems) || item.gems.length < 2) {
      item.runicWord = null;
      item.runicWordName = null;
      return null;
    }
    const runeIds = [];
    for (let i = 0; i < item.gems.length; i++) {
      const g = item.gems[i];
      if (!g || !g.isRune) {
        item.runicWord = null;
        item.runicWordName = null;
        return null;
      }
      runeIds.push(g.id);
    }
    const matchedRw = checkRunicWord(slotKey, runeIds);
    if (matchedRw) {
      item.runicWord = matchedRw.id;
      item.runicWordName = matchedRw.name;
      return matchedRw;
    } else {
      item.runicWord = null;
      item.runicWordName = null;
      return null;
    }
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

  completeStrongholdVictory(strongholdId) {
    const stronghold = STRONGHOLDS.find(s => s.id === strongholdId);
    if (!stronghold) return { success: false, msg: '未知的要塞据点！' };

    const fw = this.data.factionWar;
    if (!fw.strongholds[strongholdId]) {
      fw.strongholds[strongholdId] = { captured: false, progress: 0 };
    }
    fw.strongholds[strongholdId].captured = true;
    fw.strongholds[strongholdId].progress = 100;
    fw.merit = (fw.merit || 0) + stronghold.meritReward;
    this.data.gold += stronghold.goldReward;

    let promoted = null;
    for (let i = MILITARY_RANKS.length - 1; i >= 0; i--) {
      const rank = MILITARY_RANKS[i];
      if (fw.merit >= rank.reqMerit) {
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
      return { success: false, msg: '今日阵营军饷已领受，明日拂晓请再临军需处！' };
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
    if (this.data.bag.length >= 40) {
      return { success: false, msg: '行囊已满 (40/40)，请先整理行囊！' };
    }
    fw.merit -= reward.costMerit;
    if (reward.id === 'rw_box') {
      const runeKeys = ['rune_sol', 'rune_cham', 'rune_el', 'rune_lo', 'rune_jah', 'rune_ber'];
      const randomRuneId = runeKeys[Math.floor(Math.random() * runeKeys.length)];
      const runeCfg = RUNES[randomRuneId];
      this.addItemToBag({
        id: runeCfg.id,
        name: runeCfg.name,
        type: 'rune',
        quality: runeCfg.quality,
        icon: runeCfg.icon,
        desc: runeCfg.desc,
        stats: runeCfg.stats,
        count: 1
      });
      this.addSystemLog(`【军勋兑换】消耗 ${reward.costMerit} 军勋开启宝匣，喜获【${runeCfg.name}】！`, 'obtain');
    } else {
      const itemCfg = SPECIAL_ITEMS[reward.id] || { id: reward.id, name: reward.name, quality: reward.quality, icon: reward.icon, desc: reward.desc };
      this.addItemToBag({
        ...itemCfg,
        count: 1
      });
      this.addSystemLog(`【军勋兑换】消耗 ${reward.costMerit} 军勋成功兑换【${reward.name}】！`, 'obtain');
    }
    this.notify();
    return { success: true, msg: `兑换成功！【${reward.name}】已发放入行囊！` };
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

  // 角斗场胜利结算
  recordArenaVictory(opponent) {
    if (!this.data.arena) {
      this.data.arena = { points: 1000, rankTitle: '青铜角斗士', challengesLeft: 5, lastResetDate: new Date().toDateString() };
    }
    this.data.arena.challengesLeft = Math.max(0, this.data.arena.challengesLeft - 1);
    this.data.arena.points += 25;
    const rank = this.getArenaRank(this.data.arena.points);
    this.data.arena.rankTitle = rank.title;

    const goldReward = opponent.goldReward || 1000;
    const prestigeReward = opponent.prestigeReward || 50;
    const expReward = (opponent.level || 15) * 120;

    this.gainCurrency(goldReward, 0, prestigeReward);
    this.addExp(expReward);

    this.triggerQuestAction('arena_duel');
    this.addSystemLog(`【王国角斗场】天梯扬威！战胜【${opponent.name}】，天梯积分 +25（当前 ${this.data.arena.points} 点），声望 +${prestigeReward}！`, 'battle');
    this.notify();
    return { points: this.data.arena.points, rank: rank.title, prestigeReward, goldReward, expReward };
  }

  // 角斗场惜败结算
  recordArenaDefeat(opponent) {
    if (!this.data.arena) {
      this.data.arena = { points: 1000, rankTitle: '青铜角斗士', challengesLeft: 5, lastResetDate: new Date().toDateString() };
    }
    this.data.arena.challengesLeft = Math.max(0, this.data.arena.challengesLeft - 1);
    this.data.arena.points = Math.max(1000, this.data.arena.points - 10);
    const rank = this.getArenaRank(this.data.arena.points);
    this.data.arena.rankTitle = rank.title;

    this.gainCurrency(200, 0, 10);
    this.addSystemLog(`【王国角斗场】惜败于【${opponent.name}】，积分 -10，获得安慰声望 +10。`, 'battle');
    this.notify();
  }

  // 声望军需商行兑换
  buyPrestigeItem(shopItemId) {
    const shopItem = PRESTIGE_SHOP_ITEMS.find(i => i.id === shopItemId);
    if (!shopItem) return { success: false, msg: '商行中未找到该军需物资！' };

    if (this.data.prestige < shopItem.costPrestige) {
      return { success: false, msg: `声望不足！兑换【${shopItem.name}】需要 ${shopItem.costPrestige} 点声望（当前拥有 ${this.data.prestige} 点）！` };
    }

    if (this.data.bag.length >= 40) {
      return { success: false, msg: '行囊已满 (40/40)，请先整理行囊！' };
    }

    this.data.prestige -= shopItem.costPrestige;
    this.addItemToBag(shopItem.itemData);

    this.addSystemLog(`【军需商行】支取 ${shopItem.costPrestige} 点声望，成功调配军需【${shopItem.name}】！`, 'obtain');
    this.notify();
    return { success: true, msg: `成功兑换【${shopItem.name}】！已收入行囊！` };
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

  // 侍从管理 (安抚、折磨、采矿)
  comfortSlave(slaveId) {
    const slave = this.data.slaves.list.find(s => s.id === slaveId);
    if (!slave) return { success: false, msg: '侍从不存在' };
    slave.isComforted = true;
    slave.comfortUntil = Date.now() + 3600000 * 2; // 2小时内防被抢
    this.notify();
    return { success: true, msg: `已对侍从【${slave.name}】进行安抚！两小时内绝对防掠夺！` };
  }

  disciplineSlave(slaveId) {
    const slave = this.data.slaves.list.find(s => s.id === slaveId);
    if (!slave) return { success: false, msg: '侍从不存在' };
    const expGain = slave.level * 45;
    const goldGain = slave.level * 30;
    this.addExp(expGain);
    this.gainCurrency(goldGain, 0, 0);
    this.notify();
    return { success: true, msg: `鞭挞惩戒侍从【${slave.name}】！榨取获得经验 +${expGain}，金币 +${goldGain}！` };
  }

  assignSlaveMine(slaveId) {
    const slave = this.data.slaves.list.find(s => s.id === slaveId);
    if (!slave) return { success: false, msg: '侍从不存在' };
    const yieldCrystal = Math.floor(slave.level * 0.8) + 10;
    const yieldGold = slave.level * 50;
    this.gainCurrency(yieldGold, yieldCrystal, 0);
    slave.workedTimes = (slave.workedTimes || 0) + 1;
    this.notify();
    return { success: true, msg: `役使侍从【${slave.name}】进入晶矿深处采掘！收获魔晶 +${yieldCrystal}，金币 +${yieldGold}！` };
  }

  // 任务触发器
  triggerQuestAction(actionType, value = 1) {
    const q = QUEST_LIST.find(it => it.id === this.data.currentQuestId);
    if (!q) return;

    const ALIAS_MAP = {
      'claim_salary': ['claim_salary', 'salary'],
      'enhance': ['enhance', 'enhance_gear'],
      'enhance_gear': ['enhance', 'enhance_gear'],
      'set_active_pet': ['set_active_pet'],
      'wash_aptitude': ['wash_aptitude', 'wash_pet'],
      'wash_pet': ['wash_aptitude', 'wash_pet'],
      'learn_skill': ['learn_skill', 'study_skill'],
      'clear_tower': ['clear_tower', 'clear_tower_1', 'clear_tower_10', 'clear_tower_20'],
      'clear_tower_1': ['clear_tower_1', 'clear_tower'],
      'clear_tower_10': ['clear_tower_10', 'clear_tower'],
      'clear_tower_20': ['clear_tower_20', 'clear_tower'],
      'brew_potion': ['brew_potion'],
      'hire_merc': ['hire_merc'],
      'socket_gem': ['socket_gem', 'punch_socket'],
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


  claimQuestReward(questId) {
    const q = QUEST_LIST.find(it => it.id === questId);
    if (!q) return false;
    const curProg = this.data.questProgress[q.id];
    if (!curProg || !curProg.completed) return false;

    const r = q.rewards || q.reward || {};
    if (r.exp) this.addExp(r.exp);
    if (r.gold || r.crystal) {
      this.gainCurrency(r.gold || 0, r.crystal || 0, 0);
    }

    if (r.items && r.items.length) {
      r.items.forEach(rItem => {
        const exist = this.data.bag.find(b => b.id === rItem.id);
        if (exist && !rItem.slot) {
          exist.count += (rItem.count || 1);
        } else {
          this.data.bag.push({ ...rItem, uid: 'quest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) });
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

    const curIdx = QUEST_LIST.findIndex(it => it.id === questId);
    if (curIdx < QUEST_LIST.length - 1) {
      this.data.currentQuestId = QUEST_LIST[curIdx + 1].id;
      this.data.questProgress[this.data.currentQuestId] = { current: 0, completed: false };
      const nextQ = QUEST_LIST[curIdx + 1];
      this.addSystemLog(`开启新任务篇章：【${nextQ.title}】`, 'quest');
    }
    this.notify();
    return true;
  }

  // ==========================================
  // 皇家酒馆与赏金悬赏令核心逻辑
  // ==========================================
  getTavernBounties() {
    if (!this.data.tavern) {
      this.data.tavern = {
        bounties: TAVERN_BOUNTIES.map(b => ({ id: b.id, status: 'available' })),
        drinkBuff: null,
        lastResetDate: new Date().toDateString()
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
    if (!this.data.tavern) this.getTavernBounties();
    const bounties = this.data.tavern.bounties || [];
    let item = bounties.find(b => b.id === bountyId);
    if (item) {
      if (item.status === 'completed') return { success: false, msg: '该悬赏今日已缉拿归案并领赏！' };
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
    if (!item) {
      item = { id: bountyId, status: 'ready_to_claim' };
      bounties.push(item);
    } else {
      item.status = 'ready_to_claim';
    }
    this.data.tavern.bounties = bounties;
    this.addSystemLog(`【悬赏大捷】悬赏凶物已被彻底斩杀！速回王都酒馆悬赏榜交令领赏！`, 'quest');
    this.notify();
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
          this.data.bag.push({ ...it, uid: 'bounty_it_' + Date.now() + Math.random().toString(36).substr(2, 4) });
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
  checkUnlockRelics(floor) {
    if (!this.data.relics) this.data.relics = { unlocked: [], activeRelics: [] };
    if (!Array.isArray(this.data.relics.unlocked)) this.data.relics.unlocked = [];

    const newlyUnlocked = [];
    const available = getUnlockedRelics(floor);
    for (const relic of available) {
      if (!this.data.relics.unlocked.includes(relic.id)) {
        this.data.relics.unlocked.push(relic.id);
        newlyUnlocked.push(relic);
        this.addSystemLog(`【圣遗物觉醒】攻克魔塔第 ${relic.unlockFloor} 层！远古神圣圣遗物【${relic.name}】震撼觉醒，领悟神威【${relic.passiveName}】！`, 'quest');
      }
    }
    if (newlyUnlocked.length > 0) {
      this.notify();
    }
    return newlyUnlocked;
  }

  getRelics() {
    if (!this.data.relics) this.data.relics = { unlocked: [], activeRelics: [] };
    const maxFloor = this.data.castle?.maxReachedFloor || 1;
    return HOLY_RELICS.map(r => ({
      ...r,
      isUnlocked: (this.data.relics.unlocked || []).includes(r.id) || maxFloor >= r.unlockFloor
    }));
  }
}

export const gameState = new GameState();
