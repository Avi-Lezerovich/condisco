// Focus timer view and cues (owned by the focus/timer thread).
// - timerBody(): the focus/break screen (setup before start, ring while running)
// - timerLive(): per-tick DOM updates, no re-render
// - paintMini(): the minimised pill
// - createCues(): one "leader" tab rings the bells and drives music, so two open tabs never double up;
//   the next bell is scheduled ahead on the audio clock when the sound module supports it, because
//   a background tab's timers can run up to a minute late.
import { $, esc, mmss, safeLS } from '../core/util.js';
import * as E from './engine.js';
import * as SND from './sound.js';
import { volumeRow } from './music-ui.js'; // sound thread's slider; bindSound(FZ) already handles it

const MIN = 60000;
const PAT_HINT = { '25/5': 'קצר, טוב לפתיחה או לעייפות', '45/10': 'ברירת המחדל לקריאה ותרגול', '50/10': 'לעבודה עמוקה ורציפה' };
const TOTALS = [25, 45, 60, 90, 120];
const R = 52, C = 2 * Math.PI * R; // ring geometry in a 120×120 viewBox

const fmtMin = ms => { const m = Math.round(ms / MIN); return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} ש'` : `${m} דק'`; };

function planBar(F, pos) {
  const tot = pos.segs.reduce((a, x) => a + x.ms, 0) || 1;
  return `<div class="tplan" aria-hidden="true">${pos.segs.map((x, k) => `<i class="${x.kind}${F.timer.run && k < pos.i ? ' past' : ''}${F.timer.run && k === pos.i ? ' cur' : ''}" style="flex-grow:${(x.ms / tot * 1000).toFixed(0)}">${k === pos.i && F.timer.run ? '<b id="tplanCur"></b>' : ''}</i>`).join('')}</div>`;
}

export function timerBody(F, { taskLine, audioOk }) {
  const T = F.timer, s = F.state, pos = E.planPos(F);
  if (!T.run) {
    const tm = Math.round(T.total / MIN), totals = TOTALS.includes(tm) ? TOTALS : [...TOTALS, tm].sort((a, b) => a - b);
    const nb = pos.segs.filter(x => x.kind === 'break').length;
    return `<h2>פוקוס</h2>${taskLine}${F.goal ? `<div class="tgoal">המטרה: ${esc(F.goal)}</div>` : ''}
      <div class="q"><span>קצב</span><div class="tpat" role="group" aria-label="קצב">${Object.keys(E.PATTERNS).map(p => `<button class="tp ${T.pat === p ? 'on' : ''}" data-f="pat" data-v="${p}" aria-pressed="${T.pat === p}"><b>${p}</b><small>${PAT_HINT[p]}</small></button>`).join('')}</div></div>
      <div class="q"><span>כמה זמן פוקוס בסך הכול</span><div class="choices" role="group" aria-label="משך כולל">${totals.map(m => `<button class="btn ${tm === m ? 'on' : ''}" data-f="total" data-v="${m}" aria-pressed="${tm === m}">${fmtMin(m * MIN)}</button>`).join('')}</div></div>
      <div class="tprev">${planBar(F, pos)}<p class="hint">${pos.rounds === 1 ? `סבב אחד של ${fmtMin(T.total)}` : `${pos.rounds} סבבים, ${nb === 1 ? 'הפסקה אחת' : nb + ' הפסקות'} של ${fmtMin(T.brk)}`}. הפסקות קבועות עוזרות לסיים את אותה עבודה בפחות זמן.</p></div>
      <div class="foot"><button class="btn primary" data-f="tstart">התחלה</button><button class="btn" data-f="stop">בלי טיימר</button></div>`;
  }
  const brk = s === 'break';
  return `<div class="trun ${brk ? 'is-brk' : ''} ${T.paused ? 'is-paused' : ''}">
    ${brk ? '' : taskLine}
    <div class="tring" role="timer" aria-live="off">
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="tr-bg" cx="60" cy="60" r="${R}"/><circle class="tr-fg" id="tfg" cx="60" cy="60" r="${R}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}"/></svg>
      <div class="tr-in"><div class="tr-ph" id="tphase">${T.paused ? 'מושהה' : brk ? 'הפסקה' : 'פוקוס'}</div><div class="big" id="tbig"></div><div class="tr-sub" id="tsub"></div></div>
    </div>
    ${planBar(F, pos)}
    <div class="tvol">${volumeRow()}</div>
    ${brk ? '<p class="tbrk">לקום מהכיסא, למתוח, לשתות מים, להסתכל רחוק. בלי טלפון: ככה ההפסקה באמת מנקה את הראש.</p>' : F.goal ? `<div class="tgoal">המטרה: ${esc(F.goal)}</div>` : ''}
    ${audioOk ? '' : '<button class="tsnd" data-f="unlock">נגיעה כאן מפעילה את צליל הסיום</button>'}
  </div>
  <div class="foot"><button class="btn ${T.paused ? 'primary' : ''}" data-f="pause" data-v="${T.paused ? 'off' : 'on'}">${T.paused ? 'המשך' : 'השהיה'}</button>${brk ? '<button class="btn" data-f="skipbreak">חזרה לפוקוס</button>' : ''}<button class="btn" data-f="stop" data-confirm="1">סיימתי</button></div>`;
}

export function timerLive(F, n) {
  const big = $('#tbig'); if (!big) return;
  const rem = E.remaining(F, n), L = E.segmentLength(F), frac = Math.min(1, Math.max(0, 1 - rem / L));
  const t = mmss(rem); if (big.textContent !== t) big.textContent = t;
  const fg = $('#tfg'); if (fg) { fg.setAttribute('stroke-dashoffset', (C * (1 - frac)).toFixed(2)); fg.style.opacity = frac < .003 ? '0' : ''; } // no lone dot at 0
  const cur = $('#tplanCur'); if (cur) cur.style.width = (frac * 100).toFixed(1) + '%';
  const sub = $('#tsub');
  if (sub) {
    const p = E.planPos(F), txt = F.state === 'break' ? `אחר כך סבב ${p.round + 1} מתוך ${p.rounds}` : p.rounds > 1 ? `סבב ${p.round} מתוך ${p.rounds}` : '';
    if (sub.textContent !== txt) sub.textContent = txt;
  }
  const ring = $('.tring'); if (ring) { const lab = `${F.timer.paused ? 'מושהה' : F.state === 'break' ? 'הפסקה' : 'פוקוס'}, נשארו ${Math.ceil(rem / MIN)} דקות`; if (ring.getAttribute('aria-label') !== lab) ring.setAttribute('aria-label', lab); }
}

export function paintMini(F, n, MINI) {
  if (!F || !F.min || !E.timerShowing(F)) { MINI.hidden = true; return; }
  const rem = E.remaining(F, n), segL = E.segmentLength(F), brk = F.state === 'break';
  MINI.hidden = false;
  MINI.classList.toggle('brk', brk); MINI.classList.toggle('paused', !!F.timer.paused);
  const ph = F.timer.paused ? 'מושהה' : brk ? 'הפסקה' : 'פוקוס', t = mmss(rem);
  const a = $('#miniPh'), b = $('#miniT'), bar = $('#miniBar');
  if (a && a.textContent !== ph) a.textContent = ph;
  if (b && b.textContent !== t) b.textContent = t;
  if (bar) bar.style.width = Math.min(100, Math.max(0, 100 * (1 - rem / segL))).toFixed(1) + '%';
  const lab = `חזרה לטיימר: ${ph}, נשארו ${Math.ceil(rem / MIN)} דקות`; if (MINI.getAttribute('aria-label') !== lab) MINI.setAttribute('aria-label', lab);
}

// ---- cues: bells + music hooks, one leader tab ----
const LK = 'condisco.focus.leader', STALE = 150000, BEAT = 30000, LATE = 120000;
const BELL = { 'focus-end': 'focus-end', 'break-end': 'break-end', 'block-end': 'block-end' };

export function createCues({ now, tab = Math.random().toString(36).slice(2, 10) }) {
  const TAB = tab;
  let armed = null; // { key, at, cancel }
  let beatAt = 0;
  const read = () => { try { return JSON.parse(safeLS.get(LK) || 'null'); } catch (e) { return null; } };
  function claim() { if (safeLS.set(LK, JSON.stringify({ tab: TAB, at: now() }))) beatAt = now(); }
  function isLeader() {
    const r = read();
    if (!r || !r.tab || now() - (r.at || 0) > STALE || now() < (r.at || 0) - STALE) { claim(); return true; }
    if (r.tab !== TAB) return false;
    if (now() - beatAt > BEAT) claim();
    return true;
  }
  function cancel() { if (armed && armed.cancel) { try { armed.cancel(); } catch (e) { /* ignore */ } } armed = null; }
  function audioOk() { try { return SND.audioReady ? SND.audioReady() : true; } catch (e) { return true; } }
  function unlock() {
    try { if (SND.unlockAudio) SND.unlockAudio(); else { const a = SND.ensureAudio(); if (a && a.state === 'suspended') a.resume(); } } catch (e) { /* ignore */ }
  }
  function ring(kind) {
    try {
      if (SND.Chime && SND.Chime.play) SND.Chime.play(BELL[kind] || 'focus-end'); else SND.beep();
    } catch (e) { /* no sound is fine */ }
  }
  // phase changes go through the sound module's single entry point; chimed:true = the bell already rang (scheduled ahead) or is stale
  function cue(kind, chimed) {
    try { if (SND.timerCue) SND.timerCue(kind, { chimed: !!chimed }); else if (!chimed && BELL[kind]) ring(kind); } catch (e) { /* ignore */ }
  }
  const music = kind => cue(kind, true);

  // keep the next bell scheduled on the audio clock (leader only)
  function arm(F) {
    const c = E.nextCue(F);
    if (!c || !isLeader() || !(SND.Chime && SND.Chime.at)) { cancel(); return; }
    const key = F.id + ':' + c.at + ':' + c.kind;
    if (armed && armed.key === key) return;
    cancel();
    const delay = c.at - now();
    if (delay < 250) return; // too close: the tick will ring it
    let h = null; try { h = SND.Chime.at(BELL[c.kind], delay); } catch (e) { h = null; }
    if (h) armed = { key, at: c.at, kind: c.kind, cancel: typeof h === 'function' ? h : h.cancel };
  }

  // events from E.tick; prev = the state before the tick. Returns how late the last transition was handled.
  function onTick(prev, next, events) {
    if (!events.includes('beep')) { arm(next); return 0; }
    const at = prev.timer.segEnd, late = now() - at;
    const kind = next.state === 'recall' ? 'block-end' : next.state === 'break' ? 'focus-end' : 'break-end';
    if (isLeader()) {
      const playedAhead = armed && Math.abs(armed.at - at) < 1000 && late < 5000;
      cue(kind, playedAhead || late >= LATE);
    }
    armed = null; arm(next);
    return late;
  }
  // a user action on the timer (pause/resume/start/stop/skipbreak)
  function onAction(kind, F) { claim(); if (kind) music(kind); arm(F); }
  function release() { cancel(); const r = read(); if (r && r.tab === TAB) safeLS.del(LK); }
  return { arm, onTick, onAction, release, claim, isLeader, unlock, audioOk, cancel, tab: TAB };
}
