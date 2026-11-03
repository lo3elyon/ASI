/* Stable masonry: K fixed columns; each card goes, in sorted order, into the column whose
   estimated height is lowest (leftmost on a tie). Heights are estimated from data, so placement
   is deterministic and computed once. add() only appends; placed cards never move. The layout is
   redistributed only when K changes (debounced width check), never on image load. */
(function () {
  "use strict";
  var GAP = 14;
  var kFromWidth = function (w) { return w < 620 ? 1 : w < 940 ? 2 : w < 1300 ? 3 : 4; };
  var all = [];
  var ro = "ResizeObserver" in window ? new ResizeObserver(function (en) {
    en.forEach(function (e) { var m = e.target.__xmas; if (m) m.queue(); });
  }) : null;
  window.addEventListener("resize", function () { all.forEach(function (m) { m.queue(); }); }, { passive: true });

  window.XMasonry = function (el, opts) {
    opts = opts || {};
    var items = [], cols = [], hs = [], K = 0, W = -1, t = 0, dead = false;
    /* the content-box width: clientWidth minus horizontal padding */
    var contentW = function (n) {
      if (!n || !n.clientWidth) return 0;
      var cs = getComputedStyle(n);
      return Math.max(0, n.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0));
    };
    var widthOf = function () { return contentW(el) || contentW(el.parentNode); };
    var kOf = function (w) { if (w == null) w = widthOf(); return opts.k ? opts.k(w) : kFromWidth(w); };
    var gapOf = function () { var g = parseFloat(getComputedStyle(el).columnGap); return isNaN(g) ? GAP : g; };
    /* column width = (containerWidth - gap * (K - 1)) / K, floored so the columns never sum past 100% */
    var size = function (w) {
      W = w;
      el.style.setProperty("--x-k", K);
      var cw = K > 0 && w > 0 ? Math.max(0, Math.floor(((w - gapOf() * (K - 1)) / K) * 100) / 100) : 0;
      el.style.setProperty("--x-colw", cw + "px");
    };
    el.classList.add("x-mas");
    var build = function (k) {
      K = k; cols = []; hs = [];
      size(widthOf());
      el.textContent = "";
      for (var i = 0; i < k; i++) {
        var c = document.createElement("div");
        c.className = "x-mas__col";
        el.appendChild(c); cols.push(c); hs.push(0);
      }
    };
    var place = function (it) {
      var best = 0;
      for (var i = 1; i < K; i++) if (hs[i] < hs[best] - 1) best = i;
      cols[best].appendChild(it.node);
      hs[best] += it.h + GAP;
    };
    var api = {
      add: function (node, h) {
        if (!K || !cols.length || cols[0].parentNode !== el) build(Math.max(1, kOf()));
        var it = { node: node, h: Math.max(40, +h || 200) };
        items.push(it); place(it);
        return node;
      },
      reset: function () { items = []; build(Math.max(1, kOf())); },
      relayout: function (force) {
        if (dead) return;
        var w = widthOf(), k = Math.max(1, kOf(w));
        if (!force && k === K) { if (Math.abs(w - W) >= 0.5) size(w); return; }
        build(k);
        items.forEach(place);
      },
      /* debounced; does nothing unless the width or K actually changed (a card growing taller is ignored) */
      queue: function () {
        clearTimeout(t);
        t = setTimeout(function () {
          var w = widthOf();
          if (Math.abs(w - W) < 0.5 && Math.max(1, kOf(w)) === K) return;
          api.relayout(false);
        }, 150);
      },
      destroy: function () { dead = true; clearTimeout(t); if (ro) ro.unobserve(el); all.splice(all.indexOf(api), 1); el.__xmas = null; }
    };
    el.__xmas = api;
    all.push(api);
    if (ro) ro.observe(el);
    build(Math.max(1, kOf()));
    return api;
  };
  window.XMasonry.relayoutAll = function () { all.forEach(function (m) { m.relayout(false); }); };
  window.XMasonry.lines = function (s, per) { s = String(s || ""); return s ? Math.ceil(s.length / per) : 0; };
})();
