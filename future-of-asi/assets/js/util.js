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
let _researchers, _videos;
export async function researchers() {
  if (_researchers) return _researchers;
  const raw = arr(await load("researchers.json"), "researchers");
  _researchers = raw.filter((r) => r && r.name).map((r) => ({
    id: r.id || slug(r.name), name: r.name, role: r.role || "", org: r.org || "", group: r.group || "alignment",
    photo: r.photo || "", photo_credit: r.photo_credit || "", pdoom: r.pdoom || "", pdoom_source: r.pdoom_source || "",
    agi_year: r.agi_year || "", bio: r.bio || "", warning: r.warning || "",
    quotes: (r.quotes || []).filter((q) => q && q.text), links: r.links || [], video_ids: r.video_ids || [],
    pd: parsePdoom(r.pdoom), groups: [].concat(r.group || []),
  }));
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

export function photoFor(p) { return p && p.photo ? p.photo : ""; }
export function avatar(p, cls = "avatar") {
  const src = photoFor(p);
  return src
    ? `<span class="${cls}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='${esc(initials(p.name))}'"></span>`
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
  return `<section class="phero"><div class="bgimg" style="background-image:url('assets/img/${img}.jpg')" role="img" aria-label=""></div>
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
