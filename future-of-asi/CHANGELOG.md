# Changelog

All notable changes to Threshold: The Future of ASI (`future-of-asi/` in [lo3elyon/ASI](https://github.com/lo3elyon/ASI)) are written here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are named by build round.

Live: https://lo3elyon.github.io/ASI/future-of-asi/

## Round 4.2 (2026-10-30): touch-everything QA, accessibility, Back fixes, performance and SEO

### Fixed

- Search and Back. Opening search (the Search button, Ctrl K or /) now adds one history entry, so the browser Back button closes it and Back again leaves the page as normal. X, Escape and Ctrl K step back over that entry, so Back never lands on a dead step. Picking a result closes search first and then opens it, so Back from a page, a profile or a video you found returns to where you searched.
- The ? shortcut sheet works the same way: Back closes it, X and Escape leave no dead entry, Forward opens it again.
- Organisations. Opening an organisation sheet now adds one entry at `#/orgs?o=<id>`, so Back closes the sheet and stays on Organisations instead of leaving the page. Moving to a related organisation inside the open sheet replaces that entry. A shared `#/orgs?o=<id>` link still opens the sheet directly.
- Very long text in search no longer freezes the page. The box stops at 200 characters, typing is debounced, and fuzzy matching only looks at the first 48 characters while ranking still checks every word.
- Search showed two X buttons in Chromium (the browser's own clear button next to ours). The box is now a plain text box with a search keyboard on phones, so only one X shows.
- Search gives focus back to the button that opened it, and the shortcut sheet closes on Escape even when focus moved out of it.
- The motion button tells the truth when the device asks for reduced motion.

### Accessibility

- Accessible names now contain the words you see (WCAG 2.5.3) on the logo link, the Search button, every Watch card, library books, video posters, AI Control parts and share and copy buttons.
- Small text colours meet 4.5:1 on dark (the dim grey is lighter, the docs terminal comments, the futures matrix rows, the active researcher tab count, library counters and badges). The light theme uses the darker shade of each category colour for text, and eyebrows, section numbers, tags and the Voices word cloud follow it.
- Lists that held buttons (the futures bars, the AI Control levels) no longer claim to be lists, charts that hold links are groups instead of images, and the explosion story steps are fully readable with reduced motion.
- Heading order fixes on the footer and Voices, a visible focus ring on range sliders, a close button on the display popover and a clickable p(doom) dot.

### Performance

- The explosion and library pages ship an empty header of the right height in their HTML, so mounting the menu no longer pushes the page down, and the library preloads its italic and mono fonts. Library layout shift went from 0.196 to 0.003 in the Playwright test at 1440 wide.

### SEO

- The explosion and library pages now carry full Twitter card tags (title, description, image, image alt), Open Graph image size and alt, and the home page has og:image:alt and twitter:image:alt. All 258 snapshot pages pass the SEO checks: unique titles and descriptions, canonical in the sitemap, JSON-LD, Open Graph and Twitter tags.

### Tested

- Playwright at 1440 dark and 360 light: axe-core on all 60 routes, the touch-everything crawler on home, researchers, watch, orgs, careers, compare, stats, starter, learn, explosion and library, a new Back suite for search, the ? sheet and the organisation sheet, and the Round 4.1 Watch mini player history suite.

## Round 4.1 (2026-10-30): Watch mini player Back fix and a full Watch QA pass

### Fixed

- Watch mini player and Back. Opening the mini player (the small picture in picture button on any video card, on a featured slide, with M, or from the queue) made no history entry, so Back skipped straight past it and left the page instead of closing it, and the player then vanished with the page. The mini player is now a layer with exactly one history entry: Back closes it, Back again goes to the previous page as normal. Switching video, Next in queue and a second mini click replace that entry instead of adding more. Closing with X or Escape steps back over the entry, so no dead entry is left for Back to land on. Forward, or coming back to Watch from another page, restores the mini player with a poster, so nothing plays until you press play.
- Mini player into the theater. Open in the theater keeps the mini entry under the theater, so Back closes the theater and brings the mini back as a poster, and Back again closes the mini.
- The queue panel works the same way: one entry, Back or X closes it. When the mini is playing from the queue, closing either one leaves no stray entry behind, and Back still closes the newest layer first.
- YouTube frames (mini player, video theater, inline posters, lesson videos) are now built as an element with the address set before it is attached, through one helper `ytFrame` in `util.js`, so loading a video never adds its own entry to the browser history.
- On phones the mini player, the Queue button, the queue panel and the shortcuts card sat under the bottom tab bar and could not be tapped. They now sit above it, and when the mini and the queue are both open the queue moves up so the mini controls stay reachable.
- Pressing ? on Watch opened both the Watch shortcuts card and the site wide shortcut sheet on top of it. It now opens only the Watch card.
- With reduced motion the featured slides start paused, but the button still said Pause slides. It now says Resume slides from the start.
- The home hero glow no longer throws a canvas colour error when the page has no scroll room yet.

### Tested

- Every Watch control at 360 and 1440 wide with Playwright: all 17 category chips (and a second click back to All), category tiles, search and its empty state, all six sorts, person, level, length, year and language filters, Unwatched only, Clear all filters, Show more, featured carousel previous, next, dots and pause, card play, theater play, wide mode and Up next, watch later on and off, Queue all and Clear, add to queue and the duplicate guard, mini player open, switch, next, expand, poster restore and close, queue panel open, move up, remove, play in mini, open in theater, clear and close, the shortcuts card, J, K, W, Q, M, Escape and /, hover preview, playlist arrows, Play all and Queue all, featured faces and Profile, deep links `?v=` and `#/watch/c/<id>`, with Back and Forward after each, and zero console errors.

## Round 4 (2026-10-30): compare, stats, starter kit, daily brief, shortcuts, share, full QA fixes

Final. Pushed to lo3elyon/ASI on 2026-10-30.

### Added

- Compare researchers (`#/compare`, People menu). Pick two or three of the 218 people and read them side by side: group, lab, role, country, p(doom) with its source and a 0 to 100 bar, AGI timeline, their one line warning, the lab they left and why, past employers, focus, citations, books, key papers, two sourced quotes with a copy button, Pacing the Frontier signature and comment, and their videos. A Common ground panel shows shared labs, shared categories, their p(doom) on one line and videos where they appear together. Five starting sets (the 2018 Turing Award winners, three frontier lab leaders, very worried and very calm, three who left OpenAI, two AI control researchers). The choice lives in the link, `#/compare?ids=a,b,c`, and bad ids are dropped. Empty cells say "Not in the data" instead of guessing.
- Threshold in charts (`#/stats`, Start menu). Charts counted live from the data files: researchers by group, region, country and current organisation, most common past employers, labs people left, every placeable p(doom) on one line with faces, the four bands, quotes by year, videos by year, category, level and channel, most featured people, Pacing signers named and anonymous and by employer, organisations by type and country, timeline events by decade and the 60 papers by year and topic. Every column chart has a Show the numbers table, and every card names the file and field it was counted from.
- Starter kit (`#/starter`, Act menu). A printable kit built only from the guide's own data: a seven day first week plan, all eight paper reading paths, nine courses plus the guide's ten units, seven books, newsletters, podcasts, blogs, fellowships, career guides and sixteen glossary words. 107 tick boxes with progress saved on this device, per path progress, Copy as text (ticks included), Copy link, Clear ticks and Print or save as PDF. The print stylesheet gives clean black on white pages with every outside link written out and no header, menu or buttons.
- Today's brief on Home, right under Today's picks: a paper of the day, an idea of the day from the concepts map and a person of the day, picked by date so everyone sees the same set. Copy today's brief puts the quote, video, book, paper, idea and person on the clipboard with links.
- Keyboard shortcuts. Press ? on any page, including the explosion and library pages, for the full list. g then a letter jumps to twelve pages (h home, r researchers, c compare, v voices, w watch, p papers, l learn, t timeline, o orgs, s charts, k starter kit, y history). Shift T switches theme, Shift M turns motion on or off, Shift L copies a link to what is open. Nothing fires while you type. The sheet traps focus, closes with Escape and gives focus back. Also in the You menu and the phone drawer.
- Share and copy buttons. Person profiles get Share profile (copies the crawlable `r/<id>/` link) and Compare with others. Every quote in a profile, on the Voices wall and in Compare gets Copy quote, which copies the exact words, the name, the source link and the profile link. The video theater, the paper drawer, Compare, Charts, the Starter kit and the daily brief cards have Share. Phones use the system share sheet; elsewhere the link is copied and a toast says so. One helper, `assets/js/core/share.js`.
- Three new hero images (compare, stats, starter) with no people or text, and a heading and body font pair for each new route in `route-fonts.json` (30 routes now).
- Crawlable snapshot pages for the three new routes with real content (the p(doom) list, chart counts, the kit's links), their own Open Graph images and sitemap entries.

### Changed

- The offline list now includes the new routes, scripts, styles and images.
- `#/history` now opens the Warnings timeline, the story of AI warnings. Your personal history moved to `#/your-history` (You menu, shortcut g then y), and the nav, shortcuts, metadata, motion colours, route fonts and snapshot pages follow it.
- Ctrl K search ranks exact titles first, then names, pages and organisations that hold the query as a whole word, then titles that start with it. Matched words are highlighted and fuzzy guesses are labelled Close spelling.
- Save everything for offline opens a progress panel with files saved, size, and a final check that counts what is really in the cache.

### Fixed

- Explosion: the chapter rail shows its labels only on hover or focus, on a solid background, so it no longer covers chapter 01. The chapter 01 heading was fixed.
- Library: the hero counts 11 full texts and 17 more free online as two separate figures, chips return to All when pressed again, a note explains when the reader opens a chapter guide rather than the book, the closed reader is inert, and the contents button gives feedback.
- Accessible names: hidden separators inside links so screen readers do not run words together.
- Voices: the counter reads N of 135 with a note on why the wall below holds 152, and the stage pauses on hover.
- Researchers: a search with matches outside the current group says how many and offers Search all groups.
- Blog: the lead post hides while a topic is chosen, and there is an empty state.
- Chips on many pages (Blog, Policy, Bharat, Library and others) return to All when the active chip is pressed again. Timeline and Watch get Clear filters buttons.
- Tools: forecaster subtitles wrap to two lines on word breaks.
- Learn: sort it drops the item where you let go, even on a fast drag, shows tap targets after a tap, and the prompt says you can drag or tap.
- Agents loop gets a centre label. Control level cards wrap at any width, down to 320 px.
- Pacing merges duplicate organisation names and shows chip counts. Orgs gets a Close button and search that ignores spaces. Profiles no longer repeat the country. The Prepare breathing orb stays inside the window. Arena explains its scoring. Home section gap narrowed. Bharat posts get share buttons.
- Hub: the AI to AGI to ASI stepper disables Back before the first step and Next at the last, and the hub card says the 1,386 figure is the Pacing the Frontier letter's total signers.

## Round 3.2 (2026-10-30): polish, careers, logos, banner

- Hub banner and social image redrawn with the real counts: 218 researchers, 152 sourced quotes, 1,375 verified videos, 1,386 signers.
- Careers path finder: every path can now come up, with a new "Which would you rather make?" question. All 240 answer sets tested.
- Back and Forward work across routes, overlays, library and explosion. #/r/<id> opens that person.
- New logos for Korea AI Safety Institute and AI Impacts. Logos with purple or pink sit on a plain tile. Inherent and Cognition logos no longer vanish in dark mode.
- Phone polish: futures compare and year table, lever headers, orgs link pairs, pacing legend, watch queue, control glossary, learn streak card, long words in quotes.
- Quote of the day never picks a link only quote.
- 404 page for the route and the repo root.

## Round 3.1 (2026-10-30): QA fixes and SEO

- Header: THRESHOLD title and its tagline no longer overlap.
- Researchers: closing a profile no longer blanks the grid; Constellation toggle works again.
- Search: each page row shows its type once; category tabs no longer clipped.
- Papers: the detail drawer closes with Escape and a visible close button.
- Concepts: map labels no longer overlap or clip at the edge.
- Arena: no repeated "Correct.", balanced headline, even stat strips.
- On this page rows wrap on desktop and swipe on phones, so every pill is reachable.
- Policy search has a clear button. Careers only suggests policy fellowships for policy paths.
- Orgs: a styled flat map when WebGL is missing.
- Library reader: zoom reflows the text with a level readout, nothing clipped.
- Voices histogram labels fit on phones; marquees no longer double up with reduced motion.
- SEO: every page title under 65 characters and description under about 160; JSON-LD on the library.
- Hub: featured banner shows in full; NEW badges no longer cover card text.

## [v3] - 2026-10-29

Round 3. Commit: filled in when this round is pushed.

### Added

- One header for every page. The hash app, `explosion/` and `library/` all render the same header from `assets/js/core/nav.js`.
- A categorised mega menu with seven groups: Start, People, History, Watch and Read, Learn, Act and You. Every item has an icon and a one line description. It shows from 1000px wide, opens on hover or click, and works fully from the keyboard (arrow keys, Home, End, Escape). Clicking a group that hover opened pins it open, outside click or Escape closes it, and panels always stay inside the window.
- A full screen accordion drawer on phones, with search, theme, motion, sound and GitHub shortcuts at the top.
- A glowing GitHub button beside the theme toggle on every page, both themes, mobile too. It links to the source folder.
- Motion and sound toggles in the header, and an Offline pill that shows when the connection drops.
- Search from the sub pages: the search button, Ctrl K and the slash key open the main search.
- Routes registered by `assets/js/views/extra/registry.js` (`EXTRA_ROUTES`) join the router, the menu (by group), search, metadata, the offline list and the sitemap on their own.
- View transitions with a CSS fallback, a top progress bar and a reading progress line.
- Hover and focus prefetch for view modules.
- Each page has its own font pairing. `assets/fonts/route-fonts.json` lists the heading and body font for every route (27 of them), and the shell preloads only the current route's two files when it starts. Hovering a menu link only prefetches them at low priority. Every face uses `font-display: swap`.
- An error boundary around every view with a Try again button, and a clear offline message when a page was never saved.
- Offline reading. The service worker precaches the shell, every view module, all data, fonts, vendor libraries, both sub pages, book data and library texts. Photos, signer photos, logos and covers are cached in the background after the first visit. `offline_manifest.py` also reads `explosion/offline-assets.json` and `library/offline-assets.json`, so files those pages load on their own are never missed.
- A "Save everything for offline" action in the You menu, with a progress bar. The file list comes from `raw/gen/offline_manifest.py`, written to `offline-manifest.json`. Videos are excluded. YouTube posters are cached when viewed, up to 160.
- An original SVG emblem for each of the 16 Alignment 101 badges, each with its own frame, glyph and glow. Locked badges are greyscale with a lock. Earned badges tilt and shine on hover.
- Ten category colours (cyan, teal, amber, red, blue, lime, orange, yellow, emerald, sky) as CSS variables and utility classes: glow, card hover glow, cursor spotlight, magnetic buttons, animated gradient borders, gradient text, text reveal and kinetic headings.
- A small motion library, `assets/js/core/motion3.js`: scroll reveals, split text, counters, parallax, tilt, magnetic buttons, marquee, stagger and scroll progress. All of it respects reduced motion.
- Per route metadata on every navigation: title, description, canonical, Open Graph, Twitter card and JSON-LD with breadcrumbs. Theme colour follows the chosen theme.
- Signer photos: `raw/gen/sync_data.py` copies `data/photos-signers/` and builds `data/signer-photos.json`. 526 of the 1,094 named signers now show a photo, in search, on the Pacing page and in their own overlay.
- Researcher photos: `sync_data.py` now also merges the newer photo list in `data/photo-parts/photos-researchers.json` and matches files named after a researcher id. 217 of 218 researchers show a real photo. Leo Gao is the one left, because no verified photo of him exists.
- `raw/gen/check_photos.py`, which lists every researcher and named signer that would show initials instead of a photo, and fails if a photo exists in `data/` but the site would not use it.
- This changelog, linked from the footer and the README.

- Photos: 80 more researcher photos (217 of 218) and 701 named signer photos, each with source and credit.
- Ten new routes: papers, concepts, agents, arena, debates, careers, policy, numbers, kids, bharat.
- Richer AI Control, Timeline, Watch and Organisations pages, and about 60 new sections across the other core pages.
- Pacing now leads with 1,386 total signers (1,094 named, 292 anonymous).
- Library grows to 79 titles with a WebGL 3D reader and shelf; explosion grows to 22 chapters.

### Changed

- The history page now shows real names and photos, video thumbnails and titles, lesson titles with their unit, post titles and covers, books with chapters read, and deep dives. It groups items by Today, Yesterday and date, with type filters, search and a short summary.
- Snapshot pages such as `learn/` and `r/<id>/` now hand over to the app at the route root, so every menu link keeps working after a deep link.
- Researcher photos always resolve in the same order: local file, photo manifest, signer photo, remote image.
- The manifest has more shortcuts (Library and Intelligence explosion) and the Apple touch icon.
- `prerender.py` also writes snapshots for extra routes and lists both sub pages in the sitemap.
- The README explains why Threshold stays static instead of moving to React or Next.

### Removed

- The More menu and the separate, shorter header on the sub pages.

### Fixed

- Going from a hash page to the Intelligence explosion or the Library and then back to Learn or any other page could route oddly or show a blank view. Tested headless with the service worker on and off, desktop and mobile, a slow network, Back and Forward, deep links and fast repeated clicks.
- Clicking a menu group right after hovering it no longer closes it again.
- Hidden reveal animations no longer cause sideways scrolling on small screens.

## [v2] - 2026-10-29

Round 2. Commit [ae2ef43](https://github.com/lo3elyon/ASI/commit/ae2ef43).

### Added

- Person and video overlays that open on top of any page and keep your place, with deep links `?p=<id>` and `?v=<id>`.
- 218 researcher profiles with careers, backgrounds, former labs, key papers, books, courses and 16 categories, in grid, constellation and table views.
- 137 checked researcher photos with credits.
- The Pacing the Frontier page with all 1,094 named signers and their comments.
- 80 organisations on a three.js globe with official logos.
- 1,375 verified videos in 17 categories and 31 collections, click to play only.
- The history page, advanced search across every dataset, and a 10 unit course with 185 activities, boss quizzes, a daily streak, XP, badges and a final exam.
- The Intelligence explosion deep dive (`explosion/`) and the Library with a reader (`library/`).
- Page motion with GSAP, ScrollTrigger and Lenis, optional UI sounds, and 242 SEO snapshot pages.

## [v1] - 2026-10-29

First release. Commit [9acd958](https://github.com/lo3elyon/ASI/commit/9acd958).

### Added

- Threshold with 13 pages: home, futures explorer, researchers, voices wall, warnings timeline, watch, AI control with a blue team game, Alignment 101, prepare, organisations, tools, blog and docs.
- 73 researchers, 123 sourced quotes, 495 verified videos in 19 collections, 59 timeline events, 38 organisations and 73 resources.
- A 6 unit course, three tools (p(doom) calculator, timeline forecaster, risk dial), 11 blog posts, docs, a PWA and a launch film.

[v3]: https://github.com/lo3elyon/ASI/tree/main/future-of-asi
[v2]: https://github.com/lo3elyon/ASI/commit/ae2ef43
[v1]: https://github.com/lo3elyon/ASI/commit/9acd958
