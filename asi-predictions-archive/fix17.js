/* fix17: Ask tab shows as active on #/ask; nav section clicks add a history step so Back returns. */
(function () {
  "use strict";
  var doc = document, nav = doc.querySelector("header.nav") || doc.querySelector(".nav");
  if (!nav) return;
  var onAsk = function () { return /^#\/ask/.test(location.hash); };
  var busy = false;
  var paint = function () {
    if (busy) return; busy = true;
    var ask = nav.querySelector(".x-nav-ask");
    if (onAsk()) {
      nav.querySelectorAll('[aria-current]').forEach(function (a) { if (a !== ask) a.removeAttribute("aria-current"); });
      if (ask && ask.getAttribute("aria-current") !== "page") ask.setAttribute("aria-current", "page");
      if (ask && !ask.classList.contains("is-here")) ask.classList.add("is-here");
    } else if (ask) { if (ask.getAttribute("aria-current") === "page") ask.removeAttribute("aria-current"); ask.classList.remove("is-here"); }
    busy = false;
  };
  window.addEventListener("hashchange", paint);
  window.addEventListener("popstate", function () { setTimeout(paint, 0); });
  paint();

  /* section tabs: make sure each click leaves a history entry, and Back/Forward scroll to that section */
  nav.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var h = a.getAttribute("href");
    if (!h || h === "#" || /^#\//.test(h)) return;
    if (location.hash !== h) { try { history.pushState({ xgTo: h.slice(1), f17: 1 }, "", h); } catch (x) {} }
  }, true);
  window.addEventListener("popstate", function () {
    var h = location.hash;
    if (!h || /^#\//.test(h)) return;
    var el = doc.getElementById(h.slice(1));
    if (!el) return;
    setTimeout(function () {
      if (typeof window.XGoTo === "function") { try { if (window.XGoTo(el, { instant: true }) !== false) return; } catch (x) {} }
      el.scrollIntoView({ block: "start" });
    }, 30);
  });
})();
