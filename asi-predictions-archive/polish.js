/* Polish pass: horizontal strips with arrows, fades, drag and a progress line; styled dropdowns for
   every <select>; the phone filter sheet. Nothing here runs on a timer or re-renders content. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var CHEV_L = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CHEV_R = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CHEV_D = '<svg class="x-dd__chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- 1. horizontal strips ---------- */
  var STRIPS = ".x-hi__scroll, .x-hi__tabs, .x-tt__strip, .x-cw__row";
  var enhanceStrip = function (el) {
    if (el.__xstrip || !el.parentNode) return;
    el.__xstrip = true;
    var wrap = doc.createElement("div");
    wrap.className = "x-strip";
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    el.classList.add("x-strip__sc");
    var mk = function (dir) {
      var b = doc.createElement("button");
      b.type = "button";
      b.className = "x-strip__btn x-strip__btn--" + dir;
      b.setAttribute("aria-label", dir === "l" ? "Scroll left" : "Scroll right");
      b.innerHTML = dir === "l" ? CHEV_L : CHEV_R;
      b.addEventListener("click", function () {
        el.scrollBy({ left: (dir === "l" ? -1 : 1) * Math.max(120, el.clientWidth * 0.75), behavior: reduce.matches ? "auto" : "smooth" });
      });
      wrap.appendChild(b);
      return b;
    };
    mk("l"); mk("r");
    var bar = doc.createElement("div");
    bar.className = "x-strip__bar";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = "<span></span>";
    wrap.appendChild(bar);
    var thumb = bar.firstChild, raf = 0;
    var paint = function () {
      raf = 0;
      var max = el.scrollWidth - el.clientWidth, sl = el.scrollLeft;
      var on = max > 2;
      wrap.classList.toggle("is-scrollable", on);
      wrap.classList.toggle("can-l", on && sl > 2);
      wrap.classList.toggle("can-r", on && sl < max - 2);
      if (on) {
        var w = Math.max(8, (el.clientWidth / el.scrollWidth) * 100);
        thumb.style.width = w.toFixed(2) + "%";
        thumb.style.transform = "translateX(" + ((sl / max) * (100 / w) * (100 - w)).toFixed(2) + "%)";
      }
    };
    var queue = function () { if (!raf) raf = requestAnimationFrame(paint); };
    el.addEventListener("scroll", queue, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(queue).observe(el);
    window.addEventListener("resize", queue, { passive: true });
    paint();

    /* drag to scroll with a mouse; a drag never counts as a click */
    var sx = 0, ssl = 0, down = false, dragged = false, pid = null;
    el.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType !== "mouse" || ev.button !== 0 || el.scrollWidth <= el.clientWidth + 2) return;
      down = true; dragged = false; sx = ev.clientX; ssl = el.scrollLeft; pid = ev.pointerId;
    });
    el.addEventListener("pointermove", function (ev) {
      if (!down) return;
      var dx = ev.clientX - sx;
      if (!dragged && Math.abs(dx) > 5) { dragged = true; wrap.classList.add("is-drag"); try { el.setPointerCapture(pid); } catch (e) {} }
      if (dragged) { ev.preventDefault(); el.scrollLeft = ssl - dx; }
    });
    var end = function () {
      if (!down) return;
      down = false;
      if (dragged) {
        wrap.classList.remove("is-drag");
        var stop = function (e) { e.preventDefault(); e.stopPropagation(); };
        el.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(function () { el.removeEventListener("click", stop, true); }, 0);
      }
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("dragstart", function (ev) { ev.preventDefault(); });

    /* wheel: shift-wheel scrolls sideways everywhere; on the history timeline a plain wheel does too,
       until the strip reaches an end, so the page keeps scrolling past it */
    var wheelV = el.getAttribute("data-strip") === "wheel";
    el.addEventListener("wheel", function (ev) {
      var max = el.scrollWidth - el.clientWidth; if (max <= 2) return;
      if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
      if (!ev.shiftKey && !wheelV) return;
      var d = ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? el.clientWidth : 1);
      if (!d || (d < 0 && el.scrollLeft <= 0) || (d > 0 && el.scrollLeft >= max - 1)) return;
      ev.preventDefault();
      el.scrollLeft += d;
    }, { passive: false });
  };

  /* ---------- 2. styled dropdowns for every select ---------- */
  var proto = HTMLSelectElement.prototype;
  var dVal = Object.getOwnPropertyDescriptor(proto, "value"), dIdx = Object.getOwnPropertyDescriptor(proto, "selectedIndex");
  var menu = doc.createElement("div");
  menu.className = "x-dd__menu";
  menu.setAttribute("role", "listbox");
  menu.tabIndex = -1;
  menu.hidden = true;
  var cur = null, active = -1, uid = 0;

  var optsOf = function () { return [].slice.call(menu.querySelectorAll('[role="option"]')); };
  var setActive = function (i) {
    var o = optsOf(); if (!o.length) return;
    active = Math.max(0, Math.min(o.length - 1, i));
    o.forEach(function (el, k) { el.classList.toggle("is-active", k === active); });
    menu.setAttribute("aria-activedescendant", o[active].id);
    o[active].scrollIntoView({ block: "nearest" });
  };
  var close = function (refocus) {
    if (!cur) return;
    var c = cur; cur = null;
    menu.hidden = true;
    c.btn.setAttribute("aria-expanded", "false");
    c.wrap.classList.remove("is-open");
    if (refocus) c.btn.focus({ preventScroll: true });
  };
  var choose = function (i) {
    if (!cur) return;
    var c = cur, o = c.sel.options[i];
    if (o && !o.disabled && c.sel.selectedIndex !== i) {
      dIdx.set.call(c.sel, i);
      c.sync();
      c.sel.dispatchEvent(new Event("input", { bubbles: true }));
      c.sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    close(true);
  };
  var open = function (c) {
    if (cur === c) return;
    close(false);
    cur = c;
    (doc.fullscreenElement || doc.body).appendChild(menu);
    menu.setAttribute("aria-label", c.sel.getAttribute("aria-label") || "Options");
    menu.classList.toggle("x-dd__menu--sm", c.wrap.classList.contains("x-dd--sm"));
    menu.innerHTML = [].map.call(c.sel.options, function (o, i) {
      return '<div role="option" id="' + c.id + "-o" + i + '" data-i="' + i + '" aria-selected="' + (i === c.sel.selectedIndex) + '"' + (o.disabled ? ' aria-disabled="true"' : "") + ">" +
        o.textContent.replace(/[&<>]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]; }) + "</div>";
    }).join("");
    menu.hidden = false;
    var r = c.btn.getBoundingClientRect(), vw = root.clientWidth, vh = window.innerHeight;
    menu.style.minWidth = Math.round(r.width) + "px";
    var mw = menu.offsetWidth, mh = menu.offsetHeight;
    var top = r.bottom + 6;
    if (top + mh > vh - 8 && r.top - mh - 6 > 8) top = r.top - mh - 6;
    menu.style.top = Math.round(top) + "px";
    menu.style.left = Math.round(Math.max(8, Math.min(vw - mw - 8, r.left))) + "px";
    c.btn.setAttribute("aria-expanded", "true");
    c.wrap.classList.add("is-open");
    menu.focus({ preventScroll: true });
    setActive(Math.max(0, c.sel.selectedIndex));
  };
  menu.addEventListener("click", function (ev) {
    var o = ev.target.closest('[role="option"]'); if (o && o.getAttribute("aria-disabled") !== "true") choose(+o.dataset.i);
  });
  menu.addEventListener("mousemove", function (ev) {
    var o = ev.target.closest('[role="option"]'); if (o && +o.dataset.i !== active) setActive(+o.dataset.i);
  });
  menu.addEventListener("keydown", function (ev) {
    var k = ev.key, n = optsOf().length;
    if (k === "ArrowDown") setActive(active + 1);
    else if (k === "ArrowUp") setActive(active - 1);
    else if (k === "Home" || k === "PageUp") setActive(0);
    else if (k === "End" || k === "PageDown") setActive(n - 1);
    else if (k === "Enter" || k === " ") choose(active);
    else if (k === "Escape") close(true);
    else if (k === "Tab") { close(true); return; }
    else if (k.length === 1) {
      var o = optsOf(), low = k.toLowerCase();
      for (var j = 1; j <= o.length; j++) { var x = o[(active + j) % o.length]; if (x.textContent.trim().toLowerCase().charAt(0) === low) { setActive((active + j) % o.length); break; } }
    } else return;
    ev.preventDefault(); ev.stopPropagation();
  });
  doc.addEventListener("pointerdown", function (ev) {
    if (cur && !menu.contains(ev.target) && !cur.wrap.contains(ev.target)) close(false);
  }, true);
  window.addEventListener("resize", function () { close(false); }, { passive: true });
  doc.addEventListener("scroll", function (ev) { if (cur && !menu.contains(ev.target)) close(false); }, { capture: true, passive: true });
  menu.addEventListener("focusout", function (ev) {
    if (cur && ev.relatedTarget && !menu.contains(ev.relatedTarget) && ev.relatedTarget !== cur.btn) close(false);
  });

  var enhanceSelect = function (sel) {
    if (sel.__xdd || sel.multiple || !sel.parentNode) return;
    sel.__xdd = true;
    var c = { sel: sel, id: "xdd" + ++uid };
    c.wrap = doc.createElement("span");
    c.wrap.className = "x-dd" + (sel.closest(".x-ap, .x-pop") ? " x-dd--sm" : "");
    sel.parentNode.insertBefore(c.wrap, sel);
    c.wrap.appendChild(sel);
    sel.classList.add("x-dd__native");
    sel.tabIndex = -1;
    sel.setAttribute("aria-hidden", "true");
    c.btn = doc.createElement("button");
    c.btn.type = "button";
    c.btn.className = "x-dd__btn";
    c.btn.setAttribute("aria-haspopup", "listbox");
    c.btn.setAttribute("aria-expanded", "false");
    c.btn.innerHTML = '<span class="x-dd__val"></span>' + CHEV_D;
    c.wrap.appendChild(c.btn);
    var val = c.btn.firstChild, lab = sel.getAttribute("aria-label") || "";
    c.sync = function () {
      var o = sel.options[sel.selectedIndex], t = o ? o.textContent : "";
      if (val.textContent !== t) val.textContent = t;
      c.btn.setAttribute("aria-label", (lab ? lab + ": " : "") + t);
    };
    /* code that sets .value or .selectedIndex keeps the button label in step */
    try {
      Object.defineProperty(sel, "value", { configurable: true, get: function () { return dVal.get.call(this); }, set: function (v) { dVal.set.call(this, v); c.sync(); } });
      Object.defineProperty(sel, "selectedIndex", { configurable: true, get: function () { return dIdx.get.call(this); }, set: function (v) { dIdx.set.call(this, v); c.sync(); } });
    } catch (e) {}
    sel.addEventListener("change", c.sync);
    c.btn.addEventListener("click", function (ev) { ev.preventDefault(); cur === c ? close(true) : open(c); });
    c.btn.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp" || (ev.altKey && ev.key === "ArrowDown")) { ev.preventDefault(); ev.stopPropagation(); open(c); }
    });
    c.sync();
  };

  /* ---------- 3. phone: archive filters in a slide-up sheet ---------- */
  var fbtn = doc.getElementById("filtersBtn"), bar = doc.getElementById("archBar");
  if (fbtn && bar) {
    var mqPhone = window.matchMedia("(max-width: 640px)");
    var syncSheet = function () { root.classList.toggle("x-sheet-open", mqPhone.matches && fbtn.getAttribute("aria-expanded") === "true"); };
    new MutationObserver(syncSheet).observe(fbtn, { attributes: true, attributeFilter: ["aria-expanded"] });
    if (mqPhone.addEventListener) mqPhone.addEventListener("change", syncSheet);
    doc.addEventListener("pointerdown", function (ev) {
      if (root.classList.contains("x-sheet-open") && !bar.contains(ev.target)) fbtn.click();
    });
  }

  /* ---------- scan now and as content arrives ---------- */
  var scan = function () {
    doc.querySelectorAll(STRIPS).forEach(enhanceStrip);
    doc.querySelectorAll("select").forEach(enhanceSelect);
  };
  scan();
  var q = 0;
  new MutationObserver(function () {
    if (q) return;
    q = requestAnimationFrame(function () { q = 0; scan(); });
  }).observe(doc.body, { childList: true, subtree: true });
})();
