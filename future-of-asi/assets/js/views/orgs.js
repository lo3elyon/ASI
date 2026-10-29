/* Organisations (Round 3): an atlas. Globe with arcs between organisations that share people, region filter and tour,
   a detail sheet with logo, people, focus and links, a founding timeline, a comparison table, filters and search. */
import { $, $$, esc, load, arr, researchers, orgIndex, findOrgId, logoHtml, ICON, slug, RM, toast } from "../util.js";
import { hero, banner, headH, sources, run, m3init, m3auto, pic, photoMap, face, debounce } from "../pages3/kit.js";
import { scrollToEl } from "../pages3/kit.js";

const CENTRE = { USA: [39, -98], "United States": [39, -98], UK: [53.5, -2], "United Kingdom": [53.5, -2], Canada: [56, -96], Netherlands: [52.1, 5.3], India: [22, 78.9], France: [46.4, 2.2], Germany: [51.1, 10.4], China: [35, 104], Singapore: [1.35, 103.8], Japan: [36, 138], Australia: [-25, 134], Switzerland: [46.8, 8.2], Israel: [31.5, 34.9], "South Korea": [36.3, 127.8], Belgium: [50.8, 4.4], Sweden: [62, 15], Finland: [64, 26], Norway: [61, 9], Denmark: [56, 10], Spain: [40, -3.7], Italy: [42.8, 12.5], Brazil: [-10, -52], Kenya: [0.2, 37.9], Nigeria: [9, 8.7], "South Africa": [-29, 24], UAE: [24, 54], Taiwan: [23.7, 121], Estonia: [58.6, 25], Ireland: [53.4, -8], Austria: [47.5, 14.5], Poland: [52, 19], Mexico: [23.6, -102.5], Argentina: [-38, -63], Chile: [-35, -71], "New Zealand": [-41, 174], Global: [10, -30], International: [10, -30] };
const GROUP = (t) => (/frontier|lab|company|industry/.test(t) ? "Labs" : /government/.test(t) ? "Government" : /evaluation/.test(t) ? "Evaluations" : /advocacy|movement/.test(t) ? "Advocacy" : /education|training|fellowship|career|community/.test(t) ? "Training and careers" : /funder|charity/.test(t) ? "Funders" : /academic|university/.test(t) ? "Universities" : "Research");
const GC = { Labs: "#3b82f6", Government: "#84cc16", Evaluations: "#ef4444", Advocacy: "#f59e0b", "Training and careers": "#14b8a6", Funders: "#eab308", Universities: "#0ea5e9", Research: "#22d3ee" };
const fmtLL = (ll) => ll ? `${Math.abs(ll[0]).toFixed(2)}° ${ll[0] >= 0 ? "N" : "S"}  ${Math.abs(ll[1]).toFixed(2)}° ${ll[1] >= 0 ? "E" : "W"}` : "";

const CNORM = { "United Kingdom": "UK", "United States": "USA", "United States of America": "USA", "US": "USA", "U.S.": "USA", "Great Britain": "UK" };
export async function render(el, params, query) {
  const [raw, ppl, idx, phm] = await Promise.all([load("orgs.json"), researchers(), orgIndex(), photoMap()]);
  const orgs = arr(raw, "orgs").map((o) => {
    const id = o.id || slug(o.name); const type = o.type || "research";
    const exact = Number.isFinite(parseFloat(o.lat)) && Number.isFinite(parseFloat(o.lng ?? o.lon)) && !(+o.lat === 0 && +(o.lng ?? o.lon) === 0);
    const ll = exact ? [+o.lat, +(o.lng ?? o.lon)] : (o.country && (CENTRE[o.country] || CENTRE[String(o.country).split(/[,/]/)[0].trim()])) || null;
    return { ...o, id, type, exact, g: GROUP(type), country: CNORM[o.country] || o.country || "Global", region: o.region || "Global", focus: [].concat(o.focus || []), what: o.what || o.summary || "", ll, founded: String(o.founded || "").slice(0, 4) };
  });
  const oById = Object.fromEntries(orgs.map((o) => [o.id, o]));
  const pById = Object.fromEntries(ppl.map((p) => [p.id, p]));
  // people at each organisation: the org's own list, people whose current org matches, and former orgs
  const members = Object.fromEntries(orgs.map((o) => [o.id, new Set((o.people || []).filter((id) => pById[id]))]));
  const formerAt = Object.fromEntries(orgs.map((o) => [o.id, new Set()]));
  ppl.forEach((p) => { const c = findOrgId(p.org); if (c && members[c]) members[c].add(p.id); p.former_orgs.forEach((f) => { const fid = findOrgId(f); if (fid && formerAt[fid] && !members[fid].has(p.id)) formerAt[fid].add(p.id); }); });
  const allAt = (id) => new Set([...members[id], ...formerAt[id]]);
  // links: organisations that share at least one person (now or before)
  const pairs = {};
  ppl.forEach((p) => { const os = orgs.filter((o) => allAt(o.id).has(p.id)).map((o) => o.id); for (let i = 0; i < os.length; i++) for (let j = i + 1; j < os.length; j++) { const k = [os[i], os[j]].sort().join("|"); (pairs[k] = pairs[k] || []).push(p.id); } });
  const links = Object.entries(pairs).map(([k, ps]) => { const [a, b] = k.split("|"); return { a: oById[a], b: oById[b], ps }; }).sort((x, y) => y.ps.length - x.ps.length);
  const related = (id) => links.filter((l) => l.a.id === id || l.b.id === id).map((l) => ({ o: l.a.id === id ? l.b : l.a, ps: l.ps }));
  const regions = [...new Set(orgs.map((o) => o.region))].sort();
  const groups = [...new Set(orgs.map((o) => o.g))];
  const countries = [...new Set(orgs.map((o) => o.country).filter((c) => !/^(Global|International)$/i.test(c)))];
  const linkedPeople = new Set(orgs.flatMap((o) => [...allAt(o.id)]));
  const logos = orgs.filter((o) => idx.man[o.id]).length;
  const focusCount = {}; orgs.forEach((o) => o.focus.forEach((f) => (focusCount[f.toLowerCase()] = (focusCount[f.toLowerCase()] || 0) + 1)));
  const focusTop = Object.entries(focusCount).sort((a, b) => b[1] - a[1]).slice(0, 36);
  const byCountry = Object.entries(orgs.reduce((a, o) => ((a[o.country] = (a[o.country] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const S = { q: "", g: "", region: "", focus: "", cmp: (query.get("cmp") || "").split(",").filter((x) => oById[x]).slice(0, 4), sel: "" };
  if (!S.cmp.length) S.cmp = ["anthropic", "redwood-research", "uk-aisi"].filter((x) => oById[x]);

  // globe pins: one per spot
  const spots = {};
  orgs.filter((o) => o.ll).forEach((o) => { const k = `${o.ll[0].toFixed(1)},${o.ll[1].toFixed(1)}`; (spots[k] = spots[k] || { k, lat: o.ll[0], lng: o.ll[1], list: [] }).list.push(o); });
  const pins = Object.values(spots).map((s) => ({ ...s, n: s.list.length, c: s.list.length > 3 ? "#38bdf8" : GC[s.list[0].g] }));
  const pinOf = (o) => pins.find((p) => p.list.includes(o));
  const arcs = links.filter((l) => l.a.ll && l.b.ll && pinOf(l.a) !== pinOf(l.b)).slice(0, 60).map((l) => ({ a: pinOf(l.a), b: pinOf(l.b), w: l.ps.length, c: l.ps.length >= 3 ? "#f59e0b" : "#38bdf8", l }));
  const founded = orgs.filter((o) => /^\d{4}$/.test(o.founded)).sort((a, b) => a.founded - b.founded);

  el.innerHTML = `${hero({ img: "p3-orgs-hero", alt: "The Earth at night from orbit with thin cyan arcs of light linking cities", cat: "sky",
    eyebrow: "Organisations", title: "Who is <span class='serif'>keeping watch.</span>",
    lead: `${orgs.length} labs, institutes, nonprofits, programs and funders in ${countries.length} countries, working on AI safety, alignment, control, evaluations and governance. Lines on the globe join groups that share people.`,
    stats: [{ n: orgs.length, label: "organisations" }, { n: countries.length, label: "countries" }, { n: linkedPeople.size, label: "people linked" }, { n: links.length, label: "shared people links" }],
    extra: `<svg class="p3-compass" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54"/><circle cx="60" cy="60" r="40"/><path d="M60 8 L66 60 L60 112 L54 60Z"/><path d="M8 60 L60 54 L112 60 L60 66Z" class="h"/><text x="60" y="22" text-anchor="middle">N</text></svg>` })}

  <section class="section tight"><div class="wrap">
    <div class="p3-atlas">
      <div class="p3-globe" id="globe" role="img" aria-label="Globe with ${pins.length} locations and ${arcs.length} links"><div class="gtip" id="gtip"></div><div class="p3-gcoord" id="gcoord" aria-hidden="true"></div></div>
      <div class="p3-gside">
        <div class="eyebrow">The atlas</div>
        <h2 data-p3="rise">${pins.length} places, <span class="serif">one shared worry.</span></h2>
        <p class="muted">Drag to turn. Tap a light to open it. Gold lines join organisations with three or more people in common.</p>
        <div class="chips" role="group" aria-label="Region"><button class="chip on" type="button" data-rg="">Everywhere</button>${regions.map((r) => `<button class="chip" type="button" data-rg="${esc(r)}">${esc(r)} <span class="count">${orgs.filter((o) => o.region === r).length}</span></button>`).join("")}</div>
        <div class="row p3-gctl"><button class="btn sm primary p3-rip" type="button" id="tour" aria-pressed="false">${ICON.play}<span>Tour the world</span></button><button class="chip on" type="button" id="arcsT" aria-pressed="true">Links on</button></div>
        <div class="card p3-gpick" id="gpick" aria-live="polite"><p class="muted" style="margin:0">Nothing picked yet. The biggest clusters are in ${esc(byCountry.slice(0, 3).map((x) => x[0]).join(", "))}.</p></div>
        <div class="p3-legend">${Object.entries(GC).filter(([g]) => groups.includes(g)).map(([g, c]) => `<span><i style="background:${c}"></i>${g}</span>`).join("")}</div>
      </div>
    </div>
  </div></section>

  ${banner({ img: "p3-orgs-network", alt: "A glowing sculpture of linked nodes hanging in a dark gallery", eyebrow: "Linked by people", title: "The field is <span class='serif'>smaller than it looks.</span>", text: "People move between labs, institutes and nonprofits. These are the strongest links in our data, counting where people work now and where they worked before.", cat: "sky" })}
  <section class="section tight"><div class="wrap"><div class="p3-links" data-m3-stagger="60">${links.slice(0, 12).map((l) => `<div class="card card-glow p3-link" data-m3="up"><div class="p3-link-ends"><button type="button" class="p3-oname" data-open="${esc(l.a.id)}">${logoHtml(l.a.id, l.a.name)}<span>${esc(l.a.name)}</span></button><span class="p3-link-line" aria-hidden="true"><i></i><b>${l.ps.length}</b></span><button type="button" class="p3-oname" data-open="${esc(l.b.id)}">${logoHtml(l.b.id, l.b.name)}<span>${esc(l.b.name)}</span></button></div><div class="p3-link-ppl">${l.ps.slice(0, 6).map((id) => `<button type="button" class="p3-pchip sm" data-person="${esc(id)}">${face(pById[id], phm, "p3-face xs")}<span>${esc(pById[id].name)}</span></button>`).join("")}${l.ps.length > 6 ? `<span class="count">and ${l.ps.length - 6} more</span>` : ""}</div></div>`).join("")}</div></div></section>

  <section class="section tight"><div class="wrap">
    ${headH("Founding years", "When each one <span class='serif'>appeared.</span>", `${founded.length} organisations list a founding year. Most are very young.`)}
    <div class="card p3-found" id="found" data-m3="up"></div>
  </div></section>

  <section class="section tight"><div class="wrap p3-two">
    <div>${headH("Focus", "What they <span class='serif'>work on.</span>", "Tap a focus area to filter the directory.")}
      <div class="p3-cloud" data-m3-stagger="25">${focusTop.map(([f, n]) => `<button type="button" class="p3-fw" data-focus="${esc(f)}" data-m3="scale" style="--s:${(0.85 + Math.min(1.3, n / 6)).toFixed(2)}">${esc(f)} <span>${n}</span></button>`).join("")}</div></div>
    <div>${headH("Where", "By <span class='serif'>country.</span>")}
      <div class="p3-cbars">${byCountry.slice(0, 12).map(([c, n]) => `<div class="p3-cb"><span>${esc(c)}</span><i data-p3-bar="${n / byCountry[0][1]}"></i><b>${n}</b></div>`).join("")}</div></div>
  </div></section>

  <section class="section tight" id="odir"><div class="wrap">
    ${headH("Directory", "Every <span class='serif'>organisation.</span>", "Tick up to four to compare them.")}
    <div class="toolbar p3-obar"><input class="input search" id="oq" type="search" placeholder="Search organisations, focus areas, people, cities" aria-label="Search organisations"><select class="input" id="or" aria-label="Region"><option value="">Every region</option>${regions.map((r) => `<option>${esc(r)}</option>`).join("")}</select><span class="count" id="oc" aria-live="polite"></span></div>
    <div class="chips p3-ochips" role="group" aria-label="Kind"><button class="chip on" type="button" data-g="">All kinds</button>${groups.map((g) => `<button class="chip" type="button" data-g="${esc(g)}" style="--c:${GC[g]}"><i class="dot-cat" style="background:${GC[g]}"></i>${esc(g)}</button>`).join("")}<span id="focusChip"></span></div>
    <div class="p3-ogrid" id="og"></div>
  </div></section>

  ${banner({ img: "p3-orgs-compare", alt: "A long library table at night with reports laid out side by side under brass lamps", eyebrow: "Compare", title: "Side by side, <span class='serif'>on one table.</span>", text: "Pick organisations in the directory, or change them here.", cat: "sky", id: "ocmp", align: "right" })}
  <section class="section tight"><div class="wrap">
    <div class="row p3-cmpadd"><label class="sr-only" for="cadd">Add an organisation to compare</label><select class="input" id="cadd"><option value="">Add an organisation</option>${orgs.slice().sort((a, b) => a.name.localeCompare(b.name)).map((o) => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join("")}</select><button class="btn sm ghost" type="button" id="cclr">Clear</button><button class="btn sm" type="button" id="cshare">Copy link</button></div>
    <div class="p3-tablewrap" id="ctable"></div>
  </div></section>

  <aside class="p3-sheet" id="sheet" aria-label="Organisation details" hidden><div class="p3-sheet-scrim" data-sclose></div><div class="p3-sheet-pane" role="dialog" aria-modal="false" aria-labelledby="shName" data-lenis-prevent tabindex="-1"></div></aside>

  ${sources(orgs.filter((o) => o.url).map((o) => ({ t: o.name, by: o.country, url: o.url })), "Official sites")}`;

  const offs = [];
  const tip = $("#gtip", el);
  let G = null, tourT = 0, touring = false;
  const pickHtml = (p) => `<div class="eyebrow">${esc(p.list[0].city ? `${p.list[0].city}, ` : "")}${esc(p.list[0].country)}</div><div class="p3-gcoords">${p.list.some((o) => o.exact) ? fmtLL([p.lat, p.lng]) : "Country centre, approximate"}</div><div class="p3-gplist">${p.list.map((o) => `<button type="button" class="p3-oname" data-open="${esc(o.id)}">${logoHtml(o.id, o.name)}<span><b>${esc(o.name)}</b><small>${esc(o.type)}</small></span></button>`).join("")}</div>`;
  const pick = (p, fromTour) => { $("#gpick", el).innerHTML = pickHtml(p); if (G) { G.select(p); G.focus(p.lat, p.lng); } if (!fromTour && touring) tour(false); };
  import("../pages3/globe3.js").then((g) => g.mountGlobe3($("#globe", el), pins, arcs, {
    onHover(p, x, y) { if (!p) { tip.style.display = "none"; return; } tip.style.display = "block"; tip.style.left = x + "px"; tip.style.top = y + "px"; tip.innerHTML = `<div class="row" style="gap:6px;flex-wrap:nowrap">${p.list.slice(0, 4).map((o) => logoHtml(o.id, o.name, "ologo sm")).join("")}<b>${esc(p.list.length === 1 ? p.list[0].name : `${p.list.length} organisations`)}</b></div>`; $("#gcoord", el).textContent = fmtLL([p.lat, p.lng]); },
    onPick: (p) => pick(p),
  })).then((api) => { if (!api) return; G = api; if (!el.isConnected) { api.stop(); return; } offs.push(() => api.stop()); applyRegion(); })
    .catch((e) => { console.warn("globe", e); $("#globe", el).innerHTML = `<div class="fallback">The globe could not start here. Everything is in the directory below.</div>`; });
  const tourList = pins.slice().sort((a, b) => b.n - a.n);
  let tourI = 0;
  function tour(on) {
    touring = on; const b = $("#tour", el); b.setAttribute("aria-pressed", on); $("span", b).textContent = on ? "Stop the tour" : "Tour the world"; b.classList.toggle("on", on); clearTimeout(tourT);
    if (!on) return;
    const step = () => { if (!touring || !el.isConnected) return; const vis = tourList.filter((p) => !S.region || p.list.some((o) => o.region === S.region)); if (!vis.length) return tour(false); const p = vis[tourI++ % vis.length]; pick(p, true); tourT = setTimeout(step, RM() ? 6000 : 4500); };
    step();
  }
  $("#tour", el).onclick = () => tour(!touring);
  offs.push(() => clearTimeout(tourT));
  $("#arcsT", el).onclick = (e) => { const on = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", on); e.currentTarget.classList.toggle("on", on); e.currentTarget.textContent = on ? "Links on" : "Links off"; if (G) G.setArcs(on); };
  const applyRegion = () => { if (G) G.setFilter((p) => !S.region || p.list.some((o) => o.region === S.region)); };
  $$("[data-rg]", el).forEach((b) => b.addEventListener("click", () => { S.region = b.dataset.rg; $$("[data-rg]", el).forEach((x) => x.classList.toggle("on", x === b)); $("#or", el).value = S.region; applyRegion(); paint(); const first = tourList.find((p) => !S.region || p.list.some((o) => o.region === S.region)); if (first && G && S.region) G.focus(first.lat, first.lng); }));

  /* Founding timeline */
  (() => {
    const ys = founded.map((o) => +o.founded); if (!ys.length) return;
    const a = Math.min(...ys), b = Math.max(...ys), w = 1000, h = 260; const X = (y) => 40 + ((y - a) / Math.max(1, b - a)) * (w - 80);
    const stack = {}; let dots = "";
    founded.forEach((o, i) => { const y = +o.founded; const k = (stack[y] = (stack[y] || 0) + 1); dots += `<g class="p3-fd" style="--i:${i}" data-open="${esc(o.id)}" tabindex="0" role="button" aria-label="${esc(o.name)}, founded ${y}"><circle cx="${X(y).toFixed(1)}" cy="${h - 40 - k * 15}" r="6" fill="${GC[o.g]}"/><title>${esc(o.name)}, ${y}</title></g>`; });
    const ticks = []; for (let y = Math.ceil(a / 5) * 5; y <= b; y += 5) ticks.push(y);
    $("#found", el).innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Founding years from ${a} to ${b}"><path data-p3-draw class="p3-faxis" d="M40,${h - 30} H${w - 40}"/>${ticks.map((y) => `<g><line x1="${X(y)}" x2="${X(y)}" y1="${h - 34}" y2="${h - 24}"/><text x="${X(y)}" y="${h - 8}" text-anchor="middle">${y}</text></g>`).join("")}${dots}</svg><p class="muted p3-fnote" id="fnote">Tap a dot to open that organisation.</p>`;
    $("#found", el).addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-open]")) { e.preventDefault(); openSheet(e.target.closest("[data-open]").dataset.open); } });
  })();

  /* Directory */
  const fq = debounce(() => paint(), 120);
  $("#oq", el).addEventListener("input", (e) => { S.q = e.target.value; fq(); });
  $("#or", el).addEventListener("change", (e) => { S.region = e.target.value; $$("[data-rg]", el).forEach((x) => x.classList.toggle("on", x.dataset.rg === S.region)); applyRegion(); paint(); });
  $$("[data-g]", el).forEach((b) => b.addEventListener("click", () => { S.g = b.dataset.g; $$("[data-g]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); }));
  el.addEventListener("click", (e) => { const f = e.target.closest("[data-focus]"); if (f) { S.focus = f.dataset.focus; S.q = ""; S.g = ""; $("#oq", el).value = ""; $$("[data-g]", el).forEach((x) => x.classList.toggle("on", !x.dataset.g)); if (S.region) { S.region = ""; $("#or", el).value = ""; $$("[data-rg]", el).forEach((x) => x.classList.toggle("on", !x.dataset.rg)); applyRegion(); } paint(); scrollToEl($("#odir", el), { block: "start" }); } });
  function paint() {
    const q = S.q.toLowerCase().trim();
    const list = orgs.filter((o) => (!S.g || o.g === S.g) && (!S.region || o.region === S.region) && (!S.focus || o.focus.some((f) => f.toLowerCase() === S.focus))
      && (!q || `${o.name} ${o.what} ${o.focus.join(" ")} ${o.type} ${o.country} ${o.city || ""} ${[...allAt(o.id)].map((id) => pById[id].name).join(" ")}`.toLowerCase().includes(q)));
    $("#oc", el).textContent = `${list.length} of ${orgs.length}`;
    $("#focusChip", el).innerHTML = S.focus ? `<button class="chip on" type="button" id="fclr">${esc(S.focus)} ${ICON.close.replace('width="18" height="18"', 'width="12" height="12"')}</button>` : "";
    if (S.focus) $("#fclr", el).onclick = () => { S.focus = ""; paint(); };
    $("#og", el).innerHTML = list.map((o) => { const m = [...members[o.id]]; return `<article class="p3-oc card-glow m3-spot" id="org-${esc(o.id)}" style="--c:${GC[o.g]}" data-m3="up">
      <div class="p3-oc-h">${logoHtml(o.id, o.name, "ologo lg")}<div><b>${esc(o.name)}</b><small>${esc(o.type)}${o.founded ? ` · since ${esc(o.founded)}` : ""}</small></div></div>
      <div class="p3-oc-ll">${esc(o.city ? `${o.city}, ${o.country}` : o.country)}${o.exact ? ` · ${fmtLL(o.ll)}` : ""}</div>
      <p>${esc(o.what)}</p>
      ${o.focus.length ? `<div class="chips">${o.focus.slice(0, 4).map((f) => `<span class="tag" style="--c:${GC[o.g]}">${esc(f)}</span>`).join("")}</div>` : ""}
      ${m.length ? `<div class="p3-faces" aria-label="${m.length} people">${m.slice(0, 6).map((id) => face(pById[id], phm, "p3-face sm")).join("")}${m.length > 6 ? `<span class="more">+${m.length - 6}</span>` : ""}</div>` : ""}
      <div class="p3-oc-f"><button class="btn sm p3-rip" type="button" data-open="${esc(o.id)}">Details ${ICON.arrow}</button><label class="p3-cmpck"><input type="checkbox" data-cmp="${esc(o.id)}" ${S.cmp.includes(o.id) ? "checked" : ""}> Compare</label></div></article>`; }).join("") || `<div class="empty-state" style="grid-column:1/-1">No organisations match.</div>`;
    m3auto($("#og", el));
  }
  $("#og", el).addEventListener("change", (e) => { const c = e.target.closest("[data-cmp]"); if (!c) return; const id = c.dataset.cmp; if (c.checked) { if (S.cmp.length >= 4) { c.checked = false; toast("Compare up to four at a time."); return; } S.cmp.push(id); } else S.cmp = S.cmp.filter((x) => x !== id); table(); });

  /* Comparison table */
  function table() {
    const L = S.cmp.map((id) => oById[id]).filter(Boolean);
    $$("[data-cmp]", el).forEach((c) => (c.checked = S.cmp.includes(c.dataset.cmp)));
    if (!L.length) { $("#ctable", el).innerHTML = `<div class="empty-state">Pick organisations to compare.</div>`; return; }
    const row = (lab, f) => `<tr><th scope="row">${lab}</th>${L.map((o) => `<td>${f(o)}</td>`).join("")}</tr>`;
    $("#ctable", el).innerHTML = `<table class="p3-ctab"><thead><tr><th scope="col"><span class="sr-only">Field</span></th>${L.map((o) => `<th scope="col"><div class="p3-cth">${logoHtml(o.id, o.name, "ologo lg")}<b>${esc(o.name)}</b><button type="button" class="icon-btn sm" data-crm="${esc(o.id)}" aria-label="Remove ${esc(o.name)}">${ICON.close}</button></div></th>`).join("")}</tr></thead><tbody>
      ${row("Kind", (o) => `<span class="tag" style="--c:${GC[o.g]}">${esc(o.g)}</span><br><small class="muted">${esc(o.type)}</small>`)}
      ${row("Where", (o) => `${esc(o.city ? `${o.city}, ` : "")}${esc(o.country)}<br><small class="muted">${esc(o.region)}</small>`)}
      ${row("Founded", (o) => esc(o.founded || "Not listed"))}
      ${row("What they do", (o) => `<small>${esc(o.what)}</small>`)}
      ${row("Focus", (o) => o.focus.map((f) => `<span class="tag" style="--c:${GC[o.g]}">${esc(f)}</span>`).join(" ") || "Not listed")}
      ${row("People in our data", (o) => { const m = [...allAt(o.id)]; return `<b class="p3-cnum">${m.length}</b><div class="p3-faces">${m.slice(0, 5).map((id) => `<button type="button" class="p3-fbtn" data-person="${esc(id)}" aria-label="${esc(pById[id].name)}">${face(pById[id], phm, "p3-face sm")}</button>`).join("")}</div>`; })}
      ${row("Shares people with", (o) => related(o.id).slice(0, 4).map((r) => `<button type="button" class="chip" data-open="${esc(r.o.id)}">${esc(r.o.name)} <span class="count">${r.ps.length}</span></button>`).join(" ") || "None in our data")}
      ${row("Links", (o) => `${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">Website ${ICON.ext}</a>` : ""}${o.wikipedia ? `<br><a href="${esc(o.wikipedia)}" target="_blank" rel="noopener">Wikipedia ${ICON.ext}</a>` : ""}`)}
    </tbody></table>`;
  }
  $("#ctable", el).addEventListener("click", (e) => { const r = e.target.closest("[data-crm]"); if (r) { S.cmp = S.cmp.filter((x) => x !== r.dataset.crm); table(); } });
  $("#cadd", el).addEventListener("change", (e) => { const v = e.target.value; e.target.value = ""; if (!v || S.cmp.includes(v)) return; if (S.cmp.length >= 4) { toast("Compare up to four at a time."); return; } S.cmp.push(v); table(); });
  $("#cclr", el).onclick = () => { S.cmp = []; table(); };
  $("#cshare", el).onclick = () => { const u = `${location.origin}${location.pathname}#/orgs?cmp=${S.cmp.join(",")}`; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast("Link copied."), () => toast(u)); };

  /* Detail sheet */
  const sheet = $("#sheet", el), pane = $(".p3-sheet-pane", sheet);
  let lastFocus = null;
  function openSheet(id) {
    const o = oById[id]; if (!o) return;
    S.sel = id; lastFocus = document.activeElement;
    const m = [...members[id]], f = [...formerAt[id]], rel = related(id).slice(0, 8);
    pane.innerHTML = `<div class="p3-sh-img">${pic("p3-orgs-building", "A modern research building at dusk with warm lights inside", { sizes: "480px" })}<button class="icon-btn p3-sh-x" type="button" data-sclose aria-label="Close details">${ICON.close}</button><div class="p3-sh-logo">${logoHtml(o.id, o.name, "ologo xl")}</div></div>
      <div class="p3-sh-body">
        <div class="eyebrow">${esc(o.g)} · ${esc(o.region)}</div><h2 id="shName">${esc(o.name)}</h2>
        <div class="p3-oc-ll">${esc(o.city ? `${o.city}, ${o.country}` : o.country)}${o.exact ? ` · ${fmtLL(o.ll)}` : ""}${o.founded ? ` · founded ${esc(o.founded)}` : ""}</div>
        <p class="p3-sh-what">${esc(o.what)}</p>
        ${o.focus.length ? `<h4>Focus areas</h4><div class="chips">${o.focus.map((x) => `<button type="button" class="tag" style="--c:${GC[o.g]}" data-focus="${esc(x.toLowerCase())}" data-sclose>${esc(x)}</button>`).join("")}</div>` : ""}
        <h4>People here${m.length ? ` <span class="count">${m.length}</span>` : ""}</h4>${m.length ? `<div class="p3-shp">${m.map((pid) => `<button type="button" class="p3-pchip" data-person="${esc(pid)}">${face(pById[pid], phm, "p3-face sm")}<span>${esc(pById[pid].name)}<small>${esc(pById[pid].role || "")}</small></span></button>`).join("")}</div>` : `<p class="muted">No profiled researchers list this as their current home yet.</p>`}
        ${f.length ? `<h4>Worked here before <span class="count">${f.length}</span></h4><div class="p3-shp">${f.map((pid) => `<button type="button" class="p3-pchip" data-person="${esc(pid)}">${face(pById[pid], phm, "p3-face sm")}<span>${esc(pById[pid].name)}<small>${esc(pById[pid].org || "")}</small></span></button>`).join("")}</div>` : ""}
        ${rel.length ? `<h4>Shares people with</h4><div class="chips">${rel.map((r) => `<button type="button" class="chip" data-open="${esc(r.o.id)}">${logoHtml(r.o.id, r.o.name, "ologo sm")}${esc(r.o.name)} <span class="count">${r.ps.length}</span></button>`).join("")}</div>` : ""}
        <div class="row p3-sh-links">${o.url ? `<a class="btn sm primary" href="${esc(o.url)}" target="_blank" rel="noopener">Website ${ICON.ext}</a>` : ""}${o.wikipedia ? `<a class="btn sm" href="${esc(o.wikipedia)}" target="_blank" rel="noopener">Wikipedia ${ICON.ext}</a>` : ""}<button class="btn sm ghost" type="button" data-addcmp="${esc(o.id)}">${S.cmp.includes(o.id) ? "In comparison" : "Add to compare"}</button>${o.ll ? `<button class="btn sm ghost" type="button" data-onglobe="${esc(o.id)}">Show on globe</button>` : ""}</div>
        ${o.logo_credit ? `<p class="muted p3-credit">Logo: ${esc(o.logo_credit)}</p>` : ""}
      </div>`;
    sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add("on"));
    run(pane); pane.focus({ preventScroll: true });
    history.replaceState(history.state, "", `${location.pathname}${location.search}#/orgs?o=${encodeURIComponent(id)}`);
  }
  function closeSheet() { if (sheet.hidden) return; sheet.classList.remove("on"); setTimeout(() => (sheet.hidden = true), RM() ? 0 : 320); S.sel = ""; if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); history.replaceState(history.state, "", `${location.pathname}${location.search}#/orgs`); }
  el.addEventListener("click", (e) => {
    const c = e.target.closest("[data-sclose]"); const o = e.target.closest("[data-open]");
    if (o) { e.preventDefault(); openSheet(o.dataset.open); return; }
    if (c) { closeSheet(); }
    const a = e.target.closest("[data-addcmp]"); if (a) { const id = a.dataset.addcmp; if (!S.cmp.includes(id)) { if (S.cmp.length >= 4) { toast("Compare up to four at a time."); return; } S.cmp.push(id); table(); } a.textContent = "In comparison"; }
    const g = e.target.closest("[data-onglobe]"); if (g) { const p = pinOf(oById[g.dataset.onglobe]); closeSheet(); if (p) { pick(p); scrollToEl($("#globe", el), { block: "center" }); } }
  });
  const onKey = (e) => { if (e.key === "Escape" && !sheet.hidden && !document.documentElement.classList.contains("ov-open")) closeSheet(); };
  document.addEventListener("keydown", onKey); offs.push(() => document.removeEventListener("keydown", onKey));

  paint(); table();
  const op = query.get("o"); if (op) setTimeout(() => openSheet(op), 250);
  el._onParams = (p, q) => { const o = q.get("o"); if (o && o !== S.sel) openSheet(o); else if (!o && S.sel) closeSheet(); };
  offs.push(run(el), m3init(el));
  return () => offs.forEach((f) => { try { f(); } catch (e) {} });
}
