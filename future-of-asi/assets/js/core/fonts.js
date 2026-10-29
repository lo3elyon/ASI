/* Per page fonts, kept fast: every @font-face uses font-display: swap, the shell preloads only the shell fonts,
   and the fonts a route needs above the fold are preloaded when that route starts (or on hover, before the click).
   Pages declare them in assets/fonts/route-fonts.json: { "<route slug>": ["assets/fonts/pages3/x.woff2", ...] }.
   Keep it to at most two files per route (the heading font and the body font). Everything else loads on use. */
const ROOT = new URL("../../../", import.meta.url);
let mapP = null;
const done = new Set();
const map = () => (mapP ||= fetch(new URL("assets/fonts/route-fonts.json", ROOT)).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
/* hint: true on hover or focus of a menu link. Then the files are only prefetched (low priority, no
   "preloaded but not used" warning if the click never comes); the route start upgrades them to a preload. */
const hinted = new Set();
export async function preloadFonts(slug, hint = false) {
  const m = await map();
  const list = (m && Array.isArray(m[slug || "home"]) ? m[slug || "home"] : []).slice(0, 3);
  list.forEach((f) => {
    const href = new URL(f, ROOT).href;
    if (done.has(href) || (hint && hinted.has(href))) return;
    (hint ? hinted : done).add(href);
    const l = document.createElement("link"); l.rel = hint ? "prefetch" : "preload"; l.as = "font"; l.type = "font/woff2"; l.crossOrigin = "anonymous"; l.href = href;
    document.head.appendChild(l);
  });
}
export const routeFonts = async (slug) => { const m = await map(); return (m && m[slug || "home"]) || []; };
