# Claude platform facts — official docs only (checked 2026-11-25)

Rule: only what the official pages say. "not stated" = the docs do not say it → mark לא מאומת in the spec.

## Sources
- [S] support.claude.com/en/articles/12512180-use-skills-in-claude
- [D] claude.com/docs/skills/how-to
- [P] platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- [BP] platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- [AG] agentskills.io/skill-creation/best-practices
- [G] resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf (Jan 2026)
- [A] support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them (newest)
- [AS] support.claude.com/en/articles/9547008-share-artifacts
- [IA] claude.com/resources/articles/install-as-app (24 Nov 2026)
- [CA] code.claude.com/docs/en/artifacts
- [PO] claude.com/docs/plugins/overview · [PB] …/plugins/build · [PS] …/plugins/share · [PSub] …/plugins/submit
- [C] support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork · [CW] …/13345190-get-started-with-claude-cowork
- [PR] support.claude.com/en/articles/9517075-what-are-projects · [M] …/11817273 (chat search and memory)
- [GW] support.claude.com/en/articles/10166901-use-google-workspace-connectors
- [CH] support.claude.com/en/articles/12012173-getting-started-with-claude-in-chrome
- [ED] claude.com/solutions/education

## Skills
- Custom skills: Pro, Max, Ultra, Team, Enterprise, with code execution ON (Settings > Capabilities) [P][S].
- Upload: Customize > Skills > "+" > Create skill > Upload a skill [S]. ZIP top level = skill folder (`my-skill.zip/my-skill/SKILL.md`); verify with `unzip -l` [D].
- Frontmatter: `name` (kebab-case, ≤64, matches folder, no "claude"/"anthropic"), `description` (≤1024 chars, no `<` `>`/XML, third person, what + when + trigger phrases) [D][P][BP][G]. No README.md inside the skill folder [G].
- Body < 500 lines (~5k tokens); references one level deep; files >100 lines get a TOC; say when to load each file; gotchas in SKILL.md; give a default, not a menu [BP][AG].
- Progressive disclosure: metadata always loaded → SKILL.md when relevant → bundled files on demand [P].
- On claude.ai the whole skill folder is copied into the code-execution sandbox [D]. assets/ = templates Claude copies or fills [D][G].
- Evaluate: write ≥3 evals before long docs; test triggering, function, and compare with/without; no built-in eval runner on claude.ai [BP][G]. skill-creator helps measure [D].
- Sharing: built-in Share only on Team/Enterprise. Other plans: each person uploads to their own account [S]. A skill can be downloaded via "..." [S]. Everyone you share with gets all files → no secrets [D].
- Size limits: not published.

## Plugins (the better unit for public release)
- A plugin bundles skills, MCP connectors, commands, agents (+hooks) [PO][PB].
- Install on claude.ai: Customize > Plugins. Directory plugins on Pro/Max/Team/Enterprise. "Add marketplace" takes a GitHub/GitLab/Bitbucket repo URL (`owner/repo`). "Upload plugin" takes .zip/.plugin, also on personal plans [PO][PS].
- Self-added plugins are not reviewed by Anthropic [PO].
- Official directory: submit at claude.ai/directory/manage. Anyone on a paid plan can submit [PB]. Needs plugin.json (without it → Claude Code only), README ≥40 words, LICENSE, public GitHub repo before going live, data-handling questions (incl. under-18 use), security scan, human review per version; 10 submissions / 24 h [PSub][PB]. Turnaround: not stated. Standalone skills cannot be submitted, only plugins [PSub].
- A plugin or skill containing an artifact/app: **not stated** (לא מאומת).

## Artifacts
- Artifacts need "Code execution and file creation" ("Create and edit files" in the newer layout) in Settings > Capabilities; Team/Enterprise: Organization settings [A, checked 2026-11-27]. Skills need code execution too [S] → if a skill runs, artifacts are allowed.
- Create/edit on all plans; web + desktop; mobile can view/edit, sharing settings only on web/desktop [A].
- Persistent storage: Pro, Max, Ultra, Team, Enterprise on web and Desktop. Personal ("everyone keeps their own private data") or shared; the builder decides. Default 100 MB and 25,000 documents. Legacy artifacts (pre 16 Sep 2026): 20 MB, text only [A].
- Uploads: ≤20 MB per file, ≤5,000 files, 1 GB [A].
- Can call Claude (asks permission first; usage counts against viewer's plan) and use connectors (Pro+; not per-action-approval tools) [A].
- Private by default. Pro: "Anyone with the link", email invitations (beta). Levels: view / comment / edit. Artifacts that connect to other websites can't use link sharing [AS].
- Install as app: beta, all plans, Mac + Windows desktop, from the Share menu; needs online sign-in [IA].
- "Copy" a published artifact into your own chat: only for legacy artifacts; "Your version is separate" [A]. Whether a copy gets its own storage: not stated.
- Whether a viewer of a shared artifact gets personal storage: not stated.
- Whether Claude can read/write artifact data from chat: not stated in support docs. **Observed in the maintainer's account**: Study Hub uses `db` with owner-only rules and Claude reads/writes it from chat (db_get/db_write). Observed ≠ documented.
- Whether a skill can make Claude publish a bundled HTML file as an artifact with storage: **not stated** (לא מאומת). A separate test with another user was dropped on 2026-11-25.

## Projects and memory
- Projects: instructions + knowledge; paid plans get RAG (up to ~10× capacity) [PR]. Sharing projects: Team/Enterprise only [PR].
- "Each project has its own memory"; uses project memory + chat memory, not other projects'; on by default on Free/Pro/Max/Ultra [M].

## Scheduled tasks / Cowork
- Cowork: paid plans; desktop on all paid plans, web/mobile Pro+ [CW]. Scheduled tasks on all paid plans: hourly, daily, weekly, weekdays, manual; run in the cloud with the computer off; tasks needing local files run only locally [C][CW]. Create with /schedule [CW].
- Folder access only for connected folders; deletion needs permission [CW].

## Connectors and browser
- Google Drive: search/read Docs, Sheets, Slides, PDFs, images, Office (text only, embedded images not processed); upload/create [GW]. Calendar: read, create/update/delete events, availability. Approval before each write by default [GW].
- Claude in Chrome: paid plans incl. Pro; Chrome only (no mobile); reads/clicks/navigates/fills forms; scheduled browser tasks exist; "still risky" [CH].

## Learning features
- "Claude's learning mode works like a good tutor: it asks questions that help you find the answers yourself" [ED] — on the institutional education page. Availability for individual Pro users: not stated.
- No education/learning skill found in anthropics/skills README (skill folder listing blocked) — not stated.

## Conflicts between official pages
- Storage: 100 MB [A, newer] vs 20 MB [older copy]. → use 100 MB (newer); 20 MB = legacy.
- Public artifact links: allowed [CA] vs "cannot be made public" (Claude Code blog, Jun 2026). → treat public as unverified; design for "Anyone with the link".

## Observed during WS-1 (2026-11-25, Claude Code cloud session in the maintainer's account, NOT claude.ai chat)
- Publishing an HTML artifact with `{db:{rules:[{path:"",read:"owner",write:"owner"}]},user:{},desktop:{}}` was accepted; stored as "root read owner write owner". The root path `""` is valid (also stated in the runtime's own db type definitions, contract 0.2.99).
- Claude wrote meta/schema, settings/main, courses/* from the session and read them back (pass). Reading at access level `admin` returned nothing → owner-only holds even for editors.
- Test artifact (test data only): https://claude.ai/artifact/1CVq1bb19RaAEtpi7hQvQY
- Still open: whether a skill running in a claude.ai **chat** (uploaded plugin) can do the same. Closed by the maintainer's install test on claude.ai.
