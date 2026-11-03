/* thumbs.js: one duration badge for every talk thumbnail.
   XDur.html(id, cls) is the shared helper every thumbnail renderer calls: it returns the badge for a talk id, its
   length looked up in videos.json and normalised ("0:52:45" reads "52:45"), or "" when the talk has no length.
   A MutationObserver is the fallback: any <img> whose src is a YouTube thumbnail (i.ytimg.com/vi/<id>/ or
   img.youtube.com/vi/<id>/) and that has no badge beside it gets one. XDur.audit() counts thumbnails and badges.
   Loaded before every renderer, so the helper exists when they first draw. */
(function () {
  "use strict";
  var doc = document;
  var norm = window.XLen || function (s) { return String(s || "").replace(/^0:(?=\d)/, ""); };
  var LEN = {}, N = 0;
  try {
    ((window.Hark && Hark.data && Hark.data("d-videos")) || []).forEach(function (v) {
      if (v && v.id && v.len) { var t = norm(v.len); if (t) { LEN[v.id] = t; N++; } }
    });
  } catch (e) {}
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var len = function (id) { return (id && LEN[id]) || ""; };
  var html = function (id, cls) {
    var l = len(id);
    return l ? '<span class="x-dur' + (cls ? " " + cls : "") + '" data-dur="' + esc(id) + '">' + l + "</span>" : "";
  };

  /* every class a thumbnail's length badge has ever had; the fallback never adds a second one */
  var BADGE = ".x-dur, .x-th__len, .x-th16__len, .x-pop__qlen, .x-ap__updur";
  /* not thumbnails: the live player's own layers, blurred backdrops, era photos, the hero's start tiles */
  var SKIP = ".x-ap__cover, .x-ap__frame, .x-ap__upbg, .x-bgl, #x-era-imgs, .x-st";
  var RE = /(?:i\d?\.ytimg\.com\/vi(?:_webp)?|img\.youtube\.com\/vi)\/([^/?#]+)\//;
  var SEL = 'img[src*="ytimg.com/vi"], img[src*="img.youtube.com/vi"]';
  var idOf = function (src) { var m = RE.exec(src || ""); if (!m) return ""; try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } };
  var own = function (img) {
    var p = img.parentElement; if (!p) return null;
    for (var i = 0; i < p.children.length; i++) if (p.children[i] !== img && p.children[i].matches(BADGE)) return p.children[i];
    return null;
  };

  var attach = function (img) {
    var id = idOf(img.getAttribute("src"));
    img.setAttribute("data-xd", id || "-");
    if (!id || img.closest(SKIP)) return;
    var l = len(id), b = own(img);
    if (b) {
      /* a badge drawn by a renderer: keep it, but make sure it names this talk and reads the normalised way */
      if (!l) { if (b.classList.contains("x-dur") && b.getAttribute("data-dur") && b.getAttribute("data-dur") !== id) b.remove(); return; }
      b.classList.add("x-dur"); b.setAttribute("data-dur", id);
      if (b.textContent !== l) b.textContent = l;
      return;
    }
    if (!l) return;
    var p = img.parentElement; if (!p) return;
    /* a tight box (the img plus overlays only) takes the badge; otherwise the img gets a snug wrapper */
    var tight = true;
    for (var j = 0; j < p.children.length; j++) {
      var c = p.children[j]; if (c === img) continue;
      var pos = getComputedStyle(c).position;
      if (pos !== "absolute" && pos !== "fixed") { tight = false; break; }
    }
    var host = p;
    if (tight) { if (getComputedStyle(p).position === "static") p.classList.add("x-dur-host"); }
    else {
      host = doc.createElement("span"); host.className = "x-dur-w";
      if (getComputedStyle(p).display.indexOf("grid") >= 0) host.style.display = "block";
      p.insertBefore(host, img); host.appendChild(img);
    }
    host.insertAdjacentHTML("beforeend", html(id));
  };

  var q = 0, dirty = [];
  var scan = function () {
    q = 0;
    var list = dirty; dirty = [];
    list.forEach(function (img) { if (img.isConnected) { try { attach(img); } catch (e) {} } });
    doc.querySelectorAll(SEL).forEach(function (img) {
      if (img.getAttribute("data-xd") === idOf(img.getAttribute("src")) && (own(img) || !len(img.getAttribute("data-xd")))) return;
      try { attach(img); } catch (e) {}
    });
  };
  var queue = function () { if (!q) q = requestAnimationFrame(scan); };
  if ("MutationObserver" in window) {
    new MutationObserver(function (recs) {
      var hit = false;
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.type === "attributes") { if (r.target.tagName === "IMG") { dirty.push(r.target); hit = true; } continue; }
        for (var j = 0; j < r.addedNodes.length; j++) if (r.addedNodes[j].nodeType === 1) { hit = true; break; }
      }
      if (hit) queue();
    }).observe(doc.body || doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", scan); else queue();

  /* ---------- audit: thumbnails and badges in the current view, by card type ---------- */
  var GROUPS = [
    [".x-pop__q", "Queue (corner player)"], [".x-ap__upsug", "Up next: more"], [".x-ap__upthumb", "Up next"],
    [".x-ap__poster", "Featured / player poster"], [".x-tt__rec", "Theater: also watch"], [".x-vc", "Media grid"],
    [".x-cw__card", "Continue watching"], [".x-whd__it", "Watch history"], [".x-wh__uprow", "Watch panel: queue"],
    [".x-wh__row", "Watch panel: more talks"], [".x-pv__v", "Person / topic talks"], [".x-hi__vid", "History milestones"],
    [".x-lite", "Archive entry cards"]
  ];
  var audit = function () {
    var g = {}, tot = { thumbs: 0, badges: 0, missing: 0, noLength: 0 };
    doc.querySelectorAll(SEL).forEach(function (img) {
      if (img.closest(SKIP)) return;
      var id = idOf(img.getAttribute("src")); if (!id) return;
      var name = "Other";
      for (var i = 0; i < GROUPS.length; i++) if (img.closest(GROUPS[i][0])) { name = GROUPS[i][1]; break; }
      var o = g[name] || (g[name] = { thumbs: 0, badges: 0, missing: 0, noLength: 0 });
      o.thumbs++; tot.thumbs++;
      var b = own(img);
      if (b && b.textContent.trim()) { o.badges++; tot.badges++; }
      else if (!len(id)) { o.noLength++; tot.noLength++; }
      else { o.missing++; tot.missing++; }
    });
    return { route: location.hash || "#(home)", total: tot, byCard: g, talksWithLength: N };
  };

  window.XDur = { len: len, html: html, attach: attach, scan: scan, audit: audit, idOf: idOf };
})();
