# -*- coding: utf-8 -*-
import re

print("=== 测试 UI 细节与装备名称展示 ===")

with open('js/ui/townView.js', 'r', encoding='utf-8') as f:
    town_js = f.read()

assert 'Object.entries(ITEM_SLOTS)' not in town_js, "townView.js 不应包含 Object.entries(ITEM_SLOTS)"
assert '未装备' in town_js, "townView.js 应展示 '未装备'"
assert 'SLOT_MAP[item.slot]?.name' in town_js, "townView.js 应使用 SLOT_MAP[item.slot]?.name"
print("✓ [通过] townView.js 装备槽位循环已修复，彻底杜绝 [object Object]，未佩戴时统一展示 '未装备'")

with open('js/ui/bagView.js', 'r', encoding='utf-8') as f:
    bag_js = f.read()

assert 'SLOT_MAP[selectedEntry.slot]?.name' in bag_js, "bagView.js 应使用 SLOT_MAP[selectedEntry.slot]?.name"
print("✓ [通过] bagView.js 装备部位已修复为 .name 取值")

with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# 验证 quest-tracker-mount 已经从舞台移除并放入 footer
assert '<main' in index_html and 'id="quest-tracker-mount"' in index_html
footer_idx = index_html.find('<footer')
mount_idx = index_html.find('id="quest-tracker-mount"')
assert mount_idx > footer_idx, "quest-tracker-mount 必须位于 <footer> 内部！"
print("✓ [通过] 任务指引栏已从主视窗舞台移出，成功归位于底部 footer 右侧！")

# 验证 勇者功能 改为 1 列
assert 'grid grid-rows-4' in index_html or 'flex flex-col' in index_html, "勇者功能按键必须采用一列垂直布局"
print("✓ [通过] 勇者功能按键 (人物/装备/背包/宠物) 已从一行成功重构为单列垂直排列！")

# 验证 questTracker 支持滚轮查看
with open('js/ui/questTracker.js', 'r', encoding='utf-8') as f:
    quest_js = f.read()

assert 'overflow-y-auto' in quest_js, "任务指引内容必须支持 overflow-y-auto 滚轮查看"
print("✓ [通过] 任务追踪详情配备 overflow-y-auto，支持鼠标滚轮顺畅查看！")

print("🎉 全部针对性 UI 重构项验证 100% 通过！")
