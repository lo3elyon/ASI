/* Threshold reader: a WebGL open book on a desk. Pages bend as they turn, follow a dragged
   corner, cast soft shadows and float in lamp light with slow dust. three.js is vendored. */
import { PW, PH, THEMES } from "./paginate.js";

export function webglOK() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; }
}

export async function createBook3D(host, hooks) {
  const T3 = await import("../../assets/vendor/three-lib.min.mjs");
  const W = 1, H = PH / PW, SEGX = 44, SEGY = 16;
  const mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 760;
  const renderer = new T3.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFShadowMap;
  renderer.toneMapping = T3.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = T3.SRGBColorSpace;
  const cvs = renderer.domElement; cvs.className = "b3-canvas"; cvs.setAttribute("aria-hidden", "true"); host.appendChild(cvs);
  const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4;

  const scene = new T3.Scene();
  const camera = new T3.PerspectiveCamera(32, 1, 0.05, 60);
  const fog = new T3.Fog(0x05080d, 6, 16); scene.fog = fog;

  /* ---------- desk ---------- */
  function woodTexture(hex) {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 1024; const g = c.getContext("2d");
    g.fillStyle = hex; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 260; i++) { const y = Math.random() * 1024, a = 0.02 + Math.random() * 0.06; g.strokeStyle = Math.random() > 0.5 ? `rgba(255,220,170,${a})` : `rgba(0,0,0,${a * 1.6})`; g.lineWidth = 0.6 + Math.random() * 2.6; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x / 90 + i) * 5 + Math.sin(x / 23 + i * 3) * 1.4); g.stroke(); }
    const v = g.createRadialGradient(512, 512, 120, 512, 512, 720); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.35)"); g.fillStyle = v; g.fillRect(0, 0, 1024, 1024);
    const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; t.wrapS = t.wrapT = T3.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = maxAniso; return t;
  }
  const deskMat = new T3.MeshStandardMaterial({ roughness: 0.78, metalness: 0.05 });
  const desk = new T3.Mesh(new T3.PlaneGeometry(16, 12), deskMat); desk.rotation.x = -Math.PI / 2; desk.position.y = -0.062; desk.receiveShadow = true; scene.add(desk);

  /* ---------- book body ---------- */
  const book = new T3.Group(); scene.add(book);
  const boardMat = new T3.MeshStandardMaterial({ color: 0x14263c, roughness: 0.55, metalness: 0.08 });
  const stripes = (() => { const c = document.createElement("canvas"); c.width = 8; c.height = 128; const g = c.getContext("2d"); for (let y = 0; y < 128; y++) { g.fillStyle = y % 3 ? "#ece4d2" : "#cbbfa6"; g.fillRect(0, y, 8, 1); } const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; t.wrapS = t.wrapT = T3.RepeatWrapping; return t; })();
  const edgeMat = new T3.MeshStandardMaterial({ map: stripes, roughness: 0.95 });
  const paperTopMat = new T3.MeshStandardMaterial({ color: 0xf1e8d6, roughness: 0.95 });
  const BOARD = 0.016, BASE = -0.045;
  const backBoard = new T3.Mesh(new T3.BoxGeometry(W + 0.04, BOARD, H + 0.06), boardMat); backBoard.position.set(W / 2 + 0.012, BASE, 0); backBoard.castShadow = backBoard.receiveShadow = true; book.add(backBoard);
  const spine = new T3.Mesh(new T3.CylinderGeometry(0.03, 0.03, H + 0.06, 18, 1, true, Math.PI, Math.PI), boardMat); spine.rotation.x = Math.PI / 2; spine.position.set(0, BASE + 0.01, 0); book.add(spine);
  const stackGeo = new T3.BoxGeometry(1, 1, 1);
  const mkStack = () => { const m = new T3.Mesh(stackGeo, [edgeMat, edgeMat, paperTopMat, paperTopMat, edgeMat, edgeMat]); m.castShadow = m.receiveShadow = true; book.add(m); return m; };
  const stackL = mkStack(), stackR = mkStack();
  const pageMat = (side) => new T3.MeshStandardMaterial({ roughness: 0.9, metalness: 0, side });
  const flatGeo = new T3.PlaneGeometry(W, H); flatGeo.rotateX(-Math.PI / 2);
  const pageL = new T3.Mesh(flatGeo, pageMat(T3.FrontSide)), pageR = new T3.Mesh(flatGeo, pageMat(T3.FrontSide));
  pageL.receiveShadow = pageR.receiveShadow = true; pageL.position.x = -W / 2; pageR.position.x = W / 2; book.add(pageL, pageR);
  let topY = 0;
  function setStacks(f) { // f: fraction of the book already read (0..1)
    const tot = 0.05, l = 0.004 + tot * f, r = 0.004 + tot * (1 - f), base = BASE + BOARD / 2;
    stackL.scale.set(W - 0.01, l, H - 0.012); stackL.position.set(-W / 2 - 0.004, base + l / 2, 0);
    stackR.scale.set(W - 0.01, r, H - 0.012); stackR.position.set(W / 2 + 0.004, base + r / 2, 0);
    pageL.position.y = base + l + 0.0008; pageR.position.y = base + r + 0.0008; topY = Math.max(pageL.position.y, pageR.position.y);
    leaf.position.y = topY + 0.002;
    coverPivot.position.y = base + r / 2; coverClosedH = r / 2 + BOARD / 2 + 0.002;
    cover.position.y = coverClosedH;
  }

  /* ---------- the turning leaf ---------- */
  const N = (SEGX + 1) * (SEGY + 1);
  const pos = new Float32Array(N * 3), uvF = new Float32Array(N * 2), uvB = new Float32Array(N * 2), idx = [];
  for (let j = 0; j <= SEGY; j++) for (let i = 0; i <= SEGX; i++) { const k = j * (SEGX + 1) + i; uvF[k * 2] = i / SEGX; uvF[k * 2 + 1] = 1 - j / SEGY; uvB[k * 2] = 1 - i / SEGX; uvB[k * 2 + 1] = 1 - j / SEGY; }
  for (let j = 0; j < SEGY; j++) for (let i = 0; i < SEGX; i++) { const a = j * (SEGX + 1) + i, b = a + 1, c = a + SEGX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const posAttr = new T3.BufferAttribute(pos, 3);
  const gF = new T3.BufferGeometry(); gF.setAttribute("position", posAttr); gF.setAttribute("uv", new T3.BufferAttribute(uvF, 2)); gF.setIndex(idx);
  const gB = new T3.BufferGeometry(); gB.setAttribute("position", posAttr); gB.setAttribute("uv", new T3.BufferAttribute(uvB, 2)); gB.setIndex(idx);
  const leafF = new T3.Mesh(gF, pageMat(T3.FrontSide)), leafB = new T3.Mesh(gB, pageMat(T3.BackSide));
  leafF.castShadow = leafB.castShadow = true; leafF.receiveShadow = leafB.receiveShadow = true;
  const leaf = new T3.Group(); leaf.add(leafF, leafB); leaf.visible = false; book.add(leaf);
  function bendLeaf(t, curl, skew) {
    const th0 = t * Math.PI, du = W / SEGX, lift = 0.012 * Math.sin(t * Math.PI);
    for (let j = 0; j <= SEGY; j++) {
      const v = -H / 2 + (j / SEGY) * H, kb = curl * (1 + skew * (v / (H / 2)) * 0.7);
      let x = 0, y = 0;
      for (let i = 0; i <= SEGX; i++) {
        const k = (j * (SEGX + 1) + i) * 3;
        if (i > 0) { const s = (i - 0.5) / SEGX, th = Math.min(Math.PI, Math.max(0, th0 + kb * s * s * 1.4)); x += Math.cos(th) * du; y += Math.sin(th) * du; }
        pos[k] = x; pos[k + 1] = y + lift * (i / SEGX) + 0.0006 * i; pos[k + 2] = v;
      }
    }
    posAttr.needsUpdate = true; gF.computeVertexNormals(); gB.attributes.normal = gF.attributes.normal;
    gF.computeBoundingSphere(); gB.boundingSphere = gF.boundingSphere;
  }

  /* ---------- front cover for the opening animation ---------- */
  const coverPivot = new T3.Group(); book.add(coverPivot);
  const coverTopMat = new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.05 });
  const coverInMat = new T3.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.9 });
  const cover = new T3.Mesh(new T3.BoxGeometry(W + 0.03, BOARD, H + 0.06), [boardMat, boardMat, coverTopMat, coverInMat, boardMat, boardMat]);
  cover.castShadow = true; cover.position.x = W / 2 + 0.012; coverPivot.add(cover); coverPivot.rotation.z = Math.PI;
  let coverClosedH = 0.03;

  /* ---------- lights ---------- */
  const hemi = new T3.HemisphereLight(0x8fa6c2, 0x3a2a1a, 0.9); scene.add(hemi);
  const lamp = new T3.SpotLight(0xffd9a8, 46, 12, 0.62, 0.85, 1.6);
  lamp.position.set(-2.1, 3.3, 1.4); lamp.target.position.set(0.15, 0, 0); scene.add(lamp, lamp.target);
  lamp.castShadow = true; lamp.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); lamp.shadow.bias = -0.0004; lamp.shadow.radius = 6; lamp.shadow.blurSamples = 16; lamp.shadow.normalBias = 0.015; lamp.shadow.camera.near = 1; lamp.shadow.camera.far = 9;
  const fill = new T3.DirectionalLight(0xbcd6ff, 0.35); fill.position.set(3, 2, 2.5); scene.add(fill);

  /* ---------- dust in the lamp light ---------- */
  const PN = mobile ? 140 : 320, pp = new Float32Array(PN * 3), ps = new Float32Array(PN);
  for (let i = 0; i < PN; i++) { pp[i * 3] = (Math.random() - 0.5) * 4.2; pp[i * 3 + 1] = Math.random() * 2.2 + 0.05; pp[i * 3 + 2] = (Math.random() - 0.5) * 3; ps[i] = Math.random() * 6.28; }
  const pg = new T3.BufferGeometry(); pg.setAttribute("position", new T3.BufferAttribute(pp, 3));
  const dot = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.4, "rgba(255,240,210,.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new T3.CanvasTexture(c); return t; })();
  const pmat = new T3.PointsMaterial({ size: 0.022, map: dot, transparent: true, opacity: 0.55, depthWrite: false, blending: T3.AdditiveBlending, color: 0xffe2b8 });
  const dust = new T3.Points(pg, pmat); scene.add(dust);

  /* ---------- textures ---------- */
  const texCache = new Map(); let texVer = 0;
  const blankTex = {};
  function tex(i, side) {
    const key = `${texVer}|${i}|${side}`; let t = texCache.get(key);
    if (t) { texCache.delete(key); texCache.set(key, t); return t; }
    const c = hooks.canvas(i, side); if (!c) return null;
    t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; t.anisotropy = maxAniso; t.minFilter = T3.LinearMipmapLinearFilter;
    texCache.set(key, t);
    while (texCache.size > 12) { const [k, old] = texCache.entries().next().value; texCache.delete(k); old.dispose(); }
    return t;
  }
  function setMap(mat, t) { if (mat.map !== t) { mat.map = t; mat.needsUpdate = true; } S.dirty = true; }

  /* ---------- view state ---------- */
  const S = { single: false, view: { l: -1, r: 0 }, anim: null, drag: null, zoom: 1, panX: 0, open: 1, theme: "paper", progress: 0, dirty: true, running: true };
  function applyTheme(theme) {
    const th = THEMES[theme] || THEMES.paper; S.theme = theme;
    if (deskMat.map) deskMat.map.dispose(); deskMat.map = woodTexture(th.desk); deskMat.needsUpdate = true;
    lamp.color.setHex(th.lamp); hemi.color.setHex(th.amb); scene.background = new T3.Color(theme === "contrast" ? 0x0a0a0a : 0x05080d); fog.color.copy(scene.background);
    paperTopMat.color.set(th.bg); coverInMat.color.set(th.bg2);
    lamp.intensity = theme === "night" ? 30 : 46; hemi.intensity = theme === "night" ? 0.6 : 0.9;
  }
  function showView(v) {
    S.view = v;
    const L = v.l >= 0 && !S.single ? tex(v.l, "l") : null, R = v.r >= 0 ? tex(v.r, "r") : null;
    pageL.visible = !S.single && !S.openAnim; setMap(pageL.material, L || blank("l")); setMap(pageR.material, R || blank("r"));
    S.dirty = true;
  }
  function blank(side) { const k = `${texVer}|${side}`; if (!blankTex[k]) { const c = hooks.canvas(-1, side); const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; blankTex[k] = t; } return blankTex[k]; }

  /* ---------- camera ---------- */
  function frame() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h;
    const halfW = S.single ? 0.56 : 1.1, halfH = H * 0.5 + 0.08, tan = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(halfW / (tan * camera.aspect), halfH / tan) * 1.04 / S.zoom;
    const el = (S.single ? 72 : 62) * Math.PI / 180, tx = (S.single ? W / 2 : 0) + S.panX;
    camera.position.set(tx, dist * Math.sin(el) * S.open + 0.0, dist * Math.cos(el) * S.open + 0.12);
    camera.lookAt(tx, 0, 0.02); camera.updateProjectionMatrix(); S.dirty = true;
  }

  /* ---------- flipping ---------- */
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function startLeaf(dir, from, to) {
    // forward: leaf front = from.r, back = to.l (blank in single mode). Under it: to.r on the right.
    // back: leaf front = to.r, back = from.l. Under it: to.l on the left.
    if (dir > 0) { setMap(leafF.material, tex(from.r, "r") || blank("r")); setMap(leafB.material, S.single ? blank("l") : (tex(to.l, "l") || blank("l"))); setMap(pageR.material, to.r >= 0 ? tex(to.r, "r") || blank("r") : blank("r")); }
    else { setMap(leafF.material, to.r >= 0 ? tex(to.r, "r") || blank("r") : blank("r")); setMap(leafB.material, S.single ? blank("l") : (tex(from.l, "l") || blank("l"))); if (!S.single) setMap(pageL.material, to.l >= 0 ? tex(to.l, "l") || blank("l") : blank("l")); }
    leaf.visible = true;
  }
  function flip(dir, to, opts = {}) {
    return new Promise((res) => {
      if (S.anim || S.drag) { res(false); return; }
      const from = S.view; startLeaf(dir, from, to);
      const t0 = dir > 0 ? 0 : 1, t1 = dir > 0 ? 1 : 0, dur = opts.dur || 820, start = performance.now();
      const skew = opts.skew != null ? opts.skew : 0.35 * (Math.random() - 0.3);
      hooks.sound && hooks.sound();
      S.anim = { step(now) { const k = Math.min(1, (now - start) / dur), e = ease(k), t = t0 + (t1 - t0) * e; bendLeaf(t, dir * 1.1 * Math.sin(Math.PI * e), skew); if (k >= 1) { finish(dir, to); res(true); } } };
    });
  }
  function finish(dir, to) { leaf.visible = false; S.anim = null; S.drag = null; showView(to); hooks.commit && hooks.commit(dir, to); }

  /* ---------- pointer: drag a corner, click an edge, tap a paragraph ---------- */
  const ray = new T3.Raycaster(), ndc = new T3.Vector2(), plane = new T3.Vector3();
  function toNDC(e) { const r = cvs.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function onPlane(e) { toNDC(e); const o = ray.ray.origin, d = ray.ray.direction, y = topY; if (Math.abs(d.y) < 1e-5) return null; const k = (y - o.y) / d.y; return plane.set(o.x + d.x * k, y, o.z + d.z * k); }
  const pointers = new Map(); let pinch0 = 0, zoom0 = 1, down = null;
  cvs.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, e); cvs.setPointerCapture(e.pointerId);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); zoom0 = S.zoom; down = null; return; }
    const p = onPlane(e); down = p ? { x: e.clientX, y: e.clientY, px: p.x, pz: p.z, t: performance.now() } : null;
  });
  cvs.addEventListener("pointermove", (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (pinch0) { const k = d / pinch0; if (k > 1.25 || k < 0.8) { hooks.zoomStep && hooks.zoomStep(k > 1 ? 1 : -1); pinch0 = d; } } return; }
    if (!down) { hover(e); return; }
    const p = onPlane(e); if (!p) return;
    if (!S.drag && !S.anim && Math.abs(e.clientX - down.x) > 10) {
      const dir = down.px > (S.single ? W * 0.15 : 0) && e.clientX < down.x ? 1 : down.px < (S.single ? W * 0.5 : 0) && e.clientX > down.x ? -1 : 0;
      const to = dir ? hooks.peek(dir) : null;
      if (dir && to) { const from = S.view; startLeaf(dir, from, to); S.drag = { dir, to, t: dir > 0 ? 0 : 1, skew: Math.max(-1, Math.min(1, down.pz / (H / 2))), lastX: p.x, v: 0, lt: performance.now() }; hooks.sound && hooks.sound(); }
      else down = null;
    }
    if (S.drag) {
      const span = S.single ? 1.25 * W : 2 * W, t = Math.max(0, Math.min(1, (W - p.x) / span));
      const now = performance.now(); S.drag.v = (p.x - S.drag.lastX) / Math.max(1, now - S.drag.lt); S.drag.lastX = p.x; S.drag.lt = now;
      S.drag.t = t; const skew = S.drag.skew * 0.9 + Math.max(-1, Math.min(1, p.z / (H / 2))) * 0.1;
      bendLeaf(t, S.drag.dir * (0.6 + Math.min(0.9, Math.abs(S.drag.v) * 120)) * Math.sin(Math.PI * Math.max(0.04, t)), skew); S.dirty = true;
    }
  });
  const up = (e) => {
    pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = 0;
    if (S.drag) { release(); down = null; return; }
    if (down && Math.abs(e.clientX - down.x) < 8 && Math.abs(e.clientY - down.y) < 8) click(e);
    down = null;
  };
  cvs.addEventListener("pointerup", up); cvs.addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); if (S.drag) release(); down = null; });
  function release() {
    const d = S.drag, flick = d.dir > 0 ? d.v < -0.0012 : d.v > 0.0012;
    const done = d.dir > 0 ? d.t > 0.4 || flick : d.t < 0.6 || flick;
    const t0 = d.t, t1 = done ? (d.dir > 0 ? 1 : 0) : (d.dir > 0 ? 0 : 1), start = performance.now(), dur = 160 + 520 * Math.abs(t1 - t0), skew = d.skew;
    S.drag = null;
    S.anim = { step(now) { const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3), t = t0 + (t1 - t0) * e; bendLeaf(t, d.dir * 0.9 * Math.sin(Math.PI * t) * (1 - k * 0.5), skew); if (k >= 1) { if (done) finish(d.dir, d.to); else { leaf.visible = false; S.anim = null; showView(S.view); } } } };
  }
  function click(e) {
    toNDC(e);
    const hits = ray.intersectObjects([pageR, pageL].filter((m) => m.visible), false);
    if (!hits.length) return;
    const h = hits[0], right = h.object === pageR, u = h.uv.x, v = h.uv.y;
    const edge = right ? u > 0.86 : u < 0.14;
    if (edge) { hooks.edge && hooks.edge(right ? 1 : -1); return; }
    const pageIdx = right ? S.view.r : S.view.l; if (pageIdx < 0) return;
    hooks.tap && hooks.tap(pageIdx, right ? "r" : "l", u * PW, (1 - v) * PH, e.clientX, e.clientY);
  }
  function hover(e) {
    toNDC(e); const hits = ray.intersectObjects([pageR, pageL].filter((m) => m.visible), false);
    if (!hits.length) { cvs.style.cursor = "default"; return; }
    const h = hits[0], right = h.object === pageR, u = h.uv.x;
    cvs.style.cursor = (right ? u > 0.86 : u < 0.14) ? (right ? "e-resize" : "w-resize") : "grab";
  }
  let wheelT = 0; // ctrl or pinch wheel asks the reader for a text zoom step; the camera stays framed
  cvs.addEventListener("wheel", (e) => { if (!e.ctrlKey) return; e.preventDefault(); const now = performance.now(); if (now - wheelT < 300) return; wheelT = now; hooks.zoomStep && hooks.zoomStep(e.deltaY > 0 ? -1 : 1); }, { passive: false });
  function setZoom(z) { S.zoom = Math.max(0.8, Math.min(2.6, z)); if (S.zoom <= 1.02) S.panX = 0; frame(); hooks.zoomed && hooks.zoomed(S.zoom); }

  /* ---------- loop ---------- */
  let last = performance.now(), raf = 0, avg = 0, frames = 0, slow = false;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!S.running || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (S.anim) S.anim.step(now);
    if (S.openAnim) S.openAnim(now);
    const arr = pg.attributes.position.array;
    for (let i = 0; i < PN; i++) { ps[i] += dt * 0.25; arr[i * 3] += Math.sin(ps[i] * 1.3 + i) * dt * 0.03; arr[i * 3 + 1] += Math.cos(ps[i] + i * 0.7) * dt * 0.02 + dt * 0.006; if (arr[i * 3 + 1] > 2.3) arr[i * 3 + 1] = 0.05; }
    pg.attributes.position.needsUpdate = true;
    const active = S.anim || S.drag || S.openAnim || (dust.visible && !slow);
    if (!active && !S.dirty) return;
    S.dirty = false; const r0 = performance.now(); renderer.render(scene, camera); const rt = performance.now() - r0;
    avg = avg * 0.9 + rt * 0.1; if (++frames > 30 && avg > 45 && !slow) { slow = true; dust.visible = false; }
  }

  /* ---------- open animation: the cover swings open ---------- */
  function openBook(coverImg, color) {
    return new Promise((res) => {
      if (coverImg) { const t = new T3.Texture(coverImg); t.colorSpace = T3.SRGBColorSpace; t.needsUpdate = true; t.anisotropy = maxAniso; coverTopMat.map = t; } else coverTopMat.map = null;
      coverTopMat.color.set(coverImg ? 0xffffff : color || 0x14263c); coverTopMat.needsUpdate = true;
      boardMat.color.set(color || 0x14263c);
      coverPivot.visible = true; coverPivot.rotation.z = 0; pageL.visible = false; stackL.visible = false;
      const start = performance.now(), dur = 1500; S.open = 1.55; frame();
      S.openAnim = (now) => {
        const k = Math.min(1, (now - start) / dur), e = ease(k);
        coverPivot.rotation.z = Math.PI * Math.min(1, Math.max(0, (k - 0.12) / 0.8) ** 1.1 * 1);
        if (coverPivot.rotation.z > Math.PI / 2) { pageL.visible = !S.single; stackL.visible = true; }
        S.open = 1.55 - 0.55 * e; frame();
        if (k >= 1) { coverPivot.rotation.z = Math.PI; S.openAnim = null; S.open = 1; frame(); res(); }
      };
    });
  }
  function skipOpen() { coverPivot.rotation.z = Math.PI; pageL.visible = !S.single; stackL.visible = true; S.open = 1; S.openAnim = null; frame(); }

  const ro = new ResizeObserver(() => frame()); ro.observe(host);
  applyTheme("paper"); setStacks(0); bendLeaf(0, 0, 0); frame(); raf = requestAnimationFrame(loop);

  return {
    kind: "3d",
    setSingle(v) { S.single = v; pageL.visible = !v && coverPivot.rotation.z > Math.PI / 2; frame(); },
    show(view, progress) { if (progress != null) setStacks(progress); showView(view); },
    flip, openBook, skipOpen,
    theme(t) { applyTheme(t); },
    invalidate() { texVer++; for (const t of texCache.values()) t.dispose(); texCache.clear(); for (const k in blankTex) { blankTex[k].dispose(); delete blankTex[k]; } showView(S.view); },
    zoom() { setZoom(1); }, // text zoom lives in the reader and re-paginates
    pan(dx) { if (S.zoom > 1.05) { S.panX = Math.max(-0.8, Math.min(0.8, S.panX + dx)); frame(); } },
    particles(on) { dust.visible = !!on && !slow; S.dirty = true; },
    busy() { return !!(S.anim || S.drag || S.openAnim); },
    pause(p) { S.running = !p; },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); for (const t of texCache.values()) t.dispose(); renderer.dispose(); cvs.remove(); },
  };
}
