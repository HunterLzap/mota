async (page) => {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  for (const [width, height] of [[1280, 900], [1440, 1000]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height } });
    const game = await context.newPage(), errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const dismiss = async () => {
      for (let i = 0; i < 4 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const wallet = () => game.evaluate(() => {
      const state = window.gameState;
      return { gold: state.data.gold, crystal: state.data.crystal, capacity: state.getBagCapacity(), merc: state.data.estate.hiredMercId };
    });
    const reachable = async locator => {
      await locator.scrollIntoViewIfNeeded();
      check(await locator.evaluate(element => {
        const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && (element === hit || element.contains(hit));
      }), 'Control is clipped or covered');
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click(); await dismiss();
      // Isolated resources and legacy access fixture; payment uses real UI paths.
      await game.evaluate(() => {
        window.gameState.data.gold = 30000;
        window.gameState.data.crystal = 200;
        window.gameState.data.onboardingVersion = 0;
        window.gameState.notify();
      });
      await game.locator('#nav-tab-bag').click();
      const before = await wallet();
      await game.locator('#btn-bag-expand').click();
      await game.locator('#game-modal-btn-cancel').focus();
      await game.keyboard.press('Enter');
      check(JSON.stringify(await wallet()) === JSON.stringify(before), 'Enter on cancel executed the purchase');
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      check(await game.evaluate(() => document.activeElement?.id === 'btn-bag-expand'), 'Modal did not restore opener focus');
      await game.locator('#btn-bag-expand').click();
      check(await game.locator('#game-modal-box').getAttribute('role') === 'dialog', 'Dialog semantics missing');
      check(await game.locator('#game-modal-btn-cancel').evaluate(element => element === document.activeElement), 'Confirmation should initially focus cancellation');
      await game.locator('#game-modal-btn-confirm').focus(); await game.keyboard.press('Tab');
      check(await game.locator('#game-modal-close').evaluate(element => element === document.activeElement), 'Tab escaped dialog');
      await game.keyboard.press('Shift+Tab');
      check(await game.locator('#game-modal-btn-confirm').evaluate(element => element === document.activeElement), 'Reverse Tab escaped dialog');
      await game.keyboard.press('Escape');
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      check(JSON.stringify(await wallet()) === JSON.stringify(before), 'Escape changed the purchase state');
      await game.locator('#btn-bag-expand').click();
      await game.screenshot({ path: `output/playwright/material4-${width}-confirm.png`, animations: 'disabled' });
      await game.locator('#game-modal-btn-confirm').evaluate(button => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true })));
      check(JSON.stringify(await wallet()) === JSON.stringify(before), 'Held Enter confirmed a fresh dialog');
      await game.locator('#game-modal-btn-confirm').focus(); await game.keyboard.press('Enter');
      await dismiss();
      const bought = await wallet();
      check(bought.gold === before.gold - 10000 && bought.crystal === before.crystal - 50 && bought.capacity === 60, 'Confirmation payment happened zero or multiple times');
      await game.evaluate(() => window.gameModal.alert(Array.from({ length: 60 }, (_, i) => `Adventure report ${i + 1}: inventory and rewards remain intact.`).join('\n'), 'Long report fixture'));
      await reachable(game.locator('#game-modal-btn-confirm'));
      check(await game.locator('#game-modal-message').evaluate(element => element.parentElement.scrollHeight > element.parentElement.clientHeight), 'Long report does not scroll independently');
      await game.keyboard.press('Enter'); await dismiss();

      await game.locator('#nav-tab-town').click();
      await game.locator('[data-goto="tavern"]').click();
      await game.locator('[data-goto="tavern_mercenary"]').click();
      check(await game.locator('.mercenary-card').count() === 3, 'Missing tavern contracts');
      await game.locator('.mercenary-card img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      check(await game.locator('#tab-content-town .mercenary-card').evaluateAll(cards => {
        const luminance = color => {
          const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
          return rgb.reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
        };
        return cards.every(card => {
          const background = luminance(getComputedStyle(card).backgroundColor);
          return [...card.querySelectorAll('.mercenary-introduction p,.mercenary-contract p')].every(p => {
            const text = luminance(getComputedStyle(p).color);
            return (Math.max(text, background) + .05) / (Math.min(text, background) + .05) >= 4.5;
          });
        });
      }), 'Contract text lacks contrast against its paper underlay');
      for (const id of ['merc_cleric', 'merc_paladin', 'merc_bard']) await reachable(game.locator(`[data-merc-id="${id}"]`));
      await game.screenshot({ path: `output/playwright/material4-${width}-tavern.png`, animations: 'disabled' });
      await game.locator('[data-merc-id="merc_cleric"]').click(); await dismiss();
      check((await wallet()).gold === bought.gold - 5000 && (await wallet()).merc === 'merc_cleric', 'Tavern contract payment failed');
      await game.locator('#nav-tab-estate').click();
      await game.locator('#tab-content-estate [data-goto="mercenaries"]').click();
      check(await game.locator('#tab-content-estate .mercenary-card').count() === 3, 'Missing estate contracts');
      await game.locator('#tab-content-estate .mercenary-card img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await reachable(game.locator('#tab-content-estate [data-merc-id="merc_bard"]'));
      await game.locator('#tab-content-estate [data-merc-id="merc_bard"]').click(); await dismiss();
      check((await wallet()).gold === bought.gold - 11000 && (await wallet()).merc === 'merc_bard', 'Estate replacement payment failed');
      await game.locator('#tab-content-estate [data-merc-id="merc_bard"]').click(); await dismiss();
      check((await wallet()).gold === bought.gold - 11000, 'Repeat contract charged twice');
      await game.screenshot({ path: `output/playwright/material4-${width}-estate.png`, animations: 'disabled' });
      await game.evaluate(() => {
        const state = window.gameState;
        state.data.maskedThief.appeared = true;
        state.data.maskedThief.location = '亚诺微光森林';
        state.data.maskedThief.hp = 1;
        state.notify();
      });
      await game.locator('#nav-tab-wild').click();
      await game.locator('.wild-thief-card img').evaluate(image => image.decode());
      await game.locator('#btn-challenge-thief').click();
      check(await game.locator('.battle-enemy img').getAttribute('src') === 'images/bosses/boss_thief.svg', 'Thief used generic enemy portrait');
      await game.locator('.battle-enemy img').evaluate(image => image.decode());
      await game.locator('#btn-skip-battle').click();
      await game.screenshot({ path: `output/playwright/material4-${width}-thief.png`, animations: 'disabled' });
      await game.locator('#btn-confirm-battle').click(); await dismiss();
      check(!await game.evaluate(() => window.gameState.data.maskedThief.appeared), 'Thief settlement did not clear encounter');
      check(await game.evaluate(() => document.body.scrollWidth <= innerWidth), 'Page overflows horizontally');
      const saved = await wallet(); await game.reload();
      await game.waitForFunction(() => Boolean(window.gameState?.data.hasChosenClass));
      check(JSON.stringify(await wallet()) === JSON.stringify(saved), 'Reload lost payment or companion');
      check(errors.length === 0, errors.join('; '));
      results.push({ width, height, cancelEnterSafe: true, focusContained: true, expansionPaidOnce: true, twoRecruitmentEntrances: true, thiefPortrait: true, saved: true, errors });
    } finally { await context.close(); }
  }
  return { results, fixture: 'Isolated funds/access and 1 HP thief; verifies UI and transactions, not natural balance' };
}
