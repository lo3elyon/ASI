/* Your history: everything opened in Threshold, resolved to real names, photos, thumbnails and titles,
   with filters, search and time grouping (Today, Yesterday, then dates). Lives only in this browser. */
import { $, $$, esc, pageHero, ytThumb, initials, toast, ICON, researchers, videos, load, store } from "../util.js";
import { getHistory, clearHistory, exportHistory } from "../core/history.js";
import { ICONS } from "../core/nav.js";

const KIND = {
  all: ["Everything", "cyan"], video: ["Videos", "red"], person: ["Researchers", "sky"], lesson: ["Lessons", "lime"],
  post: ["Blog posts", "amber"], book: ["Books", "yellow"], page: ["Deep dives", "orange"],
};
const KC = { cyan: "#22d3ee", red: "#ef4444", sky: "#0ea5e9", lime: "#84cc16", amber: "#f59e0b", yellow: "#eab308", orange: "#f97316" };

async function lookups() {
  const [ppl, vids, course, blog, lib] = await Promise.all([
    researchers().catch(() => []), videos().catch(() => []), load("course.json", {}), load("blog/index.json", {}),
    fetch("library/data/books.json").then((r) => (r.ok ? r.json() : { books: [] })).catch(() => ({ books: [] })),
  ]);
  const P = new Map(ppl.map((p) => [p.id, p]));
  const V = new Map(vids.map((v) => [v.id, v]));
  const L = new Map();
  (course.units || []).forEach((u, ui) => (u.lessons || []).forEach((l) => {
    const rec = { title: l.title, unit: `Unit ${u.n || ui + 1}: ${u.title}`, n: u.n || ui + 1, c: u.c || "#84cc16", href: `#/learn/${u.id}/${l.id}` };
    L.set(`${u.id}/${l.id}`, rec); L.set(l.id, rec); (l.legacy_ids || []).forEach((x) => L.set(x, rec));
  }));
  const B = new Map((Array.isArray(blog) ? blog : blog.posts || []).map((b) => [b.slug, b]));
  const K = new Map((lib.books || []).map((b) => [b.id, b]));
  return { P, V, L, B, K };
}

const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
function dayLabel(t) {
  const d = new Date(t), now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (dayKey(t) === dayKey(now)) return "Today";
  if (dayKey(t) === dayKey(y)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}
const clock = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const prettyId = (id) => String(id || "").split("/").pop().replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/* Turn a raw history entry into something a person can read */
function resolve(x, D) {
  const o = { t: x.t, type: x.type, kind: KIND[x.type] ? x.type : "page", attrs: "", href: "#/history", th: "", title: x.title || "", sub: x.sub || "", extra: "" };
  if (x.type === "video") {
    const v = D.V.get(x.id);
    o.title = (v && v.title) || x.title || "A video";
    o.sub = [v && v.channel, x.played ? "played" : "opened"].filter(Boolean).join(" · ");
    o.th = `<img src="${ytThumb(x.id, "mqdefault")}" alt="" loading="lazy" width="96" height="60"><span class="pl">${ICON.play}</span>`;
    o.attrs = `data-video="${esc(x.id)}"`; o.href = `#/watch/${x.id}`;
  } else if (x.type === "person") {
    const p = D.P.get(x.id);
    o.title = (p && p.name) || x.title || prettyId(x.id);
    o.sub = p ? [p.role, p.org].filter(Boolean).join(", ") : x.sub;
    const ph = (p && (p.photo_local || p.photo)) || x.img || "";
    o.th = ph ? `<img src="${esc(ph)}" alt="" loading="lazy" width="96" height="60" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ini',textContent:'${esc(initials(o.title))}'}))">` : `<span class="ini">${esc(initials(o.title))}</span>`;
    o.thc = "ph"; o.attrs = `data-person="${esc(x.id)}"`; o.href = `#/researchers/${x.id}`;
  } else if (x.type === "lesson") {
    const l = D.L.get(x.id) || D.L.get(String(x.id).split("/").pop());
    o.title = (l && l.title) || x.title || prettyId(x.id);
    o.sub = (l && l.unit) || x.sub || "Alignment 101";
    o.th = `${ICONS.cap}<span class="pl" style="background:transparent;color:inherit;font:700 11px var(--f-mono);width:auto;right:8px;bottom:6px">U${l ? l.n : ""}</span>`;
    o.href = (l && l.href) || `#/learn/${x.id}`;
  } else if (x.type === "post") {
    const b = D.B.get(x.id);
    o.title = (b && b.title) || x.title || prettyId(x.id);
    o.sub = [b && b.date, b && b.mins ? `${b.mins} min read` : ""].filter(Boolean).join(" · ") || x.sub;
    o.th = b && b.cover ? `<img src="assets/img/sm/${esc(b.cover)}.jpg" onerror="this.onerror=null;this.src='assets/img/${esc(b.cover)}.jpg'" alt="" loading="lazy" width="96" height="60">` : ICONS.pen;
    o.href = `#/blog/${x.id}`;
  } else if (x.type === "book") {
    const b = D.K.get(x.id);
    o.title = (b && b.title) || x.title || prettyId(x.id);
    const pct = b && b.nch ? Math.round(((x.read || []).length / b.nch) * 100) : 0;
    o.sub = [b && b.authors && b.authors.map((a) => a.name).slice(0, 2).join(", "), `${(x.read || []).length}${b && b.nch ? " of " + b.nch : ""} chapters read`].filter(Boolean).join(" · ");
    o.th = b && b.cover ? `<img src="library/${esc(b.cover)}" alt="" loading="lazy" width="40" height="60">` : ICONS.book;
    o.thc = "bk"; o.href = `library/#/book/${x.id}`;
    o.extra = `<span class="pbar" aria-label="${pct} percent read"><i style="width:${pct}%"></i></span>`;
  } else {
    const pages = { explosion: ["The Intelligence Explosion", "explosion/", ICONS.bolt], library: ["Book Library", "library/", ICONS.book] };
    const pg = pages[x.id];
    o.kind = "page";
    o.title = (pg && pg[0]) || x.title || prettyId(x.id);
    const desc = { explosion: "When AI starts building better AI", library: "Books on AI risk with chapter guides and a reader" }[x.id];
    o.sub = desc || (x.sub && x.sub !== "Deep dive" ? x.sub : "");
    o.th = pg ? pg[2] : ICONS.spark; o.href = pg ? pg[1] : "#/";
  }
  return o;
}

export async function render(el) {
  let f = "all", q = "";
  el.innerHTML = `${pageHero({ img: "cover-history", eyebrow: "Your history", title: "Everything <span class='serif gt'>you have opened.</span>", lead: "Researchers, videos, lessons, blog posts, books and deep dives, newest first. It lives only in this browser. Clear it any time, or export it as a JSON file." })}
  <section class="section tight" data-cat="lime"><div class="wrap">
    <div class="h3-sum" id="hs"></div>
    <div class="h3-tools">
      <div class="chips" role="group" aria-label="Filter by type">${Object.entries(KIND).map(([k, [l, c]]) => `<button class="chip ${k === "all" ? "on" : ""}" type="button" data-k="${k}" aria-pressed="${k === "all"}" style="--accent:${KC[c]}">${l} <span class="count" data-n="${k}"></span></button>`).join("")}</div>
      <label class="sr-only" for="hq">Search your history</label><input id="hq" type="search" placeholder="Search your history" autocomplete="off">
      <div class="row" style="margin-left:auto"><button class="btn sm" type="button" id="hx">${ICON.dl} Export JSON</button><button class="btn sm ghost" type="button" id="hc">Clear</button></div>
    </div>
    <div id="hl" aria-live="polite"><div class="skel-grid"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div>
  </div></section>`;
  const D = await lookups();
  let items = [];
  function collect() {
    const raw = getHistory();
    const prog = store.get("lib:prog", {});
    const books = Object.entries(prog || {}).filter(([, v]) => v && v.t).map(([id, v]) => ({ type: "book", id, t: v.t, read: v.read || [] }));
    items = raw.concat(books).filter((x) => x && x.id && x.t).map((x) => resolve(x, D)).sort((a, b) => b.t - a.t);
  }
  function paint() {
    Object.keys(KIND).forEach((k) => { const n = $(`[data-n="${k}"]`, el); if (n) n.textContent = k === "all" ? items.length : items.filter((x) => x.kind === k).length; });
    const cnt = (k) => items.filter((x) => x.kind === k).length;
    const days = new Set(items.map((x) => dayKey(x.t))).size;
    $("#hs", el).innerHTML = [["Researchers met", cnt("person"), "#0ea5e9"], ["Videos", cnt("video"), "#ef4444"], ["Lessons", cnt("lesson"), "#84cc16"], ["Posts read", cnt("post"), "#f59e0b"], ["Books opened", cnt("book"), "#eab308"], ["Days active", days, "#10b981"]]
      .map(([l, n, c]) => `<div style="--c:${c}"><b>${n}</b><span>${l}</span></div>`).join("");
    const ql = q.trim().toLowerCase();
    const list = items.filter((x) => (f === "all" || x.kind === f) && (!ql || `${x.title} ${x.sub}`.toLowerCase().includes(ql)));
    if (!list.length) {
      $("#hl", el).innerHTML = items.length ? `<div class="empty-state"><h3>Nothing matches</h3><p>Try another filter or search word.</p></div>` : `<div class="empty-state"><h3>Nothing here yet</h3><p>Open a researcher, play a video, finish a lesson, read a post or open a book and it shows up here.</p><div class="row" style="justify-content:center;margin-top:14px"><a class="btn" href="#/watch">Browse videos</a><a class="btn ghost" href="#/researchers">Meet the researchers</a></div></div>`;
      return;
    }
    let out = "", cur = "", buf = "";
    const flush = () => { if (buf) out += `<div class="h3-list">${buf}</div>`; buf = ""; };
    list.forEach((x) => {
      const dk = dayLabel(x.t);
      if (dk !== cur) { flush(); cur = dk; const n = list.filter((y) => dayLabel(y.t) === dk).length; out += `<h2 class="h3-day">${esc(dk)}<small>${n} ${n === 1 ? "item" : "items"}</small></h2>`; }
      const c = KC[(KIND[x.kind] || KIND.all)[1]];
      buf += `<a class="h3-item card-glow m3-spot" href="${esc(x.href)}" ${x.attrs} style="--c:${c};--cat:${c}"><span class="h3-th ${x.thc || ""}">${x.th}</span><span class="h3-tx"><b>${esc(x.title)}</b><span><span class="k">${esc((KIND[x.kind] || ["Item"])[0].replace(/s$/, ""))}</span>${x.sub ? " · " + esc(x.sub) : ""}</span><span><time datetime="${new Date(x.t).toISOString()}">${clock(x.t)}</time></span>${x.extra}</span></a>`;
    });
    flush();
    $("#hl", el).innerHTML = out;
  }
  $$("[data-k]", el).forEach((b) => b.addEventListener("click", () => { f = b.dataset.k; $$("[data-k]", el).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); }); paint(); }));
  let qt = 0;
  $("#hq", el).addEventListener("input", (e) => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value; paint(); }, 120); });
  $("#hx", el).addEventListener("click", () => { exportHistory(); toast("History exported as JSON."); });
  $("#hc", el).addEventListener("click", () => {
    const label = f === "all" ? "all of your history" : `your ${KIND[f][0].toLowerCase()} history`;
    if (!confirm(`Clear ${label} in this browser?`)) return;
    if (f === "book" || f === "all") store.set("lib:prog", Object.fromEntries(Object.entries(store.get("lib:prog", {})).map(([k, v]) => [k, { ...v, t: 0 }])));
    if (f !== "book") clearHistory(f === "all" ? null : f);
    toast("History cleared."); collect(); paint();
  });
  const onH = () => { collect(); paint(); };
  window.addEventListener("historychange", onH);
  collect(); paint();
  return () => window.removeEventListener("historychange", onH);
}
