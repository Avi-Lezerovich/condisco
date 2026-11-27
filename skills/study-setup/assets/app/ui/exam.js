// Exam screen (#exam): per upcoming exam, the backward plan, timed mocks from real past exams, readiness, error log.
// Owned by the exam-mode thread. Pure rules live in core/exam.js.
// Condisco never shows or invents exam questions: the student opens a real past exam from the course files,
// the app only keeps time and records the result with its source.
import { esc, cvar, dm, DOW, parse, todayStr, addDays, clock, toast, empty, safeLS, $, mmss, z } from '../core/util.js';
import { examsOf, planOf, planTasks, planDiff, planSource, readinessOf, readinessLine, errorKinds, lastMinutes, counts,
  PHASES, PHASE_HE, ERR_KINDS, ERR_HE, ERR_FIX } from '../core/exam.js';

const LS_RUN = 'condisco.exam.run.v1', LS_VIEW = 'condisco.exam.view';
const MOCK_SHOW = 8, ERR_SHOW = 8;
const view = { sel: safeLS.get(LS_VIEW) || '', review: true };
let lastCtx = null;
const ts = () => new Date(clock.now()).toISOString();
const targetOf = store => +store.settings().target || 85;
const plural = (n, one, two, many) => n === 1 ? one : n === 2 ? two : n + ' ' + many;
const days = n => n === 0 ? 'היום' : n === 1 ? 'מחר' : 'בעוד ' + plural(n, 'יום', 'יומיים', 'ימים');
const dayName = s => 'יום ' + DOW[parse(s).getDay()] + ' ' + dm(s);
const failed = r => { if (r && !r.ok) toast('השמירה לא הצליחה. אפשר לנסות שוב'); return !r || !r.ok; };
const hms = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600); return h ? h + ':' + z(Math.floor(s % 3600 / 60)) + ':' + z(s % 60) : mmss(ms); };

// ---- the running mock: absolute timestamps in localStorage, so a reload or a second tab keeps the same clock ----
// { examId, courseId, source, minutes, startedAt, endedAt?, timed? }  endedAt set = waiting for the score
export function getRun() { try { const r = JSON.parse(safeLS.get(LS_RUN) || 'null'); return r && r.courseId && +r.startedAt ? r : null; } catch (e) { return null; } }
const setRun = r => { if (r) safeLS.set(LS_RUN, JSON.stringify(r)); else safeLS.del(LS_RUN); };
const leftMs = r => r.startedAt + r.minutes * 60000 - clock.now();

// ---------- render ----------
export function render(ctx) {
  lastCtx = ctx; if (getRun()) setTimeout(tick, 0);
  const { store } = ctx, S = store.S, today = todayStr(), target = targetOf(store);
  const cm = Object.fromEntries(S.courses.map(c => [c.id, c]));
  const exams = examsOf(S, today), run = getRun();
  if (!exams.length && !run) return empty("Claude מוסיף מבחנים מהסילבוס או מ-Moodle, עם תאריך ומקור. אחרי שיש תאריך, כאן נבנית התכנית לאחור עד יום המבחן.", 'עוד אין מבחנים קרובים');
  let ex = exams.find(e => e.id === view.sel) || (run && exams.find(e => e.id === run.examId)) || exams[0];
  if (!ex && run) ex = { id: run.examId, courseId: run.courseId, title: 'מבחן', date: today, days: 0, verified: true };
  const c = cm[ex.courseId] || { name: '' };
  const chips = exams.length > 1 ? `<div class="ex-pick" role="tablist" aria-label="בחירת מבחן">${exams.map(e => {
    const cc = cm[e.courseId] || {}, on = e.id === ex.id;
    return `<button role="tab" class="ex-chip${on ? ' on' : ''}" style="${cvar(cc)}" data-act="exsel" data-id="${esc(e.id)}" aria-selected="${on}"><i aria-hidden="true"></i><span>${esc(cc.name || '')}</span><small>${esc(e.title)} · ${esc(e.days === 0 ? 'היום' : e.days === 1 ? 'מחר' : e.days + ' ימים')}</small></button>`;
  }).join('')}</div>` : '';
  const r = readinessOf(S.mocks, ex.courseId, target);
  const runHere = run && run.courseId === ex.courseId;
  return `<div class="exam" style="${cvar(c)}">${chips}${hero(ex, c, r, target)}
    ${runHere ? runner(run, ex, c, target) : run ? otherRun(run, cm) : startBox(ex, c, r, S)}
    ${planBox(ex, c, S, today)}${mocksBox(ex, c, r, target)}${errorsBox(ex, c, S)}</div>`;
}

function hero(ex, c, r, target) {
  const phase = ex.days === 0 ? null : PHASES.find(p => p.key === planOf(ex, todayStr()).phase);
  const unv = ex.verified ? '' : `<span class="badge" title="${esc(ex.source ? 'מקור: ' + ex.source : 'לא נבדק מול מקור')}">לא מאומת</span>`;
  const line = readinessLine(r, target);
  const pips = [1, 0].map(i => { const m = r.last2[i]; return `<i class="${m ? (+m.score >= target ? 'up' : 'down') : ''}"></i>`; }).join('');
  const now = ex.days === 0 ? 'היום המבחן. בהצלחה. מים, שעון, ונשימה עמוקה לפני שמתחילים.' : phase ? `עכשיו: ${phase.he}. ${phase.what}` : `התכנית מתחילה ${dayName(addDays(ex.date, -21))}, שלושה שבועות לפני המבחן.`;
  return `<section class="ex-hero"><div class="ex-head"><div class="ex-name"><span class="cn">${esc(c.name)}</span><h2>${esc(ex.title)}${unv}</h2>
      <span class="when">${esc(dayName(ex.date))}${ex.time ? ', ' + esc(ex.time) : ''}</span></div>
      <div class="ex-t" aria-label="${esc(days(ex.days))}"><b>${ex.days === 0 ? 'היום' : ex.days === 1 ? 'מחר' : esc(ex.days)}</b>${ex.days > 1 ? '<small>ימים</small>' : ''}</div></div>
    <p class="ex-now">${esc(now)}</p>
    <p class="rd ${line.tone}"><span class="pips" aria-hidden="true">${pips}</span><span>${esc(line.text)}</span></p></section>`;
}

function startBox(ex, c, r, S) {
  const mins = lastMinutes(S.mocks, ex.courseId);
  const used = [...r.used].slice(0, 6);
  return `<section class="ex-box ex-start"><h3 class="sec">מבחן בזמן</h3>
    <p class="hint">פותחים מבחן קודם אמיתי מהחומרים של הקורס, כמו ביום המבחן: טלפון בצד, רק מה שמותר במבחן. Condisco מודד את הזמן ושומר את הציון עם המקור. הוא לא ממציא שאלות.</p>
    <div class="ex-form" data-course="${esc(ex.courseId)}">
      <label>איזה מבחן קודם<input class="f ex-src" maxlength="80" placeholder="למשל 2024 מועד א'" enterkeyhint="next"></label>
      <label>אורך המבחן האמיתי, בדקות<input class="f ex-min" type="number" inputmode="numeric" min="10" max="360" step="5" value="${mins || ''}" placeholder="למשל 120" enterkeyhint="go"></label>
      <button class="btn primary" data-act="exstart" data-id="${esc(ex.id)}">התחלת מבחן בזמן</button>
    </div>
    ${used.length ? `<p class="hint small">כבר נעשו: ${used.map(esc).join(', ')}. כדאי לבחור מבחן שעוד לא נפתר.</p>` : ''}
  </section>`;
}

function runner(run, ex, c, target) {
  if (run.endedAt) return scoreBox(run, target);
  const left = leftMs(run), over = left <= 0;
  return `<section class="ex-box ex-run${over ? ' over' : ''}" aria-label="מבחן בזמן">
    <p class="ex-src-l">${esc(c.name)} · ${esc(run.source)}</p>
    <div class="ex-clock" id="ex-clock" role="timer" aria-live="off">${over ? '00:00' : hms(left)}</div>
    <p class="ex-sub" id="ex-sub">${over ? 'הזמן נגמר. מניחים את העט.' : `מתוך ${run.minutes} דק'. בלי רמזים ובלי בדיקות באמצע, זה חלק מהמדידה.`}</p>
    <div class="acts"><button class="btn primary" data-act="exend" data-v="1">${over ? 'לרישום הציון' : 'סיימתי'}</button>
    ${over ? '' : '<button class="btn ghost" data-act="exend" data-v="0">הפסקתי באמצע</button>'}</div>
    ${over ? '' : '<p class="hint small">הפסקה באמצע נרשמת כמבחן בלי זמן, והוא לא נספר למוכנות.</p>'}</section>`;
}

function scoreBox(run, target) {
  const took = Math.round((run.endedAt - run.startedAt) / 60000);
  return `<section class="ex-box ex-score"><h3 class="sec">איך הלך?</h3>
    <p class="hint">${esc(run.source)} · ${took} דק'${run.timed ? ', בזמן' : ', בלי זמן'}. בודקים מול הפתרון הרשמי, או עוברים על השאלות עם Claude בצ'אט. נקודה לא בטוחה לא מעגלים למעלה.</p>
    <div class="ex-form">
      <label>ציון, 0 עד 100<input class="f ex-score-v" type="number" inputmode="decimal" min="0" max="100" step="any" enterkeyhint="done"></label>
      <button class="btn primary" data-act="exsave">שמירת הציון</button>
      <button class="btn ghost" data-act="exlater">אחרי הבדיקה</button>
      <button class="btn ghost" data-act="exdrop">ביטול המבחן</button>
    </div>
    <p class="hint small">אחרי השמירה: כל נקודה שירדה נכנסת ליומן הטעויות למטה, עם תיקון של שורה אחת. היעד: ${esc(target)}.</p></section>`;
}

function otherRun(run, cm) {
  const cc = cm[run.courseId] || {};
  return `<section class="ex-box"><p class="hint">יש מבחן פתוח בקורס ${esc(cc.name || 'אחר')}: ${esc(run.source)}.</p>
    <button class="btn" data-act="exsel" data-id="${esc(run.examId)}">חזרה אליו</button></section>`;
}

function planBox(ex, c, S, today) {
  const plan = planOf(ex, today), src = planSource(ex);
  const mine = S.tasks.filter(t => t.source === src), done = mine.filter(t => t.status && t.status !== 'todo').length;
  const rows = plan.phases.map(p => {
    const range = p.start === p.end ? dm(p.start) : dm(p.start) + '–' + dm(p.end);
    const mk = plan.mocks.filter(d => d >= p.start && d <= p.end);
    return `<li class="ph s-${p.state}${p.dropped ? ' dropped' : ''}"><span class="ph-d">T-${p.from}${p.from !== p.to ? '..' + p.to : ''}<small>${esc(range)}</small></span>
      <div><b>${esc(p.he)}</b>${p.state === 'now' ? '<span class="tag-now">עכשיו</span>' : ''}${p.dropped ? '<span class="drop">דולג, התחלנו מאוחר</span>' : ''}
      <p>${esc(p.what)}</p>${mk.length ? `<p class="mk-days">מבחן בזמן: ${mk.map(d => esc(dayName(d))).join(', ')}</p>` : ''}</div></li>`;
  }).join('') + `<li class="ph day${ex.days === 0 ? ' s-now' : ''}"><span class="ph-d">T-0<small>${esc(dm(ex.date))}</small></span><div><b>${esc(ex.title)}</b></div></li>`;
  const late = plan.late && plan.dropped.length ? `<p class="hint">פחות משלושה שבועות לפני המבחן, אז התכנית מתחילה ב${esc(PHASE_HE[plan.phase] ? '"' + PHASE_HE[plan.phase] + '"' : 'שלב הנוכחי')} ומדלגת על: ${esc(plan.dropped.join(', '))}.</p>` : '';
  const mins = lastMinutes(S.mocks, ex.courseId);
  const want = planTasks(ex, c, today, { minutes: mins, review: view.review });
  const diff = planDiff(S.tasks, want, src), changes = diff.set.length + diff.remove.length;
  const status = mine.length ? `${plural(mine.length, 'משימה אחת', 'שתי משימות', 'משימות')} בתכנית${done ? `, ${done} כבר נעשו` : ''}.` : 'התכנית עוד לא בלוח המשימות.';
  const can = ex.days >= 1;
  const btn = !can ? '' : !mins ? '<p class="hint small">כדי להוסיף את המבחנים לתכנית צריך את אורך המבחן האמיתי. אחרי מבחן בזמן אחד הוא נשמר, או שאפשר לבקש מ-Claude.</p>'
    : changes ? `<button class="btn primary" data-act="explan" data-id="${esc(ex.id)}">${mine.length ? 'עדכון התכנית' : 'הוספת התכנית למשימות'} <span class="cnt">${changes}</span></button>`
    : '<span class="ok-t">התכנית מעודכנת בלוח המשימות</span>';
  return `<section class="ex-box ex-plan"><h3 class="sec">התכנית לאחור</h3>${late}<ol class="phases">${rows}</ol>
    <div class="plan-foot"><p class="hint small">${esc(status)}</p>
    ${can ? `<label class="chk-l"><input type="checkbox" data-act="exrev" ${view.review ? 'checked' : ''}> בלוק יומי של 30 דק' על יומן הטעויות</label>` : ''}${btn}</div></section>`;
}

function mocksBox(ex, c, r, target) {
  const rows = r.list.slice(0, MOCK_SHOW).map(m => {
    const style = m.mode === 'style', cnt = counts(m);
    const tags = [m.date ? dm(m.date) : '', +m.minutes ? m.minutes + " דק'" : '', style ? 'תרגיל בסגנון, לא מבחן אמיתי' : m.timed === false ? 'בלי זמן, לא נספר' : 'בזמן'].filter(Boolean);
    return `<li class="mk2${+m.score >= target && cnt ? ' ok' : ''}${cnt ? '' : ' nc'}"><b>${esc(+m.score)}</b><div><span>${esc(m.source || m.title || 'מבחן תרגול')}</span><small>${tags.map(esc).join(' · ')}</small></div></li>`;
  }).join('');
  const more = r.list.length > MOCK_SHOW ? `<p class="hint small">ועוד ${r.list.length - MOCK_SHOW} מוקדמים יותר, במפת הפערים.</p>` : '';
  const today = todayStr();
  return `<section class="ex-box"><h3 class="sec">מבחנים שנעשו</h3>
    ${r.list.length ? `<ul class="mk2-list" role="list">${rows}</ul>${more}` : '<p class="hint">עוד אין. מבחן הפתיחה מראה מאיפה מתחילים, וכל טעות בו היא מידע.</p>'}
    <details class="ex-rec"><summary>רישום מבחן שכבר נעשה</summary><div class="ex-form rec" data-course="${esc(ex.courseId)}">
      <label>איזה מבחן<input class="f rec-src" maxlength="80" placeholder="למשל 2023 מועד ב'"></label>
      <label>ציון<input class="f rec-score" type="number" inputmode="decimal" min="0" max="100" step="any"></label>
      <label>תאריך<input class="f rec-date" type="date" value="${today}" max="${today}"></label>
      <label>דקות<input class="f rec-min" type="number" inputmode="numeric" min="0" max="360" step="5"></label>
      <label class="chk-l"><input type="checkbox" class="rec-timed" checked> בזמן אמת, כמו במבחן</label>
      <label class="chk-l"><input type="checkbox" class="rec-style"> תרגיל בסגנון, לא מבחן אמיתי (לא נספר)</label>
      <button class="btn primary" data-act="exrec">רישום</button></div></details></section>`;
}

function errorsBox(ex, c, S) {
  const { open, kinds } = errorKinds(S.errors, ex.courseId);
  const top = kinds[0];
  const chips = kinds.length ? `<p class="ek">${kinds.map(k => `<span class="ek-c${k === top ? ' top' : ''}">${esc(ERR_HE[k.kind])} <b>${k.count}</b></span>`).join('')}</p>
    <p class="hint">הכי נפוץ: ${esc(ERR_HE[top.kind])}. מה עוזר: ${esc(ERR_FIX[top.kind])}.</p>` : '';
  const mk = Object.fromEntries(S.mocks.map(m => [m.id, m]));
  const rows = open.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, ERR_SHOW).map(e => `<li class="err"><div><b>${esc(e.what || 'טעות')}</b><div class="meta">
      <span>${esc(ERR_HE[e.kind] || ERR_HE.unknown)}</span>${e.fix ? `<span>תיקון: ${esc(e.fix)}</span>` : ''}${e.mockId && mk[e.mockId] ? `<span>${esc(mk[e.mockId].source || mk[e.mockId].title || '')}</span>` : ''}</div></div>
      <button class="btn" data-act="exerrdone" data-id="${esc(e.id)}" aria-label="${esc('סימון כמטופל: ' + (e.what || ''))}">טופל</button></li>`).join('');
  const more = open.length > ERR_SHOW ? `<p class="hint small">ועוד ${open.length - ERR_SHOW}. אפשר לעבור עליהן עם Claude בצ'אט.</p>` : '';
  const mocks = S.mocks.filter(m => m.courseId === ex.courseId).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 6);
  return `<section class="ex-box ex-err"><h3 class="sec">יומן טעויות</h3>${chips}
    ${open.length ? `<ul class="errs" role="list">${rows}</ul>${more}` : '<p class="hint">אין טעויות פתוחות. אחרי כל מבחן, כל נקודה שירדה נרשמת כאן, וממנה נוצר כרטיס חזרה.</p>'}
    <details class="ex-rec"${open.length ? '' : ' open'}><summary>הוספת טעות</summary><div class="ex-form err-f" data-course="${esc(ex.courseId)}">
      <label class="wide">מה קרה<input class="f err-what" maxlength="140" placeholder="למשל: בשאלה 3 שכחתי את מקרה הבסיס"></label>
      <label>סוג<select class="f err-kind">${ERR_KINDS.map(k => `<option value="${k}">${esc(ERR_HE[k])}</option>`).join('')}</select></label>
      ${mocks.length ? `<label>מאיזה מבחן<select class="f err-mock"><option value="">בלי</option>${mocks.map((m, i) => `<option value="${esc(m.id)}"${i === 0 ? ' selected' : ''}>${esc((m.source || m.title || 'מבחן') + ' · ' + (+m.score))}</option>`).join('')}</select></label>` : ''}
      <label class="wide">תיקון בשורה אחת<input class="f err-fix" maxlength="140" placeholder="למשל: לבדוק מקרה בסיס לפני שממשיכים"></label>
      <button class="btn primary" data-act="exerr">הוספה ליומן</button></div></details></section>`;
}

// ---------- actions ----------
function sel(id, ctx) { view.sel = id; safeLS.set(LS_VIEW, id); ctx.rerender(true); }
const val = (f, s) => { const el = f && f.querySelector(s); return el ? String(el.value || '').trim() : ''; };

export const actions = {
  exsel(b, ctx) { sel(b.dataset.id, ctx); },
  exrev(b, ctx) { view.review = !!b.checked; ctx.rerender(true); },
  exstart(b, ctx) {
    const f = b.closest('.ex-form'), source = val(f, '.ex-src').slice(0, 80), minutes = Math.round(+val(f, '.ex-min'));
    if (!source) { toast('צריך לכתוב איזה מבחן קודם, למשל 2024 מועד א\''); f.querySelector('.ex-src').focus(); return; }
    if (!(minutes >= 10 && minutes <= 360)) { toast('אורך המבחן צריך להיות בין 10 ל-360 דקות'); f.querySelector('.ex-min').focus(); return; }
    const ex = examsOf(ctx.store.S, todayStr()).find(e => e.id === b.dataset.id); if (!ex) return;
    setRun({ examId: ex.id, courseId: ex.courseId, source, minutes, startedAt: clock.now() });
    if (document.activeElement) document.activeElement.blur();
    try { import('../focus/sound.js').then(m => m.ensureAudio && m.ensureAudio()).catch(() => {}); } catch (e) { /* no sound is fine */ }
    toast('בהצלחה. נתראה בסוף הזמן');
    ctx.rerender(true); tick();
    requestAnimationFrame(() => { const r = $('.ex-run'); if (r) r.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  },
  exend(b, ctx) {
    const r = getRun(); if (!r) return;
    const finished = b.dataset.v === '1', over = leftMs(r) <= 0;
    r.endedAt = over ? r.startedAt + r.minutes * 60000 : clock.now();
    r.timed = finished || over; setRun(r); ctx.rerender(true);
    setTimeout(() => { const i = $('.ex-score-v'); if (i) i.focus(); }, 50);
  },
  async exsave(b, ctx) {
    const r = getRun(); if (!r || !r.endedAt) return;
    const raw = val(b.closest('.ex-form'), '.ex-score-v'), score = Math.round(+raw * 10) / 10;
    if (raw === '' || !Number.isFinite(score) || score < 0 || score > 100) { toast('הציון צריך להיות מספר בין 0 ל-100'); return; }
    b.disabled = true;
    const date = todayStr(), took = Math.round((r.endedAt - r.startedAt) / 60000);
    const doc = { courseId: r.courseId, title: r.source, source: r.source, score, timed: !!r.timed, date, minutes: r.minutes, tookMin: took, mode: 'past', createdAt: ts() };
    const res = await ctx.store.add('mocks', doc);
    if (failed(res)) { b.disabled = false; return; }
    setRun(null);
    const target = targetOf(ctx.store), rd = readinessOf(ctx.store.S.mocks.some(m => m.id === res.id) ? ctx.store.S.mocks : ctx.store.S.mocks.concat([{ ...doc, id: res.id }]), r.courseId, target);
    toast(!doc.timed ? 'נרשם. מבחן בלי זמן לא נספר למוכנות, אבל הטעויות ממנו שוות זהב'
      : rd.ready ? `שני מבחנים רצופים מעל ${target}. זה הסימן שהגעת!` : score >= target ? `מעל ${target}. עוד אחד כזה ברצף, וזה שם` : 'נרשם. עכשיו כל נקודה שירדה נכנסת ליומן הטעויות');
    ctx.rerender(true);
    setTimeout(() => { const d = $('.ex-err details'); if (d) { d.open = true; const i = d.querySelector('.err-what'); if (i) i.focus({ preventScroll: false }); } }, 80);
  },
  exlater(b, ctx) { toast('הציון יחכה כאן עד אחרי הבדיקה'); },
  exdrop(b, ctx) { setRun(null); toast('המבחן בוטל ולא נשמר'); ctx.rerender(true); },
  async exrec(b, ctx) {
    const f = b.closest('.ex-form'), source = val(f, '.rec-src').slice(0, 80), raw = val(f, '.rec-score');
    const score = Math.round(+raw * 10) / 10, date = val(f, '.rec-date') || todayStr(), minutes = Math.round(+val(f, '.rec-min')) || 0;
    const style = f.querySelector('.rec-style').checked, timed = !style && f.querySelector('.rec-timed').checked;
    if (!source) { toast('צריך לכתוב איזה מבחן, כדי שיהיה מקור'); f.querySelector('.rec-src').focus(); return; }
    if (raw === '' || !Number.isFinite(score) || score < 0 || score > 100) { toast('הציון צריך להיות מספר בין 0 ל-100'); f.querySelector('.rec-score').focus(); return; }
    if (date > todayStr()) { toast('התאריך עוד לא הגיע. אפשר לבחור את היום או תאריך שעבר'); return; }
    b.disabled = true;
    const doc = { courseId: f.dataset.course, title: source, source, score, timed, date, mode: style ? 'style' : 'past', createdAt: ts() };
    if (minutes > 0) doc.minutes = minutes;
    if (failed(await ctx.store.add('mocks', doc))) { b.disabled = false; return; }
    toast(style ? 'נרשם כתרגיל בסגנון. הוא לא נספר למוכנות' : timed ? 'נרשם' : 'נרשם. מבחן בלי זמן לא נספר למוכנות');
    ctx.rerender(true);
  },
  async explan(b, ctx) {
    const S = ctx.store.S, today = todayStr(), ex = examsOf(S, today).find(e => e.id === b.dataset.id); if (!ex) return;
    const c = S.courses.find(x => x.id === ex.courseId) || {};
    const want = planTasks(ex, c, today, { minutes: lastMinutes(S.mocks, ex.courseId), review: view.review });
    const { set, remove } = planDiff(S.tasks, want, planSource(ex));
    b.disabled = true; let bad = 0;
    for (const t of set) { const { id, ...data } = t; const cur = S.tasks.find(x => x.id === id); const r = await ctx.store.write('tasks/' + id, cur ? { ...data, updatedAt: ts() } : { ...data, createdAt: ts() }, cur ? 'update' : 'set'); if (!r.ok) bad++; }
    for (const id of remove) { const r = await ctx.store.remove('tasks/' + id); if (!r.ok) bad++; }
    if (bad) toast('חלק מהמשימות לא נשמרו. אפשר לנסות שוב');
    else toast(`התכנית בלוח המשימות: ${plural(want.length, 'משימה אחת', 'שתי משימות', 'משימות')}, עד ${dm(addDays(ex.date, -1))}`);
    ctx.rerender(true);
  },
  async exerr(b, ctx) {
    const f = b.closest('.ex-form'), what = val(f, '.err-what').slice(0, 140), kind = val(f, '.err-kind') || 'unknown';
    const fix = val(f, '.err-fix').slice(0, 140) || ERR_FIX[kind], mockId = val(f, '.err-mock'), courseId = f.dataset.course;
    if (!what) { toast('צריך לכתוב מה קרה, במשפט אחד'); f.querySelector('.err-what').focus(); return; }
    b.disabled = true;
    const m = ctx.store.S.mocks.find(x => x.id === mockId);
    const e = { courseId, what, kind, fix, resolved: false, createdAt: ts() };
    if (mockId) e.mockId = mockId;
    const r = await ctx.store.add('errors', e);
    if (failed(r)) { b.disabled = false; return; }
    // every logged error becomes a spaced-review card: box 1, due tomorrow, source = the mock
    const today = todayStr();
    const p = await ctx.store.add('practice_items', { courseId, prompt: what + (fix ? ' · תיקון: ' + fix : ''), source: m ? (m.source || m.title || 'מבחן תרגול') : 'יומן טעויות', box: 1, due: addDays(today, 1), lastResult: null, errorId: r.id, createdAt: ts(), updatedAt: ts() });
    toast(p.ok ? 'נוסף ליומן, וכרטיס חזרה מחכה למחר' : 'נוסף ליומן. כרטיס החזרה לא נשמר');
    ['.err-what', '.err-fix'].forEach(s => { const i = f.querySelector(s); if (i) i.value = ''; });
    ctx.rerender(true);
    setTimeout(() => { const i = $('.err-what'); if (i) i.focus({ preventScroll: true }); }, 60);
  },
  async exerrdone(b, ctx) {
    const e = ctx.store.S.errors.find(x => x.id === b.dataset.id); if (!e) return;
    b.disabled = true;
    if (failed(await ctx.store.write('errors/' + e.id, { resolved: true, updatedAt: ts() }))) { b.disabled = false; return; }
    toast('סומן כמטופל'); ctx.rerender(true);
  },
};

// ---------- the mock clock: one tick a second while the exam screen shows a running mock ----------
let tickT = 0, rang = '';
function tick() {
  clearTimeout(tickT);
  const r = getRun();
  if (!r || r.endedAt) return;
  const left = leftMs(r), el = $('#ex-clock');
  if (left <= 0 && rang !== String(r.startedAt)) {
    rang = String(r.startedAt);
    import('../focus/sound.js').then(m => m.Chime && m.Chime.play('focus-end')).catch(() => {});
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* not supported */ }
    if (el && el.closest('.ex-run') && !el.closest('.ex-run').classList.contains('over') && lastCtx) lastCtx.rerender(true);
  }
  if (el) el.textContent = left > 0 ? hms(left) : '00:00';
  tickT = setTimeout(tick, left > 0 ? 1000 - (clock.now() % 1000) + 5 : 5000);
}
if (typeof window !== 'undefined') {
  addEventListener('storage', e => { if (e.key === LS_RUN && lastCtx) { lastCtx.rerender(true); tick(); } });
  document.addEventListener('keydown', e => {
    if (!e.target || !e.target.closest || e.key !== 'Enter' || !e.target.closest('.exam .ex-form') || e.target.tagName !== 'INPUT' || e.target.type === 'checkbox') return;
    e.preventDefault(); const b = e.target.closest('.ex-form').querySelector('.btn.primary'); if (b) b.click();
  });
  addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}
