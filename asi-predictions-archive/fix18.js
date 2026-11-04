/* fix18.js: loaded last.
   A. Wide window: the ↔ buttons always flip it; the Panel button's pressed state matches what is on screen;
      wheel and touch inside the window never minimise it (window.F18inside, read by dock14.js).
   B. Captions lift clear of the seek bar while the controls show.
   C. ⚙ menu: anchored above the control bar, last row reachable, fades, bottom sheet under 520px, jump chips.
   D. Sleep timer "End", Skip intro +30s, Repeat chapter, Copy link at current time. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer, doc = document;
  if (!AP || !AP.onCreate) return;
  var P = AP._dock || null, insts = [];
  var setCls = function (el, c, on) { if (el.classList.contains(c) !== !!on) el.classList.toggle(c, !!on); };
  var setI = function (s, k, v) { if (s.getPropertyValue(k) !== v || s.getPropertyPriority(k) !== "important") s.setProperty(k, v, "important"); };
  var shown = function (el) {
    if (!el || !el.getClientRects().length) return false;
    var cs = getComputedStyle(el); return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.05;
  };
  var svg = function (d) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
  var fmt = AP.fmt || function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); };
  var toastEl = null, toastT = 0;
  var toast = function (t) {
    if (!toastEl) { toastEl = doc.createElement("div"); toastEl.className = "f18-toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite"); }
    var host = doc.fullscreenElement || doc.webkitFullscreenElement || doc.body;
    if (toastEl.parentNode !== host) host.appendChild(toastEl);
    toastEl.textContent = t; toastEl.classList.add("is-on");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2000);
  };

  /* ================= A. wide window ================= */
  var popEl = function () { return P && P.el ? P.el() : doc.querySelector(".x-pop"); };
  /* dock14: a wheel or touch inside the window, its panel, transcript or menus never minimises it */
  window.F18inside = function (ev) {
    var path = ev && ev.composedPath ? ev.composedPath() : [];
    if (!path.length) for (var n = ev && ev.target; n; n = n.parentNode) path.push(n);
    for (var i = 0; i < path.length; i++) {
      var el = path[i];
      if (el && el.nodeType === 1 && el.matches(".x-pop, .x-apx-menu, .g13-menu, .s12-pop, [role='menu'], [role='listbox'], dialog")) return true;
    }
    var p = popEl(); /* the wide window covers the viewport: its 8px margin counts as inside */
    return !!(p && !p.hidden && p.classList.contains("is-modal") && p.classList.contains("is-wide"));
  };
  /* every click on ↔ (header data-p="wide", control bar data-a="theater") flips the state exactly once */
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest('[data-p="wide"], [data-a="theater"]');
    var p = popEl();
    if (!b || !P || !p || !p.contains(b) || p.hidden || p.classList.contains("is-dk14")) return;
    var want = !P.isWide();
    var check = function () {
      var q = popEl(); if (!q || q.hidden || q.classList.contains("is-dk14")) return;
      if (P.isWide() !== want) P.setWide(want);
      setCls(q, "is-wide", want);
    };
    setTimeout(check, 0); setTimeout(check, 260);
  }, true);

  /* the Panel buttons are pressed exactly when the panel's content is on screen */
  var paintPanel = function (inst) {
    var root = inst.root; if (!root || !root.isConnected) return;
    var wh = root.querySelector(":scope > .x-wh"), main = wh && wh.querySelector(".x-wh__main");
    var open = !!(wh && !wh.hidden && shown(wh) && main && shown(main));
    root.querySelectorAll(".s12-panelb, .x-sx-panelb").forEach(function (b) {
      if (b.getAttribute("aria-pressed") !== String(open)) b.setAttribute("aria-pressed", String(open));
    });
  };

  /* ================= B. captions above the seek bar ================= */
  var liftCaps = function (inst) {
    var root = inst.root, cap = root && root.querySelector(".x-pn-cap");
    if (!cap || !cap.getClientRects().length) return;
    setCls(cap, "f18-cap", true);
    var cur = cap.__f18 || 0, need = 0, bar = inst.bar || root.querySelector(".x-ap__bar");
    if (!cap.classList.contains("is-drag") && root.classList.contains("is-started") && shown(bar) && !root.classList.contains("x7-rest") && !root.classList.contains("x7-clean")) {
      var lim = Infinity;
      bar.querySelectorAll(".x-ap__seekrow, .x-apx-track, .x-pn-segs").forEach(function (el) {
        var r = el.getBoundingClientRect(); if (r.height > 0 && r.width > 0) lim = Math.min(lim, r.top);
      });
      if (lim < Infinity) {
        var win = cap.querySelector(".x-pn-cap__win"), r = (win && win.offsetHeight ? win : cap).getBoundingClientRect();
        var ty = parseFloat((cap.style.translate || "0 0").split(" ")[1]) || 0; /* gear13's preview lift */
        need = Math.max(0, Math.ceil(r.bottom + cur - ty - (lim - 12)));
      }
    }
    if (Math.abs(need - cur) > 1 || (need === 0 && cur !== 0)) { cap.__f18 = need; cap.style.setProperty("--f18-lift", need + "px"); }
  };
  setInterval(function () {
    insts.forEach(function (inst) { if (inst.root && inst.root.isConnected) { try { liftCaps(inst); } catch (e) {} } });
  }, 120);

  /* ================= C. the ⚙ menu ================= */
  var ctrlOf = function (m) { var r = m.closest(".x-ap") || doc; return m.id ? r.querySelector('[aria-controls="' + m.id + '"]') : null; };
  var flag = function (m, k, on) {
    var v = (m.getAttribute("data-f18") || "").split(" ").filter(function (x) { return x && x !== k; });
    if (on) v.push(k); v.sort(); var s = v.join(" ") || "m";
    if (m.getAttribute("data-f18") !== s) m.setAttribute("data-f18", s);
  };
  var fade = function (m) {
    flag(m, "t", !/\bs\b/.test(m.getAttribute("data-f18") || "") && m.scrollTop > 2);
    flag(m, "b", m.scrollTop + m.clientHeight < m.scrollHeight - 2);
  };
  var closeMenu = function (m) {
    var b = ctrlOf(m);
    if (b && b.getAttribute("aria-expanded") === "true") b.click();
    if (!m.hidden) { m.hidden = true; if (b) b.setAttribute("aria-expanded", "false"); }
  };
  var place = function (m) {
    if (m.hidden || !m.isConnected) return;
    var root = m.closest(".x-ap"), wrap = m.closest(".x-ap__wrap") || root; if (!wrap) return;
    var W = wrap.getBoundingClientRect(); if (!(W.width > 0 && W.height > 0)) return;
    var top = Math.max(W.top, 0), bot = Math.min(W.bottom, window.innerHeight); if (bot - top < 80) return;
    var ctl = bot; /* the top of the visible control bar: seek row or buttons */
    root.querySelectorAll(".x-ap__bar > .x-ap__seekrow, .x-ap__bar > .x-ap__btns").forEach(function (el) {
      if (!shown(el)) return; var r = el.getBoundingClientRect(); if (r.height > 0 && r.top > top && r.top < ctl) ctl = r.top;
    });
    var sheet = W.width < 520, s = m.style;
    flag(m, "s", sheet);
    var lo = ctl - 12, hi = top + 12;
    var maxH = Math.max(96, Math.floor(lo - hi));
    if (sheet) maxH = Math.max(96, Math.min(maxH, Math.floor((bot - top) * 0.7)));
    var w = Math.floor(sheet ? W.width - 12 : Math.min(320, W.width - 16));
    setI(s, "width", w + "px"); setI(s, "max-width", w + "px"); setI(s, "max-height", maxH + "px");
    var o = m.getBoundingClientRect(), h = m.offsetHeight, x;
    if (sheet) x = W.left + 6;
    else { var b = ctrlOf(m), B = b && b.getClientRects().length ? b.getBoundingClientRect() : null; x = B ? B.right - w : W.right - 8 - w; }
    x = Math.max(W.left + 6, Math.min(x, W.right - 6 - w));
    var y = Math.max(hi, lo - h);
    setI(s, "left", Math.round((parseFloat(s.getPropertyValue("left")) || 0) + x - o.left) + "px");
    setI(s, "top", Math.round((parseFloat(s.getPropertyValue("top")) || 0) + y - o.top) + "px");
    fade(m);
  };
  var pending = [], raf = 0;
  var queue = function (m) {
    if (pending.indexOf(m) < 0) pending.push(m);
    if (!raf) raf = requestAnimationFrame(function () { raf = 0; var l = pending; pending = []; l.forEach(function (x) { try { place(x); } catch (e) {} }); });
  };
  var openMenus = function () { return [].slice.call(doc.querySelectorAll(".x-ap .x-apx-menu:not([hidden])")); };
  window.addEventListener("resize", function () { openMenus().forEach(queue); }, { passive: true });
  window.addEventListener("scroll", function (e) { if (!(e.target && e.target.classList && e.target.classList.contains("x-apx-menu"))) openMenus().forEach(queue); }, { passive: true, capture: true });

  var JUMP = [["Speed", /^Speed/i], ["Captions", /^Captions/i], ["Picture", /^Picture/i], ["Loop & A–B", /^A.B repeat/i], ["Share", null]];
  var target = function (m, i) {
    if (!JUMP[i][1]) return m.querySelector(".f18-copyt") || m.querySelector('[data-x="copy"]');
    var hs = [].slice.call(m.querySelectorAll(".x-apx-h, .s12-h")), re = JUMP[i][1];
    for (var k = 0; k < hs.length; k++) if (re.test((hs[k].textContent || "").trim()) && hs[k].getClientRects().length) return hs[k].closest(".x-apx-sec") || hs[k];
    return null;
  };
  var wireMenu = function (m, inst) {
    if (m.__f18) return; m.__f18 = true;
    flag(m, "m", true);
    var hdl = doc.createElement("div"); hdl.className = "f18-hdl"; hdl.setAttribute("aria-hidden", "true"); hdl.innerHTML = "<i></i>";
    m.insertBefore(hdl, m.firstChild);
    /* drag the handle down to close the sheet */
    var y0 = null, dy = 0;
    hdl.addEventListener("pointerdown", function (e) { y0 = e.clientY; dy = 0; try { hdl.setPointerCapture(e.pointerId); } catch (x) {} });
    hdl.addEventListener("pointermove", function (e) { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); m.style.translate = "0 " + dy + "px"; });
    var end = function () { if (y0 == null) return; y0 = null; m.style.translate = ""; if (dy > 70) closeMenu(m); };
    hdl.addEventListener("pointerup", end); hdl.addEventListener("pointercancel", end);
    if ("MutationObserver" in window) new MutationObserver(function () { if (!m.hidden) queue(m); }).observe(m, { attributes: true, attributeFilter: ["hidden", "class", "style"] });
    m.addEventListener("scroll", function () { fade(m); }, { passive: true });
    if (!m.querySelector('[data-x="loop"]')) { queue(m); return; } /* the speed popover gets the placement only */

    /* Jump to section */
    var jump = doc.createElement("div"); jump.className = "f18-jump"; jump.setAttribute("role", "group"); jump.setAttribute("aria-label", "Jump to section");
    jump.innerHTML = JUMP.map(function (j, i) { return '<button type="button" class="f18-chip" data-f18j="' + i + '">' + j[0] + "</button>"; }).join("");
    hdl.after(jump);
    var paintJump = function () { jump.querySelectorAll(".f18-chip").forEach(function (c) { c.hidden = !target(m, +c.dataset.f18j); }); };
    jump.addEventListener("click", function (e) {
      var c = e.target.closest(".f18-chip"); if (!c) return;
      var t = target(m, +c.dataset.f18j); if (!t) return;
      var top = t.getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop - jump.offsetHeight - 8;
      var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      m.scrollTo({ top: Math.max(0, top), behavior: still ? "auto" : "smooth" });
    });

    /* D. more controls */
    var loopB = m.querySelector('[data-x="loop"]'), copyB = m.querySelector('[data-x="copy"]');
    var more = doc.createElement("div"); more.className = "x-apx-sec f18-more";
    more.innerHTML = '<p class="x-apx-h">More</p>' +
      '<button class="x-ap__b" type="button" data-f18a="intro">' + svg('<path d="M5 6l7 6-7 6z"/><path d="M13 6l7 6-7 6z"/>') + '<span class="x-apx-lbl">Skip intro +30s</span></button>' +
      '<button class="x-ap__b" type="button" data-f18a="repch" aria-pressed="false">' + svg('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7"/>') + '<span class="x-apx-lbl">Repeat chapter</span></button>';
    loopB.after(more);
    var copyT = doc.createElement("button"); copyT.type = "button"; copyT.className = "x-ap__b f18-copyt"; copyT.setAttribute("data-f18a", "copyt");
    copyT.innerHTML = svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>') + '<span class="x-apx-lbl">Copy link at current time</span>';
    if (copyB) copyB.before(copyT); else more.appendChild(copyT);
    var row = m.querySelector(".x-sx-row5");
    if (row) row.insertAdjacentHTML("beforeend", '<button class="x-ap__b f18-send" type="button" data-f18a="sleepend" aria-pressed="false" title="Pause at the end of this video">End</button>');

    var S = { end: false, rep: false, ch: -1, st: 0, last: 0 };
    var paintSleep = function () {
      var e = row && row.querySelector(".f18-send"); if (!e) return;
      e.setAttribute("aria-pressed", String(S.end));
      if (S.end) {
        row.querySelectorAll('[data-x="sleep"]').forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        var o = m.querySelector('[data-r="sleep"]'); if (o) o.textContent = "End of video";
      }
    };
    var chStart = function (k, t) { /* the earliest time still in chapter k, by bisection */
      var lo = 0, hi = t;
      for (var i = 0; i < 24 && hi - lo > 0.25; i++) { var mid = (lo + hi) / 2; if (inst.chapterIndexAt(mid) >= k) hi = mid; else lo = mid; }
      return hi;
    };
    var paintCopy = function () { var l = copyT.querySelector(".x-apx-lbl"), t = inst.started && inst.started() ? inst.now() : 0; l.textContent = t > 0 ? "Copy link at " + fmt(t) : "Copy link at current time"; };
    var copyLink = function () {
      var v = inst.current && inst.current(); if (!v) return;
      var at = Math.max(0, Math.floor(inst.started && inst.started() ? inst.now() : 0));
      var url = "https://www.youtube.com/watch?v=" + v.id + (at ? "&t=" + at + "s" : "");
      var old = function () {
        var ta = doc.createElement("textarea"); ta.value = url; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        (doc.fullscreenElement || doc.body).appendChild(ta); ta.select(); var ok = false; try { ok = doc.execCommand("copy"); } catch (x) {} ta.remove();
        toast(ok ? "Link copied" : "Copy failed"); inst.say(ok ? "Link copied" : url);
      };
      try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(function () { toast("Link copied"); inst.say("Link copied"); }, old); else old(); } catch (x) { old(); }
    };
    m.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-f18a], [data-x='sleep']"); if (!b || !m.contains(b)) return;
      var a = b.getAttribute("data-f18a");
      if (!a) { if (S.end) { S.end = false; paintSleep(); } return; } /* the built-in sleep buttons take over */
      if (a === "intro") {
        if (inst.started && inst.started()) { inst.seekTo(inst.now() + 30); if (inst.flash) inst.flash(30); } else inst.playAt(30);
        inst.say("Skipped ahead 30 seconds");
      } else if (a === "repch") {
        if (!S.rep) {
          var t = inst.started && inst.started() ? inst.now() : 0, k = inst.chapterIndexAt ? inst.chapterIndexAt(t) : -1;
          if (k < 0) { inst.say("No chapters in this video"); toast("No chapters in this video"); return; }
          S.rep = true; S.ch = k; S.st = chStart(k, t); S.last = t; inst.say("Repeating this chapter");
        } else { S.rep = false; inst.say("Repeat chapter off"); }
        b.setAttribute("aria-pressed", String(S.rep));
      } else if (a === "copyt") copyLink();
      else if (a === "sleepend") {
        var off = row.querySelector('[data-sleep="off"]'); if (off && !S.end) off.click();
        S.end = !S.end; paintSleep();
        if (!S.end && off) off.click();
        inst.say(S.end ? "Sleep timer: pauses at the end of this video" : "Sleep timer off");
      }
    });
    inst.on("tick", function (t) {
      if (!S.rep || !inst.chapterIndexAt) return;
      var k = inst.chapterIndexAt(t);
      if (k === S.ch + 1 && t - S.last >= 0 && t - S.last < 3) { inst.seekTo(S.st); S.last = S.st; return; } /* played past the end: back to its start */
      if (k !== S.ch && k >= 0) { S.ch = k; S.st = chStart(k, t); } /* a seek to another chapter repeats that one */
      S.last = t;
    });
    inst.on("ended", function () {
      if (S.rep && S.ch >= 0) { inst.playAt(S.st); return true; } /* the last chapter repeats too */
      if (S.end) { S.end = false; paintSleep(); var o = m.querySelector('[data-r="sleep"]'); if (o) o.textContent = "Off"; inst.say("Sleep timer: stopped at the end of the video"); return true; } /* no up-next, no autoplay */
      return false;
    });
    inst.on("change", function () {
      S.rep = false; S.ch = -1; var rb = m.querySelector('[data-f18a="repch"]'); if (rb) rb.setAttribute("aria-pressed", "false");
      if (S.end) { S.end = false; paintSleep(); var o = m.querySelector('[data-r="sleep"]'); if (o) o.textContent = "Off"; }
    });
    /* Picture slider fill */
    var pct = function (r) { var mn = +r.min || 0, mx = +r.max || 100; r.style.setProperty("--x-ap-pct", ((+r.value - mn) / (mx - mn || 1) * 100).toFixed(1) + "%"); };
    m.addEventListener("input", function (e) { if (e.target.matches && e.target.matches("input[data-x7r]")) pct(e.target); });
    var onOpen = function () { if (m.hidden) return; paintJump(); paintCopy(); m.querySelectorAll("input[data-x7r]").forEach(pct); queue(m); };
    if ("MutationObserver" in window) new MutationObserver(onOpen).observe(m, { attributes: true, attributeFilter: ["hidden"] });
    m.addEventListener("click", function (e) { if (e.target.closest && e.target.closest('[data-x7="picreset"]')) setTimeout(function () { m.querySelectorAll("input[data-x7r]").forEach(pct); }, 0); });
    onOpen();
  };

  /* ================= per player ================= */
  AP.onCreate(function (inst) {
    if (!inst || !inst.root || insts.indexOf(inst) >= 0) return;
    insts.push(inst);
    var root = inst.root, q = 0;
    var paint = function () { if (!q) q = requestAnimationFrame(function () { q = 0; paintPanel(inst); }); };
    var scan = function () { root.querySelectorAll(".x-apx-menu").forEach(function (m) { wireMenu(m, inst); }); };
    scan(); setTimeout(scan, 600);
    if ("MutationObserver" in window) {
      var mo = new MutationObserver(paint);
      mo.observe(root, { attributes: true, attributeFilter: ["class"] });
      var hook = function () {
        var wh = root.querySelector(":scope > .x-wh"); if (wh && !wh.__f18) { wh.__f18 = true; mo.observe(wh, { attributes: true, attributeFilter: ["class", "hidden"] }); }
        root.querySelectorAll(".s12-panelb, .x-sx-panelb").forEach(function (b) { if (!b.__f18) { b.__f18 = true; mo.observe(b, { attributes: true, attributeFilter: ["aria-pressed"] }); } });
        var p = root.closest(".x-pop"); if (p && !p.__f18) { p.__f18 = true; mo.observe(p, { attributes: true, attributeFilter: ["class", "hidden"] }); }
      };
      hook(); setTimeout(hook, 600); setTimeout(hook, 2000);
      root.addEventListener("click", function () { hook(); scan(); paint(); setTimeout(paint, 120); setTimeout(paint, 400); });
    }
    window.addEventListener("resize", paint, { passive: true });
    paint();
  });
})();
