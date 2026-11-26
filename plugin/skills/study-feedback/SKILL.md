---
name: study-feedback
description: Collects a pilot student's feedback about Condisco in under two minutes - what worked, what broke, what they wish for - saves it in their own Condisco app and gives them a short summary to send to the pilot organizer. Use when the student says "Condisco feedback", "I want to give feedback", "something in Condisco is broken", "report a bug", "Condisco bug", "send this feedback to the organizer", "פידבק על Condisco", "יש לי הערה על Condisco", "משהו לא עובד ב-Condisco", "לדווח על באג".
---

# Condisco feedback

Reply in the student's language. In Hebrew, write natural, warm, short sentences. Match the student's grammatical gender once they show it ("אני מוכנה"); until then use gender-neutral forms (infinitives, "אפשר ל...", past tense like "פתרת"), never slash forms like "מוכן/ה". Keep it under two minutes for them.

## Steps
1. Ask in **one message, 4 questions max**:
   1. Overall, 1–5: how useful was Condisco this week?
   2. What worked best (one thing)?
   3. What broke or annoyed you? (what you did, what happened, what you expected)
   4. One wish: what should it do that it doesn't?
   If they came to report a single bug, ask only question 3 and which skill or screen.
2. Write `feedback/{auto}` in their Condisco db:
   `{date, skill?, rating?, worked?, broke?, wish?, pluginVersion: "0.3.1", createdAt}`.
   Only what they said; no personal data beyond it; never course content or grades.
3. Read it back and give them a summary block to copy, in this shape:
   ```
   Condisco 0.3.1 · פידבק · <date>
   דירוג: <n>/5
   עבד: …
   נשבר: …
   משאלה: …
   ```
   Tell them to send it to whoever invited them to the pilot. **You do not send it
   anywhere**: no email, no message, no connector.
4. If they described a bug with a clear workaround in the skills' own rules, give
   the workaround in one line (e.g. "turn on code execution in Settings > Capabilities").

## Gotchas
- No Condisco db found: skip step 2, still give the summary block.
- Don't argue with feedback or defend the design. Thank them in one line.
