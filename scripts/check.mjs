// Static checks: every JS module parses, JSON files are valid, the plugin manifest is complete,
// every file listed in the scene and audio manifests exists, shared skill files match their source,
// and every skill description fits the platform limits (≤ 1024 chars, no angle brackets).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drift } from './sync-shared.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  if (['node_modules', 'dist', '.git', 'shots'].includes(e.name)) return [];
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const files = walk(ROOT);

for (const f of files.filter((f) => /\.(m?js)$/.test(f))) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { errors.push(`syntax: ${path.relative(ROOT, f)}\n${e.stderr}`); }
}
for (const f of files.filter((f) => f.endsWith('.json') && !f.endsWith('package-lock.json'))) {
  try { JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { errors.push(`json: ${path.relative(ROOT, f)}: ${e.message}`); }
}

const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugin/.claude-plugin/plugin.json'), 'utf8'));
for (const k of ['name', 'version', 'description', 'license']) if (!plugin[k]) errors.push(`plugin.json: missing "${k}"`);
for (const s of fs.readdirSync(path.join(ROOT, 'plugin/skills'))) {
  const md = path.join(ROOT, 'plugin/skills', s, 'SKILL.md');
  if (!fs.existsSync(md)) { errors.push(`skill ${s}: no SKILL.md`); continue; }
  const head = fs.readFileSync(md, 'utf8').split('\n---')[0];
  if (!/^---/.test(head) || !/\nname:\s*\S/.test(head) || !/\ndescription:\s*\S/.test(head)) errors.push(`skill ${s}: SKILL.md frontmatter needs name and description`);
}

const scenes = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/scenes/manifest.json'), 'utf8'));
const sceneFiles = JSON.stringify(scenes).match(/scenes\/[\w-]+\.js/g) || [];
for (const s of sceneFiles) if (!fs.existsSync(path.join(ROOT, 'app', s))) errors.push(`scene manifest: missing app/${s}`);
const audio = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/audio/manifest.json'), 'utf8'));
const audioFiles = [...(audio.tracks || []).map((t) => t.file), ...Object.values(audio.loops || {})];
for (const a of audioFiles) if (!fs.existsSync(path.join(ROOT, 'app/audio', a))) errors.push(`audio manifest: missing app/audio/${a}`);

for (const d of drift()) errors.push(`shared copy: ${d} (run node scripts/sync-shared.mjs)`);
// design system: generated tokens up to date, CSS takes its values from tokens
for (const [script, args] of [['build-tokens.mjs', ['--check']], ['lint-css.mjs', []]]) {
  try { execFileSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], { stdio: 'pipe' }); }
  catch (e) { errors.push(`${script}: ${String(e.stderr || e.stdout).trim()}`); }
}
for (const s of fs.readdirSync(path.join(ROOT, 'plugin/skills'))) {
  const body = fs.readFileSync(path.join(ROOT, 'plugin/skills', s, 'SKILL.md'), 'utf8');
  const desc = (body.match(/\ndescription:\s*(.*)/) || [])[1] || '';
  if (desc.length > 1024) errors.push(`skill ${s}: description is ${desc.length} chars (max 1024)`);
  if (/[<>]/.test(desc)) errors.push(`skill ${s}: description has < or >`);
  if (body.split('\n').length > 500) errors.push(`skill ${s}: SKILL.md over 500 lines`);
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`check: ${files.filter((f) => /\.m?js$/.test(f)).length} JS files parse, JSON valid, plugin manifest ok, ${sceneFiles.length} scenes and ${audioFiles.length} audio files present.`);
