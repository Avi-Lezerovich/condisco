// Small shared helpers: escaping, dates, and the app clock (real or fake for ?mock=1).

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const z = n => String(n).padStart(2, '0');
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

// ---- clock: everything time-based reads clock.now(), never Date.now() directly ----
export function makeClock({ start = null, speed = 1 } = {}) {
  const real0 = Date.now();
  const base = start ? new Date(start).getTime() : real0;
  let offset = 0;
  return {
    fake: !!start || speed !== 1,
    now: () => base + (Date.now() - real0) * speed + offset,
    date() { return new Date(this.now()); },
    advance(ms) { offset += ms; },          // tests jump forward
  };
}
export let clock = makeClock();
export const setClock = c => { clock = c; };

// ---- dates (local time, YYYY-MM-DD strings) ----
export const ymd = d => d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
export const parse = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const todayStr = () => ymd(clock.date());
export const nowMin = () => { const d = clock.date(); return d.getHours() * 60 + d.getMinutes(); };
export const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
export const dayDiff = (iso, today = todayStr()) => Math.round((parse(iso) - parse(today)) / 864e5);
export const DOW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const dm = s => { const d = parse(s); return d.getDate() + '.' + (d.getMonth() + 1); };
export const dur = m => m >= 60 ? Math.floor(m / 60) + ':' + z(m % 60) + " ש'" : m + " דק'";
export const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return z(Math.floor(s / 60)) + ':' + z(s % 60); };

// course colour as a CSS custom property; falls back to the --course-N palette by order
export const HEX = /^#[0-9a-f]{3,8}$/i;
export function cvar(c) {
  if (c && HEX.test(c.color || '')) return `--c-raw:${c.color}`;
  const n = c && Number.isFinite(+c.order) ? ((+c.order - 1) % 8 + 8) % 8 + 1 : 8;
  return `--c-raw:var(--course-${n})`;
}

export const CHECK = '<svg viewBox="0 0 12 12" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.5l2.2 2.2L9.5 3.8"/></svg>';

export const safeLS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

let toastT;
export function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800);
}

// small landscape mark for empty states: sun over two waves, drawn from theme tokens
export const EMPTY_ART = '<svg class="art" viewBox="0 0 84 56" aria-hidden="true"><path d="M29 35a13 13 0 0 1 26 0z" fill="var(--win)"/><path d="M6 36q9-6 18 0t18 0 18 0 18 0" fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round"/><path d="M14 46q7-4.5 14 0t14 0 14 0 14 0" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" opacity=".5"/></svg>';
export const empty = (text, title = '') => `<div class="empty">${EMPTY_ART}${title ? `<h3 class="sec" style="margin:0">${esc(title)}</h3>` : ''}<p>${esc(text)}</p></div>`;
