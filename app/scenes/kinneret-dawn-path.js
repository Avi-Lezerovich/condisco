import { rng, uid, put, sky, glow, ridge, glints, breathe, range } from './lib.js';
// Lake at dawn with a winding shore path (a morning dog-walk route), no figures.
export default { id: 'kinneret-dawn-path', name: 'שביל ליד הכנרת בזריחה', tags: ['water', 'morning', 'israel', 'path'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#9fb3cf'], [.5, '#f1c9b0'], [1, '#f7dcb8']])}${sky(k + 'w', [[0, '#e9c3ab'], [.35, '#9fb0c6'], [1, '#55708f']])}${glow(k + 'g', '#fff0cf', .85)}${sky(k + 'n', [[0, '#7c8a63'], [1, '#4d5a3f']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="520" cy="470" r="280" fill="url(#${k}g)">${breathe('opacity', .85, 1, 14)}</circle><circle cx="520" cy="470" r="48" fill="#fff0cf"/>
    ${ridge(r, 470, 28, '#8c8aa8', {op: .7, f: .6})}${ridge(r, 490, 18, '#6f7194', {f: .9})}
    <rect y="495" width="1600" height="405" fill="url(#${k}w)"/>
    <g>${glints(r, 520, 505, 700, 55, '#fff0cf', .5)}${breathe('opacity', .75, 1, 10)}</g>
    <path d="M1600 560 C1350 600 1150 640 1000 700 C860 760 900 830 1020 900 L1600 900 Z" fill="url(#${k}n)"/>
    <path d="M1600 600 C1400 640 1210 680 1080 740 C990 785 1010 850 1090 900" fill="none" stroke="#e7d2ae" stroke-width="22" stroke-linecap="round" opacity=".85"/>
    <path d="M1600 600 C1400 640 1210 680 1080 740 C990 785 1010 850 1090 900" fill="none" stroke="#cdb48c" stroke-width="5" stroke-dasharray="2 22" stroke-linecap="round" opacity=".6"/>
    ${range(26, () => { const x = 1120 + r() * 480, y = 600 + r() * 280, h = 20 + r() * 40; return `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q${(r() * 10 - 5).toFixed(0)} ${(-h).toFixed(0)} ${(r() * 14 - 7).toFixed(0)} ${(-h * 1.3).toFixed(0)}" stroke="#3f4a33" stroke-width="2.4" fill="none" opacity=".7"/>`; })}`); } };
