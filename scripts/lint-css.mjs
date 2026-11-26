// Design-system lint for the app's CSS (part of `npm run check`).
// Outside app/ds/tokens.css and app/ds/palettes.css, CSS must take colours, font sizes and radii from tokens, and use
// logical properties (RTL). Scenes (app/scenes/) and audio are exempt; JS is not scanned.
// Fails on: hex colours, rgb()/rgba()/hsl() outside *shadow / filter declarations, raw px font sizes,
// raw px border radii above 5px, and physical left/right properties (except the safe-area gutter, centred
// `left:50%` and lines marked `/* phys-ok */`).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');
const files = [
  ...fs.readdirSync(path.join(APP, 'css')).filter((f) => f.endsWith('.css')).map((f) => path.join(APP, 'css', f)),
  ...['base.css', 'shell.css', 'components.css'].map((f) => path.join(APP, 'ds', f)),
];
const errors = [];
for (const f of files) {
  const rel = path.relative(ROOT, f);
  const src = fs.readFileSync(f, 'utf8').replace(/\/\*(?! phys-ok)[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  src.split('\n').forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    for (const decl of line.split(/[;{}]/)) {
      const d = decl.trim(); if (!d.includes(':')) continue;
      const prop = d.slice(0, d.indexOf(':')).trim();
      if (/#[0-9a-fA-F]{3,8}\b/.test(d) && !/^--/.test(prop)) errors.push(`${at} raw hex colour in "${d.slice(0, 60)}"`);
      if (/#[0-9a-fA-F]{3,8}\b/.test(d) && /^--/.test(prop) && !rel.startsWith("app/ds/")) errors.push(`${at} colour defined outside app/ds/ ("${prop}"): add a token or move it to app/ds/palettes.css`);
      if (/\b(rgba?|hsla?)\(/.test(d) && !/shadow|filter/.test(prop)) errors.push(`${at} raw rgb/hsl colour in "${d.slice(0, 60)}"`);
      if (/^font-size$/.test(prop) && /^\d+(\.\d+)?px/.test(d.slice(d.indexOf(':') + 1).trim())) errors.push(`${at} raw font-size "${d}": use var(--fs-*)`);
      const r = /^border-radius$/.test(prop) && /^(\d+(?:\.\d+)?)px\s*$/.exec(d.slice(d.indexOf(':') + 1).trim());
      if (r && +r[1] > 5) errors.push(`${at} raw border-radius "${d}": use var(--radius-*)`);
      if (/^(margin|padding)-(left|right)$/.test(prop) && !/safe-area-inset-(left|right)/.test(d) && !line.includes('phys-ok')) errors.push(`${at} physical "${prop}": use ${prop.replace('left', 'inline-start').replace('right', 'inline-end')}`);
      if (/^(left|right)$/.test(prop) && !/^(left|right):\s*(50%|calc\(50%)/.test(d) && !line.includes('phys-ok')) errors.push(`${at} physical "${prop}": use inset-inline-*`);
    }
  });
}
if (errors.length) { console.error(errors.join('\n') + `\n${errors.length} design-system lint errors`); process.exit(1); }
console.log(`css lint: ${files.length} files clean`);
