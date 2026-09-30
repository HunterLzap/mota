// 亚诺圣光王都视图：100% 还原《魔塔世界》百度百科原著
// 采用多层级、全屏独立、高保真羊皮纸子页面流转架构，彻底告别挤压与混杂
import { gameState } from '../core/state.js';
import { ITEM_SLOTS, SLOT_MAP, QUALITIES, SPECIAL_ITEMS, OFFICIAL_SETS, REFORGE_AFFIXES } from '../config/items.js';
import { DRAGON_TRIALS } from '../config/dragonSlaying.js';
import { ROYAL_TRIALS } from '../config/trials.js';
import { ARENA_RANKS, ARENA_OPPONENTS, PRESTIGE_SHOP_ITEMS } from '../config/arena.js';
import { TAVERN_BOUNTIES, TAVERN_DRINKS } from '../config/tavern.js';
import { MERCENARIES } from '../config/estate.js';
import { RUNES, RUNIC_WORDS } from '../config/runes.js';
import { MILITARY_RANKS, STRONGHOLDS, FACTION_REWARDS } from '../config/factionWar.js';
import { NATIONS } from '../config/classes.js';
import { sound } from '../core/sound.js';
import { getVectorIcon } from '../assets/vectorIcons.js';
import { renderGameIcon } from './iconHelper.js';
import { atmosphere } from '../effects/atmosphere.js';
import { tooltip } from './tooltip.js';
import { gameModal } from './modal.js';

export class TownView {
  constructor(containerId, onOpenBattle) {
    this.container = document.getElementById(containerId);
    this.onOpenBattle = onOpenBattle;
    
    // 子页面路由：
    // 'hub'              - 王都中心大街
    // 'smithy'           - 皇家铁匠铺工坊大厅
    // 'smithy_enhance'   - 升星精铸专室
    // 'smithy_socket'    - 宝石打孔镶嵌专室
    // 'smithy_repair'    - 全身耐久修缮室
    // 'smithy_smelt'     - 装备分解熔炉
    // 'smithy_reforge'   - 传奇词条神兵重铸专室
    // 'palace'           - 圣王大殿主厅
    // 'palace_salary'    - 每日俸禄早朝
    // 'palace_trials'    - 幻境试炼封号长廊
    // 'palace_arena'     - 王国角斗场竞技天梯
    // 'dragons'          - 远古屠龙圣殿
    // 'fishing'          - 碧波垂钓水域
    this.currentView = 'hub';
    this.selectedEquipSlot = 'weapon';
    this.arenaSubTab = 'duel'; // 'duel' | 'shop'
    this.selectedGemUid = null;
    this.selectedReforgeCrystal = null;
  }

  render() {
    if (!this.container) return;

    if (this.currentView === 'smithy_enhance' || this.currentView === 'smithy_repair' || this.currentView === 'smithy_smelt' || this.currentView === 'smithy_socket' || this.currentView === 'smithy_reforge') {
      atmosphere.setPreset('forge');
    } else if (this.currentView === 'fishing') {
      atmosphere.setPreset('forest');
    } else if (this.currentView.startsWith('tavern')) {
      atmosphere.setPreset('forge');
    } else {
      atmosphere.setPreset('palace');
    }

    let html = '';
    switch (this.currentView) {
      case 'hub':
        html = this.renderTownHub();
        break;
      case 'smithy':
        html = this.renderSmithyHub();
        break;
      case 'smithy_enhance':
        html = this.renderSmithyEnhance();
        break;
      case 'smithy_socket':
        html = this.renderSmithySocket();
        break;
      case 'smithy_repair':
        html = this.renderSmithyRepair();
        break;
      case 'smithy_smelt':
        html = this.renderSmithySmelt();
        break;
      case 'smithy_reforge':
        html = this.renderSmithyReforge();
        break;
      case 'smithy_runes':
        html = this.renderSmithyRunes();
        break;
      case 'palace':
        html = this.renderPalaceHub();
        break;
      case 'palace_salary':
        html = this.renderPalaceSalary();
        break;
      case 'palace_trials':
        html = this.renderPalaceTrials();
        break;
      case 'palace_arena':
        html = this.renderPalaceArena();
        break;
      case 'dragons':
        html = this.renderDragons();
        break;
      case 'fishing':
        html = this.renderFishing();
        break;
      case 'tavern':
        html = this.renderTavernHub();
        break;
      case 'tavern_bounty':
        html = this.renderTavernBounty();
        break;
      case 'tavern_mercenary':
        html = this.renderTavernMercenary();
        break;
      case 'tavern_drinks':
        html = this.renderTavernDrinks();
        break;
      case 'faction_war':
        html = this.renderFactionWar();
        break;
      default:
        html = this.renderTownHub();
    }

    this.container.innerHTML = html;
    this.bindEvents();
  }

  // ==========================================
  // 1. 【王都中心大街】(Town Hub)
  // ==========================================
  renderTownHub() {
    const data = gameState.data;
    const canClaim = gameState.canClaimSalary();
    const bounties = gameState.getTavernBounties();
    const hasClaimableBounty = bounties.some(b => b.status === 'ready_to_claim');
    const availableBountyCount = bounties.filter(b => b.status === 'available').length;
    const drinkBuff = data.tavern?.drinkBuff;
    const drinkBuffText = drinkBuff ? `特调酒力: ${drinkBuff.name}` : `今日待揭悬赏: ${availableBountyCount} 份`;

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑与城邦简介 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">亚诺圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">王城中心大街 (六大王国重地)</span>
          </div>
          <div class="text-[11px] text-slate-300 font-mono hidden sm:block">
            亚诺历 1024 年 · 纯正中世纪城邦
          </div>
        </div>

        <!-- 主体：六大宏伟建筑传送卡片 (响应式网格与顺畅滚动) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 overflow-y-auto pr-1">
          
          <!-- 1. 皇家铁匠铺 -->
          <div data-goto="smithy" class="btn-goto-subview mota-building-card p-3.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-600/70 hover:border-amber-400 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-amber-500/30">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-amber-950/70 border border-amber-500/70 flex items-center justify-center p-1.5 shadow-inner">
                    ${getVectorIcon('bld_smithy', 'w-full h-full')}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-amber-200 tracking-wide">皇家铁匠铺</h3>
                    <p class="text-[10px] text-amber-400/80">原著 8 星升星精铸 · 全身修缮 · 熔炼分解</p>
                  </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300 font-mono">
                  神兵重器
                </span>
              </div>
              <div class="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>精铸特色:</span>
                <span class="text-amber-300 font-mono">十部位装备 · 保护水晶防降星</span>
              </div>
            </div>

            <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
              <span class="text-[11px] text-slate-400 font-normal">升星 · 修理 · 分解</span>
              <button class="px-3.5 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                进入铁匠铺 ->
              </button>
            </div>
          </div>

          <!-- 2. 圣王大殿 -->
          <div data-goto="palace" class="btn-goto-subview mota-building-card p-3.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-500/70 hover:border-amber-300 transition-all relative">
            ${canClaim ? `
              <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
                俸禄可领
              </div>
            ` : ''}
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-amber-500/30">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-amber-950/70 border border-amber-400/70 flex items-center justify-center p-1.5 shadow-inner">
                    ${getVectorIcon('bld_palace', 'w-full h-full')}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-amber-200 tracking-wide">圣王大殿</h3>
                    <p class="text-[10px] text-amber-400/80">每日王国俸禄 · 幻境试炼晋升八大封号</p>
                  </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300 font-mono">
                  圣王敕命
                </span>
              </div>
              <div class="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>每日早朝:</span>
                <span class="font-mono ${canClaim ? 'text-amber-300 font-bold' : 'text-slate-400'}">${canClaim ? '俸禄待领受 (+1500金币)' : '今日已领受'}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
              <span class="text-[11px] text-slate-400 font-normal">王室津贴与荣耀册封</span>
              <button class="px-3.5 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                晋见圣王 ->
              </button>
            </div>
          </div>

          <!-- 3. 远古屠龙圣殿 -->
          <div data-goto="dragons" class="btn-goto-subview mota-building-card p-3.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-rose-900/70 hover:border-rose-500 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-rose-500/30">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-red-950/70 border border-red-500/70 flex items-center justify-center p-1.5 shadow-inner">
                    ${getVectorIcon('bld_dragons', 'w-full h-full')}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-rose-200 tracking-wide">远古屠龙圣殿</h3>
                    <p class="text-[10px] text-rose-400/80">斩杀秘银/金龙/狂龙 · 夺取天命石与紫金晶石</p>
                  </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-red-950/80 border border-red-600/60 text-red-300 font-mono">
                  灭龙远征
                </span>
              </div>
              <div class="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>今日剩余:</span>
                <span class="text-amber-300 font-mono">${data.dragon?.trialsLeft ?? 3} / 3 次</span>
              </div>
            </div>

            <div class="pt-2 border-t border-rose-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
              <span class="text-[11px] text-slate-400 font-normal">三阶恶龙与神兽突破</span>
              <button class="px-3.5 py-1 rounded-lg mota-btn-dark border border-amber-600/50 text-amber-200 text-xs font-bold shadow">
                步入龙域 ->
              </button>
            </div>
          </div>

          <!-- 4. 碧波垂钓水域 -->
          <div data-goto="fishing" class="btn-goto-subview mota-building-card p-3.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-cyan-900/70 hover:border-cyan-500 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-cyan-500/30">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/70 flex items-center justify-center p-1.5 shadow-inner">
                    ${getVectorIcon('bld_fishing', 'w-full h-full')}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-cyan-200 tracking-wide">碧波水域 · 悠闲垂钓</h3>
                    <p class="text-[10px] text-cyan-400/80">七鳃鳗换魔晶 · 秘制鱼饵博取传世金龙鱼</p>
                  </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-600/60 text-cyan-300 font-mono">
                  丰饶收获
                </span>
              </div>
              <div class="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>渔获统计:</span>
                <span class="text-amber-300 font-mono">金龙鱼 ${data.fishing?.arowana || 0} 尾 · 七鳃鳗 ${data.fishing?.lamprey || 0} 尾</span>
              </div>
            </div>

            <div class="pt-2 border-t border-cyan-900/40 flex items-center justify-between text-xs text-cyan-300 font-bold">
              <span class="text-[11px] text-slate-400 font-normal">魔晶丰产与稀有战利品</span>
              <button class="px-3.5 py-1 rounded-lg mota-btn-dark border border-cyan-700/50 text-cyan-200 text-xs font-bold shadow">
                前往水域 ->
              </button>
            </div>
          </div>

          <!-- 5. 亚诺皇家酒馆 -->
          <div data-goto="tavern" class="btn-goto-subview mota-building-card p-3.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-600/70 hover:border-amber-400 transition-all relative">
            ${hasClaimableBounty ? `
              <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-bounce shadow">
                赏金待领
              </div>
            ` : ''}
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-amber-500/30">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-amber-950/70 border border-amber-500/70 flex items-center justify-center p-1.5 shadow-inner">
                    ${getVectorIcon('bld_tavern', 'w-full h-full')}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-amber-200 tracking-wide">亚诺皇家酒馆</h3>
                    <p class="text-[10px] text-amber-400/80">每日赏金悬赏榜 · 佣兵集结 · 吧台特酿与游吟诗人</p>
                  </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300 font-mono">
                  佣兵与赏金
                </span>
              </div>
              <div class="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>酒馆情报:</span>
                <span class="text-amber-300 font-mono">${drinkBuffText}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
              <span class="text-[11px] text-slate-400 font-normal">通缉令 · 誓约盟友 · 畅饮增益</span>
              <button class="px-3.5 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                步入酒馆 ->
              </button>
            </div>
          </div>

          <!-- 6. 边境战事 · 三大阵营要塞争夺 -->
          <div data-goto="faction_war" class="btn-goto-subview mota-building-card p-3.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-indigo-600/70 hover:border-indigo-400 transition-all relative">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-indigo-500/30">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-500/70 flex items-center justify-center p-1.5 shadow-inner">
                    ${getVectorIcon(data.nation ? `nation_${data.nation}` : 'nation_aden', 'w-full h-full')}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-indigo-200 tracking-wide">边境要塞 · 三大阵营战</h3>
                    <p class="text-[10px] text-indigo-400/80">三大城邦边境争夺 · 攻破敌阵要塞 · 战勋晋升军衔</p>
                  </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-600/60 text-indigo-300 font-mono">
                  ${data.factionWar ? (MILITARY_RANKS.find(r => r.id === data.factionWar.militaryRank)?.name || '远征新兵') : '远征新兵'}
                </span>
              </div>
              <div class="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>阵营战勋:</span>
                <span class="text-amber-300 font-mono">军勋 ${data.factionWar?.merit || 0} 点 · 每日军饷</span>
              </div>
            </div>

            <div class="pt-2 border-t border-indigo-900/40 flex items-center justify-between text-xs text-indigo-300 font-bold">
              <span class="text-[11px] text-slate-400 font-normal">银翼要塞 · 黑铁隘口 · 月影哨塔</span>
              <button class="px-3.5 py-1 rounded-lg mota-btn-dark border border-indigo-500/70 text-indigo-200 text-xs font-bold shadow">
                督战前线 ->
              </button>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 2. 【皇家铁匠铺工坊大厅】(Smithy Hub)
  // ==========================================
  renderSmithyHub() {
    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑与返回上一级 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">皇家铁匠铺工坊大厅</span>
          </div>
          <button data-goto="hub" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王都大街</span>
          </button>
        </div>

        <!-- 铁匠铺六大独立功能专室 (紧凑舒展，绝不遮挡底部按键) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto pr-1">
          
          <!-- 1. 升星精铸专室 -->
          <div data-goto="smithy_enhance" class="btn-goto-subview mota-building-card p-2.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-500/80 bg-amber-950/20 hover:border-amber-400 transition-all">
            <div>
              <div class="flex items-center gap-2 pb-2 border-b border-[#4a3520]">
                <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center p-1 flex-shrink-0">
                  ${getVectorIcon('star_crystal', 'w-full h-full')}
                </div>
                <div class="min-w-0">
                  <h3 class="text-xs font-black text-amber-200 truncate">升星精铸专室</h3>
                  <div class="text-[9px] text-amber-400/80">+1 ~ +8 星巅峰淬炼</div>
                </div>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[9px] text-slate-400 flex items-center justify-between">
                <span>特色:</span>
                <span class="text-amber-300 font-mono">最高+8星 · 保护水晶</span>
              </div>
            </div>
            <div class="pt-2 border-t border-amber-900/40">
              <button class="w-full mota-btn-gold py-1 rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1">
                <span>进入升星 -></span>
              </button>
            </div>
          </div>

          <!-- 2. 宝石工坊打孔镶嵌 -->
          <div data-goto="smithy_socket" class="btn-goto-subview mota-building-card p-2.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-emerald-500/80 bg-emerald-950/20 hover:border-emerald-400 transition-all">
            <div>
              <div class="flex items-center gap-2 pb-2 border-b border-[#4a3520]">
                <div class="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center p-1 flex-shrink-0">
                  ${getVectorIcon('gem_atk', 'w-full h-full')}
                </div>
                <div class="min-w-0">
                  <h3 class="text-xs font-black text-emerald-200 truncate">宝石工坊 · 镶嵌</h3>
                  <div class="text-[9px] text-emerald-400/80">4孔开凿与宝石镶嵌</div>
                </div>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[9px] text-slate-400 flex items-center justify-between">
                <span>特色:</span>
                <span class="text-emerald-300 font-mono">四维宝石 · 无损摘除</span>
              </div>
            </div>
            <div class="pt-2 border-t border-emerald-900/40">
              <button class="w-full mota-btn-dark py-1 rounded-lg text-xs font-bold text-emerald-200 border border-emerald-600/70 shadow flex items-center justify-center gap-1">
                <span>进入工坊 -></span>
              </button>
            </div>
          </div>

          <!-- 3. 传奇附魔神兵重铸 -->
          <div data-goto="smithy_reforge" class="btn-goto-subview mota-building-card p-2.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-purple-500/80 bg-purple-950/20 hover:border-purple-400 transition-all">
            <div>
              <div class="flex items-center gap-2 pb-2 border-b border-[#4a3520]">
                <div class="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center p-1 flex-shrink-0">
                  ${getVectorIcon('crystal_darkgold', 'w-full h-full')}
                </div>
                <div class="min-w-0">
                  <h3 class="text-xs font-black text-purple-200 truncate">神兵重铸专室</h3>
                  <div class="text-[9px] text-purple-400/80">传奇词条洗炼重铸</div>
                </div>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[9px] text-slate-400 flex items-center justify-between">
                <span>特色:</span>
                <span class="text-purple-300 font-mono">暴伤吸血 · 伤害减免</span>
              </div>
            </div>
            <div class="pt-2 border-t border-purple-900/40">
              <button class="w-full mota-btn-dark py-1 rounded-lg text-xs font-bold text-purple-200 border border-purple-600/70 shadow flex items-center justify-center gap-1">
                <span>进入重铸 -></span>
              </button>
            </div>
          </div>

          <!-- 4. 全身修缮专室 -->
          <div data-goto="smithy_repair" class="btn-goto-subview mota-building-card p-2.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-blue-600/60 bg-blue-950/20 hover:border-blue-400 transition-all">
            <div>
              <div class="flex items-center gap-2 pb-2 border-b border-[#4a3520]">
                <div class="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400 flex items-center justify-center p-1 flex-shrink-0">
                  ${getVectorIcon('shield', 'w-full h-full')}
                </div>
                <div class="min-w-0">
                  <h3 class="text-xs font-black text-blue-200 truncate">全身耐久修缮室</h3>
                  <div class="text-[9px] text-blue-400/80">防具兵刃磨损修护</div>
                </div>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[9px] text-slate-400 flex items-center justify-between">
                <span>特色:</span>
                <span class="text-blue-300 font-mono">十部位一键修缮恢复</span>
              </div>
            </div>
            <div class="pt-2 border-t border-blue-900/40">
              <button class="w-full mota-btn-dark py-1 rounded-lg text-xs font-bold text-blue-200 border border-blue-700/60 shadow flex items-center justify-center gap-1">
                <span>进入修缮 -></span>
              </button>
            </div>
          </div>

          <!-- 5. 神兵分解熔炉 -->
          <div data-goto="smithy_smelt" class="btn-goto-subview mota-building-card p-2.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-red-600/60 bg-red-950/20 hover:border-red-400 transition-all">
            <div>
              <div class="flex items-center gap-2 pb-2 border-b border-[#4a3520]">
                <div class="w-8 h-8 rounded-xl bg-red-500/20 border border-red-400 flex items-center justify-center p-1 flex-shrink-0">
                  ${getVectorIcon('bld_smithy', 'w-full h-full')}
                </div>
                <div class="min-w-0">
                  <h3 class="text-xs font-black text-rose-200 truncate">神兵分解熔炉</h3>
                  <div class="text-[9px] text-rose-400/80">装备熔解回收晶石</div>
                </div>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[9px] text-slate-400 flex items-center justify-between">
                <span>特色:</span>
                <span class="text-rose-300 font-mono">回收淘汰装备萃取晶石</span>
              </div>
            </div>
            <div class="pt-2 border-t border-red-900/40">
              <button class="w-full mota-btn-dark py-1 rounded-lg text-xs font-bold text-red-200 border border-red-700/60 shadow flex items-center justify-center gap-1">
                <span>进入熔炉 -></span>
              </button>
            </div>
          </div>

          <!-- 6. 远古神铸 · 符文之语工坊 -->
          <div data-goto="smithy_runes" class="btn-goto-subview mota-building-card p-2.5 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-cyan-500/80 bg-cyan-950/20 hover:border-cyan-400 transition-all">
            <div>
              <div class="flex items-center gap-2 pb-2 border-b border-[#4a3520]">
                <div class="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center p-1 flex-shrink-0">
                  ${getVectorIcon('rune_stone', 'w-full h-full')}
                </div>
                <div class="min-w-0">
                  <h3 class="text-xs font-black text-cyan-200 truncate">神铸 · 符文之语</h3>
                  <div class="text-[9px] text-cyan-400/80">远古符文石铭刻共鸣</div>
                </div>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[9px] text-slate-400 flex items-center justify-between">
                <span>特色:</span>
                <span class="text-cyan-300 font-mono">7大远古配方 · 破甲真伤</span>
              </div>
            </div>
            <div class="pt-2 border-t border-cyan-900/40">
              <button class="w-full mota-btn-gold py-1 rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1">
                <span>进入神铸 -></span>
              </button>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 3. 【升星精铸专室】(Smithy Enhance Sub-page)
  // ==========================================
  renderSmithyEnhance() {
    const data = gameState.data;
    const item = data.equipped[this.selectedEquipSlot];
    const curStars = item ? (item.stars || 0) : 0;
    const rates = [95, 85, 75, 60, 50, 40, 30, 20];
    const successRate = rates[curStars] || 25;
    const costCrystal = Math.max(1, curStars + 1);

    const starItem = data.bag.find(i => i.id === 'star_crystal');
    const starCount = starItem ? (starItem.count || 0) : 0;
    const protItem = data.bag.find(i => i.id === 'protect_crystal');
    const protCount = protItem ? (protItem.count || 0) : 0;

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer hover:underline" data-goto="smithy">皇家铁匠铺</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">装备升星精铸专室</span>
          </div>
          <button data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回铁匠铺</span>
          </button>
        </div>

        <!-- 主体：左侧选装备 (5列) + 右侧大铁砧升星特写 (7列) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
          
          <!-- 左侧：10大装备部位选择列表 (2列 x 5行网格，彻底避免纵向滚条与底部截断) -->
          <div class="md:col-span-5 mota-parchment-panel p-3 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
            <div class="text-xs font-bold text-amber-300 pb-1.5 border-b border-[#4a3520] flex items-center justify-between flex-shrink-0">
              <span>选择要升星的装备部位</span>
              <span class="text-[10px] text-slate-400">10部位即时点选</span>
            </div>

            <div class="grid grid-cols-2 gap-1.5 my-2 flex-1 content-center">
              ${ITEM_SLOTS.map(slot => {
                const slotKey = slot.id;
                const eq = data.equipped[slotKey];
                const isSelected = this.selectedEquipSlot === slotKey;
                return `
                  <div data-smithy-slot="${slotKey}" class="btn-select-smithy-slot p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-amber-950/70 border-amber-400 ring-1 ring-amber-400/50 shadow' : 'bg-black/50 border-slate-800 hover:border-slate-600'}">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center p-0.5">${renderGameIcon(eq || slot.id, { size: 'w-full h-full' })}</div>
                      <div class="truncate min-w-0">
                        <div class="text-[11px] font-bold truncate ${eq ? 'text-amber-200' : 'text-slate-500'}">
                          ${eq ? eq.name : '未穿戴'}
                        </div>
                        <div class="text-[9px] text-slate-400 font-mono">${slot.name}</div>
                      </div>
                    </div>
                    ${eq ? `
                      <span class="text-[9px] px-1 py-0.2 rounded font-black font-mono ${(eq.stars || 0) > 0 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}">
                        +${eq.stars || 0}星
                      </span>
                    ` : `
                      <span class="text-[9px] px-1 py-0.2 rounded font-mono bg-black/40 text-slate-500">
                        空
                      </span>
                    `}
                  </div>
                `;
              }).join('')}
            </div>

            <div class="text-[10px] text-slate-400 text-center pt-1 border-t border-[#4a3520] flex-shrink-0">
              最高可精铸至 8 星极境 · 消耗升星水晶
            </div>
          </div>

          <!-- 右侧：宏伟地火升星铁砧特写 (7列) -->
          <div class="md:col-span-7 mota-parchment-panel p-4 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
            ${item ? `
              <div>
                <div class="flex items-center justify-between pb-3 border-b border-[#4a3520]">
                  <div class="flex items-center gap-3">
                    <div class="w-14 h-14 rounded-2xl bg-black/70 border-2 border-amber-400 flex items-center justify-center p-2 shadow-[0_0_15px_rgba(245,192,66,0.5)]">
                      ${renderGameIcon(item, { size: 'w-full h-full' })}
                    </div>
                    <div>
                      <h3 class="text-base font-black text-amber-200">${item.name}</h3>
                      <div class="text-xs text-slate-400 font-mono mt-0.5">
                        当前星阶: <b class="text-amber-400">+${curStars} 星</b> / 最高 8 星
                      </div>
                    </div>
                  </div>

                  <div class="text-right font-mono">
                    <div class="text-xs text-slate-400">精铸成功率</div>
                    <div class="text-lg font-black ${successRate >= 60 ? 'text-emerald-400' : 'text-amber-400'}">${successRate}%</div>
                  </div>
                </div>

                <!-- 铁砧视觉特写与星级对比 -->
                <div class="my-4 p-4 rounded-xl bg-black/50 border border-[#4a3520] space-y-3">
                  <div class="flex items-center justify-around text-center py-2">
                    <div>
                      <div class="text-xs text-slate-400 font-mono mb-1">当前星阶</div>
                      <div class="text-2xl font-black text-amber-300 font-mono">+${curStars} 星</div>
                    </div>
                    <div class="text-2xl text-amber-500 animate-pulse font-black">-></div>
                    <div>
                      <div class="text-xs text-slate-400 font-mono mb-1">升星后达至</div>
                      <div class="text-2xl font-black text-emerald-400 font-mono">+${Math.min(8, curStars + 1)} 星</div>
                    </div>
                  </div>

                  <!-- 消耗与保护水晶勾选 -->
                  <div class="pt-3 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs">
                    <div class="p-2.5 rounded-lg bg-black/60 border border-slate-800 flex items-center justify-between">
                      <span class="text-slate-300">消耗升星水晶:</span>
                      <span class="font-mono font-bold ${starCount >= costCrystal ? 'text-emerald-400' : 'text-red-400'}">
                        ${costCrystal} 颗 (持有: ${starCount})
                      </span>
                    </div>

                    <label class="p-2.5 rounded-lg bg-black/60 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all">
                      <span class="flex items-center gap-2 text-slate-200">
                        <input type="checkbox" id="chk-use-protect" class="accent-amber-500 w-4 h-4 cursor-pointer">
                        <span>使用保护水晶 (防降星)</span>
                      </span>
                      <span class="text-[11px] font-mono text-cyan-400">余 ${protCount} 颗</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- 升星操作按键 -->
              <div class="pt-3 border-t border-[#4a3520]">
                <button id="btn-do-enhance" class="w-full mota-btn-gold py-3 rounded-xl text-sm font-black shadow-xl border-2 border-amber-300 flex items-center justify-center gap-2">
                  <span>立即执行升星精铸</span>
                </button>
              </div>
            ` : `
              <div class="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic">
                该部位未穿戴任何装备，请先在左侧选择有装备的槽位！
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 4. 【全身耐久修缮室】(Smithy Repair Sub-page)
  // ==========================================
  renderSmithyRepair() {
    const data = gameState.data;
    const equipped = data.equipped || {};

    let totalRepairCost = 0;
    let needRepairCount = 0;
    Object.values(equipped).forEach(item => {
      if (item) {
        const loss = (item.maxDurability || 100) - (item.durability || 100);
        if (loss > 0) {
          totalRepairCost += loss * 2;
          needRepairCount++;
        }
      }
    });

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer hover:underline" data-goto="smithy">皇家铁匠铺</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">全身耐久修缮室</span>
          </div>
          <button data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回铁匠铺</span>
          </button>
        </div>

        <!-- 主体：全身装备耐久明细与一键修复 -->
        <div class="flex-1 min-h-0 mota-parchment-panel p-4 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-[#4a3520]">
              <div>
                <h3 class="text-sm font-black text-amber-300">全身 10 部位装备耐久状态一览</h3>
                <p class="text-[11px] text-slate-400">战斗中装备将缓慢磨损，及时修理保障 100% 战斗威力！</p>
              </div>
              <div class="text-right font-mono text-xs">
                待修复部件: <b class="text-amber-400">${needRepairCount}</b> 件 · 
                总修缮耗费: <b class="text-amber-300">${totalRepairCost}</b> 金币
              </div>
            </div>

            <!-- 10 部位耐久条矩阵网格 -->
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 my-4">
              ${ITEM_SLOTS.map(slot => {
                const slotKey = slot.id;
                const eq = equipped[slotKey];
                const curDur = eq ? (eq.durability || 100) : 100;
                const maxDur = eq ? (eq.maxDurability || 100) : 100;
                const pct = Math.min(100, Math.floor((curDur / maxDur) * 100));

                return `
                  <div class="p-3 rounded-xl bg-black/50 border border-slate-800 space-y-2">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-bold truncate ${eq ? 'text-amber-200' : 'text-slate-500'}">${eq ? eq.name : '未装备'}</span>
                      <span class="text-[10px] text-slate-400 font-mono">${slot.name}</span>
                    </div>

                    <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div class="h-full ${pct >= 70 ? 'bg-emerald-400' : pct >= 30 ? 'bg-amber-400' : 'bg-red-500'}" style="width: ${pct}%"></div>
                    </div>

                    <div class="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>耐久度:</span>
                      <span class="${pct < 100 ? 'text-amber-300' : 'text-slate-300'}">${curDur}/${maxDur}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 修复操作按键 -->
          <div class="pt-3 border-t border-[#4a3520] flex items-center justify-end gap-3">
            <div class="text-xs text-slate-300 font-mono">
              持有金币: <b class="text-amber-400">${data.gold.toLocaleString()}</b>
            </div>
            <button id="btn-repair-all" class="mota-btn-gold px-6 py-2.5 rounded-xl text-xs font-bold shadow-md border-amber-300 ${needRepairCount > 0 ? '' : 'opacity-50'}">
              全身装备一键修缮 (恢复100%耐久)
            </button>
          </div>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 5. 【装备分解熔炉】(Smithy Smelt Sub-page)
  // ==========================================
  renderSmithySmelt() {
    const data = gameState.data;
    const item = data.equipped[this.selectedEquipSlot];

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer hover:underline" data-goto="smithy">皇家铁匠铺</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">神兵分解熔炉</span>
          </div>
          <button data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回铁匠铺</span>
          </button>
        </div>

        <!-- 主体 -->
        <div class="flex-1 min-h-0 mota-parchment-panel p-5 rounded-xl flex flex-col justify-between border-2 border-red-900/60 bg-red-950/10">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-[#4a3520]">
              <div>
                <h3 class="text-sm font-black text-amber-300">神兵分解熔炉 · 晶石萃取</h3>
                <p class="text-[11px] text-slate-400">分解身上不需要的装备，提炼为珍贵的黄金晶石！</p>
              </div>
            </div>

            <!-- 当前选中装备详情 -->
            <div class="my-6 max-w-md mx-auto p-5 rounded-2xl bg-black/60 border border-red-800/50 text-center space-y-3">
              ${item ? `
                <div class="w-16 h-16 rounded-2xl bg-red-950/40 border-2 border-red-500 mx-auto flex items-center justify-center p-2.5 shadow-inner">
                  ${renderGameIcon(item, { size: 'w-full h-full' })}
                </div>
                <h4 class="text-base font-black text-amber-200">${item.name}</h4>
                <div class="text-xs text-slate-400 font-mono">部位: ${SLOT_MAP[item.slot]?.name || item.slot}</div>
                <div class="p-3 bg-black/60 rounded-xl border border-slate-800 text-xs text-amber-300 font-mono">
                  分解预计产出：<b class="text-amber-400 text-sm">黄金晶石 x 3</b>
                </div>
              ` : `
                <div class="py-8 text-slate-500 text-xs italic">
                  当前槽位未穿戴装备，请返回身上穿戴后再行分解！
                </div>
              `}
            </div>
          </div>

          <div class="pt-3 border-t border-[#4a3520] text-center">
            ${item ? `
              <button id="btn-disassemble-gear" class="mota-btn-dark px-8 py-3 rounded-xl text-xs font-bold text-red-300 hover:border-red-500 shadow">
                确认分解此装备
              </button>
            ` : ''}
          </div>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 5. 【宝石工坊 · 打孔与镶嵌】(Smithy Socket Sub-page)
  // ==========================================
  renderSmithySocket() {
    const item = gameState.data.equipped[this.selectedEquipSlot];
    const curSockets = item ? (item.sockets || 0) : 0;
    const maxSockets = 4;
    const drillItems = gameState.data.bag.filter(i => i.id === 'diamond_1' || i.id === 'socket_crystal');
    const drillCount = drillItems.reduce((acc, i) => acc + (i.count || 1), 0);
    const nextDrillCost = (curSockets + 1) * 1000;

    // 行囊中的宝石
    const bagGems = gameState.data.bag.filter(i => i && (i.type === 'gem' || (i.stat && !i.slot)));

    const statNameMap = {
      atk: '物理/魔法攻击',
      def: '双抗防御值',
      maxHp: '生命上限',
      speed: '先手速度'
    };

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold">皇家铁匠铺</span>
            <span class="text-slate-500">-></span>
            <span class="text-emerald-300 font-bold">宝石打孔与镶嵌工坊</span>
          </div>
          <button data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回铁匠铺大厅</span>
          </button>
        </div>

        <!-- 主体区域：左右双面板架构 -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2.5">
          
          <!-- 左侧：部位选择与当前装备信息 (md:col-span-5) -->
          <div class="md:col-span-5 flex flex-col justify-between bg-black/40 border border-[#4a3520] rounded-xl p-2.5 shadow">
            <div>
              <div class="text-[11px] font-bold text-amber-200 mb-1.5 flex items-center justify-between">
                <span>选择精铸装备部位:</span>
                <span class="text-slate-400 font-normal text-[10px]">支持全身 10 部位</span>
              </div>
              
              <!-- 10槽位网格 -->
              <div class="grid grid-cols-5 gap-1 mb-2.5">
                ${ITEM_SLOTS.map(slot => {
                  const eq = gameState.data.equipped[slot.id];
                  const isSel = this.selectedEquipSlot === slot.id;
                  return `
                    <button data-socket-slot="${slot.id}" class="btn-select-socket-slot p-1 rounded-lg border text-center transition-all ${
                      isSel 
                        ? 'border-amber-400 bg-amber-950/60 shadow text-amber-200 font-bold' 
                        : 'border-slate-800 bg-black/40 hover:border-slate-600 text-slate-400'
                    }">
                      <div class="text-[10px] truncate">${slot.name}</div>
                      <div class="text-[9px] font-mono ${eq ? 'text-emerald-400 font-bold' : 'text-slate-600'}">
                        ${eq ? `${eq.sockets || 0}孔` : '空'}
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>

              <!-- 选中的装备简要卡片 -->
              ${item ? `
                <div class="p-2.5 rounded-xl bg-black/50 border border-amber-900/60 flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-950/30 border border-amber-500/70 p-1 flex items-center justify-center flex-shrink-0">
                    ${renderGameIcon(item, { size: 'w-full h-full' })}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-black text-amber-200 truncate">${item.name}</span>
                      ${item.stars ? `<span class="text-[10px] text-amber-300 font-mono font-bold">+${item.stars}星</span>` : ''}
                    </div>
                    <div class="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>需求: Lv.${item.reqLevel || 1}</span>
                      <span class="text-emerald-400 font-bold">已开孔: ${curSockets} / ${maxSockets}</span>
                    </div>
                    <div class="text-[10px] text-slate-400 mt-0.5">
                      已镶嵌宝石: <span class="text-amber-300 font-mono">${(item.gems || []).filter(Boolean).length}</span> 颗
                    </div>
                  </div>
                </div>
              ` : `
                <div class="p-4 rounded-xl bg-black/30 border border-slate-800 text-center text-xs text-slate-500">
                  当前槽位未穿戴装备
                </div>
              `}
            </div>

            <!-- 打孔操作区 -->
            <div class="pt-2 border-t border-[#4a3520]">
              <div class="flex items-center justify-between text-[11px] mb-1.5">
                <span class="text-slate-400">开孔水晶储备:</span>
                <span class="text-amber-300 font-mono font-bold">${drillCount} 颗</span>
              </div>
              ${item ? `
                ${curSockets < maxSockets ? `
                  <button id="btn-punch-socket" class="w-full mota-btn-gold py-2 rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1">
                    <span>开凿第 ${curSockets + 1} 孔 (耗 1 水晶 + ${nextDrillCost.toLocaleString()} 金币)</span>
                  </button>
                ` : `
                  <div class="w-full py-2 rounded-xl bg-slate-900 border border-slate-700 text-center text-xs text-slate-500 font-bold">
                    该装备已达 4 孔上限
                  </div>
                `}
              ` : `
                <button disabled class="w-full mota-btn-dark py-2 rounded-xl text-xs text-slate-600 opacity-60">
                  请先选择装备
                </button>
              `}
            </div>
          </div>

          <!-- 右侧：宝石孔详情与行囊宝石库 (md:col-span-7) -->
          <div class="md:col-span-7 flex flex-col justify-between bg-black/40 border border-[#4a3520] rounded-xl p-2.5 shadow">
            
            <!-- 上半部：4大孔位状态 -->
            <div class="mb-2">
              <div class="text-[11px] font-bold text-amber-200 mb-2 flex items-center justify-between">
                <span>装备孔位镶嵌状况:</span>
                <span class="text-slate-400 text-[10px]">镶嵌手工费: 500 金币 · 摘除完全免费无损</span>
              </div>

              ${item ? `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  ${[0, 1, 2, 3].map(idx => {
                    const isOpen = idx < curSockets;
                    const gem = (item.gems && item.gems[idx]) || null;
                    if (!isOpen) {
                      return `
                        <div class="p-2 rounded-xl border border-dashed border-slate-800 bg-black/20 flex items-center justify-between">
                          <div class="flex items-center gap-2 text-slate-600">
                            <div class="w-7 h-7 rounded-lg border border-dashed border-slate-800 flex items-center justify-center text-[10px]">
                              ${idx + 1}
                            </div>
                            <span class="text-xs">未开孔洞</span>
                          </div>
                          <span class="text-[10px] text-slate-600">需打孔</span>
                        </div>
                      `;
                    }
                    if (gem) {
                      return `
                        <div class="p-2 rounded-xl border border-amber-600/70 bg-amber-950/20 flex items-center justify-between shadow">
                          <div class="flex items-center gap-2 min-w-0">
                            <div class="w-7 h-7 rounded-lg bg-black/60 border border-amber-500/70 p-0.5 flex items-center justify-center flex-shrink-0">
                              ${renderGameIcon(gem, { size: 'w-full h-full' })}
                            </div>
                            <div class="min-w-0">
                              <div class="text-xs font-bold text-amber-200 truncate">${gem.name}</div>
                              <div class="text-[10px] text-emerald-400 font-mono">+${gem.val} ${statNameMap[gem.stat] || gem.stat}</div>
                            </div>
                          </div>
                          <button data-slot="${this.selectedEquipSlot}" data-socket-idx="${idx}" class="btn-remove-gem px-2 py-1 rounded-lg mota-btn-dark border border-red-700/60 text-rose-300 hover:border-red-500 text-[10px] font-bold flex-shrink-0">
                            无损摘除
                          </button>
                        </div>
                      `;
                    }
                    return `
                      <div class="p-2 rounded-xl border border-emerald-600/50 bg-emerald-950/10 flex items-center justify-between">
                        <div class="flex items-center gap-2 min-w-0">
                          <div class="w-7 h-7 rounded-lg border border-emerald-500/50 flex items-center justify-center text-[10px] text-emerald-400 font-mono">
                            ${idx + 1}
                          </div>
                          <div>
                            <div class="text-xs font-bold text-emerald-300">孔洞已就绪</div>
                            <div class="text-[10px] text-slate-400">可镶嵌任意宝石</div>
                          </div>
                        </div>
                        <button data-slot="${this.selectedEquipSlot}" data-socket-idx="${idx}" class="btn-inlay-gem px-2.5 py-1 rounded-lg text-[10px] font-bold shadow ${
                          this.selectedGemUid ? 'mota-btn-gold text-amber-100' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }">
                          ${this.selectedGemUid ? '镶入选定宝石' : '选宝石后镶嵌'}
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div class="p-6 rounded-xl bg-black/30 border border-slate-800 text-center text-xs text-slate-500">
                  请先在左侧选择一件已佩戴的装备
                </div>
              `}
            </div>

            <!-- 下半部：行囊可用宝石库 -->
            <div class="pt-2 border-t border-[#4a3520]">
              <div class="flex items-center justify-between text-[11px] font-bold text-amber-200 mb-1.5">
                <span>行囊可用宝石库 (${bagGems.length} 种):</span>
                <span class="text-slate-400 text-[10px]">点击选择宝石，再点击上方空孔完成镶嵌</span>
              </div>

              ${bagGems.length > 0 ? `
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto mota-custom-scroll pr-1">
                  ${bagGems.map(g => {
                    const isSel = this.selectedGemUid === (g.uid || g.id);
                    return `
                      <button data-gem-uid="${g.uid || g.id}" class="btn-select-bag-gem p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all ${
                        isSel 
                          ? 'border-amber-400 bg-amber-950/70 shadow ring-1 ring-amber-400' 
                          : 'border-slate-800 bg-black/40 hover:border-slate-600'
                      }">
                        <div class="w-6 h-6 rounded bg-black/60 border border-slate-700 p-0.5 flex items-center justify-center flex-shrink-0">
                          ${renderGameIcon(g, { size: 'w-full h-full' })}
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="text-[10px] font-bold text-amber-200 truncate">${g.name}</div>
                          <div class="text-[9px] text-emerald-400 font-mono truncate">+${g.val} ${statNameMap[g.stat] || ''}</div>
                        </div>
                        <span class="text-[9px] text-amber-300 font-mono font-bold">x${g.count || 1}</span>
                      </button>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div class="p-3 rounded-lg bg-black/40 border border-slate-800 text-center flex items-center justify-between">
                  <span class="text-xs text-slate-400">行囊中暂无宝石！可在王国角斗场商行兑换</span>
                  <button data-goto="palace_arena" class="btn-goto-subview mota-btn-gold px-3 py-1 rounded-lg text-xs font-bold shadow">
                    前往声望商行 ->
                  </button>
                </div>
              `}
            </div>

          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 6. 【传奇词条 · 神兵重铸】(Smithy Reforge Sub-page)
  // ==========================================
  renderSmithyReforge() {
    const data = gameState.data;
    const item = data.equipped[this.selectedEquipSlot];
    const goldCrystal = data.bag.find(i => i.id === 'crystal_gold');
    const goldCrystalCount = goldCrystal ? (goldCrystal.count || 0) : 0;
    const darkgoldCrystal = data.bag.find(i => i.id === 'crystal_darkgold');
    const darkgoldCrystalCount = darkgoldCrystal ? (darkgoldCrystal.count || 0) : 0;
    const hasAnyCrystal = (goldCrystalCount + darkgoldCrystalCount) > 0;
    const goldCost = 2000;
    const hasEnoughGold = data.gold >= goldCost;

    if (!this.selectedReforgeCrystal) {
      this.selectedReforgeCrystal = darkgoldCrystalCount > 0 ? 'crystal_darkgold' : 'crystal_gold';
    }

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer hover:underline" data-goto="smithy">皇家铁匠铺</span>
            <span class="text-slate-500">-></span>
            <span class="text-purple-300 font-bold">传奇附魔 · 神兵重铸专室</span>
          </div>
          <button data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回铁匠铺大厅</span>
          </button>
        </div>

        <!-- 主体区域：左右双面板架构 -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2.5">
          
          <!-- 左侧：部位选择与当前装备信息 (md:col-span-5) -->
          <div class="md:col-span-5 flex flex-col justify-between bg-black/40 border border-[#4a3520] rounded-xl p-2.5 shadow">
            <div>
              <div class="text-[11px] font-bold text-amber-200 mb-1.5 flex items-center justify-between">
                <span>选择重铸装备部位:</span>
                <span class="text-slate-400 font-normal text-[10px]">全身 10 部位</span>
              </div>
              
              <!-- 10槽位网格 -->
              <div class="grid grid-cols-5 gap-1 mb-2.5">
                ${ITEM_SLOTS.map(slot => {
                  const eq = data.equipped[slot.id];
                  const isSel = this.selectedEquipSlot === slot.id;
                  const hasReforge = eq && eq.reforge;
                  return `
                    <button data-reforge-slot="${slot.id}" class="btn-select-reforge-slot p-1 rounded-lg border text-center transition-all ${
                      isSel 
                        ? 'border-purple-400 bg-purple-950/60 shadow text-purple-200 font-bold' 
                        : 'border-slate-800 bg-black/40 hover:border-slate-600 text-slate-400'
                    }">
                      <div class="text-[10px] truncate">${slot.name}</div>
                      <div class="text-[9px] font-mono truncate ${hasReforge ? 'text-amber-300 font-bold' : eq ? 'text-slate-400' : 'text-slate-600'}">
                        ${hasReforge ? eq.reforge.name.slice(0, 2) : (eq ? '已佩戴' : '空')}
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>

              <!-- 选中的装备卡片与当前词条 -->
              ${item ? `
                <div class="p-2.5 rounded-xl bg-black/50 border border-purple-900/60 space-y-2">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-purple-950/30 border border-purple-500/70 p-1 flex items-center justify-center flex-shrink-0">
                      ${renderGameIcon(item, { size: 'w-full h-full' })}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-amber-200 truncate">${item.name}</span>
                        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          +${item.stars || 0}星
                        </span>
                      </div>
                      <div class="text-[10px] text-slate-400 mt-0.5">
                        需求等级: Lv.${item.reqLevel || 1} · ${item.quality ? item.quality.toUpperCase() : '装备'}
                      </div>
                    </div>
                  </div>

                  <!-- 当前传奇词条展示槽 -->
                  <div class="p-2 rounded-lg ${item.reforge ? 'bg-gradient-to-r from-purple-950/40 to-black/60 border border-purple-500/60' : 'bg-black/40 border border-slate-800'}">
                    <div class="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>当前传奇附魔属性</span>
                      ${item.reforge ? `<span class="text-purple-300 font-mono text-[9px]">${item.reforge.crystalUsed || '晶石洗炼'}</span>` : ''}
                    </div>
                    ${item.reforge ? `
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-black text-amber-300">${item.reforge.name}</span>
                        <span class="text-xs font-bold font-mono text-emerald-300">+${item.reforge.val}${item.reforge.unit}</span>
                      </div>
                    ` : `
                      <div class="text-xs text-slate-500 py-0.5">
                        暂无传奇词条 (点击右侧锻炉开始洗炼)
                      </div>
                    `}
                  </div>
                </div>
              ` : `
                <div class="p-6 rounded-xl bg-black/30 border border-slate-800 text-center text-xs text-slate-500">
                  当前槽位未佩戴装备，请先在上方切换已佩戴槽位
                </div>
              `}
            </div>

            <div class="mt-2 p-2 rounded-lg bg-black/50 border border-[#4a3520] text-[10px] text-slate-400 space-y-1">
              <div class="flex items-center justify-between">
                <span>行囊黄金晶石:</span>
                <span class="text-amber-300 font-mono font-bold">${goldCrystalCount} 颗</span>
              </div>
              <div class="flex items-center justify-between">
                <span>行囊暗金晶石:</span>
                <span class="text-purple-300 font-mono font-bold">${darkgoldCrystalCount} 颗</span>
              </div>
            </div>
          </div>

          <!-- 右侧：传奇词条符文锻炉与词条预览 (md:col-span-7) -->
          <div class="md:col-span-7 flex flex-col justify-between bg-black/40 border border-[#4a3520] rounded-xl p-2.5 shadow">
            
            <!-- 上半部：传奇词条库图鉴 -->
            <div>
              <div class="text-[11px] font-bold text-amber-200 mb-1.5 flex items-center justify-between">
                <span>传奇词条库 (洗炼必出以下其一):</span>
                <span class="text-purple-400 text-[10px]">暗金晶石必出高位极值</span>
              </div>

              <!-- 5大词条预览卡片 -->
              <div class="space-y-1.5 mb-2">
                ${REFORGE_AFFIXES.map(affix => {
                  const isCurrent = item && item.reforge && item.reforge.id === affix.id;
                  return `
                    <div class="p-1.5 rounded-lg border flex items-center justify-between transition-all ${
                      isCurrent 
                        ? 'bg-amber-950/40 border-amber-500/80 shadow' 
                        : 'bg-black/30 border-slate-800/80'
                    }">
                      <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}"></span>
                        <span class="text-xs font-bold ${isCurrent ? 'text-amber-300' : 'text-slate-200'}">${affix.name}</span>
                        <span class="text-[10px] text-slate-400">${affix.desc}</span>
                      </div>
                      <span class="text-xs font-mono font-bold ${isCurrent ? 'text-emerald-300' : 'text-amber-400/90'}">
                        +${affix.min} ~ +${affix.max}${affix.unit}
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- 下半部：晶石选择与洗炼控制台 -->
            <div class="pt-2 border-t border-[#4a3520] space-y-2">
              <div class="text-[11px] font-bold text-amber-200 flex items-center justify-between">
                <span>洗炼消耗与晶石选择:</span>
                <span class="text-slate-400 text-[10px]">单次消耗 1 颗晶石 + 2000 金币</span>
              </div>

              <!-- 晶石选择器 -->
              <div class="grid grid-cols-2 gap-2">
                <button data-use-crystal="crystal_darkgold" class="btn-select-reforge-crystal p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                  this.selectedReforgeCrystal === 'crystal_darkgold'
                    ? 'border-purple-400 bg-purple-950/60 text-purple-200 shadow ring-1 ring-purple-400/40'
                    : 'border-slate-800 bg-black/40 text-slate-400 hover:border-slate-600'
                }">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/50 p-1 flex-shrink-0 flex items-center justify-center">
                      ${renderGameIcon('crystal_darkgold', { size: 'w-full h-full' })}
                    </div>
                    <div>
                      <div class="text-xs font-bold">暗金晶石</div>
                      <div class="text-[9px] text-purple-400">保底 50%~100% 极值</div>
                    </div>
                  </div>
                  <span class="text-xs font-mono font-bold ${darkgoldCrystalCount > 0 ? 'text-amber-300' : 'text-slate-600'}">${darkgoldCrystalCount} 颗</span>
                </button>

                <button data-use-crystal="crystal_gold" class="btn-select-reforge-crystal p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                  this.selectedReforgeCrystal === 'crystal_gold'
                    ? 'border-amber-400 bg-amber-950/60 text-amber-200 shadow ring-1 ring-amber-400/40'
                    : 'border-slate-800 bg-black/40 text-slate-400 hover:border-slate-600'
                }">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/50 p-1 flex-shrink-0 flex items-center justify-center">
                      ${renderGameIcon('crystal_gold', { size: 'w-full h-full' })}
                    </div>
                    <div>
                      <div class="text-xs font-bold">黄金晶石</div>
                      <div class="text-[9px] text-amber-400">标准全区间波动</div>
                    </div>
                  </div>
                  <span class="text-xs font-mono font-bold ${goldCrystalCount > 0 ? 'text-amber-300' : 'text-slate-600'}">${goldCrystalCount} 颗</span>
                </button>
              </div>

              <!-- 费用与洗炼大按钮 -->
              <div class="flex items-center gap-2">
                <div class="px-3 py-2 rounded-xl bg-black/50 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2 flex-shrink-0">
                  <span>洗炼金币:</span>
                  <span class="font-mono font-bold ${hasEnoughGold ? 'text-amber-300' : 'text-red-400'}">2000</span>
                </div>
                <button id="btn-do-reforge" class="flex-1 mota-btn-gold py-2 rounded-xl text-xs font-black shadow flex items-center justify-center gap-1.5 ${
                  item && hasAnyCrystal && hasEnoughGold ? '' : 'opacity-50 cursor-not-allowed'
                }">
                  <span>激活 · 重铸传奇词条</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 6. 【圣王宫殿主厅】(Palace Hub)
  // ==========================================
  renderPalaceHub() {
    const canClaim = gameState.canClaimSalary();

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">圣王大殿主厅</span>
          </div>
          <button data-goto="hub" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王都大街</span>
          </button>
        </div>

        <!-- 圣王大殿三大功能入口 (紧凑舒展，绝不遮挡底部按键) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-2.5">
          
          <!-- 1. 每日俸禄大厅 -->
          <div data-goto="palace_salary" class="btn-goto-subview mota-building-card p-3 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-400/80 bg-amber-950/30 hover:border-amber-300 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center p-1.5 flex-shrink-0">
                    ${getVectorIcon('coin_gold', 'w-full h-full')}
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-xs font-black text-amber-200 truncate">早朝 · 每日俸禄</h3>
                    <div class="text-[10px] text-amber-400/80">王室财政津贴领受</div>
                  </div>
                </div>
                <span class="mota-badge-gold px-2 py-0.5 rounded text-[10px] font-bold">${canClaim ? '可领赏' : '已领受'}</span>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>赏赐:</span>
                <span class="text-amber-300 font-mono">+1,500 金币 · +20 魔晶</span>
              </div>
            </div>

            <div class="pt-2 border-t border-amber-900/40">
              <button class="w-full mota-btn-gold py-1.5 rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1">
                <span>觐见领俸禄 -></span>
              </button>
            </div>
          </div>

          <!-- 2. 王国角斗场 -->
          <div data-goto="palace_arena" class="btn-goto-subview mota-building-card p-3 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-rose-500/80 bg-rose-950/20 hover:border-rose-400 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center p-1.5 flex-shrink-0">
                    ${getVectorIcon('sword', 'w-full h-full')}
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-xs font-black text-rose-200 truncate">王国角斗场 · 天梯</h3>
                    <div class="text-[10px] text-rose-400/80">天梯排名对决与声望商行</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded bg-rose-900/60 border border-rose-500 text-rose-200 text-[10px] font-bold">${gameState.data.arena?.rankTitle || '青铜角斗士'}</span>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>特色:</span>
                <span class="text-rose-300 font-mono">天梯争雄 · 军需商行兑换</span>
              </div>
            </div>

            <div class="pt-2 border-t border-rose-900/40">
              <button class="w-full mota-btn-dark py-1.5 rounded-lg text-xs font-bold text-rose-200 border border-rose-600/60 shadow flex items-center justify-center gap-1">
                <span>步入角斗场 -></span>
              </button>
            </div>
          </div>

          <!-- 3. 幻境试炼封号长廊 -->
          <div data-goto="palace_trials" class="btn-goto-subview mota-building-card p-3 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-purple-500/80 bg-purple-950/20 hover:border-purple-400 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-xl bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center p-1.5 flex-shrink-0">
                    ${getVectorIcon('bld_palace', 'w-full h-full')}
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-xs font-black text-purple-200 truncate">职业七阶转职 · 试炼长廊</h3>
                    <div class="text-[10px] text-purple-400/80">七阶正统转职晋升与封号威压</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500 text-purple-200 text-[10px] font-bold">转职殿堂</span>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>当前阶位:</span>
                <span class="text-amber-300 font-bold truncate ml-1">${gameState.getPromotedClassName()}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-purple-900/40">
              <button class="w-full mota-btn-dark py-1.5 rounded-lg text-xs font-bold text-purple-200 border border-purple-600/60 shadow flex items-center justify-center gap-1">
                <span>步入转职殿堂 -></span>
              </button>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 8. 【王国角斗场 · 竞技天梯】(Palace Arena Sub-page)
  // ==========================================
  renderPalaceArena() {
    const arenaData = gameState.data.arena || { points: 1000, rankTitle: '青铜角斗士', challengesLeft: 5 };
    const curPrestige = gameState.data.prestige || 0;

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold">圣王大殿</span>
            <span class="text-slate-500">-></span>
            <span class="text-rose-300 font-bold">王国角斗场 (天梯争霸与声望商行)</span>
          </div>
          <button data-goto="palace" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王殿主厅</span>
          </button>
        </div>

        <!-- 顶部天梯状态仪表栏 -->
        <div class="px-3 py-2 rounded-xl bg-black/50 border border-amber-900/60 flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-4 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400">当前段位:</span>
              <span class="px-2 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-200 font-bold text-[11px]">${arenaData.rankTitle}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400">天梯积分:</span>
              <span class="text-amber-300 font-mono font-bold">${arenaData.points} 点</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400">今日挑战剩余:</span>
              <span class="text-emerald-400 font-mono font-bold">${arenaData.challengesLeft} / 5 次</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400">声望结余:</span>
              <span class="text-purple-300 font-mono font-bold">${curPrestige} 点</span>
            </div>
          </div>

          <!-- 模式切换按键 -->
          <div class="flex items-center gap-1.5">
            <button id="btn-arena-subtab-duel" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              this.arenaSubTab === 'duel' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'
            }">
              天梯角斗对决
            </button>
            <button id="btn-arena-subtab-shop" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              this.arenaSubTab === 'shop' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'
            }">
              声望军需商行
            </button>
          </div>
        </div>

        <!-- 内容区域：根据 subtab 切换 -->
        <div class="flex-1 min-h-0">
          ${this.arenaSubTab === 'duel' ? `
            <!-- 天梯对手列表 (4大挑战目标) -->
            <div class="h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              ${ARENA_OPPONENTS.map(opp => `
                <div class="p-3 rounded-xl bg-black/40 border border-[#4a3520] hover:border-amber-500/80 transition-all flex flex-col justify-between shadow">
                  <div>
                    <div class="flex items-center gap-2 pb-2 border-b border-[#4a3520]">
                      <div class="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-500/70 p-1 flex items-center justify-center flex-shrink-0">
                        ${getVectorIcon(opp.avatar || 'hero_warrior', 'w-full h-full')}
                      </div>
                      <div class="min-w-0 flex-1">
                        <h4 class="text-xs font-black text-rose-200 truncate">${opp.name}</h4>
                        <div class="text-[10px] text-amber-400/80 truncate">${opp.title}</div>
                      </div>
                    </div>

                    <div class="mt-2 space-y-1 text-[10px] bg-black/50 p-2 rounded-lg border border-slate-800">
                      <div class="flex justify-between">
                        <span class="text-slate-400">对手等级:</span>
                        <span class="text-slate-200 font-mono font-bold">Lv.${opp.level}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-400">天梯积分:</span>
                        <span class="text-amber-300 font-mono font-bold">${opp.points} 点</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-400">生命 / 攻击:</span>
                        <span class="text-rose-300 font-mono font-bold">${opp.hp} / ${opp.atk}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-400">双抗防御:</span>
                        <span class="text-blue-300 font-mono font-bold">${opp.def}</span>
                      </div>
                    </div>

                    <div class="mt-2 p-1.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[10px] text-amber-300 flex items-center justify-between">
                      <span>胜赏:</span>
                      <span class="font-mono">+${opp.prestigeReward} 声望 · +${opp.goldReward} 金币</span>
                    </div>
                  </div>

                  <div class="pt-2 border-t border-[#4a3520]">
                    <button data-opp-id="${opp.id}" class="btn-challenge-arena-opp w-full py-2 rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1 ${
                      arenaData.challengesLeft > 0 ? 'mota-btn-gold' : 'mota-btn-dark text-slate-500 opacity-60 cursor-not-allowed'
                    }">
                      <span>发起天梯对决 -></span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <!-- 声望军需商行 -->
            <div class="h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 overflow-y-auto mota-custom-scroll pr-1">
              ${PRESTIGE_SHOP_ITEMS.map(item => {
                const canAfford = curPrestige >= item.costPrestige;
                return `
                  <div class="p-3 rounded-xl bg-black/40 border border-[#4a3520] hover:border-amber-500/80 transition-all flex flex-col justify-between shadow">
                    <div>
                      <div class="flex items-center gap-2 pb-2 border-b border-[#4a3520]">
                        <div class="w-9 h-9 rounded-xl bg-black/60 border border-purple-500/70 p-1 flex items-center justify-center flex-shrink-0">
                          ${renderGameIcon(item.itemData, { size: 'w-full h-full' })}
                        </div>
                        <div class="min-w-0 flex-1">
                          <h4 class="text-xs font-black text-amber-200 truncate">${item.name}</h4>
                          <span class="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700">军需物资</span>
                        </div>
                      </div>

                      <div class="mt-2 text-[10px] text-slate-400 line-clamp-2 min-h-[30px]">
                        ${item.desc}
                      </div>

                      <div class="mt-2 p-1.5 rounded-lg bg-black/50 border border-slate-800 flex items-center justify-between text-[10px]">
                        <span class="text-slate-400">所需声望:</span>
                        <span class="font-mono font-bold ${canAfford ? 'text-purple-300' : 'text-red-400'}">${item.costPrestige} 点</span>
                      </div>
                    </div>

                    <div class="pt-2 border-t border-[#4a3520]">
                      <button data-shop-id="${item.id}" class="btn-buy-prestige-item w-full py-1.5 rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1 ${
                        canAfford ? 'mota-btn-gold' : 'mota-btn-dark text-slate-500 opacity-60 cursor-not-allowed'
                      }">
                        <span>${canAfford ? '立即兑换' : '声望不足'}</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </div>
    `;
  }

  // ==========================================
  // 7. 【每日俸禄大殿】(Palace Salary Sub-page)
  // ==========================================
  renderPalaceSalary() {
    const canClaim = gameState.canClaimSalary();

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer hover:underline" data-goto="palace">圣王大殿</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">圣王早朝 · 每日俸禄</span>
          </div>
          <button data-goto="palace" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王宫大厅</span>
          </button>
        </div>

        <!-- 主体：早朝圣殿特写 -->
        <div class="flex-1 min-h-0 mota-parchment-panel p-5 rounded-2xl flex flex-col justify-between border-2 border-amber-400/80 bg-amber-950/20">
          <div>
            <div class="flex items-center gap-3 pb-3 border-b border-[#4a3520]">
              <div class="w-12 h-12 rounded-xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center p-2 shadow-inner">
                ${getVectorIcon('coin_gold', 'w-full h-full')}
              </div>
              <div>
                <h3 class="text-base font-black text-amber-300">圣王亨利七世 · 每日俸禄谕旨</h3>
                <p class="text-[11px] text-slate-400">亚诺王都国库每日为合格勇者拨付军饷津贴</p>
              </div>
            </div>

            <!-- 谕旨正文框 -->
            <div class="max-w-xl mx-auto my-4 p-5 rounded-2xl bg-black/60 border border-amber-500/50 space-y-3 text-center">
              <div class="text-xs font-bold text-amber-200 leading-relaxed">
                凡亚诺大陆英勇之士，持王国征召令者，每日皆可至大殿亲领王国赏赐！
              </div>

              <div class="grid grid-cols-2 gap-3 py-2">
                <div class="p-2.5 rounded-xl bg-black/60 border border-amber-600/40">
                  <div class="text-[11px] text-slate-400">赏赐金币</div>
                  <div class="text-lg font-black text-amber-400 font-mono mt-0.5">+1,500 G</div>
                </div>
                <div class="p-2.5 rounded-xl bg-black/60 border border-cyan-600/40">
                  <div class="text-[11px] text-slate-400">赏赐魔晶</div>
                  <div class="text-lg font-black text-cyan-400 font-mono mt-0.5">+20 魔晶</div>
                </div>
              </div>

              <div class="text-[11px] text-slate-400 font-mono">
                领取机制：每位玩家每日限领 1 次，次日拂晓重置
              </div>
            </div>
          </div>

          <!-- 领受按键 -->
          <div class="pt-3 border-t border-[#4a3520] max-w-md mx-auto w-full">
            ${canClaim ? `
              <button id="btn-claim-salary" class="w-full mota-btn-gold py-3 rounded-xl text-sm font-black shadow-xl border-2 border-amber-300 animate-pulse flex items-center justify-center gap-2">
                <span>恭敬晋谒圣王 · 领受今日王国俸禄</span>
              </button>
            ` : `
              <button disabled class="w-full py-3 rounded-xl text-xs font-bold bg-[#241c14] border border-[#5a4830] text-slate-500 cursor-not-allowed text-center">
                今日俸禄已领受完毕 (明日拂晓再度面圣)
              </button>
            `}
          </div>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 8. 【幻境试炼封号长廊】(Palace Trials Sub-page)
  // ==========================================
  renderPalaceTrials() {
    const data = gameState.data;
    const curTrialIdx = data.royalTrials?.completedStage || 0;
    const nextTrial = ROYAL_TRIALS[curTrialIdx];
    const classId = data.classId || 'warrior';

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer hover:underline" data-goto="palace">圣王大殿</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">职业七阶转职殿堂 · 封号试炼</span>
          </div>
          <button data-goto="palace" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王宫大厅</span>
          </button>
        </div>

        <!-- 主体：7大转职进阶图谱 (4列) + 下一阶段守关BOSS特写 (8列) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
          
          <!-- 7大转职阶位荣耀长廊 -->
          <div class="md:col-span-4 mota-parchment-panel p-3 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
            <div class="text-xs font-bold text-amber-300 pb-2 border-b border-[#4a3520] flex items-center justify-between">
              <span>七阶转职晋升图谱</span>
              <span class="text-[10px] text-slate-400 font-mono">阶位: ${curTrialIdx}/${ROYAL_TRIALS.length}</span>
            </div>

            <div class="space-y-1.5 my-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              ${ROYAL_TRIALS.map((t, idx) => {
                const isDone = idx < curTrialIdx;
                const isCurrent = idx === curTrialIdx;
                const promo = t.classPromotions?.[classId] || { title: `${t.title}阶`, desc: '' };
                return `
                  <div class="p-2 rounded-lg border flex items-center justify-between ${isCurrent ? 'bg-amber-950/60 border-amber-400 shadow' : isDone ? 'bg-black/50 border-emerald-800/60' : 'bg-black/30 border-slate-800 opacity-60'}">
                    <div class="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span class="w-6 h-6 rounded bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-xs font-bold text-amber-300 font-mono flex-shrink-0">${idx + 1}</span>
                      <div class="min-w-0">
                        <div class="text-xs font-bold truncate ${isCurrent ? 'text-amber-200' : isDone ? 'text-emerald-300' : 'text-slate-400'}">
                          ${promo.title}
                        </div>
                        <div class="text-[10px] text-slate-500 font-mono">准入: Lv.${t.level} · 声望${t.fameReq}</div>
                      </div>
                    </div>
                    <span class="text-[10px] px-1.5 py-0.2 rounded font-mono flex-shrink-0 ${isDone ? 'bg-emerald-950 text-emerald-300' : isCurrent ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-slate-400'}">
                      ${isDone ? '已晋升' : isCurrent ? '当前考核' : '未解锁'}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="text-[10px] text-slate-400 text-center pt-1 border-t border-[#4a3520]/50">
              每阶转职重铸职业封号，赋予全队永久威压属性
            </div>
          </div>

          <!-- 守关幻象 BOSS 与考核详情 -->
          <div class="md:col-span-8 mota-parchment-panel p-4 sm:p-5 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
            ${nextTrial ? (() => {
              const promo = nextTrial.classPromotions?.[classId] || { title: `${nextTrial.title}阶转职`, desc: nextTrial.rewardDesc };
              const isLevelMet = (data.level || 1) >= nextTrial.level;
              const isFameMet = (data.prestige || 0) >= nextTrial.fameReq;
              const canChallenge = isLevelMet && isFameMet;

              return `
                <div>
                  <div class="flex items-center justify-between pb-3 border-b border-[#4a3520]">
                    <div>
                      <h3 class="text-sm font-black text-amber-300">第 ${curTrialIdx + 1} 阶职业晋升试炼台</h3>
                      <div class="text-xs text-slate-400 mt-0.5">目标转职：<b class="text-amber-200">【${promo.title}】</b></div>
                    </div>
                    <div class="text-right text-xs font-mono">
                      <div class="${isLevelMet ? 'text-emerald-400' : 'text-red-400'}">等级要求: Lv.${data.level}/${nextTrial.level}</div>
                      <div class="${isFameMet ? 'text-emerald-400' : 'text-red-400'}">声望要求: ${data.prestige || 0}/${nextTrial.fameReq}</div>
                    </div>
                  </div>

                  <div class="my-3 p-3.5 rounded-xl bg-black/50 border border-[#4a3520] space-y-2.5">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 rounded-2xl bg-purple-950/60 border-2 border-purple-500 flex items-center justify-center p-1.5 shadow-inner flex-shrink-0">
                        ${getVectorIcon('bld_palace', 'w-full h-full')}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-black text-red-400">【考核镇守】${nextTrial.bossName}</div>
                        <div class="text-xs text-slate-300 mt-0.5 leading-relaxed">
                          转职意境：<span class="text-amber-300">${promo.desc}</span>
                        </div>
                        <div class="text-xs text-slate-300 mt-0.5">
                          晋阶战力赏赐：<span class="text-emerald-400 font-mono">${nextTrial.rewardDesc}</span>
                        </div>
                      </div>
                    </div>

                    <!-- BOSS 战力三维 -->
                    <div class="grid grid-cols-3 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
                      <div class="p-2 bg-black/60 rounded text-center text-red-400">
                        生命: ${nextTrial.bossStats.hp.toLocaleString()}
                      </div>
                      <div class="p-2 bg-black/60 rounded text-center text-amber-400">
                        攻击: ${nextTrial.bossStats.atk.toLocaleString()}
                      </div>
                      <div class="p-2 bg-black/60 rounded text-center text-blue-400">
                        防御: ${nextTrial.bossStats.def.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 挑战按键 -->
                <div class="pt-3 border-t border-[#4a3520]">
                  <button id="btn-challenge-trial" class="w-full mota-btn-gold py-3 rounded-xl text-xs font-bold shadow-md border-amber-300 flex items-center justify-center gap-1.5 ${canChallenge ? '' : 'opacity-70'}">
                    <span>开启转职试炼 (晋升【${promo.title}】)</span>
                  </button>
                </div>
              `;
            })() : `
              <div class="h-full flex flex-col items-center justify-center text-amber-300 text-sm font-bold text-center p-6 space-y-2">
                <div class="text-base font-black text-amber-200">恭贺勇士！你已达成终极绝地转职【${gameState.getPromotedClassName()}】！</div>
                <div class="text-xs text-slate-400">七大王宫试炼全通，战阵威仪已臻绝巅，名扬亚诺千古青史！</div>
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 9. 【远古屠龙殿】(Dragons Sub-page)
  // ==========================================
  renderDragons() {
    const data = gameState.data;

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">远古屠龙殿</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs font-mono text-slate-300">
              今日剩余次数: <b class="text-amber-400">${data.dragon?.trialsLeft ?? 3}</b> / 3
            </span>
            <button data-goto="hub" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
              <span>← 返回王都大街</span>
            </button>
          </div>
        </div>

        <!-- 3 大远古巨龙对决殿堂 -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          ${DRAGON_TRIALS.map((dragon, idx) => {
            const isLevelOk = data.level >= dragon.minLevel;
            return `
              <div class="mota-parchment-panel p-4 rounded-2xl flex flex-col justify-between border-2 border-red-900/60 bg-red-950/20">
                <div>
                  <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]">
                    <div class="w-8 h-8 rounded-lg bg-red-950/70 border border-red-500/70 flex items-center justify-center p-1">
                      ${getVectorIcon('bld_dragons', 'w-full h-full')}
                    </div>
                    <span class="text-xs font-mono text-amber-400 font-bold">Lv.${dragon.minLevel} 可战</span>
                  </div>

                  <div class="my-3 text-center">
                    <h3 class="text-base font-black text-amber-200">${dragon.name}</h3>
                    <div class="text-xs text-red-400 font-mono mt-1">${dragon.title}</div>
                  </div>

                  <div class="p-3 rounded-xl bg-black/60 border border-slate-800 text-xs space-y-1.5 font-mono">
                    <div class="text-slate-300 flex justify-between">
                      <span>生命:</span><b class="text-red-400">${dragon.stats.hp.toLocaleString()}</b>
                    </div>
                    <div class="text-slate-300 flex justify-between">
                      <span>攻击:</span><b class="text-amber-400">${dragon.stats.atk.toLocaleString()}</b>
                    </div>
                    <div class="text-slate-300 flex justify-between">
                      <span>防御:</span><b class="text-blue-400">${dragon.stats.def.toLocaleString()}</b>
                    </div>
                    <div class="pt-1 border-t border-slate-800 text-[11px] text-purple-300">
                      爆落：${dragon.dropDesc}
                    </div>
                  </div>
                </div>

                <div class="pt-3">
                  <button data-dragon-id="${dragon.id}" class="btn-fight-dragon w-full mota-btn-gold py-2.5 rounded-xl text-xs font-bold shadow ${isLevelOk ? '' : 'opacity-50'}">
                    拔剑诛杀此龙
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
  // 10. 【碧波垂钓水域】(Fishing Sub-page)
  // ==========================================
  renderFishing() {
    const data = gameState.data;
    const normalBait = data.bag.find(i => i.id === 'bait_normal')?.count || 0;
    const luxuryBait = data.bag.find(i => i.id === 'bait_luxury')?.count || 0;

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">碧波垂钓亭</span>
          </div>
          <button data-goto="hub" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王都大街</span>
          </button>
        </div>

        <!-- 垂钓水域大特写 -->
        <div class="flex-1 min-h-0 mota-parchment-panel p-5 rounded-2xl flex flex-col justify-between border-2 border-cyan-900/60 bg-cyan-950/20">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-[#4a3520]">
              <div>
                <h3 class="text-sm font-black text-amber-300">亚诺护城水域 · 悠闲泛舟垂钓</h3>
                <p class="text-[11px] text-slate-400">使用普通鱼饵捕捞七鳃鳗，或使用秘制鱼饵垂钓稀世金龙鱼！</p>
              </div>
              <div class="flex gap-3 text-xs bg-black/60 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
                <div>七鳃鳗: <b class="text-cyan-400">${data.fishing?.lamprey || 0}</b> 尾</div>
                <div>金龙鱼: <b class="text-amber-400">${data.fishing?.arowana || 0}</b> 尾</div>
              </div>
            </div>

            <!-- 两大钓台 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              <!-- 普通鱼饵 -->
              <div class="p-4 rounded-xl bg-black/50 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div class="flex items-center justify-between text-xs font-bold">
                    <span class="text-cyan-300">普通鱼饵垂钓</span>
                    <span class="text-slate-400 font-mono">持有: ${normalBait} 份</span>
                  </div>
                  <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                    稳定垂钓野生七鳃鳗，每次可获得丰厚魔晶石和金币储备。
                  </p>
                </div>
                <button id="btn-fish-normal" class="w-full mota-btn-dark py-2.5 rounded-xl text-xs font-bold text-cyan-300 border-cyan-700/60 ${normalBait > 0 ? '' : 'opacity-40'}">
                  抛投普通鱼饵 (钓七鳃鳗)
                </button>
              </div>

              <!-- 高级鱼饵 -->
              <div class="p-4 rounded-xl bg-black/50 border border-amber-600/50 flex flex-col justify-between space-y-3">
                <div>
                  <div class="flex items-center justify-between text-xs font-bold">
                    <span class="text-amber-300">秘制高级鱼饵垂钓</span>
                    <span class="text-amber-400 font-mono">持有: ${luxuryBait} 份</span>
                  </div>
                  <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                    特供高级鱼饵，有极高概率引诱万中无一的【金龙鱼】，爆落天命道具！
                  </p>
                </div>
                <button id="btn-fish-luxury" class="w-full mota-btn-gold py-2.5 rounded-xl text-xs font-black shadow-md border-amber-300 ${luxuryBait > 0 ? '' : 'opacity-40'}">
                  抛投高级鱼饵 (博取金龙鱼)
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 13. 【皇家酒馆大厅】(Tavern Hub)
  // ==========================================
  renderTavernHub() {
    const data = gameState.data;
    const bounties = gameState.getTavernBounties();
    const hasClaimable = bounties.some(b => b.status === 'ready_to_claim');
    const inProgressCount = bounties.filter(b => b.status === 'in_progress').length;
    const drinkBuff = data.tavern?.drinkBuff;
    const activeMercId = data.estate?.hiredMercId;
    const activeMerc = MERCENARIES.find(m => m.id === activeMercId) || MERCENARIES[1];

    return `
      <div class="w-full h-full p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑与酒馆招牌 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">亚诺圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">亚诺皇家酒馆 (冒险者天堂)</span>
          </div>
          <div class="text-[11px] text-amber-300/80 font-mono hidden sm:block">
            麦酒香气四溢 · 赏金猎人聚集地
          </div>
        </div>

        <!-- 中部主体：横幅与三大分区卡片 -->
        <div class="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
          
          <!-- 全景迎宾横幅 -->
          <div class="p-4 rounded-xl border border-amber-600/40 bg-gradient-to-r from-amber-950/80 via-black/80 to-amber-950/70 shadow-lg flex items-center justify-between">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-500/50 text-amber-300 text-[10px] font-bold">王国驻地</span>
                <h2 class="text-base font-black text-amber-100 tracking-wider">野猪与利刃 · 皇家酒馆</h2>
              </div>
              <p class="text-xs text-amber-200/80 leading-relaxed max-w-2xl">
                壁炉内的松木烈焰熊熊跳跃，游吟诗人的鲁特琴声伴随刀剑碰撞的粗豪笑谈回荡在石墙之间。在此揭榜领赏、雇佣传奇勇士、痛饮特调烈酒！
              </p>
            </div>
            <div class="hidden md:flex flex-col items-end text-xs text-amber-300/90 font-mono space-y-1">
              <span>随行盟友: <strong class="text-amber-200">${activeMerc.name}</strong></span>
              <span>特调酒力: <strong class="${drinkBuff ? 'text-amber-400' : 'text-slate-400'}">${drinkBuff ? drinkBuff.name : '未饮用'}</strong></span>
            </div>
          </div>

          <!-- 三大功能入口卡片 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            <!-- 1. 皇家赏金悬赏木榜 -->
            <div data-goto="tavern_bounty" class="btn-goto-subview mota-building-card p-4 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-600/70 hover:border-amber-400 transition-all relative">
              ${hasClaimable ? `
                <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-bounce shadow">
                  赏金待结
                </div>
              ` : ''}
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-500/60 flex items-center justify-center p-2 shadow-inner">
                    ${renderGameIcon('skill_book', { size: 'w-full h-full' })}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-amber-200">赏金悬赏木榜</h3>
                    <p class="text-[10px] text-amber-400/80">每日 4 大通缉凶魔首领</p>
                  </div>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">
                  治安署与圣堂签发的高额通缉榜。斩杀幽影狼王、暗影女盗、腐毒恶蟾与裂谷飞龙，兑付巨额金币与军功声望！
                </p>
                <div class="p-2 rounded bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>悬赏状态:</span>
                  <span class="text-amber-300">${hasClaimable ? '有赏金可领！' : inProgressCount > 0 ? `${inProgressCount} 个通缉讨伐中` : '4 份通缉令待揭'}</span>
                </div>
              </div>

              <div class="pt-3 mt-3 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span class="text-[11px] text-slate-400 font-normal">通缉令与悬赏金</span>
                <button class="px-3 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                  查看悬赏榜 ->
                </button>
              </div>
            </div>

            <!-- 2. 佣兵公会驻所 -->
            <div data-goto="tavern_mercenary" class="btn-goto-subview mota-building-card p-4 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-600/70 hover:border-amber-400 transition-all">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-500/60 flex items-center justify-center p-2 shadow-inner">
                    ${renderGameIcon('avatar_warrior', { size: 'w-full h-full' })}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-amber-200">佣兵公会驻所</h3>
                    <p class="text-[10px] text-amber-400/80">誓约传奇战友 · 随行护卫</p>
                  </div>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">
                  三大原著传奇佣兵：圣光救赎神官、誓约神圣铁卫与逐风游侠诗人。出战可为全队赋予减伤、大回血或速度暴增！
                </p>
                <div class="p-2 rounded bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>当前随行:</span>
                  <span class="text-amber-300">${activeMerc.name}</span>
                </div>
              </div>

              <div class="pt-3 mt-3 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span class="text-[11px] text-slate-400 font-normal">盟友立誓与阵位调配</span>
                <button class="px-3 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                  拜会佣兵 ->
                </button>
              </div>
            </div>

            <!-- 3. 吧台特酿与游吟诗人 -->
            <div data-goto="tavern_drinks" class="btn-goto-subview mota-building-card p-4 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-600/70 hover:border-amber-400 transition-all">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-500/60 flex items-center justify-center p-2 shadow-inner">
                    ${renderGameIcon('potion_hp', { size: 'w-full h-full' })}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-amber-200">吧台特酿与诗人</h3>
                    <p class="text-[10px] text-amber-400/80">全日战斗属性 Buff · 大陆秘闻</p>
                  </div>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">
                  矮人黑铁黑啤、月光精灵甘露与炎龙烈性朗姆。畅饮一杯激发生理极限，探听魔塔深渊首领战术弱点！
                </p>
                <div class="p-2 rounded bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>当前酒力:</span>
                  <span class="text-amber-300">${drinkBuff ? drinkBuff.buff.desc : '尚待畅饮'}</span>
                </div>
              </div>

              <div class="pt-3 mt-3 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span class="text-[11px] text-slate-400 font-normal">畅饮佳酿与史诗听闻</span>
                <button class="px-3 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                  前往吧台 ->
                </button>
              </div>
            </div>

          </div>

        </div>

        <!-- 底部返回按键 -->
        <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between mt-2 flex-shrink-0">
          <button data-goto="hub" class="btn-goto-subview px-4 py-1.5 rounded-lg mota-btn-dark border border-amber-600/50 text-amber-300 text-xs font-bold shadow flex items-center gap-2">
            <span><- 返回王都中心大街</span>
          </button>
          <span class="text-[11px] text-slate-500 font-mono">亚诺历 1024 年 · 皇家公会酒馆</span>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 14. 【赏金悬赏木榜】(Tavern Bounty Board)
  // ==========================================
  renderTavernBounty() {
    const bounties = gameState.getTavernBounties();

    return `
      <div class="w-full h-full p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold cursor-pointer btn-goto-subview" data-goto="hub">亚诺圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer btn-goto-subview" data-goto="tavern">皇家酒馆</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">每日赏金悬赏木榜</span>
          </div>
          <div class="text-[11px] text-amber-300/80 font-mono hidden sm:block">
            每日拂晓自动更新 · 斩杀领主领取赏金
          </div>
        </div>

        <!-- 悬赏卡片列表 (4 张通缉令) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1">
          ${bounties.map(b => {
            const isCompleted = b.status === 'completed';
            const isReadyToClaim = b.status === 'ready_to_claim';
            const isInProgress = b.status === 'in_progress';
            const starsText = `${b.stars} 星级难度`;

            return `
              <div class="p-3.5 rounded-xl border-2 ${isCompleted ? 'border-slate-800 bg-black/40 opacity-70' : isReadyToClaim ? 'border-amber-400 bg-amber-950/40 shadow-lg' : isInProgress ? 'border-red-600/70 bg-red-950/30 shadow' : 'border-amber-700/60 bg-black/50'} flex flex-col justify-between transition-all">
                
                <!-- 头部：标题与星级 -->
                <div>
                  <div class="flex items-center justify-between pb-2 border-b border-amber-900/40">
                    <div class="flex items-center gap-2">
                      <span class="text-amber-400 font-bold text-xs tracking-wider">${b.title}</span>
                      <span class="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-600/60 text-amber-300 font-mono">
                        Lv.${b.reqLevel}
                      </span>
                    </div>
                    <span class="text-amber-400 font-mono text-xs font-bold">${starsText}</span>
                  </div>

                  <!-- 目标与首领详情 -->
                  <div class="mt-2.5 flex items-start gap-3">
                    <div class="w-14 h-14 rounded-xl bg-black/60 border border-amber-700/50 flex-shrink-0 flex items-center justify-center p-1 shadow-inner">
                      ${renderGameIcon(b.avatar, { size: 'w-full h-full' })}
                    </div>
                    <div class="flex-1 min-w-0 space-y-1">
                      <p class="text-xs text-slate-300 leading-relaxed font-sans">${b.desc}</p>
                      <div class="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>生命: <strong class="text-rose-300">${b.stats.hp}</strong></span>
                        <span>攻击: <strong class="text-amber-200">${b.stats.atk}</strong></span>
                        <span>防御: <strong class="text-blue-300">${b.stats.def}</strong></span>
                      </div>
                    </div>
                  </div>

                  <!-- 赏金预览 -->
                  <div class="mt-2.5 p-2 rounded-lg bg-black/50 border border-amber-900/30 flex items-center justify-between text-xs font-mono">
                    <div class="flex items-center gap-3 text-amber-300">
                      <span>金币: +${b.rewards.gold}</span>
                      <span>声望: +${b.rewards.prestige}</span>
                      <span>魔晶: +${b.rewards.crystal}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      ${b.rewards.items.map(it => `
                        <span title="${it.name} x${it.count}" class="inline-flex items-center">
                          ${renderGameIcon(it.id, { size: 'w-5 h-5' })}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                </div>

                <!-- 底部操作按钮 -->
                <div class="pt-2.5 mt-2.5 border-t border-amber-900/40 flex items-center justify-between">
                  <span class="text-[11px] text-slate-400">
                    ${isCompleted ? '[已结案] 今日悬赏已领受' : isReadyToClaim ? '已讨伐！首级已验，速速领赏！' : isInProgress ? '通缉中：速前往深渊将其击毙！' : '尚未接取此悬赏令'}
                  </span>
                  <div>
                    ${isCompleted ? `
                      <span class="px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-400 text-xs font-mono">
                        已完成
                      </span>
                    ` : isReadyToClaim ? `
                      <button data-bounty-id="${b.id}" class="btn-claim-bounty px-4 py-1.5 rounded-lg mota-btn-gold text-xs font-black shadow animate-pulse">
                        领受赏金！
                      </button>
                    ` : isInProgress ? `
                      <button data-bounty-id="${b.id}" class="btn-fight-bounty px-4 py-1.5 rounded-lg bg-red-900/90 hover:bg-red-800 border border-red-500 text-red-100 text-xs font-bold shadow">
                        出击讨伐 ->
                      </button>
                    ` : `
                      <button data-bounty-id="${b.id}" class="btn-accept-bounty px-4 py-1.5 rounded-lg mota-btn-dark border border-amber-500 text-amber-300 text-xs font-bold shadow">
                        揭榜接令 ->
                      </button>
                    `}
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>

        <!-- 底部返回按键 -->
        <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between mt-2 flex-shrink-0">
          <button data-goto="tavern" class="btn-goto-subview px-4 py-1.5 rounded-lg mota-btn-dark border border-amber-600/50 text-amber-300 text-xs font-bold shadow flex items-center gap-2">
            <span><- 返回酒馆大厅</span>
          </button>
          <span class="text-[11px] text-slate-500 font-mono">每日赏金于跨日清晨重置</span>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 15. 【吧台特酿与游吟诗人】(Tavern Drinks & Bard)
  // ==========================================
  renderTavernDrinks() {
    const data = gameState.data;
    const currentDrink = data.tavern?.drinkBuff;

    return `
      <div class="w-full h-full p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold cursor-pointer btn-goto-subview" data-goto="hub">亚诺圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer btn-goto-subview" data-goto="tavern">皇家酒馆</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">吧台特酿与游吟诗人</span>
          </div>
          <div class="text-[11px] text-amber-300/80 font-mono hidden sm:block">
            麦芽清香 · 今日战斗属性常驻增益
          </div>
        </div>

        <!-- 中部主体：当前酒力状态 + 3 种美酒卡片 + 游吟诗人史诗台词 -->
        <div class="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
          
          <!-- 当前特调酒力状态栏 -->
          <div class="p-3.5 rounded-xl border ${currentDrink ? 'border-amber-400 bg-amber-950/40 shadow-md' : 'border-slate-800 bg-black/40'} flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center p-1.5 shadow-inner">
                ${renderGameIcon('potion_hp', { size: 'w-full h-full' })}
              </div>
              <div>
                <h4 class="text-xs font-bold text-amber-200">当前特调酒力状态</h4>
                <p class="text-[11px] text-slate-300">
                  ${currentDrink ? `<strong class="text-amber-400">【${currentDrink.name}】</strong>已生效！— ${currentDrink.buff.desc}（今日全程生效）` : '今日尚未痛饮美酒，快来上一杯特调麦酒为探险助威！'}
                </p>
              </div>
            </div>
            <div class="text-xs text-amber-400 font-mono">
              持有金币: <strong class="text-amber-300">${data.gold}</strong>
            </div>
          </div>

          <!-- 三大特酿饮品卡片 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            ${TAVERN_DRINKS.map(d => {
              const isCurrent = currentDrink && currentDrink.id === d.id;

              return `
                <div class="p-3.5 rounded-xl border-2 ${isCurrent ? 'border-amber-400 bg-amber-950/40' : 'border-amber-800/60 bg-black/50'} flex flex-col justify-between transition-all">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between pb-2 border-b border-amber-900/40">
                      <span class="text-amber-200 font-bold text-xs">${d.name}</span>
                      <span class="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-600/60 text-amber-300 font-mono">
                        ${d.costGold} 金币
                      </span>
                    </div>

                    <div class="p-2 rounded bg-black/40 border border-slate-800 text-[11px] text-amber-300 font-mono">
                      特性: ${d.buff.desc}
                    </div>

                    <p class="text-[11px] text-slate-400 italic leading-relaxed pt-1">
                      ${d.quote}
                    </p>
                  </div>

                  <div class="pt-3 mt-3 border-t border-amber-900/40 flex items-center justify-end">
                    ${isCurrent ? `
                      <span class="px-3 py-1 rounded bg-amber-950 border border-amber-500 text-amber-300 text-xs font-bold font-mono">
                        [正在生效中]
                      </span>
                    ` : `
                      <button data-drink-id="${d.id}" class="btn-order-drink px-3.5 py-1.5 rounded-lg mota-btn-gold text-xs font-bold shadow">
                        痛饮一杯 (${d.costGold}G) ->
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- 游吟诗人见闻录 -->
          <div class="p-3.5 rounded-xl border border-amber-700/40 bg-black/40 space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-amber-400 font-bold text-xs">游吟诗人的鲁特琴秘闻</span>
              <span class="text-[10px] text-slate-500 font-mono">· 战术弱点与大陆史诗</span>
            </div>
            <p class="text-xs text-amber-100/80 leading-relaxed italic">
              “年轻的骑士啊，听我一曲：深渊三十层的骨龙惧怕白昼的神圣祝福；幽魂沼泽的毒蟾会在狂怒时蓄力毒爆，唯有敏锐的闪避方能反制；若要在魔塔深渊走得更远，别忘了喂饱你的神兽，带上誓约的铁卫！”
            </p>
          </div>

        </div>

        <!-- 底部返回按键 -->
        <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between mt-2 flex-shrink-0">
          <button data-goto="tavern" class="btn-goto-subview px-4 py-1.5 rounded-lg mota-btn-dark border border-amber-600/50 text-amber-300 text-xs font-bold shadow flex items-center gap-2">
            <span><- 返回酒馆大厅</span>
          </button>
          <span class="text-[11px] text-slate-500 font-mono">亚诺皇家酒馆 · 麦酒长廊</span>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 16. 【佣兵公会驻所】(Tavern Mercenary Guild)
  // ==========================================
  renderTavernMercenary() {
    const data = gameState.data;
    const hiredMercId = data.estate?.hiredMercId || 'merc_paladin';
    const activeMerc = MERCENARIES.find(m => m.id === hiredMercId) || MERCENARIES[1];

    return `
      <div class="w-full h-full p-2 flex flex-col justify-between select-none">
        
        <!-- 顶部面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold cursor-pointer btn-goto-subview" data-goto="hub">亚诺圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer btn-goto-subview" data-goto="tavern">皇家酒馆</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">佣兵公会驻所</span>
          </div>
          <div class="text-[11px] text-amber-300/80 font-mono hidden sm:block">
            誓约传奇盟友 · 赋予主角战阵光环
          </div>
        </div>

        <!-- 中部主体：当前随行佣兵 + 3 传奇佣兵卡片 -->
        <div class="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
          
          <!-- 当前随行盟友状态 -->
          <div class="p-3.5 rounded-xl border border-amber-400 bg-amber-950/40 shadow-md flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-amber-950 border border-amber-500/70 flex items-center justify-center p-1 shadow-inner">
                ${renderGameIcon(activeMerc.avatar || 'avatar_warrior', { size: 'w-full h-full' })}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded bg-amber-900/80 border border-amber-500/60 text-amber-200 text-[10px] font-bold font-mono">${activeMerc.role}</span>
                  <h4 class="text-sm font-black text-amber-100">${activeMerc.name}</h4>
                </div>
                <p class="text-xs text-amber-300 font-mono mt-0.5">
                  随行光环【${activeMerc.aura}】：${activeMerc.auraDesc}
                </p>
              </div>
            </div>
            <div class="hidden sm:block text-xs font-mono text-amber-300 font-bold">
              [随行护卫中]
            </div>
          </div>

          <!-- 三大传奇佣兵卡片列表 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            ${MERCENARIES.map(m => {
              const isHired = hiredMercId === m.id;

              return `
                <div class="p-4 rounded-xl border-2 ${isHired ? 'border-amber-400 bg-amber-950/30 shadow-lg' : 'border-slate-800 bg-black/40 hover:border-amber-600/60'} flex flex-col justify-between transition-all">
                  <div class="space-y-2.5">
                    <div class="flex items-center justify-between pb-2 border-b border-amber-900/40">
                      <div>
                        <span class="text-[10px] text-amber-400/80 font-mono">${m.role}</span>
                        <h4 class="text-xs font-bold text-amber-200">${m.name}</h4>
                      </div>
                      <span class="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-amber-600/40 text-amber-300 font-mono">
                        ${m.aura}
                      </span>
                    </div>

                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 rounded-xl bg-black/50 border border-amber-600/40 flex-shrink-0 flex items-center justify-center p-1">
                        ${renderGameIcon(m.avatar || 'avatar_warrior', { size: 'w-full h-full' })}
                      </div>
                      <p class="text-[11px] text-slate-300 leading-relaxed font-sans">
                        ${m.desc}
                      </p>
                    </div>

                    <div class="p-2 rounded bg-black/50 border border-slate-800 text-[11px] text-amber-200/90 font-mono leading-relaxed">
                      战阵特效: ${m.auraDesc}
                    </div>
                  </div>

                  <div class="pt-3 mt-3 border-t border-amber-900/40 flex items-center justify-end">
                    ${isHired ? `
                      <span class="px-3.5 py-1.5 rounded-lg bg-amber-950 border border-amber-500 text-amber-300 text-xs font-bold font-mono">
                        [誓约随行中]
                      </span>
                    ` : `
                      <button data-merc-id="${m.id}" class="btn-tavern-hire-merc px-4 py-1.5 rounded-lg mota-btn-gold text-xs font-bold shadow">
                        誓约随行出战 ->
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

        </div>

        <!-- 底部返回按键 -->
        <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between mt-2 flex-shrink-0">
          <button data-goto="tavern" class="btn-goto-subview px-4 py-1.5 rounded-lg mota-btn-dark border border-amber-600/50 text-amber-300 text-xs font-bold shadow flex items-center gap-2">
            <span><- 返回酒馆大厅</span>
          </button>
          <span class="text-[11px] text-slate-500 font-mono">随行佣兵将在战斗首回合登场施展支援战吼</span>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 事件绑定与子页面跳转控制
  // ==========================================
  bindEvents() {
    // 页面跳转路由事件
    this.container.querySelectorAll('.btn-goto-subview').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-goto');
        if (targetView) {
          this.currentView = targetView;
          this.render();
        }
      });
    });

    // 选装备槽位 (铁匠铺升星)
    this.container.querySelectorAll('.btn-select-smithy-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotKey = btn.getAttribute('data-smithy-slot');
        this.selectedEquipSlot = slotKey;
        this.render();
      });
    });

    // 领取俸禄 (达成主线1)
    const btnSalary = document.getElementById('btn-claim-salary');
    if (btnSalary && gameState.canClaimSalary()) {
      btnSalary.addEventListener('click', () => {
        const res = gameState.claimSalary();
        if (!res.success) {
          gameModal.alert(res.msg, '圣王早朝俸禄');
          this.render();
          return;
        }

        if (gameState.data.currentQuestId === 'quest_1') {
          gameModal.confirm(
            `恭敬晋谒圣王！成功领受今日王国俸禄：金币 +1500，魔晶 +20！\n\n【主线任务达成】初临王都 · 晋谒圣王！\n圣王恩赐丰厚奖赏：经验 +500，金币 +1500，魔晶 +20，【远古重铸灵药】x3！\n\n是否立即领受圣王犒赏并开启下一阶段主线【工欲善其事 · 装备升星】？`,
            () => {
              gameState.claimQuestReward('quest_1');
              gameModal.alert('丰厚犒赏已存入行囊！已自动为你开启下一阶段主线【工欲善其事 · 装备升星】，立即前往皇家铁匠铺升星工坊强化装备吧！', '主线推进', () => {
                this.currentView = 'smithy_enhance';
                this.render();
              });
            },
            () => {
              this.render();
            },
            '主线大捷 · 晋谒圣王'
          );
        } else {
          gameModal.alert(res.msg, '圣王早朝俸禄');
          this.render();
        }
      });
    }

    // 执行升星精铸 (达成主线2)
    const btnEnhance = document.getElementById('btn-do-enhance');
    if (btnEnhance) {
      btnEnhance.addEventListener('click', () => {
        const useProt = document.getElementById('chk-use-protect')?.checked || false;
        const res = gameState.enhanceEquipment(this.selectedEquipSlot, useProt);
        if (res.success) {
          sound.playFanfare();
          gameState.triggerQuestAction('enhance');
          if (gameState.data.currentQuestId === 'quest_2') {
            gameModal.confirm(
              `升星大吉！${res.msg}\n\n【主线任务达成】工欲善其事 · 装备升星！\n奖赏：经验 +800，金币 +2000，魔晶 +30，【银白骑士重剑】！\n\n是否立即领受犒赏并开启下一阶段主线【远古契约 · 神兽随行】？`,
              () => {
                gameState.claimQuestReward('quest_2');
                gameModal.alert('丰厚犒赏已存入行囊！已为你开启下一阶段主线【远古契约 · 神兽随行】，前往神兽圣境设立出战主宠吧！', '主线推进', () => {
                  if (window.switchMainTab) window.switchMainTab('pets');
                });
              },
              () => {
                this.render();
              },
              '主线大捷 · 装备升星'
            );
            this.render();
            return;
          }
        } else {
          sound.playBlock();
        }
        gameModal.alert(res.msg, '装备升星结果');
        this.render();
      });
    }

    // 全身一键修理
    const btnRepair = document.getElementById('btn-repair-all');
    if (btnRepair) {
      btnRepair.addEventListener('click', () => {
        const res = gameState.repairAllEquipment();
        gameModal.alert(res.msg, '铁匠铺耐久修缮');
        this.render();
      });
    }

    // 装备分解
    const btnDis = document.getElementById('btn-disassemble-gear');
    if (btnDis) {
      btnDis.addEventListener('click', () => {
        const item = gameState.data.equipped[this.selectedEquipSlot];
        if (!item) return;
        gameModal.confirm(
          `确定要分解【${item.name}】吗？分解后装备将彻底消失，返还黄金晶石！`, 
          () => {
            gameState.data.equipped[this.selectedEquipSlot] = null;
            gameState.data.bag.push({ ...SPECIAL_ITEMS.crystal_gold, count: 3, uid: 'dis_' + Date.now() });
            gameModal.alert('分解完成！获得黄金晶石 x3！', '熔炉分解成功');
            gameState.notify();
            this.render();
          },
          () => {},
          '分解装备确认'
        );
      });
    }

    // 挑战职业八阶转职试炼
    const btnTrial = document.getElementById('btn-challenge-trial');
    if (btnTrial) {
      btnTrial.addEventListener('click', () => {
        const curStage = gameState.data.royalTrials?.completedStage || 0;
        const trial = ROYAL_TRIALS[curStage];
        if (!trial) return;
        if (gameState.data.level < trial.level) return gameModal.alert(`等级未达标！需达到 Lv.${trial.level}`, '转职试炼等级限制');
        if ((gameState.data.prestige || 0) < trial.fameReq) return gameModal.alert(`声望未达标！需竞技场/战场声望达到 ${trial.fameReq} 点（当前: ${gameState.data.prestige || 0}）`, '转职试炼声望限制');

        this.onOpenBattle({
          enemyData: { name: `【转职镇守】${trial.bossName}`, icon: trial.icon },
          enemyStats: { hp: trial.bossStats.hp, atk: trial.bossStats.atk, def: trial.bossStats.def, speed: 18 },
          onFinish: (victory) => {
            if (victory) {
              gameState.data.royalTrials.completedStage++;
              gameState.data.royalTrials.currentTitle = trial.title;
              gameState.data.title = trial.title;
              const newTitle = gameState.getPromotedClassName();
              gameState.addExp(trial.level * 200);
              gameState.gainCurrency(trial.level * 100, 50, 0);
              gameState.triggerQuestAction('royal_trials', 1);

              gameModal.alert(`转职册封大捷！你成功战胜 ${trial.bossName}，荣获【${trial.title}】之封号，成功转职晋阶为【${newTitle}】！全队威压战力大幅暴涨！`, '转职册封大捷');
              gameState.notify();
              this.render();
            }
          }
        });
      });
    }

    // 挑战巨龙
    this.container.querySelectorAll('.btn-fight-dragon').forEach(btn => {
      btn.addEventListener('click', () => {
        const dId = btn.getAttribute('data-dragon-id');
        const dragon = DRAGON_TRIALS.find(d => d.id === dId);
        if (!dragon) return;
        if (gameState.data.level < dragon.minLevel) return gameModal.alert(`等级不足！需达到 Lv.${dragon.minLevel}`, '屠龙圣域等级限制');
        if ((gameState.data.dragon?.trialsLeft ?? 3) <= 0) return gameModal.alert('今日 3 次屠龙讨伐次数已耗尽！', '屠龙次数耗尽');

        gameState.data.dragon.trialsLeft--;
        this.onOpenBattle({
          enemyData: { name: `【远古巨龙】${dragon.name}`, icon: dragon.icon },
          enemyStats: { hp: dragon.stats.hp, atk: dragon.stats.atk, def: dragon.stats.def, speed: 20 },
          onFinish: (victory) => {
            if (victory) {
              gameState.addExp(dragon.minLevel * 250);
              gameState.gainCurrency(5000, 100, 100);
              gameState.triggerQuestAction('slay_dragon', 1);
              if (dragon.id === 'dragon_silver') {
                gameState.triggerQuestAction('slay_silver_dragon', 1);
                gameState.data.bag.push({ ...SPECIAL_ITEMS.destiny_stone, count: 1, uid: 'dg_s_' + Date.now() });
                gameModal.alert('屠银龙大捷！斩杀耀光秘银巨龙！成功夺取传世【天命石】x1！', '屠龙大捷');
              } else if (dragon.id === 'dragon_gold') {
                gameState.data.bag.push({ ...SPECIAL_ITEMS.crystal_gold, count: 5, uid: 'dg_g_' + Date.now() });
                gameModal.alert('斩杀远古灭世金龙！爆出传世紫金晶石 x2！', '屠龙大捷');
              } else {
                gameState.data.bag.push({ ...SPECIAL_ITEMS.star_crystal, count: 5, uid: 'dg_r_' + Date.now() });
                gameModal.alert('屠红龙告捷！缴获升星水晶 x5 及大量龙血财富！', '屠龙大捷');
              }
              gameState.notify();
              this.render();
            }
          }
        });
      });
    });

    // 垂钓
    const btnFishNorm = document.getElementById('btn-fish-normal');
    if (btnFishNorm) {
      btnFishNorm.addEventListener('click', () => {
        const res = gameState.fish(false);
        gameModal.alert(res.msg, '碧波水域垂钓');
        this.render();
      });
    }
    const btnFishLux = document.getElementById('btn-fish-luxury');
    if (btnFishLux) {
      btnFishLux.addEventListener('click', () => {
        const res = gameState.fish(true);
        gameModal.alert(res.msg, '碧波水域垂钓');
        this.render();
      });
    }

    // 选装备槽位 (铁匠铺宝石工坊)
    this.container.querySelectorAll('.btn-select-socket-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotKey = btn.getAttribute('data-socket-slot');
        this.selectedEquipSlot = slotKey;
        this.render();
      });
    });

    // 选背包宝石
    this.container.querySelectorAll('.btn-select-bag-gem').forEach(btn => {
      btn.addEventListener('click', () => {
        const gemUid = btn.getAttribute('data-gem-uid');
        this.selectedGemUid = gemUid;
        this.render();
      });
    });

    // 执行打孔
    const btnPunch = document.getElementById('btn-punch-socket');
    if (btnPunch) {
      btnPunch.addEventListener('click', () => {
        const res = gameState.punchSocket(this.selectedEquipSlot);
        if (res.success) {
          sound.playFanfare();
        } else {
          sound.playBlock();
        }
        gameModal.alert(res.msg, '宝石工坊打孔');
        this.render();
      });
    }

    // 执行镶嵌 (达成主线10)
    this.container.querySelectorAll('.btn-inlay-gem').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.selectedGemUid) {
          gameModal.alert('请先在下方【行囊可用宝石库】中点击选择一颗宝石！', '镶嵌提示');
          return;
        }
        const slotKey = btn.getAttribute('data-slot');
        const socketIdx = parseInt(btn.getAttribute('data-socket-idx'), 10);
        const res = gameState.inlayGem(slotKey, socketIdx, this.selectedGemUid);
        if (res.success) {
          sound.playFanfare();
          this.selectedGemUid = null;
          if (gameState.data.currentQuestId === 'quest_10') {
            gameModal.confirm(
              `镶嵌大成！${res.msg}\n\n【主线任务达成】天外奇珍 · 宝石镶嵌！\n赏赐：经验 +15000，金币 +30000，魔晶 +100，【碎裂金刚钻】x2！\n\n是否立即领受犒赏并开启下一阶段主线【巨龙之威 · 首猎焰龙】？`,
              () => {
                gameState.claimQuestReward('quest_10');
                gameModal.alert('犒赏已存入行囊！已为你开启下一阶段主线【巨龙之威 · 首猎焰龙】，前往远古屠龙圣殿讨伐远古赤焰狂龙吧！', '主线推进', () => {
                  this.currentView = 'dragons';
                  this.render();
                });
              },
              () => this.render(),
              '主线大捷 · 宝石镶嵌'
            );
            return;
          }
        } else {
          sound.playBlock();
        }
        gameModal.alert(res.msg, '宝石工坊镶嵌');
        this.render();
      });
    });

    // 无损摘除宝石
    this.container.querySelectorAll('.btn-remove-gem').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotKey = btn.getAttribute('data-slot');
        const socketIdx = parseInt(btn.getAttribute('data-socket-idx'), 10);
        const res = gameState.removeGem(slotKey, socketIdx);
        if (res.success) {
          sound.playCoin();
        }
        gameModal.alert(res.msg, '宝石工坊摘除');
        this.render();
      });
    });

    // 选装备槽位 (神兵重铸)
    this.container.querySelectorAll('.btn-select-reforge-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotKey = btn.getAttribute('data-reforge-slot');
        this.selectedEquipSlot = slotKey;
        this.render();
      });
    });

    // 选重铸晶石类型
    this.container.querySelectorAll('.btn-select-reforge-crystal').forEach(btn => {
      btn.addEventListener('click', () => {
        const crystalId = btn.getAttribute('data-use-crystal');
        this.selectedReforgeCrystal = crystalId;
        this.render();
      });
    });

    // 执行神兵重铸 (达成主线16)
    const btnReforge = document.getElementById('btn-do-reforge');
    if (btnReforge) {
      btnReforge.addEventListener('click', () => {
        const crystalToUse = this.selectedReforgeCrystal || 'crystal_darkgold';
        const res = gameState.reforgeEquipment(this.selectedEquipSlot, crystalToUse);
        if (res.success) {
          sound.playFanfare();
          if (gameState.data.currentQuestId === 'quest_16') {
            gameModal.confirm(
              `重铸大成！${res.msg}\n\n【主线任务达成】传奇附魔 · 神兵重铸！\n赏赐：经验 +40000，金币 +80000，魔晶 +500，【暗金晶石】x3！\n\n是否立即领受犒赏并开启下一篇章【密林梦魇 · 斩杀狼王】？`,
              () => {
                gameState.claimQuestReward('quest_16');
                gameModal.alert('犒赏已发放！新主线【密林梦魇 · 斩杀狼王】已开启，前往野外征战微光森林诛灭驻地领主暗夜狼王吧！', '主线推进', () => {
                  if (window.switchMainTab) window.switchMainTab('wild');
                });
              },
              () => this.render(),
              '主线大捷 · 神兵重铸'
            );
            return;
          } else {
            gameModal.alert(res.msg, '神兵重铸大成');
          }
        } else {
          sound.playBlock();
          gameModal.alert(res.msg, '重铸提示');
        }
        this.render();
      });
    }

    // 角斗场子标签切换
    const btnTabDuel = document.getElementById('btn-arena-subtab-duel');
    if (btnTabDuel) {
      btnTabDuel.addEventListener('click', () => {
        this.arenaSubTab = 'duel';
        this.render();
      });
    }
    const btnTabShop = document.getElementById('btn-arena-subtab-shop');
    if (btnTabShop) {
      btnTabShop.addEventListener('click', () => {
        this.arenaSubTab = 'shop';
        this.render();
      });
    }

    // 挑战天梯角斗对手 (达成主线14)
    this.container.querySelectorAll('.btn-challenge-arena-opp').forEach(btn => {
      btn.addEventListener('click', () => {
        const oppId = btn.getAttribute('data-opp-id');
        const opp = ARENA_OPPONENTS.find(o => o.id === oppId);
        if (!opp) return;

        if ((gameState.data.arena?.challengesLeft ?? 5) <= 0) {
          gameModal.alert('今日 5 次角斗挑战已全额耗尽！明日拂晓早朝重置！', '挑战次数耗尽');
          return;
        }

        this.onOpenBattle({
          enemyData: { name: `【天梯对手】${opp.name}`, icon: opp.avatar },
          enemyStats: { hp: opp.hp, atk: opp.atk, def: opp.def, speed: opp.speed },
          onFinish: (victory) => {
            if (victory) {
              const res = gameState.recordArenaVictory(opp);
              sound.playFanfare();
              if (gameState.data.currentQuestId === 'quest_14') {
                gameModal.confirm(
                  `天梯大捷！战胜【${opp.name}】！天梯积分升至 ${res.points} 点（荣膺【${res.rank}】），获得声望 +${res.prestigeReward}、金币 +${res.goldReward}！\n\n【主线任务达成】天梯角逐 · 威震竞技！\n赏赐：经验 +35000，金币 +70000，魔晶 +400，【远古神兽契约蛋】！\n\n是否立即领受犒赏并开启下一阶段主线【魔塔破界 · 决战飞龙】？`,
                  () => {
                    gameState.claimQuestReward('quest_14');
                    gameModal.alert('犒赏已存入行囊！已为你开启终章主线【魔塔破界 · 决战飞龙】，挺进魔塔第 20 层直面关底恶龙吧！', '主线推进', () => {
                      if (window.switchMainTab) window.switchMainTab('tower');
                    });
                  },
                  () => this.render(),
                  '主线大捷 · 天梯争霸'
                );
              } else {
                gameModal.alert(`天梯大捷！战胜【${opp.name}】！天梯积分升至 ${res.points} 点（荣膺【${res.rank}】），获得声望 +${res.prestigeReward}、金币 +${res.goldReward}！`, '角斗胜利');
              }
            } else {
              gameState.recordArenaDefeat(opp);
              sound.playBlock();
              gameModal.alert(`惜败于【${opp.name}】！胜败乃兵家常事，战损积分 -10，获得安慰声望 +10！`, '角斗受挫');
            }
            this.render();
          }
        });
      });
    });

    // 声望商行兑换
    this.container.querySelectorAll('.btn-buy-prestige-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const shopId = btn.getAttribute('data-shop-id');
        const res = gameState.buyPrestigeItem(shopId);
        if (res.success) {
          sound.playCoin();
        } else {
          sound.playBlock();
        }
        gameModal.alert(res.msg, '声望军需商行');
        this.render();
      });
    });

    // ==========================================
    // 皇家酒馆事件交互
    // ==========================================
    // 讨伐悬赏凶魔
    this.container.querySelectorAll('.btn-fight-bounty').forEach(btn => {
      btn.addEventListener('click', () => {
        const bId = btn.getAttribute('data-bounty-id');
        const bounty = TAVERN_BOUNTIES.find(b => b.id === bId);
        if (!bounty) return;
        if (gameState.data.level < bounty.reqLevel) {
          return gameModal.alert(`勇者等级不足！该悬赏凶魔残暴异常，需达到 Lv.${bounty.reqLevel} 方可接战！`, '悬赏等级限制');
        }

        this.onOpenBattle({
          enemyData: { name: `【悬赏凶魔】${bounty.targetName}`, icon: bounty.avatar },
          enemyStats: { hp: bounty.stats.hp, atk: bounty.stats.atk, def: bounty.stats.def, speed: bounty.stats.speed, crit: bounty.stats.crit, dodge: bounty.stats.dodge },
          onFinish: (victory) => {
            if (victory) {
              gameState.completeBountyBattle(bId);
              sound.playFanfare();
              gameModal.alert(`悬赏讨伐告捷！你已成功斩杀【${bounty.targetName}】！速回王都酒馆悬赏木榜交验首级，领受丰厚赏金！`, '讨伐大捷');
              this.render();
            } else {
              sound.playBlock();
              gameModal.alert(`讨伐受挫！【${bounty.targetName}】凶威滔天，整顿装备与神兽后再行挑战吧！`, '讨伐未成');
            }
          }
        });
      });
    });

    // 揭榜接取悬赏
    this.container.querySelectorAll('.btn-accept-bounty').forEach(btn => {
      btn.addEventListener('click', () => {
        const bId = btn.getAttribute('data-bounty-id');
        const res = gameState.acceptBounty(bId);
        if (res.success) {
          sound.playCoin();
          this.render();
        } else {
          gameModal.alert(res.msg, '接取悬赏提示');
        }
      });
    });

    // 领受悬赏赏金
    this.container.querySelectorAll('.btn-claim-bounty').forEach(btn => {
      btn.addEventListener('click', () => {
        const bId = btn.getAttribute('data-bounty-id');
        const res = gameState.claimBountyReward(bId);
        if (res.success) {
          sound.playCoin();
          gameModal.alert(res.msg, '领受赏金大捷');
          this.render();
        } else {
          gameModal.alert(res.msg, '领赏提示');
        }
      });
    });

    // 吧台点麦酒
    this.container.querySelectorAll('.btn-order-drink').forEach(btn => {
      btn.addEventListener('click', () => {
        const dId = btn.getAttribute('data-drink-id');
        const res = gameState.orderTavernDrink(dId);
        if (res.success) {
          sound.playCoin();
          gameModal.alert(res.msg, '特调酒力通达');
          this.render();
        } else {
          gameModal.alert(res.msg, '点酒提示');
        }
      });
    });

    // 佣兵随行誓约切换
    this.container.querySelectorAll('.btn-tavern-hire-merc').forEach(btn => {
      btn.addEventListener('click', () => {
        const mId = btn.getAttribute('data-merc-id');
        const merc = MERCENARIES.find(m => m.id === mId);
        gameState.data.estate.hiredMercId = mId;
        sound.playCoin();
        gameState.addSystemLog(`【皇家酒馆】与传奇佣兵【${merc?.name}】立下随行誓约！随行光环【${merc?.aura}】生效！`, 'estate');
        gameModal.alert(`随行誓约达成！传奇战友【${merc?.name}】（${merc?.role}）已列入先锋战阵，为你提供【${merc?.aura}】绝强庇护！`, '佣兵誓约');
        this.render();
      });
    });

    // 符文铭刻
    this.container.querySelectorAll('.btn-inscribe-rune').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = btn.getAttribute('data-inscribe-slot');
        const rUid = btn.getAttribute('data-inscribe-rune-id');
        const eq = gameState.data.equipped[slot];
        if (!eq) return gameModal.alert('请先穿戴该部位装备！', '铭刻提示');
        const curGems = eq.gems || [];
        const nextEmptySocketIdx = curGems.findIndex(g => !g);
        const targetIdx = nextEmptySocketIdx !== -1 ? nextEmptySocketIdx : curGems.length;
        if (targetIdx >= (eq.sockets || 0)) {
          return gameModal.alert('该装备孔位已满，无法继续铭刻符文石！', '铭刻受阻');
        }
        const res = gameState.inlayGem(slot, targetIdx, rUid);
        if (res.success) {
          sound.playCoin();
          gameModal.alert(res.msg, '远古神铸铭刻');
          this.render();
        } else {
          gameModal.alert(res.msg, '铭刻提示');
        }
      });
    });

    // 符文摘除
    this.container.querySelectorAll('.btn-remove-rune').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = btn.getAttribute('data-remove-socket-slot');
        const idx = parseInt(btn.getAttribute('data-remove-socket-idx'), 10);
        const res = gameState.removeGem(slot, idx);
        if (res.success) {
          sound.playCoin();
          gameModal.alert(res.msg, '符文石收回');
          this.render();
        } else {
          gameModal.alert(res.msg, '摘除提示');
        }
      });
    });

    // 阵营要塞出征攻城
    this.container.querySelectorAll('.btn-challenge-stronghold').forEach(btn => {
      btn.addEventListener('click', () => {
        const sId = btn.getAttribute('data-stronghold-id');
        const stronghold = STRONGHOLDS.find(s => s.id === sId);
        if (!stronghold) return;
        if (gameState.data.level < stronghold.reqLevel) {
          return gameModal.alert(`勇者等级不足！该要塞驻军凶悍，需达到 Lv.${stronghold.reqLevel} 方可进军攻城！`, '攻城等级限制');
        }

        this.onOpenBattle({
          enemyData: { name: stronghold.defender.name, icon: 'boss_darkangel' },
          enemyStats: { hp: stronghold.defender.hp, atk: stronghold.defender.atk, def: stronghold.defender.def, speed: stronghold.defender.speed, crit: stronghold.defender.crit, dodge: stronghold.defender.dodge },
          onFinish: (victory) => {
            if (victory) {
              const res = gameState.completeStrongholdVictory(sId);
              sound.playFanfare();
              gameModal.alert(`攻城大捷！你已成功攻克【${stronghold.name}】！夺取帝国军勋 +${res.merit}，缴获军饷 +${res.gold} 金币！${res.promoted ? " 阵营军衔荣升为【" + res.promoted.name + "】！" : ""}`, '要塞攻克');
              this.render();
            } else {
              sound.playBlock();
              gameModal.alert('攻城受挫！敌方驻守统领顽强死守，整顿兵马战阵后再行出击吧！', '战术撤退');
            }
          }
        });
      });
    });

    // 领受每日军饷
    const btnClaimSalary = this.container.querySelector('#btn-claim-faction-salary');
    if (btnClaimSalary) {
      btnClaimSalary.addEventListener('click', () => {
        const res = gameState.claimFactionSalary();
        if (res.success) {
          sound.playCoin();
          gameModal.alert(`领受大捷！已发放【${res.rankName}】每日军饷：${res.salary} 金币入国库！`, '军饷领受');
          this.render();
        } else {
          gameModal.alert(res.msg, '军饷提示');
        }
      });
    }

    // 军需官兑换
    this.container.querySelectorAll('.btn-exchange-faction-reward').forEach(btn => {
      btn.addEventListener('click', () => {
        const rId = btn.getAttribute('data-reward-id');
        const res = gameState.exchangeFactionReward(rId);
        if (res.success) {
          sound.playCoin();
          gameModal.alert(res.msg, '军勋兑换大捷');
          this.render();
        } else {
          gameModal.alert(res.msg, '兑换提示');
        }
      });
    });

  }

  // ==========================================
  // 5.5 【远古神铸 · 符文之语工坊】(Smithy Runes Sub-page)
  // ==========================================
  renderSmithyRunes() {
    const item = gameState.data.equipped[this.selectedEquipSlot];
    const curSockets = item ? (item.sockets || 0) : 0;
    const gems = item ? (item.gems || []) : [];
    const activeRw = item && item.runicWord ? RUNIC_WORDS.find(r => r.id === item.runicWord) : null;

    // 行囊中的符文石
    const bagRunes = gameState.data.bag.filter(i => i && (i.type === "rune" || RUNES[i.id]));

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold">皇家铁匠铺</span>
            <span class="text-slate-500">-></span>
            <span class="text-cyan-300 font-bold">远古神铸 · 符文之语铭刻工坊</span>
          </div>
          <button data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回铁匠铺大厅</span>
          </button>
        </div>

        <!-- 主体区域：左右双面板架构 -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2.5">
          
          <!-- 左侧：装备孔位、当前符文与行囊符文 (md:col-span-5) -->
          <div class="md:col-span-5 flex flex-col justify-between bg-black/40 border border-[#4a3520] rounded-xl p-2.5 shadow">
            <div>
              <div class="text-[11px] font-bold text-amber-200 mb-1.5 flex items-center justify-between">
                <span>选择神铸装备部位:</span>
                <span class="text-slate-400 font-normal text-[10px]">支持全身 10 部位</span>
              </div>
              
              <!-- 10槽位网格 -->
              <div class="grid grid-cols-5 gap-1 mb-2">
                ${ITEM_SLOTS.map(slot => {
                  const eq = gameState.data.equipped[slot.id];
                  const isSel = this.selectedEquipSlot === slot.id;
                  const hasRw = eq && eq.runicWord;
                  return `
                    <button data-socket-slot="${slot.id}" class="btn-select-socket-slot p-1 rounded-lg border text-center transition-all ${
                      isSel 
                        ? "border-cyan-400 bg-cyan-950/60 shadow text-cyan-200 font-bold" 
                        : "border-slate-800 bg-black/40 hover:border-slate-600 text-slate-400"
                    }">
                      <div class="text-[10px] truncate">${slot.name}</div>
                      <div class="text-[9px] font-mono ${hasRw ? "text-amber-300 font-bold animate-pulse" : (eq ? "text-emerald-400" : "text-slate-600")}">
                        ${hasRw ? "符语" : (eq ? `${eq.sockets || 0}孔` : "空")}
                      </div>
                    </button>
                  `;
                }).join("")}
              </div>

              <!-- 选中的装备展示与激活的符文之语卡片 -->
              ${item ? `
                <div class="p-2.5 rounded-xl bg-black/50 border ${activeRw ? "border-amber-500 shadow-amber-500/20" : "border-slate-800"} flex items-center gap-2.5 mb-2">
                  <div class="w-11 h-11 rounded-xl bg-cyan-950/40 border border-cyan-500/70 p-1 flex items-center justify-center flex-shrink-0">
                    ${renderGameIcon(item, { size: "w-full h-full" })}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-black text-amber-200 truncate">${item.name}</span>
                      ${activeRw ? `<span class="px-1.5 py-0.2 rounded bg-amber-500/30 border border-amber-500 text-amber-300 text-[10px] font-black">${activeRw.name}</span>` : ""}
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono">
                      孔位: <b class="text-amber-300">${curSockets}</b> 孔 · 符文: <b class="text-cyan-300">${gems.filter(g => g && g.isRune).length}</b> / ${curSockets}
                    </div>
                    ${activeRw ? `<div class="text-[10px] text-amber-300 mt-0.5 leading-tight">${activeRw.desc}</div>` : ""}
                  </div>
                </div>

                <!-- 宝石/符文孔位展示与铭刻/摘除 -->
                <div class="space-y-1.5 mb-2">
                  <div class="text-[10px] font-bold text-slate-300">当前装备孔位 (${gems.filter(Boolean).length}/${curSockets}):</div>
                  ${curSockets === 0 ? `
                    <div class="p-2 rounded-lg bg-black/50 border border-slate-800 text-center text-[10px] text-slate-500">
                      该装备尚未开启宝石孔，请先前往【宝石工坊】开孔！
                    </div>
                  ` : `
                    <div class="grid grid-cols-2 gap-1.5">
                      ${Array.from({ length: curSockets }).map((_, idx) => {
                        const g = gems[idx];
                        return `
                          <div class="p-1.5 rounded-lg bg-black/60 border ${g ? (g.isRune ? "border-cyan-500/60" : "border-amber-600/60") : "border-dashed border-slate-700"} flex items-center justify-between">
                            <div class="flex items-center gap-1.5 min-w-0">
                              <div class="w-6 h-6 rounded bg-black/80 p-0.5 flex items-center justify-center flex-shrink-0">
                                ${g ? renderGameIcon(g, { size: "w-full h-full" }) : '<span class="text-[10px] text-slate-600">空</span>'}
                              </div>
                              <div class="min-w-0">
                                <div class="text-[10px] font-bold ${g ? (g.isRune ? "text-cyan-300" : "text-amber-200") : "text-slate-500"} truncate">
                                  ${g ? g.name : `第 ${idx + 1} 孔 (空)`}
                                </div>
                              </div>
                            </div>
                            ${g ? `
                              <button data-remove-socket-slot="${this.selectedEquipSlot}" data-remove-socket-idx="${idx}" class="btn-remove-rune px-1.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-600 text-rose-300 text-[9px] flex-shrink-0">
                                取下
                              </button>
                            ` : ""}
                          </div>
                        `;
                      }).join("")}
                    </div>
                  `}
                </div>
              ` : `
                <div class="p-6 text-center text-slate-500 text-xs">请先在上方点选要铭刻神铸符文的装备部位！</div>
              `}
            </div>

            <!-- 底部：行囊中的远古符文石 -->
            <div class="pt-2 border-t border-[#4a3520]">
              <div class="text-[10px] font-bold text-cyan-300 mb-1 flex items-center justify-between">
                <span>行囊中的符文石 (${bagRunes.length} 种):</span>
                <span class="text-[9px] text-slate-400">点击铭刻至首个空孔</span>
              </div>
              ${bagRunes.length === 0 ? `
                <div class="p-2 rounded-lg bg-black/40 border border-slate-800 text-center text-[10px] text-slate-500">
                  行囊中暂无符文石，可通过深渊魔塔破界或阵营战军勋开启宝匣获取！
                </div>
              ` : `
                <div class="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  ${bagRunes.map(r => `
                    <div class="p-1.5 rounded-lg bg-black/60 border border-cyan-800/60 flex items-center justify-between">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <div class="w-6 h-6 rounded bg-black/80 p-0.5 flex items-center justify-center flex-shrink-0">
                          ${renderGameIcon(r, { size: "w-full h-full" })}
                        </div>
                        <div class="min-w-0">
                          <div class="text-[10px] font-bold text-cyan-200 truncate">${r.name}</div>
                          <div class="text-[8px] text-slate-400 font-mono">拥有: ${r.count || 1}</div>
                        </div>
                      </div>
                      <button data-inscribe-slot="${this.selectedEquipSlot}" data-inscribe-rune-id="${r.uid || r.id}" class="btn-inscribe-rune px-1.5 py-0.5 rounded mota-btn-gold text-[9px] font-bold flex-shrink-0">
                        铭刻
                      </button>
                    </div>
                  `).join("")}
                </div>
              `}
            </div>
          </div>

          <!-- 右侧：远古符文之语配方圣典 (md:col-span-7) -->
          <div class="md:col-span-7 flex flex-col justify-between bg-black/40 border border-[#4a3520] rounded-xl p-2.5 shadow">
            <div>
              <div class="flex items-center justify-between pb-1.5 border-b border-[#4a3520] mb-2">
                <div class="flex items-center gap-1.5">
                  <span class="w-5 h-5 flex items-center justify-center">${getVectorIcon("rune_stone", "w-5 h-5")}</span>
                  <h3 class="font-bold text-xs text-amber-300">远古符文之语配方圣典</h3>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">按指定序列镶嵌符文石即可觉醒</span>
              </div>

              <!-- 7大符文之语卡片列表 -->
              <div class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                ${RUNIC_WORDS.map(rw => {
                  const isCurrentActive = activeRw && activeRw.id === rw.id;
                  const validSlotsText = rw.validSlots.map(s => {
                    const found = ITEM_SLOTS.find(sl => sl.id === s);
                    return found ? found.name : s;
                  }).join(" / ");
                  return `
                    <div class="p-2 rounded-xl bg-black/60 border ${isCurrentActive ? "border-amber-400 bg-amber-950/30 shadow" : "border-slate-800"} transition-all">
                      <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-black ${isCurrentActive ? "text-amber-300" : "text-cyan-200"}">${rw.name}</span>
                          ${isCurrentActive ? '<span class="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black animate-pulse">当前生效中</span>' : ""}
                        </div>
                        <span class="text-[9px] text-slate-400 font-mono">适用部位: <b class="text-amber-200">${validSlotsText}</b></span>
                      </div>
                      <div class="mt-1.5 flex items-center gap-2">
                        <div class="text-[10px] text-slate-400 font-mono">所需符文序列:</div>
                        <div class="flex items-center gap-1">
                          ${rw.runes.map(rId => {
                            const rCfg = RUNES[rId];
                            return `
                              <span class="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-600/70 text-cyan-300 text-[9px] font-bold">
                                ${rCfg ? rCfg.name.split("·")[1] || rCfg.name : rId}
                              </span>
                            `;
                          }).join('<span class="text-slate-500 text-[10px]">+</span>')}
                        </div>
                      </div>
                      <div class="mt-1 text-[10px] text-amber-300/90 leading-relaxed bg-black/40 p-1.5 rounded-lg border border-slate-800">
                        ${rw.desc}
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>

            <div class="pt-2 border-t border-[#4a3520] flex items-center justify-between text-[10px] text-slate-400">
              <span>注：符文之语必须按配方严格顺序铭刻，孔数必须满足要求。</span>
              <span class="text-cyan-300 font-mono">随时可无损取下符文重新组合</span>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 6. 【边境战场 · 三大阵营要塞争夺战】(Faction War Sub-page)
  // ==========================================
  renderFactionWar() {
    const data = gameState.data;
    const fw = data.factionWar || { merit: 0, militaryRank: "recruit", strongholds: {}, dailyClaimed: false };
    const curRank = MILITARY_RANKS.find(r => r.id === fw.militaryRank) || MILITARY_RANKS[0];
    const nation = NATIONS[data.nation] || NATIONS.aden;

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑与顶部状态 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-indigo-300 font-bold">边境战场 · 三大城邦要塞争夺战</span>
          </div>
          <button data-goto="hub" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王都大街</span>
          </button>
        </div>

        <!-- 阵营与军衔统帅横幅 -->
        <div class="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/60 mb-2 flex flex-wrap items-center justify-between gap-2 shadow flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-black/60 border border-indigo-400 p-1 flex items-center justify-center flex-shrink-0">
              ${getVectorIcon(data.nation ? `nation_${data.nation}` : "nation_aden", "w-full h-full")}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-indigo-200">阵营: ${nation.name}</span>
                <span class="px-2 py-0.2 rounded bg-amber-500/20 border border-amber-500/60 text-amber-300 text-[10px] font-bold">
                  军衔: ${curRank.name}
                </span>
              </div>
              <div class="text-[10px] text-slate-300 font-mono mt-0.5">
                军衔特质: <b class="text-amber-300">${curRank.buffDesc}</b> · 阵营天命: ${nation.buffDesc}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-right font-mono text-xs">
              <div class="text-slate-400 text-[10px]">当前帝国军勋</div>
              <div class="text-amber-400 font-bold text-sm">${fw.merit || 0} 点</div>
            </div>
            <button id="btn-claim-faction-salary" class="mota-btn-gold px-3 py-1.5 rounded-lg text-xs font-bold shadow ${fw.dailyClaimed ? "opacity-40 cursor-not-allowed" : ""}">
              ${fw.dailyClaimed ? "今日军饷已领" : `领受军饷 (${curRank.dailySalary}金)`}
            </button>
          </div>
        </div>

        <!-- 主体区域：左右双架构 (左侧3大要塞沙盘 + 右侧军勋战备军需官) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2.5">
          
          <!-- 左侧：三大要塞战略攻防沙盘 (md:col-span-7) -->
          <div class="md:col-span-7 flex flex-col justify-between bg-black/40 border border-indigo-900/60 rounded-xl p-2.5 shadow">
            <div>
              <div class="flex items-center justify-between pb-1.5 border-b border-[#4a3520] mb-2">
                <div class="flex items-center gap-1.5">
                  <span class="w-5 h-5 flex items-center justify-center">${getVectorIcon("bld_palace", "w-5 h-5")}</span>
                  <h3 class="font-bold text-xs text-amber-300">边境三大战略要塞要冲</h3>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">攻克敌方据点夺取帝国军勋</span>
              </div>

              <!-- 3大要塞卡片 -->
              <div class="space-y-2.5">
                ${STRONGHOLDS.map(s => {
                  const shState = fw.strongholds && fw.strongholds[s.id] ? fw.strongholds[s.id] : { captured: false };
                  const isCaptured = shState.captured;
                  const isLevelMet = data.level >= s.reqLevel;
                  return `
                    <div class="p-2.5 rounded-xl bg-black/60 border ${isCaptured ? "border-emerald-600/70 bg-emerald-950/20" : "border-slate-800 hover:border-indigo-500/50"} transition-all flex flex-col justify-between">
                      <div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <div class="flex items-center gap-2">
                          <div class="w-8 h-8 rounded-lg bg-black/80 border border-slate-700 p-1 flex items-center justify-center flex-shrink-0">
                            ${getVectorIcon(s.icon ? s.icon.replace("images/ui/", "").replace(".svg", "") : "nation_aden", "w-full h-full")}
                          </div>
                          <div>
                            <div class="flex items-center gap-1.5">
                              <span class="text-xs font-black text-amber-200">${s.name}</span>
                              <span class="text-[9px] text-indigo-300 font-mono">(${s.title})</span>
                              ${isCaptured ? '<span class="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500 text-[9px] font-bold">[已攻克]</span>' : ""}
                            </div>
                            <div class="text-[9px] text-slate-400">${s.desc}</div>
                          </div>
                        </div>
                        <span class="text-[10px] font-mono ${isLevelMet ? "text-emerald-400" : "text-rose-400"}">
                          准入: Lv.${s.reqLevel}
                        </span>
                      </div>

                      <div class="mt-2 flex items-center justify-between">
                        <div class="text-[10px] text-slate-300 font-mono">
                          驻守敌统帅: <b class="text-rose-300">${s.defender.name}</b> (HP: ${s.defender.hp.toLocaleString()})
                          <br>攻克战利品: <span class="text-amber-300">军勋 +${s.meritReward}</span> · <span class="text-amber-200">金币 +${s.goldReward.toLocaleString()}</span>
                        </div>
                        <button data-stronghold-id="${s.id}" class="btn-challenge-stronghold px-3 py-1.5 rounded-lg text-xs font-bold shadow ${isCaptured ? "mota-btn-dark border border-emerald-600/70 text-emerald-300" : (isLevelMet ? "mota-btn-gold" : "opacity-40 cursor-not-allowed bg-slate-800 text-slate-500")} flex-shrink-0">
                          ${isCaptured ? "再度破关" : (isLevelMet ? "出征攻城 ->" : `需Lv.${s.reqLevel}`)}
                        </button>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>

            <div class="pt-2 border-t border-[#4a3520] text-[10px] text-slate-400 flex items-center justify-between">
              <span>每日攻占据点可稳步累计战勋，战败无任何惩罚。</span>
              <span class="text-amber-300 font-mono">军勋可随时前往军需官处兑换圣物</span>
            </div>
          </div>

          <!-- 右侧：战备军需官 · 军勋圣物兑换 (md:col-span-5) -->
          <div class="md:col-span-5 flex flex-col justify-between bg-black/40 border border-indigo-900/60 rounded-xl p-2.5 shadow">
            <div>
              <div class="flex items-center justify-between pb-1.5 border-b border-[#4a3520] mb-2">
                <div class="flex items-center gap-1.5">
                  <span class="w-5 h-5 flex items-center justify-center">${getVectorIcon("coin_gold", "w-5 h-5")}</span>
                  <h3 class="font-bold text-xs text-amber-300">战备军需官 · 军勋兑换</h3>
                </div>
                <span class="text-[10px] text-amber-400 font-mono">结余军勋: ${fw.merit || 0}</span>
              </div>

              <!-- 兑换物品列表 -->
              <div class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                ${FACTION_REWARDS.map(rw => {
                  const canAfford = (fw.merit || 0) >= rw.costMerit;
                  return `
                    <div class="p-2 rounded-xl bg-black/60 border border-slate-800 flex items-center justify-between hover:border-amber-500/50 transition-all">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-black/80 border border-slate-700 p-1 flex items-center justify-center flex-shrink-0">
                          ${renderGameIcon(rw, { size: "w-full h-full" })}
                        </div>
                        <div class="min-w-0">
                          <div class="text-xs font-bold text-amber-200 truncate">${rw.name}</div>
                          <div class="text-[9px] text-slate-400 truncate">${rw.desc}</div>
                          <div class="text-[10px] text-amber-400 font-mono font-bold mt-0.5">消耗军勋: ${rw.costMerit} 点</div>
                        </div>
                      </div>
                      <button data-reward-id="${rw.id}" class="btn-exchange-faction-reward px-2.5 py-1.5 rounded-lg text-xs font-bold shadow ${canAfford ? "mota-btn-gold" : "opacity-40 cursor-not-allowed bg-slate-800 text-slate-500"} flex-shrink-0">
                        兑换
                      </button>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>

            <div class="pt-2 border-t border-[#4a3520] text-[10px] text-slate-400 text-center">
              军勋永不清空，随着击破要塞与日常战事稳步增长。
            </div>
          </div>

        </div>

      </div>
    `;
  }

}
