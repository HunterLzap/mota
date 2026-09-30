// 2011 经典页游纯代码高保真装备与道具浮动悬浮框 (Floating Hover Tooltip)
// 100% 解决面板撑破工作台问题：悬浮窗绝不占用 DOM 布局流，智能边缘吸附与边界检测
import { QUALITIES, SLOT_MAP, OFFICIAL_SETS } from '../config/items.js';
import { gameState } from '../core/state.js';
import { getVectorIcon } from '../assets/vectorIcons.js';
import { renderGameIcon } from './iconHelper.js';

class TooltipManager {
  constructor() {
    this.el = null;
  }

  init() {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.id = 'mota-global-tooltip';
    this.el.className = 'fixed z-[9999] pointer-events-none hidden mota-tooltip-panel p-3.5 max-w-sm text-xs shadow-2xl transition-opacity duration-150';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
  }

  renderItemHtml(item) {
    if (!item) return '';

    const data = gameState.data;
    const isEquip = !!item.slot;
    const slotObj = isEquip ? (SLOT_MAP[item.slot] || { name: item.slot }) : null;
    const qObj = QUALITIES[item.quality] || QUALITIES.white;
    const isEquipped = isEquip && data.equipped[item.slot] && data.equipped[item.slot].uid === item.uid;
    const curEquippedInSlot = isEquip ? data.equipped[item.slot] : null;

    // 套装加成
    let setInfo = null;
    if (item.setId && OFFICIAL_SETS[item.setId]) {
      const set = OFFICIAL_SETS[item.setId];
      let wornCount = 0;
      Object.values(data.equipped).forEach(eq => {
        if (eq && eq.setId === item.setId) wornCount++;
      });
      setInfo = { set, wornCount };
    }

    // 计算对比差值
    let diffHtml = '';
    if (isEquip && !isEquipped && curEquippedInSlot) {
      const statsDiff = [];
      const curStats = curEquippedInSlot.stats || {};
      const newStats = item.stats || {};
      const curMult = 1 + (curEquippedInSlot.stars || 0) * 0.12;
      const newMult = 1 + (item.stars || 0) * 0.12;

      const statKeys = [
        { key: 'atk', name: '攻击' },
        { key: 'def', name: '防御' },
        { key: 'hp', name: '生命' },
        { key: 'speed', name: '速度' },
        { key: 'crit', name: '暴击', pct: true }
      ];

      statKeys.forEach(s => {
        const vOld = Math.floor((curStats[s.key] || 0) * (s.pct ? 1 : curMult));
        const vNew = Math.floor((newStats[s.key] || 0) * (s.pct ? 1 : newMult));
        const diff = vNew - vOld;
        if (diff !== 0) {
          statsDiff.push({
            name: s.name,
            diff: diff > 0 ? `+${diff}${s.pct ? '%' : ''}` : `${diff}${s.pct ? '%' : ''}`,
            isPositive: diff > 0
          });
        }
      });

      if (statsDiff.length > 0) {
        diffHtml = `
          <div class="mt-2.5 pt-2 border-t border-amber-900/60">
            <div class="text-[10px] text-slate-300 font-bold mb-1">
              替换对比【${curEquippedInSlot.name}】:
            </div>
            <div class="flex flex-wrap gap-1">
              ${statsDiff.map(d => `
                <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  d.isPositive ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'bg-red-950 text-red-300 border border-red-700'
                }">
                  ${d.name} ${d.diff}
                </span>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    return `
      <div class="space-y-2 min-w-[240px]">
        <!-- 头部 -->
        <div class="flex items-center justify-between border-b border-amber-900/60 pb-2">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded mota-slot-socket p-1 flex items-center justify-center flex-shrink-0">
              ${renderGameIcon(item, { size: 'w-7 h-7' })}
            </div>
            <div>
              <div class="font-black text-sm" style="color: ${qObj.color};">
                ${item.name} ${item.stars ? `<span class="text-amber-300 font-mono font-bold">+${item.stars}星</span>` : ''}
              </div>
              <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span style="color: ${qObj.color}; font-bold;">[${qObj.name}]</span>
                ${slotObj ? `<span>• 部位: ${slotObj.name}</span>` : ''}
                ${item.count > 1 ? `<span class="text-amber-300 font-mono font-bold">• 数量: x${item.count}</span>` : ''}
              </div>
            </div>
          </div>
          ${isEquipped ? `
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold self-start">
              已穿戴
            </span>
          ` : ''}
        </div>

        ${isEquip ? `
          <div class="flex items-center justify-between text-[10px]">
            <span class="${data.level < (item.reqLevel || 1) ? 'text-red-400 font-bold' : 'text-slate-400'}">
              需求: Lv.${item.reqLevel || 1} ${data.level < (item.reqLevel || 1) ? '(等级不足)' : '(可装备)'}
            </span>
            <span class="text-amber-200 font-mono">
              耐久: ${item.durability || 100}/${item.maxDurability || 100}
            </span>
          </div>
        ` : ''}

        <!-- 基础属性加成 -->
        ${isEquip && item.stats ? `
          <div class="bg-black/60 rounded p-2 border border-slate-800 text-[10px] space-y-1">
            <div class="text-slate-400 font-bold flex justify-between">
              <span>属性加成:</span>
              ${item.stars ? `<span class="text-amber-300 font-mono">(+${item.stars * 12}% 升星加成)</span>` : ''}
            </div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-0.5">
              ${item.stats.atk ? `<div class="text-amber-300">攻击: +${Math.floor(item.stats.atk * (1 + (item.stars || 0) * 0.12))}</div>` : ''}
              ${item.stats.def ? `<div class="text-blue-300">防御: +${Math.floor(item.stats.def * (1 + (item.stars || 0) * 0.12))}</div>` : ''}
              ${item.stats.hp ? `<div class="text-red-400">生命: +${Math.floor(item.stats.hp * (1 + (item.stars || 0) * 0.12))}</div>` : ''}
              ${item.stats.mp ? `<div class="text-indigo-300">法力: +${Math.floor(item.stats.mp * (1 + (item.stars || 0) * 0.12))}</div>` : ''}
              ${item.stats.speed ? `<div class="text-emerald-400">速度: +${Math.floor(item.stats.speed * (1 + (item.stars || 0) * 0.12))}</div>` : ''}
              ${item.stats.crit ? `<div class="text-yellow-400">暴击: +${item.stats.crit}%</div>` : ''}
              ${item.stats.counter ? `<div class="text-orange-400">反击: +${item.stats.counter}%</div>` : ''}
              ${item.stats.lifesteal ? `<div class="text-rose-400">吸血: +${item.stats.lifesteal}%</div>` : ''}
            </div>
          </div>
        ` : ''}

        <!-- 宝石孔洞 -->
        ${isEquip && (item.sockets > 0 || (item.gems && item.gems.length > 0)) ? `
          <div class="bg-black/50 rounded p-1.5 border border-slate-800 text-[9px] flex items-center gap-1.5 flex-wrap">
            <span class="text-slate-400">宝石孔 (${(item.gems || []).length}/${item.sockets || 1}):</span>
            ${(item.gems || []).map(g => `<span class="text-amber-300 inline-flex items-center gap-1">${renderGameIcon(g, { size: 'w-3.5 h-3.5' })} ${g.name}</span>`).join('')}
            ${Array.from({ length: Math.max(0, (item.sockets || 0) - (item.gems || []).length) }).map(() => `
              <span class="text-slate-600">[空]</span>
            `).join('')}
          </div>
        ` : ''}

        <!-- 套装属性 -->
        ${setInfo ? `
          <div class="bg-amber-950/40 rounded p-2 border border-amber-600/40 text-[9px] space-y-0.5">
            <div class="text-amber-300 font-bold flex justify-between">
              <span>${setInfo.set.name}</span>
              <span>(${setInfo.wornCount}/4)</span>
            </div>
            <div class="${setInfo.wornCount >= 2 ? 'text-emerald-300 font-bold' : 'text-slate-600'}">
              • (2件) ${setInfo.set.bonus2.desc}
            </div>
            <div class="${setInfo.wornCount >= 4 ? 'text-emerald-300 font-bold' : 'text-slate-600'}">
              • (4件) ${setInfo.set.bonus4.desc}
            </div>
          </div>
        ` : ''}

        <!-- 物品描述 -->
        ${item.desc ? `
          <div class="text-slate-300 text-[10px] leading-snug bg-black/40 p-1.5 rounded border border-slate-800/80">
            ${item.desc}
          </div>
        ` : ''}

        <!-- 差值对比 -->
        ${diffHtml}

        <!-- 快捷操作提示 -->
        <div class="text-[9px] text-cyan-300/80 font-mono text-center pt-1 border-t border-slate-800">
          ${isEquip ? (isEquipped ? '【点击卸下装备】' : '【点击直接穿戴入身】') : '【点击使用/交互】'}
        </div>
      </div>
    `;
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

    // 智能右侧与底部边界防溢出
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = e.clientX - tooltipWidth - padding;
    }
    if (y + tooltipHeight > window.innerHeight - padding) {
      y = window.innerHeight - tooltipHeight - padding;
    }

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
      if (item) this.show(item, e);
    });

    element.addEventListener('mousemove', (e) => {
      this.updatePosition(e);
    });

    element.addEventListener('mouseleave', () => {
      this.hide();
    });
  }
}

export const tooltip = new TooltipManager();
