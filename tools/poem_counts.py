"""Writes data/counts.json: how many poems each book (category) holds, counting its sub-sections, so the reading
percent in «کتابخانهٔ من» needs one small file instead of opening every file of a book or poet.
Keys: a category url ("hafez", "hafez/ghazal") -> all poems under it; "<slug>/~other" -> the poet's loose poems only.
Also stamps the manifest with "V", a fingerprint of every data file (name and size): when it changes, the app
empties its long-lived data cache and fetches saved poets again (js/data.js, checkDataVersion).
Run after tools/bundle.py and tools/poet_sizes.py, with ../sher-parsi-data beside the repo."""
import hashlib, json, os, re
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAN = os.path.join(HERE, 'data', 'manifest.json')
m = json.load(open(MAN, encoding='utf-8'))
own, kids = {}, {}
stamp = hashlib.sha1()
CAT = re.compile(r'"cat"\s*:\s*\{')
def cat_of(path):
    # The category sits at the end of a book's first file, after the poems: parse only that tail when possible.
    raw = open(path, encoding='utf-8').read()
    hits = [x.start() for x in CAT.finditer(raw)]
    for h in reversed(hits):
        try: return json.loads('{' + raw[h:])['cat']
        except ValueError: continue
    return json.loads(raw)['cat']
for root in sorted({p.get('R', 'data/') for p in m['Poets']}):
    for sub in ('b', 'p'):
        d = os.path.join(HERE, root, sub)
        for n in sorted(os.listdir(d)):
            stamp.update(('%s%s/%s:%d\n' % (root, sub, n, os.path.getsize(os.path.join(d, n)))).encode())
            if sub != 'b' or re.search(r'\.\d+\.json$', n): continue
            url = n[:-5].replace('~', '/')
            c = cat_of(os.path.join(d, n))
            own[url] = len(c.get('Poems') or [])
            kids[url] = [k['FullUrl'].strip('/') for k in c.get('ChildCats') or []]
def deep(url):
    return own.get(url, 0) + sum(deep(k) for k in kids.get(url, []))
counts = {}
for url in sorted(own):
    n = deep(url)
    if n: counts[url] = n
    if '/' not in url and kids[url] and own[url]: counts[url + '/~other'] = own[url]
json.dump(counts, open(os.path.join(HERE, 'data', 'counts.json'), 'w', encoding='utf-8'), separators=(',', ':'))
m['V'] = stamp.hexdigest()[:12]
json.dump(m, open(MAN, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(counts), 'categories;', sum(v for k, v in counts.items() if '/' not in k), 'poems; data version', m['V'])
