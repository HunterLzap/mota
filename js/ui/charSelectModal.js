// 2010经典页游角色创建与国家职业缔约大厅 (100% 贴合《魔塔世界》百度百科原著)
import { gameState } from '../core/state.js';
import { storage } from '../core/storage.js';
import { CLASSES, NATIONS } from '../config/classes.js';
import { ART_ASSETS } from '../assets/icons.js';
import { renderGameIcon } from './iconHelper.js';
import { sound } from '../core/sound.js';
import { gameModal } from './modal.js';

const RANDOM_NAMES = [
  '兰斯洛特·晨曦', '亚瑟·潘德拉贡', '雷恩·逐风者', '艾莉亚·星痕',
  '罗兰·圣剑', '维克多·炎龙', '海伦娜·秘术', '凯尔·暗影',
  '加拉哈德·圣徒', '席尔瓦·银月', '奥斯汀·灭龙者', '戴安娜·疾风'
];

export class CharSelectModal {
  constructor(overlayId) {
    this.overlay = document.getElementById(overlayId);
    this.selectedClassId = gameState.data.classId || 'warrior';
    this.selectedNationId = gameState.data.nation || 'aden';
    this.characterName = gameState.data.name || '兰斯洛特·晨曦';
  }

  open(force = false) {
    // 每一个存档只需选择一次职业；若已选定且非新建强制重设，严禁弹出
    if (gameState.data.hasChosenClass) {
      return;
    }
    this.selectedClassId = gameState.data.classId || 'warrior';
    this.selectedNationId = gameState.data.nation || 'aden';
    this.characterName = gameState.data.name || (RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]);
    this.render();
    this.overlay.classList.remove('hidden');
    this.overlay.classList.add('flex');
  }

  close() {
    if (!gameState.data.hasChosenClass) return;
    this.overlay.classList.add('hidden');
    this.overlay.classList.remove('flex');
  }

  render() {
    const cls = CLASSES[this.selectedClassId];
    const nation = NATIONS[this.selectedNationId];

    this.overlay.innerHTML = `
      <div class="relative w-full max-w-4xl mota-parchment-panel rounded-2xl border-2 border-[#caa048] p-6 shadow-2xl flex flex-col justify-between max-h-[95vh] overflow-y-auto select-none">
        
        <!-- 顶部卷轴标头 -->
        <div class="flex items-center justify-between border-b-2 border-[#caa048] pb-3">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-full bg-red-700 border border-amber-400 flex items-center justify-center text-xs font-bold text-amber-200 shadow">
              契约
            </span>
            <div>
              <h2 class="text-lg font-black text-[#f5c042] tracking-wider">亚诺古陆苏醒 · 国家与职业誓约</h2>
              <p class="text-xs text-slate-300">沉睡千年的古代亚诺精英！请确立你的城邦阵营与天命尊号！</p>
            </div>
          </div>
          <button id="btn-close-char-modal" class="mota-btn-dark px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white">
            关闭
          </button>
        </div>

        <!-- 阵营选择行 (三大古国) -->
        <div class="mt-3 p-3 rounded-xl bg-black/40 border border-[#caa048]/40">
          <div class="text-xs font-bold text-amber-300 mb-2 flex items-center justify-between">
            <span>第一步：选择所属城邦国家 (享专属国民光环)</span>
            <span class="text-[11px] text-amber-400/90 font-mono">${nation.buffDesc}</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            ${Object.values(NATIONS).map(n => {
              const isSel = this.selectedNationId === n.id;
              return `
                <div data-nation-id="${n.id}" class="nation-card p-2 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSel ? 'bg-amber-950/80 border-[#f5c042] shadow-md' : 'bg-black/60 border-slate-700 hover:border-slate-500'
                }">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center">${renderGameIcon(n.id, { size: 'w-full h-full' })}</div>
                    <span class="font-bold text-xs ${isSel ? 'text-amber-200' : 'text-slate-300'}">${n.name}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 mt-1 line-clamp-1">${n.title}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 中间：左侧三职业卡牌 + 右侧立绘属性特写 -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-5 my-3">
          
          <!-- 左侧：三大职业选择卡 (5列) -->
          <div class="md:col-span-5 space-y-2.5">
            <div class="text-xs font-bold text-amber-300 mb-1">
              <span>第二步：选择传承职业</span>
            </div>

            ${Object.values(CLASSES).map(c => {
              const isSelected = this.selectedClassId === c.id;
              return `
                <div data-class-id="${c.id}" class="char-class-card p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  isSelected ? 'bg-amber-950/80 border-[#f5c042] shadow-lg shadow-amber-500/20' : 'bg-black/50 border-slate-700 hover:border-slate-500'
                }">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-black/60 border border-[#b48c36] flex items-center justify-center p-1.5 shadow">
                      ${renderGameIcon(c.id, { size: 'w-full h-full' })}
                    </div>
                    <div>
                      <div class="font-bold text-sm text-amber-200">${c.name}</div>
                      <div class="text-[11px] text-slate-400">${c.title}</div>
                    </div>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded font-mono ${isSelected ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-slate-400'}">
                    ${isSelected ? '已选择' : '选择'}
                  </span>
                </div>
              `;
            }).join('')}

            <!-- 名字输入与骰子随机起名 -->
            <div class="pt-2 border-t border-[#caa048]/40">
              <label class="block text-xs font-bold text-amber-300 mb-1.5">第三步：英雄尊号</label>
              <div class="flex gap-2">
                <input type="text" id="input-hero-name" value="${this.characterName}" maxlength="12"
                  class="flex-1 bg-black/60 border border-[#b48c36] rounded-lg px-3 py-1.5 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400">
                <button id="btn-random-name" class="mota-btn-dark px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                  <span>随机</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 右侧：当前选中职业的精美立绘与绝技面板 (7列) -->
          <div class="md:col-span-7 mota-parchment-panel rounded-xl p-4 border border-[#caa048]/60 flex flex-col justify-between bg-black/40">
            <div>
              <div class="flex items-start justify-between border-b border-slate-700 pb-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-16">
                    ${this.selectedClassId === 'warrior' ? ART_ASSETS.hero_warrior :
                      this.selectedClassId === 'mage' ? ART_ASSETS.hero_mage : ART_ASSETS.hero_hunter}
                  </div>
                  <div>
                    <h3 class="font-bold text-base text-amber-300">${cls.name} · ${cls.title}</h3>
                    <p class="text-xs text-slate-300 mt-0.5">${cls.description}</p>
                  </div>
                </div>
              </div>

              <!-- 职业核心成长数值展示 -->
              <div class="grid grid-cols-3 gap-2 my-2.5 text-xs">
                <div class="p-2 bg-black/50 rounded border border-slate-800">
                  <span class="text-slate-400">初始生命:</span>
                  <div class="font-bold text-red-400 font-mono text-sm">${cls.baseStats.hp}</div>
                </div>
                <div class="p-2 bg-black/50 rounded border border-slate-800">
                  <span class="text-slate-400">初始攻击:</span>
                  <div class="font-bold text-amber-400 font-mono text-sm">${cls.baseStats.atk}</div>
                </div>
                <div class="p-2 bg-black/50 rounded border border-slate-800">
                  <span class="text-slate-400">战斗专精:</span>
                  <div class="font-bold text-cyan-400 text-xs mt-0.5">
                    ${this.selectedClassId === 'warrior' ? '25%反击守御' :
                      this.selectedClassId === 'mage' ? '12%技能吸血' : '20%暴击闪避'}
                  </div>
                </div>
              </div>

              <!-- 原著真实技能树展示 -->
              <div class="space-y-1">
                <div class="text-xs font-semibold text-amber-300">原著正版 9 大技能树选览：</div>
                <div class="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  ${cls.skills.slice(0, 5).map(sk => `
                    <div class="p-1.5 rounded bg-black/30 border border-slate-800 text-[11px] flex items-center justify-between">
                      <div>
                        <span class="font-bold text-amber-200">【${sk.name}】</span>
                        <span class="text-slate-400 ml-1">${sk.description}</span>
                      </div>
                      ${sk.mpCost ? `<span class="text-[10px] text-cyan-400 font-mono flex-shrink-0">耗蓝 ${sk.mpCost}</span>` : `<span class="text-[10px] text-amber-400 font-mono flex-shrink-0">被动/光环</span>`}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- 底部确认按钮 -->
            <div class="mt-3 pt-3 border-t border-slate-700">
              <button id="btn-confirm-character" class="w-full mota-btn-gold py-3 rounded-xl text-sm font-black tracking-wider shadow-xl animate-pulse">
                誓约确认 · 携【${nation.name}】荣耀踏入亚诺大陆 ->
              </button>
            </div>

          </div>

        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // 国家选择
    document.querySelectorAll('.nation-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-nation-id');
        this.selectedNationId = id;
        sound.playCoin();
        this.render();
      });
    });

    // 职业卡片点击切换
    document.querySelectorAll('.char-class-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-class-id');
        this.selectedClassId = id;
        sound.playSlash();
        this.render();
      });
    });

    // 随机名字
    const btnRand = document.getElementById('btn-random-name');
    const inputName = document.getElementById('input-hero-name');
    if (btnRand && inputName) {
      btnRand.addEventListener('click', () => {
        const rand = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        inputName.value = rand;
        this.characterName = rand;
        sound.playCoin();
      });
      inputName.addEventListener('input', (e) => {
        this.characterName = e.target.value.trim();
      });
    }

    // 关闭按钮
    const btnClose = document.getElementById('btn-close-char-modal');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.close());
    }

    // 确定选择角色
    const btnConfirm = document.getElementById('btn-confirm-character');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', () => {
        const nameVal = inputName ? inputName.value.trim() : this.characterName;
        if (!nameVal) return gameModal.alert('请输入勇者的姓名！', '创建角色');

        gameState.data.name = nameVal;
        gameState.data.nation = this.selectedNationId;
        gameState.data.classId = this.selectedClassId;
        gameState.data.hasChosenClass = true;

        // 立即关闭窗口并永久同步写入当前活跃存档槽位，绝不重复弹出
        this.close();
        storage.save(gameState.data);
        gameState.notify();

        sound.playFanfare();
        gameModal.toast(
          `誓约已成！欢迎【${NATIONS[this.selectedNationId].name}】的英勇【${CLASSES[this.selectedClassId].name}】——【${nameVal}】降临亚诺大陆！`
        );
      });
    }
  }
}
