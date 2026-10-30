/* Learn, Round 3 blocks on the course overview: unit art, progress rings, a study plan, spaced repetition review of key terms,
   time per unit, and the sources the course stands on. Progress is read from the same localStorage the course uses. */
import { $, $$, esc, load, arr, ICON, toast, store } from "../util.js";
import { P, lessonDone, bossPassed } from "../learn/game.js";
import { pic, banner, sec, host, fmtN, fx3, ring, bars } from "./kit.js";
import { auto } from "../core/motion3.js";

const ALT = {
  u1: "A lattice of glowing cyan threads rising from a dark plain at sunrise",
  u7: "Teal light flowing through etched channels on a dark circuit board",
  u2: "A hedge maze at night with one amber path leading to a dead end",
  u3: "A glass cube with a web of blue light fibres being scanned by a beam",
  u4: "A data centre corridor with a gateway of red and cyan scanning lasers",
  u8: "A test laboratory with a machine surrounded by lime green measuring lasers",
  u5: "An empty round conference hall with a glowing world map on the floor",
  u9: "A hilltop observatory under an amber sky with branching light paths below",
  u6: "A village community hall at night with supplies stacked and a red lantern",
  u10: "A mountain trail at sunrise with glowing lime trail markers and a backpack",
};
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
const today = () => Math.floor(Date.now() / 864e5);

export async function mountUnit(el, u) {
  if (!u || el.querySelector(".v3-unitban")) return;
  const d = document.createElement("div"); d.className = "v3-unitban"; d.setAttribute("data-cat", "lime");
  d.innerHTML = `<div class="im">${pic("unit-" + u.id, ALT[u.id] || "", { sizes: "(max-width: 900px) 100vw, 900px" })}</div>`;
  const anchor = el.querySelector(".lesson-layout > div:last-child") || el.querySelector(".lesson-layout");
  if (anchor) anchor.prepend(d);
}

export async function mount(el) {
  const [course, gl] = await Promise.all([load("course.json", {}), load("glossary.json")]);
  const units = (course.units || []).map((u, i) => ({ ...u, n: u.n || i + 1, lessons: u.lessons || [] }));
  if (!units.length) return;
  const pr = P();
  const G = Object.fromEntries(arr(gl, "terms").map((g) => [String(g.term).toLowerCase(), g]));
  const cards = []; const seen = new Set();
  units.forEach((u) => u.lessons.forEach((l) => (l.key_terms || []).forEach((t) => { const g = G[String(t).toLowerCase()]; if (g && !seen.has(g.term)) { seen.add(g.term); cards.push({ id: g.term, term: g.term, def: g.def, u }); } })));
  const srcs = {}; units.forEach((u) => u.lessons.forEach((l) => (l.sources || []).forEach((s) => { if (s.url) { const h = host(s.url); srcs[h] = (srcs[h] || 0) + 1; } })));
  const mins = units.map((u) => [u, u.lessons.reduce((s, l) => s + (l.mins || 3), 0)]);
  const totalMin = mins.reduce((s, x) => s + x[1], 0);

  const box = document.createElement("div"); box.className = "v3-learn";
  box.innerHTML = `
  ${sec({ id: "l3art", eyebrow: "The ten units", title: "Every unit has its own world.", cat: "lime", motif: "grid", lead: "Your progress ring shows lessons done plus the boss quiz. Locked units still let you open the first lesson.", body: `
    <div class="l3-art" data-m3-stagger="50">${units.map((u) => { const d = u.lessons.filter((l) => lessonDone(pr, l)).length; const b = bossPassed(pr, u); const pct = (d + (b ? 1 : 0)) / (u.lessons.length + 1); return `<a class="l3-u card-glow" href="#/learn/${u.id}" style="--c:${u.c}" data-m3="up" data-v3-tiltimg><div class="im">${pic("unit-" + u.id, ALT[u.id] || "")}</div><div class="tx"><span class="n">Unit ${u.n}</span><h3>${esc(u.title)}</h3><p>${u.lessons.length} lessons · ${mins.find((m) => m[0] === u)[1]} min${b ? " · boss beaten" : ""}</p></div>${ring(pct, u.c, 58, `Unit ${u.n} progress`)}</a>`; }).join("")}</div>` })}

  ${banner("learn-plan", { eyebrow: "Study plan", title: "A plan that fits your day.", lead: `The whole course is about ${fmtN(Math.round(totalMin / 5) * 5)} minutes of reading and doing. Pick how long you have each day and I will split it into a schedule.`, alt: "Seven small wooden blocks with glowing lights rising like a staircase on a desk", cat: "lime", id: "l3planH" })}
  <section class="section tight" data-cat="lime" aria-label="Study plan"><div class="wrap">
    <div class="l3-plan card-glow"><div class="l3-planctl" role="group" aria-label="Minutes per day">${[10, 15, 20, 30, 45].map((m) => `<button type="button" class="v3-chip" data-pm="${m}">${m} min a day</button>`).join("")}</div><div id="l3planOut" aria-live="polite"></div></div>
  </div></section>

  ${banner("learn-review", { eyebrow: "Review", title: "Spaced repetition for the key terms.", lead: `${cards.length} key terms from the lessons, each with its glossary meaning. Cards you know come back later, cards you miss come back tomorrow. It runs on the Leitner box method and saves in your browser.`, alt: "Paper flashcards fanned beside an hourglass with cyan sand under a desk lamp", cat: "teal", id: "l3revH" })}
  <section class="section tight" data-cat="teal" aria-label="Review cards"><div class="wrap">
    <div class="l3-boxes" id="l3boxes" aria-label="Cards in each box"></div>
    <div class="l3-card-wrap"><div class="l3-flip" id="l3card" tabindex="0" role="group" aria-roledescription="flash card" aria-label="Flash card. Press Enter or Space to flip it"></div></div>
    <div class="l3-rev-ctl"><button class="v3-btn" type="button" id="l3miss">I missed it</button><button class="v3-btn primary" type="button" id="l3know">I knew it</button><button class="v3-btn ghost" type="button" id="l3reset">Reset review</button></div>
  </div></section>

  ${sec({ id: "l3time", eyebrow: "Time per unit", title: "Where the minutes go.", cat: "lime", body: bars(mins.map(([u, m]) => [`${u.n}. ${u.title}`, m, u.c, `#/learn/${u.id}`]), { unit: " min" }) })}

  ${sec({ id: "l3src", eyebrow: "What it stands on", title: "The sources behind the lessons.", cat: "lime", lead: `Lessons link to ${fmtN(Object.values(srcs).reduce((a, b) => a + b, 0))} sources on ${Object.keys(srcs).length} sites. These are the sites cited most.`, body: bars(Object.entries(srcs).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([h, n]) => [h, n, "var(--cat)"])) })}
  `;
  el.appendChild(box);

  /* study plan */
  const plan = (m) => {
    store.set("v3plan", m);
    $$("[data-pm]", box).forEach((b) => b.setAttribute("aria-pressed", +b.dataset.pm === m));
    const todo = units.flatMap((u) => u.lessons.filter((l) => !lessonDone(pr, l)).map((l) => ({ u, l, m: l.mins || 3 })));
    const days = []; let cur = [], t = 0;
    todo.forEach((x) => { if (t + x.m > m && cur.length) { days.push(cur); cur = []; t = 0; } cur.push(x); t += x.m; });
    if (cur.length) days.push(cur);
    const end = new Date(Date.now() + Math.max(0, days.length - 1) * 864e5);
    $("#l3planOut", box).innerHTML = todo.length ? `<p class="kicker">${todo.length} lessons left. At ${m} minutes a day that is <b>${days.length} days</b>, finishing around ${end.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.</p>
      <ol class="l3-days" data-v3>${days.slice(0, 7).map((d, i) => `<li style="--i:${i};--c:${d[0].u.c}"><span class="dn">Day ${i + 1}</span>${d.map((x) => `<a href="#/learn/${x.u.id}/${x.l.id}">${esc(x.l.title)} <small>${x.m} min</small></a>`).join("")}</li>`).join("")}</ol>${days.length > 7 ? `<p class="muted">Then ${days.length - 7} more days in the same rhythm.</p>` : ""}` : `<p class="kicker">Every lesson is done. Beat the remaining boss quizzes and take the final.</p>`;
    fx3($("#l3planOut", box));
  };
  $$("[data-pm]", box).forEach((b) => (b.onclick = () => plan(+b.dataset.pm)));
  plan(store.get("v3plan", 20));

  /* Leitner review */
  let R = store.get("v3review", {});
  const due = () => cards.filter((c) => { const r = R[c.id]; return !r || r.next <= today(); });
  let curC = null, flipped = false;
  const paintBoxes = () => { const n = [0, 0, 0, 0, 0, 0]; cards.forEach((c) => n[(R[c.id] && R[c.id].box) || 0]++); $("#l3boxes", box).innerHTML = n.map((k, i) => `<div class="l3-box" style="--h:${((k / Math.max(1, cards.length)) * 100).toFixed(1)}%"><b>${k}</b><span>${i ? `Box ${i}` : "New"}</span></div>`).join(""); };
  const show = () => {
    const d = due(); flipped = false; curC = d[0] || null;
    const c = $("#l3card", box);
    c.classList.remove("on");
    c.innerHTML = curC ? `<div class="f"><span class="chip-cat">Unit ${curC.u.n}</span><h3>${esc(curC.term)}</h3><p class="muted">Say what it means, then tap to check.</p></div><div class="b"><h3>${esc(curC.term)}</h3><p>${esc(curC.def)}</p><a href="#/docs/glossary?t=${encodeURIComponent(curC.term)}">In the glossary ${ICON.arrow}</a></div>` : `<div class="f"><h3>All caught up.</h3><p class="muted">Nothing is due today. Come back tomorrow.</p></div>`;
    $("#l3know", box).disabled = $("#l3miss", box).disabled = !curC;
    paintBoxes();
  };
  const flip = () => { if (!curC) return; flipped = !flipped; $("#l3card", box).classList.toggle("on", flipped); };
  $("#l3card", box).onclick = flip; $("#l3card", box).onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } };
  const grade = (ok) => { if (!curC) return; const r = R[curC.id] || { box: 0 }; const b = ok ? Math.min(5, r.box + 1) : 1; R[curC.id] = { box: b, next: today() + (ok ? BOX_DAYS[b] : 1) }; store.set("v3review", R); if (ok && b === 5) toast(`${curC.term} is in the last box.`); show(); };
  $("#l3know", box).onclick = () => grade(true); $("#l3miss", box).onclick = () => grade(false);
  $("#l3reset", box).onclick = () => { if (confirm("Clear your review progress?")) { R = {}; store.set("v3review", R); show(); } };
  show();
  fx3(box);
}
