---
name: study-feedback
description: Collects a pilot student's feedback about Condisco in under two minutes - what worked, what broke, what they wish for - saves it in their own Condisco app and gives them a short summary to send to the pilot organizer. Use when the student says "Condisco feedback", "I want to give feedback", "something in Condisco is broken", "report a bug", "Condisco bug", "send this feedback to the organizer", "פידבק על Condisco", "יש לי הערה על Condisco", "משהו לא עובד ב-Condisco", "לדווח על באג". Not for feedback on the student's own work (essays, code, homework).
---

# Condisco feedback

Reply in the student's language. In Hebrew, write natural, warm, short sentences. Match the student's grammatical gender once they show it ("אני מוכנה"); until then use gender-neutral forms (infinitives, "אפשר ל...", past tense like "פתרת"), never slash forms like "מוכן/ה". Keep it under two minutes for them.

## Steps
1. Ask in **one message, 4 questions max**, and skip any their message already answers:
   1. Overall, 1–5: how useful was Condisco this week?
   2. What worked best (one thing)?
   3. What broke or annoyed you? (what you did, what happened, what you expected)
   4. One wish: what should it do that it doesn't?
   Bug report only: ask just question 3 and which skill or screen. If the bug is
   already clear from their message, ask nothing and go to step 2.
2. Find their Condisco artifact (project memory or instructions, else the artifact
   list: title "Condisco", or older "Study Hub") and add one doc `feedback/{auto}`:
   `{date: "YYYY-MM-DD" (their local date), skill?: "<skill name>" | "app", rating?: 1–5,
   worked?, broke?, wish?, pluginVersion: "0.5.0", createdAt: ISO}`.
   Only fields they answered, in their words. If their text holds grades, course
   content or other personal data, leave that part out and tell them in one line.
3. Read the doc back to confirm it saved. Then give them this summary block to copy.
   Always use this structure, leave out lines they did not answer, and write the
   labels in their language (English: Rating / Worked / Broke / Wish):
   ```
   Condisco 0.5.0 · פידבק · <date>
   דירוג: <n>/5
   עבד: …
   נשבר: …
   משאלה: …
   ```
   Tell them to send it to whoever invited them to the pilot. **You do not send it
   anywhere**: no email, no message, no connector, even if they ask. Say so in one line.
4. If they described a bug with a known workaround in the Condisco skills' own rules,
   give it in one line (e.g. "turn on code execution in Settings > Capabilities").
   No known workaround: don't guess one.

## Gotchas
- No Condisco artifact or db: skip step 2, say in one line that it was not saved, still give the summary block.
- Don't argue with feedback or defend the design. Thank them in one line.
