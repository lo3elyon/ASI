/* srcprev.js: Batch 5. A preview card on every external source link (not YouTube, not the footer credits).
   Desktop: hover for 250 ms, or keyboard focus, shows a card anchored to the link (flips above or below, max 380px);
   it stays open while the pointer is over it, and Esc closes it. Touch: the first tap opens the same card as a
   bottom sheet instead of leaving; "Open source ↗" in it leaves. Previews come from source_previews.json by a
   normalised URL; a URL it lacks gets a card built from the archive's own text that cites it ("From this archive").
   Nothing moves under the cursor: the card floats in the top layer and the link itself never changes size. */
(function () {
  "use strict";
  var doc = document;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var cut = function (s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
  var read = function (id) { try { return (window.Hark && Hark.data(id)) || null; } catch (e) { return null; } };
  var YT = /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i;
  var CAN_POP = typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;

  /* ---------- URL keys: no scheme, no www., no #fragment, no utm_*, no trailing slash ---------- */
  var norm = function (u) {
    var x; try { x = new URL(String(u || "").trim(), location.href); } catch (e) { return String(u || "").toLowerCase(); }
    var ps = []; x.searchParams.forEach(function (v, k) { if (!/^(utm_|fbclid$|gclid$)/i.test(k)) ps.push(k + "=" + v); });
    return (x.hostname.replace(/^www\./i, "") + x.pathname.replace(/\/+$/, "") + (ps.length ? "?" + ps.join("&") : "")).toLowerCase();
  };
  var hostOf = function (u) { try { return new URL(u).hostname.replace(/^www\./i, ""); } catch (e) { return ""; } };
  var isExt = function (a) {
    if (!a || a.tagName !== "A") return false;
    var h = a.getAttribute("href") || "";
    if (!/^https?:\/\//i.test(h) || a.closest(".foot, .badge, .x-sp")) return false;
    return !YT.test(hostOf(h));
  };

  /* ---------- data, built on first use ---------- */
  var PREV = null, CTX = null, DOM = null;
  var prev = function () {
    if (PREV) return PREV;
    PREV = {}; var d = read("d-srcprev") || {};
    Object.keys(d).forEach(function (k) { PREV[norm(k)] = d[k]; });
    return PREV;
  };
  var ctx = function () {
    if (CTX) return CTX;
    CTX = {};
    var add = function (u, o) { if (!u || typeof u !== "string") return; var k = norm(u); (CTX[k] = CTX[k] || []).push(o); };
    [read("d-early"), read("d-dl"), read("d-post")].forEach(function (list) {
      (list || []).forEach(function (r) {
        var pr = r.prediction && (typeof r.prediction === "string" ? r.prediction : r.prediction.text);
        var o = { k: "Archive entry", w: r.date ? String(r.date).slice(0, 4) : r.year, t: r.title, by: r.person, s: r.summary, q: r.quote, p: pr };
        [r.source_url, r.alt_source_url, r.quote_source_url].concat(r.additional_sources || []).forEach(function (u) { add(typeof u === "string" ? u : u && u.url, o); });
      });
    });
    (read("d-preds") || []).forEach(function (p) {
      var o = { k: "Prediction", w: p.year_made, t: p.who, s: p.evidence, p: p.prediction };
      [p.prediction_source_url, p.evidence_source_url, p.latest_development_source_url].forEach(function (u) { add(u, o); });
    });
    ((read("d-history") || {}).chapters || []).forEach(function (c) {
      (c.milestones || []).forEach(function (m) { add(m.source_url, { k: "History milestone", w: m.year, t: m.title, s: m.what, q: m.quote }); });
    });
    (read("d-people") || []).forEach(function (p) {
      var o = { k: "Person", t: p.name, s: [p.role, p.stance].filter(Boolean).join(" · ") };
      add(p.wiki, o);
      Object.keys(p.links || {}).forEach(function (k) { add(p.links[k], o); });
      (p.quotes || []).forEach(function (q) { add(q.url, { k: "Quote", w: q.year, t: p.name, s: q.source, q: q.text }); });
    });
    return CTX;
  };
  /* domain → organisation name in logos.json, for the favicon */
  var orgFor = function (host) {
    if (!DOM) { DOM = {}; var o = (read("d-logos") || {}).orgs || {}; Object.keys(o).forEach(function (k) { var d = String(o[k].domain || "").replace(/^www\./, ""); if (d && !DOM[d]) DOM[d] = k; }); }
    var parts = host.split(".");
    for (var i = 0; i < parts.length - 1; i++) { var d = parts.slice(i).join("."); if (DOM[d] && window.XLogo) { var lg = XLogo.forName(DOM[d]); if (lg) return lg; } }
    return null;
  };
  /* last resort: what the page around the link says */
  var fromPage = function (a) {
    var box = a.closest("article, .x-card, .x-pi, .x-hi__card, li, .x-pv__block, section, .x-msg-b") || a.parentNode;
    var h = box && box.querySelector("h1, h2, h3, h4, b, strong");
    var p = box && box.querySelector("p:not(.x-links):not(.fineprint), blockquote");
    var m = /^#\/person\/([^/?#]+)/.exec(location.hash), who = null;
    if (m) (read("d-people") || []).some(function (x) { if (x.id === m[1]) { who = x; return true; } return false; });
    return {
      k: who ? "Person" : "Cited here", t: (h && h.textContent.trim()) || (who && who.name) || a.textContent.trim(),
      s: (p && p.textContent.trim()) || (who ? [who.role, who.stance].filter(Boolean).join(" · ") : ""), l: a.textContent.trim()
    };
  };

  /* ---------- the card's content ---------- */
  var build = function (a, sheet) {
    var url = a.href, host = hostOf(url), key = norm(url), d = prev()[key];
    var has = d && (d.t || d.s || (d.p && d.p.length));
    var lg = orgFor(host), site = (d && d.site) || (lg && lg.name) || host;
    var ico = lg && window.XLogo ? XLogo.tile(lg, 28, "x-sp__logo") : '<span class="x-sp__letter" aria-hidden="true">' + esc((site.replace(/^[^A-Za-z0-9]+/, "")[0] || "?").toUpperCase()) + "</span>";
    var h = '<div class="x-sp__head">' + ico + '<span class="x-sp__site"><b>' + esc(site) + "</b><small>" + esc(host) + "</small></span>" +
      (sheet ? '<button type="button" class="x-sp__x" data-sp-close aria-label="Close preview">✕</button>' : "") + "</div>";
    if (has) {
      h += (d.t ? '<p class="x-sp__t">' + esc(cut(d.t, 160)) + "</p>" : "") + (d.s ? '<p class="x-sp__s">' + esc(cut(d.s, 320)) + "</p>" : "");
      var pts = (d.p || []).filter(Boolean).slice(0, 4);
      if (pts.length) h += '<p class="x-sp__lab">Key points</p><ul class="x-sp__pts">' + pts.map(function (x) { return "<li>" + esc(cut(x, 170)) + "</li>"; }).join("") + "</ul>";
    } else {
      var list = (ctx()[key] || []).filter(function (o, i, arr) { return arr.indexOf(o) === i; }).slice(0, 3);
      if (!list.length) list = [fromPage(a)];
      h += '<p class="x-sp__from">From this archive</p><ul class="x-sp__ctx">' + list.map(function (o) {
        return "<li><span class=\"x-sp__k\">" + esc(o.k + (o.w ? " · " + o.w : "")) + "</span>" +
          '<p class="x-sp__t">' + esc(cut(o.t || o.l || host, 140)) + (o.by && o.by !== o.t ? " <small>" + esc(cut(o.by, 60)) + "</small>" : "") + "</p>" +
          (o.p ? '<p class="x-sp__s"><b>Prediction.</b> ' + esc(cut(o.p, 200)) + "</p>" : "") +
          (o.s ? '<p class="x-sp__s">' + esc(cut(o.s, list.length > 1 ? 160 : 280)) + "</p>" : "") +
          (o.q ? '<blockquote class="x-sp__q">“' + esc(cut(o.q, 180)) + "”</blockquote>" : "") + "</li>";
      }).join("") + "</ul>";
    }
    h += '<div class="x-sp__acts"><a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener">Open source ↗</a>' +
      '<button type="button" class="btn" data-sp-copy>Copy link</button><span class="x-sp__ok" role="status" aria-live="polite"></span></div>';
    return { html: h, label: "Source preview: " + ((has && d.t) || site) };
  };

  /* ---------- desktop card ---------- */
  var card = doc.createElement("div");
  card.className = "x-sp x-sp--card"; card.id = "xSp"; card.setAttribute("role", "dialog"); card.hidden = true;
  if (CAN_POP) card.setAttribute("popover", "manual");
  var hint = doc.createElement("span"); hint.id = "xSpHint"; hint.hidden = true; hint.textContent = "Preview on hover, focus or tap";
  doc.body.appendChild(hint); doc.body.appendChild(card);
  var cur = null, openT = 0, closeT = 0, px = -1, py = -1;

  var place = function () {
    if (!cur) return;
    var rs = cur.getClientRects(), r = rs[0];
    for (var i = 0; i < rs.length; i++) if (py >= rs[i].top && py <= rs[i].bottom) { r = rs[i]; break; }
    if (!r) return close();
    var vw = doc.documentElement.clientWidth, vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) return close();
    var below = vh - r.bottom - 16, above = r.top - 16, w = Math.min(380, vw - 16);
    card.style.width = w + "px";
    card.style.maxHeight = Math.max(160, Math.min(520, Math.max(below, above))) + "px";
    var hgt = card.offsetHeight, top = hgt <= below || below >= above ? r.bottom + 8 : r.top - 8 - hgt;
    card.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + "px";
    card.style.top = Math.max(8, top) + "px";
    card.classList.toggle("is-above", top < r.top);
  };
  var show = function (a) {
    clearTimeout(openT); clearTimeout(closeT);
    if (!a.isConnected) return;
    var b = build(a, false);
    cur = a; card.innerHTML = b.html; card.setAttribute("aria-label", b.label);
    card.hidden = false;
    if (CAN_POP && !card.matches(":popover-open")) { try { card.showPopover(); } catch (e) {} }
    a.setAttribute("aria-expanded", "true");
    place();
  };
  var close = function () {
    clearTimeout(openT); clearTimeout(closeT);
    if (cur) cur.setAttribute("aria-expanded", "false");
    cur = null;
    if (CAN_POP) { try { if (card.matches(":popover-open")) card.hidePopover(); } catch (e) {} }
    card.hidden = true;
  };
  var later = function (ms) { clearTimeout(closeT); closeT = setTimeout(close, ms); };

  var lastPtr = "", lastDown = 0;
  doc.addEventListener("pointerdown", function (ev) { lastPtr = ev.pointerType; lastDown = Date.now(); if (cur && !card.contains(ev.target) && !cur.contains(ev.target)) close(); }, true);
  doc.addEventListener("pointerover", function (ev) {
    if (ev.pointerType === "touch") return;
    if (card.contains(ev.target)) { clearTimeout(closeT); return; }
    var a = ev.target.closest && ev.target.closest("a");
    if (!isExt(a)) return;
    px = ev.clientX; py = ev.clientY;
    clearTimeout(closeT);
    if (a === cur) return;
    clearTimeout(openT);
    openT = setTimeout(function () { show(a); }, 250);
  });
  doc.addEventListener("pointerout", function (ev) {
    if (ev.pointerType === "touch") return;
    var to = ev.relatedTarget;
    var a = ev.target.closest && ev.target.closest("a");
    if (isExt(a) && !(to && a.contains(to))) clearTimeout(openT);
    if (!cur) return;
    if ((card.contains(ev.target) || ev.target === cur || cur.contains(ev.target)) && !(to && (card.contains(to) || cur.contains(to)))) {
      if (!card.contains(doc.activeElement)) later(180);
    }
  });
  doc.addEventListener("focusin", function (ev) {
    var t = ev.target;
    if (card.contains(t)) { clearTimeout(closeT); return; }
    if (isExt(t)) { if (Date.now() - lastDown > 600 && t !== cur) { py = -1; show(t); } return; }
    if (cur) close();
  });
  doc.addEventListener("focusout", function (ev) {
    if (!cur) return;
    var to = ev.relatedTarget;
    if (to && (to === cur || card.contains(to))) return;
    if (ev.target === cur || card.contains(ev.target)) later(120);
  });
  var focusables = function (box) { return Array.prototype.filter.call(box.querySelectorAll("a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])"), function (el) { return !el.hidden && el.offsetParent !== null; }); };
  doc.addEventListener("keydown", function (ev) {
    if (!cur) return;
    var t = ev.target;
    if (ev.key === "Escape") { var back = card.contains(t) ? cur : null; close(); if (back) back.focus({ preventScroll: true }); ev.stopPropagation(); return; }
    if (ev.key !== "Tab") return;
    var f = focusables(card);
    if (t === cur && !ev.shiftKey && f.length) { ev.preventDefault(); f[0].focus({ preventScroll: true }); return; }
    if (!card.contains(t)) return;
    if (ev.shiftKey && t === f[0]) { ev.preventDefault(); cur.focus({ preventScroll: true }); return; }
    if (!ev.shiftKey && t === f[f.length - 1]) {
      ev.preventDefault();
      var link = cur, all = focusables(doc.body).filter(function (el) { return !card.contains(el); }), i = all.indexOf(link);
      close();
      (all[i + 1] || link).focus({ preventScroll: false });
    }
  }, true);
  var raf = 0;
  var follow = function () { if (!cur) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
  window.addEventListener("scroll", function (ev) { if (cur && !card.contains(ev.target)) follow(); }, true);
  window.addEventListener("resize", follow);
  window.addEventListener("hashchange", function () { close(); if (sheet.open) sheet.close(); });

  /* ---------- touch: a bottom sheet ---------- */
  var sheet = doc.createElement("dialog");
  sheet.className = "x-sp x-sp--sheet";
  doc.body.appendChild(sheet);
  var sheetFor = function (a) {
    var b = build(a, true);
    sheet.innerHTML = b.html; sheet.setAttribute("aria-label", b.label);
    close();
    try { sheet.showModal(); } catch (e) { sheet.setAttribute("open", ""); }
    var x = sheet.querySelector("[data-sp-close]"); if (x) x.focus({ preventScroll: true });
  };
  sheet.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-sp-close]")) { sheet.close(); return; }
    if (ev.target === sheet) { var r = sheet.getBoundingClientRect(); if (ev.clientY < r.top || ev.clientX < r.left || ev.clientX > r.right) sheet.close(); }
  });

  doc.addEventListener("click", function (ev) {
    var cp = ev.target.closest && ev.target.closest("[data-sp-copy]");
    if (cp) { copy(cp); return; }
    var a = ev.target.closest && ev.target.closest("a");
    if (!isExt(a)) return;
    var pt = ev.pointerType || (Date.now() - lastDown < 800 ? lastPtr : "");
    if (pt === "touch") { ev.preventDefault(); ev.stopImmediatePropagation(); sheetFor(a); return; }
    close();
  }, true);

  /* ---------- copy link ---------- */
  var copy = function (btn) {
    var box = btn.closest(".x-sp"), a = box && box.querySelector(".x-sp__acts a"), ok = box && box.querySelector(".x-sp__ok");
    if (!a) return;
    var url = a.href;
    var done = function (good) {
      btn.textContent = good ? "Copied ✓" : "Copy failed";
      if (ok) ok.textContent = good ? "Link copied" : "";
      setTimeout(function () { btn.textContent = "Copy link"; if (ok) ok.textContent = ""; }, 1600);
    };
    var legacy = function () {
      var ta = doc.createElement("textarea"); ta.value = url; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
      box.appendChild(ta); ta.select(); var good = false; try { good = doc.execCommand("copy"); } catch (e) {} ta.remove(); done(good);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, legacy);
    else legacy();
  };

  /* ---------- the "ⓘ" affordance on every such link ---------- */
  var mark = function (a) {
    if (a.classList.contains("x-spl") || !isExt(a)) return;
    a.classList.add("x-spl");
    if (!a.hasAttribute("aria-describedby")) a.setAttribute("aria-describedby", "xSpHint");
  };
  var scan = function (r) {
    if (!r || r.nodeType !== 1) return;
    if (r.tagName === "A") mark(r);
    r.querySelectorAll('a[href^="http"]').forEach(mark);
  };
  scan(doc.body);
  if ("MutationObserver" in window) new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].type === "attributes") { var el = list[i].target; el.classList.remove("x-spl"); mark(el); continue; }
      var add = list[i].addedNodes;
      for (var j = 0; j < add.length; j++) if (add[j].nodeType === 1 && !card.contains(add[j]) && !sheet.contains(add[j])) scan(add[j]);
    }
  }).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });

  window.XSrcPrev = { norm: norm, show: show, close: close };
})();
