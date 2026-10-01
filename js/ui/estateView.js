// 领地庄园系统：100% 还原《魔塔世界》百度百科原著
// 采用多层级、全屏独立、高保真羊皮纸子页面流转架构 (庄园大厅 -> 炼金工坊/温室矿脉/佣兵营/侍从牢房)
import { gameState } from '../core/state.js';
import { ALCHEMY_RECIPES, MERCENARIES } from '../config/estate.js';
import { SLAVE_CANDIDATES } from '../config/slaves.js';
import { sound } from '../core/sound.js';
import { gameModal } from './modal.js';
import { atmosphere } from '../effects/atmosphere.js';

export class EstateView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    // 子页面路由：'hub' | 'alchemy' | 'resources' | 'mercenaries' | 'slaves'
    this.currentView = 'hub';
  }

  get currentSubTab() {
    return this.currentView;
  }

  set currentSubTab(v) {
    this.currentView = v;
  }

  render() {
    try {
      if (!this.container) return;
      const data = gameState.data;
      if (!data.estate) {
        data.estate = { 
          herbs: { herb_dragonblood: 8, herb_starlight: 8, herb_spiritflower: 8 }, 
          activePotions: [], 
          hiredMercId: 'merc_paladin', 
          lastHarvestTime: Date.now() 
        };
      }
      if (!data.estate.herbs) {
        data.estate.herbs = { herb_dragonblood: 8, herb_starlight: 8, herb_spiritflower: 8 };
      }
      if (!data.slaves) {
        data.slaves = { list: [], assistingSlaveId: null };
      }
      if (!Array.isArray(data.slaves.list)) {
        data.slaves.list = [];
      }

      if (this.currentView === 'alchemy') {
        atmosphere.setPreset('forge');
      } else {
        atmosphere.setPreset('forest');
      }

      let html = '';
      switch (this.currentView) {
        case 'hub':
          html = this.renderEstateHub();
          break;
        case 'alchemy':
          html = this.renderAlchemyView();
          break;
        case 'resources':
          html = this.renderResourcesView();
          break;
        case 'mercenaries':
          html = this.renderMercenariesView();
          break;
        case 'slaves':
          html = this.renderSlavesView();
          break;
        default:
          html = this.renderEstateHub();
      }

      this.container.innerHTML = html;
      this.bindEvents();
    } catch (err) {
      console.error('EstateView render error:', err);
      if (this.container) {
        this.container.innerHTML = `<div class="p-6 text-center text-amber-300">庄园数据加载异常，已自动恢复默认状态。</div>`;
      }
    }
  }

  // ==========================================
  // 1. 【领地庄园主府大厅】(Estate Hub)
  // ==========================================
  renderEstateHub() {
    const data = gameState.data;
    const herbs = data.estate.herbs || {};
    const slaveCount = data.slaves.list.length;
    const hiredMerc = MERCENARIES.find(m => m.id === data.estate.hiredMercId) || MERCENARIES[0];

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑与庄园总揽 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">领地庄园</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">领地产业</span>
          </div>
          <div class="text-[11px] text-slate-300 font-mono hidden sm:block">
            封地领主：${data.name}
          </div>
        </div>

        <!-- 主体：四大领地产业卡片 (2行 x 2列，紧凑舒展，绝不遮挡底部按键) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          
          <!-- 1. 皇家炼金工坊 -->
          <div data-goto="alchemy" class="btn-estate-goto mota-building-card p-3.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-600/70 hover:border-amber-400 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-amber-500/30">
                <div>
                  <h3 class="text-sm font-black text-amber-200 tracking-wide">皇家炼金工坊</h3>
                  <p class="text-[10px] text-amber-400/80">古法魔药研制 · 战力常驻提升</p>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300 font-mono">
                  4大秘方
                </span>
              </div>
              <div class="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>草药库存:</span>
                <span class="text-amber-300 font-mono">龙血 ${herbs.herb_dragonblood || 0} · 星光 ${herbs.herb_starlight || 0} · 灵花 ${herbs.herb_spiritflower || 0}</span>
              </div>
            </div>
            <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
              <span class="text-[11px] text-slate-400 font-normal">研制泰坦魔药与淬体丹</span>
              <button class="px-3.5 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                开启炼金 ->
              </button>
            </div>
          </div>

          <!-- 2. 温室药园与魔晶矿脉 -->
          <div data-goto="resources" class="btn-estate-goto mota-building-card p-3.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-emerald-600/70 hover:border-emerald-400 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-emerald-500/30">
                <div>
                  <h3 class="text-sm font-black text-emerald-200 tracking-wide">温室药园与魔晶矿脉</h3>
                  <p class="text-[10px] text-emerald-400/80">天地灵脉丰饶 · 一键定期丰收</p>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-mono">
                  领地灵脉
                </span>
              </div>
              <div class="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>周期产出:</span>
                <span class="text-emerald-400 font-mono">各草药 +5 棵 · 魔晶 +25 颗</span>
              </div>
            </div>
            <div class="pt-2 border-t border-emerald-900/40 flex items-center justify-between text-xs text-emerald-300 font-bold">
              <span class="text-[11px] text-slate-400 font-normal">采撷储备炼金与升星材料</span>
              <button class="px-3.5 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                巡视丰收 ->
              </button>
            </div>
          </div>

          <!-- 3. 专属佣兵营地 -->
          <div data-goto="mercenaries" class="btn-estate-goto mota-building-card p-3.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-blue-600/70 hover:border-blue-400 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-blue-500/30">
                <div>
                  <h3 class="text-sm font-black text-blue-200 tracking-wide">专属佣兵营地</h3>
                  <p class="text-[10px] text-blue-400/80">传奇战友驻扎 · 战场光环协力</p>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 border border-blue-600/60 text-blue-300 font-mono">
                  ${hiredMerc.name.split('·')[0]}
                </span>
              </div>
              <div class="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>随行光环:</span>
                <span class="text-blue-300 font-mono">【${hiredMerc.aura}】生效中</span>
              </div>
            </div>
            <div class="pt-2 border-t border-blue-900/40 flex items-center justify-between text-xs text-blue-300 font-bold">
              <span class="text-[11px] text-slate-400 font-normal">主教/铁卫/诗人战友招募</span>
              <button class="px-3.5 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                佣兵调遣 ->
              </button>
            </div>
          </div>

          <!-- 4. 侍从战俘牢房 -->
          <div data-goto="slaves" class="btn-estate-goto mota-building-card p-3.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-purple-600/70 hover:border-purple-400 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-purple-500/30">
                <div>
                  <h3 class="text-sm font-black text-purple-200 tracking-wide">战俘侍从管理牢房</h3>
                  <p class="text-[10px] text-purple-400/80">俘虏役使惩戒 · 采矿与榨取</p>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 border border-purple-600/60 text-purple-300 font-mono">
                  羁押 ${slaveCount} 人
                </span>
              </div>
              <div class="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>牢房动态:</span>
                <span class="text-purple-300 font-mono">${slaveCount > 0 ? `${slaveCount} 名侍从戴罪立功` : '牢房空虚，可征伐抓捕'}</span>
              </div>
            </div>
            <div class="pt-2 border-t border-purple-900/40 flex items-center justify-between text-xs text-purple-300 font-bold">
              <span class="text-[11px] text-slate-400 font-normal">役使采矿、安抚与折磨榨取</span>
              <button class="px-3.5 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                牢房管理 ->
              </button>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 2. 【皇家炼金工坊】(Alchemy Sub-page)
  // ==========================================
  renderAlchemyView() {
    const data = gameState.data;
    const herbs = data.estate.herbs || {};
    const activePotions = data.estate.activePotions || [];

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑与返回按键 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">领地庄园</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">皇家炼金工坊</span>
          </div>
          <button data-goto="hub" class="btn-estate-goto mota-btn-dark px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 text-amber-200 border-amber-600/50">
            <span>返回庄园</span>
          </button>
        </div>

        <!-- 药材库存与生效中魔药状态栏 -->
        <div class="mota-parchment-panel p-2.5 rounded-xl border border-[#caa048] flex flex-wrap items-center justify-between gap-3 mb-2 flex-shrink-0">
          <div class="flex items-center gap-4 text-xs font-mono">
            <span class="text-amber-300 font-bold">草药库存：</span>
            <span class="text-red-300 font-bold">龙血草: ${herbs.herb_dragonblood || 0}</span>
            <span class="text-cyan-300 font-bold">星光草: ${herbs.herb_starlight || 0}</span>
            <span class="text-amber-300 font-bold">圣灵草: ${herbs.herb_spiritflower || 0}</span>
          </div>
          <div class="text-[11px] text-slate-300">
            常驻增益魔药：<b class="text-emerald-400 font-bold">${activePotions.length} 剂生效中</b>
          </div>
        </div>

        <!-- 主体：四大古法魔药卡片 (2行 x 2列) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          ${ALCHEMY_RECIPES.map(r => {
            const mats = r.materials || {};
            const reqDragon = mats.herb_dragonblood || 0;
            const reqStar = mats.herb_starlight || 0;
            const reqSpirit = mats.herb_spiritflower || 0;
            const canBrew = (herbs.herb_dragonblood || 0) >= reqDragon &&
                            (herbs.herb_starlight || 0) >= reqStar &&
                            (herbs.herb_spiritflower || 0) >= reqSpirit;

            return `
              <div class="mota-parchment-panel rounded-xl p-3 border border-[#caa048] flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-1.5">
                    <div>
                      <h4 class="font-bold text-xs text-amber-300">${r.name}</h4>
                      <p class="text-[10px] text-slate-400 mt-0.5">${r.desc}</p>
                    </div>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-200 border border-amber-600/50 font-mono">
                      秘方
                    </span>
                  </div>

                  <div class="p-2 rounded bg-black/50 border border-slate-800 text-xs space-y-1">
                    <div class="flex items-center justify-between text-[11px] font-mono">
                      <span class="${(herbs.herb_dragonblood || 0) >= reqDragon ? 'text-green-400' : 'text-red-400'}">
                        龙血草 x${reqDragon} (存:${herbs.herb_dragonblood || 0})
                      </span>
                      <span class="${(herbs.herb_starlight || 0) >= reqStar ? 'text-green-400' : 'text-red-400'}">
                        星光草 x${reqStar} (存:${herbs.herb_starlight || 0})
                      </span>
                      <span class="${(herbs.herb_spiritflower || 0) >= reqSpirit ? 'text-green-400' : 'text-red-400'}">
                        圣灵草 x${reqSpirit} (存:${herbs.herb_spiritflower || 0})
                      </span>
                    </div>
                  </div>
                </div>

                <div class="mt-2 pt-2 border-t border-slate-700">
                  <button data-recipe-id="${r.id}" class="btn-brew-potion w-full mota-btn-gold py-1.5 rounded-lg text-xs font-bold ${canBrew ? '' : 'opacity-40 cursor-not-allowed'}">
                    配制并痛饮魔药
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  }

  // ==========================================
  // 3. 【温室药园与魔晶矿脉】(Resources Sub-page)
  // ==========================================
  renderResourcesView() {
    const data = gameState.data;
    const herbs = data.estate.herbs || {};

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑与返回按键 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">领地庄园</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">温室药园与魔晶矿脉</span>
          </div>
          <button data-goto="hub" class="btn-estate-goto mota-btn-dark px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 text-amber-200 border-amber-600/50">
            <span>返回庄园</span>
          </button>
        </div>

        <!-- 主体：药园与矿脉特写 -->
        <div class="flex-1 min-h-0 mota-parchment-panel rounded-xl p-4 border-2 border-[#caa048] flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 class="font-bold text-sm text-amber-300">封地灵脉天然生长池</h3>
                <p class="text-xs text-slate-400 mt-0.5">每 30 分钟成熟一批，最多积累 20 批；采收后三种草药各 +5、魔晶 +25 / 批</p>
              </div>
              <button id="btn-harvest-all" class="mota-btn-gold px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                一键丰收采撷
              </button>
            </div>

            <!-- 三大草药与魔晶展台 -->
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 my-4">
              <div class="p-3 bg-black/60 rounded-xl border border-red-500/40 text-center space-y-1">
                <div class="text-red-300 font-bold text-xs">龙血草</div>
                <div class="text-xl font-mono font-bold text-red-400">${herbs.herb_dragonblood || 0}</div>
                <div class="text-[10px] text-slate-500">炼制狂暴合剂</div>
              </div>

              <div class="p-3 bg-black/60 rounded-xl border border-cyan-500/40 text-center space-y-1">
                <div class="text-cyan-300 font-bold text-xs">星光草</div>
                <div class="text-xl font-mono font-bold text-cyan-400">${herbs.herb_starlight || 0}</div>
                <div class="text-[10px] text-slate-500">研磨圣水祝福</div>
              </div>

              <div class="p-3 bg-black/60 rounded-xl border border-amber-500/40 text-center space-y-1">
                <div class="text-amber-300 font-bold text-xs">圣灵草</div>
                <div class="text-xl font-mono font-bold text-amber-400">${herbs.herb_spiritflower || 0}</div>
                <div class="text-[10px] text-slate-500">调配龙血秘药</div>
              </div>

              <div class="p-3 bg-black/60 rounded-xl border border-purple-500/40 text-center space-y-1">
                <div class="text-purple-300 font-bold text-xs">丰收魔晶</div>
                <div class="text-xl font-mono font-bold text-purple-400">+25 颗</div>
                <div class="text-[10px] text-slate-500">每次丰收额外产出</div>
              </div>
            </div>
          </div>

          <div class="p-2.5 bg-black/40 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span class="text-[11px] text-slate-400">采撷获得的草药可在炼金工坊研制魔药；魔晶可用于升星精铸</span>
            <button data-goto="alchemy" class="btn-estate-goto mota-btn-gold px-3 py-1 rounded-lg text-xs font-bold">
              前往炼金 ->
            </button>
          </div>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 4. 【专属佣兵营地】(Mercenaries Sub-page)
  // ==========================================
  renderMercenariesView() {
    const data = gameState.data;
    const hiredMercId = data.estate.hiredMercId || 'merc_paladin';

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑与返回按键 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">领地庄园</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">专属佣兵营地</span>
          </div>
          <button data-goto="hub" class="btn-estate-goto mota-btn-dark px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 text-amber-200 border-amber-600/50">
            <span>返回庄园</span>
          </button>
        </div>

        <!-- 3位传奇佣兵卡片 (3列并排) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3">
          ${MERCENARIES.map(m => {
            const isHired = hiredMercId === m.id;
            return `
              <div class="mota-parchment-panel rounded-xl p-3 border-2 ${isHired ? 'border-amber-400 shadow-lg bg-amber-950/20' : 'border-[#caa048]'} flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                    <div>
                      <h4 class="font-bold text-xs text-amber-300">${m.name}</h4>
                      <div class="text-[10px] text-slate-400 mt-0.5">${m.role}</div>
                    </div>
                    <span class="text-[10px] px-1.5 py-0.2 rounded font-mono ${isHired ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-slate-300'}">
                      ${isHired ? '已随行' : '可招募'}
                    </span>
                  </div>

                  <p class="text-[11px] text-slate-300 my-1.5">${m.desc}</p>

                  <div class="p-2 rounded-lg bg-black/60 border border-slate-800 space-y-1 my-1.5">
                    <div class="text-xs font-bold text-cyan-300">常驻光环：【${m.aura}】</div>
                    <div class="text-[10px] text-slate-400">${m.auraDesc}</div>
                  </div>
                </div>

                <div class="mt-2 pt-2 border-t border-slate-700">
                  <button data-merc-id="${m.id}" class="btn-hire-merc w-full py-1.5 rounded-lg text-xs font-bold ${
                    isHired ? 'mota-btn-gold shadow' : 'mota-btn-dark border-amber-500/60 text-amber-200'
                  }">
                    ${isHired ? '当前随行 (光环生效中)' : '订立盟誓 · 出战随行'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  }

  // ==========================================
  // 5. 【战俘侍从管理牢房】(Slaves Sub-page)
  // ==========================================
  renderSlavesView() {
    const data = gameState.data;
    const slaveList = data.slaves.list || [];

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑与返回按键 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">领地庄园</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">战俘侍从牢房</span>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-capture-new-slave" class="mota-btn-gold px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow">
              <span>抓捕侍从</span>
            </button>
            <button data-goto="hub" class="btn-estate-goto mota-btn-dark px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 text-amber-200 border-amber-600/50">
              <span>返回庄园</span>
            </button>
          </div>
        </div>

        <!-- 侍从卡片列表 -->
        <div class="flex-1 min-h-0">
          ${slaveList.length > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 h-full">
              ${slaveList.map(s => {
                const isComforted = s.comfortUntil && s.comfortUntil > Date.now();
                return `
                  <div class="mota-parchment-panel rounded-xl p-3 border border-[#caa048] flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                        <div>
                          <h4 class="font-bold text-xs text-amber-200">${s.name}</h4>
                          <div class="text-[10px] text-slate-400">Lv.${s.level} · ${s.title}</div>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded font-mono ${isComforted ? 'bg-green-950 text-green-300 border border-green-600' : 'bg-red-950 text-red-300 border border-red-600'}">
                          ${isComforted ? '已安抚' : '未安抚'}
                        </span>
                      </div>

                      <div class="p-2 rounded bg-black/50 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                        <div>累计劳作采矿: <b class="text-amber-300 font-mono">${s.workedTimes || 0} 次</b></div>
                        <div>服从状态: 戴罪立功中</div>
                      </div>
                    </div>

                    <!-- 3大互动按键 -->
                    <div class="grid grid-cols-3 gap-2 text-xs mt-2 pt-2 border-t border-slate-700">
                      <button data-slave-id="${s.id}" class="btn-comfort-slave mota-btn-dark py-1.5 rounded border border-green-600 text-green-300 font-bold">
                        安抚侍从
                      </button>
                      <button data-slave-id="${s.id}" class="btn-discipline-slave mota-btn-dark py-1.5 rounded border border-red-600 text-red-300 font-bold">
                        折磨榨取（每30分钟）
                      </button>
                      <button data-slave-id="${s.id}" class="btn-mine-slave mota-btn-gold py-1.5 rounded font-bold">
                        役使采矿（每30分钟）
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="h-full mota-parchment-panel rounded-xl p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-[#caa048]/50">
              <h3 class="text-sm font-bold text-amber-300 mb-1">当前牢房暂无俘虏侍从</h3>
              <p class="text-xs text-slate-400 max-w-md mb-3">
                击败野外强敌或魔塔领主，即可将其擒获为家奴侍从，为你日夜采矿、榨取经验
              </p>
              <button id="btn-capture-new-slave-empty" class="mota-btn-gold px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                前往抓捕侍从 ->
              </button>
            </div>
          `}
        </div>

      </div>
    `;
  }

  // ==========================================
  // 事件绑定与状态流转
  // ==========================================
  bindEvents() {
    // 子视图路由跳转按键
    this.container.querySelectorAll('.btn-estate-goto').forEach(btn => {
      btn.addEventListener('click', () => {
        const dest = btn.getAttribute('data-goto');
        if (dest) {
          this.currentView = dest;
          sound.playSlash();
          this.render();
        }
      });
    });

    // 炼金制药
    this.container.querySelectorAll('.btn-brew-potion').forEach(btn => {
      btn.addEventListener('click', () => {
        const rId = btn.getAttribute('data-recipe-id');
        const r = ALCHEMY_RECIPES.find(it => it.id === rId);
        if (!r) return;
        const result = gameState.brewPotion(rId);
        if (!result.success) return gameModal.alert(result.msg, '炼金材料不足');

        sound.playFanfare();
        const questRes = gameState.triggerQuestAction('brew_potion');
        gameState.addSystemLog(`【庄园】皇家炼金工坊成功研制出魔药【${r.name}】！`, 'estate');

        if (gameState.data.currentQuestId === 'quest_7' && questRes.completed) {
          gameModal.confirm(
            `炼金成功！痛饮【${r.name}】。${r.desc}

【主线任务达成】领地开拓 · 炼金魔药！
奖赏：经验 +3600，金币 +6000，魔晶 +100，【远古重铸灵药】x5！

是否立即领受犒赏并开启下一阶段主线【传奇同行 · 佣兵立誓】？`,
            () => {
              gameState.claimQuestReward('quest_7');
              gameModal.alert('丰厚犒赏已存入行囊！已为你开启下一阶段主线【传奇同行 · 佣兵立誓】，前往佣兵营地订立契约吧！', '主线推进', () => {
                this.currentView = 'mercenaries';
                this.render();
              });
            },
            () => this.render(),
            '主线大捷 · 炼金魔药'
          );
          gameState.notify();
          this.render();
          return;
        }

        gameModal.alert(`炼金成功！痛饮【${r.name}】，战斗中将获得专属威能加持！`, '炼金成功');
        gameState.notify();
        this.render();
      });
    });

    // 一键丰收
    const btnHarvest = this.container.querySelector('#btn-harvest-all');
    if (btnHarvest) {
      btnHarvest.addEventListener('click', () => {
        const result = gameState.harvestEstate();
        if (result.success) sound.playCoin();
        gameModal.alert(result.msg, '领地丰收');
        this.render();
      });
    }

    // 雇佣佣兵 (达成主线8)
    this.container.querySelectorAll('.btn-hire-merc').forEach(btn => {
      btn.addEventListener('click', () => {
        const mId = btn.getAttribute('data-merc-id');
        const merc = MERCENARIES.find(m => m.id === mId);
        const hired = gameState.hireMercenary(mId);
        if (!hired.success) return gameModal.alert(hired.msg, '佣兵誓约');
        sound.playCoin();
        const questRes = gameState.triggerQuestAction('hire_merc');
        gameState.addSystemLog(`【庄园】与传奇随从【${merc?.name}】立下誓约！随行光环【${merc?.aura}】生效！`, 'estate');

        if (gameState.data.currentQuestId === 'quest_8' && questRes.completed) {
          gameModal.confirm(
            `盟誓订立！传奇战友【${merc?.name}】将与你一同驰骋沙场！

【主线任务达成】传奇同行 · 佣兵立誓！
奖赏：经验 +5000，金币 +8000，魔晶 +150，【碎裂金刚钻】x2！

是否立即领受犒赏并开启主线终极试炼【终焉试炼 · 斩落石魔】？`,
            () => {
              gameState.claimQuestReward('quest_8');
              gameModal.alert('传世镶嵌金刚钻已入行囊！已为你开启下一阶段主线【终焉试炼 · 斩落石魔】，向无尽魔塔第 10 层领主进军吧！', '主线推进', () => {
                if (window.switchMainTab) window.switchMainTab('tower');
              });
            },
            () => this.render(),
            '主线大捷 · 佣兵同行'
          );
          gameState.notify();
          this.render();
          return;
        }

        gameModal.alert(`盟誓订立！【${merc?.name}】将随行出战，常驻光环【${merc?.aura}】已激活！`, '佣兵立誓');
        gameState.notify();
        this.render();
      });
    });

    // 抓捕新侍从
    const handleCapture = () => {
      const candidates = SLAVE_CANDIDATES;
      const uncaptured = candidates.filter(c => !gameState.data.slaves.list.some(s => s.id === c.id));
      const pick = uncaptured.length > 0 ? uncaptured[0] : candidates[Math.floor(Math.random() * candidates.length)];

      gameState.data.slaves.list.push({
        ...pick,
        uid: 'sl_' + Date.now(),
        isComforted: true,
        comfortUntil: Date.now() + 3600000 * 2,
        workedTimes: 0
      });

      sound.playFanfare();
      gameModal.alert(`激战得胜！成功俘获【${pick.name}】（${pick.title}）为家奴侍从！已押入牢房戴罪立功！`, '抓捕侍从成功');
      gameState.notify();
      this.render();
    };

    const btnCapture = this.container.querySelector('#btn-capture-new-slave');
    if (btnCapture) btnCapture.addEventListener('click', handleCapture);
    const btnCaptureEmpty = this.container.querySelector('#btn-capture-new-slave-empty');
    if (btnCaptureEmpty) btnCaptureEmpty.addEventListener('click', handleCapture);

    // 安抚侍从
    this.container.querySelectorAll('.btn-comfort-slave').forEach(btn => {
      btn.addEventListener('click', () => {
        const sId = btn.getAttribute('data-slave-id');
        const res = gameState.comfortSlave(sId);
        if (res.success) sound.playCoin();
        gameModal.alert(res.msg, '侍从安抚');
        this.render();
      });
    });

    // 折磨榨取
    this.container.querySelectorAll('.btn-discipline-slave').forEach(btn => {
      btn.addEventListener('click', () => {
        const sId = btn.getAttribute('data-slave-id');
        const res = gameState.disciplineSlave(sId);
        if (res.success) sound.playSlash();
        gameModal.alert(res.msg, '惩戒榨取');
        this.render();
      });
    });

    // 役使采矿
    this.container.querySelectorAll('.btn-mine-slave').forEach(btn => {
      btn.addEventListener('click', () => {
        const sId = btn.getAttribute('data-slave-id');
        const res = gameState.assignSlaveMine(sId);
        if (res.success) sound.playCoin();
        gameModal.alert(res.msg, '役使采矿');
        this.render();
      });
    });
  }
}
