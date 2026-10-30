/* Concepts map: an interactive force graph of the core ideas, linked to glossary, lessons, papers and people. Deep link: #/concepts/<id> */
import { X, people, hero, sec, tocBar, pchip, bars, anim, bag, setRoute, replaceRoute, $, $$, esc, RM, ICON, rng } from "./_kit.js";

const W = 1000, H = 720;
const START = ["agi", "orthogonality", "instrumental-convergence", "specification-gaming", "inner-alignment", "deceptive-alignment", "scheming", "ai-control"];

function layout(nodes, edges, groups) {
  const r = rng("threshold-concepts");
  const gk = Object.keys(groups);
  const centre = Object.fromEntries(gk.map((g, i) => { const a = (i / gk.length) * Math.PI * 2 - Math.PI / 2; return [g, [W / 2 + Math.cos(a) * 330, H / 2 + Math.sin(a) * 250]]; }));
  nodes.forEach((n) => { const c = centre[n.group]; n.x = c[0] + (r() - 0.5) * 120; n.y = c[1] + (r() - 0.5) * 120; n.vx = 0; n.vy = 0; });
  const idx = Object.fromEntries(nodes.map((n, i) => [n.id, i]));
  const E = edges.map(([a, b]) => [idx[a], idx[b]]).filter(([a, b]) => a != null && b != null);
  for (let it = 0; it < 420; it++) {
    const k = 1 - it / 420;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]; let dx = a.x - b.x, dy = a.y - b.y; let d2 = dx * dx + dy * dy || 0.01;
      if (d2 > 120000) continue; const f = 3200 / d2; const d = Math.sqrt(d2); dx /= d; dy /= d;
      a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
    }
    E.forEach(([i, j]) => { const a = nodes[i], b = nodes[j]; const dx = b.x - a.x, dy = b.y - a.y; const d = Math.sqrt(dx * dx + dy * dy) || 1; const f = (d - 105) * 0.012; a.vx += (dx / d) * f; a.vy += (dy / d) * f; b.vx -= (dx / d) * f; b.vy -= (dy / d) * f; });
    nodes.forEach((n) => { const c = centre[n.group]; n.vx += (c[0] - n.x) * 0.004; n.vy += (c[1] - n.y) * 0.004; n.x += n.vx * 0.5 * k; n.y += n.vy * 0.5 * k; n.vx *= 0.55; n.vy *= 0.55; n.x = Math.max(40, Math.min(W - 40, n.x)); n.y = Math.max(30, Math.min(H - 30, n.y)); });
  }
  return E;
}

/* Labels: after the force layout, nudge nodes so their labels do not collide, keep every label inside the map,
   then give each label the free side (above, below, right, left) that overlaps least. */
const rad = (n) => 7 + Math.min(n.deg, 10) * 0.9;
const LH = 15, PAD = 8;
function boxFor(n, w, side) {
  const r = rad(n);
  if (side === "b") return [n.x - w / 2, n.y + r + 3, w, LH];
  if (side === "r") return [n.x + r + 5, n.y - LH / 2, w, LH];
  if (side === "l") return [n.x - r - 5 - w, n.y - LH / 2, w, LH];
  return [n.x - w / 2, n.y - r - 4 - LH, w, LH];
}
const ov = (a, b, m = 3) => { const x = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]) + m, y = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) + m; return x > 0 && y > 0 ? [x, y] : null; };
function declutter(nodes, wid) {
  const clamp = (n) => { const w = wid[n.id], r = rad(n); n.x = Math.max(PAD + w / 2, Math.min(W - PAD - w / 2, n.x)); n.y = Math.max(PAD + r + 4 + LH, Math.min(H - PAD - r, n.y)); };
  nodes.forEach(clamp);
  for (let it = 0; it < 260; it++) {
    let moved = 0;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const A = boxFor(a, wid[a.id], "t"), Bb = boxFor(b, wid[b.id], "t");
      /* footprint: label box plus the circle under it */
      const fa = [A[0], A[1], A[2], A[3] + rad(a) * 2 + 6], fb = [Bb[0], Bb[1], Bb[2], Bb[3] + rad(b) * 2 + 6];
      const o = ov(fa, fb, 4); if (!o) continue;
      moved++;
      if (o[0] < o[1] * 1.6) { const d = (o[0] / 2 + 0.5) * (a.x < b.x ? -1 : 1); a.x += d * 0.5; b.x -= d * 0.5; }
      else { const d = (o[1] / 2 + 0.5) * (a.y < b.y ? -1 : 1); a.y += d * 0.5; b.y -= d * 0.5; }
    }
    nodes.forEach(clamp);
    if (!moved) break;
  }
  /* Greedy side choice for anything still crowded, biggest hubs first */
  const placed = [], circles = nodes.map((n) => { const r = rad(n); return [n.x - r, n.y - r, r * 2, r * 2]; });
  const inside = (b) => b[0] >= 4 && b[1] >= 4 && b[0] + b[2] <= W - 4 && b[1] + b[3] <= H - 4;
  nodes.slice().sort((a, b) => b.deg - a.deg).forEach((n) => {
    let best = "t", bestS = Infinity;
    for (const side of ["t", "b", "r", "l"]) {
      const bx = boxFor(n, wid[n.id], side);
      if (!inside(bx)) continue;
      let sc = side === "t" ? 0 : 0.5;
      placed.forEach((p) => { const o = ov(bx, p, 2); if (o) sc += o[0] * o[1]; });
      circles.forEach((c, k) => { if (nodes[k] === n) return; const o = ov(bx, c, 1); if (o) sc += o[0] * o[1] * 0.6; });
      if (sc < bestS) { bestS = sc; best = side; }
      if (sc === 0) break;
    }
    n.side = best; placed.push(boxFor(n, wid[n.id], best));
  });
}
function labelAttrs(t, n) {
  const r = rad(n), s = n.side || "t";
  t.removeAttribute("dy");
  if (s === "t") { t.setAttribute("x", 0); t.setAttribute("y", -r - 7); t.style.textAnchor = "middle"; }
  else if (s === "b") { t.setAttribute("x", 0); t.setAttribute("y", r + 14); t.style.textAnchor = "middle"; }
  else if (s === "r") { t.setAttribute("x", r + 5); t.setAttribute("y", 4); t.style.textAnchor = "start"; }
  else { t.setAttribute("x", -r - 5); t.setAttribute("y", 4); t.style.textAnchor = "end"; }
}

export async function render(el, params) {
  const B = bag();
  const [D, P, PA] = await Promise.all([X("concepts.json"), people(), X("papers.json")]);
  const groups = D.groups || {}, nodes = (D.nodes || []).map((n) => ({ ...n })), edges = D.edges || [];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const pById = Object.fromEntries((PA.papers || []).map((p) => [p.id, p]));
  const nb = {}; edges.forEach(([a, b]) => { (nb[a] = nb[a] || new Set()).add(b); (nb[b] = nb[b] || new Set()).add(a); });
  nodes.forEach((n) => (n.deg = (nb[n.id] || new Set()).size));
  const E = layout(nodes, edges, groups);
  const final = nodes.map((n) => [n.x, n.y]);
  const hubs = nodes.slice().sort((a, b) => b.deg - a.deg).slice(0, 12);
  const S = { sel: params[0] && byId[params[0]] ? params[0] : "", group: "", z: 1, tx: 0, ty: 0 };

  el.innerHTML = `${hero({ img: "concepts", eyebrow: "Concepts map", title: `${nodes.length} ideas. <span class="serif gt">One map.</span>`, lead: "Every big idea in AI safety connects to others. Tap a dot to see what it means in simple words, which lesson teaches it, which papers prove it and which people work on it.", stats: [[nodes.length, "ideas"], [edges.length, "links between them"], [Object.keys(groups).length, "families"], [nodes.reduce((s, n) => s + n.papers.length, 0), "paper links"]] })}
  ${sec("map", 1, "The map", "Tap an <span class='serif'>idea</span>.", "Drag the dots, zoom with the buttons, or search. Colours are families of ideas. A plain list of every idea is further down.",
    `<div class="x-cmap" data-m3="fade"><div class="x-cmap-bar"><label class="sr-only" for="cq">Find an idea</label><input class="input search" id="cq" type="search" placeholder="Find an idea, like scheming" list="clist"><datalist id="clist">${nodes.map((n) => `<option value="${esc(n.label)}">`).join("")}</datalist>
      <div class="x-zoom"><button class="icon-btn" type="button" data-z="1.25" aria-label="Zoom in">+</button><button class="icon-btn" type="button" data-z="0.8" aria-label="Zoom out">&minus;</button><button class="icon-btn" type="button" data-z="0" aria-label="Reset view">${ICON.wide}</button></div></div>
      <div class="chips x-legend">${Object.entries(groups).map(([k, g]) => `<button class="chip" type="button" data-g="${k}" aria-pressed="false" style="--c:${g.c}"><i class="dot-cat" style="--cat:${g.c}"></i>${esc(g.label)}</button>`).join("")}</div>
      <div class="x-cmap-body"><div class="x-cmap-stage"><svg id="csvg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Network of ${nodes.length} AI safety ideas. Use the list below for a text version."><g id="cview"><g class="x-edges">${E.map(([i, j], k) => `<line data-e="${k}" data-a="${nodes[i].id}" data-b="${nodes[j].id}"></line>`).join("")}</g><g class="x-nodes">${nodes.map((n) => `<g class="x-node" data-n="${n.id}" tabindex="0" role="button" aria-label="${esc(n.label)}" style="--c:${groups[n.group]?.c}"><circle r="${7 + Math.min(n.deg, 10) * 0.9}"></circle><text dy="${-12 - Math.min(n.deg, 10) * 0.9}" class="${n.deg >= 5 ? "hub" : ""}">${esc(n.label)}</text></g>`).join("")}</g></g></svg></div>
      <aside class="x-cside card" id="cside" aria-live="polite" data-lenis-prevent></aside></div></div>`)}
  ${sec("start", 2, "Where to begin", "Eight ideas, <span class='serif'>in order.</span>", "If you learn only these, you can follow most arguments about AI risk. Each one leads to the next.",
    `<ol class="x-chain" data-m3-stagger="80">${START.map((id, i) => { const n = byId[id]; return n ? `<li data-m3="up" style="--c:${groups[n.group]?.c}"><button type="button" data-pick="${id}"><span class="mono">${i + 1}</span><b>${esc(n.label)}</b><span>${esc(n.def)}</span></button></li>` : ""; }).join("")}</ol>`)}
  ${sec("hubs", 3, "The hubs", "Ideas that <span class='serif'>connect</span> the most.", "The more links an idea has, the more of the field you can reach from it.",
    bars(hubs.map((n) => [n.label, n.deg, groups[n.group]?.label, groups[n.group]?.c]), { fmt: (v) => `${v} links` }))}
  ${sec("list", 4, "Every idea", "The full list, <span class='serif'>A to Z.</span>", "The same ideas as the map, as plain text, grouped by family.",
    `<div class="grid g3 x-alist">${Object.entries(groups).map(([k, g]) => `<div class="card" data-m3="up" style="--c:${g.c}"><h3 style="color:${g.c}">${esc(g.label)}</h3><ul>${nodes.filter((n) => n.group === k).sort((a, b) => a.label.localeCompare(b.label)).map((n) => `<li><button type="button" class="x-linkbtn" data-pick="${n.id}">${esc(n.label)}</button></li>`).join("")}</ul></div>`).join("")}</div>`)}`;
  B.add(tocBar(el));

  const svg = $("#csvg", el), view = $("#cview", el), side = $("#cside", el);
  const nEls = Object.fromEntries($$(".x-node", svg).map((g) => [g.dataset.n, g]));
  const lines = $$(".x-edges line", svg);
  /* Measure each label, resolve collisions, and keep the result as the resting layout */
  const wid = {};
  nodes.forEach((n) => { const t = $("text", nEls[n.id]); let w = 0; try { w = t.getComputedTextLength(); } catch (e) {} wid[n.id] = (w > 4 ? w : n.label.length * (t.classList.contains("hub") ? 7.4 : 6.6)) + 4; });
  declutter(nodes, wid);
  nodes.forEach((n, i) => { final[i] = [n.x, n.y]; labelAttrs($("text", nEls[n.id]), n); });
  function place() {
    nodes.forEach((n) => nEls[n.id].setAttribute("transform", `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`));
    lines.forEach((l) => { const a = byId[l.dataset.a], b = byId[l.dataset.b]; l.setAttribute("x1", a.x.toFixed(1)); l.setAttribute("y1", a.y.toFixed(1)); l.setAttribute("x2", b.x.toFixed(1)); l.setAttribute("y2", b.y.toFixed(1)); });
  }
  const applyView = () => view.setAttribute("transform", `translate(${S.tx} ${S.ty}) scale(${S.z})`);
  // Entrance: nodes fly in from the centre unless reduced motion
  let raf = 0;
  if (RM()) place();
  else { nodes.forEach((n) => { n.x = W / 2; n.y = H / 2; }); place(); let t0 = 0; const step = (t) => { if (!t0) t0 = t; const k = Math.min(1, (t - t0) / 1100); const e = 1 - Math.pow(1 - k, 3); nodes.forEach((n, i) => { n.x = W / 2 + (final[i][0] - W / 2) * e; n.y = H / 2 + (final[i][1] - H / 2) * e; }); place(); if (k < 1) raf = requestAnimationFrame(step); }; const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { raf = requestAnimationFrame(step); io.disconnect(); } }); io.observe(svg); B.add(() => io.disconnect()); }
  B.add(() => cancelAnimationFrame(raf));

  function showSide(id) {
    const n = byId[id];
    if (!n) { side.innerHTML = `<div class="eyebrow">How to use</div><h3>Pick any dot</h3><p>Start with a big one, like <button class="x-linkbtn" type="button" data-pick="ai-control">AI control</button> or <button class="x-linkbtn" type="button" data-pick="instrumental-convergence">instrumental convergence</button>. Linked ideas light up.</p><p class="muted" style="margin-top:12px">Families: ${Object.values(groups).map((g) => esc(g.label)).join(", ")}.</p>`; return; }
    const ps = n.papers.map((x) => pById[x]).filter(Boolean), ppl = n.people.map((x) => P.byId[x]).filter(Boolean);
    side.innerHTML = `<div class="tag" style="--c:${groups[n.group]?.c}">${esc(groups[n.group]?.label)}</div><h3 style="margin-top:10px">${esc(n.label)}</h3><p>${esc(n.def)}</p>
      ${n.gloss_def && n.gloss_def !== n.def ? `<p class="muted x-gl"><b>Glossary:</b> ${esc(n.gloss_def)}</p>` : ""}
      ${n.lessons.length ? `<h4>Learn it</h4>${n.lessons.map((l) => `<a class="x-lesson" href="#/learn/${l.path}">${ICON.arrow}<span>${esc(l.title)}</span></a>`).join("")}` : ""}
      ${ps.length ? `<h4>Papers</h4><ul class="x-plist">${ps.slice(0, 6).map((p) => `<li><a href="#/papers/${p.id}">${esc(p.title)}</a> <span class="mono muted">${p.year}</span></li>`).join("")}</ul>` : ""}
      ${ppl.length ? `<h4>People</h4><div class="x-pchips">${ppl.map((p) => pchip(p)).join("")}</div>` : ""}
      ${nb[n.id] ? `<h4>Connected ideas</h4><div class="chips">${[...nb[n.id]].map((x) => `<button class="chip" type="button" data-pick="${x}" style="--c:${groups[byId[x].group]?.c}">${esc(byId[x].label)}</button>`).join("")}</div>` : ""}`;
  }
  function highlight() {
    const s = S.sel, g = S.group, near = s ? nb[s] || new Set() : null;
    nodes.forEach((n) => { const e = nEls[n.id]; const on = s ? n.id === s || near.has(n.id) : g ? n.group === g : true; e.classList.toggle("dim", !on); e.classList.toggle("sel", n.id === s); e.classList.toggle("near", !!(near && near.has(n.id))); });
    lines.forEach((l) => { const on = s ? l.dataset.a === s || l.dataset.b === s : g ? byId[l.dataset.a].group === g && byId[l.dataset.b].group === g : false; l.classList.toggle("on", on); l.classList.toggle("dim", !!(s || g) && !on); });
    $$("[data-g]", el).forEach((b) => b.setAttribute("aria-pressed", b.dataset.g === g));
  }
  let pushed = false;
  function pick(id, push = true) {
    if (!byId[id]) return; S.sel = id; showSide(id); highlight();
    document.title = `${byId[id].label} · Concepts · Threshold`;
    if (push) { setRoute(`#/concepts/${id}`); pushed = true; }
  }
  showSide(S.sel); highlight();
  // Drag nodes, pan background with a mouse, click to select
  let drag = null;
  svg.addEventListener("pointerdown", (e) => {
    const g = e.target.closest(".x-node"); const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = view.getScreenCTM().inverse(); const p = pt.matrixTransform(m);
    if (g) { drag = { id: g.dataset.n, sx: e.clientX, sy: e.clientY, moved: false, ox: p.x - byId[g.dataset.n].x, oy: p.y - byId[g.dataset.n].y }; g.setPointerCapture(e.pointerId); }
    else if (e.pointerType === "mouse") { drag = { pan: true, sx: e.clientX, sy: e.clientY, tx: S.tx, ty: S.ty }; svg.setPointerCapture(e.pointerId); svg.classList.add("panning"); }
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (drag.pan) { const r = svg.getBoundingClientRect(); const k = W / r.width; S.tx = drag.tx + (e.clientX - drag.sx) * k; S.ty = drag.ty + (e.clientY - drag.sy) * k; applyView(); return; }
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
    if (!drag.moved) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(view.getScreenCTM().inverse());
    const n = byId[drag.id]; n.x = p.x - drag.ox; n.y = p.y - drag.oy; place();
  });
  const end = () => { if (drag && !drag.pan && !drag.moved) pick(drag.id); drag = null; svg.classList.remove("panning"); };
  svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", () => { drag = null; svg.classList.remove("panning"); });
  svg.addEventListener("keydown", (e) => { const g = e.target.closest(".x-node"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(g.dataset.n); } });
  svg.addEventListener("wheel", (e) => { if (!e.ctrlKey) return; e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : 0.89); }, { passive: false });
  function zoom(f) { if (!f) { S.z = 1; S.tx = 0; S.ty = 0; } else { const nz = Math.max(0.6, Math.min(3, S.z * f)); S.tx = W / 2 - ((W / 2 - S.tx) * nz) / S.z; S.ty = H / 2 - ((H / 2 - S.ty) * nz) / S.z; S.z = nz; } applyView(); }
  el.addEventListener("click", (e) => {
    const z = e.target.closest("[data-z]"); if (z) { zoom(+z.dataset.z); return; }
    const g = e.target.closest("[data-g]"); if (g) { S.group = S.group === g.dataset.g ? "" : g.dataset.g; S.sel = ""; showSide(""); highlight(); return; }
    const p = e.target.closest("[data-pick]"); if (p) { pick(p.dataset.pick); if (!p.closest("#map")) $("#map", el).scrollIntoView({ behavior: RM() ? "auto" : "smooth", block: "start" }); }
  });
  $("#cq", el).addEventListener("change", (e) => { const v = e.target.value.toLowerCase().trim(); const n = nodes.find((x) => x.label.toLowerCase() === v) || nodes.find((x) => x.label.toLowerCase().includes(v) || x.id.includes(v)); if (n) pick(n.id); });
  $("#cq", el).addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.dispatchEvent(new Event("change")); });
  el._onParams = (p) => { if (p[0] && byId[p[0]]) pick(p[0], false); else { S.sel = ""; pushed = false; showSide(""); highlight(); } };
  return () => B.run();
}
