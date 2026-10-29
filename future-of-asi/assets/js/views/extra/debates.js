/* Debates: the big disagreements, both sides in their own sourced words, a vote on each, and where you land. Deep link: #/debates/<id> */
import { X, people, hero, sec, band, tocBar, ext, pchip, anim, bag, $, $$, esc, RM, ICON, store } from "./_kit.js";
import { avatar, parsePdoom, toast } from "../../util.js";

const SHORT = { timelines: "Timelines", takeoff: "Takeoff", control: "Control", pause: "Pause", pdoom: "p(doom)", normal: "Normal tech", open: "Open weights" };
const SCALE = ["Strongly side A", "Lean A", "Not sure", "Lean B", "Strongly side B"];

export async function render(el, params) {
  const B = bag();
  const [D, P] = await Promise.all([X("debates.json"), people()]);
  const debates = D.debates || [];
  const votes = store.get("x:debates:votes", {});
  const allQ = debates.flatMap((d) => [...d.a.quotes, ...d.b.quotes]);
  const ppl = new Set(allQ.map((q) => q.rid));
  const pd = (D.pdoom || []).map((x) => ({ ...x, v: parsePdoom(x.pdoom) })).filter((x) => x.v != null);

  const qcard = (q) => { const p = P.byId[q.rid] || { id: q.rid, name: q.name }; return `<figure class="x-quote card" data-m3="up"><blockquote>${esc(q.text)}</blockquote><figcaption><a href="#/researchers/${esc(q.rid)}" data-person="${esc(q.rid)}" class="x-qwho">${avatar(p, "avatar x-av")}<span><b>${esc(q.name)}</b><small>${esc([q.role, q.org].filter(Boolean).join(", "))}</small></span></a><span class="x-qsrc">${esc(q.source || "")}${q.date ? `, ${esc(q.date)}` : ""} ${ext(q.url, "Source")}</span></figcaption></figure>`; };
  const sideHtml = (s, k) => `<div class="x-side x-side-${k}"><div class="x-side-h"><span class="x-side-k mono">${k.toUpperCase()}</span><h3>${esc(s.label)}</h3><p>${esc(s.blurb)}</p></div>${s.quotes.map(qcard).join("")}${s.refs.length ? `<div class="x-refs">${s.refs.map((r) => ext(r.u, r.t)).join("")}</div>` : ""}${!s.quotes.length ? `<p class="muted" style="font-size:14px">No exact quote from the people profiled here makes this case yet, so this side is my summary of the linked sources.</p>` : ""}</div>`;
  const voteHtml = (d) => `<div class="x-vote card" data-vote="${d.id}"><div class="x-vote-h"><b>Where do you stand?</b><span class="mono" data-vl>${votes[d.id] != null ? esc(SCALE[votes[d.id]]) : "Not voted yet"}</span></div>
    <div class="x-vote-scale" role="radiogroup" aria-label="Your view on: ${esc(d.q)}">${SCALE.map((s, i) => `<button type="button" role="radio" aria-checked="${votes[d.id] === i}" data-v="${i}" title="${esc(s)}"><span>${i === 0 ? esc(d.a.label) : i === 4 ? esc(d.b.label) : i === 2 ? "Not sure" : ""}</span></button>`).join("")}</div><div class="x-vote-r" data-vr></div></div>`;

  el.innerHTML = `${hero({ img: "debates", eyebrow: "Debates", title: `The big <span class="serif gt">disagreements.</span>`, lead: "Smart, informed people disagree about how fast AI will move, whether we can control it and what to do. Here are both sides in their own words, every quote copied exactly from its source. Vote on each, then see where you land.", stats: [[debates.length, "debates"], [allQ.length, "sourced quotes"], [ppl.size, "people quoted"], [pd.length, "p(doom) numbers"]] })}
  ${debates.map((d, i) => sec(`d-${d.id}`, i + 1, SHORT[d.id] || d.id, esc(d.q), esc(d.why),
    `<div class="x-debate" data-m3="fade"><div class="x-sides">${sideHtml(d.a, "a")}<div class="x-vs" aria-hidden="true"><span>vs</span></div>${sideHtml(d.b, "b")}</div>${voteHtml(d)}</div>
     ${d.pdoom ? `<div class="card x-pd" data-m3="up"><h3>The spread of p(doom)</h3><p class="muted">Each dot is one person's stated chance of AI catastrophe, as listed on their profile with a source. Ranges are shown at their midpoint. Drag the white dot to add yours.</p><div class="x-pd-line" id="pdline">${pd.map((x) => `<a class="x-pd-dot" href="#/researchers/${x.rid}" data-person="${x.rid}" style="--x:${pos(x.v)}%" title="${esc(x.name)}: ${esc(x.pdoom)}"><span>${esc(x.name.split(" ").slice(-1)[0])}</span></a>`).join("")}<button type="button" class="x-pd-you" id="pdyou" aria-label="Your p(doom)" style="--x:${pos(store.get("x:debates:pd", 10))}%"></button></div><div class="x-pd-axis mono"><span>0.01%</span><span>1%</span><span>10%</span><span>50%</span><span>99%</span></div><p class="x-pd-val" id="pdval"></p><input type="range" class="x-range" id="pdr" min="0" max="1000" value="${Math.round(pos(store.get("x:debates:pd", 10)) * 10)}" aria-label="Set your p(doom)"></div>` : ""}`)).join("")}
  ${band("debates-scale", "Weighing both sides is a skill. The goal is not to win, it is to be less wrong.")}
  ${sec("land", debates.length + 1, "Where you land", "Your <span class='serif'>map.</span>", "Your votes across every debate, and the people who said the closest thing to what you think.", `<div id="landbox"></div>`)}
  ${sec("well", debates.length + 2, "Disagree well", "How to argue about <span class='serif'>AI</span> without a fight.", "",
    `<div class="grid g3" data-m3-stagger="80">${[["Find the crux", "Ask what fact, if you learned it, would change your mind. Most disagreements come down to one or two of these."], ["Put a number on it", "Words like likely mean different things to different people. A rough percentage makes it clear."], ["Steelman the other side", "Say their view so well they would agree with your summary, before you argue with it."], ["Separate how fast from how bad", "Someone can expect slow progress and still worry a lot, or the reverse."], ["Update in public", "Say when evidence moves you. It makes it easier for others to do the same."], ["Stay kind", "Everyone here wants the future to go well. They disagree about how."]].map(([t, d]) => `<div class="card card-glow" data-m3="up"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("")}</div>`)}`;
  B.add(tocBar(el));
  function pos(v) { const lo = Math.log10(0.01), hi = Math.log10(99.9); return Math.max(0, Math.min(100, ((Math.log10(Math.max(0.01, Math.min(99.9, v))) - lo) / (hi - lo)) * 100)); }
  function unpos(p) { const lo = Math.log10(0.01), hi = Math.log10(99.9); return Math.pow(10, lo + (p / 100) * (hi - lo)); }

  function result(d) {
    const v = votes[d.id]; const box = $(`[data-vote="${d.id}"]`, el); if (!box) return;
    $("[data-vl]", box).textContent = v != null ? SCALE[v] : "Not voted yet";
    $$("[data-v]", box).forEach((b) => b.setAttribute("aria-checked", +b.dataset.v === v));
    const r = $("[data-vr]", box);
    if (v == null) { r.innerHTML = ""; return; }
    const side = v < 2 ? d.a : v > 2 ? d.b : null;
    const near = side ? [...new Set(side.quotes.map((q) => q.rid))].map((id) => P.byId[id]).filter(Boolean) : [];
    r.innerHTML = side ? `<p>You are closest to <b>${esc(side.label.toLowerCase())}</b>.${near.length ? " People on this side:" : ""}</p>${near.length ? `<div class="x-pchips">${near.map((p) => pchip(p)).join("")}</div>` : ""}` : `<p>Not sure is an honest place to be. Read the sources on both sides, and come back.</p>`;
  }
  function land() {
    const n = debates.filter((d) => votes[d.id] != null).length;
    const box = $("#landbox", el);
    if (!n) { box.innerHTML = `<div class="card"><p class="muted">Vote on a debate above and your map appears here.</p></div>`; return; }
    const near = {}; debates.forEach((d) => { const v = votes[d.id]; if (v == null || v === 2) return; (v < 2 ? d.a : d.b).quotes.forEach((q) => (near[q.rid] = (near[q.rid] || 0) + (v === 0 || v === 4 ? 2 : 1))); });
    const top = Object.entries(near).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => P.byId[id]).filter(Boolean);
    const caution = ["control", "pause", "pdoom", "normal", "timelines", "takeoff", "open"].reduce((s, k) => { const v = votes[k]; if (v == null) return s; const towardA = 2 - v; return s + (k === "open" || k === "normal" ? -towardA : k === "control" || k === "pdoom" || k === "pause" || k === "timelines" || k === "takeoff" ? towardA : 0); }, 0);
    const label = caution >= 4 ? "Deeply cautious" : caution >= 1 ? "Cautious" : caution <= -4 ? "Confident builder" : caution <= -1 ? "Optimistic" : "In the middle";
    box.innerHTML = `<div class="grid g2"><div class="card" data-m3="up"><div class="eyebrow">${n} of ${debates.length} answered</div><h3 class="x-land-l">${esc(label)}</h3>${debates.map((d) => { const v = votes[d.id]; return `<div class="x-land-row"><span>${esc(d.q)}</span><span class="x-land-bar"><i style="--p:${v == null ? 50 : v * 25}%" class="${v == null ? "na" : ""}"></i></span></div>`; }).join("")}<p class="muted" style="font-size:13px;margin-top:10px">Left means side A, right means side B. This label is a playful summary of your votes, not a score.</p></div>
      <div class="card" data-m3="up"><h3>People who said the closest thing to you</h3><div class="x-pchips">${top.map((p) => pchip(p)).join("") || `<p class="muted">Pick a side somewhere to see people here.</p>`}</div><div class="row" style="margin-top:18px"><button class="btn sm" type="button" id="copyland">Copy my map</button><button class="btn sm ghost" type="button" id="clearland">Clear my votes</button></div></div></div>`;
    B.add(anim(box));
  }
  debates.forEach(result); land();
  // p(doom) slider
  const pdr = $("#pdr", el), you = $("#pdyou", el), pdv = $("#pdval", el);
  const setPd = (p) => { const v = unpos(p); you.style.setProperty("--x", p + "%"); pdv.textContent = `Your number: ${v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v)}%. ${pd.filter((x) => x.v < v).length} of ${pd.length} people listed here gave a lower number.`; store.set("x:debates:pd", v); };
  if (pdr) { setPd(+pdr.value / 10); pdr.addEventListener("input", () => setPd(+pdr.value / 10)); }
  if (you) { let dn = false; const line = $("#pdline", el); you.addEventListener("pointerdown", (e) => { dn = true; you.setPointerCapture(e.pointerId); }); you.addEventListener("pointermove", (e) => { if (!dn) return; const r = line.getBoundingClientRect(); const p = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)); pdr.value = Math.round(p * 10); setPd(p); }); you.addEventListener("pointerup", () => (dn = false)); you.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); pdr.value = Math.max(0, Math.min(1000, +pdr.value + (e.key === "ArrowRight" ? 20 : -20))); setPd(+pdr.value / 10); } }); }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]"); if (b) { const id = b.closest("[data-vote]").dataset.vote; const v = +b.dataset.v; votes[id] = votes[id] === v ? undefined : v; if (votes[id] === undefined) delete votes[id]; store.set("x:debates:votes", votes); result(debates.find((d) => d.id === id)); land(); return; }
    if (e.target.closest("#clearland")) { Object.keys(votes).forEach((k) => delete votes[k]); store.set("x:debates:votes", votes); debates.forEach(result); land(); return; }
    if (e.target.closest("#copyland")) { const txt = `My AI debates map on Threshold:\n${debates.map((d) => `${d.q} ${votes[d.id] != null ? SCALE[votes[d.id]].replace("side A", d.a.label).replace("side B", d.b.label).replace(/\bLean A\b/, "Lean " + d.a.label).replace(/\bLean B\b/, "Lean " + d.b.label) : "Not answered"}`).join("\n")}\nhttps://lo3elyon.github.io/ASI/future-of-asi/#/debates`; navigator.clipboard?.writeText(txt).then(() => toast("Copied your map."), () => toast("Copy did not work in this browser.")); }
  });
  const go = (id) => { const t = $(`#d-${id}`, el); if (t) setTimeout(() => window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 100, behavior: RM() ? "auto" : "smooth" }), 120); };
  if (params[0]) go(params[0]);
  el._onParams = (p) => p[0] && go(p[0]);
  return () => B.run();
}
