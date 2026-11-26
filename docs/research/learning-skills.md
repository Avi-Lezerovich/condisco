# Learning skills research (2026-11-26, for Condisco 0.4.0)

Full plan and discussion (Hebrew): the project's "Condisco learning bundle" document. This file keeps the parts the code depends on.

## Existing Claude skills for studying (checked 2026-11-26)
No official Anthropic skill summarises course material. Community skills mostly write Markdown or Word files, have no learner profile and no per-course AI policy. We took ideas, not code.

| Skill | Source | Idea taken |
|---|---|---|
| frontend-design | [anthropics/skills](https://github.com/anthropics/skills) | Deliberate palette, one emphasis, no decoration (kit rules) |
| skill-creator | [anthropics/skills](https://github.com/anthropics/skills) | Trigger and no-trigger evals per skill |
| web-artifacts-builder | [anthropics/skills](https://github.com/anthropics/skills) | Not used: a React build step is too heavy; HTML + inline SVG is enough |
| teach | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/teach) | One lesson = one win; fluency vs storage strength; reusable components |
| infographic-cheatsheet | [Calvinkub/awesome-claude-study-skills](https://github.com/Calvinkub/awesome-claude-study-skills) | Per-concept boxes: analogy, core idea, worked example, trap; every formula gets numbers |
| lecture-to-summary-skills | [GraceLiao77](https://github.com/GraceLiao77/lecture-to-summary-skills) | Source tag per fact; check for an existing summary before writing a new one |
| study-notes-builder | [marcoangzc](https://github.com/marcoangzc/study-notes-builder) | Mark where the slides do not explain, and label Claude's own explanation |
| study-notes-skill | [zach-ss](https://github.com/zach-ss/study-notes-skill) | Few tags, used sparingly; depth that matches the idea |
| lecture-to-study-guide | [Jellypod-Inc/school-skills](https://github.com/Jellypod-Inc/school-skills) | Explicit trigger phrases as an eval base |

Directory scanned: [awesome-skills-plugins-for-students](https://github.com/StudentSuite/awesome-skills-plugins-for-students).

## Learning science used
| Finding | Source | Design rule |
|---|---|---|
| Matching instruction to a "learning style": 4 meta-analyses, 143 studies, d = 0.04 | [Hattie & O'Leary 2025, Educ Psychol Rev 37:31](https://link.springer.com/article/10.1007/s10648-025-10002-w) | The profile stores preferences, never a style label; no style question |
| Meta-analysis of matching: g = 0.31 but only 26% of outcomes show the required crossover; "too small and too infrequent" | [Clinton-Lisell & Litzinger 2024, Front Psychol 15:1428732](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1428732/full) | Same |
| Preregistered experiment, N = 222: no style × presentation interaction | [Melzner & Kappes 2025, Instr Sci 53:365](https://link.springer.com/article/10.1007/s11251-024-09689-1) | Same |
| No adequate evidence for learning-styles assessment in practice | [Psychol Sci Public Interest 2008, 9(3):105](https://pubmed.ncbi.nlm.nih.gov/26162104/) | Same |
| Words + pictures beat words alone, median d = 1.35; coherence 0.86, signaling 0.70, spatial contiguity 0.82, segmenting 0.67, pre-training 0.78, personalization 1.00 | [Mayer 2023, "Research-based principles for designing multimedia instruction"](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf) | Visual by default for everyone; every figure carries content; labels on the picture; one highlight; small sections; terms first |
| Drawing to learn helps only with integration support: g = 0.35 vs −0.15 | [Leutner & Biele 2025, Educ Psychol Rev 37:93](https://link.springer.com/article/10.1007/s10648-025-10067-7) | Any drawing task asks to connect parts, not to "draw it" |
| Retrieval protects memory under stress; guarded AI tutoring helps, answer-giving harms later | [learning-science.md](learning-science.md) (Smith 2016, Bastani 2025, Kestin 2025) | Every summary opens with a warm-up and ends with a hidden-answer quiz; lessons end with an explain-back |

Not read (bot checks): PubMed 32116958, PMC7940870.

## Platform facts (official docs only)
- Artifacts can be diagrams, documents and small interactive tools; they need code execution on ([support 9487310](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)).
- The Google Drive connector reads text only; images in files are not processed ([support 10166901](https://support.claude.com/en/articles/10166901-use-google-workspace-connectors)).
- Project memory is per project ([support 11817273](https://support.claude.com/en/articles/11817273)), so the profile lives in the app's db.
- Not verified: Claude's "Learning" style for Pro (the styles page returned 404). Formulas use MathML so no math library has to load inside an artifact.
