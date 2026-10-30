import { $, $$, esc, load, arr, slug, pageHero, signatories, researchers, orgIndex, logoHtml, initials, ICON, fmtDate } from "../util.js";
import { auto } from "../core/motion3.js";
import { pic, sec, src, fx3, fmtN } from "../views3/kit.js";
import { theAsk, roles, facesWall, leaders, whyPace, labRings, method } from "../views3/pacing3.js";

/* Pacing the Frontier. The headline is always the full total (named plus anonymous), never the named count alone.
   Signer photos: data/signer-photos.json {slug: {file}} or a photo field on the signer, else the researcher photo, else initials. */
const SITE = "https://www.pacingthefrontier.com/";

export async function render(el, params, query) {
  const [{ list, meta }, ppl, rawSig, sp] = await Promise.all([signatories(), researchers(), load("signatories.json", {}), load("signer-photos.json", {}), orgIndex()]);
  const pById = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const rawList = arr(rawSig, "signatories");
  const rawBy = Object.fromEntries(rawList.map((s) => [s.name, s]));
  const rm = (rawSig && rawSig.meta) || {};
  const named = rm.count_named || meta.count_named || list.length;
  const anon = rm.count_anon != null ? rm.count_anon : meta.count_anon || 0;
  const total = rm.count_total || named + anon;
  const asOf = rm.as_of || meta.as_of || "";
  const source = rm.source || meta.source || SITE;
  const man = sp && typeof sp === "object" && !Array.isArray(sp) ? sp : {};
  const photoOf = (s) => {
    const r = rawBy[s.name] || {}; const k = r.slug || slug(s.name);
    const m = man[k]; if (m && m.file) return /^(data|assets)\//.test(m.file) ? m.file : `data/${m.file.replace(/^\.?\//, "")}`;
    if (r.photo) return r.photo;
    const p = s.researcher_id && pById[s.researcher_id]; return p && p.photo ? p.photo : "";
  };
  const creditOf = (s) => {
    const r = rawBy[s.name] || {}; const k = r.slug || s.slug || slug(s.name); const m = man[k];
    if (m && m.file) return m.credit || (m.source_url ? host(m.source_url) : "");
    if (r.photo_credit || s.photo_credit) return r.photo_credit || s.photo_credit;
    const p = s.researcher_id && pById[s.researcher_id]; return p && p.photo ? p.photo_credit || "" : "";
  };
  const face = (s, cls = "pc3-ph") => { const f = photoOf(s); const cr = creditOf(s); return f ? `<span class="${cls}" ${cr ? `title="Photo: ${esc(cr)}"` : ""}><img src="${esc(f)}" alt="" loading="lazy" decoding="async" width="56" height="56" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('ini');this.parentNode.textContent='${esc(initials(s.name))}'"></span>` : `<span class="${cls} ini" aria-hidden="true">${esc(initials(s.name))}</span>`; };
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };

  const emp = {}; list.forEach((s) => { const k = (s.employer || "Independent or not listed").trim(); emp[k] = (emp[k] || 0) + 1; });
  const emps = Object.entries(emp).sort((a, b) => b[1] - a[1]);
  const withC = list.filter((s) => s.comment);
  const profiled = list.filter((s) => s.researcher_id && pById[s.researcher_id]);
  const withPhoto = list.filter((s) => photoOf(s)).length;
  const top10 = emps.filter(([k]) => k !== "Independent or not listed").slice(0, 10);
  const top10n = top10.reduce((a, b) => a + b[1], 0);
  const namedPct = total ? (named / total) * 100 : 0;
  const S = { q: query.get("q") || "", emp: query.get("emp") || "", only: query.get("c") === "1" ? "c" : query.get("p") === "1" ? "p" : "", n: 96, view: "cards" };
  const qd = withC.length ? withC[Math.floor(Date.now() / 864e5) % withC.length] : null;
  const COLS = ["#10b981", "#14b8a6", "#22d3ee", "#0ea5e9", "#3b82f6", "#84cc16", "#eab308", "#f59e0b", "#f97316", "#ef4444"];

  const X = { list, named, anon, total, asOf, rm, emps, face, photoOf, creditOf, pById, fmtDate };
  el.innerHTML = `${pageHero({ img: "cover-pacing", eyebrow: "Pacing the Frontier", title: `${fmtN(total)} people. <span class='serif gt'>One letter.</span>`, lead: `Pacing the Frontier is a July 2026 statement from employees of frontier AI companies. It asks the U.S. government to support an international effort to build the tools needed to deliberately pace automated AI development. ${fmtN(total)} people have signed it${asOf ? ` as of ${esc(fmtDate(asOf))}` : ""}: ${fmtN(named)} with their name and ${fmtN(anon)} without a public name. Every named signer is here, searchable, with their own comments where they left one. <a href="${esc(source)}" target="_blank" rel="noopener">Read the statement on pacingthefrontier.com ${ICON.ext}</a>` })}

  <section class="section tight pc3" data-cat="emerald" aria-labelledby="pc3tot"><div class="wrap">
    <div class="pc3-total">
      <div class="pc3-big"><div class="eyebrow">Total signers${asOf ? `, ${esc(fmtDate(asOf))}` : ""}</div><b id="pc3tot" data-m3-count="${total}" aria-label="${fmtN(total)} people have signed">${fmtN(total)}</b><span>people have signed Pacing the Frontier</span>
        <a class="v3-btn primary" href="${esc(source)}" target="_blank" rel="noopener" data-m3-magnet>Read the statement at pacingthefrontier.com ${ICON.ext}</a></div>
      <div class="pc3-split" data-v3 role="img" aria-label="${fmtN(named)} named and ${fmtN(anon)} anonymous signers">
        <svg viewBox="0 0 200 200" class="pc3-donut"><circle cx="100" cy="100" r="80" fill="none" stroke="var(--surface-3)" stroke-width="22"/><circle class="a" cx="100" cy="100" r="80" fill="none" stroke="#10b981" stroke-width="22" pathLength="100" stroke-dasharray="${namedPct.toFixed(2)} 100" transform="rotate(-90 100 100)"/><circle class="b" cx="100" cy="100" r="80" fill="none" stroke="#f59e0b" stroke-width="22" pathLength="100" stroke-dasharray="${(100 - namedPct).toFixed(2)} 100" stroke-dashoffset="${(-namedPct).toFixed(2)}" transform="rotate(-90 100 100)"/><text x="100" y="96" text-anchor="middle" font-size="30" fill="var(--text)" font-family="var(--f-mono)">${Math.round(namedPct)}%</text><text x="100" y="120" text-anchor="middle" font-size="12" fill="var(--muted)">named</text></svg>
        <ul><li><i style="background:#10b981"></i><b data-m3-count="${named}">${fmtN(named)}</b> signed with their name</li><li><i style="background:#f59e0b"></i><b data-m3-count="${anon}">${fmtN(anon)}</b> signed without a public name</li><li><i style="background:transparent;border:2px solid var(--text);box-sizing:border-box"></i><b>${fmtN(total)}</b> in total</li></ul></div>
    </div>
    <div class="pc3-stats" data-m3-stagger="70">
      <div data-m3="up"><b data-m3-count="${emps.length}">${emps.length}</b><span>employers and affiliations</span></div>
      <div data-m3="up"><b data-m3-count="${withC.length}">${withC.length}</b><span>named signers left a comment</span></div>
      <div data-m3="up"><b data-m3-count="${profiled.length}">${profiled.length}</b><span>also have a full profile here</span></div>
      <div data-m3="up"><b data-m3-count="${withPhoto}">${withPhoto}</b><span>named signers shown with a photo</span></div>
    </div>
    <p class="muted pc3-note">Counts come from the signer list on ${src(source, "pacingthefrontier.com")}${asOf ? ` read on ${esc(fmtDate(asOf))}` : ""}. Employer breakdowns below cover the ${fmtN(named)} named signers only, because anonymous signers did not share one.</p>
  </div></section>

  ${theAsk(X)}
  ${roles(X)}
  ${labRings(X)}
  ${sec({ id: "pc3emp", eyebrow: "Employer breakdown", title: "Where the named signers work.", cat: "emerald", lead: `The ten employers with the most named signers account for ${fmtN(top10n)} of ${fmtN(named)} names. Tap a block to filter the list.`, body: `
    <div class="pc3-tree" data-m3-stagger="40">${top10.map(([k, n], i) => `<button type="button" class="pc3-blk" data-emp="${esc(k)}" style="--c:${COLS[i % COLS.length]};flex-grow:${n}" data-m3="scale" aria-pressed="false">${logoHtml(k, k, "ologo sm")}<b>${n}</b><span>${esc(k)}</span></button>`).join("")}<span class="pc3-fill" aria-hidden="true"></span></div>` })}

  <section class="pc3-band" data-cat="emerald" aria-label="Signer comment">
    <div class="bg">${pic("pacing-letter", "A long sheet of paper covered in many abstract handwritten signatures with a fountain pen", { sizes: "100vw" })}</div><div class="v3-banner-shade" aria-hidden="true"></div>
    ${qd ? `<figure class="wrap-narrow in"><div class="eyebrow">In a signer's words, a new one each day</div><blockquote data-m3-split="words">${esc(qd.comment)}</blockquote><figcaption data-m3="up">${face(qd)}<span><b>${esc(qd.name)}</b><br>${esc([qd.title, qd.employer].filter(Boolean).join(", "))}</span></figcaption></figure>` : ""}
  </section>

  ${facesWall(X)}
  ${leaders(X)}
  ${whyPace(X)}
  ${withC.length ? sec({ id: "pc3cm", eyebrow: "Comments", title: "Why they signed, in their own words.", cat: "emerald", body: `<div class="pc3-cmq" data-m3-marquee="30">${withC.slice(0, 24).map((s) => `<figure class="pc3-cmc">${face(s)}<blockquote>${esc(s.comment.length > 220 ? s.comment.slice(0, 217) + "..." : s.comment)}</blockquote><figcaption><b>${esc(s.name)}</b> ${esc(s.employer || "")}</figcaption></figure>`).join("")}</div>` }) : ""}

  <section class="section tight" data-cat="emerald" aria-labelledby="pc3all"><div class="wrap">
    <div class="v3-head"><div class="eyebrow"><span class="dot-cat"></span>Every named signer</div><h2 id="pc3all">${fmtN(named)} names, searchable.</h2></div>
    <div class="grid" style="grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:24px;align-items:start" id="pgrid">
      <aside class="card" id="pc3side" data-lenis-prevent>
        <div class="eyebrow">By employer</div><p class="muted" style="font-size:13px;margin:6px 0 12px">Tap one to filter.</p>
        <div class="emp-bars" style="max-height:60vh;overflow:auto">${emps.slice(0, 80).map(([k, n]) => `<button type="button" data-emp="${esc(k)}" aria-pressed="${S.emp === k}"><span>${esc(k)}</span><i style="width:${Math.max(4, (n / emps[0][1]) * 100)}%"></i><b>${n}</b></button>`).join("")}</div>
      </aside>
      <div style="min-width:0">
        <div class="toolbar" role="search"><label class="sr-only" for="sq">Search signers</label><input class="input search" id="sq" type="search" placeholder="Search by name, title, employer or comment" value="${esc(S.q)}">
          <div class="chips"><button class="chip ${S.only === "c" ? "on" : ""}" type="button" data-only="c">With comments <span class="mono" style="opacity:.6">${withC.length}</span></button><button class="chip ${S.only === "p" ? "on" : ""}" type="button" data-only="p">Has a profile <span class="mono" style="opacity:.6">${profiled.length}</span></button><button class="chip" type="button" data-view="faces" aria-pressed="false">Compact view</button></div><span class="count" id="sc"></span></div>
        <div class="pc3-list" id="sl"></div>
        <div style="text-align:center;margin-top:20px"><button class="v3-btn" type="button" id="more">Show more</button></div>
      </div>
    </div>
  </div></section>
  ${method(X)}`;

  const mq = matchMedia("(max-width: 900px)");
  const lay = () => { $("#pgrid", el).style.gridTemplateColumns = mq.matches ? "1fr" : "minmax(0,300px) minmax(0,1fr)"; $("#pc3side", el).style.position = mq.matches ? "static" : "sticky"; $("#pc3side", el).style.top = "calc(var(--nav-h) + 16px)"; };
  lay(); mq.addEventListener("change", lay);

  function paint() {
    const q = S.q.toLowerCase().split(/\s+/).filter(Boolean);
    const r = list.filter((s) => (!S.emp || (s.employer || "Independent or not listed").trim() === S.emp) && (S.only !== "c" || s.comment) && (S.only !== "p" || (s.researcher_id && pById[s.researcher_id])) && q.every((w) => `${s.name} ${s.title} ${s.employer} ${s.comment}`.toLowerCase().includes(w)));
    $("#sc", el).textContent = `${fmtN(r.length)} of ${fmtN(named)} named`;
    const L = $("#sl", el); L.classList.toggle("faces", S.view === "faces");
    L.innerHTML = r.slice(0, S.n).map((s) => { const p = s.researcher_id && pById[s.researcher_id]; const cr = creditOf(s); return `<article class="pc3-card ${s.comment ? "has-c" : ""}" ${cr ? `data-credit="Photo: ${esc(cr)}"` : ""}>${face(s)}<div class="tx"><div class="nm"><a href="${p ? `#/researchers/${p.id}` : `#/pacing?q=${encodeURIComponent(s.name)}`}" data-person="${esc(p ? p.id : s.slug || slug(s.name))}">${esc(s.name)}</a></div><div class="tt">${esc([s.title, s.employer].filter(Boolean).join(", "))}</div>${s.comment ? `<div class="cm">${esc(s.comment)}</div>${s.comment.length > 220 ? `<button type="button" class="more-c" aria-expanded="false">Read the full comment</button>` : ""}` : ""}${p ? `<a class="op" href="#/researchers/${p.id}" data-person="${p.id}">Open profile ${ICON.arrow}</a>` : ""}</div>${s.employer ? logoHtml(s.employer, s.employer, "ologo sm") : ""}</article>`; }).join("") || `<div class="empty-state" style="grid-column:1/-1">${list.length ? "No signer matches that search." : "The signatories list is not loaded yet."}</div>`;
    $("#more", el).style.display = r.length > S.n ? "" : "none";
    $$("[data-emp]", el).forEach((b) => b.setAttribute("aria-pressed", b.dataset.emp === S.emp));
    $$("[data-only]", el).forEach((b) => b.classList.toggle("on", b.dataset.only === S.only));
    if (window.ScrollTrigger) requestAnimationFrame(() => window.ScrollTrigger.refresh());
  }
  let t; $("#sq", el).addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { S.q = e.target.value; S.n = 96; paint(); }, 80); });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-emp]"); if (b) { S.emp = S.emp === b.dataset.emp ? "" : b.dataset.emp; S.n = 96; paint(); $("#sq", el).scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    const o = e.target.closest("[data-only]"); if (o) { S.only = S.only === o.dataset.only ? "" : o.dataset.only; S.n = 96; paint(); return; }
    const mc = e.target.closest(".more-c"); if (mc) { const c = mc.closest(".pc3-card"); const o = c.classList.toggle("open"); mc.setAttribute("aria-expanded", o); mc.textContent = o ? "Show less" : "Read the full comment"; return; }
    const v = e.target.closest("[data-view]"); if (v) { S.view = S.view === "faces" ? "cards" : "faces"; v.setAttribute("aria-pressed", S.view === "faces"); v.classList.toggle("on", S.view === "faces"); paint(); }
  });
  $("#more", el).addEventListener("click", () => { S.n += 192; paint(); });
  paint();
  fx3(el);
  el._onParams = (p, q) => { S.q = q.get("q") || ""; S.emp = q.get("emp") || S.emp; $("#sq", el).value = S.q; paint(); };
  return () => mq.removeEventListener("change", lay);
}
