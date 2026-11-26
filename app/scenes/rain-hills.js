import { rng, uid, put, sky, ridge, range } from './lib.js';
export default { id: 'rain-hills', name: 'גשם על הגבעות', tags: ['hills', 'winter', 'rain'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#8e9aa6'], [1, '#c9d0d4']])}${sky(k + 'v', [[0, '#7f8b98', .7], [1, '#7f8b98', 0]])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>
    ${range(6, () => { const x = r() * 1600; return `<rect x="${x.toFixed(0)}" y="0" width="${(140 + r() * 220).toFixed(0)}" height="620" fill="url(#${k}v)" opacity=".45" transform="skewX(-8)"/>`; })}
    ${ridge(r, 520, 40, '#a3ab9f', {f: .6, op: .8})}${ridge(r, 610, 50, '#7f8d79')}${ridge(r, 720, 55, '#5e6f59')}${ridge(r, 830, 40, '#465542')}
    <g opacity=".4">${range(140, () => { const x = r() * 1700, y = r() * 900; return `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l-6 26" stroke="#e8eef2" stroke-width="1.2"/>`; })}<animateTransform attributeName="transform" type="translate" values="0 -30;-8 30;0 -30" dur="7s" repeatCount="indefinite"/></g>`); } };
