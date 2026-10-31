async (page) => {
  const results = [];
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 1440, height: 1000 }]) {
    const context = await page.context().browser().newContext({ viewport });
    const game = await context.newPage();
    const errors = [], failedRequests = [], pendingRequests = new Set();
    game.on('pageerror', error => errors.push(error.message));
    game.on('request', request => pendingRequests.add(request.url()));
    game.on('requestfinished', request => pendingRequests.delete(request.url()));
    game.on('requestfailed', request => {
      pendingRequests.delete(request.url());
      failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
    });
    game.on('response', response => {
      if (response.status() >= 400) failedRequests.push({ url: response.url(), status: response.status() });
    });
    const dismiss = async () => {
      for (let i = 0; i < 4 && await game.evaluate(() => window.gameModal.isOpen); i++) {
        await game.locator('#game-modal-btn-confirm').click();
      }
      await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' });
    };
    const state = () => game.evaluate(() => {
      const data = window.gameState.data;
      return {
        active: data.activePetId,
        pet: structuredClone(data.pets.find(pet => pet.id === 'silver_dragon')),
        food: data.bag.find(item => item.id === 'pet_food')?.count || 0,
        pills: data.bag.find(item => item.id === 'pill_reborn')?.count || 0,
        books: data.bag.find(item => item.id === 'book_crit')?.count || 0
      };
    });
    const reachable = async (selector, region = '#pet-panel-body') => {
      const control = game.locator(selector);
      require(await control.isVisible(), `${viewport.width}: hidden control ${selector}`);
      await control.scrollIntoViewIfNeeded();
      const geometry = await control.evaluate((element, regionSelector) => {
        const rect = element.getBoundingClientRect();
        const panel = document.querySelector(regionSelector).getBoundingClientRect();
        const main = document.querySelector('main').getBoundingClientRect();
        const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return {
          inPanel: rect.left >= panel.left - 1 && rect.right <= panel.right + 1 && rect.top >= panel.top - 1 && rect.bottom <= panel.bottom + 1,
          inMain: rect.left >= main.left - 1 && rect.right <= main.right + 1 && rect.top >= main.top - 1 && rect.bottom <= main.bottom + 1,
          hit: element === top || element.contains(top), width: rect.width, height: rect.height
        };
      }, region);
      require(geometry.inPanel && geometry.inMain && geometry.hit && geometry.width > 0 && geometry.height > 0,
        `${viewport.width}: clipped or covered ${selector}: ${JSON.stringify(geometry)}`);
    };
    const capture = async name => {
      const dimensions = await game.evaluate(() => {
        const detail = document.querySelector('#pet-panel-body');
        const roster = document.querySelector('.pet-classic-roster');
        return {
          documentOverflow: document.body.scrollWidth > innerWidth,
          detailOverflow: detail.scrollWidth > detail.clientWidth + 1,
          detailWidth: Math.round(detail.getBoundingClientRect().width),
          rosterWidth: Math.round(roster.getBoundingClientRect().width)
        };
      });
      await game.screenshot({ path: `output/playwright/classic-${viewport.width}-pet-${name}.png`, animations: 'disabled' });
      require(!dimensions.documentOverflow && !dimensions.detailOverflow,
        `${viewport.width}: horizontal overflow on pet ${name}: ${JSON.stringify(dimensions)}`);
      return dimensions;
    };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click();
      await game.locator('#btn-confirm-character').click();
      await dismiss();
      // Isolated layout fixture: earned companions, chapter prerequisites and supplies.
      // This test proves button reachability and mutations, not natural progression.
      await game.evaluate(async () => {
        const { PET_CONFIGS } = await import('/js/config/pets.js');
        const { SPECIAL_ITEMS } = await import('/js/config/items.js');
        const { PET_SKILL_BOOKS } = await import('/js/config/petSkills.js');
        const data = window.gameState.data;
        data.level = 35; data.exp = 0; data.gold = 50000; data.crystal = 1000;
        data.currentQuestId = 'quest_11';
        for (let chapter = 1; chapter <= 10; chapter++) {
          data.questProgress[`quest_${chapter}`] = { current: 1, completed: true, claimed: true };
        }
        data.pets = ['golden_dragon', 'silver_dragon'].map(id => ({
          id, level: 30, exp: 0, tier: 'gold', stamina: id === 'silver_dragon' ? 55 : 100,
          apt: { ...PET_CONFIGS[id].defaultApt }, skills: []
        }));
        data.activePetId = 'golden_dragon';
        data.bag = data.bag.filter(item => !['pet_food', 'pill_reborn', 'book_crit'].includes(item.id));
        data.bag.push(
          { ...SPECIAL_ITEMS.pet_food, type: 'material', count: 2 },
          { ...SPECIAL_ITEMS.pill_reborn, type: 'material', count: 2 },
          { ...PET_SKILL_BOOKS.book_crit, type: 'skill_book', count: 1 }
        );
        window.gameState.notify();
      });
      await game.locator('#nav-tab-pets').click();
      await game.locator('#pet-subtab-overview').click();
      await game.locator('[data-pet-id="silver_dragon"]').click();
      require(await game.locator('[data-pet-id="silver_dragon"]').getAttribute('aria-pressed') === 'true', 'Companion selection did not update');
      await game.locator('.pet-detail-portrait .pet-portrait-art').evaluate(async element => {
        const image = new Image(); image.src = getComputedStyle(element).backgroundImage.slice(5, -2);
        await image.decode(); if (!image.naturalWidth) throw new Error('Owned pet portrait missing');
      });
      await reachable('#btn-toggle-active-pet');
      await game.locator('#btn-toggle-active-pet').click(); await dismiss();
      require((await state()).active === 'silver_dragon', 'Actual active-pet button failed');
      await reachable('#btn-feed-pet');
      await game.locator('#btn-feed-pet').click(); await dismiss();
      const fed = await state();
      require(fed.pet.stamina === 90 && fed.food === 1, 'Actual feeding did not restore stamina and consume one food');
      require(await game.locator('[aria-label="宠物体力"]').getAttribute('aria-valuenow') === '90', 'Stamina display did not refresh');
      const ownedDimensions = await capture('owned');

      await reachable('#pet-subtab-wash', '.pet-classic');
      await game.locator('#pet-subtab-wash').click();
      require(await game.locator('#pet-subtab-wash').getAttribute('aria-pressed') === 'true', 'Wash tab failed');
      await reachable('#btn-do-wash-apt');
      await reachable('#btn-do-evolve-pet');
      const washDimensions = await capture('wash');
      await game.locator('#btn-do-wash-apt').click(); await dismiss();
      const washed = await state();
      require(washed.pills === 1 && Object.values(washed.pet.apt).every(value => value >= 1200 && value <= 1799), 'Actual aptitude wash failed');

      await reachable('#pet-subtab-skills', '.pet-classic');
      await game.locator('#pet-subtab-skills').click();
      require(await game.locator('#pet-subtab-skills').getAttribute('aria-pressed') === 'true', 'Skills tab failed');
      await reachable('.btn-learn-skill[data-book-id="book_crit"]');
      require(await game.locator('.btn-learn-skill[data-book-id="book_crit"]').locator('..').locator('.font-bold.truncate').evaluate(element => element.scrollWidth <= element.clientWidth), 'Skill-book name clipped in narrow detail');
      const skillsDimensions = await capture('skills');
      await game.locator('.btn-learn-skill[data-book-id="book_crit"]').click(); await dismiss();
      const learned = await state();
      require(learned.books === 0 && learned.pet.skills.includes('book_crit'), 'Actual learn button failed');
      await reachable('.btn-return-pet-book[data-learned-id="book_crit"]');
      await game.locator('.btn-return-pet-book[data-learned-id="book_crit"]').click(); await dismiss();
      const returned = await state();
      require(returned.books === 1 && !returned.pet.skills.includes('book_crit'), 'Actual return-book button failed');
      require(errors.length === 0, errors.join('; '));
      results.push({
        ...viewport, fixture: true, naturalProgression: false,
        selectedPet: 'silver_dragon', active: fed.active, stamina: fed.pet.stamina,
        feeding: true, wash: true, learnAndReturn: true,
        layouts: { owned: ownedDimensions, wash: washDimensions, skills: skillsDimensions }, errors
      });
    } catch (error) {
      await game.screenshot({ path: `output/playwright/classic-${viewport.width}-pet-failure.png` });
      throw new Error(error.message + ' | ' + JSON.stringify({
        errors, failedRequests, pendingRequests: [...pendingRequests],
        initialization: await game.evaluate(() => ({
          ready: document.readyState, app: !!window.appInstance, state: !!window.gameState,
          chosen: window.gameState?.data?.hasChosenClass,
          creationMarkup: document.getElementById('char-select-overlay')?.innerHTML.length
        }))
      }));
    } finally { await context.close(); }
  }
  return { results };
}
