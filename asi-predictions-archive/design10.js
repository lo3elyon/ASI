/* design10.js: Batch 10. Tags each section with a stable key (data-d10), quote hue (--d10h) and quote variant (data-d10q),
   and puts exactly ONE icon tile per section or page: on the top h2 of each home section.section[id], on each #/ page's
   hero title (or its first heading), and on the person page's name (id-card). Every icon is an inline SVG line icon from
   the ICONS map, every icon and gradient is unique, and tile hues are only red, orange, amber, yellow, green, teal, cyan,
   sky or blue. Decorative only: tiles are aria-hidden and nothing animates. */
(function () {
  "use strict";
  var doc = document;
  /* quote hues and variants per section: unchanged, so the current quote colours stay exactly as they were */
  var KEYS = {
    history: { h: 38 }, predictions: { h: 173 }, media: { h: 0 }, people: { h: 217 }, ask: { h: 189 },
    learn: { h: 142 }, sources: { h: 199 }, policy: { h: 84 }, safety: { h: 25 }, ideas: { h: 48 }
  };
  var ORDER = Object.keys(KEYS);
  var BY_ID = { history: "history", archive: "sources", people: "people", media: "media", learn: "learn", tracker: "predictions", portraits: "people" };
  var SAFETY = { control: 1, alignment: 1, "ai-risk": 1, interpretability: 1 };
  var POLICY = { policy: 1, ethics: 1 };
  var route = function () {
    var m = /^#\/([a-z]+)(?:\/([^?#/]*))?/.exec(location.hash || "");
    return m ? { n: m[1], a: m[2] || "" } : null;
  };
  var pageKey = function () {
    var r = route();
    if (!r) return "ideas";
    if (r.n === "topic") return POLICY[r.a] ? "policy" : SAFETY[r.a] ? "safety" : "ideas";
    return { era: "history", timeline: "history", compare: "people", org: "people", person: "people", stats: "predictions", ask: "ask", about: "sources", quotes: "ideas", topics: "ideas", watch: "media" }[r.n] || "ideas";
  };
  var tag = function (el, key) {
    if (!el || !KEYS[key]) return;
    if (el.getAttribute("data-d10") === key) return;
    el.setAttribute("data-d10", key);
    el.setAttribute("data-d10q", String(ORDER.indexOf(key) % 3));
    el.style.setProperty("--d10h", String(KEYS[key].h));
  };

  /* tiles: one unique SVG line icon (Lucide style) and one unique gradient per section or page.
     Hues only: red, orange, amber, yellow, green, teal, cyan, sky, blue. Each [icon, from-hue, to-hue] pair is used once. */
  var ICONS = {
    hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    clapperboard: '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    graduationCap: '<path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
    map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
    layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    clockBack: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    puzzle: '<path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/>',
    scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
    columns: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
    barChart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    messageCircle: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    bookOpen: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    idCard: '<rect width="20" height="16" x="2" y="4" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 17c.5-1.5 1.7-2.2 3-2.2s2.5.7 3 2.2"/><path d="M14 9h4"/><path d="M14 13h4"/>',
    telescope: '<path d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44"/><path d="m13.56 11.747 4.332-.924"/><path d="m16 21-3.105-6.21"/><path d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z"/><path d="m6.158 8.633 1.114 4.456"/><path d="m8 21 3.105-6.21"/><circle cx="12" cy="13" r="2"/>'
  };
  var R = 2, O = 24, A = 38, Y = 50, G = 142, T = 173, C = 189, S = 199, B = 217;
  var SEC = {
    history: ["hourglass", A, O], archive: ["library", O, R], people: ["users", S, B], media: ["clapperboard", R, O],
    learn: ["graduationCap", G, T], tracker: ["target", T, C], portraits: ["image", B, S]
  };
  var SPARE = [["sparkles", Y, A], ["map", G, Y], ["layers", C, S], ["bookmark", R, A]];
  var PAGE = {
    era: ["clockBack", O, A], timeline: ["calendar", A, Y], topics: ["puzzle", T, G], policy: ["scale", B, C], safety: ["shield", G, C],
    topic: ["lightbulb", Y, O], quotes: ["quote", R, Y], compare: ["columns", S, C], stats: ["barChart", C, B], ask: ["messageCircle", C, T],
    about: ["bookOpen", O, Y], org: ["building", T, S], watch: ["mic", A, R], person: ["idCard", S, G], other: ["telescope", B, T]
  };
  var pageIcon = function () {
    var r = route();
    if (!r) return PAGE.other;
    if (r.n === "topic") return POLICY[r.a] ? PAGE.policy : SAFETY[r.a] ? PAGE.safety : PAGE.topic;
    return PAGE[r.n] || PAGE.other;
  };
  var makeTile = function (ico) {
    var t = doc.createElement("span");
    t.className = "x-d10i x-d10i--head";
    t.setAttribute("aria-hidden", "true");
    t.setAttribute("data-k", ico[0]);
    t.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[ico[0]] || "") + "</svg>";
    t.style.setProperty("--d10h", String(ico[1]));
    t.style.setProperty("--d10h2", String(ico[2]));
    return t;
  };
  /* put a tile above heading h (before its eyebrow when there is one); returns the tile */
  var place = function (h, ico) {
    var head = h.parentElement && h.parentElement.classList.contains("head") ? h.parentElement : null;
    var box = head || h.parentElement;
    if (!box) return null;
    var t = box.querySelector(":scope > .x-d10i");
    if (t && t.getAttribute("data-k") === ico[0]) return t;
    if (t) t.remove();
    t = makeTile(ico);
    var ref = head ? head.firstChild : h;
    if (!head) { var prev = h.previousElementSibling; if (prev && /eyebrow/.test(prev.className)) ref = prev; }
    box.insertBefore(t, ref);
    box.classList.add("x-d10i--host");
    return t;
  };
  var visible = function (el) { return el && !el.hidden && !el.closest("[hidden]"); };
  var run = function () {
    Object.keys(BY_ID).forEach(function (id) { tag(doc.getElementById(id), BY_ID[id]); });
    tag(doc.getElementById("person-view"), "people");
    var pages = doc.getElementById("x-pages");
    if (pages) tag(pages, pageKey());

    var keep = [], spare = 0;
    doc.querySelectorAll("section.section[id]").forEach(function (s) {
      if (s.closest("#x-pages, #person-view")) return;
      var h = s.querySelector(".head h2");
      if (!h) return;
      var ico = SEC[s.id] || SPARE[spare++ % SPARE.length];
      var t = place(h, ico); if (t) keep.push(t);
    });
    if (pages && visible(pages)) {
      var ph = pages.querySelector(".hero h1") || pages.querySelector("h1") || pages.querySelector(".head h2");
      if (ph) { var pt = place(ph, pageIcon()); if (pt) keep.push(pt); }
    }
    var pv = doc.getElementById("person-view");
    if (pv && visible(pv)) {
      var nh = pv.querySelector(".x-pv__head h1"), wh = pv.querySelector(".x-wv__title");
      if (nh) { var nt = place(nh, PAGE.person); if (nt) keep.push(nt); }
      else if (wh) { var wt = place(wh, PAGE.watch); if (wt) keep.push(wt); }
    }
    /* drop every other tile, wherever an older batch left one */
    doc.querySelectorAll(".x-d10i").forEach(function (t) { if (keep.indexOf(t) < 0) t.remove(); });
  };
  var queued = false;
  var schedule = function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; mo.disconnect(); try { run(); } finally { watch(); } }); };
  var mo = new MutationObserver(schedule);
  var watch = function () { mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] }); };
  var boot = function () { run(); watch(); window.addEventListener("hashchange", schedule); };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})();
