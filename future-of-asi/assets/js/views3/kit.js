/* Views3 kit (Round 3, views owner): image helper, banners, and a small set of extra motion helpers that sit on top of core/motion3.js.
   Every helper respects reduced motion and registers its cleanup with motion3 so route changes tidy up. */
import { esc, RM, avatar } from "../util.js";
import { auto, onCleanup } from "../core/motion3.js";

export const IMG = "assets/img/views3/";
export const FINE = () => window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

/* Responsive, lazy picture: WebP first, JPG fallback, 640 and 1280 widths */
export function pic(name, alt = "", { cls = "", eager = false, sizes = "(max-width: 760px) 100vw, 50vw" } = {}) {
  return `<picture class="v3pic ${cls}"><source type="image/webp" srcset="${IMG}sm/${name}.webp 640w, ${IMG}${name}.webp 1280w" sizes="${sizes}"><img src="${IMG}${name}.jpg" srcset="${IMG}sm/${name}.jpg 640w, ${IMG}${name}.jpg 1280w" sizes="${sizes}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="1280" height="714"></picture>`;
}

/* A full width section banner with a parallax image and a kinetic heading */
export function banner(name, { eyebrow = "", title = "", lead = "", alt = "", cat = "cyan", id = "" } = {}) {
  return `<section class="v3-banner" data-cat="${cat}" ${id ? `aria-labelledby="${id}"` : ""}>
    <div class="v3-banner-img">${pic(name, alt, { sizes: "100vw" })}</div>
    <div class="v3-banner-shade" aria-hidden="true"></div>
    <div class="wrap v3-banner-in"><div class="eyebrow" data-m3="left">${eyebrow}</div><h2 ${id ? `id="${id}"` : ""} data-m3-split="words">${esc(title)}</h2>${lead ? `<p class="lead" data-m3="up" data-m3-delay="200">${lead}</p>` : ""}</div>
  </section>`;
}

/* Section shell used by every new block. Title is plain text (split into words by motion3). */
export function sec({ id, eyebrow, title, lead = "", cat = "cyan", body = "", cls = "", motif = "" }) {
  return `<section class="section tight v3-sec ${cls}" data-cat="${cat}" aria-labelledby="${id}" ${motif ? `data-motif="${motif}"` : ""}>
    <div class="wrap"><div class="v3-head"><div class="eyebrow" data-m3="left"><span class="dot-cat"></span>${eyebrow}</div><h2 id="${id}" data-m3-split="words">${esc(title)}</h2>${lead ? `<p class="lead" data-m3="up">${lead}</p>` : ""}</div>${body}</div>
  </section>`;
}

export const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "source"; } };
export const src = (u, label) => (u ? `<a class="v3-src" href="${esc(u)}" ${/^https?:/.test(u) ? 'target="_blank" rel="noopener"' : ""}>${esc(label || host(u))}<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/></svg></a>` : "");
export const dayIndex = (n) => { const d = new Date(); const k = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); return n ? k % n : k; };
export const fmtN = (n) => Number(n).toLocaleString("en-US");

/* Extra motion on top of motion3: in-view class, path draw, bars, rings, typewriter, scramble, ripple, dust canvas.
   Call fx3(node) on any node you render. It also runs motion3 auto when asked. */
export function fx3(root, { m3 = false } = {}) {
  if (!root) return () => {};
  const fns = [];
  if (m3) fns.push(auto(root));
  const targets = Array.from(root.querySelectorAll("[data-v3]"));
  if (RM() || !("IntersectionObserver" in window)) targets.forEach((t) => { t.classList.add("v3in"); finish(t); });
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("v3in"); start(e.target); io.unobserve(e.target); } }), { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((t) => io.observe(t));
    fns.push(() => io.disconnect());
  }
  /* ripple on every v3 button */
  const rip = (e) => {
    const b = e.target.closest && e.target.closest(".v3-btn, .v3-chip, .v3-rip"); if (!b || RM()) return;
    const r = b.getBoundingClientRect(); const s = document.createElement("i"); s.className = "v3-ripple";
    s.style.left = `${e.clientX - r.left}px`; s.style.top = `${e.clientY - r.top}px`; b.appendChild(s); setTimeout(() => s.remove(), 650);
  };
  root.addEventListener("pointerdown", rip);
  fns.push(() => root.removeEventListener("pointerdown", rip));
  root.querySelectorAll("canvas[data-v3-dust]").forEach((c) => fns.push(dust(c)));
  root.querySelectorAll("[data-v3-tiltimg]").forEach((c) => fns.push(tiltImg(c)));
  let done = false;
  const stop = () => { if (done) return; done = true; fns.forEach((f) => { try { f(); } catch (e) {} }); };
  onCleanup(stop);
  return stop;
}

function finish(t) {
  if (t.dataset.v3 === "type") t.textContent = t.dataset.text || t.textContent;
  if (t.dataset.v3 === "scramble") t.textContent = t.dataset.text || t.textContent;
}
function start(t) {
  const k = t.dataset.v3;
  if (k === "type") {
    const full = t.dataset.text || t.textContent; t.dataset.text = full; t.textContent = ""; let i = 0;
    const step = () => { if (!t.isConnected) return; t.textContent = full.slice(0, ++i); if (i < full.length) setTimeout(step, 18 + Math.random() * 30); };
    step();
  } else if (k === "scramble") {
    const full = t.dataset.text || t.textContent; t.dataset.text = full; const chars = "0123456789"; let n = 0;
    const iv = setInterval(() => { n++; t.textContent = full.split("").map((ch, i) => (/\d/.test(ch) && i >= n / 2 ? chars[(Math.random() * 10) | 0] : ch)).join(""); if (n > full.length * 2 + 4) { clearInterval(iv); t.textContent = full; } }, 40);
  }
}

/* Floating light particles in a canvas, paused when off screen or the tab is hidden */
export function dust(canvas) {
  if (RM()) return () => {};
  const ctx = canvas.getContext("2d"); if (!ctx) return () => {};
  const col = canvas.dataset.v3Dust || "34,211,238"; const N = +(canvas.dataset.n || 46);
  let W = 0, H = 0, raf = 0, on = false, alive = true; const dpr = Math.min(2, window.devicePixelRatio || 1);
  const P = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, vx: (Math.random() - 0.5) * 0.0004, vy: -0.0002 - Math.random() * 0.0006, a: 0.2 + Math.random() * 0.6 }));
  const size = () => { const r = canvas.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const draw = () => {
    if (!alive || !on) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of P) { p.x += p.vx; p.y += p.vy; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); } if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      ctx.beginPath(); ctx.fillStyle = `rgba(${col},${p.a})`; ctx.arc(p.x * W, p.y * H, p.r, 0, 6.283); ctx.fill(); }
    raf = requestAnimationFrame(draw);
  };
  const ro = new ResizeObserver(size); ro.observe(canvas); size();
  const io = new IntersectionObserver((es) => { on = es[0].isIntersecting && !document.hidden; cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(draw); });
  io.observe(canvas);
  const vis = () => { on = !document.hidden && on; if (document.hidden) cancelAnimationFrame(raf); };
  document.addEventListener("visibilitychange", vis);
  return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
}

/* Image card that shifts its picture against the pointer (a parallax layer inside the card) */
function tiltImg(card) {
  if (RM() || !FINE()) return () => {};
  const img = card.querySelector("img"); if (!img) return () => {};
  const mv = (e) => { const r = card.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; img.style.transform = `scale(1.12) translate(${(-x * 14).toFixed(1)}px,${(-y * 10).toFixed(1)}px)`; };
  const lv = () => { img.style.transform = ""; };
  card.addEventListener("pointermove", mv); card.addEventListener("pointerleave", lv);
  return () => { card.removeEventListener("pointermove", mv); card.removeEventListener("pointerleave", lv); };
}

/* Wrap a view's _onParams so new blocks re-mount after an in-place re-render */
export function rewire(el, after) {
  const orig = el._onParams;
  if (!orig || orig._v3) return;
  const w = async (p, q) => { const r = await orig(p, q); try { await after(p, q); auto(el); } catch (e) { console.warn("v3", e); } return r; };
  w._v3 = true; el._onParams = w;
}

/* Small SVG ring */
export function ring(pct, c = "var(--cat)", size = 64, label = "") {
  const r = size / 2 - 6, C = 2 * Math.PI * r;
  return `<svg class="v3-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label || Math.round(pct * 100) + " percent")}" data-v3 style="--C:${C.toFixed(1)};--off:${(C * (1 - pct)).toFixed(1)}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="6"/><circle class="arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="${(size / 4.4).toFixed(1)}" fill="var(--text)" font-family="var(--f-mono)">${Math.round(pct * 100)}%</text></svg>`;
}

/* Horizontal bar list: [[label, value, color, href?]] */
export function bars(rows, { max, unit = "", cls = "" } = {}) {
  const m = max || Math.max(1, ...rows.map((r) => r[1]));
  return `<div class="v3-bars ${cls}" data-v3>${rows.map(([l, v, c, href], i) => { const tag = href ? "a" : "div"; return `<${tag} class="v3-barrow" ${href ? `href="${esc(href)}"` : ""} style="--w:${((v / m) * 100).toFixed(1)}%;--c:${c || "var(--cat)"};--i:${i}"><span class="l">${esc(l)}</span><span class="t"><i></i></span><b>${fmtN(v)}${unit}</b></${tag}>`; }).join("")}</div>`;
}

/* Avatar with the photo credit on hover (title tooltip), initials only when there is no photo */
export function face(p, cls = "avatar") {
  const h = avatar(p, cls);
  const cr = p && p.photo && p.photo_credit;
  return cr ? h.replace(/^<span class="([^"]*)"/, `<span class="$1 v3face" title="Photo: ${esc(cr)}"`) : h;
}
