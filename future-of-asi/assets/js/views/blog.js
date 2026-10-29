import { $, esc, load, arr, md, frontmatter, pageHero, fmtDate, ICON, readMins } from "../util.js";
import { logView } from "../core/history.js";

export async function render(el, params) {
  const idx = await load("blog/index.json", {});
  const posts = arr(idx, "posts");
  async function show(p) {
    window.scrollTo(0, 0);
    if (p[0]) return post(p[0]);
    el.innerHTML = `${pageHero({ img: "cover-blog", eyebrow: "Blog", title: "Notes from <span class='serif gt'>the threshold.</span>", lead: `${posts.length} essays by Aniruddha Adak on the future of ASI, why researchers are warning us, AI control and what a student can do. Plain words, my own voice.` })}
    <section class="section tight"><div class="wrap"><div class="posts">${posts.map((b, i) => i === 0 ? `<a class="card hov spot post-card feature rv" href="#/blog/${b.slug}"><div class="cov" style="background-image:url('assets/img/${b.cover}.jpg')"></div><div class="body"><div class="eyebrow">Latest</div><h3>${esc(b.title)}</h3><p class="lead" style="font-size:17px">${esc(b.excerpt)}</p><div class="foot"><span>${esc(fmtDate(b.date))}</span><span>${b.mins} min read</span></div></div></a>`
      : `<a class="card hov spot post-card rv d${i % 3}" href="#/blog/${b.slug}"><div class="chips">${(b.tags || []).slice(0, 2).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div><h3>${esc(b.title)}</h3><p>${esc(b.excerpt)}</p><div class="foot"><span>${esc(fmtDate(b.date))}</span><span>${b.mins} min read</span></div></a>`).join("")}</div></div></section>`;
    import("../util.js").then((m) => m.reveal(el));
  }
  async function post(slug) {
    const meta = posts.find((x) => x.slug === slug);
    const src = await load(`blog/${slug}.md`, "");
    if (!src || !meta) { el.innerHTML = `<div class="wrap section"><div class="empty-state"><h3>Post not found</h3><a href="#/blog">All posts</a></div></div>`; return; }
    const { body } = frontmatter(src);
    const i = posts.indexOf(meta), next = posts[i + 1] || posts[0];
    el.innerHTML = `<div class="readbar" id="rb"></div>
    <section class="phero" style="min-height:clamp(320px,46vh,480px)"><div class="bgimg" style="background-image:url('assets/img/${meta.cover}.jpg')"></div><div class="wrap-narrow" style="position:relative;z-index:2;padding:110px 0 40px"><a href="#/blog" class="eyebrow">All posts</a><h1 style="font-size:clamp(34px,5vw,60px);margin-top:14px">${esc(meta.title)}</h1></div></section>
    <article class="wrap-narrow prose" style="padding-bottom:40px"><div class="author"><img src="assets/brand/mark.svg" alt="" width="40" height="40" style="border-radius:12px"><span><b>Aniruddha Adak</b><br>${esc(fmtDate(meta.date))} · ${readMins(body)} min read</span></div>
    ${md(body)}
    <hr><div class="callout" style="margin-top:20px"><div><div class="eyebrow">Next post</div><h3 style="margin:8px 0 0">${esc(next.title)}</h3></div><a class="btn primary" href="#/blog/${next.slug}">Read ${ICON.arrow}</a></div></article>`;
    const onS = () => { const a = $("article", el); const b = $("#rb", el); if (!a || !b) return removeEventListener("scroll", onS); const r = a.getBoundingClientRect(); const span = r.height - innerHeight; b.style.width = `${span > 0 ? Math.min(100, Math.max(0, (-r.top / span) * 100)) : 100}%`; };
    addEventListener("scroll", onS, { passive: true });
    document.title = `${meta.title} · Threshold`;
    logView("post", slug, meta.title, { sub: fmtDate(meta.date) });
  }
  el._onParams = show;
  await show(params);
}
