---
name: study-setup
description: Sets up and updates Condisco for a university student - publishes the private Condisco study app as an artifact with an owner-only database, runs a database self-test, reads the student's courses and syllabi from Moodle (read-only) or uploaded syllabi for them to confirm, then hands over to the study-profile interview. Also updates an existing app in place to the installed plugin version, keeping its data. Use when the student says "set up Condisco", "install Condisco", "update Condisco", "התקן Condisco", "להתקין לי Condisco", "תגדיר לי את Condisco", "עדכן את Condisco", "לעדכן את Condisco", or has just installed the plugin and asks what to do first. Also re-checks that an existing app and its database work. Not for a single course, deadline or check-in change, which other Condisco skills handle.
---

# Condisco setup

Goal: one private Condisco artifact for THIS student, its data in the artifact's
own `db`, readable and writable by Claude from chat, filled with the student's
real courses. The student types as little as possible: Condisco reads what it can,
the student confirms. About 10 minutes of their time.

Progress (copy and tick as you go):
```
- [ ] 0 No existing Condisco / Study Hub artifact
- [ ] 1 App published with db
- [ ] 2 db seeded, self-test line reported
- [ ] 3 Courses read and confirmed
- [ ] 4 Profile interview done
- [ ] 5 Hand-off sent
```

Reply in the language of the student's latest message: English in, English out, even though this skill's examples are Hebrew. In Hebrew, write natural, warm, short sentences. Match the student's grammatical gender once they show it ("אני מוכנה"); until then use gender-neutral forms: infinitives ("אפשר לכתוב לי", "כדאי לדעת"), "אפשר ל...", past tense like "פתרת", plural only where natural ("מתחילים"), never second-person forms like "תגיד", "שתדע", "תכתוב", "תרצה", "שתעלה", "אם אתה" (write "אפשר להעלות", "אם רוצים"), and never slash forms like "מוכן/ה". Keep identifiers in English.
Before sending a Hebrew message, check every word aimed at the student, error messages included: no "אתה"/"את", no verb starting with ת- that addresses them ("תפתח", "תרצה"); rewrite as "אפשר לפתוח", "כשרוצים".
At most 4 questions in one message, multiple choice where possible.

## Before you start
- Assume everything is already on and **try first**. If this skill is running, code
  execution is on, and code execution is also what artifacts need, so do NOT open
  with a list of settings to enable, plan checks or questions about the account.
  The first visible action is the publish in step 1.
- Look for an existing Condisco or Study Hub artifact (project memory, project
  instructions, or the artifact list). If one exists, do NOT publish a second one:
  say which one you found and offer to run only the self-test (step 2) on it,
  only the parts that are missing (courses in step 3, interview in step 4), or
  the update below when its `meta/install.pluginVersion` is missing or older than Condisco 0.5.0.
  A Study Hub db is fine to reuse: the app migrates it to the Condisco layout when it opens.
- If the student already wrote their courses, name or times in the first message,
  keep them: they are confirmed answers, do not ask again.

Say one short line ("מתקינים את Condisco…" / "Installing Condisco…") and publish.
Tell the plan (courses from Moodle or syllabi, then 4 short questions) only after
the app is up.

## Step 1 — Publish the app
Publish `assets/app/` **unchanged** as one artifact titled **"Condisco"**:
`assets/app/index.html` is the page, and every other file under `assets/app/`
(every file and folder, e.g. app.js, ds/, css/, core/, scenes/) goes along as a supporting file at
the same relative path (e.g. `core/store.js`). Do not rewrite, restyle, merge or
shorten any file. Keep it private (not shared). Declare these capabilities:

```json
{"db": {"rules": [{"path": "", "read": "owner", "write": "owner"}]}, "user": {}, "desktop": {}, "downloads": true}
```
The root rule (`path: ""`) makes every collection owner-only. `downloads` powers
the JSON export in the app's Settings.

**Only if the publish fails**, read `references/troubleshooting.md` and follow it:
match the exact error to one cause, and send at most 3 short lines: what failed,
the one fix, and "write 'continue setup' when it's done". No report of what you
checked, no menu of options. Publish again once they say it is done. Never improvise other storage (no
localStorage, no project files, no Google Sheets).

## Step 2 — Seed and self-test (report in ONE line)
Read `references/schema.md` first. Write with the artifact data tools this chat
offers (names vary, e.g. db_write / write_db), never into the page source:
- `meta/schema` = `{version: 2, app: "condisco", migratedAt: <now ISO>}`
- `settings/main` = `{timezone (ask only if you cannot tell), onboarded: false}` plus anything the student already said
- `meta/install` = `{pluginVersion: "0.5.0", publishedAt: <now ISO>, url: <artifact URL>}`
Read all three back and compare. Report exactly one line:
- `בדיקת db: עברה ✓ (3/3 נקראו בחזרה)` / `db self-test: pass (3/3 read back)`, or
- `בדיקת db: נכשלה — <what failed>` / `db self-test: FAIL — <step and error>`.
If chat cannot read or write the db at all, say so: the app still saves what the
student enters in it, but Claude cannot plan from it. Do not hide a failure.

## Step 3 — Courses and syllabi (read, then confirm)
**3a. Moodle, read-only (default).** Needs Claude in Chrome (paid plan, the
extension, desktop Chrome). Read `references/moodle.md` before the first page; its
never-touch list applies here in full. The student logs in themselves; never type
a password or handle 2FA. Ask once for the Moodle site address if unknown.
- Read "My courses" (`<base>/my/courses.php`, else the Dashboard) for this
  semester's course names and codes, then each course page, then its syllabus file
  if the course page links one (open it only to read).
- Per course, take only what the page or syllabus states: name, code, exam and
  midterm dates, grading, mandatory homework, and the AI rule for submitted work.
- A syllabus file that will not open in the browser: list it by name and ask the
  student to download and upload it here (reading a PDF inside Moodle through
  Chrome is not yet tested).

**3b. Fallback** (no Chrome, phone, or the student prefers it): ask them to upload
the syllabus files, or paste the course list. Then read them the same way.

**3c. Confirm.** Show what was found in at most 6 lines per message: one line per
course (name · exam date · AI rule · source file), anything unclear marked
"לא מאומת". The student confirms, fixes or adds courses. Only then write:
- `courses/{id}`: `{name, code?, order, color, examDate?, examVerified?, midtermDate?, grading?,
  mandatoryHw?, aiSolve, aiSolveVerified, aiSolveSource?, moodleUrl?}`. `order` from 1
  in the student's order; dates are `YYYY-MM-DD`; `examVerified: true` only for a date
  the syllabus states or the student confirms. The id is the name in lowercase ASCII,
  non-letters → `-`, at most 12 characters, with `2`, `3`… added on a clash (the app's
  own rule, e.g. `calculus-1`); a name with no Latin letters gets `c`, `c2`….
  The AI rule: `aiSolve: "forbidden"` unless the syllabus plainly allows AI to
  solve graded work; `aiSolveVerified: true` only when the student confirmed it
  from the syllabus. No rule found → `"forbidden"`, unverified, and say so in one sentence.
- Exam and homework dates → `deadlines/{id}` (`courseId`, `title`, `kind`, `due`,
  `status: "open"`) with `source: "<syllabus file>"`,
  `graded` per kind, `verified: true` only for items the student confirmed,
  else `verified: false`. Course pages and announcements never create a verified date.
Setup is the only place a scan may create courses (`study-sync` never does).
Never invent a course, date, grade or rule. Studying and explaining with AI is
always allowed; the switch only covers solving submitted work.

## Step 4 — Hand over to the interview
Now run the `study-profile` interview in this same chat (its "First interview"
section): 4 short questions, then 3 about how the student likes to learn. Do not
ask its questions here and do not ask for courses again. After it, set
`settings/main.onboarded: true`.

## Step 5 — Hand-off (≤5 lines)
- Link to the artifact. Ask them to open it once and confirm the status line says the db is connected.
- Offer (do NOT create) a daily evening check-in as a scheduled task, e.g. 22:30
  their time, which runs the `study-coach` check-in. Create it only after an explicit yes.
- Save the artifact link to project memory (if the chat has memory) so other chats find it.
- If materials are on Drive, offer once: `study-materials` ("תחבר את הדרייב"). Don't run it in setup.
- Tell them three things to try first: "מה ללמוד היום?", "תסכם לי את שבוע 3 ב<course>",
  "תלמד אותי <topic>". Feedback any time: "פידבק על Condisco".

## Update an existing app ("עדכן את Condisco")
A plugin update (automatic from the marketplace, or a new ZIP) changes only the
plugin. The student's app is a published copy and stays on its old version until
it is republished. Updating means: the same artifact, the same URL, the same db.
1. Find the existing artifact as in "Before you start". None: say so and offer the
   full setup instead. More than one: list them and ask which one holds their data.
2. Read `meta/install` (missing in apps set up before 0.5.0) and count the docs in
   `courses`, `deadlines` and `tasks`. Already on Condisco 0.5.0: say it is up to date
   and offer the self-test only.
3. Publish `assets/app/` exactly as in step 1 (unchanged files, same supporting files,
   same capabilities), **as an update of that artifact's URL**. Never publish it
   without the URL: that creates a second, empty app. If this chat cannot update an
   existing artifact, stop: say so in one line, publish nothing, point to `study-feedback`.
   A failed publish: `references/troubleshooting.md`, as in step 1.
4. Write `meta/install` = `{pluginVersion: "0.5.0", publishedAt (keep the old one),
   updatedAt: <now ISO>, url}`, read it back, and count the three collections again.
   Report exactly one line:
   - `עדכון: הושלם ✓ (Condisco 0.5.0, הנתונים במקום: 6 קורסים, 14 דדליינים, 40 משימות)` /
     `update: done (Condisco 0.5.0, data kept: 6 courses, 14 deadlines, 40 tasks)`, or
   - `עדכון: נכשל — <what failed>` / `update: FAIL — <step and error>`. Fewer docs after
     than before is a FAIL: say which collection, and do not write anything to fix it.
5. Ask them to reload the app page once (the old version can stay in an open tab).
Steps 3 to 5 of setup do not run on an update: courses, profile and the hand-off stay as they are.

## Gotchas
- Official docs do not say whether republishing an artifact keeps its db. That is why
  the update counts the docs before and after, and never "repairs" a mismatch itself.
- Publishing a second Condisco splits the student's data. Always check first.
- Asking the student to check settings before trying wastes their first minutes and is
  usually wrong: try, then diagnose from the real error.
- The student's answers are personal data: they go into the db only, never into
  the plugin files or the page source.
- Moodle: nothing is ever clicked that changes anything (submit, attempt, enrol,
  post, settings). Calendar events and emails: never in setup.
- The app also has its own first-run screen for an empty db. If the student filled
  it before talking to Claude, read what is there and skip what it already has.
