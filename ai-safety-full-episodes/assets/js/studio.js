/* AI Safety Full Episodes · studio: the watching layer on top of the player.
 *  - ccx: our own caption overlay from the episode transcripts (data/captions/<id>.json), synced to the player clock,
 *    draggable anywhere over the video (position remembered), size / background / colour / lines; YouTube's captions are
 *    switched off while ours show (YouTube's own captions stay one click away through "YouTube controls").
 *  - Distraction-free watching: while a video plays on the episode page, the details, reading tabs and binge line-up fold
 *    into a slim bar with a "Details" pill; they come back when you open them, when the episode ends or after a pause.
 *  - Read mode split: drag the divider between video and panel (pointer, touch, arrow keys; double-click resets),
 *    collapse the panel completely and bring it back from the edge handle; the width is remembered.
 * Built by Aniruddha Adak. */
(function (A) {
  "use strict";
  const { $, $$, esc, clamp, fmtTime, STATE } = A;
  const P = () => A.P;
  const pl = () => A.player;
  const store = A.store;
  const body = () => document.body;

  /* ================================================================ captions overlay */
  const CDEF = { on: false, x: 0.5, y: 0.1, size: 100, bg: 62, color: "#ffffff", lines: 2, font: "body", edge: "shadow" };
  const CC = { idx: null, cues: null, id: null, el: null, raf: 0, last: -1, loading: null, timer: 0 };
  const COLORS = [["#ffffff", "White"], ["#fde047", "Yellow"], ["#67e8f9", "Cyan"], ["#86efac", "Green"], ["#fbbf24", "Amber"], ["#f9a8d4", "Pink"]];
  function cprefs() { const saved = store.get("ccx:v1", null); const o = Object.assign({}, CDEF, { on: !!((A.hist && A.hist.L && A.hist.L.SETTINGS) || {}).captions }, saved || {}); o.x = clamp(Number(o.x), 0.05, 0.95); o.y = clamp(Number(o.y), 0.02, 0.9); o.size = clamp(Number(o.size) || 100, 60, 220); o.bg = clamp(Number(o.bg), 0, 100); o.lines = clamp(Math.round(Number(o.lines) || 2), 1, 3); if (!/^#[0-9a-f]{6}$/i.test(o.color)) o.color = "#ffffff"; return o; }
  function csave(o) { store.set("ccx:v1", o); }
  async function loadIndex() {
    if (CC.idx) return CC.idx;
    try { const r = await fetch("data/captions/index.json"); CC.idx = new Set(r.ok ? await r.json() : []); } catch (e) { CC.idx = new Set(); }
    return CC.idx;
  }
  /* every episode in the library has a transcript; the index is the authority once it has loaded */
  function has(id) { return CC.idx ? CC.idx.has(id) : !!id; }
  async function loadCues(id) {
    if (CC.id === id && CC.cues) return CC.cues;
    CC.id = id; CC.cues = null; CC.last = -1;
    await loadIndex();
    if (!CC.idx.has(id)) return null;
    try {
      const r = await fetch(`data/captions/${encodeURIComponent(id)}.json`);
      if (!r.ok) return null;
      const d = await r.json();
      if (CC.id !== id || !d || !Array.isArray(d.c)) return null;
      CC.cues = d.c.filter((c) => Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "string").map((c) => [c[0] / 10, c[1]]);
      return CC.cues;
    } catch (e) { return null; }
  }
  function cueAt(t) {
    const c = CC.cues; if (!c || !c.length) return -1;
    let lo = 0, hi = c.length - 1, ans = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (c[m][0] <= t + 0.05) { ans = m; lo = m + 1; } else hi = m - 1; }
    if (ans < 0) return -1;
    const end = ans + 1 < c.length ? Math.min(c[ans + 1][0], c[ans][0] + 7) : c[ans][0] + 7;
    return t <= end ? ans : -1;
  }
  function host() {
    if (CC.el && CC.el.isConnected) return CC.el;
    const pv = $("#pv"); if (!pv) return null;
    const el = document.createElement("div");
    el.id = "ccx"; el.className = "ccx"; el.hidden = true; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Captions (drag to move)"); el.setAttribute("aria-live", "off");
    el.innerHTML = `<div class="ccx__box" tabindex="0" title="Drag to move the captions · double-click to put them back"><span class="ccx__tx"></span><button type="button" class="ccx__gear" data-ccx="style" aria-label="Caption style" title="Caption style">Aa</button></div>`;
    const hit = $("#pvHit"); if (hit && hit.nextSibling) pv.insertBefore(el, hit.nextSibling); else pv.appendChild(el);
    CC.el = el; dragCaptions(el); paintStyle();
    return el;
  }
  function paintStyle() {
    const el = CC.el; if (!el) return; const o = cprefs();
    el.style.setProperty("--ccx-x", (o.x * 100).toFixed(2) + "%");
    el.style.setProperty("--ccx-y", (o.y * 100).toFixed(2) + "%");
    el.style.setProperty("--ccx-scale", String(o.size / 100));
    el.style.setProperty("--ccx-bg", `rgba(0,0,0,${(o.bg / 100).toFixed(2)})`);
    el.style.setProperty("--ccx-color", o.color);
    el.dataset.font = o.font; el.dataset.edge = o.edge; el.dataset.lines = String(o.lines);
  }
  function isOn() { return cprefs().on && !(A.hist.L.SETTINGS || {}).nativeControls && (A.hist.L.SETTINGS || {}).ccSource !== "youtube"; }
  function visibleNow() { const p = P(); return !!(p && p.cur && isOn() && CC.cues && p.mode !== "audio" && !p.pip); }
  function paint(force) {
    const el = host(); if (!el) return;
    const p = P();
    if (!visibleNow()) { if (!el.hidden) el.hidden = true; return; }
    const t = pl().curTime ? pl().curTime() : 0;
    const i = cueAt(t);
    if (i !== CC.last || force) {
      CC.last = i;
      const o = cprefs();
      const tx = el.querySelector(".ccx__tx");
      if (i < 0) { tx.innerHTML = ""; el.classList.add("is-empty"); }
      else {
        const lines = [];
        for (let k = Math.max(0, i - o.lines + 1); k <= i; k++) { const c = CC.cues[k]; if (c && t - c[0] < 9) lines.push(c[1]); }
        tx.innerHTML = lines.map((x) => `<span class="ccx__ln">${esc(x)}</span>`).join("");
        el.classList.remove("is-empty");
      }
    }
    el.hidden = false;
    // keep the captions above the control bar while it shows (never under it)
    const d = $("#dock"), bar = $("#pv .pv__bottom"), box = el.querySelector(".ccx__box");
    let lift = 0;
    if (d && bar && box && !p.sticky && p.mode !== "mini") {
      const barShown = d.classList.contains("pv--show") || !body().classList.contains("is-playing");
      if (barShown) { const vr = el.getBoundingClientRect(); const bh = bar.offsetHeight || 0; const bottomGap = cprefs().y * vr.height; lift = Math.max(0, bh + 6 - bottomGap); }
    }
    el.style.setProperty("--ccx-lift", lift + "px");
  }
  function loop() {
    cancelAnimationFrame(CC.raf);
    const step = () => { CC.raf = 0; paint(); if (P() && P().playing && visibleNow()) CC.timer = setTimeout(() => { CC.raf = requestAnimationFrame(step); }, 120); };
    clearTimeout(CC.timer); CC.raf = requestAnimationFrame(step);
  }
  async function attach() {
    const p = P(); if (!p || !p.cur) return;
    const id = p.cur.id;
    if (!isOn()) { paint(); return; }
    await loadCues(id);
    if (!P().cur || P().cur.id !== id) return;
    CC.last = -1; paint(true); loop();
  }
  function toggle(force) {
    const o = cprefs(); o.on = force == null ? !o.on : !!force; csave(o);
    const S = A.hist.L.SETTINGS; if (o.on && S.ccSource === "youtube") { S.ccSource = "ours"; store.set("settings:v3", S); }
    if (o.on) attach(); else paint();
    return o.on;
  }
  function dragCaptions(el) {
    const box = el.querySelector(".ccx__box"); let st = null;
    box.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest("[data-ccx]")) return;
      const r = el.getBoundingClientRect(); const b = box.getBoundingClientRect();
      st = { x: ev.clientX, y: ev.clientY, r, cx: b.left + b.width / 2, by: b.bottom, moved: false };
      try { box.setPointerCapture(ev.pointerId); } catch (x) {}
      ev.stopPropagation(); ev.preventDefault();
    });
    box.addEventListener("pointermove", (ev) => {
      if (!st) return;
      const dx = ev.clientX - st.x, dy = ev.clientY - st.y;
      if (!st.moved && Math.hypot(dx, dy) < 4) return;
      st.moved = true; box.classList.add("is-drag");
      const o = cprefs();
      o.x = clamp((st.cx + dx - st.r.left) / st.r.width, 0.08, 0.92);
      o.y = clamp((st.r.bottom - (st.by + dy)) / st.r.height, 0.02, 0.88);
      csave(o); paintStyle(); el.style.setProperty("--ccx-lift", "0px");
    });
    const end = (ev) => { if (!st) return; const moved = st.moved; st = null; box.classList.remove("is-drag"); if (moved) { A.ui.toast("Caption position saved", { ms: 1000 }); P().dragJustEnded = performance.now(); } ev && ev.stopPropagation(); };
    box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
    box.addEventListener("dblclick", (ev) => { ev.stopPropagation(); const o = cprefs(); o.x = CDEF.x; o.y = CDEF.y; csave(o); paintStyle(); paint(true); });
    box.addEventListener("keydown", (ev) => { const o = cprefs(); const k = { ArrowUp: [0, 0.02], ArrowDown: [0, -0.02], ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0] }[ev.key]; if (!k) return; ev.preventDefault(); ev.stopPropagation(); o.x = clamp(o.x + k[0], 0.08, 0.92); o.y = clamp(o.y + k[1], 0.02, 0.88); csave(o); paintStyle(); });
    box.addEventListener("click", (ev) => { const b = ev.target.closest("[data-ccx=style]"); if (b) { ev.stopPropagation(); openStyle(b); } });
  }
  function styleHTML() {
    const o = cprefs(), S = A.hist.L.SETTINGS;
    return `<p class="mh"><span>Caption style</span><button type="button" class="mb ccxp__x" data-ccxp="close" aria-label="Close">✕</button></p>
      <label class="ccxp__row"><span>Size <output id="ccxSizeV">${o.size}%</output></span><input type="range" id="ccxSize" min="60" max="220" step="5" value="${o.size}" aria-label="Caption size"></label>
      <label class="ccxp__row"><span>Background <output id="ccxBgV">${o.bg}%</output></span><input type="range" id="ccxBg" min="0" max="100" step="5" value="${o.bg}" aria-label="Caption background opacity"></label>
      <div class="ccxp__row"><span>Colour</span><div class="ccxp__sw" role="group" aria-label="Caption colour">${COLORS.map(([c, n]) => `<button type="button" class="ccxp__c ${o.color === c ? "is-on" : ""}" data-ccxp="color" data-v="${c}" style="--c:${c}" aria-pressed="${o.color === c}" aria-label="${n}" title="${n}"></button>`).join("")}</div></div>
      <div class="ccxp__row"><span>Lines</span><div class="ccxp__seg">${[1, 2, 3].map((n) => `<button type="button" data-ccxp="lines" data-v="${n}" aria-pressed="${o.lines === n}">${n}</button>`).join("")}</div></div>
      <div class="ccxp__row"><span>Font</span><div class="ccxp__seg">${[["body", "Site"], ["legible", "Legible"], ["mono", "Mono"]].map(([v, n]) => `<button type="button" data-ccxp="font" data-v="${v}" aria-pressed="${o.font === v}">${n}</button>`).join("")}</div></div>
      <div class="ccxp__row"><span>Edge</span><div class="ccxp__seg">${[["shadow", "Shadow"], ["outline", "Outline"], ["none", "None"]].map(([v, n]) => `<button type="button" data-ccxp="edge" data-v="${v}" aria-pressed="${o.edge === v}">${n}</button>`).join("")}</div></div>
      <div class="ccxp__act"><button type="button" class="mi" data-ccxp="reset"><span>Put captions back at the bottom</span></button><button type="button" class="mi" data-ccxp="yt"><span>Use YouTube's captions instead</span><b>${S.nativeControls ? "On" : "▶"}</b></button></div>
      <p class="mnote">Drag the captions anywhere over the video. They come from the episode transcript and follow the player clock.</p>`;
  }
  function openStyle() {
    const pv = $("#pv"); if (!pv) return;
    let m = $("#ccxPanel");
    if (m && !m.hidden) { m.hidden = true; return; }
    if (!m) { m = document.createElement("div"); m.id = "ccxPanel"; m.className = "pv__menu ccxp"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Caption style"); pv.appendChild(m); wireStyle(m); }
    m.innerHTML = styleHTML(); m.hidden = false;
    pl().showUI && pl().showUI();
  }
  function wireStyle(m) {
    m.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    m.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const b = ev.target.closest("[data-ccxp]"); if (!b) return;
      const o = cprefs(), a = b.dataset.ccxp;
      if (a === "close") { m.hidden = true; return; }
      if (a === "color") o.color = b.dataset.v;
      if (a === "lines") o.lines = Number(b.dataset.v);
      if (a === "font") o.font = b.dataset.v;
      if (a === "edge") o.edge = b.dataset.v;
      if (a === "reset") { o.x = CDEF.x; o.y = CDEF.y; }
      if (a === "yt") { m.hidden = true; pl().toggleNative(true); return; }
      csave(o); paintStyle(); paint(true); m.innerHTML = styleHTML();
    });
    m.addEventListener("input", (ev) => {
      const o = cprefs();
      if (ev.target.id === "ccxSize") { o.size = Number(ev.target.value); $("#ccxSizeV").textContent = o.size + "%"; }
      if (ev.target.id === "ccxBg") { o.bg = Number(ev.target.value); $("#ccxBgV").textContent = o.bg + "%"; }
      csave(o); paintStyle(); paint(true);
    });
  }
  document.addEventListener("asfe:state", (ev) => { if (ev.detail === 1) attach(); else paint(true); dfOnState(ev.detail); });
  document.addEventListener("asfe:native", () => { setTimeout(() => paint(true), 50); });
  document.addEventListener("asfe:layout", () => { paint(true); placeSplit(); dfSync(); });
  document.addEventListener("click", (ev) => { const m = $("#ccxPanel"); if (m && !m.hidden && !ev.target.closest("#ccxPanel") && !ev.target.closest("[data-ccx=style]") && !ev.target.closest('[data-pc="ccstyle"]') && !ev.target.closest('[data-pc="settings"]')) m.hidden = true; });
  /* a seek repaints straight away, even when paused */
  setInterval(() => { if (CC.el && !CC.el.hidden && P() && !P().playing) paint(); }, 500);
  loadIndex();

  /* ================================================================ distraction-free watching */
  const DDEF = { on: true, pause: 8 };
  const D = { open: false, auto: false, pauseT: 0, rail: false };
  function dprefs() { const o = Object.assign({}, DDEF, store.get("df:v1", {}) || {}); o.pause = [0, 3, 8, 15, 30].includes(Number(o.pause)) ? Number(o.pause) : 8; o.on = o.on !== false; return o; }
  function dsave(o) { store.set("df:v1", o); dfSync(); }
  function dfEligible() { const p = P(); return !!(p && p.cur && dprefs().on && p.mode === "theater" && !p.sticky && !p.fs && !p.read); }
  function dfBar() {
    const main = $(".theater__main"); if (!main) return null;
    let bar = $("#dfBar");
    if (!bar) {
      bar = document.createElement("div"); bar.id = "dfBar"; bar.className = "dfbar";
      const info = $("#thInfo"); main.insertBefore(bar, info || null);
      bar.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-df]"); if (!b) return;
        if (b.dataset.df === "details") { D.open = !D.open; D.auto = false; dfSync(); if (D.open) { const t = $("#thInfo"); t && t.focus && t.setAttribute("tabindex", "-1"); } }
        if (b.dataset.df === "rail") { D.rail = !D.rail; dfSync(); }
        if (b.dataset.df === "off") { const o = dprefs(); o.on = false; dsave(o); A.ui.toast("Details stay open while playing. Turn this back on in Settings › Layout.", { ms: 2600 }); }
      });
    }
    return bar;
  }
  function paintBar() {
    const bar = dfBar(); const p = P(); if (!bar || !p || !p.cur) return;
    const e = p.cur; const n = A.binge ? A.binge.lineup(e, 10).length : 0;
    const key = `${e.id}|${D.open}|${D.rail}|${n}|${A.binge && A.binge.on()}`;
    if (bar.dataset.k === key) return; bar.dataset.k = key;
    bar.innerHTML = `<div class="dfbar__tx"><b>${esc(e.title)}</b><small>${esc(A.ui.whoLine(e, 3))} · ${esc(e.durStr)} · ${esc(A.fmtDate(e.date, e.approx))}</small></div>
      <div class="dfbar__act"><button type="button" class="dfpill ${D.open ? "is-on" : ""}" data-df="details" aria-expanded="${D.open}" aria-controls="thInfo">${D.open ? "Hide details" : "Details"} <span class="dfpill__car" aria-hidden="true">▾</span></button>
      ${n ? `<button type="button" class="dfpill dfpill--rail ${D.rail ? "is-on" : ""}" data-df="rail" aria-expanded="${D.rail}">🍿 Up next · ${n} <span class="dfpill__car" aria-hidden="true">▾</span></button>` : ""}
      <button type="button" class="dfpill dfpill--ghost" data-df="off" title="Always show details and panels while playing">Keep open</button></div>`;
  }
  function dfSync() {
    const b = body(); const el = dfEligible();
    const playingish = !!(P() && (P().playing || D.holdPlaying));
    const on = el && playingish && !D.open;
    b.classList.toggle("df-on", on);
    b.classList.toggle("df-ready", el);
    b.classList.toggle("df-rail", el && D.rail);
    b.classList.toggle("df-open", el && D.open);
    if (el) paintBar();
    const info = $("#thInfo"); if (info) info.setAttribute("aria-hidden", String(on));
  }
  function dfOnState(s) {
    clearTimeout(D.pauseT);
    const o = dprefs();
    if (s === 1) { D.holdPlaying = false; if (D.auto) { D.open = false; D.auto = false; } }
    else if (s === 0) { D.holdPlaying = false; if (!D.open) { D.open = true; D.auto = true; } }
    else if (s === 2) {
      D.holdPlaying = true; // a short pause keeps the calm layout
      if (o.pause > 0) D.pauseT = setTimeout(() => { D.holdPlaying = false; if (!D.open) { D.open = true; D.auto = true; } dfSync(); }, (P().dfWait != null ? P().dfWait : o.pause * 1000));
    }
    dfSync();
    setTimeout(() => pl().relayout && pl().relayout(), 0);
  }
  /* a new episode starts calm again */
  document.addEventListener("asfe:layout", () => { const p = P(); if (p && p.cur && D.lastId !== p.cur.id) { D.lastId = p.cur.id; D.open = false; D.auto = false; D.rail = false; D.holdPlaying = false; const d = $("#dock"); if (d && !(p.ready && p.yt && p.lastState === 1)) { d.classList.add("is-loading"); clearTimeout(D.ldT); D.ldT = setTimeout(() => d.classList.remove("is-loading"), 8000); } } });
  document.addEventListener("asfe:state", () => { const d = $("#dock"); if (d) d.classList.remove("is-loading"); });
  /* the binge rail gets its own fold button too */
  function wrapBinge() {
    if (!A.binge || A.binge.__df) return; const orig = A.binge.paintRail; A.binge.__df = true;
    A.binge.paintRail = function () { const r = orig.apply(this, arguments); const rail = $("#bingeRail"); if (rail) { const hd = rail.querySelector(".brail__hd"); if (hd && !hd.querySelector("[data-bfold]")) { const b = document.createElement("button"); b.type = "button"; b.className = "chip brail__fold"; b.dataset.bfold = "1"; const min = !!store.get("brailMin", 0); b.setAttribute("aria-expanded", String(!min)); b.textContent = min ? "Show line-up ▾" : "Hide line-up ▴"; hd.appendChild(b); rail.classList.toggle("brail--min", min); } } return r; };
    document.addEventListener("click", (ev) => { const b = ev.target.closest && ev.target.closest("[data-bfold]"); if (!b) return; const min = !store.get("brailMin", 0); store.set("brailMin", min ? 1 : 0); const rail = $("#bingeRail"); rail && rail.classList.toggle("brail--min", min); b.setAttribute("aria-expanded", String(!min)); b.textContent = min ? "Show line-up ▾" : "Hide line-up ▴"; });
  }

  /* ================================================================ Read mode: resizable split + collapsible panel */
  const SP = { min: 34, max: 78, def: 60 };
  function spref() { const o = store.get("split:v1", {}) || {}; return { pct: clamp(Number(o.pct) || SP.def, SP.min, SP.max), collapsed: !!o.collapsed }; }
  function ssave(o) { store.set("split:v1", o); }
  function splitEls() {
    const th = $("#theater"); if (!th) return {};
    let dv = $("#rdSplit"), op = $("#rdOpen");
    if (!dv) {
      dv = document.createElement("div"); dv.id = "rdSplit"; dv.className = "rdsplit"; dv.setAttribute("role", "separator"); dv.setAttribute("aria-orientation", "vertical"); dv.setAttribute("tabindex", "0");
      dv.setAttribute("aria-label", "Resize video and reading panel (arrow keys; double-click to reset)"); dv.setAttribute("aria-valuemin", String(SP.min)); dv.setAttribute("aria-valuemax", String(SP.max));
      dv.innerHTML = `<span class="rdsplit__grip" aria-hidden="true"><i></i><i></i><i></i></span><button type="button" class="rdsplit__x" data-rd="collapse" aria-label="Hide the reading panel" title="Hide the panel (video gets the full width)">›</button>`;
      th.appendChild(dv);
      op = document.createElement("button"); op.type = "button"; op.id = "rdOpen"; op.className = "rdopen"; op.dataset.rd = "open"; op.setAttribute("aria-label", "Show the reading panel"); op.title = "Show the reading panel";
      op.innerHTML = `<span aria-hidden="true">‹</span><b>Panel</b>`; th.appendChild(op);
      wireSplit(dv, op);
    }
    return { th, dv, op };
  }
  function applySplit() {
    const { th } = splitEls(); if (!th) return;
    const o = spref();
    th.style.setProperty("--rd-main", o.pct + "%");
    body().classList.toggle("rd-collapsed", o.collapsed);
    const dv = $("#rdSplit"); if (dv) { dv.setAttribute("aria-valuenow", String(Math.round(o.pct))); dv.setAttribute("aria-valuetext", `Video ${Math.round(o.pct)}%, panel ${Math.round(100 - o.pct)}%`); }
    placeSplit();
    if (pl().syncChBtns) pl().syncChBtns();
  }
  function placeSplit() {
    const dv = $("#rdSplit"); if (!dv) return;
    const side = $(".theater__side"), th = $("#theater");
    const zenOk = !body().classList.contains("is-zen") || body().classList.contains("ch-dock");
    const active = body().classList.contains("is-read") && window.innerWidth > 900 && !body().classList.contains("rd-collapsed") && zenOk;
    dv.hidden = !active;
    const op = $("#rdOpen"); if (op) op.hidden = !(body().classList.contains("is-read") && window.innerWidth > 900 && body().classList.contains("rd-collapsed") && zenOk);
    if (!active || !side || !th) return;
    const tr = th.getBoundingClientRect(), sr = side.getBoundingClientRect();
    dv.style.left = Math.round(sr.left - tr.left - 7) + "px";
  }
  function setPct(pct, save) {
    const th = $("#theater"); if (!th) return;
    const W = th.clientWidth || window.innerWidth;
    const maxByPanel = 100 - (300 / W) * 100;
    pct = clamp(pct, SP.min, Math.min(SP.max, maxByPanel));
    const o = spref(); o.pct = Math.round(pct * 10) / 10; if (save !== false) ssave(o); else store.set("split:v1", o);
    applySplit(); pl().relayout && pl().relayout();
  }
  function setCollapsed(on) {
    const o = spref(); o.collapsed = !!on; ssave(o); applySplit(); pl().relayout && pl().relayout();
    const f = on ? $("#rdOpen") : $("#rdSplit"); if (f && f.focus) setTimeout(() => f.focus(), 30);
  }
  function wireSplit(dv, op) {
    let st = null;
    dv.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest("[data-rd]")) return;
      const th = $("#theater"); st = { left: th.getBoundingClientRect().left, w: th.clientWidth };
      try { dv.setPointerCapture(ev.pointerId); } catch (x) {}
      dv.classList.add("is-drag"); body().classList.add("is-splitting"); ev.preventDefault();
    });
    dv.addEventListener("pointermove", (ev) => { if (!st) return; setPct(((ev.clientX - st.left) / st.w) * 100, false); });
    const end = () => { if (!st) return; st = null; dv.classList.remove("is-drag"); body().classList.remove("is-splitting"); ssave(spref()); };
    dv.addEventListener("pointerup", end); dv.addEventListener("pointercancel", end);
    dv.addEventListener("dblclick", (ev) => { if (ev.target.closest("[data-rd]")) return; setPct(SP.def); A.ui.toast("Split reset to 60 / 40", { ms: 1100 }); });
    dv.addEventListener("keydown", (ev) => {
      const o = spref();
      if (ev.key === "ArrowLeft") { ev.preventDefault(); setPct(o.pct - (ev.shiftKey ? 8 : 2)); }
      else if (ev.key === "ArrowRight") { ev.preventDefault(); setPct(o.pct + (ev.shiftKey ? 8 : 2)); }
      else if (ev.key === "Home") { ev.preventDefault(); setPct(SP.min); }
      else if (ev.key === "End") { ev.preventDefault(); setPct(SP.max); }
      else if (ev.key === "Enter") { ev.preventDefault(); setCollapsed(true); }
    });
    dv.addEventListener("click", (ev) => { if (ev.target.closest("[data-rd=collapse]")) setCollapsed(true); });
    op.addEventListener("click", () => setCollapsed(false));
  }
  window.addEventListener("resize", () => requestAnimationFrame(placeSplit));

  /* mobile bottom sheet: remember the height you dragged it to */
  document.addEventListener("pointerup", (ev) => { if (ev.target.closest && ev.target.closest(".sheet__grip") && P() && P().sheetH) store.set("sheetH", Math.round(P().sheetH)); }, true);


  /* ================================================================ full screen side panel: Chapters + "In this video" transcript.
   * Opens from the Chapters button and STAYS open until you close it (✕, the Chapters button again, or Esc in the CSS full
   * screen); the controls' auto-hide never touches it. Side mode shrinks the video to fit beside it (drag the divider);
   * Overlay mode floats it semi-transparent over the video; narrow / portrait screens get a bottom sheet you can drag. */
  const FDEF = { open: true, mode: "side", w: 400, h: 46, tab: "chapters" };
  const F = { el: null, lines: null, lid: null, nowLine: -1, nowCh: -1, userScroll: 0, iv: 0 };
  function fprefs() { const o = Object.assign({}, FDEF, store.get("fsp:v1", {}) || {}); o.mode = o.mode === "overlay" ? "overlay" : "side"; o.w = clamp(Number(o.w) || 400, 260, 900); o.h = clamp(Number(o.h) || 46, 25, 75); o.tab = o.tab === "tx" ? "tx" : "chapters"; return o; }
  function fsave(o) { store.set("fsp:v1", o); }
  const narrow = () => window.innerWidth <= 760 || window.innerHeight > window.innerWidth * 1.05;
  function fEl() {
    const d = $("#dock"); if (!d) return null;
    if (F.el && F.el.isConnected) return F.el;
    const div = document.createElement("div"); div.id = "fspDiv"; div.className = "fspdiv"; div.setAttribute("role", "separator"); div.setAttribute("tabindex", "0");
    div.setAttribute("aria-label", "Resize the chapters panel (arrow keys; double-click to reset)"); div.innerHTML = `<span aria-hidden="true"><i></i><i></i><i></i></span><button type="button" class="fspdiv__x" data-fspx aria-label="Hide the panel" title="Hide the panel (Chapters button brings it back)">›</button>`;
    const el = document.createElement("aside"); el.id = "fsp"; el.className = "fsp"; el.hidden = true; el.setAttribute("aria-label", "Chapters and transcript");
    d.appendChild(div); d.appendChild(el); F.el = el; F.div = div;
    el.addEventListener("click", onFClick); el.addEventListener("scroll", () => {}, { passive: true });
    el.addEventListener("wheel", () => { F.userScroll = performance.now(); }, { passive: true });
    el.addEventListener("touchmove", () => { F.userScroll = performance.now(); }, { passive: true });
    el.addEventListener("input", (ev) => { if (ev.target.id === "fspQ") { F.q = ev.target.value; filterF(); } });
    ["pointerdown", "pointermove", "pointerup", "click", "dblclick"].forEach((t) => el.addEventListener(t, (ev) => ev.stopPropagation()));
    wireFDiv(div);
    return el;
  }
  function fIsOpen() { return !!(F.el && !F.el.hidden && P() && P().fs); }
  function paintF(full) {
    const el = fEl(); const p = P(); if (!el || !p || !p.cur) return;
    const o = fprefs(), d = $("#dock");
    const open = !!(p.fs && o.open);
    el.hidden = !open; F.div.hidden = !open || o.mode !== "side";
    d.classList.toggle("has-fsp", open); d.classList.toggle("fsp--overlay", open && o.mode === "overlay"); d.classList.toggle("fsp--side", open && o.mode === "side"); d.classList.toggle("fsp--sheet", open && narrow());
    d.style.setProperty("--fsp-w", o.w + "px"); d.style.setProperty("--fsp-h", o.h + "%");
    if (p.fs) $$('[data-pc="rail"]').forEach((b) => b.setAttribute("aria-pressed", String(open)));
    if (!open) return;
    if (full || el.dataset.id !== p.cur.id || el.dataset.tab !== o.tab || el.dataset.mode !== o.mode) {
      el.dataset.id = p.cur.id; el.dataset.tab = o.tab; el.dataset.mode = o.mode;
      const e = p.cur;
      el.innerHTML = `<div class="fsp__hd"><div class="fsp__tabs" role="tablist" aria-label="Panel"><button type="button" role="tab" data-fsp="tab" data-v="chapters" aria-selected="${o.tab === "chapters"}">Chapters <small>${e.chapters.length}</small></button><button type="button" role="tab" data-fsp="tab" data-v="tx" aria-selected="${o.tab === "tx"}">In this video</button></div>
        <div class="fsp__tools"><button type="button" class="fsp__mode" data-fsp="mode" title="${o.mode === "side" ? "Float over the video (semi-transparent)" : "Put the panel beside the video"}" aria-label="${o.mode === "side" ? "Overlay mode" : "Side mode"}">${o.mode === "side" ? "⧉ Overlay" : "▥ Side"}</button><button type="button" class="fsp__x" data-fsp="close" aria-label="Close panel" title="Close (Esc)">✕</button></div></div>
        ${o.tab === "tx" ? `<input class="fsp__q" id="fspQ" type="search" placeholder="Search the transcript" aria-label="Search the transcript" value="${esc(F.q || "")}">` : ""}
        <div class="fsp__body" id="fspBody">${o.tab === "chapters" ? chaptersF(e) : `<p class="fsp__load">Loading the transcript…</p>`}</div>`;
      if (o.tab === "tx") buildTx(e);
      F.nowLine = -1; F.nowCh = -1; tickF(true);
    }
  }
  function chaptersF(e) {
    if (!e.chapters.length) return `<p class="fsp__empty">No timestamped chapters for this one. Try “In this video” for the full transcript.</p>`;
    return `<ol class="fsp__chaps">${e.chapters.map((c, i) => `<li><button type="button" class="fsp__ch" data-i="${i}" ${c.t == null ? "disabled" : `data-fseek="${c.t}"`}><span class="fsp__t">${c.t == null ? "·" : fmtTime(c.t)}</span><span class="fsp__ct"><b>${esc(c.title)}</b>${c.detail ? `<small>${esc(c.detail)}</small>` : ""}</span></button></li>`).join("")}</ol>`;
  }
  async function buildTx(e) {
    const id = e.id; const cues = await loadCues(id);
    const body = $("#fspBody"); if (!body || !P().cur || P().cur.id !== id || fprefs().tab !== "tx") return;
    if (!cues || !cues.length) { body.innerHTML = `<p class="fsp__empty">No transcript stored for this episode.</p>`; return; }
    // merge short cues into readable lines (~22 words) and group them under each chapter
    const lines = []; let cur = null;
    cues.forEach((c) => { if (!cur || cur.w >= 22 || c[0] - cur.t > 25) { cur = { t: c[0], tx: c[1], w: c[1].split(" ").length }; lines.push(cur); } else { cur.tx += " " + c[1]; cur.w += c[1].split(" ").length; } });
    F.lines = lines; F.lid = id;
    const chs = e.chapters.filter((c) => c.t != null);
    let html = "", ci = -1;
    lines.forEach((ln, i) => {
      let k = ci; while (k + 1 < chs.length && chs[k + 1].t <= ln.t + 0.5) k++;
      if (k !== ci || i === 0) { if (i) html += `</ol></section>`; ci = k; const ch = chs[k]; html += `<section class="fsp__grp" data-ci="${k}"><h4 class="fsp__gh"><button type="button" data-fseek="${ch ? ch.t : 0}"><span class="fsp__t">${fmtTime(ch ? ch.t : 0)}</span>${esc(ch ? ch.title : "Opening")}</button></h4><ol class="fsp__lines">`; }
      html += `<li><button type="button" class="fsp__ln" data-li="${i}" data-fseek="${ln.t}"><span class="fsp__t">${fmtTime(ln.t)}</span><span class="fsp__lt">${esc(ln.tx)}</span></button></li>`;
    });
    body.innerHTML = html + `</ol></section>`;
    filterF(); F.nowLine = -1; tickF(true);
  }
  function filterF() {
    const q = A.fold ? A.fold(F.q || "").trim() : (F.q || "").toLowerCase();
    $$("#fspBody .fsp__lines > li").forEach((li) => { li.hidden = !!q && !(A.fold ? A.fold(li.textContent) : li.textContent.toLowerCase()).includes(q); });
    $$("#fspBody .fsp__grp").forEach((g) => { g.hidden = !!q && !g.querySelector(".fsp__lines > li:not([hidden])"); });
  }
  function tickF(force) {
    if (!fIsOpen()) return;
    const p = P(), t = pl().curTime ? pl().curTime() : 0, o = fprefs();
    const body = $("#fspBody"); if (!body) return;
    let target = null;
    if (o.tab === "chapters") {
      const i = pl().chapterAt ? pl().chapterAt(t) : -1;
      if (i !== F.nowCh || force) { F.nowCh = i; $$("#fspBody .fsp__ch").forEach((b) => b.classList.toggle("is-now", Number(b.dataset.i) === i)); target = $("#fspBody .fsp__ch.is-now"); }
    } else if (F.lines && F.lid === p.cur.id) {
      let lo = 0, hi = F.lines.length - 1, a = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (F.lines[m].t <= t + 0.2) { a = m; lo = m + 1; } else hi = m - 1; }
      if (a !== F.nowLine || force) { const old = body.querySelector(".fsp__ln.is-now"); if (old) old.classList.remove("is-now"); F.nowLine = a; const nb = body.querySelector(`.fsp__ln[data-li="${a}"]`); if (nb) { nb.classList.add("is-now"); target = nb; } }
    }
    if (target && performance.now() - F.userScroll > 4000) {
      const br = body.getBoundingClientRect(), tr = target.getBoundingClientRect();
      if (force || tr.top < br.top + 40 || tr.bottom > br.bottom - 40) { const top = body.scrollTop + (tr.top - br.top) - br.height * 0.3; if (body.scrollTo) body.scrollTo({ top, behavior: force || A.RM ? "auto" : "smooth" }); else body.scrollTop = top; }
    }
  }
  function onFClick(ev) {
    const b = ev.target.closest("[data-fsp]"), sk = ev.target.closest("[data-fseek]");
    if (sk && P().cur) { pl().seek(Number(sk.dataset.fseek), true); F.userScroll = 0; setTimeout(() => tickF(true), 60); return; }
    if (!b) return; const o = fprefs();
    if (b.dataset.fsp === "close") { closeF(); return; }
    if (b.dataset.fsp === "tab") { o.tab = b.dataset.v; fsave(o); paintF(true); }
    if (b.dataset.fsp === "mode") { o.mode = o.mode === "side" ? "overlay" : "side"; fsave(o); paintF(true); A.ui.toast(o.mode === "side" ? "Panel beside the video" : "Panel floats over the video", { ms: 1200, force: true }); }
  }
  function openF() { const o = fprefs(); o.open = true; fsave(o); paintF(true); }
  function closeF() { const o = fprefs(); o.open = false; fsave(o); paintF(); }
  function toggleF(force) { const want = force == null ? !fIsOpen() : !!force; want ? openF() : closeF(); }
  function wireFDiv(div) {
    let st = null;
    div.addEventListener("click", (ev) => { if (ev.target.closest("[data-fspx]")) { ev.stopPropagation(); closeF(); } });
    div.addEventListener("pointerdown", (ev) => { if (ev.target.closest("[data-fspx]")) { ev.stopPropagation(); return; } const d = $("#dock"); st = { x: ev.clientX, y: ev.clientY, w: fprefs().w, h: fprefs().h, W: d.clientWidth, H: d.clientHeight }; try { div.setPointerCapture(ev.pointerId); } catch (x) {} div.classList.add("is-drag"); ev.preventDefault(); ev.stopPropagation(); });
    div.addEventListener("pointermove", (ev) => {
      if (!st) return; const o = fprefs();
      if (narrow()) o.h = clamp(st.h + ((st.y - ev.clientY) / st.H) * 100, 25, 75);
      else o.w = clamp(st.w + (st.x - ev.clientX), 260, Math.min(900, st.W * 0.6));
      store.set("fsp:v1", o); $("#dock").style.setProperty("--fsp-w", o.w + "px"); $("#dock").style.setProperty("--fsp-h", o.h + "%");
    });
    const end = () => { if (!st) return; st = null; div.classList.remove("is-drag"); fsave(fprefs()); };
    div.addEventListener("pointerup", end); div.addEventListener("pointercancel", end);
    div.addEventListener("dblclick", (ev) => { if (ev.target.closest("[data-fspx]")) return; const o = fprefs(); o.w = FDEF.w; o.h = FDEF.h; fsave(o); paintF(); });
    div.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target === div) { ev.preventDefault(); ev.stopPropagation(); closeF(); return; } const o = fprefs(); const k = { ArrowLeft: 24, ArrowRight: -24, ArrowUp: 4, ArrowDown: -4 }[ev.key]; if (k == null) return; ev.preventDefault(); ev.stopPropagation(); if (narrow()) o.h = clamp(o.h + (ev.key === "ArrowUp" || ev.key === "ArrowDown" ? k : 0), 25, 75); else o.w = clamp(o.w + (ev.key === "ArrowLeft" || ev.key === "ArrowRight" ? k : 0), 260, 900); fsave(o); paintF(); });
  }
  function onFs(on) { paintF(true); clearInterval(F.iv); if (on) F.iv = setInterval(() => tickF(false), 400); }
  window.addEventListener("resize", () => { if (P() && P().fs) requestAnimationFrame(() => paintF()); });
  document.addEventListener("asfe:layout", () => { if (P() && P().fs) paintF(); });
  A.fsp = { open: openF, close: closeF, toggle: toggleF, isOpen: fIsOpen, onFs, paint: paintF, tick: tickF, prefs: fprefs, state: F };

  function init() {
    wrapBinge();
    splitEls(); applySplit();
    const p = P(); if (p && p.sheetH == null) { const s = store.get("sheetH", 0); if (s) p.sheetH = s; }
    dfSync();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(init, 0)); else setTimeout(init, 0);

  A.ccx = { has, on: () => isOn() && cprefs().on, toggle, attach, paint, openStyle, prefs: cprefs, loadCues, cueAt, state: CC, COLORS };
  A.studio = { df: { prefs: dprefs, save: dsave, sync: dfSync, state: D, onState: dfOnState }, split: { prefs: spref, set: setPct, collapse: setCollapsed, apply: applySplit, place: placeSplit } };
})(window.ASFE);
