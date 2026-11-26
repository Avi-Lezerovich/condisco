# Condisco data schema (v2, 2026-11-25)

Source of truth for the app (WS-2) and the skills (WS-1). All Study Hub collections and field names are kept unchanged, because the evening check-in task and the skills read them. Version 2 only adds fields and collections.

Capabilities: `{db: {rules: [{path: "", read: "owner", write: "owner"}]}, user: {}, desktop: {}, downloads: true}`. Owner-only on every collection (verified: an `admin`-level read returns nothing).

## Versioning
- `meta/schema`: `{version: 2, migratedAt (ISO), app: "condisco", appVersion: "0.1.0"}`. A db without it is version 1 (Study Hub layout).
- The app runs ordered, idempotent migrations on first full load (owner only). They add missing fields, never delete user data. Then it prunes `sessions` older than 180 days.
- v1 → v2: `courses.aiSolve = "forbidden"` and `aiSolveVerified = false` where missing; `deadlines.graded = (kind != "admin")` where missing; `settings/main.onboarded = true` when courses exist.

## Collections (v1 fields unchanged, v2 additions marked +)
- `settings/main`: name, target (85), playlistUrl, + wakeTime ("HH:MM"), + onboarded (bool)
- `courses/{id}`: name, code, order, color (#hex), confidence (0–10), level, mandatoryHw, examDate, grading, ai (legacy text, kept), notes, + aiSolve ("forbidden" | "allowed"), + aiSolveVerified (bool)
- `units/{course}-{l|r|e|x}{n}`: courseId, kind (lecture | recitation | exercise | summary), num, title, status (not_started → read → example → solo → exam; legacy practiced = solo, mastered = exam), confidence (0–5), missed, fileId
- `tasks/{id}`: courseId, title, date, start, minutes, status (todo | done | min | skipped), priority, unitIds[], warmup, minVersion, where, recall (yes | part | no), noRecall. Ids `t{MMDD}-{n}`, `w{MMDD}`. Tasks added from app suggestions also carry `source: "suggestion:<kind>"`.
- `deadlines/{id}`: courseId, title, kind (hw | exam | quiz | admin), due (ISO +02:00), estHours, status (open | submitted | missed), verified, source, + graded (bool)
- `checkins/{YYYY-MM-DD}`: date, did, wentWell, blocked, energy, sleep, tomorrow, firstWhen, firstWhere
- `habits/{id}`, `habitlog/{YYYY-MM-DD}`: unchanged
- `sessions/{id}`: kind (block | class | breathe | music), taskId, courseId, startedAt, endedAt, focusMin, breath, zone[], goal, recall. Condisco writes the id as `s{startMs}` so two tabs finishing the same block write one doc; old Study Hub ids are kept.
- `mocks/{auto}`: courseId, title, score, timed, date, createdAt. Ready = the last two timed mocks both ≥ target.
- `meta/open`: items[]
- + `practice_items/{id}`: courseId, unitId, prompt, source, box (1–4), due (YYYY-MM-DD), lastResult (right | wrong | null), createdAt, updatedAt. Leitner: wrong → box 1, due +1 day; right → next box, due +3 / +7 / +14 days.
- + `errors/{auto}`: courseId, unitId?, taskId?, mockId?, what, kind (concept | careless | time | reading | unknown), fix, resolved, createdAt
- + `feedback/{auto}` (pilot): date, skill ("app" from the app's settings form, or a skill name), rating (1–5), worked, broke, wish, createdAt

## Suggestion priority (app, Today screen, when fewer than 2 tasks are open)
deadline within 7 days > missed unit still not started > course whose last-2 timed mock average is under target > practice items due.
