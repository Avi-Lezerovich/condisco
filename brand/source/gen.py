"""Generate the Condisco brand SVGs ("C that is also a page")."""
import json, os, sys

OUT = sys.argv[1]
FONT = json.load(open(sys.argv[2]))  # Secular One outlines for "ondisco"
os.makedirs(OUT, exist_ok=True)

PAL = {
    "tile":  dict(sun="#f7d04a", page="#ffffff", ln="#3a60d8"),
    "light": dict(sun="#f2c22e", page="#3a60d8", ln="#ffffff"),
    "dark":  dict(sun="#e6c25c", page="#93abf5", ln="#121820"),
    "night": dict(sun="#e6c25c", page="#e9edf1", ln="#202c3a"),
}

def mark(c, small=False):
    """The mark on a 100x100 grid. small=True: two thicker note lines for 16-24px."""
    if small:
        lines = (f'<path d="M58.5 40H72.5" stroke="{c["ln"]}" stroke-width="6" stroke-linecap="round"/>'
                 f'<path d="M58.5 54H67.5" stroke="{c["ln"]}" stroke-width="6" stroke-linecap="round" opacity=".7"/>')
    else:
        lines = (f'<g stroke="{c["ln"]}" stroke-width="3.6" stroke-linecap="round">'
                 '<path d="M59 38.5H72"/><path d="M59 47.5H70" opacity=".75"/><path d="M59 56.5H66" opacity=".5"/></g>')
    return (f'<path d="M48 24A26 26 0 0 0 48 76Z" fill="{c["sun"]}"/>'
            f'<path d="M53 27C61 24.5 69 24.5 78 27.5V72.5C69 69.5 61 69.5 53 72Z" fill="{c["page"]}"/>' + lines)

GRAD = {
    "cobalt": ("#4a72e6", "#2a49b4"),
    "night":  ("#2a3b5c", "#121820"),
}

def tile(name, pal, grad, rounded=True, small=False, title="Condisco"):
    g0, g1 = GRAD[grad]
    shape = '<rect width="100" height="100" rx="23" fill="url(#bg)"/>' if rounded else '<rect width="100" height="100" fill="url(#bg)"/>'
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="{title}">'
           f'<title>{title}</title><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
           f'<stop offset="0" stop-color="{g0}"/><stop offset="1" stop-color="{g1}"/></linearGradient></defs>'
           f'{shape}{mark(PAL[pal], small)}</svg>\n')
    open(f"{OUT}/{name}", "w").write(svg)

def bare(name, pal, small=False):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="18 20 64 60" role="img" aria-label="Condisco">'
           f'<title>Condisco</title>{mark(PAL[pal], small)}</svg>\n')
    open(f"{OUT}/{name}", "w").write(svg)

def mono(name):
    # one colour (currentColor); note lines are cut out of the page
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="18 20 64 60" role="img" aria-label="Condisco">'
           '<title>Condisco</title><defs><mask id="m"><rect x="0" y="0" width="100" height="100" fill="#fff"/>'
           '<g stroke="#000" stroke-width="3.6" stroke-linecap="round"><path d="M59 38.5H72"/><path d="M59 47.5H70"/><path d="M59 56.5H66"/></g></mask></defs>'
           '<g fill="currentColor" mask="url(#m)"><path d="M48 24A26 26 0 0 0 48 76Z"/>'
           '<path d="M53 27C61 24.5 69 24.5 78 27.5V72.5C69 69.5 61 69.5 53 72Z"/></g></svg>\n')
    open(f"{OUT}/{name}", "w").write(svg)

def wordmark(name, pal, ink):
    # Font units: baseline y=0, up positive. The mark stands in for the capital C.
    s = 14.6                       # 100-grid -> font units
    mx0, my0, mx1, my1 = 22, 24, 78, 76
    mark_h = (my1 - my0) * s       # ~759
    base_off = -22                 # mark bottom slightly under the baseline, like an overshoot
    top = base_off + mark_h
    gap = 36
    text_x = (mx1 - mx0) * s + gap
    width = text_x + FONT["adv"] + 20
    asc, desc = top + 20, 40
    H = asc + desc
    glyphs = "".join(
        f'<path transform="translate({text_x + x:.1f} 0)" d="{d}"/>' for x, d in FONT["glyphs"] if d)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-asc:.0f} {width:.0f} {H:.0f}" role="img" aria-label="Condisco">'
           f'<title>Condisco</title>'
           f'<g transform="translate({-mx0 * s:.1f} {-(top) - my0 * s:.1f}) scale({s})">{mark(PAL[pal])}</g>'
           f'<g transform="scale(1 -1)" fill="{ink}">{glyphs}</g></svg>\n')
    open(f"{OUT}/{name}", "w").write(svg)

tile("condisco-icon.svg", "tile", "cobalt")
tile("condisco-icon-dark.svg", "night", "night")
tile("condisco-icon-square.svg", "tile", "cobalt", rounded=False)
tile("condisco-icon-dark-square.svg", "night", "night", rounded=False)
tile("favicon.svg", "tile", "cobalt", small=True)
tile("condisco-icon-small.svg", "tile", "cobalt", small=True)
bare("condisco-mark.svg", "light")
bare("condisco-mark-dark.svg", "dark")
mono("condisco-mark-mono.svg")
wordmark("condisco-wordmark.svg", "light", "#1b2532")
wordmark("condisco-wordmark-dark.svg", "dark", "#e2e7ec")
print("ok")
