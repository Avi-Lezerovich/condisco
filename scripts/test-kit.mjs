// Browser test for the visual kit (kit/template.html), the page that study-summary and study-teach copy.
// Checks, on a phone and a desktop in light and dark: no horizontal scroll, no script errors, RTL Hebrew page,
// every SVG ≤ 480 units wide with a <title> and no hard-coded colours, the stepper and the quiz tally work,
// and the dark theme really changes the colours. Optional: --shots <dir> saves full-page screenshots.
// Usage: node scripts/test-kit.mjs [file.html] [--shots dir]
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const shots = shotsAt >= 0 ? args[shotsAt + 1] : null;
const file = args.find((a, i) => !a.startsWith('--') && i !== shotsAt + 1) || path.join(ROOT, 'kit/template.html');
const url = pathToFileURL(path.resolve(file)).href;

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };

const browser = await chromium.launch();
const bgs = {};
for (const [name, viewport, scheme] of [['phone-light', { width: 390, height: 844 }, 'light'], ['phone-dark', { width: 390, height: 844 }, 'dark'], ['desk-light', { width: 1280, height: 900 }, 'light'], ['desk-dark', { width: 1280, height: 900 }, 'dark']]) {
  const page = await browser.newPage({ viewport, colorScheme: scheme });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text() + (m.location()?.url || ''))) errors.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); // offline-safe: the kit must work without its web fonts
  await page.goto(url);
  const info = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    dir: document.documentElement.dir, lang: document.documentElement.lang, title: document.title,
    bg: getComputedStyle(document.body).backgroundColor,
    svgs: [...document.querySelectorAll('main svg')].map((s) => ({
      w: +(s.getAttribute('viewBox') || '0 0 0 0').split(/\s+/)[2],
      title: !!s.querySelector('title'), labelled: !!s.getAttribute('aria-labelledby') || !!s.getAttribute('aria-label'),
      hex: [...s.querySelectorAll('*')].some((el) => /#[0-9a-f]{3,8}\b/i.test((el.getAttribute('fill') || '') + (el.getAttribute('stroke') || '') + (el.getAttribute('style') || ''))),
      rendered: s.getBoundingClientRect().width,
    })),
    smallText: [...document.querySelectorAll('main svg text')].filter((t) => t.getBoundingClientRect().height > 0 && parseFloat(getComputedStyle(t).fontSize) * (t.ownerSVGElement.getBoundingClientRect().width / +t.ownerSVGElement.getAttribute('viewBox').split(/\s+/)[2]) < 10).length,
  }));
  bgs[name] = info.bg;
  ok(errors.length === 0, `${name}: no script errors (${errors.join(' | ')})`);
  ok(info.sw <= info.cw, `${name}: no horizontal scroll (${info.sw} > ${info.cw})`);
  ok(info.dir === 'rtl' && info.lang === 'he' && info.title.length > 0, `${name}: RTL Hebrew page with a title`);
  ok(info.svgs.length >= 2, `${name}: has figures`);
  for (const [i, s] of info.svgs.entries()) {
    ok(s.w > 0 && s.w <= 480, `${name}: svg ${i} viewBox width ${s.w} ≤ 480`);
    ok(s.title && s.labelled, `${name}: svg ${i} has a <title> and is labelled`);
    ok(!s.hex, `${name}: svg ${i} uses kit classes, not hex colours`);
  }
  ok(info.smallText === 0, `${name}: no SVG text renders under 10px (${info.smallText})`);

  // stepper: one step at a time, then all
  const st = await page.evaluate(() => {
    const ol = document.querySelector('[data-stepper]'); if (!ol) return null;
    const vis = () => [...ol.children].filter((li) => getComputedStyle(li).display !== 'none').length;
    const a = vis(); ol.nextElementSibling.querySelector('[data-next]').click(); const b = vis();
    ol.nextElementSibling.querySelector('[data-all]').click(); return { a, b, c: vis(), total: ol.children.length };
  });
  ok(st && st.a === 1 && st.b === 2 && st.c === st.total, `${name}: stepper shows 1, then 2, then all (${JSON.stringify(st)})`);
  // quiz: answers hidden until opened, tally counts
  const q = await page.evaluate(() => {
    const quiz = document.querySelector('[data-quiz]'); const items = [...quiz.querySelectorAll('details.q')];
    const hidden = items.every((d) => !d.open);
    items.forEach((d) => { d.open = true; }); items[0].querySelector('[data-r=yes]').click(); items[1].querySelector('[data-r=part]').click();
    return { hidden, n: items.length, score: quiz.querySelector('[data-score]').textContent };
  });
  ok(q.hidden && q.n >= 3 && /ידעת 1 מתוך/.test(q.score) && /1 חלקית/.test(q.score), `${name}: quiz hidden answers and tally (${q.score})`);
  if (shots) await page.screenshot({ path: path.join(shots, `kit-${name}.png`), fullPage: true });
  await page.close();
}
ok(bgs['phone-light'] !== bgs['phone-dark'], 'dark theme changes the page background');
await browser.close();
console.log(`kit: ${n - bad}/${n} passed`);
process.exit(bad ? 1 : 0);
