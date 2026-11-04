/* trust.js: the Trust section (#trust, and the route #/trust or #/trust/<person-id>).
   Reads trust.json (#d-trust). Builds: hero with count-up stats, quick answer, leaderboard (sort, filter, search,
   weights saved in localStorage, FLIP on click), in-page person detail (radar, four tabs), compare (2-3 radars
   overlaid), consistency meter (Chart.js scatter), verdict wall and a how-to-judge explainer.
   Motion only on scroll-in (IntersectionObserver), click, or hover glow (CSS). No timers repeat. */
(function () {
  "use strict";
  var doc = document;
  var root = doc.getElementById("trustApp");
  if (!root) return;
  var DATA = null;
  try { DATA = window.Hark && Hark.data ? Hark.data("d-trust") : null; } catch (e) { DATA = null; }
  if (!DATA || !DATA.people) { try { DATA = JSON.parse(doc.getElementById("d-trust").textContent); } catch (e) { DATA = null; } }
  if (!DATA || !DATA.people || !DATA.people.length) return;

  var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HAS_IO = "IntersectionObserver" in window;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var cmpName = function (a, b) { return a.name.localeCompare(b.name, "en"); };
  var fmt = function (n) { return (Math.round(n * 10) / 10).toFixed(1); };

  /* ---------- icons (inline SVG line icons) ---------- */
  var sv = function (body, extra) { return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' + (extra || "") + ">" + body + "</svg>"; };
  var IC = {
    shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
    branch: '<circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M6 7.2v9.6"/><path d="M18 11.2c0 3.5-3 4.3-6.2 4.8-2 .3-3.4 1-4.3 2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    scale: '<path d="M12 3v18"/><path d="M7 21h10"/><path d="M4 7h16"/><path d="m4 7-2.5 6a3 3 0 0 0 5 0z"/><path d="m20 7-2.5 6a3 3 0 0 0 5 0z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v1.6"/><path d="m19 4-1 1.2"/><path d="m5 4 1 1.2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4"/><path d="M18 14.8c1.8.7 3 2.4 3.5 5.2"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    linkOff: '<path d="M9 17H7A5 5 0 0 1 7 7"/><path d="M15 7h2a5 5 0 0 1 4 8"/><path d="M8 12h3"/><path d="m2 2 20 20"/>',
    linkHalf: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8" stroke-dasharray="2 2.5"/>',
    quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6"/><path d="M14 7h4v4c0 3-1.5 5-4 6"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="m9 21 3-7 3 3v4"/><path d="m7 12 3-4 4 1 3 3"/><path d="m10 8-2 6"/>',
    puzzle: '<path d="M4 8h3a2 2 0 1 0 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H4z"/><path d="M14 8h6v10h-6"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15v3"/><path d="M11 10v8"/><path d="M15 12v6"/><path d="M19 6v12"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    minus: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    star: '<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.5l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>',
    ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    sliders: '<path d="M4 6h10"/><path d="M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h4"/><path d="M12 12h8"/><circle cx="10" cy="12" r="2"/><path d="M4 18h12"/><circle cx="18" cy="18" r="2"/>',
    sort: '<path d="M7 4v16"/><path d="m3 8 4-4 4 4"/><path d="M17 20V4"/><path d="m13 16 4 4 4-4"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
    scatter: '<path d="M3 3v18h18"/><circle cx="8" cy="15" r="1.5"/><circle cx="12" cy="10" r="1.5"/><circle cx="16" cy="13" r="1.5"/><circle cx="18" cy="6" r="1.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>',
    x: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>',
    halfC: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" opacity=".55"/>'
  };
  var ic = function (k) { return sv(IC[k] || ""); };

  /* ---------- dimensions and verdicts ---------- */
  var DIMS = [
    { k: "evidence", n: "Evidence", s: "ev", ic: "doc" },
    { k: "logic", n: "Logic", s: "lo", ic: "branch" },
    { k: "track_record", n: "Track record", s: "tr", ic: "target" },
    { k: "consistency", n: "Consistency", s: "co", ic: "scale" },
    { k: "openness", n: "Openness", s: "op", ic: "eye" }
  ];
  var dimStyle = function (d) { return "--c: var(--x-tr-" + d.s + "); --ci: var(--x-tr-" + d.s + "-ink)"; };
  var VERD = [
    { n: "Supported", s: "sup", ic: "check" },
    { n: "Partly supported", s: "part", ic: "halfC" },
    { n: "Too early", s: "early", ic: "clock" },
    { n: "Unfalsifiable", s: "unf", ic: "help" },
    { n: "Unsupported", s: "uns", ic: "minus" },
    { n: "Contradicted", s: "con", ic: "x" }
  ];
  var VBY = {}; VERD.forEach(function (v) { VBY[v.n] = v; });
  var vStyle = function (n) { var v = VBY[n] || VERD[3]; return "--c: var(--x-tr-" + v.s + "); --ci: var(--x-tr-" + v.s + "-ink)"; };
  var badge = function (n) { var v = VBY[n] || VERD[3]; return '<span class="x-tr-badge" style="' + vStyle(n) + '">' + ic(v.ic) + esc(n) + "</span>"; };
  var TYPES = [["prediction", "Prediction"], ["factual", "Factual"], ["normative", "Normative"]];
  var GROUPS = [
    { k: "res", n: "Researchers", re: /professor|researcher|research|scientist|forecaster|philosopher|alignment|educator|roboticist|DeepLearning\.AI|Google Brain|executive director|director, center/i },
    { k: "lead", n: "Lab leaders/CEOs", re: /\bCEO\b|chief executive|chairman|chief AGI scientist|chief scientist|founder of xAI/i },
    { k: "crit", n: "Critics", re: /commentator|critic|sceptic|skeptic|Distributed AI|DAIR|Santa Fe|Robust\.AI|ARC-AGI|Economics|general partner/i }
  ];

  /* ---------- people ---------- */
  var ARCH = {};
  try { (Hark.data("d-people") || []).forEach(function (p) { ARCH[p.id] = p; }); } catch (e) {}
  var P = DATA.people.slice().map(function (p) {
    var o = Object.create(p);
    o.sc = {}; DIMS.forEach(function (d) { o.sc[d.k] = +(p.scores && p.scores[d.k] && p.scores[d.k].score) || 0; });
    o.groups = GROUPS.filter(function (g) { return g.re.test(p.role_now || ""); }).map(function (g) { return g.k; });
    if (!o.groups.length) o.groups = ["res"];
    o.hay = [p.name, p.role_now, p.stance].join(" ").toLowerCase();
    o.inArchive = !!ARCH[p.id];
    o.words = (o.sc.logic + o.sc.evidence) / 2;
    return o;
  });
  var BYID = {}; P.forEach(function (p) { BYID[p.id] = p; });
  var initials = function (n) { return String(n || "?").split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase(); };
  var avatar = function (p) {
    var a = ARCH[p.id] || { id: p.id, name: p.name, photo: "" };
    if (typeof window.XPeopleAvatar === "function") { try { return window.XPeopleAvatar(a, ""); } catch (e) {} }
    return '<span class="x-pav" aria-hidden="true"><span class="x-pav__ini">' + esc(initials(p.name)) + "</span></span>";
  };
  var ALLCLAIMS = [];
  P.forEach(function (p) { (p.claims || []).forEach(function (c, i) { ALLCLAIMS.push({ p: p, c: c, i: i }); }); });
  var SRC = {};
  P.forEach(function (p) { (p.claims || []).concat(p.actions || []).forEach(function (x) { if (x.source_url) SRC[x.source_url] = 1; }); });
  var NSRC = Object.keys(SRC).length;
  var AS_OF = (function () { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(DATA.as_of || ""); if (!m) return DATA.as_of || ""; return +m[3] + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m[2] - 1] + " " + m[1]; })();

  /* ---------- weights ---------- */
  var KEY = "x-tr-weights";
  var W = {}; DIMS.forEach(function (d) { W[d.k] = 1; });
  try { var sw = JSON.parse(localStorage.getItem(KEY) || "null"); if (sw) DIMS.forEach(function (d) { var v = +sw[d.k]; if (v >= 0 && v <= 5) W[d.k] = Math.round(v); }); } catch (e) {}
  var equalW = function () { var f = W[DIMS[0].k]; return DIMS.every(function (d) { return W[d.k] === f; }); };
  var custom = function (p) {
    if (equalW()) return p.overall;
    var s = 0, t = 0; DIMS.forEach(function (d) { s += W[d.k] * p.sc[d.k]; t += W[d.k]; });
    return t ? Math.round((s / t) * 10) / 10 : p.overall;
  };
  var saveW = function () { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) {} };

  /* ---------- shared pieces ---------- */
  var ringColor = function (v) { return v >= 7 ? "co" : v >= 6 ? "cy" : v >= 5 ? "ev" : v >= 4 ? "op" : "con"; };
  var ring = function (v, lab) {
    var s = ringColor(v);
    return '<span class="x-tr-ring" style="--c: var(--x-tr-' + s + ')" data-v="' + v + '"><svg viewBox="0 0 60 60" aria-hidden="true"><circle class="bg" cx="30" cy="30" r="25" pathLength="100"/><circle class="fg" cx="30" cy="30" r="25" pathLength="100"/></svg><b>' + fmt(v) + "</b>" + (lab ? "<small>" + esc(lab) + "</small>" : "") + "</span>";
  };
  var setRing = function (el, v) {
    if (!el) return;
    el.setAttribute("data-v", v);
    el.style.setProperty("--c", "var(--x-tr-" + ringColor(v) + ")");
    el.querySelector("b").textContent = fmt(v);
    if (el.classList.contains("is-in") || el.closest(".is-in")) el.querySelector(".fg").style.strokeDashoffset = String(100 - v * 10);
  };
  var fillRing = function (el) { var v = +el.getAttribute("data-v"); el.querySelector(".fg").style.strokeDashoffset = String(100 - v * 10); };
  var medal = function (r) {
    if (r > 3) return '<span class="x-tr-rank" aria-label="Rank ' + r + '">' + r + "</span>";
    return '<span class="x-tr-medal" data-m="' + r + '" aria-label="Rank ' + r + '"><svg viewBox="0 0 34 40" aria-hidden="true"><path d="M8 0h7l4 12h-7z" style="fill: var(--m2)"/><path d="M26 0h-7l-4 12h7z" style="fill: var(--m2); opacity: .8"/><circle cx="17" cy="25" r="12" style="fill: var(--m); stroke: var(--m2)" stroke-width="2"/><text x="17" y="29.5" text-anchor="middle">' + r + "</text></svg></span>";
  };
  var bars = function (p) {
    return '<span class="x-tr-bars">' + DIMS.map(function (d, i) {
      var v = p.sc[d.k];
      return '<span class="x-tr-bar" style="' + dimStyle(d) + "; --v: " + v / 10 + "; --i: " + i + '" title="' + esc(d.n) + " " + fmt(v) + '" role="img" aria-label="' + esc(d.n) + " " + fmt(v) + ' out of 10"><span class="x-tr-bar__top" aria-hidden="true">' + ic(d.ic) + "<b>" + fmt(v) + '</b></span><span class="x-tr-bar__track" aria-hidden="true"><span class="x-tr-bar__fill"></span></span></span>';
    }).join("") + "</span>";
  };
  var srcLink = function (u) {
    if (!u) return "";
    var host = ""; try { host = new URL(u).hostname.replace(/^www\./, ""); } catch (e) { host = "source"; }
    return '<a class="x-tr-src" href="' + esc(u) + '" target="_blank" rel="noopener">' + ic("ext") + esc(host) + "</a>";
  };
  var once = function (el, fn, margin) {
    if (!el) return;
    if (!HAS_IO) { fn(); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } }); }, { rootMargin: margin || "0px 0px -10% 0px", threshold: 0.05 });
    io.observe(el);
  };
  var blockHead = function (icon, color, eyebrow, title, sub, id) {
    return '<div class="x-tr-h x-tr-h--ey" style="--c: var(--x-tr-' + color + ')"><span class="x-tr-h__ic" aria-hidden="true">' + ic(icon) + '</span><p class="x-tr-eyebrow" style="--ci: var(--x-tr-' + color + '-ink)">' + esc(eyebrow) + '</p><h3' + (id ? ' id="' + id + '"' : "") + ">" + esc(title) + "</h3>" + (sub ? "<p>" + sub + "</p>" : "") + "</div>";
  };

  /* ---------- radar ---------- */
  var RS = 380, RC = RS / 2, RR = 120;
  var pt = function (i, v) { var a = (-90 + i * 72) * Math.PI / 180; return [RC + Math.cos(a) * RR * v / 10, RC + Math.sin(a) * RR * v / 10]; };
  var poly = function (vals) { return vals.map(function (v, i) { var q = pt(i, v); return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "); };
  var radar = function (series, label) {
    var g = "";
    [2, 4, 6, 8, 10].forEach(function (lv) { g += '<polygon class="grid' + (lv === 10 ? " grid--out" : "") + '" points="' + poly([lv, lv, lv, lv, lv]) + '"/>'; });
    DIMS.forEach(function (d, i) { var q = pt(i, 10); g += '<line class="axis" x1="' + RC + '" y1="' + RC + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"/>'; });
    [5, 10].forEach(function (lv) { var q = pt(0, lv); g += '<text class="tick" x="' + (q[0] + 5) + '" y="' + (q[1] + 4) + '">' + lv + "</text>"; });
    var labs = DIMS.map(function (d, i) {
      var q = pt(i, 12.3), anc = Math.abs(q[0] - RC) < 8 ? "middle" : q[0] > RC ? "start" : "end";
      var dy = i === 0 ? -6 : q[1] > RC ? 12 : 4;
      var val = series.length === 1 ? '<tspan class="val" x="' + q[0].toFixed(1) + '" dy="16">' + fmt(series[0].v[i]) + "</tspan>" : "";
      return '<text class="lab" text-anchor="' + anc + '" x="' + q[0].toFixed(1) + '" y="' + (q[1] + dy - (series.length === 1 && i === 0 ? 14 : 0)).toFixed(1) + '" style="fill: var(--x-tr-' + d.s + '-ink)">' + esc(d.n) + val + "</text>";
    }).join("");
    var shapes = series.map(function (s) {
      var dots = s.v.map(function (v, i) { var q = pt(i, v); return '<circle class="pt" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="4" style="fill: ' + s.c + '; stroke: var(--fill-primary-on)" stroke-width="1.5"/>'; }).join("");
      return '<polygon class="poly" pathLength="1" points="' + poly(s.v) + '" style="stroke: ' + s.c + "; fill: " + s.c + '"/>' + dots;
    }).join("");
    return '<svg class="x-tr-radar" viewBox="-40 -14 ' + (RS + 80) + " " + (RS + 24) + '" role="img" aria-label="' + esc(label) + '">' + g + shapes + labs + "</svg>";
  };
  var drawRadar = function (svg) {
    if (!svg) return;
    if (REDUCE) { svg.classList.add("is-drawn"); return; }
    svg.classList.remove("is-drawn");
    void svg.getBoundingClientRect();
    requestAnimationFrame(function () { requestAnimationFrame(function () { svg.classList.add("is-drawn"); }); });
  };

  /* ---------- layout ---------- */
  var top5 = P.slice().sort(function (a, b) { return b.overall - a.overall || cmpName(a, b); }).slice(0, 5);
  var nPred = ALLCLAIMS.length;
  root.innerHTML =
    '<div class="x-tr">' +
    '<header class="x-tr-hero">' +
    '<div class="x-tr-hero__top"><span class="x-tr-tile" aria-hidden="true">' + sv(IC.shieldCheck, ' stroke-width="1.8"') + '</span><div><p class="x-tr-eyebrow">Trust · fact-checked ' + esc(AS_OF) + '</p><h2 class="x-tr-title" id="trust-title">Whom should you trust on AGI?</h2></div></div>' +
    '<p class="x-tr-lead">Loud voices are not the same as reliable ones. Each person below is rated on five things you can check: the evidence behind their claims, the rigour of their logic, how their dated forecasts turned out, whether their actions match their words, and how openly they update when they are wrong. Open anyone to see the claims, actions and sources behind their numbers, then weigh the five dimensions the way you would.</p>' +
    '<div class="x-tr-stats">' +
    '<div class="x-tr-stat" style="--c: var(--x-tr-cy); --ci: var(--x-tr-cy-ink)"><span class="x-tr-stat__fig">' + ic("users") + '<span data-tr-count="' + P.length + '">0</span></span><span class="x-tr-stat__lab">People checked</span></div>' +
    '<div class="x-tr-stat" style="--c: var(--x-tr-ev); --ci: var(--x-tr-ev-ink)"><span class="x-tr-stat__fig">' + ic("check") + '<span data-tr-count="' + nPred + '">0</span></span><span class="x-tr-stat__lab">Claims fact-checked</span></div>' +
    '<div class="x-tr-stat" style="--c: var(--x-tr-co); --ci: var(--x-tr-co-ink)"><span class="x-tr-stat__fig">' + ic("link") + '<span data-tr-count="' + NSRC + '">0</span></span><span class="x-tr-stat__lab">Sources cited</span></div>' +
    "</div>" +
    '<div class="x-tr-method"><p><b>How the scores work.</b> Every score is an editorial judgement drawn from fact-checks dated ' + esc(AS_OF) + ', not a measured fact, and the same rubric was applied to researchers and CEOs alike. Overall is the plain mean of the five dimensions. Incentives are shown beside each person for context but never change a score. Scores will move as forecasts resolve.</p>' +
    "<details><summary>Read the full rubric</summary><p>" + esc(DATA.method || "") + "</p></details></div>" +
    "</header>" +
    '<section class="x-tr-block x-tr-quick" aria-labelledby="tr-quick-h">' + blockHead("bolt", "ev", "Quick answer", "The five most trustworthy voices right now", "Ranked by overall score; ties go alphabetically. Tap a name to open their record.", "tr-quick-h") +
    "<ol>" + top5.map(function (p, i) {
      return '<li><a href="#/trust/' + esc(p.id) + '" data-tr-open="' + esc(p.id) + '">' + medal(i + 1) + avatar(p) + '<span class="x-tr-quick__txt"><b>' + esc(p.name) + "</b><span>" + esc(p.best_for) + '</span></span><span class="x-tr-quick__sc">' + fmt(p.overall) + "</span></a></li>";
    }).join("") + "</ol></section>" +
    '<section class="x-tr-block" id="tr-board" aria-labelledby="tr-board-h">' + blockHead("chart", "cy", "Leaderboard", "The ranking, and how to make it yours", "Sort by any dimension, filter by role, or set your own weights. Open a row for the evidence.", "tr-board-h") +
    '<div class="x-tr-ctl">' +
    '<div class="x-tr-ctl__row" role="group" aria-label="Sort by"><span class="x-tr-ctl__lab">Sort</span>' +
    '<button type="button" class="x-tr-chip" data-sort="overall" aria-pressed="true" style="--c: var(--x-tr-cy); --ci: var(--x-tr-cy-ink)">' + ic("sort") + '<span data-sort-lab>Overall</span></button>' +
    DIMS.map(function (d) { return '<button type="button" class="x-tr-chip" data-sort="' + d.k + '" aria-pressed="false" style="' + dimStyle(d) + '">' + ic(d.ic) + esc(d.n) + "</button>"; }).join("") + "</div>" +
    '<div class="x-tr-ctl__row" role="group" aria-label="Filter by role"><span class="x-tr-ctl__lab">Show</span>' +
    '<button type="button" class="x-tr-chip" data-grp="" aria-pressed="true">' + ic("users") + "All <b>" + P.length + "</b></button>" +
    GROUPS.map(function (g) { var n = P.filter(function (p) { return p.groups.indexOf(g.k) >= 0; }).length; return '<button type="button" class="x-tr-chip" data-grp="' + g.k + '" aria-pressed="false" style="--c: var(--x-tr-g-' + g.k + '); --ci: var(--x-tr-g-' + g.k + ')">' + ic("filter") + esc(g.n) + " <b>" + n + "</b></button>"; }).join("") +
    '<input class="x-tr-search" id="trQ" type="search" placeholder="Search names, roles, views…" aria-label="Search people in the trust ranking" autocomplete="off" /></div>' +
    '<details class="x-tr-wts" id="trW"><summary>' + ic("sliders") + 'Weights <small id="trWnote"></small></summary><div class="x-tr-wts__body"><p>Say what matters most to you. Each slider runs from 0 (ignore) to 5; your score is the weighted mean of the five, and the Overall ranking re-sorts as you move them. Your settings stay on this device.</p>' +
    DIMS.map(function (d) { return '<div class="x-tr-sl" style="' + dimStyle(d) + '">' + ic(d.ic) + '<label for="trw-' + d.k + '">' + esc(d.n) + '</label><input type="range" id="trw-' + d.k + '" min="0" max="5" step="1" value="' + W[d.k] + '" data-w="' + d.k + '" /><output for="trw-' + d.k + '">' + W[d.k] + "</output></div>"; }).join("") +
    '<div class="links"><button type="button" class="btn" id="trWreset">Reset to equal</button></div></div></details>' +
    '<ul class="x-tr-legend" aria-label="Bar colours">' + DIMS.map(function (d) { return '<li style="' + dimStyle(d) + '">' + ic(d.ic) + esc(d.n) + "</li>"; }).join("") + "</ul>" +
    "</div>" +
    '<p class="x-tr-count" id="trCount" aria-live="polite"></p>' +
    '<ol class="x-tr-list" id="trList"></ol>' +
    "</section>" +
    '<section class="x-tr-block x-tr-cmp" id="tr-compare" aria-labelledby="tr-cmp-h"></section>' +
    '<section class="x-tr-block" id="tr-meter" aria-labelledby="tr-meter-h"></section>' +
    '<section class="x-tr-block x-tr-wall" id="tr-wall" aria-labelledby="tr-wall-h"></section>' +
    '<section class="x-tr-block" id="tr-judge" aria-labelledby="tr-judge-h"></section>' +
    "</div>";

  /* ---------- 1. counters: count up once on scroll-in ---------- */
  var counters = [].slice.call(root.querySelectorAll("[data-tr-count]"));
  once(root.querySelector(".x-tr-stats"), function () {
    counters.forEach(function (el) {
      var to = +el.getAttribute("data-tr-count");
      if (REDUCE) { el.textContent = to; return; }
      var t0 = null, dur = 1200;
      var step = function (t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  });
  /* ---------- 2. leaderboard ---------- */
  var list = root.querySelector("#trList");
  var state = { sort: "overall", grp: "", q: "" };
  var ROW = {};
  P.forEach(function (p) {
    var li = doc.createElement("li");
    li.className = "x-tr-row"; li.id = "tr-p-" + p.id; li.setAttribute("data-id", p.id);
    li.innerHTML = '<button type="button" class="x-tr-row__btn" aria-expanded="false" aria-controls="tr-d-' + esc(p.id) + '">' +
      '<span class="x-tr-pos"></span>' + avatar(p) +
      '<span class="x-tr-who"><b>' + esc(p.name) + "</b><small>" + esc(p.role_now) + '</small><span class="x-tr-tags">' +
      p.groups.map(function (g) { var G = GROUPS.filter(function (x) { return x.k === g; })[0]; return '<span class="x-tr-tag" data-g="' + g + '">' + esc(G.n.replace("Lab leaders/CEOs", "Lab leader")) + "</span>"; }).join("") + "</span></span>" +
      bars(p) + ring(custom(p), "") + '<span class="x-tr-chev" aria-hidden="true">' + ic("chev") + "</span></button>" +
      '<div class="x-tr-dwrap" id="tr-d-' + esc(p.id) + '" hidden></div>';
    ROW[p.id] = li;
    list.appendChild(li);
    once(li, function () { li.classList.add("is-in"); fillRing(li.querySelector(".x-tr-ring")); }, "0px 0px -6% 0px");
  });
  var empty = doc.createElement("li"); empty.className = "x-tr-empty"; empty.textContent = "No one matches. Clear the search or pick another filter."; empty.hidden = true; list.appendChild(empty);

  var sortVal = function (p) { return state.sort === "overall" ? custom(p) : p.sc[state.sort]; };
  var ordered = function () { return P.slice().sort(function (a, b) { return sortVal(b) - sortVal(a) || cmpName(a, b); }); };
  var visibleP = function (p) {
    if (state.grp && p.groups.indexOf(state.grp) < 0) return false;
    if (state.q && p.hay.indexOf(state.q) < 0) return false;
    return true;
  };
  var render = function (animate) {
    var first = {};
    var doFlip = animate && !REDUCE && typeof list.animate === "function";
    if (doFlip) P.forEach(function (p) { var li = ROW[p.id]; if (!li.hidden) first[p.id] = li.getBoundingClientRect().top; });
    var ord = ordered(), r = 0, shown = 0;
    ord.forEach(function (p) {
      var li = ROW[p.id], vis = visibleP(p);
      li.hidden = !vis;
      list.insertBefore(li, empty);
      if (vis) { r++; shown++; li.querySelector(".x-tr-pos").innerHTML = medal(r); }
      setRing(li.querySelector(".x-tr-ring"), custom(p));
    });
    empty.hidden = shown > 0;
    var lab = state.sort === "overall" ? (equalW() ? "overall score" : "your weighted score") : DIMS.filter(function (d) { return d.k === state.sort; })[0].n.toLowerCase();
    root.querySelector("#trCount").textContent = shown + " of " + P.length + " people, ranked by " + lab + ".";
    if (doFlip) P.forEach(function (p) {
      var li = ROW[p.id]; if (li.hidden || first[p.id] == null) return;
      var dy = first[p.id] - li.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      li.animate([{ transform: "translateY(" + dy + "px)" }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  };
  var press = function (sel, btn) { root.querySelectorAll(sel).forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); }); };
  var wNote = function () {
    root.querySelector("#trWnote").textContent = equalW() ? "equal" : DIMS.map(function (d) { return d.n + " " + W[d.k]; }).join(" · ");
    root.querySelector("[data-sort-lab]").textContent = equalW() ? "Overall" : "Your weights";
  };
  root.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sort]");
    if (b && root.contains(b)) { state.sort = b.getAttribute("data-sort"); press("[data-sort]", b); render(true); return; }
    b = e.target.closest("[data-grp]");
    if (b) { state.grp = b.getAttribute("data-grp"); press("[data-grp]", b); render(true); return; }
    if (e.target.closest("#trWreset")) {
      DIMS.forEach(function (d) { W[d.k] = 1; var s = root.querySelector("#trw-" + d.k); s.value = 1; s.nextElementSibling.textContent = "1"; });
      saveW(); wNote(); render(true); return;
    }
    b = e.target.closest(".x-tr-row__btn");
    if (b) { toggle(b.parentNode.getAttribute("data-id")); return; }
    var a = e.target.closest("[data-tr-open]");
    if (a && !(e.metaKey || e.ctrlKey || e.shiftKey)) {
      e.preventDefault();
      var id = a.getAttribute("data-tr-open");
      if (history.pushState && location.hash !== "#/trust/" + id) { try { history.pushState(history.state, "", "#/trust/" + id); } catch (x) {} }
      reveal(id);
    }
  });
  root.querySelector("#trQ").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); render(false); });
  root.querySelectorAll("[data-w]").forEach(function (s) {
    s.addEventListener("input", function () {
      W[s.getAttribute("data-w")] = +s.value; s.nextElementSibling.textContent = s.value;
      saveW(); wNote();
      list.classList.add("x-tr-still"); render(false);
      requestAnimationFrame(function () { list.classList.remove("x-tr-still"); });
    });
  });
  wNote(); render(false);

  /* ---------- 3. person detail ---------- */
  var openId = null;
  var verdictTally = function (p) { var t = {}; (p.claims || []).forEach(function (c) { t[c.verdict] = (t[c.verdict] || 0) + 1; }); return t; };
  var claimCard = function (c, p, withWho) {
    return '<article class="x-tr-claim" style="' + vStyle(c.verdict) + '"><div class="x-tr-claim__top">' + badge(c.verdict) +
      (c.year ? '<span class="x-tr-meta">' + esc(c.year) + "</span>" : "") + (c.type ? '<span class="x-tr-meta">' + esc(c.type.charAt(0).toUpperCase() + c.type.slice(1)) + "</span>" : "") + "</div>" +
      '<p class="x-tr-claim__q">' + esc(c.claim) + "</p>" + (c.evidence_note ? '<p class="x-tr-claim__n">' + esc(c.evidence_note) + "</p>" : "") +
      '<div class="x-tr-claim__foot">' + (withWho ? '<a class="x-tr-who-link" href="#/trust/' + esc(p.id) + '" data-tr-open="' + esc(p.id) + '">' + avatar(p) + "<span>" + esc(p.name) + "</span></a>" : "<span></span>") + srcLink(c.source_url) + "</div></article>";
  };
  var MATCH = {
    "true": { s: "co", ic: "link", n: "Matches their words" },
    mixed: { s: "ev", ic: "linkHalf", n: "Mixed" },
    "false": { s: "con", ic: "linkOff", n: "Contradicts their words" }
  };
  var detail = function (p) {
    var radarSeries = [{ v: DIMS.map(function (d) { return p.sc[d.k]; }), c: "var(--x-tr-cy)" }];
    var why = '<ul class="x-tr-why">' + DIMS.map(function (d) {
      var s = p.scores[d.k] || {};
      return '<li style="' + dimStyle(d) + '"><span class="x-tr-why__ic" aria-hidden="true">' + ic(d.ic) + "</span><div><b>" + esc(d.n) + " · " + fmt(p.sc[d.k]) + "</b><p>" + esc(s.why || "") + "</p></div></li>";
    }).join("") + "</ul>";
    var tabs = [
      { k: "said", n: "What they said", ic: "quote", c: "ev" },
      { k: "did", n: "What they did", ic: "walk", c: "co" },
      { k: "arg", n: "Their argument", ic: "puzzle", c: "lo" },
      { k: "rec", n: "Track record", ic: "target", c: "tr" }
    ];
    var pid = "tr-" + p.id;
    var said = '<div class="x-tr-claims">' + (p.claims || []).map(function (c) { return claimCard(c, p, false); }).join("") + "</div>";
    var did = (p.actions || []).length ? '<ol class="x-tr-tl">' + p.actions.slice().sort(function (a, b) { return (a.year || 0) - (b.year || 0); }).map(function (a) {
      var m = MATCH[String(a.consistent_with_words)] || MATCH.mixed;
      return '<li style="--c: var(--x-tr-' + m.s + '); --ci: var(--x-tr-' + m.s + '-ink)"><div class="x-tr-tl__top"><span class="x-tr-tl__yr">' + esc(a.year || "") + '</span><span class="x-tr-badge">' + ic(m.ic) + esc(m.n) + "</span></div><p>" + esc(a.action) + "</p>" +
        (a.note ? '<p class="x-tr-tl__note">' + esc(a.note) + "</p>" : "") + (a.source_url ? "<div>" + srcLink(a.source_url) + "</div>" : "") + "</li>";
    }).join("") + "</ol>" : '<p class="x-tr-note">No documented actions were checked for this person.</p>';
    var ar = p.argument || {};
    var arg = '<p class="x-tr-arg__sum">' + esc(ar.summary || "") + '</p><div class="x-tr-cols">' +
      '<div class="x-tr-col" style="--c: var(--x-tr-co); --ci: var(--x-tr-co-ink)"><h4>' + ic("plus") + "Strengths</h4><p>" + esc(ar.strengths || "") + "</p></div>" +
      '<div class="x-tr-col" style="--c: var(--x-tr-op); --ci: var(--x-tr-op-ink)"><h4>' + ic("minus") + "Weaknesses</h4><p>" + esc(ar.weaknesses || "") + "</p></div></div>";
    var pr = p.predictions_record || {};
    var parts = [["hits", "Hits", "sup"], ["early", "Came true early", "cy"], ["misses", "Misses", "con"], ["too_early", "Too early to tell", "early"]];
    var tot = parts.reduce(function (s, x) { return s + (+pr[x[0]] || 0); }, 0);
    var rec = (tot ? '<div class="x-tr-stack" role="img" aria-label="' + esc(parts.map(function (x) { return (+pr[x[0]] || 0) + " " + x[1].toLowerCase(); }).join(", ")) + '">' +
      parts.map(function (x) { var n = +pr[x[0]] || 0; return n ? '<span style="--c: var(--x-tr-' + x[2] + "); flex: " + n + '"></span>' : ""; }).join("") + "</div>" : '<p class="x-tr-note"><b>No dated, checkable forecasts on record.</b> The track-record score stays near the middle when the record is thin.</p>') +
      '<ul class="x-tr-stack-leg">' + parts.map(function (x) { return '<li style="--c: var(--x-tr-' + x[2] + ')">' + esc(x[1]) + " <b>" + (+pr[x[0]] || 0) + "</b></li>"; }).join("") + "</ul>" +
      (pr.notes ? '<p class="x-tr-note">' + esc(pr.notes) + "</p>" : "");
    var panes = { said: said, did: did, arg: arg, rec: rec };
    return '<div class="x-tr-det">' +
      '<div class="x-tr-det__head"><p class="x-tr-det__stance">' + esc(p.stance || "") + '</p><div class="x-tr-det__acts">' +
      (p.inArchive ? '<a class="btn" href="#/person/' + esc(p.id) + '">Full profile</a>' : "") + '<button type="button" class="btn" data-tr-cmp="' + esc(p.id) + '">Compare</button></div></div>' +
      '<div class="x-tr-det__grid"><div>' + radar(radarSeries, p.name + ": evidence " + fmt(p.sc.evidence) + ", logic " + fmt(p.sc.logic) + ", track record " + fmt(p.sc.track_record) + ", consistency " + fmt(p.sc.consistency) + ", openness " + fmt(p.sc.openness)) + "</div>" + why + "</div>" +
      '<div class="x-tr-tabs" role="tablist" aria-label="' + esc(p.name) + ' record">' + tabs.map(function (t, i) {
        return '<button type="button" class="x-tr-tab" role="tab" id="' + pid + "-t-" + t.k + '" aria-controls="' + pid + "-p-" + t.k + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" style="--c: var(--x-tr-' + t.c + "); --ci: var(--x-tr-" + t.c + '-ink)">' + ic(t.ic) + esc(t.n) + "</button>";
      }).join("") + "</div>" +
      tabs.map(function (t, i) { return '<div class="x-tr-pane" role="tabpanel" id="' + pid + "-p-" + t.k + '" aria-labelledby="' + pid + "-t-" + t.k + '"' + (i ? " hidden" : "") + ">" + panes[t.k] + "</div>"; }).join("") +
      '<div class="x-tr-boxes">' +
      '<div class="x-tr-box" style="--c: var(--x-tr-co); --ci: var(--x-tr-co-ink)">' + ic("star") + "<div><h4>Trust them most on</h4><p>" + esc(p.best_for || "") + "</p></div></div>" +
      '<div class="x-tr-box" style="--c: var(--x-tr-op); --ci: var(--x-tr-op-ink)">' + ic("alert") + "<div><h4>Be careful about</h4><p>" + esc(p.caution || "") + "</p></div></div>" +
      '<div class="x-tr-box x-tr-box--grey">' + ic("info") + "<div><h4>Incentives (context, not scored)</h4><p>" + esc(p.incentives || "None noted.") + "</p></div></div>" +
      "</div></div>";
  };
  var toggle = function (id, forceOpen) {
    if (openId && openId !== id) close(openId);
    var li = ROW[id]; if (!li) return;
    var w = li.querySelector(".x-tr-dwrap"), btn = li.querySelector(".x-tr-row__btn");
    if (!w.hidden && !forceOpen) { close(id); return; }
    if (w.hidden) {
      w.innerHTML = detail(BYID[id]);
      w.hidden = false; li.classList.add("is-open"); btn.setAttribute("aria-expanded", "true");
      openId = id;
      drawRadar(w.querySelector(".x-tr-radar"));
    }
  };
  var close = function (id) {
    var li = ROW[id]; if (!li) return;
    var w = li.querySelector(".x-tr-dwrap");
    w.hidden = true; w.innerHTML = ""; li.classList.remove("is-open"); li.querySelector(".x-tr-row__btn").setAttribute("aria-expanded", "false");
    if (openId === id) openId = null;
  };
  var selectTab = function (tab) {
    var bar = tab.parentNode;
    bar.querySelectorAll('[role="tab"]').forEach(function (t) {
      var on = t === tab; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1;
      var pane = doc.getElementById(t.getAttribute("aria-controls")); if (pane) pane.hidden = !on;
    });
  };
  list.addEventListener("click", function (e) { var t = e.target.closest('.x-tr-tab'); if (t) selectTab(t); });
  list.addEventListener("keydown", function (e) {
    var t = e.target.closest && e.target.closest('.x-tr-tab'); if (!t) return;
    var all = [].slice.call(t.parentNode.querySelectorAll('[role="tab"]')), i = all.indexOf(t), n = null;
    if (e.key === "ArrowRight") n = all[(i + 1) % all.length]; else if (e.key === "ArrowLeft") n = all[(i - 1 + all.length) % all.length];
    else if (e.key === "Home") n = all[0]; else if (e.key === "End") n = all[all.length - 1];
    if (n) { e.preventDefault(); selectTab(n); n.focus(); }
  });
  var scrollTo = function (el) {
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY - 84;
    try { window.scrollTo({ top: y, behavior: REDUCE ? "auto" : "smooth" }); } catch (e) { window.scrollTo(0, y); }
  };
  var reveal = function (id) {
    if (!BYID[id]) return;
    if (!visibleP(BYID[id])) {
      state.grp = ""; state.q = ""; root.querySelector("#trQ").value = "";
      press("[data-grp]", root.querySelector('[data-grp=""]')); render(false);
    }
    toggle(id, true);
    var li = ROW[id]; li.classList.add("is-in"); fillRing(li.querySelector(".x-tr-ring"));
    scrollTo(li);
  };

  /* ---------- 4. compare ---------- */
  var cmpBox = root.querySelector("#tr-compare");
  var KC = ["var(--x-tr-k1)", "var(--x-tr-k2)", "var(--x-tr-k3)"];
  var byName = P.slice().sort(cmpName);
  var pick = [BYID["yoshua-bengio"] ? "yoshua-bengio" : top5[0].id, BYID["sam-altman"] ? "sam-altman" : top5[1].id, BYID["yann-lecun"] ? "yann-lecun" : ""];
  var opts = function (sel, none) { return (none ? '<option value="">None</option>' : "") + byName.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === sel ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join(""); };
  cmpBox.innerHTML = blockHead("columns", "tr", "Compare", "Put two or three people side by side", "Their five scores overlaid on one chart, with how their claims were judged.", "tr-cmp-h") +
    '<div class="x-tr-pick">' + [0, 1, 2].map(function (i) { return '<label style="--k: ' + KC[i] + '"><span>Person ' + (i + 1) + (i === 2 ? " (optional)" : "") + '</span><select data-pick="' + i + '">' + opts(pick[i], i === 2) + "</select></label>"; }).join("") + "</div>" +
    '<div class="x-tr-cmp__grid"><div><div id="trCmpRadar"></div><ul class="x-tr-cmp__leg" id="trCmpLeg"></ul></div><div class="table-wrap" id="trCmpTable"></div></div>';
  var cmpIn = false;
  var drawCmp = function () {
    var ps = pick.map(function (id, i) { return id && BYID[id] ? { p: BYID[id], c: KC[i] } : null; }).filter(Boolean);
    var seen = {}; ps = ps.filter(function (x) { if (seen[x.p.id]) return false; seen[x.p.id] = 1; return true; });
    var host = cmpBox.querySelector("#trCmpRadar");
    host.innerHTML = radar(ps.map(function (x) { return { v: DIMS.map(function (d) { return x.p.sc[d.k]; }), c: x.c }; }), "Scores compared: " + ps.map(function (x) { return x.p.name + " overall " + fmt(x.p.overall); }).join("; "));
    cmpBox.querySelector("#trCmpLeg").innerHTML = ps.map(function (x) { return '<li style="--k: ' + x.c + '">' + esc(x.p.name) + "</li>"; }).join("");
    var best = function (vals) { var m = Math.max.apply(null, vals); return vals.map(function (v) { return v === m && vals.length > 1; }); };
    var rowsDims = DIMS.concat([{ k: "_overall", n: "Overall", s: "cy", ic: "star" }]).map(function (d, ri) {
      var vals = ps.map(function (x) { return d.k === "_overall" ? x.p.overall : x.p.sc[d.k]; }), b = best(vals);
      return "<tr" + (ri === 5 ? ' class="x-tr-sep"' : "") + '><th scope="row" style="' + dimStyle(d) + '">' + ic(d.ic) + esc(d.n) + "</th>" + vals.map(function (v, i) { return '<td class="num' + (b[i] ? " is-top" : "") + '">' + fmt(v) + "</td>"; }).join("") + "</tr>";
    }).join("");
    var tallies = ps.map(function (x) { return verdictTally(x.p); });
    var rowsV = VERD.map(function (v, ri) {
      return "<tr" + (ri === 0 ? ' class="x-tr-sep"' : "") + '><th scope="row">' + badge(v.n) + "</th>" + tallies.map(function (t) { return '<td class="num">' + (t[v.n] || 0) + "</td>"; }).join("") + "</tr>";
    }).join("");
    cmpBox.querySelector("#trCmpTable").innerHTML = "<table><caption>Scores out of 10, and claim verdicts by count</caption><thead><tr><th scope=\"col\">Dimension</th>" +
      ps.map(function (x) { return '<th scope="col" style="--k: ' + x.c + '"><i aria-hidden="true"></i>' + esc(x.p.name) + "</th>"; }).join("") + "</tr></thead><tbody>" + rowsDims + rowsV + "</tbody></table>";
    var t = cmpBox.querySelector("table"), names = [].map.call(t.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
    t.querySelectorAll("tbody tr").forEach(function (tr) { [].forEach.call(tr.children, function (c, i) { if (c.tagName === "TD") c.setAttribute("data-label", names[i]); }); });
    if (cmpIn) drawRadar(host.querySelector(".x-tr-radar"));
  };
  cmpBox.addEventListener("change", function (e) { var s = e.target.closest("[data-pick]"); if (!s) return; pick[+s.getAttribute("data-pick")] = s.value; drawCmp(); });
  drawCmp();
  once(cmpBox.querySelector("#trCmpRadar"), function () { cmpIn = true; drawRadar(cmpBox.querySelector(".x-tr-radar")); });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("[data-tr-cmp]"); if (!b) return;
    var id = b.getAttribute("data-tr-cmp");
    if (pick.indexOf(id) < 0) { pick[2] = pick[1]; pick[1] = pick[0]; pick[0] = id; }
    cmpBox.querySelectorAll("[data-pick]").forEach(function (s, i) { s.value = pick[i] || ""; });
    drawCmp(); scrollTo(cmpBox);
  });

  /* ---------- 5a. consistency meter ---------- */
  var meter = root.querySelector("#tr-meter");
  var above = P.filter(function (p) { return p.sc.consistency > p.words; }).length, below = P.filter(function (p) { return p.sc.consistency < p.words; }).length;
  meter.innerHTML = blockHead("scatter", "co", "Consistency meter", "Do their actions match the strength of their words?", "Across: the average of evidence and logic, how well their case holds up. Up: consistency, how closely their actions follow what they say. Above the dashed line, actions are more reliable than arguments; below it, the reverse.", "tr-meter-h") +
    '<figure class="chart x-tr-scatter"><figcaption class="chart__cap">' + above + " of " + P.length + " people score higher on consistency than on the strength of their case; " + below + " score lower<small>Scores out of 10, editorial, as of " + esc(AS_OF) + ". Hover or tap a dot for the name and both scores.</small></figcaption>" +
    '<div class="chart__canvas chart__canvas--tall"><canvas id="trScatter" role="img" aria-label="Scatter of argument strength against consistency for ' + P.length + ' people; ' + above + ' sit above the equal line"></canvas></div></figure>';
  once(meter.querySelector("canvas"), function () {
    if (typeof window.Chart !== "function") return;
    var lastName = function (n) { var w = String(n).split(/\s+/); return w[w.length - 1]; };
    var ds = GROUPS.map(function (g, gi) {
      return {
        label: g.n,
        data: P.filter(function (p) { return p.groups[0] === g.k; }).map(function (p) { return { x: Math.round(p.words * 100) / 100, y: p.sc.consistency, label: lastName(p.name), name: p.name }; }),
        backgroundColor: "var(--x-tr-g-" + g.k + ")", borderColor: "var(--x-tr-g-" + g.k + ")",
        pointRadius: 5, pointHoverRadius: 5, pointBorderWidth: 0, pointHoverBorderWidth: 0
      };
    });
    ds.push({ type: "line", label: "Equal", data: [{ x: 2, y: 2 }, { x: 10, y: 10 }], borderColor: "var(--chart-reference)", borderDash: [3, 4], borderWidth: 1, pointRadius: 0, pointHoverRadius: 0, datalabels: { display: false } });
    var labels = Object.assign({}, (window.Hark && Hark.labels && Hark.labels.names) || {}, { display: "auto" });
    try {
      new Chart(meter.querySelector("canvas"), {
        type: "scatter",
        data: { datasets: ds },
        options: {
          animation: REDUCE ? false : { duration: 700 },
          transitions: { active: { animation: { duration: 0 } } },
          scales: { x: { type: "linear", min: 2, max: 10, title: { display: true, text: "Evidence + logic (average)" } }, y: { min: 2, max: 10, title: { display: true, text: "Consistency" } } },
          plugins: {
            datalabels: labels,
            legend: { labels: { filter: function (it) { return it.text !== "Equal"; } } },
            tooltip: { animation: false, filter: function (it) { return it.dataset.type !== "line"; }, callbacks: { title: function (its) { return its[0] && its[0].raw.name; }, label: function (ctx) { return "Evidence + logic " + fmt(ctx.raw.x) + " · Consistency " + fmt(ctx.raw.y); } } }
          }
        }
      });
    } catch (e) {}
  }, "0px 0px -15% 0px");

  /* ---------- 5b. verdict wall ---------- */
  var wall = root.querySelector("#tr-wall");
  var wf = { v: "", t: "" }, PAGE = 24, wshown = PAGE;
  var vCount = {}; ALLCLAIMS.forEach(function (x) { vCount[x.c.verdict] = (vCount[x.c.verdict] || 0) + 1; });
  var tCount = {}; ALLCLAIMS.forEach(function (x) { tCount[x.c.type] = (tCount[x.c.type] || 0) + 1; });
  var vOrder = {}; VERD.forEach(function (v, i) { vOrder[v.n] = i; });
  var wallSorted = ALLCLAIMS.slice().sort(function (a, b) { return (vOrder[a.c.verdict] - vOrder[b.c.verdict]) || ((b.c.year || 0) - (a.c.year || 0)) || cmpName(a.p, b.p) || a.i - b.i; });
  wall.innerHTML = blockHead("grid", "op", "Verdict wall", "Every claim, and how it held up", ALLCLAIMS.length + " claims from " + P.length + " people, each checked against a source. Filter by verdict or by kind of claim; tap a name to open that person.", "tr-wall-h") +
    '<div class="x-tr-ctl"><div class="x-tr-ctl__row" role="group" aria-label="Filter by verdict"><span class="x-tr-ctl__lab">Verdict</span><button type="button" class="x-tr-chip" data-wv="" aria-pressed="true">All <b>' + ALLCLAIMS.length + "</b></button>" +
    VERD.map(function (v) { return '<button type="button" class="x-tr-chip" data-wv="' + esc(v.n) + '" aria-pressed="false" style="' + vStyle(v.n) + '">' + ic(v.ic) + esc(v.n) + " <b>" + (vCount[v.n] || 0) + "</b></button>"; }).join("") + "</div>" +
    '<div class="x-tr-ctl__row" role="group" aria-label="Filter by type"><span class="x-tr-ctl__lab">Type</span><button type="button" class="x-tr-chip" data-wt="" aria-pressed="true">All</button>' +
    TYPES.map(function (t) { return '<button type="button" class="x-tr-chip" data-wt="' + t[0] + '" aria-pressed="false">' + esc(t[1]) + " <b>" + (tCount[t[0]] || 0) + "</b></button>"; }).join("") + "</div></div>" +
    '<p class="x-tr-count" id="trWallCount" aria-live="polite"></p><div class="x-tr-claims" id="trWallGrid"></div><div class="x-tr-more"><button type="button" class="btn" id="trWallMore">Show more</button></div>';
  var drawWall = function () {
    var items = wallSorted.filter(function (x) { return (!wf.v || x.c.verdict === wf.v) && (!wf.t || x.c.type === wf.t); });
    wall.querySelector("#trWallGrid").innerHTML = items.slice(0, wshown).map(function (x) { return claimCard(x.c, x.p, true); }).join("") || '<p class="x-tr-empty">No claims match these filters.</p>';
    wall.querySelector("#trWallCount").textContent = "Showing " + Math.min(wshown, items.length) + " of " + items.length + " claims.";
    wall.querySelector("#trWallMore").hidden = items.length <= wshown;
  };
  wall.addEventListener("click", function (e) {
    var b = e.target.closest("[data-wv]");
    if (b) { wf.v = b.getAttribute("data-wv"); wall.querySelectorAll("[data-wv]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); wshown = PAGE; drawWall(); return; }
    b = e.target.closest("[data-wt]");
    if (b) { wf.t = b.getAttribute("data-wt"); wall.querySelectorAll("[data-wt]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); wshown = PAGE; drawWall(); return; }
    if (e.target.closest("#trWallMore")) { wshown += PAGE; drawWall(); }
  });
  drawWall();

  /* ---------- 5c. how to judge anyone ---------- */
  var JUDGE = {
    evidence: "Ask what stands behind the claim: data, experiments, demonstrated results, or only confidence. A striking claim with no checkable support deserves a striking amount of doubt, however famous the speaker.",
    logic: "Follow the argument step by step and look for the weakest link. Strong thinkers state their assumptions, take the best counterarguments seriously, and say what would change their mind.",
    track_record: "Look up what they forecast years ago and compare it with what happened. Dated, specific predictions that came true count for a lot; quietly moved deadlines and vague forecasts that can never fail count for little.",
    consistency: "Watch what they do, not only what they say. Someone who warns of danger while racing to build it, or who preaches openness while hiding results, is telling you which statement to believe.",
    openness: "Notice whether they ever say they were wrong. People who publish updates, admit mistakes and engage critics in public are easier to trust, because their errors get corrected rather than defended."
  };
  root.querySelector("#tr-judge").innerHTML = blockHead("compass", "tr", "How to judge anyone", "Five questions to ask of any AI forecast", "The same rubric used above, so you can apply it to the next headline yourself.", "tr-judge-h") +
    '<div class="cards x-tr-judge">' + DIMS.map(function (d) { return '<div style="' + dimStyle(d) + '"><span class="x-tr-why__ic" aria-hidden="true">' + ic(d.ic) + "</span><h4>" + esc(d.n) + "</h4><p>" + esc(JUDGE[d.k]) + "</p></div>"; }).join("") + "</div>";

  /* ---------- route: #/trust and #/trust/<id> ---------- */
  var section = doc.getElementById("trust");
  var lastRoute = null;
  var route = function () {
    var m = /^#\/trust(?:\/([^/?#]+))?\/?$/.exec(location.hash || "");
    if (!m) { lastRoute = null; return; }
    if (location.hash === lastRoute) return;
    lastRoute = location.hash;
    var id = m[1] ? decodeURIComponent(m[1]) : "";
    var main = doc.querySelector("main.main");
    var go = function () {
      if (main && main.hidden) return;
      if (id && BYID[id]) reveal(id);
      else if (window.XGoTo) { try { window.XGoTo(section); } catch (e) { scrollTo(section); } }
      else scrollTo(section);
    };
    setTimeout(go, 60);
  };
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  if (doc.readyState === "complete") route(); else window.addEventListener("load", route);
  window.XTrust = { open: reveal, count: function () { return { people: P.length, claims: ALLCLAIMS.length, sources: NSRC }; } };
})();
