# 夜间稳定性与体验优化报告

日期：2026-11-01，Asia/Shanghai。限定实现与可执行回归已完成，原生操作系统后台/冻结行为的覆盖限制见第7节。

实现工作区：`E:/mota-overnight`；分支：`codex/overnight-game-ux`。DSH状态、完整截图和日志：`E:/mota/output/overnight/`。原 `E:/mota` 工作区及其已有未提交改动完整保留。没有 push、merge、部署、清档、修改用户浏览器数据或安装依赖。测试使用现有 Google Chrome 156.0.8078.76、现有 Playwright 和本任务的8089本地服务。

## 1. 已完成任务与前后区别

| 项目 | 本轮复现的修改前行为 | 最终行为 |
| --- | --- | --- |
| 第二轮存档修复 | 已有3个源码文件和存档专项未提交 | 先归档原补丁，再以本轮实际Chrome回归验证并提交；未另改存档机制 |
| 潜能任务寻路 | 技能子页点击引导仍停在skills，推荐按钮不可见 | 显式切stats、滚动并聚焦推荐按钮；无点数时聚焦潜能账簿并提示升级后继续 |
| 创建角色焦点 | 初始焦点在BODY；职业重绘后失焦；Tab可进背景 | 初始聚焦姓名，Tab/Shift+Tab闭环，重绘恢复职业/城邦控件；背景inert；关闭或嵌套告示后恢复适当焦点 |
| 黑翼龙皇 | 战斗侧栏与舞台使用错误的剑图 | 配置显式portraitKey，复用现有黑龙绘画；侧栏与舞台一致；无映射时使用场景徽记，不回退武器 |
| 女盗支线 | 只展示名称及截击按钮，没有风险属性 | 显示高危支线、生命/攻击/防御/速度和武器/护胸/潜能整备提醒；仍可直接挑战 |
| 挂机摘要 | 跨分钟仍保持0分，必须整页重绘才更新 | 按领取时间的分钟边界只更新摘要文本；离页、战斗页及document.hidden时清理计时器，返回补算；600分钟上限后不再排更新 |
| 隐藏Canvas | display:none仍持续排帧并绘制 | 不可见时停止；初始隐藏不生成粒子；重新显示自动恢复；none预设停止排帧 |
| 穿戴/卸下 | 穿戴2次notify、2次save、3次行囊render；卸下2次装备render | 实测穿戴各1次，日志仍1条，下一物品选择/焦点与真实保存保留；卸下1次render |

没有修改属性成长、潜能分配公式、怪物战斗数值、收益规则、奖励或存档schema。100层只增加肖像元数据；女盗显示与实际开战共用原属性值。未开发新玩法。

## 2. 修改文件

以下路径相对 `E:/mota-overnight`：

- 既有第二轮修复原样纳入：`js/core/storage.js`、`js/main.js`、`js/ui/archiveModal.js`、`tests/browser_save_consistency.js`。
- 潜能与创角：`js/main.js`、`js/ui/heroView.js`、`js/ui/charSelectModal.js`。
- 龙皇肖像：`js/config/towerLevels.js`、`js/ui/towerView.js`、`js/ui/wildArtwork.js`。复用 `images/portraits/swamp-volcano-enemies.png`，未新增或修改图片。
- 野外体验：`js/ui/wildView.js`、`js/main.js`。
- 局部性能：`js/effects/atmosphere.js`、`js/core/state.js`、`js/ui/bagView.js`、`js/ui/heroView.js`。
- 浏览器执行及专项：`tests/run_overnight.cjs`、`tests/browser_overnight_interactions.js`、`tests/browser_overnight_experience.js`、`tests/browser_overnight_performance.js`、`tests/browser_overnight_restart.js`、`tests/browser_overnight_lifecycle.js`。
- 现有Node DOM夹具补齐：`tests/test_browser_syntax_and_init.py`。保留全部业务断言，新增浏览器接口的夹具定义；不把此套件称作真实浏览器验证。
- 交接与报告：`PROJECT_STATE.md`、`output/overnight/STATUS.md`、`REPORT.md`、`ERRORS.md`及随附证据摘要。

## 3. 分阶段Git检查点

| 阶段 | 本地commit | 验证后保存的内容 |
| --- | --- | --- |
| 0 | `9e4b053` | 第二轮单写者存档保护、删除当前槽限制、Chrome存档专项及执行器 |
| 1 | `b7ef899` | 潜能导航、创角焦点、龙皇绘画映射 |
| 2 | `20a61e8` | 女盗战前信息、分钟边界挂机摘要 |
| 3 | `39658a3` | 隐藏Canvas停帧、换装通知/保存/绘制收敛 |
| 4 | `36c10de` | 战斗页暂停野外摘要计时器、最终重开/读档/生命周期检查、现有DOM夹具兼容 |

最终报告与交接文档另有本地交付提交，可通过本分支最后一条Git日志查看；不在文件中自引用自身commit哈希。每个实现检查点提交前均已运行相关验证。未通过的首轮检查没有当作通过证据，详见ERRORS.md。

## 4. 真实Chrome验证

所有网页业务均运行在真正Google Chrome中。新建临时浏览器上下文，不连接用户日常Chrome配置。正常业务通过可见控件操作；特定高层/布局/时间边界的夹具有明确标注。

| 最终证据 | 覆盖与实际结果 |
| --- | --- |
| `final-save.json` / `.log` | 两尺寸通过同槽第二页拒绝、不同槽独立写入、持有页关闭后重新进入、刷新职业与进度保持、占用槽拒删、空闲槽删除后不复活、导出/导入、未用槽保持；pageerror和请求失败均0 |
| `final-restart.json` | 两尺寸通过空姓名嵌套告示、取消新开不改存档、新角色写槽2且保留槽1、读回战士并刷新、无需重选职业；console/page/request错误均0 |
| `final-onboarding.json` | 两尺寸自然开场，穿戴留页/焦点、上下任务导航、真实首战、升星与契约教学、刷新；其他4槽哨兵保持，pageerror为0 |
| `final-interactions.json` | 三职业×两尺寸，共6场景；姓名初始焦点、键鼠职业/城邦重绘、18次正反向Tab、技能页潜能寻路、连续导航、加点后零点数落点、刷新职业唯一、普通狼肖像与100层龙像；console/page/request错误、横溢和破图均0 |
| `final-layout.json` | 两尺寸八主页面：人物、装备、行囊、神兽、魔塔、王都、野外、庄园；布局、底栏可点、键盘切页、阵容操作和刷新通过，pageerror为0。等级/章节/伙伴为显式布局夹具 |
| `final-experience-followup.json` | 两尺寸女盗卡片与实际开战属性一致，真实时钟跨近分钟边界摘要变化1次/整页render0次，后续无变化不重复写文本；领取货币准确、离页停止、返回2分补算、600分上限停止；console/page/request错误均0 |
| `final-performance.json` | 两尺寸隐藏Canvas计数、显示恢复、none停止、重新隐藏、实际穿戴/日志/焦点/保存、卸下与刷新通过；console/pageerror为0 |
| `final-lifecycle.json` | 重置领取起点后真实等待62秒，前31秒摘要变化0次，满分钟后1次；进入战斗时野外timer为null，结算返回正常；pageerror为0。原生隐藏/冻结覆盖为partial，不能计为通过 |

三职业没有重新跑516场战斗。100层图像检查用显式等级/章节/探险位置夹具到达实际挑战按钮，不宣称自然通关；普通狼战斗和开场任务有真实UI结果。时间边界专项只设置领取时间，不加速浏览器时钟；另有完整62秒实际等待。

## 5. 自动检查

最终代码下以下命令全部退出0，对应日志均以 `final-` 开头：

```text
python -X utf8 tests/verify_all.py
python -X utf8 tests/test_browser_syntax_and_init.py
python -X utf8 tests/test_all_features_e2e.py
python -X utf8 tests/test_game_logic.py
python -X utf8 tests/test_icon_system.py
node tests/test_runtime.mjs
node tests/test_playability.mjs
node tests/test_combat_timing.mjs
node tests/test_item_artwork.mjs
git diff --check
```

生产runtime为171条PASS，playability为4条，combat_timing为12条。图像渲染兼容检查结果以 `final-test_item_artwork.log` 为准。上述Node/模拟DOM套件只补充生产断言与语法证据，不替代Chrome专项。

## 6. 截图与日志位置

完整证据目录：`E:/mota/output/overnight/`。实现worktree内保留本轮JSON与关键日志副本，方便独立恢复。失败截图/日志保留原标签，不将目录中的所有图片都算作成功。

- 修改前后潜能：`stage1-before-1280-warrior-potential-navigation.png`、`stage1-after-1280-warrior-potential-navigation.png`。
- 修改前后龙皇：`stage1-before-1280-warrior-dragon-battle.png`、`final-interactions-1280-warrior-dragon-battle.png`；另有1440与其他职业。
- 创角：`final-interactions-1280-warrior-creation-focus.png`；另有三职业两尺寸。
- 女盗：`stage2-before-1280-thief-warning.png`、`final-experience-followup-1280-thief-warning.png`。
- 分钟摘要：`final-experience-followup-1280-minute-summary.png`、`final-lifecycle-real-minute.png`。
- 八页：`restoration-1280-<页面>.png`、`restoration-1440-<页面>.png`。
- 存档：`final-save-<尺寸>-same-slot-blocked.png`、`active-delete-protected.png`、`owner-closed-recovered.png`（后两者同样带final-save和尺寸前缀）。
- 重开/读取：`final-restart-<尺寸>-loaded.png`。
- 进度/失败：`STATUS.md`、`ERRORS.md`；原第二轮补丁：`original-save-fix.patch`；本任务服务日志：`server-out.log`、`server-error.log`、`server.pid`。

## 7. 未解决问题及验证边界

1. **原生后台/冻结测试未覆盖**：当前自动化环境中，Chrome最小化后仍报告visible，CDP冻结/恢复没有DOM生命周期事件。单独尝试headless和独立离屏headed会话均不能取得有效隐藏事件。保留所有诊断，未伪造document.hidden、未把缺事件解释为游戏暂停成功。实现保留原生visibilitychange停启处理；页面导航、战斗页和CSS隐藏的停启已实际通过。
2. **无独立游戏暂停按钮**：本轮没有新增暂停玩法；检查的是浏览器生命周期与既有战斗演播/返回。不能把“跳过演播”称作暂停。
3. **有限桌面范围**：本轮只证明1280×900、1440×1000的指定流程，没有覆盖移动设备、极矮窗口、Safari/Firefox、辅助技术或8小时后台持久运行。
4. **没有实际玩家存档回放**：为了不触碰玩家记录，全部使用临时上下文的新档和显式夹具；历史存档迁移由现有生产断言补充，不冒充用户真实存档验证。

本轮范围内没有遗留已复现但未处理的游戏代码回归；环境覆盖缺口和失败过程在ERRORS.md明确记录。

## 8. 性能观察与大图定点分析

| 指标 | 修改前 | 修改后 |
| --- | --- | --- |
| 隐藏Canvas约1.1秒计数 | 1280为154次update/draw；1440为157次；各25粒子、仍排帧 | 两尺寸均0次update/draw、0初始粒子、无待执行帧 |
| 重新显示Canvas约0.4秒 | 非本轮基线重点 | 两尺寸各60次update/draw、25粒子；动画恢复 |
| 单次穿戴 | notify2 / save2 / bag render3 | 1 / 1 / 1 |
| 单次卸下 | notify1 / save1 / equip render2 | 1 / 1 / 1 |
| 分钟摘要更新 | 跨分钟不更新 | 文本变化1次、整页render0次；完整真实分钟亦为1次 |

计数包装均调用原方法，不修改业务、奖励或随机数。帧计数来自本机该次运行，不代表固定刷新率；没有宣称FPS、CPU、功耗或加载速度改善百分比。

`image-analysis.json`只对既有审计列出的7个大资源复核当前文件字节和PNG原始尺寸。最大项为王都场景3,387,955字节、1832×859；羊皮纸3,068,285字节、1254×1254；头像图集2,768,679字节、1536×1024。没有改写图集、重编码、裁切或全局缓存策略；弱网收益和安全替代方案未验证，故不做大规模图片重构。

## 9. 后续最值得处理的5项

1. **大图与缓存策略**：针对上述实际大文件制作有视觉对照的尺寸变体，再单独验证图片缓存与源码更新策略；保留原画。
2. **原生隐藏/冻结覆盖**：换能真实发出visibility/lifecycle事件的桌面浏览器运行环境，补证后台停止与恢复，不为测试加入假后台。
3. **历史偶发启动超时归因**：保留既有启动看门狗，围绕失败请求和初始化阶段做定点复现；本轮没有复现，不能称已解决。
4. **极矮窗口/小屏布局**：历史交接记录存在行囊裁切问题；应明确目标窗口范围后另做局部处理，本轮两桌面尺寸不替代该项。
5. **中后期成长与终战挑战曲线**：既有审计提示11/19/22章跨度和充分准备后终战偏容易；需单独的实际玩家体验证据，本轮未改数值，也未重复长战斗路线。

## 恢复与本地查看

读取 `STATUS.md`、`ERRORS.md` 和本分支Git日志即可找到最近实现检查点。可在 `E:/mota-overnight` 继续工作；原 `E:/mota` 保留原状。8089服务属于本任务，进程号见DSH目录 `server.pid`，不会重启或终止原8088服务。

复跑已有浏览器专项时，从实现worktree执行 `tests/run_overnight.cjs`，通过 `PLAYWRIGHT_MODULE` 指向现有Playwright、`OVERNIGHT_OUTPUT`指定证据目录。执行器只启动临时Chrome；不连接玩家浏览器。它将原专项的8088地址替换到本任务8089，未改变游戏业务与断言。
