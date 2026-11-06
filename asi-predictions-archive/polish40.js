/* polish40.js: scroll-in reveal for Trust tiles, rows and person trust cards. Each element animates once; nothing
   moves on a timer and nothing changes position. */
(function () {
  "use strict";
  if (!("IntersectionObserver" in window)) return;
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SEL = ".t33-tile, #trList > li.x-tr-row, .t33-pcard__bars, .t33-org";
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (!e.isIntersecting) return; var el = e.target; io.unobserve(el); el.classList.add("f40-in"); el.classList.remove("f40-pre"); });
  }, { rootMargin: "0px 0px -6% 0px" });
  var scan = function () {
    document.querySelectorAll(SEL).forEach(function (el) {
      if (el.__f40) return; el.__f40 = 1;
      var r = el.getBoundingClientRect();
      /* already on screen when it appears: no fade, so a click never makes things flicker */
      if (RM || (r.top < innerHeight && r.bottom > 0)) { el.classList.add("f40-in"); return; }
      el.classList.add("f40-pre"); io.observe(el);
    });
  };
  var q = 0;
  new MutationObserver(function (rs) { for (var i = 0; i < rs.length; i++) if (rs[i].addedNodes.length) { if (!q) q = requestAnimationFrame(function () { q = 0; scan(); }); return; } })
    .observe(document.body || document.documentElement, { childList: true, subtree: true });
  scan();
})();
