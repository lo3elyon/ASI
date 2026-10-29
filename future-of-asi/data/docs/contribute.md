# How to contribute

Thank you for helping. The bar is simple: true, sourced, kind and clear.

## The rules

1. Never invent a quote, a number, a date or a video ID. If you cannot link it, leave it out.
2. Write in simple words. If a 15 year old cannot follow it, rewrite it.
3. No em dashes, no en dashes used as dashes, and no exclamation marks in any copy.
4. No purple or pink anywhere. Use the palette in the design system page.
5. Show disagreement fairly. Critics and optimists belong here too.

## How to send a change

1. Fork [lo3elyon/ASI](https://github.com/lo3elyon/ASI) and edit files inside `future-of-asi/`.
2. Run it locally with `python3 -m http.server` from the repo root and open `http://localhost:8000/future-of-asi/`.
3. Check the browser console for errors and click through the pages you touched.
4. Update the route README and the root README if you added something new.
5. Open a pull request that says what you changed and links your sources.

## Quick checks before you open a pull request

```
grep -rnP "\x{2014}|\x{2013}" future-of-asi/data future-of-asi/assets/js
grep -rnP "\x{21}" future-of-asi/data/blog future-of-asi/data/docs
python3 -c "import json,glob;[json.load(open(f)) for f in glob.glob('future-of-asi/data/*.json')]"
```
