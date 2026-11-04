/* Batch 26b: live-QA fixes, add-only.
   1. Media decade chips (1950s first): a click on a chip, or on anything lying over it, always toggles that decade.
   2. Media "Filter by person": a real autocomplete (case-insensitive, Up/Down/Enter, Esc) that filters on selection.
   3. Gear menu "Fine playback speed": slider and label mirror the live playback rate, and repaint when the menu opens.
   No timers that repeat, no observers, no hover transforms. */
(function () {
  "use strict";
  var doc = document;
  var TH = window.ArchiveTheater, host = doc.getElementById("theater");

  /* shared styles, tokens only */
  var st = doc.createElement("style");
  st.textContent =
    "#theater [data-tdec]{position:relative;z-index:2;pointer-events:auto}" +
    ".x26b-ac{position:fixed;z-index:1000;margin:0;padding:4px;list-style:none;max-height:min(320px,50vh);overflow:auto;background:var(--fill-primary-on);color:var(--text-primary);border:1px solid var(--stroke-primary);border-radius:var(--r-s);box-shadow:var(--hark-shadow)}" +
    ".x26b-ac[hidden]{display:none}" +
    ".x26b-ac li{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:var(--tap);padding:0 12px;border-radius:calc(var(--r-s) - 4px);font:var(--type-label);cursor:pointer}" +
    ".x26b-ac li[aria-selected=\"true\"]{background:var(--fill-tertiary)}" +
    ".x26b-ac li small{font:var(--type-caption);color:var(--text-secondary);flex:none}" +
    ".x26b-ac li b{font-weight:var(--weight-bold)}" +
    ".x26b-ac .x26b-ac__none{cursor:default;color:var(--text-secondary)}";
  doc.head.appendChild(st);

  /* =========== 1. decade chips =========== */
  if (TH && TH.filters && host) {
    var chipAt = function (x, y) {
      var hit = null;
      host.querySelectorAll("[data-tdec]").forEach(function (c) {
        if (hit) return;
        var r = c.getBoundingClientRect(); if (!r.width || !r.height) return;
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
        var row = c.parentNode && c.parentNode.getBoundingClientRect();
        if (row && (x < row.left || x > row.right)) return; /* scrolled out of its row */
        hit = c;
      });
      return hit;
    };
    window.addEventListener("click", function (e) {
      var t = e.target, chip = t && t.closest ? t.closest("[data-tdec]") : null;
      if (chip && !host.contains(chip)) chip = null;
      if (!chip) {
        if (!e.isTrusted || (!e.clientX && !e.clientY)) return;
        /* something lies over the chip: use it only when that thing is not a control of its own */
        if (t && t.closest && t.closest("a[href],button,input,select,textarea,label,summary,[role=button],[role=option],[role=tab]")) return;
        chip = chipAt(e.clientX, e.clientY);
        if (!chip) return;
        e.preventDefault();
      }
      var d = chip.getAttribute("data-tdec"), before = TH.filters.decs.has(d);
      /* after every other handler: if the decade did not toggle, toggle it here */
      setTimeout(function () {
        if (TH.filters.decs.has(d) !== before) return;
        if (before) TH.filters.decs.delete(d); else TH.filters.decs.add(d);
        TH.refilter();
      }, 0);
    }, true);
  }

  /* =========== 2. person autocomplete =========== */
  var input = doc.getElementById("ttPerson");
  if (TH && TH.filters && input) {
    var read = function (id) { try { return Hark.data(id) || []; } catch (e) { return []; } };
    var PEOPLE = read("d-people"), VIDS = read("d-videos");
    var count = {};
    VIDS.forEach(function (v) { (Array.isArray(v.p) ? v.p : []).forEach(function (id) { count[id] = (count[id] || 0) + 1; }); });
    var LIST = PEOPLE.filter(function (p) { return p && p.name && count[p.id]; })
      .map(function (p) { return { id: p.id, name: String(p.name), low: String(p.name).toLowerCase(), n: count[p.id] }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, "en"); });
    var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

    var box = doc.createElement("ul");
    box.className = "x26b-ac"; box.id = "x26bPeople"; box.setAttribute("role", "listbox"); box.setAttribute("aria-label", "Matching people"); box.hidden = true;
    doc.body.appendChild(box);
    input.removeAttribute("list"); /* the native datalist would open on top of this one */
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", box.id);
    input.setAttribute("aria-expanded", "false");

    var items = [], active = -1;
    var isOpen = function () { return !box.hidden; };
    var place = function () {
      var r = input.getBoundingClientRect();
      box.style.left = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 260) - 8)) + "px";
      box.style.top = (r.bottom + 4) + "px";
      box.style.width = Math.max(r.width, 260) + "px";
    };
    var close = function () {
      if (!isOpen()) return;
      box.hidden = true; active = -1;
      input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant");
    };
    var paintActive = function () {
      [].forEach.call(box.children, function (li, i) { li.setAttribute("aria-selected", String(i === active)); });
      var li = box.children[active];
      if (li && li.id) { input.setAttribute("aria-activedescendant", li.id); li.scrollIntoView({ block: "nearest" }); }
      else input.removeAttribute("aria-activedescendant");
    };
    var mark = function (name, q) {
      var i = name.toLowerCase().indexOf(q);
      return i < 0 ? esc(name) : esc(name.slice(0, i)) + "<b>" + esc(name.slice(i, i + q.length)) + "</b>" + esc(name.slice(i + q.length));
    };
    var render = function () {
      var q = input.value.trim().toLowerCase();
      if (!q) { items = []; close(); return; }
      var rank = function (p) { return p.low.indexOf(q) === 0 ? 0 : (" " + p.low).indexOf(" " + q) >= 0 ? 1 : 2; };
      items = LIST.filter(function (p) { return p.low.indexOf(q) >= 0; })
        .sort(function (a, b) { return rank(a) - rank(b) || a.name.localeCompare(b.name, "en"); })
        .slice(0, 10);
      active = items.length ? 0 : -1;
      box.innerHTML = items.length
        ? items.map(function (p, i) { return '<li role="option" id="x26bP' + i + '" aria-selected="false"><span>' + mark(p.name, q) + "</span><small>" + p.n + (p.n === 1 ? " talk" : " talks") + "</small></li>"; }).join("")
        : '<li class="x26b-ac__none" aria-disabled="true">No people match</li>';
      box.hidden = false; input.setAttribute("aria-expanded", "true");
      place(); paintActive();
    };
    var choose = function (p) {
      if (!p) return;
      input.value = p.name;
      TH.filters.personQ = p.name;
      TH.filters.person = p.id;
      close();
      TH.refilter();
    };
    input.addEventListener("input", render);
    input.addEventListener("focus", function () { if (input.value.trim() && !TH.filters.person) render(); });
    input.addEventListener("blur", function () { setTimeout(close, 0); });
    box.addEventListener("mousedown", function (e) { e.preventDefault(); }); /* keeps focus in the box */
    box.addEventListener("click", function (e) {
      var li = e.target.closest && e.target.closest("li[role=option]"); if (!li) return;
      choose(items[[].indexOf.call(box.children, li)]);
    });
    /* capture on the Media host: runs before the box's own Enter handler, so the highlighted name wins */
    (host || doc).addEventListener("keydown", function (e) {
      if (e.target !== input) return;
      var k = e.key;
      if (k === "ArrowDown" || k === "ArrowUp") {
        e.preventDefault();
        if (!isOpen()) { render(); return; }
        if (!items.length) return;
        active = k === "ArrowDown" ? (active + 1) % items.length : (active - 1 + items.length) % items.length;
        paintActive();
      } else if (k === "Enter") {
        if (!isOpen() || !items.length) return;
        e.preventDefault(); e.stopPropagation();
        choose(items[active >= 0 ? active : 0]);
      } else if (k === "Escape" || k === "Esc") {
        if (!isOpen()) return;
        e.preventDefault(); e.stopPropagation();
        close();
      } else if (k === "Tab") close();
    }, true);
    window.addEventListener("scroll", function () { if (isOpen()) place(); }, { passive: true, capture: true });
    window.addEventListener("resize", function () { if (isOpen()) place(); });
    doc.addEventListener("pointerdown", function (e) { if (isOpen() && e.target !== input && !box.contains(e.target)) close(); }, true);
  }

  /* =========== 3. fine speed slider mirrors the live rate =========== */
  var AP = window.ArchivePlayer;
  if (AP && AP.onCreate) {
    var insts = [];
    var fmtR = function (r) { return (+r).toFixed(2).replace(/0$/, "").replace(/\.0$/, "") + "×"; };
    var rateOf = function (inst) {
      var r = 0;
      try { var y = inst.yt && inst.yt(); if (y && y.getPlaybackRate && inst.started && inst.started()) r = +y.getPlaybackRate(); } catch (e) {}
      if (!(r > 0)) { try { r = +inst.rate(); } catch (e) {} }
      return r > 0 ? r : 1;
    };
    var menusOf = function (inst) {
      var out = [], add = function (m) { if (m && out.indexOf(m) < 0) out.push(m); };
      var scope = [inst.bar, inst.btns].filter(Boolean);
      scope.forEach(function (s) {
        s.querySelectorAll('[data-x="more"][aria-controls]').forEach(function (b) { add(doc.getElementById(b.getAttribute("aria-controls"))); });
        s.querySelectorAll(".x-apx-menu").forEach(add);
      });
      return out;
    };
    var paint = function (inst) {
      var r = rateOf(inst), t = fmtR(r);
      menusOf(inst).forEach(function (m) {
        m.querySelectorAll('[data-x="ratefine"]').forEach(function (fr) {
          var mn = +fr.min || 0.25, mx = +fr.max || 3, v = Math.max(mn, Math.min(mx, r));
          if (doc.activeElement !== fr && Math.abs(+fr.value - v) > 0.001) fr.value = String(v);
          fr.style.setProperty("--x-ap-pct", ((+fr.value - mn) / (mx - mn) * 100) + "%");
          fr.setAttribute("aria-valuetext", t);
        });
        m.querySelectorAll('[data-r="rate"]').forEach(function (o) { if (o.textContent !== t) o.textContent = t; });
        m.querySelectorAll('[data-x="rate"][data-rate]').forEach(function (b) {
          var p = String(Math.abs(+b.getAttribute("data-rate") - r) < 0.001);
          if (b.getAttribute("aria-pressed") !== p) b.setAttribute("aria-pressed", p);
        });
      });
    };
    var soon = function (inst) {
      if (inst.__f26bQ) return;
      inst.__f26bQ = setTimeout(function () { inst.__f26bQ = 0; paint(inst); }, 0);
    };
    var hookYT = function (inst) {
      try {
        var y = inst.yt && inst.yt();
        if (y && y.addEventListener && !y.__f26b) { y.__f26b = true; y.addEventListener("onPlaybackRateChange", function () { soon(inst); }); }
      } catch (e) {}
    };
    AP.onCreate(function (inst) {
      if (!inst || inst.__f26b) return;
      inst.__f26b = true; insts.push(inst);
      /* every path that goes through the instance's setRate (presets, slider, speed12, dock) repaints */
      if (typeof inst.setRate === "function") {
        var orig = inst.setRate;
        inst.setRate = function () { var x = orig.apply(this, arguments); soon(inst); return x; };
      }
      if (inst.on) {
        try {
          inst.on("flash", function (k) { if (String(k).indexOf("rate:") === 0) soon(inst); });
          inst.on("ready", function () { hookYT(inst); soon(inst); });
          inst.on("state", function () { hookYT(inst); });
          inst.on("change", function () { soon(inst); });
        } catch (e) {}
      }
      /* the bar's own speed <select> calls the player's inner setRate */
      if (inst.bar) inst.bar.addEventListener("change", function (e) { if (e.target && e.target.matches && e.target.matches('select[data-r="speed"], [data-x="ratefine"]')) soon(inst); });
      hookYT(inst); paint(inst);
    });
    /* opening the gear menu repaints its speed block */
    window.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-x="more"]') : null; if (!b) return;
      insts.forEach(function (inst) { if ((inst.bar && inst.bar.contains(b)) || (inst.btns && inst.btns.contains(b))) { hookYT(inst); soon(inst); } });
    }, true);
    /* keyboard speed shortcuts (< >, Shift+, and Shift+.) use the inner path too */
    window.addEventListener("keyup", function (e) {
      if (e.key === "<" || e.key === ">" || e.key === "," || e.key === "." || e.key === "[" || e.key === "]") insts.forEach(soon);
    });
  }
})();
