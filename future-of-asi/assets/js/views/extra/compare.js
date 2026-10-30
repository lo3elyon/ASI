/* Compare researchers (Round 4): pick two or three people and read their profiles side by side.
   Every cell is read from data/researchers.json (and signatories.json, videos.json). An empty cell says
   "Not in the data", never a guess. The choice lives in the hash (#/compare?ids=a,b,c) so it can be shared. */
import { people, hero, sec, tocBar, anim, bag, replaceRoute, $, $$, esc, ICON } from "./_kit.js";
import { videos, signatories, categories, GROUPS, avatar, orgChip, ytThumb, fmtDur } from "../../util.js";
import { shareBtn, copyBtn, quoteText, links } from "../../core/share.js";

const MAX = 3;
/* Starting sets. Each label is a plain fact about the people in it, checked against their data rows. */
const PRESETS = [
  { ids: ["geoffrey-hinton", "yoshua-bengio", "yann-lecun"], label: "The 2018 Turing Award winners", why: "Three deep learning pioneers who shared the 2018 Turing Award, and now disagree about the risk." },
  { ids: ["sam-altman", "dario-amodei", "demis-hassabis"], label: "Three frontier lab leaders", why: "The heads of OpenAI, Anthropic and Google DeepMind." },
  { ids: ["eliezer-yudkowsky", "yann-lecun"], label: "Very worried, very calm", why: "One puts p(doom) above 95 percent, the other below 0.01 percent." },
  { ids: ["daniel-kokotajlo", "jan-leike", "ilya-sutskever"], label: "They left OpenAI", why: "Three people whose profiles record leaving OpenAI." },
  { ids: ["buck-shlegeris", "ryan-greenblatt"], label: "AI control researchers", why: "The CEO and the chief scientist of Redwood Research, where AI control started." },
];
const groupLabel = (g) => (GROUPS[g] && GROUPS[g].label) || String(g || "").replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const groupColor = (g) => (GROUPS[g] && GROUPS[g].c) || "#22d3ee";
const NONE = `<span class="r4c-none">Not in the data</span>`;

export async function render(el, params, query) {
  const B = bag();
  const [P, vids, sig, cats] = await Promise.all([people(), videos(), signatories(), categories()]);
  const { list, byId } = P;
  const catL = Object.fromEntries(cats.map((c) => [c.id, c]));
  const signer = Object.fromEntries(sig.list.filter((s) => s.researcher_id).map((s) => [s.researcher_id, s]));
  const vFor = (id) => vids.filter((v) => v.people.includes(id) || (byId[id] && byId[id].video_ids.includes(v.id)));
  const presets = PRESETS.map((p) => ({ ...p, ids: p.ids.filter((i) => byId[i]) })).filter((p) => p.ids.length >= 2);
  const sorted = list.slice().sort((a, b) => a.name.localeCompare(b.name));
  const groups = [...new Set(sorted.map((p) => p.group))].sort((a, b) => groupLabel(a).localeCompare(groupLabel(b)));

  const fromQuery = (q) => [...new Set(String((q && q.get("ids")) || "").split(",").map((s) => s.trim()).filter((s) => byId[s]))].slice(0, MAX);
  let ids = fromQuery(query);
  if (!ids.length) ids = (presets[0] || { ids: sorted.slice(0, 2).map((p) => p.id) }).ids.slice();

  const opts = (sel) => `<option value="">Nobody</option>${groups.map((g) => `<optgroup label="${esc(groupLabel(g))}">${sorted.filter((p) => p.group === g).map((p) => `<option value="${esc(p.id)}"${p.id === sel ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</optgroup>`).join("")}`;

  el.innerHTML = `${hero({ img: "compare", eyebrow: "Compare researchers", title: `Side by side, <span class="serif gt">in their own words.</span>`, lead: "Pick two or three people. Every cell comes from their profile in this guide, and every quote links to where it was said. An empty cell means the data has nothing on it, not that they have no view.", stats: [[list.length, "people to pick from"], [list.filter((p) => p.pdoom).length, "gave a p(doom)"], [list.reduce((s, p) => s + p.quotes.length, 0), "sourced quotes"]] })}
  ${sec("pick", 1, "Pick people", "Who do you want to <span class='serif'>compare?</span>", "Choose up to three. Your choice is saved in the address, so the link opens the same table.",
    `<div class="r4c-pick card" data-m3="up">
       <div class="r4c-slots">${[0, 1, 2].map((i) => `<label class="r4c-slot"><span>Person ${i + 1}${i === 2 ? " (optional)" : ""}</span><select data-slot="${i}" aria-label="Person ${i + 1}">${opts(ids[i] || "")}</select></label>`).join("")}</div>
       <div class="r4c-actions"><button type="button" class="btn sm ghost" id="r4cRand">Pick two at random</button><span id="r4cShare"></span></div>
     </div>
     <div class="r4c-presets" data-m3-stagger="60">${presets.map((p, i) => `<button type="button" class="r4c-preset card-glow" data-preset="${i}" data-m3="up"><span class="faces">${p.ids.map((id) => avatar(byId[id], "avatar")).join("")}</span><b>${esc(p.label)}</b><small>${esc(p.why)}</small></button>`).join("")}</div>`)}
  ${sec("side", 2, "Side by side", "The <span class='serif'>profiles.</span>", "Scroll sideways on a small screen. Tap a name to open the full profile.", `<div id="r4cTab" aria-live="polite"></div>`)}
  ${sec("common", 3, "Common ground", "What they <span class='serif'>share.</span>", "Shared labs, shared categories, and videos where they appear together.", `<div id="r4cCommon"></div>`)}`;

  const tab = $("#r4cTab", el), common = $("#r4cCommon", el);

  function cellQuotes(p) {
    const qs = p.quotes.slice().sort((a, b) => a.text.length - b.text.length).filter((q) => q.text.length > 30).slice(0, 2);
    if (!qs.length) return NONE;
    return qs.map((q) => `<figure class="r4c-q"><blockquote>&ldquo;${esc(q.text)}&rdquo;</blockquote><figcaption>${esc(q.source || "")}${q.date ? `, ${esc(q.date)}` : ""} ${q.url ? `<a href="${esc(q.url)}" target="_blank" rel="noopener">source ${ICON.ext}</a>` : ""}</figcaption>${copyBtn(quoteText(q, p), { label: "Copy quote", aria: `Copy this quote by ${p.name}`, msg: "Quote copied with its source.", cls: "sm" })}</figure>`).join("");
  }
  const ROWS = [
    ["Group", (p) => `<span class="tag" style="--c:${groupColor(p.group)}">${esc(groupLabel(p.group))}</span>`],
    ["Works at", (p) => (p.org ? orgChip(p.org) : NONE)],
    ["Role", (p) => (p.role ? esc(p.role) : NONE)],
    ["Country", (p) => (p.country || p.region ? esc([p.country, p.region && p.region !== p.country ? p.region : ""].filter(Boolean).join(", ")) : NONE)],
    ["p(doom)", (p) => (p.pdoom ? `<b class="r4c-big">${esc(p.pdoom)}</b>${p.pd != null ? `<span class="r4c-pd" role="img" aria-label="About ${Math.round(p.pd * 10) / 10} percent on a 0 to 100 scale"><i style="--w:${Math.max(1, Math.min(100, p.pd))}%"></i></span>` : ""}${p.pdoom_source ? `<a class="r4c-src" href="${esc(p.pdoom_source)}" target="_blank" rel="noopener">source ${ICON.ext}</a>` : ""}` : NONE)],
    ["AGI timeline", (p) => (p.agi_year ? `<b class="r4c-big">${esc(p.agi_year)}</b>` : NONE)],
    ["Their warning", (p) => (p.warning ? `<p>${esc(p.warning)}</p>` : NONE)],
    ["Left a lab", (p) => (p.left_lab ? `<p><b>${esc(p.left_lab.org || "A lab")}</b>${p.left_lab.year ? `, ${esc(p.left_lab.year)}` : ""}${p.left_lab.reason ? `. ${esc(p.left_lab.reason)}` : ""}</p>${p.left_lab.source ? `<a class="r4c-src" href="${esc(p.left_lab.source)}" target="_blank" rel="noopener">source ${ICON.ext}</a>` : ""}` : NONE)],
    ["Worked at before", (p) => (p.former_orgs.length ? `<div class="r4c-chips">${p.former_orgs.slice(0, 6).map((o) => `<span class="chip">${esc(o)}</span>`).join("")}</div>` : NONE)],
    ["Focus", (p) => (p.focus.length ? `<div class="r4c-chips">${p.focus.slice(0, 6).map((f) => `<span class="chip">${esc(f)}</span>`).join("")}</div>` : NONE)],
    ["Citations", (p) => (p.citations ? `${esc(p.citations)}${p.scholar_url ? ` <a class="r4c-src" href="${esc(p.scholar_url)}" target="_blank" rel="noopener">Scholar ${ICON.ext}</a>` : ""}` : NONE)],
    ["Books", (p) => (p.books.length ? `<ul class="r4c-ul">${p.books.slice(0, 3).map((b) => `<li>${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.title)}</a>` : esc(b.title)}${b.year ? ` <span class="muted">${esc(b.year)}</span>` : ""}</li>`).join("")}</ul>` : NONE)],
    ["Key papers", (p) => (p.key_papers.length ? `<ul class="r4c-ul">${p.key_papers.slice(0, 3).map((b) => `<li>${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.title)}</a>` : esc(b.title)}${b.year ? ` <span class="muted">${esc(b.year)}</span>` : ""}</li>`).join("")}</ul>` : NONE)],
    ["In their words", cellQuotes],
    ["Pacing the Frontier", (p) => { const s = signer[p.id]; return s ? `<p><b>Signed.</b>${s.comment ? ` &ldquo;${esc(s.comment)}&rdquo;` : ""}</p>` : `<span class="r4c-none">Not a named signer</span>`; }],
    ["Videos", (p) => { const vs = vFor(p.id); return vs.length ? `<p><b>${vs.length}</b> in the library</p><ul class="r4c-ul">${vs.slice(0, 2).map((v) => `<li><a href="#/watch/${esc(v.id)}" data-video="${esc(v.id)}">${esc(v.title)}</a></li>`).join("")}</ul>` : NONE; }],
  ];

  function paint() {
    const ps = ids.map((i) => byId[i]).filter(Boolean);
    $$("select[data-slot]", el).forEach((s, i) => { s.value = ids[i] || ""; });
    $("#r4cShare", el).innerHTML = ps.length >= 2 ? shareBtn(links.route(`#/compare?ids=${ps.map((p) => p.id).join(",")}`), { label: "Copy link to this comparison", aria: "Copy a link to this comparison", title: `Compare ${ps.map((p) => p.name).join(", ")}` }) : "";
    $$("[data-preset]", el).forEach((b) => { const pr = presets[+b.dataset.preset]; b.setAttribute("aria-pressed", String(pr.ids.join() === ps.map((p) => p.id).join())); });
    if (ps.length < 2) {
      tab.innerHTML = `<div class="card r4c-empty"><p>Pick at least two people above to see them side by side.</p></div>`;
      common.innerHTML = ""; return;
    }
    tab.innerHTML = `<div class="r4c-scroll" role="region" aria-label="Comparison table. Scroll sideways to see every column." tabindex="0" data-lenis-prevent>
      <table class="r4c-t" style="--n:${ps.length}">
        <caption class="sr-only">Comparing ${esc(ps.map((p) => p.name).join(", "))}</caption>
        <thead><tr><td class="r4c-corner"></td>${ps.map((p) => `<th scope="col"><a class="r4c-who" href="#/researchers/${esc(p.id)}" data-person="${esc(p.id)}">${avatar(p, "avatar r4c-av")}<b>${esc(p.name)}</b><small>Open profile</small></a></th>`).join("")}</tr></thead>
        <tbody>${ROWS.map(([k, f]) => `<tr><th scope="row">${esc(k)}</th>${ps.map((p) => `<td>${f(p)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
    paintCommon(ps);
    B.add(anim(tab));
  }

  function paintCommon(ps) {
    const allOrgs = (p) => new Set([p.org, ...p.former_orgs].filter(Boolean).map((o) => o.trim()));
    const sets = ps.map(allOrgs);
    const orgs = [...sets[0]].filter((o) => sets.every((s) => s.has(o)));
    const cs = ps[0].categories.filter((c) => ps.every((p) => p.categories.includes(c))).map((c) => catL[c]).filter(Boolean);
    const together = vids.filter((v) => ps.filter((p) => v.people.includes(p.id) || p.video_ids.includes(v.id)).length >= 2);
    const pdp = ps.filter((p) => p.pd != null);
    const signed = ps.filter((p) => signer[p.id]);
    const card = (t, body) => `<div class="card r4c-cm" data-m3="up"><h3>${t}</h3>${body}</div>`;
    common.innerHTML = `<div class="r4c-cgrid" data-m3-stagger="70">
      ${card("Labs in common", orgs.length ? `<div class="r4c-chips">${orgs.map((o) => orgChip(o)).join("")}</div><p class="muted">Current or past, from each profile.</p>` : `<p class="muted">No lab shows up in all ${ps.length} profiles.</p>`)}
      ${card("Shared categories", cs.length ? `<div class="r4c-chips">${cs.map((c) => `<span class="tag" style="--c:${c.c}">${esc(c.label)}</span>`).join("")}</div>` : `<p class="muted">They sit in different categories in this guide.</p>`)}
      ${card("p(doom) on one line", pdp.length >= 2 ? `<div class="r4c-line" role="img" aria-label="${esc(pdp.map((p) => `${p.name} about ${Math.round(p.pd * 10) / 10} percent`).join("; "))}"><span class="ax"></span>${pdp.map((p, i) => `<span class="dot" style="--x:${Math.max(0, Math.min(100, p.pd))}%;--i:${i}" title="${esc(p.name)}: ${esc(p.pdoom)}">${avatar(p, "avatar")}</span>`).join("")}<span class="l0">0%</span><span class="l1">100%</span></div><p class="muted">Midpoints of the ranges they gave. Definitions and dates differ, so read each source.</p>` : `<p class="muted">${pdp.length ? "Only one of them" : "None of them"} gave a number we could place.</p>`)}
      ${card("Pacing the Frontier", `<p>${signed.length ? `${esc(signed.map((p) => p.name).join(" and "))} signed.` : "None of them is a named signer."}${signed.length && signed.length < ps.length ? ` ${esc(ps.filter((p) => !signer[p.id]).map((p) => p.name).join(" and "))} did not sign by name.` : ""}</p>`)}
    </div>
    <h3 class="r4c-h3">Seen together</h3>
    ${together.length ? `<div class="r4c-vids">${together.slice(0, 8).map((v) => `<a class="r4c-vid card" href="#/watch/${esc(v.id)}" data-video="${esc(v.id)}"><span class="th"><img src="${ytThumb(v.id)}" alt="" loading="lazy" width="320" height="180">${v.duration ? `<span class="dur">${esc(fmtDur(v.duration))}</span>` : ""}</span><b>${esc(v.title)}</b><small>${esc(v.channel)}${v.year ? `, ${esc(v.year)}` : ""}</small></a>`).join("")}</div>${together.length > 8 ? `<p class="muted">${together.length - 8} more in the video library.</p>` : ""}` : `<p class="muted">No video in the library lists more than one of them.</p>`}`;
  }

  const setIds = (n) => { ids = [...new Set(n.filter((i) => byId[i]))].slice(0, MAX); replaceRoute(`#/compare${ids.length ? `?ids=${ids.join(",")}` : ""}`); paint(); };
  el.addEventListener("change", (e) => {
    const s = e.target.closest("select[data-slot]"); if (!s) return;
    const n = [0, 1, 2].map((i) => ($(`select[data-slot="${i}"]`, el).value || ""));
    setIds(n.filter(Boolean));
  });
  el.addEventListener("click", (e) => {
    const pr = e.target.closest("[data-preset]");
    if (pr) { setIds(presets[+pr.dataset.preset].ids); const t = $("#side", el); if (t) t.scrollIntoView({ block: "start", behavior: "auto" }); return; }
    if (e.target.closest("#r4cRand")) { const pool = list.filter((p) => p.quotes.length && (p.pdoom || p.warning)); const a = pool[Math.floor(Math.random() * pool.length)]; let b = a; while (b === a) b = pool[Math.floor(Math.random() * pool.length)]; setIds([a.id, b.id]); }
  });
  paint();
  el._onParams = (pp, q) => { const n = fromQuery(q); if (n.length && n.join() !== ids.join()) { ids = n; paint(); } };
  B.add(tocBar(el));
  return () => B.run();
}
