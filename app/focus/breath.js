// Breathing screen (cyclic sighing): markup + per-tick animation. Owned by the breathing thread.
// The engine (engine.js) says where in the breath we are; this file only draws it and cues the sound.
import { $ } from '../core/util.js';
const clockTxt = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
import * as E from './engine.js';
import { Pad, Chime } from './sound.js';
import { volumeRow } from './music-ui.js';

// session finished: let the pad fade, then a low two-note bell
export function breathEnd() { Pad.stop(); setTimeout(() => { try { Chime.play('breath-end'); } catch (e) { /* no sound is fine */ } }, 300); }

const CUE = {
  lead: ['להתיישב בנוח', 'כתפיים רפויות, הלסת משוחררת'],
  in: ['שאיפה', 'באף, לאט'],
  top: ['ועוד קצת', 'שאיפה קצרה שממלאת עד הסוף'],
  out: ['נשיפה ארוכה', 'בפה, לאט, עד הסוף'],
  settle: ['ועכשיו לנשום רגיל', ''],
};
// orb size per phase (fraction of the guide ring) and the easing that feels like a real breath
const SCALE = { lead: .6, in: .9, top: 1, out: .6 };
const EASE = { lead: 'ease-in-out', in: 'cubic-bezier(.3,.1,.4,1)', top: 'cubic-bezier(.2,.6,.4,1)', out: 'cubic-bezier(.45,.05,.35,1)', settle: 'ease-in-out' };
const PACE_LABEL = { calm: ['רגוע', '6 נשימות בדקה'], easy: ['קליל', '8 נשימות בדקה'] };
const R = 47, LEN = +(2 * Math.PI * R).toFixed(2); // progress ring around the pond

export function breathBody(F, sndBtn) {
  const B = F.breath, run = B.run, solo = F.mode === 'breathe';
  const intro = run ? '' : `<p class="hint">שאיפה באף, עוד שאיפה קצרה שממלאת את הריאות, ואז נשיפה ארוכה ואיטית בפה. הנשיפה הארוכה היא העיקר.</p>`;
  const pond = `<div class="breath${run ? ' run' : ''}">
    <div class="pond" id="pond" aria-hidden="true">
      <svg class="bprog" viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}"/><circle id="bprog" class="v" cx="50" cy="50" r="${R}" style="stroke-dasharray:${LEN};stroke-dashoffset:${LEN}"/></svg>
      <div class="guide"></div><div class="orb${run ? '' : ' idle'}" id="orb"></div>
    </div>
    <div class="cue" id="cue" aria-live="polite">${run ? '' : 'מתחילים?'}</div>
    <div class="bsub" id="bsub"></div>
    <div class="bleft" id="bleft">${run ? '' : B.min + ':00'}</div>
  </div>`;
  const setup = run ? '' : `
    <div class="bset">
      <div class="choices center" role="group" aria-label="משך">${[1, 2, 3, 5].map(m => `<button class="btn ${B.min === m ? 'on' : ''}" data-f="bmin" data-v="${m}" aria-pressed="${B.min === m}">${m} דק'</button>`).join('')}</div>
      <div class="choices center" role="group" aria-label="קצב">${Object.keys(E.PACES).map(p => `<button class="btn ${B.pace === p || (!B.pace && p === 'calm') ? 'on' : ''}" data-f="bpace" data-v="${p}" aria-pressed="${B.pace === p}">${PACE_LABEL[p][0]} <small>${PACE_LABEL[p][1]}</small></button>`).join('')}</div>
    </div>`;
  const why = run ? '' : `<details class="bwhy"><summary>למה דווקא ככה?</summary>
    <p>זו "נשיפה מחזורית" (cyclic sighing). בניסוי של אוניברסיטת סטנפורד (Balban ועמיתים, 2023), 5 דקות ביום במשך חודש שיפרו את מצב הרוח יותר מאשר מדיטציית מיינדפולנס, והורידו את קצב הנשימה במנוחה. הנשיפה הארוכה מאטה את הגוף. המחקר קטן (כ-100 משתתפים), אז זה כלי עדין להירגע לפני למידה, לא טיפול.</p>
    <p>אם יש סחרחורת או חוסר נוחות, פשוט לחזור לנשימה רגילה. זה תמיד בסדר.</p></details>`;
  const foot = run
    ? `<button class="btn" data-f="next">${solo ? 'סיום' : 'דילוג'}</button>`
    : `<button class="btn primary" data-f="bstart">התחלה</button>${solo ? '' : '<button class="btn" data-f="next">דילוג</button>'}`;
  return `<h2>נשימה</h2>${intro}${pond}${setup}<div class="center bsnd">${sndBtn(B.sound)}${B.sound ? volumeRow() : ''}</div>${why}<div class="foot">${foot}</div>`;
}

// Live updates, called on every focus tick. Holds the last phase drawn and a screen wake lock.
export function createBreathLive(Pad) {
  let last = null, lock = null, want = false;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function grab() {
    if (lock || !want || document.hidden || !('wakeLock' in navigator)) return;
    try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); if (!want) release(); } catch (e) { lock = null; }
  }
  function release() { want = false; if (lock) { try { lock.release(); } catch (e) { /* ignore */ } lock = null; } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) grab(); });

  function tick(F, now) {
    if (!F || F.state !== 'breathe' || !F.breath.run || F.min) { if (want) release(); return; }
    want = true; grab();
    const c = E.breathCue(F, now); if (!c) return;
    const orb = $('#orb'), cue = $('#cue'), sub = $('#bsub'), left = $('#bleft'), pond = $('#pond'), prog = $('#bprog');
    if (left) left.textContent = clockTxt(c.left);
    const B = F.breath, total = Math.max(1, B.end - B.start + E.BREATH_LEAD);
    if (prog) prog.style.strokeDashoffset = (LEN * (c.left / total)).toFixed(2);
    const rm = reduce(), remain = c.ms - c.into;
    if (rm && sub && (c.kind === 'in' || c.kind === 'out')) sub.textContent = CUE[c.kind][1] + ' · ' + Math.ceil(remain / 1000);
    if (c.cycle === last) return;
    last = c.cycle;
    if (B.sound && !Pad.on) Pad.start();
    if (c.kind !== 'lead' && c.kind !== 'settle') Pad.phase(c.kind, remain);
    if (c.kind === 'rest') return; // a quiet beat after the exhale: nothing moves, the text stays
    const [t1, t2] = c.kind === 'settle' ? [CUE.settle[0], F.mode === 'breathe' ? 'עוד רגע מסיימים' : 'עוד רגע ממשיכים'] : CUE[c.kind];
    if (cue) cue.textContent = t1;
    if (sub && !(rm && (c.kind === 'in' || c.kind === 'out'))) sub.textContent = t2;
    if (orb) {
      orb.classList.remove('idle');
      const sc = SCALE[c.kind] ?? SCALE.out;
      if (!rm) { orb.style.transitionDuration = Math.max(200, remain) + 'ms'; orb.style.transitionTimingFunction = EASE[c.kind]; }
      orb.style.transform = `scale(${sc})`;
      orb.classList.toggle('full', c.kind === 'in' || c.kind === 'top');
    }
    if (c.kind === 'out' && pond && !rm) { const r = document.createElement('i'); r.className = 'ring go'; pond.appendChild(r); setTimeout(() => r.remove(), 6500); }
  }
  return { tick, reset() { last = null; }, release };
}
