// Sound controls shared by the focus overlay: the in-app sound picker (music step) and a volume slider.
// Owned by the sound thread. Everything is bound once on the overlay root through data-snd attributes,
// so focus/ui.js only has to drop the HTML in and call bindSound(root) once.
import { Music, MUSIC_KINDS, Volume, ensureAudio, audioReady, isIOS, loadLibrary, library, kindAvailable } from './sound.js';
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BARS = '<i class="sp-eq" aria-hidden="true"><b></b><b></b><b></b></i>';
const SPK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>';
const OPTS = () => [{ id: '', he: 'שקט', note: 'הכי טוב לקריאה ולהוכחות' }, ...MUSIC_KINDS.filter(k => kindAvailable(k.id))];

// the picker: silence or one of the in-app soundscapes. Tapping one plays it right away (the tap unlocks audio).
export function soundPicker() {
  const cur = Music.chosen;
  const credits = library().credits;
  return `<div class="spw"><div class="sp" role="radiogroup" aria-label="צליל לזמן הפוקוס">${OPTS().map(o =>
    `<button type="button" class="sp-o${o.id ? '' : ' sp-quiet'}" role="radio" data-snd="pick" data-v="${o.id}" aria-checked="${cur === o.id}"><span><b>${o.he}</b><small>${o.note}</small></span>${o.id ? BARS : ''}</button>`).join('')}
    </div><div class="sp-foot">${volumeRow()}<span class="sp-now" aria-live="polite">${status()}</span></div>
    ${isIOS() ? '<p class="sp-tip">באייפון: אם לא שומעים, כדאי להגביר את העוצמה בכפתורים שבצד הטלפון.</p>' : ''}
    ${credits.length ? `<details class="sp-cred"><summary>מקורות ההקלטות</summary><ul>${credits.map(c => `<li>${/^https:\/\//.test(c.url || '') ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a>` : esc(c.name)}${c.by ? ', ' + esc(c.by) : ''}, ${esc(c.license)}</li>`).join('')}</ul></details>` : ''}</div>`;
}
export function volumeRow() {
  return `<label class="svol">${SPK}<span class="sr-only">עוצמה</span><input type="range" min="0" max="100" step="1" value="${Math.round(Volume.get() * 100)}" data-snd="vol" aria-label="עוצמת הצליל"></label>`;
}

let blocked = false;
function status() {
  const cur = Music.chosen, playing = Music.on && !Music.ducked;
  if (playing && blocked && !audioReady()) return 'הדפדפן עדיין חוסם צליל. נגיעה נוספת באחת האפשרויות תפעיל אותו';
  if (playing) { const t = Music.track; return t ? `מתנגן: ${t.he}${t.by ? ' (' + t.by + ')' : ''}` : 'מתנגן עכשיו, וימשיך בזמן הפוקוס'; }
  return cur ? 'יתנגן כשהטיימר יתחיל' : '';
}
function refresh(root) {
  const cur = Music.chosen, playing = Music.on && !Music.ducked;
  root.querySelectorAll('[data-snd=pick]').forEach(b => { b.setAttribute('aria-checked', String(b.dataset.v === cur)); b.classList.toggle('playing', playing && b.dataset.v === Music.kind); });
  const now = root.querySelector('.sp-now'), txt = status(); if (now && now.textContent !== txt) now.textContent = txt;
}

let bound = new WeakSet();
export function bindSound(root) {
  if (!root || bound.has(root)) return; bound.add(root);
  // once the recordings' manifest is known, redraw an open picker (adds the classical choice and the credits)
  loadLibrary().then(() => { const w = root.querySelector('.spw'); if (w) w.outerHTML = soundPicker(); });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-snd=pick]'); if (!b) return;
    ensureAudio(); const v = b.dataset.v || '';
    Music.choose(v); if (v) Music.start(v); else Music.stop();
    blocked = false; refresh(root);
    setTimeout(() => { blocked = !!v && !audioReady(); refresh(root); }, 1200);
  });
  root.addEventListener('input', e => {
    const r = e.target.closest('[data-snd=vol]'); if (!r) return;
    Volume.set(r.value / 100);
    root.querySelectorAll('[data-snd=vol]').forEach(x => { if (x !== r) x.value = r.value; });
  });
  // the overlay re-renders often; keep the "playing" marks right after each paint
  new MutationObserver(() => { if (root.querySelector('[data-snd=pick]')) refresh(root); }).observe(root, { childList: true });
  setInterval(() => { if (root.querySelector('[data-snd=pick]')) refresh(root); }, 2000); // the playing piece changes over time
}
