// Focus block as an explicit state machine, pure and persisted.
//   idle → zone → breathe → music → focus ⇄ break → recall → done
// "class" mode: zone → breathe → ready → done.   "breathe": breathe → done.   "music": music → done.
// All times are absolute (ms since epoch), so a reload, a background tab or a second tab can recompute
// where the block is: tick(state, now) fast-forwards through every phase that ended meanwhile.

export const FLOWS = {
  block: ['zone', 'breathe', 'music', 'focus', 'recall'],
  class: ['zone', 'breathe', 'ready'],
  breathe: ['breathe'],
  music: ['music'],
};
export const PATTERNS = { '25/5': [25, 5], '45/10': [45, 10], '50/10': [50, 10] };
// Cyclic sighing (Balban et al. 2023, Cell Rep Med): nose inhale, short top-up inhale, long slow mouth exhale.
// The study was self-paced; these timings are our design: exhale about twice the inhales, plus a short rest.
export const PACES = {
  calm: [['in', 2500], ['top', 900], ['out', 6000], ['rest', 600]], // 10 s, 6 breaths a minute
  easy: [['in', 2000], ['top', 700], ['out', 4300], ['rest', 500]], // 7.5 s, 8 a minute, for smaller lungs or a cold
};
export const BREATH_SEQ = PACES.calm;
export const BREATH_LEAD = 4000, BREATH_SETTLE = 5000; // settle in before the first breath; breathe normally after the last
const cycleMs = seq => seq.reduce((a, [, ms]) => a + ms, 0);
// whole breaths that fit in the chosen minutes, so the session never stops mid-breath and ends exactly on time
export function breathPlan(B) {
  const seq = PACES[B.pace] || PACES.calm, C = cycleMs(seq);
  return { seq, C, n: Math.max(1, Math.floor((B.min * MIN - BREATH_LEAD - BREATH_SETTLE) / C)) };
}
const MIN = 60000;

const clone = s => JSON.parse(JSON.stringify(s));

export function create({ mode = 'block', task = null, now, sound = true, pattern = '45/10', pace = 'calm' }) {
  const steps = FLOWS[mode] || FLOWS.block;
  const total = Math.max(10, +(task && task.minutes) || 45) * MIN;
  const [w, b] = PATTERNS[pattern] || PATTERNS['45/10'];
  return {
    v: 1, rev: 0, id: 's' + now, mode, steps, state: steps[0],
    taskId: task ? task.id : null, courseId: task ? task.courseId || null : null,
    startedAt: now, checks: {}, goal: '', min: false,
    breath: { min: mode === 'class' ? 2 : mode === 'block' ? 3 : 5, start: 0, end: 0, run: false, done: false, sound, pace: PACES[pace] ? pace : 'calm' },
    timer: { pat: pattern, work: w * MIN, brk: b * MIN, total, left: total, phase: 'focus', segEnd: 0, paused: false, remain: 0, focusMs: 0, run: false },
    recall: null, mark: null,
  };
}

const nextStateName = s => { const i = s.steps.indexOf(s.state); return i >= 0 && i + 1 < s.steps.length ? s.steps[i + 1] : 'done'; };
const seg = T => Math.min(T.work, T.left);

// Advance through everything that has ended by `now`. Returns {state, events} — events are cues for the UI (beep, phase).
export function tick(s0, now) {
  if (!s0 || s0.state === 'done') return { state: s0, events: [] };
  const s = clone(s0), ev = [];
  if (s.state === 'breathe' && s.breath.run && now >= s.breath.end) {
    s.breath.run = false; s.breath.done = true; ev.push('breath-end');
    s.state = nextStateName(s);
  }
  const T = s.timer;
  if (s.state === 'focus' || s.state === 'break') {
    let guard = 0;
    while (T.run && !T.paused && now >= T.segEnd && guard++ < 500) {
      ev.push('beep');
      if (T.phase === 'focus') {
        const g = seg(T); T.left -= g; T.focusMs += g;
        if (T.left <= 0) { T.run = false; s.state = 'recall'; s.min = false; ev.push('focus-end'); break; }
        T.phase = 'break'; s.state = 'break'; T.segEnd += T.brk; ev.push('break');
      } else {
        T.phase = 'focus'; s.state = 'focus'; T.segEnd += seg(T); ev.push('focus');
      }
    }
  }
  return { state: s, events: ev };
}

// One user event → next state. Unknown events leave the state unchanged.
export function dispatch(s0, type, arg, now) {
  if (!s0) return s0;
  const s = clone(s0), T = s.timer, B = s.breath;
  switch (type) {
    case 'next': // skip or continue to the next step
      if (s.state === 'breathe') { B.run = false; }
      if (s.state === 'focus' || s.state === 'break') return dispatch(s0, 'stop', null, now);
      s.state = nextStateName(s); break;
    case 'check': s.checks[arg] = !s.checks[arg]; break;
    case 'goal': s.goal = String(arg || '').slice(0, 200); break;
    case 'bmin': if (!B.run) B.min = Math.max(1, Math.min(10, +arg || 3)); break;
    case 'bsound': B.sound = !B.sound; break;
    case 'bpace': if (!B.run && PACES[arg]) B.pace = arg; break;
    case 'bstart': if (s.state === 'breathe' && !B.run) { B.run = true; B.start = now + BREATH_LEAD; B.end = now + B.min * MIN; } break; // start = first inhale
    case 'pat': if (!T.run && PATTERNS[arg]) { T.pat = arg; T.work = PATTERNS[arg][0] * MIN; T.brk = PATTERNS[arg][1] * MIN; } break;
    case 'tstart':
      if (s.state === 'music') s.state = 'focus';
      if (s.state === 'focus' && !T.run) { T.run = true; T.phase = 'focus'; T.segEnd = now + seg(T); T.paused = false; }
      break;
    case 'pause': { // arg 'on' | 'off' | (toggle); explicit values make a double tap from two tabs harmless
      const want = arg === 'on' ? true : arg === 'off' ? false : !T.paused;
      if (T.run && want && !T.paused) { T.remain = Math.max(0, Math.min(T.segEnd - now, T.phase === 'focus' ? seg(T) : T.brk)); T.paused = true; }
      else if (T.run && !want && T.paused) { T.segEnd = now + T.remain; T.paused = false; }
      break;
    }
    case 'skipbreak': // back to focus now; the rest of the break is dropped
      if (T.run && T.phase === 'break') { T.phase = 'focus'; s.state = 'focus'; T.paused = false; T.segEnd = now + seg(T); }
      break;
    case 'total': // total focus minutes, before the timer starts
      if (!T.run) { const m = Math.round(+arg); if (m >= 10 && m <= 240) { T.total = T.left = m * MIN; } }
      break;
    case 'stop': // "סיימתי": count the focus time actually spent in the current segment, go to recall
      if (T.run && T.phase === 'focus') { const rem = T.paused ? T.remain : Math.max(0, T.segEnd - now); T.focusMs += Math.max(0, seg(T) - rem); }
      T.run = false; T.paused = false; s.min = false;
      s.state = s.steps.includes('recall') ? 'recall' : 'done';
      break;
    case 'recall': s.recall = ['yes', 'part', 'no'].includes(arg) ? arg : null; break;
    case 'mark': s.mark = ['done', 'min', 'todo'].includes(arg) ? arg : null; break;
    case 'finish': s.state = 'done'; break;
    case 'minimize': if (T.run) s.min = true; break;
    case 'restore': s.min = false; break;
    default: return s0;
  }
  return s;
}

// what to show right now
export function remaining(s, now) {
  const T = s.timer;
  if (!T.run) return seg(T);
  return Math.max(0, Math.min(segmentLength(s), T.paused ? T.remain : T.segEnd - now));
}
export function segmentLength(s) { const T = s.timer; return T.phase === 'focus' ? seg(T) : T.brk; }
// kind: lead (settling in) | in | top | out | rest | settle (breathe normally). `cycle` is a unique id per phase.
export function breathCue(s, now) {
  const B = s.breath;
  if (!B.run) return null;
  const { seq, C, n } = breathPlan(B), left = Math.max(0, B.end - now), base = { left, of: n, done: 0 };
  if (now < B.start) return { ...base, kind: 'lead', ms: BREATH_LEAD, into: BREATH_LEAD - (B.start - now), cycle: 'lead' };
  const el = now - B.start, k = Math.floor(el / C);
  if (k >= n) return { ...base, done: n, kind: 'settle', ms: Math.max(1, B.end - B.start - n * C), into: el - n * C, cycle: 'settle' };
  let t = el - k * C, i = 0;
  while (t >= seq[i][1]) { t -= seq[i][1]; i++; }
  return { ...base, done: k, kind: seq[i][0], ms: seq[i][1], into: t, cycle: k * seq.length + i };
}
export const isRunning = s => !!s && s.state !== 'done';
export const timerShowing = s => !!s && (s.state === 'focus' || s.state === 'break') && s.timer.run;

// the sessions/{id} document written when a block ends (field names kept from Study Hub)
export function sessionLog(s, now) {
  let focusMs = s.timer.focusMs;
  return {
    kind: s.mode, taskId: s.taskId, courseId: s.courseId,
    startedAt: new Date(s.startedAt).toISOString(), endedAt: new Date(now).toISOString(),
    focusMin: Math.round(focusMs / MIN), breath: !!s.breath.done,
    zone: Object.keys(s.checks).filter(k => s.checks[k]), goal: s.goal || '', recall: s.recall || null,
  };
}

// ---- persistence: localStorage, shared by every tab of this browser ----
export const KEY = 'condisco.focus.v1';
export function save(ls, s) {
  if (!s || s.state === 'done') { ls.del(KEY); return s; }
  let prev = 0; try { const o = JSON.parse(ls.get(KEY) || 'null'); if (o && o.id === s.id) prev = o.rev || 0; } catch (e) { /* ignore */ }
  const out = { ...s, rev: Math.max(prev, s.rev || 0) + 1 };
  ls.set(KEY, JSON.stringify(out));
  return out;
}
export function load(ls, now) {
  const raw = ls.get(KEY); if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (!s || s.v !== 1 || !FLOWS[s.mode]) return null;
    if (now - s.startedAt > 12 * 3600000) { ls.del(KEY); return null; } // a block left open overnight is dropped
    return s;
  } catch (e) { return null; }
}

// ---- timer plan (focus thread) ----
// The block as a list of segments: focus, break, focus, ..., never ending on a break.
export function plan(T) {
  const out = []; let left = T.total;
  while (left > 0 && out.length < 60) { const g = Math.min(T.work, left); out.push({ kind: 'focus', ms: g }); left -= g; if (left > 0) out.push({ kind: 'break', ms: T.brk }); }
  return out;
}
// where the running block is in that plan: index of the current segment, focus rounds done / total
export function planPos(s) {
  const T = s.timer, segs = plan(T), rounds = segs.filter(x => x.kind === 'focus').length;
  let done = T.total - T.left, i = 0, r = 0;
  while (i < segs.length && segs[i].kind === 'focus' && done >= segs[i].ms - 1) { done -= segs[i].ms; r++; i += 2; }
  if (T.run && T.phase === 'break') i = Math.max(1, i - 1);
  return { segs, i: Math.min(i, segs.length - 1), round: Math.min(rounds, r + (T.phase === 'focus' ? 1 : 0)), rounds };
}
// the next transition and when it happens, so a bell can be scheduled ahead (null when nothing is counting down)
export function nextCue(s) {
  if (!timerShowing(s) || s.timer.paused) return null;
  const T = s.timer;
  return { at: T.segEnd, kind: T.phase === 'break' ? 'break-end' : T.left - seg(T) <= 0 ? 'block-end' : 'focus-end' };
}
