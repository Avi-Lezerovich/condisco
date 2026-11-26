// Layout across widths (phone → 2560 desktop, RTL): nav items never overlap (the desktop side rail stays one column), no sideways scroll, content never cut off or under the rail. Usage: node tests/layout.mjs [shotsDir] [port]
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] || null, PORT = process.argv[3] || 8811;
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const [w, h] of [[390,844],[768,1024],[1024,768],[1100,800],[1280,800],[1440,900],[1920,1080],[2560,1440]]) for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://localhost:${PORT}/index.html?mock=1#today`); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const nav = document.querySelector('nav.tabs'), links = [...nav.querySelectorAll('a')], as = links.map(a => a.querySelector('svg').getBoundingClientRect());
      const squeezed = links.some(a => a.getBoundingClientRect().width < 40 || a.scrollWidth > a.clientWidth + 1);
      let overlap = squeezed; for (let i = 0; i < as.length; i++) for (let j = i + 1; j < as.length; j++) { const a = as[i], c = as[j]; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) overlap = true; }
      const v = document.querySelector('#view').getBoundingClientRect(), n = nav.getBoundingClientRect();
      return { overlap, sideScroll: document.documentElement.scrollWidth > innerWidth + 1, viewL: Math.round(v.left), viewR: Math.round(v.right), navL: Math.round(n.left), navR: Math.round(n.right), cutoff: v.left < -1, coversNav: v.right > n.left + 1 && v.left < n.right - 1 && innerWidth >= 1100 };
    });
    const fail = r.overlap || r.sideScroll || r.cutoff || r.coversNav || errs.length; if (fail) bad++;
    console.log(w + 'x' + h + ' ' + scheme, fail ? 'FAIL' : 'ok', JSON.stringify(r), errs.join('|'));
    if (out) await p.screenshot({ path: `${out}/layout-${w}-${scheme}.png` }); await p.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
