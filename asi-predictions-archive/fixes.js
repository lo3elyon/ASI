/* QA fixes: anchored jumps that land true, right-edge fade cues on scroll rows, and the phone sections menu.
   Nothing here runs on a repeating timer; it only reacts to clicks, scrolls, resizes and DOM changes. */
(function () {
  "use strict";
  var doc = document;
  var J = window.XJump || (window.XJump = { active: false, _f: [], onEnd: function (f) { this._f.push(f); } });
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. anchored jumps ----------
     While a jump scrolls, lazy lists it passes stay put (archive.js / theater.js check XJump.active),
     so the target cannot be pushed down mid-scroll. When the scroll settles, the target is lined up
     under the nav once more, without animation, in case anything above it changed height. */
  var target = null, settleT = 0, startY = 0;
  var marginOf = function (el) { return parseFloat(getComputedStyle(el).scrollMarginTop) || 0; };
  var finish = function () {
    settleT = 0;
    var el = target; target = null;
    J.active = false;
    if (el && el.isConnected && el.getClientRects().length) {
      var off = el.getBoundingClientRect().top - marginOf(el);
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var want = Math.max(0, Math.min(max, window.scrollY + off));
      if (Math.abs(want - window.scrollY) > 3) {
        try { window.scrollTo({ top: want, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, want); }
      }
    }
    (J._f || []).forEach(function (f) { try { f(); } catch (e) {} });
  };
  /* a jump ends once scrolling has been still briefly; a one-shot debounce, re-armed by each scroll event */
  var arm = function (ms) { clearTimeout(settleT); settleT = setTimeout(finish, ms); };
  var startJump = function (el) {
    target = el; J.active = true; startY = window.scrollY;
    arm(reduce ? 60 : 400);
  };
  window.addEventListener("scroll", function () { if (J.active) arm(140); }, { passive: true });
  if ("onscrollend" in window) window.addEventListener("scrollend", function () { if (J.active) { clearTimeout(settleT); finish(); } });
  /* the reader takes over: stop guarding at once */
  ["wheel", "touchstart", "keydown"].forEach(function (t) {
    window.addEventListener(t, function () { if (J.active && window.scrollY !== startY) { clearTimeout(settleT); target = null; finish(); } }, { passive: true });
  });

  var sectionTarget = function (href) {
    if (!href || href.charAt(0) !== "#" || href.length < 2 || href.charAt(1) === "/") return null;
    var el = null;
    try { el = doc.getElementById(decodeURIComponent(href.slice(1))); } catch (e) { el = null; }
    return el && el.closest("main.main") ? el : null;
  };
  doc.addEventListener("click", function (ev) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a) return;
    var el = sectionTarget(a.getAttribute("href"));
    if (el && !doc.querySelector("main.main[hidden]")) startJump(el);
  });

  /* ---------- 2. right-edge fade on horizontal scroll rows ---------- */
  var ROWS = ".x-tl, .x-hi__scroll, .x-hi__tabs, .x-hi__tags, .x-row, .x-tt__strip, .x-wh__tabs, .x-ln__tabs, .x-ff__chips, .x-cw__row, .x-hi__map .x-hi__scroll, .nav .seg";
  var paintFade = function (el) {
    var cs = getComputedStyle(el), scrolls = /auto|scroll/.test(cs.overflowX);
    var more = scrolls && el.scrollWidth - el.clientWidth - el.scrollLeft > 2;
    el.classList.toggle("x-fade-r", more);
  };
  var ro = "ResizeObserver" in window ? new ResizeObserver(function (en) { en.forEach(function (e) { paintFade(e.target); }); }) : null;
  var seen = typeof WeakSet === "function" ? new WeakSet() : null;
  var scan = function () {
    doc.querySelectorAll(ROWS).forEach(function (el) {
      if (seen && !seen.has(el)) { seen.add(el); if (ro) ro.observe(el); }
      paintFade(el);
    });
  };
  doc.addEventListener("scroll", function (ev) {
    var el = ev.target;
    if (el && el.nodeType === 1 && el.classList.contains && el.matches(ROWS)) paintFade(el);
  }, { capture: true, passive: true });
  window.addEventListener("resize", scan, { passive: true });
  window.addEventListener("load", scan);
  var scanQ = 0;
  if ("MutationObserver" in window) new MutationObserver(function () {
    if (scanQ) return;
    scanQ = requestAnimationFrame(function () { scanQ = 0; scan(); });
  }).observe(doc.body, { childList: true, subtree: true });
  scan();

  /* ---------- 3. phone: one Sections button instead of the nav pills ---------- */
  var nav = doc.querySelector("header.nav"), seg = nav && nav.querySelector(".seg");
  if (nav && seg && !nav.querySelector(".x-menu-btn")) {
    var links = [].slice.call(seg.querySelectorAll("a"));
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "x-menu-btn";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "x-sheet");
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Sections</span>';
    nav.insertBefore(btn, seg);

    var sheet = doc.createElement("div");
    sheet.id = "x-sheet";
    sheet.className = "x-sheet";
    sheet.hidden = true;
    sheet.innerHTML = '<nav aria-label="Sections"><ul>' + links.map(function (a) {
      return '<li><a href="' + a.getAttribute("href") + '">' + a.textContent.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</a></li>";
    }).join("") + "</ul></nav>";
    nav.parentNode.insertBefore(sheet, nav.nextSibling);
    var items = [].slice.call(sheet.querySelectorAll("a"));

    var syncCurrent = function () {
      links.forEach(function (a, i) {
        if (a.getAttribute("aria-current") === "true") items[i].setAttribute("aria-current", "true");
        else items[i].removeAttribute("aria-current");
      });
    };
    var setOpen = function (on, refocus) {
      sheet.hidden = !on;
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) { syncCurrent(); (sheet.querySelector('[aria-current="true"]') || items[0]).focus({ preventScroll: true }); }
      else if (refocus) btn.focus({ preventScroll: true });
    };
    btn.addEventListener("click", function () { setOpen(sheet.hidden); });
    sheet.addEventListener("click", function (ev) { if (ev.target.closest("a")) setOpen(false); });
    doc.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !sheet.hidden) { ev.preventDefault(); setOpen(false, true); } });
    doc.addEventListener("pointerdown", function (ev) {
      if (!sheet.hidden && !sheet.contains(ev.target) && !btn.contains(ev.target)) setOpen(false);
    });
    var mq = window.matchMedia("(max-width: 640px)");
    var onMq = function () { if (!mq.matches && !sheet.hidden) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener("change", onMq); else if (mq.addListener) mq.addListener(onMq);
  }
})();
