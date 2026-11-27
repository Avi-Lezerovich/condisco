import { rng, uid, put, sky, glow, peaks, blur, cloud, range, glide } from './lib.js';
export default { id: 'above-the-clouds', name: 'מעל העננים', tags: ['mountains', 'morning', 'sky'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#7fa3d1'], [.7, '#f1d7c8'], [1, '#fbe6cc']])}${glow(k + 'g', '#fff3d8', .9)}${blur(k + 'b', 14)}${sky(k + 'p', [[0, '#ece4ea'], [1, '#8c8aa8']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="400" cy="400" r="300" fill="url(#${k}g)"/><circle cx="400" cy="400" r="44" fill="#fff4dc"/>
    ${peaks(r, 600, 380, 5, `url(#${k}p)`)}${peaks(r, 620, 220, 8, '#7d7a9c')}
    <g>${range(26, () => cloud(r() * 1700 - 50, 600 + r() * 280, 90 + r() * 90, (0.75 + r() * 0.25).toFixed(2), k + 'b', '#fbf4f2'))}${glide(-50, 0, 120)}</g>`); } };
