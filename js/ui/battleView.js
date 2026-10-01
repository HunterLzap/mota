// 经典2010文字页游动态战斗特写与战报演播面板
import { gameState } from '../core/state.js';
import { runCombat } from '../core/combat.js';
import { sound } from '../core/sound.js';
import { CLASSES } from '../config/classes.js';
import { PET_CONFIGS } from '../config/pets.js';
import { renderGameIcon } from './iconHelper.js';

export class BattleView {
  constructor(overlayId) {
    this.overlay = document.getElementById(overlayId);
    this.currentCombat = null;
    this.stepTimer = null;
    this.currentTurnIdx = 0;
    this.playbackSpeed = 400; // 毫秒/步
    this.onFinishCallback = null;
  }

  start(combatParams) {
    if (this.currentCombat || !gameState.data.hasChosenClass) return;
    const playerStats = gameState.getEffectiveStats();
    const playerData = gameState.data;
    const enemyData = combatParams.enemyData || combatParams.enemy || { name: '魔塔守卫', icon: '' };
    const enemyStats = combatParams.enemyStats || combatParams.enemy || { hp: 100, atk: 10, def: 5, speed: 15 };
    if (!enemyStats.maxHp) enemyStats.maxHp = enemyStats.hp;

    this.onFinishCallback = combatParams.onFinish || combatParams.onWin || null;
    this.currentCombat = runCombat(playerStats, enemyStats, playerData, enemyData);
    this.enemyName = enemyData.name;
    this.currentTurnIdx = 0;

    this.renderModal(playerData, enemyData, playerStats, enemyStats);
    this.overlay.classList.remove('hidden');
    this.overlay.classList.add('flex');

    this.playNextStep();
  }

  close() {
    if (this.stepTimer) clearTimeout(this.stepTimer);
    this.overlay.classList.add('hidden');
    this.overlay.classList.remove('flex');
    this.currentCombat = null;
  }

  renderModal(playerData, enemyData, playerStats, enemyStats) {
    const cls = CLASSES[playerData.classId];
    const petConf = playerData.activePetId ? PET_CONFIGS[playerData.activePetId] : null;

    this.overlay.innerHTML = `
      <div id="battle-card-container" class="relative w-full max-w-2xl mota-parchment-panel rounded-2xl border-2 border-amber-500/80 p-5 shadow-2xl flex flex-col justify-between max-h-[92vh] overflow-hidden">
        
        <!-- 顶部双方对决立绘与动态红蓝血条 -->
        <div class="grid grid-cols-2 gap-4 border-b border-slate-700 pb-3">
          <!-- 勇者侧 -->
          <div class="flex items-center gap-3">
            <div class="relative w-14 h-14 rounded-xl border-2 border-amber-400 bg-black/60 flex items-center justify-center p-1 shadow">
              ${renderGameIcon(cls.id, { size: 'w-full h-full' })}
              ${petConf ? `<span class="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-purple-950 border border-purple-400 rounded-full p-0.5 shadow flex items-center justify-center">${renderGameIcon(petConf.id, { size: 'w-full h-full' })}</span>` : ''}
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-amber-300">${playerData.name}</span>
                <span id="b-player-hp-num" class="text-red-400 font-mono">${playerStats.hp}</span>
              </div>
              <!-- 勇者血条 -->
              <div class="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700 mt-1">
                <div id="b-player-hp-bar" class="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-200" style="width: 100%;"></div>
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">${cls.name} · Lv.${playerData.level}</div>
            </div>
          </div>

          <!-- 敌方守关者侧 -->
          <div class="flex items-center gap-3 flex-row-reverse text-right">
            <div class="w-14 h-14 rounded-xl border-2 border-red-500 bg-red-950/40 flex items-center justify-center p-1.5 shadow">
              ${renderGameIcon(enemyData.icon || enemyData.id, { size: 'w-full h-full', fallback: '' })}
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between text-xs font-bold">
                <span id="b-enemy-hp-num" class="text-red-400 font-mono">${enemyStats.hp}</span>
                <span class="text-red-300">${enemyData.name}</span>
              </div>
              <!-- 敌方血条 -->
              <div class="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700 mt-1">
                <div id="b-enemy-hp-bar" class="h-full bg-gradient-to-l from-red-600 to-red-400 transition-all duration-200" style="width: 100%;"></div>
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">${enemyData.title || '魔塔挑战者'}</div>
            </div>
          </div>
        </div>

        <!-- 浮动伤害弹出槽位 -->
        <div id="damage-float-area" class="relative h-6 flex justify-between px-6 pointer-events-none text-base font-bold font-mono">
          <div id="float-player" class="text-red-400"></div>
          <div id="float-enemy" class="text-yellow-400"></div>
        </div>

        <!-- 中间：经典逐回合滚动文字战报日志 (纯正2010年魔塔世界灵魂) -->
        <div id="combat-log-stream" class="flex-1 my-2 bg-black/60 rounded-xl p-3 border border-slate-800 overflow-y-auto max-h-[340px] space-y-2 text-xs font-sans select-text">
          <!-- 战报条目动态插入 -->
        </div>

        <!-- 底部控制栏 -->
        <div class="pt-3 border-t border-slate-700 flex items-center justify-between">
          <div class="flex gap-2">
            <button id="btn-spd-1" class="mota-btn-dark px-3 py-1 rounded text-xs">1x 原速</button>
            <button id="btn-spd-3" class="mota-btn-dark px-3 py-1 rounded text-xs font-bold text-amber-400">3x 极速</button>
            <button id="btn-skip-battle" class="mota-btn-gold px-3 py-1 rounded text-xs font-bold">跳过战斗</button>
          </div>

          <div id="battle-finish-actions" class="hidden">
            <button id="btn-confirm-battle" class="mota-btn-gold px-6 py-1.5 rounded-lg text-xs font-bold shadow-lg">
              确认并结算奖励
            </button>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  playNextStep() {
    if (!this.currentCombat) return;

    if (this.currentTurnIdx >= this.currentCombat.logs.length) {
      this.onCombatEnded();
      return;
    }

    const step = this.currentCombat.logs[this.currentTurnIdx];
    this.renderStep(step);
    this.currentTurnIdx++;

    this.stepTimer = setTimeout(() => {
      this.playNextStep();
    }, this.playbackSpeed);
  }

  renderStep(step) {
    const stream = document.getElementById('combat-log-stream');
    if (!stream) return;

    const logDiv = document.createElement('div');
    logDiv.className = `p-2 rounded combat-log-line text-xs ${
      step.type === 'crit' ? 'log-crit' :
      step.type === 'heal' ? 'log-heal' :
      step.type === 'counter' ? 'log-counter' :
      step.type === 'phoenix' || step.type === 'pixie' || step.type === 'pet_skill' ? 'log-pet' :
      'bg-slate-900/40 text-slate-300'
    }`;
    logDiv.innerHTML = step.message;
    stream.appendChild(logDiv);
    stream.scrollTop = stream.scrollHeight;

    // 更新血条
    const maxPlayerHp = gameState.getEffectiveStats().maxHp;
    const playerHpPercent = Math.max(0, Math.min(100, (step.playerHp / maxPlayerHp) * 100));
    const pBar = document.getElementById('b-player-hp-bar');
    const pNum = document.getElementById('b-player-hp-num');
    if (pBar) pBar.style.width = `${playerHpPercent}%`;
    if (pNum) pNum.innerText = step.playerHp;

    const enemyMaxHp = this.currentCombat.logs[0].enemyHp || 1000;
    const enemyHpPercent = Math.max(0, Math.min(100, (step.enemyHp / enemyMaxHp) * 100));
    const eBar = document.getElementById('b-enemy-hp-bar');
    const eNum = document.getElementById('b-enemy-hp-num');
    if (eBar) eBar.style.width = `${enemyHpPercent}%`;
    if (eNum) eNum.innerText = step.enemyHp;

    // 浮动伤害弹出 (2011经典大红字/暴击立体字)
    const flPlayer = document.getElementById('float-player');
    const flEnemy = document.getElementById('float-enemy');
    if (step.damage && step.damage > 0) {
      const targetFl = step.actor === 'player' ? flEnemy : flPlayer;
      if (targetFl) {
        if (step.type === 'crit') {
          targetFl.innerHTML = `<span class="crit-pop-text">暴击! -${step.damage}</span>`;
        } else {
          targetFl.innerHTML = `<span class="text-sm font-bold font-mono text-red-400 drop-shadow animate-pulse">-${step.damage}</span>`;
        }
        setTimeout(() => { if (targetFl) targetFl.innerHTML = ''; }, 650);
      }
    }

    // 音效与震屏
    if (step.type === 'crit') {
      sound.playCrit();
      const card = document.getElementById('battle-card-container');
      if (card) {
        card.classList.add('mota-shake');
        setTimeout(() => card.classList.remove('mota-shake'), 350);
      }
    } else if (step.type === 'hit') {
      sound.playSlash();
    } else if (step.type === 'counter') {
      sound.playBlock();
    } else if (step.type === 'heal' || step.type === 'phoenix') {
      sound.playMagic();
    }
  }

  skipAll() {
    if (this.stepTimer) clearTimeout(this.stepTimer);
    const stream = document.getElementById('combat-log-stream');
    if (!stream || !this.currentCombat) return;

    // 瞬间跑完全部剩余回合
    while (this.currentTurnIdx < this.currentCombat.logs.length) {
      const step = this.currentCombat.logs[this.currentTurnIdx];
      this.renderStep(step);
      this.currentTurnIdx++;
    }

    this.onCombatEnded();
  }

  onCombatEnded() {
    if (this.stepTimer) clearTimeout(this.stepTimer);

    const isWin = this.currentCombat.victory;
    if (isWin) {
      sound.playFanfare();
    } else {
      sound.playBlock();
    }

    const actionDiv = document.getElementById('battle-finish-actions');
    const btn = document.getElementById('btn-confirm-battle');
    if (actionDiv && btn) {
      actionDiv.classList.remove('hidden');
      btn.innerText = isWin ? '战斗大胜！领取奖励' : '战败……返回备战';
      btn.className = isWin ? 'mota-btn-gold px-6 py-1.5 rounded-lg text-xs font-bold' : 'mota-btn-dark px-6 py-1.5 rounded-lg text-xs font-bold text-red-400';
    }
  }

  bindEvents() {
    // 调速
    const btn1 = document.getElementById('btn-spd-1');
    const btn3 = document.getElementById('btn-spd-3');
    const btnSkip = document.getElementById('btn-skip-battle');
    const btnConfirm = document.getElementById('btn-confirm-battle');

    if (btn1) {
      btn1.addEventListener('click', () => {
        this.playbackSpeed = 400;
        btn1.classList.add('text-amber-400');
        if (btn3) btn3.classList.remove('text-amber-400');
      });
    }
    if (btn3) {
      btn3.addEventListener('click', () => {
        this.playbackSpeed = 120;
        btn3.classList.add('text-amber-400');
        if (btn1) btn1.classList.remove('text-amber-400');
      });
    }
    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        this.skipAll();
      });
    }
    if (btnConfirm) {
      btnConfirm.addEventListener('click', () => {
        if (!this.currentCombat || this.currentTurnIdx < this.currentCombat.logs.length) return;
        const isWin = this.currentCombat.victory;
        const enemyName = this.enemyName || '未知强敌';
        const onFinish = this.onFinishCallback;
        this.onFinishCallback = null;
        this.close();
        if (isWin) {
          gameState.addSystemLog(`【战报】大获全胜！成功击溃「${enemyName}」！`, 'battle');
        } else {
          gameState.addSystemLog(`【战报】勇者惜败...在与「${enemyName}」的对决中受挫，建议强化装备提升属性后再战！`, 'battle');
        }
        try {
          if (onFinish) onFinish(isWin);
        } finally {
          gameState.completeBattle();
        }
      });
    }
  }
}
