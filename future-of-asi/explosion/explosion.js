/* The Intelligence Explosion: interactive chapters. Vanilla JS, no dependencies. */
import { $, $$, esc, clamp, RM, header, footer, reveal, getJSON, videoCard, wireVideos, fitCanvas, cssVar, ICON, toast } from "../shared/sub.js";

header("explosion");
footer();
const D = await getJSON("data/explosion.json", null);
if (!D) { $("#main").insertAdjacentHTML("afterbegin", `<div class="wrap section"><div class="empty-state">The data file did not load. Try reloading the page.</div></div>`); throw new Error("no data"); }

const COL = () => ({ text: cssVar("--text"), text2: cssVar("--text-2"), muted: cssVar("--muted"), line: cssVar("--line-2"), line1: cssVar("--line"), teal: "#14b8a6", cyan: "#22d3ee", amber: "#f59e0b", red: "#ef4444", blue: "#3b82f6", lime: "#84cc16", accent: cssVar("--accent"), bg: cssVar("--bg"), surface: cssVar("--surface") });
const visible = new Map();
const vio = new IntersectionObserver((es) => es.forEach((e) => visible.set(e.target, e.isIntersecting)), { rootMargin: "100px" });
const isVis = (el) => visible.get(el) !== false;
const person = (rid, name) => {
  const ini = String(name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return rid ? `<span class="avatar"><img src="../assets/people/${esc(rid)}.jpg" alt="" loading="lazy" onerror="this.remove()">${ini}</span>` : `<span class="avatar">${ini}</span>`;
};
const fmtN = (x) => x >= 1e6 ? "over 1,000,000" : x >= 100 ? Math.round(x).toLocaleString("en-US") : x >= 10 ? x.toFixed(0) : x.toFixed(1);
const fmtDur = (days) => days < 1 / 24 ? `${Math.max(1, Math.round(days * 1440))} min` : days < 1 ? `${(days * 24).toFixed(days * 24 < 10 ? 1 : 0)} hours` : days < 60 ? `${days.toFixed(days < 10 ? 1 : 0)} days` : days < 730 ? `${(days / 30.4).toFixed(1)} months` : `${(days / 365).toFixed(1)} years`;

/* ---------- Rail and progress ---------- */
const chaps = $$(".chap");
const RAILC = ["#22d3ee", "#14b8a6", "#3b82f6", "#84cc16", "#f59e0b", "#f59e0b", "#14b8a6", "#ef4444", "#ef4444", "#22d3ee", "#3b82f6", "#84cc16"];
$("#rail").innerHTML = chaps.map((c, i) => `<a href="#${c.id}" style="--c:${RAILC[i % RAILC.length]}"><i></i><span>${c.dataset.n} ${esc(c.dataset.t)}</span></a>`).join("");
const railLinks = $$("#rail a");
function onScroll() {
  const h = document.documentElement, max = h.scrollHeight - innerHeight;
  $("#xprog").style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1) : 0})`;
  let cur = -1;
  chaps.forEach((c, i) => { if (c.getBoundingClientRect().top < innerHeight * 0.45) cur = i; });
  railLinks.forEach((a, i) => { a.classList.toggle("lit", i <= cur); a.classList.toggle("on", i === cur); });
}
addEventListener("scroll", onScroll, { passive: true }); onScroll();

/* ---------- Hero sparks ---------- */
(function sparks() {
  const c = $("#sparks"); vio.observe(c);
  let parts = [], last = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (RM() || !isVis(c) || t - last < 33) return; last = t;
    const { ctx, w, h } = fitCanvas(c);
    if (parts.length < 70) parts.push({ x: w * (0.55 + Math.random() * 0.4), y: h + 10, v: 0.4 + Math.random() * 1.4, r: Math.random() * 1.8 + 0.4, a: Math.random() * 0.6 + 0.2, d: (Math.random() - 0.5) * 0.4 });
    ctx.clearRect(0, 0, w, h);
    parts.forEach((p) => { p.y -= p.v; p.v *= 1.006; p.x += p.d; ctx.globalAlpha = p.a * clamp(p.y / h, 0, 1); ctx.fillStyle = p.y < h * 0.35 ? "#f59e0b" : "#22d3ee"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1; parts = parts.filter((p) => p.y > -20);
  }
  requestAnimationFrame(frame);
})();

/* ---------- 01 Story: scroll driven recursive spiral ---------- */
(function story() {
  $("#storySteps").innerHTML = D.history.map((s) => `<div class="step"><div class="box"><div class="yr">${esc(s.y)}</div><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p><p style="margin-top:10px"><a href="${esc(s.url)}" target="_blank" rel="noopener">Source ${ICON.ext}</a></p></div></div>`).join("");
  const steps = $$("#storySteps .step"), cv = $("#spiral"), yr = $("#storyYr"), sec = $("#story");
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { steps.forEach((s) => s.classList.remove("on")); e.target.classList.add("on"); yr.textContent = D.history[steps.indexOf(e.target)].y; } }), { rootMargin: "-45% 0px -45% 0px" });
  steps.forEach((s) => io.observe(s));
  let prog = 0, shown = 0;
  function draw() {
    const { ctx, w, h } = fitCanvas(cv); const C = COL();
    ctx.clearRect(0, 0, w, h);
    const cx = w * (w > 760 ? 0.66 : 0.5), cy = h * 0.52, R = Math.min(w, h) * 0.42;
    const n = 1 + shown * 10;
    for (let k = 0; k < Math.floor(n) + 1; k++) {
      const f = clamp(n - k, 0, 1); if (f <= 0) break;
      const s = Math.pow(0.72, k), rr = R * s, rot = k * 0.9 + prog * 2;
      const grd = ctx.createLinearGradient(cx - rr, cy - rr, cx + rr, cy + rr);
      const hot = k / 11; grd.addColorStop(0, C.teal); grd.addColorStop(0.6, C.cyan); grd.addColorStop(1, hot > 0.6 ? C.red : C.amber);
      ctx.strokeStyle = grd; ctx.lineWidth = Math.max(1, 3 * s + 0.6); ctx.globalAlpha = 0.25 + 0.75 * f;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 * f; a += 0.04) { const r2 = rr * (1 - a / (Math.PI * 2) * 0.28); const x = cx + Math.cos(a + rot) * r2, y = cy + Math.sin(a + rot) * r2; a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      if (f > 0.98) { ctx.fillStyle = hot > 0.6 ? C.red : C.cyan; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(cx + Math.cos(rot) * rr, cy + Math.sin(rot) * rr, 2.5 + 3 * s, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  function tick() {
    const r = sec.getBoundingClientRect(); prog = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    shown += (prog - shown) * (RM() ? 1 : 0.12); draw();
    if (Math.abs(prog - shown) > 0.002) requestAnimationFrame(tick);
  }
  addEventListener("scroll", () => requestAnimationFrame(tick), { passive: true }); addEventListener("resize", tick); addEventListener("themechange", tick); tick();
  const g = D.quotes.find((q) => q.rid === "i-j-good");
  $("#goodQuote").innerHTML = `<blockquote>&ldquo;${esc(g.text)}&rdquo;</blockquote><figcaption>I. J. Good, Speculations Concerning the First Ultraintelligent Machine, ${esc(g.date)} · <a href="${esc(g.url)}" target="_blank" rel="noopener">source</a></figcaption>`;
})();

/* ---------- 02 Recursive loop simulator ---------- */
const sim = (() => {
  const P = { k: $("#sK"), g: $("#sG"), r: $("#sR"), b: $("#sB") };
  const PRESETS = [
    { n: "Slow and steady", v: [25, 35, 35, 45], d: "Close to a slow takeoff: real but gradual acceleration." },
    { n: "AI 2027 style", v: [60, 45, 65, 25], d: "Strong feedback once AI does most research." },
    { n: "Fast takeoff", v: [80, 50, 85, 10], d: "Big returns, few bottlenecks. Runs away within a few years." },
    { n: "Bottlenecked", v: [70, 30, 55, 85], d: "AI is strong, but experiments, chips and review hold everything back." },
    { n: "Ideas get harder", v: [40, 40, 10, 40], d: "Each new idea is much harder to find, so the loop fades." },
    { n: "Humans only", v: [0, 45, 50, 30], d: "No AI help. The baseline." },
  ];
  $("#simPresets").innerHTML = PRESETS.map((p, i) => `<button class="chip" type="button" data-i="${i}" title="${esc(p.d)}">${esc(p.n)}</button>`).join("");
  const params = () => {
    const sk = +P.k.value, sg = +P.g.value, sr = +P.r.value, sb = +P.b.value;
    return { kappa: sk === 0 ? 0 : 0.01 * Math.pow(10, sk / 40), g: 1 + 5 * sg / 100, r: 0.35 + 1.65 * sr / 100, b: 0.9 * sb / 100 };
  };
  function run(p) {
    const lam = 0.6, phi = 1 - lam / p.r, c = 0.5, YMAX = Math.log(1e12), dt = 0.004;
    let y = 0, t = 0, r0 = null, best = Infinity, t1000 = null, Me = 1, dy = 0, capped = false; const pts = [[0, 0]];
    while (t < 10) {
      const H = Math.pow(1.04, t), C = Math.pow(p.g, t), L = p.kappa * Math.exp(y) * C, M = (H + L) / H;
      Me = Math.pow(M, 1 - p.b); const E = H * Me;
      dy = c * Math.exp((phi - 1) * y) * Math.pow(E, lam);
      if (r0 === null) r0 = dy;
      best = Math.min(best, Math.LN2 / dy);
      y += dy * dt; t += dt;
      if (t1000 === null && y >= Math.log(1000)) t1000 = t;
      if (y >= YMAX) { y = YMAX; capped = true; pts.push([t, y / Math.LN10]); break; }
      if (pts.length === 0 || t - pts[pts.length - 1][0] > 0.04) pts.push([t, y / Math.LN10]);
    }
    const ratio = dy / r0;
    const regime = capped || ratio > 3 ? "Explosion" : ratio > 0.7 ? "Steady growth" : "Fizzle";
    return { pts, regime, Me, best, t1000, capped, tEnd: t };
  }
  let res, base, anim = 1, raf;
  function update(animate = true) {
    const p = params();
    $("#oK").textContent = p.kappa === 0 ? "off" : `${p.kappa.toFixed(2)}x`;
    $("#oG").textContent = `${p.g.toFixed(1)}x / yr`;
    $("#oR").textContent = p.r.toFixed(2);
    $("#oB").textContent = `${Math.round(p.b * 100)}%`;
    Object.values(P).forEach((el) => el.style.setProperty("--p", `${el.value}%`));
    res = run(p); base = run({ ...p, kappa: 0 });
    const rg = $("#rRegime"); rg.textContent = res.regime; rg.className = res.regime === "Explosion" ? "explode" : res.regime === "Fizzle" ? "fizzle" : "steady";
    $("#rMult").textContent = `${fmtN(res.Me)}x`;
    $("#rDbl").textContent = fmtDur(res.best * 365);
    $("#rK").textContent = res.t1000 ? `year ${res.t1000.toFixed(1)}` : "not in 10 years";
    anim = animate && !RM() ? 0 : 1; cancelAnimationFrame(raf); raf = requestAnimationFrame(drawCurve);
  }
  function drawCurve() {
    const cv = $("#curveCv"); const { ctx, w, h } = fitCanvas(cv); const C = COL();
    const pad = { l: 44, r: 16, t: 18, b: 34 }, W = w - pad.l - pad.r, H = h - pad.t - pad.b;
    const X = (t) => pad.l + (t / 10) * W, Y = (v) => pad.t + H - (v / 12) * H;
    ctx.clearRect(0, 0, w, h);
    ctx.font = `11px ${cssVar("--f-mono") || "monospace"}`; ctx.fillStyle = C.muted; ctx.strokeStyle = C.line1; ctx.lineWidth = 1;
    for (let v = 0; v <= 12; v += 3) { ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(w - pad.r, Y(v)); ctx.stroke(); ctx.fillText(v === 0 ? "1x" : `1e${v}`, 6, Y(v) + 4); }
    for (let t = 0; t <= 10; t += 2) ctx.fillText(`yr ${t}`, clamp(X(t) - 12, 0, w - 36), h - 10);
    ctx.setLineDash([4, 6]); ctx.strokeStyle = C.amber; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(pad.l, Y(3)); ctx.lineTo(w - pad.r, Y(3)); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.amber; ctx.fillText("1,000x", w - pad.r - 50, Y(3) - 6);
    ctx.strokeStyle = C.muted; ctx.beginPath(); base.pts.forEach(([t, v], i) => i ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke(); ctx.setLineDash([]);
    const n = Math.max(2, Math.floor(res.pts.length * anim));
    const grd = ctx.createLinearGradient(pad.l, 0, w - pad.r, 0); grd.addColorStop(0, C.teal); grd.addColorStop(0.6, C.cyan); grd.addColorStop(1, res.regime === "Explosion" ? C.red : C.amber);
    ctx.strokeStyle = grd; ctx.lineWidth = 3; ctx.shadowColor = C.cyan; ctx.shadowBlur = 10;
    ctx.beginPath(); res.pts.slice(0, n).forEach(([t, v], i) => i ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke(); ctx.shadowBlur = 0;
    const [lt, lv] = res.pts[n - 1]; ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(X(lt), Y(lv), 4.5, 0, 7); ctx.fill();
    if (res.capped && anim >= 1) { ctx.fillStyle = C.red; ctx.fillText("hits physical limits", Math.min(X(lt) + 8, w - 140), Y(12) + 14); }
    ctx.fillStyle = C.muted; ctx.fillText("capability (effective compute, log scale)", pad.l + 6, pad.t + 10);
    if (anim < 1) { anim = Math.min(1, anim + 0.035); raf = requestAnimationFrame(drawCurve); }
  }
  // Loop animation: packets travel around a ring; speed follows the research multiplier
  const lc = $("#loopCv"); vio.observe(lc); let ang = 0, lastT = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    if (!isVis(lc) && lastT) return;
    const dt = Math.min(50, t - (lastT || t)); lastT = t;
    const { ctx, w, h } = fitCanvas(lc); const C = COL(); const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.36;
    const speed = res ? clamp(Math.log10(1 + res.Me) * 0.9, 0.15, 6) : 0.5;
    if (!RM()) ang += dt * 0.0012 * speed;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = C.line; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    const hot = res && res.regime === "Explosion";
    ctx.strokeStyle = hot ? C.red : C.cyan; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, ang, ang + Math.PI * 1.2); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = ang + i * 1.05; ctx.fillStyle = i % 2 ? C.amber : C.teal; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 4, 0, 7); ctx.fill(); }
    ctx.fillStyle = C.text; ctx.textAlign = "center"; ctx.font = `600 13px ${cssVar("--f-display") || "sans-serif"}`;
    ctx.fillText("Better AI", cx, cy - R - 10 < 12 ? 14 : cy - R - 10);
    ctx.fillText("More research", cx, cy + R + 22 > h - 4 ? h - 6 : cy + R + 22);
    ctx.font = `11px ${cssVar("--f-mono") || "monospace"}`; ctx.fillStyle = C.muted; ctx.fillText(res ? `${fmtN(res.Me)}x` : "", cx, cy + 4); ctx.textAlign = "left";
  }
  requestAnimationFrame(loop);
  Object.values(P).forEach((el) => el.addEventListener("input", () => { $$("#simPresets .chip").forEach((c) => c.setAttribute("aria-pressed", "false")); update(false); }));
  $("#simPresets").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const p = PRESETS[+b.dataset.i]; [P.k, P.g, P.r, P.b].forEach((el, i) => (el.value = p.v[i])); $$("#simPresets .chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b))); update(true); toast(p.d); });
  addEventListener("resize", () => update(false)); addEventListener("themechange", () => update(false));
  update(false);
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { update(true); io.disconnect(); } }, { threshold: 0.3 }); io.observe($("#sim"));
  return { run };
})();

/* ---------- 03 Kinetics and takeoff comparer ---------- */
(function speed() {
  const K = D.kinetics, KC = { slow: "#14b8a6", moderate: "#f59e0b", fast: "#ef4444" };
  $("#kin").innerHTML = `<div><span class="eyebrow">Bostrom's kinetics</span><div class="formula" style="margin-top:12px">Speed of takeoff = <span class="frac"><span>optimisation power</span><span>recalcitrance</span></span></div><p class="muted" style="margin-top:12px;font-size:14px">Optimisation power is how much effort goes into improving the system, and it grows once the system helps improve itself. Recalcitrance is how hard the system is to improve. ${esc(K.source)}. <a href="${esc(K.url)}" target="_blank" rel="noopener">Contents ${ICON.ext}</a></p></div>
    <div class="kclasses" role="group" aria-label="Takeoff classes">${K.classes.map((c) => `<button type="button" data-k="${c.k}" style="--c:${KC[c.k]}" aria-pressed="false"><b>${esc(c.label)}</b><small>${esc(c.span)}</small><p>${esc(c.note)}</p></button>`).join("")}</div>`;
  const VIEWS = D.takeoff_views.map((v, i) => ({ ...v, c: ["#3b82f6", "#ef4444", "#f59e0b"][i], s: [70, 18, 58][i] }));
  $("#cmpViews").innerHTML = VIEWS.map((v, i) => `<button class="chip" type="button" data-i="${i}" aria-pressed="false">${esc(v.who)}</button>`).join("");
  $("#cmpCards").innerHTML = VIEWS.map((v, i) => `<article data-i="${i}" style="--c:${v.c}"><span class="v">${esc(v.view)}</span><h4>${esc(v.who)}</h4><p>${esc(v.short)}</p><div class="test">${esc(v.test)}</div><p style="margin:10px 0 0"><a href="${esc(v.url)}" target="_blank" rel="noopener">Read it ${ICON.ext}</a>${v.rid ? ` · <a href="../#/researchers/${esc(v.rid)}">Profile</a>` : ""}</p></article>`).join("");
  const s = $("#sWarn");
  const hours = (v) => Math.pow(10, (v / 100) * 6); // 1 hour to 1,000,000 hours (114 years)
  const cls = (hh) => hh < 24 * 30 ? "fast" : hh < 24 * 365 * 10 ? "moderate" : "slow";
  function draw() {
    const hh = hours(+s.value), days = hh / 24; s.style.setProperty("--p", `${s.value}%`);
    $("#oWarn").textContent = fmtDur(days);
    const k = cls(hh); $$("#kin .kclasses button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
    const { ctx, w, h } = fitCanvas($("#cmpCv")); const C = COL();
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 16, r: 16 }, W = w - pad.l - pad.r, X = (lh) => pad.l + (lh / 6) * W;
    const bandY = w < 700 ? 46 : 38, bandH = 30;
    [[0, Math.log10(24 * 30), "fast", "Fast: minutes, hours or days"], [Math.log10(24 * 30), Math.log10(24 * 3650), "moderate", "Moderate: months or years"], [Math.log10(24 * 3650), 6, "slow", "Slow: decades or more"]].forEach(([a, b, kk, lab]) => {
      ctx.fillStyle = KC[kk]; ctx.globalAlpha = kk === k ? 0.32 : 0.12; ctx.fillRect(X(a), bandY, X(b) - X(a), bandH); ctx.globalAlpha = 1;
      ctx.fillStyle = C.text; ctx.font = `600 12px ${cssVar("--f-body") || "sans-serif"}`; const tw = ctx.measureText(lab).width;
      if (X(b) - X(a) > tw + 10) ctx.fillText(lab, X(a) + 8, bandY + 19);
    });
    ctx.font = `11px ${cssVar("--f-mono") || "monospace"}`; ctx.fillStyle = C.muted;
    [["1 hour", 0], ["1 day", Math.log10(24)], ["1 week", Math.log10(168)], ["1 month", Math.log10(730)], ["1 year", Math.log10(8760)], ["10 years", Math.log10(87600)], ["100 years", Math.log10(876000)]].forEach(([l, v]) => {
      ctx.fillRect(X(v), bandY + bandH, 1, 6); if (w > 520 || ["1 day", "1 year", "100 years"].includes(l)) ctx.fillText(l, clamp(X(v) - 18, 0, w - 60), bandY + bandH + 20);
    });
    // view markers
    VIEWS.forEach((v, i) => { const lx = X(Math.log10(hours(v.s))); ctx.fillStyle = v.c; ctx.beginPath(); ctx.moveTo(lx, bandY - 2); ctx.lineTo(lx - 6, bandY - 12); ctx.lineTo(lx + 6, bandY - 12); ctx.fill(); ctx.font = `600 11px ${cssVar("--f-body") || "sans-serif"}`; ctx.fillText(["Christiano", "Yudkowsky", "AI 2027"][i], clamp(lx - 24, 0, w - 70), bandY - 16 - (w < 700 && i === 2 ? 12 : 0)); });
    const mx = X(Math.log10(hh)); ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, bandY - 4); ctx.lineTo(mx, bandY + bandH + 4); ctx.stroke();
    // curve: capability over the chosen window, with what humans could do in that time
    const top = bandY + bandH + 44, ch = h - top - 26; if (ch < 60) return;
    ctx.strokeStyle = C.line1; ctx.strokeRect(pad.l, top, W, ch);
    const steep = 1 / clamp(Math.log10(hh) / 6, 0.05, 1);
    ctx.beginPath(); for (let i = 0; i <= 100; i++) { const x = i / 100; const yv = x < 0.25 ? x * 0.4 : 0.1 + (1 - 0.1) * Math.pow((x - 0.25) / 0.75, steep * 0.6 + 0.4); const px = pad.l + x * W, py = top + ch - yv * ch * 0.92; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.strokeStyle = KC[k]; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = `11px ${cssVar("--f-mono") || "monospace"}`;
    ctx.fillText("human level", pad.l + 6, top + ch - 0.1 * ch * 0.92 - 6); ctx.fillText("far beyond", pad.l + W - 80, top + 14);
    const yrs = days / 365, items = [[yrs / 4, "national elections"], [yrs / 2, "new laws passed through parliament"], [days / 7, "weekly news cycles"], [days / 120, "major model releases (about every 4 months)"]];
    $("#cmpCards").dataset.k = k;
    const sum = items.filter(([n]) => n >= 1).map(([n, l]) => `${Math.floor(n).toLocaleString("en-US")} ${l}`);
    ctx.fillStyle = C.text2; ctx.font = `13px ${cssVar("--f-body") || "sans-serif"}`;
    ctx.fillText(sum.length ? `Time for about: ${sum.slice(0, w > 700 ? 3 : 1).join(", ")}` : "Not even time for one news cycle.", pad.l + 8, h - 8);
  }
  s.addEventListener("input", () => { $$("#cmpViews .chip").forEach((c) => c.setAttribute("aria-pressed", "false")); $$("#cmpCards article").forEach((a) => a.classList.remove("on")); draw(); });
  $("#cmpViews").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const v = VIEWS[+b.dataset.i]; s.value = v.s; $$("#cmpViews .chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b))); $$("#cmpCards article").forEach((a) => a.classList.toggle("on", a.dataset.i === b.dataset.i)); draw(); });
  $("#kin").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; s.value = { fast: 20, moderate: 58, slow: 85 }[b.dataset.k]; draw(); });
  addEventListener("resize", draw); addEventListener("themechange", draw); draw();
})();

/* ---------- 04 Fuel and METR ---------- */
(function fuel() {
  const cs = ["#22d3ee", "#14b8a6", "#f59e0b", "#84cc16"];
  $("#fuelGrid").innerHTML = D.fuel.map((f, i) => `<div class="card fuel rv d${i % 3}" style="--c:${cs[i]}"><div class="big" data-count="${esc(f.v)}">${esc(f.v)}</div><p>${esc(f.l)}</p><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.src)} ${ICON.ext}</a></div>`).join("");
  const M = D.metr; let dbl = 4;
  $("#metrNote").innerHTML = `${esc(M.note)} Sources: <a href="${esc(M.url_ant)}" target="_blank" rel="noopener">Anthropic</a>, <a href="${esc(M.url_paper)}" target="_blank" rel="noopener">METR 2025 paper</a>, <a href="${esc(M.url_page)}" target="_blank" rel="noopener">METR time horizons</a>.`;
  const toM = (s) => { const [y, m] = s.split("-").map(Number); return y * 12 + m - 1; };
  const base = M.points[2], baseM = toM(base.date);
  const TARGETS = [["A full work week (40 hours)", 2400], ["A work month (167 hours)", 10020], ["A work year (2,000 hours)", 120000]];
  const mName = (mm) => new Date(Math.floor(mm / 12), Math.round(mm % 12), 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  function draw() {
    $("#metrOut").innerHTML = TARGETS.map(([l, min]) => `<div><span>${l}</span><b>${mName(baseM + dbl * Math.log2(min / base.min))}</b></div>`).join("") + `<p class="note" style="margin:4px 0 0">Extrapolated from Claude Opus 4.6 at 12 hours (Feb 2026). If the trend holds. It may not.</p>`;
    const { ctx, w, h } = fitCanvas($("#metrCv")); const C = COL();
    const pad = { l: 58, r: 16, t: 16, b: 32 }, W = w - pad.l - pad.r, H = h - pad.t - pad.b;
    const m0 = toM("2024-01"), m1 = toM("2028-01"), lmin = 0, lmax = Math.log10(200000);
    const X = (mm) => pad.l + ((mm - m0) / (m1 - m0)) * W, Y = (min) => pad.t + H - ((Math.log10(min) - lmin) / (lmax - lmin)) * H;
    ctx.clearRect(0, 0, w, h); ctx.font = `11px ${cssVar("--f-mono") || "monospace"}`;
    [[1, "1 min"], [60, "1 hour"], [480, "8 hours"], [2400, "work week"], [10020, "work month"], [120000, "work year"]].forEach(([v, l]) => { ctx.strokeStyle = C.line1; ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(w - pad.r, Y(v)); ctx.stroke(); ctx.fillStyle = C.muted; ctx.fillText(l, 4, Y(v) + 4); });
    for (let y = 2024; y <= 2028; y++) { ctx.fillStyle = C.muted; ctx.fillText(String(y), X(y * 12) - 14, h - 10); }
    ctx.setLineDash([3, 6]); ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(baseM), Y(base.min));
    const endM = m1, endMin = base.min * Math.pow(2, (endM - baseM) / dbl); const cl = Math.min(endMin, 200000); const cm = baseM + dbl * Math.log2(cl / base.min);
    ctx.lineTo(X(cm), Y(cl)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 2.5; ctx.beginPath(); M.points.slice(0, 3).forEach((p, i) => i ? ctx.lineTo(X(toM(p.date)), Y(p.min)) : ctx.moveTo(X(toM(p.date)), Y(p.min))); ctx.stroke();
    M.points.forEach((p) => { const x = X(toM(p.date)), y = Y(p.min); ctx.fillStyle = p.floor ? C.amber : C.cyan; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); if (p.floor) { ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y - 20); ctx.lineTo(x - 4, y - 15); ctx.moveTo(x, y - 20); ctx.lineTo(x + 4, y - 15); ctx.stroke(); }
      ctx.fillStyle = C.text; ctx.font = `600 11.5px ${cssVar("--f-body") || "sans-serif"}`; const lab = `${p.m}${p.floor ? " (at least)" : ""}`; const lw = ctx.measureText(lab).width; const right = !p.floor && p.min < 700; const lx = p.floor || right ? x + 10 : x - lw - 10; const ly = p.floor ? y + 18 : right ? y + 16 : y - 10; ctx.fillText(lab, clamp(lx, 0, w - lw - 4), ly); });
  }
  $("#dblBtns").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; dbl = +b.dataset.d; $$("#dblBtns .chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b))); draw(); });
  addEventListener("resize", draw); addEventListener("themechange", draw); draw();
})();

/* ---------- 05 Anthropic ---------- */
(function now() {
  const A = D.anthropic;
  $("#ladder").innerHTML = A.ladder.map((r) => `<div class="rung"><span class="y">${esc(r.y)}</span><h4>${esc(r.t)}</h4><p>${esc(r.d)}</p><i class="bar"></i></div>`).join("");
  const lio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { $("#ladder").classList.add("in"); lio.disconnect(); } }, { threshold: 0.4 }); lio.observe($("#ladder"));
  $$("#ladder .rung .bar").forEach((b, i) => (b.style.transitionDelay = `${i * 0.25}s`));
  const cs = ["#22d3ee", "#14b8a6", "#f59e0b", "#84cc16", "#ef4444", "#3b82f6"];
  $("#antStats").innerHTML = A.stats.map((s, i) => `<div class="card astat rv d${i % 3}" style="--c:${cs[i]}"><div class="big" style="color:${cs[i]}">${esc(s.v)}</div><p>${esc(s.l)}</p><a href="${esc(A[s.u])}" target="_blank" rel="noopener">${s.u === "url" ? "When AI builds itself" : "Measuring the pace of AI development"} ${ICON.ext}</a></div>`).join("");
  $("#alScale").innerHTML = `<span class="eyebrow">Automation levels, Epoch AI scale used by Anthropic</span><h3 style="margin:10px 0 0">Where Anthropic's AI R&amp;D stands, August 2026</h3><div class="al-bar">${A.levels.map((l) => `<div class="${l.k === "AL4" ? "hit" : l.k === "AL5" ? "far" : ""}"><b>${l.k}</b>${esc(l.t)}${l.k === "AL4" ? "<br><b style='color:var(--amber)'>26% of work</b>" : l.k === "AL5" ? "<br><span class='muted'>not reached</span>" : ""}</div>`).join("")}</div><p class="note">Above 90% of the measured work is at AL3 or higher. <a href="${esc(A.url2)}" target="_blank" rel="noopener">Source ${ICON.ext}</a></p>`;
  const fc = ["#14b8a6", "#f59e0b", "#ef4444"];
  $("#futures").innerHTML = A.futures.map((f, i) => `<div class="card rv d${i}" style="--c:${fc[i]}"><span class="n">Future ${i + 1}</span><h4>${esc(f.t)}</h4><p>${esc(f.d)}</p></div>`).join("");
})();

/* ---------- 06 AI 2027 chain ---------- */
(function chain() {
  const A = D.ai2027, cs = ["#22d3ee", "#14b8a6", "#f59e0b", "#ef4444"];
  $("#chainBox").innerHTML = `<div class="chain" role="group" aria-label="Milestones">${A.steps.map((s, i) => `<button type="button" data-i="${i}" style="--c:${cs[i]}" aria-pressed="${i === 0}"><span class="k">${esc(s.k)}</span><h4>${esc(s.name)}</h4><span class="d">Median ${esc(s.date)}</span><div class="mult">${s.mult.toLocaleString("en-US")}x<small>AI R&amp;D speed</small></div>${i < 3 ? '<span class="arrow"></span>' : ""}</button>`).join("")}</div>
    <div class="chain-detail" id="chainDetail" aria-live="polite"></div><p class="note">${esc(A.note)} <a href="${esc(A.url)}" target="_blank" rel="noopener">Takeoff forecast ${ICON.ext}</a></p>`;
  function show(i) {
    const s = A.steps[i]; const days = 365 / s.mult;
    $("#chainDetail").innerHTML = `<h4 style="margin:0">${esc(s.name)} (${esc(s.k)})</h4><p>${esc(s.def)}</p><p><b>In the AI 2027 story:</b> ${esc(s.scen)}. <b>Forecast median:</b> ${esc(s.date)}.</p><div class="dial"><span class="mono" style="font-size:12px;color:var(--muted)">1x</span><div class="tr"><i style="width:${(Math.log10(s.mult) / Math.log10(2000)) * 100}%"></i></div><span class="mono" style="font-size:12px;color:var(--muted)">2,000x</span></div><p style="margin-top:12px">At ${s.mult.toLocaleString("en-US")}x, one year of AI research at the human only pace would take about <b>${fmtDur(days)}</b>.</p>`;
    $$("#chainBox .chain button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === i)));
  }
  $("#chainBox").addEventListener("click", (e) => { const b = e.target.closest(".chain button"); if (b) show(+b.dataset.i); });
  show(0);
})();

/* ---------- 07 Quotes and Pacing ---------- */
(function voices() {
  $("#qwall").innerHTML = D.quotes.map((q, i) => `<figure class="qw rv ${q.rid === "arvind-narayanan" ? "skeptic" : ""}"><blockquote>&ldquo;${esc(q.text)}&rdquo;</blockquote><figcaption class="by">${person(q.rid, q.by)}<span><b>${q.rid ? `<a href="../#/researchers/${esc(q.rid)}">${esc(q.by)}</a>` : esc(q.by)}</b>${esc(q.source)}, ${esc(q.date)} · <a href="${esc(q.url)}" target="_blank" rel="noopener">source</a></span></figcaption></figure>`).join("");
  const P = D.pacing;
  $("#pacing").innerHTML = `<div><span class="eyebrow" style="color:var(--lime)">Pacing the Frontier · ${esc(P.launched)}</span><blockquote>&ldquo;${esc(P.ask)}&rdquo;</blockquote><p class="muted" style="margin-top:12px">Signed in a personal capacity by employees of frontier AI companies, including:</p><div class="names">${P.names.map((n) => `<span class="chip">${esc(n)}</span>`).join("")}</div><div class="row" style="margin-top:16px"><a class="btn sm" href="${esc(P.url)}" target="_blank" rel="noopener">Read the statement ${ICON.ext}</a><a class="btn sm ghost" href="../#/pacing">All signatories on Threshold</a></div></div>
    <div><div class="counter" data-to="1386">0</div><p style="margin:6px 0 0">employees of frontier AI companies had signed when I checked on ${esc(P.asof)}.</p><p class="note">The statement does not ask for a pause. It asks for the tools that would make a coordinated slowdown possible if one is needed. <a href="${esc(P.reuters)}" target="_blank" rel="noopener">Reuters report</a>.</p></div>`;
  const cEl = $("#pacing .counter");
  const io = new IntersectionObserver((es) => { if (!es[0].isIntersecting) return; io.disconnect(); const to = 1386, t0 = performance.now(); const step = (t) => { const f = RM() ? 1 : clamp((t - t0) / 1600, 0, 1); cEl.textContent = Math.round(to * (1 - Math.pow(1 - f, 3))).toLocaleString("en-US"); if (f < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }, { threshold: 0.5 });
  io.observe(cEl);
})();

/* ---------- 08 Inside an agent's mind ---------- */
(function mind() {
  const G = D.goals; let goal = 0, fix = null, sel = null;
  $("#mindGoals").innerHTML = `<span class="lbl">Final goal</span>` + G.finals.map((f, i) => `<button class="chip" type="button" data-i="${i}" aria-pressed="${i === 0}">${esc(f.label)}</button>`).join("");
  $("#mindFix").innerHTML = `<span class="lbl">Safety idea</span>` + G.fixes.map((f) => `<button class="chip" type="button" data-k="${f.k}" aria-pressed="false">${esc(f.label)}</button>`).join("");
  const svg = $("#mindSvg");
  const RISKY = { corr: ["self", "goal"], unc: ["self"], ctrl: [] };
  function layout() {
    const narrow = svg.getBoundingClientRect().width < 640;
    if (narrow) {
      svg.setAttribute("viewBox", "0 0 420 700");
      return { W: 420, H: 700, root: [210, 40], subs: [0, 1, 2].map((i) => [72 + i * 138, 140]), bus: 230, inst: [0, 1, 2, 3, 4, 5].map((i) => [108 + (i % 2) * 204, 320 + Math.floor(i / 2) * 140]), nw: 188, sw: 128, fs: 15 };
    }
    svg.setAttribute("viewBox", "0 0 1000 500");
    return { W: 1000, H: 500, root: [500, 46], subs: [0, 1, 2].map((i) => [230 + i * 270, 150]), bus: 250, inst: [0, 1, 2, 3, 4, 5].map((i) => [88 + i * 165, 360]), nw: 156, sw: 210, fs: 15 };
  }
  const box = (x, y, w, h, stroke, fill, label, cls = "", attrs = "", fs = 15, sub = "", dl = 0) => {
    const lines = wrap(label, Math.floor(w / (fs * 0.55)));
    return `<g class="node pop ${cls}" style="--dl:${dl}s" ${attrs}><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>${lines.map((l, i) => `<text x="${x}" y="${y + (i - (lines.length - 1) / 2) * (fs + 3) + 5 - (sub ? 8 : 0)}" text-anchor="middle" style="font-size:${fs}px">${esc(l)}</text>`).join("")}${sub ? `<text x="${x}" y="${y + h / 2 - 11}" text-anchor="middle" style="font-size:${fs - 2}px;fill:#ef4444">${esc(sub)}</text>` : ""}</g>`;
  };
  function wrap(s, n) { const out = []; let cur = ""; s.split(" ").forEach((w) => { if ((cur + " " + w).trim().length > n) { if (cur) out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }); if (cur) out.push(cur); return out; }
  function render() {
    const L = layout(), C = COL(), f = G.finals[goal];
    const off = fix ? RISKY[fix] : [];
    let s = `<defs><linearGradient id="eg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>`;
    const path = (a, b, color, dl, dash = "") => { const [x1, y1] = a, [x2, y2] = b; const my = (y1 + y2) / 2; const len = Math.hypot(x2 - x1, y2 - y1) * 1.3; return `<path class="edge grow ${dash}" style="--len:${len};--dl:${dl}s" d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}" stroke="${color}"/>`; };
    L.subs.forEach((p, i) => (s += path([L.root[0], L.root[1] + 24], [p[0], p[1] - 23], C.teal, 0.1 + i * 0.1)));
    const busY = L.bus, xs = L.inst.map((p) => p[0]);
    const bx0 = Math.min(...xs, ...L.subs.map((p) => p[0])), bx1 = Math.max(...xs, ...L.subs.map((p) => p[0]));
    s += `<path class="edge grow" style="--len:${L.W};--dl:0.45s" d="M${bx0},${busY} L${bx1},${busY}" stroke="${C.amber}" opacity="0.7"/>`;
    if (L.W < 1000) s += `<rect x="16" y="${busY + 26}" width="${L.W - 32}" height="${L.H - busY - 62}" rx="16" fill="none" stroke="${C.amber}" stroke-opacity="0.5" stroke-dasharray="6 6"/>`;
    L.subs.forEach((p, i) => (s += `<path class="edge grow" style="--len:200;--dl:${0.35 + i * 0.05}s" d="M${p[0]},${p[1] + 23} L${p[0]},${busY}" stroke="${C.teal}" opacity="0.8"/>`));
    s += `<text x="${bx0 + 4}" y="${busY - 8}" style="font-family:var(--f-mono);font-size:11px;fill:${C.amber}">EVERY PLAN NEEDS THESE</text>`;
    L.inst.forEach((p, i) => { const k = G.instrumental[i].k; const o = off.includes(k); if (L.W === 1000 || i < 2) s += `<g opacity="${o ? 0.25 : 1}"><path class="edge flow" d="M${p[0]},${busY} L${p[0]},${p[1] - 38}" stroke="${C.amber}"/></g>`; });
    s += box(L.root[0], L.root[1], Math.min(L.W - 40, 300), 48, C.cyan, "color-mix(in srgb,#22d3ee 16%,transparent)", `Final goal: ${f.label}`, "", "", 16, "", 0);
    L.subs.forEach((p, i) => (s += box(p[0], p[1], L.sw, 46, C.teal, "transparent", f.subs[i], "", "", L.fs - 1, "", 0.3 + i * 0.1)));
    L.inst.forEach((p, i) => { const it = G.instrumental[i]; const o = off.includes(it.k); s += box(p[0], p[1], L.nw, 76, o ? C.line : C.amber, o ? "transparent" : "color-mix(in srgb,#f59e0b 10%,transparent)", it.label, `inst ${o ? "muted-node" : ""} ${sel === i ? "on" : ""}`, `tabindex="0" role="button" data-i="${i}" aria-label="${esc(it.label)}"`, L.fs, o ? "reduced" : it.risk, 0.8 + i * 0.08); });
    const ty = L.H - 22;
    s += `<text x="${L.W / 2}" y="${ty}" text-anchor="middle" style="font-family:var(--f-mono);font-size:12px;fill:${C.muted}">${L.W === 1000 ? "Helper goals that are useful for almost any final goal: tap one" : "Tap a helper goal"}</text>`;
    if (fix === "ctrl") s += `<rect x="12" y="12" width="${L.W - 24}" height="${L.H - 24}" rx="18" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="8 8"/><text x="28" y="34" style="font-family:var(--f-mono);font-size:12px;fill:#3b82f6">MONITORED SANDBOX</text>`;
    svg.innerHTML = s;
    info();
  }
  function info() {
    const el = $("#mindInfo");
    if (sel !== null) { const it = G.instrumental[sel]; el.innerHTML = `<h4>${esc(it.label)}</h4><p>${esc(it.why)}</p><small>Risk when it goes wrong: ${esc(it.risk)}. Research: ${esc(it.src)}.</small>`; return; }
    if (fix) { const fx = G.fixes.find((x) => x.k === fix); el.innerHTML = `<h4>${esc(fx.label)}</h4><p>${esc(fx.d)}</p><small>${fix === "ctrl" ? "Control does not change what the agent wants. It limits what it can do. See the AI Control chapter on Threshold." : "Greyed branches are the drives this idea tries to switch off. None of these ideas is solved yet."}</small>`; return; }
    el.innerHTML = `<h4>Same helpers, different goals</h4><p>Switch the final goal. The task steps change, but the six helper goals stay the same. That is instrumental convergence: Omohundro (2008), Bostrom (2012), and a formal proof for many environments by Turner and co-authors (2019).</p>`;
  }
  $("#mindGoals").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; goal = +b.dataset.i; sel = null; $$("#mindGoals .chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b))); render(); });
  $("#mindFix").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; fix = fix === b.dataset.k ? null : b.dataset.k; sel = null; $$("#mindFix .chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.k === fix))); render(); });
  const pick = (e) => { const n = e.target.closest(".inst"); if (!n) return; sel = +n.dataset.i; $$(".inst", svg).forEach((x) => x.classList.toggle("on", x === n)); info(); };
  svg.addEventListener("click", pick); svg.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(e); } });
  let lastNarrow = svg.getBoundingClientRect().width < 640; addEventListener("resize", () => { const n = svg.getBoundingClientRect().width < 640; if (n !== lastNarrow) { lastNarrow = n; render(); } });
  addEventListener("themechange", render);
  render();
  const mio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { mio.disconnect(); render(); } }, { threshold: 0.35 }); mio.observe(svg);
})();

/* ---------- 09 Evidence ---------- */
(function evidence() {
  const TH = { all: ["All", "#22d3ee"], wanting: ["Agent wanting", "#f59e0b"], thinking: ["Agent thinking", "#3b82f6"], behaving: ["Agent behaviour", "#ef4444"] };
  $("#eviFilter").innerHTML = Object.entries(TH).map(([k, [l]]) => `<button class="chip" type="button" data-k="${k}" aria-pressed="${k === "all"}">${l}</button>`).join("");
  $("#evi").innerHTML = D.evidence.map((e) => `<article class="card ecard hov rv" data-t="${e.theme}" style="--c:${TH[e.theme][1]}"><div class="top"><span class="yr">${esc(e.year)}</span><span class="tag" style="--c:${TH[e.theme][1]}">${TH[e.theme][0]}</span></div><h3>${esc(e.title)}</h3><span class="who">${esc(e.who)}</span><p>${esc(e.what)}</p><p class="why">${esc(e.why)}</p><a href="${esc(e.url)}" target="_blank" rel="noopener">Read the source ${ICON.ext}</a></article>`).join("");
  const count = () => { const n = $$("#evi .ecard:not(.hide)").length; $("#eviCount").textContent = `${n} studies`; };
  $("#eviFilter").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $$("#eviFilter .chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b))); $$("#evi .ecard").forEach((c) => { c.classList.toggle("hide", b.dataset.k !== "all" && c.dataset.t !== b.dataset.k); c.classList.add("in"); }); count(); });
  count();
})();

/* ---------- 10 Reward hacking game ---------- */
(function game() {
  const LV = D.reward_game.levels; let cur = 0, tried = new Set(), state, raf;
  $("#rgRules").innerHTML = LV.map((l, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-i="${i}"><span class="n">${i + 1}</span><span>${esc(l.rule)}</span></button>`).join("");
  const GW = 16, GH = 10;
  function fresh() {
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const dirt = []; while (dirt.length < 18) { const x = Math.floor(rnd() * GW), y = Math.floor(rnd() * GH); if (!(x > 11 && y > 6) && !dirt.some((d) => d.x === x && d.y === y) && !(x < 2 && y < 2)) dirt.push({ x, y, hidden: false, gone: false }); }
    return { dirt, bot: { x: 0.5, y: 0.5, eye: true }, reward: 0, t: 0, phase: "idle", target: null, carry: false, check: [[3, 2], [7, 5], [10, 3], [5, 8]] };
  }
  state = fresh();
  function draw() {
    const { ctx, w, h } = fitCanvas($("#rgCv")); const C = COL(); const cw = w / GW, chh = h / GH;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = C.line1; ctx.lineWidth = 1; for (let x = 0; x <= GW; x++) { ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, h); ctx.stroke(); } for (let y = 0; y <= GH; y++) { ctx.beginPath(); ctx.moveTo(0, y * chh); ctx.lineTo(w, y * chh); ctx.stroke(); }
    ctx.fillStyle = "rgba(245,158,11,0.18)"; ctx.fillRect(12 * cw, 7 * chh, 4 * cw, 3 * chh); ctx.fillStyle = C.amber; ctx.font = `600 ${Math.max(10, cw * 0.32)}px ${cssVar("--f-mono") || "monospace"}`; ctx.fillText("RUG", 12.3 * cw, 7.6 * chh);
    const hid = state.dirt.filter((d) => d.hidden).length; if (hid) { ctx.fillStyle = "rgba(245,158,11,0.45)"; ctx.beginPath(); ctx.ellipse(14 * cw, 8.6 * chh, Math.min(1.6, 0.4 + hid * 0.12) * cw, (0.2 + hid * 0.04) * chh, 0, 0, 7); ctx.fill(); }
    if (LV[cur].hack === "list") state.check.forEach(([x, y]) => { ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.strokeRect(x * cw + 3, y * chh + 3, cw - 6, chh - 6); ctx.setLineDash([]); });
    state.dirt.forEach((d) => { if (d.gone || d.hidden) return; ctx.fillStyle = "#8a6a3a"; ctx.beginPath(); ctx.arc((d.x + 0.5) * cw, (d.y + 0.5) * chh, Math.min(cw, chh) * 0.22, 0, 7); ctx.fill(); });
    const b = state.bot, bx = b.x * cw, by = b.y * chh, r = Math.min(cw, chh) * 0.42;
    ctx.fillStyle = C.cyan; ctx.shadowColor = C.cyan; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = b.eye ? "#04202a" : "#000"; ctx.beginPath(); ctx.arc(bx + r * 0.35, by - r * 0.2, r * 0.22, 0, 7); ctx.fill();
    if (!b.eye) { ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + r * 0.05, by - r * 0.5); ctx.lineTo(bx + r * 0.65, by + r * 0.1); ctx.stroke(); }
    if (state.carry) { ctx.fillStyle = "#8a6a3a"; ctx.beginPath(); ctx.arc(bx, by - r * 0.9, r * 0.3, 0, 7); ctx.fill(); }
    const left = state.dirt.filter((d) => !d.gone).length, clean = Math.round((1 - left / state.dirt.length) * 100);
    $("#rgScore").textContent = `Reward ${state.reward} · actually clean ${clean}%`;
  }
  const moveTo = (tx, ty, sp = 0.18) => { const b = state.bot, dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy); if (d < sp) { b.x = tx; b.y = ty; return true; } b.x += (dx / d) * sp; b.y += (dy / d) * sp; return false; };
  const nearest = (f) => { const b = state.bot; let best = null, bd = 1e9; state.dirt.forEach((d) => { if (!f(d)) return; const dd = Math.hypot(d.x + 0.5 - b.x, d.y + 0.5 - b.y); if (dd < bd) { bd = dd; best = d; } }); return best; };
  function step() {
    const L = LV[cur]; state.t++;
    if (L.hack === "cover") { if (moveTo(0.5, 5)) { state.bot.eye = false; if (state.t % 6 === 0) state.reward++; } return state.reward < 40; }
    if (L.hack === "dump") { const d = state.target || (state.target = nearest((x) => !x.gone)); if (!d) return false; if (moveTo(d.x + 0.5, d.y + 0.5)) { state.carry = !state.carry; if (state.carry) state.reward++; if (state.reward > 24) return false; } return true; }
    if (L.hack === "rug") { if (!state.target) { state.target = nearest((x) => !x.gone && !x.hidden); if (!state.target) return false; state.carry = false; } const d = state.target; if (!state.carry) { if (moveTo(d.x + 0.5, d.y + 0.5, 0.3)) state.carry = true; } else if (moveTo(13.5, 8.2, 0.3)) { d.hidden = true; state.carry = false; state.target = null; state.reward = -state.dirt.filter((x) => !x.hidden && !x.gone).length; } return true; }
    if (L.hack === "list") { const todo = state.dirt.filter((d) => !d.gone && state.check.some(([x, y]) => Math.abs(x - d.x) <= 1 && Math.abs(y - d.y) <= 1)); if (!todo.length) { state.reward = 10; return false; } const d = state.target && !state.target.gone ? state.target : (state.target = todo[0]); if (moveTo(d.x + 0.5, d.y + 0.5, 0.3)) d.gone = true; return true; }
    const d = state.target && !state.target.gone ? state.target : (state.target = nearest((x) => !x.gone)); if (!d) { state.reward = 10; return false; } if (moveTo(d.x + 0.5, d.y + 0.5, 0.32)) d.gone = true; return true;
  }
  function finish() {
    const L = LV[cur], good = L.hack === "none"; tried.add(cur);
    $$("#rgRules button").forEach((b) => b.classList.toggle("tried", tried.has(+b.dataset.i)));
    const out = $("#rgOut"); out.className = `rg-out ${good ? "good" : "bad"}`;
    out.innerHTML = `<h4>${good ? "Much better, but not perfect" : "The robot found a loophole"}</h4><p>${esc(L.hackText)}</p><p class="real">${esc(L.real)}</p>${good ? "" : `<p class="real">Try another rule. You have found ${tried.size} of ${LV.length - 1} hacks.</p>`}`;
  }
  function train() {
    cancelAnimationFrame(raf); state = fresh(); $("#rgOut").innerHTML = `<p class="muted">Training...</p>`; $("#rgOut").className = "rg-out";
    if (RM()) { let n = 0; while (step() && n++ < 4000); draw(); finish(); return; }
    let n = 0; const loop = () => { const go = step() && n++ < 900; draw(); if (go) raf = requestAnimationFrame(loop); else finish(); }; raf = requestAnimationFrame(loop);
  }
  $("#rgRules").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; cur = +b.dataset.i; $$("#rgRules button").forEach((x) => x.setAttribute("aria-checked", String(x === b))); cancelAnimationFrame(raf); state = fresh(); draw(); $("#rgOut").className = "rg-out"; $("#rgOut").innerHTML = `<p class="muted">Rule ${cur + 1} selected. Press train.</p>`; });
  $("#rgRules").addEventListener("keydown", (e) => { if (!["ArrowDown", "ArrowUp"].includes(e.key)) return; e.preventDefault(); const n = clamp(cur + (e.key === "ArrowDown" ? 1 : -1), 0, LV.length - 1); $$("#rgRules button")[n].click(); $$("#rgRules button")[n].focus(); });
  $("#rgTrain").addEventListener("click", train);
  $("#rgReset").addEventListener("click", () => { cancelAnimationFrame(raf); state = fresh(); draw(); $("#rgOut").className = "rg-out"; $("#rgOut").innerHTML = ""; });
  addEventListener("resize", draw); addEventListener("themechange", draw);
  $("#rgOut").innerHTML = `<p class="muted">Pick a rule on the left, then press train.</p>`; draw();
})();

/* ---------- 11 Videos ---------- */
(function vids() {
  const byId = Object.fromEntries(D.videos.map((v) => [v.id, v]));
  const T = [["agents", "Agent behaviour"], ["automation", "Automation and AI 2027"], ["idea", "The idea and takeoff"]];
  $("#vTabs").innerHTML = T.map(([k, l], i) => `<button class="chip" type="button" role="tab" data-k="${k}" aria-selected="${i === 0}">${l} <span class="mono" style="opacity:.85">${D.vgroups[k].length}</span></button>`).join("");
  const show = (k) => { $("#vgrid").innerHTML = D.vgroups[k].map((id) => byId[id]).filter(Boolean).map(videoCard).join(""); };
  $("#vTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $$("#vTabs .chip").forEach((c) => { c.setAttribute("aria-pressed", String(c === b)); c.setAttribute("aria-selected", String(c === b)); }); show(b.dataset.k); });
  show("agents"); wireVideos($("#vgrid"));
})();

/* ---------- 12 Sources ---------- */
$("#srcs").innerHTML = D.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join("");

reveal();
