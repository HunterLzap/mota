globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { naturalJourney } = await import('../../tests/natural_journey.mjs');
const strategy = process.env.JOURNEY_STRATEGY || 'ordinary';
for (const seed of process.argv.slice(2).map(Number).length ? process.argv.slice(2).map(Number) : [406]) {
  for (const classId of ['warrior', 'mage', 'hunter']) {
    const report = naturalJourney(classId, seed, row => console.log(JSON.stringify({ classId, seed, ...row })), strategy);
    console.log(JSON.stringify(report));
  }
}
