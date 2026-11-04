/* search26.js: the #/search page. One box, instant results grouped by type across the data already in the page
   (d-people, d-videos, d-entries, d-preds, d-trust, d-history). The index is built once, on the first visit to
   #/search. Query lives in the hash (#/search?q=...). A search button sits next to the theme button. */
(function () {
  "use strict";
  var doc = document;
  var PAGE_RE = /^#\/(person|watch|topics|topic|era|quotes|timeline|compare|stats|about|org|ask|policy|safety)(\/|$)/;
  var SUGGEST = ["control problem", "Bengio", "2023", "superintelligence", "alignment", "Hinton", "p(doom)", "AGI timeline"];
  var GROUPS = [["person", "People"], ["talk", "Talks"], ["entry", "Quotes and entries"], ["pred", "Predictions"], ["trust", "Trust claims"], ["mile", "History milestones"]];
  var FIRST = 5, STEP = 10;
  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fold = function (s) { s = String(s == null ? "" : s); try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {} return s.toLowerCase(); };
  var read = function (id) { try { return Hark.data(id); } catch (e) { return null; } };
  var cut = function (s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
  var yr = function (v) { var n = parseInt(String(v || "").slice(0, 4), 10); return isNaN(n) ? 0 : n; };

  /* ---------- index, built once ---------- */
  var IDX = null;
  var add = function (o, title, body) { o.t = fold(title); o.b = fold(body); IDX.push(o); };
  var build = function () {
    if (IDX) return;
    IDX = [];
    var people = read("d-people") || [], names = {};
    people.forEach(function (p) {
      names[p.id] = p.name;
      add({ type: "person", id: p.id, title: p.name, meta: [p.role, p.org].filter(Boolean).join(" · "), snip: p.warning || p.bio, year: yr(p.agi_year), href: "#/person/" + encodeURIComponent(p.id) },
        p.name, [p.role, p.org, p.group, p.bio, p.warning, p.pdoom ? "p(doom) " + p.pdoom : "", p.agi_year ? "agi " + p.agi_year : ""].join(" "));
    });
    (read("d-videos") || []).forEach(function (v) {
      var sp = (v.p || []).map(function (id) { return names[id] || ""; }).filter(Boolean), y = yr(v.d);
      add({ type: "talk", id: v.id, title: v.t, meta: [sp.join(", "), y || "", v.len].filter(Boolean).join(" · "), year: y, href: "#/watch/" + encodeURIComponent(v.id), watch: v.id },
        v.t, [sp.join(" "), y || "", v.c, v.k].join(" "));
    });
    (read("d-entries") || []).forEach(function (e) {
      add({ type: "entry", id: e.id, title: e.title, meta: [e.person, e.year, e.type].filter(Boolean).join(" · "), snip: e.quote || e.summary, year: yr(e.year), go: "e" },
        e.title, [e.person, e.role, e.year, e.type, e.summary, e.quote, e.prediction, e.stance].join(" "));
    });
    (read("d-preds") || []).forEach(function (p) {
      add({ type: "pred", id: p.id, title: cut(p.prediction, 120), meta: [p.who, p.year_made ? "made " + p.year_made : "", p.target_year ? "for " + p.target_year : "", p.status].filter(Boolean).join(" · "), year: yr(p.year_made), go: "p" },
        p.prediction, [p.who, p.year_made, p.target_year, p.category, p.status, p.evidence, p.latest_development].join(" "));
    });
    var tr = read("d-trust") || {};
    (tr.people || []).forEach(function (p) {
      (p.claims || []).forEach(function (c, i) {
        add({ type: "trust", id: p.id + "~" + (i < 10 ? "0" : "") + i, title: cut(c.claim, 120), meta: [p.name, c.year, c.verdict].filter(Boolean).join(" · "), year: yr(c.year), href: "#/trust/" + encodeURIComponent(p.id) },
          c.claim, [p.name, p.role_now, p.stance, c.year, c.type, c.verdict, c.evidence_note].join(" "));
      });
    });
    var hi = read("d-history") || {};
    (hi.chapters || []).forEach(function (ch) {
      (ch.milestones || []).forEach(function (m) {
        add({ type: "mile", id: m.id, title: m.title, meta: [m.year, (m.people || []).join(", "), ch.title].filter(Boolean).join(" · "), snip: m.what, year: yr(m.year), go: "m" },
          m.title, [m.year, m.date, (m.people || []).join(" "), m.what, m.why_it_matters, m.quote, ch.title].join(" "));
      });
    });
  };

  var search = function (q) {
    var terms = fold(q).split(/\s+/).filter(Boolean), out = {};
    GROUPS.forEach(function (g) { out[g[0]] = []; });
    if (!terms.length) return out;
    IDX.forEach(function (o) {
      var inT = true, all = o.t + " " + o.b;
      for (var i = 0; i < terms.length; i++) {
        if (all.indexOf(terms[i]) < 0) return;
        if (inT && o.t.indexOf(terms[i]) < 0) inT = false;
      }
      o.r = inT ? 0 : 1;
      out[o.type].push(o);
    });
    Object.keys(out).forEach(function (k) {
      out[k].sort(function (a, b) { return a.r - b.r || b.year - a.year || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    });
    return out;
  };

  /* ---------- the view ---------- */
  var main = doc.querySelector("main.main");
  var view = doc.createElement("div");
  view.className = "main x-s26"; view.id = "x-search26"; view.hidden = true; view.setAttribute("tabindex", "-1");
  view.innerHTML = '<div class="links x-pg__top"><a class="btn" href="#/">← Back to the archive</a></div>' +
    '<section class="section"><div class="head"><h2>Search the archive</h2><p class="head__sub">People, talks, quotes, predictions, trust claims and history milestones.</p></div>' +
    '<div class="x-s26-box" role="search"><span class="x-s26-box__ic">' + ICON + '</span><input type="search" id="x-s26-q" placeholder="Search people, talks, quotes…" aria-label="Search the archive" autocomplete="off" spellcheck="false" aria-controls="x-s26-res" /><kbd class="x-s26-kbd" aria-hidden="true">/</kbd></div>' +
    '<p class="x-s26-status" aria-live="polite"></p><div id="x-s26-res"></div></section>';
  (main && main.parentNode ? main.parentNode : doc.body).insertBefore(view, main ? main.nextSibling : null);
  var input = view.querySelector("#x-s26-q"), status = view.querySelector(".x-s26-status"), res = view.querySelector("#x-s26-res");

  var shown = {}, lastQ = null, results = null;
  var hit = function (o) {
    var attrs = o.watch ? ' href="' + esc(o.href) + '" data-watch="' + esc(o.watch) + '" data-title="' + esc(o.title) + '"'
      : o.go ? ' href="#/" data-s26-go="' + o.go + ":" + esc(o.id) + '"' : ' href="' + esc(o.href) + '"';
    return '<li><a class="x-s26-hit"' + attrs + "><b>" + esc(o.title) + "</b>" + (o.meta ? "<small>" + esc(o.meta) + "</small>" : "") + (o.snip ? "<span>" + esc(cut(o.snip, 150)) + "</span>" : "") + "</a></li>";
  };
  var paint = function (q) {
    q = String(q || "").trim();
    if (!q) {
      status.textContent = "";
      res.innerHTML = '<div class="x-s26-empty"><p class="fineprint">Try one of these</p><div class="x-s26-chips">' +
        SUGGEST.map(function (s) { return '<button type="button" class="x-s26-chip" data-s26-q="' + esc(s) + '">' + esc(s) + "</button>"; }).join("") + "</div></div>";
      lastQ = ""; return;
    }
    if (q !== lastQ) { results = search(q); shown = {}; lastQ = q; }
    var total = 0, html = "";
    GROUPS.forEach(function (g) {
      var list = results[g[0]], n = list.length;
      if (!n) return;
      total += n;
      var k = shown[g[0]] || FIRST;
      html += '<section class="x-s26-group" data-g="' + g[0] + '" aria-label="' + esc(g[1]) + '"><h3>' + esc(g[1]) + ' <span class="pill">' + n.toLocaleString("en-US") + "</span></h3>" +
        '<ul class="x-s26-list">' + list.slice(0, k).map(hit).join("") + "</ul>" +
        (n > k ? '<button type="button" class="btn x-s26-more" data-s26-more="' + g[0] + '">Show more <span class="x-s26-left">' + (n - k).toLocaleString("en-US") + " left</span></button>" : "") + "</section>";
    });
    res.innerHTML = html;
    status.textContent = total ? total.toLocaleString("en-US") + (total === 1 ? " result" : " results") + " for “" + q + "”" : "No matches for “" + q + "”. Try fewer or shorter words.";
  };

  /* ---------- hash ---------- */
  var hashFor = function (q) { q = String(q || "").trim(); return "#/search" + (q ? "?q=" + encodeURIComponent(q).replace(/%20/g, "+") : ""); };
  var qOf = function (h) { var m = /^#\/search(?:\?(?:.*&)?q=([^&]*))?/.exec(h || ""); if (!m || !m[1]) return ""; try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch (e) { return m[1]; } };
  var setHash = function (q, push) {
    var h = hashFor(q);
    if (h === location.hash) return;
    try { history[push ? "pushState" : "replaceState"](history.state, "", h); } catch (e) { location.hash = h; }
    lastHash = location.hash;
  };

  var timer = 0;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { setHash(input.value, false); paint(input.value); }, 120);
  });

  /* ---------- open and close ---------- */
  var open = false, mainY = null, lastHash = null, pending = false;
  var baseTitle = doc.title.replace(/^.* · (?=ASI History Archive)/, "");
  var jumpY = function (y) { try { window.scrollTo({ top: y, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); } };
  var show = function (q) {
    var was = open;
    if (!was) {
      build();
      if (main && !main.hidden) mainY = window.scrollY;
      open = true;
    }
    if (window.XGoTo && XGoTo.stop) { try { XGoTo.stop(); } catch (e) {} }
    if (main) main.hidden = true;
    ["person-view", "x-pages"].forEach(function (id) { var el = doc.getElementById(id); if (el) el.hidden = true; });
    view.hidden = false;
    doc.title = "Search · " + baseTitle;
    if (input.value.trim() !== q.trim()) input.value = q;
    paint(q);
    if (!was) { jumpY(0); try { input.focus({ preventScroll: true }); } catch (e) {} }
  };
  var hide = function (h) {
    open = false; clearTimeout(timer);
    view.hidden = true;
    doc.title = baseTitle;
    if (PAGE_RE.test(h)) return; /* the page's own routers take it from here */
    if (main) main.hidden = false;
    if (pending) return;
    var target = h && h.length > 1 && h.charAt(1) !== "/" ? doc.getElementById(h.slice(1)) : null;
    if (target && window.XGoTo) XGoTo(target);
    else if (target) target.scrollIntoView({ block: "start" });
    else if (mainY != null) jumpY(mainY);
  };
  var route = function () {
    var h = location.hash || "";
    if (h === lastHash) return;
    lastHash = h;
    if (/^#\/search(\?|$)/.test(h)) show(qOf(h));
    else if (open) hide(h);
  };
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  /* fix 02:05: routes changed with history.pushState/replaceState fire no hashchange, so the results stayed over the new page */
  ["pushState", "replaceState"].forEach(function (k) {
    var o = history[k]; if (typeof o !== "function" || o.__s26) return;
    var w = function () { var r = o.apply(this, arguments); try { route(); if (typeof addBtn === "function") addBtn(); } catch (e) {} return r; };
    w.__s26 = true; history[k] = w;
  });

  /* ---------- clicks ---------- */
  var jumpTo = function (kind, id) {
    var S = window.ArchiveSite || {};
    if (kind === "e") { if (S.gotoEntry) S.gotoEntry(id); else if (window.XGoTo) XGoTo("e-" + id); }
    else if (kind === "p") { if (S.gotoPred) S.gotoPred(id); else if (window.XGoTo) XGoTo("p-" + id); }
    else {
      var d = doc.querySelector('#historyApp .x-hi__dot[data-go="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      if (d) d.click(); else if (window.XGoTo) XGoTo("history");
    }
  };
  view.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-s26-q],[data-s26-more],[data-s26-go]");
    if (!t) return;
    if (t.hasAttribute("data-s26-q")) {
      input.value = t.getAttribute("data-s26-q"); setHash(input.value, true); paint(input.value);
      try { input.focus({ preventScroll: true }); } catch (x) {}
      return;
    }
    if (t.hasAttribute("data-s26-more")) {
      var g = t.getAttribute("data-s26-more"), k = shown[g] || FIRST;
      shown[g] = k + STEP; paint(lastQ);
      var sec = res.querySelector('.x-s26-group[data-g="' + g + '"]'), hits = sec ? sec.querySelectorAll(".x-s26-hit") : [];
      if (hits[k]) hits[k].focus();
      return;
    }
    e.preventDefault();
    var v = t.getAttribute("data-s26-go"), c = v.indexOf(":"), kind = v.slice(0, c), id = v.slice(c + 1);
    pending = true;
    hide("#/");
    lastHash = "#/";
    try { history.pushState(null, "", "#/"); } catch (x) { location.hash = "#/"; }
    setTimeout(function () { pending = false; jumpTo(kind, id); }, 60);
  });

  /* ---------- keys: "/" focuses, arrows walk the results ---------- */
  var typing = function (el) { return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); };
  window.addEventListener("keydown", function (e) {
    if (!open || e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || typing(doc.activeElement) || doc.querySelector("dialog[open]")) return;
    e.preventDefault(); e.stopImmediatePropagation();
    input.focus(); input.select();
  }, true);
  view.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && !(e.key === "Enter" && e.target === input)) return;
    var hits = [].slice.call(res.querySelectorAll(".x-s26-hit"));
    if (e.key === "Enter") {
      clearTimeout(timer);
      if (input.value.trim() !== lastQ) { setHash(input.value, false); paint(input.value); hits = [].slice.call(res.querySelectorAll(".x-s26-hit")); }
      if (hits[0]) { e.preventDefault(); hits[0].click(); }
      return;
    }
    var i = hits.indexOf(e.target);
    if (e.target !== input && i < 0) return;
    e.preventDefault();
    var next = e.key === "ArrowDown" ? (e.target === input ? 0 : i + 1) : (e.target === input ? -2 : i - 1);
    if (next === -1) input.focus();
    else if (hits[next]) hits[next].focus();
  });

  /* ---------- the header button, inserted once ---------- */
  var addBtn = function () {
    if (doc.getElementById("x-s26-hbtn")) return;
    var theme = doc.getElementById("theme-btn"), nav = doc.querySelector("header.nav");
    if (!theme && !nav) return;
    var b = doc.createElement("button");
    b.type = "button"; b.id = "x-s26-hbtn"; b.className = "x-s26-hbtn";
    b.setAttribute("aria-label", "Search the archive"); b.title = "Search (/)";
    b.innerHTML = ICON;
    b.addEventListener("click", function () {
      if (open) { input.focus(); input.select(); return; }
      location.hash = hashFor("");
    });
    if (theme && theme.parentNode) theme.parentNode.insertBefore(b, theme); else nav.appendChild(b);
  };
  if (doc.readyState === "complete") addBtn(); else window.addEventListener("load", addBtn, { once: true });
  /* fix 02:05: the header can be re-rendered after load; re-insert the button on route changes (idempotent) */
  window.addEventListener("hashchange", addBtn); doc.addEventListener("DOMContentLoaded", addBtn);

  route();
  window.XSearch26 = { open: function (q) { location.hash = hashFor(q || ""); } };
})();
