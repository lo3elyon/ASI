/* Round 3 page kit for Control, Timeline, Watch and Organisations.
   Images, heroes, banners, source lists and a set of small motion helpers that sit on top of core/motion3.js.
   Every helper respects reduced motion and returns a cleanup function. */
import { esc, RM, load, arr, slug, initials } from "../util.js";
import * as m3 from "../core/motion3.js";

export const IMG = "assets/img/pages3/";
const FINE = () => window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

/* Responsive picture: WebP first, JPG fallback, small and large sizes, lazy by default */
export function pic(name, alt = "", { cls = "", eager = false, sizes = "100vw" } = {}) {
  const s = (ext) => `${IMG}sm/${name}.${ext} 720w, ${IMG}${name}.${ext} 1376w`;
  return `<picture class="p3-pic ${cls}"><source type="image/webp" srcset="${s("webp")}" sizes="${sizes}"><img src="${IMG}${name}.jpg" srcset="${s("jpg")}" sizes="${sizes}" alt="${esc(alt)}" width="1376" height="768" ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}></picture>`;
}

/* Page hero with a generated photo, a scan line, a grid and counters */
export function hero({ img, alt, eyebrow, title, lead, stats = [], extra = "", cat = "cyan" }) {
  return `<section class="p3-hero" data-cat="${cat}">
    <div class="p3-hero-bg" aria-hidden="false">${pic(img, alt, { eager: true })}</div>
    <div class="p3-hero-grid" aria-hidden="true"></div><div class="p3-hero-scan" aria-hidden="true"></div><div class="p3-hero-orb" aria-hidden="true"></div>
    <div class="wrap p3-hero-in">
      <div class="eyebrow" data-m3="left">${eyebrow}</div>
      <h1 class="p3-h1" data-p3="rise">${title}</h1>
      ${lead ? `<p class="lead" data-m3="up" data-m3-delay="180">${lead}</p>` : ""}
      ${stats.length ? `<div class="p3-stats" data-m3-stagger="90">${stats.map((s) => `<div class="p3-stat" data-m3="up"><b data-m3-count="${s.n}"${s.suffix ? ` data-m3-suffix="${esc(s.suffix)}"` : ""}>${Number(s.n).toLocaleString("en-US")}${esc(s.suffix || "")}</b><span>${esc(s.label)}</span></div>`).join("")}</div>` : ""}
      ${extra}
    </div>
    <div class="p3-hero-cue" aria-hidden="true"><i></i></div>
  </section>`;
}

/* Full width image band that opens a section */
export function banner({ img, alt, eyebrow, title, text = "", id = "", cat = "cyan", align = "left" }) {
  return `<section class="p3-banner ${align === "right" ? "r" : ""}" data-cat="${cat}"${id ? ` id="${id}"` : ""}>
    <div class="p3-banner-img"><div class="p3-plx" data-m3-parallax="-0.08">${pic(img, alt)}</div></div>
    <div class="p3-banner-shade" aria-hidden="true"></div>
    <div class="wrap p3-banner-in"><div class="p3-banner-box" data-p3="wipe"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${text ? `<p>${text}</p>` : ""}</div></div>
  </section>`;
}

export function head(eyebrow, title, lead = "", right = "") {
  return `<div class="sec-head"><div><div class="eyebrow" data-m3="left">${eyebrow}</div><h2 data-m3-split="words">${title}</h2>${lead ? `<p class="lead" data-m3="up" data-m3-delay="120">${lead}</p>` : ""}</div>${right}</div>`;
}
/* Headings with markup inside cannot be split safely, so use this variant */
export function headH(eyebrow, titleHtml, lead = "", right = "") {
  return `<div class="sec-head"><div><div class="eyebrow" data-m3="left">${eyebrow}</div><h2 data-p3="rise">${titleHtml}</h2>${lead ? `<p class="lead" data-m3="up" data-m3-delay="120">${lead}</p>` : ""}</div>${right}</div>`;
}

/* Sources: [{t, by, y, url, note}] */
export function sources(list, title = "Sources") {
  return `<section class="section tight p3-sources"><div class="wrap"><details class="card p3-src" data-m3="up"><summary><span class="eyebrow">${esc(title)}</span><b>${list.length} links, each one opened and checked</b><i aria-hidden="true"></i></summary>
    <ol>${list.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.t)}</a>${s.by ? ` <span class="muted">${esc(s.by)}${s.y ? `, ${esc(s.y)}` : ""}</span>` : s.y ? ` <span class="muted">${esc(s.y)}</span>` : ""}${s.note ? `<br><small class="muted">${esc(s.note)}</small>` : ""}</li>`).join("")}</ol></details></div></section>`;
}

/* Motion on top of motion3: our own reveal kinds, path draws, bars, ripples, scramble, svg pause.
   data-p3="rise|flip|wipe|pop|skew|swing|iris|drop" reveals; data-p3-draw on svg paths; data-p3-bar="0.6" bars. */
export function run(root) {
  const fns = [];
  const rm = RM();
  // image fade in
  root.querySelectorAll(".p3-pic img").forEach((im) => { if (im.complete && im.naturalWidth) im.classList.add("ld"); else im.addEventListener("load", () => im.classList.add("ld"), { once: true }); im.addEventListener("error", () => im.classList.add("ld"), { once: true }); });
  const targets = Array.from(root.querySelectorAll("[data-p3]:not(.p3in), [data-p3-draw]:not(.p3in), [data-p3-bar]:not(.p3in), [data-p3-scramble]:not(.p3in)"));
  targets.forEach((t) => { if (t.hasAttribute("data-p3-draw")) prepDraw(t); });
  if (rm || !("IntersectionObserver" in window)) { targets.forEach((t) => show(t, true)); }
  else {
    targets.forEach((t) => t.classList.add("p3pre"));
    // clip-path reveals hide the element itself from IntersectionObserver, so watch the parent for those
    const map = new Map();
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; (map.get(e.target) || []).forEach(show); map.delete(e.target); io.unobserve(e.target); }), { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    targets.forEach((t) => { const o = /^(wipe|iris)$/.test(t.dataset.p3 || "") && t.parentElement ? t.parentElement : t; if (!map.has(o)) map.set(o, []); map.get(o).push(t); io.observe(o); });
    fns.push(() => io.disconnect());
  }
  // ripple on press
  const rip = (e) => {
    const b = e.target.closest && e.target.closest(".p3-rip"); if (!b || rm) return;
    const r = b.getBoundingClientRect(); const s = document.createElement("span"); s.className = "p3-ripple";
    s.style.left = e.clientX - r.left + "px"; s.style.top = e.clientY - r.top + "px"; b.appendChild(s); setTimeout(() => s.remove(), 650);
  };
  root.addEventListener("pointerdown", rip);
  fns.push(() => root.removeEventListener("pointerdown", rip));
  // pause SMIL animations when an svg is off screen
  const svgs = Array.from(root.querySelectorAll("svg[data-p3-pause]"));
  if (svgs.length && "IntersectionObserver" in window) {
    const io2 = new IntersectionObserver((es) => es.forEach((e) => { try { if (e.isIntersecting && !RM()) e.target.unpauseAnimations(); else e.target.pauseAnimations(); } catch (x) {} }));
    svgs.forEach((s) => io2.observe(s)); fns.push(() => io2.disconnect());
  }
  return () => fns.forEach((f) => { try { f(); } catch (e) {} });
}
function prepDraw(p) { try { const L = p.getTotalLength ? p.getTotalLength() : 0; if (L) { p.style.setProperty("--len", L.toFixed(1)); p.style.strokeDasharray = L.toFixed(1); } } catch (e) {} }
function show(t, instant) {
  t.classList.add("p3in"); t.classList.remove("p3pre");
  if (t.hasAttribute("data-p3-bar")) t.style.setProperty("--v", t.dataset.p3Bar);
  if (t.hasAttribute("data-p3-scramble") && !instant) scramble(t);
}
const GLY = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
export function scramble(el) {
  const final = el.dataset.p3Scramble || el.textContent; if (RM()) { el.textContent = final; return; }
  let f = 0; const N = 18;
  const step = () => { f++; el.textContent = final.split("").map((c, i) => (c === " " || i < (f / N) * final.length ? c : GLY[(Math.random() * GLY.length) | 0])).join(""); if (f < N) requestAnimationFrame(step); else el.textContent = final; };
  requestAnimationFrame(step);
}

/* Use motion3: the shell runs auto(view) after render. If it did not (older shell), run it ourselves once. */
export function m3init(el) {
  let stop = () => {};
  const t = setTimeout(() => { if (!el.isConnected) return; if (!el.querySelector(".m3-pre, .m3-tilt, .m3-split, .m3-marquee, [data-m3].in")) stop = m3.auto(el); }, 80);
  return () => { clearTimeout(t); stop(); };
}
export const m3auto = (node) => m3.auto(node);
export { m3 };

/* Horizontal shelves: mouse drag with a little momentum, plus wheel stays native */
export function dragScroll(el) {
  if (!FINE()) return () => {};
  let d = null, v = 0, raf = 0, moved = false;
  const down = (e) => { if (e.button !== 0 || e.pointerType !== "mouse") return; d = { x: e.clientX, s: el.scrollLeft, t: performance.now() }; moved = false; v = 0; cancelAnimationFrame(raf); };
  const move = (e) => { if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 5) { moved = true; el.classList.add("dragging"); } if (!moved) return; const now = performance.now(); const ns = d.s - dx; v = (ns - el.scrollLeft) / Math.max(1, now - (d.t || now)) * 16; d.t = now; el.scrollLeft = ns; };
  const up = () => { if (!d) return; d = null; el.classList.remove("dragging"); if (moved && !RM()) { const glide = () => { v *= 0.92; el.scrollLeft += v; if (Math.abs(v) > 0.5) raf = requestAnimationFrame(glide); }; raf = requestAnimationFrame(glide); } };
  const click = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
  el.addEventListener("pointerdown", down); window.addEventListener("pointermove", move, { passive: true }); window.addEventListener("pointerup", up);
  el.addEventListener("click", click, true);
  return () => { el.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); el.removeEventListener("click", click, true); cancelAnimationFrame(raf); };
}

/* Tiny helpers */
export const debounce = (fn, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export function sparkBars(values, { w = 300, h = 80, c = "var(--cat, #22d3ee)", labels = [] } = {}) {
  const max = Math.max(1, ...values); const bw = w / values.length;
  return `<svg viewBox="0 0 ${w} ${h + 16}" class="p3-spark" role="img" aria-label="${esc(labels.length ? labels.map((l, i) => `${l}: ${values[i]}`).join(", ") : "bar chart")}">${values.map((v, i) => { const bh = Math.max(1, (v / max) * h); return `<rect class="p3-sb" style="--i:${i}" x="${(i * bw + 1).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${c}"><title>${esc(labels[i] || "")} ${v}</title></rect>`; }).join("")}</svg>`;
}

/* Real photos for person cards. researchers.json photo_local first (relative to data/), then photo,
   then signer photos from data/signer-photos.json when that manifest exists. Initials only when nothing is there. */
let _ph = null;
const fix = (f) => (!f ? "" : /^(https?:|data\/|assets\/)/.test(f) ? f : `data/${String(f).replace(/^\.?\//, "")}`);
export function photoMap() {
  if (!_ph) _ph = Promise.all([load("researchers.json"), load("signer-photos.json", {})]).then(([r, sg]) => {
    const m = {};
    arr(r, "researchers").forEach((x) => { const id = x.id || slug(x.name); const f = fix(x.photo_local || x.photo || ""); if (f) m[id] = f; });
    const add = (k, v) => { const f = fix(v && (v.file || v.path || v.photo_local || v.photo) || (typeof v === "string" ? v : "")); if (k && f) { const f2 = /^data\//.test(f) || /^(https?:|assets\/)/.test(f) ? f : f; m["signer:" + slug(k)] = f2; } };
    if (Array.isArray(sg)) sg.forEach((x) => x && add(x.id || x.name, x));
    else if (sg && typeof sg === "object") Object.entries(sg.photos || sg.signers || sg).forEach(([k, v]) => { if (v && typeof v === "object" && !Array.isArray(v)) add(v.name || k, v); else if (typeof v === "string") add(k, v); });
    return m;
  });
  return _ph;
}
export function face(p, map, cls = "p3-face") {
  const src = (map && (map[p.id] || map["signer:" + slug(p.name)])) || "";
  return src ? `<span class="${cls}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" width="96" height="96" onerror="this.parentNode.classList.add('mono');this.parentNode.textContent='${esc(initials(p.name))}'"></span>`
    : `<span class="${cls} mono" aria-hidden="true">${esc(initials(p.name))}</span>`;
}

/* In page scrolling that cooperates with Lenis (native scrollIntoView is overridden while Lenis runs) */
import { getLenis } from "../core/motion.js";
export function scrollToEl(t, { block = "start", offset = null } = {}) {
  if (!t) return;
  const l = getLenis();
  const nav = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64;
  const r = t.getBoundingClientRect();
  if (block === "nearest" && r.top >= nav && r.bottom <= innerHeight) return;
  const off = offset != null ? offset : block === "center" ? -(innerHeight / 2 - r.height / 2) : -(nav + 56);
  if (l) l.scrollTo(t, { offset: off, duration: RM() ? 0 : 1.1, immediate: RM() });
  else window.scrollTo({ top: r.top + scrollY + off, behavior: RM() ? "auto" : "smooth" });
}
