/* Batch 14: only the X button closes the player.
   An outside click (backdrop, dim or page), a page scroll, or navigation to another section minimises the
   player into the corner dock instead. The dock is the same player element and iframe, reshaped: nothing is
   moved, recreated or reloaded, so playback, time, captions and speed carry over. Expand returns it to the
   mode it came from (centred, wide or corner). Esc never closes or minimises it. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer, P = AP && AP._dock;
  if (!P) return;
  var doc = document;
  var phoneMq = window.matchMedia ? window.matchMedia("(max-width: 599px)") : { matches: false };
  var DOCK_W = 320;
  var prev = null, dockPos = { corner: "br", x: 0, y: 0 }, timer = 0, bar = null, drag = null;

  var svg = function (p, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>"; };
  var IC = {
    grab: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><g fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g></svg>',
    play: '<svg class="x-dk__pl" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    pause: '<svg class="x-dk__pa" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><g fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></g></svg>',
    expand: svg('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>')
  };

  var el = function () { return P.el(); };
  var inst = function () { return P.inst(); };
  var docked = function () { var e = el(); return !!e && !e.hidden && e.classList.contains("is-dk14"); };
  var setCls = function (node, c, on) { if (node && node.classList.contains(c) !== !!on) node.classList.toggle(c, !!on); };
  var setTxt = function (node, t) { if (node && node.textContent !== t) node.textContent = t; };
  var setAttr = function (node, a, v) { if (node && node.getAttribute(a) !== v) node.setAttribute(a, v); };
  var parseLen = function (t) { return t ? String(t).split(":").reduce(function (a, b) { return a * 60 + (+b || 0); }, 0) : 0; };

  /* ---------- the dock bar, built once inside the player window ---------- */
  var build = function () {
    var e = el(); if (!e) return null;
    if (bar && bar.isConnected) return bar;
    var win = e.querySelector(".x-pop__win"); if (!win) return null;
    bar = doc.createElement("div");
    bar.className = "x-dk";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Mini player");
    bar.innerHTML =
      '<button class="x-dk__grab" type="button" data-dk="drag" aria-label="Move the mini player: drag, or use the arrow keys" title="Drag to move">' + IC.grab + "</button>" +
      '<div class="x-dk__tx"><p class="x-dk__t"></p><p class="x-dk__m">0% watched</p></div>' +
      '<button class="x-dk__b" type="button" data-dk="pp" aria-label="Play" title="Play">' + IC.play + IC.pause + "</button>" +
      '<button class="x-dk__b" type="button" data-dk="expand" aria-label="Expand the player" title="Expand">' + IC.expand + "</button>" +
      '<button class="x-dk__b" type="button" data-dk="close" aria-label="Close the player" title="Close">' + IC.close + "</button>" +
      '<span class="x-dk__line" aria-hidden="true"><i></i></span>';
    win.appendChild(bar);
    bar.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-dk]"); if (!b) return;
      ev.preventDefault(); ev.stopPropagation();
      var a = b.getAttribute("data-dk");
      if (a === "pp") { var i = inst(); if (i) i.toggle(); setTimeout(paint, 60); }
      else if (a === "expand") expand();
      else if (a === "close") { undockQuiet(); P.close(); }
    });
    /* drag by the grip or the title (not on phones, where the dock is a fixed bar) */
    [bar.querySelector(".x-dk__grab"), bar.querySelector(".x-dk__tx")].forEach(function (h) {
      h.addEventListener("pointerdown", function (ev) {
        if (!docked() || phoneMq.matches || ev.button !== 0) return;
        ev.preventDefault(); ev.stopPropagation();
        try { h.setPointerCapture(ev.pointerId); } catch (x) {}
        drag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, x: P.S.x, y: P.S.y, h: h };
        P.S.corner = null; setCls(el(), "is-dk-drag", true);
      });
      h.addEventListener("pointermove", function (ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        P.S.x = drag.x + ev.clientX - drag.sx; P.S.y = drag.y + ev.clientY - drag.sy; P.place();
      });
      var end = function (ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        drag = null; setCls(el(), "is-dk-drag", false);
        try { h.releasePointerCapture(ev.pointerId); } catch (x) {}
        dockPos = { corner: null, x: P.S.x, y: P.S.y };
      };
      h.addEventListener("pointerup", end);
      h.addEventListener("pointercancel", end);
      h.addEventListener("lostpointercapture", end);
    });
    bar.querySelector(".x-dk__grab").addEventListener("keydown", function (ev) {
      var d = { ArrowRight: [24, 0], ArrowLeft: [-24, 0], ArrowDown: [0, 24], ArrowUp: [0, -24] }[ev.key];
      if (!d || !docked() || phoneMq.matches) return;
      ev.preventDefault(); ev.stopPropagation();
      P.S.corner = null; P.S.x += d[0]; P.S.y += d[1]; P.place();
      dockPos = { corner: null, x: P.S.x, y: P.S.y };
    });
    return bar;
  };

  /* ---------- title, watched %, play state: written only when they change ---------- */
  var paint = function () {
    if (!bar || !docked()) return;
    var i = inst(); if (!i) return;
    var v = i.current() || {}, st = i.state();
    setTxt(bar.querySelector(".x-dk__t"), v.t || "Video");
    setAttr(bar.querySelector(".x-dk__t"), "title", v.t || "Video");
    var dur = (i.duration && i.duration()) || parseLen(v.len), pos = 0;
    if (i.started && i.started() && dur > 0) pos = i.now();
    else if (v.id) { var pr = AP.progress(v.id) || {}; pos = pr.watched ? dur : pr.pos || 0; }
    var pct = dur > 0 ? Math.max(0, Math.min(100, Math.round(pos / dur * 100))) : 0;
    setTxt(bar.querySelector(".x-dk__m"), pct + "% watched");
    var line = bar.querySelector(".x-dk__line i"), w = pct + "%";
    if (line && line.style.width !== w) line.style.width = w;
    var on = !!st.playing, pp = bar.querySelector('[data-dk="pp"]'), l = on ? "Pause" : "Play";
    setCls(pp, "is-on", on); setAttr(pp, "aria-label", l); setAttr(pp, "title", l);
  };
  /* batch 24: through XIdle, so the 500ms repaint also rests while the tab is hidden */
  var startTimer = function () { if (!timer) timer = window.XIdle ? XIdle.every(paint, 500) : setInterval(paint, 500); if (window.XIdle) XIdle.check(); };
  var stopTimer = function () { if (timer) { if (window.XIdle) XIdle.clear(timer); else clearInterval(timer); timer = 0; } };

  /* ---------- playback carry-over: the same iframe keeps playing; this only puts right anything that slipped ---------- */
  var snapshot = function () {
    var i = inst(); if (!i) return null;
    var st = i.state();
    return { id: st.video && st.video.id, playing: !!st.playing, started: !!(i.started && i.started()), time: st.time, rate: i.rate ? i.rate() : 1 };
  };
  var carry = function (s) {
    if (!s || !s.id) return;
    var check = function () {
      var i = inst(); if (!i) return;
      var c = i.current(); if (!c || c.id !== s.id) return;
      if (s.rate && i.rate && i.setRate && i.rate() !== s.rate) i.setRate(s.rate);
      var on = !!i.state().playing;
      if (s.playing && !on) i.play();
      else if (!s.playing && s.started && on) i.pause();
      else if (!s.playing && s.started && i.now && Math.abs(i.now() - s.time) > 1.5 && i.seekTo) i.seekTo(s.time);
    };
    requestAnimationFrame(function () { requestAnimationFrame(check); });
    setTimeout(check, 700);
  };

  /* ---------- minimise to the dock, from every shape ---------- */
  var minimise = function () {
    var e = el();
    if (!e || !P.isOpen() || docked() || P.leaving()) return;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
    var s = snapshot();
    var focusIn = e.contains(doc.activeElement);
    prev = { modal: P.isModal(), wide: P.isWide(), w: P.S.w, corner: P.S.corner, x: P.S.x, y: P.S.y };
    if (P.isMin()) P.unMin();
    if (prev.modal) P.setModal(false); /* drops wide, the dim and the page lock; the page's scroll comes back */
    else if (prev.wide) P.setWide(false);
    if (!build()) return;
    setCls(e, "is-dk14", true);
    setAttr(e, "aria-label", "Mini player");
    P.S.corner = dockPos.corner;
    if (!dockPos.corner) { P.S.x = dockPos.x; P.S.y = dockPos.y; }
    P.setWidth(Math.min(DOCK_W, (doc.documentElement.clientWidth || window.innerWidth) - 16));
    P.place();
    requestAnimationFrame(function () { if (docked()) { P.place(); P.ensureOnScreen(); } });
    paint(); startTimer();
    if (focusIn) { var x = bar.querySelector('[data-dk="expand"]'); try { x.focus({ preventScroll: true }); } catch (err) {} }
    carry(s);
  };
  /* back to the shape it came from, at the same time */
  var expand = function () {
    var e = el(); if (!docked()) return;
    var s = snapshot(), p = prev || { modal: true, wide: false, w: 400, corner: "br" };
    if (!dockPos.corner) dockPos = { corner: null, x: P.S.x, y: P.S.y };
    stopTimer();
    setCls(e, "is-dk14", false);
    prev = null;
    if (p.modal) {
      P.setModal(true);
      if (p.wide) P.setWide(true);
    } else {
      P.S.corner = p.corner; P.S.x = p.x; P.S.y = p.y;
      P.setWidth(p.w || 400);
      if (p.wide) P.setWide(true);
      P.place();
      requestAnimationFrame(function () { P.place(); P.ensureOnScreen(); });
    }
    var f = e.querySelector('.x-pop__body [data-a="toggle"]') || e.querySelector('.x-pop__tools [data-p="close"]');
    if (f) { try { f.focus({ preventScroll: true }); } catch (err) {} }
    carry(s);
  };
  /* the window closed or opened another video: leave the dock shape without touching playback */
  var undockQuiet = function () {
    var e = el(); stopTimer();
    if (!e || !e.classList.contains("is-dk14")) { prev = null; return; }
    var p = prev; prev = null;
    e.classList.remove("is-dk14", "is-dk-drag");
    if (!dockPos.corner) dockPos = { corner: null, x: P.S.x, y: P.S.y };
    if (p && !p.modal) { P.S.corner = p.corner; P.S.x = p.x; P.S.y = p.y; P.S.w = p.w || 400; }
    else P.S.w = Math.max(P.S.w, 400);
  };
  P.on("hide", undockQuiet);
  P.on("open", undockQuiet);

  /* ---------- what minimises: outside clicks (the dim included), page scrolls, navigation ---------- */
  var live = function () { return P.isOpen() && !docked() && !P.isMin() && !P.leaving() && !doc.fullscreenElement && !doc.webkitFullscreenElement; };
  var ownMenu = "dialog, .x-dd__menu, .x-apx-menu, [role='menu'], [role='listbox']";
  /* clicks that open or bring back a video already handle the player themselves */
  var opener = "[data-watch], [data-play-here], [data-wh-play], [data-a='dockhere'], [data-a='pop']";
  var outside = function (t) {
    var e = el();
    if (!t || !t.closest || !e) return false;
    if (e.contains(t)) return false;
    if (t.closest(ownMenu) || t.closest(opener)) return false;
    return true;
  };
  /* a press that only closes an open player menu does just that */
  var menuAtDown = false;
  window.addEventListener("pointerdown", function () {
    var e = el();
    menuAtDown = !!(e && !e.hidden && e.querySelector('.x-apx-menu:not([hidden]), [aria-expanded="true"]'));
  }, true);
  doc.addEventListener("click", function (ev) {
    if (!live() || !outside(ev.target)) return;
    if (menuAtDown) { menuAtDown = false; return; }
    minimise();
  }, true);
  var onScrollIntent = function (ev) {
    if (!live() || !outside(ev.target) || (window.F18inside && window.F18inside(ev))) return;
    minimise();
  };
  window.addEventListener("wheel", onScrollIntent, { passive: true, capture: true });
  window.addEventListener("touchmove", onScrollIntent, { passive: true, capture: true });
  /* scroll keys pressed on the page (not inside the player, a field or a menu) */
  doc.addEventListener("keydown", function (ev) {
    if (!/^(PageDown|PageUp|Home|End)$/.test(ev.key) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var t = ev.target, tag = t && t.tagName;
    if (/INPUT|TEXTAREA|SELECT/.test(tag || "") || (t && t.isContentEditable)) return;
    if (!live() || !outside(t === doc.body || t === doc.documentElement ? doc.body : t)) return;
    minimise();
  }, true);
  var onNav = function () { if (live()) minimise(); };
  window.addEventListener("hashchange", onNav);
  window.addEventListener("popstate", onNav);

  /* the window's Minimise button goes to the dock too (one minimised shape) */
  window.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest('.x-pop__tools [data-p="min"]');
    if (!b || !el() || !el().contains(b)) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    minimise();
  }, true);

  /* the dock follows the video's play state at once, not only on the timer */
  var hooked = null;
  var hook = function () {
    var i = inst(); if (!i || hooked === i || !i.on) return;
    hooked = i; i.on("state", function () { if (docked()) paint(); });
  };
  P.on("open", function () { setTimeout(hook, 0); });
  if (phoneMq.addEventListener) phoneMq.addEventListener("change", function () { if (docked()) { P.place(); P.ensureOnScreen(); } });

  window.XDock14 = { minimise: minimise, expand: expand, isDocked: docked };
})();
