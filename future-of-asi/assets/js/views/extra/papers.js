/* Papers: the 60 most important AI safety and alignment papers, verified with the arXiv API. Deep link: #/papers/<arxiv id> */
import { X, people, hero, sec, band, tocBar, ext, pchip, bars, anim, bag, sheet, closeSheet, setRoute, replaceRoute, $, $$, esc, store, ICON } from "./_kit.js";

const LV = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };
const LC = { 1: "#84cc16", 2: "#f59e0b", 3: "#ef4444" };
const TC = { foundations: "#22d3ee", risk: "#ef4444", strategy: "#0ea5e9", theory: "#f59e0b", feedback: "#14b8a6", oversight: "#10b981", interp: "#3b82f6", evals: "#0ea5e9", deception: "#f97316", control: "#10b981", governance: "#84cc16" };

export async function render(el, params, query) {
  const B = bag();
  const [D, P, C] = await Promise.all([X("papers.json"), people(), X("concepts.json")]);
  const papers = D.papers || [], topics = D.topics || {}, paths = D.paths || [];
  const byId = Object.fromEntries(papers.map((p) => [p.id, p]));
  const cLabel = Object.fromEntries((C.nodes || []).map((n) => [n.id, n.label]));
  const read = new Set(store.get("x:papers:read", []));
  const S = { q: query.get("q") || "", topic: query.get("topic") || "", lvl: query.get("level") || "", path: query.get("path") || "", sort: "year", unread: false, year: "" };
  const years = [...new Set(papers.map((p) => p.year))].sort();
  const authorsLinked = new Set(papers.flatMap((p) => p.people));
  const cnt = {}; papers.forEach((p) => p.people.forEach((r) => (cnt[r] = (cnt[r] || 0) + 1)));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 14);

  const card = (p) => `<article class="card x-paper m3-spot card-glow ${read.has(p.id) ? "is-read" : ""}" style="--c:${TC[p.topic] || "var(--accent)"}" data-id="${p.id}">
    <div class="x-paper-top"><span class="tag">${esc(topics[p.topic] || p.topic)}</span><span class="x-lvl" style="--c:${LC[p.level]}" title="${LV[p.level]}">${"<i></i>".repeat(p.level)}${"<i class='off'></i>".repeat(3 - p.level)}<span>${LV[p.level]}</span></span><span class="x-year mono">${p.year}</span></div>
    <h3><button type="button" class="x-linkbtn" data-open="${p.id}">${esc(p.title)}</button></h3>
    <div class="x-auth">${esc(p.authors.slice(0, 3).join(", "))}${p.n_authors > 3 ? ` and ${p.n_authors - 3} more` : ""}</div>
    <p>${esc(p.summary)}</p>
    <div class="x-paper-act"><button class="btn sm ghost" type="button" data-open="${p.id}">Why it matters</button><a class="btn sm ghost" href="${esc(p.url)}" target="_blank" rel="noopener">arXiv ${ICON.ext}</a><button class="btn sm ghost x-readbtn" type="button" data-read="${p.id}" aria-pressed="${read.has(p.id)}">${read.has(p.id) ? "Read" : "Mark read"}</button></div>
  </article>`;

  el.innerHTML = `${hero({ img: "papers", eyebrow: "Papers", title: `60 papers that <span class="serif gt">shaped AI safety.</span>`, lead: `The research behind the warnings, in plain words. Every title, author list and date here was checked against the arXiv API on ${esc(D.meta?.verified || "")}. Pick a reading path, or search the whole shelf.`, stats: [[papers.length, "papers"], [authorsLinked.size, "authors with a profile here"], [`${years[0]} to ${years[years.length - 1]}`, "years covered"], [paths.length, "reading paths"]] })}
  ${sec("paths", 1, "Reading paths", "Start with a <span class='serif'>path</span>, not a pile.", "Each path is a short, ordered list. Tick papers off as you read them; your progress stays in this browser.",
    `<div class="grid gauto x-paths" data-m3-stagger="70">${paths.map((pt) => { const done = pt.papers.filter((x) => read.has(x)).length; return `<button type="button" class="card x-path m3-spot card-glow" data-m3="up" data-path="${pt.id}"><div class="x-path-h"><b>${esc(pt.title)}</b><span class="mono">${done}/${pt.papers.length}</span></div><p>${esc(pt.blurb)}</p><ol>${pt.papers.slice(0, 3).map((x) => `<li>${esc(byId[x]?.title || x)}</li>`).join("")}${pt.papers.length > 3 ? `<li class="muted">and ${pt.papers.length - 3} more</li>` : ""}</ol><span class="x-prog"><i style="--w:${(done / pt.papers.length) * 100}%"></i></span></button>`; }).join("")}</div>`)}
  ${sec("shelf", 2, "The shelf", "Search all <span class='serif'>60</span>.", "Filter by topic and level. Open any paper for why it matters, every author, linked people and ideas.",
    `<div class="toolbar x-tools" role="search"><label class="sr-only" for="pq">Search papers</label><input class="input search" id="pq" type="search" placeholder="Search titles, authors, ideas" value="${esc(S.q)}">
      <select class="input x-sel" id="plv" aria-label="Level"><option value="">All levels</option>${[1, 2, 3].map((l) => `<option value="${l}" ${S.lvl == l ? "selected" : ""}>${LV[l]}</option>`).join("")}</select>
      <select class="input x-sel" id="psort" aria-label="Sort"><option value="year">Oldest first</option><option value="new">Newest first</option><option value="level">Easiest first</option></select>
      <button class="chip" type="button" id="punread" aria-pressed="false">Unread only</button><span class="count" id="pc"></span></div>
    <div class="chips x-topics" id="ptopics"><button class="chip" type="button" data-topic="" aria-pressed="${!S.topic}">All topics</button>${Object.entries(topics).map(([k, v]) => `<button class="chip" type="button" data-topic="${k}" aria-pressed="${S.topic === k}" style="--c:${TC[k]}">${esc(v)} <span class="mono">${papers.filter((p) => p.topic === k).length}</span></button>`).join("")}</div>
    <div class="x-pathnote" id="pathnote" hidden></div>
    <div class="grid x-papers" id="plist"></div>`)}
  ${band("papers-lens", "Ideas get sharper when you read the source. Each card links to the paper itself.")}
  ${sec("years", 3, "Timeline", "How the <span class='serif'>ideas</span> arrived.", "The number of papers on this shelf from each year. Tap a year to filter the shelf.",
    `<div class="x-years" data-m3="up">${years.map((y) => { const n = papers.filter((p) => p.year === y).length; const mx = Math.max(...years.map((yy) => papers.filter((p) => p.year === yy).length)); return `<button type="button" class="x-yr" data-year="${y}" style="--h:${(n / mx) * 82}%"><i></i><b>${n}</b><span>${y}</span></button>`; }).join("")}</div>
    <div class="grid g3 x-eras" data-m3-stagger="90">
      <div class="card" data-m3="up"><div class="eyebrow">2016 to 2019</div><h3>Naming the problems</h3><p>Concrete problems, learning from human preferences, debate, amplification and the first theory of inner alignment and power seeking.</p></div>
      <div class="card" data-m3="up"><div class="eyebrow">2020 to 2023</div><h3>Scaling and steering</h3><p>Scaling laws, RLHF and Constitutional AI turn models into assistants, while interpretability and red teaming try to keep up.</p></div>
      <div class="card" data-m3="up"><div class="eyebrow">2024 to 2025</div><h3>Evidence arrives</h3><p>Sleeper agents, scheming, alignment faking, shutdown resistance and the rise of AI control and chain of thought monitoring.</p></div></div>`)}
  ${sec("authors", 4, "Who wrote them", "The <span class='serif'>people</span> behind the papers.", "Researchers on this site who appear most often as authors on this shelf. Tap a name for their profile.",
    `<div class="grid g2 x-auth-grid"><div>${bars(top.map(([id, n]) => [P.byId[id]?.name || id, n]), { fmt: (v) => `${v} paper${v > 1 ? "s" : ""}` })}</div>
     <div class="card" data-m3="up"><div class="eyebrow">Linked profiles</div><div class="x-pchips">${[...authorsLinked].map((id) => P.byId[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)).map((p) => pchip(p)).join("")}</div></div></div>`)}
  ${sec("method", 5, "How I checked", "Verified, <span class='serif'>not guessed.</span>", "",
    `<div class="grid g2"><div class="card" data-m3="up"><h3>The method</h3><p>${esc(D.meta?.method || "")}</p><p style="margin-top:10px">Authors are matched to profiles on this site only when the full first and last name match. Difficulty levels are my own judgement of how much background a reader needs.</p></div>
     <div class="card" data-m3="up"><h3>Want more?</h3><p>The Library has books and essays, the Concepts map links every idea here to lessons and people, and the Arena turns this shelf into a quiz.</p><div class="row" style="margin-top:14px"><a class="btn sm" href="library/">Library</a><a class="btn sm" href="#/concepts">Concepts map</a><a class="btn sm" href="#/arena">Arena</a></div></div></div>`)}`;

  B.add(tocBar(el));
  const list = $("#plist", el);
  function paint() {
    const q = S.q.toLowerCase().split(/\s+/).filter(Boolean);
    const pt = paths.find((x) => x.id === S.path);
    let r = papers.filter((p) => (!S.topic || p.topic === S.topic) && (!S.lvl || String(p.level) === S.lvl) && (!S.year || p.year === S.year) && (!S.unread || !read.has(p.id)) && (!pt || pt.papers.includes(p.id)) &&
      q.every((w) => `${p.title} ${p.authors.join(" ")} ${p.summary} ${p.concepts.map((c) => cLabel[c] || c).join(" ")}`.toLowerCase().includes(w)));
    if (pt) r.sort((a, b) => pt.papers.indexOf(a.id) - pt.papers.indexOf(b.id));
    else if (S.sort === "new") r.sort((a, b) => b.date.localeCompare(a.date)); else if (S.sort === "level") r.sort((a, b) => a.level - b.level || a.date.localeCompare(b.date)); else r.sort((a, b) => a.date.localeCompare(b.date));
    list.innerHTML = r.map(card).join("") || `<div class="empty-state" style="grid-column:1/-1">No paper matches. Try fewer words.</div>`;
    $("#pc", el).textContent = `${r.length} of ${papers.length}`;
    const pn = $("#pathnote", el); pn.hidden = !pt && !S.year;
    if (pt || S.year) pn.innerHTML = `<span>${pt ? `Path: <b>${esc(pt.title)}</b>, in reading order.` : `Year: <b>${esc(S.year)}</b>`}</span><button class="chip" type="button" id="clearf">Clear ${ICON.close}</button>`;
    $$("[data-topic]", el).forEach((b) => b.setAttribute("aria-pressed", b.dataset.topic === S.topic));
    $$("[data-year]", el).forEach((b) => b.classList.toggle("on", b.dataset.year === S.year));
    B.add(anim(list));
  }
  function detail(id) {
    const p = byId[id]; if (!p) return;
    const ppl = p.people.map((x) => P.byId[x]).filter(Boolean);
    const inPaths = paths.filter((pt) => pt.papers.includes(id));
    sheet(el, `<div class="tag" style="--c:${TC[p.topic]}">${esc(topics[p.topic])}</div><h2 class="x-sheet-t">${esc(p.title)}</h2>
      <div class="muted mono" style="font-size:13px">arXiv ${esc(p.id)} · first posted ${esc(p.date)} · ${LV[p.level]}</div>
      <h4>In plain words</h4><p>${esc(p.summary)}</p><h4>Why it matters</h4><p>${esc(p.why)}</p>
      ${p.concepts.length ? `<h4>Ideas</h4><div class="chips">${p.concepts.map((c) => `<a class="chip" href="#/concepts/${c}">${esc(cLabel[c] || c)}</a>`).join("")}</div>` : ""}
      ${ppl.length ? `<h4>Authors with a profile here</h4><div class="x-pchips">${ppl.map((x) => pchip(x)).join("")}</div>` : ""}
      <h4>All ${p.n_authors} authors</h4><p class="x-allauth">${esc(p.authors.join(", "))}</p>
      ${inPaths.length ? `<h4>On these reading paths</h4><div class="chips">${inPaths.map((pt) => `<span class="chip">${esc(pt.title)}</span>`).join("")}</div>` : ""}
      <div class="row" style="margin-top:20px"><a class="btn primary" href="${esc(p.url)}" target="_blank" rel="noopener">Read on arXiv ${ICON.ext}</a><a class="btn" href="${esc(p.pdf)}" target="_blank" rel="noopener">PDF ${ICON.dl}</a><button class="btn ghost" type="button" data-read="${p.id}">${read.has(p.id) ? "Marked as read" : "Mark as read"}</button></div>`, close);
    if (el._xsheet && !el._xsheet._wired) { el._xsheet._wired = true; el._xsheet.addEventListener("click", onClick); }
    document.title = `${p.title} · Papers · Threshold`;
  }
  let pushed = false;
  function open(id) { detail(id); setRoute(`#/papers/${id}`); pushed = true; }
  function close() { closeSheet(el); if (pushed) { pushed = false; history.back(); } else replaceRoute("#/papers"); document.title = "Papers · Threshold"; }

  let t; $("#pq", el).addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { S.q = e.target.value; if (S.q) { S.path = ""; S.year = ""; } paint(); }, 90); });
  $("#plv", el).addEventListener("change", (e) => { S.lvl = e.target.value; paint(); });
  $("#psort", el).addEventListener("change", (e) => { S.sort = e.target.value; paint(); });
  $("#punread", el).addEventListener("click", (e) => { S.unread = !S.unread; e.currentTarget.setAttribute("aria-pressed", S.unread); paint(); });
  const onClick = (e) => {
    const tp = e.target.closest("[data-topic]"); if (tp) { S.topic = tp.dataset.topic; S.path = ""; paint(); return; }
    const pa = e.target.closest("[data-path]"); if (pa) { S.path = pa.dataset.path; S.topic = ""; S.year = ""; paint(); $("#shelf", el).scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const yr = e.target.closest("[data-year]"); if (yr) { S.year = S.year === yr.dataset.year ? "" : yr.dataset.year; S.path = ""; paint(); $("#shelf", el).scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (e.target.closest("#clearf")) { S.path = ""; S.year = ""; paint(); return; }
    const op = e.target.closest("[data-open]"); if (op) { open(op.dataset.open); return; }
    const rd = e.target.closest("[data-read]");
    if (rd) { const id = rd.dataset.read; read.has(id) ? read.delete(id) : read.add(id); store.set("x:papers:read", [...read]); paint(); [...$$(`[data-read="${id}"]`, el), ...(el._xsheet ? $$(`[data-read="${id}"]`, el._xsheet) : [])].forEach((b) => { b.textContent = read.has(id) ? (b.closest(".x-sheet") ? "Marked as read" : "Read") : (b.closest(".x-sheet") ? "Mark as read" : "Mark read"); b.setAttribute("aria-pressed", read.has(id)); }); $$(".x-path", el).forEach((b) => { const pt = paths.find((x) => x.id === b.dataset.path); const d = pt.papers.filter((x) => read.has(x)).length; $(".mono", b).textContent = `${d}/${pt.papers.length}`; $(".x-prog i", b).style.setProperty("--w", (d / pt.papers.length) * 100 + "%"); }); }
  };
  el.addEventListener("click", onClick);
  B.add(((fn) => { document.addEventListener("keydown", fn); return () => document.removeEventListener("keydown", fn); })((e) => { if (e.key === "Escape" && $(".x-sheet.open", el)) close(); }));
  paint();
  if (params[0] && byId[params[0]]) detail(params[0]);
  el._onParams = (p) => { if (p[0] && byId[p[0]]) detail(p[0]); else { closeSheet(el); pushed = false; } };
  return () => { B.run(); if (el._xsheet) el._xsheet.remove(); document.documentElement.classList.remove("x-sheet-on"); };
}
