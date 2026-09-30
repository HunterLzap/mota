// 2011 经典页游纯正【勇者随身行囊】独立全屏视图 (40格大容量行囊、道具分类与操作)
import { gameState } from '../core/state.js';
import { ITEM_SLOTS, SLOT_MAP, QUALITIES } from '../config/items.js';
import { CLASSES } from '../config/classes.js';
import { getVectorIcon } from '../assets/vectorIcons.js';
import { renderGameIcon } from './iconHelper.js';
import { tooltip } from './tooltip.js';
import { gameModal } from './modal.js';

export class BagView {
  constructor(containerId, onSwitchTab) {
    this.container = document.getElementById(containerId);
    this.onSwitchTab = onSwitchTab;
    this.bagFilter = 'all'; // 'all' | 'equip' | 'consumable' | 'material'
    this.selectedItemUid = null;
  }

  render() {
    if (!this.container) return;
    const data = gameState.data;
    const totalSlots = 40;

    // 分类过滤
    let filteredList = data.bag.map((item, originalIdx) => ({ item, originalIdx }));
    if (this.bagFilter === 'equip') {
      filteredList = filteredList.filter(e => e.item && !!e.item.slot);
    } else if (this.bagFilter === 'consumable') {
      filteredList = filteredList.filter(e => e.item && (e.item.type === 'egg' || e.item.id === 'pill_reborn' || e.item.id?.startsWith('bait') || e.item.id === 'pet_food'));
    } else if (this.bagFilter === 'material') {
      filteredList = filteredList.filter(e => e.item && !e.item.slot && e.item.type !== 'egg' && e.item.id !== 'pill_reborn');
    }

    const emptyCount = Math.max(0, totalSlots - filteredList.length);

    // 选中的物品详情
    const selectedEntry = this.selectedItemUid ? data.bag.find(i => (i.uid || i.id) === this.selectedItemUid) : (data.bag[0] || null);

    this.container.innerHTML = `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑与行囊容量指示条 -->
        <div class="mota-breadcrumb p-2 sm:p-2.5 rounded-xl flex items-center justify-between shadow-lg mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-200 font-bold text-xs">【背包】</span>
          </div>
          
          <div class="flex items-center gap-4 text-xs">
            <!-- 资产速览 -->
            <div class="hidden sm:flex items-center gap-3 font-mono text-[11px]">
              <span class="text-amber-300">金币: <b>${data.gold.toLocaleString()}</b></span>
              <span class="text-cyan-300">魔晶: <b>${data.crystal.toLocaleString()}</b></span>
            </div>
            
            <!-- 容量 -->
            <div class="px-2.5 py-0.5 rounded-full bg-black/60 border border-amber-600/50 text-[11px] font-mono text-amber-300">
              容量: ${data.bag.length} / ${totalSlots}
            </div>
          </div>
        </div>

        <!-- 主体：行囊大网格 (8列) + 右侧选中国际标准详情栏 (4列) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          
          <!-- 左侧：分类筛选 + 40 格道具大网格 (8列) -->
          <div class="lg:col-span-8 mota-parchment-panel p-3 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
            
            <!-- 分类标签栏 -->
            <div class="flex items-center justify-between pb-2 border-b border-[#4a3520] flex-shrink-0">
              <div class="flex items-center gap-1.5">
                <button data-filter="all" class="btn-bag-filter px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${this.bagFilter === 'all' ? 'mota-btn-gold text-black shadow' : 'mota-btn-dark text-slate-300'}">
                  全部 (${data.bag.length})
                </button>
                <button data-filter="equip" class="btn-bag-filter px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${this.bagFilter === 'equip' ? 'mota-btn-gold text-black shadow' : 'mota-btn-dark text-slate-300'}">
                  装备 (${data.bag.filter(i => i && i.slot).length})
                </button>
                <button data-filter="consumable" class="btn-bag-filter px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${this.bagFilter === 'consumable' ? 'mota-btn-gold text-black shadow' : 'mota-btn-dark text-slate-300'}">
                  丹药蛋饵
                </button>
                <button data-filter="material" class="btn-bag-filter px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${this.bagFilter === 'material' ? 'mota-btn-gold text-black shadow' : 'mota-btn-dark text-slate-300'}">
                  晶石钥匙材料
                </button>
              </div>
            </div>

            <!-- 40 格道具大网格 (5行 x 8列，舒适透气，无拥挤感) -->
            <div class="my-2 flex-1 min-h-0 grid grid-cols-8 gap-2 p-3 bg-black/30 rounded-xl border border-slate-800/60 items-center content-center">
              ${filteredList.map(({ item, originalIdx }) => {
                const uid = item.uid || item.id || originalIdx;
                const isSelected = (selectedEntry && (selectedEntry.uid || selectedEntry.id) === (item.uid || item.id));
                const qualityBorder = item.quality === 'darkgold' ? 'border-amber-400 shadow-[0_0_8px_rgba(245,192,66,0.5)]' :
                                      item.quality === 'purple' ? 'border-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.4)]' :
                                      item.quality === 'gold' ? 'border-amber-500 shadow-[0_0_6px_rgba(234,179,8,0.4)]' :
                                      item.quality === 'blue' ? 'border-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.3)]' :
                                      'border-green-400';

                return `
                  <div data-bag-uid="${uid}" data-original-idx="${originalIdx}" class="bag-slot-cell h-11 sm:h-11 md:h-12 w-full rounded-lg bg-black/60 border ${qualityBorder} hover:scale-105 hover:border-white transition-all cursor-pointer flex items-center justify-center relative select-none p-1.5 ${isSelected ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-black' : ''}">
                    ${renderGameIcon(item, { size: 'w-full h-full' })}
                    
                    ${item.count && item.count > 1 ? `
                      <div class="absolute bottom-0.5 right-1 text-[10px] font-black text-amber-300 font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,1)] leading-none">
                        ${item.count}
                      </div>
                    ` : ''}

                    ${(item.stars || 0) > 0 ? `
                      <div class="absolute top-0.5 right-0.5 px-1 text-[8px] font-black bg-amber-500 text-black rounded-bl shadow leading-none">
                        +${item.stars}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}

              ${Array.from({ length: emptyCount }).map(() => `
                <div class="h-11 sm:h-11 md:h-12 w-full rounded-lg bg-black/20 border border-slate-800/30 flex items-center justify-center text-slate-700 text-xs font-mono select-none">
                  ·
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 右侧：选中物品深度特写与操作台 (4列) -->
          <div class="lg:col-span-4 mota-parchment-panel p-3.5 sm:p-4 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
            ${selectedEntry ? `
              <div>
                <div class="flex items-center justify-between pb-3 border-b border-[#4a3520]">
                  <span class="text-xs font-bold text-amber-300">物品宝牒鉴赏</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono ${selectedEntry.quality === 'darkgold' ? 'bg-amber-950 text-amber-300 border border-amber-500' : 'bg-slate-800 text-slate-300'}">
                    ${selectedEntry.slot ? '装备散件' : '随身道具'}
                  </span>
                </div>

                <!-- 物品头衔 -->
                <div class="flex items-center gap-3 my-3.5">
                  <div class="w-14 h-14 rounded-2xl bg-black/70 border-2 border-amber-400 flex items-center justify-center p-2 shadow-inner">
                    ${renderGameIcon(selectedEntry, { size: 'w-full h-full' })}
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-sm font-black text-amber-200 truncate">${selectedEntry.name}</h3>
                    <div class="text-[11px] text-slate-400 mt-0.5">
                      ${selectedEntry.slot ? `部位：${SLOT_MAP[selectedEntry.slot]?.name || selectedEntry.slot}` : (selectedEntry.desc || '实用珍奇道具')}
                    </div>
                  </div>
                </div>

                <!-- 属性或详情面板 -->
                <div class="p-3 rounded-xl bg-black/50 border border-[#4a3520] space-y-2 text-xs">
                  ${selectedEntry.stats ? `
                    <div class="font-bold text-amber-300 text-xs pb-1 border-b border-slate-800">基础战力加成:</div>
                    <div class="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                      ${Object.entries(selectedEntry.stats).map(([k, v]) => `
                        <div class="text-slate-300">${k.toUpperCase()}: <b class="text-emerald-400">+${v}</b></div>
                      `).join('')}
                    </div>
                  ` : `
                    <div class="text-slate-300 leading-relaxed italic text-[11px]">
                      “${selectedEntry.desc || '亚诺古陆流传下来的实用物资，蕴藏着神秘威能。'}”
                    </div>
                  `}

                  ${selectedEntry.durability ? `
                    <div class="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800 flex justify-between">
                      <span>当前耐久度:</span>
                      <span class="text-emerald-400 font-bold">${selectedEntry.durability} / ${selectedEntry.maxDurability || 100}</span>
                    </div>
                  ` : ''}

                  ${selectedEntry.count ? `
                    <div class="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800 flex justify-between">
                      <span>背包存量:</span>
                      <span class="text-amber-300 font-bold">${selectedEntry.count} 份</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- 动作按键 -->
              <div class="space-y-2 pt-3 border-t border-[#4a3520]">
                ${selectedEntry.slot ? `
                  <button id="btn-bag-equip-item" class="w-full mota-btn-gold py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 border-amber-300">
                    <span>立即穿戴至身上</span>
                  </button>
                ` : selectedEntry.type === 'egg' ? `
                  <button id="btn-bag-use-egg" class="w-full mota-btn-gold py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 border-amber-300">
                    <span>孵化神兽伙伴</span>
                  </button>
                ` : selectedEntry.id === 'pill_reborn' ? `
                  <button id="btn-bag-goto-wash" class="w-full mota-btn-gold py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 border-amber-300">
                    <span>前往洗炼神兽资质</span>
                  </button>
                ` : `
                  <button class="w-full mota-btn-dark py-2.5 rounded-xl text-xs font-semibold text-slate-400 cursor-default">
                    随身持有中
                  </button>
                `}
              </div>
            ` : `
              <div class="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic">
                行囊空空如也，请先探索魔塔与王都
              </div>
            `}
          </div>

        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // 过滤按钮
    this.container.querySelectorAll('.btn-bag-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        this.bagFilter = btn.getAttribute('data-filter');
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
        const item = gameState.data.bag.find(i => (i.uid || i.id) === this.selectedItemUid);
        if (item && item.slot) {
          const res = gameState.equipItem(item);
          gameModal.toast(res.msg);
          this.render();
          if (window.switchMainTab) window.switchMainTab('equip');
        }
      });
    }

    // 孵化蛋
    const btnEgg = document.getElementById('btn-bag-use-egg');
    if (btnEgg) {
      btnEgg.addEventListener('click', () => {
        if (window.switchMainTab) {
          window.switchMainTab('pets');
          if (window.appInstance?.views?.pets) {
            window.appInstance.views.pets.currentSubTab = 'evolve';
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
