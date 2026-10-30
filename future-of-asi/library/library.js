/* Threshold library: catalogue, book pages, and a paginated reader with page turns, themes and saved progress. */
import { $, $$, esc, clamp, RM, header, footer, reveal, getJSON, videoCard, wireVideos, ICON, store, toast } from "../shared/sub.js";

header("library");
footer("Covers from Open Library or the publisher. Chapter guides are summaries, not book text. Full texts only where the licence allows.");
const CAT = await getJSON("data/books.json", { books: [], shelves: {} });
const BOOKS = CAT.books, BY = Object.fromEntries(BOOKS.map((b) => [b.id, b]));
const cache = {};
const PHOTOS = new Set(CAT.photos || []);
const loadBook = async (id) => (cache[id] ||= await getJSON(`data/books/${encodeURIComponent(id)}.json`, null));

/* ---------- storage ---------- */
const P = { get: () => store.get("lib:prog", {}), set: (v) => store.set("lib:prog", v) };
const HL = { get: () => store.get("lib:hl", {}), set: (v) => store.set("lib:hl", v) };
const NOTES = { get: () => store.get("lib:notes", {}), set: (v) => store.set("lib:notes", v) };
const prog = (id) => P.get()[id] || { read: [], t: 0 };
const saveProg = (id, patch) => { const all = P.get(); all[id] = { ...(all[id] || { read: [] }), ...patch, t: Date.now() }; P.set(all); };
const pct = (b) => { const p = prog(b.id); return b.nch ? Math.round((p.read || []).length / b.nch * 100) : 0; };

/* ---------- covers ---------- */
function coverHTML(b, big = false) {
  const front = b.cover
    ? `<img src="${esc(b.cover)}" alt="Cover of ${esc(b.title)}" loading="${big ? "eager" : "lazy"}" width="360" height="540">`
    : `<div class="dcover" style="--c:${esc(b.shelfColor)}"><span class="y">${esc(b.year)}${b.kind === "essay" ? " · ESSAY" : ""}</span><span class="t">${esc(b.title)}</span><span><span class="ln"></span><br><span class="a">${esc(b.authors.map((a) => a.name).slice(0, 2).join(", "))}${b.authors.length > 2 ? " and others" : ""}</span></span><span class="lab">Threshold cover design</span></div>`;
  return `<div class="cv3"><div class="spine"></div><div class="pages"></div><div class="front">${front}</div></div>`;
}
function tilt(el, max = 16) {
  const cv = $(".cv3", el); if (!cv) return;
  el.addEventListener("pointermove", (e) => { if (RM()) return; const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; cv.style.transform = `rotateY(${-10 + x * max}deg) rotateX(${-y * max * 0.7}deg) translateZ(10px)`; cv.style.setProperty("--gl", String(0.06 + Math.abs(x) * 0.25)); });
  el.addEventListener("pointerleave", () => { cv.style.transform = ""; cv.style.removeProperty("--gl"); });
}

/* ---------- catalogue ---------- */
$("#countBooks").textContent = BOOKS.filter((b) => b.kind === "book").length;
$("#countEssays").textContent = BOOKS.filter((b) => b.kind === "essay").length;
const BASE_TITLE = document.title;
const S = { shelf: "all", q: "", sort: "year", free: "" };
const shelfCounts = BOOKS.reduce((m, b) => ((m[b.shelf] = (m[b.shelf] || 0) + 1), m), {});
$("#shelves").innerHTML = [["all", "All", BOOKS.length], ...Object.entries(CAT.shelves).filter(([k]) => shelfCounts[k]).map(([k, [l]]) => [k, l, shelfCounts[k]])]
  .map(([k, l, n]) => `<button class="chip" type="button" data-k="${k}" aria-pressed="${k === "all"}" style="--c:${k === "all" ? "var(--cyan)" : esc(CAT.shelves[k][1])}">${k === "all" ? "" : '<i class="sw"></i>'}${esc(l)} <span class="mono" style="opacity:.85">${n}</span></button>`).join("");
function renderGrid() {
  const q = S.q.trim().toLowerCase();
  let list = BOOKS.filter((b) => (S.shelf === "all" || b.shelf === S.shelf) && (!S.free || (S.free === "full" ? b.free === "full" : !!b.free)) && (!q || [b.title, b.subtitle, b.pitch, b.publisher, b.authors.map((a) => a.name).join(" ")].join(" ").toLowerCase().includes(q)));
  list = list.slice().sort((a, b) => S.sort === "title" ? a.title.localeCompare(b.title) : S.sort === "old" ? a.year.localeCompare(b.year) : b.year.localeCompare(a.year));
  $("#count").textContent = `${list.length} of ${BOOKS.length}`;
  $("#grid").innerHTML = list.map((b, i) => { const p = pct(b); return `<button class="bk rv" type="button" data-id="${esc(b.id)}" style="--c:${esc(b.shelfColor)};transition-delay:${Math.min(12, i % 12) * 0.035}s">${coverHTML(b).replace('<div class="cv3">', `<div class="cv3">${p ? `<span class="done">${p}%</span>` : ""}`)}<div class="meta"><b>${esc(b.title)}</b><span>${esc(b.authors.map((a) => a.name).slice(0, 2).join(", "))}${b.authors.length > 2 ? " and others" : ""} · ${esc(b.year)}</span><div class="row"><span class="tag" style="--c:${esc(b.shelfColor)}">${esc(b.shelfLabel)}</span>${b.free === "full" ? '<span class="free">Full text</span>' : b.free === "link" ? '<span class="free link">Free online</span>' : ""}</div></div></button>`; }).join("") || `<div class="empty-state" style="grid-column:1/-1">Nothing matches that search.</div>`;
  $$("#grid .bk").forEach((el) => tilt(el, 14));
  reveal($("#grid"));
  LIST = list; if (shelf) shelf.setList(list);
}
function renderContinue() {
  const all = P.get(); const ids = Object.keys(all).filter((id) => BY[id] && all[id].t).sort((a, b) => all[b].t - all[a].t).slice(0, 8);
  $("#continue").innerHTML = ids.length ? `<div class="cont"><h3>Continue reading</h3><div class="cont-row">${ids.map((id) => { const b = BY[id]; return `<button type="button" data-id="${esc(id)}"><span class="mini">${b.cover ? `<img src="${esc(b.cover)}" alt="">` : ""}</span><span><b>${esc(b.title)}</b><small>${pct(b)}% of chapters marked read</small><div class="pbar"><i style="width:${pct(b)}%"></i></div></span></button>`; }).join("")}</div></div>` : "";
}
$("#shelves").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.shelf = S.shelf === b.dataset.k ? "all" : b.dataset.k; $$("#shelves .chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.k === S.shelf))); renderGrid(); });
$("#q").addEventListener("input", (e) => { S.q = e.target.value; renderGrid(); });
$("#sort").addEventListener("change", (e) => { S.sort = e.target.value; renderGrid(); });
$$("#freeOnly, #freeAny").forEach((btn) => btn.addEventListener("click", () => { S.free = S.free === btn.dataset.f ? "" : btn.dataset.f; $$("#freeOnly, #freeAny").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.f === S.free))); renderGrid(); }));
$("#nFull").textContent = BOOKS.filter((b) => b.free === "full").length; $("#nFree").textContent = BOOKS.filter((b) => b.free).length;
document.addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b && (b.closest("#grid") || b.closest("#continue"))) location.hash = `#/book/${b.dataset.id}`; });
let LIST = [], shelf = null;
renderGrid(); renderContinue();
{ // stats in the hero
  const full = BOOKS.filter((b) => b.free === "full").length, cov = BOOKS.filter((b) => b.cover).length, shelves = Object.keys(shelfCounts).length;
  $("#lstats").innerHTML = `<span><b>${BOOKS.length}</b> titles</span><span><b>${shelves}</b> shelves</span><span><b>${full}</b> full texts to read here</span><span><b>${BOOKS.filter((b) => b.free === "link").length}</b> more free online</span><span><b>${cov}</b> verified covers</span><span><b>${BOOKS.reduce((a, b) => a + (b.nch || 0), 0)}</b> chapter guides</span>`;
}
/* ---------- 3D shelf ---------- */
const gl = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
if (gl && !RM()) {
  import("./shelf3d.js").then((m) => m.createShelf($("#shelfHost"), {
    calm: RM,
    onOpen: (id) => { const b = BY[id]; location.hash = `#/read/${id}/${b.free === "full" ? "full" : "guide"}`; },
    onHover: (b, e) => { const t = $("#shTip"); if (!b || !e) { t.hidden = true; return; } const r = $("#shelfHost").getBoundingClientRect(); t.hidden = false; t.style.setProperty("--c", b.shelfColor); t.style.left = `${e.clientX - r.left}px`; t.style.top = `${e.clientY - r.top}px`; t.innerHTML = `<b>${esc(b.title)}</b><span>${esc(b.authors.map((a) => a.name).slice(0, 2).join(", "))} · ${esc(b.year)}</span><small>${esc(b.shelfLabel)}${b.free === "full" ? " · full text" : ""} · click to read</small>`; },
    onScroll: (f, can) => { const bar = $("#shBar"); bar.style.transform = `translateX(${f * 355}%)`; $("#shPrev").disabled = !can; $("#shNext").disabled = !can; },
    scrollY: () => { const r = $("#shelf3d").getBoundingClientRect(); return clamp((innerHeight / 2 - (r.top + r.height / 2)) / innerHeight, -0.6, 0.6); },
  })).then((s) => { shelf = s; $("#shelf3d").hidden = false; s.setList(LIST); $("#shPrev").onclick = () => s.scrollBy(-1.6); $("#shNext").onclick = () => s.scrollBy(1.6); }).catch((e) => console.warn("3D shelf unavailable", e));
}

/* ---------- book view ---------- */
const bv = $("#bookview");
let curBook = null, lastFocus = null;
const TABS = [["guide", "Chapter guide"], ["ideas", "Key ideas"], ["args", "Arguments"], ["quotes", "Quotes"], ["discuss", "Discuss"], ["quiz", "Quiz"], ["watch", "Watch"], ["where", "Where to read"], ["notes", "My notes"]];
async function openBook(id, tab = "guide") {
  const b = await loadBook(id); if (!b) { toast("That book could not be loaded."); location.hash = "#/"; return; }
  curBook = b; lastFocus = lastFocus || document.activeElement;
  const c = BY[id];
  const authors = b.authors.map((a) => a.rid ? `<a href="../#/researchers/${esc(a.rid)}">${esc(a.name)}</a>` : esc(a.name)).join(", ");
  const faces = b.authors.filter((a) => a.rid && PHOTOS.has(a.rid)).slice(0, 4).map((a) => `<a class="aface" href="../#/researchers/${esc(a.rid)}" title="${esc(a.name)}"><img src="../assets/people/${esc(a.rid)}.jpg" alt="${esc(a.name)}" loading="lazy" width="44" height="44"></a>`).join("");
  const meta = [["Year", b.year], ["Publisher", b.publisher], ["Pages", b.pages], ["ISBN", b.isbn], ["Level", b.level], ["Shelf", b.shelfLabel]].filter(([, v]) => v);
  const tabs = TABS.filter(([k]) => !(k === "quotes" && !b.quotes.length) && !(k === "watch" && !b.videos.length));
  $("#bvInner").innerHTML = `
    <div class="bv-top"><button class="btn sm ghost" type="button" data-close>${ICON.arrow.replace("M5 12h14M13 6l6 6-6 6", "M19 12H5M11 6l-6 6 6 6")} Library</button><div class="row" style="gap:8px"><button class="btn sm ghost" type="button" id="bvShare">Copy link</button></div></div>
    <div class="bv-head">
      <div class="bv-cover" id="bvCover">${coverHTML(c, true)}<span class="src">${b.cover ? "Cover from Open Library or the publisher" : "Cover designed for Threshold"}</span></div>
      <div>
        <span class="tag" style="--c:${esc(b.shelfColor)}">${esc(b.shelfLabel)}</span>
        <h2 id="bvTitle">${esc(b.title)}</h2>${b.subtitle ? `<div class="sub">${esc(b.subtitle)}</div>` : ""}
        <div class="by">${faces ? `<span class="faces">${faces}</span>` : ""}<span>by ${authors}</span></div>
        <p class="pitch">${esc(b.pitch)}</p>
        <div class="metatbl">${meta.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join("")}</div>
        <div class="row" style="gap:10px;align-items:center">
          ${b.free && b.free.kind === "full" ? `<button class="btn primary" type="button" data-read="full">Read the full text<span class="shine"></span></button>` : ""}
          <button class="btn ${b.free && b.free.kind === "full" ? "" : "primary"}" type="button" data-read="guide">Read the chapter guide</button>
          ${b.free && b.free.kind === "link" ? `<a class="btn ghost" href="${esc(b.free.url)}" target="_blank" rel="noopener">${esc(b.free.label)} ${ICON.ext}</a>` : ""}
          <span id="bvRing"></span>
        </div>
        ${b.free && b.free.kind === "full" ? "" : `<p class="bv-guide-note">${b.free && b.free.kind === "link" ? "The book itself is free on its own site (the button above). The chapter guide here is a plain words summary of each chapter, written for Threshold." : "This book is not free to share, so the reader here opens a chapter guide: a plain words summary of each chapter, written for Threshold. It is not the book itself. See Where to read for libraries and shops."}</p>`}
      </div>
    </div>
    <div class="bv-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${l}</button>`).join("")}</div>
    <div id="bvPanel" class="bv-panel" role="tabpanel"></div>`;
  ring(); showTab(tabs.some(([k]) => k === tab) ? tab : "guide");
  bv.hidden = false; bv.classList.remove("open"); void bv.offsetWidth; bv.classList.add("open"); document.body.classList.add("no-scroll");
  $("#bvScroll").scrollTop = 0; tilt($("#bvCover"), 22);
  $("[data-close]", bv).focus({ preventScroll: true });
  document.title = `${b.title} | Threshold Library`;
}
function ring() {
  const c = BY[curBook.id], p = pct(c), r = 26, L = 2 * Math.PI * r;
  $("#bvRing").innerHTML = `<svg class="ring" viewBox="0 0 64 64" role="img" aria-label="${p}% of chapters marked read"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--teal)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - p / 100)}" transform="rotate(-90 32 32)"/><text x="32" y="36" text-anchor="middle">${p}%</text></svg>`;
}
function showTab(k) {
  const b = curBook, el = $("#bvPanel");
  $$(".bv-tabs button", bv).forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === k)));
  el.classList.remove("bv-panel"); void el.offsetWidth; el.classList.add("bv-panel");
  if (k === "guide") {
    const read = new Set(prog(b.id).read || []); let lastPart = null;
    el.innerHTML = `<p class="guide-note">${b.guide_kind === "themes" ? `${esc(b.toc_note || "")} The lines are my own short summaries, not the author's words.` : `Chapter titles from the published contents (<a href="${esc(b.toc_src)}" target="_blank" rel="noopener">source</a>). The guide lines are my own short summaries, not the author's words.${b.toc_note ? " " + esc(b.toc_note) : ""}`} Tick ${b.guide_kind === "themes" ? "a theme" : "a chapter"} when you have read it.</p><div class="chlist">${b.chapters.map((c, i) => { const part = c.part && c.part !== lastPart ? `<div class="part">${esc(c.part)}</div>` : ""; lastPart = c.part || lastPart; return `${part}<div class="chrow ${read.has(i) ? "read" : ""}" data-i="${i}"><span class="n">${String(i + 1).padStart(2, "0")}</span><div><h4>${esc(c.t)}</h4><p>${esc(c.g)}</p></div><button class="tick" type="button" aria-pressed="${read.has(i)}" aria-label="Mark chapter ${i + 1} as read">✓</button></div>`; }).join("")}</div>`;
  } else if (k === "ideas") {
    el.innerHTML = `<ol class="ideas">${b.ideas.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`;
  } else if (k === "args") {
    el.innerHTML = `<p class="guide-note">The book's main claims next to the strongest pushback I could find. Read both and decide.</p>${b.args.map((a) => `<div class="argrow"><div><small>The book argues</small><p>${esc(a.a)}</p></div><div><small>Counter argument</small><p>${esc(a.c)}</p></div></div>`).join("")}`;
  } else if (k === "quotes") {
    el.innerHTML = `<p class="guide-note">Short quotes for discussion, each with its source.</p>${b.quotes.map((q) => `<figure class="bq"><blockquote>&ldquo;${esc(q.text)}&rdquo;</blockquote><figcaption>${esc(q.src)} · <a href="${esc(q.url)}" target="_blank" rel="noopener">source</a></figcaption></figure>`).join("")}`;
  } else if (k === "discuss") {
    el.innerHTML = `<p class="guide-note">For a reading group, a class, or a long walk.</p><ol class="qs">${b.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>`;
  } else if (k === "quiz") {
    const best = store.get("lib:quiz", {})[b.id];
    el.innerHTML = `<p class="guide-note">${b.quiz.length} questions on the big ideas.${best != null ? ` Your best: ${best} of ${b.quiz.length}.` : ""}</p><div class="quiz">${b.quiz.map((z, i) => `<div class="card qq" data-q="${i}"><h4>${i + 1}. ${esc(z.q)}</h4><div class="opts">${z.o.map((o, j) => `<button class="opt" type="button" data-j="${j}">${esc(o)}</button>`).join("")}</div><p class="why">${esc(z.w)}</p></div>`).join("")}</div><p class="count" id="quizScore" aria-live="polite"></p>`;
  } else if (k === "watch") {
    el.innerHTML = `<p class="guide-note">Talks and interviews with the authors, or about the book, from Threshold's verified video list. They play only when you press play.</p><div class="vgrid">${b.videos.map(videoCard).join("")}</div>`;
    wireVideos(el);
  } else if (k === "where") {
    el.innerHTML = `<div class="where">${b.where.map((w) => `<a href="${esc(w.url)}" target="_blank" rel="noopener"><span>${esc(w.label)}</span><span class="tag" style="--c:${w.free ? "var(--lime)" : "var(--blue)"}">${w.free ? "Free" : "Buy"}</span></a>`).join("")}</div>${b.free ? `<div class="lic"><b>Licence:</b> ${esc(b.free.licence)}${b.free.licence_url ? ` <a href="${esc(b.free.licence_url)}" target="_blank" rel="noopener">Details</a>` : ""}</div>` : `<div class="lic">This book is under copyright, so its text is not reproduced here. Support the author by buying it or borrowing it from a library.</div>`}`;
  } else if (k === "notes") {
    const hl = HL.get()[b.id] || [];
    el.innerHTML = `<div class="notes"><label for="nt" class="guide-note" style="display:block">Private notes, saved only in this browser.</label><textarea id="nt" placeholder="What did you think? What will you do differently?">${esc(NOTES.get()[b.id] || "")}</textarea></div><h4 style="margin-top:22px">Highlights</h4>${hl.length ? `<ul class="hls">${hl.map((h, i) => `<li><span>${esc(h.text)}<small>${esc(h.where || "")}</small></span><button type="button" data-del="${i}" aria-label="Delete highlight">${ICON.close}</button></li>`).join("")}</ul>` : `<p class="muted">No highlights yet. Select text in the reader and press Highlight.</p>`}`;
    let tmo; $("#nt").addEventListener("input", (e) => { clearTimeout(tmo); tmo = setTimeout(() => { const all = NOTES.get(); all[b.id] = e.target.value; NOTES.set(all); saveProg(b.id, {}); toast("Notes saved"); }, 600); });
  }
}
bv.addEventListener("click", async (e) => {
  if (e.target.closest("[data-close]")) { closeBook(); return; }
  const t = e.target.closest("[data-tab]"); if (t) { showTab(t.dataset.tab); return; }
  const r = e.target.closest("[data-read]"); if (r) { location.hash = `#/read/${curBook.id}/${r.dataset.read}`; return; }
  if (e.target.closest("#bvShare")) { try { await navigator.clipboard.writeText(location.href); toast("Link copied"); } catch (er) { toast(location.href); } return; }
  const tick = e.target.closest(".tick"); if (tick) { const i = +tick.closest(".chrow").dataset.i; const p = prog(curBook.id); const s = new Set(p.read || []); s.has(i) ? s.delete(i) : s.add(i); saveProg(curBook.id, { read: [...s] }); tick.closest(".chrow").classList.toggle("read", s.has(i)); tick.setAttribute("aria-pressed", String(s.has(i))); ring(); renderGrid(); renderContinue(); return; }
  const opt = e.target.closest(".opt"); if (opt) { const qq = opt.closest(".qq"); if (qq.classList.contains("done")) return; const z = curBook.quiz[+qq.dataset.q]; const j = +opt.dataset.j; qq.classList.add("done"); $$(".opt", qq).forEach((o, k) => { o.disabled = true; if (k === z.a) o.classList.add("right"); else if (k === j) o.classList.add("wrong"); }); qq.dataset.ok = String(j === z.a); const done = $$(".qq.done", bv), ok = done.filter((d) => d.dataset.ok === "true").length; $("#quizScore").textContent = `${ok} of ${done.length} right`; if (done.length === curBook.quiz.length) { const all = store.get("lib:quiz", {}); all[curBook.id] = Math.max(all[curBook.id] || 0, ok); store.set("lib:quiz", all); toast(`Quiz done: ${ok} of ${done.length}`); } return; }
  const del = e.target.closest("[data-del]"); if (del) { const all = HL.get(); (all[curBook.id] || []).splice(+del.dataset.del, 1); HL.set(all); showTab("notes"); }
});
function closeBook() { location.hash = "#/"; }
function hideBook() { bv.hidden = true; document.body.classList.remove("no-scroll"); document.title = BASE_TITLE; if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); lastFocus = null; }

addEventListener("keydown", (e) => { if (e.key === "Escape" && !bv.hidden && !(RD && RD.isOpen())) closeBook(); });

/* ---------- reader (3D book with a 2D fallback, in reader/) ---------- */
let RD = null;
const reader = async () => (RD ||= await import("./reader/reader.js"));
async function openReader(id, mode, d, p) {
  const b = await loadBook(id); if (!b) return;
  if (!bv.hidden && curBook && curBook.id !== id) hideBook();
  const m = await reader();
  m.onClose((bid) => { renderGrid(); renderContinue(); if (shelf) shelf.refresh(); location.hash = bid ? `#/book/${bid}` : "#/"; });
  await m.openReader(b, mode, { cat: BY[id], d, p });
}

/* ---------- router ---------- */
async function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const m = h.match(/^(book|read)\/([a-z0-9-]+)(?:\/(\w+))?(?:\/(\d+))?(?:\/(\d+))?/);
  const closeRd = async () => { if (RD && RD.isOpen()) { const cb = RD.onClose; RD.onClose(() => {}); RD.close(); RD.onClose((bid) => { renderGrid(); renderContinue(); if (shelf) shelf.refresh(); location.hash = bid ? `#/book/${bid}` : "#/"; }); } };
  if (!m) { await closeRd(); if (!bv.hidden) hideBook(); renderGrid(); renderContinue(); return; }
  if (!BY[m[2]]) { location.hash = "#/"; return; }
  if (m[1] === "book") { await closeRd(); if (bv.hidden || !curBook || curBook.id !== m[2]) await openBook(m[2], m[3] || "guide"); else if (m[3]) showTab(m[3]); }
  else { if (bv.hidden || !curBook || curBook.id !== m[2]) await openBook(m[2]); await openReader(m[2], m[3] || "guide", m[4] ? +m[4] - 1 : undefined, m[5] ? +m[5] - 1 : undefined); }
}
addEventListener("hashchange", route);
route();
