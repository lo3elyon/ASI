/* Threshold: The Future of ASI. Service worker scoped to this route only.
   Code and data: network first, cache as offline fallback. Images: cache first.
   YouTube, thumbnails, Wikimedia and Google Fonts are never intercepted. */
const CACHE = "thr-2026-10-29-v2";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "favicon.svg",
  "assets/css/app.css", "assets/css/v2.css", "assets/js/app.js", "assets/js/util.js", "assets/js/fx.js",
  "assets/js/core/overlay.js", "assets/js/core/search.js", "assets/js/core/motion.js", "assets/js/core/fx-pages.js", "assets/js/core/history.js", "assets/js/core/sound.js",
  "assets/js/views/home.js", "assets/js/views/researchers.js", "assets/js/views/watch.js", "assets/js/views/learn.js", "assets/js/learn/game.js", "assets/js/learn/blocks.js",
  "assets/vendor/gsap.min.js", "assets/vendor/ScrollTrigger.min.js", "assets/vendor/lenis.min.mjs", "assets/vendor/fuse.min.mjs",
  "assets/fonts/unbounded-latin-wght-normal.woff2", "assets/fonts/inter-latin-wght-normal.woff2", "assets/fonts/fraunces-latin-wght-italic.woff2", "assets/fonts/space-grotesk-latin-wght-normal.woff2", "assets/fonts/jetbrains-mono-latin-wght-normal.woff2",
  "assets/brand/mark.svg", "assets/brand/logo.svg", "assets/brand/icon-192.png", "assets/img/world-dots.svg",
  "data/researchers.json", "data/videos.json", "data/course.json", "data/glossary.json", "data/orgs.json", "data/timeline.json",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {})); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("thr-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (/\.(mp4|webm)$/.test(url.pathname)) return;
  const put = (r) => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; };
  if (/\/assets\/(img|people|brand|fonts|vendor|geo)\/|\/data\/logos\//.test(url.pathname)) { e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(put))); return; }
  e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))));
});
