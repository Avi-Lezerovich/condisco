import { rng, uid, put, sky, glow, ridge, range } from './lib.js';
export default { id: 'lavender-rows-dusk', name: 'שורות לבנדר בערב', tags: ['fields', 'evening', 'summer'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#5d5a93'], [.6, '#e0a7a8'], [1, '#f6cfa4']])}${glow(k + 'g', '#ffd9a8', .8)}${sky(k + 'f', [[0, '#8a6aa8'], [1, '#3e2c5c']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="800" cy="520" r="300" fill="url(#${k}g)"/><circle cx="800" cy="520" r="50" fill="#ffe1b4"/>
    ${ridge(r, 530, 30, '#7d6a90', {f: .5})}<rect y="530" width="1600" height="370" fill="url(#${k}f)"/>
    ${range(15, i => { const xb = -1400 + i * 300; return `<path d="M800 532 L${xb} 900 L${xb + 150} 900 Z" fill="#6c4b92" opacity=".75"/>`; })}
    ${range(15, i => { const xb = -1250 + i * 300; return `<path d="M800 532 L${xb} 900 L${xb + 40} 900 Z" fill="#4b6b45" opacity=".45"/>`; })}`); } };
