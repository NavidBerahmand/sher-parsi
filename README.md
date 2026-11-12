# شعر پارسی

A minimalist, mobile-first Persian poetry reader (PWA). Plain HTML/CSS/JS, no build step.

- **Poets:** Hafez, Saadi, Molana, Khayyam, Ferdowsi, Saeb. The home page is an endless wall of their carved portraits.
- **Data:** taken from Ganjoor's public export ([ganjoor/ganjoor-data](https://github.com/ganjoor/ganjoor-data)). The six poets' books and poems are bundled in `data/` (`data/p/` poets, `data/b/` books, `data/manifest.json`), so the site needs no outside service.
- **Font:** Lateef (Google Fonts, OFL), self-hosted in `fonts/`. Light 300 for text, Medium 500 for emphasis, ExtraLight 200 for small notes.
- **Offline:** `sw.js` precaches the app shell and keeps what you read.
- **Settings:** text size, vowel marks, dark mode (manual toggle only).

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

Code: MIT. Poem data: Ganjoor's terms. Font: OFL. Portraits: all rights reserved. See `LICENSE`.
