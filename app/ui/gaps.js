// Gap map: per course, the unit ladder, what to study next, the last two timed mocks against the target, open errors.
// Pure helpers (exported for tests) at the top; rendering in the middle; actions at the bottom.
import { esc, cvar, dm, todayStr, dayDiff, clock, toast, $, empty, safeLS } from '../core/util.js';
import { LADDER, LADDER_HE, LADDER_MIX, norm, progress, mockStats } from '../core/model.js';

const KIND_HE = { lecture: 'הרצאות', recitation: 'תרגולים', exercise: 'תרגילים', summary: 'חומר נוסף', other: 'אחר' };
const KIND_ONE = { lecture: 'הרצאה', recitation: 'תרגול', exercise: 'תרגיל', summary: 'סיכום', other: 'יחידה' };
const ORDER = ['lecture', 'recitation', 'exercise', 'summary', 'other'];
const ERR_HE = { concept: 'מושג', careless: 'רשלנות', time: 'זמן', reading: 'קריאת השאלה', unknown: 'לא ברור' };
const LS = 'condisco.gaps';
const ERR_SHOW = 5, MOCK_SHOW = 8;

// ---------- pure helpers ----------
export const kindOf = u => (ORDER.includes(u.kind) ? u.kind : 'other');
const byPlace = (a, b) => ORDER.indexOf(kindOf(a)) - ORDER.indexOf(kindOf(b)) || (+a.num || 0) - (+b.num || 0);
export const unitLabel = u => [KIND_ONE[kindOf(u)], u.num ?? ''].join(' ').trim();
// the title only when it adds something ("תרגול 1" titled "תרגול 1" shows once)
export const unitTitle = u => { const t = String(u.title || '').trim(); return t && t !== unitLabel(u) ? t : ''; };

// What to study next in a course: a missed unit not started yet, else the unit lowest on the ladder (in course order).
export function nextUnit(units) {
  const open = units.filter(u => norm(u.status) !== 'exam');
  if (!open.length) return null;
  const missed = open.filter(u => u.missed && norm(u.status) === 'not_started').sort(byPlace);
  if (missed.length) return missed[0];
  return [...open].sort((a, b) => LADDER.indexOf(norm(a.status)) - LADDER.indexOf(norm(b.status)) || byPlace(a, b))[0];
}

// Readiness from the last two timed mocks. Both must be at or above the target; an average can hide one low score.
export function readiness(mocks, courseId, target) {
  const m = mockStats(mocks, courseId, target);
  const last2 = m.list.filter(x => x.timed !== false).slice(0, 2).map(x => +x.score);
  const above = last2.filter(s => s >= target).length;
  let state = 'none';
  if (m.ready) state = 'ready';
  else if (last2.length && last2[0] >= target) state = 'one'; // newest is above: one more and you're there
  else if (last2.length) state = 'below';
  return { ...m, last2, above, state };
}

// The exam date: the course's own, else the nearest open exam deadline for it.
export function examOf(course, deadlines, today) {
  if (course.examDate) return String(course.examDate).slice(0, 10);
  const ex = deadlines.filter(d => d.courseId === course.id && d.kind === 'exam' && d.status === 'open' && d.due && String(d.due).slice(0, 10) >= today)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)))[0];
  return ex ? String(ex.due).slice(0, 10) : null;
}

export function countHe(n, one, many) { return n === 1 ? one : `${n} ${many}`; }
export function inDays(n) { return n === 0 ? 'היום' : n === 1 ? 'מחר' : n === 2 ? 'מחרתיים' : `בעוד ${n} ימים`; }

// ---------- view state (per viewer, survives reloads) ----------
const view = Object.assign({ open: '', filter: 'all', pick: '', undo: null, sums: new Set() }, (() => { try { const v = JSON.parse(safeLS.get(LS) || '{}'); return { open: v.open || '', filter: v.filter === 'gaps' ? 'gaps' : 'all' }; } catch (e) { return {}; } })());
const keep = () => safeLS.set(LS, JSON.stringify({ open: view.open, filter: view.filter }));

// ---------- render ----------
export function render({ store }) {
  const S = store.S;
  if (!S.courses.length) return empty("אפשר להוסיף קורס בהגדרות, או לבקש מ-Claude בצ'אט למלא את הקורסים.", 'עוד אין קורסים');
  const target = targetOf(store);
  const today = todayStr();
  if (view.open && !S.courses.some(c => c.id === view.open)) view.open = '';
  const goal = `<div class="goal"><b>${esc(target)}</b><span>זה היעד בכל מבחן. הסימן הכי אמין שהגעת: שני מבחני תרגול אחרונים, בזמן אמת, שניהם מעל היעד.</span></div>`;
  const legend = `<div class="legend" aria-hidden="true">${LADDER.map(s => `<span><i class="sw" style="${s === 'not_started' ? '' : `--mix:${LADDER_MIX[s]}%`}" data-s="${s}"></i>${LADDER_HE[s]}</span>`).join('')}</div>`;
  const courses = [...S.courses].sort((a, b) => (+a.order || 99) - (+b.order || 99) || String(a.name).localeCompare(String(b.name), 'he'));
  return `<div class="gaps">${goal}${legend}<div class="cgrid">${courses.map(c => course(S, c, target, today)).join('')}</div>${undoBar()}</div>`;
}

const targetOf = store => { const t = +store.settings().target; return t > 0 && t <= 100 ? t : 85; };

function course(S, c, target, today) {
  const us = S.units.filter(u => u.courseId === c.id);
  const open = view.open === c.id;
  const cnt = s => us.filter(u => norm(u.status) === s).length;
  const missed = us.filter(u => u.missed && norm(u.status) === 'not_started').length;
  const r = readiness(S.mocks, c.id, target);
  const errs = S.errors.filter(e => e.courseId === c.id && !e.resolved)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const exam = examOf(c, S.deadlines || [], today);
  const nx = nextUnit(us);
  const hid = 'gc-' + esc(c.id);

  // the bar fills from the start edge with the strongest stage first
  const ladder = us.length ? [...LADDER].reverse().filter(s => s !== 'not_started').map(s => { const n = cnt(s); return n ? `<span style="width:${100 * n / us.length}%;--mix:${LADDER_MIX[s]}%"></span>` : ''; }).join('') : '';

  const pips = `<span class="pips" aria-hidden="true">${[0, 1].map(i => `<i class="${r.last2[i] == null ? '' : r.last2[i] >= target ? 'up' : 'down'}"></i>`).join('')}</span>`;
  const ready = r.state === 'ready' ? `<span class="rd ok">${pips}ברמת מבחן: ${r.last2.join(' ו-')}</span>`
    : r.state === 'one' ? `<span class="rd ok">${pips}${r.last2.length === 1 ? `מבחן תרגול אחד: ${r.last2[0]}` : `האחרון ${r.last2[0]}`}, עוד אחד מעל ${esc(target)}</span>`
    : r.state === 'below' ? `<span class="rd warn">${pips}${r.last2.length === 2 ? `שני האחרונים: ${r.last2.join(', ')}` : `מבחן תרגול אחד: ${r.last2[0]}`}, היעד ${esc(target)}</span>`
    : `<span class="rd">${pips}עוד אין מבחן תרגול בזמן</span>`;

  const facts = [
    exam ? `<span class="${dayDiff(exam, today) <= 14 ? 'warn' : ''}">מבחן ${inDays(dayDiff(exam, today))} (${dm(exam)})</span>` : '',
    us.length ? `<span>ברמת מבחן: ${cnt('exam')}/${us.length}</span>` : '<span>עוד אין יחידות</span>',
    missed ? `<span class="warn">${`פספסתי: ${missed}`}</span>` : '',
    errs.length ? `<span>טעויות פתוחות: ${errs.length}</span>` : '',
    Number.isFinite(+c.confidence) && c.confidence !== '' && c.confidence != null ? `<span>ביטחון ${esc(c.confidence)}/10</span>` : '',
  ].join('');
  const next = nx ? `<span class="nx">הבא: <b>${esc(unitLabel(nx))}</b>${unitTitle(nx) ? ` ${esc(unitTitle(nx))}` : ''}<em>${nx.missed && norm(nx.status) === 'not_started' ? 'פספסתי' : esc(LADDER_HE[norm(nx.status)])}</em></span>`
    : us.length ? '<span class="nx done">כל היחידות ברמת מבחן. עכשיו מבחנים קודמים בזמן אמת.</span>' : '';

  const head = `<button class="c-head" data-act="open" data-id="${esc(c.id)}" aria-expanded="${open}" aria-controls="${hid}">
    <span class="c-name"><i></i>${esc(c.name)}</span>
    <span class="pct" aria-label="התקדמות ${progress(us)} אחוז">${progress(us)}%<small>התקדמות</small></span>
    <span class="ladder" aria-hidden="true">${ladder}</span>
    ${ready}<span class="c-sub">${facts}</span>${next}
    <svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  if (!open) return `<section class="course" style="${cvar(c)}">${head}</section>`;
  return `<section class="course open" style="${cvar(c)}">${head}<div class="c-body" id="${hid}">${mocksBox(c, r, target)}${errBox(errs)}${unitsBox(c, us)}</div></section>`;
}

function mocksBox(c, r, target) {
  const today = todayStr();
  const list = r.list.slice(0, MOCK_SHOW).map(x => `<span class="mk ${+x.score >= target ? 'ok' : ''}${x.timed === false ? ' untimed' : ''}"><b>${esc(+x.score)}</b><span class="mk-t">${esc(x.title || 'מבחן תרגול')}${x.date ? ` · ${esc(dm(x.date))}` : ''}${x.timed === false ? ' · בלי זמן' : ''}</span><button class="x" data-act="mockdel" data-id="${esc(x.id)}" aria-label="מחיקת ${esc(x.title || 'מבחן תרגול')} (${esc(+x.score)})">×</button></span>`).join('');
  const more = r.list.length > MOCK_SHOW ? `<span class="more">ועוד ${r.list.length - MOCK_SHOW} מוקדמים יותר</span>` : '';
  return `<div class="box"><h4 class="kind">מבחני תרגול <span>יעד ${esc(target)}, נספרים רק מבחנים בזמן אמת</span></h4>
    ${r.list.length ? `<div class="mk-list">${list}${more}</div>` : '<p class="hint">פתרת מבחן קודם בזמן אמת? כאן רושמים את הציון. שני מבחנים אחרונים מעל היעד הם הסימן שהגעת.</p>'}
    <div class="mk-form" data-course="${esc(c.id)}">
      <input class="f mk-title" maxlength="80" placeholder="איזה מבחן (למשל 2024 מועד א')" aria-label="שם המבחן" enterkeyhint="next">
      <input class="f mk-score" type="number" inputmode="decimal" min="0" max="100" step="any" placeholder="ציון" aria-label="ציון, 0 עד 100" enterkeyhint="done">
      <input class="f mk-date" type="date" value="${today}" max="${today}" aria-label="תאריך">
      <label class="mk-tm"><input type="checkbox" class="mk-timed" checked> בזמן אמת</label>
      <button class="btn primary" data-act="mock" data-id="${esc(c.id)}">רישום</button>
    </div></div>`;
}

function errBox(errs) {
  if (!errs.length) return '';
  const rows = errs.slice(0, ERR_SHOW).map(e => `<div class="err"><div><b>${esc(e.what || 'טעות')}</b><div class="meta">${e.kind ? `<span>${esc(ERR_HE[e.kind] || e.kind)}</span>` : ''}${e.fix ? `<span>תיקון: ${esc(e.fix)}</span>` : ''}</div></div><button class="btn" data-act="errdone" data-id="${esc(e.id)}">טופל</button></div>`).join('');
  const more = errs.length > ERR_SHOW ? `<p class="hint">ועוד ${errs.length - ERR_SHOW}. אפשר לעבור עליהן עם Claude בצ'אט.</p>` : '';
  return `<div class="box"><h4 class="kind">יומן טעויות <span>${countHe(errs.length, 'אחת פתוחה', 'פתוחות')}</span></h4>${rows}${more}</div>`;
}

function unitsBox(c, us) {
  if (!us.length) return `<div class="box"><p class="hint">עוד אין יחידות בקורס. אפשר לבקש מ-Claude בצ'אט לבנות את רשימת ההרצאות והתרגולים מתוך תיקיית הקורס.</p></div>`;
  const gaps = view.filter === 'gaps';
  const shown = gaps ? us.filter(u => norm(u.status) !== 'exam') : us;
  const filter = `<div class="u-filter" role="group" aria-label="סינון יחידות">
    <button class="seg${gaps ? '' : ' on'}" data-act="filter" data-v="all" aria-pressed="${!gaps}">הכול (${us.length})</button>
    <button class="seg${gaps ? ' on' : ''}" data-act="filter" data-v="gaps" aria-pressed="${gaps}">מה שעוד חסר (${us.length - us.filter(u => norm(u.status) === 'exam').length})</button></div>`;
  const groups = ORDER.map(k => {
    const all = us.filter(u => kindOf(u) === k);
    const ks = shown.filter(u => kindOf(u) === k).sort(byPlace);
    if (!ks.length) return '';
    const done = all.filter(u => norm(u.status) === 'exam').length;
    return `<div class="kgroup"><h4 class="kind">${KIND_HE[k]} <span>${done}/${all.length} ברמת מבחן</span></h4>${ks.map(unit).join('')}</div>`;
  }).join('');
  const body = groups || '<p class="hint u-none">כל היחידות ברמת מבחן. מה שנשאר: מבחנים קודמים בזמן אמת.</p>';
  return `<div class="box units">${filter}<div class="ugrid">${body}</div></div>`;
}

function unit(u) {
  const s = norm(u.status), picking = view.pick === u.id, t = unitTitle(u);
  const cv = Math.max(0, Math.min(5, Math.round(+u.confidence || 0)));
  const conf = Array.from({ length: 5 }, (_, i) => `<button class="${cv > i ? 'f' : ''}" data-act="conf" data-id="${esc(u.id)}" data-v="${i + 1}" aria-label="ביטחון ${i + 1} מתוך 5" aria-pressed="${cv === i + 1}"><i></i></button>`).join('');
  const link = /^[\w-]{10,}$/.test(u.fileId || '') ? `<a class="flink" href="https://drive.google.com/file/d/${esc(u.fileId)}/view" target="_blank" rel="noopener">לקובץ</a>` : '';
  const sumText = typeof u.summary === 'string' ? u.summary.trim().slice(0, 600) : '';
  const sumOpen = !!sumText && view.sums.has(u.id);
  const sum = sumText ? `<button class="u-sumbtn" data-act="sum" data-id="${esc(u.id)}" aria-expanded="${sumOpen}" aria-controls="us-${esc(u.id)}">תקציר<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>` : '';
  const sumBody = sumOpen ? `<p class="u-sum" id="us-${esc(u.id)}">${esc(sumText)}</p>` : '';
  const picker = picking ? `<div class="picker" role="radiogroup" aria-label="שלב עבור ${esc(unitLabel(u))}">${LADDER.map((x, i) => `<button role="radio" aria-checked="${x === s}" class="${x === s ? 'on' : ''}${i === LADDER.indexOf(s) + 1 ? ' nextup' : ''}" data-act="setstep" data-id="${esc(u.id)}" data-v="${x}" data-s="${x}">${LADDER_HE[x]}</button>`).join('')}</div>` : '';
  return `<div class="unit${picking ? ' picking' : ''}${u.missed && s === 'not_started' ? ' missed' : ''}">
    <div class="u-name">${esc(unitLabel(u))}${t ? `<small>${esc(t)}</small>` : ''}${u.missed && s !== 'exam' ? `<span class="miss">${s === 'not_started' ? 'פספסתי' : 'פספסתי, בהשלמה'}</span>` : ''}${link}${sum}</div>
    <div class="u-ctl"><button class="st" data-s="${s}" data-act="pick" data-id="${esc(u.id)}" aria-expanded="${picking}" aria-label="שלב: ${LADDER_HE[s]}. הקשה לשינוי">${LADDER_HE[s]}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
    <div class="conf" role="group" aria-label="ביטחון ${cv} מתוך 5"><span class="cl" aria-hidden="true">ביטחון</span>${conf}</div></div>${sumBody}${picker}</div>`;
}

function undoBar() {
  const u = view.undo;
  if (!u || clock.now() - u.at > 7000) return '';
  return `<div class="g-undo" role="status"><span>${esc(u.label)}</span><button class="btn" data-act="undo">ביטול</button></div>`;
}

// ---------- actions ----------
const ts = () => new Date(clock.now()).toISOString();
let undoT = 0;
function offerUndo(label, restore, ctx) {
  view.undo = { label, restore, at: clock.now() };
  clearTimeout(undoT); undoT = setTimeout(() => { view.undo = null; ctx.rerender(); }, 7000);
}
// after a redraw, put keyboard focus back on the same control
function refocus(sel) { setTimeout(() => { if (document.activeElement && document.activeElement !== document.body) return; const el = $(sel); if (el) el.focus({ preventScroll: true }); }, 60); }
const failed = r => { if (r && !r.ok) toast('השמירה לא הצליחה. אפשר לנסות שוב'); return !r || !r.ok; };

export const actions = {
  open(b, ctx) {
    const id = b.dataset.id; view.open = view.open === id ? '' : id; view.pick = ''; keep(); ctx.rerender();
    refocus(`.c-head[data-id="${CSS.escape(id)}"]`);
    if (view.open) requestAnimationFrame(() => { const h = $(`.c-head[data-id="${CSS.escape(id)}"]`); if (h && h.getBoundingClientRect().top < 0) h.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  },
  filter(b, ctx) { view.filter = b.dataset.v === 'gaps' ? 'gaps' : 'all'; keep(); ctx.rerender(); refocus(`[data-act=filter][data-v=${view.filter}]`); },
  sum(b, ctx) { const id = b.dataset.id; if (view.sums.has(id)) view.sums.delete(id); else view.sums.add(id); ctx.rerender(); refocus(`.u-sumbtn[data-id="${CSS.escape(id)}"]`); },
  pick(b, ctx) { view.pick = view.pick === b.dataset.id ? '' : b.dataset.id; ctx.rerender(); refocus(view.pick ? `.picker [data-id="${CSS.escape(b.dataset.id)}"].on` : `.st[data-id="${CSS.escape(b.dataset.id)}"]`); },
  async setstep(b, ctx) {
    const u = ctx.store.S.units.find(x => x.id === b.dataset.id); if (!u) return;
    const prev = u.status ?? 'not_started', v = b.dataset.v;
    view.pick = '';
    if (norm(prev) === v) { ctx.rerender(); return; }
    b.disabled = true;
    const r = await ctx.store.write('units/' + u.id, { status: v, updatedAt: ts() });
    if (failed(r)) { ctx.rerender(); return; }
    offerUndo(`${unitLabel(u)}: ${LADDER_HE[v]}`, () => ctx.store.write('units/' + u.id, { status: prev, updatedAt: ts() }), ctx);
    ctx.rerender(); refocus(`.st[data-id="${CSS.escape(u.id)}"]`);
  },
  async conf(b, ctx) {
    const v = +b.dataset.v, u = ctx.store.S.units.find(x => x.id === b.dataset.id); if (!u) return;
    const r = await ctx.store.write('units/' + u.id, { confidence: Math.round(+u.confidence || 0) === v ? v - 1 : v, updatedAt: ts() });
    if (!failed(r)) refocus(`.conf [data-id="${CSS.escape(u.id)}"][data-v="${v}"]`);
  },
  async mock(b, ctx) {
    const f = b.closest('.mk-form'); if (!f) return;
    const id = f.dataset.course, title = (f.querySelector('.mk-title').value || '').trim().slice(0, 80);
    const raw = (f.querySelector('.mk-score').value || '').trim(), score = Math.round(+raw * 10) / 10;
    const date = f.querySelector('.mk-date').value || todayStr(), timed = f.querySelector('.mk-timed').checked;
    if (raw === '' || !Number.isFinite(score) || score < 0 || score > 100) { toast('הציון צריך להיות מספר בין 0 ל-100'); f.querySelector('.mk-score').focus(); return; }
    if (date > todayStr()) { toast('התאריך עוד לא הגיע. אפשר לבחור את היום או תאריך שעבר'); return; }
    b.disabled = true;
    const r = await ctx.store.add('mocks', { courseId: id, title, score, timed, date, createdAt: ts() });
    if (failed(r)) { b.disabled = false; return; }
    if (document.activeElement && f.contains(document.activeElement)) document.activeElement.blur();
    const target = targetOf(ctx.store), rd = readiness(ctx.store.S.mocks.concat(ctx.store.S.mocks.some(m => m.id === r.id) ? [] : [{ id: r.id, courseId: id, score, timed, date, createdAt: ts() }]), id, target);
    toast(!timed ? 'נרשם. מבחן בלי זמן לא נספר למוכנות, אבל הטעויות ממנו שוות זהב'
      : rd.state === 'ready' ? `שני מבחנים רצופים מעל ${target}. זה הסימן שהגעת`
      : score >= target ? `מעל ${target}! עוד אחד כזה, והגעת` : 'נרשם. עכשיו בונים את מה שחסר');
    ctx.rerender(true);
  },
  async mockdel(b, ctx) {
    const m = ctx.store.S.mocks.find(x => x.id === b.dataset.id); if (!m) return;
    b.disabled = true;
    const { id, ...data } = m;
    const r = await ctx.store.remove('mocks/' + id);
    if (failed(r)) { b.disabled = false; return; }
    offerUndo(`נמחק: ${m.title || 'מבחן תרגול'} (${m.score})`, () => ctx.store.write('mocks/' + id, data, 'set'), ctx);
    ctx.rerender();
  },
  async errdone(b, ctx) {
    const e = ctx.store.S.errors.find(x => x.id === b.dataset.id); if (!e) return;
    b.disabled = true;
    const r = await ctx.store.write('errors/' + e.id, { resolved: true, updatedAt: ts() });
    if (failed(r)) { b.disabled = false; return; }
    offerUndo('הטעות סומנה כמטופלת', () => ctx.store.write('errors/' + e.id, { resolved: false, updatedAt: ts() }), ctx);
    ctx.rerender();
  },
  async undo(b, ctx) {
    const u = view.undo; if (!u) return;
    view.undo = null; clearTimeout(undoT); b.disabled = true;
    failed(await u.restore()); ctx.rerender();
  },
};

// Enter in the mock form submits it; Escape closes an open step picker. Only inside the Gaps view.
if (typeof document !== 'undefined') document.addEventListener('keydown', e => {
  if (!e.target || !e.target.closest) return;
  if (e.key === 'Enter' && e.target.matches('.mk-form input:not([type=checkbox])')) { e.preventDefault(); const b = e.target.closest('.mk-form').querySelector('[data-act=mock]'); if (b) b.click(); }
  if (e.key === 'Escape' && view.pick && e.target.closest('.gaps')) { const st = $(`.st[data-id="${CSS.escape(view.pick)}"]`); if (st) st.click(); }
});
