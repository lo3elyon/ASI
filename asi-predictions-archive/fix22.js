/* fix22.js: batch 22, loaded last (after fix21).
   1. X parks the window for 90s instead of destroying its YouTube player: paused, hidden (display:none,
      off-screen, aria-hidden, inert). The same video opened again within 90s comes back at the same time,
      paused. After 90s, or when another video opens, the player is destroyed as before.
   2. Page to window handoff: the poster frame stays over the window until PLAYING; the window's YT.Player is
      built with start=<current time>; the IFrame API preloads on the first hover or focus of a play button.
   3. Resume and watched writes happen only while the player reports PLAYING (plus the one write at the
      moment it stops playing); the dock's play/pause icon follows the real player state.
   4d. Every [data-n] count is re-read from the data. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer, doc = document;
  if (!AP || !AP.onCreate) return;
  var P = AP._dock || null;
  var insts = [];
  var popEl = function () { return P && P.el ? P.el() : null; };
  var popInst = function () { return P && P.inst ? P.inst() : null; };
  var ytOf = function (i) { try { return i && i.yt ? i.yt() : null; } catch (e) { return null; } };
  var ytState = function (i) {
    var y = ytOf(i);
    if (!y || typeof y.getPlayerState !== "function") return null;
    try { var s = y.getPlayerState(); return typeof s === "number" ? s : null; } catch (e) { return null; }
  };
  var curId = function (i) { try { var v = i.current && i.current(); return v ? String(v.id) : ""; } catch (e) { return ""; } };
  var still = function () { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); };

  /* ================= 3. the real play state, per instance ================= */
  AP.onCreate(function (inst) {
    if (!inst || inst.__f22) return;
    inst.__f22 = true; insts.push(inst);
    inst.__f22s = -1; inst.__f22left = 0;
    /* state().playing follows YouTube's own report (PLAYING or BUFFERING), not a cached flag */
    var st0 = inst.state;
    inst.state = function () {
      var s = st0.apply(this, arguments);
      var r = s && inst.started && inst.started() ? ytState(inst) : null;
      if (r != null) s.playing = r === 1 || r === 3;
      return s;
    };
    if (inst.on) inst.on("state", function (s) {
      if (inst.__f22s === 1 && s !== 1) inst.__f22left = Date.now();
      inst.__f22s = s;
      if (inst === popInst()) { paintDock(); handState(s); }
    });
    if (!inst.floating) {
      /* the page player handing over: remember its id and time for the window's start= */
      var stop0 = inst.stop;
      inst.stop = function () {
        try {
          var s = inst.state();
          if (s && s.video && s.playing) { lastHand = { id: String(s.video.id), t: +s.time || 0, ts: Date.now() }; wrapYT(); }
        } catch (e) {}
        return stop0.apply(this, arguments);
      };
    } else {
      /* a parked window takes no keys */
      var k0 = inst._keys;
      if (typeof k0 === "function") inst._keys = function (ev) { return parked ? false : k0.apply(this, arguments); };
    }
  });

  /* a write for this talk is allowed while its player is PLAYING, or at the moment it stops playing */
  /* batch 25: an explicit "Mark as watched" (or its Undo) may write for its talk for the next 2 s */
  var manual = {};
  AP.allowWrite = function (id) { manual[String(id || "")] = Date.now(); };
  var allowed = function (id) {
    id = String(id || "");
    if (manual[id] && Date.now() - manual[id] < 2000) return true;
    for (var i = 0; i < insts.length; i++) {
      var it = insts[i]; if (curId(it) !== id) continue;
      if (ytState(it) === 1) return true;
      if (it.__f22s === 1) return true; /* the pause / end write, made before the state event reaches us */
      if (it.__f22left && Date.now() - it.__f22left < 1000) return true;
    }
    return false;
  };

  var KEYP = "asiArchive.player.v1", KEYW = "watched19:";
  var parse = function (s) { try { var o = JSON.parse(s); return o && typeof o === "object" ? o : null; } catch (e) { return null; } };
  var persisted = null;
  try { persisted = parse(localStorage.getItem(KEYP)); } catch (e) {}
  persisted = persisted || {};
  persisted.p = persisted.p || {}; persisted.w = persisted.w || {};
  var blocked = {};
  var gateP = function (v) {
    var n = parse(v); if (!n) return v;
    n.p = n.p || {}; n.w = n.w || {};
    var ids = {}, k;
    for (k in n.p) ids[k] = 1; for (k in n.w) ids[k] = 1; for (k in persisted.p) ids[k] = 1; for (k in persisted.w) ids[k] = 1;
    for (k in ids) {
      var np = n.p[k], op = persisted.p[k], nw = !!n.w[k], ow = !!persisted.w[k];
      if (np === op && nw === ow) continue;
      var write = (np != null && np !== op) || (nw && !ow);
      if (!write) { delete blocked[k]; continue; } /* clearing (Clear history, unwatch) always goes through */
      if (allowed(k)) { delete blocked[k]; continue; }
      if (op != null) n.p[k] = op; else delete n.p[k];
      if (ow) n.w[k] = 1; else delete n.w[k];
      blocked[k] = 1;
    }
    persisted = n;
    return JSON.stringify(n);
  };
  var setItem0 = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    try {
      if (this === window.localStorage) {
        if (k === KEYP) v = gateP(String(v));
        else if (typeof k === "string" && k.indexOf(KEYW) === 0 && !allowed(k.slice(KEYW.length))) return;
      }
    } catch (e) {}
    return setItem0.call(this, k, v);
  };
  /* readers (Continue watching, the dock) see the stored position for a talk whose write was held back */
  var fromStore = function (id) { return { pos: persisted.nr ? 0 : +persisted.p[id] || 0, watched: !!persisted.w[id] }; };
  ["position", "progress"].forEach(function (name) {
    var f0 = AP[name]; if (typeof f0 !== "function") return;
    AP[name] = function (id) { return blocked[id] ? fromStore(id) : f0.apply(this, arguments); };
  });

  /* the dock's play / pause icon, from the real state */
  var paintDock = function () {
    var e = popEl(), it = popInst(); if (!e || !it) return;
    var pp = e.querySelector('.x-dk [data-dk="pp"]'); if (!pp) return;
    var r = ytState(it), on = r != null ? r === 1 || r === 3 : !!it.state().playing, l = on ? "Pause" : "Play";
    if (pp.classList.contains("is-on") !== on) pp.classList.toggle("is-on", on);
    if (pp.getAttribute("aria-label") !== l) { pp.setAttribute("aria-label", l); pp.setAttribute("title", l); }
  };
  window.addEventListener("click", function (ev) {
    if (ev.target.closest && ev.target.closest('.x-dk [data-dk="pp"]')) { setTimeout(paintDock, 120); setTimeout(paintDock, 400); }
  }, true);
  /* batch 24: runs only while a player is open and the tab is visible (XIdle, set before the deferred scripts) */
  var dockSync = function () { var e = popEl(); if (e && !e.hidden && e.classList.contains("is-dk14")) paintDock(); };
  if (window.XIdle) XIdle.every(dockSync, 500, { final: true }); else setInterval(dockSync, 500);

  /* ================= 1. park on X, for 90s ================= */
  var PARK_MS = 90000;
  var parked = null; /* { id, modal, timer } */
  var setPark = function (e, on) {
    e.classList.toggle("f22-parked", on);
    if (on) e.setAttribute("aria-hidden", "true"); else e.removeAttribute("aria-hidden");
    e.inert = on;
  };
  var clearPark = function () {
    if (!parked) return;
    clearTimeout(parked.timer); parked = null;
    var e = popEl(); if (e) setPark(e, false);
  };
  /* after 90s: the normal close, which destroys the player; the window stays display:none throughout */
  var expire = function () {
    if (!parked) return;
    clearTimeout(parked.timer); parked = null;
    var e = popEl(); if (!e) return;
    e.hidden = false;
    try { P.close(); } catch (x) {}
    e.hidden = true;
    setPark(e, false);
  };
  var park = function () {
    var e = popEl(), it = popInst();
    if (!P || !e || !it || !P.isOpen() || (P.leaving && P.leaving())) return false;
    var s = ytState(it);
    if (!ytOf(it) || !it.started() || s == null || s === 0 || s === -1) return false; /* nothing live to keep, or ended */
    var v = it.current(); if (!v) return false;
    var fe = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (fe && e.contains(fe)) { try { (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc); } catch (x) {} }
    try { if (it.exitPseudoFs) it.exitPseudoFs(); } catch (x) {}
    if (s === 1 || s === 3) { try { it.pause(); } catch (x) {} }
    var modal = P.isModal();
    /* look and act like a close: the dock shape, the wide shape, the dim and the page lock all go */
    e.classList.remove("is-dk14", "is-dk-drag");
    try { P.unMin(); } catch (x) {}
    try { if (P.isWide()) P.setWide(false); } catch (x) {}
    try { if (P.isModal()) P.setModal(false); } catch (x) {}
    if (e.contains(doc.activeElement)) { try { doc.activeElement.blur(); } catch (x) {} }
    insts.forEach(function (i) { if (!i.floating && i.root.classList.contains("is-out")) { i.root.classList.remove("is-out"); try { i.suppress(); } catch (x) {} } });
    setPark(e, true);
    e.hidden = true;
    clearTimeout(parked && parked.timer);
    parked = { id: String(v.id), modal: modal, timer: setTimeout(expire, PARK_MS) };
    return true;
  };
  /* the same video within 90s: back in place, at the same time, paused */
  var unpark = function (modal) {
    if (!parked) return false;
    var e = popEl(), it = popInst(); if (!e || !it) { clearPark(); return false; }
    clearTimeout(parked.timer); parked = null;
    setPark(e, false);
    if (e.parentNode !== doc.body) doc.body.appendChild(e);
    e.hidden = false;
    if (modal) P.setModal(true);
    else { P.setModal(false); P.setWidth(P.S.w || 400); P.place(); requestAnimationFrame(function () { P.place(); P.ensureOnScreen(); }); }
    var b = e.querySelector('.x-pop__body .x-ap__cover [data-a="toggle"]') || e.querySelector('.x-pop__body [data-a="toggle"]');
    if (b) { try { b.focus({ preventScroll: true }); } catch (x) {} }
    paintDock();
    return true;
  };
  var sameParked = function (id) { return !!(parked && id != null && String(id) === parked.id); };
  /* any other open clears the park; a different video then loads, which destroys the old player as before */
  if (P && P.on) P.on("open", function () { if (parked) clearPark(); hideHand(); });

  /* only X closes: the title bar's X and the dock's X */
  window.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest('.x-pop__tools [data-p="close"], .x-dk [data-dk="close"]');
    var e = popEl();
    if (!b || !e || !e.contains(b)) return;
    if (!park()) return; /* nothing to keep: the normal close runs */
    ev.preventDefault(); ev.stopImmediatePropagation();
  }, true);

  /* reopening routes */
  var watch0 = AP.watch;
  AP.watch = function (arg, o) {
    var id = typeof arg === "string" ? arg : arg && arg.id;
    if (sameParked(id) && unpark(true)) return;
    return watch0.apply(this, arguments);
  };
  var popout0 = AP.popout;
  AP.popout = function (arg, o) {
    var id = typeof arg === "string" ? arg : arg && arg.id;
    if (sameParked(id) && unpark(false)) return;
    return popout0.apply(this, arguments);
  };
  window.addEventListener("click", function (ev) {
    if (!parked || ev.button) return;
    var a = ev.target.closest && ev.target.closest("a[data-watch], [data-play-here]");
    if (!a) return;
    var id = a.getAttribute("data-watch") || a.getAttribute("data-play-here");
    if (!sameParked(id)) return;
    if (unpark(a.hasAttribute("data-watch"))) { ev.preventDefault(); ev.stopPropagation(); }
  }, true);

  /* ================= 2. page to window handoff ================= */
  var lastHand = null;
  var wrapYT = function () {
    var Y = window.YT; if (!Y || typeof Y.Player !== "function" || Y.Player.__f22) return !!(Y && Y.Player && Y.Player.__f22);
    var Orig = Y.Player;
    var W = function (host, o) {
      try {
        if (o && lastHand && o.videoId && String(o.videoId) === lastHand.id && Date.now() - lastHand.ts < 4000) {
          o.playerVars = o.playerVars || {};
          o.playerVars.start = Math.max(0, Math.floor(lastHand.t));
        }
      } catch (e) {}
      return new Orig(host, o);
    };
    W.prototype = Orig.prototype; W.__f22 = true;
    for (var k in Orig) if (Object.prototype.hasOwnProperty.call(Orig, k)) { try { W[k] = Orig[k]; } catch (e) {} }
    Y.Player = W;
    return true;
  };
  var tries = 0, wy = setInterval(function () { if (wrapYT() || ++tries > 120) clearInterval(wy); }, 500);

  /* the poster frame over the window until PLAYING */
  var hand = null, handT = 0;
  var hideHand = function (soft) {
    clearTimeout(handT); handT = 0;
    var h = hand; hand = null; if (!h) return;
    if (!soft || still()) { h.remove(); return; }
    h.classList.add("is-out");
    setTimeout(function () { h.remove(); }, 200);
  };
  var showHand = function (id) {
    var it = popInst(); if (!it) return;
    var screen = it.screen || it.root.querySelector(".x-ap__screen"); if (!screen) return;
    hideHand();
    var h = doc.createElement("div");
    h.className = "f22-hand"; h.setAttribute("aria-hidden", "true");
    var img = doc.createElement("img");
    img.alt = ""; img.decoding = "sync"; img.width = 480; img.height = 270;
    img.src = AP.thumb ? AP.thumb(id) : "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";
    h.appendChild(img);
    screen.appendChild(h);
    hand = h;
    handT = setTimeout(function () { hideHand(true); }, 10000);
  };
  var handState = function (s) {
    if (!hand) return;
    if (s === 1) { requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(function () { hideHand(true); }, 80); }); }); }
    else if (s === 0 || s === 2) hideHand(true);
  };
  /* after an open: a recent handoff of the same video that is starting gets the poster */
  if (P && P.on) P.on("open", function () {
    Promise.resolve().then(function () {
      var it = popInst(); if (!it || !lastHand || Date.now() - lastHand.ts > 1500) return;
      if (curId(it) !== lastHand.id || !it.started()) return;
      if (ytState(it) === 1) return;
      showHand(lastHand.id);
    });
  });

  /* the IFrame API preloads on the first hover or focus of any play button */
  var PLAYSEL = 'a[data-watch], [data-play-here], [data-a="toggle"], [data-a="play"], [data-a="pop"], [data-wh-play], [data-cw-play], [data-playall], .x-play, .x-ap__big';
  var pre = function (ev) {
    var t = ev.target;
    if (!t || !t.closest || !t.closest(PLAYSEL)) return;
    doc.removeEventListener("pointerover", pre, true); doc.removeEventListener("focusin", pre, true); doc.removeEventListener("touchstart", pre, true);
    try { if (AP.preloadApi) AP.preloadApi(); } catch (e) {}
    setTimeout(wrapYT, 0);
  };
  doc.addEventListener("pointerover", pre, true);
  doc.addEventListener("focusin", pre, true);
  doc.addEventListener("touchstart", pre, { capture: true, passive: true });

  /* ================= 4d. counts from the data ================= */
  var syncCounts = function () {
    var n = 0;
    try { var d = window.Hark && Hark.data ? Hark.data("d-videos") : null; n = Array.isArray(d) ? d.length : 0; } catch (e) {}
    if (!n) return;
    var t = n.toLocaleString("en-US");
    doc.querySelectorAll('[data-n="talks"]').forEach(function (el) { if (el.textContent !== t) el.textContent = t; });
  };
  /* after the stats' count-up (1.1s) has run */
  if (doc.readyState === "complete") setTimeout(syncCounts, 2500); else window.addEventListener("load", function () { setTimeout(syncCounts, 2500); });
  setTimeout(syncCounts, 6000);
})();
