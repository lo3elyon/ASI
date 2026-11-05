/* load33.js: a personalised loading intro for every page. First load fills the load31 screen with the page's own
   moving faces, talk stills, quotes or milestones; every page change (nav, person, org, search, Back/Forward) plays a
   short intro of the page being opened. Click, a key or the X skips it. Reduced motion: still pictures, shorter. */
(function () {
  "use strict";
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.__xLoadMin = RM ? 500 : 1700;
  var cache = {};
  var data = function (id) {
    if (cache[id] !== undefined) return cache[id];
    var el = document.getElementById(id), v = null;
    try { var t = el && el.textContent.trim(); if (t) v = JSON.parse(t); } catch (e) {}
    if (!v && window.__xData && window.__xData[id]) v = window.__xData[id];
    if (v) cache[id] = v;
    if (!v && el && el.getAttribute("src") && !cache["f:" + id]) {
      cache["f:" + id] = 1;
      fetch(el.getAttribute("src")).then(function (r) { return r.json(); }).then(function (j) { cache[id] = j; }).catch(function () {});
    }
    return v;
  };
  ["d-people", "d-videos", "d-history", "d-preds", "d-trust", "d-entries"].forEach(data);
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var HUES = ["#f59e0b", "#14b8a6", "#22c55e", "#3b82f6", "#ef4444", "#eab308", "#06b6d4", "#f97316", "#84cc16", "#0ea5e9"];
  var hue = function (s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return HUES[h % HUES.length]; };
  var people = function () { var p = data("d-people"); return Array.isArray(p) ? p : []; };
  var byVideos = function () { return people().filter(function (p) { return p.photo; }).slice().sort(function (a, b) { return (b.n_videos || 0) - (a.n_videos || 0) || (a.id < b.id ? -1 : 1); }); };
  var initials = function (n) { return String(n || "?").split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join(""); };
  var face = function (p, badge) {
    var c = hue(p.id);
    return '<span class="x33-f" style="--c:' + c + '"><span class="x33-f__i">' + esc(initials(p.name)) + '</span>' +
      (p.photo ? '<img src="' + esc(p.photo) + '" alt="" loading="eager" decoding="async" onerror="this.remove()">' : "") +
      (badge ? '<b class="x33-f__b">' + esc(badge) + "</b>" : "") + '<em>' + esc(p.name) + "</em></span>";
  };
  var thumb = function (v) {
    return '<span class="x33-v" style="--c:' + hue(v.id) + '"><img src="https://i.ytimg.com/vi/' + esc(v.id) + '/mqdefault.jpg" alt="" decoding="async" onerror="this.remove()">' +
      (v.len ? "<b>" + esc(v.len) + "</b>" : "") + "<em>" + esc(String(v.t || "").slice(0, 58)) + "</em></span>";
  };
  var card = function (top, body, c) { return '<span class="x33-c" style="--c:' + c + '"><b>' + esc(top) + "</b><span>" + esc(String(body).slice(0, 110)) + "</span></span>"; };
  var row = function (items, rev, kind) {
    if (!items.length) return "";
    var html = items.join("");
    return '<div class="x33-row' + (rev ? " x33-row--rev" : "") + " x33-row--" + kind + '"><div class="x33-track">' + html + html + "</div></div>";
  };
  var take = function (arr, from, n) { var out = []; for (var i = 0; i < arr.length && out.length < n; i++) out.push(arr[(from + i) % arr.length]); return out; };
  var videosFor = function (pred, n) { var v = data("d-videos"); v = Array.isArray(v) ? v : []; var out = []; for (var i = 0; i < v.length && out.length < n; i++) if (pred(v[i])) out.push(v[i]); return out; };
  var trustOf = function () { var t = data("d-trust"); var m = {}; if (t && t.people) t.people.forEach(function (p) { m[p.id] = p.overall; }); return m; };
  var STC = { "Came true": "#22c55e", "Came true early": "#14b8a6", "Came true late": "#84cc16", "Partially true": "#eab308", "Wrong": "#ef4444", "Too early to tell": "#3b82f6", "Not yet (deadline ahead)": "#f97316" };

  var keyOf = function (h) {
    h = h || "";
    var m = h.match(/^#\/(person|org|trust)\/([^?&#\/]+)/); if (m) return m[1] + ":" + decodeURIComponent(m[2]);
    m = h.match(/^#\/([a-z]+)/); if (m) return m[1];
    m = h.match(/^#([a-z][\w-]*)$/); if (m) return m[1];
    return "home";
  };
  var ICON0 = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">';
  var ICON = ICON0;
  var build = function (key) {
    var P = byVideos(), T = trustOf(), title = "", sub = "", rows = "", hero = "";
    var k = key.split(":")[0], arg = key.slice(k.length + 1);
    var faces = function (from, n, badgeFn) { return take(P, from, n).map(function (p) { return face(p, badgeFn ? badgeFn(p) : ""); }); };
    var quotes = function (from, n) { return take(P.filter(function (p) { return p.warning; }), from, n).map(function (p) { return card(p.name, "\u201C" + p.warning + "\u201D", hue(p.id)); }); };
    if (k === "person" || k === "trust" && arg) {
      var me = people().filter(function (p) { return p.id === arg; })[0];
      if (me) {
        title = me.name; sub = me.role || "";
        hero = '<div class="x33-hero" style="--c:' + hue(me.id) + '"><span class="x33-hero__ring"></span>' + face(me, T[me.id] != null ? "Trust " + T[me.id] : "") + "</div>" +
          (me.warning ? '<p class="x33-q">\u201C' + esc(me.warning) + "\u201D</p>" : "");
        var vs = videosFor(function (v) { return v.p && v.p.indexOf(me.id) > -1; }, 12);
        var qs = (me.quotes || []).slice(0, 8).map(function (q) { return card(me.name, "\u201C" + (q.q || q.text || q) + "\u201D", hue(me.id + q)); });
        rows = row(vs.length ? vs.map(thumb) : faces(3, 12), false, vs.length ? "v" : "f") + (qs.length ? row(qs, true, "c") : "");
      }
    }
    if (!title) switch (k) {
      case "history": {
        var h = data("d-history"), ms = [];
        if (h && h.chapters) h.chapters.forEach(function (c) { (c.milestones || []).forEach(function (m) { ms.push(m); }); });
        title = "History"; sub = "From 1863 fiction to today's frontier labs";
        rows = row(ms.filter(function (m, i) { return i % 3 === 0; }).slice(0, 18).map(function (m) { return card(String(m.year), m.title, hue(m.id)); }), false, "c") +
          row(take(P.filter(function (p) { return p.group === "pioneer" || p.group === "fiction" || p.group === "theory"; }), 0, 14).map(function (p) { return face(p); }), true, "f");
        break; }
      case "archive": {
        var e = data("d-entries"); e = Array.isArray(e) ? e : [];
        title = "The Archive"; sub = "What they said, in their own words";
        rows = row(e.slice(0, 16).map(function (x) { return card(x.year + " \u00B7 " + x.person, x.title, hue(x.id)); }), false, "c") + row(faces(10, 14), true, "f");
        break; }
      case "people": title = "People"; sub = people().length + " researchers, pioneers and neuroscientists"; rows = row(faces(0, 16), false, "f") + row(faces(16, 16), true, "f"); break;
      case "portraits": title = "Portraits"; sub = "Faces of the superintelligence debate"; rows = row(faces(30, 16), false, "f") + row(faces(46, 16), true, "f"); break;
      case "media": {
        var v1 = videosFor(function (v) { return v.k === "lecture" || v.k === "talk"; }, 14), v2 = videosFor(function (v) { return v.k && v.k !== "lecture" && v.k !== "talk"; }, 14);
        var nv = data("d-videos"); title = "Media Theater"; sub = (Array.isArray(nv) ? nv.length.toLocaleString() : "3,296") + " talks, debates and interviews";
        rows = row(v1.map(thumb), false, "v") + row((v2.length ? v2 : v1).map(thumb), true, "v"); break; }
      case "tracker": {
        var pr = data("d-preds"); pr = Array.isArray(pr) ? pr : [];
        title = "Prediction tracker"; sub = "What they predicted, and what came true";
        rows = row(pr.slice(0, 15).map(function (x) { return card(x.year_made + " \u00B7 " + x.who + " \u00B7 " + x.status, x.prediction, STC[x.status] || "#3b82f6"); }), false, "c") +
          row(pr.slice(15).concat(pr.slice(0, 3)).map(function (x) { return card(x.year_made + " \u00B7 " + x.who + " \u00B7 " + x.status, x.prediction, STC[x.status] || "#3b82f6"); }), true, "c");
        break; }
      case "trust": title = "Trust"; sub = "Whom should you trust on AGI?";
        rows = row(faces(0, 16, function (p) { return T[p.id] != null ? String(T[p.id]) : ""; }), false, "f") + row(quotes(0, 10), true, "c"); break;
      case "learn": title = "Learn"; sub = "Big ideas, explained simply"; rows = row(quotes(8, 10), false, "c") + row(faces(60, 16), true, "f"); break;
      case "org": {
        var nm = arg.replace(/-/g, " "), words = nm.toLowerCase().split(" ").filter(function (w) { return w.length > 2; });
        var mem = P.filter(function (p) { var o = String(p.org || "").toLowerCase(); return words.length && words.every(function (w) { return o.indexOf(w) > -1; }); });
        title = nm.replace(/\b\w/g, function (c) { return c.toUpperCase(); }); sub = mem.length ? mem.length + " people in this archive" : "Organisation";
        rows = row((mem.length > 3 ? mem.slice(0, 16) : take(P, 5, 14)).map(function (p) { return face(p); }), false, "f") + row(quotes(4, 8), true, "c"); break; }
      case "search": { var q = (location.hash.match(/[?&]q=([^&]*)/) || [])[1]; title = "Search"; sub = q ? "Looking for \u201C" + decodeURIComponent(q.replace(/\+/g, " ")) + "\u201D" : "Talks, people, quotes and predictions";
        rows = row(faces(20, 14), false, "f") + row(videosFor(function (v) { return v.k === "interview"; }, 12).map(thumb), true, "v"); break; }
      case "ask": title = "Ask the Archive"; sub = "Answers from what they actually said"; rows = row(quotes(12, 10), false, "c") + row(faces(40, 16), true, "f"); break;
      case "compare": title = "Compare"; sub = "Side by side, claim by claim"; rows = row(faces(8, 16, function (p) { return T[p.id] != null ? String(T[p.id]) : ""; }), false, "f") + row(quotes(2, 10), true, "c"); break;
      default: title = "Before It Was Real"; sub = "75 years of superintelligence predictions, people and talks";
        rows = row(faces(0, 18), false, "f") + row(quotes(0, 10), true, "c") + row(videosFor(function (v) { return v.k === "lecture"; }, 14).map(thumb), false, "v");
    }
    return '<div class="x33-in"><div class="x33-head">' + hero + '<h2 class="x33-t">' + esc(title) + '</h2><p class="x33-s">' + esc(sub) + "</p></div>" + rows +
      '<div class="x33-bar"><span></span></div></div>';
  };

  /* first load: the load31 screen gets this page's intro */
  var first = document.getElementById("x-load");
  if (first && !first.classList.contains("is-done")) {
    try { var box = first.querySelector(".xl-box"); var wrap = document.createElement("div"); wrap.className = "x33-first"; wrap.innerHTML = build(keyOf(location.hash)); if (box) box.classList.add("x33-mini"); first.appendChild(wrap); first.classList.add("x33-on");
      var skip = function () { if (first.classList.contains("is-done")) return; first.classList.add("is-done"); first.setAttribute("aria-hidden", "true"); setTimeout(function () { if (first.parentNode) first.parentNode.removeChild(first); }, 600); document.removeEventListener("keydown", skip, true); };
      var xb = document.createElement("button"); xb.type = "button"; xb.className = "x33-x"; xb.setAttribute("aria-label", "Skip intro"); xb.innerHTML = ICON + '<path d="M6 6l12 12M18 6L6 18"/></svg>';
      first.appendChild(xb); first.addEventListener("click", skip); document.addEventListener("keydown", skip, true); } catch (e) {}
  }

  /* page changes */
  var ov = null, hideT = 0, last = keyOf(location.hash), DUR = RM ? 450 : 1150;
  var hide = function () { clearTimeout(hideT); if (ov) { ov.classList.remove("is-on"); ov.setAttribute("aria-hidden", "true"); } };
  var off = function () { try { return localStorage.getItem("intro33") === "off"; } catch (e) { return false; } };
  var show = function (key) {
    if (off() || !document.body || document.getElementById("x-load")) return;
    if (!ov) {
      ov = document.createElement("div"); ov.id = "x-intro33"; ov.setAttribute("role", "status");
      document.body.appendChild(ov);
      ov.addEventListener("click", hide);
      document.addEventListener("keydown", function () { if (ov.classList.contains("is-on")) hide(); }, true);
      document.addEventListener("wheel", function () { if (ov.classList.contains("is-on")) hide(); }, { passive: true, capture: true });
    }
    ov.innerHTML = '<button type="button" class="x33-x" aria-label="Skip intro">' + ICON + '<path d="M6 6l12 12M18 6L6 18"/></svg></button>' + build(key);
    ov.style.setProperty("--x33-dur", DUR + "ms");
    ov.classList.remove("is-on"); void ov.offsetWidth; ov.classList.add("is-on"); ov.removeAttribute("aria-hidden");
    clearTimeout(hideT); hideT = setTimeout(hide, DUR);
  };
  var changed = function () {
    var k = keyOf(location.hash);
    if (k === last) return;
    last = k; show(k);
  };
  window.addEventListener("hashchange", changed);
  window.addEventListener("popstate", changed);
  var op = history.pushState;
  if (typeof op === "function") history.pushState = function () { var r = op.apply(this, arguments); setTimeout(changed, 0); return r; };
  /* warm the picture cache once the page is idle so intros show faces at once */
  var warm = function () { byVideos().slice(0, 80).forEach(function (p) { var i = new Image(); i.decoding = "async"; i.src = p.photo; }); };
  if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 4000 }); else setTimeout(warm, 2500);
  window.Intro33 = { show: function (k) { show(k || keyOf(location.hash)); }, keyOf: keyOf };
})();
