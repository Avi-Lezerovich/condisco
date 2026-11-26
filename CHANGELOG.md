# Changelog

All notable changes to Condisco. Versions follow the plugin version in `plugin/.claude-plugin/plugin.json`.

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
