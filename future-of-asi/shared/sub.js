/* Shared shell for Threshold sub pages (explosion/, library/).
   Header, theme settings, mobile drawer, video theater, reveal on scroll, toast.
   Prefs use the same key as the main Threshold app ("thr:prefs"), so theme and motion follow you. */

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const RM = () => document.documentElement.classList.contains("rm") || matchMedia("(prefers-reduced-motion: reduce)").matches;

const NS = "thr:";
export const store = {
  get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} },
};

export async function getJSON(url, fallback) {
  try { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error(r.status); return await r.json(); }
  catch (e) { return fallback; }
}

export const ICON = {
  arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  ext: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

/* ---------- Header ---------- */
const NAV = [
  ["../#/", "Home"], ["../#/futures", "Futures"], ["../#/researchers", "Researchers"], ["../#/timeline", "Timeline"],
  ["../#/watch", "Watch"], ["../#/control", "AI Control"], ["../#/learn", "Learn"],
];
export function header(active) {
  const extra = [["../explosion/", "Explosion", "explosion"], ["../library/", "Library", "library"]];
  const nav = NAV.map(([h, t], i) => `<a href="${h}" class="${i > 4 ? "opt" : ""}">${t}</a>`).join("") +
    extra.map(([h, t, k]) => `<a href="${h}" ${k === active ? 'aria-current="page"' : ""}>${t}</a>`).join("");
  const drawer = [["../#/", "Home", "#22d3ee"], ...NAV.slice(1).map(([h, t]) => [h, t, "#14b8a6"]), ["../explosion/", "Intelligence Explosion", "#ef4444"], ["../library/", "Book Library", "#f59e0b"], ["../#/blog", "Blog", "#3b82f6"], ["../#/docs", "Docs", "#84cc16"], ["../../", "Back to the ASI hub", "#22d3ee"]]
    .map(([h, t, c]) => `<a href="${h}" style="--c:${c}" ${(active === "explosion" && h === "../explosion/") || (active === "library" && h === "../library/") ? 'aria-current="page"' : ""}><i></i>${t}</a>`).join("");
  const el = document.createElement("div");
  el.innerHTML = `
  <a class="skip" href="#main">Skip to content</a>
  <div class="ambient" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>
  <header class="topbar" role="banner">
    <a class="brand" href="../#/" aria-label="Threshold home">
      <img src="../shared/brand/mark.svg" alt="" width="32" height="32">
      <span>THRESHOLD<small>THE FUTURE OF ASI</small></span>
    </a>
    <nav class="nav" aria-label="Main">${nav}</nav>
    <div class="tb-actions">
      <div style="position:relative">
        <button class="icon-btn" type="button" id="themeBtn" aria-label="Theme and motion settings" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        </button>
        <div class="theme-pop" id="themePop" role="dialog" aria-label="Display settings">
          <h4>Theme</h4>
          <div class="seg" data-k="theme"><button type="button" data-v="dark">Dark</button><button type="button" data-v="light">Light</button><button type="button" data-v="contrast">Contrast</button></div>
          <h4>Accent</h4>
          <div class="swatches" data-k="accent">${["cyan:#22d3ee", "teal:#14b8a6", "amber:#f59e0b", "red:#ef4444", "blue:#3b82f6", "lime:#84cc16"].map((s) => { const [n, c] = s.split(":"); return `<button type="button" data-v="${n}" style="--c:${c}" aria-label="${n}"></button>`; }).join("")}</div>
          <div class="toggle"><span>Motion</span><button type="button" class="switch" role="switch" id="motionSw" aria-checked="true" aria-label="Animations on or off"></button></div>
        </div>
      </div>
      <button class="icon-btn menu-btn" type="button" id="menuBtn" aria-label="Open menu" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
  </header>
  <div class="drawer-nav" id="drawer" aria-hidden="true"><div class="scrim" data-close></div><div class="panel" role="dialog" aria-label="Menu">${drawer}</div></div>`;
  document.body.prepend(...el.children);
  wirePrefs();
}

function wirePrefs() {
  const r = document.documentElement;
  const prefs = store.get("prefs", {});
  const sync = () => {
    $$(".seg[data-k=theme] button").forEach((b) => b.setAttribute("aria-pressed", String((r.dataset.theme || "dark") === b.dataset.v)));
    $$(".swatches button").forEach((b) => b.setAttribute("aria-pressed", String((r.dataset.accent || "cyan") === b.dataset.v)));
    $("#motionSw").setAttribute("aria-checked", String(!r.classList.contains("rm")));
  };
  const save = () => store.set("prefs", { theme: r.dataset.theme, accent: r.dataset.accent, motion: r.classList.contains("rm") ? "off" : "on" });
  const pop = $("#themePop"), btn = $("#themeBtn");
  btn.addEventListener("click", (e) => { e.stopPropagation(); const o = !pop.classList.contains("open"); pop.classList.toggle("open", o); btn.setAttribute("aria-expanded", String(o)); });
  document.addEventListener("click", (e) => { if (!pop.contains(e.target)) { pop.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
  $$(".seg[data-k=theme] button").forEach((b) => b.addEventListener("click", () => { r.dataset.theme = b.dataset.v; save(); sync(); dispatchEvent(new Event("themechange")); }));
  $$(".swatches button").forEach((b) => b.addEventListener("click", () => { r.dataset.accent = b.dataset.v; save(); sync(); dispatchEvent(new Event("themechange")); }));
  $("#motionSw").addEventListener("click", () => { r.classList.toggle("rm"); save(); sync(); dispatchEvent(new Event("motionchange")); });
  if (prefs && prefs.motion === "off") r.classList.add("rm");
  sync();
  const dr = $("#drawer"), mb = $("#menuBtn");
  const setD = (o) => { dr.classList.toggle("open", o); dr.setAttribute("aria-hidden", String(!o)); mb.setAttribute("aria-expanded", String(o)); document.body.classList.toggle("no-scroll", o); };
  mb.addEventListener("click", () => setD(!dr.classList.contains("open")));
  dr.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target.closest("a")) setD(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { setD(false); pop.classList.remove("open"); } });
}

/* ---------- Footer ---------- */
export function footer(extraNote = "") {
  const f = document.createElement("footer");
  f.className = "foot"; f.setAttribute("role", "contentinfo");
  f.innerHTML = `<div class="wrap"><div class="cols">
    <div><img src="../shared/brand/logo.svg" alt="Threshold: The Future of ASI" width="240" height="55" style="margin-bottom:14px">
      <p>An open, research backed guide to the future of superintelligence. Every quote has a source, every video is verified.</p>
      <p class="motto">Start big, fix later, keep shipping.</p></div>
    <div><h5>Deep dives</h5><a href="../explosion/">Intelligence Explosion</a><a href="../library/">Book Library</a><a href="../#/futures">Futures</a><a href="../#/control">AI Control</a></div>
    <div><h5>Threshold</h5><a href="../#/researchers">Researchers</a><a href="../#/timeline">Timeline</a><a href="../#/watch">Watch</a><a href="../#/learn">Alignment 101</a></div>
    <div><h5>More</h5><a href="../#/blog">Blog</a><a href="../#/docs">Docs</a><a href="../../">ASI hub</a><a href="https://github.com/lo3elyon/ASI" rel="noopener">GitHub</a></div>
  </div><div class="legal"><span>Made by Aniruddha Adak, built with Hark. Open source on GitHub.</span><span>${extraNote || "Quotes belong to their speakers. Videos play from YouTube in privacy enhanced mode, only when you press play."}</span></div></div>`;
  document.body.appendChild(f);
  const t = document.createElement("div"); t.className = "toast"; t.id = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite");
  document.body.appendChild(t);
}

let toastT;
export function toast(msg) { const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }

/* ---------- Reveal on scroll ---------- */
export function reveal(root = document) {
  const els = $$(".rv:not(.in)", root);
  if (RM() || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach((e) => io.observe(e));
}

/* ---------- Video posters and theater (never autoplays: the iframe only exists after a click) ---------- */
export const ytThumb = (id, q = "hqdefault") => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${q}.jpg`;
export function videoCard(v) {
  return `<button type="button" class="card vcard hov" data-yt="${esc(v.id)}" data-title="${esc(v.title)}" aria-label="Play video: ${esc(v.title)}">
    <div class="th"><img loading="lazy" alt="" src="${ytThumb(v.id, "mqdefault")}" onload="this.classList.add('ld')">${v.duration ? `<span class="dur">${esc(v.duration.replace(/^0:/, ""))}</span>` : ""}<div class="play"><span>${ICON.play}</span></div></div>
    <div class="meta"><b>${esc(v.title)}</b><span>${esc(v.channel || "")}${v.date ? " · " + esc(v.date.slice(0, 7)) : ""}</span>${v.summary ? `<span style="color:var(--text-2)">${esc(v.summary)}</span>` : ""}</div>
  </button>`;
}
let theater;
export function wireVideos(root = document) {
  root.addEventListener("click", (e) => { const b = e.target.closest("[data-yt]"); if (b) { e.preventDefault(); openVideo(b.dataset.yt, b.dataset.title || ""); } });
}
export function openVideo(id, title) {
  if (!theater) {
    theater = document.createElement("div");
    theater.className = "theater wide"; theater.setAttribute("role", "dialog"); theater.setAttribute("aria-modal", "true"); theater.setAttribute("aria-label", "Video player");
    theater.innerHTML = `<div class="bar"><b></b><a class="btn sm ghost" target="_blank" rel="noopener" style="color:#e6f0fa">YouTube ${ICON.ext}</a><button class="icon-btn" type="button" aria-label="Close video">${ICON.close}</button></div><div class="stage"><div class="screen"></div></div>`;
    document.body.appendChild(theater);
    const close = () => { theater.classList.remove("open"); $(".screen", theater).innerHTML = ""; document.body.classList.remove("no-scroll"); if (theater._from) theater._from.focus(); };
    $("button", theater).addEventListener("click", close);
    theater.addEventListener("click", (e) => { if (e.target === theater || e.target.classList.contains("stage")) close(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && theater.classList.contains("open")) close(); });
  }
  theater._from = document.activeElement;
  $(".bar b", theater).textContent = title;
  $(".bar a", theater).href = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  $(".screen", theater).innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  theater.classList.add("open"); document.body.classList.add("no-scroll");
  $("button", theater).focus();
}

/* ---------- Canvas helper ---------- */
export function fitCanvas(c) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const r = c.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}
export function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
