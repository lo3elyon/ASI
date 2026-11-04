/* design10.js: Batch 10. Tags each section with a stable key (data-d10), hue (--d10h) and quote variant (data-d10q),
   and puts that section's icon tile on section headings, stat cards, tabs and board headers. Decorative only:
   every tile is aria-hidden, nothing animates, and the same section always gets the same icon and marks. */
(function () {
  "use strict";
  var doc = document;
  var KEYS = {
    history: { ico: "⏳", h: 38 },
    predictions: { ico: "🧭", h: 173 },
    media: { ico: "🎬", h: 0 },
    people: { ico: "👥", h: 217 },
    ask: { ico: "💬", h: 189 },
    learn: { ico: "🎓", h: 142 },
    sources: { ico: "📚", h: 199 },
    policy: { ico: "⚖️", h: 84 },
    safety: { ico: "🛡️", h: 25 },
    ideas: { ico: "💡", h: 48 }
  };
  var ORDER = Object.keys(KEYS);
  var BY_ID = { history: "history", archive: "sources", people: "people", media: "media", learn: "learn", tracker: "predictions", portraits: "people" };
  var SAFETY = { control: 1, alignment: 1, "ai-risk": 1, interpretability: 1 };
  var POLICY = { policy: 1, ethics: 1 };
  var pageKey = function () {
    var m = /^#\/([a-z]+)(?:\/([^?#/]*))?/.exec(location.hash || "");
    if (!m) return "ideas";
    var n = m[1], a = m[2] || "";
    if (n === "topic") return POLICY[a] ? "policy" : SAFETY[a] ? "safety" : "ideas";
    return { era: "history", timeline: "history", compare: "people", org: "people", person: "people", stats: "predictions", ask: "ask", about: "sources", quotes: "ideas", topics: "ideas", watch: "media" }[n] || "ideas";
  };
  var tag = function (el, key) {
    if (!el || !KEYS[key]) return;
    if (el.getAttribute("data-d10") === key) return;
    el.setAttribute("data-d10", key);
    el.setAttribute("data-d10q", String(ORDER.indexOf(key) % 3));
    el.style.setProperty("--d10h", String(KEYS[key].h));
  };
  var keyOf = function (el) { var s = el.closest("[data-d10]"); return s ? s.getAttribute("data-d10") : null; };
  var tile = function (el, key, cls) {
    if (!key) return;
    var t = el.querySelector(":scope > .x-d10i");
    if (t && t.getAttribute("data-k") === key) return;
    if (!t) { t = doc.createElement("span"); t.className = "x-d10i " + cls; t.setAttribute("aria-hidden", "true"); el.insertBefore(t, el.firstChild); }
    t.setAttribute("data-k", key);
    t.style.setProperty("--d10h", String(KEYS[key].h));
    t.textContent = KEYS[key].ico;
    el.classList.add(cls + "-host");
  };
  var STAT = { "#people": "people", "#media": "media", "#history": "history", "#archive": "sources", "#tracker": "predictions", "#learn": "learn" };
  var run = function () {
    Object.keys(BY_ID).forEach(function (id) { tag(doc.getElementById(id), BY_ID[id]); });
    tag(doc.getElementById("person-view"), "people");
    var host = doc.getElementById("x-pages");
    if (host) tag(host, pageKey());
    doc.querySelectorAll(".head").forEach(function (h) { if (h.querySelector("h1, h2")) tile(h, keyOf(h) || "ideas", "x-d10i--head"); });
    doc.querySelectorAll(".stats .stat").forEach(function (s) {
      var k = STAT[s.getAttribute("href") || ""] || keyOf(s) || "predictions";
      tile(s, k, "x-d10i--stat");
    });
    /* section tabs only: the player's narrow side-rail tabs (.x-wh__tab) keep their own small icons */
    doc.querySelectorAll('[role="tab"]:not(.nav *):not(.x-wh__tab):not(.x-ap *)').forEach(function (t) { tile(t, keyOf(t) || "ideas", "x-d10i--tab"); });
    doc.querySelectorAll(".x-pn-h, .x-cw__h").forEach(function (b) { tile(b, keyOf(b) || "media", "x-d10i--board"); });
  };
  var queued = false;
  var schedule = function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; mo.disconnect(); try { run(); } finally { watch(); } }); };
  var mo = new MutationObserver(schedule);
  var watch = function () { mo.observe(doc.body, { childList: true, subtree: true }); };
  var boot = function () { run(); watch(); window.addEventListener("hashchange", schedule); };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})();
