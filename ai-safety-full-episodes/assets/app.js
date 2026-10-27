/* AI Safety Full Episodes v2 · app: router, global events, command palette, shortcuts, theme, deep links, boot.
 * Built by Aniruddha Adak. Module order: core → history → recs → ui → player → views → insights → app. */
(function (A) {
  "use strict";
  const { $, $$, esc, STATE, fold, fmtTime } = A;
  const h = () => A.hist;
  let VIEW = "home", ARG = null;

  /* ---------------------------------------------------------------- router */
  function parseHash() {
    const raw = location.hash.replace(/^#/, "");
    if (/^ep=/.test(raw)) { const p = new URLSearchParams(raw); return { deep: { id: p.get("ep"), t: Number(p.get("t")) || 0 } }; }
    const m = raw.match(/^\/?([a-z]+)(?:\/([^?]*))?(?:\?(.*))?$/);
    if (!m) return { view: "home" };
    return { view: m[1], arg: m[2] ? decodeURIComponent(m[2]) : null, qs: m[3] || "" };
  }
  const VIEWS = ["home", "browse", "months", "speakers", "speaker", "insights", "history", "queue", "profile", "notes", "about"];
  function route() {
    const r = parseHash();
    if (r.deep) {
      const e = STATE.byId.get(r.deep.id);
      history.replaceState(null, "", location.pathname + location.search + "#/home");
      show("home");
      if (e) { A.views.openDrawer(e.id); A.player.play(e.id, { at: r.deep.t || undefined }); if (r.deep.t) A.ui.toast(`Opened at ${fmtTime(r.deep.t)}`, { icon: "🔗" }); }
      else A.ui.toast("That episode is not in the library", { icon: "⚠️" });
      return;
    }
    let v = VIEWS.includes(r.view) ? r.view : "home";
    if (v === "browse" && r.qs) A.views.applyQuery(r.qs);
    show(v, r.arg);
  }
  function show(v, arg) {
    const changed = v !== VIEW || arg !== ARG;
    VIEW = v; ARG = arg;
    $$(".view").forEach((s) => (s.hidden = s.dataset.view !== v));
    $$("[data-tab]").forEach((a) => { const on = a.dataset.tab === v || (v === "speaker" && a.dataset.tab === "speakers"); a.classList.toggle("is-on", on); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
    if (A.views.drawerOpen()) A.views.closeDrawer();
    if (A.P.mode === "theater" && A.P.cur && changed) A.player.minimize();
    renderCurrent();
    if (changed) window.scrollTo({ top: 0, behavior: "auto" });
    document.title = `${{ home: "Home", browse: "Browse", months: "Months", speakers: "Speakers", speaker: (STATE.bySlug.get(arg) || { name: "Speaker" }).name, insights: "Insights", history: "History", queue: "Queue", profile: "Profile", notes: "Notes", about: "About & method" }[v]} · AI Safety Full Episodes v2`;
  }
  function renderCurrent() {
    const V = A.views;
    try {
      ({ home: V.renderHome, browse: () => V.renderBrowse(true), months: V.renderMonths, speakers: V.renderSpeakers, speaker: () => V.renderSpeaker(ARG), insights: () => A.insights.render($('.view[data-view="insights"]')), history: V.renderHistory, queue: V.renderQueue, profile: V.renderProfile, notes: V.renderNotes, about: V.renderAbout }[VIEW] || V.renderHome)();
    } catch (err) { console.error(err); $(`.view[data-view="${VIEW}"]`).innerHTML = `<div class="emptybig"><p>Something went wrong rendering this view.</p><pre class="muted">${esc(err.message)}</pre></div>`; }
  }
  function rerender() { renderCurrent(); A.views.paintQueueCount(); h().checkAwards(true); }

  /* ---------------------------------------------------------------- global clicks */
  function onClick(ev) {
    const t = ev.target;
    if (!t.closest) return;
    const jump = t.closest("[data-jump]");
    if (jump) { ev.preventDefault(); const [id, s] = jump.dataset.jump.split("|"); A.player.jumpTo(id, Number(s)); return; }
    const open = t.closest("[data-open]");
    if (open) { ev.preventDefault(); A.views.openDrawer(open.dataset.open); return; }
    const pid = t.closest("[data-playid]");
    if (pid) { A.player.play(pid.dataset.playid); return; }
    const swap = t.closest("[data-swap]");
    if (swap) { A.views.openDrawer(swap.dataset.swap); return; }
    const fol = t.closest("[data-follow]");
    if (fol) {
      const k = fol.dataset.follow; const on = h().toggleFollow(k); const s = STATE.speakers.get(k);
      A.ui.toast(on ? `Following <b>${esc(s ? s.name : k)}</b>: their episodes now get priority` : `Unfollowed ${esc(s ? s.name : k)}`, { icon: on ? "⭐" : "☆", ms: 2200 });
      $$(`[data-follow="${A.cssEsc(k)}"]`).forEach((b) => { b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); b.innerHTML = on ? A.ui.ICON.check + "Following" : A.ui.ICON.plus + "Follow"; });
      return;
    }
    const sc = t.closest("[data-scroll]");
    if (sc) { const row = sc.closest(".shelf").querySelector(".shelf__row"); row.scrollBy({ left: Number(sc.dataset.scroll) * row.clientWidth * 0.85, behavior: A.RM ? "auto" : "smooth" }); return; }
    const hmD = t.closest("[data-hmday]");
    if (hmD && !t.closest('[data-hm="watch"]')) { const day = hmD.dataset.hmday; if (!STATE.days.get(day)) { A.ui.toast(`No episodes released on ${A.fmtDate(day)}`, { ms: 1500 }); return; } const f = A.recs.emptyFilter(); f.day = day; A.recs.setFilter(f); location.hash = "#/browse"; if (VIEW === "browse") A.views.renderBrowse(true); return; }
    if (hmD && t.closest('[data-hm="watch"]') && VIEW !== "history") { location.hash = "#/history"; return; }
    const hmM = t.closest("[data-hmmonth]");
    if (hmM && !t.closest('[data-hm="watch"]')) { const f = A.recs.emptyFilter(); f.month.add(hmM.dataset.hmmonth); A.recs.setFilter(f); location.hash = "#/browse"; if (VIEW === "browse") A.views.renderBrowse(true); return; }
    const act = t.closest("[data-act]");
    if (act) {
      const holder = act.closest("[data-id]"); if (!holder) return;
      const id = holder.dataset.id;
      const a = act.dataset.act;
      if (a === "play") { A.player.play(id); if (A.views.drawerOpen()) A.views.closeDrawer(); }
      if (a === "open") A.views.openDrawer(id);
      if (a === "queue") { const on = h().toggleQueue(id); A.views.paintQueueCount(); A.ui.toast(on ? "Added to queue" : "Removed from queue", { icon: on ? "➕" : "➖", ms: 1400 }); A.views.refreshCardsFor(id); if (VIEW === "queue") A.views.renderQueue(); }
      if (a === "fav") { const on = h().toggleFav(id); A.ui.toast(on ? "Favourited" : "Unfavourited", { icon: on ? "❤️" : "🤍", ms: 1200 }); A.views.refreshCardsFor(id); }
      return;
    }
    const dr = t.closest("[data-dr]");
    if (dr) { const id = A.views.drawerOpen(); const tt = A.P.cur && A.P.cur.id === id ? A.player.curTime() : 0; if (dr.dataset.dr === "link") A.views.copyLinkAt(id, tt); else A.views.share(id, tt); return; }
    const dn = t.closest("#drawer [data-delnote]");
    if (dn) { const id = A.views.drawerOpen(); h().delNote(id, dn.dataset.delnote); A.views.openDrawer(id); return; }
  }

  /* ---------------------------------------------------------------- command palette */
  let palItems = [], palSel = 0;
  const ACTIONS = [
    { label: "Go to Home", kw: "home start", run: () => (location.hash = "#/home") },
    { label: "Browse & filter all episodes", kw: "browse library search filter", run: () => (location.hash = "#/browse") },
    { label: "Months & release calendar", kw: "months calendar heatmap july august september october", run: () => (location.hash = "#/months") },
    { label: "Speakers hub", kw: "speakers researchers people", run: () => (location.hash = "#/speakers") },
    { label: "Insights dashboard", kw: "insights stats charts dashboard", run: () => (location.hash = "#/insights") },
    { label: "Claims tracker (P(doom), timelines)", kw: "claims pdoom p(doom) timeline numbers", run: () => { location.hash = "#/insights"; setTimeout(() => { const el = $("#claimsPanel"); el && el.scrollIntoView(); }, 120); } },
    { label: "Watch history", kw: "history watched", run: () => (location.hash = "#/history") },
    { label: "Queue", kw: "queue up next", run: () => (location.hash = "#/queue") },
    { label: "Profile, levels & badges", kw: "profile level xp badges achievements", run: () => (location.hash = "#/profile") },
    { label: "Notes", kw: "notes", run: () => (location.hash = "#/notes") },
    { label: "About & method", kw: "about method data privacy", run: () => (location.hash = "#/about") },
    { label: "Play / pause", kw: "play pause toggle", run: () => A.player.togglePlay(), needs: true },
    { label: "Next episode", kw: "next skip", run: () => A.player.playNext(), needs: true },
    { label: "Pop-out player (always on top)", kw: "pip picture in picture pop out minimise", run: () => A.player.popOut(), needs: true },
    { label: "Audio mode", kw: "audio listen background", run: () => A.player.audioMode(), needs: true },
    { label: "Theater / mini player", kw: "theater mini expand", run: () => (A.P.mode === "theater" ? A.player.minimize() : A.player.expand()), needs: true },
    { label: "Add a note at this moment", kw: "note", run: () => A.player.openNote(), needs: true },
    { label: "Copy link at current time", kw: "copy link share timestamp", run: () => A.views.copyLinkAt(A.P.cur.id, A.player.curTime()), needs: true },
    { label: "Toggle theme (dark / light / system)", kw: "theme dark light system", run: () => cycleTheme() },
    { label: "Keyboard shortcuts", kw: "keyboard shortcuts help", run: () => openHelp() },
    { label: "Surprise me (random unwatched)", kw: "random surprise shuffle", run: () => { const l = STATE.all.filter((e) => h().stateOf(e.id) === "none"); if (l.length) A.player.play(l[Math.floor(Math.random() * l.length)].id); } },
  ];
  function openPalette() { const m = $("#palette"); m.hidden = false; const q = $("#palQ"); q.value = ""; palRender(""); setTimeout(() => q.focus(), 10); }
  function closePalette() { $("#palette").hidden = true; }
  function palRender(q) {
    const qf = fold(q).trim();
    const acts = ACTIONS.filter((a) => (!a.needs || A.P.cur) && (!qf || fold(a.label + " " + a.kw).includes(qf))).slice(0, qf ? 6 : 8).map((a) => ({ type: "action", a }));
    let eps = [];
    if (qf) eps = STATE.all.map((e) => ({ e, s: A.recs.searchScore(e, q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => ({ type: "ep", e: x.e }));
    else eps = (h().inProgress().slice(0, 3).concat(A.recs.forYou(4).map((x) => x.e))).slice(0, 6).map((e) => ({ type: "ep", e }));
    const sps = Array.from(STATE.speakers.values()).filter((s) => s.eps.length && (!qf ? s.photo && !s.isHost : fold(s.name + " " + s.org).includes(qf))).sort((a, b) => b.eps.length - a.eps.length).slice(0, qf ? 5 : 4).map((s) => ({ type: "sp", s }));
    palItems = qf ? sps.concat(eps, acts) : acts.concat(eps, sps);
    palSel = 0;
    const sec = (type, title) => { const items = palItems.map((x, i) => ({ x, i })).filter(({ x }) => x.type === type); if (!items.length) return ""; return `<li class="pal__sec">${title}</li>` + items.map(({ x, i }) => `<li role="option" class="pal__it" data-pi="${i}" id="pi${i}">${x.type === "ep" ? `${A.ui.thumbImg(x.e)}<span><b>${A.ui.hl(x.e.title, q)}</b><small>${esc(A.ui.whoLine(x.e, 2))} · ${esc(x.e.durStr)} · ${esc(A.fmtShort(x.e.date))}</small></span><kbd>↵ play</kbd>` : x.type === "sp" ? `${A.ui.avatar(x.s.name, 32)}<span><b>${A.ui.hl(x.s.name, q)}</b><small>${esc(x.s.org)} · ${x.s.eps.length} episodes</small></span><kbd>↵ open</kbd>` : `<span class="pal__ic">›</span><span><b>${A.ui.hl(x.a.label, q)}</b></span>`}</li>`).join(""); };
    const order = qf ? [["sp", "Speakers"], ["ep", "Episodes"], ["action", "Actions"]] : [["action", "Actions"], ["ep", "Continue & for you"], ["sp", "Researchers"]];
    $("#palList").innerHTML = order.map(([t, ti]) => sec(t, ti)).join("") || `<li class="pal__empty">No matches for “${esc(q)}”</li>`;
    palMark();
  }
  function palMark() { $$("#palList .pal__it").forEach((el) => { const on = Number(el.dataset.pi) === palSel; el.classList.toggle("is-sel", on); el.setAttribute("aria-selected", on); if (on) el.scrollIntoView({ block: "nearest" }); }); $("#palQ").setAttribute("aria-activedescendant", "pi" + palSel); }
  function palRun(i, shift) {
    const x = palItems[i]; if (!x) return;
    closePalette();
    if (x.type === "action") x.a.run();
    else if (x.type === "sp") location.hash = `#/speaker/${x.s.slug}`;
    else if (shift) { h().toggleQueue(x.e.id); A.views.paintQueueCount(); A.ui.toast("Queued", { icon: "➕", ms: 1200 }); }
    else A.player.play(x.e.id);
  }

  /* ---------------------------------------------------------------- shortcuts + theme */
  const KEYS = [
    ["Ctrl/⌘ K", "Command palette: episodes, speakers, actions"], ["/", "Search (Browse)"], ["?", "This overlay"],
    ["Space / K", "Play or pause"], ["J / L", "Back / forward 10 s"], ["← / →", "Back / forward 10 s (Shift: 30 s)"], ["↑ / ↓", "Volume (theater)"],
    ["Shift P", "Previous chapter"], ["Shift ]", "Next chapter"], ["Shift N", "Next episode"], ["0–9", "Jump to 0%–90%"], [", / .", "Slower / faster"],
    ["M", "Mute"], ["F", "Fullscreen"], ["T", "Theater ↔ mini player"], ["A", "Audio mode"], ["I", "Pop-out player (always on top)"], ["N", "Note at this moment"],
    ["C", "Copy link at current time"], ["G then H / B / S / I", "Go to Home / Browse / Speakers / Insights"], ["Esc", "Close / minimise"],
  ];
  function openHelp() { $("#keysBody").innerHTML = `<dl>${KEYS.map(([k, d]) => `<div><dt>${k.split(" / ").map((x) => `<kbd>${esc(x)}</kbd>`).join(" / ")}</dt><dd>${esc(d)}</dd></div>`).join("")}</dl>`; $("#help").hidden = false; $("#help [data-close]").focus(); }
  function setTheme(pref) {
    try { localStorage.setItem("asfe:theme", pref); } catch (e) {}
    const dark = pref === "dark" || (pref === "system" && !(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches));
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme-pref", pref);
    const m = $('meta[name="theme-color"]'); if (m) m.setAttribute("content", dark ? "#070b12" : "#f5f7fa");
    $("#themeBtn").setAttribute("aria-label", `Theme: ${pref}`);
    $("#themeBtn").title = `Theme: ${pref} (click to change)`;
  }
  function cycleTheme() { const cur = document.documentElement.getAttribute("data-theme-pref") || "system"; const nx = { dark: "light", light: "system", system: "dark" }[cur] || "dark"; setTheme(nx); A.ui.toast(`Theme: ${nx}`, { ms: 1100 }); }

  let gPending = 0;
  function onKey(ev) {
    const tag = (ev.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || ev.target.isContentEditable;
    if ((ev.metaKey || ev.ctrlKey) && (ev.key === "k" || ev.key === "K")) { ev.preventDefault(); $("#palette").hidden ? openPalette() : closePalette(); return; }
    if (!$("#palette").hidden) {
      if (ev.key === "Escape") { closePalette(); return; }
      if (ev.key === "ArrowDown") { ev.preventDefault(); palSel = Math.min(palItems.length - 1, palSel + 1); palMark(); return; }
      if (ev.key === "ArrowUp") { ev.preventDefault(); palSel = Math.max(0, palSel - 1); palMark(); return; }
      if (ev.key === "Enter") { ev.preventDefault(); palRun(palSel, ev.shiftKey); return; }
      return;
    }
    if (ev.key === "Escape") {
      if (!$("#help").hidden) { $("#help").hidden = true; return; }
      if (!$("#levelup").hidden) { $("#levelup").hidden = true; return; }
      if (!$("#countdown").hidden) { A.player.hideCountdown(); return; }
      if (A.views.drawerOpen()) { A.views.closeDrawer(); return; }
      if (typing) { ev.target.blur(); return; }
      if (A.P.mode === "theater" && A.P.cur) { A.player.minimize(); return; }
      return;
    }
    if (typing || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const k = ev.key;
    if (gPending && Date.now() - gPending < 1200) {
      gPending = 0;
      const to = { h: "home", b: "browse", s: "speakers", i: "insights", m: "months", q: "queue", p: "profile", n: "notes" }[k.toLowerCase()];
      if (to) { location.hash = "#/" + to; return; }
    }
    if (k === "g") { gPending = Date.now(); return; }
    if (k === "?") { ev.preventDefault(); $("#help").hidden ? openHelp() : ($("#help").hidden = true); return; }
    if (k === "/") { ev.preventDefault(); if (VIEW !== "browse") location.hash = "#/browse"; setTimeout(() => { const q = $("#q"); q && q.focus(); }, 60); return; }
    if (!A.P.cur) return;
    const inBtn = tag === "button" || tag === "a";
    const S = h().L.SETTINGS, speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];
    switch (k) {
      case " ": if (inBtn) return; ev.preventDefault(); A.player.togglePlay(); break;
      case "k": case "K": A.player.togglePlay(); break;
      case "j": case "J": A.player.seek(-10); break;
      case "l": case "L": A.player.seek(10); break;
      case "ArrowLeft": ev.preventDefault(); A.player.seek(ev.shiftKey ? -30 : -10); break;
      case "ArrowRight": ev.preventDefault(); A.player.seek(ev.shiftKey ? 30 : 10); break;
      case "ArrowUp": if (A.P.mode === "theater") { ev.preventDefault(); A.player.setVol(S.vol + 5); A.ui.toast(`Volume ${S.vol}`, { ms: 700 }); } break;
      case "ArrowDown": if (A.P.mode === "theater") { ev.preventDefault(); A.player.setVol(S.vol - 5); A.ui.toast(`Volume ${S.vol}`, { ms: 700 }); } break;
      case "N": A.player.playNext(); break;
      case "n": A.player.openNote(); break;
      case "P": A.player.prevChapter(); break;
      case "}": case "]": A.player.nextChapter(); break;
      case "m": case "M": A.player.toggleMute(); break;
      case "f": case "F": { const d = $("#dock"); if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen().catch(() => {}); break; }
      case "t": case "T": A.P.mode === "theater" ? A.player.minimize() : A.player.expand(); break;
      case "a": case "A": A.player.audioMode(); break;
      case "i": case "I": A.player.popOut(); break;
      case "c": case "C": A.views.copyLinkAt(A.P.cur.id, A.player.curTime()); break;
      case ",": A.player.setSpeed(speeds[Math.max(0, speeds.indexOf(Number(S.speed)) - 1)] || 1); break;
      case ".": A.player.setSpeed(speeds[Math.min(5, speeds.indexOf(Number(S.speed)) + 1)] || 1); break;
      default: if (/^[0-9]$/.test(k)) A.player.seek((A.player.durNow() * Number(k)) / 10, true);
    }
  }

  /* ---------------------------------------------------------------- boot */
  async function boot() {
    h().loadState();
    $$(".view").forEach((v) => (v.hidden = v.dataset.view !== "home"));
    $('.view[data-view="home"]').innerHTML = `<div class="hero hero--skel shimmer"></div>${A.ui.skeletons(8)}`;
    A.player.wire();
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    $("#scrim").onclick = () => A.views.closeDrawer();
    $("#drawer").addEventListener("click", (ev) => { if (ev.target.closest("[data-close]")) A.views.closeDrawer(); });
    $("#paletteBtn").onclick = openPalette;
    $("#palQ").addEventListener("input", (ev) => palRender(ev.target.value));
    $("#palList").addEventListener("click", (ev) => { const it = ev.target.closest("[data-pi]"); if (it) palRun(Number(it.dataset.pi), ev.shiftKey); });
    $("#palList").addEventListener("mousemove", (ev) => { const it = ev.target.closest("[data-pi]"); if (it && Number(it.dataset.pi) !== palSel) { palSel = Number(it.dataset.pi); palMark(); } });
    $("#palette").addEventListener("click", (ev) => { if (ev.target.id === "palette") closePalette(); });
    $("#helpBtn").onclick = openHelp;
    $("#help").addEventListener("click", (ev) => { if (ev.target.id === "help" || ev.target.closest("[data-close]")) $("#help").hidden = true; });
    $("#themeBtn").onclick = cycleTheme;
    $("#lvlChip").onclick = () => (location.hash = "#/profile");
    setTheme(document.documentElement.getAttribute("data-theme-pref") || "system");
    if (window.matchMedia) { const mq = window.matchMedia("(prefers-color-scheme: light)"); const fn = () => { if ((document.documentElement.getAttribute("data-theme-pref") || "system") === "system") setTheme("system"); }; mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener && mq.addListener(fn); }
    document.addEventListener("fullscreenchange", () => setTimeout(A.player.placeDock, 60));
    try { await A.loadData(); }
    catch (err) { $('.view[data-view="home"]').innerHTML = `<div class="emptybig"><p>Could not load the episode data.</p><pre class="muted">${esc(err.message)}</pre></div>`; return; }
    document.documentElement.classList.add("is-ready");
    A.views.paintQueueCount();
    h().checkAwards(true);
    window.addEventListener("hashchange", route);
    route();
    if (A.migration && A.migration.from === 1 && A.migration.moved.includes("history")) setTimeout(() => A.ui.toast("Welcome to v2: your watch history, notes and badges came with you", { icon: "✨", ms: 5000 }), 600);
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  A.app = { route, show, rerender, setTheme, openPalette, closePalette, openHelp, palRender, palItems: () => palItems, view: () => VIEW };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(window.ASFE);
