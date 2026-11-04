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
  /* Deterministic order: the sort key (date), then person name, then id. */
  var cmpStr = function (a, b) { a = String(a == null ? "" : a); b = String(b == null ? "" : b); return a.localeCompare(b, "en") || (a < b ? -1 : a > b ? 1 : 0); };
  var raw = function (a, b) { a = String(a || ""); b = String(b || ""); return a < b ? -1 : a > b ? 1 : 0; };
  var tie = function (a, b) { return cmpStr(a.names && a.names[0], b.names && b.names[0]) || cmpStr(a.id, b.id); };
  var newest = function (a, b) { return raw(b.d, a.d) || tie(a, b); };
  var oldest = function (a, b) { return (a.d ? 0 : 1) - (b.d ? 0 : 1) || raw(a.d, b.d) || tie(a, b); };
  var newestDatedFirst = function (a, b) { return (a.d ? 0 : 1) - (b.d ? 0 : 1) || newest(a, b); };

  /* ---------- markup ---------- */
  var KINDS = Object.keys(kinds).sort(function (a, b) { return kinds[b] - kinds[a] || cmpStr(a, b); });
  var chip = function (attr, val, label) { return '<button class="x-f" type="button" aria-pressed="false" ' + attr + '="' + esc(val) + '">' + esc(label).replace(/ (\d+)$/, ' <span class="x-n">$1</span>') + "</button>"; };
  var withVideos = {}; V.forEach(function (v) { v.p.forEach(function (id) { withVideos[id] = 1; }); });
  var names = PEOPLE.filter(function (p) { return withVideos[p.id]; }).sort(function (a, b) { return cmpStr(a.name, b.name) || cmpStr(a.id, b.id); });
  /* decade, transcript and length, computed once from the data */
  var decs = {}, nCC = 0;
  V.forEach(function (v) {
    var y = AP.year(v.d);
    v.dec = y ? String(Math.floor(y / 10) * 10) : "u";
    decs[v.dec] = (decs[v.dec] || 0) + 1;
    v.cc = !!(window.ArchiveNotes && ArchiveNotes.hasCC && ArchiveNotes.hasCC(v.id));
    if (v.cc) nCC++;
    v.secs = v.len ? String(v.len).split(":").reduce(function (a, b) { return a * 60 + (+b || 0); }, 0) : 0;
  });
  var DECS = Object.keys(decs).sort(function (a, b) { return a === "u" ? 1 : b === "u" ? -1 : +a - +b; });
  var az = function (a, b) { return cmpStr(a.t, b.t) || tie(a, b); };
  var longest = function (a, b) { return (b.secs || 0) - (a.secs || 0) || newestDatedFirst(a, b); };
  var SORTS = { "new": newestDatedFirst, old: oldest, az: az, "long": longest };

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
            '<select class="x-sel" id="ttSort" aria-label="Sort videos"><option value="new">Newest</option><option value="old">Oldest</option><option value="az">A–Z</option><option value="long">Longest</option></select>' +
          "</div>" +
          '<div class="x-row"><span class="x-row__lab">Show</span>' + chip("data-tf", "picks", "Archive picks") + chip("data-tf", "neuro", "Neuroscience").replace('">', '"><i class="x-ic" data-ic="brain" aria-hidden="true"></i> ') + chip("data-tf", "cc", "CC Has transcript " + nCC) + "</div>" +
          '<div class="x-row"><span class="x-row__lab">Type</span>' + KINDS.map(function (k) { return chip("data-tkind", k, k + " " + kinds[k]); }).join("") + "</div>" +
          '<div class="x-row"><span class="x-row__lab">Decade</span>' + DECS.map(function (d) { return chip("data-tdec", d, (d === "u" ? "Undated" : d + "s") + " " + decs[d]); }).join("") + "</div>" +
          '<div class="x-row">' +
            '<input class="x-input x-tt__person" id="ttPerson" list="ttPeople" placeholder="Filter by person…" aria-label="Filter by person" autocomplete="off" />' +
            '<datalist id="ttPeople">' + names.map(function (p) { return '<option value="' + esc(p.name) + '"></option>'; }).join("") + "</datalist>" +
            '<span id="ttPersonChip"></span>' +
            '<span class="x-count" id="ttCount" aria-live="polite"></span>' +
            '<button class="btn" type="button" id="ttClear" hidden>Clear filters</button>' +
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
    var pr = AP.progress(v.id), len = window.XDur ? XDur.html(v.id, "x-th__len") : v.len ? '<span class="x-dur x-th__len">' + esc(v.len) + "</span>" : "";
    var secs = v.len ? String(v.len).split(":").reduce(function (a, b) { return a * 60 + (+b || 0); }, 0) : 0;
    return '<span class="x-th__thumb"><img src="' + AP.thumb(v.id) + '" alt="" width="320" height="180" loading="lazy" decoding="async" />' + len + (v.k ? '<span class="x-th__kind" data-k="' + esc(v.k) + '">' + esc(v.k) + "</span>" : "") +
      (pr.watched ? '<span class="x-th__done">✓ Watched</span>' : "") +
      (window.ArchiveNotes && ArchiveNotes.hasCC(v.id) ? '<span class="x-th__cc" title="Transcript and captions">CC</span>' : "") +
      (!pr.watched && pr.pos && secs ? '<span class="x-th__bar" style="width:' + Math.min(100, (pr.pos / secs) * 100).toFixed(1) + '%"></span>' : "") + "</span>";
  };
  var sub = function (v) { return [v.names.slice(0, 2).join(", ") || v.c, AP.fmtDate(v.d)].filter(Boolean).join(" · "); };
  var card = function (v, list) {
    var tc = v.cc && window.ArchiveNotes && ArchiveNotes.has(v, "ch");
    return '<button class="x-vc" type="button" data-tv="' + esc(v.id) + '" data-list="' + list + '">' + thumb(v) + "<span><b>" + esc(v.t) + "</b><small>" + esc(sub(v)) + "</small>" +
      (tc ? '<span class="x-tc" title="This talk has a transcript and chapters">Transcript &amp; chapters</span>' : "") + "</span></button>";
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
  /* q and personQ hold the typed strings: an input's value is never written while it has focus */
  var F = { terms: [], q: "", personQ: "", kinds: new Set(), eras: new Set(), decs: new Set(), picks: false, neuro: false, cc: false, person: null, sort: "new" };
  var setVal = function (id, v) { var el = document.getElementById(id); if (el && document.activeElement !== el && el.value !== v) el.value = v; };
  var filtered = [], shown = 0, BATCH = 48, grid = $("ttGrid"), more = $("ttMore");
  var match = function (v) {
    if (F.picks && !v.pick) return false;
    if (F.neuro && !v.neuro) return false;
    if (F.kinds.size && !F.kinds.has(v.k)) return false;
    if (F.eras.size && !F.eras.has(v.era)) return false;
    if (F.decs.size && !F.decs.has(v.dec)) return false;
    if (F.cc && !v.cc) return false;
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
    host.querySelectorAll("[data-tdec]").forEach(function (b) { b.setAttribute("aria-pressed", F.decs.has(b.dataset.tdec)); });
    $("ttPersonChip").innerHTML = F.person ? '<button class="x-f" type="button" aria-pressed="true" id="ttPersonClear">' + esc(people[F.person] ? people[F.person].name : F.person) + " ✕</button>" : "";
  };
  var apply = function () {
    filtered = V.filter(match).sort(SORTS[F.sort] || newestDatedFirst);
    LISTS.grid = filtered;
    grid.innerHTML = ""; shown = 0;
    $("ttCount").textContent = num(filtered.length) + " of " + num(V.length) + " talks";
    $("ttClear").hidden = !(F.terms.length || F.q || F.personQ || F.person || F.kinds.size || F.eras.size || F.decs.size || F.picks || F.neuro || F.cc);
    setVal("ttQ", F.q); setVal("ttPerson", F.personQ);
    syncChips();
    if (!filtered.length) { grid.innerHTML = '<div class="x-empty" style="grid-column: 1 / -1"><p>No talks match these filters.</p><button class="btn" type="button" id="ttReset">Clear all filters</button></div>'; more.parentNode.hidden = true; }
    else renderMore();
  };
  var reset = function () { F.terms = []; F.q = ""; F.personQ = ""; setVal("ttQ", ""); F.kinds.clear(); F.eras.clear(); F.decs.clear(); F.picks = F.neuro = F.cc = false; F.person = null; setVal("ttPerson", ""); };
  more.addEventListener("click", renderMore);
  /* The library grows only on a Show more click; no observer or timer appends cards. */

  var tmr;
  $("ttQ").addEventListener("input", function () {
    clearTimeout(tmr);
    var el = this;
    F.q = el.value;
    tmr = setTimeout(function () { var q = F.q.trim().toLowerCase(); F.terms = q ? q.split(/\s+/) : []; apply(); }, 120);
  });
  $("ttSort").addEventListener("change", function () { F.sort = this.value; apply(); });
  /* the typed name stays in the box (state F.personQ); an exact match sets the person filter, an empty box clears it */
  var pickPerson = function () {
    F.personQ = $("ttPerson").value;
    var val = F.personQ.trim().toLowerCase();
    if (!val) { if (F.person) { F.person = null; apply(); } return; }
    var hit = names.filter(function (p) { return p.name.toLowerCase() === val; })[0];
    if (hit && F.person !== hit.id) { F.person = hit.id; apply(); }
  };
  $("ttPerson").addEventListener("input", pickPerson);
  $("ttPerson").addEventListener("change", pickPerson);
  $("ttPerson").addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    var val = this.value.trim().toLowerCase(); if (!val) return;
    var hit = names.filter(function (p) { return p.name.toLowerCase().indexOf(val) >= 0; })[0];
    if (hit) { F.person = hit.id; F.personQ = this.value; apply(); }
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
    /* Until a talk is chosen the stage above the library stays hidden, so a card opens the pop-out window */
    var top = $("ttTop");
    if (o.card && AP.popout && (top.hidden || !player.inView())) { holdScroll(function () { AP.popout(v, { queue: q }); }); return; }
    if (top.hidden) top.hidden = false;
    /* Loads the poster only; the page never moves and nothing plays until Play is pressed. */
    AP.keepScroll(function () { player.load(v, q ? { queue: q, index: q.indexOf(v) } : null); });
  };

  host.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-tv],[data-tf],[data-tkind],[data-tera],[data-tdec],[data-see],#ttPersonClear,#ttReset,#ttClear");
    if (!b) return;
    if (b.dataset.tv) { ev.preventDefault(); if (b.blur) b.blur(); var list = LISTS[b.dataset.list]; select(b.dataset.tv, { queue: list, card: true }); return; }
    if (b.dataset.tf) F[b.dataset.tf] = !F[b.dataset.tf];
    else if (b.dataset.tdec) { var dd = b.dataset.tdec; F.decs.has(dd) ? F.decs.delete(dd) : F.decs.add(dd); }
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
    else if (b.id === "ttPersonClear") { F.person = null; F.personQ = ""; setVal("ttPerson", ""); }
    else if (b.id === "ttReset" || b.id === "ttClear") reset();
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
  /* #media opens on the library: no talk is loaded (first, last or resumed) until the reader picks one */
  $("ttTop").hidden = true;
})();
