/* logos.js: organisation logos and fallback portraits from logos.json.
   The image files are named statically in #x-logo-imgs (hidden), so they ship inside the page; this module only
   clones their src. XLogo.forName(name) finds an org by its exact name in the data (or that name without its
   bracketed note), XLogo.tile() draws the logo on a white rounded tile, XLogo.photo(personId) returns a portrait. */
(function () {
  "use strict";
  var doc = document;
  /* Hark.data comes from hark-charts.js, which loads after this file: read the inline block directly when it is absent */
  var read = function (id) {
    if (window.Hark && Hark.data) return Hark.data(id);
    var el = doc.getElementById(id), t = el && el.textContent.trim();
    return t ? JSON.parse(t) : null;
  };
  var D = {}; try { D = read("d-logos") || {}; } catch (e) { D = {}; }
  var ORGS = D.orgs || {}, PHOTOS = D.people_photos || {};
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var SRC = {};
  var srcOf = function (file) {
    if (!file) return null;
    if (file in SRC) return SRC[file];
    var im = doc.querySelector('#x-logo-imgs img[data-f="' + file + '"]');
    return (SRC[file] = im ? im.getAttribute("src") : null);
  };
  var strip = function (n) { return String(n || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim(); };
  var lower = {}; Object.keys(ORGS).forEach(function (k) { lower[k.toLowerCase()] = k; var s = strip(k).toLowerCase(); if (s && !(s in lower)) lower[s] = k; });

  /* one entry per logo (slug), with a readable display name: the people's most used org name, else the shortest plain key */
  var people = []; try { people = read("d-people") || []; } catch (e) { people = []; }
  var useN = {}; people.forEach(function (p) { if (p.org) useN[p.org] = (useN[p.org] || 0) + 1; });
  var SLUGS = {}, LIST = [];
  Object.keys(ORGS).sort().forEach(function (k) {
    var o = ORGS[k], s = SLUGS[o.slug];
    if (!s) { s = SLUGS[o.slug] = { slug: o.slug, file: o.file, domain: o.domain || "", names: [], name: k }; LIST.push(s); }
    s.names.push(k);
  });
  var plain = function (k) { return !/[()\/&]| and |Formerly|signator|incl\./i.test(k); };
  LIST.forEach(function (s) {
    var best = s.names.filter(plain).sort(function (a, b) { return (useN[b] || 0) - (useN[a] || 0) || a.length - b.length || (a < b ? -1 : 1); })[0];
    s.name = best || s.names.slice().sort(function (a, b) { return a.length - b.length; })[0];
  });
  LIST.sort(function (a, b) { return a.name.localeCompare(b.name, "en"); });

  var forName = function (name) {
    if (!name) return null;
    var k = ORGS[name] ? name : lower[String(name).toLowerCase()] || lower[strip(name).toLowerCase()];
    if (!k) return null;
    var o = ORGS[k], src = srcOf(o.file);
    return src ? { key: k, slug: o.slug, file: o.file, src: src, name: (SLUGS[o.slug] || {}).name || k } : null;
  };
  var tile = function (name, size, cls) {
    var o = typeof name === "object" && name ? name : forName(name);
    if (!o) return "";
    size = size || 20;
    return '<span class="x-logo ' + (cls || "") + '" style="--x-lg:' + size + 'px" title="' + esc(o.name) + '"><img src="' + esc(o.src) + '" alt="' + esc(o.name) + ' logo" width="' + size + '" height="' + size + '" loading="lazy" decoding="async" /></span>';
  };
  var bySlug = function (slug) { var s = SLUGS[slug]; if (!s) return null; var src = srcOf(s.file); return src ? { key: s.name, slug: s.slug, file: s.file, src: src, name: s.name, names: s.names } : null; };
  var photo = function (pid) { var p = PHOTOS[pid]; return p ? srcOf(p.file) : null; };

  /* ---------- one avatar helper for the whole site ----------
     XLogo.face(o): o = { name, pid, photo, org: true|false }. With org !== false, an organisation named by `name`
     gets its logo tile first. Otherwise the portraits, in order: the local portrait file for pid (always ships),
     the person's photo in people.json, then o.photo. XLogo.img(srcs, ...) writes an <img> whose later candidates
     wait in data-fb; on a load error the next one is tried, and only when none is left do the initials show. */
  var PBY = {}; people.forEach(function (p) { PBY[p.id] = p; });
  var face = function (o) {
    o = o || {};
    var lg = o.org !== false && o.name ? forName(o.name) : null;
    if (lg) return { logo: lg, srcs: [] };
    var p = o.pid ? PBY[o.pid] : null, seen = {}, srcs = [];
    [o.pid ? photo(o.pid) : null, p && p.photo, o.photo].forEach(function (s) { if (s && s !== "None" && !seen[s]) { seen[s] = 1; srcs.push(s); } });
    return { logo: null, srcs: srcs };
  };
  var img = function (srcs, alt, size, attrs) {
    if (!srcs || !srcs.length) return "";
    return '<img src="' + esc(srcs[0]) + '"' + (srcs.length > 1 ? " data-fb='" + esc(JSON.stringify(srcs.slice(1))) + "'" : "") + ' alt="' + esc(alt || "") + '" width="' + (size || 48) + '" height="' + (size || 48) + '" decoding="async"' + (attrs ? " " + attrs : "") + " />";
  };
  /* runs before every other error handler (this file loads first), so a fallback gets its turn before initials */
  doc.addEventListener("error", function (ev) {
    var im = ev.target; if (!im || im.tagName !== "IMG" || !im.hasAttribute("data-fb")) return;
    var rest = []; try { rest = JSON.parse(im.getAttribute("data-fb")) || []; } catch (e) { rest = []; }
    if (!rest.length) { im.removeAttribute("data-fb"); return; }
    var next = rest.shift();
    if (rest.length) im.setAttribute("data-fb", JSON.stringify(rest)); else im.setAttribute("data-fb", "[]");
    ev.stopImmediatePropagation();
    im.setAttribute("src", next);
  }, true);

  window.XLogo = {
    forName: forName, tile: tile, photo: photo, bySlug: bySlug, face: face, img: img,
    list: function () { return LIST.map(function (s) { return bySlug(s.slug); }).filter(Boolean); },
    names: function () { return Object.keys(ORGS); },
    slugOf: function (name) { var o = forName(name); return o ? o.slug : null; }
  };
})();
