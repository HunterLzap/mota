// 《魔塔世界》全量原画与矢量资产管理中枢
// 遵循《魔域》复古粗粝暗黑西幻美术铁律，所有条目对应 images/ 目录下 100% 存在的矢量贴图资产，便于后续 1:1 无损替换。

export const ASSET_PATHS = {
  // 1. 地图与场景全景套图 (16:9)
  maps: {
    forest: 'images/maps/map_forest.svg',
    canyon: 'images/maps/map_canyon.svg',
    wasteland: 'images/maps/map_wasteland.svg',
    swamp: 'images/maps/map_swamp.svg',
    volcano: 'images/maps/map_volcano.svg',
    castle: 'images/maps/map_castle.svg',
    palace: 'images/maps/map_palace.svg',
    smithy: 'images/maps/map_smithy.svg',
    dragons: 'images/maps/map_dragons.svg',
    fishing: 'images/maps/map_fishing.svg',
    tavern: 'images/maps/map_tavern.svg',
    arena: 'images/maps/map_arena.svg',
    world_map: 'images/maps/world_map.svg',
    city_bg: 'images/maps/city_bg.svg',
    tower_bg: 'images/maps/tower_bg.svg'
  },

  // 2. 10大装备槽位标准原画 (1:1)
  equipment: {
    weapon: 'images/items/wpn_sword.svg',
    weapon_staff: 'images/items/wpn_staff.svg',
    weapon_bow: 'images/items/wpn_bow.svg',
    armor: 'images/items/arm_chest.svg',
    robe: 'images/items/arm_robe.svg',
    pants: 'images/items/eq_pants.svg',
    cloak: 'images/items/eq_cloak.svg',
    helmet: 'images/items/eq_helmet.svg',
    gloves: 'images/items/eq_gloves.svg',
    boots: 'images/items/eq_boots.svg',
    belt: 'images/items/eq_belt.svg',
    necklace: 'images/items/eq_necklace.svg',
    ring: 'images/items/eq_ring.svg',
    shield: 'images/items/shield.svg'
  },

  // 3. 核心道具与材料原画 (1:1)
  items: {
    key_redwood: 'images/items/key_redwood.svg',
    key_bronze: 'images/items/key_bronze.svg',
    key_platinum: 'images/items/key_platinum.svg',
    star_crystal: 'images/items/star_crystal.svg',
    protect_crystal: 'images/items/crystal_protect.svg',
    crystal_protect: 'images/items/crystal_protect.svg',
    socket_crystal: 'images/items/crystal_socket.svg',
    crystal_socket: 'images/items/crystal_socket.svg',
    diamond_1: 'images/items/crystal_socket.svg',
    skill_book: 'images/items/skill_book.svg',
    evolution_stone: 'images/items/evolution_stone.svg',
    destiny_stone: 'images/items/destiny_stone.svg',
    pet_food: 'images/items/pet_food.svg',
    pill_reborn: 'images/items/pill_reborn.svg',
    potion_hp: 'images/items/potion_hp.svg',
    potion_mp: 'images/items/potion_mp.svg',
    scroll_tp: 'images/items/scroll_tp.svg',
    bait_normal: 'images/items/bait_normal.svg',
    bait_luxury: 'images/items/bait_luxury.svg',
    crystal_gold: 'images/items/crystal_gold.svg',
    crystal_darkgold: 'images/items/crystal_darkgold.svg',
    crystal_purplegold: 'images/items/crystal_purplegold.svg',
    key_mithril: 'images/items/key_mithril.svg',
    key_obsidian: 'images/items/key_obsidian.svg',
    rune_stone: 'images/items/rune_stone.svg',
    rune_el: 'images/items/rune_stone.svg',
    rune_sol: 'images/items/rune_stone.svg',
    rune_dol: 'images/items/rune_stone.svg',
    rune_lo: 'images/items/rune_stone.svg',
    rune_jah: 'images/items/rune_stone.svg',
    rune_cham: 'images/items/rune_stone.svg',
    rune_ith: 'images/items/rune_stone.svg',
    rune_ber: 'images/items/rune_stone.svg',
    key_titan: 'images/items/key_titan.svg',
    relic_holy: 'images/items/relic_holy.svg',
    relic_spear: 'images/items/relic_spear.svg',
    relic_scabbard: 'images/items/relic_scabbard.svg',
    relic_flame: 'images/items/relic_flame.svg',
    relic_ring: 'images/items/relic_ring.svg',
    relic_hammer: 'images/items/relic_hammer.svg',
    relic_tree: 'images/items/relic_tree.svg',
    fish_lamprey: 'images/items/fish_lamprey.svg',
    fish_arowana: 'images/items/fish_arowana.svg',
    coin_gold: 'images/items/coin_gold.svg'
  },

  // 4. 原著神兽代表立绘与头像 (1:1 或 3:4)
  pets: {
    golden_dragon: 'images/pets/pet_golden_dragon.svg',
    mermaid: 'images/pets/pet_mermaid.svg',
    phoenix: 'images/pets/pet_phoenix.svg',
    silver_dragon: 'images/pets/pet_silver_dragon.svg',
    pegasus: 'images/pets/pet_pegasus.svg',
    gryphon: 'images/pets/pet_gryphon.svg',
    succubus: 'images/pets/pet_succubus.svg',
    white_angel: 'images/pets/pet_white_angel.svg',
    black_angel: 'images/pets/pet_black_angel.svg',
    faerie_dragon: 'images/pets/pet_faerie_dragon.svg',
    thunderbird: 'images/pets/pet_thunderbird.svg',
    djinn: 'images/pets/pet_djinn.svg',
    imp: 'images/pets/pet_imp.svg',
    nightmare: 'images/pets/pet_nightmare.svg',
    medusa: 'images/pets/pet_medusa.svg',
    winter_wolf: 'images/pets/pet_winter_wolf.svg',
    sphinx: 'images/pets/pet_sphinx.svg',
    unicorn: 'images/pets/pet_unicorn.svg',
    naga: 'images/pets/pet_naga.svg',
    pixie: 'images/pets/pet_pixie.svg',
    light_wisp: 'images/pets/pet_light_wisp.svg',
    harpy: 'images/pets/pet_harpy.svg'
  },

  // 5. 领主与首领原画 (3:4 或 1:1)
  bosses: {
    thief: 'images/bosses/boss_thief.svg',
    dragon_red: 'images/bosses/boss_dragon_red.svg',
    dragon_silver: 'images/bosses/boss_dragon_silver.svg',
    dragon_golden: 'images/bosses/boss_dragon_golden.svg'
  },

  // 6. UI 战旗与槽位水印
  ui: {
    nation_aden: 'images/ui/nation_aden.svg',
    nation_kester: 'images/ui/nation_kester.svg',
    nation_sagael: 'images/ui/nation_sagael.svg',
    slot_weapon: 'images/ui/slot_weapon.svg',
    slot_armor: 'images/ui/slot_armor.svg',
    slot_pants: 'images/ui/slot_pants.svg',
    slot_cloak: 'images/ui/slot_cloak.svg',
    slot_helmet: 'images/ui/slot_helmet.svg',
    slot_gloves: 'images/ui/slot_gloves.svg',
    slot_boots: 'images/ui/slot_boots.svg',
    slot_belt: 'images/ui/slot_belt.svg',
    slot_necklace: 'images/ui/slot_necklace.svg',
    slot_ring: 'images/ui/slot_ring.svg',
    gate_trial: 'images/ui/gate_trial.svg',
    gate_courage: 'images/ui/gate_courage.svg',
    gate_mirage: 'images/ui/gate_mirage.svg',
    gate_death: 'images/ui/gate_death.svg',
    gate_storm: 'images/ui/gate_storm.svg',
    gate_dragon: 'images/ui/gate_dragon.svg',
    gate_spacetime: 'images/ui/gate_spacetime.svg'
  }
};

/**
 * 智能渲染器：若图片存在则展示图片，若图片加载失败无缝降级为 SVG 矢量后备内容
 */
export function renderAssetImg(src, fallbackContent, wrapperClass = 'w-10 h-10', imgClass = 'object-contain', alt = '') {
  const uid = 'img_' + Math.random().toString(36).substr(2, 6);
  return `
    <span class="inline-flex items-center justify-center relative ${wrapperClass}">
      <img id="${uid}" src="${src}" alt="${alt}" 
        onload="const f = this.nextElementSibling; if(f) f.style.display='none';" 
        onerror="this.style.display='none'; const f = this.nextElementSibling; if(f) f.style.display='inline-flex';" 
        class="w-full h-full ${imgClass} pointer-events-none drop-shadow">
      <span class="inline-flex items-center justify-center w-full h-full pointer-events-none">
        ${fallbackContent}
      </span>
    </span>
  `;
}
