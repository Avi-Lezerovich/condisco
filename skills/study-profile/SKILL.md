---
name: study-profile
description: Keeps a university student's Condisco learner profile - runs the short first interview after setup (address form, confidence per course, study time, main goal, then how they like to learn with two tiny format samples), shows what Condisco knows about them, and records preferences they state at any time such as "I hate long text docs", "I like visual summaries", "shorter please", "explain with analogies". Use when the student says "what do you know about me", "update my learning profile", "change how you teach me", "I prefer visual", "I learn better with examples", "מה אתה יודע עליי", "תעדכן את הפרופיל שלי", "אני אוהב ללמוד עם", "אני אוהבת סיכומים ויזואליים", "מסמכי טקסט משעממים אותי", "תסביר לי יותר קצר", "תזכור שאני", "תזכור את זה עליי", "אני לומד הכי טוב כש", "אני אוהב סיכומים ויזואליים", or when study-setup hands over to the interview.
---

# Condisco learner profile

Goal: one small, honest profile (`profile/main`) that every Condisco skill reads,
so summaries and lessons come in the form this student actually opens and uses.
This skill is the only one that writes `profile/main`. Other skills only append
`profile_events`. Read `references/schema.md` for every field.

Reply in the student's language. In Hebrew, write natural, warm, short sentences. Match the student's grammatical gender once they show it (or from `profile.address`); until then use gender-neutral forms, never slash forms. Keep identifiers in English. At most 4 questions per message, multiple choice where possible, every question skippable with the default said out loud.

## Find the data
Find the Condisco artifact as `study-coach` does. Read `profile/main`,
`settings/main`, `courses/*`. No artifact → one line, offer `study-setup`.

## What the profile is, and is not
- It stores **preferences and facts the student gives**, plus what their own use
  shows. It never labels them ("visual learner"): matching teaching to a learning
  style does not improve learning (meta-analytic d ≈ 0.04). Never ask "are you a
  visual or auditory learner" or "which study method works best for you".
- Preferences change the wrapping only. Retrieval practice, spacing and the
  closed-book recall at the end of a session are never switched off, whatever the
  profile says. A chosen technique wraps the recall step (a Feynman explain-back
  counts as retrieval; rereading a summary does not).
- Never ask about trauma, diagnoses, war experience or past grades.

## First interview (after setup, or when `profile/main` is missing)
**Message 1, four questions** (courses come from setup; confirm, never retype):
1. איך לפנות אליך: בלשון זכר / בלשון נקבה / ניטרלי. Default neutral.
2. For each course found: how solid does it feel today, 1–5? Default 2.
3. Realistic study time: hours a week, and the best time of day (morning / afternoon / evening). Default 8 h, morning.
4. What should Condisco help with most: staying on track / understanding the material / exam practice / getting back into studying. Default getting back into studying.

**Message 2, three questions on how they like to learn.** Show, then ask. First
show two tiny samples of the same idea (from one of their courses if a unit
summary exists, else a neutral idea such as "a function maps inputs to outputs"):
**A** a small visual card as an artifact (one labelled diagram of ≤ 6 boxes, one
line of definition, one recall question, Hebrew, RTL, light and dark), and **B** the
same idea as a 4-line text outline. Then ask:
1. Which helps you more for a summary: the visual one (diagrams, illustrations, a quiz at the end) / the text outline / a printable one-page sheet?
2. How long should a weekly summary be: one screen (~5 min) / medium (~15 min) / full and deep?
3. When you don't get a topic: picture and explanation first, then questions / guiding questions first. And do you want short videos suggested (yes, up to N minutes / no)?
Also note anything they volunteer ("text docs bore me") as `dislikes`, in their words.

**Write** `profile/main` after the answers (one write), with `meta.<field>.source:
"asked"`, `n: 1`, `updatedAt`, `interviewAt`, `version: 1`:
address, goal, hoursPerWeek, `settings/main.bestTime`, course confidence (×2 into
`courses/{id}.confidence`, 0–10 scale), defaultFormat (visual → `visual_summary`,
outline → `outline`, printable → `printable_sheet`), summary {length, language:
"he_en_terms", visuals: rich if they chose visual else light}, teach.order,
videos, dislikes, techniques they named. Read it back. Then one line: "שמרתי. אפשר
לשנות בכל רגע: 'מה אתה יודע עליי'."

On day 2 or 3, the evening check-in may ask one optional question about current
constraints (reserve duty, work, health, family, "בלי לפרט"). Store only as
`constraints.text`, use it only to set `load: "light"` if they ask for it, and
never quote it back unprompted.

## "What do you know about me" (show and edit)
Show the profile in ≤8 plain lines, Hebrew labels, no field names: how to address
you, main goal, time per week, preferred format for summaries and lessons, length,
teaching order, techniques, things you dislike, videos. Mark each line with where
it came from: "אמרת" (asked) / "ראיתי מהשימוש" (observed). Offer to change or
delete any line. Write after a yes. "Delete my profile" → delete `profile/main`
after a yes; skills fall back to defaults.

## Statements during use (any time)
When the student states a preference in any chat ("קצר יותר", "אני שונא מסמכים
ארוכים", "תמיד תתחיל מדוגמה"):
1. Confirm in one line what you will save ("לשמור שסיכומים יהיו קצרים יותר?").
2. After yes: write the field, `meta.<field>` = {source: "asked", n: n+1, updatedAt},
   and append `profile_events` {kind: "asked", value}. A stated preference replaces
   the old value at once.
3. If it would switch off the core (e.g. "no quizzes ever"): keep the quiz but make
   it lighter (fewer questions, at the end, optional to open) and say why in one
   sentence: answering from memory is what makes the material stay.

## Weekly proposals (from the study-coach weekly review)
`study-coach` passes proposals built from `profile_events`. Apply only these rules,
and only after the student says yes to that line:
- Format: chosen in ≥ 60% of ≥ 4 offers, and recall "yes" with it not lower than
  with others → set `defaultFormat`; keep offering the other in 1 of 4 sessions.
- Summary feedback: the same `summary_feedback` value 2 times in a row (e.g.
  `shorter`) → change `summary.length` or `summary.visuals` one step.
- Blocks: ≥ 2 of the last 5 abandoned → `block.minutes` −5; 5 of 6 overran → +10 (range 15–50).
- Hints: mostly solved after hint 1 → `hintDepth: "short"`; often reached the last hint → `"long"`.
No change from fewer than 4 data points, one change per field per week, each shown
as one line: "שמתי לב ש-X, אז Y. להשאיר?". Observed changes get `source:
"observed"`. A field the student set in words in the last 14 days is not changed
by an observation without asking.

## Rules
- Every write to an existing doc: read, then write.
- The profile never leaves the db: not into plugin files, the page source, memory
  or a summary artifact (a summary may use it, never print it).
- Defaults when missing (see schema): skills work without a profile and ask at most
  one question.
