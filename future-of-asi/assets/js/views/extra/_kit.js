/* Shared helpers for the Round 3 extra routes (papers, concepts, agents, arena, debates, careers, policy, numbers, kids, bharat).
   Everything respects reduced motion through motion3 and the CSS in assets/css/v3-new.css. */
import { $, $$, esc, load, RM, ICON, store, researchers, avatar, clamp } from "../../util.js";
import * as m3 from "../../core/motion3.js";
export { m3, $, $$, esc, RM, ICON, store, clamp };

export const X = (n) => load(`extra/${n.endsWith(".json") ? n : n + ".json"}`, {});
let _ppl = null;
export async function people() {
  if (!_ppl) _ppl = researchers().then((list) => ({ list, byId: Object.fromEntries(list.map((p) => [p.id, p])) }));
  return _ppl;
}

const pic = (img) => `<picture><source type="image/webp" srcset="assets/img/extra/${img}-sm.webp 640w, assets/img/extra/${img}.webp 1376w" sizes="100vw"><img class="bgimg x-bgimg" src="assets/img/extra/${img}.jpg" srcset="assets/img/extra/${img}-sm.jpg 640w, assets/img/extra/${img}.jpg 1376w" sizes="100vw" alt="" width="1376" height="768" decoding="async" fetchpriority="high" data-fx="hero-bg"></picture>`;
export function hero({ img, eyebrow, title, lead = "", extra = "", stats = [] }) {
  return `<section class="phero x-hero">${pic(img)}<div class="x-hero-glow" aria-hidden="true"></div><div class="wrap">
    <div class="eyebrow">${eyebrow}</div><h1 class="x-h1" data-m3="up">${title}</h1>${lead ? `<p class="lead" data-m3="up" data-m3-delay="120">${lead}</p>` : ""}
    ${stats.length ? `<div class="x-stats" data-m3-stagger="90">${stats.map(([v, l, suf = ""]) => `<div data-m3="up"><b${typeof v === "number" ? ` data-m3-count="${v}"${suf ? ` data-m3-suffix="${esc(suf)}"` : ""}` : ""}>${typeof v === "number" ? v.toLocaleString("en-US") + suf : esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>` : ""}
    ${extra}</div></section>`;
}
/* A full width photo band between sections */
export function band(img, caption = "") {
  return `<figure class="x-band" data-m3="fade">${`<picture><source type="image/webp" srcset="assets/img/extra/${img}-sm.webp 640w, assets/img/extra/${img}.webp 1376w" sizes="100vw"><img src="assets/img/extra/${img}.jpg" srcset="assets/img/extra/${img}-sm.jpg 640w, assets/img/extra/${img}.jpg 1376w" sizes="100vw" alt="" width="1376" height="768" loading="lazy" decoding="async" data-m3-parallax="-0.06"></picture>`}${caption ? `<figcaption class="wrap">${caption}</figcaption>` : ""}</figure>`;
}
export function sec(id, n, eyebrow, title, lead, body, cls = "") {
  return `<section class="section x-sec ${cls}" id="${id}" data-toc="${esc(eyebrow)}"><div class="wrap">
    <header class="x-sh" data-m3="up"><span class="x-num" aria-hidden="true">${String(n).padStart(2, "0")}</span><div><div class="eyebrow">${esc(eyebrow)}</div><h2>${title}</h2>${lead ? `<p class="lead">${lead}</p>` : ""}</div></header>
    ${body}</div></section>`;
}
/* On this page bar with scrollspy. Buttons, not hash links, because the app uses a hash router. */
export function tocBar(el) {
  const secs = $$(".x-sec[id]", el);
  if (secs.length < 2) return () => {};
  const nav = document.createElement("nav");
  nav.className = "x-toc"; nav.setAttribute("aria-label", "On this page");
  nav.innerHTML = `<div class="wrap" data-lenis-prevent><span class="x-toc-l">On this page</span>${secs.map((s) => `<button type="button" data-go="${s.id}">${esc(s.dataset.toc)}</button>`).join("")}</div>`;
  const hero = $(".x-hero", el);
  (hero ? hero.after(nav) : el.prepend(nav));
  nav.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (!b) return; const t = $("#" + b.dataset.go, el); if (t) { const y = t.getBoundingClientRect().top + window.scrollY - 110; window.scrollTo({ top: y, behavior: RM() ? "auto" : "smooth" }); } });
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { $$("button", nav).forEach((b) => b.classList.toggle("on", b.dataset.go === en.target.id)); const on = $(`button[data-go="${en.target.id}"]`, nav); if (on && on.scrollIntoView && nav.scrollWidth > nav.clientWidth) on.parentNode.scrollLeft = on.offsetLeft - 60; } }), { rootMargin: "-40% 0px -55% 0px" });
  secs.forEach((s) => io.observe(s));
  return () => io.disconnect();
}
export const ext = (url, label = "Source") => url ? `<a class="x-src" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ${ICON.ext}</a>` : "";
export function pchip(p, extra = "") {
  if (!p) return "";
  return `<a class="x-pchip" href="#/researchers/${esc(p.id)}" data-person="${esc(p.id)}">${avatar(p, "avatar x-av")}<span>${esc(p.name)}${extra}</span></a>`;
}
/* Horizontal bars. rows: [label, value, note?, color?]. Animate width when visible. */
export function bars(rows, { fmt = (v) => v.toLocaleString("en-US"), max, unit = "" } = {}) {
  const m = max || Math.max(...rows.map((r) => r[1]), 1);
  return `<div class="x-bars" data-m3="up">${rows.map(([l, v, note, c], i) => `<div class="x-bar" style="--i:${i};${c ? `--c:${c}` : ""}"><span class="l">${esc(l)}${note ? `<small>${esc(note)}</small>` : ""}</span><span class="t"><i style="--w:${clamp((v / m) * 100, 0.6, 100).toFixed(2)}%"></i></span><b>${fmt(v)}${unit}</b></div>`).join("")}</div>`;
}
/* Simple seeded random, for daily rounds and stable layouts */
export function rng(seed) { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function shuffle(a, r = Math.random) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
export const fmtD = (d) => { if (!d) return ""; const [y, m, dd] = String(d).split("-"); const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return [dd ? +dd : "", m ? M[+m - 1] : "", y].filter(Boolean).join(" "); };
export const today = () => new Date().toISOString().slice(0, 10);
/* Run motion3 on content rendered after the first paint (filters, rounds). Returns cleanup. */
export function anim(node) { try { return m3.auto(node); } catch (e) { return () => {}; } }
/* Collect cleanups */
export function bag() { const fns = []; return { add: (f) => { if (typeof f === "function") fns.push(f); return f; }, run: () => fns.splice(0).forEach((f) => { try { f(); } catch (e) {} }) }; }
export function onKey(fn) { document.addEventListener("keydown", fn); return () => document.removeEventListener("keydown", fn); }
/* Small sheet (side panel) used for deep linked details */
export function sheet(el, html, onClose) {
  let sh = $(".x-sheet", el);
  if (!sh) { sh = document.createElement("div"); sh.className = "x-sheet"; sh.innerHTML = `<div class="x-sheet-bg" data-xclose></div><aside class="x-sheet-p" role="dialog" aria-modal="true" tabindex="-1" data-lenis-prevent><button class="icon-btn x-sheet-x" type="button" data-xclose aria-label="Close">${ICON.close}</button><div class="x-sheet-b"></div></aside>`; el.appendChild(sh); sh.addEventListener("click", (e) => { if (e.target.closest("[data-xclose]")) onClose && onClose(); }); }
  $(".x-sheet-b", sh).innerHTML = html;
  requestAnimationFrame(() => { sh.classList.add("open"); $(".x-sheet-p", sh).focus({ preventScroll: true }); });
  document.documentElement.classList.add("x-sheet-on");
}
export function closeSheet(el) { const sh = $(".x-sheet", el); if (sh) sh.classList.remove("open"); document.documentElement.classList.remove("x-sheet-on"); }
export function setRoute(hash) { if (location.hash !== hash) history.pushState(history.state, "", location.pathname + location.search + hash); }
export function replaceRoute(hash) { history.replaceState(history.state, "", location.pathname + location.search + hash); }
export const BASE = "https://lo3elyon.github.io/ASI/future-of-asi/";

/* Log scale line chart for task time horizons. pts: [{m, date:"YYYY-MM", min, floor}] */
const yf = (d) => { const [y, m = 1] = String(d).split("-").map(Number); return y + (m - 1) / 12; };
export function horizonChart(pts, { w = 760, h = 340 } = {}) {
  const pad = { l: 64, r: 24, t: 24, b: 40 };
  const xs = pts.map((p) => yf(p.date)), x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs) + 0.25);
  const lo = Math.log10(1), hi = Math.log10(2400);
  const X = (v) => pad.l + ((v - x0) / (x1 - x0)) * (w - pad.l - pad.r), Y = (m) => h - pad.b - ((Math.log10(m) - lo) / (hi - lo)) * (h - pad.t - pad.b);
  const ticks = [[1, "1 min"], [10, "10 min"], [60, "1 hour"], [480, "8 hours"], [2400, "40 hours"]];
  const yrs = []; for (let y = x0; y <= x1; y++) yrs.push(y);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${X(yf(p.date)).toFixed(1)} ${Y(p.min).toFixed(1)}`).join(" ");
  const fmt = (m) => (m >= 60 ? `${+(m / 60).toFixed(1)} h` : `${m} min`);
  return `<svg class="x-hchart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Task time horizon chart: ${pts.map((p) => `${p.m} ${fmt(p.min)} in ${p.date}`).join("; ")}">
    ${ticks.map(([m, l]) => `<g class="gy"><line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(m)}" y2="${Y(m)}"></line><text x="${pad.l - 8}" y="${Y(m) + 4}" text-anchor="end">${l}</text></g>`).join("")}
    ${yrs.map((y) => `<g class="gx"><line x1="${X(y)}" x2="${X(y)}" y1="${pad.t}" y2="${h - pad.b}"></line><text x="${X(y)}" y="${h - pad.b + 22}" text-anchor="middle">${y}</text></g>`).join("")}
    <path class="x-draw" d="${d}" pathLength="1"></path>
    ${pts.map((p, i) => { const cx = X(yf(p.date)), cy = Y(p.min); const nxt = pts[i + 1]; const below = nxt && yf(nxt.date) - yf(p.date) < 0.4; const last = i === pts.length - 1; const anchor = last || below ? "end" : "start"; const tx = cx + (anchor === "end" ? -12 : 12); const ty = below ? cy + 26 : cy - 12; return `<g class="pt" style="--i:${i}"><circle cx="${cx}" cy="${cy}" r="6"></circle><text x="${tx}" y="${ty}" text-anchor="${anchor}">${esc(p.m)}: ${p.floor ? "at least " : ""}${fmt(p.min)}</text></g>`; }).join("")}
  </svg>`;
}
