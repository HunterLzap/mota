# 重构执行记录

2026-11-21 在已有的 `refactor/mota-stability-and-arch` 分支执行基线验收。起点为 `f9a9066`，工作区干净。

| 任务 | 内容 | 状态 |
| --- | --- | --- |
| T0.0 | 修复图标基线断言 | DONE |
| T0.1 | 分支与基线 | DONE |
| T1.1 | 取消跟踪输出产物 | PENDING |
| T1.2 | 项目状态归档 | PENDING |
| T1.3 | 项目 README | PENDING |
| T2.1 | 存档租约和监听清理 | PENDING |
| T2.2 | 行动日键与字符串方法 | PENDING |
| T2.3 | 启动错误提示 | PENDING |
| T3.1 | 顶栏缓存与重绘 | PENDING |
| T3.2 | 战斗行动间隔与佣兵配置 | PENDING |
| T4.1 | 视图路由与调试接口 | PENDING |
| T4.2 | GameState 领域拆分 | PENDING |
| T4.3 | 战斗执行阶段拆分 | PENDING |
| T5.1 | 诊断脚本迁移 | PENDING |
| T5.2 | 核心模块单元测试 | PENDING |

T4.2a、T4.2b、T4.2c、T4.2d 均为 PENDING，分别对应角色属性、神兽、庄园与活动。

## T0.1 基线

Windows 上用可用的 Python 3.12 执行 `python -X utf8`。

| 命令 | 结果 |
| --- | --- |
| `python -X utf8 tests/verify_all.py` | 通过 |
| `python -X utf8 tests/test_browser_syntax_and_init.py` | 通过 |
| `python -X utf8 tests/test_icon_system.py` | 连续三次失败 |
| `python -X utf8 tests/test_all_features_e2e.py` | 通过 |
| `python -X utf8 tests/test_game_logic.py` | 通过 |

`tests/test_icon_system.py:26` 报 `AssertionError: slot_bracelet.svg does not end with </svg>`。`images/ui/slot_bracelet.svg` 与起点提交内容逐字节一致，可通过 XML 解析，文件末尾在 `</svg>` 后有换行。仅在内存中忽略末尾空白后做诊断，发现 `tests/test_icon_system.py:94` 还要求 `js/ui/tooltip.js` 包含 `renderGameIcon`。

T0.1 的变更范围只允许分支操作和执行记录。确认工作区干净后执行了 `git checkout -- .`。该步未通过，未创建成功提交，后续任务等待基线问题处理。

## T0.0 基线修复

按补充授权，SVG 首尾检查前调用 `.strip()`。悬浮属性卡用 `renderItemHtml()` 渲染文字与属性，行囊和装备页在各自视图通过 `renderGameIcon()` 绘制物品图标。图标测试据此分别检查六个图标视图和属性卡，语法与初始化套件的 Emoji 扫描也通过。

四项标准验收及 `test_game_logic.py` 全部通过。

- T0.1 基线修复后四项标准验收及核心逻辑检查全通过，恢复后续任务。
