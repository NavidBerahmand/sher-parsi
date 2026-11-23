#!/usr/bin/env python3
"""Book cover pictures (Navid, 2026-11-23).

Step 1, once per new batch of pictures:  python3 tools/cover_images.py --import <folder of 480x400 webp>
  Shuffles the pictures (fixed seed, so a re-run gives the same order) so that two pictures made from the same
  prompt never sit next to each other, and writes them as img/covers/001.webp, 002.webp, ...
Step 2:  python3 tools/cover_images.py   (needs ../sher-parsi-data beside the repo)
  Gives every book a picture: the books of the 44 named poets first (readership order, js/data.js NAMES), then
  every other poet in manifest order. When the pictures run out they start again from the first, so the lesser
  known poets get repeats. Writes js/covers/map.js (book path -> picture number). A book missing from the map
  (a poet added later) gets a picture from a hash of its path in js/data.js, so it repeats one too.
"""
import json, os, random, re, shutil, sys

# Books Navid chose a picture for by hand; the book that had that picture takes the pinned book's one.
PIN = {'ferdousi/shahname': 185}  # the two crowned kings (Navid, 2026-11-23)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'img', 'covers')

def group(name):  # Midjourney names: <prompt>_<job uuid>_<n>.webp; one job = one group of look-alikes
    return re.sub(r'_\d+\.webp$', '', name)

def do_import(src):
    files = sorted(f for f in os.listdir(src) if f.endswith('.webp'))
    rnd = random.Random(1402)
    rnd.shuffle(files)
    # No two neighbours from the same job, nor from the same prompt words where it can be helped.
    for i in range(1, len(files)):
        if group(files[i]) == group(files[i - 1]):
            for j in range(i + 1, len(files)):
                if group(files[j]) != group(files[i - 1]) and (i + 1 >= len(files) or group(files[j]) != group(files[i + 1])):
                    files[i], files[j] = files[j], files[i]
                    break
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT)
    for n, f in enumerate(files, 1):
        shutil.copyfile(os.path.join(src, f), os.path.join(OUT, f'{n:03d}.webp'))
    same = sum(group(files[i]) == group(files[i - 1]) for i in range(1, len(files)))
    print(f'{len(files)} pictures -> img/covers/, neighbours from one job: {same}')

def books_of(slug):
    for d in (os.path.join(ROOT, 'data', 'b'), os.path.join(ROOT, '..', 'sher-parsi-data', 'data', 'b')):
        f = os.path.join(d, f'{slug}.json')
        if os.path.exists(f):
            cat = json.load(open(f, encoding='utf-8'))['cat']
            kids = cat.get('ChildCats') or []
            out = [k['FullUrl'].strip('/') for k in kids]
            if kids and cat.get('Poems'):
                out.append(slug + '/~other')  # «سایر اشعار», as shelf() in js/data.js
            return out
    sys.exit(f'no data for {slug}')

def do_map():
    n = len([f for f in os.listdir(OUT) if f.endswith('.webp')])
    src = open(os.path.join(ROOT, 'js', 'data.js'), encoding='utf-8').read()
    names = re.findall(r"^  (\w+): '", src.split('export const NAMES = {', 1)[1].split('};', 1)[0], re.M)
    poets = [p['FullUrl'].strip('/') for p in json.load(open(os.path.join(ROOT, 'data', 'manifest.json')))['Poets']]
    order = names + [p for p in poets if p not in names]
    paths = [b for p in order for b in books_of(p)]
    cmap = {b: i % n + 1 for i, b in enumerate(paths)}
    for book, pic in PIN.items():
        other = next((b for b, v in cmap.items() if v == pic and b != book), None)
        if other:
            cmap[other] = cmap[book]
        cmap[book] = pic
    body = ',\n'.join(f'  {json.dumps(k, ensure_ascii=False)}: {v}' for k, v in cmap.items())
    open(os.path.join(ROOT, 'js', 'covers', 'map.js'), 'w', encoding='utf-8').write(
        '// Written by tools/cover_images.py: book path -> picture img/covers/NNN.webp. Do not edit by hand.\n'
        f'export const NCOVERS = {n};\nexport const COVERS = {{\n{body},\n}};\n')
    print(f'{len(paths)} books, {n} pictures, {max(0, len(paths) - n)} repeats')

if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--import':
        do_import(sys.argv[2])
    do_map()
