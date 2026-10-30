/* Keyboard shortcuts (Round 4). Press ? anywhere for the help sheet. "g" then a letter jumps to a page.
   Shift T switches the theme, Shift M turns motion on or off, Shift L copies a link to what is open.
   Nothing fires while you type in a field, and nothing uses Ctrl, Alt or Cmd except the search shortcut that already exists.
   Works on the hash app and on the explosion/ and library/ sub pages (up = "../"). */
const E = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const JUMPS = [
  ["h", "", "Home"], ["r", "researchers", "Researchers"], ["c", "compare", "Compare researchers"], ["v", "voices", "Voices wall"],
  ["w", "watch", "Watch"], ["p", "papers", "Papers"], ["l", "learn", "Alignment 101"], ["t", "timeline", "Warnings timeline"],
  ["o", "orgs", "Organisations"], ["s", "stats", "Threshold in charts"], ["k", "starter", "Starter kit"], ["y", "your-history", "Your history"],
];

let o = {}, box = null, last = null, pendingG = 0;
const typing = (t) => { const a = t || document.activeElement; return !!a && (/^(input|textarea|select)$/i.test(a.tagName) || a.isContentEditable); };
const go = (slug) => { const up = o.up || ""; location.href = `${up}#/${slug}`; if (up) return; };

function build() {
  box = document.createElement("div");
  box.className = "r4-keys"; box.id = "r4Keys"; box.hidden = true;
  const row = (keys, what) => `<li><span class="k">${keys.map((k) => (k === "then" ? `<span class="then">then</span>` : `<kbd>${E(k)}</kbd>`)).join("")}</span><span class="w">${E(what)}</span></li>`;
  box.innerHTML = `<div class="r4-keys-bg" data-kclose></div>
    <div class="r4-keys-p" role="dialog" aria-modal="true" aria-labelledby="r4KeysT" tabindex="-1" data-lenis-prevent>
      <div class="r4-keys-hd"><h2 id="r4KeysT">Keyboard shortcuts</h2><button type="button" class="icon-btn" data-kclose aria-label="Close keyboard shortcuts"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <p class="r4-keys-lead">They work on every page, except while you are typing in a box.</p>
      <div class="r4-keys-cols">
        <section><h3>Anywhere</h3><ul>
          ${row(["?"], "Show or hide this list")}
          ${row(["Ctrl", "K"], "Search everything")}
          ${row(["/"], "Search everything")}
          ${row(["Esc"], "Close a menu, drawer, profile or video")}
          ${row(["Shift", "T"], "Switch theme: dark, light, contrast")}
          ${row(["Shift", "M"], "Turn motion on or off")}
          ${row(["Shift", "L"], "Copy a link to what is open now")}
        </ul></section>
        <section><h3>Go to a page</h3><ul>
          ${JUMPS.map(([k, , t]) => row(["g", "then", k], t)).join("")}
        </ul></section>
      </div>
      <p class="r4-keys-foot">In the menu, use the arrow keys, Home and End. In search, Tab moves between result types.</p>
    </div>`;
  document.body.appendChild(box);
  box.addEventListener("click", (e) => { if (e.target.closest("[data-kclose]")) close(); });
  box.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== "Tab") return;
    const f = Array.from(box.querySelectorAll("button, a[href]")).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
}
/* Back history (Round 4.2): the sheet pushes one entry tagged thrKeys, so the browser Back button closes it.
   X, Esc and ? call history.back() when that entry is ours, so no dead entry stays behind. Forward opens it again. */
const keysEntry = () => !!(history.state && history.state.thrKeys);
function show() {
  if (!box) build();
  if (!box.hidden) return;
  last = document.activeElement;
  box.hidden = false;
  document.documentElement.classList.add("r4-keys-on");
  box.querySelector(".icon-btn").focus({ preventScroll: true });
  requestAnimationFrame(() => box.classList.add("open"));
}
export function openKeys() {
  if (box && !box.hidden) return;
  if (!keysEntry()) { try { history.pushState({ ...(history.state || {}), thrKeys: 1 }, "", location.href); } catch (e) {} }
  show();
}
export function closeKeys() { close(); }
function close() {
  if (!box || box.hidden) return;
  if (keysEntry()) { history.back(); return; }
  hide();
}
function hide() {
  if (!box || box.hidden) return;
  box.classList.remove("open"); box.hidden = true;
  document.documentElement.classList.remove("r4-keys-on");
  if (last && last.focus && document.contains(last)) last.focus({ preventScroll: true });
  last = null;
}
function onPop() {
  const open = !!(box && !box.hidden);
  if (!keysEntry() && open) hide();
  else if (keysEntry() && !open) show();
}

function onKey(e) {
  if (e.key === "Escape" && box && !box.hidden) { e.preventDefault(); close(); return; }
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  if (typing(e.target)) return;
  const pal = document.getElementById("palette");
  if (pal && pal.classList.contains("open")) return;
  const k = e.key;
  if (k === "?") { e.preventDefault(); box && !box.hidden ? close() : openKeys(); return; }
  if (box && !box.hidden) return;
  if (pendingG && Date.now() - pendingG < 1400) {
    pendingG = 0;
    const j = JUMPS.find(([x]) => x === k.toLowerCase());
    if (j && !e.shiftKey) { e.preventDefault(); e.stopImmediatePropagation(); go(j[1]); }
    return;
  }
  pendingG = 0;
  if (k === "g" && !e.shiftKey) { pendingG = Date.now(); return; }
  if (e.shiftKey && k === "T") { e.preventDefault(); o.cycleTheme && o.cycleTheme(); return; }
  if (e.shiftKey && k === "M") { e.preventDefault(); o.toggleMotion && o.toggleMotion(); return; }
  if (e.shiftKey && k === "L") {
    e.preventDefault();
    import("./share.js").then((s) => s.copyText(location.href).then((ok) => o.toast && o.toast(ok ? "Link to this view copied." : "Copy did not work in this browser.")));
  }
}

let wired = false;
export function initKeys(opts = {}) {
  o = opts;
  if (wired) return; wired = true;
  document.addEventListener("keydown", onKey);
  window.addEventListener("popstate", onPop);
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-keys-help]"); if (b) { e.preventDefault(); openKeys(); } });
}
