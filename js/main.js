// 游戏总控制器与主事件总线 (2010经典页游深度纯单机版)
import { gameState } from './core/state.js';
import { getJourneyGuidance, getOptionalEquipmentGoal } from './core/journey.js';
import { MAPS } from './config/maps.js';
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
  }

  async init() {
    window.appInstance = this;
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

    window.gameState = gameState;
    window.addStat = (type) => this.addStatPoint(type);
    window.switchMainTab = (tab) => this.switchTab(tab);

    this.battleView = new BattleView('battle-overlay');
    this.charSelectModal = new CharSelectModal('char-select-overlay');

    // 核心功能系统挂载 (4大冒险场景 + 4大勇者核心功能)
    this.views.tower = new TowerView('tab-content-tower', (params) => this.battleView.start(params));
    this.views.town = new TownView('tab-content-town', (params) => this.battleView.start(params));
    this.views.wild = new WildView('tab-content-wild', (params) => this.battleView.start(params));
    this.views.estate = new EstateView('tab-content-estate');
    this.views.hero = new HeroView('tab-content-hero');
    this.views.equip = new EquipView('tab-content-equip');
    this.views.bag = new BagView('tab-content-bag', (tab) => this.switchTab(tab));
    this.views.pets = new PetView('tab-content-pets');

    // 挂载常驻右侧任务追踪与自动寻路指引
    this.questTracker = new QuestTracker('quest-tracker-mount', (targetTab, targetAction) => {
      this.handleQuestNavigation(targetTab, targetAction);
    });

    // 挂载常驻右侧系统提示与动态日志
    this.systemLogView = new SystemLogView('system-log-mount');

    let hadChosenClass = gameState.data.hasChosenClass;
    gameState.subscribe(() => {
      const becameChosen = !hadChosenClass && gameState.data.hasChosenClass;
      hadChosenClass = gameState.data.hasChosenClass;
      this.updateTopBar();
      this.renderJourneyGuide();
      if (this.questTracker) this.questTracker.render();
      if (this.systemLogView) this.systemLogView.render();
      const curView = this.views[this.currentTab];
      if (curView && curView.render) curView.render();
      if (becameChosen) {
        const quest = getQuestList(gameState.data).find(q => q.id === gameState.data.currentQuestId);
        if (quest) this.handleQuestNavigation(quest.targetTab, quest.targetAction);
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab');
    if (initialTab && this.views[initialTab]) {
      this.currentTab = initialTab;
    }

    this.bindHeaderEvents();
    for (const [tab, key, label] of [
      ['hero','ui_rank','人物'],['equip','ui_equip','装备'],['bag','ui_bag','行囊'],['pets','ui_pet','神兽'],
      ['tower','ui_town','魔塔'],['town','ui_compass','王都'],['wild','ui_wild','野外'],['estate','ui_estate','庄园']
    ]) {
      const button = document.getElementById(`nav-tab-${tab}`);
      if (button) button.innerHTML = renderGameIcon(key, { size: 'w-5 h-5', className: 'nav-art' }) + `<span>${label}</span>`;
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
      this.views.town.currentView = 'tavern_commissions';
      this.switchTab('town');
      const card = document.querySelector(`[data-commission-card="${optional.id}"]`);
      card?.scrollIntoView({ block: 'nearest' });
      const control = card?.querySelector('input, [data-commission-go], .btn-commission:not(:disabled)') ||
        document.getElementById('commission-heading');
      control?.focus({ preventScroll: true });
    });
    document.getElementById('btn-next-journey').onclick = () => {
      if (step.regionalReady) {
        const result = gameState.claimRegionalStory(step.event.id);
        if (result.success) gameModal.alert(`${step.event.speaker}：调查记录已经收好。补给和口粮交给你，继续追查下一条线索。\n\n${result.exp ? `经验 +${result.exp}，` : '调查经验已随战斗获得，'}声望 +${step.event.prestige}，伙伴口粮 x3。`, step.event.title);
      } else if (ready) document.getElementById('btn-claim-quest-reward')?.click();
      else this.handleQuestNavigation(step.tab, step.action);
    };
  }

  // 任务一键自动寻路逻辑
  handleQuestNavigation(targetTab, targetAction) {
    if (targetAction === 'meet_guard') {
      this.switchTab('town');
      const quest = getQuestList(gameState.data)[0];
      document.getElementById('btn-next-journey')?.focus();
      gameModal.dialogue(quest.desc + '\n\n接受委托后领取武器和护胸，再去行囊穿戴。', () => {
        const result = gameState.meetCityGuard();
        if (result.success) { gameState.claimQuestReward('quest_1'); gameModal.toast('罗兰交给你武器和护胸。先穿好，再出城。'); this.handleQuestNavigation('bag', 'equip_gear'); }
      }, null, { name: '守备官罗兰', portrait: 'warrior' }, { confirmLabel: '接受委托', cancelLabel: '稍后' });
      return;
    }
    if (targetAction === 'regional_story') {
      const event = getJourneyGuidance(gameState.data)?.event;
      if (!event) return;
      if (event.action === 'dungeon') { this.views.tower.subTab = 'dungeons'; this.views.tower.selectedGateId = event.target; this.switchTab('tower'); }
      else { this.views.wild.selectedMapId = event.target; this.switchTab('wild'); }
      return;
    }
    if (targetAction === 'epilogue') {
      this.switchTab('town');
      gameModal.alert('罗兰：巡逻队的幸存者已经回家。城外的道路终于恢复了往来。\n\n米拉：最初只是一份寻人的委托，没想到我们能走到这里。谢谢你没有放弃。\n\n赛拉：你的伙伴也该休息一下了。古门里还有未知的故事，等你准备好，我们再出发。\n\n你可以继续探索未通关的古门、培养新的伙伴，或挑战角斗场。', '王都的归途');
      return;
    }
    if (targetAction === 'enhance' && !Object.values(gameState.data.equipped).some(Boolean)) targetTab = 'bag';
    this.switchTab(targetTab);

    // 细分建筑或子页面智能精准聚焦
    if (targetTab === 'town') {
      if (targetAction === 'enhance') {
        this.views.town.currentView = 'smithy_enhance';
        this.views.town.render();
      } else if (targetAction === 'claim_salary') {
        this.views.town.currentView = 'palace_salary';
        this.views.town.render();
      } else if (targetAction === 'socket_gem') {
        this.views.town.currentView = 'smithy_socket';
        this.views.town.render();
      } else if (targetAction === 'slay_dragon' || targetAction === 'slay_silver_dragon') {
        this.views.town.currentView = 'dragons';
        this.views.town.render();
      } else if (targetAction === 'royal_trials' || targetAction === 'complete_royal_trials') {
        this.views.town.currentView = 'palace_trials';
        this.views.town.render();
      } else if (targetAction === 'arena_duel') {
        this.views.town.currentView = 'palace_arena';
        this.views.town.arenaSubTab = 'duel';
        this.views.town.render();
      } else if (targetAction === 'arena_shop') {
        this.views.town.currentView = 'palace_arena';
        this.views.town.arenaSubTab = 'shop';
        this.views.town.render();
      } else if (targetAction === 'earn_prestige') {
        this.views.town.currentView = 'tavern_bounty';
        this.views.town.render();
      } else if (targetAction === 'reforge_gear') {
        this.views.town.currentView = 'smithy_reforge';
        this.views.town.render();
      } else if (targetAction === 'inscribe_runes' || targetAction === 'fish') {
        this.views.town.currentView = targetAction === 'fish' ? 'fishing' : 'smithy_runes';
        this.views.town.render();
      } else if (targetAction === 'capture_stronghold') {
        this.views.town.currentView = 'faction_war';
        this.views.town.render();
      }
    } else if (targetTab === 'wild') {
      if (targetAction === 'grow_in_wild') {
        this.views.wild.selectedMapId = MAPS.filter(map => map.reqLevel <= gameState.data.level).at(-1).id;
        this.views.wild.render();
      } else if (targetAction === 'slay_wild_boss') {
        this.views.wild.selectedMapId = 'forest';
        this.views.wild.render();
      } else if (targetAction === 'catch_thief') {
        this.views.wild.render();
      }
    } else if (targetTab === 'pets') {
      if (targetAction === 'wash_aptitude' || targetAction === 'evolve_purplegold') {
        this.views.pets.currentSubTab = 'wash';
        this.views.pets.render();
      } else if (targetAction === 'learn_skill') {
        this.views.pets.currentSubTab = 'skills';
        this.views.pets.render();
      } else if (targetAction === 'set_active_pet' || targetAction === 'feed_pet') {
        this.views.pets.currentSubTab = 'overview';
        if (targetAction === 'feed_pet') this.views.pets.selectedPetId = getJourneyGuidance(gameState.data)?.petId || gameState.data.activePetId;
        this.views.pets.render();
      }
    } else if (targetTab === 'estate') {
      if (targetAction === 'brew_potion') {
        this.views.estate.currentView = 'alchemy';
        this.views.estate.render();
      } else if (targetAction === 'hire_merc') {
        this.views.estate.currentView = 'mercenaries';
        this.views.estate.render();
      }
    } else if (targetTab === 'tower') {
      if (targetAction === 'use_castle_key') {
        this.views.tower.subTab = 'castle';
        this.views.tower.render();
      } else if (targetAction === 'clear_tower_1') {
        this.views.tower.subTab = 'castle';
        this.views.tower.selectedFloor = 1;
        this.views.tower.render();
      } else if (targetAction === 'clear_tower_10') {
        this.views.tower.subTab = 'castle';
        this.views.tower.selectedFloor = 10;
        this.views.tower.render();
      } else if (targetAction === 'clear_tower_20') {
        this.views.tower.subTab = 'castle';
        this.views.tower.selectedFloor = 20;
        this.views.tower.render();
      } else if (targetAction === 'retry_finale') {
        this.views.tower.subTab = 'castle';
        this.views.tower.render();
        requestAnimationFrame(() => document.querySelector('#btn-retry-finale')?.focus());
      } else if (targetAction === 'clear_tower_70' || targetAction === 'clear_tower_100' || targetAction === 'withdraw_castle') {
        this.views.tower.subTab = 'castle';
        this.views.tower.render();
      } else if (targetAction === 'clear_dungeon' || targetAction === 'clear_dragon_gate' || targetAction === 'clear_spacetime_gate') {
        this.views.tower.subTab = 'dungeons';
        if (targetAction === 'clear_dragon_gate') this.views.tower.selectedGateId = 'dragon_gate';
        if (targetAction === 'clear_spacetime_gate') this.views.tower.selectedGateId = 'spacetime_gate';
        this.views.tower.render();
      }
    }
  }

  updateTopBar() {
    const data = gameState.data;
    const stats = gameState.getEffectiveStats();
    const cls = CLASSES[data.classId];
    const nextExp = gameState.getNextLevelExp(data.level);
    const expPercent = Math.min(100, Math.floor((data.exp / nextExp) * 100));

    const hpPercent = Math.min(100, Math.floor((stats.hp / stats.maxHp) * 100));
    const mpPercent = Math.min(100, Math.floor((stats.mp / stats.maxMp) * 100));

    const elName = document.getElementById('header-player-name');
    const elNation = document.getElementById('header-nation-badge');
    const elTitle = document.getElementById('header-title-badge');
    const elClass = document.getElementById('header-player-class');
    const elClassIcon = document.getElementById('header-class-icon');
    const elLevel = document.getElementById('header-player-level');
    const elExpBar = document.getElementById('header-exp-bar');
    const elExpText = document.getElementById('header-exp-text');
    const elGold = document.getElementById('header-gold');
    const elCrystal = document.getElementById('header-crystal');
    const elPrestige = document.getElementById('header-prestige');
    const elHpBar = document.getElementById('header-hp-bar');
    const elHpText = document.getElementById('header-hp-text');
    const elMpBar = document.getElementById('header-mp-bar');
    const elMpText = document.getElementById('header-mp-text');

    const nation = NATIONS[data.nation] || NATIONS.aden;
    if (elName) elName.innerText = data.name;
    if (elNation) elNation.innerText = nation.name.split(' ')[0];
    if (elTitle) elTitle.innerText = data.royalTrials ? data.royalTrials.currentTitle : '见习勇者';
    if (elClass) elClass.innerText = gameState.getPromotedClassName();
    if (elClassIcon) elClassIcon.innerHTML = renderGameIcon(cls.id, { size: 'w-full h-full' });
    if (elLevel) elLevel.innerText = `Lv.${data.level}`;
    if (elExpBar) elExpBar.style.width = `${expPercent}%`;
    if (elExpText) elExpText.innerText = `${data.exp} / ${nextExp}`;
    const elExpSub = document.getElementById('header-exp-sub');
    if (elExpSub) elExpSub.innerText = `${expPercent}%`;
    if (elGold) elGold.innerText = data.gold.toLocaleString();
    if (elCrystal) elCrystal.innerText = data.crystal.toLocaleString();
    if (elPrestige) elPrestige.innerText = data.prestige.toLocaleString();

    if (elHpBar) elHpBar.style.width = `${hpPercent}%`;
    if (elHpText) elHpText.innerText = `${stats.hp} / ${stats.maxHp}`;
    if (elMpBar) elMpBar.style.width = `${mpPercent}%`;
    if (elMpText) elMpText.innerText = `${stats.mp} / ${stats.maxMp}`;

    const elActiveSlot = document.getElementById('header-active-slot-text');
    if (elActiveSlot) elActiveSlot.innerText = `存档 ${storage.getActiveSlotId()}`;
    const text = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
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
    document.documentElement.style.setProperty('--class-face-position', {warrior:'12.5%',mage:'50%',hunter:'87.5%'}[data.classId] || '12.5%');
    for (const [selector, percent] of [['.classic-health-orb', hpPercent], ['.classic-mana-orb', mpPercent]]) {
      const orb = document.querySelector(selector);
      orb?.style.setProperty('--orb-fill', `${percent}%`);
      orb?.setAttribute('aria-valuenow', String(percent));
    }
  }

  pushSystemTicker(msg) {
    if (gameState && gameState.addSystemLog) {
      gameState.addSystemLog(msg, 'system');
    }
  }

  switchTab(tabName) {
    if (this.battleView?.currentCombat) return;
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
      const bld = this.views.town ? this.views.town.currentView : 'hub';
      if (bld && (bld.startsWith('smithy') || bld === 'dragons')) atmosphere.setPreset('forge');
      else if (bld === 'fishing') atmosphere.setPreset('forest');
      else atmosphere.setPreset('palace');
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
    if (this.views[tabName]) this.views[tabName].render();
  }

  addStatPoint(type) {
    if (gameState.data.freeStatPoints <= 0) return;
    gameState.data.freeStatPoints--;
    gameState.data.allocatedStats[type]++;
    sound.playCoin();
    gameState.notify();
    if (this.views.hero) this.views.hero.render();
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
