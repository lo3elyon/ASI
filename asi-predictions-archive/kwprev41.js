/* kwprev41.js (owner 2026-11-06): a preview card for every organisation, topic and person chip, before you leave.
   Click a chip (in paragraphs, quotes, cards) and a card opens beside it: logo or photo, what it is, highlights from the
   archive (people, talks, entries, predictions), a few faces, and one button to open the full page. Clicking the same
   chip again, or the button, goes there. X, Esc, a click outside or scrolling far closes it. Ctrl/⌘/Shift-click
   still goes straight to the page. localStorage kwprev41=off turns the cards off. Add-only. */
(function () {
  "use strict";
  var doc = document;
  try { if (localStorage.getItem("kwprev41") === "off") return; } catch (e) {}
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var cut = function (s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "\u2026" : s; };
  var read = function (id) {
    try { if (window.Hark && Hark.data) { var v = Hark.data(id); if (v) return v; } } catch (e) {}
    try { var el = doc.getElementById(id), t = el && el.textContent.trim(); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  };
  var TOPICS = [
    { slug: "superintelligence", name: "Superintelligence", ico: "hero", re: /superintelligen|\basi\b|ultraintelligen/i, tags: [], al: [] },
    { slug: "control", name: "The control problem", ico: "compass", re: /control problem|stay in control|lose control|losing control|shut ?down|switch(ed)? (it )?off|off.?switch|corrigib|takeover|take over|disempower/i, tags: ["control"], al: ["control-problem"] },
    { slug: "alignment", name: "Alignment", ico: "target", re: /align/i, tags: ["alignment"], al: [] },
    { slug: "ai-risk", name: "AI risk & extinction", ico: "warning", re: /extinct|existential|catastroph|\bdoom|p\(doom\)|risk of|statement on/i, tags: ["risk-statement"], al: ["risk-statement", "risk", "safety"] },
    { slug: "intelligence-explosion", name: "Intelligence explosion", ico: "rocket", re: /intelligence explosion|recursive(ly)? self|self-improv|singularity|ultraintelligent/i, tags: ["intelligence-explosion"], al: ["singularity"] },
    { slug: "forecasting", name: "Forecasts & timelines", ico: "calendar", re: /forecast|timeline|predict|\bby 20\d\d|within (a|the|\d+|ten|five|two|three) (few )?(years|decades)|surveyed|agi (by|in|within)/i, tags: ["forecasting"], al: ["forecasts", "agi-timelines", "timelines"] },
    { slug: "policy", name: "Policy & governance", ico: "columns", re: /regulat|policy|governance|legislat|senate|congress|hearing|treaty|summit|executive order|\bai act\b|\blaw\b/i, tags: ["policy"], al: ["policy-governance", "governance"] },
    { slug: "labs", name: "AI labs", ico: "building", re: /openai|deepmind|anthropic|\bxai\b|meta ai|\blabs?\b/i, tags: ["lab"], al: ["lab"] },
    { slug: "neuroscience", name: "Neuroscience & the brain", ico: "brain", re: /neuro|\bbrain|cortex|conscious|hippocamp/i, tags: ["neuroscience"], al: ["mind-brain", "neuro", "brain"] },
    { slug: "deep-learning", name: "Deep learning", ico: "network", re: /deep learning|neural net|backprop|alexnet|imagenet/i, tags: ["deep-learning"], al: [] },
    { slug: "transformers", name: "Transformers & LLMs", ico: "llm", re: /transformer|attention is all|\bgpt|large language model|\bllms?\b|chatgpt/i, tags: ["transformers"], al: ["llms", "llm"] },
    { slug: "scaling", name: "Scaling & compute", ico: "growth", re: /scaling|scale up|\bcompute\b|\bgpus?\b|training run/i, tags: [], al: [] },
    { slug: "interpretability", name: "Interpretability", ico: "flashlight", re: /interpretab|mechanistic|circuits?\b/i, tags: [], al: [] },
    { slug: "ai-agents", name: "AI agents", ico: "agent", re: /\bagents?\b|agentic/i, tags: [], al: ["agents"] },
    { slug: "ethics", name: "Ethics", ico: "scales", re: /\bethic|fairness|\bbias|rights\b/i, tags: [], al: [] },
    { slug: "robotics", name: "Robotics", ico: "arm", re: /robot/i, tags: [], al: [] },
    { slug: "fiction", name: "Fiction & culture", ico: "book", re: /fiction|novel|erewhon|\bfilm\b|short story|science.fiction/i, tags: ["fiction"], al: ["culture"] },
    { slug: "skeptics", name: "Skeptics", ico: "skeptic", re: /skeptic|sceptic|hype|overblown|overpopulation on mars|decades away|far from/i, tags: [], al: ["skeptic"] }
  ];
  var TBY = {}; TOPICS.forEach(function (t) { TBY[t.slug] = t; (t.al || []).forEach(function (a) { TBY[a] = t; }); });
  var ABOUT = {
    "superintelligence": "AI that would far exceed the best human minds in almost every field, and what thinkers expected it to mean.",
    "control": "Whether people could keep control of systems smarter than themselves: switching them off, correcting them, avoiding takeover.",
    "alignment": "Making AI systems pursue the goals and values their makers intend, rather than something subtly different.",
    "ai-risk": "Warnings that advanced AI could cause catastrophe or human extinction, and the debate over how likely that is.",
    "intelligence-explosion": "The idea that an AI able to improve itself could set off a runaway rise in intelligence, the 'singularity'.",
    "forecasting": "Predictions of when AGI or superintelligence arrives, from surveys, researchers and lab leaders.",
    "policy": "Laws, hearings, treaties, summits and rules proposed to govern powerful AI.",
    "labs": "The companies building frontier AI, such as OpenAI, Google DeepMind, Anthropic, Meta and xAI.",
    "neuroscience": "What the brain teaches about intelligence and consciousness, and how it compares with machines.",
    "deep-learning": "Neural networks trained on large data, the approach behind the AI boom since 2012.",
    "transformers": "The transformer architecture and the large language models built on it, from GPT to ChatGPT.",
    "scaling": "The bet that more compute, data and bigger models keep making AI more capable.",
    "interpretability": "Looking inside models to understand how they work, down to individual circuits.",
    "ai-agents": "AI systems that plan and act on their own toward goals, not just answer questions.",
    "ethics": "Fairness, bias, rights and the moral questions AI raises.",
    "robotics": "Machines that act in the physical world, and how far they lag behind software AI.",
    "fiction": "How novels, films and stories shaped ideas about thinking machines.",
    "skeptics": "Voices who think superintelligence fears are overblown, far off, or hype."
  };
  var PEOPLE = read("d-people") || [], VIDS = read("d-videos") || [], ENTS = read("d-entries") || [], PREDS = read("d-preds") || [];
  if (!PEOPLE.length && !VIDS.length) { /* data not inline yet (local build): try again after load */ }
  var PBY = {}; PEOPLE.forEach(function (p) { PBY[p.id] = p; });
  var slugOf = function (n) { try { return window.XLogo && XLogo.slugOf ? XLogo.slugOf(n) : null; } catch (e) { return null; } };
  var entHay = function (e) { return [e.title, e.summary, e.quote, e.prediction, e.person, e.role].join(" "); };
  var cache = {};

  var face = function (p, size) {
    try { if (window.XPeopleAvatar) return window.XPeopleAvatar(p, ""); } catch (e) {}
    var ini = String(p.name || "?").split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join("");
    return '<span class="k41-ini" style="width:' + size + "px;height:" + size + 'px">' + esc(ini) + "</span>";
  };
  var faces = function (ps) {
    if (!ps.length) return "";
    return '<div class="k41-faces">' + ps.slice(0, 7).map(function (p) { return '<a class="k41-face" href="#/person/' + esc(p.id) + '" title="' + esc(p.name) + '">' + face(p, 30) + "</a>"; }).join("") + (ps.length > 7 ? '<span class="k41-more">+' + (ps.length - 7) + "</span>" : "") + "</div>";
  };
  var stat = function (n, l, c) { return n ? '<span class="k41-st" style="--c:' + c + '"><b>' + n.toLocaleString() + "</b>" + l + "</span>" : ""; };
  var IC = {
    org: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V6l8-3 8 3v15"/><path d="M9 21v-5h6v5M8 9h1M15 9h1M8 12.5h1M15 12.5h1"/></svg>',
    topic: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor"/></svg>',
    person: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    go: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  var orgCard = function (slug) {
    var o = window.XLogo && XLogo.bySlug ? XLogo.bySlug(slug) : null; if (!o) return null;
    var names = (o.names || [o.name]).map(function (n) { return n.replace(/\s*\([^)]*\)/g, "").trim(); }).filter(function (n, i, a) { return n.length > 2 && a.indexOf(n) === i && !/ and |&|\//.test(n); });
    if (names.indexOf(o.name) < 0) names.unshift(o.name);
    var re = new RegExp("\\b(" + names.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")\\b", "i");
    var ppl = PEOPLE.filter(function (p) { return p.org && slugOf(p.org) === slug; }).sort(function (a, b) { return (b.n_videos || 0) - (a.n_videos || 0) || String(a.name).localeCompare(b.name); });
    var ids = {}; ppl.forEach(function (p) { ids[p.id] = 1; });
    var talks = VIDS.filter(function (v) { return (v.p || []).some(function (id) { return ids[id]; }) || re.test(v.t || ""); }).length;
    var ents = ENTS.filter(function (e) { return re.test(entHay(e)); }).length;
    var prs = PREDS.filter(function (p) { return re.test((p.who || "") + " " + (p.prediction || "")); }).length;
    var lede = ppl.length ? "Home to " + ppl.slice(0, 3).map(function (p) { return p.name; }).join(", ") + (ppl.length > 3 ? " and " + (ppl.length - 3) + " more in this archive." : " in this archive.") : "Named in the archive's entries and talks.";
    var sq = "logo-sq-" + slug + ".png";
    return { kind: "Organisation", ic: IC.org, href: "#/org/" + slug, go: "Open organisation page", title: o.name,
      media: '<span class="k41-logo">' + (XLogo.tile ? XLogo.tile(o, 44) : "") + "</span>", sq: sq,
      sub: o.domain ? o.domain : "", lede: lede,
      stats: stat(ppl.length, "people", "#14b8a6") + stat(talks, "talks", "#f59e0b") + stat(ents, "entries", "#3b82f6") + stat(prs, "predictions", "#22c55e"),
      extra: faces(ppl) };
  };
  var topicCard = function (slug, chip) {
    var t = TBY[slug]; if (!t) return null;
    var talks = VIDS.filter(function (v) { return t.re.test((v.t || "") + " " + (v.k || "")); });
    var ents = ENTS.filter(function (e) { return t.re.test(entHay(e)) || (e.tags || []).some(function (g) { return t.tags.indexOf(g) >= 0; }); });
    var prs = PREDS.filter(function (p) { return t.re.test((p.prediction || "") + " " + (p.category || "")); }).length;
    var pc = {}; talks.forEach(function (v) { (v.p || []).forEach(function (id) { pc[id] = (pc[id] || 0) + 1; }); }); ents.forEach(function (e) { (e.people_ids || []).forEach(function (id) { pc[id] = (pc[id] || 0) + 2; }); });
    var ppl = Object.keys(pc).filter(function (id) { return PBY[id]; }).sort(function (a, b) { return pc[b] - pc[a] || a.localeCompare(b); }).map(function (id) { return PBY[id]; });
    var q = ents.filter(function (e) { return e.quote; })[0];
    return { kind: "Topic", ic: IC.topic, href: "#/topic/" + t.slug, go: "Open topic page", title: t.name,
      media: '<span class="k41-tic">' + IC.topic.replace(/width="13" height="13"/, 'width="26" height="26"') + "</span>",
      sub: ppl.length ? "Most voices: " + ppl.slice(0, 2).map(function (p) { return p.name; }).join(", ") : "", lede: ABOUT[t.slug] || "",
      stats: stat(talks.length, "talks", "#f59e0b") + stat(ents.length, "entries", "#3b82f6") + stat(ppl.length, "people", "#14b8a6") + stat(prs, "predictions", "#22c55e"),
      extra: (q ? '<blockquote class="k41-q"><span class="k41-qm" aria-hidden="true">\u201C</span>' + esc(cut(q.quote, 150)) + "<cite>" + esc(q.person || "") + (q.year ? ", " + esc(q.year) : "") + "</cite></blockquote>" : "") + faces(ppl) };
  };
  var personCard = function (id) {
    var p = PBY[id]; if (!p) return null;
    var talks = VIDS.filter(function (v) { return (v.p || []).indexOf(id) >= 0; }).length;
    var ents = ENTS.filter(function (e) { return (e.people_ids || []).indexOf(id) >= 0; }).length;
    var nm = String(p.name).toLowerCase(), prs = PREDS.filter(function (r) { return String(r.who || "").toLowerCase().indexOf(nm) >= 0; }).length;
    var os = p.org ? slugOf(p.org) : null, lg = os && window.XLogo && XLogo.bySlug ? XLogo.bySlug(os) : null;
    var q = (p.quotes || [])[0];
    return { kind: "Person", ic: IC.person, href: "#/person/" + id, go: "Open full profile", title: p.name,
      media: '<span class="k41-ph">' + face(p, 52) + "</span>",
      sub: (lg && XLogo.tile ? XLogo.tile(lg, 16) + " " : "") + esc(cut(p.role || p.org || "", 90)), subHtml: true, lede: cut(p.bio || "", 190),
      stats: stat(talks, "talks", "#f59e0b") + stat(ents, "entries", "#3b82f6") + stat(prs, "predictions", "#22c55e"),
      extra: q && q.text ? '<blockquote class="k41-q"><span class="k41-qm" aria-hidden="true">\u201C</span>' + esc(cut(q.text, 140)) + "</blockquote>" : "" };
  };

  var card = null, owner = null;
  var close = function () { if (card) { card.classList.remove("is-on"); card.setAttribute("aria-hidden", "true"); } owner = null; };
  var build = function () {
    card = doc.createElement("div"); card.className = "k41"; card.setAttribute("role", "dialog"); card.setAttribute("aria-hidden", "true");
    doc.body.appendChild(card);
    card.addEventListener("click", function (e) {
      if (e.target.closest("[data-k41x]")) { e.preventDefault(); close(); return; }
      if (e.target.closest("a[href^='#/']")) setTimeout(close, 0);
    });
  };
  var place = function (a) {
    var r = a.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    if (vw < 600) { card.classList.add("is-sheet"); card.style.left = card.style.top = ""; return; }
    card.classList.remove("is-sheet");
    var w = Math.min(380, vw - 24), h = card.offsetHeight || 320;
    var left = Math.max(12, Math.min(r.left, vw - w - 12)), top = r.bottom + 10;
    if (top + h > vh - 12 && r.top - h - 10 > 12) top = r.top - h - 10;
    top = Math.max(12, Math.min(top, vh - h - 12));
    card.style.width = w + "px"; card.style.left = left + "px"; card.style.top = top + "px";
  };
  var show = function (a) {
    var href = a.getAttribute("href") || "", m = /^#\/(org|topic|person)\/([^/?#]+)/.exec(href); if (!m) return false;
    var id = decodeURIComponent(m[2]), k = m[1] + ":" + id;
    var d = cache[k] || (cache[k] = m[1] === "org" ? orgCard(id) : m[1] === "topic" ? topicCard(id, a) : personCard(id));
    if (!d) return false;
    if (!card) build();
    var acc = getComputedStyle(a).color || "#14b8a6";
    card.style.setProperty("--k41", acc);
    card.innerHTML = '<div class="k41__bar"></div><button type="button" class="k41__x" data-k41x aria-label="Close">' + IC.x + "</button>" +
      '<div class="k41__head">' + d.media + '<div class="k41__t"><span class="k41__kind">' + d.ic + esc(d.kind) + "</span><h3>" + esc(d.title) + "</h3>" + (d.sub ? "<p>" + (d.subHtml ? d.sub : esc(d.sub)) + "</p>" : "") + "</div></div>" +
      (d.lede ? '<p class="k41__lede">' + esc(d.lede) + "</p>" : "") + (d.stats ? '<div class="k41__stats">' + d.stats + "</div>" : "") + (d.extra || "") +
      '<a class="k41__go" href="' + esc(d.href) + '">' + esc(d.go) + IC.go + "</a>";
    card.setAttribute("aria-label", d.kind + ": " + d.title);
    card.classList.remove("is-on"); void card.offsetWidth;
    card.classList.add("is-on"); card.setAttribute("aria-hidden", "false");
    owner = a; sy = scrollY; place(a);
    return true;
  };
  var SEL = 'a.x-kw[href^="#/org/"], a.x-kw[href^="#/topic/"], a.x-kw[href^="#/person/"], a.x-org[href^="#/org/"]';
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(SEL);
    if (!a) { if (card && card.classList.contains("is-on") && !e.target.closest(".k41")) close(); return; }
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button) return;
    if (a.closest(".k41")) return;
    if (owner === a && card && card.classList.contains("is-on")) { close(); return; } /* second click: let the link go */
    if (show(a)) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
  }, true);
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && card && card.classList.contains("is-on")) { close(); if (owner && owner.focus) owner.focus({ preventScroll: true }); } });
  window.addEventListener("hashchange", close);
  var sy = 0; window.addEventListener("scroll", function () { if (!card || !card.classList.contains("is-on")) { sy = scrollY; return; } if (Math.abs(scrollY - sy) > 240) close(); else if (owner && !card.classList.contains("is-sheet")) place(owner); }, { passive: true });
  window.addEventListener("resize", function () { if (owner && card && card.classList.contains("is-on")) place(owner); });
  window.XKwPrev = { show: show, close: close };
})();
