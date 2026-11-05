/* watched19.js: batch 19. Loaded last, after fix18.
   1. Theater (↔): one delegated capture-phase handler for every player: the in-page Media Theater player, the centred
      window, the corner window and the dock. From the in-page or corner player it opens the centred window, then wide.
      A second press restores the shape it came from. The T key takes the same path. aria-pressed and the tooltip follow.
   2. Real watched tracking: merged intervals per talk in localStorage "watched19:<id>", sampled every 250 ms while
      playing; seeks never count. Watched ranges on every seek bar, the dock line and talk thumbnails; a
      "Resume unwatched" button beside the watched line and in the gear menu. fix16's playhead figure is retired. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer, doc = document, docEl = doc.documentElement;
  if (!AP || !AP.onCreate) return;
  var P = AP._dock || null;
  var insts = [];
  var DK = function () { return window.XDock14 || null; };
  var setAttr = function (n, a, v) { if (n && n.getAttribute(a) !== v) n.setAttribute(a, v); };
  var setTxt = function (n, t) { if (n && n.textContent !== t) n.textContent = t; };
  var setCls = function (n, c, on) { if (n && n.classList.contains(c) !== !!on) n.classList.toggle(c, !!on); };
  var shown = function (n) { return !!(n && n.isConnected && n.getClientRects().length); };
  var parseLen = function (t) { return t ? String(t).split(":").reduce(function (a, b) { return a * 60 + (+b || 0); }, 0) : 0; };
  var fmt = function (s) { s = Math.max(0, Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = ("0" + (s % 60)).slice(-2); return h ? h + ":" + ("0" + m).slice(-2) + ":" + x : m + ":" + x; };
  var instOfRoot = function (root) { for (var i = 0; i < insts.length; i++) if (insts[i].root === root) return insts[i]; return null; };
  var popEl = function () { return P && P.el ? P.el() : null; };
  var popInst = function () { return P && P.inst ? P.inst() : null; };
  var docked = function () { var d = DK(); return !!(d && d.isDocked && d.isDocked()); };
  var popOpen = function () { var e = popEl(); return !!(P && e && !e.hidden && P.isOpen()); };
  var fsEl = function () { return doc.fullscreenElement || doc.webkitFullscreenElement || null; };

  /* =====================================================================
     1. THEATER
     ===================================================================== */
  var THSEL = '[data-a="theater"], .x-pop__tools [data-p="wide"]';
  var prev = null;      /* the shape to go back to: { k: "page" | "corner" | "modal" | "dock", ... } */
  var lastInst = null;  /* the player last pressed, for the T key */
  var busy = false;

  var wideNow = function () { return popOpen() && !docked() && P.isModal() && P.isWide(); };

  var closeOverlays = function () {
    doc.querySelectorAll(".x-apx-menu:not([hidden])").forEach(function (m) {
      var r = m.closest(".x-ap") || doc, b = m.id ? r.querySelector('[aria-controls="' + m.id + '"]') : null;
      if (b && b.getAttribute("aria-expanded") === "true") { try { b.click(); } catch (e) {} }
      if (!m.hidden) { m.hidden = true; if (b) b.setAttribute("aria-expanded", "false"); }
    });
    insts.forEach(function (i) {
      var s = i.__s12, pop = i.root && i.root.querySelector(".s12-pop:not([hidden])");
      if (pop && s && s.setOpen) { try { s.setOpen(false); } catch (e) {} }
    });
  };

  /* the header ↔ button runs the player's own wide switch, which also ends auto pop-out (so nothing docks it away) */
  var applyWide = function () {
    if (!P) return;
    if (P.isMin && P.isMin() && P.unMin) P.unMin();
    if (!P.isModal()) P.setModal(true);
    if (!P.isWide()) {
      var hb = popEl() && popEl().querySelector('.x-pop__tools [data-p="wide"]');
      if (hb) { busy = true; try { hb.click(); } catch (e) {} busy = false; }
      if (!P.isWide()) P.setWide(true);
    }
    var check = function () { if (popOpen() && !docked() && P.isModal() && !P.isWide()) P.setWide(true); sync(); };
    requestAnimationFrame(check); setTimeout(check, 260);
  };

  var enterFromPop = function () {
    if (docked()) {
      prev = { k: "dock" };
      var d = DK(); if (d && d.expand) d.expand();
    } else if (P.isModal()) prev = { k: "modal" };
    else prev = { k: "corner", w: P.S.w, corner: P.S.corner, x: P.S.x, y: P.S.y };
    applyWide();
  };

  var exitWide = function () {
    var p = prev || { k: "modal" }; prev = null;
    P.setWide(false);
    if (p.k === "page") { if (AP.dock) AP.dock(); }
    else if (p.k === "corner") {
      var mb = popEl() && popEl().querySelector('.x-pop__tools [data-p="mode"]');
      if (P.isModal() && mb) { busy = true; try { mb.click(); } catch (e) {} busy = false; }
      if (P.isModal()) P.setModal(false);
      if (p.corner !== undefined) { P.S.corner = p.corner; P.S.x = p.x; P.S.y = p.y; }
      if (p.w) P.setWidth(p.w);
      P.place(); requestAnimationFrame(function () { P.place(); P.ensureOnScreen(); });
    } else if (p.k === "dock") { var d = DK(); if (d && d.minimise) d.minimise(); }
  };

  var enterFromPage = function (inst) {
    if (inst.isWide && inst.isWide()) { inst.setWide(false); sync(); return; } /* the old in-page wide, left over */
    var st = inst.state(), v = st.video || (inst.current && inst.current()); if (!v) return;
    prev = { k: "page", src: inst };
    var pb = inst.root.querySelector('[data-a="pop"]');
    if (pb) { busy = true; try { pb.click(); } catch (e) {} busy = false; }
    if (!popOpen() && AP.watch) {
      var at = st.playing ? Math.max(0.01, st.time) : 0;
      try { inst.stop(); } catch (e) {}
      AP.watch(v, { queue: st.queue, index: st.index, at: at });
    }
    if (!popOpen()) { prev = null; return; }
    applyWide();
  };

  var theater = function (inst, fromDock, retried) {
    if (!P) { if (inst && inst.setWide) inst.setWide(!inst.isWide()); return; }
    var f = fsEl();
    if (!retried && (f || docEl.classList.contains("x-fsp-open"))) {
      if (f) { var ex = doc.exitFullscreen || doc.webkitExitFullscreen; try { var r = ex && ex.call(doc); if (r && r.catch) r.catch(function () {}); } catch (e) {} }
      insts.forEach(function (i) { if (i.exitPseudoFs) { try { i.exitPseudoFs(); } catch (e) {} } });
      setTimeout(function () { theater(inst, fromDock, true); }, 250);
      return;
    }
    closeOverlays();
    var pi = popInst();
    var onPop = fromDock || (inst && inst === pi) || (inst && inst.root && inst.root.classList.contains("is-out") && popOpen());
    if (onPop && popOpen()) {
      if (wideNow()) exitWide(); else enterFromPop();
    } else if (inst && !inst.floating) {
      enterFromPage(inst);
    }
    sync();
    setTimeout(sync, 80); setTimeout(sync, 320);
  };

  /* keep every ↔ in step: pressed, tooltip, label */
  var sync = function () {
    var on = wideNow(), tip = on ? "Exit theater mode (T)" : "Theater mode (T)";
    doc.querySelectorAll('[data-a="theater"]').forEach(function (b) {
      var inst = instOfRoot(b.closest(".x-ap"));
      var pressed = b.closest(".x-pop") ? on : !!(inst && inst.isWide && inst.isWide());
      var t = pressed ? "Exit theater mode (T)" : "Theater mode (T)";
      setCls(b, "s12-wide", true);
      setAttr(b, "aria-pressed", String(pressed));
      setAttr(b, "aria-label", t);
      setAttr(b, "data-tip", t);
      if (b.hasAttribute("title")) setAttr(b, "title", t);
      var l = b.querySelector(".x-apx-lbl");
      if (l) setTxt(l, b.classList.contains("x-apx-dup") ? t : (pressed ? "Exit theater" : "Theater"));
    });
    var hb = popEl() && popEl().querySelector('.x-pop__tools [data-p="wide"]');
    if (hb) { setAttr(hb, "aria-pressed", String(on)); setAttr(hb, "aria-label", tip); setAttr(hb, "title", tip); }
  };

  var ARROWS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>';
  /* the dock gets its own ↔, before Expand */
  var dockBtn = function () {
    var e = popEl(), bar = e && e.querySelector(".x-dk"); if (!bar || bar.querySelector('[data-a="theater"]')) return;
    var b = doc.createElement("button");
    b.type = "button"; b.className = "x-dk__b s12-wide w19-dkth"; b.setAttribute("data-a", "theater");
    b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", "Theater mode (T)"); b.setAttribute("title", "Theater mode (T)");
    b.innerHTML = ARROWS;
    var ex = bar.querySelector('[data-dk="expand"]'); bar.insertBefore(b, ex || null);
  };

  var hitBtn = function (t) {
    var b = t && t.closest ? t.closest(THSEL) : null; if (!b) return null;
    var e = popEl();
    if (e && e.contains(b)) return { b: b, inst: popInst(), dock: !!b.closest(".x-dk") };
    var inst = instOfRoot(b.closest(".x-ap"));
    return inst ? { b: b, inst: inst, dock: false } : null;
  };
  /* presses on ↔ never reach outside-press closers (dock14, fix16, speed12): the window capture phase runs first */
  ["pointerdown", "mousedown", "touchstart"].forEach(function (type) {
    window.addEventListener(type, function (e) {
      var h = hitBtn(e.target); if (!h) return;
      lastInst = h.inst;
      e.stopImmediatePropagation();
    }, { capture: true, passive: true });
  });
  window.addEventListener("click", function (e) {
    if (busy) return;
    var h = hitBtn(e.target); if (!h) return;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    lastInst = h.inst;
    theater(h.inst, h.dock);
  }, true);
  /* remember the player last pressed, for T */
  window.addEventListener("pointerdown", function (e) {
    var r = e.target && e.target.closest && e.target.closest(".x-ap");
    var i = r && instOfRoot(r); if (i) lastInst = i;
    else if (popEl() && popEl().contains(e.target)) lastInst = popInst();
  }, { capture: true, passive: true });

  var typing = function (e) {
    var t = e.target, tag = t && t.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT") return !/^(range|checkbox|radio|button|submit)$/i.test(t.type || "");
    return !!(t && t.isContentEditable);
  };
  var pickForKey = function () {
    if (popOpen()) return popInst();
    var a = doc.activeElement, vis = insts.filter(function (i) { return !i.floating && shown(i.root) && i.current && i.current(); }), k;
    for (k = 0; k < vis.length; k++) if (a && vis[k].root.contains(a)) return vis[k];
    if (lastInst && !lastInst.floating && vis.indexOf(lastInst) >= 0) return lastInst;
    for (k = 0; k < vis.length; k++) if (vis[k].isPlaying && vis[k].isPlaying()) return vis[k];
    for (k = 0; k < vis.length; k++) if (vis[k].started && vis[k].started()) return vis[k];
    return null;
  };
  window.addEventListener("keydown", function (e) {
    if (e.key !== "t" && e.key !== "T") return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || typing(e)) return;
    if (doc.querySelector("dialog[open]")) return;
    var inst = pickForKey(); if (!inst) return;
    e.preventDefault(); e.stopImmediatePropagation();
    theater(inst, docked());
  }, true);

  if (P && P.on) P.on("hide", function () { prev = null; setTimeout(sync, 0); });

  /* =====================================================================
     2. WATCHED TRACKING
     ===================================================================== */
  var KEY = "watched19:";
  var MEM = {};
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var lenOf = function (id) {
    var l = window.XDur && XDur.len ? XDur.len(id) : "";
    return parseLen(l);
  };
  /* stored as { r: [[s, e], …], d: duration, c: 1 when complete } */
  var rec = function (id) {
    if (!id) return null;
    if (MEM[id]) return MEM[id];
    var o = { r: [], d: 0, c: false, dirty: false, saved: 0 };
    var raw = lsGet(KEY + id);
    if (raw) {
      try {
        var j = JSON.parse(raw);
        var r = Array.isArray(j) ? j : (j && Array.isArray(j.r) ? j.r : []);
        o.r = r.filter(function (x) { return Array.isArray(x) && x.length === 2 && isFinite(x[0]) && isFinite(x[1]) && x[1] > x[0]; }).map(function (x) { return [+x[0], +x[1]]; });
        o.r = merge(o.r);
        if (j && !Array.isArray(j)) { o.d = +j.d || 0; o.c = !!j.c; }
      } catch (e) {}
    }
    return (MEM[id] = o);
  };
  var merge = function (r) {
    if (r.length < 2) return r.slice();
    var s = r.slice().sort(function (a, b) { return a[0] - b[0]; }), out = [[s[0][0], s[0][1]]];
    for (var i = 1; i < s.length; i++) {
      var last = out[out.length - 1];
      if (s[i][0] <= last[1] + 0.05) { if (s[i][1] > last[1]) last[1] = s[i][1]; }
      else out.push([s[i][0], s[i][1]]);
    }
    return out;
  };
  var sum = function (r) { var t = 0; for (var i = 0; i < r.length; i++) t += r[i][1] - r[i][0]; return t; };
  var save = function (id) {
    var o = MEM[id]; if (!o || !o.dirty) return;
    o.r = merge(o.r);
    var r = o.r.map(function (x) { return [Math.round(x[0] * 100) / 100, Math.round(x[1] * 100) / 100]; });
    var j = { r: r, d: Math.round(o.d * 100) / 100 }; if (o.c) j.c = 1;
    lsSet(KEY + id, JSON.stringify(j));
    o.dirty = false; o.saved = Date.now();
  };
  var saveAll = function () { for (var id in MEM) if (MEM[id].dirty) save(id); };
  var durOf = function (id, inst) {
    var o = rec(id), d = 0;
    if (inst) { try { var c = inst.current && inst.current(); if (c && c.id === id) d = +inst.duration() || 0; } catch (e) {} }
    if (d > 0 && o && Math.abs(o.d - d) > 0.5) { o.d = d; if (o.r.length) o.dirty = true; }
    if (!(d > 0)) d = (o && o.d) || 0;
    if (!(d > 0) && inst && inst.current && inst.current()) d = parseLen(inst.current().len);
    if (!(d > 0)) d = lenOf(id);
    return d;
  };
  /* the watched figures for a talk */
  var figs = function (id, inst) {
    var o = rec(id), d = durOf(id, inst);
    if (!o || !(d > 0)) return null;
    var w = Math.min(d, sum(o.r));
    if (!o.c && w / d >= 0.99) { o.c = true; o.dirty = true; save(id); }
    var pct = o.c ? 100 : Math.max(0, Math.min(99, Math.floor(w / d * 100)));
    return { d: d, w: w, pct: pct, left: Math.max(0, d - w), done: o.c, r: o.r };
  };
  var lineText = function (f) { return f.done ? "100% watched" : f.pct + "% watched · " + fmt(f.left) + " unwatched"; };
  /* the gaps, each at least a second long */
  var gaps = function (r, d) {
    var out = [], at = 0;
    for (var i = 0; i < r.length; i++) { if (r[i][0] - at >= 1) out.push([at, r[i][0]]); at = Math.max(at, r[i][1]); }
    if (d - at >= 1) out.push([at, d]);
    return out;
  };

  /* ---------- sampling: every 250 ms, only while playing ---------- */
  var sample = function (inst) {
    var S = inst.__w19; if (!S) return;
    var v = inst.current && inst.current(), id = v && v.id;
    if (id !== S.id) { if (S.id) save(S.id); S.id = id; S.prev = null; }
    var playing = false;
    try { playing = !!(id && inst.started && inst.started() && inst.state().playing); } catch (e) {}
    /* batch 36: the gap allowed between two samples follows the real time that passed (timers slow down when the
       page is busy or hidden) and any speed up to 16x (an extension can set speeds the site does not know about).
       Every seek the site makes clears S.prev (see wire), so skips never count. At the end the last stretch counts. */
    var wallS = S.pt ? (Date.now() - S.pt) / 1000 : 0.25, rt = 1;
    try { rt = Math.max(1, +inst.rate() || 1); } catch (e) {}
    var okGap = function (dt) { return dt > 0 && dt <= Math.max(rt * 1.6, 16) * Math.max(wallS, 0.05) + 0.5; };
    if (!playing) {
      try {
        if (S.prev != null && id) { var nE = +inst.now() || 0, dE = durOf(id, inst); if (dE > 0 && nE >= dE - 1.5 && okGap(nE - S.prev)) { var oE = rec(id); oE.r.push([S.prev, Math.min(dE, Math.max(nE, dE))]); oE.r = merge(oE.r); oE.dirty = true; } }
      } catch (e) {}
      if (S.was && S.id) save(S.id); S.was = false; S.prev = null; S.pt = 0; return;
    }
    S.was = true;
    var now = 0;
    try { now = +inst.now() || 0; } catch (e) { return; }
    var o = rec(id);
    if (S.prev != null) {
      var dt = now - S.prev;
      if (okGap(dt)) { o.r.push([S.prev, now]); o.r = merge(o.r); o.dirty = true; }
    }
    S.prev = now; S.pt = Date.now(); /* a jump either way is a seek: the next sample starts from here */
    if (o.dirty && Date.now() - o.saved >= 2000) { durOf(id, inst); save(id); }
  };

  /* ---------- painting the ranges ---------- */
  var paintRanges = function (host, f) {
    var key = f ? (f.done ? "done" : f.r.map(function (x) { return (x[0] / f.d * 1000 | 0) + "-" + (Math.ceil(x[1] / f.d * 1000)); }).join(",")) : "none";
    if (host.__w19k === key) return;
    host.__w19k = key;
    if (!f) { host.innerHTML = ""; return; }
    var segs = f.done ? [[0, f.d]] : f.r, h = "";
    for (var i = 0; i < segs.length; i++) {
      var l = Math.max(0, Math.min(100, segs[i][0] / f.d * 100)), w = Math.max(0, Math.min(100 - l, (segs[i][1] - segs[i][0]) / f.d * 100));
      if (w <= 0) continue;
      var bs = (10000 / Math.max(w, 0.01)).toFixed(2), bp = w >= 99.99 ? "0" : (l / (100 - w) * 100).toFixed(2);
      h += '<b style="left:' + l.toFixed(3) + "%;width:" + Math.max(w, 0.25).toFixed(3) + "%;background-size:" + bs + "% 100%;background-position:" + bp + '% 0"></b>';
    }
    host.innerHTML = h;
  };

  var RESUME_IC = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6v12"/><path d="M8 6l10 6-10 6z"/></svg>';
  var resume = function (inst) {
    var v = inst.current && inst.current(); if (!v) return;
    var f = figs(v.id, inst); if (!f) return;
    var g = gaps(rec(v.id).r, f.d);
    if (!g.length) { if (inst.say) inst.say("You have watched all of this talk"); return; }
    var t = 0; try { t = inst.started && inst.started() ? +inst.now() || 0 : 0; } catch (e) {}
    var to = null;
    for (var i = 0; i < g.length; i++) if (g[i][0] > t + 0.5) { to = g[i][0]; break; }
    if (to == null) to = g[0][0]; /* wrap to the first gap */
    if (inst.started && inst.started()) { inst.seekTo(to); if (inst.__w19) inst.__w19.prev = null; }
    else inst.playAt(to);
    if (inst.say) inst.say("Resuming unwatched part at " + fmt(to));
  };

  var placeLine = function (inst, S) {
    var row = S.bar.querySelector(".x-ap__seekrow");
    if (!row || !row.parentNode) { if (S.line.parentNode !== S.bar) S.bar.insertBefore(S.line, S.bar.firstChild); return; }
    var f16 = row.parentNode.querySelector(":scope > .f16-prog");
    var after = f16 && f16.previousSibling === row ? f16 : row;
    if (after.nextSibling !== S.line) row.parentNode.insertBefore(S.line, after.nextSibling);
    if (S.track.parentNode !== row) row.appendChild(S.track);
    var seek = row.querySelector(".x-ap__seek");
    if (seek && seek.offsetWidth) {
      var l = (seek.offsetLeft + 7) + "px", w = Math.max(0, seek.offsetWidth - 14) + "px";
      if (S.track.style.left !== l) S.track.style.left = l;
      if (S.track.style.width !== w) S.track.style.width = w;
    }
  };

  var gearBtn = function (inst) {
    inst.root.querySelectorAll(".x-apx-menu").forEach(function (m) {
      if (m.querySelector('[data-w19="resume"]') || !m.querySelector('[data-x="loop"]')) return;
      var b = doc.createElement("button");
      b.type = "button"; b.className = "x-ap__b w19-gear"; b.setAttribute("data-w19", "resume");
      b.innerHTML = RESUME_IC + '<span class="x-apx-lbl">Resume unwatched</span>';
      var more = m.querySelector(".f18-more");
      if (more) more.appendChild(b);
      else { var loop = m.querySelector('[data-x="loop"]'); loop.parentNode.insertBefore(b, loop.nextSibling); }
    });
  };

  var paintInst = function (inst) {
    var S = inst.__w19; if (!S || !inst.root.isConnected || !shown(inst.root)) return;
    placeLine(inst, S);
    var v = inst.current && inst.current(), f = v ? figs(v.id, inst) : null;
    setCls(S.line, "is-empty", !f);
    setTxt(S.lineT, f ? lineText(f) : "");
    paintRanges(S.trackIn, f);
    var g = f ? gaps(rec(v.id).r, f.d) : [];
    var dis = !f || !g.length;
    if (S.btn.disabled !== dis) S.btn.disabled = dis;
    inst.root.querySelectorAll(".w19-gear").forEach(function (b) { if (b.disabled !== dis) b.disabled = dis; });
    /* the side panel's figure: ours in place of the old one */
    var wp = inst.root.querySelector(".x-wh__prog");
    if (wp) {
      if (!S.whp || !S.whp.isConnected) { S.whp = doc.createElement("p"); S.whp.className = "w19-whp"; }
      if (wp.nextSibling !== S.whp) wp.parentNode.insertBefore(S.whp, wp.nextSibling);
      setTxt(S.whp, f && (f.w > 0 || f.done) ? lineText(f) : "");
    }
    gearBtn(inst);
  };

  var wire = function (inst) {
    if (!inst || !inst.root || inst.__w19) return;
    var bar = inst.bar || inst.root.querySelector(".x-ap__bar"); if (!bar) return;
    insts.push(inst);
    var line = doc.createElement("div");
    line.className = "w19-line is-empty";
    line.innerHTML = '<p class="w19-line__t"></p><button type="button" class="w19-resume" data-w19="resume" aria-label="Resume unwatched: jump to the next part you have not watched" title="Jump to the next part you have not watched">' + RESUME_IC + "<span>Resume unwatched</span></button>";
    var track = doc.createElement("span");
    track.className = "w19-track"; track.setAttribute("aria-hidden", "true");
    track.innerHTML = '<span class="w19-bar"></span>';
    inst.__w19 = { id: null, prev: null, was: false, bar: bar, line: line, lineT: line.querySelector(".w19-line__t"), btn: line.querySelector(".w19-resume"), track: track, trackIn: track.firstChild, whp: null };
    ["seekTo", "seek", "playAt"].forEach(function (k) { var f = inst[k]; if (typeof f !== "function") return; inst[k] = function () { if (inst.__w19) { inst.__w19.prev = null; inst.__w19.pt = 0; } return f.apply(this, arguments); }; });
    if (inst.on) {
      try {
        inst.on("state", function () { var S = inst.__w19; if (S.id && !inst.isPlaying()) { S.prev = null; save(S.id); } paintInst(inst); });
        inst.on("change", function () { var S = inst.__w19; if (S.id) save(S.id); S.prev = null; setTimeout(function () { paintInst(inst); }, 0); });
      } catch (e) {}
    }
    paintInst(inst);
  };
  AP.onCreate(function (inst) { try { wire(inst); } catch (e) {} });
  /* batch 36: a click on any seek bar or skip control, or a seek key, starts a fresh sample, so jumps never count as watched */
  var unseek = function () { insts.forEach(function (i) { if (i.__w19) { i.__w19.prev = null; i.__w19.pt = 0; } }); };
  doc.addEventListener("pointerdown", function (e) { if (e.target.closest && e.target.closest(".x-ap__seekrow, .x-ap__seek, .x-dk__line, [data-skip], [class*='skip'], .x-ch, .x-chap, [data-t]")) unseek(); }, true);
  doc.addEventListener("keydown", function (e) { if (/^(ArrowLeft|ArrowRight|j|l|J|L|Home|End|[0-9])$/.test(e.key)) unseek(); }, true);

  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest('[data-w19="resume"]'); if (!b || b.disabled) return;
    var inst = instOfRoot(b.closest(".x-ap")); if (!inst) return;
    e.preventDefault();
    resume(inst);
    setTimeout(function () { paintInst(inst); }, 60);
  });

  /* ---------- the dock: its own line and figure ---------- */
  var paintDock = function () {
    var e = popEl(); if (!e || !docked()) return;
    dockBtn();
    var inst = popInst(), v = inst && inst.current && inst.current(); if (!v) return;
    var f = figs(v.id, inst);
    var tx = e.querySelector(".x-dk__tx"), m = e.querySelector(".x-dk__m");
    if (tx) {
      var mine = tx.querySelector(".w19-dkm");
      if (!mine) { mine = doc.createElement("p"); mine.className = "w19-dkm"; if (m) m.after(mine); else tx.appendChild(mine); }
      setTxt(mine, f ? lineText(f) : "0% watched");
    }
    var ln = e.querySelector(".x-dk__line");
    if (ln) {
      var b = ln.querySelector(".w19-bar");
      if (!b) { b = doc.createElement("span"); b.className = "w19-bar"; ln.appendChild(b); }
      paintRanges(b, f);
    }
  };

  /* ---------- talk thumbnails: a thin bar along the foot ---------- */
  var SKIP = ".x-ap__cover, .x-ap__frame, .x-ap__upbg, .x-ap__poster, .x-bgl, #x-era-imgs, .x-qs";
  var RE = /(?:i\d?\.ytimg\.com\/vi(?:_webp)?|img\.youtube\.com\/vi)\/([^/?#]+)\//;
  var hostOf = function (img) {
    var p = img.parentElement; if (!p) return null;
    if (img.__w19h !== undefined && img.__w19h === p) return p;
    for (var i = 0; i < p.children.length; i++) {
      var c = p.children[i]; if (c === img || c.classList.contains("w19-tb")) continue;
      var pos = getComputedStyle(c).position;
      if (pos !== "absolute" && pos !== "fixed") { img.__w19h = null; return null; }
    }
    if (getComputedStyle(p).position === "static") p.classList.add("w19-host");
    img.__w19h = p; return p;
  };
  var any = false;
  var scanThumbs = function () {
    if (!any) return;
    doc.querySelectorAll('img[src*="ytimg.com/vi"], img[src*="img.youtube.com/vi"]').forEach(function (img) {
      var m = RE.exec(img.getAttribute("src") || ""); if (!m) return;
      var id = m[1]; try { id = decodeURIComponent(id); } catch (e) {}
      var p = img.parentElement, tb = p && p.querySelector(":scope > .w19-tb");
      var o = MEM[id] || (lsGet(KEY + id) ? rec(id) : null);
      var f = o && (o.r.length || o.c) ? figs(id, null) : null;
      if (!f || img.closest(SKIP)) { if (tb) tb.remove(); return; }
      var host = hostOf(img); if (!host) return;
      if (!tb) {
        tb = doc.createElement("span"); tb.className = "w19-tb"; tb.setAttribute("aria-hidden", "true");
        tb.innerHTML = '<span class="w19-bar"></span>'; host.appendChild(tb);
      }
      if (tb.getAttribute("data-id") !== id) { tb.setAttribute("data-id", id); tb.firstChild.__w19k = null; }
      tb.title = lineText(f);
      paintRanges(tb.firstChild, f);
    });
  };
  try { for (var i = 0; i < localStorage.length; i++) if ((localStorage.key(i) || "").indexOf(KEY) === 0) { any = true; break; } } catch (e) {}
  var thQ = 0;
  var queueThumbs = function () { if (!thQ) thQ = setTimeout(function () { thQ = 0; scanThumbs(); }, 300); };
  if ("MutationObserver" in window) new MutationObserver(function (recs) {
    for (var i = 0; i < recs.length; i++) for (var j = 0; j < recs[i].addedNodes.length; j++) {
      var n = recs[i].addedNodes[j]; if (n.nodeType === 1 && !(n.classList && n.classList.contains("w19-tb"))) { queueThumbs(); return; }
    }
  }).observe(doc.body || docEl, { childList: true, subtree: true });

  /* ---------- the loops ---------- */
  var n = 0;
  var loop19 = function () {
    n++;
    insts.forEach(function (inst) { try { sample(inst); if (inst.__w19.was) any = true; } catch (e) {} });
    if (n % 2 === 0) {
      insts.forEach(function (inst) { try { paintInst(inst); } catch (e) {} });
      try { paintDock(); } catch (e) {}
      try { sync(); } catch (e) {}
    }
    if (n % 8 === 0) { saveAll(); scanThumbs(); }
  };
  /* batch 24: only while a player is open (background playback still samples); when it stops, paint and save once */
  var last19 = function () {
    insts.forEach(function (inst) { try { paintInst(inst); } catch (e) {} });
    try { paintDock(); } catch (e) {}
    try { sync(); } catch (e) {}
    try { saveAll(); scanThumbs(); } catch (e) {}
  };
  if (window.XIdle) XIdle.every(loop19, 250, { final: last19 }); else setInterval(loop19, 250);

  var flush = function () {
    insts.forEach(function (inst) { var S = inst.__w19; if (S && S.id && S.was) { try { sample(inst); } catch (e) {} } });
    saveAll();
  };
  window.addEventListener("pagehide", flush);
  doc.addEventListener("visibilitychange", function () { if (doc.hidden) flush(); });
  if (P && P.on) P.on("hide", flush);

  /* batch 25: the watched store for "Mark as watched" (fix25.js). set(id, true, d) stores the whole [0, d] range as
     complete; set(id, false) clears it; raw/restore carry the stored string for Undo. Every bar repaints at once. */
  var repaint = function () {
    any = true;
    insts.forEach(function (inst) { try { paintInst(inst); } catch (e) {} });
    try { paintDock(); } catch (e) {}
    try { scanThumbs(); } catch (e) {}
  };
  window.XW19 = {
    done: function (id) { var raw = lsGet(KEY + id); if (!raw && !MEM[id]) return false; var o = rec(id); return !!(o && o.c); },
    figs: function (id) { return figs(id, null); },
    raw: function (id) { saveAll(); return lsGet(KEY + id); },
    set: function (id, on, d) {
      if (!id) return;
      if (on) {
        d = +d > 0 ? +d : durOf(id, null) || 1;
        MEM[id] = { r: [[0, d]], d: d, c: true, dirty: true, saved: 0 };
        save(id);
      } else {
        MEM[id] = { r: [], d: 0, c: false, dirty: false, saved: 0 };
        try { localStorage.removeItem(KEY + id); } catch (e) {}
      }
      insts.forEach(function (inst) { var S = inst.__w19; if (S && S.id === id) S.prev = null; });
      repaint();
    },
    restore: function (id, raw) {
      delete MEM[id];
      if (raw) lsSet(KEY + id, raw); else { try { localStorage.removeItem(KEY + id); } catch (e) {} }
      rec(id);
      repaint();
    },
    repaint: repaint
  };

  sync();
  setTimeout(scanThumbs, 800);
})();
