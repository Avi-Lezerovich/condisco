// Exam mode: pure rules (core/exam.js) and browser flows on #exam. Needs tests/serve.mjs on 8811 (or PORT as argv[2]).
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { examsOf, planOf, planTasks, planDiff, readinessOf, readinessLine, phaseAt } from '../core/exam.js';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

// ---------- pure ----------
{
  const S = {
    courses: [{ id: 'cx', name: 'X', order: 2, examDate: '2027-02-04', midtermDate: '2026-12-18' }, { id: 'fin', name: 'F', examDate: '2027-01-19', examVerified: true }],
    deadlines: [{ id: 'cx-mid', courseId: 'cx', kind: 'exam', due: '2026-12-18T09:00:00+02:00', status: 'open', verified: true, title: 'אמצע' },
      { id: 'old', courseId: 'cx', kind: 'exam', due: '2026-11-01T09:00:00+02:00', status: 'open', title: 'עבר' },
      { id: 'hw', courseId: 'cx', kind: 'hw', due: '2026-11-30T09:00:00+02:00', status: 'open' }],
  };
  const ex = examsOf(S, '2026-11-26');
  ok(ex.map(e => e.id).join() === 'cx-mid,fin-final,cx-final', 'exams: deadline wins over course date, past and hw left out, soonest first: ' + ex.map(e => e.id));
  ok(ex[0].verified && ex[1].verified && !ex[2].verified, 'course dates are unverified unless examVerified');
  ok(phaseAt(22) === 'before' && phaseAt(21) === 'diagnose' && phaseAt(14) === 'gaps' && phaseAt(7) === 'sharpen' && phaseAt(1) === 'light' && phaseAt(0) === 'day', 'phase boundaries T-21/15/14/8/7/2/1/0');
  const p = planOf(ex[0], '2026-11-26');
  ok(p.phases[0].start === '2026-11-27' && p.mocks.join() === '2026-11-30,2026-12-08,2026-12-12,2026-12-15', 'Complexity-like midterm: plan starts 27.11, mocks T-18/10/6/3: ' + p.mocks);
  ok(!p.late && !p.dropped.length, 'full plan has nothing dropped');
  const late = planOf({ ...ex[0], days: 10 }, '2026-12-08');
  ok(late.late && late.dropped.join() === 'אבחון' && late.mocks[0] === '2026-12-08', 'late start drops diagnose, keeps future mocks');
  const mid = planOf({ ...ex[0], days: 16 }, '2026-12-02');
  ok(mid.mocks[0] === '2026-12-02', 'started inside diagnose after baseline day: baseline today');
  const want = planTasks(ex[0], S.courses[0], '2026-11-26', { minutes: 120 });
  ok(want.every(t => t.source === 'exam:cx-mid' && t.date >= '2026-11-26' && t.date < '2026-12-18'), 'plan tasks: own source, future, before the exam');
  ok(new Set(want.map(t => t.id)).size === want.length && new Set(want.map(t => t.date)).size === want.length, 'ids unique, at most one plan task a day');
  ok(!want.some(t => t.date === '2026-12-17' && /מבחן בזמן/.test(t.title)), 'no mock on T-1');
  const d1 = planDiff([], want, 'exam:cx-mid'); ok(d1.set.length === want.length && !d1.remove.length, 'empty → all set');
  const stored = want.map(t => ({ ...t }));
  stored[0].status = 'done';
  const mine = { id: 'own', title: 'שלי', date: '2026-12-01', status: 'todo' };
  const d2 = planDiff(stored.concat([mine]), want, 'exam:cx-mid'); ok(!d2.set.length && !d2.remove.length, 'same plan again → no writes (idempotent)');
  const less = planTasks(ex[0], S.courses[0], '2026-11-26', { minutes: 120, review: false });
  const d3 = planDiff(stored.concat([mine]), less, 'exam:cx-mid');
  ok(d3.remove.length === want.length - less.length && !d3.remove.includes('own') && !d3.set.length, 'dropping review blocks removes only the plan\'s own open tasks');
  const done = stored.find(t => /-rev$/.test(t.id)); done.status = 'done';
  ok(!planDiff(stored, less, 'exam:cx-mid').remove.includes(done.id), 'done plan tasks are never removed');
  const longer = planTasks(ex[0], S.courses[0], '2026-11-26', { minutes: 150 });
  ok(planDiff(stored, longer, 'exam:cx-mid').set.every(t => /-mock$/.test(t.id)), 'changing exam length updates only the mock tasks');
  const M = [{ courseId: 'c', score: 90, timed: true, date: '2026-11-20' }, { courseId: 'c', score: 88, timed: true, date: '2026-11-22' },
    { courseId: 'c', score: 99, timed: false, mode: 'style', date: '2026-11-25' }, { courseId: 'c', score: 70, timed: false, date: '2026-11-24' }];
  const r = readinessOf(M, 'c', 85); ok(r.ready && r.last2.map(m => m.score).join() === '88,90', 'style and untimed mocks never count; 90 then 88 = ready');
  ok(readinessLine(r, 85).text.startsWith('90 ואז 88: מוכנות'), 'readiness line: numbers + verdict');
  const r2 = readinessOf(M.concat([{ courseId: 'c', score: 80, timed: true, date: '2026-11-26' }]), 'c', 85);
  ok(!r2.ready && /עדיין לא/.test(readinessLine(r2, 85).text) && /85/.test(readinessLine(r2, 85).text), 'one low timed mock → not ready, says the rule');
  ok(/עוד אין/.test(readinessLine(readinessOf([], 'c'), 85).text), 'no mocks line');
  ok(!readinessOf(M, 'c').used.has(undefined), 'used sources exclude style');
}

// ---------- browser ----------
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8811, B = `http://localhost:${PORT}/index.html?mock=exam&now=`;
const b = await chromium.launch();
async function open(now = '2026-11-26T09:00:00', w = 390, ctx = null) {
  const c = ctx || await b.newContext({ viewport: { width: w, height: 844 } });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(B + now + '#exam'); await p.waitForTimeout(800); p.errs = errs; p.c = c; return p;
}
const txt = (p, s) => p.$eval(s, e => e.textContent).catch(() => '');
const S = (p, col) => p.evaluate(c => window.__condisco.store.S[c], col);
const settle = p => p.waitForTimeout(300);

{ // screen, nav, unverified, readiness
  const p = await open();
  ok(await p.$('nav.tabs a[data-r=exam][aria-current=page]') !== null, 'exam tab in nav and current');
  const fit = await p.$eval('nav.tabs', n => [...n.querySelectorAll('a')].every(a => a.scrollWidth <= a.clientWidth + 1 && a.getBoundingClientRect().height < 70));
  ok(fit, '6 tabs fit at 390px without wrapping');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at 390');
  ok((await p.$$('.ex-chip')).length === 3, 'three upcoming exams in the picker');
  ok((await txt(p, '.ex-hero')).includes('72 ואז 86: עדיין לא'), 'readiness ignores the newer style practice (95)');
  ok((await txt(p, '.ex-hero .ex-now')).includes('סגירת פערים'), 'hero names the current phase');
  ok((await txt(p, '.ex-plan')).includes('דולג'), 'late start shows the dropped phase');
  await p.click('.ex-chip:nth-child(3)'); await settle(p);
  ok((await txt(p, '.ex-hero')).includes('לא מאומת'), 'course-only exam date shows לא מאומת');
  ok((await txt(p, '.ex-plan')).includes('התכנית מתחילה') || (await txt(p, '.ex-hero')).includes('התכנית מתחילה'), '40 days out: plan starts later');
  ok(!p.errs.length, 'no console errors ' + p.errs.join('|'));
  await p.c.close();
}
{ // plan → tasks, idempotent, own task untouched
  const p = await open();
  const before = (await S(p, 'tasks')).length;
  await p.click('[data-act=explan]'); await p.waitForTimeout(900);
  const t1 = await S(p, 'tasks'), mine = t1.filter(t => t.source === 'exam:xa');
  ok(mine.length > 3 && t1.length === before + mine.length, `plan added ${mine.length} tasks`);
  ok((await txt(p, '.plan-foot')).includes('מעודכנת'), 'after adding: plan says up to date, no button');
  ok(t1.find(t => t.id === 'own1').title === 'משימה שלי, לא מהתכנית', 'student task untouched');
  await p.click('[data-act=exrev]'); await settle(p);
  await p.click('[data-act=explan]'); await p.waitForTimeout(900);
  const t2 = await S(p, 'tasks'), mine2 = t2.filter(t => t.source === 'exam:xa');
  ok(mine2.length < mine.length && !mine2.some(t => /-rev$/.test(t.id)) && t2.some(t => t.id === 'own1'), 'without review blocks: review tasks removed, own task kept');
  await p.click('[data-act=exrev]'); await settle(p); await p.click('[data-act=explan]'); await p.waitForTimeout(900);
  const t3 = await S(p, 'tasks'); ok(new Set(t3.map(t => t.id)).size === t3.length && t3.filter(t => t.source === 'exam:xa').length === mine.length, 'regenerate: same count, no duplicates');
  await p.goto(B + '2026-11-26T09:00:00#today'); await p.waitForTimeout(600);
  ok(!p.errs.length, 'Today renders plan tasks without errors ' + p.errs.join('|'));
  await p.c.close();
}
{ // timed mock: start, reload keeps clock, stop early → untimed
  const p = await open();
  await p.fill('.ex-src', 'מבחן דוגמה 2023 מועד א'); await p.fill('.ex-min', '90'); await p.click('[data-act=exstart]'); await settle(p);
  ok(/^1:(29|30):\d\d$/.test(await txt(p, '#ex-clock')), 'clock shows 1:30:00 countdown: ' + await txt(p, '#ex-clock'));
  await p.reload(); await p.waitForTimeout(800);
  ok(await p.$('#ex-clock') !== null && (await txt(p, '.ex-src-l')).includes('2023'), 'reload keeps the running mock');
  await p.click('[data-act=exend][data-v="0"]'); await settle(p);
  await p.fill('.ex-score-v', '64'); await p.click('[data-act=exsave]'); await p.waitForTimeout(500);
  const m = (await S(p, 'mocks')).find(x => x.source === 'מבחן דוגמה 2023 מועד א');
  ok(m && m.timed === false && m.score === 64 && m.minutes === 90 && m.mode === 'past', 'stopped early → saved untimed with source and minutes');
  ok((await txt(p, '.ex-hero')).includes('72 ואז 86'), 'untimed mock does not change readiness');
  ok(await p.$eval('.ex-err details', d => d.open), 'after saving, the error form opens');
  await p.c.close();
}
{ // time runs out → bell, score, counts; then errors → practice item
  const p = await open();
  await p.fill('.ex-src', 'מבחן דוגמה 2023 מועד ב'); await p.fill('.ex-min', '30'); await p.click('[data-act=exstart]'); await settle(p);
  await p.evaluate(() => window.__condisco.clock().advance(31 * 60000)); await p.waitForTimeout(1600);
  ok(await p.$('.ex-run.over') !== null && (await txt(p, '.ex-sub')).includes('הזמן נגמר'), 'time up shown');
  await p.click('[data-act=exend]'); await settle(p);
  await p.fill('.ex-score-v', '91'); await p.click('[data-act=exsave]'); await p.waitForTimeout(500);
  const m = (await S(p, 'mocks')).find(x => x.source === 'מבחן דוגמה 2023 מועד ב');
  ok(m && m.timed === true && m.score === 91, 'time up → saved as timed');
  ok((await txt(p, '.ex-hero')).includes('86 ואז 91: מוכנות'), 'two consecutive ≥85 → ready');
  await p.fill('.err-what', 'שאלה 5: טעות סימן'); await p.selectOption('.err-kind', 'careless'); await p.click('[data-act=exerr]'); await p.waitForTimeout(500);
  const e = (await S(p, 'errors')).find(x => x.what === 'שאלה 5: טעות סימן');
  ok(e && e.kind === 'careless' && e.mockId === m.id && e.fix && e.resolved === false, 'error logged, linked to the newest mock, default fix');
  const pi = (await S(p, 'practice_items')).find(x => x.errorId === e.id);
  ok(pi && pi.box === 1 && pi.due === '2026-11-27' && pi.source === 'מבחן דוגמה 2023 מועד ב', 'error → practice card box 1 due tomorrow, source = the mock');
  await p.click(`[data-act=exerrdone][data-id="${e.id}"]`); await p.waitForTimeout(400);
  ok((await S(p, 'errors')).find(x => x.id === e.id).resolved === true, 'resolve error');
  ok(!p.errs.length, 'no console errors ' + p.errs.join('|'));
  await p.c.close();
}
{ // record a past mock + style practice + validation
  const p = await open();
  await p.click('.ex-rec summary'); await p.click('[data-act=exrec]'); await settle(p);
  ok((await S(p, 'mocks')).length === 6, 'no source → nothing saved');
  await p.fill('.rec-src', 'דף סגנון'); await p.fill('.rec-score', '99'); await p.check('.rec-style'); await p.click('[data-act=exrec]'); await p.waitForTimeout(400);
  const st = (await S(p, 'mocks')).find(x => x.source === 'דף סגנון');
  ok(st && st.mode === 'style' && st.timed === false, 'style practice saved as not counting');
  ok((await txt(p, '.ex-hero')).includes('72 ואז 86'), 'style practice does not change readiness');
  await p.goto(B + '2026-11-26T09:00:00#gaps'); await p.waitForTimeout(600);
  ok(!p.errs.length, 'Gaps still renders with the new mock fields ' + p.errs.join('|'));
  await p.c.close();
}
{ // two tabs share one running mock
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const a = await open('2026-11-26T09:00:00', 1440, c), d = await open('2026-11-26T09:00:00', 1440, c);
  await a.fill('.ex-src', 'מבחן דוגמה 2021'); await a.fill('.ex-min', '60'); await a.click('[data-act=exstart]'); await a.waitForTimeout(800);
  ok(await d.$('#ex-clock') !== null, 'second tab picks up the running mock');
  await c.close();
}
await b.close();
console.log(fails ? `${fails} FAILED` : 'all exam tests pass'); process.exit(fails ? 1 : 0);
