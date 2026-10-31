// 2011 经典页游纯正【勇者随身行囊】独立全屏视图 (40格大容量行囊、道具分类与操作)
import { gameState } from '../core/state.js';
import { getJourneyGuidance } from '../core/journey.js';
import { ITEM_SLOTS, SLOT_MAP, QUALITIES, OFFICIAL_SETS } from '../config/items.js';
import { CLASSES } from '../config/classes.js';
import { RUNIC_WORDS } from '../config/runes.js';
import { getPlayerActionInterval } from '../core/combat.js';
import { renderGameIcon } from './iconHelper.js';
import { gameModal } from './modal.js';

const STAT_NAMES = {
  atk: '攻击', def: '防御', hp: '生命', maxHp: '生命', mp: '魔力', maxMp: '魔力',
  speed: '速度', str: '力量', int: '智力', dex: '敏捷', agi: '敏捷', con: '体魄',
  crit: '暴击', dodge: '闪避', hit: '命中', counter: '反击', lifesteal: '吸血',
  magicResist: '魔法抗性', critDmg: '暴击伤害', dmgResist: '伤害减免', dmgBonus: '伤害加成',
  skillLevelBonus: '技能等级', doubleStrike: '追加攻击', magicDmg: '魔法伤害',
  finishDmg: '终结伤害', magicAbsorb: '魔法吸收', armorBreak: '破甲'
};
const PERCENT_STATS = new Set(['crit', 'dodge', 'hit', 'counter', 'lifesteal', 'magicResist', 'critDmg', 'dmgResist', 'dmgBonus', 'doubleStrike', 'magicDmg', 'finishDmg', 'magicAbsorb']);
const isSupply = item => item.type === 'egg' || item.id === 'pill_reborn' || item.id?.startsWith('bait') || item.id === 'pet_food';
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function selectBagItems(data, { filter = 'all', sort = 'default', slot = 'all', wearable = false } = {}) {
  const level = item => item.reqLevel || item.level || 1;
  const quality = item => QUALITIES[item.quality]?.multiplier || 0;
  const items = data.bag.filter(Boolean).filter(item =>
    (filter === 'all' || (filter === 'equip' ? item.slot : filter === 'consumable' ? !item.slot && isSupply(item) : !item.slot && !isSupply(item))) &&
    (slot === 'all' || item.slot === slot) &&
    (!wearable || (item.slot && level(item) <= data.level && (!item.reqClass || item.reqClass === data.classId))));
  if (sort === 'level') items.sort((a, b) => level(b) - level(a) || quality(b) - quality(a));
  else if (sort === 'quality') items.sort((a, b) => quality(b) - quality(a) || level(b) - level(a));
  else if (sort === 'slot') items.sort((a, b) => ITEM_SLOTS.findIndex(s => s.id === a.slot) - ITEM_SLOTS.findIndex(s => s.id === b.slot) || level(b) - level(a));
  return items;
}

export function getBagItemDestination(item) {
  if (!item || item.slot) return null;
  if (item.id === 'pet_food') return { tab: 'pets', action: 'feed_pet', label: '前往喂养伙伴' };
  if (['evolution_stone', 'destiny_stone'].includes(item.id)) return { tab: 'pets', action: 'evolve_purplegold', label: '前往伙伴进阶' };
  if (item.id?.startsWith('book_') || item.id?.startsWith('high_')) return { tab: 'pets', action: 'learn_skill', label: '前往学习魔典' };
  if (['star_crystal', 'crystal_protect'].includes(item.id)) return { tab: 'town', action: 'enhance', label: '前往装备升星' };
  if (['crystal_gold', 'crystal_darkgold'].includes(item.id)) return { tab: 'town', action: 'reforge_gear', label: '前往装备重铸' };
  if (item.type === 'gem' || (item.stat && Number.isFinite(item.val))) return { tab: 'town', action: 'socket_gem', label: '前往镶嵌工坊' };
  if (item.type === 'rune' || item.id?.startsWith('rune_')) return { tab: 'town', action: 'inscribe_runes', label: '前往符文铭刻' };
  if (item.id?.startsWith('bait')) return { tab: 'town', action: 'fish', label: '前往垂钓水域' };
  if (item.id?.startsWith('key_')) return { tab: 'tower', action: 'use_castle_key', label: '前往魔塔入口' };
  return null;
}

export class BagView {
  constructor(containerId, onSwitchTab) {
    this.container = document.getElementById(containerId);
    this.onSwitchTab = onSwitchTab;
    this.bagFilter = 'all'; // 'all' | 'equip' | 'consumable' | 'material'
    this.selectedItemUid = null;
    this.page = 0;
    this.detailTab = 'stats';
    this.bagSort = 'default';
    this.bagSlot = 'all';
    this.wearableOnly = false;
    if (typeof ResizeObserver !== 'undefined') {
      let previous = '';
      this.resizeObserver = new ResizeObserver(([entry]) => {
        const size = `${Math.round(entry.contentRect.width)}:${Math.round(entry.contentRect.height)}`;
        if (entry.contentRect.height > 0 && size !== previous) {
          previous = size;
          requestAnimationFrame(() => this.render());
        }
      });
      this.resizeObserver.observe(this.container);
    }
  }

  render() {
    if (!this.container) return;
    const data = gameState.data;
    const totalSlots = gameState.getBagCapacity();
    const expansionQuote = gameState.getBagExpansionQuote();
    const active = this.container.contains(document.activeElement) ? document.activeElement : null;
    const focus = active ? { id: active.id, uid: active.dataset.bagUid, filter: active.dataset.filter, tab: active.dataset.detailTab } : null;
    const entries = data.bag.filter(Boolean).map(item => ({ item }));
    const filters = [
      { id: 'all', name: '全部', list: entries },
      { id: 'equip', name: '装备', list: entries.filter(({ item }) => item.slot) },
      { id: 'consumable', name: '补给', list: entries.filter(({ item }) => !item.slot && isSupply(item)) },
      { id: 'material', name: '材料', list: entries.filter(({ item }) => !item.slot && !isSupply(item)) }
    ];
    const filteredList = selectBagItems(data, { filter: this.bagFilter, sort: this.bagSort, slot: this.bagSlot, wearable: this.wearableOnly }).map(item => ({ item }));
    const height = this.container.clientHeight || 360, width = this.container.clientWidth || 1000;
    // Use the stable view size; measuring a newly mounted child can change
    // page boundaries between the first click and ResizeObserver's redraw.
    const columns = width < 600 ? 3 : width < 850 ? 6 : width < 1100 ? 8 : 10;
    const rows = Math.max(1, Math.min(6, Math.floor((height - 205) / 62)));
    const pageSize = columns * rows;
    const displaySlots = this.bagFilter === 'all' && this.bagSlot === 'all' && !this.wearableOnly ? Math.max(totalSlots, filteredList.length) : filteredList.length;
    const pages = Math.max(1, Math.ceil(displaySlots / pageSize));
    this.page = Math.max(0, Math.min(this.page, pages - 1));
    const visibleList = filteredList.slice(this.page * pageSize, (this.page + 1) * pageSize);
    const emptyCount = Math.min(pageSize - visibleList.length, Math.max(0, displaySlots - this.page * pageSize - visibleList.length));
    const selectedEntry = visibleList.find(({ item }) => (item.uid || item.id) === this.selectedItemUid)?.item || visibleList[0]?.item || null;
    this.selectedItemUid = selectedEntry?.uid || selectedEntry?.id || null;
    const preview = selectedEntry?.slot ? gameState.getEquipmentPreview(this.selectedItemUid) : null;
    const inheritanceQuote = selectedEntry?.slot ? gameState.getUpgradeInheritanceQuote(selectedEntry.uid) : null;
    const saleQuote = selectedEntry?.slot ? gameState.getEquipmentSaleQuote(selectedEntry.uid || selectedEntry.id) : null;
    const detailLines = selectedEntry ? [
      ...Object.entries(selectedEntry.stats || {}).map(([key, value]) => `<p class="bag-stat-line"><span>${escapeText(STAT_NAMES[key] || key)}</span><b>${value > 0 ? '+' : ''}${escapeText(value)}${PERCENT_STATS.has(key) ? '%' : ''}</b></p>`),
      ...(selectedEntry.slot ? [
        `<p class="bag-stat-line"><span>强化</span><b>+${selectedEntry.stars || 0} 星</b></p>`,
        `<p class="bag-stat-line"><span>耐久</span><b>${selectedEntry.durability ?? selectedEntry.maxDurability ?? 100} / ${selectedEntry.maxDurability || 100}</b></p>`,
        ...(selectedEntry.setId && OFFICIAL_SETS[selectedEntry.setId] ? [`<p class="bag-stat-line"><span>套装</span><b>${escapeText(OFFICIAL_SETS[selectedEntry.setId].name)}</b></p>`] : []),
        ...(selectedEntry.reforge ? [`<p class="bag-stat-line"><span>重铸</span><b>${escapeText(selectedEntry.reforge.name)} +${selectedEntry.reforge.val}${escapeText(selectedEntry.reforge.unit)}</b></p>`] : []),
        ...Array.from({ length: Math.max(selectedEntry.sockets || 0, selectedEntry.gems?.length || 0) }, (_, index) => `<p class="bag-stat-line"><span>镶嵌孔 ${index + 1}</span><b>${escapeText(selectedEntry.gems?.[index]?.name || '空孔')}</b></p>`)
      ] : []),
      ...(selectedEntry.count ? [`<p class="bag-stat-line"><span>数量</span><b>${selectedEntry.count}</b></p>`] : []),
      ...(selectedEntry.desc ? [`<p class="bag-item-description">${escapeText(selectedEntry.desc)}</p>`] : [])
    ] : [];
    const secondaryActions = selectedEntry?.slot ? [
      ...(inheritanceQuote?.success ? [`<button id="btn-bag-inherit-upgrade" class="mota-btn-dark">继承 +${inheritanceQuote.sourceStars} 星并换装<br>${inheritanceQuote.gold} 金币 / ${inheritanceQuote.crystal} 魔晶</button>`] : []),
      ...(selectedEntry.gems || []).flatMap((gem, index) => gem ? [`<button class="btn-bag-remove-gem mota-btn-dark" data-socket="${index}">免费摘除第 ${index + 1} 孔：${escapeText(gem.name)}</button>`] : []),
      `<button id="btn-bag-sell-equipment" data-item-uid="${escapeText(this.selectedItemUid)}" class="mota-btn-dark">出售装备${saleQuote.success ? ` · ${saleQuote.gold} 金币` : ' · 先检查镶嵌'}</button>`,
      '<p class="bag-item-description">出售前将再次确认；镶嵌的宝石与符文须先摘除。</p>'
    ] : ['<p class="bag-item-description">材料在对应工坊使用，钥匙在进入魔塔时消耗；补给可在神兽或垂钓界面使用。</p>'];
    const destination = getBagItemDestination(selectedEntry);
    const primaryAction = !selectedEntry ? '' : selectedEntry.slot ? `<button id="btn-bag-equip-item" data-item-uid="${escapeText(this.selectedItemUid)}" class="mota-btn-gold" ${preview.success ? '' : 'disabled'}>穿戴装备</button>` : selectedEntry.type === 'egg' ? '<button id="btn-bag-use-egg" class="mota-btn-gold">前往孵化神兽</button>' : selectedEntry.id === 'pill_reborn' ? '<button id="btn-bag-goto-wash" class="mota-btn-gold">前往重铸神兽资质</button>' : destination ? `<button id="btn-bag-item-destination" class="mota-btn-gold">${destination.label}</button>` : '';
    const compareKeys = preview?.success ? [
      'atk', 'def', 'maxHp', 'maxMp', 'speed', 'interval',
      ...['crit', 'dodge', 'hit', 'counter', 'lifesteal', 'magicResist', 'critDmg', 'dmgResist', 'dmgBonus', 'skillLevelBonus', 'doubleStrike', 'magicDmg', 'finishDmg', 'magicAbsorb', 'armorBreak'].filter(key => preview.before[key] !== preview.after[key])
    ] : [];
    const comparison = !preview ? '' : !preview.success ? `<p class="bag-equip-warning">${escapeText(preview.msg)}</p>` : `
      <p class="bag-current-equipment">当前${escapeText(SLOT_MAP[selectedEntry.slot]?.name || '')}：${escapeText(preview.currentName || '未穿戴')}</p>
      ${selectedEntry.durability === 0 ? '<p class="bag-equip-warning">这件装备已损坏，修理后才提供属性。</p>' : ''}
      <table class="bag-comparison">
        <caption>换装后角色属性</caption>
        <thead><tr><th scope="col">属性</th><th scope="col">当前</th><th scope="col">换装后</th><th scope="col">变化</th></tr></thead>
        <tbody>${compareKeys.map(key => {
          const interval = key === 'interval';
          const before = interval ? getPlayerActionInterval(preview.before, gameState.data) : preview.before[key];
          const after = interval ? getPlayerActionInterval(preview.after, gameState.data) : preview.after[key];
          const change = after - before;
          const rounded = interval ? Number(change.toFixed(2)) : change;
          const unit = interval ? '秒' : PERCENT_STATS.has(key) ? '%' : '';
          const format = value => interval ? value.toFixed(2) : value.toLocaleString();
          const direction = rounded === 0 ? 'same' : (interval ? change < 0 : change > 0) ? 'gain' : 'loss';
          return `<tr data-compare-stat="${key}"><th scope="row">${interval ? '出手间隔' : STAT_NAMES[key]}</th><td>${format(before)}${unit}</td><td data-preview-value="${key}">${format(after)}${unit}</td><td class="bag-delta" data-direction="${direction}">${rounded > 0 ? '+' : ''}${format(rounded)}${unit}</td></tr>`;
        }).join('')}</tbody>
      </table>
      <p class="bag-comparison-note">已计入强化、耐久、镶嵌与套装属性。出手间隔越短，行动越频繁。</p>
      ${[data.equipped[selectedEntry.slot], selectedEntry].some(item => item?.runicWord) ? [data.equipped[selectedEntry.slot], selectedEntry].map((item, index) => {
        const word = RUNIC_WORDS.find(word => word.id === item?.runicWord);
        return `<p class="bag-runic-note"><b>${index ? '换装后' : '当前'}符文之语：</b>${word ? `${escapeText(word.name)}${item.durability === 0 ? '（装备损坏，未生效）' : ''}。${escapeText(word.desc)}` : '无'}</p>`;
      }).join('') : ''}`;

    this.container.innerHTML = `
      <div class="bag-workbench w-full h-full p-1.5 sm:p-2 flex flex-col select-none">
        <div class="mota-breadcrumb bag-heading">
          <h2>勇者行囊</h2>
          <button id="btn-bag-view-equipment" class="mota-btn-dark">查看已穿戴</button>
          <span class="bag-capacity" data-overflow="${data.bag.length > totalSlots}">已用 ${data.bag.length} / ${totalSlots} 格</span>
          ${expansionQuote.success ? '<button id="btn-bag-expand" class="mota-btn-dark">扩容20格</button>' : '<span>容量已达上限</span>'}
        </div>
        <div class="bag-layout flex-1 min-h-0 grid gap-2.5">
          <section class="bag-inventory mota-parchment-panel">
            <div class="bag-filters" role="group" aria-label="物品分类">
              ${filters.map(filter => `<button data-filter="${filter.id}" class="btn-bag-filter ${this.bagFilter === filter.id ? 'mota-btn-gold' : 'mota-btn-dark'}" aria-pressed="${this.bagFilter === filter.id}">${filter.name} (${filter.list.length})</button>`).join('')}
            </div>
            <div class="bag-tools">
              <label>排序 <select id="bag-sort">${[['default', '入袋顺序'], ['level', '等级优先'], ['quality', '品质优先'], ['slot', '装备部位']].map(([id, label]) => `<option value="${id}" ${this.bagSort === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
              <label>部位 <select id="bag-slot-filter"><option value="all">全部部位</option>${ITEM_SLOTS.map(part => `<option value="${part.id}" ${this.bagSlot === part.id ? 'selected' : ''}>${part.name}</option>`).join('')}</select></label>
              <label><input id="bag-wearable" type="checkbox" ${this.wearableOnly ? 'checked' : ''}>只看可穿戴</label>
            </div>
            <div class="bag-items" style="grid-template-columns:repeat(${columns},minmax(0,1fr));grid-template-rows:repeat(${rows},minmax(0,1fr))" role="group" aria-label="行囊物品，第 ${this.page + 1} 页">
              ${visibleList.map(({ item }) => `
                <button type="button" data-bag-uid="${escapeText(item.uid || item.id)}" class="bag-slot-cell" aria-label="${escapeText(item.name)}${item.stars ? `，强化 ${item.stars} 星` : ''}${item.count > 1 ? `，${item.count} 件` : ''}" title="${escapeText(item.name)}" aria-pressed="${item === selectedEntry}" style="--item-quality:${QUALITIES[item.quality]?.color || '#a7a18b'}">
                  <span class="bag-slot-art">${renderGameIcon(item, { size: 'w-full h-full' })}</span>
                  <span class="bag-slot-name">${escapeText(item.name)}</span>
                  ${item.count > 1 ? `<span class="bag-slot-count">${item.count}</span>` : ''}
                  ${item.stars > 0 ? `<span class="bag-slot-stars">+${item.stars}</span>` : ''}
                </button>`).join('')}
              ${Array.from({ length: emptyCount }, () => '<span class="bag-slot-empty" aria-hidden="true"></span>').join('')}
              ${displaySlots === 0 ? '<p class="bag-filter-empty">此分类暂无物品</p>' : ''}
            </div>
            <div class="bag-pagination"><button id="btn-bag-page-prev" class="mota-btn-dark" ${this.page === 0 ? 'disabled' : ''}>上一页</button><span aria-live="polite">第 ${this.page + 1} / ${pages} 页</span><button id="btn-bag-page-next" class="mota-btn-dark" ${this.page + 1 >= pages ? 'disabled' : ''}>下一页</button></div>
            <p class="bag-capacity-note">${data.bag.length > totalSlots ? '已超出购买容量，请出售闲置装备或扩容。' : '战利品与卸下的装备始终保留；购买新物品需有空位。'}</p>
          </section>
          <section class="bag-detail mota-parchment-panel">
            ${selectedEntry ? `
              <div class="bag-item-title">
                <div class="bag-item-icon" style="--item-quality:${QUALITIES[selectedEntry.quality]?.color || '#a7a18b'}">${renderGameIcon(selectedEntry, { size: 'w-full h-full' })}</div>
                <div class="min-w-0"><h3>${escapeText(selectedEntry.name)}</h3><p>${selectedEntry.slot ? `${escapeText(QUALITIES[selectedEntry.quality]?.name || '装备')} · ${escapeText(SLOT_MAP[selectedEntry.slot]?.name || selectedEntry.slot)} · ${selectedEntry.reqClass ? escapeText(CLASSES[selectedEntry.reqClass]?.name) : '通用'} · ${selectedEntry.reqLevel || 1}级` : selectedEntry.type === 'egg' ? '神兽契约蛋' : isSupply(selectedEntry) ? '随行补给' : '工坊材料与道具'}</p></div>
              </div>
              <div class="bag-detail-tabs" role="group" aria-label="物品详情">
                <button data-detail-tab="stats" aria-pressed="${this.detailTab === 'stats'}" class="${this.detailTab === 'stats' ? 'mota-btn-gold' : 'mota-btn-dark'}">${selectedEntry.slot ? '属性与对比' : '物品说明'}</button>
                <button data-detail-tab="actions" aria-pressed="${this.detailTab === 'actions'}" class="${this.detailTab === 'actions' ? 'mota-btn-gold' : 'mota-btn-dark'}">其他操作</button>
              </div>
              <div class="bag-detail-content" tabindex="0" aria-label="${this.detailTab === 'stats' ? '物品属性详情，可滚动' : '物品操作'}">${this.detailTab === 'stats' ? `${comparison}${selectedEntry.slot ? '<h4 class="bag-section-heading">装备基础词条</h4>' : ''}${detailLines.join('')}` : secondaryActions.join('')}</div>
              ${primaryAction ? `<div class="bag-primary-action">${!selectedEntry.slot && destination ? `<p class="bag-action-hint">使用地点：${escapeText(destination.label.replace(/^前往/, ''))}</p>` : ''}${primaryAction}</div>` : ''}
            ` : `<div class="bag-empty-detail"><h3>${data.bag.length ? '当前页暂无物品' : '行囊暂无物品'}</h3><p>${data.bag.length ? '切换分类或翻页，选择要查看的物品。' : getJourneyGuidance(data)?.title ? `下一步：${escapeText(getJourneyGuidance(data).title)}。按上方指引前往。` : '可通过野外讨伐、王都悬赏获得装备与补给。'}</p></div>`}
          </section>
        </div>
      </div>
    `;
    this.bindEvents(selectedEntry, inheritanceQuote);
    if (focus) {
      const target = [...this.container.querySelectorAll('button, select, input')].find(button =>
        (focus.id && button.id === focus.id) || (focus.uid && button.dataset.bagUid === focus.uid) ||
        (focus.filter && button.dataset.filter === focus.filter) || (focus.tab && button.dataset.detailTab === focus.tab));
      if (target && !target.disabled) target.focus({ preventScroll: true });
    }
  }

  bindEvents(selectedEntry, inheritanceQuote) {
    this.container.querySelector('#btn-bag-view-equipment').onclick = () => this.onSwitchTab('equip');
    for (const [id, field] of [['bag-sort', 'bagSort'], ['bag-slot-filter', 'bagSlot'], ['bag-wearable', 'wearableOnly']]) {
      this.container.querySelector('#' + id).onchange = event => {
        this[field] = field === 'wearableOnly' ? event.target.checked : event.target.value;
        this.page = 0;
        this.render();
      };
    }
    const destinationButton = this.container.querySelector('#btn-bag-item-destination');
    if (destinationButton) destinationButton.onclick = () => {
      const current = gameState.data.bag.find(item => (item.uid || item.id) === this.selectedItemUid);
      const destination = getBagItemDestination(current);
      if (destination) window.appInstance.handleQuestNavigation(destination.tab, destination.action);
    };
    for (const [id, delta] of [['btn-bag-page-prev', -1], ['btn-bag-page-next', 1]]) {
      const button = this.container.querySelector('#' + id);
      if (button) button.onclick = () => { this.page += delta; this.render(); };
    }
    this.container.querySelectorAll('[data-detail-tab]').forEach(button => {
      button.onclick = () => { this.detailTab = button.dataset.detailTab; this.render(); };
    });
    const inheritButton = this.container.querySelector('#btn-bag-inherit-upgrade');
    if (inheritButton) inheritButton.onclick = () => {
      gameModal.confirm(`将【${inheritanceQuote.sourceName}】的+${inheritanceQuote.sourceStars}星交给【${inheritanceQuote.targetName}】，并完成换装。旧装备保留+${inheritanceQuote.targetStars}星，回到行囊。\n费用：${inheritanceQuote.gold}金币、${inheritanceQuote.crystal}魔晶。宝石、孔位、词条各自保留，不会复制。`, () => {
        const result = gameState.inheritEquipmentUpgrade(inheritanceQuote);
        gameModal.alert(result.msg, '强化继承');
        this.render();
      }, null, '确认强化继承');
    };
    this.container.querySelectorAll('.btn-bag-remove-gem').forEach(button => {
      const index = Number(button.dataset.socket), gem = selectedEntry.gems[index], uid = selectedEntry.uid;
      button.onclick = () => {
        const result = gameState.removeBagGem(uid, index, gem);
        gameModal.alert(result.msg, '宝石摘除');
        this.render();
      };
    });

    const btnExpand = this.container.querySelector('#btn-bag-expand');
    if (btnExpand) btnExpand.addEventListener('click', () => {
      const quote = gameState.getBagExpansionQuote();
      if (!quote.success) return gameModal.alert(quote.msg, '行囊扩容');
      gameModal.confirm(`将购买容量从 ${quote.capacity} 格扩至 ${quote.nextCapacity} 格。\n消耗 ${quote.gold} 金币和 ${quote.crystal} 魔晶，物品全部保留。\n最高可扩至120格。`, () => {
        const result = gameState.expandBag(quote.capacity);
        gameModal.alert(result.msg, '行囊扩容');
        this.render();
      }, () => {}, '行囊扩容确认');
    });
    // 过滤按钮
    this.container.querySelectorAll('.btn-bag-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        this.bagFilter = btn.getAttribute('data-filter');
        if (!['all', 'equip'].includes(this.bagFilter)) { this.bagSlot = 'all'; this.wearableOnly = false; }
        this.page = 0;
        this.selectedItemUid = null;
        this.detailTab = 'stats';
        this.render();
      });
    });

    // 点击选择物品
    this.container.querySelectorAll('.bag-slot-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const uid = cell.getAttribute('data-bag-uid');
        this.selectedItemUid = uid;
        this.render();
      });
    });

    // 穿戴装备
    const btnEquip = document.getElementById('btn-bag-equip-item');
    if (btnEquip) {
      btnEquip.addEventListener('click', () => {
        const item = gameState.data.bag.find(i => (i.uid || i.id) === btnEquip.getAttribute('data-item-uid'));
        if (item && item.slot) {
          const res = gameState.equipItem(item.uid || item.id);
          gameModal.toast(res.msg);
          if (res.success) {
            const next = gameState.data.bag.find(candidate => candidate.slot && !gameState.data.equipped[candidate.slot] &&
              (candidate.reqLevel || candidate.level || 1) <= gameState.data.level &&
              (!candidate.reqClass || candidate.reqClass === gameState.data.classId));
            this.selectedItemUid = next ? next.uid || next.id : null;
          }
          this.render();
          if (res.success) {
            const selected = [...this.container.querySelectorAll('[data-bag-uid]')].find(cell => cell.dataset.bagUid === this.selectedItemUid);
            (selected || this.container.querySelector('#btn-bag-view-equipment')).focus({ preventScroll: true });
          }
        }
      });
    }

    // 装备出售
    const btnSell = document.getElementById('btn-bag-sell-equipment');
    if (btnSell) {
      btnSell.addEventListener('click', () => {
        const uid = btnSell.getAttribute('data-item-uid');
        const quote = gameState.getEquipmentSaleQuote(uid);
        if (!quote.success) return gameModal.alert(quote.msg, '装备回收');
        gameModal.confirm(`出售【${quote.name}】可获得 ${quote.gold} 金币，并释放一格行囊。\n${quote.stars ? `当前强化 +${quote.stars} 星将一并出售。\n` : ''}装备出售后无法取回，请确认。`, () => {
          const result = gameState.sellEquipment(uid, quote.gold);
          gameModal.alert(result.msg, '装备回收');
          this.selectedItemUid = null;
          this.render();
        }, () => {}, '出售闲置装备');
      });
    }

    // 孵化蛋
    const btnEgg = document.getElementById('btn-bag-use-egg');
    if (btnEgg) {
      btnEgg.addEventListener('click', () => {
        if (window.switchMainTab) {
          window.switchMainTab('pets');
          if (window.appInstance?.views?.pets) {
            window.appInstance.views.pets.currentSubTab = 'overview';
            window.appInstance.views.pets.render();
          }
        }
      });
    }

    // 潜能重铸
    const btnWash = document.getElementById('btn-bag-goto-wash');
    if (btnWash) {
      btnWash.addEventListener('click', () => {
        if (window.switchMainTab) {
          window.switchMainTab('pets');
          if (window.appInstance?.views?.pets) {
            window.appInstance.views.pets.currentSubTab = 'wash';
            window.appInstance.views.pets.render();
          }
        }
      });
    }
  }
}
