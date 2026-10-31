// 《魔塔世界》纯代码 HTML5 Canvas 动态微粒子氛围引擎 (Atmosphere Engine)
// 原生 Canvas 2D 粒子系统，仅在画布可见时排帧。

class AtmosphereEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.currentPreset = 'forge'; // 'forge' | 'forest' | 'palace' | 'tower' | 'none'
    this.animId = null;
    this.width = 0;
    this.height = 0;
    this.isRunning = false;
  }

  init(canvasId = 'atmosphere-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    window.addEventListener('resize', () => {
      if (this.canAnimate()) this.resize();
      this.syncVisibility();
    });
    document.addEventListener('visibilitychange', () => this.syncVisibility());
    this.visibilityObserver = new MutationObserver(() => this.syncVisibility());
    for (let node = this.canvas; node; node = node.parentElement) {
      this.visibilityObserver.observe(node, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    }

    this.setPreset(this.currentPreset);
  }

  canAnimate() {
    return this.canvas && !document.hidden && this.currentPreset !== 'none' &&
      this.canvas.getClientRects().length > 0 &&
      !['hidden', 'collapse'].includes(getComputedStyle(this.canvas).visibility);
  }

  syncVisibility() {
    if (this.canAnimate()) this.start();
    else this.stop();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setPreset(preset) {
    this.currentPreset = preset;
    this.particles = [];
    if (preset === 'none') this.ctx?.clearRect(0, 0, this.width, this.height);
    this.syncVisibility();
  }

  createParticles() {
    const preset = this.currentPreset;
    const count = preset === 'forge' ? 45 : preset === 'forest' ? 35 : preset === 'palace' ? 25 : 30;
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(preset, true));
    }
  }

  createParticle(preset, isInitial = false) {
    const p = {
      x: Math.random() * this.width,
      y: isInitial ? Math.random() * this.height : this.height + 10,
      vx: 0,
      vy: 0,
      size: Math.random() * 2.5 + 1,
      alpha: Math.random() * 0.7 + 0.3,
      maxLife: Math.random() * 180 + 100,
      life: 0,
      color: '#ffffff'
    };

    if (preset === 'forge') {
      // 熔炉余烬与火星：向上升腾微晃
      p.vx = (Math.random() - 0.5) * 1.2;
      p.vy = -(Math.random() * 1.8 + 0.8);
      p.color = Math.random() > 0.4 ? '#f59e0b' : Math.random() > 0.5 ? '#ef4444' : '#fef08a';
      p.size = Math.random() * 3 + 1;
    } else if (preset === 'forest') {
      // 微光森林：荧光微光游移
      p.vx = (Math.random() - 0.5) * 0.8;
      p.vy = (Math.random() - 0.5) * 0.6;
      p.color = Math.random() > 0.3 ? '#86efac' : '#fef08a';
      p.size = Math.random() * 3.5 + 1.5;
    } else if (preset === 'palace') {
      // 圣王大殿：自上而下的神圣金尘
      p.x = Math.random() * this.width;
      p.y = isInitial ? Math.random() * this.height : -10;
      p.vx = (Math.random() - 0.3) * 0.5;
      p.vy = Math.random() * 0.8 + 0.3;
      p.color = '#fef08a';
      p.size = Math.random() * 2 + 1;
    } else if (preset === 'tower') {
      // 古堡魔塔：紫蓝奥术星屑
      p.vx = (Math.random() - 0.5) * 1.0;
      p.vy = -(Math.random() * 1.2 + 0.4);
      p.color = Math.random() > 0.4 ? '#c084fc' : '#38bdf8';
      p.size = Math.random() * 2.8 + 1;
    }

    return p;
  }

  start() {
    if (!this.canAnimate()) return;
    if (!this.isRunning) this.resize();
    if (!this.particles.length) {
      this.createParticles();
    }
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = () => {
      if (!this.isRunning) return;
      this.update();
      this.draw();
      if (this.isRunning) {
        this.animId = requestAnimationFrame(loop);
      }
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  update() {
    if (this.currentPreset === 'none') return;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      // 边缘重生判定
      if (p.life > p.maxLife || p.y < -20 || p.y > this.height + 20 || p.x < -20 || p.x > this.width + 20) {
        this.particles[i] = this.createParticle(this.currentPreset, false);
      }
    }
  }

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (this.currentPreset === 'none') return;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const progress = p.life / p.maxLife;
      // 柔和淡入淡出曲线
      const curAlpha = p.alpha * Math.sin(progress * Math.PI);

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, Math.min(1, curAlpha));
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = p.size * 2.5;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }
}

export const atmosphere = new AtmosphereEngine();
