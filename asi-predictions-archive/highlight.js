/* highlight.js: one keyword highlighter for the whole site.
   People (people.json) become chips linking to #/person/<id>, organisations get a mini logo and link to #/org/<slug>,
   topic terms take their topic colour and link to #/topic/<slug>, and years take an accent. It runs on summaries,
   quotes, history text and Ask answers, the moment they are drawn (a MutationObserver callback runs before paint,
   so nothing visibly shifts), and never inside links, buttons, headings or form fields.
   Customize › "Highlight keywords" (on by default) turns the colours off without redrawing anything. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var KEY = "asiArchive.kw.v1";
  var on = true; try { on = localStorage.getItem(KEY) !== "off"; } catch (e) {}
  root.classList.toggle("x-kw-off", !on);
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var reEsc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };

  /* topic terms → [topic slug, colour 1–7] */
  var TOPIC = [
    ["superintelligence|superintelligent|artificial superintelligence|ASI|ultraintelligent machine", "superintelligence", 1],
    ["AGI|artificial general intelligence", "superintelligence", 1],
    ["alignment|aligned AI|misalignment|misaligned", "alignment", 2],
    ["control problem|loss of control|lose control|losing control|corrigibility|off-switch", "control", 3],
    ["existential risk|x-risk|extinction|p\\(doom\\)", "ai-risk", 4],
    ["interpretability|mechanistic interpretability", "interpretability", 5],
    ["governance|regulation|AI Act", "policy", 6],
    ["compute|scaling laws|scaling", "scaling", 7],
    ["intelligence explosion|singularity|recursive self-improvement|self-improving", "intelligence-explosion", 4],
    ["deep learning|neural networks?|backpropagation", "deep-learning", 5],
    ["transformers?|large language models?|LLMs?", "transformers", 6]
  ];
  var TERM = {};
  var parts = [];
  TOPIC.forEach(function (t) { t[0].split("|").forEach(function (w) { parts.push({ src: w, kind: "t", slug: t[1], c: t[2] }); }); });

  var PPL = {}, ORG = {};
  var people = []; try { people = Hark.data("d-people") || []; } catch (e) {}
  people.forEach(function (p) {
    var n = String(p.name || "").replace(/\s*\([^)]*\)/g, "").trim();
    if (n.split(/\s+/).length < 2 || n.length < 6) return;
    if (!PPL[n.toLowerCase()]) { PPL[n.toLowerCase()] = { id: p.id, name: n }; parts.push({ src: reEsc(n), kind: "p" }); }
  });
  if (window.XLogo) {
    var seen = {};
    XLogo.names().concat(XLogo.list().map(function (o) { return o.name; })).forEach(function (k) {
      var n = String(k).replace(/\s*\([^)]*\)/g, "").trim();
      if (n.length < 3 || /[\/&]| and |Formerly|signator|countries|^Sen\./i.test(n) || seen[n.toLowerCase()]) return;
      var o = XLogo.forName(k); if (!o) return;
      seen[n.toLowerCase()] = 1;
      ORG[n.toLowerCase()] = { name: n, o: o };
      parts.push({ src: reEsc(n), kind: "o" });
    });
  }
  /* longest first, so "Google DeepMind" wins over "Google" and "deep learning" over shorter terms */
  parts.sort(function (a, b) { return b.src.length - a.src.length; });
  var TLIST = [];
  parts.forEach(function (p) { if (p.kind === "t") { TERM[p.src.replace(/\\/g, "").toLowerCase()] = p; p.re = new RegExp("^(?:" + p.src + ")$", "i"); TLIST.push(p); } });
  var YEAR = "(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.? )?(?:1[6-9]\\d\\d|20\\d\\d)s?";
  var RE = new RegExp("(^|[^\\w-])(" + parts.map(function (p) { return p.src; }).join("|") + "|" + YEAR + ")(?![\\w-])", "gi");
  var MONTH_YEAR = new RegExp("^" + YEAR + "$", "i");

  /* on phones and touch screens an inline word is too small to tap reliably, so chips there are coloured text only;
     the person, organisation and topic pages stay reachable from their full-size buttons and links */
  var LINK = !(window.matchMedia && matchMedia("(max-width: 699px), (pointer: coarse)").matches);
  var tag = function (cls, href, inner, extra) {
    return LINK ? '<a class="' + cls + '" href="' + href + '"' + (extra || "") + ">" + inner + "</a>" : '<span class="' + cls + '"' + (extra || "") + ">" + inner + "</span>";
  };
  var chip = function (m) {
    var l = m.toLowerCase();
    var p = PPL[l];
    if (p && p.name === m) return tag("x-kw x-kw--p", "#/person/" + esc(p.id), esc(m));
    var o = ORG[l];
    if (o && o.name === m) return tag("x-kw x-kw--o", "#/org/" + esc(o.o.slug), '<img src="' + esc(o.o.src) + '" alt="" width="14" height="14" loading="lazy" decoding="async" />' + esc(m));
    var t = TERM[l] || TERM[l.replace(/s$/, "")] || (MONTH_YEAR.test(m) ? null : (function () { for (var i = 0; i < TLIST.length; i++) if (TLIST[i].re.test(m)) return TLIST[i]; return null; })());
    if (t) {
      /* short all-caps terms only count in capitals ("ASI", "AGI", "LLM"), never as parts of ordinary words */
      if (/^[A-Z]{2,4}s?$/.test(t.src.replace(/\?|\\/g, "")) && m !== m.toUpperCase() && !/s$/.test(m)) return null;
      if (t.src === "ASI" && m !== "ASI") return null;
      return tag("x-kw x-kw--t", "#/topic/" + esc(t.slug), esc(m), ' data-c="' + t.c + '"');
    }
    if (MONTH_YEAR.test(m)) return '<span class="x-kw x-kw--y">' + esc(m) + "</span>";
    return null;
  };
  /* plain text → highlighted, escaped HTML */
  var html = function (text) {
    var s = String(text == null ? "" : text), out = "", last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(s))) {
      var start = m.index + m[1].length, word = m[2], c = chip(word);
      if (c) { out += esc(s.slice(last, start)) + c; last = start + word.length; }
      if (RE.lastIndex === m.index) RE.lastIndex++;
    }
    return out + esc(s.slice(last));
  };

  var SKIP = "a,button,label,select,textarea,input,option,h1,h2,h3,h4,code,kbd,script,style,.x-kw,[contenteditable],.x-nokw";
  var TARGETS = ".x-sum,.x-quote,.x-predbox,.x-hi__card > p:not(.x-hi__foot):not(.x-hi__people),.x-hi__why,.x-hi__quote blockquote,.x-pv__lead,.x-pv__body .prose p,.x-pg__sum,.x-pg__q blockquote,.x-kw-scope";
  var apply = function (el) {
    if (!el || el.__xkw) return;
    if (el.closest && el.closest("a,button")) { el.__xkw = 1; return; }
    el.__xkw = 1;
    var walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue || n.nodeValue.length < 3) continue;
      var pe = n.parentNode;
      if (pe && pe.closest && pe.closest(SKIP) && el.contains(pe.closest(SKIP))) continue;
      nodes.push(n);
    }
    nodes.forEach(function (t) {
      var h = html(t.nodeValue);
      if (h === esc(t.nodeValue)) return;
      var span = doc.createElement("span");
      span.innerHTML = h;
      var frag = doc.createDocumentFragment();
      while (span.firstChild) frag.appendChild(span.firstChild);
      t.parentNode.replaceChild(frag, t);
    });
  };
  var scan = function (rootEl) {
    var r = rootEl || doc;
    if (r.nodeType !== 1 && r !== doc) return;
    if (r.matches && r.matches(TARGETS)) apply(r);
    if (r.querySelectorAll) r.querySelectorAll(TARGETS).forEach(apply);
  };
  var boot = function () {
    scan(doc);
    if (!("MutationObserver" in window)) return;
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var add = list[i].addedNodes;
        for (var j = 0; j < add.length; j++) if (add[j].nodeType === 1 && !(add[j].classList && add[j].classList.contains("x-kw"))) scan(add[j]);
      }
    }).observe(doc.body, { childList: true, subtree: true });
  };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();

  /* query matches, for search results: wraps every term of q in <mark> inside already-escaped HTML */
  var mark = function (h, q) {
    var terms = String(q || "").toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; });
    if (!terms.length) return h;
    var re = new RegExp("(" + terms.map(function (t) { return reEsc(esc(t)); }).join("|") + ")", "gi");
    return String(h).replace(/(<[^>]*>)|([^<]+)/g, function (m0, tag, txt) { return tag || txt.replace(re, "<mark>$1</mark>"); });
  };

  window.XHL = {
    html: html, apply: apply, scan: scan, mark: mark,
    isOn: function () { return on; },
    setOn: function (v) { on = !!v; root.classList.toggle("x-kw-off", !on); try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {} }
  };
})();
