/* fix15b.js: Batch 15, the rest. Loaded last.
   0. The one ICONS map: draws the SVG into every <i class="x-ic" data-ic="..."> (the emoji replacements).
   2. Media filters: Clear filters shows as soon as a box has text.
   3. Home Ask popover closes on an outside click and on Esc.
   6. #/policy and #/safety pages (XThemePage), from pages.js's shared helpers.
   7. Robert Miles, David Krueger, Jacob Steinhardt: no Wikipedia link, internal bio only.
   8. Person pages: a Compare button and Copy link with a "Link copied" toast. */
(function () {
  "use strict";
  var doc = document;

  /* ---------- 0. icons ---------- */
  var C = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; };
  var P = function (d) { return '<path d="' + d + '"/>'; };
  var ICONS = {
    bolt: P("M13 2 4 14h7l-1 8 9-12h-7z"),
    boom: P("M12 2l2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z"),
    bulb: P("M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"),
    check: P("M4 12.5l5 5L20 6.5"),
    chip: '<rect x="5" y="5" width="14" height="14" rx="2"/>' + P("M9 1.5v3.5M15 1.5v3.5M9 19v3.5M15 19v3.5M1.5 9H5M1.5 15H5M19 9h3.5M19 15h3.5"),
    cross: P("M6 6l12 12M18 6L6 18"),
    flame: P("M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8a7 7 0 0 0 7 7z"),
    growth: P("M3 17l6-6 4 4 8-8M15 7h6v6"),
    pin: P("M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z") + C(12, 9, 2.5),
    puzzle: P("M4 7h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H4z"),
    rocket: P("M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3c2-6 7-9 14-9 0 7-3 12-9 14z") + C(15, 9, 1.5),
    sparkle: P("M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"),
    speaker: P("M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"),
    thumbup: P("M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.1 21H7"),
    thumbdown: P("M7 14V3H3v11zM7 14l4 8a3 3 0 0 0 3-3v-4h5.5a2 2 0 0 0 2-2.3l-1.4-8A2 2 0 0 0 18.1 3H7"),
    trash: P("M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"),
    turtle: P("M3 15h18M5 15a7 6 0 0 1 14 0M19 13h1.5a1.5 1.5 0 0 0 0-3H18M7 15v3M17 15v3"),
    brain: P("M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V6a3 3 0 0 0-3-2zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"),
    clock: C(12, 12, 9) + P("M12 7v5l3 2"),
    external: P("M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"),
    history: P("M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2"),
    info: C(12, 12, 9) + P("M12 11v6M12 7.5v.01"),
    palette: P("M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z") + C(7.5, 11, 1) + C(10, 7, 1) + C(15, 7.5, 1),
    search: C(11, 11, 7) + P("M20 20l-4-4"),
    video: '<rect x="2.5" y="5" width="19" height="14" rx="3"/>' + P("M10 9.2v5.6l4.8-2.8z"),
    robot: '<rect x="5" y="8" width="14" height="11" rx="2"/>' + P("M12 4.5V8M9 13v.01M15 13v.01M9.5 16h5") + C(12, 3.5, 1),
    agi: C(12, 12, 3) + P("M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5 19 19M5 19l2.5-2.5M16.5 7.5 19 5"),
    hero: P("M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z"),
    genie: P("M3 15h12l4-5h2M5 15c0 3 3 4 6 4s5-1 6-4M10 15c0-2 1-3 2-3s2 1 2 3M12 9V7"),
    paperclip: P("M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"),
    target: C(12, 12, 9) + C(12, 12, 5) + C(12, 12, 1.5),
    flashlight: P("M8 2h8v5l-2 3v12h-4V10L8 7zM12 13v2"),
    globe: C(12, 12, 9) + P("M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"),
    hand: P("M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V3.5a1.5 1.5 0 0 1 3 0V10M13 10V5a1.5 1.5 0 0 1 3 0v6M16 9a1.5 1.5 0 0 1 3 0v4a8 8 0 0 1-8 8 7 7 0 0 1-6-4l-2-4a1.5 1.5 0 0 1 2.6-1.5L7 14"),
    ask: P("M7.9 20A9 9 0 1 0 4 16.1L2 22z"),
    tag: P("M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-6.9 6.9a1 1 0 0 1-1.4 0z") + C(8, 8, 1.3),
    columns: P("M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10M2 10l10-7 10 7z"),
    shield: P("M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"),
    hourglass: P("M6 3h12M6 21h12M7 3v3l5 6 5-6V3M7 21v-3l5-6 5 6v3"),
    network: P("M5 6l7 12 7-12zM5 6h14") + C(5, 6, 2) + C(19, 6, 2) + C(12, 18, 2),
    llm: P("M4 5h16v11H9l-5 4zM8 9h8M8 12h5"),
    quote: P("M10 7H6a2 2 0 0 0-2 2v3h4v3a2 2 0 0 1-2 2M20 7h-4a2 2 0 0 0-2 2v3h4v3a2 2 0 0 1-2 2"),
    scroll: P("M8 3h11a2 2 0 0 1 2 2v1h-4M8 3a2 2 0 0 0-2 2v14a2 2 0 0 1-2 2h12a2 2 0 0 0 2-2V6M10 9h5M10 13h5"),
    compare: '<rect x="3" y="3" width="18" height="18" rx="2"/>' + P("M12 3v18"),
    stats: P("M3 3v18h18M18 17V9M13 17V5M8 17v-3"),
    tv: '<rect x="2" y="7" width="20" height="14" rx="2"/>' + P("M8 2l4 5 4-5"),
    year: '<rect x="3" y="4" width="18" height="18" rx="2"/>' + P("M16 2v4M8 2v4M3 10h18"),
    crystal: C(12, 10, 7) + P("M6 21h12M8 17l-1 4M16 17l1 4"),
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/>' + P("M9 9v.01M15 15v.01M15 9v.01M9 15v.01M12 12v.01"),
    warning: P("M12 3l10 18H2zM12 10v5M12 18v.01")
  };
  ICONS.oldclock = ICONS.hourglass; ICONS.calendar = ICONS.year; ICONS.idea = ICONS.bulb;
  var DEF = C(12, 12, 3);
  var draw = function (root) {
    (root || doc).querySelectorAll("i.x-ic[data-ic]:not([data-f15])").forEach(function (i) {
      i.setAttribute("data-f15", "");
      i.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[i.getAttribute("data-ic")] || DEF) + "</svg>";
    });
  };
  window.XIcons = { map: ICONS, draw: draw };
  draw();
  var qd = 0;
  new MutationObserver(function () { if (!qd) qd = requestAnimationFrame(function () { qd = 0; draw(); }); }).observe(doc.body, { childList: true, subtree: true });

  /* ---------- 2. Clear filters shows as soon as a filter box has text (apply() still hides it when all are clear) ---------- */
  ["ttQ", "ttPerson"].forEach(function (id) {
    var el = doc.getElementById(id);
    if (el) el.addEventListener("input", function () { var c = doc.getElementById("ttClear"); if (c && el.value.trim()) c.hidden = false; });
  });

  /* ---------- 3. Ask popover: outside click and Esc close it ---------- */
  var askPanel = doc.getElementById("askPanel"), askHide = doc.getElementById("askHide"), askTg = doc.getElementById("askToggle");
  if (askPanel && askHide) {
    doc.addEventListener("pointerdown", function (e) {
      if (askPanel.hidden || !e.target.closest || e.target.closest(".x-ask")) return;
      askHide.click();
    }, true);
    doc.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || askPanel.hidden) return;
      e.preventDefault();
      askHide.click();
      if (askTg) try { askTg.focus({ preventScroll: true }); } catch (x) {}
    });
  }

  /* ---------- 6. #/policy and #/safety ---------- */
  var THEMES = {
    policy: {
      name: "Policy & governance", eyebrow: "Theme",
      sub: "Laws, hearings, treaties and the people who pushed for them.",
      intro: ["For most of the archive's 75 years, superintelligence was a question for philosophers and a few researchers. Governments came late: a handful of reports in the 2010s, then, after ChatGPT, Senate hearings, the Bletchley summit, executive orders and the EU AI Act.",
        "This page gathers every milestone, archive entry, person, talk and prediction that mentions regulation, governance, law or ethics, oldest first. Talks are newest first."],
      re: /regulat|policy|governance|legislat|senate|congress|hearing|treaty|summit|executive order|\bai act\b|\blaw\b|\bethic|fairness/i,
      tags: ["policy"], topics: [["policy", "Policy & governance"], ["ethics", "Ethics"]], other: ["#/safety", "Safety & alignment"]
    },
    safety: {
      name: "Safety & alignment", eyebrow: "Theme",
      sub: "The control problem, alignment and the research meant to solve them.",
      intro: ["The worry is old: Turing and I. J. Good both asked what happens when machines outthink us. It became a research field in the 2000s and 2010s, with the control problem, value alignment and, later, interpretability, and it moved to the centre after ChatGPT.",
        "This page gathers every milestone, archive entry, person, talk and prediction that mentions control, alignment, existential risk or interpretability, oldest first. Talks are newest first."],
      re: /control problem|stay in control|lose control|losing control|corrigib|takeover|disempower|align|extinct|existential|catastroph|\bdoom|p\(doom\)|interpretab|mechanistic/i,
      tags: ["control", "alignment", "risk-statement"], topics: [["control", "The control problem"], ["alignment", "Alignment"], ["ai-risk", "AI risk & extinction"], ["interpretability", "Interpretability"]], other: ["#/policy", "Policy & governance"]
    }
  };
  window.XThemePage = function (kind) {
    var K = window.XPagesKit, T = THEMES[kind];
    if (!K || !T) return { title: "Page not found", html: "" };
    var h = K.topicHits({ slug: "x15-" + kind, re: T.re, tags: T.tags }), parts = [], esc = K.esc;
    var acts = '<div class="x-pg__acts">' + T.topics.map(function (t) { return '<a class="btn" href="#/topic/' + t[0] + '">' + esc(t[1]) + "</a>"; }).join("") +
      '<a class="btn" href="' + T.other[0] + '">' + esc(T.other[1]) + " →</a></div>";
    parts.push(K.section("", K.head(T.eyebrow, esc(T.name), esc(T.sub), acts) + '<div class="prose">' + T.intro.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>"));
    parts.push(K.stats([[h.miles.length, "Milestones"], [h.entries.length, "Archive entries"], [h.people.length, "People"], [h.vids.length, "Talks"], [h.preds.length, "Predictions"]]));
    if (h.miles.length) parts.push(K.section("", K.head("", "History milestones") + K.growing("xm-" + kind, h.miles, K.mileRow, 12, '<ol class="timeline">', "</ol>")));
    if (h.entries.length) parts.push(K.section("", K.head("", "Archive entries") + K.growing("xe-" + kind, h.entries, function (e) { return K.entryRow(e, true); }, 12, '<ol class="timeline">', "</ol>")));
    if (h.people.length) parts.push(K.section("", K.head("", "People") + K.growing("xp-" + kind, h.people, K.personChip, 40, '<div class="x-pg__people">', "</div>")));
    if (h.preds.length) parts.push(K.section("", K.head("", "Predictions") + K.growing("xr-" + kind, h.preds, K.predRow, 12, '<ol class="timeline">', "</ol>")));
    if (h.vids.length) parts.push(K.section("", K.head("", "Talks", "Each plays here in the video window. Nothing starts until you press Play.") + K.growing("xv-" + kind, h.vids, K.vidLink, 20, '<ul class="x-pg__vids">', "</ul>")));
    if (!h.n) parts.push('<p class="fineprint">Nothing in the archive matches this theme yet.</p>');
    return { title: T.name, html: parts.join("") };
  };
  /* a deep link to #/policy or #/safety routed before this file loaded: draw it again */
  if (/^#\/(policy|safety)\/?$/.test(location.hash) && window.XPagesRoute) window.XPagesRoute();

  /* ---------- 7 + 8. person pages ---------- */
  var NO_WIKI = { "robert-miles": 1, "rob-miles": 1, "david-krueger": 1, "jacob-steinhardt": 1 };
  var toastEl = null, toastT = 0;
  var toast = function (t) {
    if (!toastEl) {
      toastEl = doc.createElement("div"); toastEl.className = "x-f15toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
      doc.body.appendChild(toastEl);
    }
    toastEl.textContent = t; toastEl.classList.add("is-on");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  };
  var copy = function (txt) {
    var fallback = function () {
      var ta = doc.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      doc.body.appendChild(ta); ta.select(); var ok = false; try { ok = doc.execCommand("copy"); } catch (e) {} ta.remove();
      toast(ok ? "Link copied" : "Copy failed: " + txt);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast("Link copied"); }, fallback);
    else fallback();
  };
  var pv = doc.getElementById("person-view");
  var pid = function () { var m = /^#\/person\/([^/?#]+)/.exec(location.hash); return m ? decodeURIComponent(m[1]) : ""; };
  var paintPerson = function () {
    if (!pv || pv.hidden) return;
    var id = pid(); if (!id) return;
    var top = pv.querySelector(".x-pv__top");
    if (top && !top.querySelector("[data-f15]")) {
      top.insertAdjacentHTML("beforeend",
        '<a class="btn" data-f15 href="#/compare/' + encodeURIComponent(id) + '">Compare</a>' +
        '<button class="btn" type="button" data-f15 data-f15-copy>Copy link</button>');
    }
    if (NO_WIKI[id]) pv.querySelectorAll('a[href*="wikipedia.org"]').forEach(function (a) { var li = a.closest("li"); (li && li.children.length === 1 ? li : a).remove(); });
  };
  if (pv) {
    pv.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-f15-copy]"); if (!b) return;
      e.preventDefault(); copy(location.href);
    });
    var qp = 0;
    new MutationObserver(function () { if (!qp) qp = requestAnimationFrame(function () { qp = 0; paintPerson(); }); }).observe(pv, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    window.addEventListener("hashchange", function () { setTimeout(paintPerson, 0); });
    paintPerson();
  }
})();
