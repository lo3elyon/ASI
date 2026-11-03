/* One shared jump: XGoTo(sectionId | "#id" | element, offset | { offset, block: "start" | "center", push, ms }).
   It scrolls the target into place at once (scroll-margin-top respected), then keeps it there while the
   layout settles: a ResizeObserver on <body> re-aligns the target for up to 1.5 s, and any wheel, touch,
   key or pointer press by the reader ends the guard at once. Every nav pill, footer link, hero button,
   palette jump, hash load and Back goes through here. Corrections use behavior "auto". */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var J = window.XJump || (window.XJump = { active: false, _f: [], onEnd: function (f) { this._f.push(f); } });
  var GUARD_MS = 1500;
  var cur = null, lastCall = 0;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  var resolve = function (t) {
    if (!t) return null;
    if (typeof t === "string") {
      var id = t.charAt(0) === "#" ? t.slice(1) : t;
      try { id = decodeURIComponent(id); } catch (e) {}
      return id ? doc.getElementById(id) : null;
    }
    return t.nodeType === 1 ? t : null;
  };
  var mainEl = function () { return doc.querySelector("main.main"); };
  var mainShown = function () { var m = mainEl(); return !!m && !m.hidden; };
  var marginOf = function (el) { return parseFloat(getComputedStyle(el).scrollMarginTop) || 0; };
  var wantY = function (c) {
    var r = c.el.getBoundingClientRect(), y;
    if (c.block === "center") y = window.scrollY + r.top + r.height / 2 - window.innerHeight / 2;
    else y = window.scrollY + r.top - marginOf(c.el) - c.offset;
    var max = Math.max(0, root.scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(max, Math.round(y)));
  };
  /* behavior "auto" with the page's smooth scroll-behavior switched off for the moment, so it lands instantly */
  var jump = function (y) {
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    try { window.scrollTo({ top: y, left: window.scrollX, behavior: "auto" }); } catch (e) { window.scrollTo(window.scrollX, y); }
    root.style.scrollBehavior = prev;
  };
  var align = function () {
    var c = cur;
    if (!c || !c.el.isConnected || !c.el.getClientRects().length) return;
    var y = wantY(c);
    if (Math.abs(y - window.scrollY) > 1) jump(y);
  };
  var stop = function () {
    var c = cur;
    if (!c) return;
    cur = null;
    clearTimeout(c.timer);
    cancelAnimationFrame(c.raf);
    if (c.ro) c.ro.disconnect();
    J.active = false;
    (J._f || []).forEach(function (f) { try { f(); } catch (e) {} });
  };

  var goTo = function (target, opts) {
    if (typeof opts === "number") opts = { offset: opts };
    opts = opts || {};
    var el = resolve(target);
    if (!el) return false;
    stop();
    lastCall = Date.now();
    var c = cur = { el: el, block: opts.block === "center" ? "center" : "start", offset: +opts.offset || 0 };
    if (opts.push && el.id) {
      var h = "#" + el.id;
      if (location.hash !== h) {
        try {
          var st = history.state && typeof history.state === "object" ? history.state : {}, ns = {};
          for (var k in st) ns[k] = st[k];
          ns.xgY = window.scrollY;
          history.replaceState(ns, "");
          history.pushState({ xgTo: el.id }, "", h);
        } catch (e) {}
      }
    }
    J.active = true;
    align();
    var settle = function () { if (cur !== c) return; cancelAnimationFrame(c.raf); align(); c.raf = requestAnimationFrame(align); };
    if ("ResizeObserver" in window) {
      c.ro = new ResizeObserver(settle);
      c.ro.observe(doc.body);
      c.ro.observe(el);
    }
    c.raf = requestAnimationFrame(align);
    c.timer = setTimeout(stop, opts.ms || GUARD_MS);
    return true;
  };

  /* the reader takes over: stop guarding at once */
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) {
    window.addEventListener(t, function () { if (cur) stop(); }, { passive: true, capture: true });
  });

  /* same-page section links: the nav pills, footer links, hero button, stats and in-page anchors */
  var sectionTarget = function (href) {
    if (!href || href.charAt(0) !== "#" || href.length < 2 || href.charAt(1) === "/") return null;
    var el = resolve(href);
    return el && el.closest("main.main") ? el : null;
  };
  doc.addEventListener("click", function (ev) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute("data-watch")) return;
    var el = sectionTarget(a.getAttribute("href"));
    /* while a person page covers the main page, the link changes the hash and people.js closes it, then jumps here */
    if (!el || !mainShown()) return;
    ev.preventDefault();
    goTo(el, { push: true });
  });

  /* browser Back / Forward between section jumps, and a hash typed into the address bar */
  var onNav = function () {
    /* popstate and hashchange both fire for one step; once a jump has been made for it (here, or by
       people.js returning to a person card), the second event leaves it alone */
    if (!mainShown() || (cur && Date.now() - lastCall < 150)) return;
    var h = location.hash;
    if (h && h.length > 1 && h.charAt(1) !== "/") { var el = sectionTarget(h); if (el) goTo(el); return; }
    var st = history.state;
    if ((!h || h === "#" || h === "#/") && st && typeof st.xgY === "number") { stop(); jump(st.xgY); }
  };
  window.addEventListener("popstate", onNav);
  window.addEventListener("hashchange", onNav);

  /* a link straight to a section: land once the page has built, and again when images finish, unless the reader has scrolled */
  var touched = false;
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) {
    window.addEventListener(t, function () { touched = true; }, { passive: true, capture: true, once: true });
  });
  var hashLoad = function () {
    if (touched || !mainShown()) return;
    var el = sectionTarget(location.hash);
    if (el) goTo(el);
  };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", hashLoad); else setTimeout(hashLoad, 0);
  if (doc.readyState !== "complete") window.addEventListener("load", hashLoad);

  goTo.stop = stop;
  goTo.active = function () { return !!cur; };
  window.XGoTo = goTo;
})();
