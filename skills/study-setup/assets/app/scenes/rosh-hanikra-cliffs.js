import { rng, uid, put, sky, range } from './lib.js';
// Rosh HaNikra: white chalk cliffs dropping into a turquoise Mediterranean.
export default { id: 'rosh-hanikra-cliffs', name: 'צוקי ראש הנקרה', tags: ['sea', 'day', 'israel', 'coast', 'cliffs'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#6fa9d8'], [1, '#dcecf2']])}${sky(k + 'w', [[0, '#3f8fb8'], [.5, '#3fb0bb'], [1, '#86d4cc']])}
    <linearGradient id="${k}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3efe4"/><stop offset=".6" stop-color="#e2dccd"/><stop offset="1" stop-color="#b9b2a2"/></linearGradient></defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="420" cy="180" r="40" fill="#fffbea"/>
    <rect y="430" width="1600" height="470" fill="url(#${k}w)"/>
    ${range(22, i => `<rect x="${(r() * 1100).toFixed(0)}" y="${(440 + i * 14).toFixed(0)}" width="${(60 + r() * 200).toFixed(0)}" height="2" fill="#ffffff" opacity=".3"/>`)}
    <path d="M1600 250 L1380 260 C1300 262 1240 270 1200 300 C1170 330 1180 380 1150 420 C1120 470 1140 560 1100 620 C1070 680 1090 780 1040 900 L1600 900 Z" fill="url(#${k}c)"/>
    <path d="M1200 300 C1230 360 1220 420 1260 470 C1300 540 1280 640 1320 720 C1350 790 1330 860 1360 900" stroke="#c9c1ae" stroke-width="10" fill="none" opacity=".6"/>
    <path d="M1600 250 L1380 260 C1330 262 1290 266 1260 280 L1600 290 Z" fill="#7d9a5e"/>
    <path d="M1120 600 C1150 590 1180 620 1170 660 C1160 690 1120 690 1110 660 Z" fill="#1f4f60" opacity=".55"/>
    <path d="M1090 760 C1130 745 1170 780 1160 820 C1150 850 1100 850 1092 815 Z" fill="#1f4f60" opacity=".5"/>`); } };
