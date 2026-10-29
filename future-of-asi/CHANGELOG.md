# Changelog

All notable changes to Threshold: The Future of ASI (`future-of-asi/` in [lo3elyon/ASI](https://github.com/lo3elyon/ASI)) are written here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are named by build round.

Live: https://lo3elyon.github.io/ASI/future-of-asi/

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

- Photos: 80 more researcher photos (217 of 218) and 574 named signer photos, each with source and credit.
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
