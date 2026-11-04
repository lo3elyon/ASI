/* fix20: keep the whole gear menu inside the visible player so its last row can be reached. */
(function () {
  "use strict";
  var doc = document;
  var fit = function (m) {
    if (!m || m.hidden || !m.getClientRects().length) return;
    m.style.maxHeight = "";
    var r = m.getBoundingClientRect(), lim = window.innerHeight - 8, n = m.parentElement;
    while (n && n !== doc.body) {
      var cs = getComputedStyle(n);
      if (/(hidden|auto|scroll|clip)/.test(cs.overflowY + cs.overflow)) { var b = n.getBoundingClientRect().bottom - 8; if (b < lim) lim = b; }
      n = n.parentElement;
    }
    var ap = m.closest(".x-ap"), bar = ap && ap.querySelector(".x-ap__bar");
    if (bar) { var br = bar.getBoundingClientRect(); if (br.height && br.top > r.top + 40 && br.top - 6 < lim) lim = br.top - 6; }
    var top = Math.max(r.top, 8), h = Math.floor(lim - top);
    if (h > 80 && r.bottom > lim) { m.style.setProperty("max-height", h + "px", "important"); m.classList.add("f20-cap"); }
    end(m);
  };
  var end = function (m) { var at = m.scrollTop + m.clientHeight >= m.scrollHeight - 2; if (at !== m.hasAttribute("data-f20end")) m.toggleAttribute("data-f20end", at); };
  var all = function () { doc.querySelectorAll(".x-ap .x-apx-menu:not([hidden])").forEach(fit); };
  var later = function () { requestAnimationFrame(function () { all(); setTimeout(all, 120); setTimeout(all, 400); }); };
  doc.addEventListener("click", later, true);
  doc.addEventListener("keyup", later, true);
  window.addEventListener("resize", later);
  doc.addEventListener("scroll", function (e) { var t = e.target; if (t && t.classList && t.classList.contains("x-apx-menu")) end(t); }, true);
})();
