/* trust33.js: trust scores for every portrait (323 people) with nine factors you can open, re-weight and sort.
   Data: trust_all.json (built by work/build_trust_all.py from people.json, trust.json, predictions.json, videos.json,
   entries_all.json). Every factor shows what it measures, its formula, its inputs and its sources. Add-only layer. */
(function () {
  "use strict";
  var FX = {
    evidence: ["Evidence", "#22c55e", "How much documented proof (data, experiments, results) stands behind their key claims. Editorial, claim by claim."],
    logic: ["Logic", "#3b82f6", "How rigorous their arguments are and how seriously they answer critics. Editorial."],
    track: ["Track record", "#f59e0b", "How their dated, checkable forecasts turned out."],
    consistency: ["Consistency", "#14b8a6", "Whether their actions match their words, from documented actions. Editorial."],
    openness: ["Openness", "#06b6d4", "Whether they update on evidence, admit errors and are transparent. Editorial."],
    expertise: ["Topic expertise", "#eab308", "How deep their expertise is in AI, superintelligence and AI safety."],
    independence: ["Independence", "#ef4444", "The incentive check: how few money ties pull on what they say. Higher means fewer ties."],
    closeness: ["Closeness to frontier AI", "#f97316", "How close they work to the systems being built today."],
    activity: ["Activity in the debate", "#84cc16", "How much they appear in this archive: talks, entries and quotes."]
  };
  var ORDER = ["evidence", "logic", "track", "consistency", "openness", "expertise", "independence", "closeness", "activity"];
  var DEFW = { evidence: 2, logic: 1.5, track: 2, consistency: 1, openness: 1, expertise: 1.5, independence: 1, closeness: 0.5, activity: 0.5 };
  var PRESETS = {
    balanced: ["Balanced", DEFW],
    evidence: ["Evidence first", { evidence: 3, logic: 2, track: 2, consistency: 0.5, openness: 0.5, expertise: 1, independence: 0.5, closeness: 0, activity: 0 }],
    independent: ["Independent voices", { evidence: 1.5, logic: 1, track: 1.5, consistency: 1, openness: 1, expertise: 1, independence: 3, closeness: 0, activity: 0 }],
    insiders: ["Frontier insiders", { evidence: 1, logic: 1, track: 1, consistency: 1, openness: 0.5, expertise: 2, independence: 0, closeness: 3, activity: 1 }],
    forecasters: ["Best forecasters", { evidence: 1, logic: 1, track: 3, consistency: 0.5, openness: 1, expertise: 0.5, independence: 0.5, closeness: 0, activity: 0 }]
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var W = (function () { try { var w = JSON.parse(localStorage.getItem("trust33.w") || "null"); if (w) return w; } catch (e) {} return JSON.parse(JSON.stringify(DEFW)); })();
  var saveW = function () { try { localStorage.setItem("trust33.w", JSON.stringify(W)); } catch (e) {} };
  var DATA = null, BY = {}, PHOTO = {};
  var S = { q: "", g: "", org: "", sort: "overall", n: 48, open: null };

  var overall = function (p) {
    var s = 0, w = 0;
    ORDER.forEach(function (k) { var f = p.f[k]; if (f && f.v != null && W[k] > 0) { s += f.v * W[k]; w += W[k]; } });
    return w ? s / w : null;
  };
  var margin = function (p) { return Math.round(4 + (100 - p.conf) * 0.16); };
  var col = function (v) { return v == null ? "#64748b" : v >= 75 ? "#22c55e" : v >= 62 ? "#14b8a6" : v >= 50 ? "#eab308" : v >= 38 ? "#f97316" : "#ef4444"; };
  var fmt = function (v) { return v == null ? "No data" : Math.round(v) + "% \u00B7 " + (v / 10).toFixed(1) + "/10"; };
  var initials = function (n) { return String(n).split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join(""); };
  var photoOf = function (p) { return PHOTO[p.id] || p.ph || ""; };
  var ICON = function (d) { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
  var IC_X = ICON('<path d="M6 6l12 12M18 6L6 18"/>'), IC_EXT = ICON('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'), IC_DOWN = ICON('<path d="M6 9l6 6 6-6"/>');

  var face = function (p, big) {
    var ph = photoOf(p), sz = big ? 96 : 64;
    return '<span class="t33-av" style="width:' + sz + "px;height:" + sz + 'px"><span>' + esc(initials(p.n)) + "</span>" + (ph ? '<img src="' + esc(ph) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : "") + "</span>";
  };
  var mini = function (p) {
    return '<span class="t33-mini" aria-hidden="true">' + ORDER.map(function (k) { var v = p.f[k].v; return '<i style="--c:' + FX[k][1] + ";--h:" + (v == null ? 6 : Math.max(8, v)) + "%" + (v == null ? ";opacity:.25" : "") + '"></i>'; }).join("") + "</span>";
  };
  var tile = function (p) {
    var o = overall(p);
    return '<button type="button" class="t33-tile" data-t33="' + esc(p.id) + '" style="--o:' + col(o) + '">' + face(p) +
      '<span class="t33-tile__n">' + esc(p.n) + '</span><span class="t33-tile__o">' + (o == null ? "\u2013" : Math.round(o)) + '<small>%</small></span>' +
      '<span class="t33-tile__m">\u00B1' + margin(p) + " \u00B7 " + (p.ed ? "reviewed" : "data-based") + "</span>" + mini(p) + "</button>";
  };
  var list = function () {
    var q = S.q.toLowerCase();
    var L = DATA.people.filter(function (p) {
      if (S.g && p.g !== S.g) return false;
      if (S.org && DATA.orgs[S.org] && DATA.orgs[S.org].indexOf(p.id) < 0) return false;
      if (q && (p.n + " " + p.o + " " + p.g).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var key = function (p) { return S.sort === "overall" ? overall(p) : S.sort === "conf" ? p.conf : S.sort === "name" ? null : p.f[S.sort].v; };
    L.sort(function (a, b) {
      if (S.sort === "name") return a.n < b.n ? -1 : a.n > b.n ? 1 : 0;
      var x = key(a), y = key(b);
      if (x == null && y == null) return a.n < b.n ? -1 : 1; if (x == null) return 1; if (y == null) return -1;
      return y - x || (a.n < b.n ? -1 : 1);
    });
    return L;
  };
  var renderGrid = function () {
    var L = list(), g = document.getElementById("t33grid"), more = document.getElementById("t33more"), cnt = document.getElementById("t33count");
    if (!g) return;
    g.innerHTML = L.slice(0, S.n).map(tile).join("") || '<p class="fineprint">No one matches. Try another name, group or organisation.</p>';
    more.hidden = L.length <= S.n; more.textContent = "Show " + Math.min(48, L.length - S.n) + " more (" + (L.length - S.n) + " left)";
    cnt.textContent = L.length + " of " + DATA.people.length + " people";
  };
  var weightsHtml = function () {
    return ORDER.map(function (k) {
      return '<label class="t33-w" style="--c:' + FX[k][1] + '"><span>' + FX[k][0] + '</span><input type="range" min="0" max="3" step="0.5" value="' + W[k] + '" data-t33w="' + k + '" aria-label="Weight for ' + FX[k][0] + '"><b data-t33wv="' + k + '">' + W[k] + "\u00D7</b></label>";
    }).join("");
  };
  var orgsHtml = function () {
    var rows = Object.keys(DATA.orgs).map(function (o) {
      var ids = DATA.orgs[o], ps = ids.map(function (id) { return BY[id]; }).filter(Boolean);
      var ov = ps.map(overall).filter(function (v) { return v != null; });
      var avg = function (k) { var a = ps.map(function (p) { return p.f[k].v; }).filter(function (v) { return v != null; }); return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : null; };
      return { o: o, ps: ps, ov: ov.length ? ov.reduce(function (s, v) { return s + v; }, 0) / ov.length : null, ind: avg("independence"), exp: avg("expertise") };
    }).sort(function (a, b) { return b.ps.length - a.ps.length || (b.ov || 0) - (a.ov || 0) || (a.o < b.o ? -1 : 1); });
    return rows.map(function (r) {
      return '<button type="button" class="t33-org" data-t33org="' + esc(r.o) + '" style="--o:' + col(r.ov) + '"' + (S.org === r.o ? ' aria-pressed="true"' : "") + '><b>' + esc(r.o) + "</b>" +
        '<span class="t33-org__faces">' + r.ps.slice(0, 5).map(function (p) { return face(p); }).join("") + "</span>" +
        '<span class="t33-org__s"><em>' + (r.ov == null ? "\u2013" : Math.round(r.ov) + "%") + "</em> average \u00B7 " + r.ps.length + " people \u00B7 independence " + (r.ind == null ? "\u2013" : Math.round(r.ind) + "%") + " \u00B7 expertise " + (r.exp == null ? "\u2013" : Math.round(r.exp) + "%") + "</span></button>";
    }).join("");
  };
  var groups = function () { var m = {}; DATA.people.forEach(function (p) { if (p.g) m[p.g] = (m[p.g] || 0) + 1; }); return Object.keys(m).sort().map(function (g) { return '<option value="' + esc(g) + '">' + esc(g.replace(/-/g, " ")) + " (" + m[g] + ")</option>"; }).join(""); };

  var board = function () {
    var host = document.getElementById("portraits"); if (!host || document.getElementById("t33")) return;
    var sec = document.createElement("div"); sec.id = "t33"; sec.className = "t33";
    sec.innerHTML =
      '<h3 class="t33-h">Trust scores for every portrait</h3>' +
      '<p class="t33-lead">No score can be 100% certain, so every number here shows its working. Each person gets up to nine factors. Five come from a claim-by-claim review with sources (evidence, logic, track record, consistency, openness), done so far for ' + DATA.people.filter(function (p) { return p.ed; }).length + ' people. Four come from data in this archive for all ' + DATA.people.length + ' (topic expertise, independence from money ties, closeness to frontier AI, activity in the debate). The overall score is a weighted average of the factors that have data, the \u00B1 band shows how unsure it is, and you can change every weight yourself. Open anyone to see each factor\u2019s formula, inputs and sources.</p>' +
      '<div class="t33-ctl">' +
      '<label class="t33-f"><span>Find</span><input type="search" id="t33q" placeholder="Name or organisation" autocomplete="off"></label>' +
      '<label class="t33-f"><span>Field</span><select id="t33g"><option value="">All fields</option>' + groups() + "</select></label>" +
      '<label class="t33-f"><span>Sort by</span><select id="t33s"><option value="overall">Overall score</option>' + ORDER.map(function (k) { return '<option value="' + k + '">' + FX[k][0] + "</option>"; }).join("") + '<option value="conf">Confidence</option><option value="name">Name</option></select></label>' +
      '<span class="t33-count" id="t33count"></span></div>' +
      '<div class="t33-presets" role="group" aria-label="Weight presets">' + Object.keys(PRESETS).map(function (k) { return '<button type="button" class="t33-chip" data-t33p="' + k + '">' + PRESETS[k][0] + "</button>"; }).join("") + "</div>" +
      '<details class="t33-wbox"><summary>' + IC_DOWN + "Change the weights</summary><div class=\"t33-ws\">" + weightsHtml() + '</div><p class="fineprint">0\u00D7 leaves a factor out. Your weights are saved in this browser.</p></details>' +
      '<div class="t33-legend">' + ORDER.map(function (k) { return '<span style="--c:' + FX[k][1] + '"><i></i>' + FX[k][0] + "</span>"; }).join("") + "</div>" +
      '<div class="t33-grid" id="t33grid"></div><button type="button" class="btn t33-more" id="t33more" hidden></button>' +
      '<h3 class="t33-h">Labs and organisations</h3><p class="t33-lead">Each organisation\u2019s score is the average of its people in this archive, with their average independence and expertise beside it. Pick one to show only its people above.</p>' +
      '<div class="t33-orgs" id="t33orgs">' + orgsHtml() + "</div>";
    host.appendChild(sec);
    renderGrid();
  };

  var panel = function (id) {
    var p = BY[id]; if (!p) return;
    var o = overall(p), dlg = document.getElementById("t33dlg");
    if (!dlg) { dlg = document.createElement("div"); dlg.id = "t33dlg"; dlg.className = "t33-dlg"; dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "false"); document.body.appendChild(dlg); }
    var rows = ORDER.map(function (k) {
      var f = p.f[k], ins = f.inputs || {};
      var it = Object.keys(ins).map(function (n) { return "<li><b>" + esc(n) + ":</b> " + esc(ins[n] === "" ? "\u2013" : ins[n]) + "</li>"; }).join("");
      return '<details class="t33-fx" style="--c:' + FX[k][1] + '"><summary><span class="t33-fx__n">' + FX[k][0] + '</span><span class="t33-fx__bar"><i style="width:' + (f.v == null ? 0 : f.v) + '%"></i></span><span class="t33-fx__v">' + fmt(f.v) + '</span><span class="t33-fx__w">weight ' + W[k] + "\u00D7</span></summary>" +
        '<div class="t33-fx__b"><p>' + esc(FX[k][2]) + '</p><p><b>Formula.</b> ' + esc(f.formula) + "</p>" + (it ? "<ul>" + it + "</ul>" : "") + (f.note ? '<p><b>Why.</b> ' + esc(f.note) + "</p>" : "") + "</div></details>";
    }).join("");
    var src = (p.src || []).map(function (s) { var h = ""; try { h = new URL(s.url).hostname.replace(/^www\./, ""); } catch (e) {} return '<li><a class="x-tr-src" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + IC_EXT + esc(s.label) + " <small>" + esc(h) + "</small></a></li>"; }).join("");
    dlg.innerHTML = '<div class="t33-dlg__card" style="--o:' + col(o) + '"><button type="button" class="t33-dlg__x" data-t33close aria-label="Close">' + IC_X + "</button>" +
      '<div class="t33-dlg__head">' + face(p, true) + '<div><h3>' + esc(p.n) + '</h3><p>' + esc(p.o || "") + (p.g ? " \u00B7 " + esc(p.g.replace(/-/g, " ")) : "") + "</p>" +
      '<p class="t33-dlg__o"><b>' + (o == null ? "\u2013" : Math.round(o) + "%") + "</b> " + (o == null ? "" : (o / 10).toFixed(1) + "/10") + ' <span>\u00B1' + margin(p) + " \u00B7 confidence " + p.conf + "%</span></p></div></div>" +
      '<p class="t33-dlg__note">' + (p.ed ? "Reviewed claim by claim: all nine factors have data." : "Data-based only so far: the five review factors need a claim-by-claim check with sources, so they are left out of the average rather than guessed.") + " The overall is the weighted average of the factors with data; the \u00B1 band grows when data is thin.</p>" +
      '<div class="t33-fxs">' + rows + "</div>" + (src ? '<h4>Sources</h4><ul class="t33-src">' + src + "</ul>" : "") +
      '<div class="t33-dlg__acts">' + (document.querySelector && BY[id] && p.ph && p.ph.indexOf("face-") !== 0 ? '<a class="btn" href="#/person/' + esc(id) + '">Full profile</a>' : "") + (p.ed ? '<a class="btn" href="#/trust/' + esc(id) + '">Claim-by-claim review</a>' : "") + "</div></div>";
    dlg.classList.add("is-on"); S.open = id;
    var x = dlg.querySelector(".t33-dlg__x"); if (x) x.focus({ preventScroll: true });
  };
  var closePanel = function () { var d = document.getElementById("t33dlg"); if (d) d.classList.remove("is-on"); S.open = null; };

  /* person pages: a trust breakdown card under the header */
  var personCard = function () {
    var m = location.hash.match(/^#\/person\/([^?&#\/]+)/), view = document.getElementById("person-view");
    if (!m || !view || view.hidden || !DATA) return;
    var id = decodeURIComponent(m[1]), p = BY[id]; if (!p || view.querySelector(".t33-pcard")) return;
    var blk = view.querySelector(".x-pv__block"); if (!blk) return;
    var o = overall(p), c = document.createElement("section");
    c.className = "x-pv__block t33-pcard"; c.style.setProperty("--o", col(o));
    c.innerHTML = '<h2 class="x-pv__h">Trust breakdown</h2><div class="t33-pcard__top"><b>' + (o == null ? "\u2013" : Math.round(o) + "%") + "</b><span>\u00B1" + margin(p) + " \u00B7 confidence " + p.conf + "% \u00B7 " + (p.ed ? "reviewed claim by claim" : "data-based") + "</span></div>" +
      '<div class="t33-pcard__bars">' + ORDER.map(function (k) { var v = p.f[k].v; return '<span style="--c:' + FX[k][1] + '"><em>' + FX[k][0] + '</em><i><u style="width:' + (v == null ? 0 : v) + '%"></u></i><b>' + (v == null ? "No data" : v + "%") + "</b></span>"; }).join("") + "</div>" +
      '<button type="button" class="btn" data-t33="' + esc(id) + '">How each number is worked out</button>';
    blk.parentNode.insertBefore(c, blk);
  };

  /* gallery portraits get their score badge */
  var badges = function () {
    var gal = document.getElementById("gal"); if (!gal || !DATA) return;
    var byName = {}; DATA.people.forEach(function (p) { byName[p.n.toLowerCase()] = p; });
    [].forEach.call(gal.querySelectorAll("button[data-lb]"), function (b) {
      if (b.querySelector(".t33-badge")) return;
      var im = b.querySelector("img"), nm = im && im.getAttribute("alt"); var p = nm && byName[nm.toLowerCase()]; if (!p) return;
      var o = overall(p); if (o == null) return;
      var s = document.createElement("span"); s.className = "t33-badge"; s.style.setProperty("--o", col(o)); s.textContent = Math.round(o) + "%"; s.setAttribute("title", "Trust score, open below in Trust scores for every portrait");
      b.style.position = "relative"; b.appendChild(s);
    });
  };

  var wire = function () {
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      var b = t.closest && t.closest("[data-t33]"); if (b) { ev.preventDefault(); panel(b.getAttribute("data-t33")); return; }
      if (t.closest && t.closest("[data-t33close]")) { closePanel(); return; }
      var pr = t.closest && t.closest("[data-t33p]"); if (pr) { var w = PRESETS[pr.getAttribute("data-t33p")][1]; ORDER.forEach(function (k) { W[k] = w[k]; }); saveW(); var ws = document.querySelector(".t33-ws"); if (ws) ws.innerHTML = weightsHtml(); refresh(); return; }
      var og = t.closest && t.closest("[data-t33org]"); if (og) { var o = og.getAttribute("data-t33org"); S.org = S.org === o ? "" : o; S.n = 48; document.getElementById("t33orgs").innerHTML = orgsHtml(); renderGrid(); var g = document.getElementById("t33grid"); if (g && S.org) g.scrollIntoView({ block: "nearest" }); return; }
      if (t.id === "t33more") { S.n += 48; renderGrid(); return; }
      var dlg = document.getElementById("t33dlg"); if (dlg && dlg.classList.contains("is-on") && t === dlg) closePanel();
    });
    document.addEventListener("input", function (ev) {
      var t = ev.target;
      if (t.id === "t33q") { S.q = t.value; S.n = 48; renderGrid(); }
      else if (t.getAttribute && t.getAttribute("data-t33w")) { var k = t.getAttribute("data-t33w"); W[k] = +t.value; saveW(); var v = document.querySelector('[data-t33wv="' + k + '"]'); if (v) v.textContent = W[k] + "\u00D7"; refresh(); }
    });
    document.addEventListener("change", function (ev) {
      var t = ev.target;
      if (t.id === "t33g") { S.g = t.value; S.n = 48; renderGrid(); }
      if (t.id === "t33s") { S.sort = t.value; renderGrid(); }
    });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && S.open) closePanel(); });
    window.addEventListener("hashchange", function () { setTimeout(personCard, 60); setTimeout(personCard, 400); });
    var view = document.getElementById("person-view");
    if (view && "MutationObserver" in window) new MutationObserver(function () { if (!view.querySelector(".t33-pcard")) personCard(); }).observe(view, { childList: true });
    var gal = document.getElementById("gal");
    if (gal && "MutationObserver" in window) new MutationObserver(function () { badges(); }).observe(gal, { childList: true });
  };
  var refresh = function () {
    renderGrid(); var og = document.getElementById("t33orgs"); if (og) og.innerHTML = orgsHtml();
    if (S.open) panel(S.open);
    [].forEach.call(document.querySelectorAll(".t33-badge"), function (b) { b.remove(); }); badges();
    var pc = document.querySelector(".t33-pcard"); if (pc) { pc.remove(); personCard(); }
  };
  var start = function (d) {
    DATA = d; DATA.people.forEach(function (p) { BY[p.id] = p; });
    try { var pe = JSON.parse((document.getElementById("d-people") || {}).textContent || "[]"); pe.forEach(function (p) { if (p.photo) PHOTO[p.id] = p.photo; }); } catch (e) {}
    board(); badges(); wire(); personCard();
    window.Trust33 = { open: panel, overall: function (id) { return BY[id] ? overall(BY[id]) : null; } };
  };
  var go = function () { fetch("trust_all.json").then(function (r) { return r.json(); }).then(start).catch(function () {}); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
