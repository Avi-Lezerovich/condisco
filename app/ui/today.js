// Today: next-up card with countdown, tools, week stats, habits, deadlines shelf, day switcher,
// timeline with a live "now" line, suggestions when the day is thin, spaced review.
import { esc, z, cvar, dm, dur, DOW, parse, addDays, todayStr, nowMin, toMin, dayDiff, clock, CHECK, toast, empty } from '../core/util.js';
import { WIN, sortDay, weekStats, suggest, dueItems, review } from '../core/model.js';
import { isRunning, timerShowing, remaining } from '../focus/engine.js';

const EVENING = 20 * 60;           // from 20:00 the hero turns toward closing the day
const LATE = 20;                   // minutes after a planned start before we stop saying "now"
const OVERDUE_MAX = 5;             // older open tasks shown at once
const SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const stamp = () => new Date(clock.now()).toISOString();
// timeline order: by start time (untimed last), a warm-up first on ties, then priority
const tm = t => toMin(t.start) ?? 9999;
const byTime = list => [...list].sort((a, b) => tm(a) - tm(b) || (b.warmup ? 1 : 0) - (a.warmup ? 1 : 0) || (a.priority || 9) - (b.priority || 9));
// suggestions minus the ones already added today (same title), so a tap cannot add a duplicate
const freshSuggestions = (S, today) => { const have = new Set(S.tasks.filter(t => t.date === today).map(t => t.title)); return suggest(S, today).filter(x => !have.has(x.title)); };
const checkinDone = (S, today) => S.checkins.some(c => c.id === today);

const view = { day: null, just: '', reveal: {} };
const cmapOf = S => Object.fromEntries(S.courses.map(c => [c.id, c]));

function calm(lbl, title, cta = '') {
  return `<section class="next calm" aria-label="הבא בתור"><div class="lbl">${lbl}</div><h2>${title}</h2>${cta ? `<div class="acts">${cta}</div>` : ''}</section>`;
}
const toCheckin = label => `<a class="btn primary" href="#checkin">${label}</a>`;

// a block (or breathing, music, pre-class) is already open, maybe minimized: the hero leads back into it
const MODE_HE = { block: 'בלוק', class: 'לפני שיעור', breathe: 'נשימה', music: 'מוזיקה' };
function running(F, S, cm) {
  const t = F.taskId ? S.tasks.find(x => x.id === F.taskId) : null, c = t ? cm[t.courseId] : null;
  let lbl = MODE_HE[F.mode] || 'בלוק', row = '';
  if (timerShowing(F)) {
    const m = Math.max(1, Math.ceil(remaining(F, clock.now()) / 60000)), brk = F.timer.phase === 'break';
    lbl = F.timer.paused ? 'הבלוק בהשהיה' : brk ? 'הפסקה' : 'בלוק פעיל';
    row = `<span>${brk ? 'עד סוף ההפסקה' : 'נשארו בקטע הזה'}</span><span class="cd">${m} דק'</span>`;
  } else if (F.mode === 'block') lbl = F.state === 'recall' ? 'סוף הבלוק: שליפה' : 'הכנה לבלוק';
  const title = t ? esc(t.title) : F.mode === 'block' ? 'בלוק פתוח' : 'פתוח עכשיו: ' + MODE_HE[F.mode];
  const back = F.mode === 'block' ? 'חזרה לבלוק' : 'חזרה';
  return `<section class="next live" style="${cvar(c)}" aria-label="פעיל עכשיו"><div class="lbl"><i class="pulse" aria-hidden="true"></i>${lbl}${c ? ' · ' + esc(c.name) : ''}</div>
    <h2>${title}</h2>${row ? `<div class="row">${row}</div>` : ''}
    <div class="acts"><button class="btn primary" data-act="focus" data-mode="${esc(F.mode)}" data-id="${esc(F.taskId || '')}">${back}</button></div></section>`;
}

function nextUp(S, cm, today) {
  const all = S.tasks.filter(t => t.date === today), todo = sortDay(all.filter(t => t.status === 'todo'));
  const now = nowMin(), closed = checkinDone(S, today);
  if (!todo.length) {
    if (all.length && closed) return calm('היום נסגר', "יום של ניצחונות, והצ'ק-אין כבר בפנים. אפשר לנוח.");
    if (all.length) return calm('סיימת את מה שתוכנן להיום', "יום של ניצחונות. נשאר רק הצ'ק-אין.", toCheckin("לצ'ק-אין"));
    if (closed) return calm('אין משימות להיום', "הצ'ק-אין של היום כבר נשמר. מחר מתחילים מחדש.");
    return calm('אין משימות להיום', freshSuggestions(S, today).length ? "יום פנוי. אפשר לבחור הצעה למטה, או לתכנן בצ'ק-אין." : "יום פנוי. אפשר לנוח, או לתכנן בצ'ק-אין.", toCheckin("לתכנן בצ'ק-אין"));
  }
  // evening, nothing left that starts later: steer toward closing the day instead of pushing another block
  const later = todo.some(t => (toMin(t.start) ?? -1) > now);
  if (now >= EVENING && !later && closed) return calm('היום נסגר', "הצ'ק-אין נשמר. מה שנשאר פתוח מחכה לתכנון של מחר. לילה טוב.");
  if (now >= EVENING && !later) {
    const n = todo.length;
    return `<section class="next calm eve" aria-label="סוף היום"><div class="lbl">ערב</div><h2>${n === 1 ? 'משימה אחת עוד פתוחה' : n + ' משימות עוד פתוחות'}</h2>
      <p class="sub">אפשר להעביר למחר בצ'ק-אין, ולסגור את היום בשקט. כל מה שכבר נעשה נחשב.</p>
      <div class="acts">${toCheckin('סגירת היום')}<button class="btn" data-act="focus" data-mode="block" data-id="${esc(todo[0].id)}">בכל זאת בלוק</button></div></section>`;
  }
  const t = todo[0], c = cm[t.courseId], st = toMin(t.start);
  let cd = '', showStart = !!t.start;
  if (st != null) {
    const diff = st - now;
    if (diff > 0) cd = `<span>מתחילים בעוד</span><span class="cdw" id="countdown">${diff >= 60 ? `<span class="cd">${Math.floor(diff / 60)} ש'</span>` + (diff % 60 ? `<span class="cd">${diff % 60} דק'</span>` : '') : `<span class="cd">${diff} דק'</span>`}</span>`;
    else if (diff > -LATE) cd = '<span class="cd">עכשיו</span>';
    else { cd = `<span>תוכנן ל-<span class="num">${esc(t.start)}</span>. אפשר להתחיל עכשיו</span>`; showStart = false; }
  }
  // two actions only: start the block (primary) or settle for the minimum; "done" lives on the timeline row
  const more = todo.length - 1;
  return `<section class="next" style="${cvar(c)}" aria-label="הבא בתור"><div class="lbl"><span>${t.warmup ? 'ניצחון פתיחה' : 'הבא בתור'}${c ? ' · ' + esc(c.name) : ''}</span>${more ? `<span class="after">${more === 1 ? 'ואחריה עוד אחת' : `ואחריה עוד ${more}`}</span>` : ''}</div>
    <h2>${esc(t.title)}</h2><div class="row">${showStart ? `<span class="num">${esc(t.start)}</span>` : ''}${t.minutes ? `<span>${dur(+t.minutes)}</span>` : ''}${cd}</div>
    ${t.minVersion ? `<div class="min"><b>מינימום:</b> ${esc(t.minVersion)}</div>` : ''}
    <div class="acts"><button class="btn primary" data-act="focus" data-mode="block" data-id="${esc(t.id)}">כניסה לבלוק</button>${t.minVersion ? `<button class="btn" data-act="task" data-s="min" data-id="${esc(t.id)}" aria-label="מינימום: ${esc(t.minVersion)}">מינימום</button>` : ''}</div></section>`;
}

// the tools never repeat the hero: when the hero already opens a block, the block tool steps aside (three tools)
function tools(firstId, heroBlock) {
  const block = heroBlock ? '' : `<button class="tool" data-act="focus" data-mode="block" data-id="${esc(firstId || '')}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>כניסה לבלוק</button>`;
  return `<div class="tools${heroBlock ? ' three' : ''}" aria-label="כלים">${block}
    <button class="tool" data-act="focus" data-mode="class"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M7 9.5V15c0 1.5 2.2 3 5 3s5-1.5 5-3V9.5"/></svg>לפני שיעור</button>
    <button class="tool" data-act="focus" data-mode="breathe"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h10a3 3 0 1 0-3-3M4 15h14a3 3 0 1 1-3 3M4 12h8"/></svg>נשימה</button>
    <button class="tool" data-act="focus" data-mode="music"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>מוזיקה</button></div>`;
}

function week(S, today) {
  const w = weekStats(S.tasks, S.habitlog, today);
  return `<div class="week" aria-label="השבוע עד עכשיו"><div><b>${w.wins}</b><span>ניצחונות השבוע</span></div><div><b>${Math.floor(w.mins / 60)}:${z(w.mins % 60)}</b><span>שעות למידה</span></div><div><b>${w.active}/${w.of}</b><span>ימים פעילים</span></div></div>`;
}

function shelf(S, cm, today) {
  const log = S.habitlog.find(l => l.id === today) || {};
  const hs = S.habits.filter(h => h.active !== false).sort((a, b) => (a.order || 9) - (b.order || 9));
  const pills = hs.map(h => {
    const n = S.habitlog.filter(l => l[h.id] === true).length, on = log[h.id] === true;
    return `<button class="pill" data-act="habit" data-id="${esc(h.id)}" aria-pressed="${on}" title="${esc(h.ifThen || '')}"><span class="ck">${CHECK}</span>${esc(h.name)} <small aria-label="${n} ימים מתוך 66">${n}/66</small></button>`;
  }).join('');
  const dues = S.deadlines.filter(d => d.status === 'open' && d.due && dayDiff(d.due, today) >= 0).sort((a, b) => String(a.due).localeCompare(String(b.due))).slice(0, 4)
    .map(d => {
      const n = dayDiff(d.due, today), c = cm[d.courseId], when = DOW[parse(d.due).getDay()] + ' ' + dm(d.due);
      const big = n === 0 ? 'היום' : n === 1 ? 'מחר' : n;
      // the number speaks about time (clay when 3 days or less, ink otherwise); the course is only a dot
      return `<a class="due ${n <= 3 ? 'hot' : ''}" href="#deadlines" style="${cvar(c)}" aria-label="${esc(d.title)}, ${n === 0 ? 'היום' : n === 1 ? 'מחר' : 'בעוד ' + n + ' ימים'}, ${c ? esc(c.name) + ', ' : ''}${when}"><b class="${n > 1 ? 'n' : 'w'}">${big}${n > 1 ? '<i>ימים</i>' : ''}</b><span>${esc(d.title)}<small>${c ? `<i class="dot" aria-hidden="true"></i>${esc(c.name)} · ` : ''}${when}</small></span></a>`;
    }).join('');
  return (pills ? `<h4 class="mini">שגרה היום</h4><div class="shelf wrapw" role="group" aria-label="שגרה היום">${pills}</div>` : '')
    + (dues ? `<h4 class="mini">דדליינים קרובים</h4><div class="dues" aria-label="דדליינים קרובים">${dues}</div>` : '');
}

function slot(t, cm, opts = {}) {
  const c = cm[t.courseId];
  const cls = [t.status, opts.next ? 'is-next' : '', view.just === t.id ? 'just' : ''].join(' ');
  const btn = (s, label) => `<button class="btn ${t.status === s ? 'on' : ''}" data-act="task" data-s="${s}" data-id="${esc(t.id)}" aria-pressed="${t.status === s}">${label}</button>`;
  const acts = opts.overdue
    ? `<button class="btn" data-act="move" data-id="${esc(t.id)}">העברה להיום</button><button class="btn" data-act="task" data-s="skipped" data-id="${esc(t.id)}">דילוג</button>`
    : btn('done', 'בוצע') + (t.minVersion ? btn('min', 'מינימום') : '') + btn('skipped', 'דילוג');
  const meta = `<div class="meta">${c ? `<span class="cn">${esc(c.name)}</span>` : ''}${t.minutes ? `<span>${dur(+t.minutes)}</span>` : ''}${opts.overdue ? `<span>מיום ${DOW[parse(t.date).getDay()]} ${dm(t.date)}</span>` : ''}${t.note ? `<span>${esc(t.note)}</span>` : ''}</div>`;
  const ifthen = t.where ? `<div class="ifthen">כשהשעה <b>${esc(t.start || '')}</b> ואני ב<b>${esc(t.where)}</b>, מתחילים.</div>` : '';
  const minv = t.minVersion && t.status !== 'done' ? `<div class="minv"><b>מינימום:</b> ${esc(t.minVersion)}</div>` : '';
  const recall = !opts.overdue && WIN(t.status) && !t.noRecall
    ? `<div class="recall">${t.recall ? 'שליפה בסוף: ' + esc({ yes: 'הצלחתי', part: 'חלקית', no: 'לא הצלחתי' }[t.recall] || '') : '<span>פתרת שאלה אחת בלי חומר?</span>' + [['yes', 'הצלחתי'], ['part', 'חלקית'], ['no', 'לא']].map(([v, l]) => `<button class="btn" data-act="recall" data-v="${v}" data-id="${esc(t.id)}">${l}</button>`).join('')}</div>` : '';
  return `<div class="slot ${cls}" style="${cvar(c)}"><div class="time">${esc(t.start || '')}</div><div class="node"><i></i>${view.just === t.id ? `<span class="burst" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</span>` : ''}</div><div class="card"><div class="t-title">${t.warmup ? '<span class="tag">ניצחון פתיחה</span>' : ''}${esc(t.title)}</div>${meta}${ifthen}${minv}<div class="acts">${acts}</div>${recall}</div></div>`;
}
const nowLine = () => { const d = clock.date(); return `<div class="nowline" aria-label="עכשיו"><span id="nowtxt">${z(d.getHours())}:${z(d.getMinutes())}</span><i></i><hr></div>`; };

function suggestions(S, cm, today) {
  const list = freshSuggestions(S, today);
  if (!list.length) return '';
  return `<h3 class="sec">הצעות להיום</h3><p class="hint sub">לפי הסדר: דדליין, פער, חולשה, חזרה מרווחת.</p><div class="sugg">${list.map((x, i) => {
    const c = cm[x.courseId];
    return `<div class="sg" style="${cvar(c)}"><div><div class="t-title">${esc(x.title)}</div><div class="meta">${c ? `<span class="cn">${esc(c.name)}</span>` : ''}<span>${esc(x.why)}</span><span>${dur(x.minutes)}</span></div></div><button class="btn" data-act="addsug" data-i="${i}">הוספה להיום</button></div>`;
  }).join('')}</div>`;
}

function reviewBox(S, cm, today) {
  const due = dueItems(S.practice_items, today);
  if (!due.length) return '';
  const it = due[0], c = cm[it.courseId], open = !!view.reveal[it.id];
  return `<section class="rev" style="${cvar(c)}" aria-label="חזרה מרווחת"><div class="lbl">חזרה מרווחת · ${due.length} ${due.length === 1 ? 'שאלה' : 'שאלות'} להיום</div>
    <div class="t-title">${esc(it.prompt)}</div>${it.source ? `<div class="meta"><span>מקור: ${esc(it.source)}</span></div>` : ''}
    <div class="acts">${open ? '<span class="hint">ענית בלי להציץ?</span><button class="btn" data-act="rev" data-v="right" data-id="' + esc(it.id) + '">צדקתי</button><button class="btn" data-act="rev" data-v="wrong" data-id="' + esc(it.id) + '">טעיתי</button>' : '<button class="btn" data-act="revopen" data-id="' + esc(it.id) + '">עניתי בראש</button>'}</div></section>`;
}

export function render({ store, focus }) {
  const S = store.S, cm = cmapOf(S), today = todayStr();
  if (!view.day || view.day < today) view.day = today;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const list = byTime(S.tasks.filter(t => t.date === view.day));
  const total = list.filter(t => t.status !== 'skipped').reduce((s, t) => s + (+t.minutes || 0), 0);
  const done = list.filter(t => WIN(t.status)).length, counted = list.filter(t => t.status !== 'skipped').length;
  const overdue = view.day === today ? S.tasks.filter(t => t.date < today && t.status === 'todo').sort((a, b) => a.date.localeCompare(b.date)) : [];
  const dayBtns = days.map(d => { const has = S.tasks.some(t => t.date === d && t.status === 'todo'), w = parse(d).getDay(); return `<button class="day ${has ? 'has' : ''}" data-act="day" data-d="${d}" aria-pressed="${d === view.day}" aria-label="${d === today ? 'היום' : 'יום ' + DOW[w]} ${dm(d)}${has ? ', יש משימות' : ''}"><b>${d === today ? 'היום' : SHORT[w]}</b>${dm(d)}</button>`; }).join('');
  const firstTodo = sortDay(list.filter(t => t.status === 'todo'))[0];
  let rows = '', placed = view.day !== today; const now = nowMin();
  for (const t of list) {
    const st = toMin(t.start);
    if (!placed && st != null && st > now) { rows += nowLine(); placed = true; }
    rows += slot(t, cm, { next: view.day === today && t === firstTodo });
  }
  if (!placed && list.length) rows += nowLine();
  const L = parse(view.day), isToday = view.day === today;
  const thin = isToday && list.filter(t => t.status === 'todo').length < 2;
  view.just = '';
  const pct = counted ? done / counted : 0, C = 2 * Math.PI * 14;
  const ring = `<span class="ring-p" aria-label="${done} מתוך ${counted} משימות"><svg viewBox="0 0 34 34" aria-hidden="true"><circle class="bg" cx="17" cy="17" r="14"/><circle class="fg" cx="17" cy="17" r="14" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}"/></svg><span><b>${done}/${counted}</b> · ${dur(total)}</span></span>`;
  let top = '';
  if (isToday) {
    const live = focus && isRunning(focus.state), hero = live ? running(focus.state, S, cm) : nextUp(S, cm, today);
    top = hero + tools(firstTodo && firstTodo.id, /data-mode="block"/.test(hero));
  }
  return `<div class="todaygrid"><aside class="side-top">${top}</aside><section class="main">
    <div class="days" role="group" aria-label="בחירת יום">${dayBtns}</div>
    <div class="dayhead"><h2>יום ${DOW[L.getDay()]} ${dm(view.day)}</h2>${list.length ? ring : ''}</div>
    ${list.length ? `<div class="tl">${rows}</div>` : empty("אין משימות ליום הזה. בצ'ק-אין של הערב נתכנן אותו.")}
    ${overdue.length ? `<h3 class="sec">נשאר מימים קודמים</h3><div class="tl">${overdue.slice(-OVERDUE_MAX).reverse().map(t => slot(t, cm, { overdue: true })).join('')}</div>${overdue.length > OVERDUE_MAX ? `<p class="hint sub">ועוד ${overdue.length - OVERDUE_MAX} ישנות יותר. אפשר לסדר אותן בצ'ק-אין.</p>` : ''}` : ''}
    ${thin ? suggestions(S, cm, today) : ''}</section>
    <aside class="side-more"><h3 class="sec more-h">השבוע שלך</h3>${week(S, today)}${shelf(S, cm, today)}${isToday ? reviewBox(S, cm, today) : ''}</aside></div>`;
}

export const actions = {
  day(b, { rerender }) { view.day = b.dataset.d; rerender(); },
  async task(b, { store }) {
    const id = b.dataset.id, t = store.S.tasks.find(x => x.id === id); if (!t) return;
    const s = t.status === b.dataset.s ? 'todo' : b.dataset.s;
    b.disabled = true; view.just = WIN(s) ? id : '';
    const r = await store.write('tasks/' + id, { status: s, updatedAt: new Date(clock.now()).toISOString() });
    b.disabled = false;
    if (!r.ok) return toast('השמירה לא הצליחה. אפשר לנסות שוב');
    if (s === 'done') toast('ניצחון. סומן כבוצע'); else if (s === 'min') toast('גם מינימום נחשב. היום לא הלך לאיבוד');
  },
  async recall(b, { store }) { b.disabled = true; const r = await store.write('tasks/' + b.dataset.id, { recall: b.dataset.v, updatedAt: new Date(clock.now()).toISOString() }); if (!r.ok) { b.disabled = false; toast('השמירה לא הצליחה'); } },
  async move(b, { store }) { b.disabled = true; const r = await store.write('tasks/' + b.dataset.id, { date: todayStr(), updatedAt: stamp() }); if (!r.ok) { b.disabled = false; return toast('השמירה לא הצליחה. אפשר לנסות שוב'); } toast('הועבר להיום'); },
  async habit(b, { store }) {
    const today = todayStr(), cur = store.S.habitlog.find(l => l.id === today), id = b.dataset.id;
    const data = {}; if (cur) for (const k in cur) if (k !== 'id') data[k] = cur[k];
    data[id] = !(data[id] === true); data.date = today;
    b.disabled = true; const r = await store.write('habitlog/' + today, data, 'set'); b.disabled = false;
    if (!r.ok) toast('השמירה לא הצליחה. אפשר לנסות שוב');
  },
  async addsug(b, { store }) {
    const today = todayStr(), x = freshSuggestions(store.S, today)[+b.dataset.i]; if (!x) return;
    const mmdd = today.slice(5).replace('-', ''), taken = new Set(store.S.tasks.map(t => t.id));
    let n = 1; while (taken.has(`t${mmdd}-${n}`)) n++;
    b.disabled = true;
    const r = await store.write(`tasks/t${mmdd}-${n}`, { courseId: x.courseId || null, title: x.title, date: today, minutes: x.minutes, status: 'todo', priority: x.rank <= 2 ? 1 : 2, unitIds: x.unitIds || [], source: 'suggestion:' + x.kind, createdAt: new Date(clock.now()).toISOString() }, 'set');
    toast(r.ok ? 'נוסף להיום' : 'השמירה לא הצליחה');
  },
  revopen(b, { rerender }) { view.reveal[b.dataset.id] = true; rerender(); },
  async rev(b, { store }) {
    const it = store.S.practice_items.find(x => x.id === b.dataset.id); if (!it) return;
    b.disabled = true;
    const r = await store.write('practice_items/' + it.id, { ...review(it, b.dataset.v, todayStr()), updatedAt: new Date(clock.now()).toISOString() });
    toast(r.ok ? (b.dataset.v === 'right' ? 'יפה. השאלה תחזור בעוד כמה ימים' : 'נחזור אליה מחר') : 'השמירה לא הצליחה');
  },
};
