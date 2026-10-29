/* Motion engine: GSAP + ScrollTrigger + Lenis, vendored locally and loaded on demand.
   One Lenis instance drives the window scroll from the GSAP ticker. Reduced motion skips all of it. */
import { RM, loadScript } from "../util.js";

let gsapP = null, lenis = null, lenisP = null, ctx = null, tickFn = null;

export function gsapReady() {
  if (!gsapP) gsapP = loadScript("assets/vendor/gsap.min.js").then(() => loadScript("assets/vendor/ScrollTrigger.min.js")).then(() => {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    return { gsap, ST: ScrollTrigger };
  });
  return gsapP;
}

export async function startLenis() {
  if (RM() || lenis) return lenis;
  if (lenisP) return lenisP;
  lenisP = (async () => {
    const [{ default: Lenis }, { gsap, ST }] = await Promise.all([import("../../vendor/lenis.min.mjs"), gsapReady()]);
    if (RM()) return null;
    document.documentElement.classList.add("lenis");
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1, prevent: (node) => !!(node.closest && node.closest(".ov, .palette, [data-lenis-prevent], .drawer-nav, .theme-pop")) });
    lenis.on("scroll", ST.update);
    tickFn = (t) => lenis && lenis.raf(t * 1000);
    gsap.ticker.add(tickFn);
    gsap.ticker.lagSmoothing(0);
    return lenis;
  })();
  return lenisP;
}
export function stopLenis() {
  if (!lenis) return;
  const { gsap } = window;
  if (gsap && tickFn) gsap.ticker.remove(tickFn);
  lenis.destroy(); lenis = null; lenisP = null; tickFn = null;
  document.documentElement.classList.remove("lenis");
}
export const getLenis = () => lenis;
export function pauseScroll() { if (lenis) lenis.stop(); }
export function resumeScroll() { if (lenis) lenis.start(); }
export function jumpTo(y) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  window.scrollTo({ top: y, left: 0, behavior: "instant" });
}

/* Per page effects. Each page gets its own system; killPage reverts everything. */
export function killPage() {
  if (ctx) { try { ctx.revert(); } catch (e) {} ctx = null; }
  const ST = window.ScrollTrigger;
  if (ST) ST.getAll().forEach((t) => t.kill());
}
export async function pageFx(name, el) {
  killPage();
  if (RM()) return;
  const [{ gsap, ST }, mod] = await Promise.all([gsapReady(), import("./fx-pages.js")]);
  if (RM() || !el.isConnected) return;
  const fn = mod.FX[name];
  if (!fn) return;
  ctx = gsap.context(() => { try { fn(el, gsap, ST); } catch (e) { console.warn("fx", name, e); } }, el);
  requestAnimationFrame(() => ST.refresh());
}
export function refreshFx() { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }
