// 远古神兽系统视图：100% 还原《魔塔世界》百度百科原著
// 涵盖：22 种神兽图鉴、真实特性（连击、祝福、偷袭、复活、假死等）、体力喂食机制、进化石与天命石进阶、打书
import { gameState } from '../core/state.js';
import { PET_CONFIGS, PET_TIERS } from '../config/pets.js';
import { PET_SKILL_BOOKS } from '../config/petSkills.js';
import { SPECIAL_ITEMS } from '../config/items.js';
import { renderGameIcon } from './iconHelper.js';
import { sound } from '../core/sound.js';
import { gameModal } from './modal.js';

export class PetView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.selectedPetId = null;
    this.currentSubTab = 'overview'; // 'overview' | 'wash' | 'skills'
  }

  render() {
    const data = gameState.data;
    const ownedPets = data.pets;
    if (!this.selectedPetId && ownedPets.length > 0) {
      this.selectedPetId = data.activePetId || ownedPets[0].id;
    }

    const selectedConf = this.selectedPetId ? PET_CONFIGS[this.selectedPetId] : null;
    const selectedOwned = this.selectedPetId ? ownedPets.find(p => p.id === this.selectedPetId) : null;

    this.container.innerHTML = `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        <!-- 顶部面包屑导航与子玩法切换 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-1.5 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-200 font-bold text-xs">【宠物】</span>
          </div>

          <div class="flex items-center gap-1.5 text-xs">
            <button id="pet-subtab-overview" class="px-2.5 py-0.5 rounded font-bold text-xs transition-all ${this.currentSubTab === 'overview' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'}">
              契约与喂养
            </button>
            <button id="pet-subtab-wash" class="px-2.5 py-0.5 rounded font-bold text-xs transition-all ${this.currentSubTab === 'wash' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'}">
              重铸与突破
            </button>
            <button id="pet-subtab-skills" class="px-2.5 py-0.5 rounded font-bold text-xs transition-all ${this.currentSubTab === 'skills' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'}">
              神技打书
            </button>
            <button id="pet-subtab-compendium" class="px-2.5 py-0.5 rounded font-bold text-xs transition-all ${this.currentSubTab === 'compendium' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'}">
              22神兽图鉴
            </button>
            <button id="btn-hatch-egg" class="mota-btn-gold px-2.5 py-0.5 rounded font-bold text-xs shadow text-amber-100 flex items-center gap-1 border-amber-400/80">
              <span>孵化神兽蛋</span>
            </button>
          </div>
        </div>

        <!-- 已缔约神兽槽位横条 (紧凑展示) -->
        <div class="mota-parchment-panel px-2 py-1 rounded-xl border border-[#caa048] mb-1.5 flex-shrink-0">
          <div class="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
            ${ownedPets.map(p => {
              const conf = PET_CONFIGS[p.id] || { name: '未知神兽', color: '#fff' };
              const isSelected = this.selectedPetId === p.id;
              const isActive = data.activePetId === p.id;
              const stamina = p.stamina !== undefined ? p.stamina : 100;
              const isExhausted = stamina < 60;

              return `
                <div data-pet-id="${p.id}" class="pet-select-card flex-shrink-0 px-2 py-1 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                  isSelected ? 'bg-amber-950/90 border-[#f5c042] shadow-sm' : 'bg-black/60 border-slate-700 hover:border-slate-500'
                }">
                  <div class="w-7 h-7 rounded bg-black/60 border border-slate-700 flex items-center justify-center p-0.5 relative flex-shrink-0">
                    ${renderGameIcon(conf.id || p.id, { size: 'w-full h-full' })}
                    ${isActive ? '<span class="absolute -top-1.5 -right-1 text-[8px] bg-red-600 text-white font-bold px-1 rounded-full leading-tight">出战</span>' : ''}
                  </div>
                  <div class="leading-tight">
                    <div class="flex items-center gap-1">
                      <span class="font-bold text-[11px] text-amber-200">${conf.name}</span>
                      <span class="text-[9px] px-1 py-0.2 rounded font-mono ${p.tier === 'purplegold' ? 'bg-purple-900 text-purple-200' : p.tier === 'darkgold' ? 'bg-orange-950 text-orange-300' : 'bg-amber-950 text-amber-300'}">
                        ${p.tier === 'purplegold' ? '紫金' : p.tier === 'darkgold' ? '暗金' : '黄金'}
                      </span>
                    </div>
                    <div class="text-[10px] flex items-center gap-1.5 text-slate-400">
                      <span>Lv.${p.level}</span>
                      <span class="${isExhausted ? 'text-red-400 font-bold' : 'text-green-400'} font-mono">体:${stamina}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 详细面板主体 (自适应全屏无滚条) -->
        <div id="pet-panel-body" class="flex-1 min-h-0">
          ${this.renderSubTab(selectedOwned, selectedConf)}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderSubTab(owned, conf) {
    if (this.currentSubTab === 'compendium') {
      return this.renderCompendium();
    }

    if (!owned || !conf) {
      return `
        <div class="mota-parchment-panel rounded-xl p-8 text-center text-slate-400 text-xs">
          你尚未缔约任何神兽，请点击右上角【孵化神兽蛋】唤醒你的初代神兽！
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

  // 4. 22 种神兽全景图鉴
  renderCompendium() {
    const data = gameState.data;
    const ownedIds = new Set(data.pets.map(p => p.id));
    const allPets = Object.values(PET_CONFIGS);

    return `
      <div class="h-full mota-parchment-panel rounded-xl p-3.5 sm:p-4 border-2 border-[#caa048] flex flex-col justify-between select-none">
        <div class="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2 flex-shrink-0">
          <div class="flex items-center gap-2">
            <h4 class="font-black text-sm text-amber-300">亚诺大陆 · 22 远古原著神兽图鉴大全</h4>
          </div>
          <span class="text-xs text-slate-400 font-mono">已缔约: <b class="text-amber-300 font-bold">${ownedIds.size}</b> / ${allPets.length} 种</span>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2.5 pr-1 custom-scrollbar">
          ${allPets.map(p => {
            const isOwned = ownedIds.has(p.id);
            return `
              <div class="p-2.5 rounded-xl border ${isOwned ? 'bg-amber-950/30 border-amber-500/80 shadow' : 'bg-black/40 border-slate-800/80 opacity-75'} flex items-center gap-3">
                <div class="relative w-12 h-12 rounded-xl bg-black/80 border-2 ${isOwned ? 'border-amber-400' : 'border-slate-700'} flex items-center justify-center p-1 flex-shrink-0">
                  ${renderGameIcon(p.id, { size: 'w-full h-full' })}
                  ${isOwned ? '<span class="absolute -top-1.5 -right-1 text-[8px] bg-emerald-600 text-white font-bold px-1 rounded-full">已得</span>' : ''}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                      <span class="font-black text-xs ${isOwned ? 'text-amber-200' : 'text-slate-300'}">${p.name}</span>
                      <span class="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 font-mono">
                        准入: Lv.${p.minLevel}
                      </span>
                    </div>
                    <span class="text-[10px] font-bold text-amber-400 font-mono">
                      【${p.traitName}】
                    </span>
                  </div>
                  <div class="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    ${p.traitDesc}
                  </div>
                  <div class="flex items-center gap-2 text-[9px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-800/60">
                    <span>力:${p.defaultApt.str}</span>
                    <span>智:${p.defaultApt.int}</span>
                    <span>敏:${p.defaultApt.dex}</span>
                    <span>体:${p.defaultApt.con}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="p-2 bg-black/40 border-t border-slate-700/80 text-[10px] text-slate-400 flex items-center justify-between flex-shrink-0 mt-2">
          <span>神兽蛋可随机孵化远古神兽 · 黄金/暗金/紫金阶位突破大幅提升资质上限</span>
          <span class="text-amber-300/80 font-mono">魔塔世界正统神兽</span>
        </div>
      </div>
    `;
  }

  // 1. 契约出战与喂养
  renderOverview(owned, conf) {
    const data = gameState.data;
    const isActive = data.activePetId === owned.id;
    const stamina = owned.stamina !== undefined ? owned.stamina : 100;
    const isExhausted = stamina < 60;
    const foodCount = data.bag.find(i => i.id === 'pet_food')?.count || 0;

    return `
      <div class="h-full grid grid-cols-1 md:grid-cols-12 gap-3">
        <!-- 左侧立绘与特性 -->
        <div class="md:col-span-5 mota-parchment-panel rounded-xl p-3.5 border-2 border-[#caa048] flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-center gap-3 border-b border-slate-700/80 pb-2.5">
              <div class="relative w-12 h-12 rounded-xl bg-black/80 border-2 border-amber-500/70 flex items-center justify-center flex-shrink-0 mota-slot-socket shadow-inner p-1">
                ${renderGameIcon(conf.id || owned.id, { size: 'w-full h-full' })}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-black text-sm text-amber-300 truncate">${conf.name}</h3>
                  <span class="text-[10px] px-1.5 py-0.2 rounded font-mono ${owned.tier === 'purplegold' ? 'bg-purple-900 text-purple-200' : owned.tier === 'darkgold' ? 'bg-orange-950 text-orange-300' : 'bg-amber-950 text-amber-300'}">
                    ${owned.tier === 'purplegold' ? '紫金神兽' : owned.tier === 'darkgold' ? '暗金神宠' : '黄金初灵'}
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">门槛: Lv.${conf.minLevel} · 原著正统神兽</div>
              </div>
            </div>

            <!-- 体力状态与喂食 -->
            <div class="space-y-1.5 p-2 rounded-lg bg-black/40 border ${isExhausted ? 'border-red-500/80' : 'border-slate-800/80'}">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold ${isExhausted ? 'text-red-400' : 'text-slate-300'}">神兽体力值</span>
                <span class="font-mono font-bold ${isExhausted ? 'text-red-400' : 'text-green-400'}">${stamina} / 100</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="h-full transition-all duration-300 ${isExhausted ? 'bg-red-500' : 'bg-green-500'}" style="width: ${stamina}%"></div>
              </div>
              <div class="flex items-center justify-between pt-1 text-[11px]">
                <span class="text-slate-400">魔兽肉排存量: <b class="text-amber-300 font-mono">${foodCount}</b></span>
                <button id="btn-feed-pet" class="mota-btn-dark px-2.5 py-1 rounded text-xs border border-green-600 text-green-300 ${foodCount > 0 ? '' : 'opacity-50'}">
                  喂食 (+35)
                </button>
              </div>
            </div>

            <!-- 原著特性卡 -->
            <div class="p-2.5 rounded-lg bg-amber-950/30 border border-amber-600/40 text-xs">
              <div class="font-bold text-amber-300 mb-1 flex items-center gap-1">
                <span>专属特性：【${conf.traitName}】</span>
              </div>
              <p class="text-slate-300 leading-relaxed text-[11px]">${conf.traitDesc}</p>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-700/80 mt-2">
            <button id="btn-toggle-active-pet" class="w-full mota-btn-gold py-2 rounded-lg text-xs font-black">
              ${isActive ? '当前随行出战中' : '设为随行出战主宠'}
            </button>
          </div>
        </div>

        <!-- 右侧四维资质与成长 -->
        <div class="md:col-span-7 mota-parchment-panel rounded-xl p-3.5 border-2 border-[#caa048] flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <span class="text-xs font-bold text-amber-300">神兽四维天资上限 (重铸可刷新)</span>
              <span class="text-[11px] font-mono text-cyan-400">品阶资质: ${owned.tier === 'purplegold' ? '紫金极品' : owned.tier === 'darkgold' ? '暗金神圣' : '黄金初级'}</span>
            </div>

            <div class="grid grid-cols-2 gap-2.5 text-xs">
              <div class="p-3 rounded-xl bg-black/40 border border-slate-800/80">
                <div class="text-[11px] text-slate-400">力量天资 (物攻)</div>
                <div class="text-lg font-black text-red-400 font-mono mt-1">${owned.apt.str}</div>
              </div>
              <div class="p-3 rounded-xl bg-black/40 border border-slate-800/80">
                <div class="text-[11px] text-slate-400">智力天资 (法防)</div>
                <div class="text-lg font-black text-blue-400 font-mono mt-1">${owned.apt.int}</div>
              </div>
              <div class="p-3 rounded-xl bg-black/40 border border-slate-800/80">
                <div class="text-[11px] text-slate-400">敏捷天资 (速度)</div>
                <div class="text-lg font-black text-green-400 font-mono mt-1">${owned.apt.dex}</div>
              </div>
              <div class="p-3 rounded-xl bg-black/40 border border-slate-800/80">
                <div class="text-[11px] text-slate-400">体质天资 (生命)</div>
                <div class="text-lg font-black text-amber-400 font-mono mt-1">${owned.apt.con}</div>
              </div>
            </div>
          </div>

          <div class="p-2.5 bg-black/40 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>远古神兽契约已缔结</span>
            <span class="text-amber-300 font-mono">状态：良好</span>
          </div>
        </div>
      </div>
    `;
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
              消耗远古重铸灵药，重新随机重铸神兽的四维天生资质，突破战斗上限！
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
              • 40级暗金宠 + 天命石 -> 终极觉醒为【紫金传奇圣兽】(资质上限升至6000)
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
                <div class="p-2 rounded-xl border text-center flex flex-col items-center justify-center h-18 ${
                  bookConf ? 'bg-amber-950/70 border-[#f5c042]' : 'bg-black/40 border-slate-800 text-slate-600'
                }">
                  <div class="mb-1 flex items-center justify-center">
                    ${bookConf ? renderGameIcon(bookConf.id || 'book_crit', { size: 'w-6 h-6' }) : '<div class="w-6 h-6 rounded border border-dashed border-slate-600 flex items-center justify-center text-slate-600 text-xs font-mono">-</div>'}
                  </div>
                  <div class="text-xs font-bold truncate w-full ${bookConf ? 'text-amber-200' : 'text-slate-600'}">
                    ${bookConf ? bookConf.skillName : `槽位 #${idx + 1}`}
                  </div>
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
                行囊中暂无远古魔导书，可通过主线任务奖励或屠龙掉落获得！
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 切换子标签
    ['overview', 'wash', 'skills', 'compendium'].forEach(tab => {
      const btn = document.getElementById(`pet-subtab-${tab}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.currentSubTab = tab;
          sound.playSlash();
          this.render();
        });
      }
    });

    // 选中宠物
    document.querySelectorAll('.pet-select-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-pet-id');
        this.selectedPetId = id;
        sound.playSlash();
        this.render();
      });
    });

    // 设为出战 (达成主线3)
    const btnActive = document.getElementById('btn-toggle-active-pet');
    if (btnActive) {
      btnActive.addEventListener('click', () => {
        gameState.data.activePetId = this.selectedPetId;
        sound.playFanfare();
        gameState.triggerQuestAction('set_active_pet');
        if (gameState.data.currentQuestId === 'quest_3') {
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
        gameModal.alert(`成功将【${PET_CONFIGS[this.selectedPetId]?.name}】设为主宠随行出战！`, '主宠出战');
        gameState.notify();
        this.render();
      });
    }

    // 喂食魔能兽肉排
    const btnFeed = document.getElementById('btn-feed-pet');
    if (btnFeed) {
      btnFeed.addEventListener('click', () => {
        const res = gameState.feedPet(this.selectedPetId);
        if (res.success) sound.playCoin();
        gameModal.alert(res.msg, '神兽喂养');
        this.render();
      });
    }

    // 潜能重铸 (达成主线4)
    const btnWash = document.getElementById('btn-do-wash-apt');
    if (btnWash) {
      btnWash.addEventListener('click', () => {
        const pet = gameState.data.pets.find(p => p.id === this.selectedPetId);
        if (!pet) return;
        const pill = gameState.data.bag.find(i => i.id === 'pill_reborn' && i.count > 0);
        if (!pill) return gameModal.alert('缺少【远古重铸灵药】！可由主线任务或副本掉落获得！', '重铸材料不足');

        pill.count--;
        if (pill.count <= 0) gameState.data.bag = gameState.data.bag.filter(i => i !== pill);

        const base = pet.tier === 'purplegold' ? 2500 : pet.tier === 'darkgold' ? 1800 : 1200;
        pet.apt.str = base + Math.floor(Math.random() * 600);
        pet.apt.int = base + Math.floor(Math.random() * 600);
        pet.apt.dex = base + Math.floor(Math.random() * 600);
        pet.apt.con = base + Math.floor(Math.random() * 600);

        sound.playCoin();
        gameState.triggerQuestAction('wash_pet');
        gameState.addSystemLog(`【神兽】本命神兽【${pet.name}】潜能重铸大吉！四维天资突破提升！`, 'pet');

        if (gameState.data.currentQuestId === 'quest_4') {
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
    const btnHatch = document.getElementById('btn-hatch-egg');
    if (btnHatch) {
      btnHatch.addEventListener('click', () => {
        const allKeys = Object.keys(PET_CONFIGS);
        const unowned = allKeys.filter(k => !gameState.data.pets.some(p => p.id === k));
        const pickKey = unowned.length > 0 ? unowned[Math.floor(Math.random() * unowned.length)] : allKeys[Math.floor(Math.random() * allKeys.length)];
        const cfg = PET_CONFIGS[pickKey];

        gameState.data.pets.push({
          id: pickKey,
          level: 1,
          exp: 0,
          tier: cfg.defaultTier || 'gold',
          stamina: 100,
          apt: { ...cfg.defaultApt },
          skills: []
        });

        sound.playFanfare();
        gameState.addSystemLog(`【神兽】灵光迸发！破壳孵化出全新神兽【${cfg.name}】！`, 'pet');
        gameModal.alert(`灵光迸发！成功破壳孵化出全新神兽【${cfg.name}】！激活特性【${cfg.traitName}】！`, '神兽破壳诞生');
        this.selectedPetId = pickKey;
        gameState.notify();
        this.render();
      });
    }

    // 打书学习 (达成主线5)
    document.querySelectorAll('.btn-learn-skill').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookId = btn.getAttribute('data-book-id');
        const pet = gameState.data.pets.find(p => p.id === this.selectedPetId);
        if (!pet) return;
        if (!pet.skills) pet.skills = [];
        if (pet.skills.length >= 4) return gameModal.alert('技能槽已满 4 格！无法打入更多魔导书！', '技能槽已满');

        pet.skills.push(bookId);
        const bookItem = gameState.data.bag.find(i => (i.id === bookId || i.bookId === bookId));
        const bookName = bookItem ? bookItem.name : bookId;
        if (bookItem) {
          if (bookItem.count > 1) {
            bookItem.count--;
          } else {
            gameState.data.bag = gameState.data.bag.filter(i => i !== bookItem);
          }
        }

        sound.playFanfare();
        gameState.triggerQuestAction('learn_skill');
        gameState.addSystemLog(`【神兽】本命神兽【${pet.name}】领悟神技【${bookName}】！`, 'pet');

        if (gameState.data.currentQuestId === 'quest_5') {
          gameModal.confirm(
            `研习魔典成功！神兽参透了魔导书，技能打入成功！\n\n【主线任务达成】研读魔典 · 神宠打书！\n奖赏：经验 +2000，金币 +3500，魔晶 +60，【龙血草】x8，【星光苔藓】x8！\n\n是否立即领受犒赏并开启下一阶段主线【初试锋芒 · 踏入魔塔】？`,
            () => {
              gameState.claimQuestReward('quest_5');
              gameModal.alert('大量珍贵草药已存入行囊！已为你开启下一阶段主线【初试锋芒 · 踏入魔塔】，向着魔塔第 1 层进军吧！', '主线推进', () => {
                if (window.switchMainTab) window.switchMainTab('tower');
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
