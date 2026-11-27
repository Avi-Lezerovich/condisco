// Settings (details, look, courses + aiSolve, data export, install as app, feedback) and the first-run screen.
// Every field saves on change; nothing typed is lost when the screen redraws.
import { esc, cvar, clock, toast, $, HEX, safeLS, EMPTY_ART } from '../core/util.js';
import { SCHEMA_VERSION, APP_VERSION, schemaVersion, COLS } from '../core/store.js';
import { Volume, Music, MUSIC_KINDS } from '../focus/sound.js';

const ts = () => new Date(clock.now()).toISOString();
const view = { exportText: '', rating: 0, fb: { worked: '', broke: '', wish: '' }, undo: null };
// the --course-N palette from index.html, used to keep a course's colour when its order changes
const PALETTE = ['#3a60d8', '#1f8a70', '#c0602a', '#8a4fbf', '#b8366b', '#2a8bb0', '#7a8a1f', '#7a8699'];
const colorOf = c => HEX.test(c.color || '') ? c.color : PALETTE[((+c.order || 8) - 1 + 8) % 8];

// ---- look: per device, applied before the first paint ----
const THEME_KEY = 'condisco.theme';
const THEMES = [['auto', 'לפי המכשיר'], ['light', 'בהיר'], ['dark', 'כהה']];
function applyTheme(t) { const r = document.documentElement; if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme; }
const theme = () => { const t = safeLS.get(THEME_KEY); return t === 'light' || t === 'dark' ? t : 'auto'; };
applyTheme(theme());

// Enter in the "new course" field adds it (it is not inside a form)
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.isComposing && e.target.id === 'new-course') { e.preventDefault(); $('[data-act=addcourse]')?.click(); }
});

const sorted = S => [...S.courses].sort((a, b) => (+a.order || 99) - (+b.order || 99) || String(a.name || '').localeCompare(String(b.name || ''), 'he'));

const TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>';
function courseRow(c, i, n) {
  const id = esc(c.id), name = esc(c.name || ''), ai = c.aiSolve === 'allowed' ? 'allowed' : 'forbidden';
  const chip = ai === 'allowed' ? (c.aiSolveVerified ? 'מותר לפתור' : 'מותר, לא מאומת') : (c.aiSolveVerified ? 'אסור לפתור' : 'אסור עד בדיקה');
  return `<li class="crow" style="${cvar(c)}">
    <div class="crow-top"><span class="cdot" aria-hidden="true"></span>
      <input class="f" id="cn-${id}" data-course="${id}" data-field="name" value="${name}" aria-label="שם הקורס" maxlength="60" autocomplete="off">
      <span class="ord"><button type="button" class="btn" data-act="move" data-id="${id}" data-d="-1" aria-label="להזיז למעלה: ${name}" ${i === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button><button type="button" class="btn" data-act="move" data-id="${id}" data-d="1" aria-label="להזיז למטה: ${name}" ${i === n - 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><button type="button" class="btn" data-act="rmcourse" data-id="${id}" aria-label="הסרת הקורס ${name}">${TRASH}</button></span>
    </div>
    <div class="crow-ai"><span class="ai-chip ${ai}${c.aiSolveVerified ? ' ver' : ''}">${chip}</span>
      <span class="seg" role="group" aria-label="פתרון שאלות להגשה ב${name}">${[['forbidden', 'אסור'], ['allowed', 'מותר']].map(([v, l]) => `<button type="button" class="btn ${ai === v ? 'on ' + v : ''}" data-act="ai" data-id="${id}" data-v="${v}" aria-pressed="${ai === v}">${l}</button>`).join('')}</span>
      <label class="vchk"><input type="checkbox" id="cv-${id}" data-course="${id}" data-field="aiSolveVerified" ${c.aiSolveVerified ? 'checked' : ''}> נבדק בסילבוס</label>
    </div>
  </li>`;
}

export function render({ store, env }) {
  const S = store.S, st = store.settings();
  const courses = sorted(S), th = theme(), vol = Math.round(Volume.get() * 100), mus = Music.chosen;
  return `<div class="prefs">
  <div class="ps-col">
  <form class="ps-col" id="prefs-form" novalidate>
    <section class="card-sec" aria-labelledby="ps-me"><div class="ps-h"><h3 id="ps-me">פרופיל</h3><span class="hint">נשמר אוטומטית</span></div>
      <label>שם<input class="f" id="pf-name" data-pf="name" maxlength="40" value="${esc(st.name || '')}" autocomplete="given-name"></label>
      <label>יעד ציון בכל מבחן<small>כששני מבחני התרגול האחרונים בזמן מגיעים ליעד, הקורס ברמת מבחן</small><input class="f num" id="pf-target" data-pf="target" type="number" inputmode="numeric" min="50" max="100" value="${esc(st.target || 85)}"></label>
    </section>
    <section class="card-sec" aria-labelledby="ps-rh"><h3 id="ps-rh">קצב היום</h3>
      <label>שעת קימה<small>היום נבנה מהשעה הזאת</small><input class="f" id="pf-wake" data-pf="wakeTime" type="time" value="${esc(st.wakeTime || '')}"></label>
      <p class="hint">הצ'ק-אין של הערב פתוח עד 05:00, כך שגם סיכום מאוחר נספר לאותו יום.</p>
    </section>
  </form>
  <section class="card-sec" aria-labelledby="ps-co"><h3 id="ps-co">קורסים</h3>
    <p class="hint">ללמוד, להבין ולהסביר שאלה עם Claude מותר תמיד. המתג קובע רק אם Claude רשאי לפתור שאלות שמוגשות לציון. עד שהסילבוס נבדק, ברירת המחדל היא "אסור".</p>
    ${courses.length ? `<ul class="clist">${courses.map((c, i) => courseRow(c, i, courses.length)).join('')}</ul>` : '<p class="hint">עוד אין קורסים. אפשר להוסיף כאן למטה.</p>'}
    <div class="inrow"><input class="f" id="new-course" maxlength="60" placeholder="שם קורס חדש" aria-label="שם קורס חדש" enterkeyhint="done"><button type="button" class="btn" data-act="addcourse">הוספה</button></div>
  </section>
  </div>
  <div class="ps-col">
  <section class="card-sec" aria-labelledby="ps-look"><h3 id="ps-look">מראה וצליל</h3>
    <div class="ps-f"><span class="ps-l" id="ps-th">ערכת צבעים</span><div class="seg wide" role="group" aria-labelledby="ps-th">${THEMES.map(([v, l]) => `<button type="button" class="btn ${th === v ? 'on' : ''}" data-act="theme" data-v="${v}" aria-pressed="${th === v}">${l}</button>`).join('')}</div></div>
    <label class="ps-f"><span class="ps-l">מוזיקה בבלוק</span><select class="f" id="pf-music" data-dev="music"><option value="">בלי מוזיקה</option>${MUSIC_KINDS.map(k => `<option value="${k.id}" ${mus === k.id ? 'selected' : ''}>${esc(k.he)}</option>`).join('')}</select></label>
    <label class="ps-f"><span class="ps-l">עוצמת צליל <bdi class="num" id="pf-vol-v">${vol}%</bdi></span><input class="ps-range" id="pf-vol" data-dev="volume" type="range" min="0" max="100" step="5" value="${vol}"></label>
    <p class="hint">נשמר במכשיר הזה בלבד. צליל מתחיל רק אחרי לחיצה.</p>
  </section>
  <section class="card-sec" aria-labelledby="ps-data"><h3 id="ps-data">הנתונים שלך</h3>
    <p class="hint">הנתונים נשמרים באחסון הפרטי של Condisco בחשבון Claude שלך. רק לך יש גישה אליהם.</p>
    <div class="acts"><button type="button" class="btn" data-act="export">ייצוא JSON</button>${env.install ? '<button type="button" class="btn" data-act="install">התקנה כאפליקציה במחשב</button>' : ''}</div>
    ${view.exportText ? `<label class="fld" for="export-box"><span>הנתונים בפורמט JSON</span><small>אם ההורדה לא נפתחה, אפשר להעתיק מכאן.</small><textarea id="export-box" readonly rows="6" dir="ltr">${esc(view.exportText)}</textarea></label>` : ''}
    <p class="hint ver">Condisco <bdi>${APP_VERSION}</bdi> · מבנה נתונים ${schemaVersion(S)}${schemaVersion(S) < SCHEMA_VERSION ? ` (מתעדכן ל-${SCHEMA_VERSION})` : ''}</p>
  </section>
  <form class="card-sec" id="fb-form" novalidate aria-labelledby="ps-fb"><h3 id="ps-fb">משוב על Condisco</h3>
    <p class="hint">מה עבד, מה נשבר, מה חסר. נשמר אצלך, ו-Claude יקרא אותו כשיתבקש לסכם משוב.</p>
    <div class="fld"><span id="fb-rl">כמה Condisco עוזר לי?</span><div class="energy" role="group" aria-labelledby="fb-rl">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="btn ${view.rating === n ? 'on' : ''}" data-act="rate" data-v="${n}" aria-pressed="${view.rating === n}" aria-label="${n} מתוך 5">${n}</button>`).join('')}</div><div class="ci-ends" aria-hidden="true"><span>בכלל לא</span><span>מאוד</span></div></div>
    <label>מה עבד טוב<textarea id="fb-worked" data-fb="worked" rows="2" maxlength="2000">${esc(view.fb.worked)}</textarea></label>
    <label>מה לא עבד או נשבר<textarea id="fb-broke" data-fb="broke" rows="2" maxlength="2000">${esc(view.fb.broke)}</textarea></label>
    <label>מה הייתי רוצה שיהיה<textarea id="fb-wish" data-fb="wish" rows="2" maxlength="2000">${esc(view.fb.wish)}</textarea></label>
    <button class="btn primary" type="submit">שליחת משוב</button></form>
  </div>
  ${undoBar()}</div>`;
}

// ---- undo in a toast: destructive actions happen at once and can be taken back for 7 seconds ----
let undoT = 0;
function undoBar() {
  const u = view.undo; if (!u) return '';
  return `<div class="ps-undo" role="status"><span>${esc(u.label)}</span><button type="button" class="btn" data-act="psundo">ביטול</button></div>`;
}
function offerUndo(label, restore, ctx) {
  view.undo = { label, restore };
  clearTimeout(undoT); undoT = setTimeout(() => { view.undo = null; ctx.rerender(); }, 7000);
  ctx.rerender(true);
}

export async function onFeedback(e, { store, rerender }) {
  if (e.target.id !== 'fb-form') return; e.preventDefault();
  const v = id => $('#' + id).value.trim().slice(0, 2000);
  const doc = { date: new Date(clock.now()).toISOString().slice(0, 10), skill: 'app', rating: view.rating || null, worked: v('fb-worked'), broke: v('fb-broke'), wish: v('fb-wish'), createdAt: ts() };
  if (!doc.rating && !doc.worked && !doc.broke && !doc.wish) { toast('אפשר לכתוב כמה מילים או לבחור דירוג'); return; }
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  const r = await store.add('feedback', doc); btn.disabled = false;
  if (r.ok) { view.rating = 0; view.fb = { worked: '', broke: '', wish: '' }; toast('תודה. המשוב נשמר'); document.activeElement?.blur(); rerender(true); }
  else toast('השמירה לא הצליחה. אפשר לנסות שוב');
}

// ---- details: save one field on change ----
async function saveDetail(el, store) {
  const field = el.dataset.pf, st = store.settings();
  let v = el.value;
  if (field === 'name') { v = v.trim().slice(0, 40); el.value = v; }
  if (field === 'target') {
    v = Math.round(+v);
    if (!(v >= 50 && v <= 100)) { toast('היעד צריך להיות בין 50 ל-100'); el.value = st.target || 85; return; }
  }
  if ((st[field] ?? '') === v) return;
  const has = store.S.settings.some(x => x.id === 'main');
  const r = await store.write('settings/main', { [field]: v, updatedAt: ts() }, has ? 'update' : 'set');
  toast(r.ok ? 'נשמר' : 'השמירה לא הצליחה. אפשר לנסות שוב');
}
// Enter in a details field saves too
export async function onSubmit(e, { store }) {
  if (e.target.id !== 'prefs-form') return; e.preventDefault();
  if (document.activeElement && document.activeElement.dataset.pf) document.activeElement.blur(); // blur fires change, which saves
}

export async function onChange(e, { store }) {
  const el = e.target;
  if (el.dataset.fb) { view.fb[el.dataset.fb] = el.value; return; }
  if (el.dataset.pf) return saveDetail(el, store);
  if (el.dataset.dev === 'music') { Music.choose(el.value); toast('נשמר במכשיר'); return; }
  if (el.dataset.dev === 'volume') { Volume.set(+el.value / 100); toast('נשמר במכשיר'); return; }
  const id = el.dataset.course, field = el.dataset.field; if (!id || !field) return;
  const c = store.S.courses.find(x => x.id === id); if (!c) return;
  let v = el.type === 'checkbox' ? el.checked : el.value.trim();
  if (field === 'name') {
    if (!v) { toast('לקורס צריך שם'); el.value = c.name || ''; return; }
    if (v === c.name) return;
  }
  const r = await store.write('courses/' + id, { [field]: v, updatedAt: ts() });
  if (!r.ok && el.type === 'checkbox') el.checked = !v;
  toast(r.ok ? (field === 'aiSolveVerified' && v ? 'סומן כנבדק בסילבוס' : 'נשמר') : 'השמירה לא הצליחה. אפשר לנסות שוב');
}

const slug = (name, taken) => {
  let base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 12) || 'c';
  let id = base, n = 1; while (taken.has(id)) id = base + (++n);
  return id;
};
export async function addCourses(store, names) {
  const taken = new Set(store.S.courses.map(c => c.id));
  let order = store.S.courses.reduce((m, c) => Math.max(m, +c.order || 0), 0);
  for (const name of names) {
    const id = slug(name, taken); taken.add(id); ++order;
    const r = await store.write('courses/' + id, { name, order, color: PALETTE[(order - 1) % 8], aiSolve: 'forbidden', aiSolveVerified: false, createdAt: ts() }, 'set');
    if (!r.ok) return false;
  }
  return true;
}

export const actions = {
  async rmcourse(b, ctx) {
    const { store } = ctx, c = store.S.courses.find(x => x.id === b.dataset.id); if (!c) return;
    const linked = COLS.filter(k => k !== 'courses').some(k => (store.S[k] || []).some(d => d.courseId === c.id));
    if (linked) { toast('לקורס הזה יש כבר משימות או חומרים, אז הוא נשאר. אפשר לבקש מ-Claude לסגור אותו'); return; }
    const { id, ...data } = c;
    b.disabled = true; const r = await store.remove('courses/' + id); b.disabled = false;
    if (!r.ok) { toast('ההסרה לא הצליחה. אפשר לנסות שוב'); return; }
    offerUndo('הקורס הוסר: ' + (c.name || ''), () => store.write('courses/' + id, data, 'set'), ctx);
  },
  async psundo(b, ctx) {
    const u = view.undo; if (!u) return;
    view.undo = null; clearTimeout(undoT); b.disabled = true;
    const r = await u.restore();
    toast(r && r.ok ? 'בוטל. הכול חזר' : 'הביטול לא הצליח. אפשר לנסות שוב');
    ctx.rerender(true);
  },
  rate(b) {
    const v = +b.dataset.v; view.rating = view.rating === v ? 0 : v;
    b.parentNode.querySelectorAll('button').forEach(x => { const on = +x.dataset.v === view.rating; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  },
  theme(b) {
    const v = b.dataset.v; if (v === 'auto') safeLS.del(THEME_KEY); else safeLS.set(THEME_KEY, v); applyTheme(v);
    b.parentNode.querySelectorAll('button').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  },
  async ai(b, { store }) {
    const id = b.dataset.id, v = b.dataset.v, c = store.S.courses.find(x => x.id === id);
    if (!c || (c.aiSolve || 'forbidden') === v) return;
    const r = await store.write('courses/' + id, { aiSolve: v, updatedAt: ts() });
    toast(!r.ok ? 'השמירה לא הצליחה. אפשר לנסות שוב' : v === 'allowed' ? (c.aiSolveVerified ? 'נשמר: מותר לפתור שאלות להגשה' : 'נשמר. כדאי לוודא בסילבוס ולסמן "נבדק"') : 'נשמר: אסור לפתור שאלות להגשה');
  },
  async move(b, { store }) {
    const list = sorted(store.S), i = list.findIndex(c => c.id === b.dataset.id), j = i + +b.dataset.d;
    if (i < 0 || j < 0 || j >= list.length) return;
    const colors = new Map(list.map(c => [c.id, colorOf(c)]));
    [list[i], list[j]] = [list[j], list[i]];
    b.disabled = true;
    // renumber 1..n; pin the colour so a course keeps its colour when it moves
    const writes = list.map((c, k) => [c, k + 1]).filter(([c, o]) => +c.order !== o || !HEX.test(c.color || ''));
    let ok = true;
    for (const [c, o] of writes) ok = (await store.write('courses/' + c.id, { order: o, color: colors.get(c.id), updatedAt: ts() })).ok && ok;
    if (!ok) toast('השמירה לא הצליחה. אפשר לנסות שוב');
    requestAnimationFrame(() => $(`[data-act=move][data-id="${CSS.escape(b.dataset.id)}"][data-d="${b.dataset.d}"]:not(:disabled)`)?.focus());
  },
  async addcourse(b, { store }) {
    const el = $('#new-course'), name = el.value.trim(); if (!name) { el.focus(); return; }
    if (store.S.courses.some(c => (c.name || '').trim() === name)) { toast('כבר יש קורס בשם הזה'); el.focus(); return; }
    b.disabled = true; const ok = await addCourses(store, [name]); b.disabled = false;
    if (ok) { toast('הקורס נוסף'); requestAnimationFrame(() => { const n = $('#new-course'); if (n) { n.value = ''; n.focus(); } }); } else toast('השמירה לא הצליחה. אפשר לנסות שוב');
  },
  async export(b, { store, env, rerender }) {
    const text = JSON.stringify(store.snapshot(), null, 1);
    const name = 'condisco-' + new Date(clock.now()).toISOString().slice(0, 10) + '.json';
    if (env.downloads) {
      try { await env.downloads.save({ filename: name, data: new Blob([text], { type: 'application/json' }) }); toast('הקובץ מוכן'); return; }
      catch (e) { /* declined or unavailable: show the text instead */ }
    }
    view.exportText = text; rerender(true);
    try { await navigator.clipboard.writeText(text); toast('הנתונים הועתקו ללוח'); } catch (e) { /* the textarea is there */ }
  },
  async install(b, { env }) {
    b.disabled = true;
    try { const r = await env.install.request(); if (r === 'installed') toast('הותקן. אפשר לפתוח את Condisco כאפליקציה'); }
    catch (e) { toast('ההתקנה לא הצליחה. אפשר לנסות שוב מתפריט השיתוף'); }
    b.disabled = false;
  },
};

// ---- first run: an empty db gets a short setup, then the normal app ----
export function renderFirstRun() {
  return `<div class="first">
  <form class="card-sec fr-card" id="first-form" novalidate aria-labelledby="fr-h">
    <div class="fr-head">${EMPTY_ART}<div><h2 id="fr-h">שלושה פרטים, ו-Condisco מוכן</h2><p class="hint">אפשר לשנות הכול אחר כך בהגדרות.</p></div></div>
    <label>איך לקרוא לך?<input class="f" id="fr-name" maxlength="40" required autocomplete="given-name"></label>
    <div class="row2"><label>שעת קימה<input class="f" id="fr-wake" type="time" value="07:00"></label><label>יעד ציון<input class="f num" id="fr-target" type="number" inputmode="numeric" min="50" max="100" value="85"></label></div>
    <label>הקורסים שלך הסמסטר<small>קורס בכל שורה. אפשר גם להשאיר ריק ולהוסיף אחר כך.</small><textarea id="fr-courses" rows="4" placeholder="הסתברות&#10;מבני נתונים"></textarea></label>
    <p class="hint">כל קורס מתחיל במצב "אסור לפתור שאלות להגשה" עד שזה נבדק בסילבוס. ללמוד ולהבין עם Claude מותר תמיד.</p>
    <button class="btn primary fr-go" type="submit">מתחילים</button></form></div>`;
}
export async function onFirstSubmit(e, { store }) {
  if (e.target.id !== 'first-form') return; e.preventDefault();
  const name = $('#fr-name').value.trim().slice(0, 40), wakeTime = $('#fr-wake').value || '', target = Math.round(+$('#fr-target').value) || 85;
  const names = [...new Set($('#fr-courses').value.split('\n').map(s => s.trim().slice(0, 60)).filter(Boolean))].slice(0, 12);
  if (!name) { toast('רק חסר שם'); $('#fr-name').focus(); return; }
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  const a = await store.write('settings/main', { name, wakeTime, target: Math.min(100, Math.max(50, target)), onboarded: true, createdAt: ts() }, 'set');
  const b = a.ok && await addCourses(store, names);
  const c = b && await store.write('meta/schema', { version: SCHEMA_VERSION, migratedAt: ts(), app: 'condisco', appVersion: APP_VERSION }, 'set');
  btn.disabled = false;
  toast(c && c.ok ? 'הכול מוכן. בהצלחה!' : 'השמירה לא הצליחה. אפשר לנסות שוב');
}
export { HEX };
