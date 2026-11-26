import { rng, uid, put, sky, glow, glints, stars, breathe } from './lib.js';
export default { id: 'full-moon-sea', name: 'ירח מלא מעל הים', tags: ['sea', 'night', 'coast'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#0a1530'], [1, '#2a3e66']])}${sky(k + 'w', [[0, '#1d2f55'], [1, '#060c1c']])}${glow(k + 'g', '#e9eeff', .45)}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${stars(r, 80, 480)}
    <circle cx="1050" cy="250" r="230" fill="url(#${k}g)"/><circle cx="1050" cy="250" r="64" fill="#eef1fb"/><circle cx="1032" cy="236" r="12" fill="#d9deee" opacity=".6"/><circle cx="1070" cy="270" r="8" fill="#d9deee" opacity=".5"/>
    <rect y="560" width="1600" height="340" fill="url(#${k}w)"/>
    <g>${glints(r, 1050, 568, 890, 80, '#eef1fb', .4)}${breathe('opacity', .65, 1, 10)}</g>`); } };
