// Exam mode, pure rules (no DOM, no db). Owned by the exam-mode thread.
// - upcoming exams from deadlines (kind exam) and course dates (examDate, midtermDate), de-duplicated
// - the backward plan: T-21..15 diagnose, T-14..8 close gaps, T-7..2 sharpen, T-1 light
// - readiness: the two most recent timed mocks from real past exams, both at or above the target
// - the plan's own tasks (source "exam:<examId>"), idempotent: regenerate = same ids, never touches other tasks
import { addDays, dayDiff, parse } from './util.js';

export const PHASES = [
  { key: 'diagnose', from: 21, to: 15, he: 'אבחון', what: 'מיפוי היחידות לפי שלב, מבחן פתיחה בזמן, וכל נקודה שירדה נכנסת ליומן הטעויות.' },
  { key: 'gaps', from: 14, to: 8, he: 'סגירת פערים', what: 'מבחן אחד בזמן בשבוע, ובלוק יומי על שלוש הטעויות הנפוצות.' },
  { key: 'sharpen', from: 7, to: 2, he: 'חידוד', what: 'שני מבחנים בזמן בשבוע, וחזרה מרווחת ומעורבבת על הטעויות. בלי חומר חדש, אלא אם יש פער.' },
  { key: 'light', from: 1, to: 1, he: 'יום קל', what: "20–30 דק' שליפה מכרטיסים בקופסאות 1–2, דף נוסחאות אם מותר, ושינה מוקדמת. בלי מבחן." },
];
export const PHASE_HE = Object.fromEntries(PHASES.map(p => [p.key, p.he]));
// days before the exam that get a timed mock: baseline, one in the gaps week, two in the last week
export const MOCK_DAYS = [18, 10, 6, 3];
export const ERR_KINDS = ['concept', 'careless', 'time', 'reading', 'unknown'];
export const ERR_HE = { concept: 'מושג', careless: 'רשלנות', time: 'זמן', reading: 'קריאת השאלה', unknown: 'לא ברור' };
export const ERR_FIX = {
  concept: 'דוגמה פתורה, ואחריה שתי שאלות לבד',
  careless: 'שורה ברשימת הבדיקה, למשל "לקרוא שוב את התנאי"',
  time: 'סטים בזמן של 2–3 שאלות',
  reading: 'לסמן מה בדיוק שואלים, וחמישה תרגילי קריאה קצרים',
  unknown: 'לברר עם Claude מה קרה, ואז לבחור סוג',
};

const isDate = s => /^\d{4}-\d{2}-\d{2}/.test(String(s || '')) && !isNaN(parse(s));
const timeOf = s => { const t = String(s || '').slice(11, 16); return /^\d{2}:\d{2}$/.test(t) && t !== '00:00' ? t : ''; };

// Upcoming (and today's) exams, soonest first. Deadlines win over course fields on the same course and day.
// A course date counts as verified only with courses.examVerified === true; deadlines carry their own `verified`.
export function examsOf(S, today) {
  const cm = Object.fromEntries(S.courses.map(c => [c.id, c]));
  const out = [];
  S.deadlines.filter(d => d.kind === 'exam' && (d.status === 'open' || !d.status) && isDate(d.due)).forEach(d => {
    out.push({ id: d.id, courseId: d.courseId, title: d.title || 'מבחן', date: String(d.due).slice(0, 10), time: timeOf(d.due), verified: d.verified === true, source: d.source || '', from: 'deadline' });
  });
  S.courses.forEach(c => {
    [['examDate', 'מבחן סופי'], ['midtermDate', 'מבחן אמצע']].forEach(([f, title]) => {
      if (!isDate(c[f])) return;
      const date = String(c[f]).slice(0, 10);
      if (out.some(e => e.courseId === c.id && e.date === date)) return;
      out.push({ id: c.id + '-' + (f === 'examDate' ? 'final' : 'mid'), courseId: c.id, title, date, time: '', verified: c.examVerified === true, source: 'נתוני הקורס', from: 'course' });
    });
  });
  return out.filter(e => cm[e.courseId] && dayDiff(e.date, today) >= 0)
    .map(e => ({ ...e, days: dayDiff(e.date, today) }))
    .sort((a, b) => a.date.localeCompare(b.date) || (cm[a.courseId].order || 9) - (cm[b.courseId].order || 9));
}

// which part of the plan a day falls in: 'before' (more than 21 days out), a phase key, or 'day' (the exam itself)
export function phaseAt(days) {
  if (days <= 0) return 'day';
  const p = PHASES.find(x => days <= x.from && days >= x.to);
  return p ? p.key : 'before';
}

// The backward plan for one exam as dated phases. Phases that already passed before today are `dropped`
// when the plan starts late (fewer than 21 days), so the screen can say what was compressed.
export function planOf(exam, today) {
  const T = exam.days;
  const phases = PHASES.map(p => {
    const start = addDays(exam.date, -p.from), end = addDays(exam.date, -p.to);
    const state = end < today ? 'past' : start <= today ? 'now' : 'next';
    return { ...p, start, end, state };
  });
  const late = T < 21;
  phases.forEach(p => { if (late && p.state === 'past') p.dropped = true; });
  const mocks = MOCK_DAYS.map(n => addDays(exam.date, -n)).filter(d => d >= today);
  // started inside the diagnose phase after its baseline day: the baseline mock moves to today
  if (T >= 15 && T < 18 && !mocks.includes(today)) mocks.unshift(today);
  return { phase: phaseAt(T), phases, mocks: [...new Set(mocks)].sort(), late, dropped: phases.filter(p => p.dropped).map(p => p.he) };
}

// mocks of a course, newest first; real past-exam mocks only count when timed (style practice never counts)
export const counts = m => m.timed !== false && m.mode !== 'style' && Number.isFinite(+m.score);
export function readinessOf(mocks, courseId, target = 85) {
  const list = mocks.filter(m => m.courseId === courseId && Number.isFinite(+m.score))
    .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const last2 = list.filter(counts).slice(0, 2);
  const ready = last2.length === 2 && last2.every(m => +m.score >= target);
  return { list, last2, ready, used: new Set(list.filter(m => m.mode !== 'style').map(m => String(m.source || m.title || '').trim()).filter(Boolean)) };
}

// the one-line readiness rule, always with the rule, the two numbers and the verdict
export function readinessLine(r, target) {
  const rule = `צריך שני מבחנים רצופים בזמן, שניהם ${target} ומעלה.`;
  const [a, b] = r.last2; // a = newest
  if (!a) return { tone: '', text: 'עוד אין מבחן בזמן. ' + rule };
  if (!b) return { tone: +a.score >= target ? 'up' : 'warn', text: `מבחן אחד בזמן: ${+a.score}. ${rule}` };
  if (r.ready) return { tone: 'ok', text: `${+b.score} ואז ${+a.score}: מוכנות. שני מבחנים רצופים בזמן מעל ${target}.` };
  return { tone: 'warn', text: `${+b.score} ואז ${+a.score}: עדיין לא. ${rule}` };
}

// open errors of a course by kind, most frequent first
export function errorKinds(errors, courseId) {
  const open = errors.filter(e => e.courseId === courseId && !e.resolved);
  const n = {}; open.forEach(e => { const k = ERR_KINDS.includes(e.kind) ? e.kind : 'unknown'; n[k] = (n[k] || 0) + 1; });
  return { open, kinds: Object.entries(n).sort((a, b) => b[1] - a[1]).map(([kind, count]) => ({ kind, count })) };
}

// the exam length the student used last time for this course (minutes), or null: never guessed
export function lastMinutes(mocks, courseId) {
  const m = mocks.filter(x => x.courseId === courseId && +x.minutes > 0).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
  return m ? +m.minutes : null;
}

// ---- the plan's own tasks ----
const md = s => s.slice(5, 7) + s.slice(8, 10);
export const planSource = exam => 'exam:' + exam.id;
const safeId = s => String(s).replace(/[^\w-]/g, '_');

// Desired tasks for an exam from today on. Ids are fixed per exam and day, so adding the plan twice writes the same docs.
export function planTasks(exam, course, today, { minutes = null, review = true } = {}) {
  const plan = planOf(exam, today), src = planSource(exam), name = course.name || '';
  const id = (day, k) => `x${md(day)}-${safeId(exam.id)}-${k}`;
  const base = { courseId: exam.courseId, status: 'todo', source: src };
  const out = [];
  const diag = plan.phases[0];
  if (exam.days >= 15) {
    const day = diag.start > today ? diag.start : today;
    out.push({ ...base, id: id(day, 'map'), date: day, minutes: 30, priority: 1, title: `אבחון לקראת ${exam.title}: מיפוי היחידות לפי שלב (${name})` });
  }
  plan.mocks.forEach(day => out.push({ ...base, id: id(day, 'mock'), date: day, minutes: minutes || 180, priority: 1, mock: true,
    title: `מבחן בזמן מתוך מבחן קודם אמיתי (${name}), ${minutes ? minutes + " דק'" : 'באורך המבחן האמיתי'}` }));
  if (review) {
    for (let n = 14; n >= 2; n--) {
      const day = addDays(exam.date, -n);
      if (day < today || plan.mocks.includes(day)) continue;
      out.push({ ...base, id: id(day, 'rev'), date: day, minutes: 30, priority: 2,
        title: n >= 8 ? `יומן הטעויות (${name}): שלוש הטעויות הנפוצות` : `חזרה מרווחת ומעורבבת על יומן הטעויות (${name})` });
    }
  }
  const t1 = addDays(exam.date, -1);
  if (t1 >= today) out.push({ ...base, id: id(t1, 'light'), date: t1, minutes: 30, priority: 1, title: `יום קל לפני ${exam.title} (${name}): שליפה קצרה ושינה מוקדמת` });
  return out;
}

// What to write so the stored plan equals `want`: set new or changed open tasks, remove the plan's own open tasks
// that are no longer wanted. Done, skipped or minimum tasks stay as they are. Tasks without this source are never touched.
export function planDiff(tasks, want, src) {
  const mine = tasks.filter(t => t.source === src);
  const byId = Object.fromEntries(mine.map(t => [t.id, t]));
  const set = [], remove = [];
  const keys = ['date', 'title', 'minutes', 'priority', 'courseId'];
  want.forEach(w => {
    const cur = byId[w.id];
    if (cur && cur.status && cur.status !== 'todo') return;
    if (tasks.some(t => t.id === w.id && t.source !== src)) return; // id taken by someone else's task: leave it
    if (!cur || keys.some(k => cur[k] !== w[k])) set.push(w);
  });
  const wanted = new Set(want.map(w => w.id));
  mine.forEach(t => { if (!wanted.has(t.id) && (t.status || 'todo') === 'todo') remove.push(t.id); });
  return { set, remove };
}
