import { $, $$, esc, load, arr, researchers, pageHero, store, ICON, clamp, toast } from "../util.js";
import { NEW_TABS, compute, horizon, wrap as wrap3 } from "../views3/tools3.js";
import { pic } from "../views3/kit.js";

const TABS = [["pdoom", "p(doom) calculator"], ["timelines", "AGI timeline forecaster"], ["dial", "Risk dial"], ...NEW_TABS];
const PREMISES = [
  ["build", "Possible to build", "By 2070 it is possible and affordable to build advanced, agentic, strategically aware AI.", 65],
  ["incent", "Strong incentives", "There are strong incentives to build and deploy such systems.", 80],
  ["hard", "Alignment is hard", "It is much harder to build aligned systems than misaligned ones that still look attractive to deploy.", 40],
  ["seek", "Power seeking happens", "Some misaligned systems seek power over humans in high impact ways.", 65],
  ["scale", "It scales", "That power seeking scales to permanently disempowering almost all of humanity.", 40],
  ["xrisk", "It is a catastrophe", "Such disempowerment counts as an existential catastrophe.", 95],
];
const ARGS = [
  ["We have warning shots first", -0.5, "Smaller failures will wake people up before a fatal one."],
  ["AI can help align AI", -0.6, "Controlled early systems speed up safety research."],
  ["Progress may hit limits", -0.4, "Compute, energy or data may slow things down."],
  ["Coordination is possible", -0.4, "Treaties and norms worked, partly, for nuclear weapons."],
  ["Race dynamics", 0.6, "Labs and countries feel they cannot slow down."],
  ["Deception is hard to detect", 0.7, "A capable model could pass every test we know how to run."],
  ["Fast takeoff", 0.6, "Automated AI research could compress years into months."],
  ["Few chances to retry", 0.5, "A failed superintelligence may not let us try again."],
];
const logit = (p) => Math.log(p / (1 - p)), sig = (x) => 1 / (1 + Math.exp(-x));

export async function render(el, params) {
  const [ppl, fc] = await Promise.all([researchers(), load("forecasts.json")]);
  const forecasts = arr(fc, "forecasts").slice().sort((a, b) => a.year - b.year);
  el.innerHTML = `${pageHero({ img: "cover-tools", eyebrow: "Tools", title: "Think it through <span class='serif gt-ember'>yourself.</span>", lead: "Five small instruments for your own judgment. They do not predict anything. They make your assumptions visible, so you can argue with them." })}
  <section class="section tight"><div class="wrap">${gauges(ppl, forecasts)}<div class="tool-tabs" role="tablist">${TABS.map(([id, n]) => `<a class="chip" role="tab" href="#/tools/${id}" data-t="${id}">${n}</a>`).join("")}</div><div class="t3-art" id="toolArt" aria-hidden="true"></div><div id="tool"></div></div></section>`;
  wrap3(el);
  const show = (p) => {
    const id = TABS.some((t) => t[0] === p[0]) ? p[0] : "pdoom";
    $$("[data-t]", el).forEach((a) => { a.classList.toggle("on", a.dataset.t === id); a.setAttribute("aria-selected", a.dataset.t === id); });
    const host = $("#tool", el);
    ({ pdoom: () => pdoom(host, ppl), timelines: () => timelines(host, forecasts, ppl), dial: () => dial(host), compute: () => compute(host), horizon: () => horizon(host) })[id]();
    const art = $("#toolArt", el); if (art) art.innerHTML = pic("tool-" + id, "", { sizes: "(max-width: 760px) 100vw, 1200px" });
  };
  el._onParams = show;
  show(params);
  return () => clearInterval(window.__thrTick);
}

function pdoom(host, ppl) {
  const st = store.get("pdoomCalc", { v: Object.fromEntries(PREMISES.map((p) => [p[0], p[3]])), a: {} });
  host.innerHTML = `<div class="calc"><div>
    <div class="card" style="margin-bottom:16px"><div class="eyebrow">Method</div><p style="margin:10px 0 0">Joe Carlsmith broke AI existential risk into a chain of six claims. Each slider is how likely you think that step is, given the steps before it. Multiply them and you get a rough number. His own numbers gave about 5% by 2070, and he later wrote that his estimate had risen above 10%. <a href="https://arxiv.org/abs/2206.13353" target="_blank" rel="noopener">Read the report ${ICON.ext}</a></p>
    <div class="row" style="margin-top:12px"><button class="btn sm" type="button" id="carl">Load Carlsmith 2021 numbers</button><button class="btn sm ghost" type="button" id="mid">Set all to 50%</button></div></div>
    ${PREMISES.map(([k, n, d], i) => `<div class="card premise"><div class="slider"><label for="pr-${k}"><span>${i + 1}. ${n}</span><output id="po-${k}"></output></label><p>${d}</p><input type="range" id="pr-${k}" data-k="${k}" min="1" max="99" value="${st.v[k]}"></div></div>`).join("")}
    <div class="card" style="margin-top:16px"><div class="eyebrow">Arguments that move you</div><p class="muted" style="margin:8px 0 12px;font-size:14px">Tick the ones you find convincing. Each one nudges your final number up or down. The size of each nudge is a simple choice made for this tool.</p>
      <div class="check">${ARGS.map(([n, w, d], i) => `<label class="${st.a[i] ? "done" : ""}"><input type="checkbox" data-a="${i}" ${st.a[i] ? "checked" : ""}><span><b>${n} <span class="tag" style="--c:${w > 0 ? "#ef4444" : "#84cc16"};margin-left:6px">${w > 0 ? "raises" : "lowers"}</span></b><small>${d}</small></span></label>`).join("")}</div></div>
  </div>
  <aside class="card out"><div class="eyebrow" style="justify-content:center">Your estimate</div><div id="ring" style="margin:16px auto"></div><div class="big-num" id="pv">0%</div><p class="muted" id="pchain" style="margin:6px 0 14px;font-size:14px"></p><div id="funnel" style="text-align:left"></div><p id="near" style="font-size:14px;margin:16px 0 0;color:var(--text-2)"></p>
    <button class="btn sm" type="button" id="cp" style="margin-top:14px">Copy my numbers</button></aside></div>`;
  const pts = ppl.filter((p) => p.pd != null);
  function calc() {
    let chain = 1; const v = {};
    PREMISES.forEach(([k]) => { const r = $(`#pr-${k}`, host); v[k] = +r.value; chain *= v[k] / 100; r.style.setProperty("--p", `${v[k]}%`); $(`#po-${k}`, host).textContent = `${v[k]}%`; });
    const a = {}; let shift = 0; $$("[data-a]", host).forEach((c) => { if (c.checked) { a[c.dataset.a] = 1; shift += ARGS[+c.dataset.a][1]; } c.closest("label").classList.toggle("done", c.checked); });
    store.set("pdoomCalc", { v, a });
    const fin = sig(logit(clamp(chain, 0.0001, 0.9999)) + shift);
    const pct = fin * 100;
    $("#pv", host).textContent = pct < 1 ? `${pct.toFixed(2)}%` : `${pct.toFixed(1)}%`;
    $("#pv", host).style.color = pct < 5 ? "var(--lime)" : pct < 20 ? "var(--teal)" : pct < 50 ? "var(--amber)" : "var(--red)";
    $("#pchain", host).textContent = `Chain alone: ${(chain * 100).toFixed(1)}%. Arguments ${shift === 0 ? "add nothing" : shift > 0 ? "push it up" : "pull it down"}.`;
    const r = 70, C = 2 * Math.PI * r;
    $("#ring", host).innerHTML = `<svg width="170" height="170" viewBox="0 0 170 170"><circle cx="85" cy="85" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="12"/><circle cx="85" cy="85" r="${r}" fill="none" stroke="url(#rg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - fin)}" transform="rotate(-90 85 85)" style="transition:stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)"/><defs><linearGradient id="rg"><stop offset="0" stop-color="#14b8a6"/><stop offset=".6" stop-color="#f59e0b"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs></svg>`;
    let run = 1; $("#funnel", host).innerHTML = PREMISES.map(([k, n]) => { run *= v[k] / 100; return `<div style="margin:6px 0"><div class="row" style="justify-content:space-between;font-size:12.5px"><span>${n}</span><span class="mono">${(run * 100).toFixed(1)}%</span></div><div class="meter" style="height:6px"><i style="width:${run * 100}%"></i></div></div>`; }).join("");
    const near = pts.slice().sort((x, y) => Math.abs(x.pd - pct) - Math.abs(y.pd - pct)).slice(0, 3);
    $("#near", host).innerHTML = near.length ? `Closest stated views: ${near.map((p) => `<a href="#/researchers/${p.id}">${esc(p.name)}</a> (${esc(p.pdoom.length > 30 ? p.pd.toFixed(p.pd < 1 ? 2 : 0) + "%" : p.pdoom)})`).join(", ")}.` : "";
    return pct;
  }
  $$("input[type=range], [data-a]", host).forEach((x) => x.addEventListener("input", calc));
  $("#carl", host).onclick = () => { PREMISES.forEach(([k, , , d]) => ($(`#pr-${k}`, host).value = d)); $$("[data-a]", host).forEach((c) => (c.checked = false)); calc(); toast("Loaded the 2021 report numbers: 65, 80, 40, 65, 40, 95."); };
  $("#mid", host).onclick = () => { PREMISES.forEach(([k]) => ($(`#pr-${k}`, host).value = 50)); calc(); };
  $("#cp", host).onclick = () => { const pct = calc(); const t = `My p(doom) on Threshold: ${pct.toFixed(1)}% (${PREMISES.map(([k, n]) => `${n} ${$(`#pr-${k}`, host).value}%`).join(", ")}). ${location.href}`; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Copied."), () => toast(t)); };
  calc();
}

function timelines(host, fc, ppl) {
  const yNow = new Date().getFullYear() + new Date().getMonth() / 12;
  const my = store.get("agiYear", 2032);
  const Y0 = 2024, Y1 = 2060, X = (y) => 230 + ((y - Y0) / (Y1 - Y0)) * 740;
  const textTimes = ppl.filter((p) => p.agi_year);
  host.innerHTML = `<div class="card fchart"><div class="sec-head" style="margin-bottom:10px"><div><div class="eyebrow">Compare forecasts</div><h3 style="margin:6px 0 0">When do people expect AGI or superintelligence?</h3><p class="muted" style="margin:6px 0 0;font-size:14px">Dots are the headline year. Bars show the range the source gives or implies. Each row links to its source. Definitions differ, so read them before comparing.</p></div></div>
    <svg id="fsvg" viewBox="0 0 1000 ${80 + fc.length * 46}" role="img" aria-label="Forecast comparison chart"></svg></div>
    <div class="grid g2" style="margin-top:18px">
      <div class="card"><div class="slider"><label for="my">Your guess <output id="myo">${my}</output></label><p>Drag to set the year you think AGI arrives. It is saved in your browser.</p><input type="range" id="my" min="2026" max="2070" value="${my}"></div>
        <div class="big-num" id="left" style="margin-top:16px">0</div><p class="muted" id="leftw" style="margin:6px 0 0"></p><div class="mono" id="tick" style="font-size:14px;color:var(--accent);margin-top:10px"></div></div>
      <div class="card"><div class="eyebrow">In their own words</div><div style="display:grid;gap:12px;margin-top:12px">${textTimes.map((p) => `<a href="#/researchers/${p.id}" style="color:var(--text)"><b>${esc(p.name)}</b><br><span class="muted" style="font-size:14px">${esc(p.agi_year)}</span></a>`).join("") || "<p class='muted'>None in the dataset.</p>"}</div></div>
    </div>`;
  function draw() {
    const m = +$("#my", host).value;
    const rows = fc.map((f, i) => { const y = 50 + i * 46; return `<a href="${f.url.startsWith("#") ? f.url : f.url}" ${f.url.startsWith("#") ? "" : 'target="_blank" rel="noopener"'}><g><text x="10" y="${y + 4}" font-size="14" font-weight="600" fill="var(--text)" font-family="Inter, sans-serif">${esc(f.who)}</text><text x="10" y="${y + 21}" font-size="11.5" fill="var(--muted)" font-family="Inter, sans-serif">${esc(f.what).slice(0, 38)}</text>
      <rect x="${X(f.low)}" y="${y - 5}" width="${Math.max(6, X(f.high) - X(f.low))}" height="10" rx="5" fill="${f.c}" opacity=".28"/><circle cx="${X(f.year)}" cy="${y}" r="8" fill="${f.c}" stroke="var(--bg)" stroke-width="3"/><text x="${X(f.year) + 14}" y="${y + 4}" font-size="12" font-family="JetBrains Mono, monospace" fill="${f.c}">${f.year}</text><title>${esc(f.text)} Source: ${esc(f.source)}</title></g></a>`; }).join("");
    const ticks = [2025, 2030, 2035, 2040, 2045, 2050, 2055, 2060].map((t) => `<line x1="${X(t)}" x2="${X(t)}" y1="24" y2="${50 + fc.length * 46}" stroke="var(--line)"/><text x="${X(t)}" y="16" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="JetBrains Mono, monospace">${t}</text>`).join("");
    const now = `<line x1="${X(yNow)}" x2="${X(yNow)}" y1="24" y2="${50 + fc.length * 46}" stroke="var(--accent)" stroke-dasharray="3 5"/><text x="${X(yNow)}" y="${66 + fc.length * 46}" text-anchor="middle" font-size="11" fill="var(--accent)" font-family="JetBrains Mono, monospace">NOW</text>`;
    const you = `<line x1="${X(m)}" x2="${X(m)}" y1="24" y2="${50 + fc.length * 46}" stroke="var(--amber)" stroke-width="2"/><text x="${X(m)}" y="${66 + fc.length * 46}" text-anchor="middle" font-size="11" fill="var(--amber)" font-family="JetBrains Mono, monospace">YOU ${m}</text>`;
    $("#fsvg", host).innerHTML = ticks + now + rows + you;
    $("#myo", host).textContent = m; $("#my", host).style.setProperty("--p", `${((m - 2026) / 44) * 100}%`);
    const yrs = m - yNow; $("#left", host).textContent = yrs < 1 ? "under a year" : `${yrs.toFixed(1)} years`;
    const earlier = fc.filter((f) => f.year < m).length;
    $("#leftw", host).textContent = `${earlier} of ${fc.length} sources here expect it earlier than you, ${fc.length - earlier} the same year or later.`;
    store.set("agiYear", m);
  }
  $("#my", host).addEventListener("input", draw);
  draw();
  clearInterval(window.__thrTick);
  const tick = () => { const m = +$("#my", host)?.value; if (!m) return clearInterval(window.__thrTick); const ms = new Date(`${m}-01-01T00:00:00`) - new Date(); if (ms <= 0) { $("#tick", host).textContent = ""; return; } const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), mi = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3); $("#tick", host).textContent = `${d.toLocaleString("en-US")} days ${h}h ${mi}m ${s}s until 1 January ${m}`; };
  tick(); window.__thrTick = setInterval(tick, 1000);
}

function dial(host) {
  const S = store.get("dial", { cap: 70, safe: 35, coord: 25, open: 40, voice: 45 });
  const L = [["cap", "Capability growth", "How fast frontier AI is improving.", 1], ["safe", "Safety progress", "Alignment, interpretability and control that actually works.", -1], ["coord", "Coordination", "Labs and countries agreeing on limits and testing.", -1], ["open", "Transparency", "Labs sharing what they find, including bad news.", -0.6], ["voice", "Public pressure", "People asking leaders for safety.", -0.5]];
  const zones = [["Calm", "#84cc16", "Safety is keeping pace. Keep watching, keep building."], ["Watch", "#14b8a6", "Capability is ahead of safety, but the gap is manageable."], ["Warning", "#f59e0b", "The gap is growing. This is where pressure for rules matters most."], ["Critical", "#ef4444", "We would be deploying what we cannot check. Slow down."]];
  host.innerHTML = `<div class="calc"><div class="card"><div class="eyebrow">Inputs</div><p class="muted" style="font-size:14px;margin:8px 0 16px">Set each lever to where you think the world is today. The needle shows the balance. This is a way to talk about the situation, not a measurement of it.</p>
    ${L.map(([k, n, d]) => `<div class="slider" style="margin-bottom:16px"><label for="d-${k}">${n} <output id="do-${k}">${S[k]}</output></label><p>${d}</p><input type="range" id="d-${k}" data-k="${k}" min="0" max="100" value="${S[k]}"></div>`).join("")}</div>
    <aside class="card out dial"><svg viewBox="0 0 400 250" role="img" aria-label="Risk dial"><defs><linearGradient id="dg" x1="0" x2="1"><stop offset="0" stop-color="#84cc16"/><stop offset=".35" stop-color="#14b8a6"/><stop offset=".65" stop-color="#f59e0b"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>
      <path d="M40 200 A160 160 0 0 1 360 200" fill="none" stroke="url(#dg)" stroke-width="26" stroke-linecap="round"/>
      ${Array.from({ length: 21 }, (_, i) => { const a = Math.PI - (i / 20) * Math.PI; const r1 = 128, r2 = i % 5 ? 136 : 142; return `<line x1="${200 + Math.cos(a) * r1}" y1="${200 - Math.sin(a) * r1}" x2="${200 + Math.cos(a) * r2}" y2="${200 - Math.sin(a) * r2}" stroke="var(--muted)" stroke-width="${i % 5 ? 1 : 2}"/>`; }).join("")}
      <g class="needle" id="needle"><path d="M200 200 L196 70 L200 58 L204 70 Z" fill="var(--text)"/><circle cx="200" cy="200" r="14" fill="var(--text)"/><circle cx="200" cy="200" r="6" fill="var(--bg)"/></g></svg>
      <div class="big-num" id="dz" style="font-size:48px;margin-top:-10px">Watch</div><p id="dt" class="muted" style="margin:8px 0 0"></p></aside></div>`;
  function upd() {
    let x = 0; L.forEach(([k, , , w]) => { const v = +$(`#d-${k}`, host).value; S[k] = v; x += w * (v - 50) / 50; $(`#do-${k}`, host).textContent = v; $(`#d-${k}`, host).style.setProperty("--p", `${v}%`); });
    store.set("dial", S);
    const t = clamp(0.5 + x / 6, 0, 1);
    $("#needle", host).style.transform = `rotate(${-90 + t * 180}deg)`;
    const z = zones[Math.min(3, Math.floor(t * 4))];
    $("#dz", host).textContent = z[0]; $("#dz", host).style.color = z[1]; $("#dt", host).textContent = z[2];
  }
  $$("input[type=range]", host).forEach((r) => r.addEventListener("input", upd));
  upd();
}

function gauges(ppl, forecasts) {
  const pd = ppl.map((p) => p.pd).filter((x) => x != null).sort((a, b) => a - b);
  const med = pd.length ? pd[Math.floor(pd.length / 2)] : 0;
  const hi = pd.filter((x) => x >= 10).length;
  const yrs = forecasts.map((f) => +String(f.year || f.median || f.agi_year || "").match(/\d{4}/)?.[0]).filter(Boolean);
  const by30 = yrs.filter((y) => y <= 2030).length;
  const G = [
    [med / 100, `${med < 1 ? med.toFixed(2) : Math.round(med)}%`, "Median stated p(doom)", "#ef4444"],
    [pd.length ? hi / pd.length : 0, `${hi} of ${pd.length}`, "Put the risk at 10% or more", "#f59e0b"],
    [ppl.length ? pd.length / ppl.length : 0, `${pd.length} of ${ppl.length}`, "Researchers who gave a number", "#22d3ee"],
    [yrs.length ? by30 / yrs.length : 0, `${by30} of ${yrs.length}`, "Forecasts with AGI by 2030", "#84cc16"],
  ];
  return `<div class="gauges">${G.map(([v, b, s, c]) => `<div class="card gauge" data-v="${Math.max(0, Math.min(1, v)).toFixed(3)}"><svg viewBox="0 0 200 116" aria-hidden="true"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--surface-3)" stroke-width="12" stroke-linecap="round"/><path class="arc" d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="${(251.3 * (1 - v)).toFixed(1)}"/><g class="ndl" style="transform:rotate(${-90 + 180 * v}deg)"><line x1="100" y1="100" x2="100" y2="34" stroke="var(--text)" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="100" r="7" fill="var(--text)"/></g></svg><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join("")}</div>`;
}
