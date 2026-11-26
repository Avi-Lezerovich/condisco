// Deadlines: days left, estimated hours, graded flag, and a "לא מאומת" badge on anything not checked against a source.
// Groups: overdue (still open) > next 14 days > later this semester > exams > no date; "הכול" adds the closed ones.
import { esc, cvar, dm, DOW, parse, dayDiff, clock, empty, toast } from '../core/util.js';

const view = { all: false };
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

function row(d, cm) {
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
  const canSubmit = d.kind === 'hw' || d.kind === 'admin' || !d.kind;
  let acts = '';
  if (closed) acts = `<button class="btn ghost" data-act="dlo" data-id="${esc(d.id)}" aria-label="${esc('החזרה לפתוחים: ' + (d.title || ''))}">החזרה לפתוחים</button>`;
  else if (canSubmit) acts = `<button class="btn" data-act="dl" data-id="${esc(d.id)}" aria-label="${esc('סימון כהוגש: ' + (d.title || ''))}">סימון כהוגש</button>`
    + (late ? `<button class="btn ghost" data-act="dlm" data-id="${esc(d.id)}" aria-label="${esc('סימון כלא הוגש: ' + (d.title || ''))}">סימון כלא הוגש</button>` : '');
  if (!closed && unverified(d)) acts += `<button class="btn ghost" data-act="dlv" data-id="${esc(d.id)}" aria-label="${esc('אישור שהפרטים נבדקו מול המקור: ' + (d.title || ''))}">אישור</button>`;
  const cls = ['dl', hot && 'hot', late && 'late', closed && 'closed', d.kind === 'exam' && 'exam', k.word && 'word'].filter(Boolean).join(' ');
  return `<li class="${cls}" style="${cvar(c)}"><div class="left" aria-hidden="true">${esc(k.big)}${k.small ? `<small>${esc(k.small)}</small>` : ''}</div>
    <div class="body"><span class="sr">${esc(k.say)}. </span><div class="t-title">${esc(d.title || 'ללא שם')}${badge}</div><div class="meta">${meta}</div></div>
    ${acts ? `<div class="acts">${acts}</div>` : '<span></span>'}</li>`;
}

export function render({ store }) {
  const S = store.S, cm = Object.fromEntries(S.courses.map(c => [c.id, c]));
  const open = S.deadlines.filter(d => d.status === 'open' || !d.status);
  const list = view.all ? S.deadlines : open;
  const byDue = (a, b) => (hasDate(a) ? 0 : 1) - (hasDate(b) ? 0 : 1) || String(a.due).localeCompare(String(b.due));
  const tg = `<div class="toggle" role="group" aria-label="סינון"><button class="btn ${!view.all ? 'on' : ''}" data-act="dlf" data-v="0" aria-pressed="${!view.all}">פתוחים <span class="cnt">${open.length}</span></button><button class="btn ${view.all ? 'on' : ''}" data-act="dlf" data-v="1" aria-pressed="${view.all}">הכול <span class="cnt">${S.deadlines.length}</span></button></div>`;
  if (!list.length) {
    if (!view.all && S.deadlines.length) return tg + empty('כל הדדליינים הוגשו או נסגרו. אפשר לראות אותם בלשונית "הכול".', 'אין דדליינים פתוחים');
    return tg + empty('Claude מוסיף דדליינים מהסילבוס או מ-Moodle, ומסמן "לא מאומת" כל מה שלא נבדק מול המקור.', 'עוד אין דדליינים');
  }
  const isOpen = d => d.status === 'open' || !d.status;
  const n = d => daysLeft(d);
  const groups = [
    ['באיחור', d => isOpen(d) && hasDate(d) && n(d) < 0, 'late'],
    ['בשבועיים הקרובים', d => isOpen(d) && hasDate(d) && n(d) >= 0 && n(d) <= SOON],
    ['בהמשך הסמסטר', d => isOpen(d) && hasDate(d) && n(d) > SOON && d.kind !== 'exam'],
    ['מבחנים', d => isOpen(d) && hasDate(d) && n(d) > SOON && d.kind === 'exam'],
    ['בלי תאריך', d => isOpen(d) && !hasDate(d)],
    ['הוגשו ונסגרו', d => !isOpen(d), 'done'],
  ];
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
  return tg + sum + groups.map(([name, f, cls]) => {
    let g = list.filter(f); if (!g.length) return '';
    g = g.sort(byDue); if (cls === 'done') g.reverse();
    return `<h3 class="sec ${cls ? 'sec-' + cls : ''}">${name}</h3><ul class="dlist" role="list">${g.map(d => row(d, cm)).join('')}</ul>`;
  }).join('');
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
