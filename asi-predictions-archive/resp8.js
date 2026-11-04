/* resp8.js: scroll-in reveal for sections and the library's cards that palette.js does not already reveal.
   Opacity plus a 6px rise (resp8.css 8C), once per element, skipped under prefers-reduced-motion.
   Anything already on screen when marked is left alone, so nothing blinks. No timers, no rotating content. */
(function () {
  "use strict";
  var doc = document;
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var SEL = ".main > .section, .main > section.section, .cards > div, .photo-card, .step, .checklist > li, .timeline > li, .breakdown, .compare, .table-wrap, .main .callout:not(.hero .callout), .aside, figure.band";
  var SKIP = ".hero, .nav, .foot, .x-sp, .x-rc, .x-rb, .x-rh, [role='dialog']";
  var seen = typeof WeakSet === "function" ? new WeakSet() : null;

  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add("is-in");
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });

  var mark = function (el) {
    if (seen && seen.has(el)) return;
    if (seen) seen.add(el);
    if (el.matches(SKIP) || el.closest(".hero, .nav, .foot, .x-sp, [role='dialog']")) return;
    /* nested inside something that already reveals: let the outer one carry it */
    if (el.parentElement && el.parentElement.closest(".x-rv:not(.is-in), .x-rc:not(.is-in), .x-rb:not(.is-in)")) return;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) { /* hidden route: wait until it is shown */ if (seen) seen.delete(el); return; }
    if (r.top < innerHeight && r.bottom > 0) return;
    el.classList.add("x-rv");
    io.observe(el);
  };
  var scan = function (root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches(SEL)) mark(root);
    Array.prototype.forEach.call(root.querySelectorAll(SEL), mark);
  };

  var go = function () { scan(doc.body); };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", go); else go();
  /* routes and late-rendered content (person pages, tracker, history, Ask, Learn) */
  window.addEventListener("hashchange", function () { requestAnimationFrame(go); });
  if ("MutationObserver" in window) {
    var pend = [], queued = false;
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) for (var j = 0; j < list[i].addedNodes.length; j++) {
        var n = list[i].addedNodes[j]; if (n.nodeType === 1) pend.push(n);
      }
      if (queued || !pend.length) return; queued = true;
      requestAnimationFrame(function () { queued = false; var p = pend; pend = []; p.forEach(function (n) { if (n.isConnected) scan(n); }); });
    }).observe(doc.body, { childList: true, subtree: true });
  }
})();
