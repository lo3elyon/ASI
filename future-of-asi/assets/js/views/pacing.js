import { $, $$, esc, pageHero, signatories, researchers, orgIndex, logoHtml, ICON } from "../util.js";

export async function render(el, params, query) {
  const [{ list, meta }, ppl] = await Promise.all([signatories(), researchers(), orgIndex()]);
  const pById = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const emp = {}; list.forEach((s) => { const k = (s.employer || "Independent or not listed").trim(); emp[k] = (emp[k] || 0) + 1; });
  const emps = Object.entries(emp).sort((a, b) => b[1] - a[1]);
  const withC = list.filter((s) => s.comment).length;
  const profiled = list.filter((s) => s.researcher_id && pById[s.researcher_id]).length;
  const S = { q: query.get("q") || "", emp: query.get("emp") || "", only: query.get("c") === "1" ? "c" : query.get("p") === "1" ? "p" : "", n: 120 };

  el.innerHTML = `${pageHero({ img: "cover-pacing", eyebrow: "Pacing the Frontier", title: `${list.length ? list.length.toLocaleString("en-US") : "Every"} names. <span class='serif gt'>One letter.</span>`, lead: `Pacing the Frontier is a public statement asking frontier AI to move at a pace our safety work can keep up with. Here is every named signer${meta.as_of ? ` as of ${esc(meta.as_of)}` : ""}, searchable by name and employer, with their own comments where they left one.${meta.source ? ` <a href="${esc(meta.source)}" target="_blank" rel="noopener">Read the statement ${ICON.ext}</a>` : ""}` })}
  <section class="section tight"><div class="wrap">
    ${list.length ? `<div class="sig-stats"><div><b>${meta.count_named || list.length}</b><span>named signers</span></div><div><b>${meta.count_anon || 0}</b><span>signed without a public name</span></div><div><b>${emps.length}</b><span>employers and affiliations</span></div><div><b>${withC}</b><span>left a comment</span></div></div>` : ""}
    ${meta.text ? `<div class="card" style="margin-bottom:24px"><div class="eyebrow">The statement</div><p class="kicker" style="margin:10px 0 0">${esc(meta.text)}</p></div>` : ""}
    <div class="grid" style="grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:24px;align-items:start" id="pgrid">
      <aside class="card" style="position:sticky;top:calc(var(--nav-h) + 16px)" data-lenis-prevent>
        <div class="eyebrow">By employer</div><p class="muted" style="font-size:13px;margin:6px 0 12px">Tap one to filter. ${profiled} signers also have a full profile here.</p>
        <div class="emp-bars" style="max-height:60vh;overflow:auto">${emps.slice(0, 60).map(([k, n]) => `<button type="button" data-emp="${esc(k)}" aria-pressed="${S.emp === k}"><span>${esc(k)}</span><i style="width:${Math.max(4, (n / emps[0][1]) * 100)}%"></i><b>${n}</b></button>`).join("")}</div>
      </aside>
      <div style="min-width:0">
        <div class="toolbar" role="search"><label class="sr-only" for="sq">Search signers</label><input class="input search" id="sq" type="search" placeholder="Search by name, title, employer or comment" value="${esc(S.q)}">
          <div class="chips"><button class="chip ${S.only === "c" ? "on" : ""}" type="button" data-only="c">With comments</button><button class="chip ${S.only === "p" ? "on" : ""}" type="button" data-only="p">Has a profile</button></div><span class="count" id="sc"></span></div>
        <div class="siglist" id="sl"></div>
        <div style="text-align:center;margin-top:20px"><button class="btn" type="button" id="more">Show more</button></div>
      </div>
    </div>
  </div></section>`;
  const mq = matchMedia("(max-width: 900px)");
  const lay = () => { $("#pgrid", el).style.gridTemplateColumns = mq.matches ? "1fr" : "minmax(0,320px) minmax(0,1fr)"; $("aside", el).style.position = mq.matches ? "static" : "sticky"; };
  lay(); mq.addEventListener("change", lay);

  function paint() {
    const q = S.q.toLowerCase().split(/\s+/).filter(Boolean);
    const r = list.filter((s) => (!S.emp || (s.employer || "Independent or not listed").trim() === S.emp) && (S.only !== "c" || s.comment) && (S.only !== "p" || (s.researcher_id && pById[s.researcher_id])) && q.every((w) => `${s.name} ${s.title} ${s.employer} ${s.comment}`.toLowerCase().includes(w)));
    $("#sc", el).textContent = `${r.length} of ${list.length}`;
    $("#sl", el).innerHTML = r.slice(0, S.n).map((s) => { const p = s.researcher_id && pById[s.researcher_id]; return `<article class="sig ${s.comment ? "has-c" : ""}"><div class="row" style="gap:10px;flex-wrap:nowrap;align-items:flex-start">${s.employer ? logoHtml(s.employer, s.employer, "ologo sm") : ""}<div style="min-width:0"><div class="nm">${p ? `<a href="#/researchers/${p.id}" data-person="${p.id}">${esc(s.name)}</a>` : esc(s.name)}</div><div class="tt">${esc([s.title, s.employer].filter(Boolean).join(", "))}</div></div></div>${s.comment ? `<div class="cm">${esc(s.comment)}</div>` : ""}${p ? `<a href="#/researchers/${p.id}" data-person="${p.id}" style="font-size:13px">Open profile ${ICON.arrow}</a>` : ""}</article>`; }).join("") || `<div class="empty-state" style="grid-column:1/-1">${list.length ? "No signer matches that search." : "The signatories list is not loaded yet."}</div>`;
    $("#more", el).style.display = r.length > S.n ? "" : "none";
    $$("[data-emp]", el).forEach((b) => b.setAttribute("aria-pressed", b.dataset.emp === S.emp));
    $$("[data-only]", el).forEach((b) => b.classList.toggle("on", b.dataset.only === S.only));
    if (window.ScrollTrigger) requestAnimationFrame(() => window.ScrollTrigger.refresh());
  }
  let t; $("#sq", el).addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { S.q = e.target.value; S.n = 120; paint(); }, 80); });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-emp]"); if (b) { S.emp = S.emp === b.dataset.emp ? "" : b.dataset.emp; S.n = 120; paint(); $("#sq", el).scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    const o = e.target.closest("[data-only]"); if (o) { S.only = S.only === o.dataset.only ? "" : o.dataset.only; S.n = 120; paint(); }
  });
  $("#more", el).addEventListener("click", () => { S.n += 240; paint(); });
  paint();
  el._onParams = (p, q) => { S.q = q.get("q") || ""; $("#sq", el).value = S.q; paint(); };
  return () => mq.removeEventListener("change", lay);
}
