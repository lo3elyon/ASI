/* Threshold app shell (Round 3): one header everywhere, categorised mega menu, hash router with
   view transitions, a top progress bar, hover prefetch, an error boundary that never leaves a blank view,
   per route metadata, offline support, search, motion, theme and sound. Static, no build step. */
import { $, $$, store, reveal, spotlight, RM, toast } from "./util.js";
import { initOverlays, sync as syncOverlays, stripOverlayParams, isOpen, closeAll, scrollLockY } from "./core/overlay.js";
import { initSearch, openPal, closePal } from "./core/search.js";
import { startLenis, stopLenis, pageFx, killPage, jumpTo } from "./core/motion.js";
import { initSound, setSound } from "./core/sound.js";
import { mountHeader, markActive, setExtras, refreshMenu, ITEMS, setDrawer } from "./core/nav.js";
import { applyMeta, META } from "./core/meta.js";
import { auto as m3auto, cleanupAll as m3cleanup, catFor, registerCats, scrollProgress } from "./core/motion3.js";
import { initOffline, registerSW, saveEverything, ROOT } from "./core/offline.js";
import { preloadFonts } from "./core/fonts.js";

/* ---------- Snapshot pages (/learn/, /r/<id>/ ...) become the real app at the route root ---------- */
const PRE = window.__PRE || null;
const baseEl = document.querySelector("base");
if (PRE) {
  const root = ROOT.href;
  const q = new URLSearchParams(location.search);
  if (PRE.p && !q.has("p")) q.set("p", PRE.p);
  const hash = location.hash && location.hash !== "#" ? location.hash : `#/${PRE.route || ""}`;
  try { history.replaceState(history.state, "", `${root}${q.toString() ? "?" + q : ""}${hash}`); } catch (e) {}
  if (baseEl) baseEl.setAttribute("href", root);
}

/* ---------- Routes: core views plus EXTRA_ROUTES from views/extra/registry.js ---------- */
const ROUTES = {};
ITEMS.filter((i) => !i.page).forEach((i) => { ROUTES[i.slug] = { mod: i.mod || i.slug || "home", title: i.title }; });
ROUTES.home = ROUTES[""];
const EXTRA = {};
const view = $("#view");
let cleanup = null, current = "", first = true, rendering = 0;

if (new URLSearchParams(location.search).get("embed") === "1") document.body.classList.add("embed");

function parse() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const [path, q] = h.split("?");
  const parts = path.split("/").filter(Boolean);
  return { name: parts[0] || "", params: parts.slice(1), query: new URLSearchParams(q || "") };
}
const modUrl = (r, bust) => (r.extra ? null : `./views/${r.mod}.js${bust ? "?r=" + bust : ""}`);
const loadMod = (r, bust) => (r.extra ? r.extra.load() : import(modUrl(r, bust)));

/* Old links (#/researchers/<id>, #/watch/<id>, and the snapshot style #/r/<id>) become overlays on the list page */
function legacy() {
  /* #/history is the story of AI warnings, so it opens the Warnings timeline. Personal history lives at #/your-history. */
  if (/^#\/history(\/|\?|$)/.test(location.hash)) {
    history.replaceState(history.state, "", `${location.pathname}${location.search}${location.hash.replace(/^#\/history/, "#/timeline")}`);
    window.__fromHistory = true;
    return true;
  }
  const m = location.hash.match(/^#\/(researchers|watch|r|v)\/([A-Za-z0-9_-]+)\/?$/);
  if (!m || (m[1] === "watch" && m[2] === "c")) return false;
  if (m[1] === "r") m[1] = "researchers"; else if (m[1] === "v") m[1] = "watch";
  const q = new URLSearchParams(location.search);
  q.set(m[1] === "researchers" ? "p" : "v", m[2]);
  history.replaceState({}, "", `${location.pathname}?${q}#/${m[1]}`);
  return true;
}

/* ---------- Progress bar ---------- */
const bar = document.createElement("div"); bar.className = "route-bar rb3"; bar.setAttribute("aria-hidden", "true"); document.body.appendChild(bar);
let barT = 0;
function barStart() { clearInterval(barT); let w = 8; bar.classList.add("on"); bar.style.transform = `scaleX(${w / 100})`; barT = setInterval(() => { w = Math.min(90, w + (92 - w) * 0.12); bar.style.transform = `scaleX(${w / 100})`; }, 160); }
function barDone() { clearInterval(barT); bar.style.transform = "scaleX(1)"; setTimeout(() => { bar.classList.remove("on"); bar.style.transform = "scaleX(0)"; }, 320); }

const SKEL = `<div class="skel-page" aria-hidden="true"><div class="skel skel-hero"></div><div class="wrap"><div class="skel skel-line w60"></div><div class="skel skel-line w40"></div><div class="skel-grid"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div></div>`;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("This page is taking too long to load.")), ms))]);

function errorBox(msg, retry) {
  const off = !navigator.onLine;
  const w = document.createElement("div"); w.className = "page page-error";
  w.innerHTML = `<div class="wrap section"><div class="err3 card-glow glow-amber" role="alert"><div class="eyebrow">${off ? "Offline" : "Something went wrong"}</div><h2>${off ? "This page is not saved on this device yet" : "This page did not load"}</h2><p>${off ? "You are offline and this part of Threshold was not saved yet. Pages you opened before still work. Use Save everything for offline in the You menu next time you are online." : "It may be a slow connection or a small bug. Try again, or go home. Nothing you saved is lost."}</p><div class="row"><button class="btn primary" type="button" data-retry>Try again</button><a class="btn ghost" href="#/">Go home</a></div>${msg && !off ? `<details><summary>Details</summary><code>${String(msg).replace(/[<>&]/g, "")}</code></details>` : ""}</div></div>`;
  w.querySelector("[data-retry]").addEventListener("click", retry);
  return w;
}

let attempt = 0;
async function route(opts = {}) {
  legacy();
  const { name, params, query } = parse();
  if (query.has("search")) { setTimeout(() => openPal({ history: false }), 60); const h = location.hash.replace(/[?&]search(=[^&]*)?/, "").replace(/\?$/, ""); history.replaceState(history.state, "", location.pathname + location.search + (h || "#/")); }
  const r = ROUTES[name] || null;
  const key = name + "/" + params.join("/");
  const live = view.firstElementChild;
  document.body.dataset.cat = catFor(name, r && r.extra ? r.extra.group : "");
  document.body.dataset.route = name || "home";
  markActive(name);
  preloadFonts(name || "home");
  if (!opts.force && r && current.split("/")[0] === name && live && live._onParams) {
    current = key; await live._onParams(params, query); applyMeta(name, params, r.extra); pageFx(r.mod, live); syncOverlays(); return;
  }
  current = key;
  const my = ++rendering;
  if (typeof cleanup === "function") { try { cleanup(); } catch (e) {} }
  cleanup = null; m3cleanup();
  killPage();
  barStart();
  let attached = false;
  const prerendered = first && view.querySelector(".prerendered");
  const skelT = first ? 0 : setTimeout(() => { if (my === rendering && !attached) view.innerHTML = SKEL; }, 160);
  applyMeta(r ? name : "", params, r && r.extra, !r);
  if (!first && !opts.keepScroll) jumpTo(0);
  const render = async () => {
    if (!r) { attached = true; clearTimeout(skelT); view.innerHTML = `<div class="page">${notFound()}</div>`; return; }
    try {
      const mod = await withTimeout(loadMod(r, opts.bust), navigator.onLine ? 20000 : 4000);
      if (my !== rendering) return;
      const page = document.createElement("div");
      page.className = "page page-" + (r.extra ? "x-" + name : r.mod) + " pg-in";
      if (prerendered) { page.style.minHeight = view.offsetHeight + "px"; }
      attached = true; clearTimeout(skelT);
      if (!prerendered) page.innerHTML = SKEL;
      view.replaceChildren(page);
      const c = await withTimeout(Promise.resolve(mod.render(page, params, query)), 25000);
      const sk = page.querySelector(":scope > .skel-page");
      if (sk && page.childElementCount > 1) sk.remove();
      else if (sk) { const mo = new MutationObserver(() => { if (page.childElementCount > 1) { sk.remove(); mo.disconnect(); } }); mo.observe(page, { childList: true }); setTimeout(() => mo.disconnect(), 30000); }
      if (my !== rendering) { if (typeof c === "function") c(); return; }
      cleanup = c;
      page.style.minHeight = "";
      if (!page.childElementCount && !page.textContent.trim() && !page.querySelector("canvas,svg,img")) throw new Error("The view rendered nothing.");
      attempt = 0;
    } catch (e) {
      console.error("[route]", name, e);
      if (my !== rendering) return;
      attached = true; clearTimeout(skelT);
      view.replaceChildren(errorBox(e && e.message, () => { attempt++; route({ force: true, bust: Date.now(), keepScroll: true }); }));
    }
    reveal(view); spotlight(view);
    const pg = view.firstElementChild; if (pg) m3auto(pg);
  };
  const vt = document.startViewTransition && !RM() && !first && !document.hidden && !opts.bust;
  if (vt) { const t = document.startViewTransition(render); t.ready.catch(() => {}); t.updateCallbackDone.catch(() => {}); await t.finished.catch(() => {}); }
  else await render();
  clearTimeout(skelT);
  if (my !== rendering) return;
  barDone();
  const busyUi = document.querySelector("#topbar .mg.open, #themePop.open, #drawer.open, #palette.open");
  if (!isOpen() && !first && !busyUi) view.focus({ preventScroll: true });
  pageFx(r ? r.mod : "", view.firstElementChild || view);
  await syncOverlays();
  if (first) {
    first = false; finishBoot();
    const fq = new URLSearchParams(location.search).get("focus");
    const fs = { gap: "#gapH" }[fq];
    if (document.body.classList.contains("embed") && fs) setTimeout(() => { const t = document.querySelector(fs); if (t) jumpTo(t.getBoundingClientRect().top + window.scrollY - 20); }, 400);
  }
}
function notFound() {
  return `<div class="wrap section" style="text-align:center"><div class="eyebrow">404</div><h1 class="display">Nothing at this address</h1><p class="lead" style="margin:0 auto 24px">The page you asked for is not here. Maybe it moved, or the link has a typo.</p><a class="btn primary" href="#/">Go home</a></div>`;
}

/* ---------- Prefetch view modules on hover or focus ---------- */
const prefetched = new Set();
function prefetch(a) {
  const href = a.getAttribute("href") || "";
  const m = href.match(/^(?:\.\.\/)?#\/([a-z0-9-]*)/i);
  if (!m) return;
  const r = ROUTES[m[1]];
  if (!r || prefetched.has(m[1])) return;
  prefetched.add(m[1]);
  preloadFonts(m[1] || "home", true);
  if (r.extra) { try { r.extra.load().catch(() => prefetched.delete(m[1])); } catch (e) {} return; }
  const l = document.createElement("link"); l.rel = "modulepreload"; l.href = new URL(modUrl(r), import.meta.url).href; document.head.appendChild(l);
}
document.addEventListener("pointerover", (e) => { const a = e.target.closest && e.target.closest('a[href*="#/"]'); if (a) prefetch(a); }, { passive: true });
document.addEventListener("focusin", (e) => { const a = e.target.closest && e.target.closest('a[href*="#/"]'); if (a) prefetch(a); });

/* ---------- Boot loader: once per session, first paint only ---------- */
const boot = $("#boot");
let bootP = 10;
const bootTick = boot && setInterval(() => { bootP = Math.min(88, bootP + (92 - bootP) * 0.18); const b = $("#bootBar"); if (b) b.style.width = bootP + "%"; }, 120);
let seenBoot = false; try { seenBoot = sessionStorage.getItem("thr:boot") === "1"; } catch (e) {}
if (boot && (seenBoot || RM() || document.body.classList.contains("embed") || PRE)) boot.classList.add("skip");
function finishBoot() {
  clearInterval(bootTick);
  if (!boot || !document.body.contains(boot)) return;
  const b = $("#bootBar"); if (b) b.style.width = "100%";
  try { sessionStorage.setItem("thr:boot", "1"); } catch (e) {}
  const done = () => { boot.classList.add("done"); setTimeout(() => boot.remove(), 800); };
  if (boot.classList.contains("skip")) { boot.remove(); return; }
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 900))]).then(() => setTimeout(done, 380));
}
setTimeout(() => { if (boot && document.body.contains(boot)) finishBoot(); }, 4000);

/* ---------- Header ---------- */
mountHeader({
  ctx: "app",
  toast,
  onSearch: () => openPal(),
  onSaveOffline: () => saveEverything(),
  onSound: () => setSound(!document.documentElement.classList.contains("snd")),
});
$(".skip").addEventListener("click", (e) => { e.preventDefault(); view.focus(); });

window.addEventListener("motionchange", () => {
  if (RM()) { stopLenis(); killPage(); } else { startLenis(); const r = ROUTES[parse().name]; pageFx(r ? r.mod : "", view.firstElementChild || view); }
});

/* ---------- Extra routes (other agents) ---------- */
async function loadExtras() {
  try {
    const mod = await withTimeout(import("./views/extra/registry.js"), 6000);
    const list = Array.isArray(mod.EXTRA_ROUTES) ? mod.EXTRA_ROUTES : [];
    const cats = {};
    list.forEach((x) => {
      if (!x || !x.slug || ROUTES[x.slug] || typeof x.load !== "function") return;
      ROUTES[x.slug] = { mod: "x-" + x.slug, title: x.title, extra: x };
      EXTRA[x.slug] = x;
      META[x.slug] = META[x.slug] || { t: x.title, d: x.desc || x.description || x.title };
      if (x.cat) cats[x.slug] = x.cat;
    });
    registerCats(cats);
    setExtras(list);
    if (list.length) refreshMenu();
  } catch (e) { console.warn("[extra routes]", e); }
}

/* ---------- Start ---------- */
initOverlays();
initSearch(new Proxy(ROUTES, { ownKeys: (t) => Reflect.ownKeys(t), get: (t, k) => (t[k] ? [t[k].mod, t[k].title] : undefined), getOwnPropertyDescriptor: (t, k) => (t[k] ? { enumerable: true, configurable: true, value: [t[k].mod, t[k].title] } : undefined) }));
initSound();
initOffline({ toast });
scrollProgress();
window.addEventListener("hashchange", () => {
  if (!(history.state && history.state.thrOv)) stripOverlayParams();
  if (parse().name !== current.split("/")[0]) { closePal(true); setDrawer(false); }
  route();
});
/* Back into this page from the bfcache: make sure the view is not empty or half rendered */
window.addEventListener("pageshow", (e) => { if (e.persisted && (!view.firstElementChild || view.querySelector(".skel-page"))) route({ force: true }); });
startLenis();
loadExtras().then(() => route());

/* Testing and debugging hook */
window.__thr = { route: () => current, isOverlayOpen: isOpen, closeAll, lockY: scrollLockY, routes: () => Object.keys(ROUTES) };

registerSW();
