# Condisco app (v0.1.0)

The student-facing app of Condisco: a private claude.ai artifact with owner-only storage. Successor of Study Hub, same look ("morning at the lake"), rebuilt as modules.

- Data model: `SCHEMA.md`.

## Files
- `index.html`: markup only (band, header, view, navigation, focus/idle layers) and the stylesheet links.
- `ds/`: the design system in code: `tokens.css` (generated from `ds/tokens.json`), `base.css`, `shell.css` (tab bar under 600px, navigation rail from 600px, scene band), `components.css`, `palettes.css`. See `ds/README.md`.
- `app.js`: boot, routing (`#today #gaps #deadlines #checkin #prefs`), rendering, events, desktop install and dock icon.
- `core/store.js`: the only module that calls `claude.use("db")`: no-db notice, 10-s load timeout, one write per doc at a time, schema version and migrations, session pruning, export snapshot.
- `core/model.js`: pure rules (ladder, priority, mocks, Leitner, pruning). `core/util.js`: escaping, dates, the app clock. `core/mock.js`: `?mock=1` fake db with fictional sample data (`?mock=empty` for first run, `&now=ISO` fake clock).
- `ui/*.js`: Today, Gaps, Deadlines, Check-in, Settings (+ first-run screen, feedback form), Exam mode (`#exam`, rules in `core/exam.js`; hidden unless `FEATURES.exam` in `app.js` is true, or the URL has `?exam=1` or `?mock=exam`).
- `focus/engine.js`: pure state machine `idle → zone → breathe → music → focus ⇄ break → recall → done` with absolute timestamps, persisted in localStorage, shared by tabs. `focus/ui.js` renders it; `focus/sound.js` is the breath-paced Web Audio pad.
- `idle/idle.js`: desktop idle screen (1 min without input), clock only in the 15 minutes before the next task, timer strip during a block.
- `scenes/`: `registry.js`, `lib.js`, `manifest.json`, 31 scenes.

## Publish
Publish `index.html` as the page and every other file above with `files` (relative paths kept), capabilities as in `SCHEMA.md`. No build step.

## Tests
From the repository root (`npm ci` once, which also installs Playwright's Chromium via `npx playwright install chromium`):
```
npm run test:unit       # pure tests: engine, Leitner, mocks, priority, pruning, migrations, Gaps rules
npm run test:browser    # every browser suite against ?mock=1, served by tests/serve.mjs on :8811 (incl. tests/matrix.mjs: device matrix, no side scroll, 44px targets, no text under 12.5px)
npm test                # both
npm run serve           # http://localhost:8811/index.html?mock=1 (fake data), ?mock=empty for first run, &now=ISO for a fake clock
```
Each suite can also run alone from `app/`: `node tests/serve.mjs . 8811 &` then e.g. `node tests/today.mjs`. Suites that take a shots directory (`smoke.mjs`, `gaps-ui.mjs`, `idle.mjs`, `timer.mjs --shots`) write screenshots to `tests/shots/`, which git ignores.
