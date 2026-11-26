# Condisco visual kit (v1)

Read this before building a visual summary or lesson. The page is `assets/template.html`: copy it whole, keep its
`<style>` and `<script>` blocks, set `--c`, and replace everything inside `<main>` with the student's material.
The demo content in the template (merge sort) is only an example of the components; never ship it.

Contents: 1 Principles · 2 Page skeleton · 3 Components · 4 Which picture for which content · 5 Drawing SVG ·
6 Hebrew, English and math · 7 Before you publish

## 1 Principles (from multimedia-learning research)
- **Every picture carries content.** A figure shows a structure, a process, a comparison or a worked case from the
  material. No decorative images, no stock art, no generated illustrations of unrelated things (coherence).
- **Words sit on the picture.** Labels go inside or next to the part they name, not in a legend below (contiguity).
- **Signal what matters.** One yellow `mark` / `node-m` per section at most: the thing to remember. Cobalt and the
  course colour carry structure, not emphasis.
- **Small pieces.** One concept per section, one idea per sentence, sentences under 25 words (segmenting).
- **Terms first.** The map and the hero name the week's terms before the detail (pre-training).
- **Retrieval, not rereading.** The page opens with a warm-up question and ends with a quiz whose answers are hidden.
- **Personal, warm, short.** Address the student in neutral Hebrew (see the plugin's Hebrew rules), no lecturing tone.

## 2 Page skeleton (in this order; drop what the content does not need)
1. `header.hero`: `.crumb` (course, week, sources), `h1` (the week's idea in ≤ 8 words), `.big` (2 sentences: the
   big idea), `ul.cando` (2–4 "after this you can …" lines), `.meta` chips (reading time, counts).
2. `nav.toc`: one chip per section, anchors to section ids.
3. `#warm`: `.warm` with one question and a `details` answer. A pretest on this week's core idea.
4. `#map`: the concept map (one SVG, 3–6 nodes, the must-remember node as `node-m`).
5. One `section` per concept (3–6 per week): `.sec-h` with number, Hebrew term and `.en` English term; `.card` with
   `p.one` (one-sentence definition + `.src`), then the figure and the boxes it needs.
6. Optional: `#cmp` comparison table, `#traps` common mistakes, a video card.
7. `#quiz` (`data-quiz`): 4–6 `details.q` questions with `.rate` buttons and `p.score`.
8. `footer`: sources list, the box legend, the provenance line.

## 3 Components
| Class | Use for | Notes |
|---|---|---|
| `.box.idea` (label "כמו") | an analogy or intuition | Only when it is accurate; say where it breaks if it does. |
| `.box.core` (label "בדיוק") | the precise definition, theorem, rule | In the course's own wording and notation. |
| `.box.ex` + `ol.steps.stepper[data-stepper]` + `.stepbar` | a worked example, one step per `li` | Real numbers, final answer in the last step. The stepper shows one step at a time. |
| `.box.trap` (label "טעות נפוצה") | a mistake the material or recitation warns about | Not invented pitfalls. |
| `.box.add` (label "הסבר של Claude, לא מהחומר") | anything you add that is not in the files | Required for every addition: intuition, gap fill, alternative proof. |
| `.src` | where a fact comes from: "הרצאה 5, שקף 7" | One per paragraph or box that comes from a file. |
| `.formula` with `<math display="block">` + `.say` | a key formula | `.say` reads it in words. |
| `.tbl > table` | items × attributes (algorithms, definitions, cases) | `td.win` marks the best cell in a row. |
| `figure > svg + figcaption` | every drawing | The caption says what to notice, not what it is. |
| `.warm` + `details` | the opening question | Answer hidden until opened. |
| `details.q` + `.rate` | quiz questions | Questions ask to recall, explain or apply; not to recognise. |
| `a.vid` (`.play` + text) | a video or recording | Only a link you opened and verified, or the course's own recording. Never a link from memory. |

Video card markup: `<a class="vid card" href="URL"><span class="play"></span><span><b>title</b><br><small>source · minutes</small></span></a>`.

## 4 Which picture for which content
| Content | Picture |
|---|---|
| The week as a whole | concept map: central node + 3–6 nodes, edges as elbows (template `#map`) |
| A process, an algorithm's phases, a pipeline | flow: boxes left-to-right in reading order (right-to-left in Hebrew), arrows between |
| Recursion, divide and conquer, a hierarchy, a tree | tree, top-down (template `#c1`) |
| A cost that adds up per level / per step | banded rows with the per-row total at the edge (template `#c3`) |
| An algorithm running on data | stepper with the data state after each step; for arrays draw cells as small rects |
| A proof | chain of claims: numbered boxes top-down, each arrow labelled with the reason ("לפי למה 2") |
| States and transitions (automata, protocols) | circles for states, labelled arrows; start arrow, double circle for accept |
| Sets, events, probability | Venn diagram or a probability tree with branch probabilities on the edges |
| A function, a growth rate, a distribution | small plot: axes, 1–3 curves, labelled directly at the curve end |
| Two or more options compared on several traits | table, not a picture |
| A network, packets, layers | stacked layer bands, or nodes and links with labels on links |
If the slides had a figure that the text read could not see (`units.figures: true`), redraw it only from what the
text and the student describe, caption it "שרטוט מחדש", and suggest uploading the slide for an exact copy.

## 5 Drawing SVG
- `viewBox="0 0 480 H"`, phone first (it shows at about 0.7 on a phone, up to 520 px wide on a desktop). Keep text
  at the kit sizes: base 19, `.t-s` 16, `.t-d` 22. Never make a figure wider than 480 units: stack instead.
- `role="img"` + `aria-labelledby` pointing at a `<title>` that states the figure's point.
- Colour only through the kit classes: `node`, `node-c` (course colour), `node-m` (must remember; text on it gets
  `on-m`), `edge`, `edge-c`, `dash`, `soft` (bands), `fill-c`, `fill-m`, `fill-ok`, `fill-bad`, `t-s`, `t-b`, `t-d`.
  No hex colours inside SVG: they break dark mode.
- Box width ≥ text length × 10 + 24 for 19px text (× 8.5 for `.t-s`). Count before writing. Break long lines into
  two `<text>` elements 22 units apart.
- Labels centred (`text-anchor="middle"`), y = box centre + 6. Arrows start and end on box edges and never cross a
  label. Use elbows (`V`/`H` paths) when a straight line would cross a box.
- Math or code inside SVG: a separate `<text direction="ltr">`. Do not mix Hebrew and a formula in one text node.
- 3–12 shapes per figure. More than that → split into two figures.

## 6 Hebrew, English and math
- `<html lang="he" dir="rtl">` stays. Course terms: Hebrew term + `<span class="en">English term</span>` once, in
  the section heading; afterwards use the term the course uses.
- Any Latin, number list or formula inside a Hebrew sentence goes in `<bdi>` (or `<bdi dir="ltr">` for a run with
  punctuation, like `a = 2, b = 2`). Inline math: `<bdi><math>…</math></bdi>`.
- Math is MathML (`<math>`, `<mi>`, `<mn>`, `<mo>`, `<mfrac>`, `<msup>`, `<msub>`, `<msqrt>`, `<munderover>`),
  rendered by the browser with no library. Display formulas use `<math display="block">` inside `.formula`.
- Code: `<pre dir="ltr"><code>` inside a `.card`, ≤ 15 lines.

## 7 Before you publish (check every item)
- [ ] Nothing from the demo (merge sort) is left unless it is really this week's material.
- [ ] Every fact from a file has a `.src`; every addition is inside `.box.add`.
- [ ] No graded-assignment solution when the course has `aiSolve: "forbidden"` (topic and method only).
- [ ] Each concept has a figure or a box that a picture would not do better; at least one figure per 2 concepts.
- [ ] Quiz: 4–6 questions, answers hidden, each answerable from this page.
- [ ] Every SVG ≤ 480 wide, uses only kit classes, has a `<title>`.
- [ ] Links: only verified ones. No video card if none was verified.
- [ ] Title is "<course> · שבוע <n>" (or "· <topic>"). Length fits `profile.summary.length`.
