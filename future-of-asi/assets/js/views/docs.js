import { $, $$, esc, load, arr, md, frontmatter, slug } from "../util.js";

export async function render(el, params, query) {
  const idx = await load("docs/index.json", {});
  const pages = arr(idx, "pages");
  async function show(p, q) {
    const id = p[0] || pages[0]?.slug || "overview";
    const page = pages.find((x) => x.slug === id) || pages[0];
    el.innerHTML = `<section class="section tight"><div class="wrap docs-layout">
      <nav class="toc" aria-label="Docs"><div class="uh">Documentation</div>${pages.map((x) => `<a href="#/docs/${x.slug}" class="${x.slug === page.slug ? "on" : ""}" ${x.slug === page.slug ? 'aria-current="page"' : ""}>${esc(x.title)}</a>`).join("")}<div class="uh">Elsewhere</div><a href="https://github.com/lo3elyon/ASI" target="_blank" rel="noopener">GitHub repo</a><a href="../">ASI hub</a></nav>
      <div id="doc" class="prose" style="max-width:none"></div></div></section>`;
    const host = $("#doc", el);
    if (page.slug === "glossary") return glossary(host, q && q.get("t"));
    if (page.slug === "faq") return faq(host);
    const src = await load(`docs/${page.slug}.md`, "");
    host.innerHTML = `<div style="max-width:76ch">${md(frontmatter(src).body)}</div>`;
    window.scrollTo(0, 0);
  }
  async function glossary(host, focus) {
    const terms = arr(await load("glossary.json"), "terms");
    const letters = [...new Set(terms.map((t) => t.term[0].toUpperCase()))];
    host.innerHTML = `<h1>Glossary</h1><p class="lead">${terms.length} words you will meet in AI safety, each in one or two plain sentences.</p>
      <input class="input search" id="gq" type="search" placeholder="Filter terms" aria-label="Filter terms" style="width:100%;margin:10px 0 14px">
      <div class="letters">${letters.map((l) => `<button class="chip" type="button" data-l="${l}" style="width:34px;justify-content:center;padding:6px 0">${l}</button>`).join("")}</div><div class="gloss" id="gl"></div>`;
    const paint = (q = "") => { $("#gl", host).innerHTML = terms.filter((t) => `${t.term} ${t.def}`.toLowerCase().includes(q.toLowerCase())).map((t) => `<details id="g-${slug(t.term)}" data-l="${t.term[0].toUpperCase()}" ${focus && t.term === focus ? "open" : ""}><summary>${esc(t.term)}</summary><p>${esc(t.def)}</p></details>`).join(""); };
    paint();
    $("#gq", host).oninput = (e) => paint(e.target.value);
    $$("[data-l]", host).forEach((b) => { if (b.tagName === "BUTTON") b.onclick = () => { const d = $(`details[data-l="${b.dataset.l}"]`, host); if (d) d.scrollIntoView({ behavior: "smooth", block: "center" }); }; });
    if (focus) setTimeout(() => { const d = document.getElementById(`g-${slug(focus)}`); if (d) d.scrollIntoView({ block: "center" }); }, 50);
  }
  async function faq(host) {
    const list = arr(await load("faq.json"), "faq");
    host.innerHTML = `<h1>Questions people ask</h1><p class="lead">Short honest answers about this site, the data, and the topic.</p><div class="gloss">${list.map((f, i) => `<details ${i ? "" : "open"}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>`;
  }
  el._onParams = (p, q) => show(p, q);
  await show(params, query);
  // In-page anchor links inside markdown docs should scroll, not route
  el.addEventListener("click", (e) => { const a = e.target.closest('a[href^="#"]'); if (a && !a.getAttribute("href").startsWith("#/")) { e.preventDefault(); const t = document.getElementById(a.getAttribute("href").slice(1)); if (t) t.scrollIntoView({ behavior: "smooth" }); } });
}
