/* Docs, Round 3 extra sections for the docs home (views owner).
   Every count is read from the data files at render time. The changelog is read from CHANGELOG.md at the route root. */
import { esc, load, arr, md } from "../util.js";
import { pic, sec, src, fmtN, bars } from "./kit.js";

const REPO = "https://github.com/lo3elyon/ASI";
const PAIRS = [
  ["Home", "home", "Bricolage Grotesque", "Manrope"], ["Futures", "futures", "Syne", "Outfit"], ["Researchers", "researchers", "DM Serif Display", "IBM Plex Sans"],
  ["Voices", "voices", "Playfair Display", "Work Sans"], ["Pacing", "pacing", "Archivo", "Literata"], ["Learn", "learn", "Lexend", "Nunito Sans"],
  ["Prepare", "prepare", "Literata", "Atkinson Hyperlegible"], ["Tools", "tools", "Sora", "IBM Plex Mono"], ["Blog", "blog", "Fraunces", "Literata"], ["Docs", "docs", "IBM Plex Sans", "IBM Plex Mono"],
];
const KIND = { wikimedia: "Wikimedia Commons", "personal-site": "Personal site", homepage: "Personal site", "lab-page": "Lab or team page", x: "X profile", github: "GitHub avatar", news: "News photo", scholar: "Google Scholar", linkedin: "LinkedIn", conference: "Conference page", podcast: "Podcast page", youtube: "YouTube", "youtube-frame": "YouTube", other: "Other public page" };

async function changelog() {
  try { const r = await fetch("CHANGELOG.md"); return r.ok ? await r.text() : ""; } catch (e) { return ""; }
}

export async function sections() {
  const [ppl, vids, orgs, tl, res, gl, faq, sig, pm, sp, lm, log] = await Promise.all([
    load("researchers.json", []), load("videos.json", []), load("orgs.json", []), load("timeline.json", []), load("resources.json", []), load("glossary.json", {}), load("faq.json", {}),
    load("signatories.json", {}), load("photos-manifest.json", {}), load("signer-photos.json", {}), load("logos-manifest.json", {}), changelog(),
  ]);
  const people = arr(ppl, "researchers"), V = arr(vids, "videos"), O = arr(orgs, "orgs"), T = arr(tl, "events"), R = arr(res, "resources");
  const G = arr(gl, "terms"), F = arr(faq, "faq"), S = arr(sig, "signatories"), sm = (sig && sig.meta) || {};
  const quotes = people.reduce((a, p) => a + ((p.quotes || []).length), 0);
  const total = sm.count_total || (sm.count_named || S.length) + (sm.count_anon || 0);
  const cells = [
    ["researchers.json", people.length, "researcher profiles", "#22d3ee"], ["researchers.json", quotes, "sourced quotes", "#f59e0b"], ["videos.json", V.length, "verified videos", "#3b82f6"],
    ["orgs.json", O.length, "organisations", "#14b8a6"], ["timeline.json", T.length, "timeline events", "#ef4444"], ["resources.json", R.length, "courses, papers and books", "#84cc16"],
    ["glossary.json", G.length, "glossary terms", "#0ea5e9"], ["faq.json", F.length, "FAQ answers", "#eab308"], ["signatories.json", total, "Pacing the Frontier signers in total", "#10b981"],
    ["signatories.json", sm.count_named || S.length, "of them named", "#10b981"],
  ].filter((c) => c[1]);

  /* Photo credits by source kind, researchers plus signers */
  const kinds = {};
  [pm, sp].forEach((m) => { if (m && typeof m === "object" && !Array.isArray(m)) Object.values(m).forEach((v) => { const k = KIND[(v && v.kind) || "other"] || "Other public page"; kinds[k] = (kinds[k] || 0) + 1; }); });
  const kRows = Object.entries(kinds).sort((a, b) => b[1] - a[1]);
  const photos = kRows.reduce((a, b) => a + b[1], 0);
  const KC = ["#22d3ee", "#14b8a6", "#3b82f6", "#f59e0b", "#84cc16", "#0ea5e9", "#eab308", "#ef4444", "#10b981", "#f97316"];
  const logos = lm && typeof lm === "object" ? Object.keys(lm).length : 0;

  /* Changelog: split into versions */
  const vers = [];
  String(log || "").split(/\n(?=## \[)/).forEach((blk) => { const m = blk.match(/^## \[([^\]]+)\]\s*-\s*(\S+)/); if (m) vers.push({ v: m[1], d: m[2], body: blk.replace(/^## .*\n/, ""), n: (blk.match(/^- /gm) || []).length }); });

  const flow = [
    ["Research", "Research agents read primary sources and write JSON with a source URL for every quote and number."],
    ["data/", "researchers, videos, orgs, timeline, resources, signatories, photos and logos."],
    ["sync_data.py", "Copies data into the site, applies the style rules and resolves local photos."],
    ["site/data", "What the browser loads. Plain JSON, no build step at runtime."],
    ["Views", "A small hash router renders one view per page and wires motion after each render."],
    ["Offline", "A service worker keeps the shell, views and data so the site works without a connection."],
  ];

  return [
    sec({ id: "d3num", eyebrow: "Data at a glance", title: "What is inside, counted live.", cat: "blue", lead: "These numbers are read from the data files each time this page opens, so they never drift from the site.", body: `
      <div class="d3-nums" data-m3-stagger="40">${cells.map(([f, n, l, c]) => `<div class="d3-num m3-spot" data-m3="up" style="--c:${c}"><b data-m3-count="${n}">${fmtN(n)}</b><span>${esc(l)}</span><code>${esc(f)}</code></div>`).join("")}</div>` }),

    sec({ id: "d3flow", eyebrow: "Data flow", title: "From a source to your screen.", cat: "blue", lead: "Six steps, in order. Nothing on the site is typed in by hand without a source behind it.", body: `
      <div class="d3-flow"><div class="d3-flowimg">${pic("doc-data", "Strands of glowing blue fibre optic light flowing into a row of small glass jars on a blueprint grid", { sizes: "(max-width: 900px) 100vw, 40vw" })}</div>
      <ol class="d3-steps" data-v3 data-m3-stagger="90">${flow.map(([a, b], i) => `<li data-m3="left" style="--i:${i}"><span class="k">${String(i + 1).padStart(2, "0")}</span><b>${esc(a)}</b><p>${esc(b)}</p></li>`).join("")}</ol></div>` }),

    sec({ id: "d3fonts", eyebrow: "Type", title: "Every page has its own voice.", cat: "blue", lead: "Each page pairs a heading face with a body face. All are open fonts under the SIL Open Font License, self hosted, and only the two a page needs first are preloaded.", body: `
      <div class="d3-type" data-m3-stagger="40">${PAIRS.map(([n, slug, h, b]) => `<a class="d3-tp card-glow" href="#/${slug}" data-m3="up"><span class="h" style="font-family:'${h}',serif">${esc(n)}</span><span class="b" style="font-family:'${b}',sans-serif">The future is not written yet.</span><small>${esc(h)} with ${esc(b)}</small></a>`).join("")}</div>` }),

    photos ? sec({ id: "d3cred", eyebrow: "Credits", title: `${fmtN(photos)} real photos, each with a credit.`, cat: "blue", lead: `Every person photo comes from a public page that names the person and matches their role. Hover a face anywhere on the site to see its credit. Section pictures like the one here are AI generated scenes with no real people in them.${logos ? ` Organisation logos: ${fmtN(logos)}.` : ""}`, body: `
      <div class="d3-cred"><div class="d3-credimg">${pic("doc-credits", "A darkroom under amber safelight with blank prints on a line and a tray of metal type", { sizes: "(max-width: 900px) 100vw, 40vw" })}</div>
      <div>${bars(kRows.map(([k, n], i) => [k, n, KC[i % KC.length]]))}<p class="muted d3-small">Counted from photos-manifest.json and signer-photos.json.</p></div></div>` }) : "",

    vers.length ? sec({ id: "d3log", eyebrow: "Changelog", title: "What changed, round by round.", cat: "blue", lead: `${vers.length} ${vers.length === 1 ? "release" : "releases"} so far. The newest is open.`, body: `
      <div class="d3-log"><div class="d3-logimg">${pic("doc-changelog", "An open leather logbook on a chart table with a brass compass, lantern light and a porthole", { sizes: "(max-width: 900px) 100vw, 34vw" })}</div>
      <div class="d3-logs">${vers.map((x, i) => `<details class="d3-ver" ${i ? "" : "open"} data-m3="up"><summary><b>${esc(x.v)}</b><span>${esc(x.d)}</span><em>${x.n} items</em></summary><div class="prose d3-logbody" tabindex="0" role="region" aria-label="Changes in ${esc(x.v)}">${md(x.body)}</div></details>`).join("")}</div></div>` }) : "",

    sec({ id: "d3run", eyebrow: "Quick start", title: "Run it on your own laptop.", cat: "blue", lead: "The whole site is static files. Any small web server works.", body: `
      <div class="d3-term3" data-m3="up"><div class="bar"><i></i><i></i><i></i><span>terminal</span></div><pre><code><span class="c"># get the code</span>
git clone ${REPO}.git
cd ASI
<span class="c"># serve it</span>
python3 -m http.server 8000
<span class="c"># then open</span>
http://localhost:8000/future-of-asi/</code></pre><button class="v3-btn sm" type="button" id="d3copy">Copy commands</button></div>
      <p class="muted d3-small">Source: ${src(REPO, "github.com/lo3elyon/ASI")}</p>` }),
  ].join("");
}

export function wire(host, toast) {
  const b = host.querySelector("#d3copy"); if (!b) return;
  b.onclick = () => { const t = `git clone ${REPO}.git\ncd ASI\npython3 -m http.server 8000`; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast && toast("Commands copied."), () => toast && toast(t)); };
}
