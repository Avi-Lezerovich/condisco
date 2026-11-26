import { rng, uid, put, sky, hills } from './lib.js';
export default { id: 'misty-ridges', name: 'רכסים בערפל', tags: ['mist', 'morning', 'classic'], seed: 23,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#e7eef2'], [1, '#b9cbd6']])}${sky(k + 'm', [[0, '#ffffff', 0], [.5, '#ffffff'], [1, '#ffffff', 0]])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${hills(r, 430, 90, '#a7bccb')}<rect y="420" width="1600" height="120" fill="url(#${k}m)" opacity=".7"/>${hills(r, 540, 80, '#7f9bb0')}<rect y="530" width="1600" height="110" fill="url(#${k}m)" opacity=".55"/>${hills(r, 650, 70, '#58778f')}<rect y="640" width="1600" height="90" fill="url(#${k}m)" opacity=".4"/>${hills(r, 770, 60, '#37556c')}`); } };
