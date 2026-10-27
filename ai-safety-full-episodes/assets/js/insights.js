/* AI Safety Full Episodes · charts (inline SVG, no libraries), contribution-style heatmaps, insights dashboard, claims tracker. */
(function (A) {
  "use strict";
  const { $, esc, STATE, fmtTime, fmtHM, hoursStr, dayKey, MONTHS, fold } = A;
  const h = () => A.hist;

  /* ---------------------------------------------------------------- contribution heatmap
   * Month-by-month blocks of 7 rows (Mon→Sun) × week columns. Intensity = value / max (5 levels). */
  function monthsBetween(a, b) { const out = []; let [y, m] = a.split("-").map(Number); const [y2, m2] = b.split("-").map(Number); while (y < y2 || (y === y2 && m <= m2)) { out.push(`${y}-${A.pad(m)}`); m++; if (m > 12) { m = 1; y++; } } return out; }
  function heatmap(o) {
    const months = o.months;
    const vals = {};
    let max = 0;
    months.forEach((mid) => {
      const [y, m] = mid.split("-").map(Number);
      const n = new Date(y, m, 0).getDate();
      for (let d = 1; d <= n; d++) { const k = `${mid}-${A.pad(d)}`; const v = o.value(k) || 0; vals[k] = v; if (v > max) max = v; }
    });
    const lvl = (v) => (v <= 0 ? 0 : max <= 0 ? 0 : Math.max(1, Math.ceil((4 * v) / max)));
    const blocks = months.map((mid) => {
      const [y, m] = mid.split("-").map(Number);
      const n = new Date(y, m, 0).getDate();
      const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday-first
      let cells = "";
      for (let i = 0; i < lead; i++) cells += `<span class="hm__c hm__c--pad" aria-hidden="true"></span>`;
      let total = 0, active = 0;
      for (let d = 1; d <= n; d++) {
        const k = `${mid}-${A.pad(d)}`; const v = vals[k]; total += v; if (v > 0) active++;
        const lab = `${MONTHS[m - 1]} ${d}: ${o.labelK ? o.labelK(k, v) : o.label(v)}`;
        const man = o.manual && o.manual(k);
        const future = o.futureAfter && k > o.futureAfter;
        cells += `<button class="hm__c l${lvl(v)} ${o.selected === k ? "is-sel" : ""} ${future ? "is-future" : ""} ${man ? "has-manual" : ""}" data-hmday="${k}" data-tip="${esc(lab)}" aria-label="${esc(lab)}" ${o.onDay ? "" : 'tabindex="-1"'}>${v > 0 ? `<span>${esc(o.cell ? o.cell(v) : v)}</span>` : ""}</button>`;
      }
      return `<div class="hm__m ${o.selectedMonth === mid ? "is-sel" : ""}">
        <button class="hm__mh" data-hmmonth="${mid}" aria-label="${MONTHS[m - 1]} ${y}: ${esc(o.total ? o.total(total) : total)}"><b>${new Date(y, m - 1, 1).toLocaleString("en", { month: "long" })}</b><small>${esc(o.total ? o.total(total) : total)} · ${active} day${active === 1 ? "" : "s"}</small></button>
        <div class="hm__g">${cells}</div></div>`;
    }).join("");
    return `<div class="hm ${o.cls || ""}" data-hm="${o.id || ""}">
      <div class="hm__wd" aria-hidden="true"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span>Sun</span></div>
      <div class="hm__ms">${blocks}</div>
      <div class="hm__leg"><span>${esc(o.legendNote || "")}</span><span class="grow"></span><span>Less</span>${[0, 1, 2, 3, 4].map((i) => `<i class="hm__c l${i}"></i>`).join("")}<span>More</span>${max ? `<span class="hm__max">max ${esc(o.label(max))}</span>` : ""}</div>
    </div>`;
  }
  function releaseHeatmap(o) {
    o = o || {};
    return heatmap({ id: "rel", months: ["2026-07", "2026-08", "2026-09", "2026-10"], value: (k) => STATE.days.get(k) || 0, label: (v) => `${v} episode${v === 1 ? "" : "s"} released`, total: (t) => `${t} eps`, selected: o.day, selectedMonth: o.month, onDay: true, legendNote: "Episodes released per day · click a day or month to filter", futureAfter: "2026-10-27" });
  }
  function watchHeatmap(o) {
    o = o || {};
    const nowM = dayKey(Date.now()).slice(0, 7);
    const end = nowM > "2026-10" ? nowM : "2026-10";
    const startM = monthsBetween("2026-07", end).slice(-6)[0];
    return heatmap({ id: "watch", cls: "hm--watch", months: monthsBetween(startM, end), value: (k) => Math.round((h().L.H.daily[k] || 0) / 60), label: (v) => `${v} min watched`, labelK: (k, v) => { const m = Math.round((h().L.H.manualDaily[k] || 0) / 60); return `${v} min` + (m ? ` (${v - m} played + ${m} marked as watched)` : " watched"); }, manual: (k) => (h().L.H.manualDaily[k] || 0) > 0, cell: (v) => (v >= 100 ? Math.round(v / 60) + "h" : v), total: (t) => (t >= 60 ? `${Math.round(t / 6) / 10} h` : `${t} min`), selected: o.day, onDay: true, legendNote: "Minutes per day: real playback, plus episodes you marked as watched (dotted) on the day you marked them" });
  }

  /* ---------------------------------------------------------------- tiny SVG charts */
  function bars(data, o) {
    o = o || {};
    if (!data.length) return `<p class="empty">No data yet.</p>`;
    const W = 640, H = o.h || 180, pad = 22, bw = (W - pad - 18) / data.length;
    const max = Math.max(1e-9, ...data.map((d) => d.v));
    const rects = data.map((d, i) => {
      const bh = Math.max(d.v > 0 ? 2 : 0, ((H - 34) * d.v) / max);
      const x = pad + i * bw + bw * 0.15, y = H - 20 - bh;
      return `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${bh.toFixed(1)}" rx="3" class="bar ${d.hl ? "bar--hl" : ""}"><title>${esc(d.label)}: ${esc(o.fmt ? o.fmt(d.v) : d.v)}</title></rect>${d.tick ? `<text x="${(x + bw * 0.35).toFixed(1)}" y="${H - 5}" class="ax" text-anchor="middle">${esc(d.tick)}</text>` : ""}</g>`;
    }).join("");
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "Bar chart")}"><line x1="${pad}" x2="${W}" y1="${H - 20}" y2="${H - 20}" class="axl"/><text x="2" y="12" class="ax">${esc(o.fmt ? o.fmt(max) : max)}</text>${rects}</svg>`;
  }
  function hbars(data, o) {
    o = o || {};
    if (!data.length) return `<p class="empty">${esc(o.empty || "Nothing watched yet.")}</p>`;
    const max = Math.max(o.floor || 1e-9, ...data.map((d) => d.v));
    return `<ul class="hbars">${data.map((d) => `<li>${d.icon || ""}<span class="hbars__l">${d.href ? `<a href="${esc(d.href)}">${esc(d.label)}</a>` : esc(d.label)}</span><span class="hbars__b"><i style="width:${((100 * d.v) / max).toFixed(1)}%;${d.color ? `background:${d.color}` : ""}"></i></span><span class="hbars__v">${esc(o.fmt ? o.fmt(d.v) : d.v)}</span></li>`).join("")}</ul>`;
  }
  function donut(frac, label, sub) {
    const r = 42, c = 2 * Math.PI * r;
    return `<svg class="donut" viewBox="0 0 110 110" role="img" aria-label="${esc(label)}"><circle cx="55" cy="55" r="${r}" class="donut__bg"/><circle cx="55" cy="55" r="${r}" class="donut__fg" stroke-dasharray="${(c * Math.min(1, frac)).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 55 55)"/><text x="55" y="55" text-anchor="middle" class="donut__v">${esc(label)}</text><text x="55" y="72" text-anchor="middle" class="donut__s">${esc(sub || "")}</text></svg>`;
  }

  /* ---------------------------------------------------------------- insights dashboard */
  const hfmt = (v) => (v * 3600 < 3600 ? Math.round(v * 60) + " min" : hoursStr(v * 3600));
  let range = "day";
  let claimKind = "all", claimQ = "";
  function render(view) {
    const H = h().L.H;
    const total = h().totalWatched();
    const done = h().doneCount();
    const started = STATE.all.filter((e) => h().stateOf(e.id) !== "none").length;
    const st = h().streaks();
    const sessions = []; Object.values(H.eps).forEach((r) => (r.sessions || []).forEach((s) => s.w > 30 && sessions.push(s.w)));
    const avgS = sessions.length ? sessions.reduce((a, b) => a + b, 0) / sessions.length : 0;

    // per day / per week
    let series = [];
    if (range === "day") {
      for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d); series.push({ label: k, v: (H.daily[k] || 0) / 3600, tick: i % 5 === 0 ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : "", hl: i === 0 }); }
    } else {
      for (let i = 11; i >= 0; i--) {
        const end = new Date(); end.setDate(end.getDate() - i * 7);
        let v = 0; for (let j = 0; j < 7; j++) { const d = new Date(end); d.setDate(d.getDate() - j); v += H.daily[dayKey(d)] || 0; }
        const s = new Date(end); s.setDate(s.getDate() - 6);
        series.push({ label: `Week of ${MONTHS[s.getMonth()]} ${s.getDate()}`, v: v / 3600, tick: i % 2 === 0 ? `${MONTHS[s.getMonth()]} ${s.getDate()}` : "", hl: i === 0 });
      }
    }
    const bySp = new Map(), byOrg = new Map(), byMonth = new Map(), byFmt = new Map();
    STATE.all.forEach((e) => {
      const w = h().watchedOf(e.id); if (!w) return;
      e.stars.forEach((p) => bySp.set(p.k, (bySp.get(p.k) || 0) + w / Math.max(1, e.stars.length)));
      (e.orgs.length ? e.orgs : ["Other"]).forEach((o) => byOrg.set(o, (byOrg.get(o) || 0) + w / Math.max(1, e.orgs.length || 1)));
      byMonth.set(e.month, (byMonth.get(e.month) || 0) + w);
      byFmt.set(e.fmt, (byFmt.get(e.fmt) || 0) + w);
    });
    const spData = Array.from(bySp.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => { const s = STATE.speakers.get(k); return { label: s ? s.name : k, v: v / 3600, href: s ? `#/speaker/${s.slug}` : "", icon: s ? A.ui.avatar(s.name, 22) : "" }; });
    const orgData = Array.from(byOrg.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ label: k, v: v / 3600, href: `#/browse?org=${encodeURIComponent(k)}` }));
    const monthData = A.MONTH_LIST.slice(1).map((m) => { const avail = STATE.all.filter((e) => e.month === m.id).reduce((a, e) => a + e.dur, 0); return { label: m.label, v: (byMonth.get(m.id) || 0) / 3600, avail: avail / 3600, id: m.id }; });
    const libFmt = A.FORMATS.map((f) => ({ label: f.label, v: STATE.all.filter((e) => e.fmt === f.id).length, href: `#/browse?fmt=${f.id}` }));

    view.innerHTML = `
      <header class="phead"><p class="eyebrow">Insights</p><h1>Your listening, measured honestly</h1><p class="lede">Every number below comes from real playback only: seeks, skips and paused time never count.</p></header>
      <div class="kpis">
        <div class="kpi">${total < 3600 ? `<b>${Math.round(total / 60)}</b><span>minutes watched</span>` : `<b data-count="${(total / 3600).toFixed(1)}" data-dec="1">0</b><span>hours watched</span>`}</div>
        <div class="kpi"><b data-count="${done}">0</b><span>episodes completed</span></div>
        <div class="kpi"><b>${started ? Math.round((100 * done) / started) : 0}%</b><span>completion rate (${done}/${started} started)</span></div>
        <div class="kpi"><b>${st.cur}</b><span>day streak · best ${st.best}</span></div>
        <div class="kpi"><b>${fmtHM(avgS)}</b><span>average session</span></div>
        <div class="kpi"><b>${h().heardSpeakers(300).size}</b><span>researchers heard</span></div>
      </div>
      <div class="panels">
        <section class="panel panel--wide"><div class="panel__hd"><h2>Hours watched</h2><div class="seg seg--sm" role="tablist"><button data-range="day" aria-selected="${range === "day"}">Per day</button><button data-range="week" aria-selected="${range === "week"}">Per week</button></div></div>${bars(series, { fmt: (v) => (v * 60 < 60 ? Math.round(v * 60) + " min" : v.toFixed(1) + " h"), aria: "Hours watched over time" })}</section>
        <section class="panel"><div class="panel__hd"><h2>Completion</h2></div><div class="donutwrap">${donut(started ? done / started : 0, started ? Math.round((100 * done) / started) + "%" : "0%", "of started")}<ul class="legend"><li><i class="sw sw--a"></i>${done} completed</li><li><i class="sw sw--b"></i>${started - done} in progress</li><li><i class="sw"></i>${STATE.all.length - started} not started</li></ul></div></section>
        <section class="panel"><div class="panel__hd"><h2>By speaker</h2></div>${hbars(spData, { fmt: hfmt, floor: 0.5 })}</section>
        <section class="panel"><div class="panel__hd"><h2>By organisation</h2></div>${hbars(orgData, { fmt: hfmt, floor: 0.5 })}</section>
        <section class="panel"><div class="panel__hd"><h2>By release month</h2></div>${hbars(monthData.map((m) => ({ label: `${m.label} (${hfmt(m.v)} of ${Math.round(m.avail)}h)`, v: m.v, href: `#/browse?month=${m.id}` })), { fmt: hfmt, floor: 0.5, empty: "Nothing watched yet." })}</section>
        <section class="panel"><div class="panel__hd"><h2>Library by format</h2></div>${hbars(libFmt, { fmt: (v) => v + " eps" })}</section>
        <section class="panel panel--wide"><div class="panel__hd"><h2>Streak calendar</h2><span class="muted">current ${st.cur} · best ${st.best} · ${st.days} active day${st.days === 1 ? "" : "s"}</span></div>${watchHeatmap()}</section>
        <section class="panel panel--wide" id="claimsPanel"><div class="panel__hd"><h2>Claims tracker: P(doom) and timelines</h2><span class="muted">${STATE.claims.length} attributed statements, each linked to the exact moment</span></div>${claimsTable()}</section>
      </div>`;
    view.querySelectorAll("[data-count]").forEach((el) => A.ui.animateCount(el, Number(el.dataset.count), el.dataset.dec ? (v) => v.toFixed(1) : null));
    view.querySelectorAll("[data-range]").forEach((b) => (b.onclick = () => { range = b.dataset.range; render(view); }));
    wireClaims(view);
  }
  function claimsTable(filterK) {
    const list = STATE.claims.filter((c) => (!filterK || c.k === filterK) && (claimKind === "all" || c.kind === claimKind) && (!claimQ || fold(c.speaker + " " + c.text).includes(fold(claimQ))));
    const ctl = filterK ? "" : `<div class="ctrls"><div class="seg seg--sm" role="tablist">${["all", "P(doom)", "Timeline"].map((k) => `<button data-ck="${k}" aria-selected="${claimKind === k}">${k === "all" ? "All" : k}</button>`).join("")}</div><input class="input input--sm" id="claimQ" placeholder="Filter by speaker or words" value="${esc(claimQ)}" aria-label="Filter claims"></div>`;
    if (!list.length) return ctl + `<p class="empty">No matching statements.</p>`;
    return ctl + `<div class="tablewrap"><table class="ctable"><thead><tr><th>Speaker</th><th>Type</th><th>Figure</th><th>Statement</th><th>Episode</th><th>Moment</th></tr></thead><tbody>${list.map((c) => {
      const e = STATE.byId.get(c.id); const s = STATE.speakers.get(c.k);
      return `<tr><td><a class="who" href="#/speaker/${s ? s.slug : ""}">${A.ui.avatar(c.speaker, 26)}<span>${esc(c.speaker)}</span></a></td><td><span class="ktag ktag--${c.kind === "Timeline" ? "t" : "p"}">${esc(c.kind)}</span></td><td class="fig">${esc(c.hl || "–")}</td><td class="stmt">${esc(c.text)}</td><td><button class="linkbtn" data-open="${c.id}">${esc(e.title.slice(0, 54))}${e.title.length > 54 ? "…" : ""}</button><small>${esc(A.fmtShort(e.date))}</small></td><td>${c.t != null ? `<button class="tbtn" data-jump="${c.id}|${c.t}">▶ ${fmtTime(c.t)}</button>` : "–"}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }
  function wireClaims(view) {
    view.querySelectorAll("[data-ck]").forEach((b) => (b.onclick = () => { claimKind = b.dataset.ck; const p = view.querySelector("#claimsPanel"); p.querySelector(".ctrls").parentNode && rerenderClaims(view); }));
    const q = view.querySelector("#claimQ");
    if (q) q.oninput = A.debounce(() => { claimQ = q.value; rerenderClaims(view, true); }, 200);
  }
  function rerenderClaims(view, keepFocus) {
    const p = view.querySelector("#claimsPanel"); if (!p) return;
    const hd = p.querySelector(".panel__hd").outerHTML;
    p.innerHTML = hd + claimsTable();
    wireClaims(view);
    if (keepFocus) { const q = p.querySelector("#claimQ"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }

  A.charts = { heatmap, releaseHeatmap, watchHeatmap, bars, hbars, donut, monthsBetween, claimsTable };
  A.insights = { render };
})(window.ASFE);
