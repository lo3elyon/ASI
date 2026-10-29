/* Threshold library: a 3D bookshelf. Books stand face out on three lit shelves, lean out
   when you point at them, glow in their shelf colour and fly towards you when opened. */
export async function createShelf(host, opts) {
  const T3 = await import("../assets/vendor/three-lib.min.mjs");
  const calm = opts.calm;
  const mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 760;
  const renderer = new T3.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFShadowMap;
  renderer.toneMapping = T3.ACESFilmicToneMapping; renderer.outputColorSpace = T3.SRGBColorSpace;
  const cvs = renderer.domElement; cvs.className = "sh-canvas"; host.appendChild(cvs);
  const scene = new T3.Scene(), camera = new T3.PerspectiveCamera(30, 1, 0.1, 40);
  const ROWS = 3, BW = 0.42, BH = 0.63, BD = 0.075, GAP = 0.5, ROWH = 0.98;

  // wall and shelves
  const wallC = document.createElement("canvas"); wallC.width = 512; wallC.height = 512; { const g = wallC.getContext("2d"); const gr = g.createRadialGradient(256, 200, 20, 256, 256, 380); gr.addColorStop(0, "#132640"); gr.addColorStop(1, "#060d18"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; g.fillRect(Math.random() * 512, Math.random() * 512, 1, 1); } }
  const wallT = new T3.CanvasTexture(wallC); wallT.colorSpace = T3.SRGBColorSpace;
  const wall = new T3.Mesh(new T3.PlaneGeometry(60, 8), new T3.MeshStandardMaterial({ map: wallT, roughness: 1 })); wall.position.set(0, 0, -0.25); wall.receiveShadow = true; scene.add(wall);
  const woodC = document.createElement("canvas"); woodC.width = 1024; woodC.height = 64; { const g = woodC.getContext("2d"); g.fillStyle = "#3a2716"; g.fillRect(0, 0, 1024, 64); for (let i = 0; i < 80; i++) { g.strokeStyle = `rgba(${Math.random() > 0.5 ? "255,210,160" : "0,0,0"},${0.05 + Math.random() * 0.08})`; g.beginPath(); const y = Math.random() * 64; g.moveTo(0, y); for (let x = 0; x < 1024; x += 40) g.lineTo(x, y + Math.sin(x / 70 + i) * 2); g.stroke(); } }
  const woodT = new T3.CanvasTexture(woodC); woodT.colorSpace = T3.SRGBColorSpace; woodT.wrapS = T3.RepeatWrapping; woodT.repeat.set(8, 1);
  const plankMat = new T3.MeshStandardMaterial({ map: woodT, roughness: 0.7 });
  const planks = [];
  for (let r = 0; r < ROWS; r++) { const p = new T3.Mesh(new T3.BoxGeometry(1, 0.05, 0.42), plankMat); p.receiveShadow = p.castShadow = true; scene.add(p); planks.push(p); }

  // light
  scene.add(new T3.HemisphereLight(0x9fb6d6, 0x120a04, 0.75));
  const key = new T3.DirectionalLight(0xffe2bd, 1.6); key.position.set(-2, 3, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 3, bottom: -3, near: 0.5, far: 12 }); key.shadow.bias = -0.0005; scene.add(key, key.target);
  const glow = new T3.PointLight(0x22d3ee, 0, 2.2, 1.6); scene.add(glow);

  // shared materials
  const stripeC = document.createElement("canvas"); stripeC.width = 64; stripeC.height = 8; { const g = stripeC.getContext("2d"); for (let x = 0; x < 64; x++) { g.fillStyle = x % 3 ? "#eee6d4" : "#cdbfa5"; g.fillRect(x, 0, 1, 8); } }
  const stripeT = new T3.CanvasTexture(stripeC); stripeT.colorSpace = T3.SRGBColorSpace;
  const pagesMat = new T3.MeshStandardMaterial({ map: stripeT, roughness: 0.95 });
  const geo = new T3.BoxGeometry(BW, BH, BD);
  const loader = new T3.TextureLoader();
  const items = [], texCache = new Map(); let cols = 1, scrollX = 0, targetX = 0, maxX = 0, hovered = null, flying = null, visible = false, entered = false;

  function designed(b) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 384; const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 256, 384); gr.addColorStop(0, "#0e1d31"); gr.addColorStop(1, "#07111f"); g.fillStyle = gr; g.fillRect(0, 0, 256, 384);
    const rg = g.createRadialGradient(210, 0, 4, 210, 0, 230); rg.addColorStop(0, b.shelfColor + "aa"); rg.addColorStop(1, "transparent"); g.fillStyle = rg; g.fillRect(0, 0, 256, 384);
    g.fillStyle = b.shelfColor; g.font = '500 12px "JetBrains Mono", monospace'; g.fillText(`${b.year}${b.kind === "essay" ? "  ESSAY" : ""}`, 22, 44); g.fillRect(22, 300, 60, 3);
    g.fillStyle = "#e8f1fa"; g.font = '400 27px "Instrument Serif", Georgia, serif';
    let line = "", y = 110; for (const w of b.title.split(" ")) { if (g.measureText(line + w).width > 210) { g.fillText(line, 22, y); line = ""; y += 31; if (y > 270) break; } line += w + " "; } if (y <= 270) g.fillText(line, 22, y);
    g.fillStyle = "#b9c9da"; g.font = '600 10px "Space Grotesk", sans-serif'; g.fillText(b.authors.map((a) => a.name).slice(0, 2).join(", ").toUpperCase().slice(0, 34), 22, 330);
    const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return t;
  }
  function spineMat(b) { const c = new T3.Color(b.shelfColor).multiplyScalar(0.45); return new T3.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.1 }); }

  function setList(list) {
    items.forEach((it) => { scene.remove(it.g); it.mat.dispose(); });
    items.length = 0; hovered = null;
    cols = Math.max(1, Math.ceil(list.length / ROWS));
    list.forEach((b, i) => {
      const r = i % ROWS, c = Math.floor(i / ROWS);
      const coverMat = new T3.MeshStandardMaterial({ roughness: 0.45, metalness: 0.04, emissive: new T3.Color(b.shelfColor), emissiveIntensity: 0 });
      let t = texCache.get(b.id); if (!t) { if (b.cover) { t = loader.load(b.cover, () => {}); t.colorSpace = T3.SRGBColorSpace; t.anisotropy = 4; } else t = designed(b); texCache.set(b.id, t); } coverMat.map = t;
      const sm = spineMat(b), m = new T3.Mesh(geo, [pagesMat, sm, pagesMat, pagesMat, coverMat, sm]);
      m.castShadow = true; m.receiveShadow = true;
      const g = new T3.Group(); g.add(m); scene.add(g);
      const lean = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const home = new T3.Vector3(c * GAP - ((cols - 1) * GAP) / 2, (1 - r) * ROWH + BH / 2 - 0.36, 0);
      g.position.copy(home); g.rotation.y = 0.12 * lean; g.rotation.z = 0.02 * lean;
      items.push({ b, g, m, mat: coverMat, cover: coverMat.map, home, lean, lift: 0, drop: entered || calm() ? 0 : 1, delay: c * 0.04 + r * 0.12 });
    });
    const width = cols * GAP + 0.4; dirty = true;
    planks.forEach((p, r) => { p.scale.x = width; p.position.set(0, (1 - r) * ROWH - 0.39, 0.02); });
    fit();
  }
  function fit() {
    dirty = true;
    const w = host.clientWidth || 1, h = host.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h;
    const tan = Math.tan((camera.fov * Math.PI) / 360), dist = (ROWS * ROWH * 0.56) / tan;
    const viewW = 2 * dist * tan * camera.aspect; maxX = Math.max(0, (cols * GAP - viewW) / 2 + 0.35);
    targetX = Math.max(-maxX, Math.min(maxX, targetX));
    camera.position.set(scrollX, 0.18, dist); camera.lookAt(scrollX, 0.05, 0); camera.updateProjectionMatrix();
    opts.onScroll && opts.onScroll(maxX ? (targetX + maxX) / (2 * maxX) : 0, maxX > 0);
  }

  // pointer
  const ray = new T3.Raycaster(), ndc = new T3.Vector2(); let drag = null;
  function pick(e) { const r = cvs.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(items.map((i) => i.m), false)[0]; return h ? items.find((i) => i.m === h.object) : null; }
  cvs.addEventListener("pointermove", (e) => {
    if (drag) { const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; targetX = Math.max(-maxX, Math.min(maxX, drag.sx - dx * 0.006)); fit(); return; }
    const it = pick(e); if (it !== hovered) { hovered = it; dirty = true; cvs.style.cursor = it ? "pointer" : "grab"; opts.onHover && opts.onHover(it ? it.b : null, e); }
    else if (it) opts.onHover && opts.onHover(it.b, e);
  });
  cvs.addEventListener("pointerleave", () => { hovered = null; opts.onHover && opts.onHover(null); });
  cvs.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, sx: targetX, moved: false }; });
  addEventListener("pointerup", (e) => {
    if (!drag) return; const moved = drag.moved; drag = null; if (moved || e.target !== cvs) return;
    const it = pick(e); if (it) fly(it);
  });
  cvs.addEventListener("wheel", (e) => { if (!maxX || Math.abs(e.deltaX) < Math.abs(e.deltaY) && !e.shiftKey) return; e.preventDefault(); targetX = Math.max(-maxX, Math.min(maxX, targetX + (e.deltaX || e.deltaY) * 0.003)); fit(); }, { passive: false });
  function fly(it) {
    if (flying) return;
    if (calm()) { opts.onOpen(it.b.id); return; }
    const start = performance.now(), from = it.g.position.clone(), rot = it.g.rotation.y;
    const to = new T3.Vector3(camera.position.x, camera.position.y - 0.02, camera.position.z - 1.15);
    flying = { it, step(now) { const k = Math.min(1, (now - start) / 720), e = k * k * (3 - 2 * k); it.g.position.lerpVectors(from, to, e); it.g.rotation.y = rot * (1 - e) - e * 0.25; it.g.rotation.x = -e * 0.15; it.mat.emissiveIntensity = 0.25 * e; if (k >= 1) { flying = null; opts.onOpen(it.b.id); setTimeout(() => { it.g.position.copy(it.home); it.g.rotation.set(0, 0.12 * it.lean, 0.02 * it.lean); it.mat.emissiveIntensity = 0; }, 600); } } };
  }

  // loop
  let last = performance.now(), t0 = 0, dirty = true, lastSp = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    // stay idle while the page is hidden, the shelf is off screen or the reader covers it
    if (!visible || document.hidden || document.body.classList.contains("no-scroll")) { last = now; return; }
    // the drop in runs on real time so it ends on time even when frames are slow; easing uses a capped step
    const real = Math.min(0.5, (now - last) / 1000), dt = Math.min(0.05, real); last = now; t0 += real;
    scrollX += (targetX - scrollX) * Math.min(1, dt * 8); camera.position.x = scrollX; camera.lookAt(scrollX, 0.05, 0);
    const sp = opts.scrollY ? opts.scrollY() : 0; camera.position.y = 0.18 + sp * 0.25;
    for (const it of items) {
      if (flying && flying.it === it) continue;
      if (it.drop > 0) { const k = Math.max(0, (t0 - it.delay) * 2.2); it.drop = Math.max(0, 1 - k); }
      const want = hovered === it ? 1 : 0; it.lift += (want - it.lift) * Math.min(1, dt * 10);
      it.g.position.set(it.home.x, it.home.y + it.lift * 0.05 + it.drop * it.drop * 0.9, it.home.z + it.lift * 0.22);
      it.g.rotation.y = 0.12 * it.lean * (1 - it.lift) - it.lift * 0.32; it.g.rotation.x = -it.lift * 0.08;
      it.mat.emissiveIntensity = it.lift * 0.16;
      it.m.scale.setScalar(1 + it.lift * 0.04);
    }
    if (hovered) { glow.color.set(hovered.b.shelfColor); glow.intensity += (2.2 - glow.intensity) * Math.min(1, dt * 6); glow.position.set(hovered.g.position.x, hovered.g.position.y + 0.1, 0.5); } else glow.intensity *= 0.9;
    if (flying) flying.step(now);
    const moving = flying || Math.abs(targetX - scrollX) > 0.0005 || items.some((it) => it.drop > 0 || Math.abs((hovered === it ? 1 : 0) - it.lift) > 0.002) || glow.intensity > 0.02 && !hovered || Math.abs(sp - lastSp) > 0.001;
    lastSp = sp;
    if (!moving && !dirty) return;
    dirty = false; renderer.render(scene, camera);
  }
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !entered) { entered = true; t0 = 0; } }, { threshold: 0.05 }); io.observe(host);
  new ResizeObserver(fit).observe(host);
  requestAnimationFrame(loop);
  return { setList, scrollBy(d) { targetX = Math.max(-maxX, Math.min(maxX, targetX + d)); fit(); }, refresh() {} };
}
