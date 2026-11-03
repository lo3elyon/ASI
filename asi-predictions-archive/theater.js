/* Media Theater: library, curated rows and recommendations around one ArchivePlayer.
   Selecting a video only loads its poster and details; nothing plays until Play is pressed. */
(function () {
  "use strict";
  var host = document.getElementById("theater");
  if (!host || !window.ArchivePlayer) return;
  var AP = window.ArchivePlayer;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var num = function (n) { return Number(n).toLocaleString("en-US"); };
  var read = function (id) { try { return Hark.data(id) || []; } catch (e) { return []; } };

  var V = read("d-videos"), PEOPLE = read("d-people"), ENTRIES = read("d-entries");
  var people = {}; PEOPLE.forEach(function (p) { people[p.id] = p; });
  var isNeuro = function (p) { return p && (p.neuro === true || p.neuro === "True" || p.neuro === "true"); };

  var picks = {}, entryOf = {};
  ENTRIES.forEach(function (e) { if (e.youtube_id) { picks[e.youtube_id] = 1; entryOf[e.youtube_id] = e.id; } });

  var ERA = { a: "≤2011", b: "2012–2022", c: "2023+", u: "Undated" };
  var byId = {}, kinds = {};
  V.forEach(function (v) {
    if (v.d === "None" || v.d == null) v.d = "";
    v.p = Array.isArray(v.p) ? v.p : [];
    var y = AP.year(v.d);
    v.era = !y ? "u" : y <= 2011 ? "a" : y <= 2022 ? "b" : "c";
    v.names = v.p.map(function (id) { return people[id] ? people[id].name : ""; }).filter(Boolean);
    v.pick = !!picks[v.id];
    v.neuro = v.p.some(function (id) { return isNeuro(people[id]); });
    v.hay = [v.t, v.c, v.names.join(" "), v.s].join(" ").toLowerCase();
    byId[v.id] = v;
    if (v.k) kinds[v.k] = (kinds[v.k] || 0) + 1;
  });
  if (AP.library) AP.library(V);
  var newest = function (a, b) { return (b.d || "").localeCompare(a.d || "") || 0; };
  var oldest = function (a, b) { return (a.d ? 0 : 1) - (b.d ? 0 : 1) || (a.d || "").localeCompare(b.d || ""); };
  var newestDatedFirst = function (a, b) { return (a.d ? 0 : 1) - (b.d ? 0 : 1) || newest(a, b); };

  /* ---------- markup ---------- */
  var KINDS = Object.keys(kinds).sort(function (a, b) { return kinds[b] - kinds[a]; });
  var chip = function (attr, val, label) { return '<button class="x-f" type="button" aria-pressed="false" ' + attr + '="' + esc(val) + '">' + esc(label).replace(/ (\d+)$/, ' <span class="x-n">$1</span>') + "</button>"; };
  var withVideos = {}; V.forEach(function (v) { v.p.forEach(function (id) { withVideos[id] = 1; }); });
  var names = PEOPLE.filter(function (p) { return withVideos[p.id]; }).sort(function (a, b) { return a.name.localeCompare(b.name); });

  host.innerHTML =
    '<div class="x-tt">' +
      '<div class="x-tt__top" id="ttTop">' +
        '<div id="ttPlayer"></div>' +
        '<aside class="x-tt__side" aria-label="Recommended"><h3>Recommended next</h3><div class="x-tt__recs" id="ttRecs"></div></aside>' +
      "</div>" +
      '<div id="ttRows" class="x-tt"></div>' +
      '<div class="x-tt__lib" id="library">' +
        '<div class="x-tt__rowh"><h3>The full library</h3><small id="ttTotal"></small></div>' +
        '<div class="x-tools" role="search">' +
          '<div class="x-row">' +
            '<input class="x-input" id="ttQ" type="search" placeholder="Search titles, channels, people, summaries…" aria-label="Search the video library" autocomplete="off" />' +
            '<select class="x-sel" id="ttSort" aria-label="Sort videos"><option value="new">Newest</option><option value="old">Oldest</option></select>' +
          "</div>" +
          '<div class="x-row"><span class="x-row__lab">Show</span>' + chip("data-tf", "picks", "Archive picks") + chip("data-tf", "neuro", "🧠 Neuroscience") +
            '<span class="x-row__lab">Era</span>' + Object.keys(ERA).map(function (k) { return chip("data-tera", k, ERA[k]); }).join("") + "</div>" +
          '<div class="x-row"><span class="x-row__lab">Kind</span>' + KINDS.map(function (k) { return chip("data-tkind", k, k + " " + kinds[k]); }).join("") + "</div>" +
          '<div class="x-row">' +
            '<input class="x-input x-tt__person" id="ttPerson" list="ttPeople" placeholder="Filter by person…" aria-label="Filter by person" autocomplete="off" />' +
            '<datalist id="ttPeople">' + names.map(function (p) { return '<option value="' + esc(p.name) + '"></option>'; }).join("") + "</datalist>" +
            '<span id="ttPersonChip"></span>' +
            '<span class="x-count" id="ttCount" aria-live="polite"></span>' +
          "</div>" +
        "</div>" +
        '<div class="x-tt__grid" id="ttGrid"></div>' +
        '<div class="x-tt__more"><button class="btn" type="button" id="ttMore">Show more</button></div>' +
      "</div>" +
    "</div>";
  var $ = function (id) { return document.getElementById(id); };
  $("ttTotal").textContent = num(V.length) + " talks · tap a card to load it, then press Play";

  var LISTS = {};
  var thumb = function (v) {
    var pr = AP.progress(v.id), len = v.len ? '<span class="x-th__len">' + esc(v.len) + "</span>" : "";
    var secs = v.len ? String(v.len).split(":").reduce(function (a, b) { return a * 60 + (+b || 0); }, 0) : 0;
    return '<span class="x-th__thumb"><img src="' + AP.thumb(v.id) + '" alt="" width="320" height="180" loading="lazy" decoding="async" />' + len + (v.k ? '<span class="x-th__kind" data-k="' + esc(v.k) + '">' + esc(v.k) + "</span>" : "") +
      (pr.watched ? '<span class="x-th__done">✓ Watched</span>' : "") +
      (!pr.watched && pr.pos && secs ? '<span class="x-th__bar" style="width:' + Math.min(100, (pr.pos / secs) * 100).toFixed(1) + '%"></span>' : "") + "</span>";
  };
  var sub = function (v) { return [v.names.slice(0, 2).join(", ") || v.c, AP.fmtDate(v.d)].filter(Boolean).join(" · "); };
  var card = function (v, list) {
    return '<button class="x-vc" type="button" data-tv="' + esc(v.id) + '" data-list="' + list + '">' + thumb(v) + "<span><b>" + esc(v.t) + "</b><small>" + esc(sub(v)) + "</small></span></button>";
  };

  /* ---------- curated rows ---------- */
  var ROWS = [
    { key: "picks", title: "Start here: the classics", note: "Talks the archive entries cite", list: V.filter(function (v) { return v.pick; }).sort(oldest), see: "picks" },
    { key: "neuro", title: "Neuroscientists on AI", note: "Brain scientists on minds and machines", list: V.filter(function (v) { return v.neuro; }).sort(newestDatedFirst).slice(0, 20), see: "neuro" },
    { key: "debate", title: "Debates", note: kinds.debate ? num(kinds.debate) + " debates" : "", list: V.filter(function (v) { return v.k === "debate"; }).sort(newestDatedFirst).slice(0, 20), see: "debate" },
    { key: "recent", title: "Recently added", note: "The newest talks in the library", list: V.filter(function (v) { return v.d; }).sort(newest).slice(0, 20), see: "recent" }
  ];
  $("ttRows").innerHTML = ROWS.filter(function (r) { return r.list.length; }).map(function (r) {
    LISTS["row-" + r.key] = r.list;
    return '<div class="x-tt__row"><div class="x-tt__rowh"><h3>' + esc(r.title) + "</h3>" +
      '<button class="btn" type="button" data-see="' + r.see + '" aria-label="See all: ' + esc(r.title) + '">See all</button></div>' +
      '<div class="x-tt__strip" role="list">' + r.list.map(function (v) { return '<div role="listitem">' + card(v, "row-" + r.key) + "</div>"; }).join("") + "</div>" +
      (r.note ? '<p class="fineprint">' + esc(r.note) + "</p>" : "") + "</div>";
  }).join("");

  /* ---------- library ---------- */
  var F = { terms: [], kinds: new Set(), eras: new Set(), picks: false, neuro: false, person: null, sort: "new" };
  var filtered = [], shown = 0, BATCH = 48, grid = $("ttGrid"), more = $("ttMore");
  var match = function (v) {
    if (F.picks && !v.pick) return false;
    if (F.neuro && !v.neuro) return false;
    if (F.kinds.size && !F.kinds.has(v.k)) return false;
    if (F.eras.size && !F.eras.has(v.era)) return false;
    if (F.person && v.p.indexOf(F.person) < 0) return false;
    for (var i = 0; i < F.terms.length; i++) if (v.hay.indexOf(F.terms[i]) < 0) return false;
    return true;
  };
  var renderMore = function () {
    var end = Math.min(filtered.length, shown + BATCH), h = "";
    for (; shown < end; shown++) h += card(filtered[shown], "grid");
    grid.insertAdjacentHTML("beforeend", h);
    more.parentNode.hidden = shown >= filtered.length;
    more.textContent = "Show more (" + num(filtered.length - shown) + " left)";
    markCurrent();
  };
  var syncChips = function () {
    host.querySelectorAll("[data-tf]").forEach(function (b) { b.setAttribute("aria-pressed", !!F[b.dataset.tf]); });
    host.querySelectorAll("[data-tkind]").forEach(function (b) { b.setAttribute("aria-pressed", F.kinds.has(b.dataset.tkind)); });
    host.querySelectorAll("[data-tera]").forEach(function (b) { b.setAttribute("aria-pressed", F.eras.has(b.dataset.tera)); });
    $("ttPersonChip").innerHTML = F.person ? '<button class="x-f" type="button" aria-pressed="true" id="ttPersonClear">' + esc(people[F.person] ? people[F.person].name : F.person) + " ✕</button>" : "";
  };
  var apply = function () {
    filtered = V.filter(match).sort(F.sort === "new" ? newestDatedFirst : oldest);
    LISTS.grid = filtered;
    grid.innerHTML = ""; shown = 0;
    $("ttCount").textContent = num(filtered.length) + " of " + num(V.length) + " talks";
    syncChips();
    if (!filtered.length) { grid.innerHTML = '<div class="x-empty" style="grid-column: 1 / -1"><p>No talks match these filters.</p><button class="btn" type="button" id="ttReset">Clear all filters</button></div>'; more.parentNode.hidden = true; }
    else renderMore();
  };
  var reset = function () { F.terms = []; $("ttQ").value = ""; F.kinds.clear(); F.eras.clear(); F.picks = F.neuro = false; F.person = null; $("ttPerson").value = ""; };
  more.addEventListener("click", renderMore);
  /* The library grows only on a Show more click; no observer or timer appends cards. */

  var tmr;
  $("ttQ").addEventListener("input", function () {
    clearTimeout(tmr);
    var el = this;
    tmr = setTimeout(function () { var q = el.value.trim().toLowerCase(); F.terms = q ? q.split(/\s+/) : []; apply(); }, 120);
  });
  $("ttSort").addEventListener("change", function () { F.sort = this.value; apply(); });
  var pickPerson = function () {
    var val = $("ttPerson").value.trim().toLowerCase(); if (!val) return;
    var hit = names.filter(function (p) { return p.name.toLowerCase() === val; })[0];
    if (hit) { F.person = hit.id; $("ttPerson").value = ""; apply(); }
  };
  $("ttPerson").addEventListener("input", pickPerson);
  $("ttPerson").addEventListener("change", pickPerson);
  $("ttPerson").addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    var val = this.value.trim().toLowerCase(); if (!val) return;
    var hit = names.filter(function (p) { return p.name.toLowerCase().indexOf(val) >= 0; })[0];
    if (hit) { F.person = hit.id; this.value = ""; apply(); }
  });

  /* ---------- player and recommendations ---------- */
  var player = AP.create($("ttPlayer"), {
    people: people,
    onChange: function (v) { renderRecs(v); markCurrent(); syncEntry(v); },
    onTheater: function (on) { $("ttTop").classList.toggle("is-wide", on); }
  });
  player.actions.insertAdjacentHTML("beforeend", '<button class="btn" type="button" id="ttEntry" hidden>Go to entry</button>');
  var entryFor = function (id) {
    if (entryOf[id]) return entryOf[id];
    var s = window.ArchiveSite; return s && s.entryForVideo ? s.entryForVideo(id) : null;
  };
  var syncEntry = function (v) { var b = $("ttEntry"), e = entryFor(v.id); b.hidden = !e; b.dataset.go = e || ""; };
  $("ttEntry").addEventListener("click", function () { var s = window.ArchiveSite; if (s && s.gotoEntry && this.dataset.go) s.gotoEntry(this.dataset.go); });

  var renderRecs = function (v) {
    var out = [], seen = {}; seen[v.id] = 1;
    var add = function (list, why) { list.forEach(function (x) { if (out.length < 8 && !seen[x.id]) { seen[x.id] = 1; out.push({ v: x, why: why }); } }); };
    if (v.p && v.p.length) add(V.filter(function (x) { return x.p.some(function (id) { return v.p.indexOf(id) >= 0; }); }).sort(newestDatedFirst), "Same person");
    if (v.k) add(V.filter(function (x) { return x.k === v.k; }).sort(newestDatedFirst), "Same kind");
    if (v.era) add(V.filter(function (x) { return x.era === v.era; }).sort(newestDatedFirst), "Same era");
    LISTS.recs = [v].concat(out.map(function (r) { return r.v; }));
    $("ttRecs").innerHTML = out.length ? out.map(function (r) {
      return '<button class="x-tt__rec" type="button" data-tv="' + esc(r.v.id) + '" data-list="recs">' + thumb(r.v) +
        '<span><span class="x-tt__why">' + r.why + "</span><b>" + esc(r.v.t) + "</b><small>" + esc(sub(r.v)) + "</small></span></button>";
    }).join("") : '<p class="fineprint" style="padding: 8px">No related talks yet.</p>';
  };
  var markCurrent = function () {
    var c = player.current(); if (!c) return;
    host.querySelectorAll(".x-vc[data-tv]").forEach(function (b) { b.setAttribute("aria-current", b.dataset.tv === c.id); });
  };

  var fallback = function (id, title) { return byId[id] || (byId[id] = { id: id, t: title || "YouTube video", c: "", d: "", len: "", k: "", p: [], s: "", names: [], era: "u", hay: "" }); };
  /* Run fn, then keep window.scrollY where it was for ~800ms (focus moves, player mounts and the dock placeholder
     can all scroll late). Any wheel, touch or key from the reader ends the hold at once. */
  var holdScroll = function (fn) {
    var x = window.scrollX, y = window.scrollY, until = Date.now() + 800, stop = false;
    var quit = function () { stop = true; ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (t) { window.removeEventListener(t, quit, true); }); };
    ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (t) { window.addEventListener(t, quit, { capture: true, passive: true }); });
    var put = function () {
      if (stop || document.documentElement.classList.contains("x-modal-open")) return;
      if (Math.abs(window.scrollY - y) > 1 || Math.abs(window.scrollX - x) > 1) { try { window.scrollTo({ left: x, top: y, behavior: "instant" }); } catch (e) { window.scrollTo(x, y); } }
    };
    var tick = function () { put(); if (!stop && Date.now() < until) requestAnimationFrame(tick); else if (!stop) quit(); };
    try { if (AP.keepScroll) AP.keepScroll(fn); else fn(); } finally { put(); requestAnimationFrame(tick); }
  };
  var select = function (id, o) {
    o = o || {};
    var v = fallback(id, o.title);
    var q = o.queue && o.queue.indexOf(v) >= 0 ? o.queue : null;
    /* A card picked while the Theater player is off-screen opens in the pop-out window; the page stays put. */
    if (o.card && AP.popout && !player.inView()) { holdScroll(function () { AP.popout(v, { queue: q }); }); return; }
    /* Loads the poster only; the page never moves and nothing plays until Play is pressed. */
    AP.keepScroll(function () { player.load(v, q ? { queue: q, index: q.indexOf(v) } : null); });
  };

  host.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-tv],[data-tf],[data-tkind],[data-tera],[data-see],#ttPersonClear,#ttReset");
    if (!b) return;
    if (b.dataset.tv) { ev.preventDefault(); if (b.blur) b.blur(); var list = LISTS[b.dataset.list]; select(b.dataset.tv, { queue: list, card: true }); return; }
    if (b.dataset.tf) F[b.dataset.tf] = !F[b.dataset.tf];
    else if (b.dataset.tkind) { var k = b.dataset.tkind; F.kinds.has(k) ? F.kinds.delete(k) : F.kinds.add(k); }
    else if (b.dataset.tera) { var e = b.dataset.tera; F.eras.has(e) ? F.eras.delete(e) : F.eras.add(e); }
    else if (b.dataset.see) {
      reset();
      if (b.dataset.see === "picks") { F.picks = true; F.sort = "old"; }
      else if (b.dataset.see === "neuro") F.neuro = true;
      else if (b.dataset.see === "debate") F.kinds.add("debate");
      if (b.dataset.see !== "picks") F.sort = "new";
      $("ttSort").value = F.sort;
      apply(); if (window.XGoTo) window.XGoTo("library"); else $("library").scrollIntoView({ block: "start" }); return;
    }
    else if (b.id === "ttPersonClear") F.person = null;
    else if (b.id === "ttReset") reset();
    apply();
  });

  AP.onWatched(function (id) {
    host.querySelectorAll('[data-tv="' + id + '"] .x-th__thumb').forEach(function (t) {
      var bar = t.querySelector(".x-th__bar"); if (bar) bar.remove();
      if (!t.querySelector(".x-th__done")) t.insertAdjacentHTML("beforeend", '<span class="x-th__done">✓ Watched</span>');
    });
  });

  window.ArchiveTheater = { select: select, player: player };

  apply();
  var first = ROWS[0].list[0] || V[0];
  if (first) select(first.id, { queue: ROWS[0].list.length ? ROWS[0].list : V });
})();
