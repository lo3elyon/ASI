/* cleanexit26: a visible "Exit clean view" button while a player is in clean view (H).
   Add-only: it presses the player's own clean-view toggle, so player7.js stays the single source of truth. */
(function () {
  "use strict";
  var ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>';
  var hideT = 0;
  function ensure(root) {
    var b = root.querySelector(":scope > .x26-cx");
    if (b) return b;
    b = document.createElement("button");
    b.type = "button"; b.className = "x26-cx";
    b.setAttribute("aria-label", "Exit clean view (H)");
    b.innerHTML = ICON + "<span>Exit clean view</span>";
    b.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      var t = root.querySelector('[data-x7="clean"]');
      if (t) t.click();
    });
    root.appendChild(b);
    return b;
  }
  function wake() {
    var roots = document.querySelectorAll(".x7-clean");
    if (!roots.length) return;
    roots.forEach(function (r) { ensure(r).classList.add("is-on"); });
    clearTimeout(hideT);
    hideT = setTimeout(function () {
      document.querySelectorAll(".x26-cx.is-on").forEach(function (b) { if (!b.matches(":hover,:focus-visible")) b.classList.remove("is-on"); });
    }, 2500);
  }
  ["mousemove", "pointerdown", "touchstart", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, wake, { passive: true, capture: true });
  });
})();
