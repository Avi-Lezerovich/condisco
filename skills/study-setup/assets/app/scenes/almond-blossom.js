import { rng, uid, put, sky, ridge, range } from './lib.js';
export default { id: 'almond-blossom', name: 'שקדיות בפריחה', tags: ['hills', 'spring', 'day', 'israel', 'trees'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const tree = (x, base, s) => `<g transform="translate(${x.toFixed(0)} ${base.toFixed(0)})"><path d="M0 0 L0 ${(-s * .6).toFixed(0)} M0 ${(-s * .35).toFixed(0)} L${(-s * .35).toFixed(0)} ${(-s * .75).toFixed(0)} M0 ${(-s * .45).toFixed(0)} L${(s * .35).toFixed(0)} ${(-s * .8).toFixed(0)}" stroke="#5e4a44" stroke-width="${(s * .06).toFixed(1)}" stroke-linecap="round"/>${range(7, () => `<circle cx="${((r() - .5) * s * 1.1).toFixed(0)}" cy="${(-s * (0.6 + r() * 0.4)).toFixed(0)}" r="${(s * (0.18 + r() * 0.14)).toFixed(0)}" fill="${['#f6dce4', '#f1c6d3', '#fbeef1'][Math.floor(r() * 3)]}" opacity=".92"/>`)}</g>`;
    put(svg, `<defs>${sky(k + 's', [[0, '#b4cfe6'], [1, '#f2eef0']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><circle cx="1240" cy="230" r="40" fill="#fffaf0"/>
    ${ridge(r, 500, 50, '#b3c4b8', {f: .5})}${ridge(r, 600, 60, '#9bb58c')}${range(10, () => tree(r() * 1600, 610 + r() * 30, 50 + r() * 20))}
    ${ridge(r, 730, 55, '#83a46f')}${range(6, () => tree(r() * 1600, 760 + r() * 40, 100 + r() * 40))}
    ${ridge(r, 860, 40, '#6a8f58')}${range(60, () => `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(830 + r() * 70).toFixed(0)}" r="${(1.5 + r() * 2).toFixed(1)}" fill="#f6dce4"/>`)}`); } };
