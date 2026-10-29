/* One scroll animation system per page, each different from the home film.
   GPU friendly: transforms, opacity, stroke offsets and masks only. Every function runs inside a gsap.context, so route changes revert it all. */

const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
const $$ = (s, r) => Array.from(r.querySelectorAll(s));
const CLR = "transform,opacity,filter,clipPath,clip-path,transition,boxShadow,box-shadow";
/* Take an element away from the CSS reveal system so GSAP owns it alone */
function own(els) { (Array.isArray(els) ? els : [els]).forEach((e) => { if (!e || !e.classList) return; e.classList.remove("rv"); e.classList.add("in"); e.style.transition = "none"; }); return els; }

function heroDrift(el, gsap) {
  const bg = el.querySelector(".phero .bgimg"), h = el.querySelector(".phero h1");
  if (bg) gsap.to(bg, { yPercent: 14, scale: 1.12, ease: "none", scrollTrigger: { trigger: ".phero", start: "top top", end: "bottom top", scrub: true } });
  if (h) gsap.to(h, { yPercent: -18, opacity: 0.25, ease: "none", scrollTrigger: { trigger: ".phero", start: "center center", end: "bottom top", scrub: true } });
}

/* Futures: branching light lines grow down the page as you scroll, and the branch map draws itself */
function futures(el, gsap) {
  heroDrift(el, gsap);
  const host = document.createElement("div"); host.className = "fx-branches"; host.setAttribute("aria-hidden", "true");
  const H = Math.max(el.scrollHeight, 1600), W = 1000;
  let paths = "";
  const cols = ["#14b8a6", "#22d3ee", "#3b82f6", "#84cc16", "#f59e0b", "#ef4444"];
  const forks = [[500, 0]];
  const segs = [];
  for (let lvl = 0; lvl < 5; lvl++) {
    const next = [];
    forks.splice(0).forEach(([x, y], i) => {
      const n = lvl < 2 ? 2 : 1 + ((i + lvl) % 2);
      for (let k = 0; k < n; k++) {
        const nx = Math.max(30, Math.min(W - 30, x + (k - (n - 1) / 2) * (360 / (lvl + 1)) + (lvl % 2 ? 40 : -40)));
        const ny = y + H / 5.2;
        segs.push({ d: `M${x},${y} C${x},${y + H / 12} ${nx},${ny - H / 12} ${nx},${ny}`, c: cols[(segs.length + lvl) % cols.length] });
        next.push([nx, ny]);
      }
    });
    forks.push(...next.slice(0, 6));
  }
  segs.forEach((s) => (paths += `<path d="${s.d}" fill="none" stroke="${s.c}" stroke-width="1.6" stroke-linecap="round" opacity=".55" vector-effect="non-scaling-stroke"/>`));
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${paths}</svg>`;
  el.style.position = "relative"; el.prepend(host);
  const ps = $$("path", host);
  ps.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
  gsap.to(ps, { strokeDashoffset: 0, ease: "none", stagger: 0.12, scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6 } });
  const br = el.querySelectorAll("#branch path.b:not(.flow)");
  br.forEach((p) => { try { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.out", scrollTrigger: { trigger: "#branch", start: "top 80%" } }); } catch (e) {} });
  gsap.from(".sbar", { x: -30, opacity: 0, stagger: 0.07, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: "#bars", start: "top 85%" } });
}

/* Researchers: cards fly in from depth like stars settling into a constellation */
function researchers(el, gsap, ST) {
  heroDrift(el, gsap);
  const grid = el.querySelector("#grid");
  if (grid) {
    ST.batch(".pcard", { start: "top 92%", once: true, onEnter: (b) => gsap.fromTo(own(b), { opacity: 0, z: -420, rotateX: -38, rotateY: (i) => (i % 2 ? 18 : -18), transformPerspective: 900 }, { opacity: 1, z: 0, rotateX: 0, rotateY: 0, duration: 1.1, ease: "expo.out", stagger: 0.06, overwrite: true , clearProps: CLR }) });
  }
  const cs = el.querySelector(".constel");
  if (cs) gsap.fromTo(cs, { clipPath: "circle(8% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", ease: "none", scrollTrigger: { trigger: cs, start: "top 90%", end: "top 30%", scrub: true } });
  gsap.from(".cat-tabs button", { y: 20, opacity: 0, stagger: 0.03, duration: 0.6, ease: "power3.out", scrollTrigger: { trigger: ".cat-tabs", start: "top 90%" } });
}
function pacing(el, gsap, ST) {
  heroDrift(el, gsap);
  ST.batch(".sig", { start: "top 94%", once: true, onEnter: (b) => gsap.fromTo(own(b), { clipPath: "inset(0 100% 0 0)", opacity: 0.2 }, { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: 0.9, ease: "power3.inOut", stagger: 0.04 , clearProps: CLR }) });
  $$(".sig-stats b", el).forEach((b) => gsap.from(b, { textContent: 0, duration: 1.6, ease: "power2.out", snap: { textContent: 1 }, scrollTrigger: { trigger: b, start: "top 90%" } }));
}

/* Timeline: pinned horizontal scroll through the decades, with the giant years moving at their own speed */
function timeline(el, gsap) {
  heroDrift(el, gsap);
  const hs = el.querySelector(".hscroll"), track = hs && hs.querySelector(".track");
  if (hs && track && !isMobile()) {
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tw = gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: hs, start: "top top+=64", end: () => "+=" + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
    $$(".bigyr", hs).forEach((y) => gsap.fromTo(y, { xPercent: 30 }, { xPercent: -40, ease: "none", scrollTrigger: { trigger: y.parentNode, containerAnimation: tw, start: "left right", end: "right left", scrub: true } }));
    $$(".hpanel h3, .hpanel .hl", hs).forEach((t) => gsap.from(t, { y: 40, opacity: 0, ease: "power2.out", scrollTrigger: { trigger: t.closest(".hpanel"), containerAnimation: tw, start: "left 75%", end: "left 35%", scrub: true } }));
  }
  const prog = el.querySelector("#prog");
  if (prog) gsap.fromTo(prog, { scaleY: 0, height: "100%", transformOrigin: "top" }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: "#tl", start: "top 60%", end: "bottom 60%", scrub: true } });
}

/* Voices: kinetic typography lines slide against each other, and skew with scroll speed */
function voices(el, gsap, ST) {
  $$(".kinetic .ln", el).forEach((ln, i) => gsap.fromTo(ln, { xPercent: i % 2 ? -30 : 0 }, { xPercent: i % 2 ? 0 : -30, ease: "none", scrollTrigger: { trigger: ln.parentNode, start: "top bottom", end: "bottom top", scrub: 0.4 } }));
  const skew = gsap.quickTo($$(".kinetic .ln", el), "skewX", { duration: 0.4, ease: "power3" });
  ST.create({ trigger: el, start: "top top", end: "bottom bottom", onUpdate: (s) => skew(Math.max(-12, Math.min(12, s.getVelocity() / -260))) });
  ST.batch("#wall .qcard", { start: "top 95%", once: true, onEnter: (b) => gsap.fromTo(own(b), { opacity: 0, y: 60, rotate: (i) => (i % 2 ? 3 : -3) }, { opacity: 1, y: 0, rotate: 0, duration: 0.9, ease: "back.out(1.4)", stagger: 0.05 , clearProps: CLR }) });
}

/* Watch: cinematic depth. Letterbox bars close in, thumbnails sit on parallax layers */
function watch(el, gsap, ST) {
  heroDrift(el, gsap);
  const t = document.createElement("div"), b = document.createElement("div");
  t.className = "letterbox t"; b.className = "letterbox b"; t.setAttribute("aria-hidden", "true"); b.setAttribute("aria-hidden", "true");
  el.appendChild(t); el.appendChild(b);
  gsap.to([t, b], { height: isMobile() ? 18 : 36, ease: "none", scrollTrigger: { trigger: ".phero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to([t, b], { height: 0, ease: "none", scrollTrigger: { trigger: el, start: "bottom bottom+=400", end: "bottom bottom", scrub: true } });
  ST.batch(".vcard", { start: "top 96%", onEnter: (bs) => gsap.fromTo(own(bs), { opacity: 0, y: (i) => 40 + (i % 3) * 30, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out", stagger: 0.04, overwrite: true , clearProps: CLR }) });
  $$(".coll", el).forEach((c) => gsap.fromTo(own(Array.from(c.children)), { x: (i) => 60 + i * 24 }, { x: 0, ease: "none", scrollTrigger: { trigger: c, start: "top bottom", end: "top 40%", scrub: true } }));
}

/* Control: circuit traces draw down the page and light each section when they arrive */
function control(el, gsap) {
  heroDrift(el, gsap);
  const host = document.createElement("div"); host.className = "fx-circuit"; host.setAttribute("aria-hidden", "true");
  const H = Math.max(el.scrollHeight, 2000), W = 1000;
  let d = "", nodes = "";
  const lanes = [60, 140, 860, 940];
  lanes.forEach((x0, li) => {
    let x = x0, y = 0, path = `M${x},${y}`;
    while (y < H) { const step = 120 + ((li * 37 + y) % 160); y += step; path += ` V${y}`; if ((y / step) % 2 > 1) { const nx = x + (x < 500 ? 40 : -40); path += ` H${nx}`; nodes += `<circle cx="${nx}" cy="${y}" r="3.5" fill="#22d3ee"/>`; x = nx; } else nodes += `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#14b8a6"/>`; }
    d += `<path d="${path}" fill="none" stroke="${li % 2 ? "#14b8a6" : "#22d3ee"}" stroke-width="1.4" opacity=".5" vector-effect="non-scaling-stroke"/>`;
  });
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${d}<g class="nd" opacity=".7">${nodes}</g></svg>`;
  el.style.position = "relative"; el.prepend(host);
  const ps = $$("path", host);
  ps.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
  gsap.to(ps, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.5 } });
  gsap.from(host.querySelectorAll(".nd > *"), { opacity: 0, stagger: { each: 0.02 }, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: true } });
  $$("section .card", el).forEach((c) => gsap.fromTo(c, { boxShadow: "0 0 0 0 rgba(34,211,238,0)" }, { boxShadow: "0 0 0 1px rgba(34,211,238,.35), 0 24px 60px -30px rgba(34,211,238,.6)", duration: 0.8, scrollTrigger: { trigger: c, start: "top 70%", toggleActions: "play none none reverse" } }));
}

/* Learn: the progress map path draws as a stepper, units pop as the line reaches them */
function learn(el, gsap) {
  heroDrift(el, gsap);
  const path = el.querySelector(".lmap .trail");
  if (path) {
    const L = path.getTotalLength();
    gsap.fromTo(path, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".lmap", start: "top 85%", end: "bottom 50%", scrub: 0.6 } });
    $$(".lmap .node", el).forEach((n, i) => gsap.from(n, { scale: 0, transformOrigin: "center", opacity: 0, duration: 0.7, ease: "back.out(2)", scrollTrigger: { trigger: ".lmap", start: `top+=${i * 40} 80%` } }));
  }
  $$(".blk", el).forEach((b) => gsap.from(own(b), { y: 36, opacity: 0, duration: 0.8, ease: "power3.out", clearProps: CLR, scrollTrigger: { trigger: b, start: "top 90%" } }));
}

/* Prepare: a calm breathing circle follows you, sections settle in slowly */
function prepare(el, gsap) {
  heroDrift(el, gsap);
  const orb = document.createElement("div"); orb.className = "breath"; orb.setAttribute("aria-hidden", "true"); orb.innerHTML = "<i></i><span>Breathe in</span>"; el.appendChild(orb);
  const br = orb.querySelector("i"), lbl = orb.querySelector("span");
  gsap.fromTo(orb, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top -10%", end: "top -30%", scrub: true } });
  if (br) {
    gsap.to(br, { scale: 1.8, repeat: -1, yoyo: true, duration: 4, ease: "sine.inOut", onRepeat() { if (lbl) lbl.textContent = lbl.textContent === "Breathe in" ? "Breathe out" : "Breathe in"; } });
  }
  $$("section .card, section h2", el).forEach((c) => gsap.fromTo(own(c), { opacity: 0, scale: 0.965, filter: "blur(6px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.8, ease: "sine.out", clearProps: CLR, scrollTrigger: { trigger: c, start: "top 90%" } }));
}

/* Orgs: the globe turns with the scroll (the globe module listens for this), cards rise */
function orgs(el, gsap, ST) {
  heroDrift(el, gsap);
  const g = el.querySelector(".globe");
  if (g) ST.create({ trigger: ".globe-wrap", start: "top bottom", end: "bottom top", scrub: true, onUpdate: (s) => g.dispatchEvent(new CustomEvent("scrollspin", { detail: s.progress })) });
  ST.batch(".orgcard", { start: "top 94%", once: true, onEnter: (b) => gsap.fromTo(own(b), { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.05 , clearProps: CLR }) });
}

/* Tools: gauge needles sweep to their value, tool cards wipe in */
function tools(el, gsap) {
  heroDrift(el, gsap);
  $$(".gauge", el).forEach((g) => {
    const v = +g.dataset.v || 0, n = g.querySelector(".ndl"), arc = g.querySelector(".arc");
    if (n) gsap.fromTo(n, { rotate: -90 }, { rotate: -90 + 180 * v, duration: 1.8, ease: "elastic.out(1, 0.6)", scrollTrigger: { trigger: g, start: "top 88%" } });
    if (arc) { const L = arc.getTotalLength(); gsap.fromTo(arc, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: L * (1 - v), duration: 1.6, ease: "power3.out", scrollTrigger: { trigger: g, start: "top 88%" } }); }
  });
  $$("section .card", el).forEach((c) => gsap.fromTo(own(c), { clipPath: "inset(0 0 100% 0 round 18px)" }, { clipPath: "inset(0 0 0% 0 round 18px)", duration: 1, ease: "power3.out", clearProps: CLR, scrollTrigger: { trigger: c, start: "top 88%" } }));
}

/* Blog: reading progress plus an ink reveal that sweeps across each paragraph */
function blog(el, gsap) {
  heroDrift(el, gsap);
  const prose = el.querySelector(".prose");
  if (!prose) { $$(".card", el).forEach((c, i) => gsap.from(own(c), { y: 30, opacity: 0, duration: 0.7, clearProps: CLR, delay: (i % 3) * 0.06, scrollTrigger: { trigger: c, start: "top 92%" } })); return; }
  const bar = document.createElement("div"); bar.className = "readprog"; bar.setAttribute("aria-hidden", "true"); el.appendChild(bar);
  gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { trigger: prose, start: "top 20%", end: "bottom bottom", scrub: true } });
  prose.classList.add("ink");
  $$("p, li, h2, h3, blockquote", prose).forEach((p) => gsap.fromTo(p, { "--ink": "100%" }, { "--ink": "-20%", ease: "none", scrollTrigger: { trigger: p, start: "top 92%", end: "top 55%", scrub: true } }));
}

/* Docs: subtle, headings ease in and nothing else moves */
function docs(el, gsap) {
  $$(".prose h2, .prose h3", el).forEach((h) => gsap.from(h, { opacity: 0, x: -12, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: h, start: "top 92%" } }));
}
function history(el, gsap, ST) {
  heroDrift(el, gsap);
  ST.batch(".hist-item", { start: "top 96%", once: true, onEnter: (b) => gsap.from(own(b), { opacity: 0, x: -24, duration: 0.5, stagger: 0.03, ease: "power2.out" , clearProps: CLR }) });
}

export const FX = { futures, researchers, pacing, timeline, voices, watch, control, learn, prepare, orgs, tools, blog, docs, history };
