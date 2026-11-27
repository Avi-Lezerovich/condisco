// The only module that touches claude.use("db").
// - db null → read-only notice (signed out, or the view cannot run storage)
// - 10-s load timeout → "still loading" note, never a reload
// - one write per doc at a time (a queue per path)
// - meta/schema.version + ordered, idempotent migrations (add fields, never delete user data)
import { todayStr, clock } from './util.js';
import { sessionsToPrune } from './model.js';

export const APP_VERSION = '0.1.0';
export const SCHEMA_VERSION = 2;
export const COLS = ['settings', 'courses', 'units', 'tasks', 'deadlines', 'checkins', 'habits', 'habitlog', 'sessions', 'mocks', 'practice_items', 'errors', 'meta', 'feedback', 'profile', 'profile_events', 'summaries'];

// Ordered migrations. Each `run` only writes what is missing, so running it twice changes nothing.
// A db without meta/schema is version 1 (Study Hub layout).
export const MIGRATIONS = [
  {
    to: 2,
    name: 'condisco v2: aiSolve on courses, graded on deadlines, onboarded flag',
    plan(s) {
      const w = [];
      s.courses.forEach(c => { if (c.aiSolve !== 'forbidden' && c.aiSolve !== 'allowed') w.push(['courses/' + c.id, { aiSolve: 'forbidden', aiSolveVerified: false }]); });
      s.deadlines.forEach(d => { if (typeof d.graded !== 'boolean') w.push(['deadlines/' + d.id, { graded: d.kind !== 'admin' }]); });
      const main = s.settings.find(x => x.id === 'main');
      if (main && main.onboarded == null && s.courses.length) w.push(['settings/main', { onboarded: true }]);
      return w;
    },
  },
];

export function pendingMigrations(version) { return MIGRATIONS.filter(m => m.to > version).sort((a, b) => a.to - b.to); }
export function schemaVersion(s) { const m = s.meta.find(x => x.id === 'schema'); return m && Number.isFinite(+m.version) ? +m.version : 1; }

export function createStore({ use, onChange = () => {}, onNote = () => {} }) {
  const S = Object.fromEntries(COLS.map(c => [c, []]));
  const fresh = new Set();
  const status = { db: null, phase: 'loading', err: '', slow: false, owner: true, migrated: false };
  const queues = new Map();
  let slowT = 0;

  const emit = () => onChange(S, status);

  async function start() {
    let db = null;
    try { db = use ? await use('db') : null; } catch (e) { db = null; }
    if (!db) { status.phase = 'nodb'; emit(); return; }
    status.db = db;
    try { const user = await use('user'); if (user) status.owner = (await user.isOwner()) ?? true; } catch (e) { /* keep default */ }
    slowT = setTimeout(() => { if (fresh.size < COLS.length) { status.slow = true; onNote('slow'); emit(); } }, 10000);
    for (const col of COLS) {
      db.collection(col).onSnapshot(snap => {
        S[col] = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        if (!snap.metadata || !snap.metadata.fromCache) fresh.add(col);
        if (fresh.size === COLS.length && status.phase === 'loading') {
          clearTimeout(slowT); status.slow = false; status.phase = 'ready'; onNote('');
          maintain();
        }
        emit();
      }, err => { clearTimeout(slowT); status.phase = 'error'; status.err = (err && err.code) || 'unknown'; emit(); });
    }
  }

  // one write at a time per document path
  function enqueue(path, fn) {
    const prev = queues.get(path) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    queues.set(path, next);
    next.finally(() => { if (queues.get(path) === next) queues.delete(path); });
    return next;
  }

  async function write(path, data, op = 'update') {
    if (!status.db) return { ok: false, code: 'nodb' };
    return enqueue(path, async () => {
      try { await status.db.doc(path)[op](data); return { ok: true }; }
      catch (e) { return { ok: false, code: (e && e.code) || 'unknown' }; }
    });
  }
  async function add(col, data) {
    if (!status.db) return { ok: false, code: 'nodb' };
    try { const ref = await status.db.collection(col).add(data); return { ok: true, id: ref.id }; }
    catch (e) { return { ok: false, code: (e && e.code) || 'unknown' }; }
  }
  const remove = path => write(path, undefined, 'delete');

  // runs once after the first full load: migrations, then housekeeping
  async function maintain() {
    if (!status.owner || status.migrated) return;
    status.migrated = true;
    const empty = !S.courses.length && !S.tasks.length && !S.settings.length;
    if (empty) return; // first-run screen writes meta/schema itself
    const v = schemaVersion(S);
    const todo = pendingMigrations(v);
    for (const m of todo) {
      for (const [path, data] of m.plan(S)) await write(path, data);
    }
    if (todo.length || v < SCHEMA_VERSION) {
      await write('meta/schema', { version: SCHEMA_VERSION, migratedAt: new Date(clock.now()).toISOString(), app: 'condisco', appVersion: APP_VERSION }, 'set');
    }
    for (const id of sessionsToPrune(S.sessions, todayStr())) await remove('sessions/' + id);
  }

  function snapshot() {
    const out = { exportedAt: new Date(clock.now()).toISOString(), app: 'condisco', appVersion: APP_VERSION, schema: schemaVersion(S), collections: {} };
    for (const c of COLS) out.collections[c] = S[c].map(d => ({ ...d }));
    return out;
  }

  return {
    S, status, start, write, add, remove, snapshot,
    isEmpty: () => status.phase === 'ready' && !S.courses.length && !S.tasks.length && !S.settings.length,
    settings: () => S.settings.find(x => x.id === 'main') || {},
  };
}
