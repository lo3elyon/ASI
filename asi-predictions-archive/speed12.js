/* speed12.js: Batch 12, loaded last.
   1. Speed control: + / = / NumpadAdd faster, - / NumpadSubtract slower, * / NumpadMultiply back to 1× (step saved,
      default 0.25), Shift + wheel over the video; a speed badge top right of the video and a bar button with a popover
      (slider, presets, step, time saved). Uses the player's own rate path (inst.setRate), clamped to YouTube's 2×.
      Extension mode (saved): new players use www.youtube.com, the click shield goes, + - * are left alone and the
      iframe takes focus on play, so an installed speed extension can drive the video.
   2. Watched progress line under the seek bar in every mode, and a watched ring around the play button.
   3. One side-panel button in the bar; in the corner pop-out it expands to the centred window and opens the panel.
      The duplicate Picture sliders are removed.
   4. The wide window is never taller than the viewport. */
(function () {
  "use strict";
  var AP = window.ArchivePlayer;
  if (!AP || !AP.onCreate) return;
  var doc = document, docEl = doc.documentElement;
  var LS = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  };
  var K_STEP = "asi.speed12.step", K_EXT = "asi.speed12.ext", K_SAVED = "asi.speed12.saved";
  var MIN = 0.25, MAX = 2, PRESETS = [0.75, 1, 1.25, 1.5, 1.75, 2], STEPS = [0.1, 0.25, 0.5];
  var step = parseFloat(LS.get(K_STEP)); if (STEPS.indexOf(step) < 0) step = 0.25;
  var ext = LS.get(K_EXT) === "1";
  var saved = Math.max(0, parseFloat(LS.get(K_SAVED)) || 0), savedDirty = 0;
  docEl.classList.toggle("s12-ext", ext);

  var fmt = AP.fmt || function (s) { s = Math.max(0, Math.floor(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = ("0" + (s % 60)).slice(-2); return h ? h + ":" + ("0" + m).slice(-2) + ":" + x : m + ":" + x; };
  var rnd = function (r) { return Math.round(r * 100) / 100; };
  var clampR = function (r) { return Math.max(MIN, Math.min(MAX, rnd(r))); };
  var fmtR = function (r) { return (+r).toFixed(2).replace(/0$/, "").replace(/\.0$/, "") + "×"; };
  var fmtSaved = function (s) {
    s = Math.floor(s);
    if (s < 60) return s + " s";
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    return h ? h + " h " + ("0" + m).slice(-2) + " min" : m + " min";
  };
  var typing = function (e) {
    var t = e.target, tag = t && t.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT") return !/^(range|checkbox|radio|button|submit)$/i.test(t.type || "");
    return !!(t && t.isContentEditable);
  };

  var svg = function (d, w) { return '<svg width="' + (w || 18) + '" height="' + (w || 18) + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; };
  /* a speedometer: green, yellow, orange and red arc, with the needle in the text colour */
  var GAUGE = '<svg class="s12-gauge" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke-width="2.6" stroke-linecap="round">' +
    '<path d="M4 15.5A8 8 0 0 1 6.34 9.84" stroke="#22c55e"/><path d="M6.34 9.84A8 8 0 0 1 12 7.5" stroke="#eab308"/>' +
    '<path d="M12 7.5a8 8 0 0 1 5.66 2.34" stroke="#f97316"/><path d="M17.66 9.84A8 8 0 0 1 20 15.5" stroke="#ef4444"/>' +
    '<path d="M12 15.5l3.6-3.9" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="15.5" r="1.7" fill="currentColor" stroke="none"/></svg>';
  var PANEL = svg('<rect x="3" y="4.5" width="18" height="15" rx="2"/><rect x="14.5" y="4.5" width="6.5" height="15" rx="1" fill="currentColor" fill-opacity=".35" stroke="none"/><path d="M14.5 4.5v15"/>');
  var ARROWS = svg('<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>');

  var insts = [], lastInst = null;
  var visible = function (i) { return !!(i && i.root && i.root.isConnected && i.root.getClientRects().length > 0); };
  /* the player a key should act on: fullscreen, focused, the pop-out, the last one used, the playing one */
  var pick = function () {
    var vis = insts.filter(visible);
    var a = doc.activeElement, i;
    for (i = 0; i < vis.length; i++) if (vis[i].root.classList.contains("is-fs")) return vis[i];
    for (i = 0; i < vis.length; i++) if (a && vis[i].root.contains(a)) return vis[i];
    var pop = vis.filter(function (x) { return x.floating; })[0];
    if (pop && AP.isWatching && AP.isWatching()) return pop;
    if (lastInst && visible(lastInst)) return lastInst;
    var pl = vis.filter(function (x) { return x.isPlaying && x.isPlaying(); })[0];
    if (pl) return pl;
    if (pop) return pop;
    return vis.filter(function (x) { return x.started && x.started(); })[0] || null;
  };

  var rateOf = function (inst) {
    /* the player's own rate is set at once; YouTube's answer comes back later, so it is read only when an
       extension may have changed the speed inside the iframe */
    var r = inst.rate ? +inst.rate() : 1;
    if (ext) { try { var y = inst.yt && inst.yt(), yr = y && y.getPlaybackRate ? +y.getPlaybackRate() : 0; if (yr > 0) r = yr; } catch (e) {} }
    return r > 0 ? r : 1;
  };
  var setRate = function (inst, r) {
    var want = rnd(r), v = clampR(want);
    try { inst.setRate(v); } catch (e) {}
    var S = inst.__s12; if (!S) return;
    S.rate = -1; paintRate(inst, true);
    if (want > MAX) { inst.say("YouTube allows up to 2× in embedded players"); flashNote(inst); }
  };
  var flashNote = function (inst) {
    var n = inst.__s12 && inst.__s12.badgeN; if (!n) return;
    n.textContent = "2× max";
    clearTimeout(inst.__s12.noteT);
    inst.__s12.noteT = setTimeout(function () { inst.__s12.rate = -1; paintRate(inst, false); }, 1500);
  };

  var paintRate = function (inst, flash) {
    var S = inst.__s12; if (!S) return;
    var r = rnd(rateOf(inst));
    if (r === S.rate && !flash) return;
    var changed = S.rate !== -1 && r !== S.rate;
    S.rate = r;
    var t = fmtR(r);
    S.badgeN.textContent = t;
    S.badgeV.setAttribute("aria-label", "Speed " + t + ", reset to 1×");
    S.btnN.textContent = t;
    S.btn.setAttribute("aria-label", "Playback speed " + t);
    S.popV.textContent = t;
    var vr = Math.max(MIN, Math.min(MAX, r));
    if (+S.range.value !== vr) S.range.value = vr;
    S.range.setAttribute("aria-valuetext", t);
    S.range.style.setProperty("--x-ap-pct", ((vr - MIN) / (MAX - MIN) * 100) + "%");
    S.pop.querySelectorAll('[data-s12="set"]').forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.r === r)); });
    if (flash || changed) {
      S.badge.classList.add("is-on");
      clearTimeout(S.badgeT);
      S.badgeT = setTimeout(function () { S.badge.classList.remove("is-on"); }, 1500);
    }
    paintProg(inst);
  };

  var paintStepAll = function () {
    insts.forEach(function (inst) {
      var S = inst.__s12; if (!S) return;
      S.pop.querySelectorAll('[data-s12="step"]').forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.r === step)); });
      S.up.setAttribute("aria-label", "Faster by " + step + "× (+)");
      S.down.setAttribute("aria-label", "Slower by " + step + "× (−)");
    });
  };
  var paintSavedAll = function () {
    insts.forEach(function (inst) { var S = inst.__s12; if (S) S.saved.textContent = fmtSaved(saved); });
  };
  var paintExtAll = function () {
    docEl.classList.toggle("s12-ext", ext);
    insts.forEach(function (inst) {
      var S = inst.__s12; if (!S) return;
      S.extB.setAttribute("aria-pressed", String(ext));
      S.extS.textContent = ext ? "On" : "Off";
    });
  };

  /* ---------- watched progress ---------- */
  var paintProg = function (inst) {
    var S = inst.__s12; if (!S) return;
    var d = 0, t = 0;
    try { d = +inst.duration() || 0; t = inst.started && inst.started() ? +inst.now() || 0 : 0; } catch (e) {}
    if (!(d > 0) && inst.current && inst.current() && AP.position) {
      /* before Play: the saved resume point against the listed length */
      var v = inst.current(), len = String(v.len || "").split(":").map(Number);
      if (len.length > 1 && len.every(function (n) { return n >= 0; })) d = len.reduce(function (a, n) { return a * 60 + n; }, 0);
      t = d > 0 ? Math.min(d, +AP.position(v.id) || 0) : 0;
    }
    var on = d > 0;
    S.prog.classList.toggle("is-empty", !on);
    var pct = on ? Math.max(0, Math.min(100, Math.floor(t / d * 100))) : 0;
    if (S.ringFg) S.ringFg.style.strokeDashoffset = String(100 - pct);
    if (!on) return;
    var r = rnd(rateOf(inst)), left = Math.max(0, d - t) / r;
    var at = r !== 1 ? " (at " + fmtR(r) + ")" : "";
    var key = pct + "|" + Math.floor(left) + "|" + r;
    if (key === S.progKey) return;
    S.progKey = key;
    S.pL.textContent = pct + "% watched · " + (100 - pct) + "% left · " + fmt(left) + " left" + at;
    S.pM.textContent = pct + "% watched · " + fmt(left) + " left" + at;
    S.pS.textContent = pct + "% · " + fmt(left) + " left";
  };

  /* ---------- side panel ---------- */
  var isCorner = function (inst) {
    var pop = inst.root.closest && inst.root.closest(".x-pop");
    return !!pop && !inst.root.classList.contains("is-fs") && !pop.classList.contains("is-modal") && !pop.classList.contains("is-wide");
  };
  var paintPanel = function (inst) {
    var S = inst.__s12; if (!S) return;
    var open = false;
    try { open = inst._whOpen ? !!inst._whOpen() : false; } catch (e) {}
    if (isCorner(inst)) open = false;
    S.panelB.setAttribute("aria-pressed", String(open));
    S.panelB.setAttribute("aria-label", (open ? "Hide side panel" : "Show side panel") + " (\\)");
  };
  var panelAct = function (inst) {
    if (isCorner(inst)) {
      var pop = inst.root.closest(".x-pop"), mb = pop && pop.querySelector('.x-pop__tools [data-p="mode"]');
      if (mb) mb.click();
      var tries = 0;
      var openIt = function () {
        if (pop.classList.contains("is-modal")) {
          try { if (inst._whOpen && !inst._whOpen() && inst._whToggle) inst._whToggle(); } catch (e) {}
          setTimeout(function () { paintPanel(inst); if (inst._sxPanelPaint) inst._sxPanelPaint(); }, 60);
        } else if (++tries < 10) setTimeout(openIt, 50);
      };
      setTimeout(openIt, 30);
      inst.say("Side panel open");
      return;
    }
    if (!inst._whToggle) { inst.say("No side panel here."); return; }
    try { inst._whToggle(); } catch (e) {}
    setTimeout(function () {
      paintPanel(inst); if (inst._sxPanelPaint) inst._sxPanelPaint();
      var open = inst._whOpen && inst._whOpen();
      inst.say(open ? "Side panel shown" : "Side panel hidden");
    }, 60);
  };

  /* ---------- the Picture sliders exist once per player ---------- */
  var dedupe = function (root) {
    var first = null;
    root.querySelectorAll(".x7-picsec").forEach(function (sec) { if (!first) first = sec; else sec.remove(); });
    root.querySelectorAll(".x7-sl").forEach(function (sl) { if (!first || !first.contains(sl)) sl.remove(); });
    if (first) {
      var seen = {};
      first.querySelectorAll("[data-x7r]").forEach(function (inp) {
        var k = inp.getAttribute("data-x7r"), row = inp.closest(".x7-sl") || inp;
        if (seen[k]) row.remove(); else seen[k] = true;
      });
    }
  };

  /* ---------- the shortcut sheets name the new keys ---------- */
  var patchSheets = function () {
    doc.querySelectorAll("kbd:not([data-s12])").forEach(function (k) {
      k.setAttribute("data-s12", "");
      var tx = k.textContent.replace(/\s+/g, " ").trim();
      if (tx !== "+ / −" && tx !== "+ / -") return;
      var row = k.closest("div, tr, li"), dd = row && row.querySelector("dd, td:last-child");
      if (!row || !dd || row.querySelectorAll("kbd").length > 2 || row.querySelectorAll("dd, td").length > 2) return;
      dd.textContent = "Faster or slower by the speed step";
      var extra = [["*", "Speed back to 1×"], ["Shift + wheel", "Change speed over the video"]];
      var after = row;
      extra.forEach(function (x) {
        var n = row.cloneNode(true), nk = n.querySelector("kbd"), nd = n.querySelector("dd, td:last-child");
        if (!nk || !nd) return;
        nk.textContent = x[0]; nk.setAttribute("data-s12", ""); nd.textContent = x[1];
        after.parentNode.insertBefore(n, after.nextSibling); after = n;
      });
    });
  };

  /* ---------- wire each player ---------- */
  var wire = function (inst) {
    var root = inst.root, screen = inst.screen, bar = inst.bar || (root && root.querySelector(".x-ap__bar"));
    var btns = inst.btns || (root && root.querySelector(".x-ap__btns"));
    if (!root || !screen || !bar || !btns || root.__s12) return;
    root.__s12 = true;
    insts.push(inst);
    var S = inst.__s12 = { rate: -1, lastT: -1, progKey: "" };
    /* + and − now change speed, so the caption-size keys step aside */
    inst.ccSize = null;

    var mark = function () { lastInst = inst; };
    root.addEventListener("pointerdown", mark, true);
    root.addEventListener("focusin", mark);

    /* badge on the video */
    var badge = doc.createElement("div");
    badge.className = "s12-badge";
    badge.setAttribute("role", "group");
    badge.setAttribute("aria-label", "Playback speed");
    badge.innerHTML =
      '<button type="button" class="s12-badge__b" data-s12="down" title="Slower (−)">−</button>' +
      '<button type="button" class="s12-badge__v" data-s12="reset" title="Reset to 1× (*)">' + GAUGE + '<span class="s12-badge__n">1×</span></button>' +
      '<button type="button" class="s12-badge__b" data-s12="up" title="Faster (+)">+</button>';
    screen.appendChild(badge);
    /* presses on the badge never reach the video's play/pause shield or its double-click fullscreen */
    badge.addEventListener("click", function (e) { onAct(e); e.stopPropagation(); });
    ["dblclick", "pointerup", "mouseup"].forEach(function (t) { badge.addEventListener(t, function (e) { e.stopPropagation(); }); });
    S.badge = badge; S.badgeN = badge.querySelector(".s12-badge__n"); S.badgeV = badge.querySelector(".s12-badge__v");
    S.up = badge.querySelector('[data-s12="up"]'); S.down = badge.querySelector('[data-s12="down"]');

    /* bar button and its popover */
    var more = btns.querySelector('[data-x="more"]');
    var bb = doc.createElement("button");
    bb.type = "button"; bb.className = "x-ap__b s12-btn";
    bb.setAttribute("data-s12", "open"); bb.setAttribute("aria-haspopup", "true"); bb.setAttribute("aria-expanded", "false");
    bb.setAttribute("data-tip", "Speed (+ / −)");
    bb.innerHTML = GAUGE + '<span class="s12-btn__n">1×</span>';
    if (more) btns.insertBefore(bb, more); else btns.appendChild(bb);
    S.btn = bb; S.btnN = bb.querySelector(".s12-btn__n");

    var pid = "s12p" + insts.length;
    var pop = doc.createElement("div");
    pop.className = "x-apx-menu s12-pop"; pop.id = pid; pop.hidden = true;
    pop.setAttribute("role", "group"); pop.setAttribute("aria-label", "Playback speed");
    bb.setAttribute("aria-controls", pid);
    pop.innerHTML =
      '<p class="s12-h">Speed <output class="s12-h__v">1×</output></p>' +
      '<input class="x-apx-range s12-range" type="range" min="' + MIN + '" max="' + MAX + '" step="0.05" value="1" aria-label="Playback speed" />' +
      '<div class="s12-chips" role="group" aria-label="Preset speeds">' +
        PRESETS.map(function (p) { return '<button type="button" class="x-ap__b s12-chip" data-s12="set" data-r="' + p + '" aria-pressed="' + (p === 1) + '">' + fmtR(p) + "</button>"; }).join("") +
      "</div>" +
      '<p class="s12-h">Step <span class="s12-h__sub">+ / − keys and Shift + wheel</span></p>' +
      '<div class="s12-chips s12-chips--3" role="group" aria-label="Speed step">' +
        STEPS.map(function (p) { return '<button type="button" class="x-ap__b s12-chip" data-s12="step" data-r="' + p + '" aria-pressed="' + (p === step) + '">' + p + "×</button>"; }).join("") +
      "</div>" +
      '<p class="s12-saved"><span>Time saved</span><b class="s12-saved__v">0 s</b></p>' +
      '<button type="button" class="x-ap__b s12-extb" data-s12="ext" aria-pressed="false"><span class="s12-extb__t">Extension mode<small>Lets your installed speed extension set 3×, 4× or more. Applies to the next video you open.</small></span><span class="s12-extb__s">Off</span></button>' +
      '<p class="s12-note">YouTube allows up to 2× in embedded players. For 3×, 4× and more, turn on Extension mode.</p>';
    bar.appendChild(pop);
    S.pop = pop; S.popV = pop.querySelector(".s12-h__v"); S.range = pop.querySelector(".s12-range");
    S.saved = pop.querySelector(".s12-saved__v"); S.extB = pop.querySelector('[data-s12="ext"]'); S.extS = pop.querySelector(".s12-extb__s");

    var setOpen = function (on) {
      if (on && more && more.getAttribute("aria-expanded") === "true") more.click();
      pop.hidden = !on; bb.setAttribute("aria-expanded", String(on));
      if (on) { S.saved.textContent = fmtSaved(saved); paintRate(inst, false); }
    };
    S.setOpen = setOpen;
    pop.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); try { bb.focus({ preventScroll: true }); } catch (x) {} }
    });
    doc.addEventListener("pointerdown", function (e) {
      if (!pop.hidden && !pop.contains(e.target) && !bb.contains(e.target)) setOpen(false);
    }, true);
    if (more) more.addEventListener("click", function () { if (!pop.hidden) setOpen(false); });
    S.range.addEventListener("input", function () { setRate(inst, +S.range.value); });

    /* the side-panel button: one, in the bar, before Fullscreen */
    var fsB = btns.querySelector('[data-a="fs"]');
    var pb = doc.createElement("button");
    pb.type = "button"; pb.className = "x-ap__b s12-panelb";
    pb.setAttribute("data-s12", "panel"); pb.setAttribute("aria-pressed", "false");
    pb.setAttribute("aria-label", "Side panel (\\)"); pb.setAttribute("data-tip", "Side panel (\\)");
    pb.innerHTML = PANEL + '<span class="s12-panelb__t">Panel</span>';
    if (fsB && fsB.parentNode === btns) btns.insertBefore(pb, fsB); else btns.insertBefore(pb, bb);
    /* a press here never counts as a click outside the pop-out's flyout panel */
    pb.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    S.panelB = pb;
    var oldPaint = inst._sxPanelPaint;
    inst._sxPanelPaint = function () { if (oldPaint) { try { oldPaint(); } catch (e) {} } paintPanel(inst); };

    /* the wide / theatre button: two arrows, cyan */
    root.querySelectorAll('[data-a="theater"]').forEach(function (b) {
      b.classList.add("s12-wide");
      var old = b.querySelector("svg"); if (old) old.outerHTML = ARROWS; else b.insertAdjacentHTML("afterbegin", ARROWS);
    });

    /* one delegated handler for the badge, the bar buttons and the popover */
    root.addEventListener("click", onAct);
    function onAct(e) {
      var b = e.target.closest && e.target.closest("[data-s12]");
      if (!b || !root.contains(b) || b.tagName !== "BUTTON") return;
      var a = b.getAttribute("data-s12");
      if (a === "up") setRate(inst, rateOf(inst) + step);
      else if (a === "down") setRate(inst, rateOf(inst) - step);
      else if (a === "reset") setRate(inst, 1);
      else if (a === "set") setRate(inst, +b.dataset.r);
      else if (a === "open") setOpen(pop.hidden);
      else if (a === "panel") panelAct(inst);
      else if (a === "step") { step = +b.dataset.r; LS.set(K_STEP, String(step)); paintStepAll(); inst.say("Speed step " + step + "×"); }
      else if (a === "ext") toggleExt(inst);
      else return;
      e.preventDefault(); e.stopPropagation();
    }

    /* Shift + wheel over the video */
    var wheelT = 0;
    screen.addEventListener("wheel", function (e) {
      if (!e.shiftKey) return;
      var d = e.deltaY || e.deltaX; if (!d) return;
      e.preventDefault(); e.stopPropagation();
      var t = Date.now(); if (t - wheelT < 120) return; wheelT = t;
      setRate(inst, rateOf(inst) + (d < 0 ? step : -step));
    }, { passive: false });

    /* watched line under the seek bar, and the ring around Play */
    var prog = doc.createElement("div");
    prog.className = "s12-prog is-empty";
    prog.innerHTML = '<p class="s12-prog__in"><span class="s12-pl"></span><span class="s12-pm"></span><span class="s12-ps"></span></p>';
    var seekrow = bar.querySelector(".x-ap__seekrow");
    if (seekrow && seekrow.parentNode) seekrow.parentNode.insertBefore(prog, seekrow.nextSibling); else bar.insertBefore(prog, bar.firstChild);
    S.prog = prog; S.pL = prog.querySelector(".s12-pl"); S.pM = prog.querySelector(".s12-pm"); S.pS = prog.querySelector(".s12-ps");
    var addRing = function () {
      var pp = btns.querySelector(".x-ap__pp"); if (!pp || pp.querySelector(".s12-ring")) return;
      pp.insertAdjacentHTML("beforeend", '<svg class="s12-ring" viewBox="0 0 36 36" aria-hidden="true"><circle class="s12-ring__bg" cx="18" cy="18" r="16" pathLength="100"/><circle class="s12-ring__fg" cx="18" cy="18" r="16" pathLength="100" transform="rotate(-90 18 18)"/></svg>');
      S.ringFg = pp.querySelector(".s12-ring__fg");
    };
    S.addRing = addRing; addRing();

    inst.on("flash", function (k) { if (String(k).indexOf("rate:") === 0) paintRate(inst, true); });
    inst.on("change", function () { S.progKey = ""; S.lastT = -1; setTimeout(function () { paintProg(inst); }, 0); });
    inst.on("state", function (s) {
      if (s === 1) {
        lastInst = inst;
        if (ext) {
          var a = doc.activeElement;
          if (!(a && typing({ target: a }))) {
            var f = screen.querySelector(".x-ap__frame iframe");
            if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
          }
        }
      }
      S.lastT = -1; paintProg(inst);
    });

    dedupe(root);
    paintRate(inst, false); paintStepAll(); paintSavedAll(); paintExtAll(); paintProg(inst);
    setTimeout(function () { paintPanel(inst); dedupe(root); }, 0);
  };

  var toggleExt = function (inst) {
    ext = !ext;
    LS.set(K_EXT, ext ? "1" : "0");
    paintExtAll();
    /* players not yet started are reset, so their next Play uses the new host */
    insts.forEach(function (i) { try { if (i.started && !i.started() && i.current && i.current()) i.stop(); } catch (e) {} });
    inst.say(ext ? "Extension mode on. Your speed extension controls the next video you open." : "Extension mode off");
  };

  AP.onCreate(function (inst) { try { wire(inst); } catch (e) {} });

  /* ---------- keys: + / = / NumpadAdd, - / NumpadSubtract, * / NumpadMultiply, and \ in the corner pop-out ---------- */
  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    var k = e.key, c = e.code;
    if (k === "\\" && !typing(e) && !doc.querySelector("dialog[open]")) {
      var ci = pick();
      if (ci && ci.__s12 && isCorner(ci)) { e.preventDefault(); e.stopImmediatePropagation(); panelAct(ci); }
      return;
    }
    var up = k === "+" || k === "=" || c === "NumpadAdd";
    var down = k === "-" || k === "_" || k === "−" || c === "NumpadSubtract";
    var reset = k === "*" || c === "NumpadMultiply";
    if (!up && !down && !reset) return;
    if (ext || typing(e) || doc.querySelector("dialog[open]")) return;
    var inst = pick(); if (!inst || !inst.__s12) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (reset) setRate(inst, 1);
    else setRate(inst, rateOf(inst) + (up ? step : -step));
  }, true);

  /* ---------- the window never taller than the viewport (wide and corner); it stays on screen ---------- */
  var popEl = null, guardQ = 0;
  var guard = function () {
    guardQ = 0;
    var p = popEl; if (!p || p.hidden || p.classList.contains("is-min") || p.classList.contains("is-modal")) return;
    var H = window.innerHeight, W = docEl.clientWidth || window.innerWidth;
    var r = p.getBoundingClientRect(); if (!r.height || !r.width) return;
    if (r.height > H - 16) {
      var nw = Math.max(280, Math.floor(r.width - (r.height - (H - 16)) * 16 / 9) - 2);
      if (nw < r.width - 1) { p.style.width = nw + "px"; r = p.getBoundingClientRect(); }
    }
    var top = r.top, left = r.left;
    if (r.bottom > H - 8) top = Math.max(8, H - r.height - 8);
    if (top < 8) top = 8;
    if (r.right > W - 8) left = Math.max(8, W - r.width - 8);
    if (left < 8) left = 8;
    if (Math.abs(top - r.top) > 0.5) p.style.top = Math.round(top) + "px";
    if (Math.abs(left - r.left) > 0.5) p.style.left = Math.round(left) + "px";
  };
  var queueGuard = function () {
    if (!guardQ) guardQ = window.requestAnimationFrame(guard);
    clearTimeout(queueGuard.t); queueGuard.t = setTimeout(guard, 380);
  };
  var watchPop = function () {
    var p = doc.querySelector(".x-pop");
    if (!p || p === popEl) return;
    popEl = p;
    if ("MutationObserver" in window) new MutationObserver(queueGuard).observe(p, { attributes: true, attributeFilter: ["class", "hidden"] });
    queueGuard();
  };
  window.addEventListener("resize", queueGuard, { passive: true });

  /* ---------- once a second: progress, rate, time saved, panel state ---------- */
  /* batch 24: only while a player is open and the tab is visible; one pass after any gesture and when it closes */
  (window.XIdle ? function (f, ms) { XIdle.every(f, ms, { final: true, poke: true }); } : setInterval)(function () {
    watchPop();
    patchSheets();
    insts.forEach(function (inst) {
      var S = inst.__s12; if (!S || !inst.root.isConnected) return;
      S.addRing();
      var playing = inst.isPlaying && inst.isPlaying() && inst.started && inst.started();
      if (playing) {
        var r = rateOf(inst), t = +inst.now() || 0;
        if (S.lastT >= 0 && r > 1) {
          var d = t - S.lastT;
          if (d > 0 && d < 8) { saved += d * (1 - 1 / r); savedDirty++; }
        }
        S.lastT = t;
      } else S.lastT = -1;
      if (!visible(inst)) return;
      paintRate(inst, false);
      paintProg(inst);
      paintPanel(inst);
      if (!S.pop.hidden) S.saved.textContent = fmtSaved(saved);
      dedupe(inst.root);
    });
    if (savedDirty >= 5) { savedDirty = 0; LS.set(K_SAVED, String(Math.round(saved))); paintSavedAll(); }
  }, 1000);
  window.addEventListener("pagehide", function () { if (savedDirty) LS.set(K_SAVED, String(Math.round(saved))); });
  watchPop(); patchSheets();
})();
