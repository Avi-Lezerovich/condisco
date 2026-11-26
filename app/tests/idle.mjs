// Browser tests for the desktop idle screen. Needs tests/serve.mjs on :8811.
// Usage: node tests/idle.mjs [shotsDir]
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const shots = process.argv[2] || null;
const URL0 = 'http://localhost:8811/index.html?mock=1';
let n = 0, bad = 0; const ok = (c, m) => { n++; console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const b = await chromium.launch();

async function open(time, { scheme = 'dark', w = 1440, h = 900 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, timezoneId: 'Asia/Jerusalem' });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
  await p.clock.install({ time: new Date(time + '+02:00') });
  await p.goto(URL0 + '#today'); await p.clock.runFor(1500);
  await p.mouse.move(700, 450); await p.clock.runFor(100);
  return p;
}
const on = p => p.evaluate(() => document.querySelector('#ambient').classList.contains('on'));
const scenes = p => p.locator('#sceneBox .cd-scene').count();
const shown = (p, id) => p.evaluate(id => document.getElementById(id).classList.contains('show'), id);

// 1. 15 minutes before a task: clock, date, next task, shade
{
  const p = await open('2026-11-26T08:05:00');
  await p.clock.runFor(59000); ok(!(await on(p)), 'not yet at 59 s');
  await p.clock.runFor(2000); ok(await on(p), 'idle screen at 1 min');
  await p.clock.runFor(3000);
  ok(await scenes(p) > 0, 'a scene is drawn');
  ok(await shown(p, 'ambInfo') && await shown(p, 'ambShade'), 'clock + shade show 10 min before the task');
  ok((await p.textContent('#ambClock')) === '08:06', 'clock reads 08:06: ' + await p.textContent('#ambClock'));
  ok((await p.textContent('#ambNext')).startsWith("בעוד 9 דק'"), 'next line: ' + await p.textContent('#ambNext'));
  if (shots) await p.waitForTimeout(3000), await p.screenshot({ path: shots + '/idle-clock-dark.png' });
  // a nudge of the desk does not wake it
  await p.mouse.move(705, 453); await p.clock.runFor(300);
  ok(await on(p), 'small mouse nudge keeps the idle screen');
  // a real move wakes it; the scene stays during the fade, then is removed
  await p.mouse.move(900, 600); await p.clock.runFor(200);
  ok(!(await on(p)), 'real mouse move wakes');
  ok(await scenes(p) > 0, 'scene still there while fading out');
  await p.clock.runFor(1200);
  ok(await scenes(p) === 0, 'scene removed after the fade');
  // a waking key is swallowed
  await p.clock.runFor(61000); ok(await on(p), 'idle again after another minute');
  await p.evaluate(() => { window.__keys = 0; document.addEventListener('keydown', () => window.__keys++); });
  await p.keyboard.press('j'); await p.clock.runFor(100);
  ok(!(await on(p)) && await p.evaluate(() => window.__keys) === 0, 'waking key wakes and is not passed to the app');
  await p.keyboard.press('j'); await p.clock.runFor(100);
  ok(await p.evaluate(() => window.__keys) === 1, 'next key reaches the app');
  // a waking click does not click through
  await p.clock.runFor(61000); ok(await on(p), 'idle again');
  await p.evaluate(() => { window.__clicks = 0; document.addEventListener('click', () => window.__clicks++); });
  await p.mouse.click(900, 600); await p.clock.runFor(100);  // same spot: no travel, only the click
  ok(!(await on(p)) && await p.evaluate(() => window.__clicks) === 0, 'waking click is not passed to the app');
  // coming back within the fade keeps the same scene
  await p.clock.runFor(61000); const id1 = await p.evaluate(() => document.querySelector('#sceneBox .cd-scene.show')?.dataset.scene);
  await p.mouse.move(100, 100); await p.clock.runFor(200);
  await p.evaluate(() => document.getElementById('ambBtn').click()); await p.clock.runFor(300);
  const id2 = await p.evaluate(() => document.querySelector('#sceneBox .cd-scene.show')?.dataset.scene);
  ok(await on(p) && id1 && id1 === id2, `same scene when re-entering during the fade (${id1}, ${id2})`);
  ok(p.errs.length === 0, 'no console errors ' + p.errs.join(' | '));
  await p.context().close();
}
// 2. clean: no task within 15 min
{
  const p = await open('2026-11-26T09:30:00', { scheme: 'light' });
  await p.clock.runFor(64000);
  ok(await on(p) && !(await shown(p, 'ambInfo')) && !(await shown(p, 'ambShade')), 'clean screen with no task soon');
  if (shots) await p.waitForTimeout(3000), await p.screenshot({ path: shots + '/idle-clean-light.png' });
  await p.context().close();
}
// 3. a task that was due 3 min ago and is still open
{
  const p = await open('2026-11-26T08:15:00');
  await p.clock.runFor(184000);
  ok(await shown(p, 'ambInfo'), 'clock still shows just after the start time');
  ok((await p.textContent('#ambNext')).startsWith('התחיל לפני'), 'late line: ' + await p.textContent('#ambNext'));
  await p.clock.runFor(4 * 60000);
  ok(!(await shown(p, 'ambInfo')), 'clock goes away 5 min after the start time');
  if (shots) await p.waitForTimeout(3000), await p.screenshot({ path: shots + '/idle-late-dark.png' });
  await p.context().close();
}
// 4. narrow window: no idle screen
{
  const p = await open('2026-11-26T08:05:00', { w: 800, h: 900 });
  await p.clock.runFor(65000); ok(!(await on(p)), 'no idle screen under 900 px');
  await p.context().close();
}
// 5. light scene with the clock: shade keeps it readable
{
  const p = await open('2026-11-26T08:05:00', { scheme: 'light' });
  await p.clock.runFor(64000);
  if (shots) await p.waitForTimeout(3000), await p.screenshot({ path: shots + '/idle-clock-light.png' });
  ok(await shown(p, 'ambInfo'), 'clock shows in light mode');
  await p.context().close();
}
// 6. focus block running: the strip shows, the clock does not; breathing is never interrupted
{
  const p = await open('2026-11-26T08:05:00');
  await p.click('.next [data-act=focus]'); await p.clock.runFor(300);
  await p.fill('#fz-goal', 'לפתור שאלה 2 לבד'); await p.click('[data-f=next]'); await p.clock.runFor(300);
  await p.click('[data-f=bmin][data-v="1"]'); await p.click('[data-f=bstart]'); await p.clock.runFor(30000);
  await p.clock.runFor(20000); ok(!(await on(p)), 'no idle screen during breathing');
  await p.clock.runFor(15000);
  await p.click('[data-f=next]'); await p.clock.runFor(300);
  await p.click('[data-f=pat][data-v="25/5"]'); await p.click('[data-f=tstart]'); await p.clock.runFor(1000);
  await p.click('[data-f=minimize]').catch(() => {}); await p.clock.runFor(300);
  await p.clock.runFor(62000);
  ok(await on(p) && await shown(p, 'ambTimer') && !(await shown(p, 'ambInfo')), 'timer strip instead of the clock during a block');
  ok((await p.textContent('#atGoal')).includes('לפתור שאלה 2 לבד'), 'goal on the strip');
  if (shots) await p.waitForTimeout(3000), await p.screenshot({ path: shots + '/idle-timer-dark.png' });
  ok(p.errs.length === 0, 'no console errors ' + p.errs.join(' | '));
  await p.context().close();
}
await b.close();
console.log(`${n - bad}/${n} passed`); process.exit(bad ? 1 : 0);
