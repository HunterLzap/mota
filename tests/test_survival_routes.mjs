import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { naturalJourney } = await import('./natural_journey.mjs');
const { storage } = await import('../js/core/storage.js');
const reports = [];
for (const seed of [406, 123, 2026]) {
  for (const classId of ['warrior', 'mage', 'hunter']) {
    const report = naturalJourney(classId, seed, (_, state) => {
      storage.parseBackupText(JSON.stringify({ saveData: state.data }));
    }, 'ordinary', null, 2, { skillBuild: 'ward', partyBuild: 'survival', sideTasks: 'none' });
    assert.equal(report.final.quest, 'completed');
    assert.equal(report.final.tower, 100);
    assert.equal(report.waitingHours, 0);
    assert.equal(report.losses, 0);
    assert.equal(report.chapters.length, 26);
    assert.ok(report.bossSamples.at(-1).winPct >= 80, 'Frozen survival-party final-boss samples unreliable');
    for (const id of ['phoenix', 'pixie']) {
      assert.ok(report.contracts.some(contract => contract.id === id && contract.heroLevel >= 45 &&
        contract.gold === 27500 && contract.crystal === 140), 'Survival pet was not earned through its paid contract: ' + id);
      assert.ok(report.final.party.some(pet => pet?.id === id));
    }
    assert.equal(new Set(report.final.party.filter(Boolean).map(pet => pet.id)).size, 3);
    for (const [key, closing] of Object.entries(report.resourceAccounting.closing)) {
      const net = Object.values(report.resourceFlow).reduce((sum, flow) => sum + flow[key], 0);
      assert.equal(report.resourceAccounting.opening[key] + net, closing, 'Unaccounted resource: ' + key);
    }
    reports.push(report);
    console.log(JSON.stringify({ classId, seed, battles: report.battles, losses: report.losses,
      minutes: +(report.combatSeconds / 60).toFixed(2), finalBossWinPct: report.bossSamples.at(-1).winPct,
      contracts: report.contracts, foodUsed: report.foodUsed }));
  }
}
writeFileSync('output/playwright/survival-routes.json', JSON.stringify({
  kind: 'production simulation from empty saves; paid survival companions; not full UI or a paired causal comparison', reports
}, null, 2));
console.log('PASS 9 empty-save survival parties; earned contracts, maintenance, backup parsing and resource conservation');
