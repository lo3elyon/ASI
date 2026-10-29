/* Blog, Round 3 extra sections for the index (views owner).
   People, word counts and topics are computed from the posts themselves; further reading comes from data/resources.json
   (verified entries with their own URLs). */
import { esc, load, arr, frontmatter, researchers } from "../util.js";
import { pic, sec, src, fmtN, bars } from "./kit.js";

const PATHS = [
  { t: "New to all this", c: "#f59e0b", why: "Start here if the words ASI and p(doom) are new to you.", slugs: ["future-of-asi-in-simple-words", "why-the-builders-are-warning-us", "reading-pdoom-without-panic"] },
  { t: "You build with AI", c: "#22d3ee", why: "For developers and makers who want the safety side of the work.", slugs: ["i-build-agents", "ai-control-like-an-exam-hall", "start-big-fix-later-not-for-asi"] },
  { t: "You want to act calmly", c: "#84cc16", why: "For anyone who feels worried and wants useful next steps.", slugs: ["preparing-without-panic", "best-arguments-we-will-be-fine", "what-a-student-in-india-can-do"] },
];

const RULES = [
  ["Plain words", "If a ten year old cannot follow a sentence, I rewrite it."],
  ["No hype", "No exclamation marks, no shouting, no fake urgency."],
  ["Both sides", "When I share a worry, I also share the best case against it."],
  ["Sources first", "Every quote and number on this site links to where it came from."],
  ["My own voice", "I write as myself, a student and agent builder from India, not as an expert."],
  ["Start big, fix later", "I ship, then I fix. Except for ASI itself, where fixing later may not be possible."],
];

/* Load every post body once, so we can count words and find the people named in them */
export async function bodies(posts) {
  const out = await Promise.all(posts.map((b) => load(`blog/${b.slug}.md`, "").then((s) => ({ b, body: frontmatter(s || "").body || "" }))));
  return out.map(({ b, body }) => ({ b, body, words: String(body).split(/\s+/).filter(Boolean).length }));
}

export async function sections(posts) {
  const [B, ppl, resRaw] = await Promise.all([bodies(posts), researchers(), load("resources.json", [])]);
  const bySlug = Object.fromEntries(posts.map((b) => [b.slug, b]));
  const words = B.reduce((a, x) => a + x.words, 0);

  /* People named in the essays: full name match only, so nobody is matched by a shared first name */
  const named = ppl.map((p) => ({ p, in: B.filter((x) => x.body.includes(p.name)).map((x) => x.b) })).filter((x) => x.in.length).sort((a, b) => b.in.length - a.in.length);

  /* Topic counts */
  const tc = {}; posts.forEach((b) => (b.tags || []).forEach((t) => (tc[t] = (tc[t] || 0) + 1)));
  const tags = Object.entries(tc).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const tmax = Math.max(1, ...tags.map((t) => t[1]));

  /* Further reading: verified resources with a URL, a few of each kind */
  const res = arr(resRaw, "resources").filter((r) => r && r.url && r.verified !== false);
  const pickType = (ty, n) => res.filter((r) => r.type === ty).slice(0, n);
  const reading = [...pickType("book", 3), ...pickType("paper", 3), ...pickType("blog", 2), ...pickType("newsletter", 1), ...pickType("course", 3)].slice(0, 12);

  const C = ["#f59e0b", "#22d3ee", "#14b8a6", "#84cc16", "#3b82f6", "#ef4444", "#eab308", "#f97316", "#10b981", "#0ea5e9", "#f59e0b"];
  const len = B.slice().sort((a, b) => b.words - a.words).map((x, i) => [x.b.title, x.words, C[i % C.length], `#/blog/${x.b.slug}`]);

  return [
    sec({ id: "b3path", eyebrow: "Reading paths", title: "Three ways in, three posts each.", cat: "amber", lead: "Not sure where to start. Pick the line that sounds most like you and read the three posts in order. Each one takes a few minutes.", body: `
      <div class="b3-paths">
        <div class="b3-pathimg" data-v3-tiltimg>${pic("blog-paths", "A misty forest path that splits into three, each lined with small amber lanterns", { sizes: "(max-width: 900px) 100vw, 40vw" })}</div>
        <div class="b3-pathlist" data-m3-stagger="110">${PATHS.map((P) => `<div class="b3-path card-glow" data-m3="left" style="--c:${P.c}"><h3>${esc(P.t)}</h3><p>${esc(P.why)}</p><ol>${P.slugs.filter((s) => bySlug[s]).map((s) => `<li><a href="#/blog/${s}">${esc(bySlug[s].title)}</a></li>`).join("")}</ol></div>`).join("")}</div>
      </div>` }),

    named.length ? sec({ id: "b3ppl", eyebrow: "People in these essays", title: `${named.length} researchers I write about.`, cat: "amber", lead: "Everyone named in at least one post, matched by full name. Tap a face to open their profile with sourced quotes.", body: `
      <div class="b3-ppl" data-m3-stagger="30">${named.slice(0, 24).map(({ p, in: i }) => `<a class="b3-pp" href="#/researchers/${p.id}" data-person="${p.id}" data-m3="up" ${p.photo_credit ? `title="Photo: ${esc(p.photo_credit)}"` : ""}>${p.photo ? `<span class="ph"><img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async" width="88" height="88" referrerpolicy="no-referrer"></span>` : `<span class="ph ini">${esc(p.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join(""))}</span>`}<b>${esc(p.name)}</b><span>${i.length} ${i.length === 1 ? "post" : "posts"}</span></a>`).join("")}</div>` }) : "",

    sec({ id: "b3topic", eyebrow: "Topic map", title: "What I keep coming back to.", cat: "amber", lead: `${tags.length} topics across ${posts.length} posts. Bigger means more posts. Tap one to filter the list above.`, body: `
      <div class="b3-cloud" data-m3-stagger="30">${tags.map(([t, n], i) => `<button type="button" class="b3-bub" data-tagjump="${esc(t)}" data-m3="scale" style="--s:${(0.9 + (n / tmax) * 1.1).toFixed(2)};--c:${C[i % C.length]}">${esc(t)}<small>${n}</small></button>`).join("")}</div>` }),

    sec({ id: "b3len", eyebrow: "By length", title: `${fmtN(words)} words so far.`, cat: "amber", lead: "Every post, longest first, counted from the text itself. Short on purpose: each one should fit in a chai break.", body: bars(len, { unit: " words" }) }),

    reading.length ? sec({ id: "b3read", eyebrow: "Further reading", title: "What these essays stand on.", cat: "amber", lead: "Books, papers, blogs and courses I learned from. Each one links to the original.", body: `
      <div class="b3-read"><div class="b3-readimg">${pic("blog-sources", "A desk at night with stacks of printed research papers, amber tabs, a clay cup of chai and a glowing laptop", { sizes: "(max-width: 900px) 100vw, 36vw" })}</div>
      <ul class="b3-reads" data-m3-stagger="40">${reading.map((r) => `<li data-m3="up"><span class="ty">${esc(r.type)}</span><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><span class="by">${esc([r.by, r.year].filter(Boolean).join(", "))}</span>${r.line ? `<p>${esc(r.line)}</p>` : ""}</li>`).join("")}</ul></div>` }) : "",

    sec({ id: "b3rules", eyebrow: "House rules", title: "How I write here.", cat: "amber", lead: "The same six rules apply to every post, caption and doc on this site.", body: `
      <div class="b3-rules" data-m3-stagger="70">${RULES.map(([a, b], i) => `<div class="b3-rule m3-spot" data-m3="up"><span class="n">${String(i + 1).padStart(2, "0")}</span><b>${esc(a)}</b><p>${esc(b)}</p></div>`).join("")}</div>
      <p class="b3-sign" data-m3="fade">Aniruddha Adak, ${src("https://github.com/lo3elyon", "github.com/lo3elyon")}</p>` }),
  ].join("");
}
