import { $, $$, esc, load, arr, researchers, signatories, categories, orgIndex, logoHtml, pageHero, GROUPS, REGIONS, initials, RM, ICON, store } from "../util.js";

const VIEWS = [["grid", "Grid"], ["stars", "Constellation"], ["table", "Table"]];
const REGION_POS = { "North America": [22, 38], "Latin America": [31, 70], UK: [46.2, 27], Europe: [52, 32], "Middle East": [59, 45], Africa: [53, 62], India: [69, 48], China: [77, 38], "Asia Pacific": [86, 64] };
const INTERESTS = [
  ["Looking inside models", /interpret|mechanistic|circuit|feature|sae|probe/i, ["interpretability"]],
  ["Keeping AI under control", /control|monitor|protocol|red team|sandbag|scheming/i, ["control"]],
  ["Making AI want the right things", /align|rlhf|reward|value|oversight|scalable/i, ["alignment"]],
  ["Testing dangerous skills", /eval|benchmark|capabilit|red.?team|measure/i, ["evals"]],
  ["Laws and policy", /govern|policy|law|regulat|treaty|compute|standard/i, ["governance"]],
  ["Maths and theory", /theory|decision|agent foundation|math|logic|formal/i, ["theory"]],
  ["People and AI together", /human|hci|interaction|trust|user|society/i, ["hci"]],
  ["Forecasting the future", /forecast|timeline|scenario|trend|predict/i, ["forecasting"]],
  ["The big picture and ethics", /philosoph|ethic|moral|longterm|existential|future of/i, ["pioneer", "book-author"]],
  ["Biosecurity and cyber", /bio|cyber|security|weapon|misuse/i, []],
];
const SKILLS = [["I code in Python", /engineer|ml|code|python|empirical|interpret|eval/i], ["I like maths", /theory|math|formal|decision/i], ["I write", /writ|book|essay|blog|journal/i], ["I study policy or law", /policy|govern|law|regulat/i], ["I am a student", /course|teach|education|fellow|student/i], ["I design or build products", /hci|human|product|interface|user/i]];

export async function render(el, params, query) {
  const [ppl, sig, cats] = await Promise.all([researchers(), signatories(), categories(), orgIndex()]);
  const resRaw = await load("resources.json");
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const counts = {}; ppl.forEach((p) => p.categories.forEach((c) => (counts[c] = (counts[c] || 0) + 1)));
  const regionCounts = {}; ppl.forEach((p) => p.region && (regionCounts[p.region] = (regionCounts[p.region] || 0) + 1));
  const tabs = [{ id: "all", label: "Everyone", c: "#22d3ee", blurb: "Everyone in the dataset: pioneers, lab leaders, alignment and control researchers, governance people, forecasters, critics and optimists." },
    ...cats.filter((c) => counts[c.id]), { id: "region", label: "Global by region", c: "#84cc16", blurb: "Where the people in this guide work. Tap a region on the map to see who is there." }];
  const S = { cat: query.get("cat") || "all", view: query.get("view") || store.get("rview", "grid"), q: "", sort: "featured", region: query.get("region") || "" };
  if (!tabs.some((t) => t.id === S.cat)) S.cat = "all";
  const withPd = ppl.filter((p) => p.pd != null);

  el.innerHTML = `${pageHero({ img: "cover-researchers", eyebrow: "Researchers", title: "The people <span class='serif gt'>at the threshold.</span>", lead: `${ppl.length} people${Object.keys(regionCounts).length > 1 ? ` across ${Object.keys(regionCounts).length} regions` : ""}. Who left the labs and warned us, who works inside them, who writes the books, who signed Pacing the Frontier. Their words, their careers and their numbers, each with a source.` })}
  <section class="section tight"><div class="wrap">
    <div class="cat-tabs" role="tablist" aria-label="Categories">${tabs.map((t) => `<button type="button" role="tab" data-cat="${t.id}" style="--c:${t.c}" aria-selected="${S.cat === t.id}"><i></i>${esc(t.label)}<b>${t.id === "all" ? ppl.length : t.id === "region" ? Object.keys(regionCounts).length : counts[t.id]}</b></button>`).join("")}</div>
    <div class="cat-intro"><div><h2 id="catH" style="margin:6px 0 6px;font-size:clamp(26px,3.4vw,40px)"></h2><p id="catP"></p></div>
      <div class="view-sw" role="group" aria-label="View">${VIEWS.map(([k, l]) => `<button type="button" data-view="${k}" aria-pressed="${S.view === k}">${l}</button>`).join("")}</div></div>
    <div id="regionBox"></div>
    <div class="toolbar" role="search">
      <label class="sr-only" for="rq">Search researchers</label>
      <input class="input search" id="rq" type="search" placeholder="Search name, lab, idea, paper, country">
      <label class="sr-only" for="rs">Sort</label>
      <select class="input" id="rs"><option value="featured">Featured order</option><option value="cites">Most cited first</option><option value="pdoom">Highest p(doom) first</option><option value="pdoomlow">Lowest p(doom) first</option><option value="name">Name A to Z</option><option value="quotes">Most quotes</option></select>
      <span class="count" id="rc"></span>
    </div>
    <div id="out"></div>
  </div></section>
  <section class="section tight"><div class="wrap">
    <div class="card relate-card" style="--c:#84cc16">
      <div class="sec-head" style="margin-bottom:16px"><div><div class="eyebrow" style="color:var(--lime)">Relate to me</div><h2 style="margin:8px 0 0;font-size:clamp(26px,3.4vw,40px)">Find <span class="serif gt-mint">your people.</span></h2><p class="muted" style="margin:6px 0 0">Pick what pulls you in and what you are good at. I match you with researchers, papers and courses. Nothing leaves your browser.</p></div></div>
      <div class="relate">
        <div><h4 class="eyebrow" style="margin:0 0 10px">What interests you</h4><div class="picks" id="pickI">${INTERESTS.map(([l], i) => `<button type="button" data-i="${i}" aria-pressed="false">${esc(l)}</button>`).join("")}</div>
          <h4 class="eyebrow" style="margin:18px 0 10px">What you bring</h4><div class="picks" id="pickS">${SKILLS.map(([l], i) => `<button type="button" data-s="${i}" aria-pressed="false">${esc(l)}</button>`).join("")}</div></div>
        <div class="out" id="relOut"><p class="muted">Choose at least one interest to see matches.</p></div>
      </div>
    </div>
  </div></section>
  <section class="section tight"><div class="wrap">
    <div class="card"><div class="sec-head" style="margin-bottom:6px"><div><div class="eyebrow">p(doom) spectrum</div><h3 style="margin:6px 0 0">How worried are they?</h3><p class="muted" style="margin:6px 0 0;font-size:14px">${withPd.length} people have given a number or range. Midpoints are on a log scale so tiny and large numbers both fit. Tap a dot to open the person.</p></div></div>
      <div class="spectrum" id="spec"></div></div>
  </div></section>`;

  spectrum($("#spec", el), withPd);
  let stopStars = null;

  function filtered() {
    const q = S.q.toLowerCase().split(/\s+/).filter(Boolean);
    let r = ppl.filter((p) => (S.cat === "all" || S.cat === "region" || p.categories.includes(S.cat)) && (!S.region || p.region === S.region) &&
      q.every((w) => `${p.name} ${p.org} ${p.role} ${p.warning} ${p.bio} ${p.country} ${p.region} ${p.focus.join(" ")} ${p.former_orgs.join(" ")} ${p.key_papers.map((k) => k.title).join(" ")} ${p.books.map((k) => k.title).join(" ")} ${p.quotes.map((x) => x.text).join(" ")}`.toLowerCase().includes(w)));
    const by = { cites: (a, b) => b.cites - a.cites, pdoom: (a, b) => (b.pd ?? -1) - (a.pd ?? -1), pdoomlow: (a, b) => (a.pd ?? 999) - (b.pd ?? 999), name: (a, b) => a.name.localeCompare(b.name), quotes: (a, b) => b.quotes.length - a.quotes.length }[S.sort];
    if (by) r = r.slice().sort(by);
    else if (S.cat === "most-cited") r = r.slice().sort((a, b) => b.cites - a.cites);
    return r;
  }
  function header() {
    const t = tabs.find((x) => x.id === S.cat) || tabs[0];
    $("#catH", el).innerHTML = `${esc(t.label)}${S.region ? ` <span class="serif" style="color:var(--lime)">in ${esc(S.region)}</span>` : ""}`;
    $("#catP", el).textContent = t.blurb || "";
    $$("[data-cat]", el).forEach((b) => b.setAttribute("aria-selected", b.dataset.cat === S.cat));
    $$("[data-view]", el).forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === S.view));
    $("#regionBox", el).innerHTML = S.cat === "region" ? regionMap() : "";
  }
  function regionMap() {
    return `<div class="region-map" style="margin-bottom:18px"><img class="base" src="assets/img/world-dots.svg" alt="" width="1440" height="560" loading="lazy">${REGIONS.filter((r) => regionCounts[r]).map((r) => { const [x, y] = REGION_POS[r] || [50, 50]; return `<button type="button" class="rb" data-region="${esc(r)}" aria-pressed="${S.region === r}" style="left:${x}%;top:${y}%;--c:${r === S.region ? "#84cc16" : "#22d3ee"}"><b>${regionCounts[r]}</b><span>${esc(r)}</span></button>`; }).join("")}</div>`;
  }
  function paint() {
    if (stopStars) { stopStars(); stopStars = null; }
    header();
    const r = filtered();
    $("#rc", el).textContent = `${r.length} of ${ppl.length}`;
    const out = $("#out", el);
    if (!r.length) { out.innerHTML = `<div class="empty-state">Nobody matches that. Try fewer words or another tab.</div>`; return; }
    if (S.view === "stars") { out.innerHTML = `<div class="constel" id="cst"><canvas></canvas><div class="tip"></div></div><p class="muted" style="font-size:13px;margin-top:10px">Each star is a person, grouped by their main category. Brighter stars have more quotes in the dataset. Hover or tap a star to open them.</p>`; stopStars = constellation($("#cst", el), r, catById); return; }
    if (S.view === "table") { out.innerHTML = `<div class="tscroll"><table class="ptable"><thead><tr><th>Name</th><th>Organisation</th><th>Region</th><th>p(doom)</th><th>Citations</th><th>Categories</th></tr></thead><tbody>${r.map((p) => `<tr><td><a href="#/researchers/${p.id}" data-person="${p.id}"><b>${esc(p.name)}</b></a><br><span class="muted" style="font-size:12.5px">${esc(p.role)}</span></td><td><span class="row" style="gap:8px;flex-wrap:nowrap">${p.org ? logoHtml(p.org, p.org, "ologo sm") : ""}<span>${esc(p.org)}</span></span></td><td>${esc(p.region || "")}</td><td class="mono">${esc(p.pdoom ? shortP(p.pdoom) : "")}</td><td class="mono">${esc(p.citations ? String(p.citations).split(/[ (]/)[0] : "")}</td><td>${p.categories.map((c) => catById[c]).filter(Boolean).slice(0, 3).map((c) => `<span class="tag" style="--c:${c.c}">${esc(c.label)}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table></div>`; return; }
    out.innerHTML = `<div class="people" id="grid">${r.map(card).join("")}</div>`;
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }
  function card(p) {
    const G = GROUPS[p.group] || { label: p.group, c: "#22d3ee" };
    const cs = p.categories.map((c) => catById[c]).filter(Boolean);
    const c0 = (cs[0] || G).c;
    return `<button class="card hov spot pcard" type="button" data-person="${p.id}" style="--c:${c0}" aria-label="Open ${esc(p.name)}">
      <div class="ph">${p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async" width="300" height="300" referrerpolicy="no-referrer" onerror="this.insertAdjacentHTML('afterend','<div class=ini>${esc(initials(p.name))}</div>');this.remove()">` : `<div class="ini">${esc(initials(p.name))}</div>`}
      <div class="cats">${cs.slice(0, 4).map((c) => `<i style="--c:${c.c}" title="${esc(c.label)}"></i>`).join("")}</div>
      <div class="badges">${p.left_lab ? `<span class="bd r">Left ${esc(p.left_lab.org || "lab")}</span>` : ""}${p.pdoom ? `<span class="bd r">p(doom) ${esc(shortP(p.pdoom))}</span>` : ""}${p.agi_year ? `<span class="bd a">AGI ${esc(yearOf(p.agi_year))}</span>` : ""}${!p.left_lab && !p.pdoom ? `<span class="bd">${esc((cs[0] || G).label)}</span>` : ""}</div></div>
      <div class="info"><b>${esc(p.name)}</b><span>${esc([p.role, p.org].filter(Boolean).join(", "))}</span>${p.warning ? `<p>${esc(p.warning)}</p>` : ""}</div></button>`;
  }
  const setQ = () => { const q = new URLSearchParams(); if (S.cat !== "all") q.set("cat", S.cat); if (S.view !== "grid") q.set("view", S.view); if (S.region) q.set("region", S.region); const h = "#/researchers" + (q.toString() ? "?" + q : ""); history.replaceState(history.state, "", location.pathname + location.search + h); };
  el.addEventListener("click", (e) => {
    const t = e.target.closest("[data-cat]"); if (t) { S.cat = t.dataset.cat; if (S.cat !== "region") S.region = ""; setQ(); paint(); return; }
    const v = e.target.closest("[data-view]"); if (v) { S.view = v.dataset.view; store.set("rview", S.view); setQ(); paint(); return; }
    const rg = e.target.closest("[data-region]"); if (rg) { S.region = S.region === rg.dataset.region ? "" : rg.dataset.region; setQ(); paint(); }
  });
  $("#rq", el).addEventListener("input", (e) => { S.q = e.target.value; paint(); });
  $("#rs", el).addEventListener("change", (e) => { S.sort = e.target.value; paint(); });
  paint();

  // Relate to me
  const picked = { i: new Set(), s: new Set() };
  let items = []; if (Array.isArray(resRaw)) items = resRaw; else if (resRaw && typeof resRaw === "object") Object.entries(resRaw).forEach(([k, v]) => Array.isArray(v) && v.forEach((x) => items.push({ type: x.type || k, ...x })));
  items = items.map((r) => ({ title: r.title || r.name || "", url: r.url || r.link || "", type: String(r.type || r.category || "").toLowerCase(), text: `${r.title || ""} ${r.line || r.description || r.summary || ""} ${r.org || r.author || r.provider || ""}` })).filter((r) => r.title && r.url);
  function relate() {
    const I = [...picked.i].map((k) => INTERESTS[k]), Sk = [...picked.s].map((k) => SKILLS[k]);
    if (!I.length) { $("#relOut", el).innerHTML = `<p class="muted">Choose at least one interest to see matches.</p>`; return; }
    const scoreText = (t) => I.reduce((a, [, re]) => a + (re.test(t) ? 2 : 0), 0) + Sk.reduce((a, [, re]) => a + (re.test(t) ? 1 : 0), 0);
    const people = ppl.map((p) => { const txt = `${p.focus.join(" ")} ${p.role} ${p.bio} ${p.warning} ${p.background} ${p.key_papers.map((k) => k.title).join(" ")} ${p.books.length ? "book writer" : ""}`; let s = scoreText(txt); I.forEach(([, , cs]) => cs.forEach((c) => p.categories.includes(c) && (s += 3))); return { p, s }; }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 6);
    const smax = Math.max(1, ...people.map((x) => x.s));
    const papers = ppl.flatMap((p) => p.key_papers.map((k) => ({ ...k, by: p.name }))).concat(items.filter((r) => /paper|report|research/.test(r.type)).map((r) => ({ title: r.title, url: r.url, by: "", t: r.text })))
      .map((k) => ({ k, s: scoreText(`${k.title} ${k.t || ""}`) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5);
    const courses = items.filter((r) => /course|fellow|program|career|training/.test(r.type)).concat(ppl.flatMap((p) => p.courses.map((c) => ({ ...c, text: c.title }))))
      .map((r) => ({ r, s: scoreText(r.text || r.title) + (picked.s.has(4) ? 1 : 0) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5);
    $("#relOut", el).innerHTML = `<h4>People to follow</h4>${people.map(({ p, s }) => `<button type="button" class="match-row" data-person="${p.id}">${p.photo ? `<span class="avatar"><img src="${esc(p.photo)}" alt="" loading="lazy" width="40" height="40" referrerpolicy="no-referrer"></span>` : `<span class="avatar">${esc(initials(p.name))}</span>`}<span class="tx"><b>${esc(p.name)}</b><span>${esc(p.focus.slice(0, 3).join(", ") || [p.role, p.org].filter(Boolean).join(", "))}</span></span><span class="m">${Math.round(52 + 46 * (s / smax))}% match</span></button>`).join("") || `<p class="muted">No close matches yet. Try another interest.</p>`}
      ${papers.length ? `<h4>Papers to read</h4><div class="reflist">${papers.map(({ k }) => `<a href="${esc(k.url || "#")}" ${k.url ? 'target="_blank" rel="noopener"' : ""}><span class="yr">${esc(k.year || "paper")}</span><span>${esc(k.title)}${k.by ? ` <span class="muted">by ${esc(k.by)}</span>` : ""}</span>${ICON.ext}</a>`).join("")}</div>` : ""}
      ${courses.length ? `<h4>Courses and programs</h4><div class="reflist">${courses.map(({ r }) => `<a href="${esc(r.url)}" target="_blank" rel="noopener"><span class="yr">${esc(r.type || "course")}</span><span>${esc(r.title)}</span>${ICON.ext}</a>`).join("")}</div>` : ""}`;
  }
  $$("#pickI button", el).forEach((b) => b.addEventListener("click", () => { const k = +b.dataset.i; picked.i.has(k) ? picked.i.delete(k) : picked.i.add(k); b.setAttribute("aria-pressed", picked.i.has(k)); relate(); }));
  $$("#pickS button", el).forEach((b) => b.addEventListener("click", () => { const k = +b.dataset.s; picked.s.has(k) ? picked.s.delete(k) : picked.s.add(k); b.setAttribute("aria-pressed", picked.s.has(k)); relate(); }));

  el._onParams = (p, q) => { const c = q.get("cat") || "all"; const v = q.get("view") || S.view; if (c !== S.cat || v !== S.view) { S.cat = tabs.some((t) => t.id === c) ? c : "all"; S.view = v; paint(); } };
  return () => { if (stopStars) stopStars(); };
}

const shortP = (t) => { const s = String(t); const m = s.match(/[<>~]?\s*\d+(\.\d+)?\s*%(\s*(to|-)\s*\d+(\.\d+)?\s*%)?|1 in \d+/i); return m ? m[0].replace(/\s+/g, " ") : s.slice(0, 18); };
const yearOf = (t) => { const m = String(t).match(/20\d\d/); return m ? m[0] : String(t).slice(0, 10); };

/* Constellation: people as stars, clustered by main category, linked within a cluster */
function constellation(host, list, catById) {
  const cv = $("canvas", host), tip = $(".tip", host);
  const cnt = {}; list.forEach((p) => p.categories.forEach((c) => catById[c] && (cnt[c] = (cnt[c] || 0) + 1)));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 7).map((x) => x[0]);
  const groups = {}; list.forEach((p) => { const k = top.find((c) => p.categories.includes(c)) || "other"; (groups[k] = groups[k] || []).push(p); });
  const keys = Object.keys(groups).sort((a, b) => (a === "other") - (b === "other") || top.indexOf(a) - top.indexOf(b));
  let W = 0, H = 0, dpr = 1;
  const stars = [];
  keys.forEach((k, gi) => {
    const a = (gi / keys.length) * Math.PI * 2 - Math.PI / 2;
    groups[k].forEach((p, i) => { const r = 0.02 + Math.sqrt(i + 1) * 0.022; const b = i * 2.399; stars.push({ p, k, c: (catById[k] || { c: "#22d3ee" }).c, ga: a, ox: Math.cos(b) * r, oy: Math.sin(b) * r, s: 1.6 + Math.min(4, p.quotes.length * 0.6), ph: Math.random() * 6.28 }); });
  });
  host.querySelectorAll(".lbl").forEach((x) => x.remove());
  keys.forEach((k, gi) => { const d = document.createElement("div"); d.className = "lbl"; d.textContent = (catById[k] || { label: "Other" }).label; d.dataset.g = gi; host.appendChild(d); });
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = host.clientWidth; H = host.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size();
  let t0 = performance.now(), raf = 0, hover = null, alive = true;
  const pos = (s, t) => { const R = Math.min(W, H) * 0.3, rot = RM() ? 0 : t * 0.02; const cx = W / 2 + Math.cos(s.ga + rot) * R * (W > H ? 1.6 : 1), cy = H / 2 + Math.sin(s.ga + rot) * R; const m = Math.min(W, H); return [cx + s.ox * m, cy + s.oy * m]; };
  function draw(now) {
    if (!alive) return;
    const t = (now - t0) / 1000, c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const P = stars.map((s) => pos(s, t));
    c.lineWidth = 0.6;
    for (let i = 0; i < stars.length; i++) for (let j = i + 1; j < stars.length; j++) { if (stars[i].k !== stars[j].k) continue; const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1]; const d = Math.hypot(dx, dy); if (d < 70) { c.strokeStyle = stars[i].c + "40"; c.beginPath(); c.moveTo(P[i][0], P[i][1]); c.lineTo(P[j][0], P[j][1]); c.stroke(); } }
    stars.forEach((s, i) => { const tw = RM() ? 1 : 0.7 + 0.3 * Math.sin(t * 2 + s.ph); const r = s.s * (hover === s ? 2 : 1); const g = c.createRadialGradient(P[i][0], P[i][1], 0, P[i][0], P[i][1], r * 4); g.addColorStop(0, s.c); g.addColorStop(1, "rgba(0,0,0,0)"); c.globalAlpha = tw; c.fillStyle = g; c.beginPath(); c.arc(P[i][0], P[i][1], r * 4, 0, 7); c.fill(); c.fillStyle = "#e6f0fa"; c.beginPath(); c.arc(P[i][0], P[i][1], r * 0.6, 0, 7); c.fill(); c.globalAlpha = 1; s.x = P[i][0]; s.y = P[i][1]; });
    keys.forEach((k, gi) => { const R = Math.min(W, H) * 0.3, rot = RM() ? 0 : t * 0.02, a = (gi / keys.length) * Math.PI * 2 - Math.PI / 2 + rot; const l = host.querySelector(`.lbl[data-g="${gi}"]`); const cr = Math.min(W, H) * (0.03 + Math.sqrt(groups[k].length) * 0.022); if (l) { l.style.left = W / 2 + Math.cos(a) * R * (W > H ? 1.6 : 1) + "px"; l.style.top = H / 2 + Math.sin(a) * R - cr - 10 + "px"; } });
    if (!RM()) raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  const pick = (e) => { const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 18; stars.forEach((s) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }); return [best, x, y]; };
  cv.addEventListener("pointermove", (e) => { const [s, x, y] = pick(e); hover = s; cv.style.cursor = s ? "pointer" : "default"; if (s) { tip.style.display = "block"; tip.style.left = x + "px"; tip.style.top = y + "px"; tip.textContent = `${s.p.name}${s.p.org ? ", " + s.p.org : ""}`; } else tip.style.display = "none"; if (RM()) draw(performance.now()); });
  cv.addEventListener("pointerleave", () => { hover = null; tip.style.display = "none"; });
  cv.addEventListener("click", (e) => { const [s] = pick(e); if (s) import("../core/overlay.js").then((o) => o.openPerson(s.p.id)); });
  const ro = new ResizeObserver(() => { size(); if (RM()) draw(performance.now()); }); ro.observe(host);
  return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
}

function spectrum(host, list) {
  if (!list.length) { host.innerHTML = `<p class="muted">No numbers in the dataset yet.</p>`; return; }
  const W = 1000, PAD = 40;
  const lx = (v) => { const lv = Math.log10(Math.max(0.01, Math.min(99.9, v))); return PAD + ((lv + 2) / 4) * (W - PAD * 2); };
  const pts = list.map((p) => ({ p, x: lx(p.pd) })).sort((a, b) => a.x - b.x);
  const rows = [];
  pts.forEach((d) => { let r = 0; while (rows[r] != null && d.x - rows[r] < 34) r++; rows[r] = d.x; d.r = r; });
  const maxR = Math.max(...pts.map((d) => d.r));
  const H = 70 + (maxR + 1) * 36;
  const ticks = [0.01, 0.1, 1, 10, 50, 99];
  const col = (v) => (v < 5 ? "#84cc16" : v < 20 ? "#14b8a6" : v < 50 ? "#f59e0b" : "#ef4444");
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="p(doom) of ${list.length} people from lowest to highest">
    <defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#84cc16"/><stop offset=".45" stop-color="#14b8a6"/><stop offset=".7" stop-color="#f59e0b"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>
    <rect x="${PAD}" y="${H - 34}" width="${W - PAD * 2}" height="6" rx="3" fill="url(#sg)" opacity=".8"/>
    ${ticks.map((t, i) => `<text x="${lx(t)}" y="${H - 8}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="var(--muted)">${i ? "" : "\u2264 "}${t}%</text>`).join("")}
    ${pts.map((d) => { const y = H - 56 - d.r * 36; return `<a href="#/researchers/${d.p.id}" aria-label="${esc(d.p.name)}: ${esc(d.p.pdoom)}"><line x1="${d.x}" x2="${d.x}" y1="${y}" y2="${H - 34}" stroke="${col(d.p.pd)}" opacity=".35"/>
      <circle class="dot" cx="${d.x}" cy="${y}" r="15" fill="var(--surface-2)" stroke="${col(d.p.pd)}" stroke-width="2"/>
      <text x="${d.x}" y="${y + 4.5}" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="11" fill="var(--text)">${esc(initials(d.p.name))}</text>
      <title>${esc(d.p.name)}: ${esc(d.p.pdoom)}</title></a>`; }).join("")}
  </svg>`;
}
