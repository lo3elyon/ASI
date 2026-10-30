/* Home, Round 3 blocks. Everything here is read from the data files; nothing is invented. */
import { esc, load, arr, researchers, videos, signatories, avatar, ICON, fmtDate, fmtDur, ytThumb, orgIndex } from "../util.js";
import { pic, banner, sec, src, dayIndex, fmtN, fx3, bars, face } from "./kit.js";

export async function mount(el) {
  const [ppl, vids, tl, fc, sig, orgsRaw, gl, course, blog, lib] = await Promise.all([
    researchers(), videos(), load("timeline.json"), load("forecasts.json"), signatories(), load("orgs.json"), load("glossary.json"), load("course.json", {}), load("blog/index.json", {}),
    fetch("library/data/books.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  const events = arr(tl, "events"), forecasts = arr(fc, "forecasts"), orgs = arr(orgsRaw, "orgs"), terms = arr(gl, "terms"), posts = arr(blog, "posts");
  const units = course.units || []; const lessons = units.flatMap((u) => u.lessons || []); const acts = lessons.reduce((s, l) => s + (l.activities || []).length, 0);
  const quotes = ppl.flatMap((p) => p.quotes.map((q) => ({ ...q, p })));
  const pdN = ppl.filter((p) => p.pd != null);
  const hours = Math.round(vids.reduce((s, v) => s + (v.duration ? v.duration.split(":").reduce((a, b) => a * 60 + +b, 0) : 0), 0) / 3600);
  const countries = new Set(orgs.map((o) => o.country).filter(Boolean));
  const total = sig.meta.count_total || (sig.meta.count_named + sig.meta.count_anon) || sig.list.length;
  const year = String(new Date().getFullYear());
  const thisYear = events.filter((e) => String(e.date || e.year || "").startsWith(year)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const books = arr(lib, "books").filter((b) => b.cover);
  const book = books.length ? books[dayIndex(books.length)] : null;
  const vpool = vids.filter((v) => /warning|documentary|interview|explainer/.test(v.category) && v.duration && v.level === "beginner");
  const vid = vpool.length ? vpool[dayIndex(vpool.length)] : vids[0];
  const qpool = quotes.filter((q) => q.text.length > 50 && q.text.length < 260 && q.url && !/https?:\/\/|www\./i.test(q.text)); /* a quote that is only a pointer to a link is not a quote of the day */
  const qd = qpool.length ? qpool[dayIndex(qpool.length)] : null;
  const bands = [["Under 5%", (x) => x < 5, "#84cc16"], ["5 to 20%", (x) => x >= 5 && x < 20, "#14b8a6"], ["20 to 50%", (x) => x >= 20 && x < 50, "#f59e0b"], ["50% or more", (x) => x >= 50, "#ef4444"]];
  const yNow = new Date().getFullYear();
  const nextF = forecasts.filter((f) => f.year >= yNow).sort((a, b) => a.year - b.year)[0];

  const N = [
    [ppl.length, "researchers and voices", "#/researchers", "cyan", "big"],
    [quotes.length, "quotes, each with a source", "#/voices", "amber", ""],
    [pdN.length, "people who gave a p(doom)", "#/researchers", "red", ""],
    [vids.length, `verified videos, about ${fmtN(hours)} hours`, "#/watch", "blue", "wide"],
    [total, "people signed Pacing the Frontier", "#/pacing", "emerald", "big"],
    [orgs.length, `organisations in ${countries.size} countries`, "#/orgs", "sky", ""],
    [events.length, "dated events on the timeline", "#/timeline", "red", ""],
    [lessons.length, `lessons and ${fmtN(acts)} activities`, "#/learn", "lime", ""],
    [terms.length, "glossary terms in plain words", "#/docs/glossary", "teal", ""],
  ];

  const box = document.createElement("div"); box.className = "v3-home";
  box.innerHTML = `
  ${sec({ id: "h3num", eyebrow: "Key numbers", title: "The whole guide, counted.", cat: "cyan", lead: "Every number below is counted live from the data files this site ships with. Tap one to open that room.", body: `
    <div class="h3-bento" data-m3-stagger="60">${N.map(([n, l, href, c, s]) => `<a class="h3-tile ${s} card-glow m3-spot" data-cat="${c}" href="${href}" data-m3="scale"><b data-m3-count="${n}">${fmtN(n)}</b><span>${esc(l)}</span><i class="h3-arrow" aria-hidden="true">${ICON.arrow}</i></a>`).join("")}</div>` })}

  ${banner("home-this-year", { eyebrow: `What changed in ${year}`, title: `${thisYear.length} turning points this year.`, lead: "Pulled straight from the warnings timeline, newest first. Each one links to where it was reported.", alt: "Earth at night seen from orbit with a thin line of dawn on the horizon", cat: "red", id: "h3yr" })}
  <section class="section tight" data-cat="red" aria-label="Events this year"><div class="wrap">
    <ol class="h3-year" data-m3-stagger="70">${thisYear.slice(0, 12).map((e) => `<li data-m3="up" class="card-glow"><span class="d">${esc(fmtDate(e.date))}</span><h3>${esc(e.title)}</h3><p>${esc(e.summary || "")}</p>${src(e.url)}</li>`).join("") || `<li>No events dated this year yet.</li>`}</ol>
    <a class="v3-btn" href="#/timeline" data-m3-magnet>See the full timeline ${ICON.arrow}</a>
  </div></section>

  ${sec({ id: "h3start", eyebrow: "Start here", title: "Three doors. Pick yours.", cat: "teal", body: `
    <div class="h3-doors">
      <div class="h3-doorimg" data-v3-tiltimg>${pic("home-start", "Three softly lit doorways at the end of a dark hall, teal, amber and lime")}</div>
      <div class="h3-paths" data-m3-stagger="90">
        ${[["teal", "I have 15 minutes", "Read the simple words essay, then play with the futures levers.", [["#/blog/future-of-asi-in-simple-words", "The future of ASI, in simple words"], ["#/futures", "Steer the six futures"]]],
           ["amber", "I want to understand it properly", `Take the free course: ${units.length} units, ${lessons.length} lessons, boss quizzes and a completion card.`, [["#/learn", "Open Alignment 101"], ["#/docs/glossary", "Keep the glossary open"]]],
           ["lime", "I want to do something", "Tick the calm checklist, then find people, papers and courses that fit you.", [["#/prepare", "Open the checklist"], ["#/researchers", "Find your people"]]]]
          .map(([c, t, d, ls], i) => `<article class="h3-path card-glow m3-spot" data-cat="${c}" data-m3="right"><span class="n">0${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p><div class="ls">${ls.map(([h, l]) => `<a href="${h}">${esc(l)} ${ICON.arrow}</a>`).join("")}</div></article>`).join("")}
      </div>
    </div>` })}

  <section class="section tight" data-cat="amber" aria-labelledby="h3feat"><div class="wrap">
    <div class="v3-head"><div class="eyebrow" data-m3="left"><span class="dot-cat"></span>Today's picks</div><h2 id="h3feat" data-m3-split="words">One book, one film, one sentence.</h2><p class="lead" data-m3="up">A new set every day, chosen from the library, the video library and the quotes.</p></div>
    <div class="h3-feat">
      ${book ? `<a class="h3-book card-glow" href="library/#/book/${esc(book.id)}" data-m3="up" data-cat="yellow">
        <div class="bg">${pic("home-book", "A closed hardcover book under a warm reading lamp beside a cup of chai")}</div>
        <img class="cover" src="library/${esc(book.cover)}" alt="Cover of ${esc(book.title)}" loading="lazy" width="200" height="300" data-m3-tilt="10">
        <div class="tx"><span class="chip-cat">Featured book</span><h3>${esc(book.title)}</h3><p class="muted">${esc((book.authors || []).map((a) => a.name || a).join(", "))}${book.year ? `, ${esc(book.year)}` : ""}</p><p>${esc(book.pitch || "")}</p><span class="go">Open in the library ${ICON.arrow}</span></div></a>` : ""}
      ${vid ? `<a class="h3-vid card-glow" href="#/watch/${esc(vid.id)}" data-video="${esc(vid.id)}" data-m3="up" data-m3-delay="120" data-cat="blue">
        <div class="th"><img src="${ytThumb(vid.id, "hqdefault")}" alt="" loading="lazy" width="480" height="360"><span class="pb">${ICON.play}</span>${vid.duration ? `<span class="dur">${esc(fmtDur(vid.duration))}</span>` : ""}</div>
        <div class="tx"><span class="chip-cat">Featured video</span><h3>${esc(vid.title)}</h3><p class="muted">${esc(vid.channel)}${vid.date ? `, ${esc(fmtDate(vid.date))}` : ""}</p><p>${esc(vid.summary)}</p></div></a>` : ""}
      ${qd ? `<figure class="h3-q card-glow border-anim" data-m3="up" data-m3-delay="240" data-cat="amber"><span class="chip-cat">Quote of the day</span><blockquote>&ldquo;${esc(qd.text)}&rdquo;</blockquote><figcaption>${face(qd.p)}<span><a href="#/researchers/${qd.p.id}" data-person="${qd.p.id}"><b>${esc(qd.p.name)}</b></a><br>${esc(qd.source || "")}${qd.date ? `, ${esc(qd.date)}` : ""} ${src(qd.url, "source")}</span></figcaption></figure>` : ""}
    </div>
  </div></section>

  ${sec({ id: "h3pd", eyebrow: "How worried are they", title: "p(doom), in four bands.", cat: "red", lead: `${pdN.length} people in this guide have put a number on the chance that AI goes catastrophically wrong. Here is how those numbers spread out, using the midpoint of any range they gave.`, body: `
    <div class="h3-pd">${bands.map(([l, f, c]) => { const g = pdN.filter((p) => f(p.pd)); return `<div class="h3-band" style="--c:${c}" data-m3="up"><div class="top"><b data-m3-count="${g.length}">${g.length}</b><span>${esc(l)}</span></div><div class="faces">${g.slice(0, 9).map((p) => `<a href="#/researchers/${p.id}" data-person="${p.id}" title="${esc(p.name)}: ${esc(p.pdoom)}">${face(p)}</a>`).join("")}</div></div>`; }).join("")}</div>
    <p class="disclaimer">These are personal estimates, given at different times with different definitions. Each profile links to where the number was said. <a href="#/blog/reading-pdoom-without-panic">How I read these without panicking</a>.</p>` })}

  ${nextF ? sec({ id: "h3fc", eyebrow: "The nearest forecast", title: `${nextF.who}: ${nextF.what} by ${nextF.year}.`, cat: "blue", body: `
    <div class="h3-fc card-glow" data-m3="blur"><div class="yr" data-v3="scramble" data-text="${nextF.year}">${nextF.year}</div><div><p class="kicker">&ldquo;${esc(nextF.text)}&rdquo;</p><p class="muted">${esc(nextF.source)}, said ${esc(fmtDate(nextF.said))}. ${src(nextF.url, "source")}</p>
    <div class="h3-fcrow">${forecasts.slice().sort((a, b) => a.year - b.year).map((f) => `<span style="--c:${f.c}" title="${esc(f.who)}: ${esc(f.what)}"><i></i>${f.year}</span>`).join("")}</div>
    <a class="v3-btn" href="#/tools/timelines">Compare all ${forecasts.length} forecasts ${ICON.arrow}</a></div></div>` }) : ""}

  ${sec({ id: "h3sig", eyebrow: "Pacing the Frontier", title: `${fmtN(total)} people signed one letter.`, cat: "emerald", lead: `${fmtN(sig.meta.count_named)} signed with their name and ${fmtN(sig.meta.count_anon)} without a public name${sig.meta.as_of ? `, as of ${esc(fmtDate(sig.meta.as_of))}` : ""}. These are the employers with the most named signers.`, body: `
    ${bars(empTop(sig.list, 6).map(([k, n]) => [k, n, "var(--cat)", `#/pacing?emp=${encodeURIComponent(k)}`]))}
    <div class="row" style="margin-top:18px"><a class="v3-btn" href="#/pacing">See every signer ${ICON.arrow}</a>${src(sig.meta.source || "https://www.pacingthefrontier.com/", "pacingthefrontier.com")}</div>` })}

  ${sec({ id: "h3blog", eyebrow: "Latest essays", title: "Notes in my own words.", cat: "amber", body: `
    <div class="h3-posts" data-m3-stagger="80">${posts.slice(0, 3).map((b) => `<a class="h3-post card-glow" href="#/blog/${esc(b.slug)}" data-m3="up" data-v3-tiltimg><div class="im">${pic("blog-" + b.slug, "")}</div><div class="tx"><span class="muted mono">${esc(fmtDate(b.date))} · ${b.mins} min</span><h3>${esc(b.title)}</h3><p>${esc(b.excerpt)}</p></div></a>`).join("")}</div>` })}

  ${sec({ id: "h3course", eyebrow: "The course", title: `${units.length} units, one path.`, cat: "lime", lead: "Scroll the strip. Each unit has its own picture, lessons, activities and a boss quiz at the end.", body: `
    <div class="h3-strip" data-m3-marquee="34">${units.map((u, i) => `<a class="h3-unit" href="#/learn/${esc(u.id)}" style="--c:${u.c}">${pic("unit-" + u.id, "", { sizes: "320px" })}<span class="n">${String(i + 1).padStart(2, "0")}</span><b>${esc(u.title)}</b></a>`).join("")}</div>` })}
  `;
  el.appendChild(box);
  fx3(box);
}

export function empTop(list, n) {
  const m = {}; list.forEach((s) => { const k = (s.employer || "").trim(); if (k) m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
}
