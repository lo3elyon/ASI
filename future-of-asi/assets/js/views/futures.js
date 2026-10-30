import { $, $$, esc, load, pageHero, toast, ICON } from "../util.js";
import { mount as mount3 } from "../views3/futures3.js";

const PRESETS = [
  ["Today, roughly", null],
  ["All gas", { race: 92, takeoff: 85, align: 25, control: 25, coord: 10, aware: 30 }],
  ["Global pause", { race: 20, takeoff: 30, align: 50, control: 55, coord: 90, aware: 85 }],
  ["Labs get serious", { race: 55, takeoff: 60, align: 60, control: 90, coord: 40, aware: 50 }],
  ["Open everything", { race: 65, takeoff: 30, align: 40, control: 25, coord: 20, aware: 60 }],
];
const ORDER = ["flourishing", "slowdown", "controlled", "multipolar", "race", "catastrophe"];
const MID = { flourishing: 0, slowdown: 0, controlled: 1, multipolar: 2, race: 2, catastrophe: 2 };
const MIDL = ["Coordinate", "Control", "Compete"];

export async function render(el, params, query) {
  const data = await load("futures.json", {});
  const sliders = data.sliders || [], scen = data.scenarios || [];
  const byId = Object.fromEntries(scen.map((s) => [s.id, s]));
  const vals = Object.fromEntries(sliders.map((s) => [s.id, s.value]));
  const def = { ...vals };
  const fromQ = (query.get("s") || "").split(",").map(Number);
  if (fromQ.length === sliders.length && fromQ.every((n) => n >= 0 && n <= 100)) sliders.forEach((s, i) => (vals[s.id] = fromQ[i]));
  let selected = byId[params[0]] ? params[0] : null;

  el.innerHTML = `${pageHero({ img: "cover-futures", eyebrow: "Futures explorer", title: "Six futures. <span class='serif gt'>One fork.</span>", lead: "Move the levers on the left. Watch which futures grow and which fade, then open any branch to walk its timeline from 2026 to 2040." })}
  <section class="section tight"><div class="wrap">
    <p class="disclaimer" style="margin-bottom:24px">${esc(data.note || "")}</p>
    <div class="fut-layout">
      <aside class="card sliders" aria-label="Levers">
        <div class="row" style="justify-content:space-between"><h3 style="margin:0">The levers</h3><button class="btn sm ghost" id="share" type="button">Copy link</button></div>
        <div class="chips" role="group" aria-label="Presets">${PRESETS.map((p, i) => `<button class="chip" type="button" data-p="${i}">${p[0]}</button>`).join("")}</div>
        ${sliders.map((s) => `<div class="slider"><label for="sl-${s.id}">${esc(s.label)} <output id="o-${s.id}">${vals[s.id]}</output></label><p>${esc(s.help)}</p><input type="range" min="0" max="100" value="${vals[s.id]}" id="sl-${s.id}" data-k="${s.id}"></div>`).join("")}
      </aside>
      <div style="display:grid;gap:22px;min-width:0">
        <div class="card"><div class="sec-head" style="margin-bottom:14px"><div><div class="eyebrow">Branch map</div><h3 style="margin:6px 0 0">Where the levers push us</h3></div><span class="count" id="topline"></span></div>
          <div class="branch" id="branch" role="group" aria-label="Branching diagram of six futures"></div>
          <div class="scen-bars" id="bars"></div>
        </div>
        <div class="card" id="detail" aria-live="polite"></div>
      </div>
    </div>
  </div></section>`;

  const probs = () => {
    const sc = scen.map((s) => Object.entries(s.weights || {}).reduce((a, [k, w]) => a + w * ((vals[k] - 50) / 50), 0) * 1.15);
    const m = Math.max(...sc); const ex = sc.map((x) => Math.exp(x - m)); const z = ex.reduce((a, b) => a + b, 0);
    return Object.fromEntries(scen.map((s, i) => [s.id, 0.9 * (ex[i] / z) + 0.1 / scen.length]));
  };

  function drawBranch(P) {
    const W = 820, H = 380, rootX = 40, rootY = H / 2, midX = 280, leafX = 640;
    const leafY = (i) => 36 + i * ((H - 72) / 5);
    const midY = [leafY(0.5), leafY(2), leafY(4)];
    const midP = [0, 0, 0]; ORDER.forEach((id) => (midP[MID[id]] += P[id] || 0));
    const wv = (p) => 2 + p * 34;
    let out = `<svg viewBox="0 0 ${W} ${H + 30}">`;
    [["2026", rootX], ["2028", midX], ["2040", leafX]].forEach(([t, x]) => (out += `<text x="${x}" y="${H + 22}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="var(--muted)">${t}</text>`));
    midY.forEach((y, i) => {
      const d = `M${rootX},${rootY} C${rootX + 140},${rootY} ${midX - 140},${y} ${midX},${y}`;
      out += `<path class="b" d="${d}" stroke="var(--line-2)" stroke-width="${wv(midP[i])}" opacity="${0.35 + midP[i]}"/><path class="b flow" d="${d}" stroke="var(--text)" stroke-width="1.5" opacity=".45"/>`;
    });
    ORDER.forEach((id, i) => {
      const s = byId[id]; if (!s) return; const y = leafY(i), m = MID[id], p = P[id] || 0;
      const d = `M${midX},${midY[m]} C${midX + 160},${midY[m]} ${leafX - 160},${y} ${leafX},${y}`;
      out += `<path class="b" d="${d}" stroke="${s.c}" stroke-width="${wv(p)}" opacity="${0.25 + p * 1.6}" style="filter:drop-shadow(0 0 ${4 + p * 20}px ${s.c})"/><path class="b flow" d="${d}" stroke="#fff" stroke-width="1.2" opacity="${0.15 + p}"/>`;
      out += `<g class="leaf" data-id="${id}" style="cursor:pointer" tabindex="0" role="button" aria-label="${esc(s.name)}, ${Math.round(p * 100)} percent"><circle cx="${leafX}" cy="${y}" r="${7 + p * 10}" fill="${s.c}" stroke="var(--bg)" stroke-width="3"/>
        <text x="${leafX + 22}" y="${y - 2}" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="15" fill="var(--text)">${esc(s.name)}</text>
        <text x="${leafX + 22}" y="${y + 15}" font-family="JetBrains Mono, monospace" font-size="11.5" fill="${s.c}">${Math.round(p * 100)}%</text></g>`;
    });
    midY.forEach((y, i) => (out += `<circle cx="${midX}" cy="${y}" r="7" fill="var(--bg)" stroke="var(--text)" stroke-width="2"/><text x="${midX}" y="${y - 16}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--text-2)" letter-spacing="1.5">${MIDL[i].toUpperCase()}</text>`));
    out += `<circle cx="${rootX}" cy="${rootY}" r="10" fill="var(--accent)"><animate attributeName="r" values="9;12;9" dur="2s" repeatCount="indefinite"/></circle><text x="${rootX}" y="${rootY - 20}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--accent)">NOW</text></svg>`;
    $("#branch", el).innerHTML = out;
    $$(".leaf", el).forEach((g) => { const go = () => select(g.dataset.id); g.addEventListener("click", go); g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }); });
  }

  function update() {
    const P = probs();
    sliders.forEach((s) => { const r = $(`#sl-${s.id}`, el); r.style.setProperty("--p", `${vals[s.id]}%`); $(`#o-${s.id}`, el).textContent = vals[s.id]; });
    drawBranch(P);
    const sorted = scen.slice().sort((a, b) => P[b.id] - P[a.id]);
    $("#bars", el).innerHTML = sorted.map((s) => `<button class="sbar ${s.id === (selected || sorted[0].id) ? "on" : ""}" type="button" data-id="${s.id}" style="--c:${s.c}"><span>${esc(s.name)}</span><span class="tr"><i style="width:${(P[s.id] * 100).toFixed(1)}%"></i></span><b>${Math.round(P[s.id] * 100)}%</b></button>`).join("");
    $$(".sbar", el).forEach((b) => b.addEventListener("click", () => select(b.dataset.id)));
    $("#topline", el).textContent = `Leading: ${sorted[0].name}`;
    if (!selected) showDetail(sorted[0].id, P);
    else showDetail(selected, P, true);
  }
  let lastShown = "";
  function showDetail(id, P, keep) {
    const s = byId[id]; if (!s) return;
    if (lastShown === id && keep) { const pb = $("#dp", el); if (pb) pb.textContent = `${Math.round(P[id] * 100)}% in this toy model`; return; }
    if (lastShown === id) { const pb = $("#dp", el); if (pb) pb.textContent = `${Math.round(P[id] * 100)}% in this toy model`; return; }
    lastShown = id;
    $("#detail", el).style.setProperty("--c", s.c);
    $("#detail", el).innerHTML = `<div class="sec-head" style="margin-bottom:16px"><div><span class="tag" style="--c:${s.c}">${esc(s.tagline)}</span><h2 style="margin:12px 0 4px;color:${s.c}">${esc(s.name)}</h2><span class="count" id="dp">${Math.round(P[id] * 100)}% in this toy model</span></div></div>
      <p class="lead" style="margin-top:0">${esc(s.summary)}</p>
      <div class="grid g2" style="margin-top:22px;align-items:start">
        <div class="ytl" style="--c:${s.c}">${s.timeline.map((t, i) => `<div class="yi" style="animation-delay:${i * 0.12}s"><div class="y">${esc(t.y)}</div><h4>${esc(t.t)}</h4><p>${esc(t.d)}</p></div>`).join("")}</div>
        <div><div class="eyebrow">Signs we are on this path</div><div class="check" style="margin-top:12px">${s.signals.map((x) => `<div class="card" style="padding:12px 16px;font-size:15px">${esc(x)}</div>`).join("")}</div>
        <div class="row" style="margin-top:18px"><a class="btn sm" href="#/tools/dial">Try the risk dial ${ICON.arrow}</a><a class="btn sm ghost" href="#/learn">Learn the levers</a></div></div>
      </div>`;
  }
  function select(id) {
    selected = id; lastShown = "";
    history.replaceState(null, "", `#/futures/${id}${location.hash.includes("?") ? "?" + location.hash.split("?")[1] : ""}`);
    update();
    if (innerWidth < 980) $("#detail", el).scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $$("input[type=range]", el).forEach((r) => r.addEventListener("input", () => { vals[r.dataset.k] = +r.value; update(); }));
  $$("[data-p]", el).forEach((b) => b.addEventListener("click", () => {
    const p = PRESETS[+b.dataset.p][1] || def; Object.assign(vals, p);
    sliders.forEach((s) => ($(`#sl-${s.id}`, el).value = vals[s.id]));
    $$("[data-p]", el).forEach((x) => x.classList.toggle("on", x === b)); selected = null; lastShown = ""; update();
  }));
  $("#share", el).addEventListener("click", () => {
    const url = `${location.href.split("#")[0]}#/futures${selected ? "/" + selected : ""}?s=${sliders.map((s) => vals[s.id]).join(",")}`;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast("Link copied. It keeps your slider settings."), () => toast(url));
  });
  el._onParams = (p) => { if (byId[p[0]] && p[0] !== selected) { selected = p[0]; lastShown = ""; update(); } };
  update();
  try { await mount3(el); } catch (e) { console.warn("futures3", e); }
}
