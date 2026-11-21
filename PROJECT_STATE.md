# 《魔塔世界》项目状态

历史记录已完整归档至 [docs/PROJECT_STATE_ARCHIVE.md](docs/PROJECT_STATE_ARCHIVE.md)。

## 当前项目定位与架构基线

- 个人单机西方高魔 RPG。竞技场与阵营战的对手由游戏控制。
- 原生 ES Modules、静态 HTML 和本地样式，通过 Python 本地服务运行。
- `js/main.js` 负责启动与导航，`js/ui/` 负责视图与交互，`js/core/` 负责状态、战斗和存档，`js/config/` 提供玩法配置。
- 五个独立存档位使用 `localStorage`。行动日管理每日次数与额度。
- 架构详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 核心约束与验收红线

- 使用西方高魔用语。界面与前端代码禁用 Unicode Emoji。
- 装备、道具、头像与常用徽记通过项目绘画图标入口显示，以 [docs/OFFICIAL_ARTWORK.md](docs/OFFICIAL_ARTWORK.md) 为匹配基准。
- 每个存档只在创角时选择一次职业。交互确认使用 `gameModal`。
- 重构保持旧存档、公开接口、数值与玩法兼容。每项单独验收和提交。

## 常用启动与测试命令

运行 `python3 server.py` 后访问 `http://127.0.0.1:8088`。Windows 可运行 `start_game.bat`。

```sh
python3 tests/verify_all.py
python3 tests/test_browser_syntax_and_init.py
python3 tests/test_icon_system.py
python3 tests/test_all_features_e2e.py
python3 tests/test_game_logic.py
```

测试矩阵见 [docs/TESTING.md](docs/TESTING.md)。

## 最新里程碑摘要

- 2026-11-05：桌面界面已接入描金按钮、全局字体与羊皮纸样式。行囊分页随可用空间调整，角色装备页已支持十二部位。
- 2026-11-04：扩充野外地图、怪物与套装，皇家商会支持声望门槛和按行动日限购。
- 2026-11-01：确立装备道具绘画与名称基准，补齐常用绘画图标，验证本地存档的单写者保护。
- 2026-11-21：修复图标基线断言并恢复工程重构，具体步骤见 [docs/REFACTOR_RUN_LOG.md](docs/REFACTOR_RUN_LOG.md)。
