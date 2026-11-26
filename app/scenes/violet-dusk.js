import { rng, uid, put, sky, hills } from './lib.js';
export default { id: 'violet-dusk', name: 'דמדומים סגולים', tags: ['hills', 'evening', 'classic'], seed: 51,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#f0b9a0'], [.5, '#b58cb8'], [1, '#4c4a7c']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="800" cy="610" r="90" fill="#ffd9b0" opacity=".85"/>${hills(r, 600, 90, '#5d4f86')}${hills(r, 680, 70, '#3f3a6a')}${hills(r, 780, 50, '#2a2850')}`); } };
