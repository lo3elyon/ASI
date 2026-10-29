/* Threshold: The Future of ASI. Service worker scoped to this route only.
   Code and data: network first, cache as offline fallback. Images: cache first.
   YouTube, thumbnails, Wikimedia and Google Fonts are never intercepted. */
const CACHE = "thr-2026-10-29-v1";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "favicon.svg",
  "assets/css/app.css", "assets/js/app.js", "assets/js/util.js", "assets/js/fx.js",
  "assets/js/views/home.js", "assets/js/views/futures.js", "assets/js/views/researchers.js", "assets/js/views/voices.js",
  "assets/js/views/timeline.js", "assets/js/views/watch.js", "assets/js/views/control.js", "assets/js/views/learn.js",
  "assets/js/views/prepare.js", "assets/js/views/orgs.js", "assets/js/views/blog.js", "assets/js/views/docs.js", "assets/js/views/tools.js",
  "assets/brand/mark.svg", "assets/brand/logo.svg", "assets/brand/icon-192.png", "assets/img/hero-horizon.jpg", "assets/img/world-dots.svg",
  "data/researchers.json", "data/videos.json", "data/video-collections.json", "data/orgs.json", "data/timeline.json", "data/resources.json",
  "data/catastrophe-prep.json", "data/futures.json", "data/forecasts.json", "data/course.json", "data/glossary.json", "data/faq.json",
  "data/blog/index.json", "data/docs/index.json",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {})); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("thr-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (/\.(mp4|webm)$/.test(url.pathname)) return;
  const put = (r) => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; };
  if (/\/assets\/(img|people|brand)\//.test(url.pathname)) { e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(put))); return; }
  e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))));
});
