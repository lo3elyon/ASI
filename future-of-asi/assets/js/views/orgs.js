import { $, $$, esc, load, arr, researchers, pageHero, initials, orgIndex, logoHtml, logoSrc, ICON, slug } from "../util.js";

// Country centres (lat, lng), used only when an organisation has no coordinates of its own.
const CENTRE = { USA: [39, -98], "United States": [39, -98], UK: [53.5, -2], "United Kingdom": [53.5, -2], Canada: [56, -96], Netherlands: [52.1, 5.3], India: [22, 78.9], France: [46.4, 2.2], Germany: [51.1, 10.4], China: [35, 104], Singapore: [1.35, 103.8], Japan: [36, 138], Australia: [-25, 134], Switzerland: [46.8, 8.2], Israel: [31.5, 34.9], "South Korea": [36.3, 127.8], Korea: [36.3, 127.8], Belgium: [50.8, 4.4], Sweden: [62, 15], Finland: [64, 26], Norway: [61, 9], Denmark: [56, 10], Spain: [40, -3.7], Italy: [42.8, 12.5], Brazil: [-10, -52], Kenya: [0.2, 37.9], Nigeria: [9, 8.7], "South Africa": [-29, 24], UAE: [24, 54], "United Arab Emirates": [24, 54], Taiwan: [23.7, 121], Estonia: [58.6, 25], Ireland: [53.4, -8], Austria: [47.5, 14.5], Poland: [52, 19], "Czech Republic": [49.8, 15.5], Mexico: [23.6, -102.5], Argentina: [-38, -63], Chile: [-35, -71], "New Zealand": [-41, 174], Global: [10, -30], International: [10, -30] };
const TYPEC = (t) => (/lab|company/.test(t) ? "#3b82f6" : /government|institute.*state|aisi/.test(t) ? "#84cc16" : /evaluation/.test(t) ? "#ef4444" : /advocacy|movement/.test(t) ? "#f59e0b" : /education|training|fellowship|career/.test(t) ? "#14b8a6" : "#22d3ee");
const TYPEG = (t) => (/lab|company/.test(t) ? "Labs" : /government/.test(t) ? "Government" : /evaluation/.test(t) ? "Evaluations" : /advocacy|movement/.test(t) ? "Advocacy" : /education|training|fellowship|career/.test(t) ? "Training and careers" : /funder|charity/.test(t) ? "Funders and charities" : "Research");

export async function render(el, params, query) {
  const [raw, ppl] = await Promise.all([load("orgs.json"), researchers(), orgIndex()]);
  const orgs = arr(raw, "orgs").map((o) => ({ ...o, id: o.id || slug(o.name), type: o.type || "research", country: o.country || "", focus: [].concat(o.focus || []), what: o.what || o.summary || o.focus_text || "", g: TYPEG(o.type || "") }))
    .map((o) => { const ll = o.lat != null && o.lng != null ? [+o.lat, +o.lng] : o.lat != null && o.lon != null ? [+o.lat, +o.lon] : CENTRE[o.country] || CENTRE[String(o.country).split(/[,/]/)[0].trim()] || null; return { ...o, ll }; });
  const pById = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const groups = [...new Set(orgs.map((o) => o.g))];
  const countries = [...new Set(orgs.map((o) => o.country || "Global"))];
  const S = { g: "all", c: "", q: "", pin: "" };

  // Pins: group organisations that share a spot
  const spots = {};
  orgs.filter((o) => o.ll).forEach((o) => { const k = `${o.ll[0].toFixed(1)},${o.ll[1].toFixed(1)}`; (spots[k] = spots[k] || { k, lat: o.ll[0], lng: o.ll[1], list: [] }).list.push(o); });
  const pins = Object.values(spots).map((s) => ({ ...s, n: s.list.length, c: s.list.length > 4 ? "#22d3ee" : TYPEC(s.list[0].type) }));

  el.innerHTML = `${pageHero({ img: "cover-orgs", eyebrow: "Organisations", title: "Who is <span class='serif gt-sea'>keeping watch.</span>", lead: `${orgs.length} labs, institutes, nonprofits, programs and funders in ${countries.length} countries working on AI safety, alignment, control, evaluations and governance. Spin the globe, tap a light.` })}
  <section class="section tight"><div class="wrap">
    <div class="globe-wrap">
      <div class="globe" id="globe" role="img" aria-label="Globe with ${pins.length} locations of AI safety organisations"><div class="gtip" id="gtip"></div></div>
      <div class="globe-side">
        <div class="eyebrow">Around the world</div>
        <h2 style="margin:10px 0 12px;font-size:clamp(26px,3.4vw,40px)">${pins.length} places, <span class="serif">one shared worry.</span></h2>
        <p class="muted">Drag to turn the globe. Scrolling spins it too. Tap a light to see who works there.</p>
        <div class="card pick" id="gpick" aria-live="polite"><p class="muted" style="margin:0">Nothing picked yet. The biggest clusters are in ${esc(Object.entries(orgs.reduce((a, o) => ((a[o.country || "Global"] = (a[o.country || "Global"] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]).join(", "))}.</p></div>
        <div class="chips" style="margin-top:14px">${["Labs", "Research", "Evaluations", "Government", "Advocacy", "Training and careers"].filter((g) => groups.includes(g)).map((g) => `<span class="tag" style="--c:${TYPEC(g.toLowerCase().replace("labs", "lab").replace("evaluations", "evaluation"))}">${g}</span>`).join("")}</div>
      </div>
    </div>
    <div class="toolbar" style="margin-top:30px"><input class="input search" id="oq" type="search" placeholder="Search organisations, focus areas, people" aria-label="Search organisations"><span class="count" id="oc"></span></div>
    <div class="chips" style="margin:-8px 0 22px"><button class="chip on" data-g="all" type="button">All</button>${groups.map((g) => `<button class="chip" data-g="${g}" type="button">${g}</button>`).join("")}<span id="cchip"></span></div>
    <div class="grid gauto" id="og"></div>
  </div></section>`;

  const tip = $("#gtip", el);
  const pickHtml = (p) => `<div class="eyebrow">${esc(p.list[0].country || "Global")}</div><div style="display:grid;gap:10px;margin-top:10px">${p.list.map((o) => `<a href="#/orgs?o=${encodeURIComponent(o.id)}" data-org="${esc(o.id)}" class="row" style="gap:10px;flex-wrap:nowrap;color:var(--text)">${logoHtml(o.id, o.name)}<span><b>${esc(o.name)}</b><br><span class="muted" style="font-size:13px">${esc(o.type)}</span></span></a>`).join("")}</div>`;
  let stopGlobe = () => {};
  import("../core/globe.js").then((g) => g.mountGlobe($("#globe", el), pins, {
    onHover(p, x, y) { if (!p) { tip.style.display = "none"; return; } tip.style.display = "block"; tip.style.left = x + "px"; tip.style.top = y + "px"; tip.innerHTML = `<div class="row" style="gap:6px;flex-wrap:nowrap">${p.list.slice(0, 4).map((o) => logoHtml(o.id, o.name, "ologo sm")).join("")}<b>${esc(p.list.length === 1 ? p.list[0].name : `${p.list.length} organisations`)}</b></div>`; },
    onPick(p) { $("#gpick", el).innerHTML = pickHtml(p); S.c = p.list[0].country || "Global"; paint(); },
  })).then((s) => { if (s) stopGlobe = s; }).catch((e) => { console.warn("globe", e); $("#globe", el).innerHTML = `<div class="fallback">The globe could not start here. Everything is in the list below.</div>`; });

  function paint() {
    const q = S.q.toLowerCase();
    const list = orgs.filter((o) => (S.g === "all" || o.g === S.g) && (!S.c || (o.country || "Global") === S.c) && `${o.name} ${o.what} ${o.focus.join(" ")} ${o.type} ${o.country} ${(o.people || []).map((id) => pById[id]?.name || "").join(" ")}`.toLowerCase().includes(q));
    $("#oc", el).textContent = `${list.length} of ${orgs.length}`;
    $("#cchip", el).innerHTML = S.c ? `<button class="chip on" type="button" id="cc">${esc(S.c)} ${ICON.close.replace("viewBox", 'width="12" height="12" viewBox')}</button>` : "";
    if (S.c) $("#cc", el).onclick = () => { S.c = ""; paint(); };
    $("#og", el).innerHTML = list.map((o) => {
      const c = TYPEC(o.type); const people = (o.people || []).map((id) => pById[id]).filter(Boolean);
      return `<article class="card hov spot orgcard" id="org-${esc(o.id)}" style="--c:${c};display:flex;flex-direction:column;gap:10px">
        <div class="hd" style="display:flex;gap:12px;align-items:center">${logoHtml(o.id, o.name, "ologo lg")}<div style="min-width:0"><b style="font-family:var(--f-display);font-size:17px">${esc(o.name)}</b><br><span class="muted" style="font-size:13px">${esc(o.type)}${o.country ? ` · ${esc(o.country)}` : ""}${o.founded ? ` · since ${esc(o.founded)}` : ""}</span></div></div>
        <p>${esc(o.what)}</p>
        ${o.focus.length ? `<div class="chips">${o.focus.slice(0, 5).map((f) => `<span class="tag" style="--c:${c}">${esc(f)}</span>`).join("")}</div>` : ""}
        ${people.length ? `<div class="chips">${people.slice(0, 6).map((p) => `<a class="chip" href="#/researchers/${p.id}">${esc(p.name)}</a>`).join("")}</div>` : ""}
        <div class="row" style="margin-top:auto;padding-top:6px">${o.url ? `<a class="btn sm" href="${esc(o.url)}" target="_blank" rel="noopener">Website ${ICON.ext}</a>` : ""}${o.wikipedia ? `<a class="btn sm ghost" href="${esc(o.wikipedia)}" target="_blank" rel="noopener">Wikipedia</a>` : ""}</div>
      </article>`;
    }).join("") || `<div class="empty-state" style="grid-column:1/-1">No organisations match.</div>`;
    if (window.ScrollTrigger) requestAnimationFrame(() => window.ScrollTrigger.refresh());
  }
  $("#oq", el).oninput = (e) => { S.q = e.target.value; paint(); };
  $$("[data-g]", el).forEach((b) => (b.onclick = () => { S.g = b.dataset.g; $$("[data-g]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); }));
  el.addEventListener("click", (e) => { const a = e.target.closest("[data-org]"); if (a) { e.preventDefault(); focusOrg(a.dataset.org); } });
  function focusOrg(id) { S.c = ""; S.g = "all"; paint(); const c = document.getElementById(`org-${id}`); if (c) { c.scrollIntoView({ block: "center", behavior: "smooth" }); c.style.borderColor = "var(--accent)"; } }
  paint();
  const pick = query.get("o");
  if (pick) setTimeout(() => focusOrg(pick), 200);
  el._onParams = (p, q) => { const o = q.get("o"); if (o) focusOrg(o); };
  return () => stopGlobe();
}
