const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const script = process.argv[2] || 'tests/browser_save_consistency.js';
  const phase = process.argv[3] || 'after';
  const output = process.env.OVERNIGHT_OUTPUT || 'output/overnight';
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  console.log(JSON.stringify({ started: new Date().toISOString(), chrome: browser.version(), script, phase }));
  try {
    const page = await browser.newPage();
    const source = fs.readFileSync(script, 'utf8').replaceAll('http://127.0.0.1:8088', 'http://127.0.0.1:8089');
    const run = vm.runInThisContext(`(${source})`, { filename: script });
    const result = await run(page, { phase, output });
    fs.writeFileSync(path.join(output, phase + '.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
