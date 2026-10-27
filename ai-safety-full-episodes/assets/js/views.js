/* AI Safety Full Episodes v2 · views: home, browse, months, speakers, speaker profile, episode drawer, history, queue, profile, notes, about. */
(function (A) {
  "use strict";
  const { $, $$, esc, STATE, fmtTime, fmtHM, hoursStr, fmtDate, fmtShort, fold, MONTH_LIST, FORMATS, LENGTHS, LEVELS_EP, GROUPS } = A;
  const h = () => A.hist;
  const L = () => A.hist.L;
  const ui = () => A.ui;
  const V = (name) => $(`.view[data-view="${name}"]`);

  const monthLabel = (id) => (MONTH_LIST.find((m) => m.id === id) || MONTH_LIST[0]).long;
  const pool = () => (L().PREFS.month && L().PREFS.month !== "all" ? STATE.all.filter((e) => e.month === L().PREFS.month) : STATE.all);
  function monthStats(list) {
    const secs = list.reduce((a, e) => a + e.dur, 0);
    const sp = new Map();
    list.forEach((e) => e.stars.forEach((p) => sp.set(p.k, (sp.get(p.k) || 0) + 1)));
    const top = Array.from(sp.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => ({ s: STATE.speakers.get(k), n })).filter((x) => x.s);
    return { n: list.length, secs, top, speakers: sp.size, chapters: list.reduce((a, e) => a + e.chapters.length, 0) };
  }
  function monthSwitch(cur, attr) {
    return `<div class="seg seg--month" role="tablist" aria-label="Month">${MONTH_LIST.map((m) => `<button role="tab" data-${attr || "month"}="${m.id}" aria-selected="${cur === m.id}">${m.label}<small>${m.id === "all" ? STATE.all.length : STATE.all.filter((e) => e.month === m.id).length}</small></button>`).join("")}</div>`;
  }

  /* ================================================================ HOME */
  function renderHome() {
    const v = V("home");
    const P0 = pool();
    const ms = monthStats(P0);
    const cont = h().inProgress().filter((e) => P0.includes(e)).slice(0, 12);
    const fol = A.recs.fromFollowed(P0).slice(0, 14);
    const fy = A.recs.forYou(14, P0);
    const because = A.recs.becauseRows(2);
    const shortC = P0.filter((e) => e.dur && e.dur < 2400 && h().stateOf(e.id) !== "done").sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 14);
    const deep = P0.filter((e) => e.dur >= 7200).sort((a, b) => b.dur - a.dur).slice(0, 14);
    const debates = P0.filter((e) => e.fmt === "debate").slice(0, 14);
    const halls = P0.filter((e) => e.fmt === "hearing" || e.fmt === "panel").slice(0, 14);
    const latest = P0.slice(0, 14);
    const top = P0.filter((e) => e.views).sort((a, b) => b.views - a.views).slice(0, 12);
    const first = cont[0] || (fy[0] && fy[0].e);
    const researchers = Array.from(STATE.speakers.values()).filter((s) => s.photo && !s.isHost && s.eps.some((id) => P0.some((e) => e.id === id))).sort((a, b) => b.eps.length - a.eps.length).slice(0, 18);
    v.innerHTML = `
      <div class="hero">
        <div class="hero__bg" aria-hidden="true"><img src="assets/cover.jpg" alt=""></div>
        <div class="hero__in">
          <p class="eyebrow"><span class="dot"></span> Verified against transcripts · compiled Oct 27, 2026 · v2</p>
          <h1>Every verified full-length AI safety episode of <em>July–October 2026</em>, in one player.</h1>
          <p class="lede">Whole podcasts, interviews, debates, talks, panels and hearings, never clips. Pop the player out so it keeps going while the browser is minimised, switch to audio mode, jump by chapter or by claim, follow researchers and level up as you learn.</p>
          <div class="stats">
            <div class="stat"><b data-count="${STATE.all.length}">0</b><span>full episodes</span></div>
            <div class="stat"><b data-count="${Math.round(STATE.all.reduce((a, e) => a + e.dur, 0) / 3600)}">0</b><span>hours</span></div>
            <div class="stat"><b data-count="${Array.from(STATE.speakers.values()).filter((s) => !s.isHost && s.eps.length).length}">0</b><span>researchers & guests</span></div>
            <div class="stat"><b data-count="${STATE.all.reduce((a, e) => a + e.chapters.length, 0)}">0</b><span>chapters</span></div>
            <div class="stat"><b data-count="${STATE.claims.length}">0</b><span>tracked P(doom) & timeline claims</span></div>
          </div>
          <div class="hero__cta">
            ${first ? `<button class="btn btn--primary" data-playid="${first.id}">${ui().ICON.play}<span>${cont[0] ? "Continue watching" : "Start with a top pick"}</span></button>` : ""}
            <a class="btn" href="#/browse">Browse all ${STATE.all.length}</a>
            <a class="btn btn--ghost" href="#/speakers">Meet the researchers</a>
          </div>
        </div>
      </div>
      <section class="monthbar">
        <div class="monthbar__hd"><h2>${esc(monthLabel(L().PREFS.month))}</h2>${monthSwitch(L().PREFS.month)}</div>
        <div class="mstats">
          <div class="mstat"><b>${ms.n}</b><span>episodes</span></div><div class="mstat"><b>${hoursStr(ms.secs)}</b><span>of video</span></div><div class="mstat"><b>${ms.speakers}</b><span>speakers</span></div><div class="mstat"><b>${ms.chapters}</b><span>chapters</span></div>
          <div class="mstat mstat--top"><span>Top speakers</span><div class="topsp">${ms.top.map((x) => `<a href="#/speaker/${x.s.slug}" title="${esc(x.s.name)}: ${x.n} episodes">${ui().avatar(x.s.name, 34)}<small>${esc(x.s.name.split(" ").pop())} · ${x.n}</small></a>`).join("")}</div></div>
        </div>
      </section>
      <section class="panel panel--flat"><div class="panel__hd"><h2>Release calendar</h2><a class="shelf__more" href="#/months">Month by month ${ui().ICON.chev}</a></div>${A.charts.releaseHeatmap({ month: L().PREFS.month !== "all" ? L().PREFS.month : null })}</section>
      ${ui().shelf("Continue watching", cont, { icon: "⏯️", more: "#/history" })}
      ${fol.length ? ui().shelf("New from people you follow", fol, { icon: "⭐", sub: `${L().FOLLOWS.size} followed` }) : `<section class="nudge"><p>${ui().ICON.star}<span><b>Follow researchers</b> to get a "New from people you follow" row and better picks.</span></p><a class="btn btn--sm" href="#/speakers">Pick researchers</a></section>`}
      ${ui().shelf("Recommended for you", fy, { icon: "✨", sub: "Scored on who you follow, what you finish, shared speakers, orgs and topics, and your level", more: "#/browse?sort=foryou" })}
      ${because.map((r) => ui().shelf(`Because you watched <em>${esc(r.seed.title.slice(0, 60))}${r.seed.title.length > 60 ? "…" : ""}</em>`, r.list, { icon: "🔁" })).join("")}
      ${ui().shelf("Short & complete (under 40 min)", shortC, { icon: "⚡", more: "#/browse?len=s" })}
      ${ui().shelf("Deep dives (2 h +)", deep, { icon: "🤿", more: "#/browse?len=xl" })}
      ${ui().shelf("Debates", debates, { icon: "⚔️", more: "#/browse?fmt=debate" })}
      ${ui().shelf("Hearings & panels", halls, { icon: "🏛️" })}
      ${ui().shelf("Most viewed (October counts)", top, { icon: "📈", more: "#/browse?sort=views" })}
      ${ui().shelf("Latest uploads", latest, { icon: "🆕", more: "#/browse" })}
      <section class="shelf"><div class="shelf__hd"><h2><span class="shelf__ic">🎙️</span>Researchers in ${esc(monthLabel(L().PREFS.month))}</h2><span class="grow"></span><a class="shelf__more" href="#/speakers">All speakers ${ui().ICON.chev}</a></div>
        <div class="faces">${researchers.map((s) => `<a class="face" href="#/speaker/${s.slug}">${ui().avatar(s.name, 76, "av--ring")}<b>${esc(s.name)}</b><small>${esc(s.org)}</small></a>`).join("")}</div></section>`;
    v.querySelectorAll("[data-count]").forEach((el) => ui().animateCount(el, Number(el.dataset.count)));
    v.querySelectorAll("[data-month]").forEach((b) => (b.onclick = () => { L().PREFS.month = b.dataset.month; h().savePrefs(); renderHome(); }));
  }

  /* ================================================================ BROWSE */
  let shown = 48;
  let facetsOpen = window.innerWidth > 900;
  function chip(group, id, label, n, on) { return `<button class="chip ${on ? "is-on" : ""}" data-f="${group}" data-v="${esc(id)}" aria-pressed="${on}" ${n === 0 && !on ? "disabled" : ""}>${esc(label)}${n != null ? `<small>${n}</small>` : ""}</button>`; }
  function topOrgs() { const m = new Map(); STATE.all.forEach((e) => e.orgs.forEach((o) => m.set(o, (m.get(o) || 0) + 1))); return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([o]) => o); }
  function topTags() { const m = new Map(); STATE.all.forEach((e) => e.tags.forEach((o) => m.set(o, (m.get(o) || 0) + 1))); return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([o]) => o); }
  function facets() {
    const F = A.recs.F, fc = A.recs.facetCount;
    const stDefs = [["none", "Unwatched"], ["progress", "In progress"], ["done", "Watched"], ["fav", "Favourites"], ["notes", "With notes"], ["queued", "Queued"]];
    const stTest = { none: (e) => h().stateOf(e.id) === "none", progress: (e) => h().stateOf(e.id) === "progress", done: (e) => h().stateOf(e.id) === "done", fav: (e) => L().FAVS.has(e.id), notes: (e) => (L().NOTES[e.id] || []).length > 0, queued: (e) => L().QUEUE.includes(e.id) };
    const researchers = Array.from(STATE.speakers.values()).filter((s) => !s.isHost && s.eps.length).sort((a, b) => b.eps.length - a.eps.length);
    return `
      <div class="fgroup"><h3>Month</h3><div class="chips">${MONTH_LIST.slice(1).map((m) => chip("month", m.id, m.label, fc(F, "month", (e) => e.month === m.id), F.month.has(m.id))).join("")}</div></div>
      <div class="fgroup"><h3>Format</h3><div class="chips">${FORMATS.map((f) => chip("fmt", f.id, f.label, fc(F, "fmt", (e) => e.fmt === f.id), F.fmt.has(f.id))).join("")}</div></div>
      <div class="fgroup"><h3>Length</h3><div class="chips">${LENGTHS.map((l) => chip("len", l.id, l.label, fc(F, "len", (e) => l.test(e.dur)), F.len.has(l.id))).join("")}</div></div>
      <div class="fgroup"><h3>Level</h3><div class="chips">${LEVELS_EP.map((l) => chip("level", l, l, fc(F, "level", (e) => e.level === l), F.level.has(l))).join("")}</div></div>
      <div class="fgroup"><h3>People group</h3><div class="chips">${GROUPS.filter((g) => g.id !== "hosts").map((g) => chip("group", g.id, g.label, fc(F, "group", (e) => e.groups.includes(g.id)), F.group.has(g.id))).join("")}</div></div>
      <div class="fgroup"><h3>Organisation</h3><div class="chips">${topOrgs().map((o) => chip("org", o, o, fc(F, "org", (e) => e.orgs.includes(o) || e.orgsMentioned.includes(o)), F.org.has(o))).join("")}</div></div>
      <div class="fgroup"><h3>Speaker</h3><div class="spk-pick"><input class="input input--sm" list="spkList" id="spkPick" placeholder="Add a speaker…" aria-label="Filter by speaker"><datalist id="spkList">${researchers.map((s) => `<option value="${esc(s.name)}">${s.eps.length} episodes</option>`).join("")}</datalist></div>
        <div class="chips">${Array.from(F.speaker).map((k) => { const s = STATE.speakers.get(k); return s ? `<button class="chip chip--sp is-on" data-f="speaker" data-v="${esc(k)}" aria-pressed="true">${ui().avatar(s.name, 18)}${esc(s.name)} ✕</button>` : ""; }).join("")}${researchers.slice(0, 10).filter((s) => !F.speaker.has(s.k)).map((s) => `<button class="chip chip--sp" data-f="speaker" data-v="${esc(s.k)}" aria-pressed="false">${ui().avatar(s.name, 18)}${esc(s.name.split(" ").pop())}<small>${fc(F, "speaker", (e) => e.people.some((p) => p.k === s.k))}</small></button>`).join("")}</div></div>
      <div class="fgroup"><h3>Your library</h3><div class="chips">${stDefs.map(([id, lab]) => chip("st", id, lab, fc(F, "st", stTest[id]), F.st.has(id))).join("")}<button class="chip ${F.followed ? "is-on" : ""}" data-f="followed" aria-pressed="${F.followed}">⭐ Followed only<small>${L().FOLLOWS.size}</small></button></div></div>
      <div class="fgroup"><h3>Topics</h3><div class="chips">${topTags().map((t) => `<button class="chip ${F.tag === t ? "is-on" : ""}" data-f="tag" data-v="${esc(t)}" aria-pressed="${F.tag === t}">${esc(t)}</button>`).join("")}</div></div>`;
  }
  function activeSummary() {
    const F = A.recs.F; const out = [];
    const add = (lab, g, v) => out.push(`<button class="chip chip--act is-on" data-f="${g}" ${v != null ? `data-v="${esc(v)}"` : ""}>${esc(lab)} ✕</button>`);
    F.month.forEach((m) => add(monthLabel(m), "month", m)); F.fmt.forEach((x) => add(FORMATS.find((f) => f.id === x).label, "fmt", x));
    F.len.forEach((x) => add(LENGTHS.find((l) => l.id === x).label, "len", x)); F.level.forEach((x) => add(x, "level", x));
    F.group.forEach((x) => add(A.groupById(x).label, "group", x)); F.org.forEach((x) => add(x, "org", x));
    F.speaker.forEach((x) => add((STATE.speakers.get(x) || { name: x }).name, "speaker", x)); F.st.forEach((x) => add({ none: "Unwatched", progress: "In progress", done: "Watched", fav: "Favourites", notes: "With notes", queued: "Queued" }[x], "st", x));
    if (F.followed) add("Followed only", "followed"); if (F.day) add(fmtDate(F.day), "day", F.day); if (F.tag) add(F.tag, "tag", F.tag);
    return out.join("");
  }
  function renderBrowse(first) {
    const v = V("browse");
    const F = A.recs.F;
    if (first || !v.querySelector("#q")) {
      v.innerHTML = `
        <header class="phead phead--row"><div><p class="eyebrow">Browse</p><h1>All ${STATE.all.length} full episodes</h1></div>
          <div class="searchbox"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" type="search" placeholder="Fuzzy search titles, speakers, shows, tags, chapters, claims…" aria-label="Search episodes" autocomplete="off"><kbd>/</kbd></div></header>
        <div class="toolbar">
          <button class="btn btn--sm" id="facetToggle" aria-expanded="${facetsOpen}">${ui().ICON.filter}<span>Filters</span><b class="pill" id="fCount" hidden></b></button>
          <div class="activechips" id="activeChips"></div>
          <span class="grow"></span>
          <label class="sel"><span>Sort</span><select id="sortSel">${A.recs.SORTS.map((s) => `<option value="${s.id}">${s.label}</option>`).join("")}</select></label>
          <div class="seg seg--sm" role="group" aria-label="Layout"><button data-layout="grid" aria-pressed="${L().PREFS.layout === "grid"}" aria-label="Grid">${ui().ICON.grid}</button><button data-layout="list" aria-pressed="${L().PREFS.layout === "list"}" aria-label="List">${ui().ICON.list}</button></div>
          <button class="btn btn--sm btn--ghost" id="saveFilter">${ui().ICON.save}<span>Save filter</span></button>
          <button class="btn btn--sm btn--ghost" id="clearFilter">Clear</button>
        </div>
        <div class="saved" id="savedFilters"></div>
        <div class="browse ${facetsOpen ? "is-open" : ""}" id="browseWrap">
          <aside class="facets" id="facets" aria-label="Filters"></aside>
          <div class="results"><div class="results__hd"><p id="resCount" aria-live="polite"></p><button class="linkbtn" id="playResults">${ui().ICON.play} Queue these & play</button></div><div id="resList"></div><div class="more" id="moreWrap"></div></div>
        </div>`;
      const q = $("#q");
      q.value = F.q;
      q.addEventListener("input", A.debounce(() => { F.q = q.value; shown = 48; renderBrowse(); }, 160));
      $("#sortSel").onchange = (ev) => { L().PREFS.sort = ev.target.value; h().savePrefs(); shown = 48; renderBrowse(); };
      $("#facetToggle").onclick = () => { facetsOpen = !facetsOpen; $("#browseWrap").classList.toggle("is-open", facetsOpen); $("#facetToggle").setAttribute("aria-expanded", facetsOpen); };
      v.querySelectorAll("[data-layout]").forEach((b) => (b.onclick = () => { L().PREFS.layout = b.dataset.layout; h().savePrefs(); v.querySelectorAll("[data-layout]").forEach((x) => x.setAttribute("aria-pressed", x === b)); renderBrowse(); }));
      $("#saveFilter").onclick = saveFilter;
      $("#clearFilter").onclick = () => { A.recs.setFilter(A.recs.emptyFilter()); $("#q").value = ""; shown = 48; renderBrowse(); };
      $("#playResults").onclick = () => { const list = A.recs.results(F, curSort()).filter((e) => h().stateOf(e.id) !== "done").slice(0, 25); if (!list.length) return; h().setQueue(list.slice(1).map((e) => e.id).concat(L().QUEUE)); paintQueueCount(); A.player.play(list[0].id); ui().toast(`Playing 1 of ${list.length}; ${list.length - 1} queued`, { icon: "▶️" }); };
      v.addEventListener("click", onFacetClick);
      v.addEventListener("change", (ev) => { if (ev.target.id === "spkPick") pickSpeaker(ev.target); });
    }
    $("#sortSel").value = curSort();
    $("#facets").innerHTML = facets();
    $("#activeChips").innerHTML = activeSummary();
    const n = A.recs.activeCount();
    $("#fCount").hidden = !n; $("#fCount").textContent = n;
    paintSaved();
    const list = A.recs.results(F, curSort());
    const secs = list.reduce((a, e) => a + e.dur, 0);
    $("#resCount").innerHTML = `<b>${list.length}</b> episode${list.length === 1 ? "" : "s"} · ${hoursStr(secs)}${F.q ? ` for “${esc(F.q)}”` : ""}`;
    const isList = L().PREFS.layout === "list";
    const slice = list.slice(0, shown);
    $("#resList").innerHTML = list.length ? `<div class="${isList ? "lgrid" : "grid"}">${slice.map((e) => ui().card(e, { list: isList, q: F.q, snippet: isList ? snippet(e, F.q) : "" })).join("")}</div>`
      : `<div class="emptybig"><p>No episodes match.</p><button class="btn btn--sm" id="clr2">Clear filters</button></div>`;
    const c2 = $("#clr2"); if (c2) c2.onclick = () => $("#clearFilter").click();
    $("#moreWrap").innerHTML = list.length > shown ? `<button class="btn" id="moreBtn">Show ${Math.min(48, list.length - shown)} more (${list.length - shown} left)</button>` : "";
    const mb = $("#moreBtn"); if (mb) { mb.onclick = () => { shown += 48; renderBrowse(); }; if ("IntersectionObserver" in window) { const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); shown += 48; renderBrowse(); } }, { rootMargin: "400px" }); io.observe(mb); } }
  }
  function curSort() { const F = A.recs.F; return L().PREFS.sort === "best" && !F.q ? "newest" : (F.q && L().PREFS.sort === "newest" ? "best" : L().PREFS.sort || "newest"); }
  function snippet(e, q) {
    if (!q) return esc(e.summary.slice(0, 180)) + (e.summary.length > 180 ? "…" : "");
    const qf = fold(q).split(/\s+/)[0];
    const pools = e.chapters.map((c) => ({ t: c.t, s: c.title + (c.detail ? " — " + c.detail : "") })).concat(e.claims.map((c) => ({ t: c.t, s: c.text })));
    const hit = pools.find((x) => fold(x.s).includes(qf));
    if (hit) return `${hit.t != null ? `<button class="tbtn" data-jump="${e.id}|${hit.t}">▶ ${fmtTime(hit.t)}</button> ` : ""}${ui().hl(hit.s.slice(0, 200), q)}`;
    return ui().hl(e.summary.slice(0, 180), q) + "…";
  }
  function onFacetClick(ev) {
    const b = ev.target.closest("[data-f]");
    if (!b || !ev.currentTarget.contains(b)) return;
    const F = A.recs.F, g = b.dataset.f, val = b.dataset.v;
    if (g === "followed") F.followed = !F.followed;
    else if (g === "day") F.day = null;
    else if (g === "tag") F.tag = F.tag === val ? null : val;
    else { F[g].has(val) ? F[g].delete(val) : F[g].add(val); }
    shown = 48;
    renderBrowse();
  }
  function pickSpeaker(inp) {
    const s = Array.from(STATE.speakers.values()).find((x) => fold(x.name) === fold(inp.value));
    if (s) { A.recs.F.speaker.add(s.k); inp.value = ""; renderBrowse(); }
  }
  function saveFilter() {
    if (!A.recs.activeCount() && !A.recs.F.q) { ui().toast("Pick some filters first", { ms: 1500 }); return; }
    const name = (window.prompt ? window.prompt("Name this filter", A.recs.F.q || "My filter") : "My filter") || "";
    if (!name.trim()) return;
    L().SAVED = L().SAVED.filter((x) => x.name !== name.trim()).concat([{ name: name.trim(), f: A.recs.filterToJSON(A.recs.F), sort: curSort() }]).slice(-12);
    A.store.set("savedFilters:v2", L().SAVED);
    paintSaved(); ui().toast(`Saved “${esc(name.trim())}”`, { icon: "💾" });
  }
  function paintSaved() {
    const el = $("#savedFilters"); if (!el) return;
    el.innerHTML = L().SAVED.length ? `<span class="muted">Saved:</span>${L().SAVED.map((s, i) => `<span class="savedf"><button class="chip" data-saved="${i}">${esc(s.name)}</button><button class="savedf__x" data-unsave="${i}" aria-label="Delete saved filter ${esc(s.name)}">✕</button></span>`).join("")}` : "";
    el.onclick = (ev) => {
      const a = ev.target.closest("[data-saved]"), d = ev.target.closest("[data-unsave]");
      if (a) { const s = L().SAVED[+a.dataset.saved]; A.recs.setFilter(A.recs.filterFromJSON(s.f)); L().PREFS.sort = s.sort || "newest"; $("#q").value = A.recs.F.q || ""; shown = 48; renderBrowse(); }
      if (d) { L().SAVED.splice(+d.dataset.unsave, 1); A.store.set("savedFilters:v2", L().SAVED); paintSaved(); }
    };
  }
  function applyQuery(qs) {
    if (!qs) return;
    const p = new URLSearchParams(qs);
    const nf = A.recs.emptyFilter();
    ["month", "fmt", "len", "level", "org", "group", "st"].forEach((k) => p.getAll(k).forEach((v) => nf[k].add(v)));
    p.getAll("speaker").forEach((v) => { const s = STATE.bySlug.get(v) || STATE.speakers.get(fold(v)); if (s) nf.speaker.add(s.k); });
    if (p.get("day")) nf.day = p.get("day");
    if (p.get("tag")) nf.tag = p.get("tag");
    if (p.get("q")) nf.q = p.get("q");
    if (p.get("followed")) nf.followed = true;
    if (p.get("sort")) L().PREFS.sort = p.get("sort");
    A.recs.setFilter(nf);
    shown = 48;
  }

  /* ================================================================ MONTHS */
  function renderMonths() {
    const v = V("months");
    const cur = L().PREFS.month || "all";
    const cards = MONTH_LIST.slice(1).map((m) => {
      const list = STATE.all.filter((e) => e.month === m.id);
      const st = monthStats(list);
      const longest = list.slice().sort((a, b) => b.dur - a.dur)[0];
      const fm = FORMATS.map((f) => ({ f, n: list.filter((e) => e.fmt === f.id).length })).filter((x) => x.n);
      const watched = list.filter((e) => h().stateOf(e.id) === "done").length;
      return `<article class="mcard ${cur === m.id ? "is-sel" : ""}">
        <header><h2>${m.long}</h2><a class="btn btn--sm" href="#/browse?month=${m.id}">Browse ${st.n}</a></header>
        <div class="mcard__k"><span><b>${st.n}</b> episodes</span><span><b>${hoursStr(st.secs)}</b> video</span><span><b>${st.speakers}</b> speakers</span><span><b>${watched}</b>/${st.n} watched</span></div>
        <div class="mcard__bar"><i style="width:${st.n ? (100 * watched / st.n).toFixed(1) : 0}%"></i></div>
        <p class="mcard__fm">${fm.map((x) => `<a class="tag" href="#/browse?month=${m.id}&fmt=${x.f.id}">${esc(x.f.label)} · ${x.n}</a>`).join("")}</p>
        <div class="topsp">${st.top.map((x) => `<a href="#/speaker/${x.s.slug}" title="${esc(x.s.name)}">${ui().avatar(x.s.name, 38)}<small>${esc(x.s.name.split(" ").pop())} · ${x.n}</small></a>`).join("")}</div>
        ${longest ? `<p class="mcard__long">Longest: <button class="linkbtn" data-open="${longest.id}">${esc(longest.title.slice(0, 70))}</button> (${esc(longest.durStr)})</p>` : ""}
      </article>`;
    }).join("");
    v.innerHTML = `<header class="phead"><p class="eyebrow">Months</p><h1>July to October 2026, month by month</h1><p class="lede">${STATE.all.length} episodes over ${STATE.days.size} release days. Click any day or month to filter the library.</p></header>
      <section class="panel panel--flat"><div class="panel__hd"><h2>Episodes released per day</h2></div>${A.charts.releaseHeatmap({ month: cur !== "all" ? cur : null })}</section>
      <div class="mcards">${cards}</div>
      <section class="panel panel--flat"><div class="panel__hd"><h2>Your watch activity</h2><a class="shelf__more" href="#/insights">Insights ${ui().ICON.chev}</a></div>${A.charts.watchHeatmap()}</section>`;
  }

  /* ================================================================ SPEAKERS */
  const SP = { q: "", group: "all", sort: "eps", hosts: false };
  function renderSpeakers() {
    const v = V("speakers");
    const all = Array.from(STATE.speakers.values()).filter((s) => s.eps.length);
    const res = all.filter((s) => !s.isHost);
    const hosts = all.filter((s) => s.isHost);
    let list = res.filter((s) => (SP.group === "all" || (SP.group === "followed" ? L().FOLLOWS.has(s.k) : s.group === SP.group)) && (!SP.q || fold(s.name + " " + s.org + " " + s.bio).includes(fold(SP.q))));
    const watchedOf = (s) => s.eps.filter((id) => h().stateOf(id) === "done").length;
    list.sort({ eps: (a, b) => b.eps.length - a.eps.length || b.secs - a.secs, hours: (a, b) => b.secs - a.secs, name: (a, b) => a.name.split(" ").pop().localeCompare(b.name.split(" ").pop()), watched: (a, b) => watchedOf(b) - watchedOf(a) || b.eps.length - a.eps.length }[SP.sort]);
    const featured = list.filter((s) => s.roster || s.photo);
    const rest = list.filter((s) => !(s.roster || s.photo));
    v.innerHTML = `<header class="phead phead--row"><div><p class="eyebrow">Speakers</p><h1>${res.length} researchers & guests, ${hosts.length} hosts</h1><p class="lede">Researchers are the stars here. Follow the people you trust: their new episodes get their own row and boost your recommendations.</p></div>
      <div class="searchbox"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="spQ" type="search" placeholder="Find a researcher or org" value="${esc(SP.q)}" aria-label="Find a speaker"></div></header>
      <div class="toolbar"><div class="chips">${[["all", "Everyone"], ["followed", `⭐ Following (${L().FOLLOWS.size})`]].concat(GROUPS.filter((g) => g.id !== "hosts").map((g) => [g.id, g.label])).map(([id, lab]) => `<button class="chip ${SP.group === id ? "is-on" : ""}" data-spg="${id}">${esc(lab)}</button>`).join("")}</div><span class="grow"></span>
        <label class="sel"><span>Sort</span><select id="spSort"><option value="eps">Most episodes</option><option value="hours">Most hours</option><option value="watched">Most watched by you</option><option value="name">Surname A–Z</option></select></label></div>
      <div class="sgrid">${featured.map(ui().speakerCard).join("") || `<p class="empty">No one matches.</p>`}</div>
      ${rest.length ? `<h2 class="subh">More voices <small>${rest.length}</small></h2><div class="sgrid sgrid--compact">${rest.map(ui().speakerCard).join("")}</div>` : ""}
      <details class="hosts" ${SP.hosts ? "open" : ""}><summary><h2 class="subh">Hosts & interviewers <small>${hosts.length}</small></h2></summary>
        <div class="hostlist">${hosts.sort((a, b) => b.eps.length - a.eps.length).map((s) => `<a class="hostchip" href="#/speaker/${s.slug}">${ui().avatar(s.name, 30)}<span><b>${esc(s.name)}</b><small>Host · ${s.eps.length} ep${s.eps.length === 1 ? "" : "s"}</small></span></a>`).join("")}</div></details>`;
    $("#spSort").value = SP.sort;
    const q = $("#spQ");
    q.oninput = A.debounce(() => { SP.q = q.value; renderSpeakers(); const n = $("#spQ"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 200);
    $("#spSort").onchange = (ev) => { SP.sort = ev.target.value; renderSpeakers(); };
    v.querySelectorAll("[data-spg]").forEach((b) => (b.onclick = () => { SP.group = b.dataset.spg; renderSpeakers(); }));
    v.querySelector("details.hosts").ontoggle = (ev) => (SP.hosts = ev.target.open);
  }

  let spSort = "newest";
  function renderSpeaker(slugv) {
    const v = V("speaker");
    const s = STATE.bySlug.get(slugv);
    if (!s) { v.innerHTML = `<div class="emptybig"><p>Speaker not found.</p><a class="btn" href="#/speakers">All speakers</a></div>`; return; }
    const eps = s.eps.map((id) => STATE.byId.get(id)).filter(Boolean);
    const sorted = eps.slice().sort({ newest: (a, b) => (b.date || "").localeCompare(a.date || ""), oldest: (a, b) => (a.date || "").localeCompare(b.date || ""), longest: (a, b) => b.dur - a.dur, views: (a, b) => (b.views || -1) - (a.views || -1), unwatched: (a, b) => (h().stateOf(a.id) === "done") - (h().stateOf(b.id) === "done") || (b.date || "").localeCompare(a.date || "") }[spSort]);
    const watched = eps.filter((e) => h().stateOf(e.id) === "done").length;
    const fol = L().FOLLOWS.has(s.k);
    const nums = [];
    eps.forEach((e) => {
      e.numbers.forEach((n) => { if (fold(n.speaker).startsWith(fold(s.name)) || (!n.speaker && e.stars.length === 1 && e.stars[0].k === s.k)) nums.push({ e, t: n.t, text: n.text, kind: A.classifyClaim(n.text) }); });
    });
    STATE.claims.filter((c) => c.k === s.k && c.src === "claim").forEach((c) => { const e = STATE.byId.get(c.id); if (!nums.some((n) => n.e.id === c.id && n.t === c.t)) nums.push({ e, t: c.t, text: c.text, kind: c.kind }); });
    nums.sort((a, b) => (a.kind ? 0 : 1) - (b.kind ? 0 : 1) || (b.e.date || "").localeCompare(a.e.date || ""));
    const co = new Map(); eps.forEach((e) => e.stars.forEach((p) => { if (p.k !== s.k) co.set(p.k, (co.get(p.k) || 0) + 1); }));
    const coList = Array.from(co.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => ({ s: STATE.speakers.get(k), n })).filter((x) => x.s);
    const g = A.groupById(s.group);
    const dates = eps.map((e) => e.date).sort();
    const claimsCount = eps.reduce((a, e) => a + e.claims.filter((c) => fold(c.speaker) === s.k).length, 0);
    v.innerHTML = `
      <a class="back" href="#/speakers">← All speakers</a>
      <header class="sprof" style="--g:${g.color}">
        <div class="sprof__ph">${ui().avatar(s.name, 168, "av--ring")}</div>
        <div class="sprof__tx">
          <p class="eyebrow">${s.isHost ? "Host" : esc(g.label)}</p>
          <h1>${esc(s.name)}</h1>
          <p class="sprof__org">${esc(s.org || "")}</p>
          <p class="sprof__bio">${esc(s.bio || "")}</p>
          <div class="sprof__k"><span><b>${eps.length}</b> episodes</span><span><b>${hoursStr(s.secs)}</b> total</span><span><b>${watched}</b>/${eps.length} watched</span><span><b>${claimsCount}</b> quoted claims</span>${dates.length ? `<span>${esc(fmtShort(dates[0]))} → ${esc(fmtShort(dates[dates.length - 1]))}</span>` : ""}</div>
          <div class="sprof__act">
            <button class="btn btn--primary" id="playAll">${ui().ICON.play}<span>Play all (${eps.filter((e) => h().stateOf(e.id) !== "done").length || eps.length})</span></button>
            <button class="follow follow--lg ${fol ? "is-on" : ""}" data-follow="${esc(s.k)}" aria-pressed="${fol}">${fol ? ui().ICON.check + "Following" : ui().ICON.plus + "Follow"}</button>
            <a class="btn btn--ghost" href="#/browse?speaker=${esc(s.slug)}">Filter library</a>
          </div>
        </div>
      </header>
      ${nums.length ? `<section class="panel"><div class="panel__hd"><h2>Their numbers</h2><span class="muted">P(doom), timelines and other figures they state, linked to the moment</span></div><ul class="nums">${nums.slice(0, 40).map((n) => `<li>${n.kind ? `<span class="ktag ktag--${n.kind === "Timeline" ? "t" : "p"}">${esc(n.kind)}</span>` : `<span class="ktag">Figure</span>`}<p>${esc(n.text)}</p><span class="nums__ep"><button class="linkbtn" data-open="${n.e.id}">${esc(n.e.title.slice(0, 48))}…</button>${n.t != null ? `<button class="tbtn" data-jump="${n.e.id}|${n.t}">▶ ${fmtTime(n.t)}</button>` : ""}</span></li>`).join("")}</ul></section>` : ""}
      <section class="panel panel--flat"><div class="panel__hd"><h2>Episodes</h2><label class="sel"><span>Sort</span><select id="spEpSort"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="longest">Longest</option><option value="views">Most viewed</option><option value="unwatched">Unwatched first</option></select></label></div>
        <div class="lgrid">${sorted.map((e) => ui().card(e, { list: true })).join("")}</div></section>
      ${coList.length ? `<section class="panel panel--flat"><div class="panel__hd"><h2>Often appears with</h2></div><div class="faces">${coList.map((x) => `<a class="face" href="#/speaker/${x.s.slug}">${ui().avatar(x.s.name, 64, "av--ring")}<b>${esc(x.s.name)}</b><small>${x.n} together</small></a>`).join("")}</div></section>` : ""}`;
    $("#spEpSort").value = spSort;
    $("#spEpSort").onchange = (ev) => { spSort = ev.target.value; renderSpeaker(slugv); };
    $("#playAll").onclick = () => {
      const order = eps.slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")).filter((e) => h().stateOf(e.id) !== "done");
      const list = order.length ? order : eps;
      h().setQueue(list.slice(1).map((e) => e.id).concat(L().QUEUE.filter((id) => !list.some((e) => e.id === id))));
      paintQueueCount();
      A.player.play(list[0].id);
      ui().toast(`Playing all ${list.length} from ${esc(s.name)}; the rest are in your queue`, { icon: "▶️" });
    };
  }

  /* ================================================================ EPISODE DRAWER */
  let drawerId = null, lastFocus = null;
  function openDrawer(id) {
    const e = STATE.byId.get(id); if (!e) return;
    drawerId = id;
    lastFocus = document.activeElement;
    const r = L().H.eps[id];
    const st = h().stateOf(id);
    const fav = L().FAVS.has(id), q = L().QUEUE.includes(id);
    const notes = (L().NOTES[id] || []).slice().sort((a, b) => a.t - b.t);
    const isCur = A.P.cur && A.P.cur.id === id;
    const sim = A.recs.suggestions(e, 6);
    $("#drawerBody").innerHTML = `
      <div class="dr__hero"><button class="thumb" data-act="play" data-id="${id}">${ui().thumbImg(e, true)}<span class="thumb__play">${ui().ICON.play}</span><span class="thumb__dur">${esc(e.durStr)}</span>${st !== "none" ? `<span class="thumb__bar"><i style="width:${Math.round(h().pctOf(id) * 100)}%"></i></span>` : ""}</button></div>
      <div class="dr__in" data-id="${id}">
        <p class="eyebrow">${esc(FORMATS.find((f) => f.id === e.fmt).label)} · ${esc(monthLabel(e.month))}${e.verified ? " · verified full episode" : ""}</p>
        <h2 id="drawerTitle">${esc(e.title)}</h2>
        <p class="th__meta"><span>${esc(fmtDate(e.date, e.approx))}</span><span>${esc(e.durStr)}</span><span>${esc(ui().showLine(e))}</span><span class="lvl lvl--${A.slug(e.level)}" title="${e.levelEst ? "Estimated from length and format" : "Editor-assigned level"}">${esc(e.level)}${e.levelEst ? " (est.)" : ""}</span>${e.views ? `<span>${ui().fmtViews(e.views)} views</span>` : ""}</p>
        <div class="dr__act">
          <button class="btn btn--primary" data-act="play">${ui().ICON.play}<span>${st === "progress" && r ? `Resume at ${fmtTime(r.pos)}` : st === "done" ? "Watch again" : "Play"}</span></button>
          <button class="btn" data-act="queue">${q ? ui().ICON.queued : ui().ICON.queue}<span>${q ? "Queued" : "Queue"}</span></button>
          <button class="btn" data-act="fav">${fav ? ui().ICON.heartF : ui().ICON.heart}<span>${fav ? "Favourited" : "Favourite"}</span></button>
          <button class="btn btn--ghost" data-dr="link">${ui().ICON.link}<span>${isCur ? "Copy link at current time" : "Copy link"}</span></button>
          <button class="btn btn--ghost" data-dr="share">${ui().ICON.share}<span>Share</span></button>
          <a class="btn btn--ghost" href="${esc(e.url)}" target="_blank" rel="noopener">${ui().ICON.yt}<span>YouTube</span></a>
        </div>
        ${st !== "none" && r ? `<p class="dr__hist">${ui().ICON.clock} You've watched <b>${fmtHM(r.watched)}</b> (${Math.round((r.pct || 0) * 100)}% covered)${r.done ? " · completed " + A.fmtStamp(r.doneAt) : ""} · last ${A.fmtStamp(r.last)}</p>` : ""}
        ${e.whyWatch ? `<p class="th__why"><b>Why watch:</b> ${esc(e.whyWatch)}</p>` : ""}
        <p class="dr__sum">${esc(e.summary)}</p>
        <h3 class="dr__h">Speakers</h3>
        <div class="th__people">${e.people.map((p) => `<a class="person ${p.host ? "person--host" : ""}" href="#/speaker/${esc(p.slug)}">${ui().avatar(p.name, 40)}<span><b>${esc(p.name)}</b><small>${p.host ? "Host" : esc((ui().speakerOf(p.name) || {}).org || p.desc || "")}</small></span></a>`).join("")}</div>
        <h3 class="dr__h">Chapter report <small>${e.chapters.length} chapters</small></h3>
        ${e.chapters.length ? `<ol class="chaps chaps--report">${e.chapters.map((c) => `<li><button class="chap" ${c.t == null ? "disabled" : `data-jump="${id}|${c.t}"`}><span class="chap__t">${c.t == null ? "·" : fmtTime(c.t)}</span><span class="chap__tx"><b>${esc(c.title)}</b>${c.detail ? `<small>${esc(c.detail)}</small>` : ""}</span></button></li>`).join("")}</ol>` : `<p class="empty">No timestamped chapters.</p>`}
        ${e.topics.length ? `<ul class="topics">${e.topics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        ${e.claims.length ? `<h3 class="dr__h">Key claims</h3><ul class="claims">${e.claims.map((c) => `<li class="claim"><button class="claim__t" ${c.t == null ? "disabled" : `data-jump="${id}|${c.t}"`}>${c.t == null ? "·" : fmtTime(c.t)}</button><div><p>${esc(c.text)}</p>${c.speaker ? `<small>${esc(c.speaker)}</small>` : ""}</div></li>`).join("")}</ul>` : ""}
        ${e.numbers.length ? `<h3 class="dr__h">Numbers</h3><ul class="claims">${e.numbers.map((c) => `<li class="claim claim--num"><button class="claim__t" ${c.t == null ? "disabled" : `data-jump="${id}|${c.t}"`}>${c.t == null ? "·" : fmtTime(c.t)}</button><div><p><span class="numtag">#</span>${esc(c.text)}</p>${c.speaker ? `<small>${esc(c.speaker)}</small>` : ""}</div></li>`).join("")}</ul>` : ""}
        ${e.peopleMentioned.length || e.orgsMentioned.length ? `<h3 class="dr__h">Mentioned</h3><p class="tags">${e.peopleMentioned.map((p) => `<a class="tag tag--p" href="#/browse?tag=${encodeURIComponent(p)}">${esc(p)}</a>`).join("")}${e.orgsMentioned.map((o) => `<a class="tag tag--o" href="#/browse?org=${encodeURIComponent(o)}">${esc(o)}</a>`).join("")}</p>` : ""}
        ${e.tags.length ? `<h3 class="dr__h">Tags</h3><p class="tags">${e.tags.map((t) => `<a class="tag" href="#/browse?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</p>` : ""}
        <h3 class="dr__h">Your notes <small>${notes.length}</small></h3>
        ${notes.length ? `<ul class="notes">${notes.map((n) => `<li class="note"><button class="claim__t" data-jump="${id}|${n.t}">${fmtTime(n.t)}</button><p>${esc(n.text)}</p><button class="iconbtn iconbtn--sm" data-delnote="${n.id}" aria-label="Delete note">${ui().ICON.trash}</button></li>`).join("")}</ul>` : ""}
        <form class="noteform" id="drNote"><textarea rows="2" placeholder="${isCur ? `Note at ${fmtTime(A.player.curTime())}` : "Note at 0:00 (start the episode to stamp the current moment)"}" aria-label="New note"></textarea><button class="btn btn--sm">Add note</button></form>
        ${e.evidence ? `<details class="dr__ev"><summary>Evidence & verification</summary><p>${esc(e.evidence)}</p><p class="muted">Channel: ${esc(e.channel)}${e.subs ? ` · ${esc(String(e.subs))} subscribers` : ""} · ID ${esc(e.id)}</p></details>` : ""}
        ${sim.length ? `<h3 class="dr__h">More like this</h3><div class="minis">${sim.map((x) => `<button class="mini" data-swap="${x.e.id}">${ui().thumbImg(x.e)}<span><b>${esc(x.e.title)}</b><small>${esc(x.why)}</small></span></button>`).join("")}</div>` : ""}
      </div>`;
    $("#drawer").hidden = false; $("#scrim").hidden = false;
    document.body.classList.add("lock-drawer");
    $("#drawer").scrollTop = 0;
    setTimeout(() => $("#drawer [data-close]").focus(), 30);
    $("#drNote").onsubmit = (ev) => { ev.preventDefault(); const ta = ev.target.querySelector("textarea"); const tx = ta.value.trim(); if (!tx) return; h().addNote(id, isCur ? A.player.curTime() : 0, tx); openDrawer(id); };
  }
  function closeDrawer() {
    $("#drawer").hidden = true; $("#scrim").hidden = true; drawerId = null;
    document.body.classList.remove("lock-drawer");
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }
  function linkFor(id, t) { const base = location.href.split("#")[0]; return `${base}#ep=${id}${t ? `&t=${Math.floor(t)}` : ""}`; }
  async function copyLinkAt(id, t) { const ok = await ui().copy(linkFor(id, t)); ui().toast(ok ? `Link copied${t ? ` at ${fmtTime(t)}` : ""}` : "Could not copy the link", { icon: "🔗" }); }
  async function share(id, t) {
    const e = STATE.byId.get(id); const url = linkFor(id, t);
    if (navigator.share) { try { await navigator.share({ title: e.title, text: `${e.title} · ${ui().whoLine(e)}`, url }); return; } catch (x) { if (x && x.name === "AbortError") return; } }
    copyLinkAt(id, t);
  }

  /* ================================================================ HISTORY */
  let histDay = null;
  function renderHistory() {
    const v = V("history");
    const H = L().H;
    const rows = [];
    STATE.all.forEach((e) => { const r = H.eps[e.id]; if (r && (r.watched >= 20 || r.done)) (r.sessions || []).forEach((s) => { if (s.w >= 15) rows.push({ e, s, r }); }); });
    rows.sort((a, b) => b.s.e - a.s.e);
    const byDay = new Map();
    rows.forEach((x) => { const k = A.dayKey(x.s.s); if (histDay && k !== histDay) return; if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(x); });
    const tot = h().totalWatched();
    const mig = A.migration && A.migration.from === 1 ? `<p class="mignote">✓ Your v1 history, notes, favourites, queue and badges were carried over to v2 (${A.migration.moved.join(", ")}).</p>` : "";
    v.innerHTML = `<header class="phead phead--row"><div><p class="eyebrow">History</p><h1>Watch history</h1><p class="lede">${fmtHM(tot)} actually played across ${Object.values(H.eps).filter((r) => r.watched >= 20).length} episodes · ${h().doneCount()} completed (90%+ really played).</p>${mig}</div>
      <div class="row-gap"><button class="btn btn--sm" id="hExport">Export backup</button><label class="btn btn--sm btn--ghost">Import<input type="file" id="hImport" accept="application/json" hidden></label><button class="btn btn--sm btn--danger" id="hClear">Clear all</button></div></header>
      <section class="panel panel--flat"><div class="panel__hd"><h2>Your watch activity</h2>${histDay ? `<button class="chip is-on" id="hDayClr">${esc(fmtDate(histDay))} ✕</button>` : `<span class="muted">Click a day to see just that day</span>`}</div>${A.charts.watchHeatmap({ day: histDay })}</section>
      ${byDay.size ? Array.from(byDay.entries()).map(([k, list]) => `<section class="hday"><h2>${esc(fmtDate(k))} <small>${fmtHM(list.reduce((a, x) => a + x.s.w, 0))}</small></h2>
        <ul class="hlist">${list.map((x) => `<li class="hrow" data-id="${x.e.id}"><button class="thumb thumb--sm" data-act="play">${ui().thumbImg(x.e)}<span class="thumb__bar"><i style="width:${Math.round((x.r.pct || 0) * 100)}%"></i></span></button>
          <div class="hrow__tx"><button class="card__title" data-act="open">${esc(x.e.title)}</button><p class="card__meta"><span>${new Date(x.s.s).toTimeString().slice(0, 5)}</span><span>${fmtHM(x.s.w)} watched</span><span>${fmtTime(x.s.a)} → ${fmtTime(x.s.b)}</span><span>${Math.round((x.r.pct || 0) * 100)}% covered</span>${x.r.done ? `<span class="ok">✓ completed</span>` : ""}</p></div>
          <button class="iconbtn iconbtn--sm" data-clear="${x.e.id}" aria-label="Remove from history">${ui().ICON.trash}</button></li>`).join("")}</ul></section>`).join("") : `<div class="emptybig"><p>${histDay ? "Nothing watched that day." : "Nothing yet. Press play on anything and it shows up here, strictly counted."}</p></div>`}`;
    $("#hExport").onclick = () => { const blob = new Blob([JSON.stringify(h().exportAll(), null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `ai-safety-episodes-backup-${A.dayKey(Date.now())}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
    $("#hImport").onchange = async (ev) => { const f = ev.target.files[0]; if (!f) return; try { h().importAll(JSON.parse(await f.text())); ui().toast("Backup restored", { icon: "✅" }); A.app.rerender(); } catch (x) { ui().toast("That file is not a valid backup: " + esc(x.message), { icon: "⚠️" }); } };
    $("#hClear").onclick = async () => { if (await ui().confirmBox("Clear <b>all</b> watch history, notes, favourites, queue, follows and badges? Export a backup first if unsure.", "Clear everything", true)) { h().resetAll(); A.app.rerender(); } };
    const dc = $("#hDayClr"); if (dc) dc.onclick = () => { histDay = null; renderHistory(); };
    v.onclick = async (ev) => {
      const c = ev.target.closest("[data-clear]");
      if (c) { if (await ui().confirmBox("Remove this episode from your history?", "Remove", true)) { h().clearOne(c.dataset.clear); renderHistory(); h().checkAwards(true); } return; }
      const d = ev.target.closest('[data-hm="watch"] [data-hmday]');
      if (d) { histDay = histDay === d.dataset.hmday ? null : d.dataset.hmday; renderHistory(); }
    };
  }

  /* ================================================================ QUEUE */
  function paintQueueCount() { const c = $("#queueCount"); if (!c) return; c.hidden = !L().QUEUE.length; c.textContent = L().QUEUE.length; }
  function renderQueue() {
    const v = V("queue");
    const list = L().QUEUE.map((id) => STATE.byId.get(id)).filter(Boolean);
    const secs = list.reduce((a, e) => a + Math.max(0, e.dur - (h().pctOf(e.id) * e.dur)), 0);
    v.innerHTML = `<header class="phead phead--row"><div><p class="eyebrow">Queue</p><h1>Up next: ${list.length} episode${list.length === 1 ? "" : "s"}</h1><p class="lede">${fmtHM(secs)} left to watch. Drag to reorder; the queue always plays before recommendations.</p></div>
      <div class="row-gap">${list.length ? `<button class="btn btn--primary btn--sm" id="qPlay">${ui().ICON.play}<span>Play queue</span></button><button class="btn btn--sm" id="qShuffle">${ui().ICON.shuffle}<span>Shuffle</span></button><button class="btn btn--sm btn--ghost" id="qClear">Clear</button>` : ""}</div></header>
      ${list.length ? `<ol class="qlist" id="qList">${list.map((e, i) => `<li class="qrow" draggable="true" data-id="${e.id}" data-i="${i}"><span class="qrow__grip" aria-hidden="true">⋮⋮</span><span class="qrow__n">${i + 1}</span><button class="thumb thumb--sm" data-act="play">${ui().thumbImg(e)}</button><div class="hrow__tx"><button class="card__title" data-act="open">${esc(e.title)}</button><p class="card__meta"><span>${esc(ui().whoLine(e, 2))}</span><span>${esc(e.durStr)}</span></p></div>
        <div class="qrow__act"><button class="iconbtn iconbtn--sm" data-mv="-1" aria-label="Move up">↑</button><button class="iconbtn iconbtn--sm" data-mv="1" aria-label="Move down">↓</button><button class="iconbtn iconbtn--sm" data-act="queue" aria-label="Remove from queue">✕</button></div></li>`).join("")}</ol>`
        : `<div class="emptybig"><p>Your queue is empty.</p><p class="muted">Add episodes with the ${ui().ICON.queue} button, or use “Play all” on a speaker page.</p><a class="btn" href="#/browse">Browse</a></div>`}
      ${ui().shelf("Suggested for your queue", A.recs.forYou(12).filter((x) => !L().QUEUE.includes(x.e.id)), { icon: "✨" })}`;
    if (!list.length) return;
    $("#qPlay").onclick = () => A.player.play(L().QUEUE[0]);
    $("#qShuffle").onclick = () => { const q = L().QUEUE.slice(); for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; } h().setQueue(q); renderQueue(); };
    $("#qClear").onclick = async () => { if (await ui().confirmBox("Clear the queue?", "Clear", true)) { h().setQueue([]); paintQueueCount(); renderQueue(); } };
    const ol = $("#qList");
    ol.onclick = (ev) => { const b = ev.target.closest("[data-mv]"); if (!b) return; const li = b.closest("[data-i]"); const i = +li.dataset.i, j = i + Number(b.dataset.mv); const q = L().QUEUE.slice(); if (j < 0 || j >= q.length) return; [q[i], q[j]] = [q[j], q[i]]; h().setQueue(q); renderQueue(); };
    let dragI = null;
    ol.addEventListener("dragstart", (ev) => { const li = ev.target.closest("[data-i]"); if (!li) return; dragI = +li.dataset.i; li.classList.add("is-drag"); ev.dataTransfer.effectAllowed = "move"; });
    ol.addEventListener("dragover", (ev) => { ev.preventDefault(); });
    ol.addEventListener("drop", (ev) => { ev.preventDefault(); const li = ev.target.closest("[data-i]"); if (!li || dragI == null) return; const to = +li.dataset.i; const q = L().QUEUE.slice(); const [x] = q.splice(dragI, 1); q.splice(to, 0, x); h().setQueue(q); dragI = null; renderQueue(); });
  }

  /* ================================================================ PROFILE */
  function renderProfile() {
    const v = V("profile");
    const Lv = h().levelInfo(h().xp());
    const st = h().streaks();
    const earned = h().BADGES.filter((b) => L().EARNED[b.id]).length;
    const nm = L().PREFS.name || "Listener";
    const fav = Array.from(L().FAVS).map((id) => STATE.byId.get(id)).filter(Boolean);
    const theme = (document.documentElement.getAttribute("data-theme-pref") || "system");
    v.innerHTML = `<header class="phead"><p class="eyebrow">Profile</p><h1>Your progress</h1></header>
      <section class="pcard">
        <div class="pcard__ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="pr__bg"/><circle cx="60" cy="60" r="52" class="pr__fg" stroke-dasharray="${(326.7 * Lv.frac).toFixed(1)} 326.7" transform="rotate(-90 60 60)"/></svg><b>${Lv.n}</b><small>of ${Lv.max}</small></div>
        <div class="pcard__tx">
          <label class="pcard__name"><input id="pName" value="${esc(nm)}" maxlength="40" aria-label="Your display name"> <span class="muted">✎</span></label>
          <h2>${esc(Lv.title)}</h2>
          <p>${Lv.xp} XP${Lv.next ? ` · ${Lv.need} XP to <b>${esc(Lv.next)}</b>` : " · top level"}</p>
          <div class="xpbar"><i style="width:${(Lv.frac * 100).toFixed(1)}%"></i></div>
          <div class="pcard__k"><span><b>${hoursStr(h().totalWatched())}</b> watched</span><span><b>${h().doneCount()}</b> completed</span><span><b>${st.cur}</b>-day streak</span><span><b>${earned}</b>/${h().BADGES.length} badges</span><span><b>${L().FOLLOWS.size}</b> following</span><span><b>${h().noteCount()}</b> notes</span></div>
        </div>
      </section>
      <section class="panel panel--flat"><div class="panel__hd"><h2>How XP works</h2></div><p class="muted">1 XP per minute actually played · 50 per completed episode · 5 per note · 30 per badge · 2 per chapter jump (up to 200) · 5 per followed researcher.</p></section>
      <h2 class="subh">Badges <small>${earned}/${h().BADGES.length}</small></h2>
      <div class="badges">${h().BADGES.map((b) => { const [c, t] = b.prog(); const got = !!L().EARNED[b.id]; return `<div class="badge ${got ? "is-got" : ""}"><span class="badge__ic">${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small><div class="badge__bar"><i style="width:${Math.min(100, (100 * c) / t).toFixed(0)}%"></i></div><em>${got ? "Earned " + esc(A.fmtStamp(L().EARNED[b.id])) : `${Math.floor(c)}/${t}`}</em></div>`; }).join("")}</div>
      ${ui().shelf("Favourites", fav, { icon: "❤️" })}
      <section class="panel panel--flat"><div class="panel__hd"><h2>Settings</h2></div>
        <div class="settings"><label class="switch"><input type="checkbox" id="sAuto" ${L().SETTINGS.autoplay ? "checked" : ""}><span></span>Autoplay next episode (10 s countdown)</label>
        <div class="seg seg--sm" role="group" aria-label="Theme">${["dark", "light", "system"].map((t) => `<button data-theme-set="${t}" aria-pressed="${theme === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>
        <button class="btn btn--sm" onclick="location.hash='#/history'">Backup & restore</button></div></section>`;
    $("#pName").onchange = (ev) => { L().PREFS.name = ev.target.value.trim().slice(0, 40); h().savePrefs(); };
    $("#sAuto").onchange = (ev) => { L().SETTINGS.autoplay = ev.target.checked; A.store.set("settings:v2", L().SETTINGS); };
    v.querySelectorAll("[data-theme-set]").forEach((b) => (b.onclick = () => { A.app.setTheme(b.dataset.themeSet); renderProfile(); }));
  }

  /* ================================================================ NOTES */
  let notesQ = "";
  function renderNotes() {
    const v = V("notes");
    const ids = Object.keys(L().NOTES).filter((id) => STATE.byId.has(id) && (L().NOTES[id] || []).length);
    const groups = ids.map((id) => ({ e: STATE.byId.get(id), list: L().NOTES[id].filter((n) => !notesQ || fold(n.text).includes(fold(notesQ))).sort((a, b) => a.t - b.t) })).filter((g) => g.list.length).sort((a, b) => Math.max(...b.list.map((n) => n.at)) - Math.max(...a.list.map((n) => n.at)));
    v.innerHTML = `<header class="phead phead--row"><div><p class="eyebrow">Notes</p><h1>${h().noteCount()} timestamped notes</h1><p class="lede">Press <kbd>N</kbd> while watching to capture the moment. Click a timestamp to jump back to it.</p></div>
      <div class="row-gap"><input class="input input--sm" id="nQ" placeholder="Search notes" value="${esc(notesQ)}" aria-label="Search notes"><button class="btn btn--sm" id="nExport">Export Markdown</button></div></header>
      ${groups.length ? groups.map((g) => `<section class="ngroup" data-id="${g.e.id}"><header><button class="thumb thumb--sm" data-act="play">${ui().thumbImg(g.e)}</button><div><button class="card__title" data-act="open">${esc(g.e.title)}</button><p class="card__meta"><span>${esc(ui().whoLine(g.e, 2))}</span><span>${esc(g.e.durStr)}</span></p></div></header>
        <ul class="notes">${g.list.map((n) => `<li class="note"><button class="claim__t" data-jump="${g.e.id}|${n.t}">${fmtTime(n.t)}</button><p>${esc(n.text)}</p><small class="muted">${esc(A.fmtStamp(n.at))}</small><button class="iconbtn iconbtn--sm" data-delnote2="${g.e.id}|${n.id}" aria-label="Delete note">${ui().ICON.trash}</button></li>`).join("")}</ul></section>`).join("")
        : `<div class="emptybig"><p>${notesQ ? "No notes match." : "No notes yet."}</p></div>`}`;
    const q = $("#nQ"); q.oninput = A.debounce(() => { notesQ = q.value; renderNotes(); const n = $("#nQ"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 200);
    $("#nExport").onclick = () => {
      const md = ["# My notes · AI Safety Full Episodes", ""].concat(groups.flatMap((g) => [`## ${g.e.title}`, `${g.e.url}`, ""].concat(g.list.map((n) => `- [${fmtTime(n.t)}](${g.e.url}&t=${n.t}s) ${n.text}`), [""]))).join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" })); a.download = "ai-safety-notes.md"; a.click();
    };
    v.onclick = (ev) => { const d = ev.target.closest("[data-delnote2]"); if (d) { const [id, nid] = d.dataset.delnote2.split("|"); h().delNote(id, nid); renderNotes(); } };
  }

  /* ================================================================ ABOUT */
  function renderAbout() {
    const v = V("about");
    const per = MONTH_LIST.slice(1).map((m) => { const l = STATE.all.filter((e) => e.month === m.id); return `<tr><td>${m.long}</td><td>${l.length}</td><td>${hoursStr(l.reduce((a, e) => a + e.dur, 0))}</td><td>${l.reduce((a, e) => a + e.chapters.length, 0)}</td></tr>`; }).join("");
    const photos = Array.from(STATE.speakers.values()).filter((s) => s.eps.length);
    const curated = photos.filter((s) => s.photo).length;
    v.innerHTML = `<header class="phead"><p class="eyebrow">About & method</p><h1>How this library is built</h1></header>
      <div class="prose">
        <p><b>Verified full episodes only.</b> Every item is a complete podcast, interview, debate, talk, panel or hearing in which the named researcher actually speaks. Each was checked against its transcript, description or chapters; there is one copy per event and no clips, compilations or reaction videos.</p>
        <p><b>Coverage:</b> uploads from July 1 to October 27, 2026. <b>Compiled:</b> October 27, 2026. Dates follow the YouTube upload date (US Pacific); a ~ marks an estimate.</p>
        <table class="ctable ctable--sm"><thead><tr><th>Month</th><th>Episodes</th><th>Hours</th><th>Chapters</th></tr></thead><tbody>${per}<tr><td><b>Total</b></td><td><b>${STATE.all.length}</b></td><td><b>${hoursStr(STATE.all.reduce((a, e) => a + e.dur, 0))}</b></td><td><b>${STATE.all.reduce((a, e) => a + e.chapters.length, 0)}</b></td></tr></tbody></table>
        <p><b>Data integrity:</b> ${STATE.rawCount} records loaded, de-duplicated by YouTube ID to ${STATE.all.length} (${STATE.dupes} duplicate${STATE.dupes === 1 ? "" : "s"} dropped). Loaded from ${STATE.loadedFrom === "inline" ? "the inline fallback copy (offline / file://)" : "data/episodes.json"}${STATE.manifestFiles ? ` plus ${STATE.manifestFiles} daily file(s)` : ""}. October records carry hand-written chapters, quotes, numbers, tags and levels; July–September chapters and claims are parsed from their timestamped topic lists, and their levels and tags are estimated (marked “est.”).</p>
        <p><b>Daily additions:</b> drop a JSON file (same shape as <code>episodes.json</code>) into <code>data/daily/</code> and list it in <code>data/manifest.json</code> (<code>{"files":["daily/2026-10-28.json"]}</code>). The app merges listed files after the main file on every load; a later copy of the same ID replaces the earlier one.</p>
        <p><b>Speaker photos:</b> ${curated} people have a curated portrait or channel avatar; everyone else is shown with a circular crop of the thumbnail from their best solo episode. Hosts and interviewers are labelled “Host”; researchers are the stars.</p>
        <p><b>Claims tracker:</b> ${STATE.claims.length} statements about P(doom) and timelines, matched by keyword from the quotes and numbers and attributed only when the speaker is a named non-host researcher. Treat it as a navigation aid and check the moment itself.</p>
        <p><b>Privacy:</b> watch history, notes, favourites, follows, queue, badges and settings live only in this browser's localStorage (keys start with <code>asfe:</code>). Nothing is sent anywhere. Video plays through YouTube's privacy-enhanced embed (youtube-nocookie.com); YouTube's own terms apply to playback. Export a backup from History.</p>
        <p><b>Keeps playing when minimised:</b> the app never pauses on tab switches. Chrome and Edge 116+ can pop the player into an always-on-top window (Document Picture-in-Picture). Elsewhere, audio mode plus background playback does the job; some mobile browsers still pause embedded video in the background, which a web page cannot override.</p>
        <p>Built by <b>Aniruddha Adak</b>. Source and README: <a href="https://github.com/lo3elyon/ASI/tree/main/ai-safety-full-episodes" target="_blank" rel="noopener">github.com/lo3elyon/ASI</a>.</p>
      </div>`;
  }

  /* ================================================================ shared */
  function refreshCardsFor(id) {
    $$(`[data-id="${A.cssEsc(id)}"]`).forEach((el) => {
      if (el.classList.contains("card") || el.classList.contains("lrow")) {
        const e = STATE.byId.get(id); if (!e) return;
        const wasList = el.classList.contains("lrow");
        const why = el.querySelector(".card__why span");
        const tmp = document.createElement("div");
        tmp.innerHTML = ui().card(e, { list: wasList, why: why ? why.textContent : "" });
        el.replaceWith(tmp.firstElementChild);
      }
    });
    if (drawerId === id && !$("#drawer").hidden) { const sc = $("#drawer").scrollTop; openDrawer(id); $("#drawer").scrollTop = sc; }
  }
  function onNowPlaying() { /* hook for future */ }

  A.views = { renderHome, renderBrowse, renderMonths, renderSpeakers, renderSpeaker, renderHistory, renderQueue, renderProfile, renderNotes, renderAbout, openDrawer, closeDrawer, copyLinkAt, share, linkFor, refreshCardsFor, paintQueueCount, applyQuery, onNowPlaying, drawerOpen: () => drawerId };
})(window.ASFE);
