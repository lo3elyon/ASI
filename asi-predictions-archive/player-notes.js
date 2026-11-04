/* Player notes for every ArchivePlayer (Theater, watch page, centred window, pop-out):
   chapters, transcript and summary tabs in the info panel, chapter marks on the seek bar,
   and site-drawn captions from the transcript. Never starts playback on its own; only the caption line
   and the transcript highlight follow playback. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer;
  if (!AP || !AP.onCreate) return;

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = AP.fmt || function (s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); };
  var keep = AP.keepScroll || function (f) { return f(); };
  var reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var readJSON = function (id) { try { var n = document.getElementById(id); return n ? JSON.parse(n.textContent || "null") : null; } catch (e) { return null; } };
  var CAP_URL = "https://lo3elyon.github.io/ASI/ai-safety-full-episodes/data/captions/";
  var PROV = "Chapters, summary and transcript from the AI Safety Full Episodes pipeline (auto captions; not independently verified).";

  /* ---------- data: the notes and the caption list are inline blocks, parsed on first use ---------- */
  var NOTES = null, CAPS = null;
  var notesOf = function (id) { if (!NOTES) NOTES = readJSON("d-notes") || {}; return (id && NOTES[id]) || null; };
  var capSet = function () {
    if (!CAPS) { CAPS = {}; (readJSON("d-capids") || []).forEach(function (id) { CAPS[id] = 1; }); }
    return CAPS;
  };

  /* ---------- transcripts: fetched once per video per session, only when that video opens ---------- */
  var TR = {};
  /* read-only view of the transcripts loaded so far, so Ask the Archive can search their text */
  window.XTranscripts = { loaded: function () { var o = {}; Object.keys(TR).forEach(function (k) { if (TR[k].state === "ok") o[k] = TR[k].data; }); return o; } };
  var INST = [];
  var groupCues = function (cues) {
    var out = [], cur = null;
    cues.forEach(function (c) {
      if (!cur) cur = { t: c[0], x: c[1] }; else cur.x += " " + c[1];
      if (cur.x.length >= 150 || (cur.x.length >= 50 && /[.!?]["')\]]?$/.test(c[1]))) { out.push(cur); cur = null; }
    });
    if (cur) out.push(cur);
    return out;
  };
  /* Auto captions roll: each cue often repeats the previous cue's last line before adding new words, which showed
     the first caption line twice. Strip the longest run of words a cue shares with the end of the previous one
     (whole previous cue, or 3+ words); a cue with nothing new is dropped. */
  var norm = function (w) { return w.toLowerCase().replace(/[^a-z0-9']/g, ""); };
  var dedupe = function (c) {
    var out = [], prev = null;
    c.forEach(function (x) {
      var words = x[1].split(" ");
      if (prev) {
        var pw = prev.split(" "), max = Math.min(pw.length, words.length), cut = 0;
        for (var k = max; k >= 1; k--) {
          if (k < 3 && k !== pw.length && k !== words.length) break;
          var ok = true;
          for (var j = 0; j < k; j++) { if (norm(pw[pw.length - k + j]) !== norm(words[j])) { ok = false; break; } }
          if (ok) { cut = k; break; }
        }
        if (cut) words = words.slice(cut);
      }
      var text = words.join(" ").trim();
      if (!text) return;
      if (out.length && x[0] - out[out.length - 1][0] < 0.05) out[out.length - 1][1] += " " + text;
      else out.push([x[0], text]);
      prev = x[1];
    });
    return out;
  };
  var parseTr = function (d) {
    var c = (d && Array.isArray(d.c) ? d.c : []).filter(function (x) { return Array.isArray(x) && isFinite(+x[0]) && typeof x[1] === "string" && x[1].trim(); })
      .map(function (x) { return [+x[0], x[1].replace(/\s+/g, " ").trim()]; });
    if (!c.length) return null;
    c.sort(function (a, b) { return a[0] - b[0]; });
    /* the files count tenths of a second: spoken lines sit about two seconds apart, so a median gap of 8 or more means tenths */
    var gaps = [];
    for (var i = 1; i < c.length; i++) gaps.push(c[i][0] - c[i - 1][0]);
    gaps.sort(function (a, b) { return a - b; });
    var med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
    if (med >= 8 || c[c.length - 1][0] > 6 * 3600) c.forEach(function (x) { x[0] = x[0] / 10; });
    c = dedupe(c);
    if (!c.length) return null;
    var groups = groupCues(c);
    return { cues: c, starts: c.map(function (x) { return x[0]; }), groups: groups, gStarts: groups.map(function (g) { return g.t; }) };
  };
  var getTr = function (id, cb) {
    var r = TR[id];
    if (r) { if (r.state === "loading") r.waits.push(cb); else cb(r); return; }
    r = TR[id] = { state: "loading", waits: [cb] };
    var settle = function (data) {
      /* a talk outside the caption list whose file exists after all gets site captions too */
      if (data) { r.state = "ok"; r.data = data; capSet()[id] = 1; } else r.state = "fail";
      var w = r.waits; r.waits = [];
      w.forEach(function (f) { try { f(r); } catch (e) {} });
      if (r.state === "fail") INST.forEach(function (i) { var v = i.current(); if (v && v.id === id) i._pnFail(); });
    };
    if (!window.fetch) { settle(null); return; }
    var ctl = window.AbortController ? new AbortController() : null, to = 0;
    if (ctl) to = setTimeout(function () { ctl.abort(); }, 20000);
    fetch(CAP_URL + encodeURIComponent(id) + ".json", ctl ? { signal: ctl.signal } : undefined)
      .then(function (res) { if (!res.ok) throw new Error("http"); return res.json(); })
      .then(function (d) { clearTimeout(to); settle(parseTr(d)); })
      .catch(function () { clearTimeout(to); settle(null); });
  };
  var chStarts = function (n) { return n.__st || (n.__st = n.ch.map(function (c) { return +c[0]; })); };
  var trOf = function (id) { var r = TR[id]; return r && r.state === "ok" ? r.data : null; };
  var hasCC = function (id) { return !!(id && capSet()[id] && !(TR[id] && TR[id].state === "fail")); };
  /* the last start at or before t */
  var find = function (arr, t) {
    var lo = 0, hi = arr.length - 1, ans = -1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (arr[m] <= t + 0.05) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans;
  };

  /* ---------- caption settings, shared by every player and remembered ---------- */
  /* Caption style, one object in localStorage under asi.captionStyle (the older asiArchive.captions.v1 is read once).
     Text colour and background colour are separate; background opacity applies to the background only. */
  var CK = "asi.captionStyle", CK_OLD = "asiArchive.captions.v1";
  var DEF = { on: false, preset: "classic", size: 100, color: "#ffffff", bg: "#080a0e", bgop: 62, font: "sans", edge: "none", pos: "bottom", y: null, lines: 2, kw: false, karaoke: false };
  var FONTS = { sans: ["Sans", "var(--sans)"], serif: ["Serif", "Georgia, 'Times New Roman', serif"], mono: ["Mono", "'Geist Mono', ui-monospace, Menlo, monospace"], rounded: ["Rounded", "ui-rounded, 'SF Pro Rounded', 'Varela Round', 'Nunito', system-ui, sans-serif"], wide: ["Wide", "Verdana, 'DejaVu Sans', sans-serif"] };
  var EDGES = {
    none: ["None", "none"],
    shadow: ["Shadow", "0 0.06em 0.2em rgba(0, 0, 0, 0.95), 0 0 0.45em rgba(0, 0, 0, 0.7)"],
    outline: ["Outline", "-0.06em -0.06em 0 #000, 0.06em -0.06em 0 #000, -0.06em 0.06em 0 #000, 0.06em 0.06em 0 #000, 0 0 0.12em #000"],
    glow: ["Glow", "0 0 0.18em currentColor, 0 0 0.6em color-mix(in srgb, currentColor 70%, transparent), 0 0.05em 0.1em rgba(0, 0, 0, 0.9)"]
  };
  var TEXT_SW = [["#ffffff", "White"], ["#ffe14d", "Yellow"], ["#67e8f9", "Cyan"], ["#86efac", "Green"], ["#f9a8d4", "Pink"], ["era", "Era colour"]];
  var BG_SW = [["#080a0e", "Black"], ["#1e293b", "Slate"], ["#0b3b4a", "Teal"], ["#3b0a1e", "Wine"], ["#ffffff", "White"]];
  /* [label, settings]: each preset sets the look; on/off, size and position stay the reader's */
  var PRESETS = {
    classic: ["Classic", { color: "#ffffff", bg: "#080a0e", bgop: 62, font: "sans", edge: "none", kw: false, karaoke: false }],
    neon: ["Neon", { color: "#67e8f9", bg: "#05070b", bgop: 35, font: "mono", edge: "glow", kw: true, karaoke: false }],
    era: ["Era colours", { color: "era", bg: "#080a0e", bgop: 55, font: "sans", edge: "shadow", kw: true, karaoke: false }],
    contrast: ["High contrast", { color: "#ffe14d", bg: "#000000", bgop: 100, font: "wide", edge: "outline", kw: false, karaoke: false }],
    minimal: ["Minimal", { color: "#ffffff", bg: "#080a0e", bgop: 0, font: "sans", edge: "shadow", kw: false, karaoke: false }],
    karaoke: ["Karaoke", { color: "#ffffff", bg: "#080a0e", bgop: 55, font: "rounded", edge: "shadow", kw: false, karaoke: true }]
  };
  var isHex = function (s) { return typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s); };
  var C = {};
  var loadC = function () {
    var got = null, old = null;
    try { got = JSON.parse(window.localStorage.getItem(CK)); } catch (e) {}
    if (!got) { try { old = JSON.parse(window.localStorage.getItem(CK_OLD)); } catch (e) {} }
    C = {}; Object.keys(DEF).forEach(function (k) { C[k] = DEF[k]; });
    var src = got || old;
    if (!src || typeof src !== "object") return;
    C.on = !!src.on;
    if (src.size >= 75 && src.size <= 200) C.size = Math.round(src.size / 25) * 25;
    if (FONTS[src.font]) C.font = src.font;
    if (EDGES[src.edge]) C.edge = src.edge;
    if (src.pos === "top" || src.pos === "bottom") C.pos = src.pos;
    if (typeof src.y === "number" && src.y >= 0 && src.y <= 1) C.y = src.y;
    if (got) {
      if (PRESETS[got.preset] || got.preset === "custom") C.preset = got.preset;
      if (isHex(got.color) || got.color === "era") C.color = got.color;
      if (isHex(got.bg)) C.bg = got.bg;
      if (got.bgop >= 0 && got.bgop <= 100) C.bgop = Math.round(got.bgop);
      if (got.lines >= 1 && got.lines <= 3) C.lines = Math.round(got.lines);
      C.kw = !!got.kw; C.karaoke = !!got.karaoke;
    } else {
      var oc = { white: "#ffffff", yellow: "#ffe14d", cyan: "#67e8f9", green: "#86efac" };
      if (oc[old.color]) C.color = oc[old.color];
      if (old.bg === "none") C.bgop = 0; else if (old.bg === "solid") C.bgop = 100;
      C.preset = "custom";
    }
  };
  loadC();
  var saveC = function () { try { window.localStorage.setItem(CK, JSON.stringify(C)); } catch (e) {} };
  var everywhere = function () { INST.forEach(function (i) { try { i._pnPaint(); } catch (e) {} }); };
  var LOOK = { color: 1, bg: 1, bgop: 1, font: 1, edge: 1, kw: 1, karaoke: 1 };
  var setC = function (k, v) { C[k] = v; if (LOOK[k]) C.preset = "custom"; saveC(); everywhere(); };
  var applyPreset = function (p) { var s = PRESETS[p]; if (!s) return; Object.keys(s[1]).forEach(function (k) { C[k] = s[1][k]; }); C.preset = p; saveC(); everywhere(); };
  var rgba = function (hex, op) {
    var n = parseInt(String(hex).slice(1), 16); if (!isFinite(n)) n = 0x080a0e;
    return "rgba(" + ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ", " + (Math.max(0, Math.min(100, op)) / 100).toFixed(2) + ")";
  };

  /* ---------- keywords: people in people.json and the archive's core terms, linked to their pages ---------- */
  var TERMS = [
    ["superintelligen\\w*", "superintelligence", "Superintelligence"], ["artificial general intelligence|\\bAGI\\b", "agi-timelines", "AGI"],
    ["alignment|misalign\\w*", "alignment", "Alignment"], ["control problem|\\bcontrol\\b", "control", "Control"],
    ["existential risk|extinction|\\brisks?\\b", "ai-risk", "Risk"], ["\\bsafety\\b", "ai-risk", "Safety"],
    ["interpretability", "interpretability", "Interpretability"], ["intelligence explosion|singularity", "intelligence-explosion", "Intelligence explosion"],
    ["deep learning|neural net(?:work)?s?", "deep-learning", "Deep learning"], ["large language models?|\\bLLMs?\\b|transformers?", "transformers", "LLMs"]
  ];
  /* organisations named in talks: coloured with the Labs topic, linking to it */
  var ORGS = ["OpenAI", "Anthropic", "Google DeepMind", "DeepMind", "Google Brain", "Hugging Face", "Microsoft", "xAI", "Cohere", "Nvidia",
    "Machine Intelligence Research Institute", "MIRI", "Future of Humanity Institute", "Future of Life Institute", "Center for AI Safety",
    "Redwood Research", "Apollo Research", "METR", "Open Philanthropy", "AI Safety Institute", "Mila", "Conjecture", "Safe Superintelligence"];
  var KW = null;
  var kwIndex = function () {
    if (KW) return KW;
    KW = { re: null, map: {} };
    var alts = [];
    (readJSON("d-people") || []).forEach(function (p) {
      if (!p || !p.name || !p.id || p.name.length < 5 || !/\s/.test(p.name)) return;
      var key = p.name.toLowerCase();
      if (KW.map[key]) return;
      KW.map[key] = { href: "#/person/" + p.id, kind: "person", label: p.name, g: p.group || "" };
      alts.push(p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    });
    ORGS.forEach(function (o) {
      var key = o.toLowerCase(); if (KW.map[key]) return;
      KW.map[key] = { href: "#/topic/labs", kind: "org", label: o, tc: "labs" };
      alts.push(o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
    });
    alts.sort(function (a, b) { return b.length - a.length; });
    TERMS.forEach(function (t, i) { alts.push("(?<t" + i + ">" + t[0] + ")"); });
    try { KW.re = new RegExp("\\b(?:" + alts.join("|") + ")", "gi"); } catch (e) {
      /* no named groups: terms only, matched one by one */
      KW.re = null;
    }
    return KW;
  };
  /* text → [{t, k}] with k = {href, kind, label} for a keyword */
  var kwSplit = function (text) {
    var K = kwIndex(); if (!K.re) return [{ t: text, k: null }];
    var out = [], last = 0, m;
    K.re.lastIndex = 0;
    while ((m = K.re.exec(text))) {
      if (!m[0]) { K.re.lastIndex++; continue; }
      var k = K.map[m[0].toLowerCase()] || null;
      if (!k && m.groups) { for (var i = 0; i < TERMS.length; i++) { if (m.groups["t" + i]) { var tc0 = window.XTopicColor ? XTopicColor.canon(TERMS[i][1]) : ""; k = { href: "#/topic/" + TERMS[i][1], kind: "term", label: TERMS[i][2], tc: tc0 || "" }; break; } } }
      if (!k) continue;
      if (m.index > last) out.push({ t: text.slice(last, m.index), k: null });
      out.push({ t: m[0], k: k });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ t: text.slice(last), k: null });
    return out;
  };
  /* words wrapped in <i class="w"> for the progressive tint; keywords as chips (links in the transcript, plain on video) */
  var richHtml = function (text, o) {
    o = o || {};
    var segs = o.kw === false ? [{ t: text, k: null }] : kwSplit(text), ctr = { n: 0 }, html = "";
    segs.forEach(function (s) {
      var inner;
      if (o.words) inner = s.t.split(/(\s+)/).map(function (w) { if (!w || /^\s+$/.test(w)) return w; return '<i class="w" data-w="' + (ctr.n++) + '">' + esc(w) + "</i>"; }).join("");
      else inner = esc(s.t);
      if (!s.k) html += inner;
      else if (o.link) html += '<a class="x-kw x-kw--' + s.k.kind + '" href="' + esc(s.k.href) + '" title="' + esc((s.k.kind === "person" ? "Profile: " : "Topic: ") + s.k.label) + '">' + inner + "</a>";
      else {
        /* the keyword's topic, for "Colourful words": a term's own topic, a person's group, Labs for an organisation */
        var tc = s.k.tc || "";
        if (!tc && s.k.g && window.XTopicColor && XTopicColor.group) { try { tc = XTopicColor.group(s.k.g) || ""; } catch (e) {} }
        html += '<b class="x-kw x-kw--' + s.k.kind + '"' + (tc ? ' data-tc="' + tc + '"' : "") + ">" + inner + "</b>";
      }
    });
    return { html: html, words: ctr.n };
  };

  var svg = function (d) { return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; };
  var IC_CC = svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M10.5 10.2a2 2 0 1 0 0 3.6M16.5 10.2a2 2 0 1 0 0 3.6"/>');
  var seg = function (k, map) {
    return Object.keys(map).map(function (x) { return '<button class="x-ap__b" type="button" data-pn="set" data-k="' + k + '" data-v="' + x + '" aria-pressed="false">' + map[x][0] + "</button>"; }).join("");
  };
  var settingsHtml = function (uid) {
    var sw = function (k, list) {
      return list.map(function (c) {
        var fill = c[0] === "era" ? "linear-gradient(135deg, var(--x-e0, #f59e0b), var(--x-e1, #06b6d4) 55%, var(--x-e2, #f43f5e))" : c[0];
        return '<button class="x-ap__b x-pn-sw" type="button" data-pn="set" data-k="' + k + '" data-v="' + c[0] + '" aria-pressed="false" aria-label="' + c[1] + '" title="' + c[1] + '"><span style="background:' + fill + '"></span></button>';
      }).join("");
    };
    return '<div class="x-pn-ccset" role="group" aria-label="Caption style">' +
      '<button class="x-ap__b x-pn-ccback" type="button" data-pn="ccback"><span aria-hidden="true">‹</span> Caption style</button>' +
      '<p class="x-pn-src" data-pn-out="src" aria-live="polite"></p>' +
      '<div class="x-pn-prev" aria-hidden="true"><span class="x-pn-prev__l">Captions from <b class="x-kw x-kw--person">Stuart Russell</b> on <b class="x-kw x-kw--term">alignment</b> look like this</span></div>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Captions</p><div class="x-pn-sg x-pn-sg--2">' +
        '<button class="x-ap__b" type="button" data-pn="set" data-k="on" data-v="1" aria-pressed="false">On</button>' +
        '<button class="x-ap__b" type="button" data-pn="set" data-k="on" data-v="0" aria-pressed="false">Off</button></div></div>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Preset</p><div class="x-pn-sg x-pn-sg--3">' +
        Object.keys(PRESETS).map(function (p) { return '<button class="x-ap__b" type="button" data-pn="preset" data-v="' + p + '" aria-pressed="false">' + PRESETS[p][0] + "</button>"; }).join("") + "</div></div>" +
      '<div class="x-pn-cs"><p class="x-apx-h">Font</p><div class="x-pn-sg x-pn-sg--5">' +
        Object.keys(FONTS).map(function (x) { return '<button class="x-ap__b" type="button" data-pn="set" data-k="font" data-v="' + x + '" aria-pressed="false" style="font-family:' + FONTS[x][1].replace(/"/g, "&quot;") + '">' + FONTS[x][0] + "</button>"; }).join("") + "</div></div>" +
      '<div class="x-pn-cs"><p class="x-apx-h">Size <span class="x-apx-abtx" data-pn-out="size">100%</span></p><div class="x-pn-sg x-pn-sg--2">' +
        '<button class="x-ap__b" type="button" data-pn="size" data-d="-25" aria-label="Smaller captions (−)">A−</button>' +
        '<button class="x-ap__b" type="button" data-pn="size" data-d="25" aria-label="Larger captions (+)">A+</button></div></div>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Text colour</p><div class="x-pn-sg x-pn-sg--7">' + sw("color", TEXT_SW) +
        '<label class="x-ap__b x-pn-pick" title="Any text colour"><span class="x-ap__sr">Custom text colour</span><input type="color" data-pn="pick" data-k="color" value="#ffffff" /></label></div></div>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Background colour</p><div class="x-pn-sg x-pn-sg--7">' + sw("bg", BG_SW) +
        '<label class="x-ap__b x-pn-pick" title="Any background colour"><span class="x-ap__sr">Custom background colour</span><input type="color" data-pn="pick" data-k="bg" value="#080a0e" /></label><span></span></div></div>' +
      '<div class="x-pn-cs"><label class="x-pn-range" for="' + uid + '-op"><span class="x-apx-h">Background opacity <span class="x-apx-abtx" data-pn-out="op">62%</span></span>' +
        '<input class="x-apx-range" id="' + uid + '-op" type="range" min="0" max="100" step="1" value="62" data-pn="op" aria-describedby="' + uid + '-opn" /></label>' +
        '<p class="x-pn-cnote" id="' + uid + '-opn">Only the box behind the words fades; the text stays solid.</p></div>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Outline and shadow</p><div class="x-pn-sg x-pn-sg--4">' +
        Object.keys(EDGES).map(function (x) { return '<button class="x-ap__b" type="button" data-pn="set" data-k="edge" data-v="' + x + '" aria-pressed="false">' + EDGES[x][0] + "</button>"; }).join("") + "</div></div>" +
      '<div class="x-pn-cs"><p class="x-apx-h">Lines at most</p><div class="x-pn-sg x-pn-sg--3">' +
        [1, 2, 3].map(function (n) { return '<button class="x-ap__b" type="button" data-pn="set" data-k="lines" data-v="' + n + '" aria-pressed="false">' + n + "</button>"; }).join("") + "</div></div>" +
      '<div class="x-pn-cs"><p class="x-apx-h">Highlights</p><div class="x-pn-sg x-pn-sg--2">' +
        '<button class="x-ap__b" type="button" data-pn="tog" data-k="kw" aria-pressed="false">Colour keywords</button>' +
        '<button class="x-ap__b" type="button" data-pn="tog" data-k="karaoke" aria-pressed="false">Karaoke words</button></div></div>' +
      '<div class="x-pn-cs"><p class="x-apx-h">Position</p><div class="x-pn-sg x-pn-sg--3">' +
        '<button class="x-ap__b" type="button" data-pn="set" data-k="pos" data-v="bottom" aria-pressed="false">Bottom</button>' +
        '<button class="x-ap__b" type="button" data-pn="set" data-k="pos" data-v="top" aria-pressed="false">Top</button>' +
        '<button class="x-ap__b" type="button" data-pn="posreset">Reset</button></div>' +
        '<p class="x-pn-cnote">Drag the captions on the video to move them anywhere.</p></div>' +
      '<button class="x-ap__b x-pn-ccreset" type="button" data-pn="ccreset">Reset caption style</button>' +
      "</div>";
  };

  /* ---------- panel tabs ---------- */
  /* ---------- chapters: the talk's own, else auto sections every ~5 minutes from the transcript ---------- */
  var ERAS = [["Early era", 0, "var(--x-e0, #f59e0b)"], ["Deep learning era", 4, "var(--x-e1, #06b6d4)"], ["After ChatGPT", 7, "var(--x-e2, #f43f5e)"]];
  var eraOf = function (v) { var y = AP.year ? AP.year(v && v.d) : 0; return !y ? null : y < 2012 ? ERAS[0] : y < 2023 ? ERAS[1] : ERAS[2]; };
  var chColor = function (v, i) { var e = eraOf(v), off = e ? e[1] : 5; return "var(--x-ch-" + ((off + i) % 8) + ")"; };
  var AUTO_STEP = 300;
  var sectionsOf = function (v) {
    if (!v) return null;
    var n = notesOf(v.id);
    if (n && n.ch && n.ch.length) return { auto: false, list: n.ch.map(function (c) { return { t: +c[0], x: String(c[1] || "") }; }).filter(function (c) { return isFinite(c.t); }) };
    var tr = trOf(v.id); if (!tr || !tr.groups.length) return null;
    var out = [], g = tr.groups, k = 0, last = g[g.length - 1].t;
    for (var at = 0; at <= last; at += AUTO_STEP) {
      while (k < g.length && g[k].t < at) k++;
      if (k >= g.length) break;
      if (out.length && g[k].t - out[out.length - 1].t < AUTO_STEP * 0.5) continue;
      var words = g[k].x.split(" "), title = words.slice(0, 8).join(" ").replace(/[,;:]$/, "");
      out.push({ t: at === 0 ? 0 : g[k].t, x: title + (words.length > 8 ? "…" : "") });
    }
    return out.length >= 2 ? { auto: true, list: out } : null;
  };
  var chaptersHtml = function (sec, v) {
    var e = eraOf(v);
    return '<div class="x-pn-chhead">' + (e ? '<span class="x-pn-era" style="--c:' + e[2] + '">' + e[0] + "</span>" : "") +
      '<p class="x-pn-h">' + (sec.auto ? "Auto sections · every 5 minutes, from the transcript" : sec.list.length + " chapters") + "</p></div>" +
      '<ol class="x-pn-ch" aria-label="' + (sec.auto ? "Auto sections" : "Chapters") + '">' + sec.list.map(function (c, i) {
        return '<li><button type="button" class="x-pn-row" data-pn-seek="' + c.t + '" data-i="' + i + '" style="--c:' + chColor(v, i) + '" aria-label="' + esc(fmt(c.t) + " " + c.x) + '">' +
          '<span class="x-pn-chip" aria-hidden="true">' + (i < 9 ? "0" : "") + (i + 1) + "</span>" +
          '<span class="x-pn-chbody"><span class="x-pn-chx">' + esc(c.x) + '</span><span class="x-pn-time">' + fmt(c.t) + "</span></span>" +
          '<span class="x-pn-chp" aria-hidden="true"><i></i></span></button></li>';
      }).join("") + "</ol>";
  };
  var summaryHtml = function (n) {
    var kc = (n.kc || []).filter(function (k) { return k && k[1]; });
    return '<div class="x-pn-sum">' +
      (n.s ? '<p class="x-pn-h">Summary</p><p class="x-pn-p">' + esc(n.s) + "</p>" : "") +
      (n.ww ? '<div class="x-pn-ww"><p class="x-pn-h">Why watch</p><p class="x-pn-p">' + esc(n.ww) + "</p></div>" : "") +
      (kc.length ? '<p class="x-pn-h">Key claims</p><ul class="x-pn-kc">' + kc.map(function (k) {
        var t = k[0] == null || !isFinite(+k[0]) ? null : +k[0];
        return "<li>" + (t != null ? '<button type="button" class="x-pn-tb" data-pn-seek="' + t + '" aria-label="Play from ' + fmt(t) + '">' + fmt(t) + "</button>" : '<span class="x-pn-tb x-pn-tb--none" aria-hidden="true">·</span>') +
          '<div class="x-pn-q"><q>' + esc(k[1]) + "</q>" + (k[2] ? "<small>" + esc(k[2]) + "</small>" : "") + "</div></li>";
      }).join("") + "</ul>" : "") +
      '<p class="x-pn-prov">' + PROV + "</p></div>";
  };
  var transcriptShell = function (uid) {
    return '<div class="x-pn-tr">' +
      '<div class="x-pn-trbar">' +
        '<label class="x-pn-search" for="' + uid + '-q"><span class="x-pn-sr">Search the transcript</span>' +
          '<input id="' + uid + '-q" type="search" placeholder="Search transcript" autocomplete="off" spellcheck="false" data-pn="q" /></label>' +
        '<span class="x-pn-count" data-pn-out="count" aria-live="polite"></span>' +
        '<button type="button" class="x-pn-ib" data-pn="qprev" aria-label="Previous match" title="Previous match (Shift + Enter)" disabled>↑</button>' +
        '<button type="button" class="x-pn-ib" data-pn="qnext" aria-label="Next match" title="Next match (Enter)" disabled>↓</button>' +
      "</div>" +
      '<div class="x-pn-trtools">' +
        '<button type="button" class="x-pn-btn x-pn-follow" data-pn="follow" aria-pressed="true"><span class="x-pn-dot" aria-hidden="true"></span>Follow along</button>' +
        '<button type="button" class="x-pn-btn" data-pn="copy">Copy all</button>' +
        '<button type="button" class="x-pn-btn" data-pn="dl">Download .txt</button>' +
      "</div>" +
      '<p class="x-pn-trmeta" aria-live="polite">Loading transcript…</p>' +
      '<div class="x-pn-trwrap"><div class="x-pn-list" role="list" aria-label="Transcript" tabindex="-1">' +
        '<div class="x-pn-skel" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>' +
        '<button type="button" class="x-pn-resume" data-pn="resume" hidden><span aria-hidden="true">↻</span> Resume sync</button></div>' +
      "</div>";
  };

  var uidN = 0;
  function setup(inst) {
    var root = inst.root, screen = inst.screen, bar = inst.bar;
    if (!root || !screen || root.__pn) return;
    root.__pn = true;
    var uid = "pn" + (++uidN);
    var S = { vid: "", capKey: null, chI: -2, gi: -2, follow: true, q: "", prog: 0, userAt: 0, timer: 0, chList: null, list: null, meta: null, chip: null, segD: -1,
      capN: -1, capW: 0, capS: 0, capE: 0, lineN: -1, lineW: 0, hits: [], hit: -1, chUser: 0, sec: null };
    inst._pn = S;
    INST.push(inst);
    var cur = function () { return inst.current ? inst.current() : null; };

    /* ---- the caption layer over the video ---- */
    var cap = document.createElement("div");
    cap.className = "x-pn-cap is-bottom";
    cap.setAttribute("aria-hidden", "true");
    cap.innerHTML = '<div class="x-pn-cap__win" title="Drag to move the captions"></div>';
    screen.appendChild(cap);
    var capWin = cap.firstChild;
    var sizeT = function () {
      /* about 15px on a phone or the small pop-out, 20px at 640px wide, 32px at 1280px, 36px at most, before the size setting */
      var w = screen.clientWidth || 640;
      var fs = Math.max(12, Math.min(36, 9 + w * 0.018) * C.size / 100);
      root.style.setProperty("--x-pn-fs", fs.toFixed(1) + "px");
    };
    var barH = function () { if (bar) root.style.setProperty("--x-pn-barh", (bar.offsetHeight || 0) + "px"); };
    if ("ResizeObserver" in window) {
      new ResizeObserver(sizeT).observe(screen);
      if (bar) new ResizeObserver(barH).observe(bar);
    } else window.addEventListener("resize", function () { sizeT(); barH(); });

    var paintCap = function () {
      var e = eraOf(cur());
      root.style.setProperty("--x-pn-col", C.color === "era" ? (e ? e[2] : "var(--x-e1, #06b6d4)") : C.color);
      root.style.setProperty("--x-pn-bg", rgba(C.bg, C.bgop));
      root.style.setProperty("--x-pn-font", FONTS[C.font][1]);
      root.style.setProperty("--x-pn-edge", EDGES[C.edge][1]);
      root.style.setProperty("--x-pn-lines", String(C.lines));
      cap.classList.toggle("is-kw", !!C.kw);
      cap.classList.toggle("is-karaoke", !!C.karaoke);
      cap.classList.toggle("is-nobg", C.bgop === 0);
      var free = C.y != null;
      cap.classList.toggle("is-free", free);
      cap.classList.toggle("is-top", !free && C.pos === "top");
      cap.classList.toggle("is-bottom", !free && C.pos !== "top");
      if (free) cap.style.setProperty("--x-pn-y", (C.y * 100).toFixed(2) + "%"); else cap.style.removeProperty("--x-pn-y");
      sizeT();
    };

    /* drag the caption block up or down; a tap without a drag plays or pauses, like the rest of the video */
    var drag = null;
    capWin.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) return;
      ev.preventDefault(); ev.stopPropagation();
      try { capWin.setPointerCapture(ev.pointerId); } catch (e) {}
      drag = { id: ev.pointerId, y: ev.clientY, moved: false };
    });
    capWin.addEventListener("pointermove", function (ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      if (!drag.moved && Math.abs(ev.clientY - drag.y) < 5) return;
      drag.moved = true; cap.classList.add("is-drag");
      var r = screen.getBoundingClientRect();
      /* the block's centre is kept far enough in that three lines never leave the frame */
      if (r.height > 0) { var hh = capWin.offsetHeight / 2 / r.height + 0.02; C.y = Math.max(Math.max(0.06, hh), Math.min(Math.min(0.94, 1 - hh), (ev.clientY - r.top) / r.height)); paintCap(); }
    });
    var endDrag = function (ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var moved = drag.moved; drag = null; cap.classList.remove("is-drag");
      try { capWin.releasePointerCapture(ev.pointerId); } catch (e) {}
      if (moved) { saveC(); everywhere(); }
      else if (ev.type === "pointerup" && inst.toggle) inst.toggle();
    };
    capWin.addEventListener("pointerup", endDrag);
    capWin.addEventListener("pointercancel", endDrag);
    capWin.addEventListener("click", function (ev) { ev.stopPropagation(); });

    /* ---- the CC button and the ⚙ menu's caption settings ---- */
    var ccB = function () { return root.querySelector('[data-x="cc"]'); };
    /* ---- the caption source: the site's transcript when there is one, else YouTube's own captions in the iframe ---- */
    var toastEl = document.createElement("div");
    toastEl.className = "x-pn-toast"; toastEl.setAttribute("aria-hidden", "true");
    screen.appendChild(toastEl);
    var toastT = 0;
    var toast = function (t) {
      toastEl.textContent = t; toastEl.classList.add("is-on");
      clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
      inst.say(t);
    };
    var YTNONE = AP._ytNoCC || (AP._ytNoCC = {});
    /* the actual state: a loaded transcript (or site captions on screen) wins over the "none" flag */
    /* one caption layer, always the site's: "site" (a transcript), "wait" (being fetched) or "none". YouTube's own
       captions are never turned on here; player8.js keeps them unloaded. */
    var srcOf = function (v) {
      if (!v) return "";
      if (trOf(v.id) || hasCC(v.id) || (S.capLive && S.capLive === v.id)) return "site";
      var r0 = TR[v.id];
      return r0 && r0.state === "loading" ? "wait" : "none";
    };
    /* a talk outside the caption list: ask the caption source once whether it has a file after all */
    var probe = function (v) {
      if (!v || TR[v.id] || hasCC(v.id)) return;
      getTr(v.id, function (rr) { if (rr.state === "ok") trArrived(v); });
    };
    var ytSize = function () { return C.size <= 75 ? -1 : C.size >= 175 ? 3 : Math.round((C.size - 100) / 25); };
    var Y = { key: "", size: null, tries: 0, track: false };
    var ytCall = function (f) { var p = inst.yt(); if (!p) return false; try { f(p); return true; } catch (e) { return false; } };
    var ytOff = function () {
      if (Y.key) ytCall(function (p) { if (typeof p.unloadModule === "function") p.unloadModule("captions"); });
      Y.key = ""; Y.size = null; Y.tries = 0; Y.track = false; inst._ytCC = false;
      root.classList.remove("is-ytcc");
    };
    var pickTrack = function () {
      var list = null;
      ytCall(function (p) { list = p.getOption("captions", "tracklist"); });
      if (!list || !list.length) return false;
      var en = list.filter(function (t) { return t && /^en/i.test(t.languageCode || ""); })[0];
      var t = en || list[0];
      ytCall(function (p) { p.setOption("captions", "track", t && t.languageCode ? t : { languageCode: "en" }); });
      Y.track = true; Y.lang = (t && (t.displayName || t.languageName || t.languageCode)) || "";
      paintSet();
      return true;
    };
    /* idempotent: called on every repaint, on ready, on state changes and on video change */
    /* YouTube's captions are never loaded by the site (that drew a second caption layer that C could not turn off) */
    var applyYT = function () {
      root.classList.remove("is-ytcc"); inst._ytCC = false;
      if (Y.key) ytOff();
    };
    /* while playing, look for a track: 'en', else the first one; none after about 8s of playback means none at all */
    /* YouTube fills the track list only after the captions module loads during playback (onApiChange).
       Measured in seconds of playback: at 3s with no list, load the module once more; "none" only after that, at 6s. */
    var ytTick = function () {
      if (!inst._ytCC) return;
      var v = cur(); if (!Y.key || !v || Y.key !== v.id || Y.track || !inst.isPlaying()) return;
      if (pickTrack()) return;
      var n = Date.now();
      if (Y.last && n - Y.last < 1500) Y.play = (Y.play || 0) + (n - Y.last);
      Y.last = n;
      if (Y.play >= 3000 && !Y.reload) { Y.reload = true; ytCall(function (p) { if (typeof p.loadModule === "function") p.loadModule("captions"); }); return; }
      if (Y.play >= 6000) {
        YTNONE[v.id] = 1; ytOff();
        toast("No captions for this talk");
        paintBtn(); paintSet();
      }
    };
    var paintBtn = function () {
      var b = ccB(); if (!b) return;
      var v = cur(), src = srcOf(v);
      b.setAttribute("aria-pressed", String(!!C.on));
      b.classList.remove("is-na");
      b.classList.remove("is-yt");
      var l = src === "none" ? "Captions (C): none for this talk · hold for caption style" : "Captions (C) · hold for caption style";
      b.setAttribute("aria-label", l); b.setAttribute("data-tip", l);
    };
    var menu = root.querySelector(".x-apx-menu"), setEl = null;
    if (menu) {
      var openB = '<button class="x-ap__b x-pn-ccopen" type="button" data-pn="ccmenu">' + IC_CC + '<span class="x-apx-lbl">Captions</span><span class="x-pn-ccv" aria-hidden="true"></span></button>';
      var loopB = menu.querySelector(".x-apx-loop");
      if (loopB) loopB.insertAdjacentHTML("beforebegin", openB); else menu.insertAdjacentHTML("afterbegin", openB);
      menu.insertAdjacentHTML("beforeend", settingsHtml(uid));
      setEl = menu.querySelector(".x-pn-ccset");
      if ("MutationObserver" in window) new MutationObserver(function () { if (menu.hidden) menu.classList.remove("is-pn-cc"); }).observe(menu, { attributes: true, attributeFilter: ["hidden"] });
      setEl.querySelector('[data-pn="op"]').addEventListener("input", function () { setC("bgop", +this.value); });
      setEl.querySelectorAll('[data-pn="pick"]').forEach(function (inp) { inp.addEventListener("input", function () { setC(inp.getAttribute("data-k"), inp.value.toLowerCase()); }); });
    }
    var paintSet = function () {
      if (!setEl) return;
      setEl.querySelectorAll('[data-pn="set"]').forEach(function (b) {
        var k = b.getAttribute("data-k"), v = b.getAttribute("data-v");
        var on = k === "on" ? String(C.on ? 1 : 0) === v : k === "pos" ? C.y == null && C.pos === v : String(C[k]).toLowerCase() === v.toLowerCase();
        b.setAttribute("aria-pressed", String(on));
      });
      setEl.querySelectorAll('[data-pn="preset"]').forEach(function (b) { b.setAttribute("aria-pressed", String(C.preset === b.getAttribute("data-v"))); });
      setEl.querySelectorAll('[data-pn="tog"]').forEach(function (b) { b.setAttribute("aria-pressed", String(!!C[b.getAttribute("data-k")])); });
      setEl.querySelectorAll('[data-pn="pick"]').forEach(function (inp) {
        var k = inp.getAttribute("data-k"), val = C[k];
        if (isHex(val) && document.activeElement !== inp) inp.value = val;
        inp.parentNode.setAttribute("aria-pressed", String(isHex(val) && !(k === "color" ? TEXT_SW : BG_SW).some(function (c) { return c[0].toLowerCase() === String(val).toLowerCase(); })));
      });
      var pv = setEl.querySelector(".x-pn-prev");
      if (pv) {
        var e0 = eraOf(cur());
        pv.style.setProperty("--x-pn-col", C.color === "era" ? (e0 ? e0[2] : "var(--x-e1, #06b6d4)") : C.color);
        pv.style.setProperty("--x-pn-bg", rgba(C.bg, C.bgop));
        pv.style.setProperty("--x-pn-font", FONTS[C.font][1]);
        pv.style.setProperty("--x-pn-edge", EDGES[C.edge][1]);
        pv.classList.toggle("is-kw", !!C.kw);
      }
      setEl.querySelector('[data-pn-out="size"]').textContent = C.size + "%";
      /* the label always reads the slider's own value, so the two can never disagree */
      var r = setEl.querySelector('[data-pn="op"]'); if (+r.value !== C.bgop) r.value = C.bgop;
      var opv = +r.value;
      setEl.querySelector('[data-pn-out="op"]').textContent = opv + "%";
      r.setAttribute("aria-valuetext", opv + "%");
      r.style.setProperty("--x-ap-pct", opv + "%");
      setEl.querySelector('[data-pn="size"][data-d="-25"]').disabled = C.size <= 75;
      setEl.querySelector('[data-pn="size"][data-d="25"]').disabled = C.size >= 200;
      var vv = cur(), src = srcOf(vv);
      var v = menu.querySelector(".x-pn-ccv"); if (v) v.textContent = !C.on ? "Off" : src === "none" ? "None" : "On";
      var so = setEl.querySelector('[data-pn-out="src"]');
      if (so) {
        so.setAttribute("data-src", src);
        so.textContent = src === "site" ? "Site captions · from this talk's transcript" : src === "wait" ? "Looking for this talk's captions…" : "No captions for this talk";
      }
      setEl.classList.remove("is-yt");
    };
    var setSize = function (d) {
      var n = Math.max(75, Math.min(200, C.size + d));
      if (n === C.size) { inst.say("Caption size " + n + "%"); return; }
      setC("size", n); inst.say("Caption size " + n + "%");
    };
    inst.ccToggle = function () {
      setC("on", !C.on);
      var v = cur();
      if (!C.on) { toast("Captions off"); return; }
      probe(v);
      var src = srcOf(v);
      if (src === "site") toast("Captions on");
      else if (src === "wait") toast("Captions on · looking for this talk's captions…");
      else toast("No captions for this talk");
    };
    inst.ccSize = setSize;
    /* the chapter under a time, for the seek bar's hover preview */
    var secs = function () {
      var v = cur(); if (!v) return null;
      if (S.sec && S.sec.id === v.id && (S.sec.auto === false || S.sec.n === (trOf(v.id) ? 1 : 0))) return S.sec.s;
      var s = sectionsOf(v);
      S.sec = { id: v.id, s: s, auto: s ? s.auto : true, n: trOf(v.id) ? 1 : 0 };
      if (s) s.starts = s.list.map(function (c) { return c.t; });
      return s;
    };
    inst.chapterAt = function (t) {
      var s = secs(); if (!s) return "";
      var i = find(s.starts, t);
      return i >= 0 ? s.list[i].x : "";
    };
    inst.chapterIndexAt = function (t) { var s = secs(); return s ? find(s.starts, t) : -1; };

    /* ---- chapter marks on the seek bar ---- */
    var seekEl = inst.seek, track = root.querySelector(".x-apx-track"), segs = null;
    if (track) { segs = document.createElement("span"); segs.className = "x-pn-segs"; track.insertBefore(segs, track.firstChild); }
    var placeTrack = function () {
      if (!track || !seekEl || !seekEl.offsetWidth) return;
      track.style.left = (seekEl.offsetLeft + 7) + "px";
      track.style.width = Math.max(0, seekEl.offsetWidth - 14) + "px";
    };
    if (seekEl && "ResizeObserver" in window) new ResizeObserver(placeTrack).observe(seekEl);
    var paintSegs = function () {
      if (!segs) return;
      var v = cur(), s = secs(), d = inst.duration ? inst.duration() : 0;
      S.segD = d; S.segN = s ? s.list.length : 0;
      if (!s || s.list.length < 2 || !(d > 0)) { segs.innerHTML = ""; root.classList.remove("has-chsegs"); return; }
      placeTrack();
      /* one coloured segment per chapter, in its chapter colour, with a small gap between */
      var L = s.list.filter(function (c) { return c.t < d; });
      segs.innerHTML = L.map(function (c, i) {
        var a = Math.max(0, Math.min(100, (c.t / d) * 100)), b = i + 1 < L.length ? Math.min(100, (L[i + 1].t / d) * 100) : 100;
        return '<i style="left:' + a.toFixed(3) + "%;width:" + Math.max(0, b - a).toFixed(3) + "%;--c:" + chColor(v, i) + '"></i>';
      }).join("");
      root.classList.add("has-chsegs");
    };

    /* ---- following playback: the caption line, the current chapter and transcript line ---- */
    var keepInView = function (el) {
      var L = S.list, vh = L.clientHeight; if (!(vh > 0)) return;
      var top = el.offsetTop, h = el.offsetHeight, vt = L.scrollTop;
      if (top >= vt + vh * 0.12 && top + h <= vt + vh * 0.72) return;
      var y = Math.max(0, top - vh * 0.3);
      S.prog = Date.now() + 900;
      try { L.scrollTo({ top: y, behavior: reduced.matches ? "auto" : "smooth" }); } catch (e) { L.scrollTop = y; }
    };
    /* the chapter list scrolls only inside its own panel (the side panel, fullscreen panel, sheet or flyout); never the page */
    var scrollPanelTo = function (el) {
      var sc = el.closest(".x-wh__body"); if (!sc) return;
      var cs = window.getComputedStyle(sc);
      if (!/(auto|scroll)/.test(cs.overflowY) || sc.scrollHeight <= sc.clientHeight + 2) return;
      if (Date.now() - S.chUser < 4000) return;
      var r = el.getBoundingClientRect(), b = sc.getBoundingClientRect(), vh = sc.clientHeight;
      if (r.top >= b.top + vh * 0.1 && r.bottom <= b.top + vh * 0.8) return;
      var y = Math.max(0, sc.scrollTop + (r.top - b.top) - vh * 0.3);
      try { sc.scrollTo({ top: y, behavior: reduced.matches ? "auto" : "smooth" }); } catch (e) { sc.scrollTop = y; }
    };
    /* progressive tint: words already spoken in a line get .is-said (classes only; the text is never redrawn) */
    var tint = function (box, n) {
      if (!box) return;
      var ws = box.querySelectorAll(".w");
      for (var i = 0; i < ws.length; i++) {
        var on = i < n, now = i === n - 1;
        if (ws[i].classList.contains("is-said") !== on) ws[i].classList.toggle("is-said", on);
        /* the word being spoken now, for "Highlight current word" */
        if (ws[i].classList.contains("is-cur") !== now) ws[i].classList.toggle("is-cur", now);
      }
    };
    var frac = function (t, a, b) { return b > a ? Math.max(0, Math.min(1, (t - a) / (b - a))) : 1; };
    var lineHtml = function (g, words) { return richHtml(g.x, { link: true, words: words }); };
    var update = function (t) {
      var v = cur(); if (!v) return;
      if (t == null) t = inst.started() ? inst.now() : 0;
      var tr = trOf(v.id);
      /* captions: one cue at a time (rolling repeats are stripped when the transcript loads), up to the chosen line count */
      var key = "", html = "";
      if (C.on && tr && inst.started() && inst.yt()) {
        var st = tr.starts, i = find(st, t);
        if (i >= 0) {
          var s = st[i], nx = i + 1 < st.length ? st[i + 1] : s + 6;
          if (t < nx + 0.6 && t - s < 9) {
            key = "c" + i + (C.kw ? "k" : "") + (C.karaoke ? "w" : "");
            if (key !== S.capKey) {
              var rh = richHtml(tr.cues[i][1], { kw: !!C.kw, words: !!C.karaoke, link: false });
              html = '<div class="x-pn-cap__l"><span>' + rh.html + "</span></div>";
              S.capW = rh.words; S.capS = s; S.capE = Math.min(nx, s + 8); S.capN = -1;
            }
          }
        }
      }
      if (key !== S.capKey) {
        S.capKey = key; capWin.innerHTML = html;
        /* site captions just appeared: the CC button's label follows what is on screen */
        if (key && S.capLive !== v.id) { S.capLive = v.id; if (YTNONE[v.id]) delete YTNONE[v.id]; paintBtn(); paintSet(); }
      }
      if (key && C.karaoke && S.capW) {
        var cn = Math.ceil(S.capW * frac(t, S.capS, S.capE));
        if (cn !== S.capN) { S.capN = cn; tint(capWin, cn); }
      }
      /* chapters: the current row, its thin progress fill, and the list kept in view inside the panel */
      var sc = secs();
      if (sc && S.chList && S.chList.isConnected && S.chList.__id === v.id) {
        var ci = find(sc.starts, t);
        var rows = S.chList.querySelectorAll(".x-pn-row");
        if (ci !== S.chI) {
          S.chI = ci;
          rows.forEach(function (b, k) { if (k === ci) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); b.classList.toggle("is-past", k < ci); });
          if (ci >= 0 && rows[ci]) scrollPanelTo(rows[ci]);
        }
        if (ci >= 0 && rows[ci]) {
          var end = ci + 1 < sc.starts.length ? sc.starts[ci + 1] : (inst.duration() || sc.starts[ci] + 60);
          rows[ci].style.setProperty("--p", (frac(t, sc.starts[ci], end) * 100).toFixed(1) + "%");
        }
      }
      /* transcript: the current line glows, past lines dim (CSS), its words tint as they are spoken */
      if (tr && S.list && S.list.isConnected && S.list.__id === v.id) {
        var gi = find(tr.gStarts, t);
        if (gi !== S.gi) {
          var old = S.list.querySelector(".x-pn-line.is-now");
          if (old) {
            old.classList.remove("is-now"); old.removeAttribute("aria-current");
            var og = tr.groups[+old.getAttribute("data-gi")], otx = old.querySelector(".x-pn-tx");
            if (og && otx && old.__w) { otx.innerHTML = lineHtml(og, false).html; old.__w = false; }
          }
          /* past lines dim: only the lines between the old and new position change class */
          var kids = S.list.children, from = S.gi < 0 ? 0 : Math.min(S.gi, gi), to = S.gi < 0 ? kids.length - 1 : Math.max(S.gi, gi);
          for (var pk = Math.max(0, from); pk <= to && pk < kids.length; pk++) { var past = pk < gi; if (kids[pk].classList.contains("is-past") !== past) kids[pk].classList.toggle("is-past", past); }
          S.gi = gi; S.lineN = -1; S.lineW = 0;
          var el = gi >= 0 ? S.list.children[gi] : null;
          S.list.classList.toggle("has-now", !!el);
          if (el) {
            el.classList.add("is-now"); el.setAttribute("aria-current", "true");
            var tx = el.querySelector(".x-pn-tx");
            if (tx && !el.__m) { var lh = lineHtml(tr.groups[gi], true); tx.innerHTML = lh.html; el.__w = true; S.lineW = lh.words; }
            if (S.follow && !S.q) keepInView(el);
          }
        }
        if (gi >= 0 && S.lineW) {
          var ge = gi + 1 < tr.gStarts.length ? tr.gStarts[gi + 1] : tr.gStarts[gi] + 8;
          var ln = Math.ceil(S.lineW * frac(t, tr.gStarts[gi], ge));
          if (ln !== S.lineN) { S.lineN = ln; tint(S.list.children[gi], ln); }
        }
      }
      /* the virtualised transcript (player8.js) follows from the same frame */
      if (inst._x8follow) inst._x8follow(t, tr);
    };
    /* follow-along runs on animation frames, at most ten times a second, and only while playing */
    var start = function () {
      if (S.timer) return;
      var last = 0;
      var loop = function (ts) {
        S.timer = requestAnimationFrame(loop);
        if (ts - last < 100) return;
        last = ts; update();
      };
      S.timer = requestAnimationFrame(loop);
    };
    var stop = function () { cancelAnimationFrame(S.timer); S.timer = 0; };
    inst.on("state", function (s) {
      if (s === 1) start(); else stop();
      /* the transcript may still be on its way at the first frame: ask again so captions show without a click */
      var v = cur();
      if (s === 1 && v && hasCC(v.id) && !trOf(v.id)) getTr(v.id, function () { trArrived(v); });
      if (s === 1 || s === 3) applyYT();
      /* CC on for a talk with no captions anywhere: say so once when it starts, instead of turning on YouTube's */
      if (s === 1 && v && C.on && srcOf(v) === "none" && S.noneSaid !== v.id) { S.noneSaid = v.id; toast("No captions for this talk"); }
      S.capKey = null; update(); if (S.segD !== inst.duration()) paintSegs();
    });
    inst.on("ready", function () { Y.key = ""; Y.size = null; paintSegs(); S.capKey = null; update(); applyYT(); });
    inst.ccWanted = function () { return false; };
    inst._pnToast = toast;
    /* YouTube's captions module reports in: pick the English (or first) track and the size */
    inst.on("apichange", function () {
      var v = cur(); if (!Y.key || !v || Y.key !== v.id) return;
      if (!Y.track) pickTrack();
      Y.size = null; applyYT();
    });
    inst.on("tick", function (t) { var sc = secs(); if (S.segD !== inst.duration() || S.segN !== (sc ? sc.list.length : 0)) paintSegs(); if (!S.timer) update(t); ytTick(); });
    /* a transcript arriving later can give a talk without chapters its auto sections: redraw that tab once */
    var trArrived = function (v) {
      if (cur() !== v) return;
      S.capKey = null; S.gi = -2; S.chI = -2; paintSegs(); update(); paintBtn(); paintSet();
      var pane = root.querySelector('.x-wh__body[data-t="ch"] .x-wh__pane');
      if (pane && pane.querySelector(".x-pn-chwait")) inst._pnRender("ch", v, pane);
    };
    inst.on("change", function (v) {
      stop();
      Y.key = ""; Y.size = null; Y.tries = 0; Y.track = false; inst._ytCC = false;
      S.vid = v && v.id; S.capKey = null; capWin.innerHTML = ""; S.chI = -2; S.gi = -2; S.follow = true; S.sec = null;
      if (v && hasCC(v.id)) getTr(v.id, function () { trArrived(v); });
      else if (v && C.on) probe(v);
      paintCap(); paintSegs(); paintBtn(); paintSet(); update();
    });
    /* a transcript that failed to load: no captions (YouTube's stay off) */
    inst._pnFail = function () {
      paintBtn(); paintSet(); capWin.innerHTML = ""; S.capKey = null; applyYT();
      var v = cur();
      if (C.on && v && inst.started() && S.noneSaid !== v.id) { S.noneSaid = v.id; toast("No captions for this talk"); }
      if (inst._whSync) inst._whSync();
    };
    inst._pnPaint = function () { paintCap(); paintSet(); paintBtn(); S.capKey = null; update(); applyYT(); };
    inst._pnUpdate = update;

    /* ---- transcript list ---- */
    var setFollow = function (on) {
      S.follow = on;
      if (S.chip && S.chip.isConnected) S.chip.hidden = on || !!S.q;
      var fb = S.list && S.list.isConnected ? S.list.closest(".x-pn-tr").querySelector('[data-pn="follow"]') : null;
      if (fb) fb.setAttribute("aria-pressed", String(!!on));
    };
    var LINE_ACTS = '<span class="x-pn-acts">' +
      '<button type="button" class="x-pn-ib" data-pn="cl" aria-label="Copy line" title="Copy line">' + svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>') + "</button>" +
      '<button type="button" class="x-pn-ib" data-pn="ct" aria-label="Copy line with timestamp link" title="Copy with timestamp">' + svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M9.5 2.5h5"/>') + "</button></span>";
    var fillTranscript = function (v, box) {
      var tr = trOf(v.id), list = box.querySelector(".x-pn-list"), meta = box.querySelector(".x-pn-trmeta");
      if (!tr) { meta.textContent = "The transcript could not be loaded."; return; }
      /* player8.js draws only the visible lines ±30 and follows playback itself (via inst._x8follow) */
      if (inst._x8tr) { S.list = null; S.meta = null; S.chip = null; S.gi = -2; inst._x8tr(v, box, tr); return; }
      list.innerHTML = tr.groups.map(function (g, i) {
        return '<div class="x-pn-line" role="listitem" data-pn-seek="' + g.t + '" data-gi="' + i + '">' +
          '<button type="button" class="x-pn-time" data-pn-seek="' + g.t + '" aria-label="Play from ' + fmt(g.t) + '">' + fmt(g.t) + "</button>" +
          '<span class="x-pn-tx">' + lineHtml(g, false).html + "</span>" + LINE_ACTS + "</div>";
      }).join("");
      list.__id = v.id;
      meta.textContent = tr.groups.length.toLocaleString("en-US") + " lines · tap a line to jump there · names and key terms link to their pages";
      S.list = list; S.meta = meta; S.chip = box.querySelector(".x-pn-resume"); S.gi = -2; S.q = ""; S.hits = []; S.hit = -1;
      var inp = box.querySelector('[data-pn="q"]'); if (inp && inp.value) { S.q = ""; search(inp.value); }
      setFollow(true);
      var mark = function () { S.userAt = Date.now(); };
      list.addEventListener("wheel", mark, { passive: true });
      list.addEventListener("touchstart", mark, { passive: true });
      list.addEventListener("pointerdown", mark);
      list.addEventListener("keydown", mark);
      list.addEventListener("scroll", function () {
        if (Date.now() < S.prog || Date.now() - S.userAt > 1500) return;
        if (S.follow) setFollow(false);
      }, { passive: true });
      update();
    };
    /* search: every line stays in place; matches are marked, counted, and stepped through with ↑ / ↓ (or Enter) */
    var paintCount = function () {
      var box = S.list && S.list.isConnected ? S.list.closest(".x-pn-tr") : null; if (!box) return;
      var out = box.querySelector('[data-pn-out="count"]'), n = S.hits.length;
      out.textContent = !S.q ? "" : n ? (S.hit + 1) + " of " + n : "0 of 0";
      box.querySelector('[data-pn="qnext"]').disabled = n < 1;
      box.querySelector('[data-pn="qprev"]').disabled = n < 1;
    };
    var goHit = function (d) {
      var n = S.hits.length; if (!n) return;
      var old = S.list.querySelector(".x-pn-line.is-hit"); if (old) old.classList.remove("is-hit");
      S.hit = ((S.hit < 0 ? (d > 0 ? -1 : 0) : S.hit) + d + n) % n;
      var el = S.list.children[S.hits[S.hit]];
      if (el) { el.classList.add("is-hit"); S.prog = Date.now() + 900; keepInView(el, true); }
      paintCount();
    };
    var search = function (raw) {
      var tr = S.vid && trOf(S.vid), list = S.list;
      if (!tr || !list || !list.isConnected) return;
      var q = String(raw || "").trim().toLowerCase();
      if (q === S.q) return;
      S.q = q; S.hits = []; S.hit = -1;
      var terms = q ? q.split(/\s+/).filter(Boolean) : [];
      var re = terms.length ? new RegExp("(" + terms.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "gi") : null;
      [].forEach.call(list.children, function (el, i) {
        var g = tr.groups[i], tx = el.querySelector(".x-pn-tx"); if (!g) return;
        el.classList.remove("is-hit");
        var low = g.x.toLowerCase(), ok = !!re && terms.every(function (x) { return low.indexOf(x) >= 0; });
        el.classList.toggle("is-match", ok);
        if (ok) { S.hits.push(i); tx.innerHTML = esc(g.x).replace(re, "<mark>$1</mark>"); el.__m = true; el.__w = false; }
        else if (el.__m) { tx.innerHTML = lineHtml(g, false).html; el.__m = false; }
      });
      list.classList.toggle("is-searching", !!re);
      if (S.meta) S.meta.textContent = re ? (S.hits.length ? S.hits.length.toLocaleString("en-US") + (S.hits.length === 1 ? " matching line" : " matching lines") + " · Enter for the next" : "No lines match “" + raw.trim() + "”") : tr.groups.length.toLocaleString("en-US") + " lines · tap a line to jump there · names and key terms link to their pages";
      if (!re) { S.gi = -2; paintCount(); setFollow(true); update(); return; }
      if (S.chip) S.chip.hidden = true;
      paintCount();
      if (S.hits.length) goHit(1);
    };
    var copyStr = function (text, done) {
      var old = function () {
        var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.top = "0"; ta.style.left = "0"; ta.style.opacity = "0";
        var back = document.activeElement;
        root.appendChild(ta);
        try { ta.focus({ preventScroll: true }); } catch (e) {}
        ta.select();
        try { document.execCommand("copy"); done(true); } catch (e) { done(false); }
        ta.remove();
        try { if (back) back.focus({ preventScroll: true }); } catch (e) {}
      };
      try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, old); else old(); } catch (e) { old(); }
    };
    var allText = function (v, tr) {
      return (v.t ? v.t + "\n" : "") + "https://www.youtube.com/watch?v=" + v.id + "\n\n" +
        tr.groups.map(function (g) { return "[" + fmt(g.t) + "] " + g.x; }).join("\n") + "\n\n" + PROV + "\n";
    };
    var copyText = function (btn) {
      var v = cur(), tr = v && trOf(v.id); if (!tr) return;
      copyStr(allText(v, tr), function (ok) {
        if (!ok) { inst.say("Copy is not available here."); return; }
        btn.textContent = "Copied"; inst.say("Transcript copied"); setTimeout(function () { btn.textContent = "Copy all"; }, 1600);
      });
    };
    var copyLine = function (btn, withTime) {
      var v = cur(), tr = v && trOf(v.id), line = btn.closest(".x-pn-line"); if (!tr || !line) return;
      var g = tr.groups[+line.getAttribute("data-gi")]; if (!g) return;
      var text = withTime ? "[" + fmt(g.t) + "] " + g.x + "\nhttps://www.youtube.com/watch?v=" + v.id + "&t=" + Math.floor(g.t) + "s" : g.x;
      copyStr(text, function (ok) {
        inst.say(ok ? (withTime ? "Line copied with its " + fmt(g.t) + " link" : "Line copied") : "Copy is not available here.");
        if (ok) { btn.classList.add("is-done"); setTimeout(function () { btn.classList.remove("is-done"); }, 1200); }
      });
    };
    var download = function () {
      var v = cur(), tr = v && trOf(v.id); if (!tr) return;
      try {
        var blob = new Blob([allText(v, tr)], { type: "text/plain;charset=utf-8" }), url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = (String(v.t || v.id).replace(/[^\w\- ]+/g, "").trim().slice(0, 80) || v.id) + " - transcript.txt";
        root.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        inst.say("Transcript downloaded");
      } catch (e) { inst.say("Download is not available here."); }
    };

    /* the panel calls this to draw a notes tab into its pane */
    inst._pnRender = function (key, v, pane) {
      var n = notesOf(v.id);
      S.vid = v.id;
      if (key === "ch") {
        var sec = secs();
        if (sec) {
          pane.innerHTML = chaptersHtml(sec, v);
          S.chList = pane.querySelector(".x-pn-ch"); S.chList.__id = v.id; S.chI = -2;
          var body = pane.closest(".x-wh__body");
          if (body && !body.__chU) { body.__chU = 1; var mk = function () { S.chUser = Date.now(); }; body.addEventListener("wheel", mk, { passive: true }); body.addEventListener("touchmove", mk, { passive: true }); }
        } else if (hasCC(v.id) && !trOf(v.id)) {
          pane.innerHTML = '<div class="x-pn-empty x-pn-chwait"><p class="x-pn-h">Auto sections</p><p class="x-pn-p">This talk has no chapters. Building sections every 5 minutes from its transcript…</p></div>';
          getTr(v.id, function () { trArrived(v); });
        } else {
          pane.innerHTML = '<div class="x-pn-empty"><p class="x-pn-h">No chapters</p><p class="x-pn-p">This talk has no chapters and no transcript to build sections from. Use the seek bar, or press 0 – 9 to jump through it in tenths.</p></div>';
        }
      } else if (key === "sum" && n) {
        pane.innerHTML = summaryHtml(n);
      } else if (key === "tr" && !capSet()[v.id]) {
        pane.innerHTML = '<div class="x-pn-empty"><p class="x-pn-h">No transcript for this talk yet</p>' +
          '<p class="x-pn-p">Turn on CC for YouTube auto captions.</p>' +
          (C.on ? '<p class="x-pn-cnote">CC is on: YouTube’s captions show while the talk plays.</p>' : '<button type="button" class="x-pn-btn" data-pn="ccon">Turn on CC</button>') + "</div>";
      } else if (key === "tr") {
        pane.innerHTML = transcriptShell(uid);
        var box = pane.querySelector(".x-pn-tr");
        var failed = function () {
          var m = box.querySelector(".x-pn-trmeta"), l = box.querySelector(".x-pn-list");
          if (m) m.textContent = "The transcript could not be loaded. Captions use YouTube’s for now.";
          if (l) l.innerHTML = '<div class="x-pn-empty"><button type="button" class="x-pn-btn" data-pn="retry">Try again</button></div>';
        };
        var r = TR[v.id];
        if (r && r.state === "ok") fillTranscript(v, box);
        else if (r && r.state === "fail") failed();
        else getTr(v.id, function (rr) {
          if (!box.isConnected || !cur() || cur().id !== v.id) return;
          if (rr.state === "ok") fillTranscript(v, box); else failed();
        });
      } else pane.innerHTML = '<p class="x-wh__muted">Nothing here for this video.</p>';
      update();
    };

    /* one delegated handler for the panel and the menu */
    var seekTo = function (t) {
      t = Math.max(0, +t || 0);
      setFollow(true);
      keep(function () {
        if (inst.started() && inst.yt()) { inst.seekTo(t); S.gi = -2; S.chI = -2; update(t); }
        else if (inst.playAt) inst.playAt(t);
      });
    };
    root.addEventListener("click", function (ev) {
      /* keyword chips are links: they navigate (leaving fullscreen first, in watch-hub.js) and never seek */
      if (ev.target.closest("a[href]")) return;
      var b = ev.target.closest("[data-pn]");
      var s = ev.target.closest("[data-pn-seek]");
      if (s && root.contains(s) && !(b && s.contains(b) && b !== s)) { ev.preventDefault(); seekTo(s.getAttribute("data-pn-seek")); return; }
      if (!b || !root.contains(b)) return;
      var a = b.getAttribute("data-pn");
      if (a === "cl" || a === "ct") { copyLine(b, a === "ct"); return; }
      if (a === "qnext" || a === "qprev") { goHit(a === "qnext" ? 1 : -1); return; }
      if (a === "follow") { var on = !S.follow; setFollow(on); if (on) { S.gi = -2; update(); } inst.say(on ? "Following along" : "Follow along off"); return; }
      if (a === "dl") { download(); return; }
      if (a === "preset") { applyPreset(b.getAttribute("data-v")); inst.say("Caption style: " + PRESETS[b.getAttribute("data-v")][0]); return; }
      if (a === "tog") { var tk = b.getAttribute("data-k"); setC(tk, !C[tk]); return; }
      if (a === "retry") {
        var rv = cur(), rp = b.closest(".x-wh__pane");
        if (rv && rp) { delete TR[rv.id]; paintBtn(); paintSet(); inst._pnRender("tr", rv, rp);
          getTr(rv.id, function (rr) { if (cur() === rv && rr.state === "ok") { ytOff(); S.capKey = null; update(); paintBtn(); paintSet(); } }); }
      }
      else if (a === "ccon") { if (!C.on) inst.ccToggle(); var ep = b.closest(".x-pn-empty"); if (ep) b.outerHTML = '<p class="x-pn-cnote">CC is on: YouTube’s captions show while the talk plays.</p>'; }
      else if (a === "resume") { setFollow(true); S.gi = -2; update(); }
      else if (a === "copy") copyText(b);
      else if (a === "ccmenu" && menu) { menu.classList.add("is-pn-cc"); paintSet(); menu.scrollTop = 0; var f = menu.querySelector(".x-pn-ccback"); if (f) f.focus({ preventScroll: true }); }
      else if (a === "ccback" && menu) { menu.classList.remove("is-pn-cc"); var o = menu.querySelector(".x-pn-ccopen"); if (o) o.focus({ preventScroll: true }); }
      else if (a === "set") {
        var k = b.getAttribute("data-k"), v = b.getAttribute("data-v");
        if (k === "on") { if ((v === "1") !== C.on) inst.ccToggle(); }
        else if (k === "pos") { C.y = null; setC("pos", v); }
        else if (k === "lines") setC("lines", +v);
        else setC(k, v);
      }
      else if (a === "size") setSize(+b.getAttribute("data-d"));
      else if (a === "posreset") { C.y = null; setC("pos", "bottom"); inst.say("Caption position reset"); }
      else if (a === "ccreset") { var was = C.on; Object.keys(DEF).forEach(function (k2) { C[k2] = DEF[k2]; }); C.on = was; saveC(); everywhere(); inst.say("Caption style reset"); }
    });
    var qT = 0;
    root.addEventListener("input", function (ev) {
      if (!ev.target.matches || !ev.target.matches('.x-pn-search input')) return;
      var val = ev.target.value;
      clearTimeout(qT); qT = setTimeout(function () { search(val); }, 140);
    });
    root.addEventListener("keydown", function (ev) {
      if (!ev.target.matches || !ev.target.matches(".x-pn-search input")) return;
      if (ev.key === "Escape" && ev.target.value) { ev.preventDefault(); ev.stopPropagation(); ev.target.value = ""; search(""); }
      else if (ev.key === "Enter") { ev.preventDefault(); clearTimeout(qT); search(ev.target.value); goHit(ev.shiftKey ? -1 : 1); }
    });

    paintCap(); paintSet(); paintBtn(); barH();
    /* the info panel was drawn before this add-on: show its Chapters and Transcript tabs now, not on the next change */
    if (inst._whPaint) { try { inst._whPaint(); } catch (e) {} }
    else setTimeout(function () { if (inst._whPaint) { try { inst._whPaint(); } catch (e) {} } }, 0);
    var v0 = cur(); if (v0 && hasCC(v0.id)) getTr(v0.id, function () { if (cur() === v0) { S.capKey = null; update(); paintBtn(); paintSet(); } });
  }

  window.ArchiveNotes = {
    hasCC: hasCC,
    notes: notesOf,
    /* whether a video has a given notes tab: ch (chapters), tr (transcript), sum (summary) */
    has: function (v, key) {
      if (!v || !v.id) return false;
      var n = notesOf(v.id);
      /* Chapters is always there too: the talk's chapters, auto sections from the transcript, or an empty state */
      if (key === "ch") return true;
      if (key === "sum") return !!(n && (n.s || n.ww || (n.kc && n.kc.length)));
      /* the Transcript tab is always there: the transcript, a loading skeleton, a retry, or the empty state */
      if (key === "tr") return true;
      return false;
    },
    /* the summary, why-watch and key claims block, for the About tab */
    summary: function (v) { var n = v && notesOf(v.id); return n && (n.s || n.ww || (n.kc && n.kc.length)) ? summaryHtml(n) : ""; },
    /* text with names and key terms as chips linking to #/person/<id> and #/topic/<slug> */
    rich: function (text) { return richHtml(String(text || ""), { link: true }).html; },
    render: function (key, v, pane, inst) { if (inst && inst._pnRender) inst._pnRender(key, v, pane); },
    /* for player8.js: the one shared caption state and the transcript source */
    api: {
      C: function () { return C; },
      setC: function (k, v) { setC(k, v); },
      repaint: everywhere,
      getTr: getTr,
      trOf: trOf,
      trState: function (id) { var r = TR[id]; return r ? r.state : ""; },
      forget: function (id) { if (TR[id] && TR[id].state === "fail") delete TR[id]; },
      listed: function (id) { return !!capSet()[id]; },
      rich: function (text, o) { return richHtml(String(text || ""), o || {}); },
      prov: PROV
    }
  };

  AP.onCreate(setup);
})();
