#!/bin/sh
# Cloudflare Pages build: puts the site and the poem data of both repositories into dist/.
# The 202 poets of NavidBerahmand/sher-parsi-data go to dist/sher-parsi-data/, so the manifest's
# "R":"../sher-parsi-data/data/" resolves to /sher-parsi-data/data/ on sorayesh.com, as it did on GitHub Pages.
set -e
rm -rf dist && mkdir dist
cp -r index.html sw.js manifest.webmanifest LICENSE css js fonts icons img data dist/
cp tools/404.html dist/404.html
git clone --depth 1 https://github.com/NavidBerahmand/sher-parsi-data.git dist/sher-parsi-data
rm -rf dist/sher-parsi-data/.git dist/sher-parsi-data/README.md
echo "files: $(find dist -type f | wc -l)"
