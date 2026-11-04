/* fix20: a drawn, always-visible colourful scroll thumb for the gear menu (native overlay scrollbars hide), plus end flag. */
(function () {
  "use strict";
  var doc = document;
  var rail = function (m) {
    var r = m.__f20r;
    if (!r) { r = doc.createElement("div"); r.className = "f20-thumb"; r.setAttribute("aria-hidden", "true"); m.__f20r = r; }
    if (r.parentNode !== m.parentNode && m.parentNode) m.parentNode.appendChild(r);
    var need = !m.hidden && m.getClientRects().length && m.scrollHeight > m.clientHeight + 2;
    if (!need) { r.style.display = "none"; return; }
    var H = m.clientHeight, th = Math.max(28, H * H / m.scrollHeight), y = (H - th) * (m.scrollTop / (m.scrollHeight - H));
    r.style.display = "block";
    r.style.top = (m.offsetTop + y + 4) + "px"; r.style.height = (th - 8) + "px";
    r.style.left = (m.offsetLeft + m.offsetWidth - 7) + "px";
    var at = m.scrollTop + H >= m.scrollHeight - 2; if (at !== m.hasAttribute("data-f20end")) m.toggleAttribute("data-f20end", at);
  };
  var all = function () { doc.querySelectorAll(".x-ap .x-apx-menu").forEach(rail); };
  var later = function () { requestAnimationFrame(function () { all(); setTimeout(all, 150); setTimeout(all, 450); }); };
  doc.addEventListener("click", later, true); doc.addEventListener("keyup", later, true); window.addEventListener("resize", later);
  doc.addEventListener("scroll", function (e) { var m = e.target; if (m && m.classList && m.classList.contains("x-apx-menu")) rail(m); }, true);
})();
