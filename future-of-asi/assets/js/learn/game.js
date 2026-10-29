/* Alignment 101 progress, XP, levels, badges, daily streak and celebrations. Everything stays in localStorage.
   Old progress (course.done[lessonId], course.quiz[unitId] as a number) keeps counting. */
import { store, RM, esc } from "../util.js";
import { ui } from "../core/sound.js";

export const P = () => { const p = store.get("course", {}); p.done = p.done || {}; p.quiz = p.quiz || {}; p.acts = p.acts || {}; p.ch = p.ch || {}; p.boss = p.boss || {}; p.badges = p.badges || {}; p.daily = p.daily || { days: [], answers: {} }; return p; };
export const save = (p) => store.set("course", p);

export const lessonDone = (p, l) => !!(p.done[l.id] || (l.legacy_ids || []).some((x) => p.done[x]));
export function bossPassed(p, u) {
  const b = p.boss[u.id];
  if (b && b.best >= bossNeed(u)) return true;
  const old = p.quiz[u.id];
  return typeof old === "number" && !b && old >= 3 && old <= 4; // passed under the old 4 question quiz
}
export const bossNeed = (u) => (u.boss && u.boss.pass_count) || Math.ceil((u.quiz || []).length * ((u.boss && u.boss.pass_ratio) || 0.75));
export function unitUnlocked(p, u, units) {
  const r = u.unlock || { rule: "open" };
  if (r.rule !== "after") return true;
  const prev = units.find((x) => x.id === r.unit);
  return !prev || bossPassed(p, prev);
}
export const lessonOpen = (p, u, l, units) => unitUnlocked(p, u, units) || (u.unlock && u.unlock.preview_first_lesson && u.lessons[0] === l);

export function xpOf(course, p) {
  let xp = 0;
  (course.units || []).forEach((u) => {
    u.lessons.forEach((l) => {
      const acts = (l.activities || []).filter((a) => p.acts[a.id]).length;
      xp += lessonDone(p, l) ? (l.xp || 40) : Math.min((l.xp || 40) - 40, acts * 15);
      if (p.ch[l.id] && l.challenge) xp += l.challenge.xp || 25;
    });
    if (bossPassed(p, u)) xp += (u.boss && u.boss.xp) || 100;
  });
  const fe = course.final_exam;
  if (fe && p.final && p.final.best >= (fe.pass_count || 20)) xp += fe.xp || 500;
  const ds = course.daily_streak;
  if (ds) { xp += (p.daily.days || []).length * (ds.xp_per_day || 10); (ds.bonus || []).forEach((b) => { if ((p.daily.best || 0) >= b.days) xp += b.xp || 0; }); }
  return xp;
}
export function levelOf(course, xp) {
  const L = (course.levels && course.levels.length ? course.levels : [{ name: "Curious", xp: 0 }, { name: "Learner", xp: 500 }, { name: "Explorer", xp: 1500 }]).slice().sort((a, b) => a.xp - b.xp);
  let i = 0; L.forEach((l, k) => { if (xp >= l.xp) i = k; });
  const cur = L[i], next = L[i + 1];
  return { n: i + 1, name: cur.name, from: cur.xp, to: next ? next.xp : cur.xp, next: next ? next.name : "", pct: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}

/* Badges: one per unit boss, the final exam, streak bonuses, and a few for learning habits */
export function badgeList(course) {
  const B = [{ id: "first-step", name: "First Step", desc: "Finished your first lesson.", c: "#22d3ee", test: (p) => course.units.some((u) => u.lessons.some((l) => lessonDone(p, l))) },
    { id: "hands-on", name: "Hands On", desc: "Completed 25 activities.", c: "#14b8a6", test: (p) => Object.keys(p.acts).length >= 25 },
    { id: "doer", name: "Doer", desc: "Completed 5 real world challenges.", c: "#f59e0b", test: (p) => Object.keys(p.ch).length >= 5 }];
  course.units.forEach((u) => u.badge && B.push({ id: u.badge.id, name: u.badge.name, desc: u.badge.desc, c: u.c || "#22d3ee", unit: u.id, test: (p) => bossPassed(p, u) }));
  const ds = course.daily_streak;
  if (ds) (ds.bonus || []).forEach((b) => B.push({ id: "streak-" + b.days, name: b.badge || `${b.days} day streak`, desc: `Answered the daily question ${b.days} days in a row.`, c: "#f59e0b", test: (p) => (p.daily.best || 0) >= b.days }));
  const fe = course.final_exam;
  if (fe && fe.badge) B.push({ id: fe.badge.id, name: fe.badge.name, desc: fe.badge.desc, c: "#84cc16", test: (p) => p.final && p.final.best >= (fe.pass_count || 20) });
  return B;
}
const mono = (n) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
export const badgeHtml = (b, got) => `<div class="badge ${got ? "got" : ""}" style="--c:${b.c}"><div class="md">${esc(mono(b.name))}</div><b>${esc(b.name)}</b><span>${esc(got ? b.desc : "Locked. " + b.desc)}</span></div>`;

/* Call after any progress change: saves, then celebrates newly earned badges and level ups */
export function commit(course, p, { celebrate = true } = {}) {
  const before = levelOf(course, p.lastXp || 0).n;
  const fresh = badgeList(course).filter((b) => b.test(p) && !p.badges[b.id]);
  fresh.forEach((b) => (p.badges[b.id] = Date.now()));
  const xp = xpOf(course, p); p.lastXp = xp;
  save(p);
  const lv = levelOf(course, xp);
  window.dispatchEvent(new CustomEvent("xpchange", { detail: { xp, lv } }));
  if (!celebrate) return;
  if (fresh.length) unlockShow(fresh[0], fresh.length - 1);
  else if (lv.n > before && before > 0) { burst(); }
}
export function unlockShow(b, more = 0) {
  ui("success");
  const w = document.createElement("div"); w.className = "unlock"; w.setAttribute("role", "status");
  w.innerHTML = `<div class="card" style="--c:${b.c}"><div class="md">${esc(mono(b.name))}</div><div class="eyebrow" style="color:var(--amber)">Badge unlocked</div><h3 style="margin:8px 0 6px">${esc(b.name)}</h3><p>${esc(b.desc)}${more ? ` Plus ${more} more.` : ""}</p><button class="btn sm" type="button" style="margin-top:14px">Nice</button></div>`;
  document.body.appendChild(w);
  const done = () => w.remove();
  w.querySelector("button").onclick = done;
  setTimeout(done, 5200);
  burst();
}

/* Celebration: confetti, or a calm glow when motion is reduced */
export function burst() {
  if (RM()) { const g = document.createElement("div"); g.className = "calm-glow"; document.body.appendChild(g); setTimeout(() => g.remove(), 1900); return; }
  const cv = document.createElement("canvas"); cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:155"; document.body.appendChild(cv);
  const c = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
  const cols = ["#14b8a6", "#22d3ee", "#f59e0b", "#84cc16", "#3b82f6"];
  const ps = Array.from({ length: 150 }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.62, vx: (Math.random() - 0.5) * 15, vy: -Math.random() * 17 - 6, r: Math.random() * 6 + 3, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6 }));
  let f = 0; const step = () => { c.clearRect(0, 0, cv.width, cv.height); ps.forEach((p) => { p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += 0.2; c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.c; c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); c.restore(); }); if (++f < 130) requestAnimationFrame(step); else cv.remove(); };
  requestAnimationFrame(step);
}

/* Daily streak on local calendar days */
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dayNum = (s) => { const [y, m, d] = s.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
export function dailyState(course, p) {
  const ds = course.daily_streak; if (!ds || !(ds.questions || []).length) return null;
  if (!p.daily.start) { p.daily.start = today(); save(p); }
  const idx = ((dayNum(today()) - dayNum(p.daily.start)) % ds.questions.length + ds.questions.length) % ds.questions.length;
  const days = (p.daily.days || []).slice().sort();
  let streak = 0; let d = dayNum(today());
  if (!days.includes(today())) d -= 1;
  while (days.includes(new Date(d * 86400000).toISOString().slice(0, 10))) { streak++; d--; }
  return { q: ds.questions[idx], answered: p.daily.answers[today()], streak, best: p.daily.best || 0, ds };
}
export function answerDaily(course, p, pick) {
  const st = dailyState(course, p); if (!st || st.answered != null) return st;
  p.daily.answers[today()] = pick;
  if (!p.daily.days.includes(today())) p.daily.days.push(today());
  const s2 = dailyState(course, p);
  p.daily.best = Math.max(p.daily.best || 0, s2.streak);
  commit(course, p);
  return dailyState(course, p);
}
