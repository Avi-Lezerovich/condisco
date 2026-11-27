import { rng, uid, put, sky, range, breathe } from './lib.js';
export default { id: 'tide-pools-morning', name: 'בריכות גאות בבוקר', tags: ['sea', 'morning', 'coast', 'rocks'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const rock = (cx, cy, s, c) => { let d = ''; const n = 9; for (let i = 0; i < n; i++) { const a = i / n * 6.283, q = s * (0.75 + r() * 0.35); d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * q).toFixed(0)} ${(cy + Math.sin(a) * q * .45).toFixed(0)} `; } return `<path d="${d}Z" fill="${c}"/>`; };
    put(svg, `<defs>${sky(k + 's', [[0, '#bcd6ea'], [1, '#f6ead8']])}${sky(k + 'w', [[0, '#93c3d6'], [1, '#4d8aa6']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="300" cy="330" r="40" fill="#fff6e2"/>
    <rect y="480" width="1600" height="420" fill="url(#${k}w)"/>
    <g>${range(16, i => `<rect x="${(r() * 1500).toFixed(0)}" y="${(490 + i * 10).toFixed(0)}" width="${(80 + r() * 200).toFixed(0)}" height="1.6" fill="#ffffff" opacity=".35"/>`)}${breathe('opacity', .5, 1, 9)}</g>
    <path d="M0 640 C300 600 700 660 1100 620 S1500 600 1600 630 L1600 900 L0 900 Z" fill="#8a7a6a"/>
    ${range(10, () => `<ellipse cx="${(r() * 1600).toFixed(0)}" cy="${(700 + r() * 170).toFixed(0)}" rx="${(60 + r() * 120).toFixed(0)}" ry="${(14 + r() * 18).toFixed(0)}" fill="#9fcadb" opacity=".85"/>`)}
    ${range(22, () => rock(r() * 1600, 660 + r() * 240, 30 + r() * 70, ['#6b5d50', '#7a6b5c', '#5a4e44'][Math.floor(r() * 3)]))}`); } };
