/* Policy tracker: AI laws, orders, treaties and company frameworks worldwide, with dates, status and official sources.
   Every item, date and link lives in data/extra/policy.json. This file only arranges them. */
import { X, hero, sec, band, tocBar, ext, anim, bag, fmtD, today, shuffle, $, $$, esc, RM, ICON, store } from "./_kit.js";

const RC = { "European Union": "#3b82f6", "United States": "#ef4444", "California, US": "#f97316", "New York, US": "#f97316", "Illinois, US": "#f97316", China: "#eab308", India: "#10b981", Japan: "#0ea5e9", "South Korea": "#22d3ee", International: "#84cc16", Industry: "#14b8a6", "Civil society": "#f59e0b" };
const yf = (d) => { const [y, m = 1, dd = 1] = d.split("-").map(Number); return y + (m - 1) / 12 + (dd - 1) / 365; };
const statusCls = (s) => (/force|applying|Updated|Published|Signed$|Held|Set up|Issued/i.test(s) ? "on" : /Revoked/.test(s) ? "off" : "wait");
/* Three plain buckets for the quiz and the status board */
const BIND = (k) => (/^(Law|Regulation|Treaty)$/.test(k) ? "binding" : /^(Executive order|Policy plan|Guidelines|UN resolution|Bill)$/.test(k) ? "government" : "voluntary");
const BUCKET = { binding: ["Binding rule", "A law, regulation or treaty with legal force.", "#3b82f6"], government: ["Government action", "An order, plan, bill or guidance. Real, but not a full law, or not yet.", "#f59e0b"], voluntary: ["Voluntary", "Promises, statements, summits and reports. No legal penalty.", "#84cc16"] };
const SUMMITS = ["bletchley", "seoul", "paris", "india-summit"];

export async function render(el, params, query) {
  const B = bag();
  const D = await X("policy.json");
  const items = D.items || [];
  const help = D.kinds_help || {};
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const now = today();
  const regions = [...new Set(items.map((i) => i.region))];
  const kinds = [...new Set(items.map((i) => i.kind))].sort((a, b) => items.filter((i) => i.kind === b).length - items.filter((i) => i.kind === a).length);
  const laws = items.filter((i) => /Law|Regulation|Treaty/.test(i.kind));
  const upcoming = items.flatMap((i) => (i.milestones || []).map(([d, l]) => ({ d, l, i }))).filter((m) => m.d.length >= 10 && m.d > now).sort((a, b) => a.d.localeCompare(b.d));
  const F = { region: query.get("region") || "", kind: "", q: "" };
  const y0 = 2023, y1 = 2029;
  const X0 = (d) => ((yf(d) - y0) / (y1 - y0)) * 100;
  /* Greedy rows so timeline labels never overlap: a label takes about 9% of the track */
  const ends = [], rowOf = items.map((i) => { const x = X0(i.date.length === 7 ? i.date + "-15" : i.date); let r = ends.findIndex((e) => e <= x); if (r < 0) { r = ends.length; ends.push(0); } ends[r] = x + 9; return r; });
  const nRows = Math.max(5, ends.length);
  const days = (d) => Math.ceil((new Date(d) - new Date(now)) / 864e5);

  const card = (i) => `<article class="card x-pol card-glow" style="--c:${RC[i.region] || "var(--accent)"}" data-m3="up" id="p-${i.id}"><div class="row" style="gap:8px"><span class="tag">${esc(i.region)}</span><span class="tag" style="--c:#94a3b8">${esc(i.kind)}</span><span class="x-status ${statusCls(i.status)}">${esc(i.status)}</span></div>
    <div class="x-pol-d mono">${esc(fmtD(i.date))}</div><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p>
    ${(i.milestones || []).length ? `<ol class="x-ms">${i.milestones.map(([d, l]) => `<li class="${d > now ? "fut" : ""}"><span class="mono">${esc(fmtD(d))}</span>${esc(l)}</li>`).join("")}</ol>` : ""}
    <div class="row" style="margin-top:10px">${ext(i.url, "Official source")}${i.url2 ? ext(i.url2, "More") : ""}</div></article>`;
  const mini = (i) => `<button type="button" class="x-pmini" data-goto="${i.id}" style="--c:${RC[i.region] || "var(--accent)"}"><span class="mono">${esc(fmtD(i.date))}</span><b>${esc(i.t)}</b><span class="x-status ${statusCls(i.status)}">${esc(i.status)}</span></button>`;

  /* Counts for the status board */
  const buckets = { binding: [], government: [], voluntary: [] };
  items.forEach((i) => buckets[BIND(i.kind)].push(i));
  const live = items.filter((i) => statusCls(i.status) === "on").length, waiting = items.filter((i) => statusCls(i.status) === "wait").length, revoked = items.filter((i) => statusCls(i.status) === "off").length;

  /* EU AI Act stepper */
  const eu = byId["eu-ai-act"];
  const euSteps = eu ? [[eu.date, "Enters into force"], ...(eu.milestones || [])] : [];
  const euDone = euSteps.filter(([d]) => d <= now).length;

  /* United States: federal and state */
  const usFed = items.filter((i) => i.region === "United States");
  const usState = items.filter((i) => /, US$/.test(i.region));

  const quizSet = shuffle(items.filter((i) => i.kind !== "Summit"), Math.random).slice(0, 8);
  const best = store.get("x:policy:quiz", 0);

  el.innerHTML = `${hero({ img: "policy", eyebrow: "Policy tracker", title: `The rules are <span class="serif gt">being written.</span>`, lead: `Laws, executive orders, treaties, summits and the safety frameworks companies wrote for themselves, from 2023 to now. Dates and sources are official wherever possible. Status as of ${esc(fmtD(D.meta?.checked || ""))}.`, stats: [[items.length, "laws, rules and commitments"], [regions.length, "places and actors"], [laws.length, "binding laws and rules"], [upcoming.length, "dates still ahead"]] })}
  ${sec("next", 1, "Coming up", "What starts <span class='serif'>next.</span>", "Dates already set in law or official plans that have not arrived yet. Tap one to read the item.",
    `<div class="grid g3 x-count" data-m3-stagger="80">${upcoming.slice(0, 6).map((m) => { const n = days(m.d); return `<button type="button" class="card card-glow x-cd" data-m3="up" data-goto="${m.i.id}" style="--c:${RC[m.i.region]}"><b data-m3-count="${n}">${n}</b><span>days until</span><h3>${esc(m.l)}</h3><p>${esc(m.i.t)}, ${esc(fmtD(m.d))}</p></button>`; }).join("")}</div>`)}
  ${sec("kinds", 2, "Kinds of rules", "Not every rule is a <span class='serif'>law.</span>", "A promise, an order and a law are very different things. Here is what each kind means, and how many of each this tracker holds. Tap one to filter the tracker.",
    `<div class="grid g3 x-kinds" data-m3-stagger="50">${kinds.map((k) => { const n = items.filter((i) => i.kind === k).length; const b = BUCKET[BIND(k)]; return `<button type="button" class="card card-glow m3-spot x-kind" data-m3="up" data-kind="${esc(k)}" style="--c:${b[2]}"><span class="x-kind-n mono">${n}</span><b>${esc(k)}</b><span>${esc(help[k] || "")}</span><small style="color:${b[2]}">${esc(b[0])}</small></button>`; }).join("")}</div>`)}
  ${sec("board", 3, "Status board", "How much of it <span class='serif'>bites?</span>", "Sorted into three plain groups. Binding rules carry legal force; government actions are real but softer or not final; voluntary items depend on good faith.",
    `<div class="grid g3 x-buckets" data-m3-stagger="100">${Object.entries(BUCKET).map(([k, [t, dsc, c]]) => `<div class="card x-bucket" data-m3="up" style="--c:${c}"><div class="x-bucket-h"><b data-m3-count="${buckets[k].length}">${buckets[k].length}</b><div><h3>${esc(t)}</h3><p>${esc(dsc)}</p></div></div><div class="x-bucket-bar" aria-hidden="true"><i style="--w:${((buckets[k].length / items.length) * 100).toFixed(1)}%"></i></div><div class="x-bucket-list">${buckets[k].map(mini).join("")}</div></div>`).join("")}</div>
     <div class="row x-statusrow" style="margin-top:18px" data-m3="up"><span class="x-status on">${live} in force, applying or published</span><span class="x-status wait">${waiting} signed, open or waiting to start</span><span class="x-status off">${revoked} revoked</span></div>`)}
  ${sec("timeline", 4, "Timeline", "Three years of <span class='serif'>rules.</span>", "Scroll sideways on small screens. Dots are first dates; hollow rings are milestones still to come.",
    `<div class="x-ptl" data-lenis-prevent data-m3="fade"><div class="x-ptl-in" style="--rows:${nRows}">${Array.from({ length: y1 - y0 + 1 }, (_, k) => `<span class="x-ptl-y" style="--x:${(k / (y1 - y0)) * 100}%">${y0 + k}</span>`).join("")}<span class="x-ptl-now" style="--x:${X0(now)}%"><b>Today</b></span>
      ${items.map((i, k) => `<button type="button" class="x-ptl-dot" data-goto="${i.id}" style="--x:${X0(i.date.length === 7 ? i.date + "-15" : i.date)}%;--row:${rowOf[k]};--c:${RC[i.region] || "var(--accent)"}" title="${esc(i.t)}"><i></i><span>${esc(i.t.length > 34 ? i.t.slice(0, 32) + "..." : i.t)}</span></button>`).join("")}
      ${upcoming.map((m, k) => `<span class="x-ptl-fut" style="--x:${X0(m.d)}%;--row:${k % nRows};--c:${RC[m.i.region]}" title="${esc(m.l)}: ${esc(m.i.t)}"></span>`).join("")}</div></div>`)}
  ${eu ? sec("eu", 5, "European Union", "The EU AI Act, <span class='serif'>step by step.</span>", "The first broad AI law anywhere. It switches on in stages, so different rules start on different days.",
    `<div class="card x-eu" data-m3="up" style="--c:#3b82f6"><div class="x-eu-bar" aria-hidden="true"><i style="--w:${(((euDone - 1) / Math.max(1, euSteps.length - 1)) * 100).toFixed(1)}%"></i></div><ol class="x-eu-steps">${euSteps.map(([d, l], k) => `<li class="${d <= now ? "done" : ""}" style="--i:${k}" data-m3="up"><span class="dot" aria-hidden="true"></span><span class="mono">${esc(fmtD(d))}</span><b>${esc(l)}</b>${d > now ? `<small>in ${days(d).toLocaleString("en-US")} days</small>` : `<small>done</small>`}</li>`).join("")}</ol>
     <p class="muted" style="margin-top:16px">${esc(eu.d)} ${ext(eu.url, "European Commission")}</p>${byId["gpai-code"] ? `<p class="muted">Related: ${esc(byId["gpai-code"].t)}, ${esc(fmtD(byId["gpai-code"].date))}. ${ext(byId["gpai-code"].url, "Code of practice")}</p>` : ""}${byId.omnibus ? `<p class="muted">Related: ${esc(byId.omnibus.t)}. ${ext(byId.omnibus.url, "Council of the EU")}</p>` : ""}</div>`) : ""}
  ${sec("us", 6, "United States", "Washington and the <span class='serif'>states.</span>", "There is no broad federal AI law. Presidents have used executive orders, and states have passed their own frontier AI laws.",
    `<div class="grid g2 x-us"><div class="card" data-m3="right" style="--c:#ef4444"><div class="eyebrow">Federal</div><h3>${usFed.length} items</h3><div class="x-bucket-list">${usFed.map(mini).join("")}</div></div><div class="card" data-m3="left" style="--c:#f97316"><div class="eyebrow">States</div><h3>${usState.length} items</h3><div class="x-bucket-list">${usState.map(mini).join("")}</div></div></div>`)}
  ${sec("summits", 7, "Summits", "From Bletchley to <span class='serif'>New Delhi.</span>", "Four global summits in three years. Watch the focus drift from safety to action and impact.",
    `<ol class="x-road" data-m3-stagger="140">${SUMMITS.map((id) => byId[id]).filter(Boolean).map((i, k) => `<li data-m3="up" style="--c:${RC[i.region] || "#84cc16"}"><span class="x-road-n">${k + 1}</span><div><span class="mono">${esc(fmtD(i.date))}</span><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p>${ext(i.url, "Official source")}</div></li>`).join("")}</ol>`)}
  ${sec("tracker", 8, "Tracker", "Every item, <span class='serif'>filtered.</span>", "",
    `<div class="toolbar x-tools"><label class="sr-only" for="polq">Search</label><span class="x-qwrap"><input class="input search" id="polq" type="search" autocomplete="off" placeholder="Search, like frontier or incident"><button class="x-qclear" type="button" id="polx" aria-label="Clear search" hidden>${ICON.close}</button></span><select class="input x-sel" id="polk" aria-label="Kind"><option value="">All kinds</option>${kinds.map((k) => `<option>${esc(k)}</option>`).join("")}</select><span class="count" id="polc"></span></div>
     <div class="chips" style="margin-bottom:18px"><button class="chip" type="button" data-reg="" aria-pressed="true">All places</button>${regions.map((r) => `<button class="chip" type="button" data-reg="${esc(r)}" aria-pressed="false" style="--c:${RC[r]}">${esc(r)} <span class="mono">${items.filter((i) => i.region === r).length}</span></button>`).join("")}</div>
     <div class="grid g2" id="pollist"></div>`)}
  ${band("policy-world", "Rules are written in many capitals, and they only work if they connect.")}
  ${sec("world", 9, "By place", "Who is writing <span class='serif'>what.</span>", "Every place and actor in the tracker, with its items. Tap a place to filter the tracker.",
    `<div class="grid g4 x-regions" data-m3-stagger="50">${regions.map((r) => { const list = items.filter((i) => i.region === r); return `<button type="button" class="card card-glow m3-spot x-region" data-m3="up" data-reg="${esc(r)}" style="--c:${RC[r] || "var(--accent)"}"><span class="dot" aria-hidden="true"></span><b>${esc(r)}</b><span class="mono">${list.length} item${list.length > 1 ? "s" : ""}</span><small>${list.map((i) => esc(i.t)).slice(0, 3).join(", ")}${list.length > 3 ? ", and more" : ""}</small></button>`; }).join("")}</div>`)}
  ${sec("labs", 10, "Company frameworks", "Promises labs <span class='serif'>made themselves.</span>", "Voluntary policies that tie dangerous capability levels to stronger safeguards. California SB 53 and New York's RAISE Act now require large frontier developers to publish frameworks like these.",
    `<div class="x-table-wrap" data-lenis-prevent data-m3="up"><table class="x-table"><thead><tr><th>Framework</th><th>First version</th><th>Latest noted here</th><th>Core idea</th></tr></thead><tbody>
      <tr><td>${ext("https://www.anthropic.com/responsible-scaling-policy", "Anthropic RSP")}</td><td class="mono">Sep 2023</td><td>Version 3.4, effective 8 July 2026</td><td>AI Safety Levels: stronger safeguards required as capabilities cross thresholds.</td></tr>
      <tr><td>${ext("https://openai.com/index/updating-our-preparedness-framework/", "OpenAI Preparedness Framework")}</td><td class="mono">Dec 2023</td><td>Version 2, 15 April 2025</td><td>High and Critical capability thresholds in tracked categories, including AI self improvement.</td></tr>
      <tr><td>${ext("https://deepmind.google/discover/blog/strengthening-our-frontier-safety-framework/", "Google DeepMind Frontier Safety Framework")}</td><td class="mono">May 2024</td><td>Third version, 22 September 2025, updated 17 April 2026</td><td>Critical Capability Levels at which models may pose heightened risk without mitigations.</td></tr>
      <tr><td>${ext("https://metr.org/common-elements", "METR, common elements")}</td><td class="mono">2024</td><td>December 2025 update</td><td>Twelve companies had published frontier safety policies with shared parts: thresholds, weight security, deployment safeguards.</td></tr></tbody></table></div>`)}
  ${sec("india", 11, "India", "Where <span class='serif'>India</span> stands.", "India chose guidelines and existing laws over a new AI law for now, and hosted the fourth global summit.",
    `<div class="grid g2">${items.filter((i) => i.region === "India").map((i) => card(i).replace(` id="p-${i.id}"`, "")).join("")}<div class="card" data-m3="up"><h3>Also on this site</h3><p>The Indian languages corner explains these ideas in Bengali and Hindi, and the Alignment 101 lesson on summits covers Bletchley to New Delhi.</p><div class="row" style="margin-top:12px"><a class="btn sm" href="#/bharat">Indian languages corner</a><a class="btn sm ghost" href="#/learn/u5/summits">The summits lesson</a></div></div></div>`)}
  ${sec("quiz", 12, "Quick check", "Binding or <span class='serif'>not?</span>", "Eight items from the tracker. For each one, guess which group it belongs to. Your best score stays on this device.",
    `<div class="card x-pq" data-m3="up" id="pq"></div>`)}
  ${sec("notes", 13, "Read this first", "Not legal <span class='serif'>advice.</span>", "",
    `<div class="card" data-m3="up"><p>${esc(D.meta?.note || "")} I summarise in plain words, so details are left out. If you build or sell AI, read the official text or ask a lawyer. Laws change often; each card links to where you can check the current version.</p></div>`)}`;
  B.add(tocBar(el));

  const list = $("#pollist", el);
  function paint() {
    const q = F.q.toLowerCase();
    const r = items.filter((i) => (!F.region || i.region === F.region) && (!F.kind || i.kind === F.kind) && (!q || `${i.t} ${i.d} ${i.region} ${i.kind}`.toLowerCase().includes(q)));
    list.innerHTML = r.slice().reverse().map(card).join("") || `<div class="empty-state" style="grid-column:1/-1">Nothing matches.</div>`;
    $("#polc", el).textContent = `${r.length} of ${items.length}`;
    $$(".chip[data-reg]", el).forEach((b) => b.setAttribute("aria-pressed", b.dataset.reg === F.region));
    $("#polk", el).value = F.kind;
    B.add(anim(list));
  }
  paint();
  const toTracker = () => { const t = $("#tracker", el); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 100, behavior: RM() ? "auto" : "smooth" }); };

  /* Quiz */
  let qi = 0, score = 0, pick = null;
  const pq = $("#pq", el);
  const paintQ = () => {
    if (qi >= quizSet.length) {
      const b = Math.max(best, score); store.set("x:policy:quiz", b);
      pq.innerHTML = `<div class="x-pq-end"><b>${score} of ${quizSet.length}</b><p>${score >= 6 ? "You can tell a promise from a law. That is most of policy literacy." : "The line between promises and laws is blurry on purpose. Look at the Kinds of rules section and try again."}</p><p class="muted">Best on this device: ${b} of ${quizSet.length}.</p><button class="btn primary" type="button" id="pqre">Play again</button></div>`;
      B.add(anim(pq)); return;
    }
    const i = quizSet[qi], ans = BIND(i.kind);
    pq.innerHTML = `<div class="x-pq-top"><span class="mono">${qi + 1} of ${quizSet.length}</span><div class="x-dots">${quizSet.map((_, k) => `<i class="${k < qi ? "on" : ""}"></i>`).join("")}</div><span class="mono">Score ${score}</span></div>
      <div class="row" style="gap:8px;margin:14px 0 6px"><span class="tag" style="--c:${RC[i.region] || "var(--accent)"}">${esc(i.region)}</span><span class="mono muted">${esc(fmtD(i.date))}</span></div><h3 class="x-pq-t">${esc(i.t)}</h3>
      <div class="grid g3 x-pq-opts">${Object.entries(BUCKET).map(([k, [t, , c]]) => `<button type="button" class="btn x-pq-o ${pick ? (k === ans ? "ok" : k === pick ? "no" : "") : ""}" data-pq="${k}" style="--c:${c}" ${pick ? "disabled" : ""}>${esc(t)}</button>`).join("")}</div>
      ${pick ? `<p class="x-pq-fb" aria-live="polite"><b>${pick === ans ? "Right." : "Not quite."}</b> It is a ${esc(i.kind.toLowerCase())}: ${esc(help[i.kind] || "")}</p><button class="btn sm" type="button" id="pqn">Next ${ICON.arrow}</button>` : ""}`;
  };
  paintQ();

  const pqIn = $("#polq", el), qx = $("#polx", el);
  const syncX = () => { qx.hidden = !pqIn.value; };
  let t; pqIn.addEventListener("input", (e) => { syncX(); clearTimeout(t); t = setTimeout(() => { F.q = e.target.value; paint(); }, 90); });
  pqIn.addEventListener("keydown", (e) => { if (e.key === "Escape" && pqIn.value) { e.preventDefault(); e.stopPropagation(); pqIn.value = ""; syncX(); F.q = ""; paint(); } });
  qx.addEventListener("click", () => { clearTimeout(t); pqIn.value = ""; syncX(); F.q = ""; paint(); pqIn.focus(); });
  $("#polk", el).addEventListener("change", (e) => { F.kind = e.target.value; paint(); });
  el.addEventListener("click", (e) => {
    const o = e.target.closest("[data-pq]"); if (o && !pick) { pick = o.dataset.pq; if (pick === BIND(quizSet[qi].kind)) score++; paintQ(); return; }
    if (e.target.closest("#pqn")) { qi++; pick = null; paintQ(); return; }
    if (e.target.closest("#pqre")) { qi = 0; score = 0; pick = null; quizSet.splice(0, quizSet.length, ...shuffle(items.filter((i) => i.kind !== "Summit")).slice(0, 8)); paintQ(); return; }
    const kd = e.target.closest("[data-kind]"); if (kd) { F.kind = kd.dataset.kind; F.region = ""; paint(); toTracker(); return; }
    const rg = e.target.closest("[data-reg]"); if (rg) { F.region = rg.dataset.reg; if (rg.classList.contains("x-region")) { F.kind = ""; F.q = ""; $("#polq", el).value = ""; $("#polx", el).hidden = true; } paint(); if (rg.classList.contains("x-region")) toTracker(); return; }
    const g = e.target.closest("[data-goto]"); if (g) { F.region = ""; F.kind = ""; F.q = ""; $("#polq", el).value = ""; $("#polx", el).hidden = true; paint(); const c = $("#p-" + g.dataset.goto, list); if (c) { c.scrollIntoView({ behavior: RM() ? "auto" : "smooth", block: "center" }); c.classList.add("x-flash"); setTimeout(() => c.classList.remove("x-flash"), 1600); } }
  });
  return () => B.run();
}
