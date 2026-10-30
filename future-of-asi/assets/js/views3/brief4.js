/* Home, Round 4: Today's brief. One key paper, one idea from the concepts map and one person, picked by today's date
   (the same for everyone on the same day), right under Today's picks. "Copy today's brief" puts the whole set,
   with the book, film and quote above it, on the clipboard as plain text with links. Nothing is invented. */
import { esc, load, researchers, avatar, ICON } from "../util.js";
import { dayIndex } from "./kit.js";
import { shareBtn, copyWithToast, links } from "../core/share.js";

export async function mount(el) {
  const [ppl, papers, concepts] = await Promise.all([researchers(), load("extra/papers.json", {}), load("extra/concepts.json", {})]);
  const pp = (papers && papers.papers) || [], nodes = (concepts && concepts.nodes) || [], groups = (concepts && concepts.groups) || {}, topics = (papers && papers.topics) || {};
  const pool = ppl.filter((p) => p.warning && p.photo && (p.quotes.length || p.pdoom));
  if (!pp.length || !nodes.length || !pool.length) return;
  const k = dayIndex();
  const paper = pp[k % pp.length], idea = nodes[(k + 7) % nodes.length], who = pool[(k + 13) % pool.length];
  const g = groups[idea.group] || { label: idea.group, c: "#14b8a6" };
  const authors = (paper.authors || []).slice(0, 3).join(", ") + ((paper.authors || []).length > 3 ? " and others" : "");
  const day = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const sec = document.createElement("section");
  sec.className = "section tight r4b"; sec.dataset.cat = "teal"; sec.setAttribute("aria-labelledby", "r4bH");
  sec.innerHTML = `<div class="wrap">
    <div class="v3-head r4b-head"><div class="eyebrow" data-m3="left"><span class="dot-cat"></span>Today's brief, ${esc(day)}</div><h2 id="r4bH" data-m3="up">A paper, an idea and a person.</h2><p class="lead" data-m3="up">Three more for today. They change at midnight, and everyone sees the same set on the same day.</p>
      <div class="r4b-copy" data-m3="up"><button type="button" class="btn sm" id="r4bCopy">Copy today's brief</button></div></div>
    <div class="r4b-grid" data-m3-stagger="90">
      <article class="r4b-card card-glow" data-m3="up" data-cat="sky">
        <span class="chip-cat">Paper of the day</span>
        <div class="r4b-meta"><span class="tag" style="--c:#0ea5e9">${esc(topics[paper.topic] || paper.topic || "Paper")}</span><span class="mono">${esc(paper.year || "")}</span></div>
        <h3><a href="#/papers/${esc(paper.id)}">${esc(paper.title)}</a></h3>
        <p class="muted r4b-by">${esc(authors)}</p>
        <p>${esc(paper.summary || "")}</p>
        ${paper.why ? `<p class="r4b-why"><b>Why it matters.</b> ${esc(paper.why)}</p>` : ""}
        <div class="r4b-links"><a href="#/papers/${esc(paper.id)}">Open in Papers ${ICON.arrow}</a><a href="${esc(paper.url)}" target="_blank" rel="noopener">arXiv ${ICON.ext}</a>${shareBtn(links.paper(paper.id), { label: "Share", aria: `Copy a link to the paper ${paper.title}` })}</div>
      </article>
      <article class="r4b-card card-glow" data-m3="up" data-cat="teal">
        <span class="chip-cat">Idea of the day</span>
        <div class="r4b-meta"><span class="tag" style="--c:${esc(g.c || "#14b8a6")}">${esc(g.label || idea.group)}</span></div>
        <h3><a href="#/concepts/${esc(idea.id)}">${esc(idea.label)}</a></h3>
        <p>${esc(idea.def || "")}</p>
        ${(idea.lessons || []).length ? `<p class="muted">Learn it in <a href="#/learn/${esc(idea.lessons[0].path)}">${esc(idea.lessons[0].title)}</a>.</p>` : ""}
        <div class="r4b-links"><a href="#/concepts/${esc(idea.id)}">See it on the map ${ICON.arrow}</a>${shareBtn(links.concept(idea.id), { label: "Share", aria: `Copy a link to the idea ${idea.label}` })}</div>
      </article>
      <article class="r4b-card card-glow" data-m3="up" data-cat="amber">
        <span class="chip-cat">Person of the day</span>
        <div class="r4b-who"><a href="#/researchers/${esc(who.id)}" data-person="${esc(who.id)}" class="r4b-face" aria-hidden="true" tabindex="-1">${avatar(who, "avatar")}</a><div><h3><a href="#/researchers/${esc(who.id)}" data-person="${esc(who.id)}">${esc(who.name)}</a></h3><p class="muted">${esc([who.role, who.org].filter(Boolean).join(", "))}</p></div></div>
        <p class="r4b-warn">${esc(who.warning)}</p>
        ${who.pdoom ? `<p class="muted">p(doom): <b>${esc(who.pdoom)}</b>${who.pdoom_source ? ` <a href="${esc(who.pdoom_source)}" target="_blank" rel="noopener">source ${ICON.ext}</a>` : ""}</p>` : ""}
        <div class="r4b-links"><a href="#/researchers/${esc(who.id)}" data-person="${esc(who.id)}">Open profile ${ICON.arrow}</a><a href="#/compare?ids=${esc(who.id)}">Compare</a>${shareBtn(links.person(who.id), { label: "Share", aria: `Copy a link to ${who.name}'s profile` })}</div>
      </article>
    </div></div>`;
  const after = el.querySelector('[aria-labelledby="h3feat"]');
  if (after) after.after(sec); else (el.querySelector(".v3-home") || el).appendChild(sec);

  sec.querySelector("#r4bCopy").addEventListener("click", () => {
    const L = [`Threshold, today's brief (${day})`, ""];
    const q = el.querySelector(".h3-q blockquote"), qa = el.querySelector(".h3-q figcaption b"), qs = el.querySelector(".h3-q figcaption a[target]");
    if (q) L.push(`Quote: ${q.textContent.trim()}${qa ? ` (${qa.textContent.trim()})` : ""}${qs ? ` ${qs.href}` : ""}`);
    const v = el.querySelector(".h3-vid[data-video]");
    if (v) L.push(`Video: ${(v.querySelector("h3") || v).textContent.trim()} ${links.video(v.dataset.video)}`);
    const b = el.querySelector(".h3-book h3");
    if (b) L.push(`Book: ${b.textContent.trim()}`);
    L.push(`Paper: ${paper.title} (${paper.year}) ${paper.url}`);
    L.push(`Idea: ${idea.label}. ${idea.def || ""} ${links.concept(idea.id)}`);
    L.push(`Person: ${who.name}. ${who.warning} ${links.person(who.id)}`);
    L.push("", links.route(""));
    copyWithToast(L.join("\n"), "Today's brief copied.");
  });
}
