// Copies the shared skill files into every skill that uses them, so the copies can never drift.
// Sources: kit/template.html, kit/visual-kit.md, app/SCHEMA.md-derived plugin/skills/study-setup/references/schema.md,
// and plugin/skills/study-sync/references/moodle.md. `npm run check` fails when a copy differs.
// Usage: node scripts/sync-shared.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SK = (s, f) => `plugin/skills/${s}/${f}`;
export const SHARED = [
  { from: 'kit/template.html', to: ['study-summary', 'study-teach'].map((s) => SK(s, 'assets/template.html')) },
  { from: 'kit/visual-kit.md', to: ['study-summary', 'study-teach'].map((s) => SK(s, 'references/visual-kit.md')) },
  { from: SK('study-setup', 'references/schema.md'), to: ['study-coach', 'exam-mode', 'study-materials', 'study-sync', 'study-session', 'study-profile', 'study-summary', 'study-teach'].map((s) => SK(s, 'references/schema.md')) },
  { from: SK('study-sync', 'references/moodle.md'), to: [SK('study-setup', 'references/moodle.md')] },
];

export function drift() {
  const out = [];
  for (const { from, to } of SHARED) {
    const src = fs.readFileSync(path.join(ROOT, from));
    for (const t of to) { const p = path.join(ROOT, t); if (!fs.existsSync(p) || !src.equals(fs.readFileSync(p))) out.push(`${t} differs from ${from}`); }
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) { const d = drift(); if (d.length) { console.error(d.join('\n')); process.exit(1); } console.log('shared copies in sync'); }
  else for (const { from, to } of SHARED) for (const t of to) { fs.mkdirSync(path.dirname(path.join(ROOT, t)), { recursive: true }); fs.copyFileSync(path.join(ROOT, from), path.join(ROOT, t)); console.log(`${from} -> ${t}`); }
}
