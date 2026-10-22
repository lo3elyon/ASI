# Two Futures for AI — AI 2027 & AI 2040, Explained Simply

An interactive, animated, single-page explainer of the two big scenarios from the **AI Futures Project** (Daniel Kokotajlo and team):

- **[AI 2027](https://ai-2027.com/)** (published Apr 3, 2025): a *prediction* of where the AI race might take us, with two endings, **Race** and **Slowdown**.
- **[AI 2040: Plan A](https://ai-2040.com/)** (published Jul 9, 2026): a *recommendation*, an international, verified deal that delays superintelligence to 2040.

> Independent, unofficial explainer. All scenario content © AI Futures Project, summarized in simple words. Images are AI-generated illustrations.

## Features

- Animated particle and neural-network hero that reacts to the mouse
- Scroll-reveal animations, a scroll progress bar, parallax images, animated counters and flowing wave dividers
- Jargon buster with flip cards (AGI, ASI, alignment, compute, weights, neuralese…)
- Interactive **AI 2027 timeline** (Mid 2025 → Oct 2027) plus the milestone ladder (4x → 2000x R&D multiplier)
- **Choose your ending**: a Race vs Slowdown switch
- 8 key takeaways
- **AI 2040 Plan A**: the 4 principles, 3 key steps and the **five paths** selector (Plans D, C, B, A, S)
- **AI 2040 year-by-year timeline** (2027 → 2040) and the alignment track
- AI 2027 vs AI 2040 comparison table
- 6-question quiz with a score ring and confetti
- **Video gallery**: 12 talks and interviews (Dwarkesh, Hard Fork, Diary of a CEO, 80,000 Hours, Lawfare, MLST, Sam Harris, GZERO, FLI, Palisade…) that play in place via YouTube embeds, with All / AI 2027 / AI 2040 filters
- Links to every original source (sites, summaries, PDFs, model, blog, podcast)
- Fully responsive, respects `prefers-reduced-motion`, and the palette has no purple or pink

## Structure

```
index.html        # the whole page (HTML + inline CSS/JS)
css/hark.css      # base design system styles
css/hark-hero.css # hero styles
js/hark.js        # base interactions
assets/*.jpg      # hero, race, slowdown, deal, future illustrations
.nojekyll         # serve files as-is on GitHub Pages
```

No build step and no dependencies to install. Fonts and YouTube load from their CDNs.

## Run locally

```bash
git clone https://github.com/lo3elyon/ASI.git
cd ASI
python3 -m http.server 8000
# open http://localhost:8000/ai-2027-2040/
```

(Opening `index.html` directly also works, but some browsers block YouTube embeds on `file://`, so a local server is better.)

## Deploy on GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → Save.
This page lives at `https://lo3elyon.github.io/ASI/ai-2027-2040/`.

## Sources

- AI 2027: https://ai-2027.com/ · Summary: https://ai-2027.com/summary · PDF: https://ai-2027.com/ai-2027.pdf
- AI 2040: Plan A: https://ai-2040.com/ · Summary: https://ai-2040.com/summary · PDF: https://ai-2040.com/AI-2040.pdf
- AI Futures Project: https://ai-futures.org/ · Model: https://www.aifuturesmodel.com/ · Blog: https://blog.aifutures.org/

Built by **Aniruddha Adak**.
