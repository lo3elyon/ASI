/* load31.js: hides the first-load animation once the page is built, and plays the top bar on every page change. */
(function () {
  "use strict";
  var el = document.getElementById("x-load");
  var t0 = window.__xLoadT0 || 0, SLOW = /[?&]dbg=loader/.test(location.search), MIN = SLOW ? 60000 : 650, MAX = SLOW ? 60000 : 6000;
  if (SLOW && el) el.addEventListener("click", function () { el.classList.add("is-done"); });
  if (SLOW) document.documentElement.classList.add("x-load-slow");
  var done = false;
  var finish = function () {
    if (done || !el) return; done = true;
    var wait = Math.max(0, MIN - (Date.now() - t0));
    setTimeout(function () { el.classList.add("is-done"); el.setAttribute("aria-hidden", "true"); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600); }, wait);
  };
  var ready = function () {
    /* wait for the boot guard (deep links) to lift, then two frames so the first paint is the real page */
    var tries = 0;
    var check = function () {
      if (document.documentElement.classList.contains("x-boot") && ++tries < 80) { setTimeout(check, 50); return; }
      requestAnimationFrame(function () { requestAnimationFrame(finish); });
    };
    check();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
  setTimeout(finish, MAX);

  /* page changes: hash routes (#/person/…, #/search, #/ask, …), section jumps, Back and Forward */
  var bar = document.createElement("div"); bar.id = "x-route"; bar.setAttribute("aria-hidden", "true");
  var fadeT = 0, last = location.hash;
  var play = function (isPage) {
    if (!document.body) return;
    if (!bar.parentNode) document.body.appendChild(bar);
    bar.classList.remove("is-on"); void bar.offsetWidth; bar.classList.add("is-on");
    if (isPage) {
      var de = document.documentElement;
      de.classList.remove("x-route-fade"); void de.offsetWidth; de.classList.add("x-route-fade");
      clearTimeout(fadeT); fadeT = setTimeout(function () { de.classList.remove("x-route-fade"); }, 420);
    }
  };
  var changed = function () {
    var h = location.hash;
    if (h === last) return;
    var page = /^#\//.test(h) || /^#\//.test(last) || !h || h === "#";
    last = h; play(page);
  };
  window.addEventListener("hashchange", changed);
  window.addEventListener("popstate", changed);
  ["pushState", "replaceState"].forEach(function (k) {
    var orig = history[k];
    if (typeof orig !== "function") return;
    history[k] = function () { var r = orig.apply(this, arguments); try { setTimeout(changed, 0); } catch (e) {} return r; };
  });
})();
