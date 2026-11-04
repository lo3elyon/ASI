/* pages.js: Batch 3. Extra pages at #/topics, #/topic/<slug>, #/era/early|deep|post, #/quotes, #/timeline,
   #/compare, #/stats and #/about; the nav's More menu (desktop) and the same links in the phone Sections sheet;
   era backgrounds and the Customize panel; and two player fixes (idle controls stay reachable).
   Rules kept: every list is in a fixed, deterministic order and never reorders or rotates; filters only hide;
   nothing plays or speaks until pressed; only sources and "Watch on YouTube" open new tabs; leaving a page
   puts the main page back exactly where it was. */
(function () {
  "use strict";
  if (!window.Hark) return;
  var doc = document, root = doc.documentElement;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var data = function (id) { try { return Hark.data(id); } catch (e) { return null; } };
  var fmtN = function (n) { return Number(n).toLocaleString("en-US"); };
  var cmpStr = function (a, b) { a = String(a == null ? "" : a); b = String(b == null ? "" : b); return a.localeCompare(b, "en") || (a < b ? -1 : a > b ? 1 : 0); };
  var cmpNum = function (a, b) { a = +a; b = +b; a = isNaN(a) ? Infinity : a; b = isNaN(b) ? Infinity : b; return a === b ? 0 : a < b ? -1 : 1; };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var ymKey = function (d, y) { if (d) { var p = String(d).split("-"); var yy = +p[0], mm = +(p[1] || 0); if (yy) return { y: yy, m: mm, key: yy + (mm ? (mm - 1) / 12 : 0) }; } y = +y; return { y: y || 0, m: 0, key: y || 0 }; };
  var whenOf = function (k) { return k.m ? MON[k.m - 1] + " " + k.y : String(k.y || ""); };
  var initials = function (n) { return String(n || "").split(/\s+/).filter(function (w) { return /^[A-Za-z]/.test(w); }).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("") || "?"; };
  var SPEAKER = '<span class="x-vo-ico" aria-hidden="true"><i class="x-ic" data-ic="speaker"></i></span><span class="x-vo-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="x-vo-lbl">Listen</span>';

  /* ---------------------------------------------------------------------
     Data, normalised once, in a fixed order
     --------------------------------------------------------------------- */
  var ERAS = [
    { slug: "early", name: "Before deep learning", span: "1950–2011", img: "early", intro: "Speculation that felt like science fiction. Mathematicians and futurists imagined machines that improve themselves, and a few asked who stays in control." },
    { slug: "deep", name: "Deep learning era", span: "2012–Nov 2022", img: "deep", intro: "Warnings go mainstream: Bostrom, Hawking and Russell put superintelligence risk in front of the public, while Andrew Ng and Yann LeCun push back." },
    { slug: "post", name: "After ChatGPT", span: "Dec 2022–Nov 2026", img: "post", intro: "Pioneers like Hinton and Bengio sound the alarm, labs race openly toward superintelligence, and governments respond with summits, laws and statements." }
  ];
  /* an item's era by date: before 2012, before Nov 2022 (ChatGPT's launch month), then after */
  var eraOfKey = function (k) { return k < 2012 ? 0 : k < 2022 + 10 / 12 ? 1 : 2; };

  var PEOPLE = (data("d-people") || []).slice();
  var PBY = {}; PEOPLE.forEach(function (p) { PBY[p.id] = p; });
  var PIDS = {}; (data("d-entries") || []).forEach(function (r) { PIDS[r.id] = r.people_ids || []; });

  var ENTRIES = [];
  [data("d-early") || [], data("d-dl") || [], data("d-post") || []].forEach(function (list, era) {
    list.forEach(function (r) {
      var k = ymKey(r.date, r.year);
      var pr = r.prediction && (typeof r.prediction === "string" ? { text: r.prediction } : r.prediction);
      ENTRIES.push({ id: r.id, era: era, k: k, person: r.person || "", role: r.role || "", title: r.title || "", type: r.type || "", stance: r.stance || "",
        summary: r.summary || "", quote: r.quote || "", pred: pr, src: r.source_url || "", pids: PIDS[r.id] || [],
        hay: [r.person, r.role, r.title, r.summary, r.quote, pr ? pr.text : "", r.stance, r.type].join(" ") });
    });
  });
  ENTRIES.sort(function (a, b) { return cmpNum(a.k.key, b.k.key) || cmpStr(a.person, b.person) || cmpStr(a.id, b.id); });

  var HIST = data("d-history") || {}, MILES = [];
  (HIST.chapters || []).forEach(function (c, ci) {
    (c.milestones || []).forEach(function (m) {
      var k = ymKey(m.date, m.year);
      MILES.push({ id: m.id, ch: c.title, ci: ci, k: k, title: m.title || "", people: m.people || [], what: m.what || "", why: m.why_it_matters || "",
        quote: m.quote || "", qsrc: m.quote_source || "", src: m.source_url || "", yt: m.youtube_id || "", tags: m.tags || [],
        hay: [m.title, (m.people || []).join(" "), m.what, m.why_it_matters, m.quote].join(" ") });
    });
  });
  MILES.sort(function (a, b) { return cmpNum(a.k.key, b.k.key) || cmpStr(a.title, b.title) || cmpStr(a.id, b.id); });

  var PREDS = (data("d-preds") || []).slice().sort(function (a, b) { return cmpNum(a.year_made, b.year_made) || cmpStr(a.who, b.who) || cmpStr(a.id, b.id); });
  var VIDS = (data("d-videos") || []).map(function (v) {
    var y = parseInt(String(v.d || "").slice(0, 4), 10);
    return { id: v.id, t: v.t || "", c: v.c || "", y: isNaN(y) ? 0 : y, d: v.d && v.d !== "None" ? String(v.d) : "", len: v.len || "", k: v.k || "", p: v.p || [], hay: (v.t || "") + " " + (v.s || "") };
  });
  /* newest first, then title, then id: fixed */
  VIDS.sort(function (a, b) { return cmpStr(b.d, a.d) || cmpStr(a.t, b.t) || cmpStr(a.id, b.id); });

  /* one topic table for the history tags, the archive and the talk tags (watch-hub.js) */
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
  var TBY = {}; TOPICS.forEach(function (t) { TBY[t.slug] = t; t.al.forEach(function (a) { TBY[a] = t; }); });
  var hits = {};
  var topicHits = function (t) {
    if (hits[t.slug]) return hits[t.slug];
    var skeptic = t.slug === "skeptics";
    var h = {
      miles: MILES.filter(function (m) { return m.tags.some(function (g) { return t.tags.indexOf(g) >= 0; }) || t.re.test(m.hay); }),
      entries: ENTRIES.filter(function (e) { return t.re.test(e.hay) || (skeptic && /skeptic/i.test(e.stance)); }),
      people: PEOPLE.filter(function (p) { return t.re.test([p.role, p.group, (p.key_ideas || []).join(" "), p.warning].join(" ")) || (skeptic && /critic|optimist/.test(p.group)); }),
      preds: PREDS.filter(function (p) { return t.re.test(p.prediction + " " + (p.evidence || "")); }),
      vids: VIDS.filter(function (v) { return t.re.test(v.hay); })
    };
    h.n = h.miles.length + h.entries.length + h.people.length + h.preds.length + h.vids.length;
    return (hits[t.slug] = h);
  };

  var QUOTES = [];
  PEOPLE.forEach(function (p) {
    (p.quotes || []).forEach(function (q, i) {
      if (!q || !q.text) return;
      var k = ymKey(q.year, q.year);
      QUOTES.push({ id: p.id + ":" + i, text: q.text, who: p.name, pid: p.id, src: q.source || "", url: q.url || "", k: k, era: k.y ? eraOfKey(k.key) : -1 });
    });
  });
  QUOTES.sort(function (a, b) { return cmpNum(a.k.key || Infinity, b.k.key || Infinity) || cmpStr(a.who, b.who) || cmpStr(a.id, b.id); });

  /* ---------------------------------------------------------------------
     Small renderers
     --------------------------------------------------------------------- */
  /* the same portrait chain as people.js (XLogo.face): local portrait file, then the people.json photo */
  var srcsOf = function (p) { return window.XLogo && XLogo.face ? XLogo.face({ pid: p.id, photo: p.photo, org: false }).srcs : (p.photo ? [p.photo] : []); };
  var photoOf = function (p) { return srcsOf(p)[0] || ""; };
  var orgTile = function (name, size) { return window.XLogo ? XLogo.tile(name, size || 18) : ""; };
  /* every logo once, each linking to its organisation's page; n = people per org */
  var orgStrip = function () {
    if (!window.XLogo) return "";
    var L = XLogo.list(); if (!L.length) return "";
    var nOf = function (o) { return PEOPLE.filter(function (p) { return p.org && XLogo.slugOf(p.org) === o.slug; }).length; };
    return section("orgs", head("Organisations", "The labs, universities and groups in the archive.", fmtN(L.length) + " organisations. Pick one to see its people, entries and predictions.") +
      '<ul class="x-orgs">' + L.map(function (o) {
        var n = nOf(o);
        return '<li><a href="#/org/' + esc(o.slug) + '">' + XLogo.tile(o, 32) + "<span>" + esc(o.name) + (n ? "<small>" + fmtN(n) + (n === 1 ? " person" : " people") + "</small>" : "") + "</span></a></li>";
      }).join("") + "</ul>");
  };
  var personChip = function (p) {
    var ss = srcsOf(p);
    return '<a class="x-pg__person" href="#/person/' + esc(p.id) + '">' + (ss.length ? XLogo.img(ss, "", 32, 'loading="lazy"') : '<span class="x-pg__ini" aria-hidden="true">' + esc(initials(p.name)) + "</span>") + "<span>" + esc(p.name) + "</span></a>";
  };
  var vidLink = function (v) {
    return '<li><a class="link" href="#/watch/' + esc(v.id) + '" data-watch="' + esc(v.id) + '" data-title="' + esc(v.t) + '">' + esc(v.t) + "</a>" +
      (v.c || v.y || v.len ? ' <small class="x-pg__count">' + esc([v.c, v.y || "", v.len].filter(Boolean).join(" · ")) + "</small>" : "") + "</li>";
  };
  var srcLink = function (u, label) { return u ? '<a class="link" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(label || "Source") + "</a>" : ""; };
  var entryRow = function (e, withEra) {
    return '<li><p class="timeline__when">' + esc(whenOf(e.k)) + '</p><div class="timeline__what"><p><b>' + esc(e.title) + "</b> · " + esc(e.person) + "</p>" +
      (e.summary ? '<p class="x-pg__sum">' + esc(e.summary) + "</p>" : "") +
      '<div class="x-pg__rowacts"><button type="button" class="btn" data-pg-entry="' + esc(e.id) + '">Open in the archive</button>' + srcLink(e.src) + "</div></div>" +
      (withEra ? '<p><span class="pill">' + esc(ERAS[e.era].name) + "</span></p>" : "") + "</li>";
  };
  var mileRow = function (m) {
    return '<li><p class="timeline__when">' + esc(whenOf(m.k)) + '</p><div class="timeline__what"><p><b>' + esc(m.title) + "</b>" + (m.people.length ? " · " + esc(m.people.join(", ")) : "") + "</p>" +
      (m.what ? '<p class="x-pg__sum">' + esc(m.what) + "</p>" : "") +
      '<div class="x-pg__rowacts"><button type="button" class="btn" data-pg-mile="' + esc(m.id) + '">Open in the history</button>' +
      (m.yt ? '<a class="btn" href="#/watch/' + esc(m.yt) + '" data-watch="' + esc(m.yt) + '" data-title="' + esc(m.title) + '">▶ Play here</a>' : "") + srcLink(m.src) + "</div></div></li>";
  };
  var predRow = function (p) {
    return '<li><p class="timeline__when">' + esc(p.year_made) + (p.target_year ? " → " + esc(p.target_year) : "") + '</p><div class="timeline__what"><p><b>' + esc(p.who) + ":</b> " + esc(p.prediction) + "</p>" +
      '<div class="x-pg__rowacts"><button type="button" class="btn" data-pg-pred="' + esc(p.id) + '">Open the fact-check</button>' + srcLink(p.prediction_source_url) + "</div></div>" +
      '<p><span class="pill">' + esc(p.status) + "</span></p></li>";
  };
  /* a list that grows with "Show more": rows are only ever appended, never reordered */
  var growLists = {};
  var growing = function (key, rows, render, step, wrapOpen, wrapClose) {
    growLists[key] = { rows: rows, render: render, step: step, shown: Math.min(step, rows.length) };
    return wrapOpen.replace(">", ' data-grow="' + key + '">') + rows.slice(0, step).map(render).join("") + wrapClose +
      (rows.length > step ? '<div class="links x-pg__more"><button type="button" class="btn" data-grow-more="' + key + '">Show more (' + fmtN(rows.length - step) + " left)</button></div>" : "");
  };
  var growMore = function (b) {
    var key = b.getAttribute("data-grow-more"), g = growLists[key]; if (!g) return;
    var list = doc.querySelector('[data-grow="' + key + '"]'); if (!list) return;
    var next = g.rows.slice(g.shown, g.shown + g.step);
    list.insertAdjacentHTML("beforeend", next.map(g.render).join(""));
    g.shown += next.length;
    var left = g.rows.length - g.shown;
    if (left > 0) b.textContent = "Show more (" + fmtN(left) + " left)"; else b.parentNode.remove();
  };
  var head = function (eyebrow, title, sub, extra) {
    return '<div class="head">' + (eyebrow ? '<p class="head__eyebrow">' + eyebrow + "</p>" : "") + "<h2>" + title + "</h2>" + (sub ? '<p class="head__sub">' + sub + "</p>" : "") + (extra || "") + "</div>";
  };
  var section = function (id, inner) { return '<section class="section"' + (id ? ' id="' + id + '"' : "") + ">" + inner + "</section>"; };
  var stats = function (list) {
    return '<section class="stats">' + list.filter(function (s) { return s[0] > 0; }).map(function (s) { return '<div class="stat"><span class="stat__fig">' + fmtN(s[0]) + '</span><span class="stat__label">' + esc(s[1]) + "</span></div>"; }).join("") + "</section>";
  };
  var eraImg = function (slug) { var i = doc.querySelector('#x-era-imgs img[data-era="' + slug + '"]'); if (!i) return null; var c = i.cloneNode(true); c.removeAttribute("loading"); return c; };

  /* ---------------------------------------------------------------------
     Pages
     --------------------------------------------------------------------- */
  var PAGES = [
    { id: "#/ask", t: "Ask", s: "Ask the Archive: answers with sources", ico: "ask", kw: "ask question chat answer assistant help" },
    { id: "#/topics", t: "Topics", s: "Every theme in the archive, with counts", ico: "tag", kw: "tags themes" },
    { id: "#/policy", t: "Policy & governance", s: "Laws, treaties, hearings and the people behind them", ico: "columns", kw: "policy governance regulation law senate treaty" },
    { id: "#/safety", t: "Safety & alignment", s: "Alignment, control and the safety research around them", ico: "shield", kw: "safety alignment control problem interpretability" },
    { id: "#/era/early", t: "Era: Before deep learning", s: "1950–2011", ico: "oldclock", kw: "era early 1950s 1960s turing good" },
    { id: "#/era/deep", t: "Era: Deep learning", s: "2012–Nov 2022", ico: "network", kw: "era deep learning alexnet bostrom" },
    { id: "#/era/post", t: "Era: After ChatGPT", s: "Dec 2022–Nov 2026", ico: "llm", kw: "era post chatgpt 2023 2024 2025" },
    { id: "#/quotes", t: "Quotes", s: "Every sourced quote, searchable", ico: "quote", kw: "quotes sayings" },
    { id: "#/timeline", t: "Full timeline", s: "Milestones and entries by decade", ico: "scroll", kw: "timeline chronology decades" },
    { id: "#/compare", t: "Compare people", s: "Two or three side by side", ico: "compare", kw: "compare versus vs" },
    { id: "#/stats", t: "Stats", s: "The archive in charts", ico: "stats", kw: "stats charts numbers" },
    { id: "#/about", t: "About", s: "Sources, method and credits", ico: "info", kw: "about credits author aniruddha adak method" }
  ];
  window.XPages = { list: PAGES.concat(TOPICS.map(function (t) { return { id: "#/topic/" + t.slug, t: "Topic: " + t.name, s: "Milestones, entries, people, talks", kw: t.al.join(" ") }; })) };

  var R = {};
  R.topics = function () {
    var cards = TOPICS.map(function (t) {
      var h = topicHits(t);
      return '<div><h3><a href="#/topic/' + t.slug + '">' + esc(t.name) + "</a></h3>" +
        '<p class="x-pg__card-n">' + [[h.miles.length, "milestones"], [h.entries.length, "entries"], [h.people.length, "people"], [h.vids.length, "talks"], [h.preds.length, "predictions"]]
          .filter(function (x) { return x[0]; }).map(function (x) { return fmtN(x[0]) + " " + (x[0] === 1 ? x[1].replace(/ies$/, "y").replace(/s$/, "").replace(/^people$/, "person") : x[1]); }).join(" · ") + "</p></div>";
    }).join("");
    return { title: "Topics", html: section("", head("Topics", "Every theme in the archive.", fmtN(TOPICS.length) + " topics. Each gathers the milestones, archive entries, people, talks and predictions that mention it.") + '<div class="cards">' + cards + "</div>") };
  };
  R.topic = function (slug) {
    var t = TBY[slug];
    if (!t) return { title: "Topic not found", html: section("", head("Topics", "No topic called “" + esc(slug) + "”.", 'Pick one from <a class="link" href="#/topics">all topics</a>.')) };
    var h = topicHits(t), parts = [];
    var idx = TOPICS.indexOf(t), prev = TOPICS[(idx - 1 + TOPICS.length) % TOPICS.length], next = TOPICS[(idx + 1) % TOPICS.length];
    parts.push(section("", head("Topic", esc(t.name), "Everything in the archive that mentions " + esc(t.name.toLowerCase()) + ", oldest first. Talks are newest first.",
      '<div class="x-pg__acts"><a class="btn" href="#/topic/' + prev.slug + '">← ' + esc(prev.name) + '</a><a class="btn" href="#/topics">All topics</a><a class="btn" href="#/topic/' + next.slug + '">' + esc(next.name) + " →</a></div>")));
    parts.push(stats([[h.miles.length, "Milestones"], [h.entries.length, "Archive entries"], [h.people.length, "People"], [h.vids.length, "Talks"], [h.preds.length, "Predictions"]]));
    if (h.miles.length) parts.push(section("", head("", "History milestones") + growing("tm-" + t.slug, h.miles, mileRow, 12, '<ol class="timeline">', "</ol>")));
    if (h.entries.length) parts.push(section("", head("", "Archive entries") + growing("te-" + t.slug, h.entries, function (e) { return entryRow(e, true); }, 12, '<ol class="timeline">', "</ol>")));
    if (h.people.length) parts.push(section("", head("", "People") + growing("tp-" + t.slug, h.people, function (p) { return personChip(p); }, 40, '<div class="x-pg__people">', "</div>")));
    if (h.preds.length) parts.push(section("", head("", "Predictions") + '<ol class="timeline">' + h.preds.map(predRow).join("") + "</ol>"));
    if (h.vids.length) parts.push(section("", head("", "Talks", "Each plays here in the video window. Nothing starts until you press Play.") + growing("tv-" + t.slug, h.vids, vidLink, 20, '<ul class="x-pg__vids">', "</ul>")));
    if (!h.n) parts.push('<p class="fineprint">Nothing in the archive mentions this topic yet.</p>');
    return { title: t.name, html: parts.join("") };
  };
  R.era = function (slug) {
    var ei = ERAS.map(function (e) { return e.slug; }).indexOf(slug);
    if (ei < 0) return R.era("early");
    var E = ERAS[ei];
    var ents = ENTRIES.filter(function (e) { return e.era === ei; });
    var miles = MILES.filter(function (m) { return eraOfKey(m.k.key) === ei; });
    var preds = PREDS.filter(function (p) { return eraOfKey(+p.year_made) === ei; });
    var vids = VIDS.filter(function (v) { return v.y && eraOfKey(v.y) === ei; });
    var pc = {}; ents.forEach(function (e) { e.pids.forEach(function (id) { pc[id] = (pc[id] || 0) + 1; }); });
    var ppl = Object.keys(pc).map(function (id) { return PBY[id]; }).filter(Boolean).sort(function (a, b) { return pc[b.id] - pc[a.id] || cmpStr(a.name, b.name); });
    var nav = ERAS.map(function (x) { return '<a class="btn" href="#/era/' + x.slug + '"' + (x.slug === slug ? ' aria-current="page"' : "") + ">" + esc(x.name) + "</a>"; }).join("");
    var html =
      '<section class="hero x-pg__hero" data-era-img="' + E.img + '"><div class="hero__copy"><p class="hero__eyebrow">Era ' + (ei + 1) + " of 3 · " + esc(E.span) + "</p><h1>" + esc(E.name) + '</h1><p class="hero__sub">' + esc(E.intro) + "</p></div></section>" +
      '<nav class="x-pg__nav links" aria-label="Eras">' + nav + "</nav>" +
      stats([[ents.length, "Archive entries"], [miles.length, "Milestones"], [preds.length, "Predictions made"], [vids.length, "Dated talks"]]) +
      (ppl.length ? section("", head("", "Who shaped this era", "People named in this era's archive entries, most entries first.") + '<div class="x-pg__people">' + ppl.map(personChip).join("") + "</div>") : "") +
      section("", head("", "Archive entries, in order") + '<ol class="timeline">' + ents.map(function (e) { return entryRow(e, false); }).join("") + "</ol>") +
      (miles.length ? section("", head("", "History milestones") + growing("em-" + slug, miles, mileRow, 12, '<ol class="timeline">', "</ol>")) : "") +
      (preds.length ? section("", head("", "Predictions made in this era") + '<ol class="timeline">' + preds.map(predRow).join("") + "</ol>") : "") +
      (vids.length ? section("", head("", "Talks from this era", "Newest first. Each plays here.") + growing("ev-" + slug, vids, vidLink, 20, '<ul class="x-pg__vids">', "</ul>")) : "") +
      '<nav class="x-pg__nav links" aria-label="Eras">' +
        (ei > 0 ? '<a class="btn" href="#/era/' + ERAS[ei - 1].slug + '">← ' + esc(ERAS[ei - 1].name) + "</a>" : "") +
        (ei < 2 ? '<a class="btn" href="#/era/' + ERAS[ei + 1].slug + '">' + esc(ERAS[ei + 1].name) + " →</a>" : "") + "</nav>";
    return { title: E.name, html: html, era: E.img };
  };
  R.quotes = function () {
    var chips = '<div class="x-row" role="group" aria-label="Era"><span class="x-row__lab">Era</span>' +
      ERAS.map(function (e, i) { return '<button type="button" class="x-f" data-q-era="' + i + '" aria-pressed="false">' + esc(e.name) + "</button>"; }).join("") + "</div>";
    var items = QUOTES.map(function (q) {
      return '<li class="x-pg__q" data-era="' + q.era + '" data-hay="' + esc((q.text + " " + q.who + " " + q.src).toLowerCase()) + '"><figure style="margin:0;display:grid;gap:10px"><blockquote>' + esc(q.text) + "</blockquote>" +
        '<figcaption><a href="#/person/' + esc(q.pid) + '">' + esc(q.who) + "</a>" + (q.k.y ? "<span>" + esc(whenOf(q.k)) + "</span>" : "") +
        (q.url ? '<a class="link" href="' + esc(q.url) + '" target="_blank" rel="noopener">' + esc(q.src || "Source") + "</a>" : q.src ? "<span>" + esc(q.src) + "</span>" : "") +
        '<button type="button" class="x-vo-mini" data-vo-text="' + esc(q.text + " — " + q.who) + '" aria-label="Read aloud: quote by ' + esc(q.who) + '">' + SPEAKER + "</button></figcaption></figure></li>";
    }).join("");
    onShow.push(function () {
      var inp = host.querySelector("#pgQ"), cnt = host.querySelector("#pgQn"), eras = {};
      var all = [].slice.call(host.querySelectorAll(".x-pg__q"));
      var apply = function () {
        var terms = inp.value.toLowerCase().trim().split(/\s+/).filter(Boolean), anyEra = Object.keys(eras).some(function (k) { return eras[k]; }), n = 0;
        all.forEach(function (li) {
          var ok = (!anyEra || eras[li.getAttribute("data-era")]) && terms.every(function (t) { return li.getAttribute("data-hay").indexOf(t) >= 0; });
          li.hidden = !ok; if (ok) n++;
        });
        cnt.textContent = n === all.length ? fmtN(n) + " quotes" : fmtN(n) + " of " + fmtN(all.length) + " quotes";
      };
      var tm = 0;
      inp.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(apply, 90); });
      host.querySelectorAll("[data-q-era]").forEach(function (b) {
        b.addEventListener("click", function () { var k = b.getAttribute("data-q-era"); eras[k] = !eras[k]; b.setAttribute("aria-pressed", String(!!eras[k])); apply(); });
      });
      apply();
    });
    return { title: "Quotes", html: section("", head("Quotes", "What they said, in their own words.", fmtN(QUOTES.length) + " sourced quotes from " + fmtN(PEOPLE.filter(function (p) { return (p.quotes || []).length; }).length) + " people, oldest first. Search or filter by era; press Listen to hear one.") +
      '<div class="x-tools" style="position:static;box-shadow:none"><div class="x-pg__qbar"><input class="x-input" id="pgQ" type="search" placeholder="Search quotes, people, sources…" aria-label="Search quotes" autocomplete="off" /><span class="x-pg__count" id="pgQn" aria-live="polite"></span></div>' + chips + "</div>" +
      '<ul class="x-pg__quotes">' + items + "</ul>") };
  };
  R.timeline = function () {
    var rows = MILES.map(function (m) { return { k: m.k, kind: "m", o: m }; }).concat(ENTRIES.map(function (e) { return { k: e.k, kind: "e", o: e }; }));
    rows.sort(function (a, b) { return cmpNum(a.k.key, b.k.key) || cmpStr(a.kind, b.kind) || cmpStr(a.o.id, b.o.id); });
    var dec = {}, order = [];
    rows.forEach(function (r) { var d = Math.floor(r.k.y / 10) * 10; if (!dec[d]) { dec[d] = []; order.push(d); } dec[d].push(r); });
    var jump = '<nav class="x-pg__decades" aria-label="Jump to a decade">' + order.map(function (d) { return '<button type="button" data-dec="' + d + '">' + d + "s</button>"; }).join("") + "</nav>";
    var body = order.map(function (d) {
      return '<section class="section x-pg__dec" id="pg-dec-' + d + '">' + head("", d + "s", fmtN(dec[d].length) + " item" + (dec[d].length === 1 ? "" : "s")) +
        '<ol class="timeline">' + dec[d].map(function (r) {
          var html = r.kind === "m" ? mileRow(r.o) : entryRow(r.o, false);
          return html.replace("</p>", ' <span class="pill x-pg__kind">' + (r.kind === "m" ? "Milestone" : "Entry") + "</span></p>");
        }).join("") + "</ol></section>";
    }).join("");
    onShow.push(function () {
      host.querySelector(".x-pg__decades").addEventListener("click", function (e) {
        var b = e.target.closest("[data-dec]"); if (!b) return;
        var s = doc.getElementById("pg-dec-" + b.getAttribute("data-dec"));
        if (s) s.scrollIntoView({ block: "start", behavior: root.classList.contains("x-calm") || matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
    });
    return { title: "Full timeline", html: section("", head("Timeline", "The whole story, decade by decade.", fmtN(MILES.length) + " history milestones and " + fmtN(ENTRIES.length) + " archive entries, " + esc(order[0]) + "s to " + esc(order[order.length - 1]) + "s, oldest first.")) + jump + body };
  };
  var DEF_CMP = ["geoffrey-hinton", "yann-lecun", "yoshua-bengio"].filter(function (id) { return PBY[id]; });
  var sortedPeople = PEOPLE.slice().sort(function (a, b) { return cmpStr(a.name, b.name) || cmpStr(a.id, b.id); });
  R.compare = function (arg) {
    var ids = String(arg || "").split(",").filter(function (id) { return PBY[id]; }).slice(0, 3);
    /* one person named (a person page's Compare button): keep them first, add the next default */
    if (ids.length === 1) ids.push(DEF_CMP.filter(function (id) { return id !== ids[0]; })[0]);
    if (ids.length < 2 || !ids[1]) ids = DEF_CMP.slice();
    var pick = function (n, sel) {
      return '<label>Person ' + n + ' <select data-cmp="' + (n - 1) + '">' + (n === 3 ? '<option value="">None</option>' : "") +
        sortedPeople.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === sel ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></label>";
    };
    var ps = ids.map(function (id) { return PBY[id]; });
    var row = function (label, f, cls) { return '<tr><th scope="row">' + label + "</th>" + ps.map(function (p) { var v = f(p); return "<td" + (v ? (cls ? ' class="' + cls + '"' : "") : ' class="muted"') + ">" + (v || "—") + "</td>"; }).join("") + "</tr>"; };
    var table = '<div class="compare"><table><thead><tr><td></td>' + ps.map(function (p) {
      return '<th scope="col">' + (photoOf(p) ? '<figure class="compare__media compare__media--photo"><img src="' + esc(photoOf(p)) + '" alt="' + esc(p.name) + '" width="240" height="240" loading="lazy" decoding="async" /></figure>' : "") +
        esc(p.name) + "<small>" + esc(p.role || "") + "</small></th>";
    }).join("") + "</tr></thead><tbody>" +
      row("Organisation", function (p) {
        if (!p.org) return "";
        var s = window.XLogo && XLogo.slugOf(p.org);
        return s ? '<a class="x-org" href="#/org/' + esc(s) + '">' + orgTile(p.org, 22) + "<span>" + esc(p.org) + "</span></a>" : esc(p.org);
      }) +
      row("Group", function (p) { return esc(String(p.group || "").replace(/-/g, " ")); }) +
      row("Country", function (p) { return esc(p.country || ""); }) +
      row("Risk estimate", function (p) { return esc(p.pdoom || ""); }) +
      row("AGI timeline", function (p) { return esc(p.agi_year || ""); }) +
      row("Key ideas", function (p) { return esc((p.key_ideas || []).join(", ")); }) +
      row("In their words", function (p) { return p.warning ? "“" + esc(p.warning) + "”" : ""; }) +
      row("Quotes", function (p) { return (p.quotes || []).length ? fmtN(p.quotes.length) : ""; }, "num") +
      row("Archive entries", function (p) { return (p.entries || []).length ? fmtN(p.entries.length) : ""; }, "num") +
      row("Talks", function (p) { return p.n_videos ? fmtN(p.n_videos) : ""; }, "num") +
      '<tr><th scope="row"></th>' + ps.map(function (p) { return '<td><a class="btn" href="#/person/' + esc(p.id) + '">View profile</a></td>'; }).join("") + "</tr>" +
      "</tbody></table></div>";
    onShow.push(function () {
      host.querySelector(".x-pg__pick").addEventListener("change", function () {
        var v = [].map.call(host.querySelectorAll("select[data-cmp]"), function (s) { return s.value; }).filter(Boolean);
        v = v.filter(function (x, i) { return v.indexOf(x) === i; });
        location.hash = "#/compare/" + v.join(",");
      });
    });
    return { title: "Compare people", html: section("", head("Compare", "Side by side: " + ps.map(function (p) { return esc(p.name); }).join(", ") + ".", "Pick two or three people. The address keeps your choice, so you can share it.") +
      '<div class="x-pg__pick">' + pick(1, ids[0]) + pick(2, ids[1]) + pick(3, ids[2] || "") + "</div>") + section("", table) };
  };
  R.stats = function () {
    var decs = {}, dl = [];
    MILES.forEach(function (m) { var d = Math.floor(m.k.y / 10) * 10; (decs[d] = decs[d] || { m: 0, e: 0 }).m++; });
    ENTRIES.forEach(function (e) { var d = Math.floor(e.k.y / 10) * 10; (decs[d] = decs[d] || { m: 0, e: 0 }).e++; });
    Object.keys(decs).map(Number).sort(function (a, b) { return a - b; }).forEach(function (d) { dl.push(d); });
    var yrs = {}; VIDS.forEach(function (v) { if (v.y >= 2000) yrs[v.y] = (yrs[v.y] || 0) + 1; });
    var ylist = Object.keys(yrs).map(Number).sort(function (a, b) { return a - b; });
    var grp = {}; PEOPLE.forEach(function (p) { var g = String(p.group || "other"); grp[g] = (grp[g] || 0) + 1; });
    var glist = Object.keys(grp).sort(function (a, b) { return grp[b] - grp[a] || cmpStr(a, b); });
    var peakY = ylist.reduce(function (a, y) { return yrs[y] > (yrs[a] || 0) ? y : a; }, ylist[0]);
    var undated = VIDS.filter(function (v) { return !v.y; }).length;
    var block = JSON.stringify({ dec: dl.map(function (d) { return { d: d + "s", m: decs[d].m, e: decs[d].e }; }), yrs: ylist.map(function (y) { return { y: y, n: yrs[y] }; }), grp: glist.map(function (g) { return { g: g.replace(/-/g, " "), n: grp[g] }; }) });
    onShow.push(function () {
      if (!window.Chart) return;
      var D = JSON.parse(host.querySelector("#pgStatsData").textContent);
      new Chart(host.querySelector("#pgDec"), { type: "bar", data: { labels: D.dec.map(function (x) { return x.d; }), datasets: [
        { label: "Milestones", data: D.dec.map(function (x) { return x.m; }), backgroundColor: "var(--chart-1)" },
        { label: "Archive entries", data: D.dec.map(function (x) { return x.e; }), backgroundColor: "var(--chart-2)" }] },
        options: { scales: { x: { stacked: true }, y: { stacked: true, ticks: { stepSize: 5 } } } } });
      new Chart(host.querySelector("#pgYrs"), { type: "line", data: { labels: D.yrs.map(function (x) { return String(x.y); }), datasets: [{ label: "Talks", data: D.yrs.map(function (x) { return x.n; }), fill: true }] },
        options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.raw + " talks"; } } } } } });
      new Chart(host.querySelector("#pgGrp"), { type: "bar", data: { labels: D.grp.map(function (x) { return x.g; }), datasets: [{ data: D.grp.map(function (x) { return x.n; }) }] },
        options: { indexAxis: "y", plugins: { legend: { display: false }, datalabels: Hark.labels.values } } });
    });
    return { title: "Stats", html: section("", head("Stats", "The archive in charts.", "Every figure is counted from the archive's own data.")) +
      stats([[PEOPLE.length, "People"], [VIDS.length, "Talks"], [MILES.length, "Milestones"], [ENTRIES.length, "Archive entries"], [QUOTES.length, "Quotes"], [PREDS.length, "Predictions"]]) +
      '<script type="application/json" id="pgStatsData">' + block.replace(/</g, "\\u003c") + "<\/script>" +
      section("", '<figure class="chart"><figcaption class="chart__cap">Milestones and archive entries by decade<small>Count per decade, ' + esc(dl[0]) + "s to " + esc(dl[dl.length - 1]) + 's</small></figcaption><div class="chart__canvas"><canvas id="pgDec" role="img" aria-label="Milestones and archive entries per decade, stacked"></canvas></div></figure>') +
      section("", '<figure class="chart"><figcaption class="chart__cap">Talks by the year they were recorded; ' + esc(peakY) + " has the most, " + fmtN(yrs[peakY] || 0) + '<small>Dated talks from 2000 on · ' + fmtN(undated) + ' talks have no date</small></figcaption><div class="chart__canvas"><canvas id="pgYrs" role="img" aria-label="Talks per year since 2000; ' + esc(peakY) + ' is the peak"></canvas></div></figure>') +
      section("", '<figure class="chart"><figcaption class="chart__cap">People by group; ' + esc(glist[0].replace(/-/g, " ")) + " is the largest, " + fmtN(grp[glist[0]]) + '<small>Count of people</small></figcaption><div class="chart__canvas chart__canvas--tall"><canvas id="pgGrp" role="img" aria-label="People per group, largest first"></canvas></div></figure>') +
      orgStrip() };
  };
  /* #/org/<slug>: everything tied to one organisation, found by every name logos.json gives it */
  R.org = function (slug) {
    var o = window.XLogo && XLogo.bySlug(slug);
    if (!o) return { title: "Organisation not found", html: section("", head("Organisations", "No organisation called “" + esc(slug) + "”.", 'See <a class="link" href="#/stats">every organisation</a>.')) };
    var names = o.names.map(function (n) { return n.replace(/\s*\([^)]*\)/g, "").trim(); }).filter(function (n, i, a) { return n.length > 2 && a.indexOf(n) === i && !/ and |&|\//.test(n); });
    if (names.indexOf(o.name) < 0) names.unshift(o.name);
    var re = new RegExp("\\b(" + names.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")\\b", "i");
    var ppl = PEOPLE.filter(function (p) { return p.org && XLogo.slugOf(p.org) === slug; }).sort(function (a, b) { return cmpStr(a.name, b.name); });
    var ents = ENTRIES.filter(function (e) { return XLogo.slugOf(e.person) === slug || re.test(e.hay); });
    var prs = PREDS.filter(function (p) { return re.test(p.who + " " + p.prediction + " " + (p.evidence || "")); });
    var mls = MILES.filter(function (m) { return re.test(m.hay); });
    var parts = [section("", head("Organisation", XLogo.tile(o, 40, "x-logo--head") + " " + esc(o.name), [[ppl.length, "people"], [ents.length, "archive entries"], [mls.length, "milestones"], [prs.length, "predictions"]].filter(function (x) { return x[0]; }).map(function (x) { return fmtN(x[0]) + " " + x[1]; }).join(" · ") || "Nothing else in the archive names it yet.",
      '<div class="x-pg__acts"><a class="btn" href="#/stats">All organisations</a><a class="btn" href="#/ask" data-ask-seed="' + esc("What did " + o.name + " say about superintelligence?") + '">Ask about ' + esc(o.name) + "</a></div>"))];
    if (ppl.length) parts.push(section("", head("", "People", "") + '<div class="x-pg__people">' + ppl.map(personChip).join("") + "</div>"));
    if (ents.length) parts.push(section("", head("", "Archive entries", "Oldest first.") + growing("og-e", ents, function (e) { return entryRow(e, true); }, 12, '<ol class="timeline">', "</ol>")));
    if (mls.length) parts.push(section("", head("", "History milestones", "") + growing("og-m", mls, mileRow, 8, '<ol class="timeline">', "</ol>")));
    if (prs.length) parts.push(section("", head("", "Predictions", "") + growing("og-p", prs, predRow, 8, '<ol class="timeline">', "</ol>")));
    return { title: o.name, html: parts.join("") };
  };
  /* #/ask: the full Ask the Archive page; ask.js draws it */
  R.ask = function () {
    onShow.push(function () { var m = host.querySelector("#x-ask-page"); if (m && window.XAsk) XAsk.mountPage(m); });
    return { title: "Ask the Archive", html: '<div id="x-ask-page" class="x-askp"></div>' };
  };
  R.about = function () {
    return { title: "About", html: section("", head("About", "About the ASI History Archive.", "A fact-checked record of what people predicted about superintelligence, and what actually happened.")) +
      section("", '<div class="cards">' +
        '<div><h3>Who made it</h3><p>Created and maintained by <b>Aniruddha Adak</b>.</p></div>' +
        "<div><h3>What is inside</h3><p>" + fmtN(MILES.length) + " history milestones and " + fmtN(ENTRIES.length) + " archive entries, covering " + fmtN(PEOPLE.length) + " people.</p><p>" + fmtN(VIDS.length) + " talks, " + fmtN(QUOTES.length) + " quotes and " + fmtN(PREDS.length) + " predictions, each with its source.</p></div>" +
        "<div><h3>Method</h3><p>Every entry links its source. Predictions were checked against what happened, as of 3 Nov 2026. Where a forecast gave no exact year, the target year is an approximation.</p></div>" +
        "<div><h3>Talks</h3><p>Talks play in the page and never start on their own. Some are third-party uploads and may go offline. Only sources and “Watch on YouTube” open a new tab.</p></div>" +
        '<div><h3>Keyboard</h3><p>Press <kbd>Ctrl</kbd> <kbd>K</kbd> or <kbd>/</kbd> to search everything, pages included.</p><p>Press <kbd>?</kbd> in the player for its shortcuts, and <kbd>Esc</kbd> to close a menu or dialog.</p></div>' +
        '<div><h3>Make it yours</h3><p>Pick an era background, calmer motion, and the reading voice and speed.</p><div class="links"><button type="button" class="btn" data-cz-open>Customize</button></div></div>' +
      "</div>") };
  };

  /* #/policy and #/safety: topic-style pages drawn by fix15.js (XThemePage) from these shared helpers */
  window.XPagesKit = { topicHits: topicHits, section: section, head: head, stats: stats, growing: growing, mileRow: mileRow, entryRow: entryRow, personChip: personChip, predRow: predRow, vidLink: vidLink, esc: esc, fmtN: fmtN };
  R.policy = function () { return window.XThemePage ? XThemePage("policy") : { title: "Policy & governance", html: "" }; };
  R.safety = function () { return window.XThemePage ? XThemePage("safety") : { title: "Safety & alignment", html: "" }; };

  /* ---------------------------------------------------------------------
     Router
     --------------------------------------------------------------------- */
  var main = doc.querySelector("main.main");
  var host = doc.createElement("div");
  host.className = "main x-pg"; host.id = "x-pages"; host.hidden = true; host.setAttribute("tabindex", "-1");
  var pv = doc.getElementById("person-view");
  (pv || main).parentNode.insertBefore(host, (pv || main).nextSibling);
  var baseTitle = doc.title.replace(/^.* · (?=ASI History Archive)/, "");
  var parse = function (h) {
    var m = /^#\/(topics|topic|era|quotes|timeline|compare|stats|about|org|ask|policy|safety)(?:\/([^?#]*))?\/?$/.exec(h || "");
    return m ? { name: m[1], arg: m[2] ? decodeURIComponent(m[2]) : "" } : null;
  };
  var curKey = null, mainY = null, lastHash = null, onShow = [];
  var jumpTo = function (y) { try { window.scrollTo({ top: y, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); } };
  var paintMore = function () {
    doc.querySelectorAll(".x-more__menu a, .x-sheet__more a").forEach(function (a) {
      var h = a.getAttribute("href"); if (h === location.hash || (curKey && h === "#/" + curKey)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  };
  var route = function () {
    if (location.hash === lastHash) return;
    lastHash = location.hash;
    var r = parse(location.hash);
    if (r) {
      if (window.XGoTo && XGoTo.stop) XGoTo.stop();
      if (window.XVoice) XVoice.stop();
      if (curKey === null && main && !main.hidden) mainY = window.scrollY;
      if (main) main.hidden = true;
      if (pv && !pv.hidden) pv.hidden = true;
      var fn = r.name === "topic" ? R.topic : r.name === "era" ? R.era : R[r.name];
      if (window.XAsk && XAsk.stop) XAsk.stop();
      /* reset before the page builds, so its growing lists and onShow hooks (the Ask page's mount) survive */
      growLists = {}; onShow = [];
      var out = fn(r.arg || (r.name === "era" ? "early" : ""));
      host.innerHTML = '<div class="links x-pg__top"><a class="btn" href="#/" data-pg-home>← Back to the archive</a></div>' + out.html;
      var hero = host.querySelector(".x-pg__hero[data-era-img]");
      if (hero) { var im = eraImg(hero.getAttribute("data-era-img")); if (im) { im.className = "hero__img"; hero.insertBefore(im, hero.firstChild); } }
      host.hidden = false;
      curKey = r.name + (r.arg ? "/" + r.arg : "");
      doc.title = out.title + " · ASI History Archive";
      jumpTo(0);
      try { host.focus({ preventScroll: true }); } catch (e) {}
      onShow.forEach(function (f) { try { f(); } catch (e) {} });
      setBg(out.era || null);
      paintMore();
      return;
    }
    if (curKey === null) return;
    /* leaving a page: the main page comes back where it was, unless the link names a section */
    curKey = null;
    host.hidden = true; host.innerHTML = ""; growLists = {};
    doc.title = baseTitle;
    setBg(null);
    paintMore();
    if (/^#\/(person|watch)\//.test(location.hash)) return; /* people.js takes it from here */
    if (main) main.hidden = false;
    var h = location.hash, target = h && h.length > 1 && h.charAt(1) !== "/" ? doc.getElementById(h.slice(1)) : null;
    if (target && window.XGoTo) XGoTo(target);
    else if (target) target.scrollIntoView({ block: "start" });
    else if (mainY != null) jumpTo(mainY);
    if (!target) mainY = null;
  };
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  /* boot.js: draw the current #/ page again if the first route did not */
  window.XPagesRoute = function () { lastHash = null; route(); };

  /* clicks inside a page */
  var home = function (fn) {
    location.hash = "#/";
    route();
    setTimeout(fn, 60);
  };
  host.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-pg-entry],[data-pg-mile],[data-pg-pred],[data-grow-more]");
    if (!t) return;
    e.preventDefault();
    if (t.hasAttribute("data-grow-more")) { growMore(t); return; }
    if (t.hasAttribute("data-pg-entry")) { var id = t.getAttribute("data-pg-entry"); home(function () { if (window.ArchiveSite && ArchiveSite.gotoEntry) ArchiveSite.gotoEntry(id); }); return; }
    if (t.hasAttribute("data-pg-pred")) { var pid = t.getAttribute("data-pg-pred"); home(function () { if (window.ArchiveSite && ArchiveSite.gotoPred) ArchiveSite.gotoPred(pid); }); return; }
    if (t.hasAttribute("data-pg-mile")) {
      var mid = t.getAttribute("data-pg-mile");
      home(function () { var d = doc.querySelector('#historyApp .x-hi__dot[data-go="' + (window.CSS && CSS.escape ? CSS.escape(mid) : mid) + '"]'); if (d) d.click(); else if (window.XGoTo) XGoTo("history"); });
    }
  });
  /* ---------------------------------------------------------------------
     Era backgrounds and the Customize panel (saved on this device)
     --------------------------------------------------------------------- */
  var CZK = "asiArchive.customize.v1", cz = {};
  try { cz = JSON.parse(localStorage.getItem(CZK) || "{}") || {}; } catch (e) { cz = {}; }
  if (["none", "auto", "early", "deep", "post"].indexOf(cz.bg) < 0) cz.bg = "auto";
  if (["soft", "strong"].indexOf(cz.scrim) < 0) cz.scrim = "strong";
  if (["system", "calm"].indexOf(cz.motion) < 0) cz.motion = "system";
  var saveCz = function () { try { localStorage.setItem(CZK, JSON.stringify(cz)); } catch (e) {} };
  var bgl = doc.createElement("div"); bgl.className = "x-bgl"; bgl.hidden = true; bgl.setAttribute("aria-hidden", "true");
  doc.body.insertBefore(bgl, doc.body.firstChild);
  var pageEra = null, bgShown = null;
  var setBg = function (era) {
    pageEra = era;
    var want = cz.bg === "none" ? null : cz.bg === "auto" ? era : cz.bg;
    root.style.setProperty("--x-scrim", cz.scrim === "soft" ? "72%" : "88%");
    if (want === bgShown) { bgl.hidden = !want; root.classList.toggle("x-has-bg", !!want); return; }
    bgShown = want;
    bgl.innerHTML = "";
    if (want) { var im = eraImg(want); if (im) { im.alt = ""; im.style.cssText = "width:100%;height:100%;object-fit:cover;max-width:none"; bgl.appendChild(im); } }
    bgl.hidden = !want;
    root.classList.toggle("x-has-bg", !!want);
  };
  var applyMotion = function () { root.classList.toggle("x-calm", cz.motion === "calm"); };
  applyMotion(); setBg(null);

  var czDlg = null, czFrom = null;
  var opt = function (name, val, label, cur, sw) {
    return '<label><input type="radio" name="' + name + '" value="' + val + '"' + (val === cur ? " checked" : "") + " />" + (sw ? '<span class="x-cz__sw" data-sw="' + sw + '"></span>' : "") + esc(label) + "</label>";
  };
  var openCz = function () {
    czFrom = doc.activeElement;
    if (!czDlg) {
      czDlg = doc.createElement("dialog");
      czDlg.className = "x-cz"; czDlg.setAttribute("aria-labelledby", "czT");
      doc.body.appendChild(czDlg);
      czDlg.addEventListener("change", function (e) {
        var t = e.target;
        if (t.name === "czBg") { cz.bg = t.value; saveCz(); bgShown = undefined; setBg(pageEra); }
        else if (t.name === "czScrim") { cz.scrim = t.value; saveCz(); setBg(pageEra); }
        else if (t.name === "czMotion") { cz.motion = t.value; saveCz(); applyMotion(); }
        else if (t.name === "czKw" && window.XHL) XHL.setOn(t.checked);
      });
      czDlg.addEventListener("click", function (e) {
        if (e.target === czDlg || e.target.closest("[data-cz-close]")) czDlg.close();
        else if (e.target.closest("[data-cz-reset]")) { cz = { bg: "auto", scrim: "strong", motion: "system" }; saveCz(); if (window.XHL) XHL.setOn(true); if (window.XVoice && XVoice.reset) XVoice.reset(); applyMotion(); bgShown = undefined; setBg(pageEra); fill(); }
      });
      czDlg.addEventListener("close", function () { if (czFrom && czFrom.focus && doc.contains(czFrom)) czFrom.focus({ preventScroll: true }); });
    }
    var fill = function () {
      czDlg.innerHTML = '<form method="dialog" class="x-cz__in">' +
        '<div class="x-cz__head"><h2 id="czT">Customize</h2><button type="button" class="btn" data-cz-close>Done</button></div>' +
        '<fieldset><legend>Background</legend><div class="x-cz__opts">' + opt("czBg", "none", "None", cz.bg) + opt("czBg", "auto", "Era pages only", cz.bg) +
          opt("czBg", "early", "Early computing", cz.bg, "early") + opt("czBg", "deep", "Deep learning", cz.bg, "deep") + opt("czBg", "post", "After ChatGPT", cz.bg, "post") + "</div>" +
          '<p class="x-cz__hint">A fixed picture behind the page. It never changes on its own.</p></fieldset>' +
        '<fieldset><legend>Background strength</legend><div class="x-cz__opts">' + opt("czScrim", "strong", "Subtle", cz.scrim) + opt("czScrim", "soft", "Stronger", cz.scrim) + "</div></fieldset>" +
        '<fieldset><legend>Motion</legend><div class="x-cz__opts">' + opt("czMotion", "system", "Follow my device", cz.motion) + opt("czMotion", "calm", "Calm: no animation", cz.motion) + "</div></fieldset>" +
        (window.XHL ? '<fieldset><legend>Keywords</legend><div class="x-cz__opts"><label><input type="checkbox" name="czKw"' + (XHL.isOn() ? " checked" : "") + ' />Highlight keywords</label></div><p class="x-cz__hint">Colours people, organisations, topics and years in summaries, quotes, history and answers, each linking to its page.</p></fieldset>' : "") +
        (window.XVoice && XVoice.ok ? '<fieldset><legend>Reading voice</legend><div class="x-cz__voice">' + XVoice.pickers() + '</div><p class="x-cz__hint">Used by every Listen button on the site, the Kids’ corner, quotes and Ask answers. The natural voice downloads only when you pick it.</p></fieldset>' : "") +
        '<div class="x-cz__foot"><button type="button" class="btn" data-cz-reset>Reset</button><button type="button" class="btn" data-cz-close>Done</button></div></form>';
      czDlg.querySelectorAll(".x-cz__sw[data-sw]").forEach(function (s) {
        var i = doc.querySelector('#x-era-imgs img[data-era="' + s.getAttribute("data-sw") + '"]');
        if (i) { var c = i.cloneNode(true); c.removeAttribute("loading"); c.alt = ""; c.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:5px"; s.appendChild(c); }
      });
    };
    fill();
    czDlg.showModal();
    var f = czDlg.querySelector("input:checked"); if (f) f.focus({ preventScroll: true });
  };
  doc.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-cz-open]")) { e.preventDefault(); closeMore(); openCz(); } });

  /* ---------------------------------------------------------------------
     The nav: a More menu on desktop, the same links in the phone Sections sheet
     --------------------------------------------------------------------- */
  var nav = doc.querySelector("header.nav"), more = null, moreBtn = null, moreMenu = null;
  var MENU = [["#/ask", "ask", "Ask the Archive"], ["#/topics", "tag", "Topics"], ["#/policy", "columns", "Policy & governance"], ["#/safety", "shield", "Safety & alignment"], ["#/era/early", "oldclock", "Early era", "–2011"], ["#/era/deep", "network", "Deep learning era", "2012–22"], ["#/era/post", "llm", "After ChatGPT", "2022–"],
    ["#/quotes", "quote", "Quotes"], ["#/timeline", "scroll", "Full timeline"], ["#/compare", "compare", "Compare people"], ["#/stats", "stats", "Stats"], ["#/about", "info", "About"]];
  var menuLinks = function () { return MENU.map(function (m) { return '<li><a href="' + m[0] + '"><span class="x-more__ico" aria-hidden="true"><i class="x-ic" data-ic="' + m[1] + '"></i></span>' + esc(m[2]) + (m[3] ? "<small>" + esc(m[3]) + "</small>" : "") + "</a></li>"; }).join(""); };
  var mac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  var closeMore = function (refocus) { if (!moreMenu || moreMenu.hidden) return; moreMenu.hidden = true; moreBtn.setAttribute("aria-expanded", "false"); if (refocus) moreBtn.focus({ preventScroll: true }); };
  if (nav && !nav.querySelector(".x-more")) {
    more = doc.createElement("div"); more.className = "x-more";
    more.innerHTML = '<button type="button" class="x-more__btn" aria-expanded="false" aria-controls="x-more-menu">More <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div class="x-more__menu" id="x-more-menu" hidden><nav aria-label="More pages"><ul>' + menuLinks() + '</ul></nav><hr /><ul><li><button type="button" data-cz-open><span class="x-more__ico" aria-hidden="true"><i class="x-ic" data-ic="palette"></i></span>Customize</button></li>' +
      '<li><button type="button" data-more-search><span class="x-more__ico" aria-hidden="true"><i class="x-ic" data-ic="search"></i></span>Search everything<small>' + (mac ? "⌘K" : "Ctrl K") + "</small></button></li></ul></div>";
    var anchor = nav.querySelector(".x-search-btn") || nav.querySelector(".theme-btn");
    anchor ? nav.insertBefore(more, anchor) : nav.appendChild(more);
    moreBtn = more.querySelector(".x-more__btn"); moreMenu = more.querySelector(".x-more__menu");
    moreBtn.addEventListener("click", function () {
      var open = moreMenu.hidden;
      moreMenu.hidden = !open; moreBtn.setAttribute("aria-expanded", String(open));
      if (open) { paintMore(); var a = moreMenu.querySelector('[aria-current="page"]') || moreMenu.querySelector("a"); if (a) a.focus({ preventScroll: true }); }
    });
    moreMenu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMore();
      else if (e.target.closest("[data-more-search]")) { closeMore(); var s = nav.querySelector(".x-search-btn"); if (s) s.click(); }
    });
    moreMenu.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      var items = [].slice.call(moreMenu.querySelectorAll("a, button")), i = items.indexOf(doc.activeElement);
      var n = items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]; if (n) { e.preventDefault(); n.focus({ preventScroll: true }); }
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && moreMenu && !moreMenu.hidden) { e.preventDefault(); closeMore(true); } });
    doc.addEventListener("pointerdown", function (e) { if (moreMenu && !moreMenu.hidden && !more.contains(e.target)) closeMore(); });
  }
  var sheet = doc.getElementById("x-sheet");
  if (sheet && !sheet.querySelector(".x-sheet__more")) {
    var box = doc.createElement("div"); box.className = "x-sheet__more";
    box.innerHTML = '<p class="x-sheet__lab">More pages</p><nav aria-label="More pages"><ul>' + menuLinks().replace(/<small>.*?<\/small>/g, "") + '</ul></nav><ul><li><button type="button" class="x-sheet__cz" data-cz-open><i class="x-ic" data-ic="palette" aria-hidden="true"></i> Customize</button></li></ul>';
    sheet.appendChild(box);
    box.addEventListener("click", function (e) {
      if (e.target.closest("[data-cz-open]")) { var mb = doc.querySelector(".x-menu-btn"); if (mb && mb.getAttribute("aria-expanded") === "true") mb.click(); }
    });
  }

  /* ---------------------------------------------------------------------
     Player: while the controls are faded (idle), a tap on the bar only brings them back,
     so a hidden button never fires by surprise; a mouse hover shows them first anyway
     --------------------------------------------------------------------- */
  var swallowRoot = null;
  doc.addEventListener("pointerdown", function (e) {
    swallowRoot = null;
    if (e.pointerType === "mouse") return;
    var bar = e.target.closest && e.target.closest(".x-ap__bar"), ap = bar && bar.closest(".x-ap");
    if (ap && ap.classList.contains("is-idle")) swallowRoot = ap;
  }, true);
  doc.addEventListener("click", function (e) {
    if (!swallowRoot) return;
    var ap = e.target.closest && e.target.closest(".x-ap");
    if (ap === swallowRoot) { e.preventDefault(); e.stopPropagation(); }
    swallowRoot = null;
  }, true);
  /* YouTube captions on: keep their line small enough to sit fully inside the frame on narrow players */
  if (window.ArchivePlayer && ArchivePlayer.onCreate) {
    ArchivePlayer.onCreate(function (inst) {
      var el = inst.root; if (!el || !("MutationObserver" in window)) return;
      var was = false;
      new MutationObserver(function () {
        var on = el.classList.contains("is-ytcc");
        if (on === was) return; was = on;
        if (!on || el.getBoundingClientRect().width > 520) return;
        var p = inst.yt && inst.yt(); try { if (p && p.setOption) p.setOption("captions", "fontSize", 0); } catch (e) {}
      }).observe(el, { attributes: true, attributeFilter: ["class"] });
    });
  }

  /* first load: a page link opens straight onto its page */
  route();
})();
