/* Pacing the Frontier, Round 3 extra sections (views owner).
   Every number here is computed from data/signatories.json at render time, so nothing is typed in by hand
   except the statement facts, which are quoted from pacingthefrontier.com (read 2026-10-29). */
import { esc } from "../util.js";
import { pic, sec, src, fmtN, ring } from "./kit.js";

export const SITE = "https://www.pacingthefrontier.com/";
const GUIDE = "https://guidelight.ai/";
const ENCODE = "https://encodeai.org/";

/* Title buckets. Order matters: the first match wins. */
const ROLES = [
  ["Leadership", /\b(chief|ceo|cto|coo|co-?founder|founder|president|vp|vice president|director|head)\b/i, "#10b981"],
  ["Member of Technical Staff", /technical staff/i, "#14b8a6"],
  ["Research", /\b(research|researcher|scientist)\b/i, "#22d3ee"],
  ["Engineering", /\b(engineer|engineering|swe|developer)\b/i, "#3b82f6"],
  ["Product, policy, go to market and other", /./, "#f59e0b"],
];
export function roleOf(t) { if (!t) return "Title not listed"; const r = ROLES.find(([, re]) => re.test(t)); return r ? r[0] : "Title not listed"; }

/* 1. The statement itself */
export function theAsk({ total, asOf, fmtDate }) {
  return `<section class="pc3-ask" data-cat="emerald" aria-labelledby="pc3ask">
    <div class="pc3-ask-img" data-v3-tiltimg>${pic("pacing-ask", "An empty hearing room at dusk with one stack of printed pages under a brass lamp", { sizes: "(max-width: 900px) 100vw, 50vw" })}<span class="pc3-stamp" aria-hidden="true">July 2026</span></div>
    <div class="pc3-ask-tx">
      <div class="eyebrow" data-m3="left"><span class="dot-cat"></span>The statement</div>
      <h2 id="pc3ask" data-m3-split="words">One sentence, signed by the people building it.</h2>
      <p data-m3="up">The statement was published in July 2026 by employees of frontier AI companies. It says the leading labs believe they could be close to automating AI research, and that there is a real risk progress speeds up beyond our ability to understand or control the systems.</p>
      <blockquote class="pc3-req" data-m3="up" data-m3-delay="120"><span class="eyebrow">The request, word for word</span>&ldquo;We request that the U.S. government support an international effort to develop the technical and governance tools needed to deliberately pace the frontier of automated AI development.&rdquo;</blockquote>
      <ol class="pc3-three" data-m3-stagger="90">
        <li data-m3="up"><b>The worry</b><span>AI building better AI could move faster than safety, security and oversight can keep up.</span></li>
        <li data-m3="up"><b>The trap</b><span>No single company or country wants to slow down alone, because of competition.</span></li>
        <li data-m3="up"><b>The ask</b><span>Build the tools, technical and legal, so the world has the option to pace progress together.</span></li>
      </ol>
      <p class="muted pc3-small" data-m3="fade">Organisational support came from two independent nonprofits, ${src(GUIDE, "Guidelight AI Standards")} and ${src(ENCODE, "Encode AI")}. The site counts ${fmtN(total)} signers${asOf ? ` as of ${esc(fmtDate(asOf))}` : ""}. Source: ${src(SITE, "pacingthefrontier.com")}</p>
    </div>
  </section>`;
}

/* 2. Roles of the named signers */
export function roles({ list, named }) {
  const c = {}; list.forEach((s) => { const r = roleOf(s.title); c[r] = (c[r] || 0) + 1; });
  const order = [...ROLES.map((r) => r[0]), "Title not listed"];
  const col = Object.fromEntries([...ROLES.map((r) => [r[0], r[2]]), ["Title not listed", "#475569"]]);
  const rows = order.filter((k) => c[k]).map((k) => [k, c[k], col[k]]);
  const listed = named - (c["Title not listed"] || 0);
  return sec({ id: "pc3role", eyebrow: "Roles", title: "Mostly the people who write the code.", cat: "emerald", lead: `${fmtN(listed)} of the ${fmtN(named)} named signers listed a job title. I sorted every title into five simple groups by its words, so treat the groups as a rough picture, not an official count.`, body: `
    <div class="pc3-roles">
      <div class="pc3-stack" data-v3 role="img" aria-label="${esc(rows.map(([k, n]) => `${k}: ${n}`).join(", "))}">${rows.map(([k, n, cc], i) => `<i style="--w:${((n / named) * 100).toFixed(2)}%;--c:${cc};--i:${i}" title="${esc(k)}: ${fmtN(n)}"></i>`).join("")}</div>
      <ul class="pc3-legend" data-m3-stagger="60">${rows.map(([k, n, cc]) => `<li data-m3="up" style="--c:${cc}"><i></i><b>${fmtN(n)}</b><span>${esc(k)}</span><small>${Math.round((n / named) * 100)}%</small></li>`).join("")}</ul>
    </div>` });
}

/* 3. Faces wall: every named signer with a real photo */
export function facesWall({ list, photoOf, creditOf, pById }) {
  const withP = list.filter((s) => photoOf(s));
  const shown = withP.slice(0, 180);
  return sec({ id: "pc3faces", eyebrow: "Faces", title: `${fmtN(withP.length)} signers, shown with a real photo.`, cat: "emerald", lead: `A photo appears only where the person could be matched to a public picture with their name and employer. Everyone else keeps their initials, because a wrong face is worse than none. Hover a face to see the name and the photo credit.`, body: `
    <div class="pc3-wall" data-m3-stagger="12">${shown.map((s) => { const p = s.researcher_id && pById[s.researcher_id]; const id = p ? p.id : s.slug; const cr = creditOf(s); return `<a class="pc3-wf" href="${p ? `#/researchers/${p.id}` : `#/pacing?q=${encodeURIComponent(s.name)}`}" data-person="${esc(id)}" data-m3="scale" aria-label="${esc(s.name)}${s.employer ? `, ${esc(s.employer)}` : ""}"><img src="${esc(photoOf(s))}" alt="" loading="lazy" decoding="async" width="96" height="96" referrerpolicy="no-referrer" onerror="this.closest('a').remove()"><span class="tip"><b>${esc(s.name)}</b>${s.employer ? `<em>${esc(s.employer)}</em>` : ""}${cr ? `<small>Photo: ${esc(cr)}</small>` : ""}</span></a>`; }).join("")}</div>
    ${withP.length > shown.length ? `<p class="muted pc3-small">Showing ${fmtN(shown.length)} of ${fmtN(withP.length)} photos here. The full list below shows every one.</p>` : ""}` });
}

/* 4. Leaders who signed */
export function leaders({ list, face, pById, creditOf }) {
  const L = list.filter((s) => roleOf(s.title) === "Leadership").slice(0, 24);
  if (!L.length) return "";
  return sec({ id: "pc3lead", eyebrow: "Leaders", title: "Chief scientists, founders and heads of safety signed too.", cat: "emerald", lead: `${fmtN(list.filter((s) => roleOf(s.title) === "Leadership").length)} named signers hold a title like chief, founder, head, director or VP. These are their titles as written on the statement.`, body: `
    <div class="pc3-leads" data-m3-stagger="40">${L.map((s) => { const p = s.researcher_id && pById[s.researcher_id]; return `<a class="pc3-ld card-glow m3-spot" href="${p ? `#/researchers/${p.id}` : `#/pacing?q=${encodeURIComponent(s.name)}`}" data-person="${esc(p ? p.id : s.slug)}" data-m3="up" ${creditOf(s) ? `data-credit="Photo: ${esc(creditOf(s))}"` : ""}>${face(s, "pc3-ph lg")}<b>${esc(s.name)}</b><span>${esc(s.title)}</span><em>${esc(s.employer || "")}</em></a>`; }).join("")}</div>` });
}

/* 5. Why pacing, in my words */
export function whyPace({ named, anon, total }) {
  return `<section class="v3-banner pc3-pace" data-cat="emerald" aria-labelledby="pc3pace">
    <div class="v3-banner-img" data-m3-parallax="0.12">${pic("pacing-pace", "A pace car with amber lights leading on an empty wet racetrack at night with green light trails", { sizes: "100vw" })}</div>
    <div class="v3-banner-shade" aria-hidden="true"></div>
    <div class="wrap v3-banner-in"><div class="eyebrow" data-m3="left">Why pacing</div><h2 id="pc3pace" data-m3-split="words">A pace car does not stop the race.</h2>
      <p class="lead" data-m3="up">In a car race, a pace car slows everyone together when the track is not safe, then the race goes on. Nobody loses by slowing, because everybody slows. That is the idea behind this letter as I read it: not a ban, but a shared option to slow down if the track gets dangerous.</p>
      <div class="pc3-pacenums" data-m3-stagger="90"><div data-m3="up"><b data-m3-count="${total}">${fmtN(total)}</b><span>signers in total</span></div><div data-m3="up"><b data-m3-count="${named}">${fmtN(named)}</b><span>signed by name</span></div><div data-m3="up"><b data-m3-count="${anon}">${fmtN(anon)}</b><span>signed without a public name</span></div></div>
    </div>
  </section>`;
}

/* 6. Lab share rings: share of the named list per lab */
export function labRings({ emps, named }) {
  const top = emps.filter(([k]) => k !== "Independent or not listed").slice(0, 4);
  const C = ["#10b981", "#22d3ee", "#3b82f6", "#f59e0b"];
  return sec({ id: "pc3ring", eyebrow: "Share by lab", title: "Four companies, most of the names.", cat: "emerald", lead: `Each ring is that employer's share of the ${fmtN(named)} named signers, exactly as the employer is written on the statement. Google and Google DeepMind are listed separately there, so they are separate here too.`, body: `
    <div class="pc3-rings" data-m3-stagger="90">${top.map(([k, n], i) => `<div class="pc3-rg card-glow" data-m3="up" style="--c:${C[i]}">${ring(n / named, C[i], 120, `${k}: ${Math.round((n / named) * 100)} percent of named signers`)}<b>${esc(k)}</b><span>${fmtN(n)} named signers</span></div>`).join("")}</div>` });
}

/* 7. How these numbers were read */
export function method({ rm, named, anon, total, asOf, fmtDate }) {
  const rows = [
    ["Total signers", fmtN(total), "named plus anonymous, the number the statement page itself shows"],
    ["Named signers", fmtN(named), "each one is in the searchable list on this page"],
    ["Anonymous signers", fmtN(anon), "counted, but no name or employer was published"],
    rm.count_with_comment != null ? ["Named signers with a comment", fmtN(rm.count_with_comment), "the comment text is copied exactly"] : null,
    rm.count_comments_total != null ? ["Personal comments on the site", fmtN(rm.count_comments_total), "comments are made in a personal capacity"] : null,
    asOf ? ["Read on", esc(fmtDate(asOf)), "the list grows, so the live site may show more"] : null,
  ].filter(Boolean);
  return sec({ id: "pc3how", eyebrow: "Method", title: "How I read these numbers.", cat: "emerald", lead: `I never show ${fmtN(named)} as the total. The total is ${fmtN(total)}: the ${fmtN(named)} who gave their name and the ${fmtN(anon)} who did not.`, body: `
    <div class="pc3-how"><dl data-m3-stagger="60">${rows.map(([a, b, c]) => `<div data-m3="up"><dt>${esc(a)}</dt><dd><b>${b}</b><span>${esc(c)}</span></dd></div>`).join("")}</dl>
    <p class="muted pc3-small">${rm.method ? esc(rm.method) + " " : ""}All comments on the statement are made in a personal capacity and do not necessarily represent any company's views. Source: ${src(SITE, "pacingthefrontier.com")}</p>
    <a class="v3-btn primary" href="${SITE}" target="_blank" rel="noopener" data-m3-magnet>Read the full statement</a></div>` });
}
