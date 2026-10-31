import { renderGameIcon } from './iconHelper.js';

// 2011 经典页游纯内部拟真羊皮纸弹窗与浮动 Toast 系统
// 彻底接管与替代浏览器原生 alert() / confirm()，保证 100% 游戏沉浸感

export class GameModal {
  constructor() {
    this.overlay = null;
    this.box = null;
    this.titleEl = null;
    this.messageEl = null;
    this.btnConfirm = null;
    this.btnCancel = null;
    this.btnClose = null;
    this.toastContainer = null;
    this.onConfirmCallback = null;
    this.onCancelCallback = null;
    this.isOpen = false;
    this.previousFocus = null;
    this.background = null;
    this.backgroundWasInert = false;
  }

  init() {
    this.overlay = document.getElementById('game-modal-overlay');
    this.box = document.getElementById('game-modal-box');
    this.titleEl = document.getElementById('game-modal-title');
    this.messageEl = document.getElementById('game-modal-message');
    this.btnConfirm = document.getElementById('game-modal-btn-confirm');
    this.btnCancel = document.getElementById('game-modal-btn-cancel');
    this.btnClose = document.getElementById('game-modal-close');
    this.toastContainer = document.getElementById('game-toast-container');

    if (this.btnConfirm) {
      this.btnConfirm.addEventListener('click', () => {
        if (!this.isOpen) return;
        const cb = this.onConfirmCallback;
        this.close();
        if (cb) cb();
      });
    }

    if (this.btnCancel) {
      this.btnCancel.addEventListener('click', () => {
        if (!this.isOpen) return;
        const cb = this.onCancelCallback;
        this.close();
        if (cb) cb();
      });
    }

    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => {
        if (!this.isOpen) return;
        const cb = this.onCancelCallback;
        this.close();
        if (cb) cb();
      });
    }

    // 点击背景遮罩关闭
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (this.isOpen && e.target === this.overlay) {
          const cb = this.onCancelCallback;
          this.close();
          if (cb) cb();
        }
      });
    }

    // Let focused controls handle Enter; cancellation must never confirm a purchase.
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        const cb = this.onCancelCallback;
        this.close();
        if (cb) cb();
      } else if (e.key === 'Tab') {
        const controls = [...this.box.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')]
          .filter(element => element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (!first) {
          e.preventDefault();
          this.box.focus();
        } else if (e.shiftKey && (document.activeElement === first || !this.box.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !this.box.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === 'Enter') {
        if (e.repeat) { e.preventDefault(); return; }
        if (e.target.closest?.('button,a,input,select,textarea,[contenteditable="true"]')) return;
        e.preventDefault();
        const cb = this.onConfirmCallback;
        this.close();
        if (cb) cb();
      }
    });

    // 优雅接管全局 window.alert 与 window.confirm
    window.alert = (msg, title) => this.alert(msg, title);
    window.confirm = (msg, onConfirm, onCancel, title) => this.confirm(msg, onConfirm, onCancel, title);
    window.showToast = (msg, type) => this.toast(msg, type);
    window.gameModal = this;
  }

  // 内部通用通知弹窗 (替代原生 alert)
  alert(message, title = '亚诺告示', onConfirm = null) {
    if (!this.overlay) {
      console.warn('GameModal overlay not ready, message:', message);
      return;
    }

    // 智能提取标题
    let finalTitle = title;
    let finalMsg = String(message || '');

    if (title === '亚诺告示') {
      if (finalMsg.includes('【主线任务达成】') || finalMsg.includes('任务达成') || finalMsg.includes('大捷')) {
        finalTitle = '主线大捷';
      } else if (finalMsg.includes('成功') || finalMsg.includes('大吉') || finalMsg.includes('凯旋')) {
        finalTitle = '凯旋喜讯';
      } else if (finalMsg.includes('决战') || finalMsg.includes('迎击') || finalMsg.includes('讨伐')) {
        finalTitle = '战役号令';
      } else if (finalMsg.includes('册封') || finalMsg.includes('封号') || finalMsg.includes('谕旨')) {
        finalTitle = '王国敕令';
      } else if (finalMsg.includes('未果') || finalMsg.includes('战败') || finalMsg.includes('失利')) {
        finalTitle = '战阵通报';
      } else if (finalMsg.includes('不足') || finalMsg.includes('缺少') || finalMsg.includes('失败')) {
        finalTitle = '提示告示';
      }
    }

    if (this.titleEl) this.titleEl.innerText = finalTitle;
    this.setContent(finalMsg);

    if (this.btnCancel) this.btnCancel.classList.add('hidden');
    if (this.btnConfirm) {
      this.btnConfirm.innerText = '领命 / 确定';
      this.btnConfirm.classList.remove('hidden');
    }

    this.onConfirmCallback = onConfirm;
    this.onCancelCallback = null;

    this.show();
  }

  // 内部确认弹窗 (替代原生 confirm)
  confirm(message, onConfirm = null, onCancel = null, title = '皇家确认', labels = {}) {
    if (!this.overlay) {
      return onConfirm ? onConfirm() : true;
    }

    if (this.titleEl) this.titleEl.innerText = title;
    this.setContent(String(message || ''), labels.npc);

    if (this.btnCancel) {
      this.btnCancel.innerText = labels.cancelLabel || '放弃';
      this.btnCancel.classList.remove('hidden');
    }
    if (this.btnConfirm) {
      this.btnConfirm.innerText = labels.confirmLabel || '确定执行';
      this.btnConfirm.classList.remove('hidden');
    }

    this.onConfirmCallback = onConfirm;
    this.onCancelCallback = onCancel;

    this.show();
  }

  dialogue(message, onConfirm = null, onCancel = null, npc = {}, labels = {}) {
    this.confirm(message, onConfirm, onCancel, npc.name, { ...labels, npc });
  }

  setContent(message, npc = null) {
    if (!this.messageEl) return;
    this.box.classList.toggle('npc-dialogue', Boolean(npc));
    this.box.querySelector('.npc-dialogue-portrait')?.remove();
    this.messageEl.replaceChildren();
    if (npc) {
      const portrait = document.createElement('aside');
      portrait.className = 'npc-dialogue-portrait';
      portrait.setAttribute('role', 'img');
      portrait.setAttribute('aria-label', `${npc.name}肖像`);
      const position = { warrior: '0%', mage: '50%', hunter: '100%' }[npc.portrait];
      if (position) {
        portrait.classList.add('class-portrait');
        portrait.style.setProperty('--class-portrait-position', position);
      } else portrait.innerHTML = renderGameIcon(npc.portrait || 'warrior', { size: 'w-full h-full' });
      this.messageEl.before(portrait);
      const name = document.createElement('h4');
      name.className = 'npc-dialogue-name';
      name.textContent = npc.name;
      this.messageEl.append(name);
      const text = document.createElement('div');
      text.className = 'npc-dialogue-text';
      text.textContent = message;
      this.messageEl.append(text);
    } else this.messageEl.textContent = message;
  }

  show() {
    if (!this.isOpen) {
      this.previousFocus = document.activeElement;
      this.background = document.querySelector('.classic-client');
      this.backgroundWasInert = Boolean(this.background?.inert);
    }
    if (this.background) this.background.inert = true;
    this.isOpen = true;
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      this.overlay.classList.add('flex');
    }
    if (this.box) {
      this.box.classList.remove('scale-95', 'opacity-0');
      this.box.classList.add('scale-100', 'opacity-100');
    }
    const initialFocus = this.btnCancel && !this.btnCancel.classList.contains('hidden') ? this.btnCancel : this.btnConfirm;
    initialFocus?.focus?.();
  }

  close() {
    this.isOpen = false;
    this.onConfirmCallback = null;
    this.onCancelCallback = null;
    if (this.background) this.background.inert = this.backgroundWasInert;
    if (this.box) {
      this.box.classList.add('scale-95', 'opacity-0');
      this.box.classList.remove('scale-100', 'opacity-100');
    }
    if (this.overlay) {
      setTimeout(() => {
        if (!this.isOpen) {
          this.overlay.classList.add('hidden');
          this.overlay.classList.remove('flex');
        }
      }, 150);
    }
    const opener = this.previousFocus;
    this.previousFocus = null;
    if (opener?.isConnected && !this.box?.contains(opener) && opener.getClientRects().length) opener.focus();
    else document.querySelector('.classic-navigation [aria-current="page"]')?.focus?.();
  }

  // 顶部浮动 Toast 飘字 (轻量提示)
  toast(message, type = 'info') {
    if (!this.toastContainer) return;

    const toastEl = document.createElement('div');
    toastEl.className = 'mota-metal-plaque px-4 py-2 rounded-xl border border-amber-400/80 shadow-[0_4px_20px_rgba(0,0,0,0.8)] text-xs font-bold text-amber-200 flex items-center gap-2 animate-bounce transition-all duration-300 pointer-events-auto bg-[#1a120b]/95';
    toastEl.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
      <span>${message}</span>
    `;

    this.toastContainer.appendChild(toastEl);

    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(-10px)';
      setTimeout(() => toastEl.remove(), 300);
    }, 2400);
  }
}

export const gameModal = new GameModal();
