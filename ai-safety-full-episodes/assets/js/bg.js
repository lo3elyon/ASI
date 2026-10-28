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
    { id: "grid", name: "Subtle grid", kind: "static", note: "Blueprint lines, fades out" },
    { id: "noise", name: "Noise gradient", kind: "static", note: "Grainy two-tone gradient" },
    { id: "img-nebula", name: "Nebula", kind: "image", src: "assets/bg/nebula.jpg", thumb: "assets/bg/thumbs/nebula.jpg", credit: "Scott Lord", url: "https://unsplash.com/photos/qV2xKnrSY6A", lic: "Unsplash License" },
    { id: "img-mountains", name: "Night mountains", kind: "image", src: "assets/bg/mountains.jpg", thumb: "assets/bg/thumbs/mountains.jpg", credit: "vu anh", url: "https://unsplash.com/photos/FSQPB2tynko", lic: "Unsplash License" },
    { id: "img-waves", name: "Blue waves", kind: "image", src: "assets/bg/waves.jpg", thumb: "assets/bg/thumbs/waves.jpg", credit: "Unsplash contributor (photo f4SwwVbM_IY)", url: "https://unsplash.com/photos/f4SwwVbM_IY", lic: "Unsplash License" },
    { id: "img-peaks", name: "Annapurna stars", kind: "image", src: "assets/bg/peaks.jpg", thumb: "assets/bg/thumbs/peaks.jpg", credit: "Daniel Leone", url: "https://unsplash.com/photos/v7daTKlZzaw", lic: "Unsplash License" },
    { id: "vid-neon", name: "Neon particles", kind: "video", src: "assets/bg/neon.mp4", thumb: "assets/bg/thumbs/neon.jpg", poster: "assets/bg/neon.jpg", credit: "Nicola Narracci", url: "https://www.pexels.com/video/abstract-neon-particles-in-dark-space-29765099/", lic: "Pexels License" },
    { id: "vid-waves", name: "Swirling waves", kind: "video", src: "assets/bg/swirl.mp4", thumb: "assets/bg/thumbs/swirl.jpg", poster: "assets/bg/swirl.jpg", credit: "Colin Jones", url: "https://www.pexels.com/video/abstract-blue-swirling-waves-background-loop-33884408/", lic: "Pexels License" },
    { id: "vid-fluid", name: "Liquid fluid", kind: "video", src: "assets/bg/fluid.mp4", thumb: "assets/bg/thumbs/fluid.jpg", poster: "assets/bg/fluid.jpg", credit: "Chandresh Uike", url: "https://www.pexels.com/video/abstract-fluid-motion-background-loop-34127871/", lic: "Pexels License" },
    { id: "custom", name: "My image", kind: "custom", note: "Upload your own (stays in this browser)" },
    { id: "none", name: "Plain", kind: "static", note: "Just the theme colour" },
  ];
  const byId = new Map(BGS.map((b) => [b.id, b]));
  const DEF = { op: 100, blur: 0, speed: 1, hue: 0, match: false, videoAlways: false };
  const MAX_UPLOAD = 6 * 1024 * 1024, MAX_DATAURL = 1.6 * 1024 * 1024;
  const DATARX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const clampN = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  function opts() {
    let o = {}; try { o = JSON.parse(LS("bgOpts") || "{}") || {}; } catch (e) { o = {}; }
    return { op: clampN(o.op, 10, 100, DEF.op), blur: clampN(o.blur, 0, 30, DEF.blur), speed: clampN(o.speed, 0.25, 3, DEF.speed), hue: clampN(o.hue, 0, 360, DEF.hue), match: !!o.match, videoAlways: !!o.videoAlways };
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
    $$("[data-bgset]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.bgset === id)));
    const n = $("#bgNote"); if (n) n.innerHTML = noteFor(id);
    return b;
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
  function pickerHTML() {
    const cur = current(), o = opts(), cu = customURL();
    if (cu) { /* the custom tile previews the saved image */ }
    return `<div class="bgp" id="bgPicker"><div class="bgp__grid" role="group" aria-label="Backgrounds">${BGS.map((b) => tile(b, cur)).join("")}</div>
      <p class="bgp__note muted" id="bgNote">${noteFor(cur)}</p>
      <div class="bgp__ctl">
        <label class="rng"><span>Intensity <output id="bgOpV">${o.op}%</output></span><input type="range" id="bgOp" min="10" max="100" step="5" value="${o.op}" aria-label="Background intensity"></label>
        <label class="rng"><span>Blur <output id="bgBlurV">${o.blur}px</output></span><input type="range" id="bgBlur" min="0" max="30" step="1" value="${o.blur}" aria-label="Background blur"></label>
        <label class="rng"><span>Speed <output id="bgSpeedV">${o.speed}×</output></span><input type="range" id="bgSpeed" min="0.25" max="3" step="0.25" value="${o.speed}" aria-label="Animation speed"></label>
        <label class="rng"><span>Hue shift <output id="bgHueV">${o.hue}°</output></span><input type="range" id="bgHue" min="0" max="360" step="5" value="${o.hue}" aria-label="Hue shift"></label>
        <label class="switch"><input type="checkbox" id="bgMatch" ${o.match ? "checked" : ""}><span></span>Match theme accent</label>
        <label class="btn btn--sm btn--ghost bgp__up">Upload my own image<input type="file" id="bgUp" accept="image/jpeg,image/png,image/webp" hidden></label>
        ${cu ? `<button type="button" class="btn btn--sm btn--ghost" id="bgUpDel">Remove my image</button>` : ""}
        <button type="button" class="btn btn--sm btn--ghost" id="bgReset">Reset background</button></div></div>`;
  }
  function refreshPicker() { const p = $("#bgPicker"); if (p) p.outerHTML = pickerHTML(); paintCustomThumb(); }
  function paintCustomThumb() { const u = customURL(); const t = $('.bgt[data-bgset="custom"] .bgt__pv'); if (t && u) t.style.backgroundImage = `url("${u}")`; }
  const OUT = { bgOp: (v) => v + "%", bgBlur: (v) => v + "px", bgSpeed: (v) => v + "×", bgHue: (v) => v + "°" };
  const KEY = { bgOp: "op", bgBlur: "blur", bgSpeed: "speed", bgHue: "hue" };
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
    if (ev.target.closest && ev.target.closest("#bgReset")) { saveOpts(DEF); apply("aurora"); refreshPicker(); A.ui && A.ui.toast("Background reset", { ms: 1200 }); }
    if (ev.target.closest && ev.target.closest("#bgUpDel")) { LS("bgCustom", null); if (current() === "custom" || root().getAttribute("data-bg") === "custom") apply("aurora"); refreshPicker(); }
  });
  document.addEventListener("input", (ev) => {
    const k = KEY[ev.target.id]; if (!k) return;
    const o = opts(); o[k] = Number(ev.target.value); saveOpts(o); paintVars();
    const out = $("#" + ev.target.id + "V"); if (out) out.textContent = OUT[ev.target.id](ev.target.value);
    if (k === "speed" && vid) vid.playbackRate = Math.min(2, Math.max(0.5, o.speed));
  });
  document.addEventListener("change", async (ev) => {
    if (ev.target.id === "bgMatch") { const o = opts(); o.match = ev.target.checked; saveOpts(o); paintVars(); }
    if (ev.target.id === "bgVidAlways") { const o = opts(); o.videoAlways = ev.target.checked; saveOpts(o); apply(root().getAttribute("data-bg") || current()); }
    if (ev.target.id === "bgUp") {
      const f = ev.target.files && ev.target.files[0]; ev.target.value = "";
      try { const d = await readUpload(f); LS("bgCustom", d); if (LS("bgCustom") !== d) throw new Error("Browser storage is full"); apply("custom"); refreshPicker(); A.ui && A.ui.toast("Your background is set (kept only in this browser)", { icon: "🖼️", ms: 2200 }); }
      catch (x) { A.ui && A.ui.toast("Could not use that image: " + esc(x.message), { icon: "⚠️", force: true }); }
    }
  });
  function creditsHTML() { return `<ul class="bgcred">${BGS.filter((b) => b.credit).map((b) => `<li><b>${esc(b.name)}</b> (${b.kind === "video" ? "video" : "photo"}) by <a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${esc(b.credit)}</a>, ${esc(b.lic)}</li>`).join("")}</ul>`; }

  (function init() { apply(current(), { preview: true }); })();
  A.bg = { BGS, apply, opts, current, pickerHTML, creditsHTML, readUpload, videoBlock, paintCustomThumb, DATARX, MAX_DATAURL };
})(window.ASFE);
