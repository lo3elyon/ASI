import { $, $$, esc, load, arr, researchers, pageHero, initials, ICON } from "../util.js";

// Approximate country centres in the map's equirectangular frame (lon, lat). Pins mark the country, not an office.
const CENTRE = { USA: [-98, 39], UK: [-2, 53.5], Canada: [-96, 56], Netherlands: [5.3, 52.1], India: [78.9, 22], France: [2.2, 46.4], Germany: [10.4, 51.1], China: [104, 35], Singapore: [103.8, 1.35], Japan: [138, 36], Australia: [134, -25], Switzerland: [8.2, 46.8], Israel: [34.9, 31.5], "South Korea": [127.8, 36.3] };
const TYPEC = (t) => (/lab|company/.test(t) ? "#3b82f6" : /government/.test(t) ? "#84cc16" : /evaluation/.test(t) ? "#ef4444" : /advocacy|movement/.test(t) ? "#f59e0b" : /education|training|fellowship|career/.test(t) ? "#14b8a6" : "#22d3ee");
const TYPEG = (t) => (/lab|company/.test(t) ? "Labs" : /government/.test(t) ? "Government" : /evaluation/.test(t) ? "Evaluations" : /advocacy|movement/.test(t) ? "Advocacy" : /education|training|fellowship|career/.test(t) ? "Training and careers" : /funder|charity/.test(t) ? "Funders and charities" : "Research");

export async function render(el, params, query) {
  const [raw, ppl] = await Promise.all([load("orgs.json"), researchers()]);
  const orgs = arr(raw, "orgs").map((o) => ({ ...o, id: o.id || o.name, type: o.type || "research", country: o.country || "", focus: [].concat(o.focus || []), what: o.what || o.summary || o.focus_text || "", g: TYPEG(o.type || "") }));
  const pById = Object.fromEntries(ppl.map((p) => [p.id, p]));
  const groups = [...new Set(orgs.map((o) => o.g))];
  const countries = {}; orgs.forEach((o) => { const k = o.country || "Global"; (countries[k] = countries[k] || []).push(o); });
  let state = { g: "all", c: "", q: "" };

  el.innerHTML = `${pageHero({ img: "cover-orgs", eyebrow: "Organisations", title: "Who is <span class='serif'>keeping watch.</span>", lead: `${orgs.length} labs, institutes, nonprofits, programs and funders working on AI safety, alignment, control, evaluations and governance. Click a country on the map to filter.` })}
  <section class="section tight"><div class="wrap">
    <div class="map" id="map"><img class="base" src="assets/img/world-dots.svg" alt="" width="1440" height="560"><div class="pins" id="pins"></div><div class="tip" id="tip"></div></div>
    <div class="toolbar" style="margin-top:20px"><input class="input search" id="oq" type="search" placeholder="Search organisations, focus areas, people" aria-label="Search organisations"><span class="count" id="oc"></span></div>
    <div class="chips" style="margin:-8px 0 22px"><button class="chip on" data-g="all" type="button">All</button>${groups.map((g) => `<button class="chip" data-g="${g}" type="button">${g}</button>`).join("")}<span id="cchip"></span></div>
    <div class="grid gauto" id="og"></div>
  </div></section>`;

  const W = 360, H = 140;
  const pos = (lon, lat) => [((lon + 180) / W) * 100, ((80 - lat) / H) * 100];
  $("#pins", el).innerHTML = Object.entries(countries).filter(([c]) => CENTRE[c]).map(([c, list]) => {
    const ll = CENTRE[c] || [-30, -40]; const [x, y] = pos(ll[0], ll[1]); const n = list.length; const size = 14 + Math.sqrt(n) * 7;
    return `<button class="pin" type="button" data-c="${esc(c)}" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;margin:-${size / 2}px 0 0 -${size / 2}px;--c:${n > 10 ? "#22d3ee" : n > 3 ? "#14b8a6" : "#f59e0b"};display:grid;place-items:center;font:600 11px var(--f-mono);color:#04202a" aria-label="${esc(c)}: ${n} organisations">${n}</button>`;
  }).join("");
  const tip = $("#tip", el);
  $$(".pin", el).forEach((p) => {
    p.addEventListener("pointerenter", () => { const l = countries[p.dataset.c]; tip.innerHTML = `<b>${esc(p.dataset.c)}</b>${l.slice(0, 6).map((o) => esc(o.name)).join(", ")}${l.length > 6 ? ` and ${l.length - 6} more` : ""}`; tip.style.left = p.style.left; tip.style.top = p.style.top; tip.style.display = "block"; });
    p.addEventListener("pointerleave", () => (tip.style.display = "none"));
    p.addEventListener("click", () => { state.c = state.c === p.dataset.c ? "" : p.dataset.c; paint(); $("#og", el).scrollIntoView({ behavior: "smooth", block: "start" }); });
  });

  function paint() {
    const q = state.q.toLowerCase();
    const list = orgs.filter((o) => (state.g === "all" || o.g === state.g) && (!state.c || (o.country || "Global") === state.c) && `${o.name} ${o.what} ${o.focus.join(" ")} ${o.type} ${(o.people || []).map((id) => pById[id]?.name || "").join(" ")}`.toLowerCase().includes(q));
    $("#oc", el).textContent = `${list.length} of ${orgs.length}`;
    $("#cchip", el).innerHTML = state.c ? `<button class="chip on" type="button" id="cc">${esc(state.c)} ${ICON.close.replace('viewBox', 'width="12" height="12" viewBox')}</button>` : "";
    if (state.c) $("#cc", el).onclick = () => { state.c = ""; paint(); };
    $("#og", el).innerHTML = list.map((o) => {
      const c = TYPEC(o.type); const people = (o.people || []).map((id) => pById[id]).filter(Boolean);
      return `<article class="card hov spot orgcard" id="org-${esc(o.id)}" style="--c:${c};display:flex;flex-direction:column;gap:10px">
        <div class="hd"><span class="logo" ${o.logo ? 'style="background:#eef4f9"' : ""}>${o.logo ? `<img src="${esc(o.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:30px;height:30px;object-fit:contain;filter:${/svg/i.test(o.logo) ? "none" : "none"}" onerror="this.replaceWith(document.createTextNode('${esc(initials(o.name))}'))">` : esc(initials(o.name))}</span><div><b>${esc(o.name)}</b><span>${esc(o.type)}${o.country ? ` · ${esc(o.country)}` : ""}${o.founded ? ` · since ${esc(o.founded)}` : ""}</span></div></div>
        <p>${esc(o.what)}</p>
        ${o.focus.length ? `<div class="chips">${o.focus.slice(0, 5).map((f) => `<span class="tag" style="--c:${c}">${esc(f)}</span>`).join("")}</div>` : ""}
        ${people.length ? `<div class="chips">${people.slice(0, 6).map((p) => `<a class="chip" href="#/researchers/${p.id}">${esc(p.name)}</a>`).join("")}</div>` : ""}
        <div class="row" style="margin-top:auto;padding-top:6px">${o.url ? `<a class="btn sm" href="${esc(o.url)}" target="_blank" rel="noopener">Website ${ICON.ext}</a>` : ""}${o.wikipedia ? `<a class="btn sm ghost" href="${esc(o.wikipedia)}" target="_blank" rel="noopener">Wikipedia</a>` : ""}</div>
      </article>`;
    }).join("") || `<div class="empty-state" style="grid-column:1/-1">No organisations match.</div>`;
  }
  $("#oq", el).oninput = (e) => { state.q = e.target.value; paint(); };
  $$("[data-g]", el).forEach((b) => b.onclick = () => { state.g = b.dataset.g; $$("[data-g]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); });
  paint();
  const pick = query.get("o");
  if (pick) setTimeout(() => { const c = document.getElementById(`org-${pick}`); if (c) { c.scrollIntoView({ block: "center" }); c.style.borderColor = "var(--accent)"; } }, 100);
}
