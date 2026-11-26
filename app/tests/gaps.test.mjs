// Pure tests for the Gaps screen helpers. Run: node tests/gaps.test.mjs
import { nextUnit, readiness, examOf, unitLabel, unitTitle, inDays } from '../ui/gaps.js';
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const U = (id, kind, num, status, missed) => ({ id, courseId: 'a', kind, num, status, missed });
// next unit: missed not-started first, then lowest stage in course order; null when all at exam
ok(nextUnit([U('1', 'lecture', 1, 'read'), U('2', 'lecture', 3, 'not_started', true), U('3', 'lecture', 2, 'not_started')]).id === '2', 'missed first');
ok(nextUnit([U('1', 'recitation', 1, 'read'), U('2', 'lecture', 4, 'read'), U('3', 'lecture', 2, 'solo')]).id === '2', 'lowest stage, lecture before recitation');
ok(nextUnit([U('1', 'lecture', 1, 'practiced'), U('2', 'lecture', 2, 'mastered')]).id === '1', 'legacy statuses');
ok(nextUnit([U('1', 'lecture', 1, 'exam')]) === null && nextUnit([]) === null, 'all done / empty');
// readiness: both of the last two timed must be >= target; an untimed one never counts
const M = (score, date, timed = true) => ({ courseId: 'a', score, date, timed });
ok(readiness([M(80, '2026-11-01'), M(92, '2026-11-05')], 'a', 85).state === 'one', 'avg 86 but one below: not ready, newest above');
ok(readiness([M(92, '2026-11-01'), M(80, '2026-11-05')], 'a', 85).state === 'below', 'newest below');
ok(readiness([M(86, '2026-11-01'), M(90, '2026-11-05'), M(99, '2026-11-06', false)], 'a', 85).state === 'ready', 'two timed above, untimed ignored');
ok(readiness([M(85, '2026-11-05')], 'a', 85).state === 'one', 'single at target');
ok(readiness([], 'a', 85).state === 'none', 'none');
ok(readiness([M(90, '2026-11-01'), M(90, '2026-11-02')], 'a', 95).state === 'below', 'custom target');
// exam date: course field, else nearest open exam deadline from today
const D = [{ courseId: 'a', kind: 'exam', status: 'open', due: '2026-12-20T09:00:00+02:00' }, { courseId: 'a', kind: 'exam', status: 'open', due: '2026-12-18T09:00:00+02:00' }, { courseId: 'a', kind: 'exam', status: 'open', due: '2026-11-01' }, { courseId: 'a', kind: 'hw', status: 'open', due: '2026-11-30' }];
ok(examOf({ id: 'a' }, D, '2026-11-26') === '2026-12-18', 'nearest future exam deadline');
ok(examOf({ id: 'a', examDate: '2027-01-19' }, D, '2026-11-26') === '2027-01-19', 'course examDate wins');
ok(examOf({ id: 'b' }, D, '2026-11-26') === null, 'no exam');
// labels
ok(unitLabel(U('x', 'lecture', 3)) === 'הרצאה 3' && unitLabel({ kind: 'weird', num: 2 }) === 'יחידה 2' && unitLabel({ kind: 'summary' }) === 'סיכום', 'labels');
ok(unitTitle({ kind: 'recitation', num: 1, title: 'תרגול 1' }) === '' && unitTitle({ kind: 'lecture', num: 1, title: 'מבוא' }) === 'מבוא', 'duplicate title hidden');
ok(inDays(0) === 'היום' && inDays(1) === 'מחר' && inDays(5) === 'בעוד 5 ימים', 'inDays');
console.log(`${n - bad}/${n} gaps tests pass`); process.exit(bad ? 1 : 0);
