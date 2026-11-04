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
    if (typeof st.x25i !== "number") return; /* a fresh step onNav has not numbered yet */
    if (st.x25y === Math.round(window.scrollY)) return;
    st.x25y = Math.round(window.scrollY);
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
    /* keep this entry's own number and scroll; an entry not numbered yet (a fresh hash step) stays unnumbered for onNav */
    var old = H.state;
    if ((st == null || typeof st === "object") && old && typeof old.x25i === "number") {
      ns = copy(st);
      if (typeof ns.x25i !== "number") ns.x25i = old.x25i;
      if (typeof ns.x25y !== "number" && typeof old.x25y === "number") ns.x25y = old.x25y;
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
    var home = !location.hash || location.hash === "#/" || location.hash === "#", s0 = H.state;
    var transient = home && (Date.now() - born < 600 || !(s0 && typeof s0.x25i === "number"));
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
  if (P && P.on) { try { P.on("open", function () { setTimeout(popPaint, 0); }); } catch (e) {} }
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

  /* =====================================================================
     2. TRUST AND PEOPLE
     ===================================================================== */
  var slug = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
  var PSLUG = {}, PNAME = {};
  PEOPLE.forEach(function (p) { PSLUG[slug(p.id)] = p.id; PSLUG[slug(p.name)] = p.id; PNAME[String(p.name || "").toLowerCase()] = p.id; });
  var TBY = {}, T2P = {}, P2T = {}, UNMATCHED = [];
  TRUST.forEach(function (t) {
    TBY[t.id] = t;
    var pid = PBY[t.id] ? t.id : PSLUG[slug(t.id)] || PSLUG[slug(t.name)] || PNAME[String(t.name || "").toLowerCase()] || null;
    if (pid) { T2P[t.id] = pid; P2T[pid] = t.id; } else UNMATCHED.push(t.id);
  });
  var DIMS = [["evidence", "Evidence", "ev"], ["logic", "Logic", "lo"], ["track_record", "Track record", "tr"], ["consistency", "Consistency", "co"], ["openness", "Openness", "op"]];
  var VS = { "Supported": "sup", "Partly supported": "part", "Too early": "early", "Unfalsifiable": "unf", "Unsupported": "uns", "Contradicted": "con" };
  var PS = { "Came true": "sup", "Came true early": "co", "Came true late": "part", "Partially true": "part", "Too early to tell": "early", "Not yet (deadline ahead)": "unf", "Wrong": "con" };
  var st = function (k) { return "--c: var(--x-tr-" + k + "); --ci: var(--x-tr-" + k + "-ink)"; };
  var fmt1 = function (n) { return (Math.round(n * 10) / 10).toFixed(1); };
  var ringK = function (v) { return v >= 7 ? "co" : v >= 6 ? "cy" : v >= 5 ? "ev" : v >= 4 ? "op" : "con"; };
  var ring = function (v) {
    return '<span class="x25-ring" style="' + st(ringK(v)) + '"><svg viewBox="0 0 60 60" aria-hidden="true"><circle class="bg" cx="30" cy="30" r="25" pathLength="100"/><circle class="fg" cx="30" cy="30" r="25" pathLength="100" stroke-dasharray="' + (v * 10).toFixed(1) + ' 100"/></svg><b>' + fmt1(v) + "</b></span>";
  };
  var bars = function (t) {
    return '<ul class="x25-bars">' + DIMS.map(function (d) {
      var s = +(t.scores && t.scores[d[0]] && t.scores[d[0]].score) || 0;
      return '<li style="' + st(d[2]) + '"><span>' + d[1] + '</span><span class="x25-bar" role="img" aria-label="' + d[1] + " " + fmt1(s) + ' out of 10"><i style="width:' + (s * 10).toFixed(1) + '%"></i></span><b>' + fmt1(s) + "</b></li>";
    }).join("") + "</ul>";
  };
  var verdicts = function (t, n) {
    var c = {}; (t.claims || []).forEach(function (x) { c[x.verdict] = (c[x.verdict] || 0) + 1; });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b); }).slice(0, n || 3).map(function (k) { return '<span class="x25-st" style="' + st(VS[k] || "unf") + '">' + esc(k) + " " + c[k] + "</span>"; }).join("");
  };
  var avatar = function (pid, name) {
    var p = PBY[pid] || { id: pid || slug(name), name: name, photo: "" };
    if (typeof window.XPeopleAvatar === "function") { try { return window.XPeopleAvatar(p, ""); } catch (e) {} }
    return '<span class="x-pav" aria-hidden="true"><span class="x-pav__ini">' + esc(window.XLogo && XLogo.initials ? XLogo.initials(name) : name.slice(0, 2)) + "</span></span>";
  };

  /* ---------- Full profile on every leaderboard row ---------- */
  var list = doc.getElementById("trList");
  var addProfiles = function () {
    if (!list) return;
    list.querySelectorAll(":scope > li.x-tr-row[data-id]").forEach(function (li) {
      if (li.querySelector(":scope > .x25-profrow")) return;
      var pid = T2P[li.getAttribute("data-id")]; if (!pid) return;
      var name = (TBY[li.getAttribute("data-id")] || {}).name || "";
      var d = doc.createElement("div"); d.className = "x25-profrow";
      d.innerHTML = '<a class="btn" href="#/person/' + esc(pid) + '" aria-label="Full profile: ' + esc(name) + '">Full profile</a>';
      var btn = li.querySelector(":scope > .x-tr-row__btn"); if (btn) btn.after(d); else li.appendChild(d);
    });
  };
  addProfiles();

  /* ---------- the Trust detail's extra sections ---------- */
  var talksOf = function (t) {
    var pid = T2P[t.id], nm = String(t.name || "").toLowerCase();
    return VIDS.filter(function (v) { return pid ? (v.p || []).indexOf(pid) >= 0 : String(v.t || "").toLowerCase().indexOf(nm) >= 0; })
      .sort(function (a, b) { var x = dOf(a), y = dOf(b); return (x ? 0 : 1) - (y ? 0 : 1) || (y < x ? -1 : y > x ? 1 : 0) || (a.id < b.id ? -1 : 1); });
  };
  var tk = function (v) {
    var date = AP && AP.fmtDate ? AP.fmtDate(dOf(v)) : dOf(v);
    return '<a class="x25-tk" href="#/watch/' + esc(v.id) + '" data-watch="' + esc(v.id) + '" data-title="' + esc(v.t) + '"><span class="x25-tk__th"><img src="https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg" alt="" width="320" height="180" loading="lazy" decoding="async" />' + (window.XDur ? XDur.html(v.id) : "") + '</span><span class="x25-tk__t">' + esc(v.t) + "</span><small>" + esc([v.c, date].filter(Boolean).join(" · ")) + "</small></a>";
  };
  var predsOf = function (t) { var nm = String(t.name || "").toLowerCase(); return PREDS.filter(function (r) { return String(r.who || "").toLowerCase().indexOf(nm) >= 0; }); };
  var entsOf = function (t) {
    var pid = T2P[t.id] || t.id;
    return ENTRIES.filter(function (e) { return (e.people_ids || []).indexOf(pid) >= 0; }).sort(function (a, b) { return (a.year || 0) - (b.year || 0) || (a.id < b.id ? -1 : 1); });
  };
  var relatedOf = function (t) {
    var pid = T2P[t.id], me = PBY[pid]; if (!me) return [];
    var org = window.XLogo && XLogo.slugOf ? XLogo.slugOf(me.org) : null;
    var ideas = {}; (me.key_ideas || []).forEach(function (k) { ideas[String(k).toLowerCase()] = 1; });
    return PEOPLE.filter(function (p) { return p.id !== pid; }).map(function (p) {
      var s = 0, why = [];
      var o2 = window.XLogo && XLogo.slugOf ? XLogo.slugOf(p.org) : null;
      if ((org && o2 === org) || (me.org && p.org === me.org)) { s += 3; why.push("same organisation"); }
      var shared = (p.key_ideas || []).filter(function (k) { return ideas[String(k).toLowerCase()]; });
      if (shared.length) { s += shared.length; why.push(shared.slice(0, 2).join(", ")); }
      return { p: p, s: s + (P2T[p.id] ? 0.5 : 0), why: why.join(" · ") };
    }).filter(function (x) { return x.s >= 1; }).sort(function (a, b) { return b.s - a.s || a.p.name.localeCompare(b.p.name); }).slice(0, 10);
  };
  var TALKS_PAGE = 6;
  var sec = function (h, n, body) { return '<section class="x25-sec"><h4>' + h + (n ? "<small>" + n + "</small>" : "") + "</h4>" + body + "</section>"; };
  var extras = function (t) {
    var talks = talksOf(t), preds = predsOf(t), ents = entsOf(t), rel = relatedOf(t), h = "";
    if (talks.length) h += sec("Their talks", talks.length + (talks.length === 1 ? " talk" : " talks"),
      '<div class="x25-tks" data-x25-talks="' + esc(t.id) + '" data-shown="' + Math.min(TALKS_PAGE, talks.length) + '">' + talks.slice(0, TALKS_PAGE).map(tk).join("") + "</div>" +
      (talks.length > TALKS_PAGE ? '<button type="button" class="btn x25-more" data-x25-more="' + esc(t.id) + '">Show more (' + (talks.length - TALKS_PAGE) + " left)</button>" : ""));
    if (preds.length) h += sec("Predictions", preds.length + " in the tracker", '<ul class="x25-list">' + preds.map(function (r) {
      return '<li><p>' + (r.prediction_verbatim ? "“" + esc(r.prediction) + "”" : esc(r.prediction)) + '</p><div class="x25-meta"><span class="x25-st" style="' + st(PS[r.status] || "unf") + '">' + esc(r.status) + "</span><span>Made " + esc(r.year_made) + "</span>" + (r.target_year ? "<span>Target " + esc(r.target_year) + "</span>" : "") +
        '<button type="button" class="btn" data-x25-pred="' + esc(r.id) + '">Open in the tracker</button></div></li>';
    }).join("") + "</ul>");
    if (ents.length) h += sec("In the archive", ents.length + (ents.length === 1 ? " entry" : " entries"), '<ul class="x25-list">' + ents.map(function (e) {
      return "<li>" + (e.quote ? "<blockquote>“" + esc(e.quote) + "”</blockquote>" : "<p>" + esc(e.summary || "") + "</p>") +
        '<div class="x25-meta"><span class="pill">' + esc(e.year || "") + "</span><span>" + esc(e.title || "") + '</span><button type="button" class="btn" data-x25-entry="' + esc(e.id) + '">Open entry</button></div></li>';
    }).join("") + "</ul>");
    if (rel.length) h += sec("Related people", "shared organisation or topics", '<div class="x25-chips">' + rel.map(function (x) {
      var tid = P2T[x.p.id], tt = tid && TBY[tid];
      return tid ? '<a class="x25-chip" href="#/trust/' + esc(tid) + '" data-tr-open="' + esc(tid) + '" title="' + esc(x.why) + '">' + avatar(x.p.id, x.p.name) + "<span>" + esc(x.p.name) + "</span><small>Trust " + fmt1(tt.overall) + "</small></a>"
        : '<a class="x25-chip" href="#/person/' + esc(x.p.id) + '" title="' + esc(x.why) + '">' + avatar(x.p.id, x.p.name) + "<span>" + esc(x.p.name) + "</span></a>";
    }).join("") + "</div>");
    return h ? '<div class="x25-trx">' + h + "</div>" : "";
  };
  var fillDetails = function () {
    if (!list) return;
    addProfiles();
    list.querySelectorAll(".x-tr-dwrap:not([hidden]) > .x-tr-det").forEach(function (det) {
      if (det.__x25) return;
      det.__x25 = 1;
      var id = det.parentNode.parentNode.getAttribute("data-id"), t = TBY[id]; if (!t) return;
      det.insertAdjacentHTML("afterbegin", '<p class="x25-backrow">' + backBtn() + "</p>");
      var acts = det.querySelector(".x-tr-det__acts");
      if (acts && T2P[id] && !acts.querySelector('a[href^="#/person/"]')) acts.insertAdjacentHTML("afterbegin", '<a class="btn" href="#/person/' + esc(T2P[id]) + '">Full profile</a>');
      det.insertAdjacentHTML("beforeend", extras(t));
      paintBack(); scan(det);
    });
  };
  if (list && "MutationObserver" in window) {
    var dq = 0;
    new MutationObserver(function () { if (!dq) dq = requestAnimationFrame(function () { dq = 0; fillDetails(); }); }).observe(list, { childList: true, subtree: true });
  }
  fillDetails();
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-x25-more], [data-x25-pred], [data-x25-entry]"); if (!b) return;
    e.preventDefault();
    var S = window.ArchiveSite;
    if (b.hasAttribute("data-x25-more")) {
      var t = TBY[b.getAttribute("data-x25-more")], box = b.parentNode.querySelector("[data-x25-talks]"); if (!t || !box) return;
      var all = talksOf(t), n = +box.getAttribute("data-shown") || 0, to = Math.min(all.length, n + TALKS_PAGE);
      box.insertAdjacentHTML("beforeend", all.slice(n, to).map(tk).join(""));
      box.setAttribute("data-shown", String(to));
      if (to >= all.length) b.remove(); else b.textContent = "Show more (" + (all.length - to) + " left)";
      scan(box);
    } else if (b.hasAttribute("data-x25-pred")) { if (S && S.gotoPred) S.gotoPred(b.getAttribute("data-x25-pred")); }
    else if (S && S.gotoEntry) S.gotoEntry(b.getAttribute("data-x25-entry"));
  });

  /* ---------- the Trust score card on a person page ---------- */
  var trustCard = function () {
    var pv = doc.getElementById("person-view"); if (!pv || pv.hidden) return;
    var m = /^#\/person\/([^/?#]+)/.exec(location.hash), pid = m && decodeURIComponent(m[1]), tid = pid && P2T[pid], t = tid && TBY[tid];
    var body = pv.querySelector(".x-pv__body"); if (!body || !t || body.querySelector(".x25-trcard")) return;
    var first = String(t.name).split(" ")[0];
    body.insertAdjacentHTML("afterbegin",
      '<section class="x25-trcard" aria-label="Trust score"><div class="x25-trcard__top">' + ring(+t.overall || 0) +
      '<div><p class="x25-eyebrow">Trust score</p><h2>' + fmt1(+t.overall || 0) + ' out of 10</h2><p class="fineprint">' + esc(t.best_for ? "Most reliable on: " + t.best_for : "") + "</p></div></div>" +
      bars(t) + '<p class="x25-verd"><span>Top verdicts on ' + esc(first) + "'s claims:</span> " + verdicts(t, 3) + "</p>" +
      '<div class="links"><a class="btn" href="#/trust/' + esc(tid) + '">Full trust record</a></div></section>');
  };
  var afterRoute = function () { trustCard(); paintBack(); scan(); };
  window.addEventListener("hashchange", function () { setTimeout(afterRoute, 0); });
  window.addEventListener("popstate", function () { setTimeout(afterRoute, 0); });
  afterRoute();
  window.addEventListener("load", function () { setTimeout(function () { wrapSite(); afterRoute(); }, 0); });

  /* =====================================================================
     3. LOGOS AND PORTRAITS: the last net under every inline onerror
     ===================================================================== */
  var isFace = function (im) {
    if (im.closest("#x-logo-imgs, .x-pv__bg")) return false;
    var s = im.getAttribute("src") || "";
    return /(^|\/)(logo-|portrait-)|\/people\//.test(s) || !!im.closest(".x-logo, .x-pav, .x-av, .x-ap__person, .x-wh__whoa, .x-wh__sphead, .compare__media, #gal");
  };
  window.addEventListener("error", function (e) {
    var im = e.target; if (!im || im.tagName !== "IMG" || !isFace(im)) return;
    var src = im.getAttribute("src");
    setTimeout(function () {
      if (!im.isConnected || im.getAttribute("src") !== src || (im.complete && im.naturalWidth > 0)) return;
      if (window.XLogo && XLogo.fail) XLogo.fail(im);
    }, 0);
  }, true);

  /* =====================================================================
     5. AUDIT HOOK: XAudit25() lists unmatched Trust people and the logo decisions
     ===================================================================== */
  window.XAudit25 = function () {
    var meta = window.XLogo && XLogo.meta || {};
    return {
      trustUnmatched: UNMATCHED.slice(),
      wideLogos: Object.keys(meta.aspect || {}).length, darkPlate: Object.keys(meta.dark || {}), missing: Object.keys(meta.missing || {}),
      markButtons: doc.querySelectorAll(".x25-mw").length, historyIndex: cur
    };
  };
})();

/* fix25 follow-up: A. Trust counters keep one width. B. Styled dropdowns (polish.js) work inside modal dialogs and
   stay open through scrolls that do not move them; XAudit25Controls() tests every select, menu and popover.
   No content-visibility, no contain-intrinsic-size (owner's 01:10 hotfix in fix24 stays as it is). */
(function () {
  "use strict";
  var doc = document;

  /* ---------- A. each counter is as wide as its final number, from the first frame ---------- */
  var sizeCounters = function () {
    doc.querySelectorAll("[data-tr-count]").forEach(function (el) {
      var n = String(el.getAttribute("data-tr-count") || "").length;
      if (n && el.style.minWidth !== n + "ch") el.style.minWidth = n + "ch";
    });
  };
  sizeCounters();
  window.addEventListener("load", sizeCounters);

  /* ---------- B. styled dropdowns ---------- */
  var menuOf = function () { return doc.querySelector(".x-dd__menu"); };
  var openBtn = function () { return doc.querySelector(".x-dd.is-open > .x-dd__btn"); };

  /* B1. polish.js puts the list on <body>, which a modal <dialog> (Customize: the voice pickers) makes inert and
     covers. When the button sits in an open dialog, the list moves into that dialog, at the same spot. */
  var relocate = function () {
    var m = menuOf(), b = openBtn(); if (!m || m.hidden || !b) return;
    var dlg = b.closest("dialog"); if (!dlg || !dlg.open || dlg.contains(m)) return;
    var top = parseFloat(m.style.top) || 0, left = parseFloat(m.style.left) || 0;
    dlg.appendChild(m);
    var r = m.getBoundingClientRect();
    if (Math.abs(r.top - top) > 1) m.style.top = Math.round(top + (top - r.top)) + "px";
    if (Math.abs(r.left - left) > 1) m.style.left = Math.round(left + (left - r.left)) + "px";
    try { m.focus({ preventScroll: true }); } catch (e) {}
  };
  var onOpener = function (e) {
    if (e.target && e.target.closest && e.target.closest(".x-dd__btn")) setTimeout(relocate, 0);
  };
  window.addEventListener("click", onOpener, true);
  window.addEventListener("keydown", onOpener, true);

  /* B2. polish.js closes the list on any scroll anywhere. A transcript that follows playback, a strip or a 1px
     scroll-anchoring nudge then shut it within a second. A scroll that leaves the button where the list was placed
     is now ignored by that check only; a scroll that moves the button still closes it. */
  var skipEv = null, patched = null;
  var patch = function (m) {
    if (!m || patched === m) return;
    patched = m;
    var own = Node.prototype.contains;
    m.contains = function (n) { return (skipEv !== null && window.event === skipEv) || own.call(this, n); };
  };
  var stillPlaced = function (m, b) {
    var r = b.getBoundingClientRect(); if (!r.width && !r.height) return false;
    var mr = m.getBoundingClientRect();
    return Math.abs(mr.top - (r.bottom + 6)) <= 6 || Math.abs(mr.bottom - (r.top - 6)) <= 6;
  };
  window.addEventListener("scroll", function (e) {
    skipEv = null;
    var m = menuOf(); if (!m || m.hidden) return;
    var b = openBtn(); if (!b) return;
    patch(m);
    if (stillPlaced(m, b)) skipEv = e;
  }, { capture: true, passive: true });

  /* ---------- B3. the control audit: window.XAudit25Controls() in the console ----------
     Every visible select: opens (the list is the top element at its own centre), changes (a new option is chosen
     and the button shows it), applies (a change event reaches the page's handlers); then its first value is put
     back. Every visible menu and popover: opens and closes. Hidden ones are listed as skipped (not in this view). */
  var visible = function (el) { return !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden"); };
  var topHit = function (el) {
    var r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
    var x = Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1), y = Math.min(Math.max(r.top + Math.min(20, r.height / 2), 0), window.innerHeight - 1);
    var h = doc.elementFromPoint(x, y); return !!(h && el.contains(h));
  };
  var nameOf = function (sel) {
    var l = sel.getAttribute("aria-label") || sel.id || sel.name || "";
    if (!l) { var a = sel.attributes; for (var i = 0; i < a.length; i++) if (/^data-/.test(a[i].name)) { l = a[i].name + "=" + a[i].value; break; } }
    return l || "select";
  };
  window.XAudit25Controls = function () {
    var rows = [];
    doc.querySelectorAll("select").forEach(function (sel) {
      var wrap = sel.closest(".x-dd"), btn = wrap && wrap.querySelector(".x-dd__btn");
      var row = { control: nameOf(sel), kind: "select", opens: false, changes: false, applies: false, status: "" };
      var face = btn || sel;
      if (!visible(face)) { row.status = "skipped (not on screen in this view)"; rows.push(row); return; }
      if (!btn) { row.status = "native select (not enhanced)"; rows.push(row); return; }
      var orig = sel.selectedIndex, fired = 0, onCh = function () { fired++; };
      var to = -1; for (var i = 0; i < sel.options.length; i++) if (i !== orig && !sel.options[i].disabled) { to = i; break; }
      /* switching the voice engine can start a model download: that one is tested for opening only */
      var openOnly = sel.matches("[data-vo-engine]");
      if (openOnly) { btn.click(); relocate(); var m0 = menuOf(); row.opens = !!(m0 && !m0.hidden && topHit(m0)); if (m0 && !m0.hidden) btn.click(); row.status = row.opens ? "pass (opens; value not switched in the audit)" : "FAIL"; rows.push(row); return; }
      sel.addEventListener("change", onCh);
      btn.click(); relocate();
      var m = menuOf();
      row.opens = !!(m && !m.hidden && topHit(m));
      if (m && !m.hidden && to >= 0) {
        var o = m.querySelector('[data-i="' + to + '"]'); if (o) o.click();
        row.changes = sel.selectedIndex === to && btn.textContent.trim() === sel.options[to].textContent.trim();
        row.applies = fired > 0;
      }
      if (m && !m.hidden) btn.click();
      if (sel.selectedIndex !== orig && orig >= 0) { sel.selectedIndex = orig; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      sel.removeEventListener("change", onCh);
      row.status = to < 0 ? (row.opens ? "pass (one option only)" : "FAIL") : (row.opens && row.changes && row.applies ? "pass" : "FAIL");
      rows.push(row);
    });
    var pair = function (label, opener, isOpen, close) {
      var b = [].filter.call(doc.querySelectorAll(opener), visible)[0] || null, row = { control: label, kind: "menu", opens: false, changes: null, applies: null, status: "" };
      if (!visible(b)) { row.status = "skipped (not on screen in this view)"; rows.push(row); return; }
      try { b.click(); row.opens = !!isOpen(); if (row.opens) { close(b); row.applies = !isOpen(); } } catch (e) { row.error = String(e); }
      row.status = row.opens && row.applies ? "pass" : "FAIL"; rows.push(row);
    };
    var shown = function (s) { return function () { var el = doc.querySelector(s); return !!(el && !el.hidden && el.getClientRects().length); }; };
    var reclick = function (b) { b.click(); };
    pair("Player gear menu", ".x-ap .x-apx-more", shown(".x-ap .x-apx-menu:not([hidden])"), reclick);
    pair("Player speed popover", '.x-ap [data-s12="open"]', shown(".x-ap .s12-pop:not([hidden])"), reclick);
    pair("Nav More menu", ".x-more__btn:not(.x-nav-ask)", shown(".x-more__menu:not([hidden])"), reclick);
    pair("Archive Filters", "#filtersBtn", function () { var b = doc.getElementById("filtersBtn"); return b && b.getAttribute("aria-expanded") === "true"; }, reclick);
    pair("Ask popover", "#askToggle", shown("#askPanel:not([hidden])"), function () { var h = doc.getElementById("askHide"); if (h) h.click(); });
    pair("Customize dialog", "[data-cz-open]", function () { var d = doc.querySelector("dialog.x-cz"); return !!(d && d.open); }, function () { var d = doc.querySelector("dialog.x-cz"); if (d) d.close(); });
    pair("Search palette", ".x-search-btn", function () { var d = doc.querySelector("dialog.x-cp"); return !!(d && d.open); }, function () { var d = doc.querySelector("dialog.x-cp"); if (d) d.close(); });
    (function () {
      var b = doc.getElementById("theme-btn"), row = { control: "Theme toggle", kind: "toggle", opens: null, changes: false, applies: false, status: "" };
      if (!visible(b)) { row.status = "skipped (not on screen in this view)"; rows.push(row); return; }
      var root = doc.documentElement, t0 = root.getAttribute("data-theme");
      b.click(); var t1 = root.getAttribute("data-theme"); row.changes = t1 !== t0; row.applies = row.changes;
      b.click(); row.status = row.changes && root.getAttribute("data-theme") === t0 ? "pass" : "FAIL"; rows.push(row);
    })();
    doc.querySelectorAll("details").forEach(function (d, i) {
      var s = d.querySelector(":scope > summary"), row = { control: "Disclosure: " + ((s && s.textContent.trim().slice(0, 40)) || d.id || "details " + i), kind: "details", opens: false, changes: null, applies: null, status: "" };
      if (!visible(s)) { row.status = "skipped (not on screen in this view)"; rows.push(row); return; }
      var was = d.open; s.click(); row.opens = d.open !== was; if (d.open !== was) s.click();
      row.status = row.opens && d.open === was ? "pass" : "FAIL"; rows.push(row);
    });
    var count = { pass: 0, fail: 0, skipped: 0 };
    rows.forEach(function (r) { if (/^pass/.test(r.status)) count.pass++; else if (/^FAIL/.test(r.status)) count.fail++; else count.skipped++; });
    return { route: location.hash || "#/", count: count, rows: rows };
  };
})();
