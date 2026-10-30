/* Careers: paths into AI safety with real programmes (opened and checked on the date shown), a path finder quiz and a 30 day plan. */
import { X, hero, sec, band, tocBar, ext, anim, bag, $, $$, esc, RM, ICON, store } from "./_kit.js";

const KIND = { course: ["Course", "#22d3ee"], bootcamp: ["Bootcamp", "#f59e0b"], research: ["Research programme", "#10b981"], fellowship: ["Fellowship", "#3b82f6"], hackathon: ["Hackathon", "#f97316"], job: ["Jobs", "#ef4444"], advice: ["Advice", "#84cc16"] };
const PLAN = [
  "Day 1: take the two hour BlueDot introduction or read the Start here path on the Papers page.",
  "Day 3: write down why you care, in five sentences, in your own language.",
  "Day 5: pick one path (technical, policy, builder or communication).",
  "Day 7: join one community: a reading group, a Discord, or a local meetup.",
  "Day 10: do one small hands on thing: an ARENA exercise, a policy summary, or an eval script.",
  "Day 14: sign up for an Apart sprint or an AI Safety Camp project.",
  "Day 20: reproduce or explain one paper in public, on a blog, GitHub or a short video.",
  "Day 25: ask one person already in the field for 20 minutes of advice.",
  "Day 30: apply to one programme from the list below, even if you feel unready."];

export async function render(el) {
  const B = bag();
  const D = await X("careers.json");
  const progs = D.programs || [], paths = D.paths || [], quiz = D.quiz || [];
  const remote = progs.filter((p) => /online|remote/i.test(p.where));
  const free = progs.filter((p) => /free/i.test(p.cost));
  const F = { track: "", time: "", where: "", level: "" };
  const done = new Set(store.get("x:careers:plan", []));

  const pcard = (p) => { const [k, c] = KIND[p.kind] || [p.kind, "var(--accent)"]; return `<article class="card x-prog-c card-glow m3-spot" style="--c:${c}" data-m3="up"><div class="row" style="gap:8px"><span class="tag">${esc(k)}</span><span class="tag" style="--c:#94a3b8">${esc(p.where)}</span><span class="tag" style="--c:#94a3b8">${p.time === "part" ? "Part time" : "Full time"}</span></div>
    <h3 style="margin-top:12px">${esc(p.name)}</h3><p>${esc(p.what)}</p><dl class="x-dl"><dt>Cost</dt><dd>${esc(p.cost)}</dd><dt>Level</dt><dd>${esc(p.level[0].toUpperCase() + p.level.slice(1))}</dd>${p.next ? `<dt>Next</dt><dd>${esc(p.next)}</dd>` : ""}</dl>
    <div class="row" style="margin-top:12px">${ext(p.url, "Official page")}${p.url2 ? ext(p.url2, "More") : ""}<span class="muted mono" style="font-size:11px">checked ${esc(D.meta?.checked || "")}</span></div></article>`; };

  el.innerHTML = `${hero({ img: "careers", eyebrow: "Careers", title: `Your way <span class="serif gt">in.</span>`, lead: "AI safety needs far more people than it has: researchers, engineers, writers, policy people, organisers. Here are real programmes, each checked on its official page, four paths in, a quick quiz to find your fit, and a 30 day plan.", stats: [[progs.length, "programmes and resources"], [remote.length, "you can do online"], [free.length, "free"], [paths.length, "paths in"]] })}
  ${sec("paths", 1, "Four paths", "Pick a <span class='serif'>direction.</span>", "You do not need a PhD to start. You need a direction and a first step.",
    `<div class="grid g4 x-cpaths" data-m3-stagger="80">${paths.map((p, i) => `<article class="card card-glow m3-spot" data-m3="up"><span class="x-pn mono">${String(i + 1).padStart(2, "0")}</span><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p><ol class="x-steps">${p.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><button class="btn sm ghost" type="button" data-track="${p.id === "builder" || p.id === "technical" ? "technical" : p.id === "policy" ? "policy" : "general"}">See programmes ${ICON.arrow}</button></article>`).join("")}</div>`)}
  ${sec("finder", 2, "Path finder", "Five questions, <span class='serif'>one plan.</span>", "Answer honestly. Nothing is sent anywhere.",
    `<div class="x-finder card" id="finderbox" data-m3="up"></div>`)}
  ${band("careers-desk", "Most people in this field started exactly here: a desk, a laptop, a lot of reading and one first project.")}
  ${sec("programs", 3, "Programmes", "Real programmes, <span class='serif'>checked.</span>", `${esc(D.meta?.note || "")}`,
    `<div class="toolbar x-tools"><div class="seg x-seg" data-f="track"><button type="button" data-fv="" aria-pressed="true">All</button><button type="button" data-fv="technical" aria-pressed="false">Technical</button><button type="button" data-fv="policy" aria-pressed="false">Policy</button><button type="button" data-fv="general" aria-pressed="false">Anyone</button></div>
      <div class="seg x-seg" data-f="time"><button type="button" data-fv="" aria-pressed="true">Any time</button><button type="button" data-fv="part" aria-pressed="false">Part time</button><button type="button" data-fv="full" aria-pressed="false">Full time</button></div>
      <div class="seg x-seg" data-f="where"><button type="button" data-fv="" aria-pressed="true">Anywhere</button><button type="button" data-fv="remote" aria-pressed="false">Online only</button></div><span class="count" id="cc"></span></div>
    <div class="grid g3" id="clist"></div>`)}
  ${sec("india", 4, "From India", "Starting from <span class='serif'>here.</span>", "I started from a college hostel in West Bengal. These are the ones you can do fully online, which is where most of us begin.",
    `<div class="grid g3" data-m3-stagger="70">${remote.map((p) => `<div class="card" data-m3="up"><h3>${esc(p.name)}</h3><p>${esc(p.what)}</p><p style="margin-top:10px">${ext(p.url, "Official page")}</p></div>`).join("")}</div>
     <div class="callout" style="margin-top:26px" data-m3="up"><div><div class="eyebrow">My honest tip</div><h3 style="margin:8px 0">Hackathons are a great door.</h3><p class="muted" style="margin:0">A weekend sprint gives you a finished project, a team and something real to show. Then write about it in public. That is how I would start again.</p></div><a class="btn" href="https://apartresearch.com/" target="_blank" rel="noopener">Apart sprints ${ICON.ext}</a></div>`)}
  ${sec("plan", 5, "30 day plan", "One small step <span class='serif'>a day or two.</span>", "Tick them off. Your progress stays in this browser.",
    `<div class="x-plan card" data-m3="up"><div class="x-plan-top"><b id="pdone">0</b><span>of ${PLAN.length} done</span><span class="x-prog"><i id="pbar"></i></span></div><ul class="x-check">${PLAN.map((t, i) => `<li><label><input type="checkbox" data-plan="${i}" ${done.has(i) ? "checked" : ""}><span>${esc(t)}</span></label></li>`).join("")}</ul></div>`)}
  ${sec("more", 6, "Keep going", "Where to look <span class='serif'>next.</span>", "",
    `<div class="grid g3" data-m3-stagger="80"><a class="card card-glow" data-m3="up" href="#/learn/u10/paths"><h3>Alignment 101, unit 10</h3><p>Four short lessons on paths, skills, your first project and community.</p></a><a class="card card-glow" data-m3="up" href="#/orgs"><h3>Organisations</h3><p>80 groups working on AI safety, on a globe, with their logos and links.</p></a><a class="card card-glow" data-m3="up" href="#/papers"><h3>Papers</h3><p>60 papers in reading paths. Reproducing one is a strong first project.</p></a></div>`)}`;
  B.add(tocBar(el));

  const list = $("#clist", el);
  function paint() {
    const r = progs.filter((p) => (!F.track || p.tracks.includes(F.track)) && (!F.time || p.time === F.time) && (!F.where || /online|remote/i.test(p.where)));
    list.innerHTML = r.map(pcard).join("") || `<div class="empty-state" style="grid-column:1/-1">Nothing matches. Loosen a filter.</div>`;
    $("#cc", el).textContent = `${r.length} of ${progs.length}`;
    B.add(anim(list));
  }
  paint();
  // Path finder
  const fin = $("#finderbox", el); const ans = [];
  function step() {
    const i = ans.length;
    if (i < quiz.length) { const q = quiz[i]; fin.innerHTML = `<div class="x-fin-top"><span class="mono">Question ${i + 1} of ${quiz.length}</span><span class="x-prog"><i style="--w:${(i / quiz.length) * 100}%"></i></span></div><h3>${esc(q.q)}</h3><div class="x-fin-opts">${q.o.map(([t], k) => `<button class="btn" type="button" data-fa="${k}">${esc(t)}</button>`).join("")}</div>${i ? `<button class="btn sm ghost" type="button" id="fback">Back</button>` : ""}`; return; }
    const tags = {}; ans.forEach((a, k) => Object.entries(quiz[k].o[a][1]).forEach(([t, v]) => (tags[t] = (tags[t] || 0) + v)));
    /* Each path has its own tag. The highest wins; a tie goes to the first answer's main pick, then this order. */
    const order = ["technical", "builder", "policy", "comms"];
    const first = Object.entries(quiz[0].o[ans[0]][1]).sort((a, b) => b[1] - a[1])[0][0];
    const best = order.slice().sort((a, b) => (tags[b] || 0) - (tags[a] || 0) || (b === first) - (a === first) || order.indexOf(a) - order.indexOf(b))[0];
    const path = paths.find((p) => p.id === best) || paths[0];
    const track = best === "technical" || best === "builder" ? "technical" : best === "policy" ? "policy" : "general";
    el.dataset.fit = best;
    /* Only programmes mapped to this path (data: programs[].paths) can be recommended for it */
    const fits = (p) => (Array.isArray(p.paths) ? p.paths : p.tracks).includes(path.id);
    const score = (p) => (p.tracks.includes(track) ? 3 : 0) + (p.tracks.includes("general") ? 1 : 0) + (tags[p.time] || 0) + (tags.remote && /online|remote/i.test(p.where) ? 3 : 0) + (tags.remote && !/online|remote/i.test(p.where) ? -4 : 0) + (tags[p.level] || 0);
    const rec = progs.filter(fits).sort((a, b) => score(b) - score(a)).slice(0, 4);
    fin.innerHTML = `<div class="eyebrow">Your fit</div><h3>${esc(path.t)}</h3><p>${esc(path.d)}</p><h4>Start with</h4><div class="grid g2 x-fin-rec">${rec.map((p) => `<a class="card card-glow" href="${esc(p.url)}" target="_blank" rel="noopener"><b>${esc(p.name)}</b><span class="muted">${esc(p.where)}, ${p.time === "part" ? "part time" : "full time"}</span></a>`).join("")}</div><div class="row" style="margin-top:16px"><button class="btn ghost" type="button" id="fagain">Take it again</button></div>`;
    B.add(anim(fin));
  }
  step();
  // Plan
  const paintPlan = () => { $("#pdone", el).textContent = done.size; $("#pbar", el).style.setProperty("--w", (done.size / PLAN.length) * 100 + "%"); };
  paintPlan();
  el.addEventListener("change", (e) => { const c = e.target.closest("[data-plan]"); if (!c) return; c.checked ? done.add(+c.dataset.plan) : done.delete(+c.dataset.plan); store.set("x:careers:plan", [...done]); paintPlan(); });
  el.addEventListener("click", (e) => {
    const fa = e.target.closest("[data-fa]"); if (fa) { ans.push(+fa.dataset.fa); step(); return; }
    if (e.target.closest("#fback")) { ans.pop(); step(); return; }
    if (e.target.closest("#fagain")) { ans.length = 0; step(); return; }
    const fv = e.target.closest("[data-fv]"); if (fv) { const g = fv.closest("[data-f]"); F[g.dataset.f] = fv.dataset.fv; $$("[data-fv]", g).forEach((b) => b.setAttribute("aria-pressed", b === fv)); paint(); return; }
    const tr = e.target.closest("[data-track]"); if (tr) { F.track = tr.dataset.track; const g = $('[data-f="track"]', el); $$("[data-fv]", g).forEach((b) => b.setAttribute("aria-pressed", b.dataset.fv === F.track)); paint(); $("#programs", el).scrollIntoView({ behavior: RM() ? "auto" : "smooth" }); }
  });
  return () => B.run();
}
