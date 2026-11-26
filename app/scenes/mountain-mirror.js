import { rng, uid, put, sky, peaks, range } from './lib.js';
export default { id: 'mountain-mirror', name: 'הרים במראה', tags: ['mountains', 'water', 'classic'], seed: 127,
  draw(svg, { seed }){ const r = rng(seed), k = uid(); const m = peaks(r, 560, 230, 7, '#4c5c84') + peaks(r, 560, 150, 11, '#36446a');
    put(svg, `<defs>${sky(k + 's', [[0, '#8ea6cf'], [.75, '#e0c8d6'], [1, '#f1d6cf']])}${sky(k + 'w', [[0, '#7f97bf'], [1, '#2e3c5f']])}<clipPath id="${k}c"><rect y="560" width="1600" height="340"/></clipPath></defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${m}<rect y="560" width="1600" height="340" fill="url(#${k}w)"/><g clip-path="url(#${k}c)"><g transform="translate(0 1120) scale(1 -1)" opacity=".42">${m}</g></g>
    ${range(12, i => `<rect x="${(r() * 1400).toFixed(0)}" y="${590 + i * 24}" width="${(120 + r() * 260).toFixed(0)}" height="2" fill="#e8eef8" opacity=".18"/>`)}`); } };
