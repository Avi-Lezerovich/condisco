import { rng, uid, put, sky, hills, range } from './lib.js';
export default { id: 'moonlit-lake', name: 'אגם בליל ירח', tags: ['water', 'night', 'classic'], seed: 37,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#0b1524'], [.7, '#1d3452'], [1, '#2a4566']])}${sky(k + 'w', [[0, '#1b3049'], [1, '#08111c']])}<radialGradient id="${k}g"><stop offset="0" stop-color="#f3ead0" stop-opacity=".35"/><stop offset="1" stop-color="#f3ead0" stop-opacity="0"/></radialGradient></defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${range(110, () => `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 520).toFixed(0)}" r="${(0.6 + r() * 1.5).toFixed(1)}" fill="#ffffff" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`)}
    <circle cx="430" cy="230" r="170" fill="url(#${k}g)"/><circle cx="430" cy="230" r="46" fill="#f3ead0"/>${hills(r, 590, 60, '#14243a')}<rect y="600" width="1600" height="300" fill="url(#${k}w)"/>
    ${range(16, i => `<rect x="${430 - 60 + r() * 60}" y="${615 + i * 16}" width="${40 + r() * 70}" height="2" rx="1" fill="#f3ead0" opacity="${(0.45 - i * 0.025).toFixed(2)}"/>`)}`); } };
