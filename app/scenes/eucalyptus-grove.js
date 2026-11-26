import { rng, uid, put, sky, glow, range } from './lib.js';
export default { id: 'eucalyptus-grove', name: 'חורשת אקליפטוס', tags: ['forest', 'morning', 'israel', 'trees'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const trunks = (n, w, c, top) => range(n, () => { const x = r() * 1640 - 20, ww = w * (0.6 + r() * 0.7), lean = (r() - .5) * 60; return `<path d="M${(x - ww).toFixed(0)} 900 C${(x - ww * .6).toFixed(0)} 600 ${(x + lean - ww * .3).toFixed(0)} 300 ${(x + lean).toFixed(0)} ${top} L${(x + lean + ww * .4).toFixed(0)} ${top} C${(x + lean + ww * .4).toFixed(0)} 300 ${(x + ww * .6).toFixed(0)} 600 ${(x + ww).toFixed(0)} 900 Z" fill="${c}"/>`; });
    put(svg, `<defs>${sky(k + 's', [[0, '#cfdccd'], [1, '#f2ecd8']])}${glow(k + 'g', '#fff8e0', .9)}${sky(k + 'c', [[0, '#5d7a62'], [1, '#86a183', 0]])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="900" cy="380" r="420" fill="url(#${k}g)"/>
    ${trunks(14, 10, '#c3c7b6', -20)}${trunks(9, 18, '#a7ab98', -20)}${trunks(5, 30, '#8a8c78', -20)}
    <rect width="1600" height="300" fill="url(#${k}c)"/>
    ${range(16, i => `<rect x="${(200 + r() * 1100).toFixed(0)}" y="0" width="${(30 + r() * 60).toFixed(0)}" height="900" fill="#fff8e0" opacity="${(0.05 + r() * 0.08).toFixed(2)}" transform="skewX(14)"/>`)}
    <rect y="830" width="1600" height="70" fill="#a99a73"/>`); } };
