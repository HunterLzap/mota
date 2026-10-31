async (page) => {
  const results = [];
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 900 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage();
    const errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const dismiss = async () => {
      for (let i = 0; i < 4 && await game.evaluate(() => window.gameModal.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const capture = async name => {
      await game.screenshot({ path: `output/playwright/desktop-ui-${viewport.width}-${name}.png`, animations: 'disabled' });
    };
    const imagesLoaded = async selector => {
      await game.waitForFunction(selector => [...document.querySelectorAll(selector)].every(image => image.complete && image.naturalWidth > 0), selector);
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      require(await game.getByText('职业一经确定，本存档无法更换。').isVisible(), 'Missing permanent class choice notice');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click();
      require(await game.locator('#game-modal-btn-confirm').innerText() === '接受委托', 'Guard action label incorrect');
      require(await game.locator('#game-modal-btn-cancel').innerText() === '稍后', 'Guard defer label incorrect');
      await game.locator('#game-modal-btn-cancel').click();
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      await game.locator('#nav-tab-bag').click();
      require((await game.locator('#tab-content-bag').innerText()).includes('罗兰'), 'Empty bag ignored actual opening task');
      await game.locator('#nav-tab-pets').click();
      const petText = await game.locator('#tab-content-pets').innerText();
      require(petText.includes('后开启') && !petText.includes('请点击右上角【孵化'), 'Locked companion directed player to unavailable action');
      await game.locator('#btn-hatch-egg').dispatchEvent('click');
      require(await game.locator('#game-modal-overlay').isVisible(), 'Locked hatch did not explain prerequisite');
      require((await game.locator('#game-modal-message').innerText()).includes('并领取'), 'Unlock hint omitted claim prerequisite');
      await dismiss();
      await game.locator('#pet-subtab-compendium').click();
      await imagesLoaded('#tab-content-pets img');
      const petImages = await game.locator('#tab-content-pets img').count();
      require(petImages >= 22, 'Compendium portraits missing');
      if (viewport.width === 1440) await capture('compendium');
      await game.locator('#btn-next-journey').click();
      await game.locator('#game-modal-btn-confirm').click();
      await dismiss();
      for (const itemId of ['novice_weapon', 'novice_armor']) {
        const uid = await game.evaluate(id => window.gameState.data.bag.find(item => item.id === id).uid, itemId);
        await game.locator('#nav-tab-bag').click();
        await game.locator(`[data-bag-uid="${uid}"]`).click();
        if (itemId === 'novice_weapon') await capture('bag');
        await game.locator('#btn-bag-equip-item').click();
        await dismiss();
      }
      if (viewport.width === 1440) await capture('equipment');
      await game.locator('#nav-tab-town').click();
      const lockHint = await game.locator('.mota-building-card .feature-lock-hint').first().innerText();
      require(lockHint.includes('完成') && lockHint.includes('领奖'), 'Card prerequisite not concrete');
      await capture('town');
      await game.evaluate(() => { window.appInstance.views.town.currentView = 'smithy'; window.appInstance.views.town.render(); });
      await capture('smithy');
      await game.locator('[data-goto="smithy_repair"]').click();
      require(await game.getByText('空槽位 · 耐久不适用', { exact: true }).count() === 8, 'Repair fabricated durability for empty slots');
      if (viewport.width === 1440) await capture('repair');
      await game.locator('#nav-tab-estate').click();
      await game.locator('[data-goto="resources"]').click();
      require((await game.locator('#tab-content-estate').innerText()).includes('已成熟 0 / 20 批'), 'Harvest initially fabricated maturity');
      await game.evaluate(() => { window.gameState.data.estate.lastHarvestTime = Date.now() - 65 * 60 * 1000; window.appInstance.views.estate.render(); });
      require(await game.getByText('50 颗', { exact: true }).isVisible(), 'Harvest crystals differ from two-batch quote');
      if (viewport.width === 1440) await capture('resources');
      const beforeHarvest = await game.evaluate(() => window.gameState.data.crystal);
      await game.locator('#btn-harvest-all').click(); await dismiss();
      require(await game.evaluate(() => window.gameState.data.crystal) === beforeHarvest + 50, 'Harvest quote did not match actual settlement');
      require((await game.locator('#tab-content-estate').innerText()).includes('已成熟 0 / 20 批'), 'Harvest did not refresh maturity');
      await game.locator('#nav-tab-town').click();
      await game.evaluate(() => { window.gameState.data.onboardingVersion = 0; window.gameState.data.gold = 12000; window.appInstance.views.town.currentView = 'tavern_mercenary'; window.appInstance.views.town.render(); });
      await imagesLoaded('#tab-content-town img');
      for (const cost of ['5,000 金币', '8,000 金币', '6,000 金币']) require(await game.getByText(cost, { exact: true }).isVisible(), 'Missing mercenary fee: ' + cost);
      if (viewport.width === 1440) await capture('mercenaries');
      await game.locator('[data-merc-id="merc_cleric"]').click(); await dismiss();
      require(await game.evaluate(() => window.gameState.data.gold) === 7000, 'Mercenary displayed fee differs from settlement');
      require(await game.getByText('签订后将替换当前随行佣兵。', { exact: true }).count() === 2, 'Missing mercenary replacement warning');
      await game.locator('#nav-tab-estate').click();
      await game.locator('#tab-content-estate [data-goto="hub"]').click();
      await game.locator('#tab-content-estate [data-goto="mercenaries"]').click();
      require(await game.locator('#tab-content-estate').getByText('8,000 金币', { exact: true }).isVisible(), 'Estate mercenary fee missing');
      require(await game.locator('#tab-content-estate').getByText('签订后将替换当前随行佣兵。', { exact: true }).count() === 2, 'Estate replacement warning missing');
      await game.locator('#nav-tab-town').click();
      await game.evaluate(() => { window.appInstance.views.town.currentView = 'tavern_drinks'; window.appInstance.views.town.render(); });
      require(await game.locator('.btn-order-drink').count() > 0, 'Tavern drinks regressed');
      await game.evaluate(() => { window.appInstance.views.town.currentView = 'tavern_bounty'; window.appInstance.views.town.render(); });
      await imagesLoaded('#tab-content-town img');
      require(await game.locator('#tab-content-town img[src="images/bosses/boss_thief.svg"]').count() > 0, 'Thief portrait missing');
      await game.locator('#nav-tab-wild').click();
      require(!/\d+\.\d{3,}/.test(await game.locator('#tab-content-wild').innerText()), 'Patrol floating point noise still visible');
      await game.locator('.btn-fight-mob').first().click();
      await imagesLoaded('.battle-enemy .battle-portrait img');
      require(await game.locator('.battle-enemy .battle-portrait img[src="images/pets/pet_winter_wolf.svg"]').count() === 1, 'Direct SVG path still blank in battle');
      require(await game.getByText('当前职业技能', { exact: true }).isVisible(), 'Battle primary skills missing');
      require(!await game.locator('.battle-ally details').last().getAttribute('open'), 'Equipment list should initially collapse');
      await game.locator('#btn-spd-3').click();
      require(await game.locator('#btn-spd-3').getAttribute('aria-pressed') === 'true', 'Playback active state incorrect');
      await game.locator('#btn-skip-battle').click();
      await capture('battle');
      await game.locator('#btn-confirm-battle').click();
      require(!await game.locator('#battle-overlay').isVisible(), 'Battle did not settle and return');
      const overflow = await game.evaluate(() => document.body.scrollWidth > innerWidth);
      require(!overflow, 'Desktop page overflowed horizontally');
      require(errors.length === 0, errors.join('; '));
      results.push({ viewport, petImages, unlockHints: true, quotesMatchSettlement: true, battleReturned: true, errors });
    } finally {
      await context.close();
    }
  }
  return { results, fixtureNote: 'Harvest clock and mercenary balance/access use isolated fixtures; other steps use the opening player flow.' };
}
