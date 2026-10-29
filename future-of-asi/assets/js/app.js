/* Threshold app shell: hash router, overlays, search, motion, theme, sound, service worker. */
import { $, $$, store, reveal, spotlight, RM, toast } from "./util.js";
import { initOverlays, sync as syncOverlays, stripOverlayParams, isOpen, closeAll, scrollLockY } from "./core/overlay.js";
import { initSearch, closePal } from "./core/search.js";
import { startLenis, stopLenis, pageFx, killPage, jumpTo } from "./core/motion.js";
import { initSound } from "./core/sound.js";

const ROUTES = {
  "": ["home", "Home"], home: ["home", "Home"], futures: ["futures", "Futures"], researchers: ["researchers", "Researchers"],
  pacing: ["pacing", "Pacing the Frontier signers"], voices: ["voices", "Voices wall"], timeline: ["timeline", "Warnings timeline"], watch: ["watch", "Watch"],
  control: ["control", "AI Control"], learn: ["learn", "Alignment 101"], prepare: ["prepare", "Prepare"], orgs: ["orgs", "Organisations"],
  blog: ["blog", "Blog"], docs: ["docs", "Docs"], tools: ["tools", "Tools"], history: ["history", "Your history"],
};
const BASE_URL = "https://lo3elyon.github.io/ASI/future-of-asi/";
const view = $("#view");
let cleanup = null, current = "", first = true, rendering = 0;

if (new URLSearchParams(location.search).get("embed") === "1") document.body.classList.add("embed");

function parse() {
  let h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  if (!h && window.__PRE && window.__PRE.route) h = window.__PRE.route;
  const [path, q] = h.split("?");
  const parts = path.split("/").filter(Boolean);
  return { name: parts[0] || "", params: parts.slice(1), query: new URLSearchParams(q || "") };
}

/* Old links (#/researchers/<id>, #/watch/<id>) become overlays on the list page */
function legacy() {
  const m = location.hash.match(/^#\/(researchers|watch)\/([A-Za-z0-9_-]+)$/);
  if (!m || (m[1] === "watch" && m[2] === "c")) return false;
  const q = new URLSearchParams(location.search);
  q.set(m[1] === "researchers" ? "p" : "v", m[2]);
  history.replaceState({}, "", `${location.pathname}?${q}#/${m[1]}`);
  return true;
}

const bar = document.createElement("div"); bar.className = "route-bar"; document.body.appendChild(bar);
const SKEL = `<div class="skel-page" aria-hidden="true"><div class="skel skel-hero"></div><div class="wrap"><div class="skel skel-line w60"></div><div class="skel skel-line w40"></div><div class="skel-grid"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div></div>`;

async function route() {
  legacy();
  const { name, params, query } = parse();
  const r = ROUTES[name] || null;
  const key = name + "/" + params.join("/");
  const live = view.firstElementChild;
  if (r && current.split("/")[0] === name && live && live._onParams) {
    current = key; await live._onParams(params, query); setTitle(r[1], params, name); markNav(name); pageFx(r[0], live); syncOverlays(); return;
  }
  current = key;
  const my = ++rendering;
  if (typeof cleanup === "function") { try { cleanup(); } catch (e) {} }
  cleanup = null;
  killPage();
  bar.style.opacity = "1"; bar.style.width = "30%";
  let attached = false;
  const skelT = first ? 0 : setTimeout(() => { if (my === rendering && !attached) { view.innerHTML = SKEL; } }, 140);
  markNav(name);
  setTitle(r ? r[1] : "Not found", params, name);
  if (!first) jumpTo(0);
  const render = async () => {
    if (!r) { attached = true; clearTimeout(skelT); view.innerHTML = `<div class="page">${notFound()}</div>`; return; }
    try {
      const mod = await import(`./views/${r[0]}.js`);
      bar.style.width = "70%";
      const page = document.createElement("div");
      page.className = "page page-" + r[0];
      if (my !== rendering) return;
      attached = true; clearTimeout(skelT);
      view.replaceChildren(page);
      const c = await mod.render(page, params, query);
      if (my !== rendering) { if (typeof c === "function") c(); return; }
      cleanup = c;
    } catch (e) {
      console.error(e);
      attached = true; clearTimeout(skelT);
      view.innerHTML = `<div class="wrap section"><div class="empty-state"><h3>This page did not load</h3><p>Something went wrong while opening it. Reload the page, or go <a href="#/">home</a>.</p></div></div>`;
    }
    reveal(view); spotlight(view);
  };
  if (document.startViewTransition && !RM() && !first) { const vt = document.startViewTransition(render); vt.ready.catch(() => {}); vt.updateCallbackDone.catch(() => {}); await vt.finished.catch(() => {}); }
  else await render();
  clearTimeout(skelT);
  if (my !== rendering) return;
  bar.style.width = "100%"; setTimeout(() => { bar.style.opacity = "0"; bar.style.width = "0"; }, 350);
  if (!isOpen()) view.focus({ preventScroll: true });
  pageFx(r ? r[0] : "", view.firstElementChild || view);
  await syncOverlays();
  if (first) {
    first = false; finishBoot();
    const fq = new URLSearchParams(location.search).get("focus");
    const fs = { gap: "#gapH" }[fq];
    if (document.body.classList.contains("embed") && fs) setTimeout(() => { const t = document.querySelector(fs); if (t) jumpTo(t.getBoundingClientRect().top + window.scrollY - 20); }, 400);
  }
}

function setTitle(t, params, name) {
  const sub = params && params[0] && !/^(c|quiz|final)$/.test(params[0]) && params[0].length < 40 && /[a-z]-|^[a-z]+$/.test(params[0]) ? " · " + params[0].replace(/-/g, " ") : "";
  document.title = t === "Home" ? "Threshold: The Future of ASI" : `${t}${sub} · Threshold`;
  const can = $('link[rel="canonical"]');
  if (can && !window.__PRE) can.href = BASE_URL + (name && ROUTES[name] && name !== "home" ? `${name}/` : "");
}
function markNav(name) {
  $$(".nav a, .drawer-nav a, .more-menu a, .tabbar a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const n = href.replace(/^#\/?/, "").split("/")[0];
    if (href.startsWith("#") && n === name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}
function notFound() {
  return `<div class="wrap section" style="text-align:center"><div class="eyebrow">404</div><h1 class="display">Nothing at this address</h1><p class="lead" style="margin:0 auto 24px">The page you asked for is not here. Maybe it moved, or the link has a typo.</p><a class="btn primary" href="#/">Go home</a></div>`;
}

/* Boot loader: shown once per session, only on the first paint */
const boot = $("#boot");
let bootP = 10;
const bootTick = boot && setInterval(() => { bootP = Math.min(88, bootP + (92 - bootP) * 0.18); const b = $("#bootBar"); if (b) b.style.width = bootP + "%"; }, 120);
let seenBoot = false; try { seenBoot = sessionStorage.getItem("thr:boot") === "1"; } catch (e) {}
if (boot && (seenBoot || RM() || document.body.classList.contains("embed"))) boot.classList.add("skip");
function finishBoot() {
  clearInterval(bootTick);
  if (!boot) return;
  const b = $("#bootBar"); if (b) b.style.width = "100%";
  try { sessionStorage.setItem("thr:boot", "1"); } catch (e) {}
  const done = () => { boot.classList.add("done"); setTimeout(() => boot.remove(), 800); };
  if (boot.classList.contains("skip")) { boot.remove(); return; }
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 900))]).then(() => setTimeout(done, 380));
}
setTimeout(() => { if (boot && document.body.contains(boot)) finishBoot(); }, 4000);

/* Skip link */
$(".skip").addEventListener("click", (e) => { e.preventDefault(); view.focus(); });

/* Snapshot pages use <base href> so the app can live at /r/<id>/. Keep hash links inside this document. */
if (document.querySelector("base")) {
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault(); location.hash = a.getAttribute("href");
  });
}

/* Header menus and drawer */
const moreBtn = $("#moreBtn"), moreMenu = $("#moreMenu");
moreBtn.addEventListener("click", (e) => { e.stopPropagation(); const o = moreMenu.classList.toggle("open"); moreBtn.setAttribute("aria-expanded", o); });
document.addEventListener("click", (e) => {
  if (!moreMenu.contains(e.target)) { moreMenu.classList.remove("open"); moreBtn.setAttribute("aria-expanded", "false"); }
  if (!$("#themePop").contains(e.target) && !$("#themeBtn").contains(e.target)) { $("#themePop").classList.remove("open"); $("#themeBtn").setAttribute("aria-expanded", "false"); }
});
const drawer = $("#drawer");
const setDrawer = (o) => { drawer.classList.toggle("open", o); drawer.setAttribute("aria-hidden", !o); $("#menuBtn").setAttribute("aria-expanded", o); document.body.classList.toggle("no-scroll", o); if (o) $("a", drawer).focus(); };
$("#menuBtn").addEventListener("click", () => setDrawer(true));
drawer.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target.closest("a")) setDrawer(false); });

/* Theme, accent, motion */
const prefs = store.get("prefs", {});
const root = document.documentElement;
function applyPrefs() {
  root.dataset.theme = prefs.theme || root.dataset.theme || "dark";
  root.dataset.accent = prefs.accent || "cyan";
  root.classList.toggle("rm", prefs.motion === "off");
  $$("#themePop [data-k] button").forEach((b) => b.setAttribute("aria-pressed", (prefs[b.parentNode.dataset.k] || (b.parentNode.dataset.k === "theme" ? root.dataset.theme : "cyan")) === b.dataset.v));
  $("#motionSw").setAttribute("aria-checked", prefs.motion !== "off");
  const tc = { dark: "#07111f", light: "#f4f8fb", contrast: "#000000" }[root.dataset.theme];
  $('meta[name="theme-color"]').setAttribute("content", tc);
}
$("#themeBtn").addEventListener("click", (e) => { e.stopPropagation(); const o = $("#themePop").classList.toggle("open"); $("#themeBtn").setAttribute("aria-expanded", o); });
$$("#themePop [data-k] button").forEach((b) => b.addEventListener("click", () => { prefs[b.parentNode.dataset.k] = b.dataset.v; store.set("prefs", prefs); applyPrefs(); window.dispatchEvent(new Event("themechange")); }));
$("#motionSw").addEventListener("click", () => {
  prefs.motion = prefs.motion === "off" ? "on" : "off"; store.set("prefs", prefs); applyPrefs();
  if (prefs.motion === "off") { stopLenis(); killPage(); } else { startLenis(); pageFx(ROUTES[parse().name]?.[0] || "", view.firstElementChild || view); }
  toast(prefs.motion === "off" ? "Motion is off. Everything still works." : "Motion is on.");
  window.dispatchEvent(new Event("themechange"));
});
applyPrefs();

/* Keys: Esc closes menus (overlays and search handle their own) */
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("open")) setDrawer(false); });

if (window.__PRE && window.__PRE.p && !new URLSearchParams(location.search).has("p") && !location.hash) history.replaceState({}, "", `${location.pathname}?p=${encodeURIComponent(window.__PRE.p)}`);
initOverlays();
initSearch(ROUTES);
initSound();
window.addEventListener("hashchange", () => {
  // A link that changes the page closes any open overlay. Back or forward into an overlay entry keeps it.
  if (!(history.state && history.state.thrOv)) stripOverlayParams();
  closePal(true);
  route();
});
startLenis();
route();

/* Testing and debugging hook */
window.__thr = { route: () => current, isOverlayOpen: isOpen, closeAll, lockY: scrollLockY };

/* Service worker, scoped to this route only */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && !window.__PRE && !/[?&]nosw=1/.test(location.search)) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {}));
}
