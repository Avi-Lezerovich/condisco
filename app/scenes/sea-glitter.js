import { rng, uid, put, sky, smooth, range } from './lib.js';
export default { id: 'sea-glitter', name: 'ים נוצץ', tags: ['water', 'sea', 'classic'], seed: 97,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#a9d2ea'], [.6, '#d8e8ee'], [1, '#f6e4c9']])}${sky(k + 'w', [[0, '#5b97bd'], [1, '#1d4a6c']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="820" cy="520" r="44" fill="#fff4dc"/>${smooth(r, 548, 16, '#7a9bb3', .7, 2)}<rect y="560" width="1600" height="340" fill="url(#${k}w)"/>
    ${range(60, () => { const y = 570 + r() * 320, spread = (y - 560) * 0.55 + 20; return `<rect x="${(820 - spread + r() * spread * 2).toFixed(0)}" y="${y.toFixed(0)}" width="${(10 + r() * 34).toFixed(0)}" height="2" rx="1" fill="#fff4dc" opacity="${(0.15 + r() * 0.5).toFixed(2)}"/>`; })}`); } };
