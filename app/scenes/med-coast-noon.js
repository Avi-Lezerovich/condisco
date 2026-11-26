import { rng, uid, put, sky, range, breathe, glide } from './lib.js';
export default { id: 'med-coast-noon', name: 'חוף טורקיז בצהריים', tags: ['sea', 'day', 'israel', 'coast'],
  draw(svg, { seed }){ const r = rng(seed), k = uid();
    const wave = (y, c, o, dur) => { const a = r() * 6; let d = `M-100 ${y}`; for (let x = -100; x <= 1700; x += 40) d += ` L${x} ${(y + 6 * Math.sin(x / 90 + a)).toFixed(1)}`; return `<path d="${d}" stroke="${c}" stroke-width="3" fill="none" opacity="${o}">${glide(40, 4, dur)}</path>`; };
    put(svg, `<defs>${sky(k + 's', [[0, '#5fa6dc'], [1, '#d6ecf4']])}${sky(k + 'w', [[0, '#3c8fb8'], [.6, '#47b6c1'], [1, '#8fd9d0']])}${sky(k + 'b', [[0, '#f3e2c0'], [1, '#e6cc9c']])}</defs>
    <rect width="1600" height="900" fill="url(#${k}s)"/><rect y="470" width="1600" height="430" fill="url(#${k}w)"/>
    <g>${range(20, i => `<rect x="${(r() * 1500).toFixed(0)}" y="${(480 + i * 11).toFixed(0)}" width="${(60 + r() * 200).toFixed(0)}" height="2" fill="#ffffff" opacity=".28"/>`)}${breathe('opacity', .5, 1, 11)}</g>
    ${wave(640, '#e9fbf8', .5, 13)}${wave(690, '#ffffff', .6, 15)}
    <path d="M0 720 C300 700 700 740 1100 715 S1500 700 1600 712 L1600 900 L0 900 Z" fill="url(#${k}b)"/>
    <path d="M0 722 C300 702 700 742 1100 717 S1500 702 1600 714" stroke="#ffffff" stroke-width="6" fill="none" opacity=".7">${breathe('opacity', .35, .8, 8)}</path>`); } };
