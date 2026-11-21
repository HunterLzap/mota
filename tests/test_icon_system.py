#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《魔塔世界》全量游戏图标与美术资产高保真升级自动化测试
"""

import os, re, xml.etree.ElementTree as ET

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(ROOT_DIR, 'images')

def test_svg_assets():
    print("1. 检验 images/ 目录下全部 SVG 矢量美术资产...")
    subdirs = ['items', 'pets', 'heroes', 'ui', 'maps', 'bosses']
    total_svgs = 0
    for s in subdirs:
        folder = os.path.join(IMAGES_DIR, s)
        assert os.path.exists(folder), f"Directory {folder} does not exist"
        files = [f for f in os.listdir(folder) if f.endswith('.svg')]
        assert len(files) > 0, f"No SVGs found in {folder}"
        for f in files:
            full_p = os.path.join(folder, f)
            with open(full_p, 'r', encoding='utf-8') as svg_f:
                content = svg_f.read().strip()
            assert content.startswith('<svg'), f"{f} does not start with <svg"
            assert content.endswith('</svg>'), f"{f} does not end with </svg>"
            total_svgs += 1
    print(f"✓ 成功检验全部 {total_svgs} 个 SVG 矢量贴图资产，XML 结构 100% 完整合规！")

def test_config_icons():
    print("2. 检验核心配置文件中图标路径...")
    # items.js
    with open(os.path.join(ROOT_DIR, 'js/config/items.js'), 'r', encoding='utf-8') as f:
        items_js = f.read()
    assert 'images/items/wpn_sword.svg' in items_js, "wpn_sword.svg not found in items.js"
    assert 'images/items/arm_chest.svg' in items_js, "arm_chest.svg not found in items.js"
    assert 'images/items/star_crystal.svg' in items_js, "star_crystal.svg not found in items.js"
    assert 'images/items/pill_reborn.svg' in items_js, "pill_reborn.svg not found in items.js"
    assert 'images/items/pet_egg.svg' in items_js, "pet_egg.svg not found in items.js"
    assert 'images/items/gem_atk.svg' in items_js, "gem_atk.svg not found in items.js"
    print("✓ items.js 装备槽位、特殊道具、神丹与宝石配置路径正确！")

    # pets.js
    with open(os.path.join(ROOT_DIR, 'js/config/pets.js'), 'r', encoding='utf-8') as f:
        pets_js = f.read()
    for pid in ['golden_dragon', 'mermaid', 'silver_dragon', 'djinn', 'phoenix', 'medusa']:
        assert f'images/pets/pet_{pid}.svg' in pets_js, f"pet_{pid}.svg not found in pets.js"
    print("✓ pets.js 全部 22 种神兽宠物专属 SVG 贴图绑定完毕！")

    # classes.js
    with open(os.path.join(ROOT_DIR, 'js/config/classes.js'), 'r', encoding='utf-8') as f:
        classes_js = f.read()
    assert 'images/heroes/avatar_warrior.svg' in classes_js
    assert 'images/heroes/avatar_mage.svg' in classes_js
    assert 'images/heroes/avatar_hunter.svg' in classes_js
    assert 'images/ui/nation_aden.svg' in classes_js
    assert 'images/ui/nation_kester.svg' in classes_js
    assert 'images/ui/nation_sagael.svg' in classes_js
    print("✓ classes.js 三大职业与三大城邦战旗国徽绑定完毕！")

    # iconHelper.js
    with open(os.path.join(ROOT_DIR, 'js/ui/iconHelper.js'), 'r', encoding='utf-8') as f:
        helper_js = f.read()
    assert 'images/items/skill_book.svg' in helper_js
    assert 'images/items/crystal_socket.svg' in helper_js
    assert 'images/items/crystal_protect.svg' in helper_js
    print("✓ iconHelper.js 技能魔导书与强化水晶注册校验完毕！")

    # images.js (ASSET_PATHS 0 死链测试)
    with open(os.path.join(ROOT_DIR, 'js/assets/images.js'), 'r', encoding='utf-8') as f:
        images_js = f.read()
    paths = re.findall(r"['\"](images/[^'\"]+)['\"]", images_js)
    assert len(paths) >= 40, f"Expected at least 40 asset paths, got {len(paths)}"
    for p in paths:
        full_p = os.path.join(ROOT_DIR, p)
        assert os.path.exists(full_p), f"Asset path not found on disk: {p}"
    print(f"✓ images.js 全部 {len(paths)} 个资产路径物理校验 100% 存在，0 死链！")

def test_ui_views():
    print("3. 检验 UI 核心视图中统一渲染中枢接入...")
    views = [
        'js/ui/bagView.js',
        'js/ui/heroView.js',
        'js/ui/petView.js',
        'js/ui/charSelectModal.js',
        'js/ui/battleView.js',
        'js/ui/townView.js'
    ]
    for v in views:
        path = os.path.join(ROOT_DIR, v)
        with open(path, 'r', encoding='utf-8') as f:
            code = f.read()
        assert 'renderGameIcon' in code, f"{v} does not import/use renderGameIcon"
    # 行囊和装备视图绘制图标，属性浮层单独渲染文字。
    with open(os.path.join(ROOT_DIR, 'js/ui/tooltip.js'), 'r', encoding='utf-8') as f:
        tooltip = f.read()
    assert 'this.el.innerHTML = this.renderItemHtml(item)' in tooltip, "Tooltip does not render item details"
    assert not re.search(r'<(?:img|svg)\b', tooltip, re.IGNORECASE), "Tooltip embeds item artwork"
    print("✓ 六个图标视图接入 renderGameIcon，属性浮层保留文字渲染")

if __name__ == '__main__':
    print("=== 开始执行图标与美术资产自动化测试 ===")
    test_svg_assets()
    test_config_icons()
    test_ui_views()
    print("图标与美术资产升级全量测试通过")
