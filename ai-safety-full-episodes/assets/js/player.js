/* AI Safety Full Episodes · player: YouTube IFrame API with custom cinema controls, strict watch clock,
 * dock modes (theater / mini / audio), true fullscreen on the player shell, draggable + resizable mini player,
 * float-window remote (Document Picture-in-Picture), Focus mode, sleep timer, A–B loop, bookmarks, Media Session.
 *
 * Why the float window is a remote and not a second player: a YouTube iframe created inside a Document PiP window
 * lives in an about:blank document, so it is requested without any HTTP Referer and YouTube answers "Error 153
 * (video player configuration error)". Moving the live iframe into that window would reload it there with the same
 * missing referrer. So the one real player always stays on this page (where it has a valid origin and referrer)
 * and the float window shows artwork, live chapter, progress and controls that drive it. */
(function (A) {
  "use strict";
  const { $, $$, esc, clamp, fmtTime, STATE, RM } = A;
  const h = () => A.hist;
  const L = () => A.hist.L;

  const P = {
    yt: null, ready: false, apiLoading: null, cur: null, mode: "none", prevMode: "theater", pip: null, lastMedia: null, lastWall: 0, lastSave: 0, sess: null, cov: null, nB: 0,
    pending: null, cd: null, chIdx: -1, lastPos: 0, playing: false, side: "chapters", msLast: 0, fs: false, fsFallback: false, zen: false, dnd: false, sleep: null, loop: null,
    pomo: null, uiTimer: 0, menu: null, autoSkip: false, errCode: null, rail: false, lastState: -1,
  };
  A.P = P;
  const dock = () => $("#dock");
  const YT_ORIGIN = "https://www.youtube.com";
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]; // YouTube embeds cap at 2×

  /* ---------------------------------------------------------------- YouTube API (loaded on first play only) */
  function loadAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (P.apiLoading) return P.apiLoading;
    P.apiLoading = new Promise((res, rej) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
      const s = document.createElement("script");
      s.src = YT_ORIGIN + "/iframe_api";
      s.async = true;
      s.onerror = () => { P.apiLoading = null; rej(new Error("YouTube API failed to load")); };
      document.head.appendChild(s);
      setTimeout(() => { if (!(window.YT && window.YT.Player)) { P.apiLoading = null; rej(new Error("YouTube API timeout")); } }, 15000);
    });
    return P.apiLoading;
  }
  /* We build the iframe ourselves so referrerpolicy, origin and widget_referrer are set before the first request. */
  function embedSrc(id, start, auto) {
    const S = L().SETTINGS, nat = !!S.nativeControls;
    const q = new URLSearchParams({ enablejsapi: "1", autoplay: auto ? "1" : "0", start: String(Math.floor(start || 0)), rel: "0", modestbranding: "1", playsinline: "1", iv_load_policy: "3",
      controls: nat ? "1" : "0", disablekb: nat ? "0" : "1", fs: nat ? "1" : "0", cc_load_policy: S.captions && !(!nat && A.ccx && A.ccx.on() && A.ccx.has(id)) ? "1" : "0", cc_lang_pref: "en", hl: "en" });
    if (/^https?:$/.test(location.protocol)) { q.set("origin", location.origin); q.set("widget_referrer", location.href.split("#")[0]); }
    return `${YT_ORIGIN}/embed/${encodeURIComponent(id)}?${q.toString()}`;
  }
  /* Opening an episode never starts it: the player loads cued (poster + big play button) and starts when you press Play.
   * The only automatic start is the next episode after a Binge / autoplay countdown completes, in a sitting where you pressed
   * Play yourself (P.userPlayed). */
  function createPlayer(host, id, start, auto) {
    P.ready = false;
    const f = document.createElement("iframe");
    f.id = "ytFrame";
    f.title = "YouTube video player";
    f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    f.referrerPolicy = "strict-origin-when-cross-origin";
    f.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen; web-share");
    f.setAttribute("allowfullscreen", "");
    f.setAttribute("frameborder", "0");
    f.width = "100%"; f.height = "100%";
    f.src = embedSrc(id, start, auto);
    host.replaceWith(f);
    P.yt = new window.YT.Player(f, {
      events: {
        onReady: () => {
          P.ready = true;
          applySettings();
          if (P.pending && P.cur && P.pending.id === P.cur.id && P.pending.id !== id) { if (P.pending.auto) P.yt.loadVideoById({ videoId: P.pending.id, startSeconds: P.pending.start }); else cue(P.pending.id, P.pending.start); }
          else if (auto) { try { P.yt.playVideo(); } catch (x) {} }
          P.pending = null;
        },
        onStateChange: onState,
        onError: (ev) => onError(ev && ev.data),
        onPlaybackRateChange: () => { try { L().SETTINGS.speed = P.yt.getPlaybackRate(); paintSpeed(); } catch (x) {} },
        onPlaybackQualityChange: () => { paintQuality(); if (P.menu === "quality" || P.menu === "settings") renderMenu(P.menu); },
      },
    });
    return P.yt;
  }
  function destroyPlayer() {
    try { P.yt && P.yt.destroy && P.yt.destroy(); } catch (e) {}
    P.yt = null; P.ready = false; P.lastMedia = null;
  }
  function freshHost() {
    const box = $("#ytHost");
    const d = document.createElement("div");
    d.id = "ytPlayer";
    box.textContent = "";
    box.appendChild(d);
    return d;
  }

  function resumePoint(e) {
    const r = L().H.eps[e.id];
    if (!r || r.pos < 15) return 0;
    const d = e.dur || r.dur || 0;
    if (d && r.pos > d - 20) return 0;
    return Math.floor(r.pos);
  }

  async function play(id, o) {
    o = o || {};
    const e = STATE.byId.get(id);
    if (!e) return;
    hideCountdown();
    tick(true); flush();
    if (L().QUEUE.includes(id)) { h().setQueue(L().QUEUE.filter((x) => x !== id)); A.views && A.views.paintQueueCount(); }
    const start = o.at != null ? Math.floor(o.at) : resumePoint(e);
    if (P.cur && P.cur.id !== e.id && !o.back) { P.backStack = (P.backStack || []).filter((x) => x !== P.cur.id).concat(P.cur.id).slice(-30); }
    P.cur = e; P.sess = null; P.sessId = null; P.run = null; P.lastMedia = null; P.chIdx = -1; P.loop = null; P.errCode = null;
    P.autoSkip = e.fmt === "hearing" && L().SETTINGS.autoSkipHearing && start === 0 && o.at == null;
    const r = h().rec(e.id, true);
    P.nB = Math.max(1, Math.ceil((e.dur || r.dur || 1) / h().BUCKET));
    P.cov = h().covDecode(r.cov, P.nB);
    dock().hidden = false;
    $("#dockErr").hidden = true;
    const want = o.mode || (P.mode === "none" ? "theater" : o.mini ? (P.mode === "audio" ? "audio" : "mini") : P.mode === "audio" ? "audio" : P.mode === "mini" && o.keepMini ? "mini" : "theater");
    setMode(want);
    paintAll();
    P.lastPos = start; paintProgress(start); // a paused (cued) episode shows where it will start, e.g. a deep link's t=
    dock().classList.toggle("is-cued", !(!!o.autoplay && !!P.userPlayed));
    try { await loadAPI(); } catch (err) { showEmbedError(e, "api"); return; }
    if (!P.cur || P.cur.id !== e.id) return;
    const auto = !!o.autoplay && !!P.userPlayed;
    if (!P.yt) createPlayer(freshHost(), e.id, start, auto);
    else if (P.ready) { if (auto) P.yt.loadVideoById({ videoId: e.id, startSeconds: start }); else cue(e.id, start); applySettings(); }
    else P.pending = { id: e.id, start, auto };
    if (start > 0 && o.at == null) A.ui.toast(`Resume at <b>${fmtTime(start)}</b>`, { icon: "⏯️", action: { label: "Start over", fn: () => seek(0, true) }, ms: 6000 });
    r.last = Date.now();
    h().saveH();
    mediaSession(e);
    A.views && A.views.onNowPlaying && A.views.onNowPlaying(e);
    showUI();
  }

  function cue(id, start) {
    try { if (P.yt.cueVideoById) P.yt.cueVideoById({ videoId: id, startSeconds: start }); else { P.yt.loadVideoById({ videoId: id, startSeconds: start }); setTimeout(() => { try { P.yt.pauseVideo(); } catch (x) {} }, 300); } } catch (x) {}
  }
  function applySettings() {
    const S = L().SETTINGS;
    if (P.yt && P.ready) { try { P.yt.setVolume(S.vol); S.muted ? P.yt.mute() : P.yt.unMute(); P.yt.setPlaybackRate(Math.min(2, Number(S.speed) || 1)); } catch (e) {} }
    $$("[data-vol]").forEach((el) => (el.value = S.muted ? 0 : S.vol));
    $$('[data-pc="mute"]').forEach((b) => b.classList.toggle("is-muted", !!S.muted || S.vol === 0));
    paintSpeed(); paintQuality();
    dock().classList.toggle("is-native", !!S.nativeControls);
    $$('[data-pc="cc"]').forEach((b) => b.setAttribute("aria-pressed", String(!!S.captions || !!(A.ccx && A.ccx.on() && !S.nativeControls))));
    paintNativeBtn();
  }
  function paintSpeed() { const s = Math.min(2, Number(L().SETTINGS.speed) || 1); $$("[data-speedlbl]").forEach((el) => (el.textContent = (Math.round(s * 100) / 100) + "×")); }

  /* ---------------------------------------------------------------- errors: friendly fallback card */
  const ERR = {
    2: "YouTube rejected the request for this video (invalid parameter).",
    5: "YouTube's HTML5 player hit an error with this video.",
    100: "This video is unavailable: removed, private or not found.",
    101: "The channel does not allow this video to be played outside YouTube.",
    150: "The channel does not allow this video to be played outside YouTube.",
    153: "YouTube refused to start the embedded player here (Error 153: player configuration / missing referrer).",
    api: "The YouTube player could not load (offline, blocked by an extension, or a network filter).",
  };
  function onError(code) {
    P.errCode = code;
    tick(true); flush();
    showEmbedError(P.cur, code);
  }
  function showEmbedError(e, code) {
    const el = $("#dockErr"); dock().classList.remove("is-cued");
    el.hidden = false;
    const msg = ERR[code] || "This video could not be played here.";
    const r = e ? L().H.eps[e.id] : null;
    const t = r && r.pos > 5 ? Math.floor(r.pos) : 0;
    const url = e ? e.url + (t ? (e.url.includes("?") ? "&" : "?") + "t=" + t + "s" : "") : "#";
    const done = e && h().stateOf(e.id) === "done";
    el.innerHTML = `${e ? `<img class="err__bg" src="${esc(e.thumb)}" alt="" width="480" height="360" decoding="async">` : ""}<div class="err__card"><span class="err__ic" aria-hidden="true">!</span><b>${esc(msg)}</b>${code != null && code !== "api" ? `<small>YouTube error code ${esc(String(code))}</small>` : ""}<span>${esc(e ? e.title : "")}</span>
      <div class="err__act"><a class="btn btn--primary btn--sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${A.ui.ICON.yt}<span>Open on YouTube${t ? " at " + fmtTime(t) : ""}</span></a>
      <button class="btn btn--sm" data-pc="markwatched">${A.ui.ICON.check}<span>${done ? "Marked as watched" : "Mark as watched"}</span></button>
      <button class="btn btn--sm btn--ghost" data-pc="retry">Try again</button><button class="btn btn--sm btn--ghost" data-pc="next">Next episode</button></div></div>`;
  }

  function onState(ev) {
    const s = ev.data;
    P.lastState = s;
    P.playing = s === 1;
    document.body.classList.toggle("is-playing", P.playing);
    $$('[data-pc="play"]').forEach((b) => b.setAttribute("aria-label", P.playing ? "Pause (K)" : "Play (K)"));
    paintPip();
    if ("mediaSession" in navigator) try { navigator.mediaSession.playbackState = P.playing ? "playing" : "paused"; } catch (x) {}
    if (P.playing) {
      P.userPlayed = true; dock().classList.remove("is-cued");
      $("#dockErr").hidden = true;
      const d = P.yt.getDuration();
      if (d && P.cur) {
        const r = h().rec(P.cur.id, true);
        if (Math.abs((r.dur || 0) - d) > 2) {
          r.dur = d;
          const nB = Math.max(1, Math.ceil(d / h().BUCKET));
          if (nB !== P.nB) { const old = P.cov; P.cov = new Uint8Array(Math.ceil(nB / 8)); P.cov.set(old.subarray(0, P.cov.length)); P.nB = nB; }
        }
        // one session per episode per sitting (a new episode or a 30-minute break starts a new one); it is stored only
        // once real playback happens, so a play-then-seek never leaves a 0-second session behind
        if (!P.sess || P.sessId !== P.cur.id || Date.now() - P.sess.e > 30 * 60e3) {
          const t0 = Math.floor(P.yt.getCurrentTime() || 0);
          P.sess = { s: Date.now(), e: Date.now(), w: 0, a: t0, b: t0, m: 0 }; P.sessId = P.cur.id; P.sessStored = false;
          if (!r.first) r.first = Date.now();
        }
      }
      P.lastMedia = P.yt.getCurrentTime();
      P.lastWall = performance.now();
      if (P.autoSkip) { P.autoSkip = false; autoSkipHearing(); }
      if (L().SETTINGS.captions && !L().SETTINGS.nativeControls && !(A.ccx && A.ccx.on())) captionsOn(true);
      if (A.ccx && A.ccx.on()) quietYTCaptions();
      syncCCSoon();
    } else {
      tick(true);
      P.lastMedia = null; P.run = null;
      flush();
    }
    showUI();
    try { document.dispatchEvent(new CustomEvent("asfe:state", { detail: s })); } catch (x) {}
    if (s === 0) onEnded();
  }

  /* The strict watch clock. Counts only contiguous forward playback; seeks never count.
   * Background tabs and the float window can throttle timers, so a long gap counts only when
   * media time advanced at (almost exactly) the playback rate over that wall-clock gap. */
  function tick(force) {
    if (!P.yt || !P.ready || !P.cur) return;
    let t, st;
    try {
      const vd = P.yt.getVideoData && P.yt.getVideoData();
      if (vd && vd.video_id && vd.video_id !== P.cur.id) return;
      t = P.yt.getCurrentTime(); st = P.yt.getPlayerState();
    } catch (e) { return; }
    if (typeof t !== "number" || isNaN(t)) return;
    const now = performance.now();
    const r = h().rec(P.cur.id, true);
    if ((st === 1 || force) && P.lastMedia != null) {
      const dm = t - P.lastMedia;
      const dw = (now - P.lastWall) / 1000;
      const rate = (P.yt.getPlaybackRate && P.yt.getPlaybackRate()) || 1;
      let real = 0;
      if (dm > 0 && dw > 0 && dw < 5 && dm <= dw * rate * 1.5 + 0.75) real = Math.min(dw, dm / rate + 0.25);
      else if (dm > 0 && dw >= 5 && dw <= 600 && Math.abs(dm - dw * rate) <= Math.max(2.5, dw * rate * 0.06)) real = dm / rate;
      if (real > 0) {
        r.watched += real;
        const dk = A.dayKey(Date.now());
        L().H.daily[dk] = (L().H.daily[dk] || 0) + real;
        if (P.sess && P.sessId === P.cur.id) {
          if (!P.sessStored) { P.sessStored = true; P.sess.s = Date.now() - real * 1000; P.sess.a = Math.floor(P.lastMedia); r.sessions = r.sessions || []; r.sessions.push(P.sess); if (r.sessions.length > 200) r.sessions.splice(0, r.sessions.length - 200); }
          P.sess.w += real; P.sess.e = Date.now(); P.sess.b = Math.floor(t);
        }
        if (P.pip) h().bumpStat("pipSec", real);
        if (P.mode === "audio") h().bumpStat("audioSec", real);
        if (P.fs) h().bumpStat("fsSec", real);
        if (P.zen) h().bumpStat("zenSec", real);
        // coverage + "reached" only from a contiguous run of at least 3 s of real playback, so a seek (or a scrub
        // to the end that lets the video end) never marks slices or "reached" on its own
        if (!P.run) P.run = { from: P.lastMedia, real: 0 };
        P.run.real += real;
        if (P.run.real >= 3) {
          const a = Math.floor(P.run.from / h().BUCKET), b = Math.floor(t / h().BUCKET);
          for (let i = a; i <= b && i < P.nB; i++) P.cov[i >> 3] |= 1 << (i & 7);
          P.run.from = t;
          if (P.sess && P.sessId === P.cur.id) P.sess.m = Math.max(P.sess.m || 0, Math.floor(t));
        }
      } else P.run = null;
    }
    if (st === 1) { P.lastMedia = t; P.lastWall = now; } else if (!force) P.run = null;
    // the saved resume spot is the real playback position: never a reset to 0 from an unstarted/cued player
    if (st !== -1 && st !== 5 && !(t === 0 && st !== 1 && (r.pos || 0) > 0)) r.pos = t;
    r.last = Date.now(); P.lastPos = t;
    if (st === 1) timers(t);
    paintProgress(t);
    if (now - P.lastSave > 5000) flush();
    if (now - P.msLast > 4000) { P.msLast = now; msPosition(t); }
  }
  function flush() {
    if (!P.cur || !P.cov) return;
    const r = h().rec(P.cur.id, true);
    if (!(r.manual && !r.manual.partial)) {
      const covN = h().covCount(P.cov, P.nB);
      r.covN = covN;
      r.cov = h().covEncode(P.cov);
      r.pct = clamp(covN / P.nB, 0, 1);
    }
    if (!r.done && r.pct >= 0.9) { r.done = true; r.doneAt = Date.now(); A.ui.toast(`Completed: <b>${esc(P.cur.title.slice(0, 64))}</b>`, { icon: "✅" }); A.fx && A.fx.celebrate("complete", dock(), true); A.picks && A.picks.sync(P.cur.id); }
    P.lastSave = performance.now();
    h().saveH();
    paintCoverage();
    h().checkAwards();
    A.views && A.views.refreshCardsFor && A.views.refreshCardsFor(P.cur.id);
  }
  function reloadCov(id) { if (!P.cur || P.cur.id !== id) return; const r = h().rec(id, true); P.cov = h().covDecode(r.cov, P.nB); paintCoverage(); }
  setInterval(() => { tick(false); pomoTick(); }, 1000);
  setInterval(() => { if (!P.yt || !P.ready || !P.cur || dock().classList.contains("pv-hover-ctl")) return; let t; try { if (P.yt.getPlayerState() !== 1) return; t = P.yt.getCurrentTime(); } catch (x) { return; } if (typeof t === "number" && !isNaN(t)) paintProgress(t); }, 250);
  window.addEventListener("pagehide", () => { tick(true); flush(); });
  // Never pause when the tab is hidden or the window is minimised: only save progress.
  document.addEventListener("visibilitychange", () => { if (document.hidden) { tick(true); flush(); } });

  /* sleep timer, A–B loop, skip intro */
  function timers(t) {
    if (P.loop && P.loop.b != null && t >= P.loop.b) { P.lastMedia = null; P.run = null; try { P.yt.seekTo(P.loop.a, true); } catch (x) {} return; }
    const sl = P.sleep;
    if (sl) {
      const hit = (sl.type === "time" && Date.now() >= sl.until) || (sl.type === "chapter" && chapterAt(t) !== sl.ch);
      if (hit) { P.sleep = null; try { P.yt.pauseVideo(); } catch (x) {} A.ui.toast("Sleep timer: paused. Good night.", { icon: "🌙", force: true, ms: 5000 }); }
    }
  }

  function curTime() { try { return P.yt && P.ready ? P.yt.getCurrentTime() : P.lastPos; } catch (e) { return P.lastPos || 0; } }
  function durNow() { try { return (P.yt && P.ready && P.yt.getDuration && P.yt.getDuration()) || (P.cur && P.cur.dur) || 1; } catch (e) { return (P.cur && P.cur.dur) || 1; } }
  function seek(t, abs, o) {
    o = o || {};
    if (!P.yt || !P.ready) { if (P.cur && abs) P.pending = { id: P.cur.id, start: t }; return; }
    const cur = P.yt.getCurrentTime();
    const d = P.yt.getDuration() || (P.cur && P.cur.dur) || 0;
    const to = clamp(abs ? t : cur + t, 0, Math.max(0, d - 0.5));
    tick(false);
    P.lastMedia = null; P.run = null;
    h().bumpStat("seeks");
    P.yt.seekTo(to, true);
    if (!o.keepPaused && P.yt.getPlayerState() !== 1) P.yt.playVideo();
    paintProgress(to);
    if (!abs && !o.quiet) fx(t < 0 ? `−${Math.abs(Math.round(t))}s` : `+${Math.round(t)}s`, t < 0 ? "l" : "r");
  }
  function frameStep(dir) {
    if (!P.yt || !P.ready) { A.ui.toast("Start the video first", { ms: 1200 }); return; }
    if (P.yt.getPlayerState() === 1) { setSpeed((Number(L().SETTINGS.speed) || 1) + (dir > 0 ? 0.25 : -0.25)); return; }
    seek(dir / 30, false, { keepPaused: true, quiet: true });
    fx(dir > 0 ? "▸ 1 frame" : "◂ 1 frame", dir > 0 ? "r" : "l");
  }
  function jumpTo(id, t) {
    h().bumpStat("chapterJumps");
    if (P.cur && P.cur.id === id && P.yt && P.ready) seek(t, true);
    else play(id, { at: t, mini: P.mode === "mini" || P.mode === "audio" });
    h().checkAwards();
  }
  function togglePlay() {
    if (!P.yt || !P.ready) return;
    P.userPlayed = true;
    const on = P.yt.getPlayerState() === 1;
    on ? P.yt.pauseVideo() : P.yt.playVideo();
    fx(on ? "❚❚" : "▶", "c");
  }
  function setSpeed(v) {
    const S = L().SETTINGS;
    let s = clamp(Math.round(Number(v) * 100) / 100, 0.25, 2.5);
    let max = 2;
    try { const av = P.yt && P.ready && P.yt.getAvailablePlaybackRates && P.yt.getAvailablePlaybackRates(); if (av && av.length) max = Math.min(2, Math.max(...av)); } catch (x) {}
    if (s > max) { A.ui.toast(`YouTube's embedded player tops out at ${max}×`, { ms: 1800 }); s = max; }
    S.speed = s; A.store.set("settings:v3", S);
    if (!(P.yt && P.ready)) { paintSpeed(); A.ui.toast(`Speed ${s}× will apply when the video starts`, { ms: 1500 }); return; }
    try { P.yt.setPlaybackRate(s); } catch (x) {}
    // honest feedback: only confirm the rate YouTube actually reports
    setTimeout(() => {
      let real = s; try { real = P.yt.getPlaybackRate ? Number(P.yt.getPlaybackRate()) : s; } catch (x) {}
      if (Math.abs(real - s) > 0.01) { S.speed = real; A.store.set("settings:v3", S); paintSpeed(); A.ui.toast(`YouTube kept the speed at ${real}× for this video`, { ms: 2200 }); }
      else { paintSpeed(); fx(s + "×", "c"); }
    }, P.vWait == null ? 250 : P.vWait);
  }
  function setVol(v) { const S = L().SETTINGS; S.vol = clamp(Math.round(v), 0, 100); S.muted = S.vol === 0; A.store.set("settings:v3", S); applySettings(); }
  function toggleMute() { const S = L().SETTINGS; S.muted = !S.muted; if (!S.muted && S.vol === 0) S.vol = 60; A.store.set("settings:v3", S); applySettings(); fx(S.muted ? "Muted" : "Sound on", "c"); }
  function chapterAt(t) { if (!P.cur) return -1; let i = -1; P.cur.chapters.forEach((c, k) => { if (c.t != null && c.t <= t + 0.5) i = k; }); return i; }
  function prevChapter() { if (!P.cur) return; const t = curTime(); const prev = P.cur.chapters.filter((c) => c.t != null && c.t < t - 3).pop(); h().bumpStat("chapterJumps"); seek(prev ? prev.t : 0, true); }
  function nextChapter() { if (!P.cur) return; const t = curTime(); const nx = P.cur.chapters.find((c) => c.t != null && c.t > t + 1); if (nx) { h().bumpStat("chapterJumps"); seek(nx.t, true); } else A.ui.toast("No more chapters", { ms: 1200 }); }
  function skipIntro() { const c = P.cur && P.cur.chapters.find((x, i) => i > 0 && x.t != null); if (c) { h().bumpStat("chapterJumps"); seek(c.t, true); } else A.ui.toast("No intro chapter to skip in this episode", { ms: 1600 }); }
  function autoSkipHearing() {
    const e = P.cur; if (!e || !e.chapters.length) return;
    const names = e.stars.map((p) => A.fold(p.name).split(" ").pop()).filter((n) => n.length > 2);
    const c = e.chapters.find((x, i) => i > 0 && x.t != null && x.t > 30 && names.some((n) => A.fold(x.title + " " + x.detail).includes(n)));
    if (!c) return;
    seek(c.t, true, { quiet: true });
    A.ui.toast(`Hearing: skipped to the researcher at <b>${fmtTime(c.t)}</b>`, { icon: "⏭️", action: { label: "Back to start", fn: () => seek(0, true) }, ms: 6000 });
  }

  /* Shift+P: the episode you played before this one (YouTube's "previous video"); returns false when there is none */
  function playPrev() {
    const st = (P.backStack || []).filter((id) => STATE.byId.has(id) && (!P.cur || id !== P.cur.id));
    if (!st.length) return false;
    const id = st.pop(); P.backStack = st;
    play(id, { mini: P.mode !== "theater", keepMini: true, back: true, autoplay: !!P.userPlayed });
    return true;
  }
  function nextUp() { const list = A.recs.upNext(P.cur, 3); return list[0] || null; }
  function playNext() { const n = nextUp(); if (n) play(n.e.id, { mini: P.mode !== "theater", keepMini: true }); else A.ui.toast("Nothing left to suggest. You've seen it all!", { icon: "🎉" }); }
  function onEnded() {
    flush();
    if (P.loopAll && P.yt && P.ready) { try { P.yt.seekTo(0, true); P.yt.playVideo(); } catch (x) {} fx("↻ Loop", "c"); return; }
    if (P.sleep && P.sleep.type === "end") { P.sleep = null; A.ui.toast("Sleep timer: stopped at the end of the episode", { icon: "🌙", force: true }); return; }
    if (A.binge && A.binge.onEnded()) return; // Binge mode in Theater: slim 5 s "Up next" bar instead
    if (!L().SETTINGS.autoplay) return;
    const n = nextUp();
    if (!n) return;
    // background-friendly: timers are throttled in hidden tabs, so go straight to the next episode
    if (!P.userPlayed) return;
    if (document.hidden) { play(n.e.id, { mini: P.mode !== "theater", keepMini: true, autoplay: true }); return; }
    let left = A.binge ? A.binge.secs() : 15;
    $("#cdEp").innerHTML = `${A.ui.thumbImg(n.e, true)}<div><b>${esc(n.e.title)}</b><small>${A.ui.metaText(n.e)} · ${esc(n.why)}</small></div>`;
    $("#cdNum").textContent = left;
    $("#countdown").hidden = false;
    clearInterval(P.cd);
    P.cd = setInterval(() => { left--; $("#cdNum").textContent = left; if (left <= 0) { hideCountdown(); play(n.e.id, { mini: P.mode !== "theater", keepMini: true, autoplay: true }); } }, 1000);
    $("#cdPlay").onclick = () => { hideCountdown(); play(n.e.id, { mini: P.mode !== "theater", keepMini: true, autoplay: true }); };
    $("#cdCancel").onclick = hideCountdown;
  }
  function hideCountdown() { clearInterval(P.cd); P.cd = null; const c = $("#countdown"); if (c) c.hidden = true; if (A.binge && $("#bingeCd")) A.binge.hideCd(); }

  /* ---------------------------------------------------------------- dock modes */
  function setMode(m) {
    if (m !== "audio" && m !== "mini" && m !== "theater") m = "theater";
    const prev = P.mode, wasSticky = !!P.sticky;
    P.mode = m;
    const d = dock();
    if (wasSticky) { P.sticky = false; d.classList.remove("is-sticky"); document.body.classList.remove("has-sticky"); }
    P.stickyOff = false;
    d.classList.toggle("dock--grab", m === "mini");
    d.dataset.mode = m;
    d.classList.toggle("is-pip", !!P.pip);
    const th = $("#theater");
    const morph = m === "mini" && (prev === "theater" || wasSticky) && !d.hidden && !RM && !document.documentElement.classList.contains("rm") && !!d.style.left;
    if (m === "theater") {
      th.hidden = false;
      if (wasSticky || prev !== "theater") th.scrollTop = 0;
      document.body.classList.add("lock", "has-theater");
      d.style.left = d.style.top = d.style.width = d.style.right = d.style.bottom = "";
      requestAnimationFrame(placeDock);
    } else {
      th.hidden = true;
      document.body.classList.remove("lock", "has-theater");
      if (morph) { d.style.right = d.style.bottom = ""; startMorph(d); placeMini(); }
      else { d.style.left = d.style.top = d.style.width = d.style.right = d.style.bottom = ""; if (m === "mini") placeMini(); }
      if (m === "mini") requestAnimationFrame(placeMini);
    }
    document.body.classList.toggle("has-dock", m !== "theater" && !d.hidden);
    document.body.classList.toggle("has-audio", m === "audio" && !d.hidden);
    document.body.classList.toggle("has-mini", m === "mini" && !d.hidden);
    if (m !== "theater" && P.zen) toggleZen(false);
    if (m !== "theater") closeChSheet();
    closeMenu();
    paintArt();
    paintAmbient();
    paintModeButtons();
    try { document.dispatchEvent(new CustomEvent("asfe:layout")); } catch (x) {}
  }
  function placeDock() {
    if (P.mode !== "theater" || P.fs || P.sticky) return;
    const slot = $("#stageSlot"), d = dock(), th = $("#theater");
    if (!slot || !d) return;
    const r = slot.getBoundingClientRect();
    let w = r.width;
    const narrow = window.innerWidth < 900;
    // the episode page scrolls as a whole now: size from the slot's position in the page, not the viewport
    const topInPage = r.top + (th ? th.scrollTop : 0);
    const maxVideoH = Math.max(160, narrow ? window.innerHeight * 0.42 : window.innerHeight - topInPage - (P.zen ? 40 : 120));
    if ((w * 9) / 16 > maxVideoH) w = (maxVideoH * 16) / 9;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    w = Math.max(160, Math.min(w, r.width, vw - Math.max(0, r.left) - 4));
    slot.style.height = Math.round((w * 9) / 16) + "px";
    const r2 = slot.getBoundingClientRect();
    d.style.left = Math.round(Math.max(0, r2.left + (r2.width - w) / 2)) + "px";
    d.style.top = Math.round(r2.top) + "px";
    d.style.width = Math.round(w) + "px";
    d.style.setProperty("--dock-w", Math.round(w) + "px");
    paintAmbient();
  }
  /* every layout toggle (theater / read / focus / full screen / mini / panel collapse / split drag) re-places the player
   * now, on the next frame and once CSS transitions have settled, so no combination can leave it stale or clipped */
  function relayout() {
    const run = () => { if (P.mode === "theater" && !P.fs && !P.sticky) placeDock(); else if (P.mode === "mini" || P.sticky) placeMini(); };
    run(); requestAnimationFrame(run); clearTimeout(P.rlT); P.rlT = setTimeout(run, 360);
    try { document.dispatchEvent(new CustomEvent("asfe:layout")); } catch (x) {}
  }
  window.addEventListener("resize", () => requestAnimationFrame(() => { placeDock(); placeMini(); }));
  function minimize() { if (P.cur) { if (P.fs) exitFs(); setMode("mini"); } }
  function expand() {
    if (!P.cur) return;
    if (P.mode === "theater" && P.sticky) { backToTop(); return; }
    setMode("theater"); paintTheater(); paintSide();
  }

  /* ---------------------------------------------------------------- sticky mini: scroll past the video on the episode page and the
   * same player element shrinks into the (draggable) mini player; scroll back up and it returns. The iframe is never moved or
   * reloaded: only the dock's mode attribute and its left/top/width change. An IntersectionObserver watches the stage placeholder. */
  function setSticky(on) {
    on = !!on && P.mode === "theater" && !P.fs && !P.zen && !!P.cur && !P.stickyOff && !P.read;
    if (on === !!P.sticky) return false;
    const d = dock(); if (!d || d.hidden) return false;
    P.sticky = on;
    clearFlip(d);
    if (!RM && !document.documentElement.classList.contains("rm") && !P.flipNear) startMorph(d);
    d.dataset.mode = on ? "mini" : "theater";
    d.classList.toggle("is-sticky", on);
    d.classList.toggle("dock--grab", on);
    document.body.classList.toggle("has-sticky", on);
    closeMenu();
    if (on) placeMini(); else { d.style.right = d.style.bottom = ""; placeDock(); }
    paintAmbient(); paintModeButtons();
    return true;
  }
  function checkSticky() {
    if (P.mode !== "theater" || P.fs || !P.cur) return;
    const slot = $("#stageSlot"), th = $("#theater"); if (!slot || !th || th.hidden) return;
    const r = slot.getBoundingClientRect(), tr = th.getBoundingClientRect();
    const hgt = r.height || 1;
    const visible = (r.bottom - Math.max(tr.top, r.top)) / hgt; // share of the player still on screen
    /* works whenever the episode page scrolls at all: a short page (little to scroll) goes sticky once scrolled to its end */
    const laid = th.scrollHeight > 0 && th.clientHeight > 0, max = laid ? Math.max(0, th.scrollHeight - th.clientHeight) : Infinity;
    let want = th.scrollTop > Math.min(40, max * 0.5) && (visible < 0.4 || (max >= 8 && th.scrollTop >= max - 2));
    // hysteresis: once docked, stay docked until the page is scrolled back above where it docked (the panels re-flowing
    // full width under the page change its height, which must not undock it again)
    if (P.sticky && P.stickyAt != null && th.scrollTop >= P.stickyAt - 2 && th.scrollTop > 0) want = true;
    if (!want) P.stickyOff = false;
    if (setSticky(want) && want) P.stickyAt = th.scrollTop;
  }
  function backToTop() {
    const th = $("#theater"); if (!th) return;
    P.stickyOff = false;
    setSticky(false);
    try { th.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }); } catch (e) { th.scrollTop = 0; }
    if (!th.scrollTo) th.scrollTop = 0;
    requestAnimationFrame(placeDock);
  }
  function watchSlot() {
    const slot = $("#stageSlot"), th = $("#theater");
    if (!slot || !th || P.io || typeof IntersectionObserver === "undefined") return;
    P.io = new IntersectionObserver(() => checkSticky(), { root: th, threshold: [0, 0.1, 0.25, 0.4, 0.6, 0.8, 1] });
    P.io.observe(slot);
  }
  function audioMode() {
    if (!P.cur) return;
    if (P.fs) exitFs();
    if (P.mode === "audio") { setMode("mini"); A.ui.toast("Video is back", { ms: 1200 }); return; }
    setMode("audio");
    A.ui.toast("Headphones mode: playback continues while you browse, switch tabs or minimise", { icon: "🎧", ms: 3500 });
  }
  async function closePlayer() {
    tick(true); flush(); hideCountdown(); closeChSheet();
    if (P.fs) exitFs();
    if (P.zen) toggleZen(false);
    if (P.pip) { try { P.pip.close(); } catch (e) {} P.pip = null; }
    destroyPlayer();
    freshHost();
    P.cur = null; P.sleep = null; P.loop = null;
    dock().hidden = true;
    setMode("theater");
    $("#theater").hidden = true;
    document.body.classList.remove("lock", "has-theater", "has-dock", "has-audio", "has-mini", "is-playing");
    if ("mediaSession" in navigator) try { navigator.mediaSession.metadata = null; } catch (e) {}
  }

  /* ---------------------------------------------------------------- mini player: drop it anywhere, it stays exactly there
   * (remembered as a % of the viewport so it survives resizes, always clamped fully on-screen), a gentle 16 px edge magnet,
   * corner resize handle, double-click to expand. Also used by the sticky mini on the episode page. */
  const MINI_KEY = "mini:v3";
  const MAGNET = 16;
  function miniPrefs() { return Object.assign({ corner: "br", w: window.innerWidth <= 1020 ? 300 : 400 }, A.store.get(MINI_KEY, {}) || {}); }
  miniPrefs.raw = () => miniPrefs();
  function miniBounds() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const mob = vw <= 1020;
    return { vw, vh, m: mob ? 8 : 16, bottomPad: mob ? 74 : 16, reserve: mob && !P.sticky ? 66 : 0, minW: mob ? 220 : 260, maxW: Math.max(240, Math.min(760, vw - 32)) };
  }
  const miniActive = () => (P.mode === "mini" || !!P.sticky) && !P.fs;
  /* ONE shared mini-player state for every way the mini appears (Miniplayer button / i, sticky mini on scroll, another episode,
   * reloads, page changes): { x, y } = top-left as % of the viewport, w = width in px, corner = nearest corner (snap / resize anchor).
   * Nothing saved → bottom-right. Height is computed for the TARGET width (16:9 video + control bar), never read from the dock while
   * it is still animating from the big player, so the clamp can't push the mini away from the saved spot. */
  function miniH(d, w) {
    const bar = d && d.querySelector(".dock__bar");
    const bh = bar && bar.offsetHeight ? bar.offsetHeight : 0;
    if (bh && d.dataset.mode === "mini") P.miniBarH = bh;
    const v = d && d.querySelector(".dock__video"), vis = !v || getComputedStyle(v).display !== "none";
    const barH = P.miniBarH || bh;
    if (!barH) return (w * 9) / 16 + 60; // not laid out yet
    return Math.round((vis ? ((w - 2) * 9) / 16 : 0) + barH + 2);
  }
  function startMorph(d) {
    d.classList.add("is-morph"); clearTimeout(P.morphT);
    P.morphT = setTimeout(() => { d.classList.remove("is-morph"); placeMini(); }, 380);
  }
  function clampPos(left, top, w, hgt, b) { return { left: clamp(left, 0, Math.max(0, b.vw - w)), top: clamp(top, 0, Math.max(0, b.vh - hgt - b.reserve)) }; }
  function cornerOf(left, top, w, hgt, b) { return (top + hgt / 2 < b.vh / 2 ? "t" : "b") + (left + w / 2 < b.vw / 2 ? "l" : "r"); }
  function placeMini() {
    if (!miniActive()) return;
    const d = dock(); if (!d || d.hidden) return;
    const b = miniBounds(), pr = miniPrefs();
    const w = clamp(pr.w, b.minW, Math.min(b.maxW, b.vw - 2 * b.m));
    d.style.width = w + "px";
    const hgt = miniH(d, w);
    let left, top;
    if (typeof pr.x === "number" && typeof pr.y === "number") { left = (pr.x / 100) * b.vw; top = (pr.y / 100) * b.vh; }
    else { const c = pr.corner || "br"; left = c[1] === "l" ? b.m : b.vw - w - b.m; top = c[0] === "t" ? b.m + (b.vw > 1020 ? 60 : 0) : b.vh - hgt - b.bottomPad; }
    const p = nudgeOff(clampPos(left, top, w, hgt, b), w, hgt, b);
    d.style.left = Math.round(p.left) + "px";
    d.style.top = Math.round(p.top) + "px";
    d.style.right = d.style.bottom = "auto";
    d.dataset.corner = cornerOf(p.left, p.top, w, hgt, b);
  }
  /* the mini never sits on the reading panel (Read mode column or the mobile sheet): it is nudged beside or above it for as long
   * as the panel is open; the saved spot itself is not changed */
  function readRect() {
    const th = $("#theater"); if (!th || th.hidden || !P.read) return null;
    const el = $(".theater__side"); if (!el) return null;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null;
    return { left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(window.innerWidth, r.right), bottom: Math.min(window.innerHeight, r.bottom) };
  }
  function nudgeOff(p, w, hgt, b) {
    const r = readRect(); if (!r) return p;
    const hit = p.left < r.right && p.left + w > r.left && p.top < r.bottom && p.top + hgt > r.top;
    if (!hit) return p;
    if (r.left - w - b.m >= 0) return { left: r.left - w - b.m, top: p.top };
    if (r.right + w + b.m <= b.vw) return { left: r.right + b.m, top: p.top };
    if (r.top - hgt - b.m >= 0) return { left: p.left, top: r.top - hgt - b.m };
    return p;
  }
  /* ---------------------------------------------------------------- scroll-linked FLIP: between the big player and the sticky mini
   * the dock follows the scroll continuously (transform translate + scale, radius and shadow interpolated, one rAF per frame);
   * the iframe is never moved or reloaded. At the end it hands over to the real mini layout, scrolling back reverses it. */
  function miniRect() {
    const d = dock(), b = miniBounds(), pr = miniPrefs();
    const w = clamp(pr.w, b.minW, Math.min(b.maxW, b.vw - 2 * b.m)), hgt = miniH(d, w);
    let left, top;
    if (typeof pr.x === "number" && typeof pr.y === "number") { left = (pr.x / 100) * b.vw; top = (pr.y / 100) * b.vh; }
    else { const c = pr.corner || "br"; left = c[1] === "l" ? b.m : b.vw - w - b.m; top = c[0] === "t" ? b.m + (b.vw > 1020 ? 60 : 0) : b.vh - hgt - b.bottomPad; }
    const p = nudgeOff(clampPos(left, top, w, hgt, b), w, hgt, b);
    return { left: p.left, top: p.top, w, h: hgt };
  }
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function clearFlip(d) { d = d || dock(); if (!d) return; d.style.transform = d.style.borderRadius = d.style.boxShadow = d.style.transformOrigin = ""; d.classList.remove("is-flip"); P.flipP = 0; }
  function flipProgress() {
    const slot = $("#stageSlot"), th = $("#theater"); if (!slot || !th || th.hidden) return 0;
    const r = slot.getBoundingClientRect(), tr = th.getBoundingClientRect(), hgt = r.height || 1;
    const visible = (r.bottom - Math.max(tr.top, r.top)) / hgt;
    return clamp((1 - visible) / 0.6, 0, 1);
  }
  function flipStep() {
    const d = dock();
    if (!d || d.hidden || P.mode !== "theater" || P.fs || P.zen || P.read || !P.cur || RM || document.documentElement.classList.contains("rm")) { if (d && d.classList.contains("is-flip")) clearFlip(d); P.flipNear = false; return; }
    if (P.sticky) { if (d.classList.contains("is-flip")) clearFlip(d); P.flipNear = true; return; }
    const p = flipProgress(); P.flipP = p; P.flipNear = p > 0.85;
    if (p <= 0.001) { if (d.classList.contains("is-flip")) clearFlip(d); return; }
    const L0 = d.getBoundingClientRect(); if (!L0.width) return;
    const M = miniRect(), e = ease(p);
    const tx = (M.left - L0.left) * e, ty = (M.top - L0.top) * e, sc = 1 + (M.w / L0.width - 1) * e;
    d.classList.add("is-flip");
    d.style.transformOrigin = "0 0";
    d.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
    d.style.borderRadius = (16 * e / Math.max(0.2, sc)).toFixed(1) + "px";
    d.style.boxShadow = `0 ${Math.round(18 * e)}px ${Math.round(60 * e)}px rgba(0, 0, 0, ${(0.55 * e).toFixed(2)})`;
  }
  /* ---------------------------------------------------------------- Read mode: video on the left (~60 %), a tabbed reading panel on the
   * right that scrolls on its own (Summary / Chapters / Claims / Numbers / Notes); on phones the same panel is a bottom sheet you drag
   * up and down, never taller than the space under the video */
  function toggleRead(on) {
    on = on == null ? !P.read : !!on;
    P.read = on; A.store.set("readMode", on ? 1 : 0);
    if (on && P.sticky) setSticky(false);
    clearFlip();
    document.body.classList.toggle("is-read", on);
    const b = $("#thRead"); if (b) { b.setAttribute("aria-pressed", String(on)); b.title = on ? "Leave Read mode (Shift+R)" : "Read mode (Shift+R)"; }
    if (on && !["summary", "chapters", "claims", "numbers", "notes"].includes(P.side)) P.side = "summary";
    if (on) { const th = $("#theater"); if (th) th.scrollTop = 0; }
    sheetSize();
    paintSide();
    relayout();
    return on;
  }
  function sheetMax() { const slot = $("#stageSlot"); const r = slot ? slot.getBoundingClientRect() : { bottom: 0 }; return Math.max(120, window.innerHeight - Math.max(0, r.bottom) - 8); }
  function sheetSize(hpx) {
    const el = $(".theater__side"); if (!el) return;
    const mob = window.innerWidth <= 900;
    if (!P.read || !mob) { el.style.removeProperty("--sheet-h"); return; }
    const max = sheetMax();
    if (hpx == null) hpx = P.sheetH || Math.round(max * 0.6);
    P.sheetH = clamp(hpx, 64, max);
    el.style.setProperty("--sheet-h", Math.round(P.sheetH) + "px");
  }
  function sheetDrag() {
    const side = $(".theater__side"); if (!side || side.querySelector(".sheet__grip")) return;
    const g = document.createElement("button"); g.type = "button"; g.className = "sheet__grip"; g.setAttribute("aria-label", "Drag to resize the reading panel (tap to expand or collapse)");
    side.prepend(g);
    let st = null;
    g.addEventListener("pointerdown", (ev) => { if (!P.read || window.innerWidth > 900) return; st = { y: ev.clientY, h: P.sheetH || side.getBoundingClientRect().height, moved: false }; try { g.setPointerCapture(ev.pointerId); } catch (x) {} ev.preventDefault(); });
    g.addEventListener("pointermove", (ev) => { if (!st) return; const dy = st.y - ev.clientY; if (Math.abs(dy) > 4) st.moved = true; side.classList.add("is-dragging"); sheetSize(st.h + dy); });
    const end = () => { if (!st) return; side.classList.remove("is-dragging"); const max = sheetMax(); if (!st.moved) sheetSize((P.sheetH || 0) > max * 0.5 ? 64 : max); else { const snaps = [64, max * 0.5, max]; sheetSize(snaps.reduce((a, x) => (Math.abs(x - P.sheetH) < Math.abs(a - P.sheetH) ? x : a), snaps[0])); } st = null; placeMini(); };
    g.addEventListener("pointerup", end); g.addEventListener("pointercancel", end);
    g.addEventListener("keydown", (ev) => { if (ev.key === "ArrowUp") { ev.preventDefault(); sheetSize((P.sheetH || 64) + 60); } if (ev.key === "ArrowDown") { ev.preventDefault(); sheetSize((P.sheetH || 64) - 60); } });
  }
  window.addEventListener("resize", () => requestAnimationFrame(() => sheetSize()));
  function saveMiniPos(left, top, w) {
    const b = miniBounds(), d = dock();
    const ww = w || parseFloat(d.style.width) || 400;
    const o = { x: Math.round((left / b.vw) * 1e5) / 1e3, y: Math.round((top / b.vh) * 1e5) / 1e3, corner: cornerOf(left, top, ww, miniH(d, ww), b) };
    if (w) o.w = Math.round(w);
    A.store.set(MINI_KEY, Object.assign(miniPrefs(), o));
    return o;
  }
  /* drop: stay exactly where released (clamped on-screen); within 16 px of an edge it eases onto the standard margin */
  function dropMini(left, top) {
    const b = miniBounds(), d = dock();
    const w = parseFloat(d.style.width) || d.getBoundingClientRect().width || 400, hgt = miniH(d, w);
    const p = clampPos(left, top, w, hgt, b);
    const maxL = Math.max(0, b.vw - w), maxT = Math.max(0, b.vh - hgt - b.reserve);
    let mag = false;
    if (p.left < MAGNET) { p.left = Math.min(b.m, maxL); mag = true; } else if (maxL - p.left < MAGNET) { p.left = Math.max(0, maxL - b.m); mag = true; }
    if (p.top < MAGNET) { p.top = Math.min(b.m, maxT); mag = true; } else if (maxT - p.top < MAGNET) { p.top = Math.max(0, maxT - b.m); mag = true; }
    saveMiniPos(p.left, p.top);
    if (mag && !RM) { d.classList.add("is-snapping"); setTimeout(() => d.classList.remove("is-snapping"), 320); }
    placeMini();
    return p;
  }
  const snapMini = dropMini; // kept for older callers
  (function miniDrag() {
    let st = null;
    const isCtl = (t) => t.closest("button, input, select, a, [data-seekbar], .pv__menu, .dock__rs");
    document.addEventListener("pointerdown", (ev) => {
      const d = dock();
      if (!d || !miniActive() || !ev.target.closest || !ev.target.closest("#dock")) return;
      const r = d.getBoundingClientRect();
      const l0 = parseFloat(d.style.left), t0 = parseFloat(d.style.top);
      const box = { left: isNaN(l0) ? r.left : l0, top: isNaN(t0) ? r.top : t0, width: parseFloat(d.style.width) || r.width };
      if (ev.target.closest(".dock__rs")) {
        const c = d.dataset.corner || "br";
        const hgt = miniH(d, box.width);
        st = { kind: "resize", x0: ev.clientX, w0: box.width, anchorRight: c[1] === "r", anchorBottom: c[0] === "b", right: box.left + box.width, bottom: box.top + hgt, left: box.left, top: box.top, id: ev.pointerId };
        document.body.classList.add("is-resizing");
        ev.preventDefault(); return;
      }
      if (isCtl(ev.target)) return;
      if (ev.pointerType === "mouse" && ev.target.tagName === "IMG") ev.preventDefault(); // no native image drag ghost
      st = { kind: "drag", x0: ev.clientX, y0: ev.clientY, l0: box.left, t0: box.top, moved: false, id: ev.pointerId };
    });
    document.addEventListener("pointermove", (ev) => {
      if (!st) return;
      const d = dock(), b = miniBounds();
      if (st.kind === "resize") {
        const dx = ev.clientX - st.x0;
        const w = clamp(st.w0 + (st.anchorRight ? -dx : dx), b.minW, b.maxW);
        d.style.width = Math.round(w) + "px";
        const hgt = miniH(d, w);
        const p = clampPos(st.anchorRight ? st.right - w : st.left, st.anchorBottom ? st.bottom - hgt : st.top, w, hgt, b);
        d.style.left = Math.round(p.left) + "px"; d.style.top = Math.round(p.top) + "px";
        st.last = { left: p.left, top: p.top, w };
        return;
      }
      const dx = ev.clientX - st.x0, dy = ev.clientY - st.y0;
      if (!st.moved && Math.hypot(dx, dy) <= 5) return; // ≤ 5 px = a click (play / pause), more = a drag
      if (!st.moved) { st.moved = true; d.classList.add("is-dragging"); document.body.classList.add("is-grabbing"); try { d.setPointerCapture && d.setPointerCapture(st.id); } catch (x) {} }
      const w = parseFloat(d.style.width) || d.getBoundingClientRect().width || 400;
      const p = clampPos(st.l0 + dx, st.t0 + dy, w, miniH(d, w), b);
      d.style.left = Math.round(p.left) + "px";
      d.style.top = Math.round(p.top) + "px";
    });
    const end = () => {
      if (!st) return;
      const d = dock();
      if (st.kind === "drag" && st.moved) { d.classList.remove("is-dragging"); document.body.classList.remove("is-grabbing"); P.dragJustEnded = performance.now(); dropMini(parseFloat(d.style.left) || 0, parseFloat(d.style.top) || 0); }
      if (st.kind === "resize") { document.body.classList.remove("is-resizing"); if (st.last) { saveMiniPos(st.last.left, st.last.top, st.last.w); placeMini(); } }
      st = null;
    };
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
    document.addEventListener("dragstart", (ev) => { if (ev.target.closest && ev.target.closest("#dock")) ev.preventDefault(); });
    /* buttons inside the mini (play, skip, volume, headphones, expand, close, centre play…) never start a drag: their pointerdown
     * stops at the dock, so only the transparent video layer (#pvHit, over the iframe), the title strip and the edges drag it */
    const stopCtl = (ev) => { if (!miniActive()) return; const t = ev.target; if (t.closest && t.closest("button, a, input, select, .pv__menu") && !t.closest(".dock__rs")) ev.stopPropagation(); };
    const hook = () => { const d = dock(); if (d && !d.dataset.ctlStop) { d.dataset.ctlStop = "1"; d.addEventListener("pointerdown", stopCtl); } };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hook); else hook();
  })();

  /* ---------------------------------------------------------------- fullscreen cinema (on the player shell, never the bare iframe) */
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  async function toggleFs() { if (P.fs) return exitFs(); return enterFs(); }
  async function enterFs() {
    closeChSheet();
    if (!P.cur) { A.ui.toast("Play an episode first", { ms: 1500 }); return; }
    const d = dock();
    if (P.sticky) { setSticky(false); const th = $("#theater"); if (th) th.scrollTop = 0; }
    P.fsPrevMode = P.mode;
    const req = d.requestFullscreen || d.webkitRequestFullscreen;
    if (req) {
      try { await req.call(d, { navigationUI: "hide" }); if (fsEl() === d) { onFsChange(); return "native"; } } catch (e) { /* fall through to the CSS fallback */ }
    }
    P.fsFallback = true; setFsState(true); return "fallback";
  }
  async function exitFs() {
    if (P.fsFallback) { P.fsFallback = false; setFsState(false); return; }
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (fsEl() && ex) { try { await ex.call(document); } catch (e) {} }
    onFsChange();
  }
  function onFsChange() { if (P.fsFallback) return; setFsState(fsEl() === dock()); }
  function setFsState(on) {
    if (P.fs === on) return;
    P.fs = on;
    const d = dock();
    d.classList.toggle("is-fs", on);
    document.body.classList.toggle("fs-fallback", on && P.fsFallback);
    paintModeButtons();
    if (on) { if (A.fsp) { P.rail = false; paintRail(); A.fsp.onFs(true); } else { P.rail = window.innerWidth > 900 && !!(P.cur && P.cur.chapters.length); paintRail(); } showUI(); try { screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape").catch(() => {}); } catch (x) {} }
    else { P.rail = false; paintRail(); A.fsp && A.fsp.onFs(false); relayout(); }
    paintAmbient();
    try { document.dispatchEvent(new CustomEvent("asfe:layout")); } catch (x) {}
  }
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);

  /* ---------------------------------------------------------------- Focus mode + Pomodoro + do-not-disturb */
  function toggleZen(force) {
    const on = force == null ? !P.zen : !!force;
    if (on === P.zen) return;
    P.zen = on;
    if (on && P.sticky) setSticky(false);
    document.body.classList.toggle("is-zen", on);
    if (on) {
      if (P.mode !== "theater") expand();
      P.dnd = true;
      P.pomo = { phase: "focus", until: Date.now() + 25 * 60e3 };
      A.ui.toast("Focus mode: notifications paused, 25-minute Focus timer started. Esc or Z to leave.", { icon: "🧘", force: true, ms: 3500 });
    } else { P.dnd = false; P.pomo = null; }
    paintPomo(); paintAmbient();
    relayout();
    $$('[data-pc="zen"]').forEach((b) => b.setAttribute("aria-pressed", String(on)));
    const zb = $("#thZen"); if (zb) zb.setAttribute("aria-pressed", String(on));
  }
  function toggleDnd() { P.dnd = !P.dnd; A.ui.toast(P.dnd ? "Do not disturb: badges, XP and tips stay quiet" : "Notifications back on", { icon: P.dnd ? "🔕" : "🔔", force: true, ms: 1800 }); if (P.menu) renderMenu(P.menu); }
  function pomoTick() {
    if (!P.pomo) return;
    const left = P.pomo.until - Date.now();
    if (left <= 0) {
      if (P.pomo.phase === "focus") { P.pomo = { phase: "break", until: Date.now() + 5 * 60e3 }; try { P.yt && P.ready && P.yt.pauseVideo(); } catch (x) {} A.ui.toast("Focus block done. Take a 5-minute break.", { icon: "☕", force: true, ms: 6000, action: { label: "Keep watching", fn: () => { P.pomo = { phase: "focus", until: Date.now() + 25 * 60e3 }; togglePlay(); } } }); }
      else { P.pomo = { phase: "focus", until: Date.now() + 25 * 60e3 }; A.ui.toast("Break over: back to focus", { icon: "🧘", force: true, action: { label: "Resume", fn: () => { try { P.yt.playVideo(); } catch (x) {} } } }); }
    }
    paintPomo();
  }
  function paintPomo() {
    const el = $("#pvPomo"); if (!el) return;
    if (!P.pomo) { el.hidden = true; return; }
    el.hidden = false;
    const left = Math.max(0, P.pomo.until - Date.now()) / 1000;
    el.textContent = `${P.pomo.phase === "focus" ? "Focus" : "Break"} ${fmtTime(left)}`;
  }

  /* ---------------------------------------------------------------- captions, quality */
  function captionsOn(silent) {
    try { P.yt.loadModule && P.yt.loadModule("captions"); P.yt.setOption && P.yt.setOption("captions", "track", { languageCode: "en" }); } catch (x) {}
    if (silent) return;
    // confirm only if YouTube reports a caption track (getOption returns {} when there is none)
    setTimeout(() => {
      let tr = null; try { tr = P.yt.getOption ? P.yt.getOption("captions", "track") : undefined; } catch (x) {}
      if (tr === undefined) { fx("CC requested", "c"); return; }
      if (tr && (tr.languageCode || tr.displayName)) fx("CC on", "c");
      else { A.ui.toast("This video has no captions YouTube can show here", { icon: "💬", ms: 2600 }); const S = L().SETTINGS; S.captions = false; A.store.set("settings:v3", S); applySettings(); }
    }, P.vWait == null ? 1500 : P.vWait);
  }
  /* what YouTube's caption module is really doing: true (a track is shown), false (module off / no track), null (the player can't tell) */
  function ccActual() {
    if (!(P.yt && P.ready) || !P.yt.getOption) return null;
    try {
      const mods = P.yt.getOptions ? P.yt.getOptions() : null;
      if (Array.isArray(mods) && !mods.includes("captions") && !mods.includes("cc")) return false;
      const tr = P.yt.getOption("captions", "track");
      if (tr === undefined || tr === null) return null;
      return !!(tr.languageCode || tr.displayName || tr.vss_id);
    } catch (x) { return null; }
  }
  /* keep the CC button (and the saved setting) in step with the captions actually on screen */
  function syncCC() {
    const real = ccActual(); const S = L().SETTINGS;
    if (real != null && real !== !!S.captions) { S.captions = real; A.store.set("settings:v3", S); }
    $$('[data-pc="cc"]').forEach((b) => b.setAttribute("aria-pressed", String(!!S.captions || !!(A.ccx && A.ccx.on() && !S.nativeControls))));
    if (P.menu === "settings") renderMenu("settings");
    return real;
  }
  /* our caption overlay is showing: keep YouTube's own captions unloaded. YouTube re-applies a CC preference remembered from its own
     controls a moment after playback starts, so unload again at 0.7 s and 3 s (live QA: both caption layers showed together) */
  function quietYTCaptions() {
    const off = () => { if (!(A.ccx && A.ccx.on()) || L().SETTINGS.nativeControls || !P.yt) return; try { P.yt.unloadModule && P.yt.unloadModule("captions"); P.yt.unloadModule && P.yt.unloadModule("cc"); } catch (x) {} };
    off(); clearTimeout(P.qcT1); clearTimeout(P.qcT2);
    P.qcT1 = setTimeout(off, P.vWait == null ? 700 : P.vWait); P.qcT2 = setTimeout(off, P.vWait == null ? 3000 : P.vWait + 10);
  }
  function syncCCSoon() { clearTimeout(P.ccT1); clearTimeout(P.ccT2); P.ccT1 = setTimeout(syncCC, P.vWait == null ? 700 : P.vWait); P.ccT2 = setTimeout(syncCC, P.vWait == null ? 3000 : P.vWait + 10); }
  function toggleCC() {
    const S = L().SETTINGS;
    if (A.ccx && !S.nativeControls && P.cur && S.ccSource !== "youtube" && A.ccx.has(P.cur.id)) {
      const on = A.ccx.toggle();
      if (on && P.yt && P.ready) { try { P.yt.unloadModule && P.yt.unloadModule("captions"); P.yt.unloadModule && P.yt.unloadModule("cc"); } catch (x) {} }
      $$('[data-pc="cc"]').forEach((b) => b.setAttribute("aria-pressed", String(on)));
      fx(on ? "CC on" : "CC off", "c");
      return on;
    }
    const real = ccActual(); const was = real == null ? !!S.captions : real;
    S.captions = !was; A.store.set("settings:v3", S);
    if (P.yt && P.ready) { if (S.captions) captionsOn(); else { try { P.yt.unloadModule && P.yt.unloadModule("captions"); P.yt.unloadModule && P.yt.unloadModule("cc"); } catch (x) {} fx("CC off", "c"); } syncCCSoon(); }
    applySettings();
  }
  function qualities() { try { return (P.yt && P.ready && P.yt.getAvailableQualityLevels && P.yt.getAvailableQualityLevels()) || []; } catch (x) { return []; } }
  const QL = { tiny: "144p", small: "240p", medium: "360p", large: "480p", hd720: "720p", hd1080: "1080p", hd1440: "1440p", hd2160: "4K", highres: "8K", auto: "Auto", default: "Auto", unknown: "Auto" };
  const qLabel = (q) => QL[q] || q || "Auto";
  function curQuality() { try { return (P.yt && P.ready && P.yt.getPlaybackQuality && P.yt.getPlaybackQuality()) || "unknown"; } catch (x) { return "unknown"; } }
  function paintQuality() { const q = curQuality(); $$('[data-pc="settings"]').forEach((b) => { if (q && q !== "unknown" && q !== "auto" && q !== "default") b.dataset.q = qLabel(q).replace("p", ""); else delete b.dataset.q; }); return q; }
  /* YouTube's IFrame API largely ignores quality requests from embeds. Try once (setPlaybackQuality + reload at the current
   * time with suggestedQuality), then check what YouTube reports and only claim success if it really changed. */
  function setQuality(q) {
    if (!P.yt || !P.ready || !P.cur) { A.ui.toast("Start the video first", { ms: 1400 }); return Promise.resolve(false); }
    const before = curQuality(), t = curTime(), id = P.cur.id;
    if (before === q) { A.ui.toast(`Already playing at ${qLabel(q)}`, { ms: 1500 }); return Promise.resolve(true); }
    try { P.yt.setPlaybackQuality && P.yt.setPlaybackQuality(q); } catch (x) {}
    try { if (P.yt.loadVideoById) { const playing = P.playing; P.yt.loadVideoById({ videoId: id, startSeconds: Math.floor(t), suggestedQuality: q }); if (!playing) setTimeout(() => { try { P.yt.pauseVideo(); } catch (x) {} }, 400); } } catch (x) {}
    A.ui.toast(`Asking YouTube for ${qLabel(q)}…`, { ms: 1200 });
    return new Promise((res) => setTimeout(() => {
      const now = paintQuality();
      if (now === q) { A.ui.toast(`Quality: <b>${qLabel(q)}</b>`, { icon: "✅", ms: 1800 }); res(true); return; }
      const url = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}&t=${Math.floor(curTime())}s`;
      A.ui.toast(`YouTube controls quality automatically for embedded videos (still ${qLabel(now)}). Open it on YouTube at this moment to pick quality manually.`, { icon: "ℹ️", ms: 9000, force: true, action: { label: "Open on YouTube", fn: () => window.open(url, "_blank", "noopener,noreferrer") } });
      P.qFail = true; res(false);
    }, P.qWait == null ? 3000 : P.qWait));
  }
  function toggleNative(force) {
    const S = L().SETTINGS; const on = force == null ? !S.nativeControls : !!force;
    if (on === !!S.nativeControls && P.yt) return applySettings();
    S.nativeControls = on; A.store.set("settings:v3", S);
    paintNativeBtn();
    if (!P.cur) return applySettings();
    const t = curTime(), id = P.cur.id, wasPlaying = P.playing || P.lastState === 1;
    tick(true); flush(); destroyPlayer();
    createPlayer(freshHost(), id, Math.floor(t), wasPlaying && !!P.userPlayed);
    if (!wasPlaying) dock().classList.toggle("is-cued", true);
    applySettings();
    try { document.dispatchEvent(new CustomEvent("asfe:native", { detail: on })); } catch (x) {}
    A.ui.toast(on ? `YouTube's own controls at ${fmtTime(t)}: pick quality, captions and their style in YouTube's ⚙ menu. Press the ✕ chip (top right) to come back.` : `Cinema controls are back at ${fmtTime(t)}`, { icon: on ? "▶️" : "🎬", ms: 3600, force: true });
  }
  function paintNativeBtn() { const on = !!L().SETTINGS.nativeControls; $$('[data-pc="ytc"]').forEach((b) => { b.setAttribute("aria-pressed", String(on)); }); }

  /* ---------------------------------------------------------------- bookmarks, loop */
  function bookmark() {
    if (!P.cur) return;
    const t = curTime();
    h().addNote(P.cur.id, t, "🔖 Bookmark");
    h().bumpStat("bookmarks");
    paintMarks();
    A.ui.toast(`Bookmarked ${fmtTime(t)}`, { icon: "🔖", action: { label: "Add a note", fn: openNote }, ms: 3500 });
  }
  function setLoop(which) {
    if (!P.cur) return;
    const t = curTime();
    if (which === "clear") { P.loop = null; A.ui.toast("Loop cleared", { ms: 1000 }); }
    else if (which === "a") { P.loop = { a: t, b: null }; A.ui.toast(`Loop start ${fmtTime(t)}. Press ] at the end point.`, { icon: "🔁", ms: 2200 }); }
    else { if (!P.loop) P.loop = { a: Math.max(0, t - 30), b: null }; if (t <= P.loop.a + 1) { A.ui.toast("Loop end must be after the start", { ms: 1500 }); return; } P.loop.b = t; A.ui.toast(`Looping ${fmtTime(P.loop.a)} → ${fmtTime(t)}`, { icon: "🔁", ms: 2200 }); seek(P.loop.a, true, { quiet: true }); }
    paintMarks();
    if (P.menu) renderMenu(P.menu);
  }
  function setSleep(kind) {
    if (kind === "off") P.sleep = null;
    else if (kind === "chapter") P.sleep = { type: "chapter", ch: chapterAt(curTime()) };
    else if (kind === "end") P.sleep = { type: "end" };
    else P.sleep = { type: "time", until: Date.now() + Number(kind) * 60e3, mins: Number(kind) };
    A.ui.toast(P.sleep ? `Sleep timer: ${kind === "chapter" ? "end of this chapter" : kind === "end" ? "end of episode" : kind + " min"}` : "Sleep timer off", { icon: "🌙", ms: 1800 });
    if (P.menu) renderMenu(P.menu);
  }

  /* ---------------------------------------------------------------- Float window (Document PiP) = remote control / now playing */
  const PIP_CSS = `*{box-sizing:border-box}html,body{margin:0;height:100%;background:#05080d;color:#eef3f8;font:13px/1.35 Inter,system-ui,sans-serif;overflow:hidden}
  .w{position:relative;height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:14px;gap:8px;isolation:isolate}
  .bg{position:absolute;inset:-30px;z-index:-1;background-size:cover;background-position:center;filter:blur(28px) saturate(1.5) brightness(.45);transform:scale(1.1)}
  .top{display:flex;gap:12px;align-items:center;flex:1;min-height:0}
  .art{width:92px;height:92px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px var(--a,#f59e0b),0 10px 30px rgba(0,0,0,.6);flex:none}
  .tx{min-width:0}.t{font-weight:800;font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .c{color:var(--a,#f59e0b);font-size:12px;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.n{color:#b7c5d6;font-size:11.5px;margin-top:4px}
  .viz{display:flex;gap:3px;align-items:flex-end;height:26px}.viz i{flex:1;background:linear-gradient(var(--a,#f59e0b),var(--b,#14b8a6));border-radius:3px;height:20%;animation:v 1s ease-in-out infinite alternate}
  .paused .viz i{animation-play-state:paused}@keyframes v{to{height:100%}}
  .pp{height:6px;border-radius:6px;background:rgba(255,255,255,.18);cursor:pointer;overflow:hidden}.pp i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--a,#f59e0b),var(--b,#14b8a6))}
  .r{display:flex;gap:6px;align-items:center}.r button{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:7px 9px;font:inherit;cursor:pointer;min-width:36px}
  .r button:hover,.r button:focus-visible{border-color:var(--a,#f59e0b);outline:none}.r .pl{background:var(--a,#f59e0b);color:#111;border-color:transparent;font-weight:800;min-width:46px}.sp{flex:1}.tm{color:#cbd5e1;font-size:11px;font-variant-numeric:tabular-nums}
  .note{font-size:10.5px;color:#93a4b8;text-align:center}`;
  async function popOut() {
    if (!P.cur) { A.ui.toast("Play an episode first, then float it", { ms: 2500 }); return; }
    if (P.pip) { try { P.pip.focus(); } catch (e) {} return "focus"; }
    if (!("documentPictureInPicture" in window) || !window.documentPictureInPicture || !window.documentPictureInPicture.requestWindow) {
      A.ui.toast("Float window needs Chrome or Edge 116+. Switched to headphones mode instead: playback keeps going when you change tabs or minimise.", { icon: "🪟", ms: 6500 });
      if (P.mode !== "audio") setMode("audio");
      return "fallback";
    }
    let pw;
    try { pw = await window.documentPictureInPicture.requestWindow({ width: 380, height: 260 }); }
    catch (e) { A.ui.toast("The browser blocked the float window. Click the button again.", { icon: "🪟" }); return "blocked"; }
    P.pip = pw;
    h().bumpStat("pipUses");
    const doc = pw.document;
    doc.title = P.cur.title;
    const st = doc.createElement("style"); st.textContent = PIP_CSS; doc.head.appendChild(st);
    const cs = getComputedStyle(document.documentElement);
    doc.documentElement.style.setProperty("--a", (cs.getPropertyValue("--amber") || "#f59e0b").trim());
    doc.documentElement.style.setProperty("--b", (cs.getPropertyValue("--teal") || "#14b8a6").trim());
    const mk = (tag, cls, txt) => { const el = doc.createElement(tag); if (cls) el.className = cls; if (txt != null) el.textContent = txt; return el; };
    const w = mk("div", "w"); w.id = "pW";
    const bg = mk("div", "bg"); bg.id = "pBg";
    const top = mk("div", "top");
    const art = mk("img", "art"); art.id = "pArt"; art.alt = "";
    const tx = mk("div", "tx"); const t1 = mk("div", "t"); t1.id = "pT"; const c1 = mk("div", "c"); c1.id = "pC"; const n1 = mk("div", "n"); n1.id = "pN";
    tx.append(t1, c1, n1); top.append(art, tx);
    const viz = mk("div", "viz"); for (let i = 0; i < 28; i++) { const b = mk("i"); b.style.animationDelay = (-(i * 137) % 900) / 1000 + "s"; b.style.animationDuration = (0.6 + ((i * 53) % 70) / 100) + "s"; viz.appendChild(b); }
    const pp = mk("div", "pp"); pp.id = "pP"; const pf = mk("i"); pf.id = "pF"; pp.appendChild(pf);
    const row = mk("div", "r");
    const btn = (id, label, txt, cls) => { const b = mk("button", cls || "", txt); b.id = id; b.setAttribute("aria-label", label); b.title = label; return b; };
    row.append(btn("pPrev", "Previous chapter", "⏮"), btn("pBack", "Back 10 seconds", "−10"), btn("pPlay", "Play or pause", P.playing ? "❚❚" : "▶", "pl"), btn("pFwd", "Forward 10 seconds", "+10"), btn("pNextCh", "Next chapter", "⏭"), mk("span", "sp"), mk("span", "tm"), btn("pHome", "Back to the tab", "↩"));
    row.querySelector(".tm").id = "pTm";
    const note = mk("div", "note", "Video keeps playing in the main tab (YouTube only allows its player on the page itself).");
    w.append(bg, top, viz, pp, row, note);
    doc.body.appendChild(w);
    const g = (id) => doc.getElementById(id);
    g("pPlay").onclick = togglePlay; g("pBack").onclick = () => seek(-10); g("pFwd").onclick = () => seek(10);
    g("pPrev").onclick = prevChapter; g("pNextCh").onclick = nextChapter;
    g("pHome").onclick = () => { try { window.focus(); } catch (x) {} pw.close(); };
    g("pP").onclick = (ev) => { const r = g("pP").getBoundingClientRect(); seek(((ev.clientX - r.left) / Math.max(1, r.width)) * durNow(), true); };
    doc.addEventListener("keydown", (ev) => { if (ev.key === " " || ev.key === "k") { ev.preventDefault(); togglePlay(); } else if (ev.key === "ArrowLeft" || ev.key === "j") seek(-10); else if (ev.key === "ArrowRight" || ev.key === "l") seek(10); });
    $("#pipNote").hidden = false;
    dock().classList.add("is-pip");
    paintPip(true);
    pw.addEventListener("pagehide", () => { P.pip = null; $("#pipNote").hidden = true; dock().classList.remove("is-pip"); });
    A.ui.toast("Float window opened: it stays on top and controls the player in this tab", { icon: "🪟", ms: 4000 });
    h().checkAwards();
    return "remote";
  }
  function paintPip(full) {
    if (!P.pip || !P.cur) return;
    const d = P.pip.document;
    const t = P.lastPos || 0;
    const ci = chapterAt(t);
    const set = (id, v) => { const el = d.getElementById(id); if (el && el.textContent !== v) el.textContent = v; };
    if (full || d.getElementById("pT").textContent !== P.cur.title) {
      set("pT", P.cur.title);
      const art = d.getElementById("pArt"); art.src = new URL(A.ui.artFor(P.cur), location.href).href;
      d.getElementById("pBg").style.backgroundImage = `url("${P.cur.thumb}")`;
      d.title = P.cur.title;
    }
    set("pC", ci >= 0 ? `${fmtTime(P.cur.chapters[ci].t)} · ${P.cur.chapters[ci].title}` : A.ui.whoLine(P.cur));
    set("pN", A.ui.whoLine(P.cur, 3));
    set("pTm", `${fmtTime(t)} / ${fmtTime(durNow())}`);
    set("pPlay", P.playing ? "❚❚" : "▶");
    d.getElementById("pW").classList.toggle("paused", !P.playing);
    const f = d.getElementById("pF"); if (f) f.style.width = (100 * t / durNow()).toFixed(2) + "%";
  }

  /* ---------------------------------------------------------------- Media Session (lock screen / hardware keys) */
  function absUrl(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }
  function mediaSession(e) {
    if (!("mediaSession" in navigator) || typeof window.MediaMetadata !== "function") return;
    try {
      const art = A.ui.artFor(e);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: e.title, artist: e.stars.map((p) => p.name).slice(0, 3).join(", ") || e.channel, album: e.show || e.channel,
        artwork: [{ src: absUrl(art), sizes: "360x360", type: "image/jpeg" }, { src: e.thumb, sizes: "480x360", type: "image/jpeg" }],
      });
      const ms = navigator.mediaSession;
      const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch (x) {} };
      set("play", () => { try { P.yt.playVideo(); } catch (x) {} });
      set("pause", () => { try { P.yt.pauseVideo(); } catch (x) {} });
      set("seekbackward", (d) => seek(-((d && d.seekOffset) || 10)));
      set("seekforward", (d) => seek((d && d.seekOffset) || 10));
      set("seekto", (d) => d && d.seekTime != null && seek(d.seekTime, true));
      set("nexttrack", playNext);
      set("previoustrack", prevChapter);
      set("stop", closePlayer);
    } catch (x) {}
  }
  function msPosition(t) {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    try { const d = durNow(); if (d > 1) navigator.mediaSession.setPositionState({ duration: d, position: clamp(t, 0, d), playbackRate: (P.yt && P.yt.getPlaybackRate && P.yt.getPlaybackRate()) || 1 }); } catch (x) {}
  }

  /* ---------------------------------------------------------------- overlay UI: auto-hide, feedback, gestures */
  function showUI() {
    const d = dock(); if (!d) return;
    d.classList.add("pv--show");
    clearTimeout(P.uiTimer);
    P.uiTimer = setTimeout(() => { if (P.playing && !P.menu && !d.matches(".pv-hover-ctl")) d.classList.remove("pv--show"); }, P.fs ? 2600 : 3200);
  }
  function fx(text, where) {
    const el = $("#pvFx"); if (!el) return;
    el.textContent = text;
    el.dataset.at = where || "c";
    el.classList.remove("is-on"); void el.offsetWidth; el.classList.add("is-on");
  }
  (function gestures() {
    let tapT = 0, tapTimer = 0, sw = null;
    const hit = () => $("#pvHit");
    document.addEventListener("pointerdown", (ev) => {
      if (!ev.target.closest || ev.target !== hit()) return;
      showUI();
      if (ev.pointerType === "touch" && P.mode !== "mini" && !P.sticky) {
        const r = hit().getBoundingClientRect();
        sw = { x0: ev.clientX, y0: ev.clientY, w: r.width, h: r.height, right: ev.clientX - r.left > r.width / 2, vol0: L().SETTINGS.vol, t0: curTime(), axis: null };
      }
    });
    document.addEventListener("pointermove", (ev) => {
      if (ev.target.closest && ev.target.closest("#dock")) { if (!dock().classList.contains("pv--show")) showUI(); }
      if (!sw) return;
      const dx = ev.clientX - sw.x0, dy = ev.clientY - sw.y0;
      if (!sw.axis && Math.hypot(dx, dy) > 14) sw.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      const g = $("#pvGest");
      if (sw.axis === "x") { sw.off = Math.round((dx / sw.w) * 120); g.hidden = false; g.textContent = `${sw.off >= 0 ? "+" : "−"}${Math.abs(sw.off)}s → ${fmtTime(clamp(sw.t0 + sw.off, 0, durNow()))}`; }
      if (sw.axis === "y" && sw.right) { const v = clamp(sw.vol0 - (dy / sw.h) * 120, 0, 100); setVol(v); g.hidden = false; g.textContent = `Volume ${Math.round(v)}`; }
    }, { passive: true });
    document.addEventListener("pointerup", (ev) => {
      const g = $("#pvGest");
      if (sw) { const s = sw; sw = null; if (g) g.hidden = true; if (s.axis === "x" && s.off) { seek(s.t0 + s.off, true); return; } if (s.axis) return; }
      if (ev.target !== hit()) return;
      if (P.dragJustEnded && performance.now() - P.dragJustEnded < 250) return;
      const r = hit().getBoundingClientRect();
      const fx0 = (ev.clientX - r.left) / Math.max(1, r.width);
      const now = performance.now();
      if (now - tapT < 300) {
        clearTimeout(tapTimer); tapT = 0;
        if (P.mode === "mini" || P.sticky) { expand(); return; }
        if (fx0 < 0.35) seek(-10); else if (fx0 > 0.65) seek(10); else toggleFs();
        return;
      }
      tapT = now;
      const touch = ev.pointerType === "touch";
      tapTimer = setTimeout(() => {
        tapT = 0;
        if (touch) { const d = dock(); if (d.classList.contains("pv--show") && P.playing) d.classList.remove("pv--show"); else showUI(); }
        else togglePlay();
      }, 260);
    });
    document.addEventListener("dblclick", (ev) => { if (ev.target === hit()) ev.preventDefault(); });
  })();

  /* ---------------------------------------------------------------- menus (speed, quality, captions, sleep, loop, more) */
  function closeMenu() { P.menu = null; const m = $("#pvMenu"); if (m) m.hidden = true; $$('[data-pc="settings"],[data-pc="more"],[data-pc="speed"]').forEach((b) => b.setAttribute("aria-expanded", "false")); }
  function openMenu(kind, btn) {
    if (P.menu === kind) { closeMenu(); return; }
    P.menu = kind;
    renderMenu(kind);
    if (btn) btn.setAttribute("aria-expanded", "true");
    showUI();
  }
  function renderMenu(kind) {
    const m = $("#pvMenu"); if (!m) return;
    const S = L().SETTINGS, sp = Number(S.speed) || 1;
    const it = (pc, label, val, extra) => `<button class="mi" data-pc="${pc}" ${extra || ""}><span>${label}</span>${val != null ? `<b>${val}</b>` : ""}</button>`;
    let html = "";
    if (kind === "settings") {
      const sl = P.sleep ? (P.sleep.type === "time" ? `${Math.ceil((P.sleep.until - Date.now()) / 60e3)} min left` : P.sleep.type === "chapter" ? "end of chapter" : "end of episode") : "Off";
      html = `<p class="mh">Settings</p>${it("menu-speed", "Playback speed", esc(sp + "×"))}${it("menu-quality", "Quality", esc(qLabel(curQuality())))}${it("cc", "Captions (C)", S.captions || (A.ccx && A.ccx.on()) ? "On" : "Off")}${it("menu-sleep", "Sleep timer", esc(sl))}${it("menu-loop", "Loop A–B section", P.loop && P.loop.b != null ? esc(`${fmtTime(P.loop.a)}–${fmtTime(P.loop.b)}`) : "Off")}
        ${it("autoskip", "Auto-skip to researcher in hearings", S.autoSkipHearing ? "On" : "Off")}${it("autoplay", "Autoplay next", S.autoplay ? "On" : "Off")}${it("loopall", "Loop video", P.loopAll ? "On" : "Off")}${A.ccx ? it("ccstyle", "Caption style", "›") : ""}${it("ytc", "YouTube controls (quality, native captions)", S.nativeControls ? "On" : "Off")}`;
    } else if (kind === "speed") {
      html = `<p class="mh"><button class="mb" data-pc="menu-settings" aria-label="Back">‹</button>Speed <b>${esc(sp + "×")}</b></p><input type="range" class="msl" id="pvSpeedSl" min="0.25" max="2" step="0.05" value="${sp}" aria-label="Playback speed"><div class="mgrid">${SPEEDS.map((s) => `<button class="mc ${s === sp ? "is-on" : ""}" data-pc="speed-set" data-v="${s}">${s}×</button>`).join("")}</div><p class="mnote">Fine steps of 0.05×. YouTube embeds cap at 2×.</p>`;
    } else if (kind === "quality") {
      const q = qualities();
      html = `<p class="mh"><button class="mb" data-pc="menu-settings" aria-label="Back">‹</button>Quality</p><p class="mnote">Now playing: <b>${esc(qLabel(curQuality()))}</b>. YouTube ignores quality requests from embedded players, so a pick here would not stick. Switch to YouTube's own controls and choose it in their ⚙ menu: same video, same moment.</p>${q.length ? `<p class="mnote mq">Available: ${q.filter((x) => x !== "auto").map((x) => `<span title="${esc(x)}">${esc(qLabel(x))}<i hidden>${esc(x)}</i></span>`).join("")}</p>` : ""}${it("ytc", "Use YouTube controls to pick quality", "▶")}`;
    } else if (kind === "sleep") {
      html = `<p class="mh"><button class="mb" data-pc="menu-settings" aria-label="Back">‹</button>Sleep timer</p>${[["off", "Off"], ["15", "15 minutes"], ["30", "30 minutes"], ["60", "60 minutes"], ["chapter", "End of this chapter"], ["end", "End of episode"]].map(([v, l]) => it("sleep-set", l, null, `data-v="${v}"`)).join("")}`;
    } else if (kind === "loop") {
      html = `<p class="mh"><button class="mb" data-pc="menu-settings" aria-label="Back">‹</button>Loop A–B</p>${it("loop-a", "Set start here ([)", P.loop ? esc(fmtTime(P.loop.a)) : null)}${it("loop-b", "Set end here (])", P.loop && P.loop.b != null ? esc(fmtTime(P.loop.b)) : null)}${it("loop-clear", "Clear loop (\\)")}`;
    } else if (kind === "more") {
      html = `<p class="mh">More</p>${it("pip", "Float window (always on top)", "O")}${it("audio", "Headphones mode", "A")}${it("zen", "Focus mode", "Z")}${it("dnd", "Do not disturb", P.dnd ? "On" : "Off")}${it("bookmark", "Bookmark this moment", "B")}${it("note", "Note at this moment", "N")}${it("link", "Copy link at this time", "")}${it("markwatched", P.cur && h().stateOf(P.cur.id) === "done" ? "Mark as unwatched" : "Mark as watched", "")}${it("sharecard", "Share card image", "")}${it("rail", "Chapter rail", P.rail ? "On" : "Off")}`;
    }
    m.innerHTML = html;
    m.hidden = false;
    const sl = $("#pvSpeedSl"); if (sl) sl.oninput = () => { setSpeed(sl.value); const b = m.querySelector(".mh b"); if (b) b.textContent = L().SETTINGS.speed + "×"; };
  }

  /* ---------------------------------------------------------------- painting */
  function paintArt() {
    const e = P.cur;
    const src = e ? A.ui.artFor(e) : "";
    $$("[data-art]").forEach((el) => { if (!e) { el.textContent = ""; return; } let img = el.querySelector("img"); if (!img) { img = document.createElement("img"); img.alt = ""; img.width = 96; img.height = 96; img.decoding = "async"; el.appendChild(img); } if (img.getAttribute("src") !== src) img.src = src; });
    const hp = $("#hpTitle"); if (hp && e) { hp.textContent = e.title; $("#hpWho").textContent = A.ui.whoLine(e, 3); }
  }
  function paintAmbient() {
    const amb = $("#ambient"), e = P.cur;
    const on = !!e && P.mode === "theater" && !P.sticky && !P.fs && !dock().hidden;
    if (!amb) return;
    amb.hidden = !on;
    if (on) {
      const img = amb.querySelector("img");
      if (img.getAttribute("src") !== e.thumb) img.src = e.thumb;
      const d = dock().getBoundingClientRect();
      Object.assign(amb.style, { left: d.left + "px", top: d.top + "px", width: d.width + "px", height: d.height + "px" });
    }
    const inner = $("#dockAmb");
    if (inner && e) { let im = inner.querySelector("img"); if (!im) { im = document.createElement("img"); im.alt = ""; inner.appendChild(im); } if (im.getAttribute("src") !== e.thumb) im.src = e.thumb; }
  }
  function paintAll() { paintDockMeta(); paintArt(); paintTheater(); paintSide(); paintTicks(); paintMarks(); paintCoverage(); paintProgress(resumePoint(P.cur || { id: "" }) || 0); paintRail(); applySettings(); paintAmbient(); }
  function paintDockMeta() {
    if (!P.cur) return;
    $$("[data-ptitle]").forEach((el) => (el.textContent = P.cur.title));
    $("#dockChapter").textContent = A.ui.whoLine(P.cur);
    $$("[data-tdur]").forEach((el) => (el.textContent = P.cur.durStr || fmtTime(P.cur.dur)));
  }
  function paintProgress(t) {
    const d = durNow();
    const pc = clamp((100 * t) / d, 0, 100).toFixed(2) + "%";
    const sec = Math.max(0, Math.floor(t)), now = fmtTime(sec), txt = `${now} of ${fmtTime(d)}`;
    $$("[data-seekbar]").forEach((b) => {
      b.querySelector(".seekbar__fill").style.width = pc;
      b.setAttribute("aria-valuemax", String(Math.max(0, Math.floor(d))));
      b.setAttribute("aria-valuenow", String(sec));
      b.setAttribute("aria-valuetext", txt);
    });
    let buf = 0; try { buf = (P.yt && P.ready && P.yt.getVideoLoadedFraction && P.yt.getVideoLoadedFraction()) || 0; } catch (x) {}
    $$("[data-seekbar] .seekbar__buf").forEach((el) => (el.style.width = clamp(buf * 100, 0, 100).toFixed(1) + "%"));
    $$("[data-tnow]").forEach((el) => (el.textContent = now));
    const ci = chapterAt(t);
    if (ci !== P.chIdx) {
      P.chIdx = ci;
      const c = P.cur && P.cur.chapters[ci];
      const line = c ? `${fmtTime(c.t)} · ${c.title}` : (P.cur ? A.ui.whoLine(P.cur) : "");
      $("#dockChapter").textContent = line;
      $$("[data-pchap]").forEach((el) => (el.textContent = c ? c.title : ""));
      $$("#sideBody .chap, #pvRail .chap, #chSheet .chap").forEach((el) => el.classList.toggle("is-now", Number(el.dataset.i) === ci));
      const cs = $("#chSheet .chap.is-now"); if (cs && !$("#chSheet").hidden) { const lst = $("#chSheet .chsheet__list"), rr = cs.getBoundingClientRect(), lr = lst.getBoundingClientRect(); if (rr.top < lr.top || rr.bottom > lr.bottom) cs.scrollIntoView({ block: "nearest" }); }
      const now = $("#sideBody .chap.is-now");
      /* follow the current chapter only while the list is already on screen: the episode page scrolls as one page now,
       * so an unconditional scrollIntoView would yank the whole page (and push the player into its sticky mini). */
      if (now && P.side === "chapters" && !$("#theater").hidden) { const th = $("#theater"), r = now.getBoundingClientRect(), vh = th.clientHeight || window.innerHeight; const sideBySide = (window.innerWidth > 900 && !document.body.classList.contains("is-wide")) || !!P.read; const listOn = r.bottom > 0 && r.top < vh; if (sideBySide && listOn && !P.sticky) now.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" }); }
      const rn = $("#pvRail .chap.is-now"); if (rn && P.rail) rn.scrollIntoView({ block: "nearest" });
    }
    const sk = $("#pvSkip");
    if (sk && P.cur) {
      const ch = P.cur.chapters;
      const show = ch.length > 1 && ci === 0 && ch[0].t != null && ch[0].t <= 5 && ch[1].t != null && ch[1].t >= 20 && ch[1].t <= 900 && t > 2 && t < ch[1].t - 3;
      if (show) sk.textContent = `Skip intro › ${ch[1].title.slice(0, 40)}`;
      sk.hidden = !show;
    }
    paintPip();
  }
  function covGradient() {
    if (!P.cov) return "none";
    const stops = []; let run = null;
    for (let i = 0; i < P.nB; i++) {
      const on = !!(P.cov[i >> 3] & (1 << (i & 7)));
      if (on && run == null) run = i;
      if ((!on || i === P.nB - 1) && run != null) { const end = on ? i + 1 : i; stops.push(`transparent ${(100 * run / P.nB).toFixed(2)}%, var(--cov) ${(100 * run / P.nB).toFixed(2)}%, var(--cov) ${(100 * end / P.nB).toFixed(2)}%, transparent ${(100 * end / P.nB).toFixed(2)}%`); run = null; }
    }
    return stops.length ? `linear-gradient(90deg, ${stops.join(",")})` : "none";
  }
  function paintCoverage() { const g = covGradient(); $$("[data-seekbar] .seekbar__cov").forEach((el) => (el.style.background = g)); }
  function paintTicks() {
    const d = (P.cur && P.cur.dur) || 0;
    $$("[data-seekbar] .seekbar__ticks").forEach((el) => {
      el.textContent = "";
      if (!d) return;
      P.cur.chapters.filter((c) => c.t > 0 && c.t < d).forEach((c) => { const i = document.createElement("i"); i.style.left = (100 * c.t / d).toFixed(2) + "%"; el.appendChild(i); });
    });
  }
  function paintMarks() {
    const d = (P.cur && P.cur.dur) || 0;
    $$("[data-seekbar] .seekbar__marks").forEach((el) => {
      el.textContent = "";
      if (!d || !P.cur) return;
      (L().NOTES[P.cur.id] || []).forEach((n) => { const b = document.createElement("button"); b.className = "mark" + (/^🔖/.test(n.text) ? " mark--bm" : ""); b.style.left = (100 * n.t / d).toFixed(2) + "%"; b.dataset.seek = n.t; b.title = `${fmtTime(n.t)} · ${n.text.slice(0, 80)}`; b.setAttribute("aria-label", `Note at ${fmtTime(n.t)}`); el.appendChild(b); });
      if (P.loop) { const lp = document.createElement("span"); lp.className = "loopband"; lp.style.left = (100 * P.loop.a / d) + "%"; lp.style.width = P.loop.b != null ? (100 * (P.loop.b - P.loop.a) / d) + "%" : "2px"; el.appendChild(lp); }
    });
  }
  /* Chapters in every player state: fullscreen → the overlay rail inside the video; mini / headphones / sticky mini → expand to
   * the episode page on the Chapters tab; Theater with the reading column beside the video (wide screens, Read mode) → that
   * column on Chapters; otherwise (phones, tablets, Theater mode t) → a chapters sheet under the video that never covers it. */
  function sideBesideVideo() {
    const side = $(".theater__side"), th = $("#theater"); if (!side || !th || th.hidden) return false;
    if (P.read) return true;
    return window.innerWidth > 900 && !document.body.classList.contains("is-wide") && !P.sticky;
  }
  function openChapters(force) {
    if (!P.cur) return;
    if (P.fs) { if (A.fsp) { A.fsp.toggle(force); return; } P.rail = force == null ? !P.rail : !!force; paintRail(); return; }
    if (P.mode !== "theater" || P.sticky) { if (P.sticky) backToTop(); else expand(); }
    if (sideBesideVideo() && window.innerWidth > 900) {
      P.side = "chapters"; paintSide(); closeChSheet();
      const tab = $('#sideTabs [data-side="chapters"]'); if (tab) { tab.classList.remove("is-flash"); void tab.offsetWidth; tab.classList.add("is-flash"); }
      const now = $("#sideBody .chap.is-now") || $("#sideBody .chaps"); if (now) try { now.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" }); } catch (x) {}
      return;
    }
    const sh = $("#chSheet");
    if (sh && !sh.hidden && force !== true) { closeChSheet(); return; }
    openChSheet();
  }
  function chListHTML(e) {
    return `<ol class="chaps">${e.chapters.map((c, i) => `<li><button type="button" class="chap ${i === P.chIdx ? "is-now" : ""}" data-i="${i}" ${c.t == null ? "disabled" : `data-chseek="${c.t}"`}><span class="chap__t">${c.t == null ? "·" : fmtTime(c.t)}</span><span class="chap__tx"><b>${esc(c.title)}</b>${c.detail ? `<small>${esc(c.detail)}</small>` : ""}</span></button></li>`).join("")}</ol>`;
  }
  function openChSheet() {
    const e = P.cur; if (!e) return;
    let sh = $("#chSheet");
    if (!sh) {
      sh = document.createElement("section"); sh.id = "chSheet"; sh.className = "chsheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-label", "Chapters");
      document.body.appendChild(sh);
      sh.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-chseek]"); if (b && P.cur) { h().bumpStat("chapterJumps"); seek(Number(b.dataset.chseek), true, { keepPaused: !P.playing }); return; }
        if (ev.target.closest("[data-chclose]")) closeChSheet();
      });
      sh.addEventListener("input", (ev) => { if (ev.target.id !== "chQ") return; const q = A.fold(ev.target.value).trim(); $$("#chSheet .chaps > li").forEach((li) => (li.hidden = !!q && !A.fold(li.textContent).includes(q))); });
    }
    sh.innerHTML = `<header class="chsheet__hd"><b>Chapters</b><small>${e.chapters.length}</small><span class="grow"></span>${e.chapters.length > 6 ? `<input class="input input--sm" type="search" id="chQ" placeholder="Filter" aria-label="Filter chapters">` : ""}<button type="button" class="iconbtn iconbtn--sm" data-chclose aria-label="Close chapters">✕</button></header>
      <div class="chsheet__list">${e.chapters.length ? chListHTML(e) : `<p class="empty">No timestamped chapters for this one.</p>`}</div>`;
    sh.hidden = false; placeChSheet();
    document.body.classList.add("has-chsheet");
    const now = sh.querySelector(".chap.is-now"); if (now) try { now.scrollIntoView({ block: "nearest" }); } catch (x) {}
  }
  function placeChSheet() {
    const sh = $("#chSheet"); if (!sh || sh.hidden) return;
    const d = dock(), r = d && !d.hidden ? d.getBoundingClientRect() : { bottom: 0 };
    const wide = window.innerWidth > 900;
    // never over the video or its control bar: the sheet starts under the dock (or is a right-hand drawer beside it)
    if (wide && r.right && window.innerWidth - r.right >= 300) { sh.dataset.kind = "side"; sh.style.top = Math.max(8, r.top) + "px"; sh.style.left = Math.round(r.right + 12) + "px"; sh.style.height = ""; }
    else { sh.dataset.kind = "sheet"; sh.style.left = ""; sh.style.top = Math.round(Math.min(window.innerHeight - 140, Math.max(r.bottom + 8, window.innerHeight * 0.3))) + "px"; }
  }
  function closeChSheet() { const sh = $("#chSheet"); if (sh) sh.hidden = true; document.body.classList.remove("has-chsheet"); }
  window.addEventListener("resize", () => requestAnimationFrame(placeChSheet));
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { const sh = $("#chSheet"); if (sh && !sh.hidden) closeChSheet(); } });
  function paintRail() {
    const r = $("#pvRail"); if (!r) return;
    r.hidden = !P.rail || !P.cur;
    if (r.hidden) return;
    const e = P.cur;
    const bar = dock().querySelector(".pv__bottom"); if (bar && P.fs) r.style.bottom = Math.round((bar.offsetHeight || 96) + 8) + "px"; else r.style.bottom = "";
    r.innerHTML = `<p class="rail__h"><span>Chapters <small>${e.chapters.length}</small></span><button type="button" class="iconbtn iconbtn--sm" data-pc="rail" aria-label="Hide chapters">✕</button></p><ol class="chaps">${e.chapters.map((c, i) => `<li><button class="chap ${i === P.chIdx ? "is-now" : ""}" data-i="${i}" ${c.t == null ? "disabled" : `data-seek="${c.t}"`}><span class="chap__t">${c.t == null ? "·" : fmtTime(c.t)}</span><span class="chap__tx"><b>${esc(c.title)}</b></span></button></li>`).join("")}</ol>`;
  }
  /* seek bars: drag, hover tooltip with chapter + time + the nearest of YouTube's auto-generated frames */
  (function seekBars() {
    let drag = null;
    const pos = (bar, ev) => { const r = bar.getBoundingClientRect(); return clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1); };
    document.addEventListener("pointerdown", (ev) => {
      const bar = ev.target.closest && ev.target.closest("[data-seekbar]");
      if (!bar || !P.cur || ev.target.closest(".mark")) return;
      drag = bar; try { bar.setPointerCapture && bar.setPointerCapture(ev.pointerId); } catch (x) {}
      bar.querySelector(".seekbar__fill").style.width = (pos(bar, ev) * 100) + "%";
      dock().classList.add("pv-hover-ctl");
    });
    document.addEventListener("pointermove", (ev) => {
      if (!ev.target.closest || !P.cur) return;
      const bar = drag || ev.target.closest("[data-seekbar]");
      $$("[data-seekbar] .seekbar__tip").forEach((t) => { if (!bar || t.parentNode !== bar) t.hidden = true; });
      if (!bar) return;
      const tip = bar.querySelector(".seekbar__tip");
      const p = pos(bar, ev), t = p * durNow();
      const ci = chapterAt(t); const c = P.cur.chapters[ci];
      const frame = p < 0.375 ? 1 : p < 0.625 ? 2 : 3;
      tip.hidden = false;
      tip.style.left = clamp(p * 100, 8, 92) + "%";
      tip.innerHTML = `${bar.dataset.seekbar === "big" ? `<img src="https://i.ytimg.com/vi/${esc(P.cur.id)}/mq${frame}.jpg" alt="" width="160" height="90" decoding="async">` : ""}<b>${fmtTime(t)}</b>${c ? `<span>${esc(c.title)}</span>` : ""}`;
      if (drag) drag.querySelector(".seekbar__fill").style.width = (p * 100) + "%";
    });
    document.addEventListener("pointerup", (ev) => { if (!drag) return; const b = drag; drag = null; dock().classList.remove("pv-hover-ctl"); seek(pos(b, ev) * durNow(), true); });
    document.addEventListener("keydown", (ev) => {
      const bar = ev.target.closest && ev.target.closest("[data-seekbar]");
      if (!bar || ev.target !== bar) return;
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") { ev.preventDefault(); ev.stopPropagation(); seek(ev.key === "ArrowLeft" ? -5 : 5); }
      if (ev.key === "Home") { ev.preventDefault(); ev.stopPropagation(); seek(0, true); }
      if (ev.key === "End") { ev.preventDefault(); ev.stopPropagation(); seek(durNow() - 5, true); }
    }, true);
  })();

  function paintTheater() {
    const e = P.cur; if (!e) return;
    if (P.read == null) { P.read = false; if (A.store.get("readMode", 0)) toggleRead(true); }
    if (A.binge) setTimeout(() => A.binge.paintRail(), 0);
    $("#thCrumb").innerHTML = `<b>${esc(e.title)}</b>`;
    const L0 = L();
    const fav = L0.FAVS.has(e.id), q = L0.QUEUE.includes(e.id), done = h().stateOf(e.id) === "done";
    $("#thInfo").innerHTML = `
      <h1 class="th__title">${esc(e.title)}</h1>
      <p class="th__meta"><span>${esc(A.fmtDate(e.date, e.approx))}</span><span>${esc(e.durStr)}</span><span>${esc(A.ui.showLine(e))}</span><span class="lvl lvl--${A.slug(e.level)}">${esc(e.level)}</span>${e.views ? `<span>${A.ui.fmtViews(e.views)} views</span>` : ""}</p>
      <div class="th__people">${e.people.map((p) => `<a class="person ${p.host ? "person--host" : ""}" href="#/speaker/${esc(p.slug)}" data-closeth>${A.ui.avatar(p.name, 34)}<span><b>${esc(p.name)}</b><small>${p.host ? "Host" : esc((A.ui.speakerOf(p.name) || {}).org || p.desc || "")}</small></span></a>`).join("")}</div>
      <div class="th__act">
        <button class="btn btn--sm" data-th="fav">${fav ? A.ui.ICON.heartF : A.ui.ICON.heart}<span>${fav ? "Favourited" : "Favourite"}</span></button>
        <button class="btn btn--sm" data-th="queue">${q ? A.ui.ICON.queued : A.ui.ICON.queue}<span>${q ? "Queued" : "Queue"}</span></button>
        <button class="btn btn--sm" data-th="watched">${A.ui.ICON.check}<span>${done ? "Mark unwatched" : "Mark as watched"}</span></button>
        <button class="btn btn--sm" data-th="playlist">${A.ui.ICON.list}<span>Save to playlist</span></button>
        <button class="btn btn--sm" data-th="link">${A.ui.ICON.link}<span>Copy link at current time</span></button>
        <button class="btn btn--sm" data-th="share">${A.ui.ICON.share}<span>Share</span></button>
        <button class="btn btn--sm" data-th="details">Full report</button>
        <a class="btn btn--sm btn--ghost" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${A.ui.ICON.yt}<span>YouTube</span></a>
      </div>
      ${A.feat ? A.feat.rateTagHTML(e.id) : ""}
      ${e.whyWatch ? `<p class="th__why"><b>Why watch:</b> ${esc(e.whyWatch)}</p>` : ""}
      <p class="th__sum">${esc(e.summary)}</p>
      ${e.tags.length ? `<p class="tags">${e.tags.map((t) => `<a class="tag" href="#/browse?tag=${encodeURIComponent(t)}" data-closeth>${esc(t)}</a>`).join("")}</p>` : ""}`;
  }
  function paintSide() {
    const e = P.cur; const body = $("#sideBody"); if (!e || !body) return;
    $$("#sideTabs [data-side]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.side === P.side)));
    setTimeout(applySideFilter, 0);
    if (P.side === "summary") {
      body.innerHTML = coverageHTML(e) + `<div class="rd__sum"><p class="th__sum">${esc(e.summary || "No summary recorded.")}</p>${e.whyWatch ? `<h3 class="side__h">Why watch</h3><p>${esc(e.whyWatch)}</p>` : ""}${e.topics.length ? `<h3 class="side__h">Topics</h3><ul class="topics">${e.topics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}<h3 class="side__h">Speakers</h3><p>${esc(A.ui.whoLine(e, 8))}</p></div>`;
    } else if (P.side === "numbers") {
      body.innerHTML = e.numbers.length ? `<ul class="claims">${e.numbers.map((c) => `<li class="claim claim--num"><button class="claim__t" data-seek="${c.t == null ? "" : c.t}" ${c.t == null ? "disabled" : ""}>${c.t == null ? "·" : fmtTime(c.t)}</button><div><p><span class="numtag">#</span>${esc(c.text)}</p>${c.speaker ? `<small>${esc(c.speaker)}</small>` : ""}</div></li>`).join("")}</ul>` : `<p class="empty">No numbers recorded for this one.</p>`;
    } else if (P.side === "chapters") {
      body.innerHTML = (e.chapters.length > 6 ? sideFilterHTML("Filter chapters") : "") + (e.chapters.length ? `<ol class="chaps">${e.chapters.map((c, i) => `<li><button class="chap ${i === P.chIdx ? "is-now" : ""}" data-i="${i}" data-seek="${c.t == null ? "" : c.t}" ${c.t == null ? "disabled" : ""}><span class="chap__t">${c.t == null ? "·" : fmtTime(c.t)}</span><span class="chap__tx"><b>${esc(c.title)}</b>${c.detail ? `<small>${esc(c.detail)}</small>` : ""}</span></button></li>`).join("")}</ol>` + (e.topics.length ? `<h3 class="side__h">Topics</h3><ul class="topics">${e.topics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "")
        : `<p class="empty">No timestamped chapters for this one.</p>${e.topics.length ? `<ul class="topics">${e.topics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}`);
    } else if (P.side === "claims") {
      const items = e.claims.map((c) => ({ ...c, k: "claim" })).concat(e.numbers.map((n) => ({ ...n, k: "num" })));
      body.innerHTML = (items.length > 4 ? sideFilterHTML("Filter claims and numbers") : "") + (items.length ? `<ul class="claims">${items.map((c) => `<li class="claim ${c.k === "num" ? "claim--num" : ""}"><button class="claim__t" data-seek="${c.t == null ? "" : c.t}" ${c.t == null ? "disabled" : ""}>${c.t == null ? "·" : fmtTime(c.t)}</button><div><p>${c.k === "num" ? `<span class="numtag">#</span>` : ""}${esc(c.text)}</p>${c.speaker ? `<small>${esc(c.speaker)}</small>` : ""}</div></li>`).join("")}</ul>` : `<p class="empty">No key claims recorded.</p>`);
    } else if (P.side === "notes") {
      const list = (L().NOTES[e.id] || []).slice().sort((a, b) => a.t - b.t);
      body.innerHTML = `<form class="noteform" id="noteForm"><label for="noteText">Note at <b id="noteAt">${fmtTime(curTime())}</b></label><textarea id="noteText" rows="3" placeholder="What stood out? (Enter to save, Shift+Enter for a new line)"></textarea><div class="noteform__act"><button type="button" class="btn btn--ghost btn--sm" id="noteStamp">${A.ui.ICON.clock}<span>Re-stamp now</span></button><button class="btn btn--primary btn--sm">Save note</button></div></form>
        ${list.length ? `<ul class="notes">${list.map((n) => `<li class="note"><button class="claim__t" data-seek="${n.t}">${fmtTime(n.t)}</button><p>${esc(n.text)}</p><button class="iconbtn iconbtn--sm" data-delnote="${esc(n.id)}" aria-label="Delete note">${A.ui.ICON.trash}</button></li>`).join("")}</ul>` : `<p class="empty">No notes yet. Press <kbd>N</kbd> to write one or <kbd>B</kbd> to bookmark the moment.</p>`}`;
      let stamp = curTime();
      const f = $("#noteForm");
      f.onsubmit = (ev) => { ev.preventDefault(); const tx = $("#noteText").value.trim(); if (!tx) return; h().addNote(e.id, stamp, tx); A.ui.toast(`Note saved at ${fmtTime(stamp)}`, { icon: "📝", ms: 1500 }); paintSide(); paintMarks(); };
      $("#noteText").addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); f.requestSubmit ? f.requestSubmit() : f.onsubmit(ev); } });
      $("#noteStamp").onclick = () => { stamp = curTime(); $("#noteAt").textContent = fmtTime(stamp); };
    } else {
      const list = A.recs.upNext(e, 10);
      body.innerHTML = list.length ? `<p class="side__sub">Autoplay ${L().SETTINGS.autoplay ? "on" : "off"} · <button class="linkbtn" id="apToggle">${L().SETTINGS.autoplay ? "turn off" : "turn on"}</button></p><ul class="upnext">${list.map((x) => `<li><button class="upn" data-play="${x.e.id}">${A.ui.thumbImg(x.e)}<span><b>${esc(x.e.title)}</b><small>${A.ui.metaText(x.e)} · ${esc(A.ui.whoLine(x.e, 2))}</small><em>${A.ui.ICON.spark}${esc(x.why)}</em></span></button></li>`).join("")}</ul>` : `<p class="empty">Nothing left. You have seen it all.</p>`;
      const ap = $("#apToggle"); if (ap) ap.onclick = () => { L().SETTINGS.autoplay = !L().SETTINGS.autoplay; A.store.set("settings:v3", L().SETTINGS); paintSide(); };
    }
  }
  /* "Your coverage" for the open episode: the 10-second slices you really played, a click-to-seek strip, and jumps to the
   * first part you have not watched and to where you left off (U) */
  function firstGap() { if (!P.cur || !P.cov) return null; for (let i = 0; i < P.nB; i++) if (!(P.cov[i >> 3] & (1 << (i & 7)))) return i * h().BUCKET; return null; }
  function coverageHTML(e) {
    if (!P.cov) return "";
    const n = P.nB, segs = 60, per = Math.max(1, Math.ceil(n / segs)), cells = [];
    for (let k = 0; k * per < n; k++) { let c = 0, t = 0; for (let i = k * per; i < Math.min(n, (k + 1) * per); i++, t++) if (P.cov[i >> 3] & (1 << (i & 7))) c++; cells.push({ f: t ? c / t : 0, t: k * per * h().BUCKET }); }
    const g = firstGap(), r = L().H.eps[e.id] || {};
    return `<section class="rcov" aria-label="Your coverage"><p class="side__h">Your coverage <small>${Math.round((r.pct || 0) * 100)}% played</small></p>
      <div class="rcov__strip">${cells.map((c) => `<button type="button" class="rcov__c" data-seek="${c.t}" style="--f:${c.f.toFixed(2)}" title="${fmtTime(c.t)} · ${Math.round(c.f * 100)}% played" aria-label="Seek to ${fmtTime(c.t)}"></button>`).join("")}</div>
      <div class="row-gap">${g != null ? `<button type="button" class="btn btn--sm" data-seek="${g}">${A.ui.ICON.play}<span>First unwatched part · ${fmtTime(g)} <kbd>U</kbd></span></button>` : `<span class="ok">✓ every part played</span>`}${r.pos > 5 ? `<button type="button" class="btn btn--sm btn--ghost" data-seek="${Math.floor(r.pos)}">Where you left off · ${fmtTime(r.pos)}</button>` : ""}</div></section>`;
  }
  function jumpGap() { const g = firstGap(); if (g == null) { A.ui.toast("You have played every part of this episode", { icon: "✅", ms: 1600 }); return; } seek(g, true, { keepPaused: !P.playing }); A.ui.toast(`First unwatched part: ${fmtTime(g)}`, { icon: "⏩", ms: 1400 }); }
  /* filter box for long chapter / claim / number lists in the reading panel */
  function sideFilterHTML(ph) { return `<input class="input input--sm side__q" type="search" id="sideQ" placeholder="${esc(ph)}" aria-label="${esc(ph)}" value="${esc(P.sideQ || "")}">`; }
  function applySideFilter() { const q = A.fold(P.sideQ || "").trim(); $$("#sideBody .chaps > li, #sideBody .claims > li").forEach((li) => { li.hidden = !!q && !A.fold(li.textContent).includes(q); }); }
  function openNote() {
    if (!P.cur) return;
    if (P.fs) exitFs();
    if (P.mode !== "theater") expand();
    P.side = "notes"; paintSide();
    setTimeout(() => { const t = $("#noteText"); t && t.focus(); }, 60);
  }
  function toggleWatchedCur() {
    if (!P.cur) return;
    const id = P.cur.id;
    const btn = $('#thInfo [data-th="watched"]') || $('[data-pc="markwatched"]');
    if (h().stateOf(id) === "done") { h().unmarkWatched(id); A.ui.toast("Marked as unwatched", { icon: "↩️", ms: 1500 }); }
    else { tick(true); flush(); h().markWatched(id); A.ui.toast("Marked as watched", { icon: "✅", action: { label: "Undo", fn: () => { h().unmarkWatched(id); A.views.refreshCardsFor(id); A.picks && A.picks.sync(id); } } }); A.fx && A.fx.celebrate("watched", btn, true); }
    A.views.refreshCardsFor(id); A.picks && A.picks.sync(id);
    if (!$("#dockErr").hidden && P.errCode != null) showEmbedError(P.cur, P.errCode);
  }

  /* ---------------------------------------------------------------- YouTube-style mode buttons: miniplayer (i), theater (t), full screen (f).
   * Each keeps the same iframe; only the dock's mode/geometry changes, so playback never reloads or loses time. */
  const MI = {
    mini: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="16" rx="2.5"/><rect x="12" y="11.5" width="7.5" height="6" rx="1.2" fill="currentColor" stroke="none"/></svg>',
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M10 14 16.5 7.5M11.5 7.5h5v5"/></svg>',
    wide: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="7" width="21" height="10" rx="2"/></svg>',
    narrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5.5" width="14" height="13" rx="2"/></svg>',
    fs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    fsExit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
  };
  function setBtn(b, icon, label, pressed) {
    const o = b.querySelector("svg"); const t = document.createElement("template"); t.innerHTML = icon; const n = t.content.firstElementChild;
    if (o && o.outerHTML !== n.outerHTML) o.replaceWith(n); else if (!o) b.prepend(n);
    b.setAttribute("aria-label", label); b.title = label; b.dataset.state = label;
    if (pressed != null) b.setAttribute("aria-pressed", String(pressed));
  }
  function paintModeButtons() {
    const miniNow = P.mode === "mini" || !!P.sticky;
    $$('[data-pc="mini"]').forEach((b) => setBtn(b, miniNow ? MI.expand : MI.mini, miniNow ? "Expand (i)" : "Miniplayer (i)", miniNow));
    $$('[data-pc="expand"]').forEach((b) => setBtn(b, MI.expand, "Expand (i)"));
    $$('[data-pc="wide"]').forEach((b) => setBtn(b, P.wide ? MI.narrow : MI.wide, P.wide ? "Default view (t)" : "Theater mode (t)", !!P.wide));
    $$('[data-pc="fs"]').forEach((b) => setBtn(b, P.fs ? MI.fsExit : MI.fs, P.fs ? "Exit full screen (f)" : "Full screen (f)", !!P.fs));
  }
  function toggleMini() {
    if (!P.cur) return;
    if (P.mode === "mini" || P.sticky) expand(); else minimize();
    paintModeButtons();
  }
  async function toggleWide(force) {
    if (!P.cur) return;
    const on = force == null ? !P.wide : !!force;
    if (P.fs) await exitFs();
    if (P.mode !== "theater") expand(); else if (P.sticky) backToTop();
    P.wide = on;
    document.body.classList.toggle("is-wide", on);
    const S = L().SETTINGS; S.theaterWide = on; A.store.set("settings:v3", S);
    relayout(); paintAmbient();
    paintModeButtons();
  }

  /* in-place update of the theater's action buttons (no re-render of the episode details) */
  function patchTheater(id) {
    const e = P.cur; if (!e || e.id !== id) return;
    const box = $("#thInfo"); if (!box || !box.querySelector(".th__act")) return;
    const L0 = L(), I = A.ui.ICON;
    const fav = L0.FAVS.has(id), q = L0.QUEUE.includes(id), done = h().stateOf(id) === "done";
    const set = (sel, on, icon, text) => { const b = box.querySelector(sel); if (!b) return; b.setAttribute("aria-pressed", String(on)); b.classList.toggle("is-on", on); if (icon) { const o = b.querySelector("svg"); const t = document.createElement("template"); t.innerHTML = icon; const n = t.content.firstElementChild; if (o && n && o.innerHTML !== n.innerHTML) o.replaceWith(n); } const sp = b.querySelector("span"); if (sp && sp.textContent !== text) sp.textContent = text; };
    set('[data-th="fav"]', fav, fav ? I.heartF : I.heart, fav ? "Favourited" : "Favourite");
    set('[data-th="queue"]', q, q ? I.queued : I.queue, q ? "Queued" : "Queue");
    set('[data-th="watched"]', done, null, done ? "Mark unwatched" : "Mark as watched");
  }

  /* ---------------------------------------------------------------- wiring: one delegated handler for every control */
  const ACT = {
    play: togglePlay, back10: () => seek(-10), fwd10: () => seek(10), back30: () => seek(-30), fwd30: () => seek(30), back5: () => seek(-5), fwd5: () => seek(5),
    prevch: prevChapter, nextch: nextChapter, next: playNext, mute: toggleMute, cc: toggleCC, fs: toggleFs, pip: popOut, audio: audioMode, zen: () => toggleZen(), dnd: toggleDnd,
    theater: () => (P.mode === "theater" && !P.sticky ? minimize() : expand()), mini: () => toggleMini(), wide: () => toggleWide(), expand, close: () => { if (P.sticky) { try { P.yt && P.yt.pauseVideo && P.yt.pauseVideo(); } catch (x) {} P.stickyOff = true; P.sticky = true; setSticky(false); P.stickyOff = true; return; } closePlayer(); }, note: openNote, bookmark, skip: skipIntro,
    link: () => P.cur && A.views.copyLinkAt(P.cur.id, curTime()), markwatched: toggleWatchedCur, sharecard: () => P.cur && A.feat && A.feat.shareCard(P.cur.id, curTime()),
    retry: () => { if (!P.cur) return; const id = P.cur.id, t = P.lastPos; destroyPlayer(); $("#dockErr").hidden = true; P.errCode = null; createPlayer(freshHost(), id, t); },
    rail: () => { if (P.menu) closeMenu(); openChapters(); },
    settings: (b) => openMenu("settings", b), more: (b) => openMenu("more", b), speed: (b) => openMenu("speed", b),
    "menu-settings": () => { P.menu = null; openMenu("settings"); }, "menu-speed": () => { P.menu = null; openMenu("speed"); }, "menu-quality": () => { P.menu = null; openMenu("quality"); },
    "menu-sleep": () => { P.menu = null; openMenu("sleep"); }, "menu-loop": () => { P.menu = null; openMenu("loop"); },
    "speed-set": (b) => { setSpeed(b.dataset.v); renderMenu("speed"); }, "quality-set": (b) => { setQuality(b.dataset.v); closeMenu(); }, "sleep-set": (b) => { setSleep(b.dataset.v); },
    "loop-a": () => setLoop("a"), "loop-b": () => setLoop("b"), "loop-clear": () => setLoop("clear"),
    autoskip: () => { const S = L().SETTINGS; S.autoSkipHearing = !S.autoSkipHearing; A.store.set("settings:v3", S); renderMenu("settings"); },
    autoplay: () => { const S = L().SETTINGS; S.autoplay = !S.autoplay; A.store.set("settings:v3", S); renderMenu("settings"); },
    native: () => { closeMenu(); toggleNative(); }, ytc: () => { closeMenu(); toggleNative(); },
    loopall: () => { P.loopAll = !P.loopAll; renderMenu("settings"); fx(P.loopAll ? "Loop on" : "Loop off", "c"); },
    ccstyle: (b) => { closeMenu(); A.ccx && A.ccx.openStyle(b); },
    back5: () => seek(-5), fwd5: () => seek(5),
  };
  const KEEP_MENU = new Set(["loopall", "settings", "more", "speed", "menu-settings", "menu-speed", "menu-quality", "menu-sleep", "menu-loop", "speed-set", "sleep-set", "loop-a", "loop-b", "loop-clear", "autoskip", "autoplay", "cc", "dnd"]);
  function wire() {
    const d = dock();
    P.wide = !!L().SETTINGS.theaterWide; document.body.classList.toggle("is-wide", P.wide); paintModeButtons();
    d.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-pc]");
      if (b && d.contains(b)) {
        const a = b.dataset.pc;
        if (ACT[a]) { ev.preventDefault(); ACT[a](b); if (!KEEP_MENU.has(a)) closeMenu(); else if (a === "cc" || a === "dnd") { if (P.menu) renderMenu(P.menu); } }
        showUI();
        return;
      }
      const sk = ev.target.closest("[data-seek]");
      if (sk && sk.dataset.seek !== "" && P.cur) { jumpTo(P.cur.id, Number(sk.dataset.seek)); return; }
      if (P.menu && !ev.target.closest("#pvMenu")) closeMenu();
    });
    d.addEventListener("input", (ev) => { if (ev.target.matches("[data-vol]")) setVol(ev.target.value); });
    d.addEventListener("mouseleave", () => { if (P.playing && !P.menu) d.classList.remove("pv--show"); });
    $("#pipBack").onclick = () => { if (P.pip) P.pip.close(); };
    $("#dockMeta").onclick = expand;
    $("#thMin").onclick = minimize;
    $("#thAudio").onclick = audioMode;
    $("#thFs").onclick = toggleFs;
    $("#thZen").onclick = () => toggleZen();
    $("#theater").addEventListener("scroll", () => { if (P.flipRaf) return; P.flipRaf = requestAnimationFrame(() => { P.flipRaf = 0; checkSticky(); placeDock(); flipStep(); placeChSheet(); }); }, { passive: true });
    $("#thRead") && ($("#thRead").onclick = () => toggleRead());
    $("#thCh") && ($("#thCh").onclick = () => openChapters());
    const dv = $("#dockVideo"); if (dv && !$("#pvBig")) { const bp = document.createElement("button"); bp.type = "button"; bp.id = "pvBig"; bp.className = "pv__big"; bp.setAttribute("aria-label", "Play"); bp.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>`; bp.onclick = (ev) => { ev.stopPropagation(); P.userPlayed = true; if (P.yt && P.ready) { try { P.yt.playVideo(); } catch (x) {} } }; dv.appendChild(bp); }
    const thMain = $(".theater__main"); if (thMain) thMain.addEventListener("scroll", () => requestAnimationFrame(placeDock), { passive: true });
    sheetDrag();
    watchSlot();
    if (typeof ResizeObserver !== "undefined" && !P.ro) { P.ro = new ResizeObserver(() => { if (P.roRaf) return; P.roRaf = requestAnimationFrame(() => { P.roRaf = 0; if (P.mode === "theater" && !P.fs && !P.sticky) placeDock(); }); }); [$("#stageSlot"), $(".theater__main"), $("#theater")].forEach((x) => x && P.ro.observe(x)); }
    paintNativeBtn();
    $("#sideBody").addEventListener("input", (ev) => { if (ev.target.id === "sideQ") { P.sideQ = ev.target.value; applySideFilter(); } });
    $("#sideTabs").addEventListener("click", (ev) => { const b = ev.target.closest("[data-side]"); if (!b) return; P.side = b.dataset.side; paintSide(); });
    $("#theater").addEventListener("click", (ev) => {
      const sk = ev.target.closest("[data-seek]");
      if (sk && sk.dataset.seek !== "") { jumpTo(P.cur.id, Number(sk.dataset.seek)); return; }
      const pl = ev.target.closest("[data-play]"); if (pl) { play(pl.dataset.play); return; }
      const dn = ev.target.closest("[data-delnote]"); if (dn) { h().delNote(P.cur.id, dn.dataset.delnote); paintSide(); paintMarks(); return; }
      const ct = ev.target.closest("[data-closeth]"); if (ct) { minimize(); return; }
      const th = ev.target.closest("[data-th]");
      if (th) {
        const a = th.dataset.th, e = P.cur;
        if (a === "fav") { const on = h().toggleFav(e.id); A.views.refreshCardsFor(e.id); A.fx && A.fx.celebrate("fav", th, on); }
        if (a === "queue") { const on = h().toggleQueue(e.id); A.views.paintQueueCount(); A.views.refreshCardsFor(e.id); A.fx && A.fx.celebrate("queue", th, on); }
        if (a === "watched") toggleWatchedCur();
        if (a === "playlist" && A.feat) A.feat.playlistPicker(e.id, th);
        if (a === "link") A.views.copyLinkAt(e.id, curTime());
        if (a === "share") A.views.share(e.id, curTime());
        if (a === "details") A.views.openDrawer(e.id);
      }
    });
  }

  A.player = {
    P, play, seek, jumpTo, togglePlay, toggleRead, jumpGap, firstGap, openChapters, closeChSheet, placeChSheet, flipStep, flipProgress, miniRect, nudgeOff, readRect, sheetSize, hideCountdown, setSticky, setSpeed, setVol, toggleMute, prevChapter, nextChapter, playNext, minimize, expand, audioMode, popOut, closePlayer, curTime, durNow, openNote, wire,
    tick, flush, setQuality, curQuality, paintQuality, paintSide, paintTheater, patchTheater, placeDock, placeMini, snapMini, dropMini, setSticky, checkSticky, backToTop, setMode, chapterAt, hideCountdown, loadAPI, reloadCov, toggleFs, enterFs, exitFs, toggleMini, toggleWide, paintModeButtons, toggleZen, toggleDnd, toggleCC, syncCC, ccActual,
    frameStep, bookmark, setLoop, relayout, toggleNative, playPrev, setSleep, skipIntro, onError, showEmbedError, openMenu, closeMenu, showUI, toggleWatchedCur, embedSrc, paintMarks, SPEEDS,
  };
})(window.ASFE);
