/* Renderers for the 17 Alignment 101 activity types. Each returns { html, bind(root) }.
   Every interaction works with a mouse, a finger and a keyboard. Drag uses pointer events, so it works on phones too. */
import { $, $$, esc, md, ytThumb, ytEmbed, initials, ICON, RM, loadScript, store } from "../util.js";
import { ui } from "../core/sound.js";

const shuffle = (a, seed = 7) => { const r = a.slice(); let s = seed; for (let i = r.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const seedOf = (id) => String(id).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100000, 11);
const LABEL = { quiz: "Quick quiz", truefalse: "True or false", sort: "Sort it", order: "Put it in order", match: "Match the pairs", "slider-predict": "Make a guess", scenario: "Choose your path", flashcards: "Flashcards", reflect: "Reflect", "spot-the-flaw": "Spot the flaw", simulation: "Try the simulation", video: "Watch", quote: "In their words", "researcher-card": "Meet a researcher", diagram: "Diagram", "key-terms": "Key terms", "did-you-know": "Did you know" };
export const INTERACTIVE = new Set(["quiz", "truefalse", "sort", "order", "match", "slider-predict", "scenario", "flashcards", "reflect", "spot-the-flaw", "simulation"]);
const src = (s) => (s && s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" style="font-size:13px">${esc(s.label || "Source")} ${ICON.ext}</a>` : "");
const inl = (t) => md(t || "").replace(/^<p>|<\/p>$/g, "");

export function block(a, ctx) {
  const fn = R[a.type];
  const head = `<div class="bt">${esc(LABEL[a.type] || a.type)}${INTERACTIVE.has(a.type) ? `<span class="xp">${ctx.isDone(a.id) ? "Done" : "+15 XP"}</span>` : ""}</div>${a.title && !["quote", "did-you-know"].includes(a.type) ? `<h4>${esc(a.title)}</h4>` : ""}`;
  if (!fn) return { html: "", bind() {} };
  const r = fn(a, ctx);
  return { html: `<div class="blk ${ctx.isDone(a.id) ? "ok" : ""} ${a.type === "did-you-know" ? "dyk" : ""}" data-act="${esc(a.id)}" data-type="${esc(a.type)}" style="--c:${ctx.c}">${head}${r.html}</div>`, bind: (root) => r.bind && r.bind(root, () => { ctx.done(a.id); root.classList.add("ok"); const x = $(".xp", root); if (x) x.textContent = "Done"; }) };
}
export function question(q, i, name) {
  return `<div class="qblk" data-q="${i}"><h4>${esc(q.q)}</h4>${q.o.map((o, j) => `<button class="opt" type="button" data-j="${j}">${esc(o)}</button>`).join("")}<div class="fb"></div></div>`;
}
export function bindQuestion(box, q, onAnswer) {
  const opts = $$(".opt", box);
  opts.forEach((b) => b.addEventListener("click", () => {
    if (box.dataset.answered) return; box.dataset.answered = "1";
    const j = +b.dataset.j, ok = j === q.a;
    opts.forEach((x) => { x.disabled = true; if (+x.dataset.j === q.a) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); });
    const ex = (q.explain && q.explain[j]) || q.why || "";
    const fb = $(".fb", box); fb.className = `fb on ${ok ? "good" : "bad"}`;
    fb.innerHTML = `<b>${ok ? "Right." : "Not quite."}</b> ${esc(ex)}${!ok && q.explain && q.explain[q.a] && q.explain[q.a] !== ex ? `<br><span class="muted">${esc(q.explain[q.a])}</span>` : ""} ${src(q.source)}`;
    ui(ok ? "success" : "error");
    onAnswer && onAnswer(ok, j);
  }));
}

const R = {
  quiz(a) {
    const qs = a.questions || (a.q ? [a] : []);
    return { html: qs.map((q, i) => question(q, i)).join(""), bind(root, done) { let n = 0; $$(".qblk", root).forEach((b) => bindQuestion(b, qs[+b.dataset.q], () => { if (++n === qs.length) done(); })); } };
  },
  truefalse(a) {
    const st = a.statements || [];
    return { html: st.map((s, i) => `<div class="tfq" data-i="${i}" style="margin-bottom:14px"><p style="margin:0 0 8px;font-weight:600">${esc(s.s)}</p><div class="tf"><button class="opt" type="button" data-v="1">True</button><button class="opt" type="button" data-v="0">False</button></div><div class="fb"></div></div>`).join(""),
      bind(root, done) { let n = 0; $$(".tfq", root).forEach((q) => { const s = st[+q.dataset.i]; $$(".opt", q).forEach((b) => b.addEventListener("click", () => { if (q.dataset.a) return; q.dataset.a = 1; const ok = (b.dataset.v === "1") === !!s.a; $$(".opt", q).forEach((x) => { x.disabled = true; if ((x.dataset.v === "1") === !!s.a) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); }); const fb = $(".fb", q); fb.className = `fb on ${ok ? "good" : "bad"}`; fb.innerHTML = `<b>${ok ? "Right." : "Not quite."}</b> ${esc(s.why || "")}`; ui(ok ? "success" : "error"); if (++n === st.length) done(); })); }); } };
  },
  sort(a) {
    const items = shuffle((a.items || []).map((x, i) => ({ ...x, i })), seedOf(a.id));
    return {
      html: `${a.prompt ? `<p class="muted" style="margin:0 0 10px">${esc(a.prompt)} Drag, or tap an item and then tap a bucket.</p>` : ""}<div class="pool" data-pool aria-label="Items to sort">${items.map((x) => `<button type="button" class="chipd" data-i="${x.i}" aria-pressed="false">${esc(x.text)}</button>`).join("")}</div>
        <div class="buckets">${(a.buckets || []).map((b) => `<div class="bucket" data-b="${esc(b.id)}"><button type="button" class="chip" data-put="${esc(b.id)}" style="align-self:flex-start">${esc(b.label)}</button></div>`).join("")}</div>
        <div class="row" style="margin-top:12px"><button class="btn sm primary" type="button" data-check>Check</button><button class="btn sm ghost" type="button" data-reset>Reset</button></div><div class="fb"></div>`,
      bind(root, done) {
        let sel = null;
        const pool = $("[data-pool]", root);
        const move = (chip, bucket) => { (bucket || pool).appendChild(chip); chip.classList.remove("sel", "good", "bad"); chip.setAttribute("aria-pressed", "false"); sel = null; $$(".bucket", root).forEach((b) => b.classList.remove("target")); ui("tick"); };
        root.addEventListener("click", (e) => {
          const c = e.target.closest(".chipd"); if (c && !c._dragged) { if (sel === c) { c.classList.remove("sel"); sel = null; $$(".bucket", root).forEach((b) => b.classList.remove("target")); return; } $$(".chipd.sel", root).forEach((x) => x.classList.remove("sel")); sel = c; c.classList.add("sel"); c.setAttribute("aria-pressed", "true"); $$(".bucket", root).forEach((b) => b.classList.add("target")); return; }
          if (c) { c._dragged = false; return; }
          const put = e.target.closest("[data-put]") || (sel && e.target.closest(".bucket")); if (put && sel) { move(sel, put.closest(".bucket")); return; }
          if (e.target.closest("[data-reset]")) { $$(".chipd", root).forEach((x) => move(x, null)); $(".fb", root).className = "fb"; return; }
          if (e.target.closest("[data-check]")) {
            const all = $$(".chipd", root); let right = 0, placed = 0; const notes = [];
            all.forEach((x) => { const b = x.closest(".bucket"); const it = a.items[+x.dataset.i]; if (!b) return; placed++; const ok = b.dataset.b === it.bucket; x.classList.toggle("good", ok); x.classList.toggle("bad", !ok); if (ok) right++; else if (it.why) notes.push(`${it.text}: ${it.why}`); });
            const fb = $(".fb", root);
            if (placed < all.length) { fb.className = "fb on bad"; fb.textContent = `Place all ${all.length} items first. ${all.length - placed} left.`; return; }
            const okAll = right === all.length;
            fb.className = `fb on ${okAll ? "good" : "bad"}`; fb.innerHTML = okAll ? `<b>All ${right} in the right place.</b> ${esc(a.items.map((x) => x.why).filter(Boolean).slice(0, 2).join(" "))}` : `<b>${right} of ${all.length} right.</b> Amber ones need another look.<br>${notes.slice(0, 3).map(esc).join("<br>")}`;
            ui(okAll ? "success" : "error"); if (okAll) done();
          }
        });
        dragify(root, ".chipd", (chip, x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest(".bucket"); $$(".bucket", root).forEach((k) => k.classList.toggle("over", k === b)); return b; }, (chip, b) => { $$(".bucket", root).forEach((k) => k.classList.remove("over")); if (b) move(chip, b); else if (pool.contains(document.elementFromPoint(chip._lx, chip._ly))) move(chip, null); });
      },
    };
  },
  order(a) {
    const items = shuffle((a.items || []).map((t, i) => ({ t, i })), seedOf(a.id));
    if (items.every((x, k) => x.i === k) && items.length > 1) items.reverse();
    return {
      html: `${a.prompt ? `<p class="muted" style="margin:0 0 10px">${esc(a.prompt)} Drag the rows, or use the arrows.</p>` : ""}<ol class="olist">${items.map((x) => `<li data-i="${x.i}" tabindex="0"><span class="n"></span><span>${esc(x.t)}</span><span class="mv"><button type="button" data-up aria-label="Move up">&#8593;</button><button type="button" data-dn aria-label="Move down">&#8595;</button></span></li>`).join("")}</ol><div class="row" style="margin-top:12px"><button class="btn sm primary" type="button" data-check>Check order</button></div><div class="fb"></div>`,
      bind(root, done) {
        const ol = $(".olist", root);
        const num = () => $$("li", ol).forEach((li, k) => { $(".n", li).textContent = k + 1; li.classList.remove("good", "bad"); });
        num();
        root.addEventListener("click", (e) => {
          const li = e.target.closest("li");
          if (e.target.closest("[data-up]") && li.previousElementSibling) { ol.insertBefore(li, li.previousElementSibling); num(); ui("tick"); }
          if (e.target.closest("[data-dn]") && li.nextElementSibling) { ol.insertBefore(li.nextElementSibling, li); num(); ui("tick"); }
          if (e.target.closest("[data-check]")) {
            const L = $$("li", ol); let right = 0; L.forEach((x, k) => { const ok = +x.dataset.i === k; x.classList.add(ok ? "good" : "bad"); if (ok) right++; });
            const okAll = right === L.length; const fb = $(".fb", root); fb.className = `fb on ${okAll ? "good" : "bad"}`; fb.innerHTML = okAll ? `<b>Perfect order.</b> ${esc(a.explain || "")}` : `<b>${right} of ${L.length} in place.</b> Green rows are right. Move the amber ones and check again.`; ui(okAll ? "success" : "error"); if (okAll) done();
          }
        });
        ol.addEventListener("keydown", (e) => { const li = e.target.closest("li"); if (!li || e.target !== li) return; if (e.key === "ArrowUp" && li.previousElementSibling) { ol.insertBefore(li, li.previousElementSibling); num(); li.focus(); e.preventDefault(); } if (e.key === "ArrowDown" && li.nextElementSibling) { ol.insertBefore(li.nextElementSibling, li); num(); li.focus(); e.preventDefault(); } });
        dragify(root, ".olist li", (li, x, y) => { const sib = $$("li", ol).filter((s) => s !== li); for (const s of sib) { const r = s.getBoundingClientRect(); if (y < r.top + r.height / 2) { if (li.nextElementSibling !== s) { ol.insertBefore(li, s); num(); } return s; } } if (ol.lastElementChild !== li) { ol.appendChild(li); num(); } return ol; }, () => {}, { inPlace: true });
      },
    };
  },
  match(a) {
    const pairs = a.pairs || [];
    const rights = shuffle(pairs.map((p, i) => ({ t: p.right, i })), seedOf(a.id) + 3);
    return {
      html: `${a.prompt ? `<p class="muted" style="margin:0 0 10px">${esc(a.prompt)} Tap one on the left, then its partner on the right.</p>` : ""}<div class="matchg"><div class="col">${pairs.map((p, i) => `<button type="button" data-l="${i}">${esc(p.left)}</button>`).join("")}</div><div class="col">${rights.map((r) => `<button type="button" data-r="${r.i}">${esc(r.t)}</button>`).join("")}</div></div><div class="fb"></div>`,
      bind(root, done) {
        let L = null, n = 0;
        root.addEventListener("click", (e) => {
          const l = e.target.closest("[data-l]"), r = e.target.closest("[data-r]");
          if (l && !l.classList.contains("done")) { $$("[data-l]", root).forEach((x) => x.classList.remove("sel")); L = l; l.classList.add("sel"); ui("tick"); }
          if (r && L && !r.classList.contains("done")) {
            if (r.dataset.r === L.dataset.l) { r.classList.add("done"); L.classList.add("done"); L.classList.remove("sel"); L = null; ui("success"); if (++n === pairs.length) { const fb = $(".fb", root); fb.className = "fb on good"; fb.innerHTML = `<b>All matched.</b> ${esc(a.explain || "")}`; done(); } }
            else { r.classList.add("shake"); ui("error"); setTimeout(() => r.classList.remove("shake"), 450); }
          }
        });
      },
    };
  },
  "slider-predict"(a) {
    const mid = Math.round(((a.min ?? 0) + (a.max ?? 100)) / 2 / (a.step || 1)) * (a.step || 1);
    return {
      html: `<div class="predict"><h4>${esc(a.q)}</h4><output>${mid}</output> <span class="muted">${esc(a.unit || "")}</span><input type="range" min="${a.min ?? 0}" max="${a.max ?? 100}" step="${a.step || 1}" value="${mid}" aria-label="Your guess" style="margin-top:10px"><div class="row" style="margin-top:12px"><button class="btn sm primary" type="button" data-rev>Lock in and reveal</button></div><div class="scale"></div><div class="ans fb"></div></div>`,
      bind(root, done) {
        const r = $("input", root), out = $("output", root);
        const pct = (v) => ((v - r.min) / (r.max - r.min)) * 100;
        const upd = () => { out.textContent = r.value; r.style.setProperty("--p", pct(+r.value) + "%"); };
        r.addEventListener("input", upd); upd();
        $("[data-rev]", root).addEventListener("click", () => {
          const g = +r.value, ok = Math.abs(g - a.answer) <= (a.tolerance ?? 0);
          r.disabled = true; $("[data-rev]", root).disabled = true;
          $(".scale", root).innerHTML = `<i style="left:${pct(g)}%;background:var(--amber)" title="Your guess"></i><i style="left:${pct(a.answer)}%;background:var(--lime)" title="The answer"></i>`;
          let v = g; const step = () => { v += (a.answer - v) * 0.15; out.textContent = Math.abs(v - a.answer) < 0.5 ? a.answer : Math.round(v); if (Math.abs(v - a.answer) >= 0.5 && !RM()) requestAnimationFrame(step); else out.textContent = a.answer; };
          step();
          const fb = $(".ans", root); fb.className = `ans fb on ${ok ? "good" : "bad"}`; fb.innerHTML = `<b>${ok ? "Close. Well judged." : `You guessed ${g} ${esc(a.unit || "")}. The answer is ${esc(a.answer)} ${esc(a.unit || "")}.`}</b> ${esc(a.reveal || "")} ${src(a.source)}`;
          ui(ok ? "success" : "tick"); done();
        });
      },
    };
  },
  scenario(a) {
    return {
      html: `<div class="scn">${a.intro ? `<p class="muted" style="margin:0 0 10px">${esc(a.intro)}</p>` : ""}<div class="trail"></div><div class="stage"></div></div>`,
      bind(root, done) {
        const stage = $(".stage", root), trail = $(".trail", root); let path = [];
        const show = (id) => {
          const n = (a.nodes || {})[id]; if (!n) return;
          if (n.end) {
            const tone = { good: "good", mixed: "bad", bad: "bad" }[n.end] || "good";
            stage.innerHTML = `<div class="step"><div class="fb on ${tone}" style="${n.end === "bad" ? "border-color:color-mix(in srgb,var(--red) 45%,transparent);background:color-mix(in srgb,var(--red) 10%,transparent)" : ""}"><b>${n.end === "good" ? "A good ending." : n.end === "mixed" ? "A mixed ending." : "A hard ending."}</b> ${esc(n.text)}</div><button class="btn sm" type="button" data-again style="margin-top:12px">Try another path</button></div>`;
            $("[data-again]", stage).onclick = () => { path = []; trail.innerHTML = ""; show(a.start); };
            ui(n.end === "good" ? "success" : "tick"); done(); return;
          }
          stage.innerHTML = `<div class="step"><p style="font-size:16.5px">${esc(n.text)}</p>${(n.choices || []).map((c, k) => `<button class="opt" type="button" data-k="${k}">${esc(c.label)}</button>`).join("")}</div>`;
          $$("[data-k]", stage).forEach((b) => (b.onclick = () => { const c = n.choices[+b.dataset.k]; path.push(c.label); trail.innerHTML = path.map((p, i) => `<span>${i + 1}. ${esc(p.length > 34 ? p.slice(0, 34) + "..." : p)}</span>`).join(""); ui("tick"); show(c.next); }));
        };
        show(a.start);
      },
    };
  },
  flashcards(a) {
    const cs = a.cards || [];
    return {
      html: `<p class="muted" style="margin:0 0 10px">Tap a card or press Space to flip. Flip them all to finish.</p><div class="flash">${cs.map((c, i) => `<button type="button" class="fcard" data-i="${i}" aria-label="Card ${i + 1}: ${esc(c.front)}. Press to flip."><span class="in"><span class="f">${esc(c.front)}</span><span class="b">${esc(c.back)}</span></span></button>`).join("")}</div>`,
      bind(root, done) {
        const seen = new Set(); const cards = $$(".fcard", root);
        cards.forEach((c, i) => {
          c.addEventListener("click", () => { c.classList.toggle("flip"); ui("flip"); seen.add(i); if (seen.size === cards.length) done(); });
          c.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" && cards[i + 1]) { cards[i + 1].focus(); e.preventDefault(); } if (e.key === "ArrowLeft" && cards[i - 1]) { cards[i - 1].focus(); e.preventDefault(); } });
        });
      },
    };
  },
  reflect(a) {
    const k = "reflect:" + a.id;
    return {
      html: `<div class="reflect"><p style="font-size:16.5px;margin:0 0 10px">${esc(a.prompt)}</p><label class="sr-only" for="rf-${esc(a.id)}">Your answer</label><textarea id="rf-${esc(a.id)}" placeholder="Write a few lines. This stays in your browser.">${esc(store.get(k, ""))}</textarea><div class="row" style="margin-top:10px"><button class="btn sm primary" type="button" data-save>Save my answer</button><button class="btn sm ghost" type="button" data-ex>Show an example</button><span class="count" data-st></span></div><div class="ex">${esc(a.example || "")}</div></div>`,
      bind(root, done) {
        const ta = $("textarea", root);
        let t; ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { store.set(k, ta.value); $("[data-st]", root).textContent = "Saved"; }, 400); });
        $("[data-save]", root).onclick = () => { store.set(k, ta.value); $("[data-st]", root).textContent = "Saved in this browser"; if (ta.value.trim().length >= 10) done(); else $("[data-st]", root).textContent = "Write a little more first"; };
        $("[data-ex]", root).onclick = () => $(".ex", root).classList.toggle("on");
      },
    };
  },
  "spot-the-flaw"(a) {
    return {
      html: `${a.context ? `<p style="margin:0 0 10px">${esc(a.context)}</p>` : ""}<div class="flaw">${(a.lines || []).map((l, i) => `<button type="button" class="ln" data-i="${i}">${esc(l)}</button>`).join("")}</div><div class="fb"></div>`,
      bind(root, done) {
        root.addEventListener("click", (e) => {
          const b = e.target.closest(".ln"); if (!b || root.dataset.solved) return;
          const fb = $(".fb", root);
          if (+b.dataset.i === a.flaw) { root.dataset.solved = 1; b.classList.add("right"); $$(".ln", root).forEach((x) => (x.disabled = true)); fb.className = "fb on good"; fb.innerHTML = `<b>Found it.</b> ${esc(a.explain || "")}`; ui("success"); done(); }
          else { b.classList.add("wrong", "shake"); setTimeout(() => b.classList.remove("shake"), 450); fb.className = "fb on bad"; fb.innerHTML = `<b>That line holds up.</b> ${esc(a.hint || "Look again.")}`; ui("error"); }
        });
      },
    };
  },
  simulation(a) {
    const MAP = { "control-game": ["#/control?play=1", "AI Control blue team game"], "futures-sliders": ["#/futures", "Futures explorer"], "pdoom-calculator": ["#/tools/pdoom", "p(doom) calculator"], "risk-dial": ["#/tools/dial", "Risk dial"], "gap-chart": ["#/?focus=gap", "Capability gap chart"] };
    const [h, name] = MAP[a.sim] || ["#/tools", "Tools"];
    return {
      html: `<p style="margin:0 0 12px">${esc(a.task || "")}</p><div data-simhost></div><div class="row"><button class="btn sm primary" type="button" data-sim>${ICON.play} Open ${esc(name)} here</button><a class="btn sm ghost" href="${esc(h.replace("?focus=gap", ""))}">Open full page ${ICON.arrow}</a><button class="btn sm ghost" type="button" data-simdone>I tried it</button></div>`,
      bind(root, done) {
        $("[data-sim]", root).onclick = () => { const focus = h.includes("focus=gap") ? "&focus=gap" : ""; const hash = focus ? "#/" : h; $("[data-simhost]", root).innerHTML = `<iframe class="sim-frame" src="index.html?embed=1&nosw=1${focus}${hash}" title="${esc(name)}" loading="lazy"></iframe>`; $("[data-sim]", root).remove(); };
        $("[data-simdone]", root).onclick = (e) => { e.target.disabled = true; e.target.textContent = "Nice, marked as tried"; done(); };
      },
    };
  },
  video(a, ctx) {
    const v = ctx.videos[a.video_id] || {};
    const title = a.title || v.title || "Video";
    return { html: `${a.why ? `<p style="margin:0 0 12px">${esc(a.why)}</p>` : ""}<div style="border-radius:14px;overflow:hidden"><div class="yt"><button class="yt-poster" type="button" data-lplay="${esc(a.video_id)}" data-start="${+a.start || 0}" aria-label="Play video: ${esc(title)}"><img src="${ytThumb(a.video_id, "hqdefault")}" alt="" loading="lazy" width="480" height="360"><span class="pb">${ICON.play}</span><span class="cap">${esc(title)}${a.channel || v.channel ? ` · ${esc(a.channel || v.channel)}` : ""}${a.duration ? ` · ${esc(String(a.duration).replace(/^0:/, ""))}` : ""}</span></button></div></div><div class="row" style="margin-top:10px"><a class="chip" href="#/watch/${esc(a.video_id)}" data-video="${esc(a.video_id)}">Open in the theater</a></div>`,
      bind(root) { const b = $("[data-lplay]", root); if (b) b.onclick = (e) => { e.stopPropagation(); const st = +b.dataset.start; b.closest(".yt").innerHTML = `<iframe src="${ytEmbed(a.video_id, st ? `&start=${st}` : "")}" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`; import("../core/history.js").then((h) => h.logView("video", a.video_id, title, { sub: a.channel || v.channel || "", played: true })); }; } };
  },
  quote(a) {
    return { html: `<figure class="quote" style="margin:0"><blockquote>&ldquo;${esc(a.text)}&rdquo;</blockquote><cite><a href="#/researchers/${esc(a.researcher)}" data-person="${esc(a.researcher)}"><b>${esc(a.name || a.researcher)}</b></a>${a.source ? `, ${esc(a.source)}` : ""}${a.date ? `, ${esc(a.date)}` : ""} ${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">source ${ICON.ext}</a>` : ""}</cite></figure>${a.why ? `<p class="muted" style="margin:12px 0 0;font-size:14.5px">${esc(a.why)}</p>` : ""}` };
  },
  "researcher-card"(a, ctx) {
    const p = ctx.people[a.researcher] || { name: a.name || a.researcher, role: "", org: "", warning: "" };
    return { html: `<button type="button" class="match-row" data-person="${esc(a.researcher)}" style="grid-template-columns:72px minmax(0,1fr) auto;padding:12px">${p.photo ? `<span class="avatar" style="width:72px;height:72px"><img src="${esc(p.photo)}" alt="" loading="lazy" width="72" height="72" referrerpolicy="no-referrer"></span>` : `<span class="avatar" style="width:72px;height:72px;font-size:22px">${esc(initials(p.name))}</span>`}<span class="tx"><b style="font-size:17px">${esc(p.name)}</b><span>${esc([p.role, p.org].filter(Boolean).join(", "))}</span>${p.warning ? `<span style="white-space:normal;color:var(--text-2);margin-top:6px">${esc(p.warning)}</span>` : ""}</span><span class="m">Open ${ICON.arrow}</span></button>${a.why ? `<p class="muted" style="margin:12px 0 0">${esc(a.why)}</p>` : ""}` };
  },
  diagram(a) {
    return { html: `<div class="mermaid-box"><pre class="mono" style="margin:0;font-size:13px;white-space:pre-wrap">${esc(a.mermaid)}</pre></div>${a.caption ? `<p class="muted" style="margin:10px 0 0;font-size:14px">${esc(a.caption)}</p>` : ""}`,
      bind(root) { renderMermaid($(".mermaid-box", root), a.mermaid, a.id); } };
  },
  "key-terms"(a, ctx) {
    return { html: `<div class="kterms">${(a.terms || []).map((t) => { const g = ctx.glossary[String(t).toLowerCase()]; return `<details><summary>${esc(t)}</summary><p>${esc(g ? g.def : "See the glossary for this term.")}</p></details>`; }).join("")}</div>` };
  },
  "did-you-know"(a) { return { html: `<p style="margin:0;font-size:16.5px">${inl(a.text)}</p>${a.source ? `<p style="margin:8px 0 0">${src(a.source)}</p>` : ""}` }; },
};

let mermaidP = null, mid = 0;
async function renderMermaid(box, code, id) {
  if (!box || !code) return;
  const io = new IntersectionObserver(async (es) => {
    if (!es[0].isIntersecting) return; io.disconnect();
    try {
      if (!mermaidP) mermaidP = loadScript("assets/vendor/mermaid.min.js").then(() => { window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "base", fontFamily: "Inter, sans-serif", themeVariables: { background: "#0a1726", primaryColor: "#11233a", primaryTextColor: "#e6f0fa", primaryBorderColor: "#22d3ee", lineColor: "#14b8a6", secondaryColor: "#16304d", tertiaryColor: "#0d1b2d", noteBkgColor: "#16304d", noteTextColor: "#e6f0fa", edgeLabelBackground: "#0d1b2d" } }); return window.mermaid; });
      const m = await mermaidP;
      const { svg } = await m.render(`mmd-${String(id).replace(/[^a-z0-9]/gi, "")}-${++mid}`, code);
      box.innerHTML = svg;
    } catch (e) { console.warn("mermaid", e && e.message); }
  }, { rootMargin: "200px" });
  io.observe(box);
}

/* Pointer drag that works with mouse, pen and touch. Short taps still count as clicks. */
function dragify(root, sel, onMove, onDrop, opts = {}) {
  root.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(sel); if (!el || e.target.closest("button[data-up],button[data-dn]") || e.button > 0) return;
    const sx = e.clientX, sy = e.clientY; let dragging = false, ghost = null, target = null, dx = 0, dy = 0;
    const mv = (ev) => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      ev.preventDefault();
      if (!dragging) {
        dragging = true; el._dragged = true;
        if (opts.inPlace) el.classList.add("lift");
        else { const r = el.getBoundingClientRect(); dx = sx - r.left; dy = sy - r.top; ghost = el.cloneNode(true); ghost.classList.add("dragging"); ghost.style.width = r.width + "px"; document.body.appendChild(ghost); el.style.opacity = "0.35"; }
      }
      if (ghost) { ghost.style.left = ev.clientX - dx + "px"; ghost.style.top = ev.clientY - dy + "px"; }
      el._lx = ev.clientX; el._ly = ev.clientY;
      target = onMove(el, ev.clientX, ev.clientY);
    };
    const up = (ev) => {
      removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      if (!dragging) return;
      /* Read the drop spot from the release point, so a fast drag that skipped the last move still lands */
      if (ev && ev.type === "pointerup" && ev.clientX != null) { el._lx = ev.clientX; el._ly = ev.clientY; if (ghost) ghost.style.display = "none"; target = onMove(el, ev.clientX, ev.clientY); }
      if (ghost) ghost.remove(); el.style.opacity = ""; el.classList.remove("lift");
      onDrop(el, target);
      setTimeout(() => (el._dragged = false), 0);
    };
    addEventListener("pointermove", mv, { passive: false }); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  });
}
