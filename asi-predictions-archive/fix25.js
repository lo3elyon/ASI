/* fix25.js: batch 25, loaded last.
   1. Mark as watched: a check-circle on every talk card's thumbnail, in the player window's title bar and in the gear
      menu. One click stores the whole talk as watched (watched19 interval [0, len], c:1; the player's watched mark; the
      watch history with a timestamp), with no playback, scroll or layout change. A second click offers Mark as
      unwatched. A 5 s toast offers Undo. Media gets a Watched filter chip (all, watched only, hide watched).
   2. Trust and People: Full profile on every leaderboard row; the Trust detail gains Their talks, Predictions, In the
      archive and Related people; a person page of someone in trust.json gains a Trust score card.
   3. Logos: last-resort error net (tinted initials, never a broken image); the shapes and plates live in logos.js.
   4. History: every history entry carries an index (x25i) and its scroll position (x25y), so Back and Forward restore
      each step; search-result jumps push a step; a Back chip shows when there is a previous in-site step. This extends
      fix17's hand-written history by wrapping pushState and replaceState; no MutationObserver on the header nav. */
(function () {
  "use strict";
  var doc = document, AP = window.ArchivePlayer;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var read = function (id) { try { return (window.Hark && Hark.data ? Hark.data(id) : JSON.parse(doc.getElementById(id).textContent)) || null; } catch (e) { return null; } };
  var parseLen = function (t) { return t ? String(t).split(":").reduce(function (a, b) { return a * 60 + (+b || 0); }, 0) : 0; };
  var cssEsc = function (s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, "\\$&"); };
  var main = doc.querySelector("main.main");

  var VIDS = read("d-videos") || [], PEOPLE = read("d-people") || [], ENTRIES = read("d-entries") || [], PREDS = read("d-preds") || [];
  var TRUST = (read("d-trust") || {}).people || [];
  var VBY = {}; VIDS.forEach(function (v) { VBY[v.id] = v; });
  var PBY = {}; PEOPLE.forEach(function (p) { PBY[p.id] = p; });
  var dOf = function (v) { return v.d === "None" || v.d == null ? "" : String(v.d); };

  /* =====================================================================
     4 (first, so every later push goes through it). HISTORY
     ===================================================================== */
  var H = window.history, push0 = H.pushState, rep0 = H.replaceState;
  var cur = 0, born = Date.now(), restoring = 0, touchedAt = 0;
  var copy = function (st) { var o = {}; if (st && typeof st === "object") for (var k in st) o[k] = st[k]; return o; };
  var rep = function (st) { try { rep0.call(H, st, ""); } catch (e) {} };
  var saveY = function () {
    if (restoring > Date.now()) return;
    var st = copy(H.state);
    if (st.x25y === Math.round(window.scrollY) && st.x25i === cur) return;
    st.x25y = Math.round(window.scrollY); st.x25i = cur;
    rep(st);
  };
  H.pushState = function (st, t, url) {
    saveY();
    var ns = copy(st); delete ns.x25y; ns.x25i = cur + 1;
    var r = push0.call(H, ns, t, url);
    cur = ns.x25i; born = Date.now();
    setTimeout(paintBack, 0);
    return r;
  };
  H.replaceState = function (st, t, url) {
    var ns = st;
    if (st == null || typeof st === "object") {
      ns = copy(st);
      var old = H.state;
      if (typeof ns.x25i !== "number") ns.x25i = cur;
      if (typeof ns.x25y !== "number" && old && typeof old.x25y === "number") ns.x25y = old.x25y;
    }
    return arguments.length > 2 ? rep0.call(H, ns, t, url) : rep0.call(H, ns, t);
  };
  (function () { var st = copy(H.state); if (typeof st.x25i === "number") cur = st.x25i; else { st.x25i = 0; rep(st); } })();

  /* the reader's scroll is kept on the entry it belongs to: after scrolling stops, and on every click */
  var sT = 0;
  window.addEventListener("scroll", function () { clearTimeout(sT); sT = setTimeout(saveY, 350); }, { passive: true });
  window.addEventListener("click", saveY, true);
  window.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") saveY(); }, true);
  ["wheel", "touchstart", "pointerdown", "keydown"].forEach(function (t) { window.addEventListener(t, function () { touchedAt = Date.now(); }, { capture: true, passive: true }); });

  var lastNav = "";
  var onNav = function () {
    var st = H.state, key = location.href + "|" + (st && st.x25i);
    if (key === lastNav) return;
    if (st && typeof st.x25i === "number") {
      /* Back or Forward onto a step we know: put its scroll back once the routers have drawn it */
      cur = st.x25i; lastNav = key;
      var y = st.x25y, at = Date.now();
      if (typeof y === "number") {
        restoring = at + 900;
        var put = function () {
          if (touchedAt > at) return;
          if (window.XGoTo && XGoTo.stop) { try { XGoTo.stop(); } catch (e) {} }
          if (Math.abs(window.scrollY - y) > 1) { try { window.scrollTo({ top: y, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); } }
        };
        requestAnimationFrame(put); [90, 260, 520, 820].forEach(function (ms) { setTimeout(put, ms); });
      }
    } else {
      /* a new step made by a plain hash change (a link, location.hash =): number it */
      cur += 1; born = Date.now();
      var ns = copy(st); ns.x25i = cur; rep(ns);
      lastNav = location.href + "|" + cur;
    }
    setTimeout(paintBack, 0); setTimeout(paintBack, 200);
  };
  window.addEventListener("popstate", onNav);
  window.addEventListener("hashchange", onNav);

  /* Alt + Left / Right is the browser's Back / Forward: no player or carousel key handler may take it */
  window.addEventListener("keydown", function (e) {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable)) return;
    e.stopImmediatePropagation();
  }, true);

  /* search results and "Open in the archive" jumps: one step each. A jump made right after a hop home ("#/", made
     only to show the main page) replaces that hop, so Back goes to the page the reader was really on */
  var stepTo = function (hash) {
    if (location.hash === hash) return;
    var transient = Date.now() - born < 600 && (!location.hash || location.hash === "#/" || location.hash === "#");
    try {
      if (transient) { var st = copy(H.state); H.replaceState(st, "", hash); }
      else H.pushState({ x25j: 1 }, "", hash);
    } catch (e) {}
  };
  var wrapSite = function () {
    var S = window.ArchiveSite; if (!S || S.__x25) return;
    S.__x25 = 1;
    var ge = S.gotoEntry, gp = S.gotoPred;
    if (ge) S.gotoEntry = function (id) { stepTo("#e-" + id); return ge.apply(this, arguments); };
    if (gp) S.gotoPred = function (id) { stepTo("#p-" + id); return gp.apply(this, arguments); };
  };
  wrapSite();

  /* the Back chip */
  var BACK_IC = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var backBtn = function () { return '<button type="button" class="x25-back" data-x25back hidden>' + BACK_IC + "<span>Back</span></button>"; };
  var paintBack = function () {
    var has = cur > 0;
    var pv = doc.getElementById("person-view");
    if (pv && !pv.hidden) {
      var top = pv.querySelector(".x-pv__top");
      if (top && !top.querySelector("[data-x25back]")) top.insertAdjacentHTML("afterbegin", backBtn());
      if (top) top.classList.toggle("x25-hasback", has);
    }
    var pg = doc.getElementById("x-pages");
    if (pg && !pg.hidden) {
      var t2 = pg.querySelector(".x-pg__top");
      if (t2 && !t2.querySelector("[data-x25back]")) t2.insertAdjacentHTML("afterbegin", backBtn());
    }
    doc.querySelectorAll("[data-x25back]").forEach(function (b) { if (b.hidden === has) b.hidden = !has; });
  };
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-x25back]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    H.back();
  }, true);
  /* people.js and pages.js redraw their top row on every route; boot.js re-runs them through these hooks */
  ["XPeopleRoute", "XPagesRoute"].forEach(function (n) {
    var f = window[n]; if (typeof f !== "function") return;
    window[n] = function () { var r = f.apply(this, arguments); setTimeout(afterRoute, 0); return r; };
  });

  /* =====================================================================
     1. MARK AS WATCHED
     ===================================================================== */
  var W19 = function () { return window.XW19 || null; };
  var hub = function () { return window.ArchiveWatch || null; };
  var lenOf = function (id) { var v = VBY[id]; var s = v ? parseLen(v.len) : 0; if (!s && window.XDur && XDur.len) s = parseLen(XDur.len(id)); return s; };
  var isDone = function (id) {
    if (!id) return false;
    var p = AP && AP.position ? AP.position(id) : null;
    if (p && p.watched) return true;
    var w = W19(); return !!(w && w.done(id));
  };
  var vidOf = function (id) { return VBY[id] || { id: id, t: "", c: "" }; };

  var CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle class="x25-c" cx="12" cy="12" r="9"/><path class="x25-k" d="M8.2 12.3l2.5 2.5 5.1-5.3"/></svg>';
  var labels = function (on) { return on ? { tip: "Watched. Mark as unwatched", short: "Watched", row: "Mark as unwatched" } : { tip: "Mark as watched", short: "Mark as watched", row: "Mark as watched" }; };

  /* ---------- toast ---------- */
  var toastEl = null, toastT = 0, undoFn = null;
  var toast = function (text, undo) {
    if (!toastEl) {
      toastEl = doc.createElement("div"); toastEl.className = "x25-toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
      toastEl.innerHTML = '<span class="x25-toast__t"></span><span class="x25-toast__sep" aria-hidden="true">·</span><button type="button" class="x25-toast__u">Undo</button>';
      doc.body.appendChild(toastEl);
      toastEl.querySelector("button").addEventListener("click", function () {
        var f = undoFn; undoFn = null; hideToast(); if (f) f();
      });
    }
    toastEl.querySelector(".x25-toast__t").textContent = text;
    undoFn = undo;
    toastEl.classList.add("is-on");
    clearTimeout(toastT); toastT = setTimeout(hideToast, 5000);
  };
  var hideToast = function () { if (toastEl) toastEl.classList.remove("is-on"); undoFn = null; };

  /* ---------- the change itself ---------- */
  var snap = function (id) {
    var w = W19(), H2 = hub(), Wm = H2 && H2.history ? H2.history() : null, p = AP && AP.position ? AP.position(id) : { pos: 0, watched: false };
    return { w19: w ? w.raw(id) : null, pos: p.pos || 0, watched: !!p.watched, rec: Wm && Wm[id] ? JSON.parse(JSON.stringify(Wm[id])) : null };
  };
  var writeHist = function (id, fn) {
    var H2 = hub(); if (!H2 || !H2.history) return;
    var Wm = H2.history(); fn(Wm);
    if (H2.persist) H2.persist();
    if (H2.hold) H2.hold();
  };
  var setDone = function (id, on) {
    if (AP && AP.allowWrite) AP.allowWrite(id);
    var d = lenOf(id), w = W19(), v = vidOf(id);
    if (w) w.set(id, on, d);
    if (AP && AP.setWatched) AP.setWatched(id, on, 0);
    writeHist(id, function (Wm) {
      if (on) {
        var r = Wm[id] || (Wm[id] = { dur: 0, sec: 0, count: 0, first: Date.now() });
        r.last = Date.now(); r.marked = r.last; if (d) r.dur = d;
        r.title = v.t || r.title || ""; r.c = v.c || r.c || "";
      } else if (Wm[id] && Wm[id].marked && !(Wm[id].sec > 0)) delete Wm[id];
      else if (Wm[id]) delete Wm[id].marked;
    });
    paintId(id);
  };
  var restore = function (id, s) {
    if (AP && AP.allowWrite) AP.allowWrite(id);
    var w = W19(); if (w) w.restore(id, s.w19);
    if (AP && AP.setWatched) AP.setWatched(id, s.watched, s.pos);
    writeHist(id, function (Wm) { if (s.rec) Wm[id] = s.rec; else delete Wm[id]; });
    paintId(id);
  };
  var toggle = function (id) {
    if (!id) return;
    var was = isDone(id), s = snap(id);
    setDone(id, !was);
    toast(was ? "Marked as unwatched" : "Marked as watched", function () { restore(id, s); });
  };

  /* ---------- painting: every control and badge for one talk, in place ---------- */
  var paintBtn = function (b, on) {
    var L = labels(on);
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", L.tip); b.setAttribute("title", L.tip);
    var l = b.querySelector(".x25-mw__l, .x-apx-lbl"); if (l) l.textContent = b.classList.contains("x25-gearw") ? L.row : L.short;
  };
  var paintId = function (id) {
    var on = isDone(id), sel = cssEsc(id);
    doc.querySelectorAll('[data-x25w="' + sel + '"]').forEach(function (b) { paintBtn(b, on); });
    popPaint(); insts.forEach(gearPaint);
    /* Media badges and the Continue watching card, swapped in place (both are absolutely placed) */
    doc.querySelectorAll('[data-tv="' + sel + '"] .x-th__thumb').forEach(function (t) {
      var done = t.querySelector(".x-th__done"), bar = t.querySelector(".x-th__bar");
      if (on) { if (bar) bar.remove(); if (!done) t.insertAdjacentHTML("beforeend", '<span class="x-th__done">✓ Watched</span>'); }
      else if (done) done.remove();
    });
    doc.querySelectorAll('[data-cw-play="' + sel + '"] .x-cw__th').forEach(function (t) {
      var i = t.querySelector(".x-cw__bar i"), done = t.querySelector(".x-cw__done"), res = t.querySelector(".x-cw__res");
      if (on) { if (i) i.style.width = "100%"; if (res) res.outerHTML = '<span class="x-cw__done">✓ Watched</span>'; }
      else { if (i) i.style.width = "0%"; if (done) done.outerHTML = '<span class="x-cw__res">▶ Play</span>'; }
    });
    var w = W19(); if (w && w.repaint) w.repaint();
  };

  /* ---------- the card buttons ---------- */
  var HOSTS = ".x-th__thumb, .x-cw__th, .x-pv__th, .x25-tk__th";
  var RE = /(?:i\d?\.ytimg\.com\/vi(?:_webp)?|img\.youtube\.com\/vi)\/([^/?#]+)\//;
  var idFor = function (h) {
    var c = h.closest("[data-tv], [data-cw-play], [data-watch], [data-wv], [data-wh-play]");
    var id = c && (c.getAttribute("data-tv") || c.getAttribute("data-cw-play") || c.getAttribute("data-watch") || c.getAttribute("data-wv") || c.getAttribute("data-wh-play"));
    if (!id) { var im = h.querySelector("img"), m = im && RE.exec(im.getAttribute("src") || ""); id = m ? decodeURIComponent(m[1]) : ""; }
    return id;
  };
  var scan = function (root) {
    (root || doc).querySelectorAll(HOSTS).forEach(function (h) {
      if (h.__x25) return;
      var id = idFor(h); if (!id) return;
      h.__x25 = 1;
      if (getComputedStyle(h).position === "static") h.style.position = "relative";
      h.classList.add("x25-host");
      var on = isDone(id), L = labels(on);
      /* a span with the button role: these thumbnails sit inside card <button>s and <a>s, where a <button> may not go */
      h.insertAdjacentHTML("beforeend", '<span class="x25-mw' + (on ? " is-on" : "") + '" role="button" tabindex="0" data-x25w="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + esc(L.tip) + '" title="' + esc(L.tip) + '">' + CHECK + '<span class="x25-mw__l">Watched</span></span>');
    });
  };
  var hitCard = function (e) { return e.target.closest && e.target.closest(".x25-mw[data-x25w]"); };
  /* the press never reaches the card (no load, no play, no scroll): stopped in the window's capture phase */
  ["pointerdown", "mousedown", "touchstart"].forEach(function (t) {
    window.addEventListener(t, function (e) { if (hitCard(e)) e.stopPropagation(); }, { capture: true, passive: true });
  });
  window.addEventListener("click", function (e) {
    var b = hitCard(e); if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    toggle(b.getAttribute("data-x25w"));
  }, true);
  window.addEventListener("keydown", function (e) {
    var b = hitCard(e); if (!b || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!e.repeat) toggle(b.getAttribute("data-x25w"));
  }, true);
  window.addEventListener("keyup", function (e) { if (hitCard(e) && e.key === " ") { e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  /* new cards: scanned when their containers change (Media, the person page, Trust, the pages); never the header */
  var scanQ = 0;
  var queueScan = function () { if (!scanQ) scanQ = setTimeout(function () { scanQ = 0; scan(); }, 120); };
  if ("MutationObserver" in window) {
    var mo = new MutationObserver(queueScan);
    [main, doc.getElementById("person-view"), doc.getElementById("x-pages")].forEach(function (el) { if (el) mo.observe(el, { childList: true, subtree: true }); });
  }
  scan();

  /* ---------- the player window's title bar, and the gear menu of every player ---------- */
  var P = AP && AP._dock;
  var insts = [];
  var popEl = function () { return P && P.el ? P.el() : null; };
  var popInst = function () { return P && P.inst ? P.inst() : null; };
  var curOf = function (inst) { try { var v = inst && inst.current && inst.current(); return v ? String(v.id) : ""; } catch (e) { return ""; } };
  var popPaint = function () {
    var el = popEl(); if (!el) return;
    var tools = el.querySelector(".x-pop__tools"); if (!tools) return;
    var b = tools.querySelector(".x25-popw");
    if (!b) {
      b = doc.createElement("button"); b.type = "button"; b.className = "x-pop__i x25-popw"; b.innerHTML = CHECK;
      var x = tools.querySelector('[data-p="close"]'); tools.insertBefore(b, x || null);
    }
    var id = curOf(popInst());
    b.hidden = !id;
    if (id) paintBtn(b, isDone(id));
  };
  var gearPaint = function (inst) {
    if (!inst || !inst.root) return;
    var id = curOf(inst);
    inst.root.querySelectorAll(".x-apx-menu").forEach(function (m) {
      var b = m.querySelector(".x25-gearw");
      if (!b) {
        if (!m.querySelector('[data-x="loop"]')) return;
        b = doc.createElement("button"); b.type = "button"; b.className = "x-ap__b x25-gearw";
        b.innerHTML = CHECK + '<span class="x-apx-lbl">Mark as watched</span>';
        var more = m.querySelector(".f18-more");
        if (more) more.appendChild(b); else { var loop = m.querySelector('[data-x="loop"]'); loop.parentNode.insertBefore(b, loop.nextSibling); }
      }
      b.disabled = !id;
      paintBtn(b, !!id && isDone(id));
    });
  };
  if (AP && AP.onCreate) AP.onCreate(function (inst) {
    if (!inst || inst.__x25) return;
    inst.__x25 = 1; insts.push(inst);
    gearPaint(inst);
    if (inst.on) { try { inst.on("change", function () { setTimeout(function () { gearPaint(inst); if (inst.floating) popPaint(); }, 0); }); } catch (e) {} }
    if (inst.floating) popPaint();
  });
  if (P && P.on) { try { P.on("show", popPaint); } catch (e) {} }
  window.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".x25-popw, .x25-gearw"); if (!b || b.disabled) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var inst = b.classList.contains("x25-popw") ? popInst() : (function () { for (var i = 0; i < insts.length; i++) if (insts[i].root.contains(b)) return insts[i]; return null; })();
    toggle(curOf(inst));
  }, true);
  /* a talk watched to the end, or loaded into a player, updates every control */
  if (AP && AP.onWatched) AP.onWatched(function (id) { setTimeout(function () { doc.querySelectorAll('[data-x25w="' + cssEsc(id) + '"]').forEach(function (b) { paintBtn(b, true); }); popPaint(); insts.forEach(gearPaint); }, 0); });

  /* ---------- the Watched filter chip in Media ---------- */
  window.X25W = { isDone: isDone, toggle: toggle };
  var TH = window.ArchiveTheater, thHost = doc.getElementById("theater");
  if (TH && TH.filters && thHost) {
    var row = thHost.querySelector('[data-tf="cc"]'); row = row && row.parentNode;
    if (row) {
      var WF = ["Watched", "Watched only", "Hide watched"];
      var chipEl = doc.createElement("button");
      chipEl.type = "button"; chipEl.className = "x-f x25-wf"; chipEl.setAttribute("aria-pressed", "false"); chipEl.setAttribute("data-state", "0");
      chipEl.innerHTML = CHECK.replace('width="18" height="18"', 'width="14" height="14"') + " <span>Watched</span>";
      chipEl.setAttribute("title", "Show only watched talks, then hide them");
      row.appendChild(chipEl);
      var paintChip = function () {
        var s = TH.filters.w || 0;
        chipEl.setAttribute("data-state", String(s));
        chipEl.setAttribute("aria-pressed", String(s > 0));
        chipEl.querySelector("span").textContent = WF[s];
        chipEl.setAttribute("aria-label", s === 0 ? "Watched filter: off. Press to show only watched talks" : s === 1 ? "Watched filter: watched only. Press to hide watched talks" : "Watched filter: hiding watched talks. Press to show all");
        var cl = doc.getElementById("ttClear"); if (cl && s) cl.hidden = false;
      };
      chipEl.addEventListener("click", function (e) {
        e.preventDefault();
        TH.filters.w = ((TH.filters.w || 0) + 1) % 3;
        TH.refilter(); paintChip();
      });
      thHost.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("#ttClear, #ttReset")) { TH.filters.w = 0; paintChip(); }
      }, true);
      paintChip();
    }
  }
