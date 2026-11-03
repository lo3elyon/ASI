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
    if (tp.length) more.push('<div class="x-wh__tags">' + tp.map(function (t) { return '<span class="x-wh__tag">#' + esc(t) + "</span>"; }).join("") + "</div>");
    var chips = [v.c ? ["📺", v.c, "Channel"] : null, y ? ["📅", y, "Year"] : null, v.len ? ["⏱", v.len, "Length"] : null].filter(Boolean)
      .map(function (c) { return '<span class="x-wh__chip" title="' + c[2] + '"><span aria-hidden="true">' + c[0] + "</span> " + esc(c[1]) + "</span>"; }).join("");
    var id = "whf" + (++seq), sum = [lead].concat(desc).join(" ");
    /* the summary shows three lines; the button appears when there is more to read */
    var long = more.length || sum.replace(/<[^>]+>/g, "").length > 150;
    return '<div class="x-wh__about">' +
      '<h3 class="x-wh__title">' + esc(v.t) + "</h3>" +
      (chips ? '<div class="x-wh__chips">' + chips + "</div>" : "") +
      '<div class="x-wh__desc" id="' + id + '"><p class="x-wh__sum">' + sum + "</p>" + (more.length ? '<div class="x-wh__full">' + more.join("") + "</div>" : "") + "</div>" +
      (long ? '<button type="button" class="x-wh__toggle" data-wh-more aria-expanded="false" aria-controls="' + id + '">Read full description</button>' : "") +
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
          return '<li><button type="button" class="x-wh__row" data-wh-play="' + esc(id) + '" title="' + esc(x.t) + '"><img src="' + AP.thumb(id) + '" alt="" loading="lazy" decoding="async" width="96" height="54"><span class="x-wh__rowtx"><b>' + esc(x.t) + "</b>" + (x.len || x.c ? "<small>" + esc([x.c, x.len].filter(Boolean).join(" · ")) + "</small>" : "") + "</span></button></li>";
        }).join("") + "</ul>" : "") +
        "</div>";
    }).join("");
  };

  /* [key, label, icon, tooltip] */
  var TABS = [["about", "About", "ℹ", "About this talk"], ["ch", "Chapters", "≡", "Chapters"], ["tr", "Transcript", "¶", "Transcript"], ["sum", "Summary", "✎", "Summary and key claims"],
    ["hl", "Highlights", "✦", "Context highlights"], ["sp", "Speaker", "👤", "Speaker profile"]];
  /* the notes tabs (player-notes.js) show only for videos that have them */
  var NOTE_TABS = { ch: 1, tr: 1, sum: 1 };
  var NX = function () { return window.ArchiveNotes || null; };
  var UPTAB = ["up", "Up next", "▶", "Up next in this window"];
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
    var tabs = TABS.concat(list ? [UPTAB] : []);
    var uid = "wh" + (++seq);
    var box = document.createElement("div");
    box.className = "x-wh";
    box.innerHTML =
      '<div class="x-wh__main" id="' + uid + '-main">' +
        '<p class="x-wh__prog" aria-live="off"></p>' +
        '<div class="x-wh__body" id="' + uid + '-body" role="tabpanel" tabindex="-1"><div class="x-wh__pane"></div>' + (list ? '<div class="x-wh__up" hidden></div>' : "") + "</div>" +
        '<button type="button" class="x-wh__down" data-wh-down hidden aria-label="Scroll the panel down">↓ more</button>' +
      "</div>" +
      '<div class="x-wh__rail">' +
        '<div class="x-wh__tabs" role="tablist" aria-label="Video info">' + tabs.map(function (t, i) {
          return '<button type="button" role="tab" class="x-wh__tab" id="' + uid + "-" + t[0] + '" data-t="' + t[0] + '" aria-selected="' + (i === 0) + '" aria-controls="' + uid + '-body" tabindex="' + (i === 0 ? 0 : -1) + '" data-wtip="' + t[3] + '">' +
            '<span class="x-wh__ic" aria-hidden="true">' + t[2] + '</span><span class="x-wh__lb">' + t[1] + "</span></button>";
        }).join("") + "</div>" +
        '<button type="button" class="x-wh__fold" data-wh-fold aria-controls="' + uid + '-main"><span class="x-wh__ic" aria-hidden="true"></span><span class="x-wh__lb"></span></button>' +
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
      /* the wide window puts the video across the full width, with the panel under it */
      var on = !!(wide && wide.matches) && host.clientWidth >= SIDE_MIN && !(pop && (!pop.classList.contains("is-modal") || pop.classList.contains("is-wide")));
      if (on === side && host.classList.contains("is-wh-side") === on) return;
      side = on; host.classList.toggle("is-wh-side", on);
      orient(); edges();
    };

    /* soft fade masks and the "more" chevron, only when the side panel has more to show */
    var edges = function () {
      var can = isSide() && !folded && !box.hidden && body.scrollHeight - body.clientHeight > 2;
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
    };
    var slideIn = function () { body.classList.remove("is-in"); void body.offsetWidth; body.classList.add("is-in"); };
    var showCurrentInList = function () {
      var c = up && up.querySelector('[aria-current="true"]'); if (!c || !isSide()) return;
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
        if (anim) { slideIn(); body.scrollTop = 0; showCurrentInList(); }
        edges(); return;
      }
      pane.hidden = false; if (up) up.hidden = true;
      if (!force && last === v.id + cur) { if (anim) { slideIn(); body.scrollTop = 0; } edges(); return; }
      last = v.id + cur;
      load();
      if (NOTE_TABS[cur] && NX()) { pane.innerHTML = ""; NX().render(cur, v, pane, inst); }
      else pane.innerHTML = cur === "about" ? about(v) : cur === "hl" ? highlights(v) : speaker(v);
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
        var k = t.getAttribute("data-t"), reopen = folded && isSide();
        if (k === cur && !reopen) return;
        select(k);
        keep(function () { if (reopen) setFold(false, true); paint(false, true); });
        return;
      }
      if (e.target.closest("[data-wh-fold]")) { keep(function () { setFold(!folded, true); }); return; }
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
      if (e.target.closest('a[href^="#/person/"]') && AP.isWatching && AP.isWatching()) AP.closePopout();
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
    inst._whPaint = function () { paint(false); paintProg(); };
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
        return '<button type="button" class="x-cw__card" style="--i:' + i + '" data-cw-play="' + esc(x.id) + '"><span class="x-cw__th"><img src="' + AP.thumb(x.id) + '" alt="" loading="lazy" decoding="async" width="240" height="135"><span class="x-cw__bar"><i style="width:' + pctOf(x) + '%"></i></span>' + (x.r.done ? '<span class="x-cw__done">✓ Watched</span>' : '<span class="x-cw__res">▶ Resume ' + fmt(posOf(x.id)) + "</span>") + '</span><span class="x-cw__t">' + esc(v.t) + '</span><span class="x-cw__m">' + esc(v.c || "") + " · " + ago(x.r.last) + "</span></button>";
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
      return '<button type="button" class="x-whd__it" data-cw-play="' + esc(x.id) + '"><img src="' + AP.thumb(x.id) + '" alt="" loading="lazy" decoding="async" width="112" height="63"><span><b>' + esc(v.t) + "</b><small>" + esc(v.c || "") + " · " + ago(x.r.last) + " · watched " + fmt(x.r.sec || 0) + '</small><span class="x-cw__bar"><i style="width:' + pctOf(x) + '%"></i></span></span></button>';
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
