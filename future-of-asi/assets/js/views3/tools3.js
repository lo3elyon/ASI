/* Tools, Round 3: two new illustrative calculators (compute growth, METR task horizon), a tool gallery with art, and a "what the tools assume" block.
   Starting values and rates come from the cited pages. Results are extrapolations, labelled as illustrative. */
import { $, $$, esc, store, ICON, clamp } from "../util.js";
import { pic, sec, src, fx3 } from "./kit.js";

export const NEW_TABS = [["compute", "Compute growth"], ["horizon", "Task horizon"]];
export const GALLERY = [
  ["pdoom", "p(doom) calculator", "Carlsmith's six step chain with your own numbers.", "tool-pdoom", "A chain of six glass links fading from teal to amber to red", "red"],
  ["timelines", "AGI timeline forecaster", "Sourced forecasts on one axis, plus your own guess.", "tool-timelines", "An antique brass astronomical clock glowing blue and amber", "blue"],
  ["dial", "Risk dial", "Five levers and one needle for talking about the balance.", "tool-dial", "An industrial control dial lit with a teal to red arc", "amber"],
  ["compute", "Compute growth", "Grow training compute from a sourced starting point at a sourced rate.", "tool-compute", "A hall of glowing server racks receding into the distance", "cyan"],
  ["horizon", "Task horizon", "Extend METR's task length trend and see where it lands.", "tool-horizon", "A runway at night with lights stretching toward a faint dawn", "lime"],
];
const EPOCH = "https://epoch.ai/blog/training-compute-of-frontier-ai-models-grows-by-4-5x-per-year";
const METR = "https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/";
const sup = (e) => { const m = Math.floor(e); const f = Math.pow(10, e - m); return `${f.toFixed(1)} × 10<sup>${m}</sup>`; };
const human = (min) => { if (min < 60) return `${min.toFixed(min < 10 ? 1 : 0)} minutes`; const h = min / 60; if (h < 40) return `${h.toFixed(h < 10 ? 1 : 0)} hours`; const wk = h / 40; if (wk < 4.3) return `${wk.toFixed(1)} work weeks`; const mo = wk / 4.33; if (mo < 12) return `${mo.toFixed(1)} work months`; return `${(mo / 12).toFixed(1)} work years`; };

export function gallery() {
  return sec({ id: "t3gal", eyebrow: "The toolbox", title: "Five instruments for your own judgment.", cat: "red", motif: "bench", body: `
    <div class="t3-gal" data-m3-stagger="60">${GALLERY.map(([id, n, d, img, alt, c]) => `<a class="t3-tool card-glow m3-spot" href="#/tools/${id}" data-cat="${c}" data-m3="up" data-v3-tiltimg><div class="im">${pic(img, alt)}</div><div class="tx"><h3>${esc(n)}</h3><p>${esc(d)}</p><span class="go">Open ${ICON.arrow}</span></div></a>`).join("")}</div>` });
}
export function assumptions() {
  return sec({ id: "t3asm", eyebrow: "Read me first", title: "What these tools assume.", cat: "red", body: `
    <div class="t3-asm" data-m3-stagger="60">
      <div data-m3="up"><b>They are not forecasts.</b><p>Every tool takes your inputs and does simple arithmetic. The point is to see your own assumptions, not to learn the future.</p></div>
      <div data-m3="up"><b>Trends can bend.</b><p>Compute and task length have grown along straight lines on a log chart for years. Data, energy, money or new methods can bend those lines either way.</p></div>
      <div data-m3="up"><b>Definitions differ.</b><p>AGI, superintelligence and p(doom) mean different things to different people. Read the source before comparing two numbers.</p></div>
      <div data-m3="up"><b>Nothing leaves your browser.</b><p>Your slider positions are saved in local storage on this device only.</p></div>
    </div>` });
}
/* The sourced inputs the calculators start from, in one place */
export function numbers() {
  const N = [
    ["4 to 5x", "a year", "Growth in training compute of frontier models, 2010 to May 2024.", EPOCH, "Epoch AI", "cyan"],
    ["2 × 10^25", "FLOP", "Epoch AI's estimate of the compute used to train GPT-4 (2023).", EPOCH, "Epoch AI", "teal"],
    ["7", "months", "How often the length of tasks AI agents can finish (50% reliability) doubled over six years.", METR, "METR, March 2025", "lime"],
    ["About 1", "hour", "The task length Claude 3.7 Sonnet could finish at 50% reliability in METR's study.", METR, "METR, March 2025", "amber"],
  ];
  return sec({ id: "t3num", eyebrow: "The numbers inside", title: "Four sourced numbers the calculators start from.", cat: "red", lead: "Change any slider you like, but this is where the defaults come from. Open the source to check the context.", body: `
    <div class="t3-nums" data-m3-stagger="80">${N.map(([v, u, d, url, by, c]) => `<div class="t3-num card-glow" data-cat="${c}" data-m3="up"><b>${esc(v).replace("10^25", "10<sup>25</sup>")}</b><span class="u">${esc(u)}</span><p>${esc(d)}</p>${src(url, by)}</div>`).join("")}</div>` });
}
/* Where to go for the real thing */
export function elsewhere() {
  const E = [
    ["Epoch AI data", "Open datasets on compute, models and hardware, with charts you can explore.", "https://epoch.ai/data", "cyan"],
    ["METR", "Independent evaluations of what frontier AI agents can do on long tasks.", "https://metr.org/", "lime"],
    ["AI 2027", "A detailed month by month scenario of how superhuman AI could arrive, with its forecasts.", "https://ai-2027.com/", "amber"],
  ];
  return sec({ id: "t3else", eyebrow: "Go deeper", title: "The real instruments.", cat: "red", lead: "My tools are small and simple on purpose. These groups do the careful version.", body: `
    <div class="t3-else" data-m3-stagger="90">${E.map(([n, d, u, c]) => `<a class="t3-el card-glow m3-spot" data-cat="${c}" href="${u}" target="_blank" rel="noopener" data-m3="up"><b>${esc(n)}</b><p>${esc(d)}</p><span class="v3-src">${esc(u.replace(/^https:\/\//, "").replace(/\/$/, ""))}</span></a>`).join("")}</div>` });
}
export function wrap(el) {
  const box = document.createElement("div"); box.className = "v3-tools";
  box.innerHTML = gallery() + numbers() + assumptions() + elsewhere();
  el.appendChild(box);
  fx3(box);
}

export function compute(host) {
  const S = store.get("v3compute", { rate: 4.5, years: 6 });
  const start = { e: Math.log10(2e25), y: 2023.2, label: "GPT-4, estimated by Epoch AI at about 2 × 10^25 FLOP (March 2023)" };
  host.innerHTML = `<div class="calc t3-calc" data-cat="cyan"><div class="card">
    <div class="eyebrow">Illustrative calculator</div>
    <p style="margin:10px 0">Epoch AI found that the training compute of frontier models grew about <b>4 to 5 times a year</b> from 2010 to May 2024, and estimated GPT-4 at about 2 × 10<sup>25</sup> FLOP. Start from there and choose a growth rate and a number of years. ${src(EPOCH, "epoch.ai")}</p>
    <div class="slider"><label for="t3r">Growth per year <output id="t3ro"></output></label><p>Epoch's recent frontier estimate is about 4x to 5x. Below 2x would be a big slowdown.</p><input type="range" id="t3r" min="1.2" max="10" step="0.1" value="${S.rate}"></div>
    <div class="slider"><label for="t3y">Years after March 2023 <output id="t3yo"></output></label><p>How far to extend the line.</p><input type="range" id="t3y" min="1" max="15" step="1" value="${S.years}"></div>
    <svg id="t3cs" viewBox="0 0 600 260" role="img" aria-label="Illustrative compute growth curve on a log scale"></svg>
  </div>
  <aside class="card out"><div class="eyebrow" style="justify-content:center">Illustrative result</div><div class="t3-big" id="t3cv"></div><p class="muted" id="t3cw"></p><p class="disclaimer">An extrapolation of a past trend from one starting estimate. Not a prediction. Real growth depends on chips, power, money and choices.</p></aside></div>`;
  const draw = () => {
    const r = +$("#t3r", host).value, n = +$("#t3y", host).value; store.set("v3compute", { rate: r, years: n });
    $("#t3ro", host).textContent = `${r.toFixed(1)}x`; $("#t3yo", host).textContent = `${n} years`;
    [$("#t3r", host), $("#t3y", host)].forEach((x) => x.style.setProperty("--p", `${((x.value - x.min) / (x.max - x.min)) * 100}%`));
    const e = start.e + n * Math.log10(r);
    $("#t3cv", host).innerHTML = `${sup(e)} <small>FLOP</small>`;
    $("#t3cw", host).textContent = `Around ${Math.round(start.y + n)}, that is ${Math.pow(r, n) >= 1e4 ? "about 10^" + (n * Math.log10(r)).toFixed(1) : Math.round(Math.pow(r, n)).toLocaleString("en-US")} times the GPT-4 estimate.`;
    const X = (k) => 50 + (k / 15) * 530, lo = 24, hi = Math.max(32, Math.ceil(start.e + 15 * Math.log10(10))), Y = (v) => 230 - ((v - lo) / (hi - lo)) * 210;
    let d = ""; for (let k = 0; k <= n; k += 0.25) d += `${k ? "L" : "M"}${X(k).toFixed(1)},${Y(start.e + k * Math.log10(r)).toFixed(1)}`;
    const grid = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((v) => v % 2 === 0).map((v) => `<line x1="50" x2="580" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="44" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="var(--muted)" font-family="var(--f-mono)">1e${v}</text>`).join("");
    const xs = [0, 5, 10, 15].map((k) => `<text x="${X(k)}" y="252" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="var(--f-mono)">${Math.round(start.y + k)}</text>`).join("");
    $("#t3cs", host).innerHTML = `${grid}${xs}<path d="${d}" fill="none" stroke="var(--cat)" stroke-width="3" stroke-linecap="round" class="t3-path"/><circle cx="${X(0)}" cy="${Y(start.e)}" r="5" fill="var(--amber)"><title>${esc(start.label)}</title></circle><circle cx="${X(n)}" cy="${Y(e)}" r="7" fill="var(--cat)"/>`;
  };
  $$("input", host).forEach((i) => i.addEventListener("input", draw)); draw();
  fx3(host);
}

export function horizon(host) {
  const S = store.get("v3horizon", { dbl: 7, start: 60, years: 4 });
  host.innerHTML = `<div class="calc t3-calc" data-cat="lime"><div class="card">
    <div class="eyebrow">Illustrative calculator</div>
    <p style="margin:10px 0">METR measured how long a task (timed on skilled humans) AI agents can finish with 50% reliability. In March 2025 it found this length had doubled about <b>every 7 months</b> for six years, with Claude 3.7 Sonnet at about <b>one hour</b>. METR says the trend is roughly 1 to 4 doublings a year, and a later update exists. ${src(METR, "metr.org")}</p>
    <div class="slider"><label for="t3d">Doubling time <output id="t3do"></output></label><p>METR's headline was about 7 months. Its SWE-bench check showed under 3 months.</p><input type="range" id="t3d" min="3" max="14" step="1" value="${S.dbl}"></div>
    <div class="slider"><label for="t3s">Starting horizon in minutes <output id="t3so"></output></label><p>One hour matches the March 2025 example. Change it if you trust a newer number.</p><input type="range" id="t3s" min="5" max="480" step="5" value="${S.start}"></div>
    <div class="slider"><label for="t3n">Years after March 2025 <output id="t3no"></output></label><input type="range" id="t3n" min="1" max="8" step="0.5" value="${S.years}"></div>
    <div class="t3-steps" id="t3hs" aria-live="polite"></div>
  </div>
  <aside class="card out"><div class="eyebrow" style="justify-content:center">Illustrative result</div><div class="t3-big" id="t3hv"></div><p class="muted" id="t3hw"></p><p class="disclaimer">An extrapolation, not a forecast. METR notes that most of its uncertainty is about whether the trend continues and whether lab tasks match real work.</p></aside></div>`;
  const draw = () => {
    const dbl = +$("#t3d", host).value, st = +$("#t3s", host).value, n = +$("#t3n", host).value; store.set("v3horizon", { dbl, start: st, years: n });
    $("#t3do", host).textContent = `${dbl} months`; $("#t3so", host).textContent = human(st); $("#t3no", host).textContent = `${n} years`;
    $$("input", host).forEach((x) => x.style.setProperty("--p", `${((x.value - x.min) / (x.max - x.min)) * 100}%`));
    const k = (n * 12) / dbl, v = st * Math.pow(2, k);
    $("#t3hv", host).textContent = human(v);
    $("#t3hw", host).textContent = `${k.toFixed(1)} doublings by about ${(2025.2 + n).toFixed(0)}, at 50% reliability, on METR style software tasks.`;
    const marks = [["1 hour", 60], ["1 work day", 480], ["1 work week", 2400], ["1 work month", 10400], ["1 work year", 124800]];
    $("#t3hs", host).innerHTML = marks.map(([l, m]) => { const mo = m <= st ? 0 : Math.log2(m / st) * dbl; const yr = 2025.2 + mo / 12; const hit = mo / 12 <= n; return `<div class="${hit ? "hit" : ""}" style="--w:${clamp((mo / 12 / 8) * 100, 2, 100)}%"><span>${l}</span><i></i><b>${m <= st ? "already" : `about ${Math.floor(yr)}`}</b></div>`; }).join("");
  };
  $$("input", host).forEach((i) => i.addEventListener("input", draw)); draw();
  fx3(host);
}
