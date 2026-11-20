async (page) => {
  // 本轮 UI/展示层整改专项（A 战斗/图鉴/文案 + B 王都/铁匠/鱼市/副本/顶栏）
  // 只做展示层断言；夹具注入仅用于展示，不证明自然获取。
  const rows = [];
  const failures = [];
  const viewports = [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }];
  const fail = (vp, section, msg) => failures.push({ vp, section, msg: String(msg).slice(0, 400) });
  const dismiss = async game => {
    for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal && window.gameModal.isOpen); i++) {
      await game.locator('#game-modal-btn-confirm').click();
    }
    try { await game.locator('#game-modal-overlay').waitFor({ state: 'hidden', timeout: 1500 }); } catch {}
  };
  const enter = async (game, vp) => {
    await game.goto('http://127.0.0.1:8088', { waitUntil: 'networkidle', timeout: 30000 });
    await game.locator('[data-class-id="warrior"]').click();
    await game.locator('#btn-confirm-character').click();
    await dismiss(game);
  };
  const town = async (game, view) => game.evaluate(v => { window.appInstance.views.town.currentView = v; window.switchMainTab('town'); }, view);

  for (const vp of viewports) {
    // ---------- 战斗展示（A） ----------
    {
      const ctx = await page.context().browser().newContext({ viewport: vp });
      const game = await ctx.newPage(); const errors = [];
      game.on('pageerror', e => errors.push(e.message));
      try {
        await enter(game, vp);
        // 顶栏行动日（B）
        const header = (await game.locator('#header-action-day').innerText()).trim();
        const hdrExpect = await game.evaluate(() => { const d = window.gameState.data; const perDay = d.actionClock && Number.isSafeInteger(d.actionClock.pointsPerDay) && d.actionClock.pointsPerDay > 0 ? d.actionClock.pointsPerDay : 30; return `第 ${window.gameState.getActionDay()} 行动日 · 行动点 ${perDay - window.gameState.getActionPoints()}/${perDay}`; });
        if (header !== hdrExpect) fail(vp.width, '顶栏行动日(剩余口径)', 'header=' + header + ' expect=' + hdrExpect);
        // 服务端源码文案（B 文案缺口 + A 文案）
        const src = await game.evaluate(async () => ({
          town: await (await fetch('/js/ui/townView.js')).text(),
          tower: await (await fetch('/js/ui/towerView.js')).text()
        }));
        if (!src.town.includes('赋予勇者永久属性加成')) fail(vp.width, 'town晋升文案', 'missing 勇者永久属性加成');
        if (src.town.includes('全队威压')) fail(vp.width, 'town晋升文案', 'still 全队威压');
        if (!(src.town.includes('以控制技打断') && src.town.includes('魔抗与减伤'))) fail(vp.width, '战术秘闻', 'missing 战术秘闻真实机制文案');
        if (!src.tower.includes('经验按 50% 结算、累计金币全部损失')) fail(vp.width, '古堡折半文案', 'missing new text');
        if (src.tower.includes('折半结算')) fail(vp.width, '古堡折半文案', 'still 折半结算');
        // 真实野外首战
        await game.locator('#nav-tab-wild').click();
        await game.locator('.btn-fight-mob').first().click();
        if (!await game.locator('#battle-overlay').isVisible()) throw new Error('battle overlay missing');
        const pStats = await game.locator('.battle-ally .battle-stats').first().innerText();
        if (!pStats.includes('常驻减伤')) fail(vp.width, '常驻减伤标签', pStats);
        if (pStats.includes('不含佣兵')) fail(vp.width, '常驻减伤标签', '「不含佣兵」不应写在标签内: ' + pStats);
        const pNote = await game.locator('.battle-ally .battle-stat-note').first().innerText();
        if (!(pNote.includes('不含佣兵') && pNote.includes('上限 50%'))) fail(vp.width, '常驻减伤说明行', pNote);
        const enemyManaCount = await game.locator('#b-enemy-mp-bar').count();
        if (enemyManaCount !== 0) fail(vp.width, '敌方魔力条隐藏', 'non-caster enemy mp-bar count=' + enemyManaCount);
        // 开场说明折叠
        const opening = game.locator('#battle-opening-details');
        if (await opening.count() === 0) fail(vp.width, '开场说明折叠', 'missing #battle-opening-details');
        else {
          if (await opening.evaluate(el => el.open)) fail(vp.width, '开场说明折叠', 'default not collapsed');
          const summary = await opening.locator('summary').innerText();
          if (!summary.includes('开场说明')) fail(vp.width, '开场说明折叠', 'summary=' + summary);
          await opening.locator('summary').click();
          if (!await opening.evaluate(el => el.open)) fail(vp.width, '开场说明折叠', 'did not expand');
        }
        // 跳过 -> 分级着色
        await game.locator('#btn-skip-battle').click();
        const grade = await game.evaluate(() => {
          const lines = [...document.querySelectorAll('#combat-log-stream .combat-log-line')];
          return {
            count: lines.length,
            dmgRed: lines.filter(l => l.className.includes('text-red-300')).length,
            strong: lines.filter(l => l.querySelector('strong')).length
          };
        });
        if (grade.count < 4) fail(vp.width, '战报分级着色', JSON.stringify(grade));
        if (grade.dmgRed < 1) fail(vp.width, '战报分级着色', 'no red damage line ' + JSON.stringify(grade));
        if (grade.strong < 1) fail(vp.width, '战报分级着色', 'no bold damage number ' + JSON.stringify(grade));
        // P5 战利品入战报（胜利结算后系统日志 type=loot）
        const won = await game.evaluate(() => window.appInstance.battleView.currentCombat.victory);
        await game.locator('#btn-confirm-battle').click();
        await game.waitForTimeout(250);
        if (won) {
          const loot = await game.evaluate(() => window.gameState.systemLogs.filter(l => l.type === 'loot').map(l => l.text));
          if (!loot.some(t => /【战利品】/.test(t))) fail(vp.width, 'P5战利品入战报', 'no loot system log; loot=' + JSON.stringify(loot));
        }
        if (errors.length) fail(vp.width, 'pageerror', errors.join('; '));
      } catch (e) { fail(vp.width, '战斗展示block', e.stack || e.message); }
      finally { await ctx.close(); }
    }

    // ---------- 套装图鉴 有效耐久计数（A） ----------
    {
      const ctx = await page.context().browser().newContext({ viewport: vp });
      const game = await ctx.newPage(); const errors = [];
      game.on('pageerror', e => errors.push(e.message));
      try {
        await enter(game, vp);
        await game.evaluate(async () => {
          const { generateEquipment } = await import('/js/config/items.js');
          const s = window.gameState; s.data.level = 60; s.data.activePetId = null; s.data.equipped = {};
          const setId = 'conqueror';
          for (const slot of ['weapon', 'armor', 'gloves', 'boots']) s.data.equipped[slot] = generateEquipment(slot, 60, 'purplegold', setId);
          s.data.equipped.boots.durability = 0; // 损坏件不计入有效
          s.notify();
        });
        await game.locator('#nav-tab-equip').click();
        await game.locator('#btn-view-sets-compendium').click();
        await game.waitForTimeout(200);
        const body = await game.locator('body').innerText();
        if (!body.includes('已装备: 4/7 件')) fail(vp.width, '套装图鉴', 'missing 已装备 4/7');
        if (!body.includes('有效 3')) fail(vp.width, '套装图鉴', 'missing 有效 3（损坏件未剔除）');
        if (!body.includes('共 17 套')) fail(vp.width, '图鉴套数', 'missing 共 17 套');
        if (body.includes('共 16 套')) fail(vp.width, '图鉴套数', 'still 共 16 套');
        await game.locator('#btn-close-sets-compendium').click().catch(() => {});
        if (errors.length) fail(vp.width, 'pageerror-set', errors.join('; '));
      } catch (e) { fail(vp.width, '套装图鉴block', e.stack || e.message); }
      finally { await ctx.close(); }
    }

    // ---------- 敌方施法者魔力条显示（A） ----------
    {
      const ctx = await page.context().browser().newContext({ viewport: vp });
      const game = await ctx.newPage(); const errors = [];
      game.on('pageerror', e => errors.push(e.message));
      try {
        await enter(game, vp);
        await game.evaluate(() => {
          window.appInstance.battleView.start({ enemyData: { name: '施法者验证', portraitKey: null }, enemyStats: { hp: 5000, maxHp: 5000, atk: 10, def: 0, speed: 10, mp: 500, maxMp: 500 } });
          clearTimeout(window.appInstance.battleView.stepTimer);
        });
        const cnt = await game.locator('#b-enemy-mp-bar').count();
        if (cnt !== 1) fail(vp.width, '施法者魔力条', 'caster mp-bar count=' + cnt);
        else {
          const w = await game.locator('#b-enemy-mp-bar').evaluate(el => el.style.width);
          if (!(parseFloat(w) > 0)) fail(vp.width, '施法者魔力条', 'caster mp width=' + w);
        }
        if (errors.length) fail(vp.width, 'pageerror-caster', errors.join('; '));
      } catch (e) { fail(vp.width, '施法者魔力条block', e.stack || e.message); }
      finally { await ctx.close(); }
    }

    // ---------- 王都展示与功能（B） ----------
    {
      const ctx = await page.context().browser().newContext({ viewport: vp });
      const game = await ctx.newPage(); const errors = [];
      game.on('pageerror', e => errors.push(e.message));
      try {
        await enter(game, vp);
        // 王都 8 设施（含皇家商会）+ stable 热区可见且在 main 内
        await game.locator('#nav-tab-town').click();
        const locCount = await game.locator('.classic-town-location').count();
        if (locCount !== 8) fail(vp.width, '王都设施数', 'count=' + locCount);
        const stableBox = await game.locator('.classic-town-location[data-goto="stable"]').boundingBox();
        if (!stableBox) fail(vp.width, '皇家兽栏热区', 'stable hotspot missing');
        else {
          const inside = await game.evaluate(() => {
            const el = document.querySelector('.classic-town-location[data-goto="stable"]'); if (!el) return false;
            const r = el.getBoundingClientRect(), m = document.querySelector('main').getBoundingClientRect();
            return r.left >= m.left - 1 && r.right <= m.right + 1 && r.top >= m.top - 1 && r.bottom <= m.bottom + 1;
          });
          if (!inside) fail(vp.width, '皇家兽栏热区', 'stable hotspot clipped outside main');
        }
        // 兽栏：三档食品 + 金币喂养扣费
        await game.evaluate(() => {
          const d = window.gameState.data;
          d.pets = [{ id: 'mermaid', name: '美人鱼', level: 1, exp: 0, stamina: 40, tier: 'gold', apt: {}, skills: [] }];
          d.gold = 100000;
          if (!d.bag.find(i => i.id === 'pet_food')) d.bag.push({ id: 'pet_food', name: '魔能兽肉排', count: 3 });
          window.gameState.notify();
        });
        await town(game, 'stable');
        const stableText = await game.locator('#tab-content-town').innerText();
        for (const food of ['魔能兽肉排', '普通宠物口粮', '豪华宠物饼干']) {
          if (!stableText.includes(food)) fail(vp.width, '兽栏三档食品', 'missing ' + food);
        }
        if (!/体力 40\/100/.test(stableText)) fail(vp.width, '兽栏体力显示', stableText.slice(0, 120));
        const goldBefore = await game.evaluate(() => window.gameState.data.gold);
        await game.locator('[data-stable-gold="mermaid"]').click();
        await dismiss(game);
        const goldFeed = await game.evaluate(() => ({ gold: window.gameState.data.gold, stamina: window.gameState.data.pets.find(p => p.id === 'mermaid').stamina }));
        if (goldBefore - goldFeed.gold !== 200) fail(vp.width, '兽栏金币喂养', 'cost=' + (goldBefore - goldFeed.gold) + ' stamina=' + goldFeed.stamina);
        if (goldFeed.stamina !== 60) fail(vp.width, '兽栏金币喂养', 'stamina after=' + goldFeed.stamina);
        // 铁匠铺 · 套装熔炼
        await game.evaluate(async () => {
          const { generateEquipment } = await import('/js/config/items.js');
          const d = window.gameState.data; d.level = 60;
          const uids = [];
          for (const slot of ['weapon', 'armor', 'gloves', 'boots']) {
            const gear = generateEquipment(slot, 60, 'purplegold', 'conqueror');
            d.bag.push(gear); uids.push(gear.uid);
          }
          if (!d.bag.find(i => i.id === 'crystal_purplegold')) d.bag.push({ id: 'crystal_purplegold', name: '紫金晶石', count: 3 });
          const tv = window.appInstance.views.town;
          tv.smeltSelection = uids; tv.smeltTargetSlot = 'helmet';
          d.__smeltUids = uids;
          window.gameState.notify();
        });
        await town(game, 'smithy_smelt_set');
        await game.evaluate(() => window.appInstance.views.town.render());
        const smeltReady = await game.locator('#btn-do-smelt-set').evaluate(el => !el.disabled).catch(() => false);
        if (!smeltReady) fail(vp.width, '铁匠熔炼', '确认熔炼未启用（4件+晶石选择失败）');
        else {
          await game.locator('#btn-do-smelt-set').click();
          await dismiss(game);
          const smelt = await game.evaluate(() => {
            const d = window.gameState.data;
            return { crystal: d.bag.find(i => i.id === 'crystal_purplegold')?.count ?? 0, helmet: d.bag.some(i => i.slot === 'helmet' && i.setId === 'conqueror'), log: window.gameState.systemLogs.some(l => l.text.includes('【套装熔炼】')) };
          });
          if (!smelt.helmet) fail(vp.width, '铁匠熔炼', '未产出 helmet 套装件');
          if (!smelt.log) fail(vp.width, '铁匠熔炼', '无套装熔炼系统日志');
          if (smelt.crystal !== 2) fail(vp.width, '铁匠熔炼', 'crystal=' + smelt.crystal + '(期望2)');
        }
        // 铁匠 7 页签单行（不换行）
        const tabs = await game.evaluate(() => {
          const els = [...document.querySelectorAll('.smithy-workshop-tabs button')];
          return { count: els.length, tops: [...new Set(els.map(e => Math.round(e.getBoundingClientRect().top)))] };
        });
        if (tabs.count !== 7) fail(vp.width, '铁匠7页签', 'count=' + tabs.count);
        if (tabs.tops.length !== 1) fail(vp.width, '铁匠7页签单行', 'row tops=' + JSON.stringify(tabs.tops));
        // 鱼市兑换
        await game.evaluate(() => {
          const d = window.gameState.data;
          d.fishing = { lamprey: 20, arowana: 0, exchangeDay: window.gameState.getActionDay(), exchangeCount: 0 };
          d.crystal = d.crystal || 0;
          window.gameState.notify();
        });
        await town(game, 'fishing');
        const fishBefore = await game.evaluate(() => ({ lamprey: window.gameState.data.fishing.lamprey, crystal: window.gameState.data.crystal }));
        await game.locator('[data-fish-exchange="lamprey"]').click();
        await dismiss(game);
        const fishAfter = await game.evaluate(() => ({ lamprey: window.gameState.data.fishing.lamprey, crystal: window.gameState.data.crystal }));
        if (fishBefore.lamprey - fishAfter.lamprey !== 10) fail(vp.width, '鱼市兑换', 'lamprey delta=' + (fishBefore.lamprey - fishAfter.lamprey));
        if (fishAfter.crystal - fishBefore.crystal !== 50) fail(vp.width, '鱼市兑换', 'crystal delta=' + (fishAfter.crystal - fishBefore.crystal));
        // 副本三模式
        await game.locator('#nav-tab-tower').click();
        await game.locator('#btn-subtab-dungeons').click();
        await game.locator('.dungeon-gate-card').first().click();
        await game.waitForTimeout(100);
        const bodyTower = await game.locator('#tab-content-tower').innerText();
        for (const label of ['单枪匹马', '佣兵援护', '侍从出战']) {
          if (!bodyTower.includes(label)) fail(vp.width, '副本三模式', 'missing ' + label);
        }
        const mercDisabled = await game.locator('input[name="companion"][value="merc"]').evaluate(el => el.disabled).catch(() => null);
        const slaveDisabled = await game.locator('input[name="companion"][value="slave"]').evaluate(el => el.disabled).catch(() => null);
        if (mercDisabled !== true) fail(vp.width, '副本三模式', '无佣兵时佣兵项未禁用(' + mercDisabled + ')');
        if (slaveDisabled !== true) fail(vp.width, '副本三模式', '无侍从时侍从项未禁用(' + slaveDisabled + ')');
        await game.evaluate(() => {
          const d = window.gameState.data;
          d.estate.hiredMercId = 'merc_bard';
          d.slaves = d.slaves || {}; d.slaves.list = [{ id: 'slave_test', name: '侍从甲' }];
          window.gameState.notify(); window.appInstance.views.tower.render();
        });
        const mercEnabled = await game.locator('input[name="companion"][value="merc"]').evaluate(el => !el.disabled).catch(() => false);
        const slaveEnabled = await game.locator('input[name="companion"][value="slave"]').evaluate(el => !el.disabled).catch(() => false);
        if (!mercEnabled) fail(vp.width, '副本三模式', '有佣兵后佣兵项仍禁用');
        if (!slaveEnabled) fail(vp.width, '副本三模式', '有侍从后侍从项仍禁用');
        if (errors.length) fail(vp.width, 'pageerror-town', errors.join('; '));
      } catch (e) { fail(vp.width, '王都展示block', e.stack || e.message); }
      finally { await ctx.close(); }
    }
    rows.push({ vp: vp.width });
  }
  if (failures.length) {
    const summary = failures.map(f => `[${f.vp}px][${f.section}] ${f.msg}`).join('\n');
    throw new Error('browser_ui_revamp failures:\n' + summary);
  }
  return { kind: 'UI 展示层整改专项（A+B），显式夹具仅用于展示，不证明自然获取', viewports: viewports.map(v => v.width), rows };
}
