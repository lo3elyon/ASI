/* boot.js: a reload or deep link opens straight on its page or section. The head script added "x-boot" (body
   hidden) when the address has a hash. Loaded last: on DOMContentLoaded the routers (pages.js, people.js) have run,
   so this makes sure a #/ page is drawn, lands a #section instantly, then shows the page two frames later.
   Fail-safes: the cover lifts after 2.5 s, or on any script error. */
(function () {
  "use strict";
  var doc = document, de = doc.documentElement;
  var PAGE = /^#\/(topics|topic|era|quotes|timeline|compare|stats|about|org|ask)(\/|$)/;
  var PERSON = /^#\/person\//;
  var lifted = false, touched = false;

  var lift = function () {
    if (lifted) return;
    lifted = true;
    de.classList.remove("x-boot");
  };
  setTimeout(lift, 2500);
  window.addEventListener("error", lift);
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) {
    window.addEventListener(t, function () { touched = true; }, { passive: true, capture: true, once: true });
  });

  var main = function () { return doc.querySelector("main.main"); };
  var sectionEl = function (h) {
    if (!h || h.length < 2 || h.charAt(1) === "/") return null;
    var id = h.slice(1);
    try { id = decodeURIComponent(id); } catch (e) {}
    var el = doc.getElementById(id);
    return el && el.closest("main.main") ? el : null;
  };
  var navOffset = function () {
    var n = doc.querySelector("header.nav");
    if (!n || !n.getClientRects().length) return 0;
    var p = getComputedStyle(n).position;
    if (p !== "sticky" && p !== "fixed") return 0;
    var b = n.getBoundingClientRect().bottom;
    return b > 0 && b < window.innerHeight / 2 ? b + 12 : 0;
  };
  /* land a section at the top, with no animation */
  var pin = function (el) {
    if (window.XGoTo) { window.XGoTo(el, { instant: true }); return; }
    var prev = de.style.scrollBehavior;
    de.style.scrollBehavior = "auto";
    var y = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - navOffset()));
    try { window.scrollTo({ top: y, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); }
    de.style.scrollBehavior = prev;
  };
  /* reveal-on-scroll items already on screen show at once, so the landed section is never blank */
  var showInView = function () {
    var vh = window.innerHeight;
    doc.querySelectorAll(".x-rv:not(.is-in), .x-rc:not(.is-in), .x-rb:not(.is-in), .x-rh:not(.is-in)").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh && r.width) el.classList.add("is-in");
    });
  };

  var boot = function () {
    var h = location.hash || "", m = main();
    try {
      if (PAGE.test(h)) {
        if (m && !m.hidden && window.XPagesRoute) window.XPagesRoute();
      } else if (PERSON.test(h)) {
        if (m && !m.hidden && window.XPeopleRoute) window.XPeopleRoute();
      } else {
        var el = sectionEl(h);
        if (el && m && !m.hidden) pin(el);
      }
      showInView();
    } catch (e) { lift(); }
    if (lifted) return;
    requestAnimationFrame(function () { requestAnimationFrame(lift); });
  };

  /* once images have loaded, the section is pinned again instantly, unless the reader has scrolled */
  var repin = function () {
    if (!touched) {
      var el = sectionEl(location.hash || ""), m = main();
      if (el && m && !m.hidden) { try { pin(el); } catch (e) {} }
    }
    setTimeout(function () { window.__xBootJump = false; }, 0);
  };

  /* transitions and entry animations stay off until the page has loaded and settled ("x-still", set in the head),
     so nothing fades or eases between colors while the first frames paint */
  var settle = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { de.classList.remove("x-still"); }); }); };
  if (doc.readyState === "complete") settle(); else window.addEventListener("load", settle);
  setTimeout(function () { de.classList.remove("x-still"); }, 4000);

  if (!de.classList.contains("x-boot")) { window.__xBootJump = false; return; }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
  if (doc.readyState === "complete") repin(); else window.addEventListener("load", repin);
})();
