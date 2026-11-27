Read this before opening any Moodle or Piazza page.

# Pages to read (in order) and what never to touch

Moodle sites differ by university and theme. The paths below are Moodle's
standard ones; if a path does not exist on the student's site, use the
Dashboard and course pages instead and say so. Never guess a university URL:
take the site address from `courses/{id}.moodleUrl` or ask the student once
and save it (base address only, e.g. `https://moodle.example.ac.il`).

## Moodle, read-only pages
1. Upcoming events: `<base>/calendar/view.php?view=upcoming` — all courses,
   assignment and quiz due dates. Main source.
2. Dashboard Timeline: `<base>/my/` — cross-check; shows overdue items too.
3. Each course page: `<base>/course/view.php?id=<n>` — read the Announcements
   forum list (titles + dates) and new file names. Open an announcement post
   only to read its date and text.
4. An assignment page `<base>/mod/assign/view.php?id=<n>` only when 1–3 lack a
   date. Read "Due date" / "Cut-off date". Do not click anything on it.

## Moodle, never
- Quiz pages beyond the info page: "Attempt quiz" / "Start attempt" starts a
  timed, graded attempt. Never click it, even to "see the questions".
- "Add submission", "Edit submission", "Submit assignment", "Mark as done",
  any forum "Reply"/"Add discussion", "Subscribe", choice/feedback/survey forms,
  "Enrol me", profile, preferences, notification settings, messaging.
- Downloads: list file names only.

## Piazza, read-only
- Class page from `courses/{id}.piazzaUrl`. Read pinned and instructor posts
  (Instructor / note badge) since `lastSync`, or the last 14 days.
- Never post, reply, follow, mark "good question/note", vote, edit, or change
  email digest settings.

## When something blocks reading
Login page, 2FA, a cookie banner that needs a choice, a "Continue" consent
screen, or a page asking to confirm anything: stop and ask the student to deal
with it themselves, then continue.
