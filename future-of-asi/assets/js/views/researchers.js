import { $, $$, esc, researchers, videos, pageHero, GROUPS, initials, ytThumb, fmtDur, ICON, avatar, store } from "../util.js";

export async function render(el, params) {
  const [ppl, vids] = await Promise.all([researchers(), videos()]);
  const vById = Object.fromEntries(vids.map((v) => [v.id, v]));
  const groups = Object.keys(GROUPS).filter((g) => ppl.some((p) => p.group === g));
  const state = { q: "", g: "all", sort: "featured" };
  const withPd = ppl.filter((p) => p.pd != null);

  el.innerHTML = `${pageHero({ img: "cover-voices", eyebrow: "Researchers", title: "The people <span class='serif'>at the threshold.</span>", lead: `${ppl.length} pioneers, lab leaders, alignment and control researchers, forecasters, critics and optimists. Their own words, their risk estimates and their timelines, each with a source.` })}
  <section class="section tight"><div class="wrap">
    <div class="card" style="margin-bottom:28px">
      <div class="sec-head" style="margin-bottom:6px"><div><div class="eyebrow">p(doom) spectrum</div><h3 style="margin:6px 0 0">How worried are they?</h3><p class="muted" style="margin:6px 0 0;font-size:14px">${withPd.length} people have given a number or range. Midpoints are plotted on a log scale so very small and very large numbers both fit. Click a dot to open the person.</p></div></div>
      <div class="spectrum" id="spec"></div>
    </div>
    <div class="toolbar" role="search">
      <label class="sr-only" for="rq">Search researchers</label>
      <input class="input search" id="rq" type="search" placeholder="Search by name, lab, idea or quote">
      <label class="sr-only" for="rs">Sort</label>
      <select class="input" id="rs"><option value="featured">Featured order</option><option value="pdoom">Highest p(doom) first</option><option value="pdoomlow">Lowest p(doom) first</option><option value="name">Name A to Z</option><option value="quotes">Most quotes</option></select>
      <span class="count" id="rc"></span>
    </div>
    <div class="chips" style="margin:-8px 0 22px" role="group" aria-label="Filter by group">
      <button class="chip on" type="button" data-g="all" aria-pressed="true">Everyone</button>
      ${groups.map((g) => `<button class="chip" type="button" data-g="${g}" aria-pressed="false" style="--accent:${GROUPS[g].c}">${GROUPS[g].label}</button>`).join("")}
    </div>
    <div class="people" id="grid"></div>
  </div></section>
  <div class="sheet" id="sheet" aria-hidden="true"><div class="scrim" data-close></div><div class="pane" role="dialog" aria-modal="true" aria-labelledby="pname"></div></div>`;

  spectrum($("#spec", el), withPd);

  function list() {
    const q = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    let r = ppl.filter((p) => (state.g === "all" || p.group === state.g) && q.every((w) => `${p.name} ${p.org} ${p.role} ${p.warning} ${p.bio} ${p.quotes.map((x) => x.text).join(" ")}`.toLowerCase().includes(w)));
    if (state.sort === "pdoom") r = r.slice().sort((a, b) => (b.pd ?? -1) - (a.pd ?? -1));
    if (state.sort === "pdoomlow") r = r.slice().sort((a, b) => (a.pd ?? 999) - (b.pd ?? 999));
    if (state.sort === "name") r = r.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === "quotes") r = r.slice().sort((a, b) => b.quotes.length - a.quotes.length);
    $("#rc", el).textContent = `${r.length} of ${ppl.length}`;
    $("#grid", el).innerHTML = r.length ? r.map(card).join("") : `<div class="empty-state" style="grid-column:1/-1">Nobody matches that. Try fewer words.</div>`;
  }
  function card(p) {
    const G = GROUPS[p.group] || { label: p.group, c: "#22d3ee" };
    return `<button class="card hov spot pcard" type="button" data-id="${p.id}" style="--c:${G.c}" aria-label="Open ${esc(p.name)}">
      <div class="ph">${p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<div class="ini" style="${p.photo ? "z-index:-1" : ""}">${esc(initials(p.name))}</div>
      <div class="badges">${p.pdoom ? `<span class="bd r">p(doom) ${esc(short(p.pdoom))}</span>` : ""}${p.agi_year ? `<span class="bd a">AGI ${esc(yearOf(p.agi_year))}</span>` : ""}<span class="bd">${esc(G.label)}</span></div></div>
      <div class="info"><b>${esc(p.name)}</b><span>${esc([p.role, p.org].filter(Boolean).join(", "))}</span>${p.warning ? `<p>${esc(p.warning)}</p>` : ""}</div></button>`;
  }
  $("#rq", el).addEventListener("input", (e) => { state.q = e.target.value; list(); });
  $("#rs", el).addEventListener("change", (e) => { state.sort = e.target.value; list(); });
  $$("[data-g]", el).forEach((b) => b.addEventListener("click", () => { state.g = b.dataset.g; $$("[data-g]", el).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); }); list(); }));
  el.addEventListener("click", (e) => { const c = e.target.closest("[data-id]"); if (c && !c.closest(".sheet")) location.hash = `#/researchers/${c.dataset.id}`; });
  list();

  const sheet = $("#sheet", el), pane = $(".pane", sheet);
  let lastFocus = null;
  function open(id) {
    const p = ppl.find((x) => x.id === id);
    if (!p) { close(true); return; }
    lastFocus = document.activeElement;
    const G = GROUPS[p.group] || { label: p.group, c: "#22d3ee" };
    const vs = [...new Set([...(p.video_ids || []), ...vids.filter((v) => v.people.includes(p.id)).map((v) => v.id)])].map((v) => vById[v]).filter(Boolean).slice(0, 12);
    pane.innerHTML = `<button class="icon-btn close" type="button" data-close aria-label="Close">${ICON.close}</button>
      <div class="ptop"><div class="bigph">${p.photo ? `<img src="${esc(p.photo)}" alt="Portrait of ${esc(p.name)}" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ini',textContent:'${esc(initials(p.name))}'}))">` : `<div class="pcard"><div class="ph"><div class="ini">${esc(initials(p.name))}</div></div></div>`}</div>
        <div><span class="tag" style="--c:${G.c}">${esc(G.label)}</span><h2 id="pname" style="margin:10px 0 6px">${esc(p.name)}</h2><p class="muted" style="margin:0">${esc([p.role, p.org].filter(Boolean).join(", "))}</p></div></div>
      <div class="pbody">
        ${p.warning ? `<div class="warnbox"><div class="eyebrow">Their warning, in one line</div><p>${esc(p.warning)}</p></div>` : ""}
        <div class="kv" style="margin-top:14px">
          <div><small>p(doom)</small><b>${p.pdoom ? esc(p.pdoom) : "No number given"}</b>${p.pdoom_source ? `<br><a href="${esc(p.pdoom_source)}" target="_blank" rel="noopener" style="font-size:12.5px">source ${ICON.ext}</a>` : ""}</div>
          <div><small>Timeline</small><b>${p.agi_year ? esc(p.agi_year) : "No public year"}</b></div>
        </div>
        ${p.bio ? `<h3>Who they are</h3><p style="color:var(--text-2)">${esc(p.bio)}</p>` : ""}
        ${p.quotes.length ? `<h3>In their words</h3>${p.quotes.map((q) => `<figure class="quote"><blockquote>&ldquo;${esc(q.text)}&rdquo;</blockquote><cite>${esc(q.source || "")}${q.date ? `, ${esc(q.date)}` : ""} ${q.url ? `<a href="${esc(q.url)}" target="_blank" rel="noopener">source ${ICON.ext}</a>` : ""}</cite></figure>`).join("")}` : ""}
        ${vs.length ? `<h3>Watch them</h3><div class="vgrid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${vs.map((v) => `<a class="card hov vcard" href="#/watch/${v.id}" style="color:var(--text)"><div class="th"><img src="${ytThumb(v.id)}" alt="" loading="lazy" onload="this.classList.add('ld')">${v.duration ? `<span class="dur">${esc(fmtDur(v.duration))}</span>` : ""}</div><div class="meta"><b>${esc(v.title)}</b><span>${esc(v.channel)}</span></div></a>`).join("")}</div>` : ""}
        ${p.links.length ? `<h3>Read more</h3><div class="chips">${p.links.map((l) => `<a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || "Link")} ${ICON.ext}</a>`).join("")}</div>` : ""}
        ${p.photo_credit ? `<p class="muted" style="font-size:12px;margin-top:28px">Photo: ${p.photo_credit.replace(/<[^>]+>/g, "")}</p>` : ""}
      </div>`;
    sheet.classList.add("open"); sheet.setAttribute("aria-hidden", "false"); document.body.classList.add("no-scroll");
    pane.scrollTop = 0; $(".close", pane).focus();
    const seen = store.get("seenPeople", []); if (!seen.includes(id)) store.set("seenPeople", [...seen, id].slice(-200));
  }
  function close(silent) {
    sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); document.body.classList.remove("no-scroll");
    if (!silent && location.hash.split("/").length > 2) location.hash = "#/researchers";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  const onKey = (e) => {
    if (!sheet.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") { const f = $$("a,button", pane); if (!f.length) return; if (e.shiftKey && document.activeElement === f[0]) { f[f.length - 1].focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { f[0].focus(); e.preventDefault(); } }
  };
  document.addEventListener("keydown", onKey);
  el._onParams = (p) => (p[0] ? open(p[0]) : close(true));
  if (params[0]) open(params[0]);
  return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("no-scroll"); };
}

const short = (t) => { const s = String(t); const m = s.match(/[<>~]?\s*\d+(\.\d+)?\s*%(\s*(to|-)\s*\d+(\.\d+)?\s*%)?|1 in \d+/i); return m ? m[0].replace(/\s+/g, " ") : s.slice(0, 18); };
const yearOf = (t) => { const m = String(t).match(/20\d\d/); return m ? m[0] : String(t).slice(0, 10); };

function spectrum(host, list) {
  if (!list.length) { host.innerHTML = `<p class="muted">No numbers in the dataset yet.</p>`; return; }
  const W = 1000, PAD = 40;
  const lx = (v) => { const lv = Math.log10(Math.max(0.01, Math.min(99.9, v))); return PAD + ((lv + 2) / 4) * (W - PAD * 2); };
  const pts = list.map((p) => ({ p, x: lx(p.pd) })).sort((a, b) => a.x - b.x);
  const rows = [];
  pts.forEach((d) => { let r = 0; while (rows[r] != null && d.x - rows[r] < 34) r++; rows[r] = d.x; d.r = r; });
  const maxR = Math.max(...pts.map((d) => d.r));
  const H = 70 + (maxR + 1) * 36;
  const ticks = [0.01, 0.1, 1, 10, 50, 99];
  const col = (v) => (v < 5 ? "#84cc16" : v < 20 ? "#14b8a6" : v < 50 ? "#f59e0b" : "#ef4444");
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="p(doom) of ${list.length} people from lowest to highest">
    <defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#84cc16"/><stop offset=".45" stop-color="#14b8a6"/><stop offset=".7" stop-color="#f59e0b"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>
    <rect x="${PAD}" y="${H - 34}" width="${W - PAD * 2}" height="6" rx="3" fill="url(#sg)" opacity=".8"/>
    ${ticks.map((t, i) => `<text x="${lx(t)}" y="${H - 8}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="var(--muted)">${i ? "" : "\u2264 "}${t}%</text>`).join("")}
    ${pts.map((d) => { const y = H - 56 - d.r * 36; return `<a href="#/researchers/${d.p.id}" aria-label="${esc(d.p.name)}: ${esc(d.p.pdoom)}"><line x1="${d.x}" x2="${d.x}" y1="${y}" y2="${H - 34}" stroke="${col(d.p.pd)}" opacity=".35"/>
      <circle class="dot" cx="${d.x}" cy="${y}" r="15" fill="var(--surface-2)" stroke="${col(d.p.pd)}" stroke-width="2"/>
      <text x="${d.x}" y="${y + 4.5}" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="11" fill="var(--text)">${esc(initials(d.p.name))}</text>
      <title>${esc(d.p.name)}: ${esc(d.p.pdoom)}</title></a>`; }).join("")}
  </svg>`;
}
