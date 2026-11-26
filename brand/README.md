# Condisco brand assets

**The mark: "the C that is also a page".** An open book seen from the front. The left page is a half sun rising from the side, shaped like the capital C of Condisco; the right page carries three lines of notes that get shorter, like a summary. Morning by the lake, a page of study and the first letter of the name in one shape.

Chosen by the student on 2026-11-26 after three rounds of concepts. It follows the Condisco Design System (morning at the lake): cobalt ground, highlighter yellow as the one "win" colour, light and dark themes.

## Files

| file | use |
| --- | --- |
| `condisco-icon.svg` | App icon, rounded tile, cobalt gradient. Default everywhere a square icon is shown. |
| `condisco-icon-dark.svg` | Same on a night-lake tile, for dark surfaces and dark home screens. |
| `condisco-icon-square.svg`, `condisco-icon-dark-square.svg` | Full-bleed squares for platforms that round the corners themselves (iOS, plugin icon). |
| `condisco-icon-small.svg`, `favicon.svg` | Simplified for 16–24px: two thicker note lines instead of three. |
| `favicon.ico` | 16, 32, 48px. |
| `condisco-mark.svg` | The mark alone, for light grounds (`bg`, `surface`). |
| `condisco-mark-dark.svg` | The mark alone, for dark grounds. |
| `condisco-mark-mono.svg` | One colour (`currentColor`), note lines cut out. For print, stamps, single-colour UI. |
| `condisco-wordmark.svg`, `condisco-wordmark-dark.svg` | The lockup: the mark stands in for the C, followed by "ondisco" in Secular One (converted to outlines, so no font is needed). |
| `png/` | `condisco-icon-1024/512/192.png`, `apple-touch-icon.png` (180), `favicon-16/32/48.png`, rounded 512 PNGs with transparency, wordmark PNGs 1200px wide. |
| `../plugin/.claude-plugin/icon.png` | Plugin icon, 512px, full-bleed. |

## Colours (design-system tokens)

| part | on cobalt tile | on light ground | on dark ground |
| --- | --- | --- | --- |
| ground | gradient `#4a72e6` → `#2a49b4` (around `accent` light) | `bg` / `surface` | `bg` dark `#121820` |
| sun (C) | `win` `#f7d04a` | `#f2c22e` (a step deeper than `win` so it holds on white) | `win` dark `#e6c25c` |
| page | `#ffffff` | `accent` `#3a60d8` | `accent` dark `#93abf5` |
| note lines | `accent` `#3a60d8` | `#ffffff` | `#121820` |
| wordmark text | – | `ink` `#1b2532` | `ink` dark `#e2e7ec` |

Yellow appears only as the sun. That is the logo's one "win" mark, consistent with the rule that yellow is never a resting UI colour.

## Rules

- Clear space around the mark: at least the width of the page (about a third of the mark) on every side.
- Minimum sizes: icon 16px (use the small variant below 24px); wordmark 96px wide.
- The wordmark is always Latin and left-to-right, also inside Hebrew RTL layouts (wrap it in `dir="ltr"` or an isolated span). In Hebrew running text write "קונדיסקו" or "Condisco" as plain text.
- Do not rotate, mirror (the C must open to the right, also in RTL), recolour the sun to cobalt, add shadows or outlines, or place the bare mark on a busy scene. On scenes use the tile icon or a glass pill.

## Regenerating

`source/gen.py` writes every SVG from one geometry (100×100 grid). `source/secular-one-ondisco.json` holds the Secular One outlines for "ondisco" (SIL Open Font License). PNGs were rendered from the SVGs with Playwright's Chromium.

```
python3 brand/source/gen.py brand brand/source/secular-one-ondisco.json
```
