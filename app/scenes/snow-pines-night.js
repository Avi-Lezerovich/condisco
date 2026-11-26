import { rng, uid, put, sky, glow, stars, range } from './lib.js';
export default { id: 'snow-pines-night', name: 'אורנים בלילה מושלג', tags: ['forest', 'winter', 'snow', 'night'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const tree = (x, base, h, c, snow) => { const w = h * .3; let s = `<g fill="${c}">`; for (let i = 0; i < 3; i++) { const y = base - h * (i * .28), ww = w * (1 - i * .25); s += `<path d="M${x} ${(y - h * .45).toFixed(0)} L${(x - ww).toFixed(0)} ${y.toFixed(0)} L${(x + ww).toFixed(0)} ${y.toFixed(0)} Z"/>`; } return s + `</g><path d="M${x} ${(base - h * 1.01).toFixed(0)} L${(x - w * .25).toFixed(0)} ${(base - h * .82).toFixed(0)} L${(x + w * .25).toFixed(0)} ${(base - h * .82).toFixed(0)} Z" fill="${snow}" opacity=".8"/>`; };
    const row = (base, n, h, c, snow) => range(n, () => tree(Math.round(r() * 1640 - 20), base + r() * 20, h * (0.6 + r() * 0.6), c, snow));
    put(svg, `<defs>${sky(k + 's', [[0, '#0e1a33'], [1, '#33476e']])}${glow(k + 'g', '#dfe8ff', .4)}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${stars(r, 90, 420)}<circle cx="300" cy="200" r="160" fill="url(#${k}g)"/><circle cx="300" cy="200" r="34" fill="#e6ecfb"/>
    <path d="M0 600 C400 560 900 620 1600 570 L1600 900 L0 900 Z" fill="#c4d0e6"/>${row(610, 40, 120, '#2a3d5e', '#dfe7f4')}
    <path d="M0 720 C500 690 1000 740 1600 700 L1600 900 L0 900 Z" fill="#dbe3f1"/>${row(740, 22, 220, '#1d2c47', '#eef2f9')}
    <path d="M0 850 C500 830 1100 870 1600 840 L1600 900 L0 900 Z" fill="#eef2f9"/>
    <g>${range(70, () => `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 900).toFixed(0)}" r="${(1 + r() * 1.8).toFixed(1)}" fill="#ffffff" opacity="${(0.35 + r() * 0.5).toFixed(2)}"/>`)}<animateTransform attributeName="transform" type="translate" values="0 -24;-12 24;0 -24" dur="30s" repeatCount="indefinite"/></g>`); } };
