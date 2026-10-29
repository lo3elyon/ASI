/* WebGL globe for the Organisations page: dotted land, glowing pins, drag to turn, scroll to spin.
   three.js is a vendored, minified subset. Falls back to a message if WebGL is missing. */
import { RM, load } from "../util.js";

export async function mountGlobe(host, pins, { onHover, onPick } = {}) {
  const T = await import("../../vendor/three-globe.min.mjs");
  const land = await fetch("assets/geo/land-2deg.json").then((r) => r.json()).catch(() => []);
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
  catch (e) { host.insertAdjacentHTML("beforeend", `<div class="fallback">This browser has no WebGL, so the globe is off. The list below has everything.</div>`); return () => {}; }
  const dpr = Math.min(2, devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(36, 1, 0.1, 100); cam.position.set(0, 0, 4.1);
  const world = new T.Group(); scene.add(world);
  const R = 1;
  const toV = (lat, lng, r = R) => { const phi = (90 - lat) * (Math.PI / 180), th = (lng + 180) * (Math.PI / 180); return new T.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
  // ocean sphere and atmosphere
  world.add(new T.Mesh(new T.SphereGeometry(R * 0.995, 64, 48), new T.MeshBasicMaterial({ color: 0x0a1a2c })));
  const atm = new T.ShaderMaterial({ transparent: true, side: T.BackSide, blending: T.AdditiveBlending, depthWrite: false,
    vertexShader: "varying vec3 n; void main(){ n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "varying vec3 n; void main(){ float i = pow(max(0.0, 0.62 - dot(n, vec3(0.0,0.0,1.0))), 2.2); gl_FragColor = vec4(0.13,0.83,0.93,1.0) * i * 0.9; }" });
  scene.add(new T.Mesh(new T.SphereGeometry(R * 1.1, 64, 48), atm));
  // land dots
  const pos = [];
  for (let i = 0; i < land.length; i += 2) { const v = toV(land[i + 1], land[i], R * 1.002); pos.push(v.x, v.y, v.z); }
  const lg = new T.BufferGeometry(); lg.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  world.add(new T.Points(lg, new T.PointsMaterial({ color: 0x3fb8c9, size: 0.014, transparent: true, opacity: 0.75 })));
  // pins
  const dot = document.createElement("canvas"); dot.width = dot.height = 64;
  const g = dot.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "#fff"); gr.addColorStop(0.25, "rgba(255,255,255,.9)"); gr.addColorStop(0.5, "rgba(255,255,255,.25)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new T.CanvasTexture(dot);
  const sprites = pins.map((p) => {
    const m = new T.SpriteMaterial({ map: tex, color: new T.Color(p.c || "#22d3ee"), transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    const s = new T.Sprite(m); const v = toV(p.lat, p.lng, R * 1.02); s.position.copy(v); const sz = 0.05 + Math.min(0.1, Math.sqrt(p.n || 1) * 0.022); s.scale.set(sz, sz, sz); s.userData = p; world.add(s);
    const lineG = new T.BufferGeometry().setFromPoints([toV(p.lat, p.lng, R), toV(p.lat, p.lng, R * 1.06 + (p.n || 1) * 0.004)]);
    world.add(new T.Line(lineG, new T.LineBasicMaterial({ color: new T.Color(p.c || "#22d3ee"), transparent: true, opacity: 0.8 })));
    return s;
  });
  world.rotation.y = -1.9; world.rotation.x = 0.35;
  let W = 1, H = 1;
  const size = () => { W = host.clientWidth || 300; H = host.clientHeight || W; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); };
  size();
  let drag = null, vy = RM() ? 0 : 0.0016, vx = 0, scrollRot = 0, hover = null, raf = 0, alive = true, vis = true;
  const ray = new T.Raycaster(); const mv = new T.Vector2();
  const onDown = (e) => { drag = { x: e.clientX, y: e.clientY, ry: world.rotation.y, rx: world.rotation.x, moved: 0 }; host.setPointerCapture && host.setPointerCapture(e.pointerId); };
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy)); world.rotation.y = drag.ry + dx * 0.006; world.rotation.x = Math.max(-1, Math.min(1, drag.rx + dy * 0.004)); kick(); return; }
    mv.x = ((e.clientX - r.left) / r.width) * 2 - 1; mv.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(mv, cam); const hit = ray.intersectObjects(sprites)[0];
    const h = hit && facing(hit.object) ? hit.object.userData : null;
    if (h !== hover) { hover = h; host.style.cursor = h ? "pointer" : "grab"; onHover && onHover(h, e.clientX - r.left, e.clientY - r.top); kick(); }
    else if (h && onHover) onHover(h, e.clientX - r.left, e.clientY - r.top);
  };
  const onUp = (e) => { const was = drag; drag = null; if (was && was.moved < 6 && hover && onPick) onPick(hover); };
  const facing = (s) => { const wp = s.getWorldPosition(new T.Vector3()); return wp.z > 0.1; };
  host.addEventListener("pointerdown", onDown); host.addEventListener("pointermove", onMove); host.addEventListener("pointerup", onUp);
  host.addEventListener("pointerleave", () => { if (!drag) { hover = null; onHover && onHover(null); } });
  host.addEventListener("scrollspin", (e) => { const nr = e.detail * Math.PI * 1.4; world.rotation.y += nr - scrollRot; scrollRot = nr; kick(); });
  const ro = new ResizeObserver(() => { size(); kick(); }); ro.observe(host);
  const io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) kick(); }); io.observe(host);
  let tt = 0;
  function frame(t) {
    raf = 0; if (!alive) return;
    if (!drag && !RM()) world.rotation.y += vy;
    sprites.forEach((s, i) => { const base = 0.05 + Math.min(0.1, Math.sqrt(s.userData.n || 1) * 0.022); const k = RM() ? 1 : 1 + 0.18 * Math.sin(t / 600 + i); const hv = s.userData === hover ? 1.8 : 1; s.scale.set(base * k * hv, base * k * hv, 1); });
    renderer.render(scene, cam);
    if (vis && !document.hidden && !RM()) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };
  kick();
  return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); renderer.domElement.remove(); };
}
