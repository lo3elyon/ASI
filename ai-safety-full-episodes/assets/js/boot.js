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
})();
