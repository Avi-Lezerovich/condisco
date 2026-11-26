import { rng, uid, put, sky, glow, ridge, breathe, glide } from './lib.js';
export default { id: 'valley-fog-sunrise', name: 'ערפל בעמק עם זריחה', tags: ['mist', 'morning', 'hills'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#f3d7c2'], [.6, '#f8e6cf'], [1, '#fdf2e2']])}${glow(k + 'g', '#ffe6b8', .95)}${sky(k + 'f', [[0, '#ffffff', 0], [.5, '#fff8ee', .9], [1, '#fff8ee', 0]])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="800" cy="420" r="380" fill="url(#${k}g)"/><circle cx="800" cy="420" r="56" fill="#fff1d2"/>
    ${ridge(r, 470, 50, '#c8a7a0', {f: .5, op: .8})}<rect y="420" width="1600" height="170" fill="url(#${k}f)"><animate attributeName="y" values="440;452;440" dur="20s" repeatCount="indefinite"/></rect>
    ${ridge(r, 590, 70, '#9a7f86')}<g>${'<rect y="540" width="1600" height="170" fill="url(#' + k + 'f)"/>'}${glide(-30, 6, 60)}</g>
    ${ridge(r, 730, 60, '#6d5a6a')}<rect y="680" width="1600" height="140" fill="url(#${k}f)" opacity=".6">${breathe('opacity', .45, .7, 15)}</rect>
    ${ridge(r, 860, 50, '#43394a')}`); } };
