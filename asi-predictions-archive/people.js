/* People: a searchable grid of everyone in the archive, and a person page at #/person/<id>. */
(function () {
  "use strict";
  var read = function (id) { try { return Hark.data(id) || []; } catch (e) { return []; } };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var $ = function (id) { return document.getElementById(id); };
  var PEOPLE = read("d-people"), V = read("d-videos"), PREDS = read("d-preds"), ENTRIES = read("d-entries");
  if (!PEOPLE.length) return;
  var byId = {}, idx = {};
  PEOPLE.forEach(function (p, i) { byId[p.id] = p; idx[p.id] = i; p.hay = [p.name, p.role, p.org, p.group].join(" ").toLowerCase(); });
  var entryById = {}; ENTRIES.forEach(function (e) { entryById[e.id] = e; });
  var vidsOf = {}; V.forEach(function (v) { (v.p || []).forEach(function (id) { (vidsOf[id] = vidsOf[id] || []).push(v); }); });
  var AP = window.ArchivePlayer;

  var GROUP = function (g) { return String(g || "other").replace(/-/g, " ").replace(/^./, function (c) { return c.toUpperCase(); }); };
  var initials = function (n) { return String(n || "?").split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase(); };
  var hue = function (s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 7; return h + 1; };
  var avatar = function (p, cls) {
    var ini = '<span class="x-pav__ini" style="--x-ring: var(--chart-' + hue(p.id) + ')">' + esc(initials(p.name)) + "</span>";
    return '<span class="x-pav ' + (cls || "") + '" aria-hidden="true">' + ini +
      (p.photo ? '<img src="' + esc(p.photo) + '" alt="" loading="lazy" onerror="this.remove()" />' : "") + "</span>";
  };
  var talks = function (p) { var n = p.n_videos || (vidsOf[p.id] || []).length; return n ? n + (n === 1 ? " talk" : " talks") : ""; };

  /* ---------- detailed profiles: parsed once, on first need ---------- */
  var DETAIL = null;
  var firstSentence = function (t) {
    t = String(t || "").trim();
    var re = /[.!?]["”')\]]?\s+(?=["“(]?[A-Z0-9])/g, m;
    while ((m = re.exec(t))) {
      var before = t.slice(0, m.index), w = (before.match(/(\S+)$/) || ["", ""])[1].replace(/^[("“]/, "");
      if (/^([A-Za-z]|[A-Z][a-z]{0,2}|U\.S|[A-Z]\.[A-Z]|St|Mr|Mrs|Dr|Jr|Sr|Prof|vs|etc|e\.g|i\.e|c|ca|No)$/.test(w.replace(/\.$/, "")) && t.charAt(m.index) === ".") continue;
      return t.slice(0, m.index + m[0].trimEnd().length);
    }
    return t;
  };
  var bioOf = function (p) {
    var d = DETAIL && DETAIL[p.id], b = d && Array.isArray(d.background) ? d.background.filter(function (t) { return t && String(t).trim(); })[0] : "";
    /* drop pronunciation guides like "( EE-lon; born ...)" for the short card line */
    return b ? firstSentence(b).replace(/\(\s+[^;()]*;\s*/g, "(").replace(/\s{2,}/g, " ") : p.bio || "";
  };
  var paintBios = function () {
    document.querySelectorAll(".x-pc[data-id] .x-pc__bio").forEach(function (el) {
      var p = byId[el.parentNode.getAttribute("data-id")]; if (p) el.textContent = bioOf(p);
    });
  };
  var detail = function () {
    if (DETAIL === null) {
      var d = read("d-people-detail");
      DETAIL = d && !Array.isArray(d) ? d : {};
      paintBios();
    }
    return DETAIL;
  };
  var norm = function (s) { return String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); };
  var short = function (s) { return norm(s).split(" ").filter(function (w) { return w.length > 1; }).join(" "); };
  var nameIdx = {};
  PEOPLE.forEach(function (p) { nameIdx[norm(p.name)] = p.id; nameIdx[short(p.name)] = nameIdx[short(p.name)] || p.id; });
  var personOf = function (s) { return nameIdx[norm(s)] || nameIdx[short(s)] || null; };

  /* ---------- grid ---------- */
  var F = { q: "", group: "", neuro: false, sort: "f" }, shown = 0, list = [], PAGE = 60;
  var counts = {}; PEOPLE.forEach(function (p) { counts[p.group] = (counts[p.group] || 0) + 1; });
  var nNeuro = PEOPLE.filter(function (p) { return p.neuro; }).length;
  var groups = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
  var chip = function (attr, val, label, on) { return '<button class="x-f" type="button" aria-pressed="' + !!on + '" ' + attr + '="' + esc(val) + '">' + esc(label).replace(/ (\d+)$/, ' <span class="x-n">$1</span>') + "</button>"; };
  var paintChips = function () {
    $("pchips").innerHTML = chip("data-pg", "", "All " + PEOPLE.length, !F.group && !F.neuro) + chip("data-pn", "1", "🧠 Neuroscientists " + nNeuro, F.neuro) +
      groups.map(function (g) { return chip("data-pg", g, GROUP(g) + " " + counts[g], F.group === g); }).join("");
  };
  var ICON_GRP = '<svg class="x-ic" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-6.9 6.9a1 1 0 0 1-1.4 0z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="8.2" cy="8.2" r="1.7" fill="currentColor"/></svg>';
  var ICON_PLAY = '<svg class="x-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
  var card = function (p) {
    var bio = bioOf(p);
    return '<a class="x-pc" data-id="' + esc(p.id) + '" data-g="' + esc(p.group) + '" href="#/person/' + esc(p.id) + '">' + avatar(p) +
      '<span class="x-pc__name">' + esc(p.name) + (p.neuro ? " 🧠" : "") + "</span>" +
      (p.role ? '<span class="x-pc__role">' + esc(p.role) + "</span>" : "") +
      '<span class="x-pc__bio">' + esc(bio) + "</span>" +
      '<span class="x-pc__meta"><span class="pill x-pc__grp">' + ICON_GRP + esc(GROUP(p.group)) + "</span>" + (talks(p) ? '<span class="pill x-pc__talks">' + ICON_PLAY + talks(p) + "</span>" : "") + "</span></a>";
  };
  var more = function () {
    $("pgrid").insertAdjacentHTML("beforeend", list.slice(shown, shown + PAGE).map(card).join(""));
    shown = Math.min(list.length, shown + PAGE);
    $("pmore").hidden = shown >= list.length;
    $("pmore").textContent = "Show more (" + (list.length - shown) + " left)";
  };
  var apply = function () {
    var terms = F.q.toLowerCase().split(/\s+/).filter(Boolean);
    list = PEOPLE.filter(function (p) {
      if (F.group && p.group !== F.group) return false;
      if (F.neuro && !p.neuro) return false;
      return terms.every(function (t) { return p.hay.indexOf(t) >= 0; });
    });
    if (F.sort === "az") list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else if (F.sort === "v") list.sort(function (a, b) { return (b.n_videos || 0) - (a.n_videos || 0) || idx[a.id] - idx[b.id]; });
    $("pcount").textContent = list.length + (list.length === 1 ? " person" : " people");
    $("pgrid").innerHTML = list.length ? "" : '<p class="fineprint">No one matches. Try another name or group.</p>';
    shown = 0; more(); paintChips();
  };
  if ($("pgrid")) {
    $("pq").addEventListener("input", function () { F.q = this.value; apply(); });
    $("psort").addEventListener("change", function () { F.sort = this.value; apply(); });
    $("pmore").addEventListener("click", more);
    $("pchips").addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-pn")) { F.neuro = !F.neuro; F.group = ""; }
      else { F.group = b.getAttribute("data-pg") === F.group ? "" : b.getAttribute("data-pg"); F.neuro = false; }
      apply();
    });
    apply();
    /* Card bios switch to the first background sentence once the profiles are parsed, in idle time. */
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1500); };
    idle(function () { detail(); }, { timeout: 4000 });
  }

  /* ---------- person page ---------- */
  var baseTitle = document.title;
  var view = $("person-view"), main = document.querySelector("main.main"), saved = 0, open = false, player = null;
  if (!view || !main) return;
  var toc = [];
  var block = function (title, html, id, label) {
    if (!html) return "";
    if (id) toc.push({ id: id, t: label || title });
    return '<section class="x-pv__block"' + (id ? ' id="' + id + '"' : "") + '><h2 class="x-pv__h">' + title + "</h2>" + html + "</section>";
  };
  var stCls = function (s) { return /^Came/.test(s) ? "good" : /^Partial/.test(s) ? "amber" : /^Not yet/.test(s) ? "blue" : /^Wrong/.test(s) ? "bad" : "grey"; };
  var host = function (u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return String(u); } };
  var arr = function (a) { return Array.isArray(a) ? a.filter(function (x) { return x != null && String(x).trim() !== ""; }) : []; };
  var words = function (s) { return String(s || "").split(/\s+/).filter(Boolean).length; };
  var CAP = '<svg class="x-ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4 1.5 9 12 14l10.5-5z" fill="currentColor"/><path d="M5.5 11.2v4.3c0 1.6 2.9 3 6.5 3s6.5-1.4 6.5-3v-4.3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21.5 9v5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ARROW = '<svg class="x-ic" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 12h15m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var personChip = function (s) {
    var id = personOf(s), x = id && byId[id];
    return x ? '<a class="x-ff__chip x-ff__chip--link" href="#/person/' + esc(id) + '">' + esc(s) + "</a>" : '<span class="x-ff__chip">' + esc(s) + "</span>";
  };
  var factFile = function (d) {
    var rows = [], row = function (k, v) { if (v) rows.push("<dt>" + k + "</dt><dd>" + v + "</dd>"); };
    var bp = arr(d.birthplace), fl = arr(d.fields), em = arr(d.employers), ad = arr(d.advisors), st = arr(d.students), aw = arr(d.awards);
    row("Born in", bp.map(esc).join(" · "));
    row("Fields", fl.length ? '<span class="x-ff__chips">' + fl.map(function (f) { return '<span class="x-ff__chip">' + esc(f) + "</span>"; }).join("") + "</span>" : "");
    row("Employers", em.length ? '<ul class="x-ff__list">' + em.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "");
    row("Advisors", ad.length ? '<span class="x-ff__chips">' + ad.map(personChip).join("") + "</span>" : "");
    row("Students", st.length ? '<span class="x-ff__chips">' + st.map(personChip).join("") + "</span>" : "");
    row("Awards", aw.length ? '<span class="x-ff__chips">' + aw.map(function (a) { return '<span class="x-ff__chip x-ff__chip--gold">' + esc(a) + "</span>"; }).join("") + "</span>" : "");
    return rows.length ? '<section class="x-ff" aria-labelledby="pvFF"><h2 class="x-pv__h" id="pvFF">Fact file</h2><dl class="x-ff__grid">' + rows.join("") + "</dl></section>" : "";
  };
  var predCard = function (r) {
    var when = r.year_made || r.target ? '<span class="x-prc__when"><b>' + esc(r.year_made || "?") + "</b>" + (r.target ? ARROW + "<b>" + esc(r.target) + "</b>" : "") + "</span>" : "";
    return '<article class="x-prc__c">' +
      (when || r.status ? '<div class="x-prc__top">' + when + (r.status ? '<span class="x-st x-st--' + stCls(r.status) + '">' + esc(r.status) + "</span>" : "") + "</div>" : "") +
      '<p class="x-prc__claim">' + esc(r.claim) + "</p>" +
      (r.evidence ? '<p class="x-prc__ev"><b>Evidence.</b> ' + esc(r.evidence) + "</p>" : "") +
      (r.source_url ? '<a class="link x-prc__src" href="' + esc(r.source_url) + '" target="_blank" rel="noopener">Source · ' + esc(host(r.source_url)) + "</a>" : "") +
      "</article>";
  };
  var LINKS = { wiki: "Wikipedia", site: "Website", website: "Website", scholar: "Google Scholar", lab: "Lab", x: "X", numenta: "Numenta", tufts: "Tufts", imperial: "Imperial", ucl_page: "UCL page", blue_brain: "Blue Brain", salk: "Salk", allen_institute: "Allen Institute", bci: "BCI" };
  var ext = function (u, t) { return '<a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + "</a>"; };
  var statusChip = function (s) { return s ? '<span class="chip' + (/came true|correct|on track/i.test(s) ? " chip--solid" : "") + '">' + esc(s) + "</span>" : ""; };
  var thumbUrl = function (id) { return AP ? AP.thumb(id) : "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; };
  var vmeta = function (v) { return esc([v.c, AP && AP.fmtDate(v.d), v.len].filter(Boolean).join(" · ")); };
  /* Person-page rows open the video in the in-page window (player.js); the page stays put. */
  var vrow = function (v) {
    return '<a class="x-pv__v" href="#/watch/' + esc(v.id) + '" data-watch="' + esc(v.id) + '" data-title="' + esc(v.t) + '"><img src="' + thumbUrl(v.id) + '" alt="" loading="lazy" />' +
      "<span><b>" + esc(v.t) + "</b><small>" + vmeta(v) + "</small></span></a>";
  };
  /* Up-next rows on the watch page load into its player in place. */
  var wrow = function (v, on) {
    return '<button class="x-pv__v" type="button" data-wv="' + esc(v.id) + '" aria-current="' + !!on + '"><img src="' + thumbUrl(v.id) + '" alt="" loading="lazy" />' +
      "<span><b>" + esc(v.t) + "</b><small>" + vmeta(v) + "</small></span></button>";
  };

  var render = function (p) {
    var i = idx[p.id], prev = PEOPLE[(i - 1 + PEOPLE.length) % PEOPLE.length], next = PEOPLE[(i + 1) % PEOPLE.length];
    var vids = (vidsOf[p.id] || []).slice().sort(function (a, b) { return String(b.d === "None" ? "" : b.d).localeCompare(String(a.d === "None" ? "" : a.d)); });
    var name = p.name.toLowerCase();
    var preds = PREDS.filter(function (r) { return String(r.who || "").toLowerCase().indexOf(name) >= 0; });
    var ents = (p.entries || []).map(function (id) { return entryById[id]; }).filter(Boolean).sort(function (a, b) { return (a.year || 0) - (b.year || 0); });
    var related = PEOPLE.filter(function (x) { return x.group === p.group && x.id !== p.id; }).slice(0, 8);
    var links = [];
    var D = detail()[p.id] || {};
    var wiki = D.wiki_url || p.wiki;
    if (wiki) links.push(ext(wiki, "Wikipedia"));
    Object.keys(p.links || {}).forEach(function (k) { if (p.links[k]) links.push(ext(p.links[k], LINKS[k] || k)); });
    var lead = p.stance || p.warning;

    /* the detailed profile */
    var bg = arr(D.background), secs = (Array.isArray(D.sections) ? D.sections : []).filter(function (s) { return s && s.h && arr(s.p).length; });
    var edu = arr(D.education), work = arr(D.notable_work), srcs = arr(D.sources);
    var career = (Array.isArray(D.career) ? D.career : []).filter(function (c) { return c && c.what; });
    var views = typeof D.views === "string" ? D.views.trim() : "";
    var dp = (Array.isArray(D.predictions) ? D.predictions : []).filter(function (r) { return r && r.claim; });
    var kinds = dp.filter(function (r) { return r.kind === "pdoom" || r.kind === "agi"; });
    var cards = dp.filter(function (r) { return r.kind !== "pdoom" && r.kind !== "agi"; });
    if (!dp.length) cards = preds.map(function (r) { return { claim: r.prediction, year_made: r.year_made, target: r.target_year, status: r.status, evidence: r.evidence, source_url: r.prediction_source_url }; });
    var useBio = !bg.length && p.bio;
    var nWords = words(lead) + words(useBio ? p.bio : "") + words(views) +
      bg.reduce(function (n, t) { return n + words(t); }, 0) +
      secs.reduce(function (n, s) { return n + arr(s.p).reduce(function (m, t) { return m + words(t); }, 0); }, 0) +
      career.reduce(function (n, c) { return n + words(c.what) + words(c.years); }, 0) +
      edu.concat(work).reduce(function (n, t) { return n + words(t); }, 0) +
      dp.concat(cards).reduce(function (n, r) { return n + words(r.claim) + words(r.evidence); }, 0) +
      (p.quotes || []).reduce(function (n, q) { return n + words(q.text); }, 0);
    var mins = Math.max(1, Math.round(nWords / 230));
    toc = [];

    var paras = function (list) { return list.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join(""); };
    var bgHtml = bg.length ? '<div class="prose x-bg"><p class="x-bg__lede">' + esc(bg[0]) + "</p>" + paras(bg.slice(1)) + "</div>" : "";
    var secHtml = secs.length ? '<div class="x-acc">' + secs.map(function (s, k) {
      var ps = arr(s.p), len = ps.join(" ").length, long = len > 1100;
      return "<details" + (k < 2 ? " open" : "") + '><summary><span class="x-acc__h">' + esc(s.h) + '</span><span class="x-acc__m">' + Math.max(1, Math.round(words(ps.join(" ")) / 230)) + " min</span></summary>" +
        '<div class="x-acc__body"><div class="prose x-clamp' + (long ? " is-clamped" : "") + '">' + paras(ps) + "</div>" +
        (long ? '<button class="btn x-more" type="button" data-more aria-expanded="false">Read more</button>' : "") + "</div></details>";
    }).join("") + "</div>" : "";
    var viewsHtml = views ? (function () {
      var f = firstSentence(views), rest = views.slice(f.length).trim();
      return '<div class="x-views"><p><strong>' + esc(f) + "</strong>" + (rest ? " " + esc(rest) : "") + "</p></div>";
    })() : "";
    var predHtml = (kinds.length ? '<div class="x-prk">' + kinds.map(function (r) {
      var c = String(r.claim), m = /^([^:]{2,30}):\s*(.+)$/.exec(c);
      return '<div class="x-prk__t" data-k="' + esc(r.kind) + '"><span class="x-prk__l">' + esc(m ? m[1] : r.kind === "pdoom" ? "p(doom)" : "AGI expected") + '</span><span class="x-prk__v">' + esc(m ? m[2] : c) + "</span></div>";
    }).join("") + "</div>" : "") +
      (cards.length ? '<div class="x-prc">' + cards.map(predCard).join("") + "</div>" : "");
    var careerHtml = career.length ? '<ol class="x-car">' + career.map(function (c) {
      return "<li>" + (c.years ? '<span class="pill x-car__y">' + esc(c.years) + "</span>" : "") + '<p class="x-car__w">' + esc(c.what) + "</p></li>";
    }).join("") + "</ol>" : "";
    var eduHtml = edu.length ? '<ul class="x-edu">' + edu.map(function (e) { return "<li>" + CAP + "<span>" + esc(e) + "</span></li>"; }).join("") + "</ul>" : "";
    var workHtml = work.length ? '<ul class="x-pv__list">' + work.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>" : "";
    var srcHtml = srcs.length ? '<ol class="x-src">' + srcs.map(function (u) { return '<li><a class="link" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(host(u)) + "</a></li>"; }).join("") + "</ol>" : "";
    var ff = factFile(D);

    view.innerHTML =
      '<div class="links x-pv__top"><a class="btn" href="#/">← Back</a></div>' +
      '<header class="x-pv__head" data-g="' + esc(p.group) + '">' + (p.photo ? '<img class="x-pv__bg" src="' + esc(p.photo) + '" alt="" aria-hidden="true" onerror="this.remove()" />' : "") + avatar(p, "x-pav--big") + "<div>" +
        "<h1>" + esc(p.name) + "</h1>" +
        (p.born_died ? '<p class="x-pv__sub">' + esc(p.born_died) + "</p>" : "") +
        '<p class="x-pv__sub">' + esc([p.role, p.org].filter(Boolean).join(" · ")) + "</p>" +
        '<p class="x-pv__badges"><span class="pill">' + esc(GROUP(p.group)) + "</span>" + (p.neuro ? '<span class="pill x-neuro">🧠 Neuroscientist</span>' : "") + (talks(p) ? '<span class="pill">' + talks(p) + "</span>" : "") + '<span class="pill">' + mins + " min read</span></p>" +
        (p.pdoom || p.agi_year ? '<p class="x-pv__badges">' + (p.pdoom ? '<span class="chip chip--solid">p(doom): ' + esc(p.pdoom) + "</span>" : "") + (p.agi_year ? '<span class="chip">AGI: ' + esc(p.agi_year) + "</span>" : "") + "</p>" : "") +
      "</div></header>" +
      '<div class="x-pv__grid"><aside class="x-pv__side">' + ff + '<nav class="x-toc" id="pvToc" aria-label="On this page"></nav></aside><div class="x-pv__body">' +
      (lead ? '<p class="x-pv__lead">' + esc(lead) + "</p>" : "") +
      block("Background", bgHtml, "pv-background") +
      block("Bio", useBio ? '<div class="prose"><p>' + esc(p.bio) + "</p></div>" : "", "pv-bio") +
      block("Views on AGI, risk &amp; alignment", viewsHtml, "pv-views", "Views on AGI") +
      block("Predictions", predHtml, "pv-predictions") +
      block("In depth", secHtml, "pv-depth") +
      block("Career", careerHtml, "pv-career") +
      block("Education", eduHtml, "pv-education") +
      block("Notable work", workHtml, "pv-work") +
      block("Key ideas", (p.key_ideas || []).length ? '<p class="x-pv__badges">' + p.key_ideas.map(function (k) { return '<span class="pill">' + esc(k) + "</span>"; }).join("") + "</p>" : "", "pv-ideas") +
      block("Books", (p.books || []).length ? '<ul class="x-pv__list">' + p.books.map(function (b) { return "<li>" + esc(typeof b === "string" ? b : [b.title, b.year].filter(Boolean).join(", ")) + "</li>"; }).join("") + "</ul>" : "", "pv-books") +
      block("Quotes", (p.quotes || []).map(function (q) {
        return '<figure class="x-pv__q"><blockquote class="x-quote">“' + esc(q.text) + "”</blockquote><figcaption>" +
          (q.url ? '<a class="link" href="' + esc(q.url) + '" target="_blank" rel="noopener">' + esc(q.source || "Source") + "</a>" : esc(q.source || "")) + (q.year ? " · " + esc(q.year) : "") + "</figcaption></figure>";
      }).join(""), "pv-quotes") +
      block("In the archive", ents.length ? '<ul class="x-pv__list">' + ents.map(function (e) {
        return '<li><span class="pill">' + esc(e.year) + '</span> <a class="link" href="#e-' + esc(e.id) + '" data-go-entry="' + esc(e.id) + '">' + esc(e.title) + "</a>" +
          (e.source_url ? ' · <a class="link" href="' + esc(e.source_url) + '" target="_blank" rel="noopener">Source</a>' : "") + "</li>";
      }).join("") + "</ul>" : "", "pv-archive") +
      block("Watch", vids.length ? '<div id="pvPlayer"></div><div class="x-pv__vids">' + vids.map(function (v) { return vrow(v); }).join("") + "</div>" : "", "pv-watch") +
      block("Links", links.length ? '<div class="links">' + links.join("") + "</div>" : "", "pv-links") +
      block("Sources", srcHtml, "pv-sources") +
      block("More " + esc(GROUP(p.group).toLowerCase()) + " people", related.length ? '<div class="x-pv__rel">' + related.map(function (x) { return '<a class="x-pv__relp" href="#/person/' + esc(x.id) + '">' + avatar(x) + "<span>" + esc(x.name) + "</span></a>"; }).join("") + "</div>" : "", "pv-related", "Related people") +
      "</div></div>" +
      '<nav class="x-pv__pn" aria-label="Other people"><a class="btn" href="#/person/' + esc(prev.id) + '">← ' + esc(prev.name) + '</a><a class="btn" href="#/person/' + esc(next.id) + '">' + esc(next.name) + " →</a></nav>";

    player = null;
    if (vids.length && AP && $("pvPlayer")) {
      player = AP.create($("pvPlayer"), { people: byId });
      player.load(vids[0], { queue: vids, index: 0 });
    }
    view._vids = vids;
    paintToc();
  };

  /* "On this page": buttons, so the hash route never changes. */
  var tocObs = null;
  var paintToc = function () {
    var nav = $("pvToc");
    if (tocObs) { tocObs.disconnect(); tocObs = null; }
    if (!nav) return;
    if (toc.length < 3) {
      var side = nav.parentNode; nav.remove();
      if (!side.children.length) side.parentNode.classList.add("x-pv__grid--solo");
      return;
    }
    nav.innerHTML = '<p class="x-toc__h">On this page</p><ol>' +
      toc.map(function (t) { return '<li><button type="button" class="x-btnreset" data-toc="' + t.id + '">' + t.t + "</button></li>"; }).join("") + "</ol>";
    if (!("IntersectionObserver" in window)) return;
    var mark = function (id) { nav.querySelectorAll("[data-toc]").forEach(function (b) { b.setAttribute("aria-current", b.dataset.toc === id ? "true" : "false"); }); };
    var vis = {};
    tocObs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vis[e.target.id] = e.isIntersecting; });
      var on = toc.filter(function (t) { return vis[t.id]; })[0];
      if (on) mark(on.id);
    }, { rootMargin: "-80px 0px -55% 0px" });
    toc.forEach(function (t) { var el = $(t.id); if (el) tocObs.observe(el); });
  };

  /* ---------- watch page at #/watch/<youtubeId> ---------- */
  var vById = {}; V.forEach(function (v) { vById[v.id] = v; });
  var entryOfVideo = function (id) {
    return ENTRIES.filter(function (e) { return e.youtube_id === id || (e.videos || []).some(function (x) { return (x.youtube_id || x.id || x) === id; }); })[0] || null;
  };
  var videoFor = function (id) {
    if (vById[id]) return vById[id];
    var e = entryOfVideo(id), x = e && (e.videos || []).filter(function (y) { return y.youtube_id === id; })[0];
    return { id: id, t: (x && x.oembed_title) || (e && e.title) || "YouTube video", c: "", d: e ? e.date : "", len: "", k: e ? e.type : "", p: e ? e.people_ids || [] : [], s: "" };
  };
  var KIND = function (k) { return String(k || "").replace(/-/g, " ").replace(/^./, function (c) { return c.toUpperCase(); }); };
  var upNextFor = function (v) {
    var out = [], seen = {}; seen[v.id] = 1;
    var add = function (list) { list.forEach(function (x) { if (out.length < 12 && !seen[x.id]) { seen[x.id] = 1; out.push(x); } }); };
    if (v.p && v.p.length) add(V.filter(function (x) { return (x.p || []).some(function (id) { return v.p.indexOf(id) >= 0; }); }));
    if (v.k) add(V.filter(function (x) { return x.k === v.k; }));
    return out;
  };
  var watchInfo = function (v) {
    var e = entryOfVideo(v.id);
    var chips = (v.p || []).map(function (id) { var x = byId[id]; return x ? '<a class="x-pv__relp x-wv__chip" href="#/person/' + esc(id) + '">' + avatar(x) + "<span>" + esc(x.name) + "</span></a>" : ""; }).join("");
    return "<h1 class=\"x-wv__title\">" + esc(v.t) + "</h1>" +
      '<p class="x-pv__badges">' + (v.k ? '<span class="chip">' + esc(KIND(v.k)) + "</span>" : "") +
        [v.c, AP && AP.fmtDate(v.d), v.len].filter(Boolean).map(function (s) { return '<span class="pill">' + esc(s) + "</span>"; }).join("") + "</p>" +
      (chips ? '<div class="x-pv__rel x-wv__people">' + chips + "</div>" : "") +
      (e ? '<section class="x-pv__block"><h2 class="x-pv__h">In the archive</h2>' +
        '<p><span class="pill">' + esc(e.date || e.year || "") + '</span> <a class="link" href="#e-' + esc(e.id) + '" data-go-entry="' + esc(e.id) + '">' + esc(e.title) + "</a></p>" +
        (e.summary ? '<div class="prose"><p>' + esc(e.summary) + "</p></div>" : "") +
        (e.quote ? '<figure class="x-pv__q"><blockquote class="x-quote">“' + esc(e.quote) + "”</blockquote>" + (e.person ? "<figcaption>" + esc(e.person) + "</figcaption>" : "") + "</figure>" : "") +
        "</section>" : "");
  };
  var showWatchInfo = function (v) {
    var box = $("wvInfo"); if (box) box.innerHTML = watchInfo(v);
    document.title = v.t + " · ASI History Archive";
    view.querySelectorAll("[data-wv]").forEach(function (x) { x.setAttribute("aria-current", x.dataset.wv === v.id); });
    var h = "#/watch/" + encodeURIComponent(v.id);
    if (location.hash !== h && history.replaceState) { history.replaceState(history.state, "", h); lastHash = location.hash; }
  };
  var renderWatch = function (v) {
    var next = upNextFor(v), queue = [v].concat(next);
    view.innerHTML =
      '<div class="links x-pv__top"><a class="btn" href="#/" data-back>← Back</a></div>' +
      '<div class="x-wv"><div class="x-wv__main"><div id="wvPlayer"></div><div id="wvInfo"></div></div>' +
      (next.length ? '<aside class="x-wv__side"><h2 class="x-pv__h">Up next</h2><div class="x-wv__list">' + queue.map(function (x, k) { return wrow(x, k === 0); }).join("") + "</div></aside>" : "") +
      "</div>";
    view._queue = queue;
    player = null;
    if (AP && $("wvPlayer")) {
      player = AP.create($("wvPlayer"), { people: byId, onChange: function (x) { showWatchInfo(x); } });
      player.load(v, { queue: queue, index: 0 });
    }
    showWatchInfo(v);
  };

  view.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-toc]");
    if (t) {
      ev.preventDefault();
      var el = $(t.getAttribute("data-toc"));
      if (el) {
        var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
        var h = el.querySelector("h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      }
      return;
    }
    var rm = ev.target.closest("[data-more]");
    if (rm) {
      var box = rm.previousElementSibling, opened = box.classList.toggle("is-clamped") === false;
      rm.setAttribute("aria-expanded", opened);
      rm.textContent = opened ? "Show less" : "Read more";
      return;
    }
    var b = ev.target.closest("[data-wv]");
    if (b && player) {
      var q = view._queue || [], k = q.map(function (v) { return v.id; }).indexOf(b.dataset.wv);
      var y = window.scrollY;
      if (k >= 0) player.load(q[k], { queue: q, index: k });
      if (window.scrollY !== y) window.scrollTo(window.scrollX, y);
      return;
    }
    var bk = ev.target.closest("[data-back]");
    if (bk && entered) { ev.preventDefault(); history.back(); return; }
    var g = ev.target.closest("[data-go-entry]");
    if (g) {
      ev.preventDefault();
      var id = g.getAttribute("data-go-entry");
      location.hash = "#/";
      route();
      if (window.ArchiveSite && window.ArchiveSite.gotoEntry) window.ArchiveSite.gotoEntry(id);
    }
  });

  var lastHash = null, entered = false, booted = false;
  var route = function () {
    if (location.hash === lastHash) return; /* hashchange and popstate can both fire for one step */
    var prevHash = lastHash;
    lastHash = location.hash;
    /* #/watch/<id> is only a deep link: it opens the in-page video window over the current view,
       then the address goes back to what it was, so nothing navigates. */
    var w = /^#\/watch\/([^/?#]+)/.exec(location.hash), wid = w && decodeURIComponent(w[1]);
    if (wid) {
      var back = prevHash && !/^#\/watch\//.test(prevHash) ? prevHash : "";
      if (history.replaceState) history.replaceState(history.state, "", location.pathname + location.search + back);
      lastHash = location.hash;
      if (AP && AP.watch) AP.watch(videoFor(wid));
      return;
    }
    var m = /^#\/person\/([^/?#]+)/.exec(location.hash), p = m && byId[decodeURIComponent(m[1])];
    if (p) {
      if (!open) { saved = window.scrollY; entered = booted; }
      open = true;
      main.hidden = true; view.hidden = false;
      render(p); document.title = p.name + " · ASI History Archive";
      window.scrollTo(0, 0);
      return;
    }
    if (!open) return;
    open = false; entered = false;
    view.hidden = true; view.innerHTML = ""; player = null;
    main.hidden = false;
    document.title = baseTitle;
    var target = location.hash && location.hash.length > 1 && location.hash.charAt(1) !== "/" ? document.getElementById(location.hash.slice(1)) : null;
    if (target) target.scrollIntoView(); else window.scrollTo(0, saved);
  };
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  route();
  booted = true;
})();
