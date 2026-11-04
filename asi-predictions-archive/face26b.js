/* face26b: add-only companion to face26.js. The site ships as one HTML file, so a face-<id>.jpg named only in
   people.json or face26.js would not travel with it. The 13 files are named statically in #x-logo-imgs (index.html);
   this maps each bare "face-<id>.jpg" in XLogo.face's candidate list to that shipped image's src. Nothing else changes:
   the order of candidates, the data-fb chain and the onerror initials stay as they are. */
(function () {
  "use strict";
  var X = window.XLogo;
  if (!X || typeof X.face !== "function") return;
  var box = document.getElementById("x-logo-imgs"), memo = {};
  var resolve = function (s) {
    if (typeof s !== "string" || !/^face-[a-z0-9-]+\.jpg$/.test(s)) return s;
    if (!(s in memo)) { var im = box && box.querySelector('img[data-f="' + s + '"]'); memo[s] = im ? im.getAttribute("src") || s : s; }
    return memo[s];
  };
  var orig = X.face;
  X.face = function () {
    var r = orig.apply(this, arguments);
    try {
      if (r && r.srcs && r.srcs.length) {
        var seen = {};
        r.srcs = r.srcs.map(resolve).filter(function (s) { if (seen[s]) return false; seen[s] = 1; return true; });
      }
    } catch (e) {}
    return r;
  };
})();
