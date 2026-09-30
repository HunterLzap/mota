// 原生奇幻音效管理器 (根据需求全量彻底禁用音效，保持纯净静音沉浸)
class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = true; // 彻底全局静音，禁止任何音频生成
  }

  init() {}
  toggleMute() { return true; }

  // 所有音效均转为空操作，杜绝任何外部声音与 Web Audio API 生成
  playSlash() {}
  playMagic() {}
  playCrit() {}
  playBlock() {}
  playCoin() {}
  playFanfare() {}
  playLevelUp() {}
  playItemDrop() {}
  playEquip() {}
}

export const sound = new SoundManager();
