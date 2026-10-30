/* Numbers: a dashboard of key figures with dates and sources. Compute, data centers, agent time horizons,
   money, what happens inside one lab (automation, oversight, safety compute, speed tests), futures, signatures and surveys.
   Every figure comes from data/extra/numbers.json, which names its source page. */
import { X, people, hero, sec, band, tocBar, ext, bars, anim, bag, horizonChart, $, $$, esc, ICON, RM } from "./_kit.js";

const fmtMin = (m) => {
  const h = m / 60;
  if (h < 1) return `${Math.round(m)} minutes`;
  if (h < 48) return `${+h.toFixed(h < 10 ? 1 : 0)} hours`;
  const wd = h / 8;
  if (wd < 10) return `${+wd.toFixed(1)} work days`;
  const wk = wd / 5;
  if (wk < 9) return `${+wk.toFixed(1)} work weeks`;
  return `${+(wk / 4.3).toFixed(1)} work months`;
};
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const addM = (y, m, k) => { const t = y * 12 + (m - 1) + k; return `${MON[t % 12]} ${Math.floor(t / 12)}`; };

export async function render(el) {
  const B = bag();
  const [N, P] = await Promise.all([X("numbers.json"), people()]);
  const inv = N.invest || {}, sig = N.signatures || [], comp = N.compute || [], metr = N.metr || { points: [] }, ant = N.anthropic || { stats: [] }, sv = N.survey || {};
  const infra = N.infra || [], dbl = N.doubling || {}, au = N.automation || {}, ov = N.oversight || {}, sc = N.safety_compute || {}, ts = N.tests || {}, cav = N.caveats || [];
  const quotes = P.list.reduce((s, p) => s + (p.quotes || []).length, 0), pd = P.list.filter((p) => p.pdoom).length;
  const big = (v, l, src, url, cls = "") => `<div class="card x-big card-glow m3-spot ${cls}" data-m3="up"><b>${v}</b><span>${esc(l)}</span><small>${esc(src)} ${ext(url, "Source")}</small></div>`;
  const lastH = metr.points?.length ? metr.points[metr.points.length - 1] : null;
  const levels = ant.levels || [];

  /* Donut for a share, drawn with stroke dash. Final value in the markup. */
  const donut = (pct, label, c) => `<figure class="x-donut" data-m3="scale" style="--c:${c}"><svg viewBox="0 0 120 120" role="img" aria-label="${pct} percent ${esc(label)}"><circle class="bg" cx="60" cy="60" r="50"></circle><circle class="fg" cx="60" cy="60" r="50" pathLength="100" style="--v:${pct}"></circle></svg><b><span data-m3-count="${pct}">${pct}</span>%</b><figcaption>${esc(label)}</figcaption></figure>`;

  el.innerHTML = `${hero({ img: "numbers", eyebrow: "Numbers", title: `The numbers <span class="serif gt">behind the warnings.</span>`, lead: "Feelings are not evidence. Here are the figures people point to when they say AI is moving fast: compute, how long agents can work, money, what happens inside one lab, and how many people are speaking up. Every number has a date and a source.", stats: [[inv.total_2025 ? `$${Math.round(inv.total_2025)}B` : "", "global corporate AI investment in 2025"], [comp[0]?.v || "", "a year growth in training compute"], [lastH ? `${Math.round(lastH.min / 60)} h+` : "", "task horizon for the newest agent measured"], [sig[1]?.v || 0, "signatures on the Statement on Superintelligence"]] })}
  <div class="x-ticker" role="region" tabindex="0" aria-label="Key figures" data-m3-marquee="34">${[...comp, ...infra].map((c) => `<span><b>${esc(c.v)}</b> ${esc(c.l.length > 70 ? c.l.slice(0, c.l.lastIndexOf(" ", 68)) + "..." : c.l)}</span>`).join("")}</div>
  ${sec("compute", 1, "Compute", "The <span class='serif'>fuel.</span>", "Training compute, chips and better algorithms all compound. That is why progress feels faster every year.",
    `<div class="grid g4" data-m3-stagger="80">${comp.map((c) => big(esc(c.v), c.l, c.src, c.url)).join("")}</div>`)}
  ${sec("infra", 2, "Data centers", "Concrete, power and <span class='serif'>chips.</span>", "AI is not just code. It runs in buildings the size of towns, and the money and time to build them are now tracked like any other industry.",
    `<div class="grid g4" data-m3-stagger="60">${infra.map((c) => big(esc(c.v), c.l, c.src, c.url)).join("")}</div>`)}
  ${sec("horizon", 3, "Agents", "How long agents can <span class='serif'>work.</span>", `${esc(metr.note || "")}`,
    `<div class="card x-chart-card" data-m3="up">${horizonChart(metr.points || [])}<div class="row" style="margin-top:8px">${ext(metr.url_paper, "METR, March 2025")}${ext(metr.url_page, "METR time horizons")}${ext(metr.url_ant, "Anthropic, 2026")}</div></div>
     <p class="muted" style="margin-top:14px">METR's March 2025 paper found the 50 percent time horizon had doubled about every seven months for six years. Anthropic now reports a faster pace, about every four months. ${ext("https://arxiv.org/abs/2503.14499", "arXiv 2503.14499")}</p>`)}
  ${sec("doubling", 4, "Do the maths", "What a doubling <span class='serif'>means.</span>", "Move the slider. This is plain arithmetic on a stated trend, not a forecast. Trends can bend, and nobody knows if this one will hold.",
    `<div class="card x-calc" data-m3="up" id="calc"><div class="x-calc-top"><div><div class="eyebrow">Start</div><p>${esc(dbl.start_label || "")}</p></div><div class="x-seg" role="group" aria-label="Doubling time"><button type="button" data-dbl="${dbl.new_months || 4}" aria-pressed="true">Every ${dbl.new_months || 4} months</button><button type="button" data-dbl="${dbl.old_months || 7}" aria-pressed="false">Every ${dbl.old_months || 7} months</button></div></div>
      <label class="x-calc-l" for="calcm">Months after early 2026: <b id="calcmv">12</b></label><input class="x-range" id="calcm" type="range" min="0" max="36" step="1" value="12">
      <div class="x-calc-out" aria-live="polite"><b id="calco"></b><span id="calcd"></span></div>
      <div class="x-calc-bar" aria-hidden="true"><i id="calcb"></i></div>
      <p class="muted" style="margin-top:12px">${esc(dbl.quote_note || "")} ${ext(dbl.url, "Anthropic")}</p></div>`)}
  ${band("numbers-wafer", "Every chip on a wafer like this is a little more compute. Compute is the one input to AI you can count and track.")}
  ${sec("money", 5, "Money", "Where the money <span class='serif'>goes.</span>", `${esc(inv.source || "")}. Private investment means funding rounds into private AI companies.`,
    `<div class="grid g3" data-m3-stagger="80">${big(`$${inv.total_2025}B`, "global corporate AI investment in 2025, including mergers and stakes", "AI Index 2026", inv.url)}${big(`$${inv.private_2025}B`, `global private AI investment in 2025, up from $${inv.private_2024}B in 2024`, "AI Index 2026", inv.url)}${big(`$${inv.genai_private_2025}B`, "of that went to generative AI companies, nearly half", "AI Index 2026", inv.url)}</div>
     <div class="grid g2" style="margin-top:22px"><div class="card" data-m3="up"><h3>Private AI investment by country, 2025</h3><p class="muted">Billions of US dollars.</p>${bars((inv.countries || []).map(([c, v]) => [c, v, "", c === "India" ? "#10b981" : c === "United States" ? "#ef4444" : ""]), { fmt: (v) => v.toFixed(2) })}</div>
     <div class="card" data-m3="up"><h3>Newly funded AI companies, 2025</h3>${bars((inv.new_companies || []).map(([c, v]) => [c, v, "", c === "India" ? "#10b981" : ""]))}<h3 style="margin-top:24px">Rounds over $1 billion</h3>${bars([["2024", inv.billion_rounds?.[0] || 0], ["2025", inv.billion_rounds?.[1] || 0]])}<p class="muted" style="font-size:13px;margin-top:10px">For comparison, the 2025 AI Index put US private AI investment in 2024 at $${esc(N.invest_2024?.v || "")} billion. ${ext(N.invest_2024?.url, "AI Index 2025")}</p></div></div>
     <div class="grid g2" style="margin-top:22px">${big(`${inv.adoption_orgs}%`, "of surveyed organisations used AI in at least one business function in 2025", "McKinsey survey via AI Index 2026", inv.url)}${big(`${inv.genai_3yr}%`, "adoption of generative AI within three years of its mass market launch, faster than the PC or the internet", "AI Index 2026", inv.url)}</div>`)}
  ${sec("ladder", 6, "Inside one lab", "From laptops to <span class='serif'>agents.</span>", "How work changed at Anthropic, in the company's own telling. The last step has not happened.",
    `<ol class="x-tl" data-m3-stagger="110">${(ant.ladder || []).map((s, i, a) => `<li data-m3="up" class="${i === a.length - 1 ? "x-tl-q" : ""}"><span class="mono">${esc(s.y)}</span><b>${esc(s.t)}</b><p>${esc(s.d)}</p></li>`).join("")}</ol><p class="muted" style="margin-top:14px">${ext(ant.url, "Anthropic, When AI builds itself")}</p>`)}
  ${sec("lab", 7, "AI building AI", "The lab's own <span class='serif'>figures.</span>", "Figures Anthropic published about its own work. They are the company's own measurements, so read them with that in mind.",
    `<div class="grid g3" data-m3-stagger="70">${(ant.stats || []).map((s) => big(esc(s.v), s.l, "Anthropic", ant[s.u] || ant.url)).join("")}</div>`)}
  ${sec("levels", 8, "Automation levels", "How much does the AI <span class='serif'>lead?</span>", `A six step scale from Epoch AI that Anthropic used to rate its own research work, as of ${esc(au.asof || "")}. Tap a level.`,
    `<div class="card x-levels" data-m3="up"><div class="x-ladder-steps" role="tablist" aria-label="Automation levels">${levels.map((l, i) => `<button type="button" role="tab" data-lv="${i}" aria-selected="${i === 4}" class="${i === 4 ? "on" : ""}"><span class="mono">${esc(l.k)}</span>${esc(l.t)}</button>`).join("")}</div>
      <div class="x-lv-meter" aria-hidden="true">${levels.map((_, i) => `<i style="--i:${i}" class="${i <= 4 ? "on" : ""}"></i>`).join("")}</div>
      <div id="lvout" aria-live="polite"></div></div>
     <div class="grid g3" style="margin-top:22px" data-m3-stagger="80">${big(`<span data-m3-count="${au.al4}">${au.al4}</span>%`, `of Anthropic's AI R&D work is led by Claude (AL4), up from under ${au.al4_feb}% in February 2026`, "Anthropic", au.url)}${big(`${au.al3plus}%+`, "of the work is at or above the level where AI collaborates (AL3)", "Anthropic", au.url)}${big("0", "measured parts of the work that are fully autonomous (AL5)", "Anthropic", au.url)}</div>`)}
  ${band("numbers-monitors", "Every action an agent takes can pass a monitor first. Most are fine. A few get flagged for a person to read.")}
  ${sec("oversight", 9, "Oversight", "Who watches the <span class='serif'>agents?</span>", `About ${(ov.agents || 0).toLocaleString("en-US")} agents work on Anthropic's main internal platform at any one time. Here is how their actions are checked, as of ${esc(ov.asof || "")}.`,
    `<div class="x-funnel" data-m3-stagger="120">
      <div class="x-fn" data-m3="left" style="--w:100%"><b>${esc(ov.decisions || "")}</b><span>agent decisions analysed in one month. ${esc(ov.coverage || "")} pass an online monitor before they run.</span></div>
      <div class="x-fn" data-m3="left" style="--w:72%"><b>${(ov.flagged_week || 0).toLocaleString("en-US")}</b><span>transcripts a week flagged by the after the fact monitor, then checked by more classifiers</span></div>
      <div class="x-fn" data-m3="left" style="--w:44%"><b>${esc(ov.blocked_pct || "")}</b><span>of decisions blocked by the online monitor, ${esc(ov.blocked_ratio || "")}</span></div>
      <div class="x-fn x-fn-h" data-m3="left" style="--w:24%"><b>~${ov.human_week || 0}</b><span>top priority flags a week that reach a human</span></div></div>
     <p class="muted" style="margin-top:14px">Rare is not never. Anthropic notes that with millions of agents in the economy, even rare events can happen regularly. ${ext(ov.url, "Anthropic, measuring the pace")}</p>`)}
  ${sec("safetycompute", 10, "Safety share", "How much compute goes to <span class='serif'>safety?</span>", `A snapshot of ${esc(sc.window || "")}. ${esc(sc.note || "")}`,
    `<div class="grid g2 x-donuts">${donut(sc.rd || 0, "of AI R&D compute went to safety work", "#22d3ee")}${donut(sc.ai_rd || 0, "of compute for AI driven AI R&D went to safety work", "#f59e0b")}</div><p class="muted" style="margin-top:14px">One week is enough to show the measurement can be made, not enough to show a trend. ${ext(sc.url, "Anthropic")}</p>`)}
  ${sec("tests", 11, "Speed tests", "Better than a person at <span class='serif'>some things.</span>", "Three tests Anthropic runs on each new model. The first is a fixed code speed up task. The second asks the model to pick the next step in a stuck research session.",
    `<div class="grid g2"><div class="card" data-m3="up"><h3>Training code speed up</h3><p class="muted">How many times faster the model made the same code.</p>${bars((ts.speedup || []).map(([l, v]) => [l, v, "", /human/i.test(l) ? "#f59e0b" : "#22d3ee"]), { fmt: (v) => "~" + v + "x" })}</div>
      <div class="card" data-m3="up"><h3>Better next step than the person</h3><p class="muted">Share of hard moments where a judge preferred the model's suggestion.</p>${bars((ts.nextstep || []).map(([l, v]) => [l, v]), { max: 100, fmt: (v) => v + "%" })}</div></div>
     <div class="grid g3" style="margin-top:22px" data-m3-stagger="80">${ts.openended ? big(`${ts.openended.sep_from}% to ${ts.openended.sep_to}%`, "Claude Code success on open ended problems, August 2025 to September 2026", "Anthropic update, 18 Sep 2026", ts.url) : ""}${ts.poll ? big(esc(ts.poll.median), `median output boost staff estimated in a ${esc(ts.poll.when)} poll of ${ts.poll.n} employees. Anthropic expects the true number was lower.`, "Anthropic", ts.url) : ""}${ts.github ? big("275M", `GitHub commits a week by mid 2026, against ${esc(ts.github.y2025)}`, "Anthropic, citing GitHub", ts.url) : ""}</div>`)}
  ${sec("futures", 12, "Three futures", "Where this could <span class='serif'>go.</span>", "Anthropic sketches three futures. Its own read is that the evidence points to the middle one.",
    `<div class="grid g3 x-futs" data-m3-stagger="110">${(ant.futures || []).map((f, i) => `<article class="card card-glow m3-spot x-fut" data-m3="up" style="--c:${["#84cc16", "#f59e0b", "#ef4444"][i]}"><span class="mono">0${i + 1}</span><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p>${i === 1 ? `<span class="chip-cat" data-cat="amber">Anthropic thinks we are heading here</span>` : ""}</article>`).join("")}</div><p class="muted" style="margin-top:14px">${ext(ant.url, "Anthropic, possible futures")} <a href="#/futures">Explore futures on this site ${ICON.arrow}</a></p>`)}
  ${sec("voices", 13, "Speaking up", "People who <span class='serif'>signed.</span>", "Public statements and commitments, with the date each count was read.",
    `<div class="grid g2"><div class="card" data-m3="up">${bars(sig.filter((s) => s.v < 5000).map((s) => [s.k, s.v, s.asof]))}<p class="muted" style="font-size:13px;margin-top:10px">${sig.filter((s) => s.v < 5000).map((s) => ext(s.url, s.k)).join(" ")}</p></div>
     ${sig.filter((s) => s.v >= 5000).map((s) => big(`<span data-m3-count="${s.v}">${s.v.toLocaleString("en-US")}</span>`, `${s.k}, ${s.note || ""}, as of ${s.asof}`, s.k, s.url, "x-big-xl")).join("")}</div>
     ${sig[0] ? `<p class="muted" style="margin-top:14px">Pacing the Frontier: ${sig[0].named?.toLocaleString("en-US")} named signers and ${sig[0].anon?.toLocaleString("en-US")} without a public name. <a href="#/pacing">See every named signer ${ICON.arrow}</a></p>` : ""}`)}
  ${sec("survey", 14, "Experts", "What AI researchers <span class='serif'>expect.</span>", "From the largest survey of its kind.",
    `<div class="grid g3" data-m3-stagger="80">${big(`<span data-m3-count="${sv.n}">${(sv.n || 0).toLocaleString("en-US")}</span>`, "researchers who had published at top AI venues answered", "Grace et al.", sv.url)}${big(sv.p10, "year with a 10% chance machines beat humans at every task", "Grace et al.", sv.url)}${big(sv.p50, `year with a 50% chance, ${sv.shift} years earlier than the same survey a year before`, "Grace et al.", sv.url)}</div>`)}
  ${sec("caveats", 15, "Read with care", "How to read these <span class='serif'>numbers.</span>", "A number with no context can scare or soothe you for the wrong reasons. Keep these in mind.",
    `<div class="grid g3 x-cav" data-m3-stagger="70">${cav.map((c, i) => `<details class="card x-cav-i" data-m3="up" ${i === 0 ? "open" : ""}><summary><span class="mono">${String(i + 1).padStart(2, "0")}</span>${esc(c.t)}</summary><p>${esc(c.d)}</p></details>`).join("")}</div>`)}
  ${sec("site", 16, "This site", "What Threshold <span class='serif'>tracks.</span>", "Counted live from the data files behind these pages.",
    `<div class="grid g4" data-m3-stagger="70">${big(`<span data-m3-count="${P.list.length}">${P.list.length}</span>`, "researchers profiled", "data/researchers.json", "")}${big(`<span data-m3-count="${quotes}">${quotes}</span>`, "quotes, each with a source link", "data/researchers.json", "")}${big(`<span data-m3-count="${pd}">${pd}</span>`, "p(doom) estimates with sources", "data/researchers.json", "")}${big("60", "papers checked against arXiv", "data/extra/papers.json", "")}</div>
     <p class="muted" style="margin-top:14px">All figures checked on ${esc(N.meta?.checked || "")}. ${esc(N.meta?.note || "")}</p>`)}`;
  B.add(tocBar(el));

  /* Doubling calculator */
  let d = dbl.new_months || 4;
  const calc = () => {
    const m = +$("#calcm", el).value, v = (dbl.start_min || 720) * Math.pow(2, m / d);
    $("#calcmv", el).textContent = m;
    $("#calco", el).textContent = fmtMin(v);
    $("#calcd", el).textContent = `by about ${addM(2026, 2, m)}, if a doubling every ${d} months held`;
    $("#calcb", el).style.setProperty("--w", `${Math.min(100, (Math.log2(v / 60) / Math.log2(2400 * 8 / 60)) * 100).toFixed(1)}%`);
  };
  calc();
  $("#calcm", el).addEventListener("input", calc);

  /* Automation level picker */
  const lvD = (au.levels_d || []);
  const paintLv = (i) => {
    $$("[data-lv]", el).forEach((b) => { const on = +b.dataset.lv === i; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    $$(".x-lv-meter i", el).forEach((m, k) => m.classList.toggle("on", k <= i));
    const l = levels[i] || {};
    $("#lvout", el).innerHTML = `<h3>${esc(l.k || "")}: ${esc(l.t || "")}</h3><p>${esc(lvD[i] || "")}</p>${i === 4 ? `<p class="muted">Anthropic says Claude was at this level for ${au.al4}% of its AI R&D work in ${esc(au.asof || "")}.</p>` : i === 5 ? `<p class="muted">Not reached for any measured part of the work, as of ${esc(au.asof || "")}.</p>` : ""}`;
  };
  paintLv(4);
  el.addEventListener("click", (e) => {
    const lv = e.target.closest("[data-lv]"); if (lv) { paintLv(+lv.dataset.lv); return; }
    const db = e.target.closest("[data-dbl]"); if (db) { d = +db.dataset.dbl; $$("[data-dbl]", el).forEach((b) => b.setAttribute("aria-pressed", b === db)); calc(); }
  });
  return () => B.run();
}
