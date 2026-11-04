/* player8.js: one caption toggle (C key and CC button) shared by every ArchivePlayer,
   and a live caption style panel in the ⚙ menu. State: localStorage "cap8.on", "cap8.style". */
(function () {
  "use strict";
  var AP = window.ArchivePlayer;
  var insts = [];
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------------- A. one shared on/off state ---------------- */
  var on = ls.get("cap8.on") !== "0";

  var roots = function () {
    var list = insts.map(function (i) { return i.root; }).filter(Boolean);
    document.querySelectorAll(".x-ap").forEach(function (r) { if (list.indexOf(r) < 0) list.push(r); });
    return list;
  };

  var dropYT = function (inst) {
    if (!inst || !inst.root) return;
    if (inst.root.classList.contains("is-native")) return; /* the user's YouTube-controls mode */
    if (on && inst._ytCC) return; /* the YouTube-caption fallback is the site caption here */
    var yt = null;
    try { yt = typeof inst.yt === "function" ? inst.yt() : null; } catch (e) {}
    if (!yt || typeof yt.unloadModule !== "function") return;
    try { yt.unloadModule("captions"); } catch (e) {}
    try { yt.unloadModule("cc"); } catch (e) {}
  };

  var apply = function () {
    roots().forEach(function (r) {
      r.classList.toggle("cap8-off", !on);
      r.querySelectorAll('[data-x="cc"]').forEach(function (b) {
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.classList.toggle("is-on", on);
      });
    });
    insts.forEach(function (i) {
      syncInst(i);
      dropYT(i);
    });
  };

  /* keep player-notes' own caption flag equal to cap8.on, both ways */
  function syncInst(i) {
    if (i && i.ccIsOn && i.ccToggle) { try { if (i.ccIsOn() !== on) i.ccToggle(); } catch (e) {} }
  }

  var instFor = function (el) {
    for (var k = 0; k < insts.length; k++) if (el && insts[k].root && insts[k].root.contains(el)) return insts[k];
    for (var j = 0; j < insts.length; j++) { var r = insts[j].root; if (r && r.offsetParent !== null) return insts[j]; }
    return insts[0] || null;
  };

  var toggle = function (from) {
    on = !on;
    ls.set("cap8.on", on ? "1" : "0");
    apply();
    var i = instFor(from);
    if (i && typeof i.say === "function") { try { i.say(on ? "Captions on" : "Captions off"); } catch (e) {} }
  };

  /* the one source of truth for captions on/off */
  window.Cap8 = {
    set: function (v, from) { if (!!v !== on) toggle(from); else apply(); },
    get: function () { return on; }
  };

  var typing = function (t) {
    if (!t || !t.tagName) return false;
    var n = t.tagName;
    return n === "INPUT" || n === "TEXTAREA" || n === "SELECT" || t.isContentEditable;
  };

  window.addEventListener("keydown", function (e) {
    if (e.key !== "c" && e.key !== "C") return;
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
    if (!roots().length) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    toggle(document.activeElement);
  }, true);

  window.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-x="cc"]') : null;
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (b._cap8Long) { b._cap8Long = false; return; }
    toggle(b);
  }, true);

  /* right-click or long-press on CC opens the style panel */
  window.addEventListener("contextmenu", function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-x="cc"]') : null;
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openPanel(instFor(b));
  }, true);
  var lp = null;
  window.addEventListener("pointerdown", function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-x="cc"]') : null;
    if (!b || e.pointerType === "mouse") return;
    clearTimeout(lp);
    lp = setTimeout(function () { b._cap8Long = true; openPanel(instFor(b)); }, 550);
  }, true);
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
    window.addEventListener(ev, function () { clearTimeout(lp); }, true);
  });

  /* ---------------- B. caption style ---------------- */
  var FONTS = {
    sans: { n: "Sans", v: 'var(--sans), system-ui, sans-serif' },
    serif: { n: "Serif", v: 'Georgia, "Times New Roman", serif' },
    mono: { n: "Mono", v: '"Geist Mono", ui-monospace, Menlo, monospace' },
    rounded: { n: "Rounded", v: 'ui-rounded, "SF Pro Rounded", Nunito, "Arial Rounded MT Bold", system-ui, sans-serif' },
    dys: { n: "Dyslexic-friendly", v: '"OpenDyslexic", "Atkinson Hyperlegible", "Comic Sans MS", Verdana, sans-serif' }
  };
  var EDGES = {
    none: { n: "None", v: "none" },
    outline: { n: "Outline", v: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 2px #000" },
    shadow: { n: "Drop shadow", v: "0 2px 4px rgba(0,0,0,.85), 0 0 2px rgba(0,0,0,.6)" },
    raised: { n: "Raised", v: "1px 1px 0 rgba(0,0,0,.9), 2px 2px 0 rgba(0,0,0,.6)" },
    depressed: { n: "Depressed", v: "-1px -1px 0 rgba(0,0,0,.9), 1px 1px 0 rgba(255,255,255,.35)" }
  };
  var SWATCHES = [["White", "#ffffff"], ["Yellow", "#ffe14d"], ["Cyan", "#4de1ff"], ["Lime", "#a3e635"], ["Amber", "#fbbf24"], ["Orange", "#fb923c"], ["Sky", "#7dd3fc"]];
  var DEF = { color: "#ffffff", bg: "#080a0e", bga: 0.62, font: "sans", size: 100, weight: 500, style: "normal", edge: "none", ls: 0, lh: 1.35, maxw: 100 };
  var PRESETS = {
    "Classic": { color: "#ffffff", bg: "#000000", bga: 0.75, font: "sans", size: 100, weight: 500, style: "normal", edge: "none", ls: 0, lh: 1.35, maxw: 100 },
    "High contrast": { color: "#ffe14d", bg: "#000000", bga: 1, font: "sans", size: 120, weight: 700, style: "normal", edge: "outline", ls: 0.01, lh: 1.35, maxw: 100 },
    "Cinema": { color: "#ffffff", bg: "#000000", bga: 0, font: "serif", size: 110, weight: 500, style: "normal", edge: "shadow", ls: 0.02, lh: 1.3, maxw: 80 },
    "Minimal": { color: "#ffffff", bg: "#000000", bga: 0, font: "sans", size: 90, weight: 400, style: "normal", edge: "shadow", ls: 0, lh: 1.3, maxw: 100 },
    "Colourful": { color: "#4de1ff", bg: "#0b1d2a", bga: 0.72, font: "rounded", size: 110, weight: 600, style: "normal", edge: "raised", ls: 0.01, lh: 1.4, maxw: 100 }
  };

  var S = null; /* null = site defaults, no variables set */
  try { S = JSON.parse(ls.get("cap8.style") || "null"); } catch (e) { S = null; }
  if (S) S = Object.assign({}, DEF, S);

  var VARS = ["--cap-color", "--cap-bg", "--cap-bg-a", "--cap-bg-mix", "--cap-font", "--cap-size", "--cap-size-n", "--cap-weight", "--cap-style", "--cap-edge", "--cap-ls", "--cap-lh", "--cap-maxw"];
  var hexRgb = function (h) {
    h = String(h || "#000").replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  var paintStyle = function () {
    var st = document.documentElement.style;
    if (!S) { VARS.forEach(function (v) { st.removeProperty(v); }); return; }
    var c = hexRgb(S.bg);
    st.setProperty("--cap-color", S.color);
    st.setProperty("--cap-bg", S.bg);
    st.setProperty("--cap-bg-a", String(S.bga));
    st.setProperty("--cap-bg-mix", "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + S.bga + ")");
    st.setProperty("--cap-font", (FONTS[S.font] || FONTS.sans).v);
    st.setProperty("--cap-size", S.size + "%");
    st.setProperty("--cap-size-n", String(S.size / 100));
    st.setProperty("--cap-weight", String(S.weight));
    st.setProperty("--cap-style", S.style);
    st.setProperty("--cap-edge", (EDGES[S.edge] || EDGES.none).v);
    st.setProperty("--cap-ls", S.ls + "em");
    st.setProperty("--cap-lh", String(S.lh));
    st.setProperty("--cap-maxw", S.maxw + "%");
  };
  var save = function () { if (S) ls.set("cap8.style", JSON.stringify(S)); else ls.del("cap8.style"); };
  var setS = function (k, v) { S = Object.assign({}, DEF, S || {}); S[k] = v; paintStyle(); save(); };

  var opt = function (val, name, cur) { return '<option value="' + val + '"' + (String(cur) === String(val) ? " selected" : "") + ">" + name + "</option>"; };
  var panelHTML = function () {
    var s = S || DEF, h = "";
    h += '<div class="cap8-p__top"><p class="cap8-p__t">Caption style</p><button class="cap8-p__x" type="button" data-c8="close" aria-label="Close caption style">×</button></div>';
    h += '<div class="cap8-p__body">';
    h += '<p class="cap8-p__h">Presets</p><div class="cap8-p__presets">';
    Object.keys(PRESETS).forEach(function (k) { h += '<button type="button" class="cap8-p__btn" data-c8p="' + k + '">' + k + "</button>"; });
    h += "</div>";
    h += '<p class="cap8-p__h">Text colour</p><div class="cap8-p__sw" role="group" aria-label="Text colour">';
    SWATCHES.forEach(function (w) {
      h += '<button type="button" class="cap8-p__swb" data-c8c="' + w[1] + '" style="background:' + w[1] + '" aria-label="' + w[0] + '" aria-pressed="' + (s.color.toLowerCase() === w[1] ? "true" : "false") + '" title="' + w[0] + '"></button>';
    });
    h += '<label class="cap8-p__pick" title="Custom colour"><input type="color" data-c8="color" value="' + s.color + '" aria-label="Custom text colour" /></label></div>';
    h += '<div class="cap8-p__row"><label>Background<input type="color" data-c8="bg" value="' + s.bg + '" /></label>' +
      '<label class="cap8-p__grow">Opacity <output data-c8o="bga">' + Math.round(s.bga * 100) + '%</output><input type="range" min="0" max="1" step="0.05" data-c8="bga" value="' + s.bga + '" /></label></div>';
    h += '<div class="cap8-p__row"><label class="cap8-p__grow">Font<select data-c8="font">';
    Object.keys(FONTS).forEach(function (k) { h += opt(k, FONTS[k].n, s.font); });
    h += '</select></label><label>Weight<select data-c8="weight">' + opt(400, "Regular", s.weight) + opt(500, "Medium", s.weight) + opt(600, "Semibold", s.weight) + opt(700, "Bold", s.weight) + opt(800, "Heavy", s.weight) + "</select></label>";
    h += '<label>Style<select data-c8="style">' + opt("normal", "Upright", s.style) + opt("italic", "Italic", s.style) + "</select></label></div>";
    h += '<div class="cap8-p__row"><label class="cap8-p__grow">Edge<select data-c8="edge">';
    Object.keys(EDGES).forEach(function (k) { h += opt(k, EDGES[k].n, s.edge); });
    h += "</select></label></div>";
    var rng = function (k, name, min, max, step, fmt) {
      return '<label class="cap8-p__sl"><span>' + name + ' <output data-c8o="' + k + '">' + fmt(s[k]) + '</output></span><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" data-c8="' + k + '" value="' + s[k] + '" /></label>';
    };
    h += rng("size", "Size", 50, 250, 5, function (v) { return v + "%"; });
    h += rng("ls", "Letter spacing", -0.05, 0.3, 0.01, function (v) { return (+v).toFixed(2) + "em"; });
    h += rng("lh", "Line height", 1, 2, 0.05, function (v) { return (+v).toFixed(2); });
    h += rng("maxw", "Max width", 40, 100, 5, function (v) { return v + "%"; });
    h += '</div><div class="cap8-p__foot"><button type="button" class="cap8-p__btn" data-c8="reset">Reset</button><button type="button" class="cap8-p__btn cap8-p__btn--main" data-c8="close">Done</button></div>';
    return h;
  };
  var FMT = { bga: function (v) { return Math.round(v * 100) + "%"; }, size: function (v) { return v + "%"; }, ls: function (v) { return (+v).toFixed(2) + "em"; }, lh: function (v) { return (+v).toFixed(2); }, maxw: function (v) { return v + "%"; } };

  var panel = null, panelInst = null, sampleT = null;
  var closePanel = function () {
    clearInterval(sampleT);
    if (panel) { panel.remove(); panel = null; }
    document.querySelectorAll(".cap8-sample").forEach(function (n) { n.remove(); });
    panelInst = null;
  };
  var sample = function () {
    if (!panelInst) return;
    var host = panelInst.screen || panelInst.root;
    var live = false;
    panelInst.root.querySelectorAll(".x-pn-cap__l").forEach(function (l) { if (l.textContent.trim() && l.offsetParent !== null) live = true; });
    var ex = host.querySelector(".cap8-sample");
    if (live || !on) { if (ex) ex.remove(); return; }
    if (!ex) {
      ex = document.createElement("div");
      ex.className = "cap8-sample";
      ex.setAttribute("aria-hidden", "true");
      ex.innerHTML = '<div class="cap8-sample__win"><span class="cap8-sample__l"><span>This is how captions will look.</span></span></div>';
      host.appendChild(ex);
    }
  };
  var refill = function () {
    if (!panel) return;
    var sc = panel.querySelector(".cap8-p__body"), top = sc ? sc.scrollTop : 0;
    panel.innerHTML = panelHTML();
    sc = panel.querySelector(".cap8-p__body"); if (sc) sc.scrollTop = top;
  };
  var openPanel = function (inst) {
    if (!inst || !inst.root) return;
    if (panel && panelInst === inst) { closePanel(); return; }
    closePanel();
    panelInst = inst;
    var host = inst.screen || inst.root;
    panel = document.createElement("div");
    panel.className = "cap8-p";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Caption style");
    panel.innerHTML = panelHTML();
    ["click", "pointerdown", "mousedown", "dblclick", "touchstart", "wheel"].forEach(function (ev) {
      panel.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: ev !== "click" });
    });
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closePanel(); var b = inst.root.querySelector('[data-x="more"]'); if (b) b.focus(); }
      e.stopPropagation();
    });
    panel.addEventListener("click", function (e) {
      var t = e.target.closest("button"); if (!t) return;
      if (t.dataset.c8 === "close") { closePanel(); return; }
      if (t.dataset.c8 === "reset") { S = null; paintStyle(); save(); refill(); return; }
      if (t.dataset.c8p) { S = Object.assign({}, DEF, PRESETS[t.dataset.c8p]); paintStyle(); save(); refill(); return; }
      if (t.dataset.c8c) { setS("color", t.dataset.c8c); refill(); }
    });
    var onInput = function (e) {
      var t = e.target, k = t.dataset && t.dataset.c8; if (!k) return;
      var v = t.value;
      if (k === "bga" || k === "size" || k === "ls" || k === "lh" || k === "maxw" || k === "weight") v = parseFloat(v);
      setS(k, v);
      var o = panel.querySelector('[data-c8o="' + k + '"]'); if (o && FMT[k]) o.textContent = FMT[k](v);
      if (k === "color") panel.querySelectorAll("[data-c8c]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.c8c === String(v).toLowerCase() ? "true" : "false"); });
    };
    panel.addEventListener("input", onInput);
    panel.addEventListener("change", onInput);
    host.appendChild(panel);
    sample();
    sampleT = setInterval(function () { if (!panel || !panel.isConnected) { closePanel(); return; } sample(); }, 400);
    var f = panel.querySelector(".cap8-p__btn"); if (f) f.focus();
  };

  /* ⚙ menu item */
  var addMenu = function (inst, tries) {
    var menu = inst.root.querySelector(".x-apx-menu");
    if (!menu) { if ((tries || 0) < 20) setTimeout(function () { addMenu(inst, (tries || 0) + 1); }, 150); return; }
    if (menu.querySelector(".cap8-sec")) return;
    menu.insertAdjacentHTML("beforeend",
      '<div class="x-apx-sec cap8-sec"><button class="x-ap__b" type="button" data-cap8="open">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h4M13 15h4M7 11h10"/></svg>' +
      '<span class="x-apx-lbl">Caption style…</span></button></div>');
    menu.querySelector('[data-cap8="open"]').addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      var more = inst.root.querySelector('[data-x="more"][aria-expanded="true"]');
      if (more) more.click(); else menu.hidden = true;
      openPanel(inst);
    });
  };

  var wire = function (inst) {
    if (!inst || !inst.root || insts.indexOf(inst) >= 0) return;
    insts.push(inst);
    addMenu(inst, 0);
    syncInst(inst);
    setTimeout(function () { syncInst(inst); }, 0); /* in case player-notes wires after us */
    if (typeof inst.on === "function") {
      try { inst.on("ready", function () { apply(); setTimeout(function () { dropYT(inst); }, 600); }); } catch (e) {}
      try { inst.on("state", function (s) { if (s === 1) dropYT(inst); }); } catch (e) {}
    }
    /* mode changes: native YouTube controls, fullscreen, pop-out */
    try {
      var was = inst.root.className;
      new MutationObserver(function () {
        var now = inst.root.className; if (now === was) return; was = now;
        inst.root.classList.toggle("cap8-off", !on);
        dropYT(inst);
      }).observe(inst.root, { attributes: true, attributeFilter: ["class"] });
    } catch (e) {}
    apply();
  };

  paintStyle();
  if (AP && typeof AP.onCreate === "function") AP.onCreate(wire);
  apply();
  document.addEventListener("DOMContentLoaded", apply);
})();
