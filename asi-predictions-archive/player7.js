/* player7.js: Batch 7, loaded last.
   1. Pause = clean, real frame. Once a video has played, pausing keeps the live frame: no thumbnail, no tint.
      The centre icon shows on pause and fades after 1.5 s; the bar, seek bar, time chip and quick controls fade
      after 1.5 s without pointer movement (or at once when the pointer leaves), paused or playing; the cursor hides.
      While paused, YouTube's own pause overlays are cropped out of the frame (the same offset crop, just wider).
   2. Clean view: H, or the ⚙ menu. Hides every overlay until H or Esc.
   3. Captions drag anywhere inside the frame, above the click shield; double-click resets; saved.
   4. Picture: brightness, contrast, saturation and Reset picture in the ⚙ menu; saved.
   5. Source previews: a "Key points" list on every card, never repeating the summary.
   6. History mini-map: tick labels never overlap or clip. */
(function () {
  "use strict";
  var LS = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var IDLE = 1500;

  /* ============================== the player ============================== */
  var AP = window.ArchivePlayer;
  var insts = [];
  var instOf = function (el) { var r = el && el.closest ? el.closest(".x-ap") : null; for (var i = 0; i < insts.length; i++) if (insts[i].root === r) return insts[i]; return null; };

  /* ---------- picture settings, shared by every player ---------- */
  var PK = "asi.picture7", PDEF = { b: 100, c: 100, s: 100 };
  var PIC = (function () { var o = {}; try { o = JSON.parse(LS.get(PK)) || {}; } catch (e) {} return { b: clamp(+o.b || 100, 50, 150), c: clamp(+o.c || 100, 50, 150), s: clamp(o.s == null ? 100 : +o.s, 0, 200) }; })();
  var isDefPic = function () { return PIC.b === 100 && PIC.c === 100 && PIC.s === 100; };
  var paintPic = function () {
    var f = "brightness(" + PIC.b / 100 + ") contrast(" + PIC.c / 100 + ") saturate(" + PIC.s / 100 + ")";
    insts.forEach(function (i) {
      var r = i.root; if (!r) return;
      r.classList.toggle("x7-pic", !isDefPic());
      if (isDefPic()) r.style.removeProperty("--x7-filter"); else r.style.setProperty("--x7-filter", f);
    });
    document.querySelectorAll(".x7-picsec").forEach(function (sec) {
      ["b", "c", "s"].forEach(function (k) {
        var inp = sec.querySelector('[data-x7r="' + k + '"]'), out = sec.querySelector('[data-x7o="' + k + '"]');
        if (inp && +inp.value !== PIC[k]) inp.value = PIC[k];
        if (inp) inp.style.setProperty("--x-ap-pct", ((PIC[k] - +inp.min) / ((+inp.max - +inp.min) || 1) * 100) + "%");
        if (out) out.textContent = PIC[k] + "%";
      });
      var sum = sec.querySelector('[data-x7o="sum"]'); if (sum) sum.textContent = isDefPic() ? "Default" : "Custom";
      var rs = sec.querySelector('[data-x7="picreset"]'); if (rs) rs.disabled = isDefPic();
    });
  };

  /* ---------- caption position, shared by every player ---------- */
  var CK = "asi.capPos7";
  var CAP = (function () { var o = null; try { o = JSON.parse(LS.get(CK)); } catch (e) {} return o && isFinite(o.x) && isFinite(o.y) ? { x: clamp(o.x, 0.15, 0.85), y: clamp(o.y, 0.05, 0.95) } : null; })();
  var paintCapPos = function () {
    insts.forEach(function (i) {
      var cap = i.root && i.root.querySelector(".x-pn-cap"); if (!cap) return;
      cap.classList.toggle("x7-free", !!CAP);
      if (CAP) { cap.style.setProperty("--x7-cx", (CAP.x * 100).toFixed(2) + "%"); cap.style.setProperty("--x7-cy", (CAP.y * 100).toFixed(2) + "%"); }
      else { cap.style.removeProperty("--x7-cx"); cap.style.removeProperty("--x7-cy"); }
    });
  };

  /* position presets (player8.js): Top / Middle set a free position, Bottom clears it */
  window.X7Cap = {
    set: function (x, y) { CAP = { x: clamp(x, 0.15, 0.85), y: clamp(y, 0.05, 0.95) }; LS.set(CK, JSON.stringify(CAP)); paintCapPos(); },
    clear: function () { CAP = null; LS.del(CK); paintCapPos(); },
    get: function () { return CAP ? { x: CAP.x, y: CAP.y } : null; },
    paint: function () { paintCapPos(); }
  };

  var cleanCaps = LS.get("asi.cleanCaps7") === "1";

  var SVG_CLEAN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/></svg>';
  var SVG_CAP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M7 14.5h6M15 14.5h2M7 11h3M12 11h5"/></svg>';
  var menuHTML = function () {
    var sl = function (k, name, min, max) {
      return '<label class="x7-sl"><span class="x7-sl__n">' + name + '</span><input class="x-apx-range" type="range" min="' + min + '" max="' + max + '" step="5" value="' + PIC[k] + '" data-x7r="' + k + '" aria-label="' + name + '" /><output class="x7-sl__v" data-x7o="' + k + '">' + PIC[k] + "%</output></label>";
    };
    return '<div class="x-apx-sec x7-viewsec"><p class="x-apx-h">View</p>' +
        '<button class="x-ap__b" type="button" data-x7="clean" aria-pressed="false">' + SVG_CLEAN + '<span class="x-apx-lbl">Clean view (H)</span></button>' +
        '<button class="x-ap__b" type="button" data-x7="cleancaps" aria-pressed="' + cleanCaps + '">' + SVG_CAP + '<span class="x-apx-lbl">Captions in clean view</span></button>' +
      "</div>" +
      '<div class="x-apx-sec x7-picsec"><p class="x-apx-h">Picture <span class="x-apx-abtx" data-x7o="sum">Default</span></p>' +
        sl("b", "Brightness", 50, 150) + sl("c", "Contrast", 50, 150) + sl("s", "Saturation", 0, 200) +
        '<button class="x-ap__b x7-picreset" type="button" data-x7="picreset">Reset picture</button>' +
      "</div>";
  };

  var wire = function (inst) {
    var root = inst.root, screen = inst.screen, bar = inst.bar || root.querySelector(".x-ap__bar");
    var wrap = root.querySelector(".x-ap__wrap");
    if (!root || !screen || !wrap || root.__x7) return;
    root.__x7 = true;
    var played = false, ended = false, restT = 0;
    var S = inst.__x7 = { clean: false };

    /* --- the toast --- */
    var toast = document.createElement("div");
    toast.className = "x7-toast"; toast.setAttribute("role", "status"); toast.setAttribute("aria-live", "polite");
    screen.appendChild(toast);
    var toastT = 0;
    var showToast = function (t) {
      toast.textContent = t; toast.classList.add("is-on");
      clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove("is-on"); }, 1000);
    };

    /* --- rest: everything over the picture fades after 1.5 s without pointer movement --- */
    var siteMode = function () { return root.classList.contains("is-started") && !root.classList.contains("is-native") && !root.classList.contains("is-basic"); };
    var keep = function () {
      if (!siteMode() || ended || S.dragging) return true;
      if (root.querySelector('.x-apx-menu:not([hidden]), .x-dd__btn[aria-expanded="true"], [data-x="more"][aria-expanded="true"]')) return true;
      if (bar && bar.matches(":hover")) return true;
      /* paused: focus left on a bar button (Space on ▶) never holds the controls up */
      if (!root.classList.contains("is-playing")) return false;
      var a = document.activeElement;
      if (a && bar && bar.contains(a)) { try { if (a.matches(":focus-visible")) return true; } catch (e) {} }
      return false;
    };
    var rest = function () {
      clearTimeout(restT); restT = 0;
      if (keep()) { if (siteMode() && !ended) restT = setTimeout(rest, IDLE); return; }
      root.classList.add("x7-rest");
    };
    var wake = function () {
      root.classList.remove("x7-rest");
      clearTimeout(restT); restT = setTimeout(rest, IDLE);
    };
    S.wake = wake;
    /* only real movement wakes: layout changes under a still pointer never bring the controls back */
    var px = -1, py = -1;
    wrap.addEventListener("pointermove", function (ev) {
      if (ev.pointerType === "touch") return;
      if (Math.abs(ev.clientX - px) < 1 && Math.abs(ev.clientY - py) < 1) return;
      px = ev.clientX; py = ev.clientY; wake();
      /* x7-wake brings the paused icon back; when it drops, the 1.5 s fade starts over */
      root.classList.add("x7-wake");
      clearTimeout(S.wakeT); S.wakeT = setTimeout(function () { root.classList.remove("x7-wake"); }, 200);
    });
    wrap.addEventListener("pointerdown", wake);
    wrap.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "touch") return; if (!keep()) rest(); });
    if (bar) bar.addEventListener("focusin", wake);
    root.addEventListener("focusout", function () { setTimeout(function () { if (!root.contains(document.activeElement)) { clearTimeout(restT); restT = setTimeout(rest, IDLE); } }, 0); });

    /* --- the paused frame: is it a real frame (played before, not ended)? --- */
    var cropFits = function () {
      /* the wider crop keeps the picture exactly in place only when the iframe stays width-limited */
      var w = screen.clientWidth, h = screen.clientHeight;
      root.classList.toggle("x7-crop", !!w && h + 120 >= w * 9 / 16 - 1);
    };
    var painting = false;
    var paintLive = function () {
      if (painting) return;
      painting = true;
      try { paintLive0(); } finally { painting = false; }
    };
    var paintLive0 = function () {
      var started = root.classList.contains("is-started");
      var playing = root.classList.contains("is-playing");
      if (started && playing) played = true;
      try { var st = inst.state && inst.state(); if (st && st.playing) played = true; } catch (e) {}
      if (S.has) played = true;
      root.classList.toggle("x7-hasplayed", !!S.has);
      var live = started && played && !playing && !ended && !root.classList.contains("is-native") && !root.classList.contains("is-basic");
      var was = root.classList.contains("x7-live");
      root.classList.toggle("x7-played", played);
      root.classList.toggle("x7-live", live);
      if (live) cropFits();
      if (live !== was || playing !== S.playing) {
        S.playing = playing;
        if (started) wake(); /* on pause the icon shows, then everything fades 1.5 s later */
      }
      if (!started) { root.classList.remove("x7-rest"); clearTimeout(restT); }
    };
    /* react only to the player's own state classes, never to the x7-* classes set here */
    var strip7 = function (c) { return String(c || "").split(/\s+/).filter(function (x) { return x && x.indexOf("x7-") !== 0; }).sort().join(" "); };
    if ("MutationObserver" in window) new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) if (strip7(recs[i].oldValue) !== strip7(root.getAttribute("class"))) { paintLive(); return; }
    }).observe(root, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
    if (inst.on) {
      /* x7-hasplayed: YouTube reported PLAYING for this video; cleared only on a new video or at the end */
      inst.on("state", function (s) {
        if (s === 0) { ended = true; S.has = false; played = false; }
        else if (s === 1) { ended = false; S.has = true; played = true; }
        paintLive();
      });
      inst.on("change", function (v) {
        var id = v && v.id != null ? String(v.id) : null;
        if (id !== null && id === S.lastId) return;
        S.lastId = id; S.has = false; played = false; ended = false; paintLive();
      });
      inst.on("key", function (ev) {
        if ((ev.key === "h" || ev.key === "H") && !ev.shiftKey) { setClean(!S.clean); return true; }
        return false;
      });
    }
    window.addEventListener("resize", function () { if (root.classList.contains("x7-live")) cropFits(); }, { passive: true });

    /* --- clean view --- */
    var setClean = S.setClean = function (on) {
      on = !!on;
      if (S.clean === on) return;
      S.clean = on;
      root.classList.toggle("x7-clean", on);
      root.querySelectorAll('[data-x7="clean"]').forEach(function (b) { b.setAttribute("aria-pressed", String(on)); });
      if (on) {
        var mb = root.querySelector('[data-x="more"][aria-expanded="true"]'); if (mb) mb.click();
        var a = document.activeElement;
        if (a && bar && bar.contains(a) && a.blur) a.blur();
        showToast("Clean view – press H to exit");
      } else {
        toast.classList.remove("is-on");
        wake();
      }
    };
    root.classList.toggle("x7-cleancaps", cleanCaps);
    /* the shortcut sheet lists H */
    var dl = inst.sheet && inst.sheet.querySelector("dl");
    if (dl && !dl.querySelector(".x7-hk")) {
      var row = document.createElement("div"); row.className = "x7-hk";
      row.innerHTML = "<dt><kbd>H</kbd></dt><dd>Clean view: hide every control over the video (H or Esc to exit)</dd>";
      var last = dl.lastElementChild; dl.insertBefore(row, last || null);
    }

    /* --- ⚙ menu: View and Picture --- */
    var tries = 0;
    var addMenu = function () {
      var menu = root.querySelector(".x-apx-menu");
      if (!menu) { if (++tries < 20) setTimeout(addMenu, 150); return; }
      if (menu.querySelector(".x7-picsec")) return;
      var slot = menu.querySelector('[data-slot="top"]');
      if (slot) slot.insertAdjacentHTML("beforebegin", menuHTML()); else menu.insertAdjacentHTML("beforeend", menuHTML());
      paintPic();
    };
    addMenu();
    /* a menu built or rebuilt later still gets Picture: check each time ⚙ opens */
    root.addEventListener("click", function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('[data-x="more"]')) { tries = 19; addMenu(); }
    }, true);
  };

  /* menu actions */
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-x7]"); if (!b) return;
    var k = b.getAttribute("data-x7"), inst = instOf(b);
    if (k === "clean" && inst && inst.__x7) { inst.__x7.setClean(!inst.__x7.clean); }
    else if (k === "cleancaps") {
      cleanCaps = !cleanCaps; LS.set("asi.cleanCaps7", cleanCaps ? "1" : "0");
      document.querySelectorAll('[data-x7="cleancaps"]').forEach(function (x) { x.setAttribute("aria-pressed", String(cleanCaps)); });
      insts.forEach(function (i) { i.root.classList.toggle("x7-cleancaps", cleanCaps); });
    }
    else if (k === "picreset") { PIC = { b: PDEF.b, c: PDEF.c, s: PDEF.s }; LS.del(PK); paintPic(); }
  });
  document.addEventListener("input", function (ev) {
    var t = ev.target; if (!t || !t.matches || !t.matches("[data-x7r]")) return;
    PIC[t.getAttribute("data-x7r")] = +t.value;
    if (isDefPic()) LS.del(PK); else LS.set(PK, JSON.stringify(PIC));
    paintPic();
  });
  /* Esc leaves clean view before any other Esc handler closes the window or leaves Theater */
  window.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape" && ev.key !== "Esc") return;
    if (document.querySelector("dialog[open]")) return;
    var hit = insts.filter(function (i) { return i.__x7 && i.__x7.clean; });
    if (!hit.length) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    hit.forEach(function (i) { i.__x7.setClean(false); });
  }, true);
  /* leaving fullscreen (the browser eats that Esc) leaves clean view too */
  var onFs = function () {
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    insts.forEach(function (i) { if (i.__x7 && i.__x7.clean) i.__x7.setClean(false); });
  };
  document.addEventListener("fullscreenchange", onFs);
  document.addEventListener("webkitfullscreenchange", onFs);

  /* ---------- 3. caption drag: caught on the way down, before the shield, the cover or the old handler ---------- */
  var drag = null, lastTap = { t: 0, inst: null }, tapT = 0;
  var capHit = function (x, y) {
    for (var i = 0; i < insts.length; i++) {
      var r = insts[i].root; if (!r || !r.isConnected) continue;
      var win = r.querySelector(".x-pn-cap__win");
      if (!win || !win.textContent.trim() || !win.getClientRects().length) continue;
      var cs = window.getComputedStyle(win.parentNode);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
      var b = win.getBoundingClientRect();
      if (x >= b.left - 4 && x <= b.right + 4 && y >= b.top - 4 && y <= b.bottom + 4) return { inst: insts[i], win: win, cap: win.parentNode, rect: b };
    }
    return null;
  };
  window.addEventListener("pointerdown", function (ev) {
    if (ev.button !== 0 || drag) return;
    /* only a press that lands on the caption itself is a drag: the cover, the big button and the bar keep their clicks */
    var tg = ev.target && ev.target.closest ? ev.target : null;
    if (!tg || !tg.closest(".x-pn-cap") || tg.closest(".x8-cp, .x-ap__big, .x-ap__bar, [data-x=\"cc\"]")) return;
    var h = capHit(ev.clientX, ev.clientY); if (!h) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    try { h.win.setPointerCapture(ev.pointerId); } catch (e) {}
    drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, dx: ev.clientX - (h.rect.left + h.rect.width / 2), dy: ev.clientY - (h.rect.top + h.rect.height / 2), moved: false, h: h };
    if (h.inst.__x7) { h.inst.__x7.dragging = true; h.inst.__x7.wake(); }
  }, true);
  window.addEventListener("pointermove", function (ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    ev.stopImmediatePropagation();
    if (!drag.moved && Math.abs(ev.clientX - drag.x0) < 5 && Math.abs(ev.clientY - drag.y0) < 5) return;
    if (!drag.moved) { drag.moved = true; drag.h.cap.classList.add("is-drag", "x7-dragging"); }
    var sc = drag.h.inst.screen, r = sc.getBoundingClientRect(); if (!r.width || !r.height) return;
    var hh = drag.h.win.offsetHeight / 2 / r.height + 0.02;
    var x = clamp((ev.clientX - drag.dx - r.left) / r.width, 0.15, 0.85);
    var y = clamp((ev.clientY - drag.dy - r.top) / r.height, Math.max(0.05, hh), Math.min(0.95, 1 - hh));
    CAP = { x: x, y: y }; paintCapPos();
  }, true);
  var endDrag = function (ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    ev.stopImmediatePropagation();
    var d = drag; drag = null;
    if (d.h.inst.__x7) { d.h.inst.__x7.dragging = false; d.h.inst.__x7.wake(); }
    d.h.cap.classList.remove("is-drag", "x7-dragging");
    try { d.h.win.releasePointerCapture(ev.pointerId); } catch (e) {}
    if (d.moved) { LS.set(CK, JSON.stringify(CAP)); return; }
    if (ev.type !== "pointerup") return;
    /* a tap plays or pauses, like the rest of the picture; a second tap within 300 ms is a double-click: reset */
    var now = Date.now();
    if (now - lastTap.t < 300 && lastTap.inst === d.h.inst) {
      clearTimeout(tapT); tapT = 0; lastTap.t = 0;
      CAP = null; LS.del(CK); paintCapPos();
      return;
    }
    lastTap = { t: now, inst: d.h.inst };
    clearTimeout(tapT);
    tapT = setTimeout(function () { tapT = 0; if (d.h.inst.toggle) d.h.inst.toggle(); }, 300);
  };
  window.addEventListener("pointerup", endDrag, true);
  window.addEventListener("pointercancel", endDrag, true);
  /* the click and double-click that follow a caption tap never reach the shield */
  ["click", "dblclick"].forEach(function (t) {
    window.addEventListener(t, function (ev) {
      var tg = ev.target && ev.target.closest ? ev.target : null;
      if (tg && tg.closest(".x-pn-cap__win") && !tg.closest(".x-ap__big, .x-ap__bar")) { ev.stopImmediatePropagation(); ev.preventDefault(); }
    }, true);
  });

  if (AP && AP.onCreate) {
    AP.onCreate(function (inst) {
      if (!inst || !inst.root || insts.indexOf(inst) >= 0) return;
      insts.push(inst);
      try { wire(inst); } catch (e) {}
      paintPic(); paintCapPos();
      /* the caption block is built by player-notes.js; position it once it exists */
      var n = 0, t = setInterval(function () { if (inst.root.querySelector(".x-pn-cap") || ++n > 20) { clearInterval(t); paintCapPos(); } }, 250);
    });
  }

  /* ============================== 5. source previews: Key points on every card ============================== */
  (function () {
    var read = function (id) { try { return (window.Hark && Hark.data(id)) || null; } catch (e) { return null; } };
    var cut = function (s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
    var norm = function (u) { return window.XSrcPrev && XSrcPrev.norm ? XSrcPrev.norm(u) : String(u || "").toLowerCase(); };
    var PREV = null, CTX = null;
    var prev = function () {
      if (PREV) return PREV;
      PREV = {}; var d = read("d-srcprev") || {};
      Object.keys(d).forEach(function (k) { PREV[norm(k)] = d[k]; });
      return PREV;
    };
    var ctx = function () {
      if (CTX) return CTX;
      CTX = {};
      var add = function (u, o) { if (!u || typeof u !== "string") return; var k = norm(u); (CTX[k] = CTX[k] || []).push(o); };
      [read("d-early"), read("d-dl"), read("d-post")].forEach(function (list) {
        (list || []).forEach(function (r) {
          var pr = r.prediction && (typeof r.prediction === "string" ? r.prediction : r.prediction.text);
          var o = { k: "Archive entry", w: r.date ? String(r.date).slice(0, 4) : r.year, t: r.title, by: r.person, s: r.summary, q: r.quote, p: pr };
          [r.source_url, r.alt_source_url, r.quote_source_url].concat(r.additional_sources || []).forEach(function (u) { add(typeof u === "string" ? u : u && u.url, o); });
        });
      });
      (read("d-preds") || []).forEach(function (p) {
        var o = { k: "Prediction", w: p.year_made, by: p.who, t: p.who, s: p.evidence, p: p.prediction };
        [p.prediction_source_url, p.evidence_source_url, p.latest_development_source_url].forEach(function (u) { add(u, o); });
      });
      ((read("d-history") || {}).chapters || []).forEach(function (c) {
        (c.milestones || []).forEach(function (m) { add(m.source_url, { k: "History milestone", w: m.year, t: m.title, by: m.person || (m.people && m.people[0]), s: m.what, q: m.quote }); });
      });
      (read("d-people") || []).forEach(function (p) {
        var o = { k: "Person", t: p.name, by: p.name, s: [p.role, p.stance].filter(Boolean).join(" · ") };
        add(p.wiki, o);
        Object.keys(p.links || {}).forEach(function (k) { add(p.links[k], o); });
        (p.quotes || []).forEach(function (q) { add(q.url, { k: "Quote", w: q.year, t: p.name, by: p.name, s: q.source, q: q.text }); });
      });
      return CTX;
    };
    var words = function (s) { return String(s || "").toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g, " ").split(" ").filter(function (w) { return w.length > 2; }); };
    var flat = function (s) { return words(s).join(" "); };
    var repeats = function (a, b) {
      var fa = flat(a), fb = flat(b);
      if (!fa || !fb) return false;
      if ((fa.length >= 12 && fb.indexOf(fa) >= 0) || (fb.length >= 12 && fa.indexOf(fb) >= 0)) return true;
      var A = words(a), B = {}, n = 0, uniqA = {};
      words(b).forEach(function (w) { B[w] = 1; });
      A.forEach(function (w) { if (!uniqA[w]) { uniqA[w] = 1; if (B[w]) n++; } });
      var la = Object.keys(uniqA).length, lb = Object.keys(B).length;
      return Math.min(la, lb) >= 3 && n / Math.min(la, lb) >= 0.7;
    };
    var fromCtx = function (list) {
      var out = [];
      list.forEach(function (o) {
        var who = o.by || "", yr = o.w ? String(o.w) : "";
        var tag = [who, yr].filter(Boolean).join(", ");
        if (o.p) out.push((tag ? tag + " predicted: " : "Prediction: ") + o.p);
        if (o.q) out.push("“" + cut(o.q, 140) + "”" + (who ? " – " + who : "") + (yr && !o.p ? ", " + yr : ""));
        if (!o.p && !o.q) out.push(o.k + (yr ? " (" + yr + ")" : "") + ": " + (o.t || "") + (who && who !== o.t ? ", " + who : ""));
      });
      return out;
    };
    var lastA = null;
    var track = function (ev) { var a = ev.target && ev.target.closest && ev.target.closest("a.x-spl"); if (a) lastA = a; };
    document.addEventListener("pointerover", track, true);
    document.addEventListener("pointerdown", track, true);
    document.addEventListener("focusin", track, true);

    var fix = function (box) {
      if (!box || box.querySelector(".x7-kp")) return;
      var a = box.querySelector(".x-sp__acts a[href]"); if (!a) return;
      var url = a.getAttribute("href"), key = norm(url), d = prev()[key];
      var fallback = !!box.querySelector(".x-sp__ctx");
      var list = (ctx()[key] || []).filter(function (o, i, arr) { return arr.indexOf(o) === i; }).slice(0, 3);
      /* what the card already says: the summary (and title) that key points must not repeat */
      var said = [];
      box.querySelectorAll(".x-sp__t, .x-sp__s").forEach(function (p) { if (!/^Prediction\./.test(p.textContent.trim())) said.push(p.textContent); });
      if (d && d.s) said.push(d.s);
      if (d && d.t) said.push(d.t);
      var pts = ((d && d.p) || []).filter(function (x) { return typeof x === "string" && x.trim(); });
      if (fallback) {
        /* the archive card: predictions and quotes move into the key points, so nothing shows twice */
        box.querySelectorAll(".x-sp__ctx .x-sp__q").forEach(function (q) { q.remove(); });
        box.querySelectorAll(".x-sp__ctx .x-sp__s").forEach(function (p) { if (p.querySelector("b") && /^Prediction\./.test(p.textContent.trim())) p.remove(); });
      }
      var keepPts = function (arr) {
        var out = [];
        arr.forEach(function (x) {
          if (said.some(function (s) { return repeats(x, s); })) return;
          if (out.some(function (y) { return repeats(x, y); })) return;
          out.push(x);
        });
        return out;
      };
      /* data p[] always shows: if every point echoes the summary, show them anyway */
      var native = [];
      box.querySelectorAll(".x-sp__pts:not(.x7-kp) > li").forEach(function (li) { var t = li.textContent.trim(); if (t) native.push(t); });
      if (!pts.length && native.length) pts = native;
      var final = keepPts(pts);
      if (!final.length && pts.length) final = pts.slice();
      if (!final.length) final = keepPts(fromCtx(list));
      if (!final.length) {
        var extra = [];
        var site = (box.querySelector(".x-sp__site b") || {}).textContent || "";
        var host = (box.querySelector(".x-sp__site small") || {}).textContent || "";
        var lt = lastA && lastA.href && norm(lastA.href) === key ? lastA.textContent.replace(/ⓘ/g, "").trim() : "";
        if (lt) extra.push("Cited in this archive as “" + cut(lt, 90) + "”");
        var sec = lastA && lastA.closest && lastA.closest("section[data-nav], .x-pv, .x-hi");
        var sh = sec && sec.querySelector("h1, h2");
        if (sh && sh.textContent.trim()) extra.push("Linked from: " + cut(sh.textContent, 90));
        if (list[0] && list[0].s) extra.push(list[0].s);
        extra.push("Published on " + (site && site !== host ? site + " (" + host + ")" : host || site || "an external site"));
        final = keepPts(extra);
        if (!final.length) final = ["Published on " + (host || site || "an external site")];
      }
      final = final.slice(0, 4);
      var html = '<p class="x-sp__lab">Key points</p><ul class="x-sp__pts x7-kp">' + final.map(function (x) { return "<li>" + esc(cut(x, 170)) + "</li>"; }).join("") + "</ul>";
      var oldLab = box.querySelector(".x-sp__lab"), oldPts = box.querySelector(".x-sp__pts");
      if (oldLab) oldLab.remove();
      if (oldPts) oldPts.remove();
      var acts = box.querySelector(".x-sp__acts");
      acts.insertAdjacentHTML("beforebegin", html);
    };
    var watch = function (el) {
      if (!el || el.__x7) return; el.__x7 = true;
      fix(el);
      if ("MutationObserver" in window) new MutationObserver(function () { fix(el); }).observe(el, { childList: true });
    };
    var find = function () {
      watch(document.getElementById("xSp"));
      document.querySelectorAll("dialog.x-sp--sheet").forEach(watch);
    };
    find();
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", find);
  })();

  /* ============================== 6. history mini-map ticks ============================== */
  (function () {
    var tidy = function () {
      document.querySelectorAll(".x-hi__ticks").forEach(function (row) {
        var prevR = -Infinity;
        [].forEach.call(row.querySelectorAll(".x-hi__tick"), function (t) {
          t.classList.remove("x7-hide");
          var l = parseFloat(t.style.left) || 0, w = t.offsetWidth || 32;
          if (l - w / 2 < prevR + 6) { t.classList.add("x7-hide"); return; }
          prevR = l + w / 2;
        });
      });
    };
    /* no page-wide observer: tidy after load and after each route change, when the map may have been drawn */
    var again = function () { setTimeout(function () { try { tidy(); } catch (e) {} }, 400); };
    window.addEventListener("load", again);
    window.addEventListener("hashchange", again);
  })();
})();
