async (page, { phase, output }) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const context = await page.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const game = await context.newPage(), errors = [];
  game.on('pageerror', error => errors.push(error.message));
  const dismiss = async () => {
    for (let n = 0; n < 8 && await game.evaluate(() => window.gameModal?.isOpen); n++)
      await game.locator('#game-modal-btn-confirm').click();
  };
  const result = {};
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('#btn-confirm-character').click(); await dismiss();
    await game.locator('#nav-tab-wild').click();
    await game.evaluate(async () => {
      window.atmosphere = (await import('/js/effects/atmosphere.js')).atmosphere;
      atmosphere.canvas.style.setProperty('display', 'block', 'important');
      gameState.data.lastIdleClaimTime = Date.now() - 59000;
      appInstance.views.wild.render();
      window.visibilityEvents = [];
      document.addEventListener('visibilitychange', () => visibilityEvents.push({
        state: document.visibilityState,
        timerActive: appInstance.views.wild.idleTimer !== null,
        animationRunning: atmosphere.isRunning,
        at: Date.now()
      }));
    });
    const cdp = await context.newCDPSession(game);
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
    const windowInfo = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId: windowInfo.windowId, bounds: { windowState: 'minimized' } });
    await game.waitForTimeout(2300);
    result.minimized = await game.evaluate(() => ({
      state: document.visibilityState, timerActive: appInstance.views.wild.idleTimer !== null,
      animationRunning: atmosphere.isRunning, summary: document.getElementById('wild-idle-summary').textContent
    }));
    await cdp.send('Browser.setWindowBounds', { windowId: windowInfo.windowId, bounds: { windowState: 'normal' } });
    await game.bringToFront();
    await game.waitForTimeout(300);
    result.restored = await game.evaluate(() => ({
      state: document.visibilityState, timerActive: appInstance.views.wild.idleTimer !== null,
      animationRunning: atmosphere.isRunning, summary: document.getElementById('wild-idle-summary').textContent,
      events: visibilityEvents
    }));
    result.nativeHiddenObserved = result.minimized.state === 'hidden';
    console.log('VISIBILITY ' + JSON.stringify({ minimized: result.minimized, restored: result.restored }));
    if (result.nativeHiddenObserved) {
      check(!result.minimized.timerActive && !result.minimized.animationRunning, 'Real hidden window retained UI work');
      check(result.restored.state === 'visible' && result.restored.timerActive && result.restored.animationRunning &&
        result.restored.summary.includes('1分'), 'Restored window failed to catch up or resume particles');
    }
    await game.evaluate(() => atmosphere.canvas.style.removeProperty('display'));
    if (!phase.includes('diagnostic')) {
    // Full real minute: no accelerated clock, only the claim origin is reset.
    await game.evaluate(() => {
      gameState.data.lastIdleClaimTime = Date.now();
      appInstance.views.wild.render();
      window.minuteChanges = 0;
      window.minuteObserver = new MutationObserver(records => { minuteChanges += records.length; });
      minuteObserver.observe(document.getElementById('wild-idle-summary'), { childList: true });
    });
    console.log('REAL_MINUTE_STARTED ' + new Date().toISOString());
    await game.waitForTimeout(31000);
    result.halfMinute = await game.evaluate(() => ({ changes: minuteChanges, summary: document.getElementById('wild-idle-summary').textContent }));
    check(result.halfMinute.changes === 0 && result.halfMinute.summary.includes('0分'), 'Summary refreshed before a minute elapsed');
    console.log('REAL_MINUTE_HALF ' + JSON.stringify(result.halfMinute));
    await game.waitForTimeout(31000);
    result.fullMinute = await game.evaluate(() => ({ changes: minuteChanges, summary: document.getElementById('wild-idle-summary').textContent }));
    check(result.fullMinute.changes === 1 && result.fullMinute.summary.includes('1分'), 'Real minute did not update exactly once');
    console.log('REAL_MINUTE_RESULT ' + JSON.stringify(result.fullMinute));
    await game.screenshot({ path: `${output}/${phase}-real-minute.png`, animations: 'disabled' });
    }
    await game.locator('.btn-fight-mob').first().click();
    result.wildTimerDuringBattle = await game.evaluate(() => appInstance.views.wild.idleTimer !== null);
    if (!phase.includes('before')) check(!result.wildTimerDuringBattle, 'Hidden wild page retained its idle summary timer during battle');
    await game.locator('#btn-spd-3').click();
    await game.evaluate(() => {
      window.battleLifecycle = [];
      for (const name of ['freeze', 'resume']) document.addEventListener(name, () => battleLifecycle.push({
        event: name, index: appInstance.battleView.currentTurnIdx, at: Date.now()
      }));
    });
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
    await game.waitForTimeout(1200);
    await cdp.send('Page.setWebLifecycleState', { state: 'active' });
    await game.waitForTimeout(300);
    result.battleLifecycle = await game.evaluate(() => battleLifecycle);
    console.log('BATTLE_LIFECYCLE ' + JSON.stringify(result.battleLifecycle));
    const freeze = result.battleLifecycle.find(event => event.event === 'freeze');
    const resume = result.battleLifecycle.find(event => event.event === 'resume');
    result.nativeFreezeObserved = Boolean(freeze && resume);
    if (result.nativeFreezeObserved)
      check(resume.index === freeze.index, 'Browser freeze advanced battle playback');
    await game.locator('#btn-skip-battle').click();
    await game.locator('#btn-confirm-battle').click(); await dismiss();
    check(await game.locator('#tab-content-wild').isVisible(), 'Battle did not resume and return normally');
    check(!errors.length, 'Lifecycle caused browser error');
    result.errors = errors;
    result.coverage = result.nativeHiddenObserved && result.nativeFreezeObserved
      ? 'native visibility and freeze observed' : 'partial: native hidden/freeze events not emitted by this environment';
    return result;
  } catch (error) {
    console.error('LIFECYCLE_RESULT ' + JSON.stringify(result));
    throw error;
  } finally { await context.close(); }
}
