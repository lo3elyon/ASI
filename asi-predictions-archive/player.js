/* ArchivePlayer: a poster-first YouTube player shared by the Media Theater and, later, person and history pages.
   Nothing plays until the reader presses Play. */
(function () {
  "use strict";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var fmt = function (s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? h + ":" + pad(m) + ":" + pad(x) : m + ":" + pad(x);
  };
  var parseLen = function (t) {
    if (!t) return 0;
    return String(t).split(":").reduce(function (a, b) { return a * 60 + (+b || 0); }, 0);
  };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var cleanDate = function (d) { return d && d !== "None" ? String(d) : ""; };
  var fmtDate = function (d) {
    d = cleanDate(d); if (!d) return "";
    var p = d.split("-");
    if (p.length === 3) return +p[2] + " " + MON[+p[1] - 1] + " " + p[0];
    if (p.length === 2) return MON[+p[1] - 1] + " " + p[0];
    return p[0];
  };
  var SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
  var ytUrl = function (id, t) { return "https://www.youtube.com/watch?v=" + id + (t > 0 ? "&t=" + Math.floor(t) + "s" : ""); };
  var ICON = {
    play: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    pause: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
    big: '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'
  };

  /* ---------- storage: resume position, watched state, autoplay toggle ---------- */
  var KEY = "asiArchive.player.v1";
  var store = { p: {}, w: {}, auto: false };
  try { var got = JSON.parse(window.localStorage.getItem(KEY)); if (got && typeof got === "object") { store.p = got.p || {}; store.w = got.w || {}; store.auto = !!got.auto; } } catch (e) {}
  var save = function () { try { window.localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  var listeners = [];
  var notify = function (id) { listeners.forEach(function (f) { try { f(id); } catch (e) {} }); };
  var progress = function (id) { return { pos: store.p[id] || 0, watched: !!store.w[id] }; };
  var record = function (id, t, dur) {
    if (!id || !(t >= 0)) return;
    var was = !!store.w[id];
    if (dur > 0 && (t >= dur - 15 || t / dur > 0.95)) { store.w[id] = 1; delete store.p[id]; }
    else if (t > 10) store.p[id] = Math.floor(t);
    save();
    if (!was && store.w[id]) notify(id);
  };

  /* ---------- the YouTube IFrame API, loaded once on the first Play ---------- */
  var api = { state: "idle", waits: [] };
  var loadApi = function (cb) {
    if (window.YT && window.YT.Player) return cb(true);
    api.waits.push(cb);
    if (api.state !== "idle") return;
    api.state = "loading";
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === "function") try { prev(); } catch (e) {}
      api.state = "ready";
      var w = api.waits; api.waits = []; w.forEach(function (f) { f(true); });
    };
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = function () { api.state = "failed"; var w = api.waits; api.waits = []; w.forEach(function (f) { f(false); }); };
    document.head.appendChild(s);
  };

  var instances = [], active = null;

  function create(root, opts) {
    opts = opts || {};
    var people = opts.people || {};
    var P = { video: null, queue: [], index: -1, yt: null, basic: false, started: false, playing: false, ended: false,
      dur: 0, rate: 1, muted: false, docked: false, manual: false, suppress: false, wide: false, seeking: false, token: 0 };

    root.classList.add("x-ap");
    root.innerHTML =
      '<div class="x-ap__slot">' +
        '<div class="x-ap__wrap">' +
          '<div class="x-ap__mini">' +
            '<button class="x-ap__b" type="button" data-a="toggle" aria-label="Play or pause"></button>' +
            '<p class="x-ap__minititle"></p>' +
            '<button class="x-ap__b" type="button" data-a="back" aria-label="Back to the player">Back</button>' +
            '<button class="x-ap__b" type="button" data-a="close" aria-label="Close the mini-player">✕</button>' +
          "</div>" +
          '<div class="x-ap__screen">' +
            '<div class="x-ap__frame"></div>' +
            '<div class="x-ap__poster"></div>' +
            '<div class="x-ap__upnext" hidden></div>' +
          "</div>" +
          '<div class="x-ap__bar">' +
            '<div class="x-ap__seekrow">' +
              '<span class="x-ap__time" data-r="cur">0:00</span>' +
              '<input class="x-ap__seek" type="range" min="0" max="0" step="1" value="0" aria-label="Seek" />' +
              '<span class="x-ap__time" data-r="dur">0:00</span>' +
            "</div>" +
            '<div class="x-ap__btns">' +
              '<button class="x-ap__b" type="button" data-a="toggle" aria-label="Play or pause"></button>' +
              '<button class="x-ap__b x-ap__t" type="button" data-a="back10" aria-label="Back 10 seconds">−10s</button>' +
              '<button class="x-ap__b x-ap__t" type="button" data-a="fwd10" aria-label="Forward 10 seconds">+10s</button>' +
              '<label class="x-ap__speed x-ap__t"><span class="x-ap__sr">Speed</span><select class="x-ap__b" data-r="speed" aria-label="Playback speed">' +
                SPEEDS.map(function (s) { return '<option value="' + s + '"' + (s === 1 ? " selected" : "") + ">" + s + "×</option>"; }).join("") +
              "</select></label>" +
              '<button class="x-ap__b x-ap__t" type="button" data-a="mute" aria-pressed="false">Mute</button>' +
              '<span class="x-ap__gap"></span>' +
              '<button class="x-ap__b x-ap__wide" type="button" data-a="theater" aria-pressed="false">Theater</button>' +
              '<button class="x-ap__b" type="button" data-a="fs">Fullscreen</button>' +
              '<button class="x-ap__b" type="button" data-a="pop">Pop out</button>' +
              '<button class="x-ap__b" type="button" data-a="keys" aria-label="Keyboard shortcuts">?</button>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="x-ap__info"></div>' +
      '<div class="links x-ap__actions">' +
        '<button class="btn" type="button" data-a="prev">← Prev</button>' +
        '<button class="btn" type="button" data-a="next">Next →</button>' +
        '<button class="btn x-ap__auto" type="button" data-a="auto" aria-pressed="false">Autoplay next: Off</button>' +
        '<a class="btn" data-r="yt" href="#" target="_blank" rel="noopener">Open on YouTube</a>' +
        '<button class="btn" type="button" data-a="copy">Copy link</button>' +
      "</div>" +
      '<p class="x-ap__status" role="status" aria-live="polite"></p>' +
      '<dialog class="x-ap__sheet" aria-label="Keyboard shortcuts">' +
        "<h3>Keyboard shortcuts</h3>" +
        "<dl>" +
          [["Space / K", "Play or pause"], ["J / L", "Back or forward 10 seconds"], ["← / →", "Back or forward 5 seconds"], ["M", "Mute"], ["F", "Fullscreen"],
            ["T", "Theater mode"], ["N / P", "Next or previous video"], ["Shift + > / <", "Faster or slower"], ["?", "This sheet"]]
            .map(function (r) { return "<div><dt><kbd>" + r[0] + "</kbd></dt><dd>" + r[1] + "</dd></div>"; }).join("") +
        "</dl>" +
        '<div class="links"><button class="btn" type="button" data-a="sheetclose">Close</button></div>' +
      "</dialog>";

    var q = function (s) { return root.querySelector(s); };
    var slot = q(".x-ap__slot"), wrap = q(".x-ap__wrap"), frame = q(".x-ap__frame"), poster = q(".x-ap__poster"), upnext = q(".x-ap__upnext");
    var seek = q(".x-ap__seek"), tCur = q('[data-r="cur"]'), tDur = q('[data-r="dur"]'), speedSel = q('[data-r="speed"]');
    var info = q(".x-ap__info"), ytA = q('[data-r="yt"]'), status = q(".x-ap__status"), sheet = q(".x-ap__sheet"), autoB = q('[data-a="auto"]');

    var say = function (t) { status.textContent = t; clearTimeout(say.t); say.t = setTimeout(function () { status.textContent = ""; }, 2500); };
    var now = function () { try { return P.yt && P.yt.getCurrentTime ? P.yt.getCurrentTime() || 0 : 0; } catch (e) { return 0; } };

    var paintToggle = function () {
      root.querySelectorAll('[data-a="toggle"]').forEach(function (b) { b.innerHTML = P.playing ? ICON.pause : ICON.play; b.setAttribute("aria-label", P.playing ? "Pause" : "Play"); });
      root.classList.toggle("is-playing", P.playing);
    };
    var paintAuto = function () { autoB.setAttribute("aria-pressed", store.auto); autoB.textContent = "Autoplay next: " + (store.auto ? "On" : "Off"); };
    var paintNav = function () {
      var n = P.queue.length;
      q('[data-a="prev"]').disabled = n < 2; q('[data-a="next"]').disabled = n < 2;
    };
    var paintPoster = function () {
      var v = P.video; if (!v) return;
      var pr = progress(v.id), len = v.len ? '<span class="x-ap__tag">' + esc(v.len) + "</span>" : "";
      poster.innerHTML =
        '<img src="https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg" alt="" />' +
        '<button class="x-ap__big" type="button" data-a="play" aria-label="Play: ' + esc(v.t) + '">' + ICON.big + "</button>" +
        '<div class="x-ap__cap"><p class="x-ap__ctitle">' + esc(v.t) + "</p>" +
          '<p class="x-ap__cmeta">' + [esc(v.c), len].filter(Boolean).join(" ") +
          (pr.watched ? ' <span class="x-ap__tag x-ap__tag--done">✓ Watched</span>' : "") +
          (pr.pos > 0 ? ' <button class="x-ap__tag x-ap__resume" type="button" data-a="play">Resume from ' + fmt(pr.pos) + "</button>" : "") +
        "</p></div>";
      q(".x-ap__minititle").textContent = v.t;
    };
    var paintInfo = function () {
      var v = P.video; if (!v) return;
      var meta = [v.c ? esc(v.c) : "", fmtDate(v.d) ? esc(fmtDate(v.d)) : "Undated", v.k ? '<span class="pill">' + esc(v.k) + "</span>" : "", v.len ? '<span class="pill">' + esc(v.len) + "</span>" : ""].filter(Boolean).join(" · ");
      var ppl = (v.p || []).map(function (id) {
        var x = people[id], name = x ? x.name : id;
        return '<a class="x-ap__person" href="#/person/' + esc(id) + '">' + (x && x.photo ? '<img src="' + esc(x.photo) + '" alt="" loading="lazy" />' : "") + "<span>" + esc(name) + "</span></a>";
      }).join("");
      info.innerHTML = "<h3>" + esc(v.t) + '</h3><p class="x-ap__meta">' + meta + "</p>" +
        (v.s ? '<p class="x-ap__sum">' + esc(v.s) + "</p>" : "") +
        (ppl ? '<div class="x-ap__people" aria-label="People in this video">' + ppl + "</div>" : "");
    };
    var paintLink = function () { if (P.video) ytA.href = ytUrl(P.video.id, P.started ? now() : progress(P.video.id).pos); };
    var paintTime = function () {
      if (!P.yt || !P.yt.getCurrentTime) return;
      var t = now(), d = 0;
      try { d = P.yt.getDuration() || 0; } catch (e) {}
      if (d) { P.dur = d; seek.max = Math.floor(d); tDur.textContent = fmt(d); }
      if (!P.seeking) { seek.value = Math.floor(t); tCur.textContent = fmt(t); }
      seek.style.setProperty("--x-ap-pct", (P.dur ? (seek.value / P.dur) * 100 : 0) + "%");
    };

    var tick = null, saveT = 0;
    var startTick = function () {
      if (tick) return;
      tick = setInterval(function () {
        paintTime();
        if (P.playing && ++saveT % 10 === 0) record(P.video.id, now(), P.dur);
      }, 500);
    };
    var stopTick = function () { clearInterval(tick); tick = null; };

    var teardown = function () {
      stopTick();
      if (P.video && P.started && P.yt) record(P.video.id, now(), P.dur);
      try { if (P.yt && P.yt.destroy) P.yt.destroy(); } catch (e) {}
      P.yt = null; P.basic = false; P.started = false; P.playing = false; P.ended = false; P.dur = 0; P.token++;
      frame.innerHTML = "";
      root.classList.remove("is-started", "is-basic");
      seek.value = 0; seek.max = 0; tCur.textContent = "0:00"; tDur.textContent = "0:00";
      upnext.hidden = true;
      paintToggle();
    };

    /* Load a video: poster and details only. */
    var load = function (v, o) {
      o = o || {};
      if (o.queue) { P.queue = o.queue; P.index = o.index != null ? o.index : o.queue.indexOf(v); }
      else if (P.queue.indexOf(v) >= 0) P.index = P.queue.indexOf(v);
      else { P.queue = [v]; P.index = 0; }
      teardown();
      if (P.docked) undock();
      P.video = v; P.suppress = false;
      P.dur = parseLen(v.len); tDur.textContent = P.dur ? fmt(P.dur) : "0:00";
      paintPoster(); paintInfo(); paintLink(); paintNav();
      if (opts.onChange) opts.onChange(v, P.index);
    };

    var basic = function (start) {
      var v = P.video;
      P.basic = true; root.classList.add("is-basic");
      frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.id) + "?autoplay=1&rel=0&modestbranding=1&playsinline=1" + (start ? "&start=" + start : "") +
        '" title="' + esc(v.t) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      P.playing = true; paintToggle();
    };

    /* Play: only ever called from a click, a key press, or autoplay-next the reader switched on. */
    var play = function () {
      var v = P.video; if (!v) return;
      setActive(); P.suppress = false;
      if (P.started) { if (P.yt && P.yt.playVideo) { if (P.ended) { try { P.yt.seekTo(0, true); } catch (e) {} } P.yt.playVideo(); } return; }
      P.started = true; P.suppress = false; upnext.hidden = true;
      root.classList.add("is-started");
      var start = progress(v.id).pos, tok = P.token, done = false;
      frame.innerHTML = '<div class="x-ap__loading">Loading…</div>';
      var fail = setTimeout(function () { if (!done && tok === P.token) { done = true; basic(start); } }, 5000);
      loadApi(function (ok) {
        if (done || tok !== P.token) return;
        done = true; clearTimeout(fail);
        if (!ok) return basic(start);
        var host = document.createElement("div");
        frame.innerHTML = ""; frame.appendChild(host);
        try {
          P.yt = new window.YT.Player(host, {
            host: "https://www.youtube-nocookie.com",
            videoId: v.id,
            width: "100%", height: "100%",
            playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1, start: start || 0 },
            events: {
              onReady: function (e) {
                if (tok !== P.token) return;
                try { if (P.rate !== 1) e.target.setPlaybackRate(P.rate); if (P.muted) e.target.mute(); e.target.playVideo(); } catch (x) {}
                var ifr = frame.querySelector("iframe"); if (ifr) ifr.title = v.t;
                startTick(); paintTime();
              },
              onStateChange: function (e) {
                if (tok !== P.token) return;
                var s = e.data;
                P.playing = s === 1 || s === 3;
                if (s === 1) { P.ended = false; upnext.hidden = true; }
                if (s === 2) record(v.id, now(), P.dur);
                if (s === 0) { P.ended = true; record(v.id, P.dur || now(), P.dur || now()); onEnded(); }
                paintToggle(); paintLink();
                if (P.playing && !P.suppress) checkDock();
              },
              onError: function () { if (tok === P.token) say("YouTube could not play this video here. Try Open on YouTube."); }
            }
          });
        } catch (x) { basic(start); }
      });
    };
    var pause = function () { if (P.yt && P.yt.pauseVideo) P.yt.pauseVideo(); };
    var toggle = function () { if (!P.started || P.ended) play(); else if (P.basic) say("Use the video's own controls."); else if (P.playing) pause(); else play(); };
    var skip = function (d) {
      if (!P.yt || !P.yt.seekTo) return;
      var t = Math.max(0, Math.min(now() + d, P.dur || 1e9));
      P.yt.seekTo(t, true); paintTime(); say((d > 0 ? "+" : "−") + Math.abs(d) + "s");
    };
    var setRate = function (r) {
      P.rate = r; speedSel.value = String(r);
      try { if (P.yt && P.yt.setPlaybackRate) P.yt.setPlaybackRate(r); } catch (e) {}
      say("Speed " + r + "×");
    };
    var stepRate = function (dir) { var i = SPEEDS.indexOf(P.rate); i = Math.max(0, Math.min(SPEEDS.length - 1, (i < 0 ? 1 : i) + dir)); setRate(SPEEDS[i]); };
    var mute = function () {
      P.muted = !P.muted;
      try { if (P.yt) P.muted ? P.yt.mute() : P.yt.unMute(); } catch (e) {}
      var b = q('[data-a="mute"]'); b.setAttribute("aria-pressed", P.muted); b.textContent = P.muted ? "Unmute" : "Mute";
    };
    var theater = function () {
      P.wide = !P.wide;
      q('[data-a="theater"]').setAttribute("aria-pressed", P.wide);
      root.classList.toggle("is-wide", P.wide);
      if (opts.onTheater) opts.onTheater(P.wide);
    };
    var fullscreen = function () {
      var d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) return (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      var el = wrap, f = el.requestFullscreen || el.webkitRequestFullscreen;
      if (f) { var r = f.call(el); if (r && r.catch) r.catch(function () {}); return; }
      var ifr = frame.querySelector("iframe");
      if (ifr && (ifr.requestFullscreen || ifr.webkitRequestFullscreen)) (ifr.requestFullscreen || ifr.webkitRequestFullscreen).call(ifr);
      else say("Fullscreen is not available here; use the video's own button.");
    };

    /* ---------- mini-player: the wrapper is docked with CSS only, never moved, so the iframe never reloads ---------- */
    var dock = function (manual) {
      if (P.docked) { if (manual) P.manual = true; return; }
      slot.style.height = slot.offsetHeight + "px";
      P.docked = true; P.manual = !!manual;
      root.classList.add("is-docked");
    };
    var undock = function () {
      if (!P.docked) return;
      P.docked = false; P.manual = false;
      root.classList.remove("is-docked");
      slot.style.height = "";
    };
    var inView = true;
    var checkDock = function () {
      if (!inView && P.playing && P.started && !P.suppress) dock(false);
      else if (inView && P.docked && !P.manual) undock();
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { inView = en[0].intersectionRatio >= 0.25; checkDock(); }, { threshold: [0, 0.25, 0.5] }).observe(slot);
    }
    var back = function () { undock(); slot.scrollIntoView({ behavior: "smooth", block: "center" }); P.suppress = false; };
    var closeMini = function () { pause(); P.suppress = true; undock(); };

    /* ---------- queue ---------- */
    var go = function (d, andPlay) {
      if (P.queue.length < 2) return;
      var i = (P.index + d + P.queue.length) % P.queue.length;
      var wasDocked = P.docked && andPlay;
      load(P.queue[i], { queue: P.queue, index: i });
      if (andPlay) { play(); if (wasDocked) dock(true); }
    };
    var onEnded = function () {
      var n = P.queue.length > 1 ? P.queue[(P.index + 1) % P.queue.length] : null;
      if (!n) return;
      if (store.auto) { setTimeout(function () { go(1, true); }, 0); return; }
      upnext.innerHTML = '<div class="x-ap__upin"><p class="x-ap__uplab">Up next</p><img src="https://i.ytimg.com/vi/' + esc(n.id) + '/hqdefault.jpg" alt="" loading="lazy" />' +
        '<p class="x-ap__ctitle">' + esc(n.t) + '</p><p class="x-ap__cmeta">' + esc(n.c || "") + "</p>" +
        '<div class="x-ap__upbtns"><button class="x-ap__b x-ap__b--solid" type="button" data-a="upplay">' + ICON.play + " Play</button>" +
        '<button class="x-ap__b" type="button" data-a="upcancel">Cancel</button></div></div>';
      upnext.hidden = false;
    };

    var copy = function () {
      var url = ytUrl(P.video.id, P.started ? now() : 0);
      var ok = function () { say("Link copied"); var b = q('[data-a="copy"]'); b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy link"; }, 1600); };
      var old = function () {
        var t = document.createElement("textarea"); t.value = url; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); ok(); } catch (e) { say(url); }
        t.remove();
      };
      try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(ok, old); else old(); } catch (e) { old(); }
    };

    var showKeys = function () { if (sheet.showModal && !sheet.open) sheet.showModal(); };

    root.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-a]"); if (!b || !root.contains(b)) return;
      var a = b.dataset.a;
      if (a === "play") play();
      else if (a === "toggle") toggle();
      else if (a === "back10") skip(-10);
      else if (a === "fwd10") skip(10);
      else if (a === "mute") mute();
      else if (a === "theater") theater();
      else if (a === "fs") fullscreen();
      else if (a === "pop") { if (P.docked) back(); else { P.suppress = false; dock(true); } }
      else if (a === "back") back();
      else if (a === "close") closeMini();
      else if (a === "prev") go(-1, false);
      else if (a === "next") go(1, false);
      else if (a === "auto") { store.auto = !store.auto; save(); paintAuto(); }
      else if (a === "copy") copy();
      else if (a === "keys") showKeys();
      else if (a === "sheetclose") sheet.close();
      else if (a === "upplay") go(1, true);
      else if (a === "upcancel") upnext.hidden = true;
    });
    ytA.addEventListener("click", function () { if (P.started) pause(); paintLink(); });
    ytA.addEventListener("pointerenter", paintLink);
    ytA.addEventListener("focus", paintLink);
    sheet.addEventListener("click", function (ev) { if (ev.target === sheet) sheet.close(); });
    speedSel.addEventListener("change", function () { setRate(+this.value); });
    seek.addEventListener("input", function () { P.seeking = true; tCur.textContent = fmt(+seek.value); seek.style.setProperty("--x-ap-pct", (P.dur ? (seek.value / P.dur) * 100 : 0) + "%"); });
    seek.addEventListener("change", function () { P.seeking = false; if (P.yt && P.yt.seekTo) P.yt.seekTo(+seek.value, true); });

    var self;
    var setActive = function () { active = self; };
    root.addEventListener("pointerdown", setActive);
    root.addEventListener("focusin", setActive);

    var keys = function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
      var t = ev.target, tag = t && t.tagName;
      if (/INPUT|TEXTAREA|SELECT/.test(tag) && !(tag === "INPUT" && t.type === "range")) return false;
      if (t && t.isContentEditable) return false;
      var openD = document.querySelector("dialog[open]");
      if (openD && openD !== sheet) return false;
      var k = ev.key;
      if (k === "?") { sheet.open ? sheet.close() : showKeys(); return true; }
      if (sheet.open) return false;
      if (k === " " || k === "Spacebar") { if (/^(BUTTON|A|SUMMARY)$/.test(tag)) return false; toggle(); return true; }
      if (k === "ArrowLeft" || k === "ArrowRight") { if (tag === "INPUT") return false; skip(k === "ArrowLeft" ? -5 : 5); return true; }
      if (k === ">" || (ev.shiftKey && k === ".")) { stepRate(1); return true; }
      if (k === "<" || (ev.shiftKey && k === ",")) { stepRate(-1); return true; }
      switch (k.toLowerCase()) {
        case "k": toggle(); return true;
        case "j": skip(-10); return true;
        case "l": skip(10); return true;
        case "m": mute(); return true;
        case "f": fullscreen(); return true;
        case "t": theater(); return true;
        case "n": go(1, false); return true;
        case "p": go(-1, false); return true;
      }
      return false;
    };

    self = {
      root: root,
      actions: q(".x-ap__actions"),
      load: load,
      play: play,
      pause: pause,
      next: function () { go(1, false); },
      prev: function () { go(-1, false); },
      setQueue: function (list, i) { P.queue = list; P.index = i != null ? i : list.indexOf(P.video); paintNav(); },
      current: function () { return P.video; },
      refresh: function () { paintPoster(); },
      _keys: keys
    };
    paintToggle(); paintAuto(); paintNav();
    instances.push(self);
    return self;
  }

  document.addEventListener("pointerdown", function (ev) {
    if (!active) return;
    if (!ev.target.closest || !ev.target.closest(".x-ap")) {
      // Clicking elsewhere keeps the player active only while it is playing.
      if (!active.root.classList.contains("is-playing")) active = null;
    }
  });
  document.addEventListener("keydown", function (ev) {
    if (!active) return;
    if (active._keys(ev)) ev.preventDefault();
  });
  document.addEventListener("fullscreenchange", function () {
    instances.forEach(function (p) { p.root.classList.toggle("is-fs", !!document.fullscreenElement && p.root.contains(document.fullscreenElement)); });
  });

  window.ArchivePlayer = {
    create: create,
    progress: progress,
    onWatched: function (f) { listeners.push(f); },
    fmt: fmt,
    fmtDate: fmtDate,
    year: function (d) { d = cleanDate(d); return d ? +d.slice(0, 4) : 0; },
    thumb: function (id) { return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; }
  };
})();
