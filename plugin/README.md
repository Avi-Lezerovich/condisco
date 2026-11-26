# Condisco

Condisco is a study partner for university students that lives inside Claude. It sets up a private study app (an artifact with its own owner-only database), plans each day from real data, runs focused study sessions that make the student produce first (retrieval, a hint ladder, and a closed-book recall question at the end), runs a short evening check-in, and builds backward plans before exams. It never invents course content, dates or grades: anything unconfirmed is marked unverified.

## Skills
- `study-setup`: four questions, publishes the private Condisco app, saves settings and courses, runs a database self-test.
- `study-coach`: daily plan, evening check-in (at most 3 questions, a plan of at most 5 lines), weekly review.
- `study-session`: one study session; also types up the student's own handwritten solutions verbatim (Markdown or LaTeX).
- `exam-mode`: backward exam plan, timed mocks from real past exams, error log, readiness check.
- `study-materials`: links each unit to its Google Drive file and writes a short summary from the file only (Drive is read, never changed).
- `study-sync`: manual, read-only "sync now" of Moodle and Piazza through Claude in Chrome (or a pasted page or screenshot). New deadlines enter as unverified; nothing is ever written to Moodle or Piazza.
- `study-feedback`: collects pilot feedback in under two minutes and gives a summary to send to the organizer. Nothing is sent automatically.

## AI policy
Learning and explaining with AI is always allowed. Each course has one switch, `aiSolve`, that says whether Claude may solve questions that get submitted. It starts as `forbidden` until the student confirms it from the syllabus.

## Data
All study data stays in the student's own private Condisco artifact on claude.ai, readable and writable only by its owner. The plugin itself holds no personal data and sends nothing elsewhere. Calendar events or messages are created only after an explicit yes.

## Requirements
A paid Claude plan (Pro or higher) with code execution on, and artifact storage (web or desktop).

## Install
Customize > Plugins > Add > Upload plugin, then choose `condisco-0.3.2.zip`. Then say "set up Condisco".

## Build
From the repository root: `npm run build:plugin` writes `dist/condisco-<version>.zip`. It copies the app from `app/` into `skills/study-setup/assets/app/`, so do not edit that folder by hand.
