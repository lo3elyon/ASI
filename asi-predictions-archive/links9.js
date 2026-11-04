/* links9.js: Batch 9 hook. Gives every name, org and key-term highlight a stable hue (data-h9, 0–9, from its slug)
   for links9.css, and makes highlights that are not links (touch-screen spans, years) go somewhere:
   a person to #/person/<id>, an org to #/org/<slug>, a topic to #/topic/<slug>, a year or term to the search palette. */
(function () {
  "use strict";
  var doc = document;
  var SKIP = ".x-pn-cap, .x-pn-prev, .x6-nohl, .nav, .foot, .x-cp";
  var hash = function (s) { var h = 0; s = String(s || "?"); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 10; };
  var slugify = function (s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
  var NAME = null;
  var names = function () {
    if (NAME) return NAME;
    NAME = {};
    var list = []; try { list = (window.Hark && Hark.data && Hark.data("d-people")) || []; } catch (e) {}
    list.forEach(function (p) {
      var full = String(p.name || "").trim(), n = full.replace(/\s*\([^)]*\)/g, "").trim();
      if (n) NAME[n.toLowerCase()] = p.id;
      if (full) NAME[full.toLowerCase()] = p.id;
    });
    return NAME;
  };
  var route = function (el) {
    var href = el.getAttribute("href") || "";
    var m = /^#\/(person|org|topic)\/([^/?#]+)/.exec(href);
    if (m) return { k: m[1], s: decodeURIComponent(m[2]) };
    var txt = (el.textContent || "").trim(), cl = el.classList;
    if (cl.contains("x-kw--p") || cl.contains("x-kw--person")) { var id = names()[txt.toLowerCase()]; return id ? { k: "person", s: id } : null; }
    if (cl.contains("x-kw--o") || cl.contains("x-kw--org")) {
      var o = null; try { o = window.XLogo && XLogo.forName(txt); } catch (e) {}
      return o && o.slug ? { k: "org", s: o.slug } : { k: "q", s: txt };
    }
    if (el.dataset.tc) return { k: "topic", s: el.dataset.tc };
    if (txt) return { k: "q", s: txt };
    return null;
  };
  var mark = function (el) {
    if (el.dataset.h9 != null || el.closest(SKIP)) return;
    var r = route(el), isA = el.tagName === "A";
    if (!r && !isA) return;
    el.dataset.h9 = String(hash(r ? (r.k === "q" ? slugify(r.s) : r.s) : slugify(el.textContent)));
    if (!isA && r) {
      el.dataset.go9 = r.k === "q" ? "q:" + r.s : r.k + ":" + r.s;
      el.setAttribute("role", "link");
      el.tabIndex = 0;
      el.title = r.k === "q" ? "Search the archive for " + r.s : "Open " + (el.textContent || "").trim();
    }
  };
  var scan = function (r) {
    if (!r || !r.querySelectorAll) return;
    var sel = '.x-kw, a[href^="#/person/"]';
    if (r.matches && r.matches(sel)) mark(r);
    r.querySelectorAll(sel).forEach(mark);
  };
  var search = function (q) {
    var inp = doc.getElementById("cpQ"), dlg = inp && inp.closest("dialog");
    if (!dlg || !dlg.open) window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, metaKey: /Mac|iPhone|iPad/.test(navigator.platform || ""), bubbles: true }));
    inp = doc.getElementById("cpQ");
    if (!inp) { location.hash = "#/ask"; return; }
    inp.value = q;
    inp.dispatchEvent(new Event("input", { bubbles: true }));
  };
  var go = function (el) {
    var v = el.dataset.go9 || "", i = v.indexOf(":"), k = v.slice(0, i), s = v.slice(i + 1);
    if (!k) return;
    if (k === "q") search(s); else location.hash = "#/" + k + "/" + encodeURIComponent(s);
  };
  doc.addEventListener("click", function (ev) {
    var el = ev.target.closest && ev.target.closest("[data-go9]");
    if (!el || doc.documentElement.classList.contains("x-kw-off")) return;
    ev.preventDefault(); go(el);
  });
  doc.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var el = ev.target.closest && ev.target.closest("[data-go9]");
    if (!el) return;
    ev.preventDefault(); go(el);
  });
  var boot = function () {
    scan(doc.body);
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) { var add = list[i].addedNodes; for (var j = 0; j < add.length; j++) if (add[j].nodeType === 1) scan(add[j]); }
    }).observe(doc.body, { childList: true, subtree: true });
  };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})();
