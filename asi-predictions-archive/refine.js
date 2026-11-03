/* refine.js: theme-color that follows the theme toggle; the reading progress bar under the nav pill and its
   sliding section highlight; on phones the pill steps aside while reading down; and player quick controls:
   speeds, copy link at the current time, bookmarks (kept in localStorage, listed in the About and Speaker tabs)
   and the shortcuts sheet. Static: nothing plays, moves or scrolls on its own. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  var reduce = mm("(prefers-reduced-motion: reduce)");

  /* ---------- theme-color meta follows a manual light or dark choice ---------- */
  var metas = [].slice.call(doc.querySelectorAll('meta[name="theme-color"]'));
  var paintTheme = function () {
    var t = root.getAttribute("data-theme");
    if (t === "light" || t === "dark") metas.forEach(function (m) { m.setAttribute("content", t === "dark" ? "#1d1d1f" : "#f5f5f7"); });
    else metas.forEach(function (m) { m.setAttribute("content", /dark/.test(m.getAttribute("media") || "") ? "#1d1d1f" : "#f5f5f7"); });
  };
  paintTheme();
  if ("MutationObserver" in window) new MutationObserver(paintTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- nav: progress under the pill, sliding highlight, phone step-aside ---------- */
  var navDone = false;
  var initNav = function () {
    var nav = doc.querySelector("header.nav");
    if (!nav || navDone) return;
    /* hark.js fills the nav on DOMContentLoaded; wait for it so nothing added here is overwritten */
    var seg = nav.querySelector(".seg");
    if (!seg) return;
    navDone = true;
    var prog = doc.querySelector(".x-prog");
    if (prog && prog.parentNode !== nav) nav.appendChild(prog);
    if (!seg.querySelector(".x-navind")) {
      var ind = doc.createElement("span");
      ind.className = "x-navind"; ind.setAttribute("aria-hidden", "true");
      seg.insertBefore(ind, seg.firstChild);
      seg.classList.add("x-has-ind");
      var place = function () {
        var a = seg.querySelector('a[aria-current="true"]');
        if (!a || !a.offsetWidth) { ind.style.opacity = "0"; return; }
        var w = Math.max(12, a.offsetWidth - 28);
        ind.style.width = w + "px";
        ind.style.transform = "translate(" + (a.offsetLeft + (a.offsetWidth - w) / 2) + "px," + (a.offsetTop + a.offsetHeight - 5) + "px)";
        ind.style.opacity = "1";
      };
      place();
      requestAnimationFrame(function () { requestAnimationFrame(function () { ind.classList.add("is-live"); }); });
      if ("MutationObserver" in window) new MutationObserver(place).observe(seg, { subtree: true, attributes: true, attributeFilter: ["aria-current"] });
      if ("ResizeObserver" in window) new ResizeObserver(place).observe(seg);
      window.addEventListener("resize", place, { passive: true });
    }

    /* under 700px: reading down slides the pill up out of the way; any scroll up brings it back */
    var phone = mm("(max-width: 699px)"), lastY = window.scrollY, acc = 0, raf = 0;
    var show = function () { nav.classList.remove("x-nav-hide"); };
    var onScroll = function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var y = window.scrollY, d = y - lastY; lastY = y;
        if (!phone.matches) { show(); return; }
        var busy = nav.contains(doc.activeElement) || doc.querySelector(".x-sheet:not([hidden])") || doc.querySelector(".x-bar.is-stuck") || (window.XJump && window.XJump.active);
        if (busy || y < 120) { acc = 0; show(); return; }
        acc = d > 0 === acc > 0 ? acc + d : d;
        if (acc > 24) nav.classList.add("x-nav-hide");
        else if (acc < -12) show();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    nav.addEventListener("focusin", show);
  };
  initNav();
  if (!navDone) { doc.addEventListener("DOMContentLoaded", initNav); window.addEventListener("load", initNav); }

  /* ---------- player quick controls and bookmarks ---------- */
  var AP = window.ArchivePlayer;
  if (!AP || !AP.onCreate) return;
  var fmt = AP.fmt || function (s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); };
  var keep = AP.keepScroll || function (f) { return f(); };

  var BK = "asiArchive.bookmarks.v1";
  var readBM = function () { try { var o = JSON.parse(localStorage.getItem(BK)); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } };
  var listBM = function (id) { var l = readBM()[id]; return Array.isArray(l) ? l.filter(function (b) { return b && isFinite(+b.t); }).sort(function (a, b) { return a.t - b.t; }) : []; };
  var writeBM = function (id, list) {
    var o = readBM();
    if (list.length) o[id] = list; else delete o[id];
    try { localStorage.setItem(BK, JSON.stringify(o)); } catch (e) {}
  };
  var insts = [];
  var refreshAll = function (id) { insts.forEach(function (i) { var v = i.current && i.current(); if (v && v.id === id && i._bmPaint) i._bmPaint(); }); };

  var svg = function (d) { return '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; };
  var IC_LINK = svg('<path d="M10 13.5a4 4 0 0 0 5.7.3l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10.5a4 4 0 0 0-5.7-.3l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>');
  var IC_MARK = svg('<path d="M7 4h10v16l-5-3.6L7 20z"/>');
  var IC_KEYS = svg('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h1M10 10h1M13.5 10h1M17 10h.5M7 14h10"/>');
  var RATES = [0.75, 1, 1.25, 1.5, 2];

  var copyText = function (text, ok, fail) {
    var old = function () {
      var t = doc.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.top = "0"; t.style.opacity = "0";
      doc.body.appendChild(t); try { t.focus({ preventScroll: true }); } catch (e) {} t.select();
      try { doc.execCommand("copy"); ok(); } catch (e) { fail(); }
      t.remove();
    };
    try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, old); else old(); } catch (e) { old(); }
  };

  AP.onCreate(function (inst) {
    var rootEl = inst.root, screen = inst.screen;
    if (!rootEl || !screen || rootEl.__apt) return;
    rootEl.__apt = true;
    insts.push(inst);
    var cur = function () { return inst.current ? inst.current() : null; };
    var at = function () {
      var v = cur(); if (!v) return 0;
      if (inst.started() && inst.yt()) return Math.max(0, Math.floor(inst.now() || 0));
      var p = AP.progress ? AP.progress(v.id) : null;
      return Math.max(0, Math.floor((p && p.pos) || 0));
    };

    /* Copy-link-at and Bookmark are fixed-width icon buttons inside the control bar, with tooltips above them.
       (They used to sit in a hover row over the top-right corner, on top of the pre-play Play / CC / ⚙ pill,
       so the buttons under the cursor swapped on hover.) Speeds live in the ⚙ menu, shortcuts on the bar's ?.
       Narrow players hide them from the bar at a fixed container breakpoint and show the copies in the ⚙ menu. */
    var btnsEl = rootEl.querySelector(".x-ap__btns"), menuEl = rootEl.querySelector(".x-apx-menu");
    var gapEl = btnsEl && btnsEl.querySelector(".x-ap__gap");
    var barHtml =
      '<button type="button" class="x-ap__b x-apt-b" data-apt="copy" aria-label="Copy link at 0:00" data-tip="Copy link at 0:00">' + IC_LINK + "</button>" +
      '<button type="button" class="x-ap__b x-apt-b" data-apt="mark" aria-label="Bookmark this moment (B)" data-tip="Bookmark (B)">' + IC_MARK + "</button>";
    if (gapEl) gapEl.insertAdjacentHTML("beforebegin", barHtml); else if (btnsEl) btnsEl.insertAdjacentHTML("beforeend", barHtml);
    var slotEndEl = menuEl && menuEl.querySelector('[data-slot="end"]');
    if (slotEndEl) slotEndEl.insertAdjacentHTML("beforeend",
      '<button type="button" class="x-ap__b x-apx-dup" data-dup="md" data-apt="copy">' + IC_LINK + '<span class="x-apx-lbl x-apt__lbl">Copy link at 0:00</span></button>' +
      '<button type="button" class="x-ap__b x-apx-dup" data-dup="md" data-apt="mark">' + IC_MARK + '<span class="x-apx-lbl x-apt__lbl">Bookmark</span></button>');
    var row = rootEl;
    var copyBs = [].slice.call(rootEl.querySelectorAll('[data-apt="copy"]'));
    var lastT = -1, copying = false;
    var setCopyText = function (s) {
      copyBs.forEach(function (b) { var l = b.querySelector(".x-apt__lbl"); if (l) l.textContent = s; else b.setAttribute("data-tip", s); b.setAttribute("aria-label", s); });
    };
    var paint = function () {
      var t = at();
      if (t !== lastT && !copying) { lastT = t; setCopyText("Copy link at " + fmt(t)); }
    };
    inst.on("tick", paint);
    inst.on("change", function () { lastT = -1; paint(); });
    inst.on("state", paint);
    var wrapEl = rootEl.querySelector(".x-ap__wrap");
    if (wrapEl) wrapEl.addEventListener("pointerenter", paint);
    paint();

    var mark = function () {
      var v = cur(); if (!v) return;
      var t = at(), list = listBM(v.id);
      if (list.some(function (b) { return Math.abs(b.t - t) < 2; })) { inst.say("Already bookmarked near " + fmt(t)); return; }
      list.push({ t: t, at: Date.now(), title: v.t || "" });
      list.sort(function (a, b) { return a.t - b.t; });
      if (list.length > 60) list = list.slice(-60);
      writeBM(v.id, list);
      inst.say("Bookmarked " + fmt(t));
      var mB = rootEl.querySelector('.x-ap__btns [data-apt="mark"]');
      if (mB) { mB.setAttribute("data-tip", "Saved " + fmt(t)); setTimeout(function () { mB.setAttribute("data-tip", "Bookmark (B)"); }, 1400); }
      refreshAll(v.id);
    };
    var copyAt = function () {
      var v = cur(); if (!v) return;
      var t = at(), url = "https://www.youtube.com/watch?v=" + v.id + "&t=" + t + "s";
      copying = true;
      copyText(url, function () {
        setCopyText("Copied · " + fmt(t)); inst.say("Link at " + fmt(t) + " copied");
        setTimeout(function () { copying = false; lastT = -1; paint(); }, 1400);
      }, function () { copying = false; inst.say(url); });
    };

    row.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-apt]"); if (!b || !rootEl.contains(b)) return;
      var a = b.getAttribute("data-apt");
      if (a === "copy") copyAt();
      else if (a === "mark") mark();
    });
    inst.on("key", function (ev) {
      if ((ev.key === "b" || ev.key === "B") && !ev.shiftKey) { mark(); return true; }
      return false;
    });

    /* ---- bookmarks in the info panel's About and Speaker tabs ---- */
    var bmHtml = function (v) {
      var list = listBM(v.id);
      return '<section class="x-bm" aria-label="Your bookmarks"><p class="x-pn-h">Your bookmarks' + (list.length ? "<small>" + list.length + "</small>" : "") + "</p>" +
        (list.length ? "<ol>" + list.map(function (b, i) {
          return '<li><button type="button" class="x-pn-tb" data-bm-seek="' + b.t + '" aria-label="Play from ' + fmt(b.t) + '">' + fmt(b.t) + "</button>" +
            '<span class="x-bm__t">Bookmark ' + (i + 1) + "</span>" +
            '<button type="button" class="x-bm__del" data-bm-del="' + b.t + '" aria-label="Remove the bookmark at ' + fmt(b.t) + '">×</button></li>';
        }).join("") + "</ol>" : '<p class="x-bm__empty">Press B, or the bookmark button on the video, to save a moment here.</p>') + "</section>";
    };
    var paneOf = function () { return rootEl.querySelector(".x-wh__pane"); };
    var bodyOf = function () { return rootEl.querySelector(".x-wh__body"); };
    /* bookmarks live in the panel's Notes tab */
    var wants = function () { var b = bodyOf(); var t = b && b.getAttribute("data-t"); return t === "notes"; };
    inst._bmPaint = function () {
      var pane = paneOf(), v = cur(); if (!pane || !v) return;
      var old = pane.querySelector(".x-bm");
      if (!wants()) { if (old) old.remove(); return; }
      var tmp = doc.createElement("div"); tmp.innerHTML = bmHtml(v);
      if (old) old.replaceWith(tmp.firstChild); else pane.appendChild(tmp.firstChild);
    };
    var hook = function () {
      var pane = paneOf(); if (!pane || pane.__bm) return !!pane;
      pane.__bm = true;
      if ("MutationObserver" in window) new MutationObserver(function () {
        if (wants() && !pane.querySelector(".x-bm") && pane.childNodes.length) inst._bmPaint();
      }).observe(pane, { childList: true });
      inst._bmPaint();
      return true;
    };
    if (!hook()) setTimeout(hook, 0);
    rootEl.addEventListener("click", function (ev) {
      var s = ev.target.closest("[data-bm-seek]");
      if (s && rootEl.contains(s)) {
        ev.preventDefault();
        var t = +s.getAttribute("data-bm-seek");
        keep(function () { if (inst.started() && inst.yt()) inst.seekTo(t); else if (inst.playAt) inst.playAt(t); });
        return;
      }
      var d = ev.target.closest("[data-bm-del]");
      if (d && rootEl.contains(d)) {
        ev.preventDefault();
        var v = cur(); if (!v) return;
        var dt = +d.getAttribute("data-bm-del");
        writeBM(v.id, listBM(v.id).filter(function (b) { return b.t !== dt; }));
        inst.say("Bookmark removed");
        refreshAll(v.id);
      }
    });
  });
})();
