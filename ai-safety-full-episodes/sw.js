/* AI Safety Full Episodes v2 · offline-friendly service worker (app shell + data + speaker photos).
 * Code and data are network-first (so updates and daily additions show up at once) with the cache as offline fallback;
 * speaker photos are cache-first. YouTube, thumbnails and fonts are never touched. */
const CACHE = "asfe-v2-2026-10-27";
const SHELL = [
  "./", "index.html", "assets/app.css", "assets/app.js", "assets/js/core.js", "assets/js/history.js", "assets/js/recs.js", "assets/js/ui.js",
  "assets/js/player.js", "assets/js/views.js", "assets/js/insights.js", "assets/data-inline.js", "assets/cover.jpg",
  "data/episodes.json", "data/roster.json", "data/photos.json", "data/manifest.json",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {})); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("asfe-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // YouTube, thumbnails, fonts go straight to the network
  const put = (r) => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; };
  if (url.pathname.includes("/assets/speakers/")) { e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(put))); return; }
  e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))));
});
