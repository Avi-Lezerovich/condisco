// Condisco scene host. Plain ES module, no dependencies outside this folder.
// Contract with the app (agreed with the app thread):
//   createSceneHost(container, { manifestUrl, palette, now, swapMs, fadeMs, timers }) -> { start, stop, next, current, hold }
// - swapMs defaults to 25 minutes (one focus block). hold(true) defers swaps (e.g. during focus) and calms the scene;
// - timeAware (default off since 2026-11-26): if true, picks scenes that fit the local time of day.
//   hold(false) releases, and a swap that came due while held happens right then (at the break).
// - Manifest "file" paths are page-relative ("scenes/x.js"); resolved as new URL('../' + file, manifestUrl),
//   which equals page-relative whenever the manifest lives at <page>/scenes/manifest.json.
// - Shuffle-bag order: no repeats until every scene has shown; a new bag never starts with the last scene.
// - Swap every swapMs with a fadeMs crossfade. A scene whose import or draw throws is skipped (warned once).
// - Pauses timers and SMIL motion while document.hidden; resumes with the remaining time.
import { applyMode, hashId, isDark } from './lib.js';
import { makeLiving, injectLiveCss, attachDepth } from './alive.js';
export { attachDepth };

export const VIEW_W = 1600, VIEW_H = 900;
const SVG_NS = 'http://www.w3.org/2000/svg';
const warned = new Set();
const warnOnce = (id, err) => { if (warned.has(id)) return; warned.add(id); console.warn(`[condisco-scenes] skipped "${id}":`, err && err.message || err); };

export const DEFAULT_PALETTES = {
  light: {sky: '#dfe9f0', far: '#a9bccb', mid: '#6f8aa3', near: '#3b5468', accent: '#f0c95a', ink: '#1b2532'},
  dark:  {sky: '#121820', far: '#1f2b38', mid: '#2c3d50', near: '#3d5670', accent: '#e6c25c', ink: '#e2e7ec'}
};

/** Render one scene into a fresh <svg>. Throws if the scene throws. Used by the host and by preview.html. */
export function renderScene(scene, { w = 1440, h = 900, seed, palette = DEFAULT_PALETTES.light, t = 0, doc = document, dim = true } = {}){
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');
  scene.draw(svg, { w, h, seed: seed ?? scene.seed ?? hashId(scene.id), palette, t });
  if (dim) applyMode(svg, palette);
  return svg;
}

/** Render a scene as a living, slowly moving stack of planes (see alive.js). Returns a div. */
export function renderLiving(scene, { w = 1440, h = 900, seed, palette = DEFAULT_PALETTES.light, doc = document, sceneMs = 1500000 } = {}){
  const sd = seed ?? scene.seed ?? hashId(scene.id);
  const svg = renderScene(scene, { w, h, seed: sd, palette, doc, dim: false });
  return makeLiving(svg, scene, { seed: sd, palette, dark: isDark(palette), doc, sceneMs });
}

export async function loadScenes(manifestUrl){
  const base = new URL(manifestUrl, document.baseURI);
  const list = await (await fetch(base)).json();
  const out = await Promise.all(list.map(async ({id, file}) => {
    try { const m = await import(new URL('../' + file, base).href); return m.default; }
    catch (e) { warnOnce(id, e); return null; }
  }));
  return out.filter(Boolean);
}

/** Time of day for a local hour: morning 5–11, day 11–17, evening 17–20, night 20–5. */
export const partOfDay = h => h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night';
const TIME_TAGS = {morning: ['morning'], day: ['day', 'afternoon'], evening: ['evening'], night: ['night']};
/** Indices of scenes that fit this part of the day; scenes with no time tag fit any time. */
export function fitting(scenes, part){
  const all = Object.values(TIME_TAGS).flat();
  const idx = scenes.map((s, i) => [s, i]).filter(([s]) => { const t = (s.tags || []).filter(x => all.includes(x)); return !t.length || t.some(x => TIME_TAGS[part].includes(x)); }).map(([, i]) => i);
  return idx.length >= 3 ? idx : scenes.map((_, i) => i);
}

/** Shuffle bag: every item once per round; next round never starts with the last item. */
export function makeBag(n, random = Math.random){
  let bag = [], last = -1;
  return () => {
    if (!bag.length) { bag = Array.from({length: n}, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (n > 1 && bag[0] === last) [bag[0], bag[1]] = [bag[1], bag[0]]; }
    return (last = bag.shift());
  };
}

export function createSceneHost(container, {
  manifestUrl = 'scenes/manifest.json',
  palette = () => DEFAULT_PALETTES.light,
  now = () => Date.now(),
  swapMs = 1500000,
  sceneMs = swapMs, // length of one scene's slow light/camera arc (the preview demo swaps fast but keeps this slow)
  fadeMs = 4000,
  timers = {setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: id => clearTimeout(id)},
  random = Math.random,
  living = true,
  timeAware = false, // off by default since 2026-11-26; true prefers scenes that match the time of day
  depth = false, // mouse parallax, off by default since 2026-11-26
  scenes: given = null
} = {}){
  let held = false, pending = false, scenes = given, loading = null, pick = null, running = false, timer = 0, dueAt = 0, remaining = 0, cur = null, layer = null;
  const doc = container.ownerDocument;
  const style = doc.createElement('style');
  style.textContent = `.cd-scene{position:absolute;inset:0;opacity:0;transition:opacity ${fadeMs}ms ease;overflow:hidden}.cd-scene.show{opacity:1}.cd-scene>svg{position:absolute;inset:-3%;width:106%;height:106%}
  .cd-scene:not(.cd-living).show svg{animation:cd-drift 70s ease-in-out infinite alternate}.cd-paused .cd-scene svg{animation-play-state:paused}
  @keyframes cd-drift{from{transform:scale(1) translate(0,0)}to{transform:scale(1.06) translate(-1.2%,.8%)}}
  @media(prefers-reduced-motion:reduce){.cd-scene{transition:none}.cd-scene.show svg{animation:none}}`;

  let part = null, bag = null, lastIdx = -1;
  const pickNext = () => {
    if (!timeAware) return bag();
    const p = partOfDay(new Date(now()).getHours());
    if (p !== part) { part = p; const idx = fitting(scenes, p).filter(i => i !== lastIdx || scenes.length < 2); const b = makeBag(idx.length, random); bag = () => idx[b()]; }
    return (lastIdx = bag());
  };
  const ensure = () => loading || (loading = (scenes ? Promise.resolve(scenes) : loadScenes(manifestUrl)).then(s => { scenes = s; bag = makeBag(s.length, random); pick = pickNext; return s; }));

  function show(){
    if (!scenes.length) return;
    const rect = container.getBoundingClientRect();
    for (let tries = 0; tries < scenes.length; tries++) {
      let i = pick(); if (cur && scenes[i] === cur && scenes.length > 1) i = pick();
      const sc = scenes[i];
      let node; const opts = {w: Math.round(rect.width) || 1440, h: Math.round(rect.height) || 900, palette: palette(), t: 0, doc, sceneMs};
      try { node = living ? renderLiving(sc, opts) : renderScene(sc, opts); }
      catch (e) { warnOnce(sc.id, e); continue; }
      const el = doc.createElement('div'); el.className = 'cd-scene' + (living ? ' cd-living' : ''); el.dataset.scene = sc.id; el.appendChild(node);
      container.appendChild(el);
      if (!living && matchMedia('(prefers-reduced-motion: reduce)').matches) node.pauseAnimations?.();
      el.getBoundingClientRect(); el.classList.add('show');
      const old = layer; layer = el; cur = sc;
      if (old) { old.classList.remove('show'); timers.setTimeout(() => old.remove(), fadeMs + 50); }
      return;
    }
  }
  function schedule(ms){ timers.clearTimeout(timer); dueAt = now() + ms; timer = timers.setTimeout(() => { if (!running) return; if (held) { pending = true; return; } show(); schedule(swapMs); }, ms); }
  function onVis(){
    if (!running) return;
    const svgs = container.querySelectorAll('.cd-scene svg');
    if (doc.hidden) { remaining = Math.max(0, dueAt - now()); timers.clearTimeout(timer); container.classList.add('cd-paused'); svgs.forEach(s => s.pauseAnimations?.()); }
    else { container.classList.remove('cd-paused'); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) svgs.forEach(s => s.unpauseAnimations?.()); schedule(remaining); }
  }

  let detachDepth = null;
  return {
    async start(){
      if (running) return; running = true;
      if (!style.isConnected) container.appendChild(style);
      if (living) injectLiveCss(doc, container);
      doc.addEventListener('visibilitychange', onVis);
      if (living && depth && !detachDepth) detachDepth = attachDepth(container, doc);
      await ensure(); if (!running) return;
      show(); schedule(swapMs);
      if (doc.hidden) onVis();
    },
    stop(){
      running = false; timers.clearTimeout(timer); doc.removeEventListener('visibilitychange', onVis);
      if (detachDepth) { detachDepth(); detachDepth = null; }
      container.querySelectorAll('.cd-scene').forEach(el => el.remove()); layer = null; cur = null;
    },
    async next(){ await ensure(); show(); if (running) schedule(swapMs); },
    current(){ return cur ? {id: cur.id, name: cur.name, tags: cur.tags} : null; },
    /** Defer swaps while true (focus); on release, an overdue swap happens immediately. */
    hold(on){ held = !!on; if (!held && pending && running) { pending = false; show(); schedule(swapMs); } }
  };
}
