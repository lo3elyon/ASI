/* icons37.js: two clear, different icons (owner 2026-11-05).
   1. "Watch on YouTube" (opens youtube.com): the real red YouTube logo with a red glow.
   2. "YouTube controls" switch (stays in the page, swaps to YouTube's own player bar): a player frame with a
      control bar and a red progress line, so the two never look alike. Add-only: swaps the old shared svg. */
(function () {
  "use strict";
  var doc = document;
  var WATCH = '<svg class="y37-ic y37-ic--watch" viewBox="0 0 28 20" width="22" height="16" aria-hidden="true"><path fill="#FF0000" d="M27.4 3.1A3.5 3.5 0 0 0 25 .6C22.8 0 14 0 14 0S5.2 0 3 .6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9A3.5 3.5 0 0 0 3 19.4c2.2.6 11 .6 11 .6s8.8 0 11-.6a3.5 3.5 0 0 0 2.4-2.5c.6-2.2.6-6.9.6-6.9s0-4.7-.6-6.9z"/><path fill="#fff" d="M11.2 14.3V5.7l7.3 4.3z"/></svg>';
  var CTRL = '<svg class="y37-ic y37-ic--ctrl" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="3.5" width="19" height="17" rx="3"/><path d="M5.5 17.2h13" stroke-opacity=".45"/><path d="M5.5 17.2h7" stroke="#FF3B30" stroke-width="2.6"/><circle cx="12.5" cy="17.2" r="2" fill="#FF3B30" stroke="none"/><path d="M10 7.6v5l4.2-2.5z" fill="currentColor" stroke="none"/></svg>';
  var isOldYt = function (s) { var h = s.innerHTML; return /width="19"/.test(h) && /rx="4"/.test(h) && !s.classList.contains("y37-ic"); };
  var isWatch = function (el) {
    var a = el.closest('a[data-x="yt"], a[data-p="yt"], a[data-r="yt"], a[href*="youtube.com"], a[href*="youtu.be"]');
    return !!a;
  };
  var swap = function () {
    doc.querySelectorAll(".x-ap svg, .x-pop svg, .x-sx-nat svg, .x-dk svg, [data-a=\"native\"] svg, .f21-ctlb svg, a[data-x=\"yt\"] svg, a[data-p=\"yt\"] svg").forEach(function (s) {
      if (!isOldYt(s)) return;
      var host = s.parentNode; if (!host) return;
      var w = isWatch(s);
      var t = doc.createElement("span"); t.innerHTML = w ? WATCH : CTRL;
      host.replaceChild(t.firstChild, s);
      var b = host.closest("a, button") || host;
      b.classList.add(w ? "y37-watch" : "y37-ctrl");
      if (w) { b.setAttribute("title", "Watch on YouTube (opens youtube.com in a new tab)"); }
      else if (b.getAttribute("aria-pressed") !== "true") { b.setAttribute("title", "Switch to YouTube's own player controls, here in the page (Y)"); }
    });
    /* the text button "Watch on YouTube" gets the logo in front */
    doc.querySelectorAll('a.btn[data-r="yt"]').forEach(function (a) {
      if (a.querySelector(".y37-ic")) return;
      a.classList.add("y37-watch", "y37-watch--btn");
      a.insertAdjacentHTML("afterbegin", WATCH);
    });
  };
  var q = 0;
  var queue = function () { if (!q) q = requestAnimationFrame(function () { q = 0; try { swap(); } catch (e) {} }); };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", queue); else queue();
  new MutationObserver(function (recs) {
    for (var i = 0; i < recs.length; i++) if (recs[i].addedNodes.length) { queue(); return; }
  }).observe(doc.body || doc.documentElement, { childList: true, subtree: true });
})();
