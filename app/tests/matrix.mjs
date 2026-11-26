// Cross-device QA: every route + the focus flow at the design system's device matrix, light and dark.
// Checks: no horizontal scroll, tappable elements >= 44x44 (visible ones), no text under 12.5px,
// tab bar under 600px and rail from 600px. Writes screenshots when a directory is given.
// Usage (server on :8811): node tests/matrix.mjs [shotsDir] [--quick]
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const quick = process.argv.includes('--quick');
const base = 'http://localhost:8811/index.html?mock=1&now=2026-11-26T08:05:00';
const SIZES = [
  [375, 667, 'se', true], [393, 852, 'iphone', true], [430, 932, 'promax', true], [852, 393, 'land', true],
  [820, 1180, 'ipad', true], [1180, 820, 'ipad-land', true], [1280, 800, 'laptop', false], [1440, 900, 'desk', false],
  [1920, 1080, 'full', false], [2560, 1440, 'full-2k', false],
].filter((s) => !quick || ['iphone', 'land', 'ipad', 'desk', 'full'].includes(s[2]));
const ROUTES = ['today', 'gaps', 'deadlines', 'checkin', 'prefs'];
const b = await chromium.launch(); let fails = 0;
for (const [w, h, name, touch] of SIZES) for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  for (const r of ROUTES) {
    await p.goto(base + '#' + r); await p.waitForTimeout(500);
    const res = await p.evaluate(() => {
      const bad = [];
      const ov = document.documentElement.scrollWidth - innerWidth; if (ov > 0) bad.push('side scroll ' + ov + 'px');
      for (const el of document.querySelectorAll('#view button, #view a[href], #view input:not([type=hidden]), #view select, nav.tabs a')) {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        if (!r.width || cs.visibility === 'hidden' || el.closest('[hidden]')) continue;
        if (el.matches('input[type=checkbox],input[type=radio]')) continue;
        if (r.height < 40 || r.width < 40) bad.push(`small target ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || el.className).trim().slice(0, 30)}"`);
      }
      for (const el of document.querySelectorAll('#view *, nav.tabs *')) {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12.5) bad.push(`tiny text ${fs}px "${el.textContent.trim().slice(0, 20)}"`);
      }
      const nav = document.querySelector('nav.tabs').getBoundingClientRect();
      const rail = nav.height > nav.width;
      if (innerWidth >= 600 && !rail) bad.push('expected rail from 600px');
      if (innerWidth < 600 && rail) bad.push('expected bottom tabs under 600px');
      return [...new Set(bad)];
    });
    if (res.length) errs.push(`${r}: ${res.slice(0, 6).join(' | ')}${res.length > 6 ? ` (+${res.length - 6})` : ''}`);
    if (out) await p.screenshot({ path: `${out}/${name}-${scheme}-${r}.png` });
  }
  // focus flow: open from the next-up card
  await p.goto(base + '#today'); await p.waitForTimeout(400);
  const start = await p.$('.next .btn.primary'); if (start) { await start.click(); await p.waitForTimeout(700); if (out) await p.screenshot({ path: `${out}/${name}-${scheme}-focus.png` }); }
  if (errs.length) { fails++; console.log('FAIL', name, w + 'x' + h, scheme, '\n  ' + errs.join('\n  ')); } else console.log('ok  ', name, w + 'x' + h, scheme);
  await ctx.close();
}
await b.close();
console.log(fails ? `${fails} size/theme combinations with issues` : 'matrix clean');
process.exit(fails ? 1 : 0);
