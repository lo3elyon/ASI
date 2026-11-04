/* voice.js: the site's one narrator, and the Kids' corner read-aloud built on it.
   Two engines: "System voice" (speechSynthesis; prefers voices named Natural, Neural, Google or Online) and
   "Natural (Kokoro, on-device)" (kokoro-js, Kokoro-82M q8, WebGPU else WASM), which downloads only after a reader
   picks it, with its size and a progress bar; the browser caches it. Both read sentence by sentence, with play,
   pause, stop, speed and the current sentence shown in the narrator bar. Nothing speaks until a reader presses a
   button. Everything attaches by event delegation on document, so markup rendered later just works. */
(function () {
  "use strict";
  var doc = document;
  var ss = window.speechSynthesis, ssOk = !!(ss && window.SpeechSynthesisUtterance);
  var KEY = "asiArchive.say.v1", pref = {};
  try { pref = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { pref = {}; }
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) {} };
  var RATES = [0.75, 1, 1.25, 1.5];
  var rate = RATES.indexOf(+pref.rate) >= 0 ? +pref.rate : 1, voices = [], voice = null;
  var engine = pref.engine === "kokoro" ? "kokoro" : "system";
  var ok = ssOk || !!window.WebAssembly;
  var tok = 0, keep = 0, cur = null, subs = [];
  var android = /Android/i.test(navigator.userAgent || "");
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var WAVE = '<span class="x-vo-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  var KVOICES = [["af_heart", "Heart (US, female)"], ["af_bella", "Bella (US, female)"], ["af_nicole", "Nicole (US, female)"], ["af_sarah", "Sarah (US, female)"],
    ["am_michael", "Michael (US, male)"], ["am_adam", "Adam (US, male)"], ["bf_emma", "Emma (UK, female)"], ["bf_isabella", "Isabella (UK, female)"],
    ["bm_george", "George (UK, male)"], ["bm_lewis", "Lewis (UK, male)"]];
  var kvoice = KVOICES.some(function (v) { return v[0] === pref.kvoice; }) ? pref.kvoice : "af_heart";

  /* ---------- system voices: natural-sounding ones first, then Indian, British, US English, local before network ---------- */
  var quality = function (v) { return /natural|neural/i.test(v.name) ? 0 : /google|online/i.test(v.name) ? 1 : 2; };
  var rank = function (v) { var l = (v.lang || "").replace("_", "-").toLowerCase(); return l === "en-in" ? 0 : l === "en-gb" ? 1 : l === "en-us" ? 2 : 3; };
  var loadVoices = function () {
    if (!ssOk) return;
    var list = (ss.getVoices() || []).filter(function (v) { return /^en([-_]|$)/i.test(v.lang || ""); });
    list.sort(function (a, b) { return quality(a) - quality(b) || rank(a) - rank(b) || (b.localService === true) - (a.localService === true) || String(a.name).localeCompare(String(b.name)); });
    voices = list;
    voice = list.filter(function (v) { return v.voiceURI === pref.voice; })[0] || list[0] || null;
    fillSelects();
  };

  /* ---------- Kokoro: loaded on demand ---------- */
  var K = { tts: null, p: null, state: "idle", pct: 0, files: {}, err: "", device: "" };
  var KSIZE = "about 90 MB";
  var paintK = function () {
    doc.querySelectorAll("[data-vo-kstatus]").forEach(function (el) {
      var s = K.state;
      el.hidden = engine !== "kokoro";
      el.innerHTML = s === "loading" ? '<span>Downloading the Kokoro voice (' + KSIZE + ', once; then cached): ' + Math.round(K.pct) + '%</span><progress max="100" value="' + Math.round(K.pct) + '"></progress>'
        : s === "ready" ? "<span>Kokoro is ready, running on " + (K.device === "webgpu" ? "WebGPU" : "WebAssembly") + " on this device.</span>"
        : s === "error" ? "<span>The Kokoro voice could not load (" + esc(K.err) + "). Reading with the system voice instead.</span>"
        : "<span>Natural voice: " + KSIZE + " download the first time it reads, then cached. It runs on this device.</span>";
    });
  };
  var ensureKokoro = function () {
    if (K.p) return K.p;
    K.state = "loading"; K.pct = 0; K.files = {}; paintK();
    var progress = function (d) {
      if (!d || d.status !== "progress" || !d.file) return;
      K.files[d.file] = { l: d.loaded || 0, t: d.total || 0 };
      var l = 0, t = 0; Object.keys(K.files).forEach(function (f) { l += K.files[f].l; t += K.files[f].t; });
      K.pct = t ? (l / t) * 100 : d.progress || 0; paintK();
    };
    var load = function (m, device) {
      K.device = device;
      return m.KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: device, progress_callback: progress });
    };
    K.p = import("https://cdn.jsdelivr.net/npm/kokoro-js/+esm").then(function (m) {
      var dev = navigator.gpu ? "webgpu" : "wasm";
      return load(m, dev).catch(function (e) { if (dev === "webgpu") return load(m, "wasm"); throw e; });
    }).then(function (tts) { K.tts = tts; K.state = "ready"; paintK(); return tts; })
      .catch(function (e) { K.state = "error"; K.err = (e && e.message ? e.message : "network").slice(0, 80); K.p = null; paintK(); throw e; });
    return K.p;
  };

  /* every Voice select lists both engines: the system voices, then the Natural (Kokoro) voices (value "k:<id>");
     picking one from the other group switches the engine too */
  var voiceOpts = function () {
    var sys = voices.length ? voices.map(function (v, i) { return '<option value="' + i + '"' + (engine === "system" && v === voice ? " selected" : "") + ">" + esc(v.name) + " (" + esc(v.lang) + ")</option>"; }).join("")
      : '<option value=""' + (engine === "system" ? " selected" : "") + ">Default voice</option>";
    var kk = KVOICES.map(function (v) { return '<option value="k:' + v[0] + '"' + (engine === "kokoro" && v[0] === kvoice ? " selected" : "") + ">Natural (Kokoro): " + esc(v[1]) + "</option>"; }).join("");
    return (ssOk ? '<optgroup label="System voice">' + sys + "</optgroup>" : "") + '<optgroup label="Natural (Kokoro, on-device)">' + kk + "</optgroup>";
  };
  var rateOpts = function () { return RATES.map(function (r) { return '<option value="' + r + '"' + (r === rate ? " selected" : "") + ">" + r + "×</option>"; }).join(""); };
  var engOpts = function () { return '<option value="system"' + (engine === "system" ? " selected" : "") + '>System voice</option><option value="kokoro"' + (engine === "kokoro" ? " selected" : "") + ">Natural (Kokoro, on-device)</option>"; };
  var fillSelects = function () {
    doc.querySelectorAll("select[data-vo-voice]").forEach(function (s) { s.innerHTML = voiceOpts(); });
    doc.querySelectorAll("select[data-vo-rate]").forEach(function (s) { s.value = String(rate); });
    doc.querySelectorAll("select[data-vo-engine]").forEach(function (s) { s.value = engine; });
    paintK();
  };
  var setVoice = function (i) {
    var s = String(i == null ? "" : i);
    var kid = s.indexOf("k:") === 0 ? s.slice(2) : (engine === "kokoro" && KVOICES.some(function (v) { return v[0] === s; }) ? s : null);
    if (kid) {
      kvoice = kid; pref.kvoice = kid; save();
      if (engine !== "kokoro") setEngine("kokoro"); else fillSelects();
      return;
    }
    voice = voices[+s] || voice; pref.voice = voice && voice.voiceURI;
    if (engine !== "system") { setEngine("system"); return; }
    save(); fillSelects();
  };
  var setRate = function (r) { r = +r; if (RATES.indexOf(r) < 0) r = 1; rate = r; pref.rate = r; save(); fillSelects(); };
  var setEngine = function (e) {
    engine = e === "kokoro" ? "kokoro" : "system"; pref.engine = engine; save();
    stop(); fillSelects();
    if (engine === "kokoro") ensureKokoro().catch(function () {});
  };

  /* ---------- speaking: long text goes out sentence by sentence ---------- */
  var chunks = function (text) {
    var parts = String(text || "").replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g) || [];
    var out = [], buf = "";
    parts.forEach(function (p) { if ((buf + p).length > 220 && buf) { out.push(buf.trim()); buf = ""; } buf += p; });
    if (buf.trim()) out.push(buf.trim());
    return out;
  };
  var emit = function () {
    var s = { speaking: !!cur, id: cur ? cur.id : null, paused: !!(cur && cur.paused), i: cur ? cur.i : -1, n: cur ? cur.list.length : 0, sentence: cur && cur.i >= 0 ? cur.list[cur.i] : "" };
    subs.forEach(function (f) { try { f(s); } catch (e) {} });
  };
  var audio = null, prefetch = null;
  var halt = function () {
    tok++; clearInterval(keep); clearTimeout(speak.wd);
    if (ssOk) ss.cancel();
    if (audio) { try { audio.pause(); } catch (e) {} if (audio.__url) URL.revokeObjectURL(audio.__url); audio = null; }
    prefetch = null;
  };
  var stop = function () {
    halt();
    all = false;
    cur = null;
    emit();
  };
  var speakSystem = function (list, o, my) {
    if (!ssOk) { cur = null; emit(); return; }
    var i = 0, began = false;
    var done = function () { if (my !== tok) return; clearInterval(keep); clearTimeout(speak.wd); cur = null; emit(); if (o.onend) o.onend(); };
    var next = function () {
      if (my !== tok) return;
      if (i >= list.length) { done(); return; }
      var idx = i++;
      var u = new SpeechSynthesisUtterance(list[idx]);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-GB";
      u.rate = 0.95 * rate;
      u.onstart = function () { if (my !== tok) return; began = true; clearTimeout(speak.wd); if (cur) { cur.live = true; cur.i = idx; emit(); } };
      u.onend = next;
      u.onerror = function (e) { if (my !== tok) return; if (e && (e.error === "interrupted" || e.error === "canceled")) return; next(); };
      ss.speak(u);
      if (ss.paused && !(cur && cur.paused)) ss.resume();
    };
    setTimeout(next, 80);
    speak.wd = setTimeout(function () { if (my !== tok || began || ss.speaking) return; tok++; all = false; cur = null; emit(); }, 4000);
    if (!android) keep = setInterval(function () { if (my !== tok || !ss.speaking || (cur && cur.paused)) return; ss.pause(); ss.resume(); }, 10000);
  };
  var speakKokoro = function (list, o, my) {
    var gen = function (i) { return K.tts.generate(list[i], { voice: kvoice, speed: rate }).then(function (a) { return a.toBlob(); }); };
    var play = function (i, blobP) {
      if (my !== tok) return;
      if (i >= list.length) { cur = null; emit(); if (o.onend) o.onend(); return; }
      blobP.then(function (blob) {
        if (my !== tok) return;
        if (i + 1 < list.length) prefetch = gen(i + 1);
        var url = URL.createObjectURL(blob);
        audio = new Audio(url); audio.__url = url;
        audio.onended = function () { URL.revokeObjectURL(url); if (my !== tok) return; play(i + 1, prefetch || gen(i + 1)); };
        cur.i = i; cur.live = true; emit();
        if (!cur.paused) audio.play().catch(function () {});
      }).catch(function () { if (my !== tok) return; play(i + 1, i + 1 < list.length ? gen(i + 1) : Promise.resolve(null)); });
    };
    ensureKokoro().then(function () { if (my === tok) play(0, gen(0)); }).catch(function () {
      if (my !== tok) return;
      speakSystem(list, o, my);
    });
  };
  var speak = function (text, o) {
    o = o || {};
    if (!ok) return false;
    var list = chunks(text); if (!list.length) return false;
    halt();
    var my = ++tok;
    cur = { id: o.id || "x", live: false, list: list, i: -1, paused: false }; emit();
    if (engine === "kokoro") speakKokoro(list, o, my); else speakSystem(list, o, my);
    return true;
  };
  var pause = function () {
    if (!cur || cur.paused) return;
    cur.paused = true;
    if (audio) audio.pause(); else if (ssOk) ss.pause();
    emit();
  };
  var resume = function () {
    if (!cur || !cur.paused) return;
    cur.paused = false;
    if (audio) audio.play().catch(function () {}); else if (ssOk) ss.resume();
    emit();
  };

  /* the engine, voice and speed pickers, for any bar that wants them */
  var pickers = function () {
    return '<label class="x-vo-lab">Engine <select data-vo-engine aria-label="Voice engine">' + engOpts() + "</select></label>" +
      '<label class="x-vo-lab">Speed <select data-vo-rate aria-label="Reading speed">' + rateOpts() + "</select></label>" +
      '<label class="x-vo-lab">Voice <select data-vo-voice aria-label="Voice">' + voiceOpts() + "</select></label>" +
      '<p class="x-vo-k" data-vo-kstatus' + (engine === "kokoro" ? "" : " hidden") + "></p>";
  };
  doc.addEventListener("change", function (e) {
    var t = e.target;
    if (!t.matches) return;
    if (t.matches("select[data-vo-voice]")) setVoice(t.value);
    else if (t.matches("select[data-vo-rate]")) setRate(t.value);
    else if (t.matches("select[data-vo-engine]")) setEngine(t.value);
  });

  /* back to the defaults: system engine, 1×, the best-ranked system voice, Heart for Kokoro */
  var reset = function () {
    stop();
    pref = {}; try { localStorage.removeItem(KEY); } catch (e) {}
    engine = "system"; rate = 1; kvoice = "af_heart"; voice = voices[0] || null;
    fillSelects();
  };

  window.XVoice = {
    ok: ok, speak: speak, stop: stop, pause: pause, resume: resume, pickers: pickers, setRate: setRate, setVoice: setVoice, setEngine: setEngine, reset: reset,
    engine: function () { return engine; },
    rate: function () { return rate; },
    isSpeaking: function (id) { return !!cur && (id == null || cur.id === id); },
    on: function (f) { subs.push(f); }
  };

  /* =====================================================================
     Narrator bar: shows while anything reads; play/pause, stop, speed, engine and the sentence being read
     ===================================================================== */
  var bar = null;
  var paintBar = function (s) {
    if (!s.speaking) { if (bar) bar.hidden = true; return; }
    if (!bar) {
      bar = doc.createElement("div");
      bar.className = "x-nar glass"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Narrator");
      bar.innerHTML = '<button type="button" class="x-vo-b" data-nar="pp" aria-label="Pause">⏸</button><button type="button" class="x-vo-b" data-nar="stop" aria-label="Stop">■</button>' +
        '<p class="x-nar__s" aria-live="off"><small></small><span></span></p>' +
        '<label class="x-vo-lab"><span class="x-nar__lab">Speed</span> <select data-vo-rate aria-label="Reading speed">' + rateOpts() + "</select></label>" +
        '<label class="x-vo-lab"><span class="x-nar__lab">Engine</span> <select data-vo-engine aria-label="Voice engine">' + engOpts() + "</select></label>" +
        '<p class="x-vo-k x-nar__k" data-vo-kstatus hidden></p>';
      doc.body.appendChild(bar);
      bar.addEventListener("click", function (e) {
        var b = e.target.closest("[data-nar]"); if (!b) return;
        if (b.getAttribute("data-nar") === "stop") stop();
        else if (cur && cur.paused) resume(); else pause();
      });
    }
    bar.hidden = false;
    var pp = bar.querySelector('[data-nar="pp"]');
    pp.textContent = s.paused ? "▶" : "⏸"; pp.setAttribute("aria-label", s.paused ? "Resume" : "Pause");
    bar.querySelector(".x-nar__s small").textContent = s.i >= 0 ? "Sentence " + (s.i + 1) + " of " + s.n + (s.paused ? " · paused" : "") : engine === "kokoro" && K.state !== "ready" ? "Preparing the natural voice…" : "Starting…";
    bar.querySelector(".x-nar__s span").textContent = s.sentence || "";
    paintK();
  };
  subs.push(paintBar);
  /* the sentence being read, marked in the text it came from (when that text is a [data-vo-read] block) */
  subs.push(function (s) {
    doc.querySelectorAll(".x-vo-now").forEach(function (m) { var p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize(); });
    if (!s.speaking || !s.sentence || !/^g:/.test(s.id)) return;
    var src = doc.getElementById(s.id.slice(2)); if (!src) return;
    var needle = s.sentence.slice(0, 40), w = doc.createTreeWalker(src, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      var at = n.nodeValue.indexOf(needle); if (at < 0) continue;
      var len = Math.min(s.sentence.length, n.nodeValue.length - at);
      var r = doc.createRange(); r.setStart(n, at); r.setEnd(n, at + len);
      var mk = doc.createElement("mark"); mk.className = "x-vo-now";
      try { r.surroundContents(mk); } catch (e) {}
      break;
    }
  });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && cur && !doc.querySelector("dialog[open]")) stop(); });

  /* =====================================================================
     Generic "Listen" buttons: <button data-vo-read="elementId"> or <button data-vo-text="…">
     ===================================================================== */
  var paintGeneric = function () {
    doc.querySelectorAll("[data-vo-read], [data-vo-text]").forEach(function (b) {
      var on = !!cur && cur.id === "g:" + (b.getAttribute("data-vo-read") || b.getAttribute("data-vo-key") || "");
      b.classList.toggle("is-speaking", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      var l = b.querySelector(".x-vo-lbl"); if (l) l.textContent = on ? "Stop" : (b.getAttribute("data-vo-label") || "Listen");
    });
  };
  var keyN = 0;
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-vo-read], [data-vo-text]");
    if (!b) return;
    e.preventDefault();
    if (!ok) return;
    if (b.hasAttribute("data-vo-text") && !b.getAttribute("data-vo-key")) b.setAttribute("data-vo-key", "t" + (++keyN));
    var id = "g:" + (b.getAttribute("data-vo-read") || b.getAttribute("data-vo-key"));
    if (cur && cur.id === id) { stop(); return; }
    var text = b.getAttribute("data-vo-text");
    if (!text) { var src = doc.getElementById(b.getAttribute("data-vo-read")); text = src ? (src.innerText || src.textContent) : ""; }
    speak(text, { id: id });
  });
  subs.push(paintGeneric);

  /* =====================================================================
     Kids' corner: Read all, Stop, speed and voice above the cards; each 🔊 toggles that card
     ===================================================================== */
  var all = false;
  var kidsBox = function () { return doc.querySelector(".x-ln__kids"); };
  var flipOf = function (i) { var box = kidsBox(); return box ? box.querySelectorAll(".x-ln__flip")[i] : null; };
  var textOf = function (flip) {
    var b = flip.querySelector(".x-ln__back b"), s = flip.querySelector(".x-ln__back > span");
    if (!b && !s) b = flip.querySelector(".x-ln__front b");
    return ((b ? b.textContent : "") + ". " + (s ? s.textContent : "")).trim();
  };
  var flipOpen = function (flip) {
    var c = flip.querySelector(".x-ln__card");
    if (c && c.getAttribute("aria-expanded") !== "true") { c.setAttribute("aria-expanded", "true"); flip.classList.add("is-flipped"); }
  };
  var paintKids = function () {
    var box = kidsBox(); if (!box) return;
    var m = cur && /^k:(\d+)$/.exec(cur.id), idx = m ? +m[1] : -1;
    box.querySelectorAll(".x-ln__flip").forEach(function (f, i) {
      var on = i === idx, b = f.querySelector(".x-ln__say");
      f.classList.toggle("is-reading", on);
      if (b) {
        b.classList.toggle("is-speaking", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
        var l = b.querySelector(".x-vo-lbl"); if (l) l.textContent = on ? "Stop" : "Listen";
      }
    });
    if (cur && !/^k:/.test(cur.id)) all = false;
    var kbar = doc.querySelector(".x-vo-kids");
    if (kbar) {
      var ra = kbar.querySelector("[data-kids-all]");
      ra.setAttribute("aria-pressed", all ? "true" : "false");
      ra.classList.toggle("is-speaking", all);
      ra.querySelector(".x-vo-lbl").textContent = all ? "Reading all…" : "Read all";
      kbar.querySelector("[data-kids-stop]").disabled = !(cur && /^k:/.test(cur.id));
      var st = kbar.querySelector(".x-vo-status");
      if (st) st.textContent = idx >= 0 ? "Reading card " + (idx + 1) + " of " + box.querySelectorAll(".x-ln__flip").length : "";
    }
  };
  subs.push(paintKids);
  var readCard = function (i, after) { var f = flipOf(i); if (!f) return; speak(textOf(f), { id: "k:" + i, onend: after }); };
  var readAll = function () {
    var box = kidsBox(); if (!box) return;
    var n = box.querySelectorAll(".x-ln__flip").length, i = 0;
    var next = function () {
      if (!all || i >= n) { all = false; paintKids(); return; }
      var f = flipOf(i); flipOpen(f); readCard(i++, next);
    };
    all = true; next(); paintKids();
  };

  var mountKids = function () {
    var box = kidsBox();
    if (!box || box.__xvo) return;
    box.__xvo = true;
    var btns = box.querySelectorAll(".x-ln__say");
    if (!ok) {
      btns.forEach(function (b) { b.hidden = true; });
      box.insertAdjacentHTML("beforebegin", '<p class="x-vo-note">Read-aloud is not available in this browser, so the 🔊 buttons are hidden. The cards still flip.</p>');
      return;
    }
    btns.forEach(function (b) {
      b.classList.remove("x-mo-say");
      b.classList.add("x-vo-say");
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = '<span class="x-vo-ico" aria-hidden="true">🔊</span>' + WAVE + '<span class="x-vo-lbl">Listen</span>';
    });
    box.insertAdjacentHTML("beforebegin",
      '<div class="x-vo-bar x-vo-kids" role="group" aria-label="Read aloud">' +
        '<button type="button" class="x-vo-b" data-kids-all aria-pressed="false"><span class="x-vo-ico" aria-hidden="true">🔊</span>' + WAVE + '<span class="x-vo-lbl">Read all</span></button>' +
        '<button type="button" class="x-vo-b" data-kids-stop disabled><span aria-hidden="true">■</span> Stop</button>' +
        pickers() +
        '<span class="x-vo-status" aria-live="polite"></span>' +
      "</div>");
    paintKids(); paintK();
  };
  window.XVoice.mountKids = mountKids;

  /* capture phase: the 🔊 buttons and the bar are handled here, before learn.js's one-shot speak */
  doc.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) return;
    var say = t.closest(".x-ln__say");
    if (say) {
      e.stopPropagation(); e.preventDefault();
      mountKids();
      if (!ok) return;
      var f = say.closest(".x-ln__flip"), box = kidsBox();
      var i = box ? [].indexOf.call(box.querySelectorAll(".x-ln__flip"), f) : -1;
      if (i < 0) return;
      if (cur && cur.id === "k:" + i && !all) { stop(); return; }
      all = false; readCard(i);
      return;
    }
    if (t.closest("[data-kids-all]")) { e.preventDefault(); if (all) stop(); else readAll(); return; }
    if (t.closest("[data-kids-stop]")) { e.preventDefault(); stop(); return; }
    /* leaving the Kids' corner tab stops its voice */
    var tab = t.closest(".x-ln__tab");
    if (tab && tab.getAttribute("data-ln") !== "kids" && cur && /^k:/.test(cur.id)) stop();
  }, true);
  window.addEventListener("pagehide", function () { if (ssOk) ss.cancel(); if (audio) audio.pause(); });

  if (ssOk) {
    loadVoices();
    if (ss.addEventListener) ss.addEventListener("voiceschanged", loadVoices); else ss.onvoiceschanged = loadVoices;
  }
  var boot = function () {
    mountKids();
    var host = doc.getElementById("learn-root") || doc.body;
    if ("MutationObserver" in window) {
      var q = 0;
      new MutationObserver(function () { if (q) return; q = requestAnimationFrame(function () { q = 0; mountKids(); }); }).observe(host, { childList: true, subtree: true });
    }
  };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})();
