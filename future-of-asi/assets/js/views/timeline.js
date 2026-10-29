import { $, $$, esc, load, arr, pageHero, researchers, reveal, fmtDate, ICON, clamp } from "../util.js";

const TYPES = {
  warning: ["Warning", "#ef4444"], statement: ["Statement", "#f59e0b"], capability: ["Capability", "#22d3ee"], breakthrough: ["Capability", "#22d3ee"],
  paper: ["Research", "#3b82f6"], research: ["Research", "#3b82f6"], policy: ["Policy", "#84cc16"], governance: ["Policy", "#84cc16"],
  incident: ["Incident", "#ef4444"], event: ["Event", "#14b8a6"], org: ["Organisation", "#14b8a6"], organization: ["Organisation", "#14b8a6"], book: ["Book", "#f59e0b"], media: ["Media", "#f59e0b"],
  model: ["Capability", "#22d3ee"], summit: ["Policy", "#84cc16"], resignation: ["Warning", "#ef4444"], forecast: ["Forecast", "#3b82f6"], report: ["Research", "#3b82f6"],
};
export function normEvent(e) {
  const date = String(e.date || e.year || "");
  const year = +(e.year || date.slice(0, 4)) || 0;
  const type = String(e.type || e.category || e.kind || "event").toLowerCase();
  const url = e.url || e.source_url || e.source || (Array.isArray(e.sources) && e.sources[0] ? e.sources[0].url || e.sources[0] : "") || "";
  return { year, date, title: e.title || e.name || "", text: e.text || e.summary || e.description || e.detail || "", type, people: e.people || e.person_ids || [], url: typeof url === "string" ? url : "", source: e.source_label || e.source_name || (typeof e.source === "string" && !/^https?:/.test(e.source) ? e.source : ""), quote: e.quote && typeof e.quote === "object" ? e.quote.text : e.quote || "" };
}

export async function render(el, params, query) {
  const [raw, ppl] = await Promise.all([load("timeline.json"), researchers()]);
  const byId = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const ev = arr(raw, "events").map(normEvent).filter((e) => e.year && e.title).sort((a, b) => (a.date || String(a.year)).localeCompare(b.date || String(b.year)));
  const types = [...new Set(ev.map((e) => (TYPES[e.type] || ["Event"])[0]))];
  const decades = [...new Set(ev.map((e) => Math.floor(e.year / 10) * 10))];
  let filter = "all";

  el.innerHTML = `${pageHero({ img: "cover-timeline", eyebrow: "Warnings timeline", title: `${ev.length ? ev[0].year : 1951} to ${ev.length ? ev[ev.length - 1].year : 2026}. <span class='serif gt-ember'>They told us.</span>`, lead: "Every major warning, breakthrough, statement and policy moment on the road to superintelligence, in order. Scroll slowly. Notice how the gaps between events shrink." })}
  ${decadeStrip(ev)}
  <section class="section tight"><div class="wrap">
    <div class="toolbar"><div class="chips" role="group" aria-label="Filter by kind"><button class="chip on" data-t="all" type="button">All ${ev.length}</button>${types.map((t) => `<button class="chip" data-t="${t}" type="button">${t}</button>`).join("")}</div>
    <div class="chips" style="margin-left:auto" role="group" aria-label="Jump to decade">${decades.map((d) => `<button class="chip" data-d="${d}" type="button">${d}s</button>`).join("")}</div></div>
    <div class="tl" id="tl"><div class="prog" id="prog"></div></div>
  </div></section>
  <div class="year-float" id="yf" aria-hidden="true"></div>`;

  function paint() {
    const list = ev.filter((e) => filter === "all" || (TYPES[e.type] || ["Event"])[0] === filter);
    $("#tl", el).innerHTML = `<div class="prog" id="prog"></div>` + list.map((e) => {
      const [label, c] = TYPES[e.type] || ["Event", "#14b8a6"];
      const people = e.people.map((id) => byId[id]).filter(Boolean);
      return `<article class="item" style="--c:${c}" data-year="${e.year}" data-key="${esc(e.year + "-" + e.title.slice(0, 24))}" id="y-${e.year}"><div class="card hov spot" style="--c:${c}">
        <div class="row" style="justify-content:space-between"><span class="yr">${e.year}</span><span class="tag" style="--c:${c}">${label}</span></div>
        <h3>${esc(e.title)}</h3>${e.text ? `<p>${esc(e.text)}</p>` : ""}${e.quote ? `<p class="q">&ldquo;${esc(e.quote)}&rdquo;</p>` : ""}
        <div class="meta">${e.date && e.date.length > 4 ? `<span class="count">${esc(fmtDate(e.date))}</span>` : ""}${people.map((p) => `<a class="chip" href="#/researchers/${p.id}">${esc(p.name)}</a>`).join("")}${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener" style="font-size:13px">${esc(e.source || "Source")} ${ICON.ext}</a>` : ""}</div>
      </div></article>`;
    }).join("");
    reveal(el);
    onScroll();
  }
  const tl = () => $("#tl", el);
  function onScroll() {
    const t = tl(); if (!t) return;
    const r = t.getBoundingClientRect();
    const p = clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1);
    const pr = $("#prog", el); if (pr) pr.style.height = `${p * 100}%`;
    let cur = "";
    for (const it of $$(".item", t)) { if (it.getBoundingClientRect().top < innerHeight * 0.6) cur = it.dataset.year; else break; }
    $("#yf", el).textContent = r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5 ? cur : "";
  }
  addEventListener("scroll", onScroll, { passive: true });
  $$("[data-t]", el).forEach((b) => b.addEventListener("click", () => { filter = b.dataset.t; $$("[data-t]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); }));
  $$("[data-d]", el).forEach((b) => b.addEventListener("click", () => { const it = $$(".item", el).find((x) => +x.dataset.year >= +b.dataset.d); if (it) it.scrollIntoView({ behavior: "smooth", block: "center" }); }));
  if (!ev.length) $("#tl", el).innerHTML = `<div class="empty-state">The timeline dataset is not loaded yet.</div>`;
  else paint();
  const y = query.get("y");
  if (y) setTimeout(() => { const it = $$(".item", el).find((x) => x.dataset.year === y); if (it) { it.classList.add("in"); it.scrollIntoView({ block: "center" }); } }, 200);
  el.addEventListener("click", (e) => { const b = e.target.closest("[data-jump]"); if (!b) return; filter = "all"; $$("[data-t]", el).forEach((x) => x.classList.toggle("on", x.dataset.t === "all")); paint(); const it = $$(".item", el).find((x) => x.dataset.key === b.dataset.jump); if (it) { it.classList.add("in"); it.scrollIntoView({ block: "center", behavior: "smooth" }); } });
  return () => removeEventListener("scroll", onScroll);
}

function decadeStrip(ev) {
  if (!ev.length) return "";
  const dec = {}; ev.forEach((e) => { const d = Math.floor(e.year / 10) * 10; (dec[d] = dec[d] || []).push(e); });
  const cols = ["#14b8a6", "#22d3ee", "#3b82f6", "#84cc16", "#f59e0b", "#ef4444"];
  const keys = Object.keys(dec).sort();
  const pick = (l) => l.slice().sort((a, b) => (b.type === "warning") - (a.type === "warning") || b.text.length - a.text.length).slice(0, 3).sort((a, b) => a.year - b.year);
  return `<section class="hscroll" aria-label="Decades at a glance"><div class="track">${keys.map((d, i) => { const l = dec[d]; const c = cols[Math.min(cols.length - 1, Math.floor((i / Math.max(1, keys.length - 1)) * (cols.length - 1)))];
    return `<div class="hpanel" style="--c:${c}"><div class="bigyr" aria-hidden="true">${d}s</div><div class="cnt">${l.length} moment${l.length === 1 ? "" : "s"}</div><h3>The ${d}s</h3><p>${esc(l.map((e) => e.title).slice(0, 2).join(". "))}.</p><div class="hl">${pick(l).map((e) => `<button type="button" data-jump="${esc(e.year + "-" + e.title.slice(0, 24))}"><span>${e.year}</span>${esc(e.title)}</button>`).join("")}</div></div>`; }).join("")}</div></section>`;
}
