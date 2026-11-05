/* fix30.js: the Media stage was an empty black box (2026-11-05).
   theater.js hides the stage (#ttTop[hidden]) until a talk is picked, but .x-tt__top { display: grid } overrides the
   hidden attribute, so an empty player showed with nothing in it, and every card opened the pop-out window instead.
   Now the stage starts with the first "Start here" talk loaded as a poster only: nothing plays until Play is pressed,
   the page does not move, and cards picked while the stage is on screen load into it. */
(function () {
  "use strict";
  var tries = 0;
  var boot = function () {
    var T = window.ArchiveTheater, top = document.getElementById("ttTop"), rows = document.getElementById("ttRows");
    var first = rows && rows.querySelector("[data-tv]");
    if (!T || !top || !first) { if (++tries < 60) setTimeout(boot, 250); return; }
    if (!top.hidden || (T.player && T.player.current && T.player.current())) return;
    try { T.select(first.getAttribute("data-tv")); } catch (e) {}
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

/* fix30 part 2: picking a talk card, Next or Previous on Media never moves the page.
   QA saw the page jump ~720px after a card click, which pushed the stage off screen; Next then sent the playing video
   to the corner window. For 900ms after such a click the scroll position is put back, unless the reader scrolls,
   touches or presses a key themselves. */
(function () {
  "use strict";
  var hold = function () {
    var x = window.scrollX, y = window.scrollY, until = Date.now() + 900, stop = false;
    var quit = function () { stop = true; ["wheel", "touchstart", "keydown"].forEach(function (t) { window.removeEventListener(t, quit, true); }); };
    ["wheel", "touchstart", "keydown"].forEach(function (t) { window.addEventListener(t, quit, { capture: true, passive: true }); });
    var tick = function () {
      if (stop) return;
      if (document.documentElement.classList.contains("x-modal-open")) { quit(); return; }
      if (Math.abs(window.scrollY - y) > 1) { try { window.scrollTo({ left: x, top: y, behavior: "instant" }); } catch (e) { window.scrollTo(x, y); } }
      if (Date.now() < until) requestAnimationFrame(tick); else quit();
    };
    requestAnimationFrame(tick);
  };
  document.addEventListener("click", function (ev) {
    if (ev.button !== 0) return;
    var t = ev.target && ev.target.closest && ev.target.closest('[data-tv], #ttPlayer [data-a="next"], #ttPlayer [data-a="prev"]');
    if (!t || !t.closest("#ttTop, #ttRows, #library, .x-tt")) return;
    var top = document.getElementById("ttTop");
    if (!top || top.hidden) return;
    hold();
  }, true);
})();
