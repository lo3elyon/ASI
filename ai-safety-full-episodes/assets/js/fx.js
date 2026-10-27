/* AI Safety Full Episodes · delight layer: ripples on every button, per-icon micro-animations (heart pop + burst,
 * checkmark draw-in + ring pulse, bookmark flip, queue bounce), 3D tilt on thumbnails, and short particle bursts /
 * confetti on meaningful actions. Particles respect prefers-reduced-motion, Do-not-disturb and the "Celebrations"
 * setting; micro-animations respect reduced motion. Built by Aniruddha Adak. */
(function (A) {
  "use strict";
  const { $, RM } = A;
  const L = () => A.hist && A.hist.L;
  const reduced = () => RM || document.documentElement.classList.contains("rm");
  const allowed = () => !reduced() && !(A.P && A.P.dnd) && !(L() && L().SETTINGS && L().SETTINGS.celebrations === false);
  const FX = { bursts: 0, last: null };

  /* restart a CSS animation class on the same element (no DOM replacement) */
  function play(el, cls, ms) {
    if (!el || reduced()) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    clearTimeout(el["_fx" + cls]); el["_fx" + cls] = setTimeout(() => el.classList.remove(cls), ms || 700);
  }
  function center(el) {
    if (!el || !el.getBoundingClientRect) return { x: innerWidth / 2, y: innerHeight / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 || innerWidth / 2, y: r.top + r.height / 2 || innerHeight / 2 };
  }
  /* a small radial burst of emoji or dots from a point */
  function burst(el, o) {
    o = o || {};
    if (!allowed()) return null;
    const c = center(el);
    const box = document.createElement("div");
    box.className = "fxburst" + (o.cls ? " " + o.cls : ""); box.setAttribute("aria-hidden", "true");
    box.style.left = c.x + "px"; box.style.top = c.y + "px";
    const n = o.n || 12, glyphs = o.glyphs || null, cols = o.cols || ["var(--amber)", "var(--teal)", "#22c55e", "#38bdf8", "#fb923c"];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5, dist = (o.dist || 46) * (0.7 + Math.random() * 0.6);
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", Math.sin(ang) * dist - (o.lift || 8) + "px");
      p.style.setProperty("--rot", (Math.random() * 360 - 180).toFixed(0) + "deg");
      p.style.animationDelay = (Math.random() * 0.06).toFixed(2) + "s";
      if (glyphs) { p.textContent = glyphs[i % glyphs.length]; p.className = "g"; }
      else p.style.background = cols[i % cols.length];
      box.appendChild(p);
    }
    document.body.appendChild(box);
    FX.bursts++; FX.last = o.kind || "burst";
    setTimeout(() => box.remove(), 1000);
    return box;
  }
  function ring(el) {
    if (!el || reduced()) return;
    const r = document.createElement("span"); r.className = "fxring"; r.setAttribute("aria-hidden", "true");
    if (getComputedStyle(el).position === "static") el.classList.add("fx-rel");
    el.appendChild(r); setTimeout(() => r.remove(), 700);
  }
  function confetti(n) { if (!allowed()) return; FX.bursts++; FX.last = "confetti"; A.ui.confetti(n); }
  function buzz() { try { if (allowed() && navigator.vibrate && matchMedia("(pointer: coarse)").matches) navigator.vibrate(8); } catch (e) {} }

  /* one entry point for every meaningful action */
  function celebrate(kind, el, on) {
    play(el, "fx-tap", 360);
    if (kind === "fav") { if (on) { play(el, "fx-pop", 600); burst(el, { kind, glyphs: ["❤", "♥", "✦"], n: 12, cls: "fxburst--heart" }); buzz(); } else play(el, "fx-unpop", 400); return; }
    if (kind === "watched") { if (on) { play(el, "fx-check", 800); ring(el); burst(el, { kind, n: 14 }); buzz(); } return; }
    if (kind === "unwatch") { play(el, "fx-unpop", 400); return; }
    if (kind === "later") { play(el, "fx-flip", 700); if (on) burst(el, { kind, glyphs: ["🕒", "✦"], n: 8, dist: 36 }); return; }
    if (kind === "queue") { play(el, "fx-bounce", 600); if (on) burst(el, { kind, glyphs: ["+", "✦"], n: 8, dist: 34 }); return; }
    if (kind === "playlist") { play(el, "fx-bounce", 600); burst(el, { kind, glyphs: ["♪", "✦", "♫"], n: 10 }); return; }
    if (kind === "follow") { if (on) { play(el, "fx-pop", 600); burst(el, { kind, glyphs: ["⭐", "✦"], n: 12 }); buzz(); } return; }
    if (kind === "rate") { play(el, "fx-pop", 600); if (on) burst(el, { kind, glyphs: ["★", "✦"], n: 8, dist: 30, cols: ["var(--amber)"] }); return; }
    if (kind === "pick") { play(el, "fx-pop", 600); burst(el, { kind, glyphs: ["✦", "✓"], n: 10 }); return; }
    if (kind === "complete") { confetti(70); return; }
    if (kind === "picksdone") { confetti(120); burst(el, { kind, glyphs: ["🎉", "✦", "⭐"], n: 16, dist: 70 }); return; }
  }

  /* ripple on every button (event delegation; the button itself is untouched apart from a transient child) */
  const RIPPLE = ".btn, .iconbtn, .chip, .follow, .seg button, .cbtn, .star, .pk__btn, .swatch, .shelf__more, .cx";
  document.addEventListener("pointerdown", (ev) => {
    if (reduced() || ev.button > 0) return;
    const b = ev.target.closest && ev.target.closest(RIPPLE); if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(); if (!r.width) return;
    const cs = getComputedStyle(b);
    if (cs.position === "static") b.classList.add("fx-rel");
    b.classList.add("fx-clip");
    const s = document.createElement("span"); s.className = "ripple"; s.setAttribute("aria-hidden", "true");
    const d = Math.max(r.width, r.height) * 2.2;
    s.style.width = s.style.height = d + "px";
    s.style.left = ev.clientX - r.left - d / 2 + "px"; s.style.top = ev.clientY - r.top - d / 2 + "px";
    b.appendChild(s);
    setTimeout(() => { s.remove(); if (!b.querySelector(".ripple")) b.classList.remove("fx-clip"); }, 620);
  }, { passive: true });

  /* 3D tilt + parallax on thumbnails under a fine pointer */
  const TILT = ".card .thumb, .lrow__th, .contb__th, .pick .thumb, .scard__ph, .plcard";
  const fine = () => { try { return matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) { return false; } };
  let tiltEl = null, raf = 0;
  document.addEventListener("pointermove", (ev) => {
    if (reduced() || ev.pointerType !== "mouse" || !fine()) return;
    const t = ev.target.closest && ev.target.closest(TILT);
    if (tiltEl && tiltEl !== t) { tiltEl.classList.remove("is-tilt"); tiltEl.style.removeProperty("--rx"); tiltEl.style.removeProperty("--ry"); tiltEl = null; }
    if (!t || document.body.classList.contains("is-grabbing")) return;
    tiltEl = t;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = t.getBoundingClientRect(); if (!r.width) return;
      const px = (ev.clientX - r.left) / r.width - 0.5, py = (ev.clientY - r.top) / r.height - 0.5;
      t.classList.add("is-tilt");
      t.style.setProperty("--rx", (-py * 8).toFixed(2) + "deg");
      t.style.setProperty("--ry", (px * 10).toFixed(2) + "deg");
      t.style.setProperty("--mx", ((px + 0.5) * 100).toFixed(1) + "%");
      t.style.setProperty("--my", ((py + 0.5) * 100).toFixed(1) + "%");
    });
  }, { passive: true });
  window.addEventListener("blur", () => { if (tiltEl) { tiltEl.classList.remove("is-tilt"); tiltEl = null; } });

  A.fx = { celebrate, burst, confetti, play, ring, allowed, FX };
})(window.ASFE);
