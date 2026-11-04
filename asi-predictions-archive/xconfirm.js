/* In-page confirm popover, used in place of window.confirm everywhere on the site.
   XConfirm({ title, text, ok, cancel, anchor }) returns a Promise<boolean>.
   Focus stays inside (Tab cycles the two buttons), Esc or a click outside = Cancel,
   and focus returns to whatever opened it. */
(function () {
  "use strict";
  var doc = document;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var dlg = null, done = null, from = null;
  var finish = function (v) {
    if (!dlg || !done) return;
    var f = done; done = null;
    if (dlg.open) dlg.close();
    if (from && from.focus && doc.contains(from)) from.focus({ preventScroll: true });
    from = null;
    f(v);
  };
  var make = function () {
    dlg = doc.createElement("dialog");
    dlg.className = "x-cfm";
    dlg.setAttribute("aria-labelledby", "x-cfm-t");
    dlg.setAttribute("aria-describedby", "x-cfm-d");
    doc.body.appendChild(dlg);
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); finish(false); });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) { finish(false); return; }
      var b = e.target.closest && e.target.closest("[data-cfm]");
      if (b) finish(b.getAttribute("data-cfm") === "ok");
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false); return; }
      if (e.key !== "Tab") return;
      var bs = [].slice.call(dlg.querySelectorAll("button")), i = bs.indexOf(doc.activeElement);
      e.preventDefault();
      bs[(i + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus();
    });
  };
  var place = function (anchor) {
    dlg.style.top = ""; dlg.style.left = ""; dlg.classList.remove("x-cfm--at");
    if (!anchor || !anchor.getBoundingClientRect || window.innerWidth < 560) return;
    var r = anchor.getBoundingClientRect(); if (!r.width && !r.height) return;
    var w = dlg.offsetWidth, h = dlg.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    var top = r.bottom + 8; if (top + h > vh - 12) top = Math.max(12, r.top - h - 8);
    var left = Math.min(Math.max(12, r.right - w), vw - w - 12);
    dlg.classList.add("x-cfm--at");
    dlg.style.top = Math.round(top) + "px"; dlg.style.left = Math.round(left) + "px";
  };
  window.XConfirm = function (o) {
    o = o || {};
    if (done) finish(false);
    if (!dlg) make();
    from = doc.activeElement;
    dlg.innerHTML = '<p class="x-cfm__t" id="x-cfm-t">' + esc(o.title || "Are you sure?") + "</p>" +
      '<p class="x-cfm__d" id="x-cfm-d">' + esc(o.text || "") + "</p>" +
      '<div class="x-cfm__btns"><button type="button" class="btn" data-cfm="cancel">' + esc(o.cancel || "Cancel") + "</button>" +
      '<button type="button" class="btn x-cfm__ok" data-cfm="ok">' + esc(o.ok || "Delete") + "</button></div>";
    return new Promise(function (res) {
      done = res;
      dlg.showModal();
      place(o.anchor);
      dlg.querySelector('[data-cfm="cancel"]').focus({ preventScroll: true });
    });
  };
})();
