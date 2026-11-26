# Learning science base for Claude Student (checked 2026-11-25)

Status key: ✅ read today (abstract/full text) · ◻ carried over from Study Hub notes (24–25.11), not re-read today · ⚠ weak/indirect evidence.

## Already in Study Hub (◻)
- Practice testing g≈.70; worked examples g=.48 in math, with expertise reversal; spaced / successive relearning.
- Implementation intentions d=.65; habits ~66 days avg (Lally 2010), a missed day doesn't matter.
- Acute exercise before study SMD≈.33 (Psych Bull 2025 meta-review); regular wake time (Phillips 2017).
- Music with lyrics hurts reading/memory d≈-.3; lo-fi instrumental ≈ neutral (PMC10162369).
- Cyclic sighing 5 min/day > mindfulness for mood and respiratory rate (Balban 2023, Cell Rep Med).

## Stress, trauma and cognition
- ✅ Scott et al. 2014, Psych Bull 141(1):105–140, meta-analysis 60 studies N=4,108: PTSD linked to deficits in verbal learning d=-.62, processing speed -.59, attention/working memory -.50, verbal memory -.46. Larger in treatment-seeking samples. → Short blocks, low working-memory load, written external structure, no multi-tasking. https://pmc.ncbi.nlm.nih.gov/articles/PMC4293317
- ⚠ Rehman et al. 2020, AIMS Neurosci: small–moderate deficits in elderly war survivors; high risk of bias; low transfer to students. https://pmc.ncbi.nlm.nih.gov/articles/PMC7815483
- ✅ Smith et al. 2016, Science 354:1046: stress 24 h after learning impaired memory for restudy learners; retrieval-practice learners were protected. → Retrieval practice is the default study mode, especially before exams. https://ui.adsabs.harvard.edu/abs/2016Sci...354.1046S
- ◻ Vogel & Schwabe 2016, npj Sci Learn (review: stress narrows attention, impairs retrieval, shifts to habit memory; stress at test hurts recall). Page not retrievable today → re-check. https://pmc.ncbi.nlm.nih.gov/articles/PMC6380371
- ✅ Dopelt & Houminer-Klepar 2024, EJIHPE 14(8): N=625 Israeli college students after 7 Oct: moderate–high stress; poorer sleep in conflict areas. Cross-sectional, one college. https://cris.bgu.ac.il/en/publications/war-related-stress-among-israeli-college-students-following-7-oct/
- ✅ Martinez-Rubio et al. 2023, PLoS ONE (N=589 students, cross-sectional): experiential avoidance β=.43 predicted perceived stress; self-compassion β=-.23 protective. ⚠ correlational. → Non-judgemental restart after missed days; tiny "minimum version" tasks to beat avoidance. https://pmc.ncbi.nlm.nih.gov/articles/PMC9897529/
- ⚠ Trauma-informed teaching (safety, predictability, choice, collaboration, strengths) — principles from SAMHSA-style frameworks; higher-ed outcome evidence is thin; sources couldn't be read today. Use as design values, not as proven effects.
- ⚠ Returning to study after a long break: no strong direct trial found today. Infer from above: rebuild self-efficacy with mastery experiences (warm-up win), diagnose gaps rather than redo everything, start with worked examples (novice-like after a break), then fade.

## AI tutoring
- ✅ Kestin et al. 2025, Sci Rep 15:17458, crossover RCT N=194 (Harvard physics): research-designed AI tutor beat in-class active learning, effect 0.63 (quantile 0.73–1.3 SD), in 49 vs 60 min; more engagement. Tutor used pre-written solutions, scaffolded step by step; ceiling effects. https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/
- ✅ Bastani et al. 2025, PNAS 122(26), ~1,000 high-school students: practice grades +48% (plain GPT) / +127% (guardrailed tutor), but after removal plain-GPT group scored 17% lower than control; guardrails largely removed the harm. → Never hand over final answers by default; hints first. https://papers.ssrn.com/abstract=4895486
- ✅ Contractor & Reyes 2026, arXiv:2607.08849, RCT N≈205 undergrads: AI access +0.28 SD immediately, +0.21 SD one week later (p=.068); gains persisted for "augmentation" use, faded for "automation" use. Preprint. https://arxiv.org/pdf/2607.08849
- ⚠ Kosmyna et al. 2025, arXiv:2506.08872, N=54: LLM essay writers had weakest EEG connectivity and couldn't quote their own work ("cognitive debt"). Small, preprint, essay task. → Closed-book recall at the end of every session. https://arxiv.org/abs/2506.08872

## Design rules derived (used in the spec)
1. Student produces first: attempt → hint ladder → worked step → full solution only on request (Bastani, Kestin).
2. Every session ends with a closed-book recall question (Smith 2016, Kosmyna).
3. Default study action is retrieval, not rereading; spacing via Leitner (◻).
4. Low-load blocks: one task, one goal line, 25–50 min, external plan on screen (Scott 2014).
5. Restart without guilt; minimum versions; warm-up win (Martinez-Rubio, ◻ self-efficacy).
6. Respect course AI policy: Probability = no AI on graded work at all; Networks = understanding only; mark graded items and switch Claude to "explain concepts only / refuse to solve".
