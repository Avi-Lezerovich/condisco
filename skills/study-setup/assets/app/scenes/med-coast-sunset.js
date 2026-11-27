import { rng, uid, put, sky, glow, glints, breathe } from './lib.js';
export default { id: 'med-coast-sunset', name: 'שקיעה בחוף הים התיכון', tags: ['sea', 'evening', 'israel', 'coast'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#5a6aa0'], [.5, '#e59a86'], [.85, '#f7c27e'], [1, '#fbd99a']])}${sky(k + 'w', [[0, '#d98e74'], [.3, '#6f6c95'], [1, '#2e3b62']])}${glow(k + 'g', '#ffd39a', .85)}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="700" cy="545" r="300" fill="url(#${k}g)"/><circle cx="700" cy="545" r="58" fill="#ffd9a0"/>
    <rect y="550" width="1600" height="350" fill="url(#${k}w)"/>
    <g>${glints(r, 700, 556, 820, 70, '#ffd9a0', .45)}${breathe('opacity', .7, 1, 9)}</g>
    <path d="M1600 470 L1360 480 C1320 500 1300 540 1270 560 C1240 600 1260 650 1200 700 C1150 760 1180 840 1120 900 L1600 900 Z" fill="#7a5048"/>
    <path d="M1600 520 L1420 525 C1390 560 1380 600 1350 640 C1320 700 1330 780 1300 900 L1600 900 Z" fill="#5a3a3a"/>
    <path d="M0 860 C200 840 500 850 800 880 L800 900 L0 900 Z" fill="#c9a07a"/>`); } };
