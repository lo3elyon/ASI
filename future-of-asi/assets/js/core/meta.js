/* Per route metadata: title, description, canonical, Open Graph, Twitter and JSON-LD, updated on every navigation.
   The same words are used by raw/gen/prerender.py for the crawlable snapshots. */
export const BASE_URL = "https://lo3elyon.github.io/ASI/future-of-asi/";
const OG = BASE_URL + "assets/brand/og.jpg";
const COVER = (n) => BASE_URL + `assets/img/cover-${n}.jpg`;

export const META = {
  "": { t: "Threshold: The Future of ASI", d: "An interactive, research backed guide to the future of artificial superintelligence: the researchers warning us, their sourced quotes, verified videos, AI control, a free course and what we can still do.", img: OG },
  futures: { t: "Futures explorer: six futures for superintelligence", d: "Move six levers and watch six futures for advanced AI grow and fade, from flourishing to catastrophe, with a branching map and the reasoning behind each one.", img: COVER("futures") },
  researchers: { t: "AI safety and alignment researchers, their warnings and quotes", d: "AI researchers, lab leaders, alignment and control researchers, forecasters and critics, with sourced quotes, risk estimates, careers, papers and books.", img: COVER("researchers") },
  voices: { t: "Voices wall: what AI researchers say about the risk", d: "Every sourced quote from the researchers in Threshold, as a moving wall you can filter.", img: COVER("voices") },
  pacing: { t: "Pacing the Frontier: every named signer", d: "Search every named signer of the Pacing the Frontier statement by name and employer, with their comments.", img: COVER("pacing") },
  orgs: { t: "AI safety organisations around the world", d: "Labs, institutes, nonprofits and programs working on AI safety, alignment, evaluations and governance, on an interactive globe.", img: COVER("orgs") },
  timeline: { t: "Warnings timeline: AI risk from 1951 to today", d: "Warnings, breakthroughs, statements and policy moments on the road to superintelligence, in order and sourced.", img: COVER("timeline") },
  watch: { t: "Watch: verified videos on AI safety, alignment and control", d: "Verified videos: warnings, interviews, lectures, debates and documentaries. Nothing autoplays.", img: COVER("watch") },
  blog: { t: "Blog: notes on the future of ASI by Aniruddha Adak", d: "Essays on superintelligence, AI control and what a student can do.", img: COVER("blog") },
  learn: { t: "Alignment 101: a free interactive course on AI safety", d: "Units and lessons with quizzes, drag and drop, scenarios, flashcards, boss quizzes, XP and badges. Free, in simple words.", img: COVER("learn") },
  control: { t: "AI Control explained, with a playable blue team game", d: "AI control keeps AI safe even if it is not aligned: trusted monitoring, untrusted models, red teams and protocols, explained simply with a game.", img: COVER("control") },
  docs: { t: "Docs: how Threshold works, data schemas and glossary", d: "Documentation, data schemas, accessibility notes, a glossary and FAQ for Threshold.", img: OG },
  tools: { t: "Tools: p(doom) calculator, AGI timeline forecaster and risk dial", d: "Three small instruments that make your own assumptions about AI risk and timelines visible.", img: COVER("tools") },
  prepare: { t: "Prepare: calm, practical steps for AI catastrophe risk", d: "The real risks of advanced AI, written without panic, with the safeguards on the table and what you can do.", img: COVER("prepare") },
  compare: { t: "Compare researchers", d: "Pick two or three AI researchers and see their roles, labs, p(doom), timelines, warnings and sourced quotes side by side.", img: BASE_URL + "assets/img/extra/compare.jpg" },
  stats: { t: "Threshold in charts", d: "Charts counted live from the data: researchers by group, region and lab, quotes and videos by year, signers by employer, organisations and papers.", img: BASE_URL + "assets/img/extra/stats.jpg" },
  starter: { t: "Starter kit", d: "A printable AI safety starter kit: a first week plan, reading paths, courses, books, newsletters and key words, with progress saved on this device.", img: BASE_URL + "assets/img/extra/starter.jpg" },
  "your-history": { t: "Your history", d: "Everything you opened in Threshold, newest first. It lives only in this browser.", img: COVER("history") },
};

const setMeta = (sel, attr, val) => { let m = document.head.querySelector(sel); if (!m) { m = document.createElement("meta"); const [k, v] = sel.replace(/^meta\[|\]$/g, "").split("="); m.setAttribute(k, v.replace(/"/g, "")); document.head.appendChild(m); } m.setAttribute(attr, val); };

/* name: route slug, params: route params, extra: { title, desc } from EXTRA_ROUTES or a view */
export function applyMeta(name, params = [], extra = null, notFound = false) {
  const m = META[name] || (extra ? { t: extra.title, d: extra.desc || extra.title, img: OG } : META[""]);
  let sub = "";
  const p0 = params && params[0];
  if (p0 && !/^(c|quiz|final|certificate)$/.test(p0) && p0.length < 60 && /^[a-z0-9-]+$/.test(p0)) sub = p0.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const title = notFound ? "Not found · Threshold" : name === "" ? m.t : `${sub ? sub + " · " : ""}${m.t} · Threshold`;
  const path = notFound || !name ? "" : `${name}/${name === "blog" && p0 ? p0 + "/" : ""}`;
  const url = BASE_URL + path;
  document.title = title;
  setMeta('meta[name="description"]', "content", m.d);
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", m.d);
  setMeta('meta[property="og:url"]', "content", url);
  setMeta('meta[property="og:image"]', "content", m.img || OG);
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", m.d);
  setMeta('meta[name="twitter:image"]', "content", m.img || OG);
  let can = document.head.querySelector('link[rel="canonical"]');
  if (!can) { can = document.createElement("link"); can.rel = "canonical"; document.head.appendChild(can); }
  can.href = url;
  let ld = document.getElementById("ldRoute");
  if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.id = "ldRoute"; document.head.appendChild(ld); }
  const crumbs = [{ "@type": "ListItem", position: 1, name: "Threshold", item: BASE_URL }];
  if (name) crumbs.push({ "@type": "ListItem", position: 2, name: m.t.split(":")[0], item: BASE_URL + name + "/" });
  if (sub) crumbs.push({ "@type": "ListItem", position: 3, name: sub, item: url });
  ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": [
    { "@type": name === "blog" && p0 ? "BlogPosting" : "WebPage", "@id": url + "#page", url, name: title, headline: title, description: m.d, inLanguage: "en", image: m.img || OG,
      isPartOf: { "@type": "WebSite", "@id": BASE_URL + "#site", name: "Threshold: The Future of ASI", url: BASE_URL },
      author: { "@type": "Person", name: "Aniruddha Adak", url: "https://github.com/lo3elyon" } },
    { "@type": "BreadcrumbList", itemListElement: crumbs },
  ] });
}
