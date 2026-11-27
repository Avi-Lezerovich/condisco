// Pure study rules. No DOM, no db: every function takes data and returns data, so it can be unit-tested.
import { addDays, dayDiff, toMin } from './util.js';

// ---- unit ladder: not_started → read → example → solo → exam ----
export const LADDER = ['not_started', 'read', 'example', 'solo', 'exam'];
export const LADDER_HE = { not_started: 'עוד לא התחלתי', read: 'קראתי', example: 'דוגמה פתורה', solo: 'פתרתי לבד', exam: 'ברמת מבחן' };
export const LADDER_W = { not_started: 0, read: .2, example: .45, solo: .7, exam: 1 };
export const LADDER_MIX = { read: 18, example: 40, solo: 68, exam: 100 };
const LEGACY = { practiced: 'solo', mastered: 'exam' };
export const norm = s => LEGACY[s] || (LADDER.includes(s) ? s : 'not_started');
export const nextStep = s => LADDER[(LADDER.indexOf(norm(s)) + 1) % LADDER.length];
export function progress(units) {
  if (!units.length) return 0;
  return Math.round(100 * units.reduce((s, u) => s + LADDER_W[norm(u.status)], 0) / units.length);
}

// ---- tasks ----
export const WIN = s => s === 'done' || s === 'min';
export const sortDay = list => [...list].sort((a, b) =>
  (b.warmup ? 1 : 0) - (a.warmup ? 1 : 0) || (a.start || '99').localeCompare(b.start || '99') || (a.priority || 9) - (b.priority || 9));

export function weekStats(tasks, habitlog, today) {
  const dow = new Date(today + 'T12:00').getDay(), start = addDays(today, -dow);
  const wins = tasks.filter(t => t.date >= start && t.date <= today && WIN(t.status));
  const mins = wins.reduce((s, t) => s + (t.status === 'min' ? Math.min(15, +t.minutes || 0) : (+t.minutes || 0)), 0);
  const days = new Set(wins.map(t => t.date));
  habitlog.forEach(h => { if (h.id >= start && h.id <= today && Object.keys(h).some(k => k !== 'id' && h[k] === true)) days.add(h.id); });
  return { wins: wins.length, mins, active: days.size, of: dow + 1 };
}

// next task today that has not started yet, or the first open one
export function nextTask(tasks, today) {
  return sortDay(tasks.filter(t => t.date === today && t.status === 'todo'))[0] || null;
}
export function nextTimed(tasks, today, now) {
  return sortDay(tasks.filter(t => t.date === today && t.status === 'todo' && toMin(t.start) != null)).find(t => toMin(t.start) >= now) || null;
}

// ---- timed practice exams (mocks) ----
export function mockStats(mocks, courseId, target = 85) {
  const mk = mocks.filter(m => m.courseId === courseId && Number.isFinite(+m.score))
    .sort((a, b) => String(b.date || b.createdAt).localeCompare(String(a.date || a.createdAt)));
  const timed = mk.filter(m => m.timed !== false);
  const last2 = timed.slice(0, 2);
  const avg = last2.length ? Math.round(last2.reduce((s, m) => s + +m.score, 0) / last2.length) : null;
  const ready = last2.length === 2 && last2.every(m => +m.score >= target); // two consecutive timed mocks ≥ target
  return { list: mk, avg, ready, count: timed.length };
}

// ---- Leitner boxes: wrong → box 1, due +1 day; right → next box, due +3 / +7 / +14 ----
export const BOX_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14 };
export function review(item, result, today) {
  const box = result === 'right' ? Math.min(4, (+item.box || 1) + 1) : 1;
  const days = result === 'right' ? BOX_DAYS[box] : 1;
  return { box, due: addDays(today, days), lastResult: result };
}
export const dueItems = (items, today) => items.filter(i => i.due && i.due <= today).sort((a, b) => a.due.localeCompare(b.due) || (a.box || 1) - (b.box || 1));

// ---- priority: deadline > gap > weakness > spaced review ----
// Returns up to `max` suggestions for a day that has fewer than two planned tasks. Each has a reason the student can read.
export function suggest(s, today, max = 4) {
  const target = (s.settings.find(x => x.id === 'main') || {}).target || 85;
  const cm = Object.fromEntries(s.courses.map(c => [c.id, c]));
  const out = [];
  // 1. deadlines in the next 7 days, soonest first
  s.deadlines.filter(d => d.status === 'open' && d.due && dayDiff(d.due, today) >= 0 && dayDiff(d.due, today) <= 7)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)))
    .forEach(d => out.push({ kind: 'deadline', rank: 1, courseId: d.courseId, title: d.title, minutes: 50, ref: d.id,
      why: dayDiff(d.due, today) === 0 ? 'להיום' : `דדליין בעוד ${dayDiff(d.due, today)} ימים` }));
  // 2. gaps: missed units still not started, by course order
  s.units.filter(u => u.missed && norm(u.status) === 'not_started')
    .sort((a, b) => ((cm[a.courseId] || {}).order || 9) - ((cm[b.courseId] || {}).order || 9) || (+a.num || 0) - (+b.num || 0))
    .slice(0, 3)
    .forEach(u => out.push({ kind: 'gap', rank: 2, courseId: u.courseId, title: `השלמה: ${u.title || u.id}`, minutes: 45, ref: u.id, unitIds: [u.id], why: 'פספסתי' }));
  // 3. weakness: courses whose last-2 timed mock average is under target
  s.courses.forEach(c => {
    const m = mockStats(s.mocks, c.id, target);
    if (m.avg != null && m.avg < target) out.push({ kind: 'weak', rank: 3, courseId: c.id, title: `שאלות ממבחן קודם: ${c.name}`, minutes: 50, ref: c.id, why: `ממוצע ${m.avg}, יעד ${target}` });
  });
  // 4. spaced review: practice items due today or earlier
  const due = dueItems(s.practice_items, today);
  if (due.length) out.push({ kind: 'review', rank: 4, courseId: due[0].courseId, title: `חזרה מרווחת: ${due.length} שאלות`, minutes: 15, ref: 'review', why: 'הגיע הזמן לחזרה' });
  return out.sort((a, b) => a.rank - b.rank).slice(0, max);
}

// ---- housekeeping ----
export const SESSION_KEEP_DAYS = 180;
export function sessionsToPrune(sessions, today, keep = SESSION_KEEP_DAYS) {
  const cutoff = addDays(today, -keep);
  return sessions.filter(x => { const d = String(x.startedAt || x.endedAt || '').slice(0, 10); return d && d < cutoff; }).map(x => x.id);
}
