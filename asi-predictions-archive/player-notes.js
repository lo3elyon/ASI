/* Player notes for every ArchivePlayer (Theater, watch page, centred window, pop-out):
   chapters, transcript and summary tabs in the info panel, chapter marks on the seek bar,
   and site-drawn captions from the transcript. Never starts playback on its own; only the caption line
   and the transcript highlight follow playback. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer;
  if (!AP || !AP.onCreate) return;

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = AP.fmt || function (s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); };
  var keep = AP.keepScroll || function (f) { return f(); };
  var reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var readJSON = function (id) { try { var n = document.getElementById(id); return n ? JSON.parse(n.textContent || "null") : null; } catch (e) { return null; } };
  var CAP_URL = "https://lo3elyon.github.io/ASI/ai-safety-full-episodes/data/captions/";
  var PROV = "Chapters, summary and transcript from the AI Safety Full Episodes pipeline (auto captions; not independently verified).";

  /* ---------- data: the notes and the caption list are inline blocks, parsed on first use ---------- */
  var NOTES = null, CAPS = null;
  var notesOf = function (id) { if (!NOTES) NOTES = readJSON("d-notes") || {}; return (id && NOTES[id]) || null; };
  var capSet = function () {
    if (!CAPS) { CAPS = {}; (readJSON("d-capids") || []).forEach(function (id) { CAPS[id] = 1; }); }
    return CAPS;
  };

  /* ---------- transcripts: fetched once per video per session, only when that video opens ---------- */
  var TR = {};
  var INST = [];
  var groupCues = function (cues) {
    var out = [], cur = null;
    cues.forEach(function (c) {
      if (!cur) cur = { t: c[0], x: c[1] }; else cur.x += " " + c[1];
      if (cur.x.length >= 150 || (cur.x.length >= 50 && /[.!?]["')\]]?$/.test(c[1]))) { out.push(cur); cur = null; }
    });
    if (cur) out.push(cur);
    return out;
  };
  var parseTr = function (d) {
    var c = (d && Array.isArray(d.c) ? d.c : []).filter(function (x) { return Array.isArray(x) && isFinite(+x[0]) && typeof x[1] === "string" && x[1].trim(); })
      .map(function (x) { return [+x[0], x[1].replace(/\s+/g, " ").trim()]; });
    if (!c.length) return null;
    c.sort(function (a, b) { return a[0] - b[0]; });
    /* the files count tenths of a second: spoken lines sit about two seconds apart, so a median gap of 8 or more means tenths */
    var gaps = [];
    for (var i = 1; i < c.length; i++) gaps.push(c[i][0] - c[i - 1][0]);
    gaps.sort(function (a, b) { return a - b; });
    var med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
    if (med >= 8 || c[c.length - 1][0] > 6 * 3600) c.forEach(function (x) { x[0] = x[0] / 10; });
    var groups = groupCues(c);
    return { cues: c, starts: c.map(function (x) { return x[0]; }), groups: groups, gStarts: groups.map(function (g) { return g.t; }) };
  };
  var getTr = function (id, cb) {
    var r = TR[id];
    if (r) { if (r.state === "loading") r.waits.push(cb); else cb(r); return; }
    r = TR[id] = { state: "loading", waits: [cb] };
    var settle = function (data) {
      if (data) { r.state = "ok"; r.data = data; } else r.state = "fail";
      var w = r.waits; r.waits = [];
      w.forEach(function (f) { try { f(r); } catch (e) {} });
      if (r.state === "fail") INST.forEach(function (i) { var v = i.current(); if (v && v.id === id) i._pnFail(); });
    };
    if (!window.fetch) { settle(null); return; }
    var ctl = window.AbortController ? new AbortController() : null, to = 0;
    if (ctl) to = setTimeout(function () { ctl.abort(); }, 20000);
    fetch(CAP_URL + encodeURIComponent(id) + ".json", ctl ? { signal: ctl.signal } : undefined)
      .then(function (res) { if (!res.ok) throw new Error("http"); return res.json(); })
      .then(function (d) { clearTimeout(to); settle(parseTr(d)); })
      .catch(function () { clearTimeout(to); settle(null); });
  };
  var chStarts = function (n) { return n.__st || (n.__st = n.ch.map(function (c) { return +c[0]; })); };
  var trOf = function (id) { var r = TR[id]; return r && r.state === "ok" ? r.data : null; };
  var hasCC = function (id) { return !!(id && capSet()[id] && !(TR[id] && TR[id].state === "fail")); };
  /* the last start at or before t */
  var find = function (arr, t) {
    var lo = 0, hi = arr.length - 1, ans = -1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (arr[m] <= t + 0.05) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans;
  };

  /* ---------- caption settings, shared by every player and remembered ---------- */
  var CK = "asiArchive.captions.v1";
  var DEF = { on: false, size: 100, color: "white", bg: "semi", op: 100, font: "sans", edge: "none", pos: "bottom", y: null };
  var COLORS = { white: ["White", "#ffffff"], yellow: ["Yellow", "#ffe14d"], cyan: ["Cyan", "#67e8f9"], green: ["Green", "#86efac"] };
  var FONTS = { sans: ["Sans", "var(--sans)"], serif: ["Serif", "Georgia, 'Times New Roman', serif"], mono: ["Mono", "'Geist Mono', ui-monospace, Menlo, monospace"], rounded: ["Rounded", "ui-rounded, 'SF Pro Rounded', 'Varela Round', 'Nunito', system-ui, sans-serif"] };
  var BGS = { none: ["None", "transparent"], semi: ["Semi", "rgba(8, 10, 14, 0.62)"], solid: ["Solid", "rgb(8, 10, 14)"] };
  var EDGES = { none: ["None", "none"], shadow: ["Shadow", "0 0.06em 0.2em rgba(0, 0, 0, 0.95), 0 0 0.45em rgba(0, 0, 0, 0.7)"], outline: ["Outline", "-0.06em -0.06em 0 #000, 0.06em -0.06em 0 #000, -0.06em 0.06em 0 #000, 0.06em 0.06em 0 #000, 0 0 0.12em #000"] };
  var C = {};
  var loadC = function () {
    var got = null;
    try { got = JSON.parse(window.localStorage.getItem(CK)); } catch (e) {}
    C = {}; Object.keys(DEF).forEach(function (k) { C[k] = DEF[k]; });
    if (got && typeof got === "object") {
      C.on = !!got.on;
      if (got.size >= 75 && got.size <= 200) C.size = Math.round(got.size / 25) * 25;
      if (COLORS[got.color]) C.color = got.color;
      if (BGS[got.bg]) C.bg = got.bg;
      if (got.op >= 25 && got.op <= 100) C.op = Math.round(got.op);
      if (FONTS[got.font]) C.font = got.font;
      if (EDGES[got.edge]) C.edge = got.edge;
      if (got.pos === "top" || got.pos === "bottom") C.pos = got.pos;
      if (typeof got.y === "number" && got.y >= 0 && got.y <= 1) C.y = got.y;
    }
  };
  loadC();
  var saveC = function () { try { window.localStorage.setItem(CK, JSON.stringify(C)); } catch (e) {} };
  var everywhere = function () { INST.forEach(function (i) { try { i._pnPaint(); } catch (e) {} }); };
  var setC = function (k, v) { C[k] = v; saveC(); everywhere(); };

  var svg = function (d) { return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; };
  var IC_CC = svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M10.5 10.2a2 2 0 1 0 0 3.6M16.5 10.2a2 2 0 1 0 0 3.6"/>');
  var seg = function (k, map) {
    return Object.keys(map).map(function (x) { return '<button class="x-ap__b" type="button" data-pn="set" data-k="' + k + '" data-v="' + x + '" aria-pressed="false">' + map[x][0] + "</button>"; }).join("");
  };
  var settingsHtml = function (uid) {
    return '<div class="x-pn-ccset" role="group" aria-label="Caption settings">' +
      '<button class="x-ap__b x-pn-ccback" type="button" data-pn="ccback"><span aria-hidden="true">‹</span> Captions</button>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Captions</p><div class="x-pn-sg x-pn-sg--2">' +
        '<button class="x-ap__b" type="button" data-pn="set" data-k="on" data-v="1" aria-pressed="false">On</button>' +
        '<button class="x-ap__b" type="button" data-pn="set" data-k="on" data-v="0" aria-pressed="false">Off</button></div></div>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Language</p><div class="x-pn-sg x-pn-sg--1"><button class="x-ap__b" type="button" aria-pressed="true" disabled>English (auto)</button></div></div>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Size <span class="x-apx-abtx" data-pn-out="size">100%</span></p><div class="x-pn-sg x-pn-sg--2">' +
        '<button class="x-ap__b" type="button" data-pn="size" data-d="-25" aria-label="Smaller captions (−)">A−</button>' +
        '<button class="x-ap__b" type="button" data-pn="size" data-d="25" aria-label="Larger captions (+)">A+</button></div></div>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Text colour</p><div class="x-pn-sg x-pn-sg--4">' +
        Object.keys(COLORS).map(function (x) { return '<button class="x-ap__b x-pn-sw" type="button" data-pn="set" data-k="color" data-v="' + x + '" aria-pressed="false" aria-label="' + COLORS[x][0] + '" title="' + COLORS[x][0] + '"><span style="background:' + COLORS[x][1] + '"></span></button>'; }).join("") + "</div></div>" +
      '<div class="x-pn-cs"><p class="x-apx-h">Background</p><div class="x-pn-sg x-pn-sg--3">' + seg("bg", BGS) + "</div></div>" +
      '<div class="x-pn-cs"><label class="x-pn-range" for="' + uid + '-op"><span class="x-apx-h">Opacity <span class="x-apx-abtx" data-pn-out="op">100%</span></span>' +
        '<input class="x-apx-range" id="' + uid + '-op" type="range" min="25" max="100" step="5" value="100" data-pn="op" /></label></div>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Font</p><div class="x-pn-sg x-pn-sg--4">' + seg("font", FONTS) + "</div></div>" +
      '<div class="x-pn-cs"><p class="x-apx-h">Edge</p><div class="x-pn-sg x-pn-sg--3">' + seg("edge", EDGES) + "</div></div>" +
      '<div class="x-pn-cs"><p class="x-apx-h">Position</p><div class="x-pn-sg x-pn-sg--3">' +
        '<button class="x-ap__b" type="button" data-pn="set" data-k="pos" data-v="bottom" aria-pressed="false">Bottom</button>' +
        '<button class="x-ap__b" type="button" data-pn="set" data-k="pos" data-v="top" aria-pressed="false">Top</button>' +
        '<button class="x-ap__b" type="button" data-pn="posreset">Reset</button></div>' +
        '<p class="x-pn-cnote">Drag the captions on the video to move them. Two lines at most.</p></div>' +
      '<button class="x-ap__b x-pn-ccreset" type="button" data-pn="ccreset">Reset caption settings</button>' +
      "</div>";
  };

  /* ---------- panel tabs ---------- */
  var chaptersHtml = function (n) {
    return '<p class="x-pn-h">' + n.ch.length + " chapters</p>" +
      '<ol class="x-pn-ch">' + n.ch.map(function (c, i) {
        return '<li><button type="button" class="x-pn-row" data-pn-seek="' + (+c[0]) + '" data-i="' + i + '" aria-label="' + esc(fmt(c[0]) + " " + c[1]) + '"><span class="x-pn-time">' + fmt(c[0]) + '</span><span class="x-pn-chx">' + esc(c[1]) + "</span></button></li>";
      }).join("") + "</ol>";
  };
  var summaryHtml = function (n) {
    var kc = (n.kc || []).filter(function (k) { return k && k[1]; });
    return '<div class="x-pn-sum">' +
      (n.s ? '<p class="x-pn-h">Summary</p><p class="x-pn-p">' + esc(n.s) + "</p>" : "") +
      (n.ww ? '<div class="x-pn-ww"><p class="x-pn-h">Why watch</p><p class="x-pn-p">' + esc(n.ww) + "</p></div>" : "") +
      (kc.length ? '<p class="x-pn-h">Key claims</p><ul class="x-pn-kc">' + kc.map(function (k) {
        var t = k[0] == null || !isFinite(+k[0]) ? null : +k[0];
        return "<li>" + (t != null ? '<button type="button" class="x-pn-tb" data-pn-seek="' + t + '" aria-label="Play from ' + fmt(t) + '">' + fmt(t) + "</button>" : '<span class="x-pn-tb x-pn-tb--none" aria-hidden="true">·</span>') +
          '<div class="x-pn-q"><q>' + esc(k[1]) + "</q>" + (k[2] ? "<small>" + esc(k[2]) + "</small>" : "") + "</div></li>";
      }).join("") + "</ul>" : "") +
      '<p class="x-pn-prov">' + PROV + "</p></div>";
  };
  var transcriptShell = function (uid) {
    return '<div class="x-pn-tr">' +
      '<div class="x-pn-trbar">' +
        '<label class="x-pn-search" for="' + uid + '-q"><span class="x-pn-sr">Search the transcript</span>' +
          '<input id="' + uid + '-q" type="search" placeholder="Search transcript" autocomplete="off" spellcheck="false" data-pn="q" /></label>' +
        '<button type="button" class="x-pn-btn" data-pn="copy">Copy transcript</button>' +
      "</div>" +
      '<p class="x-pn-trmeta" aria-live="polite">Loading transcript…</p>' +
      '<div class="x-pn-trwrap"><div class="x-pn-list" aria-label="Transcript" tabindex="-1"></div>' +
        '<button type="button" class="x-pn-resume" data-pn="resume" hidden><span aria-hidden="true">↻</span> Resume sync</button></div>' +
      "</div>";
  };

  var uidN = 0;
  function setup(inst) {
    var root = inst.root, screen = inst.screen, bar = inst.bar;
    if (!root || !screen || root.__pn) return;
    root.__pn = true;
    var uid = "pn" + (++uidN);
    var S = { vid: "", capKey: null, chI: -2, gi: -2, follow: true, q: "", prog: 0, userAt: 0, timer: 0, chList: null, list: null, meta: null, chip: null, segD: -1 };
    inst._pn = S;
    INST.push(inst);
    var cur = function () { return inst.current ? inst.current() : null; };

    /* ---- the caption layer over the video ---- */
    var cap = document.createElement("div");
    cap.className = "x-pn-cap is-bottom";
    cap.setAttribute("aria-hidden", "true");
    cap.innerHTML = '<div class="x-pn-cap__win" title="Drag to move the captions"></div>';
    screen.appendChild(cap);
    var capWin = cap.firstChild;
    var sizeT = function () {
      /* about 15px on a phone or the small pop-out, 20px at 640px wide, 32px at 1280px, 36px at most, before the size setting */
      var w = screen.clientWidth || 640;
      var fs = Math.max(12, Math.min(36, 9 + w * 0.018) * C.size / 100);
      root.style.setProperty("--x-pn-fs", fs.toFixed(1) + "px");
    };
    var barH = function () { if (bar) root.style.setProperty("--x-pn-barh", (bar.offsetHeight || 0) + "px"); };
    if ("ResizeObserver" in window) {
      new ResizeObserver(sizeT).observe(screen);
      if (bar) new ResizeObserver(barH).observe(bar);
    } else window.addEventListener("resize", function () { sizeT(); barH(); });

    var paintCap = function () {
      root.style.setProperty("--x-pn-col", COLORS[C.color][1]);
      root.style.setProperty("--x-pn-bg", BGS[C.bg][1]);
      root.style.setProperty("--x-pn-op", String(C.op / 100));
      root.style.setProperty("--x-pn-font", FONTS[C.font][1]);
      root.style.setProperty("--x-pn-edge", EDGES[C.edge][1]);
      var free = C.y != null;
      cap.classList.toggle("is-free", free);
      cap.classList.toggle("is-top", !free && C.pos === "top");
      cap.classList.toggle("is-bottom", !free && C.pos !== "top");
      if (free) cap.style.setProperty("--x-pn-y", (C.y * 100).toFixed(2) + "%"); else cap.style.removeProperty("--x-pn-y");
      sizeT();
    };

    /* drag the caption block up or down; a tap without a drag plays or pauses, like the rest of the video */
    var drag = null;
    capWin.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) return;
      ev.preventDefault(); ev.stopPropagation();
      try { capWin.setPointerCapture(ev.pointerId); } catch (e) {}
      drag = { id: ev.pointerId, y: ev.clientY, moved: false };
    });
    capWin.addEventListener("pointermove", function (ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      if (!drag.moved && Math.abs(ev.clientY - drag.y) < 5) return;
      drag.moved = true; cap.classList.add("is-drag");
      var r = screen.getBoundingClientRect();
      if (r.height > 0) { C.y = Math.max(0.08, Math.min(0.92, (ev.clientY - r.top) / r.height)); paintCap(); }
    });
    var endDrag = function (ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var moved = drag.moved; drag = null; cap.classList.remove("is-drag");
      try { capWin.releasePointerCapture(ev.pointerId); } catch (e) {}
      if (moved) { saveC(); everywhere(); }
      else if (ev.type === "pointerup" && inst.toggle) inst.toggle();
    };
    capWin.addEventListener("pointerup", endDrag);
    capWin.addEventListener("pointercancel", endDrag);
    capWin.addEventListener("click", function (ev) { ev.stopPropagation(); });

    /* ---- the CC button and the ⚙ menu's caption settings ---- */
    var ccB = function () { return root.querySelector('[data-x="cc"]'); };
    var paintBtn = function () {
      var b = ccB(); if (!b) return;
      var v = cur(), ok = !!(v && hasCC(v.id));
      b.setAttribute("aria-pressed", String(!!C.on));
      b.classList.toggle("is-na", !ok);
      var l = ok ? "Captions (C)" : "Captions (C): none for this video";
      b.setAttribute("aria-label", l); b.setAttribute("data-tip", l);
    };
    var menu = root.querySelector(".x-apx-menu"), setEl = null;
    if (menu) {
      var openB = '<button class="x-ap__b x-pn-ccopen" type="button" data-pn="ccmenu">' + IC_CC + '<span class="x-apx-lbl">Captions</span><span class="x-pn-ccv" aria-hidden="true"></span></button>';
      var loopB = menu.querySelector(".x-apx-loop");
      if (loopB) loopB.insertAdjacentHTML("beforebegin", openB); else menu.insertAdjacentHTML("afterbegin", openB);
      menu.insertAdjacentHTML("beforeend", settingsHtml(uid));
      setEl = menu.querySelector(".x-pn-ccset");
      if ("MutationObserver" in window) new MutationObserver(function () { if (menu.hidden) menu.classList.remove("is-pn-cc"); }).observe(menu, { attributes: true, attributeFilter: ["hidden"] });
      setEl.querySelector('[data-pn="op"]').addEventListener("input", function () { setC("op", +this.value); });
    }
    var paintSet = function () {
      if (!setEl) return;
      setEl.querySelectorAll('[data-pn="set"]').forEach(function (b) {
        var k = b.getAttribute("data-k"), v = b.getAttribute("data-v");
        var on = k === "on" ? String(C.on ? 1 : 0) === v : k === "pos" ? C.y == null && C.pos === v : String(C[k]) === v;
        b.setAttribute("aria-pressed", String(on));
      });
      setEl.querySelector('[data-pn-out="size"]').textContent = C.size + "%";
      setEl.querySelector('[data-pn-out="op"]').textContent = C.op + "%";
      var r = setEl.querySelector('[data-pn="op"]'); if (+r.value !== C.op) r.value = C.op;
      r.style.setProperty("--x-ap-pct", ((C.op - 25) / 75 * 100) + "%");
      setEl.querySelector('[data-pn="size"][data-d="-25"]').disabled = C.size <= 75;
      setEl.querySelector('[data-pn="size"][data-d="25"]').disabled = C.size >= 200;
      var v = menu.querySelector(".x-pn-ccv"); if (v) v.textContent = C.on ? "On · " + C.size + "%" : "Off";
    };
    var setSize = function (d) {
      var n = Math.max(75, Math.min(200, C.size + d));
      if (n === C.size) { inst.say("Caption size " + n + "%"); return; }
      setC("size", n); inst.say("Caption size " + n + "%");
    };
    inst.ccToggle = function () {
      setC("on", !C.on);
      var v = cur();
      inst.say(C.on ? (v && hasCC(v.id) ? "Captions on" : "Captions on; this video has no transcript") : "Captions off");
    };
    inst.ccSize = setSize;
    /* the chapter under a time, for the seek bar's hover preview */
    inst.chapterAt = function (t) {
      var v = cur(), n = v && notesOf(v.id); if (!n || !n.ch || !n.ch.length) return "";
      var i = find(chStarts(n), t);
      return i >= 0 ? n.ch[i][1] : "";
    };

    /* ---- chapter marks on the seek bar ---- */
    var seekEl = inst.seek, track = root.querySelector(".x-apx-track"), segs = null;
    if (track) { segs = document.createElement("span"); segs.className = "x-pn-segs"; track.insertBefore(segs, track.firstChild); }
    var placeTrack = function () {
      if (!track || !seekEl || !seekEl.offsetWidth) return;
      track.style.left = (seekEl.offsetLeft + 7) + "px";
      track.style.width = Math.max(0, seekEl.offsetWidth - 14) + "px";
    };
    if (seekEl && "ResizeObserver" in window) new ResizeObserver(placeTrack).observe(seekEl);
    var paintSegs = function () {
      if (!segs) return;
      var v = cur(), n = v && notesOf(v.id), d = inst.duration ? inst.duration() : 0;
      S.segD = d;
      if (!n || !n.ch || n.ch.length < 2 || !(d > 0)) { segs.innerHTML = ""; return; }
      placeTrack();
      segs.innerHTML = n.ch.filter(function (c) { return +c[0] > 0 && +c[0] < d; }).map(function (c) {
        return '<i style="left:' + (Math.min(100, (+c[0] / d) * 100)).toFixed(3) + '%"></i>';
      }).join("");
    };

    /* ---- following playback: the caption line, the current chapter and transcript line ---- */
    var keepInView = function (el) {
      var L = S.list, vh = L.clientHeight; if (!(vh > 0)) return;
      var top = el.offsetTop, h = el.offsetHeight, vt = L.scrollTop;
      if (top >= vt + vh * 0.12 && top + h <= vt + vh * 0.72) return;
      var y = Math.max(0, top - vh * 0.3);
      S.prog = Date.now() + 900;
      try { L.scrollTo({ top: y, behavior: reduced.matches ? "auto" : "smooth" }); } catch (e) { L.scrollTop = y; }
    };
    var update = function (t) {
      var v = cur(); if (!v) return;
      if (t == null) t = inst.started() ? inst.now() : 0;
      var tr = trOf(v.id);
      /* captions */
      var key = "", html = "";
      if (C.on && tr && inst.started() && inst.yt()) {
        var st = tr.starts, i = find(st, t);
        if (i >= 0) {
          var s = st[i], nx = i + 1 < st.length ? st[i + 1] : s + 6;
          if (t < nx + 0.6 && t - s < 9) {
            var p = i > 0 && s - st[i - 1] < 5 ? i - 1 : -1;
            key = p + ":" + i;
            html = (p >= 0 ? '<div class="x-pn-cap__l"><span>' + esc(tr.cues[p][1]) + "</span></div>" : "") + '<div class="x-pn-cap__l"><span>' + esc(tr.cues[i][1]) + "</span></div>";
          }
        }
      }
      if (key !== S.capKey) { S.capKey = key; capWin.innerHTML = html; }
      /* chapters */
      var n = notesOf(v.id);
      if (S.chList && S.chList.isConnected && S.chList.__id === v.id && n && n.ch) {
        var ci = find(chStarts(n), t);
        if (ci !== S.chI) {
          S.chI = ci;
          S.chList.querySelectorAll(".x-pn-row").forEach(function (b, k) { if (k === ci) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
        }
      }
      /* transcript */
      if (tr && S.list && S.list.isConnected && S.list.__id === v.id) {
        var gi = find(tr.gStarts, t);
        if (gi !== S.gi) {
          var old = S.list.querySelector(".x-pn-line.is-now");
          if (old) { old.classList.remove("is-now"); old.removeAttribute("aria-current"); }
          S.gi = gi;
          var el = gi >= 0 ? S.list.children[gi] : null;
          if (el) { el.classList.add("is-now"); el.setAttribute("aria-current", "true"); if (S.follow && !S.q && !el.hidden) keepInView(el); }
        }
      }
    };
    var start = function () { if (!S.timer) S.timer = setInterval(function () { update(); }, 250); };
    var stop = function () { clearInterval(S.timer); S.timer = 0; };
    inst.on("state", function (s) { if (s === 1) start(); else stop(); update(); if (S.segD !== inst.duration()) paintSegs(); });
    inst.on("ready", function () { paintSegs(); update(); });
    inst.on("tick", function (t) { if (S.segD !== inst.duration()) paintSegs(); if (!S.timer) update(t); });
    inst.on("change", function (v) {
      stop();
      S.vid = v && v.id; S.capKey = null; capWin.innerHTML = ""; S.chI = -2; S.gi = -2; S.follow = true;
      if (v && hasCC(v.id)) getTr(v.id, function () { if (cur() === v) { S.gi = -2; update(); paintBtn(); } });
      paintSegs(); paintBtn(); update();
    });
    inst._pnFail = function () { paintBtn(); capWin.innerHTML = ""; S.capKey = null; if (inst._whSync) inst._whSync(); };
    inst._pnPaint = function () { paintCap(); paintSet(); paintBtn(); S.capKey = null; update(); };
    inst._pnUpdate = update;

    /* ---- transcript list ---- */
    var setFollow = function (on) {
      S.follow = on;
      if (S.chip && S.chip.isConnected) S.chip.hidden = on || !!S.q;
    };
    var fillTranscript = function (v, box) {
      var tr = trOf(v.id), list = box.querySelector(".x-pn-list"), meta = box.querySelector(".x-pn-trmeta");
      if (!tr) { meta.textContent = "The transcript could not be loaded."; return; }
      list.innerHTML = tr.groups.map(function (g, i) {
        return '<button type="button" class="x-pn-line" data-pn-seek="' + g.t + '" data-gi="' + i + '"><span class="x-pn-time">' + fmt(g.t) + '</span><span class="x-pn-tx">' + esc(g.x) + "</span></button>";
      }).join("");
      list.__id = v.id;
      meta.textContent = tr.groups.length.toLocaleString("en-US") + " lines · tap a line to jump there";
      S.list = list; S.meta = meta; S.chip = box.querySelector(".x-pn-resume"); S.gi = -2; S.q = "";
      var inp = box.querySelector('[data-pn="q"]'); if (inp && inp.value) { S.q = ""; search(inp.value); }
      setFollow(true);
      var mark = function () { S.userAt = Date.now(); };
      list.addEventListener("wheel", mark, { passive: true });
      list.addEventListener("touchstart", mark, { passive: true });
      list.addEventListener("pointerdown", mark);
      list.addEventListener("keydown", mark);
      list.addEventListener("scroll", function () {
        if (Date.now() < S.prog || Date.now() - S.userAt > 1500) return;
        if (S.follow) setFollow(false);
      }, { passive: true });
      update();
    };
    var search = function (raw) {
      var tr = S.vid && trOf(S.vid), list = S.list;
      if (!tr || !list || !list.isConnected) return;
      var q = String(raw || "").trim().toLowerCase();
      if (q === S.q) return;
      S.q = q;
      var terms = q ? q.split(/\s+/).filter(Boolean) : [];
      var re = terms.length ? new RegExp("(" + terms.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "gi") : null;
      var hits = 0;
      [].forEach.call(list.children, function (el, i) {
        var g = tr.groups[i], tx = el.querySelector(".x-pn-tx"); if (!g) return;
        if (!re) { el.hidden = false; if (el.__m) { tx.textContent = g.x; el.__m = false; } return; }
        var low = g.x.toLowerCase(), ok = terms.every(function (x) { return low.indexOf(x) >= 0; });
        el.hidden = !ok;
        if (ok) { hits++; tx.innerHTML = esc(g.x).replace(re, "<mark>$1</mark>"); el.__m = true; }
        else if (el.__m) { tx.textContent = g.x; el.__m = false; }
      });
      if (S.meta) S.meta.textContent = re ? (hits ? hits.toLocaleString("en-US") + (hits === 1 ? " matching line" : " matching lines") : "No lines match “" + raw.trim() + "”") : tr.groups.length.toLocaleString("en-US") + " lines · tap a line to jump there";
      list.scrollTop = 0;
      if (!re) { setFollow(true); S.gi = -2; update(); }
      else if (S.chip) S.chip.hidden = true;
    };
    var copyText = function (btn) {
      var v = cur(), tr = v && trOf(v.id); if (!tr) return;
      var text = (v.t ? v.t + "\n" : "") + "https://www.youtube.com/watch?v=" + v.id + "\n\n" +
        tr.groups.map(function (g) { return "[" + fmt(g.t) + "] " + g.x; }).join("\n") + "\n\n" + PROV + "\n";
      var ok = function () { btn.textContent = "Copied"; inst.say("Transcript copied"); setTimeout(function () { btn.textContent = "Copy transcript"; }, 1600); };
      var old = function () {
        var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.top = "0"; ta.style.left = "0"; ta.style.opacity = "0";
        (root.closest("dialog, .x-pop") || document.body).appendChild(ta);
        try { ta.focus({ preventScroll: true }); } catch (e) {}
        ta.select();
        try { document.execCommand("copy"); ok(); } catch (e) { inst.say("Copy is not available here."); }
        ta.remove();
        try { btn.focus({ preventScroll: true }); } catch (e) {}
      };
      try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, old); else old(); } catch (e) { old(); }
    };

    /* the panel calls this to draw a notes tab into its pane */
    inst._pnRender = function (key, v, pane) {
      var n = notesOf(v.id);
      S.vid = v.id;
      if (key === "ch" && n && n.ch) {
        pane.innerHTML = chaptersHtml(n);
        S.chList = pane.querySelector(".x-pn-ch"); S.chList.__id = v.id; S.chI = -2;
      } else if (key === "sum" && n) {
        pane.innerHTML = summaryHtml(n);
      } else if (key === "tr") {
        pane.innerHTML = transcriptShell(uid);
        var box = pane.querySelector(".x-pn-tr");
        var r = TR[v.id];
        if (r && r.state === "ok") fillTranscript(v, box);
        else getTr(v.id, function (rr) { if (rr.state === "ok" && box.isConnected && cur() && cur().id === v.id) fillTranscript(v, box); });
      } else pane.innerHTML = '<p class="x-wh__muted">Nothing here for this video.</p>';
      update();
    };

    /* one delegated handler for the panel and the menu */
    var seekTo = function (t) {
      t = Math.max(0, +t || 0);
      setFollow(true);
      keep(function () {
        if (inst.started() && inst.yt()) { inst.seekTo(t); S.gi = -2; S.chI = -2; update(t); }
        else if (inst.playAt) inst.playAt(t);
      });
    };
    root.addEventListener("click", function (ev) {
      var s = ev.target.closest("[data-pn-seek]");
      if (s && root.contains(s)) { ev.preventDefault(); seekTo(s.getAttribute("data-pn-seek")); return; }
      var b = ev.target.closest("[data-pn]"); if (!b || !root.contains(b)) return;
      var a = b.getAttribute("data-pn");
      if (a === "resume") { setFollow(true); S.gi = -2; update(); }
      else if (a === "copy") copyText(b);
      else if (a === "ccmenu" && menu) { menu.classList.add("is-pn-cc"); paintSet(); menu.scrollTop = 0; var f = menu.querySelector(".x-pn-ccback"); if (f) f.focus({ preventScroll: true }); }
      else if (a === "ccback" && menu) { menu.classList.remove("is-pn-cc"); var o = menu.querySelector(".x-pn-ccopen"); if (o) o.focus({ preventScroll: true }); }
      else if (a === "set") {
        var k = b.getAttribute("data-k"), v = b.getAttribute("data-v");
        if (k === "on") { if ((v === "1") !== C.on) inst.ccToggle(); }
        else if (k === "pos") { C.y = null; setC("pos", v); }
        else setC(k, v);
      }
      else if (a === "size") setSize(+b.getAttribute("data-d"));
      else if (a === "posreset") { C.y = null; setC("pos", "bottom"); inst.say("Caption position reset"); }
      else if (a === "ccreset") { var on = C.on; loadC(); Object.keys(DEF).forEach(function (k2) { C[k2] = DEF[k2]; }); C.on = on; saveC(); everywhere(); inst.say("Caption settings reset"); }
    });
    var qT = 0;
    root.addEventListener("input", function (ev) {
      if (!ev.target.matches || !ev.target.matches('.x-pn-search input')) return;
      var val = ev.target.value;
      clearTimeout(qT); qT = setTimeout(function () { search(val); }, 140);
    });
    root.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && ev.target.matches && ev.target.matches(".x-pn-search input") && ev.target.value) { ev.preventDefault(); ev.stopPropagation(); ev.target.value = ""; search(""); }
    });

    paintCap(); paintSet(); paintBtn(); barH();
  }

  window.ArchiveNotes = {
    hasCC: hasCC,
    notes: notesOf,
    /* whether a video has a given notes tab: ch (chapters), tr (transcript), sum (summary) */
    has: function (v, key) {
      if (!v || !v.id) return false;
      var n = notesOf(v.id);
      if (key === "ch") return !!(n && n.ch && n.ch.length);
      if (key === "sum") return !!(n && (n.s || n.ww || (n.kc && n.kc.length)));
      if (key === "tr") return hasCC(v.id);
      return false;
    },
    render: function (key, v, pane, inst) { if (inst && inst._pnRender) inst._pnRender(key, v, pane); }
  };

  AP.onCreate(setup);
})();
