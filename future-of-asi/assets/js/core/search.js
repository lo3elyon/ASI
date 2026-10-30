/* Ctrl K search: fuzzy (Fuse.js, vendored) across everything, with type tabs, facets, highlights, recent searches and keyboard control.
   People and videos open as overlays, so the page underneath stays exactly where it was. */
import { $, $$, esc, store, load, arr, researchers, videos, signatories, categories, orgIndex, logoSrc, modeCls, ytThumb, initials, CATS, slug } from "../util.js";
import { openPerson, openVideo } from "./overlay.js";
import { getHistory } from "./history.js";
import { ui } from "./sound.js";
import { allItems, ICONS } from "./nav.js";

const TYPES = [
  ["all", "All"], ["person", "People"], ["signer", "Signers"], ["quote", "Quotes"], ["video", "Videos"], ["org", "Orgs"], ["paper", "Papers"],
  ["lesson", "Lessons"], ["event", "Timeline"], ["term", "Glossary"], ["blog", "Blog"], ["doc", "Docs"], ["page", "Pages"],
];
const TC = { person: "#22d3ee", signer: "#84cc16", quote: "#f59e0b", video: "#ef4444", org: "#14b8a6", paper: "#3b82f6", lesson: "#84cc16", event: "#ef4444", term: "#22d3ee", blog: "#f59e0b", doc: "#3b82f6", page: "#14b8a6" };
const TL = { person: "Person", signer: "Signer", quote: "Quote", video: "Video", org: "Org", paper: "Paper", lesson: "Lesson", event: "Timeline", term: "Term", blog: "Blog", doc: "Docs", page: "Page" };

let fuse = null, docs = null, building = null;
const st = { q: "", type: "all", facet: "", sel: 0, hits: [] };
let pal, inp, list, tabs, facets, count;

async function build(routes) {
  if (docs) return docs;
  if (building) return building;
  building = (async () => {
    const [{ default: Fuse }, ppl, vids, sig, cats, oi, tl, blog, gloss, course, dcs, res] = await Promise.all([
      import("../../vendor/fuse.min.mjs"), researchers(), videos(), signatories(), categories(), orgIndex(), load("timeline.json"), load("blog/index.json"),
      load("glossary.json"), load("course.json", {}), load("docs/index.json"), load("resources.json"),
    ]);
    const catL = Object.fromEntries(cats.map((c) => [c.id, c.label]));
    const D = [];
    /* Pages show their type once (the tag on the right); the subtitle is the page description and the badge is the menu icon */
    const NI = Object.fromEntries(allItems().map((i) => [i.slug, i]));
    Object.entries(routes).forEach(([k, v]) => k && k !== "home" && D.push({ type: "page", title: v[1], sub: (NI[k] && NI[k].desc) || "", icon: NI[k] && NI[k].icon, href: `#/${k}` }));
    allItems().filter((i) => i.page).forEach((i) => D.push({ type: "page", title: i.title, sub: i.desc || "", icon: i.icon, href: `${i.slug}/` }));
    [["p(doom) calculator", "#/tools/pdoom", "Put your own numbers on each step of the risk argument.", "wrench"], ["AGI timeline forecaster", "#/tools/timelines", "Pick your assumptions and see when AGI might arrive.", "wrench"], ["Risk dial", "#/tools/dial", "One dial for how worried you are, and why.", "wrench"], ["Blue team game: catch a scheming model", "#/control?play=1", "Audit, accept or defer as an AI tries to slip past you.", "shield"], ["Completion card", "#/learn/certificate", "Your Alignment 101 card, once you finish the course.", "cap"], ["Final exam", "#/learn/final", "One last quiz across every unit.", "cap"], ["ASI hub, all explainers", "../", "Every explainer in the ASI collection.", "home"]].forEach(([t, h, sub, icon]) => D.push({ type: "page", title: t, sub, icon, href: h }));
    ppl.forEach((p) => {
      D.push({ type: "person", title: p.name, sub: [p.role, p.org].filter(Boolean).join(", "), text: `${p.warning} ${p.bio} ${p.focus.join(" ")} ${p.former_orgs.join(" ")}`, tags: p.categories.map((c) => catL[c] || c).join(" "), img: p.photo, id: p.id, f: { region: p.region || "", cat: p.categories.map((c) => catL[c] || c) } });
      p.quotes.forEach((q) => D.push({ type: "quote", title: q.text, sub: `${p.name}${q.source ? ", " + q.source : ""}${q.date ? ", " + q.date : ""}`, img: p.photo, id: p.id, text: p.name }));
      p.key_papers.forEach((k) => D.push({ type: "paper", title: k.title, sub: `${p.name}${k.year ? ", " + k.year : ""}`, url: k.url, id: p.id }));
      p.books.forEach((k) => D.push({ type: "paper", title: k.title, sub: `Book by ${p.name}${k.year ? ", " + k.year : ""}`, url: k.url, id: p.id, f: { kind: "Book" } }));
    });
    const rph = Object.fromEntries(ppl.map((p) => [p.id, p.photo]));
    sig.list.forEach((s, i) => D.push({ type: "signer", title: s.name, sub: [s.title, s.employer].filter(Boolean).join(", "), text: s.comment, id: s.researcher_id || s.slug, img: s.photo || (s.researcher_id && rph[s.researcher_id]) || "", n: i, f: { employer: s.employer || "" } }));
    vids.forEach((v) => D.push({ type: "video", title: v.title, sub: `${v.channel}${v.year ? ", " + v.year : ""}`, text: v.summary, vid: v.id, f: { cat: (CATS[v.category] || { label: v.category }).label, level: v.level } }));
    oi.orgs.forEach((o) => D.push({ type: "org", title: o.name, sub: [o.type, o.country].filter(Boolean).join(", "), text: `${o.what || ""} ${[].concat(o.focus || []).join(" ")}`, href: `#/orgs?o=${encodeURIComponent(o.id || o.name)}`, oid: o.id || slug(o.name), f: { type: o.type || "" } }));
    arr(tl, "events").forEach((e) => { const y = e.year || String(e.date || "").slice(0, 4); D.push({ type: "event", title: e.title || e.name, sub: String(y), text: e.text || e.summary || e.description || "", href: `#/timeline?y=${y}`, f: { decade: y ? `${String(y).slice(0, 3)}0s` : "" } }); });
    arr(blog, "posts").forEach((b) => D.push({ type: "blog", title: b.title, sub: b.date || "Blog", text: b.excerpt, href: `#/blog/${b.slug}` }));
    arr(gloss, "terms").forEach((g) => D.push({ type: "term", title: g.term, sub: "Glossary", text: g.def, href: `#/docs/glossary?t=${encodeURIComponent(g.term)}` }));
    (course.units || []).forEach((u, ui) => (u.lessons || []).forEach((l) => D.push({ type: "lesson", title: l.title, sub: `Unit ${ui + 1}: ${u.title}`, text: l.key || l.hook || "", href: `#/learn/${u.id}/${l.id}` })));
    arr(dcs, "pages").forEach((d) => D.push({ type: "doc", title: d.title, sub: "Docs", text: d.summary, href: `#/docs/${d.slug}` }));
    let items = []; if (Array.isArray(res)) items = res; else if (res && typeof res === "object") Object.entries(res).forEach(([k, v]) => Array.isArray(v) && v.forEach((x) => items.push({ type: x.type || k, ...x })));
    items.filter((r) => /paper|report|book|research/i.test(r.type || "") && (r.title || r.name)).forEach((r) => D.push({ type: "paper", title: r.title || r.name, sub: [r.author || r.authors || r.org || "", r.year || ""].flat().filter(Boolean).join(", "), text: r.line || r.description || r.summary || "", url: r.url || r.link, f: { kind: /book/i.test(r.type) ? "Book" : "Paper" } }));
    docs = D;
    fuse = new Fuse(D, { keys: [{ name: "title", weight: 3 }, { name: "sub", weight: 1.2 }, { name: "tags", weight: 1.4 }, { name: "text", weight: 0.6 }], includeMatches: true, includeScore: true, threshold: 0.34, ignoreLocation: true, minMatchCharLength: 2 });
    return D;
  })();
  return building;
}

function hl(text, matches, key) {
  const t = String(text || "");
  const m = (matches || []).find((x) => x.key === key);
  if (!m || !m.indices.length) return esc(t);
  let out = "", last = 0;
  m.indices.filter(([a, b]) => b - a >= 1).sort((a, b) => a[0] - b[0]).forEach(([a, b]) => { if (a < last) return; out += esc(t.slice(last, a)) + "<mark>" + esc(t.slice(a, b + 1)) + "</mark>"; last = b + 1; });
  return out + esc(t.slice(last));
}

/* Exact and prefix matches first, then words inside the subtitle or text, then fuzzy guesses.
   Fuzzy guesses only show when there are few real matches, so a name search stays tight. */
const norm = (x) => String(x || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
const WHOLE = new Set(["person", "page", "org"]);
const TP = { page: 0, person: 1, org: 2, term: 3, lesson: 4, doc: 5, paper: 6, blog: 7, event: 8, video: 9, quote: 10, signer: 11 };
function tierOf(d, q, toks) {
  const t = norm(d.title), sub = norm(d.sub), tags = norm([].concat(d.tags || []).join(" ")), tx = norm(d.text);
  const all = (str) => toks.every((k) => str.includes(k));
  if (t === q) return 0;
  /* A name, page or org whose title holds the query as a whole word (Hinton, AI Control) beats a longer title that only starts with it */
  if (WHOLE.has(d.type) && new RegExp(`(^|[^a-z0-9])${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`).test(t)) return 0.5;
  if (t.startsWith(q)) return 1;
  if (new RegExp(`(^|[^a-z0-9])${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(t)) return 2;
  if (all(t)) return 3;
  if (all(`${t} ${sub} ${tags}`)) return 4;
  if (all(`${t} ${sub} ${tags} ${tx}`)) return 5;
  return 9;
}
function rank(q0, res) {
  const q = norm(q0).trim(), toks = q.split(/\s+/).filter((k) => k.length > 1);
  if (!toks.length) return res;
  res.forEach((r) => { r.tier = tierOf(r.item, q, toks); });
  const exact = res.filter((r) => r.tier < 9);
  const fuzzy = exact.length >= 5 ? [] : res.filter((r) => r.tier === 9).slice(0, Math.max(0, 12 - exact.length));
  fuzzy.forEach((r) => (r.fuzzy = true));
  return exact.sort((a, b) => a.tier - b.tier || (a.tier < 3 ? (TP[a.item.type] ?? 12) - (TP[b.item.type] ?? 12) : 0) || a.score - b.score).concat(fuzzy);
}
/* Mark every place the typed words appear */
function mark(text, q) {
  const t = String(text || "");
  const toks = norm(q).trim().split(/\s+/).filter((k) => k.length > 1);
  if (!toks.length) return esc(t);
  const low = norm(t);
  const hits = [];
  toks.forEach((k) => { let i = low.indexOf(k); while (i >= 0) { hits.push([i, i + k.length]); i = low.indexOf(k, i + k.length); } });
  if (!hits.length) return null;
  hits.sort((a, b) => a[0] - b[0]);
  let out = "", last = 0;
  hits.forEach(([a, b]) => { if (a < last) return; out += esc(t.slice(last, a)) + `<mark class="pm">${esc(t.slice(a, b))}</mark>`; last = b; });
  return out + esc(t.slice(last));
}
/* A short piece of the text around the first match, when the match is only in the text */
function snippet(text, q) {
  const t = String(text || ""), toks = norm(q).trim().split(/\s+/).filter((k) => k.length > 1);
  const low = norm(t); let i = -1; toks.some((k) => (i = low.indexOf(k)) >= 0);
  if (i < 0) return "";
  const a = Math.max(0, i - 50), b = Math.min(t.length, i + 70);
  return (a ? "..." : "") + t.slice(a, b).trim() + (b < t.length ? "..." : "");
}

function facetKey(type) { return { person: "region", video: "cat", signer: "employer", org: "type", event: "decade", paper: "kind" }[type] || ""; }

async function run() {
  await build(window.__ROUTES || {});
  const q = st.q.trim();
  let res;
  if (q) res = rank(q, fuse.search(q, { limit: 600 }));
  else res = docs.filter((d) => st.type === "all" ? d.type === "page" : d.type === st.type).slice(0, 200).map((item) => ({ item, matches: [] }));
  const counts = {};
  res.forEach((r) => (counts[r.item.type] = (counts[r.item.type] || 0) + 1));
  let shown = st.type === "all" ? res : res.filter((r) => r.item.type === st.type);
  const fk = facetKey(st.type);
  let fvals = [];
  if (fk) { const c = {}; shown.forEach((r) => [].concat((r.item.f || {})[fk] || []).forEach((v) => v && (c[v] = (c[v] || 0) + 1))); fvals = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 14); }
  if (st.facet && fk) shown = shown.filter((r) => [].concat((r.item.f || {})[fk] || []).includes(st.facet));
  st.hits = shown.slice(0, st.type === "all" ? 60 : 120);
  st.sel = Math.min(st.sel, Math.max(0, st.hits.length - 1));
  tabs.innerHTML = TYPES.map(([k, l]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${st.type === k}">${l}${q && k !== "all" && counts[k] ? `<b>${counts[k]}</b>` : q && k === "all" ? `<b>${res.length}</b>` : ""}</button>`).join("");
  facets.innerHTML = fvals.length > 1 ? fvals.map(([v, n]) => `<button class="chip ${st.facet === v ? "on" : ""}" type="button" data-f="${esc(v)}">${esc(v)} <span class="count">${n}</span></button>`).join("") : "";
  count.textContent = q ? `${shown.length} results` : "";
  paint(q);
}

function iconFor(d) {
  if (d.type === "video") return `<span class="ic vid"><img src="${ytThumb(d.vid, "default")}" alt="" loading="lazy" width="46" height="46"></span>`;
  if ((d.type === "person" || d.type === "quote" || d.type === "signer") && d.img) return `<span class="ic"><img src="${esc(d.img)}" alt="" loading="lazy" width="46" height="46" referrerpolicy="no-referrer"></span>`;
  if (d.type === "person" || d.type === "signer") return `<span class="ic" style="--c:${TC[d.type]};font-family:var(--f-display);font-size:14px;font-weight:700">${esc(initials(d.title))}</span>`;
  if (d.type === "org") { const L = logoSrc(d.oid) || logoSrc(d.title); if (L && L.src) return `<span class="ic ologo${modeCls(L.mode)}" style="width:46px;height:46px"><img src="${esc(L.src)}" alt="" loading="lazy" width="40" height="40"></span>`; return `<span class="ic" style="--c:${TC.org};font-family:var(--f-display);font-size:14px;font-weight:700">${esc(initials(d.title))}</span>`; }
  if (d.type === "page") return `<span class="ic ic-svg" style="--c:${TC.page}" aria-hidden="true">${ICONS[d.icon] || ICONS.spark || ""}</span>`;
  return `<span class="ic" style="--c:${TC[d.type]}">${esc(TL[d.type].slice(0, 4))}</span>`;
}
function paint(q) {
  if (!q && st.type === "all") {
    const rec = store.get("recentSearch", []);
    const seen = getHistory().slice(0, 6);
    list.innerHTML = `${rec.length ? `<li class="grp">Recent searches</li><li class="recent">${rec.map((r) => `<button class="chip" type="button" data-r="${esc(r)}">${esc(r)}</button>`).join("")}<button class="chip" type="button" data-clr-r>Clear</button></li>` : ""}
      ${seen.length ? `<li class="grp">Recently opened</li>${seen.map((h) => `<li role="option"><button class="res" type="button" data-h="${esc(h.type)}|${esc(h.id)}"><span class="ic" style="--c:${TC[h.type === "post" ? "blog" : h.type] || "#22d3ee"}">${esc((h.type || "").slice(0, 4))}</span><span class="tx"><b>${esc(h.title || h.id)}</b><span class="sr-only">. </span><span>${esc(h.sub || h.type)}</span></span><small></small></button></li>`).join("")}` : ""}
      <li class="grp">Pages and tools</li>` + st.hits.map((h, i) => row(h, i, "")).join("");
  } else {
    list.innerHTML = st.hits.length ? st.hits.map((h, i) => row(h, i, q)).join("") : `<li class="empty">Nothing matches yet. Try a name like Hinton, a word like control, an employer, or a year like 2023.</li>`;
  }
  const s = $(".res.sel", list); if (s) s.scrollIntoView({ block: "nearest" });
}
function row(h, i, q) {
  const d = h.item;
  const title = d.type === "quote" ? `\u201c${d.title.length > 140 ? d.title.slice(0, 140) + "..." : d.title}\u201d` : d.title;
  let tb = esc(title), sb = esc(d.sub || ""), why = "";
  if (q) {
    tb = mark(title, q) || (h.fuzzy ? esc(title) : hl(d.title, h.matches, "title"));
    sb = mark(d.sub, q) || esc(d.sub || "");
    if (h.tier === 5 && !mark(title, q) && !mark(d.sub, q)) { const sn = snippet(d.text, q); if (sn) why = `<em class="why">${mark(sn, q) || esc(sn)}</em>`; }
    if (h.fuzzy) why = `<em class="why">Close spelling</em>`;
  }
  return `<li role="option" aria-selected="${i === st.sel}"><button class="res ${i === st.sel ? "sel" : ""}" type="button" data-i="${i}" style="--c:${TC[d.type]}">${iconFor(d)}<span class="tx"><b>${tb}</b><span class="sr-only">. </span><span>${sb}</span>${why}</span><span class="sr-only">. </span><small>${esc(TL[d.type])}</small></button></li>`;
}

function openItem(d) {
  const q = st.q.trim();
  if (q) { const rec = store.get("recentSearch", []).filter((x) => x.toLowerCase() !== q.toLowerCase()); rec.unshift(q); store.set("recentSearch", rec.slice(0, 8)); }
  closePal(true);
  if ((d.type === "person" || d.type === "quote") && d.id) return openPerson(d.id);
  if (d.type === "signer") return d.id ? openPerson(d.id) : (location.hash = `#/pacing?q=${encodeURIComponent(d.title)}`);
  if (d.type === "video") return openVideo(d.vid);
  if (d.type === "paper") { if (d.url) window.open(d.url, "_blank", "noopener"); else if (d.id) openPerson(d.id); return; }
  if (d.href) { if (d.href.startsWith("#")) location.hash = d.href; else location.href = d.href; }
}

export function openPal() { pal.classList.add("open"); pal.setAttribute("aria-hidden", "false"); inp.value = st.q; st.sel = 0; run(); setTimeout(() => { inp.focus(); inp.select(); }, 20); ui("open"); }
export function closePal(silent) { if (!pal.classList.contains("open")) return; pal.classList.remove("open"); pal.setAttribute("aria-hidden", "true"); if (!silent) ui("close"); }

export function initSearch(routes) {
  window.__ROUTES = routes;
  pal = $("#palette"); inp = $("#palInput"); list = $("#palList"); tabs = $("#palTabs"); facets = $("#palFacets"); count = $("#palCount");
  $("#openPalette").addEventListener("click", openPal);
  $("#tabSearch")?.addEventListener("click", openPal);
  let t;
  inp.addEventListener("input", () => { st.q = inp.value; st.sel = 0; st.facet = ""; clearTimeout(t); t = setTimeout(run, 70); });
  pal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return closePal();
    const tb = e.target.closest("[data-t]"); if (tb) { st.type = tb.dataset.t; st.facet = ""; st.sel = 0; run(); inp.focus(); return; }
    const f = e.target.closest("[data-f]"); if (f) { st.facet = st.facet === f.dataset.f ? "" : f.dataset.f; st.sel = 0; run(); return; }
    const r = e.target.closest("[data-r]"); if (r) { inp.value = st.q = r.dataset.r; run(); inp.focus(); return; }
    if (e.target.closest("[data-clr-r]")) { store.set("recentSearch", []); run(); return; }
    const hh = e.target.closest("[data-h]"); if (hh) { const [ty, id] = hh.dataset.h.split("|"); closePal(true); if (ty === "person") openPerson(id); else if (ty === "video") openVideo(id); else if (ty === "post") location.hash = `#/blog/${id}`; else if (ty === "lesson") location.hash = `#/learn/${id}`; return; }
    const it = e.target.closest("[data-i]"); if (it) openItem(st.hits[+it.dataset.i].item);
  });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { st.sel = Math.min(st.hits.length - 1, st.sel + 1); paint(st.q.trim()); e.preventDefault(); }
    else if (e.key === "ArrowUp") { st.sel = Math.max(0, st.sel - 1); paint(st.q.trim()); e.preventDefault(); }
    else if (e.key === "Enter" && st.hits[st.sel]) { e.preventDefault(); openItem(st.hits[st.sel].item); }
    else if (e.key === "Tab") { e.preventDefault(); const i = TYPES.findIndex(([k]) => k === st.type); st.type = TYPES[(i + (e.shiftKey ? -1 : 1) + TYPES.length) % TYPES.length][0]; st.facet = ""; st.sel = 0; run(); }
    else if (e.key === "Escape") { e.preventDefault(); closePal(); }
  });
  document.addEventListener("keydown", (e) => {
    const typing = /input|textarea|select/i.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.classList.contains("open") ? closePal() : openPal(); }
    else if (e.key === "/" && !typing && !pal.classList.contains("open")) { e.preventDefault(); openPal(); }
  });
}
