Read this when you write or read any Condisco db document. Source of truth: the app's SCHEMA.md (copied here).

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
  + exam mode (all optional; a mock without them reads as a real past exam, timed unless timed is false): source (past-exam name or file), minutes (real exam length), tookMin, mode ("past" | "style"; style is always saved with timed: false and never counts).
- `courses/{id}` + exam mode: midtermDate (YYYY-MM-DD, already present in Study Hub data), examVerified (bool; a date on the course is verified only when true, else "לא מאומת"). An open `deadlines` doc of kind exam on the same day wins.
- `tasks/{id}` from the exam plan (app מבחנים screen or exam-mode skill): source "exam:<examId>", id `x{MMDD}-{examId}-{map|mock|rev|light}`; examId = the deadline id, or `<courseId>-final` / `<courseId>-mid`. Regenerating changes or removes only that source's tasks still in status todo.
- `meta/open`: items[]
- + `practice_items/{id}`: courseId, unitId, prompt, source, box (1–4), due (YYYY-MM-DD), lastResult (right | wrong | null), createdAt, updatedAt, + errorId (exam mode: the error that created it). Leitner: wrong → box 1, due +1 day; right → next box, due +3 / +7 / +14 days.
- + `errors/{auto}`: courseId, unitId?, taskId?, mockId?, what, kind (concept | careless | time | reading | unknown), fix, resolved, createdAt
- + `feedback/{auto}` (pilot): date, skill ("app" from the app's settings form, or a skill name), rating (1–5), worked, broke, wish, createdAt

## Skill additions (2026-11-26, study-materials / study-sync; optional fields, no migration, the app keeps unknown fields)
- units: + fileName, + fileModified (ISO), + summary (3-5 lines, <=600 chars), + summaryAt, + figures (bool)
- courses: + driveFolderId, + moodleUrl, + piazzaUrl
- deadlines: + sourceUrl, + extId, + syncedAt; source like "Moodle sync 2026-11-26"; a new or changed item is written verified:false; a re-sync keeps verified:true when the doc already has it and due is unchanged (the app's "אישור" sets verified:true)
- settings/main: + lastSync {moodle?, piazza?}

## Suggestion priority (app, Today screen, when fewer than 2 tasks are open)
deadline within 7 days > missed unit still not started > course whose last-2 timed mock average is under target > practice items due.

## Setup and coach additions (optional fields; the app keeps unknown fields)
- `settings/main`: + timezone (IANA, e.g. "Asia/Jerusalem"), + bestTime ("morning" | "afternoon" | "evening"), + firstBlock ("HH:MM"), + materials ("drive" | "moodle" | "local" | "mixed").
- `courses/{id}`: + aiSolveSource (file name or "student").
- `feedback/{auto}`: skills add pluginVersion.
- Field notes for study-materials: `units.fileModified` = Drive modified time; `units.summary` comes from the file only; `units.figures: true` means a text-only read missed figures (ask for an upload). `courses.moodleUrl` = site base URL; `deadlines.extId` = the site's event id.

## Rules for writes
- Never invent content, dates or grades. Anything not from the student's words,
  files or a shown source gets `verified: false` and a `source`, shown as "לא מאומת".
- Write only after the student said it, or after an explicit "yes" to your proposal.
- Every write to an existing doc needs its current version: read, then write.
- Never delete a doc unless the student asks for that doc by name.

## Learning additions (0.4.0: study-profile, study-summary, study-teach; additive, schema version stays 2, the app keeps unknown fields)
- + `profile/main` (one doc, the learner profile; written only by the `study-profile` skill and by the student in the app's Settings card):
  address ("m" | "f" | "neutral"), goal ("on_track" | "understand" | "exam_practice" | "get_back"), hoursPerWeek,
  defaultFormat ("visual_summary" | "visual_lesson" | "outline" | "worked_example" | "socratic" | "printable_sheet"),
  formats {<format>: {offered, chosen, recallYes}}, summary {length ("short" | "medium" | "deep"), language ("he_en_terms" | "source"), visuals ("rich" | "light")},
  teach {order ("explain_first" | "questions_first")}, techniques[] ("analogies" | "worked_example_first" | "feynman_explain_back" | "quiz" | "concept_map"),
  dislikes[] (≤ 10, the student's own words), videos {wanted (bool), maxMin}, block {minutes (15–50)}, hintDepth ("short" | "normal" | "long"),
  tone ("direct" | "warm"), load ("normal" | "light"), constraints {text, at} (optional; never quoted back, never leaves the db),
  meta {<field>: {source ("asked" | "observed" | "inferred"), n, updatedAt}}, interviewAt, updatedAt, version: 1.
  Defaults when a field or the doc is missing: address neutral, defaultFormat "visual_summary", summary {medium, he_en_terms, light}, teach.order explain_first, block.minutes 25, hintDepth normal, tone warm, load normal, videos.wanted false.
  Preferences change the wrapping only: retrieval, spacing and the closed-book recall at the end never switch off.
- + `profile_events/{auto}` (append-only, any skill): at (ISO), skill, kind ("format_offered" | "format_chosen" | "recall" | "hint" | "block_done" | "block_abandoned" | "asked" | "summary_feedback"), value, courseId?, unitId?, format?. summary_feedback values: more_visual | less_visual | shorter | longer | more_examples | good. Pruned after 180 days by the weekly review.
- + `summaries/{id}`: id `{courseId}-w{week}` for a week, `{courseId}-{unitId}` for one unit, `{courseId}-t-{slug}` for a topic, `{courseId}-exam` for an exam sheet, `{courseId}-lesson-{slug}` for a study-teach lesson.
  courseId, kind ("week" | "unit" | "topic" | "exam" | "lesson"), week?, unitIds[], title, format, artifactUrl, sources [{fileName, fileId?, unitId?}], quizCount, createdAt, updatedAt.
- units: + week (1–14, the semester week the unit belongs to; set by study-materials or study-summary after the student confirms).
- courses: confidence keeps its 0–10 scale; the interview asks 1–5 and stores ×2.
