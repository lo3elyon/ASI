/* fixes8.js: a post-render pass for avatars still showing initials (archive entry cards, people cards, search results,
   the person header), keyword highlights on person-page bios, and advisor/student chips linked to people.json.
   One helper for every avatar: XLogo.forName → logo tile; else the person's portrait (XLogo.photo / people.json photo);
   else the initials stay. Runs at load, on each route change and on DOM insertion, never on a timer. */
(function () {
  "use strict";
  var doc = document;
  if (!window.XLogo) return;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var read = function (id) { try { return (window.Hark && Hark.data ? Hark.data(id) : JSON.parse(doc.getElementById(id).textContent)) || []; } catch (e) { return []; } };

  var ENT = {}; read("d-entries").forEach(function (r) { if (r && r.id) ENT[r.id] = r; });
  var PEOPLE = read("d-people"), PBY = {}, BYNAME = {};
  PEOPLE.forEach(function (p) { if (!p || !p.id) return; PBY[p.id] = p; BYNAME[String(p.name || "").trim().toLowerCase()] = p.id; });

  /* the one helper: { logo } | { srcs } | null */
  var faceFor = function (name, pid, photo, orgFirst) {
    var lg = orgFirst !== false && name ? XLogo.forName(name) : null;
    if (lg) return { logo: lg };
    var srcs = [], seen = {}, p = pid && PBY[pid];
    [pid && XLogo.photo(pid), p && p.photo, photo].forEach(function (s) { if (s && s !== "None" && !seen[s]) { seen[s] = 1; srcs.push(s); } });
    return srcs.length ? { srcs: srcs } : null;
  };
  var imgHtml = function (srcs, alt, size) {
    return XLogo.img ? XLogo.img(srcs, alt, size, 'loading="lazy"') : '<img src="' + esc(srcs[0]) + '" alt="' + esc(alt) + '" width="' + size + '" height="' + size + '" loading="lazy" decoding="async" />';
  };

  /* ---------- 1a. Archive entry cards: an .x-av holding only initials ---------- */
  var fixEntryAv = function (av) {
    if (av.querySelector("img") || av.__x8) return;
    av.__x8 = 1;
    var card = av.closest(".x-card[id^='e-']"), e = card && ENT[card.id.slice(2)];
    if (!e) return;
    var pid = (e.people_ids || [])[0] || "", f = faceFor(e.person, pid, e.portrait);
    if (!f) return;
    var ini = av.getAttribute("data-ini") || av.textContent.trim(), html;
    if (f.logo) html = '<a class="x-av x-av--logo x-av--tile" href="#/org/' + esc(f.logo.slug) + '" data-ini="' + esc(ini) + '" aria-label="' + esc(f.logo.name) + ': everything in the archive">' + XLogo.tile(f.logo, 32) + "</a>";
    else if (pid) html = '<a class="x-av" href="#/person/' + esc(pid) + '" data-ini="' + esc(ini) + '" aria-label="' + esc(e.person) + ': profile">' + imgHtml(f.srcs, e.person, 48) + "</a>";
    else html = '<span class="x-av" data-ini="' + esc(ini) + '" aria-hidden="true">' + imgHtml(f.srcs, e.person, 48) + "</span>";
    av.insertAdjacentHTML("afterend", html);
    av.remove();
  };

  /* ---------- 1b. People avatars (.x-pav) holding only initials: cards, search results, the person header ---------- */
  var pidOf = function (el) {
    var d = el.closest("[data-id]"); if (d && PBY[d.getAttribute("data-id")]) return d.getAttribute("data-id");
    var a = el.closest('a[href^="#/person/"]'); if (a) return decodeURIComponent(a.getAttribute("href").slice(9));
    if (el.closest(".x-pv__head")) { var m = /^#\/person\/([^/?#]+)/.exec(location.hash); if (m) return decodeURIComponent(m[1]); }
    return "";
  };
  var fixPersonAv = function (av) {
    if (av.querySelector("img")) return;
    var pid = pidOf(av);
    if (!pid || av.__x8 === pid) return;
    av.__x8 = pid;
    var p = PBY[pid], f = faceFor(p && p.name, pid, p && p.photo, false);
    if (!f) return;
    av.insertAdjacentHTML("beforeend", imgHtml(f.srcs, p ? p.name : "", 64));
  };

  /* ---------- 2. Person page: bio highlights and person chips ---------- */
  var BIO = ".x-pv__lead, .x-bg p, .x-acc__body .prose p, .x-views p, .x-car__w, #pv-background .prose p";
  var fixPersonPage = function (view) {
    if (window.XHL && XHL.apply) view.querySelectorAll(BIO).forEach(function (el) { try { XHL.apply(el); } catch (e) {} });
    view.querySelectorAll("span.x-ff__chip:not(.x-ff__chip--gold)").forEach(function (s) {
      var id = BYNAME[s.textContent.trim().toLowerCase()];
      if (!id) return;
      var a = doc.createElement("a");
      a.className = "x-ff__chip x-ff__chip--link";
      a.href = "#/person/" + id;
      a.textContent = s.textContent;
      s.replaceWith(a);
    });
  };

  var busy = false, q = 0;
  var run = function () {
    q = 0; busy = true;
    try {
      doc.querySelectorAll(".x-card .x-who > .x-av").forEach(function (av) { try { fixEntryAv(av); } catch (e) {} });
      doc.querySelectorAll(".x-pav").forEach(function (av) { try { fixPersonAv(av); } catch (e) {} });
      var view = doc.getElementById("person-view");
      if (view && /^#\/person\//.test(location.hash)) fixPersonPage(view);
    } finally { busy = false; }
  };
  var queue = function () { if (!q) q = requestAnimationFrame(run); };
  if ("MutationObserver" in window) {
    new MutationObserver(function (recs) {
      if (busy) return;
      for (var i = 0; i < recs.length; i++) if (recs[i].addedNodes.length) { queue(); return; }
    }).observe(doc.body, { childList: true, subtree: true });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", run); else run();
  window.addEventListener("load", queue);
  window.addEventListener("hashchange", queue);
})();
