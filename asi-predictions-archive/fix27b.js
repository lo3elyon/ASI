/* fix27b: live-QA fixes, add-only, loaded after fix27.js. No timers that repeat, no observers.
   1. Search → page: a result that opens a page (#/person/…, #/trust/…) is routed in the same task as the click.
      The plain link left both routers waiting for the browser's popstate/hashchange, so until (and unless) they
      ran, the results stayed on screen over an address that already named the person. Now the address is pushed
      through history.pushState (search26 hides its view from its pushState hook) and the same two events the
      browser sends are sent at once, so people.js draws the person page before the next paint. After every route,
      a guard hides the results on any address that is not #/search and redraws a person page that did not draw.
      A person page opened from search gets "← Back" to those results (#/search?q=…), across person-to-person
      steps and a reload; opened from anywhere else it keeps people.js's own Back.
   2. Media filter chips (decade, type, era, show, watched, clear): the chip row stays where it was on screen.
      The grid keeps its height while the filter changes, the part of that reserve that lies below the viewport
      is released at once, and the rest as the reader scrolls it out of view, so nothing on screen moves on its
      own. If anything still moves the row (scroll anchoring, late layout), the scroll is put back, measured from
      the row itself, now and on the next two frames, unless the reader scrolls first. */
(function () {
  "use strict";
  var doc = document, W = window;
  var jump = function (y) { try { W.scrollTo({ top: y, left: 0, behavior: "instant" }); } catch (e) { W.scrollTo(0, y); } };
  var copy = function (st) { var o = {}; if (st && typeof st === "object") for (var k in st) o[k] = st[k]; return o; };
  var plainClick = function (e) { return !(e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey); };

  /* =========== 1. search results → person page, and Back to the results =========== */
  var sv = doc.getElementById("x-search26"), pv = doc.getElementById("person-view");
  var isSearch = function (h) { return /^#\/search(\?|$)/.test(h || ""); };
  var isPerson = function (h) { return /^#\/person\/[^/?#]+/.test(h || ""); };
  var fromSearch = null, pendingFrom = null, onPerson = false;

  var mark = function (v) {
    var st = history.state;
    if (st && typeof st === "object" && st.s27from === v) return;
    var ns = copy(st); ns.s27from = v;
    try { history.replaceState(ns, ""); } catch (e) {}
  };
  var paintBack = function () {
    if (!pv || pv.hidden || !fromSearch) return;
    pv.querySelectorAll(".x-pv__top [data-back]").forEach(function (b) {
      if (b.getAttribute("href") !== fromSearch) b.setAttribute("href", fromSearch);
      b.setAttribute("aria-label", "Back to the search results");
    });
  };
  var settle = function () {
    var h = location.hash || "";
    if (isPerson(h)) {
      var st = history.state && typeof history.state === "object" ? history.state : {};
      if (pendingFrom) fromSearch = pendingFrom;
      else if (typeof st.s27from === "string") fromSearch = st.s27from;
      else if (!onPerson) fromSearch = null; /* person to person keeps the origin */
      pendingFrom = null;
      onPerson = true;
      if (fromSearch) mark(fromSearch);
    } else { onPerson = false; fromSearch = null; pendingFrom = null; }
    /* guard: the results never stay over another page, and a person address always shows its page */
    if (sv && !sv.hidden && !isSearch(h)) sv.hidden = true;
    if (isPerson(h) && pv && (pv.hidden || !pv.firstElementChild) && W.XPeopleRoute) { try { W.XPeopleRoute(); } catch (e) {} }
    paintBack();
  };
  /* registered after people.js and search26.js, so this runs once both have routed */
  W.addEventListener("hashchange", settle);
  W.addEventListener("popstate", settle);

  var fire = function (oldURL) {
    var st = history.state, pe, he;
    try { pe = new PopStateEvent("popstate", { state: st }); } catch (e) { pe = doc.createEvent("Event"); pe.initEvent("popstate", false, false); }
    try { he = new HashChangeEvent("hashchange", { oldURL: oldURL, newURL: location.href }); } catch (e) { he = doc.createEvent("Event"); he.initEvent("hashchange", false, false); }
    W.dispatchEvent(pe);
    W.dispatchEvent(he);
  };
  if (sv) doc.addEventListener("click", function (e) {
    if (!plainClick(e)) return;
    var a = e.target && e.target.closest ? e.target.closest("a.x-s26-hit") : null;
    if (!a || !sv.contains(a) || a.hasAttribute("data-watch") || a.hasAttribute("data-s26-go")) return;
    var href = a.getAttribute("href") || "";
    if (!/^#\/./.test(href) || href === location.hash) return;
    e.preventDefault();
    pendingFrom = isSearch(location.hash) ? location.hash : null;
    var old = location.href;
    try { history.pushState(null, "", href); } catch (x) { location.hash = href; return; }
    fire(old);
  }, true);

  /* "← Back" on a person page opened from search: back through the history steps to the results */
  doc.addEventListener("click", function (e) {
    if (!fromSearch || !plainClick(e)) return;
    var b = e.target && e.target.closest ? e.target.closest("#person-view .x-pv__top [data-back]") : null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var st = history.state && typeof history.state === "object" ? history.state : {};
    if (typeof st.pvd === "number" && st.pvd > 0 && st.s27from === fromSearch) history.go(-st.pvd);
    else location.hash = fromSearch;
  }, true);

  if (isPerson(location.hash)) settle();
  else onPerson = false;

  /* =========== 2. Media filter chips keep their row in place =========== */
  var TH = W.ArchiveTheater, host = doc.getElementById("theater"), grid = doc.getElementById("ttGrid");
  if (TH && host && grid) {
    var CTRL = "[data-tf],[data-tkind],[data-tera],[data-tdec],#ttClear,#ttReset,#ttPersonClear,.x25-wf";
    var touched = 0, job = null;
    ["wheel", "touchstart", "keydown"].forEach(function (t) { W.addEventListener(t, function () { touched = Date.now(); }, { capture: true, passive: true }); });

    var natural = function () {
      var top = grid.getBoundingClientRect().top, b = top, k = grid.children;
      for (var i = 0; i < k.length; i++) { var r = k[i].getBoundingClientRect(); if (r.bottom > b) b = r.bottom; }
      return b - top;
    };
    /* release the reserve below the content, but only the part below the viewport's bottom edge */
    var trim = function () {
      if (!grid.style.minHeight) return;
      var r = grid.getBoundingClientRect(), extra = r.height - natural();
      if (extra <= 1) { grid.style.minHeight = ""; return; }
      var below = r.bottom - W.innerHeight;
      if (below <= 1) return;
      var cut = Math.min(extra, below);
      grid.style.minHeight = cut >= extra - 1 ? "" : Math.round(r.height - cut) + "px";
    };
    var put = function (j) {
      if (j !== job || touched > j.at || !j.row.isConnected) return;
      var d = j.row.getBoundingClientRect().top - j.top;
      if (Math.abs(d) > 1) jump(W.scrollY + d);
    };
    var settleRow = function (j) { put(j); trim(); put(j); };

    W.addEventListener("click", function (e) {
      var c = e.target && e.target.closest ? e.target.closest(CTRL) : null;
      if (!c || !host.contains(c)) return;
      var row = c.closest(".x-tools .x-row") || host.querySelector(".x-tools");
      if (!row) return;
      var h = grid.getBoundingClientRect().height;
      if (h > 0) grid.style.minHeight = Math.ceil(h) + "px";
      var j = job = { row: row, top: row.getBoundingClientRect().top, at: Date.now(), pend: true };
      /* fix26b may still toggle in its own 0 ms timeout, which was queued before this one */
      setTimeout(function () { settleRow(j); }, 0);
      requestAnimationFrame(function () { settleRow(j); requestAnimationFrame(function () { settleRow(j); }); });
    }, true);
    /* bubbling, after theater.js has filtered: put the row back before anything paints */
    W.addEventListener("click", function () { if (job && job.pend) { job.pend = false; settleRow(job); } });
    W.addEventListener("scroll", function () { if (grid.style.minHeight) trim(); }, { passive: true });
  }
})();
