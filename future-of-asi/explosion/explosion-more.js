/* Threshold: interactivity for chapters 11 to 20 of the intelligence explosion page.
   Content is static HTML in index.html (built from data/explosion-more.json). */
import { $, $$, clamp, RM } from "../shared/sub.js";

const seen = (el, fn, opt = { threshold: 0.25 }) => {
  if (!el) return;
  if (RM() || !("IntersectionObserver" in window)) { fn(true); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { fn(false); io.unobserve(e.target); } }), opt);
  io.observe(el);
};

/* ---------- counters: animate numbers that hold a single figure ---------- */
$$(".xm [data-count]").forEach((el) => {
  const raw = el.dataset.count, m = raw.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/);
  if (!m || /to|e\d/.test(raw)) return;
  const pre = m[1], num = parseFloat(m[2].replace(/,/g, "")), post = m[3], dec = (m[2].split(".")[1] || "").length, comma = m[2].includes(",");
  seen(el, (calm) => {
    if (calm) return;
    const t0 = performance.now(), dur = 1400;
    const fmt = (x) => (comma ? Math.round(x).toLocaleString("en-US") : x.toFixed(dec));
    (function step(t) { const k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = pre + fmt(num * e) + post; if (k < 1) requestAnimationFrame(step); else el.textContent = raw; })(t0);
  });
});

/* ---------- 11: the shape of growth ---------- */
(function curve() {
  const c = $("#xmCurve"); if (!c) return;
  let prog = RM() ? 1 : 0, raf = 0;
  function draw() {
    const dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight; c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const css = getComputedStyle(document.documentElement), line = css.getPropertyValue("--line-2").trim() || "rgba(255,255,255,.15)", muted = css.getPropertyValue("--muted").trim() || "#8aa0b6";
    const L = 40, R = w - 16, T = 16, B = h - 34;
    g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.moveTo(L, T); g.lineTo(L, B); g.lineTo(R, B); g.stroke();
    g.fillStyle = muted; g.font = "11px 'JetBrains Mono', monospace"; g.fillText("time", R - 34, B + 22); g.save(); g.translate(14, T + 70); g.rotate(-Math.PI / 2); g.fillText("output", 0, 0); g.restore();
    g.fillText("past", L + 4, B + 22); g.fillText("now", L + (R - L) * 0.78, B + 22);
    g.setLineDash([3, 4]); g.beginPath(); g.moveTo(L + (R - L) * 0.8, T); g.lineTo(L + (R - L) * 0.8, B); g.stroke(); g.setLineDash([]);
    const plot = (f, col, wdt) => { g.strokeStyle = col; g.lineWidth = wdt; g.shadowColor = col; g.shadowBlur = 10; g.beginPath(); const n = 200, upto = Math.floor(n * prog); for (let i = 0; i <= upto; i++) { const x = i / n, y = clamp(f(x), 0, 1.05); const px = L + x * (R - L), py = B - y * (B - T); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.shadowBlur = 0; };
    plot((x) => (Math.exp(4 * x) - 1) / (Math.exp(4) - 1) * 0.55, "#22d3ee", 2.2);
    plot((x) => 0.02 / Math.max(0.012, 0.98 - x) - 0.0204, "#f59e0b", 2.6);
  }
  const anim = () => { const t0 = performance.now(); (function s(t) { prog = clamp((t - t0) / 2200, 0, 1); draw(); if (prog < 1) raf = requestAnimationFrame(s); })(t0); };
  seen(c, (calm) => (calm ? draw() : anim()));
  new ResizeObserver(() => { if (!raf || prog >= 1) draw(); }).observe(c);
})();

/* ---------- 12: the r slider ---------- */
(function rslider() {
  const inp = $("#xmR"); if (!inp) return;
  const out = $("#xmRv"), bars = $("#xmBars"), ver = $("#xmVerdict");
  const fmt = (d) => (d < 1 ? `${Math.max(1, Math.round(d * 24))}\u00a0h` : d < 60 ? `${d.toFixed(d < 10 ? 1 : 0)}\u00a0days` : d < 730 ? `${(d / 30.4).toFixed(1)}\u00a0mo` : `${(d / 365).toFixed(1)}\u00a0yr`);
  function render() {
    const r = +inp.value, f = Math.pow(2, 1 / r - 1); out.textContent = r.toFixed(1);
    inp.style.setProperty("--p", `${((r - 0.4) / 2.6) * 100}%`);
    const ds = []; let d = 30.4; for (let i = 0; i < 10; i++) { ds.push(d); d *= f; }
    const max = Math.max(...ds), tot = ds.reduce((a, b) => a + b, 0);
    bars.innerHTML = ds.map((x, i) => `<div class="b" style="--h:${Math.max(3, (x / max) * 100)}%;--d:${i * 0.04}s"><i></i><span>${fmt(x)}</span></div>`).join("");
    const kind = r > 1.02 ? "explode" : r < 0.98 ? "fizzle" : "steady";
    bars.dataset.kind = kind;
    ver.innerHTML = kind === "explode" ? `<b class="up">Explosion.</b> Each doubling takes ${Math.round(f * 100)}% as long as the last. Ten doublings, a 1,024x gain, in about ${fmt(tot)}.`
      : kind === "fizzle" ? `<b class="down">Fizzle.</b> Each doubling takes ${Math.round((f - 1) * 100)}% longer than the last. Ten doublings take about ${fmt(tot)}.`
      : `<b>Steady.</b> Every doubling takes the same time. Ten doublings take about ${fmt(tot)}.`;
  }
  inp.addEventListener("input", render); render();
})();

/* ---------- bars, tripwires, survey and steps animate on view ---------- */
$$(".xm-bench, .xm-line, .xm-survey, .xm-steps, .xm-big, .xm-letter").forEach((el) => seen(el, () => el.classList.add("go")));

/* ---------- gentle parallax on chapter images ---------- */
(function parallax() {
  const imgs = $$(".xm-hero img"); if (!imgs.length) return;
  let tick = false;
  function run() { tick = false; if (RM()) { imgs.forEach((i) => (i.style.transform = "")); return; } const vh = innerHeight; imgs.forEach((i) => { const r = i.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return; const k = (r.top + r.height / 2 - vh / 2) / vh; i.style.transform = `translate3d(0, ${(k * -40).toFixed(1)}px, 0) scale(1.12)`; }); }
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true }); run();
})();

/* ---------- extra sources join the main list ---------- */
(async function sources() {
  try {
    const d = await (await fetch("data/explosion-more.json")).json(), ol = $("#srcs"); if (!ol) return;
    const have = new Set($$("a", ol).map((a) => a.href));
    const add = () => d.sources.filter((s) => !have.has(s.url)).forEach((s) => { const li = document.createElement("li"); li.innerHTML = `<a href="${s.url}" target="_blank" rel="noopener"></a>`; li.firstChild.textContent = s.t; ol.appendChild(li); have.add(s.url); });
    if (ol.children.length) add(); else new MutationObserver((m, o) => { if (ol.children.length) { o.disconnect(); add(); } }).observe(ol, { childList: true });
  } catch (e) { /* sources stay in data/explosion-more.json */ }
})();
