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

/* ---------- Header: the same one as the hash app (assets/js/core/nav.js) ---------- */
import { mountHeader, setExtras, refreshMenu } from "../assets/js/core/nav.js";
import { initOffline, registerSW, saveEverything } from "../assets/js/core/offline.js";
import { initSound, setSound } from "../assets/js/core/sound.js";
import { logView } from "../assets/js/core/history.js";
import { auto as m3auto, scrollProgress } from "../assets/js/core/motion3.js";
import { preloadFonts } from "../assets/js/core/fonts.js";
const PAGE_TITLES = { explosion: "The Intelligence Explosion", library: "Book Library" };
function ensureCss(href) { if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); } }
export function header(active) {
  ensureCss("../assets/css/v3-shell.css");
  if (!document.querySelector('link[rel="manifest"]')) { const l = document.createElement("link"); l.rel = "manifest"; l.href = "../manifest.webmanifest"; document.head.appendChild(l); }
  document.body.dataset.cat = active === "library" ? "yellow" : active === "explosion" ? "orange" : "cyan";
  if (!document.querySelector(".skip")) { const sk = document.createElement("a"); sk.className = "skip"; sk.href = "#main"; sk.textContent = "Skip to content"; document.body.prepend(sk); }
  if (!document.querySelector(".ambient")) { const am = document.createElement("div"); am.className = "ambient"; am.setAttribute("aria-hidden", "true"); const gr = document.createElement("div"); gr.className = "grain"; gr.setAttribute("aria-hidden", "true"); document.body.prepend(am, gr); }
  /* The page HTML already holds an empty header of the right height (Round 4.2), so mounting the menu does not push the page down */
  let hdr = document.getElementById("topbar");
  const skip = document.querySelector(".skip");
  if (!hdr) { hdr = document.createElement("header"); hdr.id = "topbar"; hdr.className = "topbar tb3"; hdr.setAttribute("role", "banner"); skip.after(hdr); } else if (hdr.previousElementSibling !== skip) skip.after(hdr);
  const goSearch = () => { location.href = "../#/?search"; };
  mountHeader({ ctx: "sub", active, toast, onSearch: goSearch, onSaveOffline: () => saveEverything(), onSound: () => setSound(!document.documentElement.classList.contains("snd")) });
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); goSearch(); } if (e.key === "/" && !/input|textarea|select/i.test((document.activeElement || {}).tagName || "") && !(document.activeElement || {}).isContentEditable) { e.preventDefault(); goSearch(); } });
  import("../assets/js/views/extra/registry.js").then((m) => { if (Array.isArray(m.EXTRA_ROUTES) && m.EXTRA_ROUTES.length) { setExtras(m.EXTRA_ROUTES); refreshMenu(); } }).catch(() => {});
  preloadFonts(active);
  initSound();
  initOffline({ toast });
  registerSW();
  if (!document.querySelector(".xprog")) scrollProgress();
  try { logView("page", active, PAGE_TITLES[active] || active, { sub: "Deep dive" }); } catch (e) {}
  requestAnimationFrame(() => m3auto(document.getElementById("main") || document.body));
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
    <div><h5>More</h5><a href="../#/blog">Blog</a><a href="../#/docs">Docs</a><a href="../#/your-history">Your history</a><a href="https://github.com/lo3elyon/ASI/blob/main/future-of-asi/CHANGELOG.md" rel="noopener">Changelog</a><a href="../../">ASI hub</a><a href="https://github.com/lo3elyon/ASI/tree/main/future-of-asi" rel="noopener">GitHub</a></div>
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
  return `<button type="button" class="card vcard hov" data-yt="${esc(v.id)}" data-title="${esc(v.title)}"><span class="sr-only">Play video: </span>
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
