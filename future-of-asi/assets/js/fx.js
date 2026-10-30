/* Motion graphics: the neural horizon hero and the particle morph used by the scroll story. */
import { RM, clamp, lerp } from "./util.js";

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function hexToRgb(h) { h = String(h || "").trim(); const m = h.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i); if (m) return [+m[1], +m[2], +m[3]]; h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); const n = parseInt(h, 16); return /^[0-9a-f]{6}$/i.test(h) && !isNaN(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [34, 211, 238]; }
function sizeCanvas(c) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const w = c.clientWidth, h = c.clientHeight;
  c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
  const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
function loop(canvas, draw) {
  let raf = 0, vis = true, t0 = performance.now(), alive = true;
  const io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis && !raf && alive) raf = requestAnimationFrame(tick); }, { threshold: 0 });
  io.observe(canvas);
  function tick(t) { raf = 0; if (!alive) return; draw((t - t0) / 1000); if (vis && !document.hidden && !RM()) raf = requestAnimationFrame(tick); }
  const onVis = () => { if (!document.hidden && vis && !raf && alive) raf = requestAnimationFrame(tick); };
  document.addEventListener("visibilitychange", onVis);
  raf = requestAnimationFrame(tick);
  return { stop() { alive = false; cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener("visibilitychange", onVis); }, kick() { if (!raf && alive) raf = requestAnimationFrame(tick); } };
}

/* Hero: a field of ground particles rushing toward a glowing horizon, with a thinking network in the sky */
export function neuralHorizon(canvas, getProgress = () => 0) {
  let S = sizeCanvas(canvas);
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  const ground = [];
  for (let i = 0; i < 1500; i++) ground.push({ x: Math.random() * 2 - 1, z: Math.random(), s: Math.random() });
  const nodes = [];
  for (let i = 0; i < 80; i++) nodes.push({ x: Math.random(), y: Math.random() * 0.55, vx: (Math.random() - 0.5) * 0.012, vy: (Math.random() - 0.5) * 0.008, r: 0.6 + Math.random() * 1.6, p: Math.random() * 6.28 });
  const onMove = (e) => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; };
  const onResize = () => { S = sizeCanvas(canvas); L.kick(); };
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("resize", onResize);
  let colA = hexToRgb(css("--accent") || "#22d3ee");
  const onTheme = () => { colA = hexToRgb(css("--accent") || "#22d3ee"); L.kick(); };
  addEventListener("themechange", onTheme);
  const amber = [245, 158, 11], red = [239, 68, 68];
  const L = loop(canvas, (t) => {
    const { ctx, w, h } = S;
    mx = lerp(mx, tmx, 0.04); my = lerp(my, tmy, 0.04);
    const prog = clamp(getProgress(), 0, 1) || 0; /* a page with no scroll room reports NaN */
    const hy = h * (0.78 + my * 0.03);
    const cx = w * (0.5 - mx * 0.06);
    ctx.clearRect(0, 0, w, h);
    // sky glow
    const warm = prog;
    const glowC = [lerp(colA[0], amber[0], warm * 0.6), lerp(colA[1], amber[1], warm * 0.6), lerp(colA[2], amber[2], warm * 0.6)].map(Math.round);
    let g = ctx.createRadialGradient(cx, hy, 0, cx, hy, Math.max(w, h) * 0.6);
    g.addColorStop(0, `rgba(${glowC},0.38)`); g.addColorStop(0.25, `rgba(${glowC},0.10)`); g.addColorStop(1, "rgba(7,17,31,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // sun
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.8);
    g = ctx.createRadialGradient(cx, hy, 0, cx, hy, 90 + pulse * 18);
    g.addColorStop(0, "rgba(254,243,199,0.95)"); g.addColorStop(0.18, "rgba(245,158,11,0.55)"); g.addColorStop(1, "rgba(245,158,11,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, hy, 120, 0, Math.PI * 2); ctx.fill();
    // horizon line
    const lg = ctx.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, `rgba(${colA},0)`); lg.addColorStop(0.5, `rgba(${colA},0.95)`); lg.addColorStop(1, `rgba(${colA},0)`);
    ctx.fillStyle = lg; ctx.fillRect(0, hy - 0.75, w, 1.5);
    // ground particles in perspective
    const speed = 0.05 + prog * 0.12;
    for (const p of ground) {
      p.z -= speed * 0.016 * (0.6 + p.s);
      if (p.z <= 0.02) { p.z = 1; p.x = Math.random() * 2 - 1; }
      const k = 1 / p.z;
      const sx = cx + p.x * w * 0.28 * k;
      const sy = hy + (h - hy) * 0.12 * k;
      if (sy > h + 4 || sx < -10 || sx > w + 10) continue;
      const a = clamp((1 - p.z) * 0.9, 0, 0.9);
      const r = clamp(0.4 * k, 0.3, 2.4);
      ctx.fillStyle = `rgba(${colA},${a * 0.8})`;
      ctx.fillRect(sx, sy, r, r);
    }
    // sky network
    const linkD = 0.11 + prog * 0.05;
    for (const n of nodes) { n.x += n.vx * 0.016; n.y += n.vy * 0.016; if (n.x < 0 || n.x > 1) n.vx *= -1; if (n.y < 0.02 || n.y > 0.56) n.vy *= -1; }
    ctx.lineWidth = 0.6;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]; const dx = a.x - b.x, dy = (a.y - b.y) * 1.4; const d = Math.hypot(dx, dy);
        if (d < linkD) {
          const al = (1 - d / linkD) * 0.35;
          const c = prog > 0.66 ? [lerp(colA[0], red[0], (prog - 0.66) * 2), lerp(colA[1], red[1], (prog - 0.66) * 2), lerp(colA[2], red[2], (prog - 0.66) * 2)].map(Math.round) : colA;
          ctx.strokeStyle = `rgba(${c},${al})`;
          ctx.beginPath(); ctx.moveTo(a.x * w + mx * -30, a.y * h + my * -20); ctx.lineTo(b.x * w + mx * -30, b.y * h + my * -20); ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      const tw = 0.5 + 0.5 * Math.sin(t * 1.6 + n.p);
      ctx.fillStyle = `rgba(230,240,250,${0.35 + tw * 0.5})`;
      ctx.beginPath(); ctx.arc(n.x * w + mx * -30, n.y * h + my * -20, n.r * (0.8 + tw * 0.4), 0, Math.PI * 2); ctx.fill();
    }
  });
  return () => { L.stop(); removeEventListener("pointermove", onMove); removeEventListener("resize", onResize); removeEventListener("themechange", onTheme); };
}

/* Particle morph between five shapes, driven by a progress value 0..4 */
export function morphField(canvas, getStage) {
  let S = sizeCanvas(canvas);
  const N = window.innerWidth < 700 ? 650 : 1100;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const shapes = [];
  // 0 a single thought: ring
  shapes.push(Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2; const r = 0.16 + rnd(-0.012, 0.012); return [Math.cos(a) * r, Math.sin(a) * r, 0]; }));
  // 1 a machine: lattice
  shapes.push(Array.from({ length: N }, (_, i) => { const c = Math.ceil(Math.sqrt(N)); const x = (i % c) / (c - 1) - 0.5, y = Math.floor(i / c) / (c - 1) - 0.5; return [x * 0.62, y * 0.62, 0]; }));
  // 2 a neural network: layers
  const layers = [6, 10, 10, 6, 3];
  const centers = []; layers.forEach((n, li) => { for (let k = 0; k < n; k++) centers.push([(li / (layers.length - 1) - 0.5) * 0.9, (k / (n - 1 || 1) - 0.5) * 0.7 * (n / 10)]); });
  shapes.push(Array.from({ length: N }, (_, i) => { const c = centers[i % centers.length]; const a = Math.random() * 6.28, r = Math.random() * 0.018; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 0]; }));
  // 3 everywhere at once: globe
  shapes.push(Array.from({ length: N }, (_, i) => { const y = 1 - (i / (N - 1)) * 2; const r = Math.sqrt(1 - y * y); const th = i * 2.399963; return [Math.cos(th) * r * 0.34, y * 0.34, Math.sin(th) * r * 0.34]; }));
  // 4 the threshold: doorway arch and horizon
  shapes.push(Array.from({ length: N }, (_, i) => {
    const u = i / N;
    if (u < 0.36) { const t = u / 0.36; return [rnd(-0.75, 0.75), 0.22 + rnd(-0.004, 0.004), 0]; }
    const t = (u - 0.36) / 0.64; const per = 2 * 0.36 + Math.PI * 0.16; let d = t * per;
    if (d < 0.36) return [-0.16 + rnd(-0.004, 0.004), 0.22 - d, 0]; d -= 0.36;
    if (d < Math.PI * 0.16) { const a = Math.PI - d / 0.16; return [Math.cos(a) * 0.16, -0.14 - Math.sin(a) * 0.16, 0]; } d -= Math.PI * 0.16;
    return [0.16 + rnd(-0.004, 0.004), -0.14 + d, 0];
  }));
  const P = Array.from({ length: N }, (_, i) => ({ x: shapes[0][i][0], y: shapes[0][i][1], j: Math.random() }));
  const cols = [[34, 211, 238], [20, 184, 166], [59, 130, 246], [245, 158, 11], [34, 211, 238]];
  const onResize = () => { S = sizeCanvas(canvas); };
  addEventListener("resize", onResize);
  const L = loop(canvas, (t) => {
    const { ctx, w, h } = S;
    const st = clamp(getStage(), 0, 4) || 0;
    const a = Math.floor(st), b = Math.min(4, a + 1), k = st - a;
    const e = k * k * (3 - 2 * k);
    const scale = Math.min(w, h) * (w < 760 ? 1.15 : 1.0);
    const side = (i) => (w < 760 ? 0.5 : i % 2 === 0 ? 0.68 : 0.32);
    const cxp = w * lerp(side(a), side(b), e);
    const rot = t * 0.25;
    ctx.clearRect(0, 0, w, h);
    const ca = cols[a], cb = cols[b];
    const col = [lerp(ca[0], cb[0], e), lerp(ca[1], cb[1], e), lerp(ca[2], cb[2], e)].map(Math.round);
    const g = ctx.createRadialGradient(cxp, h / 2, 0, cxp, h / 2, scale * 0.5);
    g.addColorStop(0, `rgba(${col},0.10)`); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < N; i++) {
      const A = shapes[a][i], B = shapes[b][i];
      let x = lerp(A[0], B[0], e), y = lerp(A[1], B[1], e), z = lerp(A[2], B[2], e);
      if (a === 3 || b === 3) { const wgt = a === 3 ? 1 - e : e; const cr = Math.cos(rot), sr = Math.sin(rot); const rx = x * cr - z * sr, rz = x * sr + z * cr; x = lerp(x, rx, wgt); z = lerp(z, rz, wgt); }
      const p = P[i];
      const wob = RM() ? 0 : 0.004;
      const f = RM() ? 1 : 0.14; p.x = lerp(p.x, x + Math.sin(t * 1.3 + i) * wob, f); p.y = lerp(p.y, y + Math.cos(t * 1.1 + i * 0.7) * wob, f);
      const depth = 1 + z * 1.2;
      const sx = cxp + p.x * scale * depth * 0.9, sy = h / 2 + p.y * scale * depth * 0.9;
      const r = (0.9 + p.j * 1.2) * depth;
      ctx.fillStyle = `rgba(${col},${0.35 + 0.55 * clamp(depth - 0.6, 0, 1)})`;
      ctx.fillRect(sx, sy, r, r);
    }
    if (st > 3.5) {
      const al = (st - 3.5) * 2;
      const sg = ctx.createRadialGradient(cxp, h / 2 + 0.22 * scale * 0.9, 0, cxp, h / 2 + 0.22 * scale * 0.9, 80);
      sg.addColorStop(0, `rgba(254,243,199,${0.9 * al})`); sg.addColorStop(0.3, `rgba(245,158,11,${0.4 * al})`); sg.addColorStop(1, "rgba(245,158,11,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
    }
  });
  const stop = () => { L.stop(); removeEventListener("resize", onResize); };
  stop.kick = () => L.kick();
  return stop;
}
