// Browser tests for the focus timer screen: setup, ring, confirm-to-stop, skip break, missed cross-tab update,
// leader tab, sleep/wake, pill. Needs tests/serve.mjs on :8811. Screenshots go to tests/shots/timer-*.png.
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const URL0 = 'http://localhost:8811/index.html?mock=1';
const T0 = new Date('2026-11-26T08:05:00+02:00');
const SHOTS = process.argv.includes('--shots');
let n = 0, bad = 0; const ok = (c, m) => { n++; console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const b = await chromium.launch();
const errs = [];
const watch = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); return p; };
const st = p => p.evaluate(() => { const f = window.__condisco.focus, s = f.state; return s && { state: s.state, min: s.min, focusMs: s.timer.focusMs, run: s.timer.run, paused: s.timer.paused, segEnd: s.timer.segEnd, total: s.timer.total, rev: s.rev, tab: f.tab, leader: JSON.parse(localStorage.getItem('condisco.focus.leader') || 'null') }; });
async function toTimer(p) {
  await p.goto(URL0 + '#today'); await p.clock.runFor(1500);
  await p.click('.next [data-act=focus]'); await p.clock.runFor(300);
  await p.click('[data-f=next]'); await p.clock.runFor(200);            // zone → breathe
  await p.click('.foot [data-f=next]'); await p.clock.runFor(200);      // skip breathing → music
  await p.click('.foot [data-f=next]'); await p.clock.runFor(300);      // music → timer setup
}

// ---------- phone, light ----------
{
  const ctx = await b.newContext({ ...devices['iPhone 13'], colorScheme: 'light', timezoneId: 'Asia/Jerusalem' });
  const p = watch(await ctx.newPage()); await p.clock.install({ time: T0 });
  await toTimer(p);
  ok((await p.locator('.tp').count()) === 3, 'three pattern cards');
  await p.click('[data-f=pat][data-v="25/5"]'); await p.clock.runFor(200);
  ok((await p.locator('.tplan i').count()) === 3, 'plan preview 50 min in 25/5 = 3 segments');
  await p.click('[data-f=total][data-v="90"]'); await p.clock.runFor(200);
  ok((await st(p)).total === 90 * 60000 && (await p.locator('.tplan i').count()) === 7, 'total 90 → 7 segments');
  await p.click('[data-f=total][data-v="45"]'); await p.clock.runFor(200);
  if (SHOTS) await p.screenshot({ path: 'tests/shots/timer-phone-light-setup.png' });
  await p.click('[data-f=tstart]'); await p.clock.runFor(1200);
  ok(await p.isVisible('.tring #tfg'), 'ring shows while running');
  ok(/^2[45]:\d\d$/.test(await p.textContent('#tbig')), 'big time ~25 min');
  ok((await p.textContent('#tsub')).includes('סבב 1 מתוך 2'), 'round 1 of 2');
  await p.clock.runFor(5 * 60000);
  const off = +(await p.getAttribute('#tfg', 'stroke-dashoffset')); ok(off > 200 && off < 300, 'ring advanced ~20%: ' + off);
  // one tap on סיימתי does not end the block
  await p.click('[data-f=stop]'); await p.clock.runFor(300);
  ok((await st(p)).state === 'focus' && (await p.textContent('[data-f=stop]')).includes('עוד לחיצה'), 'first tap on stop only asks to confirm');
  await p.clock.runFor(4500);
  ok((await p.textContent('[data-f=stop]')) === 'סיימתי', 'confirm resets after 4s');
  // pause / resume with the keyboard
  await p.locator('.tring').click(); await p.keyboard.press(' '); await p.clock.runFor(300);
  ok((await st(p)).paused && await p.isVisible('.trun.is-paused'), 'space pauses');
  if (SHOTS) await p.screenshot({ path: 'tests/shots/timer-phone-light-paused.png' });
  await p.clock.runFor(3 * 60000);
  await p.keyboard.press(' '); await p.clock.runFor(300);
  ok(!(await st(p)).paused, 'space resumes');
  // to the break, then skip it
  await p.clock.runFor(20 * 60000 + 30000);
  let s = await st(p); ok(s.state === 'break' && s.focusMs === 25 * 60000, 'break after 25 focus min (pause excluded)');
  ok(await p.isVisible('.tbrk') && await p.isVisible('[data-f=skipbreak]'), 'break tip and skip button');
  if (SHOTS) await p.screenshot({ path: 'tests/shots/timer-phone-light-break.png' });
  await p.click('[data-f=skipbreak]'); await p.clock.runFor(400);
  s = await st(p); ok(s.state === 'focus' && /^(20:00|19:5\d)$/.test(await p.textContent('#tbig')), 'skip break → last 20 min');
  // minimise → pill
  await p.click('[data-f=minimize]'); await p.clock.runFor(400);
  ok(await p.isVisible('#mini') && (await p.getAttribute('#mini', 'aria-label')).includes('נשארו'), 'pill with spoken time');
  if (SHOTS) await p.screenshot({ path: 'tests/shots/timer-phone-light-pill.png' });
  await ctx.close();
}

// ---------- desktop, dark, two tabs ----------
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', timezoneId: 'Asia/Jerusalem' });
  const p1 = watch(await ctx.newPage()); await p1.clock.install({ time: T0 });
  await toTimer(p1);
  await p1.click('[data-f=pat][data-v="25/5"]'); await p1.click('[data-f=tstart]'); await p1.clock.runFor(800);
  if (SHOTS) await p1.screenshot({ path: 'tests/shots/timer-desk-dark-run.png' });
  const p2 = watch(await ctx.newPage()); await p2.goto(URL0 + '#today'); await p2.clock.runFor(1500);
  let a = await st(p1), c = await st(p2);
  ok(c && c.state === 'focus' && a.leader && a.leader.tab === a.tab, 'second tab follows; the tab that started is the leader');
  // pause in tab 2 (from the pill), tab 1 follows; tab 2 becomes the leader
  await p2.mouse.move(5, 5); await p2.clock.runFor(200); if (await p2.isVisible('#mini')) await p2.click('#mini'); await p2.clock.runFor(300); await p2.click('[data-f=pause]'); await p2.clock.runFor(400);
  await p1.clock.runFor(400); a = await st(p1); c = await st(p2);
  ok(a.paused && c.paused, 'pause in one tab pauses both');
  ok(c.leader.tab === c.tab && c.leader.tab !== a.tab, 'the tab used last is the leader (only it rings)');
  // a missed update: write a newer state behind tab 1's back (no storage event in the same page) → tab 1 adopts it
  await p1.evaluate(() => { const k = 'condisco.focus.v1', s = JSON.parse(localStorage.getItem(k)); s.rev += 5; s.goal = 'עדכון מלשונית אחרת'; localStorage.setItem(k, JSON.stringify(s)); });
  await p1.clock.runFor(600);
  ok((await p1.evaluate(() => window.__condisco.focus.state.goal)) === 'עדכון מלשונית אחרת', 'tab adopts a newer stored copy it was not told about');
  await p2.mouse.move(8, 8); await p2.clock.runFor(200); await p2.click('[data-f=pause]'); await p2.clock.runFor(400);
  // sleep: everything hidden, 3 hours pass in one jump, then wake
  for (const p of [p1, p2]) await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p1.clock.fastForward(3 * 3600000);
  await p1.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await p1.clock.runFor(500);
  a = await st(p1); ok(a.state === 'recall' && a.focusMs === 50 * 60000, 'after a 3 h sleep: recall with 50 focus min');
  ok((await p1.textContent('#toast')).includes('המשיך לרוץ'), 'toast explains the timer kept running');
  if (SHOTS) await p1.screenshot({ path: 'tests/shots/timer-desk-dark-recall.png' });
  await p1.evaluate(() => localStorage.removeItem('condisco.focus.v1')); await p1.click('[data-f=recall][data-v=yes]'); await p1.clock.runFor(300);
  ok((await st(p1)) === null && !(await p1.isVisible('#focus.open')), 'block ended elsewhere (missed event) → next tap closes it here instead of writing it back');
  await ctx.close();
}
ok(errs.length === 0, 'no console errors ' + errs.join(' | '));
await b.close(); console.log(`${n - bad}/${n} passed`); process.exit(bad ? 1 : 0);
