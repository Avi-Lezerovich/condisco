// Bumps the Condisco release version everywhere it is written.
// Usage: node scripts/bump-version.mjs 0.4.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const next = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(next || '')) { console.error('Usage: node scripts/bump-version.mjs X.Y.Z'); process.exit(2); }
const prev = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugin/.claude-plugin/plugin.json'), 'utf8')).version;
if (prev === next) { console.log(`already ${next}`); process.exit(0); }

const FILES = [
  'plugin/.claude-plugin/plugin.json',
  'package.json',
  'package-lock.json',
  'plugin/README.md',
  'plugin/skills/study-feedback/SKILL.md',
  'plugin/skills/study-setup/SKILL.md',
  'plugin/skills/study-coach/SKILL.md',
  'docs/install.md',
  'docs/pilot-guide.md',
];
const esc = prev.replace(/\./g, '\\.');
const patterns = [
  [new RegExp(`"version": "${esc}"`, 'g'), `"version": "${next}"`],
  [new RegExp(`condisco-${esc}\\.zip`, 'g'), `condisco-${next}.zip`],
  [new RegExp(`pluginVersion: "${esc}"`, 'g'), `pluginVersion: "${next}"`],
  [new RegExp(`Condisco ${esc}`, 'g'), `Condisco ${next}`],
];
for (const rel of FILES) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  // package-lock.json: only the two root entries carry the project version.
  if (rel === 'package-lock.json') {
    const lock = JSON.parse(s);
    lock.version = next; if (lock.packages?.['']) lock.packages[''].version = next;
    s = JSON.stringify(lock, null, 2) + '\n';
  } else for (const [re, to] of patterns) s = s.replace(re, to);
  if (s !== before) { fs.writeFileSync(f, s); console.log(`updated ${rel}`); }
}
console.log(`${prev} -> ${next}. Now add a CHANGELOG.md entry.`);
