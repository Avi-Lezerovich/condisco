import { rng, uid, put, sky, ridge, breathe } from './lib.js';
export default { id: 'negev-dunes-noon', name: 'דיונות בנגב', tags: ['desert', 'day', 'israel'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const dune = (y, amp, c, sh) => { const a = r() * 6, w = 380 + r() * 200; let top = ''; for (let x = 0; x <= 1600; x += 20) top += ` L${x} ${(y - amp * Math.pow(Math.abs(Math.sin(x / w + a)), 1.6)).toFixed(1)}`; return `<path d="M0 900${top} L1600 900 Z" fill="${c}"/><path d="M0 900${top} L1600 900 Z" fill="${sh}" opacity=".35" transform="translate(18 14)"/>`; };
    put(svg, `<defs>${sky(k + 's', [[0, '#7fb2dc'], [.7, '#d7e6ee'], [1, '#f4e7cf']])}${sky(k + 'h', [[0, '#ffffff', 0], [1, '#fff6e4', .7]])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><rect y="420" width="1600" height="140" fill="url(#${k}h)">${breathe('opacity', .6, 1, 16)}</rect>
    ${ridge(r, 520, 26, '#d9b892', {f: .5})}${dune(600, 90, '#e5bf8a', '#b98d5a')}${dune(700, 110, '#dcae74', '#a87a46')}${dune(810, 120, '#d09b5e', '#9a6a39')}${dune(900, 90, '#c38a4c', '#8c5c2d')}`); } };
