// ?mock=1 — an in-memory stand-in for claude.use("db") with the same call shapes the store uses,
// plus clearly fake sample data so every screen can be tested. Never used on the published page unless ?mock=1.
// ?mock=empty starts with an empty db (first-run screen).
import { addDays, todayStr, clock } from './util.js';

function makeDb(seed) {
  const data = new Map(); // "col/id" -> object
  const subs = new Map(); // col -> Set<cb>
  let n = 0;
  for (const [col, docs] of Object.entries(seed)) for (const d of docs) { const { id, ...rest } = d; data.set(col + '/' + id, rest); }
  const docsOf = col => [...data.entries()].filter(([k]) => k.startsWith(col + '/') && k.split('/').length === 2)
    .map(([k, v]) => ({ id: k.split('/')[1], data: () => JSON.parse(JSON.stringify(v)) }));
  const notify = col => setTimeout(() => (subs.get(col) || []).forEach(cb => cb({ docs: docsOf(col), metadata: { fromCache: false } })), 0);
  const delay = () => new Promise(r => setTimeout(r, 15));
  const doc = path => {
    const col = path.split('/')[0];
    return {
      id: path.split('/')[1],
      async get() { await delay(); const v = data.get(path); return { id: path.split('/')[1], exists: !!v, data: () => v && JSON.parse(JSON.stringify(v)) }; },
      async set(v) { await delay(); data.set(path, JSON.parse(JSON.stringify(v))); notify(col); },
      async update(v) { await delay(); if (!data.has(path)) { const e = new Error('not found'); e.code = 'not-found'; throw e; } data.set(path, { ...data.get(path), ...JSON.parse(JSON.stringify(v)) }); notify(col); },
      async delete() { await delay(); data.delete(path); notify(col); },
    };
  };
  return {
    _data: data,
    doc,
    collection(col) {
      return {
        doc: id => doc(col + '/' + (id || ('auto' + (++n)))),
        async add(v) { const id = 'auto' + Date.now().toString(36) + (++n); await doc(col + '/' + id).set(v); return { id }; },
        onSnapshot(cb) { if (!subs.has(col)) subs.set(col, new Set()); subs.get(col).add(cb); setTimeout(() => cb({ docs: docsOf(col), metadata: { fromCache: false } }), 30); return () => subs.get(col).delete(cb); },
      };
    },
  };
}

// Sample data: obviously fictional ("קורס דוגמה"), dated relative to the fake clock.
function sample() {
  const t = todayStr(), d = n => addDays(t, n);
  const iso = (n, hm = '23:59') => d(n) + 'T' + hm + ':00+02:00';
  return {
    settings: [{ id: 'main', name: 'נועה', target: 85, wakeTime: '07:00', onboarded: true }],
    meta: [{ id: 'schema', version: 1 }], // forces the v2 migration in tests
    courses: [
      { id: 'a', name: 'קורס דוגמה א', order: 1, color: '#3a60d8', confidence: 4, aiSolve: 'forbidden', aiSolveVerified: true },
      { id: 'b', name: 'קורס דוגמה ב', order: 2, color: '#1f8a70', confidence: 6 },
      { id: 'c', name: 'קורס דוגמה ג', order: 3, confidence: 7, aiSolve: 'allowed', aiSolveVerified: false },
    ],
    units: [
      { id: 'a-l1', courseId: 'a', kind: 'lecture', num: 1, title: 'מבוא', status: 'solo', confidence: 4 },
      { id: 'a-l2', courseId: 'a', kind: 'lecture', num: 2, title: 'נושא שני', status: 'read', confidence: 2, missed: true },
      { id: 'a-l3', courseId: 'a', kind: 'lecture', num: 3, title: 'נושא שלישי', status: 'not_started', missed: true },
      { id: 'a-r1', courseId: 'a', kind: 'recitation', num: 1, title: 'תרגול 1', status: 'example' },
      { id: 'b-l1', courseId: 'b', kind: 'lecture', num: 1, title: 'פרק 1', status: 'practiced' },
      { id: 'b-l2', courseId: 'b', kind: 'lecture', num: 2, title: 'פרק 2', status: 'not_started' },
      { id: 'c-l1', courseId: 'c', kind: 'lecture', num: 1, title: 'פרק 1', status: 'exam' },
    ],
    tasks: [
      { id: 'w1', courseId: 'b', title: 'שאלה קלה אחת לחימום', date: t, start: '08:00', minutes: 10, status: 'done', warmup: true },
      { id: 't1', courseId: 'a', title: 'הרצאה 2: דוגמה פתורה ואז שאלה לבד', date: t, start: '08:15', minutes: 50, status: 'todo', priority: 1, minVersion: 'רק הדוגמה הראשונה', where: 'שולחן בבית', unitIds: ['a-l2'] },
      { id: 't2', courseId: 'b', title: 'פרק 2: קריאה ושאלה אחת', date: t, start: '11:00', minutes: 45, status: 'todo', priority: 2 },
      { id: 't3', courseId: 'c', title: 'מבחן קודם, חצי ראשון בזמן', date: t, start: '16:30', minutes: 90, status: 'todo', priority: 2 },
      { id: 't4', courseId: 'a', title: 'משימה מאתמול', date: d(-1), start: '10:00', minutes: 30, status: 'todo' },
      { id: 't5', courseId: 'b', title: 'משימה למחר', date: d(1), start: '08:00', minutes: 45, status: 'todo' },
    ],
    deadlines: [
      { id: 'd1', courseId: 'a', title: 'תרגיל בית 3', kind: 'hw', due: iso(2), estHours: 4, status: 'open', verified: true, source: 'מודל' },
      { id: 'd2', courseId: 'b', title: 'תרגיל בית 2', kind: 'hw', due: iso(9), estHours: 3, status: 'open', verified: false, source: 'צילום מסך' },
      { id: 'd3', courseId: 'c', title: 'מבחן אמצע', kind: 'exam', due: iso(23, '09:00'), status: 'open', verified: true },
      { id: 'd4', courseId: 'a', title: 'טופס מנהלה', kind: 'admin', due: iso(5), status: 'open' },
      { id: 'd5', courseId: 'b', title: 'תרגיל בית 1', kind: 'hw', due: iso(-3), status: 'submitted' },
    ],
    checkins: [{ id: d(-1), date: d(-1), did: 'בלוק אחד בבוקר', wentWell: 'התחלתי בזמן', blocked: 'עייפות אחר הצהריים', energy: 3, sleep: 7, tomorrow: 'בלוק ב-08:00', firstWhen: '08:00', firstWhere: 'בית' }],
    habits: [
      { id: 'study', name: 'בלוק לימוד', order: 1, active: true },
      { id: 'sport', name: 'תנועה קצרה לפני לימוד', order: 2, active: true },
    ],
    habitlog: [{ id: d(-1), date: d(-1), study: true }, { id: t, date: t, sport: true }],
    sessions: [
      { id: 's1', kind: 'block', taskId: 't4', courseId: 'a', startedAt: d(-1) + 'T10:00:00Z', endedAt: d(-1) + 'T10:50:00Z', focusMin: 45, breath: true, zone: ['dnd'], goal: '', recall: 'part' },
      { id: 's0', kind: 'block', courseId: 'a', startedAt: d(-200) + 'T10:00:00Z', endedAt: d(-200) + 'T10:50:00Z', focusMin: 45 },
    ],
    mocks: [
      { id: 'm1', courseId: 'c', title: 'מבחן דוגמה 1', score: 78, timed: true, date: d(-6) },
      { id: 'm2', courseId: 'c', title: 'מבחן דוגמה 2', score: 84, timed: true, date: d(-2) },
      { id: 'm3', courseId: 'b', title: 'מבחן דוגמה', score: 88, timed: false, date: d(-3) },
    ],
    practice_items: [
      { id: 'p1', courseId: 'a', unitId: 'a-l1', prompt: 'שאלת חזרה לדוגמה: מה ההגדרה המרכזית מהרצאה 1, במילים שלך?', source: 'הרצאה 1, שקף 4', box: 2, due: t, lastResult: 'right' },
      { id: 'p2', courseId: 'b', unitId: 'b-l1', prompt: 'שאלת חזרה לדוגמה: מה ההבדל בין שני המושגים מפרק 1?', source: 'פרק 1', box: 1, due: d(-1), lastResult: 'wrong' },
    ],
    errors: [{ id: 'e1', courseId: 'c', mockId: 'm2', what: 'בלבול בסימנים בשאלה 3', kind: 'careless', fix: 'לבדוק סימנים בסוף כל שאלה', resolved: false, createdAt: d(-2) + 'T12:00:00Z' }],
  };
}

export function mockUse(kind) {
  const seed = kind === 'empty' ? {} : sample();
  if (kind === 'deadlines') seed.deadlines.push(...deadlineEdges());
  if (kind === 'exam') examEdges(seed);
  const db = makeDb(seed);
  window.__mockDb = db;
  return async name => {
    await new Promise(r => setTimeout(r, 20));
    if (name === 'db') return db;
    if (name === 'user') return { isOwner: async () => true, canEdit: async () => true, id: async () => 'mock-user' };
    return null;
  };
}
export { clock };

// ?mock=deadlines: the normal sample plus edge cases for the Deadlines screen (overdue, due today, earlier today,
// tomorrow, no date, unverified quiz, missed, a long title). All fictional.
function deadlineEdges() {
  const t = todayStr(), d = n => addDays(t, n), iso = (n, hm = '23:59') => d(n) + 'T' + hm + ':00+02:00';
  return [
    { id: 'e1', courseId: 'a', title: 'תרגיל בית 4', kind: 'hw', due: iso(-2), estHours: 3, status: 'open', verified: true, graded: true },
    { id: 'e2', courseId: 'c', title: 'הגשת דוח מעבדה', kind: 'hw', due: iso(0, '23:00'), estHours: 1.5, status: 'open', verified: true, graded: true },
    { id: 'e3', courseId: 'b', title: 'טופס הרשמה לתרגול', kind: 'admin', due: iso(0, '07:00'), status: 'open', verified: true, graded: false },
    { id: 'e4', courseId: 'a', title: 'בוחן קצר', kind: 'quiz', due: iso(1, '10:00'), status: 'open', verified: false, source: 'סילבוס: שבוע 7 (תאריך משוער)', sourceUrl: 'https://example.com/syllabus', graded: true },
    { id: 'e5', courseId: 'b', title: 'פרויקט סיום', kind: 'hw', due: '', estHours: 20, status: 'open', verified: false, sourceUrl: 'javascript:alert(1)', graded: true },
    { id: 'e6', courseId: 'c', title: 'תרגיל בית 0', kind: 'hw', due: iso(-10), status: 'missed', verified: true, graded: true },
    { id: 'e7', courseId: 'a', title: 'מטלה ארוכה מאוד עם שם שממשיך וממשיך כדי לבדוק שבירת שורות במסך צר', kind: 'hw', due: iso(40), estHours: 6, status: 'open', verified: true, graded: true },
    { id: 'e8', courseId: 'c', title: 'מבחן סופי', kind: 'exam', due: iso(60, '09:00'), estHours: 30, status: 'open', verified: true, graded: true },
  ];
}

// ?mock=exam: the normal sample plus exam-mode cases (owned by the exam-mode thread). All fictional:
// course a has an exam in 10 days (inside "close gaps") with past-exam mocks that carry source and minutes,
// one style practice that must not count, and a student-made task that the plan must never touch;
// course b has an unverified exam date on the course only (no deadline), 40 days out.
function examEdges(seed) {
  const t = todayStr(), d = n => addDays(t, n);
  seed.deadlines.push({ id: 'xa', courseId: 'a', title: 'מבחן אמצע', kind: 'exam', due: d(10) + 'T09:00:00+02:00', status: 'open', verified: true, source: 'סילבוס' });
  seed.courses.find(c => c.id === 'b').examDate = d(40);
  seed.mocks.push(
    { id: 'ma1', courseId: 'a', title: 'מבחן דוגמה 2022 מועד א', source: 'מבחן דוגמה 2022 מועד א', score: 72, timed: true, date: d(-8), minutes: 120, mode: 'past' },
    { id: 'ma2', courseId: 'a', title: 'מבחן דוגמה 2022 מועד ב', source: 'מבחן דוגמה 2022 מועד ב', score: 86, timed: true, date: d(-4), minutes: 120, mode: 'past' },
    { id: 'ma3', courseId: 'a', title: 'תרגיל בסגנון', source: 'דף תרגול 3', score: 95, timed: false, date: d(-1), mode: 'style' },
  );
  seed.errors.push(
    { id: 'ea1', courseId: 'a', mockId: 'ma1', what: 'שאלה 2: לא זיהיתי את סוג הבעיה', kind: 'concept', fix: 'דוגמה פתורה ואז שתי שאלות לבד', resolved: false, createdAt: d(-8) + 'T12:00:00Z' },
    { id: 'ea2', courseId: 'a', mockId: 'ma1', what: 'שאלה 4: לא הספקתי', kind: 'time', fix: 'סטים בזמן', resolved: false, createdAt: d(-8) + 'T12:01:00Z' },
    { id: 'ea3', courseId: 'a', mockId: 'ma2', what: 'שאלה 1: הגדרה לא מדויקת', kind: 'concept', fix: 'לכתוב את ההגדרה מהזיכרון', resolved: false, createdAt: d(-4) + 'T12:00:00Z' },
  );
  seed.tasks.push({ id: 'own1', courseId: 'a', title: 'משימה שלי, לא מהתכנית', date: d(3), minutes: 40, status: 'todo' });
}
