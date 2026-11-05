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
