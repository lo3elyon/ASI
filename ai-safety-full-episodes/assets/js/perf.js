/* AI Safety Full Episodes · performance modes. Three looks for the same features:
 *  - Battery saver: still background, no glass blur, no tilt or looping effects; animated backgrounds you picked keep a
 *    still frame (when you chose Battery saver yourself).
 *  - Balanced (default): a static gradient background, no looping CSS animations (sheens, pulses and glows play on hover
 *    or a few times, then rest), glass blur only on small pop-ups; animated backgrounds are opt-in in Settings.
 *  - Full effects: everything moves, as before.
 * "Auto" (the default) picks Battery saver when the system asks for reduced motion, Data saver is on, the device has
 * little memory or few CPU cores, or the Battery API says it is running on battery; otherwise Balanced. boot.js sets
 * html[data-perf] before the first paint with the same rules (except the battery, which is asynchronous).
 * Also here: animated backgrounds pause while the tab is hidden, the window is in the background, a video plays in full
 * screen or the episode page covers the background (html.bg-paused + an asfe:bgpause event for the canvas engines and
 * background videos), and looping animations pause in sections that are off screen. Built by Aniruddha Adak. */
(function (A) {
  "use strict";
  const root = () => document.documentElement;
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem("asfe:" + k); if (v === null) localStorage.removeItem("asfe:" + k); else localStorage.setItem("asfe:" + k, v); } catch (e) { return null; } };
  const MODES = [
    { id: "saver", name: "Battery saver", note: "Still background, no glass blur, no tilt or looping effects. Lightest on the GPU and battery." },
    { id: "balanced", name: "Balanced", note: "Static gradient background, effects on hover and click only, blur only on small pop-ups. Animated backgrounds are opt-in." },
    { id: "full", name: "Full effects", note: "Drifting aurora, sheens, glows and every animation. Uses the most GPU." },
  ];
  const ST = { battery: null, blurred: false, paused: null, mode: null };
  const mq = (q) => { try { return window.matchMedia && window.matchMedia(q).matches; } catch (e) { return false; } };
  /* why Auto would pick Battery saver on this device ("" = Balanced) */
  function autoReason() {
    if (mq("(prefers-reduced-motion: reduce)")) return "your system asks for reduced motion";
    if (navigator.connection && navigator.connection.saveData) return "Data saver is on";
    const dm = Number(navigator.deviceMemory) || 0, hc = Number(navigator.hardwareConcurrency) || 0;
    if ((dm && dm <= 2) || (hc && hc <= 2) || (dm && hc && dm <= 4 && hc <= 4)) return "this device has little memory or few CPU cores";
    if (ST.battery && ST.battery.charging === false) return "this device is running on battery";
    return "";
  }
  const pref = () => { const v = LS("perf"); return v === "saver" || v === "balanced" || v === "full" ? v : "auto"; };
  const mode = () => (pref() !== "auto" ? pref() : autoReason() ? "saver" : "balanced");
  const nameOf = (id) => (MODES.find((m) => m.id === id) || MODES[1]).name;
  function apply() {
    const m = mode(), p = pref(), d = root();
    d.setAttribute("data-perf", m); d.setAttribute("data-perf-pref", p);
    d.classList.toggle("perf-freeze", p === "saver");
    const changed = ST.mode !== null && ST.mode !== m; ST.mode = m;
    sync();
    if (changed) { try { document.dispatchEvent(new CustomEvent("asfe:perf", { detail: m })); } catch (e) {} }
    paintUI();
    return m;
  }
  function set(v) { LS("perf", v === "auto" || !v ? null : v); LS("perfTip", "1"); const m = apply(); if (A.bg) A.bg.apply(root().getAttribute("data-bg") || A.bg.current(), { preview: true }); return m; }

  /* ---------------------------------------------------------------- when the background may move */
  const P = () => A.player && A.player.P;
  function theaterCovers() {
    const th = document.getElementById("theater"); if (!th || th.hidden) return false;
    const r = th.getClientRects(); if (!r.length) return false;
    const p = P(); if (p && (p.sticky || (p.mode && p.mode !== "theater"))) return false;
    return r[0].width >= window.innerWidth * 0.9 && r[0].height >= window.innerHeight * 0.9;
  }
  function bgShouldPause() {
    if (document.hidden) return "hidden";
    if (ST.blurred) return "blurred";
    if (root().classList.contains("perf-freeze")) return "saver";
    const p = P();
    if (p && p.playing && (p.fs || document.fullscreenElement)) return "fullscreen";
    if (theaterCovers()) return "covered";
    return "";
  }
  function sync() {
    const why = bgShouldPause(), on = !!why;
    root().classList.toggle("bg-paused", on);
    /* the page under the episode page (or under a full-screen video) is not visible: its loops rest too */
    const p = P(); root().classList.toggle("page-covered", theaterCovers() || !!(p && p.fs) || !!document.fullscreenElement);
    if (on !== ST.paused) { ST.paused = on; try { document.dispatchEvent(new CustomEvent("asfe:bgpause", { detail: { paused: on, why } })); } catch (e) {} }
    return on;
  }
  let syncT = 0;
  const syncSoon = () => { clearTimeout(syncT); syncT = setTimeout(sync, 60); };
  document.addEventListener("visibilitychange", sync);
  /* a click into the YouTube iframe blurs the window too: only a real switch to another window counts */
  window.addEventListener("blur", () => setTimeout(() => { ST.blurred = !document.hasFocus(); sync(); }, 120));
  window.addEventListener("focus", () => { ST.blurred = false; sync(); });
  document.addEventListener("fullscreenchange", syncSoon);
  ["asfe:state", "asfe:layout", "asfe:native"].forEach((n) => document.addEventListener(n, syncSoon));
  window.addEventListener("hashchange", syncSoon);
  function watchTheater() {
    const th = document.getElementById("theater");
    if (th && typeof MutationObserver !== "undefined") new MutationObserver(syncSoon).observe(th, { attributes: true, attributeFilter: ["hidden", "class", "style"] });
    if (typeof MutationObserver !== "undefined") new MutationObserver(syncSoon).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---------------------------------------------------------------- looping animations rest while off screen */
  const HOSTS = ".shelf, .shelf__hd, .phead, .hero, .ja, .picks, .goalchip, .tsp, .th__title, .side__sec, .tabpanel";
  let io = null, scanT = 0;
  function scan() {
    if (!io) return;
    document.querySelectorAll(HOSTS).forEach((el) => { if (!el.__io) { el.__io = 1; io.observe(el); } });
  }
  function watchOffscreen() {
    if (!("IntersectionObserver" in window)) return;
    io = new IntersectionObserver((en) => en.forEach((x) => x.target.classList.toggle("is-off", !x.isIntersecting)), { rootMargin: "120px 0px" });
    scan();
    const later = () => { clearTimeout(scanT); scanT = setTimeout(scan, 250); };
    [document.getElementById("main") || document.querySelector("main"), document.getElementById("theater")].forEach((el) => { if (el && typeof MutationObserver !== "undefined") new MutationObserver(later).observe(el, { childList: true, subtree: true }); });
  }

  /* ---------------------------------------------------------------- Settings UI (dropdown tab + Settings page) */
  function html() {
    const p = pref(), m = mode(), why = autoReason();
    const opts = [{ id: "auto", name: "Auto" }].concat(MODES);
    return `<div class="perfp" data-perfui><p class="qset__h">Performance</p>
      <div class="seg seg--sm qset__seg" role="group" aria-label="Performance mode">${opts.map((o) => `<button type="button" data-perfset="${o.id}" aria-pressed="${p === o.id}">${o.id === "saver" ? "🔋 " : o.id === "full" ? "✨ " : ""}${o.name}</button>`).join("")}</div>
      <p class="muted qset__note" data-perfnow>${nowText(p, m, why)}</p>
      <ul class="perfl">${MODES.map((o) => `<li class="${o.id === m ? "is-on" : ""}"><b>${o.name}</b><span>${o.note}</span></li>`).join("")}</ul>
      <p class="muted qset__note">Every feature stays available in each mode, including the animated backgrounds (Settings → Background). A background you pick yourself keeps moving in Balanced; it pauses while this tab is hidden, the window is in the background, the episode page covers it or a video plays in full screen.</p></div>`;
  }
  function nowText(p, m, why) {
    if (p !== "auto") return `Using <b>${nameOf(m)}</b> (your choice).`;
    return `Using <b>${nameOf(m)}</b> automatically${why ? ` because ${why}` : ""}.`;
  }
  function paintUI() {
    const p = pref(), m = mode(), why = autoReason();
    document.querySelectorAll("[data-perfset]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.perfset === p)));
    document.querySelectorAll("[data-perfnow]").forEach((n) => (n.innerHTML = nowText(p, m, why)));
    document.querySelectorAll(".perfl").forEach((ul) => ul.querySelectorAll("li").forEach((li, i) => li.classList.toggle("is-on", MODES[i].id === m)));
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest && ev.target.closest("[data-perfset]"); if (!b) return;
    const m = set(b.dataset.perfset);
    A.ui && A.ui.toast(`Performance: ${nameOf(m)}${b.dataset.perfset === "auto" ? " (auto)" : ""}`, { icon: m === "saver" ? "🔋" : m === "full" ? "✨" : "⚡", ms: 1300 });
  });

  /* ---------------------------------------------------------------- one-time tip */
  function tip() {
    if (LS("perfTip")) return;
    setTimeout(() => {
      if (LS("perfTip") || !A.ui) return;
      LS("perfTip", "1");
      const heavy = root().classList.contains("bg-chosen") && A.bg && (A.bg.BGS.find((b) => b.id === root().getAttribute("data-bg")) || {}).kind === "anim" || /^vid-/.test(root().getAttribute("data-bg") || "");
      const m = mode();
      const msg = heavy ? `Your animated background stays on. <b>Performance</b> in Settings has Battery saver to keep the GPU cool.`
        : `Effects are now <b>${nameOf(m)}</b> to keep the GPU cool. Change it under <b>Settings → Performance</b>.`;
      A.ui.toast(msg, { icon: "⚡", ms: 8000, action: { label: "Open", fn: () => A.prefs && A.prefs.openQS("perf") } });
    }, 6000);
  }

  /* ---------------------------------------------------------------- start */
  function watchAuto() {
    const re = () => { if (pref() === "auto") apply(); };
    try { const m = window.matchMedia("(prefers-reduced-motion: reduce)"); m.addEventListener ? m.addEventListener("change", re) : m.addListener && m.addListener(re); } catch (e) {}
    try { navigator.connection && navigator.connection.addEventListener && navigator.connection.addEventListener("change", re); } catch (e) {}
    try { if (navigator.getBattery) navigator.getBattery().then((b) => { ST.battery = b; b.addEventListener && b.addEventListener("chargingchange", re); re(); }).catch(() => {}); } catch (e) {}
  }
  apply();
  function start() { watchTheater(); watchOffscreen(); watchAuto(); sync(); tip(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  A.perf = { MODES, mode, pref, set, apply, autoReason, html, paintUI, sync, paused: () => !!ST.paused, bgShouldPause, scan };
})(window.ASFE);
