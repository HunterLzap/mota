// 主城配置：王都 / 克斯特 / 亚丁 + 城际传送 + 各城设施与特色资源点。
// 功能视图 id 与 townView 现有子视图一致（smithy/palace/tavern/fishing/dragons/faction_war/stable/shop），仅 displayName 按城风格化，功能不变。
export const ENABLE_CITIES = true; // 回滚开关：false → 仅王都

const F = (id, icon, name, desc) => ({ id, icon, name, desc });

export const CITY_ORDER = ['capital', 'keste', 'aden'];

export const CITIES = {
  capital: {
    id: 'capital',
    name: '亚诺圣光王都',
    short: '圣光王都',
    scene: 'images/scenes/royal-capital.png',
    shopCityId: 'royal_capital',
    shopLabel: '皇家商会',
    unlockLevel: 0,
    facilities: [
      F('smithy', 'bld_smithy', '皇家铁匠铺', '升星 · 镶嵌 · 重铸 · 修理'),
      F('palace', 'bld_palace', '圣王大殿', '王国俸禄 · 封号试炼 · 角斗场'),
      F('tavern', 'bld_tavern', '亚诺皇家酒馆', '悬赏委托 · 佣兵契约 · 特酿'),
      F('fishing', 'bld_fishing', '碧波水域', '垂钓渔获 · 兑换魔晶'),
      F('dragons', 'bld_dragons', '远古屠龙圣殿', '三阶恶龙 · 神兽突破材料'),
      F('faction_war', 'nation_aden', '边境要塞', '攻打守军 · 积累战功 · 晋升军衔'),
      F('stable', 'ui_pet', '皇家兽栏', '宠物体力 · 三档食品 · 金币喂养'),
      F('shop', 'bld_palace', '皇家商会', '补给 · 材料 · 过渡装 · 珍稀')
    ],
    special: null
  },

  keste: {
    id: 'keste',
    name: '克斯特·密林王庭',
    short: '克斯特',
    scene: 'images/scenes/city_keste.png',
    shopCityId: 'kester',
    shopLabel: '林地集市',
    unlockLevel: 20,
    facilities: [
      F('smithy', 'bld_smithy', '密林工坊', '升星 · 镶嵌 · 重铸 · 修理'),
      F('palace', 'bld_palace', '精灵议事厅', '王国俸禄 · 封号试炼 · 角斗场'),
      F('tavern', 'bld_tavern', '林间酒馆', '悬赏委托 · 佣兵契约 · 特酿'),
      F('fishing', 'bld_fishing', '林涧溪流', '垂钓渔获 · 兑换魔晶'),
      F('dragons', 'bld_dragons', '屠龙圣殿', '三阶恶龙 · 神兽突破材料'),
      F('faction_war', 'nation_aden', '边境要塞', '攻打守军 · 积累战功 · 晋升军衔'),
      F('stable', 'ui_pet', '林地兽栏', '宠物体力 · 三档食品 · 金币喂养'),
      F('shop', 'bld_palace', '林地集市', '补给 · 材料 · 过渡装 · 珍稀')
    ],
    special: { id: 'herb_garden', name: '林地草药园', desc: '每行动日限 1 次采集三系草药', icon: 'bld_herb_garden' }
  },

  aden: {
    id: 'aden',
    name: '亚丁·寒霜王城',
    short: '亚丁',
    scene: 'images/scenes/city_aden.png',
    shopCityId: 'aden',
    shopLabel: '冰雪商行',
    unlockLevel: 40,
    facilities: [
      F('smithy', 'bld_smithy', '寒霜铁铺', '升星 · 镶嵌 · 重铸 · 修理'),
      F('palace', 'bld_palace', '城主席', '王国俸禄 · 封号试炼 · 角斗场'),
      F('tavern', 'bld_tavern', '冰原酒馆', '悬赏委托 · 佣兵契约 · 特酿'),
      F('fishing', 'bld_fishing', '寒渊水域', '垂钓渔获 · 兑换魔晶'),
      F('dragons', 'bld_dragons', '屠龙圣殿', '三阶恶龙 · 神兽突破材料'),
      F('faction_war', 'nation_aden', '边境要塞', '攻打守军 · 积累战功 · 晋升军衔'),
      F('stable', 'ui_pet', '霜寒兽栏', '宠物体力 · 三档食品 · 金币喂养'),
      F('shop', 'bld_palace', '冰雪商行', '补给 · 材料 · 过渡装 · 珍稀')
    ],
    special: { id: 'frost_armory', name: '寒霜军械', desc: '每行动日限 1 次领取军械材料', icon: 'bld_frost_armory' }
  }
};

// 特色设施每日资源点奖励（复用 resetDailyActivities 刷新）
export const CITY_SPECIAL_REWARDS = {
  keste: { herbs: { herb_dragonblood: 5, herb_starlight: 5, herb_spiritflower: 5 } },
  aden: { items: [{ id: 'star_crystal', count: 2 }, { id: 'crystal_darkgold', count: 1 }] }
};
