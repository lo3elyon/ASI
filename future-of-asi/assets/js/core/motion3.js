/* Motion3: small dependency free motion library shared by every view (Round 3).
   Everything respects reduced motion. Every helper returns a cleanup function. API in MOTION3.md. */
const RM = () => document.documentElement.classList.contains("rm") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const FINE = () => window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
const noop = () => {};
const els = (root, sel) => { const out = root && root.matches && root.matches(sel) ? [root] : []; return out.concat(Array.from((root || document).querySelectorAll(sel))); };

export const CAT = { cyan: "#22d3ee", teal: "#14b8a6", amber: "#f59e0b", red: "#ef4444", blue: "#3b82f6", lime: "#84cc16", orange: "#f97316", yellow: "#eab308", emerald: "#10b981", sky: "#0ea5e9" };
const ROUTE_CAT = { "": "cyan", home: "cyan", futures: "teal", researchers: "cyan", voices: "amber", pacing: "emerald", orgs: "sky", timeline: "red", watch: "blue", blog: "amber", library: "yellow", learn: "lime", control: "teal", explosion: "orange", docs: "blue", tools: "red", prepare: "amber", "your-history": "lime" };
const GROUP_CAT = { start: "cyan", people: "sky", history: "red", watch: "blue", learn: "lime", act: "amber", you: "emerald" };
let extraCats = {};
export function registerCats(map) { extraCats = Object.assign({}, extraCats, map); }
export const catFor = (slug, group) => extraCats[slug] || ROUTE_CAT[slug] || GROUP_CAT[group] || "cyan";
export const groupCat = (g) => GROUP_CAT[g] || "cyan";

const cleanups = new Set();
export function onCleanup(fn) { cleanups.add(fn); return () => cleanups.delete(fn); }
export function cleanupAll() { cleanups.forEach((f) => { try { f(); } catch (e) {} }); cleanups.clear(); }

/* Reveal on scroll */
export function reveal(root = document, { selector = "[data-m3]", rootMargin = "0px 0px -8% 0px" } = {}) {
  const list = els(root, selector).filter((e) => !e.classList.contains("in"));
  els(root, "[data-m3-stagger]").forEach((p) => stagger(p, "[data-m3]", +p.dataset.m3Stagger || 80));
  const show = (e) => { const d = +e.dataset.m3Delay || 0; e.style.setProperty("--m3d", d + "ms"); e.classList.add("in"); };
  if (RM() || !("IntersectionObserver" in window)) { list.forEach((e) => e.classList.add("in")); els(root, ".reveal-text").forEach((e) => e.classList.add("in")); return noop; }
  const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } }), { rootMargin, threshold: 0.06 });
  list.forEach((e) => { e.classList.add("m3-pre"); io.observe(e); });
  els(root, ".reveal-text").forEach((e) => { if (!e.matches(selector)) io.observe(e); });
  return () => io.disconnect();
}

export function stagger(parent, sel = "[data-m3]", step = 80) {
  Array.from(parent.querySelectorAll(sel)).forEach((c, i) => { if (!c.dataset.m3Delay) c.dataset.m3Delay = String(Math.min(i, 14) * step); });
  return noop;
}

/* Split text into word or char spans. Keeps the original as aria-label. */
export function split(el, { by = "words" } = {}) {
  if (!el || el.dataset.m3Done) return [];
  const text = el.textContent;
  el.dataset.m3Done = "1";
  if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", text.trim());
  const parts = by === "chars" ? Array.from(text) : text.split(/(\s+)/);
  const frag = document.createDocumentFragment(); const spans = []; let i = 0;
  parts.forEach((p) => {
    if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
    const s = document.createElement("span"); s.className = by === "chars" ? "m3-c" : "m3-w"; s.setAttribute("aria-hidden", "true");
    s.style.setProperty("--i", i++); s.textContent = p; frag.appendChild(s); spans.push(s);
  });
  el.textContent = ""; el.appendChild(frag); el.classList.add("m3-split");
  if (RM()) el.classList.add("in");
  return spans;
}

/* Count up when visible */
export function counter(el, { to, from = 0, dur = 1400, decimals, prefix, suffix } = {}) {
  const t = to != null ? +to : +el.dataset.m3Count;
  const dec = decimals != null ? decimals : +(el.dataset.m3Decimals || 0);
  const pre = prefix != null ? prefix : el.dataset.m3Prefix || "", suf = suffix != null ? suffix : el.dataset.m3Suffix || "";
  const fmt = (v) => pre + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
  if (isNaN(t)) return noop;
  if (RM() || !("IntersectionObserver" in window)) { el.textContent = fmt(t); return noop; }
  let raf = 0;
  const io = new IntersectionObserver((ents) => { if (!ents[0].isIntersecting) return; io.disconnect(); const t0 = performance.now();
    const step = (n) => { const k = Math.min(1, (n - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (t - from) * e); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); }, { threshold: 0.3 });
  io.observe(el);
  return () => { io.disconnect(); cancelAnimationFrame(raf); el.textContent = fmt(t); };
}

/* Parallax (shared scroll loop) */
const plx = new Set(); let plxOn = false;
function plxLoop() { if (!plx.size) { plxOn = false; return; } const vh = innerHeight;
  plx.forEach(([e, k]) => { const r = e.getBoundingClientRect(); const c = r.top + r.height / 2 - vh / 2; e.style.transform = `translate3d(0,${(-c * k).toFixed(1)}px,0)`; });
  requestAnimationFrame(plxLoop); }
export function parallax(el, k) {
  if (RM()) return noop;
  const item = [el, k != null ? +k : +(el.dataset.m3Parallax || 0.15)]; plx.add(item);
  if (!plxOn) { plxOn = true; requestAnimationFrame(plxLoop); }
  return () => { plx.delete(item); el.style.transform = ""; };
}

/* Tilt toward pointer */
export function tilt(el, max) {
  if (RM() || !FINE()) return noop;
  const m = max != null ? +max : +(el.dataset.m3Tilt || 6) || 6; let raf = 0;
  el.classList.add("m3-tilt");
  const mv = (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { el.style.setProperty("--rx", (-y * m).toFixed(2) + "deg"); el.style.setProperty("--ry", (x * m).toFixed(2) + "deg"); el.style.setProperty("--sx", ((x + 0.5) * 100).toFixed(1) + "%"); el.style.setProperty("--sy", ((y + 0.5) * 100).toFixed(1) + "%"); }); };
  const lv = () => { cancelAnimationFrame(raf); el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
  el.addEventListener("pointermove", mv); el.addEventListener("pointerleave", lv);
  return () => { el.removeEventListener("pointermove", mv); el.removeEventListener("pointerleave", lv); lv(); };
}

/* Magnetic button */
export function magnetic(el, s) {
  if (RM() || !FINE()) return noop;
  const k = s != null ? +s : +(el.dataset.m3Magnet || 0.3) || 0.3;
  el.classList.add("btn-magnet");
  const mv = (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * k).toFixed(1)}px,${((e.clientY - r.top - r.height / 2) * k).toFixed(1)}px)`; };
  const lv = () => { el.style.transform = ""; };
  el.addEventListener("pointermove", mv); el.addEventListener("pointerleave", lv);
  return () => { el.removeEventListener("pointermove", mv); el.removeEventListener("pointerleave", lv); lv(); };
}

/* Marquee: duplicates children once and scrolls with CSS */
export function marquee(el, speed) {
  if (el.dataset.m3Mq) return noop;
  el.dataset.m3Mq = "1"; el.classList.add("m3-marquee");
  const track = document.createElement("div"); track.className = "m3-mq-track";
  while (el.firstChild) track.appendChild(el.firstChild);
  el.appendChild(track);
  if (RM()) { el.classList.add("m3-static"); return noop; }
  Array.from(track.children).forEach((c) => { const d = c.cloneNode(true); d.setAttribute("aria-hidden", "true"); d.querySelectorAll("a,button,[tabindex]").forEach((x) => x.setAttribute("tabindex", "-1")); track.appendChild(d); });
  const pps = speed != null ? +speed : +(el.dataset.m3Marquee || 40) || 40;
  requestAnimationFrame(() => { const w = track.scrollWidth / 2; track.style.setProperty("--mq-dur", Math.max(8, w / pps).toFixed(1) + "s"); track.style.setProperty("--mq-w", w + "px"); });
  return noop;
}

/* Scroll progress: global top bar or per section bars */
export function scrollProgress(el) {
  if (el) {
    const sec = el.parentElement; let raf = 0;
    const f = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const r = sec.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight))); el.style.setProperty("--p", p.toFixed(3)); }); };
    f(); addEventListener("scroll", f, { passive: true }); addEventListener("resize", f);
    return () => { removeEventListener("scroll", f); removeEventListener("resize", f); };
  }
  let bar = document.querySelector(".m3-read");
  if (!bar) { bar = document.createElement("div"); bar.className = "m3-read"; bar.setAttribute("aria-hidden", "true"); document.body.appendChild(bar); }
  let raf = 0;
  const f = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; }); };
  f(); addEventListener("scroll", f, { passive: true }); addEventListener("resize", f);
  return () => { removeEventListener("scroll", f); removeEventListener("resize", f); };
}

/* Cursor spotlight on cards (delegated per root) */
export function spotlight(root = document) {
  if (!FINE()) return noop;
  const mv = (e) => { const c = e.target.closest && e.target.closest(".m3-spot, .card-glow"); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px"); };
  root.addEventListener("pointermove", mv, { passive: true });
  return () => root.removeEventListener("pointermove", mv);
}

/* Kinetic heading: letters lift near the pointer */
export function kinetic(el) {
  const spans = el.querySelector(".m3-c") ? Array.from(el.querySelectorAll(".m3-c")) : split(el, { by: "chars" });
  el.classList.add("kinetic", "in");
  if (RM() || !FINE()) return noop;
  let raf = 0;
  const mv = (e) => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => spans.forEach((s) => { const r = s.getBoundingClientRect(); const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); const k = Math.max(0, 1 - d / 160); s.style.transform = `translateY(${(-k * 10).toFixed(1)}px)`; s.style.opacity = (0.75 + k * 0.25).toFixed(2); })); };
  const lv = () => spans.forEach((s) => { s.style.transform = ""; s.style.opacity = ""; });
  el.addEventListener("pointermove", mv); el.addEventListener("pointerleave", lv);
  return () => { el.removeEventListener("pointermove", mv); el.removeEventListener("pointerleave", lv); lv(); };
}

/* Run every data attribute helper inside root */
export function auto(root = document) {
  if (!root) return noop;
  const fns = [];
  els(root, "[data-m3-split]").forEach((e) => { split(e, { by: e.dataset.m3Split === "chars" ? "chars" : "words" }); if (!e.hasAttribute("data-m3")) e.setAttribute("data-m3", "fade"); });
  fns.push(reveal(root));
  els(root, "[data-m3-count]").forEach((e) => fns.push(counter(e)));
  els(root, "[data-m3-parallax]").forEach((e) => fns.push(parallax(e)));
  els(root, "[data-m3-tilt]").forEach((e) => fns.push(tilt(e)));
  els(root, "[data-m3-magnet]").forEach((e) => fns.push(magnetic(e)));
  els(root, "[data-m3-marquee]").forEach((e) => fns.push(marquee(e)));
  els(root, "[data-m3-progress]").forEach((e) => fns.push(scrollProgress(e)));
  els(root, "[data-m3-kinetic]").forEach((e) => fns.push(kinetic(e)));
  fns.push(spotlight(root));
  let done = false;
  const stop = () => { if (done) return; done = true; fns.forEach((f) => { try { f(); } catch (e) {} }); cleanups.delete(stop); };
  cleanups.add(stop);
  return stop;
}
export default { auto, reveal, split, counter, parallax, tilt, magnetic, marquee, stagger, scrollProgress, spotlight, kinetic, CAT, catFor, registerCats, onCleanup, cleanupAll };
