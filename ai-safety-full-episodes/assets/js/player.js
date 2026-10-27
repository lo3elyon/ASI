/* AI Safety Full Episodes v2 · player: YouTube IFrame API, strict watch clock, dock modes (theater / mini / audio),
 * Document Picture-in-Picture pop-out, Media Session, chapters, seek bar, Up Next countdown. */
(function (A) {
  "use strict";
  const { $, $$, esc, clamp, fmtTime, STATE, RM } = A;
  const h = () => A.hist;
  const L = () => A.hist.L;

  const P = { yt: null, ready: false, apiLoading: null, cur: null, mode: "none", prevMode: "theater", pip: null, lastMedia: null, lastWall: 0, lastSave: 0, sess: null, cov: null, nB: 0, pending: null, cd: null, chIdx: -1, lastPos: 0, playing: false, side: "chapters", msLast: 0 };
  A.P = P;
  const dock = () => $("#dock");

  /* ---------------------------------------------------------------- YouTube API */
  function loadAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (P.apiLoading) return P.apiLoading;
    P.apiLoading = new Promise((res, rej) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => { P.apiLoading = null; rej(new Error("YouTube API failed to load")); };
      document.head.appendChild(s);
      setTimeout(() => { if (!(window.YT && window.YT.Player)) rej(new Error("YouTube API timeout")); }, 15000);
    });
    return P.apiLoading;
  }
  function createPlayer(host, id, start) {
    P.ready = false;
    const pv = { autoplay: 1, start: Math.floor(start || 0), rel: 0, modestbranding: 1, playsinline: 1, controls: 1, iv_load_policy: 3, enablejsapi: 1 };
    if (/^https?:$/.test(location.protocol)) pv.origin = location.origin;
    P.yt = new YT.Player(host, {
      host: "https://www.youtube-nocookie.com", videoId: id, width: "100%", height: "100%", playerVars: pv,
      events: {
        onReady: () => {
          P.ready = true;
          applySettings();
          if (P.pending && P.cur && P.pending.id === P.cur.id && P.pending.id !== id) P.yt.loadVideoById({ videoId: P.pending.id, startSeconds: P.pending.start });
          else try { P.yt.playVideo(); } catch (x) {}
          P.pending = null;
        },
        onStateChange: onState,
        onError: (ev) => showEmbedError(P.cur, ev.data === 101 || ev.data === 150 ? "The channel does not allow this video to play outside YouTube." : "This video could not be played here."),
        onPlaybackRateChange: () => { try { L().SETTINGS.speed = P.yt.getPlaybackRate(); $("#cSpeed").value = String(L().SETTINGS.speed); } catch (x) {} },
      },
    });
    return P.yt;
  }
  function destroyPlayer() {
    try { P.yt && P.yt.destroy && P.yt.destroy(); } catch (e) {}
    P.yt = null; P.ready = false; P.lastMedia = null;
  }
  function freshHost(doc, parent) {
    const d = doc.createElement("div");
    d.id = "ytPlayer";
    parent.innerHTML = "";
    parent.appendChild(d);
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
    P.cur = e; P.sess = null; P.lastMedia = null; P.chIdx = -1;
    const r = h().rec(e.id, true);
    P.nB = Math.max(1, Math.ceil((e.dur || r.dur || 1) / h().BUCKET));
    P.cov = h().covDecode(r.cov, P.nB);
    dock().hidden = false;
    $("#dockErr").hidden = true;
    const want = o.mode || (P.pip ? "pip" : P.mode === "none" ? "theater" : (o.mini ? (P.mode === "audio" ? "audio" : "mini") : P.mode === "audio" ? "audio" : "theater"));
    setMode(want === "pip" ? P.mode : want);
    paintAll();
    try { await loadAPI(); } catch (err) { showEmbedError(e, "The YouTube player could not load (offline or blocked)."); return; }
    if (!P.yt) {
      const host = P.pip ? freshHost(P.pip.document, P.pip.document.getElementById("pipVideo")) : freshHost(document, $("#ytHost"));
      createPlayer(host, e.id, start);
    } else if (P.ready) {
      P.yt.loadVideoById({ videoId: e.id, startSeconds: start });
      applySettings();
    } else {
      P.pending = { id: e.id, start };
    }
    if (start > 0 && o.at == null) A.ui.toast(`Resume at <b>${fmtTime(start)}</b>`, { icon: "⏯️", action: { label: "Start over", fn: () => seek(0, true) }, ms: 6000 });
    r.last = Date.now();
    h().saveH();
    mediaSession(e);
    A.views && A.views.onNowPlaying && A.views.onNowPlaying(e);
  }

  function applySettings() {
    const S = L().SETTINGS;
    if (P.yt && P.ready) { try { P.yt.setVolume(S.vol); S.muted ? P.yt.mute() : P.yt.unMute(); P.yt.setPlaybackRate(Number(S.speed) || 1); } catch (e) {} }
    $("#cVol").value = S.vol;
    $("#cSpeed").value = String(S.speed);
    $("#cMute").classList.toggle("is-muted", !!S.muted);
  }
  function showEmbedError(e, msg) {
    const el = $("#dockErr");
    el.hidden = false;
    el.innerHTML = `<b>${esc(msg)}</b><span>${esc(e ? e.title : "")}</span><a class="btn btn--primary btn--sm" href="${esc(e ? e.url : "#")}" target="_blank" rel="noopener">${A.ui.ICON.yt}<span>Open on YouTube</span></a>`;
  }

  function onState(ev) {
    const s = ev.data;
    P.playing = s === 1;
    document.body.classList.toggle("is-playing", P.playing);
    $("#cPlay").setAttribute("aria-label", P.playing ? "Pause" : "Play");
    if (P.pip) { const b = P.pip.document.getElementById("pPlay"); if (b) { b.textContent = P.playing ? "❚❚" : "▶"; b.setAttribute("aria-label", P.playing ? "Pause" : "Play"); } }
    if ("mediaSession" in navigator) try { navigator.mediaSession.playbackState = P.playing ? "playing" : "paused"; } catch (x) {}
    if (P.playing) {
      $("#dockErr").hidden = true;
      const d = P.yt.getDuration();
      if (d && P.cur) {
        const r = h().rec(P.cur.id, true);
        if (Math.abs((r.dur || 0) - d) > 2) {
          r.dur = d;
          const nB = Math.max(1, Math.ceil(d / h().BUCKET));
          if (nB !== P.nB) { const old = P.cov; P.cov = new Uint8Array(Math.ceil(nB / 8)); P.cov.set(old.subarray(0, P.cov.length)); P.nB = nB; }
        }
        if (!P.sess || Date.now() - P.sess.e > 30 * 60e3) {
          P.sess = { s: Date.now(), e: Date.now(), w: 0, a: Math.floor(P.yt.getCurrentTime()), b: 0 };
          r.sessions = r.sessions || [];
          r.sessions.push(P.sess);
          if (r.sessions.length > 200) r.sessions.splice(0, r.sessions.length - 200);
          if (!r.first) r.first = Date.now();
        }
      }
      P.lastMedia = P.yt.getCurrentTime();
      P.lastWall = performance.now();
    } else {
      tick(true);
      P.lastMedia = null;
      flush();
    }
    if (s === 0) onEnded();
  }

  /* The strict watch clock. Counts only contiguous forward playback; seeks never count.
   * Background tabs and the pop-out window can throttle timers, so a long gap counts only when
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
        if (P.sess) { P.sess.w += real; P.sess.e = Date.now(); P.sess.b = Math.floor(t); }
        if (P.pip) h().bumpStat("pipSec", real);
        if (P.mode === "audio") h().bumpStat("audioSec", real);
        const a = Math.floor(P.lastMedia / h().BUCKET), b = Math.floor(t / h().BUCKET);
        for (let i = a; i <= b && i < P.nB; i++) P.cov[i >> 3] |= 1 << (i & 7);
      }
    }
    if (st === 1) { P.lastMedia = t; P.lastWall = now; }
    r.pos = t; r.last = Date.now(); P.lastPos = t;
    paintProgress(t);
    if (now - P.lastSave > 5000) flush();
    if (now - P.msLast > 4000) { P.msLast = now; msPosition(t); }
  }
  function flush() {
    if (!P.cur || !P.cov) return;
    const r = h().rec(P.cur.id, true);
    r.covN = h().covCount(P.cov, P.nB);
    r.cov = h().covEncode(P.cov);
    r.pct = clamp(r.covN / P.nB, 0, 1);
    if (!r.done && r.pct >= 0.9) { r.done = true; r.doneAt = Date.now(); A.ui.toast(`Completed: <b>${esc(P.cur.title.slice(0, 64))}</b>`, { icon: "✅" }); }
    P.lastSave = performance.now();
    h().saveH();
    paintCoverage();
    h().checkAwards();
    A.views && A.views.refreshCardsFor && A.views.refreshCardsFor(P.cur.id);
  }
  setInterval(() => tick(false), 1000);
  window.addEventListener("pagehide", () => { tick(true); flush(); });
  // Never pause when the tab is hidden or the window is minimised: only save progress.
  document.addEventListener("visibilitychange", () => { if (document.hidden) { tick(true); flush(); } });

  function curTime() { try { return P.yt && P.ready ? P.yt.getCurrentTime() : P.lastPos; } catch (e) { return P.lastPos || 0; } }
  function durNow() { try { return (P.yt && P.ready && P.yt.getDuration && P.yt.getDuration()) || (P.cur && P.cur.dur) || 1; } catch (e) { return (P.cur && P.cur.dur) || 1; } }
  function seek(t, abs) {
    if (!P.yt || !P.ready) { if (P.cur && abs) P.pending = { id: P.cur.id, start: t }; return; }
    const cur = P.yt.getCurrentTime();
    const d = P.yt.getDuration() || (P.cur && P.cur.dur) || 0;
    const to = clamp(abs ? t : cur + t, 0, Math.max(0, d - 1));
    tick(false);
    P.lastMedia = null;
    h().bumpStat("seeks");
    P.yt.seekTo(to, true);
    if (P.yt.getPlayerState() !== 1) P.yt.playVideo();
    paintProgress(to);
  }
  function jumpTo(id, t) {
    h().bumpStat("chapterJumps");
    if (P.cur && P.cur.id === id && P.yt && P.ready) seek(t, true);
    else play(id, { at: t, mini: P.mode === "mini" || P.mode === "audio" });
    h().checkAwards();
  }
  function togglePlay() { if (!P.yt || !P.ready) return; P.yt.getPlayerState() === 1 ? P.yt.pauseVideo() : P.yt.playVideo(); }
  function setSpeed(v) { const S = L().SETTINGS; S.speed = clamp(Number(v), 0.75, 2); A.store.set("settings:v2", S); if (P.yt && P.ready) P.yt.setPlaybackRate(S.speed); $("#cSpeed").value = String(S.speed); A.ui.toast(`Speed ${S.speed}×`, { ms: 1200 }); }
  function setVol(v) { const S = L().SETTINGS; S.vol = clamp(Math.round(v), 0, 100); S.muted = S.vol === 0; A.store.set("settings:v2", S); applySettings(); }
  function toggleMute() { const S = L().SETTINGS; S.muted = !S.muted; A.store.set("settings:v2", S); applySettings(); A.ui.toast(S.muted ? "Muted" : "Sound on", { ms: 1000 }); }
  function chapterAt(t) { if (!P.cur) return -1; let i = -1; P.cur.chapters.forEach((c, k) => { if (c.t != null && c.t <= t + 0.5) i = k; }); return i; }
  function prevChapter() { if (!P.cur) return; const t = curTime(); const prev = P.cur.chapters.filter((c) => c.t != null && c.t < t - 3).pop(); h().bumpStat("chapterJumps"); seek(prev ? prev.t : 0, true); }
  function nextChapter() { if (!P.cur) return; const t = curTime(); const nx = P.cur.chapters.find((c) => c.t != null && c.t > t + 1); if (nx) { h().bumpStat("chapterJumps"); seek(nx.t, true); } else A.ui.toast("No more chapters", { ms: 1200 }); }

  function nextUp() { const list = A.recs.upNext(P.cur, 3); return list[0] || null; }
  function playNext() { const n = nextUp(); if (n) play(n.e.id, { mini: P.mode !== "theater" }); else A.ui.toast("Nothing left to suggest. You've seen it all!", { icon: "🎉" }); }
  function onEnded() {
    flush();
    if (!L().SETTINGS.autoplay) return;
    const n = nextUp();
    if (!n) return;
    let left = 10;
    $("#cdEp").innerHTML = `${A.ui.thumbImg(n.e, true)}<div><b>${esc(n.e.title)}</b><small>${esc(n.why)} · ${esc(n.e.durStr)}</small></div>`;
    $("#cdNum").textContent = left;
    $("#countdown").hidden = false;
    clearInterval(P.cd);
    P.cd = setInterval(() => { left--; $("#cdNum").textContent = left; if (left <= 0) { hideCountdown(); play(n.e.id, { mini: P.mode !== "theater" }); } }, 1000);
    $("#cdPlay").onclick = () => { hideCountdown(); play(n.e.id, { mini: P.mode !== "theater" }); };
    $("#cdCancel").onclick = hideCountdown;
  }
  function hideCountdown() { clearInterval(P.cd); P.cd = null; const c = $("#countdown"); if (c) c.hidden = true; }

  /* ---------------------------------------------------------------- dock modes */
  function setMode(m) {
    if (m !== "audio" && m !== "mini" && m !== "theater") m = "theater";
    P.mode = m;
    const d = dock();
    d.dataset.mode = m;
    d.classList.toggle("is-pip", !!P.pip);
    const th = $("#theater");
    if (m === "theater") {
      th.hidden = false;
      document.body.classList.add("lock", "has-theater");
      requestAnimationFrame(placeDock);
    } else {
      th.hidden = true;
      document.body.classList.remove("lock", "has-theater");
      d.style.left = d.style.top = d.style.width = "";
    }
    document.body.classList.toggle("has-dock", m !== "theater" && !d.hidden);
    document.body.classList.toggle("has-audio", m === "audio" && !d.hidden);
    paintArt();
  }
  function placeDock() {
    if (P.mode !== "theater") return;
    const slot = $("#stageSlot"), d = dock();
    if (!slot || !d) return;
    const r = slot.getBoundingClientRect();
    const barH = d.querySelector(".dock__bar").offsetHeight || 96;
    let w = r.width;
    const narrow = window.innerWidth < 900;
    const maxVideoH = Math.max(160, (narrow ? window.innerHeight * 0.42 : window.innerHeight - r.top - barH - 120));
    if ((w * 9) / 16 > maxVideoH) w = (maxVideoH * 16) / 9;
    slot.style.height = Math.round((w * 9) / 16 + barH) + "px";
    const r2 = slot.getBoundingClientRect();
    d.style.left = Math.round(r2.left + (r2.width - w) / 2) + "px";
    d.style.top = Math.round(r2.top) + "px";
    d.style.width = Math.round(w) + "px";
  }
  window.addEventListener("resize", () => requestAnimationFrame(placeDock));
  function minimize() { if (P.cur) setMode("mini"); }
  function expand() { if (P.cur) { setMode("theater"); paintTheater(); paintSide(); } }
  function audioMode() {
    if (!P.cur) return;
    if (P.mode === "audio") { setMode("mini"); A.ui.toast("Video is back", { ms: 1200 }); return; }
    setMode("audio");
    A.ui.toast("Audio mode: playback continues while you browse, switch tabs or minimise", { icon: "🎧", ms: 3500 });
  }
  async function closePlayer() {
    tick(true); flush(); hideCountdown();
    if (P.pip) { try { P.pip.close(); } catch (e) {} P.pip = null; }
    destroyPlayer();
    freshHost(document, $("#ytHost"));
    P.cur = null;
    dock().hidden = true;
    setMode("theater");
    $("#theater").hidden = true;
    document.body.classList.remove("lock", "has-theater", "has-dock", "has-audio", "is-playing");
    if ("mediaSession" in navigator) try { navigator.mediaSession.metadata = null; } catch (e) {}
  }

  /* ---------------------------------------------------------------- Document Picture-in-Picture */
  const PIP_CSS = `*{box-sizing:border-box}html,body{margin:0;height:100%;background:#05080d;color:#e7edf5;font:13px/1.35 Inter,system-ui,sans-serif;overflow:hidden}
  #pipWrap{display:flex;flex-direction:column;height:100%}#pipVideo{flex:1;min-height:0;background:#000}#pipVideo iframe{width:100%;height:100%;border:0;display:block}
  .pbar{padding:8px 10px 10px;background:linear-gradient(180deg,#0b1220,#070b12);border-top:1px solid #1d2a3c}
  .pt{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pc{color:#f5b544;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
  .pp{height:4px;border-radius:4px;background:#1d2a3c;margin:8px 0;overflow:hidden;cursor:pointer}.pp i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#14b8a6);width:0}
  .pr{display:flex;gap:6px;align-items:center}.pr button{background:#132033;color:#e7edf5;border:1px solid #22344d;border-radius:9px;padding:6px 9px;font:inherit;cursor:pointer;min-width:34px}
  .pr button:hover,.pr button:focus-visible{border-color:#f59e0b;outline:none}.pr .pl{background:#f59e0b;color:#111;border-color:#f59e0b;font-weight:800}.pr .sp{flex:1}.tm{color:#8fa3ba;font-size:11px;font-variant-numeric:tabular-nums}`;
  async function popOut() {
    if (!P.cur) { A.ui.toast("Play an episode first, then pop it out", { ms: 2500 }); return; }
    if (P.pip) { try { P.pip.focus(); } catch (e) {} return; }
    if (!("documentPictureInPicture" in window) || !window.documentPictureInPicture || !window.documentPictureInPicture.requestWindow) {
      A.ui.toast("Pop-out player needs Chrome or Edge 116+. Switched to audio mode instead: playback keeps going when you change tabs or minimise.", { icon: "🪟", ms: 6500 });
      if (P.mode !== "audio") setMode("audio");
      return "fallback";
    }
    const t = curTime();
    const wasPlaying = P.playing;
    tick(true); flush();
    let pw;
    try { pw = await window.documentPictureInPicture.requestWindow({ width: 480, height: 340 }); }
    catch (e) { A.ui.toast("The browser blocked the pop-out window. Click the button again.", { icon: "🪟" }); return; }
    P.pip = pw;
    P.prevMode = P.mode;
    h().bumpStat("pipUses");
    const doc = pw.document;
    doc.title = P.cur.title;
    const st = doc.createElement("style"); st.textContent = PIP_CSS; doc.head.appendChild(st);
    doc.body.innerHTML = `<div id="pipWrap"><div id="pipVideo"></div><div class="pbar"><div class="pt" id="pT"></div><div class="pc" id="pC"></div>
      <div class="pp" id="pP"><i id="pF"></i></div>
      <div class="pr"><button id="pPrev" aria-label="Previous chapter">⏮</button><button id="pBack" aria-label="Back 10 seconds">−10</button><button class="pl" id="pPlay" aria-label="Pause">❚❚</button><button id="pFwd" aria-label="Forward 10 seconds">+10</button><button id="pNextCh" aria-label="Next chapter">⏭</button><button id="pNext" aria-label="Next episode">Next ep</button><span class="sp"></span><span class="tm" id="pTm"></span><button id="pHome" aria-label="Back to tab">↩</button></div></div></div>`;
    // relay YouTube iframe messages from the pop-out window to this window so the IFrame API keeps working
    pw.addEventListener("message", (ev) => { try { window.dispatchEvent(new MessageEvent("message", { data: ev.data, origin: ev.origin, source: ev.source })); } catch (x) {} });
    const g = (id) => doc.getElementById(id);
    g("pPlay").onclick = togglePlay; g("pBack").onclick = () => seek(-10); g("pFwd").onclick = () => seek(10);
    g("pPrev").onclick = prevChapter; g("pNextCh").onclick = nextChapter; g("pNext").onclick = playNext;
    g("pHome").onclick = () => { try { window.focus(); } catch (x) {} pw.close(); };
    g("pP").onclick = (ev) => { const r = g("pP").getBoundingClientRect(); seek(((ev.clientX - r.left) / r.width) * durNow(), true); };
    doc.addEventListener("keydown", (ev) => { if (ev.key === " " || ev.key === "k") { ev.preventDefault(); togglePlay(); } else if (ev.key === "ArrowLeft" || ev.key === "j") seek(-10); else if (ev.key === "ArrowRight" || ev.key === "l") seek(10); });
    // move playback: the page's player hands over to a fresh player inside the pop-out at the same second
    destroyPlayer();
    freshHost(document, $("#ytHost"));
    createPlayer(freshHost(doc, g("pipVideo")), P.cur.id, t);
    if (!wasPlaying) setTimeout(() => { try { P.yt && P.ready && P.yt.pauseVideo(); } catch (x) {} }, 1500);
    $("#pipNote").hidden = false;
    dock().classList.add("is-pip");
    if (P.mode === "theater") setMode("mini");
    paintPip();
    pw.addEventListener("pagehide", () => {
      const tt = curTime();
      const keep = P.playing;
      tick(true); flush();
      destroyPlayer();
      P.pip = null;
      $("#pipNote").hidden = true;
      dock().classList.remove("is-pip");
      if (P.cur) { createPlayer(freshHost(document, $("#ytHost")), P.cur.id, tt); if (!keep) setTimeout(() => { try { P.yt && P.ready && P.yt.pauseVideo(); } catch (x) {} }, 1500); }
      setMode(P.prevMode === "audio" ? "audio" : "mini");
    });
    A.ui.toast("Popped out: the episode stays on top even when the browser is minimised", { icon: "🪟", ms: 4000 });
    h().checkAwards();
  }
  function paintPip() {
    if (!P.pip || !P.cur) return;
    const d = P.pip.document;
    const t = P.lastPos || 0;
    const ci = chapterAt(t);
    const set = (id, v) => { const el = d.getElementById(id); if (el && el.textContent !== v) el.textContent = v; };
    set("pT", P.cur.title);
    set("pC", ci >= 0 ? `${fmtTime(P.cur.chapters[ci].t)} · ${P.cur.chapters[ci].title}` : A.ui.whoLine(P.cur));
    set("pTm", `${fmtTime(t)} / ${fmtTime(durNow())}`);
    const f = d.getElementById("pF"); if (f) f.style.width = (100 * t / durNow()).toFixed(2) + "%";
  }

  /* ---------------------------------------------------------------- Media Session */
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

  /* ---------------------------------------------------------------- painting */
  function paintArt() {
    const e = P.cur; const el = $("#dockArt");
    if (!el) return;
    el.innerHTML = e ? `<img src="${esc(A.ui.artFor(e))}" alt="">` : "";
  }
  function paintAll() { paintDockMeta(); paintArt(); paintTheater(); paintSide(); paintTicks(); paintCoverage(); paintProgress(resumePoint(P.cur || { id: "" }) || 0); }
  function paintDockMeta() {
    if (!P.cur) return;
    $("#dockTitle").textContent = P.cur.title;
    $("#dockChapter").textContent = A.ui.whoLine(P.cur);
    $("#tDur").textContent = P.cur.durStr || fmtTime(P.cur.dur);
  }
  function paintProgress(t) {
    const d = durNow();
    $("#seekFill").style.width = clamp((100 * t) / d, 0, 100).toFixed(2) + "%";
    $("#seekbar").setAttribute("aria-valuenow", String(Math.round((100 * t) / d)));
    $("#seekbar").setAttribute("aria-valuetext", `${fmtTime(t)} of ${fmtTime(d)}`);
    $("#tNow").textContent = fmtTime(t);
    const ci = chapterAt(t);
    if (ci !== P.chIdx) {
      P.chIdx = ci;
      const c = P.cur && P.cur.chapters[ci];
      $("#dockChapter").textContent = c ? `${fmtTime(c.t)} · ${c.title}` : (P.cur ? A.ui.whoLine(P.cur) : "");
      $$("#sideBody .chap").forEach((el) => el.classList.toggle("is-now", Number(el.dataset.i) === ci));
      const now = $("#sideBody .chap.is-now");
      if (now && P.side === "chapters" && !$("#theater").hidden) now.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" });
    }
    paintPip();
  }
  function paintCoverage() {
    const el = $("#seekCov"); if (!el || !P.cov) return;
    const stops = []; let run = null;
    for (let i = 0; i < P.nB; i++) {
      const on = !!(P.cov[i >> 3] & (1 << (i & 7)));
      if (on && run == null) run = i;
      if ((!on || i === P.nB - 1) && run != null) { const end = on ? i + 1 : i; stops.push(`transparent ${(100 * run / P.nB).toFixed(2)}%, var(--cov) ${(100 * run / P.nB).toFixed(2)}%, var(--cov) ${(100 * end / P.nB).toFixed(2)}%, transparent ${(100 * end / P.nB).toFixed(2)}%`); run = null; }
    }
    el.style.background = stops.length ? `linear-gradient(90deg, ${stops.join(",")})` : "none";
  }
  function paintTicks() {
    const el = $("#seekTicks"); if (!el) return;
    const d = (P.cur && P.cur.dur) || 0;
    el.innerHTML = d ? P.cur.chapters.filter((c) => c.t > 0 && c.t < d).map((c) => `<i style="left:${(100 * c.t / d).toFixed(2)}%"></i>`).join("") : "";
  }
  (function seekBar() {
    const bar = () => $("#seekbar");
    let drag = false;
    const pos = (ev) => { const r = bar().getBoundingClientRect(); return clamp((ev.clientX - r.left) / r.width, 0, 1); };
    document.addEventListener("pointerdown", (ev) => { if (!ev.target.closest || !ev.target.closest("#seekbar") || !P.cur) return; drag = true; bar().setPointerCapture && bar().setPointerCapture(ev.pointerId); $("#seekFill").style.width = (pos(ev) * 100) + "%"; });
    document.addEventListener("pointermove", (ev) => {
      if (!ev.target.closest || !P.cur) return;
      const b = bar(); if (!b) return;
      const over = ev.target.closest("#seekbar");
      const tip = $("#seekTip");
      if (over || drag) {
        const p = pos(ev), t = p * durNow();
        const ci = chapterAt(t); const c = P.cur.chapters[ci];
        tip.hidden = false; tip.style.left = (p * 100) + "%";
        tip.innerHTML = `<b>${fmtTime(t)}</b>${c ? `<span>${esc(c.title)}</span>` : ""}`;
        if (drag) $("#seekFill").style.width = (p * 100) + "%";
      } else tip.hidden = true;
    });
    document.addEventListener("pointerup", (ev) => { if (!drag) return; drag = false; seek(pos(ev) * durNow(), true); });
    document.addEventListener("keydown", (ev) => {
      if (ev.target !== bar()) return;
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") { ev.preventDefault(); ev.stopPropagation(); seek(ev.key === "ArrowLeft" ? -5 : 5); }
      if (ev.key === "Home") { ev.preventDefault(); seek(0, true); }
      if (ev.key === "End") { ev.preventDefault(); seek(durNow() - 5, true); }
    }, true);
  })();

  function paintTheater() {
    const e = P.cur; if (!e) return;
    $("#thCrumb").innerHTML = `<b>${esc(e.title)}</b>`;
    const L0 = L();
    const fav = L0.FAVS.has(e.id), q = L0.QUEUE.includes(e.id);
    $("#thInfo").innerHTML = `
      <h1 class="th__title">${esc(e.title)}</h1>
      <p class="th__meta"><span>${esc(A.fmtDate(e.date, e.approx))}</span><span>${esc(e.durStr)}</span><span>${esc(A.ui.showLine(e))}</span><span class="lvl lvl--${A.slug(e.level)}">${esc(e.level)}</span>${e.views ? `<span>${A.ui.fmtViews(e.views)} views</span>` : ""}</p>
      <div class="th__people">${e.people.map((p) => `<a class="person ${p.host ? "person--host" : ""}" href="#/speaker/${esc(p.slug)}" data-closeth>${A.ui.avatar(p.name, 34)}<span><b>${esc(p.name)}</b><small>${p.host ? "Host" : esc((A.ui.speakerOf(p.name) || {}).org || p.desc || "")}</small></span></a>`).join("")}</div>
      <div class="th__act">
        <button class="btn btn--sm" data-th="fav">${fav ? A.ui.ICON.heartF : A.ui.ICON.heart}<span>${fav ? "Favourited" : "Favourite"}</span></button>
        <button class="btn btn--sm" data-th="queue">${q ? A.ui.ICON.queued : A.ui.ICON.queue}<span>${q ? "Queued" : "Queue"}</span></button>
        <button class="btn btn--sm" data-th="link">${A.ui.ICON.link}<span>Copy link at current time</span></button>
        <button class="btn btn--sm" data-th="share">${A.ui.ICON.share}<span>Share</span></button>
        <button class="btn btn--sm" data-th="details">Full report</button>
        <a class="btn btn--sm btn--ghost" href="${esc(e.url)}" target="_blank" rel="noopener">${A.ui.ICON.yt}<span>YouTube</span></a>
      </div>
      ${e.whyWatch ? `<p class="th__why"><b>Why watch:</b> ${esc(e.whyWatch)}</p>` : ""}
      <p class="th__sum">${esc(e.summary)}</p>
      ${e.tags.length ? `<p class="tags">${e.tags.map((t) => `<a class="tag" href="#/browse?tag=${encodeURIComponent(t)}" data-closeth>${esc(t)}</a>`).join("")}</p>` : ""}`;
  }
  function paintSide() {
    const e = P.cur; const body = $("#sideBody"); if (!e || !body) return;
    $$("#sideTabs [data-side]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.side === P.side)));
    if (P.side === "chapters") {
      body.innerHTML = e.chapters.length ? `<ol class="chaps">${e.chapters.map((c, i) => `<li><button class="chap ${i === P.chIdx ? "is-now" : ""}" data-i="${i}" data-seek="${c.t == null ? "" : c.t}" ${c.t == null ? "disabled" : ""}><span class="chap__t">${c.t == null ? "·" : fmtTime(c.t)}</span><span class="chap__tx"><b>${esc(c.title)}</b>${c.detail ? `<small>${esc(c.detail)}</small>` : ""}</span></button></li>`).join("")}</ol>` + (e.topics.length ? `<h3 class="side__h">Topics</h3><ul class="topics">${e.topics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "")
        : `<p class="empty">No timestamped chapters for this one.</p>${e.topics.length ? `<ul class="topics">${e.topics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}`;
    } else if (P.side === "claims") {
      const items = e.claims.map((c) => ({ ...c, k: "claim" })).concat(e.numbers.map((n) => ({ ...n, k: "num" })));
      body.innerHTML = items.length ? `<ul class="claims">${items.map((c) => `<li class="claim ${c.k === "num" ? "claim--num" : ""}"><button class="claim__t" data-seek="${c.t == null ? "" : c.t}" ${c.t == null ? "disabled" : ""}>${c.t == null ? "·" : fmtTime(c.t)}</button><div><p>${c.k === "num" ? `<span class="numtag">#</span>` : ""}${esc(c.text)}</p>${c.speaker ? `<small>${esc(c.speaker)}</small>` : ""}</div></li>`).join("")}</ul>` : `<p class="empty">No key claims recorded.</p>`;
    } else if (P.side === "notes") {
      const list = (L().NOTES[e.id] || []).slice().sort((a, b) => a.t - b.t);
      body.innerHTML = `<form class="noteform" id="noteForm"><label for="noteText">Note at <b id="noteAt">${fmtTime(curTime())}</b></label><textarea id="noteText" rows="3" placeholder="What stood out? (Enter to save, Shift+Enter for a new line)"></textarea><div class="noteform__act"><button type="button" class="btn btn--ghost btn--sm" id="noteStamp">${A.ui.ICON.clock}<span>Re-stamp now</span></button><button class="btn btn--primary btn--sm">Save note</button></div></form>
        ${list.length ? `<ul class="notes">${list.map((n) => `<li class="note"><button class="claim__t" data-seek="${n.t}">${fmtTime(n.t)}</button><p>${esc(n.text)}</p><button class="iconbtn iconbtn--sm" data-delnote="${n.id}" aria-label="Delete note">${A.ui.ICON.trash}</button></li>`).join("")}</ul>` : `<p class="empty">No notes yet. Press <kbd>N</kbd> any time to capture the moment.</p>`}`;
      let stamp = curTime();
      const f = $("#noteForm");
      f.onsubmit = (ev) => { ev.preventDefault(); const tx = $("#noteText").value.trim(); if (!tx) return; h().addNote(e.id, stamp, tx); A.ui.toast(`Note saved at ${fmtTime(stamp)}`, { icon: "📝", ms: 1500 }); paintSide(); };
      $("#noteText").addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); f.requestSubmit ? f.requestSubmit() : f.onsubmit(ev); } });
      $("#noteStamp").onclick = () => { stamp = curTime(); $("#noteAt").textContent = fmtTime(stamp); };
    } else {
      const list = A.recs.upNext(e, 10);
      body.innerHTML = list.length ? `<p class="side__sub">Autoplay ${L().SETTINGS.autoplay ? "on" : "off"} · <button class="linkbtn" id="apToggle">${L().SETTINGS.autoplay ? "turn off" : "turn on"}</button></p><ul class="upnext">${list.map((x) => `<li><button class="upn" data-play="${x.e.id}">${A.ui.thumbImg(x.e)}<span><b>${esc(x.e.title)}</b><small>${esc(A.ui.whoLine(x.e, 2))} · ${esc(x.e.durStr)}</small><em>${A.ui.ICON.spark}${esc(x.why)}</em></span></button></li>`).join("")}</ul>` : `<p class="empty">Nothing left. You have seen it all.</p>`;
      const ap = $("#apToggle"); if (ap) ap.onclick = () => { L().SETTINGS.autoplay = !L().SETTINGS.autoplay; A.store.set("settings:v2", L().SETTINGS); paintSide(); };
    }
  }
  function openNote() {
    if (!P.cur) return;
    if (P.mode !== "theater") expand();
    P.side = "notes"; paintSide();
    setTimeout(() => { const t = $("#noteText"); t && t.focus(); }, 60);
  }

  /* ---------------------------------------------------------------- wiring */
  function wire() {
    $("#cPlay").onclick = togglePlay;
    $("#cBack").onclick = () => seek(-10);
    $("#cFwd").onclick = () => seek(10);
    $("#cPrevCh").onclick = prevChapter;
    $("#cNextCh").onclick = nextChapter;
    $("#cNext").onclick = playNext;
    $("#cSpeed").onchange = (ev) => setSpeed(ev.target.value);
    $("#cVol").oninput = (ev) => setVol(ev.target.value);
    $("#cMute").onclick = toggleMute;
    $("#cNote").onclick = openNote;
    $("#cAudio").onclick = audioMode;
    $("#thAudio").onclick = audioMode;
    $("#cPip").onclick = popOut;
    $("#thPip").onclick = popOut;
    $("#pipBack").onclick = () => { if (P.pip) P.pip.close(); };
    $("#cExpand").onclick = () => (P.mode === "theater" ? minimize() : expand());
    $("#cClose").onclick = closePlayer;
    $("#thMin").onclick = minimize;
    $("#dockMeta").onclick = expand;
    $("#theater").addEventListener("scroll", () => requestAnimationFrame(placeDock), { passive: true });
    $("#sideTabs").addEventListener("click", (ev) => { const b = ev.target.closest("[data-side]"); if (!b) return; P.side = b.dataset.side; paintSide(); });
    $("#theater").addEventListener("click", (ev) => {
      const sk = ev.target.closest("[data-seek]");
      if (sk && sk.dataset.seek !== "") { jumpTo(P.cur.id, Number(sk.dataset.seek)); return; }
      const pl = ev.target.closest("[data-play]"); if (pl) { play(pl.dataset.play); return; }
      const dn = ev.target.closest("[data-delnote]"); if (dn) { h().delNote(P.cur.id, dn.dataset.delnote); paintSide(); return; }
      const ct = ev.target.closest("[data-closeth]"); if (ct) { minimize(); return; }
      const th = ev.target.closest("[data-th]");
      if (th) {
        const a = th.dataset.th, e = P.cur;
        if (a === "fav") { h().toggleFav(e.id); paintTheater(); A.views.refreshCardsFor(e.id); }
        if (a === "queue") { h().toggleQueue(e.id); paintTheater(); A.views.paintQueueCount(); A.views.refreshCardsFor(e.id); }
        if (a === "link") A.views.copyLinkAt(e.id, curTime());
        if (a === "share") A.views.share(e.id, curTime());
        if (a === "details") A.views.openDrawer(e.id);
      }
    });
  }

  A.player = { P, play, seek, jumpTo, togglePlay, setSpeed, setVol, toggleMute, prevChapter, nextChapter, playNext, minimize, expand, audioMode, popOut, closePlayer, curTime, durNow, openNote, wire, tick, flush, paintSide, paintTheater, placeDock, setMode, chapterAt, hideCountdown, loadAPI };
})(window.ASFE);
