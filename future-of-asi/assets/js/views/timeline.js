/* Warnings timeline (Round 3): an almanac. Zoomable, scrubbable explorer with a decade minimap, filters, search,
   play mode, era backgrounds, era comparison, people and video links that open as overlays so the page state stays. */
import { $, $$, esc, load, arr, researchers, videos, fmtDate, ICON, clamp, RM, ytThumb, fmtDur, orgIndex, findOrgId, logoHtml } from "../util.js";
import { hero, banner, headH, sources, run, m3init, m3auto, pic, photoMap, face, debounce } from "../pages3/kit.js";
import { scrollToEl } from "../pages3/kit.js";

const TYPES = {
  warning: ["Warning", "#ef4444"], resignation: ["Warning", "#ef4444"], statement: ["Statement", "#f59e0b"],
  model: ["Capability", "#22d3ee"], capability: ["Capability", "#22d3ee"], breakthrough: ["Capability", "#22d3ee"],
  research: ["Research", "#3b82f6"], paper: ["Research", "#3b82f6"], report: ["Research", "#3b82f6"],
  governance: ["Policy", "#84cc16"], policy: ["Policy", "#84cc16"], summit: ["Policy", "#84cc16"],
  incident: ["Incident", "#f97316"], organization: ["Organisation", "#14b8a6"], org: ["Organisation", "#14b8a6"],
  book: ["Book", "#eab308"], forecast: ["Forecast", "#0ea5e9"], event: ["Event", "#14b8a6"], media: ["Media", "#eab308"],
};
const kind = (t) => TYPES[t] || ["Event", "#14b8a6"];
export function normEvent(e) {
  const date = String(e.date || e.year || "");
  const year = +(e.year || date.slice(0, 4)) || 0;
  const type = String(e.type || e.category || e.kind || "event").toLowerCase();
  const url = e.url || e.source_url || (typeof e.source === "string" && /^https?:/.test(e.source) ? e.source : "") || (Array.isArray(e.sources) && e.sources[0] ? e.sources[0].url || e.sources[0] : "") || "";
  return { id: e.id || "", year, date, title: e.title || e.name || "", text: e.text || e.summary || e.description || e.detail || "", type, people: e.people || e.person_ids || [], url: typeof url === "string" ? url : "", source: e.source_label || e.source_name || "", quote: e.quote && typeof e.quote === "object" ? e.quote.text : e.quote || "" };
}
const ERAS = [
  { id: "e1", a: 1950, b: 1999, name: "The first warnings", img: "p3-era-1950", alt: "A 1950s vacuum tube computer glowing in a dim laboratory", c: "#f59e0b", line: "Before there was a field, a few scientists already named the problem: machines that outthink us might take control, and a machine that improves itself could run away from us." },
  { id: "e2", a: 2000, b: 2013, name: "A small field", img: "p3-era-2000", alt: "A quiet study at night with an old CRT monitor and stacks of books", c: "#eab308", line: "For years the worry lived in a handful of places and a handful of people, writing and arguing mostly online." },
  { id: "e3", a: 2014, b: 2019, name: "Going mainstream", img: "p3-era-2010", alt: "A long aisle of server racks with blue status lights", c: "#22d3ee", line: "A bestselling book, famous scientists speaking out, new labs and the first concrete research agendas brought AI risk into the open." },
  { id: "e4", a: 2020, b: 2022, name: "Scale and the chatbot", img: "p3-era-2020", alt: "An open laptop glowing on a table at night with rain on the window", c: "#3b82f6", line: "Scaling laws showed that bigger models kept getting better. Then a chatbot reached the whole world in weeks." },
  { id: "e5", a: 2023, b: 2024, name: "The world wakes up", img: "p3-era-2023", alt: "An empty summit hall with a round table and microphones at every seat", c: "#84cc16", line: "Open letters, a one line statement on extinction risk, the first government summits, safety institutes, and researchers leaving labs in public." },
  { id: "e6", a: 2025, b: 2026, name: "Race and warning shots", img: "p3-era-2025", alt: "A huge data center under construction at blue hour with power lines", c: "#ef4444", line: "Agents got longer tasks, models resisted shutdown in tests, and real incidents turned old thought experiments into news." },
];
const eraOf = (y) => ERAS.find((e) => y >= e.a && y <= e.b) || ERAS[ERAS.length - 1];
const tOf = (e) => { const p = String(e.date).split("-"); return e.year + (p[1] ? (+p[1] - 1) / 12 : 0.5) + 1 / 24; };

export async function render(el, params, query) {
  const [raw, ppl, vids, phm] = await Promise.all([load("timeline.json"), researchers(), videos(), photoMap(), orgIndex()]);
  const byId = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const ev = arr(raw, "events").map(normEvent).filter((e) => e.year && e.title).sort((a, b) => (a.date || String(a.year)).localeCompare(b.date || String(b.year)));
  ev.forEach((e, i) => {
    e.i = i; e.t = tOf(e); e.k = kind(e.type); e.era = eraOf(e.year);
    e.ppl = e.people.map((id) => byId[id]).filter(Boolean);
    const orgs = new Set(); const fo = findOrgId(e.title); if (fo) orgs.add(fo);
    e.ppl.forEach((p) => { const o = findOrgId(p.org); if (o) orgs.add(o); }); e.orgs = [...orgs];
    e.vids = vids.filter((v) => v.people.some((p) => e.people.includes(p)) && v.year && Math.abs(+v.year - e.year) <= 1).sort((a, b) => Math.abs(+a.year - e.year) - Math.abs(+b.year - e.year)).slice(0, 3);
  });
  if (!ev.length) { el.innerHTML = `<div class="wrap section"><div class="empty-state">The timeline dataset is not loaded yet.</div></div>`; return; }
  const types = [...new Set(ev.map((e) => e.k[0]))];
  const peopleIn = [...new Set(ev.flatMap((e) => e.people))].map((id) => byId[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  const orgIdx = await orgIndex();
  const orgsIn = [...new Set(ev.flatMap((e) => e.orgs))].map((id) => ({ id, name: (orgIdx.byId[id] || orgIdx.man[id] || {}).name || id })).sort((a, b) => a.name.localeCompare(b.name));
  const y0 = ev[0].year, y1 = ev[ev.length - 1].year;
  const gaps = ev.slice(1).map((e, i) => +(e.t - ev[i].t).toFixed(2));
  const S = { q: "", type: "", person: "", org: "", era: "", sel: 0, d0: y0 - 2, d1: y1 + 1.2, playing: false, speed: 3200 };
  const minD = y0 - 3, maxD = y1 + 2;

  const counts = (list) => types.map((t) => [t, list.filter((e) => e.k[0] === t).length]);
  const uniqUrls = [...new Map(ev.filter((e) => e.url).map((e) => [e.url, { t: e.title, y: e.date, url: e.url }])).values()];
  const pplRank = peopleIn.map((p) => [p, ev.filter((e) => e.people.includes(p.id)).length]).sort((a, b) => b[1] - a[1]).slice(0, 12);

  el.innerHTML = `${hero({ img: "p3-tl-hero", alt: "A long glowing corridor of light stretching to a bright amber horizon, with markers on the floor like years", cat: "red",
    eyebrow: "Warnings timeline", title: `${y0} to ${y1}. <span class='serif'>They told us.</span>`,
    lead: "Every major warning, breakthrough, statement, policy moment and incident on the road to superintelligence, in order. Zoom in, scrub through, press play, and notice how the gaps shrink.",
    stats: [{ n: ev.length, label: "moments" }, { n: y1 - y0, label: "years" }, { n: peopleIn.length, label: "people linked" }, { n: uniqUrls.length, label: "sources" }],
    extra: `<div class="row p3-hero-cta" data-m3="up" data-m3-delay="300"><button class="btn primary p3-rip" type="button" id="heroPlay" data-m3-magnet><span class="shine"></span>${ICON.play} Play the story</button><a class="btn ghost p3-rip" href="#tlx" data-jump="tlx">Open the explorer ${ICON.arrow}</a></div>` })}

  <section class="section tight p3-gapsec"><div class="wrap">
    ${headH("The pattern", "The gaps keep <span class='serif'>getting shorter.</span>", "Each bar is the time between one moment and the next. Early on they are decades apart. Now they arrive months, sometimes days, apart.")}
    <div class="card p3-gaps" data-m3="up">${gapChart(ev, gaps)}</div>
    <div class="p3-gapstats" data-m3-stagger="100">${ERAS.map((er) => { const l = ev.filter((e) => e.era === er); const yrs = er.b - er.a + 1; return `<div class="p3-gs" data-m3="up" style="--c:${er.c}"><b data-m3-count="${(l.length / yrs).toFixed(1)}" data-m3-decimals="1">${(l.length / yrs).toFixed(1)}</b><span>per year, ${er.a} to ${er.b}</span></div>`; }).join("")}</div>
  </div></section>

  <section class="section tight" id="tlx"><div class="wrap">
    ${headH("Explorer", "Zoom, scrub, <span class='serif'>play.</span>", "Drag the track to move through time. Use the plus and minus buttons, Ctrl and the wheel, or a pinch to zoom. Arrow keys step, the space bar plays.")}
    <div class="p3-tbar" role="search">
      <input class="input search" id="tq" type="search" placeholder="Search ${ev.length} moments" aria-label="Search the timeline">
      <select class="input" id="tp" aria-label="Person"><option value="">Anyone</option>${peopleIn.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select>
      <select class="input" id="to" aria-label="Organisation"><option value="">Any organisation</option>${orgsIn.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join("")}</select>
      <select class="input" id="te" aria-label="Era"><option value="">Every era</option>${ERAS.map((e) => `<option value="${e.id}">${e.a} to ${e.b}: ${esc(e.name)}</option>`).join("")}</select>
      <span class="count" id="tc"></span>
    </div>
    <div class="chips p3-types" role="group" aria-label="Kind of moment"><button class="chip on" type="button" data-ty="">All kinds</button>${types.map((t) => `<button class="chip" type="button" data-ty="${esc(t)}" style="--c:${Object.values(TYPES).find((x) => x[0] === t)[1]}"><i class="dot-cat" style="background:${Object.values(TYPES).find((x) => x[0] === t)[1]}"></i>${esc(t)}</button>`).join("")}</div>
    <div class="p3-stage" id="stage">
      <div class="p3-stage-bg" aria-hidden="true">${ERAS.map((e, i) => `<div class="p3-ebg" data-era="${e.id}">${pic(e.img, "", { sizes: "100vw" })}</div>`).join("")}</div>
      <div class="p3-stage-top">
        <div class="row p3-zoom"><button class="icon-btn p3-rip" type="button" id="zin" aria-label="Zoom in"><b>+</b></button><button class="icon-btn p3-rip" type="button" id="zout" aria-label="Zoom out"><b>&minus;</b></button><button class="chip" type="button" id="zfit">Fit all</button><button class="chip" type="button" id="zlast">Last 3 years</button></div>
        <div class="row p3-playc"><button class="btn sm primary p3-rip" type="button" id="play" aria-pressed="false">${ICON.play}<span>Play</span></button><select class="input sm" id="speed" aria-label="Play speed"><option value="5200">Slow</option><option value="3200" selected>Normal</option><option value="1700">Fast</option></select></div>
      </div>
      <div class="p3-track" id="track" tabindex="0" role="listbox" aria-label="Timeline track. Use left and right arrows to move between moments">
        <div class="p3-eras" id="eras" aria-hidden="true"></div>
        <div class="p3-ticks" id="ticks" aria-hidden="true"></div>
        <div class="p3-dots" id="dots"></div>
        <div class="p3-head" id="headline" aria-hidden="true"></div>
      </div>
      <div class="p3-scrub"><label class="sr-only" for="scrub">Scrub through moments</label><input type="range" id="scrub" min="0" max="${ev.length - 1}" value="0"><span class="count" id="scrubL"></span></div>
      <div class="p3-mini" id="mini" aria-label="Decade minimap"><div class="p3-mini-ev" id="miniEv"></div><div class="p3-mini-dec">${decades(y0, y1).map((d) => `<button type="button" data-dec="${d}" style="--l:${((d - minD) / (maxD - minD)) * 100}%">${d}s</button>`).join("")}</div><div class="p3-win" id="win" aria-hidden="true"></div></div>
    </div>
    <div class="p3-detail" id="detail" aria-live="polite"></div>
  </div></section>

  <section class="section tight" id="tlcmp"><div class="wrap">
    ${headH("Compare", "Two eras, <span class='serif'>side by side.</span>")}
    <div class="row p3-cmpsel"><select class="input" id="ca" aria-label="First era">${ERAS.map((e, i) => `<option value="${e.id}" ${i === 2 ? "selected" : ""}>${e.a} to ${e.b}: ${esc(e.name)}</option>`).join("")}</select><span class="p3-vs">vs</span><select class="input" id="cb" aria-label="Second era">${ERAS.map((e, i) => `<option value="${e.id}" ${i === 5 ? "selected" : ""}>${e.a} to ${e.b}: ${esc(e.name)}</option>`).join("")}</select></div>
    <div class="p3-cmp" id="cmp"></div>
  </div></section>

  ${ERAS.map((er, i) => { const l = ev.filter((e) => e.era === er); return `${banner({ img: er.img, alt: er.alt, eyebrow: `${er.a} to ${er.b} · ${l.length} moment${l.length === 1 ? "" : "s"}`, title: esc(er.name), text: esc(er.line), cat: "red", align: i % 2 ? "right" : "left" })}
    <section class="section tight p3-erasec" style="--c:${er.c}"><div class="wrap"><div class="p3-erahl" data-m3-stagger="80">${l.slice(0, 6).map((e) => `<button type="button" class="p3-hl p3-rip" data-go="${e.i}" data-m3="up"><span class="y">${esc(e.date.length > 4 ? fmtDate(e.date) : e.year)}</span><b>${esc(e.title)}</b><span class="tag" style="--c:${e.k[1]}">${e.k[0]}</span></button>`).join("")}</div>
    <button class="btn sm ghost p3-rip" type="button" data-explore="${er.id}">Explore this era ${ICON.arrow}</button></div></section>`; }).join("")}

  <section class="section tight"><div class="wrap p3-two">
    <div>${headH("People", "Who shows up <span class='serif'>most.</span>", "Tap a face to open the profile. The timeline stays where you left it.")}
      <div class="p3-rank" data-m3-stagger="50">${pplRank.map(([p, n], i) => `<button type="button" class="p3-trk p3-rip" data-person="${esc(p.id)}" data-m3="left"><span class="n">${i + 1}</span>${face(p, phm)}<span class="nm"><b>${esc(p.name)}</b><small>${esc(p.org || p.role || "")}</small></span><span class="bar" data-p3-bar="${n / pplRank[0][1]}"><i></i></span><em>${n}</em></button>`).join("")}</div></div>
    <div>${headH("Kinds", "What sort of <span class='serif'>moment.</span>")}
      <div class="card p3-donut" data-m3="up">${donut(counts(ev))}</div></div>
  </div></section>

  <section class="section tight" id="tlread"><div class="wrap">
    ${headH("Read it all", "The almanac, <span class='serif'>year by year.</span>", "This list follows the same filters as the explorer above.")}
    <div class="p3-alm" id="alm"></div>
  </div></section>

  ${sources(uniqUrls, "Sources for every moment")}`;

  const offs = [];
  const stage = $("#stage", el), track = $("#track", el), dotsEl = $("#dots", el);
  el.addEventListener("click", (e) => { const a = e.target.closest("[data-jump]"); if (a) { e.preventDefault(); const t = document.getElementById(a.dataset.jump); if (t) scrollToEl(t, { block: "start" }); } });

  // build dots once
  dotsEl.innerHTML = ev.map((e) => `<button type="button" class="p3-dot" role="option" data-i="${e.i}" style="--c:${e.k[1]}" aria-label="${esc(`${e.date.length > 4 ? fmtDate(e.date) : e.year}: ${e.title}`)}"><i></i><span>${esc(e.title)}</span></button>`).join("");
  const dotEls = $$(".p3-dot", dotsEl);
  $("#eras", el).innerHTML = ERAS.map((e) => `<div class="p3-eb" data-e="${e.id}" style="--c:${e.c}"><span>${esc(e.name)}</span></div>`).join("");
  $("#miniEv", el).innerHTML = ev.map((e) => `<i style="left:${((e.t - minD) / (maxD - minD)) * 100}%;--c:${e.k[1]}" data-i="${e.i}"></i>`).join("");

  const match = (e) => {
    const q = S.q.toLowerCase().trim();
    return (!S.type || e.k[0] === S.type) && (!S.person || e.people.includes(S.person)) && (!S.org || e.orgs.includes(S.org)) && (!S.era || e.era.id === S.era)
      && (!q || `${e.title} ${e.text} ${e.year} ${e.ppl.map((p) => p.name).join(" ")} ${e.k[0]}`.toLowerCase().includes(q));
  };
  let list = ev.slice();
  const W = () => track.clientWidth || 800;
  const X = (t) => ((t - S.d0) / (S.d1 - S.d0)) * W();
  function layout() {
    const w = W(); const lanes = [];
    ev.forEach((e) => {
      const d = dotEls[e.i]; const on = list.includes(e); const x = X(e.t);
      d.classList.toggle("off", !on); d.classList.toggle("sel", e.i === S.sel);
      if (x < -40 || x > w + 40) { d.style.visibility = "hidden"; return; }
      d.style.visibility = "";
      let lane = 0; while (lanes[lane] != null && x - lanes[lane] < 22) lane++; if (on) lanes[lane] = x;
      d.style.transform = `translate3d(${x.toFixed(1)}px, ${(-(lane % 7) * 24).toFixed(0)}px, 0)`;
      d.classList.toggle("lbl", on && (S.d1 - S.d0) < 7);
    });
    // eras bands
    $$(".p3-eb", el).forEach((b) => { const er = ERAS.find((x) => x.id === b.dataset.e); const a = X(Math.max(er.a, minD)), c = X(er.b + 1); b.style.transform = `translateX(${a.toFixed(1)}px)`; b.style.width = Math.max(0, c - a).toFixed(1) + "px"; b.classList.toggle("nolbl", c - a < 130); });
    // ticks
    const span = S.d1 - S.d0; const step = span > 50 ? 10 : span > 20 ? 5 : span > 6 ? 1 : span > 2 ? 0.5 : 1 / 12;
    let h = ""; for (let t = Math.ceil(S.d0 / step) * step; t <= S.d1; t += step) { const yy = Math.floor(t + 1e-6), m = Math.round((t - yy) * 12); const big = Math.abs(t - Math.round(t)) < 1e-6 && (step >= 1 ? Math.round(t) % (step >= 5 ? 10 : 5) === 0 : true); h += `<span class="${big ? "big" : ""}" style="transform:translateX(${X(t).toFixed(1)}px)">${step < 1 && m ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m] : yy}</span>`; }
    $("#ticks", el).innerHTML = h;
    const s = ev[S.sel]; $("#headline", el).style.transform = `translateX(${X(s.t).toFixed(1)}px)`;
    const win = $("#win", el); win.style.left = ((S.d0 - minD) / (maxD - minD)) * 100 + "%"; win.style.width = ((S.d1 - S.d0) / (maxD - minD)) * 100 + "%";
  }
  // animated domain
  let tgt = null, raf = 0;
  function setDomain(a, b, instant) {
    const span = clamp(b - a, 0.6, maxD - minD); let c = (a + b) / 2; a = c - span / 2; b = c + span / 2;
    if (a < minD) { b += minD - a; a = minD; } if (b > maxD) { a -= b - maxD; b = maxD; }
    if (instant || RM()) { S.d0 = a; S.d1 = b; tgt = null; layout(); return; }
    tgt = [a, b]; if (!raf) raf = requestAnimationFrame(step);
  }
  function step() { raf = 0; if (!tgt) return; S.d0 += (tgt[0] - S.d0) * 0.18; S.d1 += (tgt[1] - S.d1) * 0.18; if (Math.abs(tgt[0] - S.d0) + Math.abs(tgt[1] - S.d1) < 0.002) { S.d0 = tgt[0]; S.d1 = tgt[1]; tgt = null; } layout(); if (tgt) raf = requestAnimationFrame(step); }
  const zoom = (k, at) => { const a = tgt ? tgt[0] : S.d0, b = tgt ? tgt[1] : S.d1; const c = at != null ? at : (a + b) / 2; setDomain(c - (c - a) * k, c + (b - c) * k); };
  const centerOn = (t) => { const a = tgt ? tgt[0] : S.d0, b = tgt ? tgt[1] : S.d1; const span = b - a; if (t < a + span * 0.15 || t > b - span * 0.15) setDomain(t - span / 2, t + span / 2); };

  function select(i, { center = true, scroll = false } = {}) {
    S.sel = clamp(i, 0, ev.length - 1); const e = ev[S.sel];
    $("#scrub", el).value = S.sel; $("#scrub", el).style.setProperty("--p", (S.sel / (ev.length - 1)) * 100 + "%");
    $("#scrubL", el).textContent = `${S.sel + 1} of ${ev.length} · ${e.date.length > 4 ? fmtDate(e.date) : e.year}`;
    $$(".p3-ebg", el).forEach((b) => b.classList.toggle("on", b.dataset.era === e.era.id));
    stage.style.setProperty("--era", e.era.c);
    dotEls.forEach((d, k) => d.setAttribute("aria-selected", k === S.sel));
    if (center) centerOn(e.t);
    layout(); detail(e);
    if (scroll) scrollToEl(stage, { block: "start" });
  }
  function detail(e) {
    const idx = list.indexOf(e);
    $("#detail", el).innerHTML = `<article class="p3-dcard" style="--c:${e.k[1]}" data-p3="rise">
      <div class="p3-dyear" aria-hidden="true">${e.year}</div>
      <div class="p3-dmain"><div class="row" style="justify-content:space-between"><span class="tag" style="--c:${e.k[1]}">${esc(e.k[0])}</span><span class="count">${esc(e.date.length > 4 ? fmtDate(e.date) : String(e.year))} · ${esc(e.era.name)}</span></div>
        <h3>${esc(e.title)}</h3>${e.text ? `<p>${esc(e.text)}</p>` : ""}${e.quote ? `<blockquote>${esc(e.quote)}</blockquote>` : ""}
        ${e.ppl.length ? `<div class="p3-dpeople">${e.ppl.map((p) => `<button type="button" class="p3-pchip p3-rip" data-person="${esc(p.id)}">${face(p, phm, "p3-face sm")}<span>${esc(p.name)}</span></button>`).join("")}</div>` : ""}
        ${e.orgs.length ? `<div class="chips">${e.orgs.map((o) => `<a class="chip" href="#/orgs?o=${encodeURIComponent(o)}">${logoHtml(o, "", "ologo sm")}${esc((orgIdx.byId[o] || orgIdx.man[o] || {}).name || o)}</a>`).join("")}</div>` : ""}
        <div class="row p3-dnav"><button class="btn sm p3-rip" type="button" data-step="-1" ${idx <= 0 ? "disabled" : ""}>Previous</button><button class="btn sm p3-rip" type="button" data-step="1" ${idx >= list.length - 1 ? "disabled" : ""}>Next ${ICON.arrow}</button>${e.url ? `<a class="btn sm ghost" href="${esc(e.url)}" target="_blank" rel="noopener">Source ${ICON.ext}</a>` : ""}</div></div>
      ${e.vids.length ? `<div class="p3-dvids"><div class="eyebrow">Hear from them</div>${e.vids.map((v) => `<button type="button" class="p3-dv p3-rip" data-video="${esc(v.id)}"><span class="th"><img src="${ytThumb(v.id)}" alt="" loading="lazy" width="320" height="180"><i>${ICON.play}</i></span><span><b>${esc(v.title)}</b><small>${esc(v.channel)}${v.year ? ` · ${v.year}` : ""}${v.duration ? ` · ${esc(fmtDur(v.duration))}` : ""}</small></span></button>`).join("")}</div>` : ""}
    </article>`;
    run($("#detail", el));
  }
  $("#detail", el).addEventListener("click", (e) => { const b = e.target.closest("[data-step]"); if (!b) return; const idx = list.indexOf(ev[S.sel]); const n = list[idx + +b.dataset.step]; if (n) select(n.i); });

  function applyFilters() {
    list = ev.filter(match);
    $("#tc", el).textContent = `${list.length} of ${ev.length}`;
    if (list.length && !list.includes(ev[S.sel])) select(list[0].i); else layout();
    if (list.length && list.length < ev.length) { const a = list[0].t, b = list[list.length - 1].t; setDomain(a - Math.max(0.6, (b - a) * 0.08), b + Math.max(0.6, (b - a) * 0.08)); }
    almanac();
  }
  const fq = debounce(() => applyFilters(), 140);
  $("#tq", el).addEventListener("input", (e) => { S.q = e.target.value; fq(); });
  [["#tp", "person"], ["#to", "org"], ["#te", "era"]].forEach(([s, k]) => $(s, el).addEventListener("change", (e) => { S[k] = e.target.value; applyFilters(); }));
  $$("[data-ty]", el).forEach((b) => b.addEventListener("click", () => { S.type = b.dataset.ty; $$("[data-ty]", el).forEach((x) => x.classList.toggle("on", x === b)); applyFilters(); }));

  // pointer: drag to pan, click dot to select, ctrl wheel zoom, pinch
  let pan = null; const ptrs = new Map();
  track.addEventListener("pointerdown", (e) => { ptrs.set(e.pointerId, e.clientX); if (ptrs.size === 2) { const xs = [...ptrs.values()]; pan = { pinch: Math.abs(xs[0] - xs[1]), d0: S.d0, d1: S.d1 }; return; } pan = { x: e.clientX, d0: S.d0, d1: S.d1, moved: 0 }; });
  const pmove = (e) => {
    if (!pan || !ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, e.clientX);
    if (pan.pinch && ptrs.size === 2) { const xs = [...ptrs.values()]; const k = pan.pinch / Math.max(20, Math.abs(xs[0] - xs[1])); const c = (pan.d0 + pan.d1) / 2, h = ((pan.d1 - pan.d0) / 2) * k; tgt = null; setDomain(c - h, c + h, true); return; }
    const dx = e.clientX - pan.x; pan.moved = Math.max(pan.moved, Math.abs(dx)); if (pan.moved < 4) return;
    track.classList.add("grab"); const dt = (dx / W()) * (pan.d1 - pan.d0); tgt = null; setDomain(pan.d0 - dt, pan.d1 - dt, true);
  };
  const pup = (e) => { ptrs.delete(e.pointerId); if (!pan) return; const p = pan; if (ptrs.size === 0) pan = null; track.classList.remove("grab"); if (!p.pinch && p.moved < 4) { const d = e.target.closest && e.target.closest(".p3-dot"); if (d && !d.classList.contains("off")) select(+d.dataset.i, { center: false }); } };
  window.addEventListener("pointermove", pmove); window.addEventListener("pointerup", pup); window.addEventListener("pointercancel", pup);
  offs.push(() => { window.removeEventListener("pointermove", pmove); window.removeEventListener("pointerup", pup); window.removeEventListener("pointercancel", pup); });
  track.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); const r = track.getBoundingClientRect(); zoom(e.deltaY > 0 ? 1.18 : 0.85, S.d0 + ((e.clientX - r.left) / r.width) * (S.d1 - S.d0)); }
    else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); const dt = (e.deltaX / W()) * (S.d1 - S.d0); setDomain(S.d0 + dt, S.d1 + dt, true); }
  }, { passive: false });
  track.addEventListener("dblclick", (e) => { const r = track.getBoundingClientRect(); zoom(0.5, S.d0 + ((e.clientX - r.left) / r.width) * (S.d1 - S.d0)); });
  track.addEventListener("keydown", (e) => {
    const idx = list.indexOf(ev[S.sel]);
    if (e.key === "ArrowRight" && list[idx + 1]) { e.preventDefault(); select(list[idx + 1].i); }
    else if (e.key === "ArrowLeft" && list[idx - 1]) { e.preventDefault(); select(list[idx - 1].i); }
    else if (e.key === " ") { e.preventDefault(); togglePlay(); }
    else if (e.key === "+" || e.key === "=") zoom(0.7); else if (e.key === "-") zoom(1.4);
  });
  $("#zin", el).onclick = () => zoom(0.6); $("#zout", el).onclick = () => zoom(1.6);
  $("#zfit", el).onclick = () => setDomain(y0 - 2, y1 + 1.2); $("#zlast", el).onclick = () => setDomain(y1 - 2, y1 + 1);
  $("#scrub", el).addEventListener("input", (e) => select(+e.target.value));
  // minimap: click a decade, drag the window
  const mini = $("#mini", el);
  mini.addEventListener("click", (e) => { const b = e.target.closest("[data-dec]"); if (b) { setDomain(+b.dataset.dec - 0.5, +b.dataset.dec + 10.5); return; } });
  let mw = null;
  mini.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-dec]")) return; const r = mini.getBoundingClientRect(); const t = minD + ((e.clientX - r.left) / r.width) * (maxD - minD); const span = S.d1 - S.d0; setDomain(t - span / 2, t + span / 2, true); mw = { r, span }; mini.setPointerCapture(e.pointerId); });
  mini.addEventListener("pointermove", (e) => { if (!mw) return; const t = minD + ((e.clientX - mw.r.left) / mw.r.width) * (maxD - minD); setDomain(t - mw.span / 2, t + mw.span / 2, true); });
  mini.addEventListener("pointerup", () => (mw = null));

  // play mode
  let playT = 0;
  function togglePlay(force) {
    S.playing = force != null ? force : !S.playing;
    const b = $("#play", el); b.setAttribute("aria-pressed", S.playing); $("span", b).textContent = S.playing ? "Pause" : "Play"; b.classList.toggle("on", S.playing);
    clearTimeout(playT);
    if (S.playing) { if ((S.d1 - S.d0) > 12) setDomain(ev[S.sel].t - 4, ev[S.sel].t + 4); tick(); }
  }
  function tick() {
    if (!S.playing || !el.isConnected) return;
    const idx = list.indexOf(ev[S.sel]);
    playT = setTimeout(() => { const n = list[idx + 1]; if (!n) { togglePlay(false); return; } select(n.i); tick(); }, S.speed);
  }
  $("#play", el).onclick = () => togglePlay();
  $("#speed", el).onchange = (e) => { S.speed = +e.target.value; if (S.playing) { clearTimeout(playT); tick(); } };
  $("#heroPlay", el).onclick = () => { if (list[0]) select(list[0].i, { scroll: true }); setTimeout(() => togglePlay(true), RM() ? 0 : 600); };
  const io = new IntersectionObserver((es) => { if (!es[0].isIntersecting && S.playing) togglePlay(false); }); io.observe(stage); offs.push(() => io.disconnect(), () => clearTimeout(playT), () => cancelAnimationFrame(raf));
  const ro = new ResizeObserver(() => layout()); ro.observe(track); offs.push(() => ro.disconnect());

  // era highlights and explore buttons
  el.addEventListener("click", (e) => {
    const g = e.target.closest("[data-go]"); if (g) { select(+g.dataset.go, { scroll: true }); return; }
    const x = e.target.closest("[data-explore]"); if (x) { S.era = x.dataset.explore; S.person = S.org = S.type = S.q = ""; [["#te", S.era], ["#tp", ""], ["#to", ""], ["#tq", ""]].forEach(([k, v]) => { const f = $(k, el); if (f) f.value = v; }); $$("[data-ty]", el).forEach((b) => b.classList.toggle("on", !b.dataset.ty)); applyFilters(); scrollToEl(stage, { block: "start" }); }
  });

  // compare
  function compare() {
    const A = ERAS.find((e) => e.id === $("#ca", el).value), Bq = ERAS.find((e) => e.id === $("#cb", el).value);
    const col = (er) => { const l = ev.filter((e) => e.era === er); const yrs = er.b - er.a + 1; const g = l.slice(1).map((e, i) => e.t - l[i].t); const avg = g.length ? g.reduce((a, b) => a + b, 0) / g.length : 0;
      const c = counts(l).filter((x) => x[1]); const mx = Math.max(1, ...c.map((x) => x[1])); const pp = [...new Set(l.flatMap((e) => e.ppl))].slice(0, 6);
      return { er, l, yrs, avg, html: `<div class="p3-cc" style="--c:${er.c}"><div class="p3-cc-img">${pic(er.img, er.alt, { sizes: "(max-width: 760px) 100vw, 50vw" })}<span>${er.a} to ${er.b}</span></div><h3>${esc(er.name)}</h3>
        <div class="p3-cc-n"><div><b data-m3-count="${l.length}">${l.length}</b><small>moments</small></div><div><b>${(l.length / yrs).toFixed(1)}</b><small>per year</small></div><div><b>${avg ? (avg >= 1 ? avg.toFixed(1) + " y" : Math.max(1, Math.round(avg * 12)) + " mo") : "none"}</b><small>average gap</small></div></div>
        <div class="p3-cc-bars">${c.map(([t, n]) => `<div><span>${esc(t)}</span><i data-p3-bar="${n / mx}" style="--c:${Object.values(TYPES).find((x) => x[0] === t)[1]}"></i><em>${n}</em></div>`).join("")}</div>
        ${pp.length ? `<div class="p3-dpeople">${pp.map((p) => `<button type="button" class="p3-pchip" data-person="${esc(p.id)}">${face(p, phm, "p3-face sm")}<span>${esc(p.name)}</span></button>`).join("")}</div>` : ""}
        <p class="muted">${l.length ? `From &ldquo;${esc(l[0].title)}&rdquo; to &ldquo;${esc(l[l.length - 1].title)}&rdquo;.` : "No moments in this era."}</p></div>` }; };
    const a = col(A), b = col(Bq);
    const ra = a.l.length / a.yrs, rb = b.l.length / b.yrs;
    const fx = (x) => (x >= 10 ? Math.round(x).toLocaleString("en-US") : x.toFixed(1));
    const lineTxt = ra && rb ? (rb > ra ? `${Bq.name} has ${fx(rb / ra)} times as many moments per year as ${A.name}.` : rb < ra ? `${A.name} has ${fx(ra / rb)} times as many moments per year as ${Bq.name}.` : "Both eras move at the same pace.") : "";
    $("#cmp", el).innerHTML = `${a.html}<div class="p3-cmp-mid" aria-hidden="true"><span>vs</span></div>${b.html}<p class="p3-cmp-line">${esc(lineTxt)}</p>`;
    run($("#cmp", el)); m3auto($("#cmp", el));
  }
  $("#ca", el).onchange = compare; $("#cb", el).onchange = compare;

  // almanac list
  function almanac() {
    const byY = {}; list.forEach((e) => (byY[e.year] = byY[e.year] || []).push(e));
    $("#alm", el).innerHTML = Object.keys(byY).sort().map((y) => `<section class="p3-ay"><h3 class="p3-ayr">${y}</h3><div>${byY[y].map((e) => `<article class="p3-ae" style="--c:${e.k[1]}" data-p3="rise"><div class="row"><span class="tag" style="--c:${e.k[1]}">${esc(e.k[0])}</span>${e.date.length > 4 ? `<span class="count">${esc(fmtDate(e.date))}</span>` : ""}</div><h4>${esc(e.title)}</h4>${e.text ? `<p>${esc(e.text)}</p>` : ""}<div class="row">${e.ppl.map((p) => `<button type="button" class="p3-pchip sm" data-person="${esc(p.id)}">${face(p, phm, "p3-face xs")}<span>${esc(p.name)}</span></button>`).join("")}<button type="button" class="chip" data-go="${e.i}">Show on the track</button>${e.url ? `<a class="p3-cite" href="${esc(e.url)}" target="_blank" rel="noopener">Source ${ICON.ext}</a>` : ""}</div></article>`).join("")}</div></section>`).join("") || `<div class="empty-state">No moments match these filters.</div>`;
    run($("#alm", el));
  }

  const yq = query.get("y");
  const start = yq ? (ev.find((e) => String(e.year) === yq) || ev[0]).i : ev.length - 1;
  layout(); select(start, { center: false }); compare(); applyFilters();
  if (yq) setDomain(+yq - 3, +yq + 3, true); else setDomain(y0 - 2, y1 + 1.2, true);
  el._onParams = (p, q) => { const y = q.get("y"); if (y) { const e = ev.find((x) => String(x.year) === y); if (e) select(e.i, { scroll: true }); } };
  offs.push(run(el), m3init(el));
  return () => offs.forEach((f) => { try { f(); } catch (e) {} });
}

function decades(a, b) { const out = []; for (let d = Math.floor(a / 10) * 10; d <= b; d += 10) out.push(d); return out; }
function gapChart(ev, gaps) {
  const w = 1000, h = 220, n = gaps.length, mx = Math.max(...gaps);
  const sc = (g) => (Math.sqrt(g) / Math.sqrt(mx)) * (h - 30);
  const bw = w / n;
  const pts = gaps.map((g, i) => `${(i * bw + bw / 2).toFixed(1)},${(h - sc(g)).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h + 26}" class="p3-gapsvg" role="img" aria-label="Years between consecutive moments, from ${gaps[0]} years at the start to ${gaps[n - 1]} at the end">
    ${gaps.map((g, i) => `<rect class="p3-gb" style="--i:${i}" x="${(i * bw + 2).toFixed(1)}" y="${(h - sc(g)).toFixed(1)}" width="${Math.max(2, bw - 4).toFixed(1)}" height="${Math.max(1, sc(g)).toFixed(1)}" rx="2" fill="${ev[i + 1].k[1]}"><title>${ev[i].year} to ${ev[i + 1].year}: ${g >= 1 ? g.toFixed(1) + " years" : Math.max(0, Math.round(g * 12)) + " months"}</title></rect>`).join("")}
    <polyline data-p3-draw class="p3-gl" points="${pts}"/>
    ${[0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1].map((i, k) => `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${h + 20}" text-anchor="${k === 0 ? "start" : k === 3 ? "end" : "middle"}" class="p3-gx">${ev[i + 1].year}</text>`).join("")}
  </svg>`;
}
function donut(c) {
  const tot = c.reduce((s, x) => s + x[1], 0); let a = -Math.PI / 2; const R = 80, r = 52;
  const col = (t) => Object.values(TYPES).find((x) => x[0] === t)[1];
  const arcs = c.filter((x) => x[1]).map(([t, n], i) => { const da = (n / tot) * Math.PI * 2; const a2 = a + da; const lg = da > Math.PI ? 1 : 0;
    const p = `M${100 + R * Math.cos(a)},${100 + R * Math.sin(a)} A${R},${R} 0 ${lg} 1 ${100 + R * Math.cos(a2)},${100 + R * Math.sin(a2)} L${100 + r * Math.cos(a2)},${100 + r * Math.sin(a2)} A${r},${r} 0 ${lg} 0 ${100 + r * Math.cos(a)},${100 + r * Math.sin(a)}Z`; a = a2;
    return `<path class="p3-arc" style="--i:${i}" d="${p}" fill="${col(t)}"><title>${t}: ${n}</title></path>`; }).join("");
  return `<div class="p3-donut-in"><svg viewBox="0 0 200 200" role="img" aria-label="${esc(c.map((x) => `${x[0]} ${x[1]}`).join(", "))}">${arcs}<text x="100" y="98" text-anchor="middle" class="p3-dn">${tot}</text><text x="100" y="118" text-anchor="middle" class="p3-dl">moments</text></svg>
    <ul>${c.filter((x) => x[1]).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<li><i style="background:${col(t)}"></i>${esc(t)}<b>${n}</b></li>`).join("")}</ul></div>`;
}
