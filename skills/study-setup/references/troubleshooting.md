# When the publish fails

Read this only after a publish in step 1 has failed. Before it, assume everything works.

Rules:
- Quote the exact error to yourself, match it to ONE row below, and give the student
  that row's fix only. No checklist of every setting.
- At most 3 short lines to the student, in their language, gender-neutral in Hebrew:
  what failed, the one fix, and "write 'להמשיך התקנה' / 'continue setup' when it's
  done". Don't list what you checked, don't name this table or its rows, don't offer
  a menu, don't start step 3 early.
- After they say it is done, publish again. Two failed fixes for the same error:
  stop, give the exact error, and point to `study-feedback`.
- Never switch to substitute storage (localStorage, project files, Sheets).

| Symptom | Likely cause | What to tell the student |
|---|---|---|
| A network or timeout error, or "try again" | Transient | Nothing yet: retry once silently. |
| Fails only on files under `audio/` (size or type) | Audio too large for this publish | Publish again without `audio/`; say in one line that music is unavailable and the rest works. |
| `db` / storage is rejected or not offered; the account is on Free | Artifact storage needs Pro, Max, Ultra, Team or Enterprise | Condisco needs a paid plan for the app's storage. Stop setup. |
| `db` / storage not offered and the student is on the mobile app | Storage works only on the web and Claude Desktop | Open this chat on claude.ai or Claude Desktop and write "להמשיך התקנה" / "continue setup". |
| No artifact tool at all in this chat | Not on a surface that publishes stored artifacts (e.g. the mobile app). Code execution is on, since this skill runs | Open this chat on claude.ai or Claude Desktop and write "continue setup". Only if they already are there: Settings > Capabilities > "Code execution and file creation" ("Create and edit files" in the newer layout); Team/Enterprise: an owner, under Organization settings > Plugins & skills, Policy tab. |
| The skill's `assets/app/` folder is missing or empty | Incomplete plugin upload | Re-upload the Condisco plugin ZIP from the release (Customize > Plugins). |
| The publish tool takes only one HTML file | This chat cannot publish a multi-file app | Do not merge or rewrite the app. Say so and point to `study-feedback`. |
| The capability rules are rejected | Rule format differs on this platform version | Report the exact error; do not guess a new format more than once. |
| Anything else | Unknown | Quote the error in one line and point to `study-feedback`. Don't guess a fix. |

Sources (official): support.claude.com/en/articles/9487310 (artifacts need "Code execution and file creation" in Settings > Capabilities; storage on Pro, Max, Ultra, Team, Enterprise, web and Desktop) and support.claude.com/en/articles/12512180 (skills need code execution; Team/Enterprise policy path).
