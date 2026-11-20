// 装备/道具浮动悬浮属性卡（全局）：悬停 0.2s 显示，字段对齐当前真实系统。
import { QUALITIES, SLOT_MAP, OFFICIAL_SETS } from '../config/items.js';
import { gameState } from '../core/state.js';

const STAT_NAMES = {
  atk: '攻击', def: '防御', hp: '生命', maxHp: '生命', mp: '魔力', maxMp: '魔力',
  speed: '速度', str: '力量', int: '智力', dex: '敏捷', crit: '暴击', dodge: '闪避',
  hit: '命中', counter: '反击', lifesteal: '吸血', magicResist: '魔抗', critDmg: '暴伤',
  dmgResist: '减伤', dmgBonus: '伤害加成', skillLevelBonus: '技能等级', magicAbsorb: '法力吸收'
};
const PERCENT_STATS = new Set(['crit', 'dodge', 'hit', 'counter', 'lifesteal', 'magicResist', 'critDmg', 'dmgResist', 'dmgBonus', 'doubleStrike', 'magicDmg', 'finishDmg', 'magicAbsorb', 'armorBreak']);
const ARMOR_SLOTS = new Set(['armor', 'pants', 'cloak', 'helmet', 'gloves', 'boots', 'belt', 'mirror']);
const JEWEL_SLOTS = new Set(['necklace', 'ring', 'bracelet']);

class TooltipManager {
  constructor() { this.el = null; this._delay = null; }

  init() {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.id = 'mota-global-tooltip';
    this.el.className = 'fixed z-[9999] pointer-events-none hidden mota-tooltip-panel p-3.5 max-w-sm text-xs shadow-2xl transition-opacity duration-150';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
  }

  slotType(item) {
    if (item.slot === 'weapon') return '武器';
    if (ARMOR_SLOTS.has(item.slot)) return '防具';
    if (JEWEL_SLOTS.has(item.slot)) return '首饰';
    return item.type === 'egg' ? '神兽契约蛋' : '材料/道具';
  }

  renderItemHtml(item) {
    if (!item) return '';
    const data = gameState.data;
    const isEquip = !!item.slot;
    const qObj = QUALITIES[item.quality] || QUALITIES.white;
    const slotName = isEquip ? (SLOT_MAP[item.slot]?.name || item.slot) : this.slotType(item);
    const typeLabel = this.slotType(item);
    const typeText = isEquip ? (slotName === typeLabel ? slotName : `${slotName} · ${typeLabel}`) : slotName;
    const levelReq = item.reqLevel || item.level || 1;
    const classReq = item.reqClass ? (item.reqClass === 'warrior' ? '战士' : item.reqClass === 'mage' ? '法师' : item.reqClass === 'hunter' ? '猎人' : item.reqClass) : '通用';

    let setHtml = '';
    if (isEquip && item.setId && OFFICIAL_SETS[item.setId]) {
      const set = OFFICIAL_SETS[item.setId];
      let worn = 0;
      Object.values(data.equipped || {}).forEach(eq => { if (eq && eq.setId === item.setId) worn++; });
      setHtml = `<div class="mt-2 pt-1 border-t border-amber-900/60 text-[10px] leading-snug">
        <div class="text-amber-200 font-bold">${set.name}套装 (${worn}/7)</div>
        <div class="text-slate-300">2件效果：${set.bonus2?.desc || '-'}</div>
        <div class="text-slate-300">4件效果：${set.bonus4?.desc || '-'}</div>
        <div class="text-slate-300">7件效果：${set.bonus7?.desc || '待实现'}</div>
      </div>`;
    }

    const statsHtml = isEquip ? `<div class="mt-1">${Object.entries(item.stats || {}).map(([k, v]) => `<div class="flex justify-between gap-2 border-b border-amber-900/30 py-0.5"><span class="text-slate-300">${STAT_NAMES[k] || k}</span><b class="text-amber-100">+${v}${PERCENT_STATS.has(k) ? '%' : ''}</b></div>`).join('')}</div>` : '';

    let sellGold = null;
    if (isEquip) {
      try { const quote = gameState.getEquipmentSaleQuote(item.uid || item.id); if (quote?.success) sellGold = quote.gold; } catch (e) { sellGold = null; }
    }

    return `<div class="leading-snug">
      <div class="flex items-center gap-2 pb-1 border-b border-amber-900/60">
        <b class="text-[13px] text-amber-200">${item.name || '未知物品'}</b>
        <span class="text-[10px]" style="color:${qObj.color || '#ccc'}">${qObj.name || '普通'}</span>
      </div>
      <div class="mt-1">
        <div class="flex justify-between gap-2 py-0.5"><span class="text-slate-300">装备类型</span><b class="text-amber-100">${typeText}</b></div>
        ${isEquip ? `<div class="flex justify-between gap-2 py-0.5"><span class="text-slate-300">星级</span><b class="text-amber-100">+${item.stars || 0} 星</b></div>` : ''}
        ${isEquip ? `<div class="flex justify-between gap-2 py-0.5"><span class="text-slate-300">出售价格</span><b class="text-amber-100">${sellGold != null ? sellGold.toLocaleString() + ' 金币' : '不可出售'}</b></div>` : ''}
      </div>
      ${statsHtml}
      ${isEquip ? `<div class="mt-1"><div class="flex justify-between gap-2 py-0.5"><span class="text-slate-300">耐久度</span><b class="text-amber-100">${item.durability ?? 100}/${item.maxDurability ?? 100}</b></div>
        <div class="flex justify-between gap-2 py-0.5"><span class="text-slate-300">孔数</span><b class="text-amber-100">${(item.gems || []).length}/${item.sockets || 0}</b></div>
        <div class="text-[10px] text-slate-400">可使用打孔水晶锻造提升孔数上限</div>
        <div class="flex justify-between gap-2 py-0.5"><span class="text-slate-300">等级需求</span><b class="text-amber-100">Lv.${levelReq}</b></div>
        <div class="flex justify-between gap-2 py-0.5"><span class="text-slate-300">职业需求</span><b class="text-amber-100">${classReq}</b></div>
      </div>` : ''}
      ${setHtml}
      ${item.source ? `<div class="text-[10px] text-slate-400 mt-1">来源：${item.source}</div>` : ''}
      ${item.desc ? `<div class="text-slate-300 text-[10px] leading-snug bg-black/40 p-1.5 rounded border border-slate-800/80 mt-1">${item.desc}</div>` : ''}
      <div class="text-[9px] text-cyan-300/80 font-mono text-center pt-1 border-t border-slate-800 mt-1">点击鼠标左键可对装备进行操作</div>
    </div>`;
  }

  show(item, mouseEvent) {
    if (!item) return;
    this.init();
    this.el.innerHTML = this.renderItemHtml(item);
    this.el.style.display = 'block';
    this.el.style.opacity = '1';
    this.updatePosition(mouseEvent);
  }

  updatePosition(e) {
    if (!this.el || this.el.style.display === 'none') return;
    const tooltipWidth = this.el.offsetWidth || 260;
    const tooltipHeight = this.el.offsetHeight || 320;
    const padding = 16;
    let x = e.clientX + padding;
    let y = e.clientY + padding;
    if (x + tooltipWidth > window.innerWidth - padding) x = e.clientX - tooltipWidth - padding;
    if (y + tooltipHeight > window.innerHeight - padding) y = window.innerHeight - tooltipHeight - padding;
    this.el.style.left = `${Math.max(padding, x)}px`;
    this.el.style.top = `${Math.max(padding, y)}px`;
  }

  hide() {
    if (!this.el) return;
    this.el.style.display = 'none';
    this.el.style.opacity = '0';
  }

  attach(element, getItemFn) {
    if (!element) return;
    element.addEventListener('mouseenter', (e) => {
      const item = typeof getItemFn === 'function' ? getItemFn() : getItemFn;
      if (!item) return;
      clearTimeout(this._delay);
      this._delay = setTimeout(() => this.show(item, e), 180);
    });
    element.addEventListener('mousemove', (e) => { this.updatePosition(e); });
    element.addEventListener('mouseleave', () => { clearTimeout(this._delay); this.hide(); });
  }

  // 通用文字浮层（战报伤害类型说明等），复用同一全局 tooltip
  showText(html, mouseEvent) {
    if (!html) return;
    this.init();
    this.el.innerHTML = html;
    this.el.style.display = 'block';
    this.el.style.opacity = '1';
    this.updatePosition(mouseEvent);
  }

  attachText(element, getHtmlFn, delay = 120) {
    if (!element) return;
    element.addEventListener('mouseenter', (e) => {
      const html = typeof getHtmlFn === 'function' ? getHtmlFn() : getHtmlFn;
      if (!html) return;
      clearTimeout(this._delay);
      this._delay = setTimeout(() => this.showText(html, e), delay);
    });
    element.addEventListener('mousemove', (e) => { this.updatePosition(e); });
    element.addEventListener('mouseleave', () => { clearTimeout(this._delay); this.hide(); });
  }
}

export const tooltip = new TooltipManager();
