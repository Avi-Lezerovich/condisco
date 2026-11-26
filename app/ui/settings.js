// Settings (details, look, courses + aiSolve, data export, install as app, feedback) and the first-run screen.
// Every field saves on change; nothing typed is lost when the screen redraws.
import { esc, cvar, clock, toast, $, HEX, safeLS } from '../core/util.js';
import { SCHEMA_VERSION, APP_VERSION, schemaVersion } from '../core/store.js';

const ts = () => new Date(clock.now()).toISOString();
const view = { exportText: '', rating: 0, fb: { worked: '', broke: '', wish: '' } };
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

function courseRow(c, i, n) {
  const id = esc(c.id), ai = c.aiSolve === 'allowed' ? 'allowed' : 'forbidden';
  return `<li class="crow" style="${cvar(c)}">
    <div class="crow-top"><span class="cdot" aria-hidden="true"></span>
      <input class="f" id="cn-${id}" data-course="${id}" data-field="name" value="${esc(c.name || '')}" aria-label="שם הקורס" maxlength="60" autocomplete="off">
      <span class="ord"><button type="button" class="btn" data-act="move" data-id="${id}" data-d="-1" aria-label="להזיז למעלה: ${esc(c.name || '')}" ${i === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button><button type="button" class="btn" data-act="move" data-id="${id}" data-d="1" aria-label="להזיז למטה: ${esc(c.name || '')}" ${i === n - 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></span>
    </div>
    <div class="crow-ai"><span class="lbl" id="al-${id}">פתרון שאלות להגשה</span>
      <span class="seg" role="group" aria-labelledby="al-${id}">${[['forbidden', 'אסור'], ['allowed', 'מותר']].map(([v, l]) => `<button type="button" class="btn ${ai === v ? 'on ' + v : ''}" data-act="ai" data-id="${id}" data-v="${v}" aria-pressed="${ai === v}">${l}</button>`).join('')}</span>
      <label class="vchk"><input type="checkbox" id="cv-${id}" data-course="${id}" data-field="aiSolveVerified" ${c.aiSolveVerified ? 'checked' : ''}> נבדק בסילבוס</label>
      ${c.aiSolveVerified ? '' : '<span class="badge">לא מאומת</span>'}
    </div>
  </li>`;
}

export function render({ store, env }) {
  const S = store.S, st = store.settings();
  const courses = sorted(S), th = theme();
  return `<div class="narrow stack-lg prefs">
  <form class="card-sec" id="prefs-form" novalidate><div class="ps-h"><h3>פרטים</h3><span class="hint">נשמר אוטומטית</span></div>
    <div class="row2"><label>שם<input class="f" id="pf-name" data-pf="name" maxlength="40" value="${esc(st.name || '')}" autocomplete="given-name"></label>
    <label>שעת קימה<input class="f" id="pf-wake" data-pf="wakeTime" type="time" value="${esc(st.wakeTime || '')}"></label></div>
    <label>יעד ציון בכל מבחן<small>כששני מבחני התרגול האחרונים בזמן מגיעים ליעד, הקורס ברמת מבחן</small><input class="f num" id="pf-target" data-pf="target" type="number" inputmode="numeric" min="50" max="100" value="${esc(st.target || 85)}"></label>
  </form>

  <section class="card-sec"><h3>מראה</h3>
    <div class="seg wide" role="group" aria-label="ערכת צבעים">${THEMES.map(([v, l]) => `<button type="button" class="btn ${th === v ? 'on' : ''}" data-act="theme" data-v="${v}" aria-pressed="${th === v}">${l}</button>`).join('')}</div>
    <p class="hint">נשמר במכשיר הזה בלבד.</p>
  </section>

  <section class="card-sec"><h3>קורסים</h3>
    <p class="hint">ללמוד, להבין ולהסביר שאלה עם Claude מותר תמיד. המתג קובע רק דבר אחד: האם Claude רשאי לפתור שאלות שמוגשות לציון. כל עוד הסילבוס לא נבדק, ברירת המחדל היא "אסור".</p>
    ${courses.length ? `<ul class="clist">${courses.map((c, i) => courseRow(c, i, courses.length)).join('')}</ul>` : '<p class="hint">עוד אין קורסים. אפשר להוסיף כאן למטה.</p>'}
    <div class="inrow"><input class="f" id="new-course" maxlength="60" placeholder="שם קורס חדש" aria-label="שם קורס חדש" enterkeyhint="done"><button type="button" class="btn" data-act="addcourse">הוספה</button></div>
  </section>

  <section class="card-sec"><h3>הנתונים שלך</h3>
    <p class="hint">הנתונים נשמרים באחסון הפרטי של Condisco בחשבון Claude שלך. רק לך יש גישה אליהם.</p>
    <div class="acts"><button type="button" class="btn" data-act="export">ייצוא JSON</button>${env.install ? '<button type="button" class="btn" data-act="install">התקנה כאפליקציה במחשב</button>' : ''}</div>
    ${view.exportText ? `<label class="fld" for="export-box"><span>הנתונים בפורמט JSON</span><small>אם ההורדה לא נפתחה, אפשר להעתיק מכאן.</small><textarea id="export-box" readonly rows="6" dir="ltr">${esc(view.exportText)}</textarea></label>` : ''}
    <p class="hint ver">Condisco ${APP_VERSION} · מבנה נתונים ${schemaVersion(S)}${schemaVersion(S) < SCHEMA_VERSION ? ` (מתעדכן ל-${SCHEMA_VERSION})` : ''}</p>
  </section>

  <form class="card-sec" id="fb-form" novalidate><h3>משוב על Condisco</h3>
    <p class="hint">מה עבד, מה נשבר, מה חסר. נשמר אצלך, ו-Claude יקרא אותו כשיתבקש לסכם משוב.</p>
    <div class="fld"><span id="fb-rl">כמה Condisco עוזר לי?</span><div class="energy" role="group" aria-labelledby="fb-rl">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="btn ${view.rating === n ? 'on' : ''}" data-act="rate" data-v="${n}" aria-pressed="${view.rating === n}" aria-label="${n} מתוך 5">${n}</button>`).join('')}</div><div class="ci-ends" aria-hidden="true"><span>בכלל לא</span><span>מאוד</span></div></div>
    <label>מה עבד טוב<textarea id="fb-worked" data-fb="worked" rows="2" maxlength="2000">${esc(view.fb.worked)}</textarea></label>
    <label>מה לא עבד או נשבר<textarea id="fb-broke" data-fb="broke" rows="2" maxlength="2000">${esc(view.fb.broke)}</textarea></label>
    <label>מה הייתי רוצה שיהיה<textarea id="fb-wish" data-fb="wish" rows="2" maxlength="2000">${esc(view.fb.wish)}</textarea></label>
    <button class="btn primary" type="submit">שליחת משוב</button></form></div>`;
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
  return `<div class="narrow first"><p class="lead">שלושה פרטים ו-Condisco מוכן. אפשר לשנות הכול אחר כך בהגדרות.</p>
  <form class="card-sec" id="first-form" novalidate>
    <label>איך לקרוא לך?<input class="f" id="fr-name" maxlength="40" required autocomplete="given-name"></label>
    <div class="row2"><label>שעת קימה<input class="f" id="fr-wake" type="time" value="07:00"></label><label>יעד ציון<input class="f num" id="fr-target" type="number" inputmode="numeric" min="50" max="100" value="85"></label></div>
    <label>הקורסים שלך הסמסטר<small>קורס בכל שורה</small><textarea id="fr-courses" rows="5" placeholder="הסתברות&#10;מבני נתונים"></textarea></label>
    <p class="hint">כל קורס מתחיל במצב "אסור לפתור שאלות להגשה" עד שזה נבדק בסילבוס. ללמוד ולהבין עם Claude מותר תמיד.</p>
    <button class="btn primary" type="submit">יאללה, מתחילים</button></form></div>`;
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
