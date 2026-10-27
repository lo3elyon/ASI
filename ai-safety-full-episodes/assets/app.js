/*!
 * AI Safety Full Episodes · a personal streaming-style library
 * Author: Aniruddha Adak · part of the ASI hub (https://lo3elyon.github.io/ASI/)
 * Vanilla JS, no build step. Data: data/episodes.json, data/just-outside.json,
 * plus any files listed in data/manifest.json. Watch history stays in localStorage.
 */
(function () {
  "use strict";

  /* =========================================================================
     0. Small helpers
     ========================================================================= */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fold = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  function toSec(str) {
    if (str == null) return null;
    if (typeof str === "number") return str;
    const p = String(str).trim().split(":").map((x) => parseInt(x, 10));
    if (p.some(isNaN)) return null;
    return p.reduce((a, v) => a * 60 + v, 0);
  }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
  }
  function fmtHM(s) {
    s = Math.round(s || 0);
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    if (h && m === 60) return `${h + 1}h`;
    return h ? `${h}h ${m ? m + "m" : ""}`.trim() : `${m}m`;
  }
  function hoursStr(s) { const h = s / 3600; return h >= 10 ? Math.round(h) + "h" : (Math.round(h * 10) / 10) + "h"; }
  const pad = (n) => String(n).padStart(2, "0");
  function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso, approx) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return `${approx ? "~" : ""}${MONTHS[m - 1]} ${d}, ${y}`;
  }
  function fmtStamp(ts) {
    const d = new Date(ts);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function initials(name) {
    const p = String(name).replace(/\[.*?\]/g, "").trim().split(/\s+/).filter(Boolean);
    return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  }

  /* storage (namespaced, versioned) */
  const NS = "asfe:";
  const store = {
    get(k, def) { try { const v = localStorage.getItem(NS + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) {} },
  };

  /* =========================================================================
     1. Taxonomy: format buckets, org groups, featured
     ========================================================================= */
  const FORMATS = [
    { id: "podcast", label: "Podcast / interview" },
    { id: "panel", label: "Panel" },
    { id: "debate", label: "Debate" },
    { id: "talk", label: "Talk / lecture" },
    { id: "hearing", label: "Hearing" },
  ];
  function fmtBucket(raw) {
    const f = fold(raw);
    if (/hearing|testimony/.test(f)) return "hearing";
    if (/debate/.test(f) && !/debate speech/.test(f)) return "debate";
    if (/panel|roundtable/.test(f)) return "panel";
    if (/talk|lecture|keynote/.test(f)) return "talk";
    return "podcast";
  }
  const LENGTHS = [
    { id: "s", label: "< 30 min", test: (d) => d < 1800 },
    { id: "m", label: "30–60 min", test: (d) => d >= 1800 && d < 3600 },
    { id: "l", label: "1–2 h", test: (d) => d >= 3600 && d < 7200 },
    { id: "xl", label: "2 h +", test: (d) => d >= 7200 },
  ];
  const GROUPS = [
    { id: "insiders", label: "Ex-lab insiders", color: "#f59e0b", names: ["Jacob Coxon", "Daniel Kokotajlo", "Alex Turner", "David Robinson", "Jeffrey Ladish", "Mikita Balesni", "Tomek Korbak", "Steven Adler", "Aengus Lynch", "Joaquin Quiñonero Candela", "Jonathan Schwarz", "Geoffrey Irving"] },
    { id: "miri", label: "MIRI", color: "#ef4444", names: ["Nate Soares", "Malo Bourgon", "Brian Abeyta"] },
    { id: "pause", label: "ControlAI & PauseAI", color: "#f97316", names: ["Connor Leahy", "Andrea Miotti", "Holly Elmore"] },
    { id: "orgs", label: "Safety orgs & evals", color: "#14b8a6", names: ["Adam Gleave", "Emre Yavuz", "Benjamin Weinstein-Raun", "Stephen Casper", "Chris Painter", "Marius Hobbhahn"] },
    { id: "labs", label: "Frontier-lab researchers", color: "#3b82f6", names: ["Emmanuel Ameisen", "Victoria Krakovna", "Eric Bigelow", "Neel Nanda", "Andreas Kirsch"] },
    { id: "academics", label: "Academics & pioneers", color: "#10b981", names: ["Geoffrey Hinton", "Yoshua Bengio", "Stuart Russell", "Roman Yampolskiy", "Nick Bostrom", "David Krueger", "Max Tegmark", "Dylan Hadfield-Menell", "Stephan Rabanser", "Fazl Barez", "Gary Marcus", "Joanna Redden", "Andrei Krutikov"] },
    { id: "policy", label: "Policy & governance", color: "#22d3ee", names: ["Helen Toner", "Alan Chan", "Jaan Tallinn", "Xiao Qian", "Sara Rendtorff-Smith", "Kyle Chan", "Adam Hadley", "Paul Ash"] },
  ];
  const HOSTS_GROUP = { id: "hosts", label: "Hosts & moderators", color: "#64748b" };
  const OTHER_GROUP = { id: "other", label: "Other voices", color: "#84cc16" };
  const NAME2GROUP = {};
  GROUPS.forEach((g) => g.names.forEach((n) => (NAME2GROUP[fold(n)] = g)));
  const groupById = (id) => GROUPS.concat([HOSTS_GROUP, OTHER_GROUP]).find((g) => g.id === id);

  const FEATURED = [
    { id: "Qpuj1nhcxiI", why: "The longest sit-down with Jacob Coxon after he quit Anthropic" },
    { id: "JIMXEuT_ZAU", why: "Ezra Klein with the OpenAI insider who wrote its system cards" },
    { id: "qDzg-xvkeXw", why: "Jeffrey Ladish on The Diary of a CEO, two hours" },
    { id: "IejFLhF8efQ", why: "NYC Council hearing: Coxon, Kokotajlo and Turner testify" },
    { id: "LlGNBPJW8Ww", why: "UK Parliament committee: Kokotajlo, Irving, Adler, Lynch" },
    { id: "tjAg_KxApmw", why: "Machine Gods: the fired OpenAI safety researchers speak" },
  ];

  /* =========================================================================
     2. Data loading (fetch → inline fallback) + manifest merge
     ========================================================================= */
  const STATE = { all: [], inWin: [], outside: [], byId: new Map(), speakers: new Map() };
  const STOP = new Set("the a an and or of to in on for with is are be by as at from it its this that how why what who we our you your ai not vs his her their them they than into about after over more most can could would will just new full episode interview podcast talk panel".split(" "));

  function splitSpeakers(s) {
    if (Array.isArray(s)) return s;
    if (!s) return [];
    return String(s).split(/,\s*(?![^()]*\))/).map((x) => x.trim()).filter(Boolean);
  }
  function parseSpeaker(raw) {
    const s = String(raw).trim().replace(/\),\s*(host|moderator)\s*$/i, ") — $1");
    const m = s.match(/^(.+?)\s*(?:\((.*)\))?(?:\s+[—–-]\s+(.+))?$/);
    let name = m ? m[1].trim() : s.trim();
    const desc = m && m[2] ? m[2].trim() : "";
    const role = m && m[3] ? m[3].trim() : "";
    const isHost = /\bhost\b|\bmoderator\b/i.test(role) || /^host\b|\bhost\)?$|^host,|, host$/i.test(desc) || /\bhost$/i.test(name);
    return { name, desc, role, isHost };
  }
  function parseTopic(x) {
    if (x && typeof x === "object") return { t: toSec(x.t || x.time), label: x.topic || x.title || x.label || "" };
    const m = String(x).match(/^\s*[\[(]?((?:\d{1,2}:)?\d{1,2}:\d{2})[\])]?\s*[-–—:|]?\s*(.+)$/);
    if (m) return { t: toSec(m[1]), label: m[2].trim() };
    return { t: null, label: String(x) };
  }
  function tokens(s) { return fold(s).replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)); }

  function normalize(raw, src) {
    const id = raw.id || (raw.url && (raw.url.match(/[?&]v=([\w-]{11})/) || [])[1]);
    if (!id) return null;
    const dateIso = String(raw.date || "").slice(0, 10);
    const sp = splitSpeakers(raw.speakers).map(parseSpeaker);
    const names = Array.isArray(raw.names) && raw.names.length ? raw.names.slice() : sp.map((x) => x.name);
    const hostNames = new Set(sp.filter((x) => x.isHost).map((x) => fold(x.name)));
    const people = names.map((n) => {
      const hit = sp.find((x) => fold(x.name) === fold(n) || fold(x.name).startsWith(fold(n))) || { desc: "", role: "", isHost: false };
      return { name: n, desc: hit.desc, role: hit.role, host: hostNames.has(fold(n)) || hit.isHost };
    });
    const dur = toSec(raw.duration) || 0;
    const chapters = (raw.topics || []).map(parseTopic).map((c) => ({ ...c, t: c.t != null && (!dur || c.t <= dur) ? c.t : null }));
    const groups = Array.from(new Set(people.filter((p) => !p.host).map((p) => (NAME2GROUP[fold(p.name)] || OTHER_GROUP).id)));
    const e = {
      id, title: raw.title || "Untitled", channel: raw.channel || "", show: raw.show || "", date: dateIso, approx: !!raw.approx,
      dur, durStr: raw.duration || "", people, names, formatRaw: raw.format || (src === "outside" ? "full episode" : ""),
      fmt: fmtBucket(raw.format || raw.title || ""), summary: raw.summary || "", chapters, evidence: raw.evidence || "",
      url: raw.url || `https://www.youtube.com/watch?v=${id}`, thumb: raw.thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      outside: src === "outside", groups, src,
    };
    e.hay = {
      title: fold(e.title), names: fold(names.join(" ")), show: fold(e.show + " " + e.channel),
      topics: fold(chapters.map((c) => c.label).join(" ")), summary: fold(e.summary + " " + e.formatRaw),
    };
    e.kw = new Set(tokens(e.title + " " + chapters.map((c) => c.label).join(" ") + " " + e.summary));
    return e;
  }

  async function getJSON(url) {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error(url + " " + r.status);
    return r.json();
  }
  const asList = (d) => (Array.isArray(d) ? d : d && Array.isArray(d.episodes) ? d.episodes : []);

  async function loadData() {
    let eps = null, out = null, extras = [];
    try {
      [eps, out] = await Promise.all([getJSON("data/episodes.json"), getJSON("data/just-outside.json").catch(() => [])]);
      try {
        const man = await getJSON("data/manifest.json");
        const files = Array.isArray(man) ? man : man.files || [];
        const loaded = await Promise.all(files.map((f) => getJSON("data/" + String(typeof f === "string" ? f : f.path).replace(/^\.?\/?(data\/)?/, "")).catch(() => [])));
        loaded.forEach((d) => (extras = extras.concat(asList(d))));
      } catch (e) { /* no manifest: fine */ }
    } catch (e) {
      // opened from file:// (or fetch blocked): fall back to the inline copy of the data
      if (!window.ASFE_INLINE) await new Promise((res) => { const sc = document.createElement("script"); sc.src = "assets/data-inline.js"; sc.onload = sc.onerror = res; document.head.appendChild(sc); });
      const inl = window.ASFE_INLINE || {};
      eps = inl.episodes || [];
      out = inl.outside || [];
    }
    const map = new Map();
    asList(eps).concat(extras).forEach((r) => { const e = normalize(r, "main"); if (e) map.set(e.id, e); }); // later (daily) copies win
    asList(out).forEach((r) => { const e = normalize(r, "outside"); if (e && !map.has(e.id)) map.set(e.id, e); });
    STATE.all = Array.from(map.values());
    STATE.inWin = STATE.all.filter((e) => !e.outside);
    STATE.outside = STATE.all.filter((e) => e.outside);
    STATE.byId = map;
    buildSpeakers();
  }

  function buildSpeakers() {
    const m = new Map();
    STATE.all.forEach((e) => e.people.forEach((p) => {
      const k = fold(p.name);
      if (/^progress by fifty|^eleanor \[/.test(k)) return;
      if (!m.has(k)) m.set(k, { name: p.name, descs: new Set(), eps: [], hostEps: 0, group: NAME2GROUP[k] || null });
      const s = m.get(k);
      if (p.desc) s.descs.add(p.desc);
      s.eps.push(e.id);
      if (p.host) s.hostEps++;
    }));
    m.forEach((s) => {
      if (!s.group) s.group = s.hostEps === s.eps.length ? HOSTS_GROUP : OTHER_GROUP;
      s.desc = Array.from(s.descs).sort((a, b) => b.length - a.length)[0] || "";
    });
    STATE.speakers = m;
  }

  /* =========================================================================
     3. Watch history (strict, versioned)
     ========================================================================= */
  const HKEY = "history:v1";
  const BUCKET = 10; // seconds per coverage slice
  let H = store.get(HKEY, null);
  function freshHistory() { return { v: 1, created: Date.now(), eps: {}, daily: {} }; }
  if (!H || H.v !== 1 || typeof H.eps !== "object") H = freshHistory();
  const NOTES = store.get("notes:v1", {});
  let FAVS = new Set(store.get("favs:v1", []));
  let QUEUE = store.get("queue:v1", []);
  const SETTINGS = Object.assign({ autoplay: true, speed: 1, vol: 100, muted: false }, store.get("settings:v1", {}));
  let EARNED = store.get("badges:v1", {});
  function saveH() { store.set(HKEY, H); }
  function saveAll() { saveH(); store.set("notes:v1", NOTES); store.set("favs:v1", Array.from(FAVS)); store.set("queue:v1", QUEUE); store.set("settings:v1", SETTINGS); store.set("badges:v1", EARNED); }

  /* coverage bitset (base64) */
  function covDecode(str, n) {
    const out = new Uint8Array(Math.ceil(n / 8));
    if (!str) return out;
    try { const bin = atob(str); for (let i = 0; i < bin.length && i < out.length; i++) out[i] = bin.charCodeAt(i); } catch (e) {}
    return out;
  }
  function covEncode(bytes) { let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
  function covCount(bytes, n) { let c = 0; for (let i = 0; i < n; i++) if (bytes[i >> 3] & (1 << (i & 7))) c++; return c; }
  const covHas = (bytes, i) => !!(bytes[i >> 3] & (1 << (i & 7)));

  function rec(id, create) {
    if (!H.eps[id] && create) H.eps[id] = { pos: 0, dur: 0, watched: 0, cov: "", covN: 0, pct: 0, done: false, doneAt: 0, first: 0, last: 0, sessions: [] };
    return H.eps[id] || null;
  }
  function pctOf(id) { const r = H.eps[id]; return r ? r.pct || 0 : 0; }
  function stateOf(id) { const r = H.eps[id]; if (!r || (r.watched < 20 && !r.done)) return "none"; return r.done ? "done" : "progress"; }

  function totalWatched() { return Object.values(H.eps).reduce((a, r) => a + (r.watched || 0), 0); }
  function streaks() {
    const days = new Set(Object.keys(H.daily).filter((k) => H.daily[k] >= 60));
    let cur = 0, d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d))) { cur++; d.setDate(d.getDate() - 1); }
    const sorted = Array.from(days).sort();
    let best = 0, run = 0, prev = null;
    sorted.forEach((k) => { const t = Date.parse(k + "T12:00:00"); run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = t; });
    return { cur, best, days: days.size };
  }

  /* =========================================================================
     4. Levels, XP, badges
     ========================================================================= */
  const LEVELS = [
    [0, "Novice"], [60, "Curious Listener"], [180, "Safety Apprentice"], [400, "Alignment Scholar"],
    [800, "Eval Analyst"], [1400, "Frontier Analyst"], [2200, "Governance Strategist"], [3400, "Superalignment Sage"],
  ];
  const coxonIds = () => STATE.inWin.filter((e) => e.names.some((n) => /coxon/i.test(n))).map((e) => e.id);
  const godfathers = ["Geoffrey Hinton", "Yoshua Bengio", "Stuart Russell"];
  function watchedSecFor(pred) { return STATE.all.filter(pred).reduce((a, e) => a + ((H.eps[e.id] || {}).watched || 0), 0); }
  const BADGES = [
    { id: "first", icon: "▶️", name: "First Frame", desc: "Watch one minute of any episode", prog: () => [Math.min(1, Object.values(H.eps).some((r) => r.watched >= 60) ? 1 : 0), 1] },
    { id: "complete1", icon: "🏁", name: "Full Episode", desc: "Complete an episode (90% actually played)", prog: () => [Math.min(1, doneCount()), 1] },
    { id: "hour1", icon: "⏱️", name: "One Hour In", desc: "Watch 1 hour in total", prog: () => [Math.min(60, totalWatched() / 60), 60] },
    { id: "hour5", icon: "🔥", name: "Five Hours", desc: "Watch 5 hours in total", prog: () => [Math.min(300, totalWatched() / 60), 300] },
    { id: "hour20", icon: "🛰️", name: "Deep Diver", desc: "Watch 20 hours in total", prog: () => [Math.min(1200, totalWatched() / 60), 1200] },
    { id: "coxon", icon: "🧭", name: "The Coxon Files", desc: "Complete every Jacob Coxon episode", prog: () => { const ids = coxonIds(); return [ids.filter((i) => (H.eps[i] || {}).done).length, ids.length || 1]; } },
    { id: "formats", icon: "🧩", name: "Every Format", desc: "Watch 10+ minutes of a podcast, panel, debate, talk and hearing", prog: () => [FORMATS.filter((f) => watchedSecFor((e) => e.fmt === f.id) >= 600).length, FORMATS.length] },
    { id: "hearing", icon: "🏛️", name: "On the Record", desc: "Watch 30 minutes of a government hearing", prog: () => [Math.min(30, Math.max(0, ...STATE.all.filter((e) => e.fmt === "hearing").map((e) => ((H.eps[e.id] || {}).watched || 0) / 60), 0)), 30] },
    { id: "streak3", icon: "📅", name: "Three in a Row", desc: "Watch on 3 days in a row", prog: () => [Math.min(3, streaks().best), 3] },
    { id: "streak7", icon: "🗓️", name: "Seven-Day Streak", desc: "Watch on 7 days in a row", prog: () => [Math.min(7, streaks().best), 7] },
    { id: "godfathers", icon: "🎓", name: "The Godfathers", desc: "10+ minutes each of Hinton, Bengio and Russell", prog: () => [godfathers.filter((g) => watchedSecFor((e) => e.names.includes(g)) >= 600).length, 3] },
    { id: "speakers10", icon: "🗣️", name: "Many Voices", desc: "Hear 10 different speakers (5+ minutes each)", prog: () => [Math.min(10, heardSpeakers()), 10] },
    { id: "marathon", icon: "🏃", name: "Marathon", desc: "Watch 2 hours in a single session", prog: () => { let m = 0; Object.values(H.eps).forEach((r) => (r.sessions || []).forEach((s) => (m = Math.max(m, s.w || 0)))); return [Math.min(120, m / 60), 120]; } },
    { id: "night", icon: "🌙", name: "Night Owl", desc: "Watch after midnight (00:00–04:00)", prog: () => [Object.values(H.eps).some((r) => (r.sessions || []).some((s) => { const h = new Date(s.s).getHours(); return h < 4 && s.w >= 120; })) ? 1 : 0, 1] },
    { id: "notes5", icon: "📝", name: "Note Taker", desc: "Write 5 timestamped notes", prog: () => [Math.min(5, noteCount()), 5] },
    { id: "curator", icon: "📚", name: "Curator", desc: "Queue 5 episodes or favorite 5", prog: () => [Math.min(5, Math.max(QUEUE.length, FAVS.size)), 5] },
    { id: "complete10", icon: "🏆", name: "Ten Complete", desc: "Complete 10 episodes", prog: () => [Math.min(10, doneCount()), 10] },
  ];
  function doneCount() { return Object.values(H.eps).filter((r) => r.done).length; }
  function noteCount() { return Object.values(NOTES).reduce((a, l) => a + l.length, 0); }
  function heardSpeakers() {
    const set = new Set();
    STATE.all.forEach((e) => { if (((H.eps[e.id] || {}).watched || 0) >= 300) e.people.filter((p) => !p.host).forEach((p) => set.add(fold(p.name))); });
    return set.size;
  }
  function xp() {
    const mins = Math.floor(totalWatched() / 60);
    const badges = BADGES.filter((b) => { const [c, t] = b.prog(); return c >= t; }).length;
    return mins + doneCount() * 50 + noteCount() * 5 + badges * 30;
  }
  function levelInfo(x) {
    let i = 0;
    for (let k = 0; k < LEVELS.length; k++) if (x >= LEVELS[k][0]) i = k;
    const cur = LEVELS[i], nxt = LEVELS[i + 1];
    const frac = nxt ? (x - cur[0]) / (nxt[0] - cur[0]) : 1;
    return { n: i + 1, title: cur[1], next: nxt ? nxt[1] : null, need: nxt ? nxt[0] - x : 0, frac };
  }
  let lastLevel = null;
  function checkAwards(silent) {
    const fresh = [];
    BADGES.forEach((b) => { const [c, t] = b.prog(); if (c >= t && !EARNED[b.id]) { EARNED[b.id] = Date.now(); fresh.push(b); } });
    if (fresh.length) store.set("badges:v1", EARNED);
    const L = levelInfo(xp());
    if (!silent) {
      fresh.forEach((b, i) => setTimeout(() => toast(`Badge unlocked: <b>${esc(b.name)}</b>`, { icon: b.icon, cls: "toast--badge", ms: 5000 }), i * 600));
      if (lastLevel && L.n > lastLevel) toast(`Level ${L.n}: <b>${esc(L.title)}</b>`, { icon: "⭐", cls: "toast--badge", ms: 5000 });
    }
    lastLevel = L.n;
    paintLevelChip(L);
  }
  function paintLevelChip(L) {
    $("#lvlNum").textContent = L.n;
    $("#lvlRing").style.strokeDashoffset = String(97.4 * (1 - L.frac));
    $("#lvlChip").setAttribute("aria-label", `Level ${L.n}, ${L.title}. Open profile`);
    $("#lvlChip").title = `Level ${L.n} · ${L.title}`;
  }

  /* =========================================================================
     5. Toasts & dialogs
     ========================================================================= */
  function toast(html, o) {
    o = o || {};
    const el = document.createElement("div");
    el.className = "toast " + (o.cls || "");
    el.innerHTML = `${o.icon ? `<span class="ic" aria-hidden="true">${o.icon}</span>` : ""}<span>${html}</span>${o.action ? `<button type="button">${esc(o.action.label)}</button>` : ""}`;
    if (o.action) el.querySelector("button").onclick = () => { o.action.fn(); kill(); };
    $("#toasts").appendChild(el);
    const kill = () => { el.classList.add("is-out"); setTimeout(() => el.remove(), 300); };
    setTimeout(kill, o.ms || 3200);
    return el;
  }
  function confirmBox(msg, ok, danger) {
    return new Promise((res) => {
      const m = document.createElement("div");
      m.className = "modal";
      m.setAttribute("role", "alertdialog");
      m.setAttribute("aria-modal", "true");
      m.innerHTML = `<div class="modal__card confirm"><h2>${esc(ok)}?</h2><p>${msg}</p><div class="confirm__btns"><button class="btn btn--ghost btn--sm" data-x>Cancel</button><button class="btn btn--sm ${danger ? "btn--danger" : "btn--primary"}" data-ok>${esc(ok)}</button></div></div>`;
      document.body.appendChild(m);
      const done = (v) => { m.remove(); document.removeEventListener("keydown", kd, true); res(v); };
      const kd = (ev) => { if (ev.key === "Escape") { ev.stopPropagation(); done(false); } };
      document.addEventListener("keydown", kd, true);
      m.addEventListener("click", (ev) => { if (ev.target === m || ev.target.closest("[data-x]")) done(false); if (ev.target.closest("[data-ok]")) done(true); });
      m.querySelector("[data-ok]").focus();
    });
  }

  /* =========================================================================
     6. Cards
     ========================================================================= */
  const FMT_LABEL = { podcast: "Podcast", panel: "Panel", debate: "Debate", talk: "Talk", hearing: "Hearing" };
  const ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5-12-7.5Z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
    queue: '<svg viewBox="0 0 24 24"><path d="M4 6h12M4 12h12M4 18h7M18 15v6M15 18h6"/></svg>',
    queued: '<svg viewBox="0 0 24 24"><path d="M4 6h12M4 12h12M4 18h7M15 18l2 2 4-4"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    grip: '<svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg>',
    yt: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9.5 5 2.5-5 2.5v-5Z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  };
  function thumbImg(e, big) {
    const src = big ? `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg` : `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`;
    return `<img src="${src}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${esc(e.thumb)}'">`;
  }
  function whoLine(e) {
    const g = e.people.filter((p) => !p.host).map((p) => p.name);
    return (g.length ? g : e.names).slice(0, 4).join(", ") + (g.length > 4 ? ` +${g.length - 4}` : "");
  }
  function showLine(e) { return (e.show && e.show.length < 48 ? e.show : e.channel) || e.channel; }
  function hl(text, q) {
    const t = esc(text);
    if (!q) return t;
    const words = q.split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (!words.length) return t;
    return t.replace(new RegExp(`(${words.join("|")})`, "ig"), "<mark>$1</mark>");
  }
  function card(e, o) {
    o = o || {};
    const r = H.eps[e.id];
    const p = r ? r.pct || 0 : 0;
    const st = stateOf(e.id);
    const fav = FAVS.has(e.id), q = QUEUE.includes(e.id);
    const left = r && st === "progress" && e.dur ? `${fmtHM(Math.max(0, e.dur - r.pos))} left` : "";
    const cls = "card" + (o.feat ? " card--feat" : "") + (o.mini ? " card--mini" : "");
    return `<article class="${cls}" data-id="${e.id}" style="--i:${o.i || 0}">
      <button class="thumb" data-play="${e.id}" aria-label="Play ${esc(e.title)}">${thumbImg(e, o.feat)}
        <span class="thumb__play" aria-hidden="true">${ICON.play}</span>
        ${o.mini ? "" : `<span class="badge badge--fmt">${FMT_LABEL[e.fmt]}</span>`}
        ${st === "done" ? `<span class="badge badge--done">✓ Watched</span>` : ""}
        <span class="badge badge--dur">${esc(e.durStr || fmtTime(e.dur))}</span>
        ${p > 0 ? `<span class="prog" aria-hidden="true"><i style="width:${Math.max(3, Math.round(p * 100))}%"></i></span>` : ""}
      </button>
      <div class="card__body">
        <span class="card__show">${esc(showLine(e))} · ${fmtDate(e.date, e.approx)}</span>
        <button class="card__title" data-open="${e.id}">${hl(e.title, o.q)}</button>
        ${o.mini ? "" : `<span class="card__who">${hl(whoLine(e), o.q)}</span>`}
        ${o.why ? `<span class="card__why upn__why">${esc(o.why)}</span>` : ""}
        ${o.mini ? (p > 0 ? `<span class="card__who">${Math.round(p * 100)}% watched${left ? " · " + left : ""}</span>` : "") : `<div class="card__foot">
          <span>${p > 0 ? `${Math.round(p * 100)}%${left ? " · " + left : ""}` : esc(FMT_LABEL[e.fmt])}</span><span class="sp"></span>
          <button class="iconbtn ${fav ? "is-on" : ""}" data-fav="${e.id}" aria-pressed="${fav}" aria-label="${fav ? "Remove from" : "Add to"} favorites" title="Favorite">${ICON.star}</button>
          <button class="iconbtn ${q ? "is-on" : ""}" data-q="${e.id}" aria-pressed="${q}" aria-label="${q ? "Remove from" : "Add to"} queue" title="Queue">${q ? ICON.queued : ICON.queue}</button>
          <button class="iconbtn" data-open="${e.id}" aria-label="Details" title="Details">${ICON.info}</button>
        </div>`}
      </div>
    </article>`;
  }
  function skeletons(n) { return Array.from({ length: n }, () => `<div class="skel"><div class="skel__img shimmer"></div><div class="skel__line shimmer"></div><div class="skel__line shimmer"></div></div>`).join(""); }

  /* =========================================================================
     7. Suggestions (Up Next)
     ========================================================================= */
  function similar(a, b) {
    let s = 0;
    const why = [];
    const na = new Set(a.people.filter((p) => !p.host).map((p) => fold(p.name)));
    const shared = b.people.filter((p) => !p.host && na.has(fold(p.name))).map((p) => p.name);
    if (shared.length) { s += 6 * shared.length; why.push(`Also features ${shared[0]}`); }
    const g = b.groups.filter((x) => x !== "other" && a.groups.includes(x));
    if (g.length) { s += 2.5 * g.length; if (!why.length) why.push(`More from ${groupById(g[0]).label}`); }
    if (a.fmt === b.fmt) { s += 1.5; if (!why.length) why.push(`Another ${FMT_LABEL[b.fmt].toLowerCase()}`); }
    if (a.channel && a.channel === b.channel) { s += 1.5; if (!why.length) why.push(`Same channel: ${b.channel}`); }
    let inter = 0;
    a.kw.forEach((w) => { if (b.kw.has(w)) inter++; });
    const jac = inter / Math.max(1, a.kw.size + b.kw.size - inter);
    s += jac * 14;
    if (!why.length && inter >= 3) why.push("Overlapping topics");
    const st = stateOf(b.id);
    if (st === "none") s += 2; else if (st === "progress") s += 1; else s -= 8;
    if (b.outside) s -= 0.5;
    return { e: b, s, why: why[0] || "You might like this" };
  }
  function suggestions(a, n) {
    return STATE.all.filter((b) => b.id !== a.id).map((b) => similar(a, b)).sort((x, y) => y.s - x.s).slice(0, n || 12);
  }

  /* =========================================================================
     8. Player: YouTube IFrame API in a single dock
     ========================================================================= */
  const P = { yt: null, ready: false, apiLoading: false, cur: null, mode: "none", lastMedia: null, lastWall: 0, lastSave: 0, sess: null, cov: null, nB: 0, pending: null, cd: null, chIdx: -1 };
  const dock = $("#dock");

  function loadAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (P.apiLoading) return P.apiLoading;
    P.apiLoading = new Promise((res, rej) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => rej(new Error("YouTube API failed to load"));
      document.head.appendChild(s);
    });
    return P.apiLoading;
  }

  function resumePoint(e) {
    const r = H.eps[e.id];
    if (!r || r.pos < 15) return 0;
    const d = e.dur || r.dur || 0;
    if (d && r.pos > d - 20) return 0;
    return Math.floor(r.pos);
  }

  async function play(id, o) {
    o = o || {};
    const e = STATE.byId.get(id);
    if (!e) return;
    hideCountdown();
    tick(true);
    flush();
    // leaving the queue when it starts
    if (QUEUE.includes(id)) { QUEUE = QUEUE.filter((x) => x !== id); store.set("queue:v1", QUEUE); paintQueueCount(); }
    const start = o.at != null ? Math.floor(o.at) : resumePoint(e);
    P.cur = e;
    P.sess = null; P.lastMedia = null; P.chIdx = -1;
    const r = rec(e.id, true);
    P.nB = Math.max(1, Math.ceil((e.dur || r.dur || 1) / BUCKET));
    P.cov = covDecode(r.cov, P.nB);
    dock.hidden = false;
    $("#dockErr").hidden = true;
    setMode(o.mini ? "mini" : "theater");
    paintTheater();
    try { await loadAPI(); } catch (err) { showEmbedError(e, "The YouTube player could not load (offline or blocked)."); return; }
    if (!P.yt) {
      const pv = { autoplay: 1, start, rel: 0, modestbranding: 1, playsinline: 1, controls: 1, iv_load_policy: 3, enablejsapi: 1 };
      if (/^https?:$/.test(location.protocol)) pv.origin = location.origin;
      P.yt = new YT.Player("ytPlayer", {
        host: "https://www.youtube-nocookie.com", videoId: e.id, width: "100%", height: "100%", playerVars: pv,
        events: {
          onReady: () => {
            P.ready = true;
            applySettings();
            if (P.pending && P.cur && P.pending.id === P.cur.id && P.pending.id !== e.id) P.yt.loadVideoById({ videoId: P.pending.id, startSeconds: P.pending.start });
            else try { P.yt.playVideo(); } catch (x) {}
            P.pending = null;
          },
          onStateChange: onState,
          onError: (ev) => showEmbedError(P.cur, ev.data === 101 || ev.data === 150 ? "The channel does not allow this video to play outside YouTube." : "This video could not be played here."),
          onPlaybackRateChange: () => { SETTINGS.speed = P.yt.getPlaybackRate(); $("#cSpeed").value = String(SETTINGS.speed); },
        },
      });
    } else if (P.ready) {
      P.yt.loadVideoById({ videoId: e.id, startSeconds: start });
      applySettings();
    } else {
      P.pending = { id: e.id, start };
    }
    if (start > 0 && o.at == null) toast(`Resume at <b>${fmtTime(start)}</b>`, { icon: "⏯️", action: { label: "Start over", fn: () => seek(0, true) }, ms: 6000 });
    r.last = Date.now();
    saveH();
  }

  function applySettings() {
    if (!P.yt || !P.ready) return;
    try {
      P.yt.setVolume(SETTINGS.vol);
      SETTINGS.muted ? P.yt.mute() : P.yt.unMute();
      P.yt.setPlaybackRate(Number(SETTINGS.speed) || 1);
    } catch (e) {}
    $("#cVol").value = SETTINGS.vol;
    $("#cSpeed").value = String(SETTINGS.speed);
    $("#cMute").classList.toggle("is-muted", !!SETTINGS.muted);
  }

  function showEmbedError(e, msg) {
    const el = $("#dockErr");
    el.hidden = false;
    el.innerHTML = `<b>${esc(msg)}</b><span style="color:#9fb0c3">${esc(e ? e.title : "")}</span><a class="btn btn--primary btn--sm" href="${esc(e ? e.url : "#")}" target="_blank" rel="noopener">${ICON.yt}<span>Open on YouTube</span></a>`;
  }

  function onState(ev) {
    const s = ev.data;
    const playing = s === 1;
    document.body.classList.toggle("is-playing", playing);
    $("#cPlay").setAttribute("aria-label", playing ? "Pause" : "Play");
    $("#miniToggle").setAttribute("aria-label", playing ? "Pause" : "Play");
    if (playing) {
      $("#dockErr").hidden = true;
      const d = P.yt.getDuration();
      if (d && P.cur) {
        const r = rec(P.cur.id, true);
        if (Math.abs((r.dur || 0) - d) > 2) {
          r.dur = d;
          const nB = Math.max(1, Math.ceil(d / BUCKET));
          if (nB !== P.nB) { const old = P.cov; P.cov = new Uint8Array(Math.ceil(nB / 8)); P.cov.set(old.subarray(0, P.cov.length)); P.nB = nB; }
        }
        if (!P.sess || Date.now() - P.sess.e > 30 * 60e3) {
          P.sess = { s: Date.now(), e: Date.now(), w: 0, a: Math.floor(P.yt.getCurrentTime()), b: 0 };
          r.sessions.push(P.sess);
          if (r.sessions.length > 200) r.sessions.splice(0, r.sessions.length - 200);
          if (!r.first) r.first = Date.now();
        }
      }
      P.lastMedia = P.yt.getCurrentTime();
      P.lastWall = performance.now();
    } else {
      tick(true);
      P.lastMedia = null;
      flush();
    }
    if (s === 0) onEnded();
  }

  /* the strict watch clock: runs every second, counts only contiguous playback */
  function tick(force) {
    if (!P.yt || !P.ready || !P.cur) return;
    let t, st;
    try {
      const vd = P.yt.getVideoData && P.yt.getVideoData();
      if (vd && vd.video_id && vd.video_id !== P.cur.id) return; // old video still reporting: ignore
      t = P.yt.getCurrentTime(); st = P.yt.getPlayerState();
    } catch (e) { return; }
    const now = performance.now();
    const r = rec(P.cur.id, true);
    if ((st === 1 || force) && P.lastMedia != null) {
      const dm = t - P.lastMedia;
      const dw = (now - P.lastWall) / 1000;
      const rate = (P.yt.getPlaybackRate && P.yt.getPlaybackRate()) || 1;
      // contiguous playback: media advanced forward, roughly at playback rate; anything else is a seek
      if (dm > 0 && dw > 0 && dm <= dw * rate * 1.5 + 0.75 && dw < 5) {
        const real = Math.min(dw, dm / rate + 0.25);
        r.watched += real;
        const dk = dayKey(Date.now());
        H.daily[dk] = (H.daily[dk] || 0) + real;
        if (P.sess) { P.sess.w += real; P.sess.e = Date.now(); P.sess.b = Math.floor(t); }
        const a = Math.floor(P.lastMedia / BUCKET), b = Math.floor(t / BUCKET);
        for (let i = a; i <= b && i < P.nB; i++) P.cov[i >> 3] |= 1 << (i & 7);
      }
    }
    if (st === 1) { P.lastMedia = t; P.lastWall = now; }
    r.pos = t;
    r.last = Date.now();
    paintProgress(t);
    if (now - P.lastSave > 5000) flush();
  }

  function flush() {
    if (!P.cur || !P.cov) return;
    const r = rec(P.cur.id, true);
    r.covN = covCount(P.cov, P.nB);
    r.cov = covEncode(P.cov);
    r.pct = clamp(r.covN / P.nB, 0, 1);
    if (!r.done && r.pct >= 0.9) { r.done = true; r.doneAt = Date.now(); toast(`Completed: <b>${esc(P.cur.title.slice(0, 60))}</b>`, { icon: "✅" }); }
    P.lastSave = performance.now();
    saveH();
    paintCoverage();
    checkAwards();
    refreshCardsFor(P.cur.id);
  }
  setInterval(() => tick(false), 1000);
  window.addEventListener("pagehide", () => { tick(true); flush(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { tick(true); flush(); } });

  function seek(t, abs) {
    if (!P.yt || !P.ready) return;
    const cur = P.yt.getCurrentTime();
    const d = P.yt.getDuration() || (P.cur && P.cur.dur) || 0;
    const to = clamp(abs ? t : cur + t, 0, Math.max(0, d - 1));
    P.lastMedia = null; // a seek never counts as watched
    P.yt.seekTo(to, true);
    if (P.yt.getPlayerState() !== 1) P.yt.playVideo();
    paintProgress(to);
  }
  function togglePlay() {
    if (!P.yt || !P.ready) return;
    P.yt.getPlayerState() === 1 ? P.yt.pauseVideo() : P.yt.playVideo();
  }
  function setSpeed(v) { SETTINGS.speed = clamp(Number(v), 0.75, 2); store.set("settings:v1", SETTINGS); if (P.yt && P.ready) P.yt.setPlaybackRate(SETTINGS.speed); $("#cSpeed").value = String(SETTINGS.speed); toast(`Speed ${SETTINGS.speed}×`, { ms: 1200 }); }
  function setVol(v) { SETTINGS.vol = clamp(Math.round(v), 0, 100); SETTINGS.muted = SETTINGS.vol === 0 ? true : false; store.set("settings:v1", SETTINGS); applySettings(); }
  function toggleMute() { SETTINGS.muted = !SETTINGS.muted; store.set("settings:v1", SETTINGS); applySettings(); toast(SETTINGS.muted ? "Muted" : "Sound on", { ms: 1000 }); }
  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (dock.requestFullscreen) dock.requestFullscreen().catch(() => {});
    else if (dock.webkitRequestFullscreen) dock.webkitRequestFullscreen();
  }

  function nextUp() {
    if (QUEUE.length) { const id = QUEUE.find((x) => STATE.byId.has(x)); if (id) return { e: STATE.byId.get(id), why: "From your queue" }; }
    if (!P.cur) return null;
    const s = suggestions(P.cur, 8).find((x) => stateOf(x.e.id) !== "done");
    return s ? { e: s.e, why: s.why } : null;
  }
  function playNext() { const n = nextUp(); if (n) play(n.e.id, { mini: P.mode === "mini" }); else toast("Nothing left to suggest. You've seen it all!", { icon: "🎉" }); }

  function onEnded() {
    flush();
    if (!SETTINGS.autoplay) return;
    const n = nextUp();
    if (!n) return;
    let left = 10;
    const box = $("#countdown");
    $("#cdEp").innerHTML = `${thumbImg(n.e)}<div><b>${esc(n.e.title)}</b><small>${esc(n.why)} · ${esc(n.e.durStr)}</small></div>`;
    $("#cdNum").textContent = left;
    const ring = $("#cdRing");
    ring.style.transition = "none"; ring.style.strokeDashoffset = "0";
    box.hidden = false;
    requestAnimationFrame(() => { ring.style.transition = ""; ring.style.strokeDashoffset = String(106.8 / 10); });
    clearInterval(P.cd);
    P.cd = setInterval(() => {
      left--;
      $("#cdNum").textContent = left;
      ring.style.strokeDashoffset = String(106.8 * ((10 - left + 1) / 10));
      if (left <= 0) { hideCountdown(); play(n.e.id, { mini: P.mode === "mini" }); }
    }, 1000);
    $("#cdPlay").onclick = () => { hideCountdown(); play(n.e.id, { mini: P.mode === "mini" }); };
    $("#cdCancel").onclick = hideCountdown;
    $("#cdPlay").focus();
  }
  function hideCountdown() { clearInterval(P.cd); P.cd = null; $("#countdown").hidden = true; }

  /* ---- dock placement (never reparent the iframe: it would reload) ---- */
  function setMode(m) {
    P.mode = m;
    const th = $("#theater");
    if (m === "theater") {
      th.hidden = false;
      document.body.classList.add("lock");
      dock.classList.remove("is-mini");
    } else {
      th.hidden = true;
      document.body.classList.remove("lock");
      dock.classList.toggle("is-mini", m === "mini");
      if (m === "none") { dock.hidden = true; }
    }
    requestAnimationFrame(placeDock);
  }
  function placeDock() {
    if (dock.hidden) return;
    if (P.mode === "theater") {
      const r = $("#stageSlot").getBoundingClientRect();
      Object.assign(dock.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    } else if (P.mode === "mini") {
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = Math.min(380, vw - 24);
      const h = Math.round((w * 9) / 16) + 54;
      Object.assign(dock.style, { left: vw - w - 16 + "px", top: vh - h - 16 + "px", width: w + "px", height: h + "px" });
    }
  }
  const placeNoAnim = () => { dock.classList.add("no-anim"); placeDock(); clearTimeout(placeNoAnim.t); placeNoAnim.t = setTimeout(() => dock.classList.remove("no-anim"), 80); };
  window.addEventListener("resize", placeNoAnim);
  $(".stagecol").addEventListener("scroll", placeNoAnim, { passive: true });
  $(".theater__body").addEventListener("scroll", placeNoAnim, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(placeNoAnim).observe($("#stageSlot"));

  function minimize() { if (P.cur) setMode("mini"); }
  function expand() { if (P.cur) { setMode("theater"); paintTheater(); } }
  async function closePlayer() {
    tick(true); flush();
    if (P.yt && P.ready) try { P.yt.stopVideo(); } catch (e) {}
    hideCountdown();
    P.cur = null; P.sess = null;
    document.body.classList.remove("is-playing");
    setMode("none");
    renderCurrentView();
  }

  /* ---- theater painting ---- */
  let sideTab = "chapters";
  function paintTheater() {
    const e = P.cur;
    if (!e) return;
    $("#tTitle").textContent = e.title;
    $("#tSub").textContent = `${showLine(e)} · ${fmtDate(e.date, e.approx)} · ${e.durStr}`;
    $("#miniTitle").textContent = e.title;
    $("#miniSub").textContent = whoLine(e);
    const fav = FAVS.has(e.id), q = QUEUE.includes(e.id);
    $("#tMeta").innerHTML = `<h2>${esc(e.title)}</h2>
      <div class="meta"><span class="tag tag--accent">${FMT_LABEL[e.fmt]}</span><span class="tag">${esc(showLine(e))}</span><span class="tag">${fmtDate(e.date, e.approx)}</span><span class="tag">${esc(e.durStr)}</span>${e.outside ? '<span class="tag">Just outside the window</span>' : ""}</div>
      <div class="drawer__act">
        <button class="btn btn--sm ${fav ? "is-on" : ""}" data-fav="${e.id}">${ICON.star}<span>${fav ? "Favorited" : "Favorite"}</span></button>
        <button class="btn btn--sm ${q ? "is-on" : ""}" data-q="${e.id}">${q ? ICON.queued : ICON.queue}<span>${q ? "Queued" : "Add to queue"}</span></button>
        <a class="btn btn--sm btn--ghost" href="${esc(e.url)}" target="_blank" rel="noopener">${ICON.yt}<span>YouTube</span></a>
      </div>
      <p>${esc(e.summary)}</p>`;
    paintChaptersOnSeek();
    paintCoverage();
    paintSide();
  }
  function paintSide() {
    $$("#sideTabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.st === sideTab)));
    const e = P.cur;
    const body = $("#sideBody");
    if (!e) { body.innerHTML = ""; return; }
    if (sideTab === "chapters") {
      const has = e.chapters.some((c) => c.t != null);
      body.innerHTML = `${has ? "" : '<p class="hint" style="margin:4px">This episode has topics but no timestamps, so they are listed for reference.</p>'}${chaptersHTML(e, true)}`;
      P.chIdx = -1;
      highlightChapter();
    } else if (sideTab === "next") {
      const n = nextUp();
      const qs = QUEUE.map((id) => STATE.byId.get(id)).filter(Boolean);
      const sug = suggestions(e, 10);
      body.innerHTML = `<h4><span>Autoplay next</span><label class="toggle"><input type="checkbox" id="apToggle" ${SETTINGS.autoplay ? "checked" : ""}/> ${SETTINGS.autoplay ? "On" : "Off"}</label></h4>
        ${n ? `<div class="upn">${card(n.e, { mini: true, why: n.why })}</div>` : ""}
        ${qs.length ? `<h4><span>Your queue (${qs.length})</span><a href="#/queue">Edit</a></h4><div class="upn">${qs.slice(0, 6).map((x) => card(x, { mini: true })).join("")}</div>` : ""}
        <h4><span>Suggested</span></h4><div class="upn">${sug.map((s) => card(s.e, { mini: true, why: s.why })).join("")}</div>`;
      $("#apToggle").onchange = (ev) => { SETTINGS.autoplay = ev.target.checked; store.set("settings:v1", SETTINGS); paintSide(); };
    } else if (sideTab === "notes") {
      const list = (NOTES[e.id] || []).slice().sort((a, b) => a.t - b.t);
      body.innerHTML = `<div class="notebox">
          <label for="noteText" class="sr">Note</label>
          <textarea id="noteText" placeholder="Write a note… it will be pinned to the time shown below."></textarea>
          <div class="notebox__row"><button class="btn btn--ghost btn--sm" id="noteCap">⏱ <span id="noteAt">${fmtTime(curTime())}</span></button><span class="hint" style="margin:0;flex:1">Tap to re-capture the time</span><button class="btn btn--primary btn--sm" id="noteSave">Save note</button></div>
        </div>
        <ul class="notelist">${list.map((n) => noteHTML(e.id, n)).join("") || '<li class="hint">No notes yet. Press <kbd>N</kbd> while watching to pin one.</li>'}</ul>`;
      let at = curTime();
      $("#noteCap").onclick = () => { at = curTime(); $("#noteAt").textContent = fmtTime(at); };
      $("#noteSave").onclick = () => {
        const txt = $("#noteText").value.trim();
        if (!txt) { $("#noteText").focus(); return; }
        (NOTES[e.id] = NOTES[e.id] || []).push({ id: Date.now().toString(36), t: Math.floor(at), text: txt, at: Date.now() });
        store.set("notes:v1", NOTES);
        toast(`Note saved at <b>${fmtTime(at)}</b>`, { icon: "📝" });
        checkAwards();
        paintSide();
      };
      $("#noteText").addEventListener("keydown", (ev) => { if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) $("#noteSave").click(); });
    } else {
      body.innerHTML = aboutHTML(e);
    }
  }
  function curTime() { try { return P.yt && P.ready ? P.yt.getCurrentTime() : 0; } catch (e) { return 0; } }
  function noteHTML(id, n, readonly) {
    return `<li class="note"><button class="note__t" data-seekid="${id}" data-t="${n.t}" title="Jump to ${fmtTime(n.t)}">${fmtTime(n.t)}</button><div><p>${esc(n.text)}</p><small>${fmtStamp(n.at)}</small></div>${readonly ? "<span></span>" : `<button class="iconbtn iconbtn--sm" data-delnote="${id}|${n.id}" aria-label="Delete note">${ICON.trash}</button>`}</li>`;
  }
  function chaptersHTML(e, live) {
    if (!e.chapters.length) return '<p class="hint">No topics listed.</p>';
    return `<ol class="chapters">${e.chapters.map((c, i) => c.t != null
      ? `<li><button data-seekid="${e.id}" data-t="${c.t}" data-ci="${i}"><time>${fmtTime(c.t)}</time><span>${esc(c.label)}</span></button></li>`
      : `<li><span><time>•</time><span>${esc(c.label)}</span></span></li>`).join("")}</ol>`;
  }
  function peopleHTML(e) {
    return `<div class="people">${e.people.map((p) => {
      const g = NAME2GROUP[fold(p.name)] || (p.host ? HOSTS_GROUP : OTHER_GROUP);
      const linkable = STATE.speakers.has(fold(p.name));
      const inner = `<span class="avatar" style="--g:${g.color}">${esc(initials(p.name))}</span><span><b>${esc(p.name)}</b><small>${esc([p.desc, p.role, p.host ? "host" : ""].filter(Boolean).join(" · ") || g.label)}</small></span>`;
      return linkable ? `<a class="person" href="#/speaker/${encodeURIComponent(p.name)}">${inner}</a>` : `<div class="person">${inner}</div>`;
    }).join("")}</div>`;
  }
  function aboutHTML(e) {
    return `<h4><span>Summary</span></h4><p style="color:var(--text2);margin:0 4px">${esc(e.summary || "Summary not available for this entry.")}</p>
      <h4><span>Speakers</span></h4>${peopleHTML(e)}
      ${e.evidence ? `<h4><span>Verification evidence</span></h4><div class="evidence">${esc(e.evidence)}</div>` : ""}
      <h4><span>Format</span></h4><p style="color:var(--text2);margin:0 4px">${esc(e.formatRaw || FMT_LABEL[e.fmt])}</p>`;
  }
  function highlightChapter() {
    if (!P.cur || sideTab !== "chapters") return;
    const t = curTime();
    let idx = -1;
    P.cur.chapters.forEach((c, i) => { if (c.t != null && c.t <= t + 0.5) { if (idx === -1 || c.t >= P.cur.chapters[idx].t) idx = i; } });
    if (idx === P.chIdx) return;
    P.chIdx = idx;
    $$("#sideBody .chapters button").forEach((b) => {
      const i = +b.dataset.ci;
      b.classList.toggle("is-cur", i === idx);
      b.classList.toggle("is-past", idx !== -1 && P.cur.chapters[i].t < P.cur.chapters[idx].t);
    });
  }
  function durNow() { return (P.yt && P.ready && P.yt.getDuration && P.yt.getDuration()) || (P.cur && P.cur.dur) || 1; }
  function paintProgress(t) {
    const d = durNow();
    const f = clamp(t / d, 0, 1);
    $("#seekFill").style.width = f * 100 + "%";
    $("#seekKnob").style.left = f * 100 + "%";
    $("#cTime").textContent = fmtTime(t);
    $("#cDur").textContent = fmtTime(d);
    $("#seek").setAttribute("aria-valuenow", String(Math.round(f * 100)));
    $("#seek").setAttribute("aria-valuetext", `${fmtTime(t)} of ${fmtTime(d)}`);
    $("#miniProg").style.width = f * 100 + "%";
    highlightChapter();
  }
  function paintCoverage() {
    if (!P.cov) return;
    let html = "", start = -1;
    for (let i = 0; i <= P.nB; i++) {
      const on = i < P.nB && covHas(P.cov, i);
      if (on && start < 0) start = i;
      if (!on && start >= 0) { html += `<i style="left:${(start / P.nB) * 100}%;width:${((i - start) / P.nB) * 100}%"></i>`; start = -1; }
    }
    $("#seekCov").innerHTML = html;
  }
  function paintChaptersOnSeek() {
    const e = P.cur, d = e.dur || 1;
    $("#seekCh").innerHTML = e.chapters.filter((c) => c.t != null && c.t > 0).map((c) => `<i style="left:${(c.t / d) * 100}%"></i>`).join("");
  }

  /* seek bar interactions */
  (function seekBar() {
    const bar = $("#seek"), tip = $("#seekTip");
    const frac = (ev) => { const r = bar.getBoundingClientRect(); return clamp((ev.clientX - r.left) / r.width, 0, 1); };
    let drag = false;
    bar.addEventListener("pointerdown", (ev) => { drag = true; bar.setPointerCapture(ev.pointerId); paintProgress(frac(ev) * durNow()); });
    bar.addEventListener("pointermove", (ev) => {
      const f = frac(ev), t = f * durNow();
      if (drag) paintProgress(t);
      if (!P.cur) return;
      let ch = null;
      P.cur.chapters.forEach((c) => { if (c.t != null && c.t <= t) ch = c; });
      tip.hidden = false;
      tip.style.left = f * 100 + "%";
      tip.textContent = fmtTime(t) + (ch ? " · " + ch.label : "");
    });
    bar.addEventListener("pointerleave", () => (tip.hidden = true));
    bar.addEventListener("pointerup", (ev) => { if (drag) { drag = false; seek(frac(ev) * durNow(), true); } });
    bar.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowLeft") { seek(-10); ev.preventDefault(); ev.stopPropagation(); }
      if (ev.key === "ArrowRight") { seek(10); ev.preventDefault(); ev.stopPropagation(); }
      if (ev.key === "Home") { seek(0, true); ev.preventDefault(); }
    });
  })();

  /* controls */
  $("#ctrl").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "toggle") togglePlay();
    if (a === "back10") seek(-10);
    if (a === "back30") seek(-30);
    if (a === "fwd10") seek(10);
    if (a === "fwd30") seek(30);
    if (a === "next") playNext();
    if (a === "mute") toggleMute();
    if (a === "fs") fullscreen();
    if (a === "note") openNote();
  });
  $("#cVol").addEventListener("input", (ev) => setVol(+ev.target.value));
  $("#cSpeed").addEventListener("change", (ev) => setSpeed(ev.target.value));
  $("#sideTabs").addEventListener("click", (ev) => { const b = ev.target.closest("[data-st]"); if (b) { sideTab = b.dataset.st; paintSide(); } });
  $("#theaterMin").onclick = minimize;
  $("#theaterClose").onclick = closePlayer;
  $("#miniOpen").onclick = expand;
  $("#miniExpand").onclick = expand;
  $("#miniClose").onclick = closePlayer;
  $("#miniToggle").onclick = togglePlay;
  function openNote() {
    if (!P.cur) return;
    if (P.mode !== "theater") expand();
    sideTab = "notes";
    paintSide();
    setTimeout(() => $("#noteText") && $("#noteText").focus(), 60);
  }

  /* =========================================================================
     9. Library view
     ========================================================================= */
  const F = { q: "", fmt: new Set(), len: new Set(), grp: new Set(), st: new Set(), day: null, sort: "newest" };

  function searchScore(e, q) {
    if (!q) return 1;
    const qs = fold(q).split(/\s+/).filter(Boolean);
    let total = 0;
    for (const w of qs) {
      let s = 0;
      if (e.hay.title.includes(w)) s += 3;
      if (e.hay.names.includes(w)) s += 3;
      if (e.hay.show.includes(w)) s += 2;
      if (e.hay.topics.includes(w)) s += 1.2;
      if (e.hay.summary.includes(w)) s += 0.6;
      if (!s && w.length >= 4) {
        // fuzzy: one typo allowed against any word
        const words = (e.hay.title + " " + e.hay.names + " " + e.hay.show + " " + e.hay.topics).split(/[^a-z0-9]+/);
        if (words.some((x) => x.length >= w.length - 1 && near(x.slice(0, w.length + 1), w))) s += 0.8;
      }
      if (!s) return 0;
      total += s;
    }
    return total;
  }
  function near(a, b) {
    // Levenshtein ≤ 1 between b and a prefix of a (a is up to len(b)+1)
    const cand = [a.slice(0, b.length), a.slice(0, b.length + 1), a.slice(0, b.length - 1)];
    return cand.some((x) => lev1(x, b));
  }
  function lev1(a, b) {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0, j = 0, ed = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++ed > 1) return false;
      if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
    }
    return ed + (la - i) + (lb - j) <= 1;
  }

  function filtered() {
    const out = [];
    STATE.inWin.forEach((e) => {
      if (F.fmt.size && !F.fmt.has(e.fmt)) return;
      if (F.len.size && !LENGTHS.some((l) => F.len.has(l.id) && l.test(e.dur))) return;
      if (F.grp.size && !e.groups.some((g) => F.grp.has(g))) return;
      if (F.st.size) {
        const st = stateOf(e.id);
        const ok = (F.st.has(st)) || (F.st.has("fav") && FAVS.has(e.id)) || (F.st.has("notes") && (NOTES[e.id] || []).length);
        if (!ok) return;
      }
      if (F.day && e.date !== F.day) return;
      const sc = searchScore(e, F.q);
      if (!sc) return;
      out.push({ e, sc });
    });
    const by = {
      newest: (a, b) => b.e.date.localeCompare(a.e.date) || b.e.dur - a.e.dur,
      oldest: (a, b) => a.e.date.localeCompare(b.e.date),
      longest: (a, b) => b.e.dur - a.e.dur,
      shortest: (a, b) => a.e.dur - b.e.dur,
      relevant: (a, b) => b.sc - a.sc || b.e.date.localeCompare(a.e.date),
      unwatched: (a, b) => ({ none: 0, progress: 1, done: 2 }[stateOf(a.e.id)] - { none: 0, progress: 1, done: 2 }[stateOf(b.e.id)]) || b.e.date.localeCompare(a.e.date),
    };
    const sortKey = F.q && F.sort === "newest" && F._autoRel ? "relevant" : F.sort;
    return out.sort(by[sortKey] || by.newest).map((x) => x.e);
  }

  function chipsHTML() {
    const cnt = (pred) => STATE.inWin.filter(pred).length;
    const g = (lbl, key, items) => `<div class="chipgroup" role="group" aria-label="${lbl}"><span class="chipgroup__lbl">${lbl}</span>${items.map((it) => `<button class="chip" data-chip="${key}" data-v="${it.id}" aria-pressed="${F[key].has(it.id)}">${it.color ? `<i style="width:8px;height:8px;border-radius:50%;background:${it.color}"></i>` : ""}${esc(it.label)} <b>${it.n}</b></button>`).join("")}</div>`;
    return g("Format", "fmt", FORMATS.map((f) => ({ ...f, n: cnt((e) => e.fmt === f.id) })))
      + g("Length", "len", LENGTHS.map((l) => ({ ...l, n: cnt((e) => l.test(e.dur)) })))
      + g("People", "grp", GROUPS.concat([OTHER_GROUP]).map((x) => ({ id: x.id, label: x.label, color: x.color, n: cnt((e) => e.groups.includes(x.id)) })).filter((x) => x.n))
      + g("You", "st", [
        { id: "none", label: "Not started", n: cnt((e) => stateOf(e.id) === "none") },
        { id: "progress", label: "In progress", n: cnt((e) => stateOf(e.id) === "progress") },
        { id: "done", label: "Completed", n: cnt((e) => stateOf(e.id) === "done") },
        { id: "fav", label: "Favorites", n: cnt((e) => FAVS.has(e.id)) },
        { id: "notes", label: "With notes", n: cnt((e) => (NOTES[e.id] || []).length > 0) },
      ]);
  }

  function renderGrid() {
    const list = filtered();
    const active = F.q || F.fmt.size || F.len.size || F.grp.size || F.st.size || F.day;
    $("#clearFilters").hidden = !active;
    $("#chips").innerHTML = chipsHTML();
    const hrs = list.reduce((a, e) => a + e.dur, 0);
    $("#count").textContent = `${list.length} of ${STATE.inWin.length} episodes · ${hoursStr(hrs)}${F.day ? ` · ${fmtDate(F.day)}` : ""}`;
    $("#grid").innerHTML = list.length ? list.map((e, i) => card(e, { i: Math.min(i, 20), q: F.q })).join("")
      : `<div class="empty" style="grid-column:1/-1"><b>No episodes match.</b>Try fewer filters, or a different spelling.</div>`;
    $$(".heat button").forEach((b) => b.classList.toggle("is-sel", b.dataset.day === F.day));
  }

  function renderHeat() {
    const counts = {};
    STATE.inWin.forEach((e) => (counts[e.date] = (counts[e.date] || 0) + 1));
    const watchedDays = new Set(STATE.inWin.filter((e) => ((H.eps[e.id] || {}).watched || 0) >= 60).map((e) => e.date));
    const maxDay = STATE.inWin.reduce((m, e) => (e.date > m ? e.date : m), "2026-10-01");
    let html = "";
    for (let d = 1; d <= 31; d++) {
      const k = `2026-10-${pad(d)}`;
      const n = counts[k] || 0;
      const future = k > maxDay;
      html += `<button data-day="${k}" data-n="${Math.min(4, n)}" class="${watchedDays.has(k) ? "is-watched" : ""}" ${n ? "" : "disabled"} title="Oct ${d}: ${future ? "after the compile date" : n + " episode" + (n === 1 ? "" : "s")}" aria-label="October ${d}, ${n} episodes">${d}</button>`;
    }
    $("#heat").innerHTML = html;
  }

  function animateCount(el, end, fmt) {
    if (RM) { el.textContent = fmt(end); return; }
    const t0 = performance.now(), dur = 1100;
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  function renderLibrary(first) {
    const st = $("#heroStats");
    const total = STATE.inWin.reduce((a, e) => a + e.dur, 0);
    const spk = new Set();
    STATE.inWin.forEach((e) => e.people.filter((p) => !p.host).forEach((p) => spk.add(fold(p.name))));
    const shows = new Set(STATE.inWin.map((e) => fold(e.channel).replace(/\s*\(.*$/, "")));
    if (first) {
      animateCount($('[data-k="episodes"]', st), STATE.inWin.length, (v) => Math.round(v));
      animateCount($('[data-k="hours"]', st), total / 3600, (v) => Math.round(v) + "h");
      animateCount($('[data-k="speakers"]', st), spk.size, (v) => Math.round(v));
      animateCount($('[data-k="shows"]', st), shows.size, (v) => Math.round(v));
    }
    $('[data-k="watched"]', st).textContent = hoursStr(totalWatched());

    // continue watching
    const cont = STATE.all.filter((e) => stateOf(e.id) === "progress").sort((a, b) => H.eps[b.id].last - H.eps[a.id].last);
    $("#rowContinue").hidden = !cont.length;
    $("#railContinue").innerHTML = cont.slice(0, 12).map((e, i) => card(e, { i })).join("");

    // featured
    $("#railFeatured").innerHTML = FEATURED.map((f, i) => { const e = STATE.byId.get(f.id); return e ? card(e, { feat: true, why: f.why, i }) : ""; }).join("");

    // because you watched
    const seed = STATE.all.filter((e) => H.eps[e.id] && H.eps[e.id].watched >= 60).sort((a, b) => H.eps[b.id].last - H.eps[a.id].last)[0];
    $("#rowForYou").hidden = !seed;
    if (seed) {
      $("#forYouSeed").textContent = seed.title.length > 54 ? seed.title.slice(0, 52) + "…" : seed.title;
      $("#railForYou").innerHTML = suggestions(seed, 10).map((s, i) => card(s.e, { why: s.why, i })).join("");
    }
    $("#railOutside").innerHTML = STATE.outside.sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => card(e, { i })).join("");
    renderHeat();
    renderGrid();
  }

  function refreshCardsFor(id) {
    // light-touch refresh: update progress bars on visible cards without re-rendering everything
    const r = H.eps[id];
    $$(`.card[data-id="${CSS.escape(id)}"]`).forEach((c) => {
      const th = c.querySelector(".thumb");
      if (!th || !r) return;
      let pr = th.querySelector(".prog");
      if (!pr) { pr = document.createElement("span"); pr.className = "prog"; pr.innerHTML = "<i></i>"; th.appendChild(pr); }
      pr.firstChild.style.width = Math.max(3, Math.round((r.pct || 0) * 100)) + "%";
    });
    const w = $('[data-k="watched"]');
    if (w) w.textContent = hoursStr(totalWatched());
  }

  /* =========================================================================
     10. Detail drawer
     ========================================================================= */
  let drawerReturn = null;
  function openDrawer(id) {
    const e = STATE.byId.get(id);
    if (!e) return;
    drawerReturn = document.activeElement;
    const r = H.eps[id];
    const p = r ? r.pct || 0 : 0;
    const resume = resumePoint(e);
    const fav = FAVS.has(id), q = QUEUE.includes(id);
    const notes = (NOTES[id] || []).slice().sort((a, b) => a.t - b.t);
    $("#drawerBody").innerHTML = `
      <div class="drawer__hero"><button class="thumb" data-play="${id}" aria-label="Play">${thumbImg(e, true)}<span class="thumb__play" style="opacity:1;transform:none">${ICON.play}</span>${p > 0 ? `<span class="prog"><i style="width:${Math.max(3, p * 100)}%"></i></span>` : ""}</button>
        <button class="iconbtn drawer__x" id="drawerX" aria-label="Close details">${ICON.x}</button></div>
      <div class="drawer__c">
        <h2 id="drawerTitle">${esc(e.title)}</h2>
        <div class="meta"><span class="tag tag--accent">${FMT_LABEL[e.fmt]}</span><span class="tag">${esc(e.channel)}</span><span class="tag">${fmtDate(e.date, e.approx)}</span><span class="tag">${esc(e.durStr)}</span>${e.approx ? '<span class="tag" title="Date estimated">~ estimated date</span>' : ""}</div>
        ${e.show && e.show !== e.channel ? `<p style="font-size:13.5px">${esc(e.show)}</p>` : ""}
        <div class="drawer__act">
          <button class="btn btn--primary" data-play="${id}">${ICON.play}<span>${resume ? "Resume at " + fmtTime(resume) : stateOf(id) === "done" ? "Watch again" : "Play"}</span></button>
          ${resume ? `<button class="btn" data-playat="${id}" data-t="0">Start over</button>` : ""}
          <button class="btn ${fav ? "is-on" : ""}" data-fav="${id}">${ICON.star}<span>${fav ? "Favorited" : "Favorite"}</span></button>
          <button class="btn ${q ? "is-on" : ""}" data-q="${id}">${q ? ICON.queued : ICON.queue}<span>${q ? "Queued" : "Queue"}</span></button>
          <a class="btn btn--ghost" href="${esc(e.url)}" target="_blank" rel="noopener">${ICON.yt}<span>YouTube</span></a>
        </div>
        ${r && r.watched > 0 ? `<div class="pbar" style="margin-top:12px"><i style="width:${p * 100}%"></i></div><p style="font-size:12.5px;margin-top:6px;color:var(--text3)">${Math.round(p * 100)}% played · ${fmtHM(r.watched)} watched in ${r.sessions.length} session${r.sessions.length === 1 ? "" : "s"}${r.done ? " · completed " + fmtStamp(r.doneAt) : ""}</p>` : ""}
        <h3>Summary</h3><p>${esc(e.summary || "No summary for this entry yet.")}</p>
        <h3>${e.chapters.some((c) => c.t != null) ? "Chapters" : "Topics"}</h3>${chaptersHTML(e)}
        <h3>Speakers</h3>${peopleHTML(e)}
        ${e.evidence ? `<h3>Verification evidence</h3><div class="evidence">${esc(e.evidence)}</div>` : ""}
        ${notes.length ? `<h3>Your notes</h3><ul class="notelist">${notes.map((n) => noteHTML(id, n)).join("")}</ul>` : ""}
        <h3>More like this</h3><div class="upn">${suggestions(e, 4).map((s) => card(s.e, { mini: true, why: s.why })).join("")}</div>
      </div>`;
    $("#drawer").hidden = false;
    $("#drawerScrim").hidden = false;
    $("#drawer").scrollTop = 0;
    $("#drawerX").onclick = closeDrawer;
    $("#drawerX").focus();
  }
  function closeDrawer() {
    if ($("#drawer").hidden) return;
    $("#drawer").hidden = true;
    $("#drawerScrim").hidden = true;
    if (drawerReturn && drawerReturn.focus) drawerReturn.focus();
  }
  $("#drawerScrim").onclick = closeDrawer;

  /* =========================================================================
     11. History view
     ========================================================================= */
  let histFilter = "all";
  function renderHistory() {
    const tw = totalWatched();
    const sk = streaks();
    const sessions = Object.values(H.eps).reduce((a, r) => a + (r.sessions || []).length, 0);
    const prog = STATE.all.filter((e) => stateOf(e.id) === "progress").length;
    $("#histKpis").innerHTML = [
      ["kpi--accent", hoursStr(tw), "total watched"],
      ["", doneCount(), "completed"],
      ["", prog, "in progress"],
      ["kpi--amber", sk.cur + (sk.cur === 1 ? " day" : " days"), "current streak"],
      ["", sk.best + (sk.best === 1 ? " day" : " days"), "longest streak"],
      ["", sessions, "sessions"],
    ].map(([c, v, l]) => `<div class="kpi ${c}"><b>${v}</b><span>${l}</span></div>`).join("");

    // last 28 days
    const days = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(dayKey(d)); }
    const max = Math.max(60, ...days.map((k) => H.daily[k] || 0));
    $("#histBars").innerHTML = days.map((k, i) => {
      const v = H.daily[k] || 0;
      return `<div style="--i:${i};height:${Math.max(2, (v / max) * 100)}%" class="${v < 1 ? "is-zero" : ""} ${i === 27 ? "is-today" : ""}" title="${k}: ${Math.round(v / 60)} min" aria-label="${k}: ${Math.round(v / 60)} minutes"></div>`;
    }).join("");

    $$("#histSeg button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.f === histFilter)));
    let list = STATE.all.slice();
    if (histFilter === "progress") list = list.filter((e) => stateOf(e.id) === "progress");
    else if (histFilter === "done") list = list.filter((e) => stateOf(e.id) === "done");
    else if (histFilter === "none") list = list.filter((e) => stateOf(e.id) === "none" && !e.outside);
    else list = list.filter((e) => H.eps[e.id] && (H.eps[e.id].watched > 0 || H.eps[e.id].done));
    list.sort((a, b) => ((H.eps[b.id] || {}).last || 0) - ((H.eps[a.id] || {}).last || 0) || b.date.localeCompare(a.date));
    $("#histList").innerHTML = list.length ? list.map((e, i) => {
      const r = H.eps[e.id];
      const p = r ? r.pct || 0 : 0;
      return `<div class="hitem" style="--i:${Math.min(i, 20)}"><button class="thumb" data-play="${e.id}" aria-label="Play ${esc(e.title)}">${thumbImg(e)}<span class="badge badge--dur">${esc(e.durStr)}</span></button>
        <div><button class="hitem__t" data-open="${e.id}">${esc(e.title)}</button>
          <div class="hitem__m">${esc(showLine(e))} · ${r ? `${Math.round(p * 100)}% played · ${fmtHM(r.watched)} watched · at ${fmtTime(r.pos)}${r.last ? " · last " + fmtStamp(r.last) : ""}${r.done ? " · ✓ completed" : ""}` : "Not started · " + esc(e.durStr)}</div>
          <div class="pbar"><i style="width:${p * 100}%"></i></div></div>
        <div class="hitem__a"><button class="btn btn--sm btn--primary" data-play="${e.id}">${r && r.pos > 15 && !r.done ? "Resume" : "Play"}</button>${r ? `<button class="iconbtn" data-clear="${e.id}" aria-label="Clear history for this episode" title="Clear">${ICON.trash}</button>` : ""}</div></div>`;
    }).join("") : `<div class="empty"><b>${histFilter === "all" ? "Nothing watched yet." : "Nothing here."}</b>${histFilter === "all" ? "Play any episode and your progress appears here, second by second." : ""}</div>`;

    // timeline
    const sess = [];
    Object.keys(H.eps).forEach((id) => (H.eps[id].sessions || []).forEach((s) => { if (s.w >= 5) sess.push({ id, ...s }); }));
    sess.sort((a, b) => b.s - a.s);
    const byDay = {};
    sess.forEach((s) => (byDay[dayKey(s.s)] = byDay[dayKey(s.s)] || []).push(s));
    const keys = Object.keys(byDay).sort().reverse().slice(0, 30);
    $("#histTimeline").innerHTML = keys.length ? keys.map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      const tot = byDay[k].reduce((a, s) => a + s.w, 0);
      return `<div class="tday"><h3>${new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} <span>${fmtHM(tot)}</span></h3>
        ${byDay[k].map((s) => { const e = STATE.byId.get(s.id); const t = new Date(s.s); return `<div class="tsess"><time>${pad(t.getHours())}:${pad(t.getMinutes())}</time><b>${e ? `<a href="#" data-open="${s.id}">${esc(e.title)}</a>` : esc(s.id)}</b><em>${fmtTime(s.a)} → ${fmtTime(s.b)} · ${fmtHM(s.w)}</em></div>`; }).join("")}</div>`;
    }).join("") : '<p class="hint">Sessions appear here with their start time, the stretch you watched, and how long.</p>';
  }
  $("#histSeg").addEventListener("click", (ev) => { const b = ev.target.closest("[data-f]"); if (b) { histFilter = b.dataset.f; renderHistory(); } });

  async function clearOne(id) {
    const e = STATE.byId.get(id);
    if (!(await confirmBox(`This removes your progress, coverage and sessions for “${esc(e ? e.title : id)}”. Notes and favorites stay.`, "Clear history", true))) return;
    const r = H.eps[id];
    if (r) (r.sessions || []).forEach((s) => { const k = dayKey(s.s); H.daily[k] = Math.max(0, (H.daily[k] || 0) - s.w); });
    delete H.eps[id];
    if (P.cur && P.cur.id === id) { P.cov = new Uint8Array(Math.ceil(P.nB / 8)); P.sess = null; }
    saveH();
    toast("History cleared for that episode", { icon: "🧹" });
    renderCurrentView();
  }
  $("#clearAllBtn").onclick = async () => {
    if (!(await confirmBox("This permanently deletes all watch progress, sessions, streaks and badges in this browser. Notes, favorites and the queue stay. Export first if you want a backup.", "Clear all history", true))) return;
    H = freshHistory();
    EARNED = {};
    if (P.cur) { P.cov = new Uint8Array(Math.ceil(P.nB / 8)); P.sess = null; }
    saveH(); store.set("badges:v1", EARNED);
    toast("All watch history cleared", { icon: "🧹" });
    checkAwards(true);
    renderCurrentView();
  };
  $("#exportBtn").onclick = () => {
    flush();
    const data = { app: "ai-safety-full-episodes", schema: 1, exportedAt: new Date().toISOString(), history: H, notes: NOTES, favorites: Array.from(FAVS), queue: QUEUE, badges: EARNED, settings: SETTINGS };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ai-safety-watch-history-${dayKey(Date.now())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("History exported", { icon: "💾" });
  };
  $("#importFile").onchange = async (ev) => {
    const f = ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.app !== "ai-safety-full-episodes" || !d.history || d.history.v !== 1) throw new Error("Not an export from this app");
      if (!(await confirmBox(`Replace your current history with the file from ${esc(String(d.exportedAt || "an export").slice(0, 10))}? It holds ${Object.keys(d.history.eps || {}).length} episodes.`, "Import", false))) return;
      H = d.history;
      Object.keys(NOTES).forEach((k) => delete NOTES[k]); Object.assign(NOTES, d.notes || {});
      FAVS = new Set(d.favorites || []);
      QUEUE = (d.queue || []).filter((id) => typeof id === "string");
      EARNED = d.badges || {};
      Object.assign(SETTINGS, d.settings || {});
      saveAll();
      toast("History imported", { icon: "📥" });
      checkAwards(true);
      paintQueueCount();
      renderCurrentView();
    } catch (err) { toast("Import failed: " + esc(err.message), { icon: "⚠️", ms: 5000 }); }
  };

  /* =========================================================================
     12. Speakers
     ========================================================================= */
  function renderSpeakers() {
    const q = fold($("#spq").value);
    const groups = GROUPS.concat([OTHER_GROUP, HOSTS_GROUP]);
    const sp = Array.from(STATE.speakers.values()).filter((s) => !q || fold(s.name + " " + s.desc).includes(q));
    $("#spGroups").innerHTML = groups.map((g) => {
      const list = sp.filter((s) => s.group.id === g.id).sort((a, b) => b.eps.length - a.eps.length || a.name.localeCompare(b.name));
      if (!list.length) return "";
      return `<section class="spgroup"><h2 style="--g:${g.color}"><i></i>${esc(g.label)} <span style="color:var(--text3)">${list.length}</span></h2><div class="spgrid">${list.map((s) => {
        const w = s.eps.filter((id) => stateOf(id) !== "none").length;
        return `<a class="spcard" href="#/speaker/${encodeURIComponent(s.name)}" style="--g:${g.color}"><span class="avatar">${esc(initials(s.name))}</span><span class="spcard__t"><b>${esc(s.name)}</b><small>${esc(s.desc || g.label)}</small></span><span class="spcount" title="${s.eps.length} episodes, ${w} watched">${s.eps.length}</span></a>`;
      }).join("")}</div></section>`;
    }).join("") || '<div class="empty"><b>No one by that name.</b></div>';
  }
  $("#spq").addEventListener("input", debounce(renderSpeakers, 120));

  function renderSpeaker(name) {
    const s = STATE.speakers.get(fold(name));
    const el = $("#speakerPage");
    if (!s) { el.innerHTML = `<div class="empty"><b>Speaker not found.</b><a href="#/speakers">Back to the directory</a></div>`; return; }
    const eps = s.eps.map((id) => STATE.byId.get(id)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
    const tot = eps.reduce((a, e) => a + e.dur, 0);
    const w = eps.reduce((a, e) => a + ((H.eps[e.id] || {}).watched || 0), 0);
    const done = eps.filter((e) => stateOf(e.id) === "done").length;
    el.innerHTML = `<p><a href="#/speakers">← All speakers</a></p>
      <div class="sphead"><span class="avatar avatar--xl" style="--g:${s.group.color}">${esc(initials(s.name))}</span>
        <div><h1>${esc(s.name)}</h1><p>${Array.from(s.descs).map(esc).join(" · ") || esc(s.group.label)}</p>
          <div class="sproles"><span class="tag tag--accent">${esc(s.group.label)}</span><span class="tag">${eps.length} episode${eps.length === 1 ? "" : "s"}</span><span class="tag">${hoursStr(tot)} of video</span>${s.hostEps ? `<span class="tag">host on ${s.hostEps}</span>` : ""}<span class="tag">you: ${done}/${eps.length} complete · ${fmtHM(w)}</span></div>
          <div class="drawer__act"><button class="btn btn--primary btn--sm" data-queueall="${esc(s.name)}">Queue all ${eps.length}</button></div>
        </div></div>
      <div class="grid">${eps.map((e, i) => card(e, { i })).join("")}</div>`;
  }

  /* =========================================================================
     13. Queue
     ========================================================================= */
  function paintQueueCount() { const c = $("#queueCount"); c.hidden = !QUEUE.length; c.textContent = QUEUE.length; }
  function toggleQueue(id) {
    if (QUEUE.includes(id)) { QUEUE = QUEUE.filter((x) => x !== id); toast("Removed from queue", { ms: 1600 }); }
    else { QUEUE.push(id); toast(`Queued · position ${QUEUE.length}`, { icon: "📚", ms: 1800 }); }
    store.set("queue:v1", QUEUE);
    paintQueueCount();
    checkAwards();
  }
  function toggleFav(id) {
    FAVS.has(id) ? FAVS.delete(id) : FAVS.add(id);
    store.set("favs:v1", Array.from(FAVS));
    toast(FAVS.has(id) ? "Added to favorites" : "Removed from favorites", { icon: FAVS.has(id) ? "⭐" : "", ms: 1600 });
    checkAwards();
  }
  function renderQueue() {
    const items = QUEUE.map((id) => STATE.byId.get(id)).filter(Boolean);
    $("#queuePlay").disabled = !items.length;
    $("#qlist").innerHTML = items.length ? items.map((e, i) => `<li class="qitem" draggable="true" data-qid="${e.id}">
        <span class="qitem__h" aria-hidden="true">${ICON.grip}</span>
        <button class="thumb" data-play="${e.id}" aria-label="Play ${esc(e.title)}">${thumbImg(e)}${pctOf(e.id) ? `<span class="prog"><i style="width:${pctOf(e.id) * 100}%"></i></span>` : ""}</button>
        <div><div class="qitem__t">${esc(e.title)}</div><div class="qitem__m">${esc(showLine(e))} · ${esc(e.durStr)}</div></div>
        <div class="qitem__a"><button class="iconbtn iconbtn--sm" data-qmove="${e.id}" data-d="-1" aria-label="Move up" ${i ? "" : "disabled"}>${ICON.up}</button><button class="iconbtn iconbtn--sm" data-qmove="${e.id}" data-d="1" aria-label="Move down" ${i < items.length - 1 ? "" : "disabled"}>${ICON.down}</button><button class="iconbtn iconbtn--sm" data-q="${e.id}" aria-label="Remove from queue">${ICON.x}</button></div>
      </li>`).join("") : '<li class="empty"><b>Your queue is empty.</b>Use the queue button on any episode. Queued episodes play before suggestions.</li>';
    const favs = STATE.all.filter((e) => FAVS.has(e.id));
    $("#favGrid").innerHTML = favs.length ? favs.map((e, i) => card(e, { i })).join("") : '<div class="empty" style="grid-column:1/-1"><b>No favorites yet.</b>Tap the star on any episode.</div>';
    // drag & drop
    let dragId = null;
    $$("#qlist .qitem").forEach((li) => {
      li.addEventListener("dragstart", (ev) => { dragId = li.dataset.qid; li.classList.add("is-drag"); ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", dragId); } catch (x) {} });
      li.addEventListener("dragend", () => { li.classList.remove("is-drag"); $$("#qlist .is-over").forEach((x) => x.classList.remove("is-over")); });
      li.addEventListener("dragover", (ev) => { ev.preventDefault(); li.classList.add("is-over"); });
      li.addEventListener("dragleave", () => li.classList.remove("is-over"));
      li.addEventListener("drop", (ev) => {
        ev.preventDefault();
        const to = li.dataset.qid;
        if (!dragId || dragId === to) return;
        const arr = QUEUE.filter((x) => x !== dragId);
        arr.splice(arr.indexOf(to) + (QUEUE.indexOf(dragId) < QUEUE.indexOf(to) ? 1 : 0), 0, dragId);
        QUEUE = arr; store.set("queue:v1", QUEUE); renderQueue();
      });
    });
  }
  $("#queuePlay").onclick = () => { if (QUEUE.length) play(QUEUE[0]); };
  $("#queueClear").onclick = async () => { if (QUEUE.length && (await confirmBox("Remove every episode from your queue?", "Clear queue", true))) { QUEUE = []; store.set("queue:v1", QUEUE); paintQueueCount(); renderQueue(); } };

  /* =========================================================================
     14. Profile
     ========================================================================= */
  function renderProfile() {
    const X = xp(), L = levelInfo(X), sk = streaks();
    const earned = BADGES.filter((b) => { const [c, t] = b.prog(); return c >= t; }).length;
    const fmtsSeen = FORMATS.filter((f) => watchedSecFor((e) => e.fmt === f.id) >= 60).map((f) => f.label);
    $("#profilePage").innerHTML = `<div class="pagehead"><div><p class="eyebrow">Levels &amp; achievements</p><h1>Your profile</h1></div></div>
      <div class="prof">
        <div class="prof__card">
          <div class="bigring"><svg viewBox="0 0 190 190" aria-hidden="true"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs><circle cx="95" cy="95" r="85" class="ring__bg"/><circle cx="95" cy="95" r="85" class="ring__fg" id="bigRing"/></svg>
            <div class="bigring__in"><span>Level</span><b>${L.n}</b></div></div>
          <div class="prof__title">${esc(L.title)}</div>
          <div class="prof__xp">${X.toLocaleString()} XP · ${earned}/${BADGES.length} badges</div>
          <div class="prof__next">${L.next ? `${L.need} XP to ${esc(L.next)}` : "Top level reached"}</div>
          <div class="ladder">${LEVELS.map((l, i) => `<div class="${i + 1 < L.n ? "is-done" : i + 1 === L.n ? "is-cur" : ""}"><span>${i + 1}. ${esc(l[1])}</span><span>${l[0]} XP</span></div>`).join("")}</div>
          <p class="hint" style="margin-top:14px">XP: 1 per minute actually watched, 50 per completed episode, 5 per note, 30 per badge.</p>
        </div>
        <div>
          <div class="kpis">
            <div class="kpi kpi--accent"><b>${hoursStr(totalWatched())}</b><span>watched</span></div>
            <div class="kpi"><b>${doneCount()}</b><span>completed</span></div>
            <div class="kpi kpi--amber"><b>${sk.cur}</b><span>day streak (best ${sk.best})</span></div>
            <div class="kpi"><b>${heardSpeakers()}</b><span>speakers heard</span></div>
            <div class="kpi"><b>${noteCount()}</b><span>notes</span></div>
          </div>
          <div class="panel"><div class="panel__head"><h2>Badges</h2><span class="row__sub">${earned} of ${BADGES.length} earned${fmtsSeen.length ? " · formats tried: " + esc(fmtsSeen.join(", ")) : ""}</span></div>
            <div class="badges">${BADGES.map((b) => { const [c, t] = b.prog(); const ok = c >= t; return `<div class="bdg ${ok ? "is-earned" : ""}"><span class="bdg__ic" aria-hidden="true">${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small>${ok ? `<small>Earned ${EARNED[b.id] ? fmtStamp(EARNED[b.id]) : ""}</small>` : `<div class="pbar"><i style="width:${Math.min(100, (c / t) * 100)}%"></i></div><small>${Math.floor(c)} / ${t}</small>`}</div>`; }).join("")}</div>
          </div>
        </div>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const r = $("#bigRing"); if (r) r.style.strokeDashoffset = String(534 * (1 - L.frac)); }));
  }

  /* =========================================================================
     15. Router, events, keyboard
     ========================================================================= */
  let VIEW = "library";
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const [v, ...rest] = h.split("/");
    const arg = decodeURIComponent(rest.join("/"));
    if (v === "watch" && arg && STATE.byId.has(arg)) { history.replaceState(null, "", "#/library"); show("library"); play(arg); return; }
    if (v === "ep" && arg && STATE.byId.has(arg)) { show("library"); openDrawer(arg); return; }
    show(["library", "history", "speakers", "speaker", "queue", "profile", "notes"].includes(v) ? v : "library", arg);
  }
  function show(v, arg) {
    closeDrawer();
    const changed = VIEW !== v;
    VIEW = v;
    $$(".view").forEach((s) => (s.hidden = s.dataset.view !== v));
    $$(".tabs a").forEach((a) => a.toggleAttribute("aria-current", a.dataset.tab === v || (v === "speaker" && a.dataset.tab === "speakers")));
    $$(".tabs a").forEach((a) => { if (a.hasAttribute("aria-current")) a.setAttribute("aria-current", "page"); });
    if (P.mode === "theater") minimize();
    renderCurrentView(arg);
    if (changed) window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" });
  }
  function renderCurrentView(arg) {
    if (VIEW === "library") renderLibrary(false);
    else if (VIEW === "history") renderHistory();
    else if (VIEW === "speakers") renderSpeakers();
    else if (VIEW === "speaker") renderSpeaker(arg != null ? arg : decodeURIComponent(location.hash.split("/").slice(2).join("/")));
    else if (VIEW === "queue") renderQueue();
    else if (VIEW === "profile") renderProfile();
  }
  window.addEventListener("hashchange", route);

  // global click delegation
  document.addEventListener("click", (ev) => {
    const t = ev.target;
    let b;
    if ((b = t.closest("[data-play]"))) { ev.preventDefault(); closeDrawer(); play(b.dataset.play); return; }
    if ((b = t.closest("[data-playat]"))) { ev.preventDefault(); closeDrawer(); play(b.dataset.playat, { at: +b.dataset.t }); return; }
    if ((b = t.closest("[data-open]"))) { ev.preventDefault(); openDrawer(b.dataset.open); return; }
    if ((b = t.closest("[data-fav]"))) { ev.preventDefault(); toggleFav(b.dataset.fav); rerenderAfterToggle(b.dataset.fav); return; }
    if ((b = t.closest("[data-q]"))) { ev.preventDefault(); toggleQueue(b.dataset.q); rerenderAfterToggle(b.dataset.q); return; }
    if ((b = t.closest("[data-qmove]"))) {
      const id = b.dataset.qmove, d = +b.dataset.d, i = QUEUE.indexOf(id), j = i + d;
      if (i < 0 || j < 0 || j >= QUEUE.length) return;
      [QUEUE[i], QUEUE[j]] = [QUEUE[j], QUEUE[i]];
      store.set("queue:v1", QUEUE); renderQueue();
      const btn = $(`#qlist [data-qmove="${CSS.escape(id)}"][data-d="${d}"]`); if (btn && !btn.disabled) btn.focus();
      return;
    }
    if ((b = t.closest("[data-queueall]"))) {
      const s = STATE.speakers.get(fold(b.dataset.queueall));
      if (s) { let n = 0; s.eps.forEach((id) => { if (!QUEUE.includes(id) && stateOf(id) !== "done") { QUEUE.push(id); n++; } }); store.set("queue:v1", QUEUE); paintQueueCount(); checkAwards(); toast(`${n} episode${n === 1 ? "" : "s"} added to your queue`, { icon: "📚" }); }
      return;
    }
    if ((b = t.closest("[data-seekid]"))) {
      ev.preventDefault();
      const id = b.dataset.seekid, at = +b.dataset.t;
      if (P.cur && P.cur.id === id) seek(at, true);
      else { closeDrawer(); play(id, { at }); }
      return;
    }
    if ((b = t.closest("[data-delnote]"))) {
      const [id, nid] = b.dataset.delnote.split("|");
      NOTES[id] = (NOTES[id] || []).filter((n) => n.id !== nid);
      if (!NOTES[id].length) delete NOTES[id];
      store.set("notes:v1", NOTES);
      if (P.cur && P.cur.id === id && sideTab === "notes") paintSide(); else if (!$("#drawer").hidden) openDrawer(id);
      return;
    }
    if ((b = t.closest("[data-chip]"))) {
      const set = F[b.dataset.chip], v = b.dataset.v;
      set.has(v) ? set.delete(v) : set.add(v);
      renderGrid();
      return;
    }
    if ((b = t.closest(".heat button"))) {
      F.day = F.day === b.dataset.day ? null : b.dataset.day;
      renderGrid();
      $("#browse").scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
      return;
    }
    if ((b = t.closest("[data-clear]"))) { clearOne(b.dataset.clear); return; }
  });
  function rerenderAfterToggle(id) {
    if (P.cur && P.cur.id === id) { paintTheater(); }
    if (!$("#drawer").hidden) { const keep = $("#drawer").scrollTop; openDrawer(id); $("#drawer").scrollTop = keep; }
    if (VIEW !== "library" || !$("#drawer").hidden) renderCurrentView();
    else {
      // re-render only the cards for this id, keep scroll position
      $$(`.card[data-id="${CSS.escape(id)}"]`).forEach((c) => {
        const opts = { feat: c.classList.contains("card--feat"), mini: c.classList.contains("card--mini") };
        const why = c.querySelector(".card__why");
        if (why) opts.why = why.textContent;
        const tmp = document.createElement("div");
        tmp.innerHTML = card(STATE.byId.get(id), opts);
        tmp.firstElementChild.style.animation = "none";
        c.replaceWith(tmp.firstElementChild);
      });
    }
  }

  $("#q").addEventListener("input", debounce((ev) => { F.q = ev.target.value.trim(); F._autoRel = true; renderGrid(); }, 110));
  $("#sort").addEventListener("change", (ev) => { F.sort = ev.target.value; F._autoRel = false; renderGrid(); });
  $("#clearFilters").onclick = () => { F.q = ""; $("#q").value = ""; F.fmt.clear(); F.len.clear(); F.grp.clear(); F.st.clear(); F.day = null; renderGrid(); };
  $("#heroPlay").onclick = () => {
    const cont = STATE.all.filter((e) => stateOf(e.id) === "progress").sort((a, b) => H.eps[b.id].last - H.eps[a.id].last)[0];
    play(cont ? cont.id : QUEUE[0] || FEATURED[0].id);
  };
  $("#searchJump").onclick = focusSearch;
  function focusSearch() { if (VIEW !== "library") location.hash = "#/library"; setTimeout(() => { $("#browse").scrollIntoView({ behavior: RM ? "auto" : "smooth" }); $("#q").focus({ preventScroll: true }); }, 50); }
  $("#lvlChip").onclick = () => (location.hash = "#/profile");
  $("#themeBtn").onclick = () => {
    const t = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("asfe:theme", t); } catch (e) {}
    $('meta[name="theme-color"]').setAttribute("content", t === "light" ? "#f4f7fa" : "#06090f");
  };
  const help = $("#help");
  function openHelp() { help.hidden = false; help.querySelector("[data-close]").focus(); }
  $("#helpBtn").onclick = openHelp;
  help.addEventListener("click", (ev) => { if (ev.target === help || ev.target.closest("[data-close]")) help.hidden = true; });
  document.addEventListener("fullscreenchange", () => setTimeout(placeDock, 50));

  document.addEventListener("keydown", (ev) => {
    const tag = (ev.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || ev.target.isContentEditable;
    if (ev.key === "Escape") {
      if (!help.hidden) { help.hidden = true; return; }
      if (!$("#countdown").hidden) { hideCountdown(); return; }
      if (!$("#drawer").hidden) { closeDrawer(); return; }
      if (typing) { ev.target.blur(); return; }
      if (P.mode === "theater") { minimize(); return; }
      return;
    }
    if (typing || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const k = ev.key;
    if (k === "?") { ev.preventDefault(); help.hidden ? openHelp() : (help.hidden = true); return; }
    if (k === "/") { ev.preventDefault(); focusSearch(); return; }
    if (!P.cur) return;
    const inBtn = tag === "button" || tag === "a";
    switch (k) {
      case " ": if (inBtn) return; ev.preventDefault(); togglePlay(); break;
      case "k": case "K": togglePlay(); break;
      case "j": case "J": seek(-10); break;
      case "l": case "L": seek(10); break;
      case "ArrowLeft": ev.preventDefault(); seek(ev.shiftKey ? -30 : -10); break;
      case "ArrowRight": ev.preventDefault(); seek(ev.shiftKey ? 30 : 10); break;
      case "ArrowUp": if (P.mode === "theater") { ev.preventDefault(); setVol(SETTINGS.vol + 5); toast(`Volume ${SETTINGS.vol}`, { ms: 800 }); } break;
      case "ArrowDown": if (P.mode === "theater") { ev.preventDefault(); setVol(SETTINGS.vol - 5); toast(`Volume ${SETTINGS.vol}`, { ms: 800 }); } break;
      case "N": if (ev.shiftKey) playNext(); break;
      case "n": openNote(); break;
      case "P": if (ev.shiftKey) { const t = curTime(); const prev = P.cur.chapters.filter((c) => c.t != null && c.t < t - 3).pop(); seek(prev ? prev.t : 0, true); } break;
      case "m": case "M": toggleMute(); break;
      case "f": case "F": fullscreen(); break;
      case "t": case "T": P.mode === "theater" ? minimize() : expand(); break;
      case ",": setSpeed([0.75, 1, 1.25, 1.5, 1.75, 2][Math.max(0, [0.75, 1, 1.25, 1.5, 1.75, 2].indexOf(Number(SETTINGS.speed)) - 1)] || 1); break;
      case ".": setSpeed([0.75, 1, 1.25, 1.5, 1.75, 2][Math.min(5, [0.75, 1, 1.25, 1.5, 1.75, 2].indexOf(Number(SETTINGS.speed)) + 1)] || 1); break;
      default:
        if (/^[0-9]$/.test(k)) seek((durNow() * Number(k)) / 10, true);
    }
  });

  /* =========================================================================
     16. Boot
     ========================================================================= */
  async function boot() {
    $("#grid").innerHTML = skeletons(8);
    $("#railFeatured").innerHTML = skeletons(4);
    paintQueueCount();
    await loadData();
    if (!STATE.all.length) { $("#grid").innerHTML = '<div class="empty" style="grid-column:1/-1"><b>Could not load the episode data.</b>Serve the folder over http (for example <code>python3 -m http.server</code>).</div>'; return; }
    QUEUE = QUEUE.filter((id) => STATE.byId.has(id));
    checkAwards(true);
    renderLibrary(true);
    route();
  }
  boot();
})();
