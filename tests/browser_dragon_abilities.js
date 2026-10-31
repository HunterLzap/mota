async (page) => {
  const rows = [];
  for (const [dragonId, petId, stamina] of [
    ['slay_red_dragon', 'golden_dragon', 100], ['slay_red_dragon', 'unicorn', 100], ['slay_red_dragon', 'unicorn', 59],
    ['slay_silver_dragon', 'golden_dragon', 100], ['slay_silver_dragon', 'unicorn', 100], ['slay_silver_dragon', 'unicorn', 59],
    ['slay_golden_dragon', 'golden_dragon', 100], ['slay_golden_dragon', 'white_angel', 100], ['slay_golden_dragon', 'white_angel', 59]
  ]) {
    const context = await page.context().browser().newContext(); const game = await context.newPage(); const errors = [];
    game.on('pageerror', error => errors.push(error.message));
    const dismiss = async () => { while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click(); };
    try {
      await game.goto('http://127.0.0.1:8088'); await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
      await game.evaluate(async ({dragonId, petId, stamina}) => {
        const { PET_CONFIGS } = await import('/js/config/pets.js'); const state = window.gameState;
        state.data.level = 100; state.data.currentQuestId = 'completed';
        const atk = dragonId === 'slay_red_dragon' ? 800 : dragonId === 'slay_silver_dragon' ? 3000 : 10000;
        state.data.equipped.weapon ??= { id:'fixture_weapon',uid:'fixture_weapon',name:'Fixture weapon',slot:'weapon',quality:'blue',durability:100,maxDurability:100,stars:1,sockets:1,gems:[],stats:{atk:35} };
      state.data.equipped.weapon.stats = { atk, hp: 1000000 };
        state.data.pets = [{id:petId,level:1,exp:0,tier:PET_CONFIGS[petId].defaultTier,apt:{...PET_CONFIGS[petId].defaultApt},stamina,skills:[]}];
        state.data.activePetId = petId; state.notify(); Math.random = () => .5;
        window.appInstance.views.town.currentView = 'dragons'; window.switchMainTab('town');
      }, {dragonId,petId,stamina});
      const before = await game.evaluate(() => ({gold:window.gameState.data.gold,crystal:window.gameState.data.crystal}));
      await game.locator(`.btn-fight-dragon[data-dragon-id="${dragonId}"]`).click();
      await game.evaluate(() => { window.replayDragon = window.appInstance.battleView.onFinishCallback; });
      await game.locator('#btn-skip-battle').click(); const combat = await game.evaluate(() => window.appInstance.battleView.currentCombat);
      if (!combat.victory || !combat.logs.some(log => log.message.includes('首领蓄势'))) throw new Error('Fixture did not win with a warned cast');
      const name = dragonId === 'slay_red_dragon' ? '烈焰撕裂' : dragonId === 'slay_silver_dragon' ? '极地霜息' : '王者震慑';
      const casts = combat.logs.filter(log => log.message.includes('施展【' + name + '】')).length;
      if (!casts) throw new Error('Dragon skill never cast');
      const statuses = dragonId === 'slay_red_dragon' ? ['重创'] : dragonId === 'slay_silver_dragon' ? ['虚弱', '减速'] : ['眩晕'];
      const protectedPet = petId !== 'golden_dragon' && stamina >= 60;
      for (const status of statuses) {
        if (combat.logs.some(log => log.message.includes('免疫' + status)) !== protectedPet) throw new Error('Immunity/fatigue wrong');
        if (combat.logs.some(log => log.message.includes('陷入' + status)) === protectedPet) throw new Error('Status/fatigue wrong');
      }
      if (combat.logs.some(log => !Number.isFinite(log.playerHp) || !Number.isFinite(log.enemyHp))) throw new Error('Non-finite combat');
      await game.locator('#btn-confirm-battle').click(); await dismiss();
      const won = await game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
      if (won.gold - before.gold !== 5000 || won.crystal - before.crystal !== 100 || won.dragon.cleared[dragonId] !== 1) throw new Error('Reward mismatch');
      await game.evaluate(() => window.replayDragon(true)); await dismiss();
      if (await game.evaluate(() => window.gameState.data.gold) !== won.gold) throw new Error('Duplicate reward');
      await game.reload();
      if (await game.evaluate(id => window.gameState.data.dragon.cleared[id], dragonId) !== 1) throw new Error('Reload lost clear');
      if (errors.length) throw new Error(errors.join('; '));
      rows.push({dragonId,petId,stamina,casts,protectedPet,rewardOnce:true,reloadPreserved:true,errors});
    } finally { await context.close(); }
  }
  return {rows,fixture:'Prepared level/gear/pet; actual dragon config, battles, status and settlement, no natural acquisition proof'};
}
