/* motion.js: loaded last. Landing highlight and scroll-spy (B), Kids' corner read-aloud (A), history markers (B4),
   phone helpers (C) and motion (D). Nothing here reorders, re-renders or rotates content on a timer, and nothing
   starts playback. Under prefers-reduced-motion every animation below is skipped. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var phoneMq = window.matchMedia ? matchMedia("(max-width: 640px)") : { matches: false };
  var hasIO = "IntersectionObserver" in window;
  var once = function (el, fn, margin) {
    if (!el) return;
    if (!hasIO) { fn(el); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); } }); }, { rootMargin: margin || "0px 0px -10% 0px" });
    io.observe(el);
  };
  var safe = function (f) { try { f(); } catch (e) { if (window.console) console.warn("motion.js:", e); } };

  /* =====================================================================
     B2. Scroll-spy: the section crossing the middle of the viewport is the active nav pill
     ===================================================================== */
  var spy = null;
  safe(function () {
    var seg = doc.querySelector(".nav .seg");
    if (!seg || !hasIO) return;
    var links = [].slice.call(seg.querySelectorAll('a[href^="#"]')), map = {}, ids = [];
    links.forEach(function (a) { var id = a.getAttribute("href").slice(1); if (id && doc.getElementById(id)) { map[id] = a; ids.push(id); } });
    if (!ids.length) return;
    var cur = null, busy = false;
    var paint = function () {
      busy = true;
      links.forEach(function (a) { if (cur && a === map[cur]) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
      busy = false;
      var a = cur && map[cur];
      if (a) {
        var l = a.offsetLeft - 8, r = a.offsetLeft + a.offsetWidth + 8;
        if (l < seg.scrollLeft || r > seg.scrollLeft + seg.clientWidth) seg.scrollTo({ left: l, behavior: reduce ? "auto" : "smooth" });
      }
    };
    var set = function (id) { if (id === cur) return; cur = id; paint(); };
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) set(e.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    ids.forEach(function (id) { io.observe(doc.getElementById(id)); });
    /* above the first section (the hero), nothing is active */
    var top = function () {
      var f = doc.getElementById(ids[0]);
      if (f && f.getBoundingClientRect().top > window.innerHeight * 0.5 && cur) set(null);
    };
    var t = 0;
    window.addEventListener("scroll", function () { if (!t) t = requestAnimationFrame(function () { t = 0; top(); }); }, { passive: true });
    /* hark.js keeps its own scroll handler; whenever it writes a different pill, the spy's choice is put back */
    new MutationObserver(function () {
      if (busy || !cur) return;
      var a = seg.querySelector('[aria-current="true"]');
      if (a !== map[cur]) paint();
    }).observe(seg, { subtree: true, attributes: true, attributeFilter: ["aria-current"] });
    spy = { force: function (id) { if (id && map[id]) { cur = null; set(id); } } };
  });

  /* =====================================================================
     B3. Landing: after a palette or chat jump the hash names the section, focus moves to the card,
     and a ring fades over 2s (CSS animation; nothing re-renders)
     ===================================================================== */
  window.XMo = window.XMo || {};
  window.XMo.land = function (el) {
    if (!el || !el.classList) return;
    var sec = el.closest && el.closest("section.section[id]");
    if (sec && !/^#\/./.test(location.hash) && window.history && history.replaceState) {
      try { history.replaceState(history.state, "", "#" + sec.id); } catch (e) {}
    }
    if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName) && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    try { el.focus({ preventScroll: true }); } catch (e) {}
    el.classList.remove("x-mo-land"); void el.offsetWidth; el.classList.add("x-mo-land");
    var done = function () { el.classList.remove("x-mo-land"); el.removeEventListener("animationend", done); };
    el.addEventListener("animationend", done);
    if (reduce) setTimeout(done, 2000);
    if (spy && sec) spy.force(sec.id);
  };

  /* =====================================================================
     A. Kids' corner read-aloud with speechSynthesis
     ===================================================================== */
  safe(function () {
    var ss = window.speechSynthesis, ok = !!(ss && window.SpeechSynthesisUtterance);
    var KEY = "asiArchive.say.v1", pref = {};
    try { pref = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { pref = {}; }
    var save = function () { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) {} };
    var rate = +pref.rate || 1, pitch = +pref.pitch || 1, voices = [], voice = null;
    var tok = 0, keep = 0, all = false, curFlip = null, bar = null;
    var android = /Android/i.test(navigator.userAgent || "");
    var WAVE = '<span class="x-wave" aria-hidden="true"><i></i><i></i><i></i></span>';

    var rank = function (v) { var l = (v.lang || "").replace("_", "-").toLowerCase(); return l === "en-in" ? 0 : l === "en-gb" ? 1 : l === "en-us" ? 2 : 3; };
    var loadVoices = function () {
      if (!ok) return;
      var list = (ss.getVoices() || []).filter(function (v) { return /^en([-_]|$)/i.test(v.lang || ""); });
      list.sort(function (a, b) { return rank(a) - rank(b) || (b.localService === true) - (a.localService === true) || String(a.name).localeCompare(String(b.name)); });
      voices = list;
      voice = list.filter(function (v) { return v.voiceURI === pref.voice; })[0] || list[0] || null;
      fillVoices();
    };
    var fillVoices = function () {
      var sel = bar && bar.querySelector("[data-say-voice]"); if (!sel) return;
      sel.innerHTML = voices.length ? voices.map(function (v, i) { return '<option value="' + i + '"' + (v === voice ? " selected" : "") + ">" + String(v.name).replace(/[<&]/g, "") + " (" + v.lang + ")</option>"; }).join("") : '<option value="">Default voice</option>';
    };

    var textOf = function (flip) {
      var b = flip.querySelector(".x-ln__back b"), s = flip.querySelector(".x-ln__back > span");
      return ((b ? b.textContent : "") + ". " + (s ? s.textContent : "")).trim();
    };
    var paint = function (flip) {
      curFlip = flip || null;
      doc.querySelectorAll(".x-ln__flip.is-reading").forEach(function (f) { f.classList.remove("is-reading"); });
      doc.querySelectorAll(".x-ln__say.is-speaking").forEach(function (b) {
        b.classList.remove("is-speaking"); b.setAttribute("aria-pressed", "false");
        var l = b.querySelector(".x-say__lbl"); if (l) l.textContent = "Listen";
      });
      if (flip) {
        flip.classList.add("is-reading");
        var b = flip.querySelector(".x-ln__say");
        if (b) { b.classList.add("is-speaking"); b.setAttribute("aria-pressed", "true"); var l = b.querySelector(".x-say__lbl"); if (l) l.textContent = "Stop"; }
      }
      if (bar) {
        var ra = bar.querySelector("[data-say-all]"); ra.setAttribute("aria-pressed", String(all));
        bar.querySelector("[data-say-stop]").disabled = !flip;
      }
    };
    var stop = function () { tok++; all = false; clearInterval(keep); if (ok) ss.cancel(); paint(null); };
    var speak = function (flip, after) {
      if (!ok) return;
      var my = ++tok;
      ss.cancel();
      var u = new SpeechSynthesisUtterance(textOf(flip));
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-GB";
      u.rate = 0.95 * rate; u.pitch = pitch;
      var end = function () { if (my !== tok) return; clearInterval(keep); paint(null); if (after) after(); };
      u.onend = end;
      u.onerror = function (e) { if (my !== tok) return; if (e && (e.error === "interrupted" || e.error === "canceled")) return; end(); };
      paint(flip);
      /* Chrome drops an utterance spoken in the same tick as cancel(); a short gap avoids it */
      setTimeout(function () {
        if (my !== tok) return;
        ss.speak(u);
        if (ss.paused) ss.resume();
      }, 80);
      /* Chrome stops long utterances after ~15s; a pause/resume nudge keeps them going (not on Android, where pause ends speech) */
      clearInterval(keep);
      if (!android) keep = setInterval(function () { if (my !== tok || !ss.speaking) return; ss.pause(); ss.resume(); }, 10000);
    };
    var flipOpen = function (flip) {
      var c = flip.querySelector(".x-ln__card");
      if (c && c.getAttribute("aria-expanded") !== "true") { c.setAttribute("aria-expanded", "true"); flip.classList.add("is-flipped"); }
    };
    var readAll = function (box) {
      var cards = [].slice.call(box.querySelectorAll(".x-ln__flip")), i = 0;
      all = true;
      var next = function () {
        if (!all || i >= cards.length) { all = false; paint(null); return; }
        var f = cards[i++]; flipOpen(f); speak(f, next);
      };
      next();
    };

    var mount = function () {
      var box = doc.querySelector(".x-ln__kids");
      if (!box || box.__xsay) return;
      box.__xsay = true;
      var btns = box.querySelectorAll(".x-ln__say");
      if (!ok) {
        btns.forEach(function (b) { b.hidden = true; b.style.display = "none"; });
        box.insertAdjacentHTML("beforebegin", '<p class="x-say__note">Read-aloud is not available in this browser, so the 🔊 buttons are hidden. The cards still flip.</p>');
        return;
      }
      btns.forEach(function (b) {
        b.classList.add("x-mo-say"); b.setAttribute("aria-pressed", "false");
        b.innerHTML = WAVE + '<span class="x-say__lbl">Listen</span>';
      });
      box.insertAdjacentHTML("beforebegin",
        '<div class="x-say" role="group" aria-label="Read aloud">' +
          '<button type="button" class="x-say__b" data-say-all aria-pressed="false">' + WAVE + "Read all</button>" +
          '<button type="button" class="x-say__b" data-say-stop disabled>■ Stop</button>' +
          '<label>Voice <select data-say-voice aria-label="Voice"></select></label>' +
          '<label>Speed <select data-say-rate aria-label="Speed">' + [0.75, 1, 1.25].map(function (r) { return '<option value="' + r + '"' + (r === rate ? " selected" : "") + ">" + r + "×</option>"; }).join("") + "</select></label>" +
          '<label>Pitch <input type="range" data-say-pitch min="0.6" max="1.6" step="0.1" value="' + pitch + '" aria-label="Pitch" /></label>' +
        "</div>");
      bar = box.previousElementSibling;
      fillVoices();
      bar.addEventListener("click", function (e) {
        if (e.target.closest("[data-say-all]")) { if (all) stop(); else readAll(box); }
        else if (e.target.closest("[data-say-stop]")) stop();
      });
      bar.addEventListener("change", function (e) {
        var t = e.target;
        if (t.matches("[data-say-voice]")) { voice = voices[+t.value] || voice; pref.voice = voice && voice.voiceURI; save(); }
        else if (t.matches("[data-say-rate]")) { rate = +t.value || 1; pref.rate = rate; save(); }
        else if (t.matches("[data-say-pitch]")) { pitch = +t.value || 1; pref.pitch = pitch; save(); }
      });
    };

    /* the 🔊 buttons: handled here (capture), so learn.js's one-shot speak never runs */
    doc.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".x-ln__say");
      if (b) {
        e.stopPropagation(); e.preventDefault();
        if (!ok) return;
        var f = b.closest(".x-ln__flip");
        if (curFlip === f && !all) { stop(); return; }
        all = false; speak(f);
        return;
      }
      /* leaving the Kids' corner tab stops the voice */
      var t = e.target.closest && e.target.closest(".x-ln__tab");
      if (t && t.getAttribute("data-ln") !== "kids" && curFlip) stop();
    }, true);
    doc.addEventListener("visibilitychange", function () { if (doc.hidden && curFlip && ok) { /* speech keeps its place; nothing to do */ } });
    window.addEventListener("pagehide", function () { if (ok) ss.cancel(); });

    if (ok) {
      loadVoices();
      if (ss.addEventListener) ss.addEventListener("voiceschanged", loadVoices); else ss.onvoiceschanged = loadVoices;
    }
    mount();
    if (!doc.querySelector(".x-ln__kids") || !doc.querySelector(".x-say, .x-say__note")) {
      var learn = doc.getElementById("learn");
      if (learn) new MutationObserver(function () { mount(); }).observe(learn, { childList: true, subtree: true });
    }
  });

  /* =====================================================================
     B4. History: chapter numbers and shapes (colour is never the only cue), the selected chapter's
     range on the dot strip, and the strip's first-view draw
     ===================================================================== */
  safe(function () {
    var host = doc.getElementById("historyApp"); if (!host) return;
    var chOf = function (el) { var m = /x-ch-(\d)/.exec(el.getAttribute("style") || ""); return m ? +m[1] : -1; };
    var mark = function (n) { return '<span class="x-mo-chn" data-s="' + n + '" style="--c:var(--x-ch-' + n + ')" aria-hidden="true"><i>' + (n + 1) + "</i></span>"; };
    host.querySelectorAll(".x-hi__tab").forEach(function (t) {
      var n = chOf(t), b = t.querySelector("b");
      if (n >= 0 && b && !t.querySelector(".x-mo-chn")) b.insertAdjacentHTML("afterbegin", mark(n));
    });
    host.querySelectorAll(".x-hi__key").forEach(function (k) {
      var n = chOf(k); if (n >= 0 && !k.querySelector(".x-mo-chn")) k.insertAdjacentHTML("afterbegin", mark(n));
    });
    var dots = [].slice.call(host.querySelectorAll(".x-hi__dot"));
    dots.forEach(function (d, i) { var n = chOf(d); if (n >= 0) d.setAttribute("data-s", n); d.style.setProperty("--di", Math.min(i, 120)); });
    var axis = host.querySelector(".x-hi__axis");
    if (axis) {
      var rg = doc.createElement("div"); rg.className = "x-mo-range"; rg.setAttribute("aria-hidden", "true");
      axis.insertBefore(rg, axis.firstChild);
      var upd = function () {
        var t = host.querySelector('.x-hi__tab[aria-selected="true"]'), n = t ? chOf(t) : -1;
        var lo = Infinity, hi = -Infinity;
        dots.forEach(function (d) {
          var on = n >= 0 && +d.getAttribute("data-s") === n;
          d.classList.toggle("is-sel", on);
          if (on) { var x = parseFloat(d.style.left) || 0; lo = Math.min(lo, x); hi = Math.max(hi, x); }
        });
        if (lo === Infinity) { rg.style.opacity = "0"; return; }
        rg.style.opacity = "1"; rg.style.left = lo - 4 + "px"; rg.style.width = hi - lo + 52 + "px";
        rg.style.setProperty("--c", "var(--x-ch-" + n + ")");
      };
      upd();
      var tabs = host.querySelector(".x-hi__tabs");
      if (tabs) new MutationObserver(upd).observe(tabs, { subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
    }
    var map = host.querySelector(".x-hi__map");
    if (map && !reduce && hasIO) {
      map.classList.add("x-mo-draw");
      once(map, function () { map.classList.add("is-drawn"); });
    }
  });

  /* =====================================================================
     C. Phones: the window's ⋯ menu, the person page's chip bar and collapsible fact file
     ===================================================================== */
  safe(function () {
    var MORE = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>';
    var fix = function () {
      doc.querySelectorAll(".x-pop__tools").forEach(function (t) {
        if (t.querySelector(".x-mo-more")) return;
        var b = doc.createElement("button");
        b.type = "button"; b.className = "x-pop__i x-mo-more"; b.setAttribute("aria-label", "More window controls"); b.setAttribute("aria-expanded", "false"); b.title = "More";
        b.innerHTML = MORE;
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var on = !t.classList.contains("is-more-open");
          t.classList.toggle("is-more-open", on); b.setAttribute("aria-expanded", String(on));
        });
        var close = t.querySelector('[data-p="close"]');
        t.insertBefore(b, close || null);
      });
      var toc = doc.getElementById("pvToc");
      if (toc) {
        var body = doc.querySelector(".x-pv__body"), side = doc.querySelector(".x-pv__side");
        if (phoneMq.matches && body && toc.parentNode !== body) { body.insertBefore(toc, body.firstChild); toc.classList.add("x-mo-chipbar"); }
        else if (!phoneMq.matches && side && toc.parentNode !== side) { side.appendChild(toc); toc.classList.remove("x-mo-chipbar"); }
      }
      doc.querySelectorAll(".x-ff > .x-pv__h").forEach(function (h) {
        if (h.__xff) return; h.__xff = true;
        var ff = h.parentNode;
        var sync = function () {
          if (phoneMq.matches) { h.setAttribute("role", "button"); h.tabIndex = 0; h.setAttribute("aria-expanded", String(!ff.classList.contains("is-shut"))); }
          else { h.removeAttribute("role"); h.removeAttribute("tabindex"); h.removeAttribute("aria-expanded"); ff.classList.remove("is-shut"); }
        };
        var tog = function () { if (!phoneMq.matches) return; ff.classList.toggle("is-shut"); sync(); };
        h.addEventListener("click", tog);
        h.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tog(); } });
        sync();
      });
    };
    fix();
    var q = 0;
    new MutationObserver(function () { if (!q) q = requestAnimationFrame(function () { q = 0; fix(); }); }).observe(doc.body, { childList: true, subtree: true });
    if (phoneMq.addEventListener) phoneMq.addEventListener("change", function () { doc.querySelectorAll(".x-ff > .x-pv__h").forEach(function (h) { h.__xff = false; }); fix(); });
  });

  /* =====================================================================
     D. Motion. Everything below is skipped under prefers-reduced-motion.
     ===================================================================== */
  if (reduce) return;

  /* icon micro-interactions: a small bounce on press */
  doc.addEventListener("pointerdown", function (e) {
    var b = e.target.closest && e.target.closest(".x-ap__b, .x-pop__i, .theme-btn, .x-strip__btn, .x-say__b, .nav button");
    if (!b) return;
    b.classList.remove("x-mo-bounce"); void b.offsetWidth; b.classList.add("x-mo-bounce");
    b.addEventListener("animationend", function h() { b.classList.remove("x-mo-bounce"); b.removeEventListener("animationend", h); });
  }, { passive: true });

  /* hero: title words reveal with a stagger, image parallax, and a drifting node network */
  safe(function () {
    var hero = doc.querySelector(".hero"); if (!hero) return;
    var h1 = hero.querySelector("h1");
    if (h1 && !h1.querySelector(".x-w") && h1.children.length === 0) {
      var words = h1.textContent.trim().split(/\s+/);
      h1.setAttribute("aria-label", h1.textContent.trim());
      h1.innerHTML = words.map(function (w, i) { return '<span class="x-w" aria-hidden="true" style="--w:' + i + '">' + w.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</span>"; }).join(" ");
      requestAnimationFrame(function () { requestAnimationFrame(function () { h1.classList.add("is-words-in"); }); });
    }

    var img = hero.querySelector(".hero__img");
    var heroOn = true;
    if (img) {
      img.style.transform = "translate3d(0,0,0) scale(1.08)";
      var pt = 0;
      var par = function () {
        pt = 0; if (!heroOn) return;
        var r = hero.getBoundingClientRect(); if (r.bottom < 0) return;
        img.style.transform = "translate3d(0," + Math.max(0, -r.top * 0.18).toFixed(1) + "px,0) scale(1.08)";
      };
      window.addEventListener("scroll", function () { if (!pt) pt = requestAnimationFrame(par); }, { passive: true });
    }

    /* node network: ~60 nodes (25 on phones), at most 30fps, paused off-screen or in a hidden tab */
    var cv = doc.createElement("canvas"); cv.className = "x-net"; cv.setAttribute("aria-hidden", "true");
    if (img && img.nextSibling) hero.insertBefore(cv, img.nextSibling); else hero.insertBefore(cv, hero.firstChild);
    var ctx = cv.getContext && cv.getContext("2d"); if (!ctx) return;
    var N = phoneMq.matches ? 25 : 60, nodes = [], W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var COLS = ["245,158,11", "6,182,212", "244,63,94"];
    var size = function () {
      var r = hero.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    /* a fixed seed keeps the starting layout the same on every visit */
    var seed = 7; var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (var i = 0; i < N; i++) nodes.push({ x: rnd() * W, y: rnd() * H, vx: (rnd() - 0.5) * 0.35, vy: (rnd() - 0.5) * 0.35, c: COLS[i % 3], r: 1.2 + rnd() * 1.6 });
    var mx = -1e4, my = -1e4;
    hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive: true });
    hero.addEventListener("pointerleave", function () { mx = my = -1e4; });
    var LINK = phoneMq.matches ? 90 : 120, last = 0, raf = 0, visible = true;
    var frame = function (ts) {
      raf = 0;
      if (!visible || doc.hidden) return;
      raf = requestAnimationFrame(frame);
      if (ts - last < 33) return;
      last = ts;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < N; i++) {
        var a = nodes[i];
        var dx = a.x - mx, dy = a.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140 && d2 > 1) { var f = 0.6 / Math.sqrt(d2); a.vx += dx * f * 0.05; a.vy += dy * f * 0.05; }
        a.vx *= 0.985; a.vy *= 0.985;
        if (Math.abs(a.vx) < 0.05) a.vx += (a.vx < 0 ? -0.02 : 0.02);
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > W) { a.vx *= -1; a.x = Math.max(0, Math.min(W, a.x)); }
        if (a.y < 0 || a.y > H) { a.vy *= -1; a.y = Math.max(0, Math.min(H, a.y)); }
      }
      ctx.lineWidth = 0.8;
      for (i = 0; i < N; i++) {
        var p = nodes[i];
        for (var j = i + 1; j < N; j++) {
          var q = nodes[j], ex = p.x - q.x, ey = p.y - q.y, e2 = ex * ex + ey * ey;
          if (e2 < LINK * LINK) { ctx.strokeStyle = "rgba(" + p.c + "," + (0.35 * (1 - Math.sqrt(e2) / LINK)).toFixed(3) + ")"; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        }
        var cx = p.x - mx, cy = p.y - my, c2 = cx * cx + cy * cy;
        if (c2 < 160 * 160) { ctx.strokeStyle = "rgba(255,255,255," + (0.4 * (1 - Math.sqrt(c2) / 160)).toFixed(3) + ")"; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.stroke(); }
        ctx.fillStyle = "rgba(" + p.c + ",0.9)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    };
    var go = function () { if (!raf && visible && !doc.hidden) raf = requestAnimationFrame(frame); };
    if (hasIO) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; heroOn = visible; go(); }).observe(hero);
    doc.addEventListener("visibilitychange", go);
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(size, 150); }, { passive: true });
    go();
  });

  /* background grain and a cursor-follow glow (desktop only) */
  safe(function () {
    var g = doc.createElement("div"); g.className = "x-grain"; g.setAttribute("aria-hidden", "true"); doc.body.appendChild(g);
    if (!fine) return;
    var glow = doc.createElement("div"); glow.className = "x-glow"; glow.setAttribute("aria-hidden", "true"); doc.body.appendChild(glow);
    var x = 0, y = 0, raf = 0;
    doc.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY; glow.classList.add("is-on");
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; glow.style.transform = "translate3d(" + x + "px," + y + "px,0)"; });
    }, { passive: true });
    doc.addEventListener("pointerleave", function () { glow.classList.remove("is-on"); });
    /* the glare on tilted cards follows the pointer */
    var TILT = ".x-card, .x-pi, .x-pc, .x-vc, .x-prc__c";
    doc.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var c = e.target.closest && e.target.closest(TILT); if (!c) return;
      var r = c.getBoundingClientRect(); if (!r.width) return;
      c.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      c.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    }, { passive: true });
  });

  /* section dividers: a wave line between major sections, drawn once on first view */
  safe(function () {
    var secs = [].slice.call(doc.querySelectorAll("main.main > section.section[id]"));
    secs.slice(1).forEach(function (s, i) {
      var id = "xWaveG" + i;
      var svg = '<svg class="x-wave-div" viewBox="0 0 1200 28" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
        '<defs><linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#f59e0b"/><stop offset=".55" stop-color="#06b6d4"/><stop offset="1" stop-color="#f43f5e"/></linearGradient></defs>' +
        '<path pathLength="1" stroke="url(#' + id + ')" d="M0 14 C 150 0, 300 28, 450 14 S 750 0, 900 14 S 1100 26, 1200 14"/></svg>';
      s.insertAdjacentHTML("beforebegin", svg);
      var el = s.previousElementSibling;
      once(el, function () { el.classList.add("is-in"); }, "0px 0px -15% 0px");
    });
  });

  /* Learn tabs: a sliding indicator under the selected tab */
  safe(function () {
    var row = doc.querySelector(".x-ln__tabs"); if (!row) return;
    var ind = doc.createElement("span"); ind.className = "x-mo-lnind"; ind.setAttribute("aria-hidden", "true"); row.appendChild(ind);
    var place = function () {
      var t = row.querySelector('.x-ln__tab[aria-selected="true"]');
      if (!t || !t.offsetWidth) { ind.style.opacity = "0"; return; }
      ind.style.opacity = "1";
      ind.style.transform = "translateX(" + t.offsetLeft + "px) scaleX(" + t.offsetWidth + ")";
    };
    place();
    new MutationObserver(place).observe(row, { subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
    window.addEventListener("resize", place, { passive: true });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(place);
    once(row, place);
  });

  /* GSAP (deferred from the CDN): a gentle scrubbed drift on the section heads' underline, if it loaded.
     Without it, everything above still works. */
  window.addEventListener("load", function () {
    safe(function () {
      if (!window.gsap || !window.ScrollTrigger) return;
      gsap.registerPlugin(ScrollTrigger);
      gsap.utils.toArray(".x-wave-div path").forEach(function (p) {
        gsap.fromTo(p, { attr: { "stroke-width": 1 } }, { attr: { "stroke-width": 2.2 }, ease: "none", scrollTrigger: { trigger: p.ownerSVGElement, start: "top 90%", end: "top 40%", scrub: true } });
      });
    });
  });
})();
