# شعر پارسی

A minimalist, mobile-first Persian poetry reader (PWA). Plain HTML/CSS/JS, no build step.

- **Poets:** 44 poets (list and order in `NAMES` / `TOP` in `js/data.js`). The home page is an endless wall of their carved portraits; readers choose which poets make up the wall.
- **Data:** taken from Ganjoor's public export ([ganjoor/ganjoor-data](https://github.com/ganjoor/ganjoor-data)). All poets' books and poems are bundled in `data/` (`data/p/` poets, `data/b/` books, `data/manifest.json`), so the site needs no outside service.
- **Font:** Kahroba variable font (`fonts/kahroba-vf.woff2`, Persian-only cut; weight and contrast axes), self-hosted. Per-element weight and contrast are set at the end of `css/app.css`.
- **Icons:** Google Material Symbols (Sharp, weight 400), copied as SVG paths into `js/icons.js`, so the site makes no calls to Google.
- **Offline:** `sw.js` precaches the app shell and keeps what you read.
- **Settings:** text size, verse weight, vowel marks, dark mode (dark is the default; light only when the reader chooses it).
- **Search:** full-text search over every misra, from a prebuilt index in `data/s/` (online only).

## Run locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Any static host. GitHub Pages works as-is (routes use `#/`, and `.nojekyll` is present).

## Routes

`#/` wall · `#/poets` · `#/c/<cat path>` poet or book · `#/p/<poem path>` poem · `#/fal` Hafez fal · `#/saved` bookmarks.

## Later

See `TODO.md` (Ganjoor public API for full search and audio once hosted).

## License

Code: MIT. Poem data: Ganjoor's terms. Font: Kahroba (fontiran), proprietary, used under license [YVO2HC8R](https://fontiran.com/license/YVO2HC8R); not MIT and not for reuse. Icons: Material Symbols by Google, Apache License 2.0. Portraits: all rights reserved. See `LICENSE`.
