/* Flat atlas for the Organisations page when WebGL is missing. Same API as the globe (focus, select, setFilter,
   setArcs, stop), so the region chips, the tour and "Show on globe" keep working. Map: 2 degree dot grid,
   x = lon + 180, y = 80 - lat, viewBox 0 0 360 140. Every pin is a real button, so it works with a keyboard. */
const X = (lng) => lng + 180, Y = (lat) => 80 - lat;
const E = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function mountFlat(host, pins, arcs, { onHover, onPick } = {}) {
  host.classList.add("is-flat");
  const vis = pins.filter((p) => p.lat <= 80 && p.lat >= -60);
  const arcD = (a, b) => { const x1 = X(a.lng), y1 = Y(a.lat), x2 = X(b.lng), y2 = Y(b.lat); const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.min(26, Math.hypot(x2 - x1, y2 - y1) * 0.22); return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
  const wrap = document.createElement("div");
  wrap.className = "p3-flat";
  wrap.innerHTML = `<div class="p3-flat-map"><img class="p3-flat-land" src="assets/img/world-dots.svg" alt="" width="360" height="140" aria-hidden="true">
    <svg class="p3-flat-arcs" viewBox="0 0 360 140" preserveAspectRatio="none" aria-hidden="true">${arcs.map((a, i) => `<path data-arc="${i}" d="${arcD(a.a, a.b)}" style="--c:${a.c};--w:${Math.min(1.4, 0.35 + a.w * 0.12)}"/>`).join("")}</svg>
    ${vis.map((p, i) => `<button type="button" class="p3-flat-pin" data-pin="${i}" style="left:${(X(p.lng) / 3.6).toFixed(2)}%;top:${(Y(p.lat) / 1.4).toFixed(2)}%;--c:${p.c};--s:${Math.min(18, 8 + Math.sqrt(p.n) * 3).toFixed(1)}px" aria-label="${E(p.list.length === 1 ? p.list[0].name : `${p.list.length} organisations`)}, ${E(p.list[0].city ? p.list[0].city + ", " : "")}${E(p.list[0].country)}"><i></i></button>`).join("")}</div>`;
  host.appendChild(wrap);
  const btns = [...wrap.querySelectorAll(".p3-flat-pin")];
  const paths = [...wrap.querySelectorAll("[data-arc]")];
  const hostBox = () => host.getBoundingClientRect();
  wrap.addEventListener("click", (e) => { const b = e.target.closest(".p3-flat-pin"); if (b && onPick) onPick(vis[+b.dataset.pin]); });
  const hover = (e) => { const b = e.target.closest && e.target.closest(".p3-flat-pin"); if (!onHover) return; if (!b) { onHover(null); return; } const r = b.getBoundingClientRect(), h = hostBox(); onHover(vis[+b.dataset.pin], r.left - h.left + r.width / 2, r.top - h.top + r.height / 2); };
  wrap.addEventListener("pointerover", hover); wrap.addEventListener("focusin", hover);
  wrap.addEventListener("pointerleave", () => onHover && onHover(null)); wrap.addEventListener("focusout", () => onHover && onHover(null));
  let filter = () => true;
  return {
    flat: true,
    focus(lat, lng) { const p = vis.find((x) => x.lat === lat && x.lng === lng); const b = p && btns[vis.indexOf(p)]; if (b) { b.classList.remove("ping"); void b.offsetWidth; b.classList.add("ping"); } },
    select(pin) { btns.forEach((b, i) => { const on = vis[i] === pin; b.classList.toggle("sel", on); b.setAttribute("aria-pressed", on); }); },
    setFilter(fn) { filter = fn; btns.forEach((b, i) => { const on = !!fn(vis[i]); b.classList.toggle("off", !on); b.tabIndex = on ? 0 : -1; }); paths.forEach((pt, i) => pt.classList.toggle("off", !(fn(arcs[i].a) && fn(arcs[i].b)))); },
    setArcs(on) { wrap.classList.toggle("no-arcs", !on); },
    stop() { wrap.remove(); host.classList.remove("is-flat"); },
  };
}
