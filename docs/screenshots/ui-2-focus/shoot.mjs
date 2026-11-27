// Screenshots of every focus-flow step (zone → breathe → music → timer → break → recall → done, plus the mini timer
// and the idle strip) for the UI-2 focus PR. Needs the mock server: node app/tests/serve.mjs app 8811
// Usage: node docs/screenshots/ui-2-focus/shoot.mjs <outDir> [WxH ...]   (default 393x852 1920x1080; light and dark)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] || 'shots';
const sizes = (process.argv.slice(3).length ? process.argv.slice(3) : ['393x852', '1920x1080']).map(s => s.split('x').map(Number));
const fs = require('fs'); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
for (const [w, h] of sizes) for (const scheme of ['light', 'dark']) {
  const phone = w < 600;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, timezoneId: 'Asia/Jerusalem', hasTouch: phone, isMobile: phone, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-11-26T08:05:00+02:00') });
  await p.goto('http://localhost:8811/index.html?mock=1#today'); await p.clock.runFor(1500);
  const tag = `${phone ? 'phone' : 'desk'}-${w}-${scheme}`;
  let k = 0;
  const wake = async () => { if (!phone) { await p.mouse.move(20 + (k % 7) * 60, 30); await p.mouse.move(400 + (k % 5) * 50, 300); } await p.clock.runFor(800); };
  const shot = async (name, wait = phone ? 700 : 4500) => { await wake(); await p.waitForTimeout(wait); k++; await p.screenshot({ path: `${out}/${String(k).padStart(2, '0')}-${name}-${tag}.jpg`, type: 'jpeg', quality: 78 }); };
  await p.click('.next [data-act=focus]'); await p.clock.runFor(300);
  await p.click('[data-f=check][data-v=dnd]'); await p.fill('#fz-goal', 'לפתור את שאלה 2 לבד');
  await shot('zone');
  await p.click('[data-f=next]'); await p.clock.runFor(300);
  await p.click('[data-f=bmin][data-v="1"]');
  await shot('breathe-setup', 900);
  await p.click('[data-f=bstart]'); await p.clock.runFor(7000);
  await shot('breathe-run', 1200);
  await p.clock.runFor(60000);
  await shot('music', 900);
  await p.click('[data-f=next]'); await p.clock.runFor(300);
  await p.click('[data-f=pat][data-v="25/5"]');
  await shot('timer-setup', 900);
  await p.click('[data-f=tstart]'); await p.clock.runFor(7 * 60000);
  await shot('timer-run', 900);
  await p.click('[data-f=minimize]'); await p.clock.runFor(500);
  await shot('mini', 900);
  await p.click('#mini'); await p.clock.runFor(19 * 60000);
  if (!phone) { await p.clock.runFor(62000); await p.waitForTimeout(3000); k++; await p.screenshot({ path: `${out}/${String(k).padStart(2, '0')}-idle-break-${tag}.jpg`, type: 'jpeg', quality: 78 }); }
  await shot('break', 900);
  await p.click('[data-f=stop]'); await p.click('[data-f=stop]'); await p.clock.runFor(500);
  await p.click('[data-f=recall][data-v=yes]'); await p.click('[data-f=mark][data-v=done]');
  await shot('recall', 900);
  await p.click('[data-f=finish]'); await p.clock.runFor(600);
  await shot('done', 300);
  await ctx.close();
}
await b.close();
