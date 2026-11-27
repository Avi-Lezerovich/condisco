// Deadlines: days left, estimated hours, graded flag, and a "לא מאומת" badge on anything not checked against a source.
// Two views on one segmented control: a list (groups: overdue > next 14 days > later > exams > no date; "גם הסגורים" adds
// the closed ones) and a calendar of the next five weeks. From 1024px both show side by side and the control hides.
// One primary action per view: "סימון כהוגש" on the nearest open deadline.
import { esc, cvar, dm, DOW, parse, dayDiff, addDays, todayStr, clock, empty, toast } from '../core/util.js';

const view = { all: false, mode: 'list', shift: 0, day: '' };
const KIND_HE = { hw: 'שיעורי בית', exam: 'מבחן', quiz: 'בוחן', admin: 'מנהלה' };
const STATUS_HE = { submitted: 'הוגש', missed: 'לא הוגש' };
const SOON = 14;

// a due value is usable only if it starts with a real YYYY-MM-DD date
const hasDate = d => /^\d{4}-\d{2}-\d{2}/.test(String(d.due || '')) && !isNaN(parse(d.due));
const timeOf = d => { const t = String(d.due).slice(11, 16); return /^\d{2}:\d{2}$/.test(t) && t !== '00:00' ? t : ''; };
// hours until the due moment, only when the value carries a time (absolute, so offsets are respected)
const hoursLeft = d => { if (!timeOf(d)) return null; const ms = Date.parse(d.due); return isNaN(ms) ? null : (ms - clock.now()) / 36e5; };
const unverified = d => d.verified !== true;
// only https links are rendered; anything else (javascript:, http:, junk) is dropped
const safeUrl = u => { try { const x = new URL(String(u || '')); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; } };
const fmtH = h => (Math.round(h * 10) / 10).toString();
const plural = (n, one, two, many) => n === 1 ? one : n === 2 ? two : n + ' ' + many;

// days left, with "today" counted as overdue once its due time has passed
function daysLeft(d) {
  const n = dayDiff(d.due);
  if (n === 0) { const h = hoursLeft(d); if (h !== null && h < 0) return -1; }
  return n;
}

// the big number on the start side: what it says visually and what a screen reader hears
function counter(d, n, closed) {
  if (closed) return { big: d.status === 'submitted' ? '✓' : '–', small: STATUS_HE[d.status] || 'נסגר', say: STATUS_HE[d.status] || 'נסגר' };
  if (!hasDate(d)) return { big: '?', small: 'אין תאריך', say: 'אין תאריך' };
  if (n < 0) { const k = -dayDiff(d.due); return k === 0 ? { big: '!', small: 'עבר המועד', say: 'המועד עבר היום' } : { big: k, small: k === 1 ? 'יום באיחור' : 'ימים באיחור', say: plural(k, 'יום אחד', 'יומיים', 'ימים') + ' באיחור' }; }
  if (n === 0) return { big: 'היום', small: '', say: 'היום', word: true };
  if (n === 1) return { big: 'מחר', small: '', say: 'מחר', word: true };
  return { big: n, small: 'ימים', say: 'בעוד ' + plural(n, 'יום', 'יומיים', 'ימים') };
}

function row(d, cm, primary = false) {
  const c = cm[d.courseId], closed = d.status !== 'open', dated = hasDate(d), n = dated ? daysLeft(d) : null;
  const late = !closed && n !== null && n < 0, hot = !closed && n !== null && n >= 0 && n <= 3;
  const k = counter(d, n, closed), t = dated ? timeOf(d) : '';
  const h = !closed && dated && n === 0 ? hoursLeft(d) : null;
  const src = d.source ? String(d.source) : '';
  const badge = unverified(d) ? `<span class="badge" title="${esc(src ? 'מקור: ' + src : 'לא נבדק מול מקור')}">לא מאומת</span>` : '';
  const showSrc = src && (unverified(d) || /לא מאומת|משוער/.test(src));
  const meta = [
    c ? `<span class="cn">${esc(c.name)}</span>` : '',
    KIND_HE[d.kind] ? `<span>${KIND_HE[d.kind]}</span>` : '',
    dated ? `<span class="when">${DOW[parse(d.due).getDay()]} ${dm(d.due)}${t ? ', עד ' + esc(t) : ''}</span>` : '<span class="when">תאריך עוד לא ידוע</span>',
    h !== null && h > 0 ? `<span class="left-h">${h < 1 ? 'פחות משעה' : 'עוד כ-' + Math.floor(h) + " ש'"}</span>` : '',
    +d.estHours > 0 ? `<span>כ-${esc(fmtH(+d.estHours))} ש' עבודה</span>` : '',
    d.graded ? '<span>לציון</span>' : '',
    showSrc ? `<span class="src">מקור: ${esc(src)}</span>` : '',
    safeUrl(d.sourceUrl) ? `<a class="src-link" href="${esc(safeUrl(d.sourceUrl))}" target="_blank" rel="noopener noreferrer">למקור</a>` : '',
  ].join('');
  let acts = '';
  if (closed) acts = `<button class="btn quiet" data-act="dlo" data-id="${esc(d.id)}" aria-label="${esc('החזרה לפתוחים: ' + (d.title || ''))}">החזרה לפתוחים</button>`;
  else if (canSubmit(d)) acts = `<button class="btn${primary ? ' primary' : ''}" data-act="dl" data-id="${esc(d.id)}" aria-label="${esc('סימון כהוגש: ' + (d.title || ''))}">סימון כהוגש</button>`
    + (late ? `<button class="btn quiet" data-act="dlm" data-id="${esc(d.id)}" aria-label="${esc('סימון כלא הוגש: ' + (d.title || ''))}">סימון כלא הוגש</button>` : '');
  if (!closed && unverified(d)) acts += `<button class="btn quiet" data-act="dlv" data-id="${esc(d.id)}" aria-label="${esc('אישור שהפרטים נבדקו מול המקור: ' + (d.title || ''))}">אישור</button>`;
  const cls = ['dl', hot && 'hot', late && 'late', closed && 'closed', d.kind === 'exam' && 'exam', k.word && 'word', primary && 'first'].filter(Boolean).join(' ');
  return `<li class="${cls}" style="${cvar(c)}"><div class="left" aria-hidden="true"><span class="num">${esc(k.big)}</span>${k.small ? `<small>${esc(k.small)}</small>` : ''}</div>
    <div class="body"><span class="sr">${esc(k.say)}. </span><div class="t-title">${esc(d.title || 'ללא שם')}${badge}</div><div class="meta">${meta}</div></div>
    ${acts ? `<div class="acts">${acts}</div>` : ''}</li>`;
}

const canSubmit = d => d.kind === 'hw' || d.kind === 'admin' || !d.kind;
const isOpen = d => d.status === 'open' || !d.status;
const WEEKS = 5;
const DOW_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

// The calendar: WEEKS weeks from Sunday of the current week (moved by view.shift), one dot per deadline in its course colour.
// A day with deadlines is a button; the chosen day's deadlines show under the grid.
function calendar(list, cm) {
  const today = todayStr(), t0 = parse(today);
  const start = addDays(today, -t0.getDay() + view.shift * WEEKS * 7), end = addDays(start, WEEKS * 7 - 1);
  const byDay = {};
  for (const d of list) if (hasDate(d)) (byDay[String(d.due).slice(0, 10)] ||= []).push(d);
  const inRange = Object.keys(byDay).filter(k => k >= start && k <= end).sort();
  if (!view.day || view.day < start || view.day > end || !byDay[view.day]) view.day = inRange.find(k => k >= today) || inRange[0] || '';
  const cells = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const day = addDays(start, i), ds = byDay[day] || [], p = parse(day), n = dayDiff(day, today);
    const hot = ds.some(d => isOpen(d) && n <= 3), past = n < 0, first = p.getDate() === 1 || i === 0;
    const label = (first ? `${p.getDate()}.${p.getMonth() + 1}` : p.getDate());
    const cls = ['cal-d', day === today && 'today', past && 'past', hot && 'hot', ds.length && 'has', day === view.day && 'sel'].filter(Boolean).join(' ');
    const dots = ds.slice(0, 3).map(d => `<i style="${cvar(cm[d.courseId])}"${isOpen(d) ? '' : ' class="x"'}></i>`).join('') + (ds.length > 3 ? '<b>+</b>' : '');
    const say = `${DOW[p.getDay()]} ${dm(day)}${ds.length ? ', ' + (ds.length === 1 ? 'דדליין אחד' : ds.length + ' דדליינים') : ''}${day === today ? ', היום' : ''}`;
    cells.push(ds.length
      ? `<button class="${cls}" data-act="dlday" data-d="${day}" aria-pressed="${day === view.day}" aria-label="${esc(say)}"><span class="dn">${label}</span><span class="dots" aria-hidden="true">${dots}</span></button>`
      : `<span class="${cls}" aria-label="${esc(say)}"><span class="dn">${label}</span></span>`);
  }
  const undated = list.filter(d => !hasDate(d)).length;
  const sel = view.day ? (byDay[view.day] || []).sort((a, b) => String(a.due).localeCompare(String(b.due))) : [];
  const dayHead = view.day ? `${DOW[parse(view.day).getDay()]} ${dm(view.day)} · ${inDays(dayDiff(view.day, today))}` : '';
  return `<section class="dl-cal" aria-label="לוח שנה">
    <div class="cal-head"><button class="btn quiet cal-nav" data-act="dlshift" data-v="-1" aria-label="השבועות הקודמים"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <h3 class="cal-range">${dm(start)} – ${dm(end)}</h3>
      <button class="btn quiet cal-nav" data-act="dlshift" data-v="1" aria-label="השבועות הבאים"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 4l-4 4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
    <div class="cal-grid" role="group" aria-label="${esc(dm(start) + ' עד ' + dm(end))}">${DOW_SHORT.map(x => `<span class="dow" aria-hidden="true">${x}</span>`).join('')}${cells.join('')}</div>
    ${view.day ? `<div class="cal-day"><h4>${esc(dayHead)}</h4><ul class="dlist" role="list">${sel.map(d => row(d, cm)).join('')}</ul></div>`
      : `<p class="cal-none">אין דדליינים בשבועות האלה.</p>`}
    ${undated ? `<p class="cal-none">${undated === 1 ? 'אחד בלי תאריך, מופיע ברשימה' : undated + ' בלי תאריך, מופיעים ברשימה'}.</p>` : ''}
  </section>`;
}
const inDays = n => n === 0 ? 'היום' : n === 1 ? 'מחר' : n === -1 ? 'אתמול' : n < 0 ? `לפני ${-n} ימים` : `בעוד ${n} ימים`;

export function render({ store }) {
  const S = store.S, cm = Object.fromEntries(S.courses.map(c => [c.id, c]));
  const open = S.deadlines.filter(isOpen);
  const closedN = S.deadlines.length - open.length;
  const list = view.all ? S.deadlines : open;
  const byDue = (a, b) => (hasDate(a) ? 0 : 1) - (hasDate(b) ? 0 : 1) || String(a.due).localeCompare(String(b.due));
  const seg = `<div class="toggle" role="group" aria-label="תצוגה"><button class="btn ${view.mode === 'list' ? 'on' : ''}" data-act="dlmode" data-v="list" aria-pressed="${view.mode === 'list'}">רשימה</button><button class="btn ${view.mode === 'cal' ? 'on' : ''}" data-act="dlmode" data-v="cal" aria-pressed="${view.mode === 'cal'}">לוח שנה</button></div>`;
  const flt = closedN || view.all ? `<button class="btn quiet dl-flt" data-act="dlf" data-v="${view.all ? 0 : 1}" aria-pressed="${view.all}">${view.all ? 'בלי הסגורים' : 'גם הסגורים'} <span class="cnt">${closedN}</span></button>` : '';
  const bar = `<div class="dl-bar">${seg}${flt}</div>`;
  if (!list.length) {
    if (!view.all && S.deadlines.length) return bar + empty('כל הדדליינים הוגשו או נסגרו. אפשר לראות אותם בכפתור "גם הסגורים".', 'אין דדליינים פתוחים');
    return empty('Claude מוסיף דדליינים מהסילבוס או מ-Moodle, ומסמן "לא מאומת" כל מה שלא נבדק מול המקור.', 'עוד אין דדליינים');
  }
  const n = d => daysLeft(d);
  const groups = [
    ['באיחור', d => isOpen(d) && hasDate(d) && n(d) < 0, 'late'],
    ['בשבועיים הקרובים', d => isOpen(d) && hasDate(d) && n(d) >= 0 && n(d) <= SOON],
    ['בהמשך הסמסטר', d => isOpen(d) && hasDate(d) && n(d) > SOON && d.kind !== 'exam'],
    ['מבחנים', d => isOpen(d) && hasDate(d) && n(d) > SOON && d.kind === 'exam'],
    ['בלי תאריך', d => isOpen(d) && !hasDate(d)],
    ['הוגשו ונסגרו', d => !isOpen(d), 'done'],
  ];
  // the one primary action: submit the nearest open deadline that is not past its date
  const first = open.filter(d => hasDate(d) && n(d) >= 0 && canSubmit(d)).sort(byDue)[0];
  // summary of the next two weeks: how many, how much work, how many still unverified
  const soon = open.filter(d => hasDate(d) && n(d) >= 0 && n(d) <= SOON), late = open.filter(d => hasDate(d) && n(d) < 0);
  const hrs = soon.reduce((s, d) => s + (+d.estHours || 0), 0), unv = open.filter(unverified).length;
  const parts = [
    late.length ? `<b class="warn">${late.length === 1 ? 'אחד באיחור' : late.length + ' באיחור'}</b>` : '',
    soon.length ? `<b>${soon.length}</b> בשבועיים הקרובים` : 'שום דבר בשבועיים הקרובים',
    hrs ? `כ-<b>${esc(fmtH(hrs))}</b> שעות עבודה` : '',
    unv ? `<span class="unv">${unv} לא מאומתים</span>` : '',
  ].filter(Boolean);
  const sum = `<p class="dl-sum">${parts.map(x => `<span>${x}</span>`).join('<i aria-hidden="true">·</i>')}</p>`;
  const lists = groups.map(([name, f, cls]) => {
    let g = list.filter(f); if (!g.length) return '';
    g = g.sort(byDue); if (cls === 'done') g.reverse();
    return `<h3 class="sec ${cls ? 'sec-' + cls : ''}">${name}</h3><ul class="dlist" role="list">${g.map(d => row(d, cm, d === first)).join('')}</ul>`;
  }).join('');
  return `${bar}<div class="dlw mode-${view.mode}"><div class="dl-main">${sum}${lists}</div>${calendar(list, cm)}</div>`;
}
async function setStatus(b, store, status, msg) {
  const d = store.S.deadlines.find(x => x.id === b.dataset.id); if (!d) return;
  b.disabled = true;
  const r = await store.write('deadlines/' + d.id, { status, updatedAt: new Date(clock.now()).toISOString() });
  if (r && r.ok === false) { b.disabled = false; toast('השמירה לא הצליחה. אפשר לנסות שוב'); return; }
  if (msg) toast(msg);
}

export const actions = {
  dlf(b, { rerender }) { view.all = b.dataset.v === '1'; rerender(); },
  dlmode(b, { rerender }) { view.mode = b.dataset.v === 'cal' ? 'cal' : 'list'; rerender(); },
  dlshift(b, { rerender }) { view.shift = Math.max(-6, Math.min(12, view.shift + (+b.dataset.v || 0))); view.day = ''; rerender(); },
  dlday(b, { rerender }) { view.day = b.dataset.d || ''; rerender(); },
  dl(b, { store }) { return setStatus(b, store, 'submitted', 'סומן כהוגש. כל הכבוד'); },
  dlm(b, { store }) { return setStatus(b, store, 'missed', 'סומן כלא הוגש. אפשר למצוא אותו בלשונית "הכול"'); },
  async dlv(b, { store }) {
    const d = store.S.deadlines.find(x => x.id === b.dataset.id); if (!d) return;
    b.disabled = true;
    const r = await store.write('deadlines/' + d.id, { verified: true, updatedAt: new Date(clock.now()).toISOString() });
    if (r && r.ok === false) { b.disabled = false; toast('השמירה לא הצליחה. אפשר לנסות שוב'); return; }
    toast('סומן כמאומת');
  },
  dlo(b, { store }) { return setStatus(b, store, 'open', 'הוחזר לפתוחים'); },
};
