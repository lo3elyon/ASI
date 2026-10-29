/* Threshold reader: lays text blocks out as book pages and paints them onto canvases.
   Used by both the WebGL book and the 2D fallback, so pages, highlights and links match. */

export const PW = 800, PH = 1160; // logical page size, ratio of a real trade book
const M = { top: 104, bottom: 118, inner: 92, outer: 80 };

export const THEMES = {
  paper: { name: "Paper", bg: "#f3ead8", bg2: "#e7dbc2", ink: "#211b13", mute: "#80705a", acc: "#b45309", rule: "rgba(70,50,20,.2)", hint: "rgba(180,83,9,.08)", grain: 0.07, desk: "#2a1d12", lamp: 0xffd9a8, amb: 0x8fa6c2 },
  sepia: { name: "Sepia", bg: "#e8d4ac", bg2: "#dcc495", ink: "#3a2a17", mute: "#7d6545", acc: "#9a3412", rule: "rgba(70,45,15,.22)", hint: "rgba(154,52,18,.08)", grain: 0.09, desk: "#24170c", lamp: 0xffcf93, amb: 0x96a0b0 },
  night: { name: "Night", bg: "#101d2f", bg2: "#0b1626", ink: "#d9e4ef", mute: "#8197ae", acc: "#22d3ee", rule: "rgba(255,255,255,.12)", hint: "rgba(34,211,238,.08)", grain: 0.05, desk: "#060c16", lamp: 0x9fdcff, amb: 0x34507a },
  contrast: { name: "Contrast", bg: "#ffffff", bg2: "#f1f1f1", ink: "#000000", mute: "#3d3d3d", acc: "#0e7490", rule: "rgba(0,0,0,.35)", hint: "rgba(14,116,144,.1)", grain: 0, desk: "#111111", lamp: 0xffffff, amb: 0x9aa4ad },
};
export const HL = { amber: "rgba(245,158,11,.34)", teal: "rgba(20,184,166,.3)", cyan: "rgba(34,211,238,.3)", lime: "rgba(132,204,22,.32)", red: "rgba(239,68,68,.26)" };
export const FONTS = {
  serif: { name: "Classic serif", body: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif', head: '"Instrument Serif", Georgia, serif' },
  instrument: { name: "Instrument Serif", body: '"Instrument Serif", Georgia, serif', head: '"Instrument Serif", Georgia, serif' },
  sans: { name: "Inter", body: 'Inter, system-ui, sans-serif', head: '"Space Grotesk", Inter, sans-serif' },
  grotesk: { name: "Space Grotesk", body: '"Space Grotesk", Inter, sans-serif', head: '"Space Grotesk", Inter, sans-serif' },
  mono: { name: "Mono", body: '"JetBrains Mono", ui-monospace, monospace', head: '"JetBrains Mono", ui-monospace, monospace' },
};

export async function fontsReady(fontKey) {
  const f = FONTS[fontKey] || FONTS.serif;
  try { await Promise.all([document.fonts.load(`26px ${f.body}`), document.fonts.load(`40px ${f.head}`), document.fonts.load('italic 26px "Instrument Serif"'), document.fonts.load('12px "JetBrains Mono"')]); } catch (e) { /* system fonts */ }
}

const mctx = document.createElement("canvas").getContext("2d");
const wcache = new Map();
function wid(font, s) { let m = wcache.get(font); if (!m) { m = new Map(); wcache.set(font, m); } let w = m.get(s); if (w === undefined) { mctx.font = font; w = mctx.measureText(s).width; m.set(s, w); } return w; }

function styleFor(t, o) {
  const F = FONTS[o.font] || FONTS.serif, s = o.size;
  switch (t) {
    case "title": return { font: `400 ${s * 2.5}px ${F.head}`, lh: s * 2.7, before: 0, after: 0 };
    case "h1": return { font: `400 ${s * 1.9}px ${F.head}`, lh: s * 2.15, before: s * 0.6, after: s * 0.9, keep: true };
    case "h2": return { font: `${o.font === "sans" || o.font === "grotesk" ? 600 : 400} ${s * 1.42}px ${F.head}`, lh: s * 1.7, before: s * 1.3, after: s * 0.55, keep: true };
    case "h3": return { font: `700 ${s * 1.06}px ${F.body}`, lh: s * 1.45, before: s * 0.95, after: s * 0.3, keep: true };
    case "hint": return { font: `italic ${s * 0.84}px ${F.body}`, lh: s * 0.84 * o.lh, before: s * 0.3, after: s * 0.9, pad: 18 };
    case "fig": return { font: `italic ${s * 0.82}px ${F.body}`, lh: s * 0.82 * o.lh, before: s * 0.3, after: s * 0.8, pad: 14 };
    case "li": return { font: `400 ${s}px ${F.body}`, lh: s * o.lh, before: 0, after: s * 0.35, indent: s * 1.1 };
    default: return { font: `400 ${s}px ${F.body}`, lh: s * o.lh, before: 0, after: s * 0.62, justify: true };
  }
}

function wrap(text, font, maxW, justify) {
  const words = String(text).split(/\s+/).filter(Boolean), sp = wid(font, " ");
  const lines = []; let cur = [], cw = 0;
  const push = (last) => {
    if (!cur.length) return;
    const total = cur.reduce((a, w) => a + w.w, 0), gaps = cur.length - 1;
    const gap = justify && !last && gaps > 0 && maxW - total < maxW * 0.35 ? (maxW - total) / gaps : sp;
    let x = 0; const ws = cur.map((w) => { const r = { s: w.s, x }; x += w.w + gap; return r; });
    lines.push({ ws, text: cur.map((w) => w.s).join(" ") }); cur = []; cw = 0;
  };
  for (let s of words) {
    let w = wid(font, s);
    while (w > maxW) { // very long tokens such as links: hard break
      let k = s.length; while (k > 1 && wid(font, s.slice(0, k)) > maxW) k--;
      if (cur.length) push(false);
      cur.push({ s: s.slice(0, k), w: wid(font, s.slice(0, k)) }); push(false);
      s = s.slice(k); w = wid(font, s);
    }
    if (cur.length && cw + sp + w > maxW) push(false);
    cur.push({ s, w }); cw += (cur.length > 1 ? sp : 0) + w;
  }
  push(true);
  return lines;
}

/* blocks: [{t,x,a?}] -> { pages: [{items:[...], first, last}], blockPage: [] } */
export function paginate(blocks, o) {
  const W = PW - M.inner - M.outer, bottom = PH - M.bottom;
  const pages = []; let page = null, y = 0;
  const blockPage = new Array(blocks.length).fill(-1);
  const newPage = () => { page = { items: [], first: -1, last: -1 }; pages.push(page); y = M.top; };
  newPage();
  blocks.forEach((b, bi) => {
    if (b.t === "title") {
      if (page.items.length) newPage();
      page.items.push({ k: "title", b: bi, x: b.x, sub: b.sub, by: b.by, note: b.note, mark: b.mark });
      page.first = page.first < 0 ? bi : page.first; page.last = bi; blockPage[bi] = pages.length - 1; newPage(); return;
    }
    if (b.t === "break") { if (page.items.length) newPage(); return; }
    const st = styleFor(b.t, o);
    const pad = st.pad || 0, ind = st.indent || 0;
    const text = b.t === "li" ? b.x : b.x;
    const lines = wrap(text, st.font, W - pad * 2 - ind, !!st.justify && o.justify !== false);
    const blockH = lines.length * st.lh + pad;
    let before = page.items.length ? st.before : 0;
    // keep headings with at least two following lines
    const needed = st.keep ? blockH + before + st.lh * 2.2 : Math.min(blockH, st.lh * 2) + before;
    if (page.items.length && y + needed > bottom) { newPage(); before = 0; }
    y += before;
    if (pad) y += pad / 2;
    lines.forEach((ln, li) => {
      if (y + st.lh > bottom + 1) { newPage(); if (pad) y += pad / 2; }
      const it = { k: "line", t: b.t, b: bi, li, font: st.font, x: M.inner + pad + ind, y, h: st.lh, ws: ln.ws, text: ln.text, bullet: b.t === "li" && li === 0, w: W - pad * 2 - ind, padL: pad };
      page.items.push(it); if (page.first < 0) page.first = bi; page.last = bi;
      if (blockPage[bi] < 0) blockPage[bi] = pages.length - 1;
      y += st.lh;
    });
    if (pad) y += pad / 2;
    y += st.after;
  });
  if (!page.items.length && pages.length > 1) pages.pop();
  return { pages, blockPage };
}

/* Paint a page. side: "r" (recto, spine on the left) or "l" (verso, spine on the right). */
let grainCanvas = null;
function grain() {
  if (grainCanvas) return grainCanvas;
  grainCanvas = document.createElement("canvas"); grainCanvas.width = grainCanvas.height = 256;
  const g = grainCanvas.getContext("2d"), d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); return grainCanvas;
}

export function paintPage(cv, scale, pg, idx, o, ctx) {
  const T = THEMES[o.theme] || THEMES.paper, side = ctx.side || "r";
  cv.width = Math.round(PW * scale); cv.height = Math.round(PH * scale);
  const g = cv.getContext("2d"); g.setTransform(scale, 0, 0, scale, 0, 0);
  // paper
  const grd = g.createLinearGradient(0, 0, PW, PH); grd.addColorStop(0, T.bg); grd.addColorStop(1, T.bg2);
  g.fillStyle = grd; g.fillRect(0, 0, PW, PH);
  if (T.grain) { g.globalAlpha = T.grain; g.globalCompositeOperation = "overlay"; g.fillStyle = g.createPattern(grain(), "repeat"); g.fillRect(0, 0, PW, PH); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
  // gutter shading near the spine and a soft outer edge
  const gx = side === "r" ? 0 : PW, gw = 70;
  const gs = g.createLinearGradient(gx, 0, side === "r" ? gw : PW - gw, 0);
  gs.addColorStop(0, o.theme === "night" ? "rgba(0,0,0,.45)" : "rgba(60,40,15,.22)"); gs.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gs; g.fillRect(side === "r" ? 0 : PW - gw, 0, gw, PH);
  if (!pg) { // blank endpaper
    return;
  }
  const mirror = side === "l"; // verso pages: inner margin on the right
  const X = (x) => (mirror ? x - M.inner + M.outer : x);
  // running head and folio
  g.fillStyle = T.mute; g.font = `500 13px "JetBrains Mono", monospace`; g.textBaseline = "alphabetic";
  const head = (side === "l" ? ctx.headL : ctx.headR) || "";
  if (head && !pg.items.some((i) => i.k === "title")) { g.textAlign = side === "l" ? "left" : "right"; g.fillText(head.toUpperCase().slice(0, 60), side === "l" ? M.outer : PW - M.outer, 58); }
  g.textAlign = "center"; g.fillText(String(idx + 1), PW / 2, PH - 52);
  g.strokeStyle = T.rule; g.lineWidth = 1; g.beginPath(); g.moveTo(PW / 2 - 18, PH - 76); g.lineTo(PW / 2 + 18, PH - 76); g.stroke();
  g.textAlign = "left";
  const hl = ctx.hl || {}, q = (ctx.query || "").toLowerCase(), reading = ctx.reading;
  // block backgrounds (highlights, hints, reading aloud)
  const byBlock = new Map();
  for (const it of pg.items) if (it.k === "line") { const r = byBlock.get(it.b); if (r) { r.y2 = it.y + it.h; } else byBlock.set(it.b, { y1: it.y, y2: it.y + it.h, it }); }
  for (const [b, r] of byBlock) {
    const it = r.it;
    if (it.t === "hint" || it.t === "fig") { g.fillStyle = T.hint; rr(g, X(M.inner), r.y1 - 10, PW - M.inner - M.outer, r.y2 - r.y1 + 16, 10); g.fill(); g.fillStyle = T.acc; g.fillRect(X(M.inner), r.y1 - 10, 4, r.y2 - r.y1 + 16); }
    if (hl[b]) { g.fillStyle = HL[hl[b].c] || HL.amber; rr(g, X(M.inner) - 10, r.y1 - 4, PW - M.inner - M.outer + 20, r.y2 - r.y1 + 6, 8); g.fill(); if (hl[b].n) { g.fillStyle = T.acc; g.beginPath(); g.arc(mirror ? PW - M.outer / 2 + 8 : M.outer / 2 - 6 + (M.inner - M.outer), r.y1 + 12, 7, 0, 7); g.fill(); } }
    if (reading === b) { g.strokeStyle = T.acc; g.lineWidth = 3; g.beginPath(); g.moveTo(X(M.inner) - 16, r.y1); g.lineTo(X(M.inner) - 16, r.y2 - 4); g.stroke(); }
  }
  for (const it of pg.items) {
    if (it.k === "title") { titlePage(g, it, T, o); continue; }
    g.font = it.font; g.fillStyle = it.t === "hint" || it.t === "fig" ? T.mute : it.t === "h1" || it.t === "h2" ? T.ink : T.ink;
    const base = it.y + it.h * 0.74, x0 = X(it.x);
    if (it.bullet) { g.fillStyle = T.acc; g.fillText("\u2022", x0 - 22, base); g.fillStyle = T.ink; }
    if (it.t === "h2" && it.li === 0) { g.fillStyle = T.acc; g.fillRect(x0, it.y - 6, 34, 3); g.fillStyle = T.ink; }
    for (const w of it.ws) {
      if (q && q.length > 1 && w.s.toLowerCase().includes(q)) { const ww = wid(it.font, w.s); g.save(); g.fillStyle = HL.red; rr(g, x0 + w.x - 3, it.y + it.h * 0.12, ww + 6, it.h * 0.8, 5); g.fill(); g.restore(); }
      g.fillText(w.s, x0 + w.x, base);
    }
  }
  if (ctx.bookmarked) { // ribbon
    const bx = mirror ? M.outer + 10 : PW - M.outer - 34; g.fillStyle = "#ef4444";
    g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx + 24, 0); g.lineTo(bx + 24, 86); g.lineTo(bx + 12, 72); g.lineTo(bx, 86); g.closePath(); g.fill();
  }
}

function titlePage(g, it, T, o) {
  const F = FONTS[o.font] || FONTS.serif;
  g.textAlign = "center"; g.fillStyle = T.acc; g.font = `500 14px "JetBrains Mono", monospace`;
  g.fillText((it.mark || "THRESHOLD LIBRARY").toUpperCase(), PW / 2, 190);
  g.strokeStyle = T.acc; g.lineWidth = 2; g.beginPath(); g.moveTo(PW / 2 - 40, 214); g.lineTo(PW / 2 + 40, 214); g.stroke();
  g.fillStyle = T.ink; const tf = `400 58px ${F.head}`; g.font = tf;
  const lines = wrap(it.x, tf, PW - 180, false); let y = 330 - (lines.length - 1) * 30;
  for (const l of lines) { g.fillText(l.text, PW / 2, y); y += 70; }
  if (it.sub) { g.fillStyle = T.mute; const sf = `italic 26px ${F.body}`; g.font = sf; for (const l of wrap(it.sub, sf, PW - 220, false)) { g.fillText(l.text, PW / 2, y + 6); y += 36; } }
  if (it.by) { g.fillStyle = T.ink; g.font = `500 20px "Space Grotesk", Inter, sans-serif`; y += 50; for (const l of wrap(it.by, g.font, PW - 200, false)) { g.fillText(l.text.toUpperCase(), PW / 2, y); y += 30; } }
  if (it.note) { g.fillStyle = T.mute; const nf = `400 16px Inter, sans-serif`; g.font = nf; let ny = PH - 250; for (const l of wrap(it.note, nf, PW - 200, false).slice(0, 7)) { g.fillText(l.text, PW / 2, ny); ny += 24; } }
  g.textAlign = "left";
}

function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* Map a point on a page (logical coords) to a block index. */
export function hitBlock(pg, px, py, side) {
  if (!pg) return -1;
  const off = side === "l" ? -M.inner + M.outer : 0;
  for (const it of pg.items) if (it.k === "line" && py >= it.y - 4 && py <= it.y + it.h + 2 && px >= it.x + off - 30 && px <= it.x + off + it.w + 20) return it.b;
  return -1;
}
export function pageText(pg, blocks) {
  if (!pg) return "";
  const seen = new Set(), out = [];
  for (const it of pg.items) { if (it.k === "title") { out.push(it.x); continue; } if (!seen.has(it.b)) { seen.add(it.b); out.push(it.b); } }
  return out;
}
export const MARGINS = M;
