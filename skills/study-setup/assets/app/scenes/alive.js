// Condisco "living" scenes: turns a drawn scene SVG into stacked planes that move like a slow aerial shot.
// Every plane is its own <svg> inside a <div>; all motion is CSS transform/opacity on those elements,
// so the browser rasterizes each plane once and the GPU only composites it (light on CPU and battery).
// Motion vocabulary (all cycles ≥ 12 s, nothing flashes):
//   camera  – the whole stack pushes in and pans slowly over the scene (25 minutes by default, one focus block)
//   parallax– landscape planes sway sideways, nearer planes further, so depth reads like moving through space
//   sun     – rises (morning), sets (evening) or hangs, with a slow breathing glow
//   mist    – fog bands drift sideways and breathe
//   clouds  – drift across the sky; aurora ribbons sway
//   stars   – two star sets crossfade (gentle twinkle); water glints do the same and slide a little
//   particles – snow / rain / pollen layers drift
//   life    – per-scene creatures and weather from life.js: herons, circling eagles and storks, crane V's, gulls,
//             swallows, fireflies, falling leaves/petals/snow/rain, ripples, cloud shadows, sand wisps, light rays,
//             shooting stars, a distant sail, beach foam, stars appearing at dusk
import { hashId, rng } from './lib.js';
import { lifeFor, FX } from './life.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const isWhite = f => /^#(fff|ffffff|f3ead0|eef1fb|e6ecfb)$/i.test(f || '');
const num = (el, a) => parseFloat(el.getAttribute(a) || '0');

function kindOf(el){
  const tag = el.tagName.toLowerCase(), fill = el.getAttribute('fill') || '';
  if (tag === 'defs') return 'defs';
  if (tag === 'rect') {
    const w = num(el, 'width'), h = num(el, 'height');
    if (w >= 1600 && h >= 900) return 'sky';
    if (h <= 2.6) return 'glint';
    if (fill.startsWith('url(') && w >= 1600 && h <= 200) return 'mist';
    return 'land';
  }
  if (tag === 'circle') {
    const r = num(el, 'r');
    if (fill.startsWith('url(')) return 'sun';
    if (r <= 2.6 && isWhite(fill) && num(el, 'cy') < 700) return 'star';
    if (r >= 30) return 'sun';
    return 'land';
  }
  if (tag === 'path' && el.getAttribute('filter')) return 'cloud';
  if (tag === 'g') {
    if (el.getAttribute('filter') || el.querySelector('[filter]')) return 'cloud';
    const kids = [...el.children];
    if (kids.length && kids.every(k => k.tagName === 'rect' && num(k, 'height') <= 2.6)) return 'glint';
    if (kids.length === 1 && kids[0].tagName === 'rect' && (kids[0].getAttribute('fill') || '').startsWith('url(') && num(kids[0], 'height') <= 200) return 'mist';
    if (kids.length > 20 && kids.every(k => k.tagName === 'circle' ? num(k, 'r') <= 3.2 : k.tagName === 'path' && !k.getAttribute('fill'))) return 'particles';
  }
  return 'land';
}
const isLayerEdge = el => { const t = el.tagName; if (t === 'rect') return num(el, 'width') >= 1600; if (t === 'path') return /1600[ ,](900|\d{3})/.test(el.getAttribute('d') || '') && !!el.getAttribute('fill') && el.getAttribute('fill') !== 'none'; return false; };

/** Split a drawn scene SVG into ordered planes: [{kind, nodes, depth}]. Pure DOM, no layout needed. */
export function planesOf(svg, maxLand = 5){
  svg.querySelectorAll('animate,animateTransform,animateMotion').forEach(a => a.remove());
  // parts drawn only for the still picture (e.g. rain streaks that life.js animates instead) are left out of the living scene
  svg.querySelectorAll('[data-live="off"]').forEach(el => el.remove());
  const planes = [];
  let defs = null;
  for (const el of [...svg.children]) {
    let k = kindOf(el);
    if (k === 'defs') { defs = el; continue; }
    if (k === 'sky') k = planes.length ? 'land' : 'sky';
    const last = planes[planes.length - 1];
    if (last && last.kind === k) last.nodes.push(el); else planes.push({kind: k, nodes: [el]});
  }
  // A land run that holds several full-width layers is cut at each layer, then neighbours are merged
  // back so the scene has at most maxLand landscape planes (GPU memory stays bounded).
  const out = [];
  for (const p of planes) {
    if (p.kind !== 'land') { out.push(p); continue; }
    let cur = null;
    for (const el of p.nodes) { if (!cur || isLayerEdge(el) && cur.nodes.some(isLayerEdge)) { cur = {kind: 'land', nodes: []}; out.push(cur); } cur.nodes.push(el); }
  }
  let lands = out.filter(p => p.kind === 'land');
  while (lands.length > maxLand) {
    let best = -1, bestSize = Infinity;
    for (let i = 0; i < out.length - 1; i++) if (out[i].kind === 'land' && out[i + 1].kind === 'land') { const s = out[i].nodes.length + out[i + 1].nodes.length; if (s < bestSize) { bestSize = s; best = i; } }
    if (best < 0) break;
    out[best].nodes.push(...out[best + 1].nodes); out.splice(best + 1, 1);
    lands = out.filter(p => p.kind === 'land');
  }
  lands.forEach((p, i) => { p.depth = lands.length > 1 ? i / (lands.length - 1) : 1; });
  return {defs, planes: out};
}

const CSS = `
.cd-live{position:absolute;inset:0;overflow:hidden;contain:strict}
.cd-cam{position:absolute;inset:0;will-change:transform;animation:cd-cam var(--scene-dur,1500s) cubic-bezier(.33,0,.4,1) forwards;transform-origin:var(--cam-o,50% 55%)}
.cd-gl{position:absolute;inset:0;will-change:transform;transform-origin:50% 64%;animation:cd-glide var(--gd,80s) cubic-bezier(.45,0,.55,1) var(--gp,0s) infinite alternate}
.cd-pl{position:absolute;inset:-7%;will-change:transform,translate;transition:translate 1.8s cubic-bezier(.2,.6,.3,1)}
.cd-pl>svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.cd-pl.k-land{animation:cd-sway var(--dur,150s) ease-in-out var(--delay,0s) infinite alternate}
.cd-pl.k-sun{animation:cd-sun var(--scene-dur,1500s) cubic-bezier(.3,0,.5,1) forwards}
.cd-pl.k-sun>svg{will-change:transform,opacity;transform-origin:var(--sun-o,50% 50%);animation:cd-glow 16s ease-in-out infinite alternate}
.cd-pl.k-mist{animation:cd-drift var(--dur,200s) ease-in-out var(--delay,0s) infinite alternate}
.cd-pl.k-mist>svg{will-change:opacity;animation:cd-breathe 22s ease-in-out var(--delay,0s) infinite alternate}
.cd-pl.k-cloud{animation:cd-drift var(--dur,260s) ease-in-out var(--delay,0s) infinite alternate}
.cd-pl.k-star>svg,.cd-pl.k-glint>svg{will-change:opacity;animation:cd-twinkle var(--tw,9s) ease-in-out var(--delay,0s) infinite alternate}
.cd-pl.k-glint{animation:cd-sway 14s ease-in-out infinite alternate;--amp:.5%}
.cd-pl.k-particles{animation:cd-fall var(--dur,40s) ease-in-out infinite alternate}
.cd-pl.f-pass{animation:cd-birds var(--dur,260s) linear var(--delay,0s) infinite}
.cd-pl.f-pass>svg{animation:cd-bob 18s ease-in-out infinite alternate}
.cd-pl.f-orbit{animation:cd-ox var(--dur,25s) ease-in-out var(--delay,0s) infinite alternate}
.cd-pl.f-orbit>svg{animation:cd-oy var(--dur,25s) ease-in-out calc(var(--delay,0s) - var(--dur,25s) / 2) infinite alternate}
.cd-pl.f-fall{inset:auto;left:-7%;right:-7%;top:-121%;height:228%;animation:cd-tilefall var(--dur,60s) linear var(--delay,0s) infinite}
.cd-fallin{position:absolute;left:0;right:0;top:-100%;height:200%;animation:cd-tilefall var(--dur,60s) linear var(--delay,0s) infinite}
.cd-fallin>svg{position:absolute;inset:0;width:100%;height:100%}
.cd-pl.f-fall>svg{animation:cd-sway var(--swd,9s) ease-in-out infinite alternate;--amp:var(--sway,1.5%)}
.cd-pl.f-glow{animation:cd-fall var(--dur,34s) ease-in-out var(--delay,0s) infinite alternate}
.cd-pl.f-glow>svg,.cd-pl.f-rays>svg{will-change:opacity;animation:cd-twinkle var(--tw,8s) ease-in-out var(--delay,0s) infinite alternate}
.cd-pl.f-sweep{animation:cd-drift var(--dur,160s) ease-in-out var(--delay,0s) infinite alternate}
.cd-pl.f-wisp{animation:cd-drift var(--dur,70s) ease-in-out var(--delay,0s) infinite alternate;--amp:4%}
.cd-pl.f-wisp>svg{animation:cd-twinkle 9s ease-in-out var(--delay,0s) infinite alternate;--o0:.15}
.cd-pl.f-meteor{opacity:0;animation:cd-meteor var(--dur,75s) linear var(--delay,0s) infinite}
.cd-pl.f-creep{animation:cd-sway var(--dur,600s) ease-in-out infinite alternate}
.cd-pl.f-foam{animation:cd-foam var(--dur,10s) ease-in-out infinite alternate}
.cd-pl.f-foam>svg{animation:cd-twinkle var(--dur,10s) ease-in-out infinite alternate;--o0:.45}
.cd-pl.k-star.fadein{animation:cd-fadein var(--scene-dur,1500s) ease-in forwards}
.cd-box{position:absolute;aspect-ratio:1;transform:translate(-50%,-50%) scale(.3);opacity:0;will-change:transform,opacity;animation:cd-ripple var(--dur,11s) ease-out var(--delay,0s) infinite}
.cd-box>svg{width:100%;height:100%;display:block;overflow:visible}
.cd-pl.k-sunrays{transform-origin:var(--orig,50% 50%);animation:cd-turn 90s ease-in-out infinite alternate}
.cd-pl.k-sunrays>svg{animation:cd-twinkle 19s ease-in-out infinite alternate;--o0:.55}
.cd-pl.k-halo{mix-blend-mode:screen}
.cd-pl.k-pillar{mix-blend-mode:screen;animation:cd-sway 17s ease-in-out infinite alternate;--amp:.25%}
.cd-pl.k-pillar>svg{will-change:opacity;animation:cd-twinkle 7.5s ease-in-out infinite alternate}
.cd-pl.k-fore{transform-origin:50% 100%;animation:cd-sway var(--dur,13s) ease-in-out infinite alternate}
.cd-pl.k-halo>svg{animation:cd-twinkle 23s ease-in-out infinite alternate;--o0:.7}
.cd-arc{position:absolute;inset:0;pointer-events:none;opacity:0;animation:cd-arc var(--scene-dur,1500s) ease-in-out forwards}
.cd-grain{position:absolute;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:overlay}
.cd-grain svg{display:block}
.cd-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 95% at 50% 45%,transparent 60%,rgba(12,16,28,.22) 100%)}
.cd-dim{position:absolute;inset:0;pointer-events:none}
@keyframes cd-cam{from{transform:scale(1) translate(0,0)}to{transform:scale(var(--cam-s,1.1)) translate(var(--cam-x,-1.5%),var(--cam-y,.8%))}}
@keyframes cd-glide{from{transform:translate(calc(var(--gx,0%) * -1),calc(var(--gy,0%) * -1)) scale(1)}to{transform:translate(var(--gx,0%),var(--gy,0%)) scale(var(--gs,1))}}
@keyframes cd-sway{from{transform:translateX(calc(var(--amp,1%) * -1))}to{transform:translateX(var(--amp,1%))}}
@keyframes cd-drift{from{transform:translateX(calc(var(--amp,3%) * -1))}to{transform:translateX(var(--amp,3%))}}
@keyframes cd-sun{from{transform:translateY(0)}to{transform:translateY(var(--rise,-2%))}}
@keyframes cd-glow{from{transform:scale(1);opacity:.92}to{transform:scale(1.035);opacity:1}}
@keyframes cd-breathe{from{opacity:var(--o0,.7)}to{opacity:1}}
@keyframes cd-twinkle{from{opacity:var(--o0,.35)}to{opacity:1}}
@keyframes cd-birds{0%{transform:translateX(calc(var(--dir,1) * -75%))}42%{transform:translateX(calc(var(--dir,1) * 75%))}100%{transform:translateX(calc(var(--dir,1) * 75%))}}
@keyframes cd-bob{from{transform:translateY(-1.2%)}to{transform:translateY(1.2%)}}
@keyframes cd-ox{from{transform:translateX(calc(var(--rx,6%) * -1))}to{transform:translateX(var(--rx,6%))}}
@keyframes cd-oy{from{transform:translateY(calc(var(--ry,2%) * -1))}to{transform:translateY(var(--ry,2%))}}
@keyframes cd-tilefall{from{transform:translateY(0)}to{transform:translateY(50%)}}
@keyframes cd-meteor{0%{opacity:0;transform:translate(0,0)}1%{opacity:1}3.5%{opacity:0;transform:translate(-9%,4%)}100%{opacity:0;transform:translate(-9%,4%)}}
@keyframes cd-foam{from{transform:translateY(-.5%)}to{transform:translateY(.6%)}}
@keyframes cd-fadein{from{opacity:.08}to{opacity:1}}
@keyframes cd-ripple{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}12%{opacity:.9}100%{transform:translate(-50%,-50%) scale(1.7);opacity:0}}
@keyframes cd-turn{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
@keyframes cd-arc{from{opacity:0}to{opacity:var(--to,.15)}}
@keyframes cd-fall{from{transform:translate(-.6%,-1.2%)}to{transform:translate(.6%,1.2%)}}
.cd-paused .cd-live,.cd-paused .cd-live *{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){.cd-live,.cd-live *{animation:none!important}.cd-pl{translate:none!important}.cd-arc{opacity:calc(var(--to,.15) * .5)}}`;

export function injectLiveCss(doc, into){ if (into.querySelector(':scope > style[data-cd-live]')) return; const s = doc.createElement('style'); s.dataset.cdLive = ''; s.textContent = CSS; into.appendChild(s); }

const plainSvg = doc => { const s = doc.createElementNS(SVG_NS, 'svg'); s.setAttribute('viewBox', '0 0 1600 900'); s.setAttribute('preserveAspectRatio', 'xMidYMid slice'); s.setAttribute('aria-hidden', 'true'); return s; };

/** Build the living version of a drawn scene. Returns a div (class cd-live) to place in a positioned box. */
export function makeLiving(svg, scene, {seed, palette, dark, doc = document, sceneMs = 1500000} = {}){
  const r = rng((seed ?? hashId(scene.id)) + 7);
  const tags = scene.tags || [];
  const {defs, planes} = planesOf(svg);
  const live = doc.createElement('div'); live.className = 'cd-live'; live.style.setProperty('--scene-dur', Math.round(sceneMs / 1000) + 's');
  const cam = doc.createElement('div'); cam.className = 'cd-cam';
  // Camera path: slow push-in toward a point near the horizon, chosen per scene.
  const ox = 30 + r() * 40, oy = 45 + r() * 20;
  cam.style.cssText = `--cam-o:${ox.toFixed(0)}% ${oy.toFixed(0)}%;--cam-s:${(1.07 + r() * .05).toFixed(3)};--cam-x:${((r() - .5) * 3).toFixed(2)}%;--cam-y:${((r() - .5) * 1.6).toFixed(2)}%`;
  live.appendChild(cam);
  const rise = tags.includes('morning') ? -5 : tags.includes('evening') ? 4.5 : tags.includes('night') ? -1 : -1.2;
  const swayDir = r() < .5 ? -1 : 1, swayDur = 130 + r() * 60;
  let first = true, sun = null, waterTop = 1e9;
  // Light around the sun: slow-turning soft rays behind the land, and a wide horizon glow that breathes.
  const atmosphere = () => {
    const warm = /^#/.test(sun.col || '') ? sun.col : '#fff0cf', night = tags.includes('night');
    if (!night) {
      const id = 'ry' + Math.floor(r() * 1e9).toString(36), n = 9, rays = Array.from({length: n}, (_, i) => { const a = (i / n) * Math.PI * 2 + r() * .3, w = .05 + r() * .06, L = 1400;
        return `<path d="M${sun.x} ${sun.y} L${(sun.x + Math.cos(a - w) * L).toFixed(0)} ${(sun.y + Math.sin(a - w) * L).toFixed(0)} L${(sun.x + Math.cos(a + w) * L).toFixed(0)} ${(sun.y + Math.sin(a + w) * L).toFixed(0)} Z" fill="${warm}" opacity="${(0.035 + r() * 0.045).toFixed(3)}"/>`; }).join('');
      const pl = add('sunrays', [], `--orig:${(sun.x / 16).toFixed(1)}% ${(sun.y / 9).toFixed(1)}%`);
      pl.firstChild.innerHTML = `<defs><filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14"/></filter></defs><g filter="url(#${id})">${rays}</g>`;
    }
    const hz = add('halo', []), gid = 'hz' + Math.floor(r() * 1e9).toString(36);
    hz.firstChild.innerHTML = `<defs><radialGradient id="${gid}" cx="${sun.x}" cy="${sun.y}" r="900" gradientUnits="userSpaceOnUse" gradientTransform="translate(${sun.x} ${sun.y}) scale(1 .32) translate(${-sun.x} ${-sun.y})"><stop offset="0" stop-color="${warm}" stop-opacity="${night ? .18 : .42}"/><stop offset=".45" stop-color="${warm}" stop-opacity="${night ? .06 : .14}"/><stop offset="1" stop-color="${warm}" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="900" fill="url(#${gid})"/>`;
  };
  // Richer detail, rendered once per plane: fine texture (rock strata in desert and cliffs, soft grain on green land)
  // a soft band of haze below each far ridge line (aerial depth), and, when the sun is low, a thin warm rim on ridge tops.
  const rocky = tags.some(t => ['desert', 'cliffs', 'rocks'].includes(t)), abstract = tags.includes('abstract'), nightT = tags.includes('night');
  const lowSun = tags.some(t => ['morning', 'evening', 'afternoon'].includes(t));
  const wet = tags.some(t => ['water', 'sea'].includes(t));
  const p0 = pl => { const n = pl.firstChild.querySelector(':scope > rect'); return !!n && num(n, 'width') >= 1600 && num(n, 'y') > 0; };
  const detail = (pl, depth) => {
    if (abstract) return;
    // water bodies are full-width rects in wet scenes: leave them smooth (glints and the light pillar do the work)
    if (wet && p0(pl)) return;
    const sv = pl.firstChild, kids = [...sv.childNodes].filter(n => n.nodeType === 1 && n.tagName.toLowerCase() !== 'defs'); if (!kids.length) return;
    const id = 'tx' + Math.floor(r() * 1e9).toString(36), seedN = Math.floor(r() * 999);
    const bf = rocky ? `${(0.0035 + depth * .004).toFixed(4)} ${(0.05 + depth * .05).toFixed(3)}` : `${(0.009 + depth * .008).toFixed(4)}`;
    const k = (rocky ? .17 : .1) * (nightT ? .6 : 1) * (rocky ? .6 + .4 * depth : 1 - .35 * depth);
    const hazeCol = nightT ? '#a9b8dc' : lowSun && sun && /^#/.test(sun.col || '') ? sun.col : '#f2f5f8', haze = depth < .99 ? (nightT ? .1 : .2) * (1 - depth * .7) : 0;
    const rimCol = sun && /^#/.test(sun.col || '') ? sun.col : '#ffe2b0', rim = 0; // a thin ridge rim read as an outline in tests, so it is off
    const f = `<filter id="${id}" x="0" y="-2%" width="100%" height="104%" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="${bf}" numOctaves="${rocky ? 4 : 3}" seed="${seedN}" result="n"/>` +
      `<feColorMatrix in="n" values="0 0 0 0 ${rocky ? 0 : 1}  0 0 0 0 ${rocky ? 0 : .97}  0 0 0 0 ${rocky ? 0 : .88}  0 0 0 ${(k * 2.4).toFixed(3)} ${(-k * .9).toFixed(3)}" result="nd"/>` +
      `<feComposite in="nd" in2="SourceAlpha" operator="in" result="tex"/>` +
      (haze ? `<feOffset in="SourceAlpha" dy="70" result="hs"/><feComposite in="SourceAlpha" in2="hs" operator="out" result="hb"/><feGaussianBlur in="hb" stdDeviation="0 26" result="hbb"/>` +
        `<feFlood flood-color="${hazeCol}" flood-opacity="${haze.toFixed(2)}"/><feComposite in2="hbb" operator="in" result="hz"/><feComposite in="hz" in2="SourceAlpha" operator="in" result="hzIn"/>` : '') +
      (rim ? `<feOffset in="SourceAlpha" dy="4" result="sh"/><feComposite in="SourceAlpha" in2="sh" operator="out" result="edge"/><feGaussianBlur in="edge" stdDeviation="1.2" result="eb"/>` +
        `<feFlood flood-color="${rimCol}" flood-opacity="${rim.toFixed(2)}"/><feComposite in2="eb" operator="in" result="rim"/><feComposite in="rim" in2="SourceAlpha" operator="in" result="rimIn"/>` : '') +
      `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="tex"/>${haze ? '<feMergeNode in="hzIn"/>' : ''}${rim ? '<feMergeNode in="rimIn"/>' : ''}</feMerge></filter>`;
    const g = doc.createElementNS(SVG_NS, 'g'); g.setAttribute('filter', `url(#${id})`); kids.forEach(n => g.appendChild(n));
    const d = doc.createElementNS(SVG_NS, 'defs'); d.innerHTML = f; sv.append(d, g);
  };
  const add = (kind, nodes, style = '', defsHere = false) => {
    const pl = doc.createElement('div'); pl.className = 'cd-pl k-' + kind; if (style) pl.style.cssText = style;
    const s = plainSvg(doc); if (defsHere && defs) s.appendChild(defs);
    nodes.forEach(n => s.appendChild(n)); pl.appendChild(s); cam.appendChild(pl); return pl;
  };
  for (const p of planes) {
    const defsHere = first; first = false;
    switch (p.kind) {
      case 'sky': add('sky', p.nodes, '', defsHere); break;
      case 'land': { const amp = (0.15 + 0.6 * Math.pow(p.depth, 1.3)) * swayDir; const pl = add('land', p.nodes, `--amp:${amp.toFixed(2)}%;--dur:${swayDur.toFixed(0)}s`, defsHere); pl.dataset.d = p.depth.toFixed(2); detail(pl, p.depth); break; }
      case 'sun': { const c = p.nodes.find(n => n.tagName === 'circle'); const sx = c ? num(c, 'cx') / 16 : 50, sy = c ? num(c, 'cy') / 9 : 50;
        add('sun', p.nodes, `--rise:${rise}%;--sun-o:${sx.toFixed(1)}% ${sy.toFixed(1)}%`, defsHere);
        if (c && !sun) { sun = {x: num(c, 'cx'), y: num(c, 'cy'), col: (p.nodes.filter(n => n.tagName === 'circle' && !(n.getAttribute('fill') || '').startsWith('url(')).pop() || c).getAttribute('fill')}; atmosphere(); }
        break; }
      case 'mist': add('mist', p.nodes, `--amp:${(2 + r() * 3).toFixed(1)}%;--dur:${(150 + r() * 100).toFixed(0)}s;--delay:${(-r() * 120).toFixed(0)}s`, defsHere); break;
      case 'cloud': add('cloud', p.nodes, `--amp:${(2.5 + r() * 2.5).toFixed(1)}%;--dur:${(220 + r() * 120).toFixed(0)}s;--delay:${(-r() * 120).toFixed(0)}s`, defsHere); break;
      case 'particles': add('particles', p.nodes, `--dur:${(30 + r() * 20).toFixed(0)}s`, defsHere); break;
      case 'star': case 'glint': {
        // Split into two interleaved sets that crossfade at different rates: a slow twinkle / shimmer.
        const nodes = p.nodes.length === 1 && p.nodes[0].tagName === 'g' ? [...p.nodes[0].children] : p.nodes;
        if (p.kind === 'glint') nodes.forEach(n => { const y = num(n, 'y'); if (y > 0) waterTop = Math.min(waterTop, y); });
        const a = nodes.filter((_, i) => i % 2 === 0), b = nodes.filter((_, i) => i % 2 === 1);
        const tw = p.kind === 'star' ? 11 : 7;
        add(p.kind, a, `--tw:${tw}s;--o0:${p.kind === 'star' ? .45 : .3}`, defsHere);
        if (b.length) add(p.kind, b, `--tw:${(tw * 1.37).toFixed(1)}s;--delay:-${(tw * .6).toFixed(1)}s;--o0:${p.kind === 'star' ? .45 : .3}`);
        break; }
      default: add('land', p.nodes, '', defsHere);
    }
  }
  if (first && defs) add('sky', [], '', true);
  // Generated morning mist for calm daytime terrain scenes that have no mist of their own.
  if (!planes.some(p => p.kind === 'mist') && !tags.includes('night') && !tags.includes('abstract') && (tags.some(t => ['morning', 'hills', 'forest', 'water', 'mountains', 'winter'].includes(t)))) {
    const id = 'cdm' + Math.floor(r() * 1e9).toString(36);
    const s = `<defs><filter id="${id}" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="28"/></filter></defs>` +
      Array.from({length: 5}, () => `<ellipse cx="${(r() * 1800 - 100).toFixed(0)}" cy="${(560 + r() * 220).toFixed(0)}" rx="${(260 + r() * 300).toFixed(0)}" ry="${(22 + r() * 22).toFixed(0)}" fill="#ffffff" opacity="${(0.18 + r() * 0.16).toFixed(2)}" filter="url(#${id})"/>`).join('');
    const pl = add('mist', [], `--amp:${(3 + r() * 2).toFixed(1)}%;--dur:${(170 + r() * 80).toFixed(0)}s;--delay:${(-r() * 100).toFixed(0)}s;--o0:.55`);
    pl.firstChild.insertAdjacentHTML('beforeend', s);
    // keep it under the nearest landscape plane so fog sits in the valleys
    const lands = cam.querySelectorAll('.k-land'); if (lands.length > 1) cam.insertBefore(pl, lands[lands.length - 1]);
  }
  // Life: creatures and weather chosen per scene (life.js).
  const life = lifeFor(scene);
  if (life.some(e => e.fx === 'starsFadeIn')) cam.querySelectorAll('.k-star').forEach(el => el.classList.add('fadein'));
  const lands = [...cam.querySelectorAll('.k-land')];
  const behindNear = lands.length > 2 ? lands[lands.length - 1] : null, afterFar = lands[0] ? lands[0].nextSibling : null;
  for (const e of life) {
    const make = FX[e.fx]; if (!make) continue;
    for (const it of make(r, e)) {
      const pl = doc.createElement('div'); pl.className = 'cd-pl k-life f-' + it.cls; if (it.style) pl.style.cssText = it.style;
      if (it.box) {
        const [x, y, w] = it.box; pl.className = 'cd-pl k-life f-boxes';
        const bx = doc.createElement('div'); bx.className = 'cd-box f-' + it.cls; bx.style.cssText = (it.style || '') + `;left:${(x / 16).toFixed(2)}%;top:${(y / 9).toFixed(2)}%;width:${(w / 16).toFixed(2)}%`;
        bx.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${it.svg}</svg>`; pl.style.cssText = ''; pl.appendChild(bx);
      } else {
        const sv = plainSvg(doc); if (it.vb) sv.setAttribute('viewBox', `0 0 1600 ${it.vb}`); sv.innerHTML = it.svg;
        if (it.clip) { // a still window (e.g. the waterfall) that the looping layer falls through
          const [x0, y0, x1, y1] = it.clip, mv = doc.createElement('div'); mv.className = 'cd-fallin'; mv.style.cssText = it.style || '';
          pl.className = 'cd-pl k-life f-window'; pl.style.cssText = `clip-path:inset(${(y0 / 9 / 1.14 + 6.14).toFixed(2)}% ${((1600 - x1) / 16 / 1.14 + 6.14).toFixed(2)}% ${((900 - y1) / 9 / 1.14 + 6.14).toFixed(2)}% ${(x0 / 16 / 1.14 + 6.14).toFixed(2)}%)`;
          mv.appendChild(sv); pl.appendChild(mv);
        } else pl.appendChild(sv);
      }
      const low = ['ripple', 'foam', 'shadows', 'sweep', 'wisp'].includes(it.cls) && !['veil'].includes(e.fx);
      if (it.box || (low && behindNear)) cam.insertBefore(pl, behindNear || null);
      else if (it.cls === 'pass' && e.fx === 'flock' && afterFar) cam.insertBefore(pl, afterFar);
      else cam.appendChild(pl);
    }
  }
  // Water reflection: a soft column of light under the sun or moon, breathing slowly (screen blend).
  if (sun && wet && waterTop < 900 && sun.y < waterTop && (waterTop - sun.y < 260 || nightT) && !abstract) {
    const id = 'pi' + Math.floor(r() * 1e9).toString(36), col = /^#/.test(sun.col || '') ? sun.col : '#fff0cf', x = sun.x, y0 = waterTop - 4;
    const w0 = 34, w1 = 150 + (900 - y0) * .25, night = nightT;
    const pl = add('pillar', [], `--o0:.6`);
    pl.firstChild.innerHTML = `<defs><linearGradient id="${id}g" x1="0" y1="${y0}" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col}" stop-opacity="${night ? .55 : .6}"/><stop offset=".55" stop-color="${col}" stop-opacity="${night ? .22 : .25}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>` +
      `<filter id="${id}f" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="16 5"/></filter></defs>` +
      `<path d="M${x - w0} ${y0} L${x + w0} ${y0} L${x + w1} 900 L${x - w1} 900 Z" fill="url(#${id}g)" filter="url(#${id}f)"/>` +
      Array.from({length: 18}, (_, i) => { const t = (i + r() * .6) / 18, y = y0 + 8 + t * (900 - y0 - 8), hw = (w0 + (w1 - w0) * t) * (.35 + r() * .6);
        return `<rect x="${(x - hw + (r() - .5) * 30).toFixed(0)}" y="${y.toFixed(0)}" width="${(hw * 2).toFixed(0)}" height="${(1.6 + t * 2.2).toFixed(1)}" rx="1.5" fill="${col}" opacity="${((night ? .5 : .55) * (1 - t * .8)).toFixed(2)}"/>`; }).join('');
    const firstGlint = cam.querySelector('.k-glint'); if (firstGlint) cam.insertBefore(pl, firstGlint);
  }
  // Foreground: a soft, out-of-focus fringe of grass or stones along the bottom edge, swaying slowly (land scenes only).
  if (!abstract && !tags.some(t => ['water', 'sea', 'sky', 'coast', 'mist', 'snow', 'winter', 'mountains'].includes(t)) && tags.some(t => ['hills', 'fields', 'forest', 'spring', 'trees', 'desert'].includes(t))) {
    const lastLand = [...cam.querySelectorAll('.k-land')].pop(), fills = lastLand ? [...lastLand.querySelectorAll('[fill]')].map(n => n.getAttribute('fill')).filter(f => /^#[0-9a-f]{6}$/i.test(f)) : [];
    const base = fills[0] || '#2c3a2c', dk = h => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * (nightT ? .7 : .78)).toString(16).padStart(2, '0')).join('');
    const c = dk(base), dry = tags.includes('desert'), id = 'fg' + Math.floor(r() * 1e9).toString(36);
    let g = '';
    if (dry) {
      for (let i = 0; i < 7; i++) { const x = r() * 1600, rw = 30 + r() * 70; g += `<ellipse cx="${x.toFixed(0)}" cy="${(868 - r() * 10).toFixed(0)}" rx="${rw.toFixed(0)}" ry="${(rw * (.35 + r() * .2)).toFixed(0)}" fill="${c}"/>`; }
      for (let i = 0; i < 60; i++) { const x = r() * 1600, h = 18 + r() * 40, b = (r() - .5) * 20; g += `<path d="M${x.toFixed(0)} 866 q${(b / 2).toFixed(1)} ${(-h / 2).toFixed(0)} ${b.toFixed(1)} ${(-h).toFixed(0)}" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`; }
    } else {
      for (let i = 0; i < 260; i++) { const x = r() * 1640 - 20, h = 30 + Math.pow(r(), 1.6) * 90, b = (r() - .5) * 40, w = 3.5 + r() * 4;
        g += `<path d="M${(x - w).toFixed(0)} 904 L${(x - w).toFixed(0)} 866 Q${(x + b * .4).toFixed(0)} ${(866 - h * .6).toFixed(0)} ${(x + b).toFixed(0)} ${(866 - h).toFixed(0)} Q${(x + b * .3 + w * .4).toFixed(0)} ${(866 - h * .5).toFixed(0)} ${(x + w).toFixed(0)} 866 L${(x + w).toFixed(0)} 904 Z" fill="${c}"/>`; }
    }
    const pl = add('fore', [], `--amp:.6%;--dur:${(11 + r() * 5).toFixed(1)}s`);
    pl.firstChild.innerHTML = `<defs><filter id="${id}" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="${dry ? 2.2 : 2.6}"/></filter></defs><g filter="url(#${id})" opacity="${nightT ? .95 : .9}">${g}</g>`;
  }
  // Mouse depth: each plane gets data-pd (0 far .. 1 near); attachDepth() sets its translate so nearer layers shift more.
  { let pd = .1; const fixed = {fore: 1, pillar: .9, sky: 0, star: .02, sun: .04, halo: .04, sunrays: .04, cloud: .12};
    for (const el of cam.children) { const k = (el.className.match(/k-(\w+)/) || [])[1];
      if (k in fixed) { el.dataset.pd = fixed[k]; continue; }
      if (k === 'land' && el.dataset.d) pd = .15 + .85 * parseFloat(el.dataset.d);
      el.dataset.pd = Math.min(1, k === 'land' ? pd : pd + .05).toFixed(2); } }
  // Glide: the camera flies slowly through the scene. Each plane sits in a wrapper that moves sideways and grows with its
  // depth (near layers pass faster than far ones), all in sync, so the landscape opens up in real depth like an aerial shot.
  { const gd = 70 + r() * 30, dir = r() < .5 ? -1 : 1, phase = -(r() * gd).toFixed(1), up = .4 + r() * .4;
    const drifting = /k-(mist|cloud)|f-(sweep|wisp|creep)/;
    for (const el of [...cam.children]) { let d = +(el.dataset.pd || 0); const w = doc.createElement('div'); w.className = 'cd-gl';
      // planes that also drift on their own get a smaller glide and drift so their edges never come into view
      if (drifting.test(el.className)) { d = Math.min(d, .4); const a = parseFloat(el.style.getPropertyValue('--amp')); el.style.setProperty('--amp', (isNaN(a) ? 2 : Math.min(a, 2.2)) + '%'); }
      w.style.cssText = `--gx:${(dir * d * 5.2).toFixed(2)}%;--gy:${(up * d * 1.4).toFixed(2)}%;--gs:${(1 + d * .1).toFixed(3)};--gd:${gd.toFixed(0)}s;--gp:${phase}s`;
      cam.insertBefore(w, el); w.appendChild(el); } }
  // The light changes over the ten minutes: dawn warms up, dusk deepens toward night.
  const arc = tags.includes('morning') ? ['#ffc983', 'bottom', .16] : tags.includes('evening') ? ['#2c2a5e', 'top', .26] : tags.includes('afternoon') ? ['#ffb870', 'bottom', .1] : null;
  if (arc) { const d = doc.createElement('div'); d.className = 'cd-arc'; d.style.cssText = `background:linear-gradient(to ${arc[1] === 'top' ? 'bottom' : 'top'},${arc[0]},transparent 70%);--to:${arc[2]}`; live.appendChild(d); }
  // Fine film grain (rendered once) removes gradient banding; a faint vignette frames the view.
  const gr = doc.createElement('div'); gr.className = 'cd-grain'; const gid = 'gr' + Math.floor(r() * 1e9).toString(36);
  gr.innerHTML = `<svg width="100%" height="100%" aria-hidden="true"><filter id="${gid}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#${gid})"/></svg>`;
  const vg = doc.createElement('div'); vg.className = 'cd-vignette'; live.append(gr, vg);
  if (dark) { const d1 = doc.createElement('div'), d2 = doc.createElement('div'); d1.className = d2.className = 'cd-dim';
    d1.style.cssText = `background:${palette.sky};opacity:.42;mix-blend-mode:multiply`; d2.style.cssText = `background:${palette.sky};opacity:.18`; live.append(d1, d2); }
  return live;
}

/** Layers shift gently with the mouse (nearer planes more). Sets each plane's translate from the pointer; returns a detach function. */
export function attachDepth(target, doc = target.ownerDocument || document){
  const win = doc.defaultView; if (!win || win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};
  let last = 0, t = null, x = 0, y = 0;
  // translate is set per plane (not an inherited CSS variable) so the browser does not restyle every SVG node.
  const apply = () => { t = null; last = Date.now(); for (const el of target.querySelectorAll('.cd-pl[data-pd]')) { const d = +el.dataset.pd; el.style.translate = d ? `${(-x * d * 2.4).toFixed(2)}% ${(-y * d * 1.3).toFixed(2)}%` : ''; } };
  const move = e => { x = Math.max(-1, Math.min(1, (e.clientX / win.innerWidth - .5) * 2)); y = Math.max(-1, Math.min(1, (e.clientY / win.innerHeight - .5) * 2));
    if (t) return; const wait = Math.max(0, 200 - (Date.now() - last)); t = win.setTimeout(apply, wait); };
  const leave = () => { x = 0; y = 0; if (!t) t = win.setTimeout(apply, 0); };
  doc.addEventListener('pointermove', move, {passive: true}); doc.documentElement.addEventListener('pointerleave', leave);
  return () => { doc.removeEventListener('pointermove', move); doc.documentElement.removeEventListener('pointerleave', leave); if (t) win.clearTimeout(t); for (const el of target.querySelectorAll('.cd-pl[data-pd]')) el.style.translate = ''; };
}
