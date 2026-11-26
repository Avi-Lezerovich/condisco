// Browser test for the breathing screen (owned by the breathing thread). Usage: node tests/serve.mjs . 8823 & node tests/breath.mjs [port]
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const port = process.argv[2] || 8823, URL0 = `http://localhost:${port}/index.html?mock=1`, SH = 'tests/shots/breath';
const T0 = new Date('2026-11-26T08:05:00+02:00');
let n = 0, bad = 0; const ok = (c, m) => { n++; console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const b = await chromium.launch();
for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, deviceScaleFactor: 2, hasTouch: true, timezoneId: 'Asia/Jerusalem' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.clock.install({ time: T0 });
  await p.goto(URL0 + '#today'); await p.waitForFunction(() => window.__condisco); await p.clock.pauseAt(T0.getTime() + 15000);
  await p.evaluate(() => window.__condisco.focus.open('breathe')); await p.clock.runFor(400);
  ok(await p.isVisible('#focus.calm'), scheme + ': breathe screen open');
  ok((await p.textContent('#cue')) === 'מתחילים?', 'idle cue');
  const ov = await p.evaluate(() => document.querySelector('#focus').scrollWidth - innerWidth); ok(ov <= 0, 'no horizontal overflow');
  await p.screenshot({ path: `${SH}/phone-${scheme}-setup.png` });
  await p.click('[data-f=bpace][data-v=easy]'); await p.clock.runFor(100);
  ok(await p.evaluate(() => window.__condisco.focus.state.breath.pace === 'easy'), 'pace choice applies');
  await p.click('[data-f=bpace][data-v=calm]'); await p.click('[data-f=bmin][data-v="1"]'); await p.click('[data-f=bstart]');
  const t0 = await p.evaluate(() => window.__condisco.focus.state.breath.start - 4000);
  const at = async ms => { const now = await p.evaluate(() => Date.now()); await p.clock.runFor(Math.max(1, t0 + ms - now)); };
  const cue = () => p.textContent('#cue');
  await at(1000); ok((await cue()) === 'להתיישב בנוח', 'lead-in cue first');
  await at(4000 + 1300); ok((await cue()) === 'שאיפה', 'inhale cue');
  await at(4000 + 3000); await p.screenshot({ path: `${SH}/phone-${scheme}-top.png` }); ok((await cue()) === 'ועוד קצת', 'top-up cue');
  await at(4000 + 6000); ok((await cue()) === 'נשיפה ארוכה', 'exhale cue');
  await p.screenshot({ path: `${SH}/phone-${scheme}-exhale.png` });
  ok(await p.evaluate(() => document.querySelectorAll('#pond .ring').length >= 1), 'ripple on exhale');
  await at(4000 + 9700); ok((await cue()) === 'נשיפה ארוכה', 'rest keeps the exhale text');
  // 1 min: 4 s lead + 5 breaths of 10 s + 6 s settle
  await at(56000); ok((await cue()) === 'ועכשיו לנשום רגיל', 'settle cue after the last breath');
  await at(59500); ok(await p.evaluate(() => !!window.__condisco.focus.state), 'still open just before 1 min');
  await at(60600); ok(await p.evaluate(() => !window.__condisco.focus.state), 'breathe-only ends at exactly 1 min');
  ok(errs.length === 0, 'no console errors ' + errs.join(' | '));
  await ctx.close();
}
// reduced motion: countdown in the sub line, no ripples
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
  await p.clock.install({ time: T0 }); await p.goto(URL0 + '#today'); await p.waitForFunction(() => window.__condisco); await p.clock.pauseAt(T0.getTime() + 15000);
  await p.evaluate(() => window.__condisco.focus.open('breathe')); await p.clock.runFor(300);
  await p.click('[data-f=bstart]'); await p.clock.runFor(4000 + 9000);
  const sub = await p.textContent('#bsub'); ok(/בפה.*· \d$/.test(sub), 'reduced motion: exhale countdown ' + sub);
  ok(await p.evaluate(() => document.querySelectorAll('#pond .ring').length === 0), 'reduced motion: no ripples');
  await ctx.close(); }
await b.close();
console.log(`${n - bad}/${n} passed`); process.exit(bad ? 1 : 0);
