// Per-scene "life": creatures and weather that fit each landscape. Each effect becomes one or a few
// composited planes (CSS transform/opacity only). A scene file may export its own `life` array;
// otherwise LIFE[id] is used, then a calm default chosen from the scene's tags.
// Effect spec: {fx, ...params}. Coordinates are in the 1600x900 scene space.

/* ---------- silhouettes (drawn facing right, centred on 0,0) ---------- */
const P = (d, col, w, o = .7) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
const F = (d, col, o = .75) => `<path d="${d}" fill="${col}" opacity="${o}"/>`;
export const SHAPES = {
  gull: (s, c) => P(`M${-11 * s} ${2 * s} Q${-5 * s} ${-5 * s} 0 ${1.5 * s} Q${5 * s} ${-5 * s} ${11 * s} ${2 * s}`, c, 1.9 * s),
  swallow: (s, c) => F(`M${-9 * s} ${-3 * s} Q${-3 * s} ${-1 * s} 0 0 Q${-3 * s} ${1 * s} ${-9 * s} ${4 * s} L${-5 * s} ${.5 * s} Z M0 0 Q${4 * s} ${-1.5 * s} ${7 * s} 0 Q${4 * s} ${1.2 * s} 0 0 M${-2 * s} 0 L${-12 * s} ${-1 * s} M${-2 * s} 0 L${-12 * s} ${2 * s}`, c),
  crane: (s, c) => P(`M${-14 * s} ${1 * s} Q${-6 * s} ${-4 * s} 0 0 Q${6 * s} ${-4 * s} ${14 * s} ${1 * s} M${-3 * s} 0 L${10 * s} ${-.5 * s} M${-3 * s} 0 L${-12 * s} ${.8 * s}`, c, 1.6 * s),
  heron: (s, c) => F(`M${-40 * s} ${2 * s} Q${-20 * s} ${-14 * s} 0 ${-2 * s} Q${20 * s} ${-14 * s} ${40 * s} ${2 * s} Q${20 * s} ${-6 * s} ${4 * s} ${3 * s} L${16 * s} ${4 * s} Q${22 * s} ${2 * s} ${26 * s} ${5 * s} L${16 * s} ${6 * s} L${2 * s} ${5 * s} L${-22 * s} ${7 * s} L${-34 * s} ${9 * s} L${-22 * s} ${4 * s} Q${-20 * s} ${-6 * s} ${-40 * s} ${2 * s} Z`, c, .7),
  eagle: (s, c) => F(`M${-34 * s} ${-2 * s} L${-30 * s} ${-5 * s} L${-27 * s} ${-3 * s} L${-24 * s} ${-6 * s} L${-20 * s} ${-3 * s} Q${-10 * s} ${-4 * s} ${-3 * s} ${-1 * s} L0 ${-3 * s} L${3 * s} ${-1 * s} Q${10 * s} ${-4 * s} ${20 * s} ${-3 * s} L${24 * s} ${-6 * s} L${27 * s} ${-3 * s} L${30 * s} ${-5 * s} L${34 * s} ${-2 * s} Q${14 * s} ${3 * s} ${3 * s} ${3 * s} L${5 * s} ${10 * s} L0 ${8 * s} L${-5 * s} ${10 * s} L${-3 * s} ${3 * s} Q${-14 * s} ${3 * s} ${-34 * s} ${-2 * s} Z`, c, .72),
  leaf: (s, c) => F(`M0 ${-6 * s} Q${5 * s} 0 0 ${6 * s} Q${-5 * s} 0 0 ${-6 * s} Z`, c, .85),
  petal: (s, c) => `<ellipse rx="${3.2 * s}" ry="${2 * s}" fill="${c}" opacity=".9"/>`,
  flake: (s, c) => `<circle r="${1.4 * s}" fill="${c}" opacity=".85"/>`,
  drop: (s, c) => `<path d="M0 0 l${-2.2 * s} ${16 * s}" stroke="${c}" stroke-width="${1.1 * s}" opacity=".45" stroke-linecap="round"/>`,
  mote: (s, c) => `<circle r="${1.6 * s}" fill="${c}" opacity=".55"/>`,
  sail: (s, c) => F(`M0 ${-26 * s} L0 0 L${-14 * s} 0 Z M${2 * s} ${-22 * s} L${2 * s} 0 L${11 * s} 0 Z M${-16 * s} ${2 * s} L${13 * s} ${2 * s} L${9 * s} ${6 * s} L${-12 * s} ${6 * s} Z`, c, .55)
};
const place = (shape, x, y, s, c, rot = 0, flip = false) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})${rot ? ` rotate(${rot.toFixed(0)})` : ''}${flip ? ' scale(-1 1)' : ''}">${SHAPES[shape](s, c)}</g>`;

/* ---------- formations ---------- */
function formation(r, kind, n, size, col, dir){
  const flip = dir < 0; let s = '';
  if (kind === 'v') { // migrating cranes/geese: a soft V
    for (let i = 0; i < n; i++) { const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1); s += place('crane', -Math.abs(k) * 30 * size * dir + (r() - .5) * 6, k * 17 * size + (r() - .5) * 5, size * (.9 + r() * .2), col, 0, flip); }
  } else if (kind === 'line') { // gulls / herons in a loose line
    for (let i = 0; i < n; i++) s += place('gull', -i * (40 + r() * 30) * size * dir, (r() - .5) * 40 * size, size * (.8 + r() * .4), col, (r() - .5) * 10, flip);
  } else { // a scattered flock of swallows/swifts
    for (let i = 0; i < n; i++) s += place('swallow', (r() - .5) * 240 * size, (r() - .5) * 90 * size, size * (.7 + r() * .5), col, (r() - .5) * 40, flip);
  }
  return s;
}
/** A tile of falling things, drawn twice (y and y+900) so the fall loops seamlessly. */
function tile(r, shape, n, size, cols, area = [0, 900]){
  const one = Array.from({length: n}, () => ({x: r() * 1600, y: area[0] + r() * (area[1] - area[0]), s: size * (.6 + r() * .8), c: cols[Math.floor(r() * cols.length)], rot: r() * 360}));
  return [0, 900].map(dy => one.map(p => place(shape, p.x, p.y + dy, p.s, p.c, p.rot)).join('')).join('');
}

/* ---------- effects → planes ---------- */
// Each returns {cls, style, svg, vb?, box?} items; alive.js turns them into DOM.
export const FX = {
  // A flock that glides across the sky now and then (crossing takes ~45% of the cycle, then the sky is empty).
  flock: (r, o) => { const dir = o.dir ?? (r() < .5 ? 1 : -1); const y = o.y ?? 160 + r() * 200;
    return [{cls: 'pass', style: `--dir:${dir};--dur:${o.dur ?? 200 + r() * 120}s;--delay:-${(r() * (o.dur ?? 240) * .9).toFixed(0)}s;--bob:${o.bob ?? 1.2}%`,
      svg: `<g transform="translate(800 ${y.toFixed(0)})">${formation(r, o.form || 'scatter', o.n || 6, o.size || 1, o.color || '#2b2f3c', dir)}</g>`}]; },
  // A single large bird (heron) gliding low and slow across, once in a while.
  glider: (r, o) => { const dir = o.dir ?? (r() < .5 ? 1 : -1);
    return [{cls: 'pass', style: `--dir:${dir};--dur:${o.dur ?? 260}s;--delay:-${(r() * 200).toFixed(0)}s;--bob:${o.bob ?? .6}%`,
      svg: place(o.shape || 'heron', 800, o.y ?? 520, o.size || 1, o.color || '#2b2f3c', 0, dir < 0)}]; },
  // Raptors circling a thermal (eagles over the crater, storks over the Dead Sea hills).
  orbit: (r, o) => { const n = o.n || 1, out = [];
    // A flattened circle seen from below: x and y swing out of phase, so the bird stays level as it circles.
    for (let i = 0; i < n; i++) { const R = (o.radius || 120) * (0.7 + r() * 0.6), cx = (o.x ?? 900) + (r() - .5) * 80, cy = (o.y ?? 260) + (r() - .5) * 40, half = (o.dur || 46) * (0.85 + r() * 0.4) / 2;
      out.push({cls: 'orbit', style: `--rx:${(R / 16 / 1.14).toFixed(2)}%;--ry:${(R * .38 / 9 / 1.14).toFixed(2)}%;--dur:${half.toFixed(1)}s;--delay:-${(r() * half * 2).toFixed(1)}s`,
        svg: place(o.shape || 'eagle', cx, cy, (o.size || .8) * (0.8 + r() * 0.3), o.color || '#2b2a33', (r() - .5) * 20, false)}); }
    return out; },
  // Falling leaves / petals / snow / rain: a seamless loop with a gentle sideways sway.
  fall: (r, o) => [{cls: 'fall', vb: 1800, style: `--dur:${o.dur || 60}s;--sway:${o.sway ?? 1.5}%;--swd:${o.swayDur || 9}s;--delay:-${(r() * (o.dur || 60)).toFixed(0)}s`,
    svg: tile(r, o.shape || 'leaf', o.n || 30, o.size || 1, o.colors || ['#c9773f'], o.area)}],
  // Fireflies / motes: three sets that glow at different rates while drifting.
  glow: (r, o) => [0, 1, 2].map(i => ({cls: 'glow', style: `--tw:${(o.tw || 7) + i * 2.3}s;--delay:-${(r() * 8).toFixed(1)}s;--dur:${(o.dur || 34) + i * 9}s;--o0:${o.o0 ?? .05}`,
    svg: Array.from({length: Math.ceil((o.n || 30) / 3)}, () => { const x = (o.x0 ?? 0) + r() * ((o.x1 ?? 1600) - (o.x0 ?? 0)), y = (o.y0 ?? 500) + r() * ((o.y1 ?? 880) - (o.y0 ?? 500)), s = (o.size || 1) * (.7 + r() * .6);
      return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(6 * s).toFixed(1)}" fill="${o.color || '#f6e27a'}" opacity=".16"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.8 * s).toFixed(1)}" fill="${o.core || '#fff6c0'}" opacity=".95"/>`; }).join('')})),
  // Rings spreading on still water (small composited boxes, not full-screen planes).
  ripples: (r, o) => Array.from({length: o.n || 4}, (_, i) => { const x = (o.x0 ?? 200) + r() * ((o.x1 ?? 1400) - (o.x0 ?? 200)), y = (o.y0 ?? 650) + r() * ((o.y1 ?? 860) - (o.y0 ?? 650)), w = (o.size || 1) * (90 + r() * 80);
    return {box: [x, y, w], cls: 'ripple', style: `--dur:${(o.dur || 11) + r() * 4}s;--delay:-${(i * 3.1 + r() * 2).toFixed(1)}s`,
      svg: `<ellipse cx="50" cy="50" rx="48" ry="9" fill="none" stroke="${o.color || '#ffffff'}" stroke-width="1.2" opacity=".55"/><ellipse cx="50" cy="50" rx="30" ry="5.5" fill="none" stroke="${o.color || '#ffffff'}" stroke-width="1" opacity=".4"/>`}; }),
  // Shadows of passing clouds sweeping across fields.
  shadows: (r, o) => { const id = 'cs' + Math.floor(r() * 1e9).toString(36);
    return [{cls: 'sweep', style: `--dur:${o.dur || 160}s;--delay:-${(r() * 160).toFixed(0)}s;--amp:${o.amp || 18}%`,
      svg: `<defs><filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter></defs>` + Array.from({length: o.n || 4}, () => `<ellipse cx="${(r() * 1600).toFixed(0)}" cy="${((o.y0 ?? 560) + r() * ((o.y1 ?? 860) - (o.y0 ?? 560))).toFixed(0)}" rx="${(180 + r() * 220).toFixed(0)}" ry="${(40 + r() * 40).toFixed(0)}" fill="${o.color || '#2d3a2a'}" opacity="${o.o || .22}" filter="url(#${id})"/>`).join('')}]; },
  // Wind lifting fine sand off the dune crests.
  wisps: (r, o) => { const id = 'sw' + Math.floor(r() * 1e9).toString(36);
    return [{cls: 'wisp', style: `--dur:${o.dur || 70}s;--delay:-${(r() * 60).toFixed(0)}s`,
      svg: `<defs><filter id="${id}" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="6"/></filter></defs>` + Array.from({length: o.n || 7}, () => { const x = r() * 1600, y = (o.y0 ?? 600) + r() * ((o.y1 ?? 820) - (o.y0 ?? 600)); return `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q${(80 + r() * 120).toFixed(0)} ${(-10 - r() * 14).toFixed(0)} ${(240 + r() * 200).toFixed(0)} ${(-4 - r() * 8).toFixed(0)}" stroke="${o.color || '#fff3dc'}" stroke-width="${(5 + r() * 6).toFixed(0)}" fill="none" opacity=".35" filter="url(#${id})"/>`; }).join('')}]; },
  // Soft light shafts that slowly brighten and fade.
  rays: (r, o) => [{cls: 'rays', style: `--tw:${o.tw || 14}s;--o0:${o.o0 ?? .25}`,
    svg: Array.from({length: o.n || 7}, () => `<rect x="${((o.x0 ?? 300) + r() * ((o.x1 ?? 1300) - (o.x0 ?? 300))).toFixed(0)}" y="-100" width="${(26 + r() * 50).toFixed(0)}" height="1100" fill="${o.color || '#fff6d8'}" opacity="${(0.07 + r() * 0.08).toFixed(2)}" transform="skewX(${o.skew ?? 14})"/>`).join('')}],
  // A rare shooting star.
  meteor: (r, o) => [{cls: 'meteor', style: `--dur:${o.dur || 75}s;--delay:-${(r() * 60).toFixed(0)}s`,
    svg: `<defs><linearGradient id="mt${Math.floor(r() * 1e9).toString(36)}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient></defs><path d="M${o.x ?? 1000} ${o.y ?? 140} l-150 70" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`}],
  // A small sail creeping along the horizon over the whole scene.
  sail: (r, o) => [{cls: 'creep', style: `--amp:${o.amp || 10}%;--dur:600s`, svg: place('sail', o.x ?? 500, o.y ?? 560, o.size || 1, o.color || '#f5f1e8')}],
  // Foam line breathing in and out on the beach.
  foam: (r, o) => [{cls: 'foam', style: `--dur:${o.dur || 10}s`, svg: `<path d="M0 ${o.y ?? 722} C300 ${(o.y ?? 722) - 20} 700 ${(o.y ?? 722) + 20} 1100 ${(o.y ?? 722) - 5} S1500 ${(o.y ?? 722) - 20} 1600 ${(o.y ?? 722) - 8}" stroke="#ffffff" stroke-width="7" fill="none" opacity=".75" stroke-linecap="round"/>`}],
  // Wisps of cloud passing in front of the moon or a summit.
  veil: (r, o) => { const id = 'vl' + Math.floor(r() * 1e9).toString(36);
    return [{cls: 'sweep', style: `--dur:${o.dur || 220}s;--delay:-${(r() * 200).toFixed(0)}s;--amp:${o.amp || 25}%`,
      svg: `<defs><filter id="${id}" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="${o.blur || 14}"/></filter></defs>` + Array.from({length: o.n || 3}, () => `<ellipse cx="${((o.x ?? 800) + (r() - .5) * 600).toFixed(0)}" cy="${((o.y ?? 260) + (r() - .5) * 60).toFixed(0)}" rx="${(140 + r() * 160).toFixed(0)}" ry="${(10 + r() * 14).toFixed(0)}" fill="${o.color || '#dfe6f2'}" opacity="${o.o || .45}" filter="url(#${id})"/>`).join('')}]; },
  // Stars that appear one by one as dusk deepens (applied to the scene's own stars).
  starsFadeIn: () => []
};

const DUSK = '#2a2433', DAY = '#2b2f3c', NIGHTFLY = '#f6e27a';
/** The life plan for each scene. Order = paint order above the scene (before the dark-mode dim). */
export const LIFE = {
  'lake-dawn': [{fx: 'flock', form: 'v', n: 7, y: 200, size: .9, color: '#3b4252', dur: 240}, {fx: 'ripples', n: 4, y0: 640, y1: 860, x0: 200, x1: 1300}],
  'misty-ridges': [{fx: 'orbit', shape: 'eagle', x: 1150, y: 230, radius: 110, size: .55, color: '#4b5b6b', dur: 52}],
  'moonlit-lake': [{fx: 'glow', n: 30, y0: 560, y1: 640, tw: 6}, {fx: 'ripples', n: 3, y0: 640, y1: 860, x0: 250, x1: 650, color: '#f3ead0'}, {fx: 'meteor', x: 1300, y: 120, dur: 90}],
  'violet-dusk': [{fx: 'flock', form: 'scatter', n: 9, y: 330, size: .8, color: DUSK, dur: 170}, {fx: 'starsFadeIn'}],
  'misty-pines': [{fx: 'rays', x0: 400, x1: 1300, n: 6, color: '#ffffff', o0: .2}, {fx: 'glider', shape: 'heron', y: 300, size: .55, color: '#4f6b60', dur: 300}],
  'golden-dunes': [{fx: 'wisps', y0: 620, y1: 860}, {fx: 'orbit', shape: 'eagle', x: 600, y: 250, radius: 140, size: .6, color: '#7a4a32', dur: 58}],
  'sea-glitter': [{fx: 'flock', form: 'line', n: 3, y: 330, size: 1.3, color: '#4a6378', dur: 210}, {fx: 'sail', x: 380, y: 556, size: .9, color: '#f4f1ea', amp: 8}],
  'northern-lights': [{fx: 'meteor', x: 600, y: 150, dur: 80}],
  'mountain-mirror': [{fx: 'flock', form: 'v', n: 9, y: 180, size: .8, color: '#3d4766', dur: 260}, {fx: 'ripples', n: 4, y0: 620, y1: 860, color: '#e8eef8'}],
  'meadow-tree': [{fx: 'shadows', y0: 600, y1: 880, color: '#2e4a2a', o: .18}, {fx: 'glow', n: 24, y0: 520, y1: 820, color: '#fffbe6', core: '#ffffff', tw: 9, o0: .2, size: .7}, {fx: 'flock', form: 'scatter', n: 5, y: 260, size: .8, color: DAY, dur: 230}],
  'alpine-pink': [{fx: 'fall', shape: 'flake', n: 60, size: 1.1, colors: ['#ffffff'], dur: 80, sway: 2}, {fx: 'orbit', shape: 'eagle', x: 700, y: 220, radius: 120, size: .5, color: '#3e3a55', dur: 60}],
  'cloud-drift': [{fx: 'flock', form: 'scatter', n: 6, y: 300, size: .9, color: '#5a6f8f', dur: 200}],
  'kinneret-dawn-path': [{fx: 'glider', shape: 'heron', y: 590, size: .9, color: '#3e4452', dur: 230}, {fx: 'ripples', n: 4, y0: 600, y1: 840, x0: 150, x1: 900, color: '#fff3dc'}, {fx: 'flock', form: 'scatter', n: 6, y: 250, size: .8, color: '#3e4452', dur: 190}],
  'galilee-spring': [{fx: 'shadows', y0: 560, y1: 880, color: '#2f4a25', o: .2}, {fx: 'glow', n: 21, y0: 600, y1: 880, color: '#ffffff', core: '#fff9e0', tw: 10, o0: .25, size: .6}, {fx: 'flock', form: 'scatter', n: 7, y: 300, size: .8, color: DAY, dur: 180}],
  'galilee-olive-terraces': [{fx: 'orbit', shape: 'eagle', x: 1050, y: 230, radius: 130, size: .55, color: '#5b5040', dur: 54}, {fx: 'glow', n: 18, y0: 450, y1: 800, color: '#fff6dd', core: '#ffffff', tw: 11, o0: .2, size: .6}],
  'negev-dunes-noon': [{fx: 'wisps', y0: 560, y1: 860, n: 9}, {fx: 'orbit', shape: 'eagle', x: 1000, y: 200, radius: 150, size: .5, color: '#6b4a2e', dur: 62}],
  'ramon-crater-dusk': [{fx: 'orbit', shape: 'eagle', x: 760, y: 360, radius: 160, size: .75, color: '#2a1a26', dur: 50, n: 2}, {fx: 'starsFadeIn'}, {fx: 'meteor', x: 1200, y: 90, dur: 110}],
  'dead-sea-morning': [{fx: 'orbit', shape: 'crane', x: 600, y: 300, radius: 90, size: 1.3, color: '#6a5a66', dur: 40, n: 4}, {fx: 'ripples', n: 3, y0: 560, y1: 700, color: '#ffffff'}],
  'med-coast-sunset': [{fx: 'flock', form: 'line', n: 4, y: 380, size: 1.2, color: '#3a2a3a', dur: 190}, {fx: 'sail', x: 300, y: 548, size: .8, color: '#3d3550', amp: 10}],
  'med-coast-noon': [{fx: 'foam', y: 721, dur: 11}, {fx: 'flock', form: 'line', n: 3, y: 260, size: 1.3, color: '#4b6a80', dur: 200}, {fx: 'sail', x: 1100, y: 466, size: .8, color: '#ffffff', amp: 9}],
  'golan-winter-snow': [{fx: 'fall', shape: 'flake', n: 90, size: 1.2, colors: ['#ffffff'], dur: 70, sway: 2.5}, {fx: 'veil', x: 900, y: 340, n: 3, color: '#ffffff', o: .55, dur: 240}],
  'autumn-forest': [{fx: 'fall', shape: 'leaf', n: 28, size: 1.4, colors: ['#c9773f', '#d8964a', '#b8642f', '#e0b062'], dur: 55, sway: 3, swayDur: 11}, {fx: 'flock', form: 'v', n: 7, y: 170, size: .8, color: '#5a4a44', dur: 230}],
  'desert-milky-way': [{fx: 'meteor', x: 1150, y: 160, dur: 60}, {fx: 'meteor', x: 500, y: 260, dur: 95}],
  'rain-hills': [{fx: 'fall', shape: 'drop', n: 120, size: 1, colors: ['#eef2f5'], dur: 9, sway: .6, swayDur: 14}],
  'eucalyptus-grove': [{fx: 'rays', x0: 500, x1: 1300, n: 8, color: '#fff8e0', o0: .2}, {fx: 'glow', n: 30, y0: 300, y1: 820, color: '#fff8e0', core: '#ffffff', tw: 9, o0: .15, size: .7}],
  'jezreel-fields': [{fx: 'shadows', y0: 500, y1: 880, color: '#5a4a20', o: .2, n: 5}, {fx: 'flock', form: 'v', n: 11, y: 210, size: .85, color: '#4a5568', dur: 280}],
  'valley-fog-sunrise': [{fx: 'flock', form: 'v', n: 7, y: 260, size: .8, color: '#6a5560', dur: 260}],
  'full-moon-sea': [{fx: 'veil', x: 1050, y: 260, n: 3, color: '#b8c2dc', o: .35, dur: 200, amp: 30}, {fx: 'ripples', n: 3, y0: 600, y1: 860, x0: 850, x1: 1250, color: '#eef1fb'}],
  'wadi-acacia': [{fx: 'orbit', shape: 'eagle', x: 800, y: 230, radius: 120, size: .6, color: '#4a3226', dur: 48}, {fx: 'wisps', y0: 640, y1: 880, n: 5, color: '#fff0d8'}],
  'snow-pines-night': [{fx: 'fall', shape: 'flake', n: 80, size: 1.1, colors: ['#ffffff'], dur: 75, sway: 2}],
  'lavender-rows-dusk': [{fx: 'glow', n: 42, y0: 560, y1: 880, tw: 6}, {fx: 'flock', form: 'scatter', n: 8, y: 300, size: .8, color: DUSK, dur: 170}],
  'oasis-palms-dawn': [{fx: 'flock', form: 'scatter', n: 5, y: 330, size: .9, color: '#2e2430', dur: 200}, {fx: 'wisps', y0: 720, y1: 880, n: 4, color: '#f0c8a8'}],
  'layered-waves': [],
  'above-the-clouds': [{fx: 'orbit', shape: 'eagle', x: 1100, y: 330, radius: 130, size: .5, color: '#5a587a', dur: 56}],
  'tide-pools-morning': [{fx: 'ripples', n: 5, y0: 700, y1: 870, size: .6, color: '#ffffff'}, {fx: 'flock', form: 'line', n: 3, y: 300, size: 1.2, color: '#5a6a78', dur: 200}, {fx: 'foam', y: 640, dur: 12}],
  'jerusalem-hills-twilight': [{fx: 'starsFadeIn'}, {fx: 'flock', form: 'scatter', n: 9, y: 360, size: .75, color: '#2e2540', dur: 160}, {fx: 'glow', n: 18, y0: 700, y1: 880, tw: 7}],
  'almond-blossom': [{fx: 'fall', shape: 'petal', n: 40, size: 1.2, colors: ['#f6dce4', '#f1c6d3', '#fbeef1'], dur: 50, sway: 3, swayDur: 10}, {fx: 'flock', form: 'scatter', n: 5, y: 250, size: .8, color: DAY, dur: 210}]
};

export function lifeFor(scene){
  if (Array.isArray(scene.life)) return scene.life;
  if (LIFE[scene.id]) return LIFE[scene.id];
  const t = scene.tags || [];
  if (t.includes('night')) return [{fx: 'meteor'}];
  if (t.includes('water') || t.includes('sea')) return [{fx: 'flock', form: 'line', n: 3, size: 1.2}, {fx: 'ripples', n: 3}];
  return [{fx: 'flock', form: 'scatter', n: 6, size: .8}];
}
