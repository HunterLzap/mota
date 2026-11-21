// 2011 经典页游纯正【人物】与【装备】独立全屏视图 (精致紧凑，100% 单屏可视)
import { gameState } from '../core/state.js';
import { getPlayerActionInterval } from '../core/combat.js';
import { CLASSES, NATIONS, getClassSkills, getSkillTraining } from '../config/classes.js';
import { ITEM_SLOTS, SLOT_MAP, OFFICIAL_SETS, QUALITIES } from '../config/items.js';
import { getVectorIcon } from '../assets/vectorIcons.js';
import { renderGameIcon, renderSlotWatermark } from './iconHelper.js';
import { tooltip } from './tooltip.js';
import { gameModal } from './modal.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// ==========================================
// 1. 【人物面板】(Hero Profile View)
// ==========================================
export class HeroView {
  constructor(containerId, onSwitchTab, onAddStat) {
    this.container = document.getElementById(containerId);
    this.onSwitchTab = onSwitchTab;
    this.onAddStat = onAddStat;
  }

  navigate({ panel } = {}) {
    if (panel !== undefined) this.currentPanel = panel;
  }

  render() {
    if (!this.container) return;
    if (this.currentPanel === 'skills') return this.renderSkills();
    const data = gameState.data;
    const stats = gameState.getEffectiveStats();
    const cls = CLASSES[data.classId] || CLASSES.warrior;
    const nation = NATIONS[data.nation] || NATIONS.aden;
    const nextExp = gameState.getNextLevelExp(data.level);
    const expPercent = Math.min(100, Math.floor((data.exp / nextExp) * 100));
    const nextSkill = getClassSkills(data.classId).filter(skill => skill.unlockLevel > data.level).sort((a, b) => a.unlockLevel - b.unlockLevel)[0];

    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const combatStats = [
      ['攻击力', stats.atk], ['防御力', stats.def], ['速度', stats.speed],
      ['减伤率', `${stats.dmgResist}%`], ['命中率', `${stats.hit}%`],
      ['闪避率', `${stats.dodge}%`], ['暴击率', `${stats.crit}%`]
    ];
    this.container.innerHTML = `
      <section class="hero-profile hero-dossier">
        <header class="mota-breadcrumb hero-dossier-heading"><h2>人物 · ${esc(data.name)}</h2>
          <button id="btn-open-class-skills" class="mota-btn-dark">职业技能 · 可用${getSkillTraining(data).available}点</button>
        </header>
        <div class="hero-dossier-body">
          <aside class="hero-info-column" aria-label="角色信息">
            <div class="hero-info-caption"><span>角色成长</span><small>潜能与战力</small></div>
            <h4 class="hero-info-block">潜能 <span>剩余 <b>${data.freeStatPoints}</b> 点</span></h4>
            <div class="hero-potential-rows">${[['str', '力量'], ['dex', '敏捷'], ['int', '智力'], ['con', '体质']].map(([key, label]) => `<div><span>${label}</span><strong>${stats[key]}</strong><small>已分配 +${data.allocatedStats[key]}</small><button data-stat="${key}" aria-label="增加${label}" class="btn-add-stat mota-btn-gold" ${data.freeStatPoints > 0 ? '' : 'disabled'}>+</button></div>`).join('')}</div>
            ${data.freeStatPoints > 0 ? '<button id="btn-recommended-stats" class="mota-btn-dark">按职业建议分配：主属性与体魄</button><p class="hero-allocation-hint">约七成主属性，三成体魄；也可逐项分配。</p>' : '<p class="hero-allocation-hint">当前潜能已分配，升级后可继续分配。</p>'}
            <h4 class="hero-info-block">战斗力</h4>
            <div class="hero-combat-grid">${combatStats.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('')}</div>
            <h4 class="hero-info-block">其它信息</h4>
            <dl class="hero-info-lines">
              <div><dt>国家</dt><dd>${esc(nation.name)}</dd></div>
            </dl>
          </aside>
          <div class="hero-stage-column">
            <section class="hero-identity-scene" aria-label="勇者身份">
              <div class="class-portrait hero-body-portrait" role="img" aria-label="${esc(cls.name)}全身立绘"></div>
              <div class="hero-identity-plaque"><span>${esc(nation.name.split(' ')[0])} · ${esc(data.achievements?.activeTitle || data.royalTrials?.currentTitle || data.title)}</span>
                <h3>${esc(data.name)} <small>Lv.${data.level}</small></h3><p>${esc(gameState.getPromotedClassName())}</p>
              </div>
              <div class="hero-experience"><span>历练经验 <b>${expPercent}%</b></span>
                <div class="hero-experience-track"><i style="width:${expPercent}%"></i></div><small>${data.exp} / ${nextExp}</small>
              </div>
            </section>
            <section class="hero-lore-ledger"><p><b>${esc(nation.name)}：</b>${esc(nation.buffDesc)}</p><p><b>${esc(cls.name)}奥义：</b>${esc(cls.description)}</p>
              ${data.onboardingVersion === 2 && nextSkill ? `<p>下一个成长目标：${nextSkill.unlockLevel}级掌握【${esc(nextSkill.name)}】。</p>` : ''}
            </section>
            <footer class="hero-dossier-actions"><span>装备与常驻加成已计入属性</span><button id="btn-quick-goto-equip" class="mota-btn-dark">前往装备</button><button id="btn-quick-to-bag" class="mota-btn-dark">打开背包</button></footer>
          </div>
        </div>
      </section>`;

    this.bindEvents();
  }

  renderSkills() {
    const data = gameState.data;
    const stats = gameState.getEffectiveStats();
    const available = getSkillTraining(data).available;
    const unlocked = getClassSkills(data.classId, stats.skillLevelBonus, data);
    const skills = getClassSkills(data.classId, stats.skillLevelBonus);
    const names = { strBonus: '力量', intBonus: '智力', dexBonus: '敏捷', atkBonus: '攻击', defBonus: '防御', maxHpBonus: '生命', maxMpBonus: '魔力', speedBonus: '速度', critBonus: '暴击', dodgeBonus: '闪避', magicResistBonus: '魔抗', critDmgBonus: '暴伤', teamAtkBoost: '全队攻击', teamHitBoost: '全队命中', teamSpeedBoost: '全队速度', teamCritResist: '抗暴击', teamRegenHp: '每10秒生命回复', teamRegenMp: '每10秒魔力回复', mpShieldRate: '魔力护盾', reflectDmg: '反弹' };
    const percentKeys = new Set(['critDmgBonus', 'teamAtkBoost', 'teamSpeedBoost', 'teamCritResist', 'teamRegenHp', 'mpShieldRate', 'reflectDmg']);
    const effectText = skill => skill.category === 'attack' ? `伤害 ${((skill.multiplier || 1) * 100).toFixed(1)}%${skill.multiHit ? ' × ' + skill.multiHit : ''} · 魔力 ${skill.mpCost}`
      : Object.entries(skill.effect || {}).map(([key, value]) => `${names[key] || key} +${(percentKeys.has(key) ? value * 100 : value).toFixed(1)}${percentKeys.has(key) ? '%' : ''}`).join(' / ');
    this.container.innerHTML = `<section class="class-training">
      <header><button id="btn-close-class-skills" class="mota-btn-dark">人物属性</button><h2>${CLASSES[data.classId].name} · 职业技能</h2><strong>可用技能点 ${available}</strong></header>
      <p>初始1点，11级起每级获得1点。基础技能随等级掌握；每次培养消耗1点，最多10级，每级提高效果2%。装备等级另计，光环在竞技场不生效。</p>
      <label class="class-skill-priority">优先施放 <select id="class-skill-priority"><option value="">自动选择</option>${unlocked.filter(skill => skill.category === 'attack').map(skill => `<option value="${skill.id}" ${data.skillTraining?.preferredAttackId === skill.id ? 'selected' : ''}>${skill.name}</option>`).join('')}</select><span>魔力不足或未触发时尝试其他已掌握技能。</span></label>
      <div class="class-training-grid custom-scrollbar">${skills.map(base => {
        const skill = unlocked.find(skill => skill.id === base.id);
        const rank = skill?.rank || 1;
        return `<article data-class-skill="${base.id}"><h3>${base.name}<small>${base.category === 'attack' ? '主动' : base.category === 'passive' ? '被动' : '光环'}</small></h3>
          <p>${base.description}</p><p class="class-skill-effect">${skill ? effectText(skill) : `${base.unlockLevel}级掌握`}</p>
          <footer><span>${skill ? `${rank} / 10级${stats.skillLevelBonus ? ' · 装备 +' + stats.skillLevelBonus : ''}` : '尚未掌握'}</span><button data-train-class="${base.id}" data-rank="${rank}" class="mota-btn-gold" ${!skill || rank >= 10 || available < 1 ? 'disabled' : ''}>${rank >= 10 ? '已满级' : '培养 · 1点'}</button></footer></article>`;
      }).join('')}</div></section>`;
    this.container.querySelector('#btn-close-class-skills').onclick = () => { this.currentPanel = 'stats'; this.render(); };
    this.container.querySelector('#class-skill-priority').onchange = event => {
      const result = gameState.setPreferredClassSkill(event.target.value || null);
      if (!result.success) gameModal.alert(result.msg, '职业技能');
    };
    this.container.querySelectorAll('[data-train-class]').forEach(button => {
      button.onclick = () => {
        const id = button.getAttribute('data-train-class');
        const result = gameState.trainClassSkill(id, Number(button.getAttribute('data-rank')));
        if (!result.success) gameModal.alert(result.msg, '职业培养');
        this.render();
        const trained = this.container.querySelector(`[data-train-class="${id}"]`);
        const target = trained && !trained.disabled ? trained
          : this.container.querySelector('[data-train-class]:not(:disabled), #class-skill-priority');
        target?.focus({ preventScroll: true });
      };
    });
  }

  bindEvents() {
    const skillsButton = this.container.querySelector('#btn-open-class-skills');
    if (skillsButton) skillsButton.onclick = () => { this.currentPanel = 'skills'; this.render(); };
    const recommended = this.container.querySelector('#btn-recommended-stats');
    if (recommended) recommended.onclick = () => {
      const result = gameState.allocateRecommendedStats();
      if (result.success) gameModal.toast(`已分配${result.points}点潜能，其中${result.health}点增强体魄。`);
      queueMicrotask(() => this.container.querySelector('#btn-recommended-stats, #btn-open-class-skills')?.focus({ preventScroll: true }));
    };
    this.container.querySelectorAll('.btn-add-stat').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-stat');
        this.onAddStat?.(type);
        const next = this.container.querySelector(`.btn-add-stat[data-stat="${type}"]:not(:disabled)`)
          || this.container.querySelector('#btn-open-class-skills');
        next?.focus({ preventScroll: true });
      });
    });

    const btnGotoEquip = document.getElementById('btn-quick-goto-equip');
    if (btnGotoEquip) {
      btnGotoEquip.addEventListener('click', () => {
        this.onSwitchTab?.('equip');
      });
    }

    const btnGotoBag = document.getElementById('btn-quick-to-bag');
    if (btnGotoBag) {
      btnGotoBag.addEventListener('click', () => {
        this.onSwitchTab?.('bag');
      });
    }
  }
}

// ==========================================
// 2. 【装备面板】(Equipment Paperdoll View)
// ==========================================
export class EquipView {
  constructor(containerId, onSwitchTab) {
    this.container = document.getElementById(containerId);
    this.onSwitchTab = onSwitchTab;
    this.setTab = null;
  }

  render() {
    if (!this.container) return;
    const data = gameState.data;
    const cls = CLASSES[data.classId] || CLASSES.warrior;
    const equipped = data.equipped || {};
    const stats = gameState.getEffectiveStats();

    // 统计当前套装部件数量
    const setCounts = {};
    Object.values(equipped).forEach(item => {
      if (item && item.setId && (item.durability ?? 100) > 0) {
        setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
      }
    });

    // 十二部位纸娃娃：左 6 / 右 6
    const leftSlots = [
      { key: 'helmet', name: '头盔' },
      { key: 'necklace', name: '项链' },
      { key: 'cloak', name: '披风' },
      { key: 'armor', name: '护胸' },
      { key: 'belt', name: '腰带' },
      { key: 'pants', name: '护腿' }
    ];

    const rightSlots = [
      { key: 'weapon', name: '武器' },
      { key: 'gloves', name: '护手' },
      { key: 'boots', name: '护靴' },
      { key: 'ring', name: '戒指' },
      { key: 'mirror', name: '护心镜' },
      { key: 'bracelet', name: '手镯' }
    ];

    const renderSlot = (slot) => {
      const item = equipped[slot.key];
      const qualityBorder = item 
        ? (item.quality === 'darkgold' ? 'border-amber-400 shadow-[0_0_10px_rgba(245,192,66,0.6)]' :
           item.quality === 'purple' ? 'border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]' :
           item.quality === 'gold' ? 'border-amber-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' :
           item.quality === 'blue' ? 'border-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.4)]' :
           'border-green-400')
        : 'border-slate-800';

      return `
        <div data-equip-slot="${slot.key}" data-equipped="${Boolean(item)}" style="--item-quality:${QUALITIES[item?.quality]?.color || '#77715c'}" class="relative flex items-center gap-2 p-1.5 sm:p-2 rounded-lg bg-black/30 border border-[#4a3520]/60 hover:border-amber-400/80 transition-all group">
          <div class="equip-slot-icon w-8 h-8 rounded-lg bg-black/70 border-2 ${qualityBorder} flex items-center justify-center flex-shrink-0 relative overflow-hidden p-1">
            ${item ? `
              ${renderGameIcon(item, { size: 'w-full h-full' })}
              ${(item.stars || 0) > 0 ? `
                <div class="absolute top-0 right-0 px-1 text-[8px] font-black bg-amber-500 text-black rounded-bl shadow leading-none">
                  +${item.stars}
                </div>
              ` : ''}
            ` : `
              ${renderSlotWatermark(slot.key, 'w-full h-full')}
            `}
          </div>

          <div class="equip-slot-copy min-w-0 flex-1 leading-tight">
            <span class="equip-part-label">${slot.name}${item ? ` · ${QUALITIES[item.quality]?.name || '装备'}` : ' · 空位'}</span>
            <button type="button" data-browse-slot="${slot.key}" class="equip-slot-name" aria-label="${escapeHtml(item ? item.name : `选择${slot.name}`)}">
              ${item ? item.name : '从行囊选择'}
            </button>
            ${item ? `
              <div class="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span>耐久:${item.durability ?? 100}/${item.maxDurability ?? 100}${item.durability === 0 ? ' · 已损坏' : ''}</span>
                ${item.setId ? `<span class="text-purple-300 font-sans text-[9px]">[${OFFICIAL_SETS[item.setId]?.name || '套装'}]</span>` : ''}
              </div>
            ` : ''}
          </div>

          ${item ? `
            <button data-unequip-slot="${slot.key}" class="btn-unequip-gear text-[10px] px-1.5 py-0.5 rounded bg-black/50 border border-slate-700 text-slate-400 hover:text-red-300 hover:border-red-500 transition-opacity">
              卸下
            </button>
          ` : ''}
        </div>
      `;
    };

    const equippedCount = leftSlots.filter(s => data.equipped[s.key]).length + rightSlots.filter(s => data.equipped[s.key]).length;

    this.container.innerHTML = `
      <div class="equip-workbench w-full h-full p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑导航条 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-200 font-bold text-xs">【装备】</span>
            <span class="text-slate-400 text-[11px] font-mono">已穿戴: <b class="text-amber-300">${equippedCount}</b> / 12</span>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-auto-equip-strongest" class="mota-btn-gold px-2.5 py-1 rounded-lg text-xs font-bold shadow flex items-center gap-1">
              <span>打开行囊选择装备</span>
            </button>
            <button id="btn-quick-goto-smithy" class="mota-btn-dark px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-200 hover:border-amber-400 flex items-center gap-1">
              <span>前往铁匠铺升星 -></span>
            </button>
          </div>
        </div>

        <!-- 主体：三列十二部位纸娃娃 (左6槽 + 中间立绘/属性 + 右6槽) -->
        <div class="equip-equipment-columns flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
          
          <!-- 左侧 5 大装备槽位 (3列) -->
          <div class="md:col-span-3 mota-parchment-panel p-3 rounded-xl flex flex-col justify-between border border-[#caa048]">
            <div class="equip-column-heading text-xs font-bold text-amber-300 pb-1.5 border-b border-[#4a3520]/70 flex items-center justify-between">
              <span>防具与饰品</span>
              <span class="text-[10px] text-slate-400 font-mono">${leftSlots.filter(slot => equipped[slot.key]).length} / 6</span>
            </div>
            <div class="equip-slot-list">
              ${leftSlots.map(s => renderSlot(s)).join('')}
            </div>
          </div>

          <div class="equip-combat-summary md:col-span-6 mota-parchment-panel p-4 flex flex-col">
            <div class="equip-identity">
              <div class="equip-crest">${renderGameIcon(cls.id, { size: 'w-full h-full' })}</div>
              <div><h3>${data.name}</h3><p>${gameState.getPromotedClassName()} · Lv.${data.level}</p></div>
            </div>
            <div class="equip-character-sheet"><div class="class-portrait equip-body-portrait" role="img" aria-label="${cls.name}全身立绘"></div>
            <section class="equip-effective-stats" aria-label="当前有效战斗属性">
              <h4>当前有效战斗属性</h4>
              <dl>
                ${[
                  ['maxHp', '生命', stats.maxHp.toLocaleString()], ['maxMp', '法力', stats.maxMp.toLocaleString()],
                  ['atk', '攻击', stats.atk.toLocaleString()], ['def', '防御', stats.def.toLocaleString()],
                  ['speed', '速度', Math.round(stats.speed)], ['interval', '出手间隔（野外）', `${getPlayerActionInterval(stats, data).toFixed(2)} 秒`],
                  ['crit', '暴击', `${stats.crit.toFixed(1)}%`], ['dodge', '闪避', `${stats.dodge.toFixed(1)}%`]
                ].map(([key, label, value]) => `<div><dt>${label}</dt><dd data-effective-stat="${key}">${value}</dd></div>`).join('')}
              </dl>
              <p>已计入有效装备与常驻加成；战中光环、控制会改变实际出手间隔。</p>
            </section></div>

            <!-- 套装羁绊激活一览 -->
            <div class="equip-set-summary p-2.5 rounded-xl bg-black/40 border border-[#4a3520]/70 space-y-1 text-xs">
              <div class="font-bold text-purple-300 flex items-center justify-between text-[11px]">
                <span>有效套装共鸣</span>
                <button id="btn-view-sets-compendium" class="text-[10px] text-amber-300 hover:text-amber-100 underline decoration-amber-500 cursor-pointer">
                  查看${Object.keys(OFFICIAL_SETS).length}远古套装全景图鉴
                </button>
              </div>
              ${(() => {
                const activeSets = Object.entries(setCounts).filter(([, cnt]) => cnt >= 1).map(([setId, cnt]) => ({ setCfg: OFFICIAL_SETS[setId], cnt })).filter(x => x.setCfg);
                if (!activeSets.length) return `<div class="text-[11px] text-slate-500 italic py-1 text-center">尚无有效套装部件（有效件 ≥ 2 才共鸣）；损坏装备不计入。</div>`;
                return `<div class="space-y-1">${activeSets.map(({ setCfg, cnt }) => `<div class="flex items-center justify-between text-[11px] p-1.5 rounded bg-black/40 border border-purple-900/40"><span class="font-bold text-amber-200">${setCfg.name}（${cnt}件有效）</span><span class="text-emerald-400 font-mono">${cnt >= 7 ? (setCfg.bonus7?.desc || setCfg.bonus7Desc) : cnt >= 4 ? (setCfg.bonus4?.desc || setCfg.bonus4Desc) : cnt >= 2 ? (setCfg.bonus2?.desc || setCfg.bonus2Desc) : '未激活（需2件）'}</span></div>`).join('')}</div>`;
              })()}
            </div>

            <!-- 底部操作导航 -->
            <div class="equip-actions pt-2 border-t border-[#4a3520]/70 flex items-center justify-between gap-3 text-xs mt-2">
              <button id="btn-unequip-all" class="flex-1 mota-btn-dark py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-red-300 flex items-center justify-center gap-1.5">
                <span>一键卸下全部</span>
              </button>
              <button id="btn-goto-bag-from-equip" class="flex-1 mota-btn-gold py-2 rounded-lg text-xs font-bold text-amber-100 flex items-center justify-center gap-1.5">
                <span>前往背包穿戴 -></span>
              </button>
            </div>

          </div>

          <!-- 右侧 5 大防具槽位 (3列) -->
          <div class="md:col-span-3 mota-parchment-panel p-3 rounded-xl flex flex-col justify-between border border-[#caa048]">
            <div class="equip-column-heading text-xs font-bold text-amber-300 pb-1.5 border-b border-[#4a3520]/70 flex items-center justify-between">
              <span>武器与饰物</span>
              <span class="text-[10px] text-slate-400 font-mono">${rightSlots.filter(slot => equipped[slot.key]).length} / 6</span>
            </div>
            <div class="equip-slot-list">
              ${rightSlots.map(s => renderSlot(s)).join('')}
            </div>
          </div>

        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('[data-equip-slot]').forEach(el => {
      const key = el.dataset.equipSlot;
      tooltip.attach(el, () => gameState.data.equipped?.[key]);
    });
    this.container.querySelectorAll('[data-browse-slot]').forEach(button => {
      button.onclick = () => {
        this.onSwitchTab?.('bag', { equipmentSlot: button.dataset.browseSlot });
        document.getElementById('bag-slot-filter')?.focus({ preventScroll: true });
      };
    });
    // 智能穿戴最强装备
    const btnAuto = document.getElementById('btn-auto-equip-strongest');
    if (btnAuto) {
      btnAuto.addEventListener('click', () => {
        this.onSwitchTab?.('bag');
      });
    }

    // 前往铁匠铺
    const btnSmithy = document.getElementById('btn-quick-goto-smithy');
    if (btnSmithy) {
      btnSmithy.addEventListener('click', () => {
        this.onSwitchTab?.('town', { view: 'smithy' });
      });
    }

    // 前往背包穿戴
    const btnGotoBag = document.getElementById('btn-goto-bag-from-equip');
    if (btnGotoBag) {
      btnGotoBag.addEventListener('click', () => {
        this.onSwitchTab?.('bag');
      });
    }

    // 一键卸下全部
    const btnUnequipAll = document.getElementById('btn-unequip-all');
    if (btnUnequipAll) {
      btnUnequipAll.addEventListener('click', () => {
        let count = 0;
        Object.keys(gameState.data.equipped).forEach(k => {
          if (gameState.data.equipped[k]) {
            gameState.unequipItem(k);
            count++;
          }
        });
        if (count > 0) {
          gameModal.toast(`已一键卸下 ${count} 件装备并存入背包！`);
        } else {
          gameModal.toast('当前身上未穿戴任何装备');
        }
        this.render();
      });
    }

    // 查看13远古套装全景图鉴
    const btnViewCompendium = document.getElementById('btn-view-sets-compendium');
    if (btnViewCompendium) {
      btnViewCompendium.addEventListener('click', () => {
        this.showSetsCompendiumModal();
      });
    }

    // 卸下装备
    this.container.querySelectorAll('.btn-unequip-gear').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slotKey = btn.getAttribute('data-unequip-slot');
        const res = gameState.unequipItem(slotKey);
        gameModal.toast(res.msg);
        this.container.querySelector(`[data-browse-slot="${slotKey}"]`)?.focus({ preventScroll: true });
      });
    });
  }

  // 13套原著远古套装全景图鉴弹窗
  showSetsCompendiumModal() {
    let modal = document.getElementById('modal-sets-compendium');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-sets-compendium';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm select-none';
      document.body.appendChild(modal);
    }

    // 穿戴件数 vs 有效件数：损坏（耐久为 0）的部件不计入套装激活。
    const equippedSetCounts = {};
    const effectiveSetCounts = {};
    Object.values(gameState.data.equipped).forEach(item => {
      if (item && item.setId) {
        equippedSetCounts[item.setId] = (equippedSetCounts[item.setId] || 0) + 1;
        if (item.durability === undefined || item.durability > 0) {
          effectiveSetCounts[item.setId] = (effectiveSetCounts[item.setId] || 0) + 1;
        }
      }
    });

    const setsList = Object.values(OFFICIAL_SETS);

    modal.innerHTML = `
      <div class="w-full max-w-6xl max-h-[85vh] mota-parchment-panel border-2 border-[#caa048] rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        <!-- 弹窗标题 -->
        <div class="p-3.5 border-b border-[#4a3520] flex items-center justify-between bg-black/40 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <h3 class="text-sm font-black text-amber-300">亚诺大陆 · 远古神装图鉴</h3>
          </div>
          <button id="btn-close-sets-compendium" class="px-2 py-0.5 rounded-lg mota-btn-dark text-xs text-amber-300 hover:text-white border border-amber-500/50">
            关闭
          </button>
        </div>

        <!-- 套装列表：三栏网格，一屏不内滚 -->
        <div class="p-3 flex-1 min-h-0 overflow-hidden">
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-2 content-start">
          ${setsList.map(s => {
            const worn = equippedSetCounts[s.id] || 0;
            const count = effectiveSetCounts[s.id] || 0;
            const isFull = count >= 7;
            const isMid = count >= 4;
            const isHalf = count >= 2;
            const qualityColor = s.quality === 'purplegold' ? 'text-purple-300 border-purple-500 bg-purple-950/40' : s.quality === 'darkgold' ? 'text-amber-400 border-amber-600 bg-amber-950/40' : 'text-yellow-300 border-yellow-600 bg-yellow-950/40';

            return `
              <div class="p-1.5 rounded-lg border ${count > 0 ? 'bg-amber-950/30 border-amber-400/80' : 'bg-black/40 border-[#4a3520]/60'} flex flex-col gap-0.5 text-[11px]">
                <div class="flex items-center justify-between gap-1">
                  <div class="flex items-center gap-1.5 min-w-0">
                    ${renderGameIcon(s.id, { size: 'w-6 h-6', className: 'flex-shrink-0' })}
                    <span class="font-black text-[12px] truncate ${count > 0 ? 'text-amber-200' : 'text-slate-200'}">${s.name}</span>
                    <span class="text-[9px] px-1 py-0.2 rounded border font-mono whitespace-nowrap ${qualityColor}">${s.quality === 'purplegold' ? '紫金神圣' : s.quality === 'darkgold' ? '暗金史诗' : '黄金远古'}</span>
                  </div>
                  <span class="text-[9px] font-mono px-1.5 py-0.2 rounded-full whitespace-nowrap ${isFull ? 'bg-emerald-900 text-emerald-300 font-bold border border-emerald-600' : isHalf ? 'bg-amber-900 text-amber-300 font-bold border border-amber-600' : 'bg-slate-800 text-slate-400'}">已装备: ${worn}/7 件${worn !== count ? ` · 有效 ${count}` : ''}</span>
                </div>
                <div class="text-[10px] text-slate-400 truncate">获取途径：<span class="text-amber-300/90">${s.source}</span> · 门槛 Lv.${s.reqLevel}</div>
                <div class="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/80 text-[9px] leading-tight">
                  <div class="p-1 rounded bg-black/30 border ${isHalf ? 'border-amber-500/60 text-amber-200' : 'border-slate-800 text-slate-400'}" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><span class="font-bold text-amber-300">2件</span> ${s.bonus2?.desc || '属性提升'}</div>
                  <div class="p-1 rounded bg-black/30 border ${isMid ? 'border-emerald-500/60 text-emerald-200' : 'border-slate-800 text-slate-400'}" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><span class="font-bold text-amber-300">4件</span> ${s.bonus4?.desc || '强力被动'}</div>
                  <div class="p-1 rounded bg-black/30 border ${isFull ? 'border-purple-500/60 text-purple-200' : 'border-slate-800 text-slate-400'}" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><span class="font-bold text-amber-300">7件</span> ${s.bonus7?.desc || '终极奥义'}</div>
                </div>
              </div>
            `;
          }).join('')}
          </div>
        </div>

        <div class="p-2.5 bg-black/50 border-t border-[#4a3520] flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <span>共 ${setsList.length} 套远古史诗套装 · 穿戴 2 / 4 / 7 件激活强力羁绊</span>
          <button id="btn-close-sets-compendium-bottom" class="mota-btn-gold px-4 py-1 rounded-lg text-xs font-bold text-black">
            已知晓
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    const closeFn = () => {
      modal.classList.add('hidden');
    };

    const btnClose = modal.querySelector('#btn-close-sets-compendium');
    if (btnClose) btnClose.onclick = closeFn;
    const btnCloseBottom = modal.querySelector('#btn-close-sets-compendium-bottom');
    if (btnCloseBottom) btnCloseBottom.onclick = closeFn;
    modal.onclick = (e) => {
      if (e.target === modal) closeFn();
    };
  }
}
