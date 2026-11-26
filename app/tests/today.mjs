// Today screen: hero states, suggestion de-dupe, ring count, overdue cap, odd data. Needs tests/serve.mjs on 8811.
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const B = 'http://localhost:8811/index.html?mock=1&now=';
const b = await chromium.launch(); let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
async function open(now, w = 390) {
  const p = await (await b.newContext({ viewport: { width: w, height: 844 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(B + now + '#today'); await p.waitForTimeout(700); p.errs = errs; return p;
}
const W = (p, path, data, op = 'update') => p.evaluate(([a, d, o]) => window.__condisco.store.write(a, d, o), [path, data, op]);
const txt = (p, s) => p.$eval(s, e => e.textContent).catch(() => '');
const settle = p => p.waitForTimeout(250);

{ // morning: countdown, "after" count, ring ignores skipped, days fit
  const p = await open('2026-11-26T08:05:00');
  ok((await txt(p, '.next')).includes('מתחילים בעוד'), 'countdown before start');
  ok((await txt(p, '.next .after')).includes('2'), 'hero says how many follow');
  await W(p, 'tasks/t3', { status: 'skipped' }); await settle(p);
  ok((await txt(p, '.ring-p')).includes('1/3'), 'ring counts without skipped');
  const fit = await p.$eval('.days', e => e.scrollWidth <= e.clientWidth + 1); ok(fit, 'day switcher fits 390px');
  ok(!p.errs.length, 'no console errors ' + p.errs.join('|'));
}
{ // late: no "now" five hours after the start
  const p = await open('2026-11-26T13:05:00');
  ok((await txt(p, '.next')).includes('תוכנן ל-'), 'late start says planned for');
}
{ // evening with open tasks -> close-the-day hero; after a check-in -> back to next task
  const p = await open('2026-11-26T21:30:00');
  ok(await p.$('.next.eve a[href="#checkin"]') !== null, 'evening hero links to check-in');
  await W(p, 'checkins/2026-11-26', { date: '2026-11-26', did: 'x' }, 'set'); await settle(p);
  ok(await p.$('.next.eve') === null && (await txt(p, '.next')).includes('היום נסגר'), 'after the evening check-in the day reads as closed');
}
{ // all done
  const p = await open('2026-11-26T15:00:00');
  for (const id of ['t1', 't2', 't3']) await W(p, 'tasks/' + id, { status: 'done' }); await settle(p);
  ok((await txt(p, '.next')).includes('נשאר רק'), 'all done asks for check-in');
}
{ // empty day + suggestions de-dupe (tasks moved to another day instead of removed)
  const p = await open('2026-11-26T09:00:00');
  for (const id of ['w1', 't1', 't2', 't3']) await W(p, 'tasks/' + id, { date: '2026-12-20' }); await settle(p);
  ok((await txt(p, '.next')).includes('אין משימות'), 'empty day hero');
  const n0 = (await p.$$('.sg')).length; ok(n0 > 0, 'suggestions shown: ' + n0);
  await p.click('.sg [data-act=addsug]'); await p.waitForTimeout(400);
  const n1 = (await p.$$('.sg')).length; ok(n1 === n0 - 1, `added suggestion leaves the list (${n0}→${n1})`);
  await p.click('.sg [data-act=addsug]'); await p.waitForTimeout(400);
  const titles = await p.evaluate(() => window.__condisco.store.S.tasks.filter(t => t.date === '2026-11-26').map(t => t.title));
  ok(new Set(titles).size === titles.length && titles.length === 2, 'no duplicate tasks after two adds');
}
{ // odd data: no course, no start, unknown course id, many overdue
  const p = await open('2026-11-26T10:00:00');
  await W(p, 'tasks/x1', { title: 'בלי שעה', date: '2026-11-26', status: 'todo' }, 'set');
  await W(p, 'tasks/x2', { title: 'קורס לא קיים', courseId: 'zz', date: '2026-11-26', start: '9:30', status: 'todo', minutes: '40' }, 'set');
  for (let i = 2; i < 10; i++) await W(p, 'tasks/o' + i, { title: 'ישנה ' + i, date: '2026-11-' + String(26 - i).padStart(2, '0'), status: 'todo' }, 'set');
  await settle(p);
  const main = await txt(p, '.main');
  ok(main.includes('ועוד'), 'overdue overflow note');
  const order = await p.$eval('.main .tl', e => [...e.querySelectorAll('.slot .time')].map(x => x.textContent));
  ok(order.indexOf('9:30') < order.indexOf('11:00'), 'single-digit hour sorts by time: ' + order.join(','));
  ok(main.includes('בלי שעה') && main.includes('קורס לא קיים'), 'odd tasks render');
  ok(!p.errs.length, 'no console errors ' + p.errs.join('|'));
}
{ // a block is open (minimised): the hero leads back into it, with the time left once the timer runs
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Jerusalem' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-26T08:05:00+02:00') });
  await p.goto('http://localhost:8811/index.html?mock=1#today'); await p.clock.runFor(1500);
  await p.click('.next [data-act=focus]'); await p.clock.runFor(300);
  await p.click('[data-f=next]'); await p.clock.runFor(300);
  await p.click('[data-f=bmin][data-v="1"]'); await p.click('[data-f=bstart]'); await p.clock.runFor(62500);
  await p.click('[data-f=next]'); await p.clock.runFor(300);
  await p.click('[data-f=pat][data-v="25/5"]'); await p.click('[data-f=tstart]'); await p.clock.runFor(3 * 60000);
  await p.click('[data-f=minimize]'); await p.clock.runFor(500);
  const h = await txt(p, '.next');
  ok(h.includes('חזרה לבלוק') && !h.includes('כניסה לבלוק') && h.includes('בלוק פעיל'), 'hero shows the running block: ' + h.replace(/\s+/g, ' ').trim());
  ok(/2[12] דק'/.test(h), 'hero shows minutes left in the segment');
  await p.click('.next [data-act=focus]'); await p.clock.runFor(300);
  ok(await p.isVisible('#focus.open'), 'back-to-block reopens the same block');
  ok(!errs.length, 'no page errors ' + errs.join('|'));
  await ctx.close();
}
await b.close(); process.exit(fails ? 1 : 0);
