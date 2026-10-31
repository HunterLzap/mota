import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { naturalJourney } = await import('./natural_journey.mjs');
const { storage } = await import('../js/core/storage.js');
const reports = [], summaries = [], failures = [];
for (const seed of [406, 123, 2026]) {
  for (const classId of ['warrior', 'mage', 'hunter']) {
    for (const build of ['balanced', 'assault', 'ward']) {
      for (const sideTasks of ['none', 'moderate']) {
        try {
          const report = naturalJourney(classId, seed, (_, state) => {
            storage.parseBackupText(JSON.stringify({ saveData: state.data }));
          }, 'ordinary', null, 2, { skillBuild: build, partyBuild: build === 'balanced' ? 'solo' : build, sideTasks });
          assert.equal(report.final.quest, 'completed');
          assert.equal(report.final.tower, 100);
          assert.equal(report.waitingHours, 0);
          assert.equal(report.chapters.length, 26);
          assert.ok(report.battles < 300);
          assert.equal(report.optionalActivities.length, sideTasks === 'none' ? 0 : 4);
          if (build !== 'balanced') {
            assert.equal(report.final.party.filter(Boolean).length, 3, 'Route never earned a full party');
            assert.equal(new Set(report.final.party.filter(Boolean).map(pet => pet.id)).size, 3);
            assert.ok(report.contracts.length >= 2);
          }
          for (const [key, closing] of Object.entries(report.resourceAccounting.closing)) {
            const net = Object.values(report.resourceFlow).reduce((sum, flow) => sum + flow[key], 0);
            assert.equal(report.resourceAccounting.opening[key] + net, closing, 'Unaccounted source: ' + key);
          }
          assert.ok(report.bossSamples.at(-1).winPct >= 80, 'Frozen final-boss samples unreliable');
          assert.equal(-report.resourceFlow.feeding.food, report.foodUsed);
          reports.push(report);
          summaries.push({ classId, seed, build, sideTasks, battles: report.battles, losses: report.losses,
            combatMinutes: +(report.combatSeconds / 60).toFixed(1), finalBossWinPct: report.bossSamples.at(-1).winPct,
            finalBossSeconds: +report.bossSamples.at(-1).meanSeconds.toFixed(1), repairs: report.repairs, repairGold: report.repairGold,
            foodUsed: report.foodUsed, finalFood: report.final.food, contractGold: -report.resourceFlow.contract.gold,
            optionalIncome: report.resourceFlow.bounty || null, gold: report.final.gold, crystal: report.final.crystal });
        } catch (error) { failures.push({ classId, seed, build, sideTasks, error: error.message }); }
      }
    }
  }
}
mkdirSync('output/playwright', { recursive: true });
writeFileSync('output/playwright/restoration-routes.json', JSON.stringify({ kind: 'production simulation; earned resources only; not full UI', summaries, failures, reports }, null, 2));
for (const classId of ['warrior', 'mage', 'hunter']) {
  const rows = summaries.filter(row => row.classId === classId);
  const range = key => [Math.min(...rows.map(row => row[key])), Math.max(...rows.map(row => row[key]))];
  console.log(JSON.stringify({ classId, routes: rows.length, battles: range('battles'), losses: range('losses'), combatMinutes: range('combatMinutes'), foodUsed: range('foodUsed'), finalBossWinPct: range('finalBossWinPct') }));
}
assert.deepEqual(failures, [], 'Some earned restoration routes failed');
assert.equal(reports.length, 54);
console.log('PASS 54 empty-save routes; chapter backup validation and resource conservation; full party earned in both alternate builds');
