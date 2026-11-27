// Focus overlay: renders the engine's state, ticks it, persists it, and keeps a second tab in step.
import { $, esc, mmss, toast, CHECK, safeLS, clock } from '../core/util.js';
import * as E from './engine.js';
import { ensureAudio, beep, Pad, Music } from './sound.js';
import { soundPicker, bindSound } from './music-ui.js'; // sound thread hook
import { breathBody, createBreathLive, breathEnd } from './breath.js';
import { timerBody, timerLive, paintMini as miniPaint, createCues } from './timer.js'; // timer thread
import { createFocusScene, isWide, WIDE } from './scene.js';

const ZONE = {
  block: [['dnd', 'הטלפון על "נא לא להפריע", ורחוק מהיד'], ['one', 'פתוח רק החומר של המשימה'], ['water', 'בקבוק מים בהישג יד'], ['seat', 'במקום הקבוע ללמידה, לא במיטה']],
  class: [['dnd', 'הטלפון בתיק, על שקט'], ['open', 'מחברת או מחשב פתוחים על נושא השיעור'], ['seat', 'במקום שרואים ושומעים ממנו טוב'], ['prev', 'הצצתי דקה בחומר מהשיעור הקודם']],
};
const PLAYLIST_OK = u => /^https:\/\/(music\.youtube\.com|www\.youtube\.com|youtube\.com|youtu\.be|open\.spotify\.com)\//.test(u || '');
const MUSIC = [
  ['שקט', 'הכי טוב לקריאה ולהוכחות', ''],
  ['לו-פיי אינסטרומנטלי', 'בלי מילים', 'https://music.youtube.com/search?q=lofi+instrumental+study'],
  ['פסנתר שקט', 'קצב איטי', 'https://music.youtube.com/search?q=calm+piano+instrumental+study'],
  ['רעש חום', 'מבליע רעשי רקע', 'https://music.youtube.com/search?q=brown+noise'],
];
const STEP_LABEL = { zone: 'אזור למידה', breathe: 'נשימה', music: 'מוזיקה', focus: 'פוקוס', recall: 'שליפה', ready: 'יוצאים לשיעור' };

export function createFocus({ store, onChange = () => {} }) {
  const FZ = $('#focus'), MINI = $('#mini');
  // desktop (>= 1024px): the scene fills the screen and the steps sit on a glass panel; phone: a full-screen sheet
  FZ.innerHTML = '<div class="fz-scene" aria-hidden="true"></div><div class="fz-box"></div>';
  const SCN = FZ.querySelector('.fz-scene'), BOX = FZ.querySelector('.fz-box');
  const SC = createFocusScene(SCN);
  bindSound(BOX); // sound thread hook: content re-renders inside BOX
  let F = null, loop = 0;
  const BL = createBreathLive(Pad);
  const CU = createCues({ now: () => clock.now() }); // timer thread: leader tab, bells, music cues
  const LS_OK = safeLS.set('condisco.ls', '1'); // without storage there is nothing to sync against
  let stopArm = 0, stopT = 0;
  const now = () => clock.now();
  const task = () => F && F.taskId ? store.S.tasks.find(t => t.id === F.taskId) || null : null;
  const course = () => { const t = task(); return t ? store.S.courses.find(c => c.id === t.courseId) : null; };
  const soundPref = () => safeLS.get('condisco.breathSound') !== '0';

  function commit(next, { render = true } = {}) {
    F = E.save(safeLS, next);
    if (F && F.state === 'done') { finalize(F); return; }
    if (render) paint();
    ensureLoop(); onChange();
  }
  function ensureLoop() {
    const need = F && ((F.state === 'breathe' && F.breath.run) || E.timerShowing(F));
    if (need && !loop) loop = setInterval(step, 200);
    if (!need && loop) { clearInterval(loop); loop = 0; }
  }
  // timer thread: adopt a newer copy written by another tab, or drop the block if another tab ended it
  function sync() {
    if (!F || !LS_OK) return !!F;
    const raw = safeLS.get(E.KEY);
    if (!raw) { drop(); return false; }
    try { const s = JSON.parse(raw); if (s && (s.id !== F.id || (s.rev || 0) > (F.rev || 0))) adopt(s); } catch (e) { /* ignore */ }
    return !!F;
  }
  // after a sleep, whichever tab caught up first stamps the state, so every open tab explains the jump once
  let lastCaught = 0;
  function caught(s) { if (s && s.caught && s.caught !== lastCaught && now() - s.caught < 15000) { lastCaught = s.caught; toast('הטיימר המשיך לרוץ גם בזמן שהמסך היה כבוי'); } }
  function adopt(s) {
    const wasOpen = FZ.classList.contains('open');
    caught(s);
    F = s;
    if (wasOpen) paint(); else if (E.timerShowing(F)) { F = { ...F, min: true }; paint(); } else MINI.hidden = true;
    CU.arm(F); ensureLoop(); onChange();
  }
  function drop() { F = null; SC.forget(); CU.cancel(); ensureLoop(); Pad.stop(); try { Music.stop(); } catch (e) { /* ignore */ } hide(); MINI.hidden = true; onChange(); }
  function step() {
    if (!F || !sync()) return;
    const prev = F, { state, events } = E.tick(F, now());
    if (E.timerShowing(prev)) { const late = CU.onTick(prev, state, events); if (late > 120000) { state.caught = now(); caught(state); } }
    if (events.includes('breath-end')) breathEnd();
    if (events.length) { commit(state); return; }
    live();
  }

  // ---- open / close ----
  function open(mode, taskId) {
    if (F && E.isRunning(F)) { restore(); return; }
    const t = taskId ? store.S.tasks.find(x => x.id === taskId) : null;
    ensureAudio();
    BL.reset();
    commit(E.create({ mode, task: t || null, now: now(), sound: soundPref(), pattern: safeLS.get('condisco.pattern') || '45/10', pace: safeLS.get('condisco.breathPace') || 'calm' }));
    setTimeout(() => { const b = FZ.querySelector('button'); if (b) b.focus(); }, 30);
  }
  function close() { SC.forget(); CU.cancel(); Pad.stop(); Music.stop(); /* sound thread hook */ F = null; safeLS.del(E.KEY); ensureLoop(); hide(); MINI.hidden = true; onChange(); }
  function hide() { BL.release(); SC.stop(); FZ.classList.remove('open', 'calm', 'scenic', 'brk'); BOX.innerHTML = ''; document.body.classList.remove('locked'); }
  // the scene holds in every step except the break, so it never swaps mid-focus
  function scene() {
    const wide = isWide() && !!F && !F.min;
    FZ.classList.toggle('scenic', wide);
    if (wide) SC.start(F.state !== 'break'); else SC.stop();
  }
  matchMedia(WIDE).addEventListener('change', () => { if (F && !F.min && FZ.classList.contains('open')) scene(); });
  function minimize() { if (!F) return; commit(E.dispatch(F, 'minimize', null, now()), { render: false }); hide(); paintMini(); }
  function restore() { if (!F) return; ensureAudio(); commit(E.dispatch(F, 'restore', null, now())); }

  async function finalize(s) {
    const t = now(), keep = s, tk = keep.taskId ? store.S.tasks.find(x => x.id === keep.taskId) : null;
    F = null; SC.forget(); CU.cancel(); ensureLoop(); Pad.stop(); Music.stop(1); /* sound thread hook */ hide(); MINI.hidden = true; onChange();
    const log = E.sessionLog(keep, t);
    if (keep.mode !== 'music') await store.write('sessions/' + keep.id, log, 'set'); // id from start time: two tabs write the same doc
    const ts = new Date(t).toISOString();
    if (tk && keep.mark && keep.mark !== tk.status) await store.write('tasks/' + tk.id, { status: keep.mark, ...(keep.recall ? { recall: keep.recall } : {}), updatedAt: ts });
    else if (tk && keep.recall) await store.write('tasks/' + tk.id, { recall: keep.recall, updatedAt: ts });
    toast(keep.mode === 'block' ? (log.focusMin ? `נשמר: ${log.focusMin} דק' פוקוס` : 'נשמר') : keep.mode === 'class' ? 'בהצלחה בשיעור' : 'נשמר');
  }

  // ---- render ----
  function paint() {
    if (!F) { hide(); MINI.hidden = true; return; }
    if (F.min) { hide(); paintMini(); return; }
    MINI.hidden = true;
    FZ.classList.add('open'); document.body.classList.add('locked');
    FZ.classList.toggle('calm', F.state === 'breathe');
    FZ.classList.toggle('brk', F.state === 'break');
    scene();
    BOX.innerHTML = `<div class="fz" data-step="${F.state}">${head()}${body()}</div>`;
    BL.reset(); live();
  }
  function head() {
    const steps = F.steps, i = steps.indexOf(F.state === 'break' ? 'focus' : F.state);
    const dots = steps.length > 1 ? `<div class="steps" aria-label="שלב ${i + 1} מתוך ${steps.length}: ${STEP_LABEL[F.state === 'break' ? 'focus' : F.state] || ''}">${steps.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>` : '<span></span>';
    return `<div class="fz-top">${dots}${E.timerShowing(F) ? '<button class="btn" data-f="minimize">חזרה לאפליקציה</button>' : '<button class="btn" data-f="close">סגירה</button>'}</div>`;
  }
  function taskLine() {
    const t = task(), c = course();
    return t ? `<div class="task">${c ? esc(c.name) + ': ' : ''}<b>${esc(t.title)}</b>${t.minVersion ? `<br>מינימום: ${esc(t.minVersion)}` : ''}</div>` : '';
  }
  function body() {
    const s = F.state, t = task();
    if (s === 'zone') {
      const cls = F.mode === 'class';
      const fid = t && Array.isArray(t.unitIds) ? (t.unitIds.map(id => store.S.units.find(u => u.id === id)).find(u => u && /^[\w-]{10,}$/.test(u.fileId || '')) || {}).fileId : '';
      return `<h2>${cls ? 'לפני השיעור' : 'אזור למידה'}</h2>${taskLine()}
        <div class="stack">${ZONE[cls ? 'class' : 'block'].map(([k, l]) => `<button class="chk" data-f="check" data-v="${k}" aria-pressed="${!!F.checks[k]}"><span class="ck">${CHECK}</span>${l}</button>`).join('')}</div>
        ${fid ? `<a class="flink" href="https://drive.google.com/file/d/${esc(fid)}/view" target="_blank" rel="noopener">לקובץ של המשימה</a>` : ''}
        <label class="q"><span>${cls ? 'שאלה אחת שאני רוצה לצאת איתה מהשיעור' : 'בסוף הבלוק אני רוצה לדעת...'}</span><input class="f" id="fz-goal" maxlength="200" value="${esc(F.goal)}" placeholder="${cls ? 'למשל: למה הרדוקציה עובדת בכיוון הזה?' : 'למשל: לפתור את שאלה 2 לבד'}"></label>
        <div class="foot"><button class="btn primary" data-f="next">המשך</button></div>`;
    }
    if (s === 'breathe') return breathBody(F, sndBtn);
    if (s === 'music') {
      const pl = store.settings().playlistUrl, solo = F.mode === 'music';
      return `<h2>מוזיקה</h2><p class="hint">מילים בשיר מתחרות על הקשב בזמן קריאה. כל הצלילים כאן בלי מילים, ואפשר גם שקט.</p>
        ${soundPicker() /* sound thread hook */}
        <div class="music">${PLAYLIST_OK(pl) ? `<a href="${esc(pl)}" target="_blank" rel="noopener">הפלייליסט שלי <small>קישור שמור</small></a>` : ''}
        ${MUSIC.filter(m => m[2]).map(([n, d, u]) => u ? `<a href="${u}" target="_blank" rel="noopener">${n} <small>${d}</small></a>` : `<button class="mlink" data-f="${solo ? 'finish' : 'next'}">${n} <small>${d}</small></button>`).join('')}</div>
        <div class="q"><label for="fz-pl"><span>${PLAYLIST_OK(pl) ? 'להחליף את הפלייליסט שלי' : 'לשמור פלייליסט משלי'}</span></label><small>קישור מ-YouTube Music או Spotify</small><div class="inrow"><input class="f" id="fz-pl" inputmode="url" placeholder="https://music.youtube.com/playlist?list=..."><button class="btn" data-f="savepl">שמירה</button></div></div>
        <div class="foot">${solo ? '<button class="btn primary" data-f="finish">סיום</button>' : '<button class="btn primary" data-f="next">המשך</button>'}</div>`;
    }
    if (s === 'focus' || s === 'break') return timerBody(F, { taskLine: taskLine(), audioOk: CU.audioOk() }); // timer thread
    if (s === 'ready') {
      return `<h2>הכול מוכן לשיעור</h2>${F.goal ? `<div class="note">השאלה שלך לשיעור: ${esc(F.goal)}</div>` : ''}<p class="hint">בסוף השיעור שווה לבדוק: קיבלת תשובה לשאלה?</p><div class="foot"><button class="btn primary" data-f="finish">יאללה</button></div>`;
    }
    if (s === 'recall') {
      return `<h2>שליפה בלי חומר</h2>${taskLine()}<p class="hint">עכשיו בלי חומר פתוח: לפתור שאלה אחת, או לכתוב מהזיכרון את הרעיון המרכזי של הבלוק.</p>
        <div class="q"><span>הצלחת?</span><div class="choices">${[['yes', 'הצלחתי'], ['part', 'חלקית'], ['no', 'לא']].map(([v, l]) => `<button class="btn ${F.recall === v ? 'on' : ''}" data-f="recall" data-v="${v}" aria-pressed="${F.recall === v}">${l}</button>`).join('')}</div></div>
        ${t ? `<div class="q"><span>איך לסמן את המשימה?</span><div class="choices">${[['done', 'בוצע'], ...(t.minVersion ? [['min', 'מינימום']] : []), ['todo', 'עוד לא']].map(([v, l]) => `<button class="btn ${F.mark === v ? 'on' : ''}" data-f="mark" data-v="${v}" aria-pressed="${F.mark === v}">${l}</button>`).join('')}</div></div>` : ''}
        <div class="foot"><button class="btn primary" data-f="finish">שמירה וסגירה</button></div>`;
    }
    return '';
  }
  const sndBtn = on => `<button class="btn snd ${on ? 'on' : ''}" data-f="bsound" aria-pressed="${on}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/>${on ? '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg>${on ? 'צליל רקע פועל' : 'צליל רקע כבוי'}</button>`;

  // per-tick updates without re-rendering the whole overlay
  function live() {
    if (!F) return;
    const n = now();
    if (F.min) { paintMini(); return; }
    BL.tick(F, n);
    if (F.state === 'focus' || F.state === 'break') timerLive(F, n);
  }
  function paintMini() { miniPaint(F, now(), MINI); }

  // ---- events ----
  FZ.addEventListener('input', e => { if (e.target.id === 'fz-goal' && F) F = E.save(safeLS, E.dispatch(F, 'goal', e.target.value, now())); });
  FZ.addEventListener('click', async e => {
    const b = e.target.closest('[data-f]'); if (!b || !F || !sync()) return;
    const a = b.dataset.f, v = b.dataset.v;
    if (a === 'unlock') { CU.unlock(); CU.cancel(); setTimeout(() => { if (F) { CU.arm(F); paint(); } }, 250); return; }
    if (a === 'stop' && b.dataset.confirm && now() - stopArm > 4000) { // one accidental tap must not end the block
      stopArm = now(); b.textContent = 'לסיום: עוד לחיצה'; b.classList.add('confirm');
      clearTimeout(stopT); stopT = setTimeout(() => { stopArm = 0; if (b.isConnected) { b.textContent = 'סיימתי'; b.classList.remove('confirm'); } }, 4000);
      return;
    }
    const cueKind = a === 'tstart' ? 'start' : a === 'pause' ? (v === 'off' ? 'resume' : 'pause') : a === 'skipbreak' ? 'resume' : a === 'stop' && E.timerShowing(F) ? 'stop' : null;
    if (a === 'close') { if (E.timerShowing(F)) minimize(); else close(); return; }
    if (a === 'minimize') { minimize(); return; }
    if (a === 'check') { F = E.save(safeLS, E.dispatch(F, 'check', v, now())); b.setAttribute('aria-pressed', !!F.checks[v]); return; }
    if (a === 'bsound') {
      const next = E.dispatch(F, 'bsound', null, now()); safeLS.set('condisco.breathSound', next.breath.sound ? '1' : '0');
      if (next.breath.run) { if (next.breath.sound) { Pad.start(); BL.reset(); } else Pad.stop(); }
      commit(next); return;
    }
    if (a === 'bstart') { ensureAudio(); commit(E.dispatch(F, 'bstart', null, now())); return; }
    if (a === 'next') { if (F.state === 'breathe') Pad.stop(); commit(E.dispatch(F, 'next', null, now())); return; }
    if (a === 'bpace') safeLS.set('condisco.breathPace', v);
    if (a === 'pat') { safeLS.set('condisco.pattern', v); }
    if (a === 'tstart') ensureAudio();
    if (a === 'savepl') {
      const val = ($('#fz-pl').value || '').trim();
      if (!PLAYLIST_OK(val)) { toast('הקישור צריך להתחיל ב-https://music.youtube.com או https://open.spotify.com'); return; }
      const has = store.S.settings.some(x => x.id === 'main');
      const r = await store.write('settings/main', { playlistUrl: val, updatedAt: new Date(now()).toISOString() }, has ? 'update' : 'set');
      toast(r.ok ? 'הפלייליסט נשמר' : 'השמירה לא הצליחה. אפשר לנסות שוב'); if (r.ok) setTimeout(paint, 300); return;
    }
    if (a === 'stop') stopArm = 0;
    commit(E.dispatch(F, a, v, now()));
    if (cueKind) CU.onAction(cueKind, F);
  });
  MINI.addEventListener('click', restore);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && F && !F.min && FZ.classList.contains('open')) { if (E.timerShowing(F)) minimize(); else close(); } });
  // another tab changed the block
  addEventListener('storage', e => {
    if (e.key === 'condisco.focus.leader') { if (F) CU.arm(F); return; }
    if (e.key !== E.KEY) return;
    if (!e.newValue) { if (F) drop(); return; }
    try { const s = JSON.parse(e.newValue); if (!F || s.id !== F.id || (s.rev || 0) > (F.rev || 0)) adopt(s); } catch (err) { /* ignore */ }
  });
  // background tab: the interval is throttled, so catch up as soon as the tab is visible again
  document.addEventListener('visibilitychange', () => { if (!document.hidden && F) { CU.claim(); step(); } }); // the visible tab rings
  addEventListener('pageshow', e => { if (e.persisted) { if (F) step(); else resume(); } }); // back from the back-forward cache
  addEventListener('pagehide', () => CU.release());
  // after a reload no tap has unlocked audio yet, so the first tap anywhere does it and re-schedules the bell
  document.addEventListener('pointerdown', () => {
    if (!F || !E.timerShowing(F) || CU.audioOk()) return;
    CU.unlock(); CU.cancel(); setTimeout(() => { if (!F) return; CU.arm(F); if (!F.min && FZ.querySelector('.tsnd')) paint(); }, 250);
  }, { capture: true, passive: true });
  // space pauses or resumes the running timer
  document.addEventListener('keydown', e => {
    if (e.key !== ' ' || !F || F.min || !E.timerShowing(F) || !FZ.classList.contains('open') || (e.target.closest && e.target.closest('button,input,textarea,select,a'))) return;
    const pb = FZ.querySelector('[data-f=pause]'); if (pb) { e.preventDefault(); pb.click(); }
  });

  // resume after a reload
  function resume() {
    const s = E.load(safeLS, now()); if (!s) return;
    const { state } = E.tick(s, now());
    F = state;
    if (F.state === 'done') { finalize(F); return; }
    F = E.save(safeLS, F); paint(); ensureLoop(); onChange();
  }

  return { open, close, resume, restore, get state() { return F; }, step, get tab() { return CU.tab; } };
}
