import { rng, uid, put, sky, glow, range, ridge } from './lib.js';
export default { id: 'wadi-acacia', name: 'שיטה בוואדי', tags: ['desert', 'afternoon', 'israel', 'cliffs', 'trees'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const wall = (side, c, lines) => { const pts = range(10, i => { const y = i * 100; const x = side === 'l' ? 380 + r() * 120 - i * 18 : 1220 - r() * 120 + i * 18; return ` L${x.toFixed(0)} ${y}`; }); const d = side === 'l' ? `M0 0${pts} L0 900 Z` : `M1600 0${pts} L1600 900 Z`; return `<path d="${d}" fill="${c}"/>` + range(lines, i => `<path d="M${side === 'l' ? 0 : 1600} ${80 + i * 70} L${side === 'l' ? 400 - i * 12 : 1200 + i * 12} ${80 + i * 70 + (r() * 10 - 5)}" stroke="#000" stroke-opacity=".08" stroke-width="3"/>`); };
    put(svg, `<defs>${sky(k + 's', [[0, '#8fb4d6'], [1, '#f1dcc0']])}${glow(k + 'g', '#fff4dc', .7)}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="800" cy="300" r="200" fill="url(#${k}g)"/>
    ${ridge(r, 575, 30, '#c79a74', {f: .6})}<path d="M0 900 L0 600 C400 590 1200 610 1600 595 L1600 900 Z" fill="#d7a979"/><path d="M500 900 C650 750 760 640 800 560 C840 640 950 750 1100 900 Z" fill="#e8c497"/>
    ${wall('l', '#b0704b', 9)}${wall('r', '#a3653f', 9)}
    <g transform="translate(860 700)"><path d="M0 0 C-4 -40 -18 -70 -40 -90 M0 -30 C14 -60 30 -80 46 -92" stroke="#4b3a2a" stroke-width="6" fill="none" stroke-linecap="round"/><rect x="-4" y="-30" width="8" height="40" fill="#4b3a2a"/>
    <ellipse cx="0" cy="-104" rx="110" ry="22" fill="#6e7a47"/><ellipse cx="-30" cy="-114" rx="70" ry="15" fill="#7f8b54"/><ellipse cx="20" cy="-96" rx="80" ry="14" fill="#5f6b3c"/><ellipse cx="0" cy="12" rx="90" ry="10" fill="#b48a5e" opacity=".55"/></g>`); } };
