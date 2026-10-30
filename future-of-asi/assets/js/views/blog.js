import { $, $$, esc, load, arr, md, frontmatter, pageHero, fmtDate, ICON, readMins, toast, slug as slugify } from "../util.js";
import { logView } from "../core/history.js";
import { auto } from "../core/motion3.js";
import { pic, sec, fx3, fmtN } from "../views3/kit.js";
import { sections as blogMore } from "../views3/blog3.js";

/* Blog: magazine layout with generated covers, tag filter, reading stats, and on each post a contents list,
   reading progress with time left, related posts by shared tags, and previous and next. */
const cover = (b, eager) => pic("blog-" + b.slug, `Cover art for ${b.title}`, { eager, sizes: "(max-width: 760px) 100vw, 60vw" });

export async function render(el, params) {
  const idx = await load("blog/index.json", {});
  const posts = arr(idx, "posts");
  let stopRead = null;
  async function show(p) {
    if (stopRead) { stopRead(); stopRead = null; }
    window.scrollTo(0, 0);
    if (p[0]) return post(p[0]);
    const tags = [...new Set(posts.flatMap((b) => b.tags || []))];
    const words = posts.reduce((s, b) => s + (b.mins || 0), 0);
    const f = posts[0];
    el.innerHTML = `${pageHero({ img: "cover-blog", eyebrow: "Blog", title: "Notes from <span class='serif gt'>the threshold.</span>", lead: `${posts.length} essays by Aniruddha Adak on the future of ASI, why researchers are warning us, AI control and what a student can do. Plain words, my own voice.` })}
    <section class="section tight b3" data-cat="amber"><div class="wrap">
      <div class="b3-stats" data-m3-stagger="80"><div data-m3="up"><b data-m3-count="${posts.length}">${posts.length}</b><span>essays</span></div><div data-m3="up"><b data-m3-count="${words}">${words}</b><span>minutes of reading</span></div><div data-m3="up"><b data-m3-count="${tags.length}">${tags.length}</b><span>topics</span></div></div>
      ${f ? `<a class="b3-lead card-glow" href="#/blog/${f.slug}" data-m3="up" data-v3-tiltimg><div class="im">${cover(f, true)}</div><div class="tx"><span class="chip-cat">Latest</span><h2>${esc(f.title)}</h2><p class="lead">${esc(f.excerpt)}</p><span class="mono muted">${esc(fmtDate(f.date))} · ${f.mins} min read</span></div></a>` : ""}
      <div class="b3-tags" role="group" aria-label="Filter by topic"><button class="v3-chip on" type="button" data-tag="">All</button>${tags.map((t) => `<button class="v3-chip" type="button" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <div class="b3-grid" id="b3g"></div>
    </div></section><div id="b3more"></div>`;
    const paint = (t) => {
      const lead = $(".b3-lead", el); if (lead) lead.hidden = !!t;
      $("#b3g", el).innerHTML = (t ? posts : posts.slice(1)).filter((b) => !t || (b.tags || []).includes(t)).map((b, i) => `<a class="b3-card card-glow m3-spot ${i % 5 === 0 ? "wide" : ""}" href="#/blog/${b.slug}" data-m3="up" data-v3-tiltimg><div class="im">${cover(b)}</div><div class="tx"><div class="chips">${(b.tags || []).slice(0, 2).map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div><h3>${esc(b.title)}</h3><p>${esc(b.excerpt)}</p><span class="mono muted">${esc(fmtDate(b.date))} · ${b.mins} min</span></div></a>`).join("") || `<p class="muted">No posts with that topic yet.</p>`;
      auto($("#b3g", el)); fx3($("#b3g", el));
    };
    let curTag = "";
    $$("[data-tag]", el).forEach((b) => { b.setAttribute("aria-pressed", String(!b.dataset.tag)); b.onclick = () => { curTag = curTag === b.dataset.tag ? "" : b.dataset.tag; $$("[data-tag]", el).forEach((x) => { x.classList.toggle("on", x.dataset.tag === curTag); x.setAttribute("aria-pressed", String(x.dataset.tag === curTag)); }); paint(curTag); }; });
    paint("");
    fx3(el);
    try {
      const host = $("#b3more", el); host.innerHTML = await blogMore(posts); auto(host); fx3(host);
      host.addEventListener("click", (e) => { const b = e.target.closest("[data-tagjump]"); if (!b) return; const t = $(`[data-tag="${CSS.escape(b.dataset.tagjump)}"]`, el); if (t) { t.click(); $(".b3-tags", el).scrollIntoView({ behavior: "smooth", block: "start" }); } });
    } catch (e) { console.warn("blog3", e); }
  }
  async function post(sl) {
    const meta = posts.find((x) => x.slug === sl);
    const src = await load(`blog/${sl}.md`, "");
    if (!src || !meta) { el.innerHTML = `<div class="wrap section"><div class="empty-state"><h3>Post not found</h3><a href="#/blog">All posts</a></div></div>`; return; }
    const { body } = frontmatter(src);
    const i = posts.indexOf(meta), next = posts[i + 1] || posts[0], prev = posts[i - 1] || posts[posts.length - 1];
    const mins = readMins(body);
    const related = posts.filter((b) => b !== meta).map((b) => [b, (b.tags || []).filter((t) => (meta.tags || []).includes(t)).length]).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
    el.innerHTML = `<div class="readbar" id="rb"></div>
    <section class="b3-hero" data-cat="amber"><div class="bg">${cover(meta, true)}</div><div class="v3-banner-shade" aria-hidden="true"></div>
      <div class="wrap-narrow in"><a href="#/blog" class="eyebrow">All posts</a><h1 data-m3-split="words">${esc(meta.title)}</h1><p class="lead" data-m3="up">${esc(meta.excerpt || "")}</p></div></section>
    <div class="b3-post"><aside class="b3-toc" aria-label="Contents"><div class="eyebrow">Contents</div><nav id="b3toc"></nav><div class="b3-left"><span id="b3left">${mins} min left</span><i><b id="b3bar"></b></i></div>
      <button class="v3-btn sm" type="button" id="b3share">Copy link</button></aside>
    <article class="wrap-narrow prose b3-prose"><div class="author"><img src="assets/brand/mark.svg" alt="" width="40" height="40" style="border-radius:12px"><span><b>Aniruddha Adak</b><br>${esc(fmtDate(meta.date))} · ${mins} min read · ${fmtN(String(body).split(/\s+/).length)} words</span></div>
    ${md(body)}</article></div>
    ${related.length ? sec({ id: "b3rel", eyebrow: "Read next", title: "Related posts.", cat: "amber", body: `<div class="b3-rel" data-m3-stagger="80">${related.map((b) => `<a class="b3-card card-glow" href="#/blog/${b.slug}" data-m3="up" data-v3-tiltimg><div class="im">${cover(b)}</div><div class="tx"><h3>${esc(b.title)}</h3><span class="mono muted">${b.mins} min</span></div></a>`).join("")}</div>` }) : ""}
    <section class="section tight"><div class="wrap-narrow b3-pn"><a href="#/blog/${prev.slug}" class="card-glow"><span class="eyebrow">Previous</span><b>${esc(prev.title)}</b></a><a href="#/blog/${next.slug}" class="card-glow nx"><span class="eyebrow">Next</span><b>${esc(next.title)}</b></a></div></section>`;
    const art = $("article", el);
    const hs = $$("h2, h3", art);
    $("#b3toc", el).innerHTML = hs.map((h) => { if (!h.id) h.id = slugify(h.textContent); return `<a href="#${h.id}" class="${h.tagName === "H3" ? "sub" : ""}" data-toc="${h.id}">${esc(h.textContent)}</a>`; }).join("") || `<span class="muted">One short read.</span>`;
    el.querySelector("#b3toc").addEventListener("click", (e) => { const a = e.target.closest("a[data-toc]"); if (!a) return; e.preventDefault(); const t = document.getElementById(a.dataset.toc); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); });
    $("#b3share", el).onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(() => toast("Link copied."), () => toast(location.href)); };
    const onS = () => {
      const a = $("article", el), b = $("#rb", el); if (!a || !b) return;
      const r = a.getBoundingClientRect(); const span = r.height - innerHeight; const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
      b.style.width = `${p * 100}%`; const bb = $("#b3bar", el); if (bb) bb.style.width = `${p * 100}%`;
      const l = $("#b3left", el); if (l) l.textContent = p >= 0.99 ? "Finished" : `${Math.max(1, Math.ceil(mins * (1 - p)))} min left`;
      let cur = ""; hs.forEach((h) => { if (h.getBoundingClientRect().top < innerHeight * 0.3) cur = h.id; });
      $$("#b3toc a", el).forEach((x) => x.classList.toggle("on", x.dataset.toc === cur));
    };
    addEventListener("scroll", onS, { passive: true }); onS();
    stopRead = () => removeEventListener("scroll", onS);
    document.title = `${meta.title} · Threshold`;
    logView("post", sl, meta.title, { sub: fmtDate(meta.date) });
    fx3(el);
  }
  el._onParams = async (p) => { await show(p); auto(el); };
  await show(params);
  return () => { if (stopRead) stopRead(); };
}
