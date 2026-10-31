import { mkdirSync, writeFileSync } from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GameState } = await import('../js/core/state.js');
const { CLASSES } = await import('../js/config/classes.js');
const { runCombat } = await import('../js/core/combat.js');
const { getTowerFloorData } = await import('../js/config/towerLevels.js');
const { naturalJourney } = await import('./natural_journey.mjs');
const fixtures = {}, diagnostics = [];
const prefix = process.argv[2] || 'mage-pressure-before';
for (const classId of ['warrior', 'mage', 'hunter']) for (const build of ['balanced', 'assault', 'ward']) {
  const key = classId + ':' + build;
  naturalJourney(classId, 406, (chapter, state) => {
    if (chapter.chapter !== 25) return;
    const effective = state.getEffectiveStats.bind(state);
    state.getEffectiveStats = function () {
      const stats = effective();
      if (!fixtures[key] && this.data.castle.isExploring && this.data.castle.floor === 100) {
        fixtures[key] = structuredClone(this.data);
      }
      return stats;
    };
  }, 'ordinary', null, 2, { skillBuild: build, partyBuild: build === 'balanced' ? 'solo' : build });
}
const boss = getTowerFloorData(100, 2);
for (const mode of ['actual', 'noAura', 'noDrain', 'noLeech', 'noShield']) {
  const state = new GameState(); state.data = structuredClone(fixtures['mage:balanced']);
  const originalSkills = structuredClone(CLASSES.mage.skills);
  const stats = state.getEffectiveStats();
  if (mode === 'noAura') CLASSES.mage.skills.find(skill => skill.id === 'm_sk_3').effect.teamRegenHp = 0;
  if (mode === 'noDrain') CLASSES.mage.skills.find(skill => skill.id === 'm_sk_9').lifestealRate = 0;
  if (mode === 'noLeech') stats.lifesteal = 0;
  if (mode === 'noShield') CLASSES.mage.skills.find(skill => skill.id === 'm_sk_7').effect.mpShieldRate = 0;
  const row = { mode, wins: 0, minHp: 0, remainingHp: 0, healing: {}, shieldMana: 0 };
  const random = Math.random;
  try {
    for (let seed = 1000; seed < 1100; seed++) {
      let value = seed;
      Math.random = () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
      const result = runCombat(stats, boss, { ...state.data, isCastleExplore: true }, boss);
      row.wins += Number(result.victory);
      row.minHp += Math.min(...result.logs.map(log => log.playerHp)) / stats.maxHp / 100;
      row.remainingHp += result.remainingHp / stats.maxHp / 100;
      for (const log of result.logs) {
        if (log.type === 'heal') {
          const name = log.message.match(/【([^】]+)】/)?.[1] || log.message;
          row.healing[name] = (row.healing[name] || 0) + Number(log.message.match(/(?:生命 |恢复了 |恢复 )(\d+)/)?.[1] || 0) / 100;
        }
        if (log.message.includes('寒冰护盾')) row.shieldMana += Number(log.message.match(/消耗 (\d+)/)?.[1] || 0) / 100;
      }
      if (mode === 'actual' && seed === 1000) {
        writeFileSync(`output/playwright/${prefix}-trace.json`, JSON.stringify({ stats, result }, null, 2));
      }
    }
  } finally { Math.random = random; CLASSES.mage.skills = originalSkills; }
  diagnostics.push(row);
}
mkdirSync('output/playwright', { recursive: true });
writeFileSync('output/playwright/mage-pressure-earned-fixtures.json', JSON.stringify(fixtures, null, 2));
writeFileSync(`output/playwright/${prefix}-diagnostics.json`, JSON.stringify(diagnostics, null, 2));
console.log(JSON.stringify(diagnostics, null, 2));
