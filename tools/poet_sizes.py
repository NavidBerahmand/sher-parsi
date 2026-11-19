"""Adds each poet's whole-download size in bytes ("S") to data/manifest.json, so the poet page's
download capsule can show «۲٫۴ از ۷٫۲ مگابایت». Run after tools/bundle.py, with ../sher-parsi-data beside the repo.
A poet's files: b/<slug>.json, b/<slug>.N.json, b/<slug>~….json and p/<slug>.json under its data root."""
import json, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAN = os.path.join(HERE, 'data', 'manifest.json')
m = json.load(open(MAN, encoding='utf-8'))
listing = {}
def files(root):
    if root not in listing:
        d = os.path.join(HERE, root, 'b')
        listing[root] = {n: os.path.getsize(os.path.join(d, n)) for n in os.listdir(d)}
    return listing[root]
missing = []
for p in m['Poets']:
    slug = p['FullUrl'].strip('/')
    root = p.get('R', 'data/')
    b = files(root)
    total = sum(s for n, s in b.items() if n == slug + '.json' or n.startswith(slug + '.') or n.startswith(slug + '~'))
    pj = os.path.join(HERE, root, 'p', slug + '.json')
    if os.path.exists(pj): total += os.path.getsize(pj)
    if not total: missing.append(slug)
    p['S'] = total
json.dump(m, open(MAN, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(m['Poets']), 'poets; no files for:', missing)
