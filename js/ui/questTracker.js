// 2010经典页游常驻底部任务追踪与自动寻路组件 (横向自适应、可滚轮查看任务内容)
import { gameState } from '../core/state.js';
import { specializeEquipment } from '../config/items.js';
import { getQuestList } from '../config/quests.js';
import { sound } from '../core/sound.js';
import { gameModal } from './modal.js';
import { getJourneyGuidance } from '../core/journey.js';
import { renderGameIcon } from './iconHelper.js';

export class QuestTracker {
  constructor(containerId, onNavigate) {
    this.container = document.getElementById(containerId);
    this.onNavigate = onNavigate;
  }

  render() {
    if (!this.container) return;
    const currentQuestId = gameState.data.currentQuestId || 'quest_1';
    const quest = getQuestList(gameState.data).find(q => q.id === currentQuestId);

    if (!quest) {
      this.container.innerHTML = `
        <div class="mota-parchment-panel rounded-xl p-3 border border-[#caa048] shadow-inner text-xs h-full flex items-center justify-center text-center bg-black/40">
          <div>
            <div class="font-bold text-amber-300 text-sm">主线任务已全部达成！</div>
            <p class="text-[11px] text-slate-400 mt-1">黑翼龙皇已陨落。回王都探望同行者，或继续探索古门、培养伙伴与挑战角斗场。</p>
          </div>
        </div>
      `;
      return;
    }

    const progress = gameState.data.questProgress?.[quest.id] || { current: 0, completed: false };
    const isReadyToClaim = progress.completed;

    this.container.innerHTML = `
      <div class="mota-parchment-panel rounded-xl border border-[#caa048] p-2.5 h-full flex flex-col justify-between shadow-inner select-none bg-gradient-to-r from-[#22160d] via-[#1a110a] to-[#120c07]">
        
        <!-- 任务顶栏：章节、任务名与完成进度 -->
        <div class="flex items-center justify-between pb-1 border-b border-[#4a3520] flex-shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <span class="journal-emblem" aria-hidden="true">${renderGameIcon('ui_quest', { size: 'w-6 h-6' })}</span>
            <div class="flex items-center gap-2 truncate">
              <span class="text-xs font-bold text-amber-300 truncate">
                ${quest.title}
              </span>
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-black/60 border border-amber-600/40 text-amber-200/80 font-mono flex-shrink-0">
                ${quest.chapter}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-[11px] font-mono font-bold ${isReadyToClaim ? 'text-emerald-400' : 'text-amber-300'}">
              进度: ${progress.current} / ${quest.requiredCount}
            </span>
            ${isReadyToClaim ? `
              <span class="quest-state-badge" data-quest-state="ready">
                可领奖
              </span>
            ` : `
              <span class="quest-state-badge" data-quest-state="ongoing">
                进行中
              </span>
            `}
          </div>
        </div>

        <!-- 任务主体：左侧可滚轮查看剧情/目标/奖励 + 右侧操作按钮 -->
        <div class="flex-1 min-h-0 flex items-center gap-3 my-1">
          
          <!-- 可滚轮查看详情区域 (支持鼠标滚轮滚动浏览剧情背景与奖励详情) -->
          <div class="flex-1 min-h-0 h-full overflow-y-auto pr-2 custom-scrollbar text-xs text-slate-300 bg-black/40 p-2 rounded-lg border border-[#4a3520]/60 space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-amber-200">目标: <span class="${isReadyToClaim ? 'text-emerald-300 font-bold' : 'text-amber-300'}">${quest.goalText}</span></span>
            </div>
            
            <details class="quest-story text-slate-300 text-xs leading-relaxed">
              <summary>委托详情</summary>
              <p>${quest.desc}</p>
            </details>

            <div class="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span class="text-slate-300 font-bold">犒赏:</span>
              <span class="text-emerald-400">+${quest.rewards.exp}经验</span>
              <span class="text-amber-400">+${quest.rewards.gold}金币</span>
              <span class="text-cyan-400">+${quest.rewards.crystal}魔晶</span>
              ${quest.rewards.items ? `<span class="text-purple-300">赠: ${quest.rewards.items.map(i => `【${specializeEquipment(i, gameState.data.classId).name}】`).join(' ')}</span>` : ''}
            </div>
          </div>

          <!-- 右侧动作按键 -->
          <div class="flex-shrink-0 w-28 flex flex-col justify-center">
            ${isReadyToClaim ? `
              <button id="btn-claim-quest-reward" class="w-full mota-btn-gold py-2 rounded-xl text-xs font-black shadow-lg flex items-center justify-center border-amber-300">
                <span>领受犒赏</span>
              </button>
            ` : `
              <button id="btn-auto-nav-quest" class="w-full mota-btn-dark py-2 rounded-xl text-xs font-bold transition-all hover:border-amber-400 text-amber-300 flex items-center justify-center shadow border-amber-600/60">
                <span>前往寻路</span>
              </button>
            `}
          </div>

        </div>

      </div>
    `;

    this.bindEvents(quest, isReadyToClaim);
  }

  bindEvents(quest, isReadyToClaim) {
    // 自动寻路跳转
    const btnNav = document.getElementById('btn-auto-nav-quest');
    if (btnNav) {
      btnNav.addEventListener('click', () => {
        sound.playSlash();
        const step = getJourneyGuidance(gameState.data);
        if (step?.regionalReady) {
          document.getElementById('btn-next-journey')?.click();
          return;
        }
        if (this.onNavigate) {
          this.onNavigate(step?.tab || quest.targetTab, step?.action || quest.targetAction);
        }
      });
    }

    // 领取任务奖励
    const btnClaim = document.getElementById('btn-claim-quest-reward');
    if (btnClaim) {
      btnClaim.addEventListener('click', () => {
        const res = gameState.claimQuestReward(quest.id);
        if (res) {
          sound.playFanfare();
          if (gameState.data.onboardingVersion === 2) {
            const next = getQuestList(gameState.data).find(q => q.id === gameState.data.currentQuestId);
            gameModal.alert(`${quest.speaker}：${quest.id === 'quest_9' ? '巡逻记录已找回。先撤离结算，再换上勇气武器；接下来追查秘宝的去向。' : quest.id === 'quest_26' ? '龙皇的契约已经破碎。现在，带着你的伙伴回家吧。' : '这份委托已经完成。补给交给你，我们继续追查。'}\n\n经验 +${quest.rewards.exp}，金币 +${quest.rewards.gold}，魔晶 +${quest.rewards.crystal}。${quest.rewards.items.length ? '\n获得：' + quest.rewards.items.map(i => specializeEquipment(i, gameState.data.classId).name).join('、') : ''}\n\n${next ? next.speaker + '：' + next.desc : '王都的灯火再次亮起。你仍可自由探索这片大陆。'}`, quest.title);
            this.render();
            return;
          }
          const rewardItems = quest.rewards.items ? quest.rewards.items.map(i => `【${specializeEquipment(i, gameState.data.classId).name}】x${i.count || 1}`).join(' ') : '';
          gameModal.alert(
            `主线任务【${quest.title}】圆满达成！

获得犒赏：
经验 +${quest.rewards.exp}
金币 +${quest.rewards.gold}
魔晶 +${quest.rewards.crystal}${rewardItems ? `
专属神装/材料：${rewardItems}` : ''}

${gameState.data.currentQuestId === 'completed' ? '黑翼龙皇已陨落，王都与边境重获和平。主线使命全部完成，你仍可继续探索魔塔与古门。' : '已自动为你解锁下一阶段主线征程！'}`,
            '主线大捷',
            () => {
              const nextQuest = getQuestList(gameState.data).find(q => q.id === gameState.data.currentQuestId);
              if (nextQuest && this.onNavigate) {
                this.onNavigate(nextQuest.targetTab, nextQuest.targetAction);
              }
            }
          );
          this.render();
        }
      });
    }
  }
}
