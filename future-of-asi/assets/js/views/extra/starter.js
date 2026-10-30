/* Starter kit (Round 4): a printable, shareable AI safety starter kit built only from the guide's own data:
   the blog, the course, the 60 checked papers and their reading paths, courses, books, newsletters, podcasts,
   fellowships and the glossary. Every item has a tick box; progress is saved in this browser only (thr:r4:starter).
   The print stylesheet in r4.css turns it into clean black on white pages with every link written out. */
import { X, hero, sec, tocBar, bag, $, $$, esc, store, ICON } from "./_kit.js";
import { load, arr, videos, fmtDur } from "../../util.js";
import { shareBtn, copyWithToast, links } from "../../core/share.js";

const KEY = "r4:starter";
const WORDS = ["Alignment", "AGI", "ASI", "p(doom)", "AI control", "Interpretability", "Evals", "Red team", "Reward hacking", "Scheming", "Deceptive alignment", "Sycophancy", "Scaling laws", "Compute governance", "Responsible Scaling Policy", "Intelligence explosion"];

export async function render(el) {
  const B = bag();
  const [blogRaw, course, papers, resRaw, gl, vids] = await Promise.all([load("blog/index.json", {}), load("course.json", {}), X("papers.json"), load("resources.json"), load("glossary.json"), videos()]);
  const posts = arr(blogRaw, "posts"), units = course.units || [], res = arr(resRaw, "resources"), terms = arr(gl, "terms");
  const pById = Object.fromEntries(((papers && papers.papers) || []).map((p) => [p.id, p]));
  const paths = ((papers && papers.paths) || []).map((p) => ({ ...p, items: p.papers.map((id) => pById[id]).filter(Boolean) })).filter((p) => p.items.length);
  const R = (t) => res.filter((r) => r.type === t && r.url);
  const post = posts.find((b) => b.slug === "future-of-asi-in-simple-words") || posts[0];
  const u1 = units[0], l1 = u1 && (u1.lessons || [])[0];
  const firstPaper = paths[0] && paths[0].items[0];
  const secs = (d) => String(d || "").split(":").reduce((a, b) => a * 60 + (+b || 0), 0);
  /* One beginner explainer between 8 and 30 minutes, newest first, so the plan is the same for everyone and in print */
  const vid = vids.filter((v) => v.level === "beginner" && v.category === "explainer" && secs(v.duration) >= 480 && secs(v.duration) <= 1800).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const bluedot = R("course").find((r) => /future of ai/i.test(r.title)) || R("course")[0];
  const news = R("newsletter").find((r) => /AI Safety Newsletter/i.test(r.title)) || R("newsletter")[0];
  const words = WORDS.map((w) => terms.find((t) => t.term.toLowerCase() === w.toLowerCase())).filter(Boolean);

  /* Every tickable item has a stable id */
  const WEEK = [
    post && { id: "w1", day: 1, t: "Read one short essay", d: post.title, href: `#/blog/${post.slug}`, url: links.route(`#/blog/${post.slug}`), mins: post.mins ? `${post.mins} min` : "" },
    { id: "w1b", day: 1, t: "Steer the six futures", d: "Move six levers and see which futures grow or fade.", href: "#/futures", url: links.route("#/futures"), mins: "10 min" },
    l1 && { id: "w2", day: 2, t: "Take the first lesson", d: `${u1.title}: ${l1.title}`, href: `#/learn/${u1.id}/${l1.id}`, url: links.route(`#/learn/${u1.id}/${l1.id}`), mins: "15 min" },
    firstPaper && { id: "w3", day: 3, t: "Read one founding paper", d: `${firstPaper.title} (${firstPaper.year})`, href: `#/papers/${firstPaper.id}`, url: firstPaper.url, mins: "" },
    vid && { id: "w4", day: 4, t: "Watch one explainer", d: `${vid.title}, ${vid.channel}`, href: `#/watch/${vid.id}`, video: vid.id, url: links.video(vid.id), mins: fmtDur(vid.duration) },
    bluedot && { id: "w5", day: 5, t: "Sign up for a free course", d: bluedot.title, href: bluedot.url, ext: true, url: bluedot.url, mins: "" },
    news && { id: "w6", day: 6, t: "Subscribe to one newsletter", d: news.title, href: news.url, ext: true, url: news.url, mins: "" },
    { id: "w7", day: 7, t: "Explain it to one person", d: "Tell a friend or someone at home one thing you learned this week, in your own words. The family talk cards can help.", href: "#/kids", url: links.route("#/kids"), mins: "" },
    { id: "w7b", day: 7, t: "Find your path", d: "Answer a few questions and see which kind of AI safety work fits you.", href: "#/careers", url: links.route("#/careers"), mins: "5 min" },
  ].filter(Boolean);

  const S = store.get(KEY, {}) || {};
  const allIds = [];
  const box = (id, label) => { allIds.push(id); return `<input type="checkbox" class="r4k-cb" data-k="${esc(id)}" id="k-${esc(id)}"${S[id] ? " checked" : ""} aria-label="${esc(label)}">`; };
  const linkOut = (href, text, ext) => `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""} data-print-url="${esc(ext ? href : "")}">${esc(text)}${ext ? ` ${ICON.ext}` : ""}</a>`;
  const item = (id, title, sub, href, ext, meta = "") => `<li class="r4k-it">${box(id, `Done: ${title}`)}<div class="tx"><b>${linkOut(href, title, ext)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}${meta ? `<small>${esc(meta)}</small>` : ""}</div></li>`;
  const resList = (list, pre) => `<ul class="r4k-list">${list.map((r) => item(`${pre}:${r.id || r.title}`, r.title, r.line || "", r.url, true, [r.by, r.free === true ? "Free" : "", r.level].filter(Boolean).join(" · "))).join("")}</ul>`;

  el.innerHTML = `<div class="r4k-printhead" aria-hidden="true"><b>Threshold: AI safety starter kit</b><span>${esc(links.route("#/starter"))}</span></div>${hero({ img: "starter", eyebrow: "Starter kit", title: `Your AI safety <span class="serif gt">starter kit.</span>`, lead: "Everything I would hand a friend who wants to understand AI risk properly: a first week plan, reading paths, courses, books, words and ways in. Tick things off as you go. Print it, or save it as a PDF and keep it.", extra: `<div class="r4k-bar card" data-m3="up"><div class="r4k-prog"><b id="r4kN">0</b><span>of <span id="r4kT">0</span> done</span><span class="r4k-meter" aria-hidden="true"><i id="r4kM"></i></span></div><div class="r4k-btns"><button type="button" class="btn sm primary" id="r4kPrint">${ICON.dl} Print or save as PDF</button><button type="button" class="btn sm ghost" id="r4kCopy">Copy as text</button>${shareBtn(links.route("#/starter"), { label: "Copy link", aria: "Copy a link to the starter kit" })}<button type="button" class="btn sm ghost" id="r4kReset">Clear ticks</button></div></div>` })}
  ${sec("week", 1, "First week", "Seven days, <span class='serif'>one step a day.</span>", "About twenty minutes a day. Skip around if you like.",
    `<ol class="r4k-week">${[1, 2, 3, 4, 5, 6, 7].map((d) => { const its = WEEK.filter((w) => w.day === d); return its.length ? `<li class="r4k-day card" data-m3="up"><span class="r4k-dn">Day ${d}</span><ul class="r4k-list">${its.map((w) => `<li class="r4k-it">${box(w.id, `Done: ${w.t}`)}<div class="tx"><b>${w.video ? `<a href="${esc(w.href)}" data-video="${esc(w.video)}">${esc(w.t)}</a>` : linkOut(w.href, w.t, w.ext)}</b><span>${esc(w.d)}</span>${w.mins ? `<small>${esc(w.mins)}</small>` : ""}${!w.ext ? `<small class="r4k-purl">${esc(w.url)}</small>` : ""}</div></li>`).join("")}</ul></li>` : ""; }).join("")}</ol>`)}
  ${sec("paths", 2, "Reading paths", "Papers, <span class='serif'>in a sensible order.</span>", `${paths.length} short paths through the key papers, each checked on arXiv. Start with the first one.`,
    `<div class="r4k-paths">${paths.map((p) => `<section class="r4k-path card" data-m3="up" data-path="${esc(p.id)}"><div class="r4k-ph"><h3>${esc(p.title)}</h3><span class="r4k-pp" data-pp="${esc(p.id)}"></span></div><p class="muted">${esc(p.blurb || "")}</p><ul class="r4k-list">${p.items.map((x) => item(`paper:${p.id}:${x.id}`, x.title, x.summary ? x.summary.slice(0, 150).replace(/\s+\S*$/, "") + (x.summary.length > 150 ? "..." : "") : "", x.url, true, `${x.year} · arXiv ${x.id}`)).join("")}</ul></section>`).join("")}</div>`)}
  ${sec("courses", 3, "Courses", "Learn it <span class='serif'>with others.</span>", "Free or open courses and guides, from short intros to hands on technical work.",
    `<div class="card" data-m3="up">${resList(R("course"), "course")}</div>
     <div class="card r4k-own" data-m3="up"><h3>And this guide's own course</h3><ol class="r4k-units">${units.map((u, i) => `<li><a href="#/learn/${esc(u.id)}" data-print-url="${esc(links.route(`#/learn/${u.id}`))}">Unit ${i + 1}: ${esc(u.title)}</a> <small>${(u.lessons || []).length} lessons</small></li>`).join("")}</ol></div>`)}
  ${sec("books", 4, "Books", "Seven books <span class='serif'>worth your time.</span>", "From the classic risk arguments to a sceptical take, so you hear more than one side.",
    `<div class="card" data-m3="up">${resList(R("book"), "book")}</div>`)}
  ${sec("current", 5, "Stay current", "Keep up <span class='serif'>without doomscrolling.</span>", "Pick one newsletter and one podcast. That is enough.",
    `<div class="r4k-cols"><div class="card" data-m3="up"><h3>Newsletters</h3>${resList(R("newsletter"), "news")}</div><div class="card" data-m3="up"><h3>Podcasts</h3>${resList(R("podcast"), "pod")}</div><div class="card" data-m3="up"><h3>Blogs and forums</h3>${resList(R("blog"), "blog")}</div></div>`)}
  ${sec("involved", 6, "Get involved", "When you are <span class='serif'>ready for more.</span>", "Fellowships and career guides from the people who run them.",
    `<div class="r4k-cols two"><div class="card" data-m3="up"><h3>Fellowships</h3>${resList(R("fellowship"), "fel")}</div><div class="card" data-m3="up"><h3>Career guides</h3>${resList(R("career"), "car")}<p class="muted" style="margin-top:12px">More programmes, each checked on its official page, are on the <a href="#/careers">Careers</a> page.</p></div></div>`)}
  ${sec("words", 7, "Words to know", "Sixteen words, <span class='serif'>in plain English.</span>", "From the glossary. Tick the ones you could explain to someone else.",
    `<ul class="r4k-words" role="list">${words.map((w) => `<li class="r4k-w card">${box(`word:${w.term}`, `I can explain ${w.term}`)}<dl><dt>${esc(w.term)}</dt><dd>${esc(w.def)}</dd></dl></li>`).join("")}</ul><p class="muted" style="margin-top:14px">All ${terms.length} words are in the <a href="#/docs/glossary">glossary</a>.</p>`)}
  <p class="r4k-printfoot">Made from Threshold: The Future of ASI by Aniruddha Adak. Every link was checked when this page was built. Start big, fix later, keep shipping.</p>`;

  const total = allIds.length;
  const paint = () => {
    const S2 = store.get(KEY, {}) || {};
    const n = allIds.filter((id) => S2[id]).length;
    $("#r4kN", el).textContent = n; $("#r4kT", el).textContent = total;
    $("#r4kM", el).style.width = `${total ? (n / total) * 100 : 0}%`;
    paths.forEach((p) => { const ids = p.items.map((x) => `paper:${p.id}:${x.id}`); const k = ids.filter((id) => S2[id]).length; const t = $(`[data-pp="${p.id}"]`, el); if (t) { t.textContent = `${k} of ${ids.length}`; t.classList.toggle("done", k === ids.length); } });
  };
  el.addEventListener("change", (e) => {
    const c = e.target.closest(".r4k-cb"); if (!c) return;
    const S2 = store.get(KEY, {}) || {};
    if (c.checked) S2[c.dataset.k] = Date.now(); else delete S2[c.dataset.k];
    store.set(KEY, S2); paint();
  });
  const asText = () => {
    const S2 = store.get(KEY, {}) || {};
    const t = (id) => (S2[id] ? "[x]" : "[ ]");
    const L = ["Threshold: AI safety starter kit", links.route("#/starter"), "", "FIRST WEEK"];
    WEEK.forEach((w) => L.push(`${t(w.id)} Day ${w.day}: ${w.t}. ${w.d} ${w.url}`));
    L.push("", "READING PATHS"); paths.forEach((p) => { L.push(`${p.title}`); p.items.forEach((x) => L.push(`  ${t(`paper:${p.id}:${x.id}`)} ${x.title} (${x.year}) ${x.url}`)); });
    [["COURSES", "course", "course"], ["BOOKS", "book", "book"], ["NEWSLETTERS", "newsletter", "news"], ["PODCASTS", "podcast", "pod"], ["BLOGS AND FORUMS", "blog", "blog"], ["FELLOWSHIPS", "fellowship", "fel"], ["CAREER GUIDES", "career", "car"]].forEach(([h, ty, pre]) => { L.push("", h); R(ty).forEach((r) => L.push(`${t(`${pre}:${r.id || r.title}`)} ${r.title} ${r.url}`)); });
    L.push("", "WORDS TO KNOW"); words.forEach((w) => L.push(`${t(`word:${w.term}`)} ${w.term}: ${w.def}`));
    return L.join("\n");
  };
  el.addEventListener("click", (e) => {
    if (e.target.closest("#r4kPrint")) { window.print(); return; }
    if (e.target.closest("#r4kCopy")) { copyWithToast(asText(), "Starter kit copied as text."); return; }
    if (e.target.closest("#r4kReset")) { if (window.confirm("Clear every tick in the starter kit on this device?")) { store.set(KEY, {}); $$(".r4k-cb", el).forEach((c) => (c.checked = false)); paint(); } }
  });
  paint();
  B.add(tocBar(el));
  return () => B.run();
}
