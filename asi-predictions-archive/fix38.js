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
  /* batch 39: longer patience (6 s) for a cold Trust page, a drift check after landing (late layout above the row),
     and people with no reviewed row (data-based scores) open their score panel on the Trust scores board instead of
     leaving the visitor at the top of Trust. */
  var openPanel = function (id) {
    var t = doc.createElement("button"); t.type = "button"; t.setAttribute("data-t33", id); t.hidden = true;
    doc.body.appendChild(t); try { t.click(); } catch (e) {} t.remove();
  };
  var go = function () {
    closeDlg();
    var id = trustId(); if (!id) return;
    var my = ++token, t0 = Date.now(), fixed = 0, landed = 0;
    var step = function () {
      if (my !== token || trustId() !== id) return;
      var main = doc.querySelector("main.main"), sec = doc.getElementById("trust");
      var ready = main && !main.hidden && shown(sec) && !introOn();
      var list = doc.getElementById("trList"), row = doc.querySelector('#trList > li.x-tr-row[data-id="' + esc(id) + '"]');
      if (!ready || !list || !list.children.length) { if (Date.now() - t0 < 6000) setTimeout(step, 100); return; }
      if (!row) {
        /* no reviewed row: the Trust scores board (data-based scores) */
        var board = doc.getElementById("t33");
        if (!board) { if (Date.now() - t0 < 6000) setTimeout(step, 150); return; }
        var bt = board.getBoundingClientRect().top;
        if (bt < -board.offsetHeight + 80 || bt > innerHeight * 0.6) { var y = scrollY + bt - 80; try { scrollTo({ top: y, behavior: "auto" }); } catch (e) { scrollTo(0, y); } }
        openPanel(id);
        return;
      }
      var open = row.querySelector(".x-tr-dwrap:not([hidden])");
      var r = row.getBoundingClientRect(), ok = open && r.top > -40 && r.top < innerHeight * 0.55;
      if (!ok) {
        if (!open && window.XTrust && XTrust.open) { try { XTrust.open(id); } catch (e) {} }
        else if (open) { var y2 = scrollY + r.top - 90; try { scrollTo({ top: y2, behavior: "auto" }); } catch (e) { scrollTo(0, y2); } }
        fixed++; landed = 0;
      } else landed++;
      /* keep looking for a moment after landing, in case something above the row finishes loading and pushes it */
      if (fixed < 6 && landed < 3 && Date.now() - t0 < 6000) setTimeout(step, ok ? 500 : 450);
    };
    setTimeout(step, 120);
  };
  /* clicking a trust link whose route is already the current one still opens it */
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#/trust/"]');
    if (a && a.getAttribute("href") === location.hash) setTimeout(go, 0);
  });
  /* every person page gets one Full trust record (reviewed people already have it on their Trust score card) */
  var addRecord = function () {
    var view = doc.getElementById("person-view"); if (!view || view.hidden) return;
    var m = /^#\/person\/([^/?#]+)/.exec(location.hash || ""); if (!m) return;
    if (view.querySelector('.x25-trcard a[href^="#/trust/"]')) { view.querySelectorAll(".f38-rec").forEach(function (x) { x.remove(); }); return; }
    var card = view.querySelector(".t33-pcard"); if (!card || card.querySelector(".f38-rec")) return;
    var b = card.querySelector("button[data-t33]");
    var a = doc.createElement("a"); a.className = "btn f38-rec"; a.href = "#/trust/" + m[1]; a.textContent = "Full trust record";
    if (b) b.after(a); else card.appendChild(a);
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
  new MutationObserver(function (rs) { for (var i = 0; i < rs.length; i++) if (rs[i].addedNodes.length) { if (!q) q = requestAnimationFrame(function () { q = 0; badge(); addRecord(); }); return; } })
    .observe(doc.body || doc.documentElement, { childList: true, subtree: true });
  badge();
})();
