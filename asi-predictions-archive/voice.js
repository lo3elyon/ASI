/* voice.js: the site's one narrator (speechSynthesis), and the Kids' corner read-aloud built on it.
   Nothing speaks until a reader presses a button; pressing the same button again stops it.
   Everything attaches by event delegation on document, so markup rendered later (learn.js, pages.js) just works. */
(function () {
  "use strict";
  var doc = document;
  var ss = window.speechSynthesis, ok = !!(ss && window.SpeechSynthesisUtterance);
  var KEY = "asiArchive.say.v1", pref = {};
  try { pref = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { pref = {}; }
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) {} };
  var RATES = [0.75, 1, 1.25, 1.5];
  var rate = RATES.indexOf(+pref.rate) >= 0 ? +pref.rate : 1, voices = [], voice = null;
  var tok = 0, keep = 0, cur = null, subs = [];
  var android = /Android/i.test(navigator.userAgent || "");
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var WAVE = '<span class="x-vo-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';

  /* ---------- voices: English ones, Indian then British then US English first, local before network ---------- */
  var rank = function (v) { var l = (v.lang || "").replace("_", "-").toLowerCase(); return l === "en-in" ? 0 : l === "en-gb" ? 1 : l === "en-us" ? 2 : 3; };
  var loadVoices = function () {
    if (!ok) return;
    var list = (ss.getVoices() || []).filter(function (v) { return /^en([-_]|$)/i.test(v.lang || ""); });
    list.sort(function (a, b) { return rank(a) - rank(b) || (b.localService === true) - (a.localService === true) || String(a.name).localeCompare(String(b.name)); });
    voices = list;
    voice = list.filter(function (v) { return v.voiceURI === pref.voice; })[0] || list[0] || null;
    fillSelects();
  };
  var voiceOpts = function () {
    return voices.length ? voices.map(function (v, i) { return '<option value="' + i + '"' + (v === voice ? " selected" : "") + ">" + esc(v.name) + " (" + esc(v.lang) + ")</option>"; }).join("") : '<option value="">Default voice</option>';
  };
  var rateOpts = function () { return RATES.map(function (r) { return '<option value="' + r + '"' + (r === rate ? " selected" : "") + ">" + r + "×</option>"; }).join(""); };
  var fillSelects = function () {
    doc.querySelectorAll("select[data-vo-voice]").forEach(function (s) { s.innerHTML = voiceOpts(); });
    doc.querySelectorAll("select[data-vo-rate]").forEach(function (s) { s.value = String(rate); });
  };
  var setVoice = function (i) { voice = voices[+i] || voice; pref.voice = voice && voice.voiceURI; save(); fillSelects(); };
  var setRate = function (r) { r = +r; if (RATES.indexOf(r) < 0) r = 1; rate = r; pref.rate = r; save(); fillSelects(); };

  /* ---------- speaking: long text goes out sentence by sentence, so Chrome never cuts it off ---------- */
  var chunks = function (text) {
    var parts = String(text || "").replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g) || [];
    var out = [], buf = "";
    parts.forEach(function (p) { if ((buf + p).length > 220 && buf) { out.push(buf.trim()); buf = ""; } buf += p; });
    if (buf.trim()) out.push(buf.trim());
    return out;
  };
  var emit = function () { var s = { speaking: !!cur, id: cur ? cur.id : null }; subs.forEach(function (f) { try { f(s); } catch (e) {} }); };
  var stop = function () {
    tok++; clearInterval(keep); clearTimeout(speak.wd);
    if (ok) ss.cancel();
    all = false;
    cur = null;
    emit();
  };
  var speak = function (text, o) {
    o = o || {};
    if (!ok) return false;
    var list = chunks(text); if (!list.length) return false;
    var my = ++tok, i = 0, began = false;
    ss.cancel(); clearInterval(keep); clearTimeout(speak.wd);
    /* the pressed state shows at once, on the click; the 'start' event confirms it and 'end' clears it */
    cur = { id: o.id || "x", live: false }; emit();
    var done = function () { if (my !== tok) return; clearInterval(keep); clearTimeout(speak.wd); cur = null; emit(); if (o.onend) o.onend(); };
    var next = function () {
      if (my !== tok) return;
      if (i >= list.length) { done(); return; }
      var u = new SpeechSynthesisUtterance(list[i++]);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-GB";
      u.rate = 0.95 * rate;
      u.onstart = function () { if (my !== tok) return; began = true; clearTimeout(speak.wd); if (cur) { cur.live = true; emit(); } };
      u.onend = next;
      u.onerror = function (e) { if (my !== tok) return; if (e && (e.error === "interrupted" || e.error === "canceled")) return; next(); };
      ss.speak(u);
      if (ss.paused) ss.resume();
    };
    /* Chrome drops an utterance spoken in the same tick as cancel(); a short gap avoids it */
    setTimeout(next, 80);
    /* if the browser never starts speaking (no voice, blocked), the buttons go back to rest after 4s */
    speak.wd = setTimeout(function () { if (my !== tok || began || ss.speaking) return; tok++; all = false; cur = null; emit(); }, 4000);
    /* Chrome pauses long speech after ~15s; a pause/resume nudge keeps it going (not on Android, where pause ends it) */
    if (!android) keep = setInterval(function () { if (my !== tok || !ss.speaking) return; ss.pause(); ss.resume(); }, 10000);
    return true;
  };

  /* the voice and speed pickers, for any bar that wants them */
  var pickers = function () {
    return '<label class="x-vo-lab">Speed <select data-vo-rate aria-label="Reading speed">' + rateOpts() + "</select></label>" +
      '<label class="x-vo-lab">Voice <select data-vo-voice aria-label="Voice">' + voiceOpts() + "</select></label>";
  };
  doc.addEventListener("change", function (e) {
    var t = e.target;
    if (t.matches && t.matches("select[data-vo-voice]")) setVoice(t.value);
    else if (t.matches && t.matches("select[data-vo-rate]")) setRate(t.value);
  });

  window.XVoice = {
    ok: ok, speak: speak, stop: stop, pickers: pickers, setRate: setRate, setVoice: setVoice,
    rate: function () { return rate; },
    isSpeaking: function (id) { return !!cur && (id == null || cur.id === id); },
    on: function (f) { subs.push(f); }
  };

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
    var bar = doc.querySelector(".x-vo-kids");
    if (bar) {
      var ra = bar.querySelector("[data-kids-all]");
      ra.setAttribute("aria-pressed", all ? "true" : "false");
      ra.classList.toggle("is-speaking", all);
      ra.querySelector(".x-vo-lbl").textContent = all ? "Reading all…" : "Read all";
      bar.querySelector("[data-kids-stop]").disabled = !(cur && /^k:/.test(cur.id));
      var st = bar.querySelector(".x-vo-status");
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
    paintKids();
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
  window.addEventListener("pagehide", function () { if (ok) ss.cancel(); });

  if (ok) {
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
