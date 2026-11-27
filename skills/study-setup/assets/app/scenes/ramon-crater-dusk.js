import { rng, uid, put, sky, glow, stars, ridge } from './lib.js';
export default { id: 'ramon-crater-dusk', name: 'מכתש רמון בדמדומים', tags: ['desert', 'evening', 'israel', 'cliffs'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const mesa = (y, h, c, x0 = 0, x1 = 1600) => { let d = `M${x0} 900 L${x0} ${y}`, x = x0; while (x < x1) { const run = 80 + r() * 220, top = y - h * (0.6 + r() * 0.4); d += ` L${(x + 20).toFixed(0)} ${top.toFixed(0)} L${(x + run).toFixed(0)} ${(top + r() * 8).toFixed(0)} L${(x + run + 25).toFixed(0)} ${(y - r() * 10).toFixed(0)}`; x += run + 25; } return `<path d="${d} L${x1} 900 Z" fill="${c}"/>`; };
    put(svg, `<defs>${sky(k + 's', [[0, '#2f3b6b'], [.45, '#a36c87'], [.8, '#f09a6a'], [1, '#f7c07c']])}${glow(k + 'g', '#ffd08a', .7)}${sky(k + 'f', [[0, '#8a4f4a'], [1, '#3a2433']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${stars(r, 40, 220, '#ffffff', 1)}<circle cx="980" cy="560" r="360" fill="url(#${k}g)"/>
    ${mesa(560, 60, '#7a4b5c')}<rect y="600" width="1600" height="300" fill="url(#${k}f)"/>
    <path d="M0 640 C300 610 600 680 900 650 S1400 620 1600 660 L1600 900 L0 900 Z" fill="#5c3640" opacity=".8"/>
    <path d="M0 720 C260 700 520 760 820 730 S1300 700 1600 740 L1600 900 L0 900 Z" fill="#45293a"/>
    ${ridge(r, 830, 45, '#2e1c2b', {f: .7})}`); } };
