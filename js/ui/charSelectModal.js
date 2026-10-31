// 2010经典页游角色创建与国家职业缔约大厅 (100% 贴合《魔塔世界》百度百科原著)
import { gameState } from '../core/state.js';
import { storage } from '../core/storage.js';
import { CLASSES, NATIONS } from '../config/classes.js';
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
    const nameValue = this.characterName.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

    const summaries = { warrior: '近战承伤，稳住阵线并反击。', mage: '施展法术，管理魔力与护盾。', hunter: '远程先手，用速度与控制压制敌人。' };
    this.overlay.innerHTML = `
      <div class="w-full max-w-xl mota-parchment-panel rounded-xl border border-[#caa048] p-5 max-h-[95vh] overflow-y-auto">
        <h2 class="text-lg text-amber-200 font-bold mb-4">创建冒险者</h2>
        <label class="text-xs text-amber-300">英雄名称</label>
        <div class="flex gap-2 mt-1 mb-4">
          <input id="input-hero-name" type="text" maxlength="12" value="${nameValue}" class="min-w-0 flex-1 bg-black/50 border border-[#b48c36] rounded p-2 text-amber-100">
          <button id="btn-random-name" class="mota-btn-dark px-3 rounded">随机</button>
        </div>
        <p class="text-xs text-amber-300 mb-2">城邦</p>
        <div class="grid grid-cols-3 gap-2 mb-4">
          ${Object.values(NATIONS).map(n => `<button data-nation-id="${n.id}" title="${n.buffDesc}" class="nation-card p-2 rounded border ${this.selectedNationId === n.id ? 'border-amber-400 bg-amber-950' : 'border-slate-700 bg-black/40'}">
            <span class="block w-7 h-7 mx-auto mb-1">${renderGameIcon(n.id, { size: 'w-full h-full' })}</span><span class="text-xs text-amber-100">${n.name.split(' ')[0]}</span>
          </button>`).join('')}
        </div>
        <p class="text-xs text-amber-300 mb-2">职业</p>
        <div class="space-y-2 mb-4">
          ${Object.values(CLASSES).map(c => `<button data-class-id="${c.id}" class="char-class-card w-full flex items-center gap-3 p-3 rounded border text-left ${this.selectedClassId === c.id ? 'border-amber-400 bg-amber-950' : 'border-slate-700 bg-black/40'}">
            <span class="w-8 h-8 flex-shrink-0">${renderGameIcon(c.id, { size: 'w-full h-full' })}</span>
            <span><strong class="text-sm text-amber-100">${c.name}</strong><span class="block text-xs text-slate-300 mt-1">${summaries[c.id]}</span></span>
          </button>`).join('')}
        </div>
        <p class="text-xs text-slate-300 mb-3">职业一经确定，本存档无法更换。</p>
        <button id="btn-confirm-character" class="w-full mota-btn-gold py-3 rounded font-bold">启程前往王都</button>
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
        gameState.data.onboardingVersion = 2;

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
