// 游戏总控制器与主事件总线 (2010经典页游深度纯单机版)
import { gameState } from './core/state.js';
import { getJourneyGuidance, getOptionalEquipmentGoal } from './core/journey.js';
import { JOURNEY_DIALOGUE } from './config/story.js';
import { storage } from './core/storage.js';
import { sound } from './core/sound.js';
import { TownView } from './ui/townView.js';
import { TowerView } from './ui/towerView.js';
import { BagView } from './ui/bagView.js';
import { PetView } from './ui/petView.js';
import { WildView } from './ui/wildView.js';
import { EstateView } from './ui/estateView.js';
import { BattleView } from './ui/battleView.js';
import { QuestTracker } from './ui/questTracker.js';
import { SystemLogView } from './ui/systemLogView.js';
import { CharSelectModal } from './ui/charSelectModal.js';
import { ArchiveModal } from './ui/archiveModal.js';
import { CLASSES, NATIONS } from './config/classes.js';
import { HeroView, EquipView } from './ui/heroView.js';
import { renderGameIcon } from './ui/iconHelper.js';
import { atmosphere } from './effects/atmosphere.js';
import { gameModal } from './ui/modal.js';
import { getQuestList } from './config/quests.js';
import { getPlayerActionInterval } from './core/combat.js';

const QUEST_ROUTES = {
  town: {
    enhance: { view: 'smithy_enhance' },
    claim_salary: { view: 'palace_salary' },
    socket_gem: { view: 'smithy_socket' },
    slay_dragon: { view: 'dragons' },
    slay_silver_dragon: { view: 'dragons' },
    royal_trials: { view: 'palace_trials' },
    complete_royal_trials: { view: 'palace_trials' },
    arena_duel: { view: 'palace_arena', arenaTab: 'duel' },
    arena_shop: { view: 'palace_arena', arenaTab: 'shop' },
    earn_prestige: { view: 'tavern_bounty' },
    reforge_gear: { view: 'smithy_reforge' },
    inscribe_runes: { view: 'smithy_runes' },
    fish: { view: 'fishing' },
    capture_stronghold: { view: 'faction_war' }
  },
  hero: { allocate_stats: { panel: 'stats' } },
  wild: { grow_in_wild: { highestUnlocked: true }, slay_wild_boss: { mapId: 'forest' } },
  pets: {
    wash_aptitude: { section: 'wash' },
    evolve_purplegold: { section: 'wash' },
    learn_skill: { section: 'skills' },
    set_active_pet: { section: 'overview' },
    feed_pet: { section: 'overview' }
  },
  estate: { brew_potion: { view: 'alchemy' }, hire_merc: { view: 'mercenaries' } },
  tower: {
    use_castle_key: { section: 'castle' },
    clear_tower_1: { section: 'castle', floor: 1 },
    clear_tower_10: { section: 'castle', floor: 10 },
    clear_tower_20: { section: 'castle', floor: 20 },
    clear_tower_70: { section: 'castle' },
    clear_tower_100: { section: 'castle' },
    withdraw_castle: { section: 'castle' },
    retry_finale: { section: 'castle' },
    clear_dungeon: { section: 'dungeons' },
    clear_dragon_gate: { section: 'dungeons', gateId: 'dragon_gate' },
    clear_spacetime_gate: { section: 'dungeons', gateId: 'spacetime_gate' }
  }
};

class GameApp {
  constructor() {
    this.currentTab = 'tower';
    this.views = {};
    this.battleView = null;
    this.questTracker = null;
    this.systemLogView = null;
    this.charSelectModal = null;
    this.archiveModal = null;
    this.initialized = false;
    this.saveNoticeScheduled = false;
    this._renderScheduled = false;
    this._scheduledViewRendered = false;
    this._lastClassIconKey = null;
  }

  async init() {
    if (!this.archiveModal) {
      gameModal.init();
      this.archiveModal = new ArchiveModal(
        'game-archive-overlay',
        () => this.initialized ? this.onReloadGame() : this.init(),
        () => this.initialized ? this.onStartNewGame() : this.init()
      );
      storage.onConflict = () => {
        if (this.saveNoticeScheduled) return;
        this.saveNoticeScheduled = true;
        queueMicrotask(() => {
          this.saveNoticeScheduled = false;
          if (gameModal.isOpen) {
            gameModal.close();
          }
          this.showSaveNotice();
        });
      };
    }
    if (!await storage.activateSlot(storage.getActiveSlotId())) {
      this.showSaveNotice();
      window.completeGameStartup?.();
      return;
    }
    storage.watchSlot();
    gameState.loadOrInit();

    // 启动 2010 纯代码 2D 粒子微光环境引擎
    atmosphere.init('atmosphere-canvas');

    const switchTab = (tab, route) => this.switchTab(tab, route);
    const addStat = type => this.addStatPoint(type);
    const questNavigate = (tab, action) => this.handleQuestNavigation(tab, action);
    const debug = Object.freeze({ appInstance: this, gameState, addStat, switchMainTab: switchTab });
    Object.defineProperty(window, '__MOTA_DEBUG__', { value: debug, configurable: true });
    // 现有浏览器验收脚本通过本机环回地址读旧名称。
    if (['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
      for (const [key, value] of Object.entries(debug)) {
        Object.defineProperty(window, key, { value, configurable: true });
      }
    }

    this.battleView = new BattleView('battle-overlay');
    this.charSelectModal = new CharSelectModal('char-select-overlay');

    // 核心功能系统挂载 (4大冒险场景 + 4大勇者核心功能)
    const startBattle = params => this.battleView.start(params);
    this.views.tower = new TowerView('tab-content-tower', startBattle, switchTab);
    this.views.town = new TownView('tab-content-town', startBattle, switchTab);
    this.views.wild = new WildView('tab-content-wild', startBattle, switchTab);
    this.views.estate = new EstateView('tab-content-estate', switchTab);
    this.views.hero = new HeroView('tab-content-hero', switchTab, addStat);
    this.views.equip = new EquipView('tab-content-equip', switchTab);
    this.views.bag = new BagView('tab-content-bag', switchTab, questNavigate);
    this.views.pets = new PetView('tab-content-pets', switchTab);

    // 挂载常驻右侧任务追踪与自动寻路指引
    this.questTracker = new QuestTracker('quest-tracker-mount', (targetTab, targetAction) => {
      this.handleQuestNavigation(targetTab, targetAction);
    });

    // 挂载常驻右侧系统提示与动态日志
    this.systemLogView = new SystemLogView('system-log-mount');

    let hadChosenClass = gameState.data.hasChosenClass;
    gameState.subscribe(() => {
      this._scheduledViewRendered = false;
      if (this._renderScheduled) return;
      this._renderScheduled = true;
      queueMicrotask(() => {
        this._renderScheduled = false;
        const becameChosen = !hadChosenClass && gameState.data.hasChosenClass;
        hadChosenClass = gameState.data.hasChosenClass;
        this.updateTopBar();
        this.renderJourneyGuide();
        this.questTracker?.render();
        this.systemLogView?.render();
        if (becameChosen) {
          const quest = getQuestList(gameState.data).find(q => q.id === gameState.data.currentQuestId);
          if (quest) {
            this.handleQuestNavigation(quest.targetTab, quest.targetAction);
            return;
          }
        }
        if (!this._scheduledViewRendered) this.views[this.currentTab]?.render();
      });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab');
    if (initialTab && this.views[initialTab]) {
      this.currentTab = initialTab;
    }

    this.cacheTopBarElements();
    this.bindHeaderEvents();
    for (const [tab, key, label] of [
      ['hero','ui_rank','人物'],['equip','ui_equip','装备'],['bag','ui_bag','行囊'],['pets','ui_pet','神兽'],
      ['tower','ui_town','魔塔'],['town','ui_compass','王都'],['wild','ui_wild','野外'],['estate','ui_estate','庄园']
    ]) {
      const button = document.getElementById(`nav-tab-${tab}`);
      if (button) button.innerHTML = renderGameIcon(key, { size: 'w-5 h-5', className: 'nav-art' }) + `<span>${label}</span>`;
    }
    for (const [id, key] of [['header-gold', 'coin_gold'], ['header-crystal', 'crystal'], ['header-prestige', 'ui_rank']]) {
      const value = this._topBarEls[id];
      const resource = value?.parentElement;
      if (resource && !resource.querySelector('.resource-art')) {
        resource.insertAdjacentHTML('afterbegin', renderGameIcon(key, { size: 'w-5 h-5', className: 'resource-art' }));
      }
    }
    this.switchTab(this.currentTab);
    this.updateTopBar();
    if (this.questTracker) this.questTracker.render();
    if (this.systemLogView) this.systemLogView.render();

    this.pushSystemTicker('【系统】欢迎来到《魔塔世界》！请留意右侧【任务追踪】，跟随主线一步步打造至强神装与神兽！');
    this.initialized = true;
    this.charSelectModal.open();
    this.renderJourneyGuide();
    window.completeGameStartup?.();
  }

  showSaveNotice() {
    const shell = document.querySelector('.classic-client');
    if (shell) shell.inert = true;
    gameModal.confirm(
      storage.lastError,
      () => window.location.reload(),
      () => {
        if (shell) shell.inert = false;
        this.archiveModal.open();
      },
      '存档保护',
      { confirmLabel: '重新载入', cancelLabel: '选择其他存档' }
    );
  }

  renderJourneyGuide() {
    const guide = document.getElementById('journey-guide');
    if (!guide) return;
    const quest = getQuestList(gameState.data).find(q => q.id === gameState.data.currentQuestId);
    if (!gameState.data.hasChosenClass) { guide.innerHTML = ''; return; }
    const step = getJourneyGuidance(gameState.data);
    if (!step) { guide.innerHTML = ''; return; }
    const ready = step.ready;
    const optional = getOptionalEquipmentGoal(gameState.data);
    guide.innerHTML = `<div><h2>${ready ? step.title : '下一步：' + step.title}</h2><p>${step.text}</p></div>${optional ? `<button id="btn-optional-equipment-goal" class="mota-btn-dark" title="${optional.title} · 可选装备支线，不阻断主线">${optional.status === 'ready' ? '支线可交付' : '可选' + optional.slotName + '目标'}</button>` : ''}<button id="btn-next-journey" class="mota-btn-gold">${step.regionalReady ? '交付调查，领取补给' : ready ? '交付委托' : step.action === 'meet_guard' ? '与罗兰交谈' : '前往目标'}</button>`;
    document.getElementById('btn-optional-equipment-goal')?.addEventListener('click', () => {
      this.switchTab('town', { view: 'tavern_commissions' });
      const card = document.querySelector(`[data-commission-card="${optional.id}"]`);
      card?.scrollIntoView({ block: 'nearest' });
      const control = card?.querySelector('input, [data-commission-go], .btn-commission:not(:disabled)') ||
        document.getElementById('commission-heading');
      control?.focus({ preventScroll: true });
    });
    document.getElementById('btn-next-journey').onclick = () => {
      if (step.regionalReady) {
        const result = gameState.claimRegionalStory(step.event.id);
        if (result.success) gameModal.alert(JOURNEY_DIALOGUE.investigation(step.event, result.exp), step.event.title);
      } else if (ready) document.getElementById('btn-claim-quest-reward')?.click();
      else this.handleQuestNavigation(step.tab, step.action);
    };
  }

  handleQuestNavigation(targetTab, targetAction) {
    if (targetAction === 'meet_guard') {
      this.switchTab('town');
      const quest = getQuestList(gameState.data)[0];
      const guard = JOURNEY_DIALOGUE.guard;
      document.getElementById('btn-next-journey')?.focus();
      gameModal.dialogue(quest.desc + '\n\n' + guard.instructions, () => {
        const result = gameState.meetCityGuard();
        if (result.success) {
          gameState.claimQuestReward('quest_1');
          gameModal.toast(guard.accepted);
          this.handleQuestNavigation('bag', 'equip_gear');
        }
      }, null, guard.speaker, guard.labels);
      return;
    }
    if (targetAction === 'regional_story') {
      const event = getJourneyGuidance(gameState.data)?.event;
      if (!event) return;
      if (event.action === 'dungeon') this.switchTab('tower', { section: 'dungeons', gateId: event.target });
      else this.switchTab('wild', { mapId: event.target });
      return;
    }
    if (targetAction === 'epilogue') {
      this.switchTab('town');
      const { text, title } = JOURNEY_DIALOGUE.epilogue;
      gameModal.alert(text, title);
      return;
    }

    if (targetAction === 'enhance' && !Object.values(gameState.data.equipped).some(Boolean)) targetTab = 'bag';
    const routes = QUEST_ROUTES[targetTab];
    let route = routes && Object.hasOwn(routes, targetAction) ? routes[targetAction] : undefined;
    if (targetTab === 'pets' && targetAction === 'feed_pet') {
      route = { ...route, petId: getJourneyGuidance(gameState.data)?.petId || gameState.data.activePetId };
    }
    this.switchTab(targetTab, route);
    if (targetTab === 'hero' && targetAction === 'allocate_stats') {
      const target = document.getElementById('btn-recommended-stats') || document.querySelector('.hero-potential-ledger');
      target?.scrollIntoView({ block: 'nearest' });
      target?.focus({ preventScroll: true });
    } else if (targetTab === 'tower' && targetAction === 'retry_finale') {
      requestAnimationFrame(() => document.querySelector('#btn-retry-finale')?.focus());
    }
  }

  cacheTopBarElements() {
    const ids = [
      'header-player-name', 'header-nation-badge', 'header-title-badge', 'header-player-class',
      'header-class-icon', 'header-player-level', 'header-exp-bar', 'header-exp-text',
      'header-gold', 'header-crystal', 'header-prestige', 'header-hp-bar',
      'header-hp-text', 'header-mp-bar', 'header-mp-text', 'header-exp-sub',
      'header-action-day', 'header-active-slot-text', 'classic-stat-interval', 'classic-stat-counter',
      'classic-stat-lifesteal', 'classic-stat-magic-resist', 'classic-stat-dmg-resist', 'classic-adventure-note',
      'classic-dock-name', 'classic-hp-orb-text', 'classic-mp-orb-text',
      ...['atk', 'def', 'speed', 'crit', 'hit', 'dodge'].map(key => `classic-stat-${key}`)
    ];
    this._topBarEls = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
    this._topBarOrbs = [
      document.querySelector('.classic-health-orb'),
      document.querySelector('.classic-mana-orb')
    ];
    this._lastClassIconKey = null;
  }

  updateTopBar() {
    const data = gameState.data;
    const stats = gameState.getEffectiveStats();
    const cls = CLASSES[data.classId];
    const nextExp = gameState.getNextLevelExp(data.level);
    const expPercent = Math.min(100, Math.floor((data.exp / nextExp) * 100));

    const hpPercent = Math.min(100, Math.floor((stats.hp / stats.maxHp) * 100));
    const mpPercent = Math.min(100, Math.floor((stats.mp / stats.maxMp) * 100));

    const elName = this._topBarEls['header-player-name'];
    const elNation = this._topBarEls['header-nation-badge'];
    const elTitle = this._topBarEls['header-title-badge'];
    const elClass = this._topBarEls['header-player-class'];
    const elClassIcon = this._topBarEls['header-class-icon'];
    const elLevel = this._topBarEls['header-player-level'];
    const elExpBar = this._topBarEls['header-exp-bar'];
    const elExpText = this._topBarEls['header-exp-text'];
    const elGold = this._topBarEls['header-gold'];
    const elCrystal = this._topBarEls['header-crystal'];
    const elPrestige = this._topBarEls['header-prestige'];
    const elHpBar = this._topBarEls['header-hp-bar'];
    const elHpText = this._topBarEls['header-hp-text'];
    const elMpBar = this._topBarEls['header-mp-bar'];
    const elMpText = this._topBarEls['header-mp-text'];

    const nation = NATIONS[data.nation] || NATIONS.aden;
    if (elName) elName.innerText = data.name;
    if (elNation) elNation.innerText = nation.name.split(' ')[0];
    if (elTitle) elTitle.innerText = data.royalTrials ? data.royalTrials.currentTitle : '见习勇者';
    if (elClass) elClass.innerText = gameState.getPromotedClassName();
    if (elClassIcon && this._lastClassIconKey !== cls.id) {
      elClassIcon.innerHTML = renderGameIcon(cls.id, { size: 'w-full h-full' });
      this._lastClassIconKey = cls.id;
    }
    if (elLevel) elLevel.innerText = `Lv.${data.level}`;
    if (elExpBar) elExpBar.style.width = `${expPercent}%`;
    if (elExpText) elExpText.innerText = `${data.exp} / ${nextExp}`;
    const elExpSub = this._topBarEls['header-exp-sub'];
    if (elExpSub) elExpSub.innerText = `${expPercent}%`;
    if (elGold) elGold.innerText = data.gold.toLocaleString();
    if (elCrystal) elCrystal.innerText = data.crystal.toLocaleString();
    if (elPrestige) elPrestige.innerText = data.prestige.toLocaleString();
    const elActionDay = this._topBarEls['header-action-day'];
    if (elActionDay) {
      const perDay = Number.isSafeInteger(data.actionClock?.pointsPerDay) && data.actionClock.pointsPerDay > 0 ? data.actionClock.pointsPerDay : 30;
      const remaining = Math.max(0, perDay - gameState.getActionPoints());
      elActionDay.innerText = `第 ${gameState.getActionDay()} 行动日 · 行动点 ${remaining}/${perDay}`;
    }

    if (elHpBar) elHpBar.style.width = `${hpPercent}%`;
    if (elHpText) elHpText.innerText = `${stats.hp} / ${stats.maxHp}`;
    if (elMpBar) elMpBar.style.width = `${mpPercent}%`;
    if (elMpText) elMpText.innerText = `${stats.mp} / ${stats.maxMp}`;

    const elActiveSlot = this._topBarEls['header-active-slot-text'];
    if (elActiveSlot) elActiveSlot.innerText = `存档 ${storage.getActiveSlotId()}`;
    const text = (id, value) => { const element = this._topBarEls[id]; if (element) element.textContent = value; };
    for (const key of ['atk', 'def', 'speed', 'crit', 'hit', 'dodge']) {
      text(`classic-stat-${key}`, ['crit', 'hit', 'dodge'].includes(key) ? `${Math.round(stats[key])}%` : Math.round(stats[key]).toLocaleString());
    }
    text('classic-stat-interval', getPlayerActionInterval(stats, gameState.data).toFixed(2));
    text('classic-stat-counter', `${stats.counter}%`);
    text('classic-stat-lifesteal', `${stats.lifesteal}%`);
    text('classic-stat-magic-resist', stats.magicResist);
    text('classic-stat-dmg-resist', `${stats.dmgResist}%`);
    text('classic-adventure-note', `魔塔最高 ${data.castle?.maxReachedFloor || 0} 层 · 潜能 ${data.freeStatPoints || 0} 点`);
    text('classic-dock-name', data.name);
    text('classic-hp-orb-text', stats.hp.toLocaleString());
    text('classic-mp-orb-text', stats.mp.toLocaleString());
    document.documentElement.style.setProperty('--class-portrait-position', {warrior:'0%',mage:'50%',hunter:'100%'}[data.classId] || '0%');
    // 人物页立绘纵向取景：按各职业立绘最顶端（发顶/杖顶）定位，贴框顶约 10px 留白；同一精灵图，按职业设 y。
    document.documentElement.style.setProperty('--class-portrait-y', {warrior:'6.4%',mage:'3.9%',hunter:'7.5%'}[data.classId] || '0%');
    document.documentElement.style.setProperty('--class-face-position', {warrior:'12.5%',mage:'50%',hunter:'87.5%'}[data.classId] || '12.5%');
    const [healthOrb, manaOrb] = this._topBarOrbs;
    for (const [orb, percent] of [[healthOrb, hpPercent], [manaOrb, mpPercent]]) {
      orb?.style.setProperty('--orb-fill', `${percent}%`);
      orb?.setAttribute('aria-valuenow', String(percent));
    }
  }

  pushSystemTicker(msg) {
    if (gameState && gameState.addSystemLog) {
      gameState.addSystemLog(msg, 'system');
    }
  }

  switchTab(tabName, route) {
    if (this.battleView?.currentCombat) return;
    if (route) this.views[tabName]?.navigate?.(route);
    gameState.resetDailyActivities();
    this.currentTab = tabName;
    sound.playSlash();

    // 根据场景即时切换 2010 氛围微光粒子 (熔炉/王城/林地/奥术)
    if (tabName === 'tower') {
      atmosphere.setPreset('tower');
    } else if (tabName === 'wild' || tabName === 'estate' || tabName === 'pets') {
      atmosphere.setPreset('forest');
    } else if (tabName === 'bag' || tabName === 'hero' || tabName === 'equip') {
      atmosphere.setPreset('palace');
    } else if (tabName === 'town') {
      atmosphere.setPreset(this.views.town?.getAtmospherePreset() || 'palace');
    }

    const worldTabs = ['tower', 'town', 'wild', 'estate'];
    const dockTabs = ['hero', 'equip', 'bag', 'pets'];
    const allTabs = [...worldTabs, ...dockTabs];

    allTabs.forEach(t => {
      const btn = document.getElementById(`nav-tab-${t}`);
      const pane = document.getElementById(`tab-content-${t}`);
      const isActive = (t === tabName);
      btn?.setAttribute('aria-current', isActive ? 'page' : 'false');

      if (isActive) {
        if (btn) {
          btn.className = 'mota-btn-gold px-2 py-1 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1 border-[#ffe58f]';
        }
        if (pane) {
          pane.classList.remove('hidden');
          pane.classList.add('block');
        }
      } else {
        if (btn) {
          if (dockTabs.includes(t)) {
            btn.className = 'mota-btn-dock px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1';
          } else {
            btn.className = 'mota-btn-dark px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 hover:border-[#b0997e]';
          }
        }
        if (pane) {
          pane.classList.add('hidden');
          pane.classList.remove('block');
        }
      }
    });
    // Hide the previous pane before measuring the next view's available space.
    // Rendering mid-loop briefly gives the bag half the height when leaving pets.
    if (this.views[tabName]) {
      this.views[tabName].render();
      if (this._renderScheduled) this._scheduledViewRendered = true;
    }
    this.views.wild.setActive(tabName === 'wild');
  }

  addStatPoint(type) {
    if (gameState.data.freeStatPoints <= 0) return;
    gameState.data.freeStatPoints--;
    gameState.data.allocatedStats[type]++;
    sound.playCoin();
    gameState.notify();
    this.views.hero?.render();
    if (this.currentTab === 'hero' && this._renderScheduled) this._scheduledViewRendered = true;
  }

  bindHeaderEvents() {
    document.querySelectorAll('[data-classic-tab]').forEach(button => button.addEventListener('click', () => this.switchTab(button.dataset.classicTab)));
    ['tower', 'town', 'wild', 'estate', 'hero', 'equip', 'bag', 'pets'].forEach(t => {
      const btn = document.getElementById(`nav-tab-${t}`);
      if (btn) {
        btn.addEventListener('click', () => this.switchTab(t));
      }
    });

    // 圣堂档案馆 · 存档管理
    const btnArchive = document.getElementById('btn-open-archive');
    if (btnArchive) {
      btnArchive.addEventListener('click', () => {
        this.archiveModal.open();
      });
    }

    // 开启全新冒险
    const btnNewGame = document.getElementById('btn-new-game-entry');
    if (btnNewGame) {
      btnNewGame.addEventListener('click', () => {
        this.archiveModal.promptNewGame();
      });
    }

    const headerCharBox = document.getElementById('header-char-box');
    if (headerCharBox) {
      headerCharBox.addEventListener('click', () => {
        this.switchTab('hero');
      });
    }

    // 左侧人物栏「更多属性」：次要战斗属性以弹窗查看，栏内不出现滚动条。
    const btnMoreStats = document.getElementById('btn-more-stats');
    if (btnMoreStats) {
      btnMoreStats.addEventListener('click', () => {
        const pick = id => document.getElementById(id)?.textContent?.trim() || '-';
        const lines = [
          `暴击　　　${pick('classic-stat-crit')}`,
          `闪避　　　${pick('classic-stat-dodge')}`,
          `反击　　　${pick('classic-stat-counter')}`,
          `吸血　　　${pick('classic-stat-lifesteal')}`,
          `魔抗　　　${pick('classic-stat-magic-resist')}`
        ];
        gameModal.alert(lines.join('\n'), '更多战斗属性');
      });
    }
  }

  // 读档/导入后即时刷新整个游戏
  onReloadGame() {
    this.updateTopBar();
    if (this.questTracker) this.questTracker.render();
    const curView = this.views[this.currentTab];
    if (curView && curView.render) curView.render();
    this.charSelectModal.open();
  }

  // 新开游戏：重置并开启创角誓约
  onStartNewGame() {
    gameState.resetToNewGame();
    gameState.data.hasChosenClass = false;
    storage.save(gameState.data);
    this.updateTopBar();
    if (this.questTracker) this.questTracker.render();
    this.switchTab('tower');
    setTimeout(() => {
      this.charSelectModal.open(true);
    }, 150);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
    app.init();
  });
} else {
  const app = new GameApp();
  app.init();
}
