/* AI Safety Full Episodes · Today's picks: a daily, stable list of recommended unwatched episodes at the top of Home.
 * Each local day gets 5 picks (at least 3 when the pool is small) from the recommender, with variety across formats,
 * orgs and months and a reason on every card. Mark watched, discard (with an optional reason that becomes a negative
 * signal), replace, generate more (no limit), shuffle, steer with a guidance bar, reorder by drag (pointer, touch,
 * keyboard), drag any episode card from anywhere into the picks dock, drag a pick to the bin, carry unfinished picks
 * over from yesterday, and keep a log of past days. Built by Aniruddha Adak. */
(function (A) {
  "use strict";
  const { $, $$, esc, STATE, clamp, fmtHM, dayKey, FORMATS, LENGTHS, LEVELS_EP, MONTH_LIST } = A;
  const h = () => A.hist;
  const L = () => A.hist.L;
  const ui = () => A.ui;
  const KEY = "picks:v1";
  const reduced = () => A.RM || document.documentElement.classList.contains("rm");
  const fx = (k, el, on) => A.fx && A.fx.celebrate(k, el, on);

  /* ---------------------------------------------------------------- state */
  function blank() { return { days: {}, neg: { sp: {}, tag: {}, org: {}, fmt: {}, long: 0, ids: [] }, guide: { len: "any", fmt: [], speakers: [], orgs: [], tags: [], month: "any", level: "auto", surprise: false } }; }
  let S = null;
  function load() {
    if (S) return S;
    const raw = A.store.get(KEY, null);
    S = Object.assign(blank(), raw || {});
    S.neg = Object.assign(blank().neg, S.neg || {});
    S.guide = Object.assign(blank().guide, S.guide || {});
    return S;
  }
  function save() { A.store.set(KEY, S); refreshLog(); }
  /* the Picks log follows every mark / discard / replace / generate right away (it used to show the snapshot from page load) */
  let logRaf = 0;
  function refreshLog() {
    if (logRaf || typeof document === "undefined") return;
    logRaf = (window.requestAnimationFrame || setTimeout)(() => {
      logRaf = 0; const old = document.querySelector("details.pklog"); if (!old) return;
      const t = document.createElement("template"); t.innerHTML = logHTML().trim(); const nu = t.content.firstElementChild; if (!nu) return;
      nu.open = old.open; if (nu.outerHTML !== old.outerHTML) old.replaceWith(nu);
    });
  }
  const today = () => dayKey(Date.now());
  function prevDayKey(k) { const keys = Object.keys(load().days).filter((d) => d < k).sort(); return keys.pop() || null; }

  /* ---------------------------------------------------------------- scoring: recommender + guidance + negatives + variety */
  function rng(seed) { let x = 0; for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) | 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; }
  function lenId(d) { const l = LENGTHS.find((x) => x.test(d || 0)); return l ? l.id : "m"; }
  function penalty(e) {
    const n = load().neg; let p = 0;
    e.stars.forEach((s) => (p += 3 * (n.sp[s.k] || 0)));
    e.tags.forEach((t) => (p += 1.2 * (n.tag[t] || 0)));
    e.orgs.forEach((o) => (p += 1.5 * (n.org[o] || 0)));
    p += 1.5 * (n.fmt[e.fmt] || 0);
    if (n.long && e.dur > 3600) p += Math.min(8, n.long * 1.6 * ((e.dur - 3600) / 3600 + 0.5));
    return p;
  }
  function guideScore(e, G, why) {
    let s = 0;
    if (G.len !== "any") { if (lenId(e.dur) === G.len) { s += 4; why.push(`Your length: ${LENGTHS.find((l) => l.id === G.len).label}`); } else s -= 3; }
    if (G.fmt.length) { if (G.fmt.includes(e.fmt)) { s += 4; why.push(`You asked for ${(FORMATS.find((f) => f.id === e.fmt) || { label: e.fmt }).label.toLowerCase()}`); } else s -= 2; }
    const sp = e.stars.find((p) => G.speakers.includes(p.k)); if (sp) { s += 7; why.push(`You asked for ${sp.name}`); }
    const og = e.orgs.find((o) => G.orgs.includes(o)); if (og) { s += 3.5; why.push(`From ${og}, as you asked`); }
    const tg = e.tags.find((t) => G.tags.includes(t)); if (tg) { s += 3.5; why.push(`About ${tg}, as you asked`); }
    if (G.month !== "any") { if (e.month === G.month) s += 3; else s -= 1.5; }
    if (G.level !== "auto" && G.level !== "any") { if (e.level === G.level) { s += 3; why.push(`${e.level}, as you asked`); } else s -= 1; }
    return s;
  }
  function candidates(excl) {
    const P = A.recs.profile(), G = load().guide, n = load().neg, R = rng(today() + ":" + Object.keys(excl).length);
    return STATE.all.filter((e) => h().stateOf(e.id) !== "done" && !excl[e.id] && !n.ids.includes(e.id)).map((e) => {
      const base = A.recs.score(e, P); const why = [];
      let s = base.s + guideScore(e, G, why) - penalty(e);
      if (A.isNew && A.isNew(e)) { s += 6; why.push("Just added"); }
      if (G.surprise) { s = s * 0.35 + R() * 14; why.unshift("Surprise pick"); }
      else s += R() * 0.6;
      const generic = /^(Unwatched|You might like this|Pick up again)$/.test(base.why);
      if (!why.length && !generic) why.push(base.why);
      if (G.level === "auto" && e.level === P.target) why.push(`Next step for your level (${e.level})`);
      why.push(...variety(e));
      return { e, s, why: why[0], alts: why.slice(1) };
    }).sort((a, b) => b.s - a.s);
  }
  /* greedy pick with a variety penalty (format, org, month, shared speaker) */
  function choose(n, excl, keep) {
    const pool = candidates(excl).slice(0, 80), out = [], have = (keep || []).map((id) => STATE.byId.get(id)).filter(Boolean);
    while (out.length < n && pool.length) {
      let bi = 0, bs = -1e9;
      pool.forEach((x, i) => {
        let s = x.s; const all = have.concat(out.map((o) => o.e));
        all.forEach((o) => { if (o.fmt === x.e.fmt) s -= 1.6; if (o.month === x.e.month) s -= 0.8; if (o.orgs.some((g) => x.e.orgs.includes(g))) s -= 1.4; if (o.stars.some((p) => x.e.stars.some((q) => q.k === p.k))) s -= 4; });
        if (s > bs) { bs = s; bi = i; }
      });
      out.push(pool.splice(bi, 1)[0]);
    }
    return dedupeWhy(out, new Set((ensureDayNoGen() || { items: [] }).items.filter((it) => it.st === "pending").map((it) => it.why)));
  }
  /* alternative, specific reasons so the day's cards do not all say the same thing */
  function variety(e) {
    const f = (FORMATS.find((x) => x.id === e.fmt) || { label: "episode" }).label.toLowerCase().replace(/ \/.*$/, "");
    const out = [];
    if (e.dur && e.dur < 2400) out.push(`Short ${f}: done in ${Math.round(e.dur / 60)} min`);
    if (e.dur >= 7200) out.push(`A deep ${f} for a long sit`);
    if (e.orgs[0]) out.push(`Adds ${e.orgs[0]} to today's mix`);
    if (e.tags[0]) out.push(`Covers ${e.tags[0]}`);
    if (e.views >= 100000) out.push(`Widely watched (${ui().fmtViews(e.views)} views)`);
    if (e.month === "2026-10") out.push("Fresh this month");
    out.push(`A ${f} with ${ui().whoLine(e, 1)}`);
    return out;
  }
  function dedupeWhy(list, used) {
    used = used || new Set();
    list.forEach((x) => { if (used.has(x.why)) { const alt = (x.alts || []).find((w) => !used.has(w)); if (alt) x.why = alt; } used.add(x.why); });
    return list;
  }
  function excl(day) { const m = {}; (day.items || []).forEach((it) => (m[it.id] = 1)); return m; }
  function item(x, src) { return { id: x.e.id, why: x.why, st: "pending", src: src || "auto", at: Date.now() }; }

  /* ---------------------------------------------------------------- day lifecycle */
  function ensureDay() {
    const k = today(), st = load();
    if (!st.days[k]) {
      const avail = STATE.all.filter((e) => h().stateOf(e.id) !== "done").length;
      const n = avail >= 5 ? 5 : Math.min(avail, Math.max(3, avail));
      const prev = prevDayKey(k);
      const carry = prev ? st.days[prev].items.filter((it) => it.st === "pending" && h().stateOf(it.id) !== "done").map((it) => it.id) : [];
      st.days[k] = { items: [], created: Date.now(), carryFrom: carry.length ? prev : null, carryIds: carry, carryAsked: !carry.length, celebrated: false };
      const ex = {}; carry.forEach((id) => (ex[id] = 1));
      st.days[k].items = choose(n, ex).map((x) => item(x));
      prune(); save();
    }
    return st.days[k];
  }
  function prune() { const keys = Object.keys(S.days).sort(); while (keys.length > 60) delete S.days[keys.shift()]; }
  function ensureDayNoGen() { return load().days[today()] || null; }
  const visible = (d) => d.items.filter((it) => it.st === "pending");
  function progress(d) { const live = d.items.filter((it) => it.st === "pending" || it.st === "done"); return { done: live.filter((it) => it.st === "done").length, n: live.length }; }

  /* ---------------------------------------------------------------- actions (all targeted: DOM nodes are moved/removed, never re-rendered wholesale) */
  function findIt(d, id) { return d.items.find((it) => it.id === id && it.st === "pending") || d.items.find((it) => it.id === id); }
  function markDone(id, el) {
    const d = ensureDay(); const it = findIt(d, id); if (!it) return false;
    if (h().stateOf(id) !== "done") { if (A.P.cur && A.P.cur.id === id) { A.player.tick(true); A.player.flush(); } h().markWatched(id); }
    it.st = "done"; it.doneAt = Date.now(); save();
    fx("watched", el, true);
    removeNode(id, "is-done-out");
    A.views.refreshCardsFor(id);
    A.feat && A.feat.paintGoal && A.feat.paintGoal();
    paintProgress(true);
    ui().toast(`Done: <b>${esc(STATE.byId.get(id).title.slice(0, 50))}</b>`, { icon: "✅", ms: 2600, action: { label: "Undo", fn: () => { h().unmarkWatched(id); it.st = "pending"; save(); A.views.refreshCardsFor(id); restoreNode(it); paintProgress(); } } });
    return true;
  }
  function discard(id, el) {
    const d = ensureDay(); const it = findIt(d, id); if (!it || it.st !== "pending") return false;
    it.st = "discarded"; it.discAt = Date.now(); save();
    removeNode(id, "is-disc-out");
    paintProgress();
    askReason(it);
    return true;
  }
  function setReason(it, reason) {
    const e = STATE.byId.get(it.id); const n = load().neg; if (!e) return;
    it.reason = reason;
    if (reason === "not interested" || reason === "seen elsewhere") { if (!n.ids.includes(it.id)) n.ids.push(it.id); }
    if (reason === "not interested") { e.tags.slice(0, 2).forEach((t) => (n.tag[t] = (n.tag[t] || 0) + 0.5)); n.fmt[e.fmt] = (n.fmt[e.fmt] || 0) + 0.3; }
    if (reason === "too long") n.long = (n.long || 0) + 1;
    if (reason === "less speaker") e.stars.slice(0, 2).forEach((p) => (n.sp[p.k] = (n.sp[p.k] || 0) + 1));
    if (reason === "less topic") { e.tags.slice(0, 2).forEach((t) => (n.tag[t] = (n.tag[t] || 0) + 1)); e.orgs.slice(0, 1).forEach((o) => (n.org[o] = (n.org[o] || 0) + 0.5)); }
    save();
  }
  function replace(id, el) {
    const d = ensureDay(); const it = findIt(d, id); if (!it || it.st !== "pending") return null;
    const x = choose(1, excl(d), visible(d).map((v) => v.id))[0];
    if (!x) { ui().toast("Nothing else left to suggest with these settings", { ms: 2000 }); return null; }
    it.st = "replaced"; it.repAt = Date.now();
    const nu = item(x, "replace");
    d.items.splice(d.items.indexOf(it) + 1, 0, nu); save();
    const node = nodeOf(id);
    if (node) {
      const fresh = tpl(cardHTML(nu));
      if (reduced()) node.replaceWith(fresh); else { node.classList.add("is-swap-out"); setTimeout(() => { node.replaceWith(fresh); fresh.classList.add("is-swap-in"); setTimeout(() => fresh.classList.remove("is-swap-in"), 500); }, 220); }
    }
    return nu;
  }
  function more(n) {
    const d = ensureDay();
    const xs = choose(n || 5, excl(d), visible(d).map((v) => v.id));
    if (!xs.length) { ui().toast("You have every unwatched episode in your picks already", { icon: "🎉", ms: 2200 }); return []; }
    const its = xs.map((x) => item(x, "more")); d.items.push(...its); save();
    const list = listEl(); if (list) its.forEach((it, i) => { const c = tpl(cardHTML(it)); c.classList.add("is-in"); c.style.animationDelay = i * 40 + "ms"; list.appendChild(c); });
    paintProgress(); paintEmpty();
    return its;
  }
  function add(id, src, at) {
    const e = STATE.byId.get(id); if (!e) return false;
    const d = ensureDay();
    if (d.items.some((it) => it.id === id && it.st === "pending")) { ui().toast("Already in Today's picks", { ms: 1400 }); return false; }
    if (h().stateOf(id) === "done") { ui().toast("Already watched, added anyway so you can rewatch", { ms: 1800 }); }
    const it = { id, why: src === "carry" ? "Carried over from yesterday" : "You added this", st: "pending", src: src || "drag", at: Date.now() };
    const pend = visible(d);
    if (at != null && at < pend.length) d.items.splice(d.items.indexOf(pend[at]), 0, it); else d.items.push(it);
    const ni = load().neg.ids.indexOf(id); if (ni >= 0) load().neg.ids.splice(ni, 1);
    save();
    const list = listEl();
    if (list) { const c = tpl(cardHTML(it)); c.classList.add("is-in"); const ref = at != null ? list.children[at] : null; ref ? list.insertBefore(c, ref) : list.appendChild(c); fx("pick", c, true); }
    paintProgress(); paintEmpty();
    return true;
  }
  function shuffle() {
    const d = ensureDay(); const pend = visible(d); const R = Math.random;
    for (let i = pend.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pend[i], pend[j]] = [pend[j], pend[i]]; }
    reorderTo(pend.map((p) => p.id));
  }
  /* persist a new order of the pending items and move the existing nodes with a FLIP animation */
  function reorderTo(ids) {
    const d = ensureDay(); const pend = visible(d);
    const byId = new Map(pend.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean).concat(pend.filter((p) => !ids.includes(p.id)));
    const rest = d.items.filter((it) => it.st !== "pending");
    d.items = rest.concat(ordered); save();
    const list = listEl(); if (!list) return;
    flip(list, () => ordered.forEach((p) => { const n = nodeOf(p.id); if (n) list.appendChild(n); }));
  }
  function move(id, delta) {
    const ids = visible(ensureDay()).map((p) => p.id); const i = ids.indexOf(id); const j = clamp(i + delta, 0, ids.length - 1);
    if (i < 0 || i === j) return false;
    ids.splice(j, 0, ids.splice(i, 1)[0]); reorderTo(ids);
    const n = nodeOf(id); if (n) n.focus({ preventScroll: true });
    live(`Moved to position ${j + 1} of ${ids.length}`);
    return true;
  }
  function carryOver(yes) {
    const d = ensureDay(); d.carryAsked = true;
    if (yes) { const pend = d.carryIds.filter((id) => h().stateOf(id) !== "done"); pend.forEach((id) => add(id, "carry")); const pv = S.days[d.carryFrom]; if (pv) pv.items.forEach((it) => { if (pend.includes(it.id) && it.st === "pending") it.st = "carried"; }); }
    save(); const b = $("#pkCarry"); if (b) b.remove();
  }
  function sync(id) {
    // called after any watched toggle anywhere in the app: animate the pick away when it becomes done
    if (!S && !A.store.get(KEY, null)) return;
    const d = load().days[today()]; if (!d) return;
    const it = d.items.find((x) => x.id === id && (x.st === "pending" || x.st === "done")); if (!it) return;
    const done = h().stateOf(id) === "done";
    if (done && it.st === "pending") { it.st = "done"; it.doneAt = Date.now(); save(); removeNode(id, "is-done-out"); paintProgress(true); }
    else if (!done && it.st === "done") { it.st = "pending"; save(); restoreNode(it); paintProgress(); }
  }

  /* ---------------------------------------------------------------- DOM */
  const root = () => $("#picks");
  const listEl = () => $("#pkList");
  const nodeOf = (id) => { const l = listEl(); return l ? l.querySelector(`.pick[data-id="${A.cssEsc(id)}"]`) : null; };
  function tpl(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function live(msg) { const r = $("#pkLive"); if (r) r.textContent = msg; }
  function flip(container, mutate) {
    const kids = [...container.children]; const first = new Map(kids.map((k) => [k, k.getBoundingClientRect()]));
    mutate();
    if (reduced()) return;
    [...container.children].forEach((k) => {
      const a = first.get(k); if (!a) return; const b = k.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top; if (!dx && !dy) return;
      k.style.transition = "none"; k.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => { k.style.transition = "transform .32s var(--ease)"; k.style.transform = ""; setTimeout(() => (k.style.transition = ""), 340); });
    });
  }
  function removeNode(id, cls) {
    const n = nodeOf(id); if (!n) return;
    const list = n.parentNode;
    const fin = () => { flip(list, () => n.remove()); paintEmpty(); };
    if (reduced()) fin(); else { n.classList.add(cls); setTimeout(fin, 420); }
  }
  function restoreNode(it) {
    const list = listEl(); if (!list || nodeOf(it.id)) return;
    const pend = visible(ensureDay()); const i = pend.findIndex((p) => p.id === it.id);
    const c = tpl(cardHTML(it)); c.classList.add("is-in");
    const ref = list.children[i]; ref ? list.insertBefore(c, ref) : list.appendChild(c); paintEmpty();
  }
  function cardHTML(it) {
    const e = STATE.byId.get(it.id); if (!e) return "<li hidden></li>";
    const pct = h().pctOf(e.id);
    return `<li class="pick" data-id="${e.id}" tabindex="0" aria-roledescription="draggable pick" aria-label="${esc(e.title)}. Alt plus arrow keys to reorder.">
      <span class="pick__grip" aria-hidden="true" title="Drag to reorder">⋮⋮</span>
      <button class="thumb" data-act="play" aria-label="Play ${esc(e.title)}" draggable="false">${ui().thumbImg(e)}${ui().thumbBadges(e)}<span class="thumb__play">${ui().ICON.play}</span>${pct ? `<span class="thumb__bar"><i style="width:${Math.round(pct * 100)}%"></i></span>` : ""}</button>
      <div class="pick__body">
        <p class="pick__why">${ui().ICON.spark}<span>${esc(it.why || "Picked for you")}</span></p>
        <button class="card__title" data-act="open" title="${esc(e.title)}">${esc(e.title)}</button>
        ${ui().cardMeta(e, `<span class="lvl lvl--${A.slug(e.level)}">${esc(e.level)}</span><span class="pick__who">${esc(ui().whoLine(e, 2))}</span>`)}
        <div class="pick__act">
          <button class="pk__btn pk__btn--done" data-pk="done" aria-label="Mark as watched" title="Mark as watched">${ui().ICON.check}<span>Watched</span></button>
          <button class="pk__btn" data-pk="replace" aria-label="Replace with another pick" title="Replace">↻</button>
          <button class="pk__btn" data-pk="discard" aria-label="Discard this pick" title="Discard">✕</button>
        </div>
      </div></li>`;
  }
  function ringHTML(p) {
    const fr = p.n ? p.done / p.n : 0;
    return `<span class="pkring" style="--p:${(fr * 100).toFixed(1)}" aria-hidden="true"><b>${p.done}</b><small>/${p.n}</small></span><span class="pkprog__tx"><b>${p.done} of ${p.n} done today</b><small>${p.n && p.done === p.n ? "All done. Brilliant." : `${Math.max(0, p.n - p.done)} to go`}</small></span>`;
  }
  function paintProgress(maybeCelebrate) {
    const d = ensureDay(), p = progress(d), el = $("#pkProg"); if (!el) return p;
    el.innerHTML = ringHTML(p);
    el.classList.toggle("is-all", p.n > 0 && p.done === p.n);
    if (maybeCelebrate && p.n > 0 && p.done === p.n && !d.celebrated) { d.celebrated = true; save(); fx("picksdone", el, true); ui().toast("Every pick done today. Take a bow!", { icon: "🎉", force: true }); }
    return p;
  }
  function paintEmpty() {
    const l = listEl(), em = $("#pkEmpty"); if (!l || !em) return;
    em.hidden = l.children.length > 0;
  }
  function chips(name, opts, sel, multi) {
    return `<div class="pkg__row" role="group" aria-label="${esc(name)}"><span class="pkg__lab">${esc(name)}</span>${opts.map(([v, lab]) => { const on = multi ? sel.includes(v) : sel === v; return `<button class="chip ${on ? "is-on" : ""}" data-g="${esc(name)}" data-gv="${esc(v)}" aria-pressed="${on}">${esc(lab)}</button>`; }).join("")}</div>`;
  }
  function topBy(fn, n) { const m = new Map(); STATE.all.forEach((e) => fn(e).forEach((k) => m.set(k, (m.get(k) || 0) + 1))); return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k); }
  function guideHTML() {
    const G = load().guide;
    const sp = Array.from(STATE.speakers.values()).filter((s) => !s.isHost && s.eps.length >= 2).sort((a, b) => (L().FOLLOWS.has(b.k) - L().FOLLOWS.has(a.k)) || b.eps.length - a.eps.length).slice(0, 14);
    return `<div class="pkg" id="pkGuide" hidden>
      ${chips("Length", [["any", "Any"]].concat(LENGTHS.map((l) => [l.id, l.label])), G.len)}
      ${chips("Format", FORMATS.map((f) => [f.id, f.label]), G.fmt, true)}
      ${chips("Level", [["auto", "Auto (level up)"]].concat(LEVELS_EP.map((l) => [l, l])), G.level)}
      ${chips("Month", [["any", "Any"]].concat(MONTH_LIST.slice(1).map((m) => [m.id, m.label])), G.month)}
      ${chips("Speakers", sp.map((s) => [s.k, s.name]), G.speakers, true)}
      ${chips("Orgs", topBy((e) => e.orgs, 12).map((o) => [o, o]), G.orgs, true)}
      ${chips("Topics", topBy((e) => e.tags, 14).map((t) => [t, t]), G.tags, true)}
      <div class="pkg__row"><label class="switch"><input type="checkbox" id="pkSurprise" ${G.surprise ? "checked" : ""}><span></span>Surprise me</label><span class="grow"></span><button class="btn btn--sm btn--ghost" id="pkGReset">Reset</button><button class="btn btn--sm btn--primary" id="pkGApply">Re-pick with these</button></div>
    </div>`;
  }
  function logHTML() {
    const days = Object.keys(load().days).sort().reverse().slice(0, 21);
    if (!days.length) return "";
    return `<details class="pklog"><summary>Picks log <small>${days.length} day${days.length === 1 ? "" : "s"}</small></summary><ol>${days.map((k) => { const d = S.days[k]; const c = (st) => d.items.filter((it) => it.st === st).length;
      return `<li><b>${k === today() ? "Today" : esc(A.fmtDate(k))}</b><span class="ok">${c("done")} done</span><span>${c("pending")} pending</span><span class="muted">${c("discarded")} discarded${c("replaced") ? ` · ${c("replaced")} replaced` : ""}${c("carried") ? ` · ${c("carried")} carried` : ""}</span>
        <ul>${d.items.filter((it) => it.st !== "replaced").map((it) => { const e = STATE.byId.get(it.id); return e ? `<li class="pklog__it pklog__it--${it.st}"><button class="linkbtn" data-playid="${e.id}">${esc(e.title.slice(0, 80))}</button><em>${esc(it.st)}${it.reason ? ` · ${esc(it.reason)}` : ""}</em></li>` : ""; }).join("")}</ul></li>`; }).join("")}</ol></details>`;
  }
  function render(el) {
    el = el || root(); if (!el) return;
    const d = ensureDay(); const pend = visible(d); const p = progress(d);
    const carryN = !d.carryAsked ? d.carryIds.filter((id) => h().stateOf(id) !== "done").length : 0;
    el.innerHTML = `<div class="pk__hd">
        <div><p class="eyebrow">${esc(A.fmtDate(today()))}</p><h2><span class="shelf__ic">🎯</span>Today's picks</h2><p class="muted">Chosen for you each day from who you follow, what you finish, your level and a mix of formats. Drag to reorder, or drop any episode card here.</p></div>
        <div class="pkprog" id="pkProg" role="status" aria-live="polite">${ringHTML(p)}</div>
      </div>
      ${carryN ? `<div class="pkcarry" id="pkCarry"><span>${ui().ICON.clock}Carry over ${carryN} unfinished pick${carryN === 1 ? "" : "s"} from ${esc(d.carryFrom === dayKey(Date.now() - 864e5) ? "yesterday" : A.fmtDate(d.carryFrom))}?</span><button class="btn btn--sm btn--primary" data-pkc="yes">Carry over</button><button class="btn btn--sm btn--ghost" data-pkc="no">No thanks</button></div>` : ""}
      <div class="pk__tools"><button class="btn btn--sm" data-pkt="more">${ui().ICON.plus}<span>Generate more</span></button><button class="btn btn--sm" data-pkt="shuffle">${ui().ICON.shuffle}<span>Shuffle all</span></button><button class="btn btn--sm btn--ghost" data-pkt="guide" aria-expanded="false" aria-controls="pkGuide">${ui().ICON.filter}<span>Steer picks</span></button><span class="grow"></span><span class="pk__hint muted">Alt + ← → to reorder with the keyboard</span></div>
      ${guideHTML()}
      <div class="pk__reason" id="pkReason" hidden></div>
      <ol class="pk__list" id="pkList" aria-label="Today's picks, in order">${pend.map(cardHTML).join("")}</ol>
      <div class="pk__empty" id="pkEmpty" ${pend.length ? "hidden" : ""}><p>${p.n && p.done === p.n ? "All of today's picks are done." : "No picks left for today."}</p><button class="btn btn--sm btn--primary" data-pkt="more">${ui().ICON.plus}<span>Generate more</span></button></div>
      ${logHTML()}
      <p class="sr-only" id="pkLive" aria-live="polite"></p>`;
    el.classList.add("is-drop");
  }
  /* inline reason chips after a discard */
  let reasonT = 0;
  function askReason(it) {
    const box = $("#pkReason"); if (!box) return;
    const e = STATE.byId.get(it.id);
    const sp = e.stars[0], tg = e.tags[0];
    box.innerHTML = `<span>Discarded <b>${esc(e.title.slice(0, 46))}${e.title.length > 46 ? "…" : ""}</b>. Why? <small>(optional, tunes future picks)</small></span>
      <button class="chip" data-rs="not interested">Not interested</button><button class="chip" data-rs="seen elsewhere">Seen elsewhere</button><button class="chip" data-rs="too long">Too long</button>
      ${sp ? `<button class="chip" data-rs="less speaker">Less of ${esc(sp.name)}</button>` : ""}${tg ? `<button class="chip" data-rs="less topic">Less ${esc(tg)}</button>` : ""}
      <button class="linkbtn" data-rs="undo">Undo</button>`;
    box.dataset.id = it.id; box.hidden = false;
    clearTimeout(reasonT); reasonT = setTimeout(() => { box.hidden = true; }, 12000);
  }

  /* ---------------------------------------------------------------- events (delegated) */
  document.addEventListener("click", (ev) => {
    const pk = ev.target.closest && ev.target.closest("#picks"); if (!pk) return;
    const b = ev.target.closest("[data-pk]");
    if (b) { const id = b.closest(".pick").dataset.id; const a = b.dataset.pk; if (a === "done") markDone(id, b); if (a === "discard") discard(id, b); if (a === "replace") replace(id, b); return; }
    const t = ev.target.closest("[data-pkt]");
    if (t) {
      const a = t.dataset.pkt;
      if (a === "more") { const its = more(5); if (its.length) { fx("pick", t, true); ui().toast(`Added ${its.length} more pick${its.length === 1 ? "" : "s"}`, { icon: "✨", ms: 1400 }); } }
      if (a === "shuffle") { shuffle(); fx("queue", t, true); }
      if (a === "guide") { const g = $("#pkGuide"); g.hidden = !g.hidden; t.setAttribute("aria-expanded", String(!g.hidden)); }
      return;
    }
    const c = ev.target.closest("[data-pkc]"); if (c) { carryOver(c.dataset.pkc === "yes"); return; }
    const rs = ev.target.closest("[data-rs]");
    if (rs) {
      const box = $("#pkReason"); const id = box.dataset.id; const d = ensureDay(); const it = d.items.filter((x) => x.id === id && x.st === "discarded").pop();
      if (!it) return;
      if (rs.dataset.rs === "undo") { it.st = "pending"; delete it.reason; save(); restoreNode(it); paintProgress(); }
      else { setReason(it, rs.dataset.rs); ui().toast(rs.dataset.rs === "seen elsewhere" ? "Noted. Mark it as watched from its card if you finished it." : "Thanks, future picks will reflect that", { icon: "🧭", ms: 1800 }); }
      box.hidden = true; return;
    }
    const g = ev.target.closest("[data-g]");
    if (g) {
      const G = load().guide, v = g.dataset.gv, name = g.dataset.g;
      const key = { Length: "len", Format: "fmt", Level: "level", Month: "month", Speakers: "speakers", Orgs: "orgs", Topics: "tags" }[name];
      if (Array.isArray(G[key])) { const i = G[key].indexOf(v); i >= 0 ? G[key].splice(i, 1) : G[key].push(v); }
      else G[key] = v;
      save();
      g.parentNode.querySelectorAll("[data-gv]").forEach((x) => { const on = Array.isArray(G[key]) ? G[key].includes(x.dataset.gv) : G[key] === x.dataset.gv; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", String(on)); });
      return;
    }
    if (ev.target.closest("#pkGApply")) { repickPending(); return; }
    if (ev.target.closest("#pkGReset")) { S.guide = blank().guide; save(); const g0 = $("#pkGuide"); const open = g0 && !g0.hidden; g0.outerHTML = guideHTML(); if (open) $("#pkGuide").hidden = false; }
  });
  document.addEventListener("change", (ev) => { if (ev.target && ev.target.id === "pkSurprise") { load().guide.surprise = ev.target.checked; save(); } });
  function repickPending() {
    const d = ensureDay(); const pend = visible(d); const n = Math.max(pend.length, 3);
    pend.forEach((it) => (it.st = "replaced"));
    const xs = choose(n, excl(d)); d.items.push(...xs.map((x) => item(x, "guide"))); save();
    const list = listEl(); if (list) { list.innerHTML = visible(d).map(cardHTML).join(""); [...list.children].forEach((c, i) => { c.classList.add("is-in"); c.style.animationDelay = i * 40 + "ms"; }); }
    paintProgress(); paintEmpty();
    ui().toast("Re-picked with your guidance (saved for future days)", { icon: "🧭", ms: 1800 });
  }
  /* keyboard reorder: Alt+arrows on a focused pick; Space picks it up, arrows move, Space/Enter drops, Esc cancels */
  let kbHeld = null;
  document.addEventListener("keydown", (ev) => {
    const p = ev.target.closest && ev.target.closest(".pick"); if (!p || !p.closest("#pkList") || ev.target !== p) return;
    const k = ev.key, id = p.dataset.id;
    const dir = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[k];
    if (dir && (ev.altKey || kbHeld === id)) { ev.preventDefault(); ev.stopPropagation(); move(id, dir); return; }
    if (k === " ") { ev.preventDefault(); if (kbHeld === id) { kbHeld = null; p.classList.remove("is-held"); live("Dropped"); } else { kbHeld = id; p.classList.add("is-held"); live("Picked up. Use the arrow keys to move, Space to drop."); } return; }
    if ((k === "Enter" || k === "Escape") && kbHeld === id) { ev.preventDefault(); kbHeld = null; p.classList.remove("is-held"); live(k === "Enter" ? "Dropped" : "Cancelled"); return; }
    if (k === "Delete" || k === "Backspace") { ev.preventDefault(); discard(id, p); }
  });

  /* pointer drag (mouse + touch) to reorder picks, or drop on the bin to discard */
  let pd = null;
  const isCtl = (t) => t.closest("button, a, input, select, textarea");
  function bin() { let b = $("#pkBin"); if (!b) { b = document.createElement("div"); b.id = "pkBin"; b.className = "pkbin"; b.setAttribute("aria-hidden", "true"); b.innerHTML = `${ui().ICON.trash}<span>Drop to discard</span>`; document.body.appendChild(b); } return b; }
  const over = (el, x, y) => { if (!el) return false; const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  document.addEventListener("pointerdown", (ev) => {
    const p = ev.target.closest && ev.target.closest("#pkList .pick"); if (!p || ev.button > 0) return;
    const onGrip = !!ev.target.closest(".pick__grip");
    if (!onGrip && isCtl(ev.target)) return;
    pd = { p, id: p.dataset.id, x0: ev.clientX, y0: ev.clientY, on: false, touch: ev.pointerType === "touch", grip: onGrip, t0: Date.now(), pid: ev.pointerId };
    if (pd.touch && !onGrip) { pd.hold = setTimeout(() => { if (pd && !pd.on) startDrag(ev.clientX, ev.clientY); }, 380); }
  });
  function startDrag(x, y) {
    const p = pd.p, r = p.getBoundingClientRect();
    pd.on = true; pd.dx = x - r.left; pd.dy = y - r.top;
    const ph = document.createElement("li"); ph.className = "pick pick--ph"; ph.style.height = r.height + "px"; ph.setAttribute("aria-hidden", "true");
    p.parentNode.insertBefore(ph, p); pd.ph = ph;
    p.classList.add("is-lifted"); Object.assign(p.style, { width: r.width + "px", height: r.height + "px", left: r.left + "px", top: r.top + "px" });
    document.body.classList.add("is-grabbing", "is-pkdrag");
    root() && root().classList.add("is-sorting");
    bin().classList.add("is-on");
    try { p.setPointerCapture && p.setPointerCapture(pd.pid); } catch (e) {}
  }
  document.addEventListener("pointermove", (ev) => {
    if (!pd) return;
    const dx = ev.clientX - pd.x0, dy = ev.clientY - pd.y0;
    if (!pd.on) {
      if (Math.hypot(dx, dy) < 6) return;
      if (pd.touch && !pd.grip) { clearTimeout(pd.hold); pd = null; return; } // a touch swipe scrolls the page unless it starts on the grip or after a long-press
      startDrag(ev.clientX, ev.clientY);
    }
    ev.preventDefault && ev.preventDefault();
    const p = pd.p; p.style.left = ev.clientX - pd.dx + "px"; p.style.top = ev.clientY - pd.dy + "px";
    const b = bin(); const onBin = over(b, ev.clientX, ev.clientY); b.classList.toggle("is-hot", onBin);
    if (onBin) return;
    const list = listEl(); const sibs = [...list.children].filter((c) => c !== p && c !== pd.ph);
    let target = null, after = false;
    for (const c of sibs) { const r = c.getBoundingClientRect(); if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) { target = c; after = ev.clientX > r.left + r.width / 2; break; } }
    if (target) { const ref = after ? target.nextSibling : target; if (ref !== pd.ph && ref !== pd.ph.nextSibling) flip(list, () => list.insertBefore(pd.ph, ref)); }
  }, { passive: false });
  function endDrag(ev) {
    if (!pd) return;
    clearTimeout(pd.hold);
    const st = pd; pd = null;
    if (!st.on) return;
    const p = st.p, b = bin();
    const onBin = ev && over(b, ev.clientX, ev.clientY);
    b.classList.remove("is-on", "is-hot");
    document.body.classList.remove("is-grabbing", "is-pkdrag");
    root() && root().classList.remove("is-sorting");
    p.classList.remove("is-lifted"); ["width", "height", "left", "top"].forEach((k) => (p.style[k] = ""));
    if (onBin) { st.ph.remove(); discard(st.id, p); return; }
    st.ph.replaceWith(p);
    const ids = [...listEl().children].map((c) => c.dataset.id).filter(Boolean);
    reorderTo(ids);
    live(`Moved to position ${ids.indexOf(st.id) + 1} of ${ids.length}`);
    P.justDragged = Date.now();
  }
  const P = {};
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", () => endDrag(null));
  document.addEventListener("click", (ev) => { if (P.justDragged && Date.now() - P.justDragged < 300 && ev.target.closest && ev.target.closest("#pkList")) { ev.stopPropagation(); ev.preventDefault(); } }, true);

  /* drag ANY episode card from anywhere (library, speaker pages, search, queue, history, carousels) into the picks dock */
  let dragId = null;
  const SRC = ".card[data-id], .lrow[data-id], .qrow[data-id], .hrow[data-id], .wrow[data-id], .contb[data-id], .ngroup[data-id], .upn[data-play]";
  function dock() {
    let d = $("#pkDock");
    if (!d) { d = document.createElement("div"); d.id = "pkDock"; d.className = "pkdock"; d.setAttribute("aria-hidden", "true"); d.innerHTML = `<span class="pkdock__ic">🎯</span><span><b>Drop to add to Today's picks</b><small>${visible(ensureDay()).length} picks today</small></span>`; document.body.appendChild(d); }
    return d;
  }
  document.addEventListener("dragstart", (ev) => {
    if (ev.target.closest && ev.target.closest("#pkList")) { ev.preventDefault(); return; } // picks reorder with pointer events instead
    const src = ev.target.closest && ev.target.closest(SRC); if (!src) return;
    const id = src.dataset.id || src.dataset.play; if (!STATE.byId.get(id)) return;
    dragId = id;
    try { ev.dataTransfer.setData("text/x-asfe-id", id); ev.dataTransfer.setData("text/plain", STATE.byId.get(id).url); ev.dataTransfer.effectAllowed = "copyMove"; } catch (e) {}
    const d = dock(); d.querySelector("small").textContent = `${visible(ensureDay()).length} picks today`; d.classList.add("is-on");
    root() && root().classList.add("is-target");
    document.body.classList.add("is-dragging-ep");
  });
  const dropTarget = (t) => t && t.closest && (t.closest("#pkDock") || t.closest("#picks"));
  document.addEventListener("dragover", (ev) => { const t = dropTarget(ev.target); if (!t || !dragId) return; ev.preventDefault(); try { ev.dataTransfer.dropEffect = "copy"; } catch (e) {} t.classList.add("is-hot"); });
  document.addEventListener("dragleave", (ev) => { const t = dropTarget(ev.target); if (t && !t.contains(ev.relatedTarget)) t.classList.remove("is-hot"); });
  document.addEventListener("drop", (ev) => {
    const t = dropTarget(ev.target); if (!t) return;
    let id = dragId; try { id = (ev.dataTransfer && ev.dataTransfer.getData("text/x-asfe-id")) || id; } catch (e) {}
    if (!id || !STATE.byId.get(id)) return;
    ev.preventDefault();
    let at = null; const list = listEl();
    if (list && t.closest("#picks") && ev.clientX != null) { const kids = [...list.children]; const i = kids.findIndex((c) => { const r = c.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; }); if (i >= 0) at = i; }
    if (add(id, "drag", at)) ui().toast(`Added to Today's picks: <b>${esc(STATE.byId.get(id).title.slice(0, 46))}</b>`, { icon: "🎯", ms: 1800 });
    endEpDrag();
  });
  function endEpDrag() { dragId = null; const d = $("#pkDock"); if (d) d.classList.remove("is-on", "is-hot"); const r = root(); if (r) r.classList.remove("is-target", "is-hot"); document.body.classList.remove("is-dragging-ep"); }
  document.addEventListener("dragend", endEpDrag);

  A.picks = { render, ensureDay, markDone, discard, setReason, replace, more, add, shuffle, move, reorderTo, carryOver, sync, penalty, today: () => ensureDay(), state: () => load(), reset: () => { S = null; }, progress: () => progress(ensureDay()), visible: () => visible(ensureDay()) };
})(window.ASFE);
