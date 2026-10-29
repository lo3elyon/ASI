/* Futures, Round 3 blocks: scenario gallery with art, compare two futures, year matrix, lever influence map, signals board, and a guess the future game.
   All text comes from data/futures.json. */
import { $, $$, esc, load, ICON, toast } from "../util.js";
import { pic, sec, fx3 } from "./kit.js";
import { auto } from "../core/motion3.js";

const ALT = {
  race: "Red light trails racing along a night highway toward a skyline of data centres",
  slowdown: "Cars waiting calmly on a misty mountain road before a cliff edge at blue hour",
  controlled: "A glowing cyan sphere held inside a precise lattice cage in a dim control room",
  multipolar: "A night city seen from above as thousands of separate blue clusters with no centre",
  flourishing: "Sunrise over a green valley with terraced fields, greenhouses and a river",
  catastrophe: "An empty dark city under a heavy amber sky with the power out",
};

export async function mount(el) {
  const data = await load("futures.json", {});
  const S = data.scenarios || [], L = data.sliders || [];
  if (!S.length) return;
  const years = [...new Set(S.flatMap((s) => (s.timeline || []).map((t) => t.y)))].sort();
  const box = document.createElement("div"); box.className = "v3-fut";
  const maxW = Math.max(...S.flatMap((s) => Object.values(s.weights || {}).map(Math.abs)), 1);
  box.innerHTML = `
  ${sec({ id: "f3gal", eyebrow: "The six futures", title: "Six pictures of 2040.", cat: "teal", motif: "slant", lead: "Each future has its own story, its own timeline and its own early signals. Open one to walk it year by year in the explorer above.", body: `
    <div class="f3-gal" data-m3-stagger="70">${S.map((s, i) => `<a class="f3-card card-glow m3-spot" href="#/futures/${esc(s.id)}" style="--c:${s.c}" data-m3="${i % 2 ? "right" : "left"}" data-v3-tiltimg>
      <div class="im">${pic("fut-" + s.id, ALT[s.id] || "")}</div><span class="idx">${String(i + 1).padStart(2, "0")}</span>
      <div class="tx"><h3>${esc(s.name)}</h3><p class="tag-line">${esc(s.tagline)}</p><p>${esc(s.summary)}</p><span class="go">Walk this future ${ICON.arrow}</span></div></a>`).join("")}</div>` })}

  ${sec({ id: "f3cmp", eyebrow: "Compare", title: "Two futures, side by side.", cat: "teal", lead: "Pick any two. Their timelines line up by year so you can see where they split.", body: `
    <div class="f3-cmp-ctl"><label>Left <select class="input" id="f3a">${S.map((s, i) => `<option value="${s.id}" ${i === 0 ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
      <button class="v3-btn" type="button" id="f3swap" aria-label="Swap the two futures">Swap</button>
      <label>Right <select class="input" id="f3b">${S.map((s, i) => `<option value="${s.id}" ${i === 1 ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label></div>
    <div id="f3cmpOut" aria-live="polite"></div>` })}

  ${sec({ id: "f3mx", eyebrow: "Year by year", title: "Every future, every year.", cat: "teal", lead: "Read across a row to follow one future. Read down a column to see how different the same year could look.", body: `
    <div class="f3-mx-wrap" data-lenis-prevent><table class="f3-mx"><thead><tr><th scope="col">Future</th>${years.map((y) => `<th scope="col">${esc(y)}</th>`).join("")}</tr></thead><tbody>
    ${S.map((s) => `<tr style="--c:${s.c}"><th scope="row"><i></i>${esc(s.name)}</th>${years.map((y) => { const t = (s.timeline || []).find((x) => x.y === y); return `<td>${t ? `<b>${esc(t.t)}</b><span>${esc(t.d)}</span>` : ""}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>` })}

  ${sec({ id: "f3lev", eyebrow: "What each lever does", title: "Which levers push which future.", cat: "teal", lead: "These are the weights in the small toy model behind the branch map. A filled dot pushes a future up when you raise the lever, a hollow ring pushes it down. Bigger means stronger.", body: `
    <div class="f3-lev" data-v3><div class="f3-lev-grid" style="--n:${S.length}"><span></span>${S.map((s) => `<span class="hd" style="--c:${s.c}">${esc(s.name)}</span>`).join("")}
    ${L.map((l) => `<span class="lv" title="${esc(l.help)}">${esc(l.label)}</span>${S.map((s) => { const w = (s.weights || {})[l.id] || 0; const r = 6 + (Math.abs(w) / maxW) * 16; return `<span class="cell" style="--c:${s.c}"><i class="${w >= 0 ? "up" : "dn"}" style="--r:${r.toFixed(1)}px" title="${esc(l.label)} ${w >= 0 ? "raises" : "lowers"} ${esc(s.name)} (weight ${w})"></i></span>`; }).join("")}`).join("")}</div></div>
    <p class="disclaimer">${esc(data.note || "A toy model for thinking, not a forecast.")}</p>` })}

  ${sec({ id: "f3sig", eyebrow: "Signals to watch", title: "How you would know which future is coming.", cat: "teal", lead: "The early signs listed for each future. Tick the ones you think you can already see. Your ticks stay in this browser.", body: `
    <div class="f3-sig" data-m3-stagger="60">${S.map((s) => `<div class="f3-sigcol" style="--c:${s.c}" data-m3="up"><h3><i></i>${esc(s.name)}</h3>${(s.signals || []).map((g, i) => `<label class="f3-tick"><input type="checkbox" data-sig="${s.id}:${i}"><span>${esc(g)}</span></label>`).join("")}<div class="f3-sigm"><i style="width:0%"></i></div></div>`).join("")}</div>
    <p class="muted" id="f3sigsum" aria-live="polite"></p>` })}

  ${sec({ id: "f3game", eyebrow: "Guess the future", title: "One headline. Which future is it from?", cat: "teal", lead: "A real line from one of the six timelines. Pick the future you think it belongs to.", body: `
    <div class="f3-game card-glow border-anim" id="f3g"></div>` })}
  `;
  el.appendChild(box);

  /* compare */
  const by = Object.fromEntries(S.map((s) => [s.id, s]));
  const cmp = () => {
    const a = by[$("#f3a", box).value], b = by[$("#f3b", box).value];
    $("#f3cmpOut", box).innerHTML = `<div class="f3-cmp"><div class="hd" style="--c:${a.c}">${pic("fut-" + a.id, ALT[a.id] || "", { sizes: "50vw" })}<h3>${esc(a.name)}</h3><p>${esc(a.tagline)}</p></div><div class="mid" aria-hidden="true"></div><div class="hd" style="--c:${b.c}">${pic("fut-" + b.id, ALT[b.id] || "", { sizes: "50vw" })}<h3>${esc(b.name)}</h3><p>${esc(b.tagline)}</p></div>
      ${years.map((y, i) => { const ta = (a.timeline || []).find((x) => x.y === y), tb = (b.timeline || []).find((x) => x.y === y); return `<div class="c" style="--c:${a.c};--i:${i}" data-m3="left">${ta ? `<b>${esc(ta.t)}</b><span>${esc(ta.d)}</span>` : ""}</div><div class="yr" style="--i:${i}">${esc(y)}</div><div class="c" style="--c:${b.c};--i:${i}" data-m3="right">${tb ? `<b>${esc(tb.t)}</b><span>${esc(tb.d)}</span>` : ""}</div>`; }).join("")}</div>`;
    auto($("#f3cmpOut", box));
  };
  $("#f3a", box).onchange = cmp; $("#f3b", box).onchange = cmp;
  $("#f3swap", box).onclick = () => { const x = $("#f3a", box).value; $("#f3a", box).value = $("#f3b", box).value; $("#f3b", box).value = x; cmp(); };
  cmp();

  /* signals */
  const KEY = "thr:fut-signals"; let seen = {}; try { seen = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  const sigPaint = () => {
    const tally = S.map((s) => { const n = (s.signals || []).length; const k = (s.signals || []).filter((_, i) => seen[`${s.id}:${i}`]).length; const col = $$(".f3-sigcol", box)[S.indexOf(s)]; if (col) col.querySelector(".f3-sigm i").style.width = `${n ? (k / n) * 100 : 0}%`; return [s, k, n]; });
    const top = tally.filter((t) => t[1]).sort((a, b) => b[1] / b[2] - a[1] / a[2])[0];
    $("#f3sigsum", box).textContent = top ? `You ticked the most signals for ${top[0].name}: ${top[1]} of ${top[2]}. That is your read of the world, not a prediction.` : "Nothing ticked yet.";
  };
  $$("[data-sig]", box).forEach((c) => { c.checked = !!seen[c.dataset.sig]; c.onchange = () => { if (c.checked) seen[c.dataset.sig] = 1; else delete seen[c.dataset.sig]; try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {} sigPaint(); }; });
  sigPaint();

  /* guess game */
  const pool = S.flatMap((s) => (s.timeline || []).map((t) => ({ s, t })));
  let score = 0, played = 0, cur = null;
  const g = $("#f3g", box);
  const next = () => {
    cur = pool[Math.floor(Math.random() * pool.length)];
    g.innerHTML = `<div class="f3-gq"><span class="chip-cat">${esc(cur.t.y)}</span><h3>${esc(cur.t.t)}</h3><p>${esc(cur.t.d)}</p></div><div class="f3-gopts">${S.map((s) => `<button class="v3-chip" type="button" data-g="${s.id}" style="--c:${s.c}">${esc(s.name)}</button>`).join("")}</div><p class="f3-gres" aria-live="polite">${played ? `Score ${score} of ${played}.` : "Make your guess."}</p>`;
  };
  g.addEventListener("click", (e) => {
    const b = e.target.closest("[data-g]"); if (!b || !cur || g.dataset.lock) return;
    const ok = b.dataset.g === cur.s.id; played++; if (ok) score++;
    g.dataset.lock = "1";
    $$("[data-g]", g).forEach((x) => { x.disabled = true; x.classList.toggle("right", x.dataset.g === cur.s.id); x.classList.toggle("wrong", x === b && !ok); });
    $(".f3-gres", g).innerHTML = `${ok ? "Right." : `Not quite. It is from ${esc(cur.s.name)}.`} Score ${score} of ${played}. <button class="v3-btn sm" type="button" id="f3gn">Next headline</button> <a href="#/futures/${cur.s.id}">Open ${esc(cur.s.name)} ${ICON.arrow}</a>`;
    $("#f3gn", g).onclick = () => { delete g.dataset.lock; next(); };
    if (played === 10) toast(`Ten headlines done. You placed ${score} correctly.`);
  });
  next();
  fx3(box);
}
