// 2010 经典页游常驻底部系统提示与玩家动态日志中枢 (Skeuomorphic Retro System Log Stream)
import { gameState } from '../core/state.js';
import { renderGameIcon } from './iconHelper.js';

export class SystemLogView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.filter = 'all'; // 'all' | 'obtain' | 'battle' | 'quest' | 'forge'
  }

  filterName() {
    return { all: '全部', obtain: '获得', battle: '战报', quest: '任务', forge: '精铸' }[this.filter] || '全部';
  }

  currentLogs() {
    const logs = gameState.systemLogs || [];
    return this.filter === 'all' ? logs : logs.filter(l => l.type === this.filter);
  }

  render() {
    if (!this.container) return;
    const filteredLogs = this.currentLogs();
    // 底部常驻面板：固定高度、只显示最近 5 条、无内部滚动条。
    const latestLogs = filteredLogs.slice(-5);

    this.container.innerHTML = `
      <div class="mota-parchment-panel rounded-xl border border-[#caa048] p-2 h-full flex flex-col shadow-inner select-none bg-gradient-to-r from-[#17100a] via-[#100b07] to-[#1c130c]">
        
        <!-- 日志顶栏：标题 + 快捷分类筛选 -->
        <div class="flex items-center justify-between pb-1 border-b border-[#4a3520] flex-shrink-0">
          <div class="flex items-center gap-1.5">
            <span class="journal-emblem" aria-hidden="true">${renderGameIcon('ui_journal', { size: 'w-6 h-6' })}</span>
            <span class="text-xs font-bold text-amber-300 tracking-wide">
              系统提示
            </span>
            <button id="btn-log-view-all" class="ml-1 text-[10px] text-amber-300 underline decoration-amber-600 hover:text-amber-100">查看全部</button>
          </div>

          <!-- 分类筛选小标签 -->
          <div class="flex items-center gap-1 text-[10px]">
            <button data-log-filter="all" class="btn-log-filter px-1.5 py-0.2 rounded transition-all font-bold ${
              this.filter === 'all' ? 'bg-amber-500 text-black shadow' : 'bg-black/40 text-slate-400 hover:text-amber-200'
            }">全部</button>
            <button data-log-filter="obtain" class="btn-log-filter px-1.5 py-0.2 rounded transition-all ${
              this.filter === 'obtain' ? 'bg-emerald-500 text-black font-bold shadow' : 'bg-black/40 text-emerald-400 hover:text-emerald-200'
            }">获得</button>
            <button data-log-filter="battle" class="btn-log-filter px-1.5 py-0.2 rounded transition-all ${
              this.filter === 'battle' ? 'bg-rose-500 text-black font-bold shadow' : 'bg-black/40 text-rose-400 hover:text-rose-200'
            }">战报</button>
            <button data-log-filter="quest" class="btn-log-filter px-1.5 py-0.2 rounded transition-all ${
              this.filter === 'quest' ? 'bg-amber-500 text-black font-bold shadow' : 'bg-black/40 text-amber-300 hover:text-amber-100'
            }">任务</button>
            <button data-log-filter="forge" class="btn-log-filter px-1.5 py-0.2 rounded transition-all ${
              this.filter === 'forge' ? 'bg-cyan-500 text-black font-bold shadow' : 'bg-black/40 text-cyan-300 hover:text-cyan-100'
            }">精铸</button>
          </div>
        </div>

        <!-- 日志主体：固定高度、最近 5 条、无滚轮（查看全部走分页弹窗） -->
        <div id="system-log-scroll-pane" class="flex-1 min-h-0 my-1 overflow-hidden p-1.5 bg-black/50 rounded-lg border border-[#3d2f1f]/80 space-y-1 font-mono text-[11px] leading-relaxed">
          ${latestLogs.length === 0 ? `
            <div class="text-slate-500 text-center py-4 text-[10px]">
              暂无对应分类动态日志...
            </div>
          ` : latestLogs.map(log => this.renderLogItem(log)).join('')}
        </div>

      </div>
    `;

    this.bindEvents();
  }

  badgeFor(type) {
    const badgeMap = {
      obtain: { text: '拾取' },
      battle: { text: '战报' },
      quest: { text: '任务' },
      forge: { text: '精铸' },
      pet: { text: '神兽' },
      estate: { text: '庄园' },
      system: { text: '系统' }
    };
    return { badge: badgeMap[type] || badgeMap.system, kind: badgeMap[type] ? type : 'system' };
  }

  renderLogItem(log) {
    const { badge, kind } = this.badgeFor(log.type);
    return `
      <div class="system-log-row" data-log-type="${kind}">
        <span class="system-log-time">[${log.time}]</span>
        <span class="system-log-badge" data-log-kind="${kind}">
          ${badge.text}
        </span>
        <span class="system-log-text">
          ${log.text}
        </span>
      </div>
    `;
  }

  bindEvents() {
    if (!this.container) return;
    this.container.querySelectorAll('.btn-log-filter').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.logFilter === this.filter));
      btn.addEventListener('click', (e) => {
        this.filter = e.currentTarget.dataset.logFilter;
        this.render();
        this.container.querySelector(`[data-log-filter="${this.filter}"]`)?.focus({ preventScroll: true });
      });
    });
    const btnAll = this.container.querySelector('#btn-log-view-all');
    if (btnAll) btnAll.addEventListener('click', () => this.openArchive(0));
  }

  // “查看全部”：分页弹窗（上/下页），不再使用滚动条。
  openArchive(page = 0) {
    const logs = this.currentLogs().slice().reverse(); // 最新在上
    const pageSize = 6;
    const pages = Math.max(1, Math.ceil(logs.length / pageSize));
    const current = Math.min(Math.max(0, page), pages - 1);
    const slice = logs.slice(current * pageSize, (current + 1) * pageSize);

    let modal = document.getElementById('system-log-archive-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'system-log-archive-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="w-full max-w-2xl max-h-[82vh] mota-parchment-panel border-2 border-[#caa048] rounded-2xl flex flex-col overflow-hidden shadow-2xl select-none">
        <div class="p-3 border-b border-[#4a3520] flex items-center justify-between bg-black/30 flex-shrink-0">
          <h3 class="text-sm font-black text-amber-300">系统战报 · 全部记录（${this.filterName()}）</h3>
          <button id="btn-log-archive-close" class="mota-btn-dark px-2 py-1 rounded text-xs">关闭</button>
        </div>
        <div class="p-3 flex-1 min-h-0 overflow-hidden space-y-1.5 text-xs font-mono bg-black/10">
          ${slice.length ? slice.map(log => this.renderArchiveRow(log)).join('') : '<div class="text-center text-slate-500 py-6">暂无记录</div>'}
        </div>
        <div class="p-2.5 border-t border-[#4a3520] flex items-center justify-between bg-black/30 text-xs flex-shrink-0">
          <button id="btn-log-prev" class="mota-btn-dark px-3 py-1 rounded" ${current <= 0 ? 'disabled' : ''}>上一页</button>
          <span class="font-mono text-slate-300">第 ${current + 1} / ${pages} 页 · 共 ${logs.length} 条</span>
          <button id="btn-log-next" class="mota-btn-gold px-3 py-1 rounded" ${current >= pages - 1 ? 'disabled' : ''}>下一页</button>
        </div>
      </div>`;

    const close = () => this.closeArchive();
    modal.querySelector('#btn-log-archive-close').addEventListener('click', close);
    modal.querySelector('#btn-log-prev').addEventListener('click', () => { if (current > 0) this.openArchive(current - 1); });
    modal.querySelector('#btn-log-next').addEventListener('click', () => { if (current < pages - 1) this.openArchive(current + 1); });
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  }

  renderArchiveRow(log) {
    const { badge, kind } = this.badgeFor(log.type);
    return `<div class="flex items-start gap-2 p-1.5 rounded bg-black/20 border border-[#4a3520]/50">
      <span class="system-log-time">[${log.time}]</span>
      <span class="system-log-badge" data-log-kind="${kind}">${badge.text}</span>
      <span class="flex-1 min-w-0 text-slate-200">${log.text}</span>
    </div>`;
  }

  closeArchive() {
    const modal = document.getElementById('system-log-archive-modal');
    if (modal) modal.remove();
  }
}
