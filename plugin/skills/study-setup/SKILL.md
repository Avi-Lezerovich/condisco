---
name: study-setup
description: Sets up Condisco for a university student in about five minutes. Asks at most four questions, publishes the private Condisco study app as an artifact with an owner-only database, saves the student's settings and courses into it, and runs a database self-test. Use when the student says "set up Condisco", "install Condisco", "start Condisco", "התקן Condisco", "להתקין לי Condisco", "אני רוצה להתקין את Condisco", "תגדיר לי את Condisco", "להתחיל עם Condisco", or has just installed the plugin and asks what to do first.
---

# Condisco setup

Goal: one private Condisco artifact for THIS student, its data in the artifact's
own `db`, readable and writable by Claude from chat. Takes ≤5 minutes of their time.

Reply in the student's language (Hebrew if they write Hebrew). In Hebrew, write natural, warm, short sentences. Match the student's grammatical gender once they show it ("אני מוכנה"); until then use gender-neutral forms (infinitives, "אפשר ל...", past tense like "פתרת"), never slash forms like "מוכן/ה". Keep identifiers in English.

## Before you start
- Look for an existing Condisco or Study Hub artifact (project memory, project
  instructions, or the artifact list). If one exists, do NOT publish a second one:
  say which one you found and offer to run only the self-test (step 4) on it.
- Custom skills and artifact storage need a paid plan (Pro or higher) and code
  execution turned on. If the skill folder or tools are missing, say so in one line.

## Step 1 — Ask (one message, max 4 questions, multiple choice where possible)
1. First name (what Condisco should call you).
2. This semester's courses, one per line, with exam date if known.
3. Wake time and best study time: morning / afternoon / evening.
4. Where your materials live: Google Drive / Moodle / computer / mixed.
Default if they skip one: best time = morning, materials = mixed. Never invent
courses, dates or grades. An exam date the student is unsure of → `verified: false`.

## Step 2 — Publish the app
Publish `assets/app/` **unchanged** as one artifact titled **"Condisco"**:
`assets/app/index.html` is the page, and every other file under `assets/app/`
(every file and folder, e.g. app.js, css/, core/, scenes/) goes along as a supporting file at
the same relative path (e.g. `core/store.js`). Do not rewrite, restyle, merge or
shorten any file. Keep it private (not shared). Declare these capabilities:

```json
{"db": {"rules": [{"path": "", "read": "owner", "write": "owner"}]}, "user": {}, "desktop": {}, "downloads": true}
```
The root rule (`path: ""`) makes every collection owner-only. `downloads` powers
the JSON export in the app's Settings.

The app has its own first-run screen: with an empty db it asks name, wake time,
target and courses and seeds itself. Seeding from chat (step 3) is still the
default because it also runs the self-test.

**If publishing with `db` fails or the option is not available: stop.** Tell the
student plainly what failed (quote the error), that Condisco needs artifact
storage (Pro or higher, web or desktop), and do not improvise other storage
(no localStorage, no project files, no Google Sheets).

## Step 3 — Seed the db (never put data in the page source)
Read `references/schema.md` first. Then write, with the artifact data tools this
chat offers (names vary, e.g. db_write / write_db):
- `meta/schema` = `{version: 2, app: "condisco", migratedAt: <now ISO>}` (the app itself adds `appVersion` when it opens)
- `settings/main` = name, timezone (ask only if you cannot tell), wakeTime, bestTime, materials, onboarded: true
- `courses/{slug}` for each course: `{name, order, examDate?, aiSolve: "forbidden", aiSolveVerified: false}`

AI policy default: studying and explaining with AI is always allowed. Whether
Claude may *solve questions that get submitted* varies per course, so every course
starts at `aiSolve: "forbidden"` until the student confirms from the syllabus.
Tell them this in one sentence and offer to update it when they check.

## Step 3b — Syllabi (optional, offer once)
If the student has syllabus files (upload or Drive), offer to read them now. From
each, fill only what the file states: `examDate`, `grading`, `mandatoryHw`, and the
AI rule → `aiSolve`, `aiSolveVerified: true`, `aiSolveSource: "<file name>"`. Exam
and homework dates → `deadlines/*` with `verified: true`, `source: "<file name>"`,
`graded` per kind. Anything unclear stays `verified: false`. Show what you found in
≤6 lines and write after a yes. No files: skip, and say they can do it later.

## Step 4 — Self-test (report in ONE line)
Read back `meta/schema`, `settings/main` and one `courses/*` doc. Compare to what
you wrote. Report exactly one line:
- `בדיקת db: עברה ✓ (3/3 נקראו בחזרה)` / `db self-test: pass (3/3 read back)`, or
- `בדיקת db: נכשלה — <what failed>` / `db self-test: FAIL — <step and error>`.
If chat cannot read or write the db at all, say so: the app still saves what the
student enters in it, but Claude cannot plan from it. Do not hide a failure.

## Step 5 — Hand-off (≤5 lines)
- Link to the artifact. Ask them to open it once and confirm the status line says the db is connected.
- Offer (do NOT create) a daily evening check-in as a scheduled task, e.g. 22:30
  their time, which runs the `study-coach` check-in. Create it only after an explicit yes.
- Save the artifact link to project memory (if the chat has memory) so other chats find it.
- Tell them the three things to try first: "מה ללמוד היום?", "רוצה ללמוד <course>, יש לי 45 דקות",
  and the evening check-in. Feedback any time: "פידבק על Condisco".

## Gotchas
- Publishing a second Condisco splits the student's data. Always check first.
- The student's answers are personal data: they go into the db only, never into
  the plugin files or the page source.
- Capability rule format can differ by platform version. If the publish rejects the
  rules, report the exact error instead of guessing a new format more than once.
- The app is many files. If this chat's publish tool accepts only one HTML file,
  do not merge or rewrite the app: stop, say exactly that, and point the student to
  `study-feedback` so the organizer hears about it.
- If publishing fails only on the audio files (`audio/`), publish again without
  `audio/`: the app works without it (music shows as unavailable). Say so in one line.
- Calendar events, emails, Moodle: never in setup.
