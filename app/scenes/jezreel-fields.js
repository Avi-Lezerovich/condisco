import { rng, uid, put, sky, ridge, range } from './lib.js';
export default { id: 'jezreel-fields', name: 'שדות עמק יזרעאל', tags: ['fields', 'summer', 'israel', 'day'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const cols = ['#e2c26a', '#d4ae52', '#b9b35e', '#cf9a4c', '#9aab5a', '#e6d08a'];
    const band = (y0, y1) => { let s = '', x = -100; while (x < 1700) { const w = 120 + r() * 260, sk = (r() - .5) * 80; s += `<path d="M${x.toFixed(0)} ${y1} L${(x + sk).toFixed(0)} ${y0} L${(x + w + sk).toFixed(0)} ${y0} L${(x + w).toFixed(0)} ${y1} Z" fill="${cols[Math.floor(r() * cols.length)]}"/>`; x += w; } return s; };
    put(svg, `<defs>${sky(k + 's', [[0, '#8bbbe0'], [1, '#e9f0ea']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="1300" cy="200" r="42" fill="#fffbe8"/>
    ${ridge(r, 450, 70, '#8ea79a', {f: .4})}${ridge(r, 480, 30, '#7c9a7c', {f: .7})}
    <rect y="478" width="1600" height="422" fill="#cdb565"/>${band(480, 540)}${band(540, 630)}${band(630, 760)}${band(760, 900)}
    ${range(5, i => `<path d="M0 ${540 + i * 90} L1600 ${540 + i * 90}" stroke="#6f8a4f" stroke-width="${2 + i * 1.5}" opacity=".35"/>`)}${range(30, () => `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(530 + r() * 60).toFixed(0)}" r="${(5 + r() * 6).toFixed(0)}" fill="#5f7a4a"/>`)}`); } };
