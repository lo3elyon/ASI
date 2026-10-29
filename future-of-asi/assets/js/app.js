/* Threshold app shell: hash router, navigation, theme, command palette, service worker. */
import { $, $$, esc, store, load, arr, researchers, videos, reveal, spotlight, RM, toast } from "./util.js";

const ROUTES = {
  "": ["home", "Home"], home: ["home", "Home"], futures: ["futures", "Futures"], researchers: ["researchers", "Researchers"],
  voices: ["voices", "Voices wall"], timeline: ["timeline", "Warnings timeline"], watch: ["watch", "Watch"], control: ["control", "AI Control"],
  learn: ["learn", "Alignment 101"], prepare: ["prepare", "Prepare"], orgs: ["orgs", "Organisations"], blog: ["blog", "Blog"],
  docs: ["docs", "Docs"], tools: ["tools", "Tools"],
};
const view = $("#view");
let cleanup = null;
let current = "";

function parse() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const [path, q] = h.split("?");
  const parts = path.split("/").filter(Boolean);
  return { name: parts[0] || "", params: parts.slice(1), query: new URLSearchParams(q || "") };
}

async function route() {
  const { name, params, query } = parse();
  const r = ROUTES[name] || null;
  const key = name + "/" + params.join("/");
  // Same page with a sub path: let the view handle it in place if it can
  if (r && current.split("/")[0] === name && view._onParams) {
    current = key;
    view._onParams(params, query);
    setTitle(r[1], params);
    markNav(name);
    return;
  }
  current = key;
  if (typeof cleanup === "function") { try { cleanup(); } catch (e) {} }
  cleanup = null;
  view._onParams = null;
  const render = async () => {
    if (!r) { view.innerHTML = notFound(); return; }
    try {
      const mod = await import(`./views/${r[0]}.js`);
      view.innerHTML = "";
      cleanup = await mod.render(view, params, query);
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="wrap section"><div class="empty-state"><h3>This page did not load</h3><p>Something went wrong while opening it. Reload the page, or go <a href="#/">home</a>.</p></div></div>`;
    }
    reveal(view); spotlight(view);
  };
  markNav(name);
  setTitle(r ? r[1] : "Not found", params);
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (document.startViewTransition && !RM()) await document.startViewTransition(render).finished.catch(() => {});
  else await render();
  view.focus({ preventScroll: true });
}

function setTitle(t, params) {
  const sub = params && params[0] && !/^(c|quiz)$/.test(params[0]) && params[0].length < 40 && /[a-z]-|^[a-z]+$/.test(params[0]) ? " · " + params[0].replace(/-/g, " ") : "";
  document.title = t === "Home" ? "Threshold: The Future of ASI" : `${t}${sub} · Threshold`;
}
function markNav(name) {
  $$(".nav a, .drawer-nav a, .more-menu a").forEach((a) => {
    const n = (a.getAttribute("href") || "").replace(/^#\/?/, "").split("/")[0];
    if (a.getAttribute("href").startsWith("#") && n === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}
function notFound() {
  return `<div class="wrap section" style="text-align:center"><div class="eyebrow">404</div><h1>Nothing at this address</h1><p class="lead" style="margin:0 auto 24px">The page you asked for is not here. Maybe it moved, or the link has a typo.</p><a class="btn primary" href="#/">Go home</a></div>`;
}

/* Skip link: focus the content without touching the router */
$(".skip").addEventListener("click", (e) => { e.preventDefault(); view.focus(); });

/* Header menus */
const moreBtn = $("#moreBtn"), moreMenu = $("#moreMenu");
moreBtn.addEventListener("click", (e) => { e.stopPropagation(); const o = moreMenu.classList.toggle("open"); moreBtn.setAttribute("aria-expanded", o); });
document.addEventListener("click", (e) => {
  if (!moreMenu.contains(e.target)) { moreMenu.classList.remove("open"); moreBtn.setAttribute("aria-expanded", "false"); }
  if (!$("#themePop").contains(e.target) && e.target !== $("#themeBtn") && !$("#themeBtn").contains(e.target)) { $("#themePop").classList.remove("open"); $("#themeBtn").setAttribute("aria-expanded", "false"); }
});
const drawer = $("#drawer");
const setDrawer = (o) => { drawer.classList.toggle("open", o); drawer.setAttribute("aria-hidden", !o); $("#menuBtn").setAttribute("aria-expanded", o); document.body.classList.toggle("no-scroll", o); if (o) $("a", drawer).focus(); };
$("#menuBtn").addEventListener("click", () => setDrawer(true));
drawer.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target.closest("a")) setDrawer(false); });

/* Theme */
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
$("#motionSw").addEventListener("click", () => { prefs.motion = prefs.motion === "off" ? "on" : "off"; store.set("prefs", prefs); applyPrefs(); toast(prefs.motion === "off" ? "Motion is off. Everything still works." : "Motion is on."); window.dispatchEvent(new Event("themechange")); });
applyPrefs();

/* Command palette */
const pal = $("#palette"), palIn = $("#palInput"), palList = $("#palList");
let index = null, sel = 0, hits = [];
async function buildIndex() {
  if (index) return index;
  const pages = Object.entries(ROUTES).filter(([k]) => k && k !== "home").map(([k, v]) => ({ t: v[1], s: "Page", h: `#/${k}`, k: v[1] }));
  const extra = [
    { t: "p(doom) calculator", s: "Tool", h: "#/tools/pdoom" }, { t: "AGI timeline forecaster", s: "Tool", h: "#/tools/timelines" }, { t: "Risk dial", s: "Tool", h: "#/tools/dial" },
    { t: "Blue team game: catch a scheming model", s: "Game", h: "#/control?play=1" }, { t: "Completion certificate", s: "Learn", h: "#/learn/certificate" },
    { t: "Glossary", s: "Docs", h: "#/docs/glossary" }, { t: "FAQ", s: "Docs", h: "#/docs/faq" }, { t: "Data schemas", s: "Docs", h: "#/docs/schemas" },
    { t: "ASI hub (all explainers)", s: "Link", h: "../" },
  ];
  const [ppl, vids, orgs, tl, blog, gloss, course, docs] = await Promise.all([
    researchers(), videos(), load("orgs.json"), load("timeline.json"), load("blog/index.json"), load("glossary.json"), load("course.json", {}), load("docs/index.json"),
  ]);
  index = [
    ...pages, ...extra,
    ...ppl.map((p) => ({ t: p.name, s: "Person", h: `#/researchers/${p.id}`, k: `${p.org} ${p.role} ${p.warning}` })),
    ...ppl.flatMap((p) => p.quotes.map((q) => ({ t: `"${q.text.slice(0, 90)}${q.text.length > 90 ? "..." : ""}"`, s: "Quote", h: `#/researchers/${p.id}`, k: p.name }))),
    ...vids.map((v) => ({ t: v.title, s: "Video", h: `#/watch/${v.id}`, k: `${v.channel} ${v.category} ${v.summary}` })),
    ...arr(orgs, "orgs").map((o) => ({ t: o.name, s: "Org", h: `#/orgs?o=${encodeURIComponent(o.id || o.name)}`, k: `${o.short || ""} ${o.focus || ""} ${o.type || ""}` })),
    ...arr(tl, "events").map((e) => ({ t: `${e.year || (e.date || "").slice(0, 4)} ${e.title}`, s: "Timeline", h: `#/timeline?y=${e.year || (e.date || "").slice(0, 4)}`, k: e.text || e.summary || "" })),
    ...arr(blog, "posts").map((b) => ({ t: b.title, s: "Blog", h: `#/blog/${b.slug}`, k: b.excerpt })),
    ...arr(gloss, "terms").map((g) => ({ t: g.term, s: "Term", h: `#/docs/glossary?t=${encodeURIComponent(g.term)}`, k: g.def })),
    ...(course.units || []).flatMap((u) => (u.lessons || []).map((l) => ({ t: l.title, s: "Lesson", h: `#/learn/${u.id}/${l.id}`, k: u.title }))),
    ...arr(docs, "pages").map((d) => ({ t: d.title, s: "Docs", h: `#/docs/${d.slug}`, k: d.summary })),
  ];
  index.forEach((x) => (x.n = `${x.t} ${x.k || ""} ${x.s}`.toLowerCase()));
  return index;
}
function score(item, terms) {
  let s = 0; const t = item.t.toLowerCase();
  for (const w of terms) { const i = item.n.indexOf(w); if (i < 0) return -1; s += t.includes(w) ? (t.startsWith(w) ? 6 : 3) : 1; }
  return s + ({ Page: 4, Person: 3, Tool: 3, Game: 3, Lesson: 2 }[item.s] || 0);
}
async function search(q) {
  const idx = await buildIndex();
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  hits = terms.length ? idx.map((x) => [score(x, terms), x]).filter((a) => a[0] >= 0).sort((a, b) => b[0] - a[0]).slice(0, 40).map((a) => a[1])
    : idx.filter((x) => ["Page", "Tool", "Game"].includes(x.s)).slice(0, 18);
  sel = 0; paint();
}
function paint() {
  palList.innerHTML = hits.length
    ? hits.map((h, i) => `<li role="option" aria-selected="${i === sel}"><a href="${esc(h.h)}" class="${i === sel ? "sel" : ""}" data-i="${i}"><small>${esc(h.s)}</small><span>${esc(h.t)}</span></a></li>`).join("")
    : `<li class="empty">Nothing matches yet. Try a name like Hinton, a word like control, or a year like 2023.</li>`;
  const s = $(".sel", palList); if (s) s.scrollIntoView({ block: "nearest" });
}
function openPal() { pal.classList.add("open"); pal.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll"); palIn.value = ""; search(""); setTimeout(() => palIn.focus(), 10); }
function closePal() { pal.classList.remove("open"); pal.setAttribute("aria-hidden", "true"); document.body.classList.remove("no-scroll"); }
$("#openPalette").addEventListener("click", openPal);
pal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closePal(); if (e.target.closest("a")) closePal(); });
palIn.addEventListener("input", () => search(palIn.value));
palIn.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { sel = Math.min(hits.length - 1, sel + 1); paint(); e.preventDefault(); }
  else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); paint(); e.preventDefault(); }
  else if (e.key === "Enter" && hits[sel]) { closePal(); const h = hits[sel].h; if (h.startsWith("#")) location.hash = h; else location.href = h; }
});
document.addEventListener("keydown", (e) => {
  const typing = /input|textarea|select/i.test(document.activeElement.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.classList.contains("open") ? closePal() : openPal(); }
  else if (e.key === "/" && !typing && !pal.classList.contains("open")) { e.preventDefault(); openPal(); }
  else if (e.key === "Escape") { if (pal.classList.contains("open")) closePal(); if (drawer.classList.contains("open")) setDrawer(false); }
});

window.addEventListener("hashchange", route);
route();

/* Service worker, scoped to this route only */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {}));
}
