#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动化前端浏览器环境真实编译与组件实例化回归测试套件 (利用 macOS 原生 JavaScriptCore 引擎)
"""
import os
import subprocess

def test_syntax_and_init():
    jsc = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc'
    
    # 1. 扫描所有 JS 文件，确保 JSC 编译 0 语法错误
    files = []
    for root, dirs, fnames in os.walk('js'):
        for f in fnames:
            if f.endswith('.js'):
                files.append(os.path.join(root, f))
    
    for path in files:
        res = subprocess.run([jsc, '-m', path], capture_output=True, text=True)
        if 'SyntaxError' in res.stderr:
            raise AssertionError(f'SyntaxError found in {path}: {res.stderr.strip()}')
    print(f'✓ 全部 {len(files)} 个前端 JS 脚本通过 JavaScriptCore 真实引擎语法编译！')

    # 2. 模拟前端 DOM 环境与完整 GameApp 初始化
    test_runner_js = """
    globalThis.console = { log: print, error: print, warn: print, info: print };
    globalThis.window = globalThis;
    window.addEventListener = function() {};
    window.location = { search: "" };
    globalThis.URLSearchParams = class {
      get() { return null; }
    };
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; }
    };
    window.requestAnimationFrame = function() {};
    globalThis.document = {
      readyState: "complete",
      getElementById(id) {
        return {
          id,
          style: {},
          classList: { add() {}, remove() {}, contains() { return false; } },
          addEventListener() {},
          querySelectorAll() { return []; },
          querySelector() { return null; },
          innerHTML: "",
          innerText: "",
          setAttribute() {},
          getAttribute() { return null; },
          getContext() {
            return {
              scale() {},
              clearRect() {},
              beginPath() {},
              arc() {},
              fill() {},
              stroke() {}
            };
          }
        };
      },
      querySelectorAll() { return []; },
      querySelector() { return null; },
      createElement() {
        return {
          style: {},
          classList: { add() {}, remove() {} },
          appendChild() {},
          addEventListener() {}
        };
      },
      body: { appendChild() {} },
      addEventListener(evt, cb) {
        if (evt === "DOMContentLoaded") cb();
      }
    };
    """
    
    cmd = [
        jsc,
        '-e', test_runner_js,
        '-m', 'js/main.js',
        '-e', 'print("✓ 浏览器环境 GameApp 成功启动并渲染完成！");'
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise AssertionError(f'GameApp init failed: {res.stderr}\n{res.stdout}')
    print(res.stdout.strip())

def test_zero_emojis():
    import re
    emoji_pattern = re.compile(
        "[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf\u2300-\u23ff\u2b50\u2b55\u200d\ufe0f]"
    )
    violations = []
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for folder in ['js', 'css']:
        target_path = os.path.join(base_dir, folder)
        for root, dirs, files in os.walk(target_path):
            for file in files:
                if file.endswith(('.js', '.css', '.html')):
                    full_path = os.path.join(root, file)
                    with open(full_path, 'r', encoding='utf-8') as f:
                        for line_idx, line in enumerate(f, 1):
                            matches = emoji_pattern.findall(line)
                            if matches:
                                violations.append((file, line_idx, matches, line.strip()))
    if violations:
        for v in violations[:10]:
            print(f"   [Emoji违规] {v[0]}:{v[1]} 包含 {v[2]} -> {v[3]}")
        raise AssertionError(f'发现 {len(violations)} 处 Emoji 违规！')
    print('✓ 全局代码库与样式 100% 零 Unicode Emoji！')

def test_new_features_runtime():
    jsc = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc'
    feature_test_js = """
    globalThis.console = { log: print, error: print, warn: print, info: print };
    globalThis.window = globalThis;
    window.addEventListener = function() {};
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; }
    };

    import('../js/core/state.js').then(async ({ gameState }) => {
      gameState.resetToNewGame();
      const initialStats = gameState.getEffectiveStats();

      // 1. 宝石打孔
      const wpn = gameState.data.equipped.weapon;
      if (!wpn) throw new Error('初始武器未装备');
      const initSockets = wpn.sockets || 0;
      const drillRes = gameState.punchSocket('weapon');
      if (!drillRes.success) throw new Error('打孔失败: ' + drillRes.msg);
      if (wpn.sockets !== initSockets + 1) throw new Error('打孔后孔数未增加');
      print('  ✓ 武器成功开孔，当前孔数: ' + wpn.sockets);

      // 2. 宝石镶嵌与属性加成
      const gem = gameState.data.bag.find(i => i.id === 'gem_atk');
      if (!gem) throw new Error('背包中缺少金刚石');
      const initialAtk = initialStats.atk;
      const inlayRes = gameState.inlayGem('weapon', 0, gem.uid || gem.id);
      if (!inlayRes.success) throw new Error('镶嵌失败: ' + inlayRes.msg);
      const postInlayStats = gameState.getEffectiveStats();
      if (postInlayStats.atk !== initialAtk + 25) {
        throw new Error('镶嵌金刚石(+25)后攻击力计算有误: 期望 ' + (initialAtk + 25) + '，实际 ' + postInlayStats.atk);
      }
      print('  ✓ 成功镶嵌金刚石，攻击力准确由 ' + initialAtk + ' 增至 ' + postInlayStats.atk);

      // 3. 宝石无损摘除
      const removeRes = gameState.removeGem('weapon', 0);
      if (!removeRes.success) throw new Error('摘除宝石失败: ' + removeRes.msg);
      const postRemoveStats = gameState.getEffectiveStats();
      if (postRemoveStats.atk !== initialAtk) {
        throw new Error('摘除宝石后攻击力未准确回退: 期望 ' + initialAtk + '，实际 ' + postRemoveStats.atk);
      }
      const returnedGem = gameState.data.bag.find(i => i.id === 'gem_atk');
      if (!returnedGem) throw new Error('摘除后宝石未完好返还至背包');
      print('  ✓ 宝石成功无损摘除，属性平滑回退，宝石已安然放回行囊！');

      // 4. 角斗场对决与声望商行
      const { ARENA_OPPONENTS, PRESTIGE_SHOP_ITEMS } = await import('../js/config/arena.js');
      const opp = ARENA_OPPONENTS[0];
      const initialPoints = gameState.data.arena.points;
      const initialPrestige = gameState.data.prestige;
      const initialChallenges = gameState.data.arena.challengesLeft;

      gameState.recordArenaVictory(opp);
      if (gameState.data.arena.points !== initialPoints + 25) throw new Error('天梯胜场积分未增加25分');
      if (gameState.data.arena.challengesLeft !== initialChallenges - 1) throw new Error('挑战次数未递减');
      if (gameState.data.prestige < initialPrestige + opp.prestigeReward) throw new Error('声望胜场奖励未到账');
      print('  ✓ 角斗场胜场结算正确：积分从 ' + initialPoints + ' 升至 ' + gameState.data.arena.points + '，声望 +' + opp.prestigeReward);

      const shopItem = PRESTIGE_SHOP_ITEMS[0];
      const prestigeBeforeBuy = gameState.data.prestige;
      const buyRes = gameState.buyPrestigeItem(shopItem.id);
      if (!buyRes.success) throw new Error('声望兑换失败: ' + buyRes.msg);
      if (gameState.data.prestige !== prestigeBeforeBuy - shopItem.costPrestige) throw new Error('兑换后声望扣除有误');
      print('  ✓ 成功消耗 ' + shopItem.costPrestige + ' 声望兑换【' + shopItem.name + '】，声望余额正常扣减！');

      // 5. 主线任务 10~15 闭环推进
      gameState.data.currentQuestId = 'quest_10';
      gameState.data.questProgress['quest_10'] = { current: 0, completed: false };
      const q10Res = gameState.triggerQuestAction('socket_gem');
      if (!q10Res.completed) throw new Error('主线10未正确由 socket_gem 触发达成');
      gameState.claimQuestReward('quest_10');
      if (gameState.data.currentQuestId !== 'quest_11') throw new Error('主线10交后未流转至主线11');
      print('  ✓ 主线10达成并自动流转至主线11');

      const q11Res = gameState.triggerQuestAction('slay_dragon');
      if (!q11Res.completed) throw new Error('主线11未正确由 slay_dragon 触发达成');
      gameState.claimQuestReward('quest_11');
      if (gameState.data.currentQuestId !== 'quest_12') throw new Error('主线11交后未流转至主线12');
      print('  ✓ 主线11达成并自动流转至主线12');

      const q12Res = gameState.triggerQuestAction('royal_trials');
      if (!q12Res.completed) throw new Error('主线12未正确由 royal_trials 触发达成');
      gameState.claimQuestReward('quest_12');
      if (gameState.data.currentQuestId !== 'quest_13') throw new Error('主线12交后未流转至主线13');
      print('  ✓ 主线12达成并自动流转至主线13');

      const q13Res = gameState.triggerQuestAction('clear_dungeon');
      if (!q13Res.completed) throw new Error('主线13未正确由 clear_dungeon 触发达成');
      gameState.claimQuestReward('quest_13');
      if (gameState.data.currentQuestId !== 'quest_14') throw new Error('主线13交后未流转至主线14');
      print('  ✓ 主线13达成并自动流转至主线14');

      const q14Res = gameState.triggerQuestAction('arena_duel');
      if (!q14Res.completed) throw new Error('主线14未正确由 arena_duel 触发达成');
      gameState.claimQuestReward('quest_14');
      if (gameState.data.currentQuestId !== 'quest_15') throw new Error('主线14交后未流转至主线15');
      print('  ✓ 主线14达成并自动流转至主线15');

      const q15Res = gameState.triggerQuestAction('clear_tower_20');
      if (!q15Res.completed) throw new Error('主线15未正确由 clear_tower_20 触发达成');
      gameState.claimQuestReward('quest_15');
      print('  ✓ 主线15(魔塔20层破界关底)顺利交卷领受终极赏赐！');

      // 6. 神兵重铸与极道词条洗炼
      const goldBeforeReforge = gameState.data.gold;
      const reforgeRes = gameState.reforgeEquipment('weapon');
      if (!reforgeRes.success) throw new Error('装备重铸失败: ' + reforgeRes.msg);
      const weaponItem = gameState.data.equipped.weapon;
      if (!weaponItem.reforge || !weaponItem.reforge.val) throw new Error('装备重铸未生成词条');
      if (gameState.data.gold !== goldBeforeReforge - 2000) throw new Error('重铸金币未正确扣除');
      const statsAfterReforge = gameState.getEffectiveStats();
      print('  ✓ 神兵重铸成功洗炼出【' + weaponItem.reforge.name + '】+' + weaponItem.reforge.val + weaponItem.reforge.unit + '！');

      // 7. 主线任务 16~20 闭环推进
      gameState.data.currentQuestId = 'quest_16';
      gameState.data.questProgress['quest_16'] = { current: 0, completed: false };
      const q16Res = gameState.triggerQuestAction('reforge_gear');
      if (!q16Res.completed) throw new Error('主线16未正确由 reforge_gear 触发达成');
      gameState.claimQuestReward('quest_16');
      if (gameState.data.currentQuestId !== 'quest_17') throw new Error('主线16交后未流转至主线17');
      print('  ✓ 主线16达成并自动流转至主线17');

      const q17Res = gameState.triggerQuestAction('slay_wild_boss');
      if (!q17Res.completed) throw new Error('主线17未正确由 slay_wild_boss 触发达成');
      gameState.claimQuestReward('quest_17');
      if (gameState.data.currentQuestId !== 'quest_18') throw new Error('主线17交后未流转至主线18');
      print('  ✓ 主线17(斩杀狼王)达成并自动流转至主线18');

      const q18Res = gameState.triggerQuestAction('catch_thief');
      if (!q18Res.completed) throw new Error('主线18未正确由 catch_thief 触发达成');
      gameState.claimQuestReward('quest_18');
      if (gameState.data.currentQuestId !== 'quest_19') throw new Error('主线18交后未流转至主线19');
      print('  ✓ 主线18(截获女盗)达成并自动流转至主线19');

      const q19Res = gameState.triggerQuestAction('slay_silver_dragon');
      if (!q19Res.completed) throw new Error('主线19未正确由 slay_silver_dragon 触发达成');
      gameState.claimQuestReward('quest_19');
      if (gameState.data.currentQuestId !== 'quest_20') throw new Error('主线19交后未流转至主线20');
      print('  ✓ 主线19(屠戮银龙)达成并自动流转至主线20');

      // 神兽突破至紫金阶品
      const activePet = gameState.data.pets[0];
      activePet.tier = 'darkgold';
      activePet.level = 40;
      if (!gameState.data.bag.some(i => i.id === 'destiny_stone')) {
        gameState.data.bag.push({ id: 'destiny_stone', name: '天命石', count: 1 });
      }
      const evoRes = gameState.evolvePet(activePet.id);
      if (!evoRes.success) throw new Error('神兽紫金觉醒失败: ' + evoRes.msg);
      if (activePet.tier !== 'purplegold') throw new Error('神兽未达到 purplegold 阶位');
      print('  ✓ 神兽成功终极觉醒突破为【紫金传奇圣兽】！');

      const q20Res = gameState.data.questProgress['quest_20'];
      if (!q20Res || !q20Res.completed) throw new Error('主线20未正确由 evolve_purplegold 触发达成');
      gameState.claimQuestReward('quest_20');
      print('  ✓ 主线20(终章巅峰传奇·紫金神兽终极觉醒)圆满交卷领受战神守护圣剑！');

      print('✓ 新阶段核心功能与主线任务链端到端验证全部通过！');
    }).catch(err => {
      print('ERROR: ' + err);
      throw err;
    });
    """
    tmp_file = 'tests/_tmp_feature_test.js'
    with open(tmp_file, 'w', encoding='utf-8') as f:
        f.write(feature_test_js)
    try:
        res = subprocess.run([jsc, '-m', tmp_file], capture_output=True, text=True)
        if res.returncode != 0 or 'ERROR' in res.stdout or 'Error' in res.stderr:
            print("Output:\n", res.stdout)
            print("Stderr:\n", res.stderr)
            raise AssertionError('Feature runtime test failed')
        print(res.stdout.strip())
    finally:
        if os.path.exists(tmp_file):
            os.remove(tmp_file)

def test_class_advancement_and_sets_and_pets():
    jsc = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc'
    test_js = """
    globalThis.console = { log: print, error: print, warn: print, info: print };
    globalThis.window = globalThis;
    window.addEventListener = function() {};
    globalThis.document = {
      getElementById(id) {
        return {
          id,
          classList: { add() {}, remove() {}, contains() { return false; } },
          addEventListener() {},
          querySelectorAll() { return []; }
        };
      },
      querySelectorAll() { return []; }
    };
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; }
    };

    Promise.all([
      import('../js/core/state.js'),
      import('../js/config/trials.js'),
      import('../js/config/items.js'),
      import('../js/config/pets.js'),
      import('../js/ui/charSelectModal.js'),
      import('../js/config/dungeons.js')
    ]).then(([
      { gameState },
      { ROYAL_TRIALS },
      { OFFICIAL_SETS },
      { PET_CONFIGS },
      { CharSelectModal },
      { DUNGEON_GATES, getDungeonFloorGuard, generateDungeonDrop, getSynergyStrike, SYNERGY_STRIKES }
    ]) => {
      // 1. 测试七阶正统西方魔幻转职称号推进体系 (战士、法师、猎人)
      const warriorStages = [
        '见习战士',
        '魔·战士',
        '幻·战士',
        '影·战士',
        '皇家战士',
        '圣战士',
        '神战士',
        '绝地战士'
      ];

      warriorStages.forEach((expectedTitle, stage) => {
        const actual = gameState.getPromotedClassName('warrior', stage);
        if (actual !== expectedTitle) {
          throw new Error(`战士阶段 ${stage} 转职称号不符合预期: 得到 ${actual}, 预期 ${expectedTitle}`);
        }
      });
      print('  ✓ 战士 0~7 阶西方魔幻转职称号链完全契合原著《魔塔世界》设定！');

      const mageStages = [
        '见习法师',
        '魔·法师',
        '幻·法师',
        '影·法师',
        '皇家法师',
        '圣法师',
        '神法师',
        '绝地法师'
      ];
      mageStages.forEach((expectedTitle, stage) => {
        const actual = gameState.getPromotedClassName('mage', stage);
        if (actual !== expectedTitle) {
          throw new Error(`法师阶段 ${stage} 转职称号不符合预期: 得到 ${actual}, 预期 ${expectedTitle}`);
        }
      });
      print('  ✓ 法师 0~7 阶西方魔幻转职称号链完全契合原著《魔塔世界》设定！');

      const hunterStages = [
        '见习猎人',
        '魔·猎人',
        '幻·猎人',
        '影·猎人',
        '皇家猎人',
        '圣猎人',
        '神猎人',
        '绝地猎人'
      ];
      hunterStages.forEach((expectedTitle, stage) => {
        const actual = gameState.getPromotedClassName('hunter', stage);
        if (actual !== expectedTitle) {
          throw new Error(`猎人阶段 ${stage} 转职称号不符合预期: 得到 ${actual}, 预期 ${expectedTitle}`);
        }
      });
      print('  ✓ 猎人 0~7 阶西方魔幻转职称号链完全契合原著《魔塔世界》设定！');

      // 2. 测试职业只选一次且永不弹窗切换、旧档迁移与刷新不弹出
      if (gameState.createDefaultData().hasChosenClass !== true) {
        throw new Error('createDefaultData 必须默认锁定 hasChosenClass: true');
      }

      // 测试模拟旧存档（缺失 hasChosenClass 字段）在 loadOrInit 后自动固化为 true
      localStorage.setItem('MOTA_WORLD_SAVE_SLOT_1', JSON.stringify({
        data: { name: '老玩家', classId: 'mage', level: 15 }
      }));
      gameState.loadOrInit();
      if (gameState.data.hasChosenClass !== true) {
        throw new Error('旧存档载入后未能自动将 hasChosenClass 固化为 true');
      }

      const mockModal = new CharSelectModal('fake-overlay');
      let opened = false;
      mockModal.overlay = {
        classList: {
          add(c) { if (c === 'flex') opened = true; },
          remove(c) { if (c === 'flex') opened = false; }
        }
      };
      mockModal.open(false);
      if (opened) {
        throw new Error('hasChosenClass 为 true 时 open(false) 仍弹出了职业选择界面！');
      }
      print('  ✓ 存档职业严格锁定唯一一次，旧档自动迁移，刷新及载入决不再出现创角弹窗！');

      // 3. 测试 13 套官方原著远古套装完整性
      const setKeys = Object.keys(OFFICIAL_SETS);
      if (setKeys.length !== 13) {
        throw new Error(`官方套装数量不符合 13 套，当前为 ${setKeys.length}`);
      }
      setKeys.forEach(k => {
        const s = OFFICIAL_SETS[k];
        if (!s.bonus2 || !s.bonus2.desc) throw new Error(`套装 ${k} 缺失 bonus2.desc`);
        if (!s.bonus4 || !s.bonus4.desc) throw new Error(`套装 ${k} 缺失 bonus4.desc`);
      });
      print('  ✓ 13 套远古原著神装（勇气、守护骑士、萨格尔、审判者、克斯特、制裁者、亚丁、征服者、四大女神、卡尔里斯）配置及 2/4 件羁绊完备！');

      // 4. 测试 22 种原著神兽完整性
      const petKeys = Object.keys(PET_CONFIGS);
      if (petKeys.length !== 22) {
        throw new Error(`神兽数量不符合 22 种，当前为 ${petKeys.length}`);
      }
      petKeys.forEach(k => {
        const p = PET_CONFIGS[k];
        if (!p.name || !p.traitName || !p.traitDesc || !p.defaultApt) {
          throw new Error(`神兽 ${k} 缺失基础配置`);
        }
      });
      print('  ✓ 22 种经典原著神兽（金龙、银龙、美人鱼、巨灵、凤凰、白天使、黑天使等）图鉴与特性技能 100% 完备！');

      // 5. 测试地下城七大古门多层推进、多阶段首领战参数与佣兵合击奥义
      if (DUNGEON_GATES.length !== 7) throw new Error(`地下城古门配置数量异常: ${DUNGEON_GATES.length}`);
      DUNGEON_GATES.forEach(gate => {
        if (!gate.id || !gate.name || !gate.minLevel || !gate.totalFloors || !gate.boss) {
          throw new Error(`地下城古门 ${gate.id} 缺失关键配置`);
        }
        if (!gate.boss.hasPhases || !gate.boss.phase1Shield || !gate.boss.phase2EnrageHp) {
          throw new Error(`地下城首领 ${gate.boss.name} 缺失多阶段战斗参数`);
        }
      });

      // 验证中间层守卫生成与关底领主生成
      const floor1Guard = getDungeonFloorGuard('trial_gate', 1);
      if (floor1Guard.isBoss !== false || floor1Guard.hasPhases !== false) {
        throw new Error('地下城中间层守卫不应为首领');
      }
      const floor5Boss = getDungeonFloorGuard('trial_gate', 5);
      if (floor5Boss.isBoss !== true || floor5Boss.hasPhases !== true || !floor5Boss.phase1Shield) {
        throw new Error('地下城关底应为多阶段首领');
      }

      // 验证四大合击奥义匹配
      const wStrike = getSynergyStrike('warrior', 'merc_paladin', 'golden_dragon');
      if (wStrike.id !== 'divine_verdict') throw new Error('战士合击奥义匹配异常');
      const mStrike = getSynergyStrike('mage', 'merc_guardian', 'phoenix');
      if (mStrike.id !== 'crimson_cataclysm') throw new Error('法师合击奥义匹配异常');
      const hStrike = getSynergyStrike('hunter', 'merc_bard', 'silver_dragon');
      if (hStrike.id !== 'gale_phantom') throw new Error('猎人合击奥义匹配异常');

      // 验证关底掉落生成
      const drop = generateDungeonDrop('trial_gate');
      if (!drop || !drop.id || !drop.slot || !drop.setId || !drop.quality) {
        throw new Error('地下城关底掉落格式异常');
      }
      print('  ✓ 地下城七大古门、多阶段首领战、四大合击奥义与专属套装掉落 100% 完备！');
    }).catch(err => {
      print('ERROR: ' + err);
      throw err;
    });
    """
    tmp_file = 'tests/_tmp_advancement_test.js'
    with open(tmp_file, 'w', encoding='utf-8') as f:
        f.write(test_js)
    try:
        res = subprocess.run([jsc, '-m', tmp_file], capture_output=True, text=True)
        if res.returncode != 0 or 'ERROR' in res.stdout or 'Error' in res.stderr:
            print("Output:\n", res.stdout)
            print("Stderr:\n", res.stderr)
            raise AssertionError('Advancement test failed')
        print(res.stdout.strip())
    finally:
        if os.path.exists(tmp_file):
            os.remove(tmp_file)

if __name__ == '__main__':
    test_syntax_and_init()
    test_zero_emojis()
    test_new_features_runtime()
    test_class_advancement_and_sets_and_pets()
    print('🎉 真实前端编译、Emoji扫描与新阶段核心功能端到端测试 100% 通过！')

