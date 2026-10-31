async (page) => {
  const results = [];
  const attempts = Number(new URL(page.url()).searchParams.get('startup-attempts')) || 12;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const context = await page.context().browser().newContext({
      viewport: { width: attempt % 2 ? 1440 : 1280, height: attempt % 2 ? 1000 : 900 }
    });
    const game = await context.newPage(), errors = [], failures = [], pending = new Set(), consoleErrors = [], responses = [];
    game.setDefaultTimeout(8000);
    await game.addInitScript(() => {
      window.startupEvents = [{ event: 'document', at: performance.now() }];
      for (const event of ['DOMContentLoaded', 'load']) {
        window.addEventListener(event, () => window.startupEvents.push({
          event, at: performance.now(), app: !!window.appInstance, state: !!window.gameState
        }));
      }
    });
    game.on('pageerror', error => errors.push(error.message));
    game.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    game.on('request', request => pending.add(request.url()));
    game.on('requestfinished', request => pending.delete(request.url()));
    game.on('requestfailed', request => {
      pending.delete(request.url());
      failures.push({ url: request.url(), error: request.failure()?.errorText });
    });
    game.on('response', response => {
      if (response.url().includes('/js/')) responses.push({ url: response.url(), status: response.status(), type: response.headers()['content-type'] });
      if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() });
    });
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').waitFor({ state: 'visible' });
      await game.reload();
      await game.locator('[data-class-id="warrior"]').waitFor({ state: 'visible' });
      if (errors.length || failures.length) throw new Error('Startup emitted errors or failed requests');
      results.push({ attempt, loads: 2, errors, failures });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/initialization-failure-${attempt}.png` });
      throw new Error(error.message + ' | ' + JSON.stringify({
        attempt, errors, consoleErrors, failures, responses, pending: [...pending],
        initialization: await game.evaluate(() => ({
          ready: document.readyState, app: !!window.appInstance, state: !!window.gameState,
          chosen: window.gameState?.data?.hasChosenClass,
          creationMarkup: document.getElementById('char-select-overlay')?.innerHTML.length,
          events: window.startupEvents,
          resources: performance.getEntriesByType('resource').filter(entry => entry.name.includes('/js/')).map(entry => ({
            url: entry.name, duration: entry.duration, bytes: entry.encodedBodySize
          }))
        }))
      }));
    } finally { await context.close(); }
  }
  return { kind: 'isolated empty contexts; startup and reload only', results };
}
