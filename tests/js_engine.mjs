// Portable runner for the existing JS assertions and simulated DOM fixture.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
globalThis.print = console.log.bind(console);
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  if (args[i] === '-e') {
    await eval(args[i + 1]);
  } else if (args[i] === '-m') {
    await import(pathToFileURL(resolve(args[i + 1])).href);
  } else {
    throw new Error(`Unknown runner argument: ${args[i]}`);
  }
}
