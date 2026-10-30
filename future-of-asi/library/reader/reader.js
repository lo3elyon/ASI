/* Threshold reader: controls, state and storage around the 3D book and the 2D fallback.
   Themes, fonts, size, line height, page sound, bookmarks, highlights and notes, a reading
   timer, a progress ring, search, contents, read aloud, share a page link and focus mode. */
import { $, $$, esc, clamp, RM, getJSON, store, toast } from "../../shared/sub.js";
import { PW, PH, THEMES, FONTS, HL as HLC, paginate, paintPage, hitBlock, fontsReady } from "./paginate.js";
import { webglOK } from "./book3d.js";

const RS = Object.assign({ theme: "paper", font: "serif", size: 25, lh: 1.55, sound: false, engine: "auto", particles: true, rate: 1, justify: true, zoom: 1 }, store.get("lib:reader2", {}));
const saveRS = () => store.set("lib:reader2", RS);
const SK = { hl: "lib:hl", bm: "lib:bm", time: "lib:time", prog: "lib:prog" };
const getS = (k) => store.get(k, {}), setS = (k, v) => store.set(k, v);

const R = { book: null, mode: "guide", docs: [], di: 0, lay: null, blocks: [], cur: 0, single: false, engine: null, kind: "", canv: new Map(), query: "", reading: -1, opened: new Set(), timer: { t0: 0, acc: 0 }, busy: false, onClose: null, cat: null };
let root, stage, ui = {};

const ICN = {
  close: '<path d="M6 6l12 12M18 6 6 18"/>', toc: '<path d="M4 6h16M4 12h10M4 18h16"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  marks: '<path d="M9 6h11M9 12h11M9 18h7"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="3"/>', bm: '<path d="M6 3h12v18l-6-4-6 4z"/>', tts: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  set: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  focus: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  prev: '<path d="M15 6l-6 6 6 6"/>', next: '<path d="M9 6l6 6-6 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', fit: '<path d="M3 12h4M17 12h4M12 3v4M12 17v4"/><circle cx="12" cy="12" r="3"/>',
  play: '<path d="M7 5l12 7-12 7z"/>', pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>', stop: '<path d="M6 6h12v12H6z"/>', note: '<path d="M4 4h16v12H8l-4 4z"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
};
const ic = (k, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICN[k]}</svg>`;

function build() {
  root = $("#reader");
  root.innerHTML = `
  <div class="rd-bar" id="rdBar">
    <button class="rb" type="button" data-a="close" aria-label="Close reader">${ic("close")}</button>
    <button class="rb" type="button" data-a="toc" aria-label="Contents" aria-expanded="false">${ic("toc")}</button>
    <div class="rd-title"><b id="rdBook"></b><span id="rdChap"></span></div>
    <div class="rd-tools">
      <button class="rb" type="button" data-a="search" aria-label="Search inside" aria-expanded="false">${ic("search")}</button>
      <button class="rb" type="button" data-a="marks" aria-label="Bookmarks, highlights and notes" aria-expanded="false">${ic("marks")}</button>
      <button class="rb" type="button" data-a="bookmark" aria-label="Bookmark this page" aria-pressed="false" id="rdBmBtn">${ic("bm")}</button>
      <button class="rb" type="button" data-a="tts" aria-label="Read aloud" aria-pressed="false" id="rdTtsBtn">${ic("tts")}</button>
      <button class="rb" type="button" data-a="share" aria-label="Share a link to this page">${ic("share")}</button>
      <button class="rb" type="button" data-a="focus" aria-label="Focus mode" aria-pressed="false">${ic("focus")}</button>
      <button class="rb" type="button" data-a="settings" aria-label="Reading settings" aria-expanded="false">${ic("set")}</button>
    </div>
  </div>
  <aside class="rd-panel" id="rdPanel" aria-label="Reader panel" hidden><div class="rp-head"><b id="rpTitle"></b><button class="rb sm" type="button" data-a="panelclose" aria-label="Close panel">${ic("close", 16)}</button></div><div class="rp-body" id="rpBody"></div></aside>
  <div class="rd-stage" id="rdStage3">
    <div class="rd-glow" aria-hidden="true"></div>
    <div class="rd-host" id="rdHost"></div>
    <button class="rd-side prev" type="button" data-a="prev" aria-label="Previous page">${ic("prev", 22)}</button>
    <button class="rd-side next" type="button" data-a="next" aria-label="Next page">${ic("next", 22)}</button>
    <div class="rd-loader" id="rdLoader" aria-hidden="true"><div class="bk-build"><i class="b-back"></i><i class="b-pg p1"></i><i class="b-pg p2"></i><i class="b-pg p3"></i><i class="b-pg p4"></i><i class="b-spine"></i><i class="b-cover"></i></div><p>Opening the book</p></div>
    <div class="rd-pop" id="rdPop" hidden role="dialog" aria-label="Paragraph actions"></div>
    <div class="rd-tts" id="rdTts" hidden><button class="rb sm" type="button" data-a="ttspause" aria-label="Pause reading">${ic("pause", 16)}</button><button class="rb sm" type="button" data-a="ttsstop" aria-label="Stop reading">${ic("stop", 16)}</button><label>Speed <input type="range" id="rdRate" min="0.6" max="1.8" step="0.1"></label></div>
    <button class="rd-unfocus" type="button" data-a="focus">Exit focus</button>
  </div>
  <div class="rd-foot" id="rdFoot">
    <button class="rb sm" type="button" data-a="prev" aria-label="Previous page">${ic("prev", 16)}</button>
    <div class="rd-scrub"><input type="range" id="rdScrub" min="1" max="1" value="1" aria-label="Go to page"><output id="rdScrubTip"></output></div>
    <button class="rb sm" type="button" data-a="next" aria-label="Next page">${ic("next", 16)}</button>
    <div class="rd-zoom" role="group" aria-label="Text zoom"><button class="rb sm" type="button" data-a="zoomout" aria-label="Zoom out">${ic("minus", 16)}</button><button class="rd-zlev" type="button" data-a="zoomfit" id="rdZoom" aria-label="Text zoom 100%. Press to reset" title="Reset zoom">100%</button><button class="rb sm" type="button" data-a="zoomin" aria-label="Zoom in">${ic("plus", 16)}</button></div>
    <span class="rd-pos" id="rdPos" aria-live="polite"></span>
    <span class="rd-ring" id="rdRing"></span>
    <span class="rd-time" id="rdTime" title="Reading time"></span>
  </div>
  <div class="sr-only" id="rdText" aria-live="off"></div>`;
  stage = $("#rdStage3"); ui.host = $("#rdHost");
  root.addEventListener("click", onAction);
  $("#rdScrub").addEventListener("input", (e) => { rangeFill(e.target); const p = +e.target.value - 1; $("#rdScrubTip").textContent = `Page ${p + 1}`; positionTip(); });
  $("#rdScrub").addEventListener("change", (e) => goPage(+e.target.value - 1, false));
  zoomLabel();
  $("#rdRate").value = RS.rate; rangeFill($("#rdRate")); $("#rdRate").addEventListener("input", (e) => { rangeFill(e.target); RS.rate = +e.target.value; saveRS(); if (tts.on) { tts.restart(); } });
  addEventListener("keydown", onKey);
  addEventListener("resize", () => { if (!root.hidden) checkMode(); });
  document.addEventListener("visibilitychange", () => { timerTick(); if (R.engine) R.engine.pause(document.hidden); });
  stage.addEventListener("mousemove", () => { if (root.classList.contains("focus")) { root.classList.add("peek"); clearTimeout(ui.pk); ui.pk = setTimeout(() => root.classList.remove("peek"), 1600); } });
}
function rangeFill(el) { const f = (el.value - el.min) / Math.max(1e-9, el.max - el.min); el.style.setProperty("--p", `${f * 100}%`); }
function positionTip() { const s = $("#rdScrub"), t = $("#rdScrubTip"); const f = (s.value - s.min) / Math.max(1, s.max - s.min); t.style.left = `calc(${f * 100}% + ${(0.5 - f) * 16}px)`; }

/* ---------- documents ---------- */
function guideDoc(b) {
  const themes = b.guide_kind === "themes";
  const bl = [{ t: "hint", x: "Chapter guide by Threshold. Short summaries in my own words, not the book's text." + (b.toc_note ? " " + b.toc_note : "") }];
  bl.push({ t: "h1", x: themes ? "The main themes" : "Chapter by chapter" });
  let lp = null;
  b.chapters.forEach((c, i) => { if (c.part && c.part !== lp) { bl.push({ t: "h2", x: c.part }); lp = c.part; } bl.push({ t: "h3", x: `${i + 1}. ${c.t}`, a: i }); bl.push({ t: "p", x: c.g }); });
  bl.push({ t: "h2", x: "Key ideas" }); b.ideas.forEach((x) => bl.push({ t: "li", x }));
  if (b.args && b.args.length) { bl.push({ t: "h2", x: "The argument and the pushback" }); b.args.forEach((a) => { bl.push({ t: "p", x: "The book argues: " + a.a }); bl.push({ t: "p", x: "Counter argument: " + a.c }); }); }
  bl.push({ t: "h2", x: "Questions to think about" }); b.questions.forEach((x) => bl.push({ t: "li", x }));
  return { id: "guide", title: "Chapter guide", blocks: bl };
}
const authorsLine = (b) => b.authors.map((a) => a.name).join(", ");
function titleBlock(b) {
  const note = R.mode === "full" ? (b.free && b.free.licence) || "" : "This guide is written by Threshold in my own words. It is not the book's text. Support the author by buying or borrowing the book.";
  return { t: "title", x: b.title, sub: b.subtitle || "", by: authorsLine(b), note, mark: R.mode === "full" ? "Full text" : "Chapter guide" };
}
async function loadDocs(b) {
  if (R.mode === "full") {
    const src = b.free.text;
    if (src.endsWith("index.json")) { const idx = await getJSON(src, []); const base = src.replace("index.json", ""); return idx.map((d) => ({ id: d.id, title: d.title, url: `${base}${d.id}.json` })); }
    const d = await getJSON(src, null); return [{ id: "all", title: d ? d.title : b.title, blocks: d ? d.blocks : [{ t: "p", x: "This text could not be loaded." }] }];
  }
  return [guideDoc(b)];
}
async function ensureBlocks(d) { if (!d.blocks) { const j = await getJSON(d.url, null); d.blocks = j ? j.blocks : [{ t: "p", x: "This chapter could not be loaded." }]; } return d.blocks; }

function layoutDoc() {
  const d = R.docs[R.di];
  R.blocks = (R.di === 0 ? [titleBlock(R.book)] : []).concat(d.blocks.map((x) => (x.t === "h4" ? { ...x, t: "h3" } : x)));
  R.lay = paginate(R.blocks, { size: Math.round(RS.size * (R.single ? 1.22 : 1) * zoomLevel()), lh: RS.lh, font: RS.font, justify: RS.justify });
  R.canv.clear();
}

/* ---------- text zoom: larger text re-paginates, so nothing is ever clipped ---------- */
const ZOOMS = [0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];
function zoomLevel() { const z = +RS.zoom; return ZOOMS.includes(z) ? z : 1; }
function zoomLabel() {
  const z = zoomLevel(), b = $("#rdZoom"); if (!b) return; const pc = `${Math.round(z * 100)}%`;
  b.textContent = pc; b.setAttribute("aria-label", `Text zoom ${pc}. Press to reset`);
  const i = ZOOMS.indexOf(z); const o = $('[data-a="zoomout"]', root), n = $('[data-a="zoomin"]', root);
  if (o) o.disabled = i <= 0; if (n) n.disabled = i >= ZOOMS.length - 1;
}
async function zoomStep(d) {
  if (!R.lay || R.busy || (R.engine && R.engine.busy())) return;
  const i = ZOOMS.indexOf(zoomLevel()), j = d === 0 ? ZOOMS.indexOf(1) : clamp(i + d, 0, ZOOMS.length - 1);
  if (j === i) return; RS.zoom = ZOOMS[j]; zoomLabel(); await relayout();
}

/* ---------- pages and views ---------- */
const nPages = () => (R.lay ? R.lay.pages.length : 1);
function viewFor(p) { if (R.single) return { l: -1, r: clamp(p, 0, nPages() - 1) }; const s = Math.floor((clamp(p, 0, nPages() - 1) + 1) / 2); return { l: 2 * s - 1, r: 2 * s < nPages() ? 2 * s : -1 }; }
const firstOf = (v) => (v.l >= 0 ? v.l : v.r);
const visiblePages = (v) => [v.l, v.r].filter((i) => i >= 0);
function hlMap() { const out = {}; (getS(SK.hl)[R.book.id] || []).forEach((h) => { if (h.mode === R.mode && h.d === R.di && h.b != null) out[h.b] = { c: h.c || "amber", n: h.n || "" }; }); return out; }
function isMarked(i) { const pg = R.lay.pages[i]; if (!pg) return false; return (getS(SK.bm)[R.book.id] || []).some((m) => m.mode === R.mode && m.d === R.di && m.b >= pg.first && m.b <= pg.last && R.lay.blockPage[m.b] === i); }
function pageCanvas(i, side) {
  const key = `${i}|${side}`; let c = R.canv.get(key); if (c) return c;
  c = document.createElement("canvas");
  const scale = R.kind === "3d" ? (matchMedia("(pointer: coarse)").matches ? 1.3 : 1.7) : Math.min(2, (devicePixelRatio || 1) * 1.1);
  const pg = i >= 0 ? R.lay.pages[i] : null;
  paintPage(c, scale, pg, i, { theme: RS.theme, font: RS.font }, { side, headL: R.book.title, headR: R.docs[R.di].title === "Chapter guide" ? "Chapter guide" : R.docs[R.di].title, hl: R._hl || {}, query: R.query, reading: R.reading, bookmarked: i >= 0 && isMarked(i) });
  R.canv.set(key, c); if (R.canv.size > 24) R.canv.delete(R.canv.keys().next().value);
  return c;
}
function repaint() { R._hl = hlMap(); R.canv.clear(); if (R.engine) R.engine.invalidate(); }

async function makeEngine() {
  const want = RS.engine === "2d" ? "2d" : RS.engine === "3d" ? (webglOK() ? "3d" : "2d") : webglOK() && !RM() ? "3d" : "2d";
  if (R.engine && R.kind === want) return;
  if (R.engine) { R.engine.destroy(); R.engine = null; }
  R.kind = want; R.canv.clear(); root.dataset.engine = want;
  const hooks = {
    canvas: (i, side) => pageCanvas(i, side),
    peek: (dir) => peek(dir),
    commit: (dir, to) => { R.cur = firstOf(to); after(); },
    edge: (dir) => (dir > 0 ? next() : prev()),
    tap: (i, side, x, y, cx, cy) => tapBlock(i, side, x, y, cx, cy),
    sound: () => RS.sound && rustle(),
    zoomed: () => {},
    zoomStep: (d) => zoomStep(d),
  };
  try {
    if (want === "3d") { const { createBook3D } = await import("./book3d.js"); R.engine = await createBook3D(ui.host, hooks); R.engine.theme(RS.theme); R.engine.particles(RS.particles && !RM()); }
  } catch (e) { console.warn("3D book unavailable, using pages", e); R.kind = "2d"; root.dataset.engine = "2d"; }
  if (!R.engine) { const { createBook2D } = await import("./flat2d.js"); R.engine = createBook2D(ui.host, hooks, { calm: () => RM() }); }
  R.engine.setSingle(R.single);
}
function checkMode() {
  const single = stage.clientWidth < 760 || stage.clientWidth < stage.clientHeight * 0.95;
  if (single === R.single) return;
  R.single = single; root.classList.toggle("single", single); R.canv.clear(); if (R.lay) { const pg = R.lay.pages[R.cur], anchor = pg ? pg.first : 0; layoutDoc(); R.cur = Math.max(0, R.lay.blockPage[anchor]); R.cur = firstOf(viewFor(R.cur)); }
  if (R.engine) { R.engine.setSingle(single); R.engine.show(viewFor(R.cur), progressFrac()); }
  after(true);
}
function peek(dir) {
  const v = viewFor(R.cur);
  if (R.single) { const p = R.cur + dir; return p >= 0 && p < nPages() ? viewFor(p) : null; }
  const s = Math.floor((R.cur + 1) / 2) + dir, maxS = Math.floor(nPages() / 2);
  if (s < 0 || s > maxS) return null;
  return { l: 2 * s - 1, r: 2 * s < nPages() ? 2 * s : -1 };
}
function progressFrac() { const n = nPages(); const f = n > 1 ? R.cur / (n - 1) : 1; return (R.di + f) / R.docs.length; }

async function next() {
  if (R.busy || (R.engine && R.engine.busy())) return; closePop();
  const to = peek(1);
  if (to) { await R.engine.flip(1, to, { dur: RM() ? 1 : undefined }); return; }
  if (R.di < R.docs.length - 1) await switchDoc(R.di + 1, 0);
  else toast("You reached the end.");
}
async function prev() {
  if (R.busy || (R.engine && R.engine.busy())) return; closePop();
  const to = peek(-1);
  if (to) { await R.engine.flip(-1, to, { dur: RM() ? 1 : undefined }); return; }
  if (R.di > 0) await switchDoc(R.di - 1, -1);
}
async function switchDoc(di, page) {
  R.busy = true; loader(true); stopTts(true);
  R.di = clamp(di, 0, R.docs.length - 1); await ensureBlocks(R.docs[R.di]); layoutDoc(); R._hl = hlMap();
  R.cur = page === -1 ? nPages() - 1 : clamp(page, 0, nPages() - 1); R.cur = firstOf(viewFor(R.cur));
  if (R.engine) { R.engine.invalidate(); R.engine.show(viewFor(R.cur), progressFrac()); }
  loader(false); R.busy = false; after(true); renderPanel();
}
function goPage(p, anim = true) {
  closePop(); const to = viewFor(p); const cur = viewFor(R.cur);
  if (to.l === cur.l && to.r === cur.r) return;
  if (anim && !RM() && Math.abs(firstOf(to) - firstOf(cur)) <= 2) { R.engine.flip(firstOf(to) > firstOf(cur) ? 1 : -1, to); return; }
  R.cur = firstOf(to); R.engine.show(to, progressFrac()); after();
}
function goBlock(b, anim) { const p = R.lay.blockPage[b]; if (p >= 0) goPage(p, anim); }

/* ---------- after every move ---------- */
function after(force) {
  const v = viewFor(R.cur), n = nPages();
  if (R.engine && R.engine.kind === "3d") R.engine.show(v, progressFrac());
  const vis = visiblePages(v).map((i) => i + 1);
  $("#rdPos").textContent = `${R.docs.length > 1 ? `Part ${R.di + 1} of ${R.docs.length} · ` : ""}${vis.length > 1 ? `Pages ${vis[0]} and ${vis[1]}` : `Page ${vis[0] || 1}`} of ${n}`;
  const s = $("#rdScrub"); s.max = n; s.value = (firstOf(v) || 0) + 1; $("#rdScrubTip").textContent = ""; rangeFill(s);
  $$('[data-a="prev"]', root).forEach((b) => (b.disabled = R.di === 0 && !peek(-1)));
  $$('[data-a="next"]', root).forEach((b) => (b.disabled = R.di === R.docs.length - 1 && !peek(1)));
  $("#rdBmBtn").setAttribute("aria-pressed", String(visiblePages(v).some((i) => isMarked(i))));
  $("#rdChap").textContent = R.mode === "full" ? (R.docs.length > 1 ? R.docs[R.di].title : "Full text") : "Chapter guide";
  ring(progressFrac());
  // accessible text of the visible pages
  const ids = new Set(); visiblePages(v).forEach((i) => R.lay.pages[i].items.forEach((it) => ids.add(it.b)));
  $("#rdText").innerHTML = [...ids].map((b) => { const x = R.blocks[b]; if (!x) return ""; return x.t === "title" ? `<h2>${esc(x.x)}</h2>` : /^h/.test(x.t) ? `<h3>${esc(x.x)}</h3>` : `<p>${esc(x.x)}</p>`; }).join("");
  savePos(); deepLink();
  if (tts.on && !tts.paused && tts.block >= 0 && R.lay.blockPage[tts.block] >= 0 && !visiblePages(v).includes(R.lay.blockPage[tts.block])) { /* reader moved away: stop */ }
}
function ring(f) {
  const p = Math.round(f * 100), r = 15, L = 2 * Math.PI * r;
  $("#rdRing").innerHTML = `<svg viewBox="0 0 40 40" width="40" height="40" role="img" aria-label="${p}% read"><circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--rline)" stroke-width="4"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--teal)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - f)}" transform="rotate(-90 20 20)"/><text x="20" y="24" text-anchor="middle">${p}</text></svg>`;
}
function savePos() {
  const all = getS(SK.prog), p = all[R.book.id] || { read: [] }; const pos = { ...(p.pos || {}) };
  const pg = R.lay.pages[R.cur]; pos[R.mode] = { d: R.di, f: nPages() > 1 ? R.cur / (nPages() - 1) : 0, b: pg ? pg.first : 0 };
  all[R.book.id] = { ...p, pos, t: Date.now() }; setS(SK.prog, all);
}
function deepLink() { const h = `#/read/${R.book.id}/${R.mode}/${R.di + 1}/${R.cur + 1}`; if (location.hash !== h) history.replaceState(null, "", h); }

/* ---------- timer ---------- */
function timerTick() {
  const now = Date.now();
  if (R.timer.t0 && !root.hidden) { const dt = Math.min(120, (now - R.timer.t0) / 1000); if (!document.hidden) { R.timer.acc += dt; const all = getS(SK.time); all[R.book.id] = (all[R.book.id] || 0) + dt; setS(SK.time, all); } }
  R.timer.t0 = document.hidden || root.hidden ? 0 : now;
  if (R.book) { const tot = getS(SK.time)[R.book.id] || 0; $("#rdTime").textContent = `${fmt(R.timer.acc)} now · ${fmt(tot)} total`; }
}
const fmt = (s) => (s < 60 ? `${Math.round(s)}s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
setInterval(() => { if (root && !root.hidden) timerTick(); }, 15000);

/* ---------- paragraph actions ---------- */
function tapBlock(i, side, x, y, cx, cy) {
  const b = hitBlock(R.lay.pages[i], x, y, side); if (b < 0 || R.blocks[b].t === "title") { closePop(); return; }
  const list = getS(SK.hl)[R.book.id] || [], h = list.find((e) => e.mode === R.mode && e.d === R.di && e.b === b);
  const pop = $("#rdPop"); ui.popB = b;
  pop.innerHTML = `<div class="rp-dots">${Object.keys(HLC).filter((k) => k !== "red").map((k) => `<button type="button" class="dot" data-a="hl" data-c="${k}" style="--c:${HLC[k]}" aria-label="Highlight ${k}" aria-pressed="${h && h.c === k}"></button>`).join("")}${h ? `<button type="button" class="rb sm" data-a="unhl" aria-label="Remove highlight">${ic("close", 14)}</button>` : ""}</div>
    <div class="rp-acts"><button type="button" data-a="note">${ic("note", 14)} Note</button><button type="button" data-a="readhere">${ic("tts", 14)} Read from here</button><button type="button" data-a="copy">${ic("copy", 14)} Copy</button></div>
    <div class="rp-note" ${h && h.n ? "" : "hidden"}><textarea rows="3" placeholder="Your note, saved in this browser">${esc((h && h.n) || "")}</textarea><button type="button" class="btn sm" data-a="savenote">Save note</button></div>`;
  pop.hidden = false; const r = stage.getBoundingClientRect();
  pop.style.left = `${clamp(cx - r.left - 140, 8, r.width - 290)}px`; pop.style.top = `${clamp(cy - r.top + 14, 8, r.height - 200)}px`;
}
function closePop() { const p = $("#rdPop"); if (p) p.hidden = true; }
function setHL(b, patch) {
  const all = getS(SK.hl), list = all[R.book.id] || (all[R.book.id] = []);
  let h = list.find((e) => e.mode === R.mode && e.d === R.di && e.b === b);
  if (patch === null) { if (h) list.splice(list.indexOf(h), 1); }
  else { if (!h) { h = { mode: R.mode, d: R.di, b, c: "amber", text: R.blocks[b].x.slice(0, 400), where: R.mode === "full" ? `Full text, ${R.docs[R.di].title}` : "Chapter guide", t: Date.now() }; list.push(h); } Object.assign(h, patch, { t: Date.now() }); }
  setS(SK.hl, all); repaint(); after(); renderPanel();
}

/* ---------- bookmarks ---------- */
function toggleBookmark() {
  const v = viewFor(R.cur), all = getS(SK.bm), list = all[R.book.id] || (all[R.book.id] = []);
  const pages = visiblePages(v), marked = pages.filter((i) => isMarked(i));
  if (marked.length) { marked.forEach((i) => { const pg = R.lay.pages[i]; for (let k = list.length - 1; k >= 0; k--) { const m = list[k]; if (m.mode === R.mode && m.d === R.di && R.lay.blockPage[m.b] === i) list.splice(k, 1); } void pg; }); toast("Bookmark removed"); }
  else { const i = pages[pages.length - 1], pg = R.lay.pages[i]; const fb = pg.items.find((it) => it.k === "line"); list.push({ mode: R.mode, d: R.di, b: pg.first, label: (fb ? fb.text : R.book.title).slice(0, 90), chap: R.docs[R.di].title, t: Date.now() }); toast("Page bookmarked"); }
  setS(SK.bm, all); repaint(); after(); renderPanel();
}

/* ---------- panels ---------- */
let panel = "";
function openPanel(k) {
  panel = panel === k ? "" : k; const p = $("#rdPanel");
  $$('[data-a="toc"],[data-a="search"],[data-a="marks"],[data-a="settings"]', root).forEach((b) => b.setAttribute("aria-expanded", String(b.dataset.a === panel)));
  p.hidden = !panel; root.classList.toggle("panel-open", !!panel);
  if (!panel && R.query) { R.query = ""; repaint(); }
  renderPanel(); if (panel === "search") setTimeout(() => { const i = $("#rpQ"); i && i.focus(); }, 30);
}
function renderPanel() {
  if (!panel) return; const body = $("#rpBody"), t = $("#rpTitle"), b = R.book;
  if (panel === "toc") {
    t.textContent = "Contents";
    const items = R.mode === "full" && R.docs.length > 1 ? R.docs.map((d, i) => `<button type="button" class="ti ${i === R.di ? "on" : ""}" data-a="doc" data-d="${i}"><span>${String(i + 1).padStart(2, "0")}</span>${esc(d.title)}</button>`).join("")
      : R.mode === "guide" ? R.blocks.map((x, i) => (x.t === "h3" && x.a != null ? `<button type="button" class="ti" data-a="blk" data-b="${i}"><span>${String(x.a + 1).padStart(2, "0")}</span>${esc(x.x.replace(/^\d+\.\s*/, ""))}<small>p. ${R.lay.blockPage[i] + 1}</small></button>` : x.t === "h2" ? `<div class="tp">${esc(x.x)}</div>` : "")).join("")
      : R.blocks.map((x, i) => (x.t === "h2" || x.t === "h1" ? `<button type="button" class="ti" data-a="blk" data-b="${i}">${esc(x.x)}<small>p. ${R.lay.blockPage[i] + 1}</small></button>` : "")).join("") || `<p class="muted">One continuous text.</p>`;
    body.innerHTML = `<div class="toc">${items}</div>${R.mode === "guide" && b.free && b.free.kind === "full" ? `<a class="btn sm" href="#/read/${b.id}/full">Switch to the full text</a>` : R.mode === "full" ? `<a class="btn sm ghost" href="#/read/${b.id}/guide">Switch to the chapter guide</a>` : ""}`;
  } else if (panel === "search") {
    t.textContent = "Search inside";
    body.innerHTML = `<label class="rp-q"><input id="rpQ" type="search" placeholder="Find a word or phrase" value="${esc(R.query)}" autocomplete="off"></label>${R.docs.length > 1 ? `<label class="rp-chk"><input type="checkbox" id="rpAll" ${ui.searchAll ? "checked" : ""}> Search every part</label>` : ""}<div id="rpRes" class="rp-res" aria-live="polite"></div>`;
    $("#rpQ").addEventListener("input", (e) => { clearTimeout(ui.st); ui.st = setTimeout(() => runSearch(e.target.value), 220); });
    const all = $("#rpAll"); if (all) all.addEventListener("change", (e) => { ui.searchAll = e.target.checked; runSearch($("#rpQ").value); });
    if (R.query) runSearch(R.query);
  } else if (panel === "marks") {
    t.textContent = "Your bookmarks and notes";
    const bms = (getS(SK.bm)[b.id] || []).filter((m) => m.mode === R.mode), hls = (getS(SK.hl)[b.id] || []).filter((h) => h.mode === R.mode && h.b != null);
    body.innerHTML = `<h5>Bookmarks</h5>${bms.length ? bms.map((m, i) => `<button type="button" class="mk" data-a="jump" data-d="${m.d}" data-b="${m.b}"><b>${esc(R.docs[m.d] ? R.docs[m.d].title : "")}</b><span>${esc(m.label)}</span></button>`).join("") : `<p class="muted">Press the ribbon button to bookmark a page.</p>`}
      <h5>Highlights and notes</h5>${hls.length ? hls.map((h) => `<button type="button" class="mk hl" data-a="jump" data-d="${h.d}" data-b="${h.b}" style="--c:${HLC[h.c] || HLC.amber}"><span>${esc(h.text.slice(0, 160))}${h.text.length > 160 ? "..." : ""}</span>${h.n ? `<em>${esc(h.n)}</em>` : ""}</button>`).join("") : `<p class="muted">Tap any paragraph on a page to highlight it or add a note.</p>`}
      <button type="button" class="btn sm ghost" data-a="export">Download my notes</button>`;
  } else if (panel === "settings") {
    t.textContent = "Reading settings";
    body.innerHTML = `<h5>Theme</h5><div class="rp-themes">${Object.entries(THEMES).map(([k, v]) => `<button type="button" data-a="theme" data-v="${k}" aria-pressed="${RS.theme === k}" style="--pbg:${v.bg};--pfg:${v.ink}"><i>Aa</i>${v.name}</button>`).join("")}</div>
      <h5>Font</h5><div class="rp-fonts">${Object.entries(FONTS).map(([k, v]) => `<button type="button" data-a="font" data-v="${k}" aria-pressed="${RS.font === k}" style="font-family:${v.body.replace(/"/g, "'")}">${v.name}</button>`).join("")}</div>
      <h5>Text size <output>${RS.size}</output></h5><input type="range" min="18" max="36" step="1" value="${RS.size}" data-set="size" aria-label="Text size">
      <h5>Line height <output>${RS.lh.toFixed(2)}</output></h5><input type="range" min="1.25" max="2" step="0.05" value="${RS.lh}" data-set="lh" aria-label="Line height">
      <h5>Book</h5>
      <label class="rp-chk"><input type="checkbox" data-tog="justify" ${RS.justify ? "checked" : ""}> Justify text</label>
      <label class="rp-chk"><input type="checkbox" data-tog="sound" ${RS.sound ? "checked" : ""}> Page turn sound</label>
      <label class="rp-chk"><input type="checkbox" data-tog="particles" ${RS.particles ? "checked" : ""} ${R.kind !== "3d" ? "disabled" : ""}> Dust in the lamp light</label>
      <div class="seg rp-eng" role="group" aria-label="Book style"><button type="button" data-a="engine" data-v="auto" aria-pressed="${RS.engine === "auto"}">Auto</button><button type="button" data-a="engine" data-v="3d" aria-pressed="${RS.engine === "3d"}" ${webglOK() ? "" : "disabled"}>3D book</button><button type="button" data-a="engine" data-v="2d" aria-pressed="${RS.engine === "2d"}">Flat pages</button></div>
      <p class="muted sm">Now showing: ${R.kind === "3d" ? "the 3D book" : "flat pages"}${RM() ? ". Reduced motion is on, so page turns are instant." : "."} Keys: arrows turn pages, F focus, B bookmark, / search, T contents, + and - zoom.</p>`;
    $$("input[type=range]", body).forEach(rangeFill);
    $$("[data-set]", body).forEach((inp) => inp.addEventListener("input", (e) => { rangeFill(e.target); const k = e.target.dataset.set; RS[k] = +e.target.value; e.target.previousElementSibling.querySelector("output").textContent = k === "lh" ? RS.lh.toFixed(2) : RS.size; clearTimeout(ui.rt); ui.rt = setTimeout(relayout, 160); }));
    $$("[data-tog]", body).forEach((inp) => inp.addEventListener("change", (e) => { const k = e.target.dataset.tog; RS[k] = e.target.checked; saveRS(); if (k === "particles" && R.engine) R.engine.particles(RS.particles && !RM()); if (k === "justify") relayout(); if (k === "sound" && RS.sound) rustle(); }));
  }
}
async function runSearch(q) {
  q = q.trim(); R.query = q.length > 1 ? q : ""; repaint();
  const res = $("#rpRes"); if (!res) return; if (!R.query) { res.innerHTML = ""; return; }
  const ql = R.query.toLowerCase(), out = [];
  const docsIdx = ui.searchAll ? R.docs.map((_, i) => i) : [R.di];
  if (ui.searchAll) res.innerHTML = `<p class="muted">Searching every part...</p>`;
  for (const di of docsIdx) {
    const blocks = di === R.di ? R.blocks : (di === 0 ? [titleBlock(R.book)] : []).concat(await ensureBlocks(R.docs[di]));
    blocks.forEach((x, bi) => { const s = String(x.x || ""), k = s.toLowerCase().indexOf(ql); if (k >= 0 && out.length < 120) out.push({ di, bi, snip: s.slice(Math.max(0, k - 50), k + ql.length + 70), pre: k > 50 }); });
  }
  res.innerHTML = out.length ? `<p class="muted">${out.length}${out.length >= 120 ? "+" : ""} matches</p>` + out.map((r) => { const page = r.di === R.di ? R.lay.blockPage[r.bi] + 1 : null; const sn = esc((r.pre ? "..." : "") + r.snip).replace(new RegExp(esc(R.query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), (m) => `<mark>${m}</mark>`); return `<button type="button" class="mk" data-a="jump" data-d="${r.di}" data-b="${r.bi}">${R.docs.length > 1 ? `<b>${esc(R.docs[r.di].title)}</b>` : ""}<span>${sn}</span>${page ? `<small>p. ${page}</small>` : ""}</button>`; }).join("") : `<p class="muted">No matches${ui.searchAll ? "" : " in this part"}.</p>`;
}
async function jump(d, b) {
  if (d !== R.di) { await switchDoc(d, 0); }
  const off = R.di === 0 ? 1 : 0; // title block shifts indexes in the first part
  void off; goBlock(b, true);
}
async function relayout() {
  saveRS(); const pg = R.lay.pages[R.cur], anchor = pg ? pg.first : 0;
  await fontsReady(RS.font); layoutDoc(); R._hl = hlMap();
  R.cur = firstOf(viewFor(Math.max(0, R.lay.blockPage[anchor]))); repaint(); if (R.engine) R.engine.show(viewFor(R.cur), progressFrac()); after(); renderPanel();
}

/* ---------- read aloud ---------- */
const tts = {
  on: false, paused: false, block: -1, queue: [],
  start(fromBlock) {
    if (!("speechSynthesis" in window)) { toast("Read aloud is not supported in this browser."); return; }
    speechSynthesis.cancel(); this.on = true; this.paused = false;
    const v = viewFor(R.cur), first = fromBlock != null ? fromBlock : (R.lay.pages[firstOf(v)] || { first: 0 }).first;
    this.queue = []; for (let i = first; i < R.blocks.length; i++) if (R.blocks[i].t !== "title" && R.blocks[i].x) this.queue.push(i);
    $("#rdTts").hidden = false; $("#rdTtsBtn").setAttribute("aria-pressed", "true"); this.speakNext();
  },
  speakNext() {
    if (!this.on) return; const b = this.queue.shift();
    if (b == null) { if (R.di < R.docs.length - 1) { switchDoc(R.di + 1, 0).then(() => this.start(0)); } else stopTts(); return; }
    this.block = b; R.reading = b; repaint();
    const p = R.lay.blockPage[b], v = viewFor(R.cur);
    if (p >= 0 && !visiblePages(v).includes(p)) goPage(p, true);
    const u = new SpeechSynthesisUtterance(R.blocks[b].x); u.rate = RS.rate; u.lang = "en";
    const voice = speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang) && x.localService) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang)); if (voice) u.voice = voice;
    u.onend = () => { if (this.on && !this.paused) this.speakNext(); }; u.onerror = () => { if (this.on && !this.paused) this.speakNext(); };
    this.u = u; speechSynthesis.speak(u);
  },
  restart() { if (this.block >= 0) { this.queue.unshift(this.block); speechSynthesis.cancel(); setTimeout(() => this.speakNext(), 60); } },
};
function stopTts(silent) { if (!tts.on) return; tts.on = false; tts.paused = false; try { speechSynthesis.cancel(); } catch (e) {} R.reading = -1; tts.block = -1; $("#rdTts").hidden = true; $("#rdTtsBtn").setAttribute("aria-pressed", "false"); if (!silent) repaint(); }

/* ---------- sound ---------- */
let actx = null;
function rustle() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const len = 0.32, n = Math.floor(actx.sampleRate * len);
    const buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * t), 1.6) * (0.55 + 0.45 * Math.sin(t * 40)); }
    const src = actx.createBufferSource(); src.buffer = buf; const f = actx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 0.7;
    const g = actx.createGain(); g.gain.value = 0.16; src.connect(f).connect(g).connect(actx.destination); src.start();
  } catch (e) { /* audio blocked */ }
}

/* ---------- actions ---------- */
async function onAction(e) {
  const a = e.target.closest("[data-a]"); if (!a || !root.contains(a)) return; const k = a.dataset.a;
  if (k === "close") return close();
  if (k === "next") return next(); if (k === "prev") return prev();
  if (["toc", "search", "marks", "settings"].includes(k)) return openPanel(k);
  if (k === "panelclose") return openPanel("");
  if (k === "bookmark") return toggleBookmark();
  if (k === "tts") return tts.on ? stopTts() : tts.start();
  if (k === "ttspause") { if (!tts.paused) { tts.paused = true; speechSynthesis.pause(); a.innerHTML = ic("play", 16); a.setAttribute("aria-label", "Resume reading"); } else { tts.paused = false; speechSynthesis.resume(); a.innerHTML = ic("pause", 16); a.setAttribute("aria-label", "Pause reading"); } return; }
  if (k === "ttsstop") return stopTts();
  if (k === "share") return share();
  if (k === "focus") { const on = !root.classList.contains("focus"); root.classList.toggle("focus", on); $$('[data-a="focus"].rb', root).forEach((b) => b.setAttribute("aria-pressed", String(on))); if (on) toast("Focus mode. Press F or Esc to leave."); return; }
  if (k === "zoomin") return zoomStep(1); if (k === "zoomout") return zoomStep(-1); if (k === "zoomfit") return zoomStep(0);
  if (k === "doc") { await switchDoc(+a.dataset.d, 0); return; }
  if (k === "blk") { goBlock(+a.dataset.b, true); if (innerWidth < 900) openPanel(""); return; }
  if (k === "jump") { await jump(+a.dataset.d, +a.dataset.b); if (innerWidth < 900) openPanel(""); return; }
  if (k === "theme") { RS.theme = a.dataset.v; saveRS(); root.dataset.t = RS.theme; if (R.engine) R.engine.theme(RS.theme); repaint(); renderPanel(); return; }
  if (k === "font") { RS.font = a.dataset.v; await relayout(); return; }
  if (k === "engine") { RS.engine = a.dataset.v; saveRS(); loader(true); await makeEngine(); R.engine.skipOpen(); R.engine.show(viewFor(R.cur), progressFrac()); loader(false); after(); renderPanel(); return; }
  if (k === "export") return exportNotes();
  if (k === "hl") return setHL(ui.popB, { c: a.dataset.c });
  if (k === "unhl") { closePop(); return setHL(ui.popB, null); }
  if (k === "note") { const n = $(".rp-note", $("#rdPop")); n.hidden = false; $("textarea", n).focus(); return; }
  if (k === "savenote") { const v = $("textarea", $("#rdPop")).value.trim(); setHL(ui.popB, { n: v }); closePop(); toast(v ? "Note saved" : "Note cleared"); return; }
  if (k === "readhere") { const b = ui.popB; closePop(); tts.start(b); return; }
  if (k === "copy") { const x = R.blocks[ui.popB].x; closePop(); try { await navigator.clipboard.writeText(`${x}\n\n${R.book.title}, ${authorsLine(R.book)}`); toast("Copied"); } catch (er) { toast("Copy is not allowed here"); } return; }
}
async function share() {
  const url = `${location.origin}${location.pathname}#/read/${R.book.id}/${R.mode}/${R.di + 1}/${R.cur + 1}`;
  const data = { title: `${R.book.title} | Threshold Library`, text: `Page ${R.cur + 1} of ${R.book.title}`, url };
  try { if (navigator.share && matchMedia("(pointer: coarse)").matches) { await navigator.share(data); return; } await navigator.clipboard.writeText(url); toast("Link to this page copied"); } catch (e) { toast(url); }
}
function exportNotes() {
  const b = R.book, hls = (getS(SK.hl)[b.id] || []), bms = (getS(SK.bm)[b.id] || []);
  const lines = [`# ${b.title}`, `${authorsLine(b)}`, "", "## Highlights and notes", ...hls.map((h) => `- ${h.text}${h.n ? `\n  Note: ${h.n}` : ""}`), "", "## Bookmarks", ...bms.map((m) => `- ${m.chap || ""}: ${m.label}`), "", "Saved from the Threshold Library reader."];
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown" })); a.download = `${b.id}-notes.md`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function onKey(e) {
  if (!root || root.hidden) return;
  if (e.target.closest && e.target.closest("textarea,input,select")) { if (e.key === "Escape") e.target.blur(); return; }
  const k = e.key;
  if (["ArrowRight", "PageDown", " "].includes(k)) { e.preventDefault(); next(); }
  else if (["ArrowLeft", "PageUp"].includes(k)) { e.preventDefault(); prev(); }
  else if (k === "Home") goPage(0, false); else if (k === "End") goPage(nPages() - 1, false);
  else if (k === "f" || k === "F") $('[data-a="focus"].rb', root).click();
  else if (k === "b" || k === "B") toggleBookmark();
  else if (k === "/") { e.preventDefault(); if (panel !== "search") openPanel("search"); }
  else if (k === "t" || k === "T") openPanel("toc");
  else if (k === "+" || k === "=") zoomStep(1); else if (k === "-") zoomStep(-1); else if (k === "0") zoomStep(0);
  else if (k === "Escape") { if (!$("#rdPop").hidden) closePop(); else if (root.classList.contains("focus")) $('[data-a="focus"].rb', root).click(); else if (panel) openPanel(""); else close(); }
}
function loader(on) { const l = $("#rdLoader"); if (l) l.classList.toggle("on", !!on); }

/* ---------- open and close ---------- */
function coverImage(b, cat) {
  return new Promise((res) => {
    if (cat && cat.cover) { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(designed(b, cat)); im.src = cat.cover; }
    else res(designed(b, cat));
  });
}
function designed(b, cat) {
  const c = document.createElement("canvas"); c.width = 600; c.height = 870; const g = c.getContext("2d"), col = (cat && cat.shelfColor) || "#22d3ee";
  const gr = g.createLinearGradient(0, 0, 600, 870); gr.addColorStop(0, "#0d1b2e"); gr.addColorStop(1, "#07111f"); g.fillStyle = gr; g.fillRect(0, 0, 600, 870);
  const rg = g.createRadialGradient(480, 0, 10, 480, 0, 520); rg.addColorStop(0, col + "88"); rg.addColorStop(1, "transparent"); g.fillStyle = rg; g.fillRect(0, 0, 600, 870);
  g.fillStyle = col; g.font = '500 22px "JetBrains Mono", monospace'; g.fillText(String(b.year), 60, 110); g.fillRect(60, 640, 160, 4);
  g.fillStyle = "#e8f1fa"; g.font = '400 58px "Instrument Serif", Georgia, serif';
  const words = b.title.split(" "); let line = "", y = 250; for (const w of words) { if (g.measureText(line + w).width > 480) { g.fillText(line, 60, y); line = ""; y += 66; } line += w + " "; } g.fillText(line, 60, y);
  g.fillStyle = "#b9c9da"; g.font = '600 20px "Space Grotesk", sans-serif'; g.fillText(authorsLine(b).toUpperCase().slice(0, 40), 60, 700);
  return c;
}
export async function openReader(b, mode, opts = {}) {
  if (!root) build();
  const same = R.book && R.book.id === b.id && R.mode === (mode === "full" && b.free && b.free.kind === "full" ? "full" : "guide") && !root.hidden;
  if (same) { if (opts.d != null || opts.p != null) { if (opts.d != null && opts.d !== R.di) await switchDoc(opts.d, opts.p || 0); else if (opts.p != null) goPage(opts.p, false); } return; }
  root.hidden = false; document.body.classList.add("no-scroll"); root.dataset.t = RS.theme; loader(true);
  stopTts(true); closePop();
  R.book = b; R.cat = opts.cat; R.mode = mode === "full" && b.free && b.free.kind === "full" ? "full" : "guide"; R.timer = { t0: Date.now(), acc: 0 };
  $("#rdBook").textContent = b.title;
  checkModeQuiet();
  const [docs] = await Promise.all([loadDocs(b), fontsReady(RS.font)]);
  R.docs = docs;
  const saved = (((getS(SK.prog)[b.id] || {}).pos) || {})[R.mode];
  R.di = clamp(opts.d != null ? opts.d : saved ? saved.d || 0 : 0, 0, R.docs.length - 1);
  await ensureBlocks(R.docs[R.di]); layoutDoc(); R._hl = hlMap();
  let p = opts.p != null ? opts.p : saved && saved.b != null && R.lay.blockPage[saved.b] >= 0 ? R.lay.blockPage[saved.b] : saved ? Math.round((saved.f || 0) * (nPages() - 1)) : 0;
  R.cur = firstOf(viewFor(clamp(p, 0, nPages() - 1)));
  await makeEngine();
  if (R.engine.kind === "3d") R.engine.theme(RS.theme);
  R.engine.show(viewFor(R.cur), progressFrac());
  loader(false); after(true); timerTick();
  if (R.engine.kind === "3d" && !RM() && !R.opened.has(b.id)) { R.opened.add(b.id); const img = await coverImage(b, opts.cat); R.busy = true; await R.engine.openBook(img, (opts.cat && opts.cat.shelfColor) || "#14263c"); R.busy = false; }
  else R.engine.skipOpen();
  stage.focus && stage.setAttribute("tabindex", "-1");
}
function checkModeQuiet() { R.single = stage.clientWidth < 760 || stage.clientWidth < stage.clientHeight * 0.95; root.classList.toggle("single", R.single); }
export function close() {
  timerTick(); stopTts(true); closePop(); if (panel) openPanel("");
  root.hidden = true; root.classList.remove("focus"); if (R.engine) R.engine.pause(true);
  document.body.classList.remove("no-scroll");
  const id = R.book && R.book.id; if (R.onClose) R.onClose(id);
}
export function onClose(fn) { R.onClose = fn; }
if (typeof window !== "undefined") window.__thrReader = { state: () => ({ cur: R.cur, di: R.di, n: nPages(), kind: R.kind, single: R.single, busy: !!(R.busy || (R.engine && R.engine.busy())), book: R.book && R.book.id }) };
export function isOpen() { return root && !root.hidden; }
export function current() { return R.book ? { id: R.book.id, mode: R.mode } : null; }
