/* fix27: inside the gear menu, the mouse wheel scrolls the menu. The volume slider (and other range sliders) in the
   menu caught the wheel to change their value, so scrolling stopped halfway and the last rows (caption style) could
   not be reached. Shift+wheel and the wheel on the control bar's own speaker and slider keep their behaviour. */
(function () {
  "use strict";
  window.addEventListener("wheel", function (e) {
    if (e.shiftKey || e.ctrlKey) return;
    var t = e.target; if (!t || !t.closest) return;
    var m = t.closest(".x-apx-menu, .g13-menu"); if (!m) return;
    if (t.closest('input[type="range"], [role="slider"], .x-ap__vol, [data-a="mute"]')) e.stopPropagation();
  }, { capture: true, passive: true });
})();
