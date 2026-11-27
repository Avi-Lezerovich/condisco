# Condisco

Condisco is a study partner for university students that lives inside Claude. It sets up a private study app (an artifact with its own owner-only database), plans each day from real data, runs focused study sessions that make the student produce first (retrieval, a hint ladder, and a closed-book recall question at the end), runs a short evening check-in, and builds backward plans before exams. It never invents course content, dates or grades: anything unconfirmed is marked unverified.

## Skills
- `study-setup`: publishes the private Condisco app, runs a database self-test, reads courses and syllabi from Moodle (read only) or uploaded syllabi, saves them after the student confirms, then hands over to the interview. On "update Condisco" it republishes the app in place (same link, same data) and checks that nothing was lost.
- `study-profile`: the short first interview and the learner profile every skill reads (format, length, teaching order, techniques, dislikes). Stores preferences, never a "learning style" label; retrieval and the closing recall question never switch off.
- `study-summary`: "summarize week 5": a summary of a week, unit, topic or course from the student's own files, in their preferred form; by default a visual page with a concept map, diagrams, a worked example and a recall quiz.
- `study-teach`: "teach me X": one prior-knowledge question, a short visual lesson, and an explain-back in the student's own words.
- `study-coach`: daily plan, evening check-in (at most 3 questions, a plan of at most 5 lines), weekly review.
- `study-session`: one study session; also types up the student's own handwritten solutions verbatim (Markdown or LaTeX).
- `exam-mode`: backward exam plan, timed mocks from real past exams, error log, readiness check.
- `study-materials`: links each unit to its Google Drive file and writes a short summary from the file only (Drive is read, never changed).
- `study-sync`: manual, read-only "sync now" of Moodle and Piazza through Claude in Chrome (or a pasted page or screenshot). New deadlines enter as unverified; nothing is ever written to Moodle or Piazza.
- `study-feedback`: collects pilot feedback in under two minutes and gives a summary to send to the organizer. Nothing is sent automatically.

## AI policy
Learning and explaining with AI is always allowed. Each course has one switch, `aiSolve`, that says whether Claude may solve questions that get submitted. It starts as `forbidden` until the student confirms it from the syllabus.

## Data
All study data stays in the student's own private Condisco artifact on claude.ai, readable and writable only by its owner. The plugin holds no personal data, has no server, and sends nothing to its developer or anyone else; the app loads only Google Fonts from outside. Claude reads Moodle and Piazza pages (through Claude in Chrome) and Google Drive files (through the student's connector) only when the student asks, read only, inside the student's own account. Calendar events or messages are created only after an explicit yes; feedback is copied and sent by the student.

## Requirements
A paid Claude plan (Pro or higher) with code execution on, and artifact storage (web or desktop).

## Install
Customize > Plugins > Add > Add marketplace, enter `Avi-Lezerovich/condisco`, and install Condisco (updates arrive automatically). Or Customize > Plugins > Add > Upload plugin with `condisco-0.5.0.zip` (no automatic updates). Then say "set up Condisco". After a plugin update, say "update Condisco" to bring the app to the new version.

## Build
From the repository root: `npm run build:plugin` writes `dist/condisco-<version>.zip`. It copies the app from `app/` into `skills/study-setup/assets/app/`, so do not edit that folder by hand.
