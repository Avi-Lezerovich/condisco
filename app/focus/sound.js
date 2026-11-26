// Condisco sound: everything is synthesised in the page with Web Audio (no audio files, nothing fetched).
//   Pad      breath-paced ambient pad for the breathing step (inhale opens and swells, exhale settles, with soft air).
//   Music    focus sound for timer blocks, all without lyrics: recorded classical piano (Bach, Satie, Debussy),
//            recorded rain / stream / sea, and generated soft piano, warm pad and brown noise.
//            Recordings load lazily from audio/ (see audio/manifest.json and audio/LICENSES.md); if a file is missing, a generated twin plays.
//   Chime    soft bells for phase changes; Chime.at() schedules one on the audio clock (exact even in a background tab).
//   Volume   one master volume, saved on this device.
//   timerCue one entry point the timer calls for every timer event.
// iPhone: the ringer switch mutes Web Audio unless the page asks for a 'playback' audio session; we ask on every tap.
// Rules kept everywhere: every level change is a smooth ramp (no clicks or pops), nothing plays before a tap
// (browser autoplay rule), the master bus has a soft limiter so phone speakers never clip, and any failure is silent.

const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: fine */ } },
};

let audio = null, bus = null, vol = null, verb = null, unlocked = false;
const NOISE = {};

// ---------- context, unlock, master bus ----------
export function ensureAudio() {
  try {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC({ latencyHint: 'playback' });
      buildBus();
      audio.onstatechange = () => { if (audio.state !== 'running' && !document.hidden) tryResume(); };
    }
    setSession('playback');
    tryResume();
    if (!unlocked) { // iOS needs a sound started inside a tap; a one-sample silent buffer does it
      const b = audio.createBuffer(1, 1, audio.sampleRate), s = audio.createBufferSource();
      s.buffer = b; s.connect(audio.destination); s.start(0); unlocked = true;
      iosUnmute();
    }
  } catch (e) { audio = null; }
  return audio;
}
export const unlockAudio = ensureAudio;
export function audioReady() { return !!audio && audio.state === 'running'; }
function tryResume() { try { if (audio && audio.state !== 'running' && audio.state !== 'closed') audio.resume().catch(() => {}); } catch (e) { /* ignore */ } }
// iOS before 16.4 has no navigator.audioSession: playing a silent <audio> element moves the page to the
// 'playback' category, so the ringer switch no longer mutes the Web Audio output.
function iosUnmute() {
  try {
    if (navigator.audioSession || !/iP(hone|ad|od)|Macintosh.+Mobile/.test(navigator.userAgent) || !('ontouchend' in document)) return;
    const n = 4410, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    const el = document.createElement('audio'); el.setAttribute('x-webkit-airplay', 'deny'); el.loop = true; el.preload = 'auto';
    el.src = URL.createObjectURL(new Blob([b], { type: 'audio/wav' })); el.play().catch(() => {});
  } catch (e) { /* ignore */ }
}
export const isIOS = () => { try { return /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document); } catch (e) { return false; } };
function setSession(type) { try { if (navigator.audioSession) navigator.audioSession.type = type; } catch (e) { /* Safari only */ } }

function buildBus() {
  const ctx = audio, t = ctx.currentTime;
  vol = ctx.createGain(); vol.gain.setValueAtTime(curve(Volume.get()), t);
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -16; lim.knee.value = 14; lim.ratio.value = 5; lim.attack.value = .008; lim.release.value = .35;
  const out = ctx.createGain(); out.gain.value = .9;
  vol.connect(lim); lim.connect(out); out.connect(ctx.destination);
  bus = vol;
  verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 3.8, 2.6); verb.connect(bus);
}
// stereo reverb tail: decaying, slowly darkening noise
function impulse(ctx, sec, decay) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n, k = .25 + .7 * (1 - x);           // the tail gets darker as it fades
      lp += k * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - x, decay) * (i < 64 ? i / 64 : 1);
    }
  }
  return b;
}
// seamless looping noise (the end crossfades into the start, so the loop point never clicks)
function noise(ctx, kind) {
  if (NOISE[kind] && NOISE[kind].sampleRate === ctx.sampleRate) return NOISE[kind];
  const sr = ctx.sampleRate, n = sr * 8, m = Math.floor(sr * .5), b = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const raw = new Float32Array(n + m); let l = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n + m; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { l = (l + .02 * w) / 1.02; raw[i] = l * 3.3; }
      else { // pink (Paul Kellet)
        b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
        b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
        raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926;
      }
    }
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = i < m ? raw[i] * Math.sqrt(i / m) + raw[n + i] * Math.sqrt(1 - i / m) : raw[i];
  }
  return (NOISE[kind] = b);
}
function noiseSrc(ctx, kind) { const s = ctx.createBufferSource(); s.buffer = noise(ctx, kind); s.loop = true; s.loopStart = 0; s.loopEnd = s.buffer.duration; return s; }

// smooth parameter moves: hold where the value is now, then glide (exponential approach, never a jump)
function hold(p, t) {
  if (p.cancelAndHoldAtTime) { try { p.cancelAndHoldAtTime(t); return; } catch (e) { /* fall through */ } }
  const v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t);
}
function glide(p, v, t, tc) { hold(p, t); p.setTargetAtTime(v, t, Math.max(.01, tc)); }
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const panner = (ctx, v) => { if (!ctx.createStereoPanner) return ctx.createGain(); const p = ctx.createStereoPanner(); p.pan.value = v; return p; };
function stopAll(nodes, at) { nodes.forEach(x => { try { x.stop(at); } catch (e) { /* ignore */ } }); }
function later(fn, ms) { return setTimeout(fn, ms); }

// ---------- volume ----------
const curve = v => Math.pow(Math.max(0, Math.min(1, v)), 2); // perceptual: the slider feels even
export const Volume = {
  get() { const v = parseFloat(LS.get('condisco.volume')); return isFinite(v) ? Math.max(0, Math.min(1, v)) : .7; },
  set(v) {
    v = Math.max(0, Math.min(1, +v || 0)); LS.set('condisco.volume', String(v));
    if (vol) glide(vol.gain, curve(v), audio.currentTime, .06);
  },
};

// ---------- chimes ----------
// singing-bowl style bell: a few slightly stretched partials, soft 12 ms attack, long decay into the reverb
function bell(ctx, dest, f, t, v, dur) {
  const g = ctx.createGain(); g.gain.value = 1; g.connect(dest);
  const send = ctx.createGain(); send.gain.value = .55; g.connect(send); send.connect(verb);
  const nodes = [];
  [[1, 1, 1], [2.005, .32, .55], [3.01, .1, .32], [4.17, .045, .22], [5.43, .02, .15]].forEach(([r, a, d]) => {
    const o = ctx.createOscillator(), e = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f * r; o.detune.value = rnd(-3, 3);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(v * a, t + .012);
    e.gain.setTargetAtTime(0, t + .012, dur * d / 5);
    o.connect(e); e.connect(g); o.start(t); o.stop(t + dur * d * 1.6 + .2); nodes.push(o);
  });
  return nodes;
}
const CHIMES = {
  //            [midi, offset s, level]
  'focus-end': [[69, 0, .5], [73, .32, .42], [76, .64, .38]],   // rising A–C#–E: well done, rest
  'break-end': [[76, 0, .42], [81, .36, .4]],                    // E–A: back to it
  'block-end': [[69, 0, .45], [73, .3, .4], [76, .6, .38], [81, .95, .36]],
  'breath-end': [[64, 0, .38], [69, .5, .36]],                    // low and slow, to open the eyes
  'soft': [[81, 0, .4]],
};
export const Chime = {
  play(name = 'soft', when = 0) {
    const ctx = ensureAudio(); if (!ctx) return () => {};
    const t = Math.max(ctx.currentTime + .03, when || 0), notes = CHIMES[name] || CHIMES.soft, all = [];
    notes.forEach(([m, off, v]) => all.push(...bell(ctx, bus, mtof(m), t + off, v * .42, 4.2)));
    Music._dip(t, 2.2);
    return () => { try { const n = ctx.currentTime; stopAll(all, n + .05); } catch (e) { /* ignore */ } };
  },
  // schedule on the audio clock, so a throttled background tab still rings on time. Returns cancel().
  at(name, delayMs) {
    const ctx = ensureAudio(); if (!ctx) return () => {};
    let cancel = null, dead = false;
    const when = ctx.currentTime + Math.max(0, delayMs) / 1000;
    if (delayMs < 90000) cancel = Chime.play(name, when);
    else { // build the bell 75 s before (a hidden tab's timers can be up to a minute late), so nothing waits 45 minutes
      const id = later(() => { if (!dead) cancel = Chime.play(name, when); }, delayMs - 75000);
      return () => { dead = true; clearTimeout(id); if (cancel) cancel(); };
    }
    return () => { dead = true; if (cancel) cancel(); };
  },
};
export function beep() { Chime.play('soft'); } // kept for older callers

// ---------- breath pad ----------
// Three colours, one picked per session for variety. Each: low root + open voicing (midi).
const BREATH_VOICINGS = [
  [45, 52, 57, 61, 64, 69],   // A major, open
  [50, 57, 62, 64, 66, 69],   // D add9
  [42, 49, 54, 56, 61, 64],   // F#m add9
];
export const Pad = {
  m: null, f: null, pad: null, air: null, airF: null, bed: null, nodes: [],
  get on() { return !!this.m; },
  start() {
    const ctx = ensureAudio(); if (!ctx || this.m) return;
    try {
      setSession('playback');
      const t = ctx.currentTime;
      this.m = ctx.createGain(); this.m.gain.setValueAtTime(0, t); this.m.connect(bus);
      const rv = ctx.createGain(); rv.gain.value = .42; this.m.connect(rv); rv.connect(verb);
      this.f = ctx.createBiquadFilter(); this.f.type = 'lowpass'; this.f.frequency.value = 500; this.f.Q.value = .5;
      this.pad = ctx.createGain(); this.pad.gain.value = .45; this.pad.connect(this.f); this.f.connect(this.m);
      pick(BREATH_VOICINGS).forEach((mi, i) => ['sine', 'triangle'].forEach((type, j) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(), p = panner(ctx, (i % 2 ? .35 : -.35) * (j ? -1 : 1));
        o.type = type; o.frequency.value = mtof(mi); o.detune.value = (j ? 5 : -4) + rnd(-3, 3);
        const base = (j ? .04 : .08) / (1 + i * .35);
        g.gain.value = base; l.frequency.value = rnd(.03, .11); lg.gain.value = base * .4; l.connect(lg); lg.connect(g.gain);
        o.connect(g); g.connect(p); p.connect(this.pad); o.start(t); l.start(t); this.nodes.push(o, l);
      }));
      // air: pink noise through a band-pass, swells on the exhale like breath leaving
      const a = noiseSrc(ctx, 'pink'); this.airF = ctx.createBiquadFilter(); this.airF.type = 'bandpass'; this.airF.frequency.value = 900; this.airF.Q.value = .8;
      this.air = ctx.createGain(); this.air.gain.value = 0; a.connect(this.airF); this.airF.connect(this.air); this.air.connect(this.m);
      // a very quiet warm bed so the room never goes fully dead between breaths
      const b = noiseSrc(ctx, 'brown'), bf = ctx.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 380;
      this.bed = ctx.createGain(); this.bed.gain.value = .03; b.connect(bf); bf.connect(this.bed); this.bed.connect(this.m);
      a.start(t, rnd(0, 7)); b.start(t, rnd(0, 7)); this.nodes.push(a, b);
      this.m.gain.setTargetAtTime(.7, t, 1);                          // ≈3 s fade in
    } catch (e) { this.m = null; }
  },
  // kind: 'in' | 'top' | 'out' | 'rest' (anything else is treated like 'out'); ms = time left in that phase
  phase(kind, ms) {
    if (!this.m) return;
    try {
      const t = audio.currentTime, s = Math.max(.3, ms / 1000);
      if (kind === 'in') {
        glide(this.f.frequency, 1500, t, s / 2.5); glide(this.pad.gain, .9, t, s / 2.5);
        glide(this.airF.frequency, 1600, t, s / 2); glide(this.air.gain, .018, t, s / 3);
      } else if (kind === 'top') {
        glide(this.f.frequency, 2100, t, s / 2.5); glide(this.pad.gain, 1, t, s / 2.5);
        glide(this.airF.frequency, 2000, t, s / 2); glide(this.air.gain, .022, t, s / 3);
      } else if (kind === 'rest') {
        glide(this.f.frequency, 360, t, s / 2); glide(this.pad.gain, .3, t, s / 2); glide(this.air.gain, 0, t, s / 4);
      } else { // long exhale: the pad settles slowly, a soft breath of air rises, then trails away
        glide(this.f.frequency, 380, t, s / 3); glide(this.pad.gain, .32, t, s / 3);
        hold(this.airF.frequency, t); this.airF.frequency.setTargetAtTime(520, t, s / 2.5);
        hold(this.air.gain, t); this.air.gain.setTargetAtTime(.05, t, .35); this.air.gain.setTargetAtTime(.006, t + s * .35, s / 4);
      }
    } catch (e) { /* ignore */ }
  },
  stop() {
    if (!this.m) return;
    const m = this.m, nodes = this.nodes; this.m = null; this.nodes = [];
    try { const t = audio.currentTime; glide(m.gain, 0, t, .5); stopAll(nodes, t + 2.6); later(() => { try { m.disconnect(); } catch (e) { /* ignore */ } }, 2800); } catch (e) { /* ignore */ }
  },
};

// ---------- focus music ----------
// Chord progressions (bass root + melody pool, midi). Bright-neutral, slow, nothing that pulls attention.
const PROGS = [
  [{ b: 50, p: [62, 64, 66, 69, 71, 73, 74, 76, 78] }, { b: 47, p: [59, 61, 62, 66, 69, 71, 73, 74, 78] }, { b: 43, p: [59, 62, 64, 66, 67, 69, 71, 74, 76] }, { b: 45, p: [57, 59, 61, 64, 66, 69, 71, 73, 76] }],
  [{ b: 45, p: [61, 64, 66, 68, 69, 71, 73, 76] }, { b: 42, p: [61, 64, 66, 68, 69, 73, 76] }, { b: 50, p: [62, 64, 66, 69, 71, 73, 76] }, { b: 52, p: [59, 61, 64, 66, 68, 71, 73, 76] }],
  [{ b: 48, p: [60, 62, 64, 67, 69, 71, 72, 74, 76] }, { b: 45, p: [60, 62, 64, 67, 69, 72, 74, 76] }, { b: 41, p: [60, 62, 64, 65, 67, 69, 72, 76] }, { b: 43, p: [59, 62, 64, 67, 69, 71, 74] }],
];
export const MUSIC_KINDS = [
  { id: 'classic', he: 'פסנתר קלאסי', note: 'באך, שופן וסאטי, הקלטות אמיתיות' },
  { id: 'piano', he: 'פסנתר רך', note: 'צלילים איטיים שלא חוזרים על עצמם' },
  { id: 'rain', he: 'גשם', note: 'גשם רך על חלון' },
  { id: 'stream', he: 'נחל', note: 'מים זורמים בשקט' },
  { id: 'sea', he: 'גלים', note: 'ים רגוע' },
  { id: 'forest', he: 'יער', note: 'רוח ועלים, כמעט בלי ציפורים' },
  { id: 'pad', he: 'צליל חם', note: 'אקורדים שזזים לאט' },
  { id: 'brown', he: 'רעש חום', note: 'מבליע רעשי רקע' },
];
// Recorded audio lives in audio/, described by audio/manifest.json (files, titles, sources, licences).
// The app works fully without that folder: the manifest probe fails once, quietly, and the recorded choices
// either disappear (classical piano) or play their generated twins (rain, stream, sea).
export const AUDIO_BASE = 'audio/';
let LIB = { tracks: [], loops: {}, credits: [] }, libP = null;
export function loadLibrary() {
  if (!libP) libP = fetch(AUDIO_BASE + 'manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null).then(m => {
    if (m && typeof m === 'object') LIB = {
      tracks: Array.isArray(m.tracks) ? m.tracks.filter(t => t && typeof t.file === 'string') : [],
      loops: m.loops && typeof m.loops === 'object' ? m.loops : {},
      credits: Array.isArray(m.credits) ? m.credits : [],
    };
    return LIB;
  });
  return libP;
}
export const library = () => LIB;
export const kindAvailable = k => k === 'classic' ? LIB.tracks.length > 0 : k === 'forest' ? !!LIB.loops.forest : true; // these two have no generated twin
const BEAT = 60 / 54, CHORD_BEATS = 16;

function pianoNote(ctx, out, m, t, v) {
  const f = mtof(m), len = 1.3 + (84 - m) * .06;   // low notes ring longer
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 + 2600 * v; lp.Q.value = .3;
  const p = panner(ctx, Math.max(-.6, Math.min(.6, (m - 64) / 22))); lp.connect(p); p.connect(out);
  const nodes = [];
  [[1, 1, 1, 0], [1, .35, 1.1, 2], [2, .38, .55, 0], [3, .14, .35, 0], [4, .06, .25, 0], [5, .025, .18, 0]].forEach(([r, a, d, det]) => {
    const o = ctx.createOscillator(), e = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f * r * (1 + .0004 * r * r); o.detune.value = det;
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(v * a * .16, t + .008);
    e.gain.setTargetAtTime(v * a * .08, t + .008, .12); e.gain.setTargetAtTime(0, t + .25, len * d / 2.2);
    o.connect(e); e.connect(lp); o.start(t); o.stop(t + .25 + len * d * 3 + .1); nodes.push(o);
  });
  return nodes;
}

function makePiano(ctx, out) {
  const prog = pick(PROGS); let ci = 0, beat = 0, next = ctx.currentTime + .4, idx = 3, last = -1, id = 0, alive = new Set();
  function chord() { return prog[ci % prog.length]; }
  function schedule(until) {
    while (next < until) {
      const c = chord(), t = next + rnd(-.02, .03);
      if (beat === 0) { // chord change: a soft low root and fifth
        track(pianoNote(ctx, out, c.b, t, .34)); track(pianoNote(ctx, out, c.b + 7, t + rnd(.05, .12), .22));
        idx = Math.min(idx, c.p.length - 1);
      }
      const odds = beat % 4 === 0 ? .55 : beat % 2 === 0 ? .38 : .16; // sparse, mostly on strong beats
      if (beat > 0 && Math.random() < odds) {
        idx = Math.max(0, Math.min(c.p.length - 1, idx + pick([-2, -1, -1, 1, 1, 2, 0])));
        let m = c.p[idx]; if (m === last) m = c.p[Math.max(0, idx - 1)];
        last = m; track(pianoNote(ctx, out, m, t, rnd(.22, .45)));
        if (Math.random() < .12) track(pianoNote(ctx, out, c.p[Math.max(0, idx - 2)], t + rnd(.15, .4), rnd(.16, .26)));
      }
      next += BEAT * (Math.random() < .1 ? 1.5 : 1);
      if (++beat >= CHORD_BEATS) { beat = 0; ci++; if (ci % 8 === 0 && Math.random() < .5) ci += 1; }
    }
  }
  function track(ns) { ns.forEach(n => { alive.add(n); n.onended = () => alive.delete(n); }); }
  const tick = () => schedule(ctx.currentTime + 2.5);
  return {
    play() { if (!id) { next = Math.max(next, ctx.currentTime + .3); tick(); id = setInterval(tick, 250); } },
    pause() { clearInterval(id); id = 0; },
    end(at) { clearInterval(id); id = 0; stopAll([...alive], at); },
    _schedule: schedule,
  };
}

function makePadMusic(ctx, out) {
  const prog = pick(PROGS), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800; f.Q.value = .4; f.connect(out);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .025; lg.gain.value = 260; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  let ci = 0, id = 0, cur = null; const all = [lfo];
  function voice(c, t) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.connect(f);
    const ns = [c.b, c.b + 12, c.p[1], c.p[3], c.p[5] || c.p[4]].map((m, i) => {
      const o = ctx.createOscillator(), og = ctx.createGain(), p = panner(ctx, [-.1, .1, -.45, .45, 0][i]);
      o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = mtof(m); o.detune.value = rnd(-6, 6);
      og.gain.value = [.16, .07, .06, .05, .04][i]; o.connect(og); og.connect(p); p.connect(g); o.start(t); all.push(o); return o;
    });
    g.gain.setTargetAtTime(1, t, 2.2);                           // ≈7 s crossfade in
    return { g, ns };
  }
  function change() {
    const t = ctx.currentTime, old = cur; cur = voice(prog[ci++ % prog.length], t);
    if (old) { glide(old.g.gain, 0, t, 2.2); stopAll(old.ns, t + 12); }
  }
  return {
    play() { if (!id) { if (!cur) change(); id = setInterval(change, 22000); } },
    pause() { clearInterval(id); id = 0; },
    end(at) { clearInterval(id); id = 0; stopAll(all, at); },
  };
}

function makeNoise(ctx, out, kind) {
  const nodes = [];
  if (kind === 'rain') {
    const s = noiseSrc(ctx, 'pink'), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 350; lp.type = 'lowpass'; lp.frequency.value = 5200; g.gain.value = .55;
    const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = .06; lg.gain.value = .08; l.connect(lg); lg.connect(g.gain);
    s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
    const r = noiseSrc(ctx, 'brown'), rf = ctx.createBiquadFilter(), rg = ctx.createGain(); rf.type = 'lowpass'; rf.frequency.value = 220; rg.gain.value = .25;
    r.connect(rf); rf.connect(rg); rg.connect(out);
    s.start(ctx.currentTime, rnd(0, 7)); r.start(ctx.currentTime, rnd(0, 7)); l.start(); nodes.push(s, r, l);
  } else if (kind === 'stream') { // generated twin: bright, gently moving water
    const s = noiseSrc(ctx, 'pink'), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = .5; g.gain.value = 1.1;
    const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = .21; lg.gain.value = 260; l.connect(lg); lg.connect(bp.frequency);
    s.connect(bp); bp.connect(g); g.connect(out); s.start(ctx.currentTime, rnd(0, 7)); l.start(); nodes.push(s, l);
  } else if (kind === 'sea') { // generated twin: slow swells of filtered noise, about 9 s apart
    const s = noiseSrc(ctx, 'pink'), lp = ctx.createBiquadFilter(), g = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.value = 900; g.gain.value = .3;
    const l = ctx.createOscillator(), lg = ctx.createGain(), lf = ctx.createGain(); l.frequency.value = .11; lg.gain.value = .3; lf.gain.value = 500;
    l.connect(lg); lg.connect(g.gain); l.connect(lf); lf.connect(lp.frequency);
    s.connect(lp); lp.connect(g); g.connect(out); s.start(ctx.currentTime, rnd(0, 7)); l.start(); nodes.push(s, l);
  } else {
    const s = noiseSrc(ctx, 'brown'), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 650; g.gain.value = .7; s.connect(lp); lp.connect(g); g.connect(out); s.start(ctx.currentTime, rnd(0, 7)); nodes.push(s);
  }
  return { play() {}, pause() {}, end(at) { stopAll(nodes, at); } };
}

// ---- recorded loops: decoded once, the last 2 s crossfaded into the start so the loop is seamless ----
const LOOP_CACHE = {};
function loadLoop(ctx, file) {
  if (!LOOP_CACHE[file]) LOOP_CACHE[file] = fetch(AUDIO_BASE + file).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej))).then(b => seamless(b, 2))
    .catch(e => { delete LOOP_CACHE[file]; throw e; });
  return LOOP_CACHE[file];
}
function seamless(b, sec) {
  const m = Math.min(Math.floor(b.sampleRate * sec), Math.floor(b.length / 4)), n = b.length;
  for (let c = 0; c < b.numberOfChannels; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < m; i++) { const x = i / m; d[i] = d[i] * Math.sqrt(x) + d[n - m + i] * Math.sqrt(1 - x); }
  }
  b._loopEnd = (n - m) / b.sampleRate; return b;
}
function makeLoop(ctx, out, kind, onFail) {
  let src = null, dead = false, fb = null;
  const g = ctx.createGain(); g.gain.value = 0; g.connect(out);
  loadLoop(ctx, LIB.loops[kind]).then(b => {
    if (dead) return;
    src = ctx.createBufferSource(); src.buffer = b; src.loop = true; src.loopStart = 0; src.loopEnd = b._loopEnd;
    src.connect(g); const t = ctx.currentTime; src.start(t, rnd(0, Math.max(0, b._loopEnd - 1))); g.gain.setTargetAtTime(1, t, .4);
  }).catch(() => { if (!dead) { fb = makeNoise(ctx, g, kind); g.gain.setTargetAtTime(1, ctx.currentTime, .4); if (onFail) onFail(); } });
  return { play() {}, pause() {}, end(at) { dead = true; if (src) stopAll([src], at); if (fb) fb.end(at); }, get ready() { return !!src; } };
}
// ---- recorded classical playlist: one <audio> element through Web Audio, shuffled, 3 s of quiet between pieces ----
function makeTracks(ctx, out, onFail) {
  const el = new Audio(); el.preload = 'auto';
  let order = LIB.tracks.slice().sort(() => Math.random() - .5), i = 0, playing = false, fb = null, gap = 0, failed = 0;
  try { ctx.createMediaElementSource(el).connect(out); } catch (e) { /* no routing: the element plays directly */ }
  const load = () => { el.src = AUDIO_BASE + order[i % order.length].file; };
  el.addEventListener('ended', () => { i++; gap = setTimeout(() => { load(); if (playing) el.play().catch(() => {}); }, 3000); });
  el.addEventListener('error', () => {
    if (fb) return;
    if (++failed < order.length) { i++; load(); if (playing) el.play().catch(() => {}); return; }
    fb = makePiano(ctx, out); if (playing) fb.play(); if (onFail) onFail();   // no files at all: generated piano instead
  });
  el.addEventListener('playing', () => { failed = 0; });
  load();
  return {
    play() { playing = true; if (fb) fb.play(); else el.play().catch(() => {}); },
    pause() { playing = false; clearTimeout(gap); if (fb) fb.pause(); else el.pause(); },
    end(at) { playing = false; clearTimeout(gap); if (fb) fb.end(at); later(() => { try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) { /* ignore */ } }, Math.max(0, (at - ctx.currentTime) * 1000)); },
    get now() { return fb ? '' : order[i % order.length]; },
  };
}

const LEVEL = { classic: 1, piano: .9, pad: .7, rain: .85, stream: .8, sea: .6, forest: .85, brown: .5 };
export const Music = {
  kind: null, out: null, gen: null, ducked: false, dip: null,
  get on() { return !!this.gen; },
  get track() { return this.gen && this.gen.now || null; }, // {he, by} of the classical piece playing now
  get chosen() { const k = LS.get('condisco.music'); return MUSIC_KINDS.some(x => x.id === k) ? k : ''; },
  choose(k) { LS.set('condisco.music', MUSIC_KINDS.some(x => x.id === k) ? k : ''); },
  // idempotent: same kind already playing → just make sure it is audible
  start(kind = this.chosen) {
    if (!MUSIC_KINDS.some(x => x.id === kind)) { this.stop(); return; }
    if (this.gen && this.kind === kind) { this.resume(); return; }
    const ctx = ensureAudio(); if (!ctx) return;
    if (this.gen) this.stop(.4);
    try {
      setSession('playback');
      const t = ctx.currentTime;
      const out = ctx.createGain(); out.gain.setValueAtTime(0, t); out.connect(bus);
      const dip = ctx.createGain(); dip.gain.value = 1; dip.connect(out);
      const rv = ctx.createGain(); rv.gain.value = { piano: .7, pad: .5, classic: .12 }[kind] || .04; dip.connect(rv); rv.connect(verb);
      this.gen = kind === 'classic' && LIB.tracks.length ? makeTracks(ctx, dip) : kind === 'classic' ? makePiano(ctx, dip) : kind === 'piano' ? makePiano(ctx, dip) : kind === 'pad' ? makePadMusic(ctx, dip)
        : LIB.loops[kind] ? makeLoop(ctx, dip, kind) : makeNoise(ctx, dip, kind);
      this.out = out; this.dip = dip; this.kind = kind; this.ducked = false;
      this.gen.play(); out.gain.setTargetAtTime(LEVEL[kind], t, 1.2);  // ≈4 s fade in
    } catch (e) { this.gen = null; this.kind = null; }
  },
  // fade out but keep the generator, for a break or a pause
  duck() {
    if (!this.gen || this.ducked) return;
    this.ducked = true; glide(this.out.gain, 0, audio.currentTime, .7); const g = this.gen; later(() => { if (this.ducked && this.gen === g) g.pause(); }, 2500);
  },
  resume() {
    if (!this.gen) return;
    ensureAudio(); this.ducked = false; this.gen.play(); glide(this.out.gain, LEVEL[this.kind], audio.currentTime, 1.2);
  },
  stop(tc = .7) {
    if (!this.gen) return;
    const g = this.gen, out = this.out, t = audio.currentTime; this.gen = null; this.out = null; this.dip = null; this.kind = null; this.ducked = false;
    try { g.pause(); glide(out.gain, 0, t, tc); g.end(t + tc * 5 + .3); later(() => { try { out.disconnect(); } catch (e) { /* ignore */ } }, (tc * 5 + .6) * 1000); } catch (e) { /* ignore */ }
  },
  // lower the music under a chime, then bring it back
  _dip(t, sec) {
    if (!this.dip) return;
    try { const p = this.dip.gain; hold(p, t); p.setTargetAtTime(.35, t, .15); p.setTargetAtTime(1, t + sec, .8); } catch (e) { /* ignore */ }
  },
};

// ---------- the timer's single entry point ----------
// kinds: 'start' | 'pause' | 'resume' | 'focus-end' | 'break-end' | 'block-end' | 'stop'
// opts.chimed: the bell was already scheduled with Chime.at (or the change is stale), so only do the music part
export function timerCue(kind, opts = {}) {
  const bell = n => { if (!opts.chimed) Chime.play(n); };
  try {
    if (kind === 'start' || kind === 'resume') { if (Music.chosen) Music.start(Music.chosen); return; }
    if (kind === 'pause') { Music.duck(); return; }
    if (kind === 'focus-end') { bell('focus-end'); Music.duck(); return; }
    if (kind === 'break-end') { bell('break-end'); if (Music.chosen) Music.start(Music.chosen); return; }
    if (kind === 'block-end') { bell('block-end'); Music.stop(1); return; }
    if (kind === 'stop') { Music.stop(); return; }
  } catch (e) { /* no sound is fine */ }
}

// a tab coming back after the phone was locked: the context may have been suspended or interrupted
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryResume(); });
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => document.addEventListener(ev, () => { if (audio && audio.state !== 'running') tryResume(); }, { capture: true, passive: true }));
}

// tests only: render into an OfflineAudioContext
export function __useContext(ctx) { audio = ctx; unlocked = true; buildBus(); }
