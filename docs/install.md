# Install Condisco (about 10 minutes)

Hebrew version: [pilot-guide.md](pilot-guide.md).

## You need
- A paid Claude plan (Pro or higher).
- claude.ai in a browser, or the Claude desktop app. You can use the app on your phone later, but install on a computer.
- **Settings > Capabilities > Code execution** turned on.

## Steps
1. In claude.ai: **Customize > Plugins > Add > Add marketplace**, and enter `Avi-Lezerovich/condisco`.
2. Find **Condisco** in that marketplace and install it. Installed this way, the plugin updates by itself.
   (Got a ZIP file instead? **Customize > Plugins > Add > Upload plugin**, and choose it without unzipping. A ZIP never updates by itself.)
3. Create a new project called "Study" and open a chat in it.
4. Write: **set up Condisco** (or **להתקין לי Condisco**).
5. Claude publishes your private Condisco app and checks that it saves data: you see `db self-test: pass` and a link. Open it once and bookmark it.
6. Claude reads your courses and syllabi from Moodle, read only (needs Claude in Chrome and you logged in to Moodle). Without Chrome, upload the syllabi. You confirm what was found; anything unclear is marked "unverified".
7. Four short questions (how to address you, how solid each course feels, time per week, what you need most), then three about how you like to learn, with two tiny samples to pick from.

## Try in the first week
- In the morning: **what should I study today?**
- A week's summary: **summarize week 5 in <course>**. A visual page with a concept map, diagrams, a worked example and a short quiz, built only from your files.
- A topic you don't get: **teach me <topic>**. A short visual lesson that ends with you explaining it back.
- Change how Condisco teaches you: **what do you know about me?**, or just say "shorter" or "more examples".
- When you sit down: **I want to study <course>, I have 45 minutes**
- In the evening: **evening check-in**
- Before an exam: **exam mode for <course>, the exam is on <date>**
- Handwritten solution? Take a photo and ask: **can you type this up in LaTeX?**
- Materials in Google Drive? Connect Google Drive in Settings > Connectors, then: **connect my Drive** (read only, nothing is changed)
- New deadlines on Moodle or Piazza: **sync now**. With Claude in Chrome it reads the pages itself; otherwise paste the page or a screenshot. It only reads, and new deadlines come in as "unverified" until you confirm them on the Deadlines screen.

## Updating
- The plugin updates by itself from the marketplace. Your app does not: it is your own copy, and it stays on the old version until you update it.
- When Condisco says a new version is ready (or whenever you like), write **update Condisco** in your study project. Claude republishes the app at the same link, keeps all your data, and checks it: you see `update: done` with your course, deadline and task counts.
- Then reload the app page once. Your bookmark stays the same.
- If you see `update: FAIL`, don't set Condisco up again (that makes a second, empty app). Write **Condisco feedback** and send the summary.

## Privacy
Your app and its data are private to your Claude account. Nobody else sees them, including whoever invited you. Condisco has no server of its own and sends nothing to its developer. Everything happens inside your Claude account: Claude reads Moodle or Piazza pages through Claude in Chrome (read only) and Google Drive files through the connector only when you ask, and writes only to your own app. Calendar events or messages are created only after you say yes.

## Feedback
Any time, write **Condisco feedback**. It takes under two minutes and ends with a short summary you can copy. Send it to whoever invited you to the pilot (WhatsApp or email is fine). Condisco never sends it for you.

## If something does not work
- Claude does not know Condisco: check that code execution is on and that the plugin is enabled in Customize > Plugins.
- You see "db check: failed": take a screenshot and add it to your feedback.
- The app says it has no data connection: open the link inside claude.ai while signed in to your own account.
