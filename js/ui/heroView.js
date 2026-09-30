// 2011 经典页游纯正【人物】与【装备】独立全屏视图 (精致紧凑，100% 单屏可视)
import { gameState } from '../core/state.js';
import { CLASSES, NATIONS } from '../config/classes.js';
import { ITEM_SLOTS, SLOT_MAP, OFFICIAL_SETS } from '../config/items.js';
import { getVectorIcon } from '../assets/vectorIcons.js';
import { renderGameIcon, renderSlotWatermark } from './iconHelper.js';
import { tooltip } from './tooltip.js';
import { gameModal } from './modal.js';

// ==========================================
// 1. 【人物面板】(Hero Profile View)
// ==========================================
export class HeroView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render() {
    if (!this.container) return;
    const data = gameState.data;
    const stats = gameState.getEffectiveStats();
    const cls = CLASSES[data.classId] || CLASSES.warrior;
    const nation = NATIONS[data.nation] || NATIONS.aden;
    const nextExp = gameState.getNextLevelExp(data.level);
    const expPercent = Math.min(100, Math.floor((data.exp / nextExp) * 100));

    this.container.innerHTML = `
      <div class="w-full h-full p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑导航条 (精炼纯净) -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-200 font-bold text-xs">【人物】</span>
          </div>
          <div class="text-[11px] text-slate-300 font-mono">
            剩余自由潜能点: <b class="text-amber-400 text-sm font-bold">${data.freeStatPoints}</b> 点
          </div>
        </div>

        <!-- 主体：左右两大核心面板 (舒展大方，告别拥挤堆砌) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
          
          <!-- 左侧：勇者身份、阵营与四维分配 (5列) -->
          <div class="md:col-span-5 mota-parchment-panel p-3.5 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
            <div class="space-y-3">
              
              <!-- 身份卡特写 -->
              <div class="flex items-center gap-3 pb-2.5 border-b border-[#4a3520]/70">
                <div class="w-12 h-12 rounded-xl bg-black/70 border-2 border-amber-400/80 flex items-center justify-center p-1.5 shadow-inner flex-shrink-0">
                  ${renderGameIcon(cls.id, { size: 'w-full h-full' })}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h2 class="text-base font-black text-amber-300 truncate">${data.name}</h2>
                    <span class="text-xs font-mono text-emerald-400 font-bold flex-shrink-0">Lv.${data.level}</span>
                  </div>
                  <div class="text-[11px] text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-200 border border-slate-700 font-medium text-[10px]">${gameState.getPromotedClassName()}</span>
                    <span class="px-2 py-0.5 rounded bg-blue-950/80 text-cyan-300 border border-blue-800 font-medium text-[10px]">${nation.name.split(' ')[0]}</span>
                    <span class="text-purple-300 font-medium text-[10px]">【${data.royalTrials?.currentTitle || data.title}】</span>
                  </div>
                </div>
              </div>

              <!-- 经验条与城邦光环 -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-[11px] font-mono">
                  <span class="text-emerald-400 font-medium">历练经验</span>
                  <span class="text-slate-400">${data.exp} / ${nextExp} (${expPercent}%)</span>
                </div>
                <div class="w-full h-2 rounded-full mota-bar-frame overflow-hidden bg-black/60">
                  <div class="h-full mota-exp-fill rounded-full transition-all duration-300" style="width: ${expPercent}%;"></div>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>城邦：${nation.name}</span>
                  <span class="text-amber-300/90">${nation.buffDesc}</span>
                </div>
              </div>

              <!-- 四维属性潜能加点 (宽敞通透，卡片不臃肿) -->
              <div class="space-y-2 pt-1">
                <div class="text-xs font-bold text-amber-300 flex items-center justify-between">
                  <span>核心潜能加点</span>
                  <span class="text-[10px] text-slate-400 font-mono">自由点: <b class="text-amber-400">${data.freeStatPoints}</b></span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs">
                  <!-- 力量 -->
                  <div class="p-2 rounded-lg bg-black/40 border border-slate-800/80 flex items-center justify-between hover:border-amber-500/50 transition-colors">
                    <div>
                      <div class="font-bold text-amber-200 text-xs">力量</div>
                      <div class="text-xs text-amber-400 font-mono font-bold mt-0.5">${stats.str} <span class="text-slate-500 font-normal text-[10px]">(+${data.allocatedStats.str})</span></div>
                    </div>
                    <button data-stat="str" class="btn-add-stat w-6 h-6 rounded mota-btn-gold text-xs font-bold flex items-center justify-center ${data.freeStatPoints > 0 ? '' : 'opacity-40 cursor-not-allowed'}">
                      +
                    </button>
                  </div>

                  <!-- 敏捷 -->
                  <div class="p-2 rounded-lg bg-black/40 border border-slate-800/80 flex items-center justify-between hover:border-green-500/50 transition-colors">
                    <div>
                      <div class="font-bold text-green-200 text-xs">敏捷</div>
                      <div class="text-xs text-green-400 font-mono font-bold mt-0.5">${stats.dex} <span class="text-slate-500 font-normal text-[10px]">(+${data.allocatedStats.dex})</span></div>
                    </div>
                    <button data-stat="dex" class="btn-add-stat w-6 h-6 rounded mota-btn-gold text-xs font-bold flex items-center justify-center ${data.freeStatPoints > 0 ? '' : 'opacity-40 cursor-not-allowed'}">
                      +
                    </button>
                  </div>

                  <!-- 智力 -->
                  <div class="p-2 rounded-lg bg-black/40 border border-slate-800/80 flex items-center justify-between hover:border-blue-500/50 transition-colors">
                    <div>
                      <div class="font-bold text-blue-200 text-xs">智力</div>
                      <div class="text-xs text-blue-400 font-mono font-bold mt-0.5">${stats.int} <span class="text-slate-500 font-normal text-[10px]">(+${data.allocatedStats.int})</span></div>
                    </div>
                    <button data-stat="int" class="btn-add-stat w-6 h-6 rounded mota-btn-gold text-xs font-bold flex items-center justify-center ${data.freeStatPoints > 0 ? '' : 'opacity-40 cursor-not-allowed'}">
                      +
                    </button>
                  </div>

                  <!-- 体质 -->
                  <div class="p-2 rounded-lg bg-black/40 border border-slate-800/80 flex items-center justify-between hover:border-rose-500/50 transition-colors">
                    <div>
                      <div class="font-bold text-rose-200 text-xs">体质</div>
                      <div class="text-xs text-rose-400 font-mono font-bold mt-0.5">${stats.con} <span class="text-slate-500 font-normal text-[10px]">(+${data.allocatedStats.con})</span></div>
                    </div>
                    <button data-stat="con" class="btn-add-stat w-6 h-6 rounded mota-btn-gold text-xs font-bold flex items-center justify-center ${data.freeStatPoints > 0 ? '' : 'opacity-40 cursor-not-allowed'}">
                      +
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <!-- 快捷跳转按键 -->
            <div class="pt-2 border-t border-[#4a3520]/70 flex items-center justify-between gap-2.5 text-xs mt-2">
              <button id="btn-quick-goto-equip" class="flex-1 mota-btn-dark py-2 rounded-lg text-xs font-semibold text-amber-200 flex items-center justify-center gap-1.5">
                <span>前往装备 -></span>
              </button>
              <button id="btn-quick-to-bag" class="mota-btn-dark px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1 border-slate-700">
                <span>打开背包 -></span>
              </button>
            </div>
          </div>

          <!-- 右侧：全套实战攻防与高阶战斗数值看板 (7列) -->
          <div class="md:col-span-7 mota-parchment-panel p-3.5 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
            <div class="space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]/70">
                <div class="flex items-center gap-2">
                  <h3 class="font-black text-sm text-amber-300">勇者战斗属性全览</h3>
                </div>
                <span class="text-[11px] text-slate-400 font-mono">全局战力综合核算</span>
              </div>

              <!-- 四大基础核心属性 (生命、法力、攻击、防御，开阔大气) -->
              <div class="grid grid-cols-4 gap-2.5">
                <div class="p-2.5 bg-black/50 rounded-xl border border-red-900/40 text-center">
                  <div class="text-[11px] text-red-400 font-bold">生命 HP</div>
                  <div class="text-base font-black text-red-300 font-mono mt-0.5">${stats.maxHp.toLocaleString()}</div>
                </div>
                <div class="p-2.5 bg-black/50 rounded-xl border border-blue-900/40 text-center">
                  <div class="text-[11px] text-blue-400 font-bold">法力 MP</div>
                  <div class="text-base font-black text-blue-300 font-mono mt-0.5">${stats.maxMp.toLocaleString()}</div>
                </div>
                <div class="p-2.5 bg-black/50 rounded-xl border border-amber-900/40 text-center">
                  <div class="text-[11px] text-amber-400 font-bold">攻击 ATK</div>
                  <div class="text-base font-black text-amber-300 font-mono mt-0.5">${stats.atk.toLocaleString()}</div>
                </div>
                <div class="p-2.5 bg-black/50 rounded-xl border border-emerald-900/40 text-center">
                  <div class="text-[11px] text-emerald-400 font-bold">防御 DEF</div>
                  <div class="text-base font-black text-emerald-300 font-mono mt-0.5">${stats.def.toLocaleString()}</div>
                </div>
              </div>

              <!-- 高阶实战衍生属性 (网格布局舒适通透，去重除框) -->
              <div class="p-3 rounded-xl bg-black/30 border border-slate-800/80">
                <div class="text-[11px] font-bold text-amber-300 mb-2 flex items-center justify-between">
                  <span>高阶实战衍生属性</span>
                  <span class="text-[10px] text-slate-500 font-mono">命中/闪避/暴击全核算</span>
                </div>
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                  <div class="flex items-center justify-between border-b border-slate-800/50 pb-1">
                    <span class="text-slate-400 text-[11px]">先手速度</span>
                    <span class="text-yellow-300 font-mono font-bold">${stats.speed}</span>
                  </div>
                  <div class="flex items-center justify-between border-b border-slate-800/50 pb-1">
                    <span class="text-slate-400 text-[11px]">致命暴击</span>
                    <span class="text-red-400 font-mono font-bold">${stats.crit}%</span>
                  </div>
                  <div class="flex items-center justify-between border-b border-slate-800/50 pb-1">
                    <span class="text-slate-400 text-[11px]">敏捷闪避</span>
                    <span class="text-green-400 font-mono font-bold">${stats.dodge}%</span>
                  </div>
                  <div class="flex items-center justify-between border-b border-slate-800/50 pb-1">
                    <span class="text-slate-400 text-[11px]">精准命中</span>
                    <span class="text-cyan-400 font-mono font-bold">${stats.hit}%</span>
                  </div>
                  <div class="flex items-center justify-between border-b border-slate-800/50 pb-1">
                    <span class="text-slate-400 text-[11px]">正统反击</span>
                    <span class="text-amber-400 font-mono font-bold">${stats.counter}%</span>
                  </div>
                  <div class="flex items-center justify-between border-b border-slate-800/50 pb-1">
                    <span class="text-slate-400 text-[11px]">战阵吸血</span>
                    <span class="text-rose-400 font-mono font-bold">${stats.lifesteal || 0}%</span>
                  </div>
                  <div class="flex items-center justify-between border-b border-slate-800/50 pb-1">
                    <span class="text-slate-400 text-[11px]">魔法抗性</span>
                    <span class="text-indigo-400 font-mono font-bold">${stats.magicResist || 0}</span>
                  </div>
                  <div class="flex items-center justify-between border-b border-slate-800/50 pb-1">
                    <span class="text-slate-400 text-[11px]">职业系别</span>
                    <span class="text-amber-200 font-mono text-[11px] truncate">${gameState.getPromotedClassName()}</span>
                  </div>
                </div>
              </div>

              <!-- 职业特色战斗奥义 -->
              <div class="px-3 py-2 rounded-xl bg-amber-950/20 border border-amber-600/30 text-xs flex items-start gap-2">
                <span class="font-bold text-amber-300 flex-shrink-0">【${cls.name}】奥义:</span>
                <span class="text-slate-300 text-[11px] leading-relaxed">${cls.description}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.btn-add-stat').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-stat');
        if (window.addStat) window.addStat(type);
      });
    });

    const btnGotoEquip = document.getElementById('btn-quick-goto-equip');
    if (btnGotoEquip) {
      btnGotoEquip.addEventListener('click', () => {
        if (window.switchMainTab) window.switchMainTab('equip');
      });
    }

    const btnGotoBag = document.getElementById('btn-quick-goto-bag');
    if (btnGotoBag) {
      btnGotoBag.addEventListener('click', () => {
        if (window.switchMainTab) window.switchMainTab('bag');
      });
    }
  }
}

// ==========================================
// 2. 【装备面板】(Equipment Paperdoll View)
// ==========================================
export class EquipView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render() {
    if (!this.container) return;
    const data = gameState.data;
    const cls = CLASSES[data.classId] || CLASSES.warrior;
    const equipped = data.equipped || {};

    // 统计当前套装部件数量
    const setCounts = {};
    Object.values(equipped).forEach(item => {
      if (item && item.setId) {
        setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
      }
    });

    // 左右各 5 槽位布局
    const leftSlots = [
      { key: 'helmet', name: '头盔' },
      { key: 'necklace', name: '项链' },
      { key: 'weapon', name: '武器' },
      { key: 'gloves', name: '护手' },
      { key: 'ring', name: '戒指' }
    ];

    const rightSlots = [
      { key: 'armor', name: '护胸' },
      { key: 'cloak', name: '披风' },
      { key: 'belt', name: '腰带' },
      { key: 'pants', name: '护腿' },
      { key: 'boots', name: '战靴' }
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
        <div class="relative flex items-center gap-2 p-1.5 sm:p-2 rounded-lg bg-black/30 border border-[#4a3520]/60 hover:border-amber-400/80 transition-all group">
          <div class="w-8 h-8 rounded-lg bg-black/70 border-2 ${qualityBorder} flex items-center justify-center flex-shrink-0 relative overflow-hidden p-1">
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

          <div class="min-w-0 flex-1 leading-tight">
            <div class="text-xs font-bold truncate ${item ? 'text-amber-200' : 'text-slate-500'}">
              ${item ? item.name : `${slot.name} (空)`}
            </div>
            ${item ? `
              <div class="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span>耐久:${item.durability || 100}</span>
                ${item.setId ? `<span class="text-purple-300 font-sans text-[9px]">[${OFFICIAL_SETS[item.setId]?.name || '套装'}]</span>` : ''}
              </div>
            ` : `
              <div class="text-[10px] text-slate-600">点击行囊穿戴</div>
            `}
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
      <div class="w-full h-full p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑导航条 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-200 font-bold text-xs">【装备】</span>
            <span class="text-slate-400 text-[11px] font-mono">已穿戴: <b class="text-amber-300">${equippedCount}</b> / 10</span>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-auto-equip-strongest" class="mota-btn-gold px-2.5 py-1 rounded-lg text-xs font-bold shadow flex items-center gap-1">
              <span>一键穿戴最强装备</span>
            </button>
            <button id="btn-quick-goto-smithy" class="mota-btn-dark px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-200 hover:border-amber-400 flex items-center gap-1">
              <span>前往铁匠铺升星 -></span>
            </button>
          </div>
        </div>

        <!-- 主体：三列宏伟纸娃娃殿堂 (左5槽 + 中间纸娃娃身姿 + 右5槽，开阔通透) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
          
          <!-- 左侧 5 大装备槽位 (3列) -->
          <div class="md:col-span-3 mota-parchment-panel p-3 rounded-xl flex flex-col justify-between border border-[#caa048]">
            <div class="text-xs font-bold text-amber-300 pb-1.5 border-b border-[#4a3520]/70 flex items-center justify-between">
              <span>武器与饰品</span>
              <span class="text-[10px] text-slate-400 font-mono">左翼 5 位</span>
            </div>
            <div class="space-y-2 my-auto py-1">
              ${leftSlots.map(s => renderSlot(s)).join('')}
            </div>
          </div>

          <!-- 中间：英雄全身身姿特写与套装羁绊共鸣 (6列) -->
          <div class="md:col-span-6 mota-parchment-panel p-3.5 sm:p-4 rounded-xl flex flex-col justify-between border-2 border-[#caa048] relative overflow-hidden">
            
            <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]/70">
              <div>
                <h3 class="text-xs font-black text-amber-300">亚诺英雄身姿 · 战阵威仪</h3>
              </div>
              <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono">
                ${gameState.getPromotedClassName()}
              </span>
            </div>

            <!-- 纸娃娃英雄身姿特写 (开阔舒适) -->
            <div class="my-auto py-3 flex flex-col items-center justify-center relative">
              <div class="w-20 h-20 rounded-full bg-radial-gradient from-amber-500/20 via-black/40 to-transparent border-2 border-amber-400/50 flex items-center justify-center p-2 shadow-[0_0_25px_rgba(245,192,66,0.3)] animate-pulse">
                ${renderGameIcon(cls.id, { size: 'w-full h-full' })}
              </div>
              <div class="mt-2 text-center">
                <div class="text-sm font-black text-amber-200 tracking-wider">${data.name}</div>
                <div class="text-[11px] text-slate-400 font-mono mt-0.5">${data.royalTrials?.currentTitle || data.title}</div>
              </div>
            </div>

            <!-- 套装羁绊激活一览 (开阔精致) -->
            <div class="p-2.5 rounded-xl bg-black/40 border border-[#4a3520]/70 space-y-1 text-xs">
              <div class="font-bold text-purple-300 flex items-center justify-between text-[11px]">
                <span>远古套装共鸣羁绊</span>
                <button id="btn-view-sets-compendium" class="text-[10px] text-amber-300 hover:text-amber-100 underline decoration-amber-500 cursor-pointer">
                  查看13远古套装全景图鉴
                </button>
              </div>
              ${Object.keys(setCounts).length === 0 ? `
                <div class="text-[11px] text-slate-500 italic py-1 text-center">
                  当前尚未凑齐同名套装部件，在魔塔高层与铁匠铺中获取成套神装！
                </div>
              ` : `
                <div class="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                  ${Object.entries(setCounts).map(([setId, cnt]) => {
                    const setCfg = OFFICIAL_SETS[setId];
                    if (!setCfg) return '';
                    return `
                      <div class="flex items-center justify-between text-[11px] p-1.5 rounded bg-black/40 border border-purple-900/40">
                        <span class="font-bold text-amber-200">【${setCfg.name}】(${cnt}件)</span>
                        <span class="text-emerald-400 font-mono">
                          ${cnt >= 4 ? (setCfg.bonus4?.desc || setCfg.bonus4Desc) : cnt >= 2 ? (setCfg.bonus2?.desc || setCfg.bonus2Desc) : '未激活 (需2件)'}
                        </span>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>

            <!-- 底部操作导航 -->
            <div class="pt-2 border-t border-[#4a3520]/70 flex items-center justify-between gap-3 text-xs mt-2">
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
            <div class="text-xs font-bold text-amber-300 pb-1.5 border-b border-[#4a3520]/70 flex items-center justify-between">
              <span>战甲与护具</span>
              <span class="text-[10px] text-slate-400 font-mono">右翼 5 位</span>
            </div>
            <div class="space-y-2 my-auto py-1">
              ${rightSlots.map(s => renderSlot(s)).join('')}
            </div>
          </div>

        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // 智能穿戴最强装备
    const btnAuto = document.getElementById('btn-auto-equip-strongest');
    if (btnAuto) {
      btnAuto.addEventListener('click', () => {
        const res = gameState.autoEquipBest();
        gameModal.toast(res.msg);
        this.render();
      });
    }

    // 前往铁匠铺
    const btnSmithy = document.getElementById('btn-quick-goto-smithy');
    if (btnSmithy) {
      btnSmithy.addEventListener('click', () => {
        if (window.switchMainTab) {
          window.switchMainTab('town');
          if (window.appInstance?.views?.town) {
            window.appInstance.views.town.currentView = 'smithy';
            window.appInstance.views.town.render();
          }
        }
      });
    }

    // 前往背包穿戴
    const btnGotoBag = document.getElementById('btn-goto-bag-from-equip');
    if (btnGotoBag) {
      btnGotoBag.addEventListener('click', () => {
        if (window.switchMainTab) window.switchMainTab('bag');
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
        this.render();
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

    const equippedSetCounts = {};
    Object.values(gameState.data.equipped).forEach(item => {
      if (item && item.setId) {
        equippedSetCounts[item.setId] = (equippedSetCounts[item.setId] || 0) + 1;
      }
    });

    const setsList = Object.values(OFFICIAL_SETS);

    modal.innerHTML = `
      <div class="w-full max-w-2xl max-h-[85vh] mota-parchment-panel border-2 border-[#caa048] rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        <!-- 弹窗标题 -->
        <div class="p-3.5 border-b border-[#4a3520] flex items-center justify-between bg-black/40 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <h3 class="text-sm font-black text-amber-300">亚诺大陆 · 13套原著远古神装全景图鉴</h3>
          </div>
          <button id="btn-close-sets-compendium" class="px-2 py-0.5 rounded-lg mota-btn-dark text-xs text-amber-300 hover:text-white border border-amber-500/50">
            关闭
          </button>
        </div>

        <!-- 套装列表 -->
        <div class="p-3 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
          ${setsList.map(s => {
            const count = equippedSetCounts[s.id] || 0;
            const isFull = count >= 4;
            const isHalf = count >= 2;
            const qualityColor = s.quality === 'purplegold' ? 'text-purple-300 border-purple-500 bg-purple-950/40' : s.quality === 'darkgold' ? 'text-amber-400 border-amber-600 bg-amber-950/40' : 'text-yellow-300 border-yellow-600 bg-yellow-950/40';

            return `
              <div class="p-2.5 rounded-xl border ${count > 0 ? 'bg-amber-950/30 border-amber-400/80 shadow' : 'bg-black/40 border-[#4a3520]/60'} space-y-1.5 text-xs">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-black text-sm ${count > 0 ? 'text-amber-200' : 'text-slate-200'}">${s.name}</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded border font-mono ${qualityColor}">
                      ${s.quality === 'purplegold' ? '紫金神圣' : s.quality === 'darkgold' ? '暗金史诗' : '黄金远古'}
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">门槛: Lv.${s.reqLevel}</span>
                  </div>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full ${isFull ? 'bg-emerald-900 text-emerald-300 font-bold border border-emerald-600' : isHalf ? 'bg-amber-900 text-amber-300 font-bold border border-amber-600' : 'bg-slate-800 text-slate-400'}">
                    已装备: ${count}/4 件
                  </span>
                </div>

                <div class="text-[11px] text-slate-400">
                  获取途径：<span class="text-amber-300/90">${s.source}</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80 text-[11px]">
                  <div class="p-1.5 rounded bg-black/30 border border-slate-800 ${isHalf ? 'border-amber-500/60 bg-amber-950/20 text-amber-200' : 'text-slate-400'}">
                    <span class="font-bold text-amber-300">2件羁绊:</span> ${s.bonus2?.desc || '属性提升'}
                  </div>
                  <div class="p-1.5 rounded bg-black/30 border border-slate-800 ${isFull ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-200' : 'text-slate-400'}">
                    <span class="font-bold text-amber-300">4件奥义:</span> ${s.bonus4?.desc || '强力被动'}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="p-2.5 bg-black/50 border-t border-[#4a3520] flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <span>共 13 套原著远古史诗套装 · 穿戴 2 件与 4 件激活强力羁绊</span>
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
