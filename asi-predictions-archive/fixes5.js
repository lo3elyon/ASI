/* fixes5.js: the hero's Where to start tiles. The Three eras tile shows the three era photos (cloned from the page's
   hidden era images, so no file is loaded twice); the Kids' corner tile counts the cards the Learn hub drew.
   XHeroCheck() reports whether the start card sits fully inside the hero (XAudit() includes it; fixes6.css sizes the card). */
(function () {
  "use strict";
  var doc = document;
  var strip = doc.querySelector("[data-st-eras]");
  if (strip && !strip.firstChild) {
    ["early", "deep", "post"].forEach(function (k) {
      var src = doc.querySelector('#x-era-imgs img[data-era="' + k + '"]'); if (!src) return;
      var im = src.cloneNode(true);
      im.removeAttribute("loading"); im.alt = ""; im.removeAttribute("data-era");
      strip.appendChild(im);
    });
  }
  var kids = doc.querySelector("[data-st-kids]");
  if (kids) {
    var n = doc.querySelectorAll("#learn-root .x-ln__card").length;
    if (n) kids.textContent = n + " big ideas";
  }
  window.XHeroCheck = function () {
    var hero = doc.querySelector(".hero"), c = hero && hero.querySelector(".x-start");
    if (!c) return null;
    var h = hero.getBoundingClientRect(), r = c.getBoundingClientRect(), list = c.querySelector(".x-qs");
    var l = list ? list.getBoundingClientRect() : r;
    return {
      viewport: innerWidth + "×" + innerHeight, hero: Math.round(h.width) + "×" + Math.round(h.height),
      callout: Math.round(r.width) + "×" + Math.round(r.height),
      fitsInside: r.top >= h.top - 0.5 && r.bottom <= h.bottom + 0.5 && l.bottom <= h.bottom + 0.5 && r.left >= h.left - 0.5 && r.right <= h.right + 0.5,
      clippedBy: Math.max(0, Math.round(l.bottom - h.bottom))
    };
  };
})();
