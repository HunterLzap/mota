# 魔塔世界

## 项目简介

《魔塔世界》（Tower of Sorcery）是一款 2010 年经典页游风格的纯单机西方魔幻 RPG。玩家可选择职业、挑战魔塔与地下城、探索野外、收集装备并培养神兽。

## 核心特色

- 原生 ES Modules、静态 HTML 与项目内置样式，使用 Python 本地服务直接运行。
- 浏览器本地存储提供五个独立存档位，支持 JSON 备份导入和导出。
- 自动战斗按速度推进双方行动，结算职业技能、神兽助战与战利品，提供战报供回看。

## 快速启动

在仓库根目录运行 `python3 server.py`，再打开 [本地游戏](http://127.0.0.1:8088)。Windows 也可双击 `start_game.bat`，启动器会打开浏览器。

## 目录结构概览

| 路径 | 职责 |
| --- | --- |
| `index.html`、`js/main.js` | 页面入口、应用启动与主导航 |
| `js/core/` | 状态管理、战斗演算与存档 |
| `js/config/` | 职业、装备、神兽、地图与任务配置 |
| `js/ui/` | 游戏视图、弹窗与交互 |
| `css/`、`images/`、`js/assets/` | 样式、插画与图标资源映射 |
| `tests/`、`docs/` | 自动化验证与项目文档 |

## 自动化验证命令

在仓库根目录运行以下命令。语法与初始化检查使用系统 Node.js。

```sh
python3 tests/verify_all.py
python3 tests/test_browser_syntax_and_init.py
python3 tests/test_icon_system.py
python3 tests/test_all_features_e2e.py
python3 tests/test_game_logic.py
```

具体覆盖范围见 [测试指南](docs/TESTING.md)。
