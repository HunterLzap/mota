// 100% 还原《魔塔世界》百度百科：【古堡探险·钥匙破界】与【地下城七大门】
import { specializeEquipment } from '../config/items.js';
import { QUEST_LIST } from '../config/quests.js';
import { gameState } from '../core/state.js';
import { markFeatureEntrances } from './featureAccess.js';
import { getTowerFloorData, LANDMARK_BOSSES } from '../config/towerLevels.js';
import { DUNGEON_GATES, getDungeonFloorGuard } from '../config/dungeons.js';
import { ART_ASSETS } from '../assets/icons.js';
import { sound } from '../core/sound.js';
import { getVectorIcon } from '../assets/vectorIcons.js';
import { renderGameIcon } from './iconHelper.js';
import { HOLY_RELICS, getRelicsTotalStats } from '../config/relics.js';
import { gameModal } from './modal.js';
import { canRetryFinale } from '../core/journey.js';
import { getBossTactics } from '../config/bossTactics.js';

export class TowerView {
  constructor(containerId, onStartBattle) {
    this.container = document.getElementById(containerId);
    this.onStartBattle = onStartBattle;
    this.subTab = 'castle'; // 'castle' | 'dungeons' | 'relics'
    this.selectedGateId = 'trial_gate';
    this.selectedFloor = 1;
    this.selectedCompanion = 'none'; // 'none' | 'merc' | 'slave'
  }

  render() {
    try {
      const data = gameState.data;
      if (!data.castle) data.castle = { floor: 1, maxReachedFloor: 1, accumulatedExp: 0, accumulatedGold: 0, isExploring: false, entriesLeft: 3 };
      if (!data.dungeon) data.dungeon = { entriesLeft: 5, activeGateId: null, activeGateFloor: 1, clearedGates: {} };
      const castle = data.castle;

      this.container.innerHTML = `
        <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
          
          <!-- 顶栏三核心子标签页与探险配额 -->
          <div class="mota-breadcrumb tower-subtabs px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
            <div class="flex items-center gap-2">
              <button id="btn-subtab-castle" aria-pressed="${this.subTab === 'castle'}" class="px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                this.subTab === 'castle' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'
              }">
                古堡探险 · 魔塔之门
              </button>
              <button id="btn-subtab-dungeons" aria-pressed="${this.subTab === 'dungeons'}" class="px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                this.subTab === 'dungeons' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'
              }">
                地下城七大副本门
              </button>
              <button id="btn-subtab-relics" aria-pressed="${this.subTab === 'relics'}" class="px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                this.subTab === 'relics' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'
              }">
                深渊神域 · 远古圣遗物
              </button>
            </div>
            <div class="text-xs text-amber-300 font-mono">
              ${this.subTab === 'castle' ? `今日剩余探险: <b class="text-white">${castle.entriesLeft !== undefined ? castle.entriesLeft : 3}</b> / 3` : this.subTab === 'dungeons' ? `今日副本挑战: <b class="text-white">${data.dungeon.entriesLeft !== undefined ? data.dungeon.entriesLeft : 5}</b> / 5` : `已觉醒圣遗物: <b class="text-white">${(data.relics?.unlocked || []).length}</b> / 6`}
            </div>
          </div>

          <!-- 主内容区域 (单屏自适应展示) -->
          <div class="flex-1 min-h-0">
            ${this.subTab === 'castle' ? this.renderCastleContent(data) : this.subTab === 'dungeons' ? this.renderDungeonContent(data) : this.renderRelicsContent(data)}
          </div>

        </div>
      `;

      this.bindEvents();
      markFeatureEntrances(this.container, { '#btn-subtab-dungeons': 'dungeons', '#btn-start-redwood': 'castle' });
    } catch (err) {
      console.error('TowerView render error:', err);
      this.container.innerHTML = `<div class="p-6 text-center text-amber-300">魔塔场景加载异常，已自动恢复默认状态。</div>`;
    }
  }

  renderCastleContent(data) {
    const castle = data.castle || {};
    const redwoodKey = data.bag.find(i => i.id === 'key_redwood')?.count || 0;
    const mithrilKey = data.bag.find(i => i.id === 'key_mithril')?.count || 0;
    const obsidianKey = data.bag.find(i => i.id === 'key_obsidian')?.count || 0;
    const bronzeKey = data.bag.find(i => i.id === 'key_bronze')?.count || 0;
    const titanKey = data.bag.find(i => i.id === 'key_titan')?.count || 0;
    const platinumKey = data.bag.find(i => i.id === 'key_platinum')?.count || 0;

    const floor = castle.floor || 1;
    const floorInfo = getTowerFloorData(floor, gameState.data.onboardingVersion);

    return `
      <div class="castle-workspace h-full grid grid-cols-1 md:grid-cols-12 gap-3">
        
        <!-- 左侧：探险钥匙与征战状态 (5列) -->
        <div class="castle-keys md:col-span-5 mota-parchment-panel p-3.5 rounded-xl border-2 border-[#caa048] flex flex-col justify-between">
          <div class="castle-key-scroll space-y-3 custom-scrollbar">
            <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]/70">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 flex items-center justify-center">${renderGameIcon('key_bronze', { size: 'w-6 h-6' })}</span>
                <h3 class="font-bold text-xs text-amber-300">古堡破界钥匙</h3>
              </div>
              <span class="text-[11px] text-slate-400 font-mono">消耗钥匙直达对应层</span>
            </div>

            ${data.bag.some(item => item.id === 'royal_castle_permit' && item.count > 0) ? `<p class="text-xs text-amber-200">远征通行令：${data.bag.find(item => item.id === 'royal_castle_permit').count}枚。每日次数用尽后自动消耗一枚，仍需入场钥匙。</p>` : ''}
            ${canRetryFinale(data) ? `<div class="mota-parchment-panel p-2 mb-2 text-xs">
              <p>王座之路已打通。整备后直接重试100层，不消耗钥匙或每日次数，不重发前层收益。</p>
              <button id="btn-retry-finale" type="button" class="mota-btn-gold px-3 py-2 mt-2">重返龙皇王座</button>
            </div>` : ''}
            ${!castle.isExploring ? `
              <!-- 6 把钥匙启程卡片 -->
              <div class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                <!-- 红木钥匙 -->
                <div class="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between hover:border-amber-500/50 transition-colors">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-black/60 border border-amber-800/80 p-1 flex items-center justify-center flex-shrink-0">
                      ${renderGameIcon('key_redwood', { size: 'w-full h-full' })}
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-amber-200">红木钥匙 · 初入魔塔</div>
                      <div class="text-[10px] text-slate-400 font-mono">拥有: <b class="text-amber-400">${redwoodKey}</b> 把 · 从第 1 层启程</div>
                    </div>
                  </div>
                  <button id="btn-start-redwood" class="mota-btn-gold px-2.5 py-1 rounded-lg text-xs font-bold shadow ${redwoodKey > 0 ? '' : 'opacity-40 cursor-not-allowed'} flex-shrink-0">
                    启程
                  </button>
                </div>

                <!-- 秘银钥匙 (深渊前哨) -->
                <div class="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between hover:border-cyan-500/50 transition-colors">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-black/60 border border-cyan-700/80 p-1 flex items-center justify-center flex-shrink-0">
                      ${renderGameIcon('key_mithril', { size: 'w-full h-full' })}
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-cyan-200">秘银钥匙 · 深渊长廊</div>
                      <div class="text-[10px] text-slate-400 font-mono">拥有: <b class="text-cyan-400">${mithrilKey}</b> 把 · 从第 20 层启程</div>
                    </div>
                  </div>
                  <button id="btn-start-mithril" class="mota-btn-dark px-2.5 py-1 rounded-lg text-xs font-bold border border-cyan-600/70 text-cyan-200 hover:text-white shadow ${mithrilKey > 0 ? '' : 'opacity-40 cursor-not-allowed'} flex-shrink-0">
                    探渊
                  </button>
                </div>

                <!-- 黑曜石钥匙 (熔岩深渊) -->
                <div class="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between hover:border-purple-500/50 transition-colors">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-black/60 border border-purple-800/80 p-1 flex items-center justify-center flex-shrink-0">
                      ${renderGameIcon('key_obsidian', { size: 'w-full h-full' })}
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-purple-200">黑曜石钥匙 · 熔岩深渊</div>
                      <div class="text-[10px] text-slate-400 font-mono">拥有: <b class="text-purple-400">${obsidianKey}</b> 把 · 从第 35 层启程</div>
                    </div>
                  </div>
                  <button id="btn-start-obsidian" class="mota-btn-dark px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-600/70 text-purple-200 hover:text-white shadow ${obsidianKey > 0 ? '' : 'opacity-40 cursor-not-allowed'} flex-shrink-0">
                    破渊
                  </button>
                </div>

                <!-- 青铜钥匙 -->
                <div class="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between hover:border-amber-500/50 transition-colors">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-black/60 border border-amber-600/80 p-1 flex items-center justify-center flex-shrink-0">
                      ${renderGameIcon('key_bronze', { size: 'w-full h-full' })}
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-amber-200">青铜钥匙 · 破界跳层</div>
                      <div class="text-[10px] text-slate-400 font-mono">拥有: <b class="text-amber-400">${bronzeKey}</b> 把 · 从第 50 层启程</div>
                    </div>
                  </div>
                  <button id="btn-start-bronze" class="mota-btn-dark px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-600/70 text-amber-200 hover:text-white shadow ${bronzeKey > 0 ? '' : 'opacity-40 cursor-not-allowed'} flex-shrink-0">
                    破界
                  </button>
                </div>

                <!-- 泰坦神圣钥匙 -->
                <div class="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between hover:border-amber-400/50 transition-colors">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-black/60 border border-amber-500/80 p-1 flex items-center justify-center flex-shrink-0">
                      ${renderGameIcon('key_titan', { size: 'w-full h-full' })}
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-amber-300">泰坦钥匙 · 泰坦神殿</div>
                      <div class="text-[10px] text-slate-400 font-mono">拥有: <b class="text-amber-400">${titanKey}</b> 把 · 从第 70 层启程</div>
                    </div>
                  </div>
                  <button id="btn-start-titan" class="mota-btn-dark px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-500/70 text-amber-200 hover:text-white shadow ${titanKey > 0 ? '' : 'opacity-40 cursor-not-allowed'} flex-shrink-0">
                    探殿
                  </button>
                </div>

                <!-- 白金钥匙 -->
                <div class="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between hover:border-purple-500/50 transition-colors">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-black/60 border border-purple-700/80 p-1 flex items-center justify-center flex-shrink-0">
                      ${renderGameIcon('key_platinum', { size: 'w-full h-full' })}
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-purple-200">白金钥匙 · 终焉决战</div>
                      <div class="text-[10px] text-slate-400 font-mono">拥有: <b class="text-purple-400">${platinumKey}</b> 把 · 从第 90 层决战</div>
                    </div>
                  </div>
                  <button id="btn-start-platinum" class="mota-btn-dark px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-600/70 text-purple-200 hover:text-white shadow ${platinumKey > 0 ? '' : 'opacity-40 cursor-not-allowed'} flex-shrink-0">
                    决战
                  </button>
                </div>
              </div>
            ` : `
              <!-- 探险中状态与累计经验池 -->
              <div class="p-3 rounded-xl bg-amber-950/40 border border-amber-500/80 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-amber-200 flex items-center gap-1.5">
                    <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    探险进行中
                  </span>
                  <span class="text-cyan-400 font-mono font-bold text-sm">第 ${castle.floor || 1} 层</span>
                </div>
                
                <div class="p-2.5 rounded-lg bg-black/60 font-mono text-xs space-y-1.5 border border-slate-800">
                  <div class="flex justify-between">
                    <span class="text-slate-400">累积经验池:</span>
                    <b class="text-emerald-400">+${(castle.accumulatedExp || 0).toLocaleString()} EXP</b>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">累积财富池:</span>
                    <b class="text-amber-400">+${(castle.accumulatedGold || 0).toLocaleString()} 金币</b>
                  </div>
                </div>

                <div class="text-[10px] text-slate-400">
                  主动结束探险全额结算；若战败退出则折半结算。
                </div>

                <button id="btn-claim-castle-exit" class="w-full mota-btn-gold py-2 rounded-lg text-xs font-black shadow">
                  主动结束探险 (全额领取结算)
                </button>
              </div>
            `}
          </div>

          <div class="text-[10px] text-slate-500 text-right pt-2 border-t border-[#4a3520]/70 font-mono">
            古堡探险钥匙可通过野外征战或任务奖励获取
          </div>
        </div>

        <!-- 右侧：当前层数守卫特写与迎战 (7列) -->
        <div class="castle-guard md:col-span-7 mota-parchment-panel p-4 rounded-xl border-2 border-[#caa048] flex flex-col justify-between min-h-0">
          <div class="space-y-3 min-h-0 overflow-y-auto custom-scrollbar">
            <!-- 关卡守卫抬头 -->
            <div class="flex items-center justify-between pb-2.5 border-b border-[#4a3520]/70">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-black/60 border border-amber-700/80 p-1 flex items-center justify-center flex-shrink-0">
                  ${renderGameIcon('wpn_sword', { size: 'w-full h-full' })}
                </div>
                <div>
                  <h3 class="font-bold text-sm text-amber-300">
                    ${floorInfo.name || `第 ${floor} 层守卫`}
                  </h3>
                  <div class="text-[10px] text-slate-400 mt-0.5">无尽魔塔 · 镇守古灵</div>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded font-mono font-bold ${floorInfo.isBoss ? 'bg-red-950 text-red-300 border border-red-500' : 'bg-slate-800 text-slate-300'}">
                ${floorInfo.isBoss ? '关底史诗领主' : '普通层守卫'}
              </span>
            </div>

            <!-- 三大核心数值 -->
            <div class="grid grid-cols-3 gap-2.5">
              <div class="p-2.5 bg-black/50 rounded-xl border border-red-900/40 text-center">
                <span class="text-slate-400 text-[10px]">生命总值</span>
                <div class="font-black text-red-400 font-mono text-xs mt-0.5">${(floorInfo.hp || 0).toLocaleString()}</div>
              </div>
              <div class="p-2.5 bg-black/50 rounded-xl border border-amber-900/40 text-center">
                <span class="text-slate-400 text-[10px]">物理杀伤</span>
                <div class="font-black text-amber-400 font-mono text-xs mt-0.5">${(floorInfo.atk || 0).toLocaleString()}</div>
              </div>
              <div class="p-2.5 bg-black/50 rounded-xl border border-blue-900/40 text-center">
                <span class="text-slate-400 text-[10px]">钢铁护甲</span>
                <div class="font-black text-blue-400 font-mono text-xs mt-0.5">${(floorInfo.def || 0).toLocaleString()}</div>
              </div>
            </div>

            ${this.renderBossTactics(floorInfo)}
            <!-- 关卡珍藏信息 -->
            <div class="p-3 rounded-xl bg-black/40 border border-slate-800 text-xs space-y-1">
              <div class="font-semibold text-amber-300 text-xs">关卡珍藏掉落</div>
              <p class="text-[11px] text-slate-300 leading-relaxed">
                经验与金币累计至撤离领取，魔晶即时入账；守关首领首次击破必得珍藏物品，重复讨伐按普通层级结算。
              </p>
            </div>
          </div>

          <div class="pt-3 border-t border-[#4a3520]/70 flex-shrink-0">
            <button id="btn-challenge-castle-floor" class="w-full mota-btn-gold py-3 rounded-xl text-xs font-black shadow-xl animate-pulse flex items-center justify-center">
              踏入战场 · 迎击第 ${floor} 层守卫
            </button>
          </div>
        </div>

      </div>
    `;
  }

  renderBossTactics(enemy) {
    const tips = getBossTactics(enemy);
    if (!tips.length) return '';
    return `<details class="boss-tactics p-2 rounded border border-[#9c8257] text-xs">
      <summary class="font-bold cursor-pointer">首领机制与反制</summary>
      ${tips.map(tip => `<p class="mt-2 leading-relaxed">${tip}</p>`).join('')}
    </details>`;
  }

  renderDungeonContent(data) {
    if (!data.dungeon) data.dungeon = { entriesLeft: 5, activeGateId: null, activeGateFloor: 1, clearedGates: {} };
    const dung = data.dungeon;
    const selectedGate = DUNGEON_GATES.find(g => g.id === this.selectedGateId) || DUNGEON_GATES[0];
    const isLevelEnough = data.level >= selectedGate.minLevel;
    const isExploringThis = dung.activeGateId === selectedGate.id;
    const isExploringOther = dung.activeGateId && dung.activeGateId !== selectedGate.id;
    const currentFloor = isExploringThis ? (dung.activeGateFloor || 1) : 1;
    const currentGuard = getDungeonFloorGuard(selectedGate.id, currentFloor);
    const clearedCount = dung.clearedGates?.[selectedGate.id] || 0;

    return `
      <div class="h-full grid grid-cols-1 md:grid-cols-12 gap-3">
        
        <!-- 左侧：七大门列表 (5列，紧凑舒适无滚条) -->
        <div class="md:col-span-5 mota-parchment-panel p-2.5 rounded-xl border-2 border-[#caa048] flex flex-col justify-between">
          <div class="text-xs font-bold text-amber-300 pb-1.5 border-b border-[#4a3520]/70 flex items-center justify-between flex-shrink-0">
            <span>地下城七大古门</span>
            <span class="text-[10px] text-slate-400 font-mono">等级进阶准入</span>
          </div>

          <div class="space-y-1.5 my-1.5 flex-1 content-center">
            ${DUNGEON_GATES.map(gate => {
              const isSel = this.selectedGateId === gate.id;
              const canEnter = data.level >= gate.minLevel;
              const isExploring = dung.activeGateId === gate.id;
              const isCleared = (dung.clearedGates?.[gate.id] || 0) > 0;

              return `
                <div data-gate-id="${gate.id}" class="dungeon-gate-card p-1.5 sm:p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  isSel ? 'bg-amber-950/80 border-[#f5c042] shadow-sm' : 'bg-black/40 border-slate-800 hover:border-slate-600'
                }">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-black/60 border border-amber-800/80 p-1 flex items-center justify-center flex-shrink-0">
                      ${renderGameIcon(gate.icon, 'w-full h-full')}
                    </div>
                    <div class="truncate min-w-0">
                      <div class="font-bold text-xs truncate ${isSel ? 'text-amber-200' : 'text-slate-300'}">${gate.name}</div>
                      <div class="text-[10px] text-slate-400 font-mono">${gate.totalFloors}层 · Lv.${gate.minLevel}+</div>
                    </div>
                  </div>
                  <span class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold flex-shrink-0 ${
                    isExploring 
                      ? 'bg-amber-900 text-amber-200 border border-amber-500 animate-pulse'
                      : isCleared
                      ? 'bg-purple-950 text-purple-200 border border-purple-700'
                      : canEnter 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                      : 'bg-red-950 text-red-400 border border-red-900'
                  }">
                    ${isExploring ? `探索第${dung.activeGateFloor || 1}层` : isCleared ? `已荡平(${dung.clearedGates[gate.id]}次)` : canEnter ? '可挑战' : '未解锁'}
                  </span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="text-[10px] text-slate-500 text-center pt-1 border-t border-[#4a3520]/70 font-mono flex-shrink-0">
            副本全境推进，击破关底多阶段首领必得传世神装散件
          </div>
        </div>

        <!-- 右侧：选中古门详情或当前层决战面板 (7列) -->
        <div class="md:col-span-7 mota-parchment-panel p-3.5 sm:p-4 rounded-xl border-2 border-[#caa048] flex flex-col justify-between min-h-0">
          <div class="space-y-2.5 min-h-0 overflow-y-auto custom-scrollbar">
            <!-- 顶栏信息 -->
            <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]/70">
              <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 rounded-xl bg-black/60 border border-amber-700/80 p-1 flex items-center justify-center flex-shrink-0">
                  ${renderGameIcon(selectedGate.icon, 'w-full h-full')}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-bold text-sm text-amber-300">${selectedGate.name}</h3>
                    <span class="text-[10px] px-1.5 py-0.5 rounded font-mono bg-black/60 border border-amber-600/50 text-amber-300">
                      Lv.${selectedGate.minLevel}+
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-300 mt-0.5">${selectedGate.description}</p>
                </div>
              </div>
              <div class="text-right flex-shrink-0 font-mono text-[10px] text-slate-400">
                <div>共 ${selectedGate.totalFloors} 层深度</div>
                <div class="text-amber-400">通关: ${clearedCount} 次</div>
              </div>
            </div>

            <!-- 核心掉落套装展示 -->
            <div class="p-2 rounded-xl bg-black/40 border border-amber-600/40 text-xs">
              <div class="font-bold text-amber-300 text-xs mb-0.5">关底终极神装掉落</div>
              <div class="text-[11px] text-slate-300">${selectedGate.dropsDesc}</div>
            </div>

            ${isExploringThis ? `
              <!-- 正在探索当前门：多层爬塔进度与当前守卫/首领对决 -->
              <div class="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-bold text-amber-200">当前探险深度：第 <b class="text-white text-sm font-mono">${currentFloor}</b> / ${selectedGate.totalFloors} 层</span>
                  <span class="text-[11px] font-mono ${currentGuard.isBoss ? 'text-red-400 font-bold animate-pulse' : 'text-slate-400'}">
                    ${currentGuard.isBoss ? '【首领遭遇】关底多阶段首领！' : '中间层守关怪物'}
                  </span>
                </div>

                <!-- 进度条 -->
                <div class="w-full bg-black/60 rounded-full h-2 border border-slate-700 overflow-hidden">
                  <div class="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full transition-all duration-300" style="width: ${Math.round((currentFloor / selectedGate.totalFloors) * 100)}%"></div>
                </div>

                <!-- 当前敌人属性特写 -->
                <div class="p-2 rounded-lg bg-black/60 border border-slate-800 space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs text-amber-300">${currentGuard.name}</span>
                    ${currentGuard.hasPhases ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 font-mono">神圣护盾·狂暴·献祭</span>` : ''}
                  </div>
                  <div class="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                    <div class="p-1 bg-black/40 rounded border border-slate-800">
                      <span class="text-slate-400 text-[10px] block">生命值</span>
                      <span class="text-red-400 font-bold">${currentGuard.hp.toLocaleString()}</span>
                    </div>
                    <div class="p-1 bg-black/40 rounded border border-slate-800">
                      <span class="text-slate-400 text-[10px] block">攻击力</span>
                      <span class="text-amber-400 font-bold">${currentGuard.atk.toLocaleString()}</span>
                    </div>
                    <div class="p-1 bg-black/40 rounded border border-slate-800">
                      <span class="text-slate-400 text-[10px] block">防御力</span>
                      <span class="text-blue-400 font-bold">${currentGuard.def.toLocaleString()}</span>
                    </div>
                  </div>
                  ${currentGuard.phase1Shield ? `<div class="text-[10px] text-amber-200/90 font-mono">【首领特质】起手持【神圣护盾】(${currentGuard.phase1Shield.toLocaleString()})，血量降至 50% 绝境狂暴(+35%攻)，25% 献祭随从自愈！</div>` : ''}
                </div>
              </div>
            ` : `
              <!-- 未在探索：同伴协同与关底领主预览 -->
              <div class="p-2 rounded-xl bg-black/40 border border-slate-800 text-xs space-y-1.5">
                <div class="font-bold text-amber-300 text-xs">出征同伴协同：</div>
                <div class="grid grid-cols-3 gap-2">
                  <label class="flex items-center gap-1.5 p-2 rounded-lg bg-black/50 border border-slate-800 cursor-pointer hover:border-amber-400 transition-colors">
                    <input type="radio" name="companion" value="none" ${this.selectedCompanion === 'none' ? 'checked' : ''} class="accent-amber-500">
                    <span class="text-[11px] text-slate-200">单枪匹马</span>
                  </label>
                  <label class="flex items-center gap-1.5 p-2 rounded-lg bg-black/50 border border-slate-800 cursor-pointer hover:border-amber-400 transition-colors">
                    <input type="radio" name="companion" value="merc" ${this.selectedCompanion === 'merc' ? 'checked' : ''} class="accent-amber-500">
                    <span class="text-[11px] text-blue-300">佣兵援护</span>
                  </label>
                  <label class="flex items-center gap-1.5 p-2 rounded-lg bg-black/50 border border-slate-800 cursor-pointer hover:border-amber-400 transition-colors">
                    <input type="radio" name="companion" value="slave" ${this.selectedCompanion === 'slave' ? 'checked' : ''} class="accent-amber-500">
                    <span class="text-[11px] text-purple-300">侍从出战</span>
                  </label>
                </div>
              </div>

              <!-- 领主档案预览 -->
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div class="p-2 bg-black/50 rounded-lg border border-slate-800 text-center">
                  <span class="text-slate-400 text-[10px]">关底主宰</span>
                  <div class="font-bold text-amber-300 text-xs mt-0.5 truncate">${selectedGate.boss.name}</div>
                </div>
                <div class="p-2 bg-black/50 rounded-lg border border-slate-800 text-center">
                  <span class="text-slate-400 text-[10px]">领主生命</span>
                  <div class="font-bold text-red-400 font-mono text-xs mt-0.5">${selectedGate.boss.hp.toLocaleString()}</div>
                </div>
                <div class="p-2 bg-black/50 rounded-lg border border-slate-800 text-center">
                  <span class="text-slate-400 text-[10px]">领主攻击</span>
                  <div class="font-bold text-amber-400 font-mono text-xs mt-0.5">${selectedGate.boss.atk.toLocaleString()}</div>
                </div>
              </div>
            `}
            ${this.renderBossTactics(isExploringThis ? currentGuard : getDungeonFloorGuard(selectedGate.id, selectedGate.totalFloors))}
          </div>

          <!-- 操作按钮区域 -->
          <div class="pt-2 border-t border-[#4a3520]/70 flex-shrink-0">
            ${isExploringThis ? `
              <div class="space-y-1.5">
                <button id="btn-dungeon-fight" class="w-full mota-btn-gold py-2.5 rounded-xl text-xs font-black shadow-xl flex items-center justify-center animate-pulse">
                  ${currentGuard.isBoss ? '决战关底多阶段领主 · 斩获极品套装' : `迎战第 ${currentFloor} 层守卫 (${currentGuard.name})`}
                </button>
                <button id="btn-dungeon-retreat" class="w-full mota-btn-dark py-1.5 rounded-xl text-xs text-slate-400 hover:text-white border border-slate-700 text-center">
                  撤离并重置副本探索
                </button>
              </div>
            ` : isExploringOther ? `
              <button class="w-full mota-btn-dark py-2.5 rounded-xl text-xs font-bold border border-amber-800 text-amber-300 opacity-60 cursor-not-allowed">
                正在探索其他副本中 (请先完成或撤离)
              </button>
            ` : !isLevelEnough ? `
              <button class="w-full mota-btn-dark py-2.5 rounded-xl text-xs font-bold border border-slate-800 text-slate-500 opacity-40 cursor-not-allowed">
                等级不足 (需 Lv.${selectedGate.minLevel})
              </button>
            ` : dung.entriesLeft <= 0 && !data.bag.some(item => item.id === 'royal_dungeon_permit' && item.count > 0) ? `
              <button class="w-full mota-btn-dark py-2.5 rounded-xl text-xs font-bold border border-slate-800 text-red-400 opacity-60 cursor-not-allowed">
                今日副本挑战次数已用尽 (0/5)
              </button>
            ` : `
              <button id="btn-enter-dungeon" class="w-full mota-btn-gold py-2.5 rounded-xl text-xs font-black shadow-xl flex items-center justify-center animate-pulse">
                ${dung.entriesLeft === 0 ? '使用调查通行令 · ' : ''}开启结界 · 踏入副本探险 (第 1 层)
              </button>
            `}
          </div>
        </div>

      </div>
    `;
  }

  renderRelicsContent(data) {
    const relics = gameState.getRelics();
    const unlockedCount = relics.filter(r => r.isUnlocked).length;
    const totalStats = getRelicsTotalStats(data.relics?.unlocked || []);

    return `
      <div class="h-full flex flex-col space-y-3 overflow-y-auto pr-1">
        <!-- 顶部总览光环面板 -->
        <div class="mota-parchment-panel p-3.5 rounded-xl border-2 border-[#caa048] flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-black/60 border border-amber-600/80 p-1.5 flex items-center justify-center flex-shrink-0">
              ${renderGameIcon('relic_holy', 'w-full h-full')}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-black text-sm text-amber-300">深渊神域 · 远古圣遗物圣坛</h3>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950 text-amber-200 border border-amber-500/60">
                  觉醒进度: ${unlockedCount} / 6
                </span>
              </div>
              <div class="text-[11px] text-slate-400 mt-1 leading-relaxed">
                突破魔塔 50~100 层守关领主觉醒圣器，永久赋予勇者神圣被动特质与宏伟属性光环！
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 text-[10px] font-mono text-amber-200 bg-black/50 p-2 rounded-lg border border-amber-900/60 flex-shrink-0">
            <span>生命 <b class="text-white">+${totalStats.hp}</b></span>
            <span>攻击 <b class="text-white">+${totalStats.atk}</b></span>
            <span>防御 <b class="text-white">+${totalStats.def}</b></span>
            <span>暴伤 <b class="text-white">+${totalStats.critDmg}%</b></span>
            <span>免伤 <b class="text-white">+${totalStats.dmgResist}%</b></span>
          </div>
        </div>

        <!-- 6大圣遗物卡片网格 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
          ${relics.map(r => {
            const isUnlocked = r.isUnlocked;
            return `
              <div class="p-3 rounded-xl border transition-all ${
                isUnlocked 
                  ? 'bg-amber-950/20 border-amber-500/70 shadow-lg' 
                  : 'bg-black/40 border-slate-800 opacity-60'
              } flex flex-col justify-between space-y-2.5">
                <div class="flex items-start gap-3">
                  <div class="w-11 h-11 rounded-xl bg-black/60 border ${
                    isUnlocked ? 'border-amber-500' : 'border-slate-700'
                  } p-1.5 flex items-center justify-center flex-shrink-0">
                    ${renderGameIcon(r.icon || 'relic_holy', 'w-full h-full')}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <h4 class="font-bold text-xs ${isUnlocked ? 'text-amber-200' : 'text-slate-400'} truncate">
                        ${r.name}
                      </h4>
                      <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        isUnlocked ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/70' : 'bg-slate-800 text-slate-400'
                      }">
                        ${isUnlocked ? '[已觉醒生效中]' : `[第 ${r.unlockFloor} 层觉醒]`}
                      </span>
                    </div>
                    <div class="text-[10px] text-amber-400/90 font-mono mt-0.5">
                      专属神威：【${r.passiveName}】
                    </div>
                    <div class="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      ${r.passiveDesc}
                    </div>
                  </div>
                </div>

                <div class="pt-2 border-t border-[#4a3520]/50 flex items-center justify-between text-[10px] font-mono">
                  <span class="text-slate-500 italic">${r.title}</span>
                  <div class="text-amber-300">
                    ${Object.entries(r.stats).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(' · ')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 切换子标签
    const btnCastle = document.getElementById('btn-subtab-castle');
    const btnDung = document.getElementById('btn-subtab-dungeons');
    const btnRelics = document.getElementById('btn-subtab-relics');
    if (btnCastle) {
      btnCastle.addEventListener('click', () => {
        this.subTab = 'castle';
        sound.playSlash();
        this.render();
      });
    }
    if (btnDung) {
      btnDung.addEventListener('click', () => {
        this.subTab = 'dungeons';
        sound.playSlash();
        this.render();
      });
    }
    if (btnRelics) {
      btnRelics.addEventListener('click', () => {
        this.subTab = 'relics';
        sound.playSlash();
        this.render();
      });
    }

    // 古堡钥匙启动
    const bindKeyStart = (btnId, keyId, startFloor) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          const result = gameState.startCastleExpedition(keyId);
          if (!result.success) return gameModal.alert(result.msg, '古堡破界');

          sound.playCoin();
          gameModal.alert(`探险启程！消耗钥匙，成功破界切入第 ${startFloor} 层！`, '古堡破界启程');
          gameState.notify();
          this.render();
        });
      }
    };

    bindKeyStart('btn-start-redwood', 'key_redwood', 1);
    bindKeyStart('btn-start-mithril', 'key_mithril', 20);
    bindKeyStart('btn-start-obsidian', 'key_obsidian', 35);
    bindKeyStart('btn-start-bronze', 'key_bronze', 50);
    bindKeyStart('btn-start-titan', 'key_titan', 70);
    bindKeyStart('btn-start-platinum', 'key_platinum', 90);
    const btnRetryFinale = this.container.querySelector('#btn-retry-finale');
    if (btnRetryFinale) btnRetryFinale.addEventListener('click', () => {
      const result = gameState.startFinaleRetry();
      this.render();
      if (!result.success) return gameModal.alert(result.msg, '王座重试');
      this.container.querySelector('#btn-challenge-castle-floor')?.focus();
      gameModal.alert('直接重返100层。只有本场胜利会产生新收益，之前的探险不会重复结算。', '王座重试');
    });

    // 主动结算古堡探险
    const btnClaimExit = document.getElementById('btn-claim-castle-exit');
    if (btnClaimExit) {
      const claimExpeditionId = gameState.data.castle.expeditionId;
      btnClaimExit.addEventListener('click', () => {
        const result = gameState.finishCastleExpedition(claimExpeditionId);
        if (!result.success) return gameModal.alert(result.msg, '古堡结算');
        const { exp, gold } = result;

        sound.playFanfare();
        gameModal.alert(`探险圆满凯旋！全额领取结算经验 +${exp.toLocaleString()}，金币 +${gold.toLocaleString()}！`, '古堡凯旋');
        this.render();
      });
    }

    // 挑战古堡当前层守卫
    const btnChallengeCastle = document.getElementById('btn-challenge-castle-floor');
    if (btnChallengeCastle) {
      btnChallengeCastle.addEventListener('click', () => {
        if (gameState.data.castle.finished) return gameModal.alert('本次探险已登顶，请领取累计收益并离开。', '魔塔登顶');
        if (!gameState.data.castle.isExploring || !gameState.data.castle.expeditionId) return;
        const expeditionId = gameState.data.castle.expeditionId;
        const floor = gameState.data.castle.floor || 1;
        const floorInfo = getTowerFloorData(floor, gameState.data.onboardingVersion);

        gameState.data.isCastleExplore = true; // 激活每场1次免费复活

        this.onStartBattle({
          enemyData: { name: floorInfo.name, icon: getVectorIcon(floorInfo.icon || 'bld_tower', 'w-full h-full'), level: floor, abilities: floorInfo.abilities, rebirth: floorInfo.rebirth, openingShield: floorInfo.openingShield },
          enemyStats: {
            hp: floorInfo.hp,
            maxHp: floorInfo.maxHp || floorInfo.hp,
            mp: floorInfo.mp ?? 50,
            maxMp: floorInfo.maxMp ?? 50,
            atk: floorInfo.atk,
            def: floorInfo.def,
            speed: floorInfo.speed ?? 15,
            crit: floorInfo.crit ?? 5,
            dodge: floorInfo.dodge ?? 5
          },
          onFinish: (victory) => {
            if (gameState.data.castle.expeditionId !== expeditionId || gameState.data.castle.floor !== floor || !gameState.data.castle.isExploring) return;
            gameState.data.isCastleExplore = false;
            if (victory) {
              const reward = gameState.settleCastleVictory(floor, expeditionId);
              if (!reward.success) return;
              if (reward.firstClear) gameState.addSystemLog(`魔塔第 ${floor} 层首通：魔晶 +${reward.crystal}，${reward.item.name}已存入行囊；经验与金币计入探险累计收益。`, 'loot');
              sound.playCoin();

              // 检查远古神圣圣遗物觉醒
              const newRelics = reward.newRelics;
              if (newRelics && newRelics.length > 0) {
                const rNames = newRelics.map(r => `【${r.name}】(${r.passiveName})`).join('、');
                sound.playFanfare();
                gameModal.alert(`神迹降临！你成功攻克第 ${floor} 层！\n远古神圣圣遗物 ${rNames} 震撼觉醒！\n神圣光环与传世神威已永久融入勇者身躯！`, '远古圣遗物觉醒');
              }

              // 100 层终焉关底大圆满
              if (floor === 100) {
                sound.playFanfare();
                if (gameState.data.onboardingVersion === 2) {
                  gameModal.alert('黑翼龙皇倒下，裂隙的轰鸣终于停止。米拉点亮了返回王都的信号，赛拉扶起受伤的伙伴。\n\n带上远征记录和同伴回城，把这场漫长调查的结果交给罗兰。探险累计收益仍需撤离后领取。', '归途');
                } else {
                gameModal.alert(`【终焉盛典 · 征服魔塔】震撼全大陆！你成功斩杀了魔塔第 100 层最终主宰【黑翼龙皇·奥斯汀】！拯救了整个亚诺古陆！\n终焉创世神格已然凝聚，你已登顶《魔塔世界》最高巅峰！`, '终焉大圆满');
                }
              }

              gameState.notify();

              if (floor === 1 && gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_6') {
                gameModal.confirm(
                  `凯歌高奏！成功击溃魔塔第 1 层守卫！\n\n【主线任务达成】初试锋芒 · 踏入魔塔！\n奖赏：经验 +2800，金币 +5000，魔晶 +80，【${specializeEquipment(QUEST_LIST.find(q => q.id === 'quest_6').rewards.items[0], gameState.data.classId).name}】！\n\n是否立即领受犒赏并开启下一阶段主线【领地开拓 · 炼金魔药】？`,
                  () => {
                    gameState.claimQuestReward('quest_6');
                    gameModal.alert('职业护手已存入行囊！已为你开启下一阶段主线【领地开拓 · 炼金魔药】，前往城郊领地庄园调配魔药吧！', '主线推进', () => {
                      if (window.switchMainTab) window.switchMainTab('estate');
                    });
                  },
                  () => this.render(),
                  '主线大捷 · 踏入魔塔'
                );
                this.render();
                return;
              }

              if (floor === 10 && gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_9') {
                gameModal.confirm(
                  `王都捷报！你成功战胜第 10 层终极领主【远古巨石魔像】！\n\n【主线终极试炼达成】终焉试炼 · 斩落石魔！\n传世犒赏：经验 +12000，金币 +25000，魔晶 +300，绝世暗金【${specializeEquipment(QUEST_LIST.find(q => q.id === 'quest_9').rewards.items[0], gameState.data.classId).name}】！\n\n勇气武器达到15级可穿戴，与护手组成两件套共鸣。接下来先学习宝石镶嵌，再追查商队遭遇的巨龙。`,
                  () => {
                    gameState.claimQuestReward('quest_9');
                    gameModal.alert('职业武器与金刚石已存入行囊。先在铁匠铺学习镶嵌，再前往荒野成长，准备讨伐赤焰红龙。', '终焉神殿盛典');
                  },
                  () => this.render(),
                  '终焉大捷 · 斩落石魔'
                );
                this.render();
                return;
              }

              this.render();
            } else {
              // 失败结算一半经验
              const result = gameState.finishCastleExpedition(expeditionId, floor);
              if (!result.success) return;
              const halfExp = result.exp;
              gameModal.alert(`挑战未果！被动退出探险，折半结算获得 ${halfExp} 点经验。`, '古堡历练结算');
              this.render();
            }
          }
        });
      });
    }

    // 副本选择与挑战
    document.querySelectorAll('.dungeon-gate-card').forEach(card => {
      card.addEventListener('click', () => {
        const gid = card.getAttribute('data-gate-id');
        this.selectedGateId = gid;
        sound.playSlash();
        this.render();
      });
    });

    // 助战同伴单选
    document.querySelectorAll('input[name="companion"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.selectedCompanion = e.target.value;
      });
    });

    // 进入副本探险 (第 1 层)
    const btnEnterDungeon = document.getElementById('btn-enter-dungeon');
    if (btnEnterDungeon) {
      btnEnterDungeon.addEventListener('click', () => {
        const result = gameState.startDungeonExpedition(this.selectedGateId);
        if (!result.success) return gameModal.alert(result.msg, '地下城入场');
        const gate = result.gate;

        sound.playSlash();
        gameModal.alert(`远古结界轰然开启！你已踏入【${gate.name}】第 1 层！破除全部 ${gate.totalFloors} 层守卫即可决战关底领主！`, '踏入地下城');
        this.render();
      });
    }

    // 撤离副本
    const btnDungeonRetreat = document.getElementById('btn-dungeon-retreat');
    if (btnDungeonRetreat) {
      btnDungeonRetreat.addEventListener('click', () => {
        const dung = gameState.data.dungeon;
        const result = gameState.retreatDungeonExpedition(dung.expeditionId);
        if (!result.success) return gameModal.alert(result.msg, '地下城撤离');
        sound.playBlock();
        gameModal.alert(result.msg, '撤离副本');
        this.render();
      });
    }

    // 挑战当前层守卫或关底领主
    const btnDungeonFight = document.getElementById('btn-dungeon-fight');
    if (btnDungeonFight) {
      btnDungeonFight.addEventListener('click', () => {
        const dung = gameState.data.dungeon;
        const gate = DUNGEON_GATES.find(g => g.id === dung.activeGateId);
        if (!gate) return;

        const floor = dung.activeGateFloor || 1;
        const expeditionId = dung.expeditionId;
        const guard = getDungeonFloorGuard(gate.id, floor);

        // 设置侍从助战
        if (this.selectedCompanion === 'slave') {
          gameState.data.assistingSlave = gameState.data.slaves?.list?.[0] || null;
        } else {
          gameState.data.assistingSlave = null;
        }

        this.onStartBattle({
          enemyData: {
            name: guard.name,
            icon: guard.icon,
            hasPhases: guard.hasPhases,
            phase1Shield: guard.phase1Shield,
            phase2EnrageHp: guard.phase2EnrageHp,
            phase3Minion: guard.phase3Minion,
            dialogue: guard.dialogue,
            abilities: guard.abilities
          },
          enemyStats: {
            hp: guard.hp,
            maxHp: guard.maxHp,
            mp: guard.mp,
            maxMp: guard.maxMp,
            atk: guard.atk,
            def: guard.def,
            speed: guard.speed,
            hasPhases: guard.hasPhases,
            phase1Shield: guard.phase1Shield,
            phase2EnrageHp: guard.phase2EnrageHp,
            phase3Minion: guard.phase3Minion
          },
          onFinish: (victory) => {
            gameState.data.assistingSlave = null;
            if (victory) {
              const result = gameState.settleDungeonVictory(gate.id, floor, expeditionId);
              if (!result.success) return gameModal.alert(result.msg, '地下城结算');
              const expGain = result.exp;
              const goldGain = result.gold;
              if (!result.final) {
                // 中间层胜利
                sound.playCoin();
                gameModal.alert(`大捷！成功肃清【${gate.name}】第 ${floor} 层！\n获得经验 +${expGain}，金币 +${goldGain}，魔晶 +${result.crystal}！\n结界通道已通往第 ${floor + 1} 层！`, '地下城推进');
              } else {
                // 关底领主大圆满！
                const dropItem = result.drop;
                sound.playFanfare();
                gameModal.alert(`【史诗大捷 · 荡平神门】\n你成功荡平了【${gate.name}】全境，斩灭终极领主【${guard.name}】！\n\n缴获传世神装：【${dropItem.name}】(${dropItem.setName})！\n斩获赏赐：经验 +${expGain.toLocaleString()}，金币 +${goldGain.toLocaleString()}，暗金晶石x2，魔晶+${result.crystal}，声望+120！\n远征补给：${result.supplies.map(item => `【${item.name}】x${item.count}`).join('、')}。${result.story ? '\n\n' + result.story : ''}`, '地下城史诗大捷');
              }
              this.render();
            } else {
              // 战败退却
              const result = gameState.retreatDungeonExpedition(expeditionId);
              if (!result.success) return gameModal.alert(result.msg, '地下城结算');
              sound.playBlock();
              gameModal.alert(`在与【${guard.name}】的激战中力竭负伤，被结界灵力安全送出。可在休整后重新进入。`, '地下城退却');
              this.render();
            }
          }
        });
      });
    }
  }
}
