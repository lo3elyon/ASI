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
    var items = [], cols = [], hs = [], K = 0, t = 0, dead = false;
    var kOf = function () { var w = el.clientWidth || (el.parentNode && el.parentNode.clientWidth) || 0; return opts.k ? opts.k(w) : kFromWidth(w); };
    el.classList.add("x-mas");
    var build = function (k) {
      K = k; cols = []; hs = [];
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
        var k = Math.max(1, kOf());
        if (!force && k === K) return;
        build(k);
        items.forEach(place);
      },
      queue: function () { clearTimeout(t); t = setTimeout(function () { api.relayout(false); }, 150); },
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
