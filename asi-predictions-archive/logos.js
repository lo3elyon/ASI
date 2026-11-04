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

  /* batch 25: each file's shape and plate, measured by work/logos25.py. ASPECT: width / height of wordmarks wider
     than 2:1, which get a slot of their own shape (object-fit: contain) instead of a square. MARK: wordmarks whose
     left end is a square symbol, shown as that crop in small chips. DARK: white-only artwork, on a dark plate.
     MISSING: placeholder files, drawn as tinted initials. */
  var ASPECT = { "logo-allen-institute.jpg": 2.28, "logo-anthropic.svg": 8.91, "logo-cais.png": 3.1, "logo-cambridge.png": 4.61, "logo-cmu.svg": 11.16, "logo-google-deepmind.svg": 4.31, "logo-google.svg": 3.3, "logo-hugging-face.svg": 3.76, "logo-indiana.svg": 6.65, "logo-jhu.jpg": 3.54, "logo-meta.svg": 4.96, "logo-microsoft.svg": 4.69, "logo-northeastern.svg": 3.13, "logo-nyu.svg": 2.94, "logo-open-philanthropy.png": 2.59, "logo-openai.svg": 3.72, "logo-oxford.svg": 3.4, "logo-princeton.svg": 3.88, "logo-sun-microsystems.svg": 2.3, "logo-u-louisville.png": 2.37, "logo-u-manchester.png": 3.21, "logo-uc-berkeley.svg": 3.18, "logo-uk-aisi.svg": 5.96, "logo-ut-austin.svg": 3.51, "logo-xai.svg": 8.19 };
  var MARK = { "logo-openai.svg": 1, "logo-google-deepmind.svg": 1, "logo-meta.svg": 1, "logo-microsoft.svg": 1, "logo-hugging-face.svg": 1 };
  var DARK = { "logo-fhi.svg": 1 };
  var MISSING = { "logo-truthful-ai.svg": 1 };
  var TINTS = ["ev", "lo", "tr", "co", "op", "cy", "early"];
  var initialsOf = function (n) {
    var w = strip(n).replace(/[^A-Za-z0-9 ]+/g, " ").split(/\s+/).filter(function (x) { return x && !/^(of|the|and|for|at|de)$/i.test(x); });
    return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || "?").slice(0, 2)).toUpperCase();
  };
  var tintOf = function (s) { var h = 0; s = String(s || ""); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % TINTS.length; var t = TINTS[h]; return "--c: var(--x-tr-" + t + "); --ci: var(--x-tr-" + t + "-ink)"; };
  var iniHtml = function (name, slug) { return '<span class="x25-ini" style="' + tintOf(slug || name) + '" aria-hidden="true">' + esc(initialsOf(name)) + "</span>"; };
  var mk = function (k, s, file) {
    var src = srcOf(file), miss = !!MISSING[file];
    if (!src && !miss) return null;
    return { key: k, slug: s.slug, file: file, src: miss ? "" : src, ini: miss, name: s.name || k, names: s.names, aspect: ASPECT[file] || 1 };
  };
  var forName = function (name) {
    if (!name) return null;
    var k = ORGS[name] ? name : lower[String(name).toLowerCase()] || lower[strip(name).toLowerCase()];
    if (!k) return null;
    var o = ORGS[k], s = SLUGS[o.slug] || { slug: o.slug, name: k };
    var r = mk(k, s, o.file); if (r) r.key = k;
    return r;
  };
  /* a broken logo or portrait becomes tinted initials, never a broken-image icon */
  var ONERR = "if(window.XLogo&&XLogo.fail)XLogo.fail(this)";
  var tile = function (name, size, cls) {
    var o = typeof name === "object" && name ? name : forName(name);
    if (!o) return "";
    size = size || 20;
    var file = o.file || "", ar = ASPECT[file] || 1, c = "x-logo " + (cls || ""), st = "--x-lg:" + size + "px";
    if (DARK[file]) c += " x25-lg-dark";
    if (o.ini || !o.src) return '<span class="' + c + '" style="' + st + '" title="' + esc(o.name) + '" role="img" aria-label="' + esc(o.name) + '">' + iniHtml(o.name, o.slug) + "</span>";
    var w = size, h = size;
    if (ar > 2) {
      if (size < 24 && MARK[file]) c += " x25-lg-crop";
      else { var k = Math.min(ar, 3.5); c += " x25-lg-wide"; st += ";--x25-ar:" + k; w = Math.round(size * k); h = Math.round(w / ar); }
    }
    return '<span class="' + c + '" style="' + st + '" title="' + esc(o.name) + '" data-ini="' + esc(initialsOf(o.name)) + '" data-slug="' + esc(o.slug) + '"><img src="' + esc(o.src) + '" alt="' + esc(o.name) + ' logo" width="' + w + '" height="' + h + '" loading="lazy" decoding="async" onerror="' + ONERR + '" /></span>';
  };
  var bySlug = function (slug) { var s = SLUGS[slug]; if (!s) return null; var r = mk(s.name, s, s.file); return r; };
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
    /* batch 25: every portrait carries an onerror; a caller's own onerror (this.remove(), showing initials behind) runs first */
    var own = attrs && /\bonerror="([^"]*)"/.exec(attrs);
    var rest = attrs ? attrs.replace(/\s*\bonerror="[^"]*"/, "") : "";
    var oe = (own ? own[1].replace(/;?\s*$/, ";") : "") + ONERR;
    return '<img src="' + esc(srcs[0]) + '"' + (srcs.length > 1 ? " data-fb='" + esc(JSON.stringify(srcs.slice(1))) + "'" : "") + ' alt="' + esc(alt || "") + '" data-x25n="' + esc(alt || "") + '" width="' + (size || 48) + '" height="' + (size || 48) + '" decoding="async"' + (rest && /\bloading=/.test(rest) ? "" : ' loading="lazy"') + (rest ? " " + rest : "") + ' onerror="' + oe + '" />';
  };
  /* the last fallback: an <img> that failed (and has no data-fb candidate left) is replaced by tinted initials,
     unless the caller already removed it (its slot then shows its own initials) */
  var fail = function (im) {
    if (!im || !im.isConnected) return;
    if (im.hasAttribute("data-fb") && im.getAttribute("data-fb") !== "[]") return;
    var lg = im.parentNode && im.parentNode.classList && im.parentNode.classList.contains("x-logo") ? im.parentNode : null;
    var name = lg ? lg.getAttribute("title") || "" : im.getAttribute("data-x25n") || im.getAttribute("alt") || "";
    var sp = doc.createElement("span");
    sp.className = "x25-ini"; sp.setAttribute("aria-hidden", "true");
    sp.setAttribute("style", tintOf(lg ? lg.getAttribute("data-slug") || name : name));
    sp.textContent = initialsOf(name.replace(/ logo$/, ""));
    if (lg) { lg.classList.remove("x25-lg-wide", "x25-lg-crop"); lg.setAttribute("role", "img"); lg.setAttribute("aria-label", name); }
    im.replaceWith(sp);
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
    forName: forName, tile: tile, photo: photo, bySlug: bySlug, face: face, img: img, fail: fail, initials: initialsOf, tint: tintOf,
    meta: { aspect: ASPECT, mark: MARK, dark: DARK, missing: MISSING },
    list: function () { return LIST.map(function (s) { return bySlug(s.slug); }).filter(Boolean); },
    names: function () { return Object.keys(ORGS); },
    slugOf: function (name) { var o = forName(name); return o ? o.slug : null; }
  };
})();
