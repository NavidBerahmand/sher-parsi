#!/usr/bin/env python3
"""Build the static search index for «شعر پارسی» from the bundled data in data/b.

Output (all plain JSON, served by GitHub Pages and fetched piece by piece):
  data/s/meta.json        counts, shard sizes, the list of skipped very common words
  data/s/t/<n>.json       text shards: LINES_PER_SHARD lines each -> {"p": [[url, title, poet]], "l": [[poemIdx, text]]}
  data/s/i/<key>.json     index shards, one per first two letters of a word -> {word: [delta-coded line ids]}
Lines are numbered in the site's poet order, so results come out poet by poet.
"""
import json, os, re, sys
from collections import defaultdict

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(DATA, 's')
LINES_PER_SHARD = 2000
VERSE = {'R', 'L', 'C1', 'C2', 'S'}
STOP_SHARE = 0.02  # words found in more than 2% of all lines are not indexed (they are still matched in the text)

HARAKAT = re.compile('[ً-ٰٟـۖ-ۭ]')
MAP = str.maketrans({'ي': 'ی', 'ى': 'ی', 'ئ': 'ی', 'ك': 'ک', 'ة': 'ه', 'ۀ': 'ه', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ؤ': 'و',
                    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'})
PUNCT = re.compile('[،؛؟٪-٭۔]')  # Arabic-script punctuation sits inside the letter block
NONWORD = re.compile('[^؀-ۿ‌0-9a-zA-Z]+')


def norm(s):
    s = PUNCT.sub(' ', HARAKAT.sub('', s).translate(MAP))
    return NONWORD.sub(' ', s).strip()


def tokens(s):
    """Words of a normalised line; a word with a ZWNJ is indexed whole and also by its parts."""
    out = set()
    for w in s.split():
        parts = [p for p in w.split('‌') if p]
        if not parts:
            continue
        out.add(''.join(parts))
        if len(parts) > 1:
            out.update(parts)
    return out


def key_of(word):
    return '-'.join('%04x' % ord(c) for c in word[:2])


def main():
    sys.path.insert(0, ROOT)
    order = [line.split(':')[0].strip() for line in open(os.path.join(ROOT, 'js', 'data.js'), encoding='utf-8').read().split('export const NAMES = {')[1].split('};')[0].strip().splitlines() if ':' in line]
    order = [o.strip("' ") for o in order]
    files = sorted(os.listdir(os.path.join(DATA, 'b')))

    def walk(cat_url):
        """Yield (poem url, poem title, verses) for a category and everything under it, in site order."""
        base = cat_url.strip('/').replace('/', '~')
        cat = json.load(open(os.path.join(DATA, 'b', base + '.json'), encoding='utf-8'))['cat']
        chunks = {}
        for i, p in enumerate(cat.get('Poems') or []):
            n = i // cat.get('_chunk', 250)
            if n not in chunks:
                fn = base + ('.%d' % n if n else '') + '.json'
                chunks[n] = json.load(open(os.path.join(DATA, 'b', fn), encoding='utf-8'))['poems']
            key = p['FullUrl'].strip('/').split('/')[-1]
            body = chunks[n].get(key)
            if body:
                yield p['FullUrl'].strip('/'), p['Title'], body['V']
        for c in cat.get('ChildCats') or []:
            yield from walk(c['FullUrl'])

    poems, lines = [], []          # poems: [url, title, poet]; lines: [poemIdx, original text, normalised]
    for slug in order:
        if not os.path.exists(os.path.join(DATA, 'b', slug + '.json')):
            continue
        for url, title, verses in walk('/' + slug):
            pi = len(poems)
            had = False
            for v in verses:
                text = v[1]
                # Verse only: prose paragraphs (P) and notes (N) are not searched.
                if v[0] not in VERSE or not text or not text.strip():
                    continue
                if not had:
                    poems.append([url, title, slug]); had = True
                t = HARAKAT.sub('', text).strip()
                lines.append([pi, t, norm(text)])
        print(slug, len(poems), len(lines), file=sys.stderr)

    post = defaultdict(list)
    for li, (_, _, n) in enumerate(lines):
        for w in tokens(n):
            post[w].append(li)
    limit = STOP_SHARE * len(lines)
    stop = sorted(w for w, l in post.items() if len(l) > limit)

    os.makedirs(os.path.join(OUT, 't'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'i'), exist_ok=True)
    for f in os.listdir(os.path.join(OUT, 't')): os.remove(os.path.join(OUT, 't', f))
    for f in os.listdir(os.path.join(OUT, 'i')): os.remove(os.path.join(OUT, 'i', f))

    for s in range(0, len(lines), LINES_PER_SHARD):
        chunk = lines[s:s + LINES_PER_SHARD]
        pidx, plist, out = {}, [], []
        for pi, t, _ in chunk:
            if pi not in pidx:
                pidx[pi] = len(plist); plist.append(poems[pi])
            out.append([pidx[pi], t])
        with open(os.path.join(OUT, 't', '%d.json' % (s // LINES_PER_SHARD)), 'w', encoding='utf-8') as f:
            json.dump({'p': plist, 'l': out}, f, ensure_ascii=False, separators=(',', ':'))

    shards = defaultdict(dict)
    stopset = set(stop)
    for w, l in post.items():
        if w in stopset:
            continue
        prev, d = 0, []
        for x in l:
            d.append(x - prev); prev = x
        shards[key_of(w)][w] = d
    for k, words in shards.items():
        with open(os.path.join(OUT, 'i', k + '.json'), 'w', encoding='utf-8') as f:
            json.dump(words, f, ensure_ascii=False, separators=(',', ':'))

    meta = {'lines': len(lines), 'poems': len(poems), 'per': LINES_PER_SHARD, 'stop': stop, 'keys': sorted(shards)}
    with open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))
    print('lines', len(lines), 'poems', len(poems), 'stop', len(stop), 'index shards', len(shards), file=sys.stderr)


if __name__ == '__main__':
    main()
