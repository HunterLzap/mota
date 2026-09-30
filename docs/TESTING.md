# 《魔塔世界》测试矩阵与自动化验证指南 (Testing Guide)

本文档说明《魔塔世界》(Tower of Sorcery) 项目的自动化测试体系、测试工具链与回归验证流程。

---

## 1. 测试体系设计理念 (Testing Philosophy)

由于本项目为原生 ES6+ 前端应用，为了杜绝常见的前端“在开发中能跑，上线后语法报错或弹窗未定义”等隐患，我们建立了**双轨制仿真测试机制**：
1. **真实引擎语法编译轨**：借助 macOS 原生 WebKit JavaScriptCore (`jsc`) 引擎，对项目全部 41 个 JS 文件进行真实语法编译与上下文初始化，确保零语法错误、零变量作用域污染。
2. **业务闭环仿真轨**：借助 Python 端对 16 大核心子系统进行端到端（E2E）全流程状态推进与断言，覆盖复杂数值演算、数据隔离、地下城多层探险与磨损机制。

---

## 2. 测试套件清单 (Test Suite Matrix)

| 测试文件 | 类别 | 检验重点 | 运行耗时 |
|---|---|---|---|
| `tests/verify_all.py` | 静态走查 | - 检查全部 JS 文件杜绝原生 `alert()`/`confirm()`<br>- 检验 8 大视图容器与导航按钮挂载一致性<br>- 检验 Town/Estate 全部 17 个子路由注册<br>- 检验彻底静音与 5 槽位存档配置 | < 1s |
| `tests/test_browser_syntax_and_init.py` | 语法与规则 | - WebKit JSC 真实编译全部 41 个脚本<br>- 100% 杜绝全库 Unicode Emoji<br>- 单次职业锁定验证（刷新/载入不重弹）<br>- 三职业八阶纯正西幻转职称号计算<br>- 13 套远古套装与 22 种神兽配置完备性<br>- 地下城七大古门、多阶段领主与四大合击奥义编译核算 | ~ 1.5s |
| `tests/test_all_features_e2e.py` | 端到端业务 | - 勇者四维属性与潜能分配核算<br>- 装备穿戴、极品套装 2/4 件羁绊与耐久磨损<br>- 铁匠铺 +1~+8 强化、保护水晶与全身修理<br>- 22 种神兽喂养、潜能重铸、打书与觉醒突破<br>- 王都俸禄、试炼受封、远古屠龙与垂钓<br>- 庄园丰收、古法魔药配制与战俘役使<br>- 5 大野外地图准入、挂机收益与暗影女盗<br>- 魔塔钥匙破界跳层与经验池提取<br>- 5 槽位独立存档完全物理隔离<br>- 系统日志流中枢分类动态过滤<br>- 皇家酒馆赏金悬赏令流转与佣兵公会誓约<br>- 远古神铸 8 大符文石与 7 大符文之语铭刻<br>- 三大阵营要塞争夺、军衔军饷与军需兑换<br>- 魔塔 51~100 层灭世神域与 6 大远古圣遗物觉醒<br>- 地下城七大古门多层探险、多阶段首领护盾/狂暴/契约献祭与合击奥义 | ~ 1.2s |
| `tests/test_game_logic.py` | 基础核心逻辑 | - 每日俸禄单日唯一领取与跨日重置<br>- 主线任务 1~9 全流程闭环推进<br>- 回合制战斗攻防伤害与减免公式校验 | < 1s |
| `tests/test_icon_system.py` | 资产与渲染 | - 校验 `images/` 下全部 132 个 SVG 矢量贴图 XML 结构<br>- 检验装备、道具、神兽、古门专属贴图路径绑定<br>- 校验全部核心视图接入 `renderGameIcon` 统一中枢 | < 1s |
| `tests/test_layout_and_system_logs.py` | 布局与日志 | - 检验 index.html 布局无残留宽度限制<br>- 校验任务追踪与系统日志挂载点<br>- 全部 View 文件宽度约束走查 | < 1s |
| `tests/test_ui_refinements.py` | UI 细节 | - 装备槽位循环杜绝 `[object Object]`<br>- 装备部位名称 `.name` 取值校验<br>- HTML 布局细节检测 | < 1s |

---

## 3. 标准测试命令 (Standard Commands)

### 3.1 提交前一键全量回归 (Recommended)
任何功能修改或代码合并前，**必须执行以下命令并确保 100% 通过**：
```bash
python3 tests/verify_all.py && python3 tests/test_browser_syntax_and_init.py && python3 tests/test_all_features_e2e.py && python3 tests/test_game_logic.py && python3 tests/test_icon_system.py
```

### 3.2 专项测试
- **仅检查语法与规范**：
  ```bash
  python3 tests/test_browser_syntax_and_init.py
  ```
- **仅检验 16 大子系统 E2E**：
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
- **出现 `JSC 语法编译失败`**：
  - 原因：ES6 语法错误（如缺少闭合括号、拼写错误或模板字符串未闭合）。
  - 解法：根据输出的脚本名称与行号直接修正。
