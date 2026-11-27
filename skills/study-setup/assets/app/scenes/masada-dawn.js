import { rng, uid, put, sky, glow, ridge, range } from './lib.js';
// Masada at first light: the sun rises over the mountains of Moab, across the Dead Sea.
export default { id: 'masada-dawn', name: 'מצדה בזריחה', tags: ['desert', 'morning', 'israel', 'cliffs'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#5d5f8f'], [.45, '#c99aa8'], [.75, '#f4c39a'], [1, '#fbdcb2']])}${glow(k + 'g', '#ffe3b0', .9)}
    <linearGradient id="${k}m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a4f4c"/><stop offset=".55" stop-color="#b97860"/><stop offset=".56" stop-color="#d79a72"/><stop offset="1" stop-color="#e8b285"/></linearGradient>
    ${sky(k + 'w', [[0, '#e9c9b8'], [1, '#a9b4c4']])}${sky(k + 'f', [[0, '#8a5a4c'], [1, '#3e2a2e']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="1180" cy="430" r="340" fill="url(#${k}g)"/><circle cx="1180" cy="430" r="44" fill="#fff0cf"/>
    ${ridge(r, 455, 34, '#a98aa0', {f: .35})}${ridge(r, 478, 18, '#8f7590', {f: .6})}
    <rect y="480" width="1600" height="60" fill="url(#${k}w)"/>
    ${range(10, i => `<rect x="${(900 + r() * 500).toFixed(0)}" y="${(486 + i * 5).toFixed(0)}" width="${(40 + r() * 120).toFixed(0)}" height="1.6" fill="#fff0cf" opacity=".45"/>`)}
    <path d="M0 900 L0 560 C200 545 360 560 470 540 L540 470 L560 452 L800 446 L830 458 L880 540 C1000 560 1200 548 1600 562 L1600 900 Z" fill="#6e4846"/>
    <path d="M520 560 L560 452 L800 446 L830 458 L880 560 Z" fill="url(#${k}m)"/>
    <path d="M556 452 L800 446 L806 452 L560 458 Z" fill="#f2c595" opacity=".8"/>
    ${range(7, i => `<path d="M${590 + i * 34} ${460 + (i % 2) * 4} l${8 + r() * 6} ${60 + r() * 40}" stroke="#5a3a3c" stroke-width="3" opacity=".25"/>`)}
    ${ridge(r, 640, 40, 'url(#' + k + 'f)', {f: .7})}${ridge(r, 780, 40, '#2e2026', {f: 1})}`); } };
