import { rng, uid, put, sky, ridge, stars, range } from './lib.js';
export default { id: 'jerusalem-hills-twilight', name: 'הרי ירושלים בין ערביים', tags: ['hills', 'evening', 'israel'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const terraces = (y0, n, c) => range(n, i => { const y = y0 + i * 22, a = r() * 6; let d = `M0 ${y}`; for (let x = 0; x <= 1600; x += 50) d += ` L${x} ${(y + 10 * Math.sin(x / 200 + a)).toFixed(1)}`; return `<path d="${d}" stroke="${c}" stroke-width="2" fill="none" opacity=".35"/>`; });
    put(svg, `<defs>${sky(k + 's', [[0, '#26305a'], [.55, '#7d6a95'], [.85, '#e0a58e'], [1, '#f1c49a']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${stars(r, 50, 260, '#ffffff', 1.1)}<circle cx="1260" cy="180" r="3" fill="#fff8e0"/>
    ${ridge(r, 520, 60, '#8c7896', {f: .4})}${ridge(r, 600, 70, '#6c5a7c', {f: .55})}
    ${ridge(r, 700, 70, '#4f4262', {f: .7})}
    ${ridge(r, 820, 60, '#332b45')}${range(24, () => `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(800 + r() * 80).toFixed(0)}" r="${(6 + r() * 8).toFixed(0)}" fill="#272037"/>`)}`); } };
