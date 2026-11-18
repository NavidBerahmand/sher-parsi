#!/usr/bin/env python3
"""Bundle Ganjoor poets (a clone of github.com/ganjoor/ganjoor-data) into the site's data/ format:
p/<slug>.json, and b/<cat~path>.json per book with 250-poem chunks (<name>.1.json, ...).
usage: tools/bundle.py GANJOOR_DATA/poets OUT_DATA_DIR slug [slug ...]
The 44 named poets live in this repo's data/; the rest in the sher-parsi-data repo (manifest "R")."""
import json, os, sys
SRC, OUT = sys.argv[1], sys.argv[2]
CODE = {'Right': 'R', 'Left': 'L', 'CenteredVerse1': 'C1', 'CenteredVerse2': 'C2', 'Single': 'S', 'Paragraph': 'P', 'Comment': 'N'}
CHUNK = 250
PKEYS = ['Id', 'Name', 'Nickname', 'Description', 'FullUrl', 'ImageUrl', 'BirthYearInLHijri', 'ValidBirthDate', 'DeathYearInLHijri', 'ValidDeathDate', 'BirthPlace', 'DeathPlace', 'BirthLocationId', 'DeathLocationId', 'PinOrder']
def dump(path, obj):
    with open(path, 'w', encoding='utf-8') as f: json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
def poem(p):
    vs = []
    verses = p.get('Verses')
    if verses is None:
        verses = []
        seen = set()
        for s in p.get('Sections') or []:
            for v in s.get('Verses') or []:
                if v.get('VOrder') in seen: continue
                seen.add(v.get('VOrder')); verses.append(v)
        verses.sort(key=lambda v: v.get('VOrder', 0))
    for v in verses:
        row = [CODE.get(v.get('Position'), 'R'), v.get('Text'), v.get('CoupletIndex'), v.get('SectionIndex1')]
        cs = v.get('CoupletSummary')
        if cs: row.append(cs)
        vs.append(row)
    m = p.get('Metre')
    return {'Title': p.get('Title'), 'FullUrl': p.get('FullUrl'), 'Metre': {'Rhythm': m['Rhythm']} if m else None,
            'PoemSummary': p.get('PoemSummary'), 'SourceName': p.get('SourceName'), 'V': vs}
def walk(url):
    rel = url.strip('/')
    cat = json.load(open(os.path.join(SRC, rel, '_cat.json'), encoding='utf-8'))
    cat.pop('DescriptionHtml', None)
    poems = cat.get('Poems') or []
    cat['Poems'] = [{'Id': p['Id'], 'Title': p['Title'], 'FullUrl': p['FullUrl']} for p in poems]
    cat['ChildCats'] = [{'Id': c['Id'], 'Title': c['Title'], 'FullUrl': c['FullUrl']} for c in cat.get('ChildCats') or []]
    n = max(1, -(-len(poems) // CHUNK))
    cat['_chunks'], cat['_chunk'] = n, CHUNK
    base = os.path.join(OUT, 'b', rel.replace('/', '~'))
    for i in range(n):
        body = {}
        for p in poems[i * CHUNK:(i + 1) * CHUNK]:
            fp = os.path.join(SRC, p['FullUrl'].strip('/') + '.json')
            if not os.path.exists(fp): continue
            body[p['FullUrl'].strip('/').split('/')[-1]] = poem(json.load(open(fp, encoding='utf-8')))
        dump(base + ('.%d' % i if i else '') + '.json', {'poems': body, 'cat': cat} if i == 0 else {'poems': body})
    for c in cat['ChildCats']: walk(c['FullUrl'])
os.makedirs(os.path.join(OUT, 'b'), exist_ok=True); os.makedirs(os.path.join(OUT, 'p'), exist_ok=True)
for slug in sys.argv[3:]:
    pj = json.load(open(os.path.join(SRC, slug, 'poet.json'), encoding='utf-8'))
    dump(os.path.join(OUT, 'p', slug + '.json'), {k: pj.get(k) for k in PKEYS})
    walk('/' + slug)
