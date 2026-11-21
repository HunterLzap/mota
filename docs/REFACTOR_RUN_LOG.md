# 重构执行记录

2026-11-21 在已有的 `refactor/mota-stability-and-arch` 分支执行基线验收。起点为 `f9a9066`，工作区干净。

| 任务 | 内容 | 状态 |
| --- | --- | --- |
| T0.0 | 修复图标基线断言 | DONE |
| T0.1 | 分支与基线 | DONE |
| T1.1 | 取消跟踪输出产物 | DONE |
| T1.2 | 项目状态归档 | DONE |
| T1.3 | 项目 README | DONE |
| T2.1 | 存档租约和监听清理 | DONE |
| T2.2 | 行动日键与字符串方法 | DONE |
| T2.3 | 启动错误提示 | DONE |
| T3.1 | 顶栏缓存与重绘 | DONE |
| T3.2 | 战斗行动间隔与佣兵配置 | DONE |
| T4.1 | 视图路由与调试接口 | DONE |
| T4.2 | GameState 领域拆分 | PENDING |
| T4.3 | 战斗执行阶段拆分 | PENDING |
| T5.1 | 诊断脚本迁移 | PENDING |
| T5.2 | 核心模块单元测试 | PENDING |

| T4.2 子步骤 | 领域 | 状态 |
| --- | --- | --- |
| T4.2a | 角色属性 | DONE |
| T4.2b | 神兽 | DONE |
| T4.2c | 庄园 | PENDING |
| T4.2d | 活动 | PENDING |

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

- T1.1 四项标准验收及核心逻辑检查通过。31 个产物退出索引，原磁盘文件全部保留。

- T1.2 四项标准验收及核心逻辑检查通过。历史全文按字节核对，状态文档保留四节。

- T1.3 四项标准验收及核心逻辑检查通过。已核对启动入口、测试命令与 Emoji。

- T2.1 四项标准验收及核心逻辑检查通过。独立模块实例验证同槽拒绝、切槽释放、卸载清理及监听器撤销。

- T2.2 四项标准验收、核心逻辑及生产运行时套件通过。沿用存档现有 action-day-N 键，载入时归一旧日期标识。

- T2.3 四项标准验收及核心逻辑检查通过。错误文本单独更新，启动完成时只清理启动重试按钮并恢复焦点。

- T3.1 四项标准验收及核心逻辑检查通过。顶栏缓存节点及职业图标，状态通知合并到同一个微任务，导航先设定目标再渲染。

- T3.2 四项标准验收、核心逻辑及战斗时序套件通过。双方分别缓存最近速度与间隔，吟游诗人的 25 点速度由配置提供。

- T4.1 四项标准验收及核心逻辑检查通过。按补充授权迁移行囊、神兽和庄园的生产导航，现有浏览器套件在本机环回地址仍可使用只读旧名称。

- T4.2a 四项标准验收、核心逻辑、生产运行时和六个圣遗物阈值测试通过。保留 GameState 属性汇总、装备预览、符文和圣遗物方法。

- T4.2b 四项标准验收、核心逻辑及生产运行时套件通过。保留契约、出战、队伍、经验、技能与培养入口。
