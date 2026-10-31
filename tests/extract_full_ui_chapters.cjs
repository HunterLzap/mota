const fs = require('fs');

const filename = process.argv[2];
if (!filename) throw new Error('Usage: node tests/extract_full_ui_chapters.cjs <log>');
const text = fs.readFileSync(filename, 'utf8');
const match = text.match(/### Result\r?\n([^\r\n]+)/);
if (!match) throw new Error('No Playwright result JSON found');
const result = JSON.parse(match[1]);

console.log(JSON.stringify(result.chapters.map(row => ({
  chapter: row.chapter,
  level: row.level,
  battles: row.battles,
  realSeconds: row.realSeconds
})), null, 2));
