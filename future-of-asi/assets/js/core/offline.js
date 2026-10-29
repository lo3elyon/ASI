/* Offline support shared by the hash app and the sub pages: service worker registration,
   the offline indicator, background warm up, and the "Save everything for offline" action with progress. */
export const ROOT = new URL("../../../", import.meta.url);
const KEY = "thr:offline";
const $$ = (s) => Array.from(document.querySelectorAll(s));
let toastFn = () => {};
let manifestP = null;
const getManifest = () => (manifestP ||= fetch(new URL("offline-manifest.json", ROOT), { cache: "no-cache" }).then((r) => r.json()).catch(() => caches.match(new URL("offline-manifest.json", ROOT).href).then((r) => (r ? r.json() : null))));
const saved = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };

export function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  if (!(location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) return;
  if (/[?&]nosw=1/.test(location.search)) { navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.scope.startsWith(ROOT.href) && r.unregister())); return; }
  const go = () => navigator.serviceWorker.register(new URL("sw.js", ROOT).href, { scope: ROOT.pathname }).then(() => navigator.serviceWorker.ready).then(() => idle(warm)).catch(() => {});
  if (document.readyState === "complete") go(); else addEventListener("load", go, { once: true });
}
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(() => fn(), { timeout: 8000 }) : setTimeout(fn, 2500));

const IMG = /\.(jpe?g|png|webp|gif|avif|svg|ico)$/i;
const coreName = async () => (await caches.keys()).find((k) => k.startsWith("thr-core-")) || "thr-core-pending";
/* Code, data and pages go to the worker's versioned core cache, images to the long lived runtime cache */
async function cacheList(list, _unused, onStep, conc = 6) {
  const core = await caches.open(await coreName()), rt = await caches.open("thr-rt");
  let i = 0, done = 0, fail = 0;
  const worker = async () => {
    while (i < list.length) {
      const u = new URL(list[i++], ROOT).href;
      try {
        if (!(await caches.match(u))) { const r = await fetch(u, { cache: "no-cache" }); if (r.ok) await (IMG.test(u) ? rt : core).put(u, r); else fail++; }
      } catch (e) { fail++; }
      done++; onStep && onStep(done, list.length, fail);
    }
  };
  await Promise.all(Array.from({ length: conc }, worker));
  return { done, fail };
}

/* Quiet background cache of photos, logos, covers and images, once per manifest version */
async function warm() {
  if (!("caches" in window) || !navigator.onLine) return;
  if (navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ""))) return;
  const m = await getManifest(); if (!m) return;
  const s = saved();
  if (s && s.warm === m.version) return;
  await cacheList((m.core || []).concat(m.warm || []), null, null, 3);
  try { localStorage.setItem(KEY, JSON.stringify(Object.assign({}, saved() || {}, { warm: m.version }))); } catch (e) {}
}

let saving = false;
export async function saveEverything() {
  if (saving) return;
  if (!("caches" in window)) { toastFn("This browser cannot save pages for offline."); return; }
  if (!navigator.onLine) { toastFn("You are offline. Connect once to save everything."); return; }
  saving = true;
  const btns = $$("[data-offline-save]");
  btns.forEach((b) => { b.classList.add("busy"); b.setAttribute("aria-busy", "true"); });
  const set = (pct, msg) => btns.forEach((b) => { const i = b.querySelector(".off-bar i"); if (i) i.style.width = pct + "%"; const m = b.querySelector(".off-msg"); if (m) m.textContent = msg; });
  try {
    const m = await getManifest();
    if (!m) throw new Error("no manifest");
    const all = [].concat(m.core || [], m.warm || [], m.full || []);
    const mb = (((m.bytes && (m.bytes.core + m.bytes.warm + m.bytes.full)) || 0) / 1e6).toFixed(0);
    set(1, `Saving ${all.length} files, about ${mb} MB...`);
    const coreN = (m.core || []).length;
    const step = (d, n, f) => set(Math.round((d / n) * 100), `Saved ${d} of ${n} files${f ? `, ${f} skipped` : ""}`);
    const a = await cacheList(m.core || [], null, (d, n, f) => step(d, all.length, f));
    const b = await cacheList((m.warm || []).concat(m.full || []), null, (d, n, f) => step(coreN + d, all.length, a.fail + f));
    const fail = a.fail + b.fail;
    localStorage.setItem(KEY, JSON.stringify(Object.assign({}, saved() || {}, { full: m.version, t: Date.now(), n: all.length - fail, warm: m.version })));
    set(100, fail ? `Saved ${all.length - fail} files. ${fail} could not be saved.` : "Everything is saved on this device.");
    toastFn(fail ? `Saved for offline, ${fail} files skipped.` : "Everything is saved. Threshold now works offline.");
    btns.forEach((b) => b.classList.add("done"));
  } catch (e) {
    set(0, "Could not save right now. Try again in a moment.");
    toastFn("Saving for offline did not finish.");
  }
  btns.forEach((b) => { b.classList.remove("busy"); b.removeAttribute("aria-busy"); });
  saving = false;
}
export function syncSaveButtons() {
  const s = saved();
  if (s && s.full) $$("[data-offline-save]").forEach((b) => { b.classList.add("done"); const m = b.querySelector(".off-msg"); if (m) m.textContent = `Saved on this device${s.t ? " on " + new Date(s.t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}. Press to refresh.`; const i = b.querySelector(".off-bar i"); if (i) i.style.width = "100%"; });
}

/* Offline indicator */
export function initOffline({ toast } = {}) {
  if (toast) toastFn = toast;
  const sync = (announce) => {
    const off = !navigator.onLine;
    document.documentElement.classList.toggle("is-offline", off);
    const p = document.getElementById("offPill"); if (p) p.hidden = !off;
    if (announce) toastFn(off ? "You are offline. Saved pages still work." : "Back online.");
  };
  addEventListener("online", () => sync(true)); addEventListener("offline", () => sync(true));
  sync(false); syncSaveButtons();
}
