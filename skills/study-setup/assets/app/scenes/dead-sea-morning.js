import { rng, uid, put, sky, glow, ridge, range, breathe } from './lib.js';
export default { id: 'dead-sea-morning', name: 'ים המלח בבוקר', tags: ['water', 'morning', 'israel', 'desert'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#c7d6e6'], [1, '#f6e2d0']])}${sky(k + 'w', [[0, '#b9d8dc'], [1, '#7fb7c0']])}${glow(k + 'g', '#fff7e8', .9)}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="1000" cy="330" r="260" fill="url(#${k}g)"/><circle cx="1000" cy="330" r="44" fill="#fff9ec"/>
    ${ridge(r, 470, 70, '#d4b3b8', {f: .45})}${ridge(r, 505, 40, '#c49aa3', {f: .7})}
    <rect y="515" width="1600" height="385" fill="url(#${k}w)"/>
    <g>${range(18, i => `<rect x="${(r() * 1500).toFixed(0)}" y="${(530 + i * 12).toFixed(0)}" width="${(80 + r() * 260).toFixed(0)}" height="1.6" fill="#ffffff" opacity=".35"/>`)}${breathe('opacity', .6, 1, 12)}</g>
    ${range(14, () => { const x = r() * 1600, y = 690 + r() * 200, w = 40 + r() * 140; return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${w.toFixed(0)}" ry="${(w * .12).toFixed(1)}" fill="#f4f1ea" opacity="${(0.6 + r() * 0.35).toFixed(2)}"/>`; })}
    <path d="M0 820 C300 800 600 840 900 815 S1400 800 1600 830 L1600 900 L0 900 Z" fill="#efe8dc"/>`); } };
