/* AI Safety Full Episodes · library features: "I've watched these" checklist, History timeline, playlists & watch later,
 * ratings + personal tags, context menu, monthly recap, share-card images, accent themes, daily goal + streak, carousels,
 * hover previews and keyboard navigation. Built by Aniruddha Adak. */
(function (A) {
  "use strict";
  const { $, $$, esc, STATE, fmtTime, fmtHM, hoursStr, fmtDate, fold, MONTH_LIST, dayKey, clamp } = A;
  const h = () => A.hist;
  const L = () => A.hist.L;
  const ui = () => A.ui;
  const V = (name) => $(`.view[data-view="${name}"]`);
  const MONTHS_DESC = MONTH_LIST.slice(1).slice().reverse();
  const download = (name, text, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); };
  const refresh = (id) => { A.views.refreshCardsFor(id); paintGoal(); };
  const fx = (k, el, on) => A.fx && A.fx.celebrate(k, el, on);

  /* ================================================================ accent themes */
  const ACCENTS = [
    { id: "amber", label: "Amber", c: ["#f59e0b", "#14b8a6"] }, { id: "teal", label: "Teal", c: ["#14b8a6", "#f59e0b"] }, { id: "emerald", label: "Emerald", c: ["#10b981", "#38bdf8"] },
    { id: "sky", label: "Sky", c: ["#38bdf8", "#34d399"] }, { id: "coral", label: "Coral", c: ["#fb7154", "#fbbf24"] }, { id: "lime", label: "Lime", c: ["#84cc16", "#14b8a6"] },
    { id: "violet", label: "Violet (optional)", c: ["#8b5cf6", "#22d3ee"], opt: true }, { id: "rose", label: "Rose (optional)", c: ["#f43f5e", "#f59e0b"], opt: true },
  ];
  function setAccent(id, quiet) {
    if (A.themes) { const t = A.themes.apply(id, { keepMode: true }); if (!quiet) ui().toast(`Theme colour: ${esc(t.name.replace(" (optional)", ""))}`, { ms: 1200 }); return; }
    if (!ACCENTS.some((a) => a.id === id)) id = "amber";
    document.documentElement.setAttribute("data-accent", id);
    try { localStorage.setItem("asfe:accent", id); } catch (e) {}
    $$("[data-accent-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.accentSet === id)));
    if (!quiet) ui().toast(`Theme colour: ${esc(ACCENTS.find((a) => a.id === id).label.replace(" (optional)", ""))}`, { ms: 1200 });
  }
  const accentPicker = () => `<div class="swatches" role="group" aria-label="Accent colour">${ACCENTS.map((a) => `<button class="swatch ${a.opt ? "swatch--opt" : ""}" data-accent-set="${a.id}" aria-pressed="${(document.documentElement.getAttribute("data-accent") || "amber") === a.id}" title="${esc(a.label)}" aria-label="${esc(a.label)}" style="--a:${a.c[0]};--b:${a.c[1]}"></button>`).join("")}</div>`;

  /* ================================================================ popovers (context menu, playlist picker, goal, theme) */
  let pop = null;
  function closePop() { if (pop) { const f = pop.ret; pop.el.remove(); pop = null; if (f && f.focus) try { f.focus(); } catch (x) {} } }
  function openPop(html, anchor, o) {
    closePop();
    o = o || {};
    const el = document.createElement("div");
    el.className = "pop " + (o.cls || "");
    el.setAttribute("role", o.role || "menu");
    el.innerHTML = html;
    document.body.appendChild(el);
    const W = window.innerWidth, H = window.innerHeight;
    const r = el.getBoundingClientRect();
    let x, y;
    if (o.x != null) { x = o.x; y = o.y; } else { const a = anchor.getBoundingClientRect(); x = a.right - r.width; y = a.bottom + 6; if (x < 8) x = a.left; }
    x = clamp(x, 8, Math.max(8, W - r.width - 8)); if (y + r.height > H - 8) y = Math.max(8, (o.y != null ? o.y : anchor.getBoundingClientRect().top) - r.height - 6);
    el.style.left = x + "px"; el.style.top = y + "px";
    pop = { el, ret: o.ret || anchor };
    const first = el.querySelector("button, a, input"); if (first) setTimeout(() => first.focus(), 10);
    return el;
  }
  document.addEventListener("pointerdown", (ev) => { if (pop && !pop.el.contains(ev.target)) closePop(); }, true);
  document.addEventListener("keydown", (ev) => {
    if (!pop) return;
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); closePop(); return; }
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      const items = $$("button:not([disabled]), a, input", pop.el); const i = items.indexOf(document.activeElement);
      ev.preventDefault(); ev.stopPropagation();
      const n = items[(i + (ev.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]; n && n.focus();
    }
  }, true);

  function ctxHTML(id) {
    const e = STATE.byId.get(id); const st = h().stateOf(id); const rt = L().RATINGS[id] || 0;
    const later = L().LATER.includes(id), q = L().QUEUE.includes(id);
    return `<p class="pop__h">${esc(e.title.slice(0, 70))}${e.title.length > 70 ? "…" : ""}</p>
      <button class="pop__i" data-ctx="play">${ui().ICON.play}<span>Play</span><kbd>Enter</kbd></button>
      <button class="pop__i" data-ctx="next">${ui().ICON.queue}<span>Play next</span></button>
      <button class="pop__i" data-ctx="queue">${q ? ui().ICON.queued : ui().ICON.queue}<span>${q ? "Remove from queue" : "Add to queue"}</span></button>
      <button class="pop__i" data-ctx="later">${ui().ICON.later}<span>${later ? "Remove from Watch later" : "Watch later"}</span></button>
      <button class="pop__i" data-ctx="playlist">${ui().ICON.list}<span>Add to playlist…</span></button>
      <button class="pop__i" data-ctx="pick">${ui().ICON.spark}<span>Add to Today's picks</span></button>
      <button class="pop__i" data-ctx="watched">${ui().ICON.check}<span>${st === "done" ? "Mark unwatched" : "Mark as watched"}</span><kbd>W</kbd></button>
      <div class="pop__stars" role="group" aria-label="Rate">${[1, 2, 3, 4, 5].map((n) => `<button data-ctx="rate" data-n="${n}" aria-pressed="${rt >= n}" aria-label="Rate ${n} of 5">★</button>`).join("")}</div>
      <button class="pop__i" data-ctx="open">${ui().ICON.spark}<span>Details & chapter report</span></button>
      <a class="pop__i" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer" data-ctx="yt">${ui().ICON.yt}<span>Open on YouTube</span></a>
      <button class="pop__i" data-ctx="link">${ui().ICON.link}<span>Copy link</span></button>
      <button class="pop__i" data-ctx="card">${ui().ICON.share}<span>Share card image</span></button>`;
  }
  function openCtx(id, anchor, x, y) {
    if (!STATE.byId.has(id)) return;
    const el = openPop(ctxHTML(id), anchor, { x, y, ret: anchor });
    el.dataset.id = id;
    el.onclick = (ev) => {
      const b = ev.target.closest("[data-ctx]"); if (!b) return;
      const a = b.dataset.ctx;
      if (a === "yt") { closePop(); return; }
      if (a === "playlist") { playlistPicker(id, anchor, x, y); return; }
      if (a === "rate") { h().rate(id, Number(b.dataset.n)); el.innerHTML = ctxHTML(id); refresh(id); return; }
      closePop();
      act(a === "next" ? "playnext" : a === "card" ? "sharecard" : a, id, anchor);
    };
  }
  function playlistPicker(id, anchor, x, y) {
    const lists = L().PLAYLISTS;
    const html = `<p class="pop__h">Save to…</p>
      <button class="pop__i" data-pl="later" aria-pressed="${L().LATER.includes(id)}">${ui().ICON.later}<span>Watch later</span>${L().LATER.includes(id) ? ui().ICON.check : ""}</button>
      ${lists.map((p) => `<button class="pop__i" data-pl="${esc(p.id)}" aria-pressed="${p.ids.includes(id)}">${ui().ICON.list}<span>${esc(p.name)} <small>${p.ids.length}</small></span>${p.ids.includes(id) ? ui().ICON.check : ""}</button>`).join("")}
      <form class="pop__new" data-plnew><input class="input input--sm" name="n" maxlength="80" placeholder="New playlist name" aria-label="New playlist name"><button class="btn btn--sm">Create</button></form>`;
    const el = openPop(html, anchor, { x, y, ret: anchor });
    el.onclick = (ev) => {
      const b = ev.target.closest("[data-pl]"); if (!b) return;
      let added = false;
      if (b.dataset.pl === "later") { const on = h().toggleLater(id); added = on; ui().toast(on ? "Saved to Watch later" : "Removed from Watch later", { icon: "🕒", ms: 1400 }); }
      else { const p = h().playlist(b.dataset.pl); if (p.ids.includes(id)) { h().removeFromPlaylist(p.id, id); ui().toast(`Removed from ${esc(p.name)}`, { ms: 1300 }); } else { h().addToPlaylist(p.id, id); added = true; ui().toast(`Added to <b>${esc(p.name)}</b>`, { icon: "🎚️", ms: 1500 }); } }
      closePop(); refresh(id); if (added) fx("playlist", anchor, true);
    };
    el.querySelector("[data-plnew]").onsubmit = (ev) => { ev.preventDefault(); const n = ev.target.n.value.trim(); if (!n) return; const p = h().createPlaylist(n, [id]); ui().toast(`Created <b>${esc(p.name)}</b> with this episode`, { icon: "🎚️" }); closePop(); fx("playlist", anchor, true); };
  }
  document.addEventListener("contextmenu", (ev) => {
    const card = ev.target.closest && ev.target.closest(".card[data-id], .lrow[data-id], .wrow[data-id], .hrow[data-id], .qrow[data-id]");
    if (!card || ev.shiftKey) return;
    ev.preventDefault();
    openCtx(card.dataset.id, card, ev.clientX, ev.clientY);
  });

  /* ================================================================ card actions (called from the app's click handler) */
  function act(a, id, el) {
    const e = STATE.byId.get(id); if (!e) return false;
    if (a === "menu") { openCtx(id, el); return true; }
    if (a === "watched") {
      if (h().stateOf(id) === "done") { h().unmarkWatched(id); ui().toast("Marked as unwatched", { icon: "↩️", ms: 1500 }); fx("unwatch", el, false); }
      else { if (A.P.cur && A.P.cur.id === id) { A.player.tick(true); A.player.flush(); } h().markWatched(id); ui().toast(`Marked as watched: <b>${esc(e.title.slice(0, 50))}</b>`, { icon: "✅", action: { label: "Undo", fn: () => { h().unmarkWatched(id); refresh(id); rerenderIf(id); } } }); fx("watched", el, true); }
      refresh(id); rerenderIf(id); return true;
    }
    if (a === "later") { const on = h().toggleLater(id); ui().toast(on ? "Saved to Watch later" : "Removed from Watch later", { icon: "🕒", ms: 1400 }); refresh(id); fx("later", el, on); return true; }
    if (a === "playlist") { playlistPicker(id, el); return true; }
    if (a === "playnext") { h().queueNext(id); A.views.paintQueueCount(); ui().toast("Plays next", { icon: "⏭️", ms: 1300 }); refresh(id); fx("queue", el, true); return true; }
    if (a === "pick") { if (A.picks && A.picks.add(id, "menu")) ui().toast("Added to Today's picks", { icon: "🎯", ms: 1500 }); return true; }
    if (a === "sharecard") { shareCard(id, A.P.cur && A.P.cur.id === id ? A.player.curTime() : 0); return true; }
    if (a === "link") { A.views.copyLinkAt(id, 0); return true; }
    if (a === "play") { A.player.play(id); return true; }
    if (a === "open") { A.views.openDrawer(id); return true; }
    if (a === "queue") { const on = h().toggleQueue(id); A.views.paintQueueCount(); ui().toast(on ? "Added to queue" : "Removed from queue", { ms: 1300 }); refresh(id); fx("queue", el, on); if (A.app.view() === "queue") A.views.queueSync(id, on); return true; }
    return false;
  }
  /* targeted follow-ups after a watched toggle: the watched checklist and cards patch in place (refreshCardsFor);
   * only the history timeline (whose rows are the log itself) re-renders, and Today's picks animates its own card */
  function rerenderIf(id) { const v = A.app.view(); if (v === "history") renderHistory(); if (A.picks && id) A.picks.sync(id); if (v === "recent" && A.feat.renderRecent) A.feat.renderRecent(); }
  function patchWRow(id) {
    const v = V("watched"); if (!v || v.hidden) return;
    const row = v.querySelector(`.wrow[data-id="${A.cssEsc(id)}"]`);
    const doneN = STATE.all.filter((e) => h().stateOf(e.id) === "done").length;
    const wd = $("#wDone"); if (wd) wd.textContent = doneN;
    if (!row) return;
    const st = h().stateOf(id), r = L().H.eps[id];
    row.classList.toggle("is-done", st === "done");
    const box = row.querySelector(".wrow__st");
    if (box) {
      let s0 = box.querySelector(":scope > .ok, :scope > .muted");
      const html = st === "done" ? `<span class="ok">${ui().ICON.check}${h().isManual(id) ? "Marked" : "Played"}</span>` : st === "progress" ? `<span class="muted">${Math.round((r.pct || 0) * 100)}% · at ${fmtTime(r.pos)}</span>` : "";
      if (s0) s0.remove();
      if (html) box.insertAdjacentHTML("afterbegin", html);
      const b = box.querySelector('[data-act="watched"]'); if (b) { b.textContent = st === "done" ? "Unmark" : "Mark watched"; b.classList.toggle("btn--ghost", st === "done"); b.setAttribute("aria-pressed", String(st === "done")); }
    }
    const sec = row.closest(".wmonth");
    if (sec) { const ids = [...sec.querySelectorAll(".wrow")].map((x) => x.dataset.id); const sm = sec.querySelector(".wmonth__hd small"); if (sm) sm.textContent = `${ids.filter((x) => h().stateOf(x) === "done").length}/${ids.length} watched`; }
    const hide = (W.show === "unwatched" && st === "done") || (W.show === "watched" && st !== "done");
    if (hide) { if (A.RM) row.remove(); else { row.classList.add("is-out"); setTimeout(() => row.remove(), 340); } }
  }

  /* ================================================================ ratings + personal tags */
  function rateTagHTML(id) {
    const rt = L().RATINGS[id] || 0, tags = L().UTAGS[id] || [];
    return `<div class="rt" data-rt="${esc(id)}"><div class="stars" role="group" aria-label="Your rating">${[1, 2, 3, 4, 5].map((n) => `<button class="star ${rt >= n ? "is-on" : ""}" data-rate="${n}" aria-pressed="${rt >= n}" aria-label="Rate ${n} of 5">★</button>`).join("")}<small>${rt ? `You rated ${rt}/5` : "Rate it"}</small></div>
      <div class="utags">${tags.map((t) => `<span class="utag">#${esc(t)}<button data-untag="${esc(t)}" aria-label="Remove tag ${esc(t)}">×</button></span>`).join("")}<form data-tagform><input class="input input--sm" name="t" maxlength="32" placeholder="+ personal tag" aria-label="Add a personal tag"></form></div></div>`;
  }
  document.addEventListener("click", (ev) => {
    const box = ev.target.closest && ev.target.closest("[data-rt]"); if (!box) return;
    const id = box.dataset.rt;
    const r = ev.target.closest("[data-rate]");
    if (r) { const n = h().rate(id, Number(r.dataset.rate)); refresh(id); fx("rate", r, n > 0); return; }
    const u = ev.target.closest("[data-untag]");
    if (u) { h().setTags(id, (L().UTAGS[id] || []).filter((t) => t !== u.dataset.untag)); box.outerHTML = rateTagHTML(id); }
  });
  document.addEventListener("submit", (ev) => {
    const f = ev.target.closest && ev.target.closest("[data-tagform]"); if (!f) return;
    ev.preventDefault();
    const box = f.closest("[data-rt]"); const id = box.dataset.rt; const v = f.t.value.replace(/^#/, "").trim();
    if (!v) return;
    h().setTags(id, (L().UTAGS[id] || []).concat(v.split(/[,\s]+/)));
    box.outerHTML = rateTagHTML(id);
    const nb = $(`[data-rt="${A.cssEsc(id)}"] input`); nb && nb.focus();
  });

  /* ================================================================ HOME additions: continue banner + recently watched */
  function paintHomeTop() {
    const v = V("home"); if (!v) return;
    let top = $("#homeTop", v);
    if (!top) { top = document.createElement("div"); top.id = "homeTop"; v.prepend(top); }
    const cont = h().inProgress()[0];
    let banner = "";
    if (cont && !sessionStorage.getItem("asfe:hideCont")) {
      const r = L().H.eps[cont.id]; const ci = cont.chapters.filter((c) => c.t != null && c.t <= r.pos).pop();
      banner = `<section class="contb" data-id="${cont.id}" aria-label="Continue where you left off">
        <button class="contb__th thumb" data-act="play" aria-label="Resume ${esc(cont.title)}">${ui().thumbImg(cont, true)}${ui().thumbBadges(cont)}<span class="thumb__play">${ui().ICON.play}</span></button>
        <div class="contb__tx"><p class="eyebrow">Continue where you left off</p><h2>${esc(cont.title)}</h2><p class="muted">${ui().metaDate(cont)} · ${esc(ui().whoLine(cont, 3))} · at <b>${fmtTime(r.pos)}</b> of ${esc(cont.durStr)}${ci ? ` · ${esc(ci.title)}` : ""}</p>
        <div class="contb__bar"><i style="width:${Math.round(100 * r.pos / Math.max(1, cont.dur || r.dur))}%"></i></div></div>
        <div class="contb__act"><button class="btn btn--primary" data-act="play">${ui().ICON.play}<span>Resume</span></button><button class="iconbtn" id="contHide" aria-label="Hide for now">✕</button></div></section>`;
    }
    top.innerHTML = banner + (Object.keys(L().H.eps).length ? goalCard() : "");
    // Today's picks sits above everything else on Home (its own node, never rebuilt by this function)
    if (A.picks) { let pk = $("#picks", v); if (!pk) { pk = document.createElement("section"); pk.id = "picks"; pk.className = "picks"; pk.setAttribute("aria-label", "Today's picks"); v.prepend(pk); A.picks.render(pk); } else if (pk !== v.firstElementChild) v.prepend(pk); }
    const hide = $("#contHide"); if (hide) hide.onclick = () => { sessionStorage.setItem("asfe:hideCont", "1"); paintHomeTop(); };
    enhance(top);
  }
  /* Recently watched: its own page (moved off Home), linked from History and the nav */
  function renderRecent() {
    const v = V("recent"); if (!v) return;
    const recent = h().recentlyWatched();
    v.innerHTML = `<header class="phead phead--row"><div><p class="eyebrow"><a href="#/history">History</a></p><h1>Recently watched</h1><p class="lede">${recent.length} episode${recent.length === 1 ? "" : "s"} you played here or marked as watched, newest first.</p></div>
      <div class="row-gap"><a class="btn btn--sm" href="#/history">${ui().ICON.clock}<span>Full watch history</span></a><a class="btn btn--sm btn--ghost" href="#/watched">I've watched these</a></div></header>
      ${recent.length ? `<div class="grid">${recent.map((e) => ui().card(e)).join("")}</div>` : `<div class="emptybig"><p>Nothing watched yet.</p><p class="muted">Start with Today's picks on Home.</p><a class="btn" href="#/home">Go to Today's picks</a></div>`}`;
  }
  function goalCard() {
    const sec = h().todaySec(), goal = h().goalSec(), st = h().streaks();
    const fr = clamp(sec / goal, 0, 1);
    return `<section class="goalcard"><div class="ringbig" style="--p:${(fr * 100).toFixed(1)}"><b>${Math.round(sec / 60)}</b><small>/ ${Math.round(goal / 60)} min</small></div>
      <div><p class="eyebrow">Today's goal</p><h2>${fr >= 1 ? "Goal reached. Nice work." : `${Math.max(0, Math.ceil((goal - sec) / 60))} minutes to go`}</h2><p class="muted"><span class="flame ${st.cur ? "is-on" : ""}">${ui().ICON.flame}${st.cur}</span> day streak · best ${st.best} · <a href="#/wrapped">Your monthly recap</a> · <a href="#/watched">Tick off what you already saw</a></p></div>
      <div class="goalcard__set" role="group" aria-label="Daily goal">${[10, 20, 30, 45, 60, 90].map((m) => `<button class="chip ${Math.round(goal / 60) === m ? "is-on" : ""}" data-goal="${m}">${m} min</button>`).join("")}</div></section>`;
  }
  document.addEventListener("click", (ev) => {
    const g = ev.target.closest && ev.target.closest("[data-goal]"); if (!g) return;
    L().SETTINGS.dailyGoal = Number(g.dataset.goal); A.store.set("settings:v3", L().SETTINGS);
    paintGoal(); if (A.app.view() === "home") paintHomeTop(); if (pop) closePop();
    ui().toast(`Daily goal: ${g.dataset.goal} minutes`, { icon: "🎯", ms: 1300 });
  });
  function paintGoal() {
    const c = $("#goalChip"); if (!c || !L().H) return;
    const sec = h().todaySec(), goal = h().goalSec(), st = h().streaks();
    $("#goalRing").style.strokeDashoffset = String(97.4 * (1 - clamp(sec / goal, 0, 1)));
    $("#streakNum").textContent = st.cur;
    c.classList.toggle("is-hot", st.cur > 0);
    c.classList.toggle("is-done", sec >= goal);
    c.setAttribute("aria-label", `Daily goal ${Math.round(sec / 60)} of ${Math.round(goal / 60)} minutes, ${st.cur} day streak`);
    c.title = `Today ${Math.round(sec / 60)}/${Math.round(goal / 60)} min · ${st.cur}-day streak (best ${st.best})`;
  }
  setInterval(paintGoal, 30000);

  /* ================================================================ I'VE WATCHED THESE (bulk checklist) */
  const W = { q: "", sp: "", show: "all", sel: new Set(), undo: null };
  function wList() {
    const qf = fold(W.q).trim();
    return STATE.all.filter((e) => {
      const st = h().stateOf(e.id);
      if (W.show === "unwatched" && st === "done") return false;
      if (W.show === "watched" && st !== "done") return false;
      if (W.sp && !e.people.some((p) => p.k === W.sp)) return false;
      if (qf && !(e.hay.title.includes(qf) || e.hay.names.includes(qf) || e.hay.show.includes(qf))) return false;
      return true;
    });
  }
  function wRow(e) {
    const st = h().stateOf(e.id), r = L().H.eps[e.id];
    const on = W.sel.has(e.id);
    return `<li class="wrow ${st === "done" ? "is-done" : ""} ${on ? "is-sel" : ""}" data-id="${e.id}">
      <label class="wrow__ck"><input type="checkbox" data-wsel ${on ? "checked" : ""} aria-label="Select ${esc(e.title)}"><span aria-hidden="true"></span></label>
      <img class="wrow__th thumb__img" src="https://i.ytimg.com/vi/${esc(e.id)}/mqdefault.jpg" alt="" loading="lazy" decoding="async" width="320" height="180">
      <div class="wrow__tx"><button class="card__title" data-act="open">${ui().hl(e.title, W.q)}</button>
        <p class="card__who"><span class="avs">${e.stars.slice(0, 4).map((p) => ui().avatar(p.name, 22)).join("")}</span>${ui().hl(ui().whoLine(e, 3), W.q)}</p>
        ${ui().cardMeta(e, `<span>${esc(ui().showLine(e))}</span>`)}</div>
      <div class="wrow__st">${st === "done" ? `<span class="ok">${ui().ICON.check}${h().isManual(e.id) ? "Marked" : "Played"}</span>` : st === "progress" ? `<span class="muted">${Math.round((r.pct || 0) * 100)}% · at ${fmtTime(r.pos)}</span>` : ""}
        <form class="wrow__up" data-wup><input class="input input--sm" name="t" placeholder="up to mm:ss" aria-label="Watched up to (mm:ss)" size="8" inputmode="numeric"></form>
        <button class="btn btn--sm ${st === "done" ? "btn--ghost" : ""}" data-act="watched">${st === "done" ? "Unmark" : "Mark watched"}</button></div></li>`;
  }
  function renderWatched() {
    const v = V("watched");
    const list = wList();
    const doneN = STATE.all.filter((e) => h().stateOf(e.id) === "done").length;
    const spk = Array.from(STATE.speakers.values()).filter((s) => !s.isHost && s.eps.length >= 2).sort((a, b) => a.name.localeCompare(b.name));
    v.innerHTML = `<header class="phead phead--row"><div><p class="eyebrow">Already watched on YouTube?</p><h1>I've watched these</h1>
      <p class="lede">Tick everything you have already seen. Each mark counts as a full completion in your stats, XP, badges and streak on the day you mark it (labelled “marked”). <b id="wDone">${doneN}</b> of ${STATE.all.length} done.</p></div>
      <div class="row-gap"><label class="btn btn--sm btn--ghost">Import CSV<input type="file" id="wCsv" accept=".csv,text/csv" hidden></label></div></header>
      <div class="wtools"><input class="input" id="wQ" type="search" placeholder="Filter by title, speaker or show" value="${esc(W.q)}" aria-label="Filter episodes">
        <select class="input" id="wSp" aria-label="Filter by speaker"><option value="">All speakers</option>${spk.map((s) => `<option value="${esc(s.k)}" ${W.sp === s.k ? "selected" : ""}>${esc(s.name)} (${s.eps.length})</option>`).join("")}</select>
        <div class="seg seg--sm" role="group" aria-label="Show">${[["all", "All"], ["unwatched", "Not yet"], ["watched", "Watched"]].map(([k, l]) => `<button data-wshow="${k}" aria-pressed="${W.show === k}">${l}</button>`).join("")}</div>
        <button class="btn btn--sm" id="wAll">Select all ${list.length} shown</button></div>
      <div id="wBody">${MONTHS_DESC.map((m) => { const ml = list.filter((e) => e.month === m.id); if (!ml.length) return ""; const allOn = ml.every((e) => W.sel.has(e.id)); const md = ml.filter((e) => h().stateOf(e.id) === "done").length;
        return `<section class="wmonth" data-wm="${m.id}"><header class="wmonth__hd"><label class="wrow__ck"><input type="checkbox" data-wmonth="${m.id}" ${allOn ? "checked" : ""} aria-label="Select all of ${esc(m.long)}"><span aria-hidden="true"></span></label><h2>${esc(m.long)}</h2><small>${md}/${ml.length} watched</small><span class="grow"></span><button class="btn btn--sm btn--ghost" data-wmmark="${m.id}">Mark all ${ml.length} as watched</button></header>
        <ul class="wlist">${ml.map(wRow).join("")}</ul></section>`; }).join("") || `<div class="emptybig"><p>No episodes match.</p></div>`}</div>
      <div class="wbar" id="wBar" ${W.sel.size || W.undo ? "" : "hidden"}><b id="wN">${W.sel.size} selected</b><span class="grow"></span>
        <button class="btn btn--primary btn--sm" id="wMark">${ui().ICON.check}<span>Mark selected as watched</span></button><button class="btn btn--sm" id="wUnmark">Mark unwatched</button><button class="btn btn--sm btn--ghost" id="wClr">Clear</button>${W.undo ? `<button class="btn btn--sm btn--ghost" id="wUndo">Undo last (${W.undo.length})</button>` : ""}</div>`;
    const q = $("#wQ");
    q.oninput = A.debounce(() => { W.q = q.value; renderWatched(); const n = $("#wQ"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 180);
    $("#wSp").onchange = (ev) => { W.sp = ev.target.value; renderWatched(); };
    $$("[data-wshow]", v).forEach((b) => (b.onclick = () => { W.show = b.dataset.wshow; renderWatched(); }));
    $("#wAll").onclick = () => { const l = wList(); const all = l.every((e) => W.sel.has(e.id)); l.forEach((e) => (all ? W.sel.delete(e.id) : W.sel.add(e.id))); renderWatched(); };
    $("#wMark").onclick = () => bulk(true);
    $("#wUnmark").onclick = () => bulk(false);
    $("#wClr").onclick = () => { W.sel.clear(); renderWatched(); };
    const u = $("#wUndo"); if (u) u.onclick = undoBulk;
    $("#wCsv").onchange = async (ev) => { const f = ev.target.files[0]; if (!f) return; try { const r = h().importCSV(await f.text()); ui().toast(`Imported ${r.full} watched + ${r.part} partly watched from ${r.rows} rows`, { icon: "📥", force: true }); renderWatched(); } catch (x) { ui().toast("CSV import failed: " + esc(x.message), { icon: "⚠️", force: true }); } };
    v.onchange = (ev) => {
      const c = ev.target.closest("[data-wsel]");
      if (c) { const id = c.closest("[data-id]").dataset.id; c.checked ? W.sel.add(id) : W.sel.delete(id); c.closest(".wrow").classList.toggle("is-sel", c.checked); syncWBar(); return; }
      const m = ev.target.closest("[data-wmonth]");
      if (m) { wList().filter((e) => e.month === m.dataset.wmonth).forEach((e) => (m.checked ? W.sel.add(e.id) : W.sel.delete(e.id))); renderWatched(); }
    };
    v.onsubmit = (ev) => {
      const f = ev.target.closest("[data-wup]"); if (!f) return;
      ev.preventDefault();
      const id = f.closest("[data-id]").dataset.id; const t = A.toSec(f.t.value.trim());
      if (t == null || t <= 0) { ui().toast("Use mm:ss, e.g. 42:30", { ms: 1600 }); return; }
      h().markWatched(id, { upTo: Math.min(t, STATE.byId.get(id).dur || t) }); ui().toast(`Logged up to ${fmtTime(t)}`, { icon: "⏱️", ms: 1600 }); renderWatched();
    };
    v.onclick = (ev) => {
      const mm = ev.target.closest("[data-wmmark]");
      if (mm) { const ids = wList().filter((e) => e.month === mm.dataset.wmmark).map((e) => e.id); markIds(ids); }
    };
  }
  function syncWBar() {
    const bar = $("#wBar"); if (!bar) return;
    bar.hidden = !W.sel.size && !W.undo;
    $("#wN").textContent = `${W.sel.size} selected`;
    $$("[data-wmonth]").forEach((m) => { const ml = wList().filter((e) => e.month === m.dataset.wmonth); m.checked = ml.length > 0 && ml.every((e) => W.sel.has(e.id)); m.indeterminate = !m.checked && ml.some((e) => W.sel.has(e.id)); });
  }
  function renderWatchedCounts(full) { if (full) renderWatched(); }
  function markIds(ids) {
    const done = h().bulkMark(ids);
    W.undo = done.length ? done : W.undo;
    W.sel.clear();
    renderWatched();
    ui().toast(done.length ? `Marked <b>${done.length}</b> episode${done.length === 1 ? "" : "s"} as watched` : "Those were already watched", { icon: "✅", action: done.length ? { label: "Undo", fn: undoBulk } : null, ms: 7000 });
    paintGoal();
    return done;
  }
  function bulk(on) {
    const ids = Array.from(W.sel);
    if (!ids.length) { ui().toast("Select some episodes first", { ms: 1400 }); return []; }
    if (on) return markIds(ids);
    const done = h().bulkUnmark(ids); W.sel.clear(); W.undo = null; renderWatched();
    ui().toast(`Unmarked ${done.length}`, { icon: "↩️", ms: 2000 });
    return done;
  }
  function undoBulk() { if (!W.undo) return; const n = h().bulkUnmark(W.undo).length; W.undo = null; if (A.app.view() === "watched") renderWatched(); ui().toast(`Undone: ${n} mark${n === 1 ? "" : "s"} removed`, { icon: "↩️", force: true }); paintGoal(); }

  /* ================================================================ HISTORY timeline */
  const HF = { src: "all", status: "all", q: "", day: null };
  function sessionRows() {
    const rows = [];
    STATE.all.forEach((e) => { const r = L().H.eps[e.id]; if (!r) return; (r.sessions || []).forEach((s) => { if (s.w >= 15 || s.src === "manual") rows.push({ e, s, r }); }); });
    return rows.sort((a, b) => b.s.e - a.s.e);
  }
  function filteredRows() {
    const qf = fold(HF.q).trim();
    return sessionRows().filter((x) => {
      if (HF.src === "manual" && x.s.src !== "manual") return false;
      if (HF.src === "played" && x.s.src === "manual") return false;
      if (HF.status === "done" && !x.r.done) return false;
      if (HF.status === "progress" && x.r.done) return false;
      if (HF.day && dayKey(x.s.s) !== HF.day) return false;
      if (qf && !(x.e.hay.title.includes(qf) || x.e.hay.names.includes(qf))) return false;
      return true;
    });
  }
  function bucketOf(ts) {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const t = d0.getTime();
    if (ts >= t) return "Today";
    if (ts >= t - 864e5) return "Yesterday";
    if (ts >= t - 6 * 864e5) return "This week";
    return "Earlier";
  }
  const hm = (ts) => { const d = new Date(ts); return `${A.pad(d.getHours())}:${A.pad(d.getMinutes())}`; };
  function renderHistory() {
    const v = V("history");
    const H = L().H;
    const rows = filteredRows();
    const groups = new Map();
    rows.forEach((x) => { const b = bucketOf(x.s.s); if (!groups.has(b)) groups.set(b, []); groups.get(b).push(x); });
    const all = sessionRows();
    const played = all.filter((x) => x.s.src !== "manual").reduce((a, x) => a + x.s.w, 0);
    const manualN = h().manualCount();
    v.innerHTML = `<header class="phead phead--row"><div><p class="eyebrow">History</p><h1>Watch history</h1>
      <p class="lede">${fmtHM(played)} really played across ${all.filter((x) => x.s.src !== "manual").length} sessions · ${manualN} marked as watched on YouTube · ${h().doneCount()} completed in total.</p></div>
      <div class="row-gap"><a class="btn btn--sm" href="#/recent">Recently watched</a><button class="btn btn--sm" id="hExport">Export JSON</button><button class="btn btn--sm" id="hCsv">Export CSV</button><label class="btn btn--sm btn--ghost">Import JSON / CSV<input type="file" id="hImport" accept="application/json,.json,.csv,text/csv" hidden></label><button class="btn btn--sm btn--danger" id="hClear">Clear all</button></div></header>
      <div class="kpis"><div class="kpi"><b>${hoursStr(played)}</b><span>played</span></div><div class="kpi"><b>${manualN}</b><span>marked watched</span></div><div class="kpi"><b>${h().doneCount()}</b><span>completed</span></div><div class="kpi"><b>${h().streaks().cur}</b><span>day streak</span></div><div class="kpi"><b>${all.length}</b><span>entries</span></div></div>
      <section class="panel panel--flat"><div class="panel__hd"><h2>Your watch activity</h2>${HF.day ? `<button class="chip is-on" id="hDayClr">${esc(fmtDate(HF.day))} ✕</button>` : `<span class="muted">Click a day to see just that day</span>`}</div>${A.charts.watchHeatmap({ day: HF.day })}</section>
      <div class="wtools"><input class="input" id="hQ" type="search" placeholder="Search history by title or speaker" value="${esc(HF.q)}" aria-label="Search history">
        <div class="seg seg--sm" role="group" aria-label="Source">${[["all", "All"], ["played", "Played here"], ["manual", "Marked watched"]].map(([k, l]) => `<button data-hsrc="${k}" aria-pressed="${HF.src === k}">${l}</button>`).join("")}</div>
        <div class="seg seg--sm" role="group" aria-label="Status">${[["all", "Any status"], ["done", "Completed"], ["progress", "In progress"]].map(([k, l]) => `<button data-hst="${k}" aria-pressed="${HF.status === k}">${l}</button>`).join("")}</div><span class="muted">${rows.length} entr${rows.length === 1 ? "y" : "ies"}</span></div>
      ${groups.size ? ["Today", "Yesterday", "This week", "Earlier"].filter((g) => groups.has(g)).map((g) => { const list = groups.get(g); return `<section class="hday"><h2>${g} <small>${fmtHM(list.reduce((a, x) => a + (x.s.src === "manual" ? 0 : x.s.w), 0))} played${list.some((x) => x.s.src === "manual") ? ` · ${list.filter((x) => x.s.src === "manual").length} marked` : ""}</small></h2>
        <ol class="timeline">${list.map((x) => { const dur = x.e.dur || x.r.dur || 1; const reach = Math.round(100 * clamp(x.s.b / dur, 0, 1)); const man = x.s.src === "manual";
          return `<li class="hrow ${man ? "hrow--manual" : ""}" data-id="${x.e.id}"><span class="tl__dot" aria-hidden="true"></span><button class="thumb thumb--sm" data-act="play" aria-label="Play ${esc(x.e.title)}">${ui().thumbImg(x.e)}${ui().thumbBadges(x.e)}<span class="thumb__bar"><i style="width:${Math.round((x.r.pct || 0) * 100)}%"></i></span></button>
          <div class="hrow__tx"><button class="card__title" data-act="open">${ui().hl(x.e.title, HF.q)}</button>
          <p class="card__meta">${ui().metaCore(x.e)}${g === "Earlier" || g === "This week" ? `<span>${esc(fmtDate(dayKey(x.s.s)))}</span>` : ""}<span>${man ? `marked ${hm(x.s.s)}` : `${hm(x.s.s)}–${hm(x.s.e)}`}</span><span>${man ? `${fmtHM(x.s.w)} logged` : `${fmtHM(x.s.w)} watched`}</span><span>${fmtTime(x.s.a)} → ${fmtTime(x.s.b)}</span><span>reached ${reach}%</span><span>${Math.round((x.r.pct || 0) * 100)}% covered</span>
          <span class="tagc ${man ? "tagc--m" : "tagc--p"}">${man ? "Marked watched" : "Played here"}</span>${x.r.done ? `<span class="ok">✓ completed</span>` : `<span class="tagc">in progress</span>`}</p></div>
          <div class="hrow__act"><button class="iconbtn iconbtn--sm" data-jump="${x.e.id}|${Math.max(0, x.s.b - 5)}" aria-label="Resume from ${fmtTime(x.s.b)}" title="Resume from here">${ui().ICON.play}</button>${man ? `<button class="iconbtn iconbtn--sm" data-hunmark="${x.e.id}" aria-label="Undo mark" title="Undo mark">↩</button>` : ""}<button class="iconbtn iconbtn--sm" data-clear="${x.e.id}" aria-label="Remove episode from history" title="Remove from history">${ui().ICON.trash}</button></div></li>`; }).join("")}</ol></section>`; }).join("")
        : `<div class="emptybig"><p>${all.length ? "Nothing matches these filters." : "Nothing yet. Press play on anything, or tick off what you have already seen."}</p>${all.length ? "" : `<a class="btn" href="#/watched">I've watched these</a>`}</div>`}`;
    $("#hExport").onclick = () => download(`ai-safety-episodes-backup-${dayKey(Date.now())}.json`, JSON.stringify(h().exportAll(), null, 1), "application/json");
    $("#hCsv").onclick = () => download(`ai-safety-episodes-history-${dayKey(Date.now())}.csv`, h().exportCSV(sessionRows()), "text/csv");
    $("#hImport").onchange = async (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      try {
        const text = await f.text();
        if (/\.csv$/i.test(f.name) || /^[^{[]/.test(text.trim())) { const r = h().importCSV(text); ui().toast(`Imported ${r.full} watched + ${r.part} partly watched`, { icon: "📥", force: true }); }
        else { h().importAll(JSON.parse(text)); ui().toast("Backup restored (checked and cleaned)", { icon: "✅", force: true }); }
        A.app.rerender();
      } catch (x) { ui().toast("That file could not be imported: " + esc(x.message), { icon: "⚠️", force: true }); }
    };
    $("#hClear").onclick = async () => { if (await ui().confirmBox("Clear <b>all</b> watch history, notes, favourites, queue, playlists, ratings, follows and badges? Export a backup first if unsure.", "Clear everything", true)) { h().resetAll(); A.app.rerender(); } };
    const dc = $("#hDayClr"); if (dc) dc.onclick = () => { HF.day = null; renderHistory(); };
    const q = $("#hQ"); q.oninput = A.debounce(() => { HF.q = q.value; renderHistory(); const n = $("#hQ"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 200);
    $$("[data-hsrc]", v).forEach((b) => (b.onclick = () => { HF.src = b.dataset.hsrc; renderHistory(); }));
    $$("[data-hst]", v).forEach((b) => (b.onclick = () => { HF.status = b.dataset.hst; renderHistory(); }));
    v.onclick = async (ev) => {
      const c = ev.target.closest("[data-clear]");
      if (c) { if (await ui().confirmBox("Remove this episode and all its sessions from your history?", "Remove", true)) { h().clearOne(c.dataset.clear); renderHistory(); h().checkAwards(true); refresh(c.dataset.clear); } return; }
      const u = ev.target.closest("[data-hunmark]");
      if (u) { h().unmarkWatched(u.dataset.hunmark); renderHistory(); refresh(u.dataset.hunmark); return; }
      const d = ev.target.closest('[data-hm="watch"] [data-hmday]');
      if (d) { HF.day = HF.day === d.dataset.hmday ? null : d.dataset.hmday; renderHistory(); }
    };
  }

  /* ================================================================ PLAYLISTS */
  function plCover(ids) { const e = ids.map((id) => STATE.byId.get(id)).filter(Boolean).slice(0, 4); return `<span class="plc">${e.map((x) => `<img src="https://i.ytimg.com/vi/${esc(x.id)}/mqdefault.jpg" alt="" loading="lazy" decoding="async" width="320" height="180">`).join("") || `<span class="plc__empty">${ui().ICON.list}</span>`}</span>`; }
  function renderPlaylists(arg) {
    const v = V("playlists");
    if (arg) return renderPlaylist(v, arg);
    const lists = L().PLAYLISTS;
    v.innerHTML = `<header class="phead phead--row"><div><p class="eyebrow">Library</p><h1>Playlists & Watch later</h1><p class="lede">Right-click any card (or its ⋯ button) to save it. Playing a playlist fills your queue in order.</p></div>
      <form class="row-gap" id="plNew"><input class="input input--sm" name="n" maxlength="80" placeholder="New playlist name" aria-label="New playlist name" required><button class="btn btn--primary btn--sm">${ui().ICON.plus}<span>Create</span></button></form></header>
      <div class="plgrid"><a class="plcard" href="#/playlist/later">${plCover(L().LATER)}<b>Watch later</b><small>${L().LATER.length} episode${L().LATER.length === 1 ? "" : "s"}</small></a>
      ${lists.map((p) => `<a class="plcard" href="#/playlist/${esc(p.id)}">${plCover(p.ids)}<b>${esc(p.name)}</b><small>${p.ids.length} episode${p.ids.length === 1 ? "" : "s"} · ${fmtHM(p.ids.reduce((a, id) => a + ((STATE.byId.get(id) || {}).dur || 0), 0))}</small></a>`).join("")}</div>`;
    $("#plNew").onsubmit = (ev) => { ev.preventDefault(); const p = h().createPlaylist(ev.target.n.value.trim()); location.hash = "#/playlist/" + p.id; };
  }
  function renderPlaylist(v, pid) {
    const later = pid === "later";
    const p = later ? { id: "later", name: "Watch later", ids: L().LATER } : h().playlist(pid);
    if (!p) { v.innerHTML = `<div class="emptybig"><p>That playlist no longer exists.</p><a class="btn" href="#/playlists">All playlists</a></div>`; return; }
    const list = p.ids.map((id) => STATE.byId.get(id)).filter(Boolean);
    v.innerHTML = `<header class="phead phead--row"><div><p class="eyebrow"><a href="#/playlists">Playlists</a></p>${later ? `<h1>Watch later</h1>` : `<h1><input class="h1input" id="plName" value="${esc(p.name)}" maxlength="80" aria-label="Playlist name"></h1>`}<p class="lede">${list.length} episodes · ${fmtHM(list.reduce((a, e) => a + e.dur, 0))}</p></div>
      <div class="row-gap">${list.length ? `<button class="btn btn--primary btn--sm" id="plPlay">${ui().ICON.play}<span>Play all</span></button><button class="btn btn--sm" id="plShuf">${ui().ICON.shuffle}<span>Shuffle</span></button>` : ""}${later ? "" : `<button class="btn btn--sm btn--danger" id="plDel">Delete</button>`}</div></header>
      ${list.length ? `<ol class="qlist" id="plList">${list.map((e, i) => `<li class="qrow" draggable="true" data-id="${e.id}" data-i="${i}"><span class="qrow__grip" aria-hidden="true">⋮⋮</span><span class="qrow__n">${i + 1}</span><button class="thumb thumb--sm" data-act="play" aria-label="Play ${esc(e.title)}">${ui().thumbImg(e)}${ui().thumbBadges(e)}</button><div class="hrow__tx"><button class="card__title" data-act="open">${esc(e.title)}</button>${ui().cardMeta(e, `<span>${esc(ui().whoLine(e, 2))}</span>${h().stateOf(e.id) === "done" ? `<span class="ok">✓ watched</span>` : ""}`)}</div>
        <div class="qrow__act"><button class="iconbtn iconbtn--sm" data-plmv="-1" aria-label="Move up">↑</button><button class="iconbtn iconbtn--sm" data-plmv="1" aria-label="Move down">↓</button><button class="iconbtn iconbtn--sm" data-plrm aria-label="Remove from playlist">✕</button></div></li>`).join("")}</ol>`
        : `<div class="emptybig"><p>Empty for now.</p><p class="muted">Use “Add to playlist…” from any card's ⋯ menu.</p><a class="btn" href="#/browse">Browse</a></div>`}`;
    const ids = () => (later ? L().LATER : h().playlist(pid).ids);
    const save = (arr) => { if (later) { L().LATER = arr; h().saveLib(); } else { h().playlist(pid).ids = arr; h().saveLib(); } renderPlaylist(v, pid); };
    const nm = $("#plName"); if (nm) nm.onchange = () => h().renamePlaylist(pid, nm.value.trim());
    const del = $("#plDel"); if (del) del.onclick = async () => { if (await ui().confirmBox(`Delete the playlist <b>${esc(p.name)}</b>? The episodes stay in the library.`, "Delete", true)) { h().deletePlaylist(pid); location.hash = "#/playlists"; } };
    const pl = $("#plPlay"); if (pl) pl.onclick = () => { const a = ids().slice(); h().setQueue(a.slice(1).concat(L().QUEUE.filter((x) => !a.includes(x)))); A.views.paintQueueCount(); A.player.play(a[0]); };
    const sh = $("#plShuf"); if (sh) sh.onclick = () => { const a = ids().slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } h().setQueue(a.slice(1)); A.views.paintQueueCount(); A.player.play(a[0]); };
    const ol = $("#plList"); if (!ol) return;
    ol.onclick = (ev) => {
      const li = ev.target.closest("[data-i]"); if (!li) return;
      const i = +li.dataset.i;
      const mv = ev.target.closest("[data-plmv]");
      if (mv) { const a = ids().slice(); const j = i + Number(mv.dataset.plmv); if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; save(a); }
      if (ev.target.closest("[data-plrm]")) { const a = ids().slice(); a.splice(i, 1); save(a); }
    };
    let dragI = null;
    ol.addEventListener("dragstart", (ev) => { const li = ev.target.closest("[data-i]"); if (!li) return; dragI = +li.dataset.i; li.classList.add("is-drag"); });
    ol.addEventListener("dragover", (ev) => ev.preventDefault());
    ol.addEventListener("drop", (ev) => { ev.preventDefault(); const li = ev.target.closest("[data-i]"); if (!li || dragI == null) return; const a = ids().slice(); const [x] = a.splice(dragI, 1); a.splice(+li.dataset.i, 0, x); dragI = null; save(a); });
  }

  /* ================================================================ MONTHLY RECAP ("wrapped") */
  let wrapM = null;
  function recapFor(mid) {
    const days = Object.keys(L().H.daily).filter((k) => k.startsWith(mid));
    const total = days.reduce((a, k) => a + L().H.daily[k], 0);
    const manual = days.reduce((a, k) => a + (L().H.manualDaily[k] || 0), 0);
    const per = new Map(); let longest = 0, longestE = null; let marks = 0;
    STATE.all.forEach((e) => { const r = L().H.eps[e.id]; if (!r) return; (r.sessions || []).forEach((s) => { if (dayKey(s.s).startsWith(mid)) { per.set(e.id, (per.get(e.id) || 0) + s.w); if (s.src === "manual") marks++; else if (s.w > longest) { longest = s.w; longestE = e; } } }); });
    const completed = STATE.all.filter((e) => { const r = L().H.eps[e.id]; return r && r.done && r.doneAt && dayKey(r.doneAt).startsWith(mid); });
    const sp = new Map(), tg = new Map();
    per.forEach((sec, id) => { const e = STATE.byId.get(id); e.stars.forEach((p) => sp.set(p.k, (sp.get(p.k) || 0) + sec)); e.tags.forEach((t) => tg.set(t, (tg.get(t) || 0) + sec)); });
    const busiest = days.sort((a, b) => L().H.daily[b] - L().H.daily[a])[0] || null;
    const badges = h().BADGES.filter((b) => L().EARNED[b.id] && dayKey(L().EARNED[b.id]).startsWith(mid));
    return { mid, total, manual, played: total - manual, days: days.length, completed, marks, longest, longestE, busiest, topSp: Array.from(sp.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ s: STATE.speakers.get(k), v })).filter((x) => x.s), topTags: Array.from(tg.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6), badges, eps: per.size };
  }
  function renderWrapped() {
    const v = V("wrapped");
    const nowM = dayKey(Date.now()).slice(0, 7);
    const months = Array.from(new Set(Object.keys(L().H.daily).map((k) => k.slice(0, 7)).concat([nowM]))).sort().reverse();
    if (!wrapM || !months.includes(wrapM)) wrapM = months[0];
    const R = recapFor(wrapM);
    const [y, m] = wrapM.split("-").map(Number);
    const mname = new Date(y, m - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
    v.innerHTML = `<header class="phead phead--row"><div><p class="eyebrow">Your recap</p><h1>${esc(mname)}, wrapped</h1><p class="lede">Everything you watched and ticked off this month, in one colourful page.</p></div>
      <div class="row-gap"><select class="input input--sm" id="wrapSel" aria-label="Month">${months.map((x) => `<option value="${x}" ${x === wrapM ? "selected" : ""}>${esc(new Date(+x.slice(0, 4), +x.slice(5) - 1, 1).toLocaleString("en", { month: "long", year: "numeric" }))}</option>`).join("")}</select><button class="btn btn--primary btn--sm" id="wrapShare">${ui().ICON.share}<span>Share recap image</span></button></div></header>
      <div class="wrap">
        <div class="wt wt--a"><small>Time with the library</small><b>${hoursStr(R.total)}</b><span>${fmtHM(R.played)} played · ${fmtHM(R.manual)} marked</span></div>
        <div class="wt wt--b"><small>Episodes completed</small><b>${R.completed.length}</b><span>${R.marks} marked as watched</span></div>
        <div class="wt wt--c"><small>Active days</small><b>${R.days}</b><span>${R.busiest ? `busiest: ${esc(fmtDate(R.busiest))}` : "start a streak today"}</span></div>
        <div class="wt wt--d"><small>Longest session</small><b>${fmtHM(R.longest)}</b><span>${R.longestE ? esc(R.longestE.title.slice(0, 60)) : "–"}</span></div>
        <div class="wt wt--e wt--wide"><small>Your top voices</small><div class="wt__faces">${R.topSp.map((x) => `<a href="#/speaker/${esc(x.s.slug)}">${ui().avatar(x.s.name, 64, "av--ring")}<b>${esc(x.s.name)}</b><span>${fmtHM(x.v)}</span></a>`).join("") || `<span class="muted">Watch something to see your top voices.</span>`}</div></div>
        <div class="wt wt--f"><small>Top topics</small><p class="tags">${R.topTags.map(([t]) => `<a class="tag" href="#/browse?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join("") || "–"}</p></div>
        <div class="wt wt--g"><small>Badges earned</small><p class="wt__badges">${R.badges.map((b) => `<span title="${esc(b.name)}">${esc(b.icon)}</span>`).join("") || "–"}</p><span>${R.badges.length} new</span></div>
      </div>`;
    $("#wrapSel").onchange = (ev) => { wrapM = ev.target.value; renderWrapped(); };
    $("#wrapShare").onclick = () => shareRecap(R, mname);
  }

  /* ================================================================ share-card images (canvas) */
  function loadImg(src, cors) { return new Promise((res) => { const i = new Image(); if (cors) i.crossOrigin = "anonymous"; i.decoding = "async"; const to = setTimeout(() => res(null), 4000); i.onload = () => { clearTimeout(to); res(i); }; i.onerror = () => { clearTimeout(to); res(null); }; i.src = src; }); }
  function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
    const words = String(text).split(/\s+/); let line = "", n = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { if (n === maxLines - 1) { ctx.fillText(line.replace(/\s*\S*$/, "") + "…", x, y + n * lh); return n + 1; } ctx.fillText(line, x, y + n * lh); n++; line = words[i]; } else line = test;
    }
    if (line) { ctx.fillText(line, x, y + n * lh); n++; }
    return n;
  }
  function accentColors() { const cs = getComputedStyle(document.documentElement); return [(cs.getPropertyValue("--amber") || "#f59e0b").trim() || "#f59e0b", (cs.getPropertyValue("--teal") || "#14b8a6").trim() || "#14b8a6"]; }
  async function baseCanvas() {
    const c = document.createElement("canvas"); c.width = 1200; c.height = 630;
    const ctx = c.getContext && c.getContext("2d");
    if (!ctx) return null;
    const [a, b] = accentColors();
    ctx.fillStyle = "#070b12"; ctx.fillRect(0, 0, 1200, 630);
    const g1 = ctx.createRadialGradient(1000, 80, 20, 1000, 80, 700); g1.addColorStop(0, a + "aa"); g1.addColorStop(1, "transparent"); ctx.fillStyle = g1; ctx.fillRect(0, 0, 1200, 630);
    const g2 = ctx.createRadialGradient(120, 600, 20, 120, 600, 700); g2.addColorStop(0, b + "99"); g2.addColorStop(1, "transparent"); ctx.fillStyle = g2; ctx.fillRect(0, 0, 1200, 630);
    const logo = await loadImg("assets/brand/mark.svg"); if (logo) ctx.drawImage(logo, 60, 50, 64, 64);
    ctx.fillStyle = "#e8eef6"; ctx.font = "800 28px Manrope, Inter, system-ui, sans-serif"; ctx.fillText("AI Safety Full Episodes", 140, 92);
    ctx.fillStyle = "#93a4b8"; ctx.font = "500 22px Inter, system-ui, sans-serif"; ctx.fillText("lo3elyon.github.io/ASI/ai-safety-full-episodes", 60, 590);
    return { c, ctx, a, b };
  }
  async function deliver(c, name, title) {
    const blob = await new Promise((res) => { try { c.toBlob(res, "image/png"); } catch (e) { res(null); } });
    if (!blob) { ui().toast("Could not create the image in this browser", { icon: "⚠️", force: true }); return; }
    const file = typeof File === "function" ? new File([blob], name, { type: "image/png" }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title }); return; } catch (x) { if (x && x.name === "AbortError") return; } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    ui().toast("Share card saved as an image", { icon: "🖼️", force: true });
  }
  async function shareCard(id, t) {
    const e = STATE.byId.get(id); if (!e) return;
    const B = await baseCanvas(); if (!B) { ui().toast("Canvas is not available here", { force: true }); return; }
    const { c, ctx, a } = B;
    const th = await loadImg(`https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`, true);
    if (th) { ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(720, 150, 420, 236, 22) : ctx.rect(720, 150, 420, 236); ctx.clip(); ctx.drawImage(th, 0, 45, 480, 270, 720, 150, 420, 236); ctx.restore(); }
    ctx.fillStyle = a; ctx.font = "700 20px Inter, system-ui, sans-serif"; ctx.fillText(`${A.FORMATS.find((f) => f.id === e.fmt).label.toUpperCase()} · ${fmtDate(e.date)} · ${e.durStr}`, 60, 180);
    ctx.fillStyle = "#ffffff"; ctx.font = "800 46px Manrope, Inter, system-ui, sans-serif";
    const n = wrapText(ctx, e.title, 60, 240, th ? 620 : 1060, 56, 4);
    const avY = 240 + n * 56 + 20;
    let x = 60;
    for (const p of e.stars.slice(0, 4)) {
      const ph = ui().photoOf(p.name); const im = await loadImg(ph.src, !/^assets\//.test(ph.src));
      if (im) { ctx.save(); ctx.beginPath(); ctx.arc(x + 32, avY + 32, 32, 0, Math.PI * 2); ctx.clip(); const s = Math.min(im.width, im.height); ctx.drawImage(im, (im.width - s) / 2, (im.height - s) / 4, s, s, x, avY, 64, 64); ctx.restore(); ctx.strokeStyle = a; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 32, avY + 32, 33, 0, Math.PI * 2); ctx.stroke(); }
      x += 76;
    }
    ctx.fillStyle = "#cbd5e1"; ctx.font = "600 24px Inter, system-ui, sans-serif"; ctx.fillText(ui().whoLine(e, 4).slice(0, 80), Math.max(60, x + 10), avY + 42);
    if (t) { ctx.fillStyle = a; ctx.font = "700 22px Inter, system-ui, sans-serif"; ctx.fillText(`▶ from ${fmtTime(t)}`, 60, 545); }
    h().bumpStat("shares");
    await deliver(c, `episode-${e.id}.png`, e.title);
  }
  async function shareRecap(R, mname) {
    const B = await baseCanvas(); if (!B) return;
    const { c, ctx, a, b } = B;
    ctx.fillStyle = a; ctx.font = "700 22px Inter, system-ui, sans-serif"; ctx.fillText(`${mname.toUpperCase()} · WRAPPED`, 60, 180);
    ctx.fillStyle = "#fff"; ctx.font = "800 120px Manrope, Inter, system-ui, sans-serif"; ctx.fillText(hoursStr(R.total), 60, 320);
    ctx.font = "600 28px Inter, system-ui, sans-serif"; ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`${R.completed.length} episodes completed · ${R.days} active days · ${R.marks} marked`, 60, 380);
    ctx.fillStyle = b; ctx.font = "700 26px Inter, system-ui, sans-serif"; ctx.fillText("Top voices: " + R.topSp.map((x) => x.s.name).slice(0, 3).join(", "), 60, 440);
    await deliver(c, `recap-${R.mid}.png`, `${mname} recap`);
  }

  /* ================================================================ carousels, hover previews, entrance animation */
  function enhance(root) {
    $$(".shelf__row:not([data-cx]), .faces:not([data-cx])", root || document).forEach((row) => {
      row.dataset.cx = "1";
      row.setAttribute("data-carousel", "");
      let wrap = row.parentNode;
      if (!wrap.classList.contains("shelf__wrap")) { wrap = document.createElement("div"); wrap.className = "shelf__wrap"; row.replaceWith(wrap); wrap.appendChild(row); }
      if (!wrap.querySelector(".cx")) wrap.insertAdjacentHTML("beforeend", `<button class="cx cx--l" data-cx="-1" aria-label="Scroll left" tabindex="-1"><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button><button class="cx cx--r" data-cx="1" aria-label="Scroll right" tabindex="-1">${ui().ICON.chev}</button>`);
      const upd = () => { const max = row.scrollWidth - row.clientWidth - 2; wrap.classList.toggle("at-start", row.scrollLeft <= 2); wrap.classList.toggle("at-end", row.scrollLeft >= max); wrap.classList.toggle("no-scroll", max <= 2); };
      row.addEventListener("scroll", upd, { passive: true });
      requestAnimationFrame(upd);
    });
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest && ev.target.closest("[data-cx]"); if (!b || b.tagName !== "BUTTON") return;
    const row = b.parentNode.querySelector("[data-carousel]");
    row && row.scrollBy({ left: Number(b.dataset.cx) * row.clientWidth * 0.86, behavior: A.RM ? "auto" : "smooth" });
  });
  document.addEventListener("pointerover", (ev) => {
    if (ev.pointerType && ev.pointerType !== "mouse") return;
    const th = ev.target.closest && ev.target.closest(".card .thumb");
    if (!th || th.querySelector(".thumb__pv")) return;
    const id = th.closest("[data-id]").dataset.id; const e = STATE.byId.get(id); if (!e) return;
    const chs = e.chapters.filter((c) => c.t != null).slice(0, 6);
    const pv = document.createElement("span"); pv.className = "thumb__pv"; pv.setAttribute("aria-hidden", "true");
    pv.innerHTML = [1, 2, 3].map((n) => `<img src="https://i.ytimg.com/vi/${esc(id)}/mq${n}.jpg" alt="" decoding="async" width="320" height="180">`).join("") + (chs.length ? `<span class="thumb__chs"><span>${chs.map((c) => `<em><b>${fmtTime(c.t)}</b> ${esc(c.title.slice(0, 48))}</em>`).join("")}</span></span>` : "");
    th.appendChild(pv);
  });

  /* ================================================================ keyboard navigation across cards */
  const NAVSEL = ".card, .lrow, .wrow, .qrow, .hrow, .scard, .plcard";
  function focusTarget(el) { return el.matches(".plcard") ? el : el.querySelector(".thumb, [data-act='play'], a, button, input") || el; }
  document.addEventListener("keydown", (ev) => {
    if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const ae = document.activeElement; if (!ae || /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    const cur = ae.closest && ae.closest(NAVSEL); if (!cur || cur.closest(".pop, #dock")) return;
    const k = ev.key;
    if (k === "ContextMenu" || (k === "F10" && ev.shiftKey)) { ev.preventDefault(); if (cur.dataset.id) openCtx(cur.dataset.id, ae); return; }
    if ((k === "w" || k === "W") && cur.dataset.id) { ev.preventDefault(); ev.stopImmediatePropagation(); act("watched", cur.dataset.id, ae); return; }
    if (!/^Arrow(Left|Right|Up|Down)$/.test(k)) return;
    const view = cur.closest(".view") || document;
    const r0 = cur.getBoundingClientRect(); const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bd = Infinity;
    $$(NAVSEL, view).forEach((el) => {
      if (el === cur || el.closest("[hidden]")) return;
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const dx = x - cx, dy = y - cy;
      const ok = k === "ArrowRight" ? dx > 8 && Math.abs(dy) < r0.height * 0.6 : k === "ArrowLeft" ? dx < -8 && Math.abs(dy) < r0.height * 0.6 : k === "ArrowDown" ? dy > 8 : dy < -8;
      if (!ok) return;
      const d = k === "ArrowDown" || k === "ArrowUp" ? Math.abs(dy) * 1 + Math.abs(dx) * 2 : Math.abs(dx) + Math.abs(dy) * 3;
      if (d < bd) { bd = d; best = el; }
    });
    if (!best) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    const t = focusTarget(best); t.focus({ preventScroll: true }); best.scrollIntoView({ block: "nearest", inline: "nearest", behavior: A.RM ? "auto" : "smooth" });
  }, true);

  /* ================================================================ topbar: theme colours + goal popovers */
  function wireTop() {
    const tb = $("#accentBtn");
    if (tb) tb.onclick = () => openPop(`<p class="pop__h">Theme</p><div class="seg seg--sm" role="group" aria-label="Brightness">${["dark", "light", "system"].map((t) => `<button data-theme-set2="${t}" aria-pressed="${(document.documentElement.getAttribute("data-theme-pref") || "system") === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div><p class="pop__h">Accent colour</p>${accentPicker()}<p class="pop__note">Violet and rose are optional extras.</p><a class="pop__i" href="#/profile" data-themes-link>${ui().ICON.spark}<span>All themes: GitHub, Dracula, Nord, Solarized, Tokyo Night…</span></a>`, tb, { role: "dialog", cls: "pop--theme" });
    const g = $("#goalChip");
    if (g) g.onclick = () => { const st = h().streaks(); openPop(`<p class="pop__h">Daily goal · ${Math.round(h().todaySec() / 60)} of ${Math.round(h().goalSec() / 60)} min today</p><div class="goalcard__set">${[10, 20, 30, 45, 60, 90].map((m) => `<button class="chip ${Math.round(h().goalSec() / 60) === m ? "is-on" : ""}" data-goal="${m}">${m} min</button>`).join("")}</div><p class="pop__note">${ui().ICON.flame} ${st.cur}-day streak · best ${st.best}. A day counts once you watch a minute (or mark an episode).</p><a class="pop__i" href="#/wrapped">${ui().ICON.spark}<span>Monthly recap</span></a>`, g, { role: "dialog" }); };
    document.addEventListener("click", (ev) => {
      const a = ev.target.closest && ev.target.closest("[data-accent-set]"); if (a) { setAccent(a.dataset.accentSet); return; }
      const t = ev.target.closest && ev.target.closest("[data-theme-set2]"); if (t) { A.app.setTheme(t.dataset.themeSet2, true); $$("[data-theme-set2]").forEach((b) => b.setAttribute("aria-pressed", String(b === t))); }
    });
  }

  A.feat = {
    ACCENTS, setAccent, accentPicker, openCtx, closePop, playlistPicker, act, rateTagHTML, paintHomeTop, patchWRow, renderRecent, paintGoal, renderWatched, renderHistory, renderPlaylists, renderWrapped,
    shareCard, shareRecap, enhance, wireTop, W, HF, bulk, undoBulk, markIds, recapFor, sessionRows, pop: () => pop,
  };
})(window.ASFE);
