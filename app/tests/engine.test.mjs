// Pure tests for the focus engine and study rules (node, no browser).
import * as E from '../focus/engine.js';
import * as M from '../core/model.js';
import { pendingMigrations, MIGRATIONS, COLS, SCHEMA_VERSION } from '../core/store.js';
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const MIN = 60000, t0 = Date.UTC(2026, 10, 26, 8, 0);
// full block, 45 min total in 25/5 → focus 25, break 5, focus 20, recall
let s = E.create({ mode: 'block', task: { id: 't1', minutes: 45 }, now: t0, pattern: '25/5' });
ok(s.state === 'zone', 'starts in zone');
s = E.dispatch(s, 'next', null, t0); ok(s.state === 'breathe', 'zone→breathe');
s = E.dispatch(s, 'bstart', null, t0); s = E.tick(s, t0 + 3 * MIN).state; ok(s.state === 'music' && s.breath.done, 'breath ends → music');
s = E.dispatch(s, 'tstart', null, t0 + 3 * MIN); ok(s.state === 'focus' && s.timer.run, 'music→focus running');
const tf = t0 + 3 * MIN;
let r = E.tick(s, tf + 25 * MIN + 1000); ok(r.state.state === 'break' && r.events.includes('beep'), 'focus→break at 25');
ok(Math.abs(E.remaining(r.state, tf + 25 * MIN + 1000) - (5 * MIN - 1000)) < 5, 'break remaining measured from segment end, not now');
// reload far later: fast-forward through break and last focus into recall
r = E.tick(s, tf + 60 * MIN); ok(r.state.state === 'recall' && r.state.timer.focusMs === 45 * MIN, 'fast-forward to recall with 45 focus min');
// break → recall by stopping during the break: no extra focus counted
let b = E.tick(s, tf + 26 * MIN).state; b = E.dispatch(b, 'stop', null, tf + 27 * MIN); ok(b.state === 'recall' && b.timer.focusMs === 25 * MIN, 'stop in break → recall, focus 25');
// stop mid-focus counts partial time
let p = E.dispatch(s, 'stop', null, tf + 10 * MIN); ok(p.timer.focusMs === 10 * MIN, 'partial focus counted');
// pause holds time
let q = E.dispatch(s, 'pause', null, tf + 5 * MIN); q = E.tick(q, tf + 50 * MIN).state; ok(q.state === 'focus' && E.remaining(q, tf + 50 * MIN) === 20 * MIN, 'paused does not advance');
q = E.dispatch(q, 'pause', null, tf + 50 * MIN); ok(E.remaining(q, tf + 51 * MIN) === 19 * MIN, 'resume continues');
// breathe-only ends in done; class mode path
let br = E.create({ mode: 'breathe', now: t0 }); br = E.dispatch(br, 'bstart', null, t0); ok(E.tick(br, t0 + 6 * MIN).state.state === 'done', 'breathe mode → done');
let cl = E.create({ mode: 'class', now: t0 }); cl = E.dispatch(E.dispatch(cl, 'next', null, t0), 'next', null, t0); ok(cl.state === 'ready', 'class → ready');
ok(E.breathCue(E.dispatch(E.create({ mode: 'breathe', now: t0 }), 'bstart', null, t0), t0 + 4000 + 2600).kind === 'top', 'breath cue sequence (after the 4 s lead)');
// persistence round trip
const mem = new Map(), ls = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v), del: k => mem.delete(k) };
const saved = E.save(ls, s); ok(saved.rev === s.rev + 1 && E.load(ls, tf).id === s.id, 'save/load');
ok(E.load(ls, t0 + 13 * 3600000) === null, 'stale block dropped after 12h');
const log = E.sessionLog(r.state, tf + 60 * MIN); ok(log.focusMin === 45 && log.kind === 'block' && log.breath === true, 'session log');
// model
ok(M.norm('practiced') === 'solo' && M.nextStep('exam') === 'not_started', 'ladder');
const rv = M.review({ box: 2 }, 'right', '2026-11-26'); ok(rv.box === 3 && rv.due === '2026-12-03', 'leitner right 2→3 +7');
ok(M.review({ box: 4 }, 'right', '2026-11-26').due === '2026-12-10', 'leitner box 4 +14');
ok(M.review({ box: 3 }, 'wrong', '2026-11-26').box === 1 && M.review({ box: 3 }, 'wrong', '2026-11-26').due === '2026-11-27', 'leitner wrong');
const ms = M.mockStats([{ courseId: 'a', score: 90, date: '2026-11-20' }, { courseId: 'a', score: 86, date: '2026-11-25' }, { courseId: 'a', score: 40, date: '2026-11-01' }], 'a');
ok(ms.avg === 88 && ms.ready, 'mocks last two');
ok(M.sessionsToPrune([{ id: 'x', startedAt: '2026-01-01T00:00Z' }, { id: 'y', startedAt: '2026-11-01T00:00Z' }], '2026-11-26').join() === 'x', 'prune 180d');
const sg = M.suggest({ settings: [], courses: [{ id: 'a', name: 'A', order: 1 }], units: [{ id: 'u', courseId: 'a', missed: true, status: 'not_started' }], deadlines: [{ id: 'd', courseId: 'a', title: 'hw', status: 'open', due: '2026-11-28T23:59' }], mocks: [{ courseId: 'a', score: 60, date: '2026-11-20' }], practice_items: [{ id: 'p', courseId: 'a', due: '2026-11-25' }] }, '2026-11-26');
ok(sg.map(x => x.kind).join() === 'deadline,gap,weak,review', 'priority order deadline>gap>weak>review');
// migration is idempotent
const db = { courses: [{ id: 'a' }, { id: 'b', aiSolve: 'allowed' }], deadlines: [{ id: 'd', kind: 'admin' }], settings: [{ id: 'main' }], meta: [] };
const w = MIGRATIONS[0].plan(db); ok(w.length === 3, 'migration plans 3 writes');
w.forEach(([path, d]) => { const [c, id] = path.split('/'); Object.assign(db[c].find(x => x.id === id), d); });
ok(MIGRATIONS[0].plan(db).length === 0 && pendingMigrations(2).length === 0, 'migration idempotent');
// learning additions (0.4.0) are additive: loaded and exported, no new migration
ok(['profile', 'profile_events', 'summaries'].every(c => COLS.includes(c)) && SCHEMA_VERSION === 2 && pendingMigrations(2).length === 0, 'profile, profile_events, summaries are loaded and exported without a migration');
// ---- timer edge cases (focus thread) ----
{
  const tA = t0 + 100 * MIN;
  let x = E.create({ mode: 'block', task: { id: 't9', minutes: 45 }, now: tA, pattern: '25/5' });
  x = { ...x, state: 'focus' };
  ok(E.plan(x.timer).map(g => g.kind[0] + g.ms / MIN).join() === 'f25,b5,f20', 'plan 45 in 25/5 = f25,b5,f20');
  ok(E.plan({ ...x.timer, total: 50 * MIN, work: 25 * MIN }).map(g => g.kind[0]).join('') === 'fbf', 'plan never ends on a break');
  let y = E.dispatch(x, 'total', 90, tA); ok(y.timer.total === 90 * MIN && y.timer.left === 90 * MIN, 'total before start');
  ok(E.dispatch(y, 'total', 5, tA).timer.total === 90 * MIN, 'total below 10 rejected');
  y = E.dispatch(x, 'tstart', null, tA);
  ok(E.dispatch(y, 'total', 90, tA).timer.total === 45 * MIN, 'total locked while running');
  ok(E.planPos(y).i === 0 && E.planPos(y).round === 1 && E.planPos(y).rounds === 2, 'planPos at start');
  let c = E.nextCue(y); ok(c && c.kind === 'focus-end' && c.at === tA + 25 * MIN, 'nextCue focus-end');
  let yb = E.tick(y, tA + 25 * MIN + 10).state; ok(E.planPos(yb).i === 1 && E.nextCue(yb).kind === 'break-end', 'planPos/nextCue in break');
  let yl = E.tick(y, tA + 31 * MIN).state; ok(E.planPos(yl).i === 2 && E.planPos(yl).round === 2 && E.nextCue(yl).kind === 'block-end', 'last segment → block-end cue');
  // two tabs press pause at the same moment: explicit 'on' twice stays paused (toggle would resume)
  let pp = E.dispatch(E.dispatch(y, 'pause', 'on', tA + MIN), 'pause', 'on', tA + MIN + 50); ok(pp.timer.paused, 'double pause stays paused');
  ok(E.nextCue(pp) === null, 'no cue while paused');
  let pr = E.dispatch(E.dispatch(pp, 'pause', 'off', tA + 2 * MIN), 'pause', 'off', tA + 2 * MIN + 50); ok(!pr.timer.paused && E.remaining(pr, tA + 2 * MIN) === 24 * MIN, 'double resume once, time kept');
  // pause in break and resume later
  let bp = E.dispatch(yb, 'pause', 'on', tA + 27 * MIN); bp = E.tick(bp, tA + 90 * MIN).state; ok(bp.state === 'break' && E.remaining(bp, tA + 90 * MIN) === 3 * MIN, 'paused break holds');
  // skip break
  let sk = E.dispatch(yb, 'skipbreak', null, tA + 27 * MIN); ok(sk.state === 'focus' && sk.timer.segEnd === tA + 47 * MIN, 'skip break → last focus 20 min from now');
  ok(E.tick(sk, tA + 47 * MIN).state.state === 'recall' && E.tick(sk, tA + 47 * MIN).state.timer.focusMs === 45 * MIN, 'after skip, block ends with 45 focus');
  ok(E.dispatch(y, 'skipbreak', null, tA).timer.segEnd === y.timer.segEnd, 'skipbreak ignored in focus');
  // wall clock moved back: never more than the segment
  ok(E.remaining(y, tA - 10 * MIN) === 25 * MIN, 'clock moved back clamps to segment');
  // paused then stop: counts only time actually focused
  let ps = E.dispatch(E.dispatch(y, 'pause', 'on', tA + 10 * MIN), 'stop', null, tA + 40 * MIN); ok(ps.timer.focusMs === 10 * MIN && ps.state === 'recall', 'stop while paused counts 10 min');
  // sleep across several phases: one tick lands in recall, with exactly one transition chain
  let sl = E.tick(y, tA + 8 * 60 * MIN); ok(sl.state.state === 'recall' && sl.events.filter(e => e === 'beep').length === 3, 'long sleep fast-forwards 3 transitions');
  // 50-minute block in 50/10: one round, no break
  let one = E.dispatch(E.dispatch({ ...E.create({ mode: 'block', task: { id: 'o', minutes: 50 }, now: tA, pattern: '50/10' }), state: 'focus' }, 'tstart', null, tA), 'next', null, tA);
  ok(one.state === 'recall', 'next during focus = stop');
  // save: rev climbs above what another tab stored, and a new block id starts fresh
  const m2 = new Map(), l2 = { get: k => m2.get(k) ?? null, set: (k, v) => m2.set(k, v), del: k => m2.delete(k) };
  const a1 = E.save(l2, y); const b1 = E.save(l2, { ...y, rev: 0 }); ok(b1.rev === a1.rev + 1, 'save rev above stored');
  const n1 = E.save(l2, { ...y, id: 'other', rev: 0 }); ok(n1.rev === 1, 'new block id starts at rev 1');
}
console.log(`${n - bad}/${n} passed`); process.exit(bad ? 1 : 0);
