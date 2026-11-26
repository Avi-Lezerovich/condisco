import { rng, uid, put, sky, peaks, pines } from './lib.js';
export default { id: 'alpine-pink', name: 'פסגות בוורוד', tags: ['mountains', 'snow', 'morning', 'evening', 'classic'], seed: 151,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#b7c5e6'], [.6, '#efd3d3'], [1, '#f8dcc8']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${peaks(r, 640, 330, 6, '#f3e3e9')}${peaks(r, 660, 250, 9, '#c9b8d3')}${peaks(r, 700, 160, 12, '#8f86ad')}${pines(r, 900, 70, 210, '#2e3c52')}<rect y="880" width="1600" height="20" fill="#2e3c52"/>`); } };
