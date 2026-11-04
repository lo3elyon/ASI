/* fix28: live-QA fixes, add-only, loaded after fix27b.js. No timers that repeat, no observers.
   1. Media filter chips. The Watched chip (fix25) is now driven from one window-capture click handler: it cycles
      Watched → Watched only → Hide watched → Watched, refilters through ArchiveTheater.refilter() (a throw there can
      no longer leave the chip unpainted), and paints label, aria-pressed and data-state. fix25's own listener is
      not reached, so a click never counts twice. X25W.isDone can no longer throw inside theater.js's filter.
      Any Media filter chip whose press and release land on different nodes (the chip shrinks 3% under :active,
      the ripple, or a row moved by fix27b's scroll correction) gets the click retargeted by the browser to the
      common ancestor, the row, and nothing toggled: a click on a non-control ancestor of the chip pressed in the
      same gesture (within 12 px, 1.2 s) is handed to that chip.
   2. Ctrl/⌘K palette: with a query typed, the first option is "Search everything for “<query>”", which closes the
      palette and opens #/search?q=<query>. Arrow keys, Enter, hover and click keep working for every other option. */
(function () {
  "use strict";
  var doc = document, W = window;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* =========== 1. Media filter chips =========== */
  var TH = W.ArchiveTheater, host = doc.getElementById("theater");
  if (TH && TH.filters && host) {
    var CTRL = "[data-tf],[data-tkind],[data-tera],[data-tdec],#ttClear,#ttReset,#ttPersonClear,.x25-wf";
    var WF = ["Watched", "Watched only", "Hide watched"];
    var AL = ["Watched filter: off. Press to show only watched talks", "Watched filter: watched only. Press to hide watched talks", "Watched filter: hiding watched talks. Press to show all"];

    /* the filter never throws on one odd stored record */
    if (W.X25W && typeof X25W.isDone === "function" && !X25W.__f28) {
      var isDone0 = X25W.isDone;
      X25W.isDone = function (id) { try { return !!isDone0(id); } catch (e) { return false; } };
      X25W.__f28 = true;
    }

    var paintW = function (chip) {
      var s = TH.filters.w || 0;
      chip.setAttribute("data-state", String(s));
      chip.setAttribute("aria-pressed", String(s > 0));
      chip.setAttribute("aria-label", AL[s]);
      var lab = null;
      for (var i = 0; i < chip.children.length; i++) { var k = chip.children[i]; if (k.tagName === "SPAN" && !k.classList.contains("x-ripple")) { lab = k; break; } }
      if (lab) { if (lab.textContent !== WF[s]) lab.textContent = WF[s]; }
      else chip.appendChild(doc.createElement("span")).textContent = WF[s];
      var cl = doc.getElementById("ttClear"); if (cl && s) cl.hidden = false;
    };
    var cycleW = function (chip) {
      TH.filters.w = ((TH.filters.w || 0) + 1) % 3;
      try { TH.refilter(); } catch (e) { try { console.error("[fix28] refilter failed", e); } catch (x) {} }
      paintW(chip);
    };

    var press = null;
    var down = function (e) {
      var c = e.target && e.target.closest ? e.target.closest(CTRL) : null;
      press = c && host.contains(c) ? { c: c, x: e.clientX || 0, y: e.clientY || 0, at: Date.now() } : null;
    };
    W.addEventListener("pointerdown", down, { capture: true, passive: true });
    W.addEventListener("mousedown", function (e) { if (!press || Date.now() - press.at > 300) down(e); }, { capture: true, passive: true });

    W.addEventListener("click", function (e) {
      var t = e.target; if (!t || !t.closest || e.button) return;
      var c = t.closest(CTRL);
      if (c && !host.contains(c)) c = null;
      if (!c) {
        /* the click went to the row because press and release fell on different nodes: give it to the pressed chip */
        var p = press; press = null;
        if (!p || !p.c.isConnected || Date.now() - p.at > 1200 || t === p.c || !t.contains(p.c)) return;
        if (Math.abs((e.clientX || 0) - p.x) > 12 || Math.abs((e.clientY || 0) - p.y) > 12) return;
        e.preventDefault(); e.stopImmediatePropagation();
        p.c.click(); /* the same path as a direct click: fix27b keeps the row, theater.js or the handler below filters */
        return;
      }
      press = null;
      if (c.classList.contains("x25-wf")) {
        e.preventDefault(); e.stopImmediatePropagation();
        cycleW(c);
      }
    }, true);

    var wf = host.querySelector(".x25-wf"); if (wf) paintW(wf);
  }

  /* =========== 2. palette: "Search everything for …" =========== */
  var dlg = doc.querySelector("dialog.x-cp"), inp = doc.getElementById("cpQ"), list = doc.getElementById("cpList");
  var ih = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  if (dlg && inp && list && ih && ih.set && !list.__f28) {
    list.__f28 = true;
    var mine = function () { return list.querySelector(".x28-all"); };
    var opts = function () { return list.querySelectorAll('[role="option"]'); };
    var pick = function (i) {
      var o = opts(), prev = list.querySelector('[aria-selected="true"]');
      if (prev) prev.setAttribute("aria-selected", "false");
      var el = o[i]; if (!el) { inp.removeAttribute("aria-activedescendant"); return; }
      el.setAttribute("aria-selected", "true");
      inp.setAttribute("aria-activedescendant", el.id);
      try { el.scrollIntoView({ block: "nearest" }); } catch (e) {}
    };
    var row = function (q) {
      return '<div role="group" class="x-cp__grp-all" aria-label="Search page"><div class="x-cp__o x28-all" role="option" aria-selected="false">' +
        "<b>Search everything for “" + esc(q) + "”</b><small>Every match on the search page</small>" +
        '<span class="x-cp__k">Search</span></div></div>';
    };
    /* palette.js renders by setting this list's innerHTML, then numbers every option and selects the first */
    Object.defineProperty(list, "innerHTML", {
      configurable: true,
      get: function () { return ih.get.call(this); },
      set: function (v) {
        var q = inp.value.trim();
        ih.set.call(this, q ? row(q) + v : v);
        if (q) Promise.resolve().then(function () { if (mine() && !list.querySelector('[aria-selected="true"]')) pick(0); });
      }
    });
    var searchAll = function () {
      var q = inp.value.trim(); if (!q) return;
      if (dlg.open) dlg.close();
      if (W.XSearch26 && XSearch26.open) XSearch26.open(q);
      else location.hash = "#/search?q=" + encodeURIComponent(q).replace(/%20/g, "+");
    };
    /* clicks: the search row here; for the rest, palette.js's own handler with the index it expects */
    dlg.addEventListener("click", function (e) {
      var o = e.target && e.target.closest ? e.target.closest(".x-cp__o") : null;
      if (!o || !list.contains(o) || !mine()) return;
      if (o.classList.contains("x28-all")) { e.preventDefault(); e.stopImmediatePropagation(); searchAll(); return; }
      var k = [].indexOf.call(opts(), o), keep = o.getAttribute("data-i");
      o.setAttribute("data-i", String(k - 1));
      setTimeout(function () { if (o.isConnected && keep != null) o.setAttribute("data-i", keep); }, 0);
    }, true);
    /* keys: run before the input's own handler while the search row is listed */
    dlg.addEventListener("keydown", function (e) {
      if (e.target !== inp || !mine() || e.isComposing) return;
      var o = opts(), n = o.length, cur = [].indexOf.call(o, list.querySelector('[aria-selected="true"]'));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); e.stopImmediatePropagation();
        if (n) pick(e.key === "ArrowDown" ? (cur + 1) % n : (cur - 1 + n) % n);
      } else if (e.key === "Enter") {
        e.preventDefault(); e.stopImmediatePropagation();
        var el = o[cur];
        if (!el || el.classList.contains("x28-all")) searchAll();
        else el.click();
      }
    }, true);
  }
})();
