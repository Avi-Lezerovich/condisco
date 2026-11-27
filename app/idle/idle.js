// Desktop idle screen: after 1 minute without input, calm scenes from the scene registry.
// Clean by default; the clock and next task appear only in the 15 minutes before the next task starts
// (and for 5 minutes after it was due, while it is still open).
// While a focus block runs, a quiet strip shows phase, whole minutes left, the goal and a thin progress line.
// Wake: a real move of the mouse (not a nudge of the desk), a key, a click or the wheel. The waking key or
// click is swallowed so it never types or clicks into the app underneath. The scene stays on screen while
// it fades out, and coming back within that fade keeps the same scene.
import { $, z, DOW, todayStr, nowMin, toMin, clock } from '../core/util.js';
import { sortDay } from '../core/model.js';
import * as E from '../focus/engine.js';
import { createSceneHost } from '../scenes/registry.js';

export const IDLE_MS = 60 * 1000;
const OUT_MS = 650;        // fade-out on wake; keep in sync with #ambient transition in index.html
const JITTER_PX = 14;      // mouse travel that counts as a real wake
const LEAD_MIN = 15, LATE_MIN = 5;
export const isDesk = () => matchMedia('(hover: hover) and (pointer: fine)').matches && innerWidth >= 900;

// Tokens use light-dark(), so read them through a probe element's computed colour and hand scenes plain hex.
let probe = null;
const toHex = rgb => { const m = /(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(rgb || ''); return m ? '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('') : '#888888'; };
export function palette() {
  if (!probe) { probe = document.createElement('i'); probe.hidden = true; document.body.appendChild(probe); }
  const v = n => { probe.style.color = `var(--scene-${n})`; return toHex(getComputedStyle(probe).color); };
  return { sky: v('sky'), far: v('far'), mid: v('mid'), near: v('near'), accent: v('accent'), ink: v('ink') };
}

// The task the clock should announce: the next timed open task starting within LEAD_MIN, or one that was
// due up to LATE_MIN ago and is still open. Pure, for tests.
export function upcoming(tasks, today, now) {
  const list = sortDay(tasks.filter(t => t.date === today && t.status === 'todo' && toMin(t.start) != null));
  const soon = list.find(t => { const l = toMin(t.start) - now; return l >= 0 && l <= LEAD_MIN; });
  if (soon) return { task: soon, left: toMin(soon.start) - now };
  const late = list.filter(t => { const l = toMin(t.start) - now; return l < 0 && l >= -LATE_MIN; }).pop();
  return late ? { task: late, left: toMin(late.start) - now } : null;
}
export function nextLine(left) {
  if (left > 1) return `בעוד ${left} דק': `;
  if (left === 1) return 'בעוד דקה: ';
  if (left === 0) return 'מתחילים עכשיו: ';
  return left === -1 ? 'התחיל לפני דקה: ' : `התחיל לפני ${-left} דק': `;
}

export function createIdle({ store, focus }) {
  const AMB = $('#ambient');
  AMB.innerHTML = '<div class="scenes" id="sceneBox"></div><div class="amb-shade" id="ambShade"></div>'
    + '<div class="amb-info" id="ambInfo"><div class="amb-clock" id="ambClock"></div><div class="amb-date" id="ambDate"></div><div class="amb-next" id="ambNext"></div></div>'
    + '<div class="amb-timer" id="ambTimer" role="status"><div class="at-row"><span class="at-phase" id="atPhase"></span><span class="at-min" id="atMin"></span></div><div class="at-goal" id="atGoal"></div><div class="at-bar"><i id="atBar"></i></div></div>';
  const manifestUrl = new URL('scenes/manifest.json', location.href).href;
  const host = createSceneHost($('#sceneBox'), { manifestUrl, palette, now: () => clock.now() });
  // Desktop focus already shows a scene behind its glass panel: the idle screen then lays itself over that same
  // scene (fades the panel, shows the strip) instead of starting a second, different scene.
  const overFocus = () => !!document.querySelector('#focus.open.scenic');
  let own = false; // this screen's own scene host is running
  const startOwn = () => { if (!own) { own = true; host.start(); } };
  function over(v) { AMB.classList.toggle('over', v); document.body.classList.toggle('idle-over', v && on); }
  let on = false, live = false, idleT = 0, tick = 0, grace = 0, stopT = 0, origin = null, last = null;

  function strip() {
    const F = focus.state, box = $('#ambTimer');
    const ended = !!F && F.state === 'recall';
    const show = E.timerShowing(F) || ended;
    box.classList.toggle('show', show);
    if (!show) return false;
    const task = F.taskId && store.S.tasks.find(t => t.id === F.taskId);
    if (ended) {
      $('#atPhase').textContent = 'הבלוק הסתיים' + (task ? ': ' + task.title : '');
      $('#atMin').textContent = 'כל הכבוד';
      $('#atGoal').textContent = 'אחר כך: דקה של סיכום קצר';
      $('#atBar').style.width = '100%';
      box.classList.remove('brk'); box.classList.add('end');
      return true;
    }
    const rem = E.remaining(F, clock.now()), seg = E.segmentLength(F);
    $('#atPhase').textContent = F.timer.paused ? 'מושהה' : F.state === 'focus' ? 'פוקוס' + (task ? ': ' + task.title : '') : 'הפסקה: לקום, מים, להסתכל רחוק מהמסך';
    $('#atMin').textContent = rem < 60000 ? 'פחות מדקה' : 'נשארו ' + Math.ceil(rem / 60000) + " דק'";
    $('#atGoal').textContent = F.state === 'focus' && F.goal ? 'המטרה: ' + F.goal : '';
    $('#atBar').style.width = Math.min(100, Math.max(0, 100 * (1 - rem / seg))).toFixed(1) + '%';
    box.classList.toggle('brk', F.state === 'break'); box.classList.remove('end');
    return true;
  }
  function info(show) { $('#ambInfo').classList.toggle('show', show); $('#ambShade').classList.toggle('show', show); }
  function update() {
    if (focus.state) focus.step();
    // scenes never change mid-focus: a swap due during focus waits for the break
    if (host.hold) host.hold(!!focus.state && focus.state.state === 'focus');
    const o = overFocus(); over(o); if (!o) startOwn();
    if (strip()) { info(false); return; }
    const u = upcoming(store.S.tasks, todayStr(), nowMin());
    info(!!u);
    if (!u) return;
    const d = clock.date(), hm = z(d.getHours()) + ':' + z(d.getMinutes());
    const c = $('#ambClock'); if (c.textContent !== hm) c.textContent = hm;
    $('#ambDate').textContent = 'יום ' + DOW[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
    const nx = $('#ambNext'), line = nextLine(u.left);
    if (nx.dataset.k !== line + u.task.id) {
      nx.dataset.k = line + u.task.id; nx.textContent = line;
      const b = document.createElement('b'); b.textContent = u.task.title; nx.appendChild(b);
    }
  }

  function show() {
    if (on || !isDesk() || document.hidden) return;
    if (focus.state && focus.state.state === 'breathe' && !focus.state.min) { poke(); return; } // never interrupt breathing
    clearTimeout(stopT); origin = last && [...last];
    const fresh = !live;
    on = true; live = true;
    if (fresh) AMB.classList.add('first');
    if (!overFocus()) startOwn();
    update(); clearInterval(tick); tick = setInterval(update, 1000);
    AMB.getBoundingClientRect();                       // commit the start state so the fade-in runs
    AMB.classList.add('on'); AMB.setAttribute('aria-hidden', 'false');
    if (fresh) setTimeout(() => AMB.classList.remove('first'), 120);
  }
  function stopNow() { clearTimeout(stopT); if (!live) return; live = false; if (own) { own = false; host.stop(); } }
  function hide(now) {
    if (!on) return;
    on = false; origin = null; clearInterval(tick);
    AMB.classList.remove('on'); AMB.setAttribute('aria-hidden', 'true'); document.body.classList.remove('idle-over');
    if (now) stopNow(); else { clearTimeout(stopT); stopT = setTimeout(stopNow, OUT_MS + 100); }
  }
  function arm() { clearTimeout(idleT); if (isDesk()) idleT = setTimeout(show, IDLE_MS); }
  function poke() { if (Date.now() < grace) return; if (on) hide(); arm(); }

  // While the screen is on, a small mouse nudge does not wake it; travel past JITTER_PX does.
  // With no known pointer position (the mouse never moved over the page) any move wakes.
  function onMove(e) {
    last = [e.clientX, e.clientY];
    if (!on) { poke(); return; }
    if (Date.now() < grace) return;
    if (!origin || Math.hypot(e.clientX - origin[0], e.clientY - origin[1]) > JITTER_PX) poke();
  }
  // The key or click that wakes the screen is only a wake-up.
  function swallow(e) {
    if (!on) { poke(); return; }
    e.preventDefault(); e.stopPropagation(); poke();
    if (e.type === 'pointerdown') {
      const eat = ev => { ev.preventDefault(); ev.stopPropagation(); };
      addEventListener('click', eat, { capture: true, once: true });
      setTimeout(() => removeEventListener('click', eat, { capture: true }), 800);
    }
  }
  addEventListener('mousemove', onMove, { passive: true });
  addEventListener('keydown', swallow, { capture: true });
  addEventListener('pointerdown', swallow, { capture: true });
  ['wheel', 'touchstart'].forEach(ev => addEventListener(ev, poke, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { hide(true); clearTimeout(idleT); } else arm(); });
  addEventListener('resize', () => { if (!isDesk()) { hide(true); clearTimeout(idleT); } else if (!on) arm(); });
  arm();

  // Warm the scene modules while the app is quiet, so the first idle screen opens without a blank moment.
  const warm = async () => {
    try { const list = await (await fetch(manifestUrl)).json(); for (const e of list) { try { await import(new URL('../' + e.file, manifestUrl).href); } catch (_) { /* the host skips it */ } } } catch (_) { /* offline: host retries */ }
  };
  if (isDesk()) (window.requestIdleCallback || (f => setTimeout(f, 4000)))(warm, { timeout: 8000 });

  const btn = $('#ambBtn'), sync = () => { btn.hidden = !isDesk(); };
  sync(); addEventListener('resize', sync);
  btn.addEventListener('click', () => { btn.blur(); grace = Date.now() + 1200; clearTimeout(idleT); show(); });
  return { show, hide, get on() { return on; }, host };
}
