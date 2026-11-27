import { rng, uid, put, sky, ridge, cloud, blur, glide, range } from './lib.js';
export default { id: 'galilee-spring', name: 'גבעות הגליל באביב', tags: ['hills', 'spring', 'israel', 'morning'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const flowers = (y0, y1, n, cols) => range(n, () => `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(y0 + r() * (y1 - y0)).toFixed(0)}" r="${(1.5 + r() * 2.5).toFixed(1)}" fill="${cols[Math.floor(r() * cols.length)]}" opacity=".85"/>`);
    put(svg, `<defs>${sky(k + 's', [[0, '#a8cdeb'], [1, '#e8f2ec']])}${blur(k + 'b', 12)}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><g>${range(5, () => cloud(r() * 1600, 110 + r() * 200, 60 + r() * 60, (0.6 + r() * 0.3).toFixed(2), k + 'b'))}${glide(60, 0, 140)}</g>
    ${ridge(r, 470, 40, '#a9c2b4', {f: .6})}${ridge(r, 540, 55, '#94b77d', {f: .8})}${ridge(r, 640, 60, '#7fa863')}${flowers(640, 760, 70, ['#e8d35a', '#f4f0e6'])}
    ${ridge(r, 760, 50, '#64924c')}${flowers(770, 900, 130, ['#d8483e', '#e8d35a', '#f4f0e6', '#b98ad0'])}`); } };
