import { $, $$, esc, load, arr, md, pageHero, store, ICON, toast, RM, researchers, videos } from "../util.js";
import { P, save, commit, xpOf, levelOf, badgeList, badgeHtml, lessonDone, bossPassed, bossNeed, unitUnlocked, lessonOpen, dailyState, answerDaily, burst } from "../learn/game.js";
import { block, question, bindQuestion, INTERACTIVE } from "../learn/blocks.js";
import { logView } from "../core/history.js";
import { jumpTo } from "../core/motion.js";
import { mount as mount3, mountUnit } from "../views3/learn3.js";
import { auto as m3auto } from "../core/motion3.js";

export function normResource(r) {
  return { title: r.title || r.name || "", url: r.url || r.link || "", type: String(r.type || r.category || r.kind || "other").toLowerCase(), by: r.org || r.author || r.authors || r.provider || r.by || "", text: r.line || r.description || r.summary || r.why || r.note || "", free: r.free, level: r.level || "" };
}

export async function render(el, params, query) {
  const [course, ppl, vids, gl] = await Promise.all([load("course.json", {}), researchers(), videos(), load("glossary.json")]);
  const units = (course.units || []).map((u, i) => ({ ...u, n: u.n || i + 1, c: u.c || "#22d3ee", lessons: u.lessons || [], quiz: u.quiz || [] }));
  const all = units.flatMap((u) => u.lessons.map((l) => ({ ...l, u })));
  const ctxBase = { people: Object.fromEntries(ppl.map((p) => [p.id, p])), videos: Object.fromEntries(vids.map((v) => [v.id, v])), glossary: Object.fromEntries(arr(gl, "terms").map((g) => [String(g.term).toLowerCase(), g])) };
  const findLesson = (u, id) => u.lessons.find((l) => l.id === id || (l.legacy_ids || []).includes(id));

  async function show(p, q) {
    if (q) { query = q; jumpTo(0); }
    if (p[0] === "certificate") return cert();
    if (p[0] === "final") return finalExam();
    const u = units.find((x) => x.id === p[0]);
    if (u && p[1] === "quiz") return boss(u);
    if (u && p[1]) { const l = findLesson(u, p[1]); if (l) return lesson(u, l); }
    if (u) return unitPage(u);
    return overview(query.get("tab"));
  }
  el._onParams = (p, q) => show(p, q);

  const stats = () => { const pr = P(); const done = all.filter((l) => lessonDone(pr, l)).length; const bosses = units.filter((u) => bossPassed(pr, u)).length; return { done, bosses, pct: (done + bosses) / Math.max(1, all.length + units.length), complete: done === all.length && bosses === units.length }; };
  const ring = (pct, c = "var(--accent)", size = 54) => { const r = size / 2 - 5, C = 2 * Math.PI * r; return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="5"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="${size / 4.4}" font-family="JetBrains Mono, monospace" fill="var(--text)">${Math.round(pct * 100)}%</text></svg>`; };

  function xpBar() {
    const pr = P(); const xp = xpOf(course, pr); const lv = levelOf(course, xp); const ds = dailyState(course, pr);
    return `<div class="xpbar" id="xpbar"><div class="lv" title="Level ${lv.n}">${lv.n}</div><div style="min-width:0"><b>${esc(lv.name)}</b> <small>${xp.toLocaleString("en-US")} XP${lv.next ? ` · ${(lv.to - xp).toLocaleString("en-US")} to ${esc(lv.next)}` : " · top level"}</small><div class="tr"><i style="width:${Math.round(lv.pct * 100)}%"></i></div></div><div class="st"><b>${ds ? ds.streak : 0}</b>day streak</div></div>`;
  }
  const onXp = () => { const b = $("#xpbar", el); if (b) b.outerHTML = xpBar(); };
  window.addEventListener("xpchange", onXp);

  function lmap() {
    const pr = P(); const n = units.length; const W = 1000, H = 300;
    const pt = (i) => { const x = 60 + (i / Math.max(1, n - 1)) * (W - 120); const y = H / 2 + Math.sin(i * 1.1) * 88; return [x, y]; };
    let d = ""; for (let i = 0; i < n; i++) { const [x, y] = pt(i); if (!i) d = `M${x},${y}`; else { const [px, py] = pt(i - 1); const mx = (px + x) / 2; d += ` C${mx},${py} ${mx},${y} ${x},${y}`; } }
    const doneIdx = units.reduce((a, u, i) => (bossPassed(pr, u) ? i : a), -1);
    return `<div class="lmap" aria-label="Course map"><svg viewBox="0 0 ${W} ${H}" role="group">
      <defs><linearGradient id="lmg" x1="0" x2="1"><stop offset="0" stop-color="#84cc16"/><stop offset=".5" stop-color="#14b8a6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
      <path d="${d}" fill="none" stroke="var(--surface-3)" stroke-width="10" stroke-linecap="round"/>
      <path class="trail" d="${d}" fill="none" stroke="url(#lmg)" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round" opacity=".8"/>
      ${doneIdx >= 0 ? `<path d="${d}" fill="none" stroke="url(#lmg)" stroke-width="10" stroke-linecap="round" pathLength="100" stroke-dasharray="${(doneIdx / Math.max(1, n - 1)) * 100} 200"/>` : ""}
      ${units.map((u, i) => { const [x, y] = pt(i); const ok = bossPassed(pr, u); const open = unitUnlocked(pr, u, units); const ld = u.lessons.filter((l) => lessonDone(pr, l)).length; return `<a class="node" href="#/learn/${u.id}" aria-label="Unit ${u.n}: ${esc(u.title)}${ok ? ", passed" : open ? "" : ", locked"}"><circle class="o" cx="${x}" cy="${y}" r="28" fill="${ok ? u.c : "var(--surface-2)"}" stroke="${open ? u.c : "var(--line-2)"}" stroke-width="3"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="18" fill="${ok ? "#07111f" : open ? "var(--text)" : "var(--dim)"}">${open ? u.n : "\u2022"}</text><text x="${x}" y="${y + (i % 2 ? -42 : 54)}" text-anchor="middle" font-size="12.5" fill="var(--muted)" font-family="JetBrains Mono, monospace">${ld}/${u.lessons.length}</text></a>`; }).join("")}
    </svg></div>`;
  }

  async function overview(tab) {
    const st = stats(); const pr = P();
    const mins = all.reduce((s, l) => s + (l.mins || 3), 0);
    const nextL = all.find((l) => !lessonDone(pr, l) && lessonOpen(pr, l.u, l, units));
    const ds = dailyState(course, pr);
    const nActs = all.reduce((s, l) => s + (l.activities || []).length, 0);
    el.innerHTML = `${pageHero({ img: "cover-learn", eyebrow: "Alignment 101", title: "Learn it by <span class='serif gt-mint'>doing it.</span>", lead: `${esc(course.subtitle || "")} ${units.length} units, ${all.length} lessons, ${nActs} hands on activities, about ${Math.round(mins / 5) * 5} minutes. Earn XP, unlock badges and keep a daily streak. Your progress stays in your browser.`, extra: `<div class="row" style="margin-top:24px"><a class="btn primary" href="#/learn/${nextL ? nextL.u.id + "/" + nextL.id : "certificate"}"><span class="shine"></span>${st.done ? (st.complete ? "Get your completion card" : "Continue where you left off") : "Begin unit one"} ${ICON.arrow}</a>${ring(st.pct, "var(--lime)", 64)}</div>` })}
    <section class="section tight"><div class="wrap">
      ${xpBar()}
      <div class="chips" role="tablist" style="margin:24px 0"><button class="chip ${tab !== "resources" ? "on" : ""}" role="tab" type="button" data-tab="course">Course</button><button class="chip ${tab === "resources" ? "on" : ""}" role="tab" type="button" data-tab="resources">Resources to go deeper</button></div>
      <div id="tabBody"></div>
    </div></section>`;
    $$("[data-tab]", el).forEach((b) => (b.onclick = () => { history.replaceState(history.state, "", location.pathname + location.search + (b.dataset.tab === "resources" ? "#/learn?tab=resources" : "#/learn")); overview(b.dataset.tab); }));
    if (tab === "resources") return resources($("#tabBody", el));
    const badges = badgeList(course);
    $("#tabBody", el).innerHTML = `
      ${ds ? `<div class="card daily" id="daily" style="--c:#f59e0b;margin-bottom:22px"><div><div class="eyebrow" style="color:var(--amber)">${esc(ds.ds.title || "Daily streak")} · question of the day</div><div id="dq" class="blk" style="margin:12px 0 0;padding:0;border:0;background:none"></div></div><div class="flame">${ds.streak}<small>DAY STREAK</small><small style="margin-top:6px">BEST ${ds.best}</small></div></div>` : ""}
      ${lmap()}
      <div class="units">${units.map((u, i) => {
        const d = u.lessons.filter((l) => lessonDone(pr, l)).length; const passed = bossPassed(pr, u); const open = unitUnlocked(pr, u, units);
        const pct = (d + (passed ? 1 : 0)) / (u.lessons.length + 1);
        return `<a class="card hov spot unit rv" href="#/learn/${u.id}" style="--c:${u.c}"><span class="n">${open ? u.n : "\u2022"}</span><div><h3 style="margin:0 0 4px">${esc(u.title)}</h3><p style="margin:0">${esc(u.summary)}</p><div class="row" style="margin-top:10px;gap:8px"><span class="tag" style="--c:${u.c}">${d}/${u.lessons.length} lessons</span><span class="tag" style="--c:${passed ? "#84cc16" : "#f59e0b"}">${passed ? "Boss beaten" : "Boss quiz"}</span>${u.xp ? `<span class="tag" style="--c:#84cc16">${u.xp} XP</span>` : ""}${!open ? `<span class="tag" style="--c:var(--muted)">Locked, lesson one is open</span>` : ""}</div></div>${ring(pct, u.c)}</a>`;
      }).join("")}</div>
      ${course.final_exam ? `<div class="callout" style="margin-top:30px;--accent:var(--lime)"><div><div class="eyebrow" style="color:var(--lime)">${esc(course.final_exam.title || "Final exam")}</div><h3 style="margin:8px 0">${esc(course.final_exam.desc || "")}</h3><p class="muted" style="margin:0">${st.bosses}/${units.length} boss quizzes passed. ${esc((course.final_exam.unlock || {}).text || "")}</p></div><a class="btn ${st.bosses === units.length ? "primary" : ""}" href="#/learn/final">${st.bosses === units.length ? "Take the final" : "Practice the final"} ${ICON.arrow}</a></div>` : ""}
      <div class="sec-head" style="margin:44px 0 16px"><div><div class="eyebrow">Badges</div><h3 style="margin:6px 0 0">${badges.filter((b) => pr.badges[b.id] || b.test(pr)).length} of ${badges.length} earned</h3></div></div>
      <div class="badges">${badges.map((b) => badgeHtml(b, !!(pr.badges[b.id] || b.test(pr)))).join("")}</div>
      <div class="callout" style="margin-top:30px"><div><div class="eyebrow">Completion card</div><h3 style="margin:8px 0">Finish every lesson and beat every boss quiz.</h3><p class="muted" style="margin:0">Then put your name on a card you can download and share. ${st.done}/${all.length} lessons and ${st.bosses}/${units.length} bosses so far.</p></div><a class="btn ${st.complete ? "primary" : ""}" href="#/learn/certificate">${st.complete ? "Make my card" : "Preview the card"} ${ICON.arrow}</a></div>`;
    if (ds) daily();
    import("../util.js").then((m) => m.reveal(el));
    if (tab !== "resources") { try { await mount3(el); m3auto(el); } catch (e) { console.warn("learn3", e); } }
  }
  function daily() {
    const pr = P(); const ds = dailyState(course, pr); const box = $("#dq", el); if (!box || !ds) return;
    const q = { ...ds.q, explain: null };
    box.innerHTML = question(q, 0);
    const qb = $(".qblk", box);
    if (ds.answered != null) { const b = $(`[data-j="${ds.answered}"]`, qb); if (b) { bindQuestion(qb, q); b.click(); } $(".fb", qb).insertAdjacentHTML("beforeend", `<br><span class="muted">Come back tomorrow for the next one.</span>`); return; }
    bindQuestion(qb, q, (ok, j) => { const s = answerDaily(course, P(), j); const fl = $("#daily .flame", el); if (fl) fl.innerHTML = `${s.streak}<small>DAY STREAK</small><small style="margin-top:6px">BEST ${s.best}</small>`; toast(`Streak: ${s.streak} day${s.streak === 1 ? "" : "s"}. +${(course.daily_streak || {}).xp_per_day || 10} XP`); });
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



  function toc(cur) {
    const pr = P();
    return `<nav class="toc" aria-label="Course contents" data-lenis-prevent><a href="#/learn">${ICON.arrow.replace("M5 12h14M13 6l6 6-6 6", "M19 12H5M11 6l-6 6 6 6")} Course map</a>${units.map((u) => `<details ${cur.u === u ? "open" : ""}><summary class="uh" style="cursor:pointer">Unit ${u.n}: ${esc(u.title)}</summary>${u.lessons.map((l) => `<a href="#/learn/${u.id}/${l.id}" class="${cur.l === l ? "on" : ""}" ${cur.l === l ? 'aria-current="page"' : ""}><span class="ck ${lessonDone(pr, l) ? "done" : ""}"></span>${esc(l.title)}</a>`).join("")}<a href="#/learn/${u.id}/quiz" class="${cur.boss === u ? "on" : ""}"><span class="ck ${bossPassed(pr, u) ? "done" : ""}"></span>Boss quiz</a></details>`).join("")}<a href="#/learn/final"><span class="ck ${pr.final && course.final_exam && pr.final.best >= course.final_exam.pass_count ? "done" : ""}"></span>Final exam</a><a href="#/learn/certificate"><span class="ck ${stats().complete ? "done" : ""}"></span>Completion card</a></nav>`;
  }

  function unitPage(u) {
    const pr = P(); const open = unitUnlocked(pr, u, units);
    el.innerHTML = `<section class="section tight"><div class="wrap lesson-layout">${toc({ u })}
      <div style="min-width:0;--c:${u.c}"><div class="eyebrow" style="color:${u.c}">Unit ${u.n} of ${units.length}</div><h1 class="display" style="font-size:clamp(30px,4.6vw,56px);margin-top:12px">${esc(u.title)}</h1>
      <p class="lead">${esc(u.intro || u.summary || "")}</p>
      ${!open ? `<div class="disclaimer" style="margin:14px 0">${esc((u.unlock || {}).text || "Locked for now.")}</div>` : ""}
      <div style="display:grid;gap:12px;margin-top:22px">${u.lessons.map((l, i) => { const ok = lessonOpen(pr, u, l, units); const d = lessonDone(pr, l); return `<a class="card hov spot" href="#/learn/${u.id}/${l.id}" style="--c:${u.c};display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;color:var(--text)"><span class="tag" style="--c:${d ? "#84cc16" : u.c};justify-content:center">${d ? "\u2713" : i + 1}</span><span><b style="font-family:var(--f-display);font-size:17px">${esc(l.title)}</b><br><span class="muted" style="font-size:14px">${esc(l.key || "")}</span></span><span class="count">${ok ? `${l.mins || 3} min · ${l.xp || 40} XP` : "locked"}</span></a>`; }).join("")}
        <a class="card hov spot" href="#/learn/${u.id}/quiz" style="--c:#ef4444;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;color:var(--text)"><span class="tag" style="--c:#ef4444;justify-content:center">B</span><span><b style="font-family:var(--f-display);font-size:17px">${esc((u.boss || {}).title || "Boss quiz")}</b><br><span class="muted" style="font-size:14px">${u.quiz.length} questions, pass with ${bossNeed(u)}. Unlocks the badge ${esc((u.badge || {}).name || "")}.</span></span><span class="count">${bossPassed(pr, u) ? "beaten" : `${(u.boss || {}).xp || 100} XP`}</span></a></div>
      </div></div></section>`;
    mountUnit(el, u);
  }

  function lesson(u, l) {
    const pr = P();
    if (!lessonOpen(pr, u, l, units) && query.get("peek") !== "1") {
      el.innerHTML = `<section class="section tight"><div class="wrap lesson-layout">${toc({ u, l })}<div><div class="eyebrow" style="color:${u.c}">Unit ${u.n} · locked</div><h1 class="display" style="font-size:clamp(30px,4.6vw,52px);margin-top:12px">${esc(l.title)}</h1><p class="lead">${esc((u.unlock || {}).text || "Finish the unit before this one first.")}</p><div class="row"><a class="btn primary" href="#/learn/${u.id}/${u.lessons[0].id}">Open the preview lesson ${ICON.arrow}</a><a class="btn ghost" href="#/learn/${u.id}/${l.id}?peek=1">Peek anyway</a></div></div></div></section>`;
      return;
    }
    const li = u.lessons.indexOf(l), ui = units.indexOf(u);
    const next = li < u.lessons.length - 1 ? `#/learn/${u.id}/${u.lessons[li + 1].id}` : `#/learn/${u.id}/quiz`;
    const prev = li > 0 ? `#/learn/${u.id}/${u.lessons[li - 1].id}` : ui > 0 ? `#/learn/${units[ui - 1].id}/quiz` : "#/learn";
    const done = lessonDone(pr, l);
    const ctx = { ...ctxBase, c: u.c, isDone: (id) => !!P().acts[id], done: (id) => { const p = P(); if (p.acts[id]) return; p.acts[id] = Date.now(); commit(course, p); } };
    const acts = (l.activities || []).slice().sort((a, b) => (a.after ?? 99) - (b.after ?? 99));
    const sections = l.sections && l.sections.length ? l.sections : [{ h: "", md: l.body || "" }];
    const blocks = [];
    const actHtml = (a) => { const b = block(a, ctx); blocks.push([a.id, b]); return b.html; };
    const nInter = acts.filter((a) => INTERACTIVE.has(a.type)).length;
    el.innerHTML = `<section class="section tight"><div class="wrap lesson-layout">${toc({ u, l })}
      <article class="prose" style="--c:${u.c};min-width:0"><div class="eyebrow" style="color:${u.c}">Unit ${u.n} · Lesson ${li + 1} of ${u.lessons.length}</div><h1 style="margin-top:12px">${esc(l.title)}</h1>
        <div class="lmeta"><span class="tag" style="--c:${u.c}">${l.mins || 3} min</span><span class="tag" style="--c:#84cc16">${l.xp || 40} XP</span>${nInter ? `<span class="tag" style="--c:#f59e0b">${nInter} activities</span>` : ""}${done ? `<span class="tag" style="--c:#84cc16">Done</span>` : ""}</div>
        ${l.hook ? `<p class="lesson-hook">${esc(l.hook.text || l.hook)}${l.hook.source && l.hook.source.url ? ` <a href="${esc(l.hook.source.url)}" target="_blank" rel="noopener" style="font-family:var(--f-body);font-style:normal;font-size:13px">${esc(l.hook.source.label || "source")} ${ICON.ext}</a>` : ""}</p>` : ""}
        ${l.key ? `<div class="keyidea"><div class="eyebrow">Key idea</div><p>${esc(l.key)}</p></div>` : ""}
        ${sections.map((s, i) => `${s.h ? `<h2>${esc(s.h)}</h2>` : ""}${md(s.md || "")}${acts.filter((a) => (a.after ?? sections.length - 1) === i).map(actHtml).join("")}`).join("")}
        ${acts.filter((a) => a.after == null || a.after >= sections.length).map(actHtml).join("")}
        ${l.challenge ? `<div class="blk challenge" style="--c:#f59e0b"><div class="bt">Your challenge<span class="xp">${pr.ch[l.id] ? "Done" : `+${l.challenge.xp || 25} XP`}</span></div><h4>${esc(l.challenge.title || "Try this")}</h4><p style="margin:0">${esc(l.challenge.text || "")}</p><label class="row" style="margin-top:12px;gap:10px;cursor:pointer"><input type="checkbox" id="chk" ${pr.ch[l.id] ? "checked" : ""} style="width:22px;height:22px;accent-color:#f59e0b"> I did it</label></div>` : ""}
        ${(l.key_terms || []).length ? `<h3>Key terms</h3><div class="chips">${l.key_terms.map((t) => `<a class="chip" href="#/docs/glossary?t=${encodeURIComponent(t)}" title="${esc((ctxBase.glossary[String(t).toLowerCase()] || {}).def || "")}">${esc(t)}</a>`).join("")}</div>` : ""}
        ${(l.sources || []).length ? `<h3>Sources</h3><ul>${l.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label || s.url)}</a></li>`).join("")}</ul>` : ""}
        <div class="row" style="margin-top:34px;justify-content:space-between"><a class="btn ghost" href="${prev}">Back</a><button class="btn primary" type="button" id="doneBtn"><span class="shine"></span>${done ? "Next" : "Mark complete and continue"} ${ICON.arrow}</button></div>
      </article></div></section>`;
    blocks.forEach(([id, b]) => { const root = $(`[data-act="${CSS.escape(id)}"]`, el); if (root) b.bind(root); });
    const chk = $("#chk", el); if (chk) chk.onchange = () => { const p = P(); if (chk.checked) p.ch[l.id] = Date.now(); else delete p.ch[l.id]; commit(course, p); };
    $("#doneBtn", el).onclick = () => { const p = P(); const was = lessonDone(p, l); p.done[l.id] = true; commit(course, p); if (!was) toast(`Lesson complete. +${l.xp || 40} XP`); location.hash = next; };
    logView("lesson", `${u.id}/${l.id}`, l.title, { sub: `Unit ${u.n}: ${u.title}` });
  }

  function quizRun(host, qs, need, onFinish) {
    let right = 0, n = 0;
    host.innerHTML = `<div class="boss-hd card" style="margin-bottom:18px"><span class="tag" style="--c:#ef4444">Boss health</span><div class="hp"><i id="hp" style="width:100%"></i></div><span class="count" id="hpn">0/${need}</span></div>` + qs.map((q, i) => `<div class="blk" style="--c:#ef4444"><div class="bt">Question ${i + 1} of ${qs.length}</div>${question(q, i)}</div>`).join("") + `<div id="qres" style="margin-top:22px"></div>`;
    $$(".qblk", host).forEach((b) => bindQuestion(b, qs[+b.dataset.q], (ok) => { n++; if (ok) right++; $("#hp", host).style.width = `${Math.max(0, 100 - (right / need) * 100)}%`; $("#hpn", host).textContent = `${right}/${need}`; if (n === qs.length) onFinish(right, $("#qres", host)); }));
  }
  function boss(u) {
    const ui = units.indexOf(u), need = bossNeed(u);
    el.innerHTML = `<section class="section tight"><div class="wrap lesson-layout">${toc({ u, boss: u })}
      <div style="min-width:0"><div class="eyebrow" style="color:${u.c}">Unit ${u.n} boss quiz</div><h1 class="display" style="font-size:clamp(30px,4.5vw,50px);margin-top:12px">${esc((u.boss || {}).title || u.title)}</h1><p class="lead">Answer ${need} of ${u.quiz.length} correctly to beat the boss and earn ${esc((u.badge || {}).name || "the unit badge")}. Every option explains itself after you pick. Retry as often as you like.</p>
      <div id="qz"></div></div></div></section>`;
    quizRun($("#qz", el), u.quiz, need, (right, res) => {
      const p = P(); const b = p.boss[u.id] || { best: 0, tries: 0 }; b.best = Math.max(b.best, right); b.tries++; p.boss[u.id] = b; p.quiz[u.id] = Math.max(p.quiz[u.id] || 0, right);
      const pass = right >= need; const nextU = units[ui + 1];
      commit(course, p);
      res.innerHTML = `<div class="result-banner ${pass ? "win" : "lose"}"><h2 style="margin:0 0 8px">${right} of ${u.quiz.length}${pass ? ". Boss beaten." : ". The boss is still standing."}</h2><p class="lead" style="margin:0 auto 16px">${pass ? (nextU ? "The next unit is unlocked." : "That was the last unit. The final exam is waiting.") : "Read the explanations above and try again. There is no limit."}</p><div class="row" style="justify-content:center">${pass ? `<a class="btn primary" href="${nextU ? `#/learn/${nextU.id}/${nextU.lessons[0].id}` : "#/learn/final"}">${nextU ? "Start unit " + nextU.n : "Take the final"} ${ICON.arrow}</a>` : ""}<button class="btn ghost" type="button" id="retry">Retry</button></div></div>`;
      $("#retry", el).onclick = () => boss(u);
      if (pass) burst();
      res.scrollIntoView({ behavior: RM() ? "auto" : "smooth", block: "center" });
    });
  }
  function finalExam() {
    const fe = course.final_exam; if (!fe) return overview();
    const pr = P(); const unlocked = units.every((u) => bossPassed(pr, u)); const need = fe.pass_count || Math.ceil(fe.questions.length * (fe.pass_ratio || 0.8));
    el.innerHTML = `<section class="section tight"><div class="wrap lesson-layout">${toc({})}
      <div style="min-width:0"><div class="eyebrow" style="color:var(--lime)">${esc(fe.title || "Final exam")}</div><h1 class="display" style="font-size:clamp(30px,4.5vw,50px);margin-top:12px">${esc(fe.desc || "One last test.")}</h1>
      <p class="lead">${fe.questions.length} questions from every unit. Pass with ${need}. ${unlocked ? `Passing earns ${esc((fe.badge || {}).name || "the final badge")} and ${fe.xp || 500} XP.` : `${esc((fe.unlock || {}).text || "")} You can still practise now. Results count once it is unlocked.`}</p>
      <div id="qz"></div></div></div></section>`;
    quizRun($("#qz", el), fe.questions, need, (right, res) => {
      const p = P(); if (unlocked) { p.final = { best: Math.max((p.final || {}).best || 0, right), at: Date.now() }; commit(course, p); }
      const pass = right >= need;
      res.innerHTML = `<div class="result-banner ${pass ? "win" : "lose"}"><h2 style="margin:0 0 8px">${right} of ${fe.questions.length}.${pass ? " You passed." : " Not yet."}</h2><p class="lead" style="margin:0 auto 16px">${pass ? (unlocked ? "Your completion card is ready." : "That was practice. Beat every boss to make it count.") : "Go back to the units you found hard, then try again."}</p><div class="row" style="justify-content:center">${pass && unlocked ? `<a class="btn primary" href="#/learn/certificate">Make my card ${ICON.arrow}</a>` : ""}<button class="btn ghost" type="button" id="retry">Retry</button></div></div>`;
      $("#retry", el).onclick = () => finalExam();
      if (pass) burst();
    });
  }

  function cert() {
    const st = stats(); const pr = P();
    el.innerHTML = `<section class="section tight"><div class="wrap lesson-layout">${toc({})}
      <div style="min-width:0"><div class="eyebrow">Completion card</div><h1 class="display" style="font-size:clamp(30px,4.5vw,50px);margin-top:12px">${st.complete ? "You walked through the door." : "Almost there."}</h1>
      <p class="lead">${st.complete ? "Type your name as you want it on the card, then download it as a PNG." : `You have finished ${st.done} of ${all.length} lessons and beaten ${st.bosses} of ${units.length} boss quizzes. Here is a preview of your card. It unlocks when everything is done.`}</p>
      <div class="row" style="margin:18px 0"><label class="sr-only" for="cn">Your name</label><input class="input" id="cn" style="flex:1 1 260px" maxlength="48" placeholder="Your name" value="${esc(pr.name || "")}"><button class="btn primary" type="button" id="dl" ${st.complete ? "" : "disabled"}>${ICON.dl} Download PNG</button></div>
      <div class="cert-wrap"><canvas id="cv" width="1600" height="1000" aria-label="Completion card preview" style="width:100%;height:auto;border-radius:16px"></canvas></div>
      <p class="muted" style="font-size:13px;margin-top:12px">A personal milestone card, not an accredited qualification.</p></div></div></section>`;
    const cv = $("#cv", el);
    const draw = () => drawCert(cv, $("#cn", el).value.trim() || "Your name", st.complete, units.length, all.length);
    $("#cn", el).oninput = () => { const p = P(); p.name = $("#cn", el).value; save(p); draw(); };
    $("#dl", el).onclick = () => { draw(); const a = document.createElement("a"); a.download = `threshold-alignment-101-${($("#cn", el).value || "card").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`; a.href = cv.toDataURL("image/png"); a.click(); toast("Card downloaded."); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(draw);
  }

  commit(course, P(), { celebrate: false });
  await show(params);
  return () => window.removeEventListener("xpchange", onXp);
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


