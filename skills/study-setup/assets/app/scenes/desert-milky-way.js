import { rng, uid, put, sky, blur, ridge, stars, range, breathe } from './lib.js';
export default { id: 'desert-milky-way', name: 'שביל החלב מעל המדבר', tags: ['desert', 'night', 'israel', 'stars'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#070b1c'], [.75, '#1a2140'], [1, '#3b2f4a']])}${blur(k + 'b', 30)}<linearGradient id="${k}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8c4e8" stop-opacity="0"/><stop offset=".5" stop-color="#e8dcf0" stop-opacity=".45"/><stop offset="1" stop-color="#c8c4e8" stop-opacity="0"/></linearGradient></defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>
    <g>${breathe('opacity', .8, 1, 18)}<path d="M200 -50 C600 200 900 380 1500 700" stroke="url(#${k}m)" stroke-width="170" fill="none" filter="url(#${k}b)"/>
    ${range(220, () => { const t = r(), x = 200 + t * 1300 + (r() - .5) * 220, y = -50 + t * 750 + (r() - .5) * 200; return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(0.4 + r() * 1.1).toFixed(1)}" fill="#ffffff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`; })}</g>
    ${stars(r, 120, 640, '#ffffff', 1.4)}
    ${ridge(r, 690, 40, '#1a1626', {f: .5})}${ridge(r, 790, 30, '#100d18', {f: .8})}`); } };
