import { rng, uid, put, sky, glow, ridge, range } from './lib.js';
export default { id: 'oasis-palms-dawn', name: 'דקלים בנווה מדבר', tags: ['desert', 'morning', 'israel', 'trees'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const palm = (x, base, h, c) => { const tx = x + (r() - .5) * 50, ty = base - h; const fronds = range(9, i => { const a = -Math.PI + (i / 8) * Math.PI + (r() - .5) * .2, L = h * (0.32 + r() * 0.1), ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * .6 + L * .25; return `<path d="M${tx.toFixed(0)} ${ty.toFixed(0)} Q${((tx + ex) / 2).toFixed(0)} ${(ty - L * .25).toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}" stroke="${c}" stroke-width="${(h * .03).toFixed(1)}" fill="none" stroke-linecap="round"/>`; }); return `<path d="M${x} ${base} Q${((x + tx) / 2 + 15).toFixed(0)} ${(base - h / 2).toFixed(0)} ${tx.toFixed(0)} ${ty.toFixed(0)}" stroke="${c}" stroke-width="${(h * .035).toFixed(1)}" fill="none"/>${fronds}`; };
    put(svg, `<defs>${sky(k + 's', [[0, '#7d87b5'], [.5, '#e8b3a0'], [1, '#f8d8a8']])}${glow(k + 'g', '#ffe2b0', .9)}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="1150" cy="560" r="320" fill="url(#${k}g)"/><circle cx="1150" cy="560" r="54" fill="#ffe6b8"/>
    ${ridge(r, 560, 120, '#b98a8c', {f: .35})}${ridge(r, 620, 40, '#8a6a74', {f: .6})}
    <path d="M0 760 C400 720 900 770 1600 730 L1600 900 L0 900 Z" fill="#3f3240"/>
    ${palm(220, 780, 360, '#2e2430')}${palm(380, 790, 280, '#2e2430')}${palm(1450, 770, 330, '#2e2430')}${palm(1320, 790, 240, '#2e2430')}${palm(560, 800, 200, '#2e2430')}`); } };
