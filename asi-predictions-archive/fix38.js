/* fix38.js (owner 2026-11-06): Full profile and Full trust record.
   1. Every Trust board row shows one Full profile button (the one at the top of the row); the copy beside Compare is
      hidden in fix38.css. A small "Full profile" badge marks every tile that has a person page.
   2. Full trust record (#/trust/<id>) always lands on that person's open row, even when the page-change intro or the
      person page was still on screen when the old route handler ran. Retries for up to 3 s, then stops.
   3. Clicking Full profile inside the trust panel (t33 dialog) closes the panel first, so the person page is not left
      under an open overlay. Any route change also closes it. */
(function () {
  "use strict";
  var doc = document;
  var closeDlg = function () { var d = doc.getElementById("t33dlg"); if (d && d.classList.contains("is-on")) { var x = d.querySelector("[data-t33close]"); if (x) x.click(); else d.classList.remove("is-on"); } };
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('#t33dlg a[href^="#/"]');
    if (a) closeDlg();
  }, true);

  var token = 0;
  var trustId = function () { var m = /^#\/trust\/([^/?#]+)\/?$/.exec(location.hash || ""); return m ? decodeURIComponent(m[1]) : ""; };
  var esc = function (s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"'); };
  var shown = function (el) { return !!(el && el.getClientRects().length && !el.closest("[hidden]")); };
  var introOn = function () { return !!doc.querySelector("#x-intro33.is-on, html.x-boot"); };
  var go = function () {
    closeDlg();
    var id = trustId(); if (!id) return;
    var my = ++token, t0 = Date.now(), fixed = 0;
    var step = function () {
      if (my !== token || trustId() !== id) return;
      var main = doc.querySelector("main.main"), sec = doc.getElementById("trust");
      var row = doc.querySelector('#trList > li.x-tr-row[data-id="' + esc(id) + '"]');
      var ready = main && !main.hidden && shown(sec) && !introOn();
      if (!ready || !row) { if (Date.now() - t0 < 3000) setTimeout(step, 100); return; }
      var open = row.querySelector(".x-tr-dwrap:not([hidden])");
      var r = row.getBoundingClientRect(), ok = open && r.top > -40 && r.top < innerHeight * 0.55;
      if (!ok && window.XTrust && XTrust.open) { try { XTrust.open(id); } catch (e) {} fixed++; }
      /* look again once the smooth scroll and any late layout have settled */
      if (fixed < 3 && Date.now() - t0 < 3000) setTimeout(step, ok ? 900 : 500);
    };
    setTimeout(step, 120);
  };
  window.addEventListener("hashchange", go);
  window.addEventListener("popstate", go);
  if (doc.readyState === "complete") go(); else window.addEventListener("load", go);
  window.addEventListener("hashchange", function () { if (!trustId()) closeDlg(); });

  /* badge: which board tiles have a full profile */
  var people = null;
  var ids = function () {
    if (people) return people;
    people = {};
    try { (JSON.parse((doc.getElementById("d-people") || {}).textContent || "[]") || []).forEach(function (p) { people[p.id] = 1; }); } catch (e) {}
    return people;
  };
  var badge = function () {
    var P = ids();
    doc.querySelectorAll(".t33-tile[data-t33]:not([data-f38])").forEach(function (b) {
      b.setAttribute("data-f38", "1");
      if (P[b.getAttribute("data-t33")]) { b.classList.add("f38-has"); b.insertAdjacentHTML("beforeend", '<span class="f38-pf" title="Has a full profile">Full profile</span>'); }
    });
  };
  var q = 0;
  new MutationObserver(function (rs) { for (var i = 0; i < rs.length; i++) if (rs[i].addedNodes.length) { if (!q) q = requestAnimationFrame(function () { q = 0; badge(); }); return; } })
    .observe(doc.body || doc.documentElement, { childList: true, subtree: true });
  badge();
})();
