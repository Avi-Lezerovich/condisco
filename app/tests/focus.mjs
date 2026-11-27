// Browser tests for the focus engine: reload mid-block, background tab, two tabs, break→recall, idle screen.
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const URL0 = 'http://localhost:8811/index.html?mock=1';
const T0 = new Date('2026-11-26T08:05:00+02:00');
let n = 0, bad = 0; const ok = (c, m) => { n++; console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Jerusalem' });
const errs = []; let installed = false;
const page = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); if (!installed) { await p.clock.install({ time: T0 }); installed = true; } return p; };  // the clock is per browser context
// the app sets window.__condisco a moment after load (after a reload too), so wait for it on the fake clock first
const ready = async p => { for (let i = 0; i < 60 && !(await p.evaluate(() => !!(window.__condisco && window.__condisco.focus))); i++) await p.clock.runFor(100); };
const st = async p => { await ready(p); return stRaw(p); };
const stRaw = p => p.evaluate(() => { const s = window.__condisco.focus.state; return s && { state: s.state, min: s.min, focusMs: s.timer.focusMs, run: s.timer.run, segEnd: s.timer.segEnd, now: Date.now(), rev: s.rev, paused: s.timer.paused }; });

const p1 = await page();
await p1.goto(URL0 + '#today'); await p1.clock.runFor(1500);
await p1.click('.next [data-act=focus]'); await p1.clock.runFor(300);
ok(await p1.isVisible('#focus.open'), 'block opens on zone step');
await p1.click('[data-f=check][data-v=dnd]'); await p1.fill('#fz-goal', 'לפתור שאלה 2 לבד');
await p1.click('[data-f=next]'); await p1.clock.runFor(300);
await p1.click('[data-f=bmin][data-v="1"]'); await p1.click('[data-f=bstart]');
await p1.clock.runFor(2500);
ok((await p1.textContent('#cue')).length > 0, 'breathing cue shows');
await p1.clock.runFor(60000);
ok((await st(p1)).state === 'music', 'breathing ends → music');
await p1.click('[data-f=next]'); await p1.clock.runFor(300);
await p1.click('[data-f=pat][data-v="25/5"]'); await p1.click('[data-f=tstart]'); await p1.clock.runFor(1000);
ok((await st(p1)).run, 'timer running');
// reload mid-block
await p1.clock.runFor(10 * 60000);
await p1.reload(); await p1.clock.runFor(1500);
let s = await st(p1);
ok(s && s.state === 'focus' && s.run, 'reload mid-block resumes in focus');
const big = await p1.textContent('#tbig'); ok(/^1[45]:\d\d$/.test(big), 'timer shows ~15 min left after reload: ' + big);
ok((await p1.inputValue('#fz-goal').catch(() => null)) === null && (await p1.textContent('.fz')).includes('לפתור שאלה 2 לבד'), 'goal kept');
// minimise → pill; second tab sees the same block
await p1.click('[data-f=minimize]'); await p1.clock.runFor(500);
ok(await p1.isVisible('#mini'), 'minimised pill visible');
const p2 = await page(); await p2.goto(URL0 + '#today'); await p2.clock.runFor(1500);
s = await st(p2); ok(s && s.state === 'focus', 'second tab resumes the same block');
await p1.bringToFront();
// background: p1 hidden for a while → when time passes the break starts
await p1.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
await p1.clock.runFor(16 * 60000);
await p1.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
await p1.clock.runFor(500);
s = await st(p1); ok(s.state === 'break' && s.focusMs === 25 * 60000, 'after background, break with 25 focus min ' + JSON.stringify(s));
// idle screen on desktop after 1 min without input, with the timer strip
await p1.clock.runFor(61000);
ok(await p1.isVisible('#ambient.on'), 'idle screen shows after 1 min');
await p1.clock.runFor(2000);
ok(await p1.isVisible('#ambTimer.show'), 'timer strip on idle screen');
ok((await p1.locator('#sceneBox svg').count()) > 0, 'a scene is drawn');
await p1.screenshot({ path: 'tests/shots/desk-idle-timer.png' });
await p1.mouse.move(10, 10); await p1.clock.runFor(2000);
ok(!(await p1.isVisible('#ambient.on')), 'input hides idle screen');
// break → recall: stop during break from tab 2, tab 1 follows
await p2.bringToFront(); await p2.mouse.move(40, 40); await p2.clock.runFor(300); await p2.click('#mini'); await p2.clock.runFor(300); // the wake move goes past the 14px nudge filter (the page may already know the pointer at 0,0)
await p2.click('[data-f=stop]'); await p2.click('[data-f=stop]'); await p2.clock.runFor(500); // second tap confirms
s = await st(p2); ok(s.state === 'recall' && s.focusMs === 25 * 60000, 'break → recall, no extra focus');
await p1.bringToFront(); await p1.clock.runFor(500); s = await st(p1); ok(s && s.state === 'recall', 'first tab follows to recall');
await p2.click('[data-f=recall][data-v=yes]'); await p2.click('[data-f=mark][data-v=done]'); await p2.click('[data-f=finish]'); await p2.clock.runFor(800);
const res = await p2.evaluate(() => { const S = window.__condisco.store.S; const t = S.tasks.find(x => x.id === 't1'); return { status: t.status, recall: t.recall, sess: S.sessions.filter(x => x.kind === 'block' && x.focusMin === 25).length }; });
ok(res.status === 'done' && res.recall === 'yes' && res.sess === 1, 'task marked, session logged: ' + JSON.stringify(res));
await p1.clock.runFor(500); ok((await st(p1)) === null, 'first tab closes when the block finishes elsewhere');
ok(errs.length === 0, 'no console errors ' + errs.join(' | '));
await b.close(); console.log(`${n - bad}/${n} passed`); process.exit(bad ? 1 : 0);
