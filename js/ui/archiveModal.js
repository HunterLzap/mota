// 2011 经典页游纯正羊皮纸【圣堂档案馆 · 存档管理系统】
// 支持 5 大独立槽位存储、读取、覆盖、删除、当前槽位标识与新开游戏无缝流转
import { storage, TOTAL_SLOTS } from '../core/storage.js';
import { gameState } from '../core/state.js';
import { CLASSES, NATIONS } from '../config/classes.js';
import { gameModal } from './modal.js';
import { renderGameIcon } from './iconHelper.js';

export class ArchiveModal {
  constructor(overlayId, onGameReload = null, onStartNewGame = null) {
    this.overlay = document.getElementById(overlayId);
    this.onGameReload = onGameReload;
    this.onStartNewGame = onStartNewGame;
  }

  open() {
    if (!this.overlay) return;
    this.render();
    this.overlay.classList.remove('hidden');
    this.overlay.classList.add('flex');
  }

  close() {
    if (!this.overlay) return;
    this.overlay.classList.add('hidden');
    this.overlay.classList.remove('flex');
  }

  render() {
    if (!this.overlay) return;

    const slots = storage.getAllSlots();
    const activeSlotId = storage.getActiveSlotId();

    this.overlay.innerHTML = `
      <div class="relative w-full max-w-4xl mota-parchment-panel rounded-2xl border-2 border-[#caa048] p-5 shadow-2xl flex flex-col justify-between max-h-[92vh] overflow-hidden select-none">
        
        <!-- 档案馆顶部卷轴标头 -->
        <div class="flex items-center justify-between border-b-2 border-[#caa048] pb-3 flex-shrink-0">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-full bg-red-800 border border-amber-400 flex items-center justify-center text-xs font-bold text-amber-200 shadow">
              档案
            </span>
            <div>
              <h2 class="text-base font-black text-[#f5c042] tracking-wider flex items-center gap-2">
                <span>圣堂档案馆 · 冒险进度宝典</span>
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 font-mono">
                  当前槽位: 存档 ${activeSlotId}
                </span>
              </h2>
              <p class="text-xs text-slate-300">亚诺大陆圣堂石刻永存你的每段传奇！随时存档、读取或开启全新勇者冒险！</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-modal-new-game" class="mota-btn-gold px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md border-amber-300">
              <span>新开游戏</span>
            </button>
            <button id="btn-close-archive-modal" class="mota-btn-dark px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white">
              关闭
            </button>
          </div>
        </div>

        <!-- 5 大槽位展示区 (可纵向滚动的卷轴列表) -->
        <div class="my-3 flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1.5">
          ${slots.map(s => {
            const isActive = s.isActive;
            const isEmpty = s.isEmpty;
            const meta = s.meta || {};
            const cls = CLASSES[meta.classId] || CLASSES.warrior;
            const nation = NATIONS[meta.nation] || NATIONS.aden;

            return `
              <div class="p-3 rounded-xl border transition-all ${isActive 
                ? 'bg-amber-950/40 border-amber-400/90 shadow-[0_0_15px_rgba(245,192,66,0.25)]' 
                : 'bg-black/50 border-[#5a4229]/80 hover:border-amber-600/60'}">
                
                <div class="flex flex-wrap items-center justify-between gap-2">
                  
                  <!-- 槽位标识与角色简报 -->
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center border ${isActive ? 'bg-amber-500/20 border-amber-400' : 'bg-black/60 border-slate-700'}">
                      ${isEmpty ? renderGameIcon('item_empty', { size: 'w-6 h-6' }) : renderGameIcon(cls.id || 'warrior', { size: 'w-6 h-6' })}
                    </div>
                    
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-black text-xs text-amber-300 tracking-wide">【存档位 ${s.slotId}】</span>
                        ${isActive ? `
                          <span class="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-400 text-black shadow animate-pulse">
                            当前生效
                          </span>
                        ` : ''}
                        <span class="text-[10px] text-slate-400 font-mono">
                          ${isEmpty ? '未占用' : s.dateString}
                        </span>
                      </div>

                      ${isEmpty ? `
                        <div class="text-xs text-slate-400 italic mt-0.5">
                          空置的英雄卷轴，等待镌刻新的传说……
                        </div>
                      ` : `
                        <div class="text-xs font-bold text-slate-200 mt-0.5 flex flex-wrap items-center gap-2">
                          <span class="text-amber-200">${meta.name}</span>
                          <span class="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-normal">
                            ${cls.name} · ${nation.name.split(' ')[0]}
                          </span>
                          <span class="text-emerald-400 font-mono">Lv.${meta.level}</span>
                          <span class="text-purple-300 text-[11px]">【${meta.title}】</span>
                        </div>
                        <div class="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-3">
                          <span>魔塔: <b class="text-amber-300">第 ${meta.towerFloor} 层</b></span>
                          <span>金币: <b class="text-amber-400">${(meta.gold || 0).toLocaleString()}</b></span>
                          <span>魔晶: <b class="text-cyan-400">${(meta.crystal || 0).toLocaleString()}</b></span>
                        </div>
                      `}
                    </div>
                  </div>

                  <!-- 槽位操作按键区 -->
                  <div class="flex items-center gap-1.5 ml-auto flex-shrink-0">
                    ${isEmpty ? `
                      <button data-action="save-to" data-slot="${s.slotId}" class="btn-slot-action mota-btn-gold px-3 py-1.5 rounded text-xs font-bold shadow">
                        存入此槽位
                      </button>
                      <button data-action="new-in" data-slot="${s.slotId}" class="btn-slot-action mota-btn-dark px-3 py-1.5 rounded text-xs font-semibold text-amber-200 border-amber-600/50">
                        在此新开
                      </button>
                    ` : `
                      <button data-action="save-to" data-slot="${s.slotId}" class="btn-slot-action mota-btn-dark px-2.5 py-1.5 rounded text-xs font-semibold hover:border-amber-400 text-amber-200" title="用当前游戏进度覆盖此槽位">
                        覆盖
                      </button>
                      ${!isActive ? `
                        <button data-action="load-from" data-slot="${s.slotId}" class="btn-slot-action mota-btn-gold px-3 py-1.5 rounded text-xs font-bold shadow">
                          读取
                        </button>
                      ` : `
                        <button class="px-3 py-1.5 rounded text-xs font-bold bg-amber-500/20 border border-amber-400/40 text-amber-300 cursor-default">
                          游玩中
                        </button>
                      `}
                      <button data-action="delete-slot" data-slot="${s.slotId}" class="btn-slot-action mota-btn-dark px-2 py-1.5 rounded text-xs text-red-400 hover:text-red-300 hover:border-red-500" title="清空此槽位">
                        删除
                      </button>
                    `}
                  </div>

                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 档案馆底部辅助备份工具条 -->
        <div class="pt-2.5 border-t border-[#caa048]/60 flex flex-wrap items-center justify-between text-xs gap-2 flex-shrink-0 bg-black/30 p-2 rounded-xl">
          <div class="text-slate-400 text-[11px]">
            提示：在冒险旅途中，系统会自动将最新战报实时保存至当前活跃槽位。
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-archive-export-json" class="mota-btn-dark px-2.5 py-1 rounded text-xs text-slate-300 hover:text-amber-200 flex items-center gap-1">
              导出为JSON文件
            </button>
            <button id="btn-archive-import-json" class="mota-btn-dark px-2.5 py-1 rounded text-xs text-slate-300 hover:text-amber-200 flex items-center gap-1">
              从JSON文件恢复
            </button>
            <input type="file" id="file-archive-import" class="hidden" accept=".json">
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // 关闭按钮
    const btnClose = document.getElementById('btn-close-archive-modal');
    if (btnClose) btnClose.addEventListener('click', () => this.close());

    // 顶部新开游戏按钮
    const btnNewGame = document.getElementById('btn-modal-new-game');
    if (btnNewGame) {
      btnNewGame.addEventListener('click', () => {
        this.promptNewGame();
      });
    }

    // 槽位具体动作代理
    this.overlay.querySelectorAll('.btn-slot-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const slotId = parseInt(btn.getAttribute('data-slot'), 10);
        this.handleSlotAction(action, slotId);
      });
    });

    // 辅助导出 JSON
    const btnExport = document.getElementById('btn-archive-export-json');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        storage.exportJSON(gameState.data, storage.getActiveSlotId());
        gameModal.toast('单机备份已成功导出为 JSON 文件！');
      });
    }

    // 辅助导入 JSON
    const btnImport = document.getElementById('btn-archive-import-json');
    const inputImport = document.getElementById('file-archive-import');
    if (btnImport && inputImport) {
      btnImport.addEventListener('click', () => inputImport.click());
      inputImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          storage.importJSON(file, (err, loadedData) => {
            if (err) return gameModal.alert('导入失败：' + err.message);
            const activeId = storage.getActiveSlotId();
            storage.saveToSlot(activeId, loadedData);
            gameState.loadOrInit();
            gameState.notify();
            gameModal.alert(`成功将外部备份导入至【存档位 ${activeId}】！`, '导入成功', () => {
              this.render();
              if (this.onGameReload) this.onGameReload();
            });
          });
        }
      });
    }
  }

  // 槽位操作处理
  handleSlotAction(action, slotId) {
    if (action === 'save-to') {
      // 覆盖保存到该槽位
      storage.setActiveSlotId(slotId);
      storage.saveToSlot(slotId, gameState.data);
      gameModal.toast(`已将当前进度保存至【存档位 ${slotId}】！`);
      this.render();
      if (this.onGameReload) this.onGameReload();
    } else if (action === 'load-from') {
      // 读取该槽位
      gameModal.confirm(
        `确定要读取【存档位 ${slotId}】的冒险记录吗？未保存的临时改动可能会被替换！`,
        () => {
          const loadedData = storage.loadFromSlot(slotId);
          if (!loadedData) {
            return gameModal.alert('读取存档失败：槽位数据损坏或不存在！');
          }
          storage.setActiveSlotId(slotId);
          gameState.loadOrInit();
          gameState.notify();
          gameModal.alert(`成功载入【存档位 ${slotId}】的英雄记录！祝你战无不胜！`, '读档成功', () => {
            this.close();
            if (this.onGameReload) this.onGameReload();
          });
        },
        null,
        '读取历史档案'
      );
    } else if (action === 'delete-slot') {
      // 删除/清空槽位
      gameModal.confirm(
        `警告：确定要清空并删除【存档位 ${slotId}】的全部冒险数据吗？此操作无法撤销！`,
        () => {
          storage.deleteSlot(slotId);
          gameModal.toast(`【存档位 ${slotId}】已清空！`);
          this.render();
        },
        null,
        '删除档案确认'
      );
    } else if (action === 'new-in') {
      // 在指定空槽位新开游戏
      this.startNewGameInSlot(slotId);
    }
  }

  // 开启全新游戏流程
  promptNewGame() {
    // 寻找第一个空槽位，若全满则默认当前槽位或让用户选择
    const slots = storage.getAllSlots();
    const emptySlot = slots.find(s => s.isEmpty);
    const targetSlotId = emptySlot ? emptySlot.slotId : storage.getActiveSlotId();

    gameModal.confirm(
      `确定要开启全新的亚诺单人冒险旅程吗？\n\n系统将为你重置并打开创角誓约殿堂！\n新档案将保存至【存档位 ${targetSlotId}】${emptySlot ? '（空闲槽位）' : '（将覆盖原记录）'}。\n其他槽位的存档将完好保留不受任何影响！`,
      () => {
        this.startNewGameInSlot(targetSlotId);
      },
      null,
      '开启全新冒险'
    );
  }

  startNewGameInSlot(slotId) {
    storage.setActiveSlotId(slotId);
    gameState.resetToNewGame();
    gameState.data.hasChosenClass = false;
    storage.saveToSlot(slotId, gameState.data);
    this.close();

    if (this.onStartNewGame) {
      this.onStartNewGame();
    } else {
      if (this.onGameReload) this.onGameReload();
    }
  }
}
