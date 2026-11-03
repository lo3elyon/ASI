/* Player add-ons for every ArchivePlayer (main, watch page, pop-out): volume, captions, loop,
   a fuller shortcut sheet, a centred icon flash, and a "More" menu on narrow players.
   Never starts playback on its own; loop only replays a video the reader already played with Loop on. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer;
  if (!AP || !AP.onCreate) return;

  var svg = function (d, s) { s = s || 18; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; };
  var SPK = '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor" stroke="none"/>';
  var IC = {
    vol: svg(SPK + '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
    low: svg(SPK + '<path d="M15.5 9a4 4 0 0 1 0 6"/>'),
    off: svg(SPK + '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
    loop: svg('<path d="M17 3l3 3-3 3"/><path d="M4 12V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 12v3a3 3 0 0 1-3 3H4"/>'),
    cc: svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M10.5 10.2a2 2 0 1 0 0 3.6M16.5 10.2a2 2 0 1 0 0 3.6"/>'),
    fs: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    more: svg('<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>'),
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
    yt: svg('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>'),
    prev: svg('<path d="M18 6l-8 6 8 6z" fill="currentColor"/><path d="M6 6v12"/>'),
    next: svg('<path d="M6 6l8 6-8 6z" fill="currentColor"/><path d="M18 6v12"/>'),
    play: '<svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    pause: '<svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
    back: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>', 30),
    fwd: svg('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/>', 30)
  };
  var lbl = function (t) { return '<span class="x-apx-lbl">' + t + "</span>"; };

  /* ---------- volume, shared by every player and remembered ---------- */
  var VK = "asiArchive.volume.v1";
  var V = { vol: 100, muted: false };
  try {
    var got = JSON.parse(window.localStorage.getItem(VK));
    if (got && typeof got === "object") { if (got.vol >= 0 && got.vol <= 100) V.vol = Math.round(got.vol); V.muted = !!got.muted; }
  } catch (e) {}
  var saveV = function () { try { window.localStorage.setItem(VK, JSON.stringify(V)); } catch (e) {} };
  var all = [];
  var applyAll = function () { all.forEach(function (x) { x.applyVol(); x.paintVol(); }); };

  var SHORTCUTS = [
    ["Space / K", "Play or pause"], ["J / L", "Back or forward 10 seconds"], ["← / →", "Back or forward 5 seconds"],
    ["↑ / ↓", "Volume up or down 10%"], ["M", "Mute or unmute"], ["C", "Captions on or off"], ["R", "Loop this video"],
    ["Shift + > / <", "Faster or slower"], ["F", "Fullscreen"], ["T", "Theater mode"], ["I", "Pop out or dock"],
    ["N / P", "Next or previous video"], ["?", "This sheet"], ["Esc", "Close this sheet or the More menu"]
  ];

  var uid = 0;
  var reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  function setup(inst) {
    var root = inst.root, btns = inst.btns, bar = inst.bar;
    if (!root || !btns || !bar || root.__apx) return;
    root.__apx = true;
    var id = "x-apx-" + (++uid);
    var S = { cc: false, ccOn: false, loop: false };
    var q = function (s) { return root.querySelector(s); };

    /* volume: mute button and slider replace the old text Mute button */
    var oldMute = btns.querySelector('[data-a="mute"]');
    var volHtml =
      '<button class="x-ap__b x-apx-mute" type="button" data-x="mute" aria-pressed="false" aria-label="Mute (M)" data-tip="Mute (M)">' + IC.vol + "</button>" +
      '<label class="x-apx-vol"><span class="x-ap__sr">Volume</span><input class="x-apx-range" type="range" min="0" max="100" step="1" value="100" aria-label="Volume" /></label>';
    if (oldMute) { oldMute.insertAdjacentHTML("afterend", volHtml); oldMute.remove(); }
    else btns.insertAdjacentHTML("beforeend", volHtml);

    /* captions and loop sit before the spacer */
    var gap = btns.querySelector(".x-ap__gap");
    var ccLoop =
      '<button class="x-ap__b x-apx-cc" type="button" data-x="cc" aria-pressed="false" aria-label="Captions (C)" data-tip="Captions (C)">' + IC.cc + lbl("Captions") + "</button>" +
      '<button class="x-ap__b x-apx-loop" type="button" data-x="loop" aria-pressed="false" aria-label="Loop (R)" data-tip="Loop (R)">' + IC.loop + lbl("Loop") + "</button>";
    if (gap) gap.insertAdjacentHTML("beforebegin", ccLoop); else btns.insertAdjacentHTML("beforeend", ccLoop);

    /* fullscreen gets an icon so it can drop its label on narrow players; help gets a label for the menu */
    var fsB = btns.querySelector('[data-a="fs"]');
    if (fsB) { fsB.classList.add("x-apx-fs"); fsB.innerHTML = IC.fs + lbl("Fullscreen"); fsB.setAttribute("aria-label", "Fullscreen (F)"); }
    var keysB = btns.querySelector('[data-a="keys"]');
    if (keysB) { keysB.innerHTML = '<span aria-hidden="true">?</span>' + lbl("Keyboard shortcuts"); keysB.setAttribute("aria-label", "Keyboard shortcuts (?)"); }

    /* the More button and its menu */
    btns.insertAdjacentHTML("beforeend",
      '<button class="x-ap__b x-apx-more" type="button" data-x="more" aria-haspopup="true" aria-expanded="false" aria-controls="' + id + '" aria-label="More controls">' + IC.more + "</button>");
    bar.insertAdjacentHTML("beforeend",
      '<div class="x-apx-menu" id="' + id + '" role="group" aria-label="More controls" hidden>' +
        '<div class="x-apx-slot" data-slot="top"></div>' +
        '<button class="x-ap__b" type="button" data-x="copy">' + IC.copy + lbl("Copy link") + "</button>" +
        '<a class="x-ap__b" data-x="yt" href="#" target="_blank" rel="noopener">' + IC.yt + lbl("YouTube") + "</a>" +
        '<button class="x-ap__b" type="button" data-x="prev">' + IC.prev + lbl("Previous") + "</button>" +
        '<button class="x-ap__b" type="button" data-x="next">' + IC.next + lbl("Next") + "</button>" +
        '<div class="x-apx-slot" data-slot="end"></div>' +
      "</div>");

    var muteB = q('[data-x="mute"]'), range = q(".x-apx-range"), ccB = q('[data-x="cc"]'), loopB = q('[data-x="loop"]');
    var moreB = q('[data-x="more"]'), menu = document.getElementById(id), slotTop = menu.querySelector('[data-slot="top"]'), slotEnd = menu.querySelector('[data-slot="end"]');
    var act = function (s) { return inst.actions ? inst.actions.querySelector(s) : null; };

    /* centred flash */
    var flash = document.createElement("div");
    flash.className = "x-apx-flash"; flash.setAttribute("aria-hidden", "true");
    if (inst.screen) inst.screen.appendChild(flash);
    var flashT = 0;
    var showFlash = function (k) {
      var h;
      if (k === "play") h = IC.play;
      else if (k === "pause") h = IC.pause;
      else if (typeof k === "number") h = (k < 0 ? IC.back : IC.fwd) + "<b>" + (k < 0 ? "−" : "+") + Math.abs(k) + "s</b>";
      else if (String(k).indexOf("rate:") === 0) h = "<b>" + String(k).slice(5) + "×</b>";
      else if (k === "loop") h = IC.loop + "<b>Loop</b>";
      else return;
      flash.innerHTML = '<span class="x-apx-flash__in">' + h + "</span>";
      flash.classList.remove("is-on"); void flash.offsetWidth; flash.classList.add("is-on");
      clearTimeout(flashT); flashT = setTimeout(function () { flash.classList.remove("is-on"); }, 600);
    };
    inst.on("flash", showFlash);

    /* volume */
    var x = {
      applyVol: function () {
        var yt = inst.yt(); if (!yt || !yt.setVolume) return;
        try { yt.setVolume(V.vol); if (V.muted || V.vol === 0) yt.mute(); else yt.unMute(); } catch (e) {}
      },
      paintVol: function () {
        var silent = V.muted || V.vol === 0, v = silent ? 0 : V.vol;
        range.value = v; range.style.setProperty("--x-ap-pct", v + "%");
        range.setAttribute("aria-valuetext", silent ? "Muted" : v + "%");
        muteB.innerHTML = silent ? IC.off : v < 50 ? IC.low : IC.vol;
        muteB.setAttribute("aria-pressed", silent);
        var t = silent ? "Unmute (M)" : "Mute (M)";
        muteB.setAttribute("aria-label", t); muteB.setAttribute("data-tip", t);
      }
    };
    all.push(x);
    var setVol = function (v, quiet) {
      V.vol = Math.max(0, Math.min(100, Math.round(v)));
      V.muted = V.vol === 0;
      saveV(); applyAll();
      if (!quiet) inst.say(V.vol ? "Volume " + V.vol + "%" : "Muted");
    };
    var toggleMute = function () {
      if (V.muted || V.vol === 0) { V.muted = false; if (V.vol === 0) V.vol = 50; }
      else V.muted = true;
      saveV(); applyAll();
      inst.say(V.muted ? "Muted" : "Volume " + V.vol + "%");
    };
    range.addEventListener("input", function () { setVol(+range.value, true); });
    range.addEventListener("change", function () { inst.say(V.vol ? "Volume " + V.vol + "%" : "Muted"); });
    x.paintVol();

    /* captions */
    var paintCC = function () { ccB.setAttribute("aria-pressed", S.cc); };
    var noCC = function () { S.cc = false; ccB.hidden = true; paintCC(); };
    var setCC = function (on, quiet) {
      var yt = inst.yt();
      if (!yt) { if (!quiet) inst.say("Captions work once the video is playing."); return; }
      try {
        if (on) { yt.loadModule("captions"); yt.setOption("captions", "track", { languageCode: "en" }); }
        else yt.unloadModule("captions");
        S.cc = on; S.ccOn = on; paintCC();
        if (!quiet) inst.say(on ? "Captions on" : "Captions off");
      } catch (e) { noCC(); if (!quiet) inst.say("Captions are not available here."); }
    };
    var toggleCC = function () { if (ccB.hidden) { inst.say("Captions are not available here."); return; } setCC(!S.cc); };

    /* loop */
    var toggleLoop = function () {
      S.loop = !S.loop; loopB.setAttribute("aria-pressed", S.loop);
      inst.say(S.loop ? "Loop on" : "Loop off");
    };

    /* site captions off: YouTube's own captions module is unloaded so no captions render */
    var dropCC = function () { var yt = inst.yt(); try { if (yt && typeof yt.unloadModule === "function") yt.unloadModule("captions"); } catch (e) {} };
    inst.on("ready", function (yt) {
      S.ccOn = false;
      x.applyVol();
      if (!yt || typeof yt.loadModule !== "function" || typeof yt.setOption !== "function") noCC();
      if (!S.cc) dropCC();
    });
    inst.on("state", function (s) {
      if (s !== 1 && s !== 3) return;
      if (S.cc) { if (!S.ccOn) setCC(true, true); } /* keep captions on across videos once the reader turned them on */
      else dropCC();
    });
    inst.on("ended", function (yt) {
      if (!S.loop || !yt || !yt.seekTo) return false;
      try { yt.seekTo(0, true); yt.playVideo(); showFlash("loop"); } catch (e) { return false; }
      return true;
    });

    /* shortcut sheet */
    var dl = inst.sheet && inst.sheet.querySelector("dl");
    if (dl) dl.innerHTML = SHORTCUTS.map(function (r) { return "<div><dt><kbd>" + r[0] + "</kbd></dt><dd>" + r[1] + "</dd></div>"; }).join("");

    /* the More menu: on players under 480px, secondary controls move into it */
    var moved = [
      { el: btns.querySelector(".x-ap__speed"), slot: slotTop },
      { el: q(".x-apx-vol"), slot: slotTop },
      { el: ccB, slot: slotTop },
      { el: loopB, slot: slotTop },
      { el: keysB, slot: slotEnd }
    ].filter(function (m) { return m.el; });
    moved.forEach(function (m) { m.ph = document.createComment("x-apx"); m.el.parentNode.insertBefore(m.ph, m.el); });

    var isOpen = function () { return !menu.hidden; };
    var paintProxies = function () {
      var ytA = act('[data-r="yt"]'), mine = menu.querySelector('[data-x="yt"]');
      if (ytA) { try { ytA.dispatchEvent(new Event("focus")); } catch (e) {} mine.href = ytA.href; }
      ["prev", "next"].forEach(function (k) { var o = act('[data-a="' + k + '"]'), b = menu.querySelector('[data-x="' + k + '"]'); b.disabled = !o || o.disabled; b.hidden = !o || o.disabled; });
    };
    var openMenu = function () {
      paintProxies();
      menu.style.maxHeight = Math.max(140, (inst.screen ? inst.screen.offsetHeight : 240) - 12) + "px";
      menu.hidden = false; moreB.setAttribute("aria-expanded", "true");
      var f = menu.querySelector("button:not([hidden]):not([disabled]), select, input, a[href]");
      if (f) f.focus({ preventScroll: true });
    };
    var closeMenu = function (refocus) {
      if (!isOpen()) return;
      menu.hidden = true; moreB.setAttribute("aria-expanded", "false");
      if (refocus) moreB.focus({ preventScroll: true });
    };
    var compact = null;
    var setCompact = function (on) {
      if (on === compact) return;
      compact = on;
      root.classList.toggle("x-apx-compact", on);
      if (on) moved.forEach(function (m) { m.slot.appendChild(m.el); });
      else { closeMenu(false); moved.forEach(function (m) { m.ph.parentNode.insertBefore(m.el, m.ph.nextSibling); }); }
    };
    var measure = function () { var w = bar.clientWidth; if (w > 0) setCompact(w < 480); };
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(bar);
    else { window.addEventListener("resize", measure); measure(); }

    menu.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); closeMenu(true); }
    });
    document.addEventListener("pointerdown", function (ev) {
      if (isOpen() && !menu.contains(ev.target) && !moreB.contains(ev.target)) closeMenu(false);
    });

    root.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-x], [data-a]"); if (!b || !root.contains(b)) return;
      var a = b.getAttribute("data-x");
      if (a === "mute") toggleMute();
      else if (a === "cc") toggleCC();
      else if (a === "loop") toggleLoop();
      else if (a === "more") { if (isOpen()) closeMenu(false); else openMenu(); }
      else if (a === "copy") { var c = act('[data-a="copy"]'); if (c) c.click(); var l = b.querySelector(".x-apx-lbl"); l.textContent = "Copied"; setTimeout(function () { l.textContent = "Copy link"; closeMenu(false); }, 900); }
      else if (a === "yt") { paintProxies(); if (inst.isPlaying()) inst.pause(); closeMenu(false); }
      else if (a === "prev" || a === "next") { var o = act('[data-a="' + a + '"]'); closeMenu(false); if (o && !o.disabled) o.click(); }
      else if (b.getAttribute("data-a") === "keys" && menu.contains(b)) closeMenu(false);
    });

    /* keys: M, C, R, ↑/↓, Esc */
    inst.on("key", function (ev) {
      var k = ev.key, tag = ev.target && ev.target.tagName;
      if (k === "Escape") { if (isOpen()) { closeMenu(true); return true; } return false; }
      if (k === "ArrowUp" || k === "ArrowDown") { if (tag === "INPUT") return false; setVol((V.muted ? 0 : V.vol) + (k === "ArrowUp" ? 10 : -10)); return true; }
      switch (k.toLowerCase()) {
        case "m": toggleMute(); return true;
        case "c": toggleCC(); return true;
        case "r": toggleLoop(); return true;
      }
      return false;
    });

    measure();
  }

  AP.onCreate(setup);
})();
