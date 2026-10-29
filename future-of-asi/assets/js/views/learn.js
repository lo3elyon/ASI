import { $, $$, esc, load, arr, md, pageHero, store, ICON, toast, RM } from "../util.js";

const P = () => store.get("course", { done: {}, quiz: {}, name: "" });
const save = (p) => store.set("course", p);
const ring = (pct, c = "var(--accent)", size = 54) => { const r = size / 2 - 5, C = 2 * Math.PI * r; return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="5"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="${size / 4.4}" font-family="JetBrains Mono, monospace" fill="var(--text)">${Math.round(pct * 100)}%</text></svg>`; };

export function normResource(r) {
  return { title: r.title || r.name || "", url: r.url || r.link || "", type: String(r.type || r.category || r.kind || "other").toLowerCase(), by: r.org || r.author || r.authors || r.provider || r.by || "", text: r.line || r.description || r.summary || r.why || r.note || "", free: r.free, level: r.level || "" };
}

export async function render(el, params, query) {
  const course = await load("course.json", {});
  const units = course.units || [];
  const allLessons = units.flatMap((u) => u.lessons.map((l) => ({ ...l, u })));

  let onS = null;
  async function show(p) {
    if (onS) { removeEventListener("scroll", onS); onS = null; }
    window.scrollTo(0, 0);
    if (p[0] === "certificate") return cert();
    const u = units.find((x) => x.id === p[0]);
    if (u && p[1] === "quiz") return quiz(u);
    if (u) { const l = u.lessons.find((x) => x.id === p[1]) || u.lessons[0]; return lesson(u, l); }
    return overview(query.get("tab"));
  }
  el._onParams = (p, q) => { query = q; show(p); };

  const stats = () => { const pr = P(); const done = allLessons.filter((l) => pr.done[l.id]).length; const quizzes = units.filter((u) => (pr.quiz[u.id] || 0) >= Math.ceil(u.quiz.length * 0.75)).length; return { done, quizzes, pct: (done + quizzes) / Math.max(1, allLessons.length + units.length), complete: done === allLessons.length && quizzes === units.length }; };

  async function overview(tab) {
    const st = stats(); const pr = P();
    const mins = allLessons.reduce((s, l) => s + (l.mins || 3), 0);
    const nextL = allLessons.find((l) => !pr.done[l.id]);
    el.innerHTML = `${pageHero({ img: "cover-learn", eyebrow: "Alignment 101", title: "Understand the problem <span class='serif'>in one evening.</span>", lead: `${course.subtitle || ""} ${units.length} units, ${allLessons.length} lessons, about ${Math.round(mins / 5) * 5} minutes of reading, ${units.reduce((s, u) => s + u.quiz.length, 0)} quiz questions. Your progress stays in your browser.`, extra: `<div class="row" style="margin-top:24px"><a class="btn primary" href="#/learn/${nextL ? nextL.u.id + "/" + nextL.id : "certificate"}"><span class="shine"></span>${st.done ? (st.complete ? "Get your completion card" : "Continue where you left off") : "Begin unit one"} ${ICON.arrow}</a>${ring(st.pct, "var(--lime)", 64)}</div>` })}
    <section class="section tight"><div class="wrap">
      <div class="chips" role="tablist" style="margin-bottom:24px"><button class="chip ${tab !== "resources" ? "on" : ""}" role="tab" type="button" data-tab="course">Course</button><button class="chip ${tab === "resources" ? "on" : ""}" role="tab" type="button" data-tab="resources">Resources to go deeper</button></div>
      <div id="tabBody"></div>
    </div></section>`;
    $$("[data-tab]", el).forEach((b) => b.onclick = () => { history.replaceState(null, "", b.dataset.tab === "resources" ? "#/learn?tab=resources" : "#/learn"); overview(b.dataset.tab); });
    if (tab === "resources") return resources($("#tabBody", el));
    $("#tabBody", el).innerHTML = `<div class="units">${units.map((u, i) => {
      const d = u.lessons.filter((l) => pr.done[l.id]).length; const qs = pr.quiz[u.id]; const passed = (qs || 0) >= Math.ceil(u.quiz.length * 0.75);
      const pct = (d + (passed ? 1 : 0)) / (u.lessons.length + 1);
      return `<a class="card hov spot unit rv" href="#/learn/${u.id}/${(u.lessons.find((l) => !pr.done[l.id]) || u.lessons[0]).id}" style="--c:${u.c}"><span class="n">${i + 1}</span><div><h3 style="margin:0 0 4px">${esc(u.title)}</h3><p style="margin:0">${esc(u.summary)}</p><div class="row" style="margin-top:10px;gap:8px">${u.lessons.map((l) => `<span class="tag" style="--c:${pr.done[l.id] ? "#14b8a6" : "var(--muted)"}">${pr.done[l.id] ? "DONE " : ""}${esc(l.title)}</span>`).join("")}<span class="tag" style="--c:${passed ? "#84cc16" : "#f59e0b"}">QUIZ ${qs != null ? qs + "/" + u.quiz.length : ""}</span></div></div>${ring(pct, u.c)}</a>`;
    }).join("")}</div>
    <div class="callout" style="margin-top:30px"><div><div class="eyebrow">Completion card</div><h3 style="margin:8px 0">Finish every lesson and pass each quiz with 3 of 4 or better.</h3><p class="muted" style="margin:0">Then put your name on a card you can download and share. ${st.done}/${allLessons.length} lessons and ${st.quizzes}/${units.length} quizzes so far.</p></div><a class="btn ${st.complete ? "primary" : ""}" href="#/learn/certificate">${st.complete ? "Make my card" : "Preview the card"} ${ICON.arrow}</a></div>`;
    import("../util.js").then((m) => m.reveal(el));
  }

  async function resources(host) {
    const raw = await load("resources.json");
    let items = [];
    if (Array.isArray(raw)) items = raw;
    else if (raw && typeof raw === "object") Object.entries(raw).forEach(([k, v]) => { if (Array.isArray(v)) v.forEach((x) => items.push({ type: x.type || k, ...x })); });
    items = items.map(normResource).filter((r) => r.title && r.url);
    if (!items.length) { host.innerHTML = `<div class="empty-state">The resources list is not loaded yet.</div>`; return; }
    const types = [...new Set(items.map((r) => r.type))];
    host.innerHTML = `<div class="toolbar"><input class="input search" id="rq" type="search" placeholder="Search ${items.length} courses, papers, books, fellowships and more" aria-label="Search resources"><span class="count" id="rcount"></span></div>
      <div class="chips" style="margin:-8px 0 20px"><button class="chip on" data-rt="all" type="button">All</button>${types.map((t) => `<button class="chip" data-rt="${esc(t)}" type="button">${esc(t[0].toUpperCase() + t.slice(1))}</button>`).join("")}</div><div class="grid gauto" id="rlist"></div>`;
    let t = "all", q = "";
    const paint = () => {
      const r = items.filter((x) => (t === "all" || x.type === t) && `${x.title} ${x.by} ${x.text}`.toLowerCase().includes(q.toLowerCase()));
      $("#rcount", host).textContent = `${r.length} items`;
      $("#rlist", host).innerHTML = r.map((x) => `<a class="card hov spot" href="${esc(x.url)}" target="_blank" rel="noopener" style="color:var(--text);display:flex;flex-direction:column;gap:8px"><div class="row" style="justify-content:space-between"><span class="tag">${esc(x.type)}</span>${x.free === true ? `<span class="tag" style="--c:#84cc16">free</span>` : ""}</div><b style="font-family:var(--f-display);font-size:17px">${esc(x.title)}</b>${x.by ? `<span class="muted" style="font-size:13px">${esc(Array.isArray(x.by) ? x.by.join(", ") : x.by)}</span>` : ""}${x.text ? `<p style="font-size:14px">${esc(x.text)}</p>` : ""}<span class="go" style="margin-top:auto;color:var(--accent);font-size:13.5px;font-weight:600">Open ${ICON.ext}</span></a>`).join("");
    };
    $("#rq", host).oninput = (e) => { q = e.target.value; paint(); };
    $$("[data-rt]", host).forEach((b) => b.onclick = () => { t = b.dataset.rt; $$("[data-rt]", host).forEach((x) => x.classList.toggle("on", x === b)); paint(); });
    paint();
  }

  function toc(curId) {
    const pr = P();
    return `<nav class="toc" aria-label="Course contents"><a href="#/learn">${ICON.arrow.replace("M5 12h14M13 6l6 6-6 6", "M19 12H5M11 6l-6 6 6 6")} All units</a>${units.map((u, i) => `<div class="uh">Unit ${i + 1}</div>${u.lessons.map((l) => `<a href="#/learn/${u.id}/${l.id}" class="${l.id === curId ? "on" : ""}" ${l.id === curId ? 'aria-current="page"' : ""}><span class="ck ${pr.done[l.id] ? "done" : ""}"></span>${esc(l.title)}</a>`).join("")}<a href="#/learn/${u.id}/quiz" class="${curId === u.id + "-quiz" ? "on" : ""}"><span class="ck ${(pr.quiz[u.id] || 0) >= Math.ceil(u.quiz.length * 0.75) ? "done" : ""}"></span>Unit ${i + 1} quiz</a>`).join("")}<a href="#/learn/certificate"><span class="ck ${stats().complete ? "done" : ""}"></span>Completion card</a></nav>`;
  }

  function lesson(u, l) {
    const idx = allLessons.findIndex((x) => x.id === l.id);
    const ui = units.indexOf(u), li = u.lessons.indexOf(l);
    const last = li === u.lessons.length - 1;
    const next = last ? `#/learn/${u.id}/quiz` : `#/learn/${u.id}/${u.lessons[li + 1].id}`;
    const prev = idx > 0 ? (li === 0 ? `#/learn/${units[ui - 1].id}/quiz` : `#/learn/${u.id}/${u.lessons[li - 1].id}`) : "#/learn";
    const done = !!P().done[l.id];
    el.innerHTML = `<div class="readbar" id="rb"></div><section class="section tight"><div class="wrap lesson-layout">${toc(l.id)}
      <article class="prose" style="--c:${u.c}"><div class="eyebrow" style="color:${u.c}">Unit ${ui + 1} · Lesson ${li + 1} · ${l.mins || 3} min read</div><h1 style="margin-top:12px">${esc(l.title)}</h1>
        <div class="keyidea"><div class="eyebrow">Key idea</div><p>${esc(l.key)}</p></div>${md(l.body)}
        <div class="row" style="margin-top:34px;justify-content:space-between"><a class="btn ghost" href="${prev}">Back</a><button class="btn primary" type="button" id="doneBtn"><span class="shine"></span>${done ? "Next" : "Mark complete and continue"} ${ICON.arrow}</button></div>
      </article></div></section>`;
    $("#doneBtn", el).onclick = () => { const p = P(); p.done[l.id] = true; save(p); if (!done) toast("Lesson complete. Progress saved in your browser."); location.hash = next; };
    onS = () => { const a = $("article", el); if (!a) return; const r = a.getBoundingClientRect(); const span = r.height - innerHeight; const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1; $("#rb", el).style.width = `${p * 100}%`; };
    addEventListener("scroll", onS, { passive: true });
  }

  function quiz(u) {
    const ui = units.indexOf(u);
    el.innerHTML = `<section class="section tight"><div class="wrap lesson-layout">${toc(u.id + "-quiz")}
      <div><div class="eyebrow" style="color:${u.c}">Unit ${ui + 1} quiz</div><h1 style="font-size:clamp(32px,4.5vw,50px);margin-top:12px">${esc(u.title)}</h1><p class="lead">Pick one answer for each question. You need ${Math.ceil(u.quiz.length * 0.75)} of ${u.quiz.length} to pass. You can retry as often as you like.</p>
      <div class="quiz" id="qz">${u.quiz.map((q, i) => `<div class="card qq" data-i="${i}"><h4>${i + 1}. ${esc(q.q)}</h4><div class="opts">${q.o.map((o, j) => `<button class="opt" type="button" data-j="${j}">${esc(o)}</button>`).join("")}</div><p class="why">${esc(q.why)}</p></div>`).join("")}</div>
      <div id="qres" style="margin-top:22px"></div></div></div></section>`;
    let right = 0, answered = 0;
    $$(".qq", el).forEach((card) => {
      const q = u.quiz[+card.dataset.i];
      $$(".opt", card).forEach((b) => b.onclick = () => {
        if (card.classList.contains("done")) return;
        card.classList.add("done"); answered++;
        const j = +b.dataset.j; if (j === q.a) right++;
        $$(".opt", card).forEach((x) => { x.disabled = true; if (+x.dataset.j === q.a) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); });
        if (answered === u.quiz.length) finish();
      });
    });
    function finish() {
      const p = P(); p.quiz[u.id] = Math.max(p.quiz[u.id] || 0, right); save(p);
      const pass = right >= Math.ceil(u.quiz.length * 0.75);
      const nextU = units[ui + 1];
      $("#qres", el).innerHTML = `<div class="result-banner ${pass ? "win" : "lose"}"><h2 style="margin:0 0 8px">${right} of ${u.quiz.length}${pass ? ". Unit passed." : ". Not quite."}</h2><p class="lead" style="margin:0 auto 16px">${pass ? (nextU ? "On to the next unit." : "That was the last unit. Your completion card is ready.") : "Read the explanations above and try again. There is no limit."}</p><div class="row" style="justify-content:center">${pass ? `<a class="btn primary" href="${nextU ? `#/learn/${nextU.id}/${nextU.lessons[0].id}` : "#/learn/certificate"}">${nextU ? "Start unit " + (ui + 2) : "Make my card"} ${ICON.arrow}</a>` : ""}<button class="btn ghost" type="button" id="retry">Retry quiz</button></div></div>`;
      $("#retry", el).onclick = () => quiz(u);
      if (pass && !RM()) confetti();
    }
  }

  function cert() {
    const st = stats(); const pr = P();
    el.innerHTML = `<section class="section tight"><div class="wrap lesson-layout">${toc("cert")}
      <div><div class="eyebrow">Completion card</div><h1 style="font-size:clamp(32px,4.5vw,50px);margin-top:12px">${st.complete ? "You walked through the door." : "Almost there."}</h1>
      <p class="lead">${st.complete ? "Type your name as you want it on the card, then download it as a PNG." : `You have finished ${st.done} of ${allLessons.length} lessons and passed ${st.quizzes} of ${units.length} quizzes. Here is a preview of your card. It unlocks when everything is done.`}</p>
      <div class="row" style="margin:18px 0"><label class="sr-only" for="cn">Your name</label><input class="input" id="cn" style="flex:1 1 260px" maxlength="48" placeholder="Your name" value="${esc(pr.name || "")}"><button class="btn primary" type="button" id="dl" ${st.complete ? "" : "disabled"}>${ICON.dl} Download PNG</button></div>
      <div class="cert-wrap"><canvas id="cv" width="1600" height="1000" aria-label="Completion card preview"></canvas></div>
      <p class="muted" style="font-size:13px;margin-top:12px">A personal milestone card, not an accredited qualification.</p></div></div></section>`;
    const cv = $("#cv", el);
    const draw = () => drawCert(cv, $("#cn", el).value.trim() || "Your name", st.complete, units.length, allLessons.length);
    $("#cn", el).oninput = () => { const p = P(); p.name = $("#cn", el).value; save(p); draw(); };
    $("#dl", el).onclick = () => { draw(); const a = document.createElement("a"); a.download = `threshold-alignment-101-${($("#cn", el).value || "card").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`; a.href = cv.toDataURL("image/png"); a.click(); toast("Card downloaded."); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(draw);
  }
  await show(params);
  return () => { if (onS) removeEventListener("scroll", onS); };
}

function drawCert(cv, name, complete, nUnits, nLessons) {
  const c = cv.getContext("2d"), W = cv.width, H = cv.height;
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#07111f"); g.addColorStop(1, "#0b2233"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const rg = c.createRadialGradient(W * 0.78, H * 0.72, 0, W * 0.78, H * 0.72, 520); rg.addColorStop(0, "rgba(245,158,11,.35)"); rg.addColorStop(0.4, "rgba(34,211,238,.12)"); rg.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = rg; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 240; i++) { c.fillStyle = `rgba(34,211,238,${Math.random() * 0.5})`; const x = Math.random() * W, y = H * 0.72 + Math.random() * H * 0.28; c.fillRect(x, y, 2, 2); }
  c.strokeStyle = "rgba(34,211,238,.9)"; c.lineWidth = 3; c.beginPath(); c.moveTo(80, H * 0.72); c.lineTo(W - 80, H * 0.72); c.stroke();
  // door mark
  const dx = W * 0.78, dy = H * 0.72; c.lineWidth = 10; c.lineCap = "round"; const gr = c.createLinearGradient(dx - 90, dy - 300, dx + 90, dy); gr.addColorStop(0, "#22d3ee"); gr.addColorStop(1, "#14b8a6"); c.strokeStyle = gr;
  c.beginPath(); c.moveTo(dx - 90, dy); c.lineTo(dx - 90, dy - 200); c.arc(dx, dy - 200, 90, Math.PI, 0); c.lineTo(dx + 90, dy); c.stroke();
  const sg = c.createRadialGradient(dx, dy - 30, 0, dx, dy - 30, 70); sg.addColorStop(0, "#fef3c7"); sg.addColorStop(0.4, "rgba(245,158,11,.8)"); sg.addColorStop(1, "rgba(245,158,11,0)"); c.fillStyle = sg; c.beginPath(); c.arc(dx, dy - 30, 70, 0, 7); c.fill();
  c.strokeStyle = "rgba(148,190,230,.25)"; c.lineWidth = 2; c.strokeRect(40, 40, W - 80, H - 80);
  c.fillStyle = "#22d3ee"; c.font = "500 26px 'JetBrains Mono', monospace"; c.fillText("THRESHOLD  ·  ALIGNMENT 101", 110, 150);
  c.fillStyle = "#b9c9da"; c.font = "400 34px Inter, sans-serif"; c.fillText("This card celebrates that", 110, 250);
  c.fillStyle = "#e6f0fa"; let fs = 112; c.font = `italic 400 ${fs}px 'Instrument Serif', Georgia, serif`; while (c.measureText(name).width > W * 0.58 && fs > 50) { fs -= 4; c.font = `italic 400 ${fs}px 'Instrument Serif', Georgia, serif`; } c.fillText(name, 106, 380);
  c.fillStyle = "#b9c9da"; c.font = "400 34px Inter, sans-serif";
  ["completed every lesson and quiz of Alignment 101:", `${nUnits} units and ${nLessons} lessons on superintelligence, alignment,`, "AI control, governance and what we can do."].forEach((t, i) => c.fillText(t, 110, 470 + i * 50));
  c.fillStyle = "#8aa0b8"; c.font = "500 24px 'JetBrains Mono', monospace";
  c.fillText(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }).toUpperCase(), 110, H - 140);
  c.fillText("LO3ELYON.GITHUB.IO/ASI/FUTURE-OF-ASI", 110, H - 100);
  c.fillStyle = "#f59e0b"; c.font = "italic 400 34px 'Instrument Serif', Georgia, serif"; c.fillText("Start big, fix later, keep shipping.", W - 640, H - 100);
  if (!complete) { c.save(); c.translate(W / 2, H / 2); c.rotate(-0.2); c.fillStyle = "rgba(239,68,68,.22)"; c.font = "700 150px 'Space Grotesk', sans-serif"; c.textAlign = "center"; c.fillText("PREVIEW", 0, 40); c.restore(); }
}

function confetti() {
  const cv = document.createElement("canvas"); cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:140"; document.body.appendChild(cv);
  const c = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
  const cols = ["#14b8a6", "#22d3ee", "#f59e0b", "#84cc16", "#3b82f6"];
  const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.6, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 6, r: Math.random() * 6 + 3, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6 }));
  let f = 0; const step = () => { c.clearRect(0, 0, cv.width, cv.height); ps.forEach((p) => { p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.a += 0.2; c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.c; c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); c.restore(); }); if (++f < 120) requestAnimationFrame(step); else cv.remove(); };
  requestAnimationFrame(step);
}
