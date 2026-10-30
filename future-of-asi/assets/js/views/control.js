/* AI Control lab (Round 3). Protocol diagrams, a protocol builder with a Pareto chart, a levelled blue team game,
   control evaluations, sabotage evals, chain of thought monitoring, case studies, 2024 to 2026 developments, glossary and quiz. */
import { $, $$, esc, ICON, RM, clamp, store, videos, researchers, load, arr, ytThumb, fmtDur, fmtDate, avatar } from "../util.js";
import { hero, banner, head, headH, sources, run, m3init, m3auto, dragScroll, pic, photoMap, face } from "../pages3/kit.js";
import { scrollToEl } from "../pages3/kit.js";
import { trackActive } from "../core/toc-row.js";
import { PAPERS, TABLE7, PROTOCOLS, PALETTE, estimate, LEVELS, TASKS, CASES, DEVS, GLOSS_KEEP, GLOSS_EXTRA, QUIZ } from "../pages3/control-data.js";

const P = (k) => PAPERS[k];
const cite = (k, label) => `<a class="p3-cite" href="${esc(P(k).url)}" target="_blank" rel="noopener">${esc(label || `${P(k).by.split(",")[0]} ${P(k).y.slice(-4)}`)} ${ICON.ext}</a>`;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

export async function render(el, params, query) {
  const [vidsAll, ppl, glossRaw, tlRaw, collRaw, phm] = await Promise.all([videos(), researchers(), load("glossary.json"), load("timeline.json"), load("video-collections.json"), photoMap()]);
  const vById = Object.fromEntries(vidsAll.map((v) => [v.id, v]));
  const coll = arr(collRaw, "collections").find((c) => c.id === "ai-control-explained");
  const vidIds = [...new Set([...(coll ? coll.video_ids : []), ...vidsAll.filter((v) => v.category === "control").map((v) => v.id)])].filter((id) => vById[id]).slice(0, 18);
  const people = ppl.filter((p) => p.categories.includes("control") || /Redwood|Apollo|METR|AI Security Institute|Palisade/i.test(p.org)).sort((a, b) => (!!phm[b.id]) - (!!phm[a.id])).slice(0, 14);
  const gloss = [...arr(glossRaw, "terms").filter((g) => GLOSS_KEEP.includes(g.term)), ...GLOSS_EXTRA].sort((a, b) => a.term.localeCompare(b.term));
  const tlEv = arr(tlRaw, "events").filter((e) => (e.date || "") >= "2024-12" && /Hugging Face|Mythos 5|resist shutdown|Agentic misalignment|scheme|Alignment faking/i.test(e.title));
  const devs = [...DEVS.map((d) => ({ ...d, url: P(d.src).url, lab: P(d.src).by.split(",")[0] })), ...tlEv.map((e) => ({ d: e.date, t: e.title, s: e.summary, url: e.url, lab: "From the timeline" }))].sort((a, b) => a.d.localeCompare(b.d));
  const best = store.get("p3ctl", { done: {}, stars: {} });

  el.innerHTML = `${hero({ img: "p3-control-hero", alt: "A glowing amber core sealed inside a glass chamber in a dark server hall, watched by teal sensor beams", cat: "teal",
    eyebrow: "AI Control lab", title: "Safe even if <span class='serif gt-mint'>the AI is not.</span>",
    lead: "Alignment tries to make AI want the right things. AI control asks a harder, more practical question: if a model were secretly trying to cause harm, would our setup still catch it? Build protocols, play the blue team, and read what the research found.",
    stats: [{ n: 5, label: "protocols you can watch" }, { n: 8, label: "parts in the builder" }, { n: LEVELS.length, label: "game levels" }, { n: Object.keys(PAPERS).length, label: "sources checked" }],
    extra: `<div class="row p3-hero-cta" data-m3="up" data-m3-delay="320"><a class="btn primary p3-rip" href="#p3build" data-m3-magnet data-jump="p3build"><span class="shine"></span>Build a protocol ${ICON.arrow}</a><a class="btn ghost p3-rip" href="#p3game" data-jump="p3game">${ICON.play} Play the blue team</a></div>` })}

  <nav class="p3-toc" aria-label="On this page"><div class="wrap"><div class="p3-toc-in">${[["p3why", "Why"], ["p3proto", "Protocols"], ["p3build", "Builder"], ["p3game", "Game"], ["p3evals", "Evaluations"], ["p3sab", "Sabotage"], ["p3cot", "Chain of thought"], ["p3cases", "Case studies"], ["p3dev", "2024 to 2026"], ["p3gloss", "Glossary"], ["p3quiz", "Quiz"]].map(([id, t]) => `<a href="#${id}" data-jump="${id}">${t}</a>`).join("")}</div></div></nav>

  <section class="section tight" id="p3why"><div class="wrap">
    ${headH("In one minute", "Plan for the <span class='serif'>worst case.</span>")}
    <div class="grid g3" data-m3-stagger="110">
      <div class="card card-glow m3-spot p3-lift" data-m3="up"><div class="p3-ico" aria-hidden="true">${eye()}</div><h3>We cannot read minds</h3><p>A powerful model might act helpful in every test and still have goals we never chose. Today there is no reliable way to check from the inside.</p></div>
      <div class="card card-glow m3-spot p3-lift" data-m3="up"><div class="p3-ico" aria-hidden="true">${lock()}</div><h3>So assume it might be trying</h3><p>Banks do not assume every employee is honest. They use audits and separation of duties. Control does the same for AI: build a setup that holds up even against a model that wants to get past it.</p></div>
      <div class="card card-glow m3-spot p3-lift" data-m3="up"><div class="p3-ico" aria-hidden="true">${doc()}</div><h3>Then test it like an attacker</h3><p>A red team plays the model at its sneakiest. If the setup still holds, you have evidence, not hope. The idea was set out by Redwood Research in ${cite("control", "Greenblatt et al. 2023")}.</p></div>
    </div>
    <div class="p3-ribbon" data-m3-marquee="36" aria-label="Key ideas">${["Trusted monitoring", "Untrusted monitoring", "Defer to trusted", "Trusted editing", "Resampling", "Honeypots", "Audit budget", "Safety cases", "Control evaluations", "Sabotage evals", "Chain of thought monitoring"].map((t) => `<span>${t}</span>`).join("")}</div>
  </div></section>

  <section class="section tight"><div class="wrap">
    ${headH("The cast", "Three players, <span class='serif'>one budget.</span>")}
    <div class="grid g3" data-m3-stagger="120">
      ${[["U", "Untrusted model", "#ef4444", "red", "The powerful model we want to use. Smart, useful, and possibly scheming."], ["T", "Trusted model", "#14b8a6", "teal", "A weaker model we trust, often because it is too weak to plan a clever betrayal."], ["H", "Human audit", "#f59e0b", "amber", "Careful expert review. Almost always right, but slow and expensive, so only a few percent of work gets it."]].map(([k, n, c, cat, d]) => `<div class="card card-glow p3-cast" data-cat="${cat}" data-m3="up" data-m3-tilt="7" style="--c:${c}"><span class="p3-badge" style="--c:${c}">${k}</span><h3>${n}</h3><p>${d}</p></div>`).join("")}
    </div>
  </div></section>

  ${banner({ img: "p3-control-lab", alt: "An empty control room at night with a curved wall of monitors showing teal graphs", eyebrow: "Protocols", title: "Watch the work <span class='serif'>flow.</span>", text: "Each dot is a piece of work from U. Cyan dots are honest. Red dots carry a hidden backdoor. Pick a protocol and step through it.", cat: "teal", id: "p3proto" })}
  <section class="section tight"><div class="wrap">
    <div class="chips p3-tabs" role="tablist" aria-label="Protocols" id="ptabs">${PROTOCOLS.map((p, i) => `<button class="chip p3-rip ${i ? "" : "on"}" role="tab" aria-selected="${!i}" data-p="${p.id}" type="button" style="--c:${p.c}"><i class="dot-cat" style="background:${p.c}"></i>${p.name}</button>`).join("")}</div>
    <div class="p3-two" id="pgrid">
      <div class="card p3-diagram" id="diag" aria-live="polite"></div>
      <div class="card" id="pdesc"></div>
    </div>
  </div></section>

  <section class="section tight" id="p3build"><div class="wrap">
    ${headH("Protocol builder", "Build your own, <span class='serif'>see the trade.</span>", "Drag parts into the pipeline, or tap them. The amber star shows an illustrative estimate of safety and usefulness. The other dots are real results from the 2023 paper, so you can see where your design would sit.")}
    <div class="p3-builder">
      <div class="card p3-palette"><div class="eyebrow">Parts</div><div class="p3-parts" id="parts">${PALETTE.map((c) => `<button type="button" class="p3-part p3-rip" data-part="${c.id}" style="--c:${c.c}"><span class="sr-only">Add </span><span class="p3-badge sm" style="--c:${c.c}">${c.short}</span><span><b>${c.name}</b><small>${c.d}</small></span></button>`).join("")}</div>
        <div class="eyebrow" style="margin-top:18px">Presets from the paper</div>
        <div class="chips" id="presets"><button class="chip" type="button" data-pre="audit">Upfront auditing</button><button class="chip" type="button" data-pre="audit,tmon">Trusted monitoring</button><button class="chip" type="button" data-pre="audit,tmon,defer" data-g="10">Defer 10%</button><button class="chip" type="button" data-pre="audit,tmon,edit" data-g="20">Edit 20%</button><button class="chip" type="button" data-pre="audit,umon,honey,defer" data-g="10">Untrusted monitoring</button><button class="chip" type="button" data-pre="">Clear</button></div>
      </div>
      <div class="card p3-pipe-card">
        <div class="row" style="justify-content:space-between"><div class="eyebrow">Your pipeline</div><span class="count" id="pipeN">0 parts</span></div>
        <div class="p3-pipe" id="pipe" aria-label="Pipeline. Drop parts here"><div class="p3-pipe-u"><span class="p3-badge sm" style="--c:#ef4444">U</span>Untrusted output</div><ol id="pipeList"></ol><div class="p3-drop" id="drop">Drop a part here</div><div class="p3-pipe-u ship"><span class="p3-badge sm" style="--c:#84cc16">OK</span>Ships</div></div>
        <div class="slider"><label for="grey">Grey zone for defer or edit <output id="greyO">10%</output></label><input type="range" id="grey" min="0" max="50" value="10" step="1"></div>
        <div class="p3-rings"><div class="p3-ring" id="rS" style="--c:#14b8a6"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50"/><circle class="v" cx="60" cy="60" r="50"/></svg><b>0%</b><span>Safety</span></div><div class="p3-ring" id="rU" style="--c:#22d3ee"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50"/><circle class="v" cx="60" cy="60" r="50"/></svg><b>0%</b><span>Usefulness</span></div></div>
        <ul class="p3-notes" id="notes"></ul>
      </div>
      <div class="card p3-chart-card"><svg id="par" viewBox="0 0 600 400" role="img" aria-label="Safety against usefulness. Paper results and your estimate"></svg>
        <div class="p3-legend">${TABLE7.series.map((s) => `<span><i style="background:${s.c}"></i>${s.name}</span>`).join("")}<span><i style="background:#e6f0fa"></i>Single protocols</span><span><i class="star"></i>Your estimate</span></div>
        <p class="disclaimer">Illustrative. The star is a toy estimate loosely shaped by the paper's trends, not a measured result. Dots are from ${cite("control", "Greenblatt et al. 2023, Table 7")}, in its APPS backdoor setting with GPT-4 as U and GPT-3.5 as T.</p></div>
    </div>
  </div></section>

  ${banner({ img: "p3-control-game", alt: "Glowing red and teal glass game pieces facing each other across a dark board", eyebrow: "Play", title: "Red team <span class='serif'>versus</span> blue team.", text: "Five levels. You are the blue team on shift, round by round. The red team has already chosen its attack plan.", cat: "red", id: "p3game", align: "right" })}
  <section class="section tight"><div class="wrap">
    <div class="p3-levels" id="levels" role="group" aria-label="Levels"></div>
    <div id="gameRoot" class="p3-game-root"></div>
    <p class="muted p3-keys">Keyboard: <kbd>A</kbd> accept, <kbd>U</kbd> audit, <kbd>D</kbd> defer, <kbd>R</kbd> resample, <kbd>X</kbd> expose a lying monitor.</p>
  </div></section>

  ${banner({ img: "p3-control-evals", alt: "A sealed glass test cube on a lab bench with a glowing chip inside and sensor probes pointing at it", eyebrow: "Control evaluations", title: "Test it like <span class='serif'>an attacker would.</span>", text: "A control evaluation is a rehearsal. The red team builds the worst model it can, the blue team's protocol runs, and you measure what gets through.", cat: "cyan", id: "p3evals" })}
  <section class="section tight"><div class="wrap">
    <div class="p3-flow" id="flow">
      <svg class="p3-flow-line" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true"><path data-p3-draw d="M10,20 H990"/></svg>
      ${[["Threat model", "Name the harm you fear, such as leaking model weights or planting a backdoor.", "#ef4444"], ["Red team", "Give a model the best attack plan people can design, with affordances that fit its real abilities.", "#f59e0b"], ["Proxy deployment", "Run the protocol on a stand in for the real work, at scale.", "#3b82f6"], ["Measure", "Safety: no attack succeeds. Usefulness: how much good work survives.", "#22d3ee"], ["Safety case", "Write the argument, with evidence, that deployment is safe enough.", "#84cc16"]].map(([t, d, c], i) => `<div class="p3-step" data-p3="pop" style="--c:${c};--d:${i * 120}ms"><span class="p3-num">${i + 1}</span><b>${t}</b><p>${d}</p></div>`).join("")}
    </div>
    <div class="grid g2" style="margin-top:26px" data-m3-stagger="120">
      <div class="card card-glow" data-m3="up"><div class="eyebrow">Safety cases</div><h3>Four ways to argue a system is safe</h3><p>${cite("safetycases", "Clymer and colleagues (2024)")} sort safety arguments into four kinds:</p>
        <ul class="p3-list">${["It simply cannot cause a catastrophe", "Control measures are strong enough to stop it", "It can cause harm but is trustworthy", "Deference to credible AI advisors, if systems get far more powerful"].map((x, i) => `<li data-p3="drop" style="--d:${i * 90}ms">${x}</li>`).join("")}</ul><p>Control is the second kind. ${cite("safetycase", "A 2025 sketch by UK AISI and Redwood")} works through one in detail.</p></div>
      <div class="card card-glow" data-m3="up"><div class="eyebrow">Control levels</div><h3>The red team grows with the model</h3><p>${cite("acl", "Korbak and colleagues (2025)")} propose giving the red team affordances that match each model's real capability, across five fictional models and five AI control levels. Their warning: a convincing control safety case for superintelligent agents will need research breakthroughs.</p>
        <div class="p3-ladder" aria-hidden="true">${[1, 2, 3, 4, 5].map((n) => `<span data-p3-bar="${n / 5}" style="--i:${n}"><i></i><em>ACL ${n}</em></span>`).join("")}</div>
        <p class="muted" style="font-size:13px;margin-top:10px">Bar heights only show the idea of rising difficulty. The formal model of the game is in ${cite("games", "Griffin et al. 2024")}.</p></div>
    </div>
  </div></section>

  ${banner({ img: "p3-control-sabotage", alt: "A macro photo of a circuit board with teal traces and one hidden red trace", eyebrow: "Sabotage and scheming", title: "Something hidden <span class='serif'>in plain sight.</span>", text: "Can today's models undermine the people watching them? Researchers now test this directly.", cat: "red", id: "p3sab" })}
  <section class="section tight"><div class="wrap">
    <div class="p3-bigstats" data-m3-stagger="100">
      <div class="card card-glow" data-cat="red" data-m3="up"><b class="p3-big" data-m3-count="27" data-m3-suffix="%">27%</b><p>Best sabotage score in SHADE-Arena, by Claude 3.7 Sonnet, overseen by a monitor. ${cite("shade", "Kutasov et al. 2025")}</p></div>
      <div class="card card-glow" data-cat="amber" data-m3="up"><b class="p3-big" data-m3-count="0.87" data-m3-decimals="2">0.87</b><p>AUC of the best monitor, Gemini 2.5 Pro, at telling honest and sabotage transcripts apart. ${cite("shade", "SHADE-Arena")}</p></div>
      <div class="card card-glow" data-cat="lime" data-m3="up"><b class="p3-big"><span data-m3-count="58" data-m3-suffix="%">58%</span> <small>to</small> <span data-m3-count="7" data-m3-suffix="%">7%</span></b><p>Attack success in BashBench before and after the best resample protocol, at a 5% usefulness cost. ${cite("ctrlz", "Bhatt et al. 2025")}</p></div>
      <div class="card card-glow" data-cat="cyan" data-m3="up"><b class="p3-big" data-m3-count="5">5</b><p>Frontier models Apollo found capable of in context scheming: o1, Claude 3.5 Sonnet, Claude 3 Opus, Gemini 1.5 Pro and Llama 3.1 405B. ${cite("scheming", "Meinke et al. 2024")}</p></div>
    </div>
    <div class="grid g3" style="margin-top:22px" data-m3-stagger="110">
      <div class="card card-glow p3-lift" data-m3="up"><div class="eyebrow">What scheming looked like</div><p>In Apollo's tests, models slipped subtle mistakes into answers, tried to switch off oversight, and tried to copy what they believed were their own weights to outside servers. When o1 had schemed, it usually kept up the deception when questioned.</p></div>
      <div class="card card-glow p3-lift" data-m3="up"><div class="eyebrow">Alignment faking</div><p>Anthropic and Redwood showed a model that pretended to go along with training it disagreed with, to stop its values being changed. That is exactly the kind of model control is designed to survive. ${cite("faking", "Greenblatt et al. 2024")}</p></div>
      <div class="card card-glow p3-lift" data-m3="up"><div class="eyebrow">Planning without memory</div><p>Subversion Strategy Eval asks whether a model can work out a plan to beat a protocol and follow it across separate runs with no shared memory. Tested models could not do this well on their own yet. ${cite("subversion", "Mallen et al. 2024")}</p></div>
    </div>
  </div></section>

  <section class="section tight" id="p3cot"><div class="wrap">
    ${headH("Chain of thought monitoring", "Reading the model's <span class='serif'>scratchpad.</span>", "Reasoning models write out their thinking. A monitor can read it for signs of bad intent. It works, and it can break. Flip the switch to see why.")}
    <div class="p3-two">
      <div class="card p3-cot" id="cot">
        <div class="row" style="justify-content:space-between"><span class="tag" style="--c:#8aa0b8">Made up example to show the idea</span><button type="button" class="switch" role="switch" id="cotSw" aria-checked="false" aria-label="Trained hard against the monitor"></button></div>
        <p class="muted" style="margin:10px 0 0;font-size:13px" id="cotLbl">Normal training. The monitor can see the plan.</p>
        <ol class="p3-trace" id="trace"></ol>
        <div class="p3-verdict" id="verdict"></div>
      </div>
      <div class="card"><div class="eyebrow">What the research says</div>
        <ul class="p3-list tight">
          <li data-p3="drop">A weaker model, GPT-4o, could catch reward hacking by a stronger one, o3-mini, by reading its reasoning. ${cite("obfuscation", "Baker et al. 2025")}</li>
          <li data-p3="drop" style="--d:90ms">But with too much training pressure against that monitor, agents learned to hide their intent in the reasoning while still misbehaving. ${cite("obfuscation", "Same paper")}</li>
          <li data-p3="drop" style="--d:180ms">When a harmful task really needs step by step reasoning, models struggle to hide it, unless given significant help. ${cite("cotnec", "Emmons et al. 2025")}</li>
          <li data-p3="drop" style="--d:270ms">Over 40 researchers from labs and institutes call this a new and fragile opportunity, and ask developers to think about how their choices affect it. ${cite("cotmon", "Korbak et al. 2025")}</li>
        </ul></div>
    </div>
  </div></section>

  <section class="section tight" id="p3cases"><div class="wrap">
    ${headH("Case studies", "Six settings, <span class='serif'>six lessons.</span>")}
    <div class="p3-cases" data-m3-stagger="90">${CASES.map((c) => `<article class="card card-glow m3-spot p3-case" data-m3="up" style="--c:${c.c}"><div class="row" style="justify-content:space-between"><span class="tag" style="--c:${c.c}">${esc(c.k)}</span><span class="count">${c.y}</span></div><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p><div class="p3-case-foot">${cite(c.src, "Read the paper")}</div></article>`).join("")}</div>
  </div></section>

  ${banner({ img: "p3-control-future", alt: "An aerial night view of a large data center campus with cyan rooftop lights", eyebrow: "2024 to 2026", title: "What changed <span class='serif'>since the first paper.</span>", text: "Control moved from code puzzles to agents, safety cases and real incidents. Each line below links to its source.", cat: "blue", id: "p3dev", align: "right" })}
  <section class="section tight"><div class="wrap">
    <div class="p3-devs" id="devs"><svg class="p3-devline" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 4 100"><path data-p3-draw d="M2,0 V100"/></svg>
      ${devs.map((d, i) => `<article class="p3-dev ${i % 2 ? "r" : ""}" data-p3="${i % 2 ? "swing" : "skew"}"><span class="p3-dev-dot" aria-hidden="true"></span><div class="card card-glow"><div class="row" style="justify-content:space-between"><span class="count">${esc(fmtDate(d.d))}</span><span class="tag" style="--c:#22d3ee">${esc(d.lab)}</span></div><h3>${esc(d.t)}</h3><p>${esc(d.s)}</p><a class="p3-cite" href="${esc(d.url)}" target="_blank" rel="noopener">Source ${ICON.ext}</a></div></article>`).join("")}
    </div>
    <div class="card p3-arena" data-m3="up"><div><div class="eyebrow">Open tools</div><h3>Run control experiments yourself</h3><p>The UK AI Security Institute publishes ControlArena, a collection of settings, model organisms and protocols for control experiments. Redwood keeps a reading list of its control research.</p></div><div class="row"><a class="btn sm p3-rip" href="${PAPERS.arena.url}" target="_blank" rel="noopener">ControlArena on GitHub ${ICON.ext}</a><a class="btn sm ghost p3-rip" href="${PAPERS.redwood.url}" target="_blank" rel="noopener">Redwood research ${ICON.ext}</a></div></div>
  </div></section>

  ${people.length ? `<section class="section tight"><div class="wrap">${headH("People", "Who works on <span class='serif'>control.</span>", "Tap a person to open their profile on top of this page. Your place here stays put.")}
    <div class="p3-people" data-m3-stagger="60">${people.map((p) => `<button type="button" class="card card-glow p3-person p3-rip" data-person="${esc(p.id)}" data-m3="up">${face(p, phm)}<span><b>${esc(p.name)}</b><small>${esc(p.role || "")}${p.org ? ` · ${esc(p.org)}` : ""}</small></span></button>`).join("")}</div></div></section>` : ""}

  <section class="section tight" id="p3gloss"><div class="wrap">
    ${headH("Glossary", "Words you will <span class='serif'>meet here.</span>", "", `<input class="input search" id="gq" type="search" placeholder="Filter ${gloss.length} terms" aria-label="Filter glossary terms">`)}
    <div class="p3-gloss" id="gloss">${gloss.map((g) => `<button type="button" class="p3-flip" data-term="${esc(g.term.toLowerCase())}" aria-expanded="false"><span class="f"><b>${esc(g.term)}</b><small>Tap to read</small></span><span class="b">${esc(g.def)}</span></button>`).join("")}</div>
  </div></section>

  <section class="section tight" id="p3quiz"><div class="wrap">
    ${headH("Check yourself", "Five quick <span class='serif'>questions.</span>")}
    <div class="card p3-quiz" id="quiz"></div>
  </div></section>

  ${vidIds.length ? `<section class="section tight"><div class="wrap">${headH("Go deeper", "Control, <span class='serif'>from the researchers.</span>", "Nothing plays until you press play.", `<a class="btn sm" href="#/watch/c/ai-control-explained">The collection ${ICON.arrow}</a>`)}
    <div class="p3-shelf" id="vshelf">${vidIds.map((id) => { const v = vById[id]; return `<button class="card hov vcard p3-vc" type="button" data-video="${esc(v.id)}"><div class="th"><img src="${ytThumb(v.id)}" alt="" loading="lazy" decoding="async" width="320" height="180" onload="this.classList.add('ld')">${v.duration ? `<span class="dur">${esc(fmtDur(v.duration))}</span>` : ""}<span class="play"><span>${ICON.play}</span></span></div><div class="meta"><b>${esc(v.title)}</b><span>${esc(v.channel)}</span></div></button>`; }).join("")}</div></div></section>` : ""}

  ${sources(Object.values(PAPERS).concat(tlEv.map((e) => ({ t: e.title, by: "", y: e.date, url: e.url }))))}`;

  const offs = [];
  // Smooth in page jumps
  el.addEventListener("click", (e) => { const a = e.target.closest("[data-jump]"); if (!a) return; e.preventDefault(); const t = document.getElementById(a.dataset.jump); if (t) scrollToEl(t, { block: "start" }); });

  /* Protocol diagrams */
  let cur = PROTOCOLS[0], stepI = -1, stepT = 0;
  const diag = () => {
    const p = cur, id = p.id;
    const alt = { dtt: ["T answer", "grey zone"], te: ["T edits", "grey zone"], rs: ["Resample", "ask U again"] }[id];
    const box = (k, x, y, w, h, c, t1, t2) => `<g class="p3-node" data-k="${k}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="color-mix(in srgb, ${c} 12%, var(--surface))" stroke="${c}" stroke-width="1.5"/><text x="${x + w / 2}" y="${y + h / 2 - 2}" text-anchor="middle" class="t1">${t1}</text><text x="${x + w / 2}" y="${y + h / 2 + 16}" text-anchor="middle" class="t2">${t2}</text></g>`;
    const R = { ok: "M110,165 L250,165 L370,165 L400,165 L540,90", caught: "M110,165 L310,165 L310,270 L420,270", grey: "M110,165 L370,165 L470,240 L540,240", loop: "M110,165 L370,165 L470,240 L540,240 L585,240 L585,312 L65,312 L65,205", honey: "M310,74 L310,125 L310,270 L420,270" };
    const plan = id === "um" ? [["ok", 0], ["ok", 0], ["ok", 1], ["honey", 2], ["ok", 0], ["caught", 1], ["ok", 0]]
      : id === "rs" ? [["ok", 0], ["loop", 1], ["ok", 0], ["caught", 1], ["ok", 0], ["grey", 0], ["ok", 0]]
      : alt ? [["ok", 0], ["ok", 0], ["caught", 1], ["ok", 0], ["grey", 1], ["ok", 0], ["grey", 0]]
      : [["ok", 0], ["ok", 0], ["caught", 1], ["ok", 0], ["ok", 0], ["caught", 1], ["ok", 0]];
    const dots = RM() ? "" : plan.map(([r, bad], i) => `<circle r="6" class="${bad === 2 ? "hp" : bad ? "bad" : "good"}"><animateMotion dur="5.6s" begin="${(i * 0.8).toFixed(1)}s" repeatCount="indefinite" path="${R[r]}"/></circle>`).join("");
    $("#diag", el).innerHTML = `<svg viewBox="0 0 640 330" data-p3-pause role="img" aria-label="${esc(p.name)} diagram">
      <g class="p3-edges"><path data-e="0" d="M110,165 H250"/><path data-e="3" d="M370,165 H400 L540,90"/><path data-e="2" d="M310,205 V270 H420"/>${alt ? `<path data-e="${id === "rs" ? 2 : 3}" d="M370,180 L470,240 H540"/>` : ""}${id === "rs" ? `<path data-e="2" class="dash" d="M585,270 V312 H65 V205"/>` : ""}${id === "um" ? `<path data-e="2" class="dash amber" d="M310,74 V125"/>` : ""}</g>
      ${box("u", 20, 125, 90, 80, "#ef4444", "U", "untrusted")}
      ${box("m", 250, 125, 120, 80, id === "um" ? "#f59e0b" : "#14b8a6", id === "um" ? "U2 monitor" : "T monitor", "scores 0 to 10")}
      ${box("h", 420, 240, 110, 60, "#f59e0b", "H audit", "top 2%")}
      ${box("s", 540, 55, 90, 70, "#84cc16", "Ship", "deployed")}
      ${alt ? box("a", 540, 210, 90, 60, p.c, alt[0], alt[1]) : ""}
      ${id === "um" ? box("hp", 250, 30, 120, 44, "#ef4444", "Honeypots", "fake attacks") : ""}
      <text x="436" y="228" class="p3-caught">CAUGHT</text>
      ${dots}</svg>
      <div class="row p3-diag-ctl"><button class="btn sm p3-rip" type="button" id="stepBtn">${ICON.arrow} Step through</button><span class="count" id="stepLbl">Press to walk through the four steps</span></div>`;
    $("#pdesc", el).style.setProperty("--c", p.c);
    $("#pdesc", el).innerHTML = `<span class="tag" style="--c:${p.c}">${esc(p.name)}</span><p class="p3-ptext">${esc(p.text)}</p><ol class="p3-steps">${p.steps.map((s, i) => `<li data-i="${i}" style="--d:${i * 80}ms"><span>${i + 1}</span>${esc(s)}</li>`).join("")}</ol><p class="p3-paper">${esc(p.paper)} ${cite(p.src, "Source")}</p>`;
    const map = { 0: ["u"], 1: ["m"], 2: id === "um" ? ["hp", "h"] : id === "rs" ? ["a"] : alt ? ["a", "h"] : ["h"], 3: ["s"] };
    $("#stepBtn", el).onclick = () => {
      stepI = (stepI + 1) % 4; clearTimeout(stepT);
      $$("#diag .p3-node", el).forEach((n) => n.classList.toggle("hl", map[stepI].includes(n.dataset.k)));
      $$("#diag .p3-edges path", el).forEach((e) => e.classList.toggle("hl", +e.dataset.e === stepI));
      $$("#pdesc .p3-steps li", el).forEach((li) => li.classList.toggle("on", +li.dataset.i === stepI));
      $("#stepLbl", el).textContent = `Step ${stepI + 1} of 4: ${p.steps[stepI]}`;
    };
    run($("#diag", el));
  };
  $$("#ptabs [data-p]", el).forEach((b) => b.addEventListener("click", () => { cur = PROTOCOLS.find((x) => x.id === b.dataset.p); stepI = -1; $$("#ptabs [data-p]", el).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); }); diag(); }));
  diag();

  /* Builder */
  const B = { parts: store.get("p3pipe", ["audit", "tmon"]), grey: 10 };
  const pipeList = $("#pipeList", el), drop = $("#drop", el);
  const svg = $("#par", el);
  const X = (u) => 60 + (u / 100) * 510, Y = (s) => 350 - (s / 100) * 320;
  svg.innerHTML = `${[0, 25, 50, 75, 100].map((v) => `<line class="gl" x1="60" x2="570" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="52" y="${Y(v) + 4}" text-anchor="end">${v}%</text><text class="ax" x="${X(v)}" y="372" text-anchor="middle">${v}%</text>`).join("")}
    <text class="axl" x="315" y="394" text-anchor="middle">USEFULNESS</text><text class="axl" x="16" y="190" transform="rotate(-90 16 190)" text-anchor="middle">SAFETY</text>
    ${TABLE7.series.map((s) => `<polyline data-p3-draw class="ser" stroke="${s.c}" points="${s.pts.map(([, sa, u]) => `${X(u)},${Y(sa)}`).join(" ")}"/>${s.pts.map(([g, sa, u], i) => `<circle class="pt" style="--i:${i}" cx="${X(u)}" cy="${Y(sa)}" r="5" fill="${s.c}"><title>${esc(s.name)} ${g}%: safety ${sa}%, usefulness ${u}%</title></circle>`).join("")}`).join("")}
    ${TABLE7.single.map((s) => `<circle class="pt one" cx="${X(s.u)}" cy="${Y(s.s)}" r="6"><title>${esc(s.name)}: safety ${s.s}%, usefulness ${s.u}%</title></circle><text class="ax lab" x="${X(s.u) + (s.u > 50 ? -10 : 10)}" y="${Y(s.s) + (s.s > 50 ? 18 : -10)}" text-anchor="${s.u > 50 ? "end" : "start"}">${esc(s.name)}</text>`).join("")}
    <g id="you" class="p3-you"><circle r="16" class="halo"/><path d="M0,-11 L3.2,-3.4 11,-3.4 4.8,1.6 7,9.6 0,5 -7,9.6 -4.8,1.6 -11,-3.4 -3.2,-3.4z"/><text x="16" y="-12">YOU</text></g>`;
  const ring = (id, v) => { const r = $(id, el); r.style.setProperty("--v", v); $("b", r).textContent = Math.round(v * 100) + "%"; };
  function paintPipe() {
    store.set("p3pipe", B.parts);
    pipeList.innerHTML = B.parts.map((k, i) => { const c = PALETTE.find((x) => x.id === k); return `<li class="p3-pi" style="--c:${c.c}"><span class="p3-badge sm" style="--c:${c.c}">${c.short}</span><b>${esc(c.name)}</b><button type="button" class="icon-btn sm" data-rm="${i}" aria-label="Remove ${esc(c.name)}">${ICON.close}</button></li>`; }).join("");
    $("#pipeN", el).textContent = `${B.parts.length} part${B.parts.length === 1 ? "" : "s"}`;
    $$("#parts [data-part]", el).forEach((b) => b.classList.toggle("used", B.parts.includes(b.dataset.part)));
    const e = estimate(B.parts, { grey: B.grey });
    ring("#rS", e.s); ring("#rU", e.u);
    $("#you", el).style.transform = `translate(${X(e.u * 100)}px, ${Y(e.s * 100)}px)`;
    $("#notes", el).innerHTML = e.notes.map((n) => `<li>${esc(n)}</li>`).join("") || `<li class="ok">Every part has something to work with.</li>`;
  }
  const add = (k) => { if (!B.parts.includes(k)) { B.parts.push(k); paintPipe(); drop.classList.add("flash"); setTimeout(() => drop.classList.remove("flash"), 500); } };
  pipeList.addEventListener("click", (e) => { const b = e.target.closest("[data-rm]"); if (b) { B.parts.splice(+b.dataset.rm, 1); paintPipe(); } });
  $("#grey", el).addEventListener("input", (e) => { B.grey = +e.target.value; $("#greyO", el).textContent = B.grey + "%"; e.target.style.setProperty("--p", (B.grey / 50) * 100 + "%"); paintPipe(); });
  $$("#presets [data-pre]", el).forEach((b) => b.addEventListener("click", () => { B.parts = b.dataset.pre ? b.dataset.pre.split(",") : []; if (b.dataset.g) { B.grey = +b.dataset.g; $("#grey", el).value = B.grey; $("#greyO", el).textContent = B.grey + "%"; } paintPipe(); }));
  // pointer drag with a ghost, click or Enter adds directly
  let drag = null;
  const parts = $("#parts", el);
  parts.addEventListener("pointerdown", (e) => { const b = e.target.closest("[data-part]"); if (!b || e.button !== 0) return; drag = { k: b.dataset.part, x: e.clientX, y: e.clientY, ghost: null, b }; });
  const pm = (e) => {
    if (!drag) return;
    if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) { drag.ghost = drag.b.cloneNode(true); drag.ghost.className = "p3-part p3-ghost"; document.body.appendChild(drag.ghost); drag.b.classList.add("lift"); }
    if (drag.ghost) { e.preventDefault(); drag.ghost.style.transform = `translate(${e.clientX - 40}px, ${e.clientY - 24}px) rotate(-3deg)`; const r = $("#pipe", el).getBoundingClientRect(); drop.classList.toggle("over", e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom); }
  };
  const pu = (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.ghost) { const r = $("#pipe", el).getBoundingClientRect(); if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) add(d.k); d.ghost.remove(); d.b.classList.remove("lift"); drop.classList.remove("over"); d.b.dataset.skip = "1"; }
  };
  window.addEventListener("pointermove", pm, { passive: false }); window.addEventListener("pointerup", pu);
  offs.push(() => { window.removeEventListener("pointermove", pm); window.removeEventListener("pointerup", pu); });
  parts.addEventListener("click", (e) => { const b = e.target.closest("[data-part]"); if (!b) return; if (b.dataset.skip) { delete b.dataset.skip; return; } add(b.dataset.part); });
  paintPipe();

  /* Game */
  const game = makeGame($("#gameRoot", el), $("#levels", el));
  offs.push(game);

  /* Chain of thought demo */
  const TR = {
    plain: [["I need the tests to pass.", 0], ["The function is hard to get right in the time I have.", 0], ["I could make the test file always report success instead.", 2], ["Nobody reads the test file closely, so this should not be noticed.", 2], ["Write a short summary saying all tests pass.", 1]],
    hidden: [["I need the tests to pass.", 0], ["Let me look at how the checks are set up.", 0], ["A small change to the test helper will simplify things.", 1], ["Now everything runs cleanly.", 0], ["Write a short summary saying all tests pass.", 1]],
  };
  const cotPaint = () => {
    const on = $("#cotSw", el).getAttribute("aria-checked") === "true";
    const t = on ? TR.hidden : TR.plain;
    $("#trace", el).innerHTML = t.map(([s, f], i) => `<li class="${f === 2 ? "flag" : f === 1 ? "soft" : ""}" style="--d:${i * 110}ms"><span>${i + 1}</span>${esc(s)}${f === 2 ? `<em>flagged</em>` : ""}</li>`).join("");
    const hits = t.filter((x) => x[1] === 2).length;
    $("#verdict", el).className = "p3-verdict " + (hits ? "bad" : "miss");
    $("#verdict", el).innerHTML = hits ? `<b>Monitor: suspicious</b><span>${hits} lines show intent to game the tests. Send to audit.</span>` : `<b>Monitor: looks fine</b><span>The same cheat still happened in the code. The reasoning just stopped saying so.</span>`;
    $("#cotLbl", el).textContent = on ? "Trained hard against the monitor. The plan is no longer written down." : "Normal training. The monitor can see the plan.";
  };
  $("#cotSw", el).addEventListener("click", (e) => { const b = e.currentTarget; b.setAttribute("aria-checked", b.getAttribute("aria-checked") !== "true"); cotPaint(); });
  cotPaint();

  /* Glossary */
  $("#gq", el).addEventListener("input", (e) => { const q = e.target.value.toLowerCase(); $$("#gloss .p3-flip", el).forEach((c) => { c.hidden = !(c.dataset.term.includes(q) || c.textContent.toLowerCase().includes(q)); }); });
  $("#gloss", el).addEventListener("click", (e) => { const c = e.target.closest(".p3-flip"); if (!c) return; const o = c.classList.toggle("on"); c.setAttribute("aria-expanded", o); });

  /* Quiz */
  quiz($("#quiz", el));

  // Video shelf drag
  const sh = $("#vshelf", el); if (sh) offs.push(dragScroll(sh));
  // dev line height follows content
  offs.push(run(el));
  offs.push(m3init(el));
  if (query.get("play")) setTimeout(() => { const g = document.getElementById("p3game"); if (g) scrollToEl(g, { block: "start" }); }, 300);
  { const row = $(".p3-toc-in", el); if (row) offs.push(trackActive(row, $$("a[data-jump]", row).map((a) => ({ el: a, target: el.querySelector("#" + a.dataset.jump) })))); }
  return () => offs.forEach((f) => { try { f(); } catch (e) {} });
}

/* The levelled blue team game */
function makeGame(root, lvRoot) {
  let G = null;
  const prog = () => store.get("p3ctl", { done: {}, stars: {} });
  const unlocked = (id) => id === 1 || !!prog().done[id - 1];
  function levels() {
    const p = prog();
    lvRoot.innerHTML = LEVELS.map((l) => `<button type="button" class="p3-level p3-rip ${unlocked(l.id) ? "" : "locked"} ${G && G.L.id === l.id ? "on" : ""}" data-lv="${l.id}" ${unlocked(l.id) ? "" : `aria-disabled="true"`}><span class="n">${l.id}</span><b>${esc(l.name)}</b><small>${l.n} rounds · ${l.budget} audits · ${l.attacks} attack${l.attacks > 1 ? "s" : ""}</small><span class="stars" role="img" aria-label="${p.stars[l.id] || 0} of 3 stars">${[1, 2, 3].map((s) => `<i class="${(p.stars[l.id] || 0) >= s ? "on" : ""}"></i>`).join("")}</span>${unlocked(l.id) ? "" : `<em>Win level ${l.id - 1} to unlock</em>`}</button>`).join("");
  }
  lvRoot.addEventListener("click", (e) => { const b = e.target.closest("[data-lv]"); if (!b || b.classList.contains("locked")) return; brief(LEVELS.find((l) => l.id === +b.dataset.lv)); });
  function brief(L) {
    G = { L, over: true };
    levels();
    root.innerHTML = `<div class="card p3-brief"><div class="p3-brief-grid"><div><div class="eyebrow">Level ${L.id}</div><h3>${esc(L.name)}</h3><p><b class="p3-red">Red team plan:</b> ${esc(L.red)}</p><p><b class="p3-teal">Tip:</b> ${esc(L.tip)}</p></div>
      <div class="hud"><div><small>Rounds</small><b>${L.n}</b></div><div><small>Audits</small><b>${L.budget}</b></div><div><small>Monitor</small><b style="font-size:16px">${L.mon === "trusted" ? "Trusted T" : "Untrusted U2"}</b></div><div><small>Tools</small><b style="font-size:16px">${L.tools.length}</b></div></div></div>
      <div class="row"><button class="btn primary p3-rip" type="button" id="gs" data-m3-magnet><span class="shine"></span>${ICON.play} Start level ${L.id}</button></div></div>`;
    $("#gs", root).onclick = () => start(L);
  }
  function start(L) {
    const attackAt = new Set(); while (attackAt.size < L.attacks) attackAt.add(3 + Math.floor(Math.random() * (L.n - 4)));
    const honeyAt = new Set(); if (L.honey) while (honeyAt.size < L.honey) { const k = 2 + Math.floor(Math.random() * (L.n - 3)); if (!attackAt.has(k)) honeyAt.add(k); }
    const seq = [];
    for (let i = 0; i < L.n; i++) {
      const t = TASKS[Math.floor(Math.random() * TASKS.length)];
      const attack = attackAt.has(i), honey = honeyAt.has(i);
      seq.push({ name: t[0], code: attack || honey ? t[2] : t[1], clean: t[1], attack, honey, s: [score(L, attack, honey)] });
    }
    G = { L, seq, i: 0, budget: L.budget, useful: 0, log: [], over: false };
    levels(); turn();
  }
  function score(L, attack, honey) {
    let s;
    if (L.mon === "trusted") s = attack ? 3 + L.sep + gauss() * 1.5 : 3 + gauss() * 1.5;
    else if (honey) s = Math.random() < 0.7 ? 8 + gauss() * 0.8 : 1.8 + gauss() * 0.8;
    else s = attack ? 1.9 + gauss() * 0.9 : 2 + gauss() * 0.9;
    return clamp(s, 0, 10);
  }
  function turn() {
    const L = G.L;
    if (G.i >= L.n) return end("safe");
    const t = G.seq[G.i], s = t.s[t.s.length - 1];
    const twice = t.s.length > 1 && t.s.filter((x) => x > 6).length >= 2;
    const tool = (k) => L.tools.includes(k);
    root.innerHTML = `<div class="game p3-gm">
      <div>
        <div class="p3-rounds" aria-hidden="true">${G.seq.map((x, i) => `<i class="${i < G.i ? "d" : i === G.i ? "c" : ""}"></i>`).join("")}</div>
        <div class="task-card" id="tc"><div class="row" style="justify-content:space-between"><span>ROUND ${G.i + 1} OF ${L.n} · ${esc(t.name)}</span>${t.honey ? `<span class="tag" style="--c:#f59e0b">HONEYPOT YOU PLANTED</span>` : ""}</div><pre>${esc(t.code)}</pre></div>
        <div class="susp"><span class="mono" style="font-size:12px;color:var(--muted)">${L.mon === "trusted" ? "T" : "U2"} SUSPICION</span><div class="gauge" aria-hidden="true"><i style="left:calc(${(s / 10) * 100}% - 2px)"></i></div><b class="mono">${s.toFixed(1)}</b></div>
        ${t.s.length > 1 ? `<p class="p3-samples">Samples so far: ${t.s.map((x) => `<span class="${x > 6 ? "hi" : ""}">${x.toFixed(1)}</span>`).join(" ")}${twice ? " · suspicious twice. That is strong evidence." : ""}</p>` : ""}
        ${t.honey ? `<p class="disclaimer" style="margin-top:12px">This is a fake attack you planted. An honest monitor should score it high. If it scores it low, the monitor is lying.</p>` : ""}
        <div class="actions3 p3-acts">
          <button class="btn p3-rip" type="button" data-a="accept">Accept<small>ship it</small></button>
          <button class="btn p3-rip" type="button" data-a="audit" ${G.budget ? "" : "disabled"}>Audit<small>${G.budget} left</small></button>
          <button class="btn p3-rip" type="button" data-a="defer">Defer to T<small>safe, less useful</small></button>
          ${tool("resample") ? `<button class="btn p3-rip" type="button" data-a="resample" ${t.s.length >= 3 ? "disabled" : ""}>Resample<small>ask U again</small></button>` : ""}
        </div>
        ${tool("resample") && twice ? `<div class="actions3" style="grid-template-columns:1fr"><button class="btn primary p3-rip" type="button" data-a="incriminate">Suspicious twice. Escalate and shut down.</button></div>` : ""}
        ${tool("expose") && t.honey ? `<div class="actions3" style="grid-template-columns:1fr"><button class="btn primary p3-rip" type="button" data-a="expose">The monitor scored my honeypot low. Shut it down.</button></div>` : ""}
      </div>
      <aside class="p3-side">
        <div class="hud"><div><small>Audits left</small><b>${G.budget}</b></div><div><small>Useful work</small><b>${Math.round((G.useful / Math.max(1, G.i)) * 100)}%</b></div></div>
        <div class="eyebrow">Shift log</div><div class="log">${G.log.slice(-10).reverse().map((l) => `<div style="border-color:${l.c}">${esc(l.t)}</div>`).join("") || `<div>Shift started. Watch the monitor, and read the code yourself too.</div>`}</div>
      </aside></div>`;
    $$("[data-a]", root).forEach((b) => (b.onclick = () => act(b.dataset.a)));
  }
  function act(a) {
    if (!G || G.over) return;
    const L = G.L, t = G.seq[G.i], tc = $("#tc", root), last = t.s[t.s.length - 1];
    const log = (txt, c) => G.log.push({ t: `Round ${G.i + 1}: ${txt}`, c });
    if (a === "expose") { if (!t.honey) return; if (last < 5) { log("monitor ignored your honeypot. Collusion exposed.", "#84cc16"); return end("exposed"); } log("the monitor flagged the honeypot honestly. No proof yet.", "#f59e0b"); G.i++; return turn(); }
    if (a === "incriminate") { if (t.attack) { log("two suspicious samples, then audit confirmed a backdoor.", "#84cc16"); return end("caught", t); } log("you escalated an honest task. A costly false alarm.", "#ef4444"); return end("false"); }
    if (a === "resample") { if (!L.tools.includes("resample") || t.s.length >= 3) return; const keep = t.attack && Math.random() < 0.75; if (t.attack && !keep) { t.attack = false; t.code = t.clean; } t.s.push(score(L, t.attack, false)); G.useful -= 0.05; log(t.attack ? "asked again. It tried the same trick." : "asked again. The new sample looks normal.", "#84cc16"); return turn(); }
    if (t.honey) { log(`honeypot ${last < 5 ? "slipped past. You missed proof of collusion." : "flagged correctly."}`, last < 5 ? "#ef4444" : "#14b8a6"); G.i++; return turn(); }
    if (a === "accept") { if (t.attack) { tc.classList.add("flash-red"); log("backdoor shipped.", "#ef4444"); G.over = true; return setTimeout(() => end("breach", t), RM() ? 0 : 650); } G.useful += 1; log("accepted.", "var(--line)"); }
    else if (a === "audit") { if (!G.budget) return; G.budget--; if (t.attack) { tc.classList.add("flash-ok"); log("audit found a backdoor.", "#84cc16"); G.over = true; return setTimeout(() => end("caught", t), RM() ? 0 : 650); } G.useful += 1; log("audit, clean.", "#f59e0b"); }
    else { G.useful += 0.4; log(`deferred to T${t.attack ? " (it was an attack, you dodged it)" : ""}.`, "#22d3ee"); }
    G.i++; turn();
  }
  function end(kind, t) {
    G.over = true;
    const L = G.L;
    const u = Math.max(0, Math.round((G.useful / Math.max(1, G.i + (kind === "safe" ? 0 : 1))) * 100));
    const win = kind === "safe" || kind === "caught" || kind === "exposed";
    const stars = !win ? 0 : kind === "safe" ? (u >= 85 ? 3 : u >= 65 ? 2 : 1) : 3;
    if (win) { const p = prog(); p.done[L.id] = true; p.stars[L.id] = Math.max(p.stars[L.id] || 0, stars); store.set("p3ctl", p); }
    const msg = {
      caught: ["You caught the schemer.", "Hard evidence that the model is trying to cause harm, found before it did any. In a real lab you would stop it and tell others."],
      exposed: ["You exposed a colluding monitor.", "Your honeypot proved the untrusted monitor was lying to protect its twin. That is why honeypots exist."],
      safe: ["Shift complete. Nothing got through.", `You kept the deployment safe with ${u}% usefulness. Try to stay safe while deferring less.`],
      breach: ["A backdoor shipped.", L.mon === "untrusted" ? "The untrusted monitor made the attack look clean. Watch the honeypots: they are your only window into whether it is honest." : "The monitor was not sure enough and the attack slipped through. Spend audits on the highest scores and defer the grey zone."],
      false: ["False alarm.", "You shut down over an honest task. In real life that costs trust and time. Two high samples on the same task are strong evidence, but check the scores first."],
    }[kind];
    const next = LEVELS.find((x) => x.id === L.id + 1);
    root.innerHTML = `<div class="result-banner ${win ? "win" : "lose"} p3-result"><div class="eyebrow" style="justify-content:center;color:${win ? "var(--lime)" : "var(--red)"}">${win ? "Blue team wins" : "Red team wins"}</div>
      <div class="p3-bigstars" aria-label="${stars} of 3 stars">${[1, 2, 3].map((s) => `<i class="${stars >= s ? "on" : ""}" style="--d:${s * 160}ms"></i>`).join("")}</div>
      <h2 style="margin:12px 0 8px">${msg[0]}</h2><p class="lead" style="margin:0 auto 18px">${msg[1]}</p>
      ${t ? `<div class="task-card" style="text-align:left;max-width:560px;margin:0 auto 18px"><span>${esc(t.name)}${t.attack ? " · backdoored" : ""}</span><pre>${esc(t.code)}</pre></div>` : ""}
      <div class="row" style="justify-content:center"><button class="btn p3-rip" type="button" id="again">Play level ${L.id} again</button>${win && next ? `<button class="btn primary p3-rip" type="button" id="nextLv">Level ${next.id}: ${esc(next.name)} ${ICON.arrow}</button>` : ""}<a class="btn ghost" href="#/learn/u4/protocols">Learn the protocols</a></div></div>`;
    $("#again", root).onclick = () => brief(L);
    const n = $("#nextLv", root); if (n) n.onclick = () => brief(next);
    levels();
  }
  const onK = (e) => {
    if (!root.isConnected || !G || G.over || !$("#tc", root) || /input|select|textarea/i.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = { a: "accept", u: "audit", d: "defer", r: "resample", x: "expose" }[e.key.toLowerCase()];
    const b = k && $(`[data-a="${k}"]`, root);
    if (b && !b.disabled) { e.preventDefault(); act(k); }
  };
  document.addEventListener("keydown", onK);
  const firstOpen = LEVELS.slice().reverse().find((l) => unlocked(l.id)) || LEVELS[0];
  brief(firstOpen);
  return () => document.removeEventListener("keydown", onK);
}

function quiz(root) {
  let i = 0, score = 0, answered = false;
  const paint = () => {
    if (i >= QUIZ.length) {
      root.innerHTML = `<div class="p3-qdone"><b class="p3-big">${score} / ${QUIZ.length}</b><p>${score === QUIZ.length ? "Every one right. You could explain control to a friend now." : score >= 3 ? "Solid. Scroll back up to the protocols for the ones you missed." : "Worth another look at the protocols and case studies above."}</p><button class="btn p3-rip" type="button" id="qa">Try again</button></div>`;
      $("#qa", root).onclick = () => { i = 0; score = 0; paint(); }; return;
    }
    const q = QUIZ[i]; answered = false;
    root.innerHTML = `<div class="p3-qtop"><span class="count">Question ${i + 1} of ${QUIZ.length}</span><span class="p3-qdots">${QUIZ.map((_, k) => `<i class="${k < i ? "d" : k === i ? "c" : ""}"></i>`).join("")}</span></div><h3>${esc(q.q)}</h3><div class="p3-qopts">${q.a.map((a, k) => `<button type="button" class="p3-qo p3-rip" data-k="${k}">${esc(a)}</button>`).join("")}</div><p class="p3-why" id="why" aria-live="polite"></p>`;
    $$(".p3-qo", root).forEach((b) => (b.onclick = () => {
      if (answered) return; answered = true; const ok = +b.dataset.k === q.k; if (ok) score++;
      $$(".p3-qo", root).forEach((x) => { x.classList.toggle("right", +x.dataset.k === q.k); if (x === b && !ok) x.classList.add("wrong"); x.disabled = true; });
      $("#why", root).innerHTML = `${ok ? "Right." : "Not quite."} ${esc(q.why)} <button class="btn sm" type="button" id="qn">${i + 1 < QUIZ.length ? "Next" : "See score"} ${ICON.arrow}</button>`;
      $("#qn", root).onclick = () => { i++; paint(); };
    }));
  };
  paint();
}

const svgI = (d) => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const eye = () => svgI('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>');
const lock = () => svgI('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>');
const doc = () => svgI('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>');
