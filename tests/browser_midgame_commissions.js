async (page) => {
  const reports = [], check = (ok, message) => { if (!ok) throw new Error(message); };
  const canonical = value => JSON.stringify(value, (_key, item) => item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    for (const classId of ['warrior', 'mage', 'hunter']) {
      const context = await page.context().browser().newContext({ viewport });
      const game = await context.newPage(), errors = [], requests = [];
      game.setDefaultTimeout(10000);
      game.on('pageerror', error => errors.push(error.message));
      game.on('requestfailed', request => requests.push(request.url()));
      game.on('response', response => { if (response.status() >= 400) requests.push(response.url()); });
      const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
      const dismiss = async () => {
        await game.waitForFunction(() => window.appInstance?.views?.bag && window.gameState?.data && window.gameModal);
        for (let i = 0; i < 8 && await game.evaluate(() => window.gameModal?.isOpen); i++) await game.locator('#game-modal-btn-confirm').click();
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
      };
      const click = async selector => { await game.locator(selector).first().click(); await dismiss(); };
      const keyboard = async selector => { await game.locator(selector).focus(); await game.keyboard.press('Enter'); };
      const selectBag = async uid => {
        await click('#nav-tab-bag');
        await click('[data-filter="all"]');
        while (await game.locator('#btn-bag-page-prev').isEnabled()) await click('#btn-bag-page-prev');
        for (let count = 0; count < 30; count++) {
          const selector = `[data-bag-uid="${uid}"]`;
          if (await game.locator(selector).count()) return click(selector);
          check(await game.locator('#btn-bag-page-next').isEnabled(), 'Earned reward missing from bag: ' + uid);
          await click('#btn-bag-page-next');
        }
        throw new Error('Reward bag pagination did not terminate');
      };
      const town = async () => {
        await click('#nav-tab-town');
        for (let count = 0; count < 10; count++) {
          if (await game.evaluate(() => window.appInstance.views.town.currentView === 'tavern_commissions')) return;
          for (const target of ['tavern_commissions', 'tavern', 'hub']) {
            if (await game.locator(`[data-goto="${target}"]`).count()) { await click(`[data-goto="${target}"]`); break; }
          }
        }
        throw new Error('Cannot navigate to task book');
      };
      const button = id => `[data-commission-id="${id}"]`;
      const guard = async () => {
        check(!errors.length && !requests.length, 'Browser/network error: ' + JSON.stringify({ errors, requests }));
        check(await game.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth),
          'Horizontal overflow');
      };
      const refresh = async () => {
        const before = await data();
        await game.reload(); await dismiss();
        check(canonical(await data()) === canonical(before), 'Refresh changed task/equipment/assets');
        check(!await game.locator('#char-select-overlay').isVisible(), 'Class selection reopened');
      };
      try {
        await game.goto('http://127.0.0.1:8088');
        await click(`[data-class-id="${classId}"]`); await click('#btn-confirm-character');
        const sentinels = await game.evaluate(async classId => {
          const { storage } = await import('/js/core/storage.js');
          const fixture = (await fetch('/output/playwright/midgame-commission-fixtures.json').then(response => response.json()))[classId];
          delete fixture.commissions;
          for (let slot = 1; slot <= 5; slot++) storage.saveToSlot(slot, { ...fixture, name: slot === 3 ? fixture.name : 'Protected ' + slot });
          storage.setActiveSlotId(3);
          return [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot));
        }, classId);
        await game.reload(); await dismiss(); await town();
        check(Object.keys((await data()).commissions).length === 0, 'Old save received retroactive task rewards');
        check(await game.locator(button('starmap_page')).isDisabled(), 'Prerequisite gate missing');
        const configs = await game.evaluate(async () => (await import('/js/config/commissions.js')).COMMISSIONS
          .filter(config => config.rewards.equipmentChoices));
        let battles = 0, selected = [];
        for (const [index, config] of configs.entries()) {
          const beforeNavigation = await data();
          await keyboard('#btn-optional-equipment-goal');
          check(await game.evaluate(() => window.appInstance.views.town.currentView === 'tavern_commissions'),
            'Optional equipment goal did not navigate to the task book');
          check(await game.locator(`[data-commission-card="${config.id}"]`).evaluate(card => card.contains(document.activeElement)),
            'Optional goal did not focus its actionable task');
          check(canonical(await data()) === canonical(beforeNavigation), 'Optional navigation changed mainline or possessions');
          const previews = {};
          for (const choice of config.rewards.equipmentChoices) {
            const beforePreview = await data();
            const selector = `[data-commission-preview="${choice.id}"]`;
            await keyboard(selector + ' summary');
            check(await game.locator(selector).evaluate(element => element.open), 'Keyboard could not expand equipment comparison');
            previews[choice.id] = await game.evaluate(([id, choiceId]) =>
              window.gameState.getCommissionEquipmentPreview(id, choiceId), [config.id, choice.id]);
            for (const key of ['maxHp', 'atk', 'magicResist', 'dmgResist']) {
              const displayed = await game.locator(selector + ` [data-goal-value="${key}"]`).innerText();
              check(parseFloat(displayed) === Math.round((previews[choice.id].after[key] || 0) * 100) / 100,
                'Equipment target comparison diverged from the effective-stat producer: ' + key);
            }
            check(canonical(await data()) === canonical(beforePreview), 'Read-only reward comparison changed saved assets');
            await game.locator(selector + ' table').scrollIntoViewIfNeeded();
            if (index === 0) await game.screenshot({ path: `output/playwright/midgame-goal-preview-${classId}-${viewport.width}-${choice.id}.png`, animations: 'disabled' });
            await keyboard(selector + ' summary');
          }
          const beforeCancel = await data();
          await keyboard(button(config.id)); await game.keyboard.press('Escape');
          await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
          check(canonical(await data()) === canonical(beforeCancel), 'Cancelled acceptance changed assets');
          check(await game.locator(button(config.id)).evaluate(element => element === document.activeElement), 'Cancel lost task focus');
          await click(button(config.id));
          check((await data()).commissions[config.id].status === 'active', 'Acceptance did not persist');
          const destination = game.locator(`[data-commission-go="${config.id}"]`);
          check(!(await destination.innerText()).includes('微光森林'), 'New task still routes to the old forest label');
          await keyboard(`[data-commission-go="${config.id}"]`);
          check(await game.evaluate(target => window.appInstance.views.wild.selectedMapId === target, config.requirement.target),
            'Task target navigation selected the wrong region');
          for (let battle = 0; battle < 3; battle++) {
            await game.locator('.btn-fight-mob').first().click(); await game.locator('#btn-skip-battle').click();
            check(await game.evaluate(() => window.appInstance.battleView.currentCombat.victory), 'Earned fixture lost a task battle');
            await keyboard('#btn-confirm-battle'); await dismiss(); battles++;
            check((await data()).commissions[config.id].current === battle + 1, 'Real victory did not record the objective');
            await town();
            check((await game.locator(`[data-commission-story="${config.id}"]`).innerText()) === config.storyBeats[battle],
              'Actual battle did not advance the corresponding story beat');
            if (battle === 0) {
              await refresh(); await town();
              await keyboard(`[data-commission-go="${config.id}"]`);
            } else if (battle === 1) await keyboard(`[data-commission-go="${config.id}"]`);
          }
          await refresh(); await town();
          check(await game.locator(button(config.id)).isDisabled(), 'Reward choice is not required');
          const build = (viewport.width === 1280 ? index % 2 === 0 : index % 2 !== 0) ? 'ward' : 'assault';
          const choice = config.rewards.equipmentChoices.find(item => item.id.endsWith('_' + build));
          const radio = `[data-commission-choice="${config.id}"][value="${choice.id}"]`;
          await game.locator(radio).focus(); await game.keyboard.press('Space');
          check(await game.locator(radio).isChecked(), 'Keyboard reward choice failed');
          const beforeReward = await data();
          await keyboard(button(config.id));
          for (let count = 0; count < 4; count++) {
            await game.keyboard.press('Tab');
            check(await game.evaluate(() => document.querySelector('#game-modal-box').contains(document.activeElement)), 'Choice modal focus escaped');
          }
          await game.keyboard.press('Escape'); await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
          check(canonical(await data()) === canonical(beforeReward), 'Cancelled equipment choice paid rewards');
          await keyboard(button(config.id)); await click('#game-modal-btn-confirm');
          const after = await data();
          check(after.commissions[config.id].status === 'claimed' && after.commissions[config.id].choiceId === choice.id,
            'Claim did not store the one chosen reward');
          for (const key of ['gold', 'crystal', 'prestige']) check(after[key] - beforeReward[key] === config.rewards[key], 'Wrong reward: ' + key);
          const gear = after.bag.find(item => item.id === choice.id);
          check(gear && !after.bag.some(item => config.rewards.equipmentChoices.some(other => other.id !== choice.id && other.id === item.id)),
            'Choice delivered wrong or multiple equipment');
          check(await game.locator(button(config.id)).isDisabled(), 'Claimed task can be claimed again');
          await selectBag(gear.uid);
          const preview = await game.evaluate(uid => window.gameState.getEquipmentPreview(uid), gear.uid);
          await keyboard('#btn-bag-equip-item'); await dismiss();
          const actual = await game.evaluate(() => window.gameState.getEffectiveStats());
          check(actual.atk === preview.after.atk && actual.magicResist === preview.after.magicResist &&
            actual.speed === preview.after.speed, 'Reward equipment preview differs from effective stats');
          check(actual.atk === previews[choice.id].after.atk && actual.maxHp === previews[choice.id].after.maxHp &&
            actual.magicResist === previews[choice.id].after.magicResist,
          'Pre-claim equipment goal did not match the paid-for, actually equipped reward');
          check((await data()).equipped[gear.slot].id === choice.id, 'Reward cannot actually be equipped');
          await refresh(); await town(); await guard();
          await game.locator(`[data-commission-card="${config.id}"]`).scrollIntoViewIfNeeded();
          await game.screenshot({ path: `output/playwright/midgame-${classId}-${viewport.width}-${config.id}.png`, animations: 'disabled' });
          selected.push(choice.id);
        }
        check(JSON.stringify(await game.evaluate(() => [1, 2, 4, 5].map(slot => localStorage.getItem('MOTA_WORLD_SAVE_SLOT_' + slot)))) === JSON.stringify(sentinels),
          'Protected slots changed');
        reports.push({ classId, viewport, battles, selected, refreshes: 9, errors, requests, protectedSlots: 4 });
      } catch (error) {
        await game.screenshot({ path: `output/playwright/midgame-failure-${classId}-${viewport.width}.png` });
        throw new Error(error.message + ' | ' + JSON.stringify({ classId, viewport, errors, requests }));
      } finally { await context.close(); }
    }
  }
  return { kind: 'earned midgame checkpoint loaded as explicit fixture; real UI story chain, choices, rewards and equipment; not full UI progression', reports };
}
