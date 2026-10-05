async (page) => {
  const rows = [];
  for (const [floor, petId, stamina] of [[50,'golden_dragon',100],[50,'naga',100],[50,'naga',59],[60,'golden_dragon',100],[60,'pegasus',100],[60,'pegasus',59]]) {
    const context = await page.context().browser().newContext(); const game = await context.newPage(); const errors = [];
    game.on('pageerror', e => errors.push(e.message));
    const dismiss = async () => { while (await game.evaluate(() => window.gameModal.isOpen)) await game.locator('#game-modal-btn-confirm').click(); };
    try {
      await game.goto('http://127.0.0.1:8088');
      await game.locator('[data-class-id="warrior"]').click(); await game.locator('#btn-confirm-character').click();
      // Prepared level/gear/pet fixture; actual boss parameters, battles and settlement adapters.
      await game.evaluate(async ({floor,petId,stamina}) => {
        const { PET_CONFIGS } = await import('/js/config/pets.js'); const state = window.gameState;
        state.data.level = floor; state.data.currentQuestId = 'completed';
        state.data.equipped = { weapon: { id:'test_sword',uid:'test_sword',name:'Test sword',slot:'weapon',quality:'blue',gems:[],sockets:0,durability:100,maxDurability:100,stats:{atk:floor===50?100000:1500,hp:1000000} } };
        state.data.pets = [{id:petId,level:1,exp:0,tier:PET_CONFIGS[petId].defaultTier,apt:{...PET_CONFIGS[petId].defaultApt},stamina,skills:[]}];
        state.data.activePetId = petId;
        Object.assign(state.data.castle,{floor,isExploring:true,finished:false,claimedBossRewards:[]}); state.notify(); Math.random=()=>.5;
      }, {floor,petId,stamina});
      await game.locator('#nav-tab-tower').click();
      await game.locator('#btn-challenge-castle-floor').click(); await game.locator('#btn-skip-battle').click();
      const battle = await game.evaluate(() => window.appInstance.battleView.currentCombat);
      if (!battle.victory) throw new Error(`Fixture lost: ${floor}/${petId}/${stamina}`);
      const rebirth = battle.logs.filter(log=>log.message.includes('首领重生')).length;
      const blocked = battle.logs.filter(log=>log.type==='special'&&log.message.includes('封断重生契约')).length;
      if (floor===50 && (rebirth !== (petId==='naga'&&stamina>=60?0:1) || blocked !== (petId==='naga'&&stamina>=60?1:0))) throw new Error('Rebirth counterplay failed');
      const siphons = battle.logs.filter(log=>log.message.includes('首领汲取'));
      if (floor===60) {
        if (!siphons.length || !battle.logs.some(log=>log.message.includes('首领蓄势'))) throw new Error('Siphon did not cast');
        if (siphons.some(log=>log.message.includes('庇护削弱')) !== (petId==='pegasus'&&stamina>=60)) throw new Error('Protection fatigue mismatch');
      }
      const before = await game.evaluate(()=>({crystal:window.gameState.data.crystal,bag:window.gameState.data.bag.length}));
      await game.locator('#btn-confirm-battle').click(); await dismiss();
      const paid = await game.evaluate(()=>JSON.parse(JSON.stringify(window.gameState.data)));
      if (paid.castle.claimedBossRewards.filter(f=>f===floor).length!==1 || paid.bag.length!==before.bag+1) throw new Error('First clear not paid exactly once');
      const rejected = await game.evaluate(floor=>window.gameState.settleCastleVictory(floor),floor);
      if (rejected.success) throw new Error('Duplicate victory paid');
      await game.reload(); const loaded = await game.evaluate(()=>JSON.parse(JSON.stringify(window.gameState.data)));
      if (loaded.crystal!==paid.crystal || loaded.bag.length!==paid.bag.length || loaded.castle.claimedBossRewards.filter(f=>f===floor).length!==1) throw new Error('Reload lost settlement');
      if (errors.length) throw new Error(errors.join('; '));
      rows.push({floor,petId,stamina,rebirth,blocked,siphons:siphons.length,crystalGain:paid.crystal-before.crystal,duplicateRefused:true,reloadPreserved:true,errors});
    } finally { await context.close(); }
  }
  return {rows,fixture:'Prepared level/gear/pet; does not prove natural acquisition or difficulty'};
}
