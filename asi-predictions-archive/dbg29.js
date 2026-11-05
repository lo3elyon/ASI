/* dbg29.js: diagnostic only, active solely with ?dbg=shake in the address. Shows nothing otherwise. */
(function () {
  if (!/[?&]dbg=shake/.test(location.search)) return;
  var box = document.createElement("pre");
  box.id = "dbg29";
  box.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;max-width:46vw;max-height:60vh;overflow:auto;margin:0;padding:8px;font:12px/1.35 monospace;background:#000;color:#0f0;border:1px solid #0f0;white-space:pre-wrap;pointer-events:none";
  document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(box); });
  var log = [], last = null, flips = 0, t0 = Date.now();
  var cls = function (el) { return el ? String(el.className || "").split(/\s+/).filter(Boolean).sort().join(" ") : "-"; };
  var snap = function () {
    var p = document.getElementById("ttPlayer"), top = document.getElementById("ttTop");
    var root = p && (p.classList.contains("x-ap") ? p : p.querySelector(".x-ap")), scr = p && p.querySelector(".x-ap__screen"), slot = p && p.querySelector(".x-ap__slot");
    var cs = scr ? getComputedStyle(scr) : null;
    return {
      top: top ? top.offsetHeight : -1, pl: p ? p.offsetHeight : -1, kids: p ? p.children.length : -1,
      scr: scr ? scr.offsetWidth + "x" + scr.offsetHeight : "-", mh: cs ? cs.maxHeight : "-", ar: cs ? cs.aspectRatio : "-",
      slot: slot ? slot.offsetWidth + "x" + slot.offsetHeight : "-",
      vars: root ? ["--p6-vh", "--p6-max", "--p6-slot"].map(function (k) { return root.style.getPropertyValue(k) || "·"; }).join(",") : "-",
      rc: cls(root), tc: cls(top), pc: cls(p), hc: cls(document.documentElement),
      hw: p ? p.clientWidth : -1, hmw: p ? getComputedStyle(p).maxWidth + "/" + getComputedStyle(p).width : "-", whn: p ? p.querySelectorAll(":scope > .x-wh").length : -1, mm: matchMedia("(min-width: 1100px)").matches ? 1 : 0, vw: innerWidth + "/" + document.documentElement.clientWidth, y: Math.round(scrollY), dh: document.documentElement.scrollHeight
    };
  };
  var diff = function (a, b) { var o = []; for (var k in b) if (a[k] !== b[k]) o.push(k + ": " + a[k] + " → " + b[k]); return o; };
  var tick = function () {
    var s = snap();
    if (last) { var d = diff(last, s); if (d.length) { if (last.top !== s.top) flips++; log.unshift(((Date.now() - t0) / 1000).toFixed(1) + "s " + d.join(" | ")); log.length = Math.min(log.length, 14); } }
    last = s;
    box.textContent = "SHAKE DEBUG  flips(ttTop height changes)=" + flips + "\nnow: top=" + s.top + " player=" + s.pl + " kids=" + s.kids + " screen=" + s.scr + " maxH=" + s.mh + " slot=" + s.slot + " vars=" + s.vars + " hostW=" + s.hw + " hostMaxW/W=" + s.hmw + " whPanels=" + s.whn + " mq1100=" + s.mm + " vw=" + s.vw + "\ntopCls: " + s.tc + "\n y=" + s.y + " docH=" + s.dh + "\nroot: " + s.rc + "\n--- changes (newest first) ---\n" + log.join("\n");
  };
  setInterval(tick, 100);
})();
