#!/usr/bin/env python3
"""Apply the Hebrew copy map to an app folder.
Usage: python3 -I apply.py <app_dir> [--dry]
Exact-string replacement; reports every entry that matched nothing."""
import sys, os, glob, importlib.util

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('strings', os.path.join(here, 'strings.py'))
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

root = sys.argv[1]; dry = '--dry' in sys.argv
files = [p for p in glob.glob(os.path.join(root, '**', '*.js'), recursive=True) + glob.glob(os.path.join(root, '*.html'))
         if '/scenes/' not in p and '/tests/' not in p]
text = {p: open(p, encoding='utf-8').read() for p in files}
miss, hits = [], 0
for f, old, new in mod.S:
    targets = files if f == '*' else [os.path.join(root, f)]
    n = 0
    for p in targets:
        if p not in text: continue
        c = text[p].count(old)
        if c: text[p] = text[p].replace(old, new); n += c
    if n: hits += n
    else: miss.append((f, old))
changed = 0
for p in files:
    if text[p] != open(p, encoding='utf-8').read():
        changed += 1
        if not dry: open(p, 'w', encoding='utf-8').write(text[p])
print(f"{'DRY ' if dry else ''}replacements: {hits}, files changed: {changed}, misses: {len(miss)}")
for f, old in miss: print('  MISS', f, old)
