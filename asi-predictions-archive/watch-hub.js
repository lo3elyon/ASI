/* Watch hub add-on: per-second watch tracking for every ArchivePlayer (site or YouTube controls),
   an info panel under each player (About, Context highlights, Speaker), a "Continue watching" row
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

  /* ---------- info panel under each player ---------- */
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

  var about = function (v) {
    var sp = speakers(v), y = AP.year ? AP.year(v.d) : 0, kind = KINDS[v.k] || (v.k ? v.k : "video");
    var who = sp.length ? sp.map(function (p) { return p.name; }).join(", ") : (v.c || "the speaker");
    /* "An" before a vowel sound: an interview, an archival clip */
    var art = /^[aeiou]/i.test(kind) ? "An " : "A ";
    var tp = topics(v);
    var paras = [];
    paras.push(art + esc(kind) + (who ? " featuring <b>" + esc(who) + "</b>" : "") + (v.c ? ", published on the " + esc(v.c) + " channel" : "") + (y ? " (" + y + ")" : "") + "." +
      (tp.length ? " It touches on " + esc(tp.join(", ").toLowerCase()) + (y ? ", recorded in " + eraOf(y) : "") + "." : ""));
    if (v.s) String(v.s).split(/\n\s*\n|\n/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) { paras.push(esc(s)); });
    if (sp[0]) { var bio = firstSentence((DETAIL[sp[0].id] && (DETAIL[sp[0].id].background || [])[0]) || sp[0].bio); if (bio) paras.push('<span class="x-wh__muted">About the speaker: ' + esc(bio) + "</span>"); }
    var meta = [v.len ? "⏱ " + esc(v.len) : "", y ? "📅 " + y : "", v.k ? "🎙 " + esc(kind) : ""].filter(Boolean).map(function (m) { return '<span class="x-wh__chip">' + m + "</span>"; }).join("");
    var long = paras.length > 2 || paras.join(" ").replace(/<[^>]+>/g, "").length > 360;
    return '<div class="x-wh__desc' + (long ? " is-clamped" : "") + '">' + paras.map(function (p) { return '<p class="x-wh__p">' + p + "</p>"; }).join("") + "</div>" +
      (long ? '<button type="button" class="x-wh__toggle" data-wh-more aria-expanded="false">Show more</button>' : "") +
      '<div class="x-wh__chips">' + meta + tp.map(function (t) { return '<span class="x-wh__chip x-wh__chip--t">#' + esc(t) + "</span>"; }).join("") + "</div>";
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
    return '<p class="x-wh__note">Context highlights from the speaker\'s record in this archive, not timestamps from the video.</p><ul class="x-wh__hl">' +
      items.slice(0, 6).map(function (x, i) { return '<li style="--i:' + i + '"><span class="x-wh__ico">' + x[0] + '</span><div><b>' + esc(x[1]) + "</b><p>" + esc(String(x[2]).slice(0, 260)) + "</p></div></li>"; }).join("") + "</ul>";
  };

  var speaker = function (v) {
    var sp = speakers(v);
    if (!sp.length) return '<p class="x-wh__muted">' + (v.c ? "Channel: " + esc(v.c) + ". " : "") + "No speaker profile is linked to this video.</p>";
    return sp.slice(0, 3).map(function (p) {
      var more = Object.keys(VIDS).filter(function (id) { return id !== v.id && (VIDS[id].p || []).indexOf(p.id) >= 0; }).slice(0, 6);
      return '<div class="x-wh__sp"><div class="x-wh__sphead">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" width="56" height="56">' : '<span class="x-wh__av">' + esc(p.name[0]) + "</span>") +
        '<div class="x-wh__spwho"><a class="x-wh__name" href="#/person/' + esc(p.id) + '">' + esc(p.name) + "</a><p>" + esc([p.role, p.org].filter(Boolean).join(" · ")) + "</p></div></div>" +
        (more.length ? '<ul class="x-wh__talks" aria-label="Other talks by ' + esc(p.name) + '">' + more.map(function (id) {
          var x = VIDS[id];
          return '<li><button type="button" class="x-wh__row" data-wh-play="' + esc(id) + '" title="' + esc(x.t) + '"><img src="' + AP.thumb(id) + '" alt="" loading="lazy" decoding="async" width="96" height="54"><span class="x-wh__rowtx"><b>' + esc(x.t) + "</b>" + (x.len || x.c ? "<small>" + esc([x.c, x.len].filter(Boolean).join(" · ")) + "</small>" : "") + "</span></button></li>";
        }).join("") + "</ul>" : "") +
        '<a class="x-wh__all" href="#/person/' + esc(p.id) + '">All talks by ' + esc(p.name) + " →</a>" +
        "</div>";
    }).join("");
  };

  var TABS = [["about", "About"], ["hl", "Highlights"], ["sp", "Speaker"]];
  var attachPanel = function (inst) {
    var host = inst.root; if (!host || host.querySelector(".x-wh")) return;
    var box = document.createElement("div");
    box.className = "x-wh";
    box.innerHTML = '<div class="x-wh__tabs" role="tablist">' + TABS.map(function (t, i) { return '<button type="button" role="tab" class="x-wh__tab" data-t="' + t[0] + '" aria-selected="' + (i === 0) + '">' + t[1] + "</button>"; }).join("") + '<span class="x-wh__ind" aria-hidden="true"></span><span class="x-wh__prog" aria-live="off"></span></div><div class="x-wh__body" role="tabpanel"></div>';
    host.appendChild(box);
    var cur = "about", last = null;
    var body = box.querySelector(".x-wh__body"), ind = box.querySelector(".x-wh__ind"), prog = box.querySelector(".x-wh__prog");
    var moveInd = function () { var b = box.querySelector('[data-t="' + cur + '"]'); if (b) { ind.style.width = b.offsetWidth + "px"; ind.style.transform = "translateX(" + b.offsetLeft + "px)"; } };
    var paint = function (force) {
      var v = inst.current && inst.current(); if (!v || !v.id) { box.hidden = true; return; }
      box.hidden = false;
      if (!force && last === v.id + cur) return; last = v.id + cur;
      load();
      body.classList.remove("is-in"); void body.offsetWidth;
      body.innerHTML = cur === "about" ? about(v) : cur === "hl" ? highlights(v) : speaker(v);
      body.classList.add("is-in");
      moveInd();
    };
    var paintProg = function () { var v = inst.current && inst.current(); var r = v && W[v.id]; prog.textContent = r && r.sec ? "Watched " + fmt(r.sec) + (r.pct ? " · " + r.pct + "%" : "") : ""; };
    var keep = AP.keepScroll || function (f) { return f(); };
    box.addEventListener("click", function (e) {
      var t = e.target.closest(".x-wh__tab"); if (t) { cur = t.getAttribute("data-t"); box.querySelectorAll(".x-wh__tab").forEach(function (b) { b.setAttribute("aria-selected", b === t); }); keep(function () { paint(); }); return; }
      var mo = e.target.closest("[data-wh-more]");
      if (mo) {
        var d = mo.previousElementSibling, open = d.classList.toggle("is-clamped") === false;
        mo.setAttribute("aria-expanded", open); mo.textContent = open ? "Show less" : "Show more";
        return;
      }
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
      if (!e.target.classList.contains("x-wh__tab") || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
      var tabs = [].slice.call(box.querySelectorAll(".x-wh__tab")), i = tabs.indexOf(e.target) + (e.key === "ArrowRight" ? 1 : -1);
      var n = tabs[(i + tabs.length) % tabs.length]; n.focus({ preventScroll: true }); n.click();
    });
    window.addEventListener("resize", moveInd);
    paint(true);
    /* repainted only when the video changes or its play state changes, never on a timer */
    if (inst.on) {
      inst.on("change", function () { keep(function () { paint(false); }); paintProg(); });
      inst.on("state", function () { paintProg(); });
    }
    inst._whPaint = function () { paint(false); paintProg(); };
  };

  var insts = [];
  AP.onCreate(function (inst) { insts.push(inst); try { attachPanel(inst); } catch (e) {} });
  /* tracking only: counts seconds watched into storage; it redraws nothing */
  setInterval(function () {
    insts.forEach(function (i) { if (i.root && i.root.isConnected) { try { tick(i); } catch (e) {} } });
  }, 1000);

  /* ---------- Continue watching row + history drawer ---------- */
  var list = function () { return Object.keys(W).map(function (id) { var r = W[id]; return { id: id, r: r }; }).filter(function (x) { return x.r && x.r.last; }).sort(function (a, b) { return b.r.last - a.r.last; }); };
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
  document.addEventListener("watchprogress", function () { var n = Object.keys(W).length; if (n !== known) { known = n; (AP.keepScroll || function (f) { f(); })(paintRow); } });
  /* painted once at load, not after a delay, so nothing below it shifts later */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paintRow); else paintRow();

  window.ArchiveWatch = { history: function () { return W; }, open: openDrawer };
})();
