import { rng, uid, put, sky, hills, range } from './lib.js';
export default { id: 'lake-dawn', name: 'אגם בזריחה', tags: ['water', 'morning', 'classic'], seed: 11,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#f4c7a6'], [.45, '#c9c3d6'], [1, '#7f9cc0']])}${sky(k + 'w', [[0, '#7d9cbf'], [1, '#2c4a6a']])}<radialGradient id="${k}g"><stop offset="0" stop-color="#fff1d0" stop-opacity=".9"/><stop offset="1" stop-color="#fff1d0" stop-opacity="0"/></radialGradient></defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="1120" cy="500" r="260" fill="url(#${k}g)"/><circle cx="1120" cy="500" r="62" fill="#ffe8bd"/>
    ${hills(r, 560, 70, '#6f86a8', .75)}${hills(r, 585, 45, '#4f6789')}<rect y="590" width="1600" height="310" fill="url(#${k}w)"/>
    ${range(14, i => `<rect x="${1120 - 90 + r() * 120}" y="${605 + i * 18}" width="${60 + r() * 90}" height="2.5" rx="1.2" fill="#ffe8bd" opacity="${(0.55 - i * 0.035).toFixed(2)}"/>`)}`); } };
