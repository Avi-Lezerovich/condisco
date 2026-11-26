---
name: study-materials
description: Connects a university student's course materials in Google Drive to their Condisco app - finds each course's lecture, recitation and exercise files, writes one short summary per unit with its Drive fileId, and refreshes only files that changed. Use when the student says "connect my Drive", "index my course materials", "update my units from Drive", "what's in lecture 5", "I added new slides", "תחבר את הדרייב", "תסרוק את החומרים בדרייב", "תעדכן יחידות מהדרייב", "העליתי חומר חדש", "מה יש בהרצאה 5". A full study summary of a week, lecture or topic is study-summary.
---

# Condisco materials (Google Drive)

Goal: every unit in the Condisco db points to its real file and has a short,
honest summary, so planning and sessions start from the student's own material.
Reply in the student's language. In Hebrew, write natural, warm, short sentences.
Match the student's grammatical gender once they show it; until then use
gender-neutral forms, never slash forms. Keep identifiers in English.

## Before you start
- Find the student's Condisco artifact: project memory or instructions, else the
  artifact list (title "Condisco", or older "Study Hub"). Read `courses/*`,
  `units/*` and `settings/main`. Read `references/schema.md` for field meanings.
  No artifact → say so in one line and offer `study-setup`.
- This needs the Google Drive connector. Not connected → say so in one line and
  offer the fallback: upload files to the chat. Do not guess file contents.
- Drive is read-only here. Never create, move, rename, share or trash a Drive
  file, even if it looks messy or the student asks: say it is read-only and, if
  useful, list the suggested new names for the student to apply.
- Scope: this skill links files to units and writes the short `units.summary`.
  A full study summary of a week or topic for the student to learn from is a
  separate job; do not write it into `units.summary`.

## Step 1 — Map folders (once per course, then remembered)
- `courses/{id}.driveFolderId` set → use it. Otherwise search Drive for a folder
  by the course name or code, show at most 3 candidates (name + path), and ask
  which one. Save `driveFolderId` after a yes. Never pick silently.
- List files in the folder (and its direct subfolders). Classify each by name:
  lecture / recitation / exercise / summary / past exam / solution / syllabus /
  other. Unclear → "other", never forced.

## Step 2 — Match files to units
- Unit ids are `{course}-{l|r|e|x}{n}` (`l` lecture, `r` recitation, `e` exercise,
  `x` summary). Match by number in the file name ("הרצאה 5", "Lecture05", "Tirgul 3").
- Existing unit without `fileId` → propose the match. Existing `fileId` that
  points elsewhere → ask before changing it.
- A file or folder name with a week number ("שבוע 5", "Week05") → propose `week`
  on the matched units, so "summarize week 5" finds them (`study-summary`).
- File with no unit → propose a new unit doc `{courseId, kind, num, title,
  status: "not_started", fileId, fileName}`. Title from the file's own heading,
  else its name. Never mark status above `not_started` for a new unit.
- Past exams, solutions and syllabi are not units: list them in one line per
  course ("3 מבחני עבר: 2024 מועד א', ...") so `exam-mode` and `study-setup` can use them.
- Show the proposal in ≤8 lines per course (counts + anything unclear) and write
  after a yes.

## Step 3 — Summaries (one per unit)
Read each matched file with the Drive connector and write to the unit:
- `summary`: 3–5 lines, ≤600 characters, in the file's language. What the unit
  covers (main definitions, theorems, methods), in the file's own terms. No
  content that is not in the file. No solutions to graded exercises when the
  course has `aiSolve: "forbidden"`: summarise the topic, not the answers.
- `fileName`, `fileModified` (the file's modified time from Drive), `summaryAt` (now).
- `figures: true` when the text is thin or says "see figure" a lot. The Drive
  connector reads text only; images inside files are not processed. Say so and
  suggest uploading that file to the chat for a fuller summary.
- Unreadable file (scan, protected, too large) → no summary, `summary` left
  empty, one line telling the student which file and why.
Batch: at most 10 files per turn, so one turn stays short and a failure loses
little. Then show progress ("12 מתוך 31") and continue on "כן"/"continue". Summaries are reference only: they never change `status` or
`confidence`.

## Refresh ("I added new material")
Compare each file's modified time to `units.fileModified`. Re-summarise only
changed or new files. A unit whose `fileId` is no longer in the folder → tell the
student and keep the unit; never delete it. Report one line: new, updated,
unchanged, missing, unreadable.

## Rules
- Every write to an existing doc needs its current version: read, then write.
- Never invent a unit, a number or a date. A date found inside a file (e.g. "הגשה
  עד 3/12") → propose a `deadlines` doc with `verified: false`, `source:
  "<file name>"`, and let the student confirm. The syllabus is the exception: dates
  it states plainly may be `verified: true` with `source: "<syllabus file>"`.
- Personal data and summaries go only into the student's db, never into plugin files.

## Gotchas
- Drive search is by name and content; Hebrew and English names both occur.
  Search both ("הרצאה" and "lecture") before saying nothing was found.
- Two files for the same unit (slides + handwritten notes): link the slides as
  `fileId`, mention the other in the summary's last line by name.
- Shared folders from the course staff may change without notice: refresh, don't
  assume.
