const fs = require('fs');

const filename = process.argv[2];
if (!filename) throw new Error('Usage: node tests/extract_full_ui_result.cjs <log>');
const text = fs.readFileSync(filename, 'utf8');
const match = text.match(/### Result\r?\n([^\r\n]+)/);
if (!match) throw new Error('No Playwright result JSON found');
const result = JSON.parse(match[1]);

console.log(JSON.stringify({
  classId: result.classId,
  battles: result.battles.length,
  losses: result.losses,
  chapters: result.chapters.length,
  level: result.final?.level,
  floor: result.final?.floor,
  promotion: result.final?.promotion,
  realSeconds: result.realSeconds,
  combatSeconds: result.combatSeconds,
  pageerrors: result.errors.length,
  refreshes: result.refreshes,
  potions: result.potions.length,
  final: result.final
}, null, 2));
