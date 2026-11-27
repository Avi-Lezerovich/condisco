# Changelog

All notable changes to Condisco. Versions follow the plugin version in `plugin/.claude-plugin/plugin.json`.

## [Unreleased] - 0.5.0-dev

UI/UX overhaul, part 1: the Condisco Design System in code. No behaviour change.

### App
- One design system: `app/ds/tokens.css` is generated from the design-system artifact's tokens (scripts/build-tokens.mjs); 11 type styles replace 25 font sizes, 5 radii replace 14, every colour is a token.
- New shell: bottom tab bar under 600px, navigation rail from 600px (iPad, phone landscape, half-window laptop), two-column Today from 1024px, content max 1200px on large and fullscreen screens. The 300px scene band and floating header become a 176px band (216px from 1024px) with the greeting on its edge.
- Colour roles: cobalt is the one primary action (also on the next-up card), yellow only for done states and habits; warnings are clay instead of red; course names are ink with a course-colour dot.
- Targets of at least 44px and no text under 12.5px on every screen.
- `scripts/lint-css.mjs` (in `npm run check`) blocks raw colours, px font sizes and radii, and physical left/right in app CSS. `tests/matrix.mjs` checks 10 device sizes in light and dark.

### Plugin
- `study-setup`: "install Condisco" now publishes the app right away instead of first listing settings to enable (if the skill runs, code execution, which artifacts need, is already on). Only a failed publish opens the new `references/troubleshooting.md`: one cause from the exact error, one fix, then publish again. New eval `setup-try-first-he`.

### Visual kit
- The summary template takes its colour block from the same tokens (`DS:TOKENS` markers), so summaries and the app can no longer drift.

## [0.4.0] - 2026-11-26

Learning bundle: personal summaries and lessons, built on a learner profile.

### Plugin
- New skill `study-profile`: the first interview after setup (address form, confidence per course, study time, main goal, then three questions on how the student likes to learn, picked from two tiny samples), "what do you know about me", and preferences stated at any time. It is the only skill that writes `profile/main`; others append `profile_events`. No learning-style labels (matching has no evidence); preferences change the wrapping, never retrieval or the closing recall.
- New skill `study-summary`: "summarize week 5" builds a summary of a week, unit, topic or whole course from the student's own files, in the profile's format. Default: a visual Hebrew page (concept map, diagrams, a step-by-step worked example, traps, a recall quiz with hidden answers). Never solves graded work in a course that forbids it; additions beyond the files are marked.
- New skill `study-teach`: "teach me X" asks one prior-knowledge question, builds a short visual lesson, and ends with an explain-back.
- `study-setup`: new first run. Publish the app and self-test first, then read courses and syllabi from Moodle (read only) or uploaded syllabi, confirm, then the `study-profile` interview.
- `study-session`, `study-coach`, `exam-mode`, `study-materials` read the profile and log events; the weekly review proposes profile changes the student confirms.
- 14 new evals (41 in total). Trigger descriptions narrowed so "summarize my materials" stays with `study-materials`, "let's study X, I have 45 minutes" stays with `study-session`, and `study-teach` asks exactly one question first. Behaviour evals that read skill assets run with `--allow-tools Read Glob Write`.

### Visual kit
- `kit/template.html` and `kit/visual-kit.md`: one page template in the Condisco look (RTL, light and dark, phone first, MathML formulas, inline SVG coloured by classes) and its rules, copied into `study-summary` and `study-teach`.

### App
- The store loads and exports `profile`, `profile_events` and `summaries`. Schema stays version 2 (additive, no migration).

### Repository
- `scripts/sync-shared.mjs` keeps shared skill files in sync; `npm run check` fails on drift and on skill descriptions over the platform limits.
- `npm run test:kit` (also in CI) tests the kit page on phone and desktop, light and dark.
- `docs/research/learning-skills.md`: existing study skills and the learning-science basis for this release.

## [0.3.2] - 2026-11-26

### App
- Fix: on a desktop in full screen, hiding the Exams tab squeezed the side rail into five narrow columns. The tab count is now a CSS variable (`--tabs`), so the rail stays one column.

### Repository
- New browser suite `layout` (8 widths from 390 to 2560 px, light and dark), also run in CI.

## [0.3.1] - 2026-11-26

### App
- New recordings: Chopin, Nocturne Op. 9 No. 2 (public domain), and a sea loop (CC BY 3.0, Luftrum, credited in the app and in NOTICE.md).
- The Exams tab is hidden for now (`FEATURES.exam = false` in `app.js`). All code and data stay; `?exam=1` or `?mock=exam` shows it. To bring it back, set `exam: true`.

- Idle-screen scenes: 31 chosen scenes (new ones include Arbel, Masada and Rosh HaNikra; others retired). Scenes swap every 25 minutes and never during a focus block, with richer detail, a slow camera glide, and fixed rain and snow.

### Plugin
- `exam-mode` no longer points students to the hidden Exams tab for the mock timer.

### Repository
- NOTICE.md for third-party audio licenses.

## [0.3.0] - 2026-11-26

Pilot release: the first version a student installs alone.

### Plugin
- New skill `study-materials`: links each unit to its Google Drive file and writes a short summary from that file only. Drive is read, never changed.
- New skill `study-sync`: manual, read-only "sync now" of Moodle and Piazza through Claude in Chrome, or a pasted page or screenshot. New deadlines come in as unverified. Nothing is written to Moodle or Piazza.
- `exam-mode`, `study-coach`, `study-setup`: exam mode fields and the shared schema text.
- 10 new evals (27 in total).

### App
- Exam mode screen (`#exam`) with rules in `core/exam.js`.
- Deadlines: a confirm button for unverified deadlines and a link to the source.
- Gaps: a new summary.
- New stream and forest recordings, with sources in `audio/LICENSES.md`.

### Repository
- `scripts/bump-version.mjs`, an English install guide, and the exam suite in the browser test runner.

## [0.2.0] - 2026-11-26

First version in this repository.

### Plugin
- Five skills: `study-setup`, `study-coach`, `study-session`, `exam-mode`, `study-feedback`.
- 17 eval cases covering triggering in Hebrew and English, the per-course AI policy and the no-storage case.

### App (0.1.0)
- Today, Gaps, Deadlines, Check-in and Settings screens, first-run screen and feedback form.
- Focus timer as a state machine (zone, breathe, music, focus, break, recall) that survives reloads and is shared between tabs.
- Breathing screen, breath-paced sound, recorded music and rain.
- Desktop idle screen with 37 living SVG scenes.
- Schema version 2 with idempotent migrations from the Study Hub layout.
