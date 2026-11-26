// Shared helpers for Condisco scenes. Every scene draws in a 1600x900 user space;
// the registry sets viewBox="0 0 1600 900" and preserveAspectRatio="xMidYMid slice",
// so any w×h fills the screen without distortion.
export const W = 1600, H = 900;
let n = 0;
/** Unique id prefix, so two copies of one scene (crossfade, preview grid) never share gradient ids. */
export const uid = () => 'cd' + (++n).toString(36) + '-';
/** Park–Miller PRNG; same seed → same scene. */
export function rng(seed){ let s = Math.abs(Math.floor(seed)) % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
export const range = (count, f) => Array.from({length: count}, (_, i) => f(i)).join('');
export const put = (svg, markup) => svg.insertAdjacentHTML('beforeend', markup);
export function hashId(id){ let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) % 2147483646 + 1; }

export function sky(id, stops){ return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`; }
export function glow(id, color, a = .8){ return `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${a}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`; }
export function blur(id, sd){ return `<filter id="${id}" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="${sd}"/></filter>`; }

export function hills(r, y, amp, color, op = 1){ let d = `M0 900 L0 ${y}`; for (let x = 0; x <= 1600; x += 80) d += ` L${x} ${(y - amp * (0.5 + 0.5 * Math.sin(x / 210 + r() * 2)) - r() * amp * 0.35).toFixed(1)}`; return `<path d="${d} L1600 900 Z" fill="${color}" opacity="${op}"/>`; }
export function pines(r, base, count, h, color){ let s = ''; for (let i = 0; i < count; i++) { const x = r() * 1640 - 20, hh = h * (0.6 + r() * 0.6), w = hh * 0.32; s += `<path d="M${x} ${base - hh} L${x - w} ${base} L${x + w} ${base} Z" fill="${color}"/>`; } return s; }
export function smooth(r, y, amp, color, op = 1, f = 1){ const a = r() * 6.28, b = r() * 6.28; let d = `M0 900 L0 ${y}`; for (let x = 0; x <= 1600; x += 20) d += ` L${x} ${(y - amp * (0.55 * Math.sin(x / (260 / f) + a) + 0.3 * Math.sin(x / (115 / f) + b) + 0.15 * Math.sin(x / (55 / f) + a))).toFixed(1)}`; return `<path d="${d} L1600 900 Z" fill="${color}" opacity="${op}"/>`; }
export function peaks(r, y, h, count, color){ const w = 1600 / count; let d = `M0 900 L0 ${y - h * 0.2}`; for (let i = 0; i <= count; i++) { const x = i * w; d += ` L${(x + w * (0.35 + r() * 0.3)).toFixed(0)} ${(y - h * (0.55 + r() * 0.45)).toFixed(0)} L${(x + w).toFixed(0)} ${(y - h * r() * 0.25).toFixed(0)}`; } return `<path d="${d} L1600 900 Z" fill="${color}"/>`; }
/** Smooth ridge as a closed path, with an optional bottom other than 900. */
export function ridge(r, y, amp, color, {op = 1, f = 1, bottom = 900, step = 20} = {}){ const a = r() * 6.28, b = r() * 6.28; let d = `M0 ${bottom} L0 ${y}`; for (let x = 0; x <= 1600; x += step) d += ` L${x} ${(y - amp * (0.55 * Math.sin(x / (260 / f) + a) + 0.3 * Math.sin(x / (115 / f) + b) + 0.15 * Math.sin(x / (55 / f) + a))).toFixed(1)}`; return `<path d="${d} L1600 ${bottom} Z" fill="${color}" opacity="${op}"/>`; }
export function stars(r, count, maxY, color = '#ffffff', size = 1.5){ return range(count, () => `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(r() * maxY).toFixed(0)}" r="${(0.5 + r() * size).toFixed(1)}" fill="${color}" opacity="${(0.2 + r() * 0.6).toFixed(2)}"/>`); }
export function cloud(cx, cy, s, o, filterId, color = '#ffffff'){ return `<g opacity="${o}" filter="url(#${filterId})">${[[0, 0, 1], [-.9, .15, .7], [.9, .2, .75], [-.4, -.35, .65], [.45, -.3, .7]].map(([dx, dy, k]) => `<ellipse cx="${(cx + dx * s).toFixed(0)}" cy="${(cy + dy * s).toFixed(0)}" rx="${(s * k).toFixed(0)}" ry="${(s * k * .62).toFixed(0)}" fill="${color}"/>`).join('')}</g>`; }
/** Glints on water under a light source. */
export function glints(r, cx, y0, y1, count, color, spread = .55){ return range(count, () => { const y = y0 + r() * (y1 - y0), sp = (y - y0) * spread + 20; return `<rect x="${(cx - sp + r() * sp * 2).toFixed(0)}" y="${y.toFixed(0)}" width="${(10 + r() * 34).toFixed(0)}" height="2" rx="1" fill="${color}" opacity="${(0.15 + r() * 0.5).toFixed(2)}"/>`; }); }

/* Slow ambient motion (SMIL). Every cycle is ≥ 6 s; the registry pauses them when the tab is hidden. */
const ease = 'calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"';
export const breathe = (attr, a, b, dur = 9, begin = 0) => `<animate attributeName="${attr}" values="${a};${b};${a}" dur="${Math.max(6, dur)}s" begin="${-begin}s" repeatCount="indefinite" ${ease}/>`;
export const glide = (dx, dy = 0, dur = 90, begin = 0) => `<animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy};0 0" dur="${Math.max(6, dur)}s" begin="${-begin}s" repeatCount="indefinite" ${ease}/>`;

function lum(hex){ const m = /^#?([0-9a-f]{6})/i.exec(hex || ''); if (!m) return 1; const v = parseInt(m[1], 16); return (0.2126 * (v >> 16) + 0.7152 * (v >> 8 & 255) + 0.0722 * (v & 255)) / 255; }
/** Dark mode = the app's sky token is dark. Then the scene is dimmed with that token (derived from the palette, not hard-coded). */
export const isDark = palette => lum(palette && palette.sky) < 0.35;
export function applyMode(svg, palette){ if (isDark(palette)) put(svg, `<rect width="1600" height="900" fill="${palette.sky}" opacity=".42" style="mix-blend-mode:multiply"/><rect width="1600" height="900" fill="${palette.sky}" opacity=".18"/>`); }
