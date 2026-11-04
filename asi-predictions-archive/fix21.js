/* fix21.js: loaded last.
   1. The centred window shows the watch-hub panel: a right column from 1000px (or the 44px rail when folded),
      a bottom sheet over the lower 45% under that. F21fit (called by player6 fitPop) sizes the window so the
      video stays 16:9 with its controls beside the column, within 100vw - 32px.
   2. Fast start: the IFrame API loads on page idle; reopening the video already in the window reuses its player;
      the start cover goes within 300ms of PLAYING; click-to-PLAYING is logged with console.debug.
   3. The site / YouTube controls switch in every view: the window's title bar, the video's corner in the page
      player and fullscreen, and "Site controls" (with Theater) while YouTube's controls are on. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer, doc = document;
  if (!AP || !AP.onCreate) return;
  var P = AP._dock || null;
  var setCls = function (el, c, on) { if (el && el.classList.contains(c) !== !!on) el.classList.toggle(c, !!on); };
  var setVar = function (el, k, v) { if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v); };
  var svg = function (d) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
  var IC = {
    yt: svg('<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>'),
    site: svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
    wide: svg('<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>')
  };

  /* ================= 1. the panel in the centred window ================= */
  var popEl = function () { return P && P.el ? P.el() : doc.querySelector(".x-pop"); };
  var popInst = function () { return P && P.inst ? P.inst() : null; };
  var px = function (v) { return Math.round(v) + "px"; };
  window.F21fit = function (inst, el) {
    var root = inst && inst.root; el = el || (root && root.closest(".x-pop"));
    if (!root || !el) return false;
    var on = !el.hidden && el.classList.contains("is-modal") && !el.classList.contains("is-wide") && !el.classList.contains("is-min") &&
      !el.classList.contains("is-dk14") && !root.classList.contains("is-fs") && !root.classList.contains("is-fsp");
    setCls(el, "f21-on", on);
    if (!on) { setCls(el, "f21-side", false); setCls(el, "f21-sheet", false); return false; }
    var vw = doc.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
    var M = vw < 600 || vh < 500 ? 8 : 16, availW = vw - 2 * M, availH = vh - 2 * M;
    var desk = window.innerWidth >= 1000;
    setCls(el, "f21-side", desk); setCls(el, "f21-sheet", !desk);
    var wh = root.querySelector(":scope > .x-wh"), has = !!(wh && !wh.hidden && root.classList.contains("has-wh"));
    var folded = root.classList.contains("is-wh-collapsed");
    var win = el.querySelector(".x-pop__win"), bar = el.querySelector(".x-pop__bar");
    var cs = win ? getComputedStyle(win) : null;
    var bx = cs ? (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0) : 0;
    var by = cs ? (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0) : 0;
    var barH = bar ? bar.offsetHeight || 48 : 48, W, H, pw = 0;
    if (desk) {
      if (has) pw = folded ? 44 : Math.max(280, Math.min(Math.floor(availW * 0.45), parseFloat(root.style.getPropertyValue("--wh-w")) || 360));
      var vid = Math.max(240, Math.floor(Math.min(availW - pw - bx, (availH - barH - by) * 16 / 9)));
      W = vid + pw + bx; H = Math.ceil(vid * 9 / 16) + barH + by;
    } else if (has && !folded) {
      W = availW; H = availH; /* video in the top 55%, the sheet over the lower 45% */
    } else {
      var v2 = Math.max(240, Math.floor(Math.min(availW - bx, (availH - barH - by) * 16 / 9)));
      W = v2 + bx; H = Math.ceil(v2 * 9 / 16) + barH + by;
    }
    setVar(el, "--f21-w", px(Math.min(W, vw - 32 > 240 ? vw - 32 : vw - 2 * M)));
    setVar(el, "--f21-h", px(Math.min(H, availH)));
    setVar(el, "--f21-pw", px(pw || 360));
    return true;
  };
  var fitQ = 0;
  var refit = function () {
    if (fitQ) return;
    fitQ = requestAnimationFrame(function () {
      fitQ = 0; var it = popInst(), el = popEl();
      if (it && el) { try { window.F21fit(it, el); } catch (e) {} }
    });
  };
  window.addEventListener("resize", refit, { passive: true });
  doc.addEventListener("fullscreenchange", refit);
  var hookPop = function () {
    var el = popEl(), it = popInst(); if (!el || !it || el.__f21) return !!(el && el.__f21);
    el.__f21 = true;
    if ("MutationObserver" in window) {
      var mo = new MutationObserver(refit);
      mo.observe(el, { attributes: true, attributeFilter: ["class", "hidden"] });
      mo.observe(it.root, { attributes: true, attributeFilter: ["class", "style"] }); /* is-wh-collapsed, has-wh, is-fs, --wh-w */
      var whHook = function () { var wh = it.root.querySelector(":scope > .x-wh"); if (wh && !wh.__f21) { wh.__f21 = true; mo.observe(wh, { attributes: true, attributeFilter: ["hidden"] }); } };
      whHook(); setTimeout(whHook, 600); it.root.addEventListener("click", whHook);
    }
    addTitleBtn(el, it);
    refit();
    return true;
  };

  /* ================= 2. fast start ================= */
  /* the IFrame API on page idle, not on the first click */
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1200); };
  var preload = function () { idle(function () { try { if (AP.preloadApi) AP.preloadApi(); } catch (e) {} }, { timeout: 4000 }); };
  if (doc.readyState === "complete") preload(); else window.addEventListener("load", preload);

  /* reopening the video already in the window (any shape) brings it back without a reload */
  var sameOpen = function (id) {
    if (!P || !id || !P.isOpen() || (P.leaving && P.leaving())) return false;
    var it = popInst(), cur = it && it.current && it.current();
    if (!cur || String(cur.id) !== String(id)) return false;
    if (window.XDock14 && XDock14.isDocked()) XDock14.expand();
    if (P.isMin()) P.unMin();
    if (!P.isModal()) P.setModal(true);
    return true;
  };
  var watch0 = AP.watch;
  AP.watch = function (arg, o) {
    var id = typeof arg === "string" ? arg : arg && arg.id;
    if (!(o && o.at > 0) && sameOpen(id)) return;
    return watch0.apply(this, arguments);
  };
  doc.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[data-watch]");
    if (!a || ev.defaultPrevented || ev.button) return;
    if (sameOpen(a.getAttribute("data-watch"))) ev.preventDefault(); /* player.js skips a prevented click */
  }, true);

  /* click-to-PLAYING, measured */
  var t0 = 0;
  var PLAY = '[data-a="toggle"], .x-ap__shield, .x-ap__cover, .x-ap__poster, [data-p="ptoggle"], [data-dk], [data-wh-play], a[data-watch], [data-play-here]';
  doc.addEventListener("pointerdown", function (ev) { if (ev.target.closest && ev.target.closest(PLAY)) t0 = performance.now(); }, true);
  doc.addEventListener("keydown", function (ev) {
    var k = ev.key; if ((k === "k" || k === "K" || k === " " || k === "Enter") && ev.target.closest && ev.target.closest(".x-ap, .x-pop")) t0 = performance.now();
  }, true);

  /* ================= 3. the controls switch ================= */
  var paintCtl = function (b, native) {
    var t = native ? "Site controls" : "YouTube controls";
    if (b.getAttribute("aria-pressed") !== String(native)) b.setAttribute("aria-pressed", String(native));
    if (b.getAttribute("title") !== t + " (Y)") { b.setAttribute("title", t + " (Y)"); b.setAttribute("aria-label", t + " (Y)"); }
    var ic = native ? IC.site : IC.yt;
    if (b.__ic !== ic) { b.__ic = ic; b.innerHTML = ic; }
  };
  var flip = function (inst) {
    if (!inst || !inst.setNative) return;
    try { inst.setNative(!inst.isNative()); } catch (e) {}
    setTimeout(function () { paintAll(inst); }, 0);
  };
  var guard = function (b) { ["pointerdown", "mousedown", "touchstart"].forEach(function (t) { b.addEventListener(t, function (ev) { ev.stopPropagation(); }, { passive: true }); }); };
  var addTitleBtn = function (el, it) {
    var tools = el.querySelector(".x-pop__tools"); if (!tools || tools.querySelector(".f21-ctlb")) return;
    var b = doc.createElement("button"); b.type = "button"; b.className = "x-pop__i f21-ctlb";
    var yt = tools.querySelector('[data-p="yt"]'); tools.insertBefore(b, yt || tools.lastChild);
    paintCtl(b, it.isNative && it.isNative());
    b.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); flip(it); });
    guard(b);
  };
  var paintAll = function (inst) {
    var n = !!(inst.isNative && inst.isNative());
    var el = inst.root.closest(".x-pop");
    if (el) el.querySelectorAll(".x-pop__tools .f21-ctlb").forEach(function (b) { paintCtl(b, n); });
    inst.root.querySelectorAll(".f21-ctl").forEach(function (b) { paintCtl(b, n); });
    inst.root.querySelectorAll('.x-sx-nat [data-a="siteplayer"]').forEach(function (b) {
      if (b.getAttribute("title") !== "Site controls (Y)") { b.setAttribute("title", "Site controls (Y)"); b.setAttribute("aria-label", "Site controls (Y)"); }
    });
  };

  AP.onCreate(function (inst) {
    if (!inst || !inst.root || inst.root.__f21) return;
    var root = inst.root; root.__f21 = true;
    var screen = inst.screen || root.querySelector(".x-ap__screen");
    /* the corner button: page player and fullscreen (the window's title bar has its own) */
    if (screen && !screen.querySelector(".f21-ctl")) {
      var b = doc.createElement("button"); b.type = "button"; b.className = "f21-ctl";
      screen.appendChild(b);
      b.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); flip(inst); });
      ["dblclick", "pointerup", "mouseup"].forEach(function (t) { b.addEventListener(t, function (ev) { ev.stopPropagation(); }); });
      guard(b);
    }
    /* YouTube-controls mode: Theater beside "Site controls" */
    var nat = root.querySelector(".x-sx-nat");
    if (nat && !nat.querySelector(".f21-th")) {
      var th = doc.createElement("button"); th.type = "button"; th.className = "x-sx-ob f21-th";
      th.setAttribute("aria-label", "Theater (T)"); th.setAttribute("title", "Theater (T)"); th.innerHTML = IC.wide;
      nat.appendChild(th);
      th.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var t = root.querySelector('.x-ap__bar [data-a="theater"]') || root.querySelector('[data-a="theater"]:not(.f21-th)');
        if (t) t.click();
      });
      guard(th);
    }
    paintAll(inst);
    if ("MutationObserver" in window) new MutationObserver(function () { paintAll(inst); }).observe(root, { attributes: true, attributeFilter: ["class"] });

    if (inst.on) {
      inst.on("state", function (s) {
        if (s !== 1) return;
        if (t0 && performance.now() - t0 > 20000) t0 = 0; /* a stale press is not a start */
        if (t0) { try { console.debug("[player] click to PLAYING: " + Math.round(performance.now() - t0) + " ms"); } catch (e) {} t0 = 0; }
        /* the cover never outlasts PLAYING by more than 300ms */
        setTimeout(function () {
          var c = root.querySelector(".x-ap__cover");
          if (c && !c.hidden && !root.classList.contains("is-cover")) { c.classList.remove("is-fading"); c.hidden = true; }
        }, 300);
      });
    }
    if (root.closest(".x-pop")) { hookPop(); setTimeout(hookPop, 300); }
  });
  hookPop();
})();
