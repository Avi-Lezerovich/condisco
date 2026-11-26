// Builds the installable plugin ZIP: dist/condisco-<version>.zip
// The plugin bundles the app under skills/study-setup/assets/app/. In this repository the app has one
// source (app/), and this script copies its runtime files into the bundle, so the two can never drift.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { drift } from './sync-shared.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'condisco');
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugin/.claude-plugin/plugin.json'), 'utf8'));

// Files in app/ that are for developers, not for the published page.
const APP_EXCLUDE = new Set(['README.md', 'SCHEMA.md', 'tests', 'scenes/README.md', 'scenes/preview.html']);

const stale = drift();
if (stale.length) { console.error(stale.join('\n') + '\nRun: node scripts/sync-shared.mjs'); process.exit(1); }

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(path.join(ROOT, 'plugin'), OUT, { recursive: true });
const assets = path.join(OUT, 'skills/study-setup/assets/app');
fs.cpSync(path.join(ROOT, 'app'), assets, {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(path.join(ROOT, 'app'), src).split(path.sep).join('/');
    return rel === '' || ![...APP_EXCLUDE].some((x) => rel === x || rel.startsWith(x + '/'));
  },
});

const zip = `condisco-${version}.zip`;
execFileSync('zip', ['-r', '-X', '-q', zip, 'condisco', '-x', '*.DS_Store'], { cwd: DIST, stdio: 'inherit' });
const count = execFileSync('unzip', ['-Z1', zip], { cwd: DIST }).toString().trim().split('\n').length;
const size = (fs.statSync(path.join(DIST, zip)).size / 1024 / 1024).toFixed(1);
console.log(`built dist/${zip}: ${count} entries, ${size} MB, top level "condisco/"`);
