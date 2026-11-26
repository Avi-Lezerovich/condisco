// Runs every browser suite in app/tests against the local mock server (tests/serve.mjs on :8811).
// Usage: node scripts/run-browser-tests.mjs [suite ...]   e.g. node scripts/run-browser-tests.mjs today timer
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const PORT = '8811';
const SUITES = {
  smoke: ['tests/smoke.mjs', 'tests/shots'],
  today: ['tests/today.mjs'],
  'gaps-ui': ['tests/gaps-ui.mjs', 'tests/shots', PORT],
  checkin: ['tests/checkin.mjs'],
  focus: ['tests/focus.mjs'],
  timer: ['tests/timer.mjs'],
  breath: ['tests/breath.mjs', PORT],
  idle: ['tests/idle.mjs'],
  sound: ['tests/sound.mjs'],
  exam: ['tests/exam.mjs', PORT],
  layout: ['tests/layout.mjs'],
  matrix: ['tests/matrix.mjs', '--quick'],
};
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SUITES);
for (const w of wanted) if (!SUITES[w]) { console.error(`Unknown suite "${w}". Known: ${Object.keys(SUITES).join(', ')}`); process.exit(2); }

const run = (args) => new Promise((resolve) => {
  const p = spawn(process.execPath, args, { cwd: APP, stdio: 'inherit' });
  p.on('exit', (code) => resolve(code ?? 1));
});

const server = spawn(process.execPath, ['tests/serve.mjs', '.', PORT], { cwd: APP, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch {} };
process.on('SIGINT', () => { stop(); process.exit(130); });

// Wait until the server answers.
for (let i = 0; ; i++) {
  try { if ((await fetch(`http://localhost:${PORT}/index.html`)).ok) break; } catch {}
  if (i > 50) { console.error('Test server did not start'); stop(); process.exit(1); }
  await new Promise((r) => setTimeout(r, 100));
}

const failed = [];
for (const name of wanted) {
  console.log(`\n=== ${name} ===`);
  const code = await run(SUITES[name]);
  if (code !== 0) failed.push(name);
}
stop();
console.log(failed.length ? `\nFAILED: ${failed.join(', ')}` : `\nAll ${wanted.length} browser suites passed.`);
process.exit(failed.length ? 1 : 0);
