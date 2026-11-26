# Condisco scenes (WS-3)

31 active procedural SVG landscapes (chosen for the app on 2026-11-26 from 43) and the scene host. The 12 retired scenes are not in this repository.

## Design criteria (round 3, 2026-11-26)
Sources: Apple TV aerials (slow continuous camera, one long shot per scene), layered-landscape craft from Firewatch / Alto's Adventure,
Runevision's notes on atmospheric perspective, and the grainy-gradients technique (noise to remove banding).
1. One slow shot per scene: the camera pushes in and pans over the whole 25-minute scene; nothing ever jumps.
2. Depth: far layers paler and bluer, near layers darker and saturated; parallax sway grows with nearness.
3. Light is the subject: sun rays turn slowly behind the land, a wide horizon glow breathes, and the light changes across the scene (dawn warms, dusk deepens to night, stars appear one by one).
4. Each scene has its own life that belongs to the place (eagles over Ramon and Arbel, cranes over the Hula and Jezreel, a heron over the Kinneret, the Ein Gedi waterfall, foam at Rosh HaNikra, snow on the Hermon). No two scenes share the same motion.
5. Calm: every cycle 12 s or slower (except the waterfall and rain loops, which flow continuously, not flash); occasional events (a flock, a shooting star) are rare.
6. Cheap: motion is CSS transform/opacity on pre-rasterized planes, so the GPU composites and the main thread stays idle (~0.06 s per 10 s measured). Film grain is rendered once.
7. Respectful: off under prefers-reduced-motion, paused when the tab is hidden, light and dark.


- `registry.js` exports `createSceneHost(container, {manifestUrl, palette, now, swapMs=1500000, sceneMs=swapMs, fadeMs=4000, timers, living=true})` -> `{start, stop, next, current, hold}`. Scenes swap every 25 min (one focus block). `hold(true)` during focus defers a due swap; `hold(false)` at the break swaps at once if one came due. The scene itself does not change during focus. `timeAware` (default false since 2026-11-26) picks by time tags if set true. `depth` (default false since 2026-11-26; set true to enable): layers shift gently with the mouse, nearer ones more (each plane has `data-pd`, 0 far to 1 near; `attachDepth(el)` is exported for pages that use `renderLiving` directly; off under reduced motion), plus `renderScene`, `loadScenes`, `makeBag`, `DEFAULT_PALETTES`.
- `manifest.json` paths are page-relative (`scenes/<id>.js`), resolved as `new URL('../' + file, manifestUrl)`.
- `alive.js` living mode (default in the host, `living: false` turns it off): splits each drawn scene into stacked planes (sky, sun, landscape layers by paint order, mist, clouds, stars, water glints, snow/rain, birds) and moves them with CSS transform/opacity only, so the GPU composites and the main thread stays idle (measured ~0.02 s of main-thread work per 10 s). Slow camera push-in over the 10 minutes, parallax sway (near layers move more), sun rises in morning scenes and sets in evening ones, drifting mist (generated for daytime terrain scenes without their own), clouds, two-set star twinkle and water shimmer, a small flock of birds gliding across some daytime skies. All cycles ≥ 12 s. Off under prefers-reduced-motion, paused when the tab is hidden. `renderLiving(scene, opts)` returns the living div.
- `life.js` per-scene life: each scene has its own creatures and weather (LIFE map; a scene file may also export `life: [...]`). Effects: crane/geese V formations, gulls, swallows/swifts, a heron gliding low over water, eagles/storks circling a thermal (level, flattened circle), fireflies, sunlit motes, falling leaves / almond petals / snow / rain (seamless loop), water ripples, cloud shadows over fields, sand wisps on dunes, light rays, shooting stars, a distant sail, beach foam, cloud veils over the moon or summit, stars appearing as dusk deepens.
- `lib.js` shared helpers. Scenes draw in a 1600x900 viewBox (slice), ids are prefixed per instance.
- Dark mode: detected from `palette.sky` luminance (< 0.35); the scene is dimmed with that token. Landscape colours are intrinsic to each scene (keeps the ported look); `layered-waves` is fully palette-driven.
- `t` is passed as 0. Scenes may still contain SMIL; living mode strips it and supplies its own motion. Static mode keeps the old 70-s drift.
- `preview.html` grid, light/dark, fullscreen, 8-s swap demo, "drop" marks. Serve `app/` and open `scenes/preview.html`; "drop" marks are kept in localStorage.
- Add a scene: one `<id>.js` + one manifest line, republish with `files`.


Checks (2026-11-26): 172 Playwright shots (43 x light/dark x 1440x900/2560x1440) in `shots/`, 0 console errors, largest SVG 32 KB. Registry (fake clock): no repeats per round, no back-to-back, swap exactly on time, hold during focus then swap on release, skip a throwing scene with one warning, hold while hidden and resume with remaining time, stop() clears.

## Richer detail (2026-11-26, alive.js, living mode only)
- Texture per land plane, rendered once: horizontal rock strata in desert, cliff and rock scenes; soft light patches on green land. Water rects stay smooth.
- Aerial haze: a soft band below each far ridge line, cool at night, warm when the sun is low.
- Water reflection: a breathing column of light under a low sun or the moon (wet scenes with glints).
- Foreground: an out-of-focus fringe of grass (stones and dry grass in the desert) swaying slowly; not in water, mist, snow or mountain scenes.
- Cost: first draw +~80 ms median (headless 1080p, tests/paint-test.js); steady main-thread time unchanged (~0.01-0.06 s per 10 s).
