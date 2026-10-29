/* Shared helpers for Threshold. No dependencies. */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const RM = () => document.documentElement.classList.contains("rm") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const initials = (n) => String(n || "?").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export const ACCENTS = { teal: "#14b8a6", cyan: "#22d3ee", amber: "#f59e0b", red: "#ef4444", blue: "#3b82f6", lime: "#84cc16" };
export const GROUPS = {
  pioneer: { label: "Pioneers", c: "#f59e0b" },
  "lab-leader": { label: "Lab leaders", c: "#3b82f6" },
  alignment: { label: "Alignment", c: "#14b8a6" },
  control: { label: "AI control", c: "#22d3ee" },
  governance: { label: "Governance", c: "#84cc16" },
  forecasting: { label: "Forecasting", c: "#3b82f6" },
  critic: { label: "Critics", c: "#f59e0b" },
  doomer: { label: "High concern", c: "#ef4444" },
  optimist: { label: "Optimists", c: "#84cc16" },
};
export const CATS = {
  warning: { label: "Warning", c: "#ef4444" }, explainer: { label: "Explainer", c: "#22d3ee" }, documentary: { label: "Documentary", c: "#f59e0b" },
  interview: { label: "Interview", c: "#3b82f6" }, debate: { label: "Debate", c: "#f59e0b" }, lecture: { label: "Lecture", c: "#14b8a6" },
  control: { label: "AI control", c: "#22d3ee" }, alignment: { label: "Alignment", c: "#14b8a6" }, governance: { label: "Governance", c: "#84cc16" },
  "catastrophe-prep": { label: "Preparation", c: "#f59e0b" }, forecast: { label: "Forecast", c: "#3b82f6" }, course: { label: "Course", c: "#84cc16" },
  "intelligence-explosion": { label: "Intelligence explosion", c: "#ef4444" }, "agent-behaviour": { label: "Agent behaviour", c: "#f59e0b" }, interpretability: { label: "Interpretability", c: "#22d3ee" },
  hci: { label: "Human and AI", c: "#14b8a6" }, evals: { label: "Evals", c: "#3b82f6" },
};

/* Local storage with a namespace */
const NS = "thr:";
export const store = {
  get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(NS + k); } catch (e) {} },
};

/* Data loading, cached per session */
const cache = new Map();
export async function load(name, fallback) {
  if (cache.has(name)) return cache.get(name);
  const p = fetch(`data/${name}`, { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return name.endsWith(".json") ? r.json() : r.text(); })
    .catch(() => (fallback !== undefined ? fallback : name.endsWith(".json") ? [] : ""));
  cache.set(name, p);
  return p;
}
export const arr = (x, key) => (Array.isArray(x) ? x : x && Array.isArray(x[key]) ? x[key] : x && typeof x === "object" ? Object.values(x).find(Array.isArray) || [] : []);

/* Normalised datasets so views can trust the shape */
let _researchers, _videos, _sigs, _cats;
export const CAT_DEFS = [
  { id: "left-lab-warning", label: "Left labs and warned", c: "#ef4444", blurb: "People who worked inside frontier labs, left, and spoke up about safety on the way out." },
  { id: "independent-lab", label: "Independent labs", c: "#14b8a6", blurb: "Researchers at nonprofits and independent institutes such as MIRI, Redwood, METR, Apollo, FAR AI and ARC." },
  { id: "in-lab", label: "Inside the labs", c: "#3b82f6", blurb: "People building frontier models today at companies like Anthropic, OpenAI and Google DeepMind." },
  { id: "book-author", label: "Book authors", c: "#f59e0b", blurb: "Writers of the books that shaped how people think about superintelligence and risk." },
  { id: "most-cited", label: "Most cited", c: "#22d3ee", blurb: "Scientists with the largest citation counts on Google Scholar, as of the date shown on each profile." },
  { id: "pacing-signatory", label: "Pacing the Frontier", c: "#84cc16", blurb: "Profiled people who signed the Pacing the Frontier statement." },
  { id: "interpretability", label: "Interpretability", c: "#22d3ee", blurb: "Looking inside neural networks to understand what they compute." },
  { id: "theory", label: "Theory", c: "#3b82f6", blurb: "Agent foundations, decision theory and the maths of alignment." },
  { id: "hci", label: "Human and AI interaction", c: "#f59e0b", blurb: "How people and AI systems work together, trust and oversight in practice." },
  { id: "alignment", label: "Alignment", c: "#14b8a6", blurb: "Making AI systems want and do what people actually intend." },
  { id: "control", label: "Control", c: "#22d3ee", blurb: "Keeping AI safe even if it might not be aligned: monitoring, protocols, red teams." },
  { id: "governance", label: "Governance", c: "#84cc16", blurb: "Laws, compute rules, standards and international coordination." },
  { id: "evals", label: "Evals", c: "#ef4444", blurb: "Measuring dangerous capabilities before and after deployment." },
  { id: "forecasting", label: "Forecasting", c: "#3b82f6", blurb: "Timelines, scenarios and careful numbers about what comes next." },
  { id: "pioneer", label: "Pioneers", c: "#f59e0b", blurb: "The people who founded the field or first warned about it." },
  { id: "critic", label: "Critics and sceptics", c: "#f59e0b", blurb: "Voices who doubt the risk story or think the focus is wrong." },
];
export const REGIONS = ["North America", "Europe", "UK", "China", "India", "Asia Pacific", "Middle East", "Africa", "Latin America"];
const COUNTRY_REGION = { USA: "North America", "United States": "North America", US: "North America", Canada: "North America", UK: "UK", "United Kingdom": "UK", England: "UK", Scotland: "UK", China: "China", India: "India", Japan: "Asia Pacific", Singapore: "Asia Pacific", Australia: "Asia Pacific", "South Korea": "Asia Pacific", Korea: "Asia Pacific", Taiwan: "Asia Pacific", "Hong Kong": "China", "New Zealand": "Asia Pacific", Israel: "Middle East", UAE: "Middle East", "United Arab Emirates": "Middle East", "Saudi Arabia": "Middle East", Brazil: "Latin America", Mexico: "Latin America", Argentina: "Latin America", Chile: "Latin America", Nigeria: "Africa", Kenya: "Africa", "South Africa": "Africa", Ghana: "Africa", Ethiopia: "Africa", Egypt: "Africa" };
export const regionOf = (country) => COUNTRY_REGION[country] || (country ? "Europe" : "");
const GROUP_CAT = { pioneer: "pioneer", "lab-leader": "in-lab", alignment: "alignment", control: "control", governance: "governance", forecasting: "forecasting", critic: "critic" };
export const parseCites = (t) => { const m = String(t || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k|m)?/i); if (!m) return 0; let v = parseFloat(m[1]); if (/k/i.test(m[2] || "")) v *= 1e3; if (/m/i.test(m[2] || "")) v *= 1e6; return v; };
const A = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const linkish = (l) => (typeof l === "string" ? { title: l, url: "" } : l && typeof l === "object" ? { title: l.title || l.label || l.name || "", year: l.year || "", url: l.url || l.link || "" } : null);
export async function signatories() {
  if (_sigs) return _sigs;
  const raw = await load("signatories.json", null);
  const list = arr(raw, "signatories").filter((s) => s && s.name).map((s) => ({ name: s.name, title: s.title || s.role || "", employer: s.employer || s.org || s.affiliation || "", comment: s.comment || "", researcher_id: s.researcher_id || "", country: s.country || "", url: s.url || "" }));
  const meta = (raw && !Array.isArray(raw) && (raw.meta || raw)) || {};
  _sigs = { list, meta: { count_named: meta.count_named || list.length, count_anon: meta.count_anon || 0, as_of: meta.as_of || "", source: meta.source || meta.url || "", title: meta.title || "Pacing the Frontier", text: meta.statement || meta.text || "" } };
  return _sigs;
}
export async function categories() {
  if (_cats) return _cats;
  const raw = await load("categories.json", null);
  const list = arr(raw, "categories");
  _cats = CAT_DEFS.map((d) => { const m = list.find((x) => x && (x.id === d.id || x.slug === d.id)); return m ? { ...d, label: m.label || m.name || d.label, blurb: m.blurb || m.description || m.definition || d.blurb, c: m.color || m.c || d.c } : d; });
  list.forEach((x) => { const id = x && (x.id || x.slug); if (id && !_cats.find((c) => c.id === id)) _cats.push({ id, label: x.label || x.name || id, blurb: x.blurb || x.description || x.definition || "", c: x.color || x.c || "#22d3ee" }); });
  return _cats;
}
let _manifest;
export async function photoManifest() { if (!_manifest) _manifest = load("photos-manifest.json", {}); return _manifest; }
export async function researchers() {
  if (_researchers) return _researchers;
  const [rawR, sig] = await Promise.all([load("researchers.json"), signatories()]);
  const raw = arr(rawR, "researchers");
  const signed = new Set(sig.list.map((s) => s.researcher_id).filter(Boolean));
  _researchers = raw.filter((r) => r && r.name).map((r) => {
    const id = r.id || slug(r.name);
    const cats = new Set(A(r.categories));
    if (!A(r.categories).length) { A(r.group).forEach((g) => GROUP_CAT[g] && cats.add(GROUP_CAT[g])); }
    if (r.left_lab && (r.left_lab.org || typeof r.left_lab === "string")) cats.add("left-lab-warning");
    if (A(r.books).length) cats.add("book-author");
    if (signed.has(id)) cats.add("pacing-signatory");
    const country = r.country || "";
    const left = r.left_lab && typeof r.left_lab === "object" ? r.left_lab : r.left_lab ? { org: String(r.left_lab) } : null;
    return {
      id, name: r.name, role: r.role || "", org: r.org || "", group: r.group || "alignment",
      photo: r.photo || "", photo_credit: r.photo_credit || "", pdoom: r.pdoom || "", pdoom_source: r.pdoom_source || "",
      agi_year: r.agi_year || "", bio: r.bio || "", warning: r.warning || "",
      quotes: (r.quotes || []).filter((q) => q && q.text), links: r.links || [], video_ids: r.video_ids || [],
      pd: parsePdoom(r.pdoom), groups: [].concat(r.group || []),
      categories: [...cats], country, region: r.region || regionOf(country), former_orgs: A(r.former_orgs), left_lab: left,
      background: r.background || "", career: A(r.career).filter((c) => c && (c.role || c.org)),
      focus: A(r.focus), citations: r.citations || "", cites: parseCites(r.citations), scholar_url: r.scholar_url || "",
      books: A(r.books).map(linkish).filter((b) => b && b.title), key_papers: A(r.key_papers).map(linkish).filter((b) => b && b.title),
      courses: A(r.courses).map(linkish).filter((b) => b && b.title), homepage: r.homepage || "", socials: A(r.socials).filter((s) => s && s.url),
    };
  });
  const cited = _researchers.filter((p) => p.cites > 0).sort((a, b) => b.cites - a.cites);
  if (cited.length && !raw.some((r) => A(r.categories).includes("most-cited"))) cited.slice(0, Math.max(10, Math.round(cited.length * 0.15))).forEach((p) => p.categories.push("most-cited"));
  return _researchers;
}
export async function videos() {
  if (_videos) return _videos;
  const raw = arr(await load("videos.json"), "videos");
  const seen = new Set();
  _videos = raw.filter((v) => v && v.id && !seen.has(v.id) && seen.add(v.id)).map((v) => ({
    id: v.id, title: v.title || "Untitled", channel: v.channel || "", date: v.date || "", duration: v.duration || "",
    category: v.category || "explainer", people: v.people || [], summary: v.summary || "", level: v.level || "beginner",
    year: (v.date || "").slice(0, 4),
  }));
  return _videos;
}

/* Turn "10-20%", ">50%", "about 1 in 6", "99%" into a midpoint number, or null */
export function parsePdoom(t) {
  if (!t) return null;
  const s = String(t).toLowerCase().replace(/,/g, "");
  let m = s.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)?\s*(?:-|to|and|or)\s*(\d+(?:\.\d+)?)\s*(?:%|percent)/);
  if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
  m = s.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/);
  if (m) return parseFloat(m[1]);
  m = s.match(/1\s*in\s*(\d+)/);
  if (m) return 100 / parseFloat(m[1]);
  return null;
}

export function ytThumb(id, q = "mqdefault") { return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${q}.jpg`; }
export function ytEmbed(id, extra = "") { return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1${extra}`; }

export function ytPoster(id, title = "", cap = "") {
  return `<div class="yt" data-yt="${esc(id)}"><button class="yt-poster" type="button" data-play="${esc(id)}" aria-label="Play video: ${esc(title)}"><img src="${ytThumb(id, "hqdefault")}" alt="" loading="lazy" decoding="async" width="480" height="360"><span class="pb">${'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'}</span>${cap ? `<span class="cap">${esc(cap)}</span>` : ""}</button></div>`;
}
export function playPoster(btn, onPlay) {
  const id = btn.dataset.play; const box = btn.closest(".yt");
  box.innerHTML = `<iframe src="${ytEmbed(id)}" title="${esc(btn.getAttribute("aria-label") || "Video")}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  if (onPlay) onPlay(id);
}
export function loadScript(src) {
  return new Promise((res, rej) => { if (document.querySelector(`script[data-src="${src}"]`)) { const s = document.querySelector(`script[data-src="${src}"]`); if (s.dataset.ok) res(); else { s.addEventListener("load", () => res()); s.addEventListener("error", rej); } return; } const s = document.createElement("script"); s.src = src; s.dataset.src = src; s.async = true; s.onload = () => { s.dataset.ok = 1; res(); }; s.onerror = rej; document.head.appendChild(s); });
}
export function photoFor(p) { return p && p.photo ? p.photo : ""; }
export function avatar(p, cls = "avatar") {
  const src = photoFor(p);
  return src
    ? `<span class="${cls}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="40" height="40" onerror="this.parentNode.textContent='${esc(initials(p.name))}'"></span>`
    : `<span class="${cls}" aria-hidden="true">${esc(initials(p && p.name))}</span>`;
}

export function fmtDate(d) {
  if (!d) return "";
  const parts = String(d).split("-");
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${M[+parts[1] - 1] || ""} ${parts[0]}`;
  return `${M[+parts[1] - 1] || ""} ${+parts[2]}, ${parts[0]}`;
}
export function fmtDur(d) {
  if (!d) return "";
  const p = String(d).split(":").map(Number);
  if (p.some(isNaN)) return d;
  if (p.length === 3) return p[0] ? `${p[0]}h ${String(p[1]).padStart(2, "0")}m` : `${p[1]}m`;
  if (p.length === 2) return `${p[0]}m`;
  return d;
}
export function durSecs(d) { const p = String(d || "").split(":").map(Number); if (!p.length || p.some(isNaN)) return 0; return p.reduce((a, b) => a * 60 + b, 0); }

/* Toast */
let tt;
export function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove("on"), 2600);
}

/* Small markdown renderer: headings, paragraphs, lists, quotes, code, tables, links, emphasis, images, hr */
export function md(src) {
  const lines = String(src || "").replace(/\r/g, "").split("\n");
  let out = "", i = 0;
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${u}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_([^_\s][^_]*)_/g, "$1<em>$2</em>");
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*$/.test(l)) { i++; continue; }
    if (/^```/.test(l)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out += `<pre><code>${esc(buf.join("\n"))}</code></pre>`; continue; }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const n = h[1].length; const id = slug(h[2]); out += `<h${n} id="${id}">${inline(h[2])}</h${n}>`; i++; continue; }
    if (/^---+\s*$/.test(l)) { out += "<hr>"; i++; continue; }
    if (/^>\s?/.test(l)) { const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, "")); out += `<blockquote>${inline(buf.join(" "))}</blockquote>`; continue; }
    if (/^\|/.test(l)) {
      const rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(rows[0]); const body = rows.slice(2).map(cells);
      out += `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ordered = /^\s*\d+\./.test(l); const buf = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) buf.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      out += `<${ordered ? "ol" : "ul"}>${buf.map((x) => `<li>${inline(x)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`;
      continue;
    }
    const buf = []; while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,4}\s|>|```|\||\s*([-*]|\d+\.)\s)/.test(lines[i])) buf.push(lines[i++]);
    out += `<p>${inline(buf.join(" "))}</p>`;
  }
  return out;
}
export function frontmatter(src) {
  const m = String(src).match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  m[1].split("\n").forEach((l) => { const k = l.match(/^(\w+):\s*(.*)$/); if (k) meta[k[1]] = k[2].replace(/^"|"$/g, ""); });
  return { meta, body: src.slice(m[0].length) };
}
export const readMins = (t) => Math.max(1, Math.round(String(t).split(/\s+/).length / 220));

/* Reveal on scroll, spotlight hover, counters */
let io;
export function reveal(root = document) {
  if (!io) io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  $$(".rv:not(.in), .tl .item:not(.in)", root).forEach((el) => io.observe(el));
}
export function spotlight(root = document) {
  $$(".spot", root).forEach((el) => {
    if (el._spot) return; el._spot = 1;
    el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); el.style.setProperty("--mx", `${e.clientX - r.left}px`); el.style.setProperty("--my", `${e.clientY - r.top}px`); });
  });
}
export function countUp(el, to, dur = 1400, fmt = (v) => Math.round(v).toLocaleString("en-US")) {
  if (RM()) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (t) => { const k = clamp((t - t0) / dur, 0, 1); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
export function splitWords(text, cls = "w", delayStep = 0.06, base = 0) {
  return String(text).split(/(\s+)/).map((w, i) => (/^\s+$/.test(w) ? w : `<span class="${cls}" style="animation-delay:${(base + (i / 2) * delayStep).toFixed(2)}s">${esc(w)}</span>`)).join("");
}
export function pageHero({ img, eyebrow, title, lead, extra = "" }) {
  return `<section class="phero"><img class="bgimg" src="assets/img/${img}.jpg" srcset="assets/img/sm/${img}.jpg 640w, assets/img/${img}.jpg 1600w" sizes="100vw" alt="" width="1600" height="900" decoding="async" fetchpriority="high" data-fx="hero-bg">
  <div class="wrap"><div class="eyebrow">${eyebrow}</div><h1 class="reveal-words">${title}</h1>${lead ? `<p class="lead rv in">${lead}</p>` : ""}${extra}</div></section>`;
}
export const ICON = {
  arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  ext: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
  wide: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/></svg>',
  dl: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></svg>',
};

/* Organisation logos: data/logos-manifest.json maps org id to a local file. Monogram only when no logo exists. */
let _orgIdx = null, _orgIdxP = null;
const ORG_ALIAS = { "google deepmind": "deepmind", "deepmind": "deepmind", "openai": "openai", "meta": "meta", "meta ai": "meta", "fair": "meta", "microsoft": "microsoft", "uk aisi": "uk-aisi", "uk ai security institute": "uk-aisi", "uk ai safety institute": "uk-aisi", "us aisi": "us-aisi", "caisi": "us-aisi" };
export async function orgIndex() {
  if (_orgIdx) return _orgIdx;
  if (!_orgIdxP) _orgIdxP = Promise.all([load("orgs.json"), load("logos-manifest.json", {})]).then(([o, m]) => {
    const orgs = arr(o, "orgs");
    const man = m && !Array.isArray(m) ? (m.logos && typeof m.logos === "object" ? m.logos : m) : {};
    if (Array.isArray(m)) m.forEach((x) => x && x.id && (man[x.id] = x));
    const names = [];
    orgs.forEach((x) => { const id = x.id || slug(x.name); [x.name, x.short, ...(x.aliases || [])].filter(Boolean).forEach((n) => names.push([String(n).toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").trim(), id])); });
    Object.entries(man).forEach(([id, v]) => { if (v && v.name) names.push([String(v.name).toLowerCase(), id]); (v && v.aliases || []).forEach((a) => names.push([String(a).toLowerCase(), id])); });
    Object.entries(ORG_ALIAS).forEach(([n, id]) => names.push([n, id]));
    names.sort((a, b) => b[0].length - a[0].length);
    const byId = Object.fromEntries(orgs.map((x) => [x.id || slug(x.name), x]));
    _orgIdx = { orgs, byId, man, names };
    return _orgIdx;
  });
  return _orgIdxP;
}
export function findOrgId(name) {
  if (!_orgIdx || !name) return "";
  const n = String(name).toLowerCase();
  if (_orgIdx.man[n] || _orgIdx.byId[n]) return n;
  const s = slug(name);
  if (_orgIdx.man[s] || _orgIdx.byId[s]) return s;
  for (const [k, id] of _orgIdx.names) { if (k.length < 3) continue; if (n === k || new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(n)) return id; }
  return "";
}
export function logoSrc(idOrName) {
  if (!_orgIdx) return null;
  const id = _orgIdx.man[idOrName] || _orgIdx.byId[idOrName] ? idOrName : findOrgId(idOrName);
  const m = id && _orgIdx.man[id];
  if (m && (m.file || m.path)) { const f = String(m.file || m.path); const mode = m.on_dark || (m.invert_on_dark ? "invert" : "white-chip"); return { src: /^(https?:|data\/|assets\/)/.test(f) ? f : `data/${f.replace(/^\.?\//, "")}`, inv: mode === "invert", mode, id }; }
  const o = id && _orgIdx.byId[id];
  if (o && o.logo_local) return { src: o.logo_local, inv: !!o.invert_on_dark, id };
  return id ? { src: "", id } : null;
}
export function logoHtml(idOrName, label = "", cls = "ologo") {
  const L = logoSrc(idOrName);
  const name = label || (L && _orgIdx.byId[L.id] && _orgIdx.byId[L.id].name) || idOrName || "";
  if (L && L.src) return `<span class="${cls}${L.mode === "invert" ? " inv" : L.mode === "as-is" ? " asis" : ""}" title="${esc(name)}"><img src="${esc(L.src)}" alt="${esc(name)} logo" loading="lazy" decoding="async" width="28" height="28" onerror="this.parentNode.classList.add('mono');this.parentNode.textContent='${esc(initials(name))}'"></span>`;
  return `<span class="${cls} mono" title="${esc(name)}" aria-hidden="true">${esc(initials(name))}</span>`;
}
export function orgChip(name) { return name ? `<span class="orgchip">${logoHtml(name, name)}<span>${esc(name)}</span></span>` : ""; }
