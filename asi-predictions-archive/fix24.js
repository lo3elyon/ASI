/* fix24: batch 24, loaded last.
   1. The nav has no Customize gear: fixes7.js no longer creates it (nor watches the nav to put it back). This only
      drops a stale copy once at start. Customise opens from the footer link, the More menu and Ctrl/⌘K.
   2. Rendering work:
      - top-level sections far from the screen get .f24-cv (content-visibility: auto, fix24.css), never the routed
        section nor one holding the player or the dock; each keeps its measured height as the size estimate
      - the hero aurora and the section tints pause off screen (.f24-off) and in a hidden tab (html.f24-hidden)
      - the player's tick tells XIdle a talk is playing, so the polling jobs gated in batch 24 run only while a
        player is open
   Follow-up: (0) inline style writes of an unchanged value are skipped, so no observer re-triggers itself; the still
   page itself is in fix24.css and the one-time motion migration in the head of index.html. (3) The site control bar
   re-reads the new YouTube player after a switch of controls; its repair job runs through XIdle.
   No MutationObserver on the header nav. window.XAudit24() reports the idle state. */
(function () {
  "use strict";
  var doc = document, docEl = doc.documentElement;
  var hasIO = "IntersectionObserver" in window;

  /* ---------- 1. no gear in the nav ---------- */
  var dropGear = function () {
    doc.querySelectorAll("header.nav .x-cz-btn").forEach(function (g) { g.remove(); });
  };

  /* ---------- 2a. content-visibility for far-off sections ---------- */
  var PLAYER = ".x-ap, .x-pop, .x-dk, .x-pop-bd";
  var sections = function () { return [].slice.call(doc.querySelectorAll("main.main > section.section")); };
  var routed = function (sec) {
    var h = location.hash || "";
    if (h.length < 2 || h.charAt(1) === "/") return false;
    var id = h.slice(1);
    try { id = decodeURIComponent(id); } catch (e) {}
    if (sec.id === id) return true;
    var el = doc.getElementById(id);
    return !!(el && sec.contains(el));
  };
  var keep = function (sec) {
    return routed(sec) || !!sec.querySelector(PLAYER) || sec.contains(doc.activeElement) ||
      (window.XJump && window.XJump.active);
  };
  var far = new WeakMap();
  var setCv = function (sec) {
    var off = far.get(sec) === true && !keep(sec);
    if (off === sec.classList.contains("f24-cv")) return;
    if (off) {
      /* the estimate is its real height, measured while it is still drawn */
      var h = sec.offsetHeight;
      if (h > 0) sec.style.containIntrinsicSize = "auto " + h + "px";
    }
    sec.classList.toggle("f24-cv", off);
  };
  var cvIO = false ? new IntersectionObserver(function (en) {
    en.forEach(function (e) { far.set(e.target, !e.isIntersecting); setCv(e.target); });
  }, { rootMargin: "1500px 0px 1500px 0px" }) : null;
  var refreshCv = function () { sections().forEach(function (s) { if (far.has(s)) setCv(s); }); };

  /* ---------- 2b. infinite loops pause off screen and in a hidden tab ---------- */
  var animIO = hasIO ? new IntersectionObserver(function (en) {
    en.forEach(function (e) { e.target.classList.toggle("f24-off", !e.isIntersecting); });
  }) : null;
  var seen = new WeakSet();
  var observeAll = function () {
    sections().forEach(function (s) {
      if (seen.has(s)) return;
      seen.add(s);
      if (cvIO) cvIO.observe(s);
      if (animIO) animIO.observe(s);
    });
    doc.querySelectorAll(".hero").forEach(function (h) {
      if (seen.has(h) || !animIO) return;
      seen.add(h); animIO.observe(h);
    });
  };
  var paintHidden = function () { docEl.classList.toggle("f24-hidden", !!doc.hidden); };
  doc.addEventListener("visibilitychange", paintHidden);

  /* a player opening inside a section keeps that section drawn right away */
  var onGesture = function () { setTimeout(refreshCv, 80); };

  /* ---------- 2c. player ticks keep XIdle on while a talk plays ---------- */
  var hookPlayer = function () {
    var AP = window.ArchivePlayer;
    if (!AP || !AP.onCreate || !window.XIdle) return;
    AP.onCreate(function (inst) { if (inst && inst.on) inst.on("tick", function () { XIdle.tick(); }); });
  };

  window.XAudit24 = function () {
    var g = doc.querySelector("header.nav");
    return {
      navGear: !!(g && g.querySelector(".x-cz-btn")),
      themeButton: !!(g && g.querySelector(".theme-btn")),
      footerCustomise: !!doc.querySelector(".foot .f24-cz[data-cz-open]"),
      gatedIntervalsRunning: window.XIdle ? XIdle.running() : null,
      playerOpen: window.XIdle ? XIdle.isOn() : null,
      sectionsSkipped: sections().filter(function (s) { return s.classList.contains("f24-cv"); }).map(function (s) { return s.id; }),
      animationsPaused: [].slice.call(doc.querySelectorAll(".f24-off")).map(function (e) { return e.id || e.className.split(" ")[0]; }),
      lazyImages: [].slice.call(doc.images).filter(function (i) { return i.loading === "lazy"; }).length + " of " + doc.images.length
    };
  };

  /* ---------- 0. style writes only when the value changes ----------
     Observers and pollers (the nav's --nav-h, the masonry widths, the player's fit) write custom properties they
     also cause to be measured. A write of the value already set is skipped, so no observer can wake itself. */
  (function () {
    var CS = window.CSSStyleDeclaration && CSSStyleDeclaration.prototype, sp0 = CS && CS.setProperty;
    if (!sp0 || sp0.__f24) return;
    var sp = function (k, v, p) {
      try {
        if (v != null && this.getPropertyValue(k) === String(v) && this.getPropertyPriority(k) === String(p || "")) return;
      } catch (e) {}
      return sp0.apply(this, arguments);
    };
    sp.__f24 = true;
    CS.setProperty = sp;
  })();

  /* ---------- 3. site controls right after switching back from YouTube's controls ----------
     The switch destroys the YouTube player and builds a new one with start=N. Once the new player is ready the
     site's seek bar, time and duration are read from that new instance (inst.yt() always returns the live one),
     with the old time shown until the new player reports its own; the seek bar's change seeks the new player.
     The repair job runs through XIdle: only while a player exists and the tab is visible. */
  var pad2 = function (n) { return (n < 10 ? "0" : "") + n; };
  var fmtT = function (s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? h + ":" + pad2(m) + ":" + pad2(x) : m + ":" + pad2(x);
  };
  var players = [];
  var liveYT = function (inst) {
    var y = null; try { y = inst.yt && inst.yt(); } catch (e) {}
    return y && typeof y.getCurrentTime === "function" && typeof y.getDuration === "function" ? y : null;
  };
  var native = function (inst) { try { return !!(inst.isNative && inst.isNative()); } catch (e) { return false; } };
  /* paint the site bar from the live player; force paints even a small difference (right after a switch) */
  var paintBar = function (inst, force) {
    var seek = inst.seek, y = liveYT(inst);
    if (!seek || !y || native(inst)) return false;
    var d = 0, t = 0;
    try { d = +y.getDuration() || 0; t = +y.getCurrentTime() || 0; } catch (e) { return false; }
    var w = inst.__f24w, real = t > 0.5;
    if (!real && w && w.t > 0 && Date.now() < w.until) t = w.t; /* the new player has not reported its start yet */
    var root = inst.root, cur = root.querySelector('[data-r="cur"]'), dur = root.querySelector('[data-r="dur"]');
    if (d > 0) {
      var mx = String(Math.floor(d));
      if (seek.max !== mx) seek.max = mx;
      var fd = fmtT(d); if (dur && dur.textContent !== fd) dur.textContent = fd;
    }
    if (!inst.__f24drag) {
      var shown = +seek.value || 0, stale = force || Math.abs(shown - t) > 1.5 || (cur && cur.textContent === "0:00" && t >= 1);
      if (stale) {
        var v = String(Math.floor(t));
        if (seek.value !== v) seek.value = v;
        var ft = fmtT(t); if (cur && cur.textContent !== ft) cur.textContent = ft;
        seek.style.setProperty("--x-ap-pct", (d > 0 ? (Math.floor(t) / d) * 100 : 0) + "%");
      }
    }
    if (w && real && d > 0) inst.__f24w = null; /* the new player reports its own time: the hand-over is done */
    return d > 0 && real;
  };
  /* a few one-shot paints after the new player is ready (no loop); the XIdle job covers the rest */
  var rebind = function (inst) {
    if (native(inst)) return;
    paintBar(inst, true);
    [120, 400, 900, 1800, 3500].forEach(function (ms) {
      setTimeout(function () { if (!doc.hidden && liveYT(inst)) paintBar(inst, !!inst.__f24w); }, ms);
    });
  };
  var hookControls = function () {
    var AP = window.ArchivePlayer;
    if (!AP || !AP.onCreate) return;
    AP.onCreate(function (inst) {
      if (!inst || inst.__f24c || !inst.root) return;
      inst.__f24c = true; players.push(inst);
      var last = 0, lastId = "", lastNat = null;
      var vid = function () { try { var v = inst.current && inst.current(); return v ? String(v.id) : ""; } catch (e) { return ""; } };
      if (inst.on) {
        inst.on("tick", function (t) { if (+t > 0) { last = +t; lastId = vid(); lastNat = native(inst); } });
        /* every new YouTube player; a switch of controls (the button, the menu or the Y key) re-embeds the same talk */
        inst.on("ready", function () {
          var same = lastId && lastId === vid();
          var switched = inst.__f24switch || (same && lastNat !== null && lastNat !== native(inst));
          inst.__f24w = switched && same && last > 0 ? { t: last, until: Date.now() + 6000 } : null;
          inst.__f24switch = false;
          rebind(inst);
        });
      }
      if (typeof inst.setNative === "function") {
        var set0 = inst.setNative;
        inst.setNative = function (on) {
          var y = liveYT(inst);
          try { if (y) { last = +y.getCurrentTime() || last; lastId = vid(); } } catch (e) {}
          inst.__f24switch = true;
          return set0.apply(this, arguments);
        };
      }
      var seek = inst.seek;
      if (seek && !seek.__f24) {
        seek.__f24 = true;
        var up = function () { inst.__f24drag = false; };
        seek.addEventListener("pointerdown", function () { inst.__f24drag = true; });
        seek.addEventListener("input", function () { inst.__f24drag = true; });
        seek.addEventListener("pointerup", up);
        seek.addEventListener("pointercancel", up);
        seek.addEventListener("blur", up);
        /* the seek goes to the live player; if the old handler missed it, seek once more */
        seek.addEventListener("change", function () {
          up();
          var want = +seek.value || 0;
          inst.__f24w = null;
          setTimeout(function () {
            var y = liveYT(inst); if (!y || native(inst)) return;
            var t = 0; try { t = +y.getCurrentTime() || 0; } catch (e) { return; }
            if (Math.abs(t - want) > 2) { try { y.seekTo(want, true); } catch (e) {} }
          }, 150);
        });
      }
    });
    /* the repair job: runs only while a player is open and the tab is visible */
    var job = function () { players.forEach(function (inst) { try { if (inst.started && inst.started()) paintBar(inst, false); } catch (e) {} }); };
    if (window.XIdle) XIdle.every(job, 500);
  };

  var boot = function () {
    dropGear();
    hookControls();
    paintHidden();
    observeAll();
    hookPlayer();
    window.addEventListener("hashchange", function () { observeAll(); refreshCv(); });
    ["click", "keydown"].forEach(function (t) { window.addEventListener(t, onGesture, { capture: true, passive: true }); });
    doc.addEventListener("focusin", refreshCv);
    if (window.XIdle) XIdle.check();
  };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})();
