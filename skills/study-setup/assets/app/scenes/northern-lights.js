import { rng, uid, put, sky, peaks, range } from './lib.js';
export default { id: 'northern-lights', name: 'זוהר צפוני', tags: ['night', 'water', 'classic'], seed: 109,
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const ribbon = (y, amp, c, o) => { let d = `M-50 ${y}`; for (let x = 0; x <= 1650; x += 50) d += ` L${x} ${(y + amp * Math.sin(x / 230 + r())).toFixed(1)}`; return `<path d="${d}" fill="none" stroke="url(#${k}a)" stroke-width="${c}" opacity="${o}" filter="url(#${k}b)" stroke-linecap="round"/>`; };
    const sky8 = ribbon(210, 40, 90, .55) + ribbon(260, 55, 60, .45) + ribbon(180, 30, 40, .4);
    put(svg, `<defs>${sky(k + 's', [[0, '#061321'], [1, '#0f2b3b']])}${sky(k + 'w', [[0, '#0c2230'], [1, '#040b12']])}<linearGradient id="${k}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ef0c6"/><stop offset="1" stop-color="#3aa7b8"/></linearGradient><clipPath id="${k}c"><rect y="610" width="1600" height="290"/></clipPath><filter id="${k}b" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="18"/></filter></defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/>${range(90, () => `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 560).toFixed(0)}" r="${(0.6 + r() * 1.3).toFixed(1)}" fill="#fff" opacity="${(0.2 + r() * 0.6).toFixed(2)}"/>`)}
    ${sky8}${peaks(r, 610, 120, 9, '#08141d')}<rect y="610" width="1600" height="290" fill="url(#${k}w)"/><g clip-path="url(#${k}c)"><g transform="translate(0 1220) scale(1 -1)" opacity=".35">${sky8}</g></g>`); } };
