/* icons32.js: the "icons, never emoji or text symbols" rule. Any ✓ ✕ ✎ ⚙ 🔊 that the site writes into visible text is
   swapped for a small inline SVG icon of the same meaning, wherever and whenever it appears. Labels and aria text keep
   their words; the icon itself is aria-hidden. */
(function () {
  "use strict";
  var P = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  var SVG = {
    "\u2713": '<svg ' + P + '><path d="M4 12.5l5 5L20 6.5"/></svg>',
    "\u2715": '<svg ' + P + '><path d="M6 6l12 12M18 6L6 18"/></svg>',
    "\u270E": '<svg ' + P + '><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    "\u2699": '<svg ' + P + '><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
    "\uD83D\uDD0A": '<svg ' + P + '><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/></svg>'
  };
  var RE = /\u2713|\u2715|\u270E|\u2699\uFE0F?|\uD83D\uDD0A/g;
  var TEST = /\u2713|\u2715|\u270E|\u2699|\uD83D\uDD0A/;
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|TITLE|CODE|PRE|svg)$/i;
  var fix = function (tn) {
    var p = tn.parentNode;
    if (!p || SKIP.test(p.nodeName) || p.isContentEditable || (p.closest && p.closest("#dbg29, svg"))) return;
    var s = tn.nodeValue; if (!TEST.test(s)) return;
    var frag = document.createDocumentFragment(), last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(s))) {
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      var sp = document.createElement("span");
      sp.className = "x-i32"; sp.setAttribute("aria-hidden", "true");
      sp.innerHTML = SVG[m[0].charAt(0) === "\u2699" ? "\u2699" : m[0]];
      frag.appendChild(sp); last = m.index + m[0].length;
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(frag, tn);
  };
  var scan = function (root) {
    if (!root) return;
    if (root.nodeType === 3) { fix(root); return; }
    if (root.nodeType !== 1 || SKIP.test(root.nodeName) || !TEST.test(root.textContent || "")) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) if (TEST.test(n.nodeValue)) list.push(n);
    list.forEach(fix);
  };
  /* small logo chips crop wide wordmarks to their left edge; OpenAI's 2025 wordmark has no symbol there and read as "O|",
     so small OpenAI chips use the OpenAI symbol instead (public domain, Wikimedia Commons "OpenAI logo 2025 (symbol).svg") */
  var marks = function (root) {
    if (!root || root.nodeType !== 1) return;
    var SEL = ".x25-lg-crop, .x-kw";
    var list = root.matches && root.matches(SEL) ? [root] : root.querySelectorAll ? root.querySelectorAll(SEL) : [];
    [].forEach.call(list, function (lg) { var im = lg.querySelector('img[src*="logo-openai.svg"]'); if (im) { im.src = im.getAttribute("src").replace("logo-openai.svg", "logo-openai-mark.svg"); lg.classList.add("x32-oa"); } });
  };
  var start = function () {
    scan(document.body); marks(document.body);
    if (!("MutationObserver" in window)) return;
    new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.type === "attributes") { if (r.target.classList && r.target.classList.contains("x25-lg-crop") && !r.target.classList.contains("x32-oa")) marks(r.target); continue; }
        if (r.type === "characterData") { if (TEST.test(r.target.nodeValue || "")) fix(r.target); continue; }
        for (var j = 0; j < r.addedNodes.length; j++) { scan(r.addedNodes[j]); marks(r.addedNodes[j]); }
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
