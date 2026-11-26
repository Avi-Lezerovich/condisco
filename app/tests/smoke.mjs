import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] || 'tests/shots';
const base = 'http://localhost:8811/index.html?mock=1&now=2026-11-26T08:05:00';
const routes = ['today', 'gaps', 'deadlines', 'checkin', 'prefs'];
const sizes = [[390, 844, 'phone'], [1440, 900, 'desk']];
const b = await chromium.launch(); let fails = 0;
for (const [w, h, sz] of sizes) for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1, hasTouch: sz === 'phone' });
  const p = await ctx.newPage(); const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  for (const r of routes) {
    await p.goto(base + '#' + r); await p.waitForTimeout(600);
    if (r === 'gaps') { await p.click('.c-head'); await p.waitForTimeout(150); }
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ov > 0) { errs.push(`overflow ${ov}px on ${r}`); }
    await p.screenshot({ path: `${out}/${sz}-${scheme}-${r}.png`, fullPage: true });
  }
  if (errs.length) { fails++; console.log(sz, scheme, errs); } else console.log(sz, scheme, 'ok');
  await ctx.close();
}
// first run
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8811/index.html?mock=empty'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/phone-light-firstrun.png`, fullPage: true });
  await p.fill('#fr-name', 'בדיקה'); await p.fill('#fr-courses', 'קורס א\nקורס ב'); await p.click('#first-form [type=submit]'); await p.waitForTimeout(800);
  const t = await p.textContent('#title'); const n = await p.evaluate(() => window.__condisco.store.S.courses.length);
  console.log('firstrun ->', t, 'courses', n, errs);
}
await b.close(); process.exit(fails ? 1 : 0);
