<div align="center">

<a href="https://lo3elyon.github.io/ASI/ai-safety-full-episodes/"><img src="../assets/ai-safety-full-episodes.jpg" width="100%" alt="AI Safety Full Episodes v2"></a>

# AI Safety Full Episodes · v2 · July–October 2026

**A streaming app for every verified full-length AI safety episode of July 1 – October 27, 2026: a pop-out player that keeps going while the browser is minimised, audio mode, full chapter reports, a P(doom) and timelines claims tracker, a speaker hub with real photos, contribution-style heatmaps, smart recommendations, insights and achievements.**

<a href="https://lo3elyon.github.io/ASI/ai-safety-full-episodes/"><img src="https://img.shields.io/badge/Open%20the%20app-lo3elyon.github.io%2FASI%2Fai--safety--full--episodes-14b8a6?style=for-the-badge&logo=githubpages&logoColor=white&labelColor=07111f" alt="Open the app"></a>
<br>
<img src="https://img.shields.io/badge/version-2.0-f59e0b?style=flat-square&labelColor=07111f" alt="v2.0">
<img src="https://img.shields.io/badge/episodes-243-14b8a6?style=flat-square&labelColor=07111f" alt="243 episodes">
<img src="https://img.shields.io/badge/runtime-~267%20hours-f59e0b?style=flat-square&labelColor=07111f" alt="about 267 hours">
<img src="https://img.shields.io/badge/researchers%20%26%20guests-132-22d3ee?style=flat-square&labelColor=07111f" alt="132 researchers and guests">
<img src="https://img.shields.io/badge/hosts-98-64748b?style=flat-square&labelColor=07111f" alt="98 hosts">
<img src="https://img.shields.io/badge/chapters-2%2C701-10b981?style=flat-square&labelColor=07111f" alt="2,701 chapters">
<img src="https://img.shields.io/badge/claims%20tracked-65-ef4444?style=flat-square&labelColor=07111f" alt="65 claims">
<img src="https://img.shields.io/badge/window-Jul%201%E2%80%93Oct%2027%2C%202026-3b82f6?style=flat-square&labelColor=07111f" alt="Jul 1 to Oct 27, 2026">
<br>
<img src="https://img.shields.io/badge/JavaScript-vanilla%2C%20modular-facc15?style=flat-square&logo=javascript&logoColor=07111f&labelColor=07111f" alt="Vanilla JS">
<img src="https://img.shields.io/badge/build%20step-none-10b981?style=flat-square&labelColor=07111f" alt="No build step">
<img src="https://img.shields.io/badge/Document%20PiP-Chrome%20%2F%20Edge%20116%2B-f59e0b?style=flat-square&logo=googlechrome&logoColor=white&labelColor=07111f" alt="Document Picture-in-Picture">
<img src="https://img.shields.io/badge/Media%20Session-wired-14b8a6?style=flat-square&labelColor=07111f" alt="Media Session">
<img src="https://img.shields.io/badge/player-YouTube%20IFrame%20API%20(nocookie)-ef4444?style=flat-square&logo=youtube&logoColor=white&labelColor=07111f" alt="YouTube IFrame API">
<img src="https://img.shields.io/badge/history-localStorage%20only-84cc16?style=flat-square&labelColor=07111f" alt="localStorage only">
<img src="https://img.shields.io/badge/offline-service%20worker-22d3ee?style=flat-square&labelColor=07111f" alt="Service worker">
<img src="https://img.shields.io/badge/smoke%20test-49%2F49%20passing-10b981?style=flat-square&labelColor=07111f" alt="49 of 49 smoke checks passing">

</div>

---

## Contents

[What's new in v2](#whats-new-in-v2) · [Features](#features) · [Videos](#a-taste-of-the-library) · [Speakers](#speaker-photo-grid) · [Months](#months) · [Architecture](#architecture) · [Keep playing when minimised](#keep-playing-when-minimised) · [Watch history](#strict-watch-history) · [Recommendations](#recommendations) · [Levels & badges](#levels-and-badges) · [Shortcuts](#keyboard-shortcuts) · [Data schema](#data-schema) · [Daily JSON](#adding-new-episodes-daily-json--manifest) · [Files](#files) · [Privacy](#privacy) · [Method](#method) · [FAQ](#faq) · [Sources](#sources) · [Changelog](#changelog)

## What's new in v2

| | v1 (Oct 27, morning) | **v2 (Oct 27, night)** |
|---|---|---|
| Episodes | 52 (October) + 8 just outside | **243 verified full episodes, July–October** (Jul 43 · Aug 64 · Sep 84 · Oct 52) |
| Player | theater + mini | theater, mini, **audio mode**, **pop-out always-on-top window**, Media Session, never pauses on tab switch |
| Speakers | text directory | **hub with real photos for everyone**, bios, follow, profile pages, "Play all", their stated numbers |
| Episode detail | chapters list | **full chapter report**, key claims, numbers, people/orgs mentioned, tags, level, why watch, evidence, deep links at the current second |
| Discovery | one heatmap, simple filters | **GitHub-style release heatmap + personal watch heatmap**, month switcher, fuzzy search over chapters and claims, 10 filter groups, 8 sorts, grid/list, saved filters, command palette |
| Recommendations | similar episodes | scored on follows, shared speakers/orgs/tags, completion, level progression; **Because you watched**, Continue, Short & complete, Deep dives, Debates |
| Insights | — | hours per day/week, by speaker, by org, by month, completion donut, streak calendar, **claims tracker** |
| Achievements | 8 levels, 17 badges | **12 levels, 29 badges**, XP float animation, level-up burst, profile card |
| Code | one 93 KB file | **8 modules**, service worker, jsdom smoke test |

## Features

| Area | What you get |
|---|---|
| **Pop-out player** | `I` or the window button moves the episode into a Document Picture-in-Picture window (Chrome/Edge 116+) with play, ±10 s, chapter skip, next episode and the live chapter title. It floats above every app and keeps playing while the browser is minimised. Closing it hands playback back to the page at the same second. Other browsers get a clear message and switch to audio mode. |
| **Audio mode** | `A` collapses the video into a slim bar with the speaker's photo as artwork, title, live chapter and full controls. Keep browsing; playback never stops on navigation or tab switches. |
| **Media Session** | Title, speakers, show and artwork go to the OS media controls (lock screen, keyboard media keys, headset buttons), with play, pause, seek ±, seek-to, next and previous-chapter handlers wired to the YouTube player. |
| **Persistent dock** | One player for the whole app: theater, mini (bottom-right), audio bar or pop-out. It survives every route change and is never re-created inside the page, so it never reloads. |
| **Months** | Switch between All, July, August, September and October with per-month stats (episodes, hours, speakers, chapters, top speakers). Default is All. |
| **Release heatmap** | A contributions-style grid of every day Jul 1 – Oct 31, 2026: colour intensity = episodes released, the number is shown in larger cells and on hover, month headers show totals and active days, a Less→More legend; click a day or a month to filter the library. |
| **Watch heatmap** | The same grid for your own minutes watched per day (strict playback only); click a day in History to see just that day. |
| **Speakers hub** | 49 curated researcher portraits with organisation and a factual one-line bio, plus every other guest and host with a real photo (see [photos](#speaker-photo-grid)). Episode count, total hours, "watched x of y", group filters, search, sort, a collapsible Hosts section. |
| **Speaker profile** | Big photo, bio, stats, first→last appearance, **Follow**, **Play all** (fills the queue), every stated number (P(doom), timelines, other figures) linked to the moment, sortable episode list, "Often appears with". |
| **Episode report** | Every chapter with time, title and detail (click to seek), key claims with timestamps and speakers, numbers, people and organisations mentioned (click to filter), tags, level, why watch, evidence, speakers with photos, your history and notes, "More like this". |
| **Deep links** | `#ep=<id>&t=<sec>` opens the episode and plays from that second. "Copy link at current time" (`C`) and Share (native share sheet when available). |
| **Notes** | Timestamped notes while watching (`N`), in the side panel, in the episode drawer and on a Notes page with search and Markdown export. |
| **Search** | Fuzzy (typo-tolerant) across title, speakers, show, tags, chapter titles and details, and claims, with highlighted snippets that jump straight to the matching moment. |
| **Filters** | Month, format, length, level, people group, organisation, speaker (searchable), watched state (unwatched, in progress, watched, favourites, with notes, queued), followed only, topic tags, release day. Live facet counts, active-filter chips, saved filters. |
| **Sorts & layouts** | Best match, newest, oldest, longest, shortest, most viewed, unwatched first, for you; grid or list; infinite "show more". |
| **Recommendations** | For you, Because you watched X, Continue watching, New from people you follow, Short & complete (< 40 min), Deep dives (2 h +), Debates, Hearings & panels, Most viewed, Latest. Every pick says why. |
| **Up Next** | Queue first, then the best-scored similar episodes with reasons; 10-second autoplay countdown. |
| **Insights** | KPIs, hours per day or week, by speaker, by organisation, by release month, by format, completion donut, streak calendar, and a **claims tracker** table of P(doom) and timeline statements by speaker with a ▶ button to the exact moment. |
| **Achievements** | 12 levels from Novice to Superalignment Sage, 29 badges (Monthly Completionist, Speaker Collector, Org Explorer, Night Owl, Binge, Chapter Jumper, Note Taker, Always on Top, Ears Only, …), floating +XP, level-up burst, editable profile card. |
| **Command palette** | `Ctrl/⌘ K`: jump to any episode, speaker or action (pop out, audio mode, copy link, theme, surprise me). `Shift+Enter` queues. |
| **Polish** | Dark / light / system theme, amber and teal accents, glass surfaces, skeleton loaders, lazy thumbnails, responsive layout with a mobile bottom nav, visible focus rings, reduced-motion support, offline-friendly service worker. |

## A taste of the library

Three of the biggest episodes from each month (click to open on YouTube; every one of the 243 plays inside the app):

<table>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=l2b9UrSsz-w"><img src="https://i.ytimg.com/vi/l2b9UrSsz-w/hqdefault.jpg" width="100%" alt="Davidad on Moral Realism & p(Doom)"></a><br><img src="https://img.shields.io/badge/PODCAST-14b8a6?style=flat-square" alt=""><br><sub><b>Davidad on Moral Realism & p(Doom)</b><br>Cognitive Revolution · davidad · 2:23:37 · Jul 12</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=8qTZLqY-cnI"><img src="https://i.ytimg.com/vi/8qTZLqY-cnI/hqdefault.jpg" width="100%" alt="Joe Rogan Experience #2525"></a><br><img src="https://img.shields.io/badge/PODCAST-14b8a6?style=flat-square" alt=""><br><sub><b>Joe Rogan Experience #2525</b><br>Nick Bostrom · 2:14:42 · Jul 14</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=_g4l7YkDQwA"><img src="https://i.ytimg.com/vi/_g4l7YkDQwA/hqdefault.jpg" width="100%" alt="ChatGPT Whistleblower"></a><br><img src="https://img.shields.io/badge/PODCAST-14b8a6?style=flat-square" alt=""><br><sub><b>ChatGPT Whistleblower</b><br>The Diary Of A CEO · Daniel Kokotajlo · 2:00:44 · Jul 13</sub></td>
</tr>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=KFcJgTODkkQ"><img src="https://i.ytimg.com/vi/KFcJgTODkkQ/hqdefault.jpg" width="100%" alt="An AI 2027 Author Returns"></a><br><img src="https://img.shields.io/badge/PODCAST-14b8a6?style=flat-square" alt=""><br><sub><b>An AI 2027 Author Returns</b><br>80,000 Hours · Daniel Kokotajlo · 3:47:33 · Aug 27</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=zOSptyQ3j9A"><img src="https://i.ytimg.com/vi/zOSptyQ3j9A/hqdefault.jpg" width="100%" alt="Where AGI timelines go wrong"></a><br><img src="https://img.shields.io/badge/PODCAST-14b8a6?style=flat-square" alt=""><br><sub><b>Where AGI timelines go wrong</b><br>80,000 Hours · Toby Ord · 2:46:03 · Aug 6</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=OZAqXlGXdFY"><img src="https://i.ytimg.com/vi/OZAqXlGXdFY/hqdefault.jpg" width="100%" alt="AXRP 50: Eli Lifland on AI 2027"></a><br><img src="https://img.shields.io/badge/PODCAST-14b8a6?style=flat-square" alt=""><br><sub><b>AXRP 50: Eli Lifland on AI 2027</b><br>AXRP · Eli Lifland · 2:40:39 · Aug 2</sub></td>
</tr>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=rtir6QmQQRg"><img src="https://i.ytimg.com/vi/rtir6QmQQRg/hqdefault.jpg" width="100%" alt="Real Reason AI CEOs Are Building Bunkers"></a><br><img src="https://img.shields.io/badge/PODCAST-14b8a6?style=flat-square" alt=""><br><sub><b>Real Reason AI CEOs Are Building Bunkers</b><br>Danny Jones · Connor Leahy · 2:41:49 · Sep 18</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=OhOmLqR5nN4"><img src="https://i.ytimg.com/vi/OhOmLqR5nN4/hqdefault.jpg" width="100%" alt="AI Experts Debate: Is There a 99% Chance…"></a><br><img src="https://img.shields.io/badge/DEBATE-ef4444?style=flat-square" alt=""><br><sub><b>AI Experts Debate: Is There a 99% Chance…</b><br>Yampolskiy, Soares, Zitron · 2:24:26 · Sep 17</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=X50zezLFWWI"><img src="https://i.ytimg.com/vi/X50zezLFWWI/hqdefault.jpg" width="100%" alt="Ajeya Cotra: the clearest warning shot"></a><br><img src="https://img.shields.io/badge/PODCAST-14b8a6?style=flat-square" alt=""><br><sub><b>Ajeya Cotra: the clearest warning shot</b><br>Dwarkesh Podcast · Ajeya Cotra · 2:20:33 · Sep 1</sub></td>
</tr>
<tr>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=lnLDjXy2kRA"><img src="https://i.ytimg.com/vi/lnLDjXy2kRA/hqdefault.jpg" width="100%" alt="Jacob Coxon: the existential threat from inside"></a><br><img src="https://img.shields.io/badge/INTERVIEW-f59e0b?style=flat-square" alt=""><br><sub><b>Jacob Coxon: the existential threat from inside</b><br>The Daily Show · Jacob Coxon · 25:59 · Oct 5</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=qDzg-xvkeXw"><img src="https://i.ytimg.com/vi/qDzg-xvkeXw/hqdefault.jpg" width="100%" alt="AI Whistleblower: They Are Hiding What Is Really Happening"></a><br><img src="https://img.shields.io/badge/PODCAST-14b8a6?style=flat-square" alt=""><br><sub><b>AI Whistleblower: They Are Hiding What Is Really Happening</b><br>The Diary Of A CEO · Jeffrey Ladish · 2:03:31 · Oct 8</sub></td>
<td align="center" width="33%" valign="top"><a href="https://www.youtube.com/watch?v=JIMXEuT_ZAU"><img src="https://i.ytimg.com/vi/JIMXEuT_ZAU/hqdefault.jpg" width="100%" alt="What This OpenAI Insider Saw That Made Him Quit"></a><br><img src="https://img.shields.io/badge/PODCAST-14b8a6?style=flat-square" alt=""><br><sub><b>What This OpenAI Insider Saw That Made Him Quit</b><br>The Ezra Klein Show · David Robinson · 1:14:55 · Oct 7</sub></td>
</tr>
</table>

## Speaker photo grid

Curated portraits of the researchers with bios in `data/roster.json`. Hosts get their channel avatar (`assets/speakers/<slug>.jpg`, fetched via the Piped API); anyone else is shown with a circular crop of the thumbnail from their best solo episode, so **nobody gets an initials placeholder**.

<table>
<tr>
<td align="center" width="14%" valign="top"><img src="assets/speakers/eliezer-yudkowsky.jpg" width="72" height="72" alt="Eliezer Yudkowsky"><br><sub><b>Eliezer Yudkowsky</b><br>MIRI</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/nate-soares.jpg" width="72" height="72" alt="Nate Soares"><br><sub><b>Nate Soares</b><br>MIRI</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/malo-bourgon.jpg" width="72" height="72" alt="Malo Bourgon"><br><sub><b>Malo Bourgon</b><br>MIRI</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/connor-leahy.jpg" width="72" height="72" alt="Connor Leahy"><br><sub><b>Connor Leahy</b><br>ControlAI</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/andrea-miotti.jpg" width="72" height="72" alt="Andrea Miotti"><br><sub><b>Andrea Miotti</b><br>ControlAI</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/holly-elmore.jpg" width="72" height="72" alt="Holly Elmore"><br><sub><b>Holly Elmore</b><br>PauseAI US</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/geoffrey-hinton.jpg" width="72" height="72" alt="Geoffrey Hinton"><br><sub><b>Geoffrey Hinton</b><br>University of Toronto</sub></td>
</tr>
<tr>
<td align="center" width="14%" valign="top"><img src="assets/speakers/yoshua-bengio.jpg" width="72" height="72" alt="Yoshua Bengio"><br><sub><b>Yoshua Bengio</b><br>Mila / LawZero</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/stuart-russell.jpg" width="72" height="72" alt="Stuart Russell"><br><sub><b>Stuart Russell</b><br>UC Berkeley</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/roman-yampolskiy.jpg" width="72" height="72" alt="Roman Yampolskiy"><br><sub><b>Roman Yampolskiy</b><br>University of Louisville</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/nick-bostrom.jpg" width="72" height="72" alt="Nick Bostrom"><br><sub><b>Nick Bostrom</b><br>Macrostrategy Research Initiative</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/max-tegmark.jpg" width="72" height="72" alt="Max Tegmark"><br><sub><b>Max Tegmark</b><br>MIT / FLI</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/david-krueger.jpg" width="72" height="72" alt="David Krueger"><br><sub><b>David Krueger</b><br>Université de Montréal / Mila</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/toby-ord.jpg" width="72" height="72" alt="Toby Ord"><br><sub><b>Toby Ord</b><br>Oxford AI Governance Initiative</sub></td>
</tr>
<tr>
<td align="center" width="14%" valign="top"><img src="assets/speakers/william-macaskill.jpg" width="72" height="72" alt="William MacAskill"><br><sub><b>William MacAskill</b><br>Forethought</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/jaan-tallinn.jpg" width="72" height="72" alt="Jaan Tallinn"><br><sub><b>Jaan Tallinn</b><br>Future of Life Institute</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/helen-toner.jpg" width="72" height="72" alt="Helen Toner"><br><sub><b>Helen Toner</b><br>Georgetown CSET</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/anthony-aguirre.jpg" width="72" height="72" alt="Anthony Aguirre"><br><sub><b>Anthony Aguirre</b><br>Future of Life Institute</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/miles-brundage.jpg" width="72" height="72" alt="Miles Brundage"><br><sub><b>Miles Brundage</b><br>AVERI</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/stephen-casper.jpg" width="72" height="72" alt="Stephen Casper"><br><sub><b>Stephen Casper</b><br>Harvard</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/dan-hendrycks.jpg" width="72" height="72" alt="Dan Hendrycks"><br><sub><b>Dan Hendrycks</b><br>Center for AI Safety</sub></td>
</tr>
<tr>
<td align="center" width="14%" valign="top"><img src="assets/speakers/adam-gleave.jpg" width="72" height="72" alt="Adam Gleave"><br><sub><b>Adam Gleave</b><br>FAR.AI</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/jeffrey-ladish.jpg" width="72" height="72" alt="Jeffrey Ladish"><br><sub><b>Jeffrey Ladish</b><br>Palisade Research</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/chris-painter.jpg" width="72" height="72" alt="Chris Painter"><br><sub><b>Chris Painter</b><br>METR</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/marius-hobbhahn.jpg" width="72" height="72" alt="Marius Hobbhahn"><br><sub><b>Marius Hobbhahn</b><br>Apollo Research</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/ajeya-cotra.jpg" width="72" height="72" alt="Ajeya Cotra"><br><sub><b>Ajeya Cotra</b><br>METR</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/buck-shlegeris.jpg" width="72" height="72" alt="Buck Shlegeris"><br><sub><b>Buck Shlegeris</b><br>Redwood Research</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/ryan-greenblatt.jpg" width="72" height="72" alt="Ryan Greenblatt"><br><sub><b>Ryan Greenblatt</b><br>Redwood Research</sub></td>
</tr>
<tr>
<td align="center" width="14%" valign="top"><img src="assets/speakers/paul-christiano.jpg" width="72" height="72" alt="Paul Christiano"><br><sub><b>Paul Christiano</b><br>Alignment Research Center</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/owain-evans.jpg" width="72" height="72" alt="Owain Evans"><br><sub><b>Owain Evans</b><br>Truthful AI</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/rosie-campbell.jpg" width="72" height="72" alt="Rosie Campbell"><br><sub><b>Rosie Campbell</b><br>Eleos AI Research</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/daniel-kokotajlo.jpg" width="72" height="72" alt="Daniel Kokotajlo"><br><sub><b>Daniel Kokotajlo</b><br>AI Futures Project</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/eli-lifland.jpg" width="72" height="72" alt="Eli Lifland"><br><sub><b>Eli Lifland</b><br>AI Futures Project</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/thomas-larsen.jpg" width="72" height="72" alt="Thomas Larsen"><br><sub><b>Thomas Larsen</b><br>AI Futures Project</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/jacob-coxon.jpg" width="72" height="72" alt="Jacob Coxon"><br><sub><b>Jacob Coxon</b><br>Former Anthropic & OpenAI</sub></td>
</tr>
<tr>
<td align="center" width="14%" valign="top"><img src="assets/speakers/alex-turner.jpg" width="72" height="72" alt="Alex Turner"><br><sub><b>Alex Turner</b><br>Former Google DeepMind</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/steven-adler.jpg" width="72" height="72" alt="Steven Adler"><br><sub><b>Steven Adler</b><br>Guidelight AI</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/geoffrey-irving.jpg" width="72" height="72" alt="Geoffrey Irving"><br><sub><b>Geoffrey Irving</b><br>Resolution</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/victoria-krakovna.jpg" width="72" height="72" alt="Victoria Krakovna"><br><sub><b>Victoria Krakovna</b><br>Google DeepMind</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/neel-nanda.jpg" width="72" height="72" alt="Neel Nanda"><br><sub><b>Neel Nanda</b><br>Google DeepMind</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/mikita-balesni.jpg" width="72" height="72" alt="Mikita Balesni"><br><sub><b>Mikita Balesni</b><br>Apollo Research</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/tomek-korbak.jpg" width="72" height="72" alt="Tomek Korbak"><br><sub><b>Tomek Korbak</b><br>Former OpenAI</sub></td>
</tr>
<tr>
<td align="center" width="14%" valign="top"><img src="assets/speakers/benjamin-weinstein-raun.jpg" width="72" height="72" alt="Benjamin Weinstein-Raun"><br><sub><b>Benjamin Weinstein-Raun</b><br>Palisade Research</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/aengus-lynch.jpg" width="72" height="72" alt="Aengus Lynch"><br><sub><b>Aengus Lynch</b><br>Theorem</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/emmanuel-ameisen.jpg" width="72" height="72" alt="Emmanuel Ameisen"><br><sub><b>Emmanuel Ameisen</b><br>Anthropic</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/dylan-hadfield-menell.jpg" width="72" height="72" alt="Dylan Hadfield-Menell"><br><sub><b>Dylan Hadfield-Menell</b><br>MIT</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/katja-grace.jpg" width="72" height="72" alt="Katja Grace"><br><sub><b>Katja Grace</b><br>AI Impacts</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/oliver-habryka.jpg" width="72" height="72" alt="Oliver Habryka"><br><sub><b>Oliver Habryka</b><br>Lightcone Infrastructure</sub></td>
<td align="center" width="14%" valign="top"><img src="assets/speakers/tom-mcgrath.jpg" width="72" height="72" alt="Tom McGrath"><br><sub><b>Tom McGrath</b><br>Goodfire</sub></td>
</tr>
</table>

## Months

| Month | Episodes | Hours | Notes |
|---|---:|---:|---|
| July 2026 | 43 | 41.7 | chapters parsed from timestamped topics |
| August 2026 | 64 | 76.1 | chapters parsed from timestamped topics |
| September 2026 | 84 | 79.1 | includes the Sep 27–30 items that were "just outside" in v1 |
| October 2026 | 52 | 69.8 | richest: hand-written chapters, quotes, numbers, tags, level, views |
| **Total** | **243** | **266.8** | 92 release days · 2,701 chapters |

## Architecture

```mermaid
flowchart LR
  subgraph Page["index.html (no build step)"]
    CORE["core.js<br/>helpers · storage + v1→v2 migration<br/>normalise · speakers · claims"]
    HIST["history.js<br/>strict history · queue · notes<br/>follows · XP · 12 levels · 29 badges"]
    RECS["recs.js<br/>similarity · personal score<br/>fuzzy search · facets"]
    UI["ui.js<br/>cards · photos · toasts · XP pop"]
    PLAYER["player.js<br/>YouTube IFrame API · dock modes<br/>Document PiP · Media Session"]
    VIEWS["views.js<br/>home · browse · months · speakers<br/>drawer · history · queue · profile"]
    INS["insights.js<br/>SVG charts · heatmaps · claims tracker"]
    APP["app.js<br/>router · palette · shortcuts · theme · boot"]
  end
  DATA[("data/episodes.json<br/>roster.json · photos.json<br/>manifest.json → daily/*.json")] --> CORE
  INLINE[("assets/data-inline.js<br/>file:// fallback")] -.-> CORE
  CORE --> HIST --> RECS --> UI --> PLAYER --> VIEWS --> INS --> APP
  PLAYER <--> YT["youtube-nocookie.com<br/>IFrame player"]
  PLAYER <--> PIP["Pop-out window<br/>(documentPictureInPicture)"]
  HIST <--> LS[("localStorage asfe:*")]
  SW["sw.js<br/>network-first shell + data"] -.-> Page
```

### Data flow on load and while watching

```mermaid
sequenceDiagram
  participant B as Browser
  participant C as core.js
  participant H as history.js
  participant P as player.js
  participant Y as YouTube iframe
  B->>H: loadState() → migrate v1 keys once (v1 kept as backup)
  B->>C: fetch episodes.json + roster.json + photos.json (+ manifest daily files)
  C->>C: normalise mixed Jul–Oct schemas, dedupe by id, build speakers, claims, day counts
  B->>B: route(#/home, #/browse?…, #/speaker/…, #ep=id&t=sec)
  B->>P: play(id) (resume point or ?t)
  P->>Y: new YT.Player / loadVideoById
  loop every second (also in background tabs, audio mode and the pop-out)
    P->>Y: getCurrentTime / getPlayerState
    P->>H: add contiguous playback only → watched, daily, coverage bitset, session
  end
  P->>H: flush every 5 s, on pause, pagehide and tab hide (never pauses playback)
  H->>B: badges, +XP float, level-up, card progress bars
```

### Strict history states

```mermaid
stateDiagram-v2
  [*] --> Unwatched
  Unwatched --> InProgress: 20 s really played
  InProgress --> InProgress: contiguous playback adds seconds + 10 s coverage slices
  InProgress --> Completed: 90% of slices covered
  Completed --> Completed: rewatching adds time, never un-completes
  InProgress --> Unwatched: removed from History
  Completed --> Unwatched: removed from History
  note right of InProgress
    seeks, skips and paused time never count
    throttled background ticks count only if
    media time advanced at the playback rate
  end note
```

### Pop-out hand-over

```mermaid
flowchart LR
  A["Page player at t"] -->|"I / pop-out button"| B{"documentPictureInPicture?"}
  B -- yes --> C["requestWindow 480×340"] --> D["fresh YT.Player in pop-out at t<br/>messages relayed to this window"] --> E["controls + live chapter title<br/>history keeps counting"]
  E -->|"close"| F["fresh page player at the same second"]
  B -- no --> G["toast + audio mode<br/>(background playback continues)"]
```

## Keep playing when minimised

1. **Never pause on `visibilitychange`.** Hiding the tab only saves progress.
2. **Pop-out player** using the Document Picture-in-Picture API (Chrome / Edge 116+). The episode moves into an always-on-top window that survives a minimised browser. YouTube iframes cannot be moved between documents without reloading, so the app recreates the player inside the pop-out at the exact second and relays the iframe's messages back to the main window so the IFrame API (and the strict history clock) keep working.
3. **Audio mode** for every browser: video collapses to a bar with the speaker photo as artwork.
4. **Media Session** metadata and action handlers for OS media controls.
5. **Persistent dock** across every route.

## Strict watch history

Only contiguous forward playback counts. Each second the app compares how far the media advanced with how much wall time passed; a seek, skip or stall adds nothing. When a background tab or the pop-out throttles timers, a long gap counts only if the media advanced at almost exactly the playback rate over that gap. Coverage is a bitset of 10-second slices; an episode is **completed** at 90% coverage. Sessions (start, end, seconds, from→to) feed History, Insights, the streak calendar and badges such as Night Owl, Marathon and Binge.

## Recommendations

`score = 8×followed speakers + 3×affinity to speakers you watched + 1.5×org affinity + tag and keyword affinity + level fit (Intro → Intermediate → Deep-dive as you complete more) + unwatched bonus + small recency and popularity terms − completed`. "Because you watched X" uses pairwise similarity (shared speakers ×6, shared orgs, shared tags, keyword overlap, same show, same format). Up Next blends both and always serves your queue first.

## Levels and badges

12 levels: Novice · Curious Listener · Safety Apprentice · Alignment Scholar · Eval Analyst · Interpretability Initiate · Frontier Analyst · Control Researcher · Governance Strategist · Red-Team Lead · Policy Architect · Superalignment Sage.

XP: 1 per minute actually played · 50 per completed episode · 5 per note · 30 per badge · 2 per chapter jump (max 200) · 5 per followed researcher.

29 badges include First Frame, Full Episode, Ten Complete, Half Century, One Hour In … Centurion (100 h), **Monthly Completionist**, Four Months, **Speaker Collector**, Many Voices, **Org Explorer**, Org Cartographer, Every Format, The Godfathers, Three in a Row, Seven-Day Streak, **Night Owl**, Marathon, **Binge**, **Chapter Jumper**, **Note Taker**, Archivist, Following Along, Curator, Always on Top, Ears Only and Deep End.

## Keyboard shortcuts

| Key | Action | Key | Action |
|---|---|---|---|
| `Ctrl/⌘ K` | Command palette | `/` | Search |
| `Space` / `K` | Play / pause | `J` / `L` | −10 s / +10 s |
| `←` / `→` | −10 s / +10 s (Shift: 30 s) | `↑` / `↓` | Volume (theater) |
| `Shift P` | Previous chapter | `]` | Next chapter |
| `Shift N` | Next episode | `0`–`9` | Jump to 0–90% |
| `,` / `.` | Slower / faster | `M` | Mute |
| `F` | Fullscreen | `T` | Theater ↔ mini |
| `A` | Audio mode | `I` | Pop-out player |
| `N` | Note at this moment | `C` | Copy link at current time |
| `G` then `H/B/S/I/M/Q/P/N` | Go to a section | `?` | Shortcuts overlay |

## Data schema

`data/episodes.json` is an array. Field sets differ by month and are normalised at load time:

| Field | Type | Notes |
|---|---|---|
| `id` | string | YouTube video ID (dedupe key) |
| `title`, `channel`, `show` | string | |
| `date`, `month` | `YYYY-MM-DD`, `YYYY-MM` | upload date (US Pacific) |
| `duration` | `H:MM:SS` / `MM:SS` | |
| `speakers` | `[{name, affiliation}]` or `["Name (desc) — role"]` | hosts detected from role text and a host list |
| `names` | string[] | people who speak |
| `format` | string | bucketed into podcast / debate / panel / talk / hearing |
| `summary`, `why_watch`, `evidence` | string | |
| `chapters` | `[{t, seconds, title, detail}]` | October; otherwise parsed from `topics` |
| `topics` | `["0:12:34 Title", …]` | timestamps parsed when present |
| `key_claims` | strings `"0:10:26 — Name: quote"` or `{t, seconds, speaker, quote}` | |
| `numbers` | `[{speaker, value, t, seconds}]` | feeds the claims tracker |
| `people_mentioned`, `orgs_mentioned`, `tags` | string[] | clickable filters |
| `level` | Intro / Intermediate / Deep-dive | estimated for Jul–Sep ("est.") |
| `views` | number | October counts |
| `url`, `thumb` | string | |

`data/roster.json`: `[{name, photo, org, group, bio}]` for the curated researchers. `data/photos.json`: `{name: file}` for every photo in `assets/speakers/`.

## Adding new episodes (daily JSON + manifest)

Drop `data/daily/2026-10-28.json` (same shape as `episodes.json`) and list it:

```json
{ "files": ["daily/2026-10-28.json"] }
```

The app merges listed files after `episodes.json` on every load; a later copy of the same `id` replaces the earlier one. Then regenerate `assets/data-inline.js` for the `file://` fallback.

## Files

```
ai-safety-full-episodes/
├── index.html              app shell (views, dock, theater, drawer, palette, modals, bottom nav)
├── sw.js                   offline-friendly service worker
├── README.md               this file
├── assets/
│   ├── app.css             all styles (dark / light, glass, responsive)
│   ├── app.js              router, global events, command palette, shortcuts, theme, boot
│   ├── js/
│   │   ├── core.js         helpers, storage + migration, taxonomy, normalisation, speakers, claims
│   │   ├── history.js      strict history, library state, XP, levels, badges
│   │   ├── recs.js         recommendations, fuzzy search, filters
│   │   ├── ui.js           icons, cards, photo avatars, toasts, XP animation
│   │   ├── player.js       YouTube player, dock modes, pop-out, Media Session, chapters, seek bar
│   │   ├── views.js        home, browse, months, speakers, profile pages, drawer, history, queue, notes, about
│   │   └── insights.js     SVG charts, contribution heatmaps, claims tracker
│   ├── data-inline.js      inline data copy for file://
│   ├── cover.jpg
│   └── speakers/           147 photos (49 curated portraits + 98 host channel avatars)
└── data/
    ├── episodes.json       243 verified full episodes, Jul–Oct 2026
    ├── roster.json         curated researchers with bios
    ├── photos.json         name → photo file
    ├── manifest.json       daily files to merge
    └── daily/              drop daily JSON here
```

## Privacy

Everything you do stays in this browser's `localStorage` under `asfe:` keys (`history:v2`, `notes:v2`, `favs:v2`, `queue:v2`, `follows:v2`, `badges:v2`, `savedFilters:v2`, `prefs:v2`, `settings:v2`). v1 keys are migrated once and left in place as a backup. No analytics, no accounts, no server. Videos play through YouTube's privacy-enhanced embed; YouTube's terms apply to playback. Export and import a JSON backup from History.

## Method

* **Verified full episodes only:** the named researcher actually speaks; the transcript, description or chapters were checked; one copy per event; no clips, compilations or reaction videos.
* **Coverage:** uploads July 1 – October 27, 2026. **Compiled:** October 27, 2026.
* **Integrity:** de-duplicated by YouTube ID at load time; counts are shown in the app's About & method page.
* **Claims tracker:** keyword-matched P(doom) and timeline statements, attributed only to named non-host researchers. It is a navigation aid: check the moment itself.

## FAQ

<details><summary><b>Does it really keep playing when I minimise the browser?</b></summary>
<br>On Chrome and Edge 116+, yes: use the pop-out player (<code>I</code>) and it stays on top and keeps playing. Elsewhere, desktop browsers keep playing in a background tab and the app never pauses on tab switches; some mobile browsers pause embedded video in the background and a web page cannot override that.</details>
<details><summary><b>Did v2 keep my v1 history?</b></summary>
<br>Yes. On first load v2 copies your v1 history, notes, favourites, queue, settings and badges into v2 keys and leaves the v1 keys untouched.</details>
<details><summary><b>Why does a host show a channel logo?</b></summary>
<br>Hosts get the avatar of the channel their episode is on. For network channels that is the network's logo rather than the person.</details>
<details><summary><b>Why do some guests show a cropped video thumbnail?</b></summary>
<br>Guests without a curated portrait are shown with a circular crop of the thumbnail of their best solo episode, so everyone has a real photo.</details>
<details><summary><b>How do I share an exact moment?</b></summary>
<br>Press <code>C</code> (or "Copy link at current time"). The link looks like <code>…/ai-safety-full-episodes/#ep=VIDEOID&amp;t=754</code>.</details>

## Sources

Every episode links to its YouTube page; the full list with evidence is in [`data/episodes.json`](data/episodes.json). Channel avatars come from YouTube via the Piped API. Researcher portraits are curated public photos.

## Changelog

| Date | Change |
|---|---|
| 2026-10-27 | **v2.0**: 243 verified full episodes Jul–Oct 2026 (replaces the 52 + 8 set); pop-out always-on-top player (Document PiP), audio mode, Media Session, persistent dock, never pauses on tab switch; month switcher; GitHub-style release and watch heatmaps; speaker hub with a real photo for every person (49 curated portraits, 98 host channel avatars, thumbnail crops for the rest), bios, follow, profile pages, Play all and stated numbers; full episode reports with deep links at the current second; fuzzy search, 10 filter groups, 8 sorts, grid/list and saved filters; smarter recommendations with reasons; insights dashboard and claims tracker; 12 levels and 29 badges with XP animation; command palette, shortcuts overlay, dark/light/system theme, mobile bottom nav, service worker; 8 JS modules; v1→v2 storage migration; jsdom smoke test. |
| 2026-10-27 | v1: 52 episodes + 8 just outside, embedded player with theater and mini modes, chapters, strict watch history, Up Next with autoplay countdown, queue, notes, favorites, speaker directory, heatmap, levels and 17 badges, light/dark themes, manifest-based daily data. |

<div align="center">
<sub>A project by <b>Aniruddha Adak</b> · part of the <a href="https://lo3elyon.github.io/ASI/">ASI hub</a> · videos belong to their channels.</sub>
</div>
