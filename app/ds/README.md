# Condisco design system in code (app/ds)

Source of truth: the **Condisco Design System** artifact, https://claude.ai/artifact/1Wq3HH1mTjxFr6yhLhtxEp
(README, `layout.md`, `motion.md`, `rtl-accessibility.md`, component guidelines and previews).

| File | What | Edit by hand? |
|---|---|---|
| `tokens.json` | copy of the artifact's `tokens.json` | yes, together with the artifact |
| `tokens.css` | CSS custom properties built from `tokens.json` (colours with `light-dark()`, type sizes `--fs-*`/`--lh-*`, `--space-*`, `--radius-*`, sizes, durations, easings, shadows) + legacy aliases for 0.5.x | no, generated |
| `base.css` | reset, body type, focus ring, reduced motion | yes |
| `shell.css` | scene band, header, tab bar (< 600px) / navigation rail (≥ 600px), toast, mini timer, window classes | yes |
| `components.css` | button, chip, segmented, card, next-up card, timeline, tags, fields, notes, empty states | yes |
| `palettes.css` | colours that belong to a picture (breathing pond, timer ring, idle screen over a scene) | yes, sparingly |

Load order (index.html): tokens → base → shell → components → palettes → `css/<screen>.css`.

## Change a token
1. Change it in the design-system artifact (tokens.json), so the reference and the code agree.
2. Copy the artifact's `tokens.json` to `app/ds/tokens.json`.
3. `node scripts/build-tokens.mjs` (writes `tokens.css` and the token block in `kit/template.html`).
4. `npm run sync:shared` (copies the kit into the summary skills), then `npm test`.

## Rules (enforced by `scripts/lint-css.mjs` in `npm run check`)
- In `app/css/*.css` and `app/ds/{base,shell,components}.css`: no hex or rgb colours, no px font sizes, no px radii above 5px, no physical left/right (logical properties only; `left:50%` centring and the safe-area gutter are allowed; mark a real exception with `/* phys-ok */`).
- One `.btn.primary` (cobalt) per view; `win` yellow only for done states and habits kept; `warn` is clay; course colours only on marks (dots, stripes, fills).
- Breakpoints (CSS can't read variables in media queries): 600px rail, 1024px two columns and taller band, 1440px large. Short screens: `(max-height:500px) and (min-width:600px)`.
- The legacy aliases at the end of `tokens.css` (`--muted`, `--sunk`, `--hero`, `--s1…`, `--r-*`, `--f-d`, `--f-b`) go away in 0.6; new code uses the token names.
