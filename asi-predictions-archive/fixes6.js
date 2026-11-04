/* fixes6.js: duration badges drawn into every talk thumbnail wrapper by id (not only beside i.ytimg <img>s),
   and window.XAudit always present. Static: runs at load and when new cards are added, never on a timer. */
(function () {
  "use strict";
  var doc = document;

  /* ---------- 1. Badges by wrapper ---------- */
  /* each thumbnail wrapper, and where its talk id lives */
  var WRAPS = [
    [".x-lite", function (w) { var a = w.querySelector("[data-watch]"); return a && a.getAttribute("data-watch"); }],
    [".x-cw__th", function (w) { var c = w.closest("[data-cw-play]"); return c && c.getAttribute("data-cw-play"); }],
    [".x-hi__vid", function (w) { return w.getAttribute("data-watch"); }],
    [".x-whd__it > .x-dur-w", function (w) { var c = w.closest("[data-cw-play]"); return c && c.getAttribute("data-cw-play"); }],
    [".x-wh__row > .x-dur-w", function (w) { var c = w.closest("[data-wh-play]"); return c && c.getAttribute("data-wh-play"); }]
  ];
  var BADGE = ".x-dur, .x-th__len, .x-th16__len, .x-pop__qlen, .x-ap__updur";
  var RE = /(?:ytimg\.com\/vi(?:_webp)?|img\.youtube\.com\/vi)\/([^/?#)"']+)\//;
  var bgId = function (el) {
    var m = RE.exec((el.style && el.style.backgroundImage) || "") || RE.exec(el.getAttribute("poster") || "");
    return m ? m[1] : "";
  };
  var directBadge = function (w) {
    for (var i = 0; i < w.children.length; i++) if (w.children[i].matches(BADGE)) return w.children[i];
    return null;
  };
  var put = function (w, id) {
    if (!id || !window.XDur) return;
    var html = XDur.html(id); if (!html) return;
    /* any filled badge inside (including one in a snug wrapper made by the observer) counts; an empty one goes */
    var any = w.querySelector(BADGE);
    if (any && any.textContent.trim()) return;
    var b = directBadge(w); if (b) b.remove();
    w.classList.add("x-dur-host");
    w.insertAdjacentHTML("beforeend", html);
  };
  var ensure = function () {
    q = 0;
    WRAPS.forEach(function (p) {
      doc.querySelectorAll(p[0]).forEach(function (w) { try { put(w, p[1](w)); } catch (e) {} });
    });
    /* background-image or poster thumbnails anywhere */
    doc.querySelectorAll('[style*="ytimg.com/vi"], [style*="img.youtube.com/vi"], [poster*="ytimg.com/vi"]').forEach(function (w) {
      if (w.closest(".x-ap__cover, .x-ap__frame, .x-ap__upbg, .x-bgl, #x-era-imgs, .x-qs, .x-ap__poster")) return;
      try { put(w, bgId(w)); } catch (e) {}
    });
  };
  var q = 0;
  var queue = function () { if (!q) q = requestAnimationFrame(ensure); };
  if ("MutationObserver" in window) {
    new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        var a = recs[i].addedNodes;
        for (var j = 0; j < a.length; j++) {
          var n = a[j];
          /* our own badge going in is not a reason to look again */
          if (n.nodeType === 1 && !(n.classList && n.classList.contains("x-dur"))) { queue(); return; }
        }
      }
    }).observe(doc.body, { childList: true, subtree: true });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", ensure); else ensure();
  window.addEventListener("load", queue);

  /* ---------- 2. XAudit: always on window ---------- */
  if (typeof window.XAudit !== "function") {
    window.XAudit = function () {
      var de = doc.documentElement, r = {};
      r.horizontalOverflow = Math.max(0, de.scrollWidth - de.clientWidth);
      r.thumbs = window.XDur ? XDur.audit() : null;
      r.thumbsWithoutBadge = r.thumbs ? r.thumbs.total.missing : null;
      r.hero = window.XHeroCheck ? XHeroCheck() : null;
      if (window.console && console.table && r.thumbs) console.table(r.thumbs.byCard);
      return r;
    };
  }
})();
