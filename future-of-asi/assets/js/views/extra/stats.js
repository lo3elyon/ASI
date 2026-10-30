/* Threshold in charts (Round 4). Every chart is counted in the browser from the data files this site ships with,
   so the numbers always match the rest of the guide. Nothing here is typed in by hand.
   Each column chart has a "Show the numbers" table for screen readers and for anyone who prefers rows. */
import { X, people, hero, sec, band, tocBar, bars, anim, bag, pchip, $, esc } from "./_kit.js";
import { videos, signatories, load, arr, GROUPS, CATS, avatar } from "../../util.js";
import { shareBtn, links } from "../../core/share.js";

const fmt = (n) => Number(n).toLocaleString("en-US");
const GL = { interpretability: "Interpretability", theory: "Theory", hci: "Human and AI", evals: "Evals", "in-lab": "Inside a lab" };
const groupLabel = (g) => (GROUPS[g] && GROUPS[g].label) || GL[g] || String(g || "").replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const COUNTRY = { USA: "United States", US: "United States", "U.S.": "United States", UK: "United Kingdom", "U.K.": "United Kingdom" };
const cap = (t) => String(t || "").replace(/^\w/, (c) => c.toUpperCase());
/* Keep the top n rows and fold the rest into one "Other" row, so long tails stay readable */
const topOther = (rows, n, label) => { if (rows.length <= n + 1) return rows; const rest = rows.slice(n).reduce((s, r) => s + r[1], 0); return [...rows.slice(0, n), [`${label} (${rows.length - n} more)`, rest, "", "#64748b"]]; };
const groupColor = (g) => (GROUPS[g] && GROUPS[g].c) || "#14b8a6";
const tally = (items, key = (x) => x) => { const m = new Map(); items.forEach((x) => { const k = key(x); if (k) m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))); };
const orgName = (o) => String(o || "").replace(/\s*\([^)]*\)/g, "").split(/[,;]/)[0].trim();

/* Column chart in HTML, so labels stay readable on a phone. rows: [label, value] in order. */
function cols(rows, { c = "var(--cat)", label = "", unit = "" } = {}) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const dense = rows.length > 10;
  return `<figure class="r4s-colfig" data-m3="up">
    <div class="r4s-cols${dense ? " dense" : ""}" role="img" aria-label="${esc(label)}: ${esc(rows.map(([l, v]) => `${l} ${v}`).join(", "))}" style="--n:${rows.length};--c:${c}">
      ${rows.map(([l, v], i) => `<div class="col" style="--h:${((v / max) * 100).toFixed(1)}%;--i:${i}"><span class="v">${fmt(v)}</span><span class="bar"><i></i></span><span class="x">${esc(l)}</span></div>`).join("")}
    </div>
    <details class="r4s-tbl"><summary>Show the numbers</summary><table><thead><tr><th scope="col">${esc((label.split(" by ")[1] || "group").replace(/^\w/, (x) => x.toUpperCase()))}</th><th scope="col">Count${unit ? ` (${esc(unit)})` : ""}</th></tr></thead><tbody>${rows.map(([l, v]) => `<tr><th scope="row">${esc(l)}</th><td>${fmt(v)}</td></tr>`).join("")}</tbody></table></details>
  </figure>`;
}
const card = (body, cls = "") => `<div class="card r4s-card ${cls}" data-m3="up">${body}</div>`;
const src = (t) => `<p class="r4s-src">Counted from <code>${esc(t)}</code>.</p>`;
const kpi = (v, l) => `<div class="r4s-kpi"><b data-m3-count="${v}">${fmt(v)}</b><span>${esc(l)}</span></div>`;

export async function render(el) {
  const B = bag();
  const [P, vids, sig, orgsRaw, tlRaw, papers] = await Promise.all([people(), videos(), signatories(), load("orgs.json"), load("timeline.json"), X("papers.json")]);
  const ppl = P.list, orgs = arr(orgsRaw, "orgs"), events = arr(tlRaw, "events"), pps = (papers && papers.papers) || [];
  const quotes = ppl.flatMap((p) => p.quotes.map((q) => ({ ...q, p })));

  /* People */
  const byGroup = tally(ppl, (p) => p.group).map(([g, n]) => [groupLabel(g), n, "", groupColor(g)]);
  const byRegion = tally(ppl, (p) => p.region).map(([r, n]) => [r, n]);
  const noRegion = ppl.filter((p) => !p.region).length;
  const byCountry = tally(ppl, (p) => COUNTRY[p.country] || p.country).slice(0, 10).map(([r, n]) => [r, n]);
  const byOrg = tally(ppl, (p) => orgName(p.org)).filter(([, n]) => n > 1).slice(0, 12).map(([o, n]) => [o, n]);
  const former = tally(ppl.flatMap((p) => [...new Set(p.former_orgs.map(orgName))]));
  const leftLab = tally(ppl.filter((p) => p.left_lab && p.left_lab.org), (p) => orgName(p.left_lab.org));

  /* Worry and timelines */
  const pd = ppl.filter((p) => p.pd != null).sort((a, b) => a.pd - b.pd);
  const bands = [["Under 5%", (x) => x < 5, "#84cc16"], ["5 to 20%", (x) => x >= 5 && x < 20, "#14b8a6"], ["20 to 50%", (x) => x >= 20 && x < 50, "#f59e0b"], ["50% or more", (x) => x >= 50, "#ef4444"]].map(([l, f, c]) => [l, pd.filter((p) => f(p.pd)).length, "", c]);

  /* Quotes and videos */
  const qYears = tally(quotes, (q) => (String(q.date || "").match(/\d{4}/) || [""])[0]).sort((a, b) => a[0].localeCompare(b[0]));
  const qDated = qYears.reduce((s, r) => s + r[1], 0);
  const vy = tally(vids, (v) => v.year);
  const y0 = Math.min(...vy.map((r) => +r[0])), y1 = Math.max(...vy.map((r) => +r[0]));
  const vYears = []; for (let y = y0; y <= y1; y++) vYears.push([String(y), (vy.find((r) => +r[0] === y) || [0, 0])[1]]);
  const secs = (d) => String(d || "").split(":").reduce((a, b) => a * 60 + (+b || 0), 0);
  const hours = Math.round(vids.reduce((s, v) => s + secs(v.duration), 0) / 3600);
  const byCat = tally(vids, (v) => v.category).map(([c, n]) => [(CATS[c] || { label: c }).label, n, "", (CATS[c] || {}).c]);
  const byLevel = tally(vids, (v) => v.level).map(([l, n]) => [l[0].toUpperCase() + l.slice(1), n, "", { beginner: "#84cc16", intermediate: "#f59e0b", advanced: "#ef4444" }[l]]);
  const byChannel = tally(vids, (v) => v.channel).slice(0, 10).map(([c, n]) => [c, n]);
  const featured = tally(vids.flatMap((v) => v.people)).filter(([id]) => P.byId[id]).slice(0, 12);

  /* Signers, orgs, timeline, papers */
  const emp = tally(sig.list, (s) => (s.employer || "").trim()).slice(0, 12).map(([e, n]) => [e, n]);
  const withC = sig.list.filter((s) => s.comment).length;
  const anon = sig.meta.count_anon || 0, named = sig.list.length;
  const oType = topOther(tally(orgs, (o) => cap(o.type)).map(([t, n]) => [t, n]), 9, "Other types");
  const oCountry = topOther(tally(orgs, (o) => COUNTRY[o.country] || o.country).map(([t, n]) => [t, n]), 9, "Other countries");
  const decade = (e) => { const y = +(e.year || String(e.date || "").slice(0, 4)); return y ? `${Math.floor(y / 10) * 10}s` : ""; };
  const eDec = tally(events, decade).sort((a, b) => a[0].localeCompare(b[0]));
  const pYears = tally(pps, (p) => p.year).sort((a, b) => a[0].localeCompare(b[0]));
  const topics = (papers && papers.topics) || {};
  const pTopic = tally(pps, (p) => topics[p.topic] || p.topic).map(([t, n]) => [t, n]);

  el.innerHTML = `${hero({ img: "stats", eyebrow: "Threshold in charts", title: `The whole guide, <span class="serif gt">counted.</span>`, lead: "Who is in this guide, where they work, how worried they are, and what the video and paper libraries hold. Every chart is counted live from the data files, so it always matches the rest of the site.", stats: [[ppl.length, "researchers"], [quotes.length, "sourced quotes"], [vids.length, "verified videos"], [sig.list.length + anon, "Pacing signers"]], extra: `<div class="row" style="margin-top:18px">${shareBtn(links.route("#/stats"), { label: "Copy link", aria: "Copy a link to Threshold in charts" })}</div>` })}
  ${sec("people", 1, "People", "Who is <span class='serif'>in here.</span>", `${ppl.length} researchers, lab leaders, forecasters and critics. Each person has one main group.`,
    `<div class="r4s-grid two">${card(`<h3>By group</h3>${bars(byGroup)}${src("data/researchers.json, group")}`)}${card(`<h3>By region</h3>${bars(byRegion)}<p class="muted r4s-note">${noRegion ? `${noRegion} people have no region on record yet.` : ""}</p>${src("data/researchers.json, region")}`)}</div>
     <div class="r4s-grid two">${card(`<h3>Top countries</h3>${bars(byCountry)}${src("data/researchers.json, country")}`)}${card(`<h3>Where they work now</h3><p class="muted r4s-note">Organisations with two or more people in this guide.</p>${bars(byOrg)}${src("data/researchers.json, org")}`)}</div>`)}
  ${sec("moves", 2, "Moves", "Where they <span class='serif'>came from.</span>", "Past employers listed in each profile, and the labs people left with a stated reason.",
    `<div class="r4s-grid two">${card(`<h3>Most common past employers</h3>${bars(former.slice(0, 12).map(([o, n]) => [o, n]))}${src("data/researchers.json, former_orgs")}`)}${card(`<h3>Left a lab, by lab</h3>${bars(leftLab.map(([o, n]) => [o, n, "", "#ef4444"]))}<p class="muted r4s-note">${leftLab.reduce((s, r) => s + r[1], 0)} people in this guide have a recorded departure. Each profile links to the source.</p>${src("data/researchers.json, left_lab")}`)}</div>`)}
  ${sec("worry", 3, "Worry", "How worried they <span class='serif'>say they are.</span>", `${pd.length} people gave a p(doom) number we can place on a line. We use the midpoint of any range. Definitions and dates differ, so open each profile for the source.`,
    `${card(`<div class="r4s-strip" role="img" aria-label="${esc(pd.map((p) => `${p.name} ${Math.round(p.pd * 10) / 10}%`).join("; "))}"><span class="ax"></span>${[0, 25, 50, 75, 100].map((t) => `<span class="tk" style="--x:${t}%">${t}%</span>`).join("")}${pd.map((p, i) => `<a class="dot" href="#/researchers/${esc(p.id)}" data-person="${esc(p.id)}" style="--x:${Math.max(0, Math.min(100, p.pd)).toFixed(2)}%;--row:${i % 3}" title="${esc(p.name)}: ${esc(p.pdoom)}" aria-label="${esc(p.name)}, ${esc(p.pdoom)}">${avatar(p, "avatar")}</a>`).join("")}</div>
       <details class="r4s-tbl"><summary>Show the numbers</summary><table><thead><tr><th scope="col">Person</th><th scope="col">What they said</th><th scope="col">Midpoint</th></tr></thead><tbody>${pd.slice().reverse().map((p) => `<tr><th scope="row">${esc(p.name)}</th><td>${esc(p.pdoom)}</td><td>${Math.round(p.pd * 100) / 100}%</td></tr>`).join("")}</tbody></table></details>`, "wide")}
     <div class="r4s-grid two">${card(`<h3>In four bands</h3>${bars(bands)}${src("data/researchers.json, pdoom")}`)}${card(`<h3>Numbers and words</h3><div class="r4s-kpis">${kpi(ppl.filter((p) => p.agi_year).length, "people with a stated timeline")}${kpi(pd.length, "with a p(doom) we can place")}${kpi(ppl.filter((p) => p.pdoom && p.pd == null).length, "gave words, not a number")}</div><p class="muted r4s-note">Most people in this guide never gave a public number, and that is fine. Their warnings are in their profiles.</p>`)}</div>`)}
  ${sec("quotes", 4, "Quotes", "When the words were <span class='serif'>said.</span>", `${qDated} of ${quotes.length} quotes have a year. Every quote links to its source.`,
    `${card(`${cols(qYears.map(([y, n]) => [y, n]), { label: "Quotes by year", c: "#f59e0b" })}${src("data/researchers.json, quotes[].date")}`, "wide")}`)}
  ${band("numbers-monitors")}
  ${sec("videos", 5, "Videos", "The video library, <span class='serif'>by the numbers.</span>", `${fmt(vids.length)} verified videos, about ${fmt(hours)} hours in total. Nothing plays until you press play.`,
    `${card(`${cols(vYears, { label: "Videos by year", c: "#3b82f6" })}${src("data/videos.json, date")}`, "wide")}
     <div class="r4s-grid two">${card(`<h3>By category</h3>${bars(byCat)}${src("data/videos.json, category")}`)}${card(`<h3>By level</h3>${bars(byLevel)}<h3 style="margin-top:22px">Top channels</h3>${bars(byChannel)}${src("data/videos.json, channel")}`)}</div>
     ${card(`<h3>Most featured people</h3><p class="muted r4s-note">People tagged in the most videos. Tap a name for their profile.</p><div class="r4s-people">${featured.map(([id, n]) => pchip(P.byId[id], ` <small>${n} videos</small>`)).join("")}</div>${src("data/videos.json, people")}`, "wide")}`)}
  ${sec("signers", 6, "Signers", "Pacing the Frontier, <span class='serif'>by employer.</span>", `${fmt(named + anon)} people signed: ${fmt(named)} by name and ${fmt(anon)} without a public name. ${fmt(withC)} named signers left a comment.`,
    `<div class="r4s-grid two">${card(`<h3>Named and anonymous</h3>${bars([["Named", named, "", "#10b981"], ["Anonymous", anon, "", "#64748b"]])}<h3 style="margin-top:22px">Left a comment</h3>${bars([["With a comment", withC, "", "#f59e0b"], ["Name only", named - withC, "", "#64748b"]])}${src("data/signatories.json")}`)}${card(`<h3>Top employers of named signers</h3>${bars(emp)}${src("data/signatories.json, employer")}`)}</div>`)}
  ${sec("orgs", 7, "Organisations", "The groups <span class='serif'>doing the work.</span>", `${orgs.length} labs, institutes, nonprofits and programmes on the globe.`,
    `<div class="r4s-grid two">${card(`<h3>By type</h3>${bars(oType)}${src("data/orgs.json, type")}`)}${card(`<h3>By country</h3>${bars(oCountry)}${src("data/orgs.json, country")}`)}</div>`)}
  ${sec("history", 8, "History and papers", "Warnings over time, <span class='serif'>and the papers.</span>", `${events.length} dated events on the warnings timeline and ${pps.length} key papers checked on arXiv.`,
    `<div class="r4s-grid two">${card(`<h3>Timeline events by decade</h3>${cols(eDec.map(([d, n]) => [d, n]), { label: "Events by decade", c: "#ef4444" })}${src("data/timeline.json")}`)}${card(`<h3>Key papers by year</h3>${cols(pYears.map(([y, n]) => [y, n]), { label: "Papers by year", c: "#0ea5e9" })}${src("data/extra/papers.json")}`)}</div>
     ${card(`<h3>Key papers by topic</h3>${bars(pTopic)}${src("data/extra/papers.json, topic")}`, "wide")}`)}`;

  B.add(tocBar(el));
  return () => B.run();
}
