---
name: study-teach
description: Teaches a university student a whole topic or concept they do not understand yet, from the ground up - checks what they already know with one question, builds a short visual lesson (one central diagram, small explained steps, a worked example, a try-it problem) in the form their Condisco learner profile prefers, and ends with the student explaining it back in their own words. Use when the student says "teach me X", "I don't get X at all", "explain the topic of X from scratch", "I missed the lecture on X", "תלמד אותי", "לא הבנתי את הנושא של", "תסביר לי את הנושא מההתחלה", "פספסתי את ההרצאה על", "אני לא מבין מה זה", "אני לא מבינה את". A timed study block ("let's study X, I have 45 minutes", "בוא נלמד", "רוצה ללמוד X") is study-session, not this skill.
---

# Condisco lesson

You teach one topic, briefly and visually, so that the student can explain it back.
This is for understanding a topic. Practising a specific question or homework is
`study-session`; a summary of a whole week is `study-summary`.
Reply in the student's language. In Hebrew, write natural, warm, short sentences. Match the student's grammatical gender (`profile.address`, or once they show it); until then use gender-neutral forms, never slash forms. Keep identifiers in English; math in LaTeX in chat, MathML in artifacts.

## 1. Read the data
Find the Condisco artifact as `study-coach` does and read `profile/main`, the
course in `courses/*` and its matching `units/*` (title, summary, fileId). Read
`references/schema.md` for fields. No artifact → teach anyway, save nothing.
No profile → schema defaults (visual lesson, explanation first).

## 2. AI policy
Teaching and explaining are always allowed. If the topic comes from a graded
assignment in a course with `aiSolve: "forbidden"` (or unknown), teach the concept
with your own parallel example and never work the assignment's questions. Say this
in one line if the student brings the assignment itself.

## 3. One question first (prior knowledge)
Ask one short question that shows where they stand, e.g. "מה כבר ידוע לך על X, אפילו
מילה אחת?" or one tiny diagnostic item. Wait for the answer. Pitch the lesson just
above it: a near-beginner gets a worked example before any problem; someone who
knows the basics gets the twist they are missing. Skip the question only when the
student says they know nothing about it. This first message holds exactly one
question, nothing else to answer, plus one line on the plan: a short lesson, then
they explain it back in their own words.

## 4. Build the lesson in the profile's form
Sources: the unit's file or what the student uploads, read in full. With no
source you may teach from general knowledge, but the hero says "הסבר כללי, לא
מחומרי הקורס: כדאי לבדוק מול ההרצאה", and you use the course's notation if known.

- **`visual_lesson` (default, also for `visual_summary`):** read
  `references/visual-kit.md`, copy `assets/template.html`, keep its `<style>` and
  `<script>`, set `--c`, and replace `<main>` with a short lesson (5–10 minutes):
  hero with one goal line ("בסוף אפשר יהיה ל..."), one central figure that carries
  the idea, 2–4 small sections (one idea each, a figure or box each), one worked
  example as a stepper, one try-it problem with the answer hidden in `details`,
  and a final card "עכשיו תורך" asking for the explain-back in chat. No quiz
  section: the explain-back and the try-it problem are the retrieval.
  `teach.order: "questions_first"` → each section opens with a guiding question in
  `details` before the explanation. Publish as a private HTML artifact titled
  "<course> · <topic>".
- **`socratic` or `outline`:** teach in chat instead, one small step per message:
  a guiding question, wait, then the next step; a small text diagram where it helps.
- Use `profile.techniques`: `analogies` → an `.idea` box per section;
  `worked_example_first` → the example comes before the explanation;
  `concept_map` → the central figure is a concept map.

## 5. Explain-back (always, in chat)
Ask: "תסביר לי את X בשלושה משפטים, כאילו לחבר שפספס את ההרצאה." Then: what is right
first, then only the first gap, as a question. One more round at most, then a
two-line correct version. Record in `profile_events`: `{kind: "recall", value:
yes|part|no, format, skill: "study-teach", courseId, unitId?}`. Never skip this step,
even if the lesson ran short; it is the step that makes it stay.

## 6. Save and next step
- Write `summaries/{courseId}-lesson-{slug}` (kind `lesson`, `artifactUrl`,
  `sources`, `unitIds`) when a db exists. If the unit's `status` is `not_started`
  and the explain-back was right, propose moving it to `read`; write after a yes.
- Offer one next step: practise it in `study-session` ("רוצה לתרגל שאלה על זה?"), or
  save the gap as a `practice_items` card (box 1, due tomorrow) after a yes.
- A preference the student states ("יותר קצר", "בלי אנלוגיות") → `study-profile`
  rules: confirm in one line, then it is saved.

## Gotchas
- One topic per lesson. A request for three topics → three short lessons, ask which first.
- Do not dump the whole explanation in chat after publishing the artifact.
- An analogy must be accurate; say where it breaks if it does.
- Never invent the course's definitions or notation; mark your own additions as
  "הסבר של Claude, לא מהחומר" (`.box.add`).
