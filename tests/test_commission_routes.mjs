import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GameState } = await import('../js/core/state.js');
const { naturalJourney } = await import('./natural_journey.mjs');
const { runCombat } = await import('../js/core/combat.js');
const { MAPS } = await import('../js/config/maps.js');
const { storage } = await import('../js/core/storage.js');
const fixtures = {}, reports = [];
for (const classId of ['warrior', 'mage', 'hunter']) {
  let opening;
  naturalJourney(classId, 406, (_, state) => {
    if (state.data.level < 19) opening = structuredClone(state.data);
  });
  const state = new GameState();
  state.data = opening;
  const forest = MAPS[0];
  const prepare = () => {
    if (state.data.freeStatPoints) assert.equal(state.allocateRecommendedStats().success, true);
    for (const pet of state.data.pets) if (pet.stamina < 65) assert.equal(state.feedPet(pet.id).success, true);
    if (Object.values(state.data.equipped).some(item => item && item.durability < 20)) assert.equal(state.repairAllEquipment().success, true);
  };
  let preparationWins = 0;
  while (state.data.level < 19) {
    prepare();
    const result = runCombat(state.getEffectiveStats(), { ...forest.monsters[2], speed: 18 }, state.data, forest.monsters[2]);
    assert.equal(result.victory, true);
    state.settleWildVictory('forest', 2); state.completeBattle();
    if (state.data.questProgress.patrol_tracks?.completed && !state.data.questProgress.patrol_tracks.claimed) assert.equal(state.claimRegionalStory('patrol_tracks').success, true);
    assert.ok(++preparationWins < 100);
  }
  prepare();
  assert.equal(state.data.level, 19);
  fixtures[classId] = structuredClone(state.data);
  const before = { level: state.data.level, gold: state.data.gold, crystal: state.data.crystal };
  for (const id of ['oath_token', 'nation_guide', 'tavern_road', 'tavern_tower']) assert.equal(state.acceptCommission(id).success, true);
  const fights = [];
  for (const target of [...forest.monsters, forest.boss]) {
    const result = runCombat(state.getEffectiveStats(), { ...target, maxHp: target.hp, speed: target.speed || 18 },
      state.data, { ...target, level: target.level || forest.reqLevel });
    assert.equal(result.victory, true, `${classId} earned character cannot beat ${target.name}`);
    fights.push({ enemy: target.name, victory: result.victory, seconds: result.duration });
    if (target === forest.boss) state.settleWildBossVictory('forest');
    else state.settleWildVictory('forest', forest.monsters.indexOf(target));
    state.completeBattle();
  }
  for (const id of ['oath_token', 'nation_guide', 'tavern_road']) assert.equal(state.claimCommission(id).success, true);
  assert.equal(state.data.bag.find(item => item.id === 'pet_egg_darkgold').count, 2);
  storage.parseBackupText(JSON.stringify({ saveData: state.data }));
  reports.push({ classId, kind: 'earned production checkpoint, unseeded extra combat, not full UI', before,
    preparationWins, fights, eggs: 2, after: { level: state.data.level, gold: state.data.gold, crystal: state.data.crystal } });
  console.log(`PASS ${classId} earned Lv.${before.level}: 4 wins, oath/nation/road rewards including 2 darkgold eggs`);
}
mkdirSync('output/playwright', { recursive: true });
writeFileSync('output/playwright/commissions-fixtures.json', JSON.stringify(fixtures, null, 2));
writeFileSync('output/playwright/commissions-earned-routes.json', JSON.stringify(reports, null, 2));
