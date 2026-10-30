/* Watch (Round 3): a cinema. Hero carousel with posters, continue watching, watch later, a queue, a mini player,
   category glow tiles, playlist shelves you can drag, rich filters, hover previews and keyboard shortcuts.
   Nothing autoplays: YouTube (nocookie) is only contacted after a click on a play control. Grids are paged. */
import { $, $$, esc, load, arr, videos, researchers, CATS, ytThumb, ytEmbed, fmtDur, fmtDate, durSecs, store, ICON, RM, toast } from "../util.js";
import { openVideo } from "../core/overlay.js";
import { logView } from "../core/history.js";
import { headH, run, m3init, m3auto, pic, photoMap, face, dragScroll, debounce, sparkBars } from "../pages3/kit.js";
import { scrollToEl } from "../pages3/kit.js";

const PAGE = 36;
const LANGS = [["Hindi", /[\u0900-\u097F]|\bin hindi\b/i], ["Bengali", /[\u0980-\u09FF]|\bin bengali\b/i], ["Urdu", /[\u0600-\u06FF]|\bin urdu\b/i]];
const langOf = (v) => (LANGS.find(([, r]) => r.test(v.title)) || ["English or other"])[0];
const LEN = { short: [0, 600, "Under 10 min"], mid: [600, 1800, "10 to 30 min"], long: [1800, 3600, "30 to 60 min"], xl: [3600, 1e9, "Over an hour"] };
const catC = (k) => (CATS[k] || {}).c || "#22d3ee";
const catL = (k) => (CATS[k] || { label: k }).label;

export async function render(el, params) {
  const [vids, ppl, collRaw, phm] = await Promise.all([videos(), researchers(), load("video-collections.json"), photoMap()]);
  vids.forEach((v) => { v.secs = durSecs(v.duration); v.lang = langOf(v); });
  const byId = Object.fromEntries(vids.map((v) => [v.id, v]));
  const pById = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const colls = arr(collRaw, "collections").map((c) => ({ id: c.id || c.slug, title: c.title || c.name, description: c.description || "", ids: (c.video_ids || c.videos || []).map((x) => (typeof x === "string" ? x : x.id)).filter((x) => byId[x]) })).filter((c) => c.id && c.ids.length);
  colls.forEach((c) => { const k = {}; c.ids.forEach((id) => (k[byId[id].category] = (k[byId[id].category] || 0) + 1)); c.c = catC(Object.entries(k).sort((a, b) => b[1] - a[1])[0][0]); c.mins = Math.round(c.ids.reduce((s, id) => s + byId[id].secs, 0) / 60); });
  const cats = Object.keys(CATS).filter((k) => vids.some((v) => v.category === k));
  vids.forEach((v) => { if (!CATS[v.category]) { CATS[v.category] = { label: v.category.replace(/-/g, " "), c: "#22d3ee" }; if (!cats.includes(v.category)) cats.push(v.category); } });
  const years = [...new Set(vids.map((v) => v.year).filter(Boolean))].sort().reverse();
  const featured = ppl.map((p) => [p, vids.filter((v) => v.people.includes(p.id)).length]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
  const totalH = Math.round(vids.reduce((s, v) => s + v.secs, 0) / 3600);
  const channels = new Set(vids.map((v) => v.channel).filter(Boolean)).size;
  const langs = ["English or other", "Hindi", "Bengali", "Urdu"].filter((l) => vids.some((v) => v.lang === l));
  const yrsAsc = years.slice().reverse(); const perYear = yrsAsc.map((y) => vids.filter((v) => v.year === y).length);
  const pickFrom = ["start-here-60-minutes", "latest-2026", "godfathers-warn", "ai-control-explained", "intelligence-explosion", "they-left-the-labs"];
  const slides = pickFrom.map((cid) => colls.find((c) => c.id === cid)).filter(Boolean).map((c) => ({ v: byId[c.ids[0]], c }));

  const S = { q: "", cat: "all", person: "", level: "", len: "", year: "", lang: "", sort: "new", unwatched: false, n: PAGE };
  const later = () => store.get("p3later", []), queue = () => store.get("p3queue", []);
  const hist = () => store.get("history", []);
  const watched = () => new Set(hist().map((h) => h.id));

  /* Cards: an article with a real play button (opens the theater with a poster) and small actions */
  const card = (v, w, q = "") => `<article class="card vcard p3-vc" data-vid="${esc(v.id)}" style="--c:${catC(v.category)}">
    <button type="button" class="p3-vplay" data-video="${esc(v.id)}"${q ? ` data-queue="${esc(q)}"` : ""} aria-label="Open ${esc(v.title)}"><div class="th"><img src="${ytThumb(v.id)}" alt="" loading="lazy" decoding="async" width="320" height="180" onload="this.classList.add('ld')">${v.duration ? `<span class="dur">${esc(fmtDur(v.duration))}</span>` : ""}${w.has(v.id) ? `<span class="seen">WATCHED</span>` : ""}<span class="play"><span>${ICON.play}</span></span></div>
    <div class="meta"><b>${esc(v.title)}</b><span>${esc(v.channel)}${v.date ? ` · ${esc(fmtDate(v.date))}` : ""}</span></div></button>
    <div class="p3-vact"><span class="tag" style="--c:${catC(v.category)}">${esc(catL(v.category))}</span><span class="sp"></span>${actBtns(v.id)}</div></article>`;
  const actBtns = (id) => { const L = later().includes(id), Q = queue().includes(id); return `<button type="button" class="p3-ab ${L ? "on" : ""}" data-later="${esc(id)}" aria-pressed="${L}" aria-label="Watch later" title="Watch later">${clock()}</button><button type="button" class="p3-ab ${Q ? "on" : ""}" data-addq="${esc(id)}" aria-pressed="${Q}" aria-label="Add to queue" title="Add to queue">${plus()}</button><button type="button" class="p3-ab" data-mini="${esc(id)}" aria-label="Play in mini player" title="Mini player">${pip()}</button>`; };
  const refreshActs = () => $$("[data-later], [data-addq]", el).forEach((b) => { const id = b.dataset.later || b.dataset.addq; const on = b.dataset.later ? later().includes(id) : queue().includes(id); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });

  el.innerHTML = `
  <section class="p3-car" id="car" aria-roledescription="carousel" aria-label="Featured videos" data-cat="blue">
    <div class="p3-car-bg">${pic("p3-watch-hero", "An empty dark screening room with a cyan projector beam", { eager: true })}</div>
    <div class="p3-car-shade" aria-hidden="true"></div><div class="p3-letter t" aria-hidden="true"></div><div class="p3-letter b" aria-hidden="true"></div>
    <div class="wrap p3-car-in">
      <div class="p3-car-head"><div class="eyebrow" data-m3="left">Watch</div><h1 class="p3-h1 p3-bebas" data-p3="rise">Hear it from <span>them directly.</span></h1>
        <p class="lead" data-m3="up">${vids.length.toLocaleString("en-US")} verified videos, about ${totalH.toLocaleString("en-US")} hours. Nothing autoplays. A video loads from YouTube only when you press play, in privacy enhanced mode.</p></div>
      <div class="p3-slides" id="slides">${slides.map((s, i) => slideHtml(s, i)).join("")}</div>
      <div class="p3-car-ctl"><button class="icon-btn p3-rip" type="button" id="cPrev" aria-label="Previous featured video">${chev(-1)}</button><div class="p3-cdots" role="tablist" aria-label="Choose a featured video">${slides.map((s, i) => `<button type="button" role="tab" aria-selected="${!i}" aria-label="${esc(s.c.title)}" data-sl="${i}"><i></i></button>`).join("")}</div><button class="icon-btn p3-rip" type="button" id="cNext" aria-label="Next featured video">${chev(1)}</button><button class="chip" type="button" id="cPause" aria-pressed="false">Pause slides</button></div>
    </div>
  </section>

  <section class="section tight"><div class="wrap">
    <div class="p3-nums" data-m3-stagger="90">
      <div class="p3-wn" data-m3="up"><b data-m3-count="${vids.length}">${vids.length}</b><span>videos</span></div>
      <div class="p3-wn" data-m3="up"><b data-m3-count="${totalH}">${totalH}</b><span>hours</span></div>
      <div class="p3-wn" data-m3="up"><b data-m3-count="${channels}">${channels}</b><span>channels</span></div>
      <div class="p3-wn" data-m3="up"><b data-m3-count="${colls.length}">${colls.length}</b><span>playlists</span></div>
      <div class="p3-wn wide" data-m3="up"><div class="p3-yr">${sparkBars(perYear, { w: 420, h: 70, labels: yrsAsc, c: "#3b82f6" })}</div><span>videos by year, ${yrsAsc[0]} to ${yrsAsc[yrsAsc.length - 1]}</span></div>
    </div>
  </div></section>

  <section class="section tight" id="wMine"><div class="wrap"><div id="mine"></div></div></section>

  <section class="section tight"><div class="wrap">
    ${headH("Categories", "Pick a <span>mood.</span>", "Each category has its own light. Tap one to filter everything below.")}
    <div class="p3-wcats" data-m3-stagger="40">${cats.map((k) => `<button type="button" class="p3-wcat p3-rip" data-wcat="${esc(k)}" data-m3="up" style="--c:${catC(k)}"><b>${esc(catL(k))}</b><span>${vids.filter((v) => v.category === k).length} videos</span><i aria-hidden="true"></i></button>`).join("")}</div>
  </div></section>

  <section class="p3-wall" aria-hidden="true"><div class="p3-plx" data-m3-parallax="-0.1">${pic("p3-watch-wall", "")}</div><div class="wrap"><p class="p3-bebas" data-p3="wipe">${colls.length} playlists</p></div></section>
  <section class="section tight"><div class="wrap">
    ${headH("Playlists", "Shelves you can <span>drag.</span>", "Drag a shelf sideways with the mouse, swipe on touch, or use the arrows.")}
    <div id="shelves">${colls.map((c) => `<section class="p3-shelfw" data-coll="${esc(c.id)}" style="--c:${c.c}"><div class="p3-shelf-h"><div><b>${esc(c.title)}</b><span class="count">${c.ids.length} videos · ${Math.floor(c.mins / 60)}h ${c.mins % 60}m</span></div><div class="row"><button class="btn sm p3-rip" type="button" data-playall="${esc(c.id)}">${ICON.play} Play all</button><button class="btn sm ghost p3-rip" type="button" data-qall="${esc(c.id)}">Queue all</button><button class="icon-btn sm" type="button" data-sh="-1" aria-label="Scroll ${esc(c.title)} left">${chev(-1)}</button><button class="icon-btn sm" type="button" data-sh="1" aria-label="Scroll ${esc(c.title)} right">${chev(1)}</button></div></div>${c.description ? `<p class="muted p3-shelf-d">${esc(c.description)}</p>` : ""}<div class="p3-shelf p3-film" data-ids="${c.ids.join(",")}" data-q="${c.ids.join(",")}"></div></section>`).join("")}</div>
  </div></section>

  <section class="section tight"><div class="wrap">
    ${headH("Voices", "Most featured <span>people.</span>", "Tap a face to see their videos. Use the small link for their full profile.")}
    <div class="p3-feat" id="feat">${featured.slice(0, 18).map(([p, n]) => `<div class="p3-fp" data-m3="up"><button type="button" class="p3-fpb p3-rip" data-fperson="${esc(p.id)}">${face(p, phm, "p3-face lg")}<b>${esc(p.name)}</b><span>${n} video${n === 1 ? "" : "s"}</span></button><button type="button" class="p3-fpl" data-person="${esc(p.id)}">Profile</button></div>`).join("")}</div>
  </div></section>

  <section class="section tight" id="browse"><div class="wrap">
    ${headH("Browse", "Everything, <span>your way.</span>", "Press ? for keyboard shortcuts.")}
    <div class="toolbar p3-wbar" role="search">
      <input class="input search" id="wq" type="search" placeholder="Search titles, channels, people, topics" aria-label="Search videos" aria-keyshortcuts="/">
      <select class="input" id="wp" aria-label="Person"><option value="">Anyone</option>${featured.map(([p]) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select>
      <select class="input" id="wl" aria-label="Level"><option value="">Any level</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
      <select class="input" id="wn" aria-label="Length"><option value="">Any length</option>${Object.entries(LEN).map(([k, v]) => `<option value="${k}">${v[2]}</option>`).join("")}</select>
      <select class="input" id="wy" aria-label="Year"><option value="">Any year</option>${years.map((y) => `<option>${y}</option>`).join("")}</select>
      <select class="input" id="wg" aria-label="Language, detected from the title"><option value="">Any language</option>${langs.map((l) => `<option>${l}</option>`).join("")}</select>
      <select class="input" id="ws" aria-label="Sort"><option value="new">Newest</option><option value="old">Oldest</option><option value="long">Longest</option><option value="short">Shortest</option><option value="az">Title A to Z</option><option value="ch">Channel</option></select>
      <button class="chip" id="wu" type="button" aria-pressed="false">Unwatched only</button>
      <button class="chip" id="wclr" type="button" hidden>Clear all filters</button>
      <span class="count" id="wc" aria-live="polite"></span>
    </div>
    <div class="chips cat-scroll p3-catchips" role="group" aria-label="Category"><button class="chip on" type="button" data-cf="all">All</button>${cats.map((k) => `<button class="chip" type="button" data-cf="${esc(k)}" style="--c:${catC(k)}"><i class="dot-cat" style="background:${catC(k)}"></i>${esc(catL(k))}</button>`).join("")}</div>
    <div class="vgrid p3-grid" id="vg"></div>
    <div class="p3-more"><button class="btn p3-rip" id="more" type="button">Show more</button></div>
  </div></section>

  <div class="p3-prev" id="prev" role="tooltip" aria-hidden="true"></div>
  <aside class="p3-mp" id="mini" aria-label="Mini player" hidden></aside>
  <button class="p3-qbtn p3-rip" type="button" id="qbtn" aria-expanded="false" aria-controls="qpanel">Queue <b id="qn">0</b></button>
  <aside class="p3-qpanel" id="qpanel" aria-label="Your queue" hidden></aside>
  <div class="p3-help" id="help" role="dialog" aria-modal="false" aria-label="Keyboard shortcuts" hidden><div class="card"><div class="row" style="justify-content:space-between"><b>Keyboard shortcuts</b><button class="icon-btn sm" type="button" data-hclose aria-label="Close shortcuts">${ICON.close}</button></div>
    <dl>${[["/", "Search"], ["J and K", "Next and previous video"], ["Enter", "Open the focused video"], ["M", "Play the focused video in the mini player"], ["W", "Watch later on or off"], ["Q", "Add to queue"], ["N", "Next in queue"], ["Esc", "Close the mini player or this panel"], ["?", "Show this panel"]].map(([k, d]) => `<dt><kbd>${k}</kbd></dt><dd>${d}</dd>`).join("")}</dl></div></div>`;

  const offs = [];
  const grid = $("#vg", el);


  /* Filters and paged grid */
  function filtered() {
    const q = S.q.toLowerCase().split(/\s+/).filter(Boolean), w = watched(); const L = LEN[S.len];
    const r = vids.filter((v) => (S.cat === "all" || v.category === S.cat) && (!S.person || v.people.includes(S.person)) && (!S.level || v.level === S.level) && (!S.year || v.year === S.year) && (!S.lang || v.lang === S.lang) && (!L || (v.secs >= L[0] && v.secs < L[1])) && (!S.unwatched || !w.has(v.id))
      && q.every((t) => `${v.title} ${v.channel} ${v.summary} ${catL(v.category)} ${v.people.map((p) => pById[p]?.name || p).join(" ")}`.toLowerCase().includes(t)));
    const k = { new: (a, b) => b.date.localeCompare(a.date), old: (a, b) => a.date.localeCompare(b.date), long: (a, b) => b.secs - a.secs, short: (a, b) => a.secs - b.secs, az: (a, b) => a.title.localeCompare(b.title), ch: (a, b) => a.channel.localeCompare(b.channel) || b.date.localeCompare(a.date) }[S.sort];
    return r.sort(k);
  }
  let cur = [];
  /* Names of the filters that are on, so an empty result can say what is hiding videos */
  const activeF = () => [S.cat !== "all" && catL(S.cat), S.person && (pById[S.person]?.name || S.person), S.level && S.level, S.len && $("#wn", el)?.selectedOptions[0]?.textContent, S.year && S.year, S.lang && $("#wg", el)?.selectedOptions[0]?.textContent, S.unwatched && "unwatched only"].filter(Boolean);
  const clearF = () => { Object.assign(S, { cat: "all", person: "", level: "", len: "", year: "", lang: "", unwatched: false, n: PAGE }); ["#wp", "#wl", "#wn", "#wy", "#wg"].forEach((k) => { const f = $(k, el); if (f) f.value = ""; }); const u = $("#wu", el); if (u) { u.classList.remove("on"); u.setAttribute("aria-pressed", "false"); } $$("[data-cf]", el).forEach((x) => x.classList.toggle("on", x.dataset.cf === "all")); $$(".p3-wcat", el).forEach((x) => x.classList.remove("on")); paint(); };
  el.addEventListener("click", (e) => { if (e.target.closest("[data-wclear], #wclr")) clearF(); });
  function paint(append) {
    if (!append) cur = filtered();
    const w = watched();
    $("#wc", el).textContent = `${cur.length.toLocaleString("en-US")} videos`;
    if (append) { const frag = document.createElement("div"); frag.innerHTML = cur.slice(append, S.n).map((v) => card(v, w)).join(""); const nodes = [...frag.children]; nodes.forEach((n) => { n.classList.add("p3-new"); grid.appendChild(n); }); }
    else grid.innerHTML = cur.length ? cur.slice(0, S.n).map((v) => card(v, w)).join("") : `<div class="empty-state" style="grid-column:1/-1">No videos match${S.q.trim() ? ` "${esc(S.q.trim())}"` : ""}${activeF().length ? ` with ${esc(activeF().join(", "))}` : ""}.${activeF().length ? ` <button class="btn sm primary" type="button" data-wclear>${S.q.trim() ? "Keep the search, clear the filters" : "Clear all filters"}</button>` : ""}</div>`;
    const cb = $("#wclr", el); if (cb) cb.hidden = !activeF().length;
    const m = $("#more", el); m.hidden = cur.length <= S.n; m.textContent = `Show more (${Math.max(0, cur.length - S.n).toLocaleString("en-US")} left)`;
    if (window.ScrollTrigger) requestAnimationFrame(() => window.ScrollTrigger.refresh());
  }
  const more = () => { if (cur.length <= S.n) return; const from = S.n; S.n += PAGE; paint(from); };
  $("#more", el).addEventListener("click", more);
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && !$("#more", el).hidden) more(); }, { rootMargin: "700px 0px" });
  io.observe($("#more", el)); offs.push(() => io.disconnect());
  const set = (k, v) => { S[k] = v; S.n = PAGE; paint(); };
  const fq = debounce((v) => set("q", v), 140);
  $("#wq", el).addEventListener("input", (e) => fq(e.target.value));
  [["#wp", "person"], ["#wl", "level"], ["#wn", "len"], ["#wy", "year"], ["#wg", "lang"], ["#ws", "sort"]].forEach(([s, k]) => $(s, el).addEventListener("change", (e) => set(k, e.target.value)));
  $("#wu", el).addEventListener("click", (e) => { S.unwatched = !S.unwatched; e.currentTarget.classList.toggle("on", S.unwatched); e.currentTarget.setAttribute("aria-pressed", S.unwatched); set("unwatched", S.unwatched); });
  const setCat = (k, scroll) => { $$("[data-cf]", el).forEach((x) => x.classList.toggle("on", x.dataset.cf === k)); $$(".p3-wcat", el).forEach((x) => x.classList.toggle("on", x.dataset.wcat === k)); set("cat", k); if (scroll) scrollToEl($("#browse", el), { block: "start" }); };
  $$("[data-cf]", el).forEach((b) => b.addEventListener("click", () => setCat(S.cat === b.dataset.cf ? "all" : b.dataset.cf)));
  $$(".p3-wcat", el).forEach((b) => b.addEventListener("click", () => setCat(b.dataset.wcat, true)));
  $("#feat", el).addEventListener("click", (e) => { const b = e.target.closest("[data-fperson]"); if (!b) return; $("#wp", el).value = b.dataset.fperson; set("person", b.dataset.fperson); scrollToEl($("#browse", el), { block: "start" }); });

  /* Your rows: continue watching and watch later */
  function mine() {
    const h = hist(), hv = h.map((x) => byId[x.id]).filter(Boolean).slice(0, 14), lv = later().map((id) => byId[id]).filter(Boolean), w = watched();
    const played = new Set(store.get("hist2", []).filter((x) => x.type === "video" && x.played).map((x) => x.id));
    const ago = (t) => { const d = Math.round((Date.now() - t) / 864e5); return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; };
    $("#mine", el).innerHTML = `
      <div class="p3-rowh"><div><div class="eyebrow">Continue watching</div><h3>${hv.length ? "Pick up where you left off" : "Nothing yet"}</h3></div>${hv.length ? `<a class="btn sm ghost" href="#/your-history">Full history</a>` : ""}</div>
      ${hv.length ? `<div class="p3-shelf p3-cont" id="contShelf">${hv.map((v) => { const t = h.find((x) => x.id === v.id).t; return `<div class="p3-cw">${card(v, w)}<span class="p3-cwm">${played.has(v.id) ? "Played" : "Opened"} ${ago(t)}</span></div>`; }).join("")}</div>` : `<p class="muted">Videos you open will show up here, stored only in your browser.</p>`}
      <div class="p3-rowh" style="margin-top:26px"><div><div class="eyebrow">Watch later</div><h3>${lv.length ? `${lv.length} saved` : "Save videos for later"}</h3></div>${lv.length ? `<div class="row"><button class="btn sm p3-rip" type="button" id="laterQ">Queue all</button><button class="btn sm ghost" type="button" id="laterClr">Clear</button></div>` : ""}</div>
      ${lv.length ? `<div class="p3-shelf" id="laterShelf">${lv.map((v) => card(v, w)).join("")}</div>` : `<p class="muted">Tap the clock on any video to keep it here.</p>`}`;
    $$("#contShelf, #laterShelf", el).forEach((s) => offs.push(dragScroll(s)));
    const lq = $("#laterQ", el); if (lq) lq.onclick = () => { store.set("p3queue", [...new Set([...queue(), ...later()])]); qpaint(); refreshActs(); toast("Added to your queue."); };
    const lc = $("#laterClr", el); if (lc) lc.onclick = () => { store.set("p3later", []); mine(); refreshActs(); };
  }

  /* Shelves render when close to the screen */
  const sio = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; const s = e.target; sio.unobserve(s); const w = watched(); s.innerHTML = s.dataset.ids.split(",").map((id) => byId[id] && card(byId[id], w, s.dataset.q)).join(""); offs.push(dragScroll(s)); m3auto(s); }), { rootMargin: "500px 0px" });
  $$("#shelves .p3-shelf", el).forEach((s) => sio.observe(s)); offs.push(() => sio.disconnect());
  $("#shelves", el).addEventListener("click", (e) => {
    const b = e.target.closest("[data-sh]"); if (b) { const s = b.closest(".p3-shelfw").querySelector(".p3-shelf"); s.scrollBy({ left: +b.dataset.sh * s.clientWidth * 0.85, behavior: RM() ? "auto" : "smooth" }); return; }
    const pa = e.target.closest("[data-playall]"); if (pa) { const c = colls.find((x) => x.id === pa.dataset.playall); openVideo(c.ids[0], { queue: c.ids }); return; }
    const qa = e.target.closest("[data-qall]"); if (qa) { const c = colls.find((x) => x.id === qa.dataset.qall); store.set("p3queue", [...new Set([...queue(), ...c.ids])]); qpaint(); refreshActs(); toast(`${c.ids.length} videos added to your queue.`); }
  });

  /* Carousel */
  let si = 0, sT = 0, paused = RM(), visible = true;
  const slidesEl = $$(".p3-slide", el), dotsEl = $$("[data-sl]", el);
  const go = (i) => { si = (i + slidesEl.length) % slidesEl.length; slidesEl.forEach((s, k) => { s.classList.toggle("on", k === si); s.setAttribute("aria-hidden", k !== si); s.inert = k !== si; }); dotsEl.forEach((d, k) => { d.setAttribute("aria-selected", k === si); d.classList.toggle("on", k === si); }); arm(); };
  const arm = () => { clearTimeout(sT); $("#car", el).classList.toggle("paused", paused); if (!paused && visible && slidesEl.length > 1) sT = setTimeout(() => go(si + 1), 7000); };
  $("#cPrev", el).onclick = () => go(si - 1); $("#cNext", el).onclick = () => go(si + 1);
  dotsEl.forEach((d) => (d.onclick = () => go(+d.dataset.sl)));
  $("#cPause", el).onclick = (e) => { paused = !paused; e.currentTarget.setAttribute("aria-pressed", paused); e.currentTarget.textContent = paused ? "Resume slides" : "Pause slides"; arm(); };
  const car = $("#car", el);
  car.addEventListener("pointerenter", () => { clearTimeout(sT); car.classList.add("paused"); }); car.addEventListener("pointerleave", arm);
  car.addEventListener("focusin", () => { clearTimeout(sT); car.classList.add("paused"); }); car.addEventListener("focusout", arm);
  const cio = new IntersectionObserver((es) => { visible = es[0].isIntersecting; arm(); }); cio.observe(car); offs.push(() => { cio.disconnect(); clearTimeout(sT); });
  go(0);

  /* Mini player and queue */
  const mini = $("#mini", el);
  let miniId = "";
  function playMini(id) {
    const v = byId[id]; if (!v) return; miniId = id;
    mini.hidden = false; mini.classList.add("on");
    mini.innerHTML = `<div class="p3-mini-bar"><b>${esc(v.title)}</b><button class="icon-btn sm" type="button" data-mexp aria-label="Open in the theater">${ICON.wide}</button><button class="icon-btn sm" type="button" data-mnext ${queue().filter((x) => x !== id).length ? `aria-label="Next in queue" title="Next in queue"` : `aria-label="Next in queue. The queue is empty" title="Nothing else in the queue yet. Add videos with Add to queue." disabled`}>${chev(1)}</button><button class="icon-btn sm" type="button" data-mclose aria-label="Close mini player">${ICON.close}</button></div><div class="p3-mini-scr"><iframe src="${ytEmbed(v.id)}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    logView("video", v.id, v.title, { sub: v.channel, played: true });
    store.set("p3queue", queue().filter((x) => x !== id)); qpaint(); refreshActs();
  }
  const closeMini = () => { mini.classList.remove("on"); mini.innerHTML = ""; mini.hidden = true; miniId = ""; };
  const nextQ = () => { const q = queue().filter((x) => x !== miniId); if (q.length) playMini(q[0]); else toast("Your queue is empty."); };
  mini.addEventListener("click", (e) => { if (e.target.closest("[data-mclose]")) closeMini(); else if (e.target.closest("[data-mnext]")) nextQ(); else if (e.target.closest("[data-mexp]")) { const id = miniId; closeMini(); openVideo(id, { queue: queue().length ? [id, ...queue()] : null }); } });
  const qpanel = $("#qpanel", el), qbtn = $("#qbtn", el);
  function qpaint() {
    const q = queue().map((id) => byId[id]).filter(Boolean);
    $("#qn", el).textContent = q.length; qbtn.classList.toggle("has", q.length > 0);
    qpanel.innerHTML = `<div class="row" style="justify-content:space-between"><b>Your queue</b><button class="icon-btn sm" type="button" data-qclose aria-label="Close queue">${ICON.close}</button></div>
      ${q.length ? `<ol>${q.map((v, i) => `<li><img src="${ytThumb(v.id)}" alt="" loading="lazy" width="96" height="54"><span>${esc(v.title)}<small>${esc(v.channel)}</small></span><span class="qa"><button type="button" class="icon-btn sm" data-qup="${i}" aria-label="Move up" ${i ? "" : "disabled"}>${chev(-2)}</button><button type="button" class="icon-btn sm" data-qrm="${esc(v.id)}" aria-label="Remove">${ICON.close}</button></span></li>`).join("")}</ol><div class="row"><button class="btn sm primary p3-rip" type="button" data-qplay>${ICON.play} Play in mini player</button><button class="btn sm" type="button" data-qtheater>Open in theater</button><button class="btn sm ghost" type="button" data-qclear>Clear</button></div>` : `<p class="muted">Add videos with the plus button on any card, or queue a whole playlist.</p>`}`;
  }
  qbtn.onclick = () => { const o = qpanel.hidden; qpanel.hidden = !o; qbtn.setAttribute("aria-expanded", o); if (o) qpaint(); };
  qpanel.addEventListener("click", (e) => {
    const q = queue();
    if (e.target.closest("[data-qclose]")) { qpanel.hidden = true; qbtn.setAttribute("aria-expanded", "false"); return; }
    const up = e.target.closest("[data-qup]"); if (up) { const i = +up.dataset.qup; [q[i - 1], q[i]] = [q[i], q[i - 1]]; store.set("p3queue", q); qpaint(); return; }
    const rm = e.target.closest("[data-qrm]"); if (rm) { store.set("p3queue", q.filter((x) => x !== rm.dataset.qrm)); qpaint(); refreshActs(); return; }
    if (e.target.closest("[data-qplay]") && q.length) playMini(q[0]);
    if (e.target.closest("[data-qtheater]") && q.length) openVideo(q[0], { queue: q });
    if (e.target.closest("[data-qclear]")) { store.set("p3queue", []); qpaint(); refreshActs(); }
  });
  const toggleLater = (id) => { const l = later(); const on = l.includes(id); store.set("p3later", on ? l.filter((x) => x !== id) : [id, ...l]); refreshActs(); mine(); toast(on ? "Removed from watch later." : "Saved to watch later."); };
  const addQ = (id) => { const q = queue(); if (q.includes(id)) { toast("Already in your queue."); return; } store.set("p3queue", [...q, id]); qpaint(); refreshActs(); toast("Added to your queue."); };
  el.addEventListener("click", (e) => {
    const l = e.target.closest("[data-later]"); if (l) { e.preventDefault(); toggleLater(l.dataset.later); return; }
    const a = e.target.closest("[data-addq]"); if (a) { e.preventDefault(); addQ(a.dataset.addq); return; }
    const m = e.target.closest("[data-mini]"); if (m) { e.preventDefault(); playMini(m.dataset.mini); return; }
    if (e.target.closest("[data-hclose]")) $("#help", el).hidden = true;
  });

  /* Hover preview: a bigger poster, the summary and people. No iframe, ever. */
  const prev = $("#prev", el); let pvT = 0, pvFor = null;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine) {
    const over = (e) => { const c = e.target.closest(".p3-vc"); if (!c || c === pvFor) return; clearTimeout(pvT); pvFor = c; pvT = setTimeout(() => showPrev(c), 420); };
    const out = (e) => { const c = e.target.closest(".p3-vc"); if (c && !c.contains(e.relatedTarget)) { clearTimeout(pvT); pvFor = null; prev.classList.remove("on"); prev.setAttribute("aria-hidden", "true"); } };
    el.addEventListener("pointerover", over); el.addEventListener("pointerout", out);
    const sc = () => { prev.classList.remove("on"); pvFor = null; }; addEventListener("scroll", sc, { passive: true }); offs.push(() => removeEventListener("scroll", sc));
  }
  function showPrev(c) {
    const v = byId[c.dataset.vid]; if (!v || !c.isConnected) return;
    const r = c.getBoundingClientRect(); const pp = v.people.map((id) => pById[id]).filter(Boolean).slice(0, 4);
    prev.style.setProperty("--c", catC(v.category));
    prev.innerHTML = `<div class="th"><img src="${ytThumb(v.id, "hqdefault")}" alt="" width="480" height="360"><span class="tag" style="--c:${catC(v.category)}">${esc(catL(v.category))}</span></div><div class="bd"><b>${esc(v.title)}</b><span class="count">${esc(v.channel)}${v.duration ? ` · ${esc(fmtDur(v.duration))}` : ""} · ${esc(v.level)} · ${esc(v.lang)}</span>${v.summary ? `<p>${esc(v.summary)}</p>` : ""}${pp.length ? `<div class="pp">${pp.map((p) => `${face(p, phm, "p3-face xs")}<span>${esc(p.name)}</span>`).join("")}</div>` : ""}<small class="muted">Click to open. Playback starts only when you press play.</small></div>`;
    const W = 340, x = Math.min(innerWidth - W - 12, Math.max(12, r.left + r.width / 2 - W / 2)); const above = r.top > 420;
    prev.style.left = x + "px"; prev.style.top = (above ? r.top - 10 : r.bottom + 10) + "px"; prev.classList.toggle("up", above);
    prev.classList.add("on"); prev.setAttribute("aria-hidden", "false");
  }

  /* Keyboard shortcuts */
  const onK = (e) => {
    if (!el.isConnected) return;
    if (/input|select|textarea/i.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey || document.documentElement.classList.contains("ov-open")) { if (e.key === "Escape" && document.activeElement.id === "wq") document.activeElement.blur(); return; }
    const focusCard = document.activeElement.closest && document.activeElement.closest(".p3-vc");
    const id = focusCard && focusCard.dataset.vid;
    const cards = $$("#vg .p3-vc", el);
    switch (e.key) {
      case "/": e.preventDefault(); e.stopPropagation(); $("#wq", el).focus(); break;
      case "?": $("#help", el).hidden = !$("#help", el).hidden; break;
      case "j": case "k": { e.preventDefault(); const i = focusCard ? cards.indexOf(focusCard) : -1; const n = cards[Math.max(0, Math.min(cards.length - 1, i + (e.key === "j" ? 1 : -1)))]; if (n) { $(".p3-vplay", n).focus({ preventScroll: true }); scrollToEl(n, { block: "nearest" }); } break; }
      case "w": if (id) toggleLater(id); break;
      case "q": if (id) addQ(id); break;
      case "m": if (id) playMini(id); break;
      case "n": nextQ(); break;
      case "Escape": if (!$("#help", el).hidden) $("#help", el).hidden = true; else if (miniId) closeMini(); else if (!qpanel.hidden) { qpanel.hidden = true; qbtn.setAttribute("aria-expanded", "false"); } break;
    }
  };
  document.addEventListener("keydown", onK, true); offs.push(() => document.removeEventListener("keydown", onK, true));
  const onH = () => mine(); window.addEventListener("historychange", onH); offs.push(() => window.removeEventListener("historychange", onH));

  function handle(p) {
    if (p[0] === "c" && p[1]) { const s = el.querySelector(`.p3-shelfw[data-coll="${CSS.escape(p[1])}"]`); if (s) { s.classList.add("hl"); setTimeout(() => scrollToEl(s, { block: "center" }), 120); setTimeout(() => s.classList.remove("hl"), 2400); } }
  }
  el._onParams = handle;
  mine(); qpaint(); paint();
  if (params.length) handle(params);
  offs.push(run(el), m3init(el), () => closeMini());
  return () => offs.forEach((f) => { try { f(); } catch (e) {} });

  function slideHtml(s, i) {
    const v = s.v;
    return `<article class="p3-slide ${i ? "" : "on"}" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}" style="--c:${catC(v.category)}">
      <button type="button" class="p3-poster" data-video="${esc(v.id)}" data-queue="${esc(s.c.ids.join(","))}" aria-label="Open ${esc(v.title)}"><img src="${ytThumb(v.id, "hqdefault")}" alt="" width="480" height="360" ${i ? 'loading="lazy"' : ""} onerror="this.style.opacity=0"><span class="pb">${ICON.play}</span><span class="p3-sweep" aria-hidden="true"></span></button>
      <div class="p3-sinfo"><div class="row"><span class="tag" style="--c:${catC(v.category)}">${esc(catL(v.category))}</span><span class="count">From ${esc(s.c.title)}</span></div><h2>${esc(v.title)}</h2><p class="count">${esc(v.channel)}${v.date ? ` · ${esc(fmtDate(v.date))}` : ""}${v.duration ? ` · ${esc(fmtDur(v.duration))}` : ""}</p>${v.summary ? `<p>${esc(v.summary)}</p>` : ""}
      <div class="row"><button class="btn primary p3-rip" type="button" data-video="${esc(v.id)}" data-queue="${esc(s.c.ids.join(","))}">${ICON.play} Open and play</button><button class="btn p3-rip" type="button" data-mini="${esc(v.id)}">${pip()} Mini player</button>${actBtns(v.id)}</div></div>
      <span class="p3-sprog" aria-hidden="true"><i></i></span></article>`;
  }
}

const sv = (d) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const chev = (d) => sv(d === -1 ? '<path d="M15 6l-6 6 6 6"/>' : d === 1 ? '<path d="M9 6l6 6-6 6"/>' : '<path d="M6 15l6-6 6 6"/>');
const clock = () => sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
const plus = () => sv('<path d="M4 6h11M4 12h11M4 18h7M18 15v6M15 18h6"/>');
const pip = () => sv('<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor"/>');
