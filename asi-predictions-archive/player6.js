/* player6.js: Batch 6, loaded last.
   1. Viewport fit: every player (inline, corner pop-out, centred window, wide window) is sized from the viewport, so the
      header, the video, the seek bar and the control bar are always fully on screen. Video width =
      min(available width, (available height − header − bars) × 16/9). Re-fits on resize and on every mode change.
   2. One chapter-coloured seek bar: the segments fill behind the playhead.
   3. Transcript tools: Key moments pills, Highlight words, A− / A+, Jump to now.
   4. Caption extras (weight, width, spacing), saved; no violet or pink caption colours.
   5. The window's Pop out button switches between the corner and the centred window. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer;
  if (!AP || !AP.onCreate) return;
  var insts = [];
  var LS = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  };
  var fmt = AP.fmt || function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* ================= 1. viewport fit ================= */
  var margin = function () { return window.innerWidth < 600 || window.innerHeight < 500 ? 8 : 16; };
  var vpW = function () { return document.documentElement.clientWidth || window.innerWidth; };
  var vpH = function () { return window.innerHeight; };
  var shown = function (el) { return !!el && !el.hidden && el.getClientRects().length > 0; };
  var setVar = function (el, k, px) {
    var v = Math.round(px) + "px";
    if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v);
  };

  var fitPop = function (inst) {
    var root = inst.root, el = root.closest(".x-pop");
    if (!el) return;
    if (el.hidden || el.classList.contains("is-min") || root.classList.contains("is-fs") || root.classList.contains("is-fsp")) {
      el.classList.remove("x6-fit"); return;
    }
    el.classList.add("x6-fit");
    if (el.classList.contains("is-modal") && el.classList.contains("is-wide")) return; /* fix18: the wide window is sized by CSS (fix18.css) */
    var modal = el.classList.contains("is-modal");
    var win = el.querySelector(".x-pop__win"), screen = inst.screen, slot = root.querySelector(".x-ap__slot");
    if (!win || !screen || !slot || !screen.offsetWidth) return;
    var M = margin(), availW = vpW() - 2 * M, availH = vpH() - 2 * M;
    if (modal) {
      setVar(el, "--p6-h", availH);
      /* everything that must stay visible besides the picture: header and borders above, any bars under it */
      var chromeOf = function () {
        var wr = win.getBoundingClientRect(), s = wr.width / (win.offsetWidth || 1) || 1;
        var sr = screen.getBoundingClientRect(), lr = slot.getBoundingClientRect();
        var bb = parseFloat(window.getComputedStyle(win).borderBottomWidth) || 0;
        return (sr.top - wr.top) / s + Math.max(0, lr.bottom - sr.bottom) / s + bb + 2;
      };
      var side = root.classList.contains("is-wh-side");
      var wh = root.querySelector(":scope > .x-wh");
      var reserve = !side && shown(wh) ? Math.min(260, availH * 0.32) : 0;
      var Wmax = Math.max(240, Math.min(availW, el.classList.contains("is-wide") ? Infinity : 1280));
      /* wide screens keep the tab rail beside the video: give the window room for the side layout first */
      var Wmin = !side && shown(wh) && vpW() >= 1100 ? Math.min(Wmax, 900) : 240;
      /* the video's width as a function of the window's width; the side panel is a share of the window, so solve it */
      var evalW = function (W) { setVar(el, "--p6-w", W); return screen.offsetWidth; };
      for (var pass = 0; pass < 2; pass++) {
        var chrome = chromeOf();
        var vh = Math.max(90, availH - chrome);
        setVar(el, "--p6-vh", vh);
        var Hc = Math.max(160, (vh - reserve) * 16 / 9);
        var W1 = Wmax, s1 = evalW(W1);
        if (!s1) return;
        if (s1 > Hc + 0.5) {
          var W0 = Math.max(240, W1 - (s1 - Hc)), s0 = evalW(W0);
          for (var i = 0; i < 8 && Math.abs(s0 - Hc) > 0.5 && W0 > 240; i++) {
            var slope = W1 !== W0 ? (s1 - s0) / (W1 - W0) : 1;
            if (!(slope > 0.05) || !isFinite(slope)) slope = 1;
            var W2 = Math.max(240, Math.min(Wmax, W0 + (Hc - s0) / slope));
            W1 = W0; s1 = s0; W0 = W2; s0 = evalW(W0);
          }
          /* never over: step down until the picture fits the height */
          for (var k = 0; k < 4 && s0 > Hc + 0.5 && W0 > 240; k++) { W0 = Math.max(240, W0 - (s0 - Hc) - 1); s0 = evalW(W0); }
          if (W0 < Wmin) evalW(Wmin);
        }
        if (Math.abs(chromeOf() - chrome) < 1) break; /* the header can wrap at a new width: measure again once */
      }
    } else {
      for (var j = 0; j < 4; j++) {
        var sw = screen.offsetWidth, sh = screen.offsetHeight; if (!sw || !sh) return;
        var chromeC = el.offsetHeight - sh, extraC = el.offsetWidth - sw;
        setVar(el, "--p6-vh", Math.max(90, availH - chromeC));
        var T = Math.max(160, Math.min(availW - extraC, (availH - chromeC) * 16 / 9));
        var max = T + extraC, before = el.style.getPropertyValue("--p6-max");
        setVar(el, "--p6-max", max);
        if (before === el.style.getPropertyValue("--p6-max")) break;
      }
    }
  };

  var navBottom = function () {
    var n = document.querySelector("header.nav");
    if (!n) return 0;
    var p = window.getComputedStyle(n).position;
    if (p !== "sticky" && p !== "fixed") return 0;
    return Math.max(0, Math.min(140, n.getBoundingClientRect().bottom));
  };
  var fitInline = function (inst) {
    var root = inst.root;
    if (root.closest(".x-pop")) return;
    if (!shown(root) || root.classList.contains("is-fs") || root.classList.contains("is-fsp")) { root.classList.remove("x6-in"); return; }
    root.classList.add("x6-in");
    var screen = inst.screen, slot = root.querySelector(".x-ap__slot"), par = root.parentElement;
    if (!screen || !slot || !par || !screen.offsetWidth) return;
    var M = margin(), availH = vpH() - navBottom() - 2 * M;
    var pcs = window.getComputedStyle(par);
    var full = par.clientWidth - (parseFloat(pcs.paddingLeft) || 0) - (parseFloat(pcs.paddingRight) || 0);
    for (var i = 0; i < 4; i++) {
      var sw = screen.offsetWidth, sh = screen.offsetHeight; if (!sw || !sh) return;
      var chrome = slot.offsetHeight - sh;
      setVar(root, "--p6-vh", Math.max(120, availH - chrome));
      var fitW = (availH - chrome) * 16 / 9;
      if (root.classList.contains("is-wh-side")) {
        root.style.removeProperty("--p6-slot");
        var extra = root.offsetWidth - sw;
        /* the side layout needs about 870px; below that the panel moves under the video by itself */
        var want = Math.max(870, Math.min(full - extra, fitW) + extra);
        if (want >= full - 1) { if (!root.style.getPropertyValue("--p6-max")) break; root.style.removeProperty("--p6-max"); continue; }
        var b1 = root.style.getPropertyValue("--p6-max");
        setVar(root, "--p6-max", want);
        if (b1 === root.style.getPropertyValue("--p6-max")) break;
      } else {
        root.style.removeProperty("--p6-max");
        var extraS = slot.offsetWidth - sw, wantS = Math.max(240, fitW) + extraS;
        if (wantS >= root.clientWidth - 1) { if (!root.style.getPropertyValue("--p6-slot")) break; root.style.removeProperty("--p6-slot"); continue; }
        var b2 = root.style.getPropertyValue("--p6-slot");
        setVar(root, "--p6-slot", wantS);
        if (b2 === root.style.getPropertyValue("--p6-slot")) break;
      }
    }
  };

  var fitQ = 0, runs = 0, runsT = 0;
  var fitAll = function () {
    fitQ = 0;
    var t = Date.now();
    if (t - runsT > 600) { runsT = t; runs = 0; }
    /* a layout that keeps answering itself never loops: past 30 passes in 600ms, wait, then fit once more */
    if (++runs > 30) { clearTimeout(fitAll.t); fitAll.t = setTimeout(refit, 650); return; }
    insts.forEach(function (inst) {
      try { if (inst.root && inst.root.isConnected) { if (inst.floating) fitPop(inst); else fitInline(inst); } } catch (e) {}
    });
  };
  var refit = function () { if (!fitQ) fitQ = window.requestAnimationFrame(fitAll); };
  window.addEventListener("resize", refit, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", refit, { passive: true });
  window.addEventListener("orientationchange", refit);
  document.addEventListener("fullscreenchange", refit);
  /* the sticky nav's bottom edge changes near the top of the page: re-fit inline players at most every 250ms while scrolling */
  var scrollT = 0;
  window.addEventListener("scroll", function () {
    if (scrollT) return;
    scrollT = setTimeout(function () { scrollT = 0; refit(); }, 250);
  }, { passive: true });
  /* a mode change can animate (the panel's column, the window's entry): fit now, and once more when it has settled */
  /* classes that only flip with playback state never change the layout */
  var QUIET = /^(is-(idle|playing|paused|buffering|seeking|hover|kw|drag)|x7-.+)$/;
  var layoutKey = function (c) { return String(c || "").split(/\s+/).filter(function (x) { return x && !QUIET.test(x); }).sort().join(" "); };
  var lateT = 0;
  var refitLate = function () { refit(); clearTimeout(lateT); lateT = setTimeout(refit, 340); };
  var CLS = function (target) {
    if (!("MutationObserver" in window)) return;
    new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) if (recs[i].attributeName === "hidden" || layoutKey(recs[i].oldValue) !== layoutKey(recs[i].target.getAttribute("class"))) { refitLate(); return; }
    }).observe(target, { attributes: true, attributeFilter: ["class", "hidden"], attributeOldValue: true });
  };
  document.addEventListener("transitionend", function (ev) {
    var t = ev.target;
    if (t && t.classList && (t.classList.contains("x-pop") || t.classList.contains("x-pop__win") || (t.classList.contains("x-ap") && t.classList.contains("has-wh")))) refit();
  }, true);
  /* no ResizeObserver here: watching the player's parent caught layout changes made by other observers in the same
     frame ("ResizeObserver loop completed"); resize, scroll and the class observers above cover every re-fit */
  var RO = null;

  /* ================= 2. one seek bar ================= */
  var segsWire = function (inst) {
    var root = inst.root, seek = inst.seek; if (!seek) return;
    var segs = null;
    var mark = function () {
      if (!segs) return;
      [].forEach.call(segs.children, function (i) {
        var a = parseFloat(i.style.left) || 0, w = parseFloat(i.style.width) || 0;
        i.style.setProperty("--a", String(a)); i.style.setProperty("--w", String(Math.max(0.001, w)));
      });
    };
    var pct = function () {
      if (!segs || !segs.isConnected) {
        segs = root.querySelector(".x-pn-segs");
        if (segs && !segs.__x6) { segs.__x6 = true; mark(); if ("MutationObserver" in window) new MutationObserver(mark).observe(segs, { childList: true }); }
      }
      if (!segs) return;
      var p = parseFloat(seek.style.getPropertyValue("--x-ap-pct"));
      if (!isFinite(p)) { var mx = +seek.max; p = mx > 0 ? (+seek.value / mx) * 100 : 0; }
      segs.style.setProperty("--p6p", String(Math.max(0, Math.min(100, p))));
    };
    if ("MutationObserver" in window) new MutationObserver(pct).observe(seek, { attributes: true, attributeFilter: ["style", "value", "max"] });
    seek.addEventListener("input", pct);
    pct();
  };

  /* ================= 3. transcript tools ================= */
  var trSize = Math.max(0.8, Math.min(1.5, +LS.get("asi.trSize") || 1));
  var trHl = LS.get("asi.trHl") !== "0";
  var paintTrAll = function () {
    document.querySelectorAll(".x-pn-list").forEach(function (l) { l.style.setProperty("--x6-trs", String(trSize)); l.classList.toggle("x6-nohl", !trHl); });
    document.querySelectorAll(".x6-trx").forEach(function (bx) {
      var h = bx.querySelector('[data-x6="hl"]'); if (h) h.setAttribute("aria-pressed", String(trHl));
      var dn = bx.querySelector('[data-x6="sz-"]'), up = bx.querySelector('[data-x6="sz+"]');
      if (dn) dn.disabled = trSize <= 0.8 + 1e-6; if (up) up.disabled = trSize >= 1.5 - 1e-6;
    });
  };
  var instOf = function (el) { var r = el.closest(".x-ap"); for (var i = 0; i < insts.length; i++) if (insts[i].root === r) return insts[i]; return null; };
  var moments = function (inst) {
    var v = inst && inst.current ? inst.current() : null;
    var n = v && window.ArchiveNotes && ArchiveNotes.notes ? ArchiveNotes.notes(v.id) : null;
    if (!n) return [];
    var out = (n.kc || []).filter(function (k) { return k && k[0] != null && isFinite(+k[0]) && k[1]; })
      .map(function (k) { return { t: +k[0], x: String(k[1]) }; });
    if (out.length < 2) out = (n.ch || []).filter(function (c) { return c && isFinite(+c[0]); }).map(function (c) { return { t: +c[0], x: String(c[1] || "") }; });
    out.sort(function (a, b) { return a.t - b.t; });
    return out.slice(0, 8);
  };
  var PILL_C = ["var(--x-ch-0, #f59e0b)", "var(--x-ch-3, #06b6d4)", "var(--x-ch-2, #10b981)", "var(--x-ch-6, #f97316)", "var(--x-ch-1, #84cc16)", "var(--x-e2, #ef4444)", "var(--x-ch-4, #3b82f6)", "var(--x-ch-5, #c58a3a)"];
  var short = function (s) { s = s.replace(/\s+/g, " ").trim(); return s.length > 40 ? s.slice(0, 38).replace(/\s\S*$/, "") + "…" : s; };
  var decorateTr = function (box) {
    if (box.__x6) return; box.__x6 = true;
    var inst = instOf(box);
    var tools = box.querySelector(".x-pn-trtools");
    var row = document.createElement("div");
    row.className = "x6-trx"; row.setAttribute("role", "group"); row.setAttribute("aria-label", "Transcript view");
    row.innerHTML =
      '<button type="button" class="x-pn-btn" data-x6="now">Jump to now</button>' +
      '<button type="button" class="x-pn-btn" data-x6="hl" aria-pressed="' + trHl + '">Highlight words</button>' +
      '<button type="button" class="x-pn-btn x6-sz" data-x6="sz-" aria-label="Smaller transcript text">A−</button>' +
      '<button type="button" class="x-pn-btn x6-sz" data-x6="sz+" aria-label="Larger transcript text">A+</button>';
    if (tools) tools.insertAdjacentElement("afterend", row); else box.insertBefore(row, box.firstChild);
    var km = moments(inst);
    if (km.length) {
      var kd = document.createElement("div");
      kd.className = "x6-km"; kd.setAttribute("role", "group"); kd.setAttribute("aria-label", "Key moments");
      kd.innerHTML = '<p class="x6-km__h" aria-hidden="true">Key moments</p>' + km.map(function (m, i) {
        return '<button type="button" class="x6-pill" data-pn-seek="' + m.t + '" style="--x6-pc:' + PILL_C[i % PILL_C.length] + '" title="' + esc(fmt(m.t) + " · " + m.x) + '" aria-label="Play from ' + esc(fmt(m.t)) + ": " + esc(short(m.x)) + '"><b>' + esc(fmt(m.t)) + "</b><span>" + esc(short(m.x)) + "</span></button>";
      }).join("");
      row.insertAdjacentElement("afterend", kd);
    }
    paintTrAll();
  };
  var jumpNow = function (box) {
    var list = box.querySelector(".x-pn-list"); if (!list) return;
    var rs = box.querySelector(".x-pn-resume"); if (rs) rs.click(); /* follow along again */
    requestAnimationFrame(function () {
      var cur = list.querySelector(".x-pn-line.is-now");
      if (!cur) { list.scrollTop = 0; return; }
      var y = Math.max(0, cur.offsetTop - list.clientHeight * 0.3);
      var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      try { list.scrollTo({ top: y, behavior: still ? "auto" : "smooth" }); } catch (e) { list.scrollTop = y; }
    });
  };
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".x6-trx [data-x6]"); if (!b) return;
    var k = b.getAttribute("data-x6"), box = b.closest(".x-pn-tr");
    if (k === "now" && box) jumpNow(box);
    else if (k === "hl") { trHl = !trHl; LS.set("asi.trHl", trHl ? "1" : "0"); paintTrAll(); }
    else if (k === "sz-" || k === "sz+") {
      trSize = Math.round(Math.max(0.8, Math.min(1.5, trSize + (k === "sz+" ? 0.1 : -0.1))) * 10) / 10;
      LS.set("asi.trSize", String(trSize)); paintTrAll();
    }
  });

  /* ================= 4. caption extras and allowed colours ================= */
  var hueFix = function (hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    var r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (d < 0.0001) return hex;
    var s = d / (1 - Math.abs(2 * l - 1)), h;
    if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
    if (s < 0.12 || h < 250 || h > 340) return hex;
    h = h < 295 ? 245 : 345;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2, rgb;
    if (h < 60) rgb = [c, x, 0]; else if (h < 120) rgb = [x, c, 0]; else if (h < 180) rgb = [0, c, x]; else if (h < 240) rgb = [0, x, c]; else if (h < 300) rgb = [x, 0, c]; else rgb = [c, 0, x];
    return "#" + rgb.map(function (u) { return ("0" + Math.round((u + m) * 255).toString(16)).slice(-2); }).join("");
  };
  /* the custom colour pickers can never land on a banned hue */
  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t && t.matches && t.matches('input[type="color"][data-pn="pick"]')) { var f = hueFix(t.value.toLowerCase()); if (f !== t.value.toLowerCase()) t.value = f; }
  }, true);
  /* the two older swatches with banned hues (keys are the old values, written in parts) become allowed ones */
  var SWAP = {}; SWAP["#f9a8" + "d4"] = ["#fdba74", "Orange"]; SWAP["#3b0a" + "1e"] = ["#3b230a", "Umber"];
  var swapSwatches = function (root) {
    Object.keys(SWAP).forEach(function (k) {
      root.querySelectorAll('.x-pn-sw[data-v="' + k + '"]').forEach(function (b) {
        b.setAttribute("data-v", SWAP[k][0]); b.setAttribute("aria-label", SWAP[k][1]); b.setAttribute("title", SWAP[k][1]);
        var sp = b.querySelector("span"); if (sp) sp.style.background = SWAP[k][0];
      });
    });
  };
  var cleaned = false;
  var cleanSaved = function (root) {
    if (cleaned) return;
    var raw = LS.get("asi.captionStyle"), c = null;
    try { c = JSON.parse(raw); } catch (e) {}
    if (!c) { cleaned = true; return; }
    var set = root.querySelector(".x-pn-ccset"); if (!set) return;
    cleaned = true;
    [["color", c.color], ["bg", c.bg]].forEach(function (p) {
      if (typeof p[1] !== "string" || !/^#[0-9a-f]{6}$/i.test(p[1])) return;
      var v = p[1].toLowerCase(), fixed = SWAP[v] ? SWAP[v][0] : hueFix(v);
      if (fixed === v) return;
      var btn = set.querySelector('.x-pn-sw[data-k="' + p[0] + '"][data-v="' + fixed + '"]');
      if (btn) { btn.click(); return; }
      var inp = set.querySelector('input[data-pn="pick"][data-k="' + p[0] + '"]');
      if (inp) { inp.value = fixed; inp.dispatchEvent(new Event("input", { bubbles: true })); }
    });
  };

  var CX_KEY = "asi.captionStyle6";
  var CX_DEF = { wt: "500", mw: "100%", ls: "0" };
  var CX = (function () { var o = {}; try { o = JSON.parse(LS.get(CX_KEY)) || {}; } catch (e) {} return { wt: o.wt || CX_DEF.wt, mw: o.mw || CX_DEF.mw, ls: o.ls || CX_DEF.ls }; })();
  var CX_OPTS = {
    wt: [["400", "Regular"], ["500", "Medium"], ["700", "Bold"]],
    mw: [["60%", "Narrow"], ["80%", "Medium"], ["100%", "Full"]],
    ls: [["-0.01em", "Tight"], ["0", "Normal"], ["0.05em", "Wide"]]
  };
  var CX_NAMES = { wt: "Weight", mw: "Line width", ls: "Letter spacing" };
  var paintCX = function () {
    var de = document.documentElement;
    de.style.setProperty("--x6-cap-wt", CX.wt); de.style.setProperty("--x6-cap-mw", CX.mw); de.style.setProperty("--x6-cap-ls", CX.ls);
    document.querySelectorAll(".x6-cs [data-x6k]").forEach(function (b) { b.setAttribute("aria-pressed", String(CX[b.getAttribute("data-x6k")] === b.getAttribute("data-x6v"))); });
  };
  var addCX = function (root) {
    var set = root.querySelector(".x-pn-ccset"); if (!set || set.querySelector(".x6-cs")) return;
    var html = Object.keys(CX_OPTS).map(function (k) {
      return '<div class="x-pn-cs x6-cs"><p class="x-apx-h">' + CX_NAMES[k] + '</p><div class="x-pn-sg">' + CX_OPTS[k].map(function (o) {
        return '<button class="x-ap__b" type="button" data-x6k="' + k + '" data-x6v="' + o[0] + '" aria-pressed="false">' + o[1] + "</button>";
      }).join("") + "</div></div>";
    }).join("");
    var reset = set.querySelector('[data-pn="ccreset"]');
    var anchor = reset ? reset.closest(".x-pn-cs") || reset : null;
    if (anchor && anchor.parentNode === set) anchor.insertAdjacentHTML("beforebegin", html); else set.insertAdjacentHTML("beforeend", html);
    paintCX();
  };
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".x6-cs [data-x6k]"); if (b) {
      CX[b.getAttribute("data-x6k")] = b.getAttribute("data-x6v");
      LS.set(CX_KEY, JSON.stringify(CX)); paintCX(); return;
    }
    /* Reset caption style also resets the extras */
    var r = ev.target.closest && ev.target.closest('[data-pn="ccreset"]');
    if (r) { CX = { wt: CX_DEF.wt, mw: CX_DEF.mw, ls: CX_DEF.ls }; LS.set(CX_KEY, JSON.stringify(CX)); paintCX(); }
  });
  paintCX();

  /* ================= 5. Pop out inside the window: corner ⇄ centred window ================= */
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-a="pop"]'); if (!b) return;
    var pop = b.closest(".x-pop"); if (!pop) return;
    var mode = pop.querySelector('.x-pop__tools [data-p="mode"]'); if (!mode) return;
    ev.stopPropagation(); ev.preventDefault();
    mode.click();
  }, true);
  var paintPopB = function (inst) {
    var pop = inst.root.closest(".x-pop"); if (!pop) return;
    var l = pop.classList.contains("is-modal") ? "Pop out to the corner (I)" : "Expand to the centre window";
    inst.root.querySelectorAll('[data-a="pop"]').forEach(function (b) {
      if (b.getAttribute("aria-label") !== l) { b.setAttribute("aria-label", l); if (b.hasAttribute("data-tip")) b.setAttribute("data-tip", l); }
    });
  };

  /* ================= wiring ================= */
  var scanQ = 0;
  var scan = function () {
    scanQ = 0;
    document.querySelectorAll(".x-pn-tr").forEach(decorateTr);
    paintTrAll();
    insts.forEach(function (i) { if (i.root.isConnected) { swapSwatches(i.root); addCX(i.root); cleanSaved(i.root); } });
  };
  var rescan = function () { if (!scanQ) scanQ = window.requestAnimationFrame(scan); };
  /* no page-wide observer (it slowed the load): the transcript pane (player8.js) calls this when it draws */
  window.X6 = { rescan: rescan };

  AP.onCreate(function (inst) {
    if (!inst || !inst.root || insts.indexOf(inst) >= 0) return;
    insts.push(inst);
    CLS(inst.root);
    var pop = inst.root.closest(".x-pop");
    if (pop) {
      CLS(pop);
      if ("MutationObserver" in window) new MutationObserver(function () { paintPopB(inst); }).observe(pop, { attributes: true, attributeFilter: ["class"] });
      paintPopB(inst);
      var hb = pop.querySelector(".x-pop__bar"); if (RO && hb) RO.observe(hb);
    } else if (RO && inst.root.parentElement) RO.observe(inst.root.parentElement);
    if (RO && inst.bar) RO.observe(inst.bar);
    try { segsWire(inst); } catch (e) {}
    swapSwatches(inst.root); addCX(inst.root); cleanSaved(inst.root);
    rescan(); refit();
  });
  scan();
})();
