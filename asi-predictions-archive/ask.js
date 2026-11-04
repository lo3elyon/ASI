/* ask.js: Ask the Archive. One retrieval engine for the full page at #/ask and the slide-out panel.
   - A BM25 index over every entry, person (with profile background), quote, talk (title, channel, summary, chapters,
     key claims), history milestone, prediction, and the text of any transcript already loaded in the player.
     It is built in a Web Worker the first time Ask opens, with synonyms, fuzzy matching, and person, year and era detection.
   - Every question gets a grounded answer composed from the top hits, each fact cited with a source chip that opens
     the card, person or talk (at its timestamp) in the page. With no match it suggests the closest people and topics.
   - Optional smart answers run an open model in the browser (WebLLM, Qwen2.5) only after the reader clicks, answering
     only from the top 8 snippets with [n] citations, streamed, with Stop.
   Chats, settings and feedback are saved on this device (localStorage). Nothing plays or speaks until pressed. */
(function () {
  "use strict";
  if (!window.Hark) return;
  var doc = document;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var data = function (id) { try { return Hark.data(id); } catch (e) { return null; } };
  var fmtT = function (s) { s = Math.max(0, Math.floor(+s || 0)); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (x < 10 ? "0" : "") + x; };
  var first = function (t, max) {
    t = String(t || "").replace(/\s+/g, " ").trim();
    var m = /^(.{30,}?[.!?])["”')\]]?\s+(?=["“(]?[A-Z0-9])/.exec(t), s = m ? m[1] : t;
    max = max || 260;
    return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : s;
  };
  var eraOf = function (y) { return !y ? -1 : y < 2012 ? 0 : y < 2022 + 10 / 12 ? 1 : 2; };
  var ERAS = ["Before deep learning", "Deep learning era", "After ChatGPT"];

  /* =====================================================================
     The engine. Self-contained: it runs inside a Web Worker (built from this function's source), or on the main
     thread when workers are unavailable.
     ===================================================================== */
  function askEngine() {
    var STOP = {};
    "a an the of on in to and or what who whom which did do does is are was were be been about with for from by say says said tell me any how why when there their they his her it its this that these those than then into as at not no can could would should will just also some more most much many very has have had i we you our your one two get got".split(" ").forEach(function (w) { STOP[w] = 1; });
    var norm = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/x-risk/g, "xrisk").replace(/p\(doom\)/g, "pdoom").replace(/human-level/g, "humanlevel"); };
    var stem = function (w) {
      if (w.length <= 4 || /^\d+$/.test(w)) return w;
      if (/ies$/.test(w)) return w.slice(0, -3) + "y";
      if (/ss$/.test(w)) return w;
      if (/ing$/.test(w) && w.length > 6) return w.slice(0, -3);
      if (/ed$/.test(w) && w.length > 5) return w.slice(0, -2);
      if (/(sh|ch|x|z)es$/.test(w)) return w.slice(0, -2);
      if (/s$/.test(w) && !/us$|is$/.test(w)) return w.slice(0, -1);
      return w;
    };
    var tok = function (s) { var out = []; norm(s).split(/[^a-z0-9]+/).forEach(function (w) { if (w.length < 2 || STOP[w]) return; out.push(stem(w)); }); return out; };
    var SYN = [["agi", "artificial general intelligence", "superintelligence", "superintelligent", "asi", "ultraintelligent", "humanlevel"],
      ["alignment", "aligned", "control problem", "corrigibility", "misalignment"],
      ["xrisk", "extinction", "existential", "catastrophic", "doom", "pdoom"],
      ["llm", "language model", "gpt", "chatgpt", "transformer"],
      ["regulation", "governance", "policy", "legislation", "treaty"],
      ["prediction", "predict", "forecast", "timeline"],
      ["neuroscience", "brain", "neuroscientist", "cortex"],
      ["skeptic", "sceptic", "doubt", "hype", "overblown"],
      ["interpretability", "mechanistic"], ["compute", "scaling", "gpu"], ["singularity", "intelligence explosion", "recursive self-improvement"]
    ].map(function (g) { var set = {}; g.forEach(function (p) { tok(p).forEach(function (t) { set[t] = 1; }); }); return Object.keys(set); });

    var docs = [], post = {}, dl = [], N = 0, avg = 1, vocab = null;
    var add = function (list) {
      list.forEach(function (d) {
        var i = docs.length;
        docs.push({ k: d.k, y: d.y || 0, er: d.er, ps: d.ps || [], st: d.st || "", tp: d.tp || "", r: d.r });
        var toks = tok([d.ti, d.ti, d.who || "", d.who || "", d.tx].join(" ")), tf = {};
        toks.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
        for (var t in tf) (post[t] || (post[t] = [])).push(i, tf[t]);
        dl[i] = toks.length || 1;
      });
      N = docs.length;
      var s = 0; for (var j = 0; j < N; j++) s += dl[j];
      avg = s / (N || 1) || 1; vocab = null;
      return N;
    };
    var lev = function (a, b, max) {
      if (Math.abs(a.length - b.length) > max) return max + 1;
      var prev = [], cur, i, j;
      for (j = 0; j <= b.length; j++) prev[j] = j;
      for (i = 1; i <= a.length; i++) {
        cur = [i]; var best = i;
        for (j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (cur[j] < best) best = cur[j]; }
        if (best > max) return max + 1;
        prev = cur;
      }
      return prev[b.length];
    };
    var fuzzy = function (t) {
      if (t.length < 4 || /^\d+$/.test(t)) return [];
      if (!vocab) vocab = Object.keys(post);
      var max = t.length >= 8 ? 2 : 1, out = [];
      for (var i = 0; i < vocab.length; i++) { var v = vocab[i]; if (v.charAt(0) !== t.charAt(0) && max < 2) continue; var d = lev(t, v, max); if (d <= max) out.push([v, d]); }
      out.sort(function (a, b) { return a[1] - b[1] || (post[b[0]].length - post[a[0]].length); });
      return out.slice(0, 3).map(function (x) { return x[0]; });
    };
    /* o: { types, eras, pids, topic, y0, y1, verified, boostP, year, decade, era, intent:{pred,talk,quote,who,status,first} } */
    var search = function (q, o) {
      o = o || {};
      var qt = tok(q), W = {}, terms = [];
      qt.forEach(function (t) { W[t] = Math.max(W[t] || 0, 1); });
      qt.forEach(function (t) { SYN.forEach(function (g) { if (g.indexOf(t) >= 0) g.forEach(function (s) { if (!W[s]) W[s] = 0.35; }); }); });
      var fz = [];
      Object.keys(W).forEach(function (t) { if (!post[t] && W[t] === 1) fuzzy(t).forEach(function (f) { if (!W[f]) { W[f] = 0.7; fz.push(f); } }); });
      var acc = new Float64Array(N), k1 = 1.2, b = 0.75;
      Object.keys(W).forEach(function (t) {
        var p = post[t]; if (!p) return;
        terms.push(t);
        var df = p.length / 2, idf = Math.log(1 + (N - df + 0.5) / (df + 0.5)), w = W[t];
        for (var i = 0; i < p.length; i += 2) { var d = p[i], tf = p[i + 1]; acc[d] += w * idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl[d] / avg)); }
      });
      var types = o.types && o.types.length ? o.types : null, eras = o.eras && o.eras.length ? o.eras : null, pids = o.pids && o.pids.length ? o.pids : null;
      var boostP = o.boostP || [], it = o.intent || {};
      var out = [];
      for (var d = 0; d < N; d++) {
        var s = acc[d], D = docs[d];
        var hasP = false;
        if (boostP.length) for (var j = 0; j < D.ps.length; j++) if (boostP.indexOf(D.ps[j]) >= 0) { hasP = true; break; }
        if (!s && !hasP) continue;
        if (types && types.indexOf(D.k) < 0) continue;
        if (eras && eras.indexOf(D.er) < 0) continue;
        if (pids) { var okP = false; for (var m = 0; m < D.ps.length; m++) if (pids.indexOf(D.ps[m]) >= 0) { okP = true; break; } if (!okP) continue; }
        if (o.topic && (" " + D.tp + " ").indexOf(" " + o.topic + " ") < 0) continue;
        if ((o.y0 || o.y1) && D.y && (D.y < (o.y0 || 0) || D.y > (o.y1 || 9999))) continue;
        if ((o.y0 > 1860 || o.y1 < 2026) && !D.y) continue;
        if (o.verified && (D.k !== "pr" || !/^(Came|Wrong|Partial)/.test(D.st))) continue;
        if (!s) s = 0.6;
        if (hasP) s = s * 2 + 2;
        if (hasP && D.k === "pe") s += 3;
        if (o.year && D.y) { var dy = Math.abs(D.y - o.year); s *= dy === 0 ? 1.7 : dy <= 2 ? 1.2 : 0.85; }
        if (o.decade && D.y) s *= D.y >= o.decade && D.y < o.decade + 10 ? 1.6 : 0.8;
        if (o.era != null && o.era >= 0) s *= D.er === o.era ? 1.5 : 0.6;
        if (it.pred) s *= D.k === "pr" ? 1.6 : D.k === "en" ? 1.1 : 0.9;
        if (it.status && D.k === "pr") s *= it.status === "Came" ? (/^Came/.test(D.st) ? 2 : 0.6) : (D.st.indexOf(it.status) === 0 ? 2.2 : 0.6);
        if (it.talk) s *= /^(ta|ch|kc|cc)$/.test(D.k) ? 1.5 : 0.9;
        if (it.quote) s *= D.k === "pq" || D.k === "kc" ? 1.4 : 1;
        if (it.who) s *= D.k === "pe" ? 1.3 : 1;
        if (D.k === "cc") s *= 0.8;
        out.push({ i: d, s: s });
      }
      out.sort(function (a, b2) { return b2.s - a.s || a.i - b2.i; });
      /* at most 3 hits from one talk or one person page */
      var per = {}, res = [];
      for (var z = 0; z < out.length && res.length < 40; z++) {
        var key = docs[out[z].i].k + ":" + docs[out[z].i].r, gk = /^(ta|ch|kc|cc)$/.test(docs[out[z].i].k) ? "v:" + docs[out[z].i].r : /^(pe|pq)$/.test(docs[out[z].i].k) ? "p:" + docs[out[z].i].r : key;
        per[gk] = (per[gk] || 0) + 1;
        if (per[gk] > 3) continue;
        res.push(out[z]);
      }
      if (it.first && res.length) { var top = res[0].s; res = res.filter(function (r) { return r.s >= top * 0.5; }).sort(function (a, b2) { return (docs[a.i].y || 9999) - (docs[b2.i].y || 9999) || b2.s - a.s; }); }
      return { hits: res, terms: terms, fuzzy: fz };
    };
    if (typeof WorkerGlobalScope !== "undefined" && typeof self !== "undefined" && self instanceof WorkerGlobalScope) {
      self.onmessage = function (e) {
        var m = e.data || {};
        if (m.op === "add") self.postMessage({ id: m.id, n: add(m.docs) });
        else if (m.op === "search") self.postMessage({ id: m.id, res: search(m.q, m.o) });
      };
    }
    return { add: add, search: search, tok: tok };
  }

  /* =====================================================================
     Documents, built once on first open, in a fixed order
     ===================================================================== */
  var TOPICS = [
    ["superintelligence", "Superintelligence", /superintelligen|\basi\b|ultraintelligen|\bagi\b|general intelligence/i],
    ["control", "The control problem", /control problem|stay in control|lose control|losing control|shut ?down|switch(ed)? (it )?off|off.?switch|corrigib|takeover|take over|disempower/i],
    ["alignment", "Alignment", /align/i],
    ["ai-risk", "AI risk & extinction", /extinct|existential|catastroph|\bdoom|p\(doom\)|x-risk/i],
    ["intelligence-explosion", "Intelligence explosion", /intelligence explosion|recursive(ly)? self|self-improv|singularity/i],
    ["forecasting", "Forecasts & timelines", /forecast|timeline|predict|\bby 20\d\d|surveyed/i],
    ["policy", "Policy & governance", /regulat|policy|governance|legislat|senate|congress|hearing|treaty|summit|executive order|\bai act\b/i],
    ["labs", "AI labs", /openai|deepmind|anthropic|\bxai\b|meta ai/i],
    ["neuroscience", "Neuroscience & the brain", /neuro|\bbrain|cortex|conscious|hippocamp/i],
    ["deep-learning", "Deep learning", /deep learning|neural net|backprop|alexnet|imagenet/i],
    ["transformers", "Transformers & LLMs", /transformer|\bgpt|large language model|\bllms?\b|chatgpt/i],
    ["scaling", "Scaling & compute", /scaling|\bcompute\b|\bgpus?\b|training run/i],
    ["interpretability", "Interpretability", /interpretab|mechanistic/i],
    ["ai-agents", "AI agents", /\bagents?\b|agentic/i],
    ["ethics", "Ethics", /\bethic|fairness|\bbias/i],
    ["skeptics", "Skeptics", /skeptic|sceptic|hype|overblown|overpopulation on mars|decades away/i]
  ];
  var tagsOf = function (t) { var o = []; TOPICS.forEach(function (x) { if (x[2].test(t)) o.push(x[0]); }); return o.join(" "); };
  var TYPE = { en: "Entry", pe: "Person", pq: "Quote", pr: "Prediction", hi: "History", ta: "Talk", ch: "Chapter", kc: "Key claim", cc: "Transcript" };
  var CAT = { entries: ["en"], talks: ["ta", "ch", "kc", "cc"], people: ["pe", "pq"], predictions: ["pr"], history: ["hi"] };

  var DOCS = null, PEOPLE = [], PBY = {}, NAMEIDX = [], VBY = {}, CAPDONE = {};
  var normN = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim(); };
  var pidOfName = function (s) { var n = normN(s); for (var i = 0; i < NAMEIDX.length; i++) if (NAMEIDX[i].full === n) return NAMEIDX[i].id; return null; };
  var build = function () {
    if (DOCS) return DOCS;
    var D = [];
    PEOPLE = (data("d-people") || []).slice();
    PEOPLE.forEach(function (p) { PBY[p.id] = p; });
    /* name index: full names, and last names that only one person has */
    var lastN = {};
    PEOPLE.forEach(function (p) { var w = normN(p.name).split(" "); var l = w[w.length - 1]; if (l && l.length >= 4) lastN[l] = (lastN[l] || 0) + 1; });
    PEOPLE.forEach(function (p) {
      var w = normN(p.name).split(" "), l = w[w.length - 1];
      NAMEIDX.push({ id: p.id, full: w.join(" "), last: lastN[l] === 1 && l.length >= 4 ? l : "" });
    });
    NAMEIDX.sort(function (a, b) { return b.full.length - a.full.length; });
    var PIDS = {}; (data("d-entries") || []).forEach(function (r) { PIDS[r.id] = r.people_ids || []; });
    var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    [data("d-early") || [], data("d-dl") || [], data("d-post") || []].forEach(function (list) {
      list.forEach(function (r) {
        var p = String(r.date || r.year || "").split("-"), y = +p[0] || 0, mo = +(p[1] || 0);
        var pr = r.prediction && (typeof r.prediction === "string" ? { text: r.prediction } : r.prediction);
        var tx = [r.summary, r.quote ? "“" + r.quote + "”" : "", pr ? "Prediction: " + pr.text : "", r.role, r.stance, r.type].filter(Boolean).join(" ");
        D.push({ k: "en", r: r.id, ti: r.title || "", who: r.person || "", tx: tx, y: y, when: mo ? MON[mo - 1] + " " + y : String(y || ""), ps: PIDS[r.id] || [],
          sum: r.summary || "", quote: r.quote || "", pred: pr ? pr.text : "", target: pr && pr.target_year, tp: tagsOf(r.title + " " + tx) });
      });
    });
    var DET = data("d-people-detail") || {};
    PEOPLE.forEach(function (p) {
      var det = DET[p.id] || {}, bg = Array.isArray(det.background) ? det.background.slice(0, 2).join(" ") : "";
      var tx = [p.role, p.org, p.bio, p.warning ? "“" + p.warning + "”" : "", (p.key_ideas || []).join(", "), p.pdoom ? "p(doom) " + p.pdoom : "", p.agi_year ? "AGI timeline " + p.agi_year : "", bg.slice(0, 1600)].filter(Boolean).join(" ");
      D.push({ k: "pe", r: p.id, ti: p.name, who: p.name, tx: tx, y: 0, ps: [p.id], role: p.role || "", org: p.org || "", bio: p.bio || first(bg), warn: p.warning || "", pdoom: p.pdoom || "", agi: p.agi_year || "", tp: tagsOf(tx) });
      (p.quotes || []).forEach(function (q, i) {
        if (!q || !q.text) return;
        var y = parseInt(String(q.year || ""), 10) || 0;
        D.push({ k: "pq", r: p.id, qi: i, ti: "Quote by " + p.name, who: p.name, tx: q.text + " " + (q.source || ""), y: y, ps: [p.id], text: q.text, src: q.source || "", tp: tagsOf(q.text) });
      });
      (det.predictions || []).forEach(function (x) {
        /* tracked ones are in predictions.json and from_entry ones are archive entries: index each claim once */
        if (!x || !x.claim || x.tracked || x.from_entry || x.status) return;
        D.push({ k: "pr", r: "pd:" + p.id, pid: p.id, ti: p.name + " predicted", who: p.name, tx: x.claim + " " + (x.status || "") + " " + (x.evidence || ""), y: +x.year_made || 0, ps: [p.id], st: x.status || "", pred: x.claim, target: x.target, ev: x.evidence || "", made: x.year_made, tp: tagsOf(x.claim) });
      });
    });
    (data("d-preds") || []).forEach(function (p) {
      var pid = pidOfName(p.who);
      D.push({ k: "pr", r: p.id, ti: p.who + " predicted", who: p.who, tx: [p.prediction, p.status, p.category, p.evidence, p.latest_development].filter(Boolean).join(" "), y: +p.year_made || 0, ps: pid ? [pid] : [], st: p.status || "",
        pred: p.prediction, target: p.target_year, ev: p.evidence || "", made: p.year_made, tp: tagsOf(p.prediction + " " + (p.evidence || "")) });
    });
    var H = data("d-history") || {};
    (H.chapters || []).forEach(function (c) {
      (c.milestones || []).forEach(function (m) {
        var y = +String(m.date || m.year || "").slice(0, 4) || 0, ps = (m.people || []).map(pidOfName).filter(Boolean);
        var tx = [m.what, m.why_it_matters, m.quote ? "“" + m.quote + "”" : "", c.title].filter(Boolean).join(" ");
        D.push({ k: "hi", r: m.id, ti: m.title || "", who: (m.people || []).join(", "), tx: tx, y: y, ps: ps, what: m.what || "", why: m.why_it_matters || "", quote: m.quote || "", tp: tagsOf(m.title + " " + tx) });
      });
    });
    var NOTES = data("d-notes") || {};
    (data("d-videos") || []).forEach(function (v) {
      var y = parseInt(String(v.d || "").slice(0, 4), 10) || 0, n = NOTES[v.id] || {};
      VBY[v.id] = v;
      var sum = n.s || v.s || "";
      D.push({ k: "ta", r: v.id, ti: v.t || "", who: v.c || "", tx: [sum, n.ww || "", v.k || ""].join(" "), y: y, ps: v.p || [], sum: sum, ch: v.c || "", tp: tagsOf((v.t || "") + " " + sum) });
      (n.ch || []).forEach(function (c) { D.push({ k: "ch", r: v.id, t: +c[0] || 0, ti: c[1] || "", who: v.c || "", tx: (v.t || "") + " " + (c[1] || ""), y: y, ps: v.p || [], talk: v.t || "", tp: tagsOf(c[1] || "") }); });
      (n.kc || []).forEach(function (c) {
        var pid = pidOfName(c[2]);
        D.push({ k: "kc", r: v.id, t: +c[0] || 0, ti: v.t || "", who: c[2] || "", tx: c[1] || "", y: y, ps: pid ? [pid] : v.p || [], talk: v.t || "", text: c[1] || "", tp: tagsOf(c[1] || "") });
      });
    });
    D.forEach(function (d) { d.er = eraOf(d.y); });
    DOCS = D;
    return D;
  };
  /* transcripts the player has loaded: about three lines per document, with the time of the first */
  var captionDocs = function () {
    var T = window.XTranscripts ? XTranscripts.loaded() : {}, out = [];
    Object.keys(T).forEach(function (id) {
      if (CAPDONE[id]) return; CAPDONE[id] = 1;
      var g = (T[id] && T[id].groups) || [], v = VBY[id] || {}, y = parseInt(String(v.d || "").slice(0, 4), 10) || 0;
      for (var i = 0; i < g.length; i += 3) {
        var txt = g.slice(i, i + 3).map(function (x) { return x.x || ""; }).join(" ");
        out.push({ k: "cc", r: id, t: +g[i].t || 0, ti: v.t || "", who: v.c || "", tx: txt, y: y, er: eraOf(y), ps: v.p || [], talk: v.t || "", text: txt, tp: tagsOf(txt) });
      }
    });
    return out;
  };
  var slim = function (list) { return list.map(function (d) { return { k: d.k, r: d.r, ti: d.ti, who: d.who, tx: d.tx, y: d.y, er: d.er, ps: d.ps, st: d.st || "", tp: d.tp }; }); };

  /* worker, or the same engine on the main thread */
  var W = null, LOCAL = null, seq = 0, waits = {}, ready = null;
  var call = function (msg) {
    return new Promise(function (res) {
      if (LOCAL) { res(msg.op === "add" ? { n: LOCAL.add(msg.docs) } : { res: LOCAL.search(msg.q, msg.o) }); return; }
      msg.id = ++seq; waits[msg.id] = res; W.postMessage(msg);
    });
  };
  var start = function () {
    if (ready) return ready;
    var D = build();
    try {
      var url = URL.createObjectURL(new Blob(["(" + askEngine.toString() + ")();"], { type: "text/javascript" }));
      W = new Worker(url);
      W.onmessage = function (e) { var m = e.data || {}, f = waits[m.id]; if (f) { delete waits[m.id]; f(m); } };
      W.onerror = function () { W = null; LOCAL = askEngine(); LOCAL.add(slim(DOCS)); Object.keys(waits).forEach(function (k) { waits[k]({ res: { hits: [], terms: [] }, n: 0 }); }); waits = {}; };
    } catch (e) { W = null; LOCAL = askEngine(); }
    ready = call({ op: "add", docs: slim(D) });
    return ready;
  };

  /* =====================================================================
     Reading the question: people, years, decades, eras and what kind of answer it wants
     ===================================================================== */
  var detect = function (q) {
    var n = " " + normN(q) + " ", ql = q.toLowerCase(), pids = [];
    NAMEIDX.forEach(function (x) {
      if (pids.indexOf(x.id) >= 0) return;
      if (n.indexOf(" " + x.full + " ") >= 0 || (x.last && n.indexOf(" " + x.last + " ") >= 0)) pids.push(x.id);
    });
    var ym = /\b(1[6-9]\d\d|20\d\d)\b(?!s)/.exec(q), dm = /\b(1[6-9]\d0|20[0-2]0)s\b/.exec(q);
    var era = /before deep learning|early era|early days|before 2012/.test(ql) ? 0 : /deep learning era/.test(ql) ? 1 : /after chatgpt|since chatgpt|post-chatgpt|post chatgpt/.test(ql) ? 2 : -1;
    var status = /came true early/.test(ql) ? "Came true early" : /came true|come true|right about|correct/.test(ql) ? "Came" : /\bwrong\b|failed|missed/.test(ql) ? "Wrong" : /not yet|still open|deadline ahead/.test(ql) ? "Not yet" : /partial/.test(ql) ? "Partially" : "";
    return {
      pids: pids, year: ym ? +ym[1] : 0, decade: dm ? +dm[1] : 0, era: era,
      intent: { pred: /predict|forecast|prophec|came true|wrong|timeline|by 20\d\d|when will/.test(ql), status: status, talk: /\btalk|video|interview|podcast|lecture|debate\b/.test(ql),
        quote: /\bquote|said|say|words\b/.test(ql), who: /^\s*who\b/.test(ql), first: /\bfirst|earliest\b/.test(ql) }
    };
  };

  /* =====================================================================
     Labels (English / বাংলা)
     ===================================================================== */
  var LBL = {
    en: { title: "Ask the Archive", sub: "Answers built only from this archive, with a source for every fact.", newChat: "New chat", chats: "Chats", searchChats: "Search chats", pin: "Pin", unpin: "Unpin", rename: "Rename", del: "Delete", exportMd: "Export Markdown", exportJson: "Export JSON",
      filters: "Filters", era: "Era", people: "People", addPerson: "Add a person", topic: "Topic", anyTopic: "Any topic", type: "Type", years: "Years", from: "From", to: "To", style: "Answer style", lang: "Language", nSources: "Sources", verified: "Only verified predictions (cites verified prediction items only; entries and history excluded)",
      send: "Ask", stop: "Stop", copy: "Copy", copied: "Copied", read: "Read aloud", regen: "Regenerate", edit: "Edit question", good: "Helpful", bad: "Not helpful", suggested: "Try asking", follow: "Follow-up questions", sourcesH: "Sources",
      placeholder: "Ask about a person, a year, a prediction or a topic…", entries: "Entries", talks: "Talks", peopleT: "People", predictions: "Predictions", history: "History",
      short: "Short", detailed: "Detailed", kids: "For kids", bullets: "Bullet points", timeline: "Timeline", noMatch: "Nothing in the archive matches that directly.", closest: "Closest people and topics", searching: "Searching the archive…",
      smart: "Smart answers (runs on your device)", smartOn: "Smart answers on", smartOff: "Turn off", smartH: "Smart answer", indexing: "Building the search index…", ready: "documents indexed", open: "Open", resetF: "Reset filters", empty: "No chats yet.", openPage: "Open in Ask page", keys: "Enter to ask · Shift+Enter for a new line · Esc stops · / focuses" },
    bn: { title: "আর্কাইভকে জিজ্ঞাসা করুন", sub: "উত্তর শুধু এই আর্কাইভ থেকে, প্রতিটি তথ্যের সূত্রসহ।", newChat: "নতুন চ্যাট", chats: "চ্যাট", searchChats: "চ্যাট খুঁজুন", pin: "পিন", unpin: "আনপিন", rename: "নাম বদলান", del: "মুছুন", exportMd: "Markdown রপ্তানি", exportJson: "JSON রপ্তানি",
      filters: "ফিল্টার", era: "যুগ", people: "ব্যক্তি", addPerson: "ব্যক্তি যোগ করুন", topic: "বিষয়", anyTopic: "যেকোনো বিষয়", type: "ধরন", years: "সাল", from: "থেকে", to: "পর্যন্ত", style: "উত্তরের ধরন", lang: "ভাষা", nSources: "সূত্র", verified: "শুধু যাচাই করা ভবিষ্যদ্বাণী (শুধু যাচাই করা ভবিষ্যদ্বাণী উদ্ধৃত হবে; এন্ট্রি ও ইতিহাস বাদ)",
      send: "জিজ্ঞাসা", stop: "থামুন", copy: "কপি", copied: "কপি হয়েছে", read: "পড়ে শোনান", regen: "আবার তৈরি করুন", edit: "প্রশ্ন সম্পাদনা", good: "সহায়ক", bad: "সহায়ক নয়", suggested: "জিজ্ঞাসা করে দেখুন", follow: "পরবর্তী প্রশ্ন", sourcesH: "সূত্র",
      placeholder: "কোনো ব্যক্তি, সাল, ভবিষ্যদ্বাণী বা বিষয় নিয়ে জিজ্ঞাসা করুন…", entries: "এন্ট্রি", talks: "আলোচনা", peopleT: "ব্যক্তি", predictions: "ভবিষ্যদ্বাণী", history: "ইতিহাস",
      short: "সংক্ষিপ্ত", detailed: "বিস্তারিত", kids: "শিশুদের জন্য", bullets: "বুলেট পয়েন্ট", timeline: "সময়রেখা", noMatch: "আর্কাইভে সরাসরি মিল পাওয়া যায়নি।", closest: "কাছাকাছি ব্যক্তি ও বিষয়", searching: "আর্কাইভ খোঁজা হচ্ছে…",
      smart: "স্মার্ট উত্তর (আপনার ডিভাইসে চলে)", smartOn: "স্মার্ট উত্তর চালু", smartOff: "বন্ধ করুন", smartH: "স্মার্ট উত্তর", indexing: "সার্চ ইনডেক্স তৈরি হচ্ছে…", ready: "নথি ইনডেক্স হয়েছে", open: "খুলুন", resetF: "ফিল্টার রিসেট", empty: "এখনো কোনো চ্যাট নেই।", openPage: "Ask পাতায় খুলুন", keys: "Enter: জিজ্ঞাসা · Shift+Enter: নতুন লাইন · Esc: থামুন · /: ফোকাস" }
  };

  /* =====================================================================
     Saved state
     ===================================================================== */
  var SK = "asiArchive.ask.v1";
  var ST = { chats: [], last: null, set: {}, fb: {} };
  try { var sv = JSON.parse(localStorage.getItem(SK) || "null"); if (sv && Array.isArray(sv.chats)) ST = { chats: sv.chats, last: sv.last || null, set: sv.set || {}, fb: sv.fb || {} }; } catch (e) {}
  var DEF = { eras: [], pids: [], topic: "", cats: ["entries", "talks", "people", "predictions", "history"], y0: 1860, y1: 2026, style: "detailed", lang: "en", n: 8, verified: false };
  Object.keys(DEF).forEach(function (k) { if (ST.set[k] == null) ST.set[k] = Array.isArray(DEF[k]) ? DEF[k].slice() : DEF[k]; });
  var S = ST.set;
  var L = function (k) { return (LBL[S.lang] || LBL.en)[k] || LBL.en[k] || k; };
  var persist = function () {
    var tries = 0;
    while (tries++ < 20) {
      try { localStorage.setItem(SK, JSON.stringify(ST)); return; }
      catch (e) {
        var drop = -1; for (var i = ST.chats.length - 1; i >= 0; i--) if (!ST.chats[i].pin) { drop = i; break; }
        if (drop < 0) return; ST.chats.splice(drop, 1);
      }
    }
  };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  var chatById = function (id) { return ST.chats.filter(function (c) { return c.id === id; })[0] || null; };

  /* =====================================================================
     Answering
     ===================================================================== */
  var optsFrom = function (s, det) {
    var types = []; (s.cats || []).forEach(function (c) { types = types.concat(CAT[c] || []); });
    return { types: types.length === 9 ? null : types, eras: s.eras, pids: s.pids, topic: s.topic, y0: +s.y0, y1: +s.y1, verified: !!s.verified,
      boostP: det.pids, year: det.year, decade: det.decade, era: det.era, intent: det.intent };
  };
  var run = function (q, s) {
    return start().then(function () {
      var extra = captionDocs();
      var p = extra.length ? (DOCS.push.apply(DOCS, extra), call({ op: "add", docs: slim(extra) })) : Promise.resolve();
      return p.then(function () {
        var det = detect(q);
        return call({ op: "search", q: q, o: optsFrom(s, det) }).then(function (m) {
          var r = m.res || { hits: [] };
          return { q: q, det: det, terms: r.terms || [], hits: (r.hits || []).map(function (h) { return { d: DOCS[h.i], s: h.s }; }).filter(function (h) { return h.d && (!s.verified || (h.d.k === "pr" && /^(Came|Wrong|Partial)/.test(h.d.st || ""))); }) };
        });
      });
    });
  };

  var stCls = function (s) { return /^Came/.test(s) ? "good" : /^Partial/.test(s) ? "amber" : /^Not yet/.test(s) ? "blue" : /^Wrong/.test(s) ? "bad" : "grey"; };
  var srcRef = function (d) { return d.k + "|" + d.r + "|" + (d.t || 0) + "|" + (d.k === "pr" && d.pid ? d.pid : ""); };
  var srcLabel = function (d) {
    var t = TYPE[d.k] || "";
    if (d.k === "pe") return t + " · " + d.ti;
    if (d.k === "ch" || d.k === "kc" || d.k === "cc") return t + " · " + fmtT(d.t) + " · " + (d.talk || d.ti);
    return t + (d.y ? " · " + d.y : "") + " · " + d.ti;
  };
  var snippet = function (d) {
    if (d.k === "en") return first(d.sum, 220);
    if (d.k === "pr") return d.pred;
    if (d.k === "pe") return first(d.bio, 200);
    if (d.k === "pq" || d.k === "kc" || d.k === "cc") return first(d.text, 260);
    if (d.k === "hi") return first(d.what, 220);
    if (d.k === "ta") return first(d.sum, 220);
    if (d.k === "ch") return "Chapter: " + d.ti;
    return first(d.tx, 200);
  };
  /* one fact per source, written from its fields; kids = shorter */
  var fact = function (d, style) {
    var kids = style === "kids", det = style === "detailed", o = "";
    if (d.k === "en") {
      o = "<b>" + esc(d.when) + "</b> · " + esc(d.who) + ": " + esc(d.ti) + ". " + esc(first(d.sum, kids ? 140 : 260));
      if (det && d.quote) o += " <q>" + esc(first(d.quote, 240)) + "</q>";
      if (!kids && d.pred) o += " <span class=\"x-ans__pred\">Prediction: " + esc(first(d.pred, 200)) + (d.target ? " (target " + esc(d.target) + ")" : "") + "</span>";
    } else if (d.k === "pr") {
      o = esc(d.who) + (d.made ? " (" + esc(d.made) + ")" : "") + " predicted: <q>" + esc(first(d.pred, kids ? 140 : 280)) + "</q> " +
        '<span class="x-ast x-ast--' + stCls(d.st) + '">' + esc(d.st || "Not fact-checked") + "</span>" + (d.target ? " · target " + esc(d.target) : "") +
        (det && d.ev ? ". " + esc(first(d.ev, 220)) : "");
    } else if (d.k === "pe") {
      o = "<b>" + esc(d.ti) + "</b>" + (d.role ? ", " + esc(d.role) : "") + (d.org ? " (" + esc(d.org) + ")" : "") + ". " + esc(first(d.bio, kids ? 120 : 240));
      if (det && d.warn) o += " <q>" + esc(d.warn) + "</q>";
      if (det && (d.pdoom || d.agi)) o += " " + [d.pdoom ? "p(doom): " + esc(d.pdoom) : "", d.agi ? "AGI: " + esc(d.agi) : ""].filter(Boolean).join(" · ") + ".";
    } else if (d.k === "pq") {
      o = esc(d.who) + (d.y ? " (" + d.y + ")" : "") + ": <q>" + esc(first(d.text, kids ? 160 : 320)) + "</q>" + (det && d.src ? " · " + esc(d.src) : "");
    } else if (d.k === "hi") {
      o = "<b>" + esc(d.y || "") + "</b>: " + esc(d.ti) + ". " + esc(first(d.what, kids ? 140 : 260));
      if (det && d.why) o += " " + esc(first(d.why, 200));
    } else if (d.k === "ta") {
      o = "Talk <q>" + esc(d.ti) + "</q> (" + esc([d.ch, d.y || ""].filter(Boolean).join(", ")) + ")" + (d.sum ? ": " + esc(first(d.sum, kids ? 140 : 240)) : ".");
    } else if (d.k === "ch") {
      o = "In <q>" + esc(d.talk) + "</q> at " + fmtT(d.t) + ", the chapter <q>" + esc(d.ti) + "</q>.";
    } else if (d.k === "kc") {
      o = "In <q>" + esc(d.talk) + "</q> at " + fmtT(d.t) + ", " + esc(d.who || "the speaker") + ": <q>" + esc(first(d.text, 260)) + "</q>";
    } else if (d.k === "cc") {
      o = "In <q>" + esc(d.talk) + "</q> at " + fmtT(d.t) + ": <q>" + esc(first(d.text, 240)) + "</q>";
    }
    return o;
  };
  var factText = function (html) { var t = doc.createElement("div"); t.innerHTML = html; return (t.textContent || "").replace(/\s+/g, " ").trim(); };
  var cite = function (n, d) { return ' <button type="button" class="x-cite" data-open="' + esc(srcRef(d)) + '" title="' + esc(srcLabel(d)) + '" aria-label="Source ' + n + ": " + esc(srcLabel(d)) + '">' + n + "</button>"; };

  var lead = function (R, cites) {
    var det = R.det, bn = S.lang === "bn", out = [];
    var prs = cites.filter(function (d) { return d.k === "pr" && d.st; });
    if (det.pids.length) {
      var p = PBY[det.pids[0]];
      if (p) out.push(bn ? esc(p.name) + " সম্পর্কে আর্কাইভে যা আছে:" : "What the archive records about <b>" + esc(p.name) + "</b>" + (p.role ? ", " + esc(p.role) : "") + ":");
    } else if (det.year) out.push(bn ? det.year + " সালের আশেপাশে আর্কাইভে যা আছে:" : "What the archive records around <b>" + det.year + "</b>:");
    else if (det.decade) out.push(bn ? det.decade + "-এর দশকে:" : "From the <b>" + det.decade + "s</b>:");
    else if (det.era >= 0) out.push(bn ? ERAS[det.era] + " যুগ থেকে:" : "From the <b>" + ERAS[det.era] + "</b> era:");
    if (prs.length >= 2) {
      var c = { good: 0, bad: 0, open: 0, part: 0 };
      prs.forEach(function (d) { var k = stCls(d.st); if (k === "good") c.good++; else if (k === "bad") c.bad++; else if (k === "amber") c.part++; else c.open++; });
      out.push(bn ? prs.length + "টি ভবিষ্যদ্বাণী: " + c.good + "টি সত্য হয়েছে, " + c.part + "টি আংশিক, " + c.bad + "টি ভুল, " + c.open + "টি এখনো খোলা।"
        : "Of the " + prs.length + " predictions below, " + c.good + " came true, " + c.part + " partly, " + c.bad + " were wrong and " + c.open + " are still open or too early to tell.");
    }
    var ys = cites.map(function (d) { return d.y; }).filter(Boolean).sort(function (a, b) { return a - b; });
    if (!out.length) out.push(bn ? "আর্কাইভের সবচেয়ে কাছের " + cites.length + "টি সূত্র" + (ys.length ? " (" + ys[0] + "–" + ys[ys.length - 1] + ")" : "") + ":"
      : "The " + cites.length + " closest sources in the archive" + (ys.length > 1 && ys[0] !== ys[ys.length - 1] ? ", from " + ys[0] + " to " + ys[ys.length - 1] : "") + ":");
    return out.join(" ");
  };
  var follows = function (R, cites) {
    var q = R.q.toLowerCase(), out = [], det = R.det;
    var p = det.pids[0] && PBY[det.pids[0]];
    if (!p) { var top = cites.filter(function (d) { return d.ps && d.ps.length; })[0]; p = top && PBY[top.ps[0]]; }
    if (p) { if (!det.intent.pred) out.push("What did " + p.name + " predict?"); else out.push("Which of " + p.name + "'s predictions came true?"); out.push("Talks with " + p.name); }
    var tp = cites.map(function (d) { return d.tp; }).join(" ").split(" ").filter(Boolean);
    var cnt = {}; tp.forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; });
    var best = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a] || (a < b ? -1 : 1); })[0];
    var tn = TOPICS.filter(function (t) { return t[0] === best; })[0];
    if (tn) out.push("How did views on " + (/^AI/.test(tn[1]) ? tn[1] : tn[1].charAt(0).toLowerCase() + tn[1].slice(1)) + " change over time?");
    if (det.intent.pred) out.push("Which predictions were wrong?"); else out.push("Which predictions came true early?");
    if (det.era !== 2) out.push("What changed after ChatGPT?");
    if (p && det.pids.length < 2) { var other = PBY["yann-lecun"] && p.id !== "yann-lecun" ? "Yann LeCun" : "Geoffrey Hinton"; out.push("How do " + p.name + " and " + other + " disagree?"); }
    return out.filter(function (x, i, a) { return a.indexOf(x) === i && x.toLowerCase() !== q; }).slice(0, 4);
  };
  var nearest = function (q) {
    var w = normN(q).split(" ").filter(function (x) { return x.length > 2; });
    var lev = function (a, b) { var d = []; for (var i = 0; i <= a.length; i++) { d[i] = [i]; for (var j = 1; j <= b.length; j++) d[i][j] = i ? Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) : j; } return d[a.length][b.length]; };
    var ppl = PEOPLE.map(function (p) {
      var parts = normN(p.name).split(" "), best = 9;
      w.forEach(function (x) { parts.forEach(function (y) { if (y.length > 2) best = Math.min(best, lev(x, y)); }); });
      return { p: p, d: best };
    }).filter(function (x) { return x.d <= 2; }).sort(function (a, b) { return a.d - b.d || a.p.name.localeCompare(b.p.name); }).slice(0, 5).map(function (x) { return x.p; });
    if (!ppl.length) ppl = ["geoffrey-hinton", "yoshua-bengio", "stuart-russell", "nick-bostrom", "yann-lecun"].map(function (id) { return PBY[id]; }).filter(Boolean);
    var tps = TOPICS.filter(function (t) { return w.some(function (x) { return t[1].toLowerCase().indexOf(x.slice(0, 4)) >= 0; }); });
    if (!tps.length) tps = TOPICS.slice(0, 6);
    return { people: ppl, topics: tps.slice(0, 6) };
  };

  /* builds the answer: html for the page, plain text for copy and read-aloud, the sources, and follow-ups */
  var compose = function (R, s) {
    var n = Math.max(1, Math.min(+s.n || 8, 12)), style = s.style || "detailed";
    /* one citation per fact: near-identical snippets (the same quote in an entry and a profile) count once */
    var seenS = {}, uniq = R.hits.filter(function (h) {
      var key = String(snippet(h.d) || h.d.ti).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 60);
      if (!key || seenS[key]) return false; seenS[key] = 1; return true;
    });
    var cites = uniq.slice(0, style === "short" ? Math.min(n, 3) : n).map(function (h) { return h.d; });
    if (!cites.length) {
      var near = nearest(R.q);
      var filtered = (s.eras && s.eras.length) || (s.pids && s.pids.length) || s.topic || s.verified || (s.cats && s.cats.length < 5) || +s.y0 > 1860 || +s.y1 < 2026;
      var html = "<p>" + esc(L("noMatch")) + " " + (filtered ? (S.lang === "bn" ? "কিছু ফিল্টার সরিয়ে আবার চেষ্টা করুন। " : "Your filters may be hiding results; try removing some. ") : "") + (S.lang === "bn" ? "এগুলো দেখতে পারেন:" : "These are the closest places to look:") + "</p>" +
        '<p class="x-ans__lab">' + esc(L("closest")) + '</p><div class="x-ans__near">' +
        near.people.map(function (p) { return '<a class="x-chipl" href="#/person/' + esc(p.id) + '">' + esc(p.name) + "</a>"; }).join("") +
        near.topics.map(function (t) { return '<a class="x-chipl x-chipl--t" href="#/topic/' + esc(t[0]) + '">' + esc(t[1]) + "</a>"; }).join("") + "</div>";
      var fol = near.people.slice(0, 2).map(function (p) { return "What did " + p.name + " predict?"; }).concat(near.topics.slice(0, 2).map(function (t) { return "What does the archive say about " + t[1].toLowerCase() + "?"; }));
      return { html: html, text: factText(html), cites: [], follow: fol, none: true };
    }
    var list = cites.map(function (d, i) { return { d: d, n: i + 1, h: fact(d, style) }; });
    var body = "";
    var L1 = "<p>" + lead(R, cites) + "</p>";
    if (style === "timeline") {
      var tl = list.slice().sort(function (a, b) { return (a.d.y || 9999) - (b.d.y || 9999) || a.n - b.n; });
      body = L1 + '<ol class="x-ans__tl">' + tl.map(function (x) { return "<li><span class=\"x-ans__y\">" + esc(x.d.y || "—") + "</span><div>" + x.h + cite(x.n, x.d) + "</div></li>"; }).join("") + "</ol>";
    } else if (style === "short") {
      body = L1 + "<p>" + list.map(function (x) { return x.h + cite(x.n, x.d); }).join(" ") + "</p>";
    } else if (style === "kids") {
      body = "<p>" + (S.lang === "bn" ? "সহজ ভাষায়, আর্কাইভ যা বলে:" : "Here is what the archive says, in simple words:") + "</p><ul class=\"x-ans__list x-ans__list--kids\">" + list.map(function (x) { return "<li>" + x.h + cite(x.n, x.d) + "</li>"; }).join("") + "</ul>";
    } else if (style === "bullets") {
      body = '<ul class="x-ans__list">' + list.map(function (x) { return "<li>" + x.h + cite(x.n, x.d) + "</li>"; }).join("") + "</ul>";
    } else {
      body = L1 + '<ul class="x-ans__list">' + list.map(function (x) { return "<li>" + x.h + cite(x.n, x.d) + "</li>"; }).join("") + "</ul>";
    }
    var text = factText(body.replace(/<button[^>]*class="x-cite"[^>]*>(\d+)<\/button>/g, " [$1]"));
    return { html: body, text: text, cites: cites.map(function (d) { return { ref: srcRef(d), label: srcLabel(d), snip: snippet(d), k: d.k }; }), follow: follows(R, cites), fullCites: cites };
  };

  /* =====================================================================
     Opening a source in the page
     ===================================================================== */
  var home = function (fn) {
    var h = location.hash || "";
    if (h && h !== "#" && h !== "#/" && h.indexOf("#/") === 0) { location.hash = "#/"; setTimeout(fn, 140); } else fn();
  };
  var openRef = function (ref) {
    var p = String(ref || "").split("|"), k = p[0], r = p[1], t = +p[2] || 0, extra = p[3] || "";
    if (k === "pe" || k === "pq") { location.hash = "#/person/" + r; return; }
    if (k === "pr" && /^pd:/.test(r)) { location.hash = "#/person/" + (extra || r.slice(3)); return; }
    if (/^(ta|ch|kc|cc)$/.test(k)) {
      if (window.ArchivePlayer && ArchivePlayer.watch) { var v = VBY[r] || {}; ArchivePlayer.watch(r, t > 0 ? { title: v.t || "", at: t } : { title: v.t || "" }); }
      return;
    }
    home(function () {
      if (k === "en" && window.ArchiveSite && ArchiveSite.gotoEntry) ArchiveSite.gotoEntry(r);
      else if (k === "pr" && window.ArchiveSite && ArchiveSite.gotoPred) ArchiveSite.gotoPred(r);
      else if (k === "hi") {
        var d = doc.querySelector('#historyApp .x-hi__dot[data-go="' + (window.CSS && CSS.escape ? CSS.escape(r) : r) + '"]');
        if (d) d.click(); else if (window.XGoTo) XGoTo("history");
      }
    });
  };
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-open]");
    if (b && b.closest(".x-askp, .x-ask")) { e.preventDefault(); openRef(b.getAttribute("data-open")); }
  });

  /* =====================================================================
     Smart answers: WebLLM, loaded only after a click
     ===================================================================== */
  var LLM = { eng: null, state: "off", model: "", size: "", pct: 0, text: "", on: false, busy: false, stop: null, note: "" };
  var pickModel = function () {
    var low = navigator.deviceMemory && navigator.deviceMemory <= 4;
    return navigator.gpu.requestAdapter().then(function (a) {
      if (!a) throw new Error("no-adapter");
      var f16 = a.features && a.features.has("shader-f16"), q = f16 ? "q4f16_1" : "q4f32_1";
      return low ? { id: "Qwen2.5-0.5B-Instruct-" + q + "-MLC", size: "about 400 MB", small: true, q: q } : { id: "Qwen2.5-1.5B-Instruct-" + q + "-MLC", size: f16 ? "about 1 GB" : "about 1.3 GB", small: false, q: q };
    });
  };
  var loadLLM = function () {
    if (LLM.state === "loading" || LLM.state === "ready") return;
    LLM.state = "loading"; LLM.pct = 0; LLM.text = ""; paintSmart();
    var M = null;
    pickModel().then(function (m) {
      M = m; LLM.model = m.id; LLM.size = m.size; paintSmart();
      return import("https://esm.run/@mlc-ai/web-llm");
    }).then(function (webllm) {
      var cb = function (r) { LLM.pct = Math.round((r.progress || 0) * 100); LLM.text = r.text || ""; paintSmart(); };
      return webllm.CreateMLCEngine(M.id, { initProgressCallback: cb }).catch(function (e) {
        if (M.small) throw e;
        LLM.model = "Qwen2.5-0.5B-Instruct-" + M.q + "-MLC"; LLM.size = "about 400 MB"; paintSmart();
        return webllm.CreateMLCEngine(LLM.model, { initProgressCallback: cb });
      });
    }).then(function (eng) { LLM.eng = eng; LLM.state = "ready"; LLM.on = true; paintSmart(); })
      .catch(function (e) { LLM.state = "error"; LLM.note = (e && e.message ? e.message : "unknown error").slice(0, 120); paintSmart(); });
  };
  var STYLE_HINT = { short: "Answer in 2 or 3 sentences.", detailed: "Answer thoroughly in one to three short paragraphs.", kids: "Use simple words a 10-year-old understands and short sentences.",
    bullets: "Answer as a bulleted list, one fact per bullet.", timeline: "Answer as a chronological list, one line per item: 'YEAR — fact [n]'." };
  var smartAnswer = function (msg, cites, onTok, onDone) {
    var srcs = cites.slice(0, 8).map(function (d, i) { return "[" + (i + 1) + "] (" + (TYPE[d.k] || "") + (d.y ? ", " + d.y : "") + ") " + d.ti + (d.who ? " — " + d.who : "") + ": " + factText(fact(d, "detailed")).slice(0, 520); }).join("\n");
    var sys = "You are Ask the Archive, a careful assistant for an archive about the history of AI and superintelligence predictions. Answer ONLY from the numbered sources the user gives. " +
      "Cite every claim with its source number in square brackets, like [2]. If the sources do not answer the question, say so in one sentence and say what they do cover. Never invent facts, names, dates or numbers. " +
      (STYLE_HINT[S.style] || "") + (S.lang === "bn" ? " Write the whole answer in Bengali (বাংলা); keep names and the [n] citations as they are." : "");
    var stopped = false, acc = "";
    LLM.busy = true; LLM.stop = function () { stopped = true; try { LLM.eng.interruptGenerate(); } catch (e) {} };
    paintBusy();
    var finish = function () { LLM.busy = false; LLM.stop = null; paintBusy(); onDone(acc, stopped); };
    LLM.eng.chat.completions.create({ messages: [{ role: "system", content: sys }, { role: "user", content: "Sources:\n" + srcs + "\n\nQuestion: " + msg.q }], stream: true, temperature: 0.2, max_tokens: S.style === "short" ? 220 : 600 })
      .then(function (it) {
        var iter = it[Symbol.asyncIterator]();
        var step = function () {
          return iter.next().then(function (r) {
            if (r.done || stopped) { finish(); return; }
            var c = r.value && r.value.choices && r.value.choices[0], d = c && c.delta && c.delta.content;
            if (d) { acc += d; onTok(acc); }
            return step();
          });
        };
        return step();
      }).catch(function () { finish(); });
  };
  var smartHtml = function (txt, cites) {
    return "<p>" + esc(txt).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br />").replace(/\[(\d{1,2})\]/g, function (m, n) {
      var c = cites[+n - 1]; return c ? '<button type="button" class="x-cite" data-open="' + esc(c.ref) + '" title="' + esc(c.label) + '" aria-label="Source ' + n + '">' + n + "</button>" : m;
    }) + "</p>";
  };

  /* =====================================================================
     The page
     ===================================================================== */
  var SUGG = [
    ["Before deep learning", ["What did I. J. Good say about an intelligence explosion?", "Who first warned about losing control of machines?", "What did Alan Turing predict?", "Which early predictions came true late?"]],
    ["Deep learning era", ["What did Nick Bostrom argue in Superintelligence?", "Why did Andrew Ng compare AI risk to overpopulation on Mars?", "What happened when AlphaGo beat Lee Sedol?", "What did Stuart Russell say about the control problem?"]],
    ["After ChatGPT", ["What did Geoffrey Hinton warn after leaving Google?", "What did the 2023 extinction statement say?", "Which predictions came true early?", "What do skeptics say after ChatGPT?"]]
  ];
  var P = null; /* the mounted page */
  var curChat = function () { return chatById(ST.last); };
  var pendingSeed = null;

  var msgHtml = function (m, chat) {
    if (m.r === "u") return '<div class="x-am x-am--u" data-mid="' + esc(m.id) + '"><p>' + esc(m.q) + '</p><button type="button" class="x-am__edit" data-a="edit" aria-label="' + esc(L("edit")) + '">✎ ' + esc(L("edit")) + "</button></div>";
    if (m.pending) return '<article class="x-am x-am--b" data-mid="' + esc(m.id) + '"><p class="x-am__wait">' + esc(L("searching")) + "</p></article>";
    var fb = ST.fb[m.id] || 0;
    var src = m.cites && m.cites.length ? '<details class="x-am__src"' + (P && P.wide ? " open" : "") + "><summary>" + esc(L("sourcesH")) + " (" + m.cites.length + ")</summary><ol>" + m.cites.map(function (c, i) {
      return '<li><button type="button" class="x-srcc" data-open="' + esc(c.ref) + '"><small><b>' + (i + 1) + "</b> " + esc(c.label) + "</small><span>" + (window.XHL ? XHL.mark(esc(c.snip), m.q) : esc(c.snip)) + "</span></button></li>";
    }).join("") + "</ol></details>" : "";
    return '<article class="x-am x-am--b" data-mid="' + esc(m.id) + '">' +
      (m.smart != null ? '<div class="x-am__smart' + (m.smartDone ? " x-kw-scope" : "") + '"><p class="x-am__lab">✨ ' + esc(L("smartH")) + " · " + esc(m.model || "") + "</p>" + smartHtml(m.smart, m.cites || []) + "</div>" : "") +
      '<div class="x-am__body x-kw-scope">' + m.html + "</div>" + src +
      '<div class="x-am__acts" role="group" aria-label="Answer actions">' +
        '<button type="button" class="x-am__b" data-a="copy">⧉ <span>' + esc(L("copy")) + "</span></button>" +
        '<button type="button" class="x-am__b" data-a="read" aria-pressed="false">🔊 <span>' + esc(L("read")) + "</span></button>" +
        '<button type="button" class="x-am__b" data-a="up" aria-pressed="' + (fb === 1) + '" aria-label="' + esc(L("good")) + '">👍</button>' +
        '<button type="button" class="x-am__b" data-a="down" aria-pressed="' + (fb === -1) + '" aria-label="' + esc(L("bad")) + '">👎</button>' +
        '<button type="button" class="x-am__b" data-a="regen">↻ <span>' + esc(L("regen")) + "</span></button></div>" +
      (m.follow && m.follow.length ? '<div class="x-am__fol"><p class="x-am__lab">' + esc(L("follow")) + "</p>" + m.follow.map(function (f) { return '<button type="button" class="x-f" data-a="ask" data-q="' + esc(f) + '">' + esc(f) + "</button>"; }).join("") + "</div>" : "") +
      "</article>";
  };
  var suggHtml = function () {
    var era = P ? P.era : 2;
    return '<div class="x-askp__sugg"><p class="x-am__lab">' + esc(L("suggested")) + '</p><div class="x-askp__tabs" role="group" aria-label="' + esc(L("era")) + '">' +
      SUGG.map(function (s, i) { return '<button type="button" class="x-f" data-a="era" data-i="' + i + '" aria-pressed="' + (i === era) + '">' + esc(s[0]) + "</button>"; }).join("") + "</div>" +
      '<div class="x-askp__chips">' + SUGG[era][1].map(function (q) { return '<button type="button" class="x-f" data-a="ask" data-q="' + esc(q) + '">' + esc(q) + "</button>"; }).join("") + "</div></div>";
  };
  var paintLog = function () {
    if (!P) return;
    var c = curChat(), log = P.el.querySelector(".x-askp__log");
    log.innerHTML = c && c.msgs.length ? c.msgs.map(function (m) { return msgHtml(m, c); }).join("") : '<div class="x-askp__hello"><p>' + esc(L("sub")) + "</p></div>" + suggHtml();
    paintRead();
  };
  var paintChats = function () {
    if (!P) return;
    var q = (P.chatQ || "").toLowerCase();
    var list = ST.chats.filter(function (c) { return !q || (c.title + " " + c.msgs.map(function (m) { return m.q || ""; }).join(" ")).toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.ts - a.ts; });
    P.el.querySelector(".x-askp__chats").innerHTML = list.length ? list.map(function (c) {
      var d = new Date(c.ts);
      return '<li class="x-askp__chat' + (c.id === ST.last ? " is-cur" : "") + '" data-id="' + esc(c.id) + '">' +
        (P.renaming === c.id ? '<input class="x-input" data-a="renin" value="' + esc(c.title) + '" aria-label="' + esc(L("rename")) + '" />'
          : '<button type="button" class="x-askp__open" data-a="open"' + (c.id === ST.last ? ' aria-current="true"' : "") + ">" + (c.pin ? "📌 " : "") + esc(c.title) + "<small>" + d.toLocaleDateString(S.lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short" }) + " · " + Math.ceil(c.msgs.length / 2) + "</small></button>") +
        '<span class="x-askp__cacts"><button type="button" data-a="pin" aria-label="' + esc(c.pin ? L("unpin") : L("pin")) + '" title="' + esc(c.pin ? L("unpin") : L("pin")) + '">📌</button><button type="button" data-a="ren" aria-label="' + esc(L("rename")) + '" title="' + esc(L("rename")) + '">✎</button><button type="button" data-a="del" aria-label="' + esc(L("del")) + '" title="' + esc(L("del")) + '">🗑</button></span></li>';
    }).join("") : '<li class="x-askp__none">' + esc(L("empty")) + "</li>";
    var inp = P.el.querySelector('[data-a="renin"]'); if (inp) { inp.focus(); inp.select(); }
  };
  var paintSmart = function () {
    if (!P) return;
    var box = P.el.querySelector(".x-askp__smart"); if (!box) return;
    var h = "";
    if (LLM.state === "off") h = '<div class="x-askp__smartoff"><button type="button" class="btn" data-a="smart">✨ ' + esc(L("smart")) + "</button>" +
      '<p class="fineprint x-askp__size">' + (S.lang === "bn" ? "ঐচ্ছিক: একটি ওপেন মডেল একবার ডাউনলোড হয় (প্রায় ৪০০ MB থেকে ১.৩ GB), তারপর আপনার ব্রাউজারেই চলে।" : "Optional: downloads an open model once (about 400 MB to 1.3 GB, picked for your device), then runs in your browser. Nothing downloads until you confirm.") + "</p></div>";
    else if (LLM.state === "ask") h = '<div class="x-askp__note"><p><b>' + esc(L("smart")) + ".</b> " + (S.lang === "bn" ? "একটি ওপেন মডেল (Qwen2.5) আপনার ব্রাউজারে ডাউনলোড হয়ে চলবে; প্রশ্ন কোথাও পাঠানো হয় না। আকার: " : "An open model (Qwen2.5) downloads once into your browser and runs on your device; no question leaves it. Download size: ") + esc(LLM.size) + (S.lang === "bn" ? "। এরপর ক্যাশে থাকে।" : ", then cached for next time. Archive answers keep working either way.") + '</p><div class="links"><button type="button" class="btn" data-a="smartgo">' + (S.lang === "bn" ? "ডাউনলোড করে চালু করুন" : "Download and turn on") + '</button><button type="button" class="btn" data-a="smartno">' + (S.lang === "bn" ? "বাতিল" : "Cancel") + "</button></div></div>";
    else if (LLM.state === "nogpu") h = '<div class="x-askp__note"><p>' + (S.lang === "bn" ? "এই ব্রাউজারে WebGPU নেই, তাই স্মার্ট উত্তর চলবে না। আর্কাইভের উত্তর আগের মতোই কাজ করবে।" : "This browser has no WebGPU, so smart answers cannot run here. Try a recent Chrome or Edge on a computer. Archive answers keep working as before.") + '</p><button type="button" class="btn" data-a="smartno">OK</button></div>';
    else if (LLM.state === "loading") h = '<div class="x-askp__note"><p>' + (S.lang === "bn" ? "মডেল ডাউনলোড হচ্ছে" : "Downloading the model") + " (" + esc(LLM.model || "…") + ", " + esc(LLM.size || "") + "): " + LLM.pct + '%</p><progress max="100" value="' + LLM.pct + '"></progress><p class="fineprint">' + esc(LLM.text) + "</p></div>";
    else if (LLM.state === "error") h = '<div class="x-askp__note"><p>' + (S.lang === "bn" ? "মডেল লোড হয়নি: " : "The model could not load: ") + esc(LLM.note) + (S.lang === "bn" ? "। আর্কাইভের উত্তর চালু আছে।" : ". Archive answers keep working.") + '</p><button type="button" class="btn" data-a="smartno">OK</button></div>';
    else if (LLM.state === "ready") h = '<p class="x-askp__on"><span class="dot">' + esc(LLM.on ? L("smartOn") : L("smart")) + "</span> <small>" + esc(LLM.model) + '</small> <button type="button" class="btn" data-a="smarttog">' + esc(LLM.on ? L("smartOff") : L("smartOn")) + "</button></p>";
    box.innerHTML = h;
  };
  var paintBusy = function () {
    if (!P) return;
    var busy = !!(LLM.busy || P.searching);
    P.el.querySelector('[data-a="stop"]').hidden = !LLM.busy;
    P.el.querySelector(".x-askp__send").disabled = busy;
  };
  var paintRead = function () {
    if (!P) return;
    P.el.querySelectorAll('[data-a="read"]').forEach(function (b) {
      var mid = b.closest("[data-mid]").getAttribute("data-mid"), on = window.XVoice && XVoice.isSpeaking("ask:" + mid);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.querySelector("span").textContent = on ? L("stop") : L("read");
    });
  };
  if (window.XVoice && XVoice.on) XVoice.on(paintRead);

  var optHtml = function () {
    var chk = function (attr, val, label, on) { return '<label class="x-askp__ck"><input type="checkbox" data-f="' + attr + '" value="' + esc(val) + '"' + (on ? " checked" : "") + " /> " + esc(label) + "</label>"; };
    var sel = function (attr, list, cur) { return '<select class="x-input" data-f="' + attr + '">' + list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(cur) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"; };
    return '<div class="x-askp__f"><p class="x-am__lab">' + esc(L("style")) + "</p>" + sel("style", [["short", L("short")], ["detailed", L("detailed")], ["kids", L("kids")], ["bullets", L("bullets")], ["timeline", L("timeline")]], S.style) + "</div>" +
      '<div class="x-askp__f"><p class="x-am__lab">' + esc(L("lang")) + "</p>" + sel("lang", [["en", "English"], ["bn", "বাংলা"]], S.lang) + "</div>" +
      '<div class="x-askp__f"><p class="x-am__lab">' + esc(L("nSources")) + "</p>" + sel("n", [[3, "3"], [5, "5"], [8, "8"], [12, "12"]], S.n) + "</div>" +
      '<fieldset class="x-askp__f"><legend class="x-am__lab">' + esc(L("type")) + "</legend>" + [["entries", L("entries")], ["talks", L("talks")], ["people", L("peopleT")], ["predictions", L("predictions")], ["history", L("history")]].map(function (t) { return chk("cat", t[0], t[1], S.cats.indexOf(t[0]) >= 0); }).join("") + "</fieldset>" +
      '<fieldset class="x-askp__f"><legend class="x-am__lab">' + esc(L("era")) + "</legend>" + ERAS.map(function (e, i) { return chk("era", i, e, S.eras.indexOf(i) >= 0); }).join("") + "</fieldset>" +
      '<div class="x-askp__f"><p class="x-am__lab">' + esc(L("topic")) + "</p>" + sel("topic", [["", L("anyTopic")]].concat(TOPICS.map(function (t) { return [t[0], t[1]]; })), S.topic) + "</div>" +
      '<div class="x-askp__f"><p class="x-am__lab">' + esc(L("people")) + '</p><div class="x-askp__pchips">' + S.pids.map(function (id) { var p = PBY[id]; return p ? '<button type="button" class="x-f" aria-pressed="true" data-a="prm" data-id="' + esc(id) + '">' + esc(p.name) + " ×</button>" : ""; }).join("") + "</div>" +
        '<div class="x-pac"><input class="x-input" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="x-askp-pl" data-f="padd" placeholder="' + esc(L("addPerson")) + '" aria-label="' + esc(L("addPerson")) + '" autocomplete="off" spellcheck="false" />' +
        '<ul class="x-pac__list" id="x-askp-pl" role="listbox" aria-label="' + esc(L("addPerson")) + '" hidden></ul></div></div>' +
      '<div class="x-askp__f"><p class="x-am__lab">' + esc(L("years")) + ' <output data-o="yr">' + S.y0 + "–" + S.y1 + "</output></p>" +
        '<label class="x-askp__rng">' + esc(L("from")) + ' <input type="range" min="1860" max="2026" step="1" value="' + S.y0 + '" data-f="y0" /></label>' +
        '<label class="x-askp__rng">' + esc(L("to")) + ' <input type="range" min="1860" max="2026" step="1" value="' + S.y1 + '" data-f="y1" /></label></div>' +
      chk("verified", "1", L("verified"), S.verified) +
      '<div class="links"><button type="button" class="btn" data-a="resetf">' + esc(L("resetF")) + "</button></div>";
  };
  var shell = function () {
    return '<div class="x-askp__grid">' +
      '<details class="x-askp__side x-askp__box"' + (P.wide ? " open" : "") + "><summary>" + esc(L("chats")) + '</summary><div class="x-askp__boxin">' +
        '<button type="button" class="btn x-askp__new" data-a="new">＋ ' + esc(L("newChat")) + "</button>" +
        '<input class="x-input" type="search" data-a="chatq" placeholder="' + esc(L("searchChats")) + '" aria-label="' + esc(L("searchChats")) + '" />' +
        '<ul class="x-askp__chats"></ul>' +
        '<div class="links"><button type="button" class="btn" data-a="md">' + esc(L("exportMd")) + '</button><button type="button" class="btn" data-a="json">' + esc(L("exportJson")) + "</button></div></div></details>" +
      '<section class="x-askp__main" aria-label="' + esc(L("title")) + '">' +
        '<div class="head"><p class="head__eyebrow">Ask</p><h2>' + esc(L("title")) + '</h2><p class="head__sub">' + esc(L("sub")) + "</p></div>" +
        '<div class="x-askp__smart"></div>' +
        '<div class="x-askp__log" aria-live="polite"></div>' +
        '<form class="x-askp__form"><label class="x-askp__sr" for="x-askp-q">' + esc(L("placeholder")) + '</label><textarea class="x-input" id="x-askp-q" rows="2" placeholder="' + esc(L("placeholder")) + '"></textarea>' +
          '<div class="x-askp__sendrow"><button type="button" class="btn" data-a="stop" hidden>■ ' + esc(L("stop")) + '</button><button type="submit" class="btn x-askp__send">' + esc(L("send")) + "</button></div></form>" +
        '<p class="fineprint">' + esc(L("keys")) + ' · <span data-o="idx">' + esc(L("indexing")) + "</span></p>" +
      "</section>" +
      '<details class="x-askp__opts x-askp__box"' + (P.wide ? " open" : "") + "><summary>" + esc(L("filters")) + '</summary><div class="x-askp__boxin x-askp__optsin">' + optHtml() + "</div></details>" +
    "</div>";
  };
  var newChat = function (title) {
    var c = { id: uid(), title: title || L("newChat"), pin: false, ts: Date.now(), msgs: [] };
    ST.chats.push(c); ST.last = c.id; persist(); return c;
  };
  var answer = function (chat, q, replaceIdx) {
    var bot = { r: "b", id: uid(), q: q, pending: true };
    if (replaceIdx != null) chat.msgs[replaceIdx] = bot; else chat.msgs.push(bot);
    P && (P.searching = true); paintLog(); paintBusy(); scrollEnd();
    var settings = JSON.parse(JSON.stringify(S));
    return run(q, settings).then(function (R) {
      var A = compose(R, settings);
      delete bot.pending;
      bot.html = A.html; bot.text = A.text; bot.cites = A.cites; bot.follow = A.follow; bot.style = settings.style;
      chat.ts = chat.ts || Date.now(); persist();
      if (P) P.searching = false;
      paintLog(); paintBusy(); paintChats(); scrollEnd();
      if (LLM.state === "ready" && LLM.on && A.fullCites && A.fullCites.length) {
        bot.smart = ""; bot.model = LLM.model; bot.smartDone = false; paintLog();
        smartAnswer(bot, A.fullCites, function (txt) {
          bot.smart = txt;
          var el = P && P.el.querySelector('[data-mid="' + bot.id + '"] .x-am__smart');
          if (el) el.innerHTML = '<p class="x-am__lab">✨ ' + esc(L("smartH")) + " · " + esc(bot.model) + "</p>" + smartHtml(txt, bot.cites);
        }, function (txt, stopped) { bot.smart = txt + (stopped ? " …" : ""); bot.smartDone = true; persist(); paintLog(); });
      }
    }).catch(function () {
      delete bot.pending; bot.html = "<p>" + esc(L("noMatch")) + "</p>"; bot.text = L("noMatch"); bot.cites = []; bot.follow = [];
      if (P) P.searching = false; paintLog(); paintBusy();
    });
  };
  var ask = function (q) {
    q = String(q || "").trim(); if (!q || !P) return;
    var c = curChat();
    if (!c) c = newChat(q.slice(0, 60));
    if (!c.msgs.length && (c.title === LBL.en.newChat || c.title === LBL.bn.newChat)) c.title = q.slice(0, 60);
    c.msgs.push({ r: "u", id: uid(), q: q });
    persist(); paintChats();
    answer(c, q);
  };
  var scrollEnd = function () {
    if (!P) return;
    var last = P.el.querySelector(".x-askp__log > :last-child");
    if (last && last.getBoundingClientRect().bottom > innerHeight) last.scrollIntoView({ block: "nearest", behavior: doc.documentElement.classList.contains("x-calm") || matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  var download = function (name, text, type) {
    var a = doc.createElement("a"), url = URL.createObjectURL(new Blob([text], { type: type }));
    a.href = url; a.download = name; doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };
  var chatMd = function (c) {
    var out = ["# " + c.title, "", "_Ask the Archive · " + new Date(c.ts).toISOString().slice(0, 10) + "_", ""];
    c.msgs.forEach(function (m) {
      if (m.r === "u") out.push("## " + m.q, "");
      else if (!m.pending) {
        if (m.smart) out.push("**Smart answer (" + (m.model || "") + "):** " + m.smart, "");
        out.push(m.text || "", "");
        if (m.cites && m.cites.length) { out.push("Sources:"); m.cites.forEach(function (s, i) { out.push((i + 1) + ". " + s.label + " — " + s.snip); }); out.push(""); }
      }
    });
    return out.join("\n");
  };
  var copyText = function (t, btn) {
    var done = function () { var s = btn.querySelector("span"); if (s) { s.textContent = L("copied"); setTimeout(function () { s.textContent = L("copy"); }, 1500); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () {});
    else { var ta = doc.createElement("textarea"); ta.value = t; doc.body.appendChild(ta); ta.select(); try { doc.execCommand("copy"); done(); } catch (e) {} ta.remove(); }
  };
  var msgCtx = function (el) {
    var c = curChat(), mid = el.closest("[data-mid]") && el.closest("[data-mid]").getAttribute("data-mid");
    if (!c || !mid) return null;
    for (var i = 0; i < c.msgs.length; i++) if (c.msgs[i].id === mid) return { c: c, m: c.msgs[i], i: i };
    return null;
  };
  var stopAll = function () { if (LLM.stop) LLM.stop(); if (window.XVoice && XVoice.isSpeaking()) XVoice.stop(); };

  var onClick = function (e) {
    var b = e.target.closest("[data-a]"); if (!b || !P || !P.el.contains(b)) return;
    var a = b.getAttribute("data-a"), li = b.closest(".x-askp__chat"), id = li && li.getAttribute("data-id");
    if (a === "ask") { e.preventDefault(); ask(b.getAttribute("data-q")); }
    else if (a === "era") { P.era = +b.getAttribute("data-i"); paintLog(); }
    else if (a === "new") { stopAll(); newChat(); paintChats(); paintLog(); P.el.querySelector("textarea").focus(); }
    else if (a === "open") { stopAll(); ST.last = id; persist(); paintChats(); paintLog(); }
    else if (a === "pin") { var c1 = chatById(id); c1.pin = !c1.pin; persist(); paintChats(); }
    else if (a === "ren") { P.renaming = id; paintChats(); }
    else if (a === "del") {
      var c2 = chatById(id); if (!c2) return;
      var bn = S.lang === "bn";
      var doDel = function () { ST.chats = ST.chats.filter(function (x) { return x.id !== id; }); if (ST.last === id) ST.last = ST.chats.length ? ST.chats[ST.chats.length - 1].id : null; persist(); paintChats(); paintLog(); };
      if (window.XConfirm) XConfirm({ title: bn ? "চ্যাট মুছবেন?" : "Delete this chat?", text: "“" + c2.title + "”" + (bn ? " এই ডিভাইস থেকে মুছে যাবে।" : " will be removed from this device."), ok: bn ? "মুছুন" : "Delete", cancel: bn ? "বাতিল" : "Cancel", anchor: b }).then(function (yes) {
        if (!yes) return; doDel();
        var nb = P && P.el.querySelector('[data-a="new"]'); if (nb && (!doc.activeElement || doc.activeElement === doc.body || !doc.contains(doc.activeElement))) nb.focus({ preventScroll: true });
      });
    }
    else if (a === "md") { var c3 = curChat(); if (c3) download("ask-the-archive-" + c3.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) + ".md", chatMd(c3), "text/markdown"); }
    else if (a === "json") download("ask-the-archive-chats.json", JSON.stringify({ exported: new Date().toISOString(), chats: ST.chats }, null, 2), "application/json");
    else if (a === "stop") stopAll();
    else if (a === "copy") { var x = msgCtx(b); if (x) copyText((x.m.smart ? x.m.smart + "\n\n" : "") + x.m.text + (x.m.cites && x.m.cites.length ? "\n\nSources:\n" + x.m.cites.map(function (s, i) { return (i + 1) + ". " + s.label; }).join("\n") : ""), b); }
    else if (a === "read") { var y = msgCtx(b); if (y && window.XVoice) { if (XVoice.isSpeaking("ask:" + y.m.id)) XVoice.stop(); else XVoice.speak(y.m.smart || y.m.text, { id: "ask:" + y.m.id }); } }
    else if (a === "up" || a === "down") { var z = msgCtx(b); if (z) { var v = a === "up" ? 1 : -1; if (ST.fb[z.m.id] === v) delete ST.fb[z.m.id]; else ST.fb[z.m.id] = v; persist(); paintLog(); } }
    else if (a === "regen") { var g = msgCtx(b); if (g) { stopAll(); answer(g.c, g.m.q, g.i); } }
    else if (a === "edit") { var h = msgCtx(b); if (h) { stopAll(); h.c.msgs.splice(h.i); persist(); paintLog(); var ta = P.el.querySelector("textarea"); ta.value = h.m.q; ta.focus(); } }
    else if (a === "smart") { if (!navigator.gpu) { LLM.state = "nogpu"; paintSmart(); return; } pickModel().then(function (m) { LLM.size = m.size; LLM.model = m.id; LLM.state = "ask"; paintSmart(); }, function () { LLM.state = "nogpu"; paintSmart(); }); }
    else if (a === "smartgo") { LLM.state = "off"; loadLLM(); }
    else if (a === "smartno") { LLM.state = LLM.eng ? "ready" : "off"; paintSmart(); }
    else if (a === "smarttog") { LLM.on = !LLM.on; paintSmart(); }
    else if (a === "acpick") acPick(+b.getAttribute("data-i"));
    else if (a === "prm") { S.pids = S.pids.filter(function (p) { return p !== b.getAttribute("data-id"); }); persist(); repaintOpts(); }
    else if (a === "resetf") { ["eras", "pids", "topic", "cats", "y0", "y1", "n", "verified"].forEach(function (k) { S[k] = Array.isArray(DEF[k]) ? DEF[k].slice() : DEF[k]; }); persist(); repaintOpts(); }
  };
  var repaintOpts = function () { if (P) P.el.querySelector(".x-askp__optsin").innerHTML = optHtml(); };
  /* "Add a person": a combobox with a listbox of matching people (arrows + Enter or a click adds a chip, Esc closes) */
  var AC = { items: [], act: -1 };
  var acEls = function () { var inp = P && P.el.querySelector('[data-f="padd"]'), list = P && P.el.querySelector("#x-askp-pl"); return inp && list ? { inp: inp, list: list } : null; };
  var acClose = function () {
    var e = acEls(); AC.items = []; AC.act = -1; if (!e) return;
    e.list.hidden = true; e.list.innerHTML = ""; e.inp.setAttribute("aria-expanded", "false"); e.inp.removeAttribute("aria-activedescendant");
  };
  var acSet = function (i) {
    var e = acEls(); if (!e || !AC.items.length) return;
    AC.act = (i + AC.items.length) % AC.items.length;
    [].forEach.call(e.list.children, function (li, k) { li.setAttribute("aria-selected", String(k === AC.act)); });
    var cur = e.list.children[AC.act]; e.inp.setAttribute("aria-activedescendant", cur.id);
    var lt = e.list.scrollTop, top = cur.offsetTop, bot = top + cur.offsetHeight;
    if (top < lt) e.list.scrollTop = top; else if (bot > lt + e.list.clientHeight) e.list.scrollTop = bot - e.list.clientHeight;
  };
  var acPaint = function () {
    var e = acEls(); if (!e) return;
    var n = normN(e.inp.value); if (!n) { acClose(); return; }
    var pool = PEOPLE.length ? PEOPLE : (data("d-people") || []), hits = [];
    pool.forEach(function (p) {
      if (S.pids.indexOf(p.id) >= 0) return;
      var nm = normN(p.name), k = nm.indexOf(n); if (k < 0) return;
      hits.push([k === 0 ? 0 : nm.charAt(k - 1) === " " ? 1 : 2, p]);
    });
    hits.sort(function (a, b) { return a[0] - b[0] || a[1].name.localeCompare(b[1].name); });
    AC.items = hits.slice(0, 8).map(function (h) { return h[1]; });
    if (!AC.items.length) { acClose(); return; }
    e.list.innerHTML = AC.items.map(function (p, i) {
      return '<li role="option" id="x-askp-po-' + i + '" aria-selected="false" data-a="acpick" data-i="' + i + '">' + esc(p.name) + (p.role ? "<small>" + esc(first(p.role, 60)) + "</small>" : "") + "</li>";
    }).join("");
    e.list.hidden = false; e.inp.setAttribute("aria-expanded", "true"); e.list.scrollTop = 0;
    acSet(0);
  };
  var acPick = function (i) {
    var p = AC.items[i]; if (!p) return;
    acClose();
    if (S.pids.indexOf(p.id) < 0) { S.pids.push(p.id); persist(); }
    repaintOpts();
    var inp = P.el.querySelector('[data-f="padd"]'); if (inp) inp.focus({ preventScroll: true });
  };
  var onChange = function (e) {
    var t = e.target, f = t.getAttribute && t.getAttribute("data-f"); if (!f || !P) return;
    if (f === "style") S.style = t.value;
    else if (f === "n") S.n = +t.value;
    else if (f === "topic") S.topic = t.value;
    else if (f === "verified") S.verified = t.checked;
    else if (f === "lang") { S.lang = t.value; persist(); remount(); return; }
    else if (f === "cat" || f === "era") {
      var key = f === "cat" ? "cats" : "eras", val = f === "era" ? +t.value : t.value;
      S[key] = S[key].filter(function (x) { return x !== val; }); if (t.checked) S[key].push(val);
      if (f === "cat" && !S.cats.length) { S.cats = DEF.cats.slice(); repaintOpts(); }
    } else if (f === "padd") {
      var pid = pidOfName(t.value); if (pid && S.pids.indexOf(pid) < 0) { S.pids.push(pid); persist(); repaintOpts(); P.el.querySelector('[data-f="padd"]').focus(); return; }
    } else if (f === "y0" || f === "y1") {
      S[f] = +t.value; if (S.y0 > S.y1) { if (f === "y0") S.y1 = S.y0; else S.y0 = S.y1; }
      var o = P.el.querySelector('[data-o="yr"]'); if (o) o.textContent = S.y0 + "–" + S.y1;
      P.el.querySelectorAll('[data-f="y0"],[data-f="y1"]').forEach(function (r) { r.value = S[r.getAttribute("data-f")]; });
    }
    persist();
  };
  var onInput = function (e) {
    var t = e.target;
    if (t.getAttribute("data-f") === "padd") acPaint();
    else if (t.getAttribute("data-a") === "chatq") { P.chatQ = t.value; paintChats(); t.focus(); }
    else if (t.getAttribute("data-f") === "y0" || t.getAttribute("data-f") === "y1") onChange(e);
  };
  var onKey = function (e) {
    var t = e.target;
    if (t.getAttribute("data-f") === "padd" && !e.isComposing) {
      var open = AC.items.length > 0;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!open) acPaint(); else acSet(AC.act + (e.key === "ArrowDown" ? 1 : -1)); }
      else if (e.key === "Enter") { e.preventDefault(); if (open && AC.act >= 0) acPick(AC.act); else { var pd = pidOfName(t.value); if (pd && S.pids.indexOf(pd) < 0) { S.pids.push(pd); persist(); repaintOpts(); var ni = P.el.querySelector('[data-f="padd"]'); if (ni) ni.focus(); } } }
      else if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); acClose(); }
      else if (e.key === "Tab") acClose();
      return;
    }
    if (t.matches("textarea") && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); var v = t.value; t.value = ""; ask(v); }
    else if (t.getAttribute("data-a") === "renin" && (e.key === "Enter" || e.key === "Escape")) {
      e.preventDefault(); var c = chatById(P.renaming); if (c && e.key === "Enter" && t.value.trim()) c.title = t.value.trim().slice(0, 80); P.renaming = null; persist(); paintChats();
    }
  };
  var remount = function () { if (P) { var el = P.el; P = null; mountPage(el); } };
  var mountPage = function (el) {
    P = { el: el, era: 2, chatQ: "", renaming: null, searching: false, wide: matchMedia("(min-width: 1100px)").matches };
    if (!el.__xask) {
      el.__xask = 1;
      el.addEventListener("click", onClick);
      el.addEventListener("change", onChange);
      el.addEventListener("input", onInput);
      el.addEventListener("keydown", onKey);
      el.addEventListener("mousedown", function (e) { if (e.target.closest && e.target.closest(".x-pac__list")) e.preventDefault(); });
      el.addEventListener("focusout", function (e) { if (e.target.getAttribute && e.target.getAttribute("data-f") === "padd" && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".x-pac__list"))) setTimeout(acClose, 0); });
      el.addEventListener("focusout", function (e) { if (e.target.getAttribute && e.target.getAttribute("data-a") === "renin" && P && P.renaming) { var c = chatById(P.renaming); if (c && e.target.value.trim()) c.title = e.target.value.trim().slice(0, 80); P.renaming = null; persist(); setTimeout(paintChats, 0); } });
      el.querySelector || 0;
    }
    build();
    el.innerHTML = shell();
    el.querySelector(".x-askp__form").addEventListener("submit", function (e) { e.preventDefault(); var ta = el.querySelector("textarea"), v = ta.value; ta.value = ""; ask(v); });
    if (!curChat() && ST.chats.length) ST.last = ST.chats[ST.chats.length - 1].id;
    paintChats(); paintLog(); paintSmart(); paintBusy();
    start().then(function (m) { var o = el.querySelector('[data-o="idx"]'); if (o) o.textContent = ((m && m.n) || DOCS.length).toLocaleString("en-US") + " " + L("ready"); });
    if (pendingSeed) { var s = pendingSeed; pendingSeed = null; newChat(s.slice(0, 60)); paintChats(); ask(s); }
  };
  /* keyboard on the page: / focuses the question, Esc stops a streaming answer or the voice */
  window.addEventListener("keydown", function (e) {
    if (!P || !doc.contains(P.el) || P.el.closest("[hidden]")) return;
    var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && !doc.querySelector("dialog[open]")) { e.preventDefault(); e.stopImmediatePropagation(); P.el.querySelector("textarea").focus(); }
    else if (e.key === "Escape" && (LLM.busy || (window.XVoice && XVoice.isSpeaking()))) stopAll();
  }, true);

  /* =====================================================================
     The slide-out panel: same engine, short answers
     ===================================================================== */
  var panelSay = function (q, log) {
    log.insertAdjacentHTML("beforeend", '<p class="x-msg-u">' + esc(q) + "</p>");
    var box = doc.createElement("div"); box.className = "x-msg-b"; box.innerHTML = "<p>" + esc(L("searching")) + "</p>";
    log.appendChild(box); log.scrollTop = log.scrollHeight;
    var s = JSON.parse(JSON.stringify(S)); s.style = s.style === "detailed" ? "short" : s.style; s.n = Math.min(+s.n || 5, 5);
    run(q, s).then(function (R) {
      var A = compose(R, s);
      box.innerHTML = '<div class="x-kw-scope x-ans--panel">' + A.html + "</div>" +
        (A.cites.length ? '<div class="x-ans__srcs">' + A.cites.map(function (c, i) { return '<button type="button" class="x-srcc x-srcc--mini" data-open="' + esc(c.ref) + '"><small><b>' + (i + 1) + "</b> " + esc(c.label) + "</small></button>"; }).join("") + "</div>" : "") +
        (A.follow.length ? '<div class="x-row" style="flex-wrap: wrap">' + A.follow.slice(0, 3).map(function (f) { return '<button class="x-f" type="button" data-ask="' + esc(f) + '">' + esc(f) + "</button>"; }).join("") + "</div>" : "") +
        '<p><a class="link" href="#/ask" data-ask-seed="' + esc(q) + '">' + esc(L("openPage")) + " →</a></p>";
      log.scrollTop = log.scrollHeight;
    });
  };
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-ask-seed]"); if (!a) return;
    var q = a.getAttribute("data-ask-seed");
    if (location.hash === "#/ask" && P) { e.preventDefault(); newChat(q.slice(0, 60)); paintChats(); ask(q); return; }
    pendingSeed = q;
  });

  var boot = function () {
    var lg = doc.getElementById("askLog");
    if (lg) lg.innerHTML = '<div class="x-msg-b"><p>Ask about a person, a year, a prediction or a topic. Answers come only from this archive, with a numbered source for every fact. For filters, saved chats and smart answers, open the <a class="link" href="#/ask">Ask page</a>.</p></div>';
    var sm = doc.querySelector(".x-ask__head small"); if (sm) sm.textContent = "Answers from the archive, with sources";
    /* the nav's Ask link, beside More */
    var nav = doc.querySelector("header.nav");
    if (nav && !nav.querySelector(".x-nav-ask")) {
      var a = doc.createElement("a"); a.className = "x-more__btn x-nav-ask"; a.href = "#/ask"; a.textContent = "Ask";
      var more = nav.querySelector(".x-more") || nav.querySelector(".x-search-btn") || nav.querySelector(".theme-btn");
      more ? nav.insertBefore(a, more) : nav.appendChild(a);
    }
  };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();

  window.XAsk = { mountPage: mountPage, panelSay: panelSay, stop: function () { if (LLM.stop) LLM.stop(); P = null; }, run: run, compose: compose, engine: askEngine };
})();
