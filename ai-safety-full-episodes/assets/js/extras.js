/* AI Safety Full Episodes · Explore: learning paths (curated sequences from basics to depth), a Quote wall of key claims
 * with jump-to-time, Debate mode (side-by-side stance cards per speaker) and a Speaker map of organisation affiliations.
 * Built by Aniruddha Adak. */
(function (A) {
  "use strict";
  const { $, $$, esc, STATE, fold, fmtTime, hoursStr } = A;
  const h = () => A.hist;
  const ui = () => A.ui;
  const LV = { Intro: 0, Intermediate: 1, "Deep-dive": 2 };
  const text = (e) => fold([e.title, e.summary, e.tags.join(" "), e.topics.join(" "), e.whyWatch || ""].join(" "));
  const PATHS = [
    { id: "basics", icon: "🧭", name: "Start here: AI risk basics", desc: "Why serious people worry, explained from the ground up.", re: /(p\(doom\)|loss of control|extinction|existential|risk|superintelligence|why .* worried|alignment problem)/, level: ["Intro", "Intermediate"] },
    { id: "interp", icon: "🔬", name: "Interpretability", desc: "Looking inside models: features, circuits and what they reveal.", re: /(interpretab|mechanistic|circuit|sparse autoencoder|features|chain-of-thought monitor)/ },
    { id: "evals", icon: "🧪", name: "Evals and dangerous capabilities", desc: "How labs and auditors test for deception, scheming and reward hacking.", re: /(eval|scheming|deceptive|deception|reward hacking|sandbagging|red.?team|sandbox escape|evaluation awareness)/ },
    { id: "policy", icon: "🏛️", name: "Policy and governance", desc: "Regulation, compute governance, treaties and what lawmakers are hearing.", re: /(policy|governance|regulat|treaty|international agreement|compute governance|hearing|senate|congress|ban)/ },
    { id: "insiders", icon: "🗝️", name: "Inside the labs", desc: "Whistleblowers, resignations and lab culture in their own words.", re: /(whistleblow|resign|lab culture|insider|fired|openai|anthropic|deepmind)/ },
    { id: "debates", icon: "⚔️", name: "Hear both sides", desc: "Debates and sceptics, so you can test the arguments.", re: /(debate|sceptic|skeptic|versus| vs\.? |optimis)/, fmt: ["debate", "panel"] },
  ];
  function pathEps(p) {
    return STATE.all.filter((e) => (p.fmt && p.fmt.includes(e.fmt)) || p.re.test(text(e))).filter((e) => !p.level || p.level.includes(e.level))
      .sort((a, b) => (LV[a.level] || 0) - (LV[b.level] || 0) || (b.views || 0) - (a.views || 0)).slice(0, 6);
  }
  function pathsHTML() {
    return `<div class="paths">${PATHS.map((p) => { const eps = pathEps(p); if (eps.length < 2) return ""; const done = eps.filter((e) => h().stateOf(e.id) === "done").length;
      return `<article class="path" data-path="${p.id}"><header><span class="path__ic">${p.icon}</span><div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.desc)}</p></div><span class="path__prog" title="${done} of ${eps.length} watched"><b>${done}</b>/${eps.length}</span></header>
        <ol class="path__steps">${eps.map((e, i) => `<li class="${h().stateOf(e.id) === "done" ? "is-done" : ""}" data-id="${e.id}"><span class="path__n">${h().stateOf(e.id) === "done" ? "✓" : i + 1}</span><button class="linkbtn" data-act="open">${esc(e.title)}</button><small>${ui().metaText(e)} · ${esc(ui().whoLine(e, 2))} · ${esc(e.level)}</small></li>`).join("")}</ol>
        <div class="path__act"><button class="btn btn--sm btn--primary" data-pathgo="${p.id}">${ui().ICON.play}<span>${done ? "Continue path" : "Start path"}</span></button><button class="btn btn--sm" data-pathq="${p.id}">${ui().ICON.queue}<span>Queue all</span></button><span class="muted">${hoursStr(eps.reduce((a, e) => a + e.dur, 0))}</span></div></article>`; }).join("")}</div>`;
  }
  /* Quote wall: key claims with the speaker, jump straight to the moment */
  let qf = "";
  function quotes() {
    const out = [];
    STATE.all.forEach((e) => e.claims.forEach((c) => { if (!c.text || c.text.length < 40) return; const p = c.speaker ? e.people.find((x) => fold(c.speaker).startsWith(fold(x.name))) : null; if (!p || p.host) return; out.push({ e, c, p }); }));
    return out;
  }
  function quoteHTML() {
    const all = quotes(); const f = fold(qf);
    const list = all.filter((x) => !f || fold(x.c.text + " " + x.p.name + " " + x.e.title).includes(f)).slice(0, 60);
    return `<div class="qwall__bar"><input class="input input--sm" type="search" id="qwQ" placeholder="Filter ${all.length} quotes by words or speaker" value="${esc(qf)}" aria-label="Filter quotes"></div>
      <div class="qwall" id="qwList">${list.map((x) => `<figure class="quote" data-id="${x.e.id}"><blockquote>“${esc(x.c.text)}”</blockquote><figcaption><a href="#/speaker/${esc(x.p.slug)}">${ui().avatar(x.p.name, 30)}<b>${esc(x.p.name)}</b></a><button class="quote__t" data-qjump="${x.e.id}|${x.c.t == null ? 0 : x.c.t}" aria-label="Play from ${x.c.t == null ? "start" : fmtTime(x.c.t)}">${ui().ICON.play}${x.c.t == null ? "Play" : fmtTime(x.c.t)}</button><small>${esc(x.e.title.slice(0, 70))}${x.e.title.length > 70 ? "…" : ""}</small></figcaption></figure>`).join("") || `<p class="muted">No quotes match.</p>`}</div>`;
  }
  /* Debate mode: side-by-side stance cards for each speaker in a debate */
  function debatesHTML() {
    const ds = STATE.all.filter((e) => e.fmt === "debate" || (e.tags || []).includes("debate")).slice(0, 8);
    if (!ds.length) return `<p class="muted">No debates in the library yet.</p>`;
    return ds.map((e) => {
      const sp = e.people.filter((p) => !p.host).slice(0, 4);
      const cols = sp.map((p) => { const cl = e.claims.filter((c) => c.speaker && fold(c.speaker).startsWith(fold(p.name))).slice(0, 3); return `<div class="stance"><header>${ui().avatar(p.name, 44, "av--ring")}<div><b>${esc(p.name)}</b><small>${esc((ui().speakerOf(p.name) || {}).org || p.desc || "")}</small></div></header>${cl.length ? `<ul>${cl.map((c) => `<li><button class="quote__t" data-qjump="${e.id}|${c.t == null ? 0 : c.t}">${c.t == null ? "▶" : fmtTime(c.t)}</button>${esc(c.text)}</li>`).join("")}</ul>` : `<p class="muted">Watch to hear this side's case.</p>`}</div>`; }).join(`<span class="vs" aria-hidden="true">vs</span>`);
      return `<article class="debate" data-id="${e.id}"><h3><button class="linkbtn" data-act="open">${esc(e.title)}</button></h3><p class="muted">${ui().metaText(e)} · ${esc(ui().showLine(e))}</p><div class="stances">${cols}</div><div class="path__act"><button class="btn btn--sm btn--primary" data-act="play">${ui().ICON.play}<span>Watch the debate</span></button></div></article>`;
    }).join("");
  }
  /* Speaker map: researchers around the organisations they appear with (radial SVG network) */
  function mapHTML() {
    const res = Array.from(STATE.speakers.values()).filter((s) => !s.isHost && s.eps.length && s.org && s.org !== "Host");
    const orgC = new Map(); res.forEach((s) => { const o = s.org.split(/[\/;,(]/)[0].trim(); if (o.length > 1) orgC.set(o, (orgC.get(o) || []).concat(s)); });
    const orgs = Array.from(orgC.entries()).filter(([, l]) => l.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 12);
    const W = 1000, H = 880, cx = W / 2, cy = H / 2, R1 = 150, R2 = 280;
    let nodes = "", edges = "", labels = "";
    const total = orgs.reduce((a, [, l]) => a + Math.min(l.length, 7), 0); let k = 0;
    orgs.forEach(([o, l], i) => {
      const ang = (i / orgs.length) * Math.PI * 2 - Math.PI / 2; const ox = cx + Math.cos(ang) * R1, oy = cy + Math.sin(ang) * R1;
      const members = l.sort((a, b) => b.eps.length - a.eps.length).slice(0, 7);
      members.forEach((s) => {
        const a2 = (k++ / total) * Math.PI * 2 - Math.PI / 2; const sx = cx + Math.cos(a2) * R2, sy = cy + Math.sin(a2) * R2;
        edges += `<line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" class="smap__e"/>`;
        const img = (ui().photoOf(s.name) || {}).src || "assets/cover.jpg";
        nodes += `<a href="#/speaker/${esc(s.slug)}" class="smap__s"><title>${esc(s.name)} · ${esc(s.org)} · ${s.eps.length} episode${s.eps.length === 1 ? "" : "s"}</title><clipPath id="cp-${esc(s.slug)}"><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="17"/></clipPath><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="19" class="smap__ring"/><image href="${esc(img)}" x="${(sx - 17).toFixed(1)}" y="${(sy - 17).toFixed(1)}" width="34" height="34" clip-path="url(#cp-${esc(s.slug)})" preserveAspectRatio="xMidYMid slice"/></a>`;
        { /* radial labels: each name reads outward along its own spoke, so neighbours never overlap */
          const deg = (a2 * 180) / Math.PI, left = Math.cos(a2) < 0, lx = cx + Math.cos(a2) * (R2 + 25), ly = cy + Math.sin(a2) * (R2 + 25);
          labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" dy="3.5" text-anchor="${left ? "end" : "start"}" transform="rotate(${(left ? deg + 180 : deg).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})" class="smap__sl">${esc(s.name)}</text>`; }
      });
      nodes += `<g class="smap__o"><circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="${(10 + Math.min(16, l.length * 1.6)).toFixed(1)}"/><text x="${ox.toFixed(1)}" y="${(oy + 4).toFixed(1)}" text-anchor="middle">${esc(o.length > 16 ? o.slice(0, 15) + "…" : o)}</text></g>`;
    });
    return `<div class="smap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Network of researchers and their organisations">${edges}${nodes}${labels}</svg></div><p class="muted">Inner ring: organisations (size = researchers in the library). Outer ring: researchers, linked to their main affiliation. Click a face to open their page.</p>`;
  }
  function renderExplore() {
    const v = $('.view[data-view="explore"]'); if (!v) return;
    v.innerHTML = `<header class="phead"><p class="eyebrow">Explore</p><h1>Paths, quotes, debates and the people map</h1><p class="lede">Curated ways into the library: follow a learning path from basics to depth, skim the strongest claims and jump to the moment, compare both sides of a debate, or see who works where.</p>
      <nav class="seg seg--sm explore__nav" aria-label="Explore sections"><a class="chip" href="#ex-paths">🧭 Learning paths</a><a class="chip" href="#ex-quotes">❝ Quote wall</a><a class="chip" href="#ex-debates">⚔️ Debate mode</a><a class="chip" href="#ex-map">🕸️ Speaker map</a></nav></header>
      <section class="panel panel--flat" id="ex-paths"><div class="panel__hd"><h2><span class="shelf__ic">🧭</span>Learning paths</h2></div>${pathsHTML()}</section>
      <section class="panel panel--flat" id="ex-quotes"><div class="panel__hd"><h2><span class="shelf__ic">❝</span>Quote wall</h2></div>${quoteHTML()}</section>
      <section class="panel panel--flat" id="ex-debates"><div class="panel__hd"><h2><span class="shelf__ic">⚔️</span>Debate mode</h2></div>${debatesHTML()}</section>
      <section class="panel panel--flat" id="ex-map"><div class="panel__hd"><h2><span class="shelf__ic">🕸️</span>Speaker map</h2></div>${mapHTML()}</section>`;
  }
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest && ev.target.closest('.view[data-view="explore"] .explore__nav a'); if (t) { ev.preventDefault(); const el = $(t.getAttribute("href")); el && el.scrollIntoView({ behavior: A.RM ? "auto" : "smooth" }); return; }
    const j = ev.target.closest && ev.target.closest("[data-qjump]"); if (j) { const [id, tt] = j.dataset.qjump.split("|"); A.player.jumpTo(id, Number(tt) || 0); return; }
    const g = ev.target.closest && ev.target.closest("[data-pathgo], [data-pathq]");
    if (g) {
      const p = PATHS.find((x) => x.id === (g.dataset.pathgo || g.dataset.pathq)); const eps = pathEps(p);
      const ids = eps.map((e) => e.id); const L = h().L;
      const q = L.QUEUE.filter((x) => !ids.includes(x)); h().setQueue(ids.filter((x) => h().stateOf(x) !== "done").concat(q)); A.views.paintQueueCount();
      if (g.dataset.pathgo) { const nx = eps.find((e) => h().stateOf(e.id) !== "done") || eps[0]; A.player.play(nx.id); }
      else ui().toast(`Queued the “${esc(p.name)}” path`, { icon: "🧭", ms: 1800 });
      A.fx && A.fx.celebrate("queue", g, true);
    }
  });
  document.addEventListener("input", (ev) => { if (ev.target.id === "qwQ") { qf = ev.target.value; const box = $("#qwList"); if (box) { const tmp = document.createElement("div"); tmp.innerHTML = quoteHTML(); box.replaceWith(tmp.querySelector("#qwList")); } } });
  A.explore = { render: renderExplore, PATHS, pathEps, quotes };
})(window.ASFE);
