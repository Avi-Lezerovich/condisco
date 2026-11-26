import { rng, uid, put, sky, ridge, range } from './lib.js';
export default { id: 'autumn-forest', name: 'יער בסתיו', tags: ['forest', 'autumn', 'afternoon'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const canopy = (y, n, s, cols) => range(n, () => { const x = r() * 1640 - 20, q = s * (0.6 + r() * 0.6); return `<ellipse cx="${x.toFixed(0)}" cy="${(y - q * .4 + r() * 20).toFixed(0)}" rx="${q.toFixed(0)}" ry="${(q * .8).toFixed(0)}" fill="${cols[Math.floor(r() * cols.length)]}"/>`; });
    put(svg, `<defs>${sky(k + 's', [[0, '#c9d6e0'], [1, '#f4dcc0']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="400" cy="320" r="50" fill="#fff0d4" opacity=".9"/>
    ${ridge(r, 480, 40, '#c7b3a2', {f: .6})}${canopy(560, 70, 34, ['#d9a77a', '#c99a72', '#e0b98c'])}<rect y="550" width="1600" height="350" fill="#c99a72"/>
    ${canopy(680, 60, 48, ['#c9773f', '#b8642f', '#d8964a', '#a9803d'])}<rect y="670" width="1600" height="230" fill="#b8642f"/>
    ${canopy(830, 40, 70, ['#9c4a25', '#8a3d22', '#b06a2a', '#7a6a2c'])}<rect y="820" width="1600" height="80" fill="#7c3a1f"/>`); } };
