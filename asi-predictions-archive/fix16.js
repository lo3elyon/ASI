/* fix16.js: player fixes from the batch-12 browser QA. Loaded last.
   1. One watched-progress line under the seek bar in every player (in-page Theater, watch page, window, wide,
      fullscreen) and in the mini dock: "X% watched · Y% left · mm:ss left" at 360px and wider, "X% watched · mm:ss left"
      below. The time left is duration − currentTime.
   2. The side panel's "Watched mm:ss · Y%" takes its time from currentTime, the same number as the %.
   3. One speed state (inst.rate()) drives every control: badge, bar button, speed popover, the ⚙ list and its fine slider.
      Speeds above 2× only with Extension mode. Keys: + = - * (numpad too) and Shift + > / <, by the speed step.
   4. The speed badge shows for 1.5 s on every speed change and while the controls are up, above the iframe and cover.
   5. Phones (< 600px): the minimised shape is always the bottom dock bar (Expand, Play, X); Expand goes to the centred
      window. A press anywhere outside the open player (empty page background included) minimises it to the dock.
   6. While the player window is open, Back to top and the Ask button step aside; the poster's Play sits centred in the
      picture above the title caption.
   7. Esc never closes, docks or reshapes the player window (fullscreen and menus keep their own Esc). */
(function () {
  "use strict";
  var AP = window.ArchivePlayer;
  if (!AP || !AP.onCreate) return;
  var doc = document, docEl = doc.documentElement;
  var P = AP._dock || null;
  var DK = function () { return window.XDock14 || null; };
  var phone = window.matchMedia ? window.matchMedia("(max-width: 599px)") : { matches: false };
  var insts = [];

  var fmt = AP.fmt || function (s) { s = Math.max(0, Math.floor(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = ("0" + (s % 60)).slice(-2); return h ? h + ":" + ("0" + m).slice(-2) + ":" + x : m + ":" + x; };
  var fmtR = function (r) { return (+r).toFixed(2).replace(/0$/, "").replace(/\.0$/, "") + "×"; };
  var rnd = function (r) { return Math.round(r * 100) / 100; };
  var ext = function () { return docEl.classList.contains("s12-ext"); };
  var maxR = function () { return ext() ? 3 : 2; };
  var stepR = function () { var s = 0.25; try { s = parseFloat(localStorage.getItem("asi.speed12.step")); } catch (e) {} return [0.1, 0.25, 0.5].indexOf(s) >= 0 ? s : 0.25; };
  var setTxt = function (n, t) { if (n && n.textContent !== t) n.textContent = t; };
  var setCls = function (n, c, on) { if (n && n.classList.contains(c) !== !!on) n.classList.toggle(c, !!on); };
  var shown = function (n) { return !!(n && n.isConnected && n.getClientRects().length); };
  var parseLen = function (t) { return t ? String(t).split(":").reduce(function (a, b) { return a * 60 + (+b || 0); }, 0) : 0; };
  var popEl = function () { return P && P.el ? P.el() : null; };
  var popOpen = function () { var e = popEl(); return !!(P && e && !e.hidden && P.isOpen()); };
  var docked = function () { var d = DK(); return !!(d && d.isDocked && d.isDocked()); };
  var inFs = function () { return !!(doc.fullscreenElement || doc.webkitFullscreenElement || docEl.classList.contains("x-fsp-open")); };

  /* ---------- 1 + 2. position, duration and the watched figures, from currentTime ---------- */
  var figs = function (inst) {
    var v = inst.current && inst.current(); if (!v) return null;
    var d = 0, t = 0, live = false;
    try { d = +inst.duration() || 0; live = !!(inst.started && inst.started()); if (live) t = +inst.now() || 0; } catch (e) {}
    if (!(d > 0)) d = parseLen(v.len);
    if (!(d > 0)) return null;
    if (!live) { var pr = (AP.progress && AP.progress(v.id)) || {}; t = pr.watched ? d : Math.min(d, +pr.pos || 0); }
    t = Math.max(0, Math.min(d, t));
    var pct = Math.max(0, Math.min(100, Math.floor(t / d * 100)));
    return { t: t, d: d, pct: pct, left: d - t };
  };
  var line3 = function (f) { return f.pct + "% watched · " + (100 - f.pct) + "% left · " + fmt(f.left) + " left"; };
  var line2 = function (f) { return f.pct + "% watched · " + fmt(f.left) + " left"; };

  var paintLine = function (inst, S) {
    var f = figs(inst);
    if (!S.line.isConnected || (S.line.parentNode !== S.bar && !S.bar.contains(S.line))) place(inst, S);
    setCls(S.line, "is-empty", !f);
    if (!f) { setTxt(S.lineT, ""); return; }
    var w = S.bar.clientWidth || inst.root.clientWidth || 0;
    setTxt(S.lineT, w >= 360 ? line3(f) : line2(f));
    var wp = S.root.querySelector(".x-wh__prog");
    if (wp) {
      var want = f.t > 0 ? "Watched " + fmt(f.t) + " · " + f.pct + "%" : "";
      setTxt(wp, want);
      if (!wp.__f16) {
        wp.__f16 = true;
        /* watch-hub rewrites it on play-state changes; put the currentTime figure straight back */
        new MutationObserver(function () { var g = figs(inst); var x = g && g.t > 0 ? "Watched " + fmt(g.t) + " · " + g.pct + "%" : ""; if (wp.textContent !== x) wp.textContent = x; }).observe(wp, { childList: true, characterData: true, subtree: true });
      }
    }
  };
  var place = function (inst, S) {
    var row = S.bar.querySelector(".x-ap__seekrow");
    if (row && row.parentNode) { if (row.nextSibling !== S.line) row.parentNode.insertBefore(S.line, row.nextSibling); }
    else if (S.line.parentNode !== S.bar) S.bar.insertBefore(S.line, S.bar.firstChild);
  };

  /* ---------- 3. one speed state ---------- */
  var paintSpeed = function (inst, S, r) {
    var t = fmtR(r), mx = maxR();
    var s12 = inst.__s12;
    if (s12) {
      setTxt(s12.badgeN, t); setTxt(s12.btnN, t); setTxt(s12.popV, t);
      if (s12.range && doc.activeElement !== s12.range) { var vr = Math.max(0.25, Math.min(2, r)); if (+s12.range.value !== vr) s12.range.value = vr; s12.range.style.setProperty("--x-ap-pct", ((vr - 0.25) / 1.75 * 100) + "%"); }
      if (s12.pop) s12.pop.querySelectorAll('[data-s12="set"]').forEach(function (b) { var p = String(+b.dataset.r === r); if (b.getAttribute("aria-pressed") !== p) b.setAttribute("aria-pressed", p); });
    }
    S.root.querySelectorAll('[data-x="rate"][data-rate]').forEach(function (b) {
      var v = +b.getAttribute("data-rate"), p = String(v === r);
      if (b.getAttribute("aria-pressed") !== p) b.setAttribute("aria-pressed", p);
      b.hidden = v > mx;
    });
    S.root.querySelectorAll('[data-x="ratefine"]').forEach(function (fr) {
      if (String(fr.max) !== String(mx)) fr.max = String(mx);
      if (!fr.__f16) {
        fr.__f16 = true;
        fr.addEventListener("input", function () { var m = +fr.max || 2; fr.style.setProperty("--x-ap-pct", ((+fr.value - 0.25) / (m - 0.25) * 100) + "%"); });
      }
      if (doc.activeElement !== fr) {
        var v = Math.max(0.25, Math.min(mx, r));
        if (Math.abs(+fr.value - v) > 0.001) fr.value = String(v);
        fr.style.setProperty("--x-ap-pct", ((v - 0.25) / (mx - 0.25) * 100) + "%");
      }
      fr.setAttribute("aria-valuetext", fmtR(Math.max(0.25, Math.min(mx, r))));
    });
    S.root.querySelectorAll('.x-apx-menu [data-r="rate"]').forEach(function (o) { setTxt(o, t); });
    var sel = S.root.querySelector('select[data-r="speed"]');
    if (sel && [].some.call(sel.options, function (o) { return +o.value === r; }) && +sel.value !== r) sel.value = String(r);
  };
  var flash = function (S) {
    if (!S.badge()) return;
    setCls(S.badge(), "f16-flash", true);
    clearTimeout(S.flashT);
    S.flashT = setTimeout(function () { setCls(S.badge(), "f16-flash", false); }, 1500);
  };
  var setRate = function (inst, r) {
    r = rnd(Math.max(0.25, Math.min(maxR(), r)));
    try { inst.setRate(r); } catch (e) {}
    var S = inst.__f16; if (S) tick(inst, S, true);
  };

  /* ---------- 4. controls up: the bar is painted ---------- */
  var barUp = function (S) {
    if (!shown(S.bar)) return false;
    var cs = getComputedStyle(S.bar);
    return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.5;
  };

  var tick = function (inst, S, force) {
    if (!inst.root.isConnected) return;
    var r = 1;
    try { r = rnd(+inst.rate() || 1); } catch (e) {}
    if (!ext() && r > 2) { try { inst.setRate(2); } catch (e) {} r = 2; }
    if (force || r !== S.rate) {
      var changed = S.rate !== null && r !== S.rate;
      S.rate = r;
      paintSpeed(inst, S, r);
      if (changed || force) flash(S);
    }
    if (!shown(inst.root)) return;
    setCls(S.badge(), "f16-show", barUp(S) && !inst.root.classList.contains("is-native"));
    paintLine(inst, S);
    centrePlay(inst);
  };

  /* ---------- 6. poster Play centred in the picture above the caption ---------- */
  var centrePlay = function (inst) {
    var po = inst.root.querySelector(".x-ap__poster");
    if (!po || !shown(po)) return;
    var big = po.querySelector(".x-ap__big"); if (!big) return;
    var H = po.clientHeight; if (!H) return;
    var cap = po.querySelector(".x-ap__cap"), ch = cap && shown(cap) ? cap.offsetHeight : 0;
    var avail = Math.max(0, H - ch);
    var small = avail < 150;
    setCls(big, "f16-small", small);
    var size = big.offsetHeight || (small ? 48 : 64);
    var top = Math.max(size / 2 + 6, Math.round(avail / 2));
    var v = top + "px";
    if (big.style.getPropertyValue("top") !== v) big.style.setProperty("top", v, "important");
  };

  /* ---------- wire each player ---------- */
  var wire = function (inst) {
    var root = inst.root; if (!root || root.__f16w) return;
    var bar = inst.bar || root.querySelector(".x-ap__bar"); if (!bar) return;
    root.__f16w = true;
    var line = doc.createElement("div");
    line.className = "f16-prog is-empty";
    line.setAttribute("aria-hidden", "true");
    line.innerHTML = '<p class="f16-prog__t"></p>';
    var S = inst.__f16 = {
      root: root, bar: bar, line: line, lineT: line.querySelector(".f16-prog__t"), rate: null, flashT: 0,
      badge: function () { return root.querySelector(".s12-badge"); }
    };
    place(inst, S);
    insts.push(inst);
    if (inst.on) {
      try {
        inst.on("state", function () { tick(inst, S, false); });
        inst.on("change", function () { setTimeout(function () { tick(inst, S, false); }, 0); });
        inst.on("flash", function (k) { if (String(k).indexOf("rate:") === 0) setTimeout(function () { tick(inst, S, false); }, 0); });
      } catch (e) {}
    }
    tick(inst, S, false);
  };
  AP.onCreate(function (inst) { try { wire(inst); } catch (e) {} });

  /* the dock's line: the 2-part figure (the dock is under 360px wide) */
  var dockLine = function () {
    var e = popEl(); if (!e || !docked()) return;
    var m = e.querySelector(".x-dk__m"), inst = P.inst && P.inst(); if (!m || !inst) return;
    var f = figs(inst), want = f ? line2(f) : "0% watched";
    if (m.textContent !== want) m.textContent = want;
    if (!m.__f16) {
      m.__f16 = true;
      new MutationObserver(function () { if (!docked()) return; var g = figs(inst), x = g ? line2(g) : "0% watched"; if (m.textContent !== x) m.textContent = x; }).observe(m, { childList: true, characterData: true, subtree: true });
    }
  };

  /* ---------- 5 + 6. the window's shapes ---------- */
  var phoneShape = function () {
    if (!phone.matches || !popOpen() || inFs() || docked() || P.leaving()) return;
    if (P.isModal()) return;
    var d = DK(); if (d && d.minimise) d.minimise();
  };
  var paintPage = function () {
    var on = popOpen();
    setCls(docEl, "f16-pop", on);
    setCls(docEl, "f16-dock", on && docked());
  };

  setInterval(function () {
    insts.forEach(function (inst) { var S = inst.__f16; if (S) { try { tick(inst, S, false); } catch (e) {} } });
    if (!P) return;
    paintPage(); dockLine(); phoneShape();
  }, 250);
  if (phone.addEventListener) phone.addEventListener("change", phoneShape);

  /* Expand on a phone opens the centred window (the corner shape is the dock there) */
  window.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest('.x-dk [data-dk="expand"]');
    if (!b || !phone.matches || !P) return;
    var d = DK(); if (!d || !d.expand) return;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    d.expand();
    setTimeout(function () { if (popOpen() && !docked() && !P.isModal()) P.setModal(true); paintPage(); }, 0);
  }, true);

  /* a press outside the open player minimises it to the dock; the dock, the player's menus and openers are left alone */
  var MENUS = "dialog, .x-dd__menu, .x-apx-menu, .s12-pop, .g13-menu, [role='menu'], [role='listbox'], .x-dk";
  var OPENERS = "[data-watch], [data-play-here], [data-wh-play], [data-a='dockhere'], [data-a='pop']";
  doc.addEventListener("pointerdown", function (e) {
    if (!P || e.button > 0 || !popOpen() || docked() || P.isMin() || P.leaving() || inFs()) return;
    var el = popEl(), t = e.target;
    if (!t || !t.closest || el.contains(t)) return;
    if (t.closest(MENUS) || t.closest(OPENERS)) return;
    if (el.querySelector(".x-apx-menu:not([hidden]), .s12-pop:not([hidden])")) return; /* this press only closes the open menu */
    var d = DK(); if (d && d.minimise) d.minimise();
    paintPage();
  }, true);

  /* ---------- 3. keys: + = - * and the numpad, Shift + > / < ---------- */
  var typing = function (e) {
    var t = e.target, tag = t && t.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT") return !/^(range|checkbox|radio|button|submit)$/i.test(t.type || "");
    return !!(t && t.isContentEditable);
  };
  var modalDialog = function () {
    var ds = doc.querySelectorAll("dialog[open]");
    for (var i = 0; i < ds.length; i++) { try { if (ds[i].matches(":modal")) return true; } catch (x) { return true; } }
    return false;
  };
  var pick = function () {
    var vis = insts.filter(function (i) { return shown(i.root); }), a = doc.activeElement, i;
    for (i = 0; i < vis.length; i++) if (vis[i].root.classList.contains("is-fs") || vis[i].root.classList.contains("is-fsp")) return vis[i];
    for (i = 0; i < vis.length; i++) if (a && vis[i].root.contains(a)) return vis[i];
    if (popOpen() && P.inst && P.inst() && shown(P.inst().root)) return P.inst();
    for (i = 0; i < vis.length; i++) if (vis[i].isPlaying && vis[i].isPlaying()) return vis[i];
    for (i = 0; i < vis.length; i++) if (vis[i].started && vis[i].started()) return vis[i];
    return vis[0] || null;
  };
  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    var k = e.key, c = e.code;
    var shiftUp = k === ">" || (e.shiftKey && k === ".");
    var shiftDown = k === "<" || (e.shiftKey && k === ",");
    var up = shiftUp || k === "+" || k === "=" || c === "NumpadAdd";
    var down = shiftDown || k === "-" || k === "_" || k === "−" || c === "NumpadSubtract";
    var reset = k === "*" || c === "NumpadMultiply";
    if (!up && !down && !reset) return;
    if (typing(e) || modalDialog()) return;
    if (ext() && !shiftUp && !shiftDown) return; /* Extension mode: the extension takes + - * */
    var inst = pick(); if (!inst || !inst.__f16) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var r = +inst.rate() || 1;
    setRate(inst, reset ? 1 : r + (up ? stepR() : -stepR()));
  }, true);

  /* the shortcut sheets say so */
  var patchSheets = function () {
    doc.querySelectorAll("kbd:not([data-f16])").forEach(function (kb) {
      kb.setAttribute("data-f16", "");
      var tx = kb.textContent.replace(/\s+/g, " ").trim();
      var row = kb.closest("div, tr, li"), dd = row && row.querySelector("dd, td:last-child");
      if (!row || !dd || row.querySelectorAll("kbd").length > 2) return;
      if (tx === "+ / −" || tx === "+ / -") {
        kb.setAttribute("data-s12", "");
        kb.textContent = "+ / = / −";
        dd.textContent = "Faster or slower by the speed step, numpad too (0.25× – 2×)";
        var has = [].some.call(row.parentNode.querySelectorAll("kbd"), function (x) { return x.textContent.trim() === "*"; });
        if (!has) {
          var n = row.cloneNode(true), nk = n.querySelector("kbd"), nd = n.querySelector("dd, td:last-child");
          if (nk && nd) { nk.textContent = "*"; nk.setAttribute("data-f16", ""); nk.setAttribute("data-s12", ""); nd.textContent = "Speed back to 1×, numpad too"; row.parentNode.insertBefore(n, row.nextSibling); }
        }
        var hasW = [].some.call(row.parentNode.querySelectorAll("kbd"), function (x) { return x.textContent.trim() === "Shift + wheel"; });
        if (!hasW) {
          var w = row.cloneNode(true), wk = w.querySelector("kbd"), wd = w.querySelector("dd, td:last-child"), star = row.nextSibling;
          if (wk && wd) { wk.textContent = "Shift + wheel"; wk.setAttribute("data-f16", ""); wk.setAttribute("data-s12", ""); wd.textContent = "Change speed over the video"; row.parentNode.insertBefore(w, star ? star.nextSibling : null); }
        }
      } else if (tx === "*") dd.textContent = "Speed back to 1×, numpad too";
      else if (/^Shift \+ > \/ <$/.test(tx)) dd.textContent = "Faster or slower by the speed step, same as + / − (up to 2×; more with Extension mode)";
      else if (tx === "Esc") dd.textContent = "Close this sheet or a menu; leave fullscreen. It never closes the player";
    });
  };
  patchSheets();
  setInterval(patchSheets, 1000);

  /* ---------- 7. Esc never closes, docks or reshapes the window ---------- */
  window.addEventListener("keydown", function (e) {
    if ((e.key !== "Escape" && e.key !== "Esc") || !P) return;
    if (!popOpen() || inFs()) return;
    var inst = P.inst && P.inst(); if (!inst) return;
    var st = inst.state();
    var snap = { docked: docked(), modal: P.isModal(), wide: P.isWide(), min: P.isMin(), v: st.video, q: st.queue, i: st.index, t: st.time, playing: st.playing };
    var check = function (last) {
      if (!popOpen() || P.leaving()) {
        if (!last) return;
        if (!snap.v) return;
        if (P.leaving()) { setTimeout(function () { check(true); }, 120); return; }
        /* it closed: open it again in the same shape, at the same time */
        if (snap.modal && AP.watch) AP.watch(snap.v, { queue: snap.q, index: snap.i }); else AP.popout(snap.v, { queue: snap.q, index: snap.i });
        setTimeout(function () {
          var j = P.inst && P.inst(); if (!j) return;
          if (snap.wide && P.isModal()) P.setWide(true);
          if (snap.playing && j.playAt) j.playAt(snap.t);
          if (snap.docked && DK()) DK().minimise();
        }, 60);
        return;
      }
      var d = DK();
      if (snap.docked && !docked() && d) d.minimise();
      else if (!snap.docked && docked() && d) d.expand();
      else if (snap.modal && !P.isModal() && !docked()) { P.setModal(true); if (snap.wide) P.setWide(true); }
      else if (snap.modal && snap.wide && !P.isWide()) P.setWide(true);
    };
    setTimeout(function () { check(false); }, 0);
    setTimeout(function () { check(true); }, 300);
  }, true);

  paintPage();
})();
