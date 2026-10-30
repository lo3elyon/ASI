/* "On this page" pill rows. Desktop: the pills wrap onto more lines (CSS). Phone: one row that scrolls sideways,
   snaps to pills, fades at the edge that has more pills, and keeps the active pill in view. */
const RMq = () => document.documentElement.classList.contains("rm") || matchMedia("(prefers-reduced-motion: reduce)").matches;

export function tocRow(row) {
  if (!row || row._toc) return row && row._toc;
  row.classList.add("toc-row");
  const edges = () => {
    const max = row.scrollWidth - row.clientWidth;
    row.classList.toggle("can-l", max > 2 && row.scrollLeft > 2);
    row.classList.toggle("can-r", max > 2 && row.scrollLeft < max - 2);
  };
  row.addEventListener("scroll", edges, { passive: true });
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(edges) : null;
  if (ro) ro.observe(row); else addEventListener("resize", edges);
  requestAnimationFrame(edges);
  const api = {
    /* Bring a pill into view without moving the page */
    show(pill) {
      if (!pill || row.scrollWidth <= row.clientWidth + 2) return;
      const r = row.getBoundingClientRect(), p = pill.getBoundingClientRect();
      if (p.left >= r.left + 24 && p.right <= r.right - 24) return;
      const left = row.scrollLeft + (p.left - r.left) - (r.width - p.width) / 2;
      row.scrollTo({ left: Math.max(0, left), behavior: RMq() ? "auto" : "smooth" });
    },
    stop() { if (ro) ro.disconnect(); else removeEventListener("resize", edges); },
  };
  row._toc = api;
  return api;
}

/* Track which section is on screen and mark its pill. pills: [{ el, target }] */
export function trackActive(row, pills, cls = "on") {
  const api = tocRow(row);
  const io = new IntersectionObserver((es) => es.forEach((en) => {
    if (!en.isIntersecting) return;
    pills.forEach((p) => { const on = p.target === en.target; p.el.classList.toggle(cls, on); if (on) p.el.setAttribute("aria-current", "true"); else p.el.removeAttribute("aria-current"); });
    const cur = pills.find((p) => p.target === en.target); if (cur) api.show(cur.el);
  }), { rootMargin: "-40% 0px -55% 0px" });
  pills.forEach((p) => p.target && io.observe(p.target));
  return () => { io.disconnect(); api.stop(); };
}
