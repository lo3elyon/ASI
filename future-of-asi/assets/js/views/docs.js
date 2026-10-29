import { $, $$, esc, load, arr, md, frontmatter, slug, toast } from "../util.js";
import { sections as docsMore, wire as docsWire } from "../views3/docs3.js";
import { auto } from "../core/motion3.js";
import { pic, fx3 } from "../views3/kit.js";

/* Docs: blueprint styled reader with an image banner per section, a cards overview, visual glossary cards with search and
   letter rail, a searchable FAQ, and a "on this page" outline for markdown pages. */
const ART = {
  overview: ["doc-overview", "A folded paper city map under a cyan lamp with a magnifying glass and a compass"],
  architecture: ["doc-architecture", "A blueprint of a building in fine cyan lines on an architect's desk"],
  schemas: ["doc-schemas", "Wooden index card drawers with one drawer open and cards glowing cyan"],
  contribute: ["doc-contribute", "Many hands placing glowing puzzle pieces into a shared puzzle"],
  "add-researcher": ["doc-add-researcher", "A blank profile card being pinned onto a cork board linked by teal threads"],
  "add-video": ["doc-add-video", "A film reel and a strip of film on a glowing lightbox with a loupe"],
  design: ["doc-design", "Colour swatch cards in teal, cyan, amber, red, blue and lime fanned on navy paper"],
  accessibility: ["doc-accessibility", "A gentle lit ramp beside steps into an open glass doorway at night"],
  glossary: ["doc-glossary", "An open dictionary with cyan particles of light lifting off the page"],
  faq: ["doc-faq", "An information desk with a brass service bell and a cyan lamp in an empty museum hall"],
};
const TINT = ["#22d3ee", "#14b8a6", "#f59e0b", "#84cc16", "#3b82f6", "#ef4444"];

export async function render(el, params, query) {
  const idx = await load("docs/index.json", {});
  const pages = arr(idx, "pages");
  async function show(p, q) {
    const id = p[0] || "home";
    const page = pages.find((x) => x.slug === id);
    el.innerHTML = `<section class="section tight d3" data-cat="blue"><div class="wrap docs-layout">
      <nav class="toc d3-nav" aria-label="Docs"><div class="uh">Documentation</div><a href="#/docs" class="${!page ? "on" : ""}" ${!page ? 'aria-current="page"' : ""}>All sections</a>${pages.map((x, i) => `<a href="#/docs/${x.slug}" class="${page && x.slug === page.slug ? "on" : ""}" ${page && x.slug === page.slug ? 'aria-current="page"' : ""} style="--c:${TINT[i % TINT.length]}"><i></i>${esc(x.title)}</a>`).join("")}<div class="uh">Elsewhere</div><a href="https://github.com/lo3elyon/ASI" target="_blank" rel="noopener">GitHub repo</a><a href="../">ASI hub</a></nav>
      <div id="doc" class="prose d3-doc" style="max-width:none"></div></div></section>`;
    const host = $("#doc", el);
    window.scrollTo(0, 0);
    if (!page) {
      home(host); done();
      try { const m = document.createElement("div"); m.className = "d3-more"; m.innerHTML = await docsMore(); host.appendChild(m); docsWire(m, toast); auto(m); fx3(m); } catch (e) { console.warn("docs3", e); }
      return;
    }
    const art = ART[page.slug];
    const ban = art ? `<div class="d3-ban">${pic(art[0], art[1], { eager: true, sizes: "(max-width: 900px) 100vw, 900px" })}<div class="cap"><span class="eyebrow">Docs</span><b>${esc(page.title)}</b><span>${esc(page.summary || "")}</span></div></div>` : "";
    if (page.slug === "glossary") { await glossary(host, ban, q && q.get("t")); return done(); }
    if (page.slug === "faq") { await faq(host, ban); return done(); }
    const src = await load(`docs/${page.slug}.md`, "");
    host.innerHTML = `${ban}<div class="d3-md"><div style="max-width:76ch" class="d3-body">${md(frontmatter(src).body)}</div><aside class="d3-otp" aria-label="On this page"><div class="eyebrow">On this page</div><nav id="otp"></nav></aside></div>`;
    const hs = $$(".d3-body h2", host);
    $("#otp", host).innerHTML = hs.map((h) => { if (!h.id) h.id = slug(h.textContent); return `<a href="#${h.id}">${esc(h.textContent)}</a>`; }).join("");
    if (!hs.length) $(".d3-otp", host).remove();
    done();
  }
  const done = () => { auto(el); fx3(el); };
  function home(host) {
    host.innerHTML = `<h1 data-m3-split="words">How Threshold works.</h1><p class="lead">Everything about this site: how it is built, where the data comes from, how to add to it, and the words you will meet. Pick a section.</p>
      <div class="d3-cards" data-m3-stagger="50">${pages.map((x, i) => { const a = ART[x.slug]; return `<a class="d3-card card-glow m3-spot" href="#/docs/${x.slug}" data-m3="up" style="--c:${TINT[i % TINT.length]}" data-v3-tiltimg>${a ? `<div class="im">${pic(a[0], a[1])}</div>` : ""}<div class="tx"><span class="n">${String(i + 1).padStart(2, "0")}</span><h3>${esc(x.title)}</h3><p>${esc(x.summary || "")}</p></div></a>`; }).join("")}</div>`;
  }
  async function glossary(host, ban, focus) {
    const terms = arr(await load("glossary.json"), "terms").slice().sort((a, b) => a.term.localeCompare(b.term));
    const letters = [...new Set(terms.map((t) => t.term[0].toUpperCase()))];
    host.innerHTML = `${ban}<h1>Glossary</h1><p class="lead">${terms.length} words you will meet in AI safety, each in one or two plain sentences. Every card has its own link you can share.</p>
      <div class="d3-gtool"><input class="input search" id="gq" type="search" placeholder="Search ${terms.length} terms and meanings" aria-label="Search the glossary"><span class="count" id="gc"></span><button class="v3-btn sm" type="button" id="grand">Random term</button></div>
      <div class="d3-letters" role="group" aria-label="Jump to letter">${letters.map((l) => `<button class="v3-chip" type="button" data-l="${l}">${l}</button>`).join("")}</div><div class="d3-gl" id="gl"></div>`;
    const paint = (q = "") => {
      const ws = q.toLowerCase().split(/\s+/).filter(Boolean);
      const list = terms.filter((t) => ws.every((w) => `${t.term} ${t.def}`.toLowerCase().includes(w)));
      $("#gc", host).textContent = `${list.length} of ${terms.length}`;
      $("#gl", host).innerHTML = list.map((t, i) => `<article class="d3-term card-glow" id="g-${slug(t.term)}" data-l="${t.term[0].toUpperCase()}" style="--c:${TINT[i % TINT.length]}" data-m3="up"><span class="lt" aria-hidden="true">${esc(t.term[0])}</span><h3>${esc(t.term)}</h3><p>${esc(t.def)}</p><a class="lk" href="#/docs/glossary?t=${encodeURIComponent(t.term)}">Link to this term</a></article>`).join("") || `<p class="muted">No term matches that. Try a shorter word.</p>`;
      auto($("#gl", host));
    };
    paint();
    $("#gq", host).oninput = (e) => paint(e.target.value);
    $$("[data-l]", host).forEach((b) => { if (b.tagName === "BUTTON") b.onclick = () => { $("#gq", host).value = ""; paint(); const d = $(`.d3-term[data-l="${b.dataset.l}"]`, host); if (d) d.scrollIntoView({ behavior: "smooth", block: "center" }); }; });
    $("#grand", host).onclick = () => { $("#gq", host).value = ""; paint(); const all = $$(".d3-term", host); const d = all[Math.floor(Math.random() * all.length)]; if (d) { d.scrollIntoView({ behavior: "smooth", block: "center" }); d.classList.add("pulse"); setTimeout(() => d.classList.remove("pulse"), 1600); } };
    if (focus) setTimeout(() => { const d = document.getElementById(`g-${slug(focus)}`); if (d) { d.scrollIntoView({ block: "center" }); d.classList.add("pulse"); } }, 80);
  }
  async function faq(host, ban) {
    const list = arr(await load("faq.json"), "faq");
    host.innerHTML = `${ban}<h1>Questions people ask</h1><p class="lead">Short honest answers about this site, the data, and the topic.</p>
      <div class="d3-gtool"><input class="input search" id="fq" type="search" placeholder="Search ${list.length} questions" aria-label="Search the FAQ"><span class="count" id="fc"></span><button class="v3-btn sm" type="button" id="fopen">Open all</button></div>
      <div class="d3-faq" id="fl"></div>`;
    const paint = (q = "") => {
      const ws = q.toLowerCase().split(/\s+/).filter(Boolean);
      const r = list.filter((f) => ws.every((w) => `${f.q} ${f.a}`.toLowerCase().includes(w)));
      $("#fc", host).textContent = `${r.length} of ${list.length}`;
      const hl = (s) => { let h = esc(s); ws.forEach((w) => { if (w.length > 1) h = h.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>"); }); return h; };
      $("#fl", host).innerHTML = r.map((f, i) => `<details ${i || ws.length ? "" : "open"} data-m3="up"><summary><span class="n">${String(i + 1).padStart(2, "0")}</span>${hl(f.q)}</summary><p>${hl(f.a)}</p></details>`).join("") || `<p class="muted">No question matches. Try another word, or ask on GitHub.</p>`;
      if (ws.length) $$("#fl details", host).forEach((d) => (d.open = true));
      auto($("#fl", host));
    };
    paint();
    $("#fq", host).oninput = (e) => paint(e.target.value);
    $("#fopen", host).onclick = () => { const all = $$("#fl details", host); const o = !all.every((d) => d.open); all.forEach((d) => (d.open = o)); };
  }
  el._onParams = (p, q) => show(p, q);
  await show(params, query);
  el.addEventListener("click", (e) => { const a = e.target.closest('a[href^="#"]'); if (a && !a.getAttribute("href").startsWith("#/")) { e.preventDefault(); const t = document.getElementById(a.getAttribute("href").slice(1)); if (t) t.scrollIntoView({ behavior: "smooth" }); } });
}
