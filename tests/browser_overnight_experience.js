async (page, { phase, output }) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const baseline = phase.includes('before'), reports = [];
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage(), errors = [], failures = [], consoleErrors = [];
    game.setDefaultTimeout(10000);
    game.on('pageerror', error => errors.push(error.message));
    game.on('requestfailed', request => failures.push(request.url()));
    game.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    const dismiss = async () => {
      for (let n = 0; n < 8 && await game.evaluate(() => window.gameModal?.isOpen); n++)
        await game.locator('#game-modal-btn-confirm').click();
    };
    const shot = name => game.screenshot({ path: `${output}/${phase}-${viewport.width}-${name}.png`, animations: 'disabled' });
    const report = { viewport };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('#btn-confirm-character').click();
      await dismiss();
      await game.locator('#nav-tab-wild').click();
      report.thiefText = await game.locator('.wild-thief-card').innerText();
      if (!baseline) {
        for (const text of ['高危支线', '生命 8000', '攻击 380', '防御 180', '速度 30', '武器', '护胸', '潜能'])
          check(report.thiefText.includes(text), 'Missing pre-fight detail: ' + text);
        check(!report.thiefText.includes('4500'), 'Encounter card exposes future rewards');
      }
      await shot('thief-warning');
      await game.locator('#btn-challenge-thief').click();
      report.thiefStats = await game.evaluate(() => ({
        hp: appInstance.battleView.enemyMaxHp,
        text: document.querySelector('.battle-enemy').innerText
      }));
      check(report.thiefStats.text.includes('8000') && report.thiefStats.text.includes('380') && report.thiefStats.text.includes('180'), 'Displayed warning differs from actual enemy');
      await game.locator('#btn-skip-battle').click();
      await game.locator('#btn-confirm-battle').click();
      await dismiss();
      // A timestamp fixture places the real clock just before a minute boundary.
      await game.evaluate(() => {
        gameState.data.lastIdleClaimTime = Date.now() - 59000;
        appInstance.views.wild.render();
        window.idleMutations = 0; window.wildRenders = 0;
        const summary = document.querySelector('#wild-idle-summary') || document.querySelector('.wild-atlas-heading > span');
        window.idleObserver = new MutationObserver(records => { window.idleMutations += records.length; });
        idleObserver.observe(summary, { childList: true, characterData: true, subtree: true });
        const view = appInstance.views.wild, original = view.render;
        view.render = function(...args) { window.wildRenders++; return original.apply(this, args); };
      });
      const summary = () => game.locator('.wild-atlas-heading > span').innerText();
      report.idleBefore = await summary();
      await game.waitForTimeout(2200);
      report.idleAfter = await summary();
      report.idleActivity = await game.evaluate(() => ({ mutations: idleMutations, renders: wildRenders }));
      if (!baseline) {
        check(report.idleBefore.includes('0分') && report.idleAfter.includes('1分'), 'Minute summary did not advance with real clock');
        check(report.idleActivity.mutations === 1 && report.idleActivity.renders === 0, 'Summary update redrew the whole view or repeated');
        await game.waitForTimeout(2200);
        check(await game.evaluate(() => idleMutations === 1), 'Unchanged summary mutated every second');
        const expected = await game.evaluate(() => ({ reward: gameState.getIdleRewards(), gold: gameState.data.gold, crystal: gameState.data.crystal }));
        await shot('minute-summary');
        await game.locator('#btn-claim-idle').click();
        await dismiss();
        check(await game.evaluate(expected => gameState.data.gold === expected.gold + expected.reward.gold &&
          gameState.data.crystal === expected.crystal + expected.reward.crystal, expected), 'Actual idle currency claim differs from preview');
        await game.locator('#nav-tab-hero').click();
        check(await game.evaluate(() => appInstance.views.wild.idleTimer === null), 'Wild timer survived leaving page');
        await game.evaluate(() => { gameState.data.lastIdleClaimTime = Date.now() - 121000; });
        await game.locator('#nav-tab-wild').click();
        report.returnSummary = await summary();
        check(report.returnSummary.includes('2分'), 'Returning to wild did not catch up');
        const cdp = await context.newCDPSession(game);
        await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
        await game.waitForTimeout(300);
        await cdp.send('Page.setWebLifecycleState', { state: 'active' });
        report.lifecycleAfterResume = await game.evaluate(() => ({
          hidden: document.hidden, summary: document.querySelector('#wild-idle-summary').textContent,
          timerActive: appInstance.views.wild.idleTimer !== null
        }));
        await cdp.detach();
        await game.evaluate(() => {
          gameState.data.lastIdleClaimTime = Date.now() - 601 * 60000;
          appInstance.views.wild.render();
        });
        check((await summary()).includes('10分') && await game.evaluate(() => appInstance.views.wild.idleTimer === null), 'Capped income still schedules redundant updates');
        await game.reload();
        await game.waitForFunction(() => window.gameState?.data?.hasChosenClass);
        await dismiss();
        await game.locator('#nav-tab-wild').click();
        report.reloadSummary = await summary();
      }
      report.layout = await game.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        actionVisible: (() => {
          const button = document.getElementById('btn-challenge-thief');
          const rect = button.getBoundingClientRect();
          return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === button;
        })()
      }));
      check(!report.layout.overflow && report.layout.actionVisible, 'Wild layout or challenge target clipped');
      check(!errors.length && !failures.length && !consoleErrors.length, 'Runtime/network/console error');
      report.errors = errors; report.failures = failures; report.consoleErrors = consoleErrors;
      reports.push(report);
    } catch (error) {
      console.error(JSON.stringify({ report, errors, failures, consoleErrors }));
      await shot('failure').catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  return { baseline, reports };
}
