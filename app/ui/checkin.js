// Evening check-in. Data contract (read by the scheduled evening task and the skills):
// checkins/{YYYY-MM-DD}: date, did, wentWell, blocked, energy (1-5 | null), sleep (hours | null), tomorrow, firstWhen ("HH:MM"), firstWhere, + updatedAt.
// Late night counts as the evening before: until 05:00 the check-in is for yesterday's date.
import { esc, DOW, parse, dm, todayStr, addDays, clock, toast, $, z, cvar, CHECK, safeLS } from '../core/util.js';
import { WIN } from '../core/model.js';

export const KEYS = ['did', 'wentWell', 'blocked', 'tomorrow', 'firstWhen', 'firstWhere', 'sleep'];
const NIGHT_END = 5; // hour
const LS = 'condisco.ci.draft';
// base = the stored doc the draft started from; while the draft still equals it, newer stored values replace it
const view = { draft: null, energy: 0, day: '', restored: false, base: null, baseEnergy: 0 };
export const reset = () => { view.draft = null; view.energy = 0; view.day = ''; view.restored = false; view.base = null; view.baseEnergy = 0; };

export const ciDay = () => clock.date().getHours() < NIGHT_END ? addDays(todayStr(), -1) : todayStr();
const dayLabel = id => 'יום ' + DOW[parse(id).getDay()] + ' ' + dm(id);
const hhmm = iso => { const d = new Date(iso); return isNaN(d) ? '' : z(d.getHours()) + ':' + z(d.getMinutes()); };
const SLEEP_MAX = 16;

// ---- device draft: typed text survives tab switches, reloads and a closed laptop ----
function readLS() { try { return JSON.parse(safeLS.get(LS) || 'null'); } catch (e) { return null; } }
function writeLS() { safeLS.set(LS, JSON.stringify({ day: view.day, draft: view.draft, energy: view.energy })); }
const fromDoc = cur => Object.fromEntries(KEYS.map(k => [k, cur[k] == null ? '' : String(cur[k])]));
const same = (a, b, ea, eb) => KEYS.every(k => (a[k] || '').trim() === (b[k] || '').trim()) && (+ea || 0) === (+eb || 0);

function load(day, cur) {
  view.day = day; view.base = fromDoc(cur); view.baseEnergy = +cur.energy || 0;
  const ls = readLS();
  if (ls && ls.day === day && ls.draft && !same(ls.draft, fromDoc(cur), ls.energy, cur.energy)) {
    view.draft = { ...fromDoc(cur), ...ls.draft }; view.energy = +ls.energy || 0; view.restored = true;
  } else {
    view.draft = fromDoc(cur); view.energy = +cur.energy || 0; view.restored = false;
    if (ls && ls.day !== day) safeLS.del(LS);
  }
}

const STATUS = [['done', 'בוצע'], ['min', 'מינימום'], ['skipped', 'דילוג']];
function tasksCard(S, day) {
  const td = S.tasks.filter(t => t.date === day).sort((a, b) => (a.start || '99').localeCompare(b.start || '99'));
  if (!td.length) return '';
  const wins = td.filter(t => WIN(t.status)).length;
  const course = id => S.courses.find(c => c.id === id);
  const line = wins === 0 ? 'עוד לא סומן ניצחון. גם מינימום נחשב.' : wins === td.length ? 'כל המשימות סומנו כניצחון. יפה מאוד.' : `${wins === 1 ? 'ניצחון אחד' : wins + ' ניצחונות'} מתוך ${td.length} משימות. כל צעד נחשב.`;
  return `<section class="q ci-tasks" aria-labelledby="ci-tasks-h"><div class="ci-h"><h3 id="ci-tasks-h">המשימות של ${day === todayStr() ? 'היום' : 'אתמול'}</h3><span class="ci-count num" aria-hidden="true">${wins}/${td.length}</span></div>
  <p class="hint">${line} אפשר לסמן כאן מה קרה בפועל.</p>
  <ul class="ci-tl">${td.map(t => {
    const c = course(t.courseId);
    return `<li class="${WIN(t.status) ? 'win' : t.status === 'skipped' ? 'skip' : ''}" ${c ? `style="${cvar(c)}"` : ''}><span class="ci-tt">${c ? '<i class="cdot" aria-hidden="true"></i>' : ''}<span>${t.warmup ? '<small>חימום · </small>' : ''}${esc(t.title || 'משימה')}</span></span>
    <span class="ci-st" role="group" aria-label="מה קרה עם ${esc(t.title || 'המשימה')}">${STATUS.map(([s, l]) => `<button type="button" class="btn ${t.status === s ? 'on' : ''}" data-act="cistatus" data-s="${s}" data-id="${esc(t.id)}" aria-pressed="${t.status === s}">${s === 'done' && t.status === s ? CHECK : ''}${l}</button>`).join('')}</span></li>`;
  }).join('')}</ul></section>`;
}

const histItem = h => {
  const e = +h.energy || 0, sl = h.sleep != null && h.sleep !== '' ? h.sleep : null;
  const rows = [['מה עשיתי', h.did], ['הלך טוב', h.wentWell], ['מה תקע', h.blocked], ['התוכנית', h.tomorrow]].filter(r => r[1]);
  const first = h.firstWhen || h.firstWhere ? `<div><span>התחלה</span>${esc([h.firstWhen, h.firstWhere].filter(Boolean).join(', '))}</div>` : '';
  return `<details><summary><b>${esc(dayLabel(h.id))}</b><span class="ci-meta">${e ? `<span class="dots" role="img" aria-label="אנרגיה ${e} מתוך 5">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= e ? 'on' : ''}"></i>`).join('')}</span>` : ''}${sl != null ? `<span>${esc(sl)} ש' שינה</span>` : ''}</span>
  <span class="ci-peek">${esc(h.did || h.tomorrow || '')}</span></summary>
  <div class="ci-hbody">${rows.map(r => `<div><span>${r[0]}</span>${esc(r[1])}</div>`).join('')}${first}</div></details>`;
};

export function render({ store }) {
  const S = store.S, day = ciDay(), cur = S.checkins.find(c => c.id === day) || {};
  const untouched = view.draft && !view.restored && same(view.draft, view.base, view.energy, view.baseEnergy);
  if (!view.draft || view.day !== day || (untouched && !same(view.base, fromDoc(cur), view.baseEnergy, cur.energy))) load(day, cur);
  const d = view.draft, saved = !!(cur.date || cur.did || cur.tomorrow);
  const dirty = saved && !same(d, fromDoc(cur), view.energy, cur.energy);
  const state = view.restored ? 'שוחזרה טיוטה שעוד לא נשמרה' : !saved ? 'הטיוטה נשמרת במכשיר תוך כדי כתיבה' : dirty ? 'יש שינויים שעוד לא נשמרו' : (cur.updatedAt ? 'נשמר ב-' + hhmm(cur.updatedAt) : 'נשמר');
  const doneTitles = S.tasks.filter(t => t.date === day && WIN(t.status)).map(t => t.title).filter(Boolean);
  const hist = S.checkins.filter(c => c.id !== day && /^\d{4}-\d{2}-\d{2}$/.test(c.id)).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 7);
  const ta = (k, label, hint, ph) => `<label class="fld" for="ci-${k}"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}<textarea id="ci-${k}" rows="2" maxlength="2000"${ph ? ` placeholder="${ph}"` : ''}>${esc(d[k])}</textarea></label>`;
  const sleepV = d.sleep;
  return `<div class="ci-wrap">
  <header class="ci-top"><div><h2 class="ci-day">${esc(dayLabel(day))}</h2><p class="hint">כמה דקות של סיכום, ומחר מתחיל ברור יותר.</p></div>
  <span class="ci-badge ${saved && !dirty && !view.restored ? 'ok' : ''}" id="ci-state" role="status">${saved && !dirty && !view.restored ? CHECK : ''}${esc(state)}</span></header>
  ${tasksCard(S, day)}
  <form class="ci" id="ci" novalidate>
  <section class="q" aria-labelledby="ci-g1"><h3 id="ci-g1">היום</h3>
    ${ta('did', 'מה עשיתי היום?', '', 'משפט אחד מספיק')}
    ${doneTitles.length && !d.did.trim() ? `<button type="button" class="btn ci-fill" data-act="cifill">הוספת המשימות שבוצעו</button>` : ''}
    ${ta('wentWell', 'מה הלך טוב?', 'גם דבר קטן נחשב')}
    ${ta('blocked', 'מה תקע אותי?', 'בלי שיפוטיות, רק כדי לתכנן טוב יותר')}
  </section>
  <section class="q" aria-labelledby="ci-g2"><h3 id="ci-g2">גוף וראש</h3>
    <div class="fld"><span id="ci-en-l">אנרגיה היום</span><div class="energy" role="group" aria-labelledby="ci-en-l">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="btn ${view.energy === n ? 'on' : ''}" data-act="energy" data-v="${n}" aria-pressed="${view.energy === n}" aria-label="אנרגיה ${n} מתוך 5">${n}</button>`).join('')}</div><div class="ci-ends" aria-hidden="true"><span>אין כוח</span><span>הרבה כוח</span></div></div>
    <div class="fld"><label for="ci-sleep"><span>כמה שעות ישנתי בלילה שעבר?</span></label><div class="stepper"><button type="button" class="btn" data-act="sleep" data-d="-0.5" aria-label="חצי שעה פחות">−</button><input class="f num" id="ci-sleep" type="number" inputmode="decimal" min="0" max="${SLEEP_MAX}" step="0.5" placeholder="7" value="${esc(sleepV)}"><button type="button" class="btn" data-act="sleep" data-d="0.5" aria-label="חצי שעה יותר">+</button></div></div>
  </section>
  <section class="q" aria-labelledby="ci-g3"><h3 id="ci-g3">מחר</h3>
    ${ta('tomorrow', 'מה התוכנית למחר?', 'Claude יבנה ממנה את היום, עם ניצחון פתיחה קטן בהתחלה')}
    <div class="fld"><span>המשימה הראשונה מחר</span><small>כשהשעה... ואני ב... מתחילים. ככה קל יותר להתחיל.</small><div class="row2"><label>מתי<input class="f" id="ci-firstWhen" type="time" value="${esc(d.firstWhen)}"></label><label>איפה<input class="f" id="ci-firstWhere" maxlength="60" placeholder="בית, ספרייה" value="${esc(d.firstWhere)}"></label></div></div>
  </section>
  <div class="ci-save"><button class="btn primary" type="submit">${saved ? "עדכון הצ'ק-אין" : "שמירת הצ'ק-אין"}</button></div>
  </form>
  ${hist.length ? '<h3 class="sec">ימים קודמים</h3><div class="hist">' + hist.map(histItem).join('') + '</div>' : ''}
  </div>`;
}

function grow(el) { if (!el || el.tagName !== 'TEXTAREA' || CSS.supports('field-sizing', 'content')) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight + 2, 400) + 'px'; }
function setState(text, ok = false) { const s = $('#ci-state'); if (s) { s.classList.toggle('ok', ok); s.innerHTML = (ok ? CHECK : '') + esc(text); } }
function saveDraft() {
  const g = k => { const el = $('#ci-' + k); return el ? el.value : (view.draft || {})[k] || ''; };
  view.draft = Object.fromEntries(KEYS.map(k => [k, g(k)])); view.restored = false; writeLS();
}
export function onInput(e) { if (!e.target.closest('#ci')) return; saveDraft(); grow(e.target); setState('הטיוטה נשמרה במכשיר'); }

export async function onSubmit(e, { store, rerender }) {
  if (e.target.id !== 'ci') return; e.preventDefault(); saveDraft();
  const d = view.draft, day = view.day || ciDay();
  const text = ['did', 'wentWell', 'blocked', 'tomorrow', 'firstWhere'].some(k => d[k].trim());
  if (!text && !view.energy && !d.sleep && !d.firstWhen) { toast('עוד לא נכתב כלום. אפשר להתחיל ממשפט אחד'); $('#ci-did')?.focus(); return; }
  let sl = d.sleep === '' ? null : parseFloat(String(d.sleep).replace(',', '.'));
  if (sl != null && !(Number.isFinite(sl) && sl >= 0 && sl <= SLEEP_MAX)) { toast(`שעות שינה: מספר בין 0 ל-${SLEEP_MAX}`); $('#ci-sleep')?.focus(); return; }
  if (sl != null) sl = Math.round(sl * 2) / 2;
  const cur = store.S.checkins.find(c => c.id === day);
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.setAttribute('aria-busy', 'true');
  const doc = { date: day, did: d.did.trim(), wentWell: d.wentWell.trim(), blocked: d.blocked.trim(), energy: view.energy || null, sleep: sl, tomorrow: d.tomorrow.trim(), firstWhen: d.firstWhen, firstWhere: d.firstWhere.trim(), updatedAt: new Date(clock.now()).toISOString() };
  // update keeps any extra fields the evening task or a skill added to the same day
  const r = await store.write('checkins/' + day, doc, cur ? 'update' : 'set');
  btn.disabled = false; btn.removeAttribute('aria-busy');
  if (r.ok) {
    safeLS.del(LS); view.restored = false;
    view.draft = { ...fromDoc(doc), sleep: sl == null ? '' : String(sl) }; view.base = { ...view.draft }; view.baseEnergy = view.energy;
    toast("הצ'ק-אין נשמר. Claude ישתמש בו כדי לבנות את מחר"); document.activeElement?.blur(); rerender(true);
  }
  else toast('השמירה לא הצליחה. הטיוטה שמורה במכשיר, אפשר לנסות שוב');
}

export const actions = {
  energy(b) {
    const v = +b.dataset.v; view.energy = view.energy === v ? 0 : v; saveDraft();
    b.parentNode.querySelectorAll('button').forEach(x => { const on = +x.dataset.v === view.energy; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    setState('הטיוטה נשמרה במכשיר');
  },
  sleep(b) {
    const el = $('#ci-sleep'); const v = parseFloat(String(el.value).replace(',', '.'));
    const n = Math.min(SLEEP_MAX, Math.max(0, (Number.isFinite(v) ? v : 7 - +b.dataset.d) + +b.dataset.d));
    el.value = String(n); saveDraft(); setState('הטיוטה נשמרה במכשיר');
  },
  cifill(b, { store }) {
    const day = view.day || ciDay();
    const titles = store.S.tasks.filter(t => t.date === day && WIN(t.status)).map(t => t.title).filter(Boolean);
    const el = $('#ci-did'); if (!el || !titles.length) return;
    el.value = (el.value.trim() ? el.value.trim() + '\n' : '') + titles.join('\n');
    saveDraft(); grow(el); b.remove(); el.focus();
  },
  async cistatus(b, { store }) {
    const id = b.dataset.id, t = store.S.tasks.find(x => x.id === id); if (!t) return;
    saveDraft();
    const s = t.status === b.dataset.s ? 'todo' : b.dataset.s;
    b.disabled = true;
    const r = await store.write('tasks/' + id, { status: s, updatedAt: new Date(clock.now()).toISOString() });
    b.disabled = false;
    if (!r.ok) toast('השמירה לא הצליחה. אפשר לנסות שוב');
  },
};
