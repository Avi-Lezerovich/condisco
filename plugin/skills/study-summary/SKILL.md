---
name: study-summary
description: Builds a university student's summary of a week, lecture, recitation, topic or whole course from their own course files, in the form their Condisco learner profile asks for - by default a visual artifact with a concept map, real diagrams, a step-by-step worked example, common traps and a short recall quiz with hidden answers. Use when the student says "summarize week 5", "summary of lecture 3", "make me a summary of this topic", "exam summary sheet", "תסכם לי את שבוע 5", "סיכום של הרצאה 3", "תכין לי סיכום על", "דף סיכום למבחן", "סכם לי את החומר של השבוע", "סיכום ויזואלי".
---

# Condisco summary

Goal: a summary the student actually opens and learns from: built only from their
course material, in their preferred form, and ending in retrieval, not rereading.
Reply in the student's language. In Hebrew, write natural, warm, short sentences. Match the student's grammatical gender (`profile.address`, or once they show it); until then use gender-neutral forms, never slash forms. Keep identifiers in English.

## 1. Read the data (always first)
Find the Condisco artifact as `study-coach` does and read `profile/main`,
`courses/*`, the course's `units/*`, and `summaries/*` for that course. Read
`references/schema.md` for field meanings. No artifact → say so in one line and
offer `study-setup`; you can still summarise uploaded files without saving.
No `profile/main` → use the schema defaults (visual summary, medium length,
Hebrew with English terms) and do not ask about preferences now.

## 2. Scope
- Course: from the message; if it fits two courses, ask one multiple-choice question.
- "Week N": units with `week == N`. If no unit has `week`, propose "שבוע N =
  הרצאה N + תרגול N" (by `num`) in one line, and save `week` on those units after
  a yes. Also: one lecture or recitation (`unitId`), a named topic, or the whole
  course for an exam sheet ("דף סיכום למבחן", kind `exam`).
- An existing `summaries/{id}` for that scope: send its link and ask if it should
  be rebuilt. Rebuild without asking only when a unit's `fileModified` is newer
  than the summary's `updatedAt`.

## 3. Sources (the student's material only)
- Read every file in scope in full: Drive via the unit's `fileId` (Google Drive
  connector), files uploaded to this chat, or project files. Note slide or page
  numbers for `.src` tags.
- The Drive connector reads text only; images inside files are not processed. If a
  unit has `figures: true` or the text keeps saying "see figure", say which file and
  suggest uploading it here for an exact figure; meanwhile redraw only what the
  text describes, captioned "שרטוט מחדש".
- No readable source: do not present general knowledge as the course's material.
  Ask for the files (upload or `study-materials`). If the student wants it anyway,
  build it with every section inside `.box.add` and the hero line "לא מחומרי הקורס".
- AI policy: summarising and explaining are always allowed. In a course with
  `aiSolve: "forbidden"` (or unknown), a graded homework or assignment is summarised
  as its topics and methods only: never its solutions, final answers or a worked
  version of its questions. Worked examples come from lectures, recitations or
  solved course examples instead. Past exams may be used only as the source says.

## 4. Plan before you build (in your head, not in the reply)
Big idea in two sentences; 3–6 concepts (each: one-sentence definition from the
source, the picture that explains it from `references/visual-kit.md` §4, an
analogy only if accurate); 1–2 worked examples from the material; traps the
material or recitation warns about; 4–6 recall questions answerable from the page;
a warm-up question on the core idea.

## 5. Build in the profile's format
Length (`profile.summary.length`): `short` = hero, map, up to 3 concepts, 3 quiz
questions (~5 min); `medium` = 3–5 concepts, a worked example, 4–5 questions (~15
min); `deep` = every concept, a worked example per concept, comparison table,
traps, 6 questions. Language: `he_en_terms` = Hebrew with each English term once
next to it; `source` = the files' language.

- **`visual_summary` (default) or `printable_sheet`:** read
  `references/visual-kit.md`, then copy `assets/template.html`, keep its `<style>`
  and `<script>`, set `--c` to the course colour, and replace `<main>` with this
  material following the kit's skeleton. `summary.visuals: "rich"` → a figure for
  every concept; `"light"` → a figure for at least every second concept. For
  `printable_sheet` use `short` or `medium` density and tell the student it prints
  well (Ctrl+P). Publish it as a private HTML artifact titled
  "<course> · שבוע <n>" (or "· <topic>"). Inline SVG only: no external images, no
  scripts beyond the kit's own.
- **`outline`:** the same plan as a text document (Markdown artifact): headings per
  concept, one-line definitions with sources, the worked example as numbered steps,
  traps, and the quiz with answers at the very end under "תשובות".
- Videos: only when `profile.videos.wanted`. Use a course recording the student has
  (Drive or Moodle file) or a video you found with web search and opened, no longer
  than `videos.maxMin`. Never a link from memory. None verified → no video card.
- Run the kit's checklist (§7) before publishing.

## 6. Save and report
- Write `summaries/{id}` (`{courseId}-w{week}` etc., see schema) with `artifactUrl`,
  `kind`, `format`, `unitIds`, `sources`, `quizCount`, `createdAt`/`updatedAt`.
  Append `profile_events` `{kind: "format_chosen", value: <format>, skill: "study-summary", courseId}`.
- Reply in ≤ 5 lines: the link; what is inside (concepts, figures, questions);
  which files it came from; anything missing (unreadable file, figures to upload).
- Last line, one question: "איך הסיכום? יותר ויזואלי / קצר יותר / יותר דוגמאות /
  מעולה ככה". The answer → `profile_events` `{kind: "summary_feedback", value}`. A
  clear stated preference ("תמיד קצר יותר") → follow `study-profile` ("Statements
  during use"): confirm in one line, then it is saved to the profile.
- "שמור לי את מה שלא ידעתי" after the quiz → propose `practice_items` (box 1, due
  tomorrow, `source: "summary:<id>"`), one per missed question, and write after a yes.

## Gotchas
- Never invent course content, notation, dates or exam emphasis. A claim not in the
  files goes in `.box.add`. "The lecturer stressed" only when the source shows it.
- Use the course's notation and terms, even where you would write it differently.
- The profile shapes the page but is never printed in it, and nothing personal goes
  into the artifact (no grades, no constraints, no names beyond the course).
- A big week (many long files): finish one concept section at a time; if the page
  would pass ~150 KB, drop to the next shorter length and say so.
- Do not reread the summary to the student in chat: the artifact is the product.
