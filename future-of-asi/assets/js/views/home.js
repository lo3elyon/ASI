import { $, $$, esc, load, arr, researchers, videos, countUp, splitWords, avatar, ICON, clamp, RM } from "../util.js";
import { neuralHorizon, morphField } from "../fx.js";
import { mount as mount3 } from "../views3/home3.js";

const SECTIONS = [
  ["futures", "Futures", "Push the sliders and watch six possible futures from 2026 to 2040 grow or shrink.", "cover-futures", "#14b8a6"],
  ["researchers", "Researchers", "The people building and studying AI, their p(doom), timelines, warnings and sourced words.", "cover-voices", "#22d3ee"],
  ["timeline", "Warnings timeline", "From Alan Turing in 1951 to today. Every warning and turning point, in order.", "cover-timeline", "#ef4444"],
  ["watch", "Watch", "A verified video library with collections, filters, theater mode and watch history.", "cover-watch", "#3b82f6"],
  ["control", "AI Control", "Safety even if alignment fails. Play the blue team and catch a scheming model.", "cover-control", "#22d3ee"],
  ["learn", "Alignment 101", "A free course in six units with quizzes, progress and a completion card.", "cover-learn", "#84cc16"],
  ["prepare", "Prepare", "Calm, practical preparation for big AI shocks, with a personal checklist.", "cover-prepare", "#f59e0b"],
  ["orgs", "Organisations", "The labs, institutes and nonprofits working on safety, on a living map.", "cover-orgs", "#14b8a6"],
  ["tools", "Tools", "A p(doom) calculator, an AGI timeline forecaster and a risk dial.", "cover-tools", "#ef4444"],
  ["blog", "Blog", "Essays in my own words on the future of ASI and what we can do.", "cover-blog", "#f59e0b"],
  ["voices", "Voices wall", "The warnings, one at a time, big enough to feel.", "threshold-door", "#f59e0b"],
  ["docs", "Docs", "How the site works, data schemas, how to contribute, a 70 term glossary and FAQ.", "cover-tools", "#3b82f6"],
];

const STEPS = [
  ["1951", "A single thought", "Alan Turing tells a radio audience that thinking machines could one day outstrip us. Almost nobody listens."],
  ["1956 to 2011", "Machines that follow rules", "For decades, AI means hand written rules and narrow programs. Impressive, brittle, and nowhere near us."],
  ["2012 to 2022", "Networks that learn", "Deep learning takes off. Models stop being written and start being grown from data, and they keep getting better with scale."],
  ["2023 to 2026", "Everywhere at once", "Chat models reach hundreds of millions of people. Agents start working on their own. The builders begin to warn us in public."],
  ["2027 and beyond", "The threshold", "What comes next depends on choices made now. We are standing in the doorway."],
];

export async function render(el) {
  const [ppl, vids, tl, fc] = await Promise.all([researchers(), videos(), load("timeline.json"), load("forecasts.json")]);
  const quotes = ppl.flatMap((p) => p.quotes.filter((q) => q.text.length < 240).map((q) => ({ ...q, p })));
  const events = arr(tl, "events");
  const firstYear = events.reduce((m, e) => Math.min(m, +(e.year || String(e.date || "").slice(0, 4)) || 9999), 1951);
  const now = new Date();
  const yearNow = now.getFullYear() + now.getMonth() / 12;
  const totalH = Math.round(vids.reduce((s, v) => s + (v.duration ? v.duration.split(":").reduce((a, b) => a * 60 + +b, 0) : 0), 0) / 3600);
  const forecasts = arr(fc, "forecasts").slice().sort((a, b) => a.year - b.year);

  el.innerHTML = `
  <section class="hero" aria-label="Introduction">
    <div class="heroimg" style="background-image:url('assets/img/hero-horizon.jpg')"></div>
    <canvas class="fx" id="heroFx" aria-hidden="true"></canvas>
    <div class="wrap inner">
      <div class="eyebrow">The future of artificial superintelligence</div>
      <h1 class="reveal-words">${splitWords("We are standing at the", "w", 0.08)} <span class="serif">${splitWords("threshold.", "w gradw", 0.08, 0.4)}</span></h1>
      <p class="lead rv in">The people who built modern AI are warning that machines smarter than us may arrive within years. This is a calm, sourced guide to what they see coming, the futures we could get, and what you can still do about it.</p>
      <div class="row">
        <a class="btn primary" href="#/futures"><span class="shine"></span>Explore the futures ${ICON.arrow}</a>
        <button class="btn ghost" type="button" id="toFilm">${ICON.play} Watch the film</button>
        <a class="btn ghost" href="#/learn">Start the free course</a>
      </div>
      <div class="stat-strip" role="list">
        <div role="listitem"><b data-count="${ppl.length}">0</b><span>researchers and voices</span></div>
        <div role="listitem"><b data-count="${ppl.reduce((s, p) => s + p.quotes.length, 0)}">0</b><span>sourced quotes</span></div>
        <div role="listitem"><b data-count="${vids.length}">0</b><span>verified videos${totalH ? `, ${totalH} hours` : ""}</span></div>
        <div role="listitem"><b data-count="${now.getFullYear() - firstYear}">0</b><span>years of warnings since ${firstYear}</span></div>
      </div>
    </div>
    <div class="scroll-hint" aria-hidden="true">SCROLL<i></i></div>
  </section>

  <section aria-label="Years to AGI by forecaster" class="ribbon" style="--dur:${Math.max(40, forecasts.length * 9)}s">
    <div class="track">${[0, 1].map((k) => forecasts.map((f) => {
      const yrs = f.year - yearNow;
      return `<a class="fc" href="${f.url.startsWith("#") ? f.url : "#/tools/timelines"}" style="--c:${f.c}" ${k ? 'aria-hidden="true" tabindex="-1"' : ""}>
        <span class="yrs">${yrs <= 0.05 ? "now" : yrs < 1 ? "&lt;1" : Math.round(yrs)}<small>${yrs <= 0.05 ? "SAID" : "YEARS"}</small></span>
        <span class="who"><b>${esc(f.who)}</b><span>${esc(f.what)} by ${f.year}</span></span></a>`;
    }).join("")).join("")}</div>
  </section>

  <section class="story" aria-label="How we got here">
    <div class="sticky"><canvas id="morph" aria-hidden="true"></canvas></div>
    <div class="steps wrap">
      ${STEPS.map((s, i) => `<div class="step" data-i="${i}"><div class="box"><div class="yr">${s[0]}</div><h3>${s[1]}</h3><p>${s[2]}</p></div></div>`).join("")}
    </div>
  </section>

  <section class="section" aria-labelledby="gapH">
    <div class="wrap">
      <div class="sec-head"><div><div class="eyebrow">The gap</div><h2 id="gapH">Capability is racing. <span class="serif">Control is walking.</span></h2>
      <p class="lead">This is the picture that worries researchers most: what AI can do grows faster than our ability to check, steer and stop it. Move the slider to see what more safety effort does to the gap.</p></div></div>
      <div class="gap-wrap">
        <div class="card gap-chart rv"><svg id="gapSvg" viewBox="0 0 640 360" role="img" aria-label="Illustrative chart of AI capability versus human control from 2020 to 2040"></svg>
          <div class="gap-legend"><span><i style="background:var(--red)"></i>What AI can do</span><span><i style="background:var(--teal)"></i>What we can control</span><span><i style="background:rgba(239,68,68,.35);height:8px"></i>The gap</span><span class="muted">Illustration, not data</span></div></div>
        <div class="card rv d1" style="display:flex;flex-direction:column;gap:18px">
          <div><div class="eyebrow">Year</div><div class="big-num" id="gapYear">2026</div></div>
          <div><div class="eyebrow" style="color:var(--red)">Gap size</div><div class="meter" style="margin-top:10px"><i id="gapMeter" style="background:linear-gradient(90deg,var(--amber),var(--red))"></i></div><p class="muted" id="gapWord" style="margin:8px 0 0;font-size:14px"></p></div>
          <div class="slider"><label for="safety">Safety effort <output id="safetyOut">25%</output></label><p>Share of AI effort that goes into alignment, control and governance.</p><input type="range" id="safety" min="0" max="100" value="25"></div>
          <div class="slider"><label for="pace">Capability pace <output id="paceOut">fast</output></label><p>How quickly capability grows each year.</p><input type="range" id="pace" min="0" max="100" value="65"></div>
          <button class="btn sm ghost" id="gapPlay" type="button">Replay the years</button>
        </div>
      </div>
    </div>
  </section>

  <section class="section tight" aria-labelledby="qH">
    <div class="wrap sec-head"><div><div class="eyebrow">In their words</div><h2 id="qH">The builders are <span class="serif">warning us.</span></h2></div><a class="btn sm" href="#/voices">Open the voices wall ${ICON.arrow}</a></div>
    ${[0, 1].map((row) => {
      const q = quotes.filter((_, i) => i % 2 === row).slice(0, 18);
      return `<div class="qmarquee ${row ? "rev" : ""}" style="--dur:${q.length * 9}s"><div class="track">${[0, 1].map((k) => q.map((x) => `<a class="qcard" href="#/researchers/${x.p.id}" ${k ? 'aria-hidden="true" tabindex="-1"' : ""}><blockquote>&ldquo;${esc(x.text)}&rdquo;</blockquote><div class="by">${avatar(x.p)}<span><b>${esc(x.p.name)}</b><br>${esc(x.date || "")}</span></div></a>`).join("")).join("")}</div></div>`;
    }).join("")}
  </section>

  <section class="section" id="film" aria-labelledby="filmH">
    <div class="wrap">
      <div class="sec-head"><div><div class="eyebrow">The film</div><h2 id="filmH">Threshold, <span class="serif">in under a minute.</span></h2><p class="lead">A short motion piece about where we are and what is at stake. Sound is optional.</p></div></div>
      <div class="film rv"><video src="assets/video/launch.mp4" poster="assets/video/launch-poster.jpg" controls preload="none" playsinline aria-label="Threshold launch film"></video></div>
    </div>
  </section>

  <section class="section" aria-labelledby="exH">
    <div class="wrap">
      <div class="sec-head"><div><div class="eyebrow">Explore</div><h2 id="exH">Twelve rooms <span class="serif">behind the door.</span></h2></div></div>
      <div class="grid g3">${SECTIONS.map((s, i) => `<a class="card hov spot entry rv d${i % 3}" href="#/${s[0]}" style="--c:${s[4]}"><div class="covw"><div class="cov" style="background-image:url('assets/img/sm/${s[3]}.jpg')"></div></div><div class="body"><span class="num">${String(i + 1).padStart(2, "0")}</span><h3>${s[1]}</h3><p>${s[2]}</p><span class="go">Open ${ICON.arrow}</span></div></a>`).join("")}</div>
    </div>
  </section>

  <section class="section tight"><div class="wrap"><div class="callout rv"><div><div class="eyebrow">Start here</div><h2 style="margin-top:8px">Understand it in an evening.</h2><p class="lead">Alignment 101 is free, has no maths, saves your progress in your browser and ends with a completion card you can download.</p></div><a class="btn primary" href="#/learn"><span class="shine"></span>Begin unit one ${ICON.arrow}</a></div></div></section>`;

  $("#toFilm", el).addEventListener("click", () => { const f = $("#film", el); f.scrollIntoView({ behavior: RM() ? "auto" : "smooth" }); const v = $("video", f); setTimeout(() => v.play().catch(() => {}), RM() ? 0 : 700); });
  // counters
  $$("[data-count]", el).forEach((b) => countUp(b, +b.dataset.count));

  // hero canvas
  const hero = $(".hero", el);
  const heroProg = () => clamp(-hero.getBoundingClientRect().top / hero.offsetHeight, 0, 1);
  const stopHero = neuralHorizon($("#heroFx", el), heroProg);

  // scroll story
  const story = $(".story", el);
  const steps = $$(".step", el);
  let stage = 0;
  const stopMorph = morphField($("#morph", el), () => stage);
  const onScroll = () => {
    const mid = innerHeight * 0.55;
    let idx = 0, f = 0;
    steps.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top <= mid) { idx = i; f = clamp((mid - r.top) / r.height, 0, 1); } });
    stage = Math.min(4, idx + (idx < 4 ? clamp((f - 0.6) / 0.4, 0, 1) : 0));
    steps.forEach((s, i) => s.classList.toggle("on", i === idx));
    if (RM() && stopMorph.kick) stopMorph.kick();
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // gap chart
  const stopGap = gapChart(el);
  try { await mount3(el); } catch (e) { console.warn("home3", e); }
  try { const b4 = await import("../views3/brief4.js"); await b4.mount(el); } catch (e) { console.warn("brief4", e); }

  return () => { stopHero(); stopMorph(); stopGap(); removeEventListener("scroll", onScroll); };
}

function gapChart(el) {
  const svg = $("#gapSvg", el), safety = $("#safety", el), pace = $("#pace", el);
  const X0 = 50, X1 = 620, Y0 = 320, Y1 = 20, years = [2020, 2040];
  const xs = (y) => X0 + ((y - years[0]) / (years[1] - years[0])) * (X1 - X0);
  const ys = (v) => Y0 - (v / 100) * (Y0 - Y1);
  let shown = 2026, raf = 0, playing = false;
  const cap = (y) => { const k = 0.12 + (+pace.value / 100) * 0.22; return clamp(4 * Math.exp(k * (y - 2020)), 0, 100); };
  const ctl = (y) => { const s = +safety.value / 100; const k = 0.05 + s * 0.3; return clamp(4 * Math.exp(k * (y - 2020)) * (0.85 + s * 0.2), 0, cap(y) * (0.45 + s * 0.6)); };
  function draw() {
    const pts = []; for (let y = years[0]; y <= years[1] + 0.001; y += 0.25) pts.push(y);
    const vis = pts.filter((y) => y <= shown);
    const capP = vis.map((y) => `${xs(y).toFixed(1)},${ys(cap(y)).toFixed(1)}`);
    const ctlP = vis.map((y) => `${xs(y).toFixed(1)},${ys(ctl(y)).toFixed(1)}`);
    const area = capP.length ? `M${capP.join("L")}L${ctlP.slice().reverse().join("L")}Z` : "";
    const grid = [2020, 2025, 2030, 2035, 2040].map((y) => `<line x1="${xs(y)}" x2="${xs(y)}" y1="${Y1}" y2="${Y0}" stroke="var(--line)"/><text x="${xs(y)}" y="${Y0 + 22}" text-anchor="middle" font-size="12" fill="var(--muted)" font-family="JetBrains Mono, monospace">${y}</text>`).join("");
    const hz = `<line x1="${X0}" x2="${X1}" y1="${ys(70)}" y2="${ys(70)}" stroke="var(--amber)" stroke-dasharray="4 6" opacity=".7"/><text x="${X0 + 6}" y="${ys(70) - 8}" font-size="12" fill="var(--amber)" font-family="JetBrains Mono, monospace">HUMAN EXPERT LEVEL (ILLUSTRATIVE)</text>`;
    const cx = xs(shown), cy = ys(cap(shown)), ky = ys(ctl(shown));
    svg.innerHTML = `${grid}${hz}<line x1="${X0}" x2="${X1}" y1="${Y0}" y2="${Y0}" stroke="var(--line-2)"/>
      <defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef4444" stop-opacity=".45"/><stop offset="1" stop-color="#f59e0b" stop-opacity=".12"/></linearGradient></defs>
      <path d="${area}" fill="url(#gg)"/>
      <polyline points="${capP.join(" ")}" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
      <polyline points="${ctlP.join(" ")}" fill="none" stroke="#14b8a6" stroke-width="3" stroke-linecap="round"/>
      <line x1="${cx}" x2="${cx}" y1="${cy}" y2="${ky}" stroke="var(--text)" stroke-dasharray="2 4" opacity=".7"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="#ef4444"><animate attributeName="r" values="5;8;5" dur="1.6s" repeatCount="indefinite"/></circle>
      <circle cx="${cx}" cy="${ky}" r="6" fill="#14b8a6"/>`;
    const gap = cap(shown) - ctl(shown);
    $("#gapYear", el).textContent = Math.floor(shown);
    $("#gapMeter", el).style.width = `${clamp(gap, 0, 100)}%`;
    $("#gapWord", el).textContent = gap < 8 ? "Small. Control keeps up with what AI can do." : gap < 16 ? "Narrow. Oversight is only a little behind." : gap < 30 ? "Growing. Oversight is falling behind." : gap < 50 ? "Wide. Systems can do far more than we can check." : "Huge. We would be trusting what we cannot verify.";
    $("#safetyOut", el).textContent = `${safety.value}%`;
    $("#paceOut", el).textContent = +pace.value < 34 ? "slow" : +pace.value < 67 ? "steady" : "fast";
    [safety, pace].forEach((r) => r.style.setProperty("--p", `${r.value}%`));
  }
  function play() {
    if (RM()) { shown = 2040; draw(); return; }
    cancelAnimationFrame(raf); playing = true; shown = 2020; const t0 = performance.now();
    const step = (t) => { shown = clamp(2020 + ((t - t0) / 6000) * 20, 2020, 2040); draw(); if (shown < 2040 && playing) raf = requestAnimationFrame(step); else playing = false; };
    raf = requestAnimationFrame(step);
  }
  [safety, pace].forEach((r) => r.addEventListener("input", () => { if (!playing) draw(); }));
  $("#gapPlay", el).addEventListener("click", play);
  draw();
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.4 });
  io.observe(svg);
  return () => { cancelAnimationFrame(raf); io.disconnect(); };
}
