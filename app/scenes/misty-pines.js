import { rng, uid, put, sky, pines } from './lib.js';
export default { id: 'misty-pines', name: 'אורנים בערפל', tags: ['forest', 'mist', 'classic'], seed: 67,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    put(svg, `<defs>${sky(k + 's', [[0, '#e4f0ea'], [1, '#b4d3c6']])}${sky(k + 'm', [[0, '#ffffff', 0], [.55, '#ffffff'], [1, '#ffffff', 0]])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${pines(r, 560, 60, 170, '#8fb5a5')}<rect y="552" width="1600" height="348" fill="#8fb5a5"/><rect y="470" width="1600" height="110" fill="url(#${k}m)" opacity=".55"/>${pines(r, 700, 50, 230, '#5e8a77')}<rect y="692" width="1600" height="208" fill="#5e8a77"/><rect y="610" width="1600" height="110" fill="url(#${k}m)" opacity=".35"/>${pines(r, 900, 36, 330, '#355c4c')}`); } };
