# ASI — Interactive AI, AGI & Superintelligence Explainers

A growing hub of colorful, animated, interactive explainers about **Artificial Intelligence**, **Artificial General Intelligence (AGI)** and **Artificial Superintelligence (ASI)** — big ideas made simple. New explainers are added regularly, each on its own route.

**Live site:** https://lo3elyon.github.io/ASI/ (after GitHub Pages is enabled)

## Explainers

| Route | Explainer | Status |
|---|---|---|
| [`/ai-2027-2040/`](ai-2027-2040/) | **AI 2027 & AI 2040 Explained** — the race to superintelligence, and Plan A to change the ending (12 videos, quiz, timelines) | Live (2026-10-22) |
| — | What is AGI, really? | Coming soon |
| — | How LLMs actually work | Coming soon |
| — | The AI alignment problem, simply | Coming soon |
| — | Timeline of AI breakthroughs | Coming soon |

## Landing page features

- Particle neural-network hero that reacts to the mouse, shimmering headline, rotating AI → AGI → ASI subtitle
- Explainer library built from one `PAGES` list: featured card, search, tag filters, Newest / A–Z sort, "NEW" badges, coming-soon tiles
- Interactive AI → AGI → ASI ladder with an intelligence meter
- Auto-generated "Latest" timeline
- Fully responsive, respects `prefers-reduced-motion`, no purple or pink in the palette

## Structure

```
index.html              # landing page (home route)
css/ js/ assets/        # landing page styles, scripts, images
ai-2027-2040/           # explainer: AI 2027 & AI 2040 (own index.html, css, js, assets, README)
.nojekyll               # serve files as-is on GitHub Pages
```

## Add a new explainer

1. Create a folder, e.g. `my-topic/`, with its own `index.html` (and its own `css/`, `js/`, `assets/` if needed). It is served at `/ASI/my-topic/`.
2. Open the root `index.html`, find the `PAGES` array near the top of the script, and add one object:
   ```js
   { slug: "my-topic/", title: "My Topic", tagline: "One line", tags: ["AGI"], date: "2026-10-23",
     cover: "my-topic.jpg", videos: 0, readMins: 10, status: "live", accent: "#10b981" }
   ```
   Put the cover image in the root `assets/` folder.
3. Commit and push to `main`. The library, counters and Latest timeline update automatically.

## Run locally

```bash
git clone https://github.com/lo3elyon/ASI.git
cd ASI
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy on GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → Save.

## Credits

Built by Aniruddha Adak. Explainers summarize public sources, linked on each page. Images are AI-generated illustrations.
