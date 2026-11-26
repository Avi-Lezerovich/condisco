// Browser tests for sound: picker, volume, recorded audio and its fallback with audio/ missing, autoplay rule.
// Run: node tests/serve.mjs . 8811 &  then  node tests/sound.mjs
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const URL0 = 'http://localhost:8811/index.html?mock=1#today';
let n = 0, bad = 0; const ok = (c, m) => { n++; console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const b = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
async function run(label, vp, { noAudio = false } = {}) {
  console.log('--', label);
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
  const p = await ctx.newPage(), errs = [], audioReqs = [];
  if (noAudio) await p.route('**/audio/**', r => r.fulfill({ status: 404, body: 'nf' }));
  p.on('request', r => { if (r.url().includes('/audio/')) audioReqs.push(r.url().split('/audio/')[1]); });
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !(noAudio && (m.location().url || '').endsWith('/audio/manifest.json'))) errs.push(m.text() + ' @ ' + (m.location().url || '')); });
  const S = () => p.evaluate(async () => { const m = await import('/focus/sound.js'); return { on: m.Music.on, kind: m.Music.kind, chosen: m.Music.chosen, vol: m.Volume.get(), run: m.audioReady(), track: m.Music.track, gen: !!m.Music.gen }; });
  await p.goto(URL0); await p.waitForTimeout(1500);
  ok(!(await S()).on, 'nothing plays before a tap');
  await p.click('[data-act=focus][data-mode=music]'); await p.waitForTimeout(600);
  const opts = await p.locator('.sp-o').count();
  ok(noAudio ? opts === 7 : opts === 9, `${opts} choices (classical piano and forest ${noAudio ? 'hidden' : 'shown'})`);
  ok((await p.locator('.sp-cred').count()) === (noAudio ? 0 : 1), 'credits ' + (noAudio ? 'hidden' : 'listed'));
  await p.click('.sp-o[data-v=piano]'); await p.waitForTimeout(1200);
  let s = await S(); ok(s.on && s.kind === 'piano' && s.run, 'tap starts generated piano, audio running');
  if (!noAudio) {
    await p.click('.sp-o[data-v=classic]'); await p.waitForTimeout(2500); s = await S();
    ok(s.kind === 'classic' && s.track && s.track.file, 'classical recording plays: ' + (s.track && s.track.file));
    ok((await p.textContent('.sp-now')).startsWith('מתנגן:'), 'status names the piece');
  }
  for (const k of (noAudio ? [] : ['forest']).concat(['rain', 'stream', 'sea', 'pad', 'brown'])) { await p.click(`.sp-o[data-v=${k}]`); await p.waitForTimeout(500); s = await S(); ok(s.kind === k && s.on, k + ' plays'); }
  await p.locator('[data-snd=vol]').first().fill('35'); await p.waitForTimeout(100); s = await S(); ok(Math.abs(s.vol - .35) < .01, 'volume set and saved');
  await p.click('.sp-o[data-v=""]'); await p.waitForTimeout(300); s = await S(); ok(!s.on, 'silence stops the sound');
  // the timer path: pick rain, go on to the timer (music mode ends at finish, so use a block)
  await p.click('.sp-o[data-v=rain]'); await p.waitForTimeout(300);
  await p.click('[data-f=finish]'); await p.waitForTimeout(600); s = await S(); ok(!s.on, 'closing stops the sound');
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= vp.width, 'no horizontal scroll');
  if (noAudio) ok(audioReqs.every(u => u === 'manifest.json'), 'only the manifest was asked for: ' + [...new Set(audioReqs)].join(','));
  ok(errs.length === 0, 'no console or page errors ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}
await run('phone, with recordings', { width: 390, height: 844, mobile: true });
await run('desktop, with recordings', { width: 1280, height: 860 });
await run('phone, audio/ missing', { width: 390, height: 844, mobile: true }, { noAudio: true });
console.log(bad ? `${bad}/${n} FAILED` : `all ${n} passed`); await b.close(); process.exit(bad ? 1 : 0);
