/* One header for every Threshold page: the hash app and the explosion/ and library/ sub pages.
   Categorised mega menu (desktop), full screen accordion drawer (mobile), search, sound, motion,
   theme settings, a glowing GitHub link and the "Save everything for offline" action.
   ctx "app": links are "#/x" and sub pages "explosion/". ctx "sub": links are "../#/x" and "../explosion/". */
import { CAT, catFor, groupCat } from "./motion3.js";
import { initKeys } from "./keys.js";
import { initShare } from "./share.js";

const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICONS = {
  home: P('<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  spark: P('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/><circle cx="12" cy="12" r="2.2"/>'),
  fork: P('<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7c0 5 6 5 6 10M18 7c0 5-6 5-6 10"/>'),
  people: P('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 6 4.8"/>'),
  quote: P('<path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/>'),
  flag: P('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  building: P('<path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01M8 13h.01M12 13h.01M16 13h.01"/>'),
  globe: P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>'),
  clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  play: P('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>'),
  pen: P('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  book: P('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>'),
  cap: P('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>'),
  shield: P('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  bolt: P('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  doc: P('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
  wrench: P('<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2 2 0 0 1-3-3z"/><path d="M14.5 6.5 17 4l3 3-2.5 2.5"/>'),
  lifebuoy: P('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>'),
  user: P('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  map: P('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  chart: P('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  scale: P('<path d="M12 4v16M5 20h14M4 8h16M7 8l-3 6a3 3 0 0 0 6 0zM17 8l-3 6a3 3 0 0 0 6 0z"/>'),
  eye: P('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  chat: P('<path d="M4 5h16v11H9l-5 4z"/>'),
  history: P('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),
  download: P('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  hub: P('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
  log: P('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
  keys: P('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
  compare: P('<rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/><path d="M6.5 8v3M17.5 8v6"/>'),
  kit: P('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M12 11v3"/>'),
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  search: P('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: P('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'),
  motion: P('<path d="M3 12c3-6 6-6 9 0s6 6 9 0"/><path d="M3 18c3-3 6-3 9 0" opacity=".5"/>'),
  close: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  menu: P('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  sndOff: P('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/>'),
  sndOn: P('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
  github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>',
};
export const GITHUB_URL = "https://github.com/lo3elyon/ASI/tree/main/future-of-asi";
export const CHANGELOG_URL = "https://github.com/lo3elyon/ASI/blob/main/future-of-asi/CHANGELOG.md";

export const GROUPS = [
  { id: "start", label: "Start", desc: "The front door and the six futures." },
  { id: "people", label: "People", desc: "Who is warning us, and who is working on it." },
  { id: "history", label: "History", desc: "How we got here, warning by warning." },
  { id: "watch", label: "Watch and Read", desc: "Videos, essays and books, all sourced." },
  { id: "learn", label: "Learn", desc: "Understand it properly, at your own pace." },
  { id: "act", label: "Act", desc: "What you can actually do about it." },
  { id: "you", label: "You", desc: "Your own trail and offline copy. Stays on this device." },
];
/* slug: hash route, or sub page folder when page:true */
export const ITEMS = [
  { slug: "", title: "Home", desc: "The threshold, in one scroll.", icon: "home", group: "start" },
  { slug: "futures", title: "Futures", desc: "Move six levers and watch six futures grow or fade.", icon: "fork", group: "start" },
  { slug: "researchers", title: "Researchers", desc: "The people warning us, with sourced quotes.", icon: "people", group: "people" },
  { slug: "voices", title: "Voices wall", desc: "Every sourced quote on one moving wall.", icon: "quote", group: "people" },
  { slug: "pacing", title: "Pacing the Frontier", desc: "Every named signer, searchable by employer.", icon: "flag", group: "people" },
  { slug: "orgs", title: "Organisations", desc: "Labs, institutes and nonprofits on a globe.", icon: "globe", group: "people" },
  { slug: "timeline", title: "Warnings timeline", desc: "Warnings and breakthroughs from 1951 to today.", icon: "clock", group: "history" },
  { slug: "watch", title: "Watch", desc: "Verified videos. Nothing plays until you press play.", icon: "play", group: "watch" },
  { slug: "blog", title: "Blog", desc: "My notes on the future of ASI.", icon: "pen", group: "watch" },
  { slug: "library", title: "Library", desc: "Books on AI risk with chapter guides and a reader.", icon: "book", group: "watch", page: true },
  { slug: "learn", title: "Alignment 101", desc: "A free course with XP, badges and a streak.", icon: "cap", group: "learn" },
  { slug: "control", title: "AI Control", desc: "Staying safe even if the AI is not. Play the blue team.", icon: "shield", group: "learn" },
  { slug: "explosion", title: "Intelligence explosion", desc: "When AI starts building better AI.", icon: "bolt", group: "learn", page: true },
  { slug: "docs", title: "Docs", desc: "How Threshold works, glossary and FAQ.", icon: "doc", group: "learn" },
  { slug: "tools", title: "Tools", desc: "p(doom) calculator, timeline forecaster, risk dial.", icon: "wrench", group: "learn" },
  { slug: "prepare", title: "Prepare", desc: "Calm, practical steps without panic.", icon: "lifebuoy", group: "act" },
  { slug: "your-history", mod: "history", title: "Your history", desc: "Everything you opened, on this device only.", icon: "history", group: "you" },
];
const GROUP_IDS = GROUPS.map((g) => g.id);

let extras = [];
export function setExtras(list) {
  extras = (Array.isArray(list) ? list : []).filter((r) => r && r.slug && r.title).map((r) => ({
    slug: String(r.slug), title: String(r.title), desc: r.desc || r.description || "", icon: r.icon || "spark",
    group: GROUP_IDS.includes(r.group) ? r.group : "learn", cat: r.cat, extra: true,
  }));
}
export const allItems = () => ITEMS.concat(extras.filter((e) => !ITEMS.some((i) => i.slug === e.slug)));
export const itemFor = (slug) => allItems().find((i) => i.slug === slug && !i.page) || null;

const E = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const iconOf = (k) => (typeof k === "string" && k.trim().startsWith("<svg") ? k : ICONS[k] || ICONS.spark);

let CTX = "app";
export function hrefFor(it) {
  const up = CTX === "sub" ? "../" : "";
  if (it.page) return `${up}${it.slug}/`;
  return `${up}#/${it.slug}`;
}
const colorOf = (it) => CAT[it.cat] || CAT[it.extra ? catFor("~" + it.slug, it.group) : catFor(it.slug, it.group)] || CAT.cyan;

function itemHTML(it, cls) {
  return `<a class="${cls}" href="${hrefFor(it)}" data-slug="${E(it.slug)}"${it.page ? ` data-page="${E(it.slug)}"` : ""} style="--c:${colorOf(it)}"><span class="mg-ic">${iconOf(it.icon)}</span><span class="mg-tx"><b>${E(it.title)}</b>${it.desc ? `<span class="sr-only">. </span><small>${E(it.desc)}</small>` : ""}</span></a>`;
}
function youExtras(cls) {
  const up = CTX === "sub" ? "../" : "";
  return `<button type="button" class="${cls} off-save" data-offline-save style="--c:${CAT.emerald}"><span class="mg-ic">${ICONS.download}</span><span class="mg-tx"><b>Save everything for offline</b><span class="sr-only">. </span><small class="off-msg">Keep the whole guide, books and photos on this device.</small><span class="off-bar" aria-hidden="true"><i></i></span></span></button>
  <a class="${cls}" href="${up}../" style="--c:${CAT.sky}"><span class="mg-ic">${ICONS.hub}</span><span class="mg-tx"><b>Back to the ASI hub</b><span class="sr-only">. </span><small>All of my other ASI explainers.</small></span></a>
  <a class="${cls}" href="${CHANGELOG_URL}" target="_blank" rel="noopener" style="--c:${CAT.yellow}"><span class="mg-ic">${ICONS.log}</span><span class="mg-tx"><b>Changelog</b><span class="sr-only">. </span><small>What changed in each version.</small></span></a>
  <button type="button" class="${cls} r4-keys-i" data-keys-help style="--c:${CAT.teal}"><span class="mg-ic">${ICONS.keys}</span><span class="mg-tx"><b>Keyboard shortcuts</b><span class="sr-only">. </span><small>Press ? on any page to see them all.</small></span></button>`;
}

export function headerHTML() {
  const items = allItems();
  const up = CTX === "sub" ? "../" : "";
  const groups = GROUPS.map((g) => {
    const its = items.filter((i) => i.group === g.id);
    if (!its.length && g.id !== "you") return "";
    const wide = its.length + (g.id === "you" ? 4 : 0) > 3;
    return `<li class="mg" data-g="${g.id}" style="--c:${CAT[groupCat(g.id)]}">
      <button class="mg-t" type="button" aria-expanded="false" aria-controls="mg-${g.id}" id="mgt-${g.id}">${E(g.label)}${ICONS.chev}</button>
      <div class="mg-p${wide ? " wide" : ""}" id="mg-${g.id}" role="group" aria-labelledby="mgt-${g.id}">
        <div class="mg-head"><b>${E(g.label)}</b><span>${E(g.desc)}</span></div>
        <div class="mg-items">${its.map((i) => itemHTML(i, "mg-i")).join("")}${g.id === "you" ? youExtras("mg-i") : ""}</div>
      </div></li>`;
  }).join("");
  const drawerGroups = GROUPS.map((g) => {
    const its = items.filter((i) => i.group === g.id);
    if (!its.length && g.id !== "you") return "";
    return `<section class="dr-g" data-g="${g.id}" style="--c:${CAT[groupCat(g.id)]}"><h3><button type="button" class="dr-t" aria-expanded="false" aria-controls="dr-${g.id}"><span class="dot-cat"></span>${E(g.label)}<small>${E(g.desc)}</small>${ICONS.chev}</button></h3>
      <div class="dr-p" id="dr-${g.id}" hidden>${its.map((i) => itemHTML(i, "dr-i")).join("")}${g.id === "you" ? youExtras("dr-i") : ""}</div></section>`;
  }).join("");
  const header = `
    <a class="brand" href="${up}#/" aria-label="Threshold home">
      <img src="${CTX === "sub" ? "../shared/brand/mark.svg" : "assets/brand/mark.svg"}" alt="" width="32" height="32">
      <span>THRESHOLD<small>THE FUTURE OF ASI</small></span>
    </a>
    <nav class="mega" aria-label="Main"><ul class="mega-list">${groups}</ul></nav>
    <div class="tb-actions">
      <span class="off-pill" id="offPill" hidden role="status"><i></i>Offline</span>
      <button class="search-btn" type="button" id="openPalette" aria-label="Search everything">${ICONS.search}<span>Search</span><kbd>Ctrl K</kbd></button>
      <button class="icon-btn snd-btn" type="button" id="soundBtn" aria-pressed="false" aria-label="Sound off. Turn on soft sounds and ambient music"><span class="s-off">${ICONS.sndOff}</span><span class="s-on">${ICONS.sndOn}</span></button>
      <button class="icon-btn mo-btn" type="button" id="motionBtn" aria-pressed="true" aria-label="Animations on. Turn them off">${ICONS.motion}</button>
      <div class="theme-wrap">
        <button class="icon-btn th-btn" type="button" id="themeBtn" aria-label="Theme and display settings" aria-expanded="false" aria-controls="themePop"><span class="i-sun">${ICONS.sun}</span><span class="i-moon">${ICONS.moon}</span></button>
        <div class="theme-pop" id="themePop" role="dialog" aria-label="Display settings">
          <h4>Theme</h4>
          <div class="seg" data-k="theme"><button type="button" data-v="dark">Dark</button><button type="button" data-v="light">Light</button><button type="button" data-v="contrast">Contrast</button></div>
          <h4>Accent</h4>
          <div class="swatches" data-k="accent">${["cyan", "teal", "amber", "red", "blue", "lime"].map((n) => `<button type="button" data-v="${n}" style="--c:${CAT[n]}" aria-label="${n[0].toUpperCase() + n.slice(1)}"></button>`).join("")}</div>
          <div class="toggle"><span>Motion</span><button type="button" class="switch" role="switch" id="motionSw" aria-checked="true" aria-label="Animations on or off"></button></div>
          <div class="toggle" style="margin-top:12px"><span>Soft sounds and music</span><button type="button" class="switch" role="switch" id="soundSw" aria-checked="false" aria-label="Sounds on or off"></button></div>
        </div>
      </div>
      <a class="icon-btn gh-btn" href="${GITHUB_URL}" target="_blank" rel="noopener" aria-label="Threshold source code on GitHub" title="Source code on GitHub">${ICONS.github}</a>
      <button class="icon-btn menu-btn" type="button" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">${ICONS.menu}</button>
    </div>`;
  const drawer = `<div class="scrim" data-close></div>
    <div class="panel" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="dr-top"><a class="brand" href="${up}#/"><img src="${CTX === "sub" ? "../shared/brand/mark.svg" : "assets/brand/mark.svg"}" alt="" width="28" height="28"><span>THRESHOLD</span></a><button class="icon-btn" type="button" data-close aria-label="Close menu">${ICONS.close}</button></div>
      <button class="dr-search" type="button" data-search>${ICONS.search}<span>Search everything</span></button>
      <div class="dr-quick">
        <button type="button" class="dr-q" data-q="theme">${ICONS.moon}<span>Theme</span></button>
        <button type="button" class="dr-q" data-q="motion">${ICONS.motion}<span>Motion</span></button>
        <button type="button" class="dr-q" data-q="sound">${ICONS.sndOn}<span>Sound</span></button>
        <a class="dr-q gh" href="${GITHUB_URL}" target="_blank" rel="noopener">${ICONS.github}<span>GitHub</span></a>
      </div>
      ${drawerGroups}
    </div>`;
  return { header, drawer };
}

/* ---------- Mount and wire ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
let opts = {};
const FINE = () => window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

export function mountHeader(o = {}) {
  opts = o; CTX = o.ctx || "app";
  let hdr = $("#topbar");
  if (!hdr) { hdr = document.createElement("header"); hdr.id = "topbar"; hdr.className = "topbar"; hdr.setAttribute("role", "banner"); document.body.prepend(hdr); }
  let dr = $("#drawer");
  if (!dr) { dr = document.createElement("div"); dr.id = "drawer"; hdr.after(dr); }
  hdr.classList.add("topbar", "tb3"); dr.className = "drawer-nav drawer3"; dr.setAttribute("aria-hidden", "true");
  const { header, drawer } = headerHTML();
  hdr.innerHTML = header; dr.innerHTML = drawer;
  wire(hdr, dr);
  markActive(o.active || "");
  initShare();
  initKeys({ up: CTX === "sub" ? "../" : "", toast: o.toast, cycleTheme, toggleMotion });
  return hdr;
}
export function refreshMenu() {
  const hdr = $("#topbar"), dr = $("#drawer"); if (!hdr || !dr) return;
  const { header, drawer } = headerHTML();
  const nav = new DOMParser().parseFromString(`<div>${header}</div>`, "text/html").querySelector(".mega");
  $(".mega", hdr).replaceWith(nav);
  dr.innerHTML = drawer;
  wireMega(hdr); wireDrawer(dr);
  markActive(lastActive);
  if (opts.onMenuChange) opts.onMenuChange();
}

let lastActive = "";
export function markActive(slug) {
  lastActive = slug;
  const it = allItems().find((i) => i.slug === slug);
  $$("#topbar .mg, #drawer .dr-g").forEach((g) => g.classList.toggle("cur", !!it && g.dataset.g === it.group));
  $$("#topbar a[data-slug], #drawer a[data-slug], .tabbar a").forEach((a) => {
    const s = a.dataset.slug != null ? a.dataset.slug : (a.getAttribute("href") || "").replace(/^(\.\.\/)?#\/?/, "").split(/[/?]/)[0];
    if (s === slug && (a.dataset.slug != null || (a.getAttribute("href") || "").includes("#"))) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

function closeAllMega(except) { $$("#topbar .mg.open").forEach((g) => { if (g !== except) { g.classList.remove("open"); $(".mg-t", g).setAttribute("aria-expanded", "false"); } }); }
/* Keep the open panel inside the viewport on narrower desktops */
function fitPanel(g) {
  const p = $(".mg-p", g); if (!p) return;
  p.style.marginLeft = "0px";
  const r = p.getBoundingClientRect(), iw = document.documentElement.clientWidth, pad = 12;
  let dx = 0;
  if (r.left < pad) dx = pad - r.left; else if (r.right > iw - pad) dx = iw - pad - r.right;
  if (dx) p.style.marginLeft = Math.round(dx) + "px";
}
function openMega(g, focusFirst) { closeAllMega(g); g.classList.add("open"); $(".mg-t", g).setAttribute("aria-expanded", "true"); fitPanel(g); if (focusFirst) { const f = $(".mg-i", g); if (f) f.focus(); } }

function wireMega(hdr) {
  const lis = $$(".mg", hdr);
  lis.forEach((g, gi) => {
    const t = $(".mg-t", g); let tIn = 0, tOut = 0;
    /* A panel opened by hover stays open when its trigger is then clicked (the click "pins" it); a second click closes it */
    t.addEventListener("click", (e) => { e.stopPropagation(); clearTimeout(tIn); clearTimeout(tOut); if (g.classList.contains("open") && g._via === "hover") { g._via = "click"; return; } if (g.classList.contains("open")) { g.classList.remove("open"); t.setAttribute("aria-expanded", "false"); } else { g._via = "click"; openMega(g); } });
    g.addEventListener("pointerenter", (e) => { if (e.pointerType !== "mouse" || !FINE()) return; clearTimeout(tOut); tIn = setTimeout(() => { if (!g.classList.contains("open")) { g._via = "hover"; openMega(g); } }, $("#topbar .mg.open") ? 0 : 90); });
    g.addEventListener("pointerleave", (e) => { if (e.pointerType !== "mouse") return; clearTimeout(tIn); if (g._via === "click") return; tOut = setTimeout(() => { g.classList.remove("open"); t.setAttribute("aria-expanded", "false"); }, 180); });
    g.addEventListener("keydown", (e) => {
      const links = $$(".mg-i", g); const i = links.indexOf(document.activeElement);
      if (e.key === "Escape") { if (g.classList.contains("open")) { e.stopPropagation(); g.classList.remove("open"); t.setAttribute("aria-expanded", "false"); t.focus(); } return; }
      if (document.activeElement === t) {
        if (e.key === "ArrowDown" || ((e.key === "Enter" || e.key === " ") && !g.classList.contains("open"))) { e.preventDefault(); g._via = "click"; openMega(g, true); return; }
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const n = lis[(gi + (e.key === "ArrowRight" ? 1 : -1) + lis.length) % lis.length]; const wasOpen = g.classList.contains("open"); closeAllMega(); $(".mg-t", n).focus(); if (wasOpen) openMega(n); return; }
      }
      if (i >= 0) {
        if (e.key === "ArrowDown") { e.preventDefault(); links[(i + 1) % links.length].focus(); }
        if (e.key === "ArrowUp") { e.preventDefault(); if (i === 0) t.focus(); else links[i - 1].focus(); }
        if (e.key === "Home") { e.preventDefault(); links[0].focus(); }
        if (e.key === "End") { e.preventDefault(); links[links.length - 1].focus(); }
      }
    });
    g.addEventListener("focusout", (e) => { if (e.relatedTarget && !g.contains(e.relatedTarget) && !g.matches(":hover")) { g.classList.remove("open"); t.setAttribute("aria-expanded", "false"); } });
    $$(".mg-i", g).forEach((a) => a.addEventListener("click", () => { closeAllMega(); }));
    $$("[data-offline-save]", g).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); if (opts.onSaveOffline) opts.onSaveOffline(); }));
  });
}

let drawerOpen = false, lastFocus = null;
export function setDrawer(o) {
  const dr = $("#drawer"); if (!dr) return;
  drawerOpen = o;
  dr.classList.toggle("open", o); dr.setAttribute("aria-hidden", String(!o));
  $("#menuBtn")?.setAttribute("aria-expanded", String(o));
  document.body.classList.toggle("no-scroll", o);
  if (o) {
    lastFocus = document.activeElement;
    $$(".dr-g", dr).forEach((g) => { const cur = g.classList.contains("cur"); const b = $(".dr-t", g); b.setAttribute("aria-expanded", String(cur)); $(".dr-p", g).hidden = !cur; });
    if (!$(".dr-g.cur", dr)) { const f = $(".dr-g", dr); if (f) { $(".dr-t", f).setAttribute("aria-expanded", "true"); $(".dr-p", f).hidden = false; } }
    setTimeout(() => $("[data-close].icon-btn", dr)?.focus(), 30);
  } else if (lastFocus && lastFocus.focus) lastFocus.focus();
}
function wireDrawer(dr) {
  $$(".dr-t", dr).forEach((b) => b.addEventListener("click", () => { const o = b.getAttribute("aria-expanded") !== "true"; b.setAttribute("aria-expanded", String(o)); $("#" + b.getAttribute("aria-controls")).hidden = !o; }));
  dr.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { setDrawer(false); return; }
    if (e.target.closest("[data-offline-save]")) { e.preventDefault(); if (opts.onSaveOffline) opts.onSaveOffline(); return; }
    if (e.target.closest("[data-keys-help]")) { setDrawer(false); return; }
    if (e.target.closest("[data-search]")) { setDrawer(false); if (opts.onSearch) opts.onSearch(); return; }
    const q = e.target.closest("[data-q]");
    if (q) { const k = q.dataset.q; if (k === "theme") cycleTheme(); if (k === "motion") toggleMotion(); if (k === "sound") opts.onSound && opts.onSound(); return; }
    if (e.target.closest("a")) setDrawer(false);
  });
  dr.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.stopPropagation(); setDrawer(false); return; }
    if (e.key !== "Tab") return;
    const f = $$("a[href], button:not([disabled])", $(".panel", dr)).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
}

/* ---------- Preferences (same key as the app: thr:prefs) ---------- */
const PK = "thr:prefs";
export const getPrefs = () => { try { return JSON.parse(localStorage.getItem(PK) || "{}") || {}; } catch (e) { return {}; } };
const setPrefs = (p) => { try { localStorage.setItem(PK, JSON.stringify(p)); } catch (e) {} };
const THEME_COLOR = { dark: "#07111f", light: "#f4f8fb", contrast: "#000000" };
export function applyPrefs() {
  const p = getPrefs(), r = document.documentElement;
  if (p.theme) r.dataset.theme = p.theme; else if (!r.dataset.theme) r.dataset.theme = "dark";
  r.dataset.accent = p.accent || r.dataset.accent || "cyan";
  r.classList.toggle("rm", p.motion === "off");
  $$("#themePop .seg[data-k=theme] button").forEach((b) => b.setAttribute("aria-pressed", String(r.dataset.theme === b.dataset.v)));
  $$("#themePop .swatches button").forEach((b) => b.setAttribute("aria-pressed", String(r.dataset.accent === b.dataset.v)));
  const mon = p.motion !== "off";
  $("#motionSw")?.setAttribute("aria-checked", String(mon));
  const mb = $("#motionBtn"); if (mb) { mb.setAttribute("aria-pressed", String(mon)); mb.setAttribute("aria-label", mon ? "Animations on. Turn them off" : "Animations off. Turn them on"); }
  if (p.theme || r.dataset.theme !== "dark") $$('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLOR[r.dataset.theme] || THEME_COLOR.dark));
}
function setPref(k, v) { const p = getPrefs(); p[k] = v; setPrefs(p); applyPrefs(); window.dispatchEvent(new Event("themechange")); }
export function cycleTheme() { const cur = document.documentElement.dataset.theme || "dark"; setPref("theme", { dark: "light", light: "contrast", contrast: "dark" }[cur] || "dark"); toastMsg(`Theme: ${document.documentElement.dataset.theme}.`); }
export function toggleMotion() {
  const p = getPrefs(); p.motion = p.motion === "off" ? "on" : "off"; setPrefs(p); applyPrefs();
  window.dispatchEvent(new Event("motionchange")); window.dispatchEvent(new Event("themechange"));
  toastMsg(p.motion === "off" ? "Motion is off. Everything still works." : "Motion is on.");
}
function toastMsg(m) { if (opts.toast) opts.toast(m); }

function wire(hdr, dr) {
  wireMega(hdr); wireDrawer(dr);
  document.addEventListener("click", (e) => { if (!e.target.closest("#topbar .mg")) closeAllMega(); const pop = $("#themePop"); if (pop && !pop.contains(e.target) && !e.target.closest("#themeBtn")) { pop.classList.remove("open"); $("#themeBtn")?.setAttribute("aria-expanded", "false"); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeAllMega(); const pop = $("#themePop"); if (pop && pop.classList.contains("open")) { pop.classList.remove("open"); $("#themeBtn")?.setAttribute("aria-expanded", "false"); $("#themeBtn")?.focus(); } if (drawerOpen) setDrawer(false); } });
  $("#menuBtn", hdr).addEventListener("click", () => setDrawer(!drawerOpen));
  $("#themeBtn", hdr).addEventListener("click", (e) => { e.stopPropagation(); const pop = $("#themePop"); const o = pop.classList.toggle("open"); $("#themeBtn").setAttribute("aria-expanded", String(o)); if (o) setTimeout(() => $("button[aria-pressed=true], button", pop)?.focus(), 20); });
  $$("#themePop [data-k] button", hdr).forEach((b) => b.addEventListener("click", () => setPref(b.parentNode.dataset.k, b.dataset.v)));
  $("#motionSw", hdr).addEventListener("click", toggleMotion);
  $("#motionBtn", hdr).addEventListener("click", toggleMotion);
  $("#openPalette", hdr).addEventListener("click", () => opts.onSearch && opts.onSearch());
  applyPrefs();
}
