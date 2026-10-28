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
  /* look and feel before first paint: font pairing + text size, motion, density (prefs.js owns the controls) */
  try {
    var F = { grotesk: ["Inter", "Space Grotesk", "Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700"], sora: ["DM Sans", "Sora", "Sora:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700"],
      jakarta: ["Plus Jakarta Sans", "Plus Jakarta Sans", "Plus+Jakarta+Sans:wght@400;500;600;700;800"], outfit: ["Inter", "Outfit", "Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700"],
      plex: ["IBM Plex Sans", "IBM Plex Sans", "IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600", "IBM Plex Mono"], editorial: ["Inter", "Fraunces", "Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600;700"],
      playfair: ["Source Sans 3", "Playfair Display", "Playfair+Display:wght@600;700;800&family=Source+Sans+3:wght@400;500;600;700"], atkinson: ["Atkinson Hyperlegible", "Atkinson Hyperlegible", "Atkinson+Hyperlegible:wght@400;700"],
      mono: ["IBM Plex Sans", "JetBrains Mono", "JetBrains+Mono:wght@500;700;800&family=IBM+Plex+Sans:wght@400;500;600;700"] };
    var fid = localStorage.getItem("asfe:font"), f = fid && F[fid];
    if (f) {
      var sans = ', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', serif = ', Georgia, "Times New Roman", serif', mono = ', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      var st = function (n) { return '"' + n + '"' + (/Fraunces|Playfair/.test(n) ? serif : n === "JetBrains Mono" ? mono : sans); };
      d.setAttribute("data-font", fid); d.style.setProperty("--font", st(f[0])); d.style.setProperty("--head", st(f[1])); d.style.setProperty("--mono", '"' + (f[3] || "JetBrains Mono") + '"' + mono);
      var l = document.createElement("link"); l.id = "font-" + fid; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=" + f[2] + "&family=JetBrains+Mono:wght@500;700&display=swap"; document.head.appendChild(l);
    }
    var fs = Number(localStorage.getItem("asfe:fontScale")); if (fs >= 0.85 && fs <= 1.3) d.style.setProperty("--fs", String(fs));
    var mo = localStorage.getItem("asfe:motion"); if (mo === "reduced") d.classList.add("rm"); if (mo === "full") d.classList.remove("rm"); if (mo) d.setAttribute("data-motion", mo);
    var de = localStorage.getItem("asfe:density"); if (de === "compact" || de === "spacious") d.setAttribute("data-density", de);
    if (localStorage.getItem("asfe:hoverFx") === "0") d.classList.add("no-hoverfx");
  } catch (e) {}
  /* background choice before first paint (bg.js draws it) */
  try {
    var bg = localStorage.getItem("asfe:bg");
    if (bg && /^[a-z0-9-]{2,24}$/.test(bg)) d.setAttribute("data-bg", bg);
  } catch (e) {}
})();
