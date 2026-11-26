import { rng, uid, put, sky, glow, ridge, glints } from './lib.js';
// From the Arbel cliff: the Kinneret below, the Golan Heights across, late-afternoon light.
export default { id: 'arbel-kinneret-view', name: 'הכנרת מצוק הארבל', tags: ['water', 'afternoon', 'israel', 'cliffs', 'hills'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#87acd2'], [.7, '#e9dcc8'], [1, '#f6e2c0']])}${glow(k + 'g', '#fff1d2', .8)}${sky(k + 'w', [[0, '#9fb9cf'], [1, '#4f7695']])}
    <linearGradient id="${k}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d4a3c"/><stop offset=".8" stop-color="#8a6a50"/><stop offset="1" stop-color="#b08a66"/></linearGradient></defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="380" cy="230" r="240" fill="url(#${k}g)"/><circle cx="380" cy="230" r="38" fill="#fff3da"/>
    ${ridge(r, 370, 40, '#9fa7b8', {f: .3})}${ridge(r, 395, 22, '#8c98a8', {f: .5})}
    <path d="M0 470 C300 420 700 400 1000 410 C1250 418 1450 440 1600 450 L1600 900 L0 900 Z" fill="url(#${k}w)"/>
    ${glints(r, 380, 430, 640, 50, '#fff3da', .5)}
    <path d="M500 900 C640 760 820 640 1050 560 C1250 500 1450 480 1600 478 L1600 900 Z" fill="#7f8f5c"/>
    <path d="M760 900 C860 790 1020 690 1200 630 C1350 590 1500 580 1600 580 L1600 900 Z" fill="#66784a"/>
    <path d="M1600 0 L1600 900 L1080 900 C1120 820 1180 760 1230 700 C1290 620 1270 520 1330 440 C1370 380 1360 300 1420 230 C1470 170 1480 80 1520 0 Z" fill="url(#${k}c)"/>
    <path d="M1230 700 C1290 620 1270 520 1330 440 C1370 380 1360 300 1420 230" stroke="#c9a37c" stroke-width="6" fill="none" opacity=".5"/>`); } };
