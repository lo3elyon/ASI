/* Prepare, Round 3 blocks: category art for the checklist, scenario drills built on the checklist steps, a seven day plan,
   a risk family matrix, and who is behind each safeguard. Facts come from data/catastrophe-prep.json; the drills are practice situations, labelled as such. */
import { $, $$, esc, load, store, ICON, toast } from "../util.js";
import { pic, banner, sec, src, fx3, ring } from "./kit.js";
import { auto } from "../core/motion3.js";

const GC = {
  learn: ["Learn", "#22d3ee", "prep-learn", "A reading desk at night with an open book, a tablet showing a course map and a cup of tea"],
  career: ["Career", "#3b82f6", "prep-career", "A research desk at blue hour with a laptop, papers and a whiteboard over a city view"],
  advocacy: ["Speak up", "#84cc16", "prep-advocacy", "Many small lanterns raised in a dark town square in front of a civic building"],
  resilience: ["Resilience", "#f59e0b", "prep-resilience", "A phone with a shield on screen beside a hardware security key and a small padlock"],
  mindset: ["Mindset", "#14b8a6", "prep-mindset", "A still lake at dawn with a wooden jetty reaching into teal mist"],
};
/* Practice situations. Each right answer is one of the steps in data/catastrophe-prep.json (matched by action id). */
const DRILLS = [
  { q: "Your phone rings. It sounds exactly like your cousin, upset, asking you to send money right now for an emergency.", a: "resilience-scams", opts: [["Ask for the family code word before doing anything", 1], ["Send a small amount just in case", 0], ["Ask them to prove it by saying your address", 0]] },
  { q: "A news story says a major bank was hit by a cyber attack and cards may not work for a few days.", a: "resilience-kit", opts: [["Use the water, food, torch and copies of documents you already keep", 1], ["Rush to buy as much as you can carry", 0], ["Share the story to every group chat", 0]] },
  { q: "You get a message saying your email password was found in a leak.", a: "resilience-cyber", opts: [["Change it, keep passwords separate and turn on 2-step verification", 1], ["Ignore it, leaks happen all the time", 0], ["Reply to the message with your old password to check", 0]] },
  { q: "After reading about p(doom) late at night, you cannot sleep and everything feels pointless.", a: "mindset", opts: [["Close the screen, take it seriously without panic, and talk to someone tomorrow", 1], ["Keep reading until you feel certain", 0], ["Decide nothing you do matters", 0]] },
  { q: "A video of a famous leader saying something shocking is spreading fast. Something about the voice feels slightly off.", a: "resilience-scams", opts: [["Look for small glitches and wait for trusted sources before sharing", 1], ["Share it first, check later", 0], ["Assume every video is fake from now on", 0]] },
  { q: "You want to help with AI safety but do not know where to start, and you have a few hours a week.", a: "learn-free-course", opts: [["Start a free self paced intro course and read one clear explainer a week", 1], ["Wait until you have a PhD", 0], ["Post about doom online every day", 0]] },
  { q: "Your local representative is holding an open meeting about technology.", a: "advocacy-lawmakers", opts: [["Go, or write to them, and say calmly that you care about AI risk", 1], ["Skip it, one voice does nothing", 0], ["Send an angry anonymous message", 0]] },
  { q: "You can code in Python and want to see if safety research suits you.", a: "career-research", opts: [["Work through structured exercises, then apply to a fellowship when ready", 1], ["Only read opinion threads", 0], ["Wait for a lab to email you", 0]] },
];

export async function mount(el) {
  const d = await load("catastrophe-prep.json", {});
  const acts = d.what_you_can_do || [], risks = d.risk_categories || [], props = d.proposals || [];
  if (!acts.length) return;
  const byId = Object.fromEntries(acts.map((a) => [a.id, a]));
  const groups = Object.keys(GC).filter((g) => acts.some((a) => a.group === g));
  const done = () => store.get("prep", {});
  const pctG = (g) => { const its = acts.filter((a) => a.group === g).flatMap((a) => (a.steps || []).map((_, i) => `${a.id}:${i}`)); const dn = done(); return its.length ? its.filter((k) => dn[k]).length / its.length : 0; };
  const drills = DRILLS.filter((x) => byId[x.a]);

  const box = document.createElement("div"); box.className = "v3-prep";
  box.innerHTML = `
  ${sec({ id: "p3cat", eyebrow: "Five kinds of action", title: "Pick where you start.", cat: "amber", motif: "calm", lead: "Each ring shows how much of that part of your checklist you have ticked. Tap a card to jump to its steps.", body: `
    <div class="p3-cats" data-m3-stagger="80">${groups.map((g) => { const [l, c, img, alt] = GC[g]; const n = acts.filter((a) => a.group === g); return `<button type="button" class="p3-cat card-glow" data-pg="${g}" style="--c:${c}" data-m3="up" data-v3-tiltimg><div class="im">${pic(img, alt)}</div><div class="tx"><h3>${esc(l)}</h3><p>${n.map((a) => esc(a.title)).join(" · ")}</p></div>${ring(pctG(g), c, 56, `${l} progress`)}</button>`; }).join("")}</div>` })}

  ${banner("prep-drills", { eyebrow: "Scenario drills", title: "Practise the moment before it happens.", lead: `${drills.length} short practice situations. They are made up for training, not predictions. Each right answer is a step from the checklist below, so practising here is practising the real thing.`, alt: "A calm drill room with a city map covered in pins, walkie talkies and amber desk lamps", cat: "amber", id: "p3drH" })}
  <section class="section tight" data-cat="amber" aria-label="Scenario drills"><div class="wrap">
    <div class="p3-drill card-glow border-anim" id="p3d"></div>
  </div></section>

  ${sec({ id: "p3week", eyebrow: "Seven calm days", title: "One small step a day for a week.", cat: "teal", lead: "Built from the checklist, one step per day, mixing kinds so it never feels heavy. Tick a day when you have done it.", body: `<ol class="p3-week" id="p3w" data-v3></ol>` })}

  ${sec({ id: "p3mx", eyebrow: "Risk families", title: "What each family looks like, at a glance.", cat: "red", lead: "Every risk family from the section above, with how many examples and pieces of evidence this page gives for it.", body: `
    <div class="p3-mx" data-m3-stagger="50">${risks.map((r) => `<div class="p3-rk card-glow" data-m3="scale"><h3>${esc(r.name)}</h3><p>${esc(r.simple || "")}</p><div class="nums"><span><b>${(r.examples || []).length}</b> examples</span><span><b>${(r.evidence || []).length}</b> sourced quotes</span></div>${(r.evidence || [])[0] ? src(r.evidence[0].url) : ""}</div>`).join("")}</div>` })}

  ${sec({ id: "p3who", eyebrow: "Who is doing what", title: "The people behind each safeguard.", cat: "blue", body: `
    <ol class="p3-who" data-m3-stagger="40">${props.map((p) => `<li data-m3="left"><b>${esc(p.name)}</b><span>${esc(p.who || "")}</span></li>`).join("")}</ol>` })}
  `;
  const last = el.lastElementChild; if (last && last.querySelector(".callout")) el.insertBefore(box, last); else el.appendChild(box);

  /* Keep each group ring in step with the checklist as boxes are ticked */
  const syncRings = () => $$(".p3-cat[data-pg]", box).forEach((b) => { const g = b.dataset.pg; const old = b.querySelector(".v3-ring"); if (!old) return; const tmp = document.createElement("div"); tmp.innerHTML = ring(pctG(g), GC[g][1], 56, `${GC[g][0]} progress, ${Math.round(pctG(g) * 100)} percent`); const nw = tmp.firstElementChild; nw.classList.add("v3in"); old.replaceWith(nw); });
  document.addEventListener("change", (e) => { if (e.target.matches && e.target.matches("#acts input[type=checkbox]") && box.isConnected) setTimeout(syncRings, 0); });
  box.addEventListener("click", (e) => { const b = e.target.closest("[data-pg]"); if (!b) return; const f = document.querySelector(`#gf [data-g="${b.dataset.pg}"]`); if (f) { f.click(); document.getElementById("plan")?.scrollIntoView({ behavior: "smooth" }); } });

  /* drills */
  let k = 0, score = 0; const D = $("#p3d", box);
  const drill = () => {
    const x = drills[k % drills.length]; const o = x.opts.map((v, i) => [v, i]).sort(() => Math.random() - 0.5);
    D.innerHTML = `<div class="p3-dhead"><span class="chip-cat">Practice ${k % drills.length + 1} of ${drills.length}</span><span class="mono muted">${score} right so far</span></div><p class="p3-dq">${esc(x.q)}</p><div class="p3-dopts">${o.map(([[t, ok]]) => `<button type="button" class="p3-opt v3-rip" data-ok="${ok}">${esc(t)}</button>`).join("")}</div><div class="p3-dres" aria-live="polite"></div>`;
  };
  D.addEventListener("click", (e) => {
    const b = e.target.closest(".p3-opt"); if (!b || D.dataset.lock) return; D.dataset.lock = 1;
    const x = drills[k % drills.length]; const a = byId[x.a]; const ok = b.dataset.ok === "1"; if (ok) score++;
    $$(".p3-opt", D).forEach((q) => { q.disabled = true; q.classList.toggle("right", q.dataset.ok === "1"); q.classList.toggle("wrong", q === b && !ok); });
    $(".p3-dres", D).innerHTML = `<p>${ok ? "Good call." : "Not this time."} From your checklist, <b>${esc(a.title)}</b>: ${(a.steps || []).map(esc).join(". ")}.</p>${a.source_url ? src(a.source_url) : ""} <button class="v3-btn sm" type="button" id="p3next">Next drill</button>`;
    $("#p3next", D).onclick = () => { delete D.dataset.lock; k++; if (k % drills.length === 0) toast(`All ${drills.length} drills done. ${score} right.`); drill(); };
  });
  drill();

  /* seven days */
  const order = ["resilience", "learn", "mindset", "resilience", "advocacy", "career", "mindset"];
  const used = new Set(); const week = order.map((g) => { const a = acts.find((x) => x.group === g && !used.has(x.id)) || acts.find((x) => !used.has(x.id)); if (!a) return null; used.add(a.id); return a; }).filter(Boolean);
  const W = store.get("v3week", {});
  $("#p3w", box).innerHTML = week.map((a, i) => { const [l, c] = GC[a.group] || [a.group, "#22d3ee"]; return `<li style="--c:${c};--i:${i}" class="${W[i] ? "done" : ""}"><label><input type="checkbox" data-wd="${i}" ${W[i] ? "checked" : ""}><span class="dn">Day ${i + 1}</span><span class="tx"><b>${esc(a.title)}</b><small>${esc((a.steps || [])[0] || "")}</small></span><span class="tag" style="--c:${c}">${esc(l)}</span></label></li>`; }).join("");
  $$("[data-wd]", box).forEach((c) => (c.onchange = () => { W[c.dataset.wd] = c.checked ? 1 : 0; store.set("v3week", W); c.closest("li").classList.toggle("done", c.checked); if (Object.values(W).filter(Boolean).length === 7) toast("A whole calm week. Well done."); }));
  fx3(box);
}
