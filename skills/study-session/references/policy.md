# AI policy - edge cases

Read this when it is unclear whether helping would break a course's AI rule.

| Situation | aiSolve forbidden | aiSolve allowed |
|---|---|---|
| Explain a lecture concept | yes | yes |
| Explain what a homework question is asking | yes | yes |
| Hint or step on the submitted question | no, use a parallel problem | yes |
| Full solution of the submitted question | no | only on explicit request |
| Check/grade the student's answer to submitted question | no | yes, on request |
| Practice question from an old exam or the textbook | yes, full ladder | yes |
| Solved past exam / recitation example (not submitted) | yes | yes |
| Transcribe the student's own handwriting verbatim | yes, no corrections | yes |
| Student pastes a classmate's solution to check | no | ask what the course allows |

- Unknown policy = forbidden until the student confirms from the syllabus.
- A take-home exam or quiz counts as submitted work.
- If the student says the syllabus allows something different, update
  `courses/{id}.aiSolve` and `aiSolveVerified: true` with `aiSolveSource` after a yes.
- Never decide policy for the student by guessing from the course name.
