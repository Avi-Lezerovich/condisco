// Check-in + Settings browser tests (mock db). Run with tests/serve.mjs on 8811.
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const B = 'http://localhost:8811/index.html?mock=1';
const b = await chromium.launch(); let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const page = async (now, hash) => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(`${B}&now=${now}#${hash}`); await p.waitForTimeout(600); p.errs = errs; return p; };
const S = (p, c) => p.evaluate(c => window.__condisco.store.S[c], c);

{ const p = await page('2026-11-26T21:30:00', 'checkin');
  await p.fill('#ci-did', 'בלוק בהסתברות'); await p.fill('#ci-blocked', 'עייפות');
  await p.click('[data-act=energy][data-v="4"]');
  await p.click('[data-act=sleep][data-d="0.5"]');
  ok(await p.inputValue('#ci-sleep') === '7', 'sleep stepper from empty starts at 7'); await p.click('[data-act=sleep][data-d="0.5"]'); ok(await p.inputValue('#ci-sleep') === '7.5', 'then 7.5');
  await p.evaluate(() => location.hash = '#today'); await p.waitForTimeout(200); await p.evaluate(() => location.hash = '#checkin'); await p.waitForTimeout(300);
  ok(await p.inputValue('#ci-did') === 'בלוק בהסתברות', 'draft survives tab switch');
  ok(await p.getAttribute('[data-act=energy][data-v="4"]', 'aria-pressed') === 'true', 'energy survives tab switch');
  await p.reload(); await p.waitForTimeout(600);
  ok(await p.inputValue('#ci-blocked') === 'עייפות', 'draft survives reload');
  ok((await p.textContent('#ci-state')).includes('שוחזרה'), 'restored-draft notice');
  await p.fill('#ci-firstWhen', '08:30'); await p.fill('#ci-firstWhere', 'ספרייה');
  await p.click('#ci [type=submit]'); await p.waitForTimeout(400);
  const c = (await S(p, 'checkins')).find(x => x.id === '2026-11-26');
  ok(c && c.date === '2026-11-26' && c.did === 'בלוק בהסתברות' && c.energy === 4 && c.sleep === 7.5 && c.firstWhen === '08:30' && c.firstWhere === 'ספרייה' && c.tomorrow === '', 'saved doc has the contract fields: ' + JSON.stringify(c));
  ok(await p.evaluate(() => localStorage.getItem('condisco.ci.draft')) === null, 'draft cleared after save');
  ok((await p.textContent('#ci-state')).includes('נשמר'), 'saved badge');
  ok((await p.textContent('#ci [type=submit]')).includes('עדכון'), 'button says update');
  // extra fields written by the evening task are kept on update
  await p.evaluate(() => window.__condisco.store.write('checkins/2026-11-26', { byTask: 'x' }));
  await p.fill('#ci-tomorrow', 'שתי שאלות'); await p.click('#ci [type=submit]'); await p.waitForTimeout(300);
  const c2 = (await S(p, 'checkins')).find(x => x.id === '2026-11-26');
  ok(c2.byTask === 'x' && c2.tomorrow === 'שתי שאלות' && c2.did === 'בלוק בהסתברות', 'update keeps foreign fields');
  // task status from the check-in
  const id = await p.getAttribute('.ci-tl li:nth-child(2) [data-s=min]', 'data-id');
  await p.click('.ci-tl li:nth-child(2) [data-s=min]'); await p.waitForTimeout(300);
  ok((await S(p, 'tasks')).find(t => t.id === id).status === 'min', 'task marked min');
  await p.click(`.ci-tl [data-id="${id}"][data-s=min]`); await p.waitForTimeout(300);
  ok((await S(p, 'tasks')).find(t => t.id === id).status === 'todo', 'tap again → back to todo');
  // bad sleep
  await p.fill('#ci-sleep', '30'); await p.click('#ci [type=submit]'); await p.waitForTimeout(200);
  ok((await p.textContent('#toast')).includes('שעות שינה'), 'sleep out of range blocked');
  ok(!p.errs.length, 'no page errors ' + p.errs);
}
{ const p = await page('2026-11-27T01:20:00', 'checkin');
  ok((await p.textContent('.ci-day')).includes('26.11'), 'at 01:20 the check-in is for the evening before');
  await p.fill('#ci-did', 'לילה'); await p.click('#ci [type=submit]'); await p.waitForTimeout(300);
  ok((await S(p, 'checkins')).some(x => x.id === '2026-11-26' && x.did === 'לילה'), 'written to 2026-11-26');
}
{ const p = await page('2026-11-26T21:30:00', 'checkin');
  await p.evaluate(() => window.__condisco.store.write('checkins/2026-11-26', { date: '2026-11-26', did: 'מהצ\'אט', energy: 3 }, 'set')); await p.waitForTimeout(300);
  ok(await p.inputValue('#ci-did') === "מהצ'אט" && (await p.getAttribute('[data-act=energy][data-v="3"]', 'aria-pressed')) === 'true', 'check-in written elsewhere shows up in an untouched form');
  await p.fill('#ci-did', 'שלי'); await p.locator('#ci-did').blur();
  await p.evaluate(() => window.__condisco.store.write('checkins/2026-11-26', { blocked: 'x' })); await p.waitForTimeout(300);
  ok(await p.inputValue('#ci-did') === 'שלי', 'typed text is not overwritten by an outside write');
}
{ const p = await page('2026-11-26T21:30:00', 'checkin');
  await p.click('#ci [type=submit]'); await p.waitForTimeout(200);
  ok((await p.textContent('#toast')).includes('עוד לא נכתב'), 'empty form not saved');
}
// settings
{ const p = await page('2026-11-26T10:00:00', 'prefs');
  await p.fill('#fb-worked', 'הטיימר'); await p.click('[data-act=rate][data-v="4"]');
  await p.fill('#pf-name', 'נועה ב'); await p.locator('#pf-name').blur(); await p.waitForTimeout(300);
  ok((await S(p, 'settings')).find(x => x.id === 'main').name === 'נועה ב', 'name autosaves');
  await p.fill('#pf-target', '120'); await p.locator('#pf-target').blur(); await p.waitForTimeout(200);
  ok((await S(p, 'settings')).find(x => x.id === 'main').target === 85 && await p.inputValue('#pf-target') === '85', 'bad target rejected and restored');
  await p.fill('#new-course', 'רשתות'); await p.press('#new-course', 'Enter'); await p.waitForTimeout(400);
  ok((await S(p, 'courses')).some(c => c.name === 'רשתות' && c.aiSolve === 'forbidden' && c.aiSolveVerified === false), 'Enter adds course (forbidden, unverified)');
  ok(await p.inputValue('#fb-worked') === 'הטיימר', 'feedback text survives a redraw');
  const before = Object.fromEntries((await S(p, 'courses')).map(c => [c.id, c.color]));
  await p.click('[data-act=move][data-id=c][data-d="-1"]'); await p.waitForTimeout(400);
  const cs = await S(p, 'courses'), oc = id => cs.find(c => c.id === id).order;
  ok(oc('c') === 2 && oc('b') === 3, 'move up swaps order');
  ok(cs.find(c => c.id === 'c').color && cs.find(c => c.id === 'a').color === before.a, 'colours pinned: ' + cs.map(c => c.id + c.color).join(','));
  // remove a course: undo in a toast, never a confirm dialog
  p.on('dialog', d => { ok(false, 'no dialogs: ' + d.message()); d.dismiss(); });
  const rid = (await S(p, 'courses')).find(c => c.name === 'רשתות').id;
  await p.click(`[data-act=rmcourse][data-id="${rid}"]`); await p.waitForTimeout(300);
  ok(!(await S(p, 'courses')).some(c => c.id === rid) && await p.isVisible('.ps-undo'), 'course removed, undo offered');
  await p.click('[data-act=psundo]'); await p.waitForTimeout(300);
  const back = (await S(p, 'courses')).find(c => c.id === rid);
  ok(back && back.name === 'רשתות' && back.aiSolve === 'forbidden' && !await p.isVisible('.ps-undo'), 'undo restores the course');
  await p.click('[data-act=rmcourse][data-id=a]'); await p.waitForTimeout(300);
  ok((await S(p, 'courses')).some(c => c.id === 'a') && (await p.textContent('#toast')).includes('נשאר'), 'a course with tasks or material is kept');
  // look and sound: per device
  await p.locator('#pf-vol').fill('40'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => localStorage.getItem('condisco.volume')) === '0.4', 'volume saved on the device');
  await p.selectOption('#pf-music', 'rain');
  ok(await p.evaluate(() => localStorage.getItem('condisco.music')) === 'rain', 'block music saved on the device');
  ok(await p.locator('#view .btn.primary').count() === 1, 'one primary in settings');
  await p.click('[data-act=ai][data-id=b][data-v=allowed]'); await p.waitForTimeout(300);
  ok((await S(p, 'courses')).find(c => c.id === 'b').aiSolve === 'allowed', 'aiSolve toggle');
  await p.fill('#cn-a', ''); await p.locator('#cn-a').blur(); await p.waitForTimeout(200);
  ok(await p.inputValue('#cn-a') === 'קורס דוגמה א', 'empty course name restored');
  await p.click('[data-act=theme][data-v=dark]');
  ok(await p.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'theme dark');
  await p.reload(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'theme persists');
  await p.click('[data-act=theme][data-v=auto]');
  ok(await p.evaluate(() => !document.documentElement.dataset.theme), 'theme auto');
  await p.click('[data-act=rate][data-v="5"]'); await p.fill('#fb-wish', 'עוד'); await p.click('#fb-form [type=submit]'); await p.waitForTimeout(300);
  ok((await S(p, 'feedback')).some(f => f.rating === 5 && f.wish === 'עוד' && f.skill === 'app'), 'feedback saved');
  ok(!p.errs.length, 'no page errors ' + p.errs);
}
// layout: sticky save on phone, in the flow from 600px; check-in one 720px column; settings two columns from 1024px
{ const p = await page('2026-11-26T21:30:00', 'checkin');
  ok(await p.$eval('.ci-save', e => getComputedStyle(e).position) === 'sticky', 'phone: save is sticky');
  const r = await p.$eval('.ci-save .btn', e => e.getBoundingClientRect().bottom), tab = await p.$eval('nav.tabs', e => e.getBoundingClientRect().top);
  ok(r <= tab + 1, 'phone: save sits above the tab bar');
  ok(await p.locator('#view .btn.primary').count() === 1, 'one primary in the check-in');
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(200);
  ok(await p.$eval('.ci-save', e => getComputedStyle(e).position) === 'static', 'desktop: save in the flow');
  ok(await p.$eval('.ci-wrap', e => e.getBoundingClientRect().width) <= 720, 'desktop: check-in is one 720px column');
  await p.evaluate(() => location.hash = '#prefs'); await p.waitForTimeout(300);
  const cols = await p.$$eval('.prefs > .ps-col', es => es.map(e => e.getBoundingClientRect()).map(r => [Math.round(r.top), Math.round(r.left)]));
  ok(cols.length === 2 && cols[0][0] === cols[1][0] && cols[0][1] !== cols[1][1], 'desktop: settings in two columns ' + JSON.stringify(cols));
}
// first run: one welcome card, one primary
{ const ctx = await b.newContext({ viewport: { width: 393, height: 852 } }); const p = await ctx.newPage();
  await p.goto('http://localhost:8811/index.html?mock=empty'); await p.waitForTimeout(600);
  ok(await p.locator('#view .card-sec').count() === 1 && await p.locator('#view .btn.primary').count() === 1, 'first run: one card, one primary');
  await p.fill('#fr-name', 'נועה'); await p.fill('#fr-courses', 'הסתברות'); await p.click('#first-form [type=submit]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => window.__condisco.store.S.courses.length) === 1 && !(await p.$('#first-form')), 'first run saves and opens the app');
}
await b.close(); process.exit(fail ? 1 : 0);
