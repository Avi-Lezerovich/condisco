# Changelog

All notable changes to Condisco. Versions follow the plugin version in `plugin/.claude-plugin/plugin.json`.

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
