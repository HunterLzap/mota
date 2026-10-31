import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GameState } = await import('../js/core/state.js');
const { CLASSES } = await import('../js/config/classes.js');
const { runCombat, getPlayerActionInterval } = await import('../js/core/combat.js');
const { getTowerFloorData } = await import('../js/config/towerLevels.js');
const { storage } = await import('../js/core/storage.js');
const { naturalJourney } = await import('./natural_journey.mjs');
const seeds = [17, 2718, 8191];
const routes = [], frozen = [], paired = [], allocations = [];
const growth = CLASSES.hunter.growth;
const checkpoints = new Map([[10, 10], [13, 30], [20, 50], [25, 100]]);

for (const classId of ['warrior', 'mage', 'hunter']) {
  for (const seed of seeds) for (const build of ['balanced', 'assault', 'ward']) {
    for (const sideTasks of ['none', 'moderate']) {
      const report = naturalJourney(classId, seed, (row, state) => {
        storage.parseBackupText(JSON.stringify({ saveData: state.data }));
        if (classId === 'hunter' && sideTasks === 'none' && checkpoints.has(row.chapter)) {
          frozen.push({ seed, build, chapter: row.chapter, data: structuredClone(state.data) });
        }
      }, 'ordinary', null, 2, { skillBuild: build, partyBuild: build === 'balanced' ? 'solo' : build, sideTasks });
      assert.equal(report.final.quest, 'completed');
      assert.equal(report.final.tower, 100);
      assert.equal(report.chapters.length, 26);
      assert.equal(report.waitingHours, 0);
      assert.ok(report.battles < 300, 'Reasonable routes must not add prolonged grinding');
      assert.ok(report.bossSamples.at(-1).winPct >= 80,
        `${classId}/${seed}/${build}/${sideTasks}: final boss ${JSON.stringify(report.bossSamples.at(-1))}`);
      assert.equal(report.optionalActivities.length, sideTasks === 'none' ? 0 : 4);
      if (build !== 'balanced') {
        assert.equal(report.final.party.filter(Boolean).length, 3);
        assert.equal(new Set(report.final.party.filter(Boolean).map(p => p.id)).size, 3);
        assert.ok(report.contracts.length >= 2);
      }
      for (const [key, closing] of Object.entries(report.resourceAccounting.closing)) {
        const net = Object.values(report.resourceFlow).reduce((sum, flow) => sum + flow[key], 0);
        assert.equal(report.resourceAccounting.opening[key] + net, closing, 'Unaccounted resource: ' + key);
      }
      routes.push({ classId, seed, build, sideTasks, battles: report.battles, losses: report.losses,
        combatMinutes: +(report.combatSeconds / 60).toFixed(2), finalBoss: report.bossSamples.at(-1),
        pet: report.final.pet.id, foodUsed: report.foodUsed, repairGold: report.repairGold,
        contracts: report.contracts, resourceFlow: report.resourceFlow });
    }
  }
  const rows = routes.filter(row => row.classId === classId);
  console.log(JSON.stringify({ classId, routes: rows.length,
    combatMinutes: [Math.min(...rows.map(r => r.combatMinutes)), Math.max(...rows.map(r => r.combatMinutes))],
    losses: rows.reduce((sum, r) => sum + r.losses, 0),
    minFinalWinPct: Math.min(...rows.map(r => r.finalBoss.winPct)) }));
}

function sample(data, floor) {
  const state = new GameState();
  state.data = structuredClone(data);
  const stats = state.getEffectiveStats(), enemy = getTowerFloorData(floor, 2);
  const originalRandom = Math.random;
  let wins = 0, seconds = 0, playerActions = 0, enemyActions = 0, timeouts = 0;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      let seed = 1000 + attempt;
      Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
      const result = runCombat(stats, enemy, { ...state.data, isCastleExplore: true }, enemy);
      wins += Number(result.victory);
      seconds += result.duration;
      playerActions += result.actionCounts.player;
      enemyActions += result.actionCounts.enemy;
      timeouts += Number(Boolean(result.timedOut));
    }
  } finally { Math.random = originalRandom; }
  assert.deepEqual(state.data, data, 'Frozen combat must not consume assets or pay rewards');
  return { wins, meanSeconds: seconds / 100, meanPlayerActions: playerActions / 100,
    meanEnemyActions: enemyActions / 100, timeouts, interval: getPlayerActionInterval(stats, data), stats };
}

try {
  for (const point of frozen) {
    const { seed, build, chapter } = point;
    for (const [variant, patch] of [
      ['previous_growth', { atk: 7.5, speed: 2.5 }],
      ['prior_damped_growth', { atk: 5.5, speed: 1.5 }],
      ['attack_only', { speed: 2.5 }],
      ['speed_only', { atk: 7.5 }],
      ['current', {}]
    ]) {
      CLASSES.hunter.growth = { ...growth, ...patch };
      paired.push({ seed, build, chapter, variant, ...sample(point.data, checkpoints.get(chapter)) });
    }
    CLASSES.hunter.growth = growth;
    if (chapter !== 25) continue;
    const current = paired.at(-1);
    assert.ok(current.wins >= 80 && current.meanEnemyActions >= 3);
    assert.equal(current.timeouts, 0);
    for (const target of ['dex', 'str', 'int']) {
      const data = structuredClone(point.data);
      if (target !== 'dex') {
        data.allocatedStats[target] += data.allocatedStats.dex;
        data.allocatedStats.dex = 0;
      }
      const result = sample(data, 100);
      allocations.push({ seed, build, target, ...result });
      assert.ok(result.wins >= 80, 'Alternate earned allocation must remain viable');
    }
    const last = allocations.slice(-3);
    assert.ok(last[0].meanSeconds < last[1].meanSeconds && last[0].meanSeconds < last[2].meanSeconds,
      'Hunter dexterity must retain value across all sampled earned builds');
  }
} finally { CLASSES.hunter.growth = growth; }
assert.equal(routes.length, 54);
assert.equal(frozen.length, 36);
const comparison = [...checkpoints.keys()].map(chapter => {
  const mean = variant => {
    const rows = paired.filter(r => r.chapter === chapter && r.variant === variant);
    return rows.reduce((sum, r) => sum + r.meanSeconds, 0) / rows.length;
  };
  const previous = mean('previous_growth'), priorDamped = mean('prior_damped_growth'), current = mean('current');
  assert.ok(current > previous, 'Damped automatic growth must slow the same earned character');
  assert.ok(current > priorDamped,
    `Chapter ${chapter}: current 4.5/1.25 must slow the same earned character relative to 5.5/1.5`);
  return { chapter, previousSeconds: +previous.toFixed(2), currentSeconds: +current.toFixed(2),
    changePct: +((current / previous - 1) * 100).toFixed(1),
    priorDampedSeconds: +priorDamped.toFixed(2),
    changeFromPriorDampedPct: +((current / priorDamped - 1) * 100).toFixed(1) };
});
mkdirSync('output/playwright', { recursive: true });
writeFileSync('output/playwright/hunter-robustness.json', JSON.stringify({
  kind: '54 additional earned production routes; 36 frozen hunter states x five growth variants x 100 paired seeds; not UI',
  growth, routes, comparison, paired, allocations
}, null, 2));
console.log(JSON.stringify({ pairedCheckpoints: frozen.length, samples: paired.length * 100,
  allocationSamples: allocations.length * 100, comparison }));
console.log('PASS extra loot/hatch seeds, alternate parties/training, optional income, frozen growth attribution and dexterity value');
