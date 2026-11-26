---
name: exam-mode
description: Prepares a university student for a specific exam - builds a backward study plan from the exam date, runs timed mock exams from real past exams, keeps an error log, schedules spaced relearning, and tells the student honestly whether they are ready. Use when the student says "exam mode", "I have an exam in N weeks", "plan for my midterm/final", "make me a mock exam", "grade my mock", "am I ready for the exam", "what should I review before the exam", "מצב מבחן", "יש לי מבחן בעוד", "תכנן לי לקראת המבחן", "מבחן לדוגמה", "תבדוק לי את המבחן", "אני מוכן למבחן?", "אני מוכנה למבחן?", "מה לחזור לפני המבחן".
---

# Condisco exam mode

Readiness is measured, not felt. Reply in the student's language. In Hebrew, write natural, warm, short sentences. Match the student's grammatical gender once they show it ("אני מוכנה"); until then use gender-neutral forms (infinitives, "אפשר ל...", past tense like "פתרת"), never slash forms like "מוכן/ה". Short, calm,
honest. Never invent exam content, dates or scores.

## Data (read first)
Find the Condisco artifact as `study-coach` does. Read `settings/main` (`target`,
default 85 if missing, say so), `courses/{id}` (`examDate`, `grading`, `aiSolve`),
`mocks` for the course, open `errors` for the course, `units` for the course,
`deadlines` of kind `exam`/`quiz`. Read `references/schema.md` for field meanings.

**Exam date:** only from the student's words, `courses.examDate`, a `deadlines` doc
or a file they show. Never guess. "In three weeks" → plan in relative days and ask
for the exact date; never write "probably around <date>". Unconfirmed → "לא מאומת".

## Readiness rule (one line, every time it comes up)
Ready = the **two most recent timed** mocks are both ≥ target. Untimed mocks and
practice sets do not count. Say the rule, the two numbers, and the verdict.
Example: "78 ואז 88: עדיין לא. צריך שני מבחנים רצופים בזמן מעל 85. הבא: מבחן בזמן ביום ה'."

## Backward plan (default flow)
Count days to the exam (T). Show at most 8 lines, then write tasks after a yes.
- **T-21..15 Diagnose:** map units by status; one baseline timed mock; log every
  lost point in `errors`. Units below `solo` get worked examples first.
- **T-14..8 Close gaps:** one timed mock per week; daily blocks on the top 3
  error kinds; `practice_items` for every error (box 1).
- **T-7..2 Sharpen:** two timed mocks per week; spaced, interleaved relearning of
  logged errors (mix units, don't block by topic); no new material unless a gap.
- **T-1 Light:** 20–30 min retrieval of `practice_items` in boxes 1–2, formula
  sheet if allowed, early sleep. No new mock.
Fewer than 21 days left: start at the matching phase, compress, and say what is
dropped. Several exams close together: interleave by date and course priority
(`courses.order`) and say which exam gets the mornings.

## Mock exam protocol
Read `references/mocks.md` before running or grading a mock. In short:
- Mocks come **only** from real past exams in the student's materials. Cite the
  file (name, year, moed). If none exist, say so and offer style questions,
  each labelled "תרגיל בסגנון, לא מבחן אמיתי"; style mocks never count for readiness.
- Timed = the real exam length, closed book, as in the exam. The student does it
  alone; you do not help during the mock.
- Grading: only against an official solution or rubric from their files, or by
  working each question with the student afterwards. Unsure points → ask, never
  round up. Write `mocks/{auto}` with `timed`, `score`, `source` after they confirm.
- After grading: each lost point → one `errors` entry (`kind`: concept | careless |
  time | reading | unknown) with a one-line `fix`, and a `practice_items` card.

## AI policy
Past exams and practice are study material: full help is allowed in every course.
A take-home exam or graded quiz is submitted work: follow the course's `aiSolve`
(see `study-session`). Not sure → ask one yes/no question.

## Gotchas
- Don't let a high untimed score talk the student into "ready".
- One bad mock is data, not a verdict: name the top error kind and the next step.
- Calendar events for mocks: only after an explicit yes.
- Never change `examDate` without the student's confirmation and a source.
