import { rng, uid, put, sky, smooth } from './lib.js';
export default { id: 'meadow-tree', name: 'עץ באחו', tags: ['hills', 'spring', 'day', 'classic'], seed: 139,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#dcebf3'], [1, '#fbf0d6']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="380" cy="300" r="54" fill="#fff6dc" opacity=".9"/>${smooth(r, 560, 50, '#c8dcab')}${smooth(r, 640, 60, '#a6c88e')}
    <g transform="translate(1060 600)"><rect x="-6" y="-10" width="12" height="70" rx="4" fill="#5a4a3a"/><circle cx="0" cy="-40" r="46" fill="#4f7d52"/><circle cx="-34" cy="-14" r="32" fill="#5b8c5c"/><circle cx="34" cy="-16" r="34" fill="#46744a"/></g>
    ${smooth(r, 740, 50, '#7aa56f')}${smooth(r, 840, 40, '#55825a')}`); } };
