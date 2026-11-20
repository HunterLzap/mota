# 野外怪物单图（individual）落盘目录

本目录**当前为空占位**，只存放待接入的**单只怪物/首领高清透明头图**（用户生成后由美术资产落盘）。**不引用、不裁切、不改动任何现有原图**——旧图集与既有图片一律保持不动。
接入方式在用户图到位后另行确认；本目录只按严格命名收图。

## 命名规则（严格）
- 文件名 = key，扩展名 `.png`，全小写，如 `monster_wolf.png`。
- 规格：**1:1 正方形、边长 ≥ 768px（推荐 1024）**、**透明背景 RGBA**、单体居中、同区域光照/笔触一致。
- 不写文字/水印/logo/边框/背景场景。

## 21 个待生成 key（与 `PROMPTS.md` §1、`js/ui/wildArtwork.js` 一致）

| 区域 | key | 名称 |
|---|---|---|
| 森林 | `monster_wolf` | 丛林灰狼 |
| 森林 | `monster_goblin` | 哥布林强盗 |
| 森林 | `monster_bear` | 林地狂暴棕熊 |
| 森林（领主） | `boss_forest` | 暗夜狼王·芬里尔 |
| 峡谷 | `monster_lizard` | 石化毒蜥 |
| 峡谷 | `monster_mage` | 流浪黑巫师 |
| 峡谷 | `monster_ogre` | 峡谷巨锤食人魔 |
| 峡谷（领主） | `boss_canyon` | 峡谷守护魔像·石心 |
| 荒原 | `monster_bird` | 骨刺雷鸟 |
| 荒原 | `monster_centaur` | 荒原骨铠半人马 |
| 荒原 | `monster_rex` | 龙血暴龙 |
| 荒原（领主） | `boss_wasteland` | 暴君龙皇·戈尔贡 |
| 沼泽 | `monster_slime` | 深渊腐臭泥沼怪 |
| 沼泽 | `monster_siren` | 暗影水妖射手 |
| 沼泽 | `monster_hydra` | 沼泽九头巨蟒 |
| 沼泽（领主） | `boss_swamp` | 深渊巨蛇·利维坦 |
| 熔岩 | `monster_golem` | 熔火黑曜石巨人 |
| 熔岩 | `monster_dragon_guard` | 烈焰黑龙侍从 |
| 熔岩 | `monster_boss_guard` | 黑翼龙誓守卫长 |
| 熔岩（领主） | `boss_volcano` | 灭世龙皇·黑翼奥杜因 |
| 高危支线 | `boss_thief` | 黑羽蒙面女盗 |

## 别名（不用单独生成）
- `boss_dragonking`（剧情终战黑翼龙皇，无野外入口）复用 `boss_volcano.png`。

## 校验
生成后运行：`python output/wild-art-audio-2026-11-03/verify_portraits.py`
会逐项检查：文件名是否在 21 key 内、是否方形、边长是否 ≥768、是否含透明通道、是否多余/缺失。
机器清单见 `output/wild-art-audio-2026-11-03/PORTRAIT_MAP.json`。
