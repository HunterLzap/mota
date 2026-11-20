// 城市商店配置：每主城一间商店，金币/魔晶消费 + 声望档位解锁 + 每行动日限购。
// 关键口径：声望只作「解锁门槛」（不消耗），与 arena.js 的「声望军需商行（消耗声望兑换）」区分。
// 经济安全：只卖过渡装/特色散件（不带 setId，绝不卖 OFFICIAL_SETS 核心套件）；价格按 §5 锚定。
import { SPECIAL_ITEMS } from './items.js';

const S = SPECIAL_ITEMS;

// 总开关（可回滚）：关闭后入口隐藏、getCityShop 返回失败、buyCityShopGoods 拒绝。
export const ENABLE_CITY_SHOPS = true;

// 声望档位（门槛，不扣声望）
export const SHOP_PRESTIGE_TIERS = Object.freeze([
  { tier: 0, minPrestige: 0, label: '凡人' },
  { tier: 1, minPrestige: 1000, label: '见习' },
  { tier: 2, minPrestige: 3000, label: '精英' },
  { tier: 3, minPrestige: 6000, label: '英杰' },
  { tier: 4, minPrestige: 10000, label: '传奇' }
]);

// 货架分类（UI 页签顺序）
export const SHOP_CATEGORIES = Object.freeze([
  { id: 'consumable', label: '消耗品' },
  { id: 'material', label: '材料' },
  { id: 'equipment', label: '装备' },
  { id: 'rare', label: '珍稀' }
]);

// 返回给定声望所处的档位下标（0..4）
export function prestigeTierOf(prestige) {
  const p = Number.isFinite(prestige) && prestige > 0 ? prestige : 0;
  let idx = 0;
  for (const t of SHOP_PRESTIGE_TIERS) if (p >= t.minPrestige) idx = t.tier;
  return idx;
}

// —— 特色散件（非套装，setId 一律不带） ——
const shopGear = (id, name, slot, quality, reqLevel, stats, icon, desc) =>
  ({ id, name, slot, quality, reqLevel, stats, icon, desc });

export const CITY_SHOPS = {
  royal_capital: {
    id: 'royal_capital',
    cityName: '圣光王都',
    shopName: '皇家商会',
    icon: 'images/ui/nation_aden.svg',
    categories: ['consumable', 'material', 'equipment', 'rare'],
    goods: [
      { id: 'royal_petfood', name: '魔能兽肉排 ×3', category: 'consumable', icon: S.pet_food.icon,
        price: { gold: 240, crystal: 0 }, unlock: { level: 1, tier: 0 }, limit: { perDay: 5 },
        itemData: { ...S.pet_food, count: 3 } },
      { id: 'royal_petfood_lux', name: '豪华宠物饼干 ×1', category: 'consumable', icon: S.pet_food_luxury.icon,
        price: { gold: 260, crystal: 0 }, unlock: { level: 1, tier: 0 }, limit: { perDay: 3 },
        itemData: { ...S.pet_food_luxury, count: 1 } },

      { id: 'royal_crystal_gold', name: '黄金晶石 ×2', category: 'material', icon: S.crystal_gold.icon,
        price: { gold: 800, crystal: 0 }, unlock: { level: 20, tier: 1 }, limit: { perDay: 4 },
        itemData: { ...S.crystal_gold, count: 2 } },
      { id: 'royal_socket', name: '打孔水晶 ×1', category: 'material', icon: S.socket_crystal.icon,
        price: { gold: 300, crystal: 0 }, unlock: { level: 10, tier: 1 }, limit: { perDay: 2 },
        itemData: { ...S.socket_crystal, count: 1 } },
      { id: 'royal_protect', name: '保护水晶 ×1', category: 'material', icon: S.protect_crystal.icon,
        price: { gold: 900, crystal: 0 }, unlock: { level: 20, tier: 2 }, limit: { perDay: 2 },
        itemData: { ...S.protect_crystal, count: 1 } },
      { id: 'royal_star', name: '升星水晶 ×1', category: 'material', icon: S.star_crystal.icon,
        price: { gold: 700, crystal: 0 }, unlock: { level: 20, tier: 1 }, limit: { perDay: 3 },
        itemData: { ...S.star_crystal, count: 1 } },

      { id: 'royal_blade_20', name: '王都制式长剑', category: 'equipment', icon: 'images/items/wpn_sword.svg',
        price: { gold: 1600, crystal: 0 }, unlock: { level: 20, tier: 2 }, limit: { perDay: 1 },
        itemData: shopGear('shop_royal_blade', '王都制式长剑', 'weapon', 'gold', 20, { atk: 120, str: 20 }, 'images/items/wpn_sword.svg', '王都军械库制式长剑，攻守均衡的过渡武器。') },
      { id: 'royal_plate_20', name: '王都制式胸甲', category: 'equipment', icon: 'images/items/arm_chest.svg',
        price: { gold: 1600, crystal: 0 }, unlock: { level: 20, tier: 2 }, limit: { perDay: 1 },
        itemData: shopGear('shop_royal_plate', '王都制式胸甲', 'armor', 'gold', 20, { def: 90, hp: 500 }, 'images/items/arm_chest.svg', '王都军械库制式胸甲，堆叠防御与生命。') },

      { id: 'royal_egg', name: '远古神兽契约蛋 ×1', category: 'rare', icon: S.pet_egg.icon,
        price: { gold: 8000, crystal: 40 }, unlock: { level: 30, tier: 3 }, limit: { perDay: 1 },
        itemData: { ...S.pet_egg, count: 1 } },
      { id: 'royal_book_purify', name: '远古魔导书·【神圣净化】', category: 'rare', icon: 'images/items/skill_book.svg',
        price: { gold: 6000, crystal: 60 }, unlock: { level: 40, tier: 4 }, limit: { perDay: 1 },
        itemData: { id: 'book_purify', name: '远古魔导书·【神圣净化】', bookId: 'book_purify', count: 1, type: 'skill_book', quality: 'darkgold', icon: 'images/items/skill_book.svg', desc: '免疫首领剧毒、虚弱、减速与控制；须体力不少于60的出战神兽携带。' } }
    ]
  },

  kester: {
    id: 'kester',
    cityName: '克斯特',
    shopName: '林地集市',
    icon: 'images/ui/nation_kester.svg',
    categories: ['consumable', 'material', 'equipment', 'rare'],
    goods: [
      { id: 'kester_basic', name: '普通宠物口粮 ×3', category: 'consumable', icon: S.pet_food_basic.icon,
        price: { gold: 120, crystal: 0 }, unlock: { level: 1, tier: 0 }, limit: { perDay: 5 },
        itemData: { ...S.pet_food_basic, count: 3 } },
      { id: 'kester_bait', name: '高级鱼饵 ×2', category: 'consumable', icon: S.bait_luxury.icon,
        price: { gold: 200, crystal: 0 }, unlock: { level: 10, tier: 1 }, limit: { perDay: 3 },
        itemData: { ...S.bait_luxury, count: 2 } },

      { id: 'kester_crystal_gold', name: '黄金晶石 ×2', category: 'material', icon: S.crystal_gold.icon,
        price: { gold: 800, crystal: 0 }, unlock: { level: 20, tier: 1 }, limit: { perDay: 4 },
        itemData: { ...S.crystal_gold, count: 2 } },
      { id: 'kester_gem_dex', name: '翡翠石（速度）', category: 'material', icon: 'images/items/gem_dex.svg',
        price: { gold: 700, crystal: 0 }, unlock: { level: 20, tier: 2 }, limit: { perDay: 2 },
        itemData: { id: 'gem_dex', name: '翡翠石', stat: 'speed', val: 8, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_dex.svg', desc: '速度+8' } },

      { id: 'kester_bow_25', name: '密林游侠长弓', category: 'equipment', icon: 'images/items/wpn_bow.svg',
        price: { gold: 2000, crystal: 0 }, unlock: { level: 25, tier: 2 }, limit: { perDay: 1 },
        itemData: shopGear('shop_kester_bow', '密林游侠长弓', 'weapon', 'gold', 25, { atk: 150, dex: 22, crit: 6, dodge: 5 }, 'images/items/wpn_bow.svg', '克斯特林地制式长弓，偏敏捷与暴击的过渡武器。') },
      { id: 'kester_boots_25', name: '密林轻履', category: 'equipment', icon: 'images/items/eq_boots.svg',
        price: { gold: 2000, crystal: 0 }, unlock: { level: 25, tier: 2 }, limit: { perDay: 1 },
        itemData: shopGear('shop_kester_boots', '密林轻履', 'boots', 'gold', 25, { def: 60, speed: 18, dodge: 6 }, 'images/items/eq_boots.svg', '克斯特轻履，兼顾防御与灵动。') },

      { id: 'kester_evo', name: '进化石 ×1', category: 'rare', icon: S.evolution_stone.icon,
        price: { gold: 9000, crystal: 50 }, unlock: { level: 30, tier: 3 }, limit: { perDay: 1 },
        itemData: { ...S.evolution_stone, count: 1 } },
      { id: 'kester_crystal_purple', name: '紫金晶石 ×2', category: 'rare', icon: S.crystal_purplegold.icon,
        price: { gold: 6000, crystal: 40 }, unlock: { level: 50, tier: 3 }, limit: { perDay: 1 },
        itemData: { ...S.crystal_purplegold, count: 2 } }
    ]
  },

  aden: {
    id: 'aden',
    cityName: '亚丁',
    shopName: '冰雪商行',
    icon: 'images/ui/nation_aden.svg',
    categories: ['consumable', 'material', 'equipment', 'rare'],
    goods: [
      { id: 'aden_petfood_lux', name: '豪华宠物饼干 ×1', category: 'consumable', icon: S.pet_food_luxury.icon,
        price: { gold: 260, crystal: 0 }, unlock: { level: 1, tier: 0 }, limit: { perDay: 3 },
        itemData: { ...S.pet_food_luxury, count: 1 } },

      { id: 'aden_crystal_dark', name: '暗金晶石 ×2', category: 'material', icon: S.crystal_darkgold.icon,
        price: { gold: 1600, crystal: 10 }, unlock: { level: 30, tier: 2 }, limit: { perDay: 3 },
        itemData: { ...S.crystal_darkgold, count: 2 } },
      { id: 'aden_diamond', name: '碎裂金刚钻 ×1', category: 'material', icon: S.diamond_1.icon,
        price: { gold: 1200, crystal: 0 }, unlock: { level: 20, tier: 2 }, limit: { perDay: 2 },
        itemData: { ...S.diamond_1, count: 1 } },
      { id: 'aden_gem_def', name: '玛瑙石（防御）', category: 'material', icon: 'images/items/gem_def.svg',
        price: { gold: 700, crystal: 0 }, unlock: { level: 20, tier: 2 }, limit: { perDay: 2 },
        itemData: { id: 'gem_def', name: '玛瑙石', stat: 'def', val: 18, type: 'gem', quality: 'darkgold', icon: 'images/items/gem_def.svg', desc: '防御值+18' } },

      { id: 'aden_plate_30', name: '冰雪重装胸甲', category: 'equipment', icon: 'images/items/arm_chest.svg',
        price: { gold: 3500, crystal: 0 }, unlock: { level: 30, tier: 2 }, limit: { perDay: 1 },
        itemData: shopGear('shop_aden_plate', '冰雪重装胸甲', 'armor', 'darkgold', 30, { def: 160, hp: 900, dmgResist: 6 }, 'images/items/arm_chest.svg', '亚丁重装制式胸甲，堆叠防御、生命与减伤。') },
      { id: 'aden_helm_30', name: '冰雪重盔', category: 'equipment', icon: 'images/items/eq_helmet.svg',
        price: { gold: 3000, crystal: 0 }, unlock: { level: 30, tier: 2 }, limit: { perDay: 1 },
        itemData: shopGear('shop_aden_helm', '冰雪重盔', 'helmet', 'darkgold', 30, { def: 120, hp: 400 }, 'images/items/eq_helmet.svg', '亚丁重盔，坚实可靠的过渡头防。') },

      { id: 'aden_crystal_purple', name: '紫金晶石 ×2', category: 'rare', icon: S.crystal_purplegold.icon,
        price: { gold: 6000, crystal: 40 }, unlock: { level: 50, tier: 3 }, limit: { perDay: 1 },
        itemData: { ...S.crystal_purplegold, count: 2 } },
      { id: 'aden_destiny', name: '天命石 ×1', category: 'rare', icon: S.destiny_stone.icon,
        price: { gold: 10000, crystal: 80 }, unlock: { level: 50, tier: 4 }, limit: { perDay: 1 },
        itemData: { ...S.destiny_stone, count: 1 } }
    ]
  }
};
