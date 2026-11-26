# Running and grading a mock exam

Read this before you start, time or grade a mock.

## Before
1. Pick the oldest unused real past exam for the course (check `mocks.source`).
2. Confirm: length (real exam minutes), allowed materials, which questions count.
3. Ask the student to set up like the exam: phone away, one sheet of allowed
   notes if the course allows it, a timer. Then send nothing until they say "סיימתי".

## During
- No hints, no checking. If they ask, say "נעבור על זה אחרי, זה חלק מהמדידה".
- If they stop early or pause, record `timed: false`.

## Grading
1. Get the official solution or rubric from their files. If none, solve each
   question with them afterwards; the student decides partial credit with you,
   using the course's usual point split.
2. Per question: points earned, points lost, and why (one line).
3. Total → `mocks/{auto}` = `{courseId, title ("2024 מועד א'"), score, timed, date, source, minutes, tookMin, mode: "past", createdAt}` (`tookMin` = minutes they actually used).
   Style practice (no real past exam) → `mode: "style"`, `timed: false`: it never counts for readiness.
4. Each lost point → `errors/{auto}` = `{courseId, unitId?, mockId, what, kind, fix, resolved: false, createdAt}`.
5. Each error → `practice_items/{id}` = box 1, due tomorrow, `source` = the mock, `errorId` = the error.
6. Close with the readiness line and the next mock date.

## Error kinds
- concept: didn't know or misunderstood the idea → worked example + 2 solo problems.
- careless: knew it, slipped → a checklist line ("check units", "re-read the condition").
- time: ran out of time → timed sets of 2–3 questions.
- reading: misread the question → underline-the-ask habit, 5 short drills.
- unknown: ask the student once, then pick one.
