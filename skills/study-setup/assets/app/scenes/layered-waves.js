import { rng, uid, put, ridge, glide } from './lib.js';
// Abstract scene built only from the app palette (shows how a palette-native scene looks in both modes).
export default { id: 'layered-waves', name: 'גלים בשכבות', tags: ['abstract', 'palette'],
  draw(svg, { seed, palette: p }){ const r = rng(seed), k = uid();
    put(svg, `<defs><linearGradient id="${k}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky}"/><stop offset="1" stop-color="${p.far}"/></linearGradient><radialGradient id="${k}g"><stop offset="0" stop-color="${p.accent}" stop-opacity=".55"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient></defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="1150" cy="300" r="320" fill="url(#${k}g)"/><circle cx="1150" cy="300" r="46" fill="${p.accent}" opacity=".9"/>
    <g>${ridge(r, 470, 70, p.far, {f: .5, op: .8})}${glide(30, 0, 80)}</g>
    <g>${ridge(r, 600, 80, p.mid, {f: .6, op: .9})}${glide(-40, 0, 70)}</g>
    <g>${ridge(r, 740, 70, p.near, {f: .8})}${glide(50, 0, 60)}</g>
    <g>${ridge(r, 860, 40, p.ink, {f: 1, op: .55})}${glide(-30, 0, 50)}</g>`); } };
