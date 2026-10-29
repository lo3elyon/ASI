import { $, $$, esc, load, arr, videos, researchers, pageHero, CATS, ytThumb, fmtDur, fmtDate, durSecs, store, ICON } from "../util.js";
import { openVideo } from "../core/overlay.js";

const PAGE = 36;
export async function render(el, params) {
  const [vids, ppl, collRaw] = await Promise.all([videos(), researchers(), load("video-collections.json")]);
  const byId = Object.fromEntries(vids.map((v) => [v.id, v]));
  const pById = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const colls = arr(collRaw, "collections").map((c) => ({ id: c.id || c.slug, title: c.title || c.name, description: c.description || c.summary || "", ids: (c.video_ids || c.videos || c.ids || []).map((x) => (typeof x === "string" ? x : x.id)).filter((x) => byId[x]), c: c.accent || c.color || "#22d3ee" })).filter((c) => c.id && c.ids.length);
  const cats = [...new Set([...Object.keys(CATS).filter((k) => vids.some((v) => v.category === k)), ...vids.map((v) => v.category).filter(Boolean)])];
  cats.forEach((k) => { if (!CATS[k]) CATS[k] = { label: k.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()), c: "#22d3ee" }; });
  const years = [...new Set(vids.map((v) => v.year).filter(Boolean))].sort().reverse();
  const peopleIn = ppl.filter((p) => vids.some((v) => v.people.includes(p.id)));
  const hist = () => store.get("history", []);
  const watched = () => new Set(hist().map((h) => h.id));
  const S = { q: "", cat: "all", person: "", level: "", year: "", sort: "new", unwatched: false, coll: "", n: PAGE };
  const totalH = Math.round(vids.reduce((s, v) => s + durSecs(v.duration), 0) / 3600);

  el.innerHTML = `${pageHero({ img: "cover-watch", eyebrow: "Watch", title: "Hear it from <span class='serif gt-ember'>them directly.</span>", lead: `${vids.length} verified videos${totalH ? `, about ${totalH} hours` : ""}: warnings, interviews, lectures, debates, documentaries and courses on AI safety, alignment, control and governance. Nothing autoplays. A video loads from YouTube only when you press play, in privacy enhanced mode.` })}
  <section class="section tight"><div class="wrap">
    <div id="cont"></div>
    ${colls.length ? `<div class="sec-head" style="margin-bottom:16px"><div><div class="eyebrow">Collections</div><h3 style="margin:6px 0 0">Curated playlists</h3></div></div><div class="coll" id="colls">${colls.map((c) => `<button class="card hov collcard" type="button" data-coll="${esc(c.id)}" style="--c:${c.c}"><div class="stack">${c.ids.slice(0, 4).map((id) => `<img src="${ytThumb(id, "mqdefault")}" alt="" loading="lazy" width="320" height="180">`).join("")}</div><b>${esc(c.title)}</b><p class="muted">${esc(c.description)}</p><span class="count">${c.ids.length} videos</span></button>`).join("")}</div>` : ""}
    <div class="toolbar" style="margin-top:28px" role="search">
      <label class="sr-only" for="wq">Search videos</label><input class="input search" id="wq" type="search" placeholder="Search titles, channels, people, topics">
      <label class="sr-only" for="wp">Person</label><select class="input" id="wp"><option value="">Anyone</option>${peopleIn.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>
      <label class="sr-only" for="wl">Level</label><select class="input" id="wl"><option value="">Any level</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
      <label class="sr-only" for="wy">Year</label><select class="input" id="wy"><option value="">Any year</option>${years.map((y) => `<option>${y}</option>`).join("")}</select>
      <label class="sr-only" for="ws">Sort</label><select class="input" id="ws"><option value="new">Newest</option><option value="old">Oldest</option><option value="long">Longest</option><option value="short">Shortest</option></select>
      <button class="chip" id="wu" type="button" aria-pressed="false">Unwatched only</button>
      <span class="count" id="wc"></span>
    </div>
    <div class="chips cat-scroll" style="margin:-6px 0 22px" role="group" aria-label="Category"><button class="chip on" type="button" data-cat="all">All</button>${cats.map((k) => `<button class="chip" type="button" data-cat="${k}">${CATS[k].label} <span class="count">${vids.filter((v) => v.category === k).length}</span></button>`).join("")}</div>
    <div id="collBanner"></div>
    <div class="vgrid" id="vg"></div>
    <div style="text-align:center;margin-top:26px"><button class="btn" id="more" type="button">Show more</button></div>
  </div></section>
`;

  function filtered() {
    const q = S.q.toLowerCase().split(/\s+/).filter(Boolean); const w = watched();
    const coll = S.coll ? new Set(colls.find((c) => c.id === S.coll)?.ids || []) : null;
    let r = vids.filter((v) => (S.cat === "all" || v.category === S.cat) && (!S.person || v.people.includes(S.person)) && (!S.level || v.level === S.level) && (!S.year || v.year === S.year) && (!S.unwatched || !w.has(v.id)) && (!coll || coll.has(v.id))
      && q.every((t) => `${v.title} ${v.channel} ${v.summary} ${v.category} ${v.people.map((p) => pById[p]?.name || p).join(" ")}`.toLowerCase().includes(t)));
    const k = { new: (a, b) => b.date.localeCompare(a.date), old: (a, b) => a.date.localeCompare(b.date), long: (a, b) => durSecs(b.duration) - durSecs(a.duration), short: (a, b) => durSecs(a.duration) - durSecs(b.duration) }[S.sort];
    if (coll) r = (colls.find((c) => c.id === S.coll).ids).map((id) => byId[id]).filter((v) => r.includes(v));
    else r = r.slice().sort(k);
    return r;
  }
  const vcard = (v, w, q) => `<button class="card hov vcard" type="button" data-video="${v.id}"${q ? ` data-queue="${q}"` : ""} style="--c:${(CATS[v.category] || {}).c || "#22d3ee"}">
    <div class="th"><img src="${ytThumb(v.id)}" alt="" loading="lazy" decoding="async" width="320" height="180" onload="this.classList.add('ld')">${v.duration ? `<span class="dur">${esc(v.duration.replace(/^0:/, ""))}</span>` : ""}${w.has(v.id) ? `<span class="seen">WATCHED</span>` : ""}<span class="play"><span>${ICON.play}</span></span></div>
    <div class="meta"><b>${esc(v.title)}</b><span>${esc(v.channel)}${v.date ? ` · ${esc(fmtDate(v.date))}` : ""}</span><div class="row"><span class="tag" style="--c:${(CATS[v.category] || {}).c || "#22d3ee"}">${esc((CATS[v.category] || { label: v.category }).label)}</span><span class="tag" style="--c:var(--muted)">${esc(v.level)}</span></div></div></button>`;
  function paint(append) {
    const r = filtered(), w = watched();
    const q = S.coll ? (colls.find((c) => c.id === S.coll)?.ids || []).join(",") : "";
    $("#wc", el).textContent = `${r.length} videos`;
    const g = $("#vg", el);
    if (append) g.insertAdjacentHTML("beforeend", r.slice(append, S.n).map((v) => vcard(v, w, q)).join(""));
    else g.innerHTML = r.length ? r.slice(0, S.n).map((v) => vcard(v, w, q)).join("") : `<div class="empty-state" style="grid-column:1/-1">No videos match. Clear a filter or two.</div>`;
    $("#more", el).style.display = r.length > S.n ? "" : "none";
    $("#more", el).textContent = `Show more (${Math.max(0, r.length - S.n)} left)`;
    if (append) { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); return; }
    const c = colls.find((x) => x.id === S.coll);
    $("#collBanner", el).innerHTML = c ? `<div class="card" style="margin-bottom:18px;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;--c:${c.c}"><div><div class="eyebrow">Collection</div><h3 style="margin:6px 0 0">${esc(c.title)}</h3><p class="muted" style="margin:4px 0 0">${esc(c.description)}</p></div><div class="row"><button class="btn sm primary" type="button" id="playAll">${ICON.play} Play all</button><a class="btn sm ghost" href="#/watch">Show everything</a></div></div>` : "";
    if (c) $("#playAll", el).onclick = () => openVideo(c.ids[0], { queue: c.ids });
    contRow();
    if (window.ScrollTrigger) requestAnimationFrame(() => window.ScrollTrigger.refresh());
  }
  function contRow() {
    const h = hist().slice(0, 8).map((x) => byId[x.id]).filter(Boolean);
    $("#cont", el).innerHTML = h.length ? `<div class="sec-head" style="margin-bottom:16px"><div><div class="eyebrow">Your history</div><h3 style="margin:6px 0 0">Recently opened</h3></div><a class="btn sm ghost" href="#/history">Full history</a></div><div class="coll" style="margin-bottom:30px">${h.map((v) => vcard(v, new Set())).join("")}</div>` : "";
  }

  const bind = (id, k, ev = "change") => $(id, el).addEventListener(ev, (e) => { S[k] = e.target.value; S.n = PAGE; paint(); });
  bind("#wq", "q", "input"); bind("#wp", "person"); bind("#wl", "level"); bind("#wy", "year"); bind("#ws", "sort");
  $("#wu", el).addEventListener("click", (e) => { S.unwatched = !S.unwatched; e.currentTarget.classList.toggle("on", S.unwatched); e.currentTarget.setAttribute("aria-pressed", S.unwatched); paint(); });
  $$("[data-cat]", el).forEach((b) => b.addEventListener("click", () => { S.cat = b.dataset.cat; S.n = PAGE; $$("[data-cat]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); }));
  const more = () => { const from = S.n; S.n += PAGE; paint(from); };
  $("#more", el).addEventListener("click", more);
  // Paged rendering: the next page loads as the reader nears the end, so 900+ videos never render at once
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && $("#more", el).style.display !== "none") more(); }, { rootMargin: "600px 0px" });
  io.observe($("#more", el));
  el.addEventListener("click", (e) => { const c = e.target.closest("[data-coll]"); if (c) location.hash = `#/watch/c/${c.dataset.coll}`; });
  const onH = () => contRow();
  window.addEventListener("historychange", onH);

  function handle(p) {
    if (p[0] === "c" && p[1]) { S.coll = p[1]; S.n = 999; paint(); $("#collBanner", el).scrollIntoView({ block: "start" }); return; }
    if (S.coll) { S.coll = ""; S.n = PAGE; }
    paint();
  }
  el._onParams = handle;
  paint();
  if (params.length) handle(params);
  return () => { io.disconnect(); window.removeEventListener("historychange", onH); };
}
