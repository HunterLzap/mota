# AGENTS.md

《魔塔世界》(Tower of Sorcery) 项目的 Agent 根入口指引。保持简明，负责路由至权威信息源而非堆叠冗余细节。

## 快速上手指引 (Start Here)

1. **阅读状态**：任务开始前先阅读 `PROJECT_STATE.md`，了解当前项目进度与已知约束。
2. **上下文节制**：严禁全仓批量扫读（Bulk-read）代码。通过 grep/find 精准检索任务相关文件。
3. **遵循铁律**：严格遵守下方列出的【核心非妥协约束】，避免中途走偏。
4. **验证先行**：修改前后均需执行对应的自动化测试套件进行回归验证。

## 上下文纪律 (Context Discipline)

- **按需加载**：仅读取当前任务直接依赖的 JS 模块或配置文件。
- **杜绝冗余**：不扫描 `images/` 等静态二进制/SVG 目录内容，除非修改图标管线。
- **长会话交接**：当会话上下文过长时，优先将最新进展与决策更新至 `PROJECT_STATE.md`。

## 项目核心文档路由 (Project Sources)

- **项目实时状态**：[PROJECT_STATE.md](PROJECT_STATE.md)（里程碑、当前阶段、验证记录与下一步计划）
- **架构与编码规范**：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)（分层架构、状态流、西幻命名与矢量图标规范）
- **测试矩阵与验证指南**：[docs/TESTING.md](docs/TESTING.md)（JSC 引擎语法测试、E2E 测试套件与验证命令）

## 项目标准命令 (Project Commands)

- **本地服务**：`python3 server.py`（默认运行于 http://127.0.0.1:8088）
- **静态与架构走查**：`python3 tests/verify_all.py`（检查原生 alert/8大视图挂载/静音与存档位）
- **真实浏览器语法与创角校验**：`python3 tests/test_browser_syntax_and_init.py`（JSC 真实原生引擎编译、0 Emoji、单次职业选择校验）
- **16大子系统端到端验证**：`python3 tests/test_all_features_e2e.py`（全系统业务流 E2E 仿真）
- **图标与资产测试**：`python3 tests/test_icon_system.py`
- **全量回归一键校验**：
  ```bash
  python3 tests/verify_all.py && python3 tests/test_browser_syntax_and_init.py && python3 tests/test_all_features_e2e.py && python3 tests/test_game_logic.py && python3 tests/test_icon_system.py
  ```

## 核心非妥协约束 (Non-negotiable Constraints)

1. **纯正西方魔幻题材 (Strict Western High Fantasy)**：
   - 彻底杜绝中式仙侠/修真/武侠/道家词汇（如：气血、秘籍、飞贼、乾坤、混元、至尊、太古、真武、玄冰等）。
   - 必须统一使用纯正西方高魔词汇（如：生命、魔导书、女盗、远古、禁咒、神圣、极光、元素等）。
2. **100% 矢量 SVG 图标 (Zero Unicode Emoji)**：
   - 全代码库（JS/HTML/CSS）与界面严禁使用任何 Unicode Emoji 符号。
   - 所有图标统一调用 `renderGameIcon()` 或 `getVectorIcon()` 渲染 SVG 矢量图标。
3. **单存档职业唯一选定 (Single Class Choice Per Save)**：
   - 每个独立存档位在开局缔约创角时只需选择一次职业 (`hasChosenClass: true`)。
   - 游戏内彻底移除任何重新选择/切换职业的入口与弹窗，刷新或载入存档时严禁再次弹出创角选职弹窗。
4. **拟真羊皮纸弹窗 (No Native Alert/Confirm)**：
   - 严禁调用浏览器原生 `alert()` / `confirm()`，全量采用复古羊皮纸拟真弹窗 `gameModal`。
5. **最小充分流程 (Minimum Sufficient Process)**：
   - 任何治理与架构变动必须服务于实际业务与测试，禁止过度工程化，不得无故重构已稳定通过测试的业务逻辑。
6. **《魔域》复古粗粝暗黑美术铁律 (Eudemons Vintage Dark Fantasy Only)**：
   - 美术资产严禁现代二次元糖水风、圆润塑料感与写实实拍风。
   - 必须保持 2006 经典《魔域》/《暗黑破坏神 2》复古 2.5D 手绘魔幻风格，体现粗粝锻造黑铁、战损豁口、幽冥魔化暗芒与厚重沧桑感（详见 `docs/ARCHITECTURE.md` 3.5 节）。

