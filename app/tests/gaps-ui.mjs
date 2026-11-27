// Browser tests for the Gaps screen (needs tests/serve.mjs on 8811). Run: node tests/gaps-ui.mjs [shots dir] [port]
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] || 'tests/shots', port = process.argv[3] || '8811';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'he-IL' });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const S = () => p.evaluate(() => window.__condisco.store.S);
let ok = 0, bad = 0; const t = (c, m) => { if (c) ok++; else { bad++; console.log('FAIL', m); } };
const wait = ms => p.waitForTimeout(ms);
await p.goto(`http://localhost:${port}/index.html?mock=1&now=2026-11-26T08:05:00#gaps`); await wait(700);
await p.evaluate(() => { try { localStorage.removeItem('condisco.gaps'); } catch (e) { /* ignore */ } });
// layout (UI-2d): the target shows once, each card has one primary (the next unit), legend counts sit under the ladder
t((await p.evaluate(() => (document.querySelector('#view').innerText.match(/85/g) || []).length)) === 1, 'target 85 appears once');
t(await p.evaluate(() => [...document.querySelectorAll('.course')].every(c => c.querySelectorAll('.btn.primary').length <= 1)), 'at most one primary per card');
t(await p.$('.course .ladder + .lg') != null, 'legend inline under the ladder');
// next unit: opens the card with that unit's step picker
await p.click('[data-act=next][data-id=a]'); await wait(250);
t(await p.$('.course.open .c-head[data-id=a]') != null && await p.$('.picker [data-id=a-l3].on') != null, 'next opens card on the next unit');
t(await p.evaluate(() => document.querySelectorAll('.course.open .btn.primary').length) === 1, 'open card keeps one primary');
await p.keyboard.press('Escape'); await wait(80);
// step picker: open, choose, undo
await p.click('.st[data-id=a-l2]'); await wait(100);
t(await p.$('.picker') != null, 'picker opens');
await p.screenshot({ path: out + '/gaps-picker.png' });
await p.click('.picker [data-v=exam]'); await wait(150);
t((await S()).units.find(u => u.id === 'a-l2').status === 'exam', 'status set to exam');
t(await p.$('.g-undo') != null, 'undo bar shows');
await p.click('.g-undo [data-act=undo]'); await wait(150);
t((await S()).units.find(u => u.id === 'a-l2').status === 'read', 'undo restores status');
await p.click('.st[data-id=a-l1]'); await wait(80); await p.keyboard.press('Escape'); await wait(80);
t(await p.$('.picker') == null, 'Escape closes picker');
// confidence
await p.click('.conf [data-id=a-l3][data-v="3"]'); await wait(120);
t((await S()).units.find(u => u.id === 'a-l3').confidence === 3, 'confidence set');
// mocks: reject out of range, Enter submits, custom date, readiness
const F = '.mk-form[data-course=a] ';
await p.fill(F + '.mk-score', '120'); await p.click('[data-act=mock][data-id=a]'); await wait(100);
t((await S()).mocks.filter(m => m.courseId === 'a').length === 0, 'rejects 120');
await p.fill(F + '.mk-title', '2024 א'); await p.fill(F + '.mk-date', '2026-11-20'); await p.fill(F + '.mk-score', '88'); await p.press(F + '.mk-score', 'Enter'); await wait(200);
await p.fill(F + '.mk-score', '91'); await p.click('[data-act=mock][data-id=a]'); await wait(200);
const ma = (await S()).mocks.filter(m => m.courseId === 'a');
t(ma.length === 2 && ma.some(m => m.date === '2026-11-20'), 'two mocks, custom date kept');
t((await p.textContent('.course.open .rd')).includes('ברמת מבחן'), 'ready line shows');
await p.screenshot({ path: out + '/gaps-ready.png', fullPage: true });
// delete mock + undo
await p.click('.course.open .mk .x'); await wait(150);
t((await S()).mocks.filter(m => m.courseId === 'a').length === 1, 'mock deleted');
await p.click('.g-undo [data-act=undo]'); await wait(150);
t((await S()).mocks.filter(m => m.courseId === 'a').length === 2, 'mock restored');
// filter
await p.click('[data-act=filter][data-v=gaps]'); await wait(100);
t((await p.$$('.unit')).length === 4, 'filter shows units not at exam');
await p.click('[data-act=filter][data-v=all]'); await wait(100);
// errors
await p.click('.c-head[data-id=c]'); await wait(150);
await p.click('[data-act=errdone]'); await wait(150);
t((await S()).errors[0].resolved === true, 'error resolved');
await p.reload(); await wait(700);
t(await p.$('.course.open .c-head[data-id=c]') != null, 'open card remembered after reload');
// unit summary: collapsed by default, escaped, capped at 600 chars
await p.evaluate(async () => { await window.__mockDb.doc('units/a-l1').update({ summary: 'שורה ראשונה <img src=x onerror=alert(1)>\nשורה שנייה ' + 'א'.repeat(700) }); });
await p.click('.c-head[data-id=a]'); await wait(200);
t(await p.$('.u-sumbtn[data-id=a-l1]') != null && await p.$('.u-sum') == null, 'summary collapsed by default');
t(await p.$('.u-sumbtn[data-id=a-l2]') == null, 'no summary button without summary');
await p.click('.u-sumbtn[data-id=a-l1]'); await wait(120);
const sumTxt = await p.textContent('.u-sum');
t(sumTxt.includes('<img') && await p.$('.u-sum img') == null && sumTxt.length <= 600, 'summary escaped and capped');
await p.screenshot({ path: out + '/gaps-summary.png' });
await p.click('.u-sumbtn[data-id=a-l1]'); await wait(120);
t(await p.$('.u-sum') == null, 'summary collapses');
// a course with no units and no confidence, long name
await p.evaluate(async () => { await window.__mockDb.doc('courses/z').set({ name: 'קורס בלי יחידות עם שם ארוך מאוד מאוד מאוד שצריך לשבור שורה', order: 4 }); });
await wait(200); await p.click('.c-head[data-id=z]'); await wait(150);
t((await p.textContent('.course.open')).includes('עוד אין יחידות'), 'empty course message');
t(!(await p.textContent('.course.open .c-sub')).includes('ביטחון'), 'no confidence when missing');
t(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'no sideways scroll');
await p.screenshot({ path: out + '/gaps-empty-course.png', fullPage: true });
// grid: 1 column on a phone, 2 from 1024px, 3 from 1440px
const cols = () => p.evaluate(() => getComputedStyle(document.querySelector('.cgrid')).gridTemplateColumns.split(' ').length);
t(await cols() === 1, '1 column on a phone');
await p.setViewportSize({ width: 1024, height: 800 }); await wait(150); t(await cols() === 2, '2 columns at 1024');
await p.setViewportSize({ width: 1440, height: 900 }); await wait(150); t(await cols() === 3, '3 columns at 1440');
// Deadlines (UI-2d): list/calendar on the segmented control, days-left colour by meaning, quiet badge, one primary
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(`http://localhost:${port}/index.html?mock=deadlines&now=2026-11-26T08:05:00#deadlines`); await wait(600);
t(await p.$('.toggle [data-act=dlmode][data-v=list][aria-pressed=true]') != null && await p.isVisible('.dl-main') && !(await p.isVisible('.dl-cal')), 'list view by default');
t(await p.evaluate(() => document.querySelectorAll('#view .btn.primary').length) === 1, 'deadlines: one primary');
t(await p.evaluate(() => { const r = document.querySelector('#view .btn.primary').closest('.dl'); return !!r && r.textContent.includes('הגשת דוח מעבדה'); }), 'primary is the nearest open deadline');
const tone = txt => p.evaluate(x => { const r = [...document.querySelectorAll('.dl-main .dl')].find(e => e.textContent.includes(x)); return r ? [getComputedStyle(r.querySelector('.num')).color, r.classList.contains('hot')] : null; }, txt);
const ink = await p.evaluate(() => getComputedStyle(document.querySelector('.dl .t-title')).color);
const far = await tone('מטלה ארוכה'), near = await tone('תרגיל בית 3');
t(far && !far[1] && far[0] === ink, 'far deadline number in ink');
t(near && near[1] && near[0] !== ink, 'deadline in 3 days or less is coloured');
t(await p.$('.dl .badge') != null, 'unverified badge');
await p.click('[data-act=dlmode][data-v=cal]'); await wait(150);
t(await p.isVisible('.dl-cal') && !(await p.isVisible('.dl-main')), 'calendar view');
t((await p.$$('.cal-grid .cal-d')).length === 35, 'five weeks');
t(await p.$('.cal-d.today.sel') != null, 'today chosen (has deadlines)');
await p.click('.cal-d.has[data-d="2026-11-28"]'); await wait(120);
t((await p.textContent('.cal-day')).includes('תרגיל בית 3'), 'day panel lists that day');
await p.click('[data-act=dlshift][data-v="1"]'); await wait(120);
t((await p.textContent('.cal-range')).includes('27.12'), 'next weeks');
t(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'calendar: no sideways scroll');
await p.screenshot({ path: out + '/deadlines-cal.png' });
await p.setViewportSize({ width: 1440, height: 900 }); await wait(150);
t(await p.isVisible('.dl-main') && await p.isVisible('.dl-cal') && !(await p.isVisible('.dl-bar .toggle')), 'desktop: list and calendar side by side');
t(!errs.length, 'no console errors: ' + errs.join(' | '));
console.log(`${ok}/${ok + bad} gaps UI tests pass`); await b.close(); process.exit(bad ? 1 : 0);
