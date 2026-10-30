/* Arena: timed quiz rounds built only from verified content on this site. Local leaderboard. Deep links: #/arena/daily, #/arena/<category> */
import { X, people, hero, sec, tocBar, bars, anim, bag, rng, shuffle, today, $, $$, esc, RM, ICON, store } from "./_kit.js";
import { load, arr } from "../../util.js";

const CATS = {
  words: { t: "Words", d: "Glossary terms in plain words", c: "#22d3ee" },
  quotes: { t: "Who said it", d: "Real quotes, real sources", c: "#f59e0b" },
  papers: { t: "Papers", d: "The research shelf", c: "#0ea5e9" },
  history: { t: "History", d: "The warnings timeline", c: "#ef4444" },
  policy: { t: "Laws and rules", d: "The policy tracker", c: "#84cc16" },
  course: { t: "Course", d: "Alignment 101 boss questions", c: "#10b981" },
  numbers: { t: "Numbers", d: "Key figures with dates", c: "#f97316" },
};
const MODES = { quick: { t: "Quick round", d: "10 mixed questions, 20 seconds each.", n: 10, s: 20 }, daily: { t: "Daily challenge", d: "The same 10 questions for everyone today.", n: 10, s: 20 }, cat: { t: "One category", d: "10 questions from the category you pick.", n: 10, s: 20 }, sudden: { t: "Sudden death", d: "12 seconds each. One wrong answer ends it.", n: 40, s: 12 } };

function bank(src) {
  const { gloss, concepts, papers, quotes, timeline, policy, course, numbers, P } = src;
  const Q = [];
  const pickN = (pool, n, r, not) => shuffle(pool.filter((x) => x !== not), r).slice(0, n);
  const mk = (cat, q, right, wrong, why, url, label) => ({ cat, q, right, wrong, why, url, label });
  gloss.forEach((g) => Q.push({ cat: "words", gen: (r) => mk("words", `Which term means: "${g.def}"`, g.term, pickN(gloss.map((x) => x.term), 3, r, g.term), `${g.term}: ${g.def}`, "#/learn", "Glossary") }));
  concepts.filter((c) => !c.glossary).forEach((c) => Q.push({ cat: "words", gen: (r) => mk("words", `Which idea is this: "${c.def}"`, c.label, pickN(concepts.map((x) => x.label), 3, r, c.label), c.def, `#/concepts/${c.id}`, "Concepts map") }));
  const qText = {}; quotes.forEach((q) => (qText[q.text] = (qText[q.text] || 0) + 1));
  const names = [...new Set(quotes.map((q) => q.name))];
  quotes.filter((q) => qText[q.text] === 1 && q.text.length > 40 && q.text.length < 260).forEach((q) => Q.push({ cat: "quotes", gen: (r) => mk("quotes", `Who said: "${q.text}"`, q.name, pickN(names, 3, r, q.name), `${q.name}, ${q.source}${q.date ? `, ${q.date}` : ""}.`, q.url, "Source") }));
  papers.forEach((p) => {
    Q.push({ cat: "papers", gen: (r) => mk("papers", `Which paper is this? "${p.summary}"`, p.title, pickN(papers.map((x) => x.title), 3, r, p.title), `${p.title} (${p.year}). ${p.why}`, p.url, "arXiv") });
    Q.push({ cat: "papers", gen: (r) => { const y = +p.year; const ws = shuffle([y - 3, y - 2, y - 1, y + 1, y + 2].filter((v) => v !== y && v <= 2026), r).slice(0, 3).map(String); return mk("papers", `In which year was "${p.title}" first posted on arXiv?`, p.year, ws, `First posted on ${p.date}.`, p.url, "arXiv"); } });
  });
  timeline.filter((t) => t.date && t.title).forEach((t) => Q.push({ cat: "history", gen: (r) => { const y = +t.date.slice(0, 4); const span = y < 2000 ? [-10, -5, 5, 10, -3] : [-2, -1, 1, 2, -3]; const ws = shuffle(span.map((d) => y + d).filter((v) => v <= 2026 && v !== y), r).slice(0, 3).map(String); return mk("history", `When did this happen: ${t.title}?`, String(y), ws, t.summary, t.url, "Source"); } }));
  const regions = [...new Set(policy.map((p) => p.region))];
  policy.forEach((p) => {
    Q.push({ cat: "policy", gen: (r) => mk("policy", `Where does this come from: ${p.t}?`, p.region, pickN(regions, 3, r, p.region), p.d, p.url, "Official source") });
    Q.push({ cat: "policy", gen: (r) => { const y = +p.date.slice(0, 4); const ws = shuffle([y - 2, y - 1, y + 1, y + 2].filter((v) => v >= 2022 && v <= 2027), r).slice(0, 3).map(String); return mk("policy", `In which year did this begin: ${p.t}?`, String(y), ws, `${p.date}: ${p.d}`, p.url, "Source"); } });
  });
  course.forEach((q) => Q.push({ cat: "course", gen: () => ({ cat: "course", q: q.q, opts: q.o, a: q.a, why: q.why || (q.explain || [])[q.a] || "", url: "#/learn", label: "Alignment 101" }) }));
  numbers.forEach((n) => Q.push({ cat: "numbers", gen: (r) => mk("numbers", n.q, n.a, n.w, n.why, n.url, "Source") }));
  return Q;
}

export async function render(el, params) {
  const B = bag();
  const [gl, C, PA, P, TL, PO, CO, NU] = await Promise.all([load("glossary.json"), X("concepts.json"), X("papers.json"), people(), load("timeline.json"), X("policy.json"), load("course.json", {}), X("numbers.json")]);
  const quotes = P.list.flatMap((p) => (p.quotes || []).map((q) => ({ ...q, name: p.name, rid: p.id })));
  const courseQ = (CO.units || []).flatMap((u) => u.quiz || []).filter((q) => Array.isArray(q.o) && q.o.length >= 2 && typeof q.a === "number");
  const sig = (NU.signatures || []);
  const inv = NU.invest || {};
  const numQ = [];
  const nf = (v) => Number(v).toLocaleString("en-US");
  const spread = (v, ks) => ks.map((k) => nf(Math.round(v * k)));
  sig.forEach((s) => s.v && numQ.push({ q: `${s.k}: about how many ${s.k.includes("Commitments") || s.k.includes("policies") ? "companies" : "signatures"}${s.asof ? ` as of ${s.asof}` : ""}?`, a: nf(s.v), w: spread(s.v, [0.25, 3, 10]), why: `${nf(s.v)}${s.note ? `, ${s.note}` : ""}.`, url: s.url }));
  if (inv.countries) numQ.push({ q: "US private AI investment in 2025, according to the AI Index 2026, in billions of US dollars?", a: String(inv.countries[0][1]), w: ["28.6", "109.1", "1,200"], why: "285.88 billion USD, about 23 times China's 12.41 billion.", url: inv.url });
  if (inv.countries) numQ.push({ q: "Which country had the second largest private AI investment in 2025 (AI Index 2026)?", a: "China", w: ["United Kingdom", "India", "France"], why: "China, with 12.41 billion USD.", url: inv.url });
  if (NU.survey) numQ.push({ q: "In the 2023 survey of AI researchers, by which year did they give a 50% chance of machines beating humans at every task?", a: NU.survey.p50, w: ["2030", "2075", "2100"], why: `${NU.survey.n.toLocaleString("en-US")} researchers answered. The estimate was ${NU.survey.shift} years earlier than the year before.`, url: NU.survey.url });
  const BANK = bank({ gloss: arr(gl, "terms"), concepts: C.nodes || [], papers: PA.papers || [], quotes, timeline: arr(TL, "events"), policy: PO.items || [], course: courseQ, numbers: numQ, P });
  const counts = Object.fromEntries(Object.keys(CATS).map((k) => [k, BANK.filter((q) => q.cat === k).length]));
  const name0 = store.get("x:arena:name", "");
  const G = { mode: "quick", cat: params[0] && CATS[params[0]] ? params[0] : "words", timer: store.get("x:arena:timer", true), on: false };
  if (params[0] === "daily") G.mode = "daily"; else if (params[0] && CATS[params[0]]) G.mode = "cat";

  el.innerHTML = `${hero({ img: "arena", eyebrow: "Arena", title: `Know it? <span class="serif gt">Prove it.</span>`, lead: "Timed quiz rounds built only from things this site has checked: the glossary, real quotes with sources, the papers shelf, the warnings timeline, the policy tracker, the course and dated numbers. Your scores stay in this browser.", stats: [[BANK.length, "questions in the bank"], [Object.keys(CATS).length, "categories"], [Object.keys(MODES).length, "ways to play"]] })}
  ${sec("play", 1, "Play", "Pick a <span class='serif'>mode.</span>", "Keys 1 to 4 answer. You can switch the timer off any time.",
    `<div class="x-arena" id="arena"><div class="x-arena-setup" id="setup">
      <div class="grid g4 x-modes">${Object.entries(MODES).map(([k, m]) => `<button type="button" class="card x-mode card-glow" data-mode="${k}" aria-pressed="${G.mode === k}"><b>${esc(m.t)}</b><span>${esc(m.d)}</span></button>`).join("")}</div>
      <div id="catpick" ${G.mode === "cat" ? "" : "hidden"}><h4>Category</h4><div class="chips">${Object.entries(CATS).map(([k, c]) => `<button class="chip" type="button" data-acat="${k}" aria-pressed="${G.cat === k}" style="--c:${c.c}">${esc(c.t)} <span class="mono">${counts[k]}</span></button>`).join("")}</div></div>
      <div class="row x-arena-go"><label class="sr-only" for="aname">Your name for the leaderboard</label><input class="input" id="aname" maxlength="20" placeholder="Your name (optional)" value="${esc(name0)}"><label class="x-tog"><input type="checkbox" id="atimer" ${G.timer ? "checked" : ""}> Timer</label><button class="btn primary" type="button" id="astart" data-m3-magnet>${ICON.play} Start</button></div><p class="muted x-scoring">How scoring works: a right answer gives 100 points, plus 5 for every second left on the timer, and a streak adds up to 50% more. A wrong answer gives 0. Your name and scores stay in this browser only.</p></div>
      <div class="x-game" id="game" hidden></div></div>`)}
  ${sec("scores", 2, "Leaderboard", "Your best <span class='serif'>rounds.</span>", "Saved only in this browser. Clear it any time.",
    `<div class="grid g2"><div class="card" data-m3="up"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Top 10</h3><button class="btn sm ghost" type="button" id="bclear">Clear</button></div><ol class="x-board" id="board"></ol></div><div class="card" data-m3="up"><h3>Today</h3><p id="dailynote"></p><button class="btn sm" type="button" data-quick="daily">Play the daily challenge</button></div></div>`)}
  ${sec("strengths", 3, "Strengths", "Where you are <span class='serif'>strong.</span>", "Your accuracy in each category across every round you have played here.", `<div id="strong"></div>`)}
  ${sec("how", 4, "How questions are made", "No made up <span class='serif'>facts.</span>", "",
    `<div class="grid g3" data-m3-stagger="80">${Object.entries(CATS).map(([k, c]) => `<div class="card" data-m3="up" style="--c:${c.c}"><span class="tag">${esc(c.t)}</span><p style="margin-top:10px">${esc(c.d)}. ${counts[k]} questions.</p></div>`).join("")}<div class="card" data-m3="up"><p>Every answer screen shows where the fact comes from, with a link. Quotes shared by several people, like open letters, are left out of Who said it.</p></div></div>`)}`;
  B.add(tocBar(el));

  const board = () => store.get("x:arena:board", []);
  function paintBoard() {
    const b = board().slice().sort((x, y) => y.score - x.score).slice(0, 10);
    $("#board", el).innerHTML = b.map((x, i) => `<li><span class="mono">${i + 1}</span><b>${esc(x.name || "You")}</b><span class="muted">${esc(MODES[x.mode]?.t || x.mode)}${x.cat && x.mode === "cat" ? `, ${esc(CATS[x.cat]?.t || "")}` : ""}</span><span class="mono">${x.correct}/${x.total}${x.mode !== "sudden" && x.total < 10 ? `<small class="muted"> ended early</small>` : ""}</span><b class="mono">${x.score.toLocaleString("en-US")}</b></li>`).join("") || `<li class="muted">No rounds yet. Play one.</li>`;
    const d = board().filter((x) => x.mode === "daily" && x.date === today());
    $("#dailynote", el).textContent = d.length ? `You played today's challenge ${d.length} time${d.length > 1 ? "s" : ""}. Best: ${Math.max(...d.map((x) => x.score)).toLocaleString("en-US")} points.` : "You have not played today's challenge yet.";
    const st = store.get("x:arena:stats", {});
    const rows = Object.entries(CATS).filter(([k]) => st[k] && st[k].n).map(([k, c]) => [c.t, Math.round((st[k].ok / st[k].n) * 100), `${st[k].ok} of ${st[k].n}`, c.c]);
    $("#strong", el).innerHTML = rows.length ? bars(rows, { max: 100, unit: "%" }) : `<div class="card"><p class="muted">Play a round to see your strengths.</p></div>`;
    B.add(anim($("#strong", el)));
  }
  paintBoard();

  const game = $("#game", el), setup = $("#setup", el);
  let tick = 0, qs = [], qi = 0, R = null;
  function makeRound() {
    const m = MODES[G.mode]; const r = G.mode === "daily" ? rng("arena-" + today()) : Math.random;
    let pool = G.mode === "cat" ? BANK.filter((q) => q.cat === G.cat) : BANK;
    if (G.mode !== "cat") { const per = {}; pool = shuffle(pool, r).filter((q) => (per[q.cat] = (per[q.cat] || 0) + 1) <= Math.ceil(m.n / 3)); }
    return shuffle(pool, r).slice(0, m.n).map((x) => { const o = x.gen(r); if (o.opts) return o; const opts = shuffle([o.right, ...o.wrong.filter((w) => w !== o.right)].slice(0, 4), r); return { ...o, opts, a: opts.indexOf(o.right) }; });
  }
  function start() {
    G.timer = $("#atimer", el).checked; store.set("x:arena:timer", G.timer); store.set("x:arena:name", $("#aname", el).value.trim());
    qs = makeRound(); qi = 0; R = { score: 0, streak: 0, best: 0, ok: 0, per: {} };
    setup.hidden = true; game.hidden = false; G.on = true; ask();
  }
  function ask() {
    clearInterval(tick);
    const q = qs[qi]; if (!q) return finish();
    const m = MODES[G.mode]; let left = m.s; const c = CATS[q.cat];
    game.innerHTML = `<div class="x-q card" style="--c:${c.c}"><div class="x-q-top"><span class="tag">${esc(c.t)}</span><span class="mono">Question ${qi + 1}${G.mode === "sudden" ? "" : ` of ${qs.length}`}</span><span class="mono">Score <b id="qs">${R.score.toLocaleString("en-US")}</b></span>${R.streak > 1 ? `<span class="x-streak">${R.streak} in a row</span>` : ""}</div>
      ${G.timer ? `<div class="x-timer" aria-hidden="true"><i id="tbar" style="--d:${m.s}s"></i></div><div class="sr-only" aria-live="off" id="tleft"></div>` : ""}
      <h3 class="x-q-t">${esc(q.q)}</h3><div class="x-opts">${q.opts.map((o, i) => `<button type="button" class="x-opt" data-opt="${i}"><span class="mono">${i + 1}</span><span>${esc(o)}</span></button>`).join("")}</div><div class="x-fb" id="fb" aria-live="polite"></div>
      <div class="row" style="justify-content:space-between;margin-top:14px"><button class="btn sm ghost" type="button" id="aquit">End round</button><button class="btn sm primary" type="button" id="anext" hidden>Next ${ICON.arrow}</button></div></div>`;
    const tb = $("#tbar", game); if (tb) requestAnimationFrame(() => tb.classList.add("run"));
    $(".x-opt", game).focus({ preventScroll: true });
    if (G.timer) tick = setInterval(() => { left--; if (left <= 0) { clearInterval(tick); answer(-1); } }, 1000);
    q._t0 = performance.now(); q._s = m.s;
  }
  function answer(i) {
    if (!G.on) return; const q = qs[qi]; if (q._done) return; q._done = true; clearInterval(tick);
    const ok = i === q.a; const left = G.timer ? Math.max(0, q._s - (performance.now() - q._t0) / 1000) : 10;
    $$(".x-opt", game).forEach((b, k) => { b.disabled = true; b.classList.toggle("right", k === q.a); b.classList.toggle("wrong", k === i && !ok); });
    const tb = $("#tbar", game); if (tb) tb.classList.add("stop");
    R.per[q.cat] = R.per[q.cat] || { n: 0, ok: 0 }; R.per[q.cat].n++;
    if (ok) { R.ok++; R.streak++; R.best = Math.max(R.best, R.streak); R.per[q.cat].ok++; const pts = Math.round((100 + left * 5) * (1 + Math.min(R.streak - 1, 5) * 0.1)); R.score += pts; $("#qs", game).textContent = R.score.toLocaleString("en-US"); }
    else R.streak = 0;
    const url = q.url || ""; const internal = url.startsWith("#");
    $("#fb", game).innerHTML = `<p><b class="${ok ? "good" : "bad"}">${ok ? "Correct." : i === -1 ? "Time is up." : "Not this time."}</b> ${ok ? "" : `The answer is <b>${esc(q.opts[q.a])}</b>. `}${esc(String(q.why || "").replace(/^\s*(correct|right|yes|true)\s*[.,:]\s*/i, ""))}</p>${url ? `<a class="x-src" href="${esc(url)}" ${internal ? "" : 'target="_blank" rel="noopener"'}>${esc(q.label || "Source")} ${internal ? ICON.arrow : ICON.ext}</a>` : ""}`;
    const nx = $("#anext", game); nx.hidden = false; nx.textContent = (G.mode === "sudden" && !ok) || qi === qs.length - 1 ? "See results" : "Next"; nx.focus({ preventScroll: true }); requestAnimationFrame(() => { const r = nx.getBoundingClientRect(); if (r.bottom > innerHeight - 16 || r.top < 70) nx.scrollIntoView({ behavior: RM() ? "auto" : "smooth", block: "center" }); });
    if (G.mode === "sudden" && !ok) qi = qs.length - 1;
  }
  function finish() {
    clearInterval(tick); G.on = false;
    const total = Object.values(R.per).reduce((s, x) => s + x.n, 0);
    const entry = { name: $("#aname", el).value.trim() || "You", score: R.score, correct: R.ok, total, mode: G.mode, cat: G.cat, date: today() };
    if (total) { const b = board(); b.push(entry); store.set("x:arena:board", b.sort((x, y) => y.score - x.score).slice(0, 50)); const st = store.get("x:arena:stats", {}); Object.entries(R.per).forEach(([k, v]) => { st[k] = st[k] || { n: 0, ok: 0 }; st[k].n += v.n; st[k].ok += v.ok; }); store.set("x:arena:stats", st); }
    const pct = total ? Math.round((R.ok / total) * 100) : 0;
    game.innerHTML = `<div class="card x-result" data-m3="scale"><div class="eyebrow">Round over</div><h3 class="x-result-n"><b data-m3-count="${R.score}">${R.score.toLocaleString("en-US")}</b> points</h3><p>${R.ok} of ${total} correct (${pct}%). Best streak: ${R.best}.${pct >= 80 ? " Strong round." : pct >= 50 ? " Good. Read the sources you missed and go again." : " Every wrong answer came with a source. Those are the best things to read next."}</p>
      <div class="row" style="margin-top:16px"><button class="btn primary" type="button" id="again">Play again</button><button class="btn" type="button" id="back">Change mode</button><a class="btn ghost" href="#/learn">Study in the course</a></div></div>`;
    B.add(anim(game)); paintBoard();
  }
  el.addEventListener("click", (e) => {
    const md = e.target.closest("[data-mode]"); if (md) { G.mode = md.dataset.mode; $$("[data-mode]", el).forEach((b) => b.setAttribute("aria-pressed", b === md)); $("#catpick", el).hidden = G.mode !== "cat"; return; }
    const ct = e.target.closest("[data-acat]"); if (ct) { G.cat = ct.dataset.acat; $$("[data-acat]", el).forEach((b) => b.setAttribute("aria-pressed", b === ct)); return; }
    if (e.target.closest("#astart")) { start(); return; }
    const op = e.target.closest("[data-opt]"); if (op) { answer(+op.dataset.opt); return; }
    if (e.target.closest("#anext")) { qi++; ask(); return; }
    if (e.target.closest("#aquit")) { finish(); return; }
    if (e.target.closest("#again")) { start(); return; }
    if (e.target.closest("#back")) { game.hidden = true; setup.hidden = false; return; }
    if (e.target.closest("#bclear")) { store.set("x:arena:board", []); store.set("x:arena:stats", {}); paintBoard(); return; }
    const qk = e.target.closest("[data-quick]"); if (qk) { G.mode = "daily"; $$("[data-mode]", el).forEach((b) => b.setAttribute("aria-pressed", b.dataset.mode === "daily")); $("#play", el).scrollIntoView({ behavior: RM() ? "auto" : "smooth" }); start(); }
  });
  const key = (e) => { if (!G.on || /input|textarea|select/i.test(document.activeElement?.tagName || "")) return; const n = +e.key; if (n >= 1 && n <= 4 && !qs[qi]?._done) { e.preventDefault(); answer(n - 1); } };
  document.addEventListener("keydown", key); B.add(() => document.removeEventListener("keydown", key));
  return () => { clearInterval(tick); B.run(); };
}
