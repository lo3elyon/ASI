/* Voices, Round 3 blocks: quote of the day, themes, quotes by year, most quoted, word field and two voices in tension. Quotes come from data/researchers.json, unchanged. */
import { $, $$, esc, researchers, avatar, toast, ICON } from "../util.js";
import { pic, banner, sec, src, dayIndex, fmtN, fx3, bars, face } from "./kit.js";
import { auto } from "../core/motion3.js";

const THEMES = [
  ["Losing control", /control|in charge|take over|takeover|switch (it )?off|turn (it )?off|contain/i, "#ef4444"],
  ["Extinction and catastrophe", /extinct|catastroph|wipe|end of (the )?human|doom|kill|surviv/i, "#f59e0b"],
  ["Smarter than us", /smarter|superintelligen|surpass|outsmart|more intelligent|exceed/i, "#22d3ee"],
  ["Speed and timelines", /years|decade|soon|fast|quick|sooner|timeline|2027|2030/i, "#3b82f6"],
  ["Power and who holds it", /power|concentrat|govern|regulat|law|state|company|companies/i, "#84cc16"],
  ["Hope and what could go right", /benefit|cure|flourish|hope|abundance|wonderful|good for|optimis/i, "#14b8a6"],
];
const STOP = new Set("the a an and or but of to in on for with that this is are be it as at by from we i you they he she not have has had was were will would can could should do does did if so than then there their them our your its into about more most very what which who when how all any some just like also these those because been being one such only even over out up no may might much many us my me".split(" "));

export async function mount(el) {
  const ppl = await researchers();
  const all = ppl.flatMap((p) => p.quotes.map((q) => ({ ...q, p })));
  if (!all.length) return;
  const pool = all.filter((q) => q.url && q.text.length > 50 && q.text.length < 300);
  const qd = pool[dayIndex(pool.length)] || all[0];
  const themed = THEMES.map(([l, re, c]) => ({ l, c, qs: all.filter((q) => re.test(q.text)) }));
  const yr = {}; all.forEach((q) => { const y = (String(q.date || "").match(/(19|20)\d\d/) || [])[0]; if (y) yr[y] = (yr[y] || 0) + 1; });
  const yrs = Object.keys(yr).sort(); const ymax = Math.max(1, ...Object.values(yr));
  const most = ppl.filter((p) => p.quotes.length).sort((a, b) => b.quotes.length - a.quotes.length).slice(0, 10);
  const wc = {}; all.forEach((q) => q.text.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).forEach((w) => { if (w.length > 3 && !STOP.has(w)) wc[w] = (wc[w] || 0) + 1; }));
  const words = Object.entries(wc).sort((a, b) => b[1] - a[1]).slice(0, 44); const wmax = words[0] ? words[0][1] : 1;
  const calm = all.filter((q) => ["optimist", "critic"].includes(q.p.group) && q.text.length < 260);
  const worried = all.filter((q) => ["doomer", "pioneer", "alignment"].includes(q.p.group) && q.text.length < 260);

  const box = document.createElement("div"); box.className = "v3-voi";
  box.innerHTML = `
  <section class="v3-qotd" data-cat="amber" aria-labelledby="v3qd">
    <div class="bg">${pic("voices-qotd", "A single vintage microphone under one warm spotlight in an empty concert hall", { sizes: "100vw" })}</div><div class="v3-banner-shade" aria-hidden="true"></div>
    <div class="wrap-narrow in"><div class="eyebrow" id="v3qd" data-m3="left">Quote of the day</div>
      <blockquote data-m3-split="words">${esc(qd.text)}</blockquote>
      <div class="by" data-m3="up">${face(qd.p)}<span><a href="#/researchers/${qd.p.id}" data-person="${qd.p.id}"><b>${esc(qd.p.name)}</b></a><br>${esc(qd.source || "")}${qd.date ? `, ${esc(qd.date)}` : ""} ${src(qd.url, "source")}</span></div>
      <div class="row"><button class="v3-btn" type="button" id="v3copy" data-m3-magnet>Copy with source</button><span class="muted mono">A new one every day</span></div></div>
  </section>

  ${banner("voices-themes", { eyebrow: "Themes", title: "What they keep coming back to.", lead: "Every quote sorted into six themes by the words it uses. One quote can sit in more than one theme. Tap a theme to read them all.", alt: "Hundreds of old microphones and speakers in a dark gallery lit amber, cyan and teal", cat: "amber", id: "v3thH" })}
  <section class="section tight" data-cat="amber" aria-label="Themes"><div class="wrap">
    <div class="v3-themes" data-m3-stagger="60">${themed.map((t, i) => `<button type="button" class="v3-theme card-glow" data-th="${i}" style="--c:${t.c}" data-m3="scale" aria-pressed="false"><b data-m3-count="${t.qs.length}">${t.qs.length}</b><span>${esc(t.l)}</span><i style="--w:${((t.qs.length / all.length) * 100).toFixed(1)}%"></i></button>`).join("")}</div>
    <div id="v3thOut" aria-live="polite"></div>
  </div></section>

  ${sec({ id: "v3yr", eyebrow: "When they said it", title: "The warnings got louder.", cat: "amber", lead: "Number of quotes in this guide by the year they were said. Most of the field's public words are very recent.", body: `
    <div class="v3-hist" data-v3 role="img" aria-label="Quotes per year from ${yrs[0]} to ${yrs[yrs.length - 1]}">${(() => { const gap = Math.max(2, Math.ceil(yrs.length / 6)); let last = -99; const key = yrs.map((y, i) => { const k = i === 0 || i === yrs.length - 1 ? true : i - last >= gap && yrs.length - 1 - i >= gap && /0$|5$/.test(y); if (k) last = i; return k; }); return yrs.map((y, i) => `<div class="b" style="--h:${((yr[y] / ymax) * 100).toFixed(1)}%;--i:${i}" title="${y}: ${yr[y]} quotes"><i></i><span>${yr[y]}</span><em class="${key[i] ? "k" : ""}">${/0$|5$/.test(y) || i === yrs.length - 1 || i === 0 ? y : ""}</em></div>`).join(""); })()}</div>` })}

  ${sec({ id: "v3most", eyebrow: "Most quoted", title: "The ten voices with the most lines here.", cat: "amber", body: `
    <div class="v3-most" data-m3-stagger="50">${most.map((p, i) => `<a class="v3-mostc card-glow" href="#/researchers/${p.id}" data-person="${p.id}" data-m3-tilt="6"><span class="rk">${i + 1}</span>${face(p, "avatar lg")}<b>${esc(p.name)}</b><span class="muted">${p.quotes.length} quotes</span></a>`).join("")}</div>` })}

  ${sec({ id: "v3wf", eyebrow: "Word field", title: "The words they use most.", cat: "amber", lead: `The ${words.length} most common words across all ${fmtN(all.length)} quotes, small words removed. Bigger means more often. Tap a word to find quotes that use it.`, body: `
    <div class="v3-words" data-m3-stagger="20">${words.map(([w, n], i) => `<button type="button" class="v3-word" data-w="${esc(w)}" data-m3="fade" style="--s:${(0.85 + (n / wmax) * 2.1).toFixed(2)};--c:${["#f59e0b", "#22d3ee", "#14b8a6", "#84cc16", "#3b82f6", "#ef4444"][i % 6]}" title="${n} times">${esc(w)}</button>`).join("")}</div>
    <div id="v3wOut" aria-live="polite"></div>` })}

  ${calm.length && worried.length ? sec({ id: "v3pair", eyebrow: "Two voices", title: "Hold both of these at once.", cat: "amber", lead: "One worried line and one calmer or sceptical line, side by side. Shuffle for another pair.", body: `
    <div class="v3-pair" id="v3pair"></div><button class="v3-btn" type="button" id="v3shuf">Shuffle the pair</button>` }) : ""}
  `;
  el.appendChild(box);

  $("#v3copy", box).onclick = () => { const t = `"${qd.text}" ${qd.p.name}${qd.source ? ", " + qd.source : ""}${qd.date ? ", " + qd.date : ""}. ${qd.url}`; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Copied with its source."), () => toast("Copy did not work in this browser.")); };

  const list = (qs, host) => { host.innerHTML = `<div class="v3-qlist">${qs.slice(0, 60).map((q) => `<figure class="v3-qi" data-m3="up"><blockquote>&ldquo;${esc(q.text)}&rdquo;</blockquote><figcaption><a href="#/researchers/${q.p.id}" data-person="${q.p.id}">${esc(q.p.name)}</a>${q.date ? `, ${esc(q.date)}` : ""} ${src(q.url, "source")}</figcaption></figure>`).join("")}</div>${qs.length > 60 ? `<p class="muted">Showing 60 of ${qs.length}. The full wall is above.</p>` : ""}`; auto(host); };
  box.addEventListener("click", (e) => {
    const t = e.target.closest("[data-th]");
    if (t) { const on = t.getAttribute("aria-pressed") !== "true"; $$("[data-th]", box).forEach((x) => x.setAttribute("aria-pressed", x === t && on)); const h = $("#v3thOut", box); if (on) list(themed[+t.dataset.th].qs, h); else h.innerHTML = ""; return; }
    const w = e.target.closest("[data-w]");
    if (w) { const re = new RegExp(`\\b${w.dataset.w}\\b`, "i"); $$("[data-w]", box).forEach((x) => x.classList.toggle("on", x === w)); list(all.filter((q) => re.test(q.text)), $("#v3wOut", box)); }
  });
  const pair = () => {
    const a = worried[Math.floor(Math.random() * worried.length)], b = calm[Math.floor(Math.random() * calm.length)];
    $("#v3pair", box).innerHTML = [a, b].map((q, i) => `<figure class="v3-pq ${i ? "calm" : "warm"}" data-m3="${i ? "right" : "left"}"><span class="chip-cat">${i ? "Calmer or sceptical" : "Worried"}</span><blockquote>&ldquo;${esc(q.text)}&rdquo;</blockquote><figcaption>${face(q.p)}<span><a href="#/researchers/${q.p.id}" data-person="${q.p.id}"><b>${esc(q.p.name)}</b></a><br>${esc(q.date || "")} ${src(q.url, "source")}</span></figcaption></figure>`).join("");
    auto($("#v3pair", box));
  };
  if ($("#v3pair", box)) { pair(); $("#v3shuf", box).onclick = pair; }
  fx3(box);
}
