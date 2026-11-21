// 远古神兽系统视图：经典宠物目录与详情布局
// 涵盖：22 种神兽图鉴、真实特性（连击、祝福、偷袭、复活、假死等）、体力喂食机制、进化石与天命石进阶、打书
import { gameState } from '../core/state.js';
import { markFeatureEntrances } from './featureAccess.js';
import { getFeatureAccess } from '../core/journey.js';
import { PET_CONFIGS, PET_TIERS } from '../config/pets.js';
import { PET_SKILL_BOOKS } from '../config/petSkills.js';
import { SPECIAL_ITEMS } from '../config/items.js';
import { renderGameIcon } from './iconHelper.js';
import { sound } from '../core/sound.js';
import { gameModal } from './modal.js';
import { getPetParty } from '../core/petParty.js';
import { getPlayerSynergyStrike } from '../core/combat.js';
import { SYNERGY_FORMATIONS, SYNERGY_STRIKES } from '../config/dungeons.js';
import { MERCENARIES } from '../config/estate.js';

import { renderPetPortrait } from './petPortrait.js';

export class PetView {
  constructor(containerId, onSwitchTab) {
    this.container = document.getElementById(containerId);
    this.onSwitchTab = onSwitchTab;
    this.selectedPetId = null;
    this.currentSubTab = 'overview'; // 'overview' | 'wash' | 'skills'
    this.detailSub = 'main'; // 'main' | 'more'（详情内折叠页）
    this.rosterScroll = {};
  }

  navigate({ section, petId } = {}) {
    if (section !== undefined) this.currentSubTab = section;
    if (petId !== undefined) this.selectedPetId = petId;
  }

  render() {
    if (!['main', 'more'].includes(this.detailSub)) this.detailSub = 'main';
    const previousRoster = this.container.querySelector('.pet-classic-slots');
    if (previousRoster) this.rosterScroll[previousRoster.dataset.rosterKind] = previousRoster.scrollTop;
    const previousDetail = this.container.querySelector('#pet-panel-body');
    const guideOpen = this.container.querySelector('.pet-synergy-summary')?.open || false;
    const focused = this.container.contains(document.activeElement) ? document.activeElement : null;
    const focusId = focused?.id;
    const focusPetId = focused?.dataset.petId;
    const data = gameState.data;
    const ownedPets = data.pets;
    const isCompendium = this.currentSubTab === 'compendium';
    const contractChoices = gameState.getContractChoices();
    if (!isCompendium && !ownedPets.some(p => p.id === this.selectedPetId)) {
      this.selectedPetId = data.activePetId || ownedPets[0]?.id || null;
    }
    if (isCompendium && !PET_CONFIGS[this.selectedPetId]) this.selectedPetId = Object.keys(PET_CONFIGS)[0];
    const selectedConf = PET_CONFIGS[this.selectedPetId];
    const selectedOwned = ownedPets.find(p => p.id === this.selectedPetId);
    const entries = isCompendium ? Object.values(PET_CONFIGS) : ownedPets.map(p => PET_CONFIGS[p.id]).filter(Boolean);
    const synergy = getPlayerSynergyStrike(data);
    const party = getPetParty(data);
    const mainPet = party[0];
    const mercenary = MERCENARIES.find(merc => merc.id === data.estate?.hiredMercId);
    const detailScroll = previousDetail?.dataset.selectedPet === this.selectedPetId && previousDetail?.dataset.subtab === this.currentSubTab ? previousDetail.scrollTop : 0;
    const partyHint = !mainPet.pet ? '先选择一只主宠，让伙伴加入战斗。'
      : !mainPet.active ? '主宠体力不足：选择它并喂养，体力恢复后重新生效。'
      : party.some(member => !member.pet) ? '主宠已就位。空副位可放入伙伴，获得额外天赋。'
      : '阵容已就位。选择伙伴可喂养、培养或调整位置。';

    this.container.innerHTML = `
      <div class="pet-classic">
        <nav class="pet-classic-tabs" aria-label="宠物功能">
          ${[['overview', '宠物资料'], ['wash', '重铸进阶'], ['skills', '神技魔典'], ['compendium', '神兽图鉴']].map(([id, label]) => `
            <button id="pet-subtab-${id}" class="${this.currentSubTab === id ? 'is-current' : ''}" aria-pressed="${this.currentSubTab === id}">${label}</button>`).join('')}
          <button id="btn-hatch-egg" class="pet-hatch-button">孵化神兽蛋</button>
        </nav>
        <div class="pet-party-strip" aria-label="主副宠阵容">
          ${party.map(({ slot, pet, config, active }) => `<div data-drop-slot="${slot}"><strong>${slot === 0 ? '主宠' : '副宠' + slot}</strong>${pet ? `<span>${config.name}<small>${active ? slot === 0 ? '参战 · 属性与天赋' : '协同 · 提供天赋' : '体力不足 · 需喂养'}</small></span><button data-clear-party="${slot}" class="mota-btn-dark" aria-label="撤下${slot === 0 ? '主宠' : '副宠' + slot}">撤下</button>` : `<span class="pet-party-vacant">空位</span><button data-pick-party="${slot}" class="mota-btn-dark">${slot === 0 ? '选择主宠' : '选择副宠'}</button>`}</div>`).join('')}
        </div>
        <p class="pet-party-next">${partyHint}</p>
        <details class="pet-synergy-summary" ${guideOpen ? 'open' : ''}>
          <summary id="current-synergy"><span>合击：${synergy ? synergy.name : '尚未启用'}</span><span class="pet-guide-toggle">搭配指引</span></summary>
          <div class="pet-synergy-guide">
            <p>${synergy ? synergy.desc : '体力充足的主宠或已招募的佣兵，可启用职业合击。'}每战一次，第 3 次个人行动触发；敌人有护盾时提前到第 2 次。</p>
            <div class="pet-guide-mercenary"><span>随行佣兵：${mercenary?.name || '尚未招募'}</span><button id="btn-party-mercenary" class="mota-btn-dark">查看佣兵</button></div>
            <h4>按战斗需要选择主宠与佣兵</h4>
            ${SYNERGY_FORMATIONS.map(entry => {
              const strike = SYNERGY_STRIKES[entry.strikeId];
              const matched = data.estate?.hiredMercId === entry.mercId && mainPet.active && entry.petIds.includes(mainPet.pet?.id);
              return `<div class="pet-formation-option" data-matched="${matched}"><strong>${strike.shatterShield ? '破盾' : strike.healPct ? '回复' : strike.stun ? '控制' : '减防'}</strong><div><span>${MERCENARIES.find(merc => merc.id === entry.mercId).name}</span><div>${entry.petIds.map(id => `<button data-guide-pet="${id}" aria-label="查看${PET_CONFIGS[id].name}搭配">${PET_CONFIGS[id].name}</button>`).join('')}</div></div><small>${matched ? '已生效' : '选择主宠查看'}</small></div>`;
            }).join('')}
          </div>
        </details>
        <div class="pet-classic-workspace">
          <aside class="pet-classic-roster" aria-label="${isCompendium ? '神兽图鉴目录' : '已缔约宠物'}">
            <h3 class="pet-classic-caption">${isCompendium ? '神兽图鉴' : '宠物列表'}<span>${isCompendium ? `${ownedPets.length} / 22` : `${ownedPets.length} 只`}</span></h3>
            <div class="pet-classic-slots custom-scrollbar" data-roster-kind="${isCompendium ? 'compendium' : 'owned'}">
              ${entries.map(conf => {
                const owned = ownedPets.find(p => p.id === conf.id);
                const isSelected = this.selectedPetId === conf.id;
                const partySlot = getPetParty(data).find(member => member.pet?.id === conf.id)?.slot;
                return `<button type="button" data-pet-id="${conf.id}" draggable="true" class="pet-select-card ${isSelected ? 'is-selected' : ''}" aria-pressed="${isSelected}">
                  <span class="pet-slot-icon">${this.renderPortrait(conf)}</span>
                  <span class="pet-slot-copy"><b>${conf.name}</b><small>${owned ? `Lv.${owned.level} · ${partySlot === 0 ? '主宠出战' : partySlot ? '副宠' + partySlot : '待命'}` : `Lv.${conf.minLevel} 缔约`}</small></span>
                </button>`;
              }).join('')}
              ${!isCompendium && entries.length < 4 ? '<div class="pet-empty-slot" aria-hidden="true"><span></span>待缔约</div>' : ''}
            </div>
            <div class="pet-roster-note">${isCompendium ? '选择神兽查看专属特性与初始资质。' : '主宠提供属性、天赋与魔典；两只副宠提供天赋。'}</div>
          </aside>
          <section id="pet-panel-body" class="pet-classic-detail custom-scrollbar" data-selected-pet="${this.selectedPetId || ''}" data-subtab="${this.currentSubTab}">
            ${this.renderSubTab(selectedOwned, selectedConf)}
          </section>
        </div>
        ${contractChoices.length ? `<div class="pet-contract-strip">
          <label for="select-companion-contract">赛拉的契约仪式</label>
          <select id="select-companion-contract">${contractChoices.map(choice => `<option value="${choice.id}">${choice.name} · ${choice.trait} · ${choice.gold}金币 / ${choice.crystal}魔晶</option>`).join('')}</select>
          <button id="btn-chosen-contract" class="mota-btn-dark">缔约</button>
          <span>消耗对应品阶契约蛋</span>
        </div>` : ''}
      </div>`;
    this.bindEvents();
    markFeatureEntrances(this.container, { '#btn-hatch-egg': 'pets', '#pet-subtab-wash': 'wash', '#pet-subtab-skills': 'skills' });
    const roster = this.container.querySelector('.pet-classic-slots');
    roster.scrollTop = this.rosterScroll[roster.dataset.rosterKind] || 0;
    this.container.querySelector('#pet-panel-body').scrollTop = detailScroll;
    const nextFocus = focusId ? document.getElementById(focusId)
      : focusPetId ? this.container.querySelector(`.pet-select-card[data-pet-id="${focusPetId}"]`) : null;
    if (nextFocus && this.container.contains(nextFocus)) nextFocus.focus({ preventScroll: true });
  }

  renderSubTab(owned, conf) {
    if (this.currentSubTab === 'compendium') {
      return this.renderCompendium();
    }

    if (!owned || !conf) {
      const access = getFeatureAccess(gameState.data, 'pets');
      return `
        <div class="mota-parchment-panel rounded-xl p-8 text-center text-slate-400 text-xs">
          <h3 class="text-sm font-bold text-amber-200 mb-2">尚未缔约伙伴</h3>
          ${access.available ? '获得契约蛋后，点击右上角「孵化神兽蛋」。孵化后可让伙伴随行。' : `${access.label}。请先完成上方的下一步行动；图鉴可随时查看。`}
        </div>
      `;
    }

    switch (this.currentSubTab) {
      case 'overview': return this.renderOverview(owned, conf);
      case 'wash': return this.renderWash(owned, conf);
      case 'skills': return this.renderSkills(owned, conf);
      case 'compendium': return this.renderCompendium();
      default: return this.renderOverview(owned, conf);
    }
  }

  // 图鉴使用同一目录与资料面板，不改变缔约或养成规则。
  renderCompendium() {
    const conf = PET_CONFIGS[this.selectedPetId] || Object.values(PET_CONFIGS)[0];
    const owned = gameState.data.pets.find(p => p.id === conf.id);
    const tier = PET_TIERS[conf.defaultTier || 'gold'];
    const mainBlock = `
        <div class="pet-detail-identity">
          <div class="pet-detail-portrait">${this.renderPortrait(conf)}</div>
          <div class="pet-detail-summary">
            <h4>${conf.name}</h4>
            <dl class="pet-data-lines"><div><dt>初始品阶</dt><dd>${tier.name}</dd></div><div><dt>缔约等级</dt><dd>Lv.${conf.minLevel}</dd></div><div><dt>专属特性</dt><dd>${conf.traitName}</dd></div><div><dt>契约状态</dt><dd>${owned ? `已缔约 · Lv.${owned.level}` : gameState.data.level >= conf.minLevel ? '达到缔约等级' : `角色达到 ${conf.minLevel} 级后缔约`}</dd></div></dl>
          </div>
        </div>
        <section class="pet-aptitude-block"><h4>初始资质</h4>${this.renderAptitudes(conf.defaultApt, tier.maxApt)}</section>`;
    const moreBlock = `
        <section class="pet-trait-line"><h4>专属特性 · ${conf.traitName}</h4><p>${conf.traitDesc}</p></section>
        <p class="pet-sheet-note">获得契约蛋后可孵化符合等级要求的神兽。实际资质以孵化结果为准。</p>`;
    return `
      <article class="pet-classic-sheet">
        <h3 class="pet-classic-caption">神兽资料<span>${owned ? '已缔约' : '尚未缔约'}</span></h3>
        <div class="pet-detail-subtabs" role="group" aria-label="宠物详情切换">
          <button data-pet-sub="main" aria-pressed="${this.detailSub !== 'more'}" class="${this.detailSub !== 'more' ? 'mota-btn-gold' : 'mota-btn-dark'}">资料 / 资质</button>
          <button data-pet-sub="more" aria-pressed="${this.detailSub === 'more'}" class="${this.detailSub === 'more' ? 'mota-btn-gold' : 'mota-btn-dark'}">特性 / 说明</button>
        </div>
        ${this.detailSub === 'more' ? moreBlock : mainBlock}
      </article>`;
  }

  renderPortrait(conf) {
    return renderPetPortrait(conf);
  }

  renderAptitudes(apt, maxApt) {
    return `<dl class="pet-aptitude-table">${[['str', '力量'], ['int', '智力'], ['dex', '敏捷'], ['con', '体质']].map(([key, name]) => `<div><dt>${name}资质</dt><dd><strong>${apt[key]}</strong><span> / ${maxApt}</span></dd></div>`).join('')}</dl>`;
  }

  // 契约出战与喂养；资料直接使用当前宠物状态。
  renderOverview(owned, conf) {
    const data = gameState.data;
    const isActive = data.activePetId === owned.id;
    const stamina = owned.stamina ?? 100;
    const isExhausted = stamina < 60;
    const staminaState = stamina >= 80 ? '良好 · 特性与天赋生效'
      : stamina >= 60 ? '天赋失效 · 属性减半'
      : stamina >= 40 ? '属性减半 · 特性失效'
      : '属性无效';
    const foodCount = data.bag.find(i => i.id === 'pet_food')?.count || 0;
    const trainingQuote = gameState.getCompanionTrainingQuote(owned.id);
    const tier = PET_TIERS[owned.tier] || PET_TIERS.gold;
    const nextExp = gameState.getNextLevelExp(owned.level);
    const exp = owned.exp || 0;
    const mainBlock = `
        <div class="pet-detail-identity">
          <div class="pet-detail-portrait">${this.renderPortrait(conf)}<span>${tier.name}</span></div>
          <div class="pet-detail-summary">
            <h4>${conf.name}<small>Lv.${owned.level}</small></h4>
            <dl class="pet-data-lines"><div><dt>专属特性</dt><dd>${conf.traitName}</dd></div><div><dt>当前状态</dt><dd class="${isExhausted ? 'pet-exhausted' : ''}">${staminaState}</dd></div></dl>
            <div class="pet-meter-line"><span>体力</span><div class="pet-meter" role="progressbar" aria-label="宠物体力" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stamina}"><i class="pet-stamina-fill ${isExhausted ? 'is-exhausted' : ''}" style="width:${Math.min(100, Math.max(0, stamina))}%"></i><b>${stamina} / 100</b></div></div>
            <div class="pet-meter-line"><span>经验</span><div class="pet-meter" role="progressbar" aria-label="宠物经验" aria-valuemin="0" aria-valuemax="${nextExp}" aria-valuenow="${Math.min(exp, nextExp)}"><i class="pet-exp-fill" style="width:${Math.min(100, exp / nextExp * 100)}%"></i><b>${owned.level >= 100 ? '等级已满' : `${exp} / ${nextExp}`}</b></div></div>
          </div>
        </div>
        <section class="pet-aptitude-block"><h4>宠物资质<span>重铸可重新生成资质</span></h4>${this.renderAptitudes(owned.apt, tier.maxApt)}</section>
        <div class="pet-overview-actions">
          <div class="pet-action-row"><button id="btn-toggle-active-pet" class="mota-btn-gold">${isActive ? '当前随行出战中' : '设为随行出战主宠'}</button><button id="btn-feed-pet" class="mota-btn-dark" ${foodCount < 1 || stamina >= 100 ? 'disabled' : ''}>${stamina >= 100 ? '体力已满' : foodCount < 1 ? '缺少兽肉' : '喂食 (+35)'}</button><span>兽肉 ${foodCount}</span></div>
          <div class="pet-action-row">${[1, 2].map(slot => `<button data-assign-party="${slot}" class="mota-btn-dark" ${data.supportPetIds?.[slot - 1] === owned.id ? 'disabled' : ''}>设为副宠${slot}</button>`).join('')}</div>
        </div>`;
    const moreBlock = `
        ${trainingQuote.success ? `<section class="pet-training-line"><div><strong>营地训练</strong> Lv.${owned.level} → ${trainingQuote.targetLevel}<p>${trainingQuote.gold}金币 · ${trainingQuote.crystal}魔晶 · 兽肉 1；保留特性与资质。</p></div><button id="btn-train-companion" class="mota-btn-dark">训练这位伙伴</button></section>` : ''}
        <section class="pet-trait-line"><h4>专属特性 · ${conf.traitName}</h4><p>${conf.traitDesc}</p></section>
        <p class="pet-sheet-note">体力影响属性与天赋：80 以上全额生效；60–79 与 40–59 属性减半、天赋失效；低于 40 属性无效。体力每日衰减 10 点、战败 -5，可喂食兽肉/口粮/饼干，或到王都皇家兽栏用金币恢复（最多到 60）。副宠获得一半随行经验，不提供属性或魔典。已有占位的伙伴会与目标位置交换。契约蛋可在王都声望商行以 100 声望兑换。</p>`;
    return `
      <article class="pet-classic-sheet">
        <h3 class="pet-classic-caption">宠物资料<span>${getPetParty(data).find(member => member.pet?.id === owned.id)?.slot === 0 ? '主宠出战' : getPetParty(data).some(member => member.slot && member.pet?.id === owned.id) ? '副宠随行' : '待命'}</span></h3>
        <div class="pet-detail-subtabs" role="group" aria-label="宠物详情切换">
          <button data-pet-sub="main" aria-pressed="${this.detailSub !== 'more'}" class="${this.detailSub !== 'more' ? 'mota-btn-gold' : 'mota-btn-dark'}">资料 / 资质</button>
          <button data-pet-sub="more" aria-pressed="${this.detailSub === 'more'}" class="${this.detailSub === 'more' ? 'mota-btn-gold' : 'mota-btn-dark'}">培养 / 特性</button>
        </div>
        ${this.detailSub === 'more' ? moreBlock : mainBlock}
      </article>`;
  }

  // 2. 潜能重铸与阶位进化
  renderWash(owned, conf) {
    const data = gameState.data;
    const washPills = data.bag.find(i => i.id === 'pill_reborn')?.count || 0;
    const evoStones = data.bag.find(i => i.id === 'evolution_stone')?.count || 0;
    const destStones = data.bag.find(i => i.id === 'destiny_stone')?.count || 0;

    return `
      <div class="h-full grid grid-cols-1 md:grid-cols-2 gap-3">
        <!-- 潜能重铸 -->
        <div class="mota-parchment-panel rounded-xl p-3.5 sm:p-4 border-2 border-[#caa048] flex flex-col justify-between">
          <div class="space-y-2">
            <div class="flex items-center gap-2 border-b border-slate-700/80 pb-2">
              <h4 class="font-bold text-sm text-amber-300">星界洗礼 · 重铸四维天资</h4>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">
              消耗1份重铸灵药重新生成四维资质，数值可能升高或降低。先比较现有资质，再决定是否重铸。
            </p>
            <div class="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-black/40 border border-slate-800/80 text-xs">
              <div>力量资质: <b class="text-red-400 font-mono text-sm">${owned.apt.str}</b></div>
              <div>智力资质: <b class="text-blue-400 font-mono text-sm">${owned.apt.int}</b></div>
              <div>敏捷资质: <b class="text-green-400 font-mono text-sm">${owned.apt.dex}</b></div>
              <div>体质资质: <b class="text-amber-400 font-mono text-sm">${owned.apt.con}</b></div>
            </div>
          </div>
          <div class="pt-2 border-t border-slate-700/80 mt-2">
            <div class="text-xs text-slate-400 mb-1.5 font-mono">持有重铸灵药: <b class="text-amber-300">${washPills}</b> 瓶</div>
            <button id="btn-do-wash-apt" class="w-full mota-btn-gold py-2 rounded text-xs font-black ${washPills > 0 ? '' : 'opacity-50'}">
              立即重铸 (消耗重铸灵药x1)
            </button>
          </div>
        </div>

        <!-- 进阶进化 (黄金->暗金->紫金) -->
        <div class="mota-parchment-panel rounded-xl p-3.5 sm:p-4 border-2 border-[#caa048] flex flex-col justify-between">
          <div class="space-y-2">
            <div class="flex items-center gap-2 border-b border-slate-700/80 pb-2">
              <h4 class="font-bold text-sm text-amber-300">神圣觉醒 · 阶位终极突破</h4>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">
              • 30级黄金宠 + 进化石 -> 突破为【暗金神宠】(资质上限升至4500)<br>
              • 40级暗金宠 + 天命石 -> 终极觉醒为【紫金传奇圣兽】(资质上限升至6000)<br>
              每次进阶后等级与经验归零，特性与已学魔典保留。进化石来自第12章、风暴之门或声望商行；天命石来自银龙、巨龙之门或边境军需。
            </p>
            <div class="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 text-xs space-y-1.5">
              <div class="flex justify-between">
                <span class="text-slate-400">当前品阶:</span>
                <b class="text-amber-300 uppercase font-bold">${owned.tier}</b>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">材料存量:</span>
                <span class="font-mono">进化石: <b class="text-amber-300">${evoStones}</b> | 天命石: <b class="text-amber-300">${destStones}</b></span>
              </div>
            </div>
          </div>
          <div class="pt-2 border-t border-slate-700/80 mt-2">
            <button id="btn-do-evolve-pet" class="w-full mota-btn-gold py-2 rounded text-xs font-black">
              开启阶位进化突破
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // 3. 4槽打书
  renderSkills(owned, conf) {
    const data = gameState.data;
    const books = data.bag.filter(i => i.type === 'skill_book' || i.id.startsWith('book_'));
    const learned = owned.skills || [];

    return `
      <div class="h-full mota-parchment-panel rounded-xl p-3.5 sm:p-4 border-2 border-[#caa048] flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2.5">
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-sm text-amber-300">神技研习 · 4格打书面板</h4>
            </div>
            <span class="text-xs text-slate-400 font-mono">已领悟: <b class="text-amber-300">${learned.length}</b> / 4</span>
          </div>

          <div class="grid grid-cols-4 gap-2.5 mb-2.5">
            ${[0, 1, 2, 3].map(idx => {
              const skId = learned[idx];
              const bookConf = Object.values(PET_SKILL_BOOKS).find(b => b.skillId === skId || b.id === skId);
              return `
                <div class="p-2 rounded-xl border text-center flex flex-col items-center justify-center h-18 bg-black/40 ${
                  bookConf ? 'border-[#f5c042]' : 'border-slate-800 text-slate-300'
                }">
                  <div class="mb-1 flex items-center justify-center">
                    ${bookConf ? renderGameIcon(bookConf.id || 'book_crit', { size: 'w-6 h-6' }) : '<div class="w-6 h-6 rounded border border-dashed border-slate-500 flex items-center justify-center text-slate-300 text-xs font-mono">-</div>'}
                  </div>
                  <div class="text-xs font-bold truncate w-full ${bookConf ? 'text-amber-200' : 'text-slate-300'}">
                    ${bookConf ? bookConf.skillName : `槽位 #${idx + 1}`}
                  </div>
                  ${bookConf ? `<button class="btn-return-pet-book mota-btn-dark text-[10px] mt-1" data-learned-id="${skId}">退还魔典</button>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="pt-2.5 border-t border-slate-700/80 flex-1 min-h-0 flex flex-col">
          <div class="text-xs font-bold text-amber-300 mb-1.5 flex-shrink-0">行囊中的远古魔导书：</div>
          <div class="grid grid-cols-2 gap-2 overflow-y-auto max-h-[140px] custom-scrollbar pr-1">
            ${books.length > 0 ? books.map(b => `
              <div class="p-2 rounded-lg bg-black/40 border border-slate-800/80 flex items-center justify-between text-xs">
                <div class="truncate mr-2">
                  <div class="font-bold text-xs text-amber-200 truncate">${b.name}</div>
                  <div class="text-[10px] text-slate-400 truncate">${b.desc}</div>
                </div>
                <button data-book-id="${b.id}" class="btn-learn-skill mota-btn-gold px-2.5 py-1 rounded text-[11px] font-bold flex-shrink-0">
                  研习打入
                </button>
              </div>
            `).join('') : `
              <div class="col-span-2 text-center py-4 text-xs text-slate-500">
                行囊中暂无远古魔导书，可通过主线任务奖励或王都声望商行兑换获得！
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelectorAll('[data-pick-party], [data-guide-pet]').forEach(button => {
      button.onclick = () => {
        const requested = button.dataset.guidePet;
        const candidate = gameState.data.pets.find(pet => !getPetParty(gameState.data).some(member => member.pet?.id === pet.id));
        this.selectedPetId = requested || candidate?.id || gameState.data.pets[0]?.id || null;
        this.currentSubTab = gameState.data.pets.some(pet => pet.id === this.selectedPetId) ? 'overview' : 'compendium';
        this.detailSub = 'main';
        this.render();
        const card = this.container.querySelector('.pet-select-card.is-selected');
        card?.scrollIntoView({ block: 'nearest' });
        card?.focus({ preventScroll: true });
      };
    });
    const mercenaryButton = this.container.querySelector('#btn-party-mercenary');
    if (mercenaryButton) mercenaryButton.onclick = () => this.onSwitchTab?.('estate');
    this.container.querySelectorAll('[data-assign-party], [data-clear-party]').forEach(button => {
      button.onclick = () => {
        const clear = button.hasAttribute('data-clear-party');
        const slot = Number(button.getAttribute(clear ? 'data-clear-party' : 'data-assign-party'));
        const result = gameState.setPetPartySlot(slot, clear ? null : this.selectedPetId);
        if (!result.success) gameModal.alert(result.msg, '随行阵容');
        this.render();
        this.container.querySelector('.pet-select-card.is-selected')?.focus({ preventScroll: true });
      };
    });

    // 左键拖曳宠物头像到出战位（主宠/副宠1/副宠2），点选保留兜底
    this.container.querySelectorAll('.pet-select-card[draggable="true"]').forEach(card => {
      card.addEventListener('dragstart', (event) => {
        const petId = card.getAttribute('data-pet-id');
        this._dragPetId = petId;
        if (event.dataTransfer) { event.dataTransfer.setData('text/plain', petId); event.dataTransfer.effectAllowed = 'move'; }
      });
      card.addEventListener('dragend', () => { this._dragPetId = null; });
    });
    this.container.querySelectorAll('[data-drop-slot]').forEach(slotEl => {
      const slot = Number(slotEl.getAttribute('data-drop-slot'));
      slotEl.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        slotEl.classList.add('is-drop-over');
      });
      slotEl.addEventListener('dragleave', () => slotEl.classList.remove('is-drop-over'));
      slotEl.addEventListener('drop', (event) => {
        event.preventDefault();
        slotEl.classList.remove('is-drop-over');
        const petId = (event.dataTransfer && event.dataTransfer.getData('text/plain')) || this._dragPetId;
        if (!petId) return;
        const result = gameState.setPetPartySlot(slot, petId);
        if (!result.success) return gameModal.alert(result.msg, '随行阵容');
        sound.playSlash();
        this.selectedPetId = petId;
        this.render();
        this.container.querySelector('.pet-select-card.is-selected')?.focus({ preventScroll: true });
      });
    });
    this.container.querySelectorAll('.btn-return-pet-book').forEach(button => {
      button.addEventListener('click', () => {
        const petId = this.selectedPetId;
        const learnedId = button.getAttribute('data-learned-id');
        gameModal.confirm('将这本魔典退回行囊，伙伴会暂时失去对应能力；你可以给它学习其他魔典，也可以重新研习这一本。', () => {
          const result = gameState.forgetPetSkill(petId, learnedId);
          gameModal.alert(result.msg, '魔典调整'); this.render();
        }, null, '调整伙伴魔典');
      });
    });
    // 切换子标签
    ['overview', 'wash', 'skills', 'compendium'].forEach(tab => {
      const btn = document.getElementById(`pet-subtab-${tab}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.currentSubTab = tab;
          this.detailSub = 'main';
          sound.playSlash();
          this.render();
          document.getElementById(`pet-subtab-${tab}`)?.focus({ preventScroll: true });
        });
      }
    });
    this.container.querySelectorAll('[data-pet-sub]').forEach(button => {
      button.onclick = () => {
        this.detailSub = button.dataset.petSub;
        this.render();
        this.container.querySelector(`[data-pet-sub="${this.detailSub}"]`)?.focus({ preventScroll: true });
      };
    });

    // 选中宠物
    this.container.querySelectorAll('.pet-select-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-pet-id');
        this.selectedPetId = id;
        this.detailSub = 'main';
        sound.playSlash();
        this.render();
        this.container.querySelector('.pet-select-card.is-selected')?.focus({ preventScroll: true });
      });
    });

    // 设为出战 (达成主线3)
    const btnActive = document.getElementById('btn-toggle-active-pet');
    if (btnActive) {
      btnActive.addEventListener('click', () => {
        const result = gameState.setActivePet(this.selectedPetId);
        if (!result.success) return gameModal.alert(result.msg, '主宠出战');
        sound.playFanfare();
        if (gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_3') {
          gameModal.confirm(
            `成功将【${PET_CONFIGS[this.selectedPetId]?.name}】设为主宠随行出战！\n\n【主线任务达成】远古契约 · 神兽随行！\n奖赏：经验 +1100，金币 +2500，魔晶 +40，【远古神兽契约蛋】！\n\n是否立即领受犒赏并开启下一阶段主线【星界洗礼 · 重铸天资】？`,
            () => {
              gameState.claimQuestReward('quest_3');
              gameModal.alert('远古神兽契约蛋与丰厚犒赏已存入行囊！已为你开启下一阶段主线【星界洗礼 · 重铸天资】，前往潜能重铸工坊重铸神兽天资吧！', '主线推进', () => {
                this.currentSubTab = 'wash';
                this.render();
              });
            },
            () => this.render(),
            '主线大捷 · 神兽随行'
          );
          this.render();
          return;
        }
        gameState.notify();
        this.render();
        this.container.querySelector('.pet-select-card.is-selected')?.focus({ preventScroll: true });
        gameModal.alert(`成功将【${PET_CONFIGS[this.selectedPetId]?.name}】设为主宠随行出战！`, '主宠出战');
      });
    }

    const trainButton = document.getElementById('btn-train-companion');
    if (trainButton) {
      const quote = gameState.getCompanionTrainingQuote(this.selectedPetId);
      trainButton.onclick = () => {
        const result = gameState.trainCompanion(quote);
        this.render();
        this.container.querySelector('.pet-select-card.is-selected')?.focus({ preventScroll: true });
        gameModal.alert(result.msg, '营地训练');
      };
    }

    // 喂食魔能兽肉排
    const btnFeed = document.getElementById('btn-feed-pet');
    if (btnFeed) {
      btnFeed.addEventListener('click', () => {
        const res = gameState.feedPet(this.selectedPetId);
        if (res.success) sound.playCoin();
        this.render();
        this.container.querySelector('.pet-select-card.is-selected')?.focus({ preventScroll: true });
        gameModal.alert(res.msg, '神兽喂养');
      });
    }

    // 潜能重铸 (达成主线4)
    const btnWash = document.getElementById('btn-do-wash-apt');
    if (btnWash) {
      btnWash.addEventListener('click', () => {
        const pet = gameState.data.pets.find(p => p.id === this.selectedPetId);
        if (!pet) return;
        const result = gameState.washPetAptitude(this.selectedPetId);
        if (!result.success) return gameModal.alert(result.msg, '重铸材料不足');

        sound.playCoin();
        gameState.addSystemLog(`【神兽】伙伴【${PET_CONFIGS[pet.id]?.name || '神兽'}】四维资质已重新生成，请比较资质后继续培养。`, 'pet');

        if (gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_4') {
          gameModal.confirm(
            `潜能重铸大吉！四维资质重铸完成！\n\n【主线任务达成】星界洗礼 · 重铸天资！\n奖赏：经验 +1500，金币 +3000，魔晶 +50，【远古魔导书·高级必杀】！\n\n是否立即领受犒赏并开启下一阶段主线【研读魔典 · 神宠打书】？`,
            () => {
              gameState.claimQuestReward('quest_4');
              gameModal.alert('远古魔导书已存入行囊！已为你开启下一阶段主线【研读魔典 · 神宠打书】，前往魔导研习打入技能吧！', '主线推进', () => {
                this.currentSubTab = 'skills';
                this.render();
              });
            },
            () => this.render(),
            '主线大捷 · 潜能重铸'
          );
          gameState.notify();
          this.render();
          return;
        }

        gameModal.alert(`潜能重铸大吉！四维资质重铸完成！`, '潜能重铸成功');
        gameState.notify();
        this.render();
      });
    }

    // 进化突破
    const btnEvolve = document.getElementById('btn-do-evolve-pet');
    if (btnEvolve) {
      btnEvolve.addEventListener('click', () => {
        const res = gameState.evolvePet(this.selectedPetId);
        if (res.success) sound.playFanfare();
        gameModal.alert(res.msg, '神兽进阶突破');
        this.render();
      });
    }

    // 孵化神兽蛋 (可孵化出22神兽之一)
    const chosenContract = document.getElementById('btn-chosen-contract');
    if (chosenContract) chosenContract.onclick = () => {
      const result = gameState.hatchPetEgg(document.getElementById('select-companion-contract').value);
      if (result.success) { this.selectedPetId = result.petId; gameState.notify(); }
      gameModal.alert(result.msg, '契约仪式');
      this.render();
    };

    const btnHatch = document.getElementById('btn-hatch-egg');
    if (btnHatch) {
      btnHatch.addEventListener('click', () => {
        const result = gameState.hatchPetEgg();
        if (!result.success) return gameModal.alert(result.msg, '神兽孵化');
        const pickKey = result.petId;
        const cfg = PET_CONFIGS[pickKey];

        sound.playFanfare();
        gameState.addSystemLog(`【神兽】灵光迸发！破壳孵化出全新神兽【${cfg.name}】！`, 'pet');
        gameModal.alert(`灵光迸发！成功破壳孵化出全新神兽【${cfg.name}】！激活特性【${cfg.traitName}】！`, '神兽破壳诞生');
        this.selectedPetId = pickKey;
        gameState.notify();
        this.render();
      });
    }

    // 打书学习 (达成主线5)
    this.container.querySelectorAll('.btn-learn-skill').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookId = btn.getAttribute('data-book-id');
        const pet = gameState.data.pets.find(p => p.id === this.selectedPetId);
        if (!pet) return;
        const result = gameState.learnPetSkill(this.selectedPetId, bookId);
        if (!result.success) return gameModal.alert(result.msg, '神兽研习');
        const bookName = PET_SKILL_BOOKS[bookId].name;

        sound.playFanfare();
        gameState.triggerQuestAction('learn_skill');
        gameState.addSystemLog(`【神兽】本命神兽【${PET_CONFIGS[pet.id]?.name || '神兽'}】领悟神技【${bookName}】！`, 'pet');

        if (gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_5') {
          gameModal.confirm(
            `研习魔典成功！神兽参透了魔导书，技能打入成功！\n\n【主线任务达成】研读魔典 · 神宠打书！\n奖赏：经验 +2000，金币 +3500，魔晶 +60，【龙血草】x8，【星光苔藓】x8！\n\n是否立即领受犒赏并开启下一阶段主线【初试锋芒 · 踏入魔塔】？`,
            () => {
              gameState.claimQuestReward('quest_5');
              gameModal.alert('大量珍贵草药已存入行囊！已为你开启下一阶段主线【初试锋芒 · 踏入魔塔】，向着魔塔第 1 层进军吧！', '主线推进', () => {
                this.onSwitchTab?.('tower');
              });
            },
            () => this.render(),
            '主线大捷 · 神宠打书'
          );
          gameState.notify();
          this.render();
          return;
        }

        gameModal.alert(`研习魔典成功！神兽参透了魔导书，技能打入成功！`, '神技打书成功');
        gameState.notify();
        this.render();
      });
    });
  }
}
