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
const fmtMB = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(b >= 1e8 ? 0 : 1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
/* A small panel that shows progress, size and a final check, so you can see what was saved */
function panel() {
  let p = document.getElementById("offPanel");
  if (p) return p;
  p = document.createElement("div");
  p.id = "offPanel"; p.className = "off-panel"; p.setAttribute("role", "status"); p.setAttribute("aria-live", "polite");
  p.innerHTML = `<div class="off-hd"><b>Save for offline</b><button type="button" class="icon-btn" data-offx aria-label="Close the offline panel"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <p class="off-l1" data-l1>Getting the file list...</p>
    <div class="off-track" role="progressbar" aria-label="Saving for offline" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
    <p class="off-l2" data-l2></p>
    <div class="off-act" data-act hidden><button type="button" class="btn sm ghost" data-offcheck>Check again</button></div>`;
  document.body.appendChild(p);
  p.addEventListener("click", (e) => { if (e.target.closest("[data-offx]")) p.hidden = true; if (e.target.closest("[data-offcheck]")) verify(); });
  return p;
}
const pset = (pct, l1, l2) => { const p = panel(); p.hidden = false; const t = p.querySelector(".off-track"); t.querySelector("i").style.width = pct + "%"; t.setAttribute("aria-valuenow", String(Math.round(pct))); if (l1 != null) p.querySelector("[data-l1]").textContent = l1; if (l2 != null) p.querySelector("[data-l2]").textContent = l2; };
/* Count how many files from the list really are in the caches, and how much space Threshold uses */
export async function verify() {
  const m = await getManifest(); if (!m || !("caches" in window)) return null;
  const all = [].concat(m.core || [], m.warm || [], m.full || []);
  pset(0, "Checking what is on this device...", "");
  let ok = 0, n = 0;
  const chunk = 40;
  for (let i = 0; i < all.length; i += chunk) {
    const part = all.slice(i, i + chunk);
    const r = await Promise.all(part.map((u) => caches.match(new URL(u, ROOT).href).then((x) => !!x).catch(() => false)));
    ok += r.filter(Boolean).length; n += part.length;
    pset((n / all.length) * 100, `Checking ${n} of ${all.length} files...`);
  }
  let used = "";
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); if (e && e.usage) used = ` Threshold uses about ${fmtMB(e.usage)} of storage in this browser.`; } } catch (e) {}
  const full = ok === all.length;
  pset(100, full ? `Checked: all ${all.length} files are on this device.` : `Checked: ${ok} of ${all.length} files are on this device.`, (full ? "Threshold works without a connection now." : "Some files are missing. Save again while online to fill the gaps.") + used);
  const a = panel().querySelector("[data-act]"); if (a) a.hidden = false;
  panel().classList.toggle("ok", full);
  return { ok, n: all.length };
}
export async function saveEverything() {
  if (saving) { panel().hidden = false; return; }
  if (!("caches" in window)) { toastFn("This browser cannot save pages for offline."); return; }
  if (!navigator.onLine) { toastFn("You are offline. Connect once to save everything."); return; }
  saving = true;
  const btns = $$("[data-offline-save]");
  btns.forEach((b) => { b.classList.add("busy"); b.setAttribute("aria-busy", "true"); });
  const set = (pct, msg) => btns.forEach((b) => { const i = b.querySelector(".off-bar i"); if (i) i.style.width = pct + "%"; const m = b.querySelector(".off-msg"); if (m) m.textContent = msg; });
  const p = panel(); p.classList.remove("ok"); const act = p.querySelector("[data-act]"); if (act) act.hidden = true;
  pset(1, "Getting the file list...", "");
  try {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    const m = await getManifest();
    if (!m) throw new Error("no manifest");
    const all = [].concat(m.core || [], m.warm || [], m.full || []);
    const bytes = (m.bytes && (m.bytes.core + m.bytes.warm + m.bytes.full)) || 0;
    const total = fmtMB(bytes);
    set(1, `Saving ${all.length} files, about ${total}...`);
    pset(1, `Saving ${all.length} files, about ${total}.`, "Pages, data, photos, covers and books. Videos stay on YouTube.");
    const coreN = (m.core || []).length;
    const step = (d, n, f) => { const pct = Math.round((d / n) * 100); set(pct, `Saved ${d} of ${n} files${f ? `, ${f} skipped` : ""}`); pset(pct, `Saving ${d} of ${n} files, about ${fmtMB(bytes * (d / n))} of ${total}.`, f ? `${f} could not be saved yet.` : null); };
    const a = await cacheList(m.core || [], null, (d, n, f) => step(d, all.length, f));
    const b = await cacheList((m.warm || []).concat(m.full || []), null, (d, n, f) => step(coreN + d, all.length, a.fail + f));
    const fail = a.fail + b.fail;
    localStorage.setItem(KEY, JSON.stringify(Object.assign({}, saved() || {}, { full: m.version, t: Date.now(), n: all.length - fail, warm: m.version })));
    set(100, fail ? `Saved ${all.length - fail} files. ${fail} could not be saved.` : "Everything is saved on this device.");
    btns.forEach((b) => b.classList.add("done"));
    const v = await verify();
    toastFn(v && v.ok === v.n ? `Saved and checked: ${v.n} files, about ${total}. Threshold works offline now.` : `Saved for offline, ${v ? v.n - v.ok : fail} files missing.`);
  } catch (e) {
    set(0, "Could not save right now. Try again in a moment.");
    pset(0, "Saving did not finish.", "Check your connection and press Save everything for offline again.");
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
