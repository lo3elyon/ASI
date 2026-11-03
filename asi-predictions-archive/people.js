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
  var card = function (p) {
    return '<a class="x-pc" data-g="' + esc(p.group) + '" href="#/person/' + esc(p.id) + '">' + avatar(p) +
      '<span class="x-pc__name">' + esc(p.name) + (p.neuro ? " 🧠" : "") + "</span>" +
      (p.role ? '<span class="x-pc__role">' + esc(p.role) + "</span>" : "") +
      '<span class="x-pc__meta"><span class="pill">' + esc(GROUP(p.group)) + "</span>" + (talks(p) ? '<span class="pill">' + talks(p) + "</span>" : "") + "</span></a>";
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
  }

  /* ---------- person page ---------- */
  var baseTitle = document.title;
  var view = $("person-view"), main = document.querySelector("main.main"), saved = 0, open = false, player = null;
  if (!view || !main) return;
  var block = function (title, html) { return html ? '<section class="x-pv__block"><h2 class="x-pv__h">' + title + "</h2>" + html + "</section>" : ""; };
  var LINKS = { wiki: "Wikipedia", site: "Website", website: "Website", scholar: "Google Scholar", lab: "Lab", x: "X", numenta: "Numenta", tufts: "Tufts", imperial: "Imperial", ucl_page: "UCL page", blue_brain: "Blue Brain", salk: "Salk", allen_institute: "Allen Institute", bci: "BCI" };
  var ext = function (u, t) { return '<a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + "</a>"; };
  var statusChip = function (s) { return s ? '<span class="chip' + (/came true|correct|on track/i.test(s) ? " chip--solid" : "") + '">' + esc(s) + "</span>" : ""; };
  var vrow = function (v, on) {
    return '<button class="x-pv__v" type="button" data-pv="' + esc(v.id) + '" aria-current="' + !!on + '"><img src="' + (AP ? AP.thumb(v.id) : "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg") + '" alt="" loading="lazy" />' +
      "<span><b>" + esc(v.t) + "</b><small>" + esc([v.c, AP && AP.fmtDate(v.d), v.len].filter(Boolean).join(" · ")) + "</small></span></button>";
  };

  var render = function (p) {
    var i = idx[p.id], prev = PEOPLE[(i - 1 + PEOPLE.length) % PEOPLE.length], next = PEOPLE[(i + 1) % PEOPLE.length];
    var vids = (vidsOf[p.id] || []).slice().sort(function (a, b) { return String(b.d === "None" ? "" : b.d).localeCompare(String(a.d === "None" ? "" : a.d)); });
    var name = p.name.toLowerCase();
    var preds = PREDS.filter(function (r) { return String(r.who || "").toLowerCase().indexOf(name) >= 0; });
    var ents = (p.entries || []).map(function (id) { return entryById[id]; }).filter(Boolean).sort(function (a, b) { return (a.year || 0) - (b.year || 0); });
    var related = PEOPLE.filter(function (x) { return x.group === p.group && x.id !== p.id; }).slice(0, 8);
    var links = [];
    if (p.wiki) links.push(ext(p.wiki, "Wikipedia"));
    Object.keys(p.links || {}).forEach(function (k) { if (p.links[k]) links.push(ext(p.links[k], LINKS[k] || k)); });
    var lead = p.stance || p.warning;

    view.innerHTML =
      '<div class="links x-pv__top"><a class="btn" href="#/">← Back</a></div>' +
      '<header class="x-pv__head" data-g="' + esc(p.group) + '">' + (p.photo ? '<img class="x-pv__bg" src="' + esc(p.photo) + '" alt="" aria-hidden="true" onerror="this.remove()" />' : "") + avatar(p, "x-pav--big") + "<div>" +
        "<h1>" + esc(p.name) + "</h1>" +
        (p.born_died ? '<p class="x-pv__sub">' + esc(p.born_died) + "</p>" : "") +
        '<p class="x-pv__sub">' + esc([p.role, p.org].filter(Boolean).join(" · ")) + "</p>" +
        '<p class="x-pv__badges"><span class="pill">' + esc(GROUP(p.group)) + "</span>" + (p.neuro ? '<span class="pill x-neuro">🧠 Neuroscientist</span>' : "") + (talks(p) ? '<span class="pill">' + talks(p) + "</span>" : "") + "</p>" +
        (p.pdoom || p.agi_year ? '<p class="x-pv__badges">' + (p.pdoom ? '<span class="chip chip--solid">p(doom): ' + esc(p.pdoom) + "</span>" : "") + (p.agi_year ? '<span class="chip">AGI: ' + esc(p.agi_year) + "</span>" : "") + "</p>" : "") +
      "</div></header>" +
      (lead ? '<p class="x-pv__lead">' + esc(lead) + "</p>" : "") +
      block("Bio", p.bio ? '<div class="prose"><p>' + esc(p.bio) + "</p></div>" : "") +
      block("Key ideas", (p.key_ideas || []).length ? '<p class="x-pv__badges">' + p.key_ideas.map(function (k) { return '<span class="pill">' + esc(k) + "</span>"; }).join("") + "</p>" : "") +
      block("Books", (p.books || []).length ? '<ul class="x-pv__list">' + p.books.map(function (b) { return "<li>" + esc(typeof b === "string" ? b : [b.title, b.year].filter(Boolean).join(", ")) + "</li>"; }).join("") + "</ul>" : "") +
      block("Quotes", (p.quotes || []).map(function (q) {
        return '<figure class="x-pv__q"><blockquote class="x-quote">“' + esc(q.text) + "”</blockquote><figcaption>" +
          (q.url ? '<a class="link" href="' + esc(q.url) + '" target="_blank" rel="noopener">' + esc(q.source || "Source") + "</a>" : esc(q.source || "")) + (q.year ? " · " + esc(q.year) : "") + "</figcaption></figure>";
      }).join("")) +
      block("In the archive", ents.length ? '<ul class="x-pv__list">' + ents.map(function (e) {
        return '<li><span class="pill">' + esc(e.year) + '</span> <a class="link" href="#e-' + esc(e.id) + '" data-go-entry="' + esc(e.id) + '">' + esc(e.title) + "</a>" +
          (e.source_url ? ' · <a class="link" href="' + esc(e.source_url) + '" target="_blank" rel="noopener">Source</a>' : "") + "</li>";
      }).join("") + "</ul>" : "") +
      block("Their predictions", preds.length ? '<ul class="x-pv__list">' + preds.map(function (r) {
        return '<li><span class="pill">' + esc(r.year_made) + (r.target_year ? " → " + esc(r.target_year) : "") + "</span> " + esc(r.prediction) + " " + statusChip(r.status) + "</li>";
      }).join("") + "</ul>" : "") +
      block("Watch", vids.length ? '<div id="pvPlayer"></div><div class="x-pv__vids">' + vids.map(function (v, k) { return vrow(v, k === 0); }).join("") + "</div>" : "") +
      block("Links", links.length ? '<div class="links">' + links.join("") + "</div>" : "") +
      block("More " + esc(GROUP(p.group).toLowerCase()) + " people", related.length ? '<div class="x-pv__rel">' + related.map(function (x) { return '<a class="x-pv__relp" href="#/person/' + esc(x.id) + '">' + avatar(x) + "<span>" + esc(x.name) + "</span></a>"; }).join("") + "</div>" : "") +
      '<nav class="x-pv__pn" aria-label="Other people"><a class="btn" href="#/person/' + esc(prev.id) + '">← ' + esc(prev.name) + '</a><a class="btn" href="#/person/' + esc(next.id) + '">' + esc(next.name) + " →</a></nav>";

    player = null;
    if (vids.length && AP && $("pvPlayer")) {
      player = AP.create($("pvPlayer"), { people: byId });
      player.load(vids[0], { queue: vids, index: 0 });
    }
    view._vids = vids;
  };

  view.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-pv]");
    if (b && player) {
      var vids = view._vids || [], k = vids.map(function (v) { return v.id; }).indexOf(b.dataset.pv);
      if (k >= 0) player.load(vids[k], { queue: vids, index: k });
      view.querySelectorAll("[data-pv]").forEach(function (x) { x.setAttribute("aria-current", x === b); });
      $("pvPlayer").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    var g = ev.target.closest("[data-go-entry]");
    if (g) {
      ev.preventDefault();
      var id = g.getAttribute("data-go-entry");
      history.pushState(null, "", "#/");
      route();
      if (window.ArchiveSite && window.ArchiveSite.gotoEntry) window.ArchiveSite.gotoEntry(id);
    }
  });

  var route = function () {
    var m = /^#\/person\/([^/?#]+)/.exec(location.hash), p = m && byId[decodeURIComponent(m[1])];
    if (p) {
      if (!open) saved = window.scrollY;
      open = true;
      main.hidden = true; view.hidden = false;
      render(p);
      document.title = p.name + " · ASI History Archive";
      window.scrollTo(0, 0);
      return;
    }
    if (!open) return;
    open = false;
    view.hidden = true; view.innerHTML = ""; player = null;
    main.hidden = false;
    document.title = baseTitle;
    var target = location.hash && location.hash.length > 1 && location.hash.charAt(1) !== "/" ? document.getElementById(location.hash.slice(1)) : null;
    if (target) target.scrollIntoView(); else window.scrollTo(0, saved);
  };
  window.addEventListener("hashchange", route);
  route();
})();
