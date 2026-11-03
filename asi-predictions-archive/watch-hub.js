/* Watch hub add-on: per-second watch tracking for every ArchivePlayer (site or YouTube controls),
   an info panel beside each player (About, Context highlights, Speaker, Up next in the window), a "Continue watching" row
   at the top of the Theater, and a "My watch history" drawer. Never starts playback on its own. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer;
  if (!AP || !AP.onCreate) return;

  var read = function (id) { try { var n = document.getElementById(id); return n ? JSON.parse(n.textContent || "null") : null; } catch (e) { return null; } };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = function (s) { s = Math.max(0, Math.floor(s || 0)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (x < 10 ? "0" : "") + x; };
  var ago = function (ms) { var d = (Date.now() - ms) / 1000; if (d < 60) return "just now"; if (d < 3600) return Math.floor(d / 60) + " min ago"; if (d < 86400) return Math.floor(d / 3600) + " h ago"; return Math.floor(d / 86400) + " d ago"; };

  var PEOPLE = {}, DETAIL = {}, VIDS = {};
  var loaded = false;
  var load = function () {
    if (loaded) return; loaded = true;
    (read("d-people") || []).forEach(function (p) { PEOPLE[p.id] = p; });
    DETAIL = read("d-people-detail") || {};
    (read("d-videos") || []).forEach(function (v) { VIDS[v.id] = v; });
  };

  /* ---------- storage ---------- */
  var KEY = "asiWatch.v1";
  var W = {};
  try { W = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { W = {}; }
  var dirty = false;
  var flush = function () { if (!dirty) return; dirty = false; try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) {} };
  setInterval(flush, 5000);
  window.addEventListener("pagehide", function () { dirty = true; flush(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) { dirty = true; flush(); } });

  var emit = function (id) { try { document.dispatchEvent(new CustomEvent("watchprogress", { detail: { id: id, rec: W[id] } })); } catch (e) {} };

  /* ---------- per-second tracking ---------- */
  var tick = function (inst) {
    var yt = inst.yt && inst.yt();
    var v = inst.current && inst.current();
    if (!yt || !v || !v.id || !inst.started()) return;
    var t = 0, dur = 0, st = -1;
    try { t = yt.getCurrentTime() || 0; dur = yt.getDuration() || 0; st = yt.getPlayerState(); } catch (e) { return; }
    var r = W[v.id] || (W[v.id] = { t: 0, dur: 0, sec: 0, count: 0, first: Date.now() });
    if (st === 1) { r.sec = (r.sec || 0) + 1; if (!r._on) { r._on = 1; r.count = (r.count || 0) + 1; } } else r._on = 0;
    if (t > 0) r.t = Math.floor(t);
    if (dur > 0) r.dur = Math.floor(dur);
    r.pct = r.dur ? Math.min(100, Math.round(r.t / r.dur * 100)) : 0;
    if (r.pct >= 90) r.done = 1;
    r.last = Date.now();
    r.title = v.t || r.title || ""; r.c = v.c || r.c || "";
    dirty = true;
    emit(v.id);
  };

  /* ---------- info panel beside each player ---------- */
  var speakers = function (v) { load(); return (v.p || []).map(function (id) { return PEOPLE[id]; }).filter(Boolean); };
  var firstSentence = function (s) { s = String(s || ""); var m = s.match(/^.{20,260}?[.!?](\s|$)/); return m ? m[0].trim() : s.slice(0, 220); };
  var KINDS = { lecture: "lecture", talk: "talk", interview: "interview", podcast: "podcast", panel: "panel discussion", debate: "debate", hearing: "hearing", documentary: "documentary", archive: "archival clip", history: "historical clip", keynote: "keynote" };
  var eraOf = function (y) { return !y ? "" : y < 2012 ? "the pre-deep-learning era" : y < 2023 ? "the deep learning era" : "the post-ChatGPT era"; };
  var TOPICS = [
    [/superintelligen|asi\b/i, "Superintelligence"], [/\bagi\b|general intelligence/i, "AGI timelines"], [/align/i, "Alignment"],
    [/safety|risk|danger|catastroph|extinct|doom/i, "AI risk"], [/interpretab|mechanistic|neuron|circuit/i, "Interpretability"],
    [/control|shutdown|corrigib/i, "Control problem"], [/regulat|policy|govern|law|senate|congress|hearing|bill|un\b|summit/i, "Policy & governance"],
    [/conscious|mind|brain|neuro/i, "Mind & brain"], [/scal|compute|gpu|training/i, "Scaling"], [/future|predict|forecast|20[2-9]\d/i, "Forecasts"],
    [/ethic|fair|bias|rights/i, "Ethics"], [/agent/i, "AI agents"], [/robot/i, "Robotics"], [/deep learning|neural net/i, "Deep learning"]
  ];
  var topics = function (v) { var s = (v.t || "") + " " + (v.s || ""); var out = []; TOPICS.forEach(function (x) { if (x[0].test(s) && out.length < 4) out.push(x[1]); }); return out; };

  var seq = 0;
  var clip = function (s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s; };
  var bioOf = function (p) { var d = DETAIL[p.id] || {}; return (d.background || [])[0] || p.bio || ""; };

  /* About: title, channel · year · length chips, a 3-line summary, and the full description inline on request */
  var about = function (v) {
    var sp = speakers(v), y = AP.year ? AP.year(v.d) : 0, kind = KINDS[v.k] || (v.k ? v.k : "video");
    var who = sp.length ? sp.map(function (p) { return p.name; }).join(", ") : "";
    /* "An" before a vowel sound: an interview, an archival clip */
    var art = /^[aeiou]/i.test(kind) ? "An " : "A ";
    var tp = topics(v);
    var lead = art + esc(kind) + (who ? " featuring <b>" + esc(who) + "</b>" : "") + (tp.length ? " on " + esc(tp.join(", ").toLowerCase()) : "") + (y ? ", recorded in " + eraOf(y) : "") + ".";
    var desc = v.s ? String(v.s).split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).map(esc) : [];
    var more = [];
    if (sp[0]) { var bio = bioOf(sp[0]); if (bio) more.push('<p class="x-wh__p"><b>About ' + esc(sp[0].name) + ".</b> " + esc(clip(bio, 480)) + "</p>"); }
    if (tp.length) more.push('<div class="x-wh__tags">' + tp.map(function (t) { return '<a class="x-wh__tag x-tagl" href="#/topic/' + esc(String(t).toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) + '">#' + esc(t) + "</a>"; }).join("") + "</div>");
    var chips = [v.c ? ["📺", v.c, "Channel"] : null, y ? ["📅", y, "Year"] : null, v.len ? ["⏱", v.len, "Length"] : null].filter(Boolean)
      .map(function (c) { return '<span class="x-wh__chip" title="' + c[2] + '"><span aria-hidden="true">' + c[0] + "</span> " + esc(c[1]) + "</span>"; }).join("");
    var id = "whf" + (++seq), sum = [lead].concat(desc).join(" ");
    /* the summary shows three lines; the button appears when there is more to read */
    var long = more.length || sum.replace(/<[^>]+>/g, "").length > 150;
    /* speakers, linked to their profiles */
    var who2 = sp.length ? '<div class="x-wh__who" aria-label="Speakers">' + sp.map(function (p) {
      return '<a class="x-wh__whoa" href="#/person/' + esc(p.id) + '">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="" width="28" height="28" loading="lazy" decoding="async">' : '<span class="x-wh__av" aria-hidden="true">' + esc(p.name[0]) + "</span>") + "<span>" + esc(p.name) + "</span></a>";
    }).join("") + "</div>" : "";
    var nx = NX(), claims = nx && nx.summary ? nx.summary(v) : "";
    return '<div class="x-wh__about">' +
      '<h3 class="x-wh__title">' + esc(v.t) + "</h3>" +
      (chips ? '<div class="x-wh__chips">' + chips + "</div>" : "") +
      who2 +
      '<div class="x-wh__desc" id="' + id + '"><p class="x-wh__sum">' + sum + "</p>" + (more.length ? '<div class="x-wh__full">' + more.join("") + "</div>" : "") + "</div>" +
      (long ? '<button type="button" class="x-wh__toggle" data-wh-more aria-expanded="false" aria-controls="' + id + '">Read full description</button>' : "") +
      (claims ? '<div class="x-wh__claims">' + claims + "</div>" : "") +
      '<details class="x-wh__more"><summary>Context highlights</summary>' + highlights(v) + "</details>" +
      (sp.length ? '<details class="x-wh__more"><summary>Speaker' + (sp.length > 1 ? "s" : "") + " and more talks</summary>" + speaker(v) + "</details>" : "") +
      "</div>";
  };

  var highlights = function (v) {
    var sp = speakers(v), items = [];
    sp.slice(0, 2).forEach(function (p) {
      var d = DETAIL[p.id] || {};
      if (p.warning) items.push(["⚠️", p.name + " warns", p.warning]);
      if (p.pdoom) items.push(["🎲", p.name + "'s risk estimate", p.pdoom]);
      if (p.agi_year) items.push(["⏳", p.name + "'s AGI timeline", String(p.agi_year)]);
      (d.predictions || []).slice(0, 2).forEach(function (r) { if (r && r.claim) items.push(["🔮", "Prediction" + (r.year ? " (" + r.year + ")" : ""), r.claim]); });
      (p.quotes || []).slice(0, 1).forEach(function (q) { if (q && q.text) items.push(["💬", "In their words", q.text]); });
      (p.key_ideas || []).length && items.push(["💡", "Key ideas", p.key_ideas.slice(0, 4).join(" · ")]);
    });
    if (!items.length) { var tp = topics(v); if (tp.length) items.push(["🏷️", "Topics", tp.join(" · ")]); }
    if (!items.length) return '<p class="x-wh__muted">No context highlights for this talk yet.</p>';
    /* compact cards: icon, bold label, two lines; a tap opens the full text in place */
    return '<p class="x-wh__info"><span aria-hidden="true">ⓘ</span> From the speaker\'s record, not video timestamps</p><ul class="x-wh__hl">' +
      items.slice(0, 6).map(function (x, i) {
        return '<li style="--i:' + i + '"><button type="button" class="x-wh__card" data-wh-card aria-expanded="false"><span class="x-wh__ico" aria-hidden="true">' + x[0] + '</span><span class="x-wh__ct"><b>' + esc(x[1]) + '</b><span class="x-wh__cx">' + esc(clip(x[2], 420)) + "</span></span></button></li>";
      }).join("") + "</ul>";
  };

  /* Speaker: avatar, name, role, a 2-line bio and the profile link, then compact rows of other talks */
  var speaker = function (v) {
    var sp = speakers(v);
    if (!sp.length) return '<p class="x-wh__muted">' + (v.c ? "Channel: " + esc(v.c) + ". " : "") + "No speaker profile is linked to this video.</p>";
    return sp.slice(0, 3).map(function (p) {
      /* newest first, then id: an explicit order, not object-key order */
      var more = Object.keys(VIDS).filter(function (id) { return id !== v.id && (VIDS[id].p || []).indexOf(p.id) >= 0; }).sort(function (a, b) {
        var x = String(VIDS[a].d && VIDS[a].d !== "None" ? VIDS[a].d : ""), y = String(VIDS[b].d && VIDS[b].d !== "None" ? VIDS[b].d : "");
        return (y < x ? -1 : y > x ? 1 : 0) || (a < b ? -1 : a > b ? 1 : 0);
      }).slice(0, 4);
      var bio = bioOf(p), role = [p.role, p.org].filter(Boolean).join(" · ");
      return '<div class="x-wh__sp"><div class="x-wh__sphead">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="" loading="lazy" decoding="async" width="56" height="56">' : '<span class="x-wh__av" aria-hidden="true">' + esc(p.name[0]) + "</span>") +
        '<div class="x-wh__spwho"><p class="x-wh__name">' + esc(p.name) + "</p>" + (role ? '<p class="x-wh__role">' + esc(role) + "</p>" : "") + "</div></div>" +
        (bio ? '<p class="x-wh__bio">' + esc(clip(bio, 320)) + "</p>" : "") +
        '<a class="x-wh__view" href="#/person/' + esc(p.id) + '">View profile <span aria-hidden="true">→</span></a>' +
        (more.length ? '<p class="x-wh__sub">More talks</p><ul class="x-wh__talks" aria-label="Other talks by ' + esc(p.name) + '">' + more.map(function (id) {
          var x = VIDS[id];
          return '<li><button type="button" class="x-wh__row" data-wh-play="' + esc(id) + '" title="' + esc(x.t) + '"><span class="x-dur-w"><img src="' + AP.thumb(id) + '" alt="" loading="lazy" decoding="async" width="96" height="54">' + (window.XDur ? XDur.html(id) : "") + '</span><span class="x-wh__rowtx"><b>' + esc(x.t) + "</b>" + (x.len || x.c ? "<small>" + esc([x.c, x.len].filter(Boolean).join(" · ")) + "</small>" : "") + "</span></button></li>";
        }).join("") + "</ul>" : "") +
        "</div>";
    }).join("");
  };

  /* [key, label, icon, tooltip]: the same five tabs in every mode (page, theater, window, mini flyout, fullscreen) */
  var TABS = [["about", "About", "ℹ", "About this talk"], ["ch", "Chapters", "≡", "Chapters"], ["tr", "Transcript", "¶", "Transcript"],
    ["up", "Up next", "▶", "Up next and queue"], ["notes", "Notes", "✎", "Your notes and bookmarks"]];
  /* the notes tabs (player-notes.js) show only for videos that have them */
  var NOTE_TABS = { ch: 1, tr: 1 };
  var NX = function () { return window.ArchiveNotes || null; };

  /* ---------- Notes tab: a free-text note per talk, kept on this device ---------- */
  var NK = "asi.talkNotes";
  var readNotes = function () { try { var o = JSON.parse(localStorage.getItem(NK)); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } };
  var noteOf = function (id) { var o = readNotes()[id]; return o && typeof o.x === "string" ? o.x : ""; };
  var saveNote = function (id, x) {
    var o = readNotes();
    if (x && x.trim()) o[id] = { x: x, at: Date.now() }; else delete o[id];
    try { localStorage.setItem(NK, JSON.stringify(o)); } catch (e) {}
  };
  var notesTab = function (v, uid) {
    return '<div class="x-wh__notes"><p class="x-pn-h">Your notes</p>' +
      '<label class="x-pn-sr" for="' + uid + '-note">Notes on this talk</label>' +
      '<textarea class="x-wh__note" id="' + uid + '-note" rows="5" placeholder="Write while you watch. Press the clock to drop in the current time." data-wh-note>' + esc(noteOf(v.id)) + "</textarea>" +
      '<div class="x-wh__noterow"><button type="button" class="x-pn-btn" data-wh-stamp>⏱ Insert time</button><span class="x-wh__saved" aria-live="polite"></span></div>' +
      '<p class="x-pn-cnote x-wh__nhelp">Saved on this device as you type. Bookmarks (B) are listed below.</p></div>';
  };

  /* ---------- Up next: the queue, then related talks (same people, then same kind) ---------- */
  var upList = function (inst) {
    load();
    var st = inst.state ? inst.state() : {}, v = st.video; if (!v) return "";
    var q = (st.queue || []).filter(Boolean), out = [], seen = {};
    var row = function (x, i, now) {
      var yr = AP.year ? AP.year(x.d) : 0;
      return '<li><button type="button" class="x-wh__row x-wh__uprow" data-wh-q="' + i + '" data-wh-id="' + esc(x.id) + '"' + (now ? ' aria-current="true"' : "") + ' title="' + esc(x.t) + '">' +
        '<span class="x-dur-w"><img src="' + AP.thumb(x.id) + '" alt="" loading="lazy" decoding="async" width="96" height="54">' + (window.XDur ? XDur.html(x.id) : "") + '</span><span class="x-wh__rowtx"><b>' + esc(x.t) + "</b><small>" + esc([x.c, yr || "", x.len].filter(Boolean).join(" · ")) + "</small></span>" +
        (now ? '<span class="x-wh__now">Playing</span>' : "") + "</button></li>";
    };
    q.forEach(function (x, i) { seen[x.id] = 1; out.push(row(x, i, i === st.index)); });
    var more = [], p = v.p || [];
    Object.keys(VIDS).forEach(function (id) { var x = VIDS[id]; if (seen[id] || more.length >= 8) return; if ((x.p || []).some(function (pid) { return p.indexOf(pid) >= 0; })) { seen[id] = 1; more.push(x); } });
    if (v.k) Object.keys(VIDS).forEach(function (id) { var x = VIDS[id]; if (seen[id] || more.length >= 8) return; if (x.k === v.k) { seen[id] = 1; more.push(x); } });
    return (q.length > 1 ? '<p class="x-pn-h">Queue · ' + q.length + " talks</p><ol class=\"x-wh__uplist\">" + out.join("") + "</ol>" : "") +
      (more.length ? '<p class="x-pn-h x-wh__uph">Related talks</p><ol class="x-wh__uplist">' + more.map(function (x) { return row(x, -1, false); }).join("") + "</ol>" : "") +
      (q.length <= 1 && !more.length ? '<p class="x-wh__muted">Nothing queued after this talk.</p>' : "");
  };
  var FOLD = "asiWatch.panelHidden";
  var folded = false;
  try { folded = localStorage.getItem(FOLD) === "1"; } catch (e) {}
  var wide = window.matchMedia ? window.matchMedia("(min-width: 1100px)") : null;
  var SIDE_MIN = 860; /* the player needs this much width to keep a good video beside a readable panel */
  var still = function () { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); };

  /* Beside the video at 1100px and up (same height as the video box, icon rail on its outer edge);
     under the video below that, with the rail as a segmented bar and no inner scroll. */
  var attachPanel = function (inst) {
    var host = inst.root; if (!host || host.querySelector(".x-wh")) return;
    var pop = host.closest ? host.closest(".x-pop") : null;
    var list = pop ? pop.querySelector(".x-pop__list") : null;
    var tabs = TABS;
    var uid = "wh" + (++seq);
    var box = document.createElement("div");
    box.className = "x-wh";
    box.innerHTML =
      '<div class="x-wh__grip" role="separator" aria-orientation="vertical" aria-label="Resize the side panel" title="Drag to resize · double-click to reset" tabindex="0" aria-valuemin="280" aria-valuemax="720"></div>' +
      '<div class="x-wh__main" id="' + uid + '-main">' +
        '<p class="x-wh__prog" aria-live="off"></p>' +
        '<div class="x-wh__body" id="' + uid + '-body" role="tabpanel" tabindex="-1"><div class="x-wh__pane"></div><div class="x-wh__up" hidden>' + (list ? "" : '<div class="x-wh__upin"></div>') + "</div></div>" +
        '<button type="button" class="x-wh__down" data-wh-down hidden aria-label="Scroll the panel down">↓ more</button>' +
      "</div>" +
      '<div class="x-wh__rail">' +
        '<div class="x-wh__tabs" role="tablist" aria-label="Video info">' + tabs.map(function (t, i) {
          return '<button type="button" role="tab" class="x-wh__tab" id="' + uid + "-" + t[0] + '" data-t="' + t[0] + '" aria-selected="' + (i === 0) + '" aria-controls="' + uid + '-body" tabindex="' + (i === 0 ? 0 : -1) + '" data-wtip="' + t[3] + '">' +
            '<span class="x-wh__ic" aria-hidden="true">' + t[2] + '</span><span class="x-wh__lb">' + t[1] + "</span></button>";
        }).join("") + "</div>" +
        '<button type="button" class="x-wh__fold" data-wh-fold aria-controls="' + uid + '-main"><span class="x-wh__ic" aria-hidden="true"></span><span class="x-wh__lb"></span></button>' +
        '<button type="button" class="x-wh__x" data-wh-close aria-label="Close the panel (\\)" title="Close (\\)">×</button>' +
      "</div>";
    host.appendChild(box);
    host.classList.add("has-wh");
    if (list) box.querySelector(".x-wh__up").appendChild(list); /* the window's up-next list becomes the fourth tab */
    var cur = "about", last = null;
    var body = box.querySelector(".x-wh__body"), pane = box.querySelector(".x-wh__pane"), up = box.querySelector(".x-wh__up");
    var prog = box.querySelector(".x-wh__prog"), down = box.querySelector(".x-wh__down"), foldB = box.querySelector(".x-wh__fold");
    var tabEls = [].slice.call(box.querySelectorAll(".x-wh__tab"));
    /* beside the video: a wide viewport, room in the player, and never in the small corner window */
    var side = false;
    var isSide = function () { return side; };
    var layout = function () {
      /* fullscreen has its own layout (watch-shell rules): panel on the right, or a bottom sheet on narrow or portrait screens */
      var fs = host.classList.contains("is-fs");
      var sheet = fs && (host.clientWidth < 640 || window.innerHeight > window.innerWidth);
      host.classList.toggle("is-fs-sheet", sheet);
      host.classList.toggle("is-fs-side", fs && !sheet);
      if (fs) applyW();
      /* the wide window puts the video across the full width, with the panel under it */
      var on = !fs && !!(wide && wide.matches) && host.clientWidth >= SIDE_MIN && !(pop && (!pop.classList.contains("is-modal") || pop.classList.contains("is-wide")));
      if (on === side && host.classList.contains("is-wh-side") === on) return;
      side = on; host.classList.toggle("is-wh-side", on);
      orient(); edges();
    };

    /* soft fade masks and the "more" chevron, only when the side panel has more to show */
    var isFly = function () { return host.classList.contains("is-wh-fly"); };
    var isMini = function () { return !!pop && !pop.classList.contains("is-modal") && !host.classList.contains("is-fs"); };
    /* the panel body is its own scroller beside the video, in fullscreen (side or sheet) and in the mini flyout */
    var scrolls = function () { return isSide() || host.classList.contains("is-fs") || isFly(); };
    var edges = function () {
      var can = scrolls() && (isFly() || !folded) && !box.hidden && body.scrollHeight - body.clientHeight > 2;
      var top = can && body.scrollTop > 2, bot = can && body.scrollHeight - body.clientHeight - body.scrollTop > 2;
      body.classList.toggle("is-fade-top", top); body.classList.toggle("is-fade-bot", bot);
      down.hidden = !bot;
    };
    var orient = function () { box.querySelector(".x-wh__tabs").setAttribute("aria-orientation", isSide() ? "vertical" : "horizontal"); };
    var paintFold = function () {
      box.classList.toggle("is-collapsed", folded); host.classList.toggle("is-wh-collapsed", folded);
      foldB.setAttribute("aria-expanded", String(!folded));
      foldB.setAttribute("aria-label", folded ? "Show the info panel" : "Hide the info panel");
      foldB.setAttribute("data-wtip", folded ? "Show panel" : "Hide panel, video full width");
      foldB.querySelector(".x-wh__ic").textContent = folded ? "⇤" : "⇥";
      foldB.querySelector(".x-wh__lb").textContent = folded ? "Show" : "Hide";
      edges();
      if (inst._sxPanelPaint) inst._sxPanelPaint();
    };
    var slideIn = function () { body.classList.remove("is-in"); void body.offsetWidth; body.classList.add("is-in"); };
    var showCurrentInList = function () {
      var c = up && up.querySelector('[aria-current="true"]'); if (!c || !scrolls()) return;
      body.scrollTop += c.getBoundingClientRect().top - body.getBoundingClientRect().top - 12;
    };
    var syncTabs = function () {
      var v = inst.current && inst.current(), nx = NX(), lost = false;
      tabEls.forEach(function (b) {
        var k = b.getAttribute("data-t"); if (!NOTE_TABS[k]) return;
        var on = !!(v && nx && nx.has(v, k));
        b.hidden = !on;
        if (!on && k === cur) lost = true;
      });
      if (lost) select("about");
      return lost;
    };
    var paint = function (force, anim) {
      var v = inst.current && inst.current();
      if (!v || !v.id) { box.hidden = true; host.classList.remove("has-wh"); return; }
      box.hidden = false; host.classList.add("has-wh");
      syncTabs();
      body.setAttribute("data-t", cur);
      body.setAttribute("aria-labelledby", uid + "-" + cur);
      if (cur === "up") {
        pane.hidden = true; up.hidden = false;
        /* the page and theater players list their own queue and related talks; the window keeps its list */
        var upin = up.querySelector(".x-wh__upin");
        if (upin && (force || anim || upin.__id !== v.id)) { upin.__id = v.id; upin.innerHTML = upList(inst); }
        if (anim) { slideIn(); body.scrollTop = 0; showCurrentInList(); }
        edges(); return;
      }
      pane.hidden = false; if (up) up.hidden = true;
      if (!force && last === v.id + cur) { if (anim) { slideIn(); body.scrollTop = 0; } edges(); return; }
      last = v.id + cur;
      load();
      if (NOTE_TABS[cur] && NX()) { pane.innerHTML = ""; NX().render(cur, v, pane, inst); }
      else pane.innerHTML = cur === "notes" ? notesTab(v, uid) : about(v);
      body.scrollTop = 0; /* each video and tab starts at its top */
      slideIn();
      edges();
    };
    var paintProg = function () { var v = inst.current && inst.current(); var r = v && W[v.id]; prog.textContent = r && r.sec ? "Watched " + fmt(r.sec) + (r.pct ? " · " + r.pct + "%" : "") : ""; edges(); };
    var keep = AP.keepScroll || function (f) { return f(); };
    var select = function (t) {
      cur = t;
      tabEls.forEach(function (b) { var on = b.getAttribute("data-t") === t; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    };
    box.addEventListener("click", function (e) {
      var t = e.target.closest(".x-wh__tab");
      if (t) {
        var k = t.getAttribute("data-t"), reopen = folded && !isFly();
        if (k === cur && !reopen) return;
        select(k);
        keep(function () { if (reopen) setFold(false, true); paint(false, true); });
        return;
      }
      if (e.target.closest("[data-wh-fold]")) { keep(function () { setFold(!folded, true); }); return; }
      if (e.target.closest("[data-wh-close]")) { keep(function () { toggle(false); }); return; }
      if (e.target.closest("[data-wh-stamp]")) { stamp(); return; }
      var qr = e.target.closest("[data-wh-id]");
      if (qr) {
        e.preventDefault();
        var st = inst.state(), qi = +qr.getAttribute("data-wh-q"), x = VIDS[qr.getAttribute("data-wh-id")];
        keep(function () {
          if (qi >= 0 && st.queue && st.queue[qi]) inst.load(st.queue[qi], { queue: st.queue, index: qi });
          else if (x) { var qq = (st.queue || []).slice(); qq.splice((st.index || 0) + 1, 0, x); inst.load(x, { queue: qq, index: (st.index || 0) + 1 }); }
          else return;
          if (st.playing) inst.play();
        });
        return;
      }
      /* names and topics lead to other pages: leave fullscreen first, so the page that opens is on show */
      if (e.target.closest('a[href^="#/person/"], a[href^="#/topic/"]')) {
        var d = document;
        if (d.fullscreenElement || d.webkitFullscreenElement) { try { (d.exitFullscreen || d.webkitExitFullscreen).call(d); } catch (x2) {} }
        if (inst.exitPseudoFs) inst.exitPseudoFs();
        if (isFly()) toggle(false);
      }
      if (e.target.closest("[data-wh-down]")) { body.scrollBy({ top: Math.max(80, body.clientHeight * 0.85), behavior: still() ? "auto" : "smooth" }); return; }
      var mo = e.target.closest("[data-wh-more]");
      if (mo) {
        var a = mo.closest(".x-wh__about"), open = a.classList.toggle("is-open");
        mo.setAttribute("aria-expanded", String(open)); mo.textContent = open ? "Show less" : "Read full description";
        edges(); return;
      }
      var cd = e.target.closest("[data-wh-card]");
      if (cd) { var o = cd.getAttribute("aria-expanded") !== "true"; cd.setAttribute("aria-expanded", String(o)); edges(); return; }
      var pl = e.target.closest("[data-wh-play]");
      if (pl) {
        e.preventDefault();
        var id = pl.getAttribute("data-wh-play");
        keep(function () { AP.watch(VIDS[id] || id); });
        return;
      }
      /* a person link inside the video window closes the window first, so the page underneath is free to change */
      if (e.target.closest('a[href^="#/person/"], a[href^="#/topic/"]') && AP.isWatching && AP.isWatching()) AP.closePopout();
    });
    box.addEventListener("keydown", function (e) {
      if (!e.target.classList.contains("x-wh__tab")) return;
      var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
      e.preventDefault(); e.stopPropagation(); /* arrows move between tabs here, they do not seek the video */
      var vis = tabEls.filter(function (b) { return b.offsetParent !== null; });
      var n = vis[(vis.indexOf(e.target) + d + vis.length) % vis.length]; if (!n) return;
      n.focus({ preventScroll: true }); n.click();
    });
    body.addEventListener("scroll", edges, { passive: true });

    /* ---------- Notes tab: saves as you type; the clock inserts the current time ---------- */
    var noteT = 0;
    box.addEventListener("input", function (e) {
      if (!e.target.matches || !e.target.matches("[data-wh-note]")) return;
      var v = inst.current && inst.current(); if (!v) return;
      var ta = e.target, out = box.querySelector(".x-wh__saved");
      clearTimeout(noteT); noteT = setTimeout(function () { saveNote(v.id, ta.value); if (out) out.textContent = "Saved"; setTimeout(function () { if (out) out.textContent = ""; }, 1400); }, 400);
    });
    var stamp = function () {
      var ta = box.querySelector("[data-wh-note]"), v = inst.current && inst.current(); if (!ta || !v) return;
      var t = inst.started && inst.started() ? inst.now() : (AP.position ? AP.position(v.id).pos : 0);
      var s = "[" + fmt(t) + "] ", a = ta.selectionStart || ta.value.length, b = ta.selectionEnd || a;
      var pre = ta.value.slice(0, a), nl = pre && !/\n$/.test(pre) ? "\n" : "";
      ta.value = pre + nl + s + ta.value.slice(b);
      var at = (pre + nl + s).length;
      try { ta.focus({ preventScroll: true }); ta.setSelectionRange(at, at); } catch (x) {}
      saveNote(v.id, ta.value);
    };
    /* keys typed in the note never reach the player's shortcuts */
    box.addEventListener("keydown", function (e) { if (e.target.matches && e.target.matches("[data-wh-note]")) e.stopPropagation(); });

    /* ---------- open, collapse, and the mini player's flyout ---------- */
    var fly = false;
    var placeFly = function () {
      if (!fly || !pop) return;
      var r = pop.getBoundingClientRect(), vw = document.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
      var w = Math.min(vw - 16, Math.max(320, r.width)), h, x, y;
      if (r.top >= 280) { h = Math.min(r.top - 16, vh * 0.6, 520); y = r.top - 8 - h; x = r.left; }
      else if (vh - r.bottom >= 280) { h = Math.min(vh - r.bottom - 16, vh * 0.6, 520); y = r.bottom + 8; x = r.left; }
      else if (r.left >= 340) { w = Math.min(r.left - 16, 420); h = Math.min(vh - 16, 560); y = Math.max(8, Math.min(r.top, vh - h - 8)); x = r.left - 8 - w; }
      else { w = r.width; h = r.height; x = r.left; y = r.top; }
      x = Math.max(8, Math.min(vw - w - 8, x));
      box.style.left = Math.round(x) + "px"; box.style.top = Math.round(y) + "px";
      box.style.width = Math.round(w) + "px"; box.style.height = Math.round(h) + "px";
    };
    var setFly = function (on) {
      fly = !!on; host.classList.toggle("is-wh-fly", fly);
      if (!fly) { box.style.left = box.style.top = box.style.width = box.style.height = ""; }
      else { placeFly(); paint(false, true); }
      edges(); if (inst._sxPanelPaint) inst._sxPanelPaint();
    };
    var toggle = function (want) {
      if (isMini()) { setFly(want == null ? !fly : want); return; }
      if (fly) setFly(false);
      setFold(want == null ? !folded : !want, true);
      if (!folded) paint(false, false);
    };
    inst._whToggle = function () { keep(function () { toggle(); }); };
    inst._whOpen = function () { return isMini() ? fly : !folded; };
    if (pop && "MutationObserver" in window) new MutationObserver(function () { if (fly) { if (!isMini()) setFly(false); else placeFly(); } }).observe(pop, { attributes: true, attributeFilter: ["class", "style", "hidden"] });
    window.addEventListener("resize", function () { if (fly) placeFly(); }, { passive: true });
    document.addEventListener("pointerdown", function (e) {
      if (fly && !box.contains(e.target) && !(e.target.closest && e.target.closest('[data-x="panel"]'))) setFly(false);
    });

    /* ---------- resize: drag the panel's inner edge (beside the video and in fullscreen); remembered ---------- */
    var WK = "asi.panelW", PW = 0;
    try { PW = +localStorage.getItem(WK) || 0; } catch (e) {}
    var maxW = function () { return Math.max(300, Math.min(720, host.clientWidth * 0.6)); };
    var applyW = function () {
      if (PW > 0) host.style.setProperty("--wh-w", Math.round(Math.max(280, Math.min(maxW(), PW))) + "px");
      else host.style.removeProperty("--wh-w");
      grip.setAttribute("aria-valuenow", String(Math.round(box.offsetWidth || PW || 380)));
    };
    var grip = box.querySelector(".x-wh__grip"), gd = null;
    grip.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      try { grip.setPointerCapture(e.pointerId); } catch (x) {}
      gd = { id: e.pointerId }; host.classList.add("is-wh-sizing");
    });
    grip.addEventListener("pointermove", function (e) {
      if (!gd || e.pointerId !== gd.id) return;
      var r = host.getBoundingClientRect();
      PW = Math.max(280, Math.min(maxW(), r.right - e.clientX)); applyW();
    });
    var endG = function (e) {
      if (!gd || e.pointerId !== gd.id) return;
      gd = null; host.classList.remove("is-wh-sizing");
      try { grip.releasePointerCapture(e.pointerId); } catch (x) {}
      try { localStorage.setItem(WK, String(Math.round(PW))); } catch (x) {}
    };
    grip.addEventListener("pointerup", endG); grip.addEventListener("pointercancel", endG);
    grip.addEventListener("dblclick", function () { PW = 0; try { localStorage.removeItem(WK); } catch (x) {} applyW(); });
    grip.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowLeft" ? 24 : e.key === "ArrowRight" ? -24 : 0; if (!d) return;
      e.preventDefault(); e.stopPropagation();
      PW = Math.max(280, Math.min(maxW(), (PW || box.offsetWidth || 380) + d)); applyW();
      try { localStorage.setItem(WK, String(Math.round(PW))); } catch (x) {}
    });
    applyW();

    var onFsChange = function () { requestAnimationFrame(function () { if (fly && host.classList.contains("is-fs")) setFly(false); layout(); applyW(); edges(); paint(false, false); }); };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("x-fschange", onFsChange);
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () { edges(); }); ro.observe(body); ro.observe(pane); if (up) ro.observe(up);
      new ResizeObserver(function () { layout(); }).observe(host);
    }
    if (wide) { if (wide.addEventListener) wide.addEventListener("change", layout); else if (wide.addListener) wide.addListener(layout); }
    window.addEventListener("resize", layout, { passive: true });
    if (pop && "MutationObserver" in window) new MutationObserver(layout).observe(pop, { attributes: true, attributeFilter: ["class"] });
    panels.push(function () { paintFold(); });
    layout(); orient(); paintFold();
    paint(true);
    /* repainted only when the video changes or its play state changes, never on a timer */
    if (inst.on) {
      inst.on("change", function () {
        /* a window with one video has no up-next list: fall back to About */
        if (cur === "up" && pop && pop.classList.contains("is-solo")) select("about");
        keep(function () { paint(false); }); paintProg();
      });
      inst.on("state", function () { paintProg(); });
    }
    /* called once by player-notes.js when it loads: About gains the summary and key claims then */
    inst._whPaint = function () { paint(true); paintProg(); };
    /* a transcript that failed to load: its tab goes away quietly, and the panel falls back to About if it was showing */
    inst._whSync = function () { if (syncTabs()) keep(function () { paint(true); }); };
  };
  /* one remembered choice for every player: hiding the panel in one hides it in all */
  var panels = [];
  var setFold = function (on, save) {
    folded = !!on;
    if (save) { try { localStorage.setItem(FOLD, folded ? "1" : "0"); } catch (e) {} }
    panels.forEach(function (f) { f(); });
  };

  var insts = [];
  AP.onCreate(function (inst) { insts.push(inst); try { attachPanel(inst); } catch (e) {} });
  /* tracking only: counts seconds watched into storage; it redraws nothing */
  setInterval(function () {
    insts.forEach(function (i) { if (i.root && i.root.isConnected) { try { tick(i); } catch (e) {} } });
  }, 1000);

  /* ---------- Continue watching row + history drawer ---------- */
  var list = function () { return Object.keys(W).map(function (id) { var r = W[id]; return { id: id, r: r }; }).filter(function (x) { return x.r && x.r.last; }).sort(function (a, b) { return b.r.last - a.r.last || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }); };
  var vidOf = function (id) { load(); return VIDS[id] || { id: id, t: (W[id] && W[id].title) || "Video", c: (W[id] && W[id].c) || "", p: [] }; };

  var row = null, rowFlushing = false;
  /* resume time from the player's store (AP.position); the tracker's own r.t only when the player has none */
  var posOf = function (id) {
    if (AP.position) { var p = AP.position(id); return p && p.pos > 0 ? p.pos : 0; }
    return (W[id] && W[id].t) || 0;
  };
  var pctOf = function (x) { var d = x.r.dur || 0, p = posOf(x.id); return x.r.done ? 100 : d ? Math.min(100, Math.round(p / d * 100)) : 0; };
  /* on pause, close and pagehide the player flushes; the matching card's label and bar update in place (no layout change) */
  if (AP.onSaved) AP.onSaved(function (id) {
    if (rowFlushing || !row || row.hidden) return;
    var card = row.querySelector('[data-cw-play="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); if (!card) return;
    var res = card.querySelector(".x-cw__res"), bar = card.querySelector(".x-cw__bar i"), p = posOf(id), r = W[id];
    if (res && p > 0) res.textContent = "▶ Resume " + fmt(p);
    if (bar && r) bar.style.width = pctOf({ id: id, r: r }) + "%";
  });
  var paintRow = function () {
    var th = document.getElementById("theater"); if (!th) return;
    if (!row) { row = document.createElement("div"); row.className = "x-cw"; th.parentNode.insertBefore(row, th); }
    /* one source for the resume time: the player's saved position, flushed first so it matches "Resume from" */
    if (AP.flush) { rowFlushing = true; try { AP.flush(); } catch (e) {} rowFlushing = false; }
    var l = list().filter(function (x) { return !x.r.done && posOf(x.id) > 5; }).slice(0, 12), all = list();
    if (!all.length) { row.hidden = true; return; }
    row.hidden = false;
    row.innerHTML = '<div class="x-cw__head"><h3 class="x-cw__h">' + (l.length ? "Continue watching" : "Your recent talks") + '</h3><button type="button" class="x-cw__btn" data-cw="open">🕘 My watch history <span class="x-cw__n">' + all.length + "</span></button></div>" +
      '<div class="x-cw__row">' + (l.length ? l : all.slice(0, 8)).map(function (x, i) {
        var v = vidOf(x.id);
        return '<button type="button" class="x-cw__card" style="--i:' + i + '" data-cw-play="' + esc(x.id) + '"><span class="x-cw__th"><img src="' + AP.thumb(x.id) + '" alt="" loading="lazy" decoding="async" width="240" height="135">' + (window.XDur ? XDur.html(x.id) : "") + '<span class="x-cw__bar"><i style="width:' + pctOf(x) + '%"></i></span>' + (x.r.done ? '<span class="x-cw__done">✓ Watched</span>' : '<span class="x-cw__res">▶ Resume ' + fmt(posOf(x.id)) + "</span>") + '</span><span class="x-cw__t">' + esc(v.t) + '</span><span class="x-cw__m">' + esc(v.c || "") + " · " + ago(x.r.last) + "</span></button>";
      }).join("") + "</div>";
  };

  var drawer = null;
  var openDrawer = function () {
    if (!drawer) {
      drawer = document.createElement("div"); drawer.className = "x-whd"; drawer.hidden = true;
      drawer.innerHTML = '<div class="x-whd__bd" data-cw="close"></div><aside class="x-whd__p" role="dialog" aria-modal="true" aria-label="My watch history"><header><h3>My watch history</h3><button type="button" class="x-whd__x" data-cw="close" aria-label="Close">×</button></header><div class="x-whd__stats"></div><div class="x-whd__list"></div><footer><button type="button" class="x-cw__btn" data-cw="clear">Clear history</button></footer></aside>';
      document.body.appendChild(drawer);
      drawer.addEventListener("click", onClick);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer && !drawer.hidden) closeDrawer(); });
    }
    var all = list(), tot = all.reduce(function (s, x) { return s + (x.r.sec || 0); }, 0), done = all.filter(function (x) { return x.r.done; }).length;
    drawer.querySelector(".x-whd__stats").innerHTML = '<div><b>' + all.length + "</b><span>talks started</span></div><div><b>" + done + "</b><span>finished</span></div><div><b>" + fmt(tot) + "</b><span>time watched</span></div>";
    drawer.querySelector(".x-whd__list").innerHTML = all.length ? all.map(function (x) {
      var v = vidOf(x.id);
      return '<button type="button" class="x-whd__it" data-cw-play="' + esc(x.id) + '"><span class="x-dur-w"><img src="' + AP.thumb(x.id) + '" alt="" loading="lazy" decoding="async" width="112" height="63">' + (window.XDur ? XDur.html(x.id) : "") + '</span><span><b>' + esc(v.t) + "</b><small>" + esc(v.c || "") + " · " + ago(x.r.last) + " · watched " + fmt(x.r.sec || 0) + '</small><span class="x-cw__bar"><i style="width:' + pctOf(x) + '%"></i></span></span></button>';
    }).join("") : '<p class="x-wh__muted">Nothing watched yet. Press play on any talk and it appears here.</p>';
    drawer.hidden = false; requestAnimationFrame(function () { drawer.classList.add("is-open"); });
    var x = drawer.querySelector(".x-whd__x"); if (x) x.focus({ preventScroll: true });
  };
  var closeDrawer = function () { if (!drawer) return; drawer.classList.remove("is-open"); setTimeout(function () { drawer.hidden = true; }, 260); };

  var onClick = function (e) {
    var p = e.target.closest("[data-cw-play]");
    if (p) { e.preventDefault(); var id = p.getAttribute("data-cw-play"); closeDrawer(); (AP.keepScroll || function (f) { f(); })(function () { AP.watch(vidOf(id)); }); return; }
    var c = e.target.closest("[data-cw]"); if (!c) return;
    var a = c.getAttribute("data-cw");
    if (a === "open") openDrawer();
    else if (a === "close") closeDrawer();
    else if (a === "clear") { if (window.confirm("Clear your watch history on this device?")) { W = {}; dirty = true; flush(); closeDrawer(); paintRow(); } }
  };
  document.addEventListener("click", function (e) { if (row && row.contains(e.target)) onClick(e); });

  var rowT = 0;
  var known = Object.keys(W).length;
  /* Static by design: the row is only redrawn when a new video is added to the history, never on a timer. */
  /* The row is drawn once at load; while the page is open only its labels and bars update in place (onSaved). */
  /* painted once at load, not after a delay, so nothing below it shifts later */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paintRow); else paintRow();

  window.ArchiveWatch = { history: function () { return W; }, open: openDrawer };
})();
