/* fixes4.js: deep links without a landing flash, duration badges on every talk thumbnail, a guard that keeps the
   windowed video picture on top, a focus trap for the side drawers, and an on-demand self-audit (XAudit()).
   Nothing here plays a video or re-renders content on a timer. */
(function () {
  "use strict";
  var doc = document, de = doc.documentElement;
  var raf2 = function (f) { requestAnimationFrame(function () { requestAnimationFrame(f); }); };

  /* ---------------------------------------------------------------------
     1. Deep links. The head script hid the landing before the first paint. Both routers (pages.js, people.js)
        have already drawn a page route synchronously by now; a section link lands on DOMContentLoaded (goto.js),
        then the page is revealed two frames later, already in place.
     --------------------------------------------------------------------- */
  var route = de.getAttribute("data-route");
  if (route === "page") raf2(function () { de.removeAttribute("data-route"); });
  else if (route === "section") {
    var reveal = function () { raf2(function () { de.removeAttribute("data-route"); }); };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", reveal); else reveal();
  } else de.removeAttribute("data-route");

  /* ---------------------------------------------------------------------
     2. Duration badges: every img from i.ytimg.com/vi/<id>/ gets the talk's length bottom right, looked up by id
        in videos.json. Thumbnails that already carry a length badge keep it (its text is normalised).
     --------------------------------------------------------------------- */
  var norm = window.XLen || function (s) { return s || ""; };
  var lenOf = {};
  try { (window.Hark && Hark.data ? Hark.data("d-videos") || [] : []).forEach(function (v) { if (v && v.id && v.len) lenOf[v.id] = norm(v.len); }); } catch (e) {}
  var OWN = ".x-th__len, .x-th16__len, .x-pop__qlen, .x-ap__updur, .x-dur";
  var SKIP = ".x-ap__poster, .x-ap__cover, .x-ap__frame, .x-ap__upbg, .x-bgl, #x-era-imgs";
  var idOf = function (src) { var m = /i\.ytimg\.com\/vi(?:_webp)?\/([^/?#]+)\//.exec(src || ""); return m ? decodeURIComponent(m[1]) : ""; };
  var badge = function (img) {
    img.setAttribute("data-xd", "1");
    var id = idOf(img.getAttribute("src")); if (!id || img.closest(SKIP)) return;
    var p = img.parentElement; if (!p) return;
    var own = null;
    for (var i = 0; i < p.children.length; i++) if (p.children[i].matches(OWN)) { own = p.children[i]; break; }
    if (own) { var t = norm(own.textContent.trim()); if (t && t !== own.textContent) own.textContent = t; return; }
    var len = lenOf[id]; if (!len) return;
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
    var b = doc.createElement("span"); b.className = "x-dur"; b.textContent = len;
    host.appendChild(b);
  };
  var scanQ = 0;
  var scan = function () {
    scanQ = 0;
    doc.querySelectorAll('img[src*="i.ytimg.com/vi"]:not([data-xd])').forEach(function (img) { try { badge(img); } catch (e) {} });
  };
  var queue = function () { if (!scanQ) scanQ = requestAnimationFrame(scan); };
  /* thumbs.js (XDur) owns the badges and their observer now; this older pass only runs without it */
  if (!window.XDur) {
    if ("MutationObserver" in window) new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        var a = recs[i].addedNodes;
        for (var j = 0; j < a.length; j++) if (a[j].nodeType === 1) { queue(); return; }
      }
    }).observe(doc.body, { childList: true, subtree: true });
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", scan); else scan();
  }

  /* ---------------------------------------------------------------------
     3. Player picture guard. 300ms after YouTube reports PLAYING, in every mode (inline, window, theater,
        corner): the iframe must have a size, the start cover must be gone, and the topmost thing at the centre
        of the video must be the iframe or its transparent shield. Anything else is put right and logged.
     --------------------------------------------------------------------- */
  var players = [];
  var OK_OVER = ".x-ap__shield, .x-ap__bar, .x-apx-menu, .x-sx-top, .x-sx-nat, .x-pn-cap, .x-ap__upnext, .x-apt, .x-ap__sheet";
  var LEGIT = ".x-pop, dialog, .x-dd__menu, .x-whd, .x-ask, .x-wh, .nav, .x-nar";
  var check = function (inst, fix) {
    var root = inst.root, screen = inst.screen, out = { mode: "", ok: true, issues: [] };
    if (!root || !screen || !root.isConnected) { out.ok = false; out.issues.push("detached"); return out; }
    var pop = root.closest(".x-pop");
    out.mode = root.classList.contains("is-fs") ? "fullscreen" : pop ? (pop.classList.contains("is-min") ? "minimised" : pop.classList.contains("is-modal") ? "modal" : "corner") : root.classList.contains("is-wh-side") || root.closest(".x-tt") ? "theater" : "inline";
    if (out.mode === "minimised") return out;
    var ifr = screen.querySelector(".x-ap__frame iframe");
    if (!ifr) { out.issues.push("no iframe yet"); return out; }
    var sr = screen.getBoundingClientRect(), ir = ifr.getBoundingClientRect();
    out.screen = Math.round(sr.width) + "×" + Math.round(sr.height); out.iframe = Math.round(ir.width) + "×" + Math.round(ir.height);
    if (sr.width > 20 && sr.height < 20) {
      out.ok = false; out.issues.push("video box collapsed");
      if (fix) screen.style.height = Math.round(sr.width * 9 / 16) + "px";
    }
    if (ir.width < 20 || ir.height < 20) { out.ok = false; out.issues.push("iframe has no size"); if (fix) { ifr.style.width = "100%"; ifr.style.minHeight = "100%"; } }
    var cover = screen.querySelector(".x-ap__cover");
    var st = inst.state ? inst.state() : {};
    if (cover && !cover.hidden && st.playing && !root.classList.contains("is-cover")) {
      out.ok = false; out.issues.push("cover left over the picture");
      if (fix) { cover.classList.remove("is-fading"); cover.hidden = true; }
    }
    var cx = sr.left + sr.width / 2, cy = sr.top + sr.height * 0.45;
    if (cx > 0 && cy > 0 && cx < window.innerWidth && cy < window.innerHeight) {
      var hit = doc.elementFromPoint(cx, cy);
      out.top = hit ? (hit.tagName.toLowerCase() + (hit.className && typeof hit.className === "string" ? "." + hit.className.split(" ")[0] : "")) : "none";
      /* fine: the iframe, the shield or the player's own controls; or, outside the player, a menu, window or the nav
         the reader opened over it. Never the start cover, the poster, or a page background layer. */
      var fine = !!hit && (hit === ifr || (root.contains(hit) ? !!hit.closest(OK_OVER) : !!hit.closest(LEGIT)));
      if (!fine) {
        out.ok = false; out.issues.push("covered by " + out.top);
        if (fix) {
          if (hit && hit.closest && hit.closest(".x-ap__cover") && st.playing) { var cv = hit.closest(".x-ap__cover"); cv.classList.remove("is-fading"); cv.hidden = true; }
          else if (hit && !root.contains(hit)) root.classList.add("x-lift");
        }
      }
    }
    if (!out.ok && fix && window.console) console.warn("Player picture check (" + out.mode + "): " + out.issues.join("; "));
    return out;
  };
  if (window.ArchivePlayer && ArchivePlayer.onCreate) {
    ArchivePlayer.onCreate(function (inst) {
      if (!inst || players.indexOf(inst) >= 0) return;
      players.push(inst);
      var t = 0;
      inst.on("state", function (s) {
        if (s !== 1) return;
        clearTimeout(t);
        t = setTimeout(function () { check(inst, true); }, 300);
      });
    });
  }

  /* ---------------------------------------------------------------------
     4. Focus trap for side drawers and windows that are not native dialogs (watch history, the video window)
     --------------------------------------------------------------------- */
  var FOC = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var mods = [].slice.call(doc.querySelectorAll('[aria-modal="true"]')).filter(function (m) {
      return m.tagName !== "DIALOG" && m.getClientRects().length && !m.closest("[hidden]");
    });
    var m = mods[mods.length - 1]; if (!m) return;
    var f = [].slice.call(m.querySelectorAll(FOC)).filter(function (x) { return x.getClientRects().length && !x.closest("[inert]"); });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], a = doc.activeElement;
    if (!m.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------------------------------------------------------------------
     5. Self-audit, run on demand from the console: XAudit() (fixes6.js keeps a fallback on window)
     --------------------------------------------------------------------- */
  window.XAudit = function () {
    var r = {};
    r.horizontalOverflow = Math.max(0, de.scrollWidth - de.clientWidth);
    r.wideElements = [].slice.call(doc.querySelectorAll("body *")).filter(function (el) {
      var b = el.getBoundingClientRect(); return b.width && b.right > de.clientWidth + 1 && getComputedStyle(el).position !== "fixed" && !el.closest(".x-cw__row, .x-strip__sc, [class*='__row'], .x-et, .x-bar__chips, .table-wrap, .compare, .x-pop");
    }).slice(0, 10).map(function (el) { return el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0]; });
    r.imagesWithoutSize = [].slice.call(doc.images).filter(function (i) {
      return !(i.getAttribute("width") && i.getAttribute("height")) && getComputedStyle(i).aspectRatio === "auto";
    }).map(function (i) { return i.getAttribute("src"); }).slice(0, 20);
    r.imagesNotLazy = [].slice.call(doc.images).filter(function (i) { return i.loading !== "lazy" && !i.closest(".hero") && i.getAttribute("fetchpriority") !== "high"; }).length;
    r.players = players.map(function (p) { return check(p, false); });
    if (window.XDur) {
      r.thumbs = XDur.audit();
      r.thumbsWithoutBadge = r.thumbs.total.missing;
    } else r.thumbsWithoutBadge = [].slice.call(doc.querySelectorAll('img[src*="i.ytimg.com/vi"]')).filter(function (i) {
      var id = idOf(i.getAttribute("src")); return id && lenOf[id] && !i.closest(SKIP) && !(i.parentElement && i.parentElement.querySelector(OWN));
    }).length;
    r.hero = window.XHeroCheck ? XHeroCheck() : null;
    if (window.console && console.table) {
      console.table({ overflow: r.horizontalOverflow, noSize: r.imagesWithoutSize.length, thumbsWithoutBadge: r.thumbsWithoutBadge });
      if (r.thumbs) console.table(r.thumbs.byCard);
    }
    return r;
  };
})();
