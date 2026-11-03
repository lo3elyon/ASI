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
  var svg = function (d) { return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; };
  var IC = {
    pop: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none"/>'),
    min: svg('<path d="M6 17h12"/>'),
    dock: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M15 9l-5 5M10 10v4h4"/>'),
    wide: svg('<rect x="2" y="7" width="20" height="10" rx="1.5"/>'),
    fs: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    tab: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    yt: svg('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    restore: svg('<path d="M14 4h6v6M10 20H4v-6"/>'),
    grip: svg('<path d="M20 12l-8 8M20 17l-3 3"/>'),
    expand: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 9h6v6"/>')
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

  var instances = [], active = null, creators = [];

  function create(root, opts) {
    opts = opts || {};
    /* per-instance hooks for add-ons (player-extra.js); a handler returning true marks the event handled */
    var hooks = {};
    var emit = function (n, a) { var r = false; (hooks[n] || []).forEach(function (f) { try { if (f(a)) r = true; } catch (e) {} }); return r; };
    var people = opts.people || {};
    var P = { video: null, queue: [], index: -1, yt: null, basic: false, started: false, playing: false, ended: false,
      dur: 0, rate: 1, muted: false, docked: false, manual: false, suppress: false, wide: false, seeking: false, token: 0 };

    root.classList.add("x-ap");
    root.innerHTML =
      '<div class="x-ap__slot">' +
        '<div class="x-ap__wrap">' +
          '<div class="x-ap__screen">' +
            '<div class="x-ap__frame"></div>' +
            '<div class="x-ap__shield" aria-hidden="true"></div>' +
            '<button class="x-ap__back" type="button" data-a="siteplayer">Back to site player</button>' +
            '<div class="x-ap__poster"></div>' +
            '<div class="x-ap__upnext" hidden></div>' +
            '<div class="x-ap__out"><p>Playing in the pop-out window</p><button class="x-ap__b x-ap__b--solid" type="button" data-a="dockhere">' + IC.dock + " Bring it back</button></div>" +
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
              '<button class="x-ap__b x-ap__ytb" type="button" data-a="native" aria-label="Switch to YouTube controls" data-tip="Switch to YouTube controls">' + svg('<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>') + "</button>" +
              '<button class="x-ap__b x-ap__popb" type="button" data-a="pop" aria-label="Pop out (I)" data-tip="Pop out (I)">' + IC.pop + "</button>" +
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
        '<a class="btn" data-r="yt" href="#" target="_blank" rel="noopener">Watch on YouTube</a>' +
        '<button class="btn" type="button" data-a="copy">Copy link</button>' +
      "</div>" +
      '<p class="x-ap__status" role="status" aria-live="polite"></p>' +
      '<dialog class="x-ap__sheet" aria-label="Keyboard shortcuts">' +
        "<h3>Keyboard shortcuts</h3>" +
        "<dl>" +
          [["Space / K", "Play or pause"], ["J / L", "Back or forward 10 seconds"], ["← / →", "Back or forward 5 seconds"], ["M", "Mute"], ["F", "Fullscreen"],
            ["T", "Theater mode"], ["I", "Pop out or dock"], ["N / P", "Next or previous video"], ["Shift + > / <", "Faster or slower"], ["?", "This sheet"]]
            .map(function (r) { return "<div><dt><kbd>" + r[0] + "</kbd></dt><dd>" + r[1] + "</dd></div>"; }).join("") +
        "</dl>" +
        '<div class="links"><button class="btn" type="button" data-a="sheetclose">Close</button></div>' +
      "</dialog>";

    var q = function (s) { return root.querySelector(s); };
    var slot = q(".x-ap__slot"), wrap = q(".x-ap__wrap"), frame = q(".x-ap__frame"), poster = q(".x-ap__poster"), upnext = q(".x-ap__upnext");
    var seek = q(".x-ap__seek"), tCur = q('[data-r="cur"]'), tDur = q('[data-r="dur"]'), speedSel = q('[data-r="speed"]');
    var shield = q(".x-ap__shield"), barEl = q(".x-ap__bar");
    var info = q(".x-ap__info"), ytA = q('[data-r="yt"]'), status = q(".x-ap__status"), sheet = q(".x-ap__sheet"), autoB = q('[data-a="auto"]');

    var say = function (t) { status.textContent = t; clearTimeout(say.t); say.t = setTimeout(function () { status.textContent = ""; }, 2500); };
    var now = function () { try { return P.yt && P.yt.getCurrentTime ? P.yt.getCurrentTime() || 0 : 0; } catch (e) { return 0; } };

    var paintToggle = function () {
      root.querySelectorAll('[data-a="toggle"]').forEach(function (b) { b.innerHTML = P.playing ? ICON.pause : ICON.play; b.setAttribute("aria-label", P.playing ? "Pause" : "Play"); });
      root.classList.toggle("is-playing", P.playing);
      if (typeof wake === "function") wake();
      if (opts.onPlayState) opts.onPlayState(P.playing);
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
      root.classList.remove("is-out");
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
      var start = P.startAt > 0 ? Math.floor(P.startAt) : progress(v.id).pos, tok = P.token, done = false;
      P.startAt = 0;
      frame.innerHTML = '<div class="x-ap__loading">Loading…</div>';
      var fail = setTimeout(function () { if (!done && tok === P.token) { done = true; basic(start); } }, 5000);
      loadApi(function (ok) {
        if (done || tok !== P.token) return;
        done = true; clearTimeout(fail);
        if (!ok) return basic(start);
        mount(start, true);
      });
    };
    /* Build the YouTube player. Only reached from play() (a user click or key) or from switching control modes. */
    var mount = function (start, auto) {
      var v = P.video, tok = P.token;
      P.native = isNative(); root.classList.toggle("is-native", P.native);
      var host = document.createElement("div");
      frame.innerHTML = ""; frame.appendChild(host);
      var pv = { autoplay: auto ? 1 : 0, controls: P.native ? 1 : 0, disablekb: P.native ? 0 : 1, fs: P.native ? 1 : 0, iv_load_policy: 3,
        rel: 0, modestbranding: 1, playsinline: 1, start: start || 0 };
      if (/^https?:/.test(location.origin)) pv.origin = location.origin;
        try {
          P.yt = new window.YT.Player(host, {
            host: "https://www.youtube-nocookie.com",
            videoId: v.id,
            width: "100%", height: "100%",
            playerVars: pv,
            events: {
              onReady: function (e) {
                if (tok !== P.token) return;
                try { if (P.rate !== 1) e.target.setPlaybackRate(P.rate); if (P.muted) e.target.mute(); if (auto) e.target.playVideo(); } catch (x) {}
                var ifr = frame.querySelector("iframe"); if (ifr) ifr.title = v.t;
                startTick(); paintTime();
                emit("ready", e.target);
              },
              onStateChange: function (e) {
                if (tok !== P.token) return;
                var s = e.data;
                P.playing = s === 1 || s === 3;
                if (s === 1) { P.ended = false; upnext.hidden = true; }
                if (s === 2) record(v.id, now(), P.dur);
                if (s === 0) { P.ended = true; record(v.id, P.dur || now(), P.dur || now()); if (!emit("ended", e.target)) onEnded(); }
                emit("state", s);
                paintToggle(); paintLink();
                if (P.playing && !P.suppress) checkDock();
              },
              onError: function () { if (tok === P.token) say("YouTube could not play this video here. Try Watch on YouTube."); }
            }
          });
        } catch (x) { basic(start); }
    };

    /* ---------- control mode: the site player (default) or YouTube's own controls, remembered across visits ---------- */
    var NKEY = "asiYtNative";
    var isNative = function () { try { return window.localStorage.getItem(NKEY) === "1"; } catch (e) { return false; } };
    var setNative = function (on) {
      try { window.localStorage.setItem(NKEY, on ? "1" : "0"); } catch (e) {}
      if (!P.started || P.basic || !P.yt || !P.video) { P.native = on; root.classList.toggle("is-native", on); return; }
      var t = now(), was = P.playing && !P.ended;
      stopTick();
      if (t > 0) record(P.video.id, t, P.dur);
      try { P.yt.destroy(); } catch (e) {}
      P.yt = null; P.token++; P.playing = false; P.ended = false;
      mount(Math.floor(t), was);
      paintToggle();
      say(on ? "YouTube controls on" : "Site player on");
      var f = on ? q('[data-a="siteplayer"]') : q('[data-a="native"]');
      if (f && root.contains(document.activeElement)) setTimeout(function () { try { f.focus(); } catch (e) {} }, 0);
    };

    /* ---------- the shield over the iframe: click plays or pauses, double-click goes fullscreen ---------- */
    var clickT = null, swallow = false;
    shield.addEventListener("click", function () {
      if (swallow) { swallow = false; return; }
      clearTimeout(clickT);
      clickT = setTimeout(function () { clickT = null; toggle(); }, 220);
    });
    shield.addEventListener("dblclick", function (ev) { ev.preventDefault(); clearTimeout(clickT); clickT = null; fullscreen(); });

    /* ---------- the bar overlays the video and hides after 2.5s idle while playing ---------- */
    var idleT = null;
    var keepBar = function () {
      if (barEl.matches(":hover")) return true;
      if (barEl.querySelector(".x-apx-menu:not([hidden])")) return true;
      var a = document.activeElement;
      if (a && barEl.contains(a)) { try { return a.matches(":focus-visible"); } catch (e) { return true; } }
      return false;
    };
    var hide = function () {
      idleT = null;
      if (!P.playing || P.native || P.basic) return;
      if (keepBar()) { idleT = setTimeout(hide, 2500); return; }
      root.classList.add("is-idle");
    };
    var wake = function () {
      root.classList.remove("is-idle");
      clearTimeout(idleT); idleT = null;
      if (P.playing && !P.native && !P.basic) idleT = setTimeout(hide, 2500);
    };
    wrap.addEventListener("pointermove", function (ev) { if (ev.pointerType !== "touch") wake(); });
    wrap.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "touch" && ev.target === shield && root.classList.contains("is-idle")) { swallow = true; setTimeout(function () { swallow = false; }, 700); }
      wake();
    });
    wrap.addEventListener("pointerleave", function (ev) {
      if (ev.pointerType === "touch" || !P.playing) return;
      clearTimeout(idleT); idleT = setTimeout(hide, 600);
    });
    barEl.addEventListener("focusin", wake);
    var pause = function () { if (P.yt && P.yt.pauseVideo) P.yt.pauseVideo(); };
    var toggle = function () {
      if (!P.started || P.ended) { emit("flash", "play"); play(); }
      else if (P.basic) say("Use the video's own controls.");
      else if (P.playing) { emit("flash", "pause"); pause(); }
      else { emit("flash", "play"); play(); }
    };
    var skip = function (d) {
      if (!P.yt || !P.yt.seekTo) return;
      var t = Math.max(0, Math.min(now() + d, P.dur || 1e9));
      P.yt.seekTo(t, true); paintTime(); say((d > 0 ? "+" : "−") + Math.abs(d) + "s");
      emit("flash", d);
    };
    var setRate = function (r) {
      P.rate = r; speedSel.value = String(r);
      try { if (P.yt && P.yt.setPlaybackRate) P.yt.setPlaybackRate(r); } catch (e) {}
      say("Speed " + r + "×");
      if (P.started) emit("flash", "rate:" + r);
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

    /* ---------- auto pop-out: a playing video scrolled out of view moves to the shared floating window ---------- */
    var inView = true;
    var checkDock = function () {
      if (opts.floating) return;
      if (!inView && P.playing && P.started && !P.ended && !P.suppress && Date.now() > (P.hold || 0)) Pop.fromInstance(self, true);
      else if (inView && Pop.autoFrom(self)) Pop.dock();
    };
    if (!opts.floating && "IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { inView = en[0].intersectionRatio >= 0.25; checkDock(); }, { threshold: [0, 0.25, 0.5] }).observe(slot);
    }

    /* ---------- queue ---------- */
    var go = function (d, andPlay) {
      if (P.queue.length < 2) return;
      var i = (P.index + d + P.queue.length) % P.queue.length;
      load(P.queue[i], { queue: P.queue, index: i });
      if (andPlay) play();
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
      else if (a === "pop") Pop.fromInstance(self, false);
      else if (a === "native") setNative(true);
      else if (a === "siteplayer") setNative(false);
      else if (a === "dockhere") Pop.dock();
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
      wake();
      if (k === "?") { sheet.open ? sheet.close() : showKeys(); return true; }
      if (sheet.open) return false;
      if (emit("key", ev)) return true;
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
        case "t": if (opts.onTheaterKey) opts.onTheaterKey(); else theater(); return true;
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
      floating: !!opts.floating,
      toggle: toggle,
      fullscreen: fullscreen,
      isPlaying: function () { return P.playing; },
      inView: function () { return inView && root.getClientRects().length > 0; },
      state: function () { return { video: P.video, time: P.started ? now() : 0, playing: P.started && P.playing && !P.ended, queue: P.queue, index: P.index }; },
      /* Stop and keep the poster; the position is saved so the poster offers Resume. */
      stop: function () { teardown(); paintPoster(); },
      playAt: function (t) { P.startAt = t > 0 ? t : 0; P.hold = Date.now() + 1500; if (P.started && P.yt && P.yt.seekTo && t > 0) { try { P.yt.seekTo(t, true); } catch (e) {} } play(); },
      hold: function () { P.hold = Date.now() + 1500; },
      suppress: function () { P.suppress = true; },
      setWide: function (on) { if (P.wide !== !!on) theater(); },
      /* for add-ons: the live YT.Player (null before Play or in the basic fallback), the control bar and helpers */
      yt: function () { return P.basic ? null : P.yt; },
      started: function () { return P.started; },
      bar: q(".x-ap__bar"),
      btns: q(".x-ap__btns"),
      screen: q(".x-ap__screen"),
      sheet: sheet,
      say: say,
      on: function (n, f) { (hooks[n] = hooks[n] || []).push(f); },
      _keys: keys
    };
    paintToggle(); paintAuto(); paintNav();
    instances.push(self);
    creators.forEach(function (f) { try { f(self); } catch (e) {} });
    return self;
  }

  /* ---------- the one shared pop-out window ----------
     Two shapes: a centred modal over a dimmed, scroll-locked page with the up-next list beside it,
     and the draggable corner window. Both minimise to a pill; nothing ever leaves the page. */
  var Pop = (function () {
    var el = null, bd = null, win, bar, body, titleEl, pillTitle, pillToggle, ytA, modeB, listEl, inst = null;
    var S = { x: 0, y: 0, w: 400, corner: "br" };
    var src = null, auto = false, isMin = false, drag = null;
    var modal = false, lock = null, opener = null, leaveT = 0, listQ = null;
    var still = function () { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); };
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var vw = function () { return document.documentElement.clientWidth || window.innerWidth; };
    var vh = function () { return window.innerHeight; };
    var isOpen = function () { return !!el && !el.hidden; };
    var visible = function (i) { return i && i.root.isConnected && i.root.getClientRects().length > 0; };
    var primary = function () { var h = instances.filter(function (i) { return !i.floating; }); return h.filter(visible)[0] || h[0] || null; };
    var gap = function (side) { return side === "B" ? 76 : 16; }; /* bottom-right clears the Ask button */

    var place = function () {
      if (!isOpen() || modal) return;
      var w = el.offsetWidth, h = el.offsetHeight, W = vw(), H = vh();
      if (S.corner) {
        S.x = S.corner[1] === "l" ? 16 : W - w - 16;
        S.y = S.corner[0] === "t" ? 16 : H - h - (S.corner === "br" ? gap("B") : 16);
      }
      S.x = clamp(S.x, 8, Math.max(8, W - w - 8));
      S.y = clamp(S.y, 8, Math.max(8, H - h - 8));
      el.style.left = S.x + "px"; el.style.top = S.y + "px";
    };
    var setWidth = function (w) {
      var W = vw(), lo = Math.min(280, W - 16), hi = Math.max(lo, Math.floor(W * 0.9));
      S.w = Math.round(clamp(w, lo, hi));
      if (modal) return;
      if (!isMin) el.style.width = S.w + "px";
      el.classList.toggle("is-narrow", S.w < 420);
    };
    var sizeCorner = function () {
      if (!S.placed) { S.placed = true; S.corner = "br"; setWidth(Math.min(400, vw() * 0.9)); }
      else setWidth(S.w);
    };

    /* ---------- the page under the modal: no scroll, no focus, no clicks; the scroll position comes back on close ---------- */
    var lockPage = function () {
      if (lock) return;
      var de = document.documentElement, b = document.body, y = window.scrollY || de.scrollTop || 0;
      var sb = Math.max(0, window.innerWidth - de.clientWidth);
      lock = { x: window.scrollX || 0, y: y, bs: b.getAttribute("style"), hs: de.getAttribute("style"), inert: [] };
      de.style.overflow = "hidden";
      b.style.position = "fixed"; b.style.top = -y + "px"; b.style.left = "0"; b.style.right = "0"; b.style.width = "100%";
      if (sb) b.style.paddingRight = (parseFloat(getComputedStyle(b).paddingRight) || 0) + sb + "px";
      Array.prototype.forEach.call(b.children, function (c) {
        if (c === el || c === bd || c.inert || /^(SCRIPT|STYLE|LINK)$/.test(c.tagName)) return;
        c.inert = true; lock.inert.push(c);
      });
      de.classList.add("x-modal-open");
    };
    var unlockPage = function () {
      if (!lock) return;
      var de = document.documentElement, b = document.body, L = lock; lock = null;
      L.inert.forEach(function (c) { c.inert = false; });
      if (L.bs == null) b.removeAttribute("style"); else b.setAttribute("style", L.bs);
      de.style.scrollBehavior = "auto";
      window.scrollTo(L.x, L.y);
      if (L.hs == null) de.removeAttribute("style"); else de.setAttribute("style", L.hs);
      de.classList.remove("x-modal-open");
    };
    var paintMode = function () {
      if (!modeB) return;
      var l = modal ? "Shrink to mini player" : "Expand";
      modeB.innerHTML = modal ? IC.pop : IC.expand;
      modeB.setAttribute("aria-label", l); modeB.setAttribute("data-tip", l);
      el.setAttribute("aria-label", modal ? "Video player" : "Mini player");
    };
    var setModal = function (on) {
      on = !!on;
      if (on === modal) return;
      modal = on;
      el.classList.toggle("is-modal", on);
      if (on) { el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); }
      else { el.removeAttribute("role"); el.removeAttribute("aria-modal"); }
      paintMode();
      if (on) {
        var a = document.activeElement;
        opener = a && !el.contains(a) ? a : opener;
        el.style.left = ""; el.style.top = ""; el.style.width = "";
        el.classList.remove("is-narrow");
        bd.hidden = false;
        lockPage();
        if (!still()) {
          el.classList.add("is-enter"); bd.classList.add("is-enter");
          void el.offsetWidth;
          requestAnimationFrame(function () { el.classList.remove("is-enter"); bd.classList.remove("is-enter"); });
        }
      } else {
        bd.hidden = true;
        el.classList.remove("is-enter", "is-leave"); bd.classList.remove("is-enter", "is-leave");
        unlockPage();
      }
    };
    var refocus = function () {
      var o = opener; opener = null;
      if (o && o.isConnected && o.focus) { try { o.focus({ preventScroll: true }); } catch (e) {} }
    };
    var focusPlay = function () {
      var b = body.querySelector('.x-ap__poster [data-a="play"]') || el.querySelector('[data-p="close"]');
      if (b) { try { b.focus({ preventScroll: true }); } catch (e) {} }
    };

    /* the up-next list beside the modal: the window's own queue */
    var paintList = function () {
      if (!listEl || !inst) return;
      var st = inst.state(), q = st.queue || [];
      el.classList.toggle("is-solo", q.length < 2);
      if (q !== listQ) {
        listQ = q;
        listEl.innerHTML = q.length < 2 ? "" : q.map(function (x, i) {
          return '<button class="x-pop__q" type="button" data-pq="' + i + '" aria-current="false"><img src="https://i.ytimg.com/vi/' + esc(x.id) + '/hqdefault.jpg" alt="" loading="lazy" />' +
            "<span><b>" + esc(x.t) + "</b><small>" + esc([x.c, fmtDate(x.d), x.len].filter(Boolean).join(" · ")) + "</small></span></button>";
        }).join("");
      }
      var cur = null;
      listEl.querySelectorAll("[data-pq]").forEach(function (b) { var on = +b.dataset.pq === st.index; b.setAttribute("aria-current", on); if (on) cur = b; });
      if (cur && modal) {
        var top = cur.offsetTop, h = cur.offsetHeight;
        if (top < listEl.scrollTop || top + h > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = Math.max(0, top - 8);
      }
    };
    var snap = function () {
      var w = el.offsetWidth, h = el.offsetHeight, dl = S.x, dr = vw() - S.x - w, dt = S.y, db = vh() - S.y - h;
      if (Math.min(dl, dr) <= 60 && Math.min(dt, db) <= 60) {
        S.corner = (dt <= db ? "t" : "b") + (dl <= dr ? "l" : "r");
        el.classList.add("is-snap"); place();
        setTimeout(function () { el.classList.remove("is-snap"); }, 260);
      } else S.corner = null;
    };

    var paintLinks = function () {
      if (!inst) return;
      var st = inst.state(), v = st.video; if (!v) return;
      ytA.href = ytUrl(v.id, st.time || progress(v.id).pos);
    };
    var paintTitle = function (v) { titleEl.textContent = v.t; titleEl.title = v.t; pillTitle.textContent = v.t; paintLinks(); };
    var paintPill = function (on) {
      if (!pillToggle) return;
      pillToggle.innerHTML = on ? ICON.pause : ICON.play;
      pillToggle.setAttribute("aria-label", on ? "Pause" : "Play");
    };

    var tb = function (a, label, icon) { return '<button class="x-pop__i" type="button" data-p="' + a + '" aria-label="' + label + '" data-tip="' + label + '">' + icon + "</button>"; };
    var build = function () {
      if (el) return;
      bd = document.createElement("div");
      bd.className = "x-pop-bd"; bd.hidden = true;
      document.body.appendChild(bd);
      bd.addEventListener("click", function () { close(); });
      el = document.createElement("section");
      el.className = "x-pop"; el.hidden = true;
      el.setAttribute("aria-label", "Mini player");
      el.innerHTML =
        '<div class="x-pop__win">' +
          '<div class="x-pop__bar">' +
            '<p class="x-pop__title"></p>' +
            '<div class="x-pop__tools">' +
              tb("mode", "Expand", IC.expand) + tb("min", "Minimize", IC.min) + tb("dock", "Dock in the Theater", IC.dock) + tb("wide", "Theater mode", IC.wide) + tb("fs", "Fullscreen", IC.fs) +
              '<a class="x-pop__i" data-p="yt" href="#" target="_blank" rel="noopener" aria-label="Watch on YouTube at the current time" data-tip="Watch on YouTube">' + IC.yt + "</a>" +
              tb("close", "Close (Esc)", IC.close) +
            "</div>" +
          "</div>" +
          '<div class="x-pop__body"></div>' +
          '<aside class="x-pop__side" aria-label="Up next"><p class="x-pop__sh">Up next</p><div class="x-pop__list"></div></aside>' +
          '<button class="x-pop__grip" type="button" data-p="grip" aria-label="Resize: drag, or use the arrow keys">' + IC.grip + "</button>" +
        "</div>" +
        '<div class="x-pop__pill">' +
          '<button class="x-pop__i" type="button" data-p="ptoggle" aria-label="Play">' + ICON.play + "</button>" +
          '<button class="x-pop__pt" type="button" data-p="restore" aria-label="Restore the pop-out player"><span></span>' + IC.restore + "</button>" +
        "</div>";
      document.body.appendChild(el);
      var g = function (s) { return el.querySelector(s); };
      win = g(".x-pop__win"); bar = g(".x-pop__bar"); body = g(".x-pop__body"); titleEl = g(".x-pop__title");
      pillTitle = g(".x-pop__pt span"); pillToggle = g('[data-p="ptoggle"]'); ytA = g('[data-p="yt"]');
      modeB = g('[data-p="mode"]'); listEl = g(".x-pop__list");
      inst = create(body, {
        floating: true,
        onChange: function (v) { paintTitle(v); paintList(); },
        onPlayState: function (on) { paintPill(on); paintLinks(); },
        onTheaterKey: function () { wide(); }
      });

      el.addEventListener("click", function (ev) {
        var qb = ev.target.closest("[data-pq]");
        if (qb) {
          var st = inst.state(), i = +qb.dataset.pq;
          if (st.queue && st.queue[i]) { inst.load(st.queue[i], { queue: st.queue, index: i }); if (st.playing) inst.play(); }
          return;
        }
        var b = ev.target.closest("[data-p]"); if (!b) { if (isMin && ev.target.closest(".x-pop__pill")) restore(); return; }
        var a = b.dataset.p;
        if (a === "mode") modal ? shrink() : expand();
        else if (a === "min") minimize();
        else if (a === "restore") restore();
        else if (a === "ptoggle") inst.toggle();
        else if (a === "dock") dock();
        else if (a === "wide") wide();
        else if (a === "fs") inst.fullscreen();
        else if (a === "close") close();
        else if (a === "yt") { paintLinks(); if (inst.isPlaying()) inst.toggle(); }
      });
      ytA.addEventListener("pointerenter", paintLinks);
      ytA.addEventListener("focus", paintLinks);

      /* drag by the title bar */
      bar.addEventListener("pointerdown", function (ev) {
        if (modal || ev.button !== 0 || ev.target.closest("button, a")) return;
        ev.preventDefault();
        try { bar.setPointerCapture(ev.pointerId); } catch (e) {}
        drag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, x: S.x, y: S.y };
        S.corner = null; el.classList.add("is-drag");
      });
      bar.addEventListener("pointermove", function (ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        S.x = drag.x + ev.clientX - drag.sx; S.y = drag.y + ev.clientY - drag.sy; place();
      });
      var endDrag = function (ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        drag = null; el.classList.remove("is-drag");
        try { bar.releasePointerCapture(ev.pointerId); } catch (e) {}
        snap();
      };
      bar.addEventListener("pointerup", endDrag);
      bar.addEventListener("pointercancel", endDrag);

      /* resize from the bottom-right handle; the video keeps 16:9 */
      var grip = g(".x-pop__grip"), rs = null;
      grip.addEventListener("pointerdown", function (ev) {
        if (ev.button !== 0) return;
        ev.preventDefault();
        try { grip.setPointerCapture(ev.pointerId); } catch (e) {}
        rs = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, w: S.w };
        S.corner = null; el.classList.add("is-drag");
      });
      grip.addEventListener("pointermove", function (ev) {
        if (!rs || ev.pointerId !== rs.id) return;
        var dx = ev.clientX - rs.sx, dy = (ev.clientY - rs.sy) * 16 / 9;
        setWidth(Math.min(rs.w + (Math.abs(dy) > Math.abs(dx) ? dy : dx), vw() - S.x - 8)); place();
      });
      var endRs = function (ev) {
        if (!rs || ev.pointerId !== rs.id) return;
        rs = null; el.classList.remove("is-drag");
        try { grip.releasePointerCapture(ev.pointerId); } catch (e) {}
        snap();
      };
      grip.addEventListener("pointerup", endRs);
      grip.addEventListener("pointercancel", endRs);
      grip.addEventListener("keydown", function (ev) {
        var d = { ArrowRight: 24, ArrowDown: 24, ArrowLeft: -24, ArrowUp: -24 }[ev.key];
        if (!d) return;
        ev.preventDefault(); ev.stopPropagation(); setWidth(S.w + d); place();
      });

      if ("ResizeObserver" in window) new ResizeObserver(function () { if (!drag) place(); }).observe(el);
      window.addEventListener("resize", function () { if (isOpen() && !modal) { setWidth(S.w); place(); } });
      paintMode();
    };

    var unmark = function () { if (src) src.root.classList.remove("is-out"); };
    var unMin = function () { if (isMin) { isMin = false; el.classList.remove("is-min"); win.inert = false; } };
    var show = function () {
      el.hidden = false;
      unMin();
      if (modal) return;
      sizeCorner();
      place();
    };
    /* Open a video in the window: o.modal for the centred window, else the corner.
       It shows the poster and never autoplays, unless o.at carries on a video already playing. */
    var open = function (v, o) {
      o = o || {};
      build();
      if (leaveT) { clearTimeout(leaveT); leaveT = 0; hide(); }
      unmark();
      src = o.src || null; auto = !!o.auto;
      if (o.modal) { unMin(); setModal(true); }
      show();
      var q = o.queue && o.queue.indexOf(v) >= 0 ? o.queue : null;
      var cur = inst.current();
      if (!(cur && cur.id === v.id && o.at == null && !q)) inst.load(v, q ? { queue: q, index: o.index != null ? o.index : q.indexOf(v) } : null);
      if (o.at != null) inst.playAt(o.at);
      if (src) src.root.classList.add("is-out");
      paintLinks(); paintList();
      if (modal) focusPlay();
    };
    /* modal to the draggable corner window, and back */
    var shrink = function () {
      if (!isOpen() || !modal) return;
      setModal(false);
      S.corner = S.corner || "br";
      sizeCorner(); place();
      opener = null;
      if (modeB) { try { modeB.focus({ preventScroll: true }); } catch (e) {} }
    };
    var expand = function () {
      if (!isOpen() || modal) return;
      unMin();
      setModal(true);
      paintList(); focusPlay();
    };
    var fromInstance = function (s, isAuto) {
      if (!s || s.floating) return;
      var st = s.state(); if (!st.video) return;
      s.stop();
      open(st.video, { queue: st.queue, index: st.index, at: st.playing ? st.time : null, src: s, auto: isAuto });
    };
    var hide = function () {
      unmark(); src = null; auto = false;
      unMin();
      el.hidden = true;
      if (modal) { setModal(false); refocus(); }
    };
    /* Dock: move the video back into the page's player, keeping its time. */
    var dock = function () {
      if (!isOpen()) return null;
      var st = inst.state(), home = visible(src) ? src : primary();
      inst.stop(); hide();
      if (!home || !st.video) return home;
      home.hold();
      var cur = home.current();
      if (!cur || cur.id !== st.video.id || st.playing) home.load(st.video, st.queue && st.queue.length ? { queue: st.queue, index: st.index } : null);
      else home.refresh();
      if (visible(home)) {
        if (!home.inView()) home.root.scrollIntoView({ block: "center" });
        if (st.playing) home.playAt(st.time);
      }
      return home;
    };
    var close = function () {
      if (!isOpen() || leaveT) return;
      inst.stop();
      if (src) src.suppress();
      if (modal && !still()) {
        el.classList.add("is-leave"); bd.classList.add("is-leave");
        leaveT = setTimeout(function () { leaveT = 0; hide(); }, 220);
      } else hide();
    };
    var wide = function () { var h = dock(); if (h) h.setWide(true); };
    var minimize = function () {
      if (!isOpen() || isMin) return;
      if (modal) { setModal(false); opener = null; S.corner = S.corner || "br"; sizeCorner(); }
      isMin = true; el.classList.add("is-min"); el.style.width = ""; win.inert = true;
      place();
      var r = el.querySelector('[data-p="restore"]'); if (r) r.focus();
    };
    var restore = function () {
      if (!isMin) return;
      isMin = false; el.classList.remove("is-min"); win.inert = false; el.style.width = S.w + "px";
      place();
    };
    var toggleKey = function () {
      if (isOpen() && modal) { shrink(); return; }
      if (isOpen()) { dock(); return; }
      var s = active && !active.floating ? active : primary();
      if (s) fromInstance(s, false);
    };

    return {
      open: open, fromInstance: fromInstance, dock: dock, close: close, toggleKey: toggleKey, isOpen: isOpen,
      isModal: function () { return isOpen() && modal; },
      menuOpen: function () { return !!(el && el.querySelector(".x-apx-menu:not([hidden])")); },
      autoFrom: function (s) { return isOpen() && auto && src === s; }
    };
  })();

  /* A video id to the library's record, or a bare stand-in with the title we were given. */
  var lib = null, libList = [];
  var loadLib = function () {
    if (lib) return;
    lib = {};
    try { libList = (window.Hark && Hark.data ? Hark.data("d-videos") || [] : []).slice(); libList.forEach(function (v) { lib[v.id] = v; }); } catch (e) { libList = []; }
  };
  var findVideo = function (id, title) {
    loadLib();
    var v = lib[id];
    if (!v) v = lib[id] = { id: id, t: title || "YouTube video", c: "", d: "", len: "", k: "", p: [], s: "" };
    if (!Array.isArray(v.p)) v.p = [];
    return v;
  };
  /* The video, then up to 12 others: the same people first, then the same kind. */
  var related = function (v) {
    loadLib();
    var out = [v], seen = {}; seen[v.id] = 1;
    var p = Array.isArray(v.p) ? v.p : [];
    var add = function (f) { libList.forEach(function (x) { if (out.length < 13 && !seen[x.id] && f(x)) { seen[x.id] = 1; out.push(x); } }); };
    if (p.length) add(function (x) { return (x.p || []).some(function (id) { return p.indexOf(id) >= 0; }); });
    if (v.k) add(function (x) { return x.k === v.k; });
    return out;
  };
  var asVideo = function (arg, o) { return typeof arg === "string" ? findVideo(arg, o && o.title) : arg; };
  /* the corner mini player */
  var popout = function (arg, o) {
    o = o || {};
    var v = asVideo(arg, o);
    if (!v || !v.id) return;
    Pop.open(v, { queue: o.queue, index: o.index });
  };
  /* the centred in-page window with its up-next list */
  var watch = function (arg, o) {
    o = o || {};
    var v = asVideo(arg, o);
    if (!v || !v.id) return;
    if (!Array.isArray(v.p)) v.p = [];
    var q = o.queue && o.queue.indexOf(v) >= 0 ? o.queue : related(v);
    Pop.open(v, { modal: true, queue: q, index: q.indexOf(v) });
  };

  /* Every video link outside the Theater opens the in-page window; none ever opens a tab or leaves the page. */
  var watchLabel = function (a) { return a.getAttribute("data-title") || (a.getAttribute("aria-label") || "").replace(/^Watch[^:]*:\s*/, ""); };
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[data-watch]");
    if (!a || ev.defaultPrevented) return;
    ev.preventDefault();
    watch(a.getAttribute("data-watch"), { title: watchLabel(a) });
  });
  document.addEventListener("auxclick", function (ev) {
    if (ev.target.closest && ev.target.closest("a[data-watch]")) ev.preventDefault();
  });

  /* "Play here" on every archive card: the same video in the corner mini player. */
  var enhance = function () {
    document.querySelectorAll(".x-lite > a.x-play[data-watch]").forEach(function (a) {
      var box = a.parentNode; if (box.querySelector(".x-ph")) return;
      var id = a.getAttribute("data-watch"), t = watchLabel(a);
      box.insertAdjacentHTML("beforeend", '<button class="x-ph" type="button" data-play-here="' + esc(id) + '" data-title="' + esc(t) + '" aria-label="Play in the mini player: ' + esc(t) + '">▶ Play here</button>');
    });
  };
  var enhT = 0;
  var queueEnhance = function () { if (enhT) return; enhT = requestAnimationFrame(function () { enhT = 0; enhance(); }); };
  if ("MutationObserver" in window) new MutationObserver(queueEnhance).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhance); else queueEnhance();
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-play-here]");
    if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    popout(b.getAttribute("data-play-here"), { title: b.getAttribute("data-title") });
  });

  document.addEventListener("pointerdown", function (ev) {
    if (!active) return;
    if (!ev.target.closest || !ev.target.closest(".x-ap, .x-pop")) {
      // Clicking elsewhere keeps the player active only while it is playing.
      if (!active.root.classList.contains("is-playing")) active = null;
    }
  });
  var typing = function (ev) {
    var t = ev.target, tag = t && t.tagName;
    if (/INPUT|TEXTAREA|SELECT/.test(tag) && !(tag === "INPUT" && t.type === "range")) return true;
    return !!(t && t.isContentEditable);
  };
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && Pop.isModal() && !document.querySelector("dialog[open]") && !document.fullscreenElement && !Pop.menuOpen()) {
      ev.preventDefault(); Pop.close(); return;
    }
    if ((ev.key === "i" || ev.key === "I") && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !typing(ev) && !document.querySelector("dialog[open]")) {
      if (Pop.isOpen() || instances.some(function (i) { return !i.floating && i.current(); })) { ev.preventDefault(); Pop.toggleKey(); }
      return;
    }
    if (!active) return;
    if (active._keys(ev)) ev.preventDefault();
  });
  document.addEventListener("fullscreenchange", function () {
    instances.forEach(function (p) { p.root.classList.toggle("is-fs", !!document.fullscreenElement && p.root.contains(document.fullscreenElement)); });
  });

  window.ArchivePlayer = {
    create: create,
    popout: popout,
    watch: watch,
    isWatching: function () { return Pop.isModal(); },
    dock: function () { return Pop.dock(); },
    closePopout: function () { Pop.close(); },
    isPoppedOut: function () { return Pop.isOpen(); },
    progress: progress,
    onWatched: function (f) { listeners.push(f); },
    /* run f for every player instance, existing and future (main, watch page, pop-out) */
    onCreate: function (f) { creators.push(f); instances.forEach(function (i) { try { f(i); } catch (e) {} }); },
    fmt: fmt,
    fmtDate: fmtDate,
    year: function (d) { d = cleanDate(d); return d ? +d.slice(0, 4) : 0; },
    thumb: function (id) { return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; }
  };
})();
