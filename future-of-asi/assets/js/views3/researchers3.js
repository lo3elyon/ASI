/* Researchers, Round 3 blocks: compare two people, a warnings timeline per person, most cited, left the lab stories,
   regions, former labs, their books and their stated timelines. Read from data/researchers.json only. */
import { $, $$, esc, researchers, categories, avatar, initials, ICON, fmtDate, logoHtml } from "../util.js";
import { banner, sec, src, fmtN, fx3, bars, face } from "./kit.js";
import { auto } from "../core/motion3.js";

const photo = (p, cls = "r3-ph") => (p.photo ? `<span class="${cls}" ${p.photo_credit ? `title="Photo: ${esc(p.photo_credit)}"` : ""}><img src="${esc(p.photo)}" alt="Photo of ${esc(p.name)}" loading="lazy" decoding="async" width="160" height="160" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='${esc(initials(p.name))}'"></span>` : `<span class="${cls} mono" aria-hidden="true">${esc(initials(p.name))}</span>`);
const yearOf = (d) => +(String(d || "").match(/(19|20)\d\d/) || [0])[0] || 0;

export async function mount(el) {
  const [ppl, cats] = await Promise.all([researchers(), categories()]);
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const byId = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const withQ = ppl.filter((p) => p.quotes.some((q) => yearOf(q.date))).sort((a, b) => b.quotes.length - a.quotes.length);
  const cited = ppl.filter((p) => p.cites > 0).sort((a, b) => b.cites - a.cites).slice(0, 15);
  const left = ppl.filter((p) => p.left_lab && p.left_lab.org).sort((a, b) => (+b.left_lab.year || 0) - (+a.left_lab.year || 0));
  const reg = {}; ppl.forEach((p) => p.region && (reg[p.region] = (reg[p.region] || 0) + 1));
  const former = {}; ppl.forEach((p) => p.former_orgs.forEach((o) => (former[o] = (former[o] || 0) + 1)));
  const books = ppl.flatMap((p) => p.books.map((b) => ({ ...b, p }))).sort((a, b) => (+b.year || 0) - (+a.year || 0));
  const tls = ppl.filter((p) => p.agi_year).slice(0, 40);
  const opts = (sel) => ppl.slice().sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.name)}</option>`).join("");
  const A0 = byId["geoffrey-hinton"] ? "geoffrey-hinton" : ppl[0].id, B0 = byId["yann-lecun"] ? "yann-lecun" : ppl[1].id;
  const T0 = withQ[0] ? withQ[0].id : ppl[0].id;

  const box = document.createElement("div"); box.className = "v3-res";
  box.innerHTML = `
  ${banner("res-compare", { eyebrow: "Compare", title: "Put two people side by side.", lead: "Their roles, numbers, timelines and words, next to each other. Disagreement is part of the picture.", alt: "Two wooden chairs facing each other across a small table, one lit cyan and one amber", cat: "cyan", id: "r3cmpH" })}
  <section class="section tight" data-cat="cyan" aria-label="Compare two researchers"><div class="wrap">
    <div class="r3-cmpctl"><label>First person <select class="input" id="r3a">${opts(A0)}</select></label><button class="v3-btn" type="button" id="r3sw">Swap</button><label>Second person <select class="input" id="r3b">${opts(B0)}</select></label></div>
    <div id="r3cmp" aria-live="polite"></div>
  </div></section>

  ${sec({ id: "r3tl", eyebrow: "Their warnings over time", title: "One person, every dated quote.", cat: "cyan", motif: "dossier", lead: `${withQ.length} people have dated quotes in the dataset. Pick one to see what they said, year by year, with the source for each line.`, body: `
    <label class="r3-tlpick">Person <select class="input" id="r3t">${withQ.map((p) => `<option value="${p.id}" ${p.id === T0 ? "selected" : ""}>${esc(p.name)} (${p.quotes.length})</option>`).join("")}</select></label>
    <div id="r3tlOut"></div>` })}

  ${sec({ id: "r3cite", eyebrow: "Most cited", title: "The most cited scientists in this guide.", cat: "blue", lead: "Google Scholar totals as recorded on each profile, with the date they were read. Citations measure influence on research, not who is right about risk.", body: `
    <div class="r3-cite" data-m3-stagger="40">${cited.map((p, i) => `<a class="r3-citerow card-glow" href="#/researchers/${p.id}" data-person="${p.id}" data-m3="left" style="--w:${((p.cites / cited[0].cites) * 100).toFixed(1)}%"><span class="rk">${i + 1}</span>${face(p)}<span class="nm"><b>${esc(p.name)}</b><small>${esc(p.citations)}</small></span><span class="br" data-v3><i></i></span></a>`).join("")}</div>` })}

  ${banner("res-left-lab", { eyebrow: "Left the lab", title: `${left.length} people who walked out and spoke up.`, lead: "People who worked inside an AI company, left, and gave a reason in public. Each card links to its source.", alt: "A glass office building at night with one revolving door glowing red and an empty path leading away", cat: "red", id: "r3leftH" })}
  <section class="section tight" data-cat="red" aria-label="Left the lab stories"><div class="wrap">
    <div class="r3-left" data-m3-stagger="60">${left.map((p) => `<article class="r3-story card-glow m3-spot" data-m3="up"><div class="hd">${photo(p)}<div><a href="#/researchers/${p.id}" data-person="${p.id}"><h3>${esc(p.name)}</h3></a><p class="muted">Left ${esc(p.left_lab.org)}${p.left_lab.year ? ` in ${esc(p.left_lab.year)}` : ""}</p></div>${logoHtml(p.left_lab.org, p.left_lab.org, "ologo sm")}</div><p>${esc(p.left_lab.reason || p.warning)}</p>${src(p.left_lab.source)}</article>`).join("")}</div>
  </div></section>

  ${sec({ id: "r3reg", eyebrow: "Where they work", title: "A global field, unevenly spread.", cat: "lime", lead: "Number of people in this guide by region. The gap outside North America, the UK and Europe is real, and worth closing.", body: `
    <div class="r3-two">${bars(Object.entries(reg).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, n, "var(--cat)", `#/researchers?cat=region&region=${encodeURIComponent(k)}`]))}
    <div><h3 class="r3-sub">Where they used to work</h3>${bars(Object.entries(former).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => [k, n, "#f59e0b"]))}<p class="muted" style="font-size:13px">Counted from the former organisations listed on each profile.</p></div></div>` })}

  ${sec({ id: "r3books", eyebrow: "Written by them", title: `${books.length} books by people in this guide.`, cat: "amber", body: `
    <div class="r3-shelf" data-m3-stagger="35">${books.map((b) => `<a class="r3-book" ${b.url ? `href="${esc(b.url)}" target="_blank" rel="noopener"` : `href="#/researchers/${b.p.id}"`} style="--h:${(150 + (b.title.length % 5) * 14)}px"><span class="sp">${esc(b.title)}</span><span class="by">${esc(b.p.name)}${b.year ? `, ${esc(b.year)}` : ""}</span></a>`).join("")}</div>
    <a class="v3-btn" href="library/">Open the library and reader ${ICON.arrow}</a>` })}

  ${sec({ id: "r3when", eyebrow: "In their own timelines", title: "When they think it arrives.", cat: "blue", lead: "Stated AGI or superintelligence timelines, in the words each profile records. Definitions differ a lot.", body: `
    <div class="r3-when" data-m3-stagger="30">${tls.map((p) => `<a href="#/researchers/${p.id}" data-person="${p.id}" class="r3-whenrow" data-m3="fade">${face(p)}<b>${esc(p.name)}</b><span>${esc(p.agi_year)}</span></a>`).join("")}</div>` })}
  `;
  el.appendChild(box);

  const card = (p) => {
    const cs = p.categories.map((c) => catById[c]).filter(Boolean).slice(0, 4);
    const q = p.quotes[0];
    const first = p.career.map((c) => +c.year).filter(Boolean).sort((a, b) => a - b)[0];
    return `<div class="r3-side card-glow" data-m3="up">${photo(p, "r3-ph big")}<h3><a href="#/researchers/${p.id}" data-person="${p.id}">${esc(p.name)}</a></h3><p class="muted">${esc([p.role, p.org].filter(Boolean).join(", "))}</p>
      <dl><dt>p(doom)</dt><dd>${esc(p.pdoom || "Not stated")}</dd><dt>Timeline</dt><dd>${esc(p.agi_year || "Not stated")}</dd><dt>Citations</dt><dd>${esc(p.citations ? String(p.citations).split(/ \(/)[0] : "Not recorded")}</dd><dt>Career since</dt><dd>${first || "Not recorded"}</dd><dt>Quotes here</dt><dd>${p.quotes.length}</dd><dt>Region</dt><dd>${esc(p.region || "Not recorded")}</dd></dl>
      <div class="chips">${cs.map((c) => `<span class="tag" style="--c:${c.c}">${esc(c.label)}</span>`).join("")}</div>
      ${p.warning ? `<p class="r3-warn">${esc(p.warning)}</p>` : ""}
      ${q ? `<blockquote>&ldquo;${esc(q.text.length > 240 ? q.text.slice(0, 237) + "..." : q.text)}&rdquo; ${src(q.url, "source")}</blockquote>` : ""}</div>`;
  };
  const cmp = () => { const a = byId[$("#r3a", box).value], b = byId[$("#r3b", box).value]; $("#r3cmp", box).innerHTML = `<div class="r3-cmp">${card(a)}<div class="r3-vs" aria-hidden="true">VS</div>${card(b)}</div>`; auto($("#r3cmp", box)); };
  $("#r3a", box).onchange = cmp; $("#r3b", box).onchange = cmp;
  $("#r3sw", box).onclick = () => { const x = $("#r3a", box).value; $("#r3a", box).value = $("#r3b", box).value; $("#r3b", box).value = x; cmp(); };
  cmp();

  const tl = () => {
    const p = byId[$("#r3t", box).value]; const qs = p.quotes.filter((q) => yearOf(q.date)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    $("#r3tlOut", box).innerHTML = `<div class="r3-tl"><div class="who">${photo(p, "r3-ph big")}<div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.warning || p.role)}</p></div></div><ol data-v3>${qs.map((q, i) => `<li data-m3="up" style="--i:${i}"><span class="d">${esc(fmtDate(q.date))}</span><blockquote>&ldquo;${esc(q.text)}&rdquo;</blockquote><span class="s">${esc(q.source || "")} ${src(q.url, "source")}</span></li>`).join("")}</ol></div>`;
    auto($("#r3tlOut", box));
  };
  $("#r3t", box).onchange = tl; tl();
  fx3(box);
}
