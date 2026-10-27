/* AI Safety Full Episodes · core: helpers, storage + migration, taxonomy, data loading & normalisation.
 * Built by Aniruddha Adak. No build step: every module attaches to window.ASFE. */
(function () {
  "use strict";
  const A = (window.ASFE = window.ASFE || {});

  /* ---------------------------------------------------------------- helpers */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fold = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const pad = (n) => String(n).padStart(2, "0");
  const RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const cssEsc = (s) => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\\]\[]/g, "\\$&"));
  const slug = (s) => fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function toSec(str) {
    if (str == null || str === "") return null;
    if (typeof str === "number") return str;
    const m = String(str).trim().match(/^(\d{1,2}:)?\d{1,2}:\d{2}$/);
    if (!m) return null;
    return String(str).trim().split(":").map(Number).reduce((a, b) => a * 60 + b, 0);
  }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
  }
  function fmtHM(s) {
    s = Math.round(s || 0);
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  function hoursStr(s) { const h = (s || 0) / 3600; return h >= 10 ? Math.round(h) + "h" : (Math.round(h * 10) / 10) + "h"; }
  function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso, approx) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return `${approx ? "~" : ""}${MONTHS[m - 1]} ${d}, ${y}`;
  }
  function fmtShort(iso) { if (!iso) return ""; const [, m, d] = iso.split("-").map(Number); return `${MONTHS[m - 1]} ${d}`; }
  function fmtStamp(ts) {
    const d = new Date(ts);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function initials(name) {
    const p = String(name || "?").replace(/\(.*?\)/g, "").trim().split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]/.test(w));
    return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  /* gradient avatars stay inside the amber / teal / green / blue family (never purple or pink) */
  const HUES = [[32, 48], [168, 190], [140, 165], [200, 215], [20, 38], [45, 60], [180, 200], [150, 175]];
  function avatarGradient(name) {
    const h = hash(fold(name));
    const [a, b] = HUES[h % HUES.length];
    return `linear-gradient(135deg,hsl(${a} 80% 52%),hsl(${b} 70% 34%))`;
  }

  /* ---------------------------------------------------------------- storage */
  const NS = "asfe:";
  const store = {
    get(k, def) { try { const v = localStorage.getItem(NS + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) {} },
    raw(k) { try { return localStorage.getItem(NS + k); } catch (e) { return null; } },
  };

  /* Storage migration chain v1 → v2 → v3. Older keys are never deleted: they stay as backups.
   * v1→v2 copies the original keys once; v2→v3 copies every v2 key to a v3 key once and adds the new v3 stores. */
  const SCHEMA = 3;
  const V3_KEYS = ["history", "notes", "favs", "queue", "settings", "badges", "follows", "savedFilters", "prefs", "xpSeen"];
  function migrate() {
    const meta = store.get("schema", null);
    if (meta && meta.v >= SCHEMA) return meta;
    const report = { v: SCHEMA, at: Date.now(), from: meta ? meta.v : null, moved: [], prev: meta || null };
    // v1 → v2 (only when no v2 data exists yet)
    const h1 = store.get("history:v1", null);
    if (!store.get("history:v2", null) && h1 && typeof h1.eps === "object") {
      store.set("history:v2", { v: 2, created: h1.created || Date.now(), eps: h1.eps || {}, daily: h1.daily || {}, stats: { chapterJumps: 0, pipSec: 0, audioSec: 0, pipUses: 0, seeks: 0 }, migratedFrom: 1 });
      report.from = 1; report.moved.push("history");
    }
    ["notes", "favs", "queue", "settings", "badges"].forEach((k) => {
      if (store.raw(k + ":v2") == null) { const v = store.get(k + ":v1", null); if (v != null) { store.set(k + ":v2", v); report.from = 1; if (!report.moved.includes(k)) report.moved.push(k); } }
    });
    // v2 → v3 (copy; keep v2 as backup)
    V3_KEYS.forEach((k) => {
      if (store.raw(k + ":v3") == null && store.raw(k + ":v2") != null) {
        const v = store.get(k + ":v2", null);
        if (v != null) { if (k === "history" && typeof v === "object") { v.v = 3; v.migratedFromV2 = Date.now(); } store.set(k + ":v3", v); if (report.from == null) report.from = 2; if (!report.moved.includes(k)) report.moved.push(k); }
      }
    });
    store.set("schema", report);
    return report;
  }

  /* ---------------------------------------------------------------- taxonomy */
  const FORMATS = [
    { id: "podcast", label: "Podcast / interview" },
    { id: "debate", label: "Debate" },
    { id: "panel", label: "Panel" },
    { id: "talk", label: "Talk / lecture" },
    { id: "hearing", label: "Hearing" },
  ];
  function fmtBucket(raw) {
    const f = fold(raw);
    if (/hearing|testimony|committee/.test(f)) return "hearing";
    if (/debate/.test(f) && !/debate speech/.test(f)) return "debate";
    if (/panel|roundtable/.test(f)) return "panel";
    if (/talk|lecture|keynote|workshop|seminar|presentation/.test(f)) return "talk";
    return "podcast";
  }
  const LENGTHS = [
    { id: "s", label: "< 40 min", test: (d) => d < 2400 },
    { id: "m", label: "40–90 min", test: (d) => d >= 2400 && d < 5400 },
    { id: "l", label: "1.5–2 h", test: (d) => d >= 5400 && d < 7200 },
    { id: "xl", label: "2 h +", test: (d) => d >= 7200 },
  ];
  const LEVELS_EP = ["Intro", "Intermediate", "Deep-dive"];
  const MONTH_LIST = [
    { id: "all", label: "All", long: "Jul–Oct 2026" },
    { id: "2026-07", label: "July", long: "July 2026" },
    { id: "2026-08", label: "August", long: "August 2026" },
    { id: "2026-09", label: "September", long: "September 2026" },
    { id: "2026-10", label: "October", long: "October 2026" },
  ];
  const GROUPS = [
    { id: "insiders", label: "Ex-lab insiders & forecasters", color: "#f59e0b" },
    { id: "miri", label: "MIRI", color: "#ef4444" },
    { id: "pause", label: "ControlAI & PauseAI", color: "#f97316" },
    { id: "orgs", label: "Safety orgs & evals", color: "#14b8a6" },
    { id: "labs", label: "Frontier-lab researchers", color: "#3b82f6" },
    { id: "academics", label: "Academics & pioneers", color: "#10b981" },
    { id: "policy", label: "Policy & governance", color: "#22d3ee" },
    { id: "other", label: "Other voices", color: "#84cc16" },
    { id: "hosts", label: "Hosts & interviewers", color: "#64748b" },
  ];
  const groupById = (id) => GROUPS.find((g) => g.id === id) || GROUPS[7];

  /* hosts / interviewers / moderators: shown as "Host", never the star */
  const HOSTS = new Set([
    "joe rogan", "steven bartlett", "megyn kelly", "tucker carlson", "liron shapira", "nathan labenz", "dwarkesh patel", "tim scarfe", "robert wright", "ezra klein",
    "lex fridman", "sam harris", "bill o'reilly", "peter mccormack", "freddie sayers", "brian keating", "danny jones", "alex kantrowitz", "joe weisenthal", "tracy alloway",
    "jon stewart", "bill maher", "piers morgan", "chris williamson", "patrick bet-david", "theo von", "andrew bustamante", "jordan peterson", "glenn beck", "ross douthat",
    "kara swisher", "scott galloway", "hard fork", "kevin roose", "casey newton", "john sherman", "jan jekielek", "karl stefanovic", "patrice roy", "scott tong",
    "zershaaneh qureshi", "rob wiblin", "luisa rodriguez", "spencer greenberg", "nicholas thompson", "sarah ferguson", "max winga", "evan solomon", "atrioc", "rocket drew",
    "claire melamed", "emre yavuz", "michael shermer", "neil degrasse tyson", "katie couric", "anderson cooper", "fareed zakaria", "christiane amanpour", "jim acosta", "chuck todd",
  ]);
  const HOST_RX = /\b(host|hosts|co-host|cohost|moderator|moderated|interviewer|anchor|presenter|journalist|reporter|streamer|correspondent|editor|narrator|chair of the hearing|committee chair)\b/i;

  /* orgs we can recognise in affiliation strings */
  const ORG_RX = [
    ["MIRI", /\bmiri\b|machine intelligence research/i], ["ControlAI", /controlai|control ai/i], ["PauseAI", /pauseai|pause ai/i],
    ["Future of Life Institute", /future of life|\bfli\b/i], ["METR", /\bmetr\b/i], ["Redwood Research", /redwood/i], ["Apollo Research", /apollo research/i],
    ["AI Futures Project", /ai futures/i], ["Google DeepMind", /deepmind/i], ["Anthropic", /anthropic/i], ["OpenAI", /openai/i],
    ["Mila / LawZero", /\bmila\b|lawzero|loizero|montr[eé]al/i], ["UC Berkeley", /berkeley|\bchai\b/i], ["University of Oxford", /oxford/i], ["MIT", /\bmit\b/i],
    ["FAR.AI", /far\.?ai|far․ai/i], ["Palisade Research", /palisade/i], ["Georgetown CSET", /\bcset\b|georgetown/i], ["Alignment Research Center", /alignment research center|\barc\b/i],
    ["Center for AI Safety", /center for ai safety|\bcais\b/i], ["UK AI Security Institute", /aisi|ai security institute|ai safety institute/i], ["Harvard", /harvard/i],
    ["University of Louisville", /louisville/i], ["University of Toronto", /toronto/i], ["Truthful AI", /truthful ai/i], ["Eleos AI", /eleos/i],
    ["Forethought", /forethought/i], ["AVERI", /averi/i], ["Guidelight AI", /guidelight/i], ["Conjecture", /conjecture/i], ["Cambridge", /cambridge/i], ["Stanford", /stanford/i],
  ];
  function orgsIn(text) { const out = []; ORG_RX.forEach(([n, rx]) => { if (rx.test(text || "")) out.push(n); }); return out; }

  /* topic tags derived for every episode (October items also carry hand-written tags) */
  const TAG_RX = [
    ["P(doom)", /p\s*\(\s*doom|probability of doom|chance (that )?(ai|it) (kills|destroys|wipes)|extinction risk/i],
    ["Timelines", /timeline|agi by|by 20[23]\d|superintelligence (by|within|in \d)|years away|decade/i],
    ["Superintelligence", /superintelligen|\basi\b/i],
    ["Interpretability", /interpretab|mechanistic|circuits|sparse autoencoder/i],
    ["AI control", /\bai control\b|control agenda|monitoring|untrusted model/i],
    ["Deceptive alignment", /decept|scheming|sandbag|alignment faking|lying|sycophan/i],
    ["Evals", /\beval|benchmark|red[- ]team|capabilit(y|ies) test/i],
    ["Governance", /governance|regulat|legislat|treaty|policy|law\b|bill\b|licens/i],
    ["Compute governance", /compute (governance|threshold|monitor)|chips?|export control|datacenter|data center/i],
    ["Pause / ban", /\bpause\b|moratorium|\bban\b|prohibit|stop (the )?race/i],
    ["Race dynamics", /\brace\b|arms race|china|geopolit/i],
    ["Jobs & economy", /\bjobs?\b|unemploy|economy|labou?r market|automation of work/i],
    ["Whistleblowing", /whistleblow|resign|quit|fired|insider/i],
    ["Hugging Face incident", /hugging face/i],
    ["Recursive self-improvement", /recursive|self-improv|intelligence explosion|automated ai research|automate ai r&d/i],
    ["Alignment", /\balignment\b|misalign|value learning|rlhf/i],
    ["Bio & cyber risk", /bioweapon|pandemic|biolog|cyber/i],
    ["AI welfare", /welfare|sentien|conscious|moral patient/i],
    ["Existential risk", /existential|extinction|x-risk|doom/i],
  ];

  /* ---------------------------------------------------------------- data */
  const STATE = { all: [], byId: new Map(), speakers: new Map(), roster: [], rosterBy: new Map(), claims: [], days: new Map(), loadedFrom: "", dupes: 0, rawCount: 0 };
  const STOP = new Set("the a an and or of to in on for with is are be by as at from it its this that how why what who we our you your ai not vs his her their them they than into about after over more most can could would will just new full episode interview podcast talk panel says said has have was were do does did one two".split(" "));
  function tokens(s) { return fold(s).replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)); }

  function parseSpeaker(raw) {
    if (raw && typeof raw === "object") {
      const name = String(raw.name || "").trim();
      const desc = String(raw.affiliation || raw.role || "").trim();
      return { name, desc, isHost: HOST_RX.test(desc) };
    }
    const s = String(raw || "").trim();
    const m = s.match(/^(.+?)\s*(?:\((.*)\))?(?:\s+[—–-]\s+(.+))?$/);
    const name = m ? m[1].trim() : s;
    const desc = m && m[2] ? m[2].trim() : "";
    const role = m && m[3] ? m[3].trim() : "";
    return { name, desc: [desc, role].filter(Boolean).join(" · "), isHost: HOST_RX.test(role) || /^(host|moderator)\b/i.test(desc) || /\bhost\b\)?$/i.test(desc) };
  }
  const TS_RX = /^\s*[\[(]?((?:\d{1,2}:)?\d{1,2}:\d{2})[\])]?\s*(?:[-–—:|·]\s*)?(.+)$/s;
  function parseTimed(x) {
    if (x && typeof x === "object") return { t: x.seconds != null ? Number(x.seconds) : toSec(x.t || x.time), title: x.title || x.topic || x.label || "", detail: x.detail || "" };
    const m = String(x).match(TS_RX);
    if (m) return { t: toSec(m[1]), title: m[2].trim(), detail: "" };
    return { t: null, title: String(x), detail: "" };
  }

  function isRosterName(n) { return STATE.rosterBy.has(fold(n)); }

  function classifyClaim(text) {
    const f = fold(text);
    const risk = /(p\s*\(doom|chance|odds|probab|%|percent|one in|1 in|coin flip|likely)/.test(f) && /(kill|extinct|destroy|doom|catastroph|wipe|die|disempower|lose control|loss of control|survive|existential|ruin|end of humanity|takeover|go badly|everyone dies|annihilat)/.test(f);
    const time = /(\b20[2-9]\d\b|\d+\s*(-|to)?\s*\d*\s*(years?|months?)|decade|next year|within)/.test(f) && /(agi|superintelligen|\basi\b|automat|human-level|transformative|intelligence explosion|recursive|arrive|ai research|surpass|smarter than)/.test(f);
    return risk ? "P(doom)" : time ? "Timeline" : null;
  }
  function headline(text) {
    const t = String(text);
    const rxs = [/(\d+(?:\.\d+)?\s*(?:–|-|to)\s*\d+(?:\.\d+)?\s*%)/, /(>\s*\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*%)/, /((?:one|1) in (?:\d+|one|two|three|four|five|six|ten|a hundred))/i, /(coin flip)/i, /(\b20[2-9]\d\b(?:\s*[–-]\s*20[2-9]\d)?)/];
    for (const rx of rxs) { const m = t.match(rx); if (m) return m[1].replace(/\s+/g, " "); }
    return "";
  }

  function normalize(raw) {
    const id = raw.id || (raw.url && (raw.url.match(/[?&]v=([\w-]{11})/) || [])[1]);
    if (!id) return null;
    const date = String(raw.date || "").slice(0, 10);
    const month = raw.month || date.slice(0, 7);
    const sp = (Array.isArray(raw.speakers) ? raw.speakers : String(raw.speakers || "").split(/,\s*(?![^()]*\))/)).filter(Boolean).map(parseSpeaker).filter((x) => x.name);
    const names = Array.isArray(raw.names) && raw.names.length ? raw.names.slice() : sp.map((x) => x.name);
    const seen = new Set();
    const people = [];
    function add(name, desc, hostFlag) {
      const k = fold(name);
      if (!k || seen.has(k) || /^(narration|moderator|quoted statement|unknown)$/.test(k)) return;
      seen.add(k);
      const host = !isRosterName(name) && (hostFlag || HOSTS.has(k));
      people.push({ name, desc: desc || "", host, k, slug: slug(name) });
    }
    names.forEach((n) => { const hit = sp.find((x) => fold(x.name) === fold(n) || fold(x.name).startsWith(fold(n)) || fold(n).startsWith(fold(x.name))) || { desc: "", isHost: false }; add(n, hit.desc, hit.isHost); });
    sp.forEach((x) => { if (!/\//.test(x.name)) add(x.name, x.desc, x.isHost); else add(x.name, x.desc, x.isHost); });
    const stars = people.filter((p) => !p.host);
    const dur = toSec(raw.duration) || (raw.verification && raw.verification.duration_seconds) || 0;

    let chapters = [];
    let topics = [];
    if (Array.isArray(raw.chapters) && raw.chapters.length) chapters = raw.chapters.map(parseTimed);
    const tp = (raw.topics || []).map(parseTimed);
    if (!chapters.length) chapters = tp.filter((c) => c.t != null);
    topics = tp.filter((c) => c.t == null).map((c) => c.title);
    chapters = chapters.filter((c) => c.t == null || !dur || c.t <= dur + 5).sort((a, b) => (a.t || 0) - (b.t || 0));

    const claims = (raw.key_claims || []).map((k) => {
      if (k && typeof k === "object") return { t: k.seconds != null ? Number(k.seconds) : toSec(k.t), speaker: k.speaker || "", text: k.quote || k.text || "", quote: true };
      const p = parseTimed(k);
      let text = p.title.replace(/^[—–-]\s*/, "");
      let speaker = "";
      const sm = text.match(/^([A-Z][\w.'’-]+(?:\s+[A-Z][\w.'’-]+){0,3})\s*:\s*(.+)$/s);
      if (sm) { speaker = sm[1]; text = sm[2]; }
      return { t: p.t, speaker, text, quote: /['"“‘]/.test(text) };
    }).filter((c) => c.text);
    // resolve claim speaker names (e.g. "Bengio" → "Yoshua Bengio")
    claims.forEach((c) => {
      const cand = c.speaker ? people.find((p) => fold(p.name) === fold(c.speaker) || fold(p.name).split(" ").pop() === fold(c.speaker).split(" ").pop()) : null;
      if (cand) c.speaker = cand.name;
      else if (!c.speaker && stars.length === 1) c.speaker = stars[0].name;
      else if (!c.speaker) { const hit = stars.find((p) => fold(c.text).includes(fold(p.name).split(" ").pop())); if (hit) c.speaker = hit.name; }
    });
    const numbers = (raw.numbers || []).map((n) => (n && typeof n === "object" ? { t: n.seconds != null ? Number(n.seconds) : toSec(n.t), speaker: n.speaker || "", text: n.value || n.text || "" } : { t: parseTimed(n).t, speaker: "", text: parseTimed(n).title })).filter((n) => n.text);

    const bag = [raw.title, raw.summary, chapters.map((c) => c.title + " " + c.detail).join(" "), topics.join(" "), claims.map((c) => c.text).join(" ")].join(" \n ");
    const tags = Array.from(new Set((raw.tags || []).concat(TAG_RX.filter(([, rx]) => rx.test(bag)).map(([n]) => n))));
    const fmt = fmtBucket((raw.format || "") + " " + (/hearing/i.test(raw.title || "") ? "hearing" : ""));
    let level = raw.level || null;
    let levelEst = false;
    if (!LEVELS_EP.includes(level)) {
      levelEst = true;
      const f = fold(raw.format);
      if (/workshop|lecture|seminar|technical|conference talk/.test(f) || /interpretab|mechanistic|deductive|theorem|eval methodology/.test(fold(bag)) || dur >= 7200) level = "Deep-dive";
      else if (dur && dur < 2100 && /tv|radio|news|segment|interview/.test(f)) level = "Intro";
      else level = dur && dur < 1500 ? "Intro" : "Intermediate";
    }
    const orgs = new Set();
    stars.forEach((p) => { const r = STATE.rosterBy.get(p.k); if (r) orgs.add(r.org.split(" / ")[0]); orgsIn(p.desc).forEach((o) => orgs.add(o)); });
    const orgsMentioned = Array.isArray(raw.orgs_mentioned) ? raw.orgs_mentioned : [];
    const peopleMentioned = Array.isArray(raw.people_mentioned) ? raw.people_mentioned : [];
    const groups = Array.from(new Set(stars.map((p) => { const r = STATE.rosterBy.get(p.k); return r ? r.group : "other"; })));
    const e = {
      id, title: raw.title || "Untitled", channel: raw.channel || "", show: raw.show || "", date, month, approx: !!raw.approx,
      dur, durStr: raw.duration || fmtTime(dur), people, stars, names, formatRaw: raw.format || "", fmt, summary: raw.summary || "",
      chapters, topics, claims, numbers, tags, level, levelEst, views: typeof raw.views === "number" ? raw.views : null,
      whyWatch: raw.why_watch || "", evidence: raw.evidence || "", url: raw.url || `https://www.youtube.com/watch?v=${id}`,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, orgs: Array.from(orgs), orgsMentioned, peopleMentioned, groups,
      verified: raw.verified !== false, subs: raw.channel_subscribers || null,
    };
    e.hay = {
      title: fold(e.title), names: fold(people.map((p) => p.name).join(" ")), show: fold(e.show + " " + e.channel), tags: fold(tags.join(" ")),
      chapters: fold(chapters.map((c) => c.title + " " + c.detail).join(" ") + " " + topics.join(" ")), claims: fold(claims.map((c) => c.text).join(" ") + " " + numbers.map((n) => n.text).join(" ")),
      summary: fold(e.summary + " " + e.formatRaw + " " + e.orgs.join(" ") + " " + orgsMentioned.join(" ")),
    };
    e.words = Array.from(new Set(tokens(Object.values(e.hay).join(" "))));
    e.kw = new Set(tokens(e.title + " " + chapters.map((c) => c.title).join(" ") + " " + topics.join(" ") + " " + e.summary));
    return e;
  }

  async function getJSON(url, onProg) {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error(url + " " + r.status);
    if (onProg && r.body && r.body.getReader && typeof TextDecoder !== "undefined") {
      const total = Number((r.headers && r.headers.get && r.headers.get("content-length")) || 0) || 900000;
      const rd = r.body.getReader(), dec = new TextDecoder(); let txt = "", got = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; got += value.length; txt += dec.decode(value, { stream: true }); onProg(Math.min(0.95, got / total)); }
      txt += dec.decode(); onProg(1);
      return JSON.parse(txt);
    }
    const j = await r.json(); if (onProg) onProg(1); return j;
  }
  const asList = (d) => (Array.isArray(d) ? d : d && Array.isArray(d.episodes) ? d.episodes : []);

  async function loadData() {
    let eps = null, roster = null, photos = {}, extras = [];
    try {
      [eps, roster, photos] = await Promise.all([getJSON("data/episodes.json", (f) => A.onLoadProgress && A.onLoadProgress(f)), getJSON("data/roster.json"), getJSON("data/photos.json").catch(() => ({}))]);
      STATE.loadedFrom = "network";
      try {
        const man = await getJSON("data/manifest.json");
        const files = Array.isArray(man) ? man : man.files || [];
        const loaded = await Promise.all(files.map((f) => getJSON("data/" + String(typeof f === "string" ? f : f.path).replace(/^\.?\/?(data\/)?/, "")).catch(() => [])));
        loaded.forEach((d) => (extras = extras.concat(asList(d))));
        STATE.manifestFiles = files.length;
      } catch (e) { STATE.manifestFiles = 0; }
    } catch (e) {
      if (!window.ASFE_INLINE) await new Promise((res) => { const sc = document.createElement("script"); sc.src = "assets/data-inline.js"; sc.onload = sc.onerror = res; document.head.appendChild(sc); });
      const inl = window.ASFE_INLINE || {};
      eps = inl.episodes || [];
      roster = inl.roster || [];
      photos = inl.photos || {};
      STATE.loadedFrom = "inline";
    }
    ingest(asList(eps).concat(extras), roster || [], photos || {});
  }

  function ingest(rawList, roster, photos) {
    STATE.photos = new Map(Object.entries(photos || {}).map(([n, f]) => [fold(n), "assets/speakers/" + f]));
    STATE.roster = roster.map((r) => ({ ...r, k: fold(r.name), slug: slug(r.name), photoUrl: "assets/speakers/" + r.photo }));
    STATE.rosterBy = new Map(STATE.roster.map((r) => [r.k, r]));
    const map = new Map();
    STATE.rawCount = rawList.length;
    rawList.forEach((r) => { const e = normalize(r); if (e) map.set(e.id, e); }); // dedupe: a later (daily) copy of an id wins
    STATE.dupes = rawList.length - map.size;
    STATE.all = Array.from(map.values()).sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title));
    STATE.byId = map;
    buildSpeakers();
    buildClaims();
    STATE.days = new Map();
    STATE.all.forEach((e) => STATE.days.set(e.date, (STATE.days.get(e.date) || 0) + 1));
  }

  function buildSpeakers() {
    const m = new Map();
    STATE.all.forEach((e) => e.people.forEach((p) => {
      if (!m.has(p.k)) {
        const r = STATE.rosterBy.get(p.k);
        m.set(p.k, { k: p.k, name: r ? r.name : p.name, slug: p.slug, descs: new Map(), eps: [], hostEps: 0, roster: r || null, photo: r ? r.photoUrl : null, org: r ? r.org : "", bio: r ? r.bio : "", group: r ? r.group : null });
      }
      const s = m.get(p.k);
      if (p.desc) s.descs.set(p.desc, (s.descs.get(p.desc) || 0) + 1);
      if (!s.eps.includes(e.id)) s.eps.push(e.id);
      if (p.host) s.hostEps++;
    }));
    m.forEach((s) => {
      if (!s.photo && STATE.photos.has(s.k)) s.photo = STATE.photos.get(s.k);
      // photo fallback: thumbnail of the speaker's best solo episode (fewest speakers, then longest)
      const best = s.eps.map((id) => STATE.byId.get(id)).sort((a, b) => a.people.length - b.people.length || b.dur - a.dur)[0];
      s.thumbPhoto = best ? best.thumb : null;
      s.isHost = !s.roster && s.hostEps >= Math.ceil(s.eps.length / 2);
      if (!s.group) s.group = s.isHost ? "hosts" : "other";
      const bd = Array.from(s.descs.entries()).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0];
      s.desc = bd ? bd[0] : "";
      if (!s.org) s.org = (orgsIn(s.desc)[0]) || (s.isHost ? "Host" : s.desc.split(/[;,]/)[0].slice(0, 48));
      if (!s.bio) s.bio = s.isHost ? "Host or interviewer in this library." : s.desc;
      s.secs = s.eps.reduce((a, id) => a + (STATE.byId.get(id).dur || 0), 0);
    });
    // roster members always exist, even with 0 episodes
    STATE.roster.forEach((r) => { if (!m.has(r.k)) m.set(r.k, { k: r.k, name: r.name, slug: r.slug, eps: [], hostEps: 0, roster: r, photo: r.photoUrl, org: r.org, bio: r.bio, group: r.group, isHost: false, desc: r.org, secs: 0, descs: new Map() }); });
    STATE.speakers = m;
    STATE.bySlug = new Map(Array.from(m.values()).map((s) => [s.slug, s]));
  }

  function buildClaims() {
    const out = [];
    const seen = new Set();
    STATE.all.forEach((e) => {
      const items = e.numbers.map((n) => ({ ...n, src: "number" })).concat(e.claims.map((c) => ({ ...c, src: "claim" })));
      items.forEach((it) => {
        const kind = classifyClaim(it.text);
        if (!kind) return;
        let sp = it.speaker ? e.people.find((p) => fold(p.name) === fold(it.speaker) || fold(it.speaker).startsWith(fold(p.name))) : null;
        if (!sp && it.speaker && isRosterName(it.speaker)) sp = { name: STATE.rosterBy.get(fold(it.speaker)).name, host: false };
        if (!sp || sp.host) return; // only attributable researcher statements
        const key = e.id + "|" + fold(sp.name) + "|" + kind + "|" + (it.t || 0);
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ id: e.id, speaker: sp.name, k: fold(sp.name), kind, text: it.text, t: it.t, hl: headline(it.text), date: e.date, src: it.src });
      });
    });
    STATE.claims = out.sort((a, b) => a.speaker.localeCompare(b.speaker) || (b.date || "").localeCompare(a.date || ""));
  }

  Object.assign(A, {
    $, $$, esc, clamp, fold, debounce, pad, RM, slug, toSec, fmtTime, fmtHM, hoursStr, dayKey, fmtDate, fmtShort, fmtStamp, initials, hash, avatarGradient,
    cssEsc, store, migrate, SCHEMA, FORMATS, fmtBucket, LENGTHS, LEVELS_EP, MONTH_LIST, GROUPS, groupById, HOSTS, TAG_RX, ORG_RX, orgsIn, STATE, tokens,
    normalize, loadData, ingest, classifyClaim, headline, parseTimed, MONTHS,
  });
})();
