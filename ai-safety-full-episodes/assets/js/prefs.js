/* AI Safety Full Episodes · prefs: the header's look-and-feel controls.
 *  - Animated sun ⇄ moon theme toggle (dark shows the moon; click flips to light and the sun; System stays in Settings)
 *  - Quick Settings dropdown with tabs: Theme · Background · Fonts · Layout · Motion (all inline, no navigation)
 *  - Font pairings (Google Fonts, allowed by the CSP) + a text size scale, applied site-wide
 *  - Keyboard shortcuts overlay: grouped, searchable, colourful keycaps, a bottom sheet on phones
 *  - Section-shaped loading skeletons for in-app renders
 * Loaded after app.js. Built by Aniruddha Adak. */
(function (A) {
  "use strict";
  const { $, $$, esc } = A;
  const root = () => document.documentElement;
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem("asfe:" + k); if (v === null) localStorage.removeItem("asfe:" + k); else localStorage.setItem("asfe:" + k, v); } catch (e) { return null; } };

  /* ================================================================ fonts */
  const FONTS = [
    { id: "inter", name: "Inter + Manrope", note: "Clean and neutral (default)", body: "Inter", head: "Manrope", mono: "JetBrains Mono", q: "family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800" },
    { id: "grotesk", name: "Space Grotesk", note: "Techy headings, Inter text", body: "Inter", head: "Space Grotesk", mono: "JetBrains Mono", q: "family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700" },
    { id: "sora", name: "Sora + DM Sans", note: "Geometric and friendly", body: "DM Sans", head: "Sora", mono: "JetBrains Mono", q: "family=Sora:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700" },
    { id: "jakarta", name: "Plus Jakarta Sans", note: "Modern product feel", body: "Plus Jakarta Sans", head: "Plus Jakarta Sans", mono: "JetBrains Mono", q: "family=Plus+Jakarta+Sans:wght@400;500;600;700;800" },
    { id: "outfit", name: "Outfit + Inter", note: "Rounded display headings", body: "Inter", head: "Outfit", mono: "JetBrains Mono", q: "family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700" },
    { id: "plex", name: "IBM Plex", note: "Engineered, with Plex Mono times", body: "IBM Plex Sans", head: "IBM Plex Sans", mono: "IBM Plex Mono", q: "family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600" },
    { id: "editorial", name: "Fraunces + Inter", note: "Editorial serif headings", body: "Inter", head: "Fraunces", mono: "JetBrains Mono", q: "family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600;700" },
    { id: "playfair", name: "Playfair + Source Sans", note: "Classic magazine", body: "Source Sans 3", head: "Playfair Display", mono: "JetBrains Mono", q: "family=Playfair+Display:wght@600;700;800&family=Source+Sans+3:wght@400;500;600;700" },
    { id: "atkinson", name: "Atkinson Hyperlegible", note: "Made for low vision readers", body: "Atkinson Hyperlegible", head: "Atkinson Hyperlegible", mono: "JetBrains Mono", q: "family=Atkinson+Hyperlegible:wght@400;700" },
    { id: "mono", name: "JetBrains Mono", note: "Terminal headings, Plex text", body: "IBM Plex Sans", head: "JetBrains Mono", mono: "JetBrains Mono", q: "family=JetBrains+Mono:wght@500;700;800&family=IBM+Plex+Sans:wght@400;500;600;700" },
  ];
  const fontById = new Map(FONTS.map((f) => [f.id, f]));
  const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const stackOf = (name, kind) => `"${name}", ${kind === "mono" ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : kind === "serif" ? 'Georgia, "Times New Roman", serif' : SANS}`;
  const isSerif = (n) => /Fraunces|Playfair/.test(n);
  function linkFor(f) { return `https://fonts.googleapis.com/css2?${f.q}&family=JetBrains+Mono:wght@500;700&display=swap`; }
  function loadFont(f) {
    if (!f || f.id === "inter") return;
    const id = "font-" + f.id; if (document.getElementById(id)) return;
    const l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; l.href = linkFor(f); document.head.appendChild(l);
  }
  function applyFont(id, quiet) {
    const f = fontById.get(id) || FONTS[0];
    loadFont(f);
    const d = root();
    d.setAttribute("data-font", f.id);
    d.style.setProperty("--font", stackOf(f.body, isSerif(f.body) ? "serif" : "sans"));
    d.style.setProperty("--head", stackOf(f.head, isSerif(f.head) ? "serif" : f.head === "JetBrains Mono" ? "mono" : "sans"));
    d.style.setProperty("--mono", stackOf(f.mono, "mono"));
    LS("font", f.id === "inter" ? null : f.id);
    $$("[data-fontset]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fontset === f.id)));
    if (!quiet && A.ui) A.ui.toast(`Font: ${esc(f.name)}`, { ms: 1100 });
    return f;
  }
  function fontScale(v) {
    if (v == null) { const s = Number(LS("fontScale")); return s >= 0.85 && s <= 1.3 ? s : 1; }
    v = Math.min(1.3, Math.max(0.85, Number(v) || 1));
    root().style.setProperty("--fs", String(v)); LS("fontScale", v === 1 ? null : String(v));
    $$("[data-fsout]").forEach((o) => (o.textContent = Math.round(v * 100) + "%"));
    return v;
  }
  /* previews: one tiny request with only the letters the tiles show */
  let previewLoaded = false;
  function loadPreviews() {
    if (previewLoaded) return; previewLoaded = true;
    const fams = [...new Set(FONTS.flatMap((f) => [f.body, f.head]))].map((n) => "family=" + n.replace(/ /g, "+") + ":wght@700");
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?${fams.join("&")}&text=${encodeURIComponent("Aa Full episodes 0123456789:")}&display=swap`; document.head.appendChild(l);
  }
  function fontsHTML() {
    loadPreviews();
    const cur = root().getAttribute("data-font") || "inter", sc = fontScale();
    return `<div class="fontp"><div class="fontp__grid" role="group" aria-label="Font pairings">${FONTS.map((f) => `<button type="button" class="fontt" data-fontset="${f.id}" aria-pressed="${cur === f.id}">
        <span class="fontt__aa" style="font-family:${esc(stackOf(f.head, isSerif(f.head) ? "serif" : "sans"))}">Aa</span><span class="fontt__tx"><b style="font-family:${esc(stackOf(f.head, isSerif(f.head) ? "serif" : "sans"))}">${esc(f.name)}</b><small>${esc(f.note)}</small><code style="font-family:${esc(stackOf(f.mono, "mono"))}">01:23:45</code></span></button>`).join("")}</div>
      <label class="rng"><span>Text size <output data-fsout>${Math.round(sc * 100)}%</output></span><input type="range" data-fs min="0.85" max="1.3" step="0.05" value="${sc}" aria-label="Text size"></label>
      <p class="muted qset__note">Timestamps use a monospaced font so numbers line up. Fonts load from Google Fonts only when you pick them.</p></div>`;
  }

  /* ================================================================ motion + density */
  function motion(v) {
    if (v == null) return LS("motion") || "system";
    LS("motion", v === "system" ? null : v);
    const sys = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root().classList.toggle("rm", v === "reduced" || (v === "system" && sys));
    root().setAttribute("data-motion", v);
    if (A.bg) A.bg.apply(root().getAttribute("data-bg") || A.bg.current(), { preview: true });
    return v;
  }
  function density(v) {
    if (v == null) return LS("density") || "comfortable";
    LS("density", v === "comfortable" ? null : v); root().setAttribute("data-density", v); return v;
  }
  function hoverFx(on) { if (on == null) return LS("hoverFx") !== "0"; LS("hoverFx", on ? null : "0"); root().classList.toggle("no-hoverfx", !on); return on; }

  /* ================================================================ theme toggle (sun ⇄ moon) */
  const isDark = () => root().getAttribute("data-theme") !== "light";
  function paintToggle() {
    const b = $("#themeBtn"); if (!b) return;
    const dark = isDark(), pref = root().getAttribute("data-theme-pref") || "system";
    b.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    b.title = `${dark ? "Dark" : "Light"} theme${pref === "system" ? " (following your system)" : ""} · click for ${dark ? "light" : "dark"} · System is in Settings`;
    b.setAttribute("aria-pressed", String(!dark));
    b.dataset.mode = dark ? "dark" : "light";
  }
  function flipTheme() {
    const b = $("#themeBtn"); if (b) { b.classList.remove("is-flip"); void b.offsetWidth; b.classList.add("is-flip"); }
    A.app.setTheme(isDark() ? "light" : "dark", true);
    paintToggle();
  }

  /* ================================================================ quick settings dropdown */
  const TABS = [["theme", "Theme"], ["bg", "Background"], ["fonts", "Fonts"], ["layout", "Layout"], ["motion", "Motion"]];
  let QS = null;
  function themeTab() {
    const pref = root().getAttribute("data-theme-pref") || "system";
    return `<p class="qset__h">Brightness</p><div class="seg seg--sm qset__seg" role="group" aria-label="Brightness">${["dark", "light", "system"].map((t) => `<button type="button" data-theme-set2="${t}" aria-pressed="${pref === t}">${{ dark: "🌙 Dark", light: "☀️ Light", system: "💻 System" }[t]}</button>`).join("")}</div>
      <p class="qset__h">Accent colour</p>${A.feat.accentPicker()}
      <p class="qset__h">All themes</p><div class="thp__grid thp__grid--pop" id="qThGrid" role="group" aria-label="All themes">${A.themes ? A.themes.gridHTML() : ""}</div>`;
  }
  function layoutTab() {
    const dp = A.studio ? A.studio.df.prefs() : { on: true, pause: 8 }, sp = A.studio ? A.studio.split.prefs() : { pct: 60 };
    return `<p class="qset__h">Density</p><div class="seg seg--sm qset__seg" role="group" aria-label="Density">${[["compact", "Compact"], ["comfortable", "Comfortable"], ["spacious", "Spacious"]].map(([v, n]) => `<button type="button" data-density="${v}" aria-pressed="${density() === v}">${n}</button>`).join("")}</div>
      <p class="qset__h">While a video plays</p>
      <label class="switch"><input type="checkbox" data-dfon ${dp.on ? "checked" : ""}><span></span>Distraction-free: fold details, tabs and the line-up into a “Details” pill</label>
      <label class="rng rng--sel"><span>Show details again after a pause of</span><select class="cselect" data-dfpause aria-label="Show details after a pause of">${[[0, "Never"], [3, "3 s"], [8, "8 s"], [15, "15 s"], [30, "30 s"]].map(([v, n]) => `<option value="${v}" ${dp.pause === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <p class="qset__h">Read mode split</p><div class="row-gap"><span class="muted">Video ${Math.round(sp.pct)}% · panel ${Math.round(100 - sp.pct)}%</span><button type="button" class="btn btn--sm btn--ghost" data-splitreset>Reset to 60 / 40</button></div>
      <p class="muted qset__note">Drag the divider between the video and the panel in Read mode (Shift+R), or use the arrow keys on it.</p>`;
  }
  function motionTab() {
    const m = motion(), S = (A.hist && A.hist.L.SETTINGS) || {}, lo = A.bg ? A.bg.opts().low : false;
    return `<p class="qset__h">Animation</p><div class="seg seg--sm qset__seg" role="group" aria-label="Motion">${[["system", "Follow system"], ["full", "Full motion"], ["reduced", "Reduced"]].map(([v, n]) => `<button type="button" data-motionset="${v}" aria-pressed="${m === v}">${n}</button>`).join("")}</div>
      <label class="switch"><input type="checkbox" data-hoverfx ${hoverFx() ? "checked" : ""}><span></span>Card hover animations</label>
      <label class="switch"><input type="checkbox" data-celeb ${S.celebrations !== false ? "checked" : ""}><span></span>Celebrations (confetti on milestones)</label>
      <label class="switch"><input type="checkbox" id="q-bgLow" data-bgflag="low" ${lo ? "checked" : ""}><span></span>Low-power backgrounds (20 fps, fewer particles)</label>
      <p class="muted qset__note">Reduced motion stops background animation, morphs and sheens. Animated backgrounds always pause while this tab is hidden.</p>`;
  }
  function tabHTML(t) {
    if (t === "theme") return themeTab();
    if (t === "bg") return A.bg ? A.bg.pickerHTML("q-") : "";
    if (t === "fonts") return fontsHTML();
    if (t === "layout") return layoutTab();
    return motionTab();
  }
  function openQS(tab) {
    if (QS && !QS.hidden) { closeQS(); return; }
    if (!QS) {
      QS = document.createElement("div"); QS.id = "qset"; QS.className = "qset"; QS.setAttribute("role", "dialog"); QS.setAttribute("aria-label", "Quick settings"); QS.setAttribute("aria-modal", "false");
      document.body.appendChild(QS);
    }
    const cur = tab || LS("qsTab") || "theme";
    QS.innerHTML = `<div class="qset__hd"><div class="qset__ttl"><b>Settings</b><a href="#/profile" data-qsfull class="linkbtn">All settings ›</a><button type="button" class="iconbtn iconbtn--sm" data-qsclose aria-label="Close settings">✕</button></div>
      <div class="qset__tabs" role="tablist" aria-label="Settings sections">${TABS.map(([k, n]) => `<button type="button" role="tab" id="qst-${k}" data-qstab="${k}" aria-selected="${k === cur}" aria-controls="qsBody">${n}</button>`).join("")}</div></div>
      <div class="qset__body" id="qsBody" role="tabpanel" aria-labelledby="qst-${cur}">${tabHTML(cur)}</div>`;
    QS.hidden = false; QS.dataset.tab = cur;
    place();
    const b = $("#setBtn"); if (b) b.setAttribute("aria-expanded", "true");
    setTimeout(() => { const t = QS.querySelector('[aria-selected="true"]'); t && t.focus({ preventScroll: true }); }, 20);
  }
  function place() {
    if (!QS || QS.hidden) return;
    const b = $("#setBtn"); if (!b || window.innerWidth <= 640) { QS.style.left = QS.style.top = QS.style.right = ""; QS.classList.add("qset--sheet"); return; }
    QS.classList.remove("qset--sheet");
    const r = b.getBoundingClientRect(), w = Math.min(460, window.innerWidth - 16);
    QS.style.width = w + "px"; QS.style.top = Math.round(r.bottom + 8) + "px"; QS.style.left = Math.round(Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))) + "px";
  }
  window.addEventListener("resize", () => requestAnimationFrame(place));
  function closeQS() { if (!QS) return; QS.hidden = true; const b = $("#setBtn"); if (b) { b.setAttribute("aria-expanded", "false"); } }
  function switchTab(t) {
    LS("qsTab", t); QS.dataset.tab = t;
    QS.querySelectorAll("[data-qstab]").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.qstab === t)));
    const bd = $("#qsBody"); bd.innerHTML = tabHTML(t); bd.setAttribute("aria-labelledby", "qst-" + t); bd.scrollTop = 0;
    if (A.bg && t === "bg") A.bg.paintCustomThumb();
  }
  function onQSClick(ev) {
    const t = ev.target;
    if (t.closest("[data-qsclose]")) { closeQS(); return; }
    if (t.closest("[data-qsfull]")) { closeQS(); return; }
    const tb = t.closest("[data-qstab]"); if (tb && QS) { switchTab(tb.dataset.qstab); return; }
    const fs = t.closest("[data-fontset]"); if (fs) { applyFont(fs.dataset.fontset); return; }
    const dn = t.closest("button[data-density]"); if (dn) { density(dn.dataset.density); $$("button[data-density]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.density === dn.dataset.density))); return; }
    const mo = t.closest("[data-motionset]"); if (mo) { motion(mo.dataset.motionset); $$("[data-motionset]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.motionset === mo.dataset.motionset))); return; }
    if (t.closest("[data-splitreset]")) { A.studio && A.studio.split.set(60); if (QS && !QS.hidden && QS.dataset.tab === "layout") switchTab("layout"); A.ui && A.ui.toast("Read-mode split reset to 60 / 40", { ms: 1200 }); return; }
    if (t.closest("[data-theme-set2]")) setTimeout(paintToggle, 0);
  }
  function onQSInput(ev) { if (ev.target.matches("[data-fs]")) fontScale(ev.target.value); }
  function onQSChange(ev) {
    const t = ev.target;
    if (t.matches("[data-dfon]") && A.studio) { const o = A.studio.df.prefs(); o.on = t.checked; A.studio.df.save(o); }
    if (t.matches("[data-dfpause]") && A.studio) { const o = A.studio.df.prefs(); o.pause = Number(t.value); A.studio.df.save(o); }
    if (t.matches("[data-hoverfx]")) hoverFx(t.checked);
    if (t.matches("[data-celeb]") && A.hist) { A.hist.L.SETTINGS.celebrations = t.checked; A.store.set("settings:v3", A.hist.L.SETTINGS); }
  }
  const inPrefs = (ev) => ev.target.closest && ev.target.closest("#qset, .settings__more");
  document.addEventListener("click", (ev) => { if (inPrefs(ev)) onQSClick(ev); });
  document.addEventListener("input", (ev) => { if (inPrefs(ev)) onQSInput(ev); });
  document.addEventListener("change", (ev) => { if (inPrefs(ev)) onQSChange(ev); });
  document.addEventListener("pointerdown", (ev) => { if (!QS || QS.hidden) return; if (ev.target.closest("#qset") || ev.target.closest("#setBtn") || ev.target.closest(".toasts")) return; closeQS(); }, true);
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && QS && !QS.hidden) { ev.stopImmediatePropagation(); closeQS(); const b = $("#setBtn"); b && b.focus(); return; }
    if (QS && !QS.hidden && (ev.key === "ArrowRight" || ev.key === "ArrowLeft") && ev.target.matches && ev.target.matches("[data-qstab]")) {
      const i = TABS.findIndex(([k]) => k === QS.dataset.tab), n = TABS[(i + (ev.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0]; switchTab(n); const nb = QS.querySelector(`[data-qstab="${n}"]`); nb && nb.focus(); ev.preventDefault();
    }
  }, true);

  /* ================================================================ keyboard shortcuts overlay */
  const KG = [
    { t: "Playback", c: "amber", k: [["Space", "K"], "Play / pause"], items: [[["Space"], "Play or pause"], [["K"], "Play or pause"], [["0", "–", "9"], "Jump to 0 %–90 %"], [["Home"], "Start (on the seek bar)"], [["End"], "End (on the seek bar)"], [[","], "Frame step back (paused)"], [["."], "Frame step forward (paused)"]] },
    { t: "Seeking", c: "teal", items: [[["J"], "Back 10 s"], [["L"], "Forward 10 s"], [["←"], "Back 5 s"], [["→"], "Forward 5 s"], [["Shift", "←"], "Back 30 s"], [["Shift", "→"], "Forward 30 s"], [["U"], "First part you have not watched"], [["S"], "Skip intro"]] },
    { t: "Speed & sound", c: "sky", items: [[["<"], "Slower (−0.25×)"], [[">"], "Faster (+0.25×, up to 2×)"], [["M"], "Mute"], [["↑"], "Volume up"], [["↓"], "Volume down"]] },
    { t: "Views & modes", c: "violet", items: [[["F"], "Full screen"], [["T"], "Theater mode / default view"], [["I"], "Miniplayer / expand"], [["Shift", "R"], "Read mode (video + panel)"], [["Z"], "Focus mode"], [["A"], "Headphones mode"], [["O"], "Float window"], [["Shift", "Y"], "YouTube's own controls"], [["Esc"], "Close / leave full screen / minimise"]] },
    { t: "Chapters & episodes", c: "coral", items: [[["Shift", "]"], "Next chapter"], [["Shift", "N"], "Next episode"], [["Shift", "P"], "Previous episode"], [["["], "Loop start"], [["]"], "Loop end"], [["\\"], "Clear loop"]] },
    { t: "Captions & notes", c: "lime", items: [[["C"], "Captions on / off"], [["B"], "Bookmark this moment"], [["N"], "Note at this moment"], [["W"], "Mark watched"]] },
    { t: "Navigate", c: "rose", items: [[["Ctrl", "K"], "Command palette"], [["/"], "Search"], [["?"], "This overlay"], [["G", "H"], "Go Home"], [["G", "B"], "Go to Browse"], [["G", "S"], "Go to Speakers"], [["G", "I"], "Go to Insights"], [["G", "Y"], "Go to History"], [["G", "W"], "Go to Watched"], [["G", "L"], "Go to Playlists"], [["Shift", "F10"], "Card menu"]] },
    { t: "Mouse & touch", c: "sky", items: [[["Double-click"], "Left / right third: ∓10 s · middle: full screen"], [["Swipe ↔"], "Seek (touch)"], [["Swipe ↕"], "Volume on the right half (touch)"], [["Drag"], "Move captions, the mini player or the Read-mode divider"]] },
  ];
  function keysHTML(q) {
    const f = A.fold ? A.fold(q || "").trim() : (q || "").toLowerCase().trim();
    let n = 0;
    const groups = KG.map((g) => { const its = g.items.filter(([ks, d]) => !f || (A.fold ? A.fold(ks.join(" ") + " " + d + " " + g.t) : (ks.join(" ") + d + g.t).toLowerCase()).includes(f)); n += its.length; return its.length ? `<section class="kgrp kgrp--${g.c}"><h3>${esc(g.t)}</h3><ul>${its.map(([ks, d]) => `<li><span class="kcaps">${ks.map((k) => (k === "–" ? `<i>–</i>` : `<kbd class="kcap">${esc(k)}</kbd>`)).join(ks.length > 1 && ks[1] !== "–" ? '<i>+</i>' : "")}</span><span class="kdesc">${esc(d)}</span></li>`).join("")}</ul></section>` : ""; }).join("");
    return { html: groups || `<p class="muted kempty">No shortcut matches “${esc(q)}”.</p>`, n };
  }
  function openKeys() {
    const m = $("#help"); if (!m) return;
    const sh = m.querySelector(".sheet"); sh.classList.add("keys9");
    sh.innerHTML = `<div class="sheet__hd keys9__hd"><div><h2 id="helpTitle">Keyboard shortcuts</h2><p class="muted">Work anywhere except while typing. Player keys need an episode open.</p></div>
      <input class="input input--sm keys9__q" id="keysQ" type="search" placeholder="Filter shortcuts…" aria-label="Filter shortcuts" autocomplete="off"><button class="iconbtn" data-close aria-label="Close">✕</button></div><div class="keys9__body" id="keysBody">${keysHTML("").html}</div>`;
    m.hidden = false;
    const q = $("#keysQ"); q.addEventListener("input", () => { $("#keysBody").innerHTML = keysHTML(q.value).html; });
    setTimeout(() => (window.innerWidth > 640 ? q : m.querySelector("[data-close]")).focus(), 20);
  }

  /* ================================================================ section skeletons (in-app) */
  const SK = {
    grid: (n) => `<div class="sk sk--grid">${"<div class=\"sk__card\"><i class=\"sk__img\"></i><i class=\"sk__l\"></i><i class=\"sk__l sk__l--s\"></i></div>".repeat(n || 8)}</div>`,
  };
  function skeleton(view) {
    const head = `<div class="sk sk--head"><i class="sk__eb"></i><i class="sk__h"></i><i class="sk__l"></i></div>`;
    const rows = (n) => `<div class="sk sk--rows">${"<div class=\"sk__row\"><i class=\"sk__th\"></i><span><i class=\"sk__l\"></i><i class=\"sk__l sk__l--s\"></i></span></div>".repeat(n)}</div>`;
    switch (view) {
      case "speakers": return head + `<div class="sk sk--people">${"<div class=\"sk__p\"><i class=\"sk__c\"></i><i class=\"sk__l\"></i><i class=\"sk__l sk__l--s\"></i></div>".repeat(12)}</div>`;
      case "history": case "recent": case "queue": case "notes": case "watched": case "playlists": return head + rows(7);
      case "insights": case "wrapped": return head + `<div class="sk sk--kpis">${"<i class=\"sk__kpi\"></i>".repeat(4)}</div><div class="sk sk--charts"><i class="sk__chart"></i><i class="sk__chart"></i></div>`;
      case "about": return head + `<div class="sk sk--text">${"<i class=\"sk__l\"></i>".repeat(10)}</div>`;
      case "explore": return head + `<div class="sk sk--cards">${"<i class=\"sk__xcard\"></i>".repeat(6)}</div>`;
      case "profile": return head + `<div class="sk sk--form">${"<div class=\"sk__frow\"><i class=\"sk__l\"></i><i class=\"sk__tog\"></i></div>".repeat(6)}</div>`;
      default: return head + SK.grid(8);
    }
  }

  /* ================================================================ wiring */
  function wire() {
    applyFont(LS("font") || root().getAttribute("data-font") || "inter", true);
    root().style.setProperty("--fs", String(fontScale()));
    if (LS("motion")) motion(LS("motion"));
    if (LS("density")) density(LS("density"));
    hoverFx(hoverFx());
    const tb = $("#themeBtn"); if (tb) { tb.onclick = flipTheme; paintToggle(); }
    const sb = $("#setBtn"); if (sb) sb.onclick = () => openQS();
    if (A.app) {
      const orig = A.app.setTheme; A.app.setTheme = function () { const r = orig.apply(this, arguments); paintToggle(); return r; };
      A.app.openHelp = openKeys;
    }
    const hb = $("#helpBtn"); if (hb) hb.onclick = openKeys;
    // the '?' key: app.js toggles #help; repaint it with the new overlay whenever it opens
    const help = $("#help");
    if (help && typeof MutationObserver !== "undefined") new MutationObserver(() => { if (!help.hidden && !help.querySelector(".keys9")) openKeys(); }).observe(help, { attributes: true, attributeFilter: ["hidden"] });
    if (window.matchMedia) { const mq = window.matchMedia("(prefers-color-scheme: light)"); const fn = () => setTimeout(paintToggle, 0); mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener && mq.addListener(fn); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();

  A.prefs = { FONTS, applyFont, fontScale, motion, density, hoverFx, openQS, closeQS, flipTheme, paintToggle, openKeys, keysHTML, KG, skeleton, fontsHTML, layoutTab, motionTab, tabHTML };
})(window.ASFE);
