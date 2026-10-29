<div align="center">

<a href="https://lo3elyon.github.io/ASI/future-of-asi/explosion/"><img src="../docs-shots/explosion.jpg" width="100%" alt="The Intelligence Explosion"></a>

# The Intelligence Explosion

**When AI starts doing the work of making better AI. The old idea, the new evidence, the people who keep warning us, and what agents seem to want. Everything links to its source.**

<a href="https://lo3elyon.github.io/ASI/future-of-asi/explosion/"><img src="https://img.shields.io/badge/Open-explosion-f97316?style=for-the-badge&labelColor=07111f" alt="Open"></a>
<a href="../"><img src="https://img.shields.io/badge/Back%20to-Threshold-22d3ee?style=for-the-badge&labelColor=07111f" alt="Back to Threshold"></a>
<br>
<img src="https://img.shields.io/badge/chapters-12-f97316?style=flat-square&labelColor=07111f" alt="12 chapters">
<img src="https://img.shields.io/badge/evidence%20cards-16-ef4444?style=flat-square&labelColor=07111f" alt="16 evidence cards">
<img src="https://img.shields.io/badge/quotes-18-14b8a6?style=flat-square&labelColor=07111f" alt="18 quotes">
<img src="https://img.shields.io/badge/videos-26-3b82f6?style=flat-square&labelColor=07111f" alt="26 videos">
<img src="https://img.shields.io/badge/sources-57-84cc16?style=flat-square&labelColor=07111f" alt="57 sources">

</div>

## The chapters

| # | Chapter | What you do there |
| --- | --- | --- |
| 01 | The idea | Scroll a spiral of the idea from Butler in 1863 and I. J. Good in 1965 to Vinge, Bostrom and 2026 |
| 02 | The loop | Move four sliders (research speedup, compute growth, feedback strength, bottlenecks) or pick one of six presets and watch a takeoff curve redraw live. It is a toy model, not a forecast |
| 03 | Fast or slow | Bostrom's takeoff kinetics and a side by side of Christiano, Yudkowsky and AI 2027 with the warning time shaded |
| 04 | The fuel | Epoch AI compute cards and the METR task length chart with a 4 or 7 month doubling toggle |
| 05 | It has started | Anthropic's June 2026 data on AI doing AI research, as a ladder, stats and three futures |
| 06 | The chain | The AI 2027 milestones from superhuman coder to superintelligence, with their speedups |
| 07 | What they say | 18 exact quotes with sources, and the Pacing the Frontier counter |
| 08 | Inside an agent | Pick a final goal and watch helper goals grow: stay running, keep the goal, get resources. Toggle safety ideas to see what they cut |
| 09 | What we have seen | 16 cards on real results: scheming, alignment faking, reward hacking, chain of thought faithfulness, shutdown resistance, power seeking |
| 10 | Reward hacking | Pick a reward rule for a cleaning robot and watch what it learns |
| 11 | Watch | 26 verified videos that play only when you press play |
| 12 | Sources | 57 sources, checked on 29 October 2026 |

```mermaid
flowchart LR
  A[Better AI] --> B[More AI research]
  B --> C[Better algorithms]
  C --> A
  D[Compute] --> B
  E[Bottlenecks] -.slow down.-> B
```

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The page, with its own SEO tags and JSON-LD |
| `explosion.js` | Every interactive, rendered from the data file |
| `explosion.css` | Page styles on top of `../shared/threshold.css` |
| `data/explosion.json` | Chapters, quotes, evidence, milestones, sources and video IDs |

The page is static and needs no build. Shared fonts, header and theater live in `../shared/`.

<div align="center">
<sub>Made by Aniruddha Adak with Hark. Start big, fix later, keep shipping.</sub>
</div>
