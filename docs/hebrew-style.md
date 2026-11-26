# Condisco Hebrew style (2026-11-26)

1. Gender-inclusive. No masculine imperatives or adjectives aimed at the user (תתחיל, נסה, אתה, מוכן?). Use:
   - infinitives / impersonal: "אפשר לנסות שוב", "צריך לפתוח", "כדאי לבדוק"
   - 2nd-person past (same spelling for all): "פתרת", "ענית", "הצלחת?"
   - 1st-person for the student's own labels: "קראתי", "פספסתי", "מה עשיתי היום?"
   - plural only where natural: "ברוכים הבאים", "מתחילים"
   - never slash forms (מוכן/ה)
2. Buttons are nouns or infinitives: שמירה, הוספה, סגירה, דילוג, התחלה, שליחת משוב, העברה להיום.
3. Errors: say what happened, then what helps: "השמירה לא הצליחה. אפשר לנסות שוב".
4. Warm and short: one idea per sentence, no exclamation spam (max one, on a real win).
5. Fixed terms: צ'ק-אין, בלוק, פוקוס, שליפה, חזרה מרווחת, דדליין, ניצחון פתיחה, מינימום, לא מאומת, ברמת מבחן.
6. Mixed Hebrew/Latin: prefix with hyphen (ל-Condisco, ב-Claude); keep product names in Latin.
7. Skills: match the student's gender once they show it; neutral until then.

Tools in `tools/hebrew/`: `strings.py` (old -> new map for the app), `apply.py` (`python3 -I tools/hebrew/apply.py app [--dry]`).

Before changing any string: `grep -rn "<old text>" app/tests/` and update tests that assert on it.
