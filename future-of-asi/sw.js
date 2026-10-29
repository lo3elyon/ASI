/* Threshold: The Future of ASI. Service worker scoped to this route only (Round 3).
   Install: precache the core list from offline-manifest.json (shell, every view module, all data, fonts,
   small vendor libs, the explosion/ and library/ pages, book data and library texts).
   The page then warms photos, logos, covers and images in the background, and the header button
   "Save everything for offline" adds the rest. Videos are never cached.
   Code, data and pages: network first, cache fallback, so a deploy is never hidden behind a stale shell.
   Images and fonts: cache first. YouTube posters: cached when viewed, capped. */
const V = "v3-2026-10-29"; const BUILD = "eefc3ecbae5e"; // BUILD is stamped by raw/gen/offline_manifest.py so the worker updates when files change
const CORE = `thr-core-${V}-${BUILD}`;
const RT = "thr-rt";          // runtime images, kept across versions
const YT = "thr-yt";          // YouTube posters, capped
const YT_MAX = 160;
const SCOPE = new URL(self.registration.scope);
const SHELL_MIN = ["./", "index.html", "manifest.webmanifest", "favicon.svg", "offline-manifest.json",
  "assets/css/app.css", "assets/css/v2.css", "assets/css/v3-shell.css", "assets/js/app.js", "assets/js/util.js"];

async function precache() {
  const c = await caches.open(CORE);
  let list = SHELL_MIN;
  try {
    const r = await fetch("offline-manifest.json", { cache: "reload" });
    if (r.ok) { const m = await r.json(); list = Array.from(new Set(SHELL_MIN.concat(m.core || []))); await c.put("offline-manifest.json", new Response(JSON.stringify(m), { headers: { "content-type": "application/json" } })); }
  } catch (e) {}
  // Six at a time; one missing file never breaks the install.
  let i = 0;
  const worker = async () => { while (i < list.length) { const u = list[i++]; try { const r = await fetch(new Request(u, { cache: "reload" })); if (r.ok) await c.put(u, r); } catch (e) {} } };
  await Promise.all(Array.from({ length: 6 }, worker));
}
self.addEventListener("install", (e) => { e.waitUntil(precache().then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("thr-") && ![CORE, RT, YT].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); if (e.data && e.data.type === "version" && e.ports[0]) e.ports[0].postMessage({ version: V }); });

const inScope = (url) => url.origin === SCOPE.origin && url.pathname.startsWith(SCOPE.pathname);
const rel = (url) => url.pathname.slice(SCOPE.pathname.length);
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
async function fromCache(req, opts = {}) {
  const hit = await caches.match(req, opts);
  if (hit) return hit;
  return caches.match(req, Object.assign({ ignoreSearch: true }, opts));
}
async function putCore(req, res) { if (res && res.ok && res.type === "basic") { const c = await caches.open(CORE); await c.put(req, res.clone()); } return res; }

/* Offline deep link into a snapshot page that was never saved: send it to the app route instead. */
function appRouteFor(path) {
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return null;
  if (parts[0] === "r" && parts[1]) return `./?p=${encodeURIComponent(parts[1])}#/researchers`;
  if (parts[0] === "blog" && parts[1]) return `./#/blog/${parts[1]}`;
  if (/^[a-z0-9-]+$/.test(parts[0]) && !/\./.test(parts[0])) return `./#/${parts[0]}`;
  return null;
}
const OFFLINE_HTML = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Threshold</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07111f;color:#e6f0fa;font:16px/1.6 system-ui,sans-serif;text-align:center;padding:24px}a{color:#22d3ee}</style><div><h1 style="font-size:26px">You are offline</h1><p>This page was not saved on this device yet. The pages you already opened still work.</p><p><a href="${SCOPE.pathname}">Open Threshold</a></p></div></html>`;

async function navigate(e, url) {
  try {
    const res = await Promise.race([fetch(e.request), timeout(6000)]);
    if (res && res.ok) { putCore(new Request(url.href.split("#")[0].split("?")[0]), res.clone()); return res; }
    if (res && res.status < 500) return res;
    throw new Error("bad");
  } catch (err) {
    const clean = url.origin + url.pathname;
    const hit = await caches.match(clean, { ignoreSearch: true }) || await caches.match(clean.endsWith("/") ? clean + "index.html" : clean + "/", { ignoreSearch: true });
    if (hit) return hit;
    const r = appRouteFor(rel(url));
    if (r && (await caches.match(SCOPE.href))) return Response.redirect(new URL(r, SCOPE).href, 302);
    return new Response(OFFLINE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
}

async function capYT() { const c = await caches.open(YT); const ks = await c.keys(); for (let i = 0; i < ks.length - YT_MAX; i++) await c.delete(ks[i]); }

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "i.ytimg.com" || url.hostname === "img.youtube.com") {
    e.respondWith(caches.open(YT).then(async (c) => { const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r && (r.ok || r.type === "opaque")) { c.put(req, r.clone()); capYT(); } return r; }).catch(() => caches.match(req).then((h) => h || Response.error())));
    return;
  }
  if (!inScope(url)) return;
  if (/\.(mp4|webm|mov)$/i.test(url.pathname) || req.headers.has("range")) return;
  if (req.mode === "navigate") { e.respondWith(navigate(e, url)); return; }
  const p = rel(url);
  if (/\.(jpe?g|png|webp|gif|avif|svg|ico|woff2?|ttf)$/i.test(url.pathname) || /^assets\/vendor\//.test(p)) {
    e.respondWith(fromCache(req).then((hit) => hit || fetch(req).then(async (r) => { if (r && r.ok) { const c = await caches.open(/^assets\/vendor\//.test(p) || /\.woff2?$/.test(p) ? CORE : RT); c.put(req, r.clone()); } return r; })));
    return;
  }
  e.respondWith(fetch(req).then((r) => putCore(req, r)).catch(async () => (await fromCache(req)) || new Response("", { status: 504, statusText: "offline" })));
});
