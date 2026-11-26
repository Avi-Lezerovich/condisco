import { rng, uid, put, sky, smooth } from './lib.js';
export default { id: 'golden-dunes', name: 'דיונות זהובות', tags: ['desert', 'afternoon', 'classic'], seed: 83,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#f6dcae'], [.55, '#f0b98a'], [1, '#d8906a']])}<radialGradient id="${k}g"><stop offset="0" stop-color="#fff3d6" stop-opacity=".8"/><stop offset="1" stop-color="#fff3d6" stop-opacity="0"/></radialGradient></defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="1180" cy="430" r="230" fill="url(#${k}g)"/><circle cx="1180" cy="430" r="58" fill="#fff1d2"/>
    ${smooth(r, 600, 50, '#e2a676', .6)}${smooth(r, 660, 70, '#cf8f63')}${smooth(r, 740, 60, '#b8784f')}${smooth(r, 830, 50, '#9a6040')}`); } };
