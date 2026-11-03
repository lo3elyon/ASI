/* History: a mini-map of every milestone, chapter tabs, tag filters and a vertical timeline per chapter. */
(function () {
  "use strict";
  var host = document.getElementById("historyApp");
  if (!host || !window.Hark) return;
  var H = Hark.data("d-history") || { chapters: [] };
  var P = [];
  try { P = Hark.data("d-people") || []; } catch (e) { P = []; }
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var CH = H.chapters || [];
  var TAGS = ["control", "alignment", "intelligence-explosion", "neuroscience", "deep-learning", "transformers", "policy", "forecasting", "fiction", "risk-statement", "lab"];
  var COLORS = ["var(--x-ch-0)", "var(--x-ch-1)", "var(--x-ch-2)", "var(--x-ch-3)", "var(--x-ch-4)", "var(--x-ch-5)", "var(--x-ch-6)", "var(--x-ch-7)"];
  var MIN = 1863, MAX = 2026, PPY = 8, DOT = 44;
  var personId = {};
  P.forEach(function (p) { if (p && p.name) personId[p.name.toLowerCase()] = p.id; });

  var all = [];
  CH.forEach(function (c, ci) { c.milestones.forEach(function (m) { m._ci = ci; all.push(m); }); });

  var state = { ch: 0, tags: {} };
  var activeTags = function () { return TAGS.filter(function (t) { return state.tags[t]; }); };
  var matches = function (m) { var a = activeTags(); return !a.length || (m.tags || []).some(function (t) { return a.indexOf(t) >= 0; }); };

  var PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

  /* ---------- mini-map ---------- */
  var sorted = all.slice().sort(function (a, b) { return a.year - b.year; });
  /* One row of full-size tap targets: each dot sits at its year, nudged right only where
     dense years would make dots overlap; the decade ticks follow the same warped scale. */
  var prevX = -DOT;
  sorted.forEach(function (m) { m._x = Math.max((m.year - MIN) * PPY, prevX + DOT); prevX = m._x; });
  var width = prevX + DOT;
  var height = DOT;
  var posOf = function (y) {
    var a = null, b = null;
    sorted.forEach(function (m) { if (m.year < y) a = m; else if (!b) b = m; });
    if (b && b.year === y) return b._x + DOT / 2;
    if (!a) return (y - MIN) * PPY + DOT / 2;
    if (!b) return a._x + DOT / 2 + (y - a.year) * PPY;
    return a._x + DOT / 2 + (b._x - a._x) * (y - a.year) / (b.year - a.year);
  };
  var ticks = "";
  for (var y = 1870; y <= MAX; y += 10) ticks += '<span class="x-hi__tick" style="left:' + Math.round(posOf(y)) + 'px">' + y + "</span>";
  var dots = sorted.map(function (m) {
    return '<button type="button" class="x-hi__dot" data-go="' + esc(m.id) + '" style="left:' + m._x + "px;bottom:0;--c:" + COLORS[m._ci % COLORS.length] +
      '" aria-label="' + esc(m.year + ": " + m.title) + '" title="' + esc(m.year + " · " + m.title) + '"></button>';
  }).join("");
  var legend = CH.map(function (c, i) { return '<span class="x-hi__key" style="--c:' + COLORS[i % COLORS.length] + '">' + esc(c.title) + "</span>"; }).join("");

  host.innerHTML =
    '<div class="x-hi__map" aria-label="All milestones on a timeline">' +
      '<div class="x-hi__scroll"><div class="x-hi__axis" style="width:' + width + "px;height:" + (height + 28) + 'px">' +
        '<div class="x-hi__dots" style="height:' + height + 'px">' + dots + "</div>" +
        '<div class="x-hi__ticks">' + ticks + "</div>" +
      "</div></div>" +
      '<p class="x-hi__legend">' + legend + "</p>" +
    "</div>" +
    '<div class="x-hi__tags" role="group" aria-label="Filter by tag">' +
      TAGS.map(function (t) { return '<button type="button" class="x-hi__tag" data-tag="' + t + '" aria-pressed="false">' + t.replace(/-/g, " ") + "</button>"; }).join("") +
      '<button type="button" class="x-hi__tag x-hi__clear" data-clear hidden>Clear filter</button>' +
    "</div>" +
    '<div class="x-hi__tabs" role="tablist" aria-label="Chapters">' +
      CH.map(function (c, i) {
        return '<button type="button" role="tab" class="x-hi__tab" data-ch="' + i + '" style="--c:' + COLORS[i % COLORS.length] + '"><b>' + esc(c.title) + "</b><small>" + esc(c.years) + '<span class="x-hi__count"></span></small></button>';
      }).join("") +
    "</div>" +
    '<div class="x-hi__body" id="historyBody" role="tabpanel"></div>';

  var body = document.getElementById("historyBody");

  var card = function (m) {
    var people = (m.people || []).map(function (n) {
      var id = personId[String(n).toLowerCase()];
      return id ? '<a class="x-hi__who" href="#/person/' + esc(id) + '">' + esc(n) + "</a>" : '<span class="x-hi__who is-plain">' + esc(n) + "</span>";
    }).join("");
    var vid = m.youtube_id ? '<a class="x-hi__vid" href="#/watch/' + esc(m.youtube_id) + '" target="_blank" rel="noopener" data-watch="' + esc(m.youtube_id) + '" aria-label="Watch in a new tab: ' + esc(m.title) + '">' +
      '<img src="https://i.ytimg.com/vi/' + esc(m.youtube_id) + '/hqdefault.jpg" alt="" loading="lazy" /><span class="x-hi__play">' + PLAY + "</span></a>" : "";
    var quote = m.quote ? '<figure class="x-hi__quote"><blockquote>“' + esc(m.quote) + '”</blockquote>' + (m.quote_source ? "<figcaption>" + esc(m.quote_source) + "</figcaption>" : "") + "</figure>" : "";
    return '<li class="x-hi__item" id="hm-' + esc(m.id) + '" style="--c:' + COLORS[m._ci % COLORS.length] + '">' +
      '<span class="x-hi__year">' + esc(m.year) + "</span>" +
      '<article class="x-hi__card">' +
        "<h3>" + esc(m.title) + "</h3>" +
        (people ? '<p class="x-hi__people">' + people + "</p>" : "") +
        vid +
        (m.what ? "<p>" + esc(m.what) + "</p>" : "") +
        (m.why_it_matters ? '<p class="x-hi__why"><b>Why it matters:</b> ' + esc(m.why_it_matters) + "</p>" : "") +
        quote +
        '<p class="x-hi__foot">' +
          (m.source_url ? '<a class="link" href="' + esc(m.source_url) + '" target="_blank" rel="noopener">Source</a>' : "") +
          (m.tags || []).map(function (t) { return '<span class="x-hi__chip">' + esc(t.replace(/-/g, " ")) + "</span>"; }).join("") +
        "</p>" +
      "</article></li>";
  };

  var render = function () {
    var a = activeTags();
    host.querySelector("[data-clear]").hidden = !a.length;
    host.querySelectorAll(".x-hi__tag[data-tag]").forEach(function (b) { b.setAttribute("aria-pressed", !!state.tags[b.dataset.tag]); });
    host.querySelectorAll(".x-hi__dot").forEach(function (d) {
      var m = all.filter(function (x) { return x.id === d.dataset.go; })[0];
      d.classList.toggle("is-dim", !matches(m));
    });
    host.querySelectorAll(".x-hi__tab").forEach(function (t, i) {
      var n = CH[i].milestones.filter(matches).length;
      t.setAttribute("aria-selected", !a.length && i === state.ch);
      t.classList.toggle("is-dim", a.length > 0 && !n);
      t.querySelector(".x-hi__count").textContent = a.length ? " · " + n : "";
    });
    if (a.length) {
      var groups = CH.map(function (c) { return { c: c, list: c.milestones.filter(matches) }; }).filter(function (g) { return g.list.length; });
      var total = groups.reduce(function (s, g) { return s + g.list.length; }, 0);
      body.innerHTML = '<p class="x-hi__intro">' + total + " milestone" + (total === 1 ? "" : "s") + " tagged " + esc(a.map(function (t) { return t.replace(/-/g, " "); }).join(" or ")) + ", across " + groups.length + " chapter" + (groups.length === 1 ? "" : "s") + ".</p>" +
        groups.map(function (g) { return '<h3 class="x-hi__gh">' + esc(g.c.title) + " <small>" + esc(g.c.years) + '</small></h3><ol class="x-hi__line">' + g.list.map(card).join("") + "</ol>"; }).join("");
      return;
    }
    var c = CH[state.ch], prev = CH[state.ch - 1], next = CH[state.ch + 1];
    body.innerHTML =
      '<p class="x-hi__eyebrow">Chapter ' + (state.ch + 1) + " of " + CH.length + " · " + esc(c.years) + "</p>" +
      '<h3 class="x-hi__ct">' + esc(c.title) + "</h3>" +
      '<p class="x-hi__intro">' + esc(c.intro) + "</p>" +
      '<ol class="x-hi__line">' + c.milestones.map(card).join("") + "</ol>" +
      '<nav class="x-hi__pn" aria-label="Other chapters">' +
        (prev ? '<button type="button" class="btn" data-step="-1">← ' + esc(prev.title) + "</button>" : "<span></span>") +
        (next ? '<button type="button" class="btn" data-step="1">' + esc(next.title) + " →</button>" : "<span></span>") +
      "</nav>";
  };

  var showTab = function () {
    var t = host.querySelector('.x-hi__tab[data-ch="' + state.ch + '"]'), row = t && t.parentNode;
    if (row) row.scrollTo({ left: t.offsetLeft - row.offsetLeft - 8, behavior: "smooth" });
  };
  var flash = function (id) {
    var el = document.getElementById("hm-" + id); if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("is-flash"); void el.offsetWidth; el.classList.add("is-flash");
    setTimeout(function () { el.classList.remove("is-flash"); }, 2200);
  };

  host.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-go],[data-tag],[data-clear],[data-ch],[data-step]");
    if (!b) return;
    if (b.dataset.go) {
      var m = all.filter(function (x) { return x.id === b.dataset.go; })[0]; if (!m) return;
      state.tags = {}; state.ch = m._ci; render(); showTab(); flash(m.id); return;
    }
    if (b.dataset.tag) { state.tags[b.dataset.tag] = !state.tags[b.dataset.tag]; render(); return; }
    if (b.hasAttribute("data-clear")) { state.tags = {}; render(); return; }
    if (b.dataset.ch != null) { state.tags = {}; state.ch = +b.dataset.ch; render(); return; }
    if (b.dataset.step) {
      state.ch = Math.max(0, Math.min(CH.length - 1, state.ch + +b.dataset.step)); render(); showTab();
      document.getElementById("history").querySelector(".x-hi__tabs").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  render();
})();
