/* fix23.js: batch 23, loaded last (after fix22).
   1. The site / YouTube controls switch (title bar .f21-ctlb, in-video corner .f21-ctl, and the player's own
      native / siteplayer buttons) flips modes without minimising, in every window shape. A press on it opens a
      short hold during which P.leaving() reports true, so every minimise path (dock14 outside click, scroll intent
      and minimise(), fix16 outside press) stands down. The same hold covers any press whose target is no longer
      connected (a target in the window's composedPath() is already treated as inside by dock14 and fix16).
      The switch's own click handlers stop propagation.
   2. "Start here: the classics" and the other Theater strips: a click opens the talk of the card whose slot is
      under the pointer, read from that card's own data-tv at click time; if anything else ends up loaded, the
      clicked talk is loaded instead. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer, doc = document;
  if (!AP) return;
  var P = AP._dock || null;
  var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };

  /* ================= 1. the controls switch never minimises ================= */
  var SW = '.f21-ctlb, .f21-ctl, [data-a="native"], [data-a="siteplayer"]';
  var holdUntil = 0;
  var hold = function (ms) { holdUntil = Math.max(holdUntil, now() + ms); };
  var held = function () { return now() < holdUntil; };
  if (P && typeof P.leaving === "function" && !P.leaving.__f23) {
    var lv0 = P.leaving;
    P.leaving = function () { return held() || lv0.apply(this, arguments); };
    P.leaving.__f23 = true;
  }
  var popEl = function () { return P && P.el ? P.el() : doc.querySelector(".x-pop"); };
  var popLive = function () { var e = popEl(); return !!(e && !e.hidden && P && P.isOpen && P.isOpen()); };
  var inPath = function (ev, node) {
    if (!node) return false;
    var path = ev.composedPath ? ev.composedPath() : [];
    for (var i = 0; i < path.length; i++) if (path[i] === node) return true;
    return false;
  };
  var screenOf = function (ev) {
    var t = ev.target;
    if (!t || t.nodeType !== 1 || !t.closest) return null;
    return t.closest(SW);
  };
  var guardPress = function (ev) {
    if (!popLive() && !screenOf(ev)) return;
    var t = ev.target;
    var sw = screenOf(ev);
    if (sw && (sw.closest(".x-pop") || sw.closest(".x-ap"))) { hold(900); return; }
    if (!popLive()) return;
    /* a target rebuilt away under the press: never an outside click (inside targets are already ignored) */
    if (t && t.isConnected === false) hold(400);
  };
  ["pointerdown", "mousedown", "touchstart", "pointerup", "mouseup", "touchend", "click"].forEach(function (type) {
    window.addEventListener(type, guardPress, { capture: true, passive: true });
  });
  /* the switch's own click never travels on to a document-level closer (belt and braces beside fix21's handlers) */
  var stopOn = function (b) {
    if (!b || b.__f23) return; b.__f23 = true;
    b.addEventListener("click", function (ev) { hold(900); ev.stopPropagation(); });
  };
  var scanSw = function (root) { (root || doc).querySelectorAll(".f21-ctlb, .f21-ctl").forEach(stopOn); };
  if (AP.onCreate) AP.onCreate(function (inst) {
    if (!inst || !inst.root) return;
    scanSw(inst.root); var pe = inst.root.closest(".x-pop"); if (pe) scanSw(pe);
    setTimeout(function () { scanSw(inst.root); var p2 = inst.root.closest(".x-pop"); if (p2) scanSw(p2); }, 400);
  });
  /* the title-bar button is added once the window exists; catch it the first time it is pressed or focused */
  doc.addEventListener("focusin", function (ev) { var b = ev.target && ev.target.closest && ev.target.closest(".f21-ctlb, .f21-ctl"); if (b) stopOn(b); }, true);
  window.addEventListener("pointerover", function (ev) { var b = ev.target && ev.target.closest && ev.target.closest(".f21-ctlb, .f21-ctl"); if (b) stopOn(b); }, { capture: true, passive: true });

  /* ================= 2. strip cards open their own talk ================= */
  var STRIP = ".x-tt__strip";
  var down = null;
  window.addEventListener("pointerdown", function (ev) {
    var s = ev.target && ev.target.closest && ev.target.closest(STRIP);
    down = s ? { x: ev.clientX, y: ev.clientY, s: s } : null;
  }, { capture: true, passive: true });
  var slotCard = function (strip, x, y) {
    var slots = strip.children;
    for (var i = 0; i < slots.length; i++) {
      var r = slots[i].getBoundingClientRect();
      if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        var c = slots[i].matches(".x-vc[data-tv]") ? slots[i] : slots[i].querySelector(".x-vc[data-tv]");
        if (c) return c;
      }
    }
    return null;
  };
  var curIds = function () {
    var out = [];
    try { var th = window.ArchiveTheater && ArchiveTheater.player, c = th && th.current && th.current(); if (c) out.push(String(c.id)); } catch (e) {}
    try { var pi = P && P.inst && P.inst(), c2 = pi && pi.current && pi.current(); if (c2) out.push(String(c2.id)); } catch (e) {}
    return out;
  };
  var verify = function (id, tries) {
    setTimeout(function () {
      if (curIds().indexOf(id) >= 0) return;
      if (tries > 0) { verify(id, tries - 1); return; }
      try { console.debug("[strip] loaded talk did not match the card; loading " + id); } catch (e) {}
      if (window.ArchiveTheater && ArchiveTheater.select) ArchiveTheater.select(id, { card: true });
    }, 200);
  };
  window.addEventListener("click", function (ev) {
    var t = ev.target; if (!t || !t.closest || ev.button) return;
    var strip = t.closest(STRIP); if (!strip) return;
    var hit = t.closest(".x-vc[data-tv]");
    if (ev.detail > 0 && ev.clientX + ev.clientY > 0) {
      var d = down; down = null;
      if (d && d.s === strip && (Math.abs(ev.clientX - d.x) > 5 || Math.abs(ev.clientY - d.y) > 5)) return; /* a drag: polish.js eats it */
      var at = slotCard(strip, ev.clientX, ev.clientY);
      if (at && at !== hit) {
        /* the card under the pointer, not a neighbour or the strip itself */
        ev.preventDefault(); ev.stopImmediatePropagation();
        at.click();
        return;
      }
    }
    if (hit) verify(String(hit.getAttribute("data-tv")), 2);
  }, true);
})();
