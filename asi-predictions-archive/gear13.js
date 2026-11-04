/* gear13.js: Batch 13, loaded last (after speed12).
   1. One settings menu component for every ⚙ (the top-right gear before playback and the control-bar gear after it,
      and the speed popover that shares the .x-apx-menu shell): a dark glass card (gear13.css) with an SVG icon on every
      row, max-height = player height − 24px with its own scroll, anchored under its button (above it when there is no
      room) and clamped inside the player; a bottom sheet when the player is under 420px wide. Closes on an outside
      press and on Esc, before and after playback starts.
   2. Seek-bar hover preview: its own tooltip above the captions (z-index), with two lines of the transcript, the
      chapter and the time; placed clear of the speed badge and corner icons, and the captions lift out of its way
      (translate, 150ms) while it shows, then settle back. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer;
  var doc = document;

  /* ================= 1. the settings menu ================= */
  var ic = function (d) {
    return '<svg class="g13-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  };
  var ICONS = [
    [/speed|rate/i, '<path d="M4.5 16a7.5 7.5 0 1 1 15 0"/><path d="M12 16l3.6-3.9"/><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none"/>'],
    [/step|skip/i, '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/><path d="M12 8v4l2.5 1.5"/>'],
    [/sleep|timer/i, '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'],
    [/quality/i, '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7.5 10v4M7.5 12h3M10.5 10v4M14 10h2a2 2 0 0 1 0 4h-2z"/>'],
    [/a.b repeat|repeat/i, '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>'],
    [/view/i, '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'],
    [/picture|bright|contrast|satur/i, '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'],
    [/reset|default/i, '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>'],
    [/back/i, '<path d="M14.5 6l-6 6 6 6"/>'],
    [/colou?r|preset|style|theme/i, '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="7.5" r="1" fill="currentColor" stroke="none"/>'],
    [/size|font|text/i, '<path d="M4 18L9 6l5 12M5.8 14h6.4"/><path d="M15 18l3-7 3 7M15.9 16h4.2"/>'],
    [/position|place|where/i, '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 15h10"/>'],
    [/background|opacity|box/i, '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 15l5-5 4 4 3-3 6 6"/>'],
    [/edge|shadow|outline/i, '<path d="M5 18L10 6l5 12M6.8 14h6.4"/><path d="M13 6.5l5 11.5" opacity=".5"/>'],
    [/caption|subtit|source|language/i, '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 11h10M7 15h4M13 15h4"/>'],
    [/saved|time/i, '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5"/>'],
    [/extension/i, '<path d="M9 4h3a1.5 1.5 0 0 1 3 0h3v4a1.5 1.5 0 0 1 0 3v4h-4a1.5 1.5 0 0 0-3 0H7v-3a1.5 1.5 0 0 0 0-3V4z"/>']
  ];
  var DEF_IC = '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"/>';
  var iconFor = function (txt) {
    for (var i = 0; i < ICONS.length; i++) if (ICONS[i][0].test(txt)) return ic(ICONS[i][1]);
    return ic(DEF_IC);
  };
  var CHIPS = ".x-apx-abrow, .x-sx-row5, .x-sx-ql, .x-sx-speeds, .x-apx-speeds, .x-pn-sg, .s12-chips, .cap8-p__presets";

  /* an icon on every row: section headings and the full-width buttons that have none */
  var decorate = function (m) {
    m.querySelectorAll(".x-apx-h, .s12-h, .s12-saved").forEach(function (h) {
      if (h.querySelector("svg")) return;
      var first = h.firstChild, txt = (h.textContent || "").trim();
      h.insertAdjacentHTML("afterbegin", iconFor(txt));
      setCls(h, "g13-row", true);
    });
    m.querySelectorAll(".x-ap__b").forEach(function (b) {
      if (b.querySelector("svg") || b.closest(CHIPS) || b.matches(".x-pn-sw, .x-pn-pick, .s12-chip")) return;
      var txt = (b.textContent || b.getAttribute("aria-label") || "").trim();
      if (!txt || /^\?$/.test(txt)) return;
      b.insertAdjacentHTML("afterbegin", iconFor(txt));
    });
    m.querySelectorAll(".x7-sl").forEach(function (l) {
      if (l.querySelector(".g13-ic")) return;
      var n = l.querySelector(".x7-sl__n"); if (n) n.insertAdjacentHTML("afterbegin", iconFor(n.textContent || ""));
    });
  };

  var ctrlOf = function (m) {
    if (!m.id) return null;
    var r = m.closest(".x-ap") || doc;
    return r.querySelector('[aria-controls="' + m.id + '"]');
  };
  var setI = function (s, k, v) { s.setProperty(k, v, "important"); };
  /* change a class only when it differs: classList always rewrites the attribute, which would wake the observer */
  var setCls = function (el, c, on) { if (el.classList.contains(c) !== !!on) el.classList.toggle(c, !!on); };

  var place = function (m) {
    if (m.hidden || !m.isConnected) return;
    var wrap = m.closest(".x-ap__wrap") || m.closest(".x-ap"); if (!wrap) return;
    var W = wrap.getBoundingClientRect(); if (!(W.width > 0 && W.height > 0)) return;
    var btn = ctrlOf(m), s = m.style, sheet = W.width < 420;
    setCls(m, "g13-menu", true);
    setCls(m, "g13-sheet", sheet);
    var maxH = Math.max(96, Math.floor(W.height - 24));
    var w = Math.floor(sheet ? W.width - 12 : Math.min(320, W.width - 16));
    setI(s, "position", "absolute"); setI(s, "right", "auto"); setI(s, "bottom", "auto");
    setI(s, "left", "0px"); setI(s, "top", "0px"); setI(s, "margin", "0px"); setI(s, "transform", "none");
    setI(s, "width", w + "px"); setI(s, "max-width", w + "px"); setI(s, "min-width", "0px");
    setI(s, "max-height", maxH + "px");
    var o = m.getBoundingClientRect();
    var h = m.offsetHeight, x, y;
    if (sheet) {
      x = W.left + 6; y = W.bottom - 6 - h;
    } else {
      var B = btn && btn.getClientRects().length ? btn.getBoundingClientRect() : { top: W.top + 8, bottom: W.top + 8, left: W.right - 8, right: W.right - 8 };
      var below = W.bottom - 8 - (B.bottom + 6), above = (B.top - 6) - (W.top + 8);
      var down = below >= h || below >= above;
      var lim = Math.max(96, Math.min(maxH, Math.floor(down ? below : above)));
      if (h > lim) { setI(s, "max-height", lim + "px"); h = m.offsetHeight; }
      y = down ? B.bottom + 6 : B.top - 6 - h;
      x = B.right - w;
    }
    x = Math.max(W.left + 6, Math.min(x, W.right - 6 - w));
    y = Math.max(W.top + 6, Math.min(y, W.bottom - 6 - h));
    setI(s, "left", Math.round(x - o.left) + "px");
    setI(s, "top", Math.round(y - o.top) + "px");
  };

  var openMenus = function () { return [].slice.call(doc.querySelectorAll(".x-ap .x-apx-menu:not([hidden])")); };
  var closeMenu = function (m) {
    if (m.hidden) return;
    var b = ctrlOf(m);
    if (b && b.getAttribute("aria-expanded") === "true") b.click();
    if (!m.hidden) { m.hidden = true; if (b) b.setAttribute("aria-expanded", "false"); }
  };

  var seen = typeof WeakSet === "function" ? new WeakSet() : null, seenList = [];
  var isSeen = function (m) { return seen ? seen.has(m) : seenList.indexOf(m) >= 0; };
  var raf = 0;
  var placeAll = function () { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; openMenus().forEach(place); }); };
  var watchMenu = function (m) {
    if (isSeen(m)) return;
    if (seen) seen.add(m); else seenList.push(m);
    var wasOpen = false, lastCls = "";
    var sync = function () {
      if (m.hidden) { wasOpen = false; setCls(m, "g13-open", false); lastCls = m.className; return; }
      /* only a real change (opened, or another script changed the class, e.g. the captions page) re-places it */
      if (wasOpen && m.className === lastCls) return;
      wasOpen = true;
      setCls(m, "g13-menu", true); setCls(m, "g13-open", true);
      decorate(m); place(m);
      lastCls = m.className;
    };
    if ("MutationObserver" in window) new MutationObserver(sync).observe(m, { attributes: true, attributeFilter: ["hidden", "class"] });
    if ("ResizeObserver" in window) {
      var last = 0;
      new ResizeObserver(function () { if (m.hidden) return; var hh = m.scrollHeight; if (hh !== last) { last = hh; placeAll(); } }).observe(m);
    }
    sync();
  };
  var scan = function () { doc.querySelectorAll(".x-ap .x-apx-menu").forEach(watchMenu); };

  /* outside press: a backup for every menu, before and after playback (a press stopped on its way never misses it) */
  window.addEventListener("pointerdown", function (e) {
    var t = e.target;
    openMenus().forEach(function (m) {
      var b = ctrlOf(m);
      if (m.contains(t) || (b && b.contains(t))) return;
      setTimeout(function () { closeMenu(m); }, 0);
    });
  }, true);
  /* Esc closes the open menu even when focus sits outside it; inside it, the menu's own handler runs */
  window.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" && e.key !== "Esc") return;
    var open = openMenus(); if (!open.length) return;
    var a = doc.activeElement, hit = false;
    open.forEach(function (m) {
      if (a && m.contains(a)) return;
      hit = true; closeMenu(m);
    });
    if (hit) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  window.addEventListener("resize", placeAll);
  doc.addEventListener("fullscreenchange", function () { setTimeout(placeAll, 60); });
  doc.addEventListener("webkitfullscreenchange", function () { setTimeout(placeAll, 60); });
  window.addEventListener("scroll", placeAll, { passive: true, capture: true });

  /* ================= 2. seek-bar hover preview ================= */
  var fmt = (AP && AP.fmt) || function (s) { s = Math.max(0, Math.floor(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = ("0" + (s % 60)).slice(-2); return h ? h + ":" + ("0" + m).slice(-2) + ":" + x : m + ":" + x; };
  var sentenceAt = function (id, t) {
    var all = window.XTranscripts && XTranscripts.loaded ? XTranscripts.loaded() : null, tr = all && all[id];
    if (!tr || !tr.groups || !tr.groups.length) return "";
    var st = tr.gStarts || tr.groups.map(function (g) { return g.t; });
    var lo = 0, hi = st.length - 1, ans = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (st[mid] <= t + 0.05) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans >= 0 ? String(tr.groups[ans].x || "") : "";
  };
  var visible = function (el) {
    if (!el || !el.getClientRects().length) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05;
  };
  var hits = function (a, b, pad) { pad = pad || 0; return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad; };
  var area = function (a, b) { return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)); };
  var rectAt = function (x, y, w, h) { return { left: x, top: y, right: x + w, bottom: y + h }; };

  var wireTip = function (inst) {
    var root = inst.root || (inst.bar && inst.bar.closest(".x-ap")); if (!root || root.__g13tip) return;
    var wrap = root.querySelector(".x-ap__wrap"), seek = inst.seek || root.querySelector(".x-ap__seek");
    if (!wrap || !seek) return;
    root.__g13tip = true;
    setCls(root, "g13-tips", true);
    var tip = doc.createElement("div");
    tip.className = "g13-tip"; tip.hidden = true; tip.setAttribute("aria-hidden", "true");
    tip.innerHTML = '<p class="g13-tip__ch"></p><p class="g13-tip__tx"></p><p class="g13-tip__t"></p>';
    wrap.appendChild(tip);
    var chEl = tip.querySelector(".g13-tip__ch"), txEl = tip.querySelector(".g13-tip__tx"), tEl = tip.querySelector(".g13-tip__t");
    var lift = 0, capEl = null, kbT = 0;

    var setLift = function (px) {
      var cap = root.querySelector(".x-pn-cap");
      if (capEl && capEl !== cap) { capEl.style.removeProperty("translate"); setCls(capEl, "g13-lift", false); }
      if (cap === capEl && px === lift) return;
      capEl = cap; lift = px;
      if (!cap) return;
      if (px > 0) { setCls(cap, "g13-lift", true); cap.style.setProperty("translate", "0 " + (-Math.round(px)) + "px"); }
      else { if (cap.style.getPropertyValue("translate")) cap.style.removeProperty("translate"); setCls(cap, "g13-lift", false); }
    };
    var hide = function () { clearTimeout(kbT); if (!tip.hidden) tip.hidden = true; setLift(0); };

    var fill = function (t) {
      var v = inst.current ? inst.current() : null;
      var sent = v ? sentenceAt(v.id, t) : "";
      var ch = inst.chapterAt ? inst.chapterAt(t) : "";
      var n = v && window.ArchiveNotes && ArchiveNotes.notes ? ArchiveNotes.notes(v.id) : null;
      if (ch && !(n && n.ch && n.ch.length)) {
        /* auto sections are transcript snippets: name them by number instead */
        var i = inst.chapterIndexAt ? inst.chapterIndexAt(t) : -1;
        ch = i >= 0 ? "Part " + (i + 1) : "";
      }
      chEl.textContent = ch; chEl.hidden = !ch;
      txEl.textContent = sent; txEl.hidden = !sent;
      tEl.textContent = fmt(t);
      setCls(tip, "has-text", !!sent);
    };

    var position = function (frac) {
      var Wr = wrap.getBoundingClientRect(); if (!Wr.width) return;
      var S = seek.getBoundingClientRect(), row = seek.parentNode && seek.parentNode.getBoundingClientRect ? seek.parentNode.getBoundingClientRect() : S;
      var ax = S.left + 7 + frac * Math.max(0, S.width - 14);
      tip.style.left = "0px"; tip.style.top = "0px";
      var o = tip.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      var minX = Wr.left + 8, maxX = Wr.right - 8 - tw;
      var clampX = function (x) { return Math.max(minX, Math.min(x, maxX)); };
      var bottom = Math.min((row.height ? Math.min(row.top, S.top) : S.top) - 8, Wr.bottom - 8);
      var y = Math.max(Wr.top + 8, bottom - th);

      /* the speed badge and the corner icons: pick the spot with the least overlap */
      var obs = [];
      root.querySelectorAll(".s12-badge, .x-sx-top .x-sx-ob, .x-sx-nat, .x-apt, .x-ap__upnext").forEach(function (el) { if (wrap.contains(el) && visible(el)) obs.push(el.getBoundingClientRect()); });
      var cands = [clampX(ax - tw / 2)];
      obs.forEach(function (r) { cands.push(clampX(r.left - 8 - tw), clampX(r.right + 8)); });
      var best = cands[0], bestA = Infinity;
      cands.forEach(function (x) {
        var tr = rectAt(x, y, tw, th), a = 0;
        obs.forEach(function (r) { a += area(tr, r); });
        a += Math.abs(x + tw / 2 - ax) * 0.01; /* stay near the pointer when ties */
        if (a < bestA) { bestA = a; best = x; }
      });
      var x = best;

      /* the captions: lift them clear (tooltip height + 12px), or put the tooltip above them */
      var cap = root.querySelector(".x-pn-cap"), win = cap && cap.querySelector(".x-pn-cap__win"), need = 0;
      if (cap && win && visible(cap) && visible(win) && (win.textContent || "").trim()) {
        var cr = win.getBoundingClientRect(), cur = (capEl === cap ? lift : 0);
        var c0 = { left: cr.left, right: cr.right, top: cr.top + cur, bottom: cr.bottom + cur };
        var tr0 = rectAt(x, y, tw, th);
        if (hits(tr0, c0, 6)) {
          var want = c0.bottom - tr0.top + 12, room = c0.top - (Wr.top + 8);
          if (want <= room) need = want;
          else if (c0.top - 12 - th >= Wr.top + 8) y = c0.top - 12 - th;
          else need = Math.max(0, room);
        }
      }
      setLift(need);
      tip.style.left = Math.round(x - o.left) + "px";
      tip.style.top = Math.round(y - o.top) + "px";
    };

    var show = function (frac) {
      var d = inst.duration ? inst.duration() : 0;
      if (!(d > 0) || root.classList.contains("is-native") || !root.classList.contains("is-started")) { hide(); return; }
      frac = Math.max(0, Math.min(1, frac));
      fill(frac * d);
      tip.hidden = false;
      position(frac);
    };
    seek.addEventListener("pointermove", function (ev) {
      if (ev.pointerType === "touch") return;
      var r = seek.getBoundingClientRect(), w = r.width - 14;
      if (w > 0) { clearTimeout(kbT); show((ev.clientX - r.left - 7) / w); }
    });
    seek.addEventListener("pointerleave", function (ev) { if (ev.pointerType !== "touch") hide(); });
    seek.addEventListener("input", function () {
      var m = +seek.max; if (!(m > 0)) return;
      show(+seek.value / m);
      clearTimeout(kbT);
      if (!seek.matches(":hover")) kbT = setTimeout(hide, 1400);
    });
    seek.addEventListener("change", function () { if (!seek.matches(":hover")) hide(); });
    seek.addEventListener("pointerup", function (ev) { if (ev.pointerType === "touch") setTimeout(hide, 300); });
    seek.addEventListener("pointercancel", hide);
    seek.addEventListener("blur", hide);
    if (inst.on) { try { inst.on("change", hide); } catch (e) {} }
  };

  /* ================= boot ================= */
  var wire = function (inst) {
    try { wireTip(inst); } catch (e) {}
    setTimeout(scan, 0); setTimeout(scan, 600);
  };
  if (AP && AP.onCreate) AP.onCreate(wire);
  scan();
  /* menus added later (pop-out window, rebuilt players) */
  doc.addEventListener("click", function (e) {
    if (e.target && e.target.closest && e.target.closest(".x-ap [aria-haspopup], .x-ap [data-x], .x-ap [data-s12]")) scan();
  }, true);
})();
