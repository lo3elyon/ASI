/* Command palette (Ctrl/⌘+K, "/" or the nav button) plus the page's scroll progress, back-to-top, stat count-up and reveal-on-scroll. */
(function () {
  "use strict";
  if (!window.Hark) return;
  var doc = document;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var data = function (id) { try { return Hark.data(id) || []; } catch (e) { return []; } };

  /* ---------- index ---------- */
  var IDX = { people: [], history: [], entries: [], videos: [], preds: [] };
  var LABEL = { people: "People", history: "History milestones", entries: "Archive entries", videos: "Videos", preds: "Predictions" };
  var KIND = { people: "Person", history: "Milestone", entries: "Entry", videos: "Video", preds: "Prediction" };
  var built = false;
  var build = function () {
    if (built) return; built = true;
    data("d-people").forEach(function (p) { IDX.people.push({ id: p.id, t: p.name, s: [p.role, p.org].filter(Boolean).join(" · "), k: String(p.group || "").replace(/-/g, " "), hay: (p.name + " " + (p.role || "")).toLowerCase(), key: p.name.toLowerCase() }); });
    var h = data("d-history"); (h.chapters || []).forEach(function (c) { (c.milestones || []).forEach(function (m) { IDX.history.push({ id: m.id, t: m.title, s: m.year + " · " + c.title, k: String(m.year), hay: (m.title + " " + m.year + " " + (m.people || []).join(" ") + " " + c.title).toLowerCase(), key: m.title.toLowerCase() }); }); });
    data("d-entries").forEach(function (e) { var y = e.date ? String(e.date).slice(0, 4) : e.year; IDX.entries.push({ id: e.id, t: e.title, s: e.person + " · " + y, k: String(y), hay: (e.title + " " + e.person + " " + y + " " + (e.quote || "")).toLowerCase(), key: e.person.toLowerCase() }); });
    data("d-videos").forEach(function (v) { IDX.videos.push({ id: v.id, t: v.t || "", s: [v.c, v.d && v.d !== "None" ? String(v.d).slice(0, 4) : ""].filter(Boolean).join(" · "), k: v.k || "video", hay: ((v.t || "") + " " + (v.c || "")).toLowerCase(), key: (v.t || "").toLowerCase() }); });
    data("d-preds").forEach(function (p) { IDX.preds.push({ id: p.id, t: p.who + ": " + p.prediction, s: "Made " + p.year_made + (p.target_year ? " · target " + p.target_year : ""), k: p.status, hay: (p.who + " " + p.prediction + " " + p.year_made).toLowerCase(), key: p.who.toLowerCase() }); });
  };
  var search = function (q) {
    var terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var out = [];
    Object.keys(IDX).forEach(function (g) {
      var hits = [];
      for (var i = 0; i < IDX[g].length; i++) {
        var r = IDX[g][i], ok = true;
        for (var j = 0; j < terms.length; j++) if (r.hay.indexOf(terms[j]) < 0) { ok = false; break; }
        if (ok) { var p = r.key.indexOf(terms[0]); hits.push({ r: r, s: p === 0 ? 0 : p > 0 ? 1 : 2 }); }
      }
      hits.sort(function (a, b) { return a.s - b.s; });
      if (hits.length) out.push({ g: g, n: hits.length, list: hits.slice(0, 6).map(function (x) { return x.r; }) });
    });
    return out;
  };

  /* ---------- actions ---------- */
  var home = function (fn) {
    var main = doc.querySelector("main.main");
    if (main && main.hidden) { location.hash = "#/"; setTimeout(fn, 80); } else fn();
  };
  var go = function (g, id) {
    if (g === "people") { location.hash = "#/person/" + id; return; }
    /* a video opens in the in-page window over whatever is on screen; the page stays where it is */
    if (g === "videos" && window.ArchivePlayer && ArchivePlayer.watch) {
      var hit = IDX.videos.filter(function (v) { return v.id === id; })[0];
      ArchivePlayer.watch(id, { title: hit ? hit.t : "" });
      return;
    }
    home(function () {
      if (g === "history") {
        var dot = doc.querySelector('#historyApp .x-hi__dot[data-go="' + id + '"]');
        if (dot) dot.click(); else doc.getElementById("history").scrollIntoView({ behavior: "smooth" });
      } else if (g === "entries") {
        if (window.ArchiveSite && ArchiveSite.gotoEntry) ArchiveSite.gotoEntry(id);
      } else if (g === "videos") {
        var r = IDX.videos.filter(function (v) { return v.id === id; })[0];
        if (window.ArchiveTheater) {
          ArchiveTheater.select(id, { title: r ? r.t : "" });
          var tp = doc.getElementById("ttPlayer"); if (tp) tp.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else if (g === "preds") {
        if (window.ArchiveSite && ArchiveSite.gotoPred) ArchiveSite.gotoPred(id);
        else doc.getElementById("tracker").scrollIntoView({ behavior: "smooth" });
      }
    });
  };

  /* ---------- modal ---------- */
  var dlg = doc.createElement("dialog");
  dlg.className = "x-cp";
  dlg.setAttribute("aria-label", "Search everything");
  dlg.innerHTML =
    '<div class="x-cp__bar"><input class="x-cp__in" id="cpQ" type="search" role="combobox" aria-expanded="true" aria-controls="cpList" aria-autocomplete="list" placeholder="Search people, milestones, entries, videos, predictions…" autocomplete="off" spellcheck="false" /><button class="x-cp__esc" type="button" id="cpClose" aria-label="Close search">Esc</button></div>' +
    '<div class="x-cp__list" id="cpList" role="listbox" aria-label="Results"></div>' +
    '<div class="x-cp__foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span><span id="cpN" aria-live="polite"></span></div>';
  doc.body.appendChild(dlg);
  var inp = dlg.querySelector("#cpQ"), listEl = dlg.querySelector("#cpList"), nEl = dlg.querySelector("#cpN");
  var opts = [], sel = -1, lastFocus = null;

  var render = function () {
    var q = inp.value, res = search(q), html = "", n = 0, total = 0;
    opts = [];
    res.forEach(function (grp) {
      total += grp.n;
      html += '<div role="group" class="x-cp__grp-' + grp.g + '" aria-label="' + LABEL[grp.g] + '"><p class="x-cp__g" aria-hidden="true">' + LABEL[grp.g] + " · " + grp.n + "</p>";
      grp.list.forEach(function (r) {
        opts.push({ g: grp.g, id: r.id });
        html += '<div class="x-cp__o" role="option" id="cpo-' + n + '" data-i="' + n + '" aria-selected="false"><b>' + esc(r.t) + "</b><small>" + esc(r.s) + '</small><span class="x-cp__k">' + esc(KIND[grp.g]) + "</span></div>";
        n++;
      });
      html += "</div>";
    });
    listEl.innerHTML = q.trim()
      ? (html || '<p class="x-cp__empty">Nothing matches “' + esc(q) + "”. Try a surname, a year or a word like “alignment”.</p>")
      : '<p class="x-cp__empty">Type a name, year, title or channel. Try “Hinton”, “1965”, “alignment” or “Lex Fridman”.</p>';
    nEl.textContent = q.trim() ? total + " match" + (total === 1 ? "" : "es") : "";
    setSel(opts.length ? 0 : -1);
  };
  var setSel = function (i) {
    var prev = listEl.querySelector('[aria-selected="true"]'); if (prev) prev.setAttribute("aria-selected", "false");
    sel = i;
    if (i < 0) { inp.removeAttribute("aria-activedescendant"); return; }
    var el = doc.getElementById("cpo-" + i);
    if (el) { el.setAttribute("aria-selected", "true"); inp.setAttribute("aria-activedescendant", el.id); el.scrollIntoView({ block: "nearest" }); }
  };
  var choose = function (i) {
    var o = opts[i]; if (!o) return;
    close(true);
    go(o.g, o.id);
  };
  var open = function () {
    if (dlg.open) return;
    if (window.ArchivePlayer && ArchivePlayer.isWatching && ArchivePlayer.isWatching()) return;
    build();
    lastFocus = doc.activeElement;
    var lb = doc.getElementById("lb"); if (lb && lb.open) lb.close();
    dlg.showModal();
    inp.select(); render(); inp.focus();
  };
  var close = function (picked) {
    if (!dlg.open) return;
    dlg.close();
    if (!picked && lastFocus && lastFocus.focus) lastFocus.focus();
  };

  var tmr;
  inp.addEventListener("input", function () { clearTimeout(tmr); tmr = setTimeout(render, 90); });
  inp.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowDown") { ev.preventDefault(); if (opts.length) setSel((sel + 1) % opts.length); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); if (opts.length) setSel((sel - 1 + opts.length) % opts.length); }
    else if (ev.key === "Enter") { ev.preventDefault(); clearTimeout(tmr); if (!opts.length) render(); if (sel >= 0) choose(sel); }
    ev.stopPropagation();
  });
  listEl.addEventListener("click", function (ev) { var o = ev.target.closest(".x-cp__o"); if (o) choose(+o.dataset.i); });
  listEl.addEventListener("mousemove", function (ev) { var o = ev.target.closest(".x-cp__o"); if (o && +o.dataset.i !== sel) setSel(+o.dataset.i); });
  dlg.querySelector("#cpClose").addEventListener("click", function () { close(); });
  dlg.addEventListener("click", function (ev) { if (ev.target === dlg) close(); });
  dlg.addEventListener("cancel", function (ev) { ev.preventDefault(); close(); });
  doc.addEventListener("keydown", function (ev) {
    if ((ev.key === "Escape" || ev.key === "Esc") && dlg.open) {
      ev.preventDefault(); ev.stopPropagation();
      var trig = lastFocus && lastFocus !== doc.body && doc.contains(lastFocus) ? lastFocus : doc.querySelector(".x-search-btn");
      close(true);
      if (trig && trig.focus) trig.focus();
    }
  }, true);

  window.addEventListener("keydown", function (ev) {
    var t = doc.activeElement, typing = t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable);
    if ((ev.key === "k" || ev.key === "K") && (ev.metaKey || ev.ctrlKey) && !ev.altKey) {
      ev.preventDefault(); ev.stopImmediatePropagation(); dlg.open ? close() : open();
    } else if (ev.key === "/" && !typing && !ev.metaKey && !ev.ctrlKey && !ev.altKey && !dlg.open) {
      ev.preventDefault(); ev.stopImmediatePropagation(); open();
    }
  }, true);

  /* nav button */
  var mac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  var addBtn = function () {
    var nav = doc.querySelector("header.nav"); if (!nav || nav.querySelector(".x-search-btn")) return;
    var b = doc.createElement("button");
    b.type = "button"; b.className = "x-search-btn"; b.setAttribute("aria-label", "Search everything (" + (mac ? "⌘" : "Ctrl") + "+K)");
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><kbd>' + (mac ? "⌘K" : "Ctrl K") + "</kbd>";
    b.addEventListener("click", open);
    var theme = nav.querySelector(".theme-btn");
    theme ? nav.insertBefore(b, theme) : nav.appendChild(b);
  };
  addBtn();

  /* ---------- scroll progress and back to top ---------- */
  var prog = doc.createElement("div"); prog.className = "x-prog"; prog.setAttribute("aria-hidden", "true");
  var top = doc.createElement("button"); top.type = "button"; top.className = "x-top"; top.setAttribute("aria-label", "Back to top");
  top.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  top.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    var f = doc.querySelector("header.nav a, header.nav button"); if (f) f.focus({ preventScroll: true });
  });
  doc.body.appendChild(prog); doc.body.appendChild(top);
  var ticking = false;
  var onScroll = function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var h = doc.documentElement.scrollHeight - window.innerHeight, y = window.scrollY;
      prog.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0).toFixed(4) + ")";
      top.classList.toggle("is-on", y > window.innerHeight * 1.2);
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ---------- count-up and reveal: one observer, once each ---------- */
  var figs = [].slice.call(doc.querySelectorAll(".stat__fig[data-count]"));
  var countUp = function (el) {
    var txt = el.textContent, end = parseInt(txt.replace(/[^\d]/g, ""), 10);
    if (!end || reduce) return;
    var t0 = null, D = 1100;
    var step = function (ts) {
      if (t0 == null) t0 = ts;
      var p = Math.min(1, (ts - t0) / D), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * e).toLocaleString("en-US");
      if (p < 1) requestAnimationFrame(step); else el.textContent = txt;
    };
    requestAnimationFrame(step);
  };
  /* History: the chapter tab indicator slides under the selected tab (transform only) */
  var placeInd = function () {
    var row = doc.querySelector(".x-hi__tabs"); if (!row) return;
    var ind = row.querySelector(".x-hi__ind");
    if (!ind) { ind = doc.createElement("span"); ind.className = "x-hi__ind"; ind.setAttribute("aria-hidden", "true"); row.appendChild(ind); }
    var t = row.querySelector('.x-hi__tab[aria-selected="true"]');
    if (!t || !t.offsetWidth) { ind.style.opacity = "0"; return; }
    ind.style.opacity = "1";
    var c = getComputedStyle(t).getPropertyValue("--c").trim(); if (c) ind.style.background = c;
    ind.style.transform = "translateX(" + t.offsetLeft + "px) scaleX(" + t.offsetWidth + ")";
  };

  if (!("IntersectionObserver" in window)) { figs.forEach(countUp); placeInd(); return; }

  /* one shared observer: card reveals (staggered), block and heading reveals, count-up; each once */
  var CARDS = ".x-card, .x-pi, .x-pc, .x-vc, .x-hi__item, .x-prc__c, .x-prk__t, .x-ff, .x-views, .x-acc > details, .x-pv__v, .x-gal > button, .stats.x-stats .stat, .x-charts .chart, .x-car li";
  var BLOCKS = ".x-tl, .x-tools:not(.x-bar), .x-hi__map, .x-hi__tags, .x-hi__tabs, .x-pv__head, .x-pv__lead";
  var HEADS = ".section > .head";
  var seen = typeof WeakSet === "function" ? new WeakSet() : { has: function () { return false; }, add: function () {} };
  var io = new IntersectionObserver(function (en) {
    var i = 0;
    en.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      io.unobserve(el);
      if (el.classList.contains("x-stats")) { figs.forEach(countUp); return; }
      if (el.classList.contains("x-rc")) el.style.setProperty("--d", Math.min(i++, 8) * 60 + "ms");
      el.classList.add("is-in");
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });

  var mark = function (el, cls) {
    if (seen.has(el)) return; seen.add(el);
    el.classList.add(cls); io.observe(el);
  };
  var scan = function (root) {
    if (reduce || !root.querySelectorAll) return;
    var each = function (sel, cls) {
      if (root.matches && root.matches(sel)) mark(root, cls);
      [].forEach.call(root.querySelectorAll(sel), function (el) { mark(el, cls); });
    };
    each(CARDS, "x-rc"); each(BLOCKS, "x-rb"); each(HEADS, "x-rh");
  };
  var stats = doc.querySelector(".x-stats"); if (stats) io.observe(stats);
  scan(doc.body);
  placeInd();

  var pending = [], queued = false;
  var flush = function () {
    queued = false;
    var list = pending; pending = [];
    list.forEach(scan);
    placeInd();
  };
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      if (m.type === "childList") [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1 && n.className !== "x-ripple") pending.push(n); });
    });
    if (!queued) { queued = true; requestAnimationFrame(flush); }
  }).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
  window.addEventListener("resize", placeInd, { passive: true });
  window.addEventListener("load", placeInd);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(placeInd);

  if (reduce) return;

  /* chip press ripple */
  doc.addEventListener("pointerdown", function (ev) {
    var b = ev.target.closest && ev.target.closest(".x-f, .x-hi__tag, .x-hi__tab, .x-tl__era");
    if (!b) return;
    var r = b.getBoundingClientRect(), s = doc.createElement("span");
    s.className = "x-ripple"; s.setAttribute("aria-hidden", "true");
    s.style.left = ev.clientX - r.left + "px"; s.style.top = ev.clientY - r.top + "px";
    s.style.setProperty("--rs", ((Math.max(r.width, r.height) * 2.2) / 10).toFixed(1));
    b.appendChild(s);
    s.addEventListener("animationend", function () { s.remove(); });
    setTimeout(function () { if (s.parentNode) s.remove(); }, 900);
  }, { passive: true });

  /* small tilt toward the pointer, desktop only */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var TILT = ".x-card, .x-pi, .x-pc, .x-vc, .x-prc__c";
    var cur = null, raf = 0, px = 0, py = 0;
    var clear = function (c) { if (c) { c.style.removeProperty("--tx"); c.style.removeProperty("--ty"); } };
    doc.addEventListener("pointermove", function (ev) {
      if (ev.pointerType && ev.pointerType !== "mouse") return;
      var c = ev.target.closest && ev.target.closest(TILT);
      if (cur !== c) { clear(cur); cur = c; }
      if (!c) return;
      px = ev.clientX; py = ev.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0; if (!cur) return;
        var r = cur.getBoundingClientRect(); if (!r.width || !r.height) return;
        var x = (px - r.left) / r.width - 0.5, y = (py - r.top) / r.height - 0.5;
        var k = Math.min(1, 320 / r.height);
        cur.style.setProperty("--ty", (x * 5).toFixed(2) + "deg");
        cur.style.setProperty("--tx", (-y * 4 * k).toFixed(2) + "deg");
      });
    }, { passive: true });
    doc.addEventListener("pointerleave", function () { clear(cur); cur = null; });
  }
})();
