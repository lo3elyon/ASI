/* fixes7.js: the nav's Ask link (batch 24 removed the Customize gear), the floating Ask
   panel's "Open full page" link closing the panel, and window.XAudit with askPageMounted, heroFits, badgeCounts
   and pressedPillContrast. Static: runs at load and when the nav changes, never on a timer. */
(function () {
  "use strict";
  var doc = document;

  /* ---------- 1. Nav: Ask (a visible link, not only in More) and the Customize gear next to the theme toggle ---------- */
  var busy = false;
  var ensureNav = function () {
    var nav = doc.querySelector("header.nav"); if (!nav || busy) return;
    busy = true;
    try {
      var theme = nav.querySelector(".theme-btn");
      var ask = nav.querySelector(".x-nav-ask");
      if (!ask) {
        ask = doc.createElement("a"); ask.className = "x-more__btn x-nav-ask"; ask.href = "#/ask"; ask.textContent = "Ask";
        ask.setAttribute("aria-label", "Ask the Archive");
      }
      var before = nav.querySelector(".x-more") || nav.querySelector(".x-search-btn") || theme;
      if (before && ask.nextElementSibling !== before) nav.insertBefore(ask, before);
      else if (!before && ask.parentNode !== nav) nav.appendChild(ask);
      if (location.hash === "#/ask") ask.setAttribute("aria-current", "page"); else ask.removeAttribute("aria-current");
      /* batch 24: no Customize gear in the nav any more (Customise lives in the footer, the More menu and Ctrl/⌘K).
         The old childList MutationObserver that kept re-inserting the gear before the theme button is gone too. */
    } finally { busy = false; }
  };
  var boot = function () { ensureNav(); };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
  window.addEventListener("load", ensureNav);
  window.addEventListener("hashchange", ensureNav);

  /* ---------- 2. The floating panel's "Open full page": go there and fold the panel away ---------- */
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("#askFull"); if (!a) return;
    var q = doc.getElementById("askQ"), v = q && q.value.trim();
    if (v) a.setAttribute("data-ask-seed", v); else a.removeAttribute("data-ask-seed");
    setTimeout(function () { var h = doc.getElementById("askHide"), p = doc.getElementById("askPanel"); if (h && p && !p.hidden) h.click(); }, 0);
  }, true);

  /* ---------- 3. XAudit ---------- */
  var rgb = function (s) {
    var m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?/.exec(s || "");
    if (!m) return null;
    var a = m[4] == null ? 1 : /%$/.test(m[4]) ? parseFloat(m[4]) / 100 : +m[4];
    return [+m[1], +m[2], +m[3], a];
  };
  var lum = function (c) {
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  var ratio = function (a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  var askPageMounted = function () {
    var el = doc.getElementById("x-ask-page");
    var r = { onAskPage: location.hash === "#/ask", mounted: false };
    if (!el) return r;
    var has = function (s) { return !!el.querySelector(s); };
    r.parts = {
      filters: has(".x-askp__opts"), answerStyle: has('select[data-f="style"]'), chatList: has(".x-askp__chats"),
      newChat: has('[data-a="new"]'), smartButton: has('[data-a="smart"], .x-askp__on, .x-askp__note'),
      sizeNotice: has(".x-askp__size, .x-askp__note"), questionBox: has(".x-askp__form textarea")
    };
    r.mounted = Object.keys(r.parts).every(function (k) { return r.parts[k]; });
    r.navLink = !!doc.querySelector("header.nav .x-nav-ask");
    r.panelFullLink = !!doc.getElementById("askFull");
    return r;
  };

  var heroFits = function () {
    var hero = doc.querySelector(".hero.x-hero-start"), c = hero && hero.querySelector(".x-start");
    if (!hero || !c) return null;
    var h = hero.getBoundingClientRect(), r = c.getBoundingClientRect(), cs = getComputedStyle(hero), list = c.querySelector(".x-qs");
    var issues = [];
    if (r.left < h.left - 0.5 || r.right > h.right + 0.5) issues.push("card passes the hero's side");
    if (r.top < h.top - 0.5 || h.bottom - r.bottom < 31.5) issues.push("card is closer than 32px to the hero's bottom (" + Math.round(h.bottom - r.bottom) + "px)");
    if (parseFloat(cs.paddingBottom) < 32) issues.push("hero padding-bottom " + cs.paddingBottom);
    if (cs.height !== "auto" && hero.style.height) issues.push("hero has a fixed height");
    var tooWide = [].filter.call(c.querySelectorAll("*"), function (el) { return el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible"; });
    if (tooWide.length) issues.push(tooWide.length + " clipped element(s) inside the card");
    if (list) {
      var lr = list.getBoundingClientRect();
      if (lr.right > r.right + 0.5) issues.push("quick links pass the card's right edge");
      if (getComputedStyle(list).listStyleType !== "none") issues.push("list bullets showing");
      list.querySelectorAll(".x-qs__tx").forEach(function (t) {
        var b = t.querySelector("b"), s = t.querySelector("small"); if (!b || !s) return;
        var br = b.getBoundingClientRect(), sr = s.getBoundingClientRect();
        if (sr.top < br.bottom - 1) issues.push("“" + b.textContent.trim() + "”: name and count share a line");
        if (sr.right > r.right + 0.5 || br.right > r.right + 0.5) issues.push("“" + b.textContent.trim() + "” passes the card");
      });
    }
    return {
      viewport: innerWidth + "×" + innerHeight, hero: Math.round(h.width) + "×" + Math.round(h.height),
      card: Math.round(r.width) + "×" + Math.round(r.height), gapBelowCard: Math.round(h.bottom - r.bottom),
      fits: !issues.length, issues: issues
    };
  };

  var badgeCounts = function () {
    var out = { total: 0, filled: 0, empty: 0 };
    doc.querySelectorAll("span.x-dur").forEach(function (b) { out.total++; if (b.textContent.trim()) out.filled++; else out.empty++; });
    out.continueWatching = { row: !!doc.querySelector(".x-cw:not([hidden]) .x-cw__row"), historyPill: !!doc.querySelector(".x-cw:not([hidden]) [data-cw='open']"),
      cards: doc.querySelectorAll(".x-cw__card").length, cardsWithBadge: doc.querySelectorAll(".x-cw__card .x-cw__th span.x-dur").length };
    if (window.XDur && XDur.audit) { try { var a = XDur.audit(); out.thumbsWithoutBadge = a && a.total ? a.total.missing : null; } catch (e) {} }
    return out;
  };

  var pressedPillContrast = function () {
    var pills = [].slice.call(doc.querySelectorAll('.x-apx-menu .x-ap__b[aria-pressed="true"]:not(.x-pn-sw):not(.x-pn-pick), .x-apx-menu .x-ap__b.is-on:not(.x-pn-sw):not(.x-pn-pick)'));
    var rows = pills.map(function (b) {
      var s = getComputedStyle(b), fg = rgb(s.color), bg = rgb(s.backgroundColor);
      var r = fg && bg && bg[3] > 0.5 ? ratio(fg, bg) : 0;
      return { label: b.textContent.trim().slice(0, 24) || b.getAttribute("aria-label") || "", color: s.color, background: s.backgroundColor, weight: s.fontWeight, ratio: Math.round(r * 100) / 100 };
    });
    var min = rows.reduce(function (m, x) { return Math.min(m, x.ratio); }, rows.length ? Infinity : 0);
    return { theme: doc.documentElement.getAttribute("data-theme") || "system", count: rows.length, minRatio: rows.length ? Math.round(min * 100) / 100 : null, ok: !rows.length || min >= 4.5, pills: rows };
  };

  window.XAudit = function () {
    var de = doc.documentElement, r = {};
    r.askPageMounted = askPageMounted();
    r.heroFits = heroFits();
    r.badgeCounts = badgeCounts();
    r.pressedPillContrast = pressedPillContrast();
    r.horizontalOverflow = Math.max(0, de.scrollWidth - de.clientWidth);
    return r;
  };
})();
