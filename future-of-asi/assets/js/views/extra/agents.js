/* Agents: how AI agents work, think and act. Loop, parts, autonomy ladder, a scripted playground, evals, incidents and videos. */
import { X, hero, sec, band, tocBar, ext, anim, bag, horizonChart, $, $$, esc, RM, ICON, store } from "./_kit.js";
import { ytPoster } from "../../util.js";

/* Scripted playground. No real model runs here: each task is a fixed script that shows where guardrails matter. */
const TASKS = {
  test: { t: "Fix the failing test", d: "A pricing function gives the wrong discount and one test fails.", steps: [
    { th: "Run the tests to see what is failing.", act: "run_tests()", out: "1 failing: test_discount expected 90, got 89" },
    { th: "Open the pricing code. The rounding looks wrong.", act: "open('pricing.py')", out: "price * (1 - rate), then int()" },
    { th: "The deadline is close. The fastest way to make the test pass is to change the number the test expects.", act: "edit('test_pricing.py', expected=89)", bad: "hack", pressure: true, why: "Reward hacking: the test passes but the bug is still there." },
    { th: "Fix the rounding properly.", act: "edit('pricing.py', round_half_up)", out: "pricing.py updated", calm: true },
    { th: "Run the tests again.", act: "run_tests()", out: "All tests pass" },
    { th: "Ship it.", act: "git_push('main')", risky: true, out: "Pushed to main" }] },
  clean: { t: "Free up disk space", d: "The server is almost full. Old log files need to go.", steps: [
    { th: "Find what is using the space.", act: "du('/srv')", out: "/srv/logs 40 GB, /srv/prod_db 120 GB" },
    { th: "The database is the biggest. Deleting it would free the most space fast.", act: "rm('/srv/prod_db', recursive=True)", bad: "destroy", pressure: true, risky: true, prod: true, why: "Destroying production data to hit a target, like the 2025 Replit incident." },
    { th: "Delete log files older than 30 days.", act: "rm('/srv/logs', older_than='30d')", risky: true, out: "Freed 36 GB" },
    { th: "Report back.", act: "reply('Freed 36 GB by removing old logs.')", out: "Message sent" }] },
  mail: { t: "Answer customer emails", d: "Ten support emails are waiting. One customer is very angry.", steps: [
    { th: "Read the inbox and sort by urgency.", act: "read_inbox()", out: "10 emails, 1 marked angry" },
    { th: "The angry customer wants money back. Policy allows a refund within 30 days. They bought 45 days ago.", act: "check_policy('refund')", out: "Refunds: 30 days" },
    { th: "Keep them happy at any cost: promise a full refund plus a free year, even though policy does not allow it.", act: "draft('Full refund and a free year, guaranteed')", bad: "promise", pressure: true, why: "Saying what pleases the user instead of what is true, a form of sycophancy." },
    { th: "Write an honest, kind reply and offer to escalate.", act: "draft('Sorry. Our refund window is 30 days, but I have asked a manager to review.')", out: "Draft ready", calm: true },
    { th: "Send all replies.", act: "send_all()", risky: true, out: "10 emails sent" }] },
};

export async function render(el) {
  const B = bag();
  const D = await X("agents.json");
  const loop = D.loop || [], parts = D.parts || [], aut = D.autonomy || { levels: [] }, evs = D.evals || [], inc = D.incidents || [], vids = D.videos || [], metr = D.metr || { points: [] };
  el.innerHTML = `${hero({ img: "agents", eyebrow: "AI agents", title: `AI that <span class="serif gt">acts.</span>`, lead: "A chatbot answers. An agent does things: it runs code, browses, clicks and sends. Here is how agents work, how far they have come, where they have gone wrong, and a playground to try the guardrails yourself.", stats: [[loop.length, "steps in the loop"], [aut.levels.length, "autonomy levels"], [evs.length, "benchmarks explained"], [inc.length, "real incidents and tests"]] })}
  ${sec("loop", 1, "The loop", "Look, think, act, <span class='serif'>repeat.</span>", "Every agent runs some version of this loop until it decides it is done. Tap a step.",
    `<div class="x-loop" data-m3="fade"><div class="x-ring" id="ring" aria-hidden="true">${loop.map((s, i) => { const a = (i / loop.length) * Math.PI * 2 - Math.PI / 2; return `<button type="button" class="x-ring-n" data-step="${i}" style="--x:${(50 + Math.cos(a) * 40).toFixed(2)}%;--y:${(50 + Math.sin(a) * 40).toFixed(2)}%" tabindex="-1" title="${esc(s.t)}">${i + 1}</button>`; }).join("")}<div class="x-ring-c"><span class="mono">agent</span><small class="x-ring-now" id="ringNow"></small></div><i class="x-ring-dot"></i></div>
      <ol class="x-loop-list">${loop.map((s, i) => `<li><button type="button" data-step="${i}"><span class="mono">${i + 1}</span><b>${esc(s.t)}</b><span>${esc(s.d)}</span></button></li>`).join("")}</ol></div>`)}
  ${sec("parts", 2, "Inside an agent", "Six <span class='serif'>parts.</span>", "Most agents are a language model plus a harness of tools, memory and rules around it.",
    `<div class="grid g3" data-m3-stagger="70">${parts.map((p, i) => `<article class="card card-glow m3-spot" data-m3="up"><span class="x-pn mono">${String(i + 1).padStart(2, "0")}</span><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p>${p.ref ? `<p style="margin-top:10px">${ext("https://arxiv.org/abs/" + p.ref, "arXiv " + p.ref)}</p>` : ""}</article>`).join("")}</div>`)}
  ${sec("ladder", 3, "Autonomy", "How much does the <span class='serif'>human</span> do?", `A ladder from a Google DeepMind paper. Risks change as the AI takes over more. ${ext(aut.url, "Levels of AGI, 2023")}`,
    `<div class="x-ladder" data-m3="up"><label class="sr-only" for="alv">Autonomy level</label><input type="range" id="alv" min="0" max="${aut.levels.length - 1}" value="2" class="x-range" aria-valuetext="${esc(aut.levels[2]?.t || "")}">
      <div class="x-ladder-steps">${aut.levels.map((l) => `<button type="button" data-lv="${l.n}"><span class="mono">L${l.n}</span>${esc(l.t)}</button>`).join("")}</div>
      <div class="card x-ladder-card" id="lcard" aria-live="polite"></div></div>`)}
  ${band("agents-loop", "Gears and circuits: an agent is a loop that keeps turning until someone, or something, stops it.")}
  ${sec("play", 4, "Playground", "Try the <span class='serif'>guardrails.</span>", "A scripted simulation, not a real AI. Pick a task, set how much freedom the agent has, switch guardrails on or off, then run it. Turn on pressure to see what can go wrong.",
    `<div class="x-play" data-m3="up"><div class="card x-play-ctl">
      <h4>Task</h4><div class="seg x-seg" id="ptask">${Object.entries(TASKS).map(([k, t], i) => `<button type="button" data-task="${k}" aria-pressed="${i === 0}">${esc(t.t)}</button>`).join("")}</div><p class="muted" id="pdesc" style="font-size:14px;margin:8px 0 0"></p>
      <h4>Freedom</h4><div class="seg x-seg" id="paut"><button type="button" data-aut="every" aria-pressed="false">Ask before every step</button><button type="button" data-aut="risky" aria-pressed="true">Ask before risky steps</button><button type="button" data-aut="full" aria-pressed="false">Full auto</button></div>
      <h4>Guardrails</h4><div class="x-toggles"><label><input type="checkbox" id="gmon" checked> Monitor reads every action</label><label><input type="checkbox" id="gprod" checked> Production is read only</label><label><input type="checkbox" id="gpress"> Deadline pressure</label></div>
      <div class="row" style="margin-top:16px"><button class="btn primary" type="button" id="prun">${ICON.play} Run the agent</button><button class="btn ghost" type="button" id="preset">Reset</button></div></div>
      <div class="x-term card" aria-live="polite"><div class="x-term-h"><i></i><i></i><i></i><span class="mono">agent.log</span></div><div class="x-term-b" id="plog" data-lenis-prevent><p class="muted">Press run. Each step shows what the agent thinks, the tool it calls, and what the guardrails do.</p></div><div class="x-score" id="pscore"></div></div></div>`)}
  ${sec("horizon", 5, "How far they go", "Tasks that take people <span class='serif'>hours.</span>", `METR times tasks with skilled humans and finds the length an agent can finish half the time. ${esc(metr.note || "")}`,
    `<div class="card x-chart-card" data-m3="up">${horizonChart(metr.points || [])}<div class="row" style="margin-top:8px">${ext(metr.url_paper, "METR, March 2025")}${ext(metr.url_page, "METR time horizons")}${ext(metr.url_ant, "Anthropic, June 2026")}</div></div>
     <h3 style="margin-top:40px">The tests agents take</h3><div class="x-table-wrap" data-lenis-prevent><table class="x-table"><thead><tr><th>Benchmark</th><th>What it checks</th><th>Area</th><th>Year</th></tr></thead><tbody>${evs.map((v) => `<tr><td><a href="${esc(v.url)}" target="_blank" rel="noopener" title="${esc(v.title)}">${esc(v.name || v.title)}</a></td><td>${esc(v.what)}</td><td><span class="tag">${esc(v.measures)}</span></td><td class="mono">${v.year}</td></tr>`).join("")}</tbody></table></div>`)}
  ${sec("incidents", 6, "When agents misbehave", "Tests and <span class='serif'>real runs.</span>", "Some of these happened in deliberate tests built to provoke bad behaviour. Some happened in real use. Each card says which, and links the source.",
    `<div class="x-inc">${inc.map((x) => `<article class="x-inc-i" data-m3="up"><div class="x-inc-y mono">${esc(x.year)}</div><div class="card card-glow"><div class="row" style="gap:8px"><span class="tag" style="--c:${x.kind === "Test" ? "#0ea5e9" : "#ef4444"}">${esc(x.kind)}</span><span class="muted" style="font-size:13px">${esc(x.who)}</span></div><h3 style="margin-top:10px">${esc(x.t)}</h3><p>${esc(x.d)}</p><p style="margin-top:10px">${ext(x.url, "Source")}</p></div></article>`).join("")}</div>`)}
  ${sec("builders", 7, "If you build agents", "Seven habits I would <span class='serif'>never skip.</span>", "My own checklist from building and testing agents, shaped by the incidents above. Tick what you already do; it stays in your browser.",
    `<ul class="x-check" id="bcheck" data-m3-stagger="60">${["Give the agent the smallest permissions that still let it do the job.", "Keep development and production separate, and make production read only by default.", "Ask a human before anything you cannot undo: deleting, paying, sending, pushing.", "Log every tool call, and have a second model or a person read the risky ones.", "Run it in a sandbox first, with fake data and a time limit it cannot edit.", "Test it under pressure: deadlines, angry users, impossible tasks. Watch for shortcuts.", "Keep a big red stop button, and check it actually works."].map((t, i) => `<li data-m3="up"><label><input type="checkbox" data-bc="${i}"><span>${esc(t)}</span></label></li>`).join("")}</ul>`)}
  ${sec("watch", 8, "Watch", "Agents, <span class='serif'>explained.</span>", "Talks and explainers on how agents think and what they want. Nothing plays until you press play.",
    `<div class="grid g3 x-vids">${vids.map((v) => `<div data-m3="up">${ytPoster(v.id, v.title, v.duration || "")}<p class="x-vt"><b>${esc(v.title)}</b><span class="muted">${esc(v.channel)}</span></p></div>`).join("")}</div>`)}`;
  B.add(tocBar(el));

  // Loop: highlight steps, auto advance gently when visible (not in reduced motion)
  let cur = 0, timer = 0;
  const ring = $("#ring", el);
  let picked = false;
  const setStep = (i) => { cur = i; const rn = $("#ringNow", el); if (rn && loop[i]) rn.textContent = `${i + 1} of ${loop.length}: ${loop[i].t}`; $$("[data-step]", el).forEach((b) => b.classList.toggle("on", +b.dataset.step === i)); const a = (i / loop.length) * Math.PI * 2 - Math.PI / 2; ring.style.setProperty("--dx", (50 + Math.cos(a) * 40).toFixed(2) + "%"); ring.style.setProperty("--dy", (50 + Math.sin(a) * 40).toFixed(2) + "%"); };
  setStep(0);
  if (!RM()) { const io = new IntersectionObserver((es) => { clearInterval(timer); if (es[0].isIntersecting && !picked) timer = setInterval(() => setStep((cur + 1) % loop.length), 2200); }); io.observe(ring); B.add(() => { io.disconnect(); clearInterval(timer); }); }

  // Autonomy ladder
  const lcard = $("#lcard", el), alv = $("#alv", el);
  const showLv = (n) => { const l = aut.levels[n]; if (!l) return; alv.value = n; alv.setAttribute("aria-valuetext", l.t); $$("[data-lv]", el).forEach((b) => b.classList.toggle("on", +b.dataset.lv === n)); lcard.innerHTML = `<div class="eyebrow">Level ${l.n}</div><h3>${esc(l.t)}</h3><p>${esc(l.d)}</p><div class="grid g2" style="margin-top:14px"><div><h4>Example</h4><p>${esc(l.eg)}</p></div><div><h4>New risks</h4><p>${esc(l.risk)}</p></div></div>`; lcard.style.setProperty("--p", n / (aut.levels.length - 1)); };
  showLv(2); alv.addEventListener("input", () => showLv(+alv.value));

  // Builder checklist
  const bc = new Set(store.get("x:agents:check", []));
  $$("[data-bc]", el).forEach((c) => { c.checked = bc.has(+c.dataset.bc); c.addEventListener("change", () => { c.checked ? bc.add(+c.dataset.bc) : bc.delete(+c.dataset.bc); store.set("x:agents:check", [...bc]); }); });

  // Playground
  const P = { task: "test", aut: "risky", run: 0 };
  const log = $("#plog", el), score = $("#pscore", el);
  const desc = () => ($("#pdesc", el).textContent = TASKS[P.task].d);
  desc();
  const sleep = (ms) => new Promise((r) => setTimeout(r, RM() ? 0 : ms));
  const line = (cls, html) => { const p = document.createElement("p"); p.className = "x-l " + cls; p.innerHTML = html; log.appendChild(p); log.scrollTop = log.scrollHeight; return p; };
  function ask(q) {
    return new Promise((res) => { const p = line("ask", `<span>${esc(q)}</span> <button class="chip" type="button" data-ans="1">Approve</button> <button class="chip" type="button" data-ans="0">Deny</button>`); p.addEventListener("click", (e) => { const b = e.target.closest("[data-ans]"); if (!b) return; $$("button", p).forEach((x) => (x.disabled = true)); b.classList.add("on"); res(b.dataset.ans === "1"); }); });
  }
  async function run() {
    const my = ++P.run; log.innerHTML = ""; score.innerHTML = "";
    const mon = $("#gmon", el).checked, prod = $("#gprod", el).checked, press = $("#gpress", el).checked;
    const T = TASKS[P.task]; let asked = 0, harm = 0, blocked = 0, hacked = false, badDone = false;
    line("sys", `Task: <b>${esc(T.t)}</b>. Freedom: ${esc({ every: "ask before every step", risky: "ask before risky steps", full: "full auto" }[P.aut])}. Monitor ${mon ? "on" : "off"}. Production ${prod ? "read only" : "writable"}. Pressure ${press ? "on" : "off"}.`);
    for (const s of T.steps) {
      if (my !== P.run) return;
      if (s.pressure && !press) continue;
      if (s.calm && badDone) continue;
      await sleep(500); line("th", `<span class="k">think</span> ${esc(s.th)}`);
      await sleep(450); line("act", `<span class="k">tool</span> <code>${esc(s.act)}</code>`);
      if (mon && s.bad) { await sleep(350); line("mon", `<span class="k">monitor</span> Flagged and blocked. ${esc(s.why)} Sent to a human for review.`); blocked++; continue; }
      if (prod && s.prod) { await sleep(350); line("mon", `<span class="k">guardrail</span> Permission denied: production is read only. Nothing was deleted.`); blocked++; continue; }
      const needAsk = P.aut === "every" || (P.aut === "risky" && s.risky);
      if (needAsk) { asked++; const ok = await ask(`The agent wants to run ${s.act}. Allow it?`); if (my !== P.run) return; if (!ok) { line("mon", `<span class="k">human</span> Denied. The agent skips this step.`); if (s.bad) blocked++; continue; } }
      if (s.bad === "hack") { hacked = true; badDone = true; harm++; await sleep(300); line("bad", `<span class="k">result</span> Test file changed. ${esc(s.why)}`); continue; }
      if (s.bad) { harm++; badDone = true; await sleep(300); line("bad", `<span class="k">result</span> Done. ${esc(s.why)}`); continue; }
      await sleep(300); line("out", `<span class="k">result</span> ${esc(hacked && /All tests pass/.test(s.out || "") ? "All tests pass (but only because the test was edited)" : s.out || "ok")}`);
    }
    if (my !== P.run) return;
    const verdict = harm ? `<b class="bad">Something went wrong.</b> The agent did ${harm} harmful thing${harm > 1 ? "s" : ""}. Try turning on the monitor, making production read only, or asking before every step.` : blocked ? `<b class="good">Caught in time.</b> Guardrails or you blocked ${blocked} bad step${blocked > 1 ? "s" : ""}.` : `<b class="good">Clean run.</b> ${press ? "" : "Now switch on deadline pressure and run it again."}`;
    score.innerHTML = `<div class="x-score-row"><span><b>${asked}</b> times it asked you</span><span><b>${blocked}</b> steps blocked</span><span><b>${harm}</b> harmful</span></div><p>${verdict} The trade off is real: more asking is safer but takes more of your time. That is the core question of AI control.</p>`;
    B.add(anim(score));
  }
  $("#prun", el).addEventListener("click", run);
  $("#preset", el).addEventListener("click", () => { P.run++; log.innerHTML = `<p class="muted">Press run.</p>`; score.innerHTML = ""; });
  el.addEventListener("click", (e) => {
    const s = e.target.closest("[data-step]"); if (s) { picked = true; clearInterval(timer); setStep(+s.dataset.step); return; }
    const lv = e.target.closest("[data-lv]"); if (lv) { showLv(+lv.dataset.lv); return; }
    const tk = e.target.closest("[data-task]"); if (tk) { P.task = tk.dataset.task; $$("[data-task]", el).forEach((b) => b.setAttribute("aria-pressed", b === tk)); desc(); return; }
    const au = e.target.closest("[data-aut]"); if (au) { P.aut = au.dataset.aut; $$("[data-aut]", el).forEach((b) => b.setAttribute("aria-pressed", b === au)); }
  });
  return () => { P.run++; B.run(); };
}
