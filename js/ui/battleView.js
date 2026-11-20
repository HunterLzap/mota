// 经典2010文字页游动态战斗特写与战报演播面板
import { gameState } from '../core/state.js';
import { getDefeatAdvice } from '../core/journey.js';
import { runCombat } from '../core/combat.js';
import { sound } from '../core/sound.js';
import { CLASSES, getClassSkills } from '../config/classes.js';
import { PET_SKILL_BOOKS } from '../config/petSkills.js';
import { ITEM_SLOTS } from '../config/items.js';
import { MERCENARIES } from '../config/estate.js';
import { MAPS } from '../config/maps.js';
import { getVectorIcon } from '../assets/vectorIcons.js';
import { renderGameIcon } from './iconHelper.js';
import { getWildPortraitStyle, getWildRegionStyle } from './wildArtwork.js';
import { getPetParty } from '../core/petParty.js';
import { renderPetPortrait } from './petPortrait.js';
import { tooltip } from './tooltip.js';

// 战报分级：悬停浮层用的类型说明（不常驻图例）
function battleGradeInfo(step) {
  const t = step.type;
  if (t === 'crit') return { label: '暴击', desc: '命中要害，造成额外伤害。' };
  if (t === 'damage' || t === 'hit') return { label: '伤害', desc: '攻击造成的直接伤害。' };
  if (t === 'poison') return { label: '持续伤害（中毒）', desc: '每 10 秒结算一次的毒伤。' };
  if (t === 'counter') return { label: '反击', desc: '受击后回敬对手的伤害。' };
  if (t === 'heal') return { label: '治疗回复', desc: '生命或魔力的回复。' };
  if (t === 'special' || t === 'skill') return { label: '特殊效果', desc: '护盾、吸收、法力回流等特殊效果。' };
  if (t === 'status' || t === 'warning') return { label: '状态与预警', desc: '眩晕、减速等异常状态或首领蓄势提示。' };
  if (t === 'passive') return { label: '被动 / 光环', desc: '职业光环、神兽随行或佣兵援护的持续效果。' };
  if (t === 'phoenix' || t === 'pixie' || t === 'pet_skill') return { label: '神兽天赋', desc: '神兽天赋或魔典触发的效果。' };
  return { label: '战斗记录', desc: '战斗过程中的事件记录。' };
}

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
    const enemyStats = { ...(combatParams.enemyStats || combatParams.enemy || { hp: 100, atk: 10, def: 5, speed: 15 }) };
    if (!enemyStats.maxHp) enemyStats.maxHp = enemyStats.hp;

    this.onFinishCallback = combatParams.onFinish || combatParams.onWin || null;
    this.currentCombat = runCombat(playerStats, enemyStats, playerData, enemyData, { companionMode: combatParams.companionMode || 'auto' });
    this.playerMaxHp = playerStats.maxHp;
    this.playerMaxMp = playerStats.maxMp ?? 0;
    this.enemyMaxHp = enemyStats.maxHp || enemyStats.hp || 1;
    this.enemyMaxMp = enemyStats.maxMp ?? 100;
    this.enemyName = enemyData.name;
    this.lootSnapshot = this.snapshotLoot();
    this.currentTurnIdx = 0;
    this.lastPlayerHp = this.playerMaxHp;
    this.lastEnemyHp = this.enemyMaxHp;
    this._prevPlayerPct = 100;
    this._prevEnemyPct = 100;
    this._narr = {};
    this._endNarrated = false;

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
    const pet = getPetParty(playerData)[0].pet;
    const merc = MERCENARIES.find(m => m.id === playerData.estate?.hiredMercId);
    const party = getPetParty(playerData);
    const companionSlots = party.map(member => {
      const label = member.slot === 0 ? '主宠' : `副宠${member.slot}`;
      if (!member.pet) return `<li class="battle-companion is-empty" data-companion-slot="${member.slot}"><span class="battle-companion-face" aria-hidden="true">—</span><div><small>${label}</small><strong>未出战</strong><span>空位</span></div></li>`;
      const stamina = member.pet.stamina ?? 100;
      const staminaState = stamina >= 80 ? '生效' : stamina >= 60 ? '天赋失效 · 属性减半' : stamina >= 40 ? '属性减半' : '属性无效';
      const staminaClass = stamina >= 80 ? 'is-active' : 'is-tired';
      return `<li class="battle-companion ${staminaClass}" data-companion-slot="${member.slot}" title="${esc(member.config.traitName)}：${esc(member.config.traitDesc)}"><span class="battle-companion-face">${renderPetPortrait(member.config)}</span><div><small>${label} · Lv.${esc(member.pet.level)}</small><strong>${esc(member.config.name)}</strong><span>体力 ${esc(stamina)} · ${staminaState}</span><span class="battle-stamina-track" role="meter" aria-label="${label}体力" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stamina}"><i style="width:${Math.max(0, Math.min(100, stamina))}%"></i></span></div></li>`;
    }).join('');
    const mercSlot = `<li class="battle-companion ${merc ? 'is-active' : 'is-empty'}" data-companion-slot="merc" ${merc ? `title="${esc(merc.aura)}：${esc(merc.auraDesc)}"` : ''}><span class="battle-companion-face">${merc ? renderGameIcon(merc.avatar, {size:'w-full h-full'}) : '—'}</span><div><small>佣兵</small><strong>${merc ? esc(merc.name.split('·').pop()) : '未雇佣'}</strong><span>${merc ? esc(merc.aura) : '空位'}</span></div></li>`;
    const playerStatsView = this.currentCombat.initialStats.player;
    const enemyStatsView = this.currentCombat.initialStats.enemy;
    const ratio = (value, max) => max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
    const statRow = (label, valueHTML) => `<div><dt>${label}</dt>${valueHTML}</div>`;
    const statNum = value => `<dd>${Math.floor(value || 0).toLocaleString()}</dd>`;
    const statPct = value => `<dd>${Math.round(value || 0)}%</dd>`;
    const stats = (data, resistNote = '') => `<dl class="battle-stats" aria-label="开场属性">${statRow('攻击', statNum(data.atk))}${statRow('防御', statNum(data.def))}${statRow('命中', statNum(data.hit))}${statRow('闪避', statPct(data.dodge))}${statRow('暴击', statPct(data.crit))}${statRow('速度', statNum(data.speed))}${statRow('常驻减伤', statPct(data.dmgResist))}</dl><p class="battle-stat-note">开场属性 · 命中与对手闪避共同判定${resistNote ? ' · ' + resistNote : ''} · 反击 ${Math.round(data.counter || 0)}%</p>`;
    const vitals = (data, side, showMana = true) => `<div class="battle-health"><div class="battle-vital"><span>生命</span><strong id="b-${side}-hp-num">${Math.floor(data.hp || 0).toLocaleString()}</strong> / ${Math.floor(data.maxHp || 0).toLocaleString()}<div class="battle-health-track"><div id="b-${side}-hp-bar" style="width:${ratio(data.hp, data.maxHp)}%"></div></div></div>${showMana ? `<div class="battle-vital"><span>魔力</span><strong id="b-${side}-mp-num">${Math.floor(data.mp ?? 0).toLocaleString()}</strong> / ${Math.floor(data.maxMp ?? data.mp ?? 0).toLocaleString()}<div class="battle-mana-track"><div id="b-${side}-mp-bar" style="width:${ratio(data.mp, data.maxMp)}%"></div></div></div>` : ''}</div>`;
    const cadence = side => `<p class="battle-cadence">出手间隔 <strong id="b-${side}-interval">${this.currentCombat.initialIntervals[side].toFixed(2)}</strong> 秒<span>第 <b id="b-${side}-actions">0</b> 次行动</span></p>`;
    const equipment = equipped => ITEM_SLOTS.map(slot => {
      const item = equipped?.[slot.id];
      return `<li><span>${esc(slot.name)}</span><div>${item ? `${renderGameIcon(item.icon || slot.id, {size:'w-5 h-5'})}<span>${esc(item.name)}${item.stars ? ` +${item.stars}` : ''}${item.durability <= 0 ? '（已破损）' : ''}</span>${item.gems?.length ? `<small>镶嵌：${item.gems.map(g => esc(g.name || g.id)).join('、')}</small>` : ''}` : '<span class="battle-muted">未装备</span>'}</div></li>`;
    }).join('');
    const skills = getClassSkills(playerData.classId, playerStats.skillLevelBonus || 0, playerData).filter(skill => (skill.level || 1) <= playerData.level);
    const learned = pet?.skills?.map(id => Object.values(PET_SKILL_BOOKS).find(book => book.id === id || book.skillId === id)?.name || id) || [];
    const enemySkills = enemyData.abilities ?? enemyStats.abilities ?? [];
    // 敌方魔力条只对具备施法能力（有 abilities 或 maxMp>100）的敌人显示，普通怪隐藏。
    const showEnemyMana = enemySkills.length > 0 || (enemyStatsView.maxMp ?? 0) > 100;
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
    this.overlay.innerHTML = `
      <div id="battle-card-container" class="battle-scene">
        <header class="battle-heading"><h1>战斗现场</h1><p id="battle-live-status" role="status" aria-live="polite">双方已就位，战斗开始</p><span>结算后返回原场景</span></header>
        <div class="battle-layout">
          <aside class="battle-roster battle-ally" aria-label="我方阵容">
            <h2>我方阵容</h2>
            <div class="battle-portrait-wrap"><div class="battle-portrait class-portrait" role="img" aria-label="${esc(cls.name)}立绘"></div><div id="float-player" class="battle-portrait-damage" aria-hidden="true"></div></div>
            <h3>${esc(playerData.name)}</h3><p class="battle-muted">${esc(cls.name)} · Lv.${playerData.level}</p>
            ${vitals(playerStatsView, 'player')}
            ${stats(playerStatsView, '常驻减伤不含佣兵，上限 50%')}
            ${cadence('player')}
            <details open class="battle-skill-details"><summary>当前职业技能</summary>
              <div class="battle-skill-row"><span class="battle-skill-label">主动技能</span><div class="battle-skill-chips">${skills.filter(skill => skill.category === 'attack').map(skill => `<span class="battle-skill-chip">${esc(skill.name)} · ${skill.rank}级<small> ${skill.mpCost || 0}魔</small></span>`).join('') || '<span class="battle-muted">无</span>'}</div></div>
              <div class="battle-skill-row"><span class="battle-skill-label">光环技能</span><div class="battle-skill-chips">${skills.filter(skill => skill.category === 'aura').map(skill => `<span class="battle-skill-chip is-aura">${esc(skill.name)}${playerStats.skillLevelBonus ? ` · +${playerStats.skillLevelBonus}级` : ''}</span>`).join('') || '<span class="battle-muted">无</span>'}</div></div>
              <div class="battle-skill-row"><span class="battle-skill-label">被动</span><div class="battle-skill-chips">${skills.filter(skill => skill.category !== 'attack' && skill.category !== 'aura').map(skill => `<span class="battle-skill-chip">${esc(skill.name)} · ${skill.rank}级</span>`).join('') || '<span class="battle-muted">无</span>'}</div></div>
            </details>
            <details><summary>随行伙伴与佣兵详情</summary>${party.map(member => member.pet ? `<p class="battle-muted">${member.slot === 0 ? '主宠' : `副宠${member.slot}`} · ${esc(member.config.name)}：${esc(member.config.traitName)}（${member.active ? '生效' : '体力不足·停用'}）</p>` : '').join('')}${merc ? `<p>佣兵 · ${esc(merc.name)}：${esc(merc.aura)} — ${esc(merc.auraDesc)}</p>` : '<p class="battle-muted">未雇佣随行佣兵</p>'}${learned.length ? `<p>神兽魔典：${learned.map(esc).join('、')}</p>` : ''}</details>
            <details><summary><span>穿戴装备 · 十二个部位</span><small> 已穿戴 ${ITEM_SLOTS.filter(slot => playerData.equipped?.[slot.id]).length} / 12</small></summary><ul class="battle-equipment">${equipment(playerData.equipped)}</ul></details>
          </aside>
          <section class="battle-report" aria-label="战斗战报">
            <div class="battle-stage ${region ? 'battle-stage-wild' : ''}" style="${region ? getWildRegionStyle(region.id) : ''}" role="group" aria-label="出战阵容">
              <div class="battle-stage-caption"><span>${esc(region?.name || '战斗现场')} · 出战阵容</span><span>主宠 / 副宠 / 佣兵</span></div>
              <ol class="battle-companions">${companionSlots}${mercSlot}</ol>
            </div>
            <p class="battle-clock-hint">双方按各自速度行动 · 回复与持续伤害每10秒结算</p>
            <div id="combat-log-stream" class="battle-log" tabindex="0" aria-label="按时间排列的战斗记录"></div>
            <div id="battle-result-summary" class="battle-result hidden">
              <h3>胜负统计 <span>伤害对比（各以其最大生命计）</span></h3>
              <div class="battle-result-bar ally"><span>我方造成</span><div class="track"><i id="b-result-to-enemy" style="width:0%"></i></div><b id="b-result-to-enemy-num">0%</b></div>
              <div class="battle-result-bar foe"><span>对方造成</span><div class="track"><i id="b-result-to-player" style="width:0%"></i></div><b id="b-result-to-player-num">0%</b></div>
              <p id="battle-result-loot" class="battle-result-loot">战利品：结算后于战报入账</p>
            </div>
            <div class="battle-controls"><div class="battle-speed"><button id="btn-spd-1" class="mota-btn-dark" aria-pressed="${this.playbackSpeed === 400}">1x 原速</button><button id="btn-spd-3" class="mota-btn-dark" aria-pressed="${this.playbackSpeed === 120}">3x 极速</button><button id="btn-skip-battle" class="mota-btn-gold">跳过演播</button></div><div id="battle-finish-actions" class="hidden"><button id="btn-confirm-battle" class="mota-btn-gold">确认并结算奖励</button></div></div>
          </section>
          <aside class="battle-roster battle-enemy" aria-label="对手阵容">
            <h2>对手阵容</h2><div class="battle-portrait-wrap">${enemyPortrait}<div id="float-enemy" class="battle-portrait-damage" aria-hidden="true"></div></div>
            <h3>${esc(enemyData.name)}</h3><p class="battle-muted">${esc(enemyData.title || (enemyData.isPvp ? '竞技场对手' : '当前场景守卫'))}${enemyData.level ? ' · Lv.' + esc(enemyData.level) : ''}</p>
            ${vitals(enemyStatsView, 'enemy', showEnemyMana)}
            ${stats(enemyStatsView)}
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
    if (Number.isFinite(step.playerHp)) this.lastPlayerHp = step.playerHp;
    if (Number.isFinite(step.enemyHp)) this.lastEnemyHp = step.enemyHp;
    const stream = document.getElementById('combat-log-stream');
    if (!stream) return;

    // P4：开场说明（国家天命 / 神兽随行 / 佣兵援护等 turn=0 系统条目）折叠成一行，可展开。
    let logContainer = stream;
    if (step.turn === 0) {
      let opening = document.getElementById('battle-opening-details');
      if (!opening) {
        opening = document.createElement('details');
        opening.id = 'battle-opening-details';
        opening.className = 'battle-opening-guide rounded p-1.5 mb-1 bg-slate-900/30 border border-slate-700/40 text-xs';
        const summary = document.createElement('summary');
        summary.className = 'cursor-pointer text-slate-400 select-none';
        summary.textContent = '开场说明（国家天命 / 神兽随行 / 佣兵援护，点击展开）';
        opening.appendChild(summary);
        stream.appendChild(opening);
      }
      logContainer = opening;
    }

    // P4：战报分级着色——伤害红、技能蓝、治疗绿、系统说明灰；伤害数字加粗。
    const isDamage = step.type === 'damage' || step.type === 'hit' || step.type === 'crit' || step.type === 'poison';
    const gradeClass = step.type === 'crit' ? 'log-crit text-red-300 font-bold'
      : isDamage ? 'text-red-300'
      : step.type === 'heal' ? 'log-heal text-emerald-300'
      : step.type === 'special' || step.type === 'skill' ? 'log-skill text-sky-300'
      : step.type === 'counter' ? 'log-counter text-amber-300'
      : step.type === 'phoenix' || step.type === 'pixie' || step.type === 'pet_skill' ? 'log-pet text-fuchsia-300'
      : 'bg-slate-900/40 text-slate-400';

    const logDiv = document.createElement('div');
    logDiv.className = `p-2 rounded combat-log-line text-xs ${gradeClass}`;
    if (isDamage) {
      const escaped = String(step.message ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
      logDiv.innerHTML = escaped.replace(/(\d[\d,]*)/g, '<strong>$1</strong>');
    } else {
      logDiv.textContent = step.message;
    }
    logContainer.appendChild(logDiv);
    // 悬停才浮出「这是什么伤害/效果」的说明（不常驻颜色图例）
    tooltip.attachText(logDiv, () => {
      const info = battleGradeInfo(step);
      return `<div style="line-height:1.35"><b style="font-size:12px;color:#f2c96a">${info.label}</b><div style="color:#cbd5e1;font-size:10px;margin-top:2px">${info.desc}</div></div>`;
    });
    stream.scrollTop = stream.scrollHeight;

    // 更新血条
    const maxPlayerHp = this.playerMaxHp;
    const playerHpPercent = Math.max(0, Math.min(100, (step.playerHp / maxPlayerHp) * 100));
    const pBar = document.getElementById('b-player-hp-bar');
    const pNum = document.getElementById('b-player-hp-num');
    if (pBar) pBar.style.width = `${playerHpPercent}%`;
    if (pNum) pNum.innerText = Math.floor(step.playerHp).toLocaleString();
    for (const side of ['player', 'enemy']) {
      const mana = document.getElementById(`b-${side}-mp-num`), value = step[side + 'Mp'];
      if (mana && Number.isFinite(value)) mana.textContent = Math.floor(value).toLocaleString();
      const mbar = document.getElementById(`b-${side}-mp-bar`);
      const maxMp = side === 'player' ? this.playerMaxMp : this.enemyMaxMp;
      if (mbar && Number.isFinite(value)) mbar.style.width = `${maxMp > 0 ? Math.max(0, Math.min(100, (value / maxMp) * 100)) : 0}%`;
    }

    const enemyMaxHp = this.enemyMaxHp || 1000;
    const enemyHpPercent = Math.max(0, Math.min(100, (step.enemyHp / enemyMaxHp) * 100));
    const eBar = document.getElementById('b-enemy-hp-bar');
    const eNum = document.getElementById('b-enemy-hp-num');
    if (eBar) eBar.style.width = `${enemyHpPercent}%`;
    if (eNum) eNum.innerText = Math.floor(step.enemyHp).toLocaleString();

    this.appendNarrative(enemyHpPercent, playerHpPercent, stream);

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

  // 敌我状态旁白：按生命阈值插入叙事句，增强临场代入（纯展示，不改战斗）
  appendNarrative(enemyPct, playerPct, stream) {
    if (!stream) return;
    if (!this._narr) this._narr = {};
    if (!Number.isFinite(this._prevEnemyPct)) this._prevEnemyPct = 100;
    if (!Number.isFinite(this._prevPlayerPct)) this._prevPlayerPct = 100;
    const n = this._narr;
    const add = (text) => {
      const div = document.createElement('div');
      div.className = 'combat-log-line log-narr';
      div.textContent = text;
      tooltip.attachText(div, () => `<div style="line-height:1.35"><b style="font-size:12px;color:#f2c96a">战斗旁白</b><div style="color:#cbd5e1;font-size:10px;margin-top:2px">敌我态势的即时叙述。</div></div>`);
      stream.appendChild(div);
    };
    const prevE = this._prevEnemyPct, prevP = this._prevPlayerPct;
    if (!n.e60 && prevE > 60 && enemyPct <= 60 && enemyPct > 30) { n.e60 = true; add('对手的呼吸急促起来，气力已不如初时。'); }
    if (!n.e30 && prevE > 30 && enemyPct <= 30 && enemyPct > 0) { n.e30 = true; add('对手受了相当重的伤，只怕有生命危险。'); }
    if (!n.e0 && prevE > 0 && enemyPct <= 0) { n.e0 = true; add('对手已无再战之力，颓然倒下。'); }
    if (!n.p50 && prevP > 50 && playerPct <= 50 && playerPct > 20) { n.p50 = true; add('您已受了些伤，须得沉着应对。'); }
    if (!n.p20 && prevP > 20 && playerPct <= 20 && playerPct > 0) { n.p20 = true; add('您伤得不轻，处境愈发凶险。'); }
    if (!n.p0 && prevP > 0 && playerPct <= 0) { n.p0 = true; add('您力竭倒下……'); }
    this._prevEnemyPct = enemyPct;
    this._prevPlayerPct = playerPct;
    stream.scrollTop = stream.scrollHeight;
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

    // 收束旁白（增强临场感，不改结算）
    if (!this._endNarrated) {
      this._endNarrated = true;
      const logStream = document.getElementById('combat-log-stream');
      if (logStream) {
        const d = document.createElement('div');
        d.className = 'combat-log-line log-narr';
        d.textContent = isWin ? '您技高一筹，获得了胜利。' : '此战未能取胜，且整顿旗鼓再来。';
        tooltip.attachText(d, () => `<div style="line-height:1.35"><b style="font-size:12px;color:#f2c96a">战斗旁白</b><div style="color:#cbd5e1;font-size:10px;margin-top:2px">本场战斗的结局。</div></div>`);
        logStream.appendChild(d);
        logStream.scrollTop = logStream.scrollHeight;
      }
    }

    // 胜负统计：由开场最大生命与实际剩余生命计算（不新增战斗逻辑）。
    const pMax = this.playerMaxHp || this.currentCombat.initialStats?.player?.maxHp || 1;
    const eMax = this.enemyMaxHp || this.currentCombat.initialStats?.enemy?.maxHp || 1;
    const pFinal = Number.isFinite(this.lastPlayerHp) ? this.lastPlayerHp : (this.currentCombat.remainingHp ?? pMax);
    const eFinal = Number.isFinite(this.lastEnemyHp) ? this.lastEnemyHp : (isWin ? 0 : eMax);
    const toEnemy = Math.max(0, Math.min(100, Math.round((eMax - eFinal) / eMax * 100)));
    const toPlayer = Math.max(0, Math.min(100, Math.round((pMax - pFinal) / pMax * 100)));
    const summary = document.getElementById('battle-result-summary');
    if (summary) {
      summary.classList.remove('hidden');
      const barE = document.getElementById('b-result-to-enemy'); if (barE) barE.style.width = `${toEnemy}%`;
      const numE = document.getElementById('b-result-to-enemy-num'); if (numE) numE.textContent = `${toEnemy}%`;
      const barP = document.getElementById('b-result-to-player'); if (barP) barP.style.width = `${toPlayer}%`;
      const numP = document.getElementById('b-result-to-player-num'); if (numP) numP.textContent = `${toPlayer}%`;
      const lootEl = document.getElementById('battle-result-loot');
      if (lootEl) lootEl.textContent = isWin ? '战利品：结算后于战报入账（见右下浮层）' : '战利品：战败无收益';
    }

    const actionDiv = document.getElementById('battle-finish-actions');
    const btn = document.getElementById('btn-confirm-battle');
    if (actionDiv && btn) {
      actionDiv.classList.remove('hidden');
      btn.innerText = isWin ? '战斗大胜！领取奖励' : '战败……返回备战';
      btn.className = isWin ? 'mota-btn-gold px-6 py-1.5 rounded-lg text-xs font-bold' : 'mota-btn-dark px-6 py-1.5 rounded-lg text-xs font-bold text-red-400';
    }
  }

  // P5：战利品入战报——记录战斗前后行囊/货币差额（不改变任何数值或结算逻辑）。
  snapshotLoot() {
    const data = gameState.data || {};
    const bag = {};
    (data.bag || []).forEach(item => {
      if (!item) return;
      const key = item.slot ? `u:${item.uid || item.id}` : `s:${item.id}`;
      bag[key] = { name: item.name, count: item.count || 1 };
    });
    return { bag, gold: data.gold || 0, crystal: data.crystal || 0, prestige: data.prestige || 0 };
  }

  computeLootDelta(snapshot) {
    if (!snapshot) return null;
    const current = this.snapshotLoot();
    const gained = {};
    Object.entries(current.bag).forEach(([key, item]) => {
      const prev = snapshot.bag[key];
      const delta = (item.count || 1) - (prev ? (prev.count || 1) : 0);
      if (delta > 0) gained[item.name || '战利品'] = (gained[item.name || '战利品'] || 0) + delta;
    });
    const items = Object.entries(gained).map(([name, count]) => ({ name, count }));
    const gold = current.gold - snapshot.gold;
    const crystal = current.crystal - snapshot.crystal;
    const prestige = current.prestige - snapshot.prestige;
    if (!items.length && gold <= 0 && crystal <= 0 && prestige <= 0) return null;
    return { items, gold, crystal, prestige };
  }

  formatLootText(loot) {
    const parts = [];
    if (loot.gold > 0) parts.push(`金币 +${loot.gold}`);
    if (loot.crystal > 0) parts.push(`魔晶 +${loot.crystal}`);
    if (loot.prestige > 0) parts.push(`声望 +${loot.prestige}`);
    if (loot.items.length) parts.push(loot.items.map(item => `【${item.name}】×${item.count}`).join('、'));
    return parts.join(' · ');
  }

  showLootToast(text) {
    if (!document.body) return;
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-50 max-w-xs px-4 py-2.5 rounded-xl bg-black/85 border border-amber-500/70 text-amber-100 text-xs shadow-2xl pointer-events-none';
    toast.textContent = `【战利品入账】${text}`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove?.(); }, 4200);
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
        const lootSnapshot = this.lootSnapshot;
        this.onFinishCallback = null;
        this.close();
        // P5：按原流程结算后，读取本次收益差额，把战利品写入战报日志并浮层提示。
        try {
          if (onFinish) onFinish(isWin);
        } finally {
          gameState.completeBattle(isWin);
        }
        if (isWin) {
          const loot = this.computeLootDelta(lootSnapshot);
          const lootText = loot ? this.formatLootText(loot) : '';
          if (lootText) {
            gameState.addSystemLog(`【战利品】${lootText}`, 'loot');
            this.showLootToast(lootText);
          }
          gameState.addSystemLog(`【战报】大获全胜！成功击溃「${enemyName}」！`, 'battle');
        } else {
          gameState.addSystemLog(`【战报】与「${enemyName}」的对决受挫。${defeatAdvice}`, 'battle');
        }
      });
    }
  }
}
