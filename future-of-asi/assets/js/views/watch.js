import { $, $$, esc, load, arr, videos, researchers, pageHero, CATS, ytThumb, ytEmbed, fmtDur, fmtDate, durSecs, store, ICON, toast } from "../util.js";

const PAGE = 36;
export async function render(el, params) {
  const [vids, ppl, collRaw] = await Promise.all([videos(), researchers(), load("video-collections.json")]);
  const byId = Object.fromEntries(vids.map((v) => [v.id, v]));
  const pById = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const colls = arr(collRaw, "collections").map((c) => ({ id: c.id || c.slug, title: c.title || c.name, description: c.description || c.summary || "", ids: (c.video_ids || c.videos || c.ids || []).map((x) => (typeof x === "string" ? x : x.id)).filter((x) => byId[x]), c: c.accent || c.color || "#22d3ee" })).filter((c) => c.id && c.ids.length);
  const cats = Object.keys(CATS).filter((k) => vids.some((v) => v.category === k));
  const years = [...new Set(vids.map((v) => v.year).filter(Boolean))].sort().reverse();
  const peopleIn = ppl.filter((p) => vids.some((v) => v.people.includes(p.id)));
  const hist = () => store.get("history", []);
  const watched = () => new Set(hist().map((h) => h.id));
  const S = { q: "", cat: "all", person: "", level: "", year: "", sort: "new", unwatched: false, coll: "", n: PAGE };
  const totalH = Math.round(vids.reduce((s, v) => s + durSecs(v.duration), 0) / 3600);

  el.innerHTML = `${pageHero({ img: "cover-watch", eyebrow: "Watch", title: "Hear it from <span class='serif'>them directly.</span>", lead: `${vids.length} verified videos${totalH ? `, about ${totalH} hours` : ""}: warnings, interviews, lectures, debates, documentaries and courses on AI safety, alignment, control and governance. Every one plays in privacy enhanced mode.` })}
  <section class="section tight"><div class="wrap">
    <div id="cont"></div>
    ${colls.length ? `<div class="sec-head" style="margin-bottom:16px"><div><div class="eyebrow">Collections</div><h3 style="margin:6px 0 0">Curated playlists</h3></div></div><div class="coll" id="colls">${colls.map((c) => `<button class="card hov collcard" type="button" data-coll="${esc(c.id)}" style="--c:${c.c}"><div class="stack">${c.ids.slice(0, 4).map((id) => `<img src="${ytThumb(id, "mqdefault")}" alt="" loading="lazy">`).join("")}</div><b>${esc(c.title)}</b><p class="muted">${esc(c.description)}</p><span class="count">${c.ids.length} videos</span></button>`).join("")}</div>` : ""}
    <div class="toolbar" style="margin-top:28px" role="search">
      <label class="sr-only" for="wq">Search videos</label><input class="input search" id="wq" type="search" placeholder="Search titles, channels, people, topics">
      <label class="sr-only" for="wp">Person</label><select class="input" id="wp"><option value="">Anyone</option>${peopleIn.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>
      <label class="sr-only" for="wl">Level</label><select class="input" id="wl"><option value="">Any level</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
      <label class="sr-only" for="wy">Year</label><select class="input" id="wy"><option value="">Any year</option>${years.map((y) => `<option>${y}</option>`).join("")}</select>
      <label class="sr-only" for="ws">Sort</label><select class="input" id="ws"><option value="new">Newest</option><option value="old">Oldest</option><option value="long">Longest</option><option value="short">Shortest</option></select>
      <button class="chip" id="wu" type="button" aria-pressed="false">Unwatched only</button>
      <span class="count" id="wc"></span>
    </div>
    <div class="chips" style="margin:-6px 0 22px" role="group" aria-label="Category"><button class="chip on" type="button" data-cat="all">All</button>${cats.map((k) => `<button class="chip" type="button" data-cat="${k}">${CATS[k].label} <span class="count">${vids.filter((v) => v.category === k).length}</span></button>`).join("")}</div>
    <div id="collBanner"></div>
    <div class="vgrid" id="vg"></div>
    <div style="text-align:center;margin-top:26px"><button class="btn" id="more" type="button">Show more</button></div>
  </div></section>
  <div class="theater" id="th" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Video player">
    <div class="bar"><b id="thT"></b><button class="icon-btn" type="button" id="thW" aria-label="Toggle wide mode">${ICON.wide}</button><a class="icon-btn" id="thY" target="_blank" rel="noopener" aria-label="Open on YouTube">${ICON.ext}</a><button class="icon-btn" type="button" id="thX" aria-label="Close player">${ICON.close}</button></div>
    <div class="stage"><div class="screen" id="thS"></div><aside class="side" id="thSide"></aside></div>
  </div>`;

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
  const vcard = (v, w) => `<button class="card hov vcard" type="button" data-v="${v.id}" style="--c:${(CATS[v.category] || {}).c || "#22d3ee"}">
    <div class="th"><img src="${ytThumb(v.id)}" alt="" loading="lazy" decoding="async" onload="this.classList.add('ld')">${v.duration ? `<span class="dur">${esc(v.duration.replace(/^0:/, ""))}</span>` : ""}${w.has(v.id) ? `<span class="seen">WATCHED</span>` : ""}<span class="play"><span>${ICON.play}</span></span></div>
    <div class="meta"><b>${esc(v.title)}</b><span>${esc(v.channel)}${v.date ? ` · ${esc(fmtDate(v.date))}` : ""}</span><div class="row"><span class="tag" style="--c:${(CATS[v.category] || {}).c || "#22d3ee"}">${esc((CATS[v.category] || { label: v.category }).label)}</span><span class="tag" style="--c:var(--muted)">${esc(v.level)}</span></div></div></button>`;
  function paint() {
    const r = filtered(), w = watched();
    $("#wc", el).textContent = `${r.length} videos`;
    $("#vg", el).innerHTML = r.length ? r.slice(0, S.n).map((v) => vcard(v, w)).join("") : `<div class="empty-state" style="grid-column:1/-1">No videos match. Clear a filter or two.</div>`;
    $("#more", el).style.display = r.length > S.n ? "" : "none";
    $("#more", el).textContent = `Show more (${Math.max(0, r.length - S.n)} left)`;
    const c = colls.find((x) => x.id === S.coll);
    $("#collBanner", el).innerHTML = c ? `<div class="card" style="margin-bottom:18px;display:flex;justify-content:space-between;gap:12px;align-items:center;--c:${c.c}"><div><div class="eyebrow">Collection</div><h3 style="margin:6px 0 0">${esc(c.title)}</h3><p class="muted" style="margin:4px 0 0">${esc(c.description)}</p></div><div class="row"><button class="btn sm primary" type="button" id="playAll">${ICON.play} Play all</button><button class="btn sm ghost" type="button" id="clrColl">Show everything</button></div></div>` : "";
    if (c) { $("#playAll", el).onclick = () => openV(c.ids[0], c.ids); $("#clrColl", el).onclick = () => { location.hash = "#/watch"; }; }
    contRow();
  }
  function contRow() {
    const h = hist().slice(0, 8).map((x) => byId[x.id]).filter(Boolean);
    $("#cont", el).innerHTML = h.length ? `<div class="sec-head" style="margin-bottom:16px"><div><div class="eyebrow">Your history</div><h3 style="margin:6px 0 0">Recently opened</h3></div><button class="btn sm ghost" type="button" id="clrH">Clear history</button></div><div class="coll" style="margin-bottom:30px">${h.map((v) => vcard(v, new Set())).join("")}</div>` : "";
    const b = $("#clrH", el); if (b) b.onclick = () => { store.set("history", []); toast("Watch history cleared."); paint(); };
  }

  const bind = (id, k, ev = "change") => $(id, el).addEventListener(ev, (e) => { S[k] = e.target.value; S.n = PAGE; paint(); });
  bind("#wq", "q", "input"); bind("#wp", "person"); bind("#wl", "level"); bind("#wy", "year"); bind("#ws", "sort");
  $("#wu", el).addEventListener("click", (e) => { S.unwatched = !S.unwatched; e.currentTarget.classList.toggle("on", S.unwatched); e.currentTarget.setAttribute("aria-pressed", S.unwatched); paint(); });
  $$("[data-cat]", el).forEach((b) => b.addEventListener("click", () => { S.cat = b.dataset.cat; S.n = PAGE; $$("[data-cat]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); }));
  $("#more", el).addEventListener("click", () => { S.n += PAGE; paint(); });
  el.addEventListener("click", (e) => {
    const v = e.target.closest("[data-v]"); if (v && !v.closest("#th")) { location.hash = `#/watch/${v.dataset.v}`; return; }
    const c = e.target.closest("[data-coll]"); if (c) location.hash = `#/watch/c/${c.dataset.coll}`;
  });

  // Theater
  const th = $("#th", el);
  let queue = null, lastFocus = null;
  function openV(id, q) {
    const v = byId[id]; if (!v) return;
    if (q) queue = q;
    lastFocus = lastFocus || document.activeElement;
    $("#thT", el).textContent = v.title;
    $("#thY", el).href = `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`;
    $("#thS", el).innerHTML = `<iframe src="${ytEmbed(v.id)}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    const people = v.people.map((p) => pById[p]).filter(Boolean);
    const next = (queue && queue.includes(id) ? queue.slice(queue.indexOf(id) + 1) : vids.filter((x) => x.id !== id && (x.category === v.category || x.people.some((p) => v.people.includes(p)))).map((x) => x.id)).slice(0, 8).map((x) => byId[x]).filter(Boolean);
    $("#thSide", el).innerHTML = `<div class="row"><span class="tag" style="--c:${(CATS[v.category] || {}).c}">${esc((CATS[v.category] || { label: v.category }).label)}</span><span class="tag" style="--c:#8aa0b8">${esc(v.level)}</span>${v.duration ? `<span class="count">${esc(fmtDur(v.duration))}</span>` : ""}</div>
      <div><b style="font-size:17px">${esc(v.title)}</b><p style="margin-top:6px">${esc(v.channel)}${v.date ? ` · ${esc(fmtDate(v.date))}` : ""}</p></div>${v.summary ? `<p>${esc(v.summary)}</p>` : ""}
      ${people.length ? `<div class="chips">${people.map((p) => `<a class="chip" href="#/researchers/${p.id}">${esc(p.name)}</a>`).join("")}</div>` : ""}
      ${next.length ? `<div class="eyebrow" style="margin-top:8px">${queue ? "Up next in this collection" : "Up next"}</div><div class="upnext">${next.map((n) => `<button type="button" data-next="${n.id}"><img src="${ytThumb(n.id, "mqdefault")}" alt="" loading="lazy"><span>${esc(n.title)}<br><span style="color:#8aa0b8">${esc(n.channel)}</span></span></button>`).join("")}</div>` : ""}`;
    $$("[data-next]", th).forEach((b) => (b.onclick = () => { history.replaceState(null, "", `#/watch/${b.dataset.next}`); openV(b.dataset.next); }));
    th.classList.add("open"); th.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll");
    $("#thX", el).focus();
    const h = hist().filter((x) => x.id !== id); h.unshift({ id, t: Date.now() }); store.set("history", h.slice(0, 300));
  }
  function closeV(silent) {
    th.classList.remove("open"); th.setAttribute("aria-hidden", "true"); $("#thS", el).innerHTML = ""; document.body.classList.remove("no-scroll"); queue = null;
    if (!silent) location.hash = S.coll ? `#/watch/c/${S.coll}` : "#/watch";
    if (lastFocus && lastFocus.focus) lastFocus.focus(); lastFocus = null;
    paint();
  }
  $("#thX", el).addEventListener("click", () => closeV());
  $("#thW", el).addEventListener("click", () => th.classList.toggle("wide"));
  const onKey = (e) => { if (th.classList.contains("open") && e.key === "Escape") closeV(); };
  document.addEventListener("keydown", onKey);

  function handle(p) {
    if (p[0] === "c" && p[1]) { S.coll = p[1]; S.n = 999; if (th.classList.contains("open")) closeV(true); paint(); $("#collBanner", el).scrollIntoView({ block: "start" }); return; }
    if (p[0] && byId[p[0]]) { openV(p[0]); return; }
    if (S.coll) { S.coll = ""; S.n = PAGE; }
    if (th.classList.contains("open")) closeV(true); else paint();
  }
  el._onParams = handle;
  paint();
  if (params.length) handle(params);
  return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("no-scroll"); };
}
