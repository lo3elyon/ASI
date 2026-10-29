import { $, $$, esc, load, pageHero, store, ICON, toast } from "../util.js";
import { mount as mount3 } from "../views3/prepare3.js";

const GROUPC = { learn: ["Learn", "#22d3ee"], career: ["Career", "#3b82f6"], advocacy: ["Speak up", "#84cc16"], resilience: ["Resilience", "#f59e0b"], mindset: ["Mindset", "#14b8a6"] };
const RISKC = { misuse: "#f59e0b", misalignment: "#ef4444", "loss-of-control": "#ef4444", "concentration-of-power": "#3b82f6", bio: "#84cc16", cyber: "#22d3ee", race: "#f59e0b" };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "source"; } };

export async function render(el) {
  const d = await load("catastrophe-prep.json", {});
  const risks = d.risk_categories || [], props = d.proposals || [], acts = d.what_you_can_do || [];
  const items = acts.flatMap((a) => (a.steps || []).map((s, i) => ({ id: `${a.id}:${i}`, a, s })));
  const done = () => store.get("prep", {});

  el.innerHTML = `${pageHero({ img: "cover-prepare", eyebrow: "Prepare", title: "Calm hands. <span class='serif gt-ember'>Open eyes.</span>", lead: esc(d.intro || "Most experts do not think disaster is certain. Preparing is how we make it less likely, and how we stay steady if things get hard.") + (d.intro_source ? ` <a href="${esc(d.intro_source)}" target="_blank" rel="noopener">Source ${ICON.ext}</a>` : "") })}
  <section class="section tight"><div class="wrap">
    <div class="grid" style="grid-template-columns:1fr 260px;align-items:center;gap:28px" id="intro">
      <div><div class="eyebrow">Before anything else</div><h2 style="margin-top:10px">Take one slow breath.</h2><p class="lead">This page is about real risks, written without panic. Fear is a signal that you care. Here we turn it into understanding, then into a few small actions you can actually take this week.</p></div>
      <div class="breathe" aria-hidden="true">BREATHE</div>
    </div>
  </section>
  <section class="section tight"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">Know the risks</div><h2>Seven ways it <span class="serif">could go wrong.</span></h2><p class="lead">Researchers group the dangers into a few families. Pick one to see examples and what the evidence says, in the sources' own words.</p></div></div>
    <div class="risk-tabs" role="tablist" id="rt">${risks.map((r, i) => `<button class="chip ${i ? "" : "on"}" role="tab" aria-selected="${!i}" type="button" data-r="${r.id}" style="--accent:${RISKC[r.id] || "#22d3ee"}">${esc(r.name)}</button>`).join("")}</div>
    <div id="rp"></div>
  </div></section>
  <section class="section tight"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">What labs and governments do</div><h2>${props.length} safeguards <span class="serif">on the table.</span></h2><p class="lead">None of these is enough alone. Each card says who is behind it and where it falls short.</p></div></div>
    <div class="grid g3">${props.map((p, i) => `<article class="card hov spot rv d${i % 3}" style="display:flex;flex-direction:column;gap:10px"><span class="tag">${esc(p.who || "")}</span><h3 style="margin:4px 0 0;font-size:20px">${esc(p.name)}</h3><p>${esc(p.simple || "")}</p>
      ${(p.evidence || []).slice(0, 1).map((e) => `<p class="serif" style="font-size:18px;color:var(--text);margin:4px 0 0">&ldquo;${esc(e.text)}&rdquo; <a href="${esc(e.url)}" target="_blank" rel="noopener" style="font-family:var(--f-body);font-size:12.5px">${esc(host(e.url))} ${ICON.ext}</a></p>`).join("")}
      ${p.limits ? `<p class="disclaimer" style="margin-top:auto">${esc(p.limits)}</p>` : ""}</article>`).join("")}</div>
  </div></section>
  <section class="section tight" id="plan"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">What you can do</div><h2>Your personal <span class="serif">checklist.</span></h2><p class="lead">Small, real steps. Tick them off as you go. Progress is saved only in your browser.</p></div>
      <div style="min-width:240px"><div class="row" style="justify-content:space-between"><span class="count" id="pc"></span><button class="btn sm ghost" type="button" id="reset">Reset</button></div><div class="meter" style="margin-top:8px"><i id="pm"></i></div></div></div>
    <div class="chips" style="margin-bottom:18px" id="gf"><button class="chip on" type="button" data-g="all">All</button>${Object.entries(GROUPC).filter(([g]) => acts.some((a) => a.group === g)).map(([g, [l, c]]) => `<button class="chip" type="button" data-g="${g}" style="--accent:${c}">${l}</button>`).join("")}</div>
    <div class="grid g2" id="acts"></div>
  </div></section>
  <section class="section tight"><div class="wrap"><div class="callout"><div><div class="eyebrow">If it feels heavy</div><h3 style="margin:8px 0">You do not have to carry this alone.</h3><p class="muted" style="margin:0">Read the short lesson on staying steady, talk to someone you trust, and if worry is affecting your sleep or daily life, please speak to a counsellor.</p></div><a class="btn" href="#/learn/u6/steady">Staying steady ${ICON.arrow}</a></div>
    ${d.note ? `<p class="muted" style="font-size:13px;margin-top:18px">${esc(d.note)}</p>` : ""}</div></section>`;

  const intro = $("#intro", el); const mq = matchMedia("(max-width: 700px)"); const lay = () => (intro.style.gridTemplateColumns = mq.matches ? "1fr" : "1fr 260px"); lay(); mq.addEventListener("change", lay);

  function risk(id) {
    const r = risks.find((x) => x.id === id); if (!r) return; const c = RISKC[r.id] || "#22d3ee";
    $("#rp", el).innerHTML = `<div class="risk-panel" style="--c:${c}">
      <div class="card" style="border-color:color-mix(in srgb,${c} 40%,var(--line))"><span class="tag" style="--c:${c}">${esc(r.name)}</span><p style="font-size:18px;color:var(--text);margin-top:14px">${esc(r.simple)}</p></div>
      <div class="card"><div class="eyebrow">Examples</div><ul style="margin-top:12px">${(r.examples || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="card"><div class="eyebrow">What the evidence says</div>${(r.evidence || []).map((e) => `<figure class="quote" style="margin-top:14px;border-color:${c}"><blockquote style="font-size:18px">&ldquo;${esc(e.text)}&rdquo;</blockquote><cite><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(host(e.url))} ${ICON.ext}</a></cite></figure>`).join("")}</div></div>`;
  }
  $$("#rt [data-r]", el).forEach((b) => b.onclick = () => { $$("#rt [data-r]", el).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); }); risk(b.dataset.r); });
  if (risks[0]) risk(risks[0].id);

  let g = "all";
  function paint() {
    const dn = done();
    $("#acts", el).innerHTML = acts.filter((a) => g === "all" || a.group === g).map((a) => { const [l, c] = GROUPC[a.group] || [a.group, "#22d3ee"]; return `<div class="card" style="--c:${c}"><div class="row" style="justify-content:space-between"><span class="tag" style="--c:${c}">${esc(l)}</span>${a.source_url ? `<a href="${esc(a.source_url)}" target="_blank" rel="noopener" style="font-size:12.5px">${esc(host(a.source_url))} ${ICON.ext}</a>` : ""}</div><h3 style="margin:12px 0 12px;font-size:19px">${esc(a.title)}</h3>
      <div class="check">${(a.steps || []).map((s, i) => { const id = `${a.id}:${i}`; return `<label class="${dn[id] ? "done" : ""}"><input type="checkbox" data-id="${id}" ${dn[id] ? "checked" : ""}><span><b>${esc(s)}</b></span></label>`; }).join("")}</div></div>`; }).join("");
    $$("#acts input", el).forEach((cb) => cb.onchange = () => { const dn2 = done(); if (cb.checked) dn2[cb.dataset.id] = Date.now(); else delete dn2[cb.dataset.id]; store.set("prep", dn2); cb.closest("label").classList.toggle("done", cb.checked); meter(); if (cb.checked && Object.keys(dn2).length === items.length) toast("Every step done. That is real preparation."); });
    meter();
  }
  function meter() { const n = items.filter((i) => done()[i.id]).length; $("#pc", el).textContent = `${n} of ${items.length} steps done`; $("#pm", el).style.width = `${(n / Math.max(1, items.length)) * 100}%`; }
  $$("#gf [data-g]", el).forEach((b) => b.onclick = () => { g = b.dataset.g; $$("#gf [data-g]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); });
  $("#reset", el).onclick = () => { if (confirm("Clear your checklist progress?")) { store.set("prep", {}); paint(); } };
  paint();
  try { await mount3(el); } catch (e) { console.warn("prepare3", e); }
  return () => mq.removeEventListener("change", lay);
}
