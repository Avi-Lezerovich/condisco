# Condisco scenes (WS-3)

37 procedural SVG landscapes (12 ported unchanged from Study Hub + 25 new) and the scene host.

- `registry.js` exports `createSceneHost(container, {manifestUrl, palette, now, swapMs=600000, fadeMs=4000, timers})` -> `{start, stop, next, current}` (contract agreed with the app thread), plus `renderScene`, `loadScenes`, `makeBag`, `DEFAULT_PALETTES`.
- `manifest.json` paths are page-relative (`scenes/<id>.js`), resolved as `new URL('../' + file, manifestUrl)`.
- `alive.js` living mode (default in the host, `living: false` turns it off): splits each drawn scene into stacked planes (sky, sun, landscape layers by paint order, mist, clouds, stars, water glints, snow/rain, birds) and moves them with CSS transform/opacity only, so the GPU composites and the main thread stays idle (measured ~0.02 s of main-thread work per 10 s). Slow camera push-in over the 10 minutes, parallax sway (near layers move more), sun rises in morning scenes and sets in evening ones, drifting mist (generated for daytime terrain scenes without their own), clouds, two-set star twinkle and water shimmer, a small flock of birds gliding across some daytime skies. All cycles ≥ 12 s. Off under prefers-reduced-motion, paused when the tab is hidden. `renderLiving(scene, opts)` returns the living div.
- `life.js` per-scene life: each scene has its own creatures and weather (LIFE map; a scene file may also export `life: [...]`). Effects: crane/geese V formations, gulls, swallows/swifts, a heron gliding low over water, eagles/storks circling a thermal (level, flattened circle), fireflies, sunlit motes, falling leaves / almond petals / snow / rain (seamless loop), water ripples, cloud shadows over fields, sand wisps on dunes, light rays, shooting stars, a distant sail, beach foam, cloud veils over the moon or summit, stars appearing as dusk deepens.
- `lib.js` shared helpers. Scenes draw in a 1600x900 viewBox (slice), ids are prefixed per instance.
- Dark mode: detected from `palette.sky` luminance (< 0.35); the scene is dimmed with that token. Landscape colours are intrinsic to each scene (keeps the ported look); `layered-waves` is fully palette-driven.
- `t` is passed as 0. Scenes may still contain SMIL; living mode strips it and supplies its own motion. Static mode keeps the old 70-s drift.
- `preview.html` grid, light/dark, fullscreen, 8-s swap demo, "drop" marks. Serve `app/` and open `scenes/preview.html`; "drop" marks are kept in localStorage.
- Add a scene: one `<id>.js` + one manifest line, republish with `files`.


Checks (2026-11-25): 148 Playwright shots (37 x light/dark x 1440x900/2560x1440) in `shots/`, 0 console errors, largest SVG 25 KB. Registry (fake clock): no repeats per round, no back-to-back, swap at exactly 10 min, skip a throwing scene with one warning, hold while hidden and resume with remaining time, stop() clears.
