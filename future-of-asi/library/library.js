/* Threshold library: catalogue, book pages, and a paginated reader with page turns, themes and saved progress. */
import { $, $$, esc, clamp, RM, header, footer, reveal, getJSON, videoCard, wireVideos, ICON, store, toast } from "../shared/sub.js";

header("library");
footer("Covers from Open Library or the publisher. Chapter guides are summaries, not book text. Full texts only where the licence allows.");
const CAT = await getJSON("data/books.json", { books: [], shelves: {} });
const BOOKS = CAT.books, BY = Object.fromEntries(BOOKS.map((b) => [b.id, b]));
const cache = {};
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
const S = { shelf: "all", q: "", sort: "year", free: false };
const shelfCounts = BOOKS.reduce((m, b) => ((m[b.shelf] = (m[b.shelf] || 0) + 1), m), {});
$("#shelves").innerHTML = [["all", "All", BOOKS.length], ...Object.entries(CAT.shelves).filter(([k]) => shelfCounts[k]).map(([k, [l]]) => [k, l, shelfCounts[k]])]
  .map(([k, l, n]) => `<button class="chip" type="button" data-k="${k}" aria-pressed="${k === "all"}">${esc(l)} <span class="mono" style="opacity:.55">${n}</span></button>`).join("");
function renderGrid() {
  const q = S.q.trim().toLowerCase();
  let list = BOOKS.filter((b) => (S.shelf === "all" || b.shelf === S.shelf) && (!S.free || b.free) && (!q || [b.title, b.subtitle, b.pitch, b.publisher, b.authors.map((a) => a.name).join(" ")].join(" ").toLowerCase().includes(q)));
  list = list.slice().sort((a, b) => S.sort === "title" ? a.title.localeCompare(b.title) : S.sort === "old" ? a.year.localeCompare(b.year) : b.year.localeCompare(a.year));
  $("#count").textContent = `${list.length} of ${BOOKS.length}`;
  $("#grid").innerHTML = list.map((b) => { const p = pct(b); return `<button class="bk rv" type="button" data-id="${esc(b.id)}" aria-label="${esc(b.title)} by ${esc(b.authors.map((a) => a.name).join(", "))}">${coverHTML(b).replace('<div class="cv3">', `<div class="cv3">${p ? `<span class="done">${p}%</span>` : ""}`)}<div class="meta"><b>${esc(b.title)}</b><span>${esc(b.authors.map((a) => a.name).slice(0, 2).join(", "))}${b.authors.length > 2 ? " and others" : ""} · ${esc(b.year)}</span><div class="row"><span class="tag" style="--c:${esc(b.shelfColor)}">${esc(b.shelfLabel)}</span>${b.free === "full" ? '<span class="free">Full text</span>' : b.free === "link" ? '<span class="free link">Free online</span>' : ""}</div></div></button>`; }).join("") || `<div class="empty-state" style="grid-column:1/-1">Nothing matches that search.</div>`;
  $$("#grid .bk").forEach((el) => tilt(el, 14));
  reveal($("#grid"));
}
function renderContinue() {
  const all = P.get(); const ids = Object.keys(all).filter((id) => BY[id] && all[id].t).sort((a, b) => all[b].t - all[a].t).slice(0, 8);
  $("#continue").innerHTML = ids.length ? `<div class="cont"><h3>Continue reading</h3><div class="cont-row">${ids.map((id) => { const b = BY[id]; return `<button type="button" data-id="${esc(id)}"><span class="mini">${b.cover ? `<img src="${esc(b.cover)}" alt="">` : ""}</span><span><b>${esc(b.title)}</b><small>${pct(b)}% of chapters marked read</small><div class="pbar"><i style="width:${pct(b)}%"></i></div></span></button>`; }).join("")}</div></div>` : "";
}
$("#shelves").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.shelf = b.dataset.k; $$("#shelves .chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b))); renderGrid(); });
$("#q").addEventListener("input", (e) => { S.q = e.target.value; renderGrid(); });
$("#sort").addEventListener("change", (e) => { S.sort = e.target.value; renderGrid(); });
$("#freeOnly").addEventListener("click", (e) => { S.free = !S.free; e.currentTarget.setAttribute("aria-pressed", String(S.free)); renderGrid(); });
document.addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b && (b.closest("#grid") || b.closest("#continue"))) location.hash = `#/book/${b.dataset.id}`; });
renderGrid(); renderContinue();

/* ---------- book view ---------- */
const bv = $("#bookview");
let curBook = null, lastFocus = null;
const TABS = [["guide", "Chapter guide"], ["ideas", "Key ideas"], ["args", "Arguments"], ["quotes", "Quotes"], ["discuss", "Discuss"], ["quiz", "Quiz"], ["watch", "Watch"], ["where", "Where to read"], ["notes", "My notes"]];
async function openBook(id, tab = "guide") {
  const b = await loadBook(id); if (!b) { toast("That book could not be loaded."); location.hash = "#/"; return; }
  curBook = b; lastFocus = lastFocus || document.activeElement;
  const c = BY[id];
  const authors = b.authors.map((a) => a.rid ? `<a href="../#/researchers/${esc(a.rid)}">${esc(a.name)}</a>` : esc(a.name)).join(", ");
  const meta = [["Year", b.year], ["Publisher", b.publisher], ["Pages", b.pages], ["ISBN", b.isbn], ["Level", b.level], ["Shelf", b.shelfLabel]].filter(([, v]) => v);
  const tabs = TABS.filter(([k]) => !(k === "quotes" && !b.quotes.length) && !(k === "watch" && !b.videos.length));
  $("#bvInner").innerHTML = `
    <div class="bv-top"><button class="btn sm ghost" type="button" data-close>${ICON.arrow.replace("M5 12h14M13 6l6 6-6 6", "M19 12H5M11 6l-6 6 6 6")} Library</button><div class="row" style="gap:8px"><button class="btn sm ghost" type="button" id="bvShare">Copy link</button></div></div>
    <div class="bv-head">
      <div class="bv-cover" id="bvCover">${coverHTML(c, true)}<span class="src">${b.cover ? "Cover from Open Library or the publisher" : "Cover designed for Threshold"}</span></div>
      <div>
        <span class="tag" style="--c:${esc(b.shelfColor)}">${esc(b.shelfLabel)}</span>
        <h2 id="bvTitle">${esc(b.title)}</h2>${b.subtitle ? `<div class="sub">${esc(b.subtitle)}</div>` : ""}
        <div class="by">by ${authors}</div>
        <p class="pitch">${esc(b.pitch)}</p>
        <div class="metatbl">${meta.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join("")}</div>
        <div class="row" style="gap:10px;align-items:center">
          ${b.free && b.free.kind === "full" ? `<button class="btn primary" type="button" data-read="full">Read the full text<span class="shine"></span></button>` : ""}
          <button class="btn ${b.free && b.free.kind === "full" ? "" : "primary"}" type="button" data-read="guide">Read the chapter guide</button>
          ${b.free && b.free.kind === "link" ? `<a class="btn ghost" href="${esc(b.free.url)}" target="_blank" rel="noopener">${esc(b.free.label)} ${ICON.ext}</a>` : ""}
          <span id="bvRing"></span>
        </div>
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
    el.innerHTML = `<p class="guide-note">Chapter titles from the published contents (<a href="${esc(b.toc_src)}" target="_blank" rel="noopener">source</a>). The guide lines are my own short summaries, not the author's words.${b.toc_note ? " " + esc(b.toc_note) : ""} Tick a chapter when you have read it.</p><div class="chlist">${b.chapters.map((c, i) => { const part = c.part && c.part !== lastPart ? `<div class="part">${esc(c.part)}</div>` : ""; lastPart = c.part || lastPart; return `${part}<div class="chrow ${read.has(i) ? "read" : ""}" data-i="${i}"><span class="n">${String(i + 1).padStart(2, "0")}</span><div><h4>${esc(c.t)}</h4><p>${esc(c.g)}</p></div><button class="tick" type="button" aria-pressed="${read.has(i)}" aria-label="Mark chapter ${i + 1} as read">✓</button></div>`; }).join("")}</div>`;
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
function hideBook() { bv.hidden = true; document.body.classList.remove("no-scroll"); document.title = "The Library: 30 books and 6 essays on superintelligence and AI risk | Threshold"; if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); lastFocus = null; }

/* ---------- reader ---------- */
const rd = $("#reader"), cols = $("#rdCols");
const RS = Object.assign({ t: "dark", size: 19, f: "serif" }, store.get("lib:reader", {}));
const applyRS = () => { rd.dataset.t = RS.t; rd.dataset.f = RS.f; rd.style.setProperty("--rsize", RS.size + "px"); $$(".rd-theme button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === RS.t))); store.set("lib:reader", RS); };
applyRS();
const R = { book: null, mode: "guide", docs: [], di: 0, page: 0, pages: 1, busy: false };
function blocksToHTML(blocks) {
  return blocks.map((b) => b.t === "h1" ? `<h1>${esc(b.x)}</h1>` : b.t === "h2" ? `<h2>${esc(b.x)}</h2>` : b.t === "h3" ? `<h3>${esc(b.x)}</h3>` : b.t === "h4" ? `<h3>${esc(b.x)}</h3>` : b.t === "li" ? `<p>&bull; ${esc(b.x)}</p>` : b.t === "fig" ? `<div class="fig">${esc(b.x)} <br>[Not reproduced here. See the official PDF.]</div>` : b.t === "hint" ? `<div class="ghint">${esc(b.x)}</div>` : `<p>${esc(b.x)}</p>`).join("");
}
function guideDoc(b) {
  const bl = [{ t: "h1", x: b.title }, { t: "hint", x: "Chapter guide by Threshold. Short summaries in my own words, not the book's text." }];
  let lp = null;
  b.chapters.forEach((c, i) => { if (c.part && c.part !== lp) { bl.push({ t: "h2", x: c.part }); lp = c.part; } bl.push({ t: "h3", x: `${i + 1}. ${c.t}`, a: i }); bl.push({ t: "p", x: c.g }); });
  bl.push({ t: "h2", x: "Key ideas" }); b.ideas.forEach((x) => bl.push({ t: "li", x }));
  bl.push({ t: "h2", x: "Questions to think about" }); b.questions.forEach((x) => bl.push({ t: "li", x }));
  return { id: "guide", title: "Chapter guide", blocks: bl };
}
async function openReader(id, mode) {
  const b = await loadBook(id); if (!b) return;
  if (!bv.hidden && curBook && curBook.id !== id) hideBook();
  R.book = b; R.mode = mode === "full" && b.free && b.free.kind === "full" ? "full" : "guide";
  $("#rdBook").textContent = b.title;
  if (R.mode === "full") {
    const src = b.free.text;
    if (src.endsWith("index.json")) { const idx = await getJSON(src, []); const base = src.replace("index.json", ""); R.docs = idx.map((d) => ({ id: d.id, title: d.title, url: `${base}${d.id}.json` })); }
    else { const d = await getJSON(src, null); R.docs = [{ id: "all", title: d ? d.title : b.title, blocks: d ? d.blocks : [] }]; }
    $("#rdLic").textContent = b.free.licence;
  } else { R.docs = [guideDoc(b)]; $("#rdLic").textContent = "Summary by Threshold. Not the book's text."; }
  const saved = (prog(b.id).pos || {})[R.mode] || { d: 0, f: 0 };
  rd.hidden = false; document.body.classList.add("no-scroll");
  renderToc();
  await loadDoc(clamp(saved.d || 0, 0, R.docs.length - 1), saved.f || 0);
  cols.focus({ preventScroll: true });
}
async function loadDoc(di, frac = 0, atEnd = false) {
  R.di = di; const d = R.docs[di];
  if (!d.blocks) { cols.innerHTML = `<p class="gk">Loading...</p>`; const j = await getJSON(d.url, null); d.blocks = j ? j.blocks : [{ t: "p", x: "This chapter could not be loaded." }]; }
  let pre = [];
  if (R.mode === "full" && R.book.id === "aises" && di === 0) pre = [{ t: "hint", x: `Dan Hendrycks, Introduction to AI Safety, Ethics, and Society, arXiv:2411.01042v2. Licensed CC BY-NC-ND 4.0. Text reproduced without changes. Figures and tables are not reproduced. Official version: aisafetybook.com` }];
  if (R.mode === "full" && R.book.id === "butler-1863") pre = [{ t: "hint", x: "Public domain. Text from Wikisource, from the 1917 reprint in The Note-Books of Samuel Butler." }];
  cols.innerHTML = blocksToHTML(pre.concat(d.blocks));
  applyHL();
  $("#rdChap").textContent = R.mode === "full" && R.docs.length > 1 ? d.title : R.mode === "guide" ? "Chapter guide" : "Full text";
  $$("#rdTocPanel [data-d]").forEach((b) => b.setAttribute("aria-current", String(+b.dataset.d === di)));
  layout(); R.page = atEnd ? R.pages - 1 : clamp(Math.round(frac * (R.pages - 1)), 0, R.pages - 1); go(R.page, false);
}
function geom() { const w = cols.clientWidth; const two = rd.clientWidth > 980; const gap = parseFloat(getComputedStyle(cols).columnGap) || 40; cols.style.columnCount = two ? 2 : 1; cols.style.columnWidth = "auto"; return { w, gap }; }
function layout() { const { w, gap } = geom(); cols.scrollLeft = 0; R.step = w + gap; R.pages = Math.max(1, Math.round((cols.scrollWidth + gap) / R.step)); }
function go(p, anim = true, dir = 1) {
  R.page = clamp(p, 0, R.pages - 1);
  const apply = () => { cols.scrollLeft = R.page * R.step; foot(); savePos(); };
  if (anim && !RM()) { const leaf = $("#rdLeaf"); leaf.className = "rd-leaf"; void leaf.offsetWidth; leaf.className = `rd-leaf ${dir > 0 ? "fwd" : "back"}`; setTimeout(apply, 180); setTimeout(() => (leaf.className = "rd-leaf"), 620); }
  else apply();
}
function foot() {
  const total = R.docs.length; const f = (R.di + (R.pages > 1 ? R.page / (R.pages - 1) : 1)) / total;
  $("#rdPos").textContent = `${R.docs.length > 1 ? `Ch ${R.di + 1}/${total} · ` : ""}Page ${R.page + 1} of ${R.pages}`;
  $("#rdProg").style.width = `${Math.round(f * 100)}%`;
  $("#rdPrev").disabled = R.di === 0 && R.page === 0; $("#rdNext").disabled = R.di === total - 1 && R.page >= R.pages - 1;
}
function savePos() { const p = prog(R.book.id); const pos = { ...(p.pos || {}) }; pos[R.mode] = { d: R.di, f: R.pages > 1 ? R.page / (R.pages - 1) : 0 }; saveProg(R.book.id, { pos }); }
async function next() { if (R.busy) return; if (R.page < R.pages - 1) go(R.page + 1, true, 1); else if (R.di < R.docs.length - 1) { R.busy = true; await loadDoc(R.di + 1, 0); R.busy = false; } }
async function prev() { if (R.busy) return; if (R.page > 0) go(R.page - 1, true, -1); else if (R.di > 0) { R.busy = true; await loadDoc(R.di - 1, 0, true); R.busy = false; } }
function renderToc() {
  const t = $("#rdTocPanel"); const b = R.book;
  const items = R.mode === "full" && R.docs.length > 1 ? R.docs.map((d, i) => `<button type="button" data-d="${i}">${esc(d.title)}</button>`).join("") : R.mode === "guide" ? b.chapters.map((c, i) => `<button type="button" data-a="${i}">${i + 1}. ${esc(c.t)}</button>`).join("") : `<p style="margin:6px 12px;font-size:13px">One continuous text.</p>`;
  const hl = (HL.get()[b.id] || []).filter((h) => h.mode === R.mode);
  t.innerHTML = `<h4>Contents</h4>${items}<div class="hlist"><h4>Your highlights</h4>${hl.length ? hl.map((h) => `<p>${esc(h.text)}</p>`).join("") : `<p style="border:0;color:var(--rmut)">Select text, then press Highlight.</p>`}</div>`;
}
function toggleToc(force) { const t = $("#rdTocPanel"); const o = force != null ? force : !t.classList.contains("open"); t.classList.toggle("open", o); $("#rdToc").setAttribute("aria-expanded", String(o)); }
$("#rdTocPanel").addEventListener("click", async (e) => {
  const d = e.target.closest("[data-d]"); if (d) { toggleToc(false); await loadDoc(+d.dataset.d, 0); return; }
  const a = e.target.closest("[data-a]"); if (a) { toggleToc(false); const h = $$("h3", cols)[+a.dataset.a]; if (h) { const left = h.getBoundingClientRect().left - cols.getBoundingClientRect().left + cols.scrollLeft; go(Math.floor(left / R.step), true, 1); } }
});
function closeReader() { rd.hidden = true; toggleToc(false); $("#hlPop").hidden = true; document.body.classList.toggle("no-scroll", !bv.hidden); if (R.book) location.hash = `#/book/${R.book.id}`; }
$("#rdClose").addEventListener("click", closeReader);
$("#rdToc").addEventListener("click", () => toggleToc());
$("#rdNext").addEventListener("click", next); $("#rdPrev").addEventListener("click", prev);
$$(".rd-theme button").forEach((b) => b.addEventListener("click", () => { RS.t = b.dataset.t; applyRS(); }));
const relayout = () => { const f = R.pages > 1 ? R.page / (R.pages - 1) : 0; layout(); go(Math.round(f * (R.pages - 1)), false); };
$("#rdBigger").addEventListener("click", () => { RS.size = clamp(RS.size + 1, 14, 30); applyRS(); relayout(); });
$("#rdSmaller").addEventListener("click", () => { RS.size = clamp(RS.size - 1, 14, 30); applyRS(); relayout(); });
$("#rdFont").addEventListener("click", () => { RS.f = RS.f === "serif" ? "sans" : "serif"; applyRS(); relayout(); });
addEventListener("resize", () => { if (!rd.hidden) relayout(); });
addEventListener("keydown", (e) => {
  if (rd.hidden) { if (e.key === "Escape" && !bv.hidden) closeBook(); return; }
  if (e.target.closest && e.target.closest("textarea,input")) return;
  if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); next(); }
  else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
  else if (e.key === "Escape") { if ($("#rdTocPanel").classList.contains("open")) toggleToc(false); else closeReader(); }
});
// swipe and tap zones
let sx = null, sy = null;
$("#rdStage").addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; });
$("#rdStage").addEventListener("pointerup", (e) => {
  if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
  const sel = getSelection(); if (sel && String(sel).trim()) return;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); return; }
  if (e.pointerType !== "mouse" && Math.abs(dx) < 8 && Math.abs(dy) < 8 && !e.target.closest("button")) { const w = innerWidth; if (e.clientX > w * 0.7) next(); else if (e.clientX < w * 0.3) prev(); }
});
// highlights
const pop = $("#hlPop");
function selInCols() { const s = getSelection(); if (!s || s.isCollapsed || !s.rangeCount) return null; const r = s.getRangeAt(0); if (!cols.contains(r.commonAncestorContainer)) return null; const t = String(s).trim().replace(/\s+/g, " "); return t.length > 2 ? { r, t } : null; }
document.addEventListener("selectionchange", () => { if (rd.hidden) return; const s = selInCols(); if (!s) { pop.hidden = true; return; } const b = s.r.getBoundingClientRect(); pop.hidden = false; pop.style.left = `${clamp(b.left + b.width / 2 - 45, 8, innerWidth - 110)}px`; pop.style.top = `${Math.max(66, b.top - 46)}px`; });
pop.addEventListener("pointerdown", (e) => e.preventDefault());
pop.addEventListener("click", () => {
  const s = selInCols(); if (!s) return; const all = HL.get(); const list = all[R.book.id] || (all[R.book.id] = []);
  list.push({ text: s.t.slice(0, 600), mode: R.mode, d: R.di, where: R.mode === "full" ? `Full text, ${R.docs[R.di].title}` : "Chapter guide", t: Date.now() }); HL.set(all);
  try { const m = document.createElement("mark"); m.className = "hl"; s.r.surroundContents(m); } catch (er) { /* selection spans blocks: saved, shown after reload */ }
  getSelection().removeAllRanges(); pop.hidden = true; renderToc(); saveProg(R.book.id, {}); toast("Highlight saved");
});
function applyHL() {
  const list = (HL.get()[R.book.id] || []).filter((h) => h.mode === R.mode && h.d === R.di);
  if (!list.length) return;
  $$("p,li,h2,h3", cols).forEach((el) => { list.forEach((h) => { const i = el.textContent.indexOf(h.text); if (i < 0 || el.querySelector("mark")) return; const txt = el.textContent; el.innerHTML = esc(txt.slice(0, i)) + `<mark class="hl">${esc(h.text)}</mark>` + esc(txt.slice(i + h.text.length)); }); });
}

/* ---------- router ---------- */
async function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const m = h.match(/^(book|read)\/([a-z0-9-]+)(?:\/(\w+))?/);
  if (!m) { if (!rd.hidden) { rd.hidden = true; toggleToc(false); } if (!bv.hidden) hideBook(); renderGrid(); renderContinue(); return; }
  if (!BY[m[2]]) { location.hash = "#/"; return; }
  if (m[1] === "book") { if (!rd.hidden) { rd.hidden = true; toggleToc(false); } if (bv.hidden || !curBook || curBook.id !== m[2]) await openBook(m[2], m[3] || "guide"); else if (m[3]) showTab(m[3]); }
  else { if (bv.hidden || !curBook || curBook.id !== m[2]) await openBook(m[2]); await openReader(m[2], m[3] || "guide"); }
}
addEventListener("hashchange", route);
route();
