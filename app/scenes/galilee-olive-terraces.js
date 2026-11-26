import { rng, uid, put, sky, glow, ridge, range } from './lib.js';
export default { id: 'galilee-olive-terraces', name: 'טרסות זיתים', tags: ['hills', 'afternoon', 'israel', 'trees'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const terrace = (y, c, stone) => { const a = r() * 6; let d = `M0 900 L0 ${y}`; for (let x = 0; x <= 1600; x += 40) d += ` L${x} ${(y + 22 * Math.sin(x / 300 + a)).toFixed(1)}`; return `<path d="${d} L1600 900 Z" fill="${c}"/><path d="${d.replace('M0 900 L', 'M')}" fill="none" stroke="${stone}" stroke-width="5" opacity=".7"/>`; };
    const olives = (y, n, s, c) => range(n, () => { const x = r() * 1600, yy = y + r() * 30 - 10, q = s * (0.7 + r() * 0.5); return `<g transform="translate(${x.toFixed(0)} ${yy.toFixed(0)})"><rect x="-2" y="-2" width="4" height="${(q * .7).toFixed(0)}" fill="#5b4e3e"/><ellipse cx="0" cy="${(-q * .3).toFixed(0)}" rx="${q.toFixed(0)}" ry="${(q * .62).toFixed(0)}" fill="${c}"/><ellipse cx="${(q * .3).toFixed(0)}" cy="${(-q * .5).toFixed(0)}" rx="${(q * .55).toFixed(0)}" ry="${(q * .4).toFixed(0)}" fill="#a6b08e" opacity=".55"/></g>`; });
    put(svg, `<defs>${sky(k + 's', [[0, '#bcd3e4'], [1, '#f2e6cf']])}${glow(k + 'g', '#fff6dd', .7)}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="1250" cy="260" r="220" fill="url(#${k}g)"/><circle cx="1250" cy="260" r="40" fill="#fff6dd"/>
    ${ridge(r, 430, 50, '#b6bfae', {f: .5})}
    ${terrace(500, '#c9c09a', '#e1d7b8')}${olives(505, 16, 14, '#7e8a68')}
    ${terrace(590, '#bcb187', '#d9cda7')}${olives(595, 13, 22, '#727f5c')}
    ${terrace(690, '#ab9f76', '#cdbf96')}${olives(698, 10, 32, '#66734f')}
    ${terrace(800, '#988b64', '#c1b28a')}${olives(812, 7, 48, '#5a6745')}`); } };
