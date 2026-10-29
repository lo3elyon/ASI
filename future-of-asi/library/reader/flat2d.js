/* Threshold reader: the fast 2D book. Used when WebGL is missing, when motion is reduced,
   or when the reader picks it. Same pages as the 3D book, painted on two canvases. */
import { PW, PH } from "./paginate.js";

export function createBook2D(host, hooks, opts = {}) {
  const calm = () => opts.calm();
  const el = document.createElement("div"); el.className = "f2"; host.appendChild(el);
  el.innerHTML = `<div class="f2-book"><div class="f2-pg l"><canvas></canvas></div><div class="f2-pg r"><canvas></canvas></div><div class="f2-leaf" hidden><div class="f2-face front"><canvas></canvas></div><div class="f2-face back"><canvas></canvas></div></div></div>`;
  const bookEl = el.firstElementChild, [cl, cr] = el.querySelectorAll(".f2-pg canvas"), leaf = el.querySelector(".f2-leaf"), [lf, lb] = leaf.querySelectorAll("canvas");
  const S = { single: false, view: { l: -1, r: 0 }, busy: false, zoom: 1 };
  const copy = (dst, src) => { if (!src) { dst.width = 2; dst.height = 3; return; } dst.width = src.width; dst.height = src.height; dst.getContext("2d").drawImage(src, 0, 0); };
  function size() {
    const w = host.clientWidth, h = host.clientHeight, ratio = PW / PH, n = S.single ? 1 : 2;
    let ph = Math.min(h * 0.92, (w * 0.94) / n / ratio) * S.zoom, pw = ph * ratio;
    bookEl.style.width = `${pw * n}px`; bookEl.style.height = `${ph}px`; el.classList.toggle("single", S.single);
  }
  function show(view) {
    S.view = view;
    copy(cr, view.r >= 0 ? hooks.canvas(view.r, "r") : hooks.canvas(-1, "r"));
    if (!S.single) copy(cl, view.l >= 0 ? hooks.canvas(view.l, "l") : hooks.canvas(-1, "l"));
  }
  function flip(dir, to) {
    return new Promise((res) => {
      if (S.busy) { res(false); return; }
      hooks.sound && hooks.sound();
      if (calm()) { // reduced motion: a quick cross fade, no movement
        S.busy = true; bookEl.classList.add("fade"); setTimeout(() => { show(to); bookEl.classList.remove("fade"); S.busy = false; hooks.commit(dir, to); res(true); }, 140); return;
      }
      S.busy = true; const from = S.view;
      if (dir > 0) { copy(lf, hooks.canvas(from.r, "r")); copy(lb, S.single ? hooks.canvas(-1, "l") : to.l >= 0 ? hooks.canvas(to.l, "l") : hooks.canvas(-1, "l")); copy(cr, to.r >= 0 ? hooks.canvas(to.r, "r") : hooks.canvas(-1, "r")); }
      else { copy(lf, to.r >= 0 ? hooks.canvas(to.r, "r") : hooks.canvas(-1, "r")); copy(lb, from.l >= 0 ? hooks.canvas(from.l, "l") : hooks.canvas(-1, "l")); if (!S.single) copy(cl, to.l >= 0 ? hooks.canvas(to.l, "l") : hooks.canvas(-1, "l")); }
      leaf.hidden = false; leaf.className = `f2-leaf ${dir > 0 ? "fwd" : "bwd"}`; void leaf.offsetWidth; leaf.classList.add("go");
      setTimeout(() => { leaf.hidden = true; leaf.className = "f2-leaf"; show(to); S.busy = false; hooks.commit(dir, to); res(true); }, 620);
    });
  }
  // pointer: tap a paragraph, tap an edge, swipe to turn
  let d0 = null;
  bookEl.addEventListener("pointerdown", (e) => { d0 = { x: e.clientX, y: e.clientY }; try { bookEl.setPointerCapture(e.pointerId); } catch (er) {} });
  bookEl.addEventListener("pointerup", (e) => {
    if (!d0) return; const dx = e.clientX - d0.x, dy = e.clientY - d0.y; d0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { hooks.edge(dx < 0 ? 1 : -1); return; }
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) return;
    const hit = document.elementFromPoint(e.clientX, e.clientY), c = hit && hit.closest ? hit.closest("canvas") : null; if (!c || c.closest(".f2-leaf") || !bookEl.contains(c)) return;
    const right = c === cr, r = c.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    if (right ? u > 0.86 : u < 0.14) { hooks.edge(right ? 1 : -1); return; }
    const idx = right ? S.view.r : S.view.l; if (idx < 0) return;
    hooks.tap(idx, right ? "r" : "l", u * PW, v * PH, e.clientX, e.clientY);
  });
  const ro = new ResizeObserver(size); ro.observe(host); size();
  return {
    kind: "2d",
    setSingle(v) { S.single = v; size(); show(S.view); },
    show(view) { show(view); },
    flip, openBook() { el.classList.add("opening"); setTimeout(() => el.classList.remove("opening"), 700); return Promise.resolve(); }, skipOpen() {},
    theme() {}, invalidate() { show(S.view); }, particles() {}, pause() {}, pan() {},
    zoom(f) { S.zoom = f === 0 ? 1 : Math.max(0.7, Math.min(1.8, S.zoom * f)); size(); hooks.zoomed && hooks.zoomed(S.zoom); },
    busy() { return S.busy; },
    destroy() { ro.disconnect(); el.remove(); },
  };
}
