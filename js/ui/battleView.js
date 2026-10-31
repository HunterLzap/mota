// 经典2010文字页游动态战斗特写与战报演播面板
import { gameState } from '../core/state.js';
import { getDefeatAdvice } from '../core/journey.js';
import { runCombat } from '../core/combat.js';
import { sound } from '../core/sound.js';
import { CLASSES, getClassSkills } from '../config/classes.js';
import { PET_CONFIGS } from '../config/pets.js';
import { PET_SKILL_BOOKS } from '../config/petSkills.js';
import { ITEM_SLOTS } from '../config/items.js';
import { MERCENARIES } from '../config/estate.js';
import { MAPS } from '../config/maps.js';
import { getVectorIcon } from '../assets/vectorIcons.js';
import { renderGameIcon } from './iconHelper.js';
import { getWildPortraitStyle, getWildRegionStyle } from './wildArtwork.js';
import { getPetParty } from '../core/petParty.js';

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
    this.playerMaxHp = playerStats.maxHp;
    this.enemyName = enemyData.name;
    this.currentTurnIdx = 0;

    this.renderModal(playerData, enemyData, playerStats, enemyStats);
    this.overlay.classList.remove('hidden');
    this.overlay.classList.add('flex');
    document.body?.classList?.add('in-battle');

    this.playNextStep();
  }

  close() {
    if (this.stepTimer) clearTimeout(this.stepTimer);
    this.overlay.classList.add('hidden');
    this.overlay.classList.remove('flex');
    document.body?.classList?.remove('in-battle');
    this.currentCombat = null;
  }

  renderModal(playerData, enemyData, playerStats, enemyStats) {
    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const cls = CLASSES[playerData.classId];
    const pet = playerData.pets?.find(p => p.id === playerData.activePetId);
    const petConf = pet && PET_CONFIGS[pet.id];
    const merc = MERCENARIES.find(m => m.id === playerData.estate?.hiredMercId);
    const stats = (data, side) => `<dl class="battle-stats">${[['攻击',data.atk],['防御',data.def],['速度',data.speed],['魔力',data.mp ?? 0]].map(([name,value]) => `<div><dt>${name}</dt><dd${name === '魔力' ? ` id="b-${side}-mp-num"` : ''}>${Math.floor(value || 0).toLocaleString()}</dd></div>`).join('')}</dl>`;
    const cadence = side => `<p class="battle-cadence">出手间隔 <strong id="b-${side}-interval">${this.currentCombat.initialIntervals[side].toFixed(2)}</strong> 秒<span>第 <b id="b-${side}-actions">0</b> 次行动</span></p>`;
    const equipment = equipped => ITEM_SLOTS.map(slot => {
      const item = equipped?.[slot.id];
      return `<li><span>${esc(slot.name)}</span><div>${item ? `${renderGameIcon(item.icon || slot.id, {size:'w-5 h-5'})}<span>${esc(item.name)}${item.stars ? ` +${item.stars}` : ''}${item.durability <= 0 ? '（已破损）' : ''}</span>${item.gems?.length ? `<small>镶嵌：${item.gems.map(g => esc(g.name || g.id)).join('、')}</small>` : ''}` : '<span class="battle-muted">未装备</span>'}</div></li>`;
    }).join('');
    const skills = getClassSkills(playerData.classId, playerStats.skillLevelBonus || 0, playerData).filter(skill => (skill.level || 1) <= playerData.level);
    const learned = pet?.skills?.map(id => Object.values(PET_SKILL_BOOKS).find(book => book.id === id || book.skillId === id)?.name || id) || [];
    const enemySkills = enemyData.abilities ?? enemyStats.abilities ?? [];
    const enemyTiming = skill => (skill.hpThreshold
      ? `生命降至${Math.round(skill.hpThreshold * 100)}%时蓄势，下次行动释放；本场只尝试一次，控制可打断`
      : `每 ${skill.interval} 次行动施放，提前一次蓄势`) +
      (skill.minHitChance ? `；范围法术命中至少${skill.minHitChance}%` : '') +
      (skill.echoes ? `；之后${skill.echoes.charges}次行动余烬，每次生命上限${Math.round(skill.echoes.maxHpDamageRatio * 100)}%魔法伤害，控制或破魔可熄灭` : '') +
      (skill.healingSuppression ? `；命中后生命回复降低${Math.round(skill.healingSuppression.ratio * 100)}%，持续${skill.healingSuppression.duration}秒，不叠加且不压制复活，控制或破魔中断，净化不能移除首领引导` : '') +
      (skill.manaDrainRatio ? `；抽走当前魔力${Math.round(skill.manaDrainRatio * 100)}%，有魔力护盾时按实抽魔力${skill.manaBacklashMultiplier || 0}倍追加原始魔法反噬，不暴击，魔抗与减伤有效，法力吸收可补回；无魔力护盾只抽魔力` : '');
    const portrait = getWildPortraitStyle(enemyData.portraitKey);
    const enemyPortrait = portrait
      ? `<div class="battle-portrait enemy-portrait-art" role="img" aria-label="${esc(enemyData.name)}肖像" data-enemy-portrait="${esc(enemyData.portraitKey)}" style="${portrait}"></div>`
      : `<div class="battle-portrait">${renderGameIcon(enemyData.icon || enemyData.id || getVectorIcon('bld_tower', 'w-full h-full'), {size:'w-full h-full'})}</div>`;
    const region = enemyData.portraitKey && MAPS.find(map =>
      map.boss?.id === enemyData.portraitKey || map.monsters.some(monster => monster.icon === enemyData.portraitKey));
    const stageEnemy = portrait
      ? `<div class="battle-stage-actor battle-stage-opponent enemy-portrait-art" style="${portrait}" aria-hidden="true"></div>`
      : `<div class="battle-stage-actor battle-stage-opponent" aria-hidden="true">${renderGameIcon(enemyData.icon || enemyData.id || 'bld_tower', { size: 'w-full h-full' })}</div>`;
    this.overlay.innerHTML = `
      <div id="battle-card-container" class="battle-scene">
        <header class="battle-heading"><h1>战斗现场</h1><p id="battle-live-status" role="status" aria-live="polite">双方已就位，战斗开始</p><span>结算后返回原场景</span></header>
        <div class="battle-layout">
          <aside class="battle-roster battle-ally" aria-label="我方阵容">
            <h2>我方阵容</h2>
            <div class="battle-portrait class-portrait" role="img" aria-label="${esc(cls.name)}立绘"></div>
            <h3>${esc(playerData.name)}</h3><p class="battle-muted">${esc(cls.name)} · Lv.${playerData.level}</p>
            <div class="battle-health"><span>生命</span><strong id="b-player-hp-num">${playerStats.hp}</strong> / ${playerStats.maxHp}<div class="battle-health-track"><div id="b-player-hp-bar" style="width:100%"></div></div></div>
            ${stats(playerStats, 'player')}
            ${cadence('player')}
            <details open><summary>当前职业技能</summary><ul class="battle-skills">${skills.map(skill => `<li><strong>${esc(skill.name)} · ${skill.rank}级</strong><small>${skill.category === 'attack' ? `主动 · 消耗 ${skill.mpCost || 0} 魔力` : skill.category === 'aura' ? '光环' : '被动'}${playerStats.skillLevelBonus ? ` · 装备加成 +${playerStats.skillLevelBonus}级` : ''}</small></li>`).join('')}</ul></details>
            <details open><summary>随行伙伴</summary><p>${petConf ? `${esc(petConf.name)} · Lv.${pet.level} · 体力 ${pet.stamina ?? 100}${(pet.stamina ?? 100) < 60 ? '（疲劳，特性与魔典失效）' : ''}` : '未携带神兽'}</p>${petConf ? `<p class="battle-muted">${esc(petConf.traitName)}：${esc(petConf.traitDesc)}</p>` : ''}<p>${merc ? '佣兵：' + esc(merc.name) : '未雇佣随行佣兵'}</p>${learned.length ? `<p>神兽魔典：${learned.map(esc).join('、')}</p>` : ''}</details>
            ${getPetParty(playerData).slice(1).filter(member => member.pet).map(member => `<p class="battle-muted">副宠${member.slot}：${esc(member.config.name)} · ${member.pet.stamina ?? 100}体力 · ${member.active ? esc(member.config.traitName) : '疲劳，天赋暂停'}</p>`).join('')}
            <details><summary><span>穿戴装备 · 十个部位</span><small> 已穿戴 ${ITEM_SLOTS.filter(slot => playerData.equipped?.[slot.id]).length} / 10</small></summary><ul class="battle-equipment">${equipment(playerData.equipped)}</ul></details>
          </aside>
          <section class="battle-report" aria-label="战斗战报">
            <div class="battle-stage ${region ? 'battle-stage-wild' : ''}" style="${region ? getWildRegionStyle(region.id) : ''}" role="img" aria-label="${esc(playerData.name)}对阵${esc(enemyData.name)}">
              <div class="battle-stage-caption">${esc(region?.name || '战斗现场')}<span>对阵</span></div>
              <div class="battle-stage-actor battle-stage-hero class-portrait" aria-hidden="true"></div>${stageEnemy}
              <div id="damage-float-area"><div id="float-player"></div><div id="float-enemy"></div></div>
              <div class="battle-stage-names"><span>${esc(playerData.name)}</span><span>${esc(enemyData.name)}</span></div>
            </div>
            <p class="battle-clock-hint">双方按各自速度行动 · 回复与持续伤害每10秒结算</p>
            <div id="combat-log-stream" class="battle-log" tabindex="0" aria-label="按时间排列的战斗记录"></div>
            <div class="battle-controls"><div class="battle-speed"><button id="btn-spd-1" class="mota-btn-dark" aria-pressed="${this.playbackSpeed === 400}">1x 原速</button><button id="btn-spd-3" class="mota-btn-dark" aria-pressed="${this.playbackSpeed === 120}">3x 极速</button><button id="btn-skip-battle" class="mota-btn-gold">跳过演播</button></div><div id="battle-finish-actions" class="hidden"><button id="btn-confirm-battle" class="mota-btn-gold">确认并结算奖励</button></div></div>
          </section>
          <aside class="battle-roster battle-enemy" aria-label="对手阵容">
            <h2>对手阵容</h2>${enemyPortrait}
            <h3>${esc(enemyData.name)}</h3><p class="battle-muted">${esc(enemyData.title || (enemyData.isPvp ? '竞技场对手' : '当前场景守卫'))}${enemyData.level ? ' · Lv.' + esc(enemyData.level) : ''}</p>
            <div class="battle-health"><span>生命</span><strong id="b-enemy-hp-num">${enemyStats.hp}</strong> / ${enemyStats.maxHp || enemyStats.hp}<div class="battle-health-track"><div id="b-enemy-hp-bar" style="width:100%"></div></div></div>
            ${stats(enemyStats, 'enemy')}
            ${cadence('enemy')}
            ${enemyData.equipped || enemyData.pet ? `<details open><summary>装备与随从</summary>${enemyData.equipped ? `<ul class="battle-equipment">${equipment(enemyData.equipped)}</ul>` : ''}${enemyData.pet ? `<p>${esc(enemyData.pet.name)}</p>` : ''}</details>` : ''}
            <details open><summary>对手技能与机制</summary><ul class="battle-skills"><li><strong>普通攻击</strong><small>速度越高，出手间隔越短；眩晕会跳过一次行动</small></li>${enemySkills.map(skill => `<li><strong>${esc(skill.name)}</strong><small>${esc(enemyTiming(skill))} · 消耗 ${skill.mpCost || 0} 魔力</small></li>`).join('')}${enemyData.rebirth ? `<li><strong>${esc(enemyData.rebirth.name || '重生')}</strong><small>致命伤后触发，单场一次</small></li>` : ''}${enemyStats.hasPhases ? '<li><strong>多阶段首领</strong><small>护盾、狂暴与献祭，随生命变化触发</small></li>' : ''}</ul></details>
          </aside>
        </div>
      </div>`;
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
    const status = document.getElementById('battle-live-status');
    if (status) status.textContent = step.time ? `战斗时间 ${step.time.toFixed(1)} 秒` : '双方已就位，战斗开始';
    for (const side of ['player', 'enemy']) {
      const interval = document.getElementById(`b-${side}-interval`);
      if (interval && Number.isFinite(step[`${side}Interval`])) interval.textContent = step[`${side}Interval`].toFixed(2);
      const actions = document.getElementById(`b-${side}-actions`);
      if (actions && step.actor === side) actions.textContent = step.action;
    }
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
    logDiv.textContent = step.message;
    stream.appendChild(logDiv);
    stream.scrollTop = stream.scrollHeight;

    // 更新血条
    const maxPlayerHp = this.playerMaxHp;
    const playerHpPercent = Math.max(0, Math.min(100, (step.playerHp / maxPlayerHp) * 100));
    const pBar = document.getElementById('b-player-hp-bar');
    const pNum = document.getElementById('b-player-hp-num');
    if (pBar) pBar.style.width = `${playerHpPercent}%`;
    if (pNum) pNum.innerText = step.playerHp;
    for (const side of ['player', 'enemy']) {
      const mana = document.getElementById(`b-${side}-mp-num`), value = step[side + 'Mp'];
      if (mana && Number.isFinite(value)) mana.textContent = Math.floor(value).toLocaleString();
    }

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
    const status = document.getElementById('battle-live-status');
    if (status) status.textContent = `${this.currentCombat.duration.toFixed(1)} 秒 · ` + (isWin ? '战斗胜利，结算后继续冒险' : this.currentCombat.timedOut ? '超过300秒未击败对手，请调整装备与伙伴后再试' : getDefeatAdvice(gameState.data, this.currentCombat));
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
        btn1.setAttribute('aria-pressed', 'true');
        btn3?.setAttribute('aria-pressed', 'false');
        btn1.classList.add('text-amber-400');
        if (btn3) btn3.classList.remove('text-amber-400');
      });
    }
    if (btn3) {
      btn3.addEventListener('click', () => {
        this.playbackSpeed = 120;
        btn3.setAttribute('aria-pressed', 'true');
        btn1?.setAttribute('aria-pressed', 'false');
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
        const defeatAdvice = isWin ? '' : getDefeatAdvice(gameState.data, this.currentCombat);
        const enemyName = this.enemyName || '未知强敌';
        const onFinish = this.onFinishCallback;
        this.onFinishCallback = null;
        this.close();
        if (isWin) {
          gameState.addSystemLog(`【战报】大获全胜！成功击溃「${enemyName}」！`, 'battle');
        } else {
          gameState.addSystemLog(`【战报】与「${enemyName}」的对决受挫。${defeatAdvice}`, 'battle');
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
