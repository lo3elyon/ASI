/* Atlas globe for the Organisations page (Round 3). Built on the vendored three.js subset.
   Dotted land, glowing pins, arcs between organisations that share people, region filter, focus and tour.
   Renders only while visible and the tab is shown; reduced motion keeps it still. */
import { RM } from "../util.js";

export async function mountGlobe3(host, pins, arcs, { onHover, onPick } = {}) {
  const T = await import("../../vendor/three-globe.min.mjs");
  const land = await fetch("assets/geo/land-2deg.json").then((r) => r.json()).catch(() => []);
  let renderer;
  /* Check for WebGL first, so browsers without it get the flat map with no console noise */
  try { const c = document.createElement("canvas"); if (!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))) return null; } catch (e) { return null; }
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
  catch (e) { return null; }
  if (!renderer || !renderer.getContext || !renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  host.appendChild(renderer.domElement); renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(36, 1, 0.1, 100); cam.position.set(0, 0, 4.1);
  const world = new T.Group(); scene.add(world);
  const toV = (lat, lng, r = 1) => { const phi = (90 - lat) * (Math.PI / 180), th = (lng + 180) * (Math.PI / 180); return new T.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
  world.add(new T.Mesh(new T.SphereGeometry(0.995, 64, 48), new T.MeshBasicMaterial({ color: 0x081a2a })));
  scene.add(new T.Mesh(new T.SphereGeometry(1.1, 64, 48), new T.ShaderMaterial({ transparent: true, side: T.BackSide, blending: T.AdditiveBlending, depthWrite: false,
    vertexShader: "varying vec3 n; void main(){ n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "varying vec3 n; void main(){ float i = pow(max(0.0, 0.62 - dot(n, vec3(0.0,0.0,1.0))), 2.2); gl_FragColor = vec4(0.05,0.65,0.91,1.0) * i * 0.95; }" })));
  // meridians and parallels, the atlas look
  const grat = [];
  for (let lng = -180; lng < 180; lng += 30) for (let lat = -80; lat < 80; lat += 4) { const a = toV(lat, lng, 1.001), b = toV(lat + 4, lng, 1.001); grat.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  for (let lat = -60; lat <= 60; lat += 30) for (let lng = -180; lng < 180; lng += 4) { const a = toV(lat, lng, 1.001), b = toV(lat, lng + 4, 1.001); grat.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  const gg = new T.BufferGeometry(); gg.setAttribute("position", new T.Float32BufferAttribute(grat, 3));
  // three subset has Line only: draw segments as one strip per pair is costly, so use Points along the lines instead
  const gp = []; for (let i = 0; i < grat.length; i += 6) gp.push(grat[i], grat[i + 1], grat[i + 2]);
  const gpg = new T.BufferGeometry(); gpg.setAttribute("position", new T.Float32BufferAttribute(gp, 3));
  world.add(new T.Points(gpg, new T.PointsMaterial({ color: 0x0ea5e9, size: 0.006, transparent: true, opacity: 0.35 })));
  const pos = []; for (let i = 0; i < land.length; i += 2) { const v = toV(land[i + 1], land[i], 1.002); pos.push(v.x, v.y, v.z); }
  const lg = new T.BufferGeometry(); lg.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  world.add(new T.Points(lg, new T.PointsMaterial({ color: 0x38bdf8, size: 0.014, transparent: true, opacity: 0.72 })));
  // pin texture
  const dot = document.createElement("canvas"); dot.width = dot.height = 64; const g = dot.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "#fff"); gr.addColorStop(0.25, "rgba(255,255,255,.9)"); gr.addColorStop(0.5, "rgba(255,255,255,.25)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new T.CanvasTexture(dot);
  const base = (p) => 0.05 + Math.min(0.1, Math.sqrt(p.n || 1) * 0.022);
  const sprites = pins.map((p) => {
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, color: new T.Color(p.c || "#22d3ee"), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    s.position.copy(toV(p.lat, p.lng, 1.02)); s.userData = p; world.add(s);
    const st = new T.Line(new T.BufferGeometry().setFromPoints([toV(p.lat, p.lng, 1), toV(p.lat, p.lng, 1.06 + (p.n || 1) * 0.004)]), new T.LineBasicMaterial({ color: new T.Color(p.c || "#22d3ee"), transparent: true, opacity: 0.8 }));
    world.add(st); s.userData._stem = st; return s;
  });
  // arcs: great circle lifted by distance
  const N = 48;
  const arcObjs = arcs.map((a, k) => {
    const A = toV(a.a.lat, a.a.lng, 1), B = toV(a.b.lat, a.b.lng, 1); const ang = A.angleTo ? A.angleTo(B) : Math.acos(Math.max(-1, Math.min(1, A.dot(B))));
    const pts = []; for (let i = 0; i <= N; i++) { const t = i / N; const s0 = Math.sin((1 - t) * ang) / Math.sin(ang || 1e-6), s1 = Math.sin(t * ang) / Math.sin(ang || 1e-6); const v = new T.Vector3(A.x * s0 + B.x * s1, A.y * s0 + B.y * s1, A.z * s0 + B.z * s1); const h = 1.01 + Math.sin(Math.PI * t) * (0.08 + ang * 0.16); v.normalize(); v.multiplyScalar(h); pts.push(v); }
    const geo = new T.BufferGeometry().setFromPoints(pts);
    const line = new T.Line(geo, new T.LineBasicMaterial({ color: new T.Color(a.c || "#22d3ee"), transparent: true, opacity: Math.min(0.85, 0.3 + a.w * 0.12), blending: T.AdditiveBlending, depthWrite: false }));
    world.add(line);
    const comet = new T.Sprite(new T.SpriteMaterial({ map: tex, color: new T.Color("#fef3c7"), transparent: true, depthWrite: false, blending: T.AdditiveBlending })); comet.scale.set(0.035, 0.035, 1); world.add(comet);
    return { line, geo, pts, comet, a, ph: (k * 0.137) % 1 };
  });
  world.rotation.y = -1.9; world.rotation.x = 0.35;
  let W = 1, H = 1;
  const size = () => { W = host.clientWidth || 300; H = host.clientHeight || W; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); };
  size();
  let drag = null, hover = null, raf = 0, alive = true, vis = true, target = null, showArcs = true, filter = () => true, scrollRot = 0;
  const spin = RM() ? 0 : 0.0015;
  const ray = new T.Raycaster(), mv = new T.Vector2();
  const facing = (s) => s.getWorldPosition(new T.Vector3()).z > 0.1;
  const onDown = (e) => { drag = { x: e.clientX, y: e.clientY, ry: world.rotation.y, rx: world.rotation.x, moved: 0 }; target = null; host.setPointerCapture && host.setPointerCapture(e.pointerId); };
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy)); world.rotation.y = drag.ry + dx * 0.006; world.rotation.x = Math.max(-1.1, Math.min(1.1, drag.rx + dy * 0.004)); kick(); return; }
    mv.x = ((e.clientX - r.left) / r.width) * 2 - 1; mv.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(mv, cam); const hit = ray.intersectObjects(sprites.filter((s) => s.visible))[0];
    const h = hit && facing(hit.object) ? hit.object.userData : null;
    if (h !== hover) { hover = h; host.style.cursor = h ? "pointer" : "grab"; kick(); }
    onHover && onHover(h, e.clientX - r.left, e.clientY - r.top);
  };
  const onUp = () => { const was = drag; drag = null; if (was && was.moved < 6 && hover && onPick) onPick(hover); };
  host.addEventListener("pointerdown", onDown); host.addEventListener("pointermove", onMove); host.addEventListener("pointerup", onUp);
  host.addEventListener("pointerleave", () => { if (!drag) { hover = null; onHover && onHover(null); } });
  host.addEventListener("scrollspin", (e) => { const nr = e.detail * Math.PI * 1.2; if (!target) world.rotation.y += nr - scrollRot; scrollRot = nr; kick(); });
  const ro = new ResizeObserver(() => { size(); kick(); }); ro.observe(host);
  const io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) kick(); }); io.observe(host);
  const onVis = () => { if (!document.hidden) kick(); }; document.addEventListener("visibilitychange", onVis);
  function frame(t) {
    raf = 0; if (!alive) return;
    if (target) { let dy = target.ry - world.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); const k = RM() ? 1 : 0.08; world.rotation.y += dy * k; world.rotation.x += (target.rx - world.rotation.x) * k; if (Math.abs(dy) < 0.002 && Math.abs(target.rx - world.rotation.x) < 0.002) target = null; }
    else if (!drag) world.rotation.y += spin;
    sprites.forEach((s, i) => { const b = base(s.userData); const k = RM() ? 1 : 1 + 0.18 * Math.sin(t / 600 + i); const hv = s.userData === hover || s.userData._sel ? 1.9 : 1; s.scale.set(b * k * hv, b * k * hv, 1); });
    arcObjs.forEach((o) => {
      const on = showArcs && o.line.visible; o.comet.visible = on && !RM();
      if (!on) return;
      const p = RM() ? 1 : ((t / 3200 + o.ph) % 1.4) / 1.4; const n = Math.max(2, Math.round(p * 1.4 * N));
      o.geo.setDrawRange(0, Math.min(N + 1, n)); const ci = Math.min(N, Math.max(0, n - 1)); o.comet.position.copy(o.pts[ci]); o.comet.visible = o.comet.visible && n <= N;
    });
    renderer.render(scene, cam);
    if (vis && !document.hidden && !RM()) raf = requestAnimationFrame(frame);
    else if (target) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };
  kick();
  const api = {
    focus(lat, lng) { const v = toV(lat, lng, 1); const ry = Math.atan2(-v.x, v.z); target = { ry, rx: Math.max(-1.1, Math.min(1.1, (lat * Math.PI) / 180)) }; kick(); },
    select(pin) { sprites.forEach((s) => (s.userData._sel = s.userData === pin)); kick(); },
    setFilter(fn) { filter = fn; sprites.forEach((s) => { const on = !!fn(s.userData); s.visible = on; s.userData._stem.visible = on; }); arcObjs.forEach((o) => (o.line.visible = !!fn(o.a.a) && !!fn(o.a.b))); kick(); },
    setArcs(on) { showArcs = on; arcObjs.forEach((o) => { o.line.material.opacity = on ? Math.min(0.85, 0.3 + o.a.w * 0.12) : 0; }); kick(); },
    project(pin) { const v = toV(pin.lat, pin.lng, 1.02).applyMatrix4(world.matrixWorld); const f = v.z > 0.1; v.project(cam); return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, front: f }; },
    stop() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); renderer.domElement.remove(); },
  };
  return api;
}
