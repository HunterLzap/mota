# 《魔塔世界》测试矩阵与自动化验证指南 (Testing Guide)

本文档说明《魔塔世界》(Tower of Sorcery) 项目的自动化测试体系、测试工具链与回归验证流程。

---

暂停检查点（2026-10-01）：生产测试文件现有105项定义；实际运行前102项通过，第103项海德拉重生/蛇女反制在 `tests/test_runtime.mjs:1630` 断言失败（期望1条“无法复活”日志，实际2条），退出码1，第104/105项未执行。五项规定检查与diff检查重新通过。新增50/60层首领没有完成浏览器验收和自然难度测量；恢复时先排查该断言，再补实际路径与边界验证，禁止把历史102项通过或语法通过写成当前全套通过。

## 1. 测试体系设计理念 (Testing Philosophy)

现有测试按验证范围区分，任何一类通过都不能代替其他类别：
1. **静态与资源检查**：验证文本规则、挂载声明、SVG XML 和登记资源路径，不验证按钮与实际业务。
2. **Node.js 执行与模拟 DOM 初始化**：原 JSC 套件已迁移到 Node.js，通过 `node --check` 并检查退出码；`tests/js_engine.mjs` 执行原有 JS 断言与模拟 DOM，不是真实浏览器。当前在 Windows、Node.js 25.7.0 与 Python 3.12 验证。
3. **独立 Python 业务模拟**：`test_all_features_e2e.py`、`test_game_logic.py` 重写部分规则与数据，没有执行生产 JS；只能证明模拟中的断言，不证明游戏实际结算、存档或端到端流程。
4. **实际业务验收**：`tests/test_runtime.mjs` 直接导入生产模块验证行为；`tests/browser_flow.js` 用 Playwright CLI 操作实际页面，使用独立浏览器上下文，不修改用户存档。前者的战斗视图使用模拟元素，后者才验证实际布局、点击与浏览器执行。

---

## 2. 测试套件清单 (Test Suite Matrix)

| 测试文件 | 类别 | 检验重点 | 运行耗时 |
|---|---|---|---|
| `tests/verify_all.py` | 静态走查 | - 检查全部 JS 文件杜绝原生 `alert()`/`confirm()`<br>- 检验 8 大视图容器与导航按钮挂载一致性<br>- 检验 Town/Estate 全部 17 个子路由注册<br>- 检验彻底静音与 5 槽位存档配置 | < 1s |
| `tests/test_browser_syntax_and_init.py` | 语法、模拟 DOM 与生产方法 | Node 语法与初始化、Emoji、职业锁定、晋升配置、套装/神兽配置、生产方法和手动任务触发；不能证明正常成长和通关 | ~ 3s |
| `tests/test_runtime.mjs` | 生产 JS 行为回归 | 构造不覆盖存档、职业创建与锁定、迁移、五槽隔离、奖励幂等、战报接口、职业效果、神兽消耗成长、巡逻计时、魔药与跨日重置 | < 1s |
| `tests/measure_balance.mjs` | 生产数值测量 | 三职业巡逻与自然刷怪至100级、可用晋升；只使用赚取的经验/资源/装备，记录战数、败战、修理、食物与主宠等级；各区首领40次独立样本，固定种子，不代替全系统平衡验收 | ~ 2s |
| `tests/browser_mechanics.js` | 浏览器机制验收 | 新档野外20战与补给持久化；隔离剧情角色通用领奖解锁女盗；实际付费雇佣诗人、首层收益提现、首领首通/刷新重刷不重复发奖、地下城五战诗人魔晶 | 按实际流程 |
| `tests/browser_sets.js` | 浏览器套装验收 | 三职业预置有效四件装备，生产套装效果进入实际战斗、刷新保留、破损第四件失效；不证明自然获取套装或难度 | ~ 10s |
| `tests/browser_pet_traits.js` | 浏览器神兽验收 | 隔离60级/装备/梦魇角色，实际15场首领奖励筹集300声望，兑换和研习腐蚀毒刺、实际毒伤、刷新保留、疲劳失效；不证明自然获取梦魇 | 按实际流程 |
| `tests/browser_forge.js` | 浏览器强化验收 | 隔离20级/+7装备，实际8次狼王赚160声望，兑换保护水晶、旧ID刷新迁移；控制失败随机数，+7保持、升星水晶消耗8/保护消耗1，刷新保留 | ~ 10s |
| `tests/browser_boss_abilities.js` | 浏览器首领验收 | 20层毒伤/实际兑换净化、30层圣洁、100层净化；预置等级/装备/神兽并固定战斗随机数，验证技能消费与反制和首通保存，不证明自然难度 | 按实际流程 |
| `tests/browser_inventory_sale.js` | 浏览器背包验收 | 隔离15级/41件溢出背包，嵌宝石拒售、取消无损、出售两件后恢复兑换容量、货币/物品刷新保持、默认预览穿戴 | ~ 6s |
| `tests/browser_bag_expansion.js` | 浏览器扩容验收 | 隔离资源/40材料fixture，取消不变，真实扣金币/魔晶扩40→60，不足拒绝，第41格声望购买与刷新保持；不证明自然获取资源 | ~ 6s |
| `tests/browser_disassembly.js` | 浏览器分解验收 | 隔离装备/满40格fixture，取消、实际换装后过期确认保护、嵌宝石拒绝、生产摘除后分解、暗金晶石堆叠2→5、原装备/宝石与刷新保持 | ~ 8s |
| `tests/browser_flow.js` | 真实浏览器流程 | 独立新档，三职业独立新档、任务1~10、正常升至20级与首次晋升、刷新；不注入等级/经验 | 按实际流程 |
| `tests/browser_quests.js` | 浏览器中期业务 | 预置中期等级/装备和起始任务，实际按钮完成主线11~20、接续21章与刷新；不直接触发任务/奖励 | 按实际流程 |
| `tests/browser_continuation.js` | 浏览器续章业务 | 预置旧20章结业/100级/强装备，21~26六目标实际39战完成、自动导航、77万金币逐次领奖/重复拒绝，古门/晋升/首通/结业刷新；不证明自然难度 | 按实际流程 |
| `tests/browser_dungeon_settlement.js` | 浏览器古门结算 | 预置20级/装备，6场实际胜利、2次入场，撤离后同门重入旧回调拒绝，中途刷新续战，终战晶石合并/重复拒绝、通关/任务/刷新保持 | ~ 9s |
| `tests/browser_military_merit.js` | 浏览器战功消费 | 预置20级/强装备，5次实际要塞胜利赚600战功，兑换花400、余额200，累计晋百夫长、军饷3500一次、刷新保持；不注入军勋 | ~ 8s |
| `tests/browser_subsystems.js` | 浏览器中后期业务 | 预置等级/装备：30页面、三龙、七门65层、魔塔50~100、六圣遗物、修理、次数和跨日 | 按实际流程 |
| `tests/browser_archive.js` | 浏览器档案业务 | 实际JSON下载/导入、损坏导入拒绝、切档隔离、满袋卸装/穿戴、旧盾迁移与刷新 | ~15s |
| `tests/browser_activities.js` | 浏览器日常业务 | 预置角色：要塞/军需/军饷、悬赏、鱼饵消耗、庄园成熟与重复拒绝 | 按实际流程 |
| `tests/test_all_features_e2e.py` | 独立 Python 业务模拟 | - 勇者四维属性与潜能分配核算<br>- 装备穿戴、极品套装 2/4 件羁绊与耐久磨损<br>- 铁匠铺 +1~+8 强化、保护水晶与全身修理<br>- 22 种神兽喂养、潜能重铸、打书与觉醒突破<br>- 王都俸禄、试炼受封、远古屠龙与垂钓<br>- 庄园丰收、古法魔药配制与战俘役使<br>- 5 大野外地图准入、挂机收益与暗影女盗<br>- 魔塔钥匙破界跳层与经验池提取<br>- 5 槽位独立存档完全物理隔离<br>- 系统日志流中枢分类动态过滤<br>- 皇家酒馆赏金悬赏令流转与佣兵公会誓约<br>- 远古神铸 8 大符文石与 7 大符文之语铭刻<br>- 三大阵营要塞争夺、军衔军饷与军需兑换<br>- 魔塔 51~100 层灭世神域与 6 大远古圣遗物觉醒<br>- 地下城七大古门多层探险、多阶段首领护盾/狂暴/契约献祭与合击奥义 | ~ 1.2s |
| `tests/test_game_logic.py` | 基础核心逻辑 | - 每日俸禄单日唯一领取与跨日重置<br>- 主线任务 1~9 全流程闭环推进<br>- 回合制战斗攻防伤害与减免公式校验 | < 1s |
| `tests/test_icon_system.py` | 资产与渲染 | - 校验 `images/` 下全部 132 个 SVG 矢量贴图 XML 结构<br>- 检验装备、道具、神兽、古门专属贴图路径绑定<br>- 校验全部核心视图接入 `renderGameIcon` 统一中枢 | < 1s |
| `tests/test_layout_and_system_logs.py` | 布局与日志 | - 检验 index.html 布局无残留宽度限制<br>- 校验任务追踪与系统日志挂载点<br>- 全部 View 文件宽度约束走查 | < 1s |
| `tests/test_ui_refinements.py` | UI 细节 | - 装备槽位循环杜绝 `[object Object]`<br>- 装备部位名称 `.name` 取值校验<br>- HTML 布局细节检测 | < 1s |

---

## 3. 标准测试命令 (Standard Commands)

### 3.1 提交前一键全量回归 (Recommended)
任何功能修改或代码合并前，**必须执行以下命令并确保 100% 通过**：

这是原有回归要求，继续保留。Windows 可用 `python -X utf8` 避免 GBK 输出错误。原 JSC 检查已迁移到 Node；另外必须运行 `node tests/test_runtime.mjs`，浏览器流程按下面命令运行。环境不支持或实际失败不得记为通过。
```bash
python3 tests/verify_all.py && python3 tests/test_browser_syntax_and_init.py && python3 tests/test_all_features_e2e.py && python3 tests/test_game_logic.py && python3 tests/test_icon_system.py
```

### 3.2 专项测试

真实浏览器前期验收：先运行 `python -X utf8 server.py`，再依次执行：

```powershell
npx --yes --package @playwright/cli playwright-cli -s=mota open http://127.0.0.1:8088
npx --yes --package @playwright/cli playwright-cli -s=mota run-code --filename=tests/browser_flow.js
```

其余浏览器套件按需执行：

```powershell
npx --yes --package @playwright/cli playwright-cli -s=mota run-code --filename=tests/browser_quests.js
npx --yes --package @playwright/cli playwright-cli -s=mota run-code --filename=tests/browser_subsystems.js
npx --yes --package @playwright/cli playwright-cli -s=mota run-code --filename=tests/browser_archive.js
npx --yes --package @playwright/cli playwright-cli -s=mota run-code --filename=tests/browser_activities.js
```

中后期套件明确预置角色条件，仅证明实际业务路径，不证明正常升级速度、难度或原版一致性。完成一次必要回归后，仅在新增改动、失败或未解决疑点时重跑受影响范围。

截图输出至忽略目录 `output/playwright/`；脚本任何超时或异常均视为失败，不能强制点击掩盖遮挡，也不能靠修改等级证明自然成长。
- **仅检查语法与规范**：
  ```bash
  python3 tests/test_browser_syntax_and_init.py
  ```
- **仅运行独立 Python 业务模拟**：
  ```bash
  python3 tests/test_all_features_e2e.py
  ```
- **检验美术资产与 SVG 矢量结构**：
  ```bash
  python3 tests/test_icon_system.py
  ```

---

## 4. 常见排错指南 (Troubleshooting)

- **出现 `未转化的原生 alert/confirm`**：
  - 原因：在 JS 业务代码中直接写了 `alert()` 或 `confirm()`。
  - 解法：将其替换为 `gameModal.alert(...)` 或 `gameModal.confirm(...)`。
- **出现 `Unicode Emoji 违规`**：
  - 原因：文案中不慎写入了类似 🗡️、💰 等表情字符。
  - 解法：查阅 `js/ui/iconHelper.js`（`renderGameIcon`）或 `js/assets/vectorIcons.js`（`getVectorIcon`），改为使用矢量图标方法动态渲染 SVG 图标。
- **出现 `Node.js 语法检查失败`**：
  - 原因：ES6 语法错误（如缺少闭合括号、拼写错误或模板字符串未闭合）。
  - 解法：根据输出的脚本名称与行号直接修正。
