/* AI Safety Full Episodes · offline-friendly service worker (app shell + data + speaker photos).
 * Code and data are network-first (so updates and daily additions show up at once) with the cache as offline fallback;
 * speaker photos are cache-first. YouTube, thumbnails and fonts are never touched. */
const CACHE = "asfe-2026-10-28-2173d702";
const SHELL = [
  "./", "index.html", "assets/app.min.css", "assets/app.bundle.js", "assets/js/boot.js", "assets/data-inline.js", "assets/cover.jpg", "assets/brand/mark.svg",
  "favicon.svg", "favicon.ico", "apple-touch-icon.png", "manifest.webmanifest", "assets/brand/icon-192.png", "assets/brand/icon-512.png",
  "data/episodes.json", "data/roster.json", "data/photos.json", "data/manifest.json",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {})); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("asfe-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // YouTube, thumbnails, fonts go straight to the network
  const put = (r) => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; };
  if (/\.(mp4|webm)$/.test(url.pathname)) return; // background videos stream straight from the network (range requests)
  if (url.pathname.includes("/assets/speakers/") || url.pathname.includes("/assets/bg/")) { e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(put))); return; }
  e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))));
});
