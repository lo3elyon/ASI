/* Archive bar: sticks below the nav, compacts into a Filters toggle once stuck. */
(function () {
  var bar = document.getElementById("archBar"), sen = document.getElementById("barSentinel");
  var btn = document.getElementById("filtersBtn"), num = document.getElementById("filtersN");
  if (!bar || !sen || !btn) return;
  var root = document.documentElement, nav = document.querySelector(".nav"), io = null, lastTop = -1;

  var setOpen = function (o) { bar.classList.toggle("is-open", o); btn.setAttribute("aria-expanded", o ? "true" : "false"); };
  var measureBar = function () {
    if (bar.classList.contains("is-stuck") && !bar.classList.contains("is-open")) root.style.setProperty("--bar-h", bar.offsetHeight + "px");
  };
  var setStuck = function (v) {
    if (v === bar.classList.contains("is-stuck")) return;
    bar.classList.toggle("is-stuck", v);
    if (!v) setOpen(false);
    else requestAnimationFrame(measureBar);
  };

  var observe = function () {
    var t = Math.round(parseFloat(getComputedStyle(bar).top) || 0);
    if (t === lastTop && io) return;
    lastTop = t;
    if (io) io.disconnect();
    io = new IntersectionObserver(function (en) {
      var e = en[en.length - 1], top = e.rootBounds ? e.rootBounds.top : t + 1;
      setStuck(!e.isIntersecting && e.boundingClientRect.top < top);
    }, { rootMargin: -(t + 1) + "px 0px 0px 0px", threshold: [0, 1] });
    io.observe(sen);
  };
  var measure = function () {
    root.style.setProperty("--nav-h", (nav ? nav.offsetHeight : 0) + "px");
    observe();
    measureBar();
  };

  var raf = 0;
  var schedule = function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  if (nav && window.ResizeObserver) new ResizeObserver(schedule).observe(nav);
  measure();

  btn.addEventListener("click", function () { setOpen(!bar.classList.contains("is-open")); });
  bar.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && bar.classList.contains("is-open")) { setOpen(false); btn.focus({ preventScroll: true }); }
  });

  /* active filter count on the toggle */
  var count = function () {
    var c = bar.querySelectorAll('.x-bar__chips [aria-pressed="true"]').length, s = String(c);
    if (num.textContent !== s) num.textContent = s;
    num.hidden = !c;
    btn.setAttribute("aria-label", c ? "Filters, " + c + " active" : "Filters");
  };
  var mo = new MutationObserver(count);
  bar.querySelectorAll(".x-bar__chips").forEach(function (r) {
    mo.observe(r, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-pressed"] });
  });
  count();
})();
