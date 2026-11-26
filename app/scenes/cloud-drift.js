import { rng, uid, put, sky, range } from './lib.js';
export default { id: 'cloud-drift', name: 'עננים', tags: ['sky', 'day', 'classic'], seed: 163,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const cloud = (cx, cy, s, o) => `<g opacity="${o}" filter="url(#${k}b)">${[[0, 0, 1], [-.9, .15, .7], [.9, .2, .75], [-.4, -.35, .65], [.45, -.3, .7]].map(([dx, dy, q]) => `<ellipse cx="${cx + dx * s}" cy="${cy + dy * s}" rx="${s * q}" ry="${s * q * .62}" fill="#ffffff"/>`).join('')}</g>`;
    put(svg, `<defs>${sky(k + 's', [[0, '#9fc0e6'], [.65, '#e9d5e6'], [1, '#f8dccf']])}<filter id="${k}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter></defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${range(9, () => cloud(r() * 1600, 120 + r() * 600, 70 + r() * 110, (0.45 + r() * 0.45).toFixed(2)))}`); } };
