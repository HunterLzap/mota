// 2010 经典页游常驻底部系统提示与玩家动态日志中枢 (Skeuomorphic Retro System Log Stream)
import { gameState } from '../core/state.js';

export class SystemLogView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.filter = 'all'; // 'all' | 'obtain' | 'battle' | 'quest' | 'forge'
  }

  render() {
    if (!this.container) return;
    const logs = gameState.systemLogs || [];
    const filteredLogs = this.filter === 'all' 
      ? logs 
      : logs.filter(l => l.type === this.filter);

    this.container.innerHTML = `
      <div class="mota-parchment-panel rounded-xl border border-[#caa048] p-2 h-full flex flex-col justify-between shadow-inner select-none bg-gradient-to-r from-[#17100a] via-[#100b07] to-[#1c130c]">
        
        <!-- 日志顶栏：标题 + 快捷分类筛选 -->
        <div class="flex items-center justify-between pb-1 border-b border-[#4a3520] flex-shrink-0">
          <div class="flex items-center gap-1.5">
            <span class="w-4 h-4 rounded bg-amber-950 border border-amber-500/80 flex items-center justify-center text-[10px] text-amber-300 shadow font-bold">
              讯
            </span>
            <span class="text-xs font-bold text-amber-300 tracking-wide">
              系统提示
            </span>
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

        <!-- 日志主体滚轮滚动区域 -->
        <div id="system-log-scroll-pane" class="flex-1 min-h-0 my-1 overflow-y-auto custom-scrollbar p-1.5 bg-black/50 rounded-lg border border-[#3d2f1f]/80 space-y-1 font-mono text-[11px] leading-relaxed">
          ${filteredLogs.length === 0 ? `
            <div class="text-slate-500 text-center py-4 text-[10px]">
              暂无对应分类动态日志...
            </div>
          ` : filteredLogs.map(log => this.renderLogItem(log)).join('')}
        </div>

      </div>
    `;

    this.bindEvents();
    this.scrollToBottom();
  }

  renderLogItem(log) {
    const badgeMap = {
      obtain: { text: '拾取', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50' },
      battle: { text: '战报', bg: 'bg-rose-950/80 text-rose-300 border-rose-600/50' },
      quest: { text: '任务', bg: 'bg-amber-950/80 text-amber-300 border-amber-600/50' },
      forge: { text: '精铸', bg: 'bg-cyan-950/80 text-cyan-300 border-cyan-600/50' },
      pet: { text: '神兽', bg: 'bg-purple-950/80 text-purple-300 border-purple-600/50' },
      estate: { text: '庄园', bg: 'bg-lime-950/80 text-lime-300 border-lime-600/50' },
      system: { text: '系统', bg: 'bg-slate-900/80 text-slate-300 border-slate-700/50' }
    };
    const badge = badgeMap[log.type] || badgeMap.system;

    return `
      <div class="flex items-baseline gap-1.5 hover:bg-white/5 px-1 py-0.5 rounded transition-all">
        <span class="text-slate-500 text-[10px] flex-shrink-0">[${log.time}]</span>
        <span class="text-[9px] px-1 py-0.2 rounded border font-sans font-bold flex-shrink-0 ${badge.bg}">
          ${badge.text}
        </span>
        <span class="text-slate-200 break-all leading-normal flex-1">
          ${log.text}
        </span>
      </div>
    `;
  }

  bindEvents() {
    if (!this.container) return;
    this.container.querySelectorAll('.btn-log-filter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.filter = e.currentTarget.dataset.logFilter;
        this.render();
      });
    });
  }

  scrollToBottom() {
    const pane = document.getElementById('system-log-scroll-pane');
    if (pane) {
      pane.scrollTop = pane.scrollHeight;
    }
  }
}
