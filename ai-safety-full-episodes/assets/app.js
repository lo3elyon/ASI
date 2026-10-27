/* AI Safety Full Episodes · app: router, global events, command palette, shortcuts, theme, deep links, boot.
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
  const VIEWS = ["home", "browse", "months", "speakers", "speaker", "insights", "history", "recent", "explore", "queue", "profile", "notes", "about", "watched", "playlists", "wrapped"];
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
    if (r.view === "playlist") { r.view = "playlists"; }
    let v = VIEWS.includes(r.view) ? r.view : "home";
    if (v === "browse" && r.qs) A.views.applyQuery(r.qs);
    show(v, r.arg);
  }
  function show(v, arg) {
    const changed = v !== VIEW || arg !== ARG;
    if (changed && document.startViewTransition && !A.RM && document.documentElement.classList.contains("is-ready") && !document.hidden) {
      try { document.startViewTransition(() => doShow(v, arg, changed)); return; } catch (e) {}
    }
    doShow(v, arg, changed);
  }
  function doShow(v, arg, changed) {
    VIEW = v; ARG = arg;
    $$(".view").forEach((s) => (s.hidden = s.dataset.view !== v));
    $$(".view").forEach((s) => s.classList.toggle("view--in", s.dataset.view === v && changed));
    $$("[data-tab]").forEach((a) => { const on = a.dataset.tab === v || (v === "speaker" && a.dataset.tab === "speakers") || (v === "recent" && a.dataset.tab === "history"); a.classList.toggle("is-on", on); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
    if (A.views.drawerOpen()) A.views.closeDrawer();
    if (A.P.mode === "theater" && A.P.cur && changed) A.player.minimize();
    renderCurrent();
    if (changed) window.scrollTo({ top: 0, behavior: "auto" });
    document.title = `${{ home: "Home", browse: "Browse", months: "Months", speakers: "Speakers", speaker: (STATE.bySlug.get(arg) || { name: "Speaker" }).name, insights: "Insights", history: "History", recent: "Recently watched", explore: "Explore", queue: "Queue", profile: "Profile", notes: "Notes", about: "About", watched: "I've watched these", playlists: "Playlists", wrapped: "Monthly recap" }[v]} · AI Safety Full Episodes`;
  }
  function renderCurrent() {
    const V = A.views;
    try {
      ({ home: V.renderHome, browse: () => V.renderBrowse(true), months: V.renderMonths, speakers: V.renderSpeakers, speaker: () => V.renderSpeaker(ARG), insights: () => A.insights.render($('.view[data-view="insights"]')), history: A.feat.renderHistory, recent: A.feat.renderRecent, explore: () => A.explore.render(), queue: V.renderQueue, profile: V.renderProfile, notes: V.renderNotes, about: V.renderAbout,
        watched: A.feat.renderWatched, playlists: () => A.feat.renderPlaylists(ARG), wrapped: A.feat.renderWrapped }[VIEW] || V.renderHome)();
      if (VIEW === "home") A.feat.paintHomeTop();
      A.feat.enhance($(`.view[data-view="${VIEW}"]`));
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
      A.fx && A.fx.celebrate("follow", fol, on);
      return;
    }
    const sc = t.closest("[data-scroll]");
    if (sc) { const row = sc.closest(".shelf").querySelector(".shelf__row"); if (row) row.scrollBy({ left: Number(sc.dataset.scroll) * row.clientWidth * 0.85, behavior: A.RM ? "auto" : "smooth" }); return; }
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
      // in-place: only the pressed button (and its twins in other open views) change; the card node is kept
      if (a === "queue") { const on = h().toggleQueue(id); A.views.paintQueueCount(); A.ui.toast(on ? "Added to queue" : "Removed from queue", { icon: on ? "➕" : "➖", ms: 1400 }); A.views.refreshCardsFor(id); A.fx && A.fx.celebrate("queue", act, on); if (VIEW === "queue") A.views.queueSync(id, on); }
      if (a === "fav") { const on = h().toggleFav(id); A.ui.toast(on ? "Favourited" : "Unfavourited", { icon: on ? "❤️" : "🤍", ms: 1200 }); A.views.refreshCardsFor(id); A.fx && A.fx.celebrate("fav", act, on); }
      if (["watched", "menu", "later", "playlist", "sharecard", "playnext"].includes(a)) A.feat.act(a, id, act);
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
    { label: "Explore: learning paths, quote wall, debates, speaker map", kw: "explore paths learning quotes quote wall debate map network", run: () => (location.hash = "#/explore") },
    { label: "Recently watched", kw: "recent history last watched", run: () => (location.hash = "#/recent") },
    { label: "Today's picks", kw: "today picks daily recommendations home", run: () => { location.hash = "#/home"; setTimeout(() => { const p = $("#picks"); p && p.scrollIntoView({ behavior: A.RM ? "auto" : "smooth" }); }, 60); } },
    { label: "Browse & filter all episodes", kw: "browse library search filter", run: () => (location.hash = "#/browse") },
    { label: "Months & release calendar", kw: "months calendar heatmap july august september october", run: () => (location.hash = "#/months") },
    { label: "Speakers hub", kw: "speakers researchers people", run: () => (location.hash = "#/speakers") },
    { label: "Insights dashboard", kw: "insights stats charts dashboard", run: () => (location.hash = "#/insights") },
    { label: "Claims tracker (P(doom), timelines)", kw: "claims pdoom p(doom) timeline numbers", run: () => { location.hash = "#/insights"; setTimeout(() => { const el = $("#claimsPanel"); el && el.scrollIntoView(); }, 120); } },
    { label: "Watch history (timeline, export CSV/JSON)", kw: "history watched timeline export csv", run: () => (location.hash = "#/history") },
    { label: "I've watched these (bulk mark as watched)", kw: "already watched youtube mark bulk checklist import", run: () => (location.hash = "#/watched") },
    { label: "Playlists & Watch later", kw: "playlists watch later library", run: () => (location.hash = "#/playlists") },
    { label: "Monthly recap (wrapped)", kw: "wrapped recap month stats", run: () => (location.hash = "#/wrapped") },
    { label: "Queue", kw: "queue up next", run: () => (location.hash = "#/queue") },
    { label: "Profile, levels & badges", kw: "profile level xp badges achievements", run: () => (location.hash = "#/profile") },
    { label: "Notes", kw: "notes", run: () => (location.hash = "#/notes") },
    { label: "About: method, privacy, FAQ, roadmap", kw: "about method data privacy faq roadmap credits shortcuts", run: () => (location.hash = "#/about") },
    { label: "Play / pause", kw: "play pause toggle", run: () => A.player.togglePlay(), needs: true },
    { label: "Next episode", kw: "next skip", run: () => A.player.playNext(), needs: true },
    { label: "Fullscreen cinema player", kw: "fullscreen cinema expand pop out big", run: () => A.player.toggleFs(), needs: true },
    { label: "Float window (always on top remote)", kw: "pip picture in picture float window minimise", run: () => A.player.popOut(), needs: true },
    { label: "Headphones mode (audio only)", kw: "audio listen background headphones", run: () => A.player.audioMode(), needs: true },
    { label: "Focus mode (Pomodoro, do not disturb)", kw: "focus mode timer zen pomodoro dnd do not disturb", run: () => A.player.toggleZen(), needs: true },
    { label: "Mark current episode as watched", kw: "mark watched done complete", run: () => A.player.toggleWatchedCur(), needs: true },
    { label: "Bookmark this moment", kw: "bookmark", run: () => A.player.bookmark(), needs: true },
    { label: "Sleep timer: 30 minutes", kw: "sleep timer", run: () => A.player.setSleep("30"), needs: true },
    { label: "Toggle captions", kw: "captions subtitles cc", run: () => A.player.toggleCC(), needs: true },
    { label: "Miniplayer / expand", kw: "mini miniplayer expand", run: () => A.player.toggleMini(), needs: true },
    { label: "Theater mode / default view", kw: "theater wide default view", run: () => A.player.toggleWide(), needs: true },
    { label: "Add a note at this moment", kw: "note", run: () => A.player.openNote(), needs: true },
    { label: "Copy link at current time", kw: "copy link share timestamp", run: () => A.views.copyLinkAt(A.P.cur.id, A.player.curTime()), needs: true },
    { label: "Toggle theme (dark / light / system)", kw: "theme dark light system", run: () => cycleTheme() },
    ...[["amber", "Amber"], ["teal", "Teal"], ["emerald", "Emerald"], ["sky", "Sky"], ["coral", "Coral"], ["lime", "Lime"]].map(([id, n]) => ({ label: `Accent colour: ${n}`, kw: "accent colour color theme " + id, run: () => A.feat.setAccent(id) })),
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
    const sps = Array.from(STATE.speakers.values()).filter((s) => s.eps.length && (!qf ? A.ui.hasFace(s.name) && !s.isHost : fold(s.name + " " + s.org).includes(qf))).sort((a, b) => b.eps.length - a.eps.length).slice(0, qf ? 5 : 4).map((s) => ({ type: "sp", s }));
    palItems = qf ? sps.concat(eps, acts) : acts.concat(eps, sps);
    palSel = 0;
    const sec = (type, title) => { const items = palItems.map((x, i) => ({ x, i })).filter(({ x }) => x.type === type); if (!items.length) return ""; return `<li class="pal__sec">${title}</li>` + items.map(({ x, i }) => `<li role="option" class="pal__it" data-pi="${i}" id="pi${i}">${x.type === "ep" ? `${A.ui.thumbImg(x.e)}<span><b>${A.ui.hl(x.e.title, q)}</b><small>${A.ui.metaText(x.e)} · ${esc(A.ui.whoLine(x.e, 2))}</small></span><kbd>↵ play</kbd>` : x.type === "sp" ? `${A.ui.avatar(x.s.name, 32)}<span><b>${A.ui.hl(x.s.name, q)}</b><small>${esc(x.s.org)} · ${x.s.eps.length} episodes</small></span><kbd>↵ open</kbd>` : `<span class="pal__ic">›</span><span><b>${A.ui.hl(x.a.label, q)}</b></span>`}</li>`).join(""); };
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
    ["Space / K", "Play or pause"], ["J / L", "Back / forward 10 s"], ["← / →", "Back / forward 10 s (Shift: 30 s)"], ["↑ / ↓", "Volume (theater / fullscreen)"],
    [", / .", "Frame step when paused (speed −/+ 0.25× while playing)"], ["< / >", "Slower / faster"], ["0–9", "Jump to 0%–90%"], ["Home / End", "Start / end (on the seek bar)"],
    ["Shift P / Shift ]", "Previous / next chapter"], ["Shift N", "Next episode"], ["S", "Skip intro (first chapter)"],
    ["F", "Full screen (Esc to leave)"], ["T", "Theater mode / default view"], ["I", "Miniplayer / expand"], ["A", "Headphones mode"], ["O", "Float window (always on top)"], ["Z", "Focus mode"],
    ["C", "Captions on / off"], ["M", "Mute"], ["B", "Bookmark this moment"], ["N", "Note at this moment"], ["[ / ] / \\", "Loop start / loop end / clear"],
    ["W", "Mark focused card (or current episode) watched"], ["Shift F10", "Card menu (or right-click)"], ["Arrow keys on cards", "Move between cards"],
    ["Double-click / double-tap", "Left or right third: −/+10 s · middle: fullscreen · mini: expand"], ["Swipe on video (touch)", "Sideways seeks · up/down on the right half sets volume"],
    ["G then H / B / S / I / W / L / R / Y", "Go to Home / Browse / Speakers / Insights / Watched / Playlists / Recap / History"], ["Esc", "Close / exit fullscreen / minimise"],
  ];
  function openHelp() { $("#keysBody").innerHTML = `<dl>${KEYS.map(([k, d]) => `<div><dt>${k.split(" / ").map((x) => `<kbd>${esc(x)}</kbd>`).join(" / ")}</dt><dd>${esc(d)}</dd></div>`).join("")}</dl>`; $("#help").hidden = false; $("#help [data-close]").focus(); }
  function setTheme(pref, explicit) {
    try { localStorage.setItem("asfe:theme", pref); } catch (e) {}
    const dark = pref === "dark" || (pref === "system" && !(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches));
    document.documentElement.setAttribute("data-theme-pref", pref);
    const pal = document.documentElement.getAttribute("data-palette");
    if (pal && explicit !== false && A.themes) { if (explicit) { let a = "amber"; try { a = localStorage.getItem("asfe:accent") || "amber"; } catch (e) {} A.themes.apply(a === "custom" || A.themes.THEMES.some((t) => t.id === a && t.kind === "accent") ? a : "amber"); } else { const t = A.themes.THEMES.find((x) => x.id === pal); if (t) document.documentElement.setAttribute("data-theme", t.mode); } }
    if (!document.documentElement.getAttribute("data-palette")) document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    const m = $('meta[name="theme-color"]'); if (m) m.setAttribute("content", dark ? "#070b12" : "#f5f7fa");
    $("#themeBtn").setAttribute("aria-label", `Theme: ${pref}`);
    $("#themeBtn").title = `Theme: ${pref} (click to change)`;
  }
  function cycleTheme() { const cur = document.documentElement.getAttribute("data-theme-pref") || "system"; const nx = { dark: "light", light: "system", system: "dark" }[cur] || "dark"; setTheme(nx, true); A.ui.toast(`Theme: ${nx}`, { ms: 1100 }); }

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
      if (A.P.menu) { A.player.closeMenu(); return; }
      if (A.P.fs) { A.player.exitFs(); return; }
      if (A.P.zen) { A.player.toggleZen(false); return; }
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
      const to = { h: "home", b: "browse", s: "speakers", i: "insights", m: "months", q: "queue", p: "profile", n: "notes", w: "watched", l: "playlists", r: "wrapped", y: "history" }[k.toLowerCase()];
      if (to) { location.hash = "#/" + to; return; }
    }
    if (k === "g") { gPending = Date.now(); return; }
    if (k === "?") { ev.preventDefault(); $("#help").hidden ? openHelp() : ($("#help").hidden = true); return; }
    if (k === "/") { ev.preventDefault(); if (VIEW !== "browse") location.hash = "#/browse"; setTimeout(() => { const q = $("#q"); q && q.focus(); }, 60); return; }
    if (!A.P.cur) return;
    const inBtn = tag === "button" || tag === "a";
    const S = h().L.SETTINGS;
    const P0 = A.P, pl = A.player;
    switch (k) {
      case " ": if (inBtn) return; ev.preventDefault(); pl.togglePlay(); break;
      case "k": case "K": pl.togglePlay(); break;
      case "j": case "J": pl.seek(-10); break;
      case "l": case "L": pl.seek(10); break;
      case "ArrowLeft": ev.preventDefault(); pl.seek(ev.shiftKey ? -30 : -10); break;
      case "ArrowRight": ev.preventDefault(); pl.seek(ev.shiftKey ? 30 : 10); break;
      case "ArrowUp": if (P0.mode === "theater" || P0.fs) { ev.preventDefault(); pl.setVol(S.vol + 5); A.ui.toast(`Volume ${S.vol}`, { ms: 700 }); } break;
      case "ArrowDown": if (P0.mode === "theater" || P0.fs) { ev.preventDefault(); pl.setVol(S.vol - 5); A.ui.toast(`Volume ${S.vol}`, { ms: 700 }); } break;
      case "N": pl.playNext(); break;
      case "n": pl.openNote(); break;
      case "P": pl.prevChapter(); break;
      case "}": pl.nextChapter(); break;
      case "[": pl.setLoop("a"); break;
      case "]": pl.setLoop("b"); break;
      case "\\": pl.setLoop("clear"); break;
      case "m": case "M": pl.toggleMute(); break;
      case "f": case "F": pl.toggleFs(); break;
      case "t": case "T": pl.toggleWide(); break;
      case "a": case "A": pl.audioMode(); break;
      case "i": case "I": pl.toggleMini(); break;
      case "o": case "O": pl.popOut(); break;
      case "z": case "Z": pl.toggleZen(); break;
      case "c": case "C": pl.toggleCC(); break;
      case "b": case "B": pl.bookmark(); break;
      case "s": case "S": pl.skipIntro(); break;
      case "w": case "W": pl.toggleWatchedCur(); break;
      case ",": pl.frameStep(-1); break;
      case ".": pl.frameStep(1); break;
      case "<": pl.setSpeed((Number(S.speed) || 1) - 0.25); break;
      case ">": pl.setSpeed((Number(S.speed) || 1) + 0.25); break;
      default: if (/^[0-9]$/.test(k)) pl.seek((pl.durNow() * Number(k)) / 10, true);
    }
    pl.showUI();
  }

  /* ---------------------------------------------------------------- boot */
  async function boot() {
    h().loadState();
    $$(".view").forEach((v) => (v.hidden = v.dataset.view !== "home"));
    const home = $('.view[data-view="home"]');
    if (!home.querySelector("[data-prerendered]")) home.innerHTML = `<div class="hero hero--skel shimmer"></div>${A.ui.skeletons(8)}`;
    try { A.feat.setAccent(localStorage.getItem("asfe:accent") || h().L.SETTINGS.accent || "amber", true); } catch (e) {}
    A.feat.wireTop();
    const bar = $("#loadbar"), splash = $("#splash");
    A.onLoadProgress = (f) => { if (bar) bar.style.transform = `scaleX(${Math.max(0.08, f)})`; const sp = $("#splashBar"); if (sp) sp.style.transform = `scaleX(${Math.max(0.08, f)})`; };
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
    try { await A.loadData(); }
    catch (err) { $('.view[data-view="home"]').innerHTML = `<div class="emptybig"><p>Could not load the episode data.</p><pre class="muted">${esc(err.message)}</pre></div>`; return; }
    document.documentElement.classList.add("is-ready");
    if (bar) { bar.style.transform = "scaleX(1)"; setTimeout(() => bar.classList.add("is-done"), 250); }
    if (splash) { splash.classList.add("is-out"); setTimeout(() => splash.remove(), 700); try { localStorage.setItem("asfe:seen", "1"); } catch (e) {} }
    A.feat.paintGoal();
    A.views.paintQueueCount();
    h().checkAwards(true);
    window.addEventListener("hashchange", route);
    route();
    if (A.migration && A.migration.from != null && A.migration.moved.length && !A.store.get("migToast3", 0)) { A.store.set("migToast3", 1); setTimeout(() => A.ui.toast("Your watch history, notes and badges came with you. New: fullscreen cinema player, “I've watched these”, playlists and themes.", { icon: "✨", ms: 6000 }), 700); }
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  A.app = { route, show, KEYS, rerender, setTheme, openPalette, closePalette, openHelp, palRender, palItems: () => palItems, view: () => VIEW };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(window.ASFE);
