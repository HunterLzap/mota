// 存档管理与持久化系统 (5大独立槽位 + 当前游玩槽位 + JSON 备份导入导出)
const LEGACY_SAVE_KEY = 'MOTA_WORLD_REBIRTH_SAVE';
const ACTIVE_SLOT_KEY = 'MOTA_WORLD_ACTIVE_SLOT_ID';
const SLOT_KEY_PREFIX = 'MOTA_WORLD_SAVE_SLOT_';
export const TOTAL_SLOTS = 5;

export const storage = {
  // 获取当前正在游玩的槽位 ID (1 ~ 5，默认 1)
  getActiveSlotId() {
    try {
      const id = localStorage.getItem(ACTIVE_SLOT_KEY);
      const num = parseInt(id, 10);
      return (num >= 1 && num <= TOTAL_SLOTS) ? num : 1;
    } catch (e) {
      return 1;
    }
  },

  // 设置当前活跃槽位
  setActiveSlotId(slotId) {
    try {
      const num = Math.max(1, Math.min(TOTAL_SLOTS, parseInt(slotId, 10) || 1));
      localStorage.setItem(ACTIVE_SLOT_KEY, String(num));
      return num;
    } catch (e) {
      return 1;
    }
  },

  // 获取特定槽位的存档概要信息
  getSlotInfo(slotId) {
    try {
      const key = `${SLOT_KEY_PREFIX}${slotId}`;
      let raw = localStorage.getItem(key);

      // 兼容迁移：如果是槽位1且为空，但存在旧存档，则自动迁移
      if (!raw && slotId === 1) {
        const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY);
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          const data = parsed.data || parsed;
          this.saveToSlot(1, data);
          raw = localStorage.getItem(key);
        }
      }

      if (!raw) {
        return {
          slotId,
          isEmpty: true,
          timestamp: null,
          dateString: '无存档记录',
          meta: null,
          data: null
        };
      }

      const envelope = JSON.parse(raw);
      const data = envelope.data || envelope;
      return {
        slotId,
        isEmpty: false,
        timestamp: envelope.timestamp || Date.now(),
        dateString: envelope.dateString || new Date(envelope.timestamp || Date.now()).toLocaleString(),
        meta: envelope.meta || {
          name: data.name || '勇者',
          classId: data.classId || 'warrior',
          nation: data.nation || 'aden',
          level: data.level || 1,
          title: data.royalTrials?.currentTitle || data.title || '见习勇者',
          gold: data.gold || 0,
          crystal: data.crystal || 0,
          towerFloor: data.castle?.floor || 1
        },
        data
      };
    } catch (e) {
      console.error(`Failed to get slot ${slotId} info:`, e);
      return {
        slotId,
        isEmpty: true,
        timestamp: null,
        dateString: '读取失败',
        meta: null,
        data: null
      };
    }
  },

  // 获取全部 5 个槽位的信息列表
  getAllSlots() {
    const slots = [];
    const activeId = this.getActiveSlotId();
    for (let i = 1; i <= TOTAL_SLOTS; i++) {
      const info = this.getSlotInfo(i);
      info.isActive = (i === activeId);
      slots.push(info);
    }
    return slots;
  },

  // 保存数据到指定槽位
  saveToSlot(slotId, data) {
    try {
      const now = new Date();
      const envelope = {
        version: '2.0.0',
        slotId,
        timestamp: now.getTime(),
        dateString: now.toLocaleString(),
        meta: {
          name: data.name || '亚诺勇士',
          classId: data.classId || 'warrior',
          nation: data.nation || 'aden',
          level: data.level || 1,
          title: data.royalTrials?.currentTitle || data.title || '见习勇者',
          gold: data.gold || 0,
          crystal: data.crystal || 0,
          towerFloor: data.castle?.floor || 1
        },
        data
      };
      localStorage.setItem(`${SLOT_KEY_PREFIX}${slotId}`, JSON.stringify(envelope));
      return true;
    } catch (e) {
      console.error(`Save to slot ${slotId} failed:`, e);
      return false;
    }
  },

  // 从指定槽位读取数据
  loadFromSlot(slotId) {
    const info = this.getSlotInfo(slotId);
    return info.isEmpty ? null : info.data;
  },

  // 清空/删除指定槽位
  deleteSlot(slotId) {
    try {
      localStorage.removeItem(`${SLOT_KEY_PREFIX}${slotId}`);
      if (slotId === 1) {
        localStorage.removeItem(LEGACY_SAVE_KEY);
      }
      return true;
    } catch (e) {
      console.error(`Delete slot ${slotId} failed:`, e);
      return false;
    }
  },

  // 默认保存：保存至当前活跃槽位
  save(data) {
    const activeId = this.getActiveSlotId();
    return this.saveToSlot(activeId, data);
  },

  // 默认读取：从当前活跃槽位读取
  load() {
    const activeId = this.getActiveSlotId();
    return this.loadFromSlot(activeId);
  },

  // 清空当前活跃槽位
  clear() {
    const activeId = this.getActiveSlotId();
    this.deleteSlot(activeId);
  },

  // 导出 JSON 备份文件
  exportJSON(data, slotId = null) {
    const id = slotId || this.getActiveSlotId();
    const jsonStr = JSON.stringify({
      game: 'Mota World: Rebirth',
      version: '2.0.0',
      slotId: id,
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      saveData: data
    }, null, 2);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mota_world_slot${id}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // 导入外部 JSON 恢复数据
  importJSON(file, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && (parsed.saveData || parsed.data)) {
          callback(null, parsed.saveData || parsed.data);
        } else {
          callback(new Error('无效的《魔塔世界》存档文件格式'));
        }
      } catch (err) {
        callback(err);
      }
    };
    reader.readAsText(file);
  }
};

