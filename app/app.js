// Condisco shell: boot (real db or ?mock=1), routing, rendering, event delegation, desktop install.
import { $, $$, esc, DOW, clock, setClock, makeClock, toast, empty } from './core/util.js';
import { createStore } from './core/store.js';
import { createFocus } from './focus/ui.js';
import { createIdle } from './idle/idle.js';
import { watchHorizon } from './idle/horizon.js';
import * as Today from './ui/today.js';
import * as Gaps from './ui/gaps.js';
import * as Deadlines from './ui/deadlines.js';
import * as Checkin from './ui/checkin.js';
import * as Prefs from './ui/settings.js';

const ROUTES = { today: Today, gaps: Gaps, deadlines: Deadlines, checkin: Checkin, prefs: Prefs };
const TITLES = { gaps: 'מפת פערים', deadlines: 'דדליינים', checkin: "צ'ק-אין ערב", prefs: 'הגדרות' };
const params = new URLSearchParams(location.search);
const MOCK = params.get('mock');

let use = window.claude && window.claude.use ? n => window.claude.use(n) : null;
if (MOCK) {
  setClock(makeClock({ start: params.get('now') || null, speed: +(params.get('speed') || 1) }));
  use = (await import('./core/mock.js')).mockUse(MOCK);
}

const env = { install: null, downloads: null };
let route = 'today', pending = 0;
const store = createStore({
  use,
  onChange: () => schedule(),
  onNote: kind => { $('#note').innerHTML = kind === 'slow' ? '<div class="note">הנתונים עדיין נטענים, אז ייתכן שחלק מהמידע לא מעודכן.</div>' : ''; },
});
const focus = createFocus({ store, onChange: () => schedule() });
const ctx = { store, env, focus, rerender: force => render(force) };

function schedule() { if (pending) return; pending = requestAnimationFrame(() => { pending = 0; render(); }); }

function greeting() {
  const h = clock.date().getHours(), name = store.settings().name;
  const g = h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 23 ? 'ערב טוב' : 'לילה טוב';
  return name ? g + ', ' + name : g;
}
const message = (title, text) => empty(text, title);

function render(force = false) {
  const st = store.status, n = clock.date();
  $('#today').textContent = 'יום ' + DOW[n.getDay()] + ' ' + n.getDate() + '.' + (n.getMonth() + 1);
  $$('nav.tabs a').forEach(a => { if (a.dataset.r === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const V = $('#view');
  // never redraw under the cursor while the person is typing, unless asked
  const ae = document.activeElement;
  if (!force && ae && /^(TEXTAREA|INPUT|SELECT)$/.test(ae.tagName) && V.contains(ae)) return;
  document.body.classList.remove('setup');
  if (st.phase === 'nodb') { $('#title').textContent = 'Condisco'; V.innerHTML = message('אין חיבור לנתונים', 'צריך לפתוח את Condisco מתוך Claude, בחשבון שלך. שם נשמרים הנתונים, באחסון הפרטי של האפליקציה.'); return; }
  if (st.phase === 'error') { $('#title').textContent = 'Condisco'; V.innerHTML = message('שגיאה בטעינת הנתונים', `לא הצלחנו לקרוא את הנתונים (${st.err}). כדאי לרענן את הדף, ואם זה חוזר, לספר ל-Claude בצ'אט.`); return; }
  if (st.phase === 'loading') { if (st.slow && !store.S.courses.length) V.innerHTML = message('הטעינה לוקחת זמן', 'הנתונים עוד בדרך. כדאי לבדוק את החיבור לאינטרנט.'); return; }
  if (!st.owner && store.isEmpty()) { $('#title').textContent = 'Condisco'; V.innerHTML = message('ה-Condisco הזה שייך למישהו אחר', "לכל אחד ואחת יש Condisco פרטי. כדי ליצור אחד משלך, אפשר לבקש מ-Claude: 'להתקין לי Condisco'."); return; }
  if (store.isEmpty()) { document.body.classList.add('setup'); $('#title').textContent = 'ברוכים הבאים ל-Condisco'; document.title = 'Condisco'; V.innerHTML = Prefs.renderFirstRun(); return; }
  $('#title').textContent = route === 'today' ? greeting() : TITLES[route];
  document.title = 'Condisco · ' + (route === 'today' ? 'היום' : TITLES[route]);
  // keep keyboard focus on the same control across a re-render
  const fk = ae && V.contains(ae) && ae.dataset && ae.dataset.act ? ['act', 'id', 's', 'd', 'mode', 'v'].filter(k => ae.dataset[k] != null).map(k => `[data-${k}="${CSS.escape(ae.dataset[k])}"]`).join('') : null;
  V.innerHTML = ROUTES[route].render(ctx);
  if (fk) { const el = V.querySelector(fk); if (el) el.focus({ preventScroll: true }); }
}

function onRoute() {
  const h = location.hash.slice(1);
  const next = ROUTES[h] ? h : 'today';
  if (next !== route && route === 'checkin') Checkin.reset();
  route = next; render(true); window.scrollTo(0, 0);
  const V = $('#view'); V.classList.remove('enter'); void V.offsetWidth; V.classList.add('enter');
}
addEventListener('hashchange', onRoute);
setInterval(() => { if (!document.hidden && route === 'today') render(); }, 30000);

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b || b.closest('#focus')) return;
  const act = b.dataset.act;
  if (act === 'focus') { focus.open(b.dataset.mode, b.dataset.id || null); return; }
  const fn = (ROUTES[route].actions || {})[act]; if (!fn) return;
  e.preventDefault();
  await fn(b, ctx);
});
document.addEventListener('input', e => { if (route === 'checkin') Checkin.onInput(e); });
document.addEventListener('change', e => { if (route === 'prefs' && e.target.closest('#view')) Prefs.onChange(e, ctx); });
document.addEventListener('submit', e => {
  if (e.target.id === 'first-form') return Prefs.onFirstSubmit(e, ctx);
  if (e.target.id === 'prefs-form') return Prefs.onSubmit(e, ctx);
  if (e.target.id === 'fb-form') return Prefs.onFeedback(e, ctx);
  if (e.target.id === 'ci') return Checkin.onSubmit(e, ctx);
});

// ---- desktop: dock icon inside the installed app, install button elsewhere; downloads for export ----
function drawIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), k = 4;
  const bg = g.createLinearGradient(0, 0, 0, 256); bg.addColorStop(0, '#2a5176'); bg.addColorStop(1, '#12212f');
  g.fillStyle = bg; g.beginPath(); if (g.roundRect) g.roundRect(0, 0, 256, 256, 64); else g.rect(0, 0, 256, 256); g.fill();
  const gl = g.createRadialGradient(128, 140, 0, 128, 140, 68); gl.addColorStop(0, 'rgba(240,201,90,.45)'); gl.addColorStop(1, 'rgba(240,201,90,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(128, 140, 68, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f0c95a'; g.beginPath(); g.arc(32 * k, 37 * k, 11 * k, Math.PI, 0); g.closePath(); g.fill();
  g.strokeStyle = '#eef3f6'; g.lineCap = 'round'; g.lineJoin = 'round';
  const wave = (x0, y, w, dip, lw, a) => { g.globalAlpha = a; g.lineWidth = lw * k; g.beginPath(); g.moveTo(x0 * k, y * k); g.quadraticCurveTo((x0 + w / 2) * k, (y - dip) * k, (x0 + w) * k, y * k); g.quadraticCurveTo((x0 + w * 1.5) * k, (y - dip) * k, (x0 + w * 2) * k, y * k); g.stroke(); g.globalAlpha = 1; };
  wave(10, 41, 22, 5.5, 3.2, 1); wave(14, 48, 18, 4, 2.6, .55);
  return c.toDataURL('image/png');
}
async function capabilities() {
  if (!use) return;
  try { env.downloads = await use('downloads'); } catch (e) { env.downloads = null; }
  let d = null; try { d = await use('desktop'); } catch (e) { d = null; }
  if (!d) return;
  try {
    if (d.window && d.app && d.app.dock) { d.app.dock.setIcon(drawIcon()).catch(() => {}); return; }
    if ((await d.install.state()) === 'available') { env.install = d.install; if (route === 'prefs') render(); }
  } catch (e) { /* install button stays hidden */ }
}

// ---- boot ----
onRoute();
createIdle({ store, focus });
watchHorizon($('#horizon'));
await store.start();
focus.resume();
capabilities();
if (MOCK) window.__condisco = { store, focus, clock: () => clock, render };
