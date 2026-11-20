# 《魔塔世界》测试矩阵与自动化验证指南 (Testing Guide)

## 官方重绘与名称兼容（2026-11-01）

当前装备道具图像与名称以 [OFFICIAL_ARTWORK.md](OFFICIAL_ARTWORK.md) 为准。`test_item_artwork.mjs` 覆盖 229 项生产输入、14 张新旧图集、同套不同部位／职业武器、三职业新手任务武器、已确认旧名称归一及不修改输入。`audit_official_artwork.py` 检查 7 套格位和 21 项道具有效性；`export_official_artwork.py` 输出 105 张单件 PNG 与来源／补绘清单。

此前已运行 `browser_official_item_artwork.js`，在两桌面尺寸明确的展示夹具中检查七套、新手任务装、图鉴与道具，保存于 `output/official-item-reference-2026-11-01/`。这些是图片呈现证据，不是自然获取或真实玩家存档证据；不将隔离夹具、截图或全量历史套件作为之后每次改图的默认前置要求。

## 底栏与头像专项（2026-10-29）

`node tests/test_painted_icons.mjs` 验证40个界面/头像键、旧avatar路径、兼容getVectorIcon及战斗嵌套传递，校验PNG单格为正方形。`node output/ui-legibility-2026-10-29/run.cjs tests/browser_shell_legibility.js` 在三职业×两尺寸的新context中验证两任务状态与七类日志/筛选的计算色对比度至少4.5:1、字号至少12px（实测最低7.49:1）、筛选与焦点恢复、职业头像打开人物页及刷新、三佣兵绘画、底栏205px、四槽哨兵保护、零错误/失败请求/溢出/破图。运行前基线及最终日志保存在同目录。

最终静态/初始化、绘画入口与229物品输入测试通过；shell_legibility、restoration_layout、npc_modal、companion_layout、ui_alignment、inventory_smithy、battle_page七个受影响浏览器专项通过。全部只使用隔离context，没有访问真实用户槽位。

## 绘画图集与边框专项（2026-10-29）

`node tests/test_item_artwork.mjs` 检查229个生产配置、任务奖励、旧图标路径输入均经显示层解析为PNG绘画，验证数据未被修改、职业武器/符文/蛋类区别、原生图集坐标与PNG尺寸。旧`test_icon_system.py`仍用于保留SVG及兼容路径的完整性，不代表装备道具仍以SVG呈现。

`node output/ui-polish-2026-10-29/run.cjs tests/browser_ui_artwork.js` 在两尺寸新建隔离context，覆盖锁定页签等高、文字/命中、Enter/Escape与焦点恢复、全部物品分页、画面正方形、13套装徽记、四配方按钮可达、实际炼金扣料与刷新、四个隔离哨兵槽保护。`UI_POLISH_PHASE=before`仅通过网络路由加载本轮修改前的源码快照，不覆盖工作树。

verify_all、syntax/init、旧资产及绘画单测通过；美术、行囊/工坊、四区域对齐、王都hover、UI细节、神兽详情、宠物滚动、战斗页8个浏览器专项最终通过。首次行囊因76px预览图挤住比较行失败，改64px后行囊与美术专项复跑通过；完整日志保留在`output/ui-polish-2026-10-29/`，最终修复见`bag-fix-browser.log`。两尺寸无页面错误、失败请求、横溢或破图。未接触真实存档。

本文档说明《魔塔世界》(Tower of Sorcery) 项目的自动化测试体系、测试工具链与回归验证流程。

## 场景化 UI 近似整改专项（2026-10-28）

新增 `tests/browser_scene_redesign.js`。使用独立 context 和确定性展示夹具覆盖 1280×900、1440×1000 的人物、装备、行囊、王都、野外、庄园与实战页面；检查七页横向溢出、破图、pageerror、失败请求，人物四项加点首屏边界与命中、加点刷新、技能往返、六王都目录进入/返回及锁定焦点，战斗跳过和结算。槽 1/2/4/5 只写隔离哨兵并核对未变。

本轮依次运行 `verify_all.py`、`test_browser_syntax_and_init.py`，再运行 `browser_scene_redesign.js`、`browser_restoration_layout.js`、`browser_ui_refinements.js`、`browser_inventory_smithy.js`、`browser_town_hover.js`、`browser_battle_page.js`、`browser_wild_artwork.js`、`browser_ui_alignment.js`、`browser_npc_modal.js`、`browser_classic_pet_details.js`、`browser_pet_roster_scroll.js`。首次最终批次 10 个专项通过，NPC 专项发现女盗 SVG 图标遗漏；补回后 NPC、野外与场景专项复验通过。场景专项复跑时另有一次等待创角元素超时，原因未定，后续单独复跑与最终测量运行通过。静态/初始化检查和 171 项生产断言最终通过。失败记录与成功记录分别保留，不能把单个批次日志当作全绿结果。详细日志、前后截图、测量 JSON 与页签映射见 `output/ui-redesign-2026-10-28/`。

## UI 结构整改专项（2026-10-26）

新增 `tests/browser_ui_alignment.js`，按现有 Playwright CLI 的 `run-code --filename=tests/browser_ui_alignment.js` 运行。每尺寸建立独立临时 context，四个其他槽仅写隔离哨兵，不连接用户浏览器。覆盖 1280×900 / 1440×1000：神兽肖像/体力/四项资质的逐祖先裁剪测量与命中、训练/技能保留；工坊六页签、十部位键盘选择、物品展开、行囊与工作区独立滚动、固定确认、实际修理精确扣费与刷新；NPC 短/60 段长文案的完整文本、接受/取消/关闭、Tab/Escape/Enter 与焦点恢复；魔塔按钮首屏完整可见/三个命中点、键盘可达、三子页签与底栏稳定；无装备时镶嵌/符文页仍可渲染。

本轮修改前五个优先浏览器专项均通过。最终 verify_all、browser_syntax_and_init、171 项生产回归，以及 pet_roster_scroll、classic_pet_details、inventory_smithy、npc_modal、ui_refinements、ui_alignment、socket_workshop、reforge_choice、rune_workshop、disassembly 十个浏览器套件通过。两尺寸整改专项 pageerror/失败请求/横向溢出/破图均为 0，结果和两尺寸前后截图在 `output/ui-alignment-2026-10-26/`。脚本入口和可复现命令另见其中 REPORT。

三个既有工坊测试的布局断言随授权结构更新：六卡入口改验六工作页签；修理十部位逐个滚动检查；镶嵌改验左侧固定操作与右侧行囊独立性，实际镶入/摘除仍逐孔命中；符文详情允许内容滚动，但确认区仍要求不滚动即完整可达，修理/开孔指引定位到正文控件以避开同名页签。原有所有费用、保护、满袋、过期确认、重铸选择与刷新断言保留。明确夹具不代表自然成长或原版数值还原。

## 全局字体与数字版式（2026-10-25）

将经典客户端正文从强制宋体收拢为`--font-game-body`，数字与属性从混合 Georgia 收拢为`--font-game-numeric`；两者保留 Noto/Source/雅黑/SimSun 西幻衬线与中文回退。战斗节奏、货币、角色属性、行囊数量、对比表、铁匠报价和符文次数统一使用 lining/tabular 数字，避免旧式数字与描述混排。行囊格位在`ui-refinements.css`重新锁定正方形，防止新字体触发宽高漂移。`tests/browser_inventory_smithy.js`保留严格方格断言并输出实测尺寸。

本轮实际验证：1280×900/1440×1000八页布局、键盘切页、固定操作区、刷新保存和零横向溢出通过；行囊/铁匠专项覆盖开局装备实穿、41件分页、预览等于实际穿戴、升星/修理、刷新和零pageerror；浏览器实测正文、描述、货币和属性的计算字体与 lining/tabular 设置一致。`python -X utf8` 的 verify/browser-init 与171项生产回归、`git diff --check`通过。设计扫描报告的战报侧色和面包屑边条为既有视觉语言，本轮未改动。

## 背景、阵容及行囊界面（2026-10-25）

`browser_pet_roster_scroll.js`覆盖两桌面尺寸下图鉴底部连续选择、滚动和焦点保持、展开指引后重绘；修改前日志`ui-refresh-roster-before.log`实际记录390→0。

`browser_ui_refinements.js`覆盖1280×900、1440×1000、1366×768：四种设施背景格位与路由、22肖像加载、只读指引不改变游戏数据、30件物品分页完整、名称不被格位裁切、穿戴留页、部位筛选、刷新与四个其他存档槽保护。明确使用中期资源夹具；结果为`output/playwright/ui-refinements-browser.log`。另有两尺寸神兽详情和行囊操作回归日志；171项生产断言及五项规定Python检查最终日志为`ui-refinements-final-*`。

1398×436极矮窗口的旧行囊布局测试仍失败，不作为本轮通过证据；旧装备布局脚本还缺少穿戴留页后显式打开装备页的步骤。本轮未放宽其断言，也未修改战斗机制来迁就随机战斗结果。

## 法师终战与中期目标续验（2026-10-24）

修改前基线为`output/playwright/mage-pressure-before-*`及`midgame-goals-before.log`，首版预期失败、圣遗物生产遗漏和魔能光环小数问题分别留存`mage-pressure-red.log`、`mage-pressure-relic-before.log`、`mage-aura-integer-before.log`。后续当前生产验收为`mage-final-test_*.log`，网页日志必须有`### Result`且无`### Error`。

```powershell
node tests/probe_mage_finale.mjs mage-diagnostic
node tests/test_relic_settlement.mjs
node tests/test_mage_finale.mjs
node tests/test_midgame_goals.mjs
```

诊断脚本从三职业×三搭配自然赚得检查点生成`mage-pressure-earned-fixtures.json`，不读用户存档。它的光环/吸血/护盾消融仅用于归因，不是全程UI。`test_mage_finale`保留每搭配100配对样本和80%可靠通关门槛，同时要求法师均衡档最低生命至少下降10个百分点；另覆盖有限引导、准确20秒到期、六类持续回复、控制/破魔、拥有/疲劳、当前魔力抽取、护盾过载不暴击及魔抗/吸收、无护盾无过载、小数回蓝不污染生命。

`test_relic_settlement`覆盖三职业×六个圣遗物阈值，胜利当次觉醒、重复拒绝、刷新战力一致及其他四槽不变。`test_midgame_goals`覆盖三职业六件奖励的只读比较、零随机数/发布、三段逐战剧情及实际装备一致。原`test_finale_pressure`的购买反制断言改为必须实际减少阶段施法与余烬，仍保留80%胜率底线；原因是生产结算补齐真实圣遗物后，旧输入的胜率增幅断言已饱和为100→100。`test_finale_phases`的魔抗伤害对照关闭免费复活，避免把是否复活混入最终余血比较，逐法术伤害与非暴击断言保留。

目标预览另先复现吟游诗人25速度只在战斗内生效的问题（`midgame-bard-preview-before.log`），再检查三职业共用间隔等于实际战斗开场间隔。`mage-mana-playback-before.log`保留旧战报缺魔力快照的失败，网页专项要求演播末态双方魔力等于真实战斗余额，不能只验证静态技能说明。

实际网页继续用Playwright CLI：`browser_mage_finale.js`两尺寸普通/实际付费光灵反制、战斗机制栏、有限抽魔和回复压制、首通/体力/刷新/四槽；明确赚得档加载与战斗随机数夹具。`browser_midgame_commissions.js`三职业×两尺寸实际54战，新增可选目标入口焦点、逐战对白及领奖前属性表与实际穿戴一致。`browser_full_ui_journey.js`新增终战生命/抽魔/压制观测和整数生命断言；所有状态变化仍经可见控件，只有单独成功的新档运行可计全程UI通关。

## 终战有限压力续验（2026-10-24）

修改前基线为`output/playwright/pressure-before-{runtime,combat_timing,boss_tactics,finale_phases}.log`及`pressure-before-browser-boss.log`；接手续验前又实际运行12项时序与8项终战。新增行为先在`pressure-red.log`失败。10%余烬与必中试案使自然战士路线失败，降低压力后重跑原断言，未放宽54路线的80%冻结胜率门槛；失败日志保留在`pressure-first.log`及`pressure-routes-{first,second}.log`。

最终受影响生产结果使用`pressure-final-*.log`（前轮为`pressure-verified-*`），171项生产、12项时序、6项首领、8项阶段/重试、7项中期支线及54条自然路线通过。`test_finale_pressure.mjs`新增8组：85%命中下限且保留闪避；每段最多两次余烬、真实魔力与独立行动数；魔抗/减伤/铁卫/净化边界；预警后控制熄灭、破魔与疲劳/拥有关系；减免后法力吸收及回复上限；余烬致命后一次复活、击杀/死亡/超时终止；三职业×均衡/进攻/守护各100配对种子；脆弱进攻支线实际花费30500金币/120魔晶/1蛋缔约光灵并改雇铁卫，终战28→88胜/100，光灵疲劳后62胜，与仅铁卫一致。配对样本均使用真实赚得检查点，不发奖、不增加免费装备/草药；单机制边界另用显式夹具。

`browser_boss_tactics.js`最终在两桌面尺寸各完成终战1场、时空古门15场，技能栏和战前说明核对85%/2次/2%；实际打出两段各2次余烬、逐次扣100首领魔力、连击不重复、净化只免异常，并结算/刷新/核对其他四槽原文。`browser_finale_retry.js`两尺寸实际超时、败退、零钥匙/次数重试、获胜与提现通过，均pageerror/意外失败请求/横向溢出0。它们均为隔离夹具，不能称自然成长或全程UI。

追加`browser_finale_pressure.js`：加载上述赚得的脆弱进攻检查点作为明确夹具，实际Enter缔约、设副宠、雇铁卫、刷新、挑战与结算，核对完整货币/蛋、3/1体力、拥有关系、焦点、唯一首通、其他四槽及两尺寸溢出。运行前先运行`node tests/test_finale_pressure.mjs`生成检查点。具体实际运行结果与本轮全程UI数据见`PROJECT_STATE.md`文首；脚本存在不代表验收通过。

本轮该脚本实际两尺寸各获胜，完整扣30500金币/120魔晶/1蛋、体力3/1及两次刷新通过，pageerror/意外失败请求/横向溢出0，日志`pressure-verified-browser-counter.log`。另将CLI控制页导航到`?absorb-set=1`后运行`browser_boss_tactics.js`，只在隔离夹具增加4件卡尔里斯装备，核对有效属性30%及余烬吸魔真实战报；两尺寸各4次余烬回复180魔力、各15层古门和刷新/四槽保护通过，日志`pressure-verified-browser-absorption.log`。三条全程UI不替代四件套夹具验收，后者也不冒称新档自然获取。

## 终战阶段与中期装备支线（2026-10-24）

修改前受影响生产/浏览器基线留在`output/playwright/finale-mid-before-*`，新增阶段法术前的对照另见`finale-mid-side-before-browser.log`。本轮续验输出前缀为`finale-resume-`；CLI必须实际返回`### Result`且没有`### Error`，进程退出0不能证明通过。

| 套件 | 本轮行为范围 |
| --- | --- |
| `test_finale_phases.mjs` | 8组：70%/35%真实边界与下一行动蓄势、每阶段有限尝试、百分部分不暴击、魔抗减伤、独角兽/净化与疲劳、控制打断和破魔、超时/旧版保留、三职业赚得资产配对抽样、王座重试与旧身份/奖励/准入边界 |
| `test_midgame_commissions.mjs` | 7组：顺序前置、三职业两套完整奖励/一次发布/重复拒绝、满袋、非法选择/损坏领取记录、五槽重复迁移、6条真实赚资源路线、魔抗与输出取舍及实际龙息伤害 |
| `browser_midgame_commissions.js` | 三职业×1280×900/1440×1000，54场实际讨伐、三段任务/导航/取消/键盘二选一/完整货币报酬、背包翻页选中实穿与预览一致、54次刷新、其他四槽原文保持，pageerror/意外失败请求/横向溢出0。是赚得中期档加载为明确夹具，不能称全程UI |
| `browser_finale_retry.js` | 两尺寸各真实300秒超时→败退→刷新→零次数无钥匙重试→实际获胜/阶段法术→首通一次→主动结算→刷新。验证旧收益不重发、不补每日次数、焦点恢复与其他四槽保持；明确固定随机数和零次数/无钥匙夹具 |
| `browser_boss_tactics.js` | 两尺寸各终战1场+时空古门15层：实际护盾、两次阶段蓄势/施放、净化异常免疫、固定挑战按钮、真实喂养消费、首通/古门奖励、刷新与四槽保护；pageerror/意外失败请求/横向溢出0，明确等级/装备/伙伴/随机数夹具 |
| `browser_commissions.js` | 本轮重新回归国家指引、誓言和原酒馆委托，三职业×两尺寸，不沿用历史通过结果 |
| `browser_town_hover.js` | 两尺寸72次hover/focus/active最大位移0；新档锁定解释、解锁夹具入口/返回、键盘、pageerror/横向溢出0，`finale-resume-town-hover.log` |

支线首次网页验收失败于报酬在行囊后页，现通过真实上一页/下一页定位，不改变生产分页或奖励断言。续验又捕获刷新返回时`window.gameState`尚未挂载，新增等待实际app/state/视图就绪后再检查；未延长业务控件超时。关闭失败context造成的请求取消保留在失败日志，不误报为已证实的游戏网络故障。

截图复核另发现战斗页技能栏把有限阶段法术显示为“每2次行动”；新增DOM行为断言先在`finale-panel-before.log`复现，再修复`battleView`按`hpThreshold`展示70%/35%蓄势、下次行动、每场一次和控制打断。修后重跑完整两尺寸首领专项，结果`finale-panel-after.log`；只改显示适配，不改变演算或奖励。

全程UI脚本默认加入额外三支线，法师选`ward`、其他职业选`assault`；可通过控制页`?full-ui-class=warrior&midgame-build=assault`覆盖，`midgame-build=none`选择主线对照。资源、等级、装备和战斗随机数均不注入，所有资产变化走可见控件；逐项验证实际讨伐、奖励选择、货币、实穿和刷新。具体已运行的职业/路线及耗时以`PROJECT_STATE.md`最新结果为准，不把支持脚本当作已验收。

## 启动入口与战败结算（2026-10-24）

修改前：`output/playwright/experience-review-runtime-before.log`为生产基线，`experience-defeat-before.log`实际复现败退后`remainingMp`空对象错误。修复后`experience-runtime-final.log`171项生产断言通过，新增超时建议、两次确认只结算一次及体力/耐久扣除断言。五项规定Python检查保存为`experience-<脚本名>.log`，均本轮执行通过。

Playwright CLI使用独立context，本轮结果：

- `browser_defeat_settlement.js`：两尺寸×致命/超时4场真实战斗和Enter结算，半经验500、金币不增、首通不发、主宠体力-3、魔药到期、全身耐久-1；刷新数据一致、其他四槽保持、焦点恢复、返回按钮实际命中、超时说明可见，pageerror/横向溢出0。日志`experience-defeat_settlement-final.log`；截图`defeat-result-<模式>-<尺寸>.png`已目视检查。明确等级/装备/伙伴/战斗随机数夹具，不证明自然难度或全程UI。
- `browser_castle_settlement.js`：4战/3次入场及重复回调、提现、刷新再验通过，`experience-castle-regression.log`。
- `browser_party_training.js`：三职业×两尺寸实际培养/主副宠/野外战斗/刷新与焦点通过，`experience-party-final.log`。
- `browser_playability_onboarding.js`：两尺寸新档实际首战、第三章升星、第四章孵化、上下寻路、穿戴留页/焦点及刷新保护通过，`experience-playability_onboarding-final.log`。
- `browser_battle_page.js`：两桌面尺寸战斗页、装备/技能、实际战斗、结算返回、玩家文案/异常详情隐藏及横向溢出通过，`experience-battle_page-final.log`。先前脚本的1440桌面通过后，在390宽行囊遇到遮挡超时；当前按桌面设计范围替换尺寸，保留原行为断言，不宣称手机修复。
- `browser_startup_recovery.js`：两尺寸断连/持续等待共4路径，通过故障恢复、键盘重试、迟到初始化及五槽保护，`experience-startup-final.log`。断连请求为主动注入，真实pageerror为0。

启动器实际运行`python -X utf8 start_game.py --no-browser`及`start_game.bat --no-browser`，复用正式8088原服务；另在临时目录/独立端口以生产`server.py`验证冷启动、重复启动只有1个新进程、首页替换为其他服务时拒绝且不终止进程。测试仅终止自己启动的临时服务。`python -X utf8 start_game.py`已成功请求默认浏览器打开，但默认浏览器中的玩家操作不作为自动化验收；可见隔离窗口已核对游戏页面。

## 启动恢复与首领反制收尾（2026-10-24）

最新结果以`PROJECT_STATE.md`文首收尾段为准。修改前日志`closing-startup-recovery-before.log`实证模块断连导致静默空壳；`closing-before-boss-routes.json`为原54条自然路线。接手补验`closing-resume-boss-baseline.log`通过6项生产断言，但浏览器仍失败；新增真实战报断言的`closing-adapter-before.log`明确失败于终战护盾未传到网页，随后修复`TowerView`的护盾/古门技能/魔力传递。

本轮使用Playwright CLI的`run-code --filename=tests/<脚本>.js`，脚本自建隔离context，不访问玩家浏览器存储。CLI返回0不等于通过，日志有`### Error`即失败。成功日志为`output/playwright/closing-verified-*.log`：

| 专项 | 实际验证范围 |
| --- | --- |
| `browser_startup_recovery.js` | 1280×900/1440×1000各断连与持续等待两场景，共4场景；新档失败不写五槽、Enter重载、迟到成功移除提示、旧档再次故障恢复/刷新/职业锁定、数据逐值保持及其他四槽原文保持。断连请求是明确故障注入，不计为正常流程失败 |
| `browser_boss_tactics.js` | 两尺寸各100层终战1场+时空古门15层，共32场实际UI战斗；战前Enter展开、固定挑战按钮、真实60000护盾吸收/破盾、古门关底先蓄势再施法、净化免疫减速、真实喂食+35及扣1口粮、探险主动结算、首通/副本奖励/刷新保存/职业不重选/其他四槽原文不变、pageerror/横向溢出为0。等级/装备/神兽/章节/口粮及固定战斗随机数是明确夹具，不证明自然获得 |
| `browser_boss_abilities.js` / `browser_boss_counterplay.js` | 20/30/100层法术、实际赚声望兑换并学净化；50层重生/纳迦/疲劳及60层汲取/银飞马/疲劳、首通结算、防重复和刷新。保留既有战斗/报酬断言；夹具补齐开场关闭、章节准入和1份喂养口粮，未放宽生产规则 |
| `browser_playability_progression.js` | 两尺寸各10层实际UI、阵容合击破盾、有限调查经验逐层发放和全奖交付/刷新，明确资源夹具 |
| `browser_restoration_layout.js` / `browser_town_hover.js` | 两尺寸八页、固定操作区/焦点/刷新；王都72次hover/focus/active最大位移0。目视复核新增首领说明截图，现有材质与比例保留 |
| `test_boss_tactics.mjs` | 6组生产行为：终战原基础属性/旧版参数、普通输出与搭配破盾都能胜且用时有差、古门生产法术预警、独角兽与净化替代/疲劳失效/实际时间差、独立护盾不伪造古门阶段、说明与实际配置一致 |
| `test_restoration_routes.mjs` | 54条从空档赚资源路线：三职业×三种子×三搭配×主线/适量支线；26章/100层、资源闭合、逐章备份校验、终战各100冻结样本。每份样本额外记录余血、复活率与敌方施法数；不是全程UI |

自然路线最终快照`closing-final-boss-routes.json`；断连/持续等待恢复前后证据与正常96次冷启动/刷新分别保存，96次未复现不证明历史偶发事件必为同一原因。`browser_full_ui_journey.js`本轮追加逐战护盾/蓄势/施法/免疫记录及终战60000护盾断言；三职业收尾日志为`closing-full-ui-{职业}.log`，只在该职业运行成功后计入本轮全程UI通关。

三份收尾日志已实际成功：战士/法师1440×1000、猎人1280×900，各163胜0败、26章/100层、6次刷新、终档89级/7阶、pageerror/横向溢出0；战斗演算58.70/48.33/35.05分钟，自动操作234.0/243.4/264.2秒。本轮均从空档逐按钮走完，未注入状态或固定随机数；自动“跳过”仅结束动画，不跳结算。`casts`为双方技能施放总数，不能误当敌方次数；自然路线的`meanEnemyCasts`才按首领具体技能名统计。猎人本次终战未出现眩晕免疫日志，不把每条路线都能遇到每种机制作为验收结论。最终170/12/7/4/6项生产专项、54路线、五项规定Python检查和`git diff --check`通过。

## 新手、行囊神兽与成长续修验收（2026-10-24）

修改前基线和完整结果读取`PROJECT_STATE.md`文首最新段，旧历史通关记录不替代本轮验收。最终生产命令均本轮重跑通过：

```powershell
node tests/test_runtime.mjs
node tests/test_combat_timing.mjs
node tests/test_party_training.mjs
node tests/test_playability.mjs
node tests/test_playability_progression.mjs
node tests/test_commissions.mjs
node tests/test_commission_routes.mjs
node tests/test_growth_balance.mjs
node tests/test_hunter_growth.mjs
node tests/test_hunter_robustness.mjs
node tests/test_restoration_routes.mjs
```

`test_runtime`为170项，覆盖营地训练真实扣款/经验及失败无损；`test_playability`为4项，覆盖版本化教学、上下寻路、只读行囊筛选和五槽幂等；`test_playability_progression`为4项，覆盖古门逐层有限预算、重入防刷、旧未领报酬及三职业合击实效。时序12项保留独立行动、减速/控制/回复/蓄势/同刻死亡/超时检查。两个路线脚本分别覆盖54主路线与54扩展路线；后者36检查点×**5**成长版本×100随机数为18000战，另2700次潜能对照。汇总必须保留现版相对5.5/1.5和7.5/2.5的两份对照，不混用不同资产路线归因。

真实浏览器通过Playwright CLI依次运行`run-code --filename=tests/<下列脚本>.js`：

| 脚本 | 实际验证及证据边界 |
| --- | --- |
| `browser_playability_onboarding` | 两尺寸新档首战、升星/契约顺序、穿戴留在行囊、上下寻路、焦点和刷新；其余四槽哨兵不变 |
| `browser_inventory_operations` | 两尺寸等级/行囊/伙伴夹具；筛选/排序/用途导航、满体力不扣肉、真实喂养、主副位交换；Enter训练20→25级精确扣6981金币/25魔晶/1口粮、其他伙伴/英雄不变、Escape焦点与刷新保存 |
| `browser_classic_pet_details` | 两尺寸资源夹具；真实喂养/洗练/学书/退书、按钮可达与文字不截断。失败额外保留请求/初始化诊断 |
| `browser_restoration_layout`、`browser_town_hover` | 两尺寸八页、固定205px操作区、键盘切页、阵容撤下刷新；王都72次几何检查最大位移0 |
| `browser_playability_progression` | 每尺寸10场古门UI实战，经验逐层递增/单层最多升1级、实际交付1000金币/20魔晶/200声望/3口粮、claimed刷新保留；明确Lv50/资产夹具 |
| `browser_commissions` | 从本轮任务路线生成夹具，三职业×两尺寸，30UI战/30刷新、4任务全额奖励与五槽哨兵 |
| `browser_initialization` | 12个隔离context×冷启动/刷新共24次，零pageerror/失败请求；只是未复现，不能证明间歇超时已经修复 |

神兽改色前`playability-pet-before-contrast.log`通过；修改后首次`playability-pet-after-contrast.log`在创角前超时，保留失败。增加诊断后`playability-pet-initialization-diagnostic.log`通过，24次冷启动亦通过；尚未取得该超时根因，不改断言、不增加自动重试掩盖。最终日志统一`output/playwright/final-*`。两尺寸目视复核技能空槽和神兽操作，detector只剩index既有破折号advisory。

本轮全程UI日志为`full-ui-warrior-fresh.log`、`full-ui-mage-fresh.log`、猎人最终改动后重跑的`full-ui-hunter-after-growth.log`；三者163胜、26章/100层、89级/7阶、6刷新。使用现有提取工具`node tests/extract_full_ui_result.cjs <日志>`和`extract_full_ui_chapters.cjs`读取，不能将自动操作墙钟或战斗演算分钟当作手工游玩时间。另五项Python规定检查均以`python -X utf8`实际通过，未更改原断言。

## 一次性任务簿（2026-10-24）

`node tests/test_commissions.mjs`：10组生产断言，精确12/15/19级准入、重复接取/未完成领奖拒绝、只计接取后的适配胜利、三国共享一次身份、正常/首领/塔层分工、旧塔回调拒绝、全额经验/货币/egg类型与品质、19级拒绝不扣蛋/45级正常孵化、满袋不丢物与堆叠、跨级领奖一次发布完整奖励、跨日保留、非法备份不写槽、五槽旧档迁移/读档幂等/资产保持、损坏claimed不能重领。

`node tests/test_commission_routes.mjs`：三职业通过原生产自然路线取得13级检查点，用实际战斗与原有调查奖励成长到19级，再做3场普通/1场狼王并交付誓言/国家/护送，精确取得各2枚暗金蛋。成长准备20胜/职业，测试没有免费资产/等级注入；不称全程UI或验证所有随机配置。输出`output/playwright/commissions-fixtures.json`供网页夹具加载，另有`commissions-earned-routes.json`记录。

先运行上面的路线脚本，再运行：

```powershell
npx --yes --package @playwright/cli playwright-cli -s=commissions open http://127.0.0.1:8088
npx --yes --package @playwright/cli playwright-cli -s=commissions run-code --filename=tests/browser_commissions.js
```

网页每次新建隔离context，三职业×1280×900/1440×1000共6条。先真实空档检查等级锁，再载入自然模拟所得19级检查点（明确为预置夹具），槽3作测试槽、其他四槽作受保护哨兵。实际键盘接受/取消、任务目标导航、3普通/1狼王/1塔层UI胜利及4份报酬精确入账、塔中收益撤离、每条5次刷新、职业锁定、部分/未领/已领保存、19级不能孵化不扣蛋通过；45级孵化另为明确等级夹具，实际产出暗金伙伴、消费1枚任务蛋再刷新。合计30胜/30刷新，pageerror=0、横向溢出0、四哨兵槽逐字不变。弹窗关闭等待隐藏后再截图，避免关闭动画被误当作常驻遮罩。实际截图发现已交付仍显示“待交还”，修复渲染条件后追加`银质徽记已交还巡逻队`及不含`待交还`的页面断言，保留领奖与进度原断言重新执行。

本轮另外重跑170生产/7阵容/12时序、54自然路线（输出与修改前一致）、五项规定检查，以及`browser_town_hover.js`两尺寸72次几何样本最大位移0。Windows Python输出使用`python -X utf8`，不修改原断言。只验证新增任务实际路径，不把旧三职业全程UI结果当本次任务验收。规则等级、NPC和报酬的证据边界见`RESTORATION_AUDIT.md`。

## 生存阵容与开场还原（2026-10-24）

`node tests/test_survival_traits.mjs`：最终11项生产断言，初始10项先实际记录8项失败再修复，并追加同一击假死失败后凤凰兜底。验证凤凰30%边界/20%恢复/最小1生命、每场一次尝试与古堡独立复活；小妖精逐次50%/致命反击/技能直伤/非致命不触发/毒伤穿透/疲劳与拥有关系；五槽资产、备份及重复读取；开场身份与原任务衔接。

`node tests/test_survival_routes.mjs`：三职业×三种子共9条空档生产模拟，防护培养+凤凰/小妖精两副宠，真实赚取并扣除指定契约费用及合格蛋，每章备份解析/资源闭合/维护。均163胜0败、26章/100层、零现实等待；不称全程UI。原54路线同步重跑，输出与修改前一致。

`npx --yes --package @playwright/cli playwright-cli -s=restoration-audit run-code --filename=tests/browser_survival_traits.js`：两个独立context对应1280×900与1440×1000，各先真实空档创角、检查新开场/取消零奖励/Escape焦点/Enter接受并取得装备，再使用明确15级/拥有宠物夹具。在未修改的森林首领实际战斗中验证连续假死、逐战体力61→60→59和疲劳失效、凤凰0.29999/0.3边界及实际20%回复，每场结算刷新，检查资产/职业保留、战报和横向溢出。共10战、10次刷新、pageerror=0；固定的只是战斗随机数，不能当作自然获取或全程通关。首次实际失败为开场取消焦点，修复`main.js`开窗入口后原断言通过。图像目视检查保留当前风格。

本轮另重跑170项生产、7项阵容、12项时序及五项规定检查。来源分级及未确认事项见 [RESTORATION_AUDIT.md](RESTORATION_AUDIT.md)。不把历史三职业全程UI报告当作本轮新增功能验收。

## 猎人成长与全程UI续作（2026-10-24）

追加续修：`node tests/test_hunter_robustness.mjs` 以17/2718/8191三种新种子运行另外54条空档生产路线，保持三职业×三种培养/阵容×主线/适量悬赏，逐章解析备份并检查资源闭合。另36份真实赚得的猎人检查点×四组自动成长×100配对战斗随机数，以及9种终战配置×三种同额潜能分配×100样本，区分自动攻击/速度与敏捷投入价值。不是全程UI，不把相同路线初始种子称为跨职业相同掉落：战斗会改变后续随机数消费。

猎人自动成长改为每级攻击5.5、速度1.5；原18路线战斗演算中位数32.05→34.95分钟，扩展后猎人36路线均零败。新增种子发现战士17/均衡/适量悬赏的终战66%胜率与实际1败；冻结首轮为69/100。随后新增完整属性倍率断言，实际复现泰坦魔药只增基础属性，修复生产属性汇总并通过已有草药的最终三层备战处理，原断言不放宽，该路线99/100。扩展54路线全部0败、0现实等待；战士最低98%、法师/猎人100%终战胜率。固定猎人配置自动成长对照，四节点耗时增加7%–10.5%，九种终战配置敏捷均仍优于同额力量/智力，均100样本验证。

生产回归增加两项：三职业带装备/封号/主宠的完整魔药倍率、真实草药消费、第三战到期；终战指引只读、材料不足继续、足够覆盖不重复配制、即将到期需重备、97层不提前用药。五槽旧猎人档迁移同时保留剩余两战的历史有效魔药。浏览器契约专项追加商行→主线角斗页真实键盘导航、旧档有效魔药JSON导入及刷新后的倍率/剩余次数；仍为隔离等级/余额/伙伴夹具，不称自然获取。全程UI脚本追加键盘炼金、真实草药扣除、完整倍率、逐战消耗及最后三层配制后刷新，所有变更仍来自实际控件。实际通过结果与失败定位见PROJECT_STATE文首，不沿用旧通关结论。

`tests/browser_growth_preparation.js` 使用明确98层/装备/封号/草药夹具，在两个桌面尺寸验证真实指引→炼金、恰好耗尽3/2草药、总属性倍率、Enter操作/Escape关闭及禁用后的焦点回退、刷新不丢魔药/探险身份/收益池、材料/魔晶/永久潜能上限禁用。该专项没有声称自然赚到夹具资源或完成三场终战；自然三战扣次由全程UI脚本逐场验证。

本次全程UI有效结果：战士247.9秒/57.35模拟分钟，法师287.2秒/57.63模拟分钟，猎人268.5秒/35.98模拟分钟；各163胜0败、26章/100层、89级/7阶，6次刷新，pageerror=0。首轮法师在25章刷新出现未初始化状态，catch的二次读取覆盖原始错误；该次保留为失败，后续新档全程复跑成功。诊断现保留原始异常/最后状态/pageerror/失败与挂起请求/隔离槽原文，不再被诊断错误遮盖；首次加载失败仍未复现确认根因，不把重跑通过描述为已彻底消除此问题。控件超时与业务断言没有放宽，详见PROJECT_STATE文首。

修改前实际通过54路线、9条基本成长、12项时序与168项生产；原始54路线结果另存 `output/playwright/restoration-routes-before-hunter-*.json`。新 `node tests/test_hunter_growth.mjs` 验证四类敏捷来源/强化倍率、只读属性预览、被动、五槽旧档资产及读取幂等，并在四个冻结成长节点以五组系数与100个配对随机种子比较：相同角色/装备/敌人，只变系数，不发奖。最终节点当前方案100/100胜，对照旧系数40.92秒、当前56.51秒；这是同一新路线角色的反事实数值测量，不能当作旧路线或玩家实际游玩耗时。旧运行记录另见修改前产物。猎人54路线中的18条从20.8–32.8变为26.4–40.7模拟战斗分钟，均163–167战、0败，不增加支线/经验或现实等待要求。

`tests/browser_full_ui_journey.js` 是新的全程逐按钮验收，区别于旧 `browser_full_journey.js` 的中段生产API。从独立浏览器context空档创角，所有状态变更只经页面控件；`evaluate` 仅只读状态、配置、报价和布局，不调用变更方法、不导入模拟路线、不注入等级/资源/随机数/时间。真实操作调查、穿戴与换装对照、剩余潜能与技能点、喂养/进阶、镶嵌/重铸、佣兵、全部主线及所需古门/屠龙/NPC竞技/要塞/转职/魔塔与撤离。猎人另通过自然获得的蛋/货币指定缔约两副宠，检查实际扣款、所有战斗3/1/1体力消费与唯一占位；其他职业保持单主宠。战斗使用玩家可见的“跳过”结束动画，仍真实结算和逐战记录；不声称看完全部战斗动画。第7/10/20/25章及终档刷新核对资产/培养/职业，逐章和战斗检查横向溢出，技能点用键盘Enter消费并检查焦点（末点/满级时转可用控件）。

运行时先用控制页URL参数选职业，再运行脚本；产物为 `output/playwright/full-ui-{职业}.log` 和逐章截图。每个职业运行结果单独判断，CLI退出码0但日志含 `### Error` 仍是失败，不得用旧混合路线结果代替。该脚本不操作控制页存档，隔离context退出后销毁；不触碰用户五槽。

本轮实际结果：三职业各163战、0败、26章/100层、终档89级；每职业前10章12战、中段140战、终章11战全部真实UI。战士/法师1440×1000，猎人1280×900；自动操作236.0/240.2/251.5秒，战斗演算49.49/54.51/27.45分钟，pageerror=0，五次刷新保存通过。不得把自动操作秒数视为玩家手工游玩耗时。修复技能末点/满级焦点及王都两处面包屑后，阵容培养三职业×两尺寸、契约/旧档导入两尺寸、八页布局两尺寸、王都72次几何检查再验通过，最大位移0，均pageerror=0；契约旧档专项为明确夹具，不计入自然通关。`test_hunter_growth.mjs`另比较同一冻结角色的敏捷/力量/智力投入，100样本终战均胜，平均56.51/59.30/63.20秒，防止下调敏捷后使职业主属性失去价值；不据单个配置宣称全局最优。

```powershell
npx --yes --package @playwright/cli playwright-cli -s=mota goto "http://127.0.0.1:8088/?full-ui-class=hunter"
npx --yes --package @playwright/cli playwright-cli -s=mota run-code --filename=tests/browser_full_ui_journey.js
```

## 主副宠/职业培养/节奏与UI验收（2026-10-24）

对应 `PROJECT_STATE.md` 文首四阶段。本轮已实际运行以下套件，不能沿用下方历史结果代替。接手后追加修复前先重跑7项阵容/培养、12项时序、168项生产、9条基本成长及54条新路线；修复商行原生禁用、补齐备份非法边界后，7/168及五项规定检查再次通过。新改动只重测受影响范围。

| 阶段 | 最小必要行为证据 |
| --- | --- |
| 主副宠/技能 | 实际选择主副宠、拒绝重复/未拥有、换位/撤下、特性贡献与疲劳/消费边界；实际赚取/消耗技能资源、前置/上限/不足/重复操作、升级后实际战斗变化；旧单宠/旧技能档重复载入无损、五槽隔离、刷新及备份导入导出 |
| 职业速度 | 三职业同等准备下的间隔与实际行动次数；同属性改变职业基础间隔、同职业改变敏捷的独立对照；减速续期/到期、控制、同刻致死、固定时间回复、首领蓄势/打断、异常速度/超时；面板/换装预览/战报一致 |
| UI还原 | 1280×900和1440×1000，对照原图实际操作人物、装备、行囊、神兽、王都、铁匠、野外、魔塔、庄园、战斗；检查密度/文字/肖像/操作区、滚动/焦点/锁定说明、退出返回/刷新、零横向溢出与pageerror；王都72次零位移保持 |
| 成长体验 | 战士/猎人/法师从隔离新档以合理不同培养/搭配、主线为主及适量支线分别走到26章/100层；只用实际赚得资源，比较卡点、战数/败战、战斗时间/现实等待、维修/食物/金币/魔晶、关键养成收益与首领反制，发现问题修复后重测受影响范围 |

先运行受影响套件建立修改前基线，修改后重跑同范围，完成代码阶段时遵守下方既有生产回归及五项规定检查；重型任务顺序运行。可优先沿用 `test_runtime.mjs`、`test_combat_timing.mjs`、`test_growth_balance.mjs` 和现有浏览器专项，规则变更时更新失效断言但不得放宽以掩盖缺陷。新测试应证明行为而非仅检查字段存在。

区分三种证据：**生产自然路线模拟**证明给定策略和资源路线；**预置夹具浏览器测试**证明操作/结算；**全程真实UI新档路线**才可声称全程逐按钮通关。现有 `browser_full_journey.js` 中段为生产API驱动，不能改称全程手动。战斗模拟秒数不等于用户游玩时长；旧163战/零败不是强制验收阈值，不以所有搭配必胜为目标。测试始终使用独立浏览器上下文与存储，禁止覆盖用户存档。

本轮新增与扩充：

| 套件 | 已验证行为与边界 |
| --- | --- |
| `test_party_training.mjs` | 7项生产行为：合法换位/撤销、非法/未拥有/重复拒绝、副宠天赋与主宠属性/魔典分离、实际毒伤组合及独立疲劳、3/1/1体力与100%/50%/50%经验、三职业主动/被动/光环培养与优先施法；五槽旧档迁移幂等、备份往返、非法阵容/技能/超预算/异常宠物经验体力拒绝且五槽不变 |
| `test_combat_timing.mjs` | 12项：职业14/12/10及NPC/普通怪默认、速度频率、同刻致死取消待执行行动、减速不叠乘/续期/到期与行动进度、眩晕、重创、首领准备/打断、固定10秒回复、PVE光环/疲劳/首击、异常速度和超时保护 |
| `test_restoration_routes.mjs` | 54条空档生产路线：三职业×种子406/123/2026×均衡单主/进攻双副/守护双副×主线/4次悬赏；实际生产战斗/领奖/合同/修理/喂食/培养，每章解析备份，金币/魔晶/声望/经验/食物流水闭合；两种双副路线确实赚得三宠 |
| `browser_party_training.js` | 三职业×1280×900/1440×1000，共6条。真实空档用初始1点培养、过期/不足禁用/刷新职业锁定；之后用明确等级/神兽/准入夹具操作换位/撤下/键盘、培养与优先施法、野外真实战斗及体力扣除、侧栏/战报间隔一致、刷新持久化；选宠、设副宠与撤下重绘后焦点保留在相应伙伴卡 |
| `browser_party_contract.js` | 两尺寸明确准入/等级/货币夹具，实际王都入口→声望商行→扣100声望得1蛋→指定纳迦扣27500金币/140魔晶/1蛋→副宠2；真实训练/优先级、JSON下载包含新字段，撤下后重复阵容导入无损拒绝，有效导入恢复阵容/培养并刷新；再从网页导入无副位/培养字段的50级旧档，刷新后为空副位、41点未投入预算、不重开职业选择，伙伴卡键盘焦点保持、无横向溢出。旧档为隔离夹具，不是用户五槽；不证明自然赚得契约成本 |
| `browser_restoration_layout.js` | 两尺寸八页几何/无横向溢出、侧栏264–288px（神兽页沿用宽侧栏）、10项属性、底部205px/无重叠、键盘命中与截图；滚动神兽详情后固定撤下可操作及刷新。明确使用神兽/等级/准入夹具 |

本轮同时通过 `browser_classic_ui.js`、`browser_ui_readiness.js`、`browser_inventory_smithy.js`。截图已目视对照原版神兽图，确认人物加点滚动、阵容条与技能培养可用，不宣称全部页面像素级复原。`browser_flow.js` 从旧俸禄开局改为当前罗兰委托：三职业不注入等级/经验/资产/随机数，真实UI完成前10章、开孔镶嵌、两项有限调查升至20级与首次晋升、刷新。`browser_full_journey.js` 三职业前7章真实UI，中段生产API，末段每职业11场真实UI最终塔层（合计33场）、39次时序展示核对、魔典退还/重学与修理付款/终档刷新通过。以上真实pageerror=0。

54条路线均完成26章/100层，163–167战、0败、0现实等待。战斗模拟分钟：战士51.8–80.1、法师45.2–86.4、猎人20.8–32.8；每条终战冻结100样本，胜率分别89%–100%、94%–100%、100%。双副宠比相同职业/种子/支线策略的单主路线多消耗5–6份口粮；4次悬赏收入25000金币/195魔晶/420声望/17500经验/5口粮，但增加4战和磨损。路线随机序列消费会分叉，不把总耗时差异当作单项培养的因果收益，未测真人竞技或全程UI通关。完整资源流水与样本在 `output/playwright/restoration-routes.json`。

收尾原文对照：新增狮鹫/纳迦组合断言先复现50%与原文30%不符，修正狮鹫配置30%→10%后，专项同时证明10%+20%=30%及纳迦疲劳后剩10%的真实战斗概率边界。7项阵容/培养、12项时序、168项生产、基本成长与54路线及五项规定检查重新通过。`browser_party_training.js` 增加网页说明10%和实际选择阵容后固有加成30%的核对；`browser_town_hover.js` 两尺寸72次检查仍为0位移，真实入口/锁定解释通过，pageerror=0。

补充执行要求后的最小复验：在同专项已通过基线上补旧主宠浏览器导入；新增焦点断言实际复现神兽卡重绘后焦点丢失，再修复 `petView.js` 的选宠/页签/阵容操作焦点恢复。6条培养阵容网页路径、两尺寸旧档/契约导入、两尺寸八页布局、两尺寸神兽详情真实喂养/重铸/魔典操作均通过，pageerror=0。导入测试曾因 `FileReader` 尚未完成就尝试关闭存档窗而超时，已在每次上传后等待实际确认框出现、处理后等待框隐藏；保留全部扣款/拒绝/恢复断言，不强制点击遮罩。7项阵容/培养、168项生产和五项规定检查再次通过；该焦点修复不改变战斗数值，未重跑无关数值路线。

专项重跑命令：

```powershell
node tests/test_party_training.mjs
node tests/test_combat_timing.mjs
node tests/test_runtime.mjs
node tests/test_growth_balance.mjs
node tests/test_restoration_routes.mjs
npx --yes --package @playwright/cli playwright-cli -s=mota run-code --filename=tests/browser_party_training.js
npx --yes --package @playwright/cli playwright-cli -s=mota run-code --filename=tests/browser_party_contract.js
npx --yes --package @playwright/cli playwright-cli -s=mota run-code --filename=tests/browser_restoration_layout.js
```

浏览器运行前启动静态服务并打开CLI会话，方式见3.2节。CLI可能在`### Error`时仍返回进程0，必须检查输出异常；超时或找不到按钮不能记为通过。每个测试创建独立上下文，不读写玩家浏览器的五槽数据。产物为忽略目录 `output/playwright/restoration-*`、`party-*`、`training-*`。

## 历史验证记录

2026-10-24 符文工坊复查：`browser_rune_workshop.js` 在1280×900、1440×1000使用隔离装备/资源/准入夹具，各实际兑换8次符文、铭刻6次（3000金币）、摘除与空洞回填、损坏后1900金币修理恢复、满袋堆叠与无空间拒绝、刷新保存；7配方键盘选择只改视图，详情和固定按钮可达、按钮文字不压框。11类非法条件含空孔后的错序/额外材料及单孔不足，过期装备/孔位/配方按钮拒绝不扣款，普通宝石可原地回收。`browser_military_merit.js` 关闭开场邀请后以真实入口进入，不强制重置每战页面；5场战斗赚600军勋、兑换400不降衔、3500军饷一次及刷新通过。生产168项、五项规定检查、宝石工坊、王都72次零位移、主界面/神兽/战斗返回和实际开局装备修理属性回归均通过；浏览器pageerror=0。三职业×三种子自然模拟仍完成26章/100层、0败。运行沿用Playwright CLI，产物 `output/playwright/review-*` 和 `material7-runes-*`；隔离资源测试不证明自然获得符文或通关难度。

2026-10-24 王都/镶嵌/重铸：新增 `browser_town_hover.js`，两尺寸六入口×锁定/解锁×hover/focus/active共72次几何比较（位移0），另实际点击准入解释/进出子页，解锁只注入章节前置。`browser_socket_workshop.js` 在1280×900/1440×1000使用明确装备/资源/背包夹具，真实按钮完成4孔/10000金币/4钻具、6次镶嵌/3000金币、免费摘除、中文多属性与百分比、共鸣失效和恢复、满袋拒绝/堆叠回收、刷新；滚轮选材料不移动右侧孔位，空孔数字对比度10.58。`browser_reforge_choice.js` 改为三职业×两桌面尺寸：自然模拟第15章存档的两次付费预览、刷新pending、采用/保留/过期回调，另用余额夹具验证所选晶石耗尽、切换空库存、金币/魔晶不足及恢复可用；检查原生disabled、初始晶石可见、星级不截断和按钮命中。以上与共享行囊/升星/修理/分解复验均pageerror=0；163项生产、五项规定检查及11项成长专项通过。复用 Playwright CLI `run-code --filename=tests/browser_socket_workshop.js` 等，产物 `output/playwright/material6-*`。资源夹具不证明自然获取，三职业全程结论来自生产逻辑模拟。

2026-10-23 行囊/铁匠：`browser_inventory_smithy.js` 在1280×900、1440×1000实际领取/穿戴职业开局装备、完成调查首战并首次升星；随后明确使用41件物品/资源/耐久/星级夹具，验证全部物品分页可达、补给材料互斥、键盘选择与焦点、预览等于实际穿戴（含战斗出手间隔）、嵌宝石拒售/取消/精确+500金币、升星保护失败/普通失败/保护成功三分支的水晶消耗、满星与修理状态/精确付款/刷新。`browser_disassembly.js` 已适配空档无预穿装备，用护胸夹具验证直接选槽、取消/过期/嵌宝石保护、材料2→5与刷新；均为两桌面尺寸，pageerror=0。162项生产测试含三职业27次换装预览对照、无状态/存档/通知副作用与非法条件拒绝，五项规定检查、主界面和修理属性专项通过。运行方式沿用Playwright CLI `run-code --filename=tests/browser_inventory_smithy.js`，产物 `output/playwright/material5-*`。后半夹具不证明自然成长。

2026-10-23 佣兵/弹窗：`browser_npc_modal.js` 在1280×900与1440×1000验证真实扩容确认路径：取消按钮Enter不得付款、初始取消焦点、Tab循环/Esc/焦点恢复、重复Enter不确认、确认只扣一次、长报告正文独立滚动；两处佣兵入口实际付费招募/替换/重复拒绝、可见费用与纸底对比度、女盗SVG加载及结算、刷新保持。资源/准入/1生命女盗使用隔离夹具，不代表自然成长。复用Playwright CLI `run-code --filename=tests/browser_npc_modal.js`；截图和结果为 `output/playwright/material4-*`。

2026-10-23 野外素材补齐：`browser_wild_artwork.js` 在两桌面尺寸各执行五地图键盘预览与20场野外UI战斗，检查普通战斗按钮首屏可见/命中、低等级开战拒绝、预览不改营地、真实移防、首领配置速度、肖像身份及ARIA、精确收益/讨伐数、未绘制敌人矢量回退、刷新保存。使用隔离100级与临时必胜属性，不测自然难度；自然路线另运行 `test_growth_balance.mjs`。森林专项的第五场毒蜥已改为验证新肖像，矢量回退由新专项覆盖；主界面素材解码数增加到16。使用既有Playwright CLI `run-code --filename=tests/browser_wild_artwork.js`，截图与结果在 `output/playwright/material3-*`。

2026-10-23 第二批材质：`browser_classic_ui.js` 解码13张实际素材，并检查战斗操作悬停仍使用生成按钮、灰狼肖像、红蓝球0/50/100%液面/文字/ARIA一致。`browser_forest_portraits.js` 在隔离1280×900上下文以明确的100级/已领章节夹具执行三普通怪、狼王及峡谷毒蜥共5场真实UI战斗，检查四格身份与可访问名字、其他敌人SVG回退、结算前未入账、精确收益/讨伐记录、刷新保持；不作为自然成长证据。`browser_ui_readiness.js` 的王都检查已适配可点击场景入口，验证状态/锁定文字在按钮范围内及损坏装备修理闭环；贴图需目视检查，旧纯色渐变对比度断言不再适用。

`browser_classic_pet_details.js` 使用明确的宠物/等级/资源/已领奖章节夹具，在1280×900与1440×1000验证395/430px宽的宠物详情：实际切换出战、喂食扣肉、重铸扣药、魔典学习与退还，检查按钮命中/滚动可达、长书名不裁切与无横向溢出。它只证明窄详情操作，不证明自然成长。

2026-10-22 构图还原：`browser_classic_ui.js` 在隔离新档验证1280×900/1440×1000顶部页签/左侧角色栏、6张图集/场景/材质解码、6处王都入口及锁定说明、手动装备与可点击底部操作、22种神兽图鉴选择、三账册宽度比<1.2、战斗时序/返回、刷新存档及零pageerror/横向溢出。使用既有 Playwright CLI 的 `run-code --filename=tests/browser_classic_ui.js`；截图在 `output/playwright/classic-*`。人工对照500×300原版神兽截图检查构图，不将重绘插画描述为原版资产。三职业完整主线浏览器回归范围仍按下段限定。

2026-10-22 单机版新增验证：`node tests/test_combat_timing.mjs`（11项：独立频率、同刻致死、减速进度/续期/到期、控制、首领蓄势、固定时间回复、NPC竞技光环、首击与异常速度）；`node tests/test_growth_balance.mjs`（11项：调查经验分期/旧档补领/刷新防重/备份校验，三职业×三个种子的26章+100层自然路线，包含终战100样本）。两者与159项生产回归、五项规定检查均通过。浏览器 `browser_full_journey.js` 覆盖三职业真实开局前7章、生产续章、实际最终11层操作和39场时序UI检查；中段由生产API驱动，不能描述成全程逐按钮通关。`browser_ui_readiness.js` 在两种桌面尺寸覆盖实际穿戴/损坏/修理/卸装与属性展示，fixture只用于验证状态，不作为自然成长证据。

桌面UI验收（2026-10-06）：用户明确手机不在开发设计范围内，历史手机记录仅保留。新增 `browser_desktop_ui.js` 在隔离上下文验证1280×900/1440×1000创角提示、罗兰接受/稍后、实际领取/穿戴、空状态与锁定解释、22张神兽/女盗/佣兵/狼SVG实际加载、空槽不显示耐久、两处佣兵费用与替换说明、真实雇佣扣款、两批采收报价与实际+50魔晶、战斗调速/跳过/结算返回；pageerror=0，页面横向无溢出。庄园时间与佣兵余额/准入用隔离夹具，不覆盖用户存档、不证明自然平衡。159项生产测试与五项规定检查通过；截图在 `output/playwright/desktop-ui-*`，按桌面设计完成一轮检查与一批修正后确认。

---

空档/职业装备验收（2026-10-05）：129项生产测试通过，五项规定检查通过；新增断言新档零资产、前两章真实领取/穿戴/首次升星/孵化顺序、职业图标/专精/主属性、全部奖励生产方、旧装备身份/星级/镶嵌保留和读档幂等、异职业穿戴拒绝/不计属性、草药实际炼金消费。既有子系统测试显式准备已获资源，不依赖新档预赠。

`browser_new_adventure.js` 三职业新上下文不注入等级、装备、资源或随机数，通过实际按钮完成1~7章（至8级/第8章），验证空背包、职业武器/防具、穿戴/强化、孵化/出战、重铸/魔典、第一层实际胜利、任务草药炼金与刷新。含390宽猎人，真实pageerror=0。页面式战斗桌面/手机专项复验通过。此前 `measure_balance.mjs` 的数值记录基于旧赠送开局，本次不得据此声称新档全程平衡；采样器允许无宠开局，但本轮未重跑全程测量。

玩家文案验收（2026-10-05）：`browser_battle_page.js` 同时检查桌面/手机真实创角、神兽图鉴、套装图鉴与野外战报可见文本，不含原著/原版/重制规则/未配置/验证等制作说明；主动派发error与unhandledrejection后检查玩家通用操作提示及内部信息不泄漏。此主动注入不是业务异常，真实路径pageerror=0。123项生产回归与五项规定检查通过；代码注释/文档的考据与规则说明不作为玩家可见文案处理。

当前验收（2026-10-05）：107项生产测试通过，五项规定检查与diff通过。暂停时“无法复活”计数失败是开场说明与实际事件混计，现检查封断事件类型与文本，不放宽触发次数。补充真正毒伤致死、反击致死、阶段/护盾不重置、法术汲取的护盾/溢出/缺血上限/满血边界。50/60层六条浏览器实际反制/疲劳/首通/刷新路径通过；三职业自然角色同级200配对种子测量不领奖、使用既有古堡复活，数值与范围见PROJECT_STATE。

魔塔资源保护验收（2026-10-05）：112项生产测试及五项规定检查通过。`browser_castle_settlement.js` 实际四战/三次入场，验证同层旧胜利/失败、旧提现按钮、重复入场、银行刷新、两次全额提现与91层败退折半经验、即时首通保留；pageerror=0。预置100级/强装备/钥匙，只证明结算路径，不证明自然难度。50/60层六条反制路径再验通过。

## 1. 测试体系设计理念 (Testing Philosophy)

页面式战斗/引导验收（2026-10-05）：123项生产回归及五项规定检查通过；`browser_battle_page.js` 桌面1440×900、手机390×844真实创角→首任务位置→野外战斗→调速/跳过→一次结算返回。检查MAIN挂载、非fixed、战斗期工具栏收起、双侧阵容/技能/装备、战报、零pageerror/无横向溢出。截图人工核对桌面和手机，最多两轮；魔塔4战专项再验通过，未修改用户存档。

屠龙剧情验收（2026-10-05）：121项生产测试及五项规定检查通过；`browser_dragon_story.js` 三条隔离路径/6次真实胜利，首胜与重胜剧情弹窗、刷新保持、先屠红/银龙后经前一章UI领奖进入11/19、历史认可与目标章一次领奖。等级/装备/前一章完成条件预置，不证明自然主线全程。

三龙施法验收（2026-10-05）：119项生产测试、五项规定检查通过；`browser_dragon_abilities.js` 九条实际三龙普通/保护/疲劳战斗，施法/状态/反制与胜利领奖/刷新通过。生产测试另验有限魔力、净化、重创到期和三技能控制打断。自然三职业同级200配对种子启用/停用技能皆100%胜，金龙战斗回合增长；猎人前两龙常在施法前击杀/控制，不以fixture施法证明自然必遇。

三龙验收（2026-10-05）：生产测试117项，五项规定检查通过；`browser_dragon_rewards.js` 三胜一败、刷新放弃未完挑战、每日次数保存、满袋装备/材料发奖、重复回调拒绝、实际孵化两种品质蛋。100级/强装备/固定0.1随机数只证明集成路径。`measure_balance.mjs` 三职业30/50/70级自然角色各200种子，无魔塔复活、不发采样奖励；各龙胜率100%，不证明后续新装备累积路线/长期经济平衡。

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
| `tests/browser_boss_counterplay.js` | 浏览器重生/汲取 | 50层普通/纳迦/疲劳，60层普通/银飞马/疲劳，实际首领战、首通魔晶、重复拒绝、刷新；隔离等级/装备/神兽fixture，不证明自然获得或难度 | 按实际流程 |
| `tests/browser_inventory_sale.js` | 浏览器背包验收 | 隔离15级/41件溢出背包，嵌宝石拒售、取消无损、出售两件后恢复兑换容量、货币/物品刷新保持、默认预览穿戴 | ~ 6s |
| `tests/browser_bag_expansion.js` | 浏览器扩容验收 | 隔离资源/40材料fixture，取消不变，真实扣金币/魔晶扩40→60，不足拒绝，第41格声望购买与刷新保持；不证明自然获取资源 | ~ 6s |
| `tests/browser_inventory_smithy.js` | 浏览器行囊/铁匠验收 | 两桌面尺寸实际开局领奖/穿戴/调查/升星；夹具验证41件分页、预览与实穿、出售、强化三分支、满星/修理与刷新 | ~ 20s |
| `tests/browser_disassembly.js` | 浏览器分解验收 | 两桌面尺寸，空武器/护胸/满40格fixture，键盘直接选护胸、取消、换装后过期确认保护、嵌宝石拒绝、摘除后材料2→5、原装备/宝石与刷新保持 | ~ 8s |
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
  - 解法：装备道具先查阅 `docs/OFFICIAL_ARTWORK.md`、`js/ui/officialItemArtwork.js` 和 `renderGameIcon`，匹配透明 PNG 绘画；`getVectorIcon` 只是旧调用的兼容入口，不应把已选定的绘画改回 SVG。
- **出现 `Node.js 语法检查失败`**：
  - 原因：ES6 语法错误（如缺少闭合括号、拼写错误或模板字符串未闭合）。
  - 解法：根据输出的脚本名称与行号直接修正。
