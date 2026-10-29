import { $, $$, esc, researchers, avatar, RM, GROUPS, ICON } from "../util.js";

export async function render(el) {
  const ppl = await researchers();
  const all = ppl.flatMap((p) => p.quotes.map((q) => ({ ...q, p })));
  const KEY = /control|extinct|risk|danger|warn|kill|catastroph|surviv|threat|humanity|safe|power|smarter|intelligen|doom|chance|lose|end|future|careful|alien/i;
  const pool = all.filter((q) => q.text.length > 40 && q.text.length < 230);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const stage = [...shuffle(pool.filter((q) => KEY.test(q.text))), ...shuffle(pool.filter((q) => !KEY.test(q.text)))];
  let i = 0, timer = 0, paused = false;

  el.innerHTML = `<section class="section" style="padding-bottom:20px;background:radial-gradient(800px 400px at 50% 20%, color-mix(in srgb, var(--amber) 8%, transparent), transparent 70%)">
    <div class="wrap" style="text-align:center"><div class="eyebrow">Voices wall</div></div>
    <div class="wrap voice-stage" aria-live="polite">
      <div><blockquote id="vq"></blockquote><div class="by" id="vb"></div>
      <div class="voice-ctrl"><button class="icon-btn" type="button" id="vp" aria-label="Previous quote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg></button>
      <button class="btn sm" type="button" id="vpause">Pause</button>
      <button class="icon-btn" type="button" id="vn" aria-label="Next quote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></button></div>
      <p class="count" id="vcount" style="margin-top:14px"></p></div>
    </div>
  </section>
  <section class="section tight"><div class="wrap">
    <div class="sec-head"><div><h2>Every quote, <span class="serif">with its source.</span></h2><p class="muted" style="margin:0">${all.length} quotes from ${ppl.filter((p) => p.quotes.length).length} people. Tap a name to see their full profile.</p></div>
    <div class="chips" role="group" aria-label="Filter quotes"><button class="chip on" data-g="all" type="button">All</button>${Object.keys(GROUPS).filter((g) => all.some((q) => q.p.group === g)).map((g) => `<button class="chip" data-g="${g}" type="button">${GROUPS[g].label}</button>`).join("")}</div></div>
    <div class="masonry" id="wall"></div>
  </div></section>`;

  function show(k) {
    if (!stage.length) { $("#vq", el).textContent = "Quotes will appear here once the dataset is loaded."; return; }
    i = (k + stage.length) % stage.length;
    const q = stage[i];
    const words = q.text.trim().split(/\s+/);
    const delay = Math.min(0.09, 2.2 / words.length);
    $("#vq", el).innerHTML = words.map((w, n) => `<span class="w" style="transition-delay:${(n * delay).toFixed(2)}s">${n === 0 ? "&ldquo;" : ""}${esc(w)}${n === words.length - 1 ? "&rdquo;" : ""}</span>`).join(" ");
    $("#vb", el).innerHTML = `${avatar(q.p)}<span><a href="#/researchers/${q.p.id}"><b>${esc(q.p.name)}</b></a><br>${esc(q.source || "")}${q.date ? `, ${esc(q.date)}` : ""} ${q.url ? `<a href="${esc(q.url)}" target="_blank" rel="noopener">source ${ICON.ext}</a>` : ""}</span>`;
    $("#vcount", el).textContent = `${i + 1} / ${stage.length}`;
    requestAnimationFrame(() => requestAnimationFrame(() => $$("#vq .w", el).forEach((w) => w.classList.add("in"))));
    clearTimeout(timer);
    if (!paused && !RM()) timer = setTimeout(() => show(i + 1), 4200 + words.length * 260);
  }
  $("#vn", el).addEventListener("click", () => show(i + 1));
  $("#vp", el).addEventListener("click", () => show(i - 1));
  $("#vpause", el).addEventListener("click", (e) => { paused = !paused; e.target.textContent = paused ? "Play" : "Pause"; if (!paused) show(i + 1); else clearTimeout(timer); });
  if (RM()) { paused = true; $("#vpause", el).textContent = "Play"; }
  const onKey = (e) => { if (/input|textarea/i.test(document.activeElement.tagName)) return; if (e.key === "ArrowRight") show(i + 1); if (e.key === "ArrowLeft") show(i - 1); };
  document.addEventListener("keydown", onKey);
  show(0);

  function wall(g) {
    const list = all.filter((q) => g === "all" || q.p.group === g);
    $("#wall", el).innerHTML = list.map((q, n) => `<div class="rv ${n % 3 ? "d" + (n % 3) : ""}"><figure class="qcard card" style="width:100%;margin:0"><blockquote>&ldquo;${esc(q.text)}&rdquo;</blockquote><figcaption class="by">${avatar(q.p)}<span><a href="#/researchers/${q.p.id}"><b>${esc(q.p.name)}</b></a><br>${esc(q.source || "")}${q.date ? `, ${esc(q.date)}` : ""}${q.url ? ` <a href="${esc(q.url)}" target="_blank" rel="noopener" aria-label="Source">${ICON.ext}</a>` : ""}</span></figcaption></figure></div>`).join("");
    import("../util.js").then((u) => u.reveal(el));
  }
  $$("[data-g]", el).forEach((b) => b.addEventListener("click", () => { $$("[data-g]", el).forEach((x) => x.classList.toggle("on", x === b)); wall(b.dataset.g); }));
  wall("all");
  return () => { clearTimeout(timer); document.removeEventListener("keydown", onKey); };
}
