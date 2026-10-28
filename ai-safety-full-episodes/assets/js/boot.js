/* AI Safety Full Episodes · boot: runs before first paint to apply theme, accent colour, reduced-motion and the first-visit splash. No inline scripts (CSP). */
(function () {
  "use strict";
  var d = document.documentElement;
  try {
    var t = localStorage.getItem("asfe:theme") || "system";
    var dark = t === "dark" || (t === "system" && !(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches));
    d.setAttribute("data-theme", dark ? "dark" : "light");
    d.setAttribute("data-theme-pref", t);
    var a = localStorage.getItem("asfe:accent");
    if (a && /^[a-z]{3,10}$/.test(a)) d.setAttribute("data-accent", a);
    var pv = localStorage.getItem("asfe:paletteVars"), pal = localStorage.getItem("asfe:palette");
    if (pv) { var o = JSON.parse(pv); for (var k in o.vars) if (/^--[a-z0-9-]+$/.test(k)) d.style.setProperty(k, o.vars[k]); if (o.mode) d.setAttribute("data-theme", o.mode); if (pal && /^[a-z-]{3,24}$/.test(pal)) d.setAttribute("data-palette", pal); }
    if (!localStorage.getItem("asfe:seen")) d.classList.add("first");
  } catch (e) {}
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) d.classList.add("rm");
  /* route check before first paint: on a reload of #/history (or any other page) the pre-rendered Home stays hidden and a
   * skeleton of the target page shows instead, until the router has drawn it (app.js removes html.rt). Home and deep links
   * (#ep=…) keep the pre-rendered Home. */
  try {
    var m = (location.hash || "").replace(/^#\/?/, "").match(/^([a-z]+)/);
    var V = { browse: 1, months: 1, speakers: 1, speaker: 1, insights: 1, history: 1, recent: 1, explore: 1, queue: 1, profile: 1, notes: 1, about: 1, watched: 1, playlists: 1, playlist: 1, wrapped: 1 };
    if (m && V[m[1]]) { d.classList.add("rt"); d.setAttribute("data-rt", m[1] === "playlist" ? "playlists" : m[1]); }
  } catch (e) {}
  /* background choice before first paint (bg.js draws it) */
  try {
    var bg = localStorage.getItem("asfe:bg");
    if (bg && /^[a-z0-9-]{2,24}$/.test(bg)) d.setAttribute("data-bg", bg);
  } catch (e) {}
})();
