#!/usr/bin/env python3
"""Build data/random.json: the poems «شعر تصادفی» picks from.

A poem is in the pool when
  - it is verse only (no prose paragraphs, so no Golestan stories or prose books),
  - it has at least two lines of verse,
  - it is Persian (Shahriar's Turkish poems are left out),
  - and it is well known: Ganjoor's editors wrote a meaning for at least one of its
    couplets (not an AI one), or it is one of Hafez's ghazals.
Ganjoor publishes no read counts; the editors' meanings are the best sign of which
poems people actually read. Run after tools/bundle.py.
"""
import glob, json, os

ROOT = os.path.join(os.path.dirname(__file__), '..')
ALWAYS = ('hafez/ghazal/',)
SKIP = ('shahriar/torki/',)
VERSE = {'R', 'L', 'C1', 'C2', 'S'}

pool = set()
for f in glob.glob(os.path.join(ROOT, 'data/b/*.json')):
    for p in json.load(open(f, encoding='utf-8')).get('poems', {}).values():
        url = p['FullUrl'].strip('/')
        V = p.get('V') or []
        if url.startswith(SKIP) or any(v[0] == 'P' for v in V):
            continue
        if sum(v[0] in VERSE for v in V) < 2:
            continue
        human = any(len(v) > 4 and isinstance(v[4], str) and v[4].strip() and not v[4].strip().startswith('هوش مصنوعی') for v in V)
        if human or url.startswith(ALWAYS):
            pool.add(url)

out = sorted(pool)
with open(os.path.join(ROOT, 'data/random.json'), 'w', encoding='utf-8') as fh:
    json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
print(len(out), 'poems')
