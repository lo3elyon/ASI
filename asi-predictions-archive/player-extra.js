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
    more: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    ab: svg('<path d="M4 6v12M20 6v12"/><path d="M8 12h8M14 9l3 3-3 3"/>'),
    frame: svg('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 5v14M15 5v14"/>', 30),
    pip: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none"/>'),
    ytc: svg('<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>'),
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
    ["Space / K", "Play or pause"], ["J / L", "Back or forward by the skip step (5, 10 or 30 s, set in ⚙)"], ["← / →", "Back or forward 5 seconds"],
    [", / .", "Back or forward 1 second"], ["0 – 9", "Jump to 0% – 90% of the video"],
    ["↑ / ↓", "Volume up or down 10%"], ["M", "Mute or unmute"], ["Shift + > / <", "Faster or slower (0.25× – 3×)"],
    ["F", "Fullscreen: video and side panel"], ["\\", "Show or hide the side panel"], ["T", "Theater mode (wide window in the pop-out)"], ["I", "Picture-in-picture: the site's mini player"],
    ["Y", "Switch between the site player and YouTube controls"],
    ["C", "Captions on or off (site captions, or YouTube's when a talk has no transcript)"], ["+ / −", "Larger or smaller captions"],
    ["A", "A–B loop: set A, then B, then clear"], ["R", "Loop this video"], ["B", "Bookmark this moment"],
    ["Shift + N", "Next video"], ["Shift + P", "Previous video"],
    ["Scroll on 🔊", "Volume up or down"], ["?", "This sheet"], ["Esc", "Close this sheet or the ⚙ menu; leave fullscreen"]
  ];
  var SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  var QL = { hd2160: "2160p", hd1440: "1440p", hd1080: "1080p", hd720: "720p", large: "480p", medium: "360p", small: "240p", tiny: "144p", highres: "Highest", auto: "Auto" };
  var IC2 = {
    panel: svg('<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M14.5 4.5v15"/><path d="M17 9h1.5M17 12h1.5"/>'),
    palette: svg('<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.5 1.6-1.5h2.1a4 4 0 0 0 4-4C20.5 6.6 16.7 3.5 12 3.5z"/><circle cx="7.6" cy="11.5" r="1.2" fill="currentColor"/><circle cx="10" cy="7.6" r="1.2" fill="currentColor"/><circle cx="14.6" cy="7.6" r="1.2" fill="currentColor"/>'),
    site: svg('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 15h10"/><circle cx="10" cy="15" r="1.4" fill="currentColor"/>'),
    sleep: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>')
  };
  var fmt = AP.fmt || function (s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); };

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

    /* captions sit before the spacer; loop lives in the ⚙ menu */
    var gap = btns.querySelector(".x-ap__gap");
    var ccHtml = '<button class="x-ap__b x-apx-cc" type="button" data-x="cc" aria-pressed="false" aria-label="Captions (C)" data-tip="Captions (C)">' + IC.cc + lbl("Captions") + "</button>";
    if (gap) gap.insertAdjacentHTML("beforebegin", ccHtml); else btns.insertAdjacentHTML("beforeend", ccHtml);
    var nativeB = btns.querySelector('[data-a="native"]'), popB = btns.querySelector('[data-a="pop"]');
    if (nativeB) nativeB.insertAdjacentHTML("beforeend", lbl("YouTube controls"));
    if (popB) popB.insertAdjacentHTML("beforeend", lbl("Picture-in-picture"));

    /* fullscreen gets an icon so it can drop its label on narrow players; help gets a label for the menu */
    var fsB = btns.querySelector('[data-a="fs"]');
    if (fsB) { fsB.classList.add("x-apx-fs"); fsB.innerHTML = IC.fs + lbl("Fullscreen"); fsB.setAttribute("aria-label", "Fullscreen (F)"); fsB.setAttribute("data-tip", "Fullscreen (F)"); fsB.removeAttribute("title"); }
    /* Theater is an icon button too, so its width never changes when it toggles */
    var thB = btns.querySelector('[data-a="theater"]');
    if (thB) { thB.innerHTML = IC.frame.replace(/width="30" height="30"/, 'width="18" height="18"') + lbl("Theater"); thB.setAttribute("aria-label", "Theater mode (T)"); thB.setAttribute("data-tip", "Theater mode (T)"); thB.removeAttribute("title"); }
    /* the side-panel toggle sits before Fullscreen; the caption-style palette right after CC */
    if (fsB) fsB.insertAdjacentHTML("beforebegin", '<button class="x-ap__b x-sx-panelb" type="button" data-x="panel" aria-pressed="true" aria-label="Side panel (\\)" data-tip="Side panel (\\)">' + IC2.panel + lbl("Side panel") + "</button>");
    var ccB0 = btns.querySelector('[data-x="cc"]');
    if (ccB0) ccB0.insertAdjacentHTML("afterend", '<button class="x-ap__b x-sx-palb" type="button" data-x="palette" aria-label="Caption style" data-tip="Caption style">' + IC2.palette + lbl("Caption style") + "</button>");
    var keysB = btns.querySelector('[data-a="keys"]');
    if (keysB) { keysB.innerHTML = '<span aria-hidden="true">?</span>' + lbl("Keyboard shortcuts"); keysB.setAttribute("aria-label", "Keyboard shortcuts (?)"); keysB.setAttribute("data-tip", "Shortcuts (?)"); }

    /* the ⚙ button and its menu: speed, A–B repeat, loop, then links; narrow players move more controls in */
    btns.insertAdjacentHTML("beforeend",
      '<button class="x-ap__b x-apx-more" type="button" data-x="more" aria-haspopup="true" aria-expanded="false" aria-controls="' + id + '" aria-label="Settings: speed, A–B repeat, captions, loop" title="Settings: speed, A–B repeat, captions, loop">' + IC.more + "</button>");
    bar.insertAdjacentHTML("beforeend",
      '<div class="x-apx-menu" id="' + id + '" role="group" aria-label="Settings" hidden>' +
        '<div class="x-apx-sec"><p class="x-apx-h">Speed <span class="x-apx-abtx" data-r="rate">1×</span></p><div class="x-apx-speeds x-sx-speeds" role="group" aria-label="Playback speed">' +
          SPEEDS.map(function (s) { return '<button class="x-ap__b" type="button" data-x="rate" data-rate="' + s + '" aria-pressed="' + (s === 1) + '">' + (s === 1 ? "1×" : s + "×") + "</button>"; }).join("") +
        "</div>" +
        '<label class="x-sx-fine"><span class="x-ap__sr">Fine speed</span><input class="x-apx-range" type="range" min="0.25" max="3" step="0.05" value="1" data-x="ratefine" aria-label="Fine playback speed" /></label>' +
        "</div>" +
        '<div class="x-apx-sec"><p class="x-apx-h">Skip step <span class="x-apx-abtx">J / L and the ± buttons</span></p><div class="x-apx-abrow" role="group" aria-label="Skip step">' +
          [5, 10, 30].map(function (s) { return '<button class="x-ap__b" type="button" data-x="step" data-step="' + s + '" aria-pressed="false">' + s + " s</button>"; }).join("") +
        "</div></div>" +
        '<div class="x-apx-sec"><p class="x-apx-h">Sleep timer <span class="x-apx-abtx" data-r="sleep">Off</span></p><div class="x-sx-row5" role="group" aria-label="Sleep timer">' +
          [["off", "Off"], ["15", "15 m"], ["30", "30 m"], ["60", "60 m"], ["ch", "Chapter"]].map(function (s) { return '<button class="x-ap__b" type="button" data-x="sleep" data-sleep="' + s[0] + '" aria-pressed="' + (s[0] === "off") + '"' + (s[0] === "ch" ? ' title="Stop at the end of this chapter"' : "") + ">" + s[1] + "</button>"; }).join("") +
        "</div></div>" +
        '<div class="x-apx-sec"><p class="x-apx-h">Quality <span class="x-apx-abtx" data-r="ql">Auto</span></p><div class="x-sx-ql" role="group" aria-label="Quality"></div></div>' +
        '<button class="x-ap__b x-sx-rem" type="button" data-x="remember" aria-pressed="true">' + svg('<path d="M7 4h10v16l-5-3.6L7 20z"/>') + '<span class="x-apx-lbl">Remember position</span></button>' +
        '<div class="x-apx-sec"><p class="x-apx-h">A–B repeat <span class="x-apx-abtx" data-r="ab">Off</span></p><div class="x-apx-abrow">' +
          '<button class="x-ap__b" type="button" data-x="abA" aria-pressed="false" title="Set A at the current time">Set A</button>' +
          '<button class="x-ap__b" type="button" data-x="abB" aria-pressed="false" title="Set B at the current time; playback loops from A to B">Set B</button>' +
          '<button class="x-ap__b" type="button" data-x="abC" title="Clear A and B">Clear</button>' +
        "</div></div>" +
        '<button class="x-ap__b x-apx-loop" type="button" data-x="loop" aria-pressed="false" aria-label="Loop (R)">' + IC.loop + '<span class="x-apx-lbl">Loop video</span></button>' +
        '<button class="x-ap__b x-apx-hist" type="button" data-x="history">' + svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4h4M12 7.5V12l3 2"/>') + lbl("Watch history") + "</button>" +
        '<div class="x-apx-slot" data-slot="top"></div>' +
        '<button class="x-ap__b" type="button" data-x="copy">' + IC.copy + lbl("Copy link") + "</button>" +
        '<a class="x-ap__b" data-x="yt" href="#" target="_blank" rel="noopener">' + IC.yt + lbl("YouTube") + "</a>" +
        '<button class="x-ap__b" type="button" data-x="prev">' + IC.prev + lbl("Previous") + "</button>" +
        '<button class="x-ap__b" type="button" data-x="next">' + IC.next + lbl("Next") + "</button>" +
        '<div class="x-apx-slot" data-slot="end">' +
          /* copies of bar controls, shown only on narrow players (fixed container breakpoints in pages.css) */
          '<label class="x-apx-vol x-apx-dup" data-dup="sm"><span class="x-ap__sr">Volume</span><input class="x-apx-range" type="range" min="0" max="100" step="1" value="100" aria-label="Volume" /></label>' +
          '<button class="x-ap__b x-apx-dup" type="button" data-dup="sm" data-a="theater">' + IC.frame.replace(/width="30" height="30"/, 'width="18" height="18"') + lbl("Theater mode (T)") + "</button>" +
          '<button class="x-ap__b x-apx-dup" type="button" data-dup="md" data-a="native">' + IC.ytc + lbl("YouTube controls") + "</button>" +
          '<button class="x-ap__b x-apx-dup" type="button" data-dup="md" data-a="pop">' + IC.pip + lbl("Picture-in-picture (I)") + "</button>" +
          '<button class="x-ap__b x-apx-dup" type="button" data-dup="md" data-a="keys"><span aria-hidden="true">?</span>' + lbl("Keyboard shortcuts") + "</button>" +
          '<button class="x-ap__b x-apx-dup" type="button" data-dup="md" data-x="palette">' + IC2.palette + lbl("Caption style") + "</button>" +
          '<button class="x-ap__b x-apx-dup" type="button" data-dup="sm" data-x="panel">' + IC2.panel + lbl("Side panel (\\)") + "</button>" +
        "</div>" +
      "</div>");

    var muteB = q('[data-x="mute"]'), range = q(".x-ap__btns .x-apx-range"), ccB = q('[data-x="cc"]'), loopB = q('[data-x="loop"]');
    var moreB = q('[data-x="more"]'), menu = document.getElementById(id), slotTop = menu.querySelector('[data-slot="top"]'), slotEnd = menu.querySelector('[data-slot="end"]');
    var ranges = [range, menu.querySelector('.x-apx-dup .x-apx-range')].filter(Boolean);
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
      else if (typeof k === "number") h = (k < 0 ? IC.back : IC.fwd) + "<b>" + Math.abs(k) + "</b>";
      else if (String(k).indexOf("rate:") === 0) h = "<b>" + String(k).slice(5) + "×</b>";
      else if (String(k).indexOf("vol:") === 0) { var vv = +String(k).slice(4); h = (vv === 0 ? IC.off : vv < 50 ? IC.low : IC.vol) + "<b>" + vv + "%</b>"; }
      else if (String(k).indexOf("pct:") === 0) h = "<b>" + String(k).slice(4) + "%</b>";
      else if (k === "frame-1" || k === "frame1") h = (k === "frame-1" ? IC.back : IC.fwd) + "<b>" + (k === "frame-1" ? "−1s" : "+1s") + "</b>";
      else if (k === "ab") h = IC.ab + "<b>A–B</b>";
      else if (k === "loop") h = IC.loop + "<b>Loop</b>";
      else return;
      flash.innerHTML = '<span class="x-apx-flash__in">' + h + "</span>";
      flash.classList.remove("is-on"); void flash.offsetWidth; flash.classList.add("is-on");
      clearTimeout(flashT); flashT = setTimeout(function () { flash.classList.remove("is-on"); }, 600);
    };
    inst.on("flash", showFlash);

    /* ---------- overlays on the video ----------
       Title overlay (fullscreen) with the panel toggle on the right; it fades with the bar, by opacity only.
       In YouTube-controls mode a persistent pill sits top left: "Use site player" (Y), the panel toggle and
       Fullscreen, so the reader can switch back in every mode, fullscreen included. */
    if (inst.screen) {
      inst.screen.insertAdjacentHTML("beforeend",
        '<div class="x-sx-top">' +
          '<div class="x-sx-title"><p class="x-sx-t"></p><p class="x-sx-m"></p></div>' +
          '<button class="x-sx-ob" type="button" data-x="panel" aria-label="Side panel (\\)" title="Side panel (\\)">' + IC2.panel + "</button>" +
        "</div>" +
        '<div class="x-sx-nat" role="group" aria-label="Player mode">' +
          '<button class="x-sx-pill" type="button" data-a="siteplayer" aria-label="Use site player (Y)" title="Use site player (Y)">' + IC2.site + '<span>Use site player</span><kbd>Y</kbd></button>' +
          '<button class="x-sx-ob" type="button" data-x="panel" aria-label="Side panel (\\)" title="Side panel (\\)">' + IC2.panel + "</button>" +
          '<button class="x-sx-ob" type="button" data-a="fs" aria-label="Fullscreen (F)" title="Fullscreen (F)">' + IC.fs + '<span class="x-apx-lbl">Fullscreen</span></button>' +
        "</div>");
    }
    var titleT = inst.screen && inst.screen.querySelector(".x-sx-t"), titleM = inst.screen && inst.screen.querySelector(".x-sx-m");
    var paintTitle = function (v) {
      if (!titleT || !v) return;
      titleT.textContent = v.t || "";
      var yr = AP.year ? AP.year(v.d) : 0;
      titleM.textContent = [v.c, yr || "", v.len].filter(Boolean).join(" · ");
    };
    inst.on("change", paintTitle);
    if (inst.current && inst.current()) paintTitle(inst.current());
    var paintPanelBtns = function () {
      var open = inst._whOpen ? inst._whOpen() : true;
      root.querySelectorAll('[data-x="panel"]').forEach(function (b) {
        b.setAttribute("aria-pressed", String(open));
        var t = (open ? "Hide side panel" : "Show side panel") + " (\\)";
        b.setAttribute("aria-label", t);
        if (b.hasAttribute("data-tip")) b.setAttribute("data-tip", t); else if (b.hasAttribute("title")) b.setAttribute("title", t);
      });
    };
    inst._sxPanelPaint = paintPanelBtns;
    var togglePanel = function () { if (inst._whToggle) { inst._whToggle(); paintPanelBtns(); } else inst.say("No side panel here."); };
    setTimeout(paintPanelBtns, 0);

    /* ---------- sleep timer: after 15 / 30 / 60 minutes, or at the end of the current chapter ---------- */
    var SL = { mode: "off", at: 0, ch: -1 };
    var clock = function (ms) { var d = new Date(ms), h = d.getHours(), m = d.getMinutes(); return h + ":" + (m < 10 ? "0" : "") + m; };
    var paintSleep = function () {
      menu.querySelectorAll('[data-x="sleep"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-sleep") === (SL.mode === "time" ? String(SL.min) : SL.mode))); });
      var o = menu.querySelector('[data-r="sleep"]');
      if (o) o.textContent = SL.mode === "time" ? "Stops at " + clock(SL.at) : SL.mode === "ch" ? "End of chapter" : "Off";
    };
    var setSleep = function (k) {
      if (k === "off") { SL.mode = "off"; inst.say("Sleep timer off"); }
      else if (k === "ch") {
        var t = inst.started() ? inst.now() : 0, i = inst.chapterIndexAt ? inst.chapterIndexAt(t) : -1;
        SL.mode = "ch"; SL.ch = i;
        inst.say(i >= 0 ? "Stops at the end of this chapter" : "No chapters here: stops at the end of the video");
      } else { SL.mode = "time"; SL.min = +k; SL.at = Date.now() + (+k) * 60000; inst.say("Sleep timer: stops at " + clock(SL.at)); }
      paintSleep();
    };
    var sleepNow = function (why) { SL.mode = "off"; paintSleep(); if (inst.isPlaying()) inst.pause(); inst.say("Sleep timer: paused " + why); };
    inst.on("tick", function (t) {
      if (SL.mode === "time" && Date.now() >= SL.at) sleepNow("after " + SL.min + " minutes");
      else if (SL.mode === "ch" && SL.ch >= 0 && inst.chapterIndexAt) { var i = inst.chapterIndexAt(t); if (i !== SL.ch && i >= 0) sleepNow("at the end of the chapter"); }
    });
    inst.on("ended", function () { if (SL.mode !== "off") { SL.mode = "off"; paintSleep(); } return false; });
    inst.on("change", function () { if (SL.mode === "ch") { SL.mode = "off"; paintSleep(); } });

    /* ---------- quality: YouTube's own levels where it reports them (it may still choose for itself) ---------- */
    var paintQuality = function () {
      var box = menu.querySelector(".x-sx-ql"), out = menu.querySelector('[data-r="ql"]'); if (!box) return;
      var yt = inst.yt(), lv = [], curQ = "auto";
      try { if (yt && yt.getAvailableQualityLevels) lv = yt.getAvailableQualityLevels() || []; if (yt && yt.getPlaybackQuality) curQ = yt.getPlaybackQuality() || "auto"; } catch (e) {}
      lv = lv.filter(function (x) { return QL[x] && x !== "auto"; });
      if (!lv.length) { box.innerHTML = '<p class="x-pn-cnote">Auto: YouTube picks the quality' + (inst.started() ? " for this video." : " once the video plays.") + "</p>"; out.textContent = "Auto"; return; }
      box.innerHTML = ["auto"].concat(lv).map(function (x) { return '<button class="x-ap__b" type="button" data-x="ql" data-ql="' + x + '" aria-pressed="' + (x === (S.ql || "auto")) + '">' + QL[x] + "</button>"; }).join("");
      out.textContent = (QL[curQ] || "Auto") + (S.ql && S.ql !== "auto" ? " · asked " + QL[S.ql] : "");
    };
    var setQuality = function (x) {
      S.ql = x; var yt = inst.yt();
      try { if (yt && yt.setPlaybackQuality) yt.setPlaybackQuality(x === "auto" ? "default" : x); } catch (e) {}
      inst.say(x === "auto" ? "Quality: auto" : "Asked YouTube for " + QL[x] + "; it may still adapt");
      paintQuality();
    };
    inst.on("change", function () { S.ql = ""; });

    /* ---------- skip step and remember position ---------- */
    var paintStep = function () { var s = inst.step ? inst.step() : 10; menu.querySelectorAll('[data-x="step"]').forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-step") === s)); }); };
    var paintRem = function () { var b = menu.querySelector('[data-x="remember"]'); if (b) b.setAttribute("aria-pressed", String(AP.remember ? AP.remember() : true)); };

    /* volume */
    var x = {
      applyVol: function () {
        var yt = inst.yt(); if (!yt || !yt.setVolume) return;
        try { yt.setVolume(V.vol); if (V.muted || V.vol === 0) yt.mute(); else yt.unMute(); } catch (e) {}
      },
      paintVol: function () {
        var silent = V.muted || V.vol === 0, v = silent ? 0 : V.vol;
        ranges.forEach(function (r) { if (document.activeElement !== r || r.value != v) r.value = v; r.style.setProperty("--x-ap-pct", v + "%"); r.setAttribute("aria-valuetext", silent ? "Muted" : v + "%"); });
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
    ranges.forEach(function (r) {
      r.addEventListener("input", function () { setVol(+r.value, true); });
      r.addEventListener("change", function () { inst.say(V.vol ? "Volume " + V.vol + "%" : "Muted"); });
    });
    x.paintVol();

    /* captions are drawn by the site from the transcript (player-notes.js); YouTube's own captions stay off */
    var toggleCC = function () { if (inst.ccToggle) inst.ccToggle(); else inst.say("Captions are not available here."); };

    /* loop */
    var toggleLoop = function () {
      S.loop = !S.loop; loopB.setAttribute("aria-pressed", S.loop);
      inst.say(S.loop ? "Loop on" : "Loop off");
    };

    /* site captions off: YouTube's own captions module is unloaded so no captions render */
    /* Once per mount, at ready and at the first frame: unloading on every PLAYING/BUFFERING made YouTube re-buffer,
       which kept re-arming the start cover ("Starting…") on captioned talks until a click. Skipped while the
       YouTube-captions fallback (player-notes.js) is on. */
    var dropped = false;
    var dropCC = function () { if (inst._ytCC || (inst.ccWanted && inst.ccWanted())) return; var yt = inst.yt(); try { if (yt && typeof yt.unloadModule === "function") yt.unloadModule("captions"); } catch (e) {} };
    inst.on("change", function () { dropped = false; });
    inst.on("ready", function () { x.applyVol(); dropped = false; dropCC(); });
    inst.on("state", function (s) { if (s === 1 && !dropped) { dropped = true; dropCC(); } });
    inst.on("ended", function (yt) {
      if (!S.loop || !yt || !yt.seekTo) return false;
      try { yt.seekTo(0, true); yt.playVideo(); showFlash("loop"); } catch (e) { return false; }
      return true;
    });

    /* shortcut sheet */
    var dl = inst.sheet && inst.sheet.querySelector("dl");
    if (dl) dl.innerHTML = SHORTCUTS.map(function (r) { return "<div><dt><kbd>" + r[0] + "</kbd></dt><dd>" + r[1] + "</dd></div>"; }).join("");

    /* the More menu: on players under 480px, secondary controls move into it */
    /* No control ever moves between the bar and the menu: every bar button stays where it is, and narrow players
       hide some of them at fixed container breakpoints (pages.css) while their copies in this menu show. */

    var isOpen = function () { return !menu.hidden; };
    var paintProxies = function () {
      var ytA = act('[data-r="yt"]'), mine = menu.querySelector('[data-x="yt"]');
      if (ytA) { try { ytA.dispatchEvent(new Event("focus")); } catch (e) {} mine.href = ytA.href; }
      ["prev", "next"].forEach(function (k) { var o = act('[data-a="' + k + '"]'), b = menu.querySelector('[data-x="' + k + '"]'); b.disabled = !o || o.disabled; b.hidden = !o || o.disabled; });
    };
    var openMenu = function () {
      paintProxies(); paintRates(); paintAB(); paintSleep(); paintQuality(); paintStep(); paintRem();
      menu.style.maxHeight = Math.max(140, (inst.screen ? inst.screen.offsetHeight : 240) - 12) + "px";
      menu.hidden = false; moreB.setAttribute("aria-expanded", "true");
      var f = menu.querySelector('[data-x="rate"][aria-pressed="true"]') || menu.querySelector("button:not([hidden]):not([disabled]), select, input, a[href]");
      if (f) f.focus({ preventScroll: true });
    };
    var closeMenu = function (refocus) {
      if (!isOpen()) return;
      menu.hidden = true; moreB.setAttribute("aria-expanded", "false");
      if (refocus) moreB.focus({ preventScroll: true });
    };
    var measure = function () { var w = bar.clientWidth; if (w > 0 && AB && AB.a != null) paintAB(); };
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
      else if (a === "history") {
        closeMenu(false);
        var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        var openH = function () { if (window.ArchiveWatch && ArchiveWatch.open) ArchiveWatch.open(); };
        if (fsEl) { var ex = document.exitFullscreen || document.webkitExitFullscreen; try { var pr = ex && ex.call(document); if (pr && pr.then) pr.then(openH, openH); else openH(); } catch (e) { openH(); } }
        else openH();
      }
      else if (a === "more") { if (isOpen()) closeMenu(false); else openMenu(); }
      else if (a === "copy") { var c = act('[data-a="copy"]'); if (c) c.click(); var l = b.querySelector(".x-apx-lbl"); l.textContent = "Copied"; setTimeout(function () { l.textContent = "Copy link"; closeMenu(false); }, 900); }
      else if (a === "yt") { paintProxies(); if (inst.isPlaying()) inst.pause(); closeMenu(false); }
      else if (a === "prev" || a === "next") { var o = act('[data-a="' + a + '"]'); closeMenu(false); if (o && !o.disabled) o.click(); }
      else if (a === "rate") { inst.setRate(+b.getAttribute("data-rate")); paintRates(); }
      else if (a === "step") { if (inst.setStep) inst.setStep(+b.getAttribute("data-step")); paintStep(); inst.say("Skip step " + b.getAttribute("data-step") + " seconds"); }
      else if (a === "sleep") setSleep(b.getAttribute("data-sleep"));
      else if (a === "ql") setQuality(b.getAttribute("data-ql"));
      else if (a === "remember") { var on = !(AP.remember ? AP.remember() : true); if (AP.setRemember) AP.setRemember(on); paintRem(); inst.say(on ? "Remembering where you stop in each talk" : "Talks start from the beginning"); }
      else if (a === "panel") { if (menu.contains(b)) closeMenu(false); togglePanel(); }
      else if (a === "palette") {
        if (!isOpen()) openMenu();
        var cco = menu.querySelector('[data-pn="ccmenu"]'); if (cco) cco.click();
      }
      else if (a === "abA") setA();
      else if (a === "abB") setB();
      else if (a === "abC") clearAB(false);
      else if (/^(keys|native|pop|theater)$/.test(b.getAttribute("data-a") || "") && menu.contains(b)) closeMenu(false);
    });

    /* ---------- speed list ---------- */
    var rateBs = [].slice.call(menu.querySelectorAll('[data-x="rate"]'));
    var fineR = menu.querySelector('[data-x="ratefine"]'), rateOut = menu.querySelector('[data-r="rate"]');
    var paintRates = function () {
      var r = inst.rate ? inst.rate() : 1;
      rateBs.forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-rate") === r)); });
      if (fineR && document.activeElement !== fineR) fineR.value = r;
      if (fineR) fineR.style.setProperty("--x-ap-pct", ((r - 0.25) / 2.75 * 100) + "%");
      if (rateOut) rateOut.textContent = r + "×";
    };
    if (fineR) {
      fineR.addEventListener("input", function () { var r = +fineR.value; if (rateOut) rateOut.textContent = r + "×"; fineR.style.setProperty("--x-ap-pct", ((r - 0.25) / 2.75 * 100) + "%"); });
      fineR.addEventListener("change", function () { inst.setRate(+fineR.value); paintRates(); });
    }

    /* ---------- A–B repeat: markers on the seek bar, playback jumps back to A on reaching B ---------- */
    var seekEl = inst.seek, seekRow = seekEl ? seekEl.parentNode : null;
    var AB = { a: null, b: null };
    var abTx = menu.querySelector('[data-r="ab"]'), abA = menu.querySelector('[data-x="abA"]'), abB = menu.querySelector('[data-x="abB"]');
    if (seekRow) seekRow.insertAdjacentHTML("beforeend",
      '<span class="x-apx-track" aria-hidden="true"><span class="x-apx-abr" hidden></span><span class="x-apx-mk" data-m="a" hidden>A</span><span class="x-apx-mk" data-m="b" hidden>B</span><span class="x-apx-tip" hidden></span></span>');
    var track = seekRow && seekRow.querySelector(".x-apx-track");
    var abR = track && track.querySelector(".x-apx-abr"), mkA = track && track.querySelector('[data-m="a"]'), mkB = track && track.querySelector('[data-m="b"]'), tip = track && track.querySelector(".x-apx-tip");
    /* the track layer sits exactly over the range's usable length (the thumb's half-width in from each end) */
    var placeTrack = function () {
      if (!track || !seekEl) return;
      track.style.left = (seekEl.offsetLeft + 7) + "px";
      track.style.width = Math.max(0, seekEl.offsetWidth - 14) + "px";
    };
    var pct = function (t) { var d = inst.duration ? inst.duration() : 0; return d > 0 ? Math.max(0, Math.min(100, (t / d) * 100)) : 0; };
    var paintAB = function () {
      var has = AB.a != null, both = has && AB.b != null;
      if (abTx) abTx.textContent = both ? fmt(AB.a) + " → " + fmt(AB.b) : has ? "A " + fmt(AB.a) + ", set B" : "Off";
      if (abA) abA.setAttribute("aria-pressed", String(has));
      if (abB) abB.setAttribute("aria-pressed", String(both));
      if (!track) return;
      placeTrack();
      mkA.hidden = !has; mkB.hidden = !both; abR.hidden = !both;
      if (has) mkA.style.left = pct(AB.a) + "%";
      if (both) { mkB.style.left = pct(AB.b) + "%"; abR.style.left = pct(AB.a) + "%"; abR.style.width = (pct(AB.b) - pct(AB.a)) + "%"; }
      root.classList.toggle("is-ab", both);
    };
    var needPlay = function () { if (!inst.started() || !inst.yt()) { inst.say("Start the video first, then set A and B."); return true; } return false; };
    var setA = function () {
      if (needPlay()) return;
      AB.a = Math.floor(inst.now() * 10) / 10;
      if (AB.b != null && AB.b <= AB.a) AB.b = null;
      paintAB(); inst.say("A set at " + fmt(AB.a));
    };
    var setB = function () {
      if (needPlay()) return;
      var t = Math.floor(inst.now() * 10) / 10;
      if (AB.a == null) AB.a = 0;
      if (t <= AB.a + 0.5) { inst.say("B must come after A."); return; }
      AB.b = t; paintAB();
      inst.say("Repeating " + fmt(AB.a) + " to " + fmt(AB.b));
      inst.flash("ab"); inst.seekTo(AB.a);
    };
    var clearAB = function (quiet) {
      if (AB.a == null && AB.b == null) { paintAB(); return; }
      AB.a = AB.b = null; paintAB();
      if (!quiet) inst.say("A–B repeat off");
    };
    inst.on("tick", function (t) { if (AB.a != null && AB.b != null && t >= AB.b) inst.seekTo(AB.a); });
    inst.on("ended", function (yt) {
      if (AB.a == null || AB.b == null || !yt || !yt.seekTo) return false;
      try { yt.seekTo(AB.a, true); yt.playVideo(); } catch (e) { return false; }
      return true;
    });
    inst.on("change", function () { clearAB(true); });

    /* ---------- seek preview: the time under the pointer, on hover and while dragging ---------- */
    var showTip = function (frac) {
      var d = inst.duration ? inst.duration() : 0; if (!tip || !(d > 0)) return;
      placeTrack();
      var ct = inst.chapterAt ? inst.chapterAt(frac * d) : "";
      tip.textContent = "";
      if (ct) { var cs = document.createElement("span"); cs.className = "x-apx-tipch"; cs.textContent = ct; tip.appendChild(cs); }
      tip.appendChild(document.createTextNode(fmt(frac * d)));
      tip.style.left = (frac * 100) + "%";
      tip.hidden = false;
    };
    if (seekEl && tip) {
      seekEl.addEventListener("pointermove", function (ev) {
        if (ev.pointerType === "touch") return;
        var r = seekEl.getBoundingClientRect(), w = r.width - 14;
        if (w > 0) showTip(Math.max(0, Math.min(1, (ev.clientX - r.left - 7) / w)));
      });
      seekEl.addEventListener("pointerleave", function () { tip.hidden = true; });
      seekEl.addEventListener("input", function () { var m = +seekEl.max; if (m > 0) showTip(+seekEl.value / m); });
      seekEl.addEventListener("change", function () { tip.hidden = true; });
      seekEl.addEventListener("blur", function () { tip.hidden = true; });
    }

    /* ---------- scroll-wheel volume on the speaker icon and the volume slider ---------- */
    var onWheel = function (ev) {
      if (!ev.deltaY) return;
      ev.preventDefault();
      setVol((V.muted ? 0 : V.vol) + (ev.deltaY < 0 ? 5 : -5), true);
      inst.flash("vol:" + (V.muted ? 0 : V.vol));
    };
    muteB.addEventListener("wheel", onWheel, { passive: false });
    range.addEventListener("wheel", onWheel, { passive: false });

    /* keys: M, C, R, ↑/↓, Esc */
    inst.on("key", function (ev) {
      var k = ev.key, tag = ev.target && ev.target.tagName;
      if (k === "Escape") { if (isOpen()) { closeMenu(true); return true; } return false; }
      if (k === "+" || k === "=" || k === "-" || k === "_" || k === "−") { if (!inst.ccSize) return false; inst.ccSize(k === "+" || k === "=" ? 25 : -25); return true; }
      if (k === "ArrowUp" || k === "ArrowDown") { if (tag === "INPUT") return false; setVol((V.muted ? 0 : V.vol) + (k === "ArrowUp" ? 10 : -10)); inst.flash("vol:" + (V.muted ? 0 : V.vol)); return true; }
      /* 0–9 jump to that tenth of the video */
      if (/^[0-9]$/.test(k) && !ev.shiftKey) {
        var d = inst.duration ? inst.duration() : 0;
        if (!inst.started() || !inst.yt() || !(d > 0)) return false;
        inst.seekTo(d * (+k) / 10); inst.flash("pct:" + (+k * 10)); return true;
      }
      /* , and . step one second back or forward (YouTube has no true frame step) */
      if ((k === "," || k === ".") && !ev.shiftKey) {
        if (!inst.started() || !inst.yt()) return false;
        inst.seekTo(Math.max(0, inst.now() + (k === "," ? -1 : 1))); inst.flash(k === "," ? "frame-1" : "frame1"); return true;
      }
      if (k === "\\") { togglePanel(); return true; }
      switch (k.toLowerCase()) {
        case "m": toggleMute(); return true;
        case "c": toggleCC(); return true;
        case "r": toggleLoop(); return true;
        case "a": if (ev.shiftKey) return false; if (AB.a == null) setA(); else if (AB.b == null) setB(); else clearAB(false); return true;
      }
      return false;
    });

    measure();
  }

  AP.onCreate(setup);
})();
