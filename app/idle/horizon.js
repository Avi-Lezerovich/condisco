// The landscape band at the top of every screen: one scene per day from the same registry as the idle screen,
// drawn static and soft, fading into the page. Light/dark follow the theme. Purely decorative.
import { renderScene } from '../scenes/registry.js';
import { palette } from './idle.js';
import { todayStr } from '../core/util.js';

let list = null, drawnFor = '';
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

async function manifest() {
  if (list) return list;
  try { list = await (await fetch(new URL('scenes/manifest.json', location.href))).json(); } catch (e) { list = []; }
  return list;
}

export async function drawHorizon(box) {
  if (!box) return;
  const day = todayStr(), mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'd' : 'l';
  const key = day + mode + (document.documentElement.dataset.theme || '');
  if (key === drawnFor) return;
  const m = await manifest(); if (!m.length) return;
  // walk from today's pick so a scene that fails to load or draw is skipped
  const start = hash(day) % m.length;
  for (let k = 0; k < m.length; k++) {
    const e = m[(start + k) % m.length];
    try {
      const sc = (await import(new URL(e.file, location.href).href)).default;
      const svg = renderScene(sc, { palette: palette(), seed: hash(day) % 100000 + 1 });
      svg.classList.add('hz-svg');
      box.replaceChildren(svg);
      box.dataset.scene = sc.id; box.title = sc.name || '';
      requestAnimationFrame(() => box.classList.add('ready'));
      drawnFor = key; return;
    } catch (err) { /* try the next one */ }
  }
}

export function watchHorizon(box) {
  drawHorizon(box);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { drawnFor = ''; box.classList.remove('ready'); drawHorizon(box); });
  new MutationObserver(() => { drawnFor = ''; drawHorizon(box); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  setInterval(() => drawHorizon(box), 10 * 60000); // new day, new scene
}
