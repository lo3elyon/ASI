/* AI Safety Full Episodes · backgrounds: a picker like Themes. Animated (aurora, mesh gradient, starfield, circuit lines),
 * static (subtle grid, noise gradient, four photos), looping ambient videos and your own image. Controls: intensity,
 * blur, speed, hue shift and "match theme accent". Everything is stored locally; photos and videos live in this repo
 * (assets/bg/), so the strict CSP needs no new hosts. Videos load only when picked, pause when the tab is hidden and,
 * by default, stay off with reduced motion, data saver or on a phone (a still frame shows instead). Built by Aniruddha Adak. */
(function (A) {
  "use strict";
  const { $, $$, esc } = A;
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem("asfe:" + k); if (v === null) localStorage.removeItem("asfe:" + k); else localStorage.setItem("asfe:" + k, v); } catch (e) { return null; } };
  const root = () => document.documentElement;
  const BGS = [
    { id: "aurora", name: "Aurora", kind: "anim", note: "Default · soft drifting light" },
    { id: "mesh", name: "Mesh gradient", kind: "anim", note: "Slow colour mesh in your accent" },
    { id: "stars", name: "Starfield", kind: "anim", note: "Light canvas particles" },
    { id: "circuit", name: "Circuit lines", kind: "anim", note: "Traces that pulse now and then" },
    { id: "borealis", name: "Northern lights", kind: "anim", fx: "cv", note: "Curtains of light that sway · palette, density, speed" },
    { id: "flow", name: "Flowing gradient", kind: "anim", fx: "css", note: "A slow river of colour in your palette" },
    { id: "constellation", name: "Constellation", kind: "anim", fx: "cv", note: "Linked particles that reach for your cursor" },
    { id: "particles", name: "Particles", kind: "anim", fx: "cv", note: "Floating dust that moves away from the cursor" },
    { id: "waves", name: "Waves", kind: "anim", fx: "cv", note: "Layered sine waves rolling along the bottom" },
    { id: "bokeh", name: "Bokeh", kind: "anim", fx: "cv", note: "Soft out-of-focus lights drifting" },
    { id: "matrix", name: "Matrix rain", kind: "anim", fx: "cv", note: "Falling glyphs in your palette" },
    { id: "warp", name: "Starfield warp", kind: "anim", fx: "cv", note: "Fly through the stars · the cursor steers" },
    { id: "blobs", name: "Liquid blobs", kind: "anim", fx: "css", note: "Lava-lamp blobs that merge and split" },
    { id: "geo", name: "Geometric", kind: "anim", fx: "css", note: "Hexagon pattern with a slow shimmer" },
    { id: "spotlight", name: "Spotlight", kind: "anim", fx: "css", note: "A soft light that follows your cursor" },
    { id: "grid", name: "Subtle grid", kind: "static", note: "Blueprint lines, fades out" },
    { id: "noise", name: "Noise gradient", kind: "static", note: "Grainy two-tone gradient" },
    { id: "img-nebula", name: "Nebula", kind: "image", src: "assets/bg/nebula.jpg", thumb: "assets/bg/thumbs/nebula.jpg", credit: "Scott Lord", url: "https://unsplash.com/photos/qV2xKnrSY6A", lic: "Unsplash License" },
    { id: "img-mountains", name: "Night mountains", kind: "image", src: "assets/bg/mountains.jpg", thumb: "assets/bg/thumbs/mountains.jpg", credit: "vu anh", url: "https://unsplash.com/photos/FSQPB2tynko", lic: "Unsplash License" },
    { id: "img-waves", name: "Blue waves", kind: "image", src: "assets/bg/waves.jpg", thumb: "assets/bg/thumbs/waves.jpg", credit: "Unsplash contributor (photo f4SwwVbM_IY)", url: "https://unsplash.com/photos/f4SwwVbM_IY", lic: "Unsplash License" },
    { id: "img-peaks", name: "Annapurna stars", kind: "image", src: "assets/bg/peaks.jpg", thumb: "assets/bg/thumbs/peaks.jpg", credit: "Daniel Leone", url: "https://unsplash.com/photos/v7daTKlZzaw", lic: "Unsplash License" },
    { id: "img-aurora", name: "Alaska aurora", kind: "image", src: "assets/bg/aurora-alaska.jpg", thumb: "assets/bg/thumbs/aurora-alaska.jpg", credit: "U.S. Air Force photo by Senior Airman Joshua Strang (Wikimedia Commons)", url: "https://commons.wikimedia.org/wiki/File:Aurora_borealis_over_Eielson_Air_Force_Base,_Alaska.jpg", lic: "Public domain" },
    { id: "img-abisko", name: "Abisko lights", kind: "image", src: "assets/bg/abisko.jpg", thumb: "assets/bg/thumbs/abisko.jpg", credit: "Pavel.shyshkouski (Wikimedia Commons)", url: "https://commons.wikimedia.org/wiki/File:Aurora_in_Abisko_near_Tornetr%C3%A4sk.jpg", lic: "CC BY-SA 4.0" },
    { id: "img-ogwen", name: "Milky Way lake", kind: "image", src: "assets/bg/ogwen.jpg", thumb: "assets/bg/thumbs/ogwen.jpg", credit: "John Badham (Wikimedia Commons)", url: "https://commons.wikimedia.org/wiki/File:Llyn_Ogwen_Milky_Way.jpg", lic: "CC BY-SA 4.0" },
    { id: "img-church", name: "Aurora (painting)", kind: "image", src: "assets/bg/church.jpg", thumb: "assets/bg/thumbs/church.jpg", credit: "Frederic Edwin Church, Aurora Borealis, 1865 (Smithsonian American Art Museum, via Wikimedia Commons)", url: "https://commons.wikimedia.org/wiki/File:Frederic_Edwin_Church_-_Aurora_Borealis_-_Google_Art_Project.jpg", lic: "Public domain" },
    { id: "vid-neon", name: "Neon particles", kind: "video", src: "assets/bg/neon.mp4", thumb: "assets/bg/thumbs/neon.jpg", poster: "assets/bg/neon.jpg", credit: "Nicola Narracci", url: "https://www.pexels.com/video/abstract-neon-particles-in-dark-space-29765099/", lic: "Pexels License" },
    { id: "vid-waves", name: "Swirling waves", kind: "video", src: "assets/bg/swirl.mp4", thumb: "assets/bg/thumbs/swirl.jpg", poster: "assets/bg/swirl.jpg", credit: "Colin Jones", url: "https://www.pexels.com/video/abstract-blue-swirling-waves-background-loop-33884408/", lic: "Pexels License" },
    { id: "vid-fluid", name: "Liquid fluid", kind: "video", src: "assets/bg/fluid.mp4", thumb: "assets/bg/thumbs/fluid.jpg", poster: "assets/bg/fluid.jpg", credit: "Chandresh Uike", url: "https://www.pexels.com/video/abstract-fluid-motion-background-loop-34127871/", lic: "Pexels License" },
    { id: "custom", name: "My image", kind: "custom", note: "Upload your own (stays in this browser)" },
    { id: "none", name: "Plain", kind: "static", note: "Just the theme colour" },
  ];
  const byId = new Map(BGS.map((b) => [b.id, b]));
  const DEF = { op: 100, blur: 0, speed: 1, hue: 0, match: false, videoAlways: false, density: 1, vig: 0, grain: 0, palette: "theme", mouse: true, parallax: false, low: false };
  const PALETTES = { theme: null, aurora: ["#22d3ee", "#34d399", "#a78bfa"], ocean: ["#38bdf8", "#14b8a6", "#6366f1"], sunset: ["#fb7185", "#f59e0b", "#f472b6"], neon: ["#e879f9", "#22d3ee", "#a3e635"], ember: ["#f97316", "#ef4444", "#facc15"], forest: ["#4ade80", "#a3e635", "#2dd4bf"], mono: ["#cbd5e1", "#94a3b8", "#e2e8f0"] };
  const PAL_NAMES = { theme: "Theme accent", aurora: "Aurora", ocean: "Ocean", sunset: "Sunset", neon: "Neon", ember: "Ember", forest: "Forest", mono: "Monochrome" };
  const MAX_UPLOAD = 6 * 1024 * 1024, MAX_DATAURL = 1.6 * 1024 * 1024;
  const DATARX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const clampN = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  function opts() {
    let o = {}; try { o = JSON.parse(LS("bgOpts") || "{}") || {}; } catch (e) { o = {}; }
    return { op: clampN(o.op, 10, 100, DEF.op), blur: clampN(o.blur, 0, 30, DEF.blur), speed: clampN(o.speed, 0.25, 3, DEF.speed), hue: clampN(o.hue, 0, 360, DEF.hue), match: !!o.match, videoAlways: !!o.videoAlways,
      density: clampN(o.density, 0.25, 2, DEF.density), vig: clampN(o.vig, 0, 100, DEF.vig), grain: clampN(o.grain, 0, 100, DEF.grain), palette: Object.prototype.hasOwnProperty.call(PALETTES, o.palette) ? o.palette : "theme",
      mouse: o.mouse !== false, parallax: !!o.parallax, low: !!o.low || saveData() };
  }
  const saveOpts = (o) => LS("bgOpts", JSON.stringify(o));
  const current = () => { const id = LS("bg"); return id && byId.has(id) ? id : "aurora"; };
  const customURL = () => { const d = LS("bgCustom"); return d && DATARX.test(d) && d.length <= MAX_DATAURL ? d : null; };
  const reduced = () => root().classList.contains("rm") || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const saveData = () => !!(navigator.connection && navigator.connection.saveData);
  const mobile = () => (window.matchMedia && window.matchMedia("(max-width: 700px), (pointer: coarse)").matches) || false;
  /* why a video would stay a still frame (null = it may play) */
  function videoBlock() { if (opts().videoAlways) return null; if (reduced()) return "reduced motion is on"; if (saveData()) return "data saver is on"; if (mobile()) return "this is a phone or touch screen"; return null; }

  const playSafe = (v) => { try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
  /* ---------------------------------------------------------------- the layer */
  let layer = null, raf = 0, vid = null;
  function host() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement("div"); layer.id = "bgfx"; layer.className = "bgfx"; layer.setAttribute("aria-hidden", "true");
    const au = document.querySelector(".aurora");
    if (au && au.parentNode) au.parentNode.insertBefore(layer, au.nextSibling); else document.body.prepend(layer);
    return layer;
  }
  function stopAnim() { cancelAnimationFrame(raf); raf = 0; if (vid) { try { vid.pause(); } catch (e) {} vid.removeAttribute("src"); try { vid.load(); } catch (e) {} vid = null; } }
  function paintVars() {
    const o = opts(), d = root();
    d.style.setProperty("--bgfx-op", String(o.op / 100));
    d.style.setProperty("--bgfx-blur", o.blur + "px");
    d.style.setProperty("--bgfx-speed", String(o.speed));
    d.style.setProperty("--bgfx-hue", o.hue + "deg");
    d.classList.toggle("bg-match", o.match);
    d.style.setProperty("--bgfx-vig", String(o.vig / 100));
    d.style.setProperty("--bgfx-grain", String(o.grain / 100));
    d.classList.toggle("bg-parallax", o.parallax && !reduced() && !o.low);
    const pc = palette();
    pc.forEach((c, i) => d.style.setProperty("--c" + (i + 1), c));
  }
  /* the active palette as three colours (theme = your accent pair) */
  function palette() {
    const p = PALETTES[opts().palette];
    if (p) return p;
    const cs = getComputedStyle(root());
    const a = (cs.getPropertyValue("--amber") || "").trim() || "#f59e0b", t = (cs.getPropertyValue("--teal") || "").trim() || "#14b8a6";
    return [a, t, "#38bdf8"];
  }
  function apply(id, o) {
    o = o || {};
    if (!byId.has(id)) id = "aurora";
    if (id === "custom" && !customURL()) id = "aurora";
    const b = byId.get(id);
    stopAnim();
    root().setAttribute("data-bg", id);
    if (!o.preview) LS("bg", id === "aurora" ? null : id);
    paintVars();
    const L = host();
    L.className = "bgfx bgfx--" + (b.kind === "image" || b.kind === "custom" ? "img" : b.kind === "video" ? "vid" : id);
    L.innerHTML = "";
    if (b.kind === "image") L.innerHTML = `<div class="bgfx__l bgfx__img" style="background-image:url('${esc(b.src)}')"></div><div class="bgfx__tint"></div>`;
    else if (b.kind === "custom") { const u = customURL(); L.innerHTML = `<div class="bgfx__l bgfx__img"></div><div class="bgfx__tint"></div>`; L.firstChild.style.backgroundImage = `url("${u}")`; }
    else if (b.kind === "video") {
      const why = videoBlock();
      L.innerHTML = `<div class="bgfx__l bgfx__img bgfx__poster" style="background-image:url('${esc(b.poster)}')"></div><div class="bgfx__tint"></div>`;
      if (!why) {
        vid = document.createElement("video");
        vid.className = "bgfx__l bgfx__vid"; vid.muted = true; vid.defaultMuted = true; vid.loop = true; vid.playsInline = true; vid.autoplay = true; vid.preload = "none";
        vid.setAttribute("muted", ""); vid.setAttribute("playsinline", ""); vid.setAttribute("disablepictureinpicture", ""); vid.setAttribute("tabindex", "-1");
        vid.poster = b.poster; vid.src = b.src; vid.playbackRate = Math.min(2, Math.max(0.5, opts().speed));
        L.insertBefore(vid, L.querySelector(".bgfx__tint"));
        if (!document.hidden) playSafe(vid);
      }
    } else if (id === "mesh") L.innerHTML = `<div class="bgfx__l"><i></i><i></i><i></i><i></i></div>`;
    else if (id === "grid") L.innerHTML = `<div class="bgfx__l"></div>`;
    else if (id === "noise") L.innerHTML = `<div class="bgfx__l"></div><div class="bgfx__grain"></div>`;
    else if (id === "circuit") L.innerHTML = `<div class="bgfx__l">${circuitSVG()}</div>`;
    else if (id === "stars") { L.innerHTML = `<canvas class="bgfx__l bgfx__cv"></canvas>`; stars(L.firstChild); }
    else if (ENG[id]) { L.innerHTML = `<canvas class="bgfx__l bgfx__cv"></canvas>`; runCanvas(L.firstChild, ENG[id]); }
    else if (id === "flow") L.innerHTML = `<div class="bgfx__l"></div>`;
    else if (id === "blobs") L.innerHTML = `<div class="bgfx__l"><i></i><i></i><i></i><i></i><i></i><i></i></div>`;
    else if (id === "geo") L.innerHTML = `<div class="bgfx__l"></div><div class="bgfx__l bgfx__geo2"></div>`;
    else if (id === "spotlight") L.innerHTML = `<div class="bgfx__l"></div><div class="bgfx__spot"></div>`;
    if (id !== "none") L.insertAdjacentHTML("beforeend", `<div class="bgfx__vig"></div><div class="bgfx__grain2"></div>`);
    $$("[data-bgset]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.bgset === id)));
    $$("[data-bgnote]").forEach((n) => (n.innerHTML = noteFor(id)));
    return b;
  }
  /* ---------------------------------------------------------------- canvas engines (40 fps, 20 in low-power; paused when the
   * tab is hidden; drawn once with reduced motion). Each engine: init(W,H,o) → state, draw(ctx,st,dt,W,H,o,M,cols). */
  const M = { x: -1e4, y: -1e4, on: false, nx: 0, ny: 0 };
  window.addEventListener("pointermove", (ev) => {
    M.x = ev.clientX; M.y = ev.clientY; M.on = true;
    M.nx = ev.clientX / Math.max(1, innerWidth) - 0.5; M.ny = ev.clientY / Math.max(1, innerHeight) - 0.5;
    const d = root();
    if (d.classList.contains("bg-parallax") || d.getAttribute("data-bg") === "spotlight") { if (!M.raf) M.raf = requestAnimationFrame(() => { M.raf = 0; d.style.setProperty("--px", M.nx.toFixed(3)); d.style.setProperty("--py", M.ny.toFixed(3)); d.style.setProperty("--mx", M.x + "px"); d.style.setProperty("--my", M.y + "px"); }); }
  }, { passive: true });
  document.addEventListener("pointerleave", () => { M.on = false; M.x = M.y = -1e4; });
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hexA = (hex, a) => { const h = (hex || "#ffffff").replace("#", ""); const n = h.length === 3 ? h.split("").map((x) => x + x).join("") : h.slice(0, 6); const v = parseInt(n, 16) || 0xffffff; return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`; };
  const toHex = (c) => { c = (c || "").trim(); if (/^#[0-9a-f]{3,8}$/i.test(c)) return c; const m = c.match(/\d+(\.\d+)?/g); if (m && m.length >= 3) return "#" + m.slice(0, 3).map((x) => Math.round(Number(x)).toString(16).padStart(2, "0")).join(""); return "#f59e0b"; };
  const ENG = {
    constellation: {
      init(W, H, o) { const n = Math.round(Math.min(150, (W * H) / 13000) * o.density * (o.low ? 0.5 : 1)); return { p: Array.from({ length: n }, () => ({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-0.03, 0.03), vy: rnd(-0.03, 0.03), r: rnd(0.8, 2.2) })) }; },
      draw(c, st, dt, W, H, o, m, cols) {
        c.clearRect(0, 0, W, H); const sp = o.speed, L = 120, mouse = o.mouse && m.on;
        st.p.forEach((p) => {
          if (mouse) { const dx = m.x - p.x, dy = m.y - p.y, d2 = dx * dx + dy * dy; if (d2 < 40000) { p.vx += dx * 0.0000025 * dt; p.vy += dy * 0.0000025 * dt; } }
          p.vx *= 0.995; p.vy *= 0.995; const v = Math.hypot(p.vx, p.vy); if (v < 0.015) { p.vx += rnd(-0.004, 0.004); p.vy += rnd(-0.004, 0.004); }
          p.x += p.vx * dt * sp; p.y += p.vy * dt * sp; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
        });
        for (let i = 0; i < st.p.length; i++) { const a = st.p[i]; for (let j = i + 1; j < st.p.length; j++) { const b = st.p[j]; const dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy; if (d < L * L) { c.strokeStyle = hexA(cols[(i + j) % 2], 0.32 * (1 - Math.sqrt(d) / L)); c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } }
          if (mouse) { const dx = a.x - m.x, dy = a.y - m.y, d = Math.hypot(dx, dy); if (d < 170) { c.strokeStyle = hexA(cols[2], 0.55 * (1 - d / 170)); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(m.x, m.y); c.stroke(); } } }
        st.p.forEach((p, i) => { c.fillStyle = hexA(cols[i % 3], 0.85); c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill(); });
      },
    },
    particles: {
      init(W, H, o) { const n = Math.round(Math.min(260, (W * H) / 6000) * o.density * (o.low ? 0.5 : 1)); return { p: Array.from({ length: n }, () => ({ x: rnd(0, W), y: rnd(0, H), z: rnd(0.3, 1), vx: 0, vy: 0, t: rnd(0, 6.28) })) }; },
      draw(c, st, dt, W, H, o, m, cols) {
        c.clearRect(0, 0, W, H); const sp = o.speed, mouse = o.mouse && m.on;
        st.p.forEach((p, i) => {
          p.t += dt * 0.001 * sp; p.y -= dt * 0.008 * p.z * sp; p.x += Math.sin(p.t + i) * 0.05 * sp;
          if (mouse) { const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy; if (d2 < 14400) { const f = (1 - Math.sqrt(d2) / 120) * 0.6; p.vx += (dx / Math.sqrt(d2 + 1)) * f; p.vy += (dy / Math.sqrt(d2 + 1)) * f; } }
          p.x += p.vx; p.y += p.vy; p.vx *= 0.9; p.vy *= 0.9;
          if (p.y < -4) { p.y = H + 4; p.x = rnd(0, W); } if (p.x < -4) p.x = W + 4; if (p.x > W + 4) p.x = -4;
          c.globalAlpha = 0.25 + 0.6 * p.z; c.fillStyle = cols[i % 3]; c.beginPath(); c.arc(p.x, p.y, 0.6 + p.z * 1.6, 0, 6.283); c.fill();
        });
        c.globalAlpha = 1;
      },
    },
    warp: {
      init(W, H, o) { const n = Math.round(Math.min(420, (W * H) / 3500) * o.density * (o.low ? 0.5 : 1)); return { s: Array.from({ length: n }, () => ({ x: rnd(-1, 1), y: rnd(-1, 1), z: rnd(0.05, 1), pz: 0 })), cx: 0, cy: 0 }; },
      draw(c, st, dt, W, H, o, m, cols) {
        c.fillStyle = hexA("#000000", 0.28); c.globalCompositeOperation = "destination-out"; c.fillRect(0, 0, W, H); c.globalCompositeOperation = "source-over";
        const tx = o.mouse && m.on ? m.nx * W * 0.5 : 0, ty = o.mouse && m.on ? m.ny * H * 0.5 : 0; st.cx += (tx - st.cx) * 0.04; st.cy += (ty - st.cy) * 0.04;
        const cx = W / 2 - st.cx, cy = H / 2 - st.cy, f = Math.max(W, H) * 0.6, v = 0.00028 * dt * o.speed;
        st.s.forEach((s, i) => {
          s.pz = s.z; s.z -= v; if (s.z <= 0.02) { s.x = rnd(-1, 1); s.y = rnd(-1, 1); s.z = 1; s.pz = 1; }
          const x = cx + (s.x / s.z) * f * 0.5, y = cy + (s.y / s.z) * f * 0.5, px = cx + (s.x / s.pz) * f * 0.5, py = cy + (s.y / s.pz) * f * 0.5;
          if (x < -20 || x > W + 20 || y < -20 || y > H + 20) { s.z = 1; return; }
          c.strokeStyle = hexA(cols[i % 3], Math.min(1, (1 - s.z) * 1.4)); c.lineWidth = Math.max(0.6, (1 - s.z) * 2.6); c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
        });
      },
    },
    waves: {
      init() { return { t: 0 }; },
      draw(c, st, dt, W, H, o, m, cols) {
        c.clearRect(0, 0, W, H); st.t += dt * 0.0006 * o.speed; const layers = Math.max(2, Math.round(4 * o.density)); const my = o.mouse && m.on ? m.ny * 30 : 0;
        for (let k = 0; k < layers; k++) {
          const base = H * (0.58 + k * 0.09), amp = 26 + k * 10, fq = 0.0028 + k * 0.0006, ph = st.t * (1 + k * 0.3) + k;
          const g = c.createLinearGradient(0, base - amp, 0, H); g.addColorStop(0, hexA(cols[k % 3], 0.22 - k * 0.025)); g.addColorStop(1, hexA(cols[(k + 1) % 3], 0.02));
          c.fillStyle = g; c.beginPath(); c.moveTo(0, H);
          for (let x = 0; x <= W + 16; x += 16) c.lineTo(x, base + my * (k + 1) * 0.3 + Math.sin(x * fq + ph) * amp + Math.sin(x * fq * 0.45 - ph * 0.8) * amp * 0.6);
          c.lineTo(W, H); c.closePath(); c.fill();
        }
      },
    },
    bokeh: {
      init(W, H, o) { const n = Math.round(34 * o.density * (o.low ? 0.6 : 1)); return { b: Array.from({ length: n }, (_, i) => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(20, 90), vx: rnd(-0.012, 0.012), vy: rnd(-0.012, 0.012), a: rnd(0.05, 0.2), c: i % 3, t: rnd(0, 6) })) }; },
      draw(c, st, dt, W, H, o, m, cols) {
        c.clearRect(0, 0, W, H); c.globalCompositeOperation = "lighter";
        st.b.forEach((b) => { b.t += dt * 0.0008 * o.speed; b.x += b.vx * dt * o.speed + (o.mouse && m.on ? m.nx * 0.08 : 0); b.y += b.vy * dt * o.speed; if (b.x < -b.r) b.x = W + b.r; if (b.x > W + b.r) b.x = -b.r; if (b.y < -b.r) b.y = H + b.r; if (b.y > H + b.r) b.y = -b.r;
          const a = b.a * (0.7 + 0.3 * Math.sin(b.t)); const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, hexA(cols[b.c], a)); g.addColorStop(0.7, hexA(cols[b.c], a * 0.6)); g.addColorStop(1, hexA(cols[b.c], 0)); c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 6.283); c.fill(); });
        c.globalCompositeOperation = "source-over";
      },
    },
    matrix: {
      init(W, H, o) { const fs = 16, n = Math.ceil(W / fs); return { fs, d: Array.from({ length: n }, () => rnd(-H / fs, 0)), keep: Math.max(0.15, 1 - o.density * 0.5), acc: 0 }; },
      draw(c, st, dt, W, H, o, m, cols) {
        st.acc += dt * o.speed; if (st.acc < 55) return; st.acc = 0;
        c.globalCompositeOperation = "destination-out"; c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(0, 0, W, H); c.globalCompositeOperation = "source-over";
        c.font = `600 ${st.fs}px "JetBrains Mono", ui-monospace, monospace`; const G = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ΣΔΨ∞";
        st.d.forEach((y, i) => { if (Math.random() > 1 - st.keep * 0.02 && y < 0) return; const ch = G[(Math.random() * G.length) | 0], x = i * st.fs; c.fillStyle = hexA(cols[i % 3], 0.85); c.fillText(ch, x, y * st.fs); if (y * st.fs > H && Math.random() > 0.975) st.d[i] = 0; else st.d[i] = y + 1; });
      },
    },
    borealis: {
      init(W, H, o) { return { t: rnd(0, 100), bands: Math.max(2, Math.round(4 * o.density)) }; },
      draw(c, st, dt, W, H, o, m, cols) {
        c.clearRect(0, 0, W, H); st.t += dt * 0.00025 * o.speed; c.globalCompositeOperation = "lighter";
        const step = o.low ? 10 : 6, sway = o.mouse && m.on ? m.nx * 60 : 0;
        for (let b = 0; b < st.bands; b++) {
          const base = H * (0.18 + b * 0.09), len = H * (0.28 + 0.06 * Math.sin(st.t + b)), col = cols[b % 3];
          for (let x = -20; x < W + 20; x += step) {
            const y = base + Math.sin(x * 0.0035 + st.t * 2 + b) * 46 + Math.sin(x * 0.009 - st.t * 3 + b * 2) * 18 + sway * Math.sin(x * 0.002);
            const a = 0.055 + 0.05 * Math.sin(x * 0.012 + st.t * 4 + b);
            const g = c.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, hexA(col, 0)); g.addColorStop(0.15, hexA(col, a)); g.addColorStop(1, hexA(col, 0));
            c.fillStyle = g; c.fillRect(x, y, step + 1, len);
          }
        }
        c.globalCompositeOperation = "source-over";
      },
    },
  };
  function runCanvas(cv, eng) {
    const ctx = cv.getContext && cv.getContext("2d"); if (!ctx) return;
    let W = 0, H = 0, st = null, last = 0, o = opts(), cols = palette().map(toHex);
    const size = () => { const r = o.low ? 1 : Math.min(1.5, window.devicePixelRatio || 1); W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight; cv.width = Math.round(W * r); cv.height = Math.round(H * r); ctx.setTransform(r, 0, 0, r, 0, 0); st = eng.init(W, H, o); };
    size(); eng.draw(ctx, st, 16, W, H, o, M, cols);
    const rs = A.debounce ? A.debounce(() => { if (cv.isConnected) { size(); eng.draw(ctx, st, 16, W, H, o, M, cols); } }, 200) : size;
    window.addEventListener("resize", rs);
    const refresh = () => { o = opts(); cols = palette().map(toHex); };
    cv.__refresh = () => { refresh(); size(); }; cv.__opts = refresh;
    if (reduced()) { for (let i = 0; i < 30; i++) eng.draw(ctx, st, 33, W, H, o, M, cols); return; }
    const loop = (t) => {
      if (!cv.isConnected) { window.removeEventListener("resize", rs); return; }
      raf = requestAnimationFrame(loop);
      const gap = o.low ? 50 : 25;
      if (document.hidden || t - last < gap) return;
      const dt = Math.min(80, t - (last || t)); last = t; eng.draw(ctx, st, dt || 16, W, H, o, M, cols);
    };
    raf = requestAnimationFrame(loop);
    clearInterval(runCanvas.iv); runCanvas.iv = setInterval(() => { if (cv.isConnected) refresh(); }, 2500);
  }
  /* circuit traces: a fixed, seeded pattern of right-angle paths with pads; a few pulse along their length */
  function circuitSVG() {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let p = "", pads = "", pulses = "";
    for (let k = 0; k < 26; k++) {
      let x = Math.round(rnd() * 40) * 40, y = Math.round(rnd() * 24) * 40; let d = `M${x} ${y}`;
      for (let s = 0; s < 4; s++) { if (s % 2 === 0) x += (rnd() > 0.5 ? 1 : -1) * (80 + Math.round(rnd() * 4) * 40); else y += (rnd() > 0.5 ? 1 : -1) * (40 + Math.round(rnd() * 3) * 40); d += ` L${x} ${y}`; }
      p += `<path d="${d}"/>`; pads += `<circle cx="${x}" cy="${y}" r="4"/>`;
      if (k % 4 === 0) pulses += `<path class="pl" d="${d}" style="animation-delay:${(-k * 1.3).toFixed(1)}s"/>`;
    }
    return `<svg viewBox="0 0 1600 960" preserveAspectRatio="xMidYMid slice"><g class="tr">${p}</g><g class="pd">${pads}</g><g class="pls">${pulses}</g></svg>`;
  }
  /* starfield: ~140 points (fewer on small screens), 30 fps, paused when hidden or with reduced motion (drawn once) */
  function stars(cv) {
    const ctx = cv.getContext && cv.getContext("2d"); if (!ctx) return;
    let W = 0, H = 0, pts = [], last = 0;
    const size = () => { const r = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight; cv.width = W * r; cv.height = H * r; ctx.setTransform(r, 0, 0, r, 0, 0); const n = Math.round(Math.min(160, (W * H) / 9000)); pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7, t: Math.random() * 6.28 })); };
    const col = () => (getComputedStyle(root()).getPropertyValue(root().classList.contains("bg-match") || root().getAttribute("data-theme") === "light" ? "--amber" : "--tx").trim() || "#e8eef6");
    let c = col();
    const draw = (dt) => {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = c;
      const sp = opts().speed;
      pts.forEach((p) => { p.y -= dt * 0.012 * p.z * sp; p.t += dt * 0.002 * sp; if (p.y < -2) { p.y = H + 2; p.x = Math.random() * W; } ctx.globalAlpha = 0.25 + 0.55 * p.z * (0.6 + 0.4 * Math.sin(p.t)); ctx.beginPath(); ctx.arc(p.x, p.y, 0.6 + p.z * 1.2, 0, 6.283); ctx.fill(); });
      ctx.globalAlpha = 1;
    };
    size(); draw(0);
    window.addEventListener("resize", A.debounce ? A.debounce(() => { if (cv.isConnected) { size(); draw(0); } }, 200) : size);
    if (reduced()) return;
    const loop = (t) => { if (!cv.isConnected) return; raf = requestAnimationFrame(loop); if (document.hidden || t - last < 33) return; const dt = Math.min(100, t - (last || t)); last = t; draw(dt); };
    raf = requestAnimationFrame(loop);
    setInterval(() => { c = col(); }, 3000);
  }
  document.addEventListener("visibilitychange", () => { if (!vid) return; if (document.hidden) vid.pause(); else playSafe(vid); });

  /* ---------------------------------------------------------------- upload (sanitised: re-encoded through a canvas, capped) */
  function readUpload(file) {
    return new Promise((res, rej) => {
      if (!file) return rej(new Error("No file"));
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej(new Error("Use a JPG, PNG or WebP image"));
      if (file.size > MAX_UPLOAD) return rej(new Error("That image is over 6 MB"));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        try {
          const max = 1920, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
          const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(img, 0, 0, w, h);
          let q = 0.82, d = cv.toDataURL("image/jpeg", q);
          while (d.length > MAX_DATAURL && q > 0.4) { q -= 0.12; d = cv.toDataURL("image/jpeg", q); }
          URL.revokeObjectURL(url);
          if (!DATARX.test(d) || d.length > MAX_DATAURL) return rej(new Error("That image is too large to keep"));
          res(d);
        } catch (e) { URL.revokeObjectURL(url); rej(new Error("That image could not be read")); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("That file is not a readable image")); };
      img.src = url;
    });
  }

  /* ---------------------------------------------------------------- picker (Settings) */
  function noteFor(id) {
    const b = byId.get(id) || byId.get("aurora");
    if (b.kind === "video") { const why = videoBlock(); return why ? `Showing a still frame because ${esc(why)}. <label class="switch switch--inline"><input type="checkbox" id="bgVidAlways"><span></span>Play videos anyway</label>` : `Muted loop, paused while this tab is hidden. ${opts().videoAlways ? `<label class="switch switch--inline"><input type="checkbox" id="bgVidAlways" checked><span></span>Play videos anyway</label>` : ""}`; }
    if (b.credit) return `Photo: <a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${esc(b.credit)}</a> · ${esc(b.lic)}`;
    return esc(b.note || "");
  }
  function tile(b, cur) {
    const pv = b.thumb ? `<span class="bgt__pv" style="background-image:url('${esc(b.thumb)}')"></span>` : b.kind === "custom" ? `<span class="bgt__pv bgt__pv--custom">${customURL() ? "" : "+"}</span>` : `<span class="bgt__pv bgt__pv--${b.id}"><i></i><i></i></span>`;
    return `<button type="button" class="bgt" data-bgset="${b.id}" aria-pressed="${cur === b.id}" title="${esc(b.name)}">${pv}<b>${esc(b.name)}</b><small>${b.kind === "anim" ? "Animated" : b.kind === "video" ? "Video loop" : b.kind === "image" ? "Photo" : b.kind === "custom" ? "Your image" : "Static"}</small></button>`;
  }
  const PRESETS = [
    { id: "calm", name: "Calm aurora", bg: "borealis", o: { palette: "aurora", speed: 0.75, op: 85, density: 1, vig: 30, grain: 10 } },
    { id: "space", name: "Deep space", bg: "warp", o: { palette: "mono", speed: 0.6, op: 80, density: 1, vig: 40 } },
    { id: "neon", name: "Neon network", bg: "constellation", o: { palette: "neon", speed: 1, op: 90, density: 1.2, mouse: true } },
    { id: "ocean", name: "Ocean drift", bg: "waves", o: { palette: "ocean", speed: 0.8, op: 90, vig: 20 } },
    { id: "sunset", name: "Sunset bokeh", bg: "bokeh", o: { palette: "sunset", speed: 0.7, op: 85, blur: 4, grain: 15 } },
    { id: "lava", name: "Lava lamp", bg: "blobs", o: { palette: "ember", speed: 0.8, op: 70 } },
    { id: "code", name: "Code rain", bg: "matrix", o: { palette: "forest", speed: 1, op: 55, vig: 40 } },
    { id: "studio", name: "Studio spotlight", bg: "spotlight", o: { palette: "theme", op: 100, grain: 18 } },
    { id: "river", name: "Colour river", bg: "flow", o: { palette: "aurora", speed: 0.6, op: 70, grain: 12 } },
  ];
  const customPresets = () => { try { const a = JSON.parse(LS("bgPresets") || "[]"); return Array.isArray(a) ? a.filter((p) => p && byId.has(p.bg) && typeof p.name === "string").slice(0, 12) : []; } catch (e) { return []; } };
  function applyPreset(p) { const o = Object.assign({}, DEF, opts(), p.o || {}); saveOpts(o); apply(p.bg); refreshPicker(); return p; }
  function randomize() {
    const anims = BGS.filter((b) => b.kind === "anim").map((b) => b.id), pals = Object.keys(PALETTES);
    const id = anims[(Math.random() * anims.length) | 0];
    const o = Object.assign({}, opts(), { palette: pals[(Math.random() * pals.length) | 0], speed: [0.5, 0.75, 1, 1.25][(Math.random() * 4) | 0], density: [0.6, 1, 1.4][(Math.random() * 3) | 0], vig: [0, 20, 40][(Math.random() * 3) | 0], grain: [0, 10, 20][(Math.random() * 3) | 0], hue: 0, op: 80 + 5 * ((Math.random() * 4) | 0) });
    saveOpts(o); apply(id); refreshPicker(); return id;
  }
  function savePreset(name) {
    const nm = String(name || "").replace(/[<>"'`]/g, "").trim().slice(0, 28); if (!nm) return null;
    const list = customPresets().filter((p) => p.name !== nm); list.unshift({ name: nm, bg: root().getAttribute("data-bg") || current(), o: opts() });
    LS("bgPresets", JSON.stringify(list.slice(0, 12))); refreshPicker(); return nm;
  }
  function pickerHTML(px) {
    px = px || "";
    const cur = current(), o = opts(), cu = customURL(), mine = customPresets();
    const I = (id) => px + id;
    return `<div class="bgp" id="${I("bgPicker")}">
      <div class="bgp__pre" role="group" aria-label="Background presets"><span class="bgp__lbl">Presets</span>${PRESETS.map((p) => `<button type="button" class="chip bgp__chip" data-bgpreset="${p.id}">${esc(p.name)}</button>`).join("")}${mine.map((p, i) => `<span class="bgp__mine"><button type="button" class="chip bgp__chip bgp__chip--mine" data-bgmine="${i}">★ ${esc(p.name)}</button><button type="button" class="bgp__del" data-bgmindel="${i}" aria-label="Delete preset ${esc(p.name)}">✕</button></span>`).join("")}
        <button type="button" class="chip bgp__rand" data-bgrand>🎲 Randomize</button>
        <form class="bgp__save" data-bgsave><input class="input input--sm" name="n" maxlength="28" placeholder="Name this look" aria-label="Preset name"><button class="btn btn--sm">Save preset</button></form></div>
      <div class="bgp__grid" role="group" aria-label="Backgrounds">${BGS.map((b) => tile(b, cur)).join("")}</div>
      <p class="bgp__note muted" id="${I("bgNote")}" data-bgnote>${noteFor(cur)}</p>
      <div class="bgp__ctl">
        <label class="rng"><span>Intensity <output id="${I("bgOpV")}">${o.op}%</output></span><input type="range" id="${I("bgOp")}" min="10" max="100" step="5" value="${o.op}" aria-label="Background intensity"></label>
        <label class="rng"><span>Blur <output id="${I("bgBlurV")}">${o.blur}px</output></span><input type="range" id="${I("bgBlur")}" min="0" max="30" step="1" value="${o.blur}" aria-label="Background blur"></label>
        <label class="rng"><span>Speed <output id="${I("bgSpeedV")}">${o.speed}×</output></span><input type="range" id="${I("bgSpeed")}" min="0.25" max="3" step="0.25" value="${o.speed}" aria-label="Animation speed"></label>
        <label class="rng"><span>Density <output id="${I("bgDensityV")}">${o.density}×</output></span><input type="range" id="${I("bgDensity")}" min="0.25" max="2" step="0.25" value="${o.density}" aria-label="Particle density"></label>
        <label class="rng"><span>Vignette <output id="${I("bgVigV")}">${o.vig}%</output></span><input type="range" id="${I("bgVig")}" min="0" max="100" step="5" value="${o.vig}" aria-label="Vignette"></label>
        <label class="rng"><span>Grain <output id="${I("bgGrainV")}">${o.grain}%</output></span><input type="range" id="${I("bgGrain")}" min="0" max="100" step="5" value="${o.grain}" aria-label="Film grain"></label>
        <label class="rng"><span>Hue shift <output id="${I("bgHueV")}">${o.hue}°</output></span><input type="range" id="${I("bgHue")}" min="0" max="360" step="5" value="${o.hue}" aria-label="Hue shift"></label>
        <label class="rng rng--sel"><span>Palette</span><select class="cselect" id="${I("bgPalette")}" data-bgpal aria-label="Background palette">${Object.keys(PALETTES).map((k) => `<option value="${k}" ${o.palette === k ? "selected" : ""}>${PAL_NAMES[k]}</option>`).join("")}</select></label>
        <div class="bgp__sw">
        <label class="switch"><input type="checkbox" id="${I("bgMouse")}" data-bgflag="mouse" ${o.mouse ? "checked" : ""}><span></span>Reacts to the cursor</label>
        <label class="switch"><input type="checkbox" id="${I("bgParallax")}" data-bgflag="parallax" ${o.parallax ? "checked" : ""}><span></span>Parallax</label>
        <label class="switch"><input type="checkbox" id="${I("bgLow")}" data-bgflag="low" ${o.low ? "checked" : ""}><span></span>Low-power mode</label>
        <label class="switch"><input type="checkbox" id="${I("bgMatch")}" ${o.match ? "checked" : ""}><span></span>Match theme accent</label></div>
        <label class="btn btn--sm btn--ghost bgp__up">Upload my own image<input type="file" id="${I("bgUp")}" accept="image/jpeg,image/png,image/webp" hidden></label>
        ${cu ? `<button type="button" class="btn btn--sm btn--ghost" id="${I("bgUpDel")}">Remove my image</button>` : ""}
        <button type="button" class="btn btn--sm btn--ghost" id="${I("bgReset")}">Reset background</button></div></div>`;
  }
  function refreshPicker() { $$('[id$="bgPicker"]').forEach((p) => { const px = p.id.slice(0, -8); p.outerHTML = pickerHTML(px); }); paintCustomThumb(); }
  function paintCustomThumb() { const u = customURL(); $$('.bgt[data-bgset="custom"] .bgt__pv').forEach((t) => { if (u) t.style.backgroundImage = `url("${u}")`; }); }
  const OUT = { bgOp: (v) => v + "%", bgBlur: (v) => v + "px", bgSpeed: (v) => v + "×", bgHue: (v) => v + "°", bgDensity: (v) => v + "×", bgVig: (v) => v + "%", bgGrain: (v) => v + "%" };
  const KEY = { bgOp: "op", bgBlur: "blur", bgSpeed: "speed", bgHue: "hue", bgDensity: "density", bgVig: "vig", bgGrain: "grain" };
  const baseId = (id) => String(id || "").replace(/^q-/, "");
  const restart = () => { const id = root().getAttribute("data-bg") || current(); const b = byId.get(id); if (b && (ENG[id] || id === "stars")) apply(id, { preview: id === current() ? false : true }); };
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest && ev.target.closest("[data-bgset]");
    if (b) {
      ev.preventDefault();
      const id = b.dataset.bgset, y = window.scrollY;
      if (id === "custom" && !customURL()) { const up = $("#bgUp"); if (up) up.click(); return; }
      const x = apply(id); if (window.scrollY !== y) window.scrollTo(0, y);
      A.ui && A.ui.toast(`Background: ${esc(x.name)}`, { ms: 1200 });
      return;
    }
    const t = ev.target.closest ? ev.target : null; if (!t) return;
    if (t.closest('[id$="bgReset"]')) { saveOpts(DEF); apply("aurora"); refreshPicker(); A.ui && A.ui.toast("Background reset", { ms: 1200 }); }
    if (t.closest('[id$="bgUpDel"]')) { LS("bgCustom", null); if (current() === "custom" || root().getAttribute("data-bg") === "custom") apply("aurora"); refreshPicker(); }
    const pr = t.closest("[data-bgpreset]"); if (pr) { const p = PRESETS.find((x) => x.id === pr.dataset.bgpreset); if (p) { applyPreset(p); A.ui && A.ui.toast(`Background preset: ${esc(p.name)}`, { ms: 1300 }); } return; }
    const mi = t.closest("[data-bgmine]"); if (mi) { const p = customPresets()[Number(mi.dataset.bgmine)]; if (p) { applyPreset(p); A.ui && A.ui.toast(`Your preset: ${esc(p.name)}`, { ms: 1300 }); } return; }
    const md = t.closest("[data-bgmindel]"); if (md) { const l = customPresets(); l.splice(Number(md.dataset.bgmindel), 1); LS("bgPresets", JSON.stringify(l)); refreshPicker(); return; }
    if (t.closest("[data-bgrand]")) { const id = randomize(); A.ui && A.ui.toast(`Random look: ${esc(byId.get(id).name)}`, { icon: "🎲", ms: 1300 }); return; }
  });
  document.addEventListener("submit", (ev) => { const f = ev.target.closest && ev.target.closest("[data-bgsave]"); if (!f) return; ev.preventDefault(); const nm = savePreset(f.elements.n.value); if (nm) A.ui && A.ui.toast(`Saved preset “${esc(nm)}”`, { icon: "★", ms: 1500 }); });
  document.addEventListener("input", (ev) => {
    const bid = baseId(ev.target.id), k = KEY[bid]; if (!k) return;
    const o = opts(); o[k] = Number(ev.target.value); saveOpts(o); paintVars();
    $$(`#${bid}V, #q-${bid}V`).forEach((out) => (out.textContent = OUT[bid](ev.target.value)));
    $$(`#${bid}, #q-${bid}`).forEach((x) => { if (x !== ev.target) x.value = ev.target.value; });
    if (k === "speed" && vid) vid.playbackRate = Math.min(2, Math.max(0.5, o.speed));
    if (k === "density") { clearTimeout(KEY.__t); KEY.__t = setTimeout(restart, 180); }
    const cv = $("#bgfx canvas"); if (cv && cv.__opts && k !== "density") cv.__opts();
  });
  document.addEventListener("change", async (ev) => {
    const bid = baseId(ev.target.id);
    if (bid === "bgMatch") { const o = opts(); o.match = ev.target.checked; saveOpts(o); paintVars(); }
    if (ev.target.dataset && ev.target.dataset.bgflag) { const o = opts(); o[ev.target.dataset.bgflag] = ev.target.checked; saveOpts(o); paintVars(); restart(); }
    if (ev.target.dataset && ev.target.dataset.bgpal != null) { const o = opts(); o.palette = ev.target.value; saveOpts(o); paintVars(); restart(); $$("[data-bgpal]").forEach((x) => (x.value = o.palette)); }
    if (ev.target.id === "bgVidAlways") { const o = opts(); o.videoAlways = ev.target.checked; saveOpts(o); apply(root().getAttribute("data-bg") || current()); }
    if (bid === "bgUp") {
      const f = ev.target.files && ev.target.files[0]; ev.target.value = "";
      try { const d = await readUpload(f); LS("bgCustom", d); if (LS("bgCustom") !== d) throw new Error("Browser storage is full"); apply("custom"); refreshPicker(); A.ui && A.ui.toast("Your background is set (kept only in this browser)", { icon: "🖼️", ms: 2200 }); }
      catch (x) { A.ui && A.ui.toast("Could not use that image: " + esc(x.message), { icon: "⚠️", force: true }); }
    }
  });
  function creditsHTML() { return `<ul class="bgcred">${BGS.filter((b) => b.credit).map((b) => `<li><b>${esc(b.name)}</b> (${b.kind === "video" ? "video" : /painting/.test(b.name) ? "painting" : "photo"}) by <a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${esc(b.credit)}</a>, ${esc(b.lic)}</li>`).join("")}</ul>`; }

  (function init() { apply(current(), { preview: true }); })();
  A.bg = { BGS, apply, opts, current, pickerHTML, creditsHTML, readUpload, videoBlock, paintCustomThumb, DATARX, MAX_DATAURL, PRESETS, PALETTES, applyPreset, randomize, savePreset, customPresets, palette, ENG, refreshPicker };
})(window.ASFE);
